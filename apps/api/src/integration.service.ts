import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { ProjectService, type ProjectActor } from "./project.service.js";
import { TaskService } from "./task.service.js";
import { ReviewService } from "./review.service.js";
import { transactionalReadPorts } from "./dashboard-transaction.js";
import { recordProjectEvent } from "./project-events.js";
import type { CalendarProjection } from "./integration-calendar.js";
import { CrmService } from "./crm.service.js";
import { WorkforceService } from "./workforce.service.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { canonicalWebsiteEnquiry, parseWebsiteEnquiry, verifyWebsiteSignature } from "./integration-webhook.js";

type Tx=Prisma.TransactionClient;
type Actor=ProjectActor & {sessionId?:string};
type Command={commandId:string;reason:string};
type EventInput=Command & {kind:"MEETING"|"SITE_VISIT";projectId?:string|undefined;startAt:string;endAt:string};
const digest=(value:string)=>createHash("sha256").update(value).digest("hex");
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const uid=(kind:string,id:string)=>digest(`sense-calendar:${kind}:${id}`)+"@sense-calendar";
@Injectable()
export class IntegrationService {
 constructor(private readonly database:DatabaseService,private readonly projects:ProjectService,private readonly tasks:TaskService,private readonly reviews:ReviewService,@Optional() private readonly crm?:CrmService,@Optional() private readonly workforce?:WorkforceService,@Optional() @Inject(RUNTIME_CONFIG) private readonly config?:RuntimeConfig){}
 async actor(accountId:string,sessionId?:string):Promise<Actor>{const actor=await this.projects.actor(accountId);return {...actor,...(sessionId?{sessionId}:{})};}
 private transaction<T>(fn:(tx:Tx)=>Promise<T>){return this.database.prisma.$transaction(fn,{timeout:120000});}
 private async active(tx:Tx,actor:Actor){
  await tx.$queryRaw`SELECT id FROM accounts WHERE id=${actor.accountId}::uuid FOR SHARE`;
  const account=await tx.account.findUnique({where:{id:actor.accountId},include:{employee:true}});
  if(!account||account.state!=="ACTIVE"||account.kind!==actor.kind||!["OWNER","STAFF"].includes(account.kind)||account.kind==="STAFF"&&(!account.employee||account.employee.state!=="ACTIVE"||account.employee.organizationId!==actor.organizationId))throw new ForbiddenException("Current internal scope required");
  await tx.$queryRaw`SELECT id FROM organizations WHERE id=${actor.organizationId}::uuid FOR SHARE`;
  if(account.employee){
   await tx.$queryRaw`SELECT id FROM employees WHERE "organizationId"=${actor.organizationId}::uuid AND "homeTeamId"=${account.employee.homeTeamId}::uuid ORDER BY id FOR UPDATE`;
   await tx.$queryRaw`SELECT id FROM employee_job_role_assignments WHERE "employeeId"=${account.employee.id}::uuid ORDER BY id FOR SHARE`;
   await tx.$queryRaw`SELECT id FROM job_roles WHERE id IN (SELECT "jobRoleId" FROM employee_job_role_assignments WHERE "employeeId"=${account.employee.id}::uuid) ORDER BY id FOR UPDATE`;
   await tx.$queryRaw`SELECT id FROM role_permissions WHERE "roleId" IN (SELECT "jobRoleId" FROM employee_job_role_assignments WHERE "employeeId"=${account.employee.id}::uuid) ORDER BY id FOR SHARE`;
   await tx.$queryRaw`SELECT id FROM employee_permission_overrides WHERE "employeeId"=${account.employee.id}::uuid ORDER BY id FOR SHARE`;
   const current=await tx.employee.findUnique({where:{id:account.employee.id}});if(!current||current.state!=="ACTIVE"||current.organizationId!==actor.organizationId||current.homeTeamId!==account.employee.homeTeamId||current.homeBranchId!==account.employee.homeBranchId)throw new ForbiddenException("Current employee scope changed; retry");
  }
  if(actor.sessionId){await tx.$queryRaw`SELECT id FROM sessions WHERE id=${actor.sessionId}::uuid FOR SHARE`;const session=await tx.session.findUnique({where:{id:actor.sessionId}});if(!session||session.accountId!==actor.accountId||session.revokedAt||session.expiresAt<=new Date()||session.lastUsedAt.getTime()+1800000<=Date.now())throw new ForbiddenException("Current session required");}
  return account;
 }
 private async command<T>(actor:Actor,input:Command,operation:string,payload:unknown,run:(tx:Tx)=>Promise<T>,reauthorize?:(tx:Tx,result:Record<string,unknown>)=>Promise<void>):Promise<T>{
  if(!/^[0-9a-f-]{36}$/i.test(input.commandId)||input.reason.trim().length<3||input.reason.length>1000)throw new BadRequestException("Invalid command");
  return this.transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.accountId+":"+input.commandId},0))`;
   await this.active(tx,actor);
   const payloadHash=digest(JSON.stringify({operation,payload})),receipt=await tx.integrationReceipt.findUnique({where:{actorId_commandId:{actorId:actor.accountId,commandId:input.commandId}}});
   if(receipt){if(receipt.operation!==operation||receipt.payloadHash!==payloadHash)throw new ConflictException("Command reused with different values");const result=receipt.result as Record<string,unknown>;if(reauthorize)await reauthorize(tx,result);return {...result,replayed:true} as T;}
   const result=await run(tx),safe={...(result as Record<string,unknown>)};delete safe.token;delete safe.relativeUrl;delete safe.secret;
   await tx.integrationReceipt.create({data:{organizationId:actor.organizationId,actorId:actor.accountId,commandId:input.commandId,operation,payloadHash,result:json(safe)}});
   return result;
  });
 }
 private async eventAccess(tx:Tx,actor:Actor,id:string,manage=false){
  await tx.$queryRaw`SELECT id FROM integration_calendar_events WHERE id=${id}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR UPDATE`;
  const row=await tx.integrationCalendarEvent.findFirst({where:{id,organizationId:actor.organizationId}});if(!row)throw new NotFoundException("Calendar event not found");
  if(row.projectId)await this.projects.integrationContext(actor,tx,row.projectId,manage);else if(row.creatorId!==actor.accountId)throw new ForbiddenException("Own event required");
  return row;
 }
 private dates(start:string,end:string){const startAt=new Date(start),endAt=new Date(end);if(!Number.isFinite(startAt.getTime())||!Number.isFinite(endAt.getTime())||endAt<=startAt)throw new BadRequestException("End must follow start");return {startAt,endAt};}
 private view(row:{id:string;kind:string;projectId:string|null;startAt:Date;endAt:Date;state:string;version:number},canManage:boolean){return {id:row.id,kind:row.kind,projectId:row.projectId,startAt:row.startAt.toISOString(),endAt:row.endAt.toISOString(),state:row.state,version:row.version,canManage};}
 private async evidence(tx:Tx,actor:Actor,row:{id:string;kind:string;projectId:string|null;startAt:Date;endAt:Date;state:string;version:number},reason:string){
  const data={kind:row.kind,projectId:row.projectId,startAt:row.startAt.toISOString(),endAt:row.endAt.toISOString(),state:row.state,version:row.version};
  const eventId=await recordProjectEvent(tx,{organizationId:actor.organizationId,actorId:actor.accountId,eventName:"integration.calendar_changed",subjectType:"integration_calendar_event",subjectId:row.id,reason,after:data});
  await tx.integrationCalendarHistory.create({data:{organizationId:actor.organizationId,calendarEventId:row.id,version:row.version,actorId:actor.accountId,reason,data,eventId}});
 }
 async createEvent(actor:Actor,input:EventInput){return this.command(actor,input,"calendar-create",input,async tx=>{
  if(!["MEETING","SITE_VISIT"].includes(input.kind))throw new BadRequestException("Invalid event kind");
  if(input.projectId){const project=await this.projects.integrationContext(actor,tx,input.projectId,true);if(project.status!=="ACTIVE")throw new ConflictException("Active project required");}
  const row=await tx.integrationCalendarEvent.create({data:{organizationId:actor.organizationId,creatorId:actor.accountId,kind:input.kind,projectId:input.projectId??null,...this.dates(input.startAt,input.endAt)}});
  await this.evidence(tx,actor,row,input.reason);return this.view(row,true);
 },async(tx,result)=>{await this.eventAccess(tx,actor,String(result.id),true);});}
 async updateEvent(actor:Actor,id:string,input:Command&{expectedVersion:number;startAt:string;endAt:string}){return this.command(actor,input,"calendar-update",{id,...input},async tx=>{
  const row=await this.eventAccess(tx,actor,id,true);if(row.version!==input.expectedVersion||row.state!=="ACTIVE")throw new ConflictException("Event changed; refresh");
  if(row.projectId&&(await this.projects.integrationContext(actor,tx,row.projectId,true)).status!=="ACTIVE")throw new ConflictException("Active project required");
  const next=await tx.integrationCalendarEvent.update({where:{id},data:{...this.dates(input.startAt,input.endAt),version:{increment:1},updatedAt:new Date()}});await this.evidence(tx,actor,next,input.reason);return this.view(next,true);
 },async(tx,result)=>{await this.eventAccess(tx,actor,String(result.id),true);});}
 async cancelEvent(actor:Actor,id:string,input:Command&{expectedVersion:number}){return this.command(actor,input,"calendar-cancel",{id,...input},async tx=>{
  const row=await this.eventAccess(tx,actor,id,true);if(row.version!==input.expectedVersion||row.state!=="ACTIVE")throw new ConflictException("Event changed; refresh");
  const next=await tx.integrationCalendarEvent.update({where:{id},data:{state:"CANCELLED",version:{increment:1},updatedAt:new Date()}});await this.evidence(tx,actor,next,input.reason);return this.view(next,true);
 },async(tx,result)=>{await this.eventAccess(tx,actor,String(result.id),true);});}
 async subscription(actor:Actor,input:Command){return this.command(actor,input,"subscription-rotate",input,async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.accountId+":calendar-subscription"},0))`;
  await tx.integrationSubscription.updateMany({where:{accountId:actor.accountId,revokedAt:null},data:{revokedAt:new Date()}});
  const token=randomBytes(32).toString("base64url"),row=await tx.integrationSubscription.create({data:{organizationId:actor.organizationId,accountId:actor.accountId,tokenHash:digest(token)}});
  await recordProjectEvent(tx,{organizationId:actor.organizationId,actorId:actor.accountId,eventName:"integration.subscription_changed",subjectType:"integration_subscription",subjectId:row.id,reason:input.reason,after:{active:true}});
  return {id:row.id,token,relativeUrl:`/api/v1/integrations/calendar/subscriptions/${token}.ics`,createdAt:row.createdAt.toISOString()};
 });}
 async revokeSubscription(actor:Actor,input:Command){return this.command(actor,input,"subscription-revoke",input,async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.accountId+":calendar-subscription"},0))`;
  const rows=await tx.integrationSubscription.findMany({where:{accountId:actor.accountId,revokedAt:null}});
  await tx.integrationSubscription.updateMany({where:{accountId:actor.accountId,revokedAt:null},data:{revokedAt:new Date()}});
  for(const row of rows)await recordProjectEvent(tx,{organizationId:actor.organizationId,actorId:actor.accountId,eventName:"integration.subscription_changed",subjectType:"integration_subscription",subjectId:row.id,reason:input.reason,after:{active:false}});
  return {revoked:true as const};
 });}
 private async eventRows(tx:Tx,actor:Actor){const result=[];for(const row of await tx.integrationCalendarEvent.findMany({where:{organizationId:actor.organizationId},orderBy:{startAt:"asc"}})){
  try{if(row.projectId)await this.projects.integrationContext(actor,tx,row.projectId);else if(row.creatorId!==actor.accountId)continue;let manage=!row.projectId;try{if(row.projectId){const p=await this.projects.integrationContext(actor,tx,row.projectId,true);manage=p.status==="ACTIVE";}}catch(error){if(!(error instanceof ForbiddenException))throw error;}result.push(this.view(row,manage));}catch(error){if(!(error instanceof ForbiddenException))throw error;}
 }return result;}
 async setup(actor:Actor){return this.transaction(async tx=>{await this.active(tx,actor);const projects=await this.projects.integrationProjects(actor,tx),subscription=await tx.integrationSubscription.findFirst({where:{accountId:actor.accountId,revokedAt:null},orderBy:{createdAt:"desc"}});const locations=[];if(this.workforce)for(const location of await this.workforce.integrationLocations(actor,tx)){try{const project=await this.projects.integrationContext(actor,tx,location.projectId);if(project.status==="ACTIVE")locations.push(location);}catch(error){if(!(error instanceof ForbiddenException))throw error;}}return {owner:actor.kind==="OWNER",projects:projects.map(p=>({id:p.id,title:p.title,canManageEvents:p.canManageEvents})),events:await this.eventRows(tx,actor),subscription:subscription?{active:true,id:subscription.id,createdAt:subscription.createdAt.toISOString()}:{active:false},...await this.connectorSetup(tx,actor),locations};});}
 private key(){const secret=this.config?.externalShareSecret;if(!secret||secret.length<32)throw new ConflictException("Website signing encryption is not configured");return createHash("sha256").update(secret).digest();}
 private encrypt(secret:string,id:string){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",this.key(),iv);cipher.setAAD(Buffer.from(`sense-website:${id}`));const bytes=Buffer.concat([cipher.update(secret,"utf8"),cipher.final()]);return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${bytes.toString("base64url")}`;}
 private decrypt(value:string,id:string){try{const [iv,tag,bytes]=value.split("."),cipher=createDecipheriv("aes-256-gcm",this.key(),Buffer.from(iv!,"base64url"));cipher.setAAD(Buffer.from(`sense-website:${id}`));cipher.setAuthTag(Buffer.from(tag!,"base64url"));return Buffer.concat([cipher.update(Buffer.from(bytes!,"base64url")),cipher.final()]).toString("utf8");}catch{throw new ForbiddenException("Website credential unavailable");}}
 private connectorView(row:Prisma.IntegrationConnectorGetPayload<Record<string,never>>){return {id:row.id,label:row.label,branchId:row.branchId,sourceId:row.sourceId,actorId:row.actorId,state:row.state,version:row.version,createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString()};}
 private async owner(tx:Tx,actor:Actor){await this.active(tx,actor);if(actor.kind!=="OWNER")throw new ForbiddenException("Owner configuration required");}
 private async connectorSetup(tx:Tx,actor:Actor){
  if(actor.kind!=="OWNER"||!this.crm)return {connectorOptions:{branches:[],sources:[],actors:[]},websiteConnectors:[],deliveries:[]};
  const branches=await tx.branch.findMany({where:{organizationId:actor.organizationId,active:true},select:{id:true,name:true},orderBy:{name:"asc"}}),sources=await tx.crmSource.findMany({where:{organizationId:actor.organizationId,active:true,builtIn:true,name:"Website"},select:{id:true,name:true}});
  const actors=await tx.account.findMany({where:{state:"ACTIVE",OR:[{kind:"OWNER"},{kind:"STAFF",employee:{organizationId:actor.organizationId,state:"ACTIVE"}}]},select:{id:true,normalizedEmail:true}});
  const rows=await tx.integrationConnector.findMany({where:{organizationId:actor.organizationId},orderBy:{createdAt:"desc"}}),deliveries=await tx.integrationDelivery.findMany({where:{organizationId:actor.organizationId},orderBy:{occurredAt:"desc"},take:100});
  return {connectorOptions:{branches,sources:sources.map(row=>({id:row.id,label:row.name})),actors:actors.map(row=>({id:row.id,label:row.normalizedEmail}))},websiteConnectors:rows.map(row=>this.connectorView(row)),deliveries:deliveries.map(row=>({id:row.id,connectorId:row.connectorId,externalId:row.externalId,status:row.status,...(row.leadId?{leadId:row.leadId}:{}),occurredAt:row.occurredAt.toISOString()}))};
 }
 private async connectorEvidence(tx:Tx,actor:Actor,row:Prisma.IntegrationConnectorGetPayload<Record<string,never>>,reason:string){const data=this.connectorView(row),eventId=await recordProjectEvent(tx,{organizationId:actor.organizationId,actorId:actor.accountId,eventName:"integration.connector_changed",subjectType:"integration_connector",subjectId:row.id,reason,after:data});await tx.integrationConnectorVersion.create({data:{organizationId:actor.organizationId,connectorId:row.id,version:row.version,actorId:actor.accountId,reason,data,eventId}});}
 private async configuredActor(tx:Tx,row:{actorId:string;organizationId:string;branchId:string;sourceId:string}){const account=await tx.account.findUnique({where:{id:row.actorId}});if(!account||!["OWNER","STAFF"].includes(account.kind))throw new ForbiddenException("Current internal routing required");const actor={accountId:account.id,organizationId:row.organizationId,kind:account.kind};await this.active(tx,actor);if(!this.crm)throw new ConflictException("CRM adapter unavailable");await this.crm.websiteContext(actor,tx,row.branchId,row.sourceId);return actor;}
 async createConnector(actor:Actor,input:Command&{label:string;branchId:string;sourceId:string;actorId:string}){return this.command(actor,input,"connector-create",input,async tx=>{await this.owner(tx,actor);const label=input.label.trim();if(!label||label.length>160)throw new BadRequestException("Connector label required");await this.configuredActor(tx,{...input,organizationId:actor.organizationId});const id=randomUUID(),secret=randomBytes(32).toString("base64url"),row=await tx.integrationConnector.create({data:{id,organizationId:actor.organizationId,creatorId:actor.accountId,actorId:input.actorId,branchId:input.branchId,sourceId:input.sourceId,label,encryptedSecret:this.encrypt(secret,id)}});await this.connectorEvidence(tx,actor,row,input.reason);return {...this.connectorView(row),secret};},async tx=>{await this.owner(tx,actor);});}
 private async connector(tx:Tx,actor:Actor,id:string){await this.owner(tx,actor);await tx.$queryRaw`SELECT id FROM integration_connectors WHERE id=${id}::uuid FOR UPDATE`;const row=await tx.integrationConnector.findFirst({where:{id,organizationId:actor.organizationId}});if(!row)throw new NotFoundException("Connector not found");return row;}
 async rotateConnector(actor:Actor,id:string,input:Command&{expectedVersion:number}){return this.changeConnector(actor,id,input,false);}
 async disableConnector(actor:Actor,id:string,input:Command&{expectedVersion:number}){return this.changeConnector(actor,id,input,true);}
 private async changeConnector(actor:Actor,id:string,input:Command&{expectedVersion:number},disable:boolean){return this.command(actor,input,disable?"connector-disable":"connector-rotate",{id,...input},async tx=>{const row=await this.connector(tx,actor,id);if(row.version!==input.expectedVersion||row.state!=="ACTIVE")throw new ConflictException("Connector changed; refresh");const secret=disable?undefined:randomBytes(32).toString("base64url");if(!disable)await this.configuredActor(tx,row);const next=await tx.integrationConnector.update({where:{id},data:{state:disable?"DISABLED":"ACTIVE",version:{increment:1},updatedAt:new Date(),...(secret?{encryptedSecret:this.encrypt(secret,id)}:{})}});await this.connectorEvidence(tx,actor,next,input.reason);return {...this.connectorView(next),...(secret?{secret}:{})};},async tx=>{await this.owner(tx,actor);});}
 async ingestEnquiry(id:string,timestamp:string,signature:string,input:unknown){
  const enquiry=parseWebsiteEnquiry(input);if(!/^[0-9a-f-]{36}$/i.test(id))throw new NotFoundException("Website endpoint unavailable");
  try{return await this.transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id+":"+enquiry.enquiryId},0))`;
   const initial=await tx.integrationConnector.findUnique({where:{id}});if(!initial||initial.state!=="ACTIVE"||!verifyWebsiteSignature(this.decrypt(initial.encryptedSecret,id),id,timestamp,signature,enquiry))throw new NotFoundException("Website endpoint unavailable");
   const actor=await this.configuredActor(tx,initial);await tx.$queryRaw`SELECT id FROM integration_connectors WHERE id=${id}::uuid FOR SHARE`;
   const row=await tx.integrationConnector.findUniqueOrThrow({where:{id}});if(row.state!=="ACTIVE"||row.version!==initial.version||!verifyWebsiteSignature(this.decrypt(row.encryptedSecret,id),id,timestamp,signature,enquiry))throw new NotFoundException("Website endpoint unavailable");
   const payloadHash=digest(canonicalWebsiteEnquiry(enquiry)),prior=await tx.integrationDelivery.findUnique({where:{connectorId_externalId:{connectorId:id,externalId:enquiry.enquiryId}}});if(prior&&prior.payloadHash!==payloadHash)throw new ConflictException("Enquiry identity reused with different values");if(prior?.status==="DELIVERED")return {deliveryId:prior.id,status:"DELIVERED",replayed:true};
   const lead=await this.crm!.createLeadInTransaction(actor,tx,{branchId:row.branchId,sourceId:row.sourceId,title:enquiry.title,contactName:enquiry.contactName,...(enquiry.email?{email:enquiry.email}:{}),...(enquiry.phone?{phone:enquiry.phone}:{}),reason:"Signed website enquiry"});
   const deliveryId=prior?.id??randomUUID(),data={status:"DELIVERED",payloadHash,connectorId:id,externalId:enquiry.enquiryId,leadId:lead.id},eventId=await recordProjectEvent(tx,{organizationId:row.organizationId,actorId:actor.accountId,eventName:"integration.delivery_changed",subjectType:"integration_delivery",subjectId:deliveryId,reason:"Signed website enquiry",after:data});
   if(prior)await tx.integrationDelivery.update({where:{id:deliveryId},data:{status:"DELIVERED",leadId:lead.id,failureCode:null,eventId,occurredAt:new Date()}});else await tx.integrationDelivery.create({data:{id:deliveryId,organizationId:row.organizationId,connectorId:id,externalId:enquiry.enquiryId,payloadHash,status:"DELIVERED",leadId:lead.id,eventId}});
   return {deliveryId,status:"DELIVERED",replayed:false};
  });}catch(error){
   if(error instanceof ForbiddenException){await this.transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id+":"+enquiry.enquiryId},0))`;
    const row=await tx.integrationConnector.findUnique({where:{id}});if(!row||row.state!=="ACTIVE"||!verifyWebsiteSignature(this.decrypt(row.encryptedSecret,id),id,timestamp,signature,enquiry))return;
    const creator=await tx.account.findUnique({where:{id:row.creatorId}});if(!creator||creator.state!=="ACTIVE"||creator.kind!=="OWNER")return;
    const actor={accountId:creator.id,kind:creator.kind,organizationId:row.organizationId};await this.active(tx,actor);await tx.$queryRaw`SELECT id FROM integration_connectors WHERE id=${id}::uuid FOR SHARE`;
    const current=await tx.integrationConnector.findUniqueOrThrow({where:{id}});if(current.version!==row.version||current.state!=="ACTIVE")return;
    const prior=await tx.integrationDelivery.findUnique({where:{connectorId_externalId:{connectorId:id,externalId:enquiry.enquiryId}}}),payloadHash=digest(canonicalWebsiteEnquiry(enquiry));if(prior)return;
    const deliveryId=randomUUID(),data={status:"FAILED",payloadHash,connectorId:id,externalId:enquiry.enquiryId,failureCode:"ROUTING_UNAVAILABLE"},eventId=await recordProjectEvent(tx,{organizationId:row.organizationId,actorId:actor.accountId,eventName:"integration.delivery_changed",subjectType:"integration_delivery",subjectId:deliveryId,reason:"Signed website routing unavailable",after:data});
    await tx.integrationDelivery.create({data:{id:deliveryId,organizationId:row.organizationId,connectorId:id,externalId:enquiry.enquiryId,payloadHash,status:"FAILED",failureCode:"ROUTING_UNAVAILABLE",eventId}});
   });}throw error;
  }
 }
 private async projection(tx:Tx,actor:Actor){await this.active(tx,actor);const events:CalendarProjection[]=[];const add=(kind:CalendarProjection["kind"],id:string,date:Date,version:number,updatedAt:Date)=>events.push({uid:uid(kind,id),kind,label:kind.replaceAll("_"," "),start:date.toISOString().slice(0,10),allDay:true,sequence:version,updatedAt:updatedAt.toISOString(),cancelled:false});
  const projects=await this.projects.integrationProjects(actor,tx);
  for(const project of projects)if(project.status==="ACTIVE")for(const milestone of project.milestones)if(milestone.targetAt)add("MILESTONE",milestone.id,milestone.targetAt,project.version,milestone.targetAt);
  const tasks=transactionalReadPorts(this.tasks,tx);let offset=0;
  while(true){const page=await tasks.list(actor,actor.kind==="OWNER"?"mine":"personal",offset,100,{phase:"active"});for(const task of page.items){if(task.projectId&&!projects.some(p=>p.id===task.projectId&&p.status==="ACTIVE"))continue;await tasks.detail(actor,task.id);add("TASK_DEADLINE",task.id,task.committedDueDate??task.targetDate,task.version,task.updatedAt);}offset+=page.items.length;if(offset>=page.total||!page.items.length)break;}
  for(const review of await this.reviews.calendarAssignments(actor,tx))if(review.date)add("REVIEW_ASSIGNMENT",review.id,review.date,review.version,review.updatedAt);
  for(const row of await tx.integrationCalendarEvent.findMany({where:{organizationId:actor.organizationId}})){if(row.projectId){if(!projects.some(p=>p.id===row.projectId&&p.status==="ACTIVE"))continue;}else if(row.creatorId!==actor.accountId)continue;events.push({uid:uid(row.kind,row.id),kind:row.kind as "MEETING"|"SITE_VISIT",label:row.kind.replaceAll("_"," "),start:row.startAt.toISOString(),end:row.endAt.toISOString(),allDay:false,sequence:row.version,updatedAt:row.updatedAt.toISOString(),cancelled:row.state==="CANCELLED"});}
  return {events};
 }
 async calendar(actor:Actor){return this.transaction(tx=>this.projection(tx,actor));}
 async subscriptionCalendar(token:string){if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new NotFoundException("Calendar subscription not found");return this.transaction(async tx=>{
  const row=await tx.integrationSubscription.findUnique({where:{tokenHash:digest(token)}});if(!row||row.revokedAt)throw new NotFoundException("Calendar subscription not found");
  const actor=await this.actor(row.accountId);await this.active(tx,actor);
  await tx.$queryRaw`SELECT id FROM integration_subscriptions WHERE id=${row.id}::uuid FOR SHARE`;
  const current=await tx.integrationSubscription.findUniqueOrThrow({where:{id:row.id}});if(current.revokedAt)throw new NotFoundException("Calendar subscription not found");
  return this.projection(tx,actor);
 });}
}

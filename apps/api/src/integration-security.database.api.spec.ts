import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { ForbiddenException } from "@nestjs/common";
import { DatabaseService } from "./database.service.js";
import { ProjectService, type ProjectActor } from "./project.service.js";
import { TaskService } from "./task.service.js";
import { ReviewService } from "./review.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { DocumentService } from "./document.service.js";
import { RevisionService } from "./revision.service.js";
import { NotificationsService } from "./notifications.service.js";
import { IntegrationService } from "./integration.service.js";
import { CrmService } from "./crm.service.js";
import { websiteSignature } from "./integration-webhook.js";
const url=process.env.S25_SECURITY_DATABASE_URL;
const suite=url?describe:describe.skip;
suite("S25 committed calendar replay and after-lock identity checks",()=>{
 let database:DatabaseService,service:IntegrationService,owner:ProjectActor;
 beforeAll(async()=>{
  const parsed=new URL(url!);const s25=["56433","57433"].includes(parsed.port)&&/^\/sense_s25_security_s25_[a-z0-9_]+_test$/.test(parsed.pathname);const s26=process.env.S26_E2E_ENABLED==="1"&&parsed.port==="57433"&&/^\/sense_s25_security_s26_[a-z0-9_]+_test$/.test(parsed.pathname);const s27=process.env.S27_E2E_ENABLED==="1"&&parsed.port==="58440"&&/^\/sense_s25_security_s27_[a-z0-9_]+_test$/.test(parsed.pathname);if(!["localhost","127.0.0.1"].includes(parsed.hostname)||(!s25&&!s26&&!s27))throw Error("Exact dedicated S25 or explicitly enabled S25/S26/S27 security target required");
  const config={nodeEnv:"test" as const,port:4000,databaseUrl:url!,webOrigin:"http://localhost:5173",externalShareSecret:"s25-fictional-encryption-key-1234567890"};database=new DatabaseService(config);
  const names=await database.prisma.$queryRaw<Array<{name:string}>>`SELECT current_database() name`;if(names[0]?.name!==parsed.pathname.slice(1))throw Error("Target mismatch");
  let account=await database.prisma.account.findUnique({where:{normalizedEmail:"s25-security-owner@example.test"}});let organization=await database.prisma.organization.findFirst();
  if(!account){if(await database.prisma.account.count()||organization)throw Error("Refuse unknown populated target");organization=await database.prisma.organization.create({data:{name:"S25 retained security"}});account=await database.prisma.account.create({data:{normalizedEmail:"s25-security-owner@example.test",kind:"OWNER",state:"ACTIVE"}});}
  if(!organization||account.kind!=="OWNER"||account.state!=="ACTIVE")throw Error("Retained fixture identity mismatch");owner={accountId:account.id,kind:"OWNER",organizationId:organization.id};
  const auth=new AuthorizationService(database),projects=new ProjectService(database),tasks=new TaskService(database,auth),documents=new DocumentService(database,auth,config),revisions=new RevisionService(database,auth,documents),reviews=new ReviewService(database,auth,documents,revisions,new NotificationsService(database));service=new IntegrationService(database,projects,tasks,reviews,new CrmService(database,auth),undefined,config);
 });
 afterAll(async()=>{await database?.onModuleDestroy();});
 test("concurrent identical commands create one committed event and receipt",async()=>{
  const input={commandId:randomUUID(),reason:"Concurrent explicit meeting",kind:"MEETING" as const,startAt:"2026-10-15T10:00:00Z",endAt:"2026-10-15T11:00:00Z"};
  const results=await Promise.all([service.createEvent(owner,input),service.createEvent(owner,input)]);expect(results[0].id).toBe(results[1].id);expect(await database.prisma.integrationReceipt.count({where:{actorId:owner.accountId,commandId:input.commandId}})).toBe(1);expect(await database.prisma.integrationCalendarHistory.count({where:{calendarEventId:results[0].id}})).toBe(1);
 });
 test("concurrent signed enquiries commit exactly one NEW lead and delivery",async()=>{
  const branch=await database.prisma.branch.create({data:{organizationId:owner.organizationId,name:"S25 Website "+randomUUID()}});await database.prisma.crmSource.createMany({data:[{organizationId:owner.organizationId,name:"Website",builtIn:true}],skipDuplicates:true});const source=await database.prisma.crmSource.findFirstOrThrow({where:{organizationId:owner.organizationId,name:"Website"}});
  const row=await service.createConnector(owner,{commandId:randomUUID(),reason:"Concurrent signed enquiry scope",label:"Website concurrency",branchId:branch.id,sourceId:source.id,actorId:owner.accountId}),enquiry={enquiryId:randomUUID(),title:"Retained fictional enquiry",contactName:"Fictional person"},timestamp=String(Math.floor(Date.now()/1000)),signature=websiteSignature(row.secret,row.id,timestamp,enquiry);
  const results=await Promise.all([service.ingestEnquiry(row.id,timestamp,signature,enquiry),service.ingestEnquiry(row.id,timestamp,signature,enquiry)]);expect(results[0].deliveryId).toBe(results[1].deliveryId);expect(await database.prisma.integrationDelivery.count({where:{connectorId:row.id}})).toBe(1);expect(await database.prisma.lead.count({where:{branchId:branch.id,sourceId:source.id,stage:"NEW"}})).toBe(1);
 });
 test("Website actor permission revoked during advisory wait denies lead creation",async()=>{
  const branch=await database.prisma.branch.create({data:{organizationId:owner.organizationId,name:"S25 Website wait "+randomUUID()}}),team=await database.prisma.team.create({data:{organizationId:owner.organizationId,branchId:branch.id,name:"S25 explicit actor"}}),account=await database.prisma.account.create({data:{normalizedEmail:randomUUID()+"@example.test",kind:"STAFF",state:"ACTIVE"}}),employee=await database.prisma.employee.create({data:{organizationId:owner.organizationId,homeBranchId:branch.id,homeTeamId:team.id,accountId:account.id,hiredAt:new Date("2026-01-01")}}),permission=await database.prisma.employeePermissionOverride.create({data:{organizationId:owner.organizationId,employeeId:employee.id,permissionKey:"lead.create",effect:"ALLOW",scopeKind:"BRANCH",branchId:branch.id,reason:"Retained explicit Website test"}}),source=await database.prisma.crmSource.findFirstOrThrow({where:{organizationId:owner.organizationId,name:"Website"}});
  const row=await service.createConnector(owner,{commandId:randomUUID(),reason:"After wait Website scope",label:"Website wait",branchId:branch.id,sourceId:source.id,actorId:account.id}),enquiry={enquiryId:randomUUID(),title:"Retained fictional enquiry",contactName:"Fictional person"},timestamp=String(Math.floor(Date.now()/1000)),signature=websiteSignature(row.secret,row.id,timestamp,enquiry);
  let release!:()=>void,locked!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;}),acquired=new Promise<void>(resolve=>{locked=resolve;});const blocker=database.prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${row.id+":"+enquiry.enquiryId},0))`;locked();await gate;},{timeout:30000});await acquired;
  const pending=service.ingestEnquiry(row.id,timestamp,signature,enquiry).then(value=>({value,error:null}),error=>({value:null,error}));try{let waiting=false;for(let attempt=0;attempt<60;attempt++){const rows=await database.prisma.$queryRaw<Array<{waiting:boolean}>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0 AND query ILIKE '%pg_advisory_xact_lock%') waiting`;if(rows[0]?.waiting){waiting=true;break;}await new Promise(resolve=>setTimeout(resolve,50));}expect(waiting).toBe(true);await database.prisma.employeePermissionOverride.update({where:{id:permission.id},data:{effect:"DENY"}});}finally{release();}await blocker;expect((await pending).error).toBeInstanceOf(ForbiddenException);expect(await database.prisma.lead.count({where:{branchId:branch.id}})).toBe(0);expect(await database.prisma.integrationDelivery.findFirst({where:{connectorId:row.id}})).toMatchObject({status:"FAILED",failureCode:"ROUTING_UNAVAILABLE"});
 });
 test("revoked session after advisory wait denies before any new evidence writes",async()=>{
  const session=await database.prisma.session.create({data:{accountId:owner.accountId,tokenHash:randomUUID(),csrfTokenHash:randomUUID(),expiresAt:new Date(Date.now()+3600000)}}),commandId=randomUUID(),input={commandId,reason:"After lock session recheck",kind:"MEETING" as const,startAt:"2026-10-16T10:00:00Z",endAt:"2026-10-16T11:00:00Z"};
  let release!:()=>void,locked!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;}),acquired=new Promise<void>(resolve=>{locked=resolve;});
  const blocker=database.prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${owner.accountId+":"+commandId},0))`;locked();await gate;},{timeout:30000});
  await acquired;const pending=service.createEvent({...owner,sessionId:session.id},input).then(value=>({value,error:null}),error=>({value:null,error}));
  try{
   let waiting=false;for(let attempt=0;attempt<60;attempt++){const rows=await database.prisma.$queryRaw<Array<{waiting:boolean}>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0 AND query ILIKE '%pg_advisory_xact_lock%') waiting`;if(rows[0]?.waiting){waiting=true;break;}await new Promise(resolve=>setTimeout(resolve,50));}expect(waiting).toBe(true);
   await database.prisma.session.update({where:{id:session.id},data:{revokedAt:new Date()}});
  }finally{release();}
  await blocker;expect((await pending).error).toBeInstanceOf(ForbiddenException);expect(await database.prisma.integrationReceipt.count({where:{actorId:owner.accountId,commandId}})).toBe(0);
 });
});

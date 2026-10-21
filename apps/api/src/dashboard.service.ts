import { ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { ProjectService, type ProjectActor } from "./project.service.js";
import { TaskService } from "./task.service.js";
import { ApprovalService } from "./approval.service.js";
import { TimeService } from "./time.service.js";
import { WorkforceService } from "./workforce.service.js";
import { PerformanceService } from "./performance.service.js";
import { RevisionService } from "./revision.service.js";
import { ReviewService } from "./review.service.js";
import { DocumentService } from "./document.service.js";
import { SiteService } from "./site.service.js";
import { TurnkeyService } from "./turnkey.service.js";
import { recordProjectEvent } from "./project-events.js";
import { localCalendarDate } from "./task-recurrence-policy.js";
import { localSlot, parse, reportCategories, reportFilterSchema, reminderSchema, scheduleSchema, snapshotSchema, scheduledEventNames, type ReportFilter, type ScheduleInput } from "./dashboard-policy.js";
import type { ReportTable } from "./report-exports.js";
import { transactionalReadPorts } from "./dashboard-transaction.js";
import { NotificationsService } from "./notifications.service.js";
import { ClientReviewService } from "./client-review.service.js";
import { SkillsService } from "./skills.service.js";
import { TrainingService } from "./training.service.js";
import { LibraryService } from "./library.service.js";

export const dashboardSources = ["tasks", "decisions", "health", "performance", "workload", "site", "training"] as const;
export type DashboardSource = typeof dashboardSources[number];
type Actor=ProjectActor & {sessionId?:string};
type Tx=Prisma.TransactionClient;
type Obj=Record<string,unknown>;
type Manifest=Array<{kind:string;id:string;projectId?:string;keys?:string[];from?:string;to?:string;parent?:Record<string,string>}>;
const obj=(v:unknown):Obj=>v&&typeof v==="object"&&!Array.isArray(v)?v as Obj:{};
const arr=(v:unknown):Obj[]=>Array.isArray(v)?v.map(obj):[];
const txt=(v:unknown)=>v===null||v===undefined?"":typeof v==="string"?v:typeof v==="number"||typeof v==="boolean"?String(v):JSON.stringify(v);
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const unavailableSources=["Skills, training and development source records are unavailable for this report. Performance scoring remains unavailable without an approved policy."];
const workforceId=(value:Obj,key:string)=>txt(value.id)||`${txt(value.employeeId)}:${txt(value.date??value.from??value.year??value.policyId)}:${key}`;
const taskRoute=(taskId:string)=>`/tasks?taskId=${encodeURIComponent(taskId)}`;
const taskSourceRef=(taskId:string,projectId?:string)=>({type:"TASK",taskId,...(projectId?{projectId}:{})});
const clean=(value:unknown):unknown=>value instanceof Date?value.toISOString():Array.isArray(value)?value.map(clean):value&&typeof value==="object"?Object.fromEntries(Object.entries(value).filter(([key])=>!/(?:csrf|token|secret|storageKey|nasPath|filePath|qrHash|encrypted|userAgent|ipAddress|selfie)/i.test(key)).map(([key,item])=>[key,clean(item)])):value;
const fields=(value:unknown,path=""):Array<{field:string;value:string|number|null}>=>{
 if(value===null||value===undefined)return [{field:path||"Value",value:null}];
 if(typeof value==="number"||typeof value==="string"||typeof value==="boolean")return [{field:path||"Value",value:typeof value==="boolean"?value?"Yes":"No":value}];
 if(Array.isArray(value)){if(!value.length)return [{field:path||"Records",value:"No retained records"}];return value.flatMap((item,index)=>fields(item,`${path} / ${txt(obj(item).label??obj(item).title??obj(item).name??obj(item).id)||String(index+1)}`));}
 return Object.entries(obj(value)).filter(([key])=>!/(?:^capabilities$|^can[A-Z]|^eligible|^availableRevisions$|^availableMarkupFiles$|^reviewerCandidates$|^correctionOwnerCandidates$|^designCandidates$|^clientOptions$)/.test(key)).flatMap(([key,item])=>fields(item,`${path?path+" / ":""}${key.replace(/([a-z])([A-Z])/g,"$1 $2")}`));
};
const keys=(v:unknown,p=""):string[]=>Object.entries(obj(clean(v===undefined?v:JSON.parse(JSON.stringify(v))))).flatMap(([k,x])=>{
 if(x===null||x===undefined)return [];
 if(Array.isArray(x))return [p+k,...x.flatMap((item,index)=>typeof item==="object"&&item!==null?keys(item,`${p}${k}[${txt(obj(item).id)||index}].`):[`${p}${k}[${index}]`])];
 return typeof x==="object"?keys(x,p+k+"."):[p+k];
});

@Injectable()
export class DashboardService {
 constructor(private readonly database:DatabaseService,private readonly projects:ProjectService,private readonly tasks:TaskService,private readonly approvals:ApprovalService,
 private readonly time:TimeService,private readonly workforce:WorkforceService,private readonly performance:PerformanceService,private readonly revisions:RevisionService,
 private readonly reviews:ReviewService,private readonly documents:DocumentService,private readonly site:SiteService,private readonly turnkey:TurnkeyService,@Optional() private readonly clientReviews?:ClientReviewService,
 @Optional() private readonly skills?:SkillsService,@Optional() private readonly training?:TrainingService,@Optional() private readonly library?:LibraryService){}
 private transaction<T>(fn:(tx:Tx)=>Promise<T>){return this.database.prisma.$transaction(fn,{timeout:120000});}
 private async active(tx:Tx,actor:Actor,owner=false){
  await tx.$queryRaw`SELECT id FROM accounts WHERE id=${actor.accountId}::uuid FOR SHARE`;
  const account=await tx.account.findUnique({where:{id:actor.accountId},include:{employee:true}}),organization=await tx.organization.findUnique({where:{id:actor.organizationId}});
  if(!organization||!account||account.state!=="ACTIVE"||account.kind!==actor.kind||!["OWNER","STAFF"].includes(account.kind)||owner&&account.kind!=="OWNER"||account.kind==="STAFF"&&(!account.employee||account.employee.state!=="ACTIVE"||account.employee.organizationId!==actor.organizationId))throw new ForbiddenException("Current internal scope required");
  if(actor.sessionId){await tx.$queryRaw`SELECT id FROM sessions WHERE id=${actor.sessionId}::uuid FOR SHARE`;const s=await tx.session.findUnique({where:{id:actor.sessionId}});if(!s||s.accountId!==actor.accountId||s.revokedAt||s.expiresAt<=new Date()||s.lastUsedAt.getTime()+1800000<=Date.now())throw new ForbiddenException("Current session required");}
  await tx.$queryRaw`SELECT id FROM organizations WHERE id=${actor.organizationId}::uuid FOR SHARE`;
  if(account.employee){
   // UPDATE fences new overrides/role assignments through their employee FK;
   // existing permission rows remain locked until the read/delivery commits.
   await tx.$queryRaw`SELECT id FROM employees WHERE "organizationId"=${actor.organizationId}::uuid AND "homeTeamId"=${account.employee.homeTeamId}::uuid ORDER BY id FOR UPDATE`;
   await tx.$queryRaw`SELECT id FROM employee_job_role_assignments WHERE "employeeId"=${account.employee.id}::uuid ORDER BY id FOR SHARE`;
   await tx.$queryRaw`SELECT id FROM job_roles WHERE id IN (SELECT "jobRoleId" FROM employee_job_role_assignments WHERE "employeeId"=${account.employee.id}::uuid) ORDER BY id FOR UPDATE`;
   await tx.$queryRaw`SELECT id FROM role_permissions WHERE "roleId" IN (SELECT "jobRoleId" FROM employee_job_role_assignments WHERE "employeeId"=${account.employee.id}::uuid) ORDER BY id FOR SHARE`;
   await tx.$queryRaw`SELECT id FROM employee_permission_overrides WHERE "employeeId"=${account.employee.id}::uuid ORDER BY id FOR SHARE`;
   const current=await tx.employee.findUnique({where:{id:account.employee.id}});if(!current||current.state!=="ACTIVE"||current.organizationId!==actor.organizationId||current.homeTeamId!==account.employee.homeTeamId||current.homeBranchId!==account.employee.homeBranchId)throw new ForbiddenException("Current employee scope changed; retry");
  }
  return {account,organization};
 }
 private async safe<T>(fn:()=>Promise<T>):Promise<T|null>{try{return await fn();}catch(e){if(e instanceof ForbiddenException||e instanceof NotFoundException)return null;throw e;}}
 private async allTasks(actor:Actor){
  const found=new Map<string,Obj>();for(const scope of ["mine","assigned"] as const){let offset=0;for(;;){const page=await this.tasks.list(actor,scope,offset,100);for(const t of page.items)found.set(t.id,obj(t));offset+=page.items.length;if(offset>=page.total||page.items.length===0)break;}}
  return [...found.values()];
 }
 private async allDecisions(actor:Actor){const items:Obj[]=[];let cursor:string|undefined;do{const page=await this.approvals.attention(actor.accountId,100,cursor);items.push(...page.items.map(obj));cursor=page.nextCursor??undefined;}while(cursor);return {items,nextCursor:null};}
 async context(actor:Actor){await this.transaction(tx=>this.active(tx,actor));return {owner:actor.kind==="OWNER",categories:reportCategories.map(key=>({key,label:key.replaceAll("_"," / ").replace(/^./,c=>c.toUpperCase())})),eventNames:scheduledEventNames.map(key=>({key,label:key}))};}
 private periodDate(v:unknown):string {return v instanceof Date?v.toISOString().slice(0,10):typeof v==="string"?v.slice(0,10):"";}
 private async collect(actor:Actor,input:ReportFilter):Promise<{table:ReportTable;manifest:Manifest}>{
  await this.transaction(tx=>this.active(tx,actor));
  const skillsAvailable=typeof this.skills?.setup==="function"&&typeof this.skills?.reportEvidence==="function";
  const trainingAvailable=typeof this.training?.reportEvidence==="function";
  const libraryAvailable=typeof this.library?.reportEvidence==="function";
  if(input.category==="skills_training"&&!actor.sessionId&&(skillsAvailable||trainingAvailable||libraryAvailable))throw new ForbiddenException("Current session required for Learning reports");
  const context=await this.performance.context(actor),manifest:Manifest=[],rows:ReportTable["rows"]=[],unavailable:string[]=[];
  const add=(kind:string,id:string,label:string,value:unknown,dateValue?:unknown,status?:unknown,projectId?:string)=>{
   const date=this.periodDate(dateValue);if(date&&(date<input.from||date>input.to))return;
   const safeValue=clean(JSON.parse(JSON.stringify(value)));for(const cell of fields(safeValue))rows.push({source:kind,id,label,status:txt(status),date,field:cell.field,value:cell.value});manifest.push({kind,id,...(projectId?{projectId}:{}),keys:keys(safeValue),...(kind==="WORKFORCE"?{from:input.from,to:input.to}:{})});
  };
  const taskRows=["project","employee","leader","quality"].includes(input.category)?await this.allTasks(actor):[];
  if(["project","employee","leader"].includes(input.category))for(const t of taskRows){const detail=await this.tasks.detail(actor,String(t.id));add("TASK",String(t.id),txt(t.title),detail,t.committedDueDate??t.targetDate,t.status,typeof t.projectId==="string"?t.projectId:undefined);}
  if(["employee","leader","quality"].includes(input.category)){
   for(const target of context.employees){const data=await this.performance.employee(actor,target.id);const snapshots=data.snapshots.filter(s=>{const d=obj(s.data);return txt(d.from)>=input.from&&txt(d.to)<=input.to;});const cycles=data.cycles.filter(s=>{const d=obj(s.data);return txt(d.from)>=input.from&&txt(d.to)<=input.to;});add("PER_EMPLOYEE",target.id,target.label,{employee:data.employee,snapshots,cycles});if(!snapshots.length)unavailable.push(`${target.label}: no accepted performance/efficiency/timeliness/quality snapshot for this period.`);}
   if(input.category!=="quality")unavailable.push(...unavailableSources);
  }
  if(["time","employee","leader"].includes(input.category)){
   const data=await this.time.list(actor,"managed",true);const linked=new Set<string>();for(const entry of data.entries){const e=obj(entry),date=this.periodDate(e.workDate??e.date??e.startedAt);add("TIME",String(e.id),txt(e.employeeId),e,date,e.approved?"APPROVED":"UNAPPROVED",typeof e.projectId==="string"?e.projectId:undefined);if(input.category==="time"&&date>=input.from&&date<=input.to&&typeof e.taskId==="string")linked.add(e.taskId);}
   for(const id of linked){const detail=await this.tasks.detail(actor,id);add("TASK",id,detail.task.title,{task:detail.task,collaborators:detail.collaborators});}
  }
  if(["attendance","employee","leader"].includes(input.category)){
   for(const scope of ["mine","managed"] as const){const data=await this.workforce.list(actor,scope,input.from,input.to);for(const key of ["attendance","leaves","balances","workload","workloadPeriods","allocations"] as const)for(const value of arr(data[key])){const id=workforceId(value,key);if(rows.some(r=>r.source==="WORKFORCE"&&r.id===id))continue;if(key==="leaves"&&!arr(value.days).some(d=>txt(d.date)>=input.from&&txt(d.date)<=input.to))continue;add("WORKFORCE",id,`${key}: ${txt(value.employeeId)}`,value,value.date??(key==="leaves"?undefined:value.createdAt),value.state);}}
  }
  if(["project","documents","quality"].includes(input.category)){
   for(const project of context.projects){
    if(input.category==="project"){
     const health=await this.performance.project(actor,project.id);add("PER_PROJECT",project.id,project.label,{...health,snapshots:health.snapshots.filter(s=>{const d=obj(s.data);return txt(d.from)>=input.from&&txt(d.to)<=input.to;})});
     const source=await this.projects.reportContext(actor,project.id);add("PROJECT",project.id,project.label,source);
     const site=await this.safe(()=>this.site.detail(actor,project.id));if(site)add("SITE",project.id,project.label,site);
     if(project.deliveryType==="TURNKEY"){const turnkey=await this.safe(()=>this.turnkey.detail(actor,project.id));if(turnkey)add("TURNKEY",project.id,project.label,turnkey);}
    }
    if(input.category==="documents"&&project.deliveryType==="TURNKEY"){const site=await this.safe(()=>this.site.detail(actor,project.id));if(site)add("SITE",project.id,`${project.label}: handover packages`,{handovers:obj(site).handovers});}
    const register=await this.safe(()=>this.revisions.list(actor,project.id));
    if(register){for(const drawing of register.drawings)for(const revision of drawing.revisions)add("REVISION",revision.id,`${drawing.documentNumber} ${revision.label}`,revision,revision.createdAt,revision.state,project.id);for(const t of register.transmittals)add("TRANSMITTAL",t.id,project.label,t,t.issuedAt,"ISSUED",project.id);}
    if(this.clientReviews&&["project","quality"].includes(input.category)){const client=await this.safe(()=>this.clientReviews!.projectDetail(actor,project.id));if(client)add("CLIENT_PROJECT",project.id,`${project.label}: client reviews and revisions`,client);}
   }
  }
  if(["quality","employee","leader"].includes(input.category))for(const task of taskRows){if(!task.projectId)continue;const review=await this.safe(()=>this.reviews.detail(actor,String(task.id)));if(review)add("REVIEW",String(task.id),txt(task.title),review,undefined,task.status,String(task.projectId));}
  if(["project","leader"].includes(input.category)){for(const item of (await this.allDecisions(actor)).items)add("APPROVAL",String(item.id),txt(item.title),item,item.requestedAt,item.state);}
  if(input.category==="skills_training"){
   const addLearning=(kind:string,id:string,label:string,status:string,dateValue:unknown,parent:Record<string,string>,values:Record<string,string|number|null>)=>{
    const date=this.periodDate(dateValue),keys=Object.keys(values);
    for(const [field,value] of Object.entries(values))rows.push({source:kind,id,label,status,date,field,value});
    manifest.push({kind,id,parent,keys,from:input.from,to:input.to});
   };
   if(skillsAvailable){
    try{
     const setup=await this.skills!.setup(actor);
     for(const employee of setup.employees){
      const evidence=await this.skills!.reportEvidence(actor,employee.id,input.from,input.to);
      for(const rating of evidence.ratings)addLearning("SKILL_RATING",rating.id,`${employee.label}: skill rating`,"CURRENT",null,{employeeId:employee.id},{skillId:rating.skillId,level:rating.level,version:rating.version});
      for(const change of evidence.changes)addLearning("SKILL_CHANGE",change.id,`${employee.label}: skill change`,"RECORDED",change.occurredAt,{employeeId:employee.id,ratingId:change.ratingId},{ratingId:change.ratingId,fromLevel:change.fromLevel,toLevel:change.toLevel,occurredAt:change.occurredAt.toISOString()});
     }
    }catch(error){if(error instanceof ForbiddenException||error instanceof NotFoundException)unavailable.push("Skill evidence is unavailable for the current authorized audience.");else throw error;}
   }else unavailable.push("Skill evidence source is unavailable.");
   if(trainingAvailable){
    try{
     for(const item of await this.training!.reportEvidence(actor,input.from,input.to)){
      addLearning("TRAINING_ASSIGNMENT",item.assignmentId,item.moduleTitle,item.state,item.assignedAt,{employeeId:item.employeeId,moduleVersionId:item.moduleVersionId},{state:item.state,moduleVersionId:item.moduleVersionId,moduleVersion:item.moduleVersion,moduleTitle:item.moduleTitle,assignedAt:item.assignedAt.toISOString()});
      for(const assessment of item.assessments)addLearning("TRAINING_ASSESSMENT",assessment.id,`${item.moduleTitle}: assessment`,assessment.outcome,assessment.occurredAt,{assignmentId:item.assignmentId,employeeId:item.employeeId,moduleVersionId:item.moduleVersionId},{outcome:assessment.outcome,occurredAt:assessment.occurredAt.toISOString()});
      for(const observation of item.effectiveness)addLearning("TRAINING_EFFECTIVENESS",observation.id,`${item.moduleTitle}: effectiveness observation`,"RECORDED",observation.date,{assignmentId:item.assignmentId,employeeId:item.employeeId,moduleVersionId:item.moduleVersionId},{date:observation.date,observation:observation.observation});
     }
    }catch(error){if(error instanceof ForbiddenException||error instanceof NotFoundException)unavailable.push("Training evidence is unavailable for the current authorized audience.");else throw error;}
   }else unavailable.push("Training evidence source is unavailable.");
   if(libraryAvailable){
    try{
     for(const item of await this.library!.reportEvidence(actor,input.from,input.to))for(const version of item.versions){
      if(version.publishedAt)addLearning("LIBRARY_SOP_PUBLICATION",version.publicationId,`${item.title}: published SOP`,"PUBLISHED",version.publishedAt,{recordId:item.recordId,versionId:version.versionId},{version:version.version,publishedAt:version.publishedAt.toISOString()});
      if(version.acknowledgementId&&version.employeeId&&version.acknowledgedByAccountId===actor.accountId&&version.acknowledgedAt)addLearning("LIBRARY_SOP_ACKNOWLEDGEMENT",version.acknowledgementId,`${item.title}: SOP acknowledgement`,"ACKNOWLEDGED",version.acknowledgedAt,{recordId:item.recordId,versionId:version.versionId,employeeId:version.employeeId,actorAccountId:version.acknowledgedByAccountId},{acknowledgedAt:version.acknowledgedAt.toISOString()});
     }
    }catch(error){if(error instanceof ForbiddenException||error instanceof NotFoundException)unavailable.push("Published SOP evidence is unavailable for the current authorized audience.");else throw error;}
   }else unavailable.push("Published SOP evidence source is unavailable.");
  }
  if(input.category==="quality")unavailable.push("Repeat-mistake trends require an accepted source classification; retained correction severity/category, internal/client revision records and accepted first-pass/turnaround evidence are shown without inventing a repeat score.");
  if(["employee","leader"].includes(input.category))unavailable.push("Productivity is represented by factual delivery/time/capacity and accepted configured performance evidence; no independent productivity formula is invented.");
  if(input.category==="time")unavailable.push("Actual seconds and linked task estimated hours retain their explicit units. Overtime is unavailable without an accepted overtime classification/policy; no threshold is invented. Accounting/payroll reports remain outside this application.");
  if(!rows.length)unavailable.push("No currently authorized persisted source rows match this period.");
  await this.transaction(tx=>this.active(tx,actor));
  return {table:{title:`${input.category.replaceAll("_"," / ")} report`,...input,generatedAt:new Date().toISOString(),columns:[{key:"source",label:"Source"},{key:"label",label:"Record"},{key:"status",label:"State"},{key:"date",label:"Date"},{key:"field",label:"Field / retained evidence"},{key:"value",label:"Value"}],rows,unavailable},manifest};
 }
 async preview(actor:Actor,value:unknown){return this.transaction(async tx=>(await transactionalReadPorts(this,tx).collect(actor,parse(reportFilterSchema,value))).table);}
 /** AUT/RPT owning port: retain original unprojected source manifest for later authorization. */
 async automationReport(actor:Actor,value:ReportFilter){return this.transaction(tx=>transactionalReadPorts(this,tx).collect(actor,parse(reportFilterSchema,value)));}
 async automationAuthorize(actor:Actor,manifest:unknown){return this.transaction(async tx=>{const scoped=transactionalReadPorts(this,tx);await scoped.active(tx,actor);await scoped.authorizeManifest(actor,manifest as Manifest,tx);});}
 private async authorizeManifest(actor:Actor,manifest:Manifest,tx?:Tx,readCache=new Map<string,unknown>()){
  if(tx)await this.active(tx,actor);else await this.transaction(t=>this.active(t,actor));
  // Reuse identical owning-port reads only inside this authorization transaction.
  // Each manifest row still checks current identity, source existence and field scope.
  const read=async<T>(key:string,fn:()=>Promise<T>):Promise<T>=>{if(readCache.has(key))return readCache.get(key) as T;const value=await fn();readCache.set(key,value);return value;};
  for(const item of manifest){let source:unknown=null;
   if(["SKILL_RATING","SKILL_CHANGE","TRAINING_ASSIGNMENT","TRAINING_ASSESSMENT","TRAINING_EFFECTIVENESS","LIBRARY_SOP_PUBLICATION","LIBRARY_SOP_ACKNOWLEDGEMENT"].includes(item.kind)){
    if(!tx||!item.from||!item.to||item.to<item.from||!item.parent||!Array.isArray(item.keys)||!item.keys.length)throw new ForbiddenException("Frozen Learning source identity is invalid");
    const parent=item.parent;let availableKeys:string[]=[];let found=false;
    if(item.kind==="SKILL_RATING"||item.kind==="SKILL_CHANGE"){
     const employeeId=parent.employeeId;if(!employeeId||!this.skills)throw new ForbiddenException("Skill source port unavailable");
     const profile=await read(`learning:skills:${employeeId}:${item.from}:${item.to}`,()=>this.skills!.reportEvidence(actor,employeeId,item.from!,item.to!));
     if(item.kind==="SKILL_RATING"){
      const row=profile.ratings.find(candidate=>candidate.id===item.id);found=!!row;availableKeys=["skillId","level","version"];
     }else{
      const row=profile.changes.find(candidate=>candidate.id===item.id);found=!!row&&row.ratingId===parent.ratingId;availableKeys=["ratingId","fromLevel","toLevel","occurredAt"];
     }
    }else if(item.kind.startsWith("TRAINING_")){
     if(!this.training)throw new ForbiddenException("Training source port unavailable");
     const evidence=await read(`learning:training:${item.from}:${item.to}`,()=>this.training!.reportEvidence(actor,item.from!,item.to!));
     const assignment=evidence.find(candidate=>candidate.assignmentId===parent.assignmentId||item.kind==="TRAINING_ASSIGNMENT"&&candidate.assignmentId===item.id);
     if(assignment&&assignment.employeeId===parent.employeeId&&assignment.moduleVersionId===parent.moduleVersionId){
      if(item.kind==="TRAINING_ASSIGNMENT"){found=assignment.assignmentId===item.id;availableKeys=["state","moduleVersionId","moduleVersion","moduleTitle","assignedAt"];}
      else if(item.kind==="TRAINING_ASSESSMENT"){found=assignment.assessments.some(attempt=>attempt.id===item.id);availableKeys=["outcome","occurredAt"];}
      else if(item.kind==="TRAINING_EFFECTIVENESS"){found=assignment.effectiveness.some(observation=>observation.id===item.id);availableKeys=["date","observation"];}
     }
    }else{
     if(!this.library)throw new ForbiddenException("Library source port unavailable");
     const evidence=await read(`learning:library:${item.from}:${item.to}`,()=>this.library!.reportEvidence(actor,item.from!,item.to!));
     const record=evidence.find(candidate=>candidate.recordId===parent.recordId);const version=record?.versions.find(candidate=>candidate.versionId===parent.versionId);
     if(version&&item.kind==="LIBRARY_SOP_PUBLICATION"){found=version.publicationId===item.id&&!!version.publishedAt;availableKeys=["version","publishedAt"];}else if(version&&item.kind==="LIBRARY_SOP_ACKNOWLEDGEMENT"){
      found=version.acknowledgementId===item.id&&version.employeeId===parent.employeeId&&version.acknowledgedByAccountId===actor.accountId&&parent.actorAccountId===actor.accountId&&!!version.acknowledgedAt;
      availableKeys=["acknowledgedAt"];
     }
    }
    if(!found||item.keys.some(key=>!availableKeys.includes(key)))throw new ForbiddenException("Frozen Learning source access or protected field access lost");
    continue;
   }
   if(tx){let projectId=item.projectId??(["PROJECT","PER_PROJECT","SITE","TURNKEY","CLIENT_PROJECT"].includes(item.kind)?item.id:undefined);if(item.kind==="TASK"||item.kind==="REVIEW"){await tx.$queryRaw`SELECT id FROM tasks WHERE id=${item.id}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR SHARE`;const task=await tx.task.findFirst({where:{id:item.id,organizationId:actor.organizationId}});projectId=task?.projectId??projectId;}
    if(projectId){await tx.$queryRaw`SELECT id FROM projects WHERE id=${projectId}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR SHARE`;await tx.$queryRaw`SELECT id FROM project_assignments WHERE "projectId"=${projectId}::uuid ORDER BY id FOR SHARE`;}
   }
   if(item.kind==="TASK")source=await this.tasks.detail(actor,item.id);
   else if(item.kind==="PER_EMPLOYEE")source=await this.performance.employee(actor,item.id);
   else if(item.kind==="PER_PROJECT")source=await this.performance.project(actor,item.projectId??item.id);
   else if(item.kind==="PROJECT")source=await this.projects.reportContext(actor,item.id);
   else if(item.kind==="SITE")source=await this.site.detail(actor,item.id);
   else if(item.kind==="TURNKEY")source=await this.turnkey.detail(actor,item.id);
   else if(item.kind==="REVIEW")source=await this.reviews.detail(actor,item.id);
   else if(item.kind==="CLIENT_PROJECT"){if(!this.clientReviews)throw new ForbiddenException("Client review source port unavailable");source=await this.clientReviews.projectDetail(actor,item.id);}
   else if(item.kind==="DOCUMENT"){await this.transaction(t=>this.documents.authorizeFile(t,actor,item.id));continue;}
   else if(item.kind==="REVISION"){
    await this.transaction(async t=>{await this.active(t,actor);if(!await this.revisions.canReadRevisionEvidence(t,actor,item.id))throw new ForbiddenException("Frozen exact revision access lost");});continue;
   }else if(item.kind==="TRANSMITTAL"){source=(await this.revisions.list(actor,item.projectId!)).transmittals.find(t=>t.id===item.id);}
   else if(item.kind==="APPROVAL"){const visible=await this.transaction(t=>this.approvals.canReadEvidence(t,actor,item.id));if(!visible)throw new ForbiddenException("Frozen approval access lost");continue;}
   else if(item.kind==="TIME")source=(await read("time:managed",()=>this.time.list(actor,"managed",true))).entries.find(e=>e.id===item.id);
   else if(item.kind==="WORKFORCE_EMPLOYEE"){const setup=await read("workforce:setup",()=>this.workforce.setup(actor));if(!setup.employees.some(e=>e.id===item.id))throw new ForbiddenException("Frozen workforce scope lost");continue;}
   else if(item.kind==="WORKFORCE"){
    if(!item.from||!item.to)throw new ForbiddenException("Frozen workforce period missing");
    for(const scope of ["mine","managed"] as const){const data=await read(`workforce:${scope}:${item.from}:${item.to}`,()=>this.workforce.list(actor,scope,item.from!,item.to!));for(const key of ["attendance","leaves","balances","workload","workloadPeriods","allocations"] as const){const row=arr(data[key]).find(r=>workforceId(r,key)===item.id);if(row)source=row;}}
   }
   if(!source)throw new ForbiddenException("Frozen source or protected field access lost");const currentKeys=new Set(keys(source));if(item.keys?.some(key=>!currentKeys.has(key)))throw new ForbiddenException("Frozen protected field access lost");
  }
 }
 private async receipt<T>(actor:Actor,input:{commandId:string;[key:string]:unknown},owner:boolean,fn:(tx:Tx)=>Promise<T>):Promise<T>{return this.transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId+":dashboard"},0))`;await this.active(tx,actor,owner);
  const existing=await tx.dashboardReceipt.findUnique({where:{actorId_commandId:{actorId:actor.accountId,commandId:input.commandId}}}),payloadHash=hash(input);
  if(existing){if(existing.organizationId!==actor.organizationId||existing.payloadHash!==payloadHash)throw new ConflictException("Command identity reused with changed values");return existing.result as T;}
  const result=await fn(tx);await this.active(tx,actor,owner);await tx.dashboardReceipt.create({data:{organizationId:actor.organizationId,actorId:actor.accountId,commandId:input.commandId,payloadHash,result:json(result)}});return result;
 });}
 async freeze(actor:Actor,value:unknown){const input=parse(snapshotSchema,value);
  const saved=await this.receipt(actor,input,true,async tx=>{
   const result=await transactionalReadPorts(this,tx).collect(actor,input);
   if(input.correctsId){const prior=await tx.reportSnapshot.findFirst({where:{id:input.correctsId,organizationId:actor.organizationId}});if(!prior||prior.category!==input.category||prior.from.toISOString().slice(0,10)!==input.from||prior.to.toISOString().slice(0,10)!==input.to)throw new ConflictException("Correction must retain the same report category and period");}
   const id=randomUUID(),table=json(result.table),manifest=json(result.manifest);
   const hashes=await tx.$queryRaw<Array<{tableHash:string;manifestHash:string}>>`SELECT encode(sha256(convert_to(${JSON.stringify(table)}::jsonb::text,'UTF8')),'hex') AS "tableHash", encode(sha256(convert_to(${JSON.stringify(manifest)}::jsonb::text,'UTF8')),'hex') AS "manifestHash"`;
   const eventId=await recordProjectEvent(tx,{organizationId:actor.organizationId,actorId:actor.accountId,eventName:"report.finalized",subjectType:"report_snapshot",subjectId:id,reason:input.reason,after:{category:input.category,...hashes[0],correctsId:input.correctsId??null}});
   return tx.reportSnapshot.create({data:{id,organizationId:actor.organizationId,creatorId:actor.accountId,category:input.category,from:new Date(input.from),to:new Date(input.to),table,manifest,correctsId:input.correctsId??null,reason:input.reason,eventId}});
  });return this.snapshot(actor,saved.id);
 }
 async snapshots(actor:Actor){return this.transaction(async tx=>{const scoped=transactionalReadPorts(this,tx);await scoped.active(tx,actor);const visible=[],readCache=new Map<string,unknown>();for(const snapshot of await tx.reportSnapshot.findMany({where:{organizationId:actor.organizationId},orderBy:{createdAt:"desc"}})){if(await scoped.safe(()=>scoped.authorizeManifest(actor,snapshot.manifest as Manifest,tx,readCache))!==null)visible.push({id:snapshot.id,title:txt(obj(snapshot.table).title),category:snapshot.category,from:snapshot.from,to:snapshot.to,createdAt:snapshot.createdAt,correctsId:snapshot.correctsId});}return {snapshots:visible};});}
 async snapshot(actor:Actor,id:string){return this.transaction(async tx=>{const scoped=transactionalReadPorts(this,tx);await scoped.active(tx,actor);const snapshot=await tx.reportSnapshot.findFirst({where:{id,organizationId:actor.organizationId}});if(!snapshot)throw new NotFoundException("Report unavailable");await scoped.authorizeManifest(actor,snapshot.manifest as Manifest,tx);await scoped.active(tx,actor);return {snapshot:{id:snapshot.id,category:snapshot.category,from:snapshot.from,to:snapshot.to,createdAt:snapshot.createdAt,correctsId:snapshot.correctsId,reason:snapshot.reason},table:snapshot.table as unknown as ReportTable};});}
 async schedules(actor:Actor){return this.transaction(async tx=>{await this.active(tx,actor,true);return {rules:(await tx.dashboardRule.findMany({where:{organizationId:actor.organizationId},orderBy:{createdAt:"desc"}})).map(r=>({id:r.id,version:r.version,enabled:r.enabled,...obj(r.data)}))};});}
 async saveSchedule(actor:Actor,value:unknown,id?:string){const input=parse(scheduleSchema,value);return this.receipt(actor,{...input,targetId:id??null},true,async tx=>{
  const {commandId,reason,expectedVersion,enabled,...data}=input;void commandId;
  if(data.projectId&&!await tx.project.findFirst({where:{id:data.projectId,organizationId:actor.organizationId}}))throw new ForbiddenException("Schedule project must belong to this organization");
  const prior=id?await tx.dashboardRule.findFirst({where:{id,organizationId:actor.organizationId}}):null;if(id&&(!prior||prior.version!==expectedVersion))throw new ConflictException("Schedule changed; refresh");
  const ruleId=prior?.id??randomUUID(),version=(prior?.version??0)+1;
  const rule=prior?await tx.dashboardRule.update({where:{id:ruleId},data:{version,enabled,data:json(data)}}):await tx.dashboardRule.create({data:{id:ruleId,organizationId:actor.organizationId,creatorId:actor.accountId,enabled,data:json(data)}});
  const eventId=await recordProjectEvent(tx,{organizationId:actor.organizationId,actorId:actor.accountId,eventName:"dashboard.rule_changed",subjectType:"dashboard_rule",subjectId:ruleId,reason,after:{version,enabled,data}});
  await tx.dashboardRuleVersion.create({data:{organizationId:actor.organizationId,ruleId,version,enabled,data:json(data),actorId:actor.accountId,reason,eventId}});return {id:rule.id,version,...input};
 });}
 async reminders(actor:Actor){return this.transaction(async tx=>{await this.active(tx,actor);const reminders=[];for(const r of await tx.personalReminder.findMany({where:{organizationId:actor.organizationId,creatorId:actor.accountId},orderBy:{dueAt:"asc"}})){const run=await tx.dashboardRun.findFirst({where:{sourceId:r.id,recipientId:actor.accountId}});const delivered=run?!!await tx.notification.findFirst({where:{eventId:run.eventId,recipientAccountId:actor.accountId,channel:"IN_APP",deliveryState:"DELIVERED"}}):false;reminders.push({...r,delivered});}return {reminders};});}
 async addReminder(actor:Actor,value:unknown){const input=parse(reminderSchema,value);return this.receipt(actor,input,false,async tx=>{const id=randomUUID();const eventId=await recordProjectEvent(tx,{organizationId:actor.organizationId,actorId:actor.accountId,eventName:"dashboard.reminder_created",subjectType:"personal_reminder",subjectId:id,reason:input.reason,after:{title:input.title,dueAt:input.dueAt}});return tx.personalReminder.create({data:{id,organizationId:actor.organizationId,creatorId:actor.accountId,title:input.title,dueAt:new Date(input.dueAt),reason:input.reason,eventId}});});}
 async dashboard(actor:Actor,dayOverride?:string){return this.transaction(tx=>transactionalReadPorts(this,tx).dashboardRead(actor,dayOverride));}
 async dashboardSource(actor:Actor,source:DashboardSource){return this.transaction(async tx=>{
  const result=await transactionalReadPorts(this,tx).dashboardRead(actor,undefined,source);
  return {source,today:result.today,readCompletedAt:new Date().toISOString(),sections:result.sections,...(source==="decisions"?{decisions:result.decisions}:{})};
 });}
 private async dashboardRead(actor:Actor,dayOverride?:string,selectedSource?:DashboardSource){const {organization,account}=await this.transaction(tx=>this.active(tx,actor));const include=(source:DashboardSource)=>selectedSource===undefined||selectedSource===source;
  const today=dayOverride??localCalendarDate(new Date(),organization.timezone),tasks=include("tasks")?await this.allTasks(actor):[],context=selectedSource===undefined||["health","performance","workload"].includes(selectedSource)?await this.performance.context(actor):{employees:[],projects:[]},decisionPage=include("decisions")?await this.allDecisions(actor):{items:[],nextCursor:null},decisions={...decisionPage,items:decisionPage.items.map(item=>{const approvalId=txt(item.id);return {...item,approvalId,route:`/my-work?approvalId=${encodeURIComponent(approvalId)}`,sourceRef:{type:"APPROVAL",approvalId}};})};
  const active=tasks.filter(t=>!["COMPLETED","STOPPED_DUE_TO_PROJECT_CANCELLATION"].includes(txt(t.status))),taskRow=(t:Obj)=>{const taskId=txt(t.id),projectId=typeof t.projectId==="string"?t.projectId:undefined;return {id:taskId,label:txt(t.title),status:txt(t.status),date:this.periodDate(t.committedDueDate??t.targetDate),route:taskRoute(taskId),projectId:projectId??null,sourceRef:taskSourceRef(taskId,projectId)};};
  const sections:Array<{key:string;label:string;rows:Obj[];unavailable?:string}>=include("tasks")?[{key:"attention",label:"Needs your attention",rows:active.filter(t=>t.priority==="CRITICAL"||this.periodDate(t.committedDueDate??t.targetDate)<today).map(taskRow)},{key:"overdue",label:"Overdue and incomplete",rows:active.filter(t=>this.periodDate(t.committedDueDate??t.targetDate)<today).map(taskRow)},{key:"today",label:"Today and due work",rows:active.filter(t=>this.periodDate(t.committedDueDate??t.targetDate)===today).map(taskRow)},{key:"priority",label:"Priority work",rows:active.filter(t=>["HIGH","CRITICAL"].includes(txt(t.priority))).map(taskRow)},{key:"reviews",label:"Reviews and corrections",rows:active.filter(t=>txt(t.status).includes("REVIEW")||txt(t.status).includes("CORRECTION")||t.type==="CORRECTION").map(taskRow)},{key:"waiting",label:"Waiting and blockers",rows:active.filter(t=>t.status==="WAITING"||t.requiresReassignment).map(taskRow)}]:[];
  if(include("health")){const health:Obj[]=[];for(const p of context.projects){const source=await this.performance.project(actor,p.id),latest=source.snapshots[0],data=latest?obj(latest.data):{},score=typeof data.score==="number"&&Number.isFinite(data.score)?data.score:null,from=typeof data.from==="string"?data.from:null,to=typeof data.to==="string"?data.to:null,policyId=typeof data.policyId==="string"?data.policyId:null,policyVersion=typeof data.policyVersion==="number"&&Number.isFinite(data.policyVersion)?data.policyVersion:null;health.push({id:p.id,projectId:p.id,label:p.label,status:latest?txt(data.status):"UNAVAILABLE",value:latest?txt(data.score):"Policy/evidence required",route:`/performance?projectId=${encodeURIComponent(p.id)}`,sourceRef:{type:"PROJECT_HEALTH",projectId:p.id,snapshotId:latest?.id??null},scoreScale:{min:0,max:100},score,snapshotId:latest?.id??null,from,to,period:{from,to},policyId,policyVersion,unavailable:latest?null:"No authorized persisted project-health snapshot is available."});}sections.push({key:"health",label:"Project health and risks",rows:health});}
  if(include("performance")){const scores:Obj[]=[];for(const e of context.employees){const source=await this.performance.employee(actor,e.id);for(const family of ["EMPLOYEE","LEADER"]){const latest=source.snapshots.find(s=>obj(s.data).family===family);if(latest)scores.push({id:latest.id,label:e.label,status:txt(obj(latest.data).status),value:txt(obj(latest.data).score),route:"/performance"});}}sections.push({key:"performance",label:"Employee and Team Leader performance",rows:scores});}
  if(include("workload")){const employeeLabels=new Map(context.employees.map(e=>[e.id,e.label])),workloadRows=new Map<string,Obj>();for(const scope of (account.employee?["mine","managed"]:["managed"]) as Array<"mine"|"managed">){const workforce=await this.workforce.list(actor,scope,today,today);for(const r of [...arr(workforce.workloadPeriods),...arr(workforce.leaves)])workloadRows.set(txt(r.id??r.employeeId),{id:txt(r.id??r.employeeId),label:employeeLabels.get(txt(r.employeeId))??"Employee",status:txt(r.category??r.state),value:txt(r.availableMinutes??r.days),route:"/workforce"});}sections.push({key:"workload",label:"Workload and leave",rows:[...workloadRows.values()]});}
  if(include("site"))for(const p of (await this.site.projects(actor)).items){const detail=obj(await this.site.detail(actor,p.id)),projectId=p.id,rows:Obj[]=[];
   const addSite=(kind:"PACKAGE"|"REPORT"|"SNAG"|"MANPOWER"|"NOTE"|"HANDOVER",id:string,label:string,status:string,value:unknown)=>{const query=new URLSearchParams({projectId,recordKind:kind,recordId:id});rows.push({id:`${kind}:${id}`,label,status,value,route:`/site?${query}`,sourceRef:{type:"SITE_RECORD",projectId,recordKind:kind,recordId:id}});};
   for(const item of arr(detail.packages))addSite("PACKAGE",txt(item.id),txt(obj(item.data).title)||"Work package",txt(item.state),obj(item.data).actualPercent??obj(item.data).qualityStatus);
   for(const item of arr(detail.reports))addSite("REPORT",txt(item.id),`Daily report · ${txt(obj(item.data).date)}`,txt(item.state),obj(item.data).workCompleted);
   for(const item of arr(detail.snags))addSite("SNAG",txt(item.id),txt(obj(item.data).title)||"Site snag",txt(item.state),obj(item.data).description);
   for(const item of arr(detail.manpower))addSite("MANPOWER",txt(item.id),`Manpower · ${txt(obj(item.data).trade)}`,txt(obj(item.data).date),obj(item.data).count);
   for(const item of arr(detail.notes))addSite("NOTE",txt(item.id),"Site note",txt(item.state),obj(item.data).note);
   for(const item of arr(detail.handovers))addSite("HANDOVER",txt(item.id),`Site handover · ${txt(obj(item.data).decidedAt)}`,"RECORDED",obj(item.data).note);
   if(!rows.length)rows.push({id:projectId,label:p.title,status:"",value:"Open authorized project site context",route:`/site?projectId=${encodeURIComponent(projectId)}`,sourceRef:{type:"PROJECT",projectId}});
   sections.push({key:`site:${projectId}`,label:`Site: ${p.title}`,rows});}
  if(include("training")){const trainingRows:Obj[]=[],trainingUnavailable:string[]=[];
  const from="0001-01-01",to="9999-12-31";
  if(this.skills){try{const skillSetup=await this.skills.setup(actor);for(const employee of skillSetup.employees){try{const evidence=await this.skills.reportEvidence(actor,employee.id,from,to);for(const rating of evidence.ratings)trainingRows.push({id:rating.id,label:`${employee.label}: skill rating`,status:"CURRENT",value:rating.level,route:`/learning?employeeId=${encodeURIComponent(employee.id)}`,sourceRef:{type:"SKILL_RATING",ratingId:rating.id,employeeId:employee.id}});for(const change of evidence.changes)trainingRows.push({id:change.id,label:`${employee.label}: skill change`,status:"RECORDED",value:`${change.fromLevel} → ${change.toLevel}`,date:change.occurredAt,route:`/learning?employeeId=${encodeURIComponent(employee.id)}`,sourceRef:{type:"SKILL_CHANGE",changeId:change.id,employeeId:employee.id}});}catch{trainingUnavailable.push(`Skill evidence is unavailable for ${employee.label}.`);}}}catch{trainingUnavailable.push("Skill evidence is unavailable for the current authorized audience.");}}else trainingUnavailable.push("Skill evidence source is unavailable.");
  if(this.training){try{for(const item of await this.training.reportEvidence(actor,from,to)){trainingRows.push({id:item.assignmentId,label:item.moduleTitle,status:item.state,value:`${item.moduleVersion}`,date:item.assignedAt,route:`/learning?assignmentId=${encodeURIComponent(item.assignmentId)}`,sourceRef:{type:"TRAINING_ASSIGNMENT",assignmentId:item.assignmentId}});for(const assessment of item.assessments)trainingRows.push({id:assessment.id,label:`${item.moduleTitle}: assessment`,status:assessment.outcome,date:assessment.occurredAt,route:`/learning?assignmentId=${encodeURIComponent(item.assignmentId)}`,sourceRef:{type:"TRAINING_ATTEMPT",attemptId:assessment.id,assignmentId:item.assignmentId}});for(const observation of item.effectiveness)trainingRows.push({id:observation.id,label:`${item.moduleTitle}: effectiveness observation`,status:"RECORDED",value:observation.observation,date:observation.date,route:`/learning?assignmentId=${encodeURIComponent(item.assignmentId)}`,sourceRef:{type:"TRAINING_ATTEMPT",attemptId:observation.id,assignmentId:item.assignmentId}});}}catch{trainingUnavailable.push("Training evidence is unavailable for the current authorized audience.");}}else trainingUnavailable.push("Training evidence source is unavailable.");
  if(this.library){try{for(const item of await this.library.reportEvidence(actor,from,to))for(const version of item.versions)trainingRows.push({id:version.versionId,label:`${item.title}: published SOP`,status:"PUBLISHED",value:version.version,publishedAt:version.publishedAt??null,acknowledgedAt:version.acknowledgedAt??null,route:`/learning?panel=library&recordId=${encodeURIComponent(item.recordId)}`,sourceRef:{type:"LIBRARY_SOP_VERSION",recordId:item.recordId,versionId:version.versionId}});}catch{trainingUnavailable.push("Published SOP evidence is unavailable for the current authorized audience.");}}else trainingUnavailable.push("Published SOP evidence source is unavailable.");
  sections.push({key:"training",label:"Training and improvement",rows:trainingRows,...(trainingUnavailable.length?{unavailable:trainingUnavailable.join(" ")}:{} )});}await this.transaction(tx=>this.active(tx,actor));return {today,role:actor.kind==="OWNER"?"OWNER":context.employees.some(e=>e.canManage)?"TEAM_LEADER":"EMPLOYEE",sections,decisions};
 }

 private manifestValue(value:unknown):Manifest{return Array.isArray(value)?value as Manifest:(obj(value).sources??[]) as Manifest;}
 private async summary(actor:Actor,data:ScheduleInput,day:string){
  const kind=data.summaryKind!,from=kind==="WEEKLY"?new Date(Date.parse(day)-6*86400000).toISOString().slice(0,10):kind==="MONTHLY"?day.slice(0,7)+"-01":day;
  // Training rows currently have no retained owning-port authorization manifest.
  // Keep them on the live dashboard only; scheduled summaries must re-check access on later reads.
  const dashboard=await this.dashboard(actor,day),sources:Manifest=[],sections=dashboard.sections.filter(section=>section.key!=="training");
  for(const t of await this.allTasks(actor)){const taskId=txt(t.id),projectId=typeof t.projectId==="string"?t.projectId:undefined,detail=await this.tasks.detail(actor,taskId);sources.push({kind:"TASK",id:taskId,...(projectId?{projectId}:{}),keys:keys(detail)});}
  const context=await this.performance.context(actor),periodHealth:Obj[]=[],periodScores:Obj[]=[];for(const p of context.projects){const source=await this.performance.project(actor,p.id);sources.push({kind:"PER_PROJECT",id:p.id,keys:keys(source)});for(const snapshot of source.snapshots){const d=obj(snapshot.data);if(txt(d.from)>=from&&txt(d.to)<=day){const score=typeof d.score==="number"&&Number.isFinite(d.score)?d.score:null,fromDate=typeof d.from==="string"?d.from:null,toDate=typeof d.to==="string"?d.to:null,policyId=typeof d.policyId==="string"?d.policyId:null,policyVersion=typeof d.policyVersion==="number"&&Number.isFinite(d.policyVersion)?d.policyVersion:null;periodHealth.push({id:snapshot.id,label:p.label,status:txt(d.status),value:txt(d.score),date:`${txt(d.from)} to ${txt(d.to)}`,route:`/performance?projectId=${encodeURIComponent(p.id)}`,projectId:p.id,sourceRef:{type:"PROJECT_HEALTH",projectId:p.id,snapshotId:snapshot.id},scoreScale:{min:0,max:100},score,snapshotId:snapshot.id,from:fromDate,to:toDate,period:{from:fromDate,to:toDate},policyId,policyVersion});}}}for(const e of context.employees){const source=await this.performance.employee(actor,e.id);sources.push({kind:"PER_EMPLOYEE",id:e.id,keys:keys(source)});for(const snapshot of source.snapshots){const d=obj(snapshot.data);if(txt(d.from)>=from&&txt(d.to)<=day)periodScores.push({id:snapshot.id,label:e.label,status:txt(d.family),value:txt(d.score),date:`${txt(d.from)} to ${txt(d.to)}`,route:"/performance"});}}
  if(kind==="WEEKLY"||kind==="MONTHLY"){const health=sections.find(s=>s.key==="health"),performance=sections.find(s=>s.key==="performance");if(health){health.rows=periodHealth;if(!periodHealth.length)health.unavailable="No accepted health snapshot matches this summary period.";}if(performance){performance.rows=periodScores;if(!periodScores.length)performance.unavailable="No accepted employee/leader performance snapshot matches this summary period.";}}
  for(const p of (await this.site.projects(actor)).items){const source=await this.site.detail(actor,p.id);sources.push({kind:"SITE",id:p.id,keys:keys(source)});}
  for(const employee of (await this.workforce.setup(actor)).employees)sources.push({kind:"WORKFORCE_EMPLOYEE",id:employee.id});
  for(const d of dashboard.decisions.items)sources.push({kind:"APPROVAL",id:d.approvalId});
  const completed:Obj[]=[],outstanding:Obj[]=[],tomorrowRows:Obj[]=[],tomorrow=new Date(Date.parse(day)+86400000).toISOString().slice(0,10);
  for(const task of await this.allTasks(actor)){
   const taskId=txt(task.id),projectId=typeof task.projectId==="string"?task.projectId:undefined,taskRow={id:taskId,label:txt(task.title),status:txt(task.status),route:taskRoute(taskId),projectId:projectId??null,sourceRef:taskSourceRef(taskId,projectId)},detail=await this.tasks.detail(actor,taskId);if(detail.history.statusChanges.some(s=>s.toStatus==="COMPLETED"&&localCalendarDate(s.occurredAt,data.timezone)>=from&&localCalendarDate(s.occurredAt,data.timezone)<=day))completed.push(taskRow);
   if(!["COMPLETED","STOPPED_DUE_TO_PROJECT_CANCELLATION"].includes(txt(task.status))){outstanding.push(taskRow);if(this.periodDate(task.targetDate)===tomorrow||this.periodDate(task.startDate)===tomorrow)tomorrowRows.push(taskRow);}
  }
  sections.push({key:"completed",label:`Completed ${from} to ${day}`,rows:completed},{key:"outstanding",label:"Outstanding work",rows:outstanding},{key:"tomorrow",label:`Tomorrow plan: ${tomorrow}`,rows:tomorrowRows});
  const logged:Obj[]=[];for(const entry of (await this.time.list(actor,"managed",true)).entries){const e=obj(entry),date=this.periodDate(e.date??e.startedAt);if(date<from||date>day)continue;logged.push({id:entry.id,label:txt(e.employeeId),date,value:txt(e.durationSeconds),status:e.approved?"APPROVED":"UNAPPROVED",route:"/time"});sources.push({kind:"TIME",id:entry.id,keys:keys(entry)});}sections.push({key:"time",label:"Factual time logged (seconds)",rows:logged});
  const periodWorkload:Obj[]=[];for(const scope of ["mine","managed"] as const){const workforce=await this.workforce.list(actor,scope,from,day);for(const family of ["workloadPeriods","leaves"] as const){for(const value of arr(workforce[family])){const id=workforceId(value,family);if(periodWorkload.some(r=>r.id===id))continue;periodWorkload.push({id,label:`${family}: ${txt(value.employeeId)}`,status:txt(value.state??value.category),value:txt(value.availableMinutes??value.days),route:"/workforce"});sources.push({kind:"WORKFORCE",id,from,to:day,keys:keys(value)});}}}sections.push({key:"period_workload",label:`Workload and leave ${from} to ${day}`,rows:periodWorkload});
  await this.authorizeManifest(actor,sources);
  return {sources,summary:{kind,from,to:day,generatedAt:new Date().toISOString(),sections}};
 }
 async summaries(actor:Actor){return this.transaction(async tx=>{const scoped=transactionalReadPorts(this,tx);await scoped.active(tx,actor);const summaries=[],readCache=new Map<string,unknown>();for(const run of await tx.dashboardRun.findMany({where:{organizationId:actor.organizationId,recipientId:actor.accountId},orderBy:{createdAt:"desc"}})){const summaryValue=obj(run.manifest).summary;if(!summaryValue)continue;const summary=obj(summaryValue);if(await scoped.safe(()=>scoped.authorizeManifest(actor,scoped.manifestValue(run.manifest),tx,readCache))!==null){const retainedSummary={...summary,sections:arr(summary.sections).filter(section=>obj(section).key!=="training")};summaries.push({id:run.id,sourceId:run.sourceId,slot:run.slot,createdAt:run.createdAt,summary:retainedSummary});}}return {summaries};});}

 async runBatch(now=new Date()){
  const organization=await this.database.prisma.organization.findFirst();if(!organization)return 0;
  const owners=await this.database.prisma.account.findMany({where:{kind:"OWNER",state:"ACTIVE"}});if(owners.length!==1)return 0;
  const owner=await this.projects.actor(owners[0]!.id);let generated=0;
  for(const reminder of await this.database.prisma.personalReminder.findMany({where:{organizationId:organization.id,dueAt:{lte:now}}})){
   const actor=await this.safe(()=>this.projects.actor(reminder.creatorId));if(!actor)continue;
   if(await this.deliver(owner,reminder.id,actor,"personal",reminder.title,[],false,false))generated++;
  }
  for(const rule of await this.database.prisma.dashboardRule.findMany({where:{organizationId:organization.id,enabled:true}})){
   const data=obj(rule.data) as unknown as ScheduleInput,day=localSlot(now,data);if(!day)continue;
   for(const account of await this.database.prisma.account.findMany({where:{state:"ACTIVE",kind:{in:["OWNER","STAFF"]},...(data.audience==="OWNER"||data.audience==="SELF"?{id:owner.accountId}:{})}})){
    const actor=await this.safe(()=>this.projects.actor(account.id));if(!actor)continue;
    // Immutable committed slots cannot produce another result. Avoid rebuilding
    // their full source graph on every scheduler tick or process restart.
    if(data.kind==="SUMMARY"&&await this.database.prisma.dashboardRun.findUnique({where:{sourceId_recipientId_slot:{sourceId:rule.id,recipientId:actor.accountId,slot:day}}}))continue;
    const ctx=await this.performance.context(actor);if(data.audience==="EMPLOYEE"&&account.kind!=="STAFF"||data.audience==="MANAGER"&&account.kind!=="OWNER"&&!ctx.employees.some(e=>e.canManage))continue;
    if(data.kind==="EVENT_NOTICE"){
     const events=await this.database.prisma.domainEvent.findMany({where:{organizationId:organization.id,eventName:{in:data.eventNames??[]},occurredAt:{gte:rule.createdAt,lte:now}},orderBy:[{occurredAt:"asc"},{id:"asc"}]});
     for(const event of events){const sources=await this.eventSources(actor,event);if(!sources||data.projectId&&!sources.some(s=>s.projectId===data.projectId||["PROJECT","SITE","TURNKEY","PER_PROJECT","CLIENT_PROJECT"].includes(s.kind)&&s.id===data.projectId))continue;
      if(data.priority){const taskSource=sources.find(s=>s.kind==="TASK"||s.kind==="REVIEW");if(!taskSource||(await this.tasks.detail(actor,taskSource.id)).task.priority!==data.priority)continue;}
      if(await this.deliver(owner,rule.id,actor,`event:${event.id}`,"Relevant work activity",sources,data.critical,data.mandatory,rule.version))generated++;
     }
    }else if(data.kind==="TASK_REMINDER")for(const task of await this.allTasks(actor)){
     if(["COMPLETED","STOPPED_DUE_TO_PROJECT_CANCELLATION"].includes(txt(task.status))||task.requiresReassignment||data.projectId&&task.projectId!==data.projectId||data.priority&&task.priority!==data.priority)continue;
     const due=this.periodDate(task.committedDueDate??task.targetDate);if(!due)continue;
     const diff=Math.round((Date.parse(day)-Date.parse(due))/86400000);if(data.offsetDays!>0?diff<data.offsetDays!:diff!==data.offsetDays!)continue;
     if(data.audience==="EMPLOYEE"&&task.primaryOwnerEmployeeId!==ctx.employeeId)continue;
     if(await this.deliver(owner,rule.id,actor,`${day}:${txt(task.id)}`,`Task reminder: ${txt(task.title)}`,[{kind:"TASK",id:txt(task.id)}],data.critical,data.mandatory,rule.version))generated++;
    }else {
     const summary=await this.transaction(tx=>transactionalReadPorts(this,tx).summary(actor,data,day));
     if(await this.deliver(owner,rule.id,actor,day,`${data.summaryKind} summary ready`,summary,data.critical,data.mandatory,rule.version))generated++;
    }
   }
  }
  return generated;
 }
 private async eventSources(actor:Actor,event:{id:string;subjectType:string;subjectId:string;eventName:string;payload:Prisma.JsonValue}):Promise<Manifest|null>{
  const sourceId=event.subjectId;let sources:Manifest=[];
  if(event.subjectType==="task"){const task=await this.safe(()=>this.tasks.detail(actor,sourceId));if(task)sources=[{kind:"TASK",id:sourceId,...(task.task.projectId?{projectId:task.task.projectId}:{})}];}
  else if(event.subjectType==="project")sources=[{kind:"PROJECT",id:sourceId}];
  else if(event.subjectType==="document")sources=[{kind:"DOCUMENT",id:sourceId}];
  else if(["revision","document_revision"].includes(event.subjectType))sources=[{kind:"REVISION",id:sourceId}];
  else if(event.subjectType==="transmittal"){const source=await this.database.prisma.drawingTransmittal.findFirst({where:{id:sourceId,organizationId:actor.organizationId}});if(source)sources=[{kind:"TRANSMITTAL",id:sourceId,projectId:source.projectId}];}
  else if(event.subjectType==="review"){const round=await this.database.prisma.reviewRound.findFirst({where:{id:sourceId,organizationId:actor.organizationId}});if(round)sources=[{kind:"REVIEW",id:round.taskId,projectId:round.projectId}];}
  else if(event.subjectType==="approval_request")sources=[{kind:"APPROVAL",id:sourceId}];
  else if(event.subjectType==="workforce_record"){const record=await this.database.prisma.workforceRecord.findFirst({where:{id:sourceId,organizationId:actor.organizationId}});if(record?.employeeId)sources=[{kind:"WORKFORCE_EMPLOYEE",id:record.employeeId}];}
  else if(event.subjectType==="workforce_ledger")sources=[{kind:"WORKFORCE_EMPLOYEE",id:sourceId}];
  else if(["site_record","site_workspace"].includes(event.subjectType)){const record=event.subjectType==="site_record"?await this.database.prisma.siteRecord.findFirst({where:{id:sourceId,organizationId:actor.organizationId}}):await this.database.prisma.siteWorkspace.findFirst({where:{id:sourceId,organizationId:actor.organizationId}});if(record)sources=[{kind:"SITE",id:record.projectId}];}
  else if(event.subjectType==="turnkey_release"){const record=await this.database.prisma.turnkeyRelease.findFirst({where:{id:sourceId,organizationId:actor.organizationId}});if(record)sources=[{kind:"TURNKEY",id:record.projectId}];}
  else if(["employee_performance","project_health"].includes(event.subjectType)){const record=await this.database.prisma.performanceRecord.findFirst({where:{id:sourceId,organizationId:actor.organizationId}});if(record?.employeeId)sources=[{kind:"PER_EMPLOYEE",id:record.employeeId}];else if(record?.projectId)sources=[{kind:"PER_PROJECT",id:record.projectId}];}
  else if(event.eventName.startsWith("client.")&&this.clientReviews){const auditId=obj(event.payload).auditEventId;if(typeof auditId==="string"){const audit=await this.database.prisma.auditEvent.findFirst({where:{id:auditId,organizationId:actor.organizationId,eventKey:event.eventName,subjectId:sourceId}});const projectId=obj(audit?.after).projectId;if(typeof projectId==="string")sources=[{kind:"CLIENT_PROJECT",id:projectId}];}}
  if(!sources.length)return null;
  return await this.safe(async()=>{await this.authorizeManifest(actor,sources);return sources;});
 }
 private async deliver(owner:Actor,sourceId:string,recipient:Actor,slot:string,title:string,manifest:unknown,critical:boolean,mandatory:boolean,expectedRuleVersion?:number){
  await this.authorizeManifest(recipient,this.manifestValue(manifest));return this.transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${sourceId+recipient.accountId+slot},0))`;await this.active(tx,owner,true);await this.active(tx,recipient);
   if(await tx.dashboardRun.findUnique({where:{sourceId_recipientId_slot:{sourceId,recipientId:recipient.accountId,slot}}}))return false;
   await tx.$queryRaw`SELECT id FROM dashboard_rules WHERE id=${sourceId}::uuid FOR SHARE`;
   const rule=await tx.dashboardRule.findUnique({where:{id:sourceId}});if(rule&&(!rule.enabled||rule.version!==expectedRuleVersion))return false;
   const scoped=transactionalReadPorts(this,tx),sources=this.manifestValue(manifest);await scoped.authorizeManifest(recipient,sources,tx);
   if(rule&&obj(rule.data).kind==="TASK_REMINDER")for(const source of sources){const task=await scoped.tasks.detail(recipient,source.id);if(["COMPLETED","STOPPED_DUE_TO_PROJECT_CANCELLATION"].includes(task.task.status)||task.task.requiresReassignment)return false;}
   const runManifest={sources,...(obj(manifest).summary?{summary:obj(manifest).summary}:{}),ruleVersion:rule?.version??null,kind:rule?obj(rule.data).kind:"PERSONAL"};
   const hashes=await tx.$queryRaw<Array<{manifestHash:string}>>`SELECT encode(sha256(convert_to(${JSON.stringify(runManifest)}::jsonb::text,'UTF8')),'hex') AS "manifestHash"`;
   const id=randomUUID(),eventId=await recordProjectEvent(tx,{organizationId:owner.organizationId,actorId:owner.accountId,eventName:"dashboard.delivered",subjectType:"dashboard_run",subjectId:id,reason:"Configured S24 scheduled delivery",after:{sourceId,recipientId:recipient.accountId,slot,manifestHash:hashes[0]!.manifestHash}});
   await tx.dashboardRun.create({data:{id,organizationId:owner.organizationId,sourceId,recipientId:recipient.accountId,slot,manifest:json(runManifest),eventId}});
   for(const channel of ["IN_APP","EMAIL"] as const)await new NotificationsService(this.database).createForEvent(tx,{eventId,recipientAccountId:recipient.accountId,channel,category:"dashboard.scheduled",title:"Scheduled work notice",body:"Open your dashboard to review the currently authorized work and evidence.",internalRoute:"/dashboard",critical,mandatory});
   void title;
   return true;
  });
 }
 async deliveryAuthorized(eventId:string,accountId:string){try{return await this.transaction(async tx=>{
  const scoped=transactionalReadPorts(this,tx),run=await tx.dashboardRun.findFirst({where:{eventId,recipientId:accountId}});if(!run)return false;
  const actor=await scoped.projects.actor(accountId),sources=this.manifestValue(run.manifest);await scoped.authorizeManifest(actor,sources,tx);
  await tx.$queryRaw`SELECT id FROM dashboard_rules WHERE id=${run.sourceId}::uuid FOR SHARE`;
  const rule=await tx.dashboardRule.findUnique({where:{id:run.sourceId}});if(rule){if(!rule.enabled||obj(run.manifest).ruleVersion!==rule.version)return false;if(obj(rule.data).kind==="TASK_REMINDER")for(const source of sources){const task=await scoped.tasks.detail(actor,source.id);if(["COMPLETED","STOPPED_DUE_TO_PROJECT_CANCELLATION"].includes(task.task.status)||task.task.requiresReassignment)return false;}return true;}
  const reminder=await tx.personalReminder.findUnique({where:{id:run.sourceId}});return reminder?.creatorId===accountId;
 });}catch(e){if(e instanceof ForbiddenException||e instanceof NotFoundException)return false;throw e;}}
}

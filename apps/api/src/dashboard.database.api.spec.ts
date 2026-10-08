import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { ForbiddenException } from "@nestjs/common";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { TimeService } from "./time.service.js";
import { DocumentService } from "./document.service.js";
import { TaskService } from "./task.service.js";
import { ProjectService } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { DatabaseService } from "./database.service.js";
import { DashboardService } from "./dashboard.service.js";
import { NotificationsService } from "./notifications.service.js";
import { RevisionService } from "./revision.service.js";
import { ReviewService } from "./review.service.js";
import { WorkforceService } from "./workforce.service.js";
import { PerformanceService } from "./performance.service.js";
import { ClientPortalScopeService } from "./client-portal-scope.service.js";
import { TurnkeyService } from "./turnkey.service.js";
import { SiteService } from "./site.service.js";
import { localCalendarDate } from "./task-recurrence-policy.js";
import { Prisma } from "./generated/prisma/client.js";
import type { ProjectActor } from "./project.service.js";
import type { RuntimeConfig } from "./config.js";

const url = process.env.S24_DATABASE_URL;
const suite = url ? describe : describe.skip;
class Rollback extends Error {}
suite("S24 real PostgreSQL command and evidence boundaries", () => {
 let database: DatabaseService;
 beforeAll(async () => {
  const parsed = new URL(url!);
  const s24 = parsed.port === "56433" && /^\/sense_s24_[a-z0-9_]+_test$/.test(parsed.pathname);
  const s25 = process.env.S25_E2E_ENABLED === "1" && parsed.port === "57433" && /^\/sense_s24_s25_[a-z0-9_]+_test$/.test(parsed.pathname);
  const s26 = process.env.S26_E2E_ENABLED === "1" && parsed.port === "57433" && /^\/sense_s24_s26_[a-z0-9_]+_test$/.test(parsed.pathname);
  const s27 = process.env.S27_E2E_ENABLED === "1" && parsed.port === "57433" && /^\/sense_s24_s27_[a-z0-9_]+_test$/.test(parsed.pathname);
  if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || (!s24 && !s25 && !s26 && !s27)) throw new Error("Dashboard requires an exact S24 or explicitly enabled exact S24/S25/S26/S27 loopback test target");
  database = new DatabaseService({nodeEnv:"test",port:4000,databaseUrl:url!,webOrigin:"http://localhost:5173"} as RuntimeConfig);
  const rows = await database.prisma.$queryRaw<Array<{name:string}>>`SELECT current_database() AS name`;
  if (rows[0]?.name !== parsed.pathname.slice(1)) throw new Error("S24 exact target mismatch");
 });
 afterAll(async () => { await database?.onModuleDestroy(); });
 async function fixture(work:(f:{service:DashboardService;fullService:DashboardService;owner:ProjectActor;staff:ProjectActor;other:ProjectActor;tx:Prisma.TransactionClient;tasks:TaskService;time:TimeService;workflow:ProjectWorkflowService;projects:ProjectService;branchId:string;staffEmployeeId:string})=>Promise<void>) {
  try { await database.prisma.$transaction(async tx => {
   const org=await tx.organization.create({data:{name:"Fictional S24 acceptance "+randomUUID()}});
   const branch=await tx.branch.create({data:{organizationId:org.id,name:"S24 fixture branch"}});
   const team=await tx.team.create({data:{organizationId:org.id,branchId:branch.id,name:"S24 fixture team"}});
   const ownerAccount=await tx.account.create({data:{normalizedEmail:randomUUID()+"@example.test",kind:"OWNER",state:"ACTIVE"}});
   const people:ProjectActor[]=[];
   for(let i=0;i<2;i++) {
    const account=await tx.account.create({data:{normalizedEmail:randomUUID()+"@example.test",kind:"STAFF",state:"ACTIVE"}});
    const employee=await tx.employee.create({data:{organizationId:org.id,accountId:account.id,homeBranchId:branch.id,homeTeamId:team.id,hiredAt:new Date("2026-01-01")}});
    people.push({accountId:account.id,kind:"STAFF",organizationId:org.id,employeeId:employee.id} as ProjectActor);
   }
   const owner={accountId:ownerAccount.id,kind:"OWNER",organizationId:org.id} as ProjectActor;
   let sequence=0;
   const wrap=(target:Prisma.TransactionClient):Prisma.TransactionClient=>new Proxy(target,{get(delegate,key){
    if(key==="$transaction")return async(callback:(t:Prisma.TransactionClient)=>Promise<unknown>)=>{
     const name="s24_fixture_"+(++sequence);await target.$executeRawUnsafe("SAVEPOINT "+name);
     try {const result=await callback(wrap(target));await target.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");await target.$executeRawUnsafe("SET CONSTRAINTS ALL DEFERRED");await target.$executeRawUnsafe("RELEASE SAVEPOINT "+name);return result;}
     catch(e){await target.$executeRawUnsafe("ROLLBACK TO SAVEPOINT "+name);await target.$executeRawUnsafe("RELEASE SAVEPOINT "+name);throw e;}
    }
    return Reflect.get(delegate,key,delegate);
   }});
   const fixtureDb={prisma:wrap(tx)} as unknown as DatabaseService;
   // Public source ports are empty in this fixture; domain source visibility is
   // covered separately. This suite exercises actual command/audit SQL guards.
   const authorization=new AuthorizationService(fixtureDb);const tasks=new TaskService(fixtureDb,authorization);const projects=new ProjectService(fixtureDb);const approval=new ApprovalService(fixtureDb);const workflow=new ProjectWorkflowService(fixtureDb,authorization,approval);
   const time=new TimeService(fixtureDb,authorization,tasks,{} as DocumentService);
   const args=[fixtureDb,projects,tasks,approval,time, {}, {context:async()=>({employees:[],projects:[]})}, {}, {}, {}, {}, {}] as unknown as ConstructorParameters<typeof DashboardService>;
   const service=new DashboardService(...args);
   const config={nodeEnv:"test",port:4000,databaseUrl:url!,webOrigin:"http://localhost:5173",nasRoot:".env.s24-tools/nas"} as RuntimeConfig;
   const documents=new DocumentService(fixtureDb,authorization,config);
   const revisions=new RevisionService(fixtureDb,authorization,documents);
   const notifications=new NotificationsService(fixtureDb);
   const reviews=new ReviewService(fixtureDb,authorization,documents,revisions,notifications);
   const workforce=new WorkforceService(fixtureDb,authorization,approval,notifications,config);
   const portal=new ClientPortalScopeService(fixtureDb,authorization);
   const turnkey=new TurnkeyService(fixtureDb,authorization,approval,revisions,portal);
   const site=new SiteService(fixtureDb,authorization,documents,turnkey,workforce);
   const performance=new PerformanceService(fixtureDb,authorization,revisions,approval,workforce);
   const fullService=new DashboardService(fixtureDb,projects,tasks,approval,time,workforce,performance,revisions,reviews,documents,site,turnkey);
   await work({service,fullService,owner,staff:people[0]!,other:people[1]!,tx:wrap(tx),tasks,time,workflow,projects,branchId:branch.id,staffEmployeeId:(await tx.employee.findUniqueOrThrow({where:{accountId:people[0]!.accountId}})).id});
   throw new Rollback();
  },{timeout:120000}); }catch(e){if(!(e instanceof Rollback))throw e;}
 }
 const filter={category:"skills_training",from:"2026-09-01",to:"2026-09-30"};
 const command=()=>({commandId:randomUUID(),reason:"Fictional S24 acceptance command"});
 test("unavailable S18 evidence is explicit and no organization schedules are seeded",async()=>fixture(async({service,owner})=>{
  expect((await service.preview(owner,filter)).unavailable.join(" ")).toMatch(/S18/);
  expect((await service.schedules(owner)).rules).toEqual([]);
 }));
 test("only Owner freezes history; retries return original snapshot and changed payload conflicts",async()=>fixture(async({service,owner,staff,tx})=>{
  const input={...filter,...command()};await expect(service.freeze(staff,input)).rejects.toBeInstanceOf(ForbiddenException);
  const saved=await service.freeze(owner,input);const replay=await service.freeze(owner,input);
  expect(replay.snapshot.id).toBe(saved.snapshot.id);expect(replay.table).toEqual(saved.table);
  await expect(service.freeze(owner,{...input,reason:"Changed retry evidence"})).rejects.toThrow(/identity/);
  expect(await tx.reportSnapshot.count({where:{organizationId:owner.organizationId}})).toBe(1);
  expect(await tx.dashboardReceipt.count({where:{organizationId:owner.organizationId}})).toBe(1);
 }));
 test("corrections append linked evidence and retain the original period and data",async()=>fixture(async({service,owner})=>{
  const saved=await service.freeze(owner,{...filter,...command()});
  const correction=await service.freeze(owner,{...filter,...command(),correctsId:saved.snapshot.id});
  expect(correction.snapshot.correctsId).toBe(saved.snapshot.id);
  expect((await service.snapshot(owner,saved.snapshot.id)).table).toEqual(saved.table);
  await expect(service.freeze(owner,{...filter,to:"2026-10-01",...command(),correctsId:saved.snapshot.id})).rejects.toThrow(/same report/);
 }));
 test("database guards reject snapshot changes and deletes",async()=>fixture(async({service,owner,tx})=>{
  const saved=await service.freeze(owner,{...filter,...command()});
  const db={prisma:tx} as unknown as DatabaseService;
  await expect(db.prisma.$transaction(inner=>inner.reportSnapshot.update({where:{id:saved.snapshot.id},data:{reason:"Tampered evidence"}}))).rejects.toThrow();
  await expect(db.prisma.$transaction(inner=>inner.reportSnapshot.delete({where:{id:saved.snapshot.id}}))).rejects.toThrow();
  expect((await service.snapshot(owner,saved.snapshot.id)).table).toEqual(saved.table);
 }));
 test("personal reminders are creator scoped and replay safe",async()=>fixture(async({service,staff,other})=>{
  const input={...command(),title:"Personal fixture reminder",dueAt:"2026-10-06T10:00:00Z"};
  const first=await service.addReminder(staff,input);const replay=await service.addReminder(staff,input);
  expect(replay.id).toBe(first.id);expect((await service.reminders(staff)).reminders).toHaveLength(1);
  expect((await service.reminders(other)).reminders).toEqual([]);
  await expect(service.addReminder(staff,{...input,title:"Changed reminder"})).rejects.toThrow(/identity/);
 }));
 test("organization schedules enforce Owner, audited versions and optimistic concurrency",async()=>fixture(async({service,owner,staff,tx})=>{
  const input={...command(),kind:"SUMMARY",enabled:false,localTime:"08:30",timezone:"Asia/Kolkata",audience:"OWNER",summaryKind:"WEEKLY",weekdays:[1],critical:false,mandatory:false};
  await expect(service.saveSchedule(staff,input)).rejects.toBeInstanceOf(ForbiddenException);
  const first=await service.saveSchedule(owner,input);expect(first.version).toBe(1);
  await service.saveSchedule(owner,{...input,...command(),expectedVersion:1,enabled:true},first.id);
  await expect(service.saveSchedule(owner,{...input,...command(),expectedVersion:1},first.id)).rejects.toThrow(/refresh/);
  expect(await tx.dashboardRuleVersion.count({where:{ruleId:first.id}})).toBe(2);
 }));
 test("frozen actual task facts survive live edits and source access loss denies the whole snapshot",async()=>fixture(async({service,owner,staff,tx,tasks,workflow,projects,branchId,staffEmployeeId})=>{
  const {project}=await projects.create(owner,{branchId,title:"S24 source project",deliveryType:"DESIGN",scopes:["Delivery"],reason:"Create source project fixture"});

  await tx.employeePermissionOverride.create({data:{organizationId:owner.organizationId,employeeId:staffEmployeeId,permissionKey:"project.view",effect:"ALLOW",scopeKind:"BRANCH",branchId,reason:"Explicit S24 source grant"}});
  await workflow.assignment(owner,project.id,{employeeId:staffEmployeeId,expectedVersion:1,reason:"Assign source fixture"});
  await tx.employeePermissionOverride.create({data:{organizationId:owner.organizationId,employeeId:staffEmployeeId,permissionKey:"project.manage",effect:"ALLOW",scopeKind:"BRANCH",branchId,reason:"Explicit S24 fixture lead eligibility"}});
  await workflow.lead(owner,project.id,{employeeId:staffEmployeeId,expectedVersion:2,reason:"Appoint fixture lead"});
  await workflow.status(owner,project.id,{toStatus:"ACTIVE",expectedVersion:3,reason:"Activate source fixture"});
  const task=await tasks.create(owner,{title:"Original frozen title",type:"PROJECT",projectId:project.id,ownerEmployeeId:staffEmployeeId,priority:"HIGH",targetDate:"2026-10-15",reason:"Create persisted S24 source"});
  const period={category:"project",from:"2026-10-01",to:"2026-10-31"};
  const frozen=await service.freeze(owner,{...period,...command()});
  expect(frozen.table.rows.some(r=>r.id===task.id&&r.label==="Original frozen title")).toBe(true);
  await expect(service.snapshot(staff,frozen.snapshot.id)).resolves.toMatchObject({table:frozen.table});
  await tasks.edit(owner,task.id,{title:"Changed live title",targetDate:"2026-10-20",priority:"HIGH",expectedVersion:1,reason:"Change actual source after finalization"});
  expect((await service.preview(owner,period)).rows.some(r=>r.id===task.id&&r.label==="Changed live title")).toBe(true);
  expect((await service.snapshot(owner,frozen.snapshot.id)).table).toEqual(frozen.table);
  await tx.employeePermissionOverride.create({data:{organizationId:owner.organizationId,employeeId:staffEmployeeId,permissionKey:"project.view",effect:"DENY",scopeKind:"BRANCH",branchId,reason:"Revoke S24 source visibility"}});
  await expect(service.snapshot(staff,frozen.snapshot.id)).rejects.toBeInstanceOf(ForbiddenException);
  expect((await service.snapshots(staff)).snapshots).toEqual([]);
 }));
 test("configured task reminders deduplicate run slots and exclude completed work",async()=>fixture(async({service,owner,tx,tasks,staffEmployeeId})=>{
  const task=await tasks.create(owner,{title:"S24 scheduled source",type:"NON_PROJECT",ownerEmployeeId:staffEmployeeId,priority:"HIGH",targetDate:"2026-10-05",reason:"Create task reminder source"});
  const rule=await service.saveSchedule(owner,{...command(),kind:"TASK_REMINDER",enabled:true,localTime:"08:00",timezone:"Asia/Kolkata",audience:"OWNER",offsetDays:0,critical:false,mandatory:false});
  const now=new Date("2026-10-05T04:00:00Z");
  expect(await service.runBatch(now)).toBe(1);expect(await service.runBatch(now)).toBe(0);
  const runs=await tx.dashboardRun.findMany({where:{organizationId:owner.organizationId}});expect(runs).toHaveLength(1);
  expect(await service.deliveryAuthorized(runs[0]!.eventId,owner.accountId)).toBe(true);
  await service.saveSchedule(owner,{...command(),kind:"TASK_REMINDER",enabled:true,localTime:"08:15",timezone:"Asia/Kolkata",audience:"OWNER",offsetDays:0,critical:false,mandatory:false,expectedVersion:1},rule.id);
  expect(await service.runBatch(now)).toBe(0);
  expect(await service.deliveryAuthorized(runs[0]!.eventId,owner.accountId)).toBe(false);
  await tasks.transition(owner,task.id,{toState:"IN_PROGRESS",expectedVersion:1,reason:"Start scheduled source work"});
  await tasks.transition(owner,task.id,{toState:"COMPLETED",expectedVersion:2,reason:"Complete scheduled source work"});
  // A new explicitly configured rule should still ignore the completed task.
  await service.saveSchedule(owner,{...command(),kind:"TASK_REMINDER",enabled:true,localTime:"08:00",timezone:"Asia/Kolkata",audience:"OWNER",offsetDays:0,critical:false,mandatory:false});
  expect(await service.runBatch(now)).toBe(0);
 }));
 test("time report preserves persisted classifications, duration and linked estimate within its period",async()=>fixture(async({service,owner,staff,tasks,time})=>{
  const task=await tasks.create(staff,{title:"S24 time estimate source",type:"NON_PROJECT",priority:"HIGH",estimatedHours:2,targetDate:"2026-10-05",reason:"Create actual estimate source"});
  const entry=await time.manual(staff,{commandId:randomUUID(),taskId:task.id,date:"2026-10-02",durationSeconds:1800,workNote:"Persisted S24 time report evidence",location:"REMOTE",billable:true});
  const report=await service.preview(owner,{category:"time",from:"2026-10-01",to:"2026-10-05"});
  const actual=report.rows.filter(row=>row.id===entry.id);
  expect(actual).toEqual(expect.arrayContaining([expect.objectContaining({field:"duration Seconds",value:1800}),expect.objectContaining({field:"location",value:"REMOTE"}),expect.objectContaining({field:"billable",value:"Yes"})]));
  expect(report.rows.some(row=>row.id===task.id&&String(row.field).includes("estimated Hours")&&Number(row.value)===2)).toBe(true);
  expect((await service.preview(owner,{category:"time",from:"2026-10-03",to:"2026-10-05"})).rows.some(row=>row.id===entry.id)).toBe(false);
  const frozen=await service.freeze(owner,{...command(),category:"time",from:"2026-10-01",to:"2026-10-05"});
  expect((await service.snapshot(owner,frozen.snapshot.id)).table).toEqual(frozen.table);
  expect(frozen.table.rows).toEqual(report.rows);
 }));
 test("all four explicit summary periods persist actual task/time evidence and retain generation values",async()=>fixture(async({fullService,owner,staff,tasks,time,tx,staffEmployeeId})=>{
  const org=await tx.organization.findUniqueOrThrow({where:{id:owner.organizationId}});
  const now=new Date();const day=localCalendarDate(now,org.timezone);
  const completed=await tasks.create(owner,{title:"Actual completed summary work",type:"NON_PROJECT",ownerEmployeeId:staffEmployeeId,priority:"HIGH",targetDate:day,reason:"Create real summary completion source"});
  await tasks.transition(owner,completed.id,{toState:"IN_PROGRESS",expectedVersion:1,reason:"Start summary completion source"});
  const timeDates=[...new Set([day,new Date(Date.parse(day)-6*86400000).toISOString().slice(0,10),day.slice(0,7)+"-01"])],timeEntries:Array<{id:string;date:string}>=[];
  for(const date of timeDates){const entry=await time.manual(staff,{commandId:randomUUID(),taskId:completed.id,date,durationSeconds:1800,workNote:"Actual summary period time source",location:"OFFICE",billable:false});timeEntries.push({id:entry.id,date});}
  await tasks.transition(owner,completed.id,{toState:"COMPLETED",expectedVersion:2,reason:"Complete summary source"});
  const outstanding=await tasks.create(owner,{title:"Original outstanding summary work",type:"NON_PROJECT",ownerEmployeeId:staffEmployeeId,priority:"HIGH",targetDate:day,reason:"Create outstanding summary source"});
  const generated=[];
  for(const kind of ["MORNING","EVENING","WEEKLY","MONTHLY"] as const){
   const rule=await fullService.saveSchedule(owner,{...command(),kind:"SUMMARY",enabled:true,localTime:"00:00",timezone:org.timezone,audience:"OWNER",summaryKind:kind,critical:false,mandatory:false,...(kind==="WEEKLY"?{weekdays:[new Date(day+"T12:00:00Z").getUTCDay()]}:{}),...(kind==="MONTHLY"?{dayOfMonth:Number(day.slice(-2))}:{})});
   expect(await fullService.runBatch(now)).toBe(1);
   expect(await fullService.runBatch(now)).toBe(0);
   const run=await tx.dashboardRun.findFirstOrThrow({where:{sourceId:rule.id,recipientId:owner.accountId}});
   const manifest=run.manifest as unknown as {summary:{kind:string;from:string;to:string;sections:Array<{key:string;rows:Array<{id:string;value?:string;label:string}>}>}};
   expect(manifest.summary.kind).toBe(kind);expect(manifest.summary.to).toBe(day);
   const from=kind==="WEEKLY"?new Date(Date.parse(day)-6*86400000).toISOString().slice(0,10):kind==="MONTHLY"?day.slice(0,7)+"-01":day;
   expect(manifest.summary.from).toBe(from);
   expect(manifest.summary.sections.find(section=>section.key==="completed")!.rows.some(row=>row.id===completed.id)).toBe(true);
   const logged=manifest.summary.sections.find(section=>section.key==="time")!.rows;
   expect(logged.map(row=>row.id).sort()).toEqual(timeEntries.filter(entry=>entry.date>=from&&entry.date<=day).map(entry=>entry.id).sort());
   expect(logged.every(row=>row.value==="1800")).toBe(true);
   generated.push(run);
  }
  const before=await fullService.summaries(owner);expect(before.summaries).toHaveLength(4);expect(before.summaries.every((run)=>!run.summary.sections.some((section)=>section.key==="training"))).toBe(true);
  await tasks.edit(owner,outstanding.id,{title:"Changed live outstanding work",targetDate:day,priority:"HIGH",expectedVersion:1,reason:"Change summary source after generation"});
  expect(await fullService.summaries(owner)).toEqual(before);
  for(const run of generated)expect(await fullService.deliveryAuthorized(run.eventId,owner.accountId)).toBe(true);
 }),60000);
});









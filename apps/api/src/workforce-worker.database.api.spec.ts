import "reflect-metadata";
import { jest } from "@jest/globals";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AccountKind, AccountState, PermissionEffect, PermissionScopeKind, ProjectDeliveryType, ProjectStatus, Prisma } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { NotificationsService } from "./notifications.service.js";
import { WorkforceService } from "./workforce.service.js";
import { TaskService } from "./task.service.js";
import { ProjectService } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import type { RuntimeConfig } from "./config.js";
import type { ProjectActor } from "./project.service.js";

const databaseUrl = process.env.S17_DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
const webOrigin = "http://localhost:5173";
const storageRoot = fileURLToPath(new URL("../../../.env.s17-tools/s17-attendance-storage", import.meta.url));
const config: RuntimeConfig = {
  nodeEnv: "test", port: 4000,
  databaseUrl: databaseUrl ?? "postgresql://invalid:invalid@127.0.0.1/sense_s17_workforce_test",
  webOrigin, ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined, nasRoot: storageRoot
};
class FixtureRollback extends Error {}
type Person = { accountId: string; employeeId: string; actor: ProjectActor };
type Fixture = {
  organizationId: string; branchId: string; teamId: string; otherBranchId: string;
  owner: ProjectActor; manager: Person; employee: Person; outsider: Person; client: ProjectActor;
  database: DatabaseService; workforce: WorkforceService; tasks: TaskService;
};

databaseDescribe("S17 workforce worker and recovery acceptance", () => {
  let database: DatabaseService;
  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (!/(?:localhost|127\.0\.0\.1)/.test(url.hostname) || url.port !== "56433" || !url.pathname.endsWith("_test")) {
      throw new Error("S17 API acceptance requires the dedicated local port 56433 _test database");
    }
    database = new DatabaseService(config);
    await mkdir(storageRoot, { recursive: true });
    const rows = await database.prisma.$queryRaw<Array<{ name: string; records: string | null }>>`
      SELECT current_database() AS name, to_regclass('workforce_records')::text AS records`;
    if (!rows[0]?.name.endsWith("_test")) throw new Error("S17 API acceptance requires a dedicated test database");
    if (!rows[0]?.records) throw new Error("S17 workforce migrations must be deployed before PostgreSQL acceptance");
  });
  afterAll(async () => database?.onModuleDestroy());

  async function fixture(run: (value: Fixture) => Promise<void>, persist = false) {
    try {
      const execute = async (tx: Prisma.TransactionClient, rollback: boolean) => {
        const suffix = randomUUID();
        const organization = await tx.organization.findFirst() ?? await tx.organization.create({ data: { name: `S17 workforce ${suffix}` } });
        const branch = await tx.branch.create({ data: { organizationId: organization.id, name: `S17 branch ${suffix}` } });
        const team = await tx.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `S17 team ${suffix}` } });
        const otherBranch = await tx.branch.create({ data: { organizationId: organization.id, name: `S17 other ${suffix}` } });
        const otherTeam = await tx.team.create({ data: { organizationId: organization.id, branchId: otherBranch.id, name: `S17 other ${suffix}` } });
        const makePerson = async (role: string, homeBranchId: string, homeTeamId: string, reportsToId?: string | null): Promise<Person> => {
          const account = await tx.account.create({ data: { normalizedEmail: `s17-${role}-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
          const employee = await tx.employee.create({ data: { organizationId: organization.id, accountId: account.id, homeBranchId, homeTeamId, reportsToId: reportsToId ?? null, hiredAt: new Date("2026-01-01T00:00:00.000Z") } });
          return { accountId: account.id, employeeId: employee.id, actor: { accountId: account.id, organizationId: organization.id, kind: AccountKind.STAFF } };
        };
        const manager = await makePerson("manager", branch.id, team.id);
        const employee = await makePerson("employee", branch.id, team.id, manager.employeeId);
        const outsider = await makePerson("outsider", otherBranch.id, otherTeam.id);
        const ownerAccount = await tx.account.findFirst({ where: { kind: AccountKind.OWNER, state: AccountState.ACTIVE } }) ?? await tx.account.create({ data: { normalizedEmail: `s17-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
        const clientAccount = await tx.account.create({ data: { normalizedEmail: `s17-client-${suffix}@example.test`, kind: AccountKind.CLIENT, state: AccountState.ACTIVE } });
        await tx.employeePermissionOverride.create({ data: { organizationId: organization.id, employeeId: manager.employeeId, permissionKey: "workforce.manage", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.TEAM, branchId: branch.id, teamId: team.id, reason: "S17 scoped workforce manager fixture" } });
        await tx.employeePermissionOverride.create({ data: { organizationId: organization.id, employeeId: manager.employeeId, permissionKey: "task.assign", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.TEAM, branchId: branch.id, teamId: team.id, reason: "S17 scoped task assignment fixture" } });
        const db = persist ? database : { prisma: new Proxy(tx, { get(target, key) {
          if (key === "$transaction") return async (callback: (inner: Prisma.TransactionClient) => Promise<unknown>) => {
            await tx.$executeRaw`SAVEPOINT s17_workforce_command`;
            try { const result = await callback(tx); await tx.$executeRaw`RELEASE SAVEPOINT s17_workforce_command`; return result; }
            catch (error) { await tx.$executeRaw`ROLLBACK TO SAVEPOINT s17_workforce_command`; await tx.$executeRaw`RELEASE SAVEPOINT s17_workforce_command`; throw error; }
          };
          return Reflect.get(target, key, target) as unknown;
        } }) } as unknown as DatabaseService;
        const authorization = new AuthorizationService(db);
        const approvals = new ApprovalService(db);
        const notifications = new NotificationsService(db);
        const workforce = new WorkforceService(db, authorization, approvals, notifications, config);
        const tasks = new TaskService(db, authorization, approvals);
        await run({
          organizationId: organization.id, branchId: branch.id, teamId: team.id, otherBranchId: otherBranch.id,
          owner: { accountId: ownerAccount.id, organizationId: organization.id, kind: AccountKind.OWNER },
          manager, employee, outsider,
          client: { accountId: clientAccount.id, organizationId: organization.id, kind: AccountKind.CLIENT },
          database: db, workforce, tasks
        });
        if (rollback) {
          await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
          throw new FixtureRollback();
        }
      };
      if (persist) await execute(database.prisma as unknown as Prisma.TransactionClient, false);
      else await database.prisma.$transaction((tx) => execute(tx, true), { timeout: 30_000 });
    } catch (error) {
      if (!(error instanceof FixtureRollback)) throw error;
    }
  }

  const command = (reason: string) => ({ commandId: randomUUID(), reason });
  const policyInput = (branchId: string) => ({
    branchId, effectiveFrom: "2020-01-01", annualAllowanceDays: 12,
    types: [
      { key: "ANNUAL", label: "Annual leave", paid: true, consumesBalance: true, approvalLevels: ["MANAGER" as const] },
      { key: "UNPAID", label: "Unpaid leave", paid: false, consumesBalance: false, approvalLevels: ["MANAGER" as const] },
      { key: "WFH", label: "Work from home", paid: false, consumesBalance: false, approvalLevels: ["MANAGER" as const] }
    ], thresholds: { under: 50, near: 80, over: 100 }
  });
  const scheduleInput = (employeeId: string, effectiveFrom = "2020-01-01") => ({
    employeeId, effectiveFrom, effectiveTo: null, workingDays: [0, 1, 2, 3, 4, 5, 6],
    startMinute: 540, endMinute: 1080, breakMinutes: 60, dailyCapacityMinutes: 480, employmentType: "FULL_TIME" as const
  });
  async function siteFixture(f: Fixture) {
    const authorization = new AuthorizationService(f.database);
    const approvals = new ApprovalService(f.database);
    const projects = new ProjectService(f.database);
    const workflows = new ProjectWorkflowService(f.database, authorization, approvals);
    const created = await projects.create(f.owner, { branchId: f.branchId, title: `S17 site ${randomUUID()}`, deliveryType: ProjectDeliveryType.DESIGN, scopes: ["Site attendance"], reason: "Create private site evidence fixture" });
    const projectId = created.project.id;
    await f.database.prisma.employeePermissionOverride.create({ data: { organizationId: f.organizationId, employeeId: f.employee.employeeId, permissionKey: "project.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: f.branchId, reason: "Authorize assigned employee site access" } });
    await f.database.prisma.employeePermissionOverride.create({ data: { organizationId: f.organizationId, employeeId: f.manager.employeeId, permissionKey: "project.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: f.branchId, reason: "Authorize assigned manager site access" } });
    let current = await f.database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    await workflows.assignment(f.owner, projectId, { employeeId: f.employee.employeeId, expectedVersion: current.version, reason: "Assign attendance employee to site project" });
    current = await f.database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    await workflows.assignment(f.owner, projectId, { employeeId: f.manager.employeeId, expectedVersion: current.version, reason: "Assign workforce manager to site project" });
    await f.database.prisma.employeePermissionOverride.create({ data: { organizationId: f.organizationId, employeeId: f.manager.employeeId, permissionKey: "project.manage", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: f.branchId, reason: "Authorize site project lead fixture" } });
    current = await f.database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    await workflows.lead(f.owner, projectId, { employeeId: f.manager.employeeId, expectedVersion: current.version, reason: "Assign workforce manager as project lead" });
    current = await f.database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    await workflows.status(f.owner, projectId, { toStatus: ProjectStatus.ACTIVE, expectedVersion: current.version, reason: "Activate site attendance project" });
    const qrCode = `S17-SITE-${randomUUID()}`;
    const site = await f.workforce.site(f.owner, { projectId, label: "Studio site", latitude: 19.076, longitude: 72.8777, radiusMetres: 250, qrCode, ...command("Configure site location, radius and QR") });
    return { projectId, siteId: site.id, qrCode };
  }
  it("credits the configured January allowance upfront without balance-read writes", async () => {
    await fixture(async f => {
      jest.useFakeTimers({doNotFake:["nextTick","setImmediate","setTimeout","clearTimeout"]});
      jest.setSystemTime(new Date("2027-01-01T00:00:00Z"));
      try {
        await f.workforce.savePolicy(f.owner,{...policyInput(f.branchId),...command("Configure explicit annual allowance")});
        const result=await f.workforce.runScheduledEntitlements();
        expect(result.balances).toEqual(expect.arrayContaining([expect.objectContaining({employeeId:f.employee.employeeId,year:2027,annualAllowanceDays:"12"})]));
        const before=await f.database.prisma.workforceLedger.count({where:{employeeId:f.employee.employeeId,year:2027}});
        expect(before).toBeGreaterThan(0);
        await f.workforce.list(f.employee.actor,"mine","2027-01-01","2027-01-01");
        await f.workforce.runScheduledEntitlements();
        expect(await f.database.prisma.workforceLedger.count({where:{employeeId:f.employee.employeeId,year:2027}})).toBe(before);
      } finally {jest.useRealTimers();}
    },true);
  });

  it("automatically notices expiry and recovers a failed physical purge from its durable intent", async () => {
    await fixture(async f => {
      jest.useFakeTimers({doNotFake:["nextTick","setImmediate","setTimeout","clearTimeout"]});
      jest.setSystemTime(new Date("2026-10-20T12:00:00Z"));
      try {
        await f.workforce.savePolicy(f.owner,{...policyInput(f.branchId),selfieNoticeDays:2,...command("Configure Owner advance notice interval")});
        await f.workforce.saveSchedule(f.owner,{...scheduleInput(f.employee.employeeId),...command("Configure on-duty evidence schedule")});
        const site=await siteFixture(f),png=(await sharp({create:{width:2,height:2,channels:4,background:"white"}}).png().toBuffer()).toString("base64");
        const attendance=await f.workforce.checkIn(f.employee.actor,{...command("Capture private site selfie"),mode:"SITE",siteId:site.siteId,latitude:19.076,longitude:72.8777,qrCode:site.qrCode,selfie:{mime:"image/png",base64:png}});
        const selfie=await f.database.prisma.workforceSelfie.findUniqueOrThrow({where:{attendanceId:attendance.id}});
        jest.setSystemTime(new Date(selfie.expiresAt.getTime()-2*86400000));
        const notice=await f.workforce.scheduleSelfieNotices();expect(notice.notices).toBeGreaterThan(0);
        expect(await f.database.prisma.workforceSelfie.findUniqueOrThrow({where:{attendanceId:attendance.id}})).toMatchObject({noticeAt:expect.any(Date),noticeDays:2});
        expect((await f.workforce.scheduleSelfieNotices()).notices).toBe(0);
        const notices=await f.database.prisma.notification.findMany({where:{recipientAccountId:f.owner.accountId,category:"workforce.retention"}});
        expect(notices.length).toBeGreaterThan(0);
        jest.setSystemTime(new Date(selfie.expiresAt.getTime()+1000));
        const current=await f.database.prisma.workforceRecord.findUniqueOrThrow({where:{id:attendance.id}});
        const storage=await import("./nas-storage.js"),purge=jest.spyOn(storage.NasStorage.prototype,"purgeBlob").mockRejectedValueOnce(new Error("Injected private storage failure"));
        try {await expect(f.workforce.selfieRetention(f.owner,attendance.id,{...command("Purge expired and notified evidence"),expectedVersion:current.version,action:"purge"})).rejects.toThrow("Injected private storage failure");} finally {purge.mockRestore();}
        expect(await f.database.prisma.workforceSelfie.findUniqueOrThrow({where:{attendanceId:attendance.id}})).toMatchObject({purgeRequestedAt:expect.any(Date),purgedAt:null});
        await f.workforce.reconcilePurges(f.owner);
        expect(await f.database.prisma.workforceSelfie.findUniqueOrThrow({where:{attendanceId:attendance.id}})).toMatchObject({purgedAt:expect.any(Date)});
        await expect(f.workforce.selfie(f.employee.actor,attendance.id)).rejects.toMatchObject({status:404});
        expect((await f.database.prisma.workforceVersion.findMany({where:{recordId:attendance.id}})).length).toBeGreaterThanOrEqual(4);
      } finally {jest.useRealTimers();}
    },true);
  });
  it("automatically purges noticed expired evidence while a documented hold blocks deletion", async () => {
    await fixture(async f=>{
      jest.useFakeTimers({doNotFake:["nextTick","setImmediate","setTimeout","clearTimeout"]});jest.setSystemTime(new Date("2026-11-01T12:00:00Z"));
      try {
        await f.workforce.savePolicy(f.owner,{...policyInput(f.branchId),selfieNoticeDays:1,...command("Configure automatic expiry notice")});
        await f.workforce.saveSchedule(f.owner,{...scheduleInput(f.employee.employeeId),...command("Configure site duty")});
        const site=await siteFixture(f),png=(await sharp({create:{width:2,height:2,channels:4,background:"white"}}).png().toBuffer()).toString("base64");
        const row=await f.workforce.checkIn(f.employee.actor,{...command("Capture automatically expiring evidence"),mode:"SITE",siteId:site.siteId,latitude:19.076,longitude:72.8777,qrCode:site.qrCode,selfie:{mime:"image/png",base64:png}});
        const selfie=await f.database.prisma.workforceSelfie.findUniqueOrThrow({where:{attendanceId:row.id}});
        jest.setSystemTime(new Date(selfie.expiresAt.getTime()-86400000));await f.workforce.scheduleSelfieNotices();
        let current=await f.database.prisma.workforceRecord.findUniqueOrThrow({where:{id:row.id}});
        const held=await f.workforce.selfieRetention(f.owner,row.id,{...command("Document dispute hold"),expectedVersion:current.version,action:"hold"});
        jest.setSystemTime(new Date(selfie.expiresAt.getTime()+1000));await f.workforce.purgeExpiredSelfies();
        expect(await f.database.prisma.workforceSelfie.findUniqueOrThrow({where:{attendanceId:row.id}})).toMatchObject({purgedAt:null,holdReason:"Document dispute hold"});
        await f.workforce.selfieRetention(f.owner,row.id,{...command("Release resolved dispute hold"),expectedVersion:held.version,action:"release"});
        await f.workforce.purgeExpiredSelfies();
        expect(await f.database.prisma.workforceSelfie.findUniqueOrThrow({where:{attendanceId:row.id}})).toMatchObject({purgedAt:expect.any(Date)});
        current=await f.database.prisma.workforceRecord.findUniqueOrThrow({where:{id:row.id}});expect(current.kind).toBe("ATTENDANCE");
        await expect(f.workforce.selfie(f.employee.actor,row.id)).rejects.toMatchObject({status:404});
      } finally {jest.useRealTimers();}
    },true);
  });
});

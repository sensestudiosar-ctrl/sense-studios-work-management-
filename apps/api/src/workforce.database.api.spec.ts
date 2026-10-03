import "reflect-metadata";
import { jest } from "@jest/globals";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AccountKind, AccountState, PermissionEffect, PermissionScopeKind, ProjectDeliveryType, ProjectStatus, TaskPriority, TaskType, Prisma } from "./generated/prisma/client.js";
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

databaseDescribe("S17 workforce PostgreSQL acceptance", () => {
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
        const tasks = new TaskService(db, authorization, approvals, workforce);
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

  const futureDate = () => new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
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

  it("requires Owner policy setup, persists effective schedules and returns employee-scoped capacity", async () => {
    await fixture(async (f) => {
      const date = futureDate();
      await expect(f.workforce.leave(f.employee.actor, { ...command("Request before leave setup"), typeKey: "ANNUAL", days: [{ date, portion: "FULL" }], emergency: false })).rejects.toMatchObject({ status: 409 });
      await expect(f.workforce.savePolicy(f.manager.actor, { ...policyInput(f.branchId), ...command("Staff cannot configure policy") })).rejects.toMatchObject({ status: 403 });

      const policy = await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), ...command("Configure explicit annual leave and thresholds") });
      const schedule = await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId), ...command("Set explicit employee capacity") });
      expect(policy).toMatchObject({ kind: "POLICY", version: 1, branchId: f.branchId });
      expect(schedule).toMatchObject({ kind: "SCHEDULE", version: 1, employeeId: f.employee.employeeId });
      const storedPolicy = await f.database.prisma.workforceRecord.findUniqueOrThrow({ where: { id: policy.id } });
      const storedSchedule = await f.database.prisma.workforceRecord.findUniqueOrThrow({ where: { id: schedule.id } });
      expect(storedPolicy.data).toMatchObject({ annualAllowanceDays: 12, thresholds: { under: 50, near: 80, over: 100 } });
      expect(storedSchedule.data).toMatchObject({ dailyCapacityMinutes: 480, workingDays: [0, 1, 2, 3, 4, 5, 6] });
      expect(await f.database.prisma.workforceVersion.count({ where: { recordId: policy.id } })).toBe(1);
      expect(await f.database.prisma.workforceVersion.count({ where: { recordId: schedule.id } })).toBe(1);

      const own = await f.workforce.list(f.employee.actor, "mine", date, date);
      expect(own.workload).toEqual([expect.objectContaining({ employeeId: f.employee.employeeId, date, scheduledMinutes: 480, leaveMinutes: 0, allocatedMinutes: 0, availableMinutes: 480 })]);
      const managed = await f.workforce.list(f.manager.actor, "managed", date, date);
      expect(managed.workload.map((row) => row.employeeId)).toContain(f.employee.employeeId);
      expect(managed.workload.map((row) => row.employeeId)).not.toContain(f.outsider.employeeId);
      await expect(f.workforce.list(f.client, "mine", date, date)).rejects.toMatchObject({ status: 403 });
    });
  });

  it("applies dated part-time overrides and branch holidays to daily and weekly workload", async () => {
    await fixture(async (f) => {
      const date = futureDate();
      const nextDate = new Date(`${date}T00:00:00.000Z`);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      const holidayDate = nextDate.toISOString().slice(0, 10);
      const weekEnd = new Date(`${date}T00:00:00.000Z`);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
      await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), ...command("Configure workload thresholds") });
      const regular = await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId), ...command("Set full-time baseline schedule") });
      const override = await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId, date), effectiveTo: date, employmentType: "PART_TIME", dailyCapacityMinutes: 240, ...command("Set dated part-time schedule override") }, true);
      const holiday = await f.workforce.holiday(f.owner, { branchId: f.branchId, date: holidayDate, label: "Studio closure", ...command("Record Branch holiday") });
      expect(regular).toMatchObject({ kind: "SCHEDULE", version: 1 });
      expect(override).toMatchObject({ kind: "OVERRIDE", version: 1, employeeId: f.employee.employeeId });
      expect(holiday).toMatchObject({ kind: "HOLIDAY", branchId: f.branchId });

      const daily = await f.workforce.list(f.employee.actor, "mine", date, date);
      expect(daily.workload[0]).toMatchObject({ scheduledMinutes: 240, availableMinutes: 240, category: "Under-utilized" });
      const weekly = await f.workforce.list(f.employee.actor, "mine", date, weekEnd.toISOString().slice(0, 10));
      expect(weekly.workload).toHaveLength(7);
      expect(weekly.workload.find((row) => row.date === date)).toMatchObject({ scheduledMinutes: 240 });
      expect(weekly.workload.find((row) => row.date === holidayDate)).toMatchObject({ scheduledMinutes: 0, availableMinutes: 0 });
      expect(await f.database.prisma.workforceRecord.count({ where: { employeeId: f.employee.employeeId, kind: { in: ["SCHEDULE", "OVERRIDE"] } } })).toBe(2);
    });
  });

  it("charges half-day leave in schedule minutes and keeps approved WFH out of leave balance and capacity", async () => {
    await fixture(async (f) => {
      const halfDay = futureDate();
      const wfhDate = new Date(`${halfDay}T00:00:00.000Z`);
      wfhDate.setUTCDate(wfhDate.getUTCDate() + 1);
      const wfh = wfhDate.toISOString().slice(0, 10);
      await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), ...command("Configure annual and WFH types") });
      await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId), ...command("Set explicit half-day basis") });
      const half = await f.workforce.leave(f.employee.actor, { ...command("Request half-day annual leave"), typeKey: "ANNUAL", days: [{ date: halfDay, portion: "HALF" }], emergency: false });
      expect((half.data as { days: Array<{ minutes: number; days: string }> }).days).toEqual([expect.objectContaining({ minutes: 240, days: "0.5" })]);
      const approvedHalf = await f.workforce.decide(f.manager.actor, half.id, { ...command("Approve half-day annual leave"), expectedVersion: half.version, outcome: "APPROVED" });
      expect(approvedHalf.state).toBe("APPROVED");
      const debit = await f.database.prisma.workforceLedger.findFirstOrThrow({ where: { employeeId: f.employee.employeeId, year: Number(halfDay.slice(0, 4)), kind: "DEBIT", data: { path: ["recordId"], equals: half.id } } });
      expect(Number(debit.days)).toBe(-0.5);
      const halfCapacity = await f.workforce.list(f.employee.actor, "mine", halfDay, halfDay);
      expect(halfCapacity.workload[0]).toMatchObject({ scheduledMinutes: 480, leaveMinutes: 240, availableMinutes: 240 });

      const request = await f.workforce.leave(f.employee.actor, { ...command("Request WFH without leave debit"), typeKey: "WFH", days: [{ date: wfh, portion: "FULL" }], emergency: false });
      await f.workforce.decide(f.manager.actor, request.id, { ...command("Approve WFH attendance arrangement"), expectedVersion: request.version, outcome: "APPROVED" });
      expect(await f.database.prisma.workforceLedger.count({ where: { employeeId: f.employee.employeeId, year: Number(wfh.slice(0, 4)), data: { path: ["recordId"], equals: request.id } } })).toBe(0);
      const wfhCapacity = await f.workforce.list(f.employee.actor, "mine", wfh, wfh);
      expect(wfhCapacity.workload[0]).toMatchObject({ scheduledMinutes: 480, leaveMinutes: 0, availableMinutes: 480 });
    });
  });

  it("routes a configured multilevel unpaid leave through distinct Manager and Owner decisions", async () => {
    await fixture(async (f) => {
      const date = futureDate();
      const policy = policyInput(f.branchId);
      const types = policy.types.map((type) => type.key === "UNPAID" ? { ...type, approvalLevels: ["MANAGER", "OWNER"] as Array<"MANAGER" | "OWNER"> } : type);
      await f.workforce.savePolicy(f.owner, { ...policy, types, ...command("Configure multilevel unpaid leave routing") });
      await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId), ...command("Set unpaid leave capacity") });
      const requested = await f.workforce.leave(f.employee.actor, { ...command("Request unpaid leave with two configured approvers"), typeKey: "UNPAID", days: [{ date, portion: "FULL" }], emergency: false });
      const managerDecision = await f.workforce.decide(f.manager.actor, requested.id, { ...command("Complete first configured approval level"), expectedVersion: requested.version, outcome: "APPROVED" });
      expect(managerDecision).toMatchObject({ state: "PENDING", version: 4 });
      await expect(f.workforce.decide(f.manager.actor, requested.id, { ...command("Manager cannot make the Owner decision"), expectedVersion: managerDecision.version, outcome: "APPROVED" })).rejects.toMatchObject({ status: 403 });
      const ownerDecision = await f.workforce.decide(f.owner, requested.id, { ...command("Complete separate Owner approval level"), expectedVersion: managerDecision.version, outcome: "APPROVED" });
      expect(ownerDecision).toMatchObject({ state: "APPROVED", version: 5 });
      const approvals = await f.database.prisma.approvalRequest.findMany({ where: { sourceId: requested.id }, orderBy: { approvalLevel: "asc" } });
      expect(approvals).toHaveLength(2);
      expect(approvals.map((approval) => approval.approvalLevel)).toEqual(["MANAGER", "OWNER"]);
      expect(await f.database.prisma.approvalDecision.count({ where: { requestId: { in: approvals.map((approval) => approval.id) }, outcome: "APPROVED" } })).toBe(2);
    });
  });

  it("prorates leap-year entitlement across hire date and Branch transfer, then caps carry-forward at five days", async () => {
    await fixture(async (f) => {
      const employee = await f.database.prisma.employee.update({ where: { id: f.employee.employeeId }, data: { hiredAt: new Date("2024-04-01T00:00:00.000Z"), homeBranchId: f.otherBranchId, homeTeamId: (await f.database.prisma.team.findFirstOrThrow({ where: { branchId: f.otherBranchId } })).id, reportsToId: null } });
      const otherTeam = await f.database.prisma.team.findFirstOrThrow({ where: { branchId: f.otherBranchId } });
      const transferDate = new Date("2024-07-01T00:00:00.000Z");
      await f.database.prisma.employeeMembershipHistory.createMany({ data: [
        { organizationId: f.organizationId, employeeId: employee.id, branchId: f.branchId, teamId: f.teamId, effectiveFrom: new Date("2024-04-01T00:00:00.000Z"), effectiveTo: transferDate, recordedById: f.owner.accountId, reason: "Record initial membership for proration fixture" },
        { organizationId: f.organizationId, employeeId: employee.id, branchId: f.otherBranchId, teamId: otherTeam.id, effectiveFrom: transferDate, effectiveTo: null, recordedById: f.owner.accountId, reason: "Record Branch transfer for proration fixture" }
      ] });
      await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), effectiveFrom: "2024-01-01", annualAllowanceDays: 12, ...command("Set first Branch annual allowance") });
      await f.workforce.savePolicy(f.owner, { ...policyInput(f.otherBranchId), effectiveFrom: "2024-01-01", annualAllowanceDays: 24, ...command("Set receiving Branch annual allowance") });

      await f.workforce.syncEntitlements(f.owner, 2024);
      const leapYear = await f.workforce.list(f.owner, "managed", "2024-01-01", "2024-12-31");
      expect(leapYear.workload.filter((row) => row.employeeId === employee.id)).toHaveLength(366);
      const leapBalance = leapYear.balances.find((row) => row.employeeId === employee.id && row.year === 2024);
      const prorated = (12 * 91 + 24 * 184) / 366;
      expect(Number(leapBalance?.remainingDays)).toBeCloseTo(prorated, 7);
      const credit = await f.database.prisma.workforceLedger.findFirstOrThrow({ where: { employeeId: employee.id, year: 2024, kind: "GRANT" } });
      expect(Number(credit.days)).toBeCloseTo(prorated, 7);

      await f.workforce.syncEntitlements(f.owner, 2025);
      const nextYear = await f.workforce.list(f.owner, "managed", "2025-01-01", "2025-01-01");
      const carried = nextYear.balances.find((row) => row.employeeId === employee.id && row.year === 2025);
      expect(Number(carried?.remainingDays)).toBeCloseTo(29, 7);
      const carryEntry = await f.database.prisma.workforceLedger.findFirstOrThrow({ where: { employeeId: employee.id, year: 2025, kind: "CARRY" } });
      expect(Number(carryEntry.days)).toBe(5);
      expect(carryEntry.data).toMatchObject({ expiresOn: "2025-12-31" });
    });
  }, 30_000);

  it("requires configured approval, keeps pending leave out of the debit ledger, then preserves approval and reversal history", async () => {
    await fixture(async (f) => {
      const date = futureDate();
      await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), ...command("Configure annual leave policy") });
      await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId), ...command("Set employee schedule") });
      const requested = await f.workforce.leave(f.employee.actor, { ...command("Request one future annual leave day"), typeKey: "ANNUAL", days: [{ date, portion: "FULL" }], emergency: false });
      expect(requested).toMatchObject({ kind: "LEAVE", state: "PENDING", version: 2, employeeId: f.employee.employeeId });
      expect(await f.database.prisma.workforceLedger.count({ where: { employeeId: f.employee.employeeId, kind: "DEBIT" } })).toBe(0);
      expect(await f.database.prisma.approvalRequest.count({ where: { sourceId: requested.id, state: "PENDING" } })).toBe(1);

      const approved = await f.workforce.decide(f.manager.actor, requested.id, { ...command("Approve the requested leave"), expectedVersion: requested.version, outcome: "APPROVED" });
      expect(approved).toMatchObject({ state: "APPROVED", version: 3 });
      const debit = await f.database.prisma.workforceLedger.findMany({ where: { employeeId: f.employee.employeeId, kind: "DEBIT" } });
      expect(debit).toHaveLength(1);
      expect(Number(debit[0]!.days)).toBe(-1);
      const balanceBeforeCancel = await f.database.prisma.workforceLedger.aggregate({ where: { employeeId: f.employee.employeeId, year: Number(date.slice(0, 4)) }, _sum: { days: true } });
      expect(Number(balanceBeforeCancel._sum.days)).toBe(11);

      await expect(f.workforce.cancel(f.employee.actor, approved.id, { ...command("Reject cancellation of historical leave"), expectedVersion: approved.version, dates: ["2000-01-01"] })).rejects.toMatchObject({ status: 409 });
      const cancellation = await f.workforce.cancel(f.employee.actor, approved.id, { ...command("Request cancellation of unused future leave"), expectedVersion: approved.version, dates: [date] });
      expect(cancellation).toMatchObject({ state: "CANCEL_PENDING", version: 5 });
      const ledgerWhilePending = await f.database.prisma.workforceLedger.aggregate({ where: { employeeId: f.employee.employeeId, year: Number(date.slice(0, 4)) }, _sum: { days: true } });
      expect(Number(ledgerWhilePending._sum.days)).toBe(11);
      const final = await f.workforce.decide(f.manager.actor, cancellation.id, { ...command("Approve same-level reversal of unused leave"), expectedVersion: cancellation.version, outcome: "APPROVED" }, true);
      expect(final).toMatchObject({ state: "APPROVED", version: 6 });
      const history = await f.database.prisma.workforceVersion.findMany({ where: { recordId: requested.id }, orderBy: { version: "asc" } });
      expect(history.map((row) => row.state)).toEqual(["PENDING", "PENDING", "APPROVED", "CANCEL_PENDING", "CANCEL_PENDING", "APPROVED"]);
      const ledger = await f.database.prisma.workforceLedger.findMany({ where: { employeeId: f.employee.employeeId, year: Number(date.slice(0, 4)), kind: { in: ["DEBIT", "REVERSAL"] } }, orderBy: { kind: "asc" } });
      expect(ledger).toHaveLength(2);
      expect(ledger.map((row) => Number(row.days)).sort((a, b) => a - b)).toEqual([-1, 1]);
      const balanceAfterCancel = await f.database.prisma.workforceLedger.aggregate({ where: { employeeId: f.employee.employeeId, year: Number(date.slice(0, 4)) }, _sum: { days: true } });
      expect(Number(balanceAfterCancel._sum.days)).toBe(12);
    });
  });

  it("preserves an earlier reversal while separately cancelling each future leave date", async () => {
    await fixture(async (f) => {
      const firstDate = futureDate();
      const secondDate = new Date(Date.parse(`${firstDate}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
      await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), ...command("Configure annual leave for repeated partial cancellation") });
      await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId), ...command("Set schedule for two future leave dates") });
      const requested = await f.workforce.leave(f.employee.actor, { ...command("Request two future annual leave dates"), typeKey: "ANNUAL", days: [{ date: firstDate, portion: "FULL" }, { date: secondDate, portion: "FULL" }], emergency: false });
      const approved = await f.workforce.decide(f.manager.actor, requested.id, { ...command("Approve both future leave dates"), expectedVersion: requested.version, outcome: "APPROVED" });
      const year = Number(firstDate.slice(0, 4));
      const firstCancel = await f.workforce.cancel(f.employee.actor, approved.id, { ...command("Request cancellation of the first future date"), expectedVersion: approved.version, dates: [firstDate] });
      const firstDecision = await f.workforce.decide(f.manager.actor, firstCancel.id, { ...command("Approve first-date reversal"), expectedVersion: firstCancel.version, outcome: "APPROVED" }, true);
      expect(firstDecision.state).toBe("APPROVED");
      const ledgerAfterFirst = await f.database.prisma.workforceLedger.aggregate({ where: { employeeId: f.employee.employeeId, year }, _sum: { days: true } });
      expect(Number(ledgerAfterFirst._sum.days)).toBe(11);

      const secondCancel = await f.workforce.cancel(f.employee.actor, firstDecision.id, { ...command("Request cancellation of the remaining future date"), expectedVersion: firstDecision.version, dates: [secondDate] });
      expect(secondCancel.state).toBe("CANCEL_PENDING");
      const ledgerDuringSecondPending = await f.database.prisma.workforceLedger.aggregate({ where: { employeeId: f.employee.employeeId, year }, _sum: { days: true } });
      expect(Number(ledgerDuringSecondPending._sum.days)).toBe(11);
      const secondDecision = await f.workforce.decide(f.manager.actor, secondCancel.id, { ...command("Approve second-date reversal"), expectedVersion: secondCancel.version, outcome: "APPROVED" }, true);
      expect(secondDecision.state).toBe("APPROVED");
      const ledgerAfterSecond = await f.database.prisma.workforceLedger.aggregate({ where: { employeeId: f.employee.employeeId, year }, _sum: { days: true } });
      expect(Number(ledgerAfterSecond._sum.days)).toBe(12);
      const reversals = await f.database.prisma.workforceLedger.findMany({ where: { employeeId: f.employee.employeeId, year, kind: "REVERSAL" } });
      expect(reversals).toHaveLength(2);
      expect(reversals.map((row) => Number(row.days)).sort()).toEqual([1, 1]);
    });
  });

  it("consumes prior-year carry before annual allowance and retains its source and expiry snapshot", async () => {
    await fixture(async (f) => {
      await f.database.prisma.employee.update({ where: { id: f.employee.employeeId }, data: { hiredAt: new Date("2020-01-01T00:00:00.000Z") } });
      await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), effectiveFrom: "2020-01-01", annualAllowanceDays: 12, ...command("Configure allowance for carry source acceptance") });
      await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId), ...command("Set schedule for carry-first leave") });
      await f.workforce.syncEntitlements(f.owner, 2025);
      await f.workforce.syncEntitlements(f.owner, 2026);
      const carry = await f.database.prisma.workforceLedger.findFirstOrThrow({ where: { employeeId: f.employee.employeeId, year: 2026, kind: "CARRY" } });
      expect(Number(carry.days)).toBe(5);
      expect(carry.data).toMatchObject({ sourceYear: 2025, expiresOn: "2026-12-31", consumptionOrder: "CARRY_FIRST" });

      const date = futureDate();
      const requested = await f.workforce.leave(f.employee.actor, { ...command("Request annual leave against carry first"), typeKey: "ANNUAL", days: [{ date, portion: "FULL" }], emergency: false });
      const approved = await f.workforce.decide(f.manager.actor, requested.id, { ...command("Approve carry-first annual leave"), expectedVersion: requested.version, outcome: "APPROVED" });
      expect(approved.state).toBe("APPROVED");
      const debit = await f.database.prisma.workforceLedger.findFirstOrThrow({ where: { employeeId: f.employee.employeeId, year: 2026, kind: "DEBIT", data: { path: ["recordId"], equals: requested.id } } });
      expect(debit.data).toMatchObject({
        date,
        carryPortion: { numerator: "1", denominator: "1" },
        annualPortion: { numerator: "0", denominator: "1" },
        carrySourceYear: 2025,
        carryExpiresOn: "2026-12-31",
        consumptionOrder: "CARRY_FIRST"
      });
    });
  });

  it("expires unused prior carry instead of carrying it again while preserving unused annual allowance", async () => {
    await fixture(async (f) => {
      jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "setTimeout", "clearTimeout"] });
      jest.setSystemTime(new Date("2025-01-01T12:00:00.000Z"));
      try {
        await f.database.prisma.employee.update({ where: { id: f.employee.employeeId }, data: { hiredAt: new Date("2020-01-01T00:00:00.000Z") } });
        await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), effectiveFrom: "2020-01-01", annualAllowanceDays: 6, ...command("Set prior-year grant for carry expiry") });
        await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), effectiveFrom: "2025-01-01", annualAllowanceDays: 4, ...command("Set lower annual grant after prior carry") });
        await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId), ...command("Set schedule for carry expiry case") });
        await f.workforce.syncEntitlements(f.owner, 2024);
        await f.workforce.syncEntitlements(f.owner, 2025);
        const oldCarry = await f.database.prisma.workforceLedger.findFirstOrThrow({ where: { employeeId: f.employee.employeeId, year: 2025, kind: "CARRY" } });
        expect(Number(oldCarry.days)).toBe(5);

        const dates = ["2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05"];
        const requested = await f.workforce.leave(f.employee.actor, { ...command("Use four days from old carry before annual grant"), typeKey: "ANNUAL", days: dates.map((date) => ({ date, portion: "FULL" })), emergency: false });
        const approved = await f.workforce.decide(f.manager.actor, requested.id, { ...command("Approve four carry-first days"), expectedVersion: requested.version, outcome: "APPROVED" });
        expect(approved.state).toBe("APPROVED");
        const debits = await f.database.prisma.workforceLedger.findMany({ where: { employeeId: f.employee.employeeId, year: 2025, kind: "DEBIT" }, orderBy: { createdAt: "asc" } });
        expect(debits).toHaveLength(4);
        expect(debits.every((row) => (row.data as { carryPortion?: { numerator?: string } }).carryPortion?.numerator === "1")).toBe(true);

        jest.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
        await f.workforce.syncEntitlements(f.owner, 2026);
        const nextCarry = await f.database.prisma.workforceLedger.findFirstOrThrow({ where: { employeeId: f.employee.employeeId, year: 2026, kind: "CARRY" } });
        expect(Number(nextCarry.days)).toBe(4);
        expect(nextCarry.data).toMatchObject({ sourceYear: 2025, expiresOn: "2026-12-31", consumptionOrder: "CARRY_FIRST" });
      } finally {
        jest.useRealTimers();
      }
    });
  }, 30000);

  it("keeps next-year allowance and carry projected until January 1 and finalizes carry after prior-year leave settles", async () => {
    await fixture(async (f) => {
      jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "setTimeout", "clearTimeout"] });
      jest.setSystemTime(new Date("2025-10-01T12:00:00.000Z"));
      try {
        await f.database.prisma.employee.update({ where: { id: f.employee.employeeId }, data: { hiredAt: new Date("2020-01-01T00:00:00.000Z") } });
        await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), effectiveFrom: "2020-01-01", annualAllowanceDays: 10, ...command("Configure allowance for provisional carry boundary regression") });
        await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), effectiveFrom: "2026-01-01", annualAllowanceDays: 4, ...command("Set a lower upcoming allowance so the request requires projected carry") });
        await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId), ...command("Set schedule for provisional carry boundary regression") });
        await f.workforce.syncEntitlements(f.owner, 2025);

        const projection = (await f.workforce.syncEntitlements(f.owner, 2026)).balances.find((balance) => balance.employeeId === f.employee.employeeId)!;
        expect(projection.entitlementFinalized).toBe(false);
        expect(projection.annualAllowanceDays).toBe("4");
        expect(Number(projection.carryForwardDays)).toBe(5);
        expect(await f.database.prisma.workforceLedger.findMany({ where: { employeeId: f.employee.employeeId, year: 2026, kind: { in: ["GRANT", "ADJUSTMENT", "CARRY"] } } })).toHaveLength(0);

        const nextYearDates = ["2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05", "2026-01-06", "2026-01-07"];
        const futureRequest = await f.workforce.leave(f.employee.actor, { ...command("Request leave in the next unfinalized year"), typeKey: "ANNUAL", days: nextYearDates.map((date) => ({ date, portion: "FULL" })), emergency: false });
        await expect(f.workforce.decide(f.manager.actor, futureRequest.id, { ...command("Try approval before the leave year begins"), expectedVersion: futureRequest.version, outcome: "APPROVED" })).rejects.toMatchObject({ status: 409 });
        expect((await f.database.prisma.workforceRecord.findUniqueOrThrow({ where: { id: futureRequest.id } })).state).toBe("PENDING");

        const priorYearDates = Array.from({ length: 8 }, (_, index) => new Date(Date.parse("2025-10-02T00:00:00.000Z") + index * 86_400_000).toISOString().slice(0, 10));
        const priorYearRequest = await f.workforce.leave(f.employee.actor, { ...command("Use eight days before the carry source year closes"), typeKey: "ANNUAL", days: priorYearDates.map((date) => ({ date, portion: "FULL" })), emergency: false });
        const priorYearApproved = await f.workforce.decide(f.manager.actor, priorYearRequest.id, { ...command("Approve prior-year leave before carry finalization"), expectedVersion: priorYearRequest.version, outcome: "APPROVED" });
        expect(priorYearApproved.state).toBe("APPROVED");

        jest.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
        const finalized = (await f.workforce.syncEntitlements(f.owner, 2026)).balances.find((balance) => balance.employeeId === f.employee.employeeId)!;
        expect(finalized.entitlementFinalized).toBe(true);
        expect(finalized.carryForwardDays).toBe("2");
        const approved = await f.workforce.decide(f.manager.actor, futureRequest.id, { ...command("Approve after Jan 1 finalized unused carry"), expectedVersion: futureRequest.version, outcome: "APPROVED" });
        expect(approved.state).toBe("APPROVED");
        const debits = await f.database.prisma.workforceLedger.findMany({ where: { employeeId: f.employee.employeeId, year: 2026, kind: "DEBIT" }, orderBy: { createdAt: "asc" } });
        expect(debits).toHaveLength(6);
        expect(debits.slice(0, 2).every((row) => (row.data as { carryPortion?: { numerator?: string } }).carryPortion?.numerator === "1")).toBe(true);
        expect(debits.slice(2).every((row) => (row.data as { annualPortion?: { numerator?: string } }).annualPortion?.numerator === "1")).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });
  }, 30000);

  it("appends a carry correction when prior-year leave is approved late and exposes the resulting deficit", async () => {
    await fixture(async (f) => {
      jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "setTimeout", "clearTimeout"] });
      jest.setSystemTime(new Date("2025-10-01T12:00:00.000Z"));
      try {
        await f.database.prisma.employee.update({ where: { id: f.employee.employeeId }, data: { hiredAt: new Date("2020-01-01T00:00:00.000Z") } });
        await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), effectiveFrom: "2020-01-01", annualAllowanceDays: 10, ...command("Configure annual entitlement for late carry correction regression") });
        await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), effectiveFrom: "2026-01-01", annualAllowanceDays: 4, ...command("Configure lower next-year allowance for late carry correction regression") });
        await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId), ...command("Set schedule for late carry correction regression") });
        await f.workforce.syncEntitlements(f.owner, 2025);

        const priorDates = Array.from({ length: 8 }, (_, index) => new Date(Date.parse("2025-12-10T00:00:00.000Z") + index * 86_400_000).toISOString().slice(0, 10));
        const lateRequest = await f.workforce.leave(f.employee.actor, { ...command("Request eight prior-year leave days awaiting late approval"), typeKey: "ANNUAL", days: priorDates.map((date) => ({ date, portion: "FULL" })), emergency: false });
        expect(lateRequest.state).toBe("PENDING");

        jest.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
        await f.workforce.syncEntitlements(f.owner, 2026);
        const currentYearDates = Array.from({ length: 9 }, (_, index) => new Date(Date.parse("2026-01-02T00:00:00.000Z") + index * 86_400_000).toISOString().slice(0, 10));
        const currentYearRequest = await f.workforce.leave(f.employee.actor, { ...command("Request all finalized carry and annual allowance"), typeKey: "ANNUAL", days: currentYearDates.map((date) => ({ date, portion: "FULL" })), emergency: false });
        const currentYearApproved = await f.workforce.decide(f.manager.actor, currentYearRequest.id, { ...command("Use five carry and four annual days before late prior-year approval"), expectedVersion: currentYearRequest.version, outcome: "APPROVED" });
        expect(currentYearApproved.state).toBe("APPROVED");

        const lateApproved = await f.workforce.decide(f.manager.actor, lateRequest.id, { ...command("Approve prior-year leave after carry finalization"), expectedVersion: lateRequest.version, outcome: "APPROVED" });
        expect(lateApproved.state).toBe("APPROVED");
        const carryRows = (await f.database.prisma.workforceLedger.findMany({ where: { employeeId: f.employee.employeeId, year: 2026, kind: { in: ["CARRY", "ADJUSTMENT"] } }, orderBy: { createdAt: "asc" } })).filter((row) => row.kind === "CARRY" || (row.data as { carryAdjustment?: boolean }).carryAdjustment === true);
        expect(carryRows).toHaveLength(2);
        const baseCarry = carryRows.find((row) => row.kind === "CARRY");
        const carryCorrection = carryRows.find((row) => row.kind === "ADJUSTMENT" && (row.data as { carryAdjustment?: boolean }).carryAdjustment === true);
        expect(Number(baseCarry?.days)).toBe(5);
        expect(Number(carryCorrection?.days)).toBe(-3);
        expect(carryCorrection?.kind).toBe("ADJUSTMENT");
        expect(carryCorrection?.data).toMatchObject({ carryAdjustment: true, sourceYear: 2025, reconciliation: true, previousCarry: { numerator: "5", denominator: "1" }, targetCarry: { numerator: "2", denominator: "1" } });

        const balance = (await f.workforce.syncEntitlements(f.owner, 2026)).balances.find((row) => row.employeeId === f.employee.employeeId)!;
        expect(balance.remainingDays).toBe("-3");
        const reconciledRows = await f.database.prisma.workforceLedger.findMany({ where: { employeeId: f.employee.employeeId, year: 2026 } });
        const annualRows = reconciledRows.filter((row) => row.kind === "GRANT" || row.kind === "ADJUSTMENT" && (row.data as { carryAdjustment?: boolean }).carryAdjustment !== true);
        expect(annualRows.reduce((total, row) => total + Number(row.days), 0)).toBe(4);
        await f.workforce.syncEntitlements(f.owner, 2026);
        const repeatedRows = await f.database.prisma.workforceLedger.findMany({ where: { employeeId: f.employee.employeeId, year: 2026 } });
        expect(repeatedRows.map((row) => row.id).sort()).toEqual(reconciledRows.map((row) => row.id).sort());
        await expect(f.workforce.leave(f.employee.actor, { ...command("Reject new paid leave while retroactive carry correction leaves a deficit"), typeKey: "ANNUAL", days: [{ date: "2026-01-11", portion: "FULL" }], emergency: false })).rejects.toMatchObject({ status: 409 });
      } finally {
        jest.useRealTimers();
      }
    });
  }, 30000);

  it("shows critical allocation suggestions and notices only to authorized workforce recipients", async () => {
    await fixture(async (f) => {
      const date = futureDate();
      const peerAccount = await f.database.prisma.account.create({ data: { normalizedEmail: `s17-peer-${randomUUID()}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
      const peer = await f.database.prisma.employee.create({ data: { organizationId: f.organizationId, accountId: peerAccount.id, homeBranchId: f.branchId, homeTeamId: f.teamId, reportsToId: f.manager.employeeId, hiredAt: new Date("2020-01-01T00:00:00.000Z") } });
      await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), ...command("Configure leave for critical workload impact") });
      await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId), ...command("Set allocated employee capacity") });
      await f.workforce.saveSchedule(f.owner, { ...scheduleInput(peer.id), ...command("Set scoped peer suggestion capacity") });
      const task = await f.tasks.create(f.manager.actor, { title: `S17 critical capacity task ${randomUUID()}`, type: TaskType.NON_PROJECT, priority: TaskPriority.CRITICAL, targetDate: date, reason: "Create a critical allocated task for workforce impact", ownerEmployeeId: f.employee.employeeId });
      await f.workforce.allocate(f.manager.actor, { ...command("Acknowledge and allocate the full scheduled capacity"), taskId: task.id, employeeId: f.employee.employeeId, date, minutes: 480, acknowledgeOverload: true });
      const request = await f.workforce.leave(f.employee.actor, { ...command("Request leave affecting critical allocated work"), typeKey: "ANNUAL", days: [{ date, portion: "FULL" }], emergency: false });
      const approved = await f.workforce.decide(f.manager.actor, request.id, { ...command("Approve critical-task leave impact"), expectedVersion: request.version, outcome: "APPROVED" });

      const managerList = await f.workforce.list(f.manager.actor, "managed", date, date);
      const managerLeave = managerList.leaves.find((leave) => leave.id === approved.id);
      expect(managerLeave?.impacts).toEqual(expect.arrayContaining([
        expect.objectContaining({ taskId: task.id, critical: true, suggestions: expect.arrayContaining([expect.objectContaining({ employeeId: peer.id, label: peerAccount.normalizedEmail })]) })
      ]));
      const employeeList = await f.workforce.list(f.employee.actor, "mine", date, date);
      const employeeLeave = employeeList.leaves.find((leave) => leave.id === approved.id);
      expect(employeeLeave?.impacts).toEqual(expect.arrayContaining([expect.objectContaining({ taskId: task.id, critical: true, suggestions: [] })]));
      expect(JSON.stringify(employeeLeave?.impacts)).not.toContain(peerAccount.normalizedEmail);

      const approvedVersion = await f.database.prisma.workforceVersion.findFirstOrThrow({ where: { recordId: approved.id, version: approved.version } });
      const managerNotice = await f.database.prisma.notification.findFirstOrThrow({ where: { eventId: approvedVersion.eventId, recipientAccountId: f.manager.accountId, category: "workforce.impact" } });
      expect(managerNotice).toMatchObject({ critical: true, mandatory: true });
      expect(await f.database.prisma.notification.count({ where: { eventId: approvedVersion.eventId, recipientAccountId: f.outsider.accountId, category: "workforce.impact" } })).toBe(0);
    });
  });

  it("records valid and provisional site attendance and keeps selfie storage private through controlled retention", async () => {
    await fixture(async (f) => {
      const initial = new Date("2026-10-20T12:00:00.000Z");
      jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "setTimeout", "clearTimeout"] });
      jest.setSystemTime(initial);
      try {
        await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), selfieNoticeDays: 1, ...command("Configure advance selfie retention notice") });
        await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId), ...command("Set site attendance schedule") });
        const { siteId, qrCode } = await siteFixture(f);
        await expect(f.workforce.checkIn(f.employee.actor, { ...command("Reject incomplete site evidence"), mode: "SITE", siteId, latitude: 19.076, longitude: 72.8777, qrCode: "INVALID-QR" })).rejects.toMatchObject({ status: 400 });

        const provisional = await f.workforce.checkIn(f.employee.actor, { ...command("Record provisional site arrival"), mode: "SITE", siteId, latitude: 19.076, longitude: 72.8777, qrCode: "INVALID-QR", provisionalReason: "The QR station was unavailable" });
        expect(provisional).toMatchObject({ kind: "ATTENDANCE", state: "OPEN", provisional: true, reviewState: "PENDING" });
        await expect(f.workforce.attendanceReview(f.employee.actor, provisional.id, { ...command("Employee cannot review their own attendance"), expectedVersion: provisional.version, outcome: "APPROVED" })).rejects.toMatchObject({ status: 403 });
        const reviewed = await f.workforce.attendanceReview(f.manager.actor, provisional.id, { ...command("Review provisional arrival evidence"), expectedVersion: provisional.version, outcome: "APPROVED" });
        expect(reviewed).toMatchObject({ version: provisional.version + 1, state: "OPEN" });
        const provisionalClosed = await f.workforce.checkOut(f.employee.actor, provisional.id, { ...command("Close provisional arrival"), expectedVersion: reviewed.version });
        expect(provisionalClosed).toMatchObject({ state: "CLOSED", version: reviewed.version + 1 });

        const png = (await sharp({ create: { width: 1, height: 1, channels: 4, background: "white" } }).png().toBuffer()).toString("base64");
        const valid = await f.workforce.checkIn(f.employee.actor, { ...command("Record QR and selfie validated site arrival"), mode: "SITE", siteId, latitude: 19.076, longitude: 72.8777, qrCode, selfie: { mime: "image/png", base64: png } });
        expect(valid).toMatchObject({ kind: "ATTENDANCE", state: "OPEN", provisional: false, reviewState: "NOT_REQUIRED" });
        const selfie = await f.database.prisma.workforceSelfie.findUniqueOrThrow({ where: { attendanceId: valid.id } });
        expect(selfie.expiresAt.getTime() - selfie.capturedAt.getTime()).toBe(90 * 86_400_000);
        const data = await f.database.prisma.workforceRecord.findUniqueOrThrow({ where: { id: valid.id } });
        expect(JSON.stringify(data.data)).not.toContain(png);
        expect(JSON.stringify(data.data)).not.toContain(qrCode);
        await expect(f.workforce.selfie(f.outsider.actor, valid.id)).rejects.toMatchObject({ status: 403 });
        const closed = await f.workforce.checkOut(f.employee.actor, valid.id, { ...command("Close validated site attendance"), expectedVersion: valid.version });
        expect(closed.state).toBe("CLOSED");

        await expect(f.workforce.selfieRetention(f.owner, valid.id, { ...command("Require explicit notice interval"), expectedVersion: closed.version, action: "notice" })).rejects.toMatchObject({ status: 400 });
        const notice = await f.workforce.selfieRetention(f.owner, valid.id, { ...command("Give advance selfie-expiry notice"), expectedVersion: closed.version, action: "notice", noticeDays: 1 });
        const hold = await f.workforce.selfieRetention(f.owner, valid.id, { ...command("Hold attendance selfie"), expectedVersion: notice.version, action: "hold" });
        await expect(f.workforce.selfieRetention(f.owner, valid.id, { ...command("Held selfie cannot be purged"), expectedVersion: hold.version, action: "purge" })).rejects.toMatchObject({ status: 409 });
        jest.setSystemTime(new Date(selfie.expiresAt.getTime() + 2 * 86_400_000));
        await expect(f.workforce.selfie(f.employee.actor, valid.id)).resolves.toMatchObject({ mime: "image/jpeg", bytes: expect.any(Buffer) });
        const released = await f.workforce.selfieRetention(f.owner, valid.id, { ...command("Release resolved retention hold"), expectedVersion: hold.version, action: "release" });
        const purged = await f.workforce.selfieRetention(f.owner, valid.id, { ...command("Purge expired and noticed site selfie"), expectedVersion: released.version, action: "purge" });
        expect(purged).toMatchObject({ state: "CLOSED", version: released.version + 2 });
        await expect(f.workforce.selfie(f.employee.actor, valid.id)).rejects.toMatchObject({ status: 404 });
        expect(await f.database.prisma.workforceSelfie.findUniqueOrThrow({ where: { attendanceId: valid.id } })).toMatchObject({ purgedAt: expect.any(Date), holdReason: null });
        const retained = await f.workforce.list(f.employee.actor, "mine", "2026-10-20", "2026-10-20");
        expect(retained.attendance).toEqual(expect.arrayContaining([expect.objectContaining({ id: valid.id, version: purged.version, selfie: expect.objectContaining({ purgedAt: expect.any(Date), holdReason: null }) })]));
      } finally {
        jest.useRealTimers();
      }
    }, true);
  });

  it("attributes overnight check-in to shift start date and does not mark scheduled-end checkout early after a late start", async () => {
    await fixture(async (f) => {
      const schedule = { ...scheduleInput(f.employee.employeeId, "2020-01-01"), startMinute: 1320, endMinute: 360, breakMinutes: 0, dailyCapacityMinutes: 480 };
      await f.workforce.saveSchedule(f.owner, { ...schedule, ...command("Set overnight employee schedule") });
      jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "setTimeout", "clearTimeout"] });
      try {
        jest.setSystemTime(new Date("2026-10-20T16:45:00.000Z")); // 22:15 in the organization timezone.
        const lateStart = await f.workforce.checkIn(f.employee.actor, { ...command("Check in after overnight shift start"), mode: "OFFICE" });
        expect(lateStart).toMatchObject({ date: "2026-10-20", late: true, scheduledStartAt: expect.any(String), scheduledEndAt: expect.any(String) });
        jest.setSystemTime(new Date("2026-10-21T00:30:00.000Z")); // Scheduled 06:00 end after a 15-minute-late arrival.
        const atShiftEnd = await f.workforce.checkOut(f.employee.actor, lateStart.id, { ...command("Check out at scheduled shift end"), expectedVersion: lateStart.version });
        expect(atShiftEnd).toMatchObject({ state: "CLOSED", version: lateStart.version + 1 });
        const closedRecord = await f.database.prisma.workforceRecord.findUniqueOrThrow({ where: { id: lateStart.id } });
        expect(closedRecord.data).toMatchObject({ early: false, workingMinutes: 465 });

        jest.setSystemTime(new Date("2026-10-20T18:45:00.000Z")); // 00:15 after midnight, still in the Oct 20 shift.
        const afterMidnight = await f.workforce.checkIn(f.employee.actor, { ...command("Check in during overnight shift after midnight"), mode: "OFFICE" });
        expect(afterMidnight).toMatchObject({ date: "2026-10-20", late: true });
      } finally {
        jest.useRealTimers();
      }
    });
  });

  it("requires explicit task participation and overload acknowledgement and serializes competing leave decisions", async () => {
    await fixture(async (f) => {
      const date = futureDate();
      await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), ...command("Configure capacity thresholds") });
      await f.workforce.saveSchedule(f.owner, { ...scheduleInput(f.employee.employeeId), ...command("Set capacity schedule") });
      const task = await f.tasks.create(f.manager.actor, { title: `S17 allocated task ${randomUUID()}`, type: TaskType.NON_PROJECT, priority: TaskPriority.HIGH, targetDate: date, reason: "Create task for explicit allocation", ownerEmployeeId: f.employee.employeeId });
      const allocation = { taskId: task.id, employeeId: f.employee.employeeId, date, minutes: 500, acknowledgeOverload: false, ...command("Warn before over-capacity allocation") };
      await expect(f.workforce.allocate(f.manager.actor, allocation)).rejects.toMatchObject({ status: 409 });
      expect(await f.database.prisma.workforceRecord.count({ where: { kind: "ALLOCATION", taskId: task.id } })).toBe(0);
      const accepted = await f.workforce.allocate(f.manager.actor, { ...allocation, commandId: randomUUID(), acknowledgeOverload: true, reason: "Manager acknowledges overloaded capacity" });
      expect(accepted).toMatchObject({ kind: "ALLOCATION", employeeId: f.employee.employeeId, taskId: task.id, state: "ACTIVE" });
      expect(await f.database.prisma.workforceRecord.findUniqueOrThrow({ where: { id: accepted.id } })).toMatchObject({ version: 1 });
      const overloadTaskInput = { title: `S17 follow-up overloaded task ${randomUUID()}`, type: TaskType.NON_PROJECT, priority: TaskPriority.HIGH, targetDate: date, reason: "Exercise injected workforce task assignment warning", ownerEmployeeId: f.employee.employeeId };
      const taskCountBeforeOverload = await f.database.prisma.task.count({ where: { organizationId: f.organizationId } });
      await expect(f.tasks.create(f.manager.actor, overloadTaskInput)).rejects.toThrow("Overload warning");
      expect(await f.database.prisma.task.count({ where: { organizationId: f.organizationId } })).toBe(taskCountBeforeOverload);
      await expect(f.tasks.create(f.manager.actor, { ...overloadTaskInput, acknowledgeOverload: true })).resolves.toMatchObject({ primaryOwnerEmployeeId: f.employee.employeeId });

      const leave = await f.workforce.leave(f.employee.actor, { ...command("Request leave for decision serialization"), typeKey: "ANNUAL", days: [{ date: new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10), portion: "FULL" }], emergency: false });
      const otherDatabase = new DatabaseService(config);
      const otherAuthorization = new AuthorizationService(otherDatabase);
      const otherApprovals = new ApprovalService(otherDatabase);
      const otherWorkforce = new WorkforceService(otherDatabase, otherAuthorization, otherApprovals, new NotificationsService(otherDatabase));
      const decisionCommands = [command("First concurrent approval"), command("Second concurrent approval")];
      const outcomes = await Promise.allSettled([
        f.workforce.decide(f.manager.actor, leave.id, { ...decisionCommands[0]!, expectedVersion: leave.version, outcome: "APPROVED" }),
        otherWorkforce.decide(f.manager.actor, leave.id, { ...decisionCommands[1]!, expectedVersion: leave.version, outcome: "APPROVED" })
      ]);
      await otherDatabase.onModuleDestroy();
      expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
      expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);
      expect(await f.database.prisma.workforceLedger.count({ where: { employeeId: f.employee.employeeId, kind: "DEBIT", data: { path: ["recordId"], equals: leave.id } } })).toBe(1);
      expect(await f.database.prisma.workforceReceipt.count({ where: { actorId: f.manager.accountId, commandId: { in: decisionCommands.map((entry) => entry.commandId) } } })).toBe(1);
    }, true);
  });

  it("keeps team manager scope bounded and rejects reused commands with changed payloads", async () => {
    await fixture(async (f) => {
      const date = futureDate();
      await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), ...command("Configure scoped management policy") });
      const schedule = { ...scheduleInput(f.employee.employeeId), ...command("Save one scoped schedule") };
      const saved = await f.workforce.saveSchedule(f.manager.actor, schedule);
      await expect(f.workforce.saveSchedule(f.manager.actor, schedule)).resolves.toMatchObject({ id: saved.id, version: saved.version, state: saved.state });
      const outsiderList = await f.workforce.list(f.outsider.actor, "managed", date, date);
      expect(outsiderList.workload).toEqual([]);
      await expect(f.workforce.saveSchedule(f.outsider.actor, { ...schedule, commandId: randomUUID() })).rejects.toMatchObject({ status: 403 });
      await expect(f.workforce.saveSchedule(f.manager.actor, { ...schedule, effectiveFrom: "2026-01-02" })).rejects.toMatchObject({ status: 409 });
      expect(await f.database.prisma.workforceRecord.count({ where: { id: saved.id } })).toBe(1);
      expect(await f.database.prisma.workforceVersion.count({ where: { recordId: saved.id } })).toBe(1);
      expect(await f.database.prisma.workforceReceipt.count({ where: { actorId: f.manager.accountId, commandId: schedule.commandId } })).toBe(1);
      const grant = await f.database.prisma.employeePermissionOverride.findFirstOrThrow({ where: { organizationId: f.organizationId, employeeId: f.manager.employeeId, permissionKey: "workforce.manage" } });
      await f.database.prisma.employeePermissionOverride.update({ where: { id: grant.id }, data: { effect: PermissionEffect.DENY } });
      await expect(f.workforce.saveSchedule(f.manager.actor, schedule)).rejects.toMatchObject({ status: 403 });
      await expect(f.workforce.setup(f.client)).rejects.toMatchObject({ status: 403 });
    });
  });

  it("rejects a forged command receipt that changes the canonical workforce result snapshot", async () => {
    await fixture(async (f) => {
      const policy = await f.workforce.savePolicy(f.owner, { ...policyInput(f.branchId), ...command("Create canonical receipt source") });
      const receiptCount = await f.database.prisma.workforceReceipt.count({ where: { organizationId: f.organizationId, actorId: f.owner.accountId } });
      await f.database.prisma.$executeRaw`SAVEPOINT s17_receipt_tamper`;
      await f.database.prisma.workforceReceipt.create({ data: {
        organizationId: f.organizationId,
        actorId: f.owner.accountId,
        commandId: randomUUID(),
        payloadHash: "0".repeat(64),
        result: { ...policy, data: { forged: true } } as Prisma.InputJsonObject
      } });
      let rejected = false;
      try {
        await f.database.prisma.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
      } catch {
        rejected = true;
      }
      await f.database.prisma.$executeRaw`ROLLBACK TO SAVEPOINT s17_receipt_tamper`;
      await f.database.prisma.$executeRaw`RELEASE SAVEPOINT s17_receipt_tamper`;
      expect(rejected).toBe(true);
      expect(await f.database.prisma.workforceReceipt.count({ where: { organizationId: f.organizationId, actorId: f.owner.accountId } })).toBe(receiptCount);
    });
  });

  it("rejects a revoked manager session before committing a workforce command", async () => {
    await fixture(async (f) => {
      const session = await f.database.prisma.session.create({ data: { accountId: f.manager.accountId, tokenHash: randomUUID(), csrfTokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60_000) } });
      const actor = { ...f.manager.actor, sessionId: session.id } as ProjectActor & { sessionId: string };
      await f.database.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      await expect(f.workforce.saveSchedule(actor, { ...scheduleInput(f.employee.employeeId), ...command("Reject a revoked manager session") })).rejects.toMatchObject({ status: 403 });
      expect(await f.database.prisma.workforceRecord.count({ where: { employeeId: f.employee.employeeId, kind: "SCHEDULE" } })).toBe(0);
    });
  });
});

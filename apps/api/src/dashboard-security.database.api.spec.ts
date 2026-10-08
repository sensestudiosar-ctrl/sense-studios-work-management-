import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { ForbiddenException } from "@nestjs/common";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { TaskService } from "./task.service.js";
import { ProjectService } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { DatabaseService } from "./database.service.js";
import { DashboardService } from "./dashboard.service.js";
import { NotificationWorker, OperationalRecipientPredicate, PersistedVerifiedAddressPredicate } from "./notification-worker.js";
import type { ProjectActor } from "./project.service.js";
import type { RuntimeConfig } from "./config.js";
import type { BrevoEmailAdapter } from "./brevo-email.js";

const url = process.env.S24_SECURITY_DATABASE_URL;
const suite = url ? describe : describe.skip;
const ownerEmail = "s24-security-owner@example.test";

suite("S24 committed PostgreSQL after-wait and notification revocation security", () => {
  let database: DatabaseService;
  let owner: ProjectActor;
  let staff: ProjectActor;
  let organizationId: string;
  let branchId: string;
  let projectId: string;
  let staffEmployeeId: string;
  let project: ProjectService;
  let tasks: TaskService;
  let workflow: ProjectWorkflowService;
  let service: DashboardService;

  beforeAll(async () => {
    const parsed = new URL(url!);
    const s24 = parsed.port === "56433" && /^\/sense_s24_security_[a-z0-9_]+_test$/.test(parsed.pathname);
    const s25 = process.env.S25_E2E_ENABLED === "1" && parsed.port === "57433" && /^\/sense_s24_security_s25_[a-z0-9_]+_test$/.test(parsed.pathname);
    const s26 = process.env.S26_E2E_ENABLED === "1" && parsed.port === "57433" && /^\/sense_s24_security_s26_[a-z0-9_]+_test$/.test(parsed.pathname);
    const s27 = process.env.S27_E2E_ENABLED === "1" && parsed.port === "57433" && /^\/sense_s24_security_s27_[a-z0-9_]+_test$/.test(parsed.pathname);
    if (!(parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") || (!s24 && !s25 && !s26 && !s27)) {
      throw new Error("Dashboard security requires an exact S24 or explicitly enabled exact S24/S25/S26/S27 loopback database");
    }
    database = new DatabaseService({ nodeEnv: "test", port: 4000, databaseUrl: url!, webOrigin: "http://localhost:5173" } as RuntimeConfig);
    const marker = await database.prisma.account.findUnique({ where: { normalizedEmail: ownerEmail }, include: { employee: true } });
    if (!marker) {
      const [organizations, accounts] = await Promise.all([database.prisma.organization.count(), database.prisma.account.count()]);
      if (organizations !== 0 || accounts !== 0) throw new Error("Refusing to add retained security fixture to a non-empty S24 target");
      const rows = await database.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({ data: { name: "S24 retained security fixture" } });
        const branchRow = await tx.branch.create({ data: { organizationId: org.id, name: "S24 retained security branch" } });
        const team = await tx.team.create({ data: { organizationId: org.id, branchId: branchRow.id, name: "S24 retained security team" } });
        const ownerAccount = await tx.account.create({ data: { normalizedEmail: ownerEmail, kind: "OWNER", state: "ACTIVE" } });
        const staffAccount = await tx.account.create({ data: { normalizedEmail: `s24-security-staff-${randomUUID()}@example.test`, kind: "STAFF", state: "ACTIVE" } });
        const employee = await tx.employee.create({ data: { organizationId: org.id, accountId: staffAccount.id, homeBranchId: branchRow.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01") } });
        return { organizationId: org.id, branchId: branchRow.id, ownerId: ownerAccount.id, staffId: staffAccount.id, employeeId: employee.id };
      }, { timeout: 30_000 });
      organizationId = rows.organizationId;
      branchId = rows.branchId;
      staffEmployeeId = rows.employeeId;
      owner = { accountId: rows.ownerId, kind: "OWNER", organizationId };
      staff = { accountId: rows.staffId, kind: "STAFF", organizationId };
    } else {
      const [orgs, activeOwners] = await Promise.all([
        database.prisma.organization.findMany(),
        database.prisma.account.findMany({ where: { kind: "OWNER", state: "ACTIVE" } })
      ]);
      if (orgs.length !== 1 || activeOwners.length !== 1 || activeOwners[0]?.id !== marker.id || marker.state !== "ACTIVE") {
        throw new Error("Retained S24 security fixture identity/owner invariant failed");
      }
      organizationId = orgs[0]!.id;
      owner = { accountId: marker.id, kind: "OWNER", organizationId };
      const branchRow = await database.prisma.branch.findFirstOrThrow({ where: { organizationId, name: "S24 retained security branch" } });
      branchId = branchRow.id;
      const team = await database.prisma.team.findFirstOrThrow({ where: { organizationId, branchId, name: "S24 retained security team" } });
      let existingStaff = await database.prisma.account.findFirst({ where: { normalizedEmail: { startsWith: "s24-security-staff-" }, kind: "STAFF", state: "ACTIVE" }, orderBy: { createdAt: "desc" }, include: { employee: true } });
      if (!existingStaff?.employee) {
        existingStaff = await database.prisma.$transaction(async (tx) => {
          const account = await tx.account.create({ data: { normalizedEmail: `s24-security-staff-${randomUUID()}@example.test`, kind: "STAFF", state: "ACTIVE" } });
          const employee = await tx.employee.create({ data: { organizationId, accountId: account.id, homeBranchId: branchId, homeTeamId: team.id, hiredAt: new Date("2026-01-01") } });
          return { ...account, employee };
        });
      }
      staffEmployeeId = existingStaff.employee.id;
      staff = { accountId: existingStaff.id, kind: "STAFF", organizationId };
    }
    const authorization = new AuthorizationService(database);
    tasks = new TaskService(database, authorization);
    project = new ProjectService(database);
    const approvals = new ApprovalService(database);
    workflow = new ProjectWorkflowService(database, authorization, approvals);
    const dependencies = [database, project, tasks, approvals, {}, {}, { context: async (actor: ProjectActor) => ({ employees: [], employeeId: actor.accountId === staff.accountId ? staffEmployeeId : undefined, projects: [] }) }, {}, {}, {}, {}, {}] as unknown as ConstructorParameters<typeof DashboardService>;
    service = new DashboardService(...dependencies);
    let projectRow = await database.prisma.project.findFirst({ where: { organizationId, title: "S24 committed revocation fixture" } });
    if (!projectRow) {
      const created = await project.create(owner, { branchId, title: "S24 committed revocation fixture", deliveryType: "DESIGN", scopes: ["Delivery"], reason: "Create retained S24 notification source" });
      projectRow = created.project;
    }
    projectId = projectRow.id;
    const allowView = await database.prisma.employeePermissionOverride.findFirst({ where: { employeeId: staffEmployeeId, permissionKey: "project.view", effect: "ALLOW", branchId, revokedAt: null } });
    if (!allowView) {
      await database.prisma.employeePermissionOverride.create({ data: { organizationId, employeeId: staffEmployeeId, permissionKey: "project.view", effect: "ALLOW", scopeKind: "BRANCH", branchId, reason: "Grant S24 fixture source visibility" } });
    }
    await database.prisma.employeePermissionOverride.updateMany({ where: { employeeId: staffEmployeeId, permissionKey: "project.view", effect: "DENY", branchId, revokedAt: null }, data: { revokedAt: new Date() } });
    const assignment = await database.prisma.projectAssignment.findFirst({ where: { projectId, employeeId: staffEmployeeId, revokedAt: null } });
    if (!assignment) await workflow.assignment(owner, projectId, { employeeId: staffEmployeeId, expectedVersion: projectRow.version, reason: "Assign retained S24 notification source" });
    if (projectRow.status !== "ACTIVE") {
      await database.prisma.employeePermissionOverride.create({ data: { organizationId, employeeId: staffEmployeeId, permissionKey: "project.manage", effect: "ALLOW", scopeKind: "BRANCH", branchId, reason: "Allow retained S24 project activation" } });
      await workflow.lead(owner, projectId, { employeeId: staffEmployeeId, expectedVersion: (await database.prisma.project.findUniqueOrThrow({ where: { id: projectId } })).version, reason: "Appoint retained S24 project lead" });
      const current = await database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
      await workflow.status(owner, projectId, { toStatus: "ACTIVE", expectedVersion: current.version, reason: "Activate retained S24 notification source" });
    }
    await database.prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  }, 120_000);

  afterAll(async () => { await database?.onModuleDestroy(); });

  test("rechecks a real revoked session after the organization command advisory-lock wait", async () => {
    const sessionId = randomUUID();
    await database.prisma.session.create({ data: {
      id: sessionId, accountId: owner.accountId, tokenHash: randomUUID().replaceAll("-", ""), csrfTokenHash: randomUUID().replaceAll("-", ""),
      expiresAt: new Date(Date.now() + 60 * 60_000), lastUsedAt: new Date()
    } });
    const commandId = randomUUID();
    const input = { commandId, reason: "Verify session revocation after advisory lock", kind: "SUMMARY", enabled: true, localTime: "08:00", timezone: "UTC", audience: "OWNER", summaryKind: "MORNING", critical: false, mandatory: false };
    const [rulesBefore, auditBefore] = await Promise.all([
      database.prisma.dashboardRule.count({ where: { organizationId } }),
      database.prisma.auditEvent.count({ where: { organizationId, eventKey: "dashboard.rule_changed" } })
    ]);
    let release!: () => void;
    let locked!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const acquired = new Promise<void>((resolve) => { locked = resolve; });
    const blocker = database.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":dashboard"},0))`;
      locked();
      await gate;
    }, { timeout: 30_000 });
    await acquired;
    const command = service.saveSchedule({ ...owner, sessionId } as ProjectActor & { sessionId: string }, input)
      .then((value) => ({ value, error: null as unknown }), (error: unknown) => ({ value: null, error }));
    try {
      let waiting = false;
      for (let attempt = 0; attempt < 150; attempt++) {
        const rows = await database.prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS(
          SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0
            AND query ILIKE '%pg_advisory_xact_lock%'
        ) AS waiting`;
        if (rows[0]?.waiting) { waiting = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
      await database.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    } finally {
      release();
    }
    const result = await command;
    await blocker;
    expect(result.error).toBeInstanceOf(ForbiddenException);
    expect(await database.prisma.dashboardReceipt.count({ where: { actorId: owner.accountId, commandId } })).toBe(0);
    expect(await database.prisma.dashboardRule.count({ where: { organizationId } })).toBe(rulesBefore);
    expect(await database.prisma.auditEvent.count({ where: { organizationId, eventKey: "dashboard.rule_changed" } })).toBe(auditBefore);
  });

  test("scheduled task notices are generic and notification delivery fails closed after branch access is revoked", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const task = await tasks.create(owner, { title: "CONFIDENTIAL S24 task title", type: "PROJECT", projectId, ownerEmployeeId: staffEmployeeId, priority: "HIGH", targetDate: today, reason: "Create S24 revoked-notice source" });
    const rule = await service.saveSchedule(owner, { commandId: randomUUID(), reason: "Configure employee task notice", kind: "TASK_REMINDER", enabled: true, localTime: "00:00", timezone: "UTC", audience: "EMPLOYEE", offsetDays: 0, critical: false, mandatory: false });
    const ownTasks = await tasks.list(staff, "mine");
    expect(ownTasks.items.some((item) => item.id === task.id)).toBe(true);
    const generated = await service.runBatch(new Date(`${today}T23:59:00.000Z`));
    expect(generated).toBeGreaterThan(0);
    const run = await database.prisma.dashboardRun.findFirstOrThrow({ where: { sourceId: rule.id, recipientId: staff.accountId, slot: { contains: task.id } } });
    const notices = await database.prisma.notification.findMany({ where: { eventId: run.eventId, recipientAccountId: staff.accountId } });
    expect(notices.length).toBeGreaterThan(0);
    for (const notice of notices) expect(`${notice.title} ${notice.body}`).not.toContain("CONFIDENTIAL S24 task title");
    expect(await service.deliveryAuthorized(run.eventId, staff.accountId)).toBe(true);

    await database.prisma.employeePermissionOverride.create({ data: { organizationId, employeeId: staffEmployeeId, permissionKey: "project.view", effect: "DENY", scopeKind: "BRANCH", branchId, reason: "Revoke current S24 task notice access" } });
    expect(await service.deliveryAuthorized(run.eventId, staff.accountId)).toBe(false);
    const predicate = new OperationalRecipientPredicate(database, new AuthorizationService(database), tasks, service);
    expect(await predicate.isAuthorized(run.eventId, staff.accountId)).toBe(false);
    const config = { nodeEnv: "test", port: 4000, databaseUrl: url!, webOrigin: "http://localhost:5173" } as RuntimeConfig;
    const worker = new NotificationWorker(database, {} as BrevoEmailAdapter, new PersistedVerifiedAddressPredicate(database), predicate, config);
    for (let attempt = 0; attempt < 100; attempt++) {
      const pending = await database.prisma.notification.count({ where: { eventId: run.eventId, deliveryState: "PENDING" } });
      if (!pending) break;
      await worker.runBatch();
    }
    const after = await database.prisma.notification.findMany({ where: { eventId: run.eventId, recipientAccountId: staff.accountId } });
    expect(after.length).toBeGreaterThan(0);
    expect(after.every((notice) => notice.deliveryState === "DEAD" && notice.failureCode === "recipient_not_authorized")).toBe(true);
  }, 120_000);

  test("event notices select actual matching task events and remain deduplicated after a rule version edit", async () => {
    await database.prisma.employeePermissionOverride.updateMany({ where: { employeeId: staffEmployeeId, permissionKey: "project.view", effect: "DENY", branchId, revokedAt: null }, data: { revokedAt: new Date() } });
    const rule = await service.saveSchedule(owner, {
      commandId: randomUUID(), reason: "Configure explicit high-priority project task event notice", kind: "EVENT_NOTICE",
      enabled: true, localTime: "00:00", timezone: "UTC", audience: "EMPLOYEE", eventNames: ["task.created"],
      projectId, priority: "HIGH", critical: false, mandatory: false
    });
    const matching = await tasks.create(owner, { title: "S24 matching event task", type: "PROJECT", projectId, ownerEmployeeId: staffEmployeeId, priority: "HIGH", targetDate: new Date().toISOString().slice(0, 10), reason: "Create matching S24 event source" });
    const excluded = await tasks.create(owner, { title: "S24 excluded priority task", type: "PROJECT", projectId, ownerEmployeeId: staffEmployeeId, priority: "LOW", targetDate: new Date().toISOString().slice(0, 10), reason: "Create excluded S24 event source" });
    const generated = await service.runBatch(new Date());
    expect(generated).toBeGreaterThan(0);
    const matchingRun = await database.prisma.dashboardRun.findFirst({ where: { sourceId: rule.id, recipientId: staff.accountId, slot: `event:${(await database.prisma.domainEvent.findFirstOrThrow({ where: { eventName: "task.created", subjectId: matching.id }, orderBy: { occurredAt: "desc" } })).id}` } });
    expect(matchingRun).not.toBeNull();
    const excludedEvent = await database.prisma.domainEvent.findFirstOrThrow({ where: { eventName: "task.created", subjectId: excluded.id }, orderBy: { occurredAt: "desc" } });
    expect(await database.prisma.dashboardRun.count({ where: { sourceId: rule.id, recipientId: staff.accountId, slot: `event:${excludedEvent.id}` } })).toBe(0);
    const runsBeforeEdit = await database.prisma.dashboardRun.count({ where: { sourceId: rule.id, recipientId: staff.accountId } });
    await service.saveSchedule(owner, { commandId: randomUUID(), reason: "Version event notice rule without replay", kind: "EVENT_NOTICE", enabled: true, localTime: "00:00", timezone: "UTC", audience: "EMPLOYEE", eventNames: ["task.created"], projectId, priority: "HIGH", critical: false, mandatory: false, expectedVersion: rule.version }, rule.id);
    expect(await service.runBatch(new Date())).toBe(0);
    expect(await database.prisma.dashboardRun.count({ where: { sourceId: rule.id, recipientId: staff.accountId } })).toBe(runsBeforeEdit);
  }, 120_000);
});

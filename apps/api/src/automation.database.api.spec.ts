import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ProjectService, type ProjectActor } from "./project.service.js";
import { TaskService } from "./task.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { ApprovalService } from "./approval.service.js";
import { TimeService } from "./time.service.js";
import { DocumentService } from "./document.service.js";
import { RevisionService } from "./revision.service.js";
import { NotificationsService } from "./notifications.service.js";
import { ReviewService } from "./review.service.js";
import { WorkforceService } from "./workforce.service.js";
import { ClientPortalScopeService } from "./client-portal-scope.service.js";
import { TurnkeyService } from "./turnkey.service.js";
import { SiteService } from "./site.service.js";
import { PerformanceService } from "./performance.service.js";
import { DashboardService } from "./dashboard.service.js";
import { AutomationService, automationEventNames } from "./automation.service.js";
import { Prisma } from "./generated/prisma/client.js";
import type { RuntimeConfig } from "./config.js";

const url = process.env.S26_DATABASE_URL;
const suite = url ? describe : describe.skip;
class Rollback extends Error {}

suite("S26 real PostgreSQL automation records, reports, and runs", () => {
  let database: DatabaseService;

  beforeAll(async () => {
    const parsed = new URL(url!);
    const s26 = process.env.S26_E2E_ENABLED === "1" && /^\/sense_s26_s26_[a-z0-9_]+_test$/.test(parsed.pathname);
    const s27 = process.env.S27_E2E_ENABLED === "1" && /^\/sense_s26_s27_[a-z0-9_]+_test$/.test(parsed.pathname);
    if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || parsed.port !== "57433" || (!s26 && !s27)) throw new Error("Refuse anything except the explicitly enabled dedicated S26/S27 PostgreSQL test target");
    database = new DatabaseService({ nodeEnv: "test", port: 4000, databaseUrl: url!, webOrigin: "http://localhost:5173" } as RuntimeConfig);
    const rows = await database.prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (rows[0]?.name !== parsed.pathname.slice(1)) throw new Error("S26 exact database target mismatch");
  });
  afterAll(async () => { await database?.onModuleDestroy(); });

  async function fixture(work: (f: { automation: AutomationService; owner: ProjectActor; staff: ProjectActor; tx: Prisma.TransactionClient; task: TaskService; projects: ProjectService; branchId: string; projectId: string; employeeId: string }) => Promise<void>) {
    try {
      await database.prisma.$transaction(async (tx) => {
        const org = await tx.organization.findFirst() ?? await tx.organization.create({ data: { name: "S26 isolated acceptance organization" } });
        const branch = await tx.branch.create({ data: { organizationId: org.id, name: "S26 fixture branch" } });
        const team = await tx.team.create({ data: { organizationId: org.id, branchId: branch.id, name: "S26 fixture team" } });
        const ownerAccount = await tx.account.findFirst({ where: { kind: "OWNER", state: "ACTIVE" } }) ?? await tx.account.create({ data: { normalizedEmail: `${randomUUID()}@example.test`, kind: "OWNER", state: "ACTIVE" } });
        const staffAccount = await tx.account.create({ data: { normalizedEmail: `${randomUUID()}@example.test`, kind: "STAFF", state: "ACTIVE" } });
        const employee = await tx.employee.create({ data: { organizationId: org.id, accountId: staffAccount.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01") } });
        const owner = { accountId: ownerAccount.id, kind: "OWNER", organizationId: org.id } as ProjectActor;
        const staff = { accountId: staffAccount.id, kind: "STAFF", organizationId: org.id, employeeId: employee.id } as ProjectActor;
        let sequence = 0;
        const wrap = (target: Prisma.TransactionClient): Prisma.TransactionClient => new Proxy(target, { get(delegate, key) {
          if (key === "$transaction") return async (callback: (client: Prisma.TransactionClient) => Promise<unknown>) => {
            const name = `s26_fixture_${++sequence}`; await target.$executeRawUnsafe(`SAVEPOINT ${name}`);
            try { const result = await callback(wrap(target)); await target.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE"); await target.$executeRawUnsafe("SET CONSTRAINTS ALL DEFERRED"); await target.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`); return result; }
            catch (error) { await target.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${name}`); await target.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`); throw error; }
          };
          return Reflect.get(delegate, key, delegate);
        } });
        const db = { prisma: wrap(tx) } as unknown as DatabaseService;
        const authorization = new AuthorizationService(db), projects = new ProjectService(db), task = new TaskService(db, authorization), approvals = new ApprovalService(db);
        const config = { nodeEnv: "test", port: 4000, databaseUrl: url!, webOrigin: "http://localhost:5173", nasRoot: ".env.s26-tools/nas" } as RuntimeConfig;
        const documents = new DocumentService(db, authorization, config), revisions = new RevisionService(db, authorization, documents), notifications = new NotificationsService(db);
        const reviews = new ReviewService(db, authorization, documents, revisions, notifications), workforce = new WorkforceService(db, authorization, approvals, notifications, config);
        const portal = new ClientPortalScopeService(db, authorization), turnkey = new TurnkeyService(db, authorization, approvals, revisions, portal);
        const site = new SiteService(db, authorization, documents, turnkey, workforce), performance = new PerformanceService(db, authorization, revisions, approvals, workforce);
        const time = new TimeService(db, authorization, task, documents);
        const dashboard = new DashboardService(db, projects, task, approvals, time, workforce, performance, revisions, reviews, documents, site, turnkey);
        const automation = new AutomationService(db, authorization, projects, task, dashboard, approvals, notifications);
        const { project } = await projects.create(owner, { branchId: branch.id, title: "S26 generated report source", deliveryType: "DESIGN", scopes: ["Delivery"], reason: "Create isolated S26 report fixture" });
        for (const permissionKey of ["project.view", "project.manage"]) await tx.employeePermissionOverride.create({ data: { organizationId: org.id, employeeId: employee.id, permissionKey, effect: "ALLOW", scopeKind: "BRANCH", branchId: branch.id, reason: "Explicit S26 fixture project access" } });
        const workflow = new ProjectWorkflowService(db, authorization, approvals);
        await workflow.assignment(owner, project.id, { employeeId: employee.id, expectedVersion: 1, reason: "Assign S26 report recipient" });
        await workflow.lead(owner, project.id, { employeeId: employee.id, expectedVersion: 2, reason: "Appoint S26 project lead" });
        await workflow.status(owner, project.id, { toStatus: "ACTIVE", expectedVersion: 3, reason: "Activate S26 source project" });
        await work({ automation, owner, staff, tx: wrap(tx), task, projects, branchId: branch.id, projectId: project.id, employeeId: employee.id });
        throw new Rollback();
      }, { timeout: 120000 });
    } catch (error) { if (!(error instanceof Rollback)) throw error; }
  }

  const command = () => ({ commandId: randomUUID(), reason: "Explicit fictional S26 command" });
  const definition = () => ({ title: "Current project work", category: "project", from: "2026-10-01", to: "2026-10-31", columns: ["label"], filters: [], groupBy: "label", chart: "BAR" });
  const rule = (recipientId: string, action: Record<string, unknown>, projectId?: string) => ({ ...command(), title: "S26 task event rule", enabled: true, eventNames: ["task.created"], ...(projectId ? { projectId } : {}), condition: { subjectType: "task" }, action: { ...action, recipientId } });

  test("saved reports retain versions, previews filter actual source rows, and command retries conflict on changed input", async () => fixture(async ({ automation, owner, staff, task, tx, projectId, employeeId }) => {
    const actual = await task.create(staff, { title: "Retained S26 source task", type: "PROJECT", projectId, ownerEmployeeId: employeeId, priority: "HIGH", targetDate: "2026-10-12", reason: "Create real report source task" });
    const input = { ...definition(), ...command() };
    const first = await automation.saveReport(owner, input);
    expect(await automation.saveReport(owner, input)).toEqual(first);
    await expect(automation.saveReport(owner, { ...input, title: "Changed replay" })).rejects.toBeInstanceOf(ConflictException);
    const preview = await automation.savedPreview(owner, first.id);
    expect(preview.table.rows.find((row) => row.label === "Retained S26 source task")?.count).toBeGreaterThan(0);
    const updated = await automation.saveReport(owner, { ...definition(), ...command(), expectedVersion: 1 }, first.id);
    expect(updated.version).toBe(2);
    await expect(automation.saveReport(owner, { ...definition(), ...command(), expectedVersion: 1 }, first.id)).rejects.toBeInstanceOf(ConflictException);
    expect(await tx.automationVersion.count({ where: { recordId: first.id } })).toBe(2);
    expect(await tx.automationReceipt.count({ where: { actorId: owner.accountId } })).toBe(2);
    expect(actual.id).toBeTruthy();
  }));

  test("staff report and project-rule writes require their explicit scoped grants", async () => fixture(async ({ automation, owner, staff, tx, projectId, employeeId, branchId }) => {
    await expect(automation.saveReport(staff, { ...definition(), ...command() })).rejects.toBeInstanceOf(ForbiddenException);
    await tx.employeePermissionOverride.create({ data: { organizationId: owner.organizationId, employeeId, permissionKey: "report.manage", effect: "ALLOW", scopeKind: "BRANCH", branchId, reason: "Explicit S26 scoped report grant" } });
    const report = await automation.saveReport(staff, { ...definition(), ...command() });
    expect(report.version).toBe(1);

    const ruleInput = rule(owner.accountId, { kind: "NOTIFY" }, projectId);
    await expect(automation.saveRule(staff, ruleInput)).rejects.toBeInstanceOf(ForbiddenException);
    await tx.employeePermissionOverride.create({ data: { organizationId: owner.organizationId, employeeId, permissionKey: "automation.manage", effect: "ALLOW", scopeKind: "BRANCH", branchId, reason: "Explicit S26 scoped automation grant" } });
    expect(await automation.saveRule(staff, ruleInput)).toMatchObject({ version: 1 });
  }));

  test("interactive Learning reports can be saved but cannot be selected by REPORT event rules", async () => fixture(async ({ automation, owner, staff, tx, projectId }) => {
    const session = await tx.session.create({ data: { accountId: owner.accountId, tokenHash: randomUUID(), csrfTokenHash: randomUUID(), expiresAt: new Date(Date.now() + 3_600_000), lastUsedAt: new Date() } });
    const interactiveOwner = { ...owner, sessionId: session.id };
    const learningReport = await automation.saveReport(interactiveOwner, { ...definition(), category: "skills_training", ...command() });
    expect((await automation.context(owner)).ruleReports.map((report: { id: string }) => report.id)).not.toContain(learningReport.id);
    await expect(automation.saveRule(owner, rule(staff.accountId, { kind: "REPORT", reportId: learningReport.id }, projectId))).rejects.toThrow(/Learning evidence reports cannot run/);
  }));

  test("task events generate report, notice, and review runs once; rejecting a recommendation leaves source work untouched", async () => fixture(async ({ automation, owner, staff, task, tx, projectId, employeeId }) => {
    const sourceReport = await automation.saveReport(owner, { ...definition(), ...command() });
    const reportRule = await automation.saveRule(owner, rule(staff.accountId, { kind: "REPORT", reportId: sourceReport.id }, projectId));
    const noticeRule = await automation.saveRule(owner, rule(staff.accountId, { kind: "NOTIFY" }, projectId));
    const reviewRule = await automation.saveRule(owner, rule(staff.accountId, { kind: "RECOMMENDATION", recommendation: "Review current project priority" }, projectId));
    const actual = await task.create(staff, { title: "S26 event sourced task", type: "PROJECT", projectId, ownerEmployeeId: employeeId, priority: "HIGH", targetDate: "2026-10-13", reason: "Create real event for configured rules" });
    expect((await automation.runBatch()).processed).toBe(3);
    expect((await automation.runBatch()).processed).toBe(0);
    const runs = await tx.automationRun.findMany({ where: { organizationId: owner.organizationId } });
    expect(runs.map((row) => row.actionKind).sort()).toEqual(["NOTIFY", "RECOMMENDATION", "REPORT"]);
    const reportRun = runs.find((row) => row.actionKind === "REPORT")!;
    const generated = await automation.runReport(staff, reportRun.id);
    expect(generated.table.rows.some((row) => row.label === "S26 event sourced task")).toBe(true);
    expect(generated.chart).toContainEqual(expect.objectContaining({ label: "S26 event sourced task", count: expect.any(Number) }));
    const pending = runs.find((row) => row.actionKind === "RECOMMENDATION")!;
    const before = await tx.task.findUniqueOrThrow({ where: { id: actual.id } });
    await automation.decide(staff, pending.id, { ...command(), outcome: "REJECTED" });
    const after = await tx.task.findUniqueOrThrow({ where: { id: actual.id } });
    expect(after.status).toBe(before.status);
    expect(await tx.approvalRequest.findUniqueOrThrow({ where: { id: pending.approvalRequestId! } })).toMatchObject({ state: "REJECTED" });
    const approvedSource = await task.create(staff, { title: "S26 nonbinding approved source", type: "PROJECT", projectId, ownerEmployeeId: employeeId, priority: "HIGH", targetDate: "2026-10-14", reason: "Create second recommendation source" });
    expect((await automation.runBatch()).processed).toBe(3);
    const sourceEvent = await tx.domainEvent.findFirstOrThrow({ where: { organizationId: owner.organizationId, eventName: "task.created", subjectId: approvedSource.id } });
    const approvedRun = await tx.automationRun.findFirstOrThrow({ where: { organizationId: owner.organizationId, actionKind: "RECOMMENDATION", sourceEventId: sourceEvent.id } });
    const approvedBefore = await tx.task.findUniqueOrThrow({ where: { id: approvedSource.id } });
    await automation.decide(staff, approvedRun.id, { ...command(), outcome: "APPROVED" });
    const approvedAfter = await tx.task.findUniqueOrThrow({ where: { id: approvedSource.id } });
    expect(approvedAfter).toMatchObject({ status: approvedBefore.status, version: approvedBefore.version, priority: approvedBefore.priority, targetDate: approvedBefore.targetDate });
    expect(await tx.approvalRequest.findUniqueOrThrow({ where: { id: approvedRun.approvalRequestId! } })).toMatchObject({ state: "APPROVED" });
    expect([reportRule.id, noticeRule.id, reviewRule.id]).toHaveLength(3);
  }));

  test("rule disable and re-enable apply prospective event cutoffs while retaining prior runs", async () => fixture(async ({ automation, owner, staff, task, tx, projectId, employeeId }) => {
    const createEvent = async (title: string) => task.create(staff, { title, type: "PROJECT", projectId, ownerEmployeeId: employeeId, priority: "HIGH", targetDate: "2026-10-15", reason: "Exercise prospective S26 rule cutoff" });
    const beforeCreate = await createEvent("S26 event before rule creation");
    const beforeCreateEvent = await tx.domainEvent.findFirstOrThrow({ where: { organizationId: owner.organizationId, eventName: "task.created", subjectId: beforeCreate.id } });
    await new Promise((resolve) => setTimeout(resolve, 5));

    const created = await automation.saveRule(owner, rule(staff.accountId, { kind: "NOTIFY" }, projectId));
    const firstVersion = await tx.automationVersion.findUniqueOrThrow({ where: { recordId_version: { recordId: created.id, version: 1 } } });
    expect(beforeCreateEvent.occurredAt.getTime()).toBeLessThan(firstVersion.createdAt.getTime());
    expect((await automation.runBatch()).processed).toBe(0);

    const whileEnabled = await createEvent("S26 event while enabled");
    const whileEnabledEvent = await tx.domainEvent.findFirstOrThrow({ where: { organizationId: owner.organizationId, eventName: "task.created", subjectId: whileEnabled.id } });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect((await automation.runBatch()).processed).toBe(1);
    const priorRun = await tx.automationRun.findUniqueOrThrow({ where: { ruleId_ruleVersion_sourceEventId: { ruleId: created.id, ruleVersion: 1, sourceEventId: whileEnabledEvent.id } } });

    await automation.saveRule(owner, { ...rule(staff.accountId, { kind: "NOTIFY" }, projectId), enabled: false, expectedVersion: 1 }, created.id);
    const disabledEvent = await createEvent("S26 event while disabled");
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect((await automation.runBatch()).processed).toBe(0);

    const enabledAgain = await automation.saveRule(owner, { ...rule(staff.accountId, { kind: "NOTIFY" }, projectId), enabled: true, expectedVersion: 2 }, created.id);
    expect(enabledAgain).toMatchObject({ id: created.id, version: 3 });
    const thirdVersion = await tx.automationVersion.findUniqueOrThrow({ where: { recordId_version: { recordId: created.id, version: 3 } } });
    const disabledEventRow = await tx.domainEvent.findFirstOrThrow({ where: { organizationId: owner.organizationId, eventName: "task.created", subjectId: disabledEvent.id } });
    expect(disabledEventRow.occurredAt.getTime()).toBeLessThan(thirdVersion.createdAt.getTime());

    const afterReenable = await createEvent("S26 event after re-enable");
    const afterReenableEvent = await tx.domainEvent.findFirstOrThrow({ where: { organizationId: owner.organizationId, eventName: "task.created", subjectId: afterReenable.id } });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect((await automation.runBatch()).processed).toBe(1);
    const newRun = await tx.automationRun.findUniqueOrThrow({ where: { ruleId_ruleVersion_sourceEventId: { ruleId: created.id, ruleVersion: 3, sourceEventId: afterReenableEvent.id } } });
    expect(newRun.status).toBe("DELIVERED");
    expect(await tx.automationRun.findUnique({ where: { id: priorRun.id } })).toMatchObject({ id: priorRun.id, ruleVersion: 1, sourceEventId: whileEnabledEvent.id, status: "DELIVERED" });
    expect(await tx.automationRun.count({ where: { ruleId: created.id, sourceEventId: { in: [beforeCreateEvent.id, disabledEventRow.id] } } })).toBe(0);
    expect(afterReenableEvent.occurredAt.getTime()).toBeGreaterThanOrEqual(thirdVersion.createdAt.getTime());
    expect(await tx.automationVersion.count({ where: { recordId: created.id } })).toBe(3);
  }));

  test("run records, event receipts, and saved versions reject SQL mutation", async () => fixture(async ({ automation, owner, staff, task, tx, projectId, employeeId }) => {
    const report = await automation.saveReport(owner, { ...definition(), ...command() });
    await automation.saveRule(owner, rule(staff.accountId, { kind: "REPORT", reportId: report.id }, projectId));
    await task.create(staff, { title: "S26 immutable source", type: "PROJECT", projectId, ownerEmployeeId: employeeId, priority: "HIGH", targetDate: "2026-10-14", reason: "Create immutable source event" });
    await automation.runBatch();
    const run = await tx.automationRun.findFirstOrThrow({ where: { organizationId: owner.organizationId } });
    const version = await tx.automationVersion.findFirstOrThrow({ where: { recordId: report.id } });
    const attempt = async (operation: () => Promise<unknown>) => {
      const savepoint = `s26_deny_${randomUUID().replaceAll("-", "")}`;
      await tx.$executeRawUnsafe(`SAVEPOINT ${savepoint}`);
      try { await expect(operation()).rejects.toThrow(); }
      finally { await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${savepoint}`); await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepoint}`); }
    };
    await attempt(() => tx.automationRun.update({ where: { id: run.id }, data: { status: "TAMPERED" } }));
    await attempt(() => tx.automationRun.delete({ where: { id: run.id } }));
    await attempt(() => tx.automationVersion.update({ where: { id: version.id }, data: { reason: "Forged automation history" } }));
    await attempt(() => tx.automationReceipt.updateMany({ where: { organizationId: owner.organizationId }, data: { payloadHash: "0".repeat(64) } }));
    expect(await tx.automationRun.findUniqueOrThrow({ where: { id: run.id } })).toMatchObject({ status: "GENERATED" });
  }));

  test("event-name selection rejects self-triggering automation events", async () => fixture(async ({ automation, owner, tx }) => {
    expect(automationEventNames).toContain("task.created");
    expect(automationEventNames.every((name) => name.startsWith("task.") || name.startsWith("project."))).toBe(true);
    expect(automationEventNames).not.toContain("fake.internal_event");
    const before = await tx.automationRecord.count({ where: { organizationId: owner.organizationId } });
    await expect(automation.saveRule(owner, { ...rule(owner.accountId, { kind: "NOTIFY" }), eventNames: ["automation.run_created"] })).rejects.toThrow();
    expect(await tx.automationRecord.count({ where: { organizationId: owner.organizationId } })).toBe(before);
  }));
});

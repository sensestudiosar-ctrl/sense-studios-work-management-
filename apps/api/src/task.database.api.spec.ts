import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "./database.service.js";
import { AccountKind, AccountState, PermissionEffect, PermissionScopeKind, Prisma, TaskPriority, TaskReviewRequirement, TaskStatus, TaskType } from "./generated/prisma/client.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { IdentityService } from "./identity.service.js";
import { OrganizationService } from "./organization.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { TaskService } from "./task.service.js";
import { NotificationsService } from "./notifications.service.js";
import { OperationalRecipientPredicate } from "./notification-worker.js";
import { recordProjectEvent } from "./project-events.js";
import type { ProjectActor } from "./project.service.js";
import type { RuntimeConfig } from "./config.js";

const databaseUrl = process.env.DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
class FixtureRollback extends Error {}
const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: databaseUrl ?? "", webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined };

databaseDescribe("S09 task persistence and authorization database integration", () => {
  let database: DatabaseService;
  beforeAll(async () => {
    database = new DatabaseService(config);
    const rows = await database.prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!/_test(?:db)?$/i.test(rows[0]?.name ?? "")) throw new Error("Task checks require a dedicated test database");
  });
  afterAll(async () => database?.onModuleDestroy());

  async function fixture(run: (value: {
    tx: Prisma.TransactionClient; organizationId: string; branchId: string; teamId: string;
    managerActor: ProjectActor; managerEmployeeId: string; employeeId: string; outsiderActor: ProjectActor; ownerActor: ProjectActor;
    ownerId: string; tasks: TaskService; organization: OrganizationService; workflow: ProjectWorkflowService;
  }) => Promise<void>) {
    try {
      await database.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.findFirst() ?? await tx.organization.create({ data: { name: "S09 task fixture" } });
        const suffix = randomUUID();
        const branch = await tx.branch.create({ data: { organizationId: organization.id, name: `S09 branch ${suffix}` } });
        const team = await tx.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `S09 team ${suffix}` } });
        const manager = await tx.account.create({ data: { normalizedEmail: `s09-manager-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
        const employee = await tx.account.create({ data: { normalizedEmail: `s09-employee-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
        const outsider = await tx.account.create({ data: { normalizedEmail: `s09-outsider-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
        const owner = await tx.account.findFirst({ where: { kind: AccountKind.OWNER, state: AccountState.ACTIVE } }) ?? await tx.account.create({ data: { normalizedEmail: `s09-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
        const managerEmployee = await tx.employee.create({ data: { organizationId: organization.id, accountId: manager.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
        const employeeRow = await tx.employee.create({ data: { organizationId: organization.id, accountId: employee.id, homeBranchId: branch.id, homeTeamId: team.id, reportsToId: managerEmployee.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
        await tx.employee.create({ data: { organizationId: organization.id, accountId: outsider.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
        await tx.employeePermissionOverride.create({ data: { organizationId: organization.id, employeeId: managerEmployee.id, permissionKey: "task.assign", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.TEAM, branchId: branch.id, teamId: team.id, reason: "S09 authorized manager fixture" } });
        const proxy = new Proxy(tx, { get(target, key) {
          if (key === "$transaction") return async (callback: (inner: Prisma.TransactionClient) => Promise<unknown>) => {
            await tx.$executeRaw`SAVEPOINT s09_task_command`;
            try { const result = await callback(tx); await tx.$executeRaw`RELEASE SAVEPOINT s09_task_command`; return result; }
            catch (error) { await tx.$executeRaw`ROLLBACK TO SAVEPOINT s09_task_command`; await tx.$executeRaw`RELEASE SAVEPOINT s09_task_command`; throw error; }
          };
          return Reflect.get(target, key, target) as unknown;
        } });
        const db = { prisma: proxy } as unknown as DatabaseService;
        const authorization = new AuthorizationService(db);
        const tasks = new TaskService(db, authorization);
        const identity = new IdentityService(db, config);
        const workflow = new ProjectWorkflowService(db, authorization, new ApprovalService(db));
        const organizationService = new OrganizationService(db, identity, authorization, workflow, tasks, new NotificationsService(db));
        const managerActor: ProjectActor = { accountId: manager.id, organizationId: organization.id, kind: AccountKind.STAFF };
        const outsiderActor: ProjectActor = { accountId: outsider.id, organizationId: organization.id, kind: AccountKind.STAFF };
        const ownerActor: ProjectActor = { accountId: owner.id, organizationId: organization.id, kind: AccountKind.OWNER };
        await run({ tx, organizationId: organization.id, branchId: branch.id, teamId: team.id, managerActor, managerEmployeeId: managerEmployee.id, employeeId: employeeRow.id, outsiderActor, ownerActor, ownerId: owner.id, tasks, organization: organizationService, workflow });
        await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
        throw new FixtureRollback();
      }, { timeout: 30_000 });
    } catch (error) { if (!(error instanceof FixtureRollback)) throw error; }
  }

  const taskInput = (reason: string, extras: Record<string, unknown> = {}) => ({ title: "Prepare studio brief", type: TaskType.NON_PROJECT, priority: TaskPriority.HIGH, targetDate: "2026-10-15", reason, ...extras });

  it("does not list standalone tasks owned by a same-team non-report peer", async () => {
    await fixture(async ({ tx, organizationId, managerActor, outsiderActor, tasks }) => {
      const peer = await tx.employee.findFirstOrThrow({ where: { accountId: outsiderActor.accountId, organizationId } });
      const task = await tasks.create(managerActor, taskInput("Keep peer standalone work private", { ownerEmployeeId: peer.id }));
      await expect(tasks.detail(managerActor, task.id)).rejects.toMatchObject({ status: 403 });
      const list = await tasks.list(managerActor, "all", 0, 50);
      expect(list.items.some((item) => item.id === task.id)).toBe(false);
    });
  });
  it("queues opt-in Waiting alerts only to current scoped managers and suppresses stale recipients", async () => {
    await fixture(async ({ tx, organizationId, teamId, employeeId, managerActor, outsiderActor, ownerActor, tasks, organization }) => {
      const employee = await tx.employee.findUniqueOrThrow({ where: { id: employeeId } });
      const employeeActor: ProjectActor = { accountId: employee.accountId, organizationId, kind: AccountKind.STAFF };
      const task = await tasks.create(managerActor, taskInput("Assign wait-alert task", { ownerEmployeeId: employeeId }));
      await tasks.transition(employeeActor, task.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Begin assigned work" });
      await tasks.wait(employeeActor, task.id, { expectedVersion: 2, reason: "Supplier pending", delayCause: "Missing supplier input" });
      expect(await tx.notification.count({ where: { category: "task.waiting" } })).toBe(0);
      await tasks.resume(employeeActor, task.id, { expectedVersion: 3, reason: "Supplier replied" });
      await organization.changeWaitingAlerts(ownerActor.accountId, teamId, { enabled: true, expectedVersion: 1, reason: "Enable team management Waiting alerts" });
      await tasks.wait(employeeActor, task.id, { expectedVersion: 4, reason: "Supplier revision pending", delayCause: "Revised input awaited" });
      const event = await tx.domainEvent.findFirstOrThrow({ where: { subjectId: task.id, eventName: "task.waiting" }, orderBy: { occurredAt: "desc" } });
      const recipients = await tx.notification.findMany({ where: { eventId: event.id }, select: { recipientAccountId: true } });
      expect(recipients).toEqual(expect.arrayContaining([{ recipientAccountId: managerActor.accountId }, { recipientAccountId: ownerActor.accountId }]));
      expect(recipients).not.toEqual(expect.arrayContaining([{ recipientAccountId: outsiderActor.accountId }, { recipientAccountId: employeeActor.accountId }]));
      await expect(tasks.waitingAlertAuthorized(event.id, managerActor.accountId)).resolves.toBe(true);
      await expect(tasks.waitingAlertAuthorized(event.id, outsiderActor.accountId)).resolves.toBe(false);
      await organization.changeWaitingAlerts(ownerActor.accountId, teamId, { enabled: false, expectedVersion: 2, reason: "Disable team Waiting alerts" });
      await expect(tasks.waitingAlertAuthorized(event.id, ownerActor.accountId)).resolves.toBe(false);
      await organization.changeWaitingAlerts(ownerActor.accountId, teamId, { enabled: true, expectedVersion: 3, reason: "Reenable team Waiting alerts" });
      await tasks.resume(employeeActor, task.id, { expectedVersion: 5, reason: "Inputs received" });
      await expect(tasks.waitingAlertAuthorized(event.id, managerActor.accountId)).resolves.toBe(false);
      await tasks.wait(employeeActor, task.id, { expectedVersion: 6, reason: "New missing input", delayCause: "New supplier dependency" });
      await expect(tasks.waitingAlertAuthorized(event.id, managerActor.accountId)).resolves.toBe(false);
    });
  });

  it("requires the current primary owner and a scoped approver, then atomically records extension decisions", async () => {
    await fixture(async ({ tx, organizationId, branchId, teamId, managerActor, managerEmployeeId, employeeId, outsiderActor, ownerActor, tasks }) => {
      await tx.employeePermissionOverride.create({ data: { organizationId, employeeId: managerEmployeeId, permissionKey: "task.deadline_change", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.TEAM, branchId, teamId, reason: "Scoped deadline extension approver" } });
      const task = await tasks.create(managerActor, taskInput("Give report a committed task", { ownerEmployeeId: employeeId }));
      await tasks.changeCommittedDate(managerActor, task.id, { expectedVersion: 1, committedDueDate: "2026-10-20", reason: "Set original commitment" });
      const employeeAccount = await tx.employee.findUniqueOrThrow({ where: { id: employeeId } });
      const employeeActor: ProjectActor = { accountId: employeeAccount.accountId, organizationId, kind: AccountKind.STAFF };
      await expect(tasks.requestExtension(managerActor, task.id, { expectedVersion: 2, proposedDate: "2026-10-24", approverAccountId: ownerActor.accountId, reason: "Manager cannot submit" })).rejects.toMatchObject({ status: 403 });
      await expect(tasks.requestExtension(employeeActor, task.id, { expectedVersion: 2, proposedDate: "2026-10-24", approverAccountId: outsiderActor.accountId, reason: "Unscoped approver" })).rejects.toMatchObject({ status: 403 });
      await expect(tasks.extensionApprovers(employeeActor, task.id)).resolves.toMatchObject({ items: expect.arrayContaining([expect.objectContaining({ accountId: managerActor.accountId }), expect.objectContaining({ accountId: ownerActor.accountId })]) });
      const first = await tasks.requestExtension(employeeActor, task.id, { expectedVersion: 2, proposedDate: "2026-10-24", approverAccountId: managerActor.accountId, reason: "Supplier needs more time" });
      await expect(tasks.requestExtension(employeeActor, task.id, { expectedVersion: 2, proposedDate: "2026-10-25", approverAccountId: ownerActor.accountId, reason: "Second request blocked" })).rejects.toThrow("already pending");
      await expect(tasks.decideExtension(outsiderActor, task.id, first.approvalId, { outcome: "APPROVED", reason: "Guess approval ID" })).rejects.toMatchObject({ status: 403 });
      await tasks.decideExtension(managerActor, task.id, first.approvalId, { outcome: "REJECTED", reason: "Original date remains achievable" });
      expect((await tx.task.findUniqueOrThrow({ where: { id: task.id } })).committedDueDate?.toISOString().slice(0, 10)).toBe("2026-10-20");
      const second = await tasks.requestExtension(employeeActor, task.id, { expectedVersion: 2, proposedDate: "2026-10-25", approverAccountId: managerActor.accountId, reason: "Revised supplier schedule" });
      await tasks.decideExtension(managerActor, task.id, second.approvalId, { outcome: "APPROVED", reason: "Confirmed revised supplier schedule" });
      const updated = await tx.task.findUniqueOrThrow({ where: { id: task.id } });
      expect(updated).toMatchObject({ version: 3 });
      expect(updated.committedDueDate?.toISOString().slice(0, 10)).toBe("2026-10-25");
      expect(await tx.taskCommittedDateChange.findFirst({ where: { extensionApprovalId: second.approvalId } })).toMatchObject({ taskId: task.id, taskVersion: 3, actorId: managerActor.accountId });
      expect(await tx.auditEvent.count({ where: { subjectId: task.id, eventKey: "task.deadline_changed" } })).toBe(2);
      await expect(tasks.detail(employeeActor, task.id)).resolves.toMatchObject({ extensions: [expect.objectContaining({ state: "REJECTED" }), expect.objectContaining({ state: "APPROVED" })] });
      await expect(tasks.decideExtension(managerActor, task.id, second.approvalId, { outcome: "APPROVED", reason: "Duplicate decision" })).rejects.toThrow("already resolved");
      const stale = await tasks.requestExtension(employeeActor, task.id, { expectedVersion: 3, proposedDate: "2026-10-30", approverAccountId: managerActor.accountId, reason: "Request before schedule review" });
      await tasks.changeCommittedDate(managerActor, task.id, { expectedVersion: 3, committedDueDate: "2026-10-27", reason: "Management revised date directly" });
      await expect(tasks.decideExtension(managerActor, task.id, stale.approvalId, { outcome: "APPROVED", reason: "Stale approval attempt" })).rejects.toThrow("stale");
      expect(await tx.approvalRequest.findUniqueOrThrow({ where: { id: stale.approvalId } })).toMatchObject({ state: "PENDING" });
      expect(await tx.approvalDecision.count({ where: { requestId: stale.approvalId } })).toBe(0);
      expect((await tx.task.findUniqueOrThrow({ where: { id: task.id } })).committedDueDate?.toISOString().slice(0, 10)).toBe("2026-10-27");
      await expect(tasks.withdrawExtension(employeeActor, task.id, stale.approvalId, "Employee cannot withdraw approval")).rejects.toMatchObject({ status: 403 });
      await tasks.withdrawExtension(ownerActor, task.id, stale.approvalId, "Withdraw obsolete extension and allow replacement");
      expect(await tx.approvalRequest.findUniqueOrThrow({ where: { id: stale.approvalId } })).toMatchObject({ state: "WITHDRAWN" });
    });
  });

  it("rolls back approved extension writes on audit failure and rejects forged approval/date evidence", async () => {
    await fixture(async ({ tx, ownerActor, managerActor, tasks }) => {
      const task = await tasks.create(managerActor, taskInput("Create extension atomicity task"));
      await tasks.changeCommittedDate(ownerActor, task.id, { expectedVersion: 1, committedDueDate: "2026-10-20", reason: "Set extension baseline" });
      await expect(tasks.requestExtension(managerActor, task.id, { expectedVersion: 2, proposedDate: "2026-10-20", approverAccountId: ownerActor.accountId, reason: "Invalid equal proposed date" })).rejects.toThrow("later");
      await expect(tasks.requestExtension(managerActor, task.id, { expectedVersion: 2, proposedDate: "2026-10-25", approverAccountId: managerActor.accountId, reason: "Invalid self approval" })).rejects.toMatchObject({ status: 403 });
      const request = await tasks.requestExtension(managerActor, task.id, { expectedVersion: 2, proposedDate: "2026-10-25", approverAccountId: ownerActor.accountId, reason: "Supplier delay requires extension" });
      const baseDatabase = (tasks as unknown as { database: DatabaseService }).database;
      const failingPrisma = new Proxy(baseDatabase.prisma, { get(target, key) {
        if (key === "$transaction") return (callback: (inner: Prisma.TransactionClient) => Promise<unknown>, options?: Prisma.TransactionOptions) => target.$transaction((inner) => callback(new Proxy(inner, { get(txTarget, txKey) {
          if (txKey === "auditEvent") return new Proxy(Reflect.get(txTarget, txKey, txTarget) as object, { get(delegate, method) {
            if (method === "create") return () => Promise.reject(new Error("Injected extension audit failure"));
            return Reflect.get(delegate, method, delegate);
          } });
          return Reflect.get(txTarget, txKey, txTarget);
        } })), options);
        return Reflect.get(target, key, target);
      } });
      const failingTasks = new TaskService({ prisma: failingPrisma } as DatabaseService, new AuthorizationService(baseDatabase));
      await expect(failingTasks.decideExtension(ownerActor, task.id, request.approvalId, { outcome: "APPROVED", reason: "Failed approval must roll back" })).rejects.toThrow("Injected extension audit failure");
      expect(await tx.task.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({ version: 2 });
      expect(await tx.taskCommittedDateChange.count({ where: { taskId: task.id } })).toBe(1);
      expect(await tx.approvalRequest.findUniqueOrThrow({ where: { id: request.approvalId } })).toMatchObject({ state: "PENDING" });
      expect(await tx.approvalDecision.count({ where: { requestId: request.approvalId } })).toBe(0);
      await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
      await tx.$executeRaw`SAVEPOINT forged_extension_decision`;
      await tx.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;
      await tx.approvalDecision.create({ data: { organizationId: ownerActor.organizationId, requestId: request.approvalId, outcome: "APPROVED", deciderId: ownerActor.accountId, reason: "Forge approval without date history" } });
      await tx.approvalRequest.update({ where: { id: request.approvalId }, data: { state: "APPROVED", resolvedAt: new Date() } });
      await expect(tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`).rejects.toThrow("committed-date change");
      await tx.$executeRaw`ROLLBACK TO SAVEPOINT forged_extension_decision`;
      await tx.$executeRaw`SAVEPOINT forged_extension_context`;
      await expect(tx.approvalRequest.update({ where: { id: request.approvalId }, data: { context: { forged: true } } })).rejects.toThrow("immutable");
      await tx.$executeRaw`ROLLBACK TO SAVEPOINT forged_extension_context`;
    });
  });

  it("persists same-project dependencies, requires acknowledged early start, and reauthorizes the waiting-owner notice", async () => {
    await fixture(async ({ tx, organizationId, branchId, managerEmployeeId, managerActor, outsiderActor, ownerActor, ownerId, tasks, workflow }) => {
      const project = await tx.project.create({ data: { organizationId, branchId, title: `Dependency project ${randomUUID()}`, deliveryType: "DESIGN", createdById: ownerId } });
      await tx.projectScope.create({ data: { organizationId, projectId: project.id, name: "Delivery", normalizedName: "delivery" } });
      await tx.employeePermissionOverride.create({ data: { organizationId, employeeId: managerEmployeeId, permissionKey: "project.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId, reason: "Dependency owner view" } });
      await tx.employeePermissionOverride.create({ data: { organizationId, employeeId: managerEmployeeId, permissionKey: "project.manage", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId, reason: "Dependency owner manage" } });
      await tx.employeePermissionOverride.create({ data: { organizationId, employeeId: managerEmployeeId, permissionKey: "task.assign", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId, reason: "Dependency manager authority" } });
      await workflow.assignment(ownerActor, project.id, { employeeId: managerEmployeeId, expectedVersion: 1, reason: "Assign dependency owner" });
      await workflow.lead(ownerActor, project.id, { employeeId: managerEmployeeId, expectedVersion: 2, reason: "Appoint dependency lead" });
      await workflow.status(ownerActor, project.id, { toStatus: "ACTIVE", expectedVersion: 3, reason: "Activate dependency project" });
      const a = await tasks.create(ownerActor, taskInput("Create predecessor", { type: TaskType.PROJECT, projectId: project.id, ownerEmployeeId: managerEmployeeId }));
      const b = await tasks.create(ownerActor, taskInput("Create dependent", { type: TaskType.PROJECT, projectId: project.id, ownerEmployeeId: managerEmployeeId }));
      const c = await tasks.create(ownerActor, taskInput("Create indirect-cycle candidate", { title: "Indirect-cycle candidate", type: TaskType.PROJECT, projectId: project.id, ownerEmployeeId: managerEmployeeId }));
      await expect(tasks.dependencyCandidates(managerActor, b.id)).resolves.toMatchObject({ items: expect.arrayContaining([expect.objectContaining({ id: a.id })]) });
      await expect(tasks.dependencyCandidates(managerActor, b.id, "indirect-cycle")).resolves.toMatchObject({ items: [expect.objectContaining({ id: c.id })] });
      await expect(tasks.dependencyCandidates(outsiderActor, b.id)).rejects.toMatchObject({ status: 403 });
      await expect(tasks.addDependency(outsiderActor, b.id, { predecessorTaskId: a.id, expectedVersion: 1, reason: "Guess inaccessible project tasks" })).rejects.toMatchObject({ status: 403 });
      await expect(tasks.addDependency(managerActor, b.id, { predecessorTaskId: b.id, expectedVersion: 1, reason: "Invalid self link" })).rejects.toThrow("same project");
      await tasks.addDependency(managerActor, b.id, { predecessorTaskId: a.id, expectedVersion: 1, reason: "Wait for predecessor" });
      await expect(tasks.addDependency(managerActor, b.id, { predecessorTaskId: a.id, expectedVersion: 1, reason: "Stale dependency version" })).rejects.toThrow("Task changed");
      await expect(tasks.addDependency(managerActor, b.id, { predecessorTaskId: a.id, expectedVersion: 2, reason: "Duplicate active dependency" })).rejects.toThrow("Dependency link changed");
      const baseDatabase = (tasks as unknown as { database: DatabaseService }).database;
      const failingPrisma = new Proxy(baseDatabase.prisma, { get(target, key) {
        if (key === "$transaction") return (callback: (inner: Prisma.TransactionClient) => Promise<unknown>, options?: Prisma.TransactionOptions) => target.$transaction((inner) => callback(new Proxy(inner, { get(txTarget, txKey) {
          if (txKey === "auditEvent") return new Proxy(Reflect.get(txTarget, txKey, txTarget) as object, { get(delegate, method) {
            if (method === "create") return () => Promise.reject(new Error("Injected dependency audit failure"));
            return Reflect.get(delegate, method, delegate);
          } });
          return Reflect.get(txTarget, txKey, txTarget);
        } })), options);
        return Reflect.get(target, key, target);
      } });
      const failingTasks = new TaskService({ prisma: failingPrisma } as DatabaseService, new AuthorizationService(baseDatabase));
      await expect(failingTasks.addDependency(ownerActor, b.id, { predecessorTaskId: c.id, expectedVersion: 2, reason: "Failed audit must roll back link" })).rejects.toThrow("Injected dependency audit failure");
      expect(await tx.task.findUniqueOrThrow({ where: { id: b.id } })).toMatchObject({ version: 2, dependencyRevision: 1 });
      expect(await tx.taskDependency.count({ where: { dependentTaskId: b.id, removedAt: null } })).toBe(1);
      await tasks.addDependency(managerActor, c.id, { predecessorTaskId: b.id, expectedVersion: 1, reason: "Establish indirect graph path" });
      await expect(tasks.addDependency(managerActor, a.id, { predecessorTaskId: c.id, expectedVersion: 1, reason: "Attempt indirect graph cycle" })).rejects.toThrow("cycle");
      await tx.$executeRaw`SAVEPOINT s10c_unmatched_edge`;
      await tx.task.update({ where: { id: b.id }, data: { version: 3, dependencyRevision: 2 } });
      await expect(tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`).rejects.toThrow("Dependency revision requires immutable edge");
      await tx.$executeRaw`ROLLBACK TO SAVEPOINT s10c_unmatched_edge`;
      await expect(tasks.detail(managerActor, b.id)).resolves.toMatchObject({ dependencies: { hasUnfinished: true, predecessors: [expect.objectContaining({ id: a.id })] }, capabilities: { manageDependencies: true } });
      await expect(tasks.addDependency(managerActor, a.id, { predecessorTaskId: b.id, expectedVersion: 1, reason: "Attempt opposite cycle" })).rejects.toThrow("cycle");
      await expect(tasks.transition(managerActor, b.id, { toState: "IN_PROGRESS", expectedVersion: 2, reason: "Start early without consent" })).rejects.toThrow("acknowledgement");
      await tasks.transition(managerActor, b.id, { toState: "IN_PROGRESS", expectedVersion: 2, reason: "Start early with consent", acknowledgeUnfinishedDependencies: true });
      expect(await tx.taskStatusChange.findFirst({ where: { taskId: b.id, taskVersion: 3 } })).toMatchObject({ earlyStartAcknowledged: true, unfinishedPredecessorIds: [a.id] });
      await tasks.wait(managerActor, b.id, { expectedVersion: 3, reason: "Predecessor pending", delayCause: "Dependency pending" });
      await tasks.transition(managerActor, a.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Start predecessor" });
      await tasks.transition(managerActor, a.id, { toState: "COMPLETED", expectedVersion: 2, reason: "Finish predecessor" });
      const event = await tx.domainEvent.findFirstOrThrow({ where: { eventName: "task.dependency_completed", subjectId: b.id } });
      expect(await tx.notification.count({ where: { eventId: event.id, recipientAccountId: managerActor.accountId } })).toBe(1);
      const predicate = new OperationalRecipientPredicate({ prisma: tx } as DatabaseService, new AuthorizationService({ prisma: tx } as DatabaseService));
      await expect(predicate.isAuthorized(event.id, managerActor.accountId)).resolves.toBe(true);
      const ready = await tasks.create(ownerActor, taskInput("Create ready dependent", { type: TaskType.PROJECT, projectId: project.id, ownerEmployeeId: managerEmployeeId }));
      await tasks.addDependency(managerActor, ready.id, { predecessorTaskId: a.id, expectedVersion: 1, reason: "Link already completed predecessor" });
      await expect(tasks.transition(managerActor, ready.id, { toState: "IN_PROGRESS", expectedVersion: 2, reason: "Start after predecessor completion" })).resolves.toMatchObject({ status: TaskStatus.IN_PROGRESS });
      const otherProject = await tx.project.create({ data: { organizationId, branchId, title: `Other dependency project ${randomUUID()}`, deliveryType: "DESIGN", createdById: ownerId } });
      await tx.projectScope.create({ data: { organizationId, projectId: otherProject.id, name: "Delivery", normalizedName: "delivery" } });
      await workflow.assignment(ownerActor, otherProject.id, { employeeId: managerEmployeeId, expectedVersion: 1, reason: "Assign other project owner" });
      await workflow.lead(ownerActor, otherProject.id, { employeeId: managerEmployeeId, expectedVersion: 2, reason: "Appoint other project lead" });
      await workflow.status(ownerActor, otherProject.id, { toStatus: "ACTIVE", expectedVersion: 3, reason: "Activate other project" });
      const outside = await tasks.create(ownerActor, taskInput("Create cross-project predecessor", { type: TaskType.PROJECT, projectId: otherProject.id, ownerEmployeeId: managerEmployeeId }));
      await expect(tasks.addDependency(ownerActor, b.id, { predecessorTaskId: outside.id, expectedVersion: 4, reason: "Cross-project link denied" })).rejects.toThrow("same project");
      await tasks.removeDependency(managerActor, b.id, a.id, { expectedVersion: 4, reason: "Remove completed predecessor" });
      await expect(predicate.isAuthorized(event.id, managerActor.accountId)).resolves.toBe(false);
      expect(await tx.taskDependency.count({ where: { dependentTaskId: b.id, removedAt: null } })).toBe(0);
    });
  });

  it("separates personal ownership and collaboration from management and an employee-less Owner", async () => {
    await fixture(async ({ managerActor, managerEmployeeId, employeeId, ownerActor, tasks }) => {
      const owned = await tasks.create(managerActor, taskInput("Own personal work"));
      const collaboration = await tasks.create(ownerActor, taskInput("Collaborative personal work", { ownerEmployeeId: employeeId, collaborators: [{ employeeId: managerEmployeeId }] }));
      const managedOnly = await tasks.create(ownerActor, taskInput("Managed work only", { ownerEmployeeId: employeeId }));
      const personal = await tasks.list(managerActor, "personal", 0, 50);
      expect(new Set(personal.items.map(row => row.id))).toEqual(new Set([owned.id, collaboration.id]));
      expect(personal.total).toBe(2);
      expect(personal.items.map(row => row.id)).not.toContain(managedOnly.id);
      await expect(tasks.list(ownerActor, "personal", 0, 50)).resolves.toMatchObject({ total: 0, items: [] });
      await expect(tasks.list(managerActor, "personal", 0, 50, { ownerEmployeeId: employeeId })).resolves.toMatchObject({ total: 1, items: [expect.objectContaining({ id: collaboration.id })] });
    });
  });
  it("applies explicit phase and date basis before scoped count/pagination", async () => {
    await fixture(async ({ managerActor, ownerActor, tasks }) => {
      const active = await tasks.create(managerActor, taskInput("Active with explicit dates", { targetDate: "2026-10-10" }));
      const completed = await tasks.create(managerActor, taskInput("Completed fixture", { targetDate: "2026-10-10" }));
      await tasks.changeCommittedDate(ownerActor, active.id, { committedDueDate: "2026-11-10", expectedVersion: 1, reason: "Choose explicit committed date basis" });
      await tasks.transition(managerActor, completed.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Start completed filter fixture" });
      await tasks.transition(managerActor, completed.id, { toState: "COMPLETED", expectedVersion: 2, reason: "Finish completed filter fixture" });
      await expect(tasks.list(managerActor, "personal", 0, 1, { phase: "active" })).resolves.toMatchObject({ total: 1, items: [expect.objectContaining({ id: active.id })] });
      await expect(tasks.list(managerActor, "personal", 0, 50, { phase: "completed" })).resolves.toMatchObject({ total: 1, items: [expect.objectContaining({ id: completed.id })] });
      await expect(tasks.list(managerActor, "personal", 0, 50, { dateBasis: "committed", dateFrom: "2026-11-10", dateTo: "2026-11-10" })).resolves.toMatchObject({ total: 1, items: [expect.objectContaining({ id: active.id })] });
      await expect(tasks.list(managerActor, "personal", 0, 50, { dateBasis: "target", dateFrom: "2026-11-10" })).resolves.toMatchObject({ total: 0, items: [] });
    });
  });

  it("filters the authorized task set before counting and paginating without widening staff scope", async () => {
    await fixture(async ({ managerActor, managerEmployeeId, employeeId, outsiderActor, ownerActor, tasks }) => {
      await tasks.create(ownerActor, taskInput("Other owner work", { ownerEmployeeId: employeeId }));
      const first = await tasks.create(managerActor, taskInput("Create matching first", { title: "Matching design first" }));
      const second = await tasks.create(managerActor, taskInput("Create matching second", { title: "Matching design second" }));
      await tasks.transition(managerActor, second.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Begin filtered work" });
      const filters = { q: "MATCHING DESIGN", ownerEmployeeId: managerEmployeeId };
      const page1 = await tasks.list(ownerActor, "mine", 0, 1, filters);
      const page2 = await tasks.list(ownerActor, "mine", 1, 1, filters);
      expect(page1.total).toBe(2); expect(page2.total).toBe(2);
      expect(new Set([...page1.items, ...page2.items].map(row => row.id))).toEqual(new Set([first.id, second.id]));
      await expect(tasks.list(managerActor, "mine", 0, 20, { ...filters, status: TaskStatus.IN_PROGRESS })).resolves.toMatchObject({ total: 1, items: [expect.objectContaining({ id: second.id })] });
      await expect(tasks.list(managerActor, "mine", 0, 20, { ownerEmployeeId: employeeId })).resolves.toMatchObject({ total: 0, items: [] });
      await expect(tasks.list(outsiderActor, "assigned", 0, 20, filters)).resolves.toMatchObject({ total: 0, items: [] });
      await expect(tasks.list(ownerActor, "mine", 0, 20, { projectId: randomUUID() })).resolves.toMatchObject({ total: 0, items: [] });
      await expect(tasks.list(ownerActor, "mine", 0, 20, { ownerEmployeeId: randomUUID() })).resolves.toMatchObject({ total: 0, items: [] });
    });
  });
  it("persists a self-task, exposes it to its owner, records state history, and rejects guessed IDs and stale versions", async () => {
    await fixture(async ({ tx, managerActor, outsiderActor, tasks }) => {
      const created = await tasks.create(managerActor, taskInput("Self-task integration fixture"));
      expect(created.primaryOwnerEmployeeId).toBe((await tx.employee.findUniqueOrThrow({ where: { accountId: managerActor.accountId } })).id);
      expect(created.status).toBe(TaskStatus.NOT_STARTED);
      await expect(tasks.detail(managerActor, created.id)).resolves.toMatchObject({ task: { id: created.id, version: 1 }, history: { statusChanges: [expect.objectContaining({ toStatus: TaskStatus.NOT_STARTED })] } });
      await expect(tasks.list(managerActor, "mine", 0, 20)).resolves.toMatchObject({ total: 1, items: [expect.objectContaining({ id: created.id })] });
      await expect(tasks.detail(managerActor, randomUUID())).rejects.toThrow("Task not found");
      await expect(tasks.detail(outsiderActor, created.id)).rejects.toThrow("Permission denied");
      await tasks.transition(managerActor, created.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Begin the brief" });
      await expect(tasks.transition(managerActor, created.id, { toState: "COMPLETED", expectedVersion: 1, reason: "Stale completion attempt" })).rejects.toThrow("Task changed");
      await tasks.transition(managerActor, created.id, { toState: "COMPLETED", expectedVersion: 2, reason: "Brief is complete" });
      expect(await tx.taskStatusChange.count({ where: { taskId: created.id } })).toBe(3);
      expect(await tx.task.count({ where: { id: created.id, status: TaskStatus.COMPLETED, version: 3 } })).toBe(1);
    });
  });

  it("allows an authorized manager to assign a report, while self-assignment of others and out-of-tree assignments fail", async () => {
    await fixture(async ({ tx, managerActor, employeeId, outsiderActor, tasks }) => {
      const assigned = await tasks.create(managerActor, taskInput("Assign to direct report", { ownerEmployeeId: employeeId }));
      expect(assigned.primaryOwnerEmployeeId).toBe(employeeId);
      await expect(tasks.detail(managerActor, assigned.id)).resolves.toMatchObject({ capabilities: { reassign: true } });
      await expect(tasks.list(managerActor, "assigned", 0, 20)).resolves.toMatchObject({ total: 1 });
      const unrelated = await tasks.create(outsiderActor, taskInput("Private unrelated task"));
      await expect(tasks.reassign(managerActor, unrelated.id, { newOwnerEmployeeId: employeeId, expectedVersion: 1, reason: "Attempt to take unrelated work" })).rejects.toMatchObject({ status: 403 });
      await expect(tasks.create(managerActor, taskInput("Ordinary employee cannot assign", { ownerEmployeeId: (await tx.employee.findUniqueOrThrow({ where: { accountId: outsiderActor.accountId } })).id }))).rejects.toThrow("reporting tree");
      await expect(tasks.create(outsiderActor, taskInput("Employee cannot assign another", { ownerEmployeeId: employeeId }))).rejects.toMatchObject({ status: 403 });
      expect(await tx.task.count({ where: { createdById: { in: [managerActor.accountId, outsiderActor.accountId] } } })).toBe(2);
      expect(await tx.taskOwnerChange.count({ where: { taskId: { in: [assigned.id, unrelated.id] } } })).toBe(0);
    });
  });

  it("fails closed on a required review gate and rejects guessed project IDs before creating task evidence", async () => {
    await fixture(async ({ tx, managerActor, tasks }) => {
      const reviewTask = await tasks.create(managerActor, taskInput("Review gate fixture", { reviewRequirement: TaskReviewRequirement.INTERNAL }));
      await tasks.transition(managerActor, reviewTask.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Start reviewed work" });
      await expect(tasks.transition(managerActor, reviewTask.id, { toState: "COMPLETED", expectedVersion: 2, reason: "Attempt completion without review" })).rejects.toThrow("review");
      await expect(tasks.create(managerActor, taskInput("Unknown project task", { type: TaskType.PROJECT, projectId: randomUUID() }))).rejects.toThrow("Project not found");
      expect(await tx.task.count({ where: { createdById: managerActor.accountId } })).toBe(1);
      expect(await tx.taskStatusChange.count({ where: { taskId: reviewTask.id } })).toBe(2);
    });
  });

  it("persists ordinary Waiting cause and party, denies non-owner progress, and resumes only the saved state", async () => {
    await fixture(async ({ tx, managerActor, employeeId, outsiderActor, ownerActor, tasks }) => {
      const created = await tasks.create(managerActor, taskInput("Ordinary waiting integration", { reviewRequirement: TaskReviewRequirement.INTERNAL, collaborators: [{ employeeId }] }));
      const collaborator = await tx.employee.findUniqueOrThrow({ where: { id: employeeId } });
      const collaboratorActor: ProjectActor = { ...managerActor, accountId: collaborator.accountId };
      await expect(tasks.wait(managerActor, created.id, { expectedVersion: 1, reason: "Wait before start", delayCause: "Client pending" })).rejects.toThrow("in-progress");
      await tasks.transition(managerActor, created.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Start before waiting" });
      await expect(tasks.wait(collaboratorActor, created.id, { expectedVersion: 2, reason: "Collaborator cannot wait", delayCause: "Client pending" })).rejects.toMatchObject({ status: 403 });
      await expect(tasks.wait(outsiderActor, created.id, { expectedVersion: 2, reason: "Guess another task", delayCause: "Client pending" })).rejects.toMatchObject({ status: 403 });
      await expect(tasks.resume(managerActor, created.id, { expectedVersion: 2, reason: "Resume before wait" })).rejects.toThrow("ordinary Waiting");
      const waiting = await tasks.wait(managerActor, created.id, { expectedVersion: 2, reason: "Waiting for signed brief", delayCause: "  Client pending  ", responsibleParty: "  Primary client  " });
      expect(waiting).toMatchObject({ status: TaskStatus.WAITING, version: 3, requiresReassignment: false, waitingPreviousStatus: TaskStatus.IN_PROGRESS, waitingReason: "Waiting for signed brief", waitingDelayCause: "Client pending", waitingResponsibleParty: "Primary client" });
      await expect(tasks.detail(managerActor, created.id)).resolves.toMatchObject({ task: { waitingDelayCause: "Client pending" }, capabilities: { wait: false, resume: true } });
      await expect(tasks.resume(collaboratorActor, created.id, { expectedVersion: 3, reason: "Collaborator cannot resume" })).rejects.toMatchObject({ status: 403 });
      await expect(tasks.resume(managerActor, created.id, { expectedVersion: 2, reason: "Stale resume attempt" })).rejects.toThrow("Task changed");
      const resumed = await tasks.resume(ownerActor, created.id, { expectedVersion: 3, reason: "Signed brief received" });
      expect(resumed).toMatchObject({ status: TaskStatus.IN_PROGRESS, version: 4, waitingPreviousStatus: null, waitingReason: null, waitingDelayCause: null, waitingResponsibleParty: null });
      await expect(tasks.transition(managerActor, created.id, { toState: "COMPLETED", expectedVersion: 4, reason: "Attempt review bypass" })).rejects.toThrow("review");
      expect(await tx.taskStatusChange.findMany({ where: { taskId: created.id, delayCause: { not: null } }, orderBy: { taskVersion: "asc" } })).toEqual([expect.objectContaining({ toStatus: TaskStatus.WAITING, delayCause: "Client pending", responsibleParty: "Primary client", previousStatus: TaskStatus.IN_PROGRESS }), expect.objectContaining({ fromStatus: TaskStatus.WAITING, toStatus: TaskStatus.IN_PROGRESS, delayCause: "Client pending", responsibleParty: "Primary client" })]);
      expect(await tx.domainEvent.count({ where: { subjectId: created.id } })).toBe(4);
      expect(await tx.outboxDelivery.count({ where: { event: { subjectId: created.id } } })).toBe(4);
    });
  });

  it("sets and changes committed due dates only with existing manager scope plus a distinct date grant", async () => {
    await fixture(async ({ tx, organizationId, branchId, teamId, managerActor, managerEmployeeId, employeeId, outsiderActor, ownerActor, tasks }) => {
      const task = await tasks.create(managerActor, taskInput("Assigned date authority fixture", { ownerEmployeeId: employeeId }));
      const employee = await tx.employee.findUniqueOrThrow({ where: { id: employeeId } });
      const employeeActor: ProjectActor = { ...managerActor, accountId: employee.accountId };
      await expect(tasks.detail(managerActor, task.id)).resolves.toMatchObject({ capabilities: { changeCommittedDate: false } });
      await expect(tasks.changeCommittedDate(managerActor, task.id, { expectedVersion: 1, committedDueDate: "2026-10-20", reason: "Management commitment" })).rejects.toMatchObject({ status: 403 });
      await expect(tasks.changeCommittedDate(employeeActor, task.id, { expectedVersion: 1, committedDueDate: "2026-10-20", reason: "Owner self-change denied" })).rejects.toMatchObject({ status: 403 });
      await expect(tasks.changeCommittedDate(outsiderActor, task.id, { expectedVersion: 1, committedDueDate: "2026-10-20", reason: "Unrelated scope denied" })).rejects.toMatchObject({ status: 403 });
      await tx.employeePermissionOverride.create({ data: { organizationId, employeeId: managerEmployeeId, permissionKey: "task.deadline_change", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.TEAM, branchId, teamId, reason: "Explicit date authority" } });
      await expect(tasks.detail(managerActor, task.id)).resolves.toMatchObject({ capabilities: { changeCommittedDate: true }, history: { committedDateChanges: [] } });
      const initial = await tasks.changeCommittedDate(managerActor, task.id, { expectedVersion: 1, committedDueDate: "2026-10-20", reason: "Committed to client design brief" });
      expect(initial).toMatchObject({ committedDueDate: new Date("2026-10-20T00:00:00Z"), targetDate: task.targetDate, version: 2 });
      expect(await tx.taskCommittedDateChange.findMany({ where: { taskId: task.id } })).toEqual([expect.objectContaining({ oldDate: null, newDate: new Date("2026-10-20T00:00:00Z"), actorId: managerActor.accountId, reason: "Committed to client design brief", taskVersion: 2 })]);
      await expect(tasks.changeCommittedDate(managerActor, task.id, { expectedVersion: 1, committedDueDate: "2026-10-21", reason: "Stale change" })).rejects.toThrow("Task changed");
      await expect(tasks.changeCommittedDate(managerActor, task.id, { expectedVersion: 2, committedDueDate: "2026-10-20", reason: "Duplicate commitment" })).rejects.toThrow("must change");
      await expect(tasks.changeCommittedDate(managerActor, task.id, { expectedVersion: 2, committedDueDate: "2026-02-30", reason: "Invalid calendar date" })).rejects.toThrow("invalid");
      await expect(tasks.changeCommittedDate(managerActor, task.id, { expectedVersion: 2, committedDueDate: "2026-10-22", reason: " " })).rejects.toThrow("reason");
      await tx.$executeRaw`SAVEPOINT s10b_unmatched_date`;
      await tx.task.update({ where: { id: task.id }, data: { committedDueDate: new Date("2026-10-22T00:00:00Z"), version: 3 } });
      await expect(tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`).rejects.toThrow("matching immutable history");
      await tx.$executeRaw`ROLLBACK TO SAVEPOINT s10b_unmatched_date`;
      const changed = await tasks.changeCommittedDate(ownerActor, task.id, { expectedVersion: 2, committedDueDate: "2026-10-22", reason: "Owner moved the commitment" });
      expect(changed).toMatchObject({ version: 3, committedDueDate: new Date("2026-10-22T00:00:00Z") });
      await expect(tasks.detail(managerActor, task.id)).resolves.toMatchObject({ history: { committedDateChanges: [expect.objectContaining({ oldDate: null, taskVersion: 2 }), expect.objectContaining({ oldDate: new Date("2026-10-20T00:00:00Z"), taskVersion: 3 })] } });
      expect(await tx.auditEvent.count({ where: { subjectId: task.id, eventKey: "task.deadline_changed" } })).toBe(2);
      expect(await tx.domainEvent.count({ where: { subjectId: task.id, eventName: "task.deadline_changed" } })).toBe(2);
      expect(await tx.outboxDelivery.count({ where: { event: { subjectId: task.id, eventName: "task.deadline_changed" } } })).toBe(2);
      const baseDatabase = (tasks as unknown as { database: DatabaseService }).database;
      const failingPrisma = new Proxy(baseDatabase.prisma, { get(target, key) {
        if (key === "$transaction") return (callback: (inner: Prisma.TransactionClient) => Promise<unknown>, options?: Prisma.TransactionOptions) => target.$transaction((inner) => callback(new Proxy(inner, { get(txTarget, txKey) {
          if (txKey === "auditEvent") return new Proxy(Reflect.get(txTarget, txKey, txTarget) as object, { get(delegate, method) {
            if (method === "create") return () => Promise.reject(new Error("Injected committed-date audit failure"));
            return Reflect.get(delegate, method, delegate);
          } });
          return Reflect.get(txTarget, txKey, txTarget);
        } })), options);
        return Reflect.get(target, key, target);
      } });
      const failingTasks = new TaskService({ prisma: failingPrisma } as DatabaseService, new AuthorizationService(baseDatabase));
      await expect(failingTasks.changeCommittedDate(ownerActor, task.id, { expectedVersion: 3, committedDueDate: "2026-10-24", reason: "Failed audit should roll back" })).rejects.toThrow("Injected committed-date audit failure");
      expect(await tx.task.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({ committedDueDate: new Date("2026-10-22T00:00:00Z"), version: 3 });
      expect(await tx.taskCommittedDateChange.count({ where: { taskId: task.id } })).toBe(2);
      expect(await tx.domainEvent.count({ where: { subjectId: task.id, eventName: "task.deadline_changed" } })).toBe(2);
      await tx.$executeRaw`SAVEPOINT s10b_tampered_history`;
      await expect(tx.$executeRaw`UPDATE "task_committed_date_changes" SET "reason"='Tampered history' WHERE "taskId"=${task.id}::uuid`).rejects.toThrow("append-only");
      await tx.$executeRaw`ROLLBACK TO SAVEPOINT s10b_tampered_history`;

      const forgedTask = await tasks.create(managerActor, taskInput("Forged history fixture"));
      await tasks.transition(managerActor, forgedTask.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Ordinary version two" });
      await tx.$executeRaw`SAVEPOINT s10b_forged_history`;
      await recordProjectEvent(tx, { organizationId, actorId: managerActor.accountId, eventName: "task.deadline_changed", subjectType: "task", subjectId: forgedTask.id, reason: "Forged date change", before: { committedDueDate: null, version: 1 }, after: { committedDueDate: "2026-11-01", version: 2 } });
      await tx.taskCommittedDateChange.create({ data: { organizationId, taskId: forgedTask.id, oldDate: null, newDate: new Date("2026-11-01T00:00:00Z"), actorId: managerActor.accountId, reason: "Forged date change", taskVersion: 2 } });
      await expect(tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`).rejects.toThrow("canonical audit evidence");
      await tx.$executeRaw`ROLLBACK TO SAVEPOINT s10b_forged_history`;
    });
  });

  it("denies committed-date changes on terminal, exit-wait and approved closeout work", async () => {
    await fixture(async ({ tx, organizationId, branchId, managerActor, managerEmployeeId, ownerActor, ownerId, tasks, organization, workflow }) => {
      const terminal = await tasks.create(managerActor, taskInput("Date terminal fixture"));
      await tasks.transition(managerActor, terminal.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Start terminal fixture" });
      await tasks.transition(managerActor, terminal.id, { toState: "COMPLETED", expectedVersion: 2, reason: "Finish terminal fixture" });
      await expect(tasks.changeCommittedDate(ownerActor, terminal.id, { expectedVersion: 3, committedDueDate: "2026-10-20", reason: "Cannot change completed work" })).rejects.toThrow("Task state");
      const project = await tx.project.create({ data: { organizationId, branchId, title: "Date hold fixture", deliveryType: "DESIGN", createdById: ownerId } });
      await tx.projectScope.create({ data: { organizationId, projectId: project.id, name: "Delivery", normalizedName: "delivery" } });
      await tx.employeePermissionOverride.create({ data: { organizationId, employeeId: managerEmployeeId, permissionKey: "project.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId, reason: "Date hold read access" } });
      await tx.employeePermissionOverride.create({ data: { organizationId, employeeId: managerEmployeeId, permissionKey: "project.manage", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId, reason: "Date hold lead access" } });
      await workflow.assignment(ownerActor, project.id, { employeeId: managerEmployeeId, expectedVersion: 1, reason: "Assign hold fixture" });
      await workflow.lead(ownerActor, project.id, { employeeId: managerEmployeeId, expectedVersion: 2, reason: "Appoint hold fixture lead" });
      await workflow.status(ownerActor, project.id, { toStatus: "ACTIVE", expectedVersion: 3, reason: "Activate date fixture" });
      const projectTask = await tasks.create(ownerActor, taskInput("Held project date fixture", { type: TaskType.PROJECT, projectId: project.id, ownerEmployeeId: managerEmployeeId }));
      await workflow.status(ownerActor, project.id, { toStatus: "ON_HOLD", expectedVersion: 4, reason: "Pause committed decisions" });
      await expect(tasks.changeCommittedDate(ownerActor, projectTask.id, { expectedVersion: 1, committedDueDate: "2026-10-20", reason: "Cannot commit while held" })).rejects.toThrow("Project status");
      const exitTask = await tasks.create(managerActor, taskInput("Date exit fixture"));
      await organization.finalizeEmployeeExit(ownerId, exitTask.primaryOwnerEmployeeId, "Exit with uncommitted work");
      await expect(tasks.changeCommittedDate(ownerActor, exitTask.id, { expectedVersion: 2, committedDueDate: "2026-10-20", reason: "Cannot bypass exit handover" })).rejects.toThrow("Task state");
      expect(await tx.taskCommittedDateChange.count({ where: { taskId: { in: [terminal.id, projectTask.id, exitTask.id] } } })).toBe(0);
    });
  });

  it("keeps ordinary Waiting on reassignment and prevents the ordinary resume command bypassing an employee exit", async () => {
    await fixture(async ({ tx, managerActor, employeeId, ownerActor, ownerId, tasks, organization }) => {
      const task = await tasks.create(managerActor, taskInput("Wait before handover"));
      await tasks.transition(managerActor, task.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Start handover fixture" });
      await tasks.wait(managerActor, task.id, { expectedVersion: 2, reason: "Site unavailable", delayCause: "Site locked", responsibleParty: "Building manager" });
      const reassigned = await tasks.reassign(managerActor, task.id, { newOwnerEmployeeId: employeeId, expectedVersion: 3, reason: "Assign follow-up owner" });
      expect(reassigned).toMatchObject({ status: TaskStatus.WAITING, waitingPreviousStatus: TaskStatus.IN_PROGRESS, waitingDelayCause: "Site locked", waitingResponsibleParty: "Building manager", version: 4 });
      const newOwner = await tx.employee.findUniqueOrThrow({ where: { id: employeeId } });
      await expect(tasks.resume(managerActor, task.id, { expectedVersion: 4, reason: "Manager cannot resume for employee" })).rejects.toMatchObject({ status: 403 });
      const employeeActor: ProjectActor = { ...managerActor, accountId: newOwner.accountId };
      await expect(tasks.detail(employeeActor, task.id)).resolves.toMatchObject({ capabilities: { resume: true } });
      await organization.finalizeEmployeeExit(ownerId, employeeId, "Employee exited during waiting");
      expect(await tx.task.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({ status: TaskStatus.WAITING, requiresReassignment: true, waitingDelayCause: null, waitingResponsibleParty: null, version: 5 });
      await expect(tasks.resume(ownerActor, task.id, { expectedVersion: 5, reason: "Attempt exit wait bypass" })).rejects.toThrow("reassign");
      await expect(tasks.resume(employeeActor, task.id, { expectedVersion: 5, reason: "Exited owner attempt" })).rejects.toMatchObject({ status: 403 });
      await tasks.reassign(ownerActor, task.id, { newOwnerEmployeeId: (await tx.employee.findUniqueOrThrow({ where: { accountId: managerActor.accountId } })).id, expectedVersion: 5, reason: "Explicit eligible reassignment" });
      expect(await tx.task.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({ status: TaskStatus.IN_PROGRESS, requiresReassignment: false, version: 6 });
      expect(await tx.taskStatusChange.count({ where: { taskId: task.id, delayCause: "Site locked" } })).toBe(1);
    });
  });

  it("rolls ordinary Waiting back on audit failure and rejects SQL waiting without matching immutable evidence", async () => {
    await fixture(async ({ tx, managerActor, tasks }) => {
      const task = await tasks.create(managerActor, taskInput("Waiting rollback fixture"));
      await tasks.transition(managerActor, task.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Start rollback fixture" });
      const baseDatabase = (tasks as unknown as { database: DatabaseService }).database;
      const failingPrisma = new Proxy(baseDatabase.prisma, { get(target, key) {
        if (key === "$transaction") return (callback: (inner: Prisma.TransactionClient) => Promise<unknown>, options?: Prisma.TransactionOptions) => target.$transaction((inner) => callback(new Proxy(inner, { get(txTarget, txKey) {
          if (txKey === "auditEvent") return new Proxy(Reflect.get(txTarget, txKey, txTarget) as object, { get(delegate, method) {
            if (method === "create") return () => Promise.reject(new Error("Injected ordinary-wait audit failure"));
            return Reflect.get(delegate, method, delegate);
          } });
          return Reflect.get(txTarget, txKey, txTarget);
        } })), options);
        return Reflect.get(target, key, target);
      } });
      const failingTasks = new TaskService({ prisma: failingPrisma } as DatabaseService, new AuthorizationService(baseDatabase));
      await expect(failingTasks.wait(managerActor, task.id, { expectedVersion: 2, reason: "Wait must rollback", delayCause: "Consultant pending" })).rejects.toThrow("Injected ordinary-wait audit failure");
      expect(await tx.task.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({ status: TaskStatus.IN_PROGRESS, version: 2, waitingDelayCause: null });
      expect(await tx.taskStatusChange.count({ where: { taskId: task.id } })).toBe(2);
      expect(await tx.domainEvent.count({ where: { subjectId: task.id } })).toBe(2);
      await tx.$executeRaw`SAVEPOINT s10_missing_wait_evidence`;
      await tx.task.update({ where: { id: task.id }, data: { status: TaskStatus.WAITING, version: 3, waitingPreviousStatus: TaskStatus.IN_PROGRESS, waitingReason: "SQL invented waiting", waitingDelayCause: "Consultant pending" } });
      await expect(tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`).rejects.toThrow("immutable transition evidence");
      await tx.$executeRaw`ROLLBACK TO SAVEPOINT s10_missing_wait_evidence`;
      await tx.$executeRaw`SAVEPOINT s10_mismatched_wait_evidence`;
      await tx.task.update({ where: { id: task.id }, data: { status: TaskStatus.WAITING, version: 3, waitingPreviousStatus: TaskStatus.IN_PROGRESS, waitingReason: "SQL waiting mismatch", waitingDelayCause: "Consultant pending" } });
      await tx.taskStatusChange.create({ data: { organizationId: task.organizationId, taskId: task.id, fromStatus: TaskStatus.IN_PROGRESS, toStatus: TaskStatus.WAITING, previousStatus: TaskStatus.IN_PROGRESS, actorId: managerActor.accountId, reason: "SQL waiting mismatch", delayCause: "Invented mismatched cause", taskVersion: 3 } });
      await expect(tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`).rejects.toThrow("matching cause");
      await tx.$executeRaw`ROLLBACK TO SAVEPOINT s10_mismatched_wait_evidence`;
      await tasks.wait(managerActor, task.id, { expectedVersion: 2, reason: "Retry valid waiting", delayCause: "Consultant pending" });
      await tx.$executeRaw`SAVEPOINT s10_wait_history_tamper`;
      await expect(tx.$executeRaw`UPDATE "task_status_changes" SET "delayCause" = 'Invented cause' WHERE "taskId" = ${task.id}::uuid AND "taskVersion" = 3`).rejects.toThrow("append-only");
      await tx.$executeRaw`ROLLBACK TO SAVEPOINT s10_wait_history_tamper`;
    });
  });

  it("cancels a project atomically, preserves completed delivery work, and supports approved closeout revocation", async () => {
    await fixture(async ({ tx, organizationId, branchId, managerEmployeeId, managerActor, ownerActor, ownerId, tasks, workflow }) => {
      const project = await tx.project.create({ data: { organizationId, branchId, title: "Cancellation integration project", deliveryType: "DESIGN", createdById: ownerId } });
      await tx.projectScope.create({ data: { organizationId, projectId: project.id, name: "Delivery", normalizedName: "delivery" } });
      await tx.employeePermissionOverride.create({ data: { organizationId, employeeId: managerEmployeeId, permissionKey: "project.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId, reason: "S09 project task access" } });
      await tx.employeePermissionOverride.create({ data: { organizationId, employeeId: managerEmployeeId, permissionKey: "project.manage", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId, reason: "S09 lead eligibility" } });
      await workflow.assignment(ownerActor, project.id, { employeeId: managerEmployeeId, expectedVersion: 1, reason: "Assign cancellation fixture" });
      await workflow.lead(ownerActor, project.id, { employeeId: managerEmployeeId, expectedVersion: 2, reason: "Appoint project lead" });
      await workflow.status(ownerActor, project.id, { toStatus: "ACTIVE", expectedVersion: 3, reason: "Activate delivery" });
      const unfinished = await tasks.create(ownerActor, taskInput("Unfinished project delivery", { type: TaskType.PROJECT, projectId: project.id, ownerEmployeeId: managerEmployeeId }));
      await tasks.transition(ownerActor, unfinished.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Start waiting delivery" });
      await tasks.wait(ownerActor, unfinished.id, { expectedVersion: 2, reason: "Wait before cancellation", delayCause: "Client pending" });
      const completed = await tasks.create(ownerActor, taskInput("Completed project delivery", { type: TaskType.PROJECT, projectId: project.id, ownerEmployeeId: managerEmployeeId }));
      await tasks.transition(ownerActor, completed.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Start completed fixture" });
      await tasks.transition(ownerActor, completed.id, { toState: "COMPLETED", expectedVersion: 2, reason: "Finish before cancellation" });

      await expect(tasks.cancelProject(managerActor, project.id, { expectedVersion: 4, reason: "Unauthorized cancellation attempt" })).rejects.toMatchObject({ status: 403 });
      await expect(tasks.cancelProject(ownerActor, project.id, { expectedVersion: 3, reason: "Stale cancellation attempt" })).rejects.toThrow("Project changed");
      const cancelled = await tasks.cancelProject(ownerActor, project.id, { expectedVersion: 4, reason: "Client ended the delivery" });
      expect(cancelled.stoppedTaskIds).toEqual([unfinished.id]);
      expect((await tasks.list(ownerActor, "assigned", 0, 50, { phase: "active", projectId: project.id })).items.map(task => task.id)).not.toContain(unfinished.id);
      expect(cancelled.project.status).toBe("CANCELLED");
      expect(await tx.task.findUniqueOrThrow({ where: { id: unfinished.id } })).toMatchObject({ status: TaskStatus.STOPPED_DUE_TO_PROJECT_CANCELLATION, waitingDelayCause: null, version: 4 });
      expect(await tx.task.findUniqueOrThrow({ where: { id: completed.id } })).toMatchObject({ status: TaskStatus.COMPLETED, version: 3 });
      expect(await tx.taskStatusChange.count({ where: { taskId: unfinished.id, projectStatusChangeId: { not: null } } })).toBe(1);
      await expect(tasks.resume(ownerActor, unfinished.id, { expectedVersion: 4, reason: "Try to resume stopped delivery" })).rejects.toThrow();

      const closeout = await tasks.createCloseout(managerActor, { projectId: project.id, ownerEmployeeId: managerEmployeeId, title: "Secure the handover", workScope: "Return keys and archive site notes", targetDate: "2026-10-20", priority: TaskPriority.MEDIUM, reason: "Approved closeout scope" });
      expect(closeout.type).toBe(TaskType.CLOSEOUT);
      await expect(tasks.changeCommittedDate(ownerActor, closeout.id, { expectedVersion: 1, committedDueDate: "2026-10-21", reason: "Cannot bypass closeout approval" })).rejects.toThrow("closeout due dates");
      expect(await tx.taskCloseoutApproval.findUniqueOrThrow({ where: { taskId: closeout.id } })).toMatchObject({ approverId: managerActor.accountId, workScope: "Return keys and archive site notes", revokedAt: null });
      await tasks.transition(managerActor, closeout.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Start approved handover" });
      await tasks.wait(managerActor, closeout.id, { expectedVersion: 2, reason: "Waiting for key holder", delayCause: "Consultant pending", responsibleParty: "Key holder" });
      await expect(tasks.revokeCloseout(managerActor, closeout.id, "Unauthorized revocation")).rejects.toMatchObject({ status: 403 });
      await tasks.revokeCloseout(ownerActor, closeout.id, "Owner withdrew closeout approval");
      expect(await tx.taskCloseoutApproval.findUniqueOrThrow({ where: { taskId: closeout.id } })).toMatchObject({ revokedById: ownerId, revocationReason: "Owner withdrew closeout approval" });
      await expect(tasks.resume(managerActor, closeout.id, { expectedVersion: 3, reason: "Attempt after revocation" })).rejects.toThrow("approval");
      await expect(tasks.transition(managerActor, closeout.id, { toState: "COMPLETED", expectedVersion: 3, reason: "Attempt after revocation" })).rejects.toThrow("approval");
      await workflow.revokeAssignment(ownerActor, project.id, managerEmployeeId, { expectedVersion: 5, reason: "End internal closeout access" });
      await expect(tasks.detail(managerActor, closeout.id)).rejects.toMatchObject({ status: 403 });
      await expect(workflow.assignment(ownerActor, project.id, { employeeId: managerEmployeeId, expectedVersion: 5, reason: "Attempt delivery grant after cancellation" })).rejects.toThrow("Terminal project");
      expect(await tx.projectAssignment.count({ where: { projectId: project.id, revokedAt: null } })).toBe(0);
      await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
    });
  });

  it("persists explicit collaborator effort, edits an in-progress task with canonical evidence and rejects SQL evidence mutation", async () => {
    await fixture(async ({ tx, managerActor, employeeId, tasks }) => {
      const task = await tasks.create(managerActor, taskInput("Collaborator effort fixture", { estimatedHours: 8, collaborators: [{ employeeId, estimatedHours: 3 }], tags: ["concept"], checklist: [{ label: "Review brief", checked: false }] }));
      expect(Number((await tx.taskCollaborator.findFirstOrThrow({ where: { taskId: task.id } })).estimatedHours)).toBe(3);
      await tasks.transition(managerActor, task.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Start editable work" });
      await tasks.edit(managerActor, task.id, { expectedVersion: 2, title: "Updated studio brief", targetDate: "2026-10-16", priority: TaskPriority.CRITICAL, estimatedHours: 9, tags: ["concept", "studio"], checklist: [{ label: "Review brief", checked: true }], reason: "Update operational planning" });
      expect(await tx.task.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({ tags: ["concept", "studio"], checklist: [{ label: "Review brief", checked: true }] });
      await expect(tasks.create(managerActor, taskInput("Invalid item link", { planItemId: randomUUID() }))).rejects.toThrow("Plan item");
      expect(await tx.auditEvent.count({ where: { subjectId: task.id, eventKey: "task.updated" } })).toBe(1);
      await tx.$executeRaw`SAVEPOINT s09_sql_evidence`;
      await expect(tx.$executeRaw`UPDATE "task_status_changes" SET "reason" = 'Tampered evidence' WHERE "taskId" = ${task.id}::uuid`).rejects.toThrow("append-only");
      await tx.$executeRaw`ROLLBACK TO SAVEPOINT s09_sql_evidence`;
      await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
    });
  });

  it("requires explicit cross-branch project assignment and current scoped permission for task access", async () => {
    await fixture(async ({ tx, organizationId, managerActor, outsiderActor, managerEmployeeId, ownerActor, ownerId, tasks, workflow }) => {
      const otherBranch = await tx.branch.create({ data: { organizationId, name: `Other branch ${randomUUID()}` } });
      const project = await tx.project.create({ data: { organizationId, branchId: otherBranch.id, title: "Cross-branch task project", deliveryType: "DESIGN", createdById: ownerId } });
      await tx.projectStatusChange.create({ data: { organizationId, projectId: project.id, toStatus: "DRAFT", projectVersion: 1, reason: "Cross-branch task fixture", actorId: ownerId } });
      await tx.projectScope.create({ data: { organizationId, projectId: project.id, name: "Delivery", normalizedName: "delivery" } });
      const permission = await tx.employeePermissionOverride.create({ data: { organizationId, employeeId: managerEmployeeId, permissionKey: "project.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.ORGANIZATION, reason: "Explicit cross-branch project read grant" } });
      await expect(tasks.create(ownerActor, taskInput("Unassigned cross-branch task", { type: TaskType.PROJECT, projectId: project.id, ownerEmployeeId: managerEmployeeId }))).rejects.toThrow("assignment");
      const assignment = await workflow.assignment(ownerActor, project.id, { employeeId: managerEmployeeId, expectedVersion: 1, reason: "Owner authorizes cross-branch contributor" });
      expect(assignment.crossBranchAuthorized).toBe(true);
      const task = await tasks.create(ownerActor, taskInput("Explicitly assigned task", { type: TaskType.PROJECT, projectId: project.id, ownerEmployeeId: managerEmployeeId }));
      await expect(tasks.detail(managerActor, task.id)).resolves.toMatchObject({ task: { id: task.id } });
      await expect(tasks.detail(outsiderActor, task.id)).rejects.toMatchObject({ status: 403 });
      await tx.employeePermissionOverride.update({ where: { id: permission.id }, data: { revokedAt: new Date(), revokedById: ownerId, revocationReason: "End cross-branch read grant" } });
      await expect(tasks.detail(managerActor, task.id)).rejects.toMatchObject({ status: 403 });
      await expect(tasks.list(managerActor, "mine", 0, 20)).resolves.toMatchObject({ total: 0 });
    });
  });

  it("atomically exits an employee, waits owned work, revokes sessions, holds their Active lead project, and rolls back on audit failure", async () => {
    await fixture(async ({ tx, organizationId, branchId, employeeId, managerEmployeeId, managerActor, ownerActor, ownerId, tasks, organization, workflow }) => {
      const project = await tx.project.create({ data: { organizationId, branchId, title: "Lead exit integration project", deliveryType: "DESIGN", createdById: ownerId } });
      await tx.projectScope.create({ data: { organizationId, projectId: project.id, name: "Delivery", normalizedName: "delivery" } });
      await tx.employeePermissionOverride.create({ data: { organizationId, employeeId: managerEmployeeId, permissionKey: "project.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId, reason: "S09 exit project task access" } });
      await tx.employeePermissionOverride.create({ data: { organizationId, employeeId: managerEmployeeId, permissionKey: "project.manage", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId, reason: "S09 lead eligibility" } });
      await workflow.assignment(ownerActor, project.id, { employeeId: managerEmployeeId, expectedVersion: 1, reason: "Assign exiting lead" });
      await workflow.lead(ownerActor, project.id, { employeeId: managerEmployeeId, expectedVersion: 2, reason: "Appoint exiting lead" });
      await workflow.status(ownerActor, project.id, { toStatus: "ACTIVE", expectedVersion: 3, reason: "Activate lead project" });
      const ownedTask = await tasks.create(ownerActor, taskInput("Task owned by exiting employee", { type: TaskType.PROJECT, projectId: project.id, ownerEmployeeId: managerEmployeeId }));
      const startedTask = await tasks.create(managerActor, taskInput("Started self-task before exit"));
      await tasks.transition(managerActor, startedTask.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Start before exit" });
      const completedTask = await tasks.create(managerActor, taskInput("Completed self-task before exit"));
      await tasks.transition(managerActor, completedTask.id, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Start completed work" });
      await tasks.transition(managerActor, completedTask.id, { toState: "COMPLETED", expectedVersion: 2, reason: "Finish before exit" });
      const session = await tx.session.create({ data: { accountId: managerActor.accountId, tokenHash: randomUUID(), csrfTokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60 * 60_000) } });

      const identity = new IdentityService({ prisma: (tasks as unknown as { database: DatabaseService }).database.prisma } as DatabaseService, config);
      const baseDatabase = (tasks as unknown as { database: DatabaseService }).database;
      const failingPrisma = new Proxy(baseDatabase.prisma, { get(target, key) {
        if (key === "$transaction") return (callback: (inner: Prisma.TransactionClient) => Promise<unknown>, options?: Prisma.TransactionOptions) => target.$transaction((inner) => callback(new Proxy(inner, { get(txTarget, txKey) {
          if (txKey === "auditEvent") return new Proxy(Reflect.get(txTarget, txKey, txTarget) as object, { get(delegate, method) {
            if (method === "create") return (args: { data?: { eventKey?: string } }) => args.data?.eventKey === "organization.employee.exited" ? Promise.reject(new Error("Injected employee-exit audit failure")) : Reflect.get(delegate, method, delegate).call(delegate, args);
            return Reflect.get(delegate, method, delegate);
          } });
          return Reflect.get(txTarget, txKey, txTarget);
        } })), options);
        return Reflect.get(target, key, target);
      } });
      const failingOrganization = new OrganizationService({ prisma: failingPrisma } as DatabaseService, identity, new AuthorizationService(baseDatabase), workflow, tasks, new NotificationsService(baseDatabase));
      await expect(failingOrganization.finalizeEmployeeExit(ownerId, managerEmployeeId, "Injected audit rollback" )).rejects.toThrow("Injected employee-exit audit failure");
      expect(await tx.account.findUniqueOrThrow({ where: { id: managerActor.accountId } })).toMatchObject({ state: AccountState.ACTIVE });
      expect(await tx.employee.findUniqueOrThrow({ where: { id: managerEmployeeId } })).toMatchObject({ state: "ACTIVE" });
      expect(await tx.session.findUniqueOrThrow({ where: { id: session.id } })).toMatchObject({ revokedAt: null });
      expect(await tx.task.findUniqueOrThrow({ where: { id: ownedTask.id } })).toMatchObject({ status: TaskStatus.NOT_STARTED, version: 1 });
      expect(await tx.project.findUniqueOrThrow({ where: { id: project.id } })).toMatchObject({ status: "ACTIVE", currentLeadEmployeeId: managerEmployeeId, version: 4 });

      const result = await organization.finalizeEmployeeExit(ownerId, managerEmployeeId, "Employee left the organization");
      expect((await tasks.attention(ownerActor, "reassignment", 0, 50)).items.map(item => item.id)).toContain(startedTask.id);
      await expect(tasks.attention(ownerActor, "corrections", 0, 50)).resolves.toMatchObject({ total: 0, items: [] });
      expect(result).toMatchObject({ exited: true, waitingTaskIds: expect.arrayContaining([ownedTask.id, startedTask.id]), heldProjectIds: [project.id] });
      expect(result.waitingTaskIds).toHaveLength(2);
      expect(await tx.account.findUniqueOrThrow({ where: { id: managerActor.accountId } })).toMatchObject({ state: AccountState.SUSPENDED });
      expect(await tx.employee.findUniqueOrThrow({ where: { id: managerEmployeeId } })).toMatchObject({ state: "EXITED" });
      expect(await tx.session.findUniqueOrThrow({ where: { id: session.id } })).toMatchObject({ revokedAt: expect.any(Date) });
      expect(await tx.task.findUniqueOrThrow({ where: { id: ownedTask.id } })).toMatchObject({ status: TaskStatus.WAITING, requiresReassignment: true, waitingPreviousStatus: TaskStatus.NOT_STARTED, version: 2 });
      expect(await tx.project.findUniqueOrThrow({ where: { id: project.id } })).toMatchObject({ status: "ON_HOLD", currentLeadEmployeeId: null, version: 5 });
      expect(await tx.projectStatusChange.count({ where: { projectId: project.id, toStatus: "ON_HOLD" } })).toBe(1);
      expect(await tx.taskStatusChange.count({ where: { taskId: ownedTask.id, toStatus: TaskStatus.WAITING } })).toBe(1);
      await expect(tasks.transition(ownerActor, startedTask.id, { toState: "COMPLETED", expectedVersion: 3, reason: "Try before reassignment" })).rejects.toThrow("reassign");
      await tasks.reassign(ownerActor, startedTask.id, { newOwnerEmployeeId: employeeId, expectedVersion: 3, reason: "Explicit individual handover" });
      expect(await tx.task.findUniqueOrThrow({ where: { id: startedTask.id } })).toMatchObject({ primaryOwnerEmployeeId: employeeId, status: TaskStatus.IN_PROGRESS, requiresReassignment: false, version: 4 });
      expect(await tx.task.findUniqueOrThrow({ where: { id: completedTask.id } })).toMatchObject({ primaryOwnerEmployeeId: managerEmployeeId, status: TaskStatus.COMPLETED, version: 3 });
      await expect(workflow.status(ownerActor, project.id, { toStatus: "ACTIVE", expectedVersion: 5, reason: "Attempt without replacement" })).rejects.toThrow();
      expect(await tx.notification.count({ where: { category: "employee.exit", event: { organizationId, subjectId: managerEmployeeId } } })).toBe(1);
      await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
    });
  });
});

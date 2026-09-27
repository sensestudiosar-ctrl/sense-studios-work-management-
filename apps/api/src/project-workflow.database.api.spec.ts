import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "./database.service.js";
import { AccountKind, AccountState, EmployeeState, PermissionEffect, PermissionScopeKind, Prisma, ProjectStatus } from "./generated/prisma/client.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { ProjectService, type ProjectActor } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import type { RuntimeConfig } from "./config.js";

const databaseUrl = process.env.DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
class FixtureRollback extends Error {}
const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: databaseUrl ?? "", webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined };

databaseDescribe("S07 project workflow database integration", () => {
  let database: DatabaseService;
  beforeAll(async () => {
    database = new DatabaseService(config);
    const rows = await database.prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!/_test(?:db)?$/i.test(rows[0]?.name ?? "")) throw new Error("Project workflow checks require a dedicated test database");
  });
  afterAll(async () => database?.onModuleDestroy());

  async function fixture(run: (value: {
    tx: Prisma.TransactionClient; organizationId: string; branchId: string; otherBranchId: string;
    ownerId: string; approverId: string; approverActor: ProjectActor; service: ProjectService; workflow: ProjectWorkflowService;
    actor: ProjectActor;
  }) => Promise<void>) {
    try {
      await database.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.findFirst() ?? await tx.organization.create({ data: { name: "S07 workflow fixture" } });
        const suffix = randomUUID();
        const branch = await tx.branch.create({ data: { organizationId: organization.id, name: `S07 workflow ${suffix}` } });
        const otherBranch = await tx.branch.create({ data: { organizationId: organization.id, name: `S07 workflow other ${suffix}` } });
        const owner = await tx.account.create({ data: { normalizedEmail: `s07-workflow-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
        const approver = await tx.account.create({ data: { normalizedEmail: `s07-workflow-approver-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
        const proxy = new Proxy(tx, { get(target, key) {
          if (key === "$transaction") return async (callback: (inner: Prisma.TransactionClient) => Promise<unknown>) => {
            await tx.$executeRaw`SAVEPOINT project_workflow_command`;
            try { const result = await callback(tx); await tx.$executeRaw`RELEASE SAVEPOINT project_workflow_command`; return result; }
            catch (error) { await tx.$executeRaw`ROLLBACK TO SAVEPOINT project_workflow_command`; await tx.$executeRaw`RELEASE SAVEPOINT project_workflow_command`; throw error; }
          };
          return Reflect.get(target, key, target) as unknown;
        } });
        const db = { prisma: proxy } as unknown as DatabaseService;
        const service = new ProjectService(db);
        const workflow = new ProjectWorkflowService(db, new AuthorizationService(db), new ApprovalService(db));
        const actor: ProjectActor = { accountId: owner.id, organizationId: organization.id, kind: AccountKind.OWNER };
        const approverActor: ProjectActor = { accountId: approver.id, organizationId: organization.id, kind: AccountKind.STAFF };
        await run({ tx, organizationId: organization.id, branchId: branch.id, otherBranchId: otherBranch.id, ownerId: owner.id, approverId: approver.id, approverActor, service, workflow, actor });
        throw new FixtureRollback();
      }, { timeout: 30_000 });
    } catch (error) { if (!(error instanceof FixtureRollback)) throw error; }
  }

  it("persists assignment and lead decisions, approves named scope changes, transfers access, and keeps cancellation fail-closed", async () => {
    await fixture(async ({ tx, organizationId, branchId, otherBranchId, ownerId, approverId, approverActor, service, workflow, actor }) => {
      const localTeam = await tx.team.create({ data: { organizationId, branchId, name: `S07 local ${randomUUID()}` } });
      const foreignTeam = await tx.team.create({ data: { organizationId, branchId: otherBranchId, name: `S07 foreign ${randomUUID()}` } });
      const localAccount = await tx.account.create({ data: { normalizedEmail: `s07-local-${randomUUID()}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
      const foreignAccount = await tx.account.create({ data: { normalizedEmail: `s07-foreign-${randomUUID()}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
      const inactiveAccount = await tx.account.create({ data: { normalizedEmail: `s07-inactive-${randomUUID()}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
      const localEmployee = await tx.employee.create({ data: { organizationId, accountId: localAccount.id, homeBranchId: branchId, homeTeamId: localTeam.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
      const foreignEmployee = await tx.employee.create({ data: { organizationId, accountId: foreignAccount.id, homeBranchId: otherBranchId, homeTeamId: foreignTeam.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
      const inactiveEmployee = await tx.employee.create({ data: { organizationId, accountId: inactiveAccount.id, homeBranchId: branchId, homeTeamId: localTeam.id, hiredAt: new Date("2026-01-01T00:00:00Z"), state: EmployeeState.EXITED } });
      const approverEmployee = await tx.employee.create({ data: { organizationId, accountId: approverId, homeBranchId: branchId, homeTeamId: localTeam.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
      await tx.employeePermissionOverride.createMany({ data: [localEmployee, foreignEmployee, approverEmployee].flatMap((employee) => ["project.view", "project.manage", "project.scope_decide"].map((permissionKey) => ({ organizationId, employeeId: employee.id, permissionKey, effect: PermissionEffect.ALLOW, scopeKind: employee.homeBranchId === branchId ? PermissionScopeKind.BRANCH : PermissionScopeKind.ORGANIZATION, ...(employee.homeBranchId === branchId ? { branchId } : {}), reason: "S07 database workflow test grant" }))) });
      const project = (await service.create(actor, { branchId, title: "Workflow integration", deliveryType: "DESIGN", scopes: ["Architecture"], reason: "Create test baseline" })).project;

      await expect(workflow.assignment(actor, project.id, { employeeId: inactiveEmployee.id, expectedVersion: 1, reason: "Inactive assignment" })).rejects.toThrow();
      expect(await tx.projectAssignment.count({ where: { projectId: project.id } })).toBe(0);
      const localAssignment = await workflow.assignment(actor, project.id, { employeeId: localEmployee.id, expectedVersion: 1, reason: "Local project work" });
      const foreignAssignment = await workflow.assignment(actor, project.id, { employeeId: foreignEmployee.id, expectedVersion: 2, reason: "Owner granted cross-Branch access" });
      await workflow.assignment(actor, project.id, { employeeId: approverEmployee.id, expectedVersion: 3, reason: "Named scope approver project access" });
      expect(localAssignment.crossBranchAuthorized).toBe(false);
      expect(foreignAssignment.crossBranchAuthorized).toBe(true);
      const lead = await workflow.lead(actor, project.id, { employeeId: localEmployee.id, expectedVersion: 4, reason: "Appoint accountable lead" });
      expect(lead.currentLeadEmployeeId).toBe(localEmployee.id);

      await workflow.setScopeApprover(actor, project.id, { accountId: ownerId, expectedVersion: 5, reason: "Configure named approver" });
      await workflow.status(actor, project.id, { toStatus: ProjectStatus.ACTIVE, expectedVersion: 6, reason: "Start delivery" });
      await expect(workflow.requestScope(actor, project.id, { name: "Lighting", expectedVersion: 7, reason: "Add lighting scope" })).rejects.toThrow("Requester cannot approve their own scope change");
      expect(await tx.projectScopeChange.count({ where: { projectId: project.id } })).toBe(0);
      await workflow.setScopeApprover(actor, project.id, { accountId: approverId, expectedVersion: 7, reason: "Assign independent scope approver" });

      const requested = await workflow.requestScope(actor, project.id, { name: "Lighting", expectedVersion: 8, reason: "Client requested lighting scope" });
      await expect(workflow.decideScope(actor, project.id, requested.approvalId, { outcome: "APPROVED", reason: "Requester cannot decide" })).rejects.toThrow();
      expect((await tx.approvalRequest.findUniqueOrThrow({ where: { id: requested.approvalId } })).state).toBe("PENDING");
      await workflow.decideScope(approverActor, project.id, requested.approvalId, { outcome: "APPROVED", reason: "Approved requested scope" });
      expect(await tx.projectScope.count({ where: { projectId: project.id, normalizedName: "lighting", baseline: false } })).toBe(1);
      expect((await tx.approvalRequest.findUniqueOrThrow({ where: { id: requested.approvalId } })).state).toBe("APPROVED");

      const transferred = await workflow.transfer(actor, project.id, { toBranchId: otherBranchId, expectedVersion: 9, reason: "Move ownership to destination Branch" });
      expect(transferred).toMatchObject({ branchId: otherBranchId, status: ProjectStatus.ON_HOLD, currentLeadEmployeeId: null, version: 10 });
      expect((await tx.projectAssignment.findUniqueOrThrow({ where: { id: localAssignment.id } })).revokedAt).not.toBeNull();
      expect((await tx.projectAssignment.findUniqueOrThrow({ where: { id: foreignAssignment.id } })).revokedAt).toBeNull();
      expect(await tx.projectBranchTransfer.count({ where: { projectId: project.id, fromBranchId: branchId, toBranchId: otherBranchId } })).toBe(1);
      expect(await tx.projectLeadChange.count({ where: { projectId: project.id, oldEmployeeId: localEmployee.id, newEmployeeId: null } })).toBe(1);
      expect(await tx.projectStatusChange.count({ where: { projectId: project.id, toStatus: ProjectStatus.ON_HOLD } })).toBe(1);

      const cancellation = await workflow.requestCancellation(actor, project.id, "Owner requests cancellation review");
      expect(cancellation.requesterId).toBe(ownerId);
      expect(await tx.projectCancellationRequest.count({ where: { projectId: project.id } })).toBe(1);
      await expect(workflow.status(actor, project.id, { toStatus: ProjectStatus.CANCELLED, expectedVersion: 10, reason: "Attempt effective cancellation" })).rejects.toThrow();
      expect((await tx.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe(ProjectStatus.ON_HOLD);
    });
  });
});

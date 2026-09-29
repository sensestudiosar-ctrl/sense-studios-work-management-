import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "./database.service.js";
import { AccountKind, AccountState, EmployeeState, PermissionEffect, PermissionScopeKind, Prisma, ProjectStatus } from "./generated/prisma/client.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { ProjectService, type ProjectActor } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { ProjectTemplateService } from "./project-template.service.js";
import type { RuntimeConfig } from "./config.js";

const databaseUrl = process.env.DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
class FixtureRollback extends Error {}
const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: databaseUrl ?? "", webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined };

const definition = {
  deliveryType: "DESIGN" as const,
  scopes: ["Architecture", "Interior design"],
  stages: [{ key: "BRIEF", label: "Brief" }, { key: "DESIGN", label: "Design" }],
  milestones: [{ key: "BRIEF_APPROVED", label: "Brief approved", stageKey: "BRIEF", required: true }, { key: "CONCEPT_REVIEW", label: "Concept review", stageKey: "DESIGN", required: false }],
  folders: ["Brief", "Design"],
  fileNamingConvention: "Project_Stage_Item_Revision",
};

databaseDescribe("S08 project templates and plans database integration", () => {
  let database: DatabaseService;
  beforeAll(async () => {
    database = new DatabaseService(config);
    const rows = await database.prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!/_test(?:db)?$/i.test(rows[0]?.name ?? "")) throw new Error("Project template checks require a dedicated test database");
  });
  afterAll(async () => database?.onModuleDestroy());

  async function fixture(run: (value: {
    tx: Prisma.TransactionClient; organizationId: string; branchId: string; otherBranchId: string;
    ownerId: string; managerId: string; viewerId: string; managerEmployeeId: string;
    ownerActor: ProjectActor; managerActor: ProjectActor; viewerActor: ProjectActor;
    templates: ProjectTemplateService; projects: ProjectService; workflow: ProjectWorkflowService;
  }) => Promise<void>) {
    try {
      await database.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.findFirst() ?? await tx.organization.create({ data: { name: "S08 template fixture" } });
        const suffix = randomUUID();
        const branch = await tx.branch.create({ data: { organizationId: organization.id, name: `S08 local ${suffix}` } });
        const otherBranch = await tx.branch.create({ data: { organizationId: organization.id, name: `S08 other ${suffix}` } });
        const owner = await tx.account.create({ data: { normalizedEmail: `s08-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
        const manager = await tx.account.create({ data: { normalizedEmail: `s08-manager-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
        const viewer = await tx.account.create({ data: { normalizedEmail: `s08-viewer-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
        const team = await tx.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `S08 team ${suffix}` } });
        const managerEmployee = await tx.employee.create({ data: { organizationId: organization.id, accountId: manager.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
        const viewerEmployee = await tx.employee.create({ data: { organizationId: organization.id, accountId: viewer.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
        await tx.employeePermissionOverride.createMany({ data: [
          { organizationId: organization.id, employeeId: managerEmployee.id, permissionKey: "template.manage", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.ORGANIZATION, reason: "S08 template manager fixture" },
          { organizationId: organization.id, employeeId: managerEmployee.id, permissionKey: "project.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: branch.id, reason: "S08 project access fixture" },
          { organizationId: organization.id, employeeId: managerEmployee.id, permissionKey: "project.manage", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: branch.id, reason: "S08 project manager fixture" },
          { organizationId: organization.id, employeeId: managerEmployee.id, permissionKey: "project.gate_override", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: branch.id, reason: "S08 gate override fixture" },
          { organizationId: organization.id, employeeId: viewerEmployee.id, permissionKey: "template.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.ORGANIZATION, reason: "S08 template viewer fixture" },
          { organizationId: organization.id, employeeId: viewerEmployee.id, permissionKey: "project.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: branch.id, reason: "S08 project access fixture" },
        ] });
        const proxy = new Proxy(tx, { get(target, key) {
          if (key === "$transaction") return async (callback: (inner: Prisma.TransactionClient) => Promise<unknown>) => {
            await tx.$executeRaw`SAVEPOINT project_template_command`;
            try { const result = await callback(tx); await tx.$executeRaw`RELEASE SAVEPOINT project_template_command`; return result; }
            catch (error) { await tx.$executeRaw`ROLLBACK TO SAVEPOINT project_template_command`; await tx.$executeRaw`RELEASE SAVEPOINT project_template_command`; throw error; }
          };
          return Reflect.get(target, key, target) as unknown;
        } });
        const db = { prisma: proxy } as unknown as DatabaseService;
        const authorization = new AuthorizationService(db);
        const templates = new ProjectTemplateService(db, authorization);
        const projects = new ProjectService(db);
        const workflow = new ProjectWorkflowService(db, authorization, new ApprovalService(db));
        const ownerActor: ProjectActor = { accountId: owner.id, organizationId: organization.id, kind: AccountKind.OWNER };
        const managerActor: ProjectActor = { accountId: manager.id, organizationId: organization.id, kind: AccountKind.STAFF };
        const viewerActor: ProjectActor = { accountId: viewer.id, organizationId: organization.id, kind: AccountKind.STAFF };
        await run({ tx, organizationId: organization.id, branchId: branch.id, otherBranchId: otherBranch.id, ownerId: owner.id, managerId: manager.id, viewerId: viewer.id, managerEmployeeId: managerEmployee.id, ownerActor, managerActor, viewerActor, templates, projects, workflow });
        await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
        throw new FixtureRollback();
      }, { timeout: 30_000 });
    } catch (error) { if (!(error instanceof FixtureRollback)) throw error; }
  }

  it("creates immutable versions, limits reads and writes to explicit organization grants, and rejects broken milestone references", async () => {
    await fixture(async ({ tx, ownerActor, managerActor, viewerActor, templates }) => {
      const created = await templates.create(managerActor, { name: "Residential Design", definition, reason: "Initial template configuration" });
      const templateId = created.template.id;
      const oldVersion = created.template.versions[0];
      expect(oldVersion?.number).toBe(1);
      await expect(templates.list(ownerActor)).resolves.toMatchObject({ canManage: true });
      await expect(templates.list(viewerActor)).resolves.toMatchObject({ canManage: false });
      await expect(templates.create(viewerActor, { name: "Denied template", definition, reason: "Viewer cannot manage" })).rejects.toThrow();
      await expect(templates.list({ ...viewerActor, organizationId: randomUUID() })).rejects.toThrow();

      const changed = { ...definition, scopes: ["Architecture", "Lighting"] };
      const version2 = await templates.version(managerActor, templateId, { definition: changed, reason: "Add lighting scope" });
      expect(version2.version.number).toBe(2);
      const persisted = await tx.projectTemplateVersion.findUniqueOrThrow({ where: { id: oldVersion!.id } });
      expect(persisted.definition).toEqual(definition);
      expect((await templates.list(managerActor)).templates[0]?.versions.map((entry) => entry.number)).toEqual([1, 2]);

      const invalid = { ...definition, milestones: [{ ...definition.milestones[0]!, stageKey: "missing-stage" }] };
      await expect(templates.version(managerActor, templateId, { definition: invalid, reason: "Invalid stage reference" })).rejects.toThrow();
      await expect(templates.version(managerActor, randomUUID(), { definition: changed, reason: "Wrong template ID" })).rejects.toThrow();
      expect(await tx.projectTemplateVersion.count({ where: { templateId } })).toBe(2);
    });
  });

  it("atomically applies the selected version, returns one plan on identical creation retry, and rejects conflicting key reuse", async () => {
    await fixture(async ({ tx, branchId, ownerActor, managerActor, templates, projects, workflow }) => {
      const { template } = await templates.create(managerActor, { name: "Retry plan", definition, reason: "Create retry fixture" });
      const versionId = template.versions[0]!.id;
      await templates.version(managerActor, template.id, { definition: { ...definition, scopes: ["Architecture", "Interior design", "Lighting"] }, reason: "Add a future scope" });
      const idempotencyKey = randomUUID();
      const input = { branchId, title: "Template backed project", deliveryType: "DESIGN" as const, scopes: definition.scopes, reason: "Create from approved version", templateVersionId: versionId, idempotencyKey };
      const first = await projects.create(ownerActor, input);
      const retry = await projects.create(ownerActor, input);
      expect(retry.project.id).toBe(first.project.id);
      expect(await tx.projectCreationReceipt.count({ where: { key: idempotencyKey, actorId: ownerActor.accountId } })).toBe(1);
      expect(await tx.projectPlan.count({ where: { projectId: first.project.id } })).toBe(1);
      expect(await tx.projectPlanItem.count({ where: { projectId: first.project.id } })).toBe(definition.stages.length + definition.milestones.length);
      const plan = await workflow.plan(ownerActor, first.project.id);
      expect(plan.plan?.templateVersion.id).toBe(versionId);
      expect(plan.items.map((item) => item.key)).toEqual(["BRIEF", "DESIGN", "BRIEF_APPROVED", "CONCEPT_REVIEW"]);
      expect(plan.plan?.definition).toEqual(definition);
      expect(await tx.projectScope.count({ where: { projectId: first.project.id, baseline: true } })).toBe(2);

      await expect(projects.create(ownerActor, { ...input, templateVersionId: randomUUID(), idempotencyKey: randomUUID() })).rejects.toThrow();
      expect(await tx.project.count({ where: { createdById: ownerActor.accountId } })).toBe(1);

      await expect(projects.create(ownerActor, { ...input, title: "Changed retry payload" })).rejects.toThrow();
      await expect(projects.create(ownerActor, { ...input, deliveryType: "TURNKEY" })).rejects.toThrow();
      expect(await tx.projectCreationReceipt.count({ where: { actorId: ownerActor.accountId } })).toBe(1);
      expect(await tx.project.count({ where: { createdById: ownerActor.accountId } })).toBe(1);
    });
  });

  it("authorizes plan completion by assignment, rejects stale and tampered commands, and audits required-milestone gate overrides", async () => {
    await fixture(async ({ tx, branchId, ownerActor, managerActor, viewerActor, managerEmployeeId, templates, projects, workflow }) => {
      const { template } = await templates.create(managerActor, { name: "Gate plan", definition, reason: "Create gate fixture" });
      const created = await projects.create(ownerActor, { branchId, title: "Gate project", deliveryType: "DESIGN", scopes: definition.scopes, reason: "Create gate project", templateVersionId: template.versions[0]!.id, idempotencyKey: randomUUID() });
      const projectId = created.project.id;
      await expect(workflow.completePlanItem(viewerActor, projectId, randomUUID(), { expectedVersion: 1, reason: "Tampered item reference" })).rejects.toThrow();
      await expect(workflow.plan(managerActor, projectId)).rejects.toThrow("Permission denied");
      const plan = await workflow.plan(ownerActor, projectId);
      const milestone = plan.items.find((item) => item.key === "BRIEF_APPROVED")!;
      await expect(workflow.completePlanItem(viewerActor, projectId, milestone.id, { expectedVersion: 1, reason: "Unassigned viewer attempt" })).rejects.toThrow();
      expect((await tx.project.findUniqueOrThrow({ where: { id: projectId } })).status).toBe(ProjectStatus.DRAFT);

      await workflow.assignment(ownerActor, projectId, { employeeId: managerEmployeeId, expectedVersion: 1, reason: "Assign plan completion fixture" });
      await workflow.lead(ownerActor, projectId, { employeeId: managerEmployeeId, expectedVersion: 2, reason: "Appoint authorized Team Leader" });
      await workflow.status(ownerActor, projectId, { toStatus: ProjectStatus.ACTIVE, expectedVersion: 3, reason: "Activate plan project" });
      const stage = plan.items.find((item) => item.key === "BRIEF")!;
      await expect(workflow.completePlanItem(managerActor, projectId, stage.id, { expectedVersion: 99, reason: "Stale plan version" })).rejects.toThrow();
      await workflow.completePlanItem(managerActor, projectId, stage.id, { expectedVersion: 4, reason: "Record brief stage progress" });
      await expect(workflow.status(managerActor, projectId, { toStatus: ProjectStatus.COMPLETED, expectedVersion: 5, reason: "Missing milestone blocks completion" })).rejects.toThrow();
      await expect(workflow.status(viewerActor, projectId, { toStatus: ProjectStatus.COMPLETED, expectedVersion: 5, reason: "Viewer cannot override", overrideMilestones: true })).rejects.toThrow();
      await workflow.status(managerActor, projectId, { toStatus: ProjectStatus.COMPLETED, expectedVersion: 5, reason: "Authorized Team Leader milestone override", overrideMilestones: true });
      expect((await tx.project.findUniqueOrThrow({ where: { id: projectId } })).status).toBe(ProjectStatus.COMPLETED);
      expect(await tx.projectPlanCompletion.count({ where: { itemId: milestone.id } })).toBe(0);
      expect(await tx.projectPlanCompletion.count({ where: { itemId: stage.id, actorId: managerActor.accountId, reason: "Record brief stage progress" } })).toBe(1);
      expect(await tx.projectGateOverride.count({ where: { projectId, actorId: managerActor.accountId, reason: "Authorized Team Leader milestone override", milestoneIds: { has: milestone.id } } })).toBe(1);
    });
  });

  it("retains applied baseline and completion evidence, permits explicit staff completion and blocks hold or revoked access", async () => {
    await fixture(async ({ tx, branchId, ownerActor, managerActor, viewerActor, managerEmployeeId, templates, projects, workflow }) => {
      const dated = { ...definition, milestones: [{ ...definition.milestones[0]!, targetOffsetDays: 3 }] };
      const { template } = await templates.create(managerActor, { name: "Baseline guard fixture", definition: dated, reason: "Retain dated milestone baseline" });
      const version = template.versions[0]!;
      const project = (await projects.create(ownerActor, { branchId, title: "Evidence guard project", deliveryType: "DESIGN", scopes: dated.scopes, reason: "Create immutable applied plan", templateVersionId: version.id, idempotencyKey: randomUUID() })).project;
      const plan = await workflow.plan(ownerActor, project.id);
      const milestone = plan.items.find((item) => item.kind === "MILESTONE")!;
      expect(milestone.targetAt?.getTime()).toBe(project.createdAt.getTime() + 3 * 86400000);
      async function rejected(operation: () => Promise<unknown>) {
        await tx.$executeRaw`SAVEPOINT s08_denied_evidence`;
        await expect((async () => { await operation(); await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`; })()).rejects.toThrow();
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT s08_denied_evidence`;
        await tx.$executeRaw`RELEASE SAVEPOINT s08_denied_evidence`;
      }
      await rejected(() => tx.projectTemplateVersion.update({ where: { id: version.id }, data: { definition: { ...dated, scopes: ["Mutated"] } } }));
      await rejected(() => tx.projectTemplateVersion.delete({ where: { id: version.id } }));
      await rejected(() => tx.projectPlan.update({ where: { projectId: project.id }, data: { definition: {} } }));
      await rejected(() => tx.projectPlanItem.update({ where: { id: milestone.id }, data: { targetAt: new Date() } }));
      await rejected(() => tx.projectPlanItem.delete({ where: { id: milestone.id } }));
      await workflow.assignment(ownerActor, project.id, { employeeId: managerEmployeeId, expectedVersion: 1, reason: "Assign accountable lead" });
      await workflow.lead(ownerActor, project.id, { employeeId: managerEmployeeId, expectedVersion: 2, reason: "Appoint eligible lead" });
      await workflow.status(ownerActor, project.id, { toStatus: "ACTIVE", expectedVersion: 3, reason: "Start delivery plan" });
      await rejected(() => tx.projectPlanItem.update({ where: { id: milestone.id }, data: { completedAt: new Date() } }));
      await rejected(() => tx.projectGateOverride.create({ data: { organizationId: ownerActor.organizationId, projectId: project.id, actorId: ownerActor.accountId, projectVersion: 5, reason: "Forged milestone override", milestoneIds: [milestone.id] } }));
      const viewer = await tx.employee.findUniqueOrThrow({ where: { accountId: viewerActor.accountId } });
      await workflow.assignment(ownerActor, project.id, { employeeId: viewer.id, expectedVersion: 4, reason: "Assign ordinary contributor" });
      await expect(workflow.completePlanItem(viewerActor, project.id, milestone.id, { expectedVersion: 5, reason: "No completion grant" })).rejects.toThrow("Permission denied");
      await tx.employeePermissionOverride.create({ data: { organizationId: ownerActor.organizationId, employeeId: viewer.id, permissionKey: "project.plan_complete", effect: "ALLOW", scopeKind: "BRANCH", branchId, reason: "Explicit staff plan completion authority" } });
      await workflow.status(ownerActor, project.id, { toStatus: "ON_HOLD", expectedVersion: 5, reason: "Pause plan decisions" });
      await expect(workflow.completePlanItem(viewerActor, project.id, milestone.id, { expectedVersion: 6, reason: "Paused delivery attempt" })).rejects.toThrow("Active");
      await workflow.status(ownerActor, project.id, { toStatus: "ACTIVE", expectedVersion: 6, reason: "Resume eligible delivery" });
      await workflow.completePlanItem(viewerActor, project.id, milestone.id, { expectedVersion: 7, reason: "Complete required milestone" });
      const history = await tx.projectPlanCompletion.findUniqueOrThrow({ where: { itemId: milestone.id } });
      await rejected(() => tx.projectPlanCompletion.update({ where: { id: history.id }, data: { reason: "Rewritten evidence" } }));
      await expect(workflow.completePlanItem(viewerActor, project.id, milestone.id, { expectedVersion: 8, reason: "Duplicate completion" })).rejects.toThrow("already completed");
      await workflow.revokeAssignment(ownerActor, project.id, viewer.id, { expectedVersion: 8, reason: "Withdraw contributor access" });
      await expect(workflow.plan(viewerActor, project.id)).rejects.toThrow("Permission denied");
      const stage = plan.items.find((item) => item.kind === "STAGE")!;
      await expect(workflow.completePlanItem(viewerActor, project.id, stage.id, { expectedVersion: 9, reason: "Revoked contributor attempt" })).rejects.toThrow("Permission denied");
      await workflow.status(ownerActor, project.id, { toStatus: "COMPLETED", expectedVersion: 9, reason: "Complete after required milestone" });
      expect(await tx.projectGateOverride.count({ where: { projectId: project.id } })).toBe(0);
      expect((await workflow.plan(ownerActor, project.id)).history).toHaveLength(1);
      expect((await tx.projectTemplateVersion.findUniqueOrThrow({ where: { id: version.id } })).definition).toEqual(dated);
      expect(await tx.employee.update({ where: { id: viewer.id }, data: { state: EmployeeState.SUSPENDED } })).toBeTruthy();
      await expect(templates.list(viewerActor)).rejects.toThrow("Permission denied");
    });
  });
});

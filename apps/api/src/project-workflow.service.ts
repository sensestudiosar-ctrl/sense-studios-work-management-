import { pauseTimeTimers } from "./time-lifecycle.js";
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountKind, AccountState, EmployeeState, Prisma, ProjectStatus, type ApprovalRequest } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService, type ApprovalHandler } from "./approval.service.js";
import { evaluateProjectLifecycleTransition } from "./project-lifecycle-policy.js";
import { recordProjectEvent } from "./project-events.js";
import type { ProjectActor } from "./project.service.js";

type Tx = Prisma.TransactionClient;
const SCOPE_TYPE = "project.scope_change";
type ProjectRow = NonNullable<Awaited<ReturnType<Tx["project"]["findUnique"]>>>;

@Injectable()
export class ProjectWorkflowService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService, private readonly approvals: ApprovalService) {
    this.approvals.registerHandler(this.scopeHandler());
  }
  private get db() { return this.database.prisma; }
  private owner(actor: ProjectActor) { if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required"); }
  private async activeActor(tx: Tx, actor: ProjectActor) {
    await tx.$queryRaw`SELECT "id" FROM "accounts" WHERE "id" = ${actor.accountId}::uuid FOR SHARE`;
    const account = await tx.account.findUnique({ where: { id: actor.accountId }, include: { employee: true } });
    if (!account || account.state !== AccountState.ACTIVE || account.kind !== actor.kind ||
      (account.kind === AccountKind.STAFF && (!account.employee || account.employee.state !== EmployeeState.ACTIVE || account.employee.organizationId !== actor.organizationId))) throw new ForbiddenException("Permission denied");
    return account;
  }
  async plan(actor: ProjectActor, id: string) {
    return this.db.$transaction(async (tx) => {
      const project = await this.project(tx, actor, id);
      await this.access(tx, actor, project, "project.view");
      const plan = await tx.projectPlan.findUnique({ where: { projectId: id }, include: { templateVersion: { include: { template: { select: { name: true } } } } } });
      const items = await tx.projectPlanItem.findMany({ where: { projectId: id }, orderBy: [{ kind: "desc" }, { position: "asc" }] });
      const history = await tx.projectPlanCompletion.findMany({ where: { itemId: { in: items.map((item) => item.id) } }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] });
      const employee = actor.kind === AccountKind.STAFF ? await tx.employee.findUnique({ where: { accountId: actor.accountId } }) : null;
      const complete = project.status === ProjectStatus.ACTIVE && (actor.kind === AccountKind.OWNER || employee?.id === project.currentLeadEmployeeId || await this.can(tx, actor, project, "project.plan_complete"));
      const override = actor.kind === AccountKind.OWNER || await this.can(tx, actor, project, "project.gate_override");
      return { plan, items, history, capabilities: { complete, override } };
    });
  }
  async completePlanItem(actor: ProjectActor, id: string, itemId: string, input: { expectedVersion: number; reason: string }) {
    return this.db.$transaction(async (tx) => {
      const project = await this.project(tx, actor, id, input.expectedVersion);
      await this.access(tx, actor, project, "project.view");
      if (project.status !== ProjectStatus.ACTIVE) throw new ConflictException("Only Active project plan items can be completed");
      const employee = actor.kind === AccountKind.STAFF ? await tx.employee.findUnique({ where: { accountId: actor.accountId } }) : null;
      if (actor.kind !== AccountKind.OWNER && employee?.id !== project.currentLeadEmployeeId) await this.access(tx, actor, project, "project.plan_complete");
      const item = await tx.projectPlanItem.findFirst({ where: { id: itemId, projectId: id, organizationId: actor.organizationId } });
      if (!item) throw new NotFoundException("Plan item not found");
      if (item.completedAt) throw new ConflictException("Plan item is already completed");
      const occurredAt = new Date();
      const row = await this.bump(tx, project);
      await tx.projectPlanItem.update({ where: { id: item.id }, data: { completedAt: occurredAt } });
      await tx.projectPlanCompletion.create({ data: { organizationId: actor.organizationId, itemId, actorId: actor.accountId, reason: input.reason, occurredAt, projectVersion: row.version } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "project.plan_item_completed", subjectType: "project", subjectId: id, reason: input.reason, after: { itemId, kind: item.kind, key: item.key, projectVersion: row.version, completedAt: occurredAt.toISOString() } });
      return row;
    });
  }
  private async project(tx: Tx, actor: ProjectActor, id: string, expectedVersion?: number): Promise<ProjectRow> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "projects" WHERE "id" = ${id}::uuid AND "organizationId" = ${actor.organizationId}::uuid FOR UPDATE`;
    if (!rows[0]) throw new NotFoundException("Project not found");
    const project = await tx.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException("Project not found");
    if (expectedVersion !== undefined && project.version !== expectedVersion) throw new ConflictException("Project changed. Refresh and retry");
    return project;
  }
  private async access(tx: Tx, actor: ProjectActor, project: Pick<ProjectRow, "id" | "branchId" | "organizationId">, key: string) {
    await this.activeActor(tx, actor);
    if (actor.kind === AccountKind.OWNER) return;
    const employee = await tx.employee.findUnique({ where: { accountId: actor.accountId } });
    if (!employee || employee.organizationId !== project.organizationId) throw new ForbiddenException("Permission denied");
    const assignment = await tx.projectAssignment.findFirst({ where: { projectId: project.id, organizationId: project.organizationId, employeeId: employee.id, revokedAt: null } });
    if (!assignment || employee.homeBranchId !== project.branchId && !assignment.crossBranchAuthorized) throw new ForbiddenException("Permission denied");
    await this.authorization.assertPermission(actor.accountId, key, { kind: "BRANCH", organizationId: project.organizationId, branchId: project.branchId }, tx);
  }
  private async can(tx: Tx, actor: ProjectActor, project: ProjectRow, key: string) {
    try { await this.access(tx, actor, project, key); return true; }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
  }
  private async bump(tx: Tx, project: ProjectRow, data: Prisma.ProjectUncheckedUpdateInput = {}) {
    if (project.status === ProjectStatus.CANCELLED || project.status === ProjectStatus.ARCHIVED) throw new ConflictException("Terminal project cannot change");
    return tx.project.update({ where: { id: project.id, version: project.version }, data: { ...data, version: { increment: 1 } } });
  }
  private async eligible(tx: Tx, project: ProjectRow, employeeId: string) {
    const employee = await tx.employee.findFirst({ where: { id: employeeId, organizationId: project.organizationId, state: EmployeeState.ACTIVE, account: { state: AccountState.ACTIVE } } });
    if (!employee) throw new ConflictException("An active employee is required");
    const assignment = await tx.projectAssignment.findFirst({ where: { projectId: project.id, employeeId, revokedAt: null } });
    if (!assignment || employee.homeBranchId !== project.branchId && !assignment.crossBranchAuthorized) throw new ConflictException("Project Lead requires a current project assignment");
    await this.authorization.assertPermission(employee.accountId, "project.manage", { kind: "BRANCH", organizationId: project.organizationId, branchId: project.branchId }, tx);
    await this.authorization.assertPermission(employee.accountId, "project.view", { kind: "BRANCH", organizationId: project.organizationId, branchId: project.branchId }, tx);
    return employee;
  }
  async setup(actor: ProjectActor) {
    const account = await this.db.account.findUnique({ where: { id: actor.accountId }, include: { employee: true } });
    if (!account || account.state !== AccountState.ACTIVE || actor.kind === AccountKind.STAFF && account.employee?.state !== EmployeeState.ACTIVE) throw new ForbiddenException("Permission denied");
    const candidates = await this.db.branch.findMany({ where: { organizationId: actor.organizationId, active: true, ...(actor.kind === AccountKind.STAFF ? { projects: { some: { assignments: { some: { employeeId: account.employee?.id ?? "", revokedAt: null } } } } } : {}) }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }] });
    const branches = actor.kind === AccountKind.OWNER ? candidates : [];
    if (actor.kind === AccountKind.STAFF) for (const branch of candidates) {
      const hasEffectiveAssignment = await this.db.projectAssignment.count({ where: {
        employeeId: account.employee!.id, revokedAt: null,
        project: { organizationId: actor.organizationId, branchId: branch.id },
        ...(account.employee!.homeBranchId === branch.id ? {} : { crossBranchAuthorized: true }),
      } });
      if (!hasEffectiveAssignment) continue;
      try { await this.authorization.assertPermission(actor.accountId, "project.view", { kind: "BRANCH", organizationId: actor.organizationId, branchId: branch.id }); branches.push(branch); }
      catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    }
    const employees = actor.kind === AccountKind.OWNER ? await this.db.employee.findMany({ where: { organizationId: actor.organizationId, state: EmployeeState.ACTIVE, account: { state: AccountState.ACTIVE } }, include: { account: { select: { normalizedEmail: true } } }, orderBy: { createdAt: "asc" } }) : [];
    return { owner: actor.kind === AccountKind.OWNER, ownerAccountId: actor.kind === AccountKind.OWNER ? actor.accountId : undefined, branches, employees: employees.map((row) => ({ id: row.id, accountId: row.accountId, name: row.account.normalizedEmail, homeBranchId: row.homeBranchId })) };
  }
  async list(actor: ProjectActor, branchId: string | undefined, offset: number, limit: number, filters: { q?: string; stageKey?: string; sort?: "created" | "name" | "milestone"; direction?: "asc" | "desc" } = {}) {
    return this.db.$transaction(async (tx) => {
      const projects = await tx.project.findMany({ where: { organizationId: actor.organizationId, ...(branchId ? { branchId } : {}) }, orderBy: [{ id: "asc" }], include: { scopes: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] }, branch: { select: { id: true, name: true } }, client: { select: { id: true, name: true } }, currentLead: { select: { account: { select: { normalizedEmail: true } } } } } });
      const authorized: Array<{ project: typeof projects[number]; currentLeadName: string | null; appliedStageKeys: string[]; nextMilestone: { key: string; label: string; targetAt: Date } | null }> = [];
      for (const project of projects) {
        try {
          await this.access(tx, actor, project, "project.view");
          const planItems = await tx.projectPlanItem.findMany({ where: { organizationId: actor.organizationId, projectId: project.id }, orderBy: [{ targetAt: "asc" }, { id: "asc" }], select: { kind: true, key: true, label: true, stageKey: true, targetAt: true, completedAt: true } });
          const milestones = planItems.filter((item) => item.kind === "MILESTONE" && item.completedAt === null && item.targetAt !== null);
          const next = milestones[0];
          authorized.push({ project, currentLeadName: project.currentLead?.account.normalizedEmail ?? null, appliedStageKeys: [...new Set(planItems.flatMap((item) => item.kind === "STAGE" ? [item.key] : item.stageKey ? [item.stageKey] : []))].sort((a, b) => a.localeCompare(b, "en-US")), nextMilestone: next?.targetAt ? { key: next.key, label: next.label, targetAt: next.targetAt } : null });
        } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
      }
      const query = filters.q?.trim().toLocaleLowerCase("en-US");
      const filtered = authorized.filter(({ project, currentLeadName, appliedStageKeys }) => (!filters.stageKey || appliedStageKeys.includes(filters.stageKey)) && (!query || [project.title, project.deliveryType, currentLeadName ?? ""].some((value) => value.toLocaleLowerCase("en-US").includes(query))));
      const direction = filters.direction === "asc" ? 1 : -1;
      filtered.sort((a, b) => {
        const comparison = filters.sort === "name"
          ? a.project.title.localeCompare(b.project.title, "en-US", { sensitivity: "base" })
          : filters.sort === "milestone"
            ? a.nextMilestone && b.nextMilestone ? a.nextMilestone.targetAt.getTime() - b.nextMilestone.targetAt.getTime() : !a.nextMilestone && b.nextMilestone ? 1 : a.nextMilestone && !b.nextMilestone ? -1 : 0
            : a.project.createdAt.getTime() - b.project.createdAt.getTime();
        if (comparison) return comparison * direction;
        return a.project.id.localeCompare(b.project.id);
      });
      const stageKeys = [...new Set(authorized.flatMap(({ appliedStageKeys }) => appliedStageKeys))].sort((a, b) => a.localeCompare(b, "en-US"));
      return { total: filtered.length, stageKeys, items: filtered.slice(offset, offset + limit).map(({ project, currentLeadName, appliedStageKeys, nextMilestone }) => ({ ...project, currentLeadName, appliedStageKeys, nextMilestone })) };
    });
  }
  async detail(actor: ProjectActor, id: string) {
    const project = await this.db.project.findFirst({ where: { id, organizationId: actor.organizationId }, include: {
      branch: { select: { id: true, name: true } }, client: { select: { id: true, name: true } }, scopes: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      assignments: { orderBy: [{ grantedAt: "asc" }, { id: "asc" }] }, leadChanges: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] },
      transfers: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] }, scopePolicyChanges: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] },
      cancellationRequests: { orderBy: [{ requestedAt: "asc" }, { id: "asc" }] }, statusChanges: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] },
      scopeChanges: { orderBy: [{ requestedAt: "asc" }, { id: "asc" }] }
    } });
    if (!project) throw new NotFoundException("Project not found");
    await this.db.$transaction(async (tx) => this.access(tx, actor, project, "project.view"));
    const approvals = await this.db.approvalRequest.findMany({ where: { id: { in: project.scopeChanges.flatMap((row) => row.approvalId ? [row.approvalId] : []) }, organizationId: actor.organizationId }, select: { id: true, state: true, approverId: true, requestedAt: true, resolvedAt: true } });
    const rights = actor.kind === AccountKind.OWNER ? { manage: true, scopeRequest: true, cancellationRequest: true, decideScope: project.scopeApproverAccountId === actor.accountId } : await this.db.$transaction(async (tx) => ({ manage: await this.can(tx, actor, project, "project.manage"), scopeRequest: await this.can(tx, actor, project, "project.scope_request"), cancellationRequest: await this.can(tx, actor, project, "project.cancellation_request"), decideScope: project.scopeApproverAccountId === actor.accountId && await this.can(tx, actor, project, "project.scope_decide") }));
    const currentAccountEmployee = actor.kind === AccountKind.STAFF ? await this.db.employee.findUnique({ where: { accountId: actor.accountId }, select: { id: true } }) : null;
    const override = actor.kind === AccountKind.OWNER || await this.db.$transaction(async (tx) => this.can(tx, actor, project, "project.gate_override"));
    const capabilities = { ...rights, override, assignLead: actor.kind === AccountKind.OWNER, manageLead: actor.kind === AccountKind.OWNER, assignContributor: actor.kind === AccountKind.OWNER, manageAssignments: actor.kind === AccountKind.OWNER, changeStatus: rights.manage, manageLifecycle: rights.manage, requestScopeChange: rights.scopeRequest, requestScope: rights.scopeRequest, requestCancellation: rights.cancellationRequest || currentAccountEmployee?.id === project.currentLeadEmployeeId };
    const people = await this.db.employee.findMany({ where: { id: { in: [...new Set([...project.assignments.map((row) => row.employeeId), ...(project.currentLeadEmployeeId ? [project.currentLeadEmployeeId] : [])])] } }, include: { account: { select: { normalizedEmail: true } } } });
    const peopleById = new Map(people.map((person) => [person.id, person.account.normalizedEmail]));
    const won = project.wonStageChangeId ? await this.db.leadStageChange.findUnique({ where: { id: project.wonStageChangeId } }) : null;
    return { project, capabilities, currentLeadEmployeeId: project.currentLeadEmployeeId, currentLeadName: project.currentLeadEmployeeId ? peopleById.get(project.currentLeadEmployeeId) ?? null : null,
      assignments: project.assignments.filter((row) => row.revokedAt === null).map((row) => ({ ...row, name: peopleById.get(row.employeeId) ?? row.employeeId })),
      leadChanges: project.leadChanges, transfers: project.transfers,
      scopeChanges: project.scopeChanges.map((row) => ({ ...row, status: approvals.find((a) => a.id === row.approvalId)?.state ?? "PENDING", reason: row.requestReason, approvalId: row.approvalId })),
      cancellationRequests: project.cancellationRequests.map((row) => ({ ...row, status: "PENDING" })),
      ...(won ? { wonLeadProvenance: { leadId: won.leadId, stageChangeId: won.id, occurredAt: won.occurredAt, actorId: won.actorId, fromStage: won.fromStage, toStage: won.toStage, leadVersion: won.leadVersion, skippedStages: won.skippedStages } } : {}) };
  }
  async assignment(actor: ProjectActor, id: string, input: { employeeId: string; expectedVersion: number; reason: string }) {
    this.owner(actor);
    return this.db.$transaction(async (tx) => {
      await this.activeActor(tx, actor);
      const project = await this.project(tx, actor, id, input.expectedVersion);
      if (project.status === ProjectStatus.ARCHIVED) throw new ConflictException("Archived project cannot change");
      const employee = await tx.employee.findFirst({ where: { id: input.employeeId, organizationId: actor.organizationId, state: EmployeeState.ACTIVE, account: { state: AccountState.ACTIVE } } });
      if (!employee) throw new ConflictException("An active employee is required");
      await this.authorization.assertPermission(employee.accountId, "project.view", { kind: "BRANCH", organizationId: actor.organizationId, branchId: project.branchId }, tx);
      if (await tx.projectAssignment.findFirst({ where: { projectId: id, employeeId: input.employeeId, revokedAt: null } })) throw new ConflictException("Employee is already assigned");
      const row = await tx.projectAssignment.create({ data: { projectId: id, organizationId: actor.organizationId, employeeId: input.employeeId, crossBranchAuthorized: employee.homeBranchId !== project.branchId, grantedById: actor.accountId, grantReason: input.reason } });
      await this.bump(tx, project);
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "project.assignment_changed", subjectType: "project", subjectId: id, reason: input.reason, after: { assignmentId: row.id, employeeId: input.employeeId, crossBranchAuthorized: row.crossBranchAuthorized, version: project.version + 1 } });
      return row;
    });
  }
  async revokeAssignment(actor: ProjectActor, id: string, employeeId: string, input: { expectedVersion: number; reason: string }) {
    this.owner(actor);
    return this.db.$transaction(async (tx) => {
      await this.activeActor(tx, actor);
      const project = await this.project(tx, actor, id, input.expectedVersion);
      if (project.currentLeadEmployeeId === employeeId && project.status === ProjectStatus.ACTIVE) throw new ConflictException("Hold and replace the active Project Lead before revoking access");
      const row = await tx.projectAssignment.findFirst({ where: { projectId: id, employeeId, revokedAt: null } });
      if (!row) throw new NotFoundException("Active assignment not found");
      await tx.projectAssignment.update({ where: { id: row.id }, data: { revokedAt: new Date(), revokedById: actor.accountId, revocationReason: input.reason } });
      const terminal = project.status === ProjectStatus.CANCELLED || project.status === ProjectStatus.ARCHIVED;
      const removedLead = !terminal && project.currentLeadEmployeeId === employeeId;
      const updated = terminal ? project : await this.bump(tx, project, removedLead ? { currentLeadEmployeeId: null } : {});
      if (removedLead) await tx.projectLeadChange.create({ data: { projectId: id, organizationId: actor.organizationId, oldEmployeeId: employeeId, projectVersion: updated.version, actorId: actor.accountId, reason: input.reason } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "project.assignment_changed", subjectType: "project", subjectId: id, reason: input.reason, before: { employeeId, assignmentId: row.id }, after: { revoked: true, version: updated.version } });
      return { revoked: true };
    });
  }
  async lead(actor: ProjectActor, id: string, input: { employeeId: string; expectedVersion: number; reason: string }) {
    this.owner(actor);
    return this.db.$transaction(async (tx) => {
      await this.activeActor(tx, actor);
      const project = await this.project(tx, actor, id, input.expectedVersion);
      if (project.status === ProjectStatus.ARCHIVED || project.currentLeadEmployeeId === input.employeeId) throw new ConflictException("Project Lead cannot be changed");
      await this.eligible(tx, project, input.employeeId);
      const row = await this.bump(tx, project, { currentLeadEmployeeId: input.employeeId });
      await tx.projectLeadChange.create({ data: { projectId: id, organizationId: actor.organizationId, oldEmployeeId: project.currentLeadEmployeeId, newEmployeeId: input.employeeId, projectVersion: row.version, actorId: actor.accountId, reason: input.reason } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "project.lead_changed", subjectType: "project", subjectId: id, reason: input.reason, before: { leadEmployeeId: project.currentLeadEmployeeId }, after: { leadEmployeeId: input.employeeId, version: row.version } });
      return row;
    });
  }
  async status(actor: ProjectActor, id: string, input: { toStatus: ProjectStatus; expectedVersion: number; reason: string; overrideMilestones?: boolean | undefined }) {
    return this.db.$transaction(async (tx) => {
      await this.activeActor(tx, actor);
      const project = await this.project(tx, actor, id, input.expectedVersion);
      await this.access(tx, actor, project, "project.manage");
      let transition;
      try { transition = evaluateProjectLifecycleTransition(project.status, input.toStatus, input.reason); }
      catch (error) { throw new ConflictException(error instanceof Error ? error.message : "Invalid project transition"); }
      if (input.toStatus === ProjectStatus.ARCHIVED) this.owner(actor);
      if (input.overrideMilestones && input.toStatus !== ProjectStatus.COMPLETED) throw new ConflictException("Milestone override applies only to project completion");
      if (input.toStatus === ProjectStatus.COMPLETED && actor.kind !== AccountKind.OWNER) await this.access(tx, actor, project, "project.gate_override");
      if (transition.requiredGates.includes("PROJECT_LEAD_ASSIGNED")) {
        if (!project.currentLeadEmployeeId) throw new ConflictException("An eligible Project Lead is required");
        await this.eligible(tx, project, project.currentLeadEmployeeId);
      }
      if (input.toStatus === ProjectStatus.COMPLETED && await tx.approvalRequest.count({ where: { organizationId: actor.organizationId, typeKey: SCOPE_TYPE, sourceType: "project_scope_change", sourceId: { in: (await tx.projectScopeChange.findMany({ where: { projectId: id }, select: { id: true } })).map((row) => row.id) }, state: "PENDING" } })) throw new ConflictException("Resolve pending scope changes before completion");
      const missing = input.toStatus === ProjectStatus.COMPLETED ? await tx.projectPlanItem.findMany({ where: { projectId: id, kind: "MILESTONE", required: true, completedAt: null }, select: { id: true }, orderBy: { id: "asc" } }) : [];
      if (missing.length && !input.overrideMilestones) throw new ConflictException("Complete required milestones before project completion, or record an authorized override");
      if (missing.length) {
        await this.access(tx, actor, project, "project.gate_override");
        await tx.projectGateOverride.create({ data: { organizationId: actor.organizationId, projectId: id, actorId: actor.accountId, reason: input.reason, projectVersion: project.version + 1, milestoneIds: missing.map((item) => item.id) } });
        await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "project.gate_overridden", subjectType: "project", subjectId: id, reason: input.reason, after: { milestoneIds: missing.map((item) => item.id), projectVersion: project.version + 1 } });
      }
      if (input.toStatus !== ProjectStatus.ACTIVE) await pauseTimeTimers(tx, { organizationId: actor.organizationId, projectId: id, actorId: actor.accountId, reason: input.reason });
      const row = await this.bump(tx, project, { status: input.toStatus });
      await tx.projectStatusChange.create({ data: { projectId: id, organizationId: actor.organizationId, fromStatus: project.status, toStatus: input.toStatus, projectVersion: row.version, reason: input.reason, actorId: actor.accountId } });
      const eventName = input.toStatus === ProjectStatus.ACTIVE ? "project.activated" : input.toStatus === ProjectStatus.ON_HOLD ? "project.on_hold" : input.toStatus === ProjectStatus.COMPLETED ? "project.completed" : "project.archived";
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName, subjectType: "project", subjectId: id, reason: input.reason, before: { status: project.status, version: project.version }, after: { status: row.status, version: row.version, leadEmployeeId: row.currentLeadEmployeeId } });
      return row;
    });
  }
  async transfer(actor: ProjectActor, id: string, input: { toBranchId: string; expectedVersion: number; reason: string }) {
    this.owner(actor);
    return this.db.$transaction(async (tx) => {
      await this.activeActor(tx, actor);
      const project = await this.project(tx, actor, id, input.expectedVersion);
      if (project.status === ProjectStatus.ARCHIVED || project.branchId === input.toBranchId) throw new ConflictException("Project cannot be transferred to this Branch");
      const target = await tx.branch.findFirst({ where: { id: input.toBranchId, organizationId: actor.organizationId, active: true } });
      if (!target) throw new NotFoundException("Destination Branch not found");
      const pending = await tx.projectScopeChange.findMany({ where: { projectId: id, approvalId: { not: null } }, select: { approvalId: true } });
      if (pending.length && await tx.approvalRequest.count({ where: { id: { in: pending.flatMap((row) => row.approvalId ? [row.approvalId] : []) }, state: "PENDING" } })) throw new ConflictException("Resolve pending scope changes before Branch transfer");
      const assignments = await tx.projectAssignment.findMany({ where: { projectId: id, revokedAt: null } });
      const employees = await tx.employee.findMany({ where: { id: { in: assignments.map((row) => row.employeeId) } }, select: { id: true, homeBranchId: true } });
      const revokedIds = employees.filter((employee) => employee.homeBranchId !== input.toBranchId).map((employee) => employee.id);
      const now = new Date();
      await tx.projectAssignment.updateMany({ where: { projectId: id, employeeId: { in: revokedIds }, revokedAt: null }, data: { revokedAt: now, revokedById: actor.accountId, revocationReason: "Owning Branch transferred" } });
      const lostLead = project.currentLeadEmployeeId && revokedIds.includes(project.currentLeadEmployeeId);
      const hold = lostLead && project.status === ProjectStatus.ACTIVE;
      const row = await tx.project.update({
        where: { id: project.id, version: project.version },
        data: {
          branchId: input.toBranchId,
          ...(lostLead ? { currentLeadEmployeeId: null } : {}),
          ...(hold ? { status: ProjectStatus.ON_HOLD } : {}),
          version: { increment: 1 },
        },
      });
      await tx.projectBranchTransfer.create({ data: { projectId: id, organizationId: actor.organizationId, fromBranchId: project.branchId, toBranchId: input.toBranchId, projectVersion: row.version, actorId: actor.accountId, reason: input.reason } });
      if (lostLead) await tx.projectLeadChange.create({ data: { projectId: id, organizationId: actor.organizationId, oldEmployeeId: project.currentLeadEmployeeId, projectVersion: row.version, actorId: actor.accountId, reason: "Project Lead access revoked by Branch transfer" } });
      if (hold) await pauseTimeTimers(tx, { organizationId: actor.organizationId, projectId: id, actorId: actor.accountId, reason: "Project hold pauses timer" });
      if (hold) await tx.projectStatusChange.create({ data: { projectId: id, organizationId: actor.organizationId, fromStatus: project.status, toStatus: ProjectStatus.ON_HOLD, projectVersion: row.version, reason: "Project Lead access revoked by Branch transfer", actorId: actor.accountId } });
      if (hold) await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "project.on_hold", subjectType: "project", subjectId: id, reason: "Project Lead access revoked by Branch transfer", before: { status: project.status }, after: { status: ProjectStatus.ON_HOLD, version: row.version } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "project.transferred", subjectType: "project", subjectId: id, reason: input.reason, before: { branchId: project.branchId, status: project.status, leadEmployeeId: project.currentLeadEmployeeId }, after: { branchId: input.toBranchId, status: row.status, leadEmployeeId: row.currentLeadEmployeeId, revokedEmployeeIds: revokedIds, version: row.version } });
      return row;
    });
  }
  async setScopeApprover(actor: ProjectActor, id: string, input: { accountId: string; expectedVersion: number; reason: string }) {
    this.owner(actor);
    return this.db.$transaction(async (tx) => {
      await this.activeActor(tx, actor);
      const project = await this.project(tx, actor, id, input.expectedVersion);
      if (project.status === ProjectStatus.ARCHIVED || project.scopeApproverAccountId === input.accountId) throw new ConflictException("Scope approver cannot be changed");
      const pending = await tx.projectScopeChange.findMany({ where: { projectId: id, approvalId: { not: null } }, select: { approvalId: true } });
      if (pending.length && await tx.approvalRequest.count({ where: { id: { in: pending.flatMap((row) => row.approvalId ? [row.approvalId] : []) }, state: "PENDING" } })) throw new ConflictException("Resolve pending scope changes before changing the approver");
      await this.assertScopeApprover(tx, project, input.accountId);
      const row = await this.bump(tx, project, { scopeApproverAccountId: input.accountId });
      await tx.projectScopePolicyChange.create({ data: { projectId: id, organizationId: actor.organizationId, oldApproverId: project.scopeApproverAccountId, newApproverId: input.accountId, projectVersion: row.version, actorId: actor.accountId, reason: input.reason } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "project.scope_policy_changed", subjectType: "project", subjectId: id, reason: input.reason, before: { approverId: project.scopeApproverAccountId }, after: { approverId: input.accountId, version: row.version } });
      return row;
    });
  }
  private async assertScopeApprover(tx: Tx, project: ProjectRow, accountId: string) {
    const account = await tx.account.findUnique({ where: { id: accountId }, include: { employee: true } });
    if (!account || account.state !== AccountState.ACTIVE || account.kind === AccountKind.STAFF && (!account.employee || account.employee.state !== EmployeeState.ACTIVE || account.employee.organizationId !== project.organizationId)) throw new ConflictException("An active approver is required");
    if (account.kind === AccountKind.STAFF) await this.access(tx, { accountId, kind: AccountKind.STAFF, organizationId: project.organizationId }, project, "project.scope_decide");
  }
  async requestScope(actor: ProjectActor, id: string, input: { name: string; expectedVersion: number; reason: string }) {
    return this.db.$transaction(async (tx) => {
      await this.activeActor(tx, actor);
      const project = await this.project(tx, actor, id, input.expectedVersion);
      await this.access(tx, actor, project, "project.scope_request");
      if (project.status !== ProjectStatus.ACTIVE && project.status !== ProjectStatus.ON_HOLD) throw new ConflictException("Scope may be added only to an Active or On Hold project");
      if (project.status === ProjectStatus.ON_HOLD && !project.currentLeadEmployeeId) throw new ConflictException("Appoint a Project Lead before new delivery decisions");
      if (!project.scopeApproverAccountId) throw new ConflictException("Owner must configure a named scope approver first");
      await this.assertScopeApprover(tx, project, project.scopeApproverAccountId);
      if (project.scopeApproverAccountId === actor.accountId) throw new ForbiddenException("Requester cannot approve their own scope change");
      const normalizedName = input.name.toLocaleLowerCase("en-US");
      if (await tx.projectScope.findFirst({ where: { projectId: id, normalizedName } })) throw new ConflictException("Scope is already part of this project");
      const changes = await tx.projectScopeChange.findMany({ where: { projectId: id, normalizedName, approvalId: { not: null } }, select: { approvalId: true } });
      if (changes.length && await tx.approvalRequest.count({ where: { id: { in: changes.flatMap((row) => row.approvalId ? [row.approvalId] : []) }, state: "PENDING" } })) throw new ConflictException("A matching scope change is already pending");
      const change = await tx.projectScopeChange.create({ data: { projectId: id, organizationId: actor.organizationId, name: input.name, normalizedName, requesterId: actor.accountId, requestReason: input.reason } });
      const approval = await this.approvals.createRequest(tx, actor, SCOPE_TYPE, { sourceType: "project_scope_change", sourceId: change.id, reason: input.reason, context: { projectId: id, name: input.name, normalizedName, projectVersion: project.version } });
      await tx.projectScopeChange.update({ where: { id: change.id }, data: { approvalId: approval.id } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "project.scope_requested", subjectType: "project", subjectId: id, reason: input.reason, after: { scopeChangeId: change.id, approvalId: approval.id, name: input.name } });
      return { changeId: change.id, approvalId: approval.id };
    });
  }
  async decideScope(actor: ProjectActor, id: string, approvalId: string, input: { outcome: "APPROVED" | "REJECTED"; reason: string }) {
    return this.db.$transaction(async (tx) => {
      await this.activeActor(tx, actor);
      const change = await tx.projectScopeChange.findFirst({ where: { projectId: id, organizationId: actor.organizationId, approvalId } });
      if (!change) throw new NotFoundException("Scope approval not found");
      await this.approvals.decide(tx, actor, approvalId, input);
      return { decided: true };
    });
  }
  async withdrawScope(actor: ProjectActor, id: string, approvalId: string, reason: string) {
    this.owner(actor);
    return this.db.$transaction(async (tx) => {
      await this.activeActor(tx, actor);
      const change = await tx.projectScopeChange.findFirst({ where: { projectId: id, organizationId: actor.organizationId, approvalId } });
      if (!change) throw new NotFoundException("Scope approval not found");
      const request = await this.approvals.withdraw(tx, actor, approvalId, reason);
      return { approvalId: request.id, state: request.state };
    });
  }
  async requestCancellation(actor: ProjectActor, id: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      await this.activeActor(tx, actor);
      const project = await this.project(tx, actor, id);
      if (project.status !== ProjectStatus.DRAFT && project.status !== ProjectStatus.ACTIVE && project.status !== ProjectStatus.ON_HOLD) throw new ConflictException("Cancellation cannot be requested for this project");
      if (actor.kind !== AccountKind.OWNER) {
        const employee = await tx.employee.findUnique({ where: { accountId: actor.accountId } });
        if (employee?.id !== project.currentLeadEmployeeId) await this.access(tx, actor, project, "project.cancellation_request");
        else await this.access(tx, actor, project, "project.view");
      }
      const row = await tx.projectCancellationRequest.create({ data: { projectId: id, organizationId: actor.organizationId, requesterId: actor.accountId, reason } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "project.cancellation_requested", subjectType: "project", subjectId: id, reason, after: { requestId: row.id, status: project.status } });
      return row;
    });
  }
  /** S09 calls this inside its employee-exit transaction, alongside task waits and access revocation. */
  async holdForLeadExit(tx: Tx, organizationId: string, employeeId: string, actorId: string): Promise<string[]> {
    const actor = await tx.account.findUnique({ where: { id: actorId } });
    if (!actor || actor.state !== AccountState.ACTIVE || actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    const ids = (await tx.project.findMany({ where: { organizationId, currentLeadEmployeeId: employeeId, status: ProjectStatus.ACTIVE }, select: { id: true }, orderBy: { id: "asc" } })).map((row) => row.id);
    const heldIds: string[] = [];
    for (const id of ids) {
      const project = await this.project(tx, { accountId: actorId, organizationId, kind: AccountKind.OWNER }, id);
      if (project.status !== ProjectStatus.ACTIVE || project.currentLeadEmployeeId !== employeeId) continue;
      await pauseTimeTimers(tx, { organizationId, projectId: id, actorId, reason: "Project Lead exit hold pauses timers" });
      const row = await this.bump(tx, project, { status: ProjectStatus.ON_HOLD, currentLeadEmployeeId: null });
      const reason = "Current Project Lead exited; Owner replacement required";
      await tx.projectLeadChange.create({ data: { projectId: id, organizationId, oldEmployeeId: employeeId, projectVersion: row.version, actorId, reason } });
      await tx.projectStatusChange.create({ data: { projectId: id, organizationId, fromStatus: ProjectStatus.ACTIVE, toStatus: ProjectStatus.ON_HOLD, projectVersion: row.version, actorId, reason } });
      await recordProjectEvent(tx, { organizationId, actorId, eventName: "project.on_hold", subjectType: "project", subjectId: id, reason, before: { status: ProjectStatus.ACTIVE, leadEmployeeId: employeeId }, after: { status: ProjectStatus.ON_HOLD, leadEmployeeId: null, version: row.version } });
      heldIds.push(id);
    }
    const assignments = await tx.projectAssignment.findMany({ where: { organizationId, employeeId, revokedAt: null } });
    for (const assignment of assignments) {
      const project = await this.project(tx, { accountId: actorId, organizationId, kind: AccountKind.OWNER }, assignment.projectId);
      await tx.projectAssignment.update({ where: { id: assignment.id }, data: { revokedAt: new Date(), revokedById: actorId, revocationReason: "Employee exited" } });
      const version = heldIds.includes(project.id) || project.status === ProjectStatus.ARCHIVED || project.status === ProjectStatus.CANCELLED ? project.version : (await this.bump(tx, project)).version;
      await recordProjectEvent(tx, { organizationId, actorId, eventName: "project.assignment_changed", subjectType: "project", subjectId: project.id, reason: "Employee exited", before: { assignmentId: assignment.id, employeeId }, after: { revoked: true, version } });
    }
    return heldIds;
  }
  private scopeHandler(): ApprovalHandler {
    const load = async (tx: Tx, request: ApprovalRequest) => {
      const change = await tx.projectScopeChange.findFirst({ where: { id: request.sourceId, organizationId: request.organizationId, approvalId: request.id } });
      const project = change ? await tx.project.findFirst({ where: { id: change.projectId, organizationId: request.organizationId } }) : null;
      return { change, project };
    };
    return {
      typeKey: SCOPE_TYPE, canSelfApprove: false,
      resolveApprover: async (tx, actor, input) => {
        const change = await tx.projectScopeChange.findFirst({ where: { id: input.sourceId, organizationId: actor.organizationId } });
        const project = change ? await tx.project.findUnique({ where: { id: change.projectId } }) : null;
        if (!project?.scopeApproverAccountId || !change || change.requesterId !== actor.accountId) throw new ForbiddenException("Scope approval policy is unavailable");
        await this.assertScopeApprover(tx, project, project.scopeApproverAccountId);
        return { accountId: project.scopeApproverAccountId, level: "Named project scope approver" };
      },
      canView: async (tx, actor, request) => {
        const { project } = await load(tx, request);
        if (!project) return false;
        if (actor.accountId === request.requesterId || actor.accountId === request.approverId) return this.can(tx, { ...actor, kind: (await tx.account.findUniqueOrThrow({ where: { id: actor.accountId } })).kind }, project, "project.view");
        return (await tx.account.findUnique({ where: { id: actor.accountId } }))?.kind === AccountKind.OWNER;
      },
      canDecide: async (tx, actor, request) => {
        const { project } = await load(tx, request);
        if (!project || project.status === ProjectStatus.ARCHIVED || project.status === ProjectStatus.CANCELLED || project.status === ProjectStatus.ON_HOLD && !project.currentLeadEmployeeId || actor.accountId !== project.scopeApproverAccountId || request.approverId !== actor.accountId) return false;
        try { await this.assertScopeApprover(tx, project, actor.accountId); return true; } catch (error) { if (error instanceof ForbiddenException || error instanceof ConflictException) return false; throw error; }
      },
      canWithdraw: async (tx, actor) => {
        const account = await tx.account.findUnique({ where: { id: actor.accountId }, select: { kind: true, state: true } });
        return account?.kind === AccountKind.OWNER && account.state === AccountState.ACTIVE;
      },
      projectCard: async (tx, request) => {
        const { change, project } = await load(tx, request);
        return { title: "Project scope change", summary: change?.name ?? "Scope change", subjectLabel: project?.title ?? "Project", requesterLabel: request.requesterId, levelLabel: "Named project scope approver" };
      },
      onDecision: async (tx, request, decision, deciderId) => {
        const { change, project } = await load(tx, request);
        if (!change || !project) throw new ConflictException("Scope change is no longer available");
        const current = await this.project(tx, { accountId: deciderId, organizationId: project.organizationId, kind: AccountKind.OWNER }, project.id);
        if (current.scopeApproverAccountId !== deciderId || current.status !== ProjectStatus.ACTIVE && current.status !== ProjectStatus.ON_HOLD || current.status === ProjectStatus.ON_HOLD && !current.currentLeadEmployeeId) throw new ConflictException("Scope approval policy or project status changed");
        await this.assertScopeApprover(tx, current, deciderId);
        if (decision.outcome === "APPROVED") {
          if (await tx.projectScope.findFirst({ where: { projectId: project.id, normalizedName: change.normalizedName } })) throw new ConflictException("Scope was already added");
          await tx.projectScope.create({ data: { projectId: project.id, organizationId: project.organizationId, name: change.name, normalizedName: change.normalizedName, baseline: false, scopeChangeId: change.id } });
          await this.bump(tx, current);
          await recordProjectEvent(tx, { organizationId: project.organizationId, actorId: deciderId, eventName: "project.scope_changed", subjectType: "project", subjectId: project.id, reason: decision.reason, after: { scopeChangeId: change.id, approvalId: request.id, name: change.name, version: current.version + 1 } });
        }
      }
    };
  }
}

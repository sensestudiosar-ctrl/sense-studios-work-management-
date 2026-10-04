import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountKind, Prisma, type ApprovalRequest } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService, type ApprovalHandler } from "./approval.service.js";
import { RevisionService } from "./revision.service.js";
import { ClientPortalScopeService } from "./client-portal-scope.service.js";
import type { ActiveClientPortalSession } from "./client-portal-identity.service.js";
import type { ProjectActor } from "./project.service.js";
import { recordProjectEvent } from "./project-events.js";

type Tx = Prisma.TransactionClient;
type Actor = ProjectActor & { sessionId?: string };
type Release = NonNullable<Awaited<ReturnType<Tx["turnkeyRelease"]["findUnique"]>>>;
type Project = NonNullable<Awaited<ReturnType<Tx["project"]["findUnique"]>>>;
type Line = { key: string; description: string; quantity: string; unit: string };
type Price = { key: string; unitPrice: string };
type Input = { revisionIds: string[]; lines: Line[]; prices: Price[]; currency: string; reason: string; replacesReleaseId?: string | undefined; changeReason?: string | undefined };
type Versioned = { expectedVersion: number; reason: string };
type Kind = "cost" | "procurement";
const json = (value: unknown) => value as Prisma.InputJsonValue;
const approved = new Set(["COST_APPROVED", "PROCUREMENT_PENDING", "PROCUREMENT_REJECTED", "RELEASED"]);
const decimal = /^\d{1,12}(?:\.\d{1,4})?$/;
const units = (value: string) => BigInt(value.split(".")[0]!) * 10000n + BigInt((value.split(".")[1] ?? "").padEnd(4, "0"));
function format(value: bigint, scale: number) { const raw = value.toString().padStart(scale + 1, "0"); return `${raw.slice(0, -scale)}.${raw.slice(-scale)}`.replace(/\.?0+$/, ""); }

@Injectable()
export class TurnkeyService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService, private readonly approvals: ApprovalService, private readonly revisions: RevisionService, private readonly portalScope: ClientPortalScopeService) {
    this.approvals.registerHandler(this.handler("cost"));
    this.approvals.registerHandler(this.handler("procurement"));
  }
  private transaction<T>(work: (tx: Tx) => Promise<T>) { return this.database.prisma.$transaction(work, { timeout: 30_000 }); }
  private scope(project: Project) { return { kind: "BRANCH" as const, organizationId: project.organizationId, branchId: project.branchId }; }
  private async actor(tx: Tx, actor: Actor) {
    await tx.$queryRaw`SELECT "id" FROM "accounts" WHERE "id"=${actor.accountId}::uuid FOR SHARE`;
    const account = await tx.account.findFirst({ where: { id: actor.accountId, kind: actor.kind, state: "ACTIVE" }, include: { employee: true } });
    if (!account || ![AccountKind.OWNER, AccountKind.STAFF].includes(account.kind as "OWNER" | "STAFF") || account.kind === "STAFF" && (!account.employee || account.employee.state !== "ACTIVE" || account.employee.organizationId !== actor.organizationId)) throw new ForbiddenException("Internal authority ended");
    if (actor.sessionId) {
      await tx.$queryRaw`SELECT "id" FROM "sessions" WHERE "id"=${actor.sessionId}::uuid FOR SHARE`;
      const session = await tx.session.findUnique({ where: { id: actor.sessionId } });
      const now = (await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`)[0]!.now;
      if (!session || session.accountId !== actor.accountId || session.revokedAt || session.expiresAt <= now || session.lastUsedAt.getTime() + 30 * 60_000 <= now.getTime()) throw new ForbiddenException("Session ended. Sign in again");
    }
    return account;
  }
  private async access(tx: Tx, actor: Actor, project: Project, key = "turnkey.view", write = false) {
    const account = await this.actor(tx, actor);
    if (project.organizationId !== actor.organizationId || project.deliveryType !== "TURNKEY") throw new NotFoundException("Turnkey project not found");
    if (write && project.status !== "ACTIVE") throw new ConflictException("Turnkey delivery requires an Active project");
    if (account.kind === "STAFF") {
      const employee = account.employee!;
      await tx.$queryRaw`SELECT "id" FROM "employees" WHERE "id"=${employee.id}::uuid FOR SHARE`;
      if ((await tx.employee.findUniqueOrThrow({ where: { id: employee.id } })).state !== "ACTIVE") throw new ForbiddenException("Employee access ended");
      await tx.$queryRaw`SELECT "id" FROM "project_assignments" WHERE "projectId"=${project.id}::uuid AND "employeeId"=${employee.id}::uuid AND "revokedAt" IS NULL FOR SHARE`;
      const assignment = await tx.projectAssignment.findFirst({ where: { projectId: project.id, employeeId: employee.id, revokedAt: null, organizationId: project.organizationId } });
      if (!assignment || employee.homeBranchId !== project.branchId && !assignment.crossBranchAuthorized) throw new ForbiddenException("Current project assignment required");
      await tx.$queryRaw`SELECT "id" FROM "employee_permission_overrides" WHERE "employeeId"=${employee.id}::uuid AND "revokedAt" IS NULL FOR SHARE`;
      await tx.$queryRaw`SELECT "id" FROM "employee_job_role_assignments" WHERE "employeeId"=${employee.id}::uuid AND "effectiveTo" IS NULL FOR SHARE`;
      await tx.$queryRaw`SELECT p."id" FROM "role_permissions" p JOIN "employee_job_role_assignments" a ON a."jobRoleId"=p."roleId" WHERE a."employeeId"=${employee.id}::uuid AND a."effectiveTo" IS NULL AND p."revokedAt" IS NULL FOR SHARE OF p`;
      await this.authorization.assertPermission(actor.accountId, "project.view", this.scope(project), tx);
      await this.authorization.assertPermission(actor.accountId, key, this.scope(project), tx);
    }
    await this.actor(tx, actor);
  }
  private async leader(tx: Tx, actor: Actor, project: Project, key: string) {
    await this.access(tx, actor, project, key);
    if (actor.kind !== "OWNER") {
      // Team Leader is explicit management authority, never a role title or action grant alone.
      await this.authorization.assertPermission(actor.accountId, "project.manage", this.scope(project), tx);
      await this.authorization.assertPermission(actor.accountId, "employee.manage", this.scope(project), tx);
      if (key.endsWith("_approve")) await this.authorization.assertPermission(actor.accountId, "turnkey.cost_view", this.scope(project), tx);
    }
    await this.actor(tx, actor);
  }
  private async can(tx: Tx, actor: Actor, project: Project, key: string, leader = false) {
    try { if (leader) await this.leader(tx, actor, project, key); else await this.access(tx, actor, project, key); return true; }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
  }
  private async project(tx: Tx, actor: Actor, id: string, write = false) {
    await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id"=${id}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR SHARE`;
    const project = await tx.project.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!project) throw new NotFoundException("Turnkey project not found");
    await this.access(tx, actor, project, "turnkey.view", write);
    return project;
  }
  private async release(tx: Tx, actor: Actor, id: string, expectedVersion?: number) {
    const preview = await tx.turnkeyRelease.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!preview) throw new NotFoundException("Release not found");
    const project = await this.project(tx, actor, preview.projectId, expectedVersion !== undefined);
    await tx.$queryRaw`SELECT "id" FROM "turnkey_releases" WHERE "id"=${id}::uuid FOR UPDATE`;
    const release = await tx.turnkeyRelease.findUniqueOrThrow({ where: { id } });
    if (expectedVersion !== undefined && release.version !== expectedVersion) throw new ConflictException("Release changed. Refresh and retry");
    await this.access(tx, actor, project);
    return { release, project };
  }
  private async event(tx: Tx, actor: Actor, release: Release, name: string, reason: string, before?: Record<string, unknown>, extra: Record<string, unknown> = {}) {
    const eventId = await recordProjectEvent(tx, { organizationId: release.organizationId, actorId: actor.accountId, eventName: name, subjectType: "turnkey_release", subjectId: release.id, reason, ...(before ? { before } : {}), after: { projectId: release.projectId, releaseId: release.id, state: release.state, version: release.version, replacesReleaseId: release.replacesReleaseId, procurementStatus: release.procurementStatus, factoryStatus: release.factoryStatus, ...extra } });
    await tx.turnkeyHistory.create({ data: { releaseId: release.id, organizationId: release.organizationId, projectId: release.projectId, eventName: name, actorId: actor.accountId, reason, releaseVersion: release.version, eventId } });
  }
  private async update(tx: Tx, actor: Actor, release: Release, data: Prisma.TurnkeyReleaseUncheckedUpdateInput, eventName: string, reason: string, extra: Record<string, unknown> = {}) {
    const updated = await tx.turnkeyRelease.update({ where: { id: release.id, version: release.version }, data: { ...data, version: { increment: 1 } } });
    await this.event(tx, actor, updated, eventName, reason, { state: release.state, version: release.version, ...(data.materials ? { materials: release.materials } : {}) }, { ...(data.materials ? { materials: data.materials } : {}), ...extra });
    return { id: updated.id, version: updated.version, state: updated.state };
  }
  private async cost(tx: Tx, release: Release) {
    const prices = (await tx.turnkeyPrice.findUniqueOrThrow({ where: { releaseId: release.id } })).prices as unknown as Price[];
    const lines = release.lines as unknown as Line[];
    const total = lines.reduce((sum, line) => sum + units(line.quantity) * units(prices.find((price) => price.key === line.key)!.unitPrice), 0n);
    return { prices, total: format(total, 8) };
  }
  /** SITE public boundary: scoped operational inputs only; financial fields never enter site responses. */
  async siteMaterials(tx: Tx, actor: Actor, projectId: string) {
    const project = await tx.project.findFirst({ where: { id: projectId, organizationId: actor.organizationId, deliveryType: "TURNKEY" } });
    if (!project) throw new NotFoundException("Turnkey project not found");
    await this.access(tx, actor, project, "site.view");
    return tx.turnkeyRelease.findMany({ where: { projectId, organizationId: actor.organizationId, state: "RELEASED", replacedById: null }, select: { id: true, state: true, lines: true, materials: true, procurementStatus: true, factoryStatus: true }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] }).then(rows => rows.map(({ id, ...row }) => ({ releaseId: id, ...row })));
  }
  async siteRelease(tx: Tx, actor: Actor, projectId: string, releaseId: string) {
    const releases = await this.siteMaterials(tx, actor, projectId);
    const release = releases.find(row => row.releaseId === releaseId);
    if (!release) throw new ConflictException("Choose a current released production input for this project");
    return release;
  }
  async projects(actor: Actor) {
    return this.transaction(async (tx) => {
      await this.actor(tx, actor);
      const rows = await tx.project.findMany({ where: { organizationId: actor.organizationId, deliveryType: "TURNKEY" }, include: { branch: true }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 200 });
      const items = [];
      for (const row of rows) if (await this.can(tx, actor, row, "turnkey.view")) items.push({ id: row.id, title: row.title, status: row.status, branchName: row.branch.name });
      return { items };
    });
  }
  async detail(actor: Actor, projectId: string) {
    return this.transaction(async (tx) => {
      const project = await this.project(tx, actor, projectId);
      const manage = await this.can(tx, actor, project, "turnkey.manage");
      const costView = await this.can(tx, actor, project, "turnkey.cost_view", true);
      const active = project.status === "ACTIVE";
      const eligibleApprovers = [];
      for (const account of await tx.account.findMany({ where: { state: "ACTIVE", kind: { in: ["OWNER", "STAFF"] } }, orderBy: { normalizedEmail: "asc" } })) {
        const candidate: Actor = { accountId: account.id, kind: account.kind, organizationId: actor.organizationId };
        const cost = await this.can(tx, candidate, project, "turnkey.cost_approve", true);
        const procurement = await this.can(tx, candidate, project, "turnkey.procurement_approve", true);
        if (cost || procurement) eligibleApprovers.push({ accountId: account.id, label: account.normalizedEmail, cost, procurement });
      }
      const releases = [];
      for (const row of await tx.turnkeyRelease.findMany({ where: { projectId, organizationId: actor.organizationId }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] })) {
        const costRequest = row.costApprovalId ? await tx.approvalRequest.findUnique({ where: { id: row.costApprovalId } }) : null;
        const procurementRequest = row.procurementApprovalId ? await tx.approvalRequest.findUnique({ where: { id: row.procurementApprovalId } }) : null;
        const replacement = !row.replacedById;
        const history = await tx.turnkeyHistory.findMany({ where: { releaseId: row.id, ...(costView ? {} : { eventName: { in: ["turnkey.materials_selected", "turnkey.progress_changed"] } }) }, orderBy: { releaseVersion: "asc" }, select: { eventName: true, reason: true, actorId: true, occurredAt: true, releaseVersion: true } });
        const visible = costView ? row : { id: row.id, projectId: row.projectId, version: row.version, state: row.state, designs: row.designs, lines: row.lines, materials: row.materials, procurementStatus: row.procurementStatus, factoryStatus: row.factoryStatus, replacesReleaseId: row.replacesReleaseId, replacedById: row.replacedById, createdAt: row.createdAt };
        releases.push({ ...visible, history, capabilities: {
          requestCost: active && manage && row.state === "DRAFT",
          decideCost: active && row.state === "COST_PENDING" && costRequest?.approverId === actor.accountId && costRequest.requesterId !== actor.accountId && await this.can(tx, actor, project, "turnkey.cost_approve", true),
          setMaterials: active && manage && row.state === "COST_APPROVED",
          requestProcurement: active && manage && row.state === "COST_APPROVED" && (row.materials as unknown[]).length === (row.lines as unknown[]).length,
          decideProcurement: active && row.state === "PROCUREMENT_PENDING" && procurementRequest?.approverId === actor.accountId && procurementRequest.requesterId !== actor.accountId && await this.can(tx, actor, project, "turnkey.procurement_approve", true),
          progress: active && manage && row.state === "RELEASED" && replacement,
          shareCosts: active && actor.kind === "OWNER" && approved.has(row.state)
        }, ...(costView ? { costs: await this.cost(tx, row) } : {}), ...(actor.kind === "OWNER" ? { costShares: await tx.turnkeyCostShare.findMany({ where: { releaseId: row.id }, select: { accountId: true, revokedAt: true } }) } : {}) });
      }
      const designCandidates = manage && active ? await this.revisions.productionCandidates(tx, actor, projectId) : [];
      const clients = actor.kind === "OWNER" ? await tx.clientPortalGrant.findMany({ where: { projectId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }) : [];
      const clientOptions = [];
      for (const grant of clients) { const account = await tx.account.findFirst({ where: { id: grant.accountId, state: "ACTIVE", kind: "CLIENT" } }); if (account) clientOptions.push({ accountId: account.id, label: account.normalizedEmail }); }
      await this.access(tx, actor, project);
      return { project: { id: project.id, title: project.title, status: project.status, version: project.version }, releases, capabilities: { create: active && manage && costView, costView, manage: active && manage }, eligibleApprovers: manage ? eligibleApprovers : [], designCandidates, clients: clientOptions };
    });
  }
  async create(actor: Actor, projectId: string, input: Input) {
    return this.transaction(async (tx) => {
      const project = await this.project(tx, actor, projectId, true);
      await this.access(tx, actor, project, "turnkey.manage"); await this.leader(tx, actor, project, "turnkey.cost_view");
      const keys = new Set(input.lines.map((line) => line.key));
      if (!keys.size || keys.size !== input.lines.length || input.lines.length > 100 || input.prices.length !== keys.size || new Set(input.prices.map((p) => p.key)).size !== keys.size || input.prices.some((p) => !keys.has(p.key) || !decimal.test(p.unitPrice)) || input.lines.some((line) => !decimal.test(line.quantity) || units(line.quantity) <= 0n) || !/^[A-Z]{3}$/.test(input.currency)) throw new BadRequestException("Invalid BOQ quantities or prices");
      const designs = await this.revisions.validateProductionInputs(tx, actor, projectId, input.revisionIds);
      await this.access(tx, actor, project, "turnkey.manage"); await this.leader(tx, actor, project, "turnkey.cost_view");
      if (input.replacesReleaseId) {
        const prior = await tx.turnkeyRelease.findFirst({ where: { id: input.replacesReleaseId, projectId, organizationId: actor.organizationId, state: "RELEASED", replacedById: null } });
        if (!prior || !input.changeReason?.trim()) throw new ConflictException("Replacement requires a released input and explicit change reason");
      } else if (input.changeReason) throw new BadRequestException("Change reason requires the release being replaced");
      const release = await tx.turnkeyRelease.create({ data: { organizationId: actor.organizationId, projectId, designs: json(designs), lines: json(input.lines), currency: input.currency, createdById: actor.accountId, reason: input.reason, ...(input.replacesReleaseId ? { replacesReleaseId: input.replacesReleaseId, changeReason: input.changeReason! } : {}) } });
      await tx.turnkeyPrice.create({ data: { releaseId: release.id, organizationId: actor.organizationId, projectId, prices: json(input.prices) } });
      await this.event(tx, actor, release, "turnkey.release_created", input.reason);
      await this.access(tx, actor, project);
      return { id: release.id, version: release.version, state: release.state };
    });
  }
  async request(actor: Actor, id: string, kind: Kind, input: Versioned & { approverAccountId: string }) {
    return this.transaction(async (tx) => {
      const { release, project } = await this.release(tx, actor, id, input.expectedVersion);
      await this.access(tx, actor, project, "turnkey.manage", true);
      if (release.state !== (kind === "cost" ? "DRAFT" : "COST_APPROVED")) throw new ConflictException("Release is not ready for this request");
      if (actor.accountId === input.approverAccountId) throw new ForbiddenException("Requester cannot approve their own request");
      const account = await tx.account.findUnique({ where: { id: input.approverAccountId } });
      if (!account) throw new ForbiddenException("Eligible approver required");
      await this.leader(tx, { accountId: account.id, kind: account.kind, organizationId: actor.organizationId }, project, kind === "cost" ? "turnkey.cost_approve" : "turnkey.procurement_approve");
      await this.revisions.validateProductionInputs(tx, actor, project.id, (release.designs as unknown as Array<{ revisionId: string }>).map((x) => x.revisionId));
      if (kind === "procurement" && (release.materials as unknown[]).length !== (release.lines as unknown[]).length) throw new ConflictException("Select every material before procurement approval");
      const request = await this.approvals.createRequest(tx, actor, `turnkey.${kind}`, { sourceType: "turnkey_release", sourceId: id, reason: input.reason, context: { projectId: project.id, releaseId: id, approverAccountId: account.id } });
      await this.access(tx, actor, project);
      await this.access(tx, actor, project, "turnkey.manage");
      return this.update(tx, actor, release, kind === "cost" ? { state: "COST_PENDING", costApprovalId: request.id, costApproverId: account.id } : { state: "PROCUREMENT_PENDING", procurementApprovalId: request.id, procurementApproverId: account.id }, `turnkey.${kind}_requested`, input.reason);
    });
  }
  async decide(actor: Actor, id: string, kind: Kind, input: Versioned & { outcome: "APPROVED" | "REJECTED" }) {
    return this.transaction(async (tx) => {
      const { release, project } = await this.release(tx, actor, id, input.expectedVersion);
      await this.leader(tx, actor, project, kind === "cost" ? "turnkey.cost_approve" : "turnkey.procurement_approve");
      const approvalId = kind === "cost" ? release.costApprovalId : release.procurementApprovalId;
      if (!approvalId || release.state !== (kind === "cost" ? "COST_PENDING" : "PROCUREMENT_PENDING")) throw new ConflictException("Approval is not pending");
      await this.approvals.decide(tx, actor, approvalId, { outcome: input.outcome, reason: input.reason });
      const row = await tx.turnkeyRelease.findUniqueOrThrow({ where: { id } });
      await this.access(tx, actor, project);
      return { id: row.id, version: row.version, state: row.state };
    });
  }
  async materials(actor: Actor, id: string, input: Versioned & { selections: Array<{ lineKey: string; material: string }> }) {
    return this.transaction(async (tx) => {
      const { release, project } = await this.release(tx, actor, id, input.expectedVersion);
      await this.access(tx, actor, project, "turnkey.manage", true);
      const keys = new Set((release.lines as unknown as Line[]).map((line) => line.key));
      if (release.state !== "COST_APPROVED" || input.selections.length !== keys.size || new Set(input.selections.map((s) => s.lineKey)).size !== keys.size || input.selections.some((s) => !keys.has(s.lineKey) || !s.material.trim())) throw new ConflictException("Material selection must cover every approved BOQ line");
      return this.update(tx, actor, release, { materials: json(input.selections) }, "turnkey.materials_selected", input.reason);
    });
  }
  async progress(actor: Actor, id: string, input: Versioned & { stage: "PROCUREMENT" | "FACTORY"; status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" }) {
    return this.transaction(async (tx) => {
      const { release, project } = await this.release(tx, actor, id, input.expectedVersion);
      await this.access(tx, actor, project, "turnkey.manage", true);
      if (release.state !== "RELEASED" || release.replacedById) throw new ConflictException("Only the current released inputs can progress");
      if (input.stage === "FACTORY" && release.procurementStatus !== "COMPLETED") throw new ConflictException("Complete procurement before factory production");
      const status = input.stage === "FACTORY" ? release.factoryStatus : release.procurementStatus;
      if (!((status === "NOT_STARTED" && input.status === "IN_PROGRESS") || (status === "IN_PROGRESS" && input.status === "COMPLETED"))) throw new ConflictException("Invalid progress transition");
      return this.update(tx, actor, release, input.stage === "FACTORY" ? { factoryStatus: input.status } : { procurementStatus: input.status }, "turnkey.progress_changed", input.reason);
    });
  }
  async share(actor: Actor, id: string, input: Versioned & { accountId: string; view: boolean }) {
    return this.transaction(async (tx) => {
      const { release, project } = await this.release(tx, actor, id, input.expectedVersion);
      if (actor.kind !== "OWNER" || !approved.has(release.state)) throw new ForbiddenException("Owner may share approved cost snapshots only");
      const grant = await tx.clientPortalGrant.findFirst({ where: { accountId: input.accountId, projectId: project.id, organizationId: actor.organizationId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
      if (!grant || !(await tx.account.findFirst({ where: { id: input.accountId, kind: "CLIENT", state: "ACTIVE" } }))) throw new ForbiddenException("Active client project access required");
      const current = await tx.turnkeyCostShare.findUnique({ where: { releaseId_accountId: { releaseId: id, accountId: input.accountId } } });
      if (current) await tx.turnkeyCostShare.update({ where: { id: current.id }, data: { revokedAt: input.view ? null : new Date() } });
      else if (input.view) await tx.turnkeyCostShare.create({ data: { releaseId: id, organizationId: actor.organizationId, projectId: project.id, accountId: input.accountId, createdById: actor.accountId, reason: input.reason } });
      else throw new NotFoundException("Cost share not found");
      return this.update(tx, actor, release, {}, "turnkey.cost_shared", input.reason, { clientAccountId: input.accountId, view: input.view });
    });
  }
  async clientCosts(active: ActiveClientPortalSession, projectId: string) {
    return this.transaction(async (tx) => {
      const { project } = await this.portalScope.authorizeProject(tx, active, projectId);
      if (project.status === "CANCELLED") throw new ForbiddenException("Cancelled project exposes issued files and own approval history only");
      const items = [];
      for (const share of await tx.turnkeyCostShare.findMany({ where: { accountId: active.account.id, projectId, revokedAt: null } })) {
        await tx.$queryRaw`SELECT "id" FROM "turnkey_cost_shares" WHERE "id"=${share.id}::uuid FOR SHARE`;
        const current = await tx.turnkeyCostShare.findUniqueOrThrow({ where: { id: share.id } });
        const release = await tx.turnkeyRelease.findUniqueOrThrow({ where: { id: current.releaseId } });
        if (!current.revokedAt && approved.has(release.state)) items.push({ id: release.id, currency: release.currency, lines: release.lines, costs: await this.cost(tx, release), createdAt: release.createdAt });
      }
      await this.portalScope.authorizeProject(tx, active, projectId);
      return { items };
    });
  }
  private handler(kind: Kind): ApprovalHandler {
    const key = kind === "cost" ? "turnkey.cost_approve" : "turnkey.procurement_approve";
    const load = async (tx: Tx, sourceId: string) => {
      const release = await tx.turnkeyRelease.findUnique({ where: { id: sourceId } });
      const project = release ? await tx.project.findUnique({ where: { id: release.projectId } }) : null;
      if (!release || !project) throw new NotFoundException("Release not found");
      return { release, project };
    };
    const asActor = async (tx: Tx, accountId: string, organizationId: string): Promise<Actor> => ({ accountId, organizationId, kind: (await tx.account.findUniqueOrThrow({ where: { id: accountId } })).kind });
    return {
      typeKey: `turnkey.${kind}`, canSelfApprove: false,
      resolveApprover: async (tx, actor, input) => { const { project } = await load(tx, input.sourceId); const id = (input.context as { approverAccountId?: string }).approverAccountId; if (!id) throw new ForbiddenException("Named approver required"); await this.leader(tx, await asActor(tx, id, actor.organizationId), project, key); return { accountId: id, level: `Named Turnkey ${kind} approver` }; },
      canView: async (tx, actor, request) => { const { project } = await load(tx, request.sourceId); const current = await asActor(tx, actor.accountId, actor.organizationId); return (actor.accountId === request.requesterId || actor.accountId === request.approverId || current.kind === "OWNER") && await this.can(tx, current, project, "turnkey.cost_view", true); },
      canDecide: async (tx, actor, request) => { const { release, project } = await load(tx, request.sourceId); return project.status === "ACTIVE" && request.organizationId === project.organizationId && actor.accountId === request.approverId && release.state === (kind === "cost" ? "COST_PENDING" : "PROCUREMENT_PENDING") && (kind === "cost" ? release.costApprovalId : release.procurementApprovalId) === request.id && await this.can(tx, await asActor(tx, actor.accountId, actor.organizationId), project, key, true); },
      projectCard: async (tx, request) => { const { project } = await load(tx, request.sourceId); return { title: `Turnkey ${kind} approval`, summary: "Review the exact operational release", subjectLabel: project.title, requesterLabel: request.requesterId, levelLabel: `Named ${kind} approver` }; },
      onDecision: async (tx, request: ApprovalRequest, decision, deciderId) => {
        const actor = await asActor(tx, deciderId, request.organizationId);
        const { release, project } = await this.release(tx, actor, request.sourceId);
        await this.access(tx, actor, project, key, true); await this.leader(tx, actor, project, key);
        if (decision.outcome === "APPROVED") await this.revisions.validateProductionInputs(tx, actor, project.id, (release.designs as unknown as Array<{ revisionId: string }>).map((x) => x.revisionId));
        await this.leader(tx, actor, project, key);
        const state = decision.outcome === "REJECTED" ? kind === "cost" ? "COST_REJECTED" : "PROCUREMENT_REJECTED" : kind === "cost" ? "COST_APPROVED" : "RELEASED";
        if (state === "RELEASED" && release.replacesReleaseId) {
          const { release: prior } = await this.release(tx, actor, release.replacesReleaseId);
          if (prior.state !== "RELEASED" || prior.replacedById) throw new ConflictException("Production inputs were already replaced");
          await this.update(tx, actor, prior, { replacedById: release.id }, "turnkey.release_replaced", release.changeReason!);
        }
        await this.update(tx, actor, release, { state }, `turnkey.${kind}_decided`, decision.reason);
      }
    };
  }
}

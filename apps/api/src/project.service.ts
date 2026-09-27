import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountKind, AccountState, Prisma, ProjectDeliveryType, ProjectStatus } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { recordProjectEvent } from "./project-events.js";

export interface ProjectActor { accountId: string; kind: AccountKind; organizationId: string; }
type Tx = Prisma.TransactionClient;

@Injectable()
export class ProjectService {
  constructor(private readonly database: DatabaseService) {}
  private get db() { return this.database.prisma; }

  async actor(accountId: string): Promise<ProjectActor> {
    const row = await this.db.account.findUnique({ where: { id: accountId }, select: { kind: true, employee: { select: { organizationId: true } } } });
    const organizationId = row?.employee?.organizationId ?? (await this.db.organization.findFirst({ select: { id: true } }))?.id;
    if (!row || !organizationId) throw new ForbiddenException("Permission denied");
    return { accountId, kind: row.kind, organizationId };
  }
  private owner(actor: ProjectActor) { if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required"); }
  private async lockedOwner(tx: Tx, actor: ProjectActor) {
    this.owner(actor);
    const rows = await tx.$queryRaw<Array<{ id: string; state: string; kind: string }>>`SELECT "id", "state", "kind" FROM "accounts" WHERE "id" = ${actor.accountId}::uuid FOR SHARE`;
    if (!rows[0] || rows[0].state !== AccountState.ACTIVE || rows[0].kind !== AccountKind.OWNER) throw new ForbiddenException("Permission denied");
    const organization = await tx.organization.findFirst({ select: { id: true } });
    if (!organization || organization.id !== actor.organizationId) throw new ForbiddenException("Permission denied");
  }
  async setup(actor: ProjectActor) {
    this.owner(actor);
    const rows = await this.db.branch.findMany({ where: { organizationId: actor.organizationId, active: true }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true } });
    return { branches: rows };
  }
  async create(actor: ProjectActor, input: { branchId: string; title: string; deliveryType: ProjectDeliveryType; scopes: string[]; clientId?: string | undefined; wonLeadId?: string | undefined; reason: string }) {
    this.owner(actor);
    return this.db.$transaction(async (tx) => {
      await this.lockedOwner(tx, actor);
      const branchRows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "branches" WHERE "id" = ${input.branchId}::uuid AND "organizationId" = ${actor.organizationId}::uuid AND "active" = true FOR SHARE`;
      if (!branchRows[0]) throw new NotFoundException("Branch not found");
      let clientId = input.clientId;
      let wonProvenance: Record<string, unknown> | undefined;
      if (input.wonLeadId) {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "leads" WHERE "id" = ${input.wonLeadId}::uuid AND "organizationId" = ${actor.organizationId}::uuid FOR UPDATE`;
        if (!locked[0]) throw new NotFoundException("Won lead not found");
        const lead = await tx.lead.findFirst({ where: { id: input.wonLeadId, organizationId: actor.organizationId }, include: { stageChanges: { where: { toStage: "WON" }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] } } });
        if (!lead || lead.stage !== "WON" || lead.branchId !== input.branchId) throw new ConflictException("Lead must be Won in the selected branch");
        const won = lead.stageChanges[0];
        if (!won) throw new ConflictException("Won stage history is unavailable");
        if (input.clientId && input.clientId !== lead.clientId) throw new ConflictException("Converted project must retain the Won lead client");
        clientId = lead.clientId ?? undefined;
        wonProvenance = { leadId: lead.id, stageChangeId: won.id, occurredAt: won.occurredAt.toISOString(), actorId: won.actorId, fromStage: won.fromStage, toStage: won.toStage, leadVersion: won.leadVersion, skippedStages: won.skippedStages };
      }
      if (clientId) {
        const client = await tx.client.findFirst({ where: { id: clientId, organizationId: actor.organizationId }, select: { id: true } });
        if (!client) throw new NotFoundException("Client not found");
      }
      const normalized = input.scopes.map((name) => ({ name, normalizedName: name.toLocaleLowerCase("en-US") }));
      if (new Set(normalized.map((x) => x.normalizedName)).size !== normalized.length) throw new ConflictException("Scopes must be unique ignoring case");
      let project: Awaited<ReturnType<typeof tx.project.create>>;
      try {
        project = await tx.project.create({ data: { organizationId: actor.organizationId, branchId: input.branchId, title: input.title, deliveryType: input.deliveryType, ...(clientId ? { clientId } : {}), ...(input.wonLeadId ? { wonLeadId: input.wonLeadId, wonStageChangeId: String(wonProvenance?.stageChangeId) } : {}), createdById: actor.accountId } });
        await tx.projectScope.createMany({ data: normalized.map((scope) => ({ organizationId: actor.organizationId, projectId: project.id, ...scope, baseline: true })) });
        await tx.projectStatusChange.create({ data: { organizationId: actor.organizationId, projectId: project.id, toStatus: ProjectStatus.DRAFT, projectVersion: 1, reason: input.reason, actorId: actor.accountId } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("Won lead has already been converted");
        throw error;
      }
      const persisted = await tx.project.findUniqueOrThrow({ where: { id: project.id }, include: { scopes: true, statusChanges: true, branch: { select: { id: true, name: true } }, client: { select: { id: true, name: true } } } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "project.created", subjectType: "project", subjectId: persisted.id, reason: input.reason, after: { projectId: persisted.id, branchId: persisted.branchId, title: persisted.title, deliveryType: persisted.deliveryType, status: persisted.status, version: persisted.version, clientId: persisted.clientId, wonLead: wonProvenance ?? null, scopeIds: persisted.scopes.map((scope) => scope.id), statusChangeId: persisted.statusChanges[0]?.id } });
      return { project: persisted, ...(wonProvenance ? { wonLeadProvenance: wonProvenance } : {}) };
    });
  }
  async list(actor: ProjectActor, branchId: string, offset: number, limit: number) {
    this.owner(actor);
    const where = { organizationId: actor.organizationId, branchId };
    const [total, items] = await Promise.all([this.db.project.count({ where }), this.db.project.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: offset, take: limit, include: { scopes: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] }, branch: { select: { id: true, name: true } }, client: { select: { id: true, name: true } } } })]);
    return { total, items };
  }
  async detail(actor: ProjectActor, id: string) {
    this.owner(actor);
    const project = await this.db.project.findFirst({ where: { id, organizationId: actor.organizationId }, include: { scopes: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] }, statusChanges: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] }, branch: { select: { id: true, name: true } }, client: { select: { id: true, name: true } } } });
    if (!project) throw new NotFoundException("Project not found");
    let wonLeadProvenance: Record<string, unknown> | undefined;
    if (project.wonLeadId) {
      const won = project.wonStageChangeId ? await this.db.leadStageChange.findFirst({ where: { id: project.wonStageChangeId, leadId: project.wonLeadId, organizationId: actor.organizationId, toStage: "WON" } }) : null;
      if (won) wonLeadProvenance = { leadId: project.wonLeadId, stageChangeId: won.id, occurredAt: won.occurredAt, actorId: won.actorId, fromStage: won.fromStage, toStage: won.toStage, leadVersion: won.leadVersion, skippedStages: won.skippedStages };
    }
    return { project, ...(wonLeadProvenance ? { wonLeadProvenance } : {}) };
  }
}

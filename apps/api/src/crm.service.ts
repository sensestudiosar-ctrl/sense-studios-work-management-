import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountKind, AccountState, EmployeeState, Prisma } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { evaluateLeadTransition } from "./lead-stage-policy.js";
import { recordCrmEvent } from "./crm-events.js";

export interface CrmActor { accountId: string; kind: AccountKind; organizationId: string; }
const DEFAULT_SOURCES = ["Referral", "Website", "Manual"] as const;
type Stage = "NEW" | "CONTACTED" | "MEETING_DISCUSSION" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";
type Tx = Prisma.TransactionClient;

@Injectable()
export class CrmService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService) {}
  private get db() { return this.database.prisma; }
  async actor(accountId: string): Promise<CrmActor> {
    const row = await this.db.account.findUnique({ where: { id: accountId }, include: { employee: true } });
    const organizationId = row?.employee?.organizationId ?? (await this.db.organization.findFirst({ select: { id: true } }))?.id;
    if (!row || (!organizationId && row.kind !== AccountKind.OWNER)) throw new ForbiddenException("Permission denied");
    return { accountId, kind: row.kind, organizationId: organizationId ?? "" };
  }
  private async org(actor: CrmActor, tx: Tx = this.db as unknown as Tx) {
    const row = await tx.account.findUnique({ where: { id: actor.accountId }, include: { employee: true } });
    if (!row || row.state !== AccountState.ACTIVE || row.kind !== actor.kind) throw new ForbiddenException("Permission denied");
    const orgId = row.employee?.organizationId ?? (await tx.organization.findFirst({ select: { id: true } }))?.id;
    if (!orgId || orgId !== actor.organizationId || (row.kind === AccountKind.STAFF && (!row.employee || row.employee.state !== EmployeeState.ACTIVE))) throw new ForbiddenException("Permission denied");
    return orgId;
  }
  private async lockedActor(tx: Tx, actor: CrmActor) {
    const rows = await tx.$queryRaw<Array<{ id: string; state: string; kind: string }>>`SELECT "id", "state", "kind" FROM "accounts" WHERE "id" = ${actor.accountId}::uuid FOR SHARE`;
    if (!rows[0] || rows[0].state !== AccountState.ACTIVE || rows[0].kind !== actor.kind) throw new ForbiddenException("Permission denied");
    await this.org(actor, tx);
    if (actor.kind === AccountKind.STAFF) {
      const emp = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "employees" WHERE "accountId" = ${actor.accountId}::uuid AND "organizationId" = ${actor.organizationId}::uuid AND "state" = 'ACTIVE' FOR SHARE`;
      if (!emp[0]) throw new ForbiddenException("Permission denied");
    }
  }
  private async permit(actor: CrmActor, branchId: string, key: string, tx?: Tx) {
    await this.authorization.assertPermission(actor.accountId, key, { kind: "BRANCH", organizationId: actor.organizationId, branchId }, tx);
  }
  async setup(actor: CrmActor) {
    if (!actor.organizationId && actor.kind === AccountKind.OWNER) return { branches: [], sources: [], owner: true };
    const organizationId = await this.org(actor);
    await this.db.crmSource.createMany({ data: DEFAULT_SOURCES.map((name) => ({ organizationId, name, builtIn: true })), skipDuplicates: true });
    const sourceManage = await this.canManageSources(actor);
    const branches = await this.db.branch.findMany({ where: { organizationId, active: true }, orderBy: [{ name: "asc" }, { id: "asc" }] });
    const keys = ["lead.view", "lead.create", "lead.edit", "lead.activity_create", "lead.stage_change"] as const;
    const checks = branches.flatMap((branch) => keys.map((permissionKey) => ({
      permissionKey,
      scope: { kind: "BRANCH" as const, organizationId, branchId: branch.id },
    })));
    const [sources, allowed] = await Promise.all([
      this.db.crmSource.findMany({ where: { organizationId, ...(sourceManage ? {} : { active: true }) }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, active: true, builtIn: true, updatedAt: true } }),
      this.authorization.evaluatePermissions(actor.accountId, checks),
    ]);
    const capabilities = branches.map((branch, index) => ({ branch, allowed: allowed.slice(index * keys.length, (index + 1) * keys.length) }));
    return { branches: capabilities.filter((x) => x.allowed[0] || x.allowed[1] || x.allowed[2] || x.allowed[3] || x.allowed[4]).map(({ branch, allowed }) => ({ id: branch.id, name: branch.name, capabilities: { view: allowed[0], create: allowed[1], edit: allowed[2], activityCreate: allowed[3], stageChange: allowed[4] } })), sources, sourceManage, owner: actor.kind === AccountKind.OWNER };
  }
  private async canManageSources(actor: CrmActor, tx?: Tx): Promise<boolean> {
    try { await this.authorization.assertPermission(actor.accountId, "crm_source.manage", { kind: "ORGANIZATION", organizationId: actor.organizationId }, tx); return true; }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
  }
  async createSource(actor: CrmActor, input: { name: string; reason: string }) {
    return this.db.$transaction(async (tx) => {
      await this.lockedActor(tx, actor);
      await this.authorization.assertPermission(actor.accountId, "crm_source.manage", { kind: "ORGANIZATION", organizationId: actor.organizationId }, tx);
      let source;
      try { source = await tx.crmSource.create({ data: { organizationId: actor.organizationId, name: input.name, builtIn: false } }); }
      catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("A source with this name already exists"); throw error; }
      await recordCrmEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "crm.source.created", subjectType: "crm_source", subjectId: source.id, reason: input.reason, after: { sourceId: source.id, name: source.name, active: source.active, builtIn: source.builtIn, updatedAt: source.updatedAt.toISOString() } });
      return source;
    });
  }
  async updateSource(actor: CrmActor, id: string, input: { active: boolean; expectedUpdatedAt: Date; reason: string }) {
    return this.db.$transaction(async (tx) => {
      await this.lockedActor(tx, actor);
      await this.authorization.assertPermission(actor.accountId, "crm_source.manage", { kind: "ORGANIZATION", organizationId: actor.organizationId }, tx);
      const rows = await tx.$queryRaw<Array<{ id: string; name: string; active: boolean; builtIn: boolean; updatedAt: Date }>>`SELECT "id", "name", "active", "builtIn", "updatedAt" FROM "crm_sources" WHERE "id" = ${id}::uuid AND "organizationId" = ${actor.organizationId}::uuid FOR UPDATE`;
      const current = rows[0];
      if (!current) throw new NotFoundException("Source not found");
      if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) throw new ConflictException("Source changed; reload and try again");
      const updatedAt = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
      const source = await tx.crmSource.update({ where: { id }, data: { active: input.active, updatedAt } });
      await recordCrmEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "crm.source.updated", subjectType: "crm_source", subjectId: source.id, reason: input.reason, before: { sourceId: current.id, name: current.name, active: current.active, builtIn: current.builtIn, updatedAt: current.updatedAt.toISOString() }, after: { sourceId: source.id, name: source.name, active: source.active, builtIn: source.builtIn, updatedAt: source.updatedAt.toISOString() } });
      return source;
    });
  }
  async listLeads(actor: CrmActor, input: { branchId: string; stage?: Stage; offset: number; limit: number }) {
    if (!Number.isInteger(input.offset) || input.offset < 0 || input.offset > 100_000 || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) throw new ConflictException("Invalid pagination");
    await this.org(actor); await this.permit(actor, input.branchId, "lead.view");
    const where = { organizationId: actor.organizationId, branchId: input.branchId, ...(input.stage ? { stage: input.stage } : {}) };
    const [total, rows] = await Promise.all([this.db.lead.count({ where }), this.db.lead.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: input.offset, take: input.limit, include: { source: { select: { id: true, name: true } } } })]);
    return { total, items: rows.map((row) => { const result: Partial<typeof row> = { ...row }; delete result.priorLostLeadId; return result; }) };
  }
  async listClients(actor: CrmActor, branchId: string) {
    await this.org(actor); await this.permit(actor, branchId, "lead.view");
    const rows = await this.db.client.findMany({ where: { organizationId: actor.organizationId, ...(actor.kind === AccountKind.OWNER ? {} : { leads: { some: { organizationId: actor.organizationId, branchId } } }) }, orderBy: [{ name: "asc" }, { id: "asc" }], include: { contacts: true } });
    return { items: rows };
  }
  async detail(actor: CrmActor, id: string) {
    const lead = await this.db.lead.findFirst({ where: { id, organizationId: actor.organizationId }, include: { source: { select: { id: true, name: true, active: true } }, client: { include: { contacts: true } }, stageChanges: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] }, activities: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] } } });
    if (!lead) throw new NotFoundException("Lead not found");
    await this.permit(actor, lead.branchId, "lead.view");
    let priorLostLead: { id: string; title: string } | undefined;
    if (lead.priorLostLeadId) {
      const prior = await this.db.lead.findFirst({ where: { id: lead.priorLostLeadId, organizationId: actor.organizationId, stage: "LOST" }, select: { id: true, title: true, branchId: true } });
      if (prior) { try { await this.permit(actor, prior.branchId, "lead.view"); priorLostLead = { id: prior.id, title: prior.title }; } catch (error) { if (!(error instanceof ForbiddenException)) throw error; } }
    }
    const won = lead.stageChanges.find((change) => change.toStage === "WON");
    return { lead: { ...lead, priorLostLeadId: priorLostLead ? lead.priorLostLeadId : undefined }, stageChanges: lead.stageChanges, activities: lead.activities, ...(priorLostLead ? { priorLostLead } : {}), ...(won ? { candidate: { leadId: lead.id, branchId: lead.branchId, clientId: lead.clientId, wonAt: won.occurredAt, stageChangeId: won.id } } : {}), capabilities: { edit: lead.stage !== "WON" && lead.stage !== "LOST" && await this.can(actor, lead.branchId, "lead.edit"), activityCreate: await this.can(actor, lead.branchId, "lead.activity_create"), stageChange: lead.stage !== "WON" && lead.stage !== "LOST" && await this.can(actor, lead.branchId, "lead.stage_change") } };
  }
  private async can(actor: CrmActor, branchId: string, key: string) { try { await this.permit(actor, branchId, key); return true; } catch (error) { if (error instanceof ForbiddenException) return false; throw error; } }
  async createLead(actor: CrmActor, input: { branchId: string; title: string; contactName: string; email?: string | undefined; phone?: string | undefined; sourceId: string; clientId?: string | undefined; priorLostLeadId?: string | undefined; reason: string }) {
    return this.db.$transaction(tx => this.createLeadInTransaction(actor, tx, input));
  }
  /** INT boundary: identical CRM creation guards and evidence in the caller's transaction. */
  async websiteContext(actor: CrmActor, tx: Tx, branchId: string, sourceId: string) {
    await this.lockedActor(tx, actor); await this.permit(actor, branchId, "lead.create", tx);
    await tx.$queryRaw`SELECT id FROM branches WHERE id=${branchId}::uuid FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM crm_sources WHERE id=${sourceId}::uuid FOR SHARE`;
    const branch=await tx.branch.findFirst({where:{id:branchId,organizationId:actor.organizationId,active:true}});
    const source=await tx.crmSource.findFirst({where:{id:sourceId,organizationId:actor.organizationId,active:true,builtIn:true,name:"Website"}});
    if(!branch||!source)throw new ForbiddenException("Current Website routing required");
    return {branch,source};
  }
  async createLeadInTransaction(actor: CrmActor, tx: Tx, input: { branchId: string; title: string; contactName: string; email?: string | undefined; phone?: string | undefined; sourceId: string; clientId?: string | undefined; priorLostLeadId?: string | undefined; reason: string }) {
      await this.lockedActor(tx, actor); await this.permit(actor, input.branchId, "lead.create", tx);
      const branchRows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "branches" WHERE "id" = ${input.branchId}::uuid AND "organizationId" = ${actor.organizationId}::uuid AND "active" = true FOR SHARE`;
      if (!branchRows[0]) throw new NotFoundException("Branch not found");
      const branch = await tx.branch.findUniqueOrThrow({ where: { id: input.branchId } });
      const sourceRows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "crm_sources" WHERE "id" = ${input.sourceId}::uuid AND "organizationId" = ${actor.organizationId}::uuid AND "active" = true FOR SHARE`;
      if (!sourceRows[0]) throw new NotFoundException("Source not found");
      const source = await tx.crmSource.findUniqueOrThrow({ where: { id: input.sourceId } });
      if (input.clientId) { if (actor.kind === AccountKind.STAFF) await this.permit(actor, branch.id, "lead.view", tx); const client = await tx.client.findFirst({ where: { id: input.clientId, organizationId: actor.organizationId }, select: { id: true } }); const visible = actor.kind === AccountKind.OWNER ? Boolean(client) : await tx.lead.count({ where: { organizationId: actor.organizationId, branchId: branch.id, clientId: input.clientId } }) > 0; if (!visible) throw new NotFoundException("Client not found"); }
      if (input.priorLostLeadId) {
        const prior = await tx.lead.findFirst({ where: { id: input.priorLostLeadId, organizationId: actor.organizationId, stage: "LOST" } });
        if (!prior) throw new NotFoundException("Prior lead not found"); await this.permit(actor, prior.branchId, "lead.view", tx);
      }
      const row = await tx.lead.create({ data: { organizationId: actor.organizationId, branchId: branch.id, title: input.title, contactName: input.contactName, ...(input.email ? { email: input.email } : {}), ...(input.phone ? { phone: input.phone } : {}), sourceId: source.id, ...(input.clientId ? { clientId: input.clientId } : {}), ...(input.priorLostLeadId ? { priorLostLeadId: input.priorLostLeadId } : {}), createdById: actor.accountId } });
      const history = await tx.leadStageChange.create({ data: { organizationId: actor.organizationId, leadId: row.id, toStage: "NEW", direction: "CREATED", skippedStages: [], actorId: actor.accountId, leadVersion: 1 } });
      await recordCrmEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "crm.lead.created", subjectType: "lead", subjectId: row.id, reason: input.reason, after: { leadId: row.id, branchId: row.branchId, stage: row.stage, stageChangeId: history.id } });
      return row;
  }
  async updateLead(actor: CrmActor, id: string, input: { expectedVersion: number; title: string; contactName: string; email?: string | null | undefined; phone?: string | null | undefined; reason: string }) {
    return this.db.$transaction(async (tx) => {
      await this.lockedActor(tx, actor); const row = await this.lockLead(tx, actor, id); await this.permit(actor, row.branchId, "lead.edit", tx);
      if (row.stage === "WON" || row.stage === "LOST") throw new ConflictException("Terminal leads cannot be edited");
      if (row.version !== input.expectedVersion) throw new ConflictException("Lead changed; reload and try again");
      const updated = await tx.lead.update({ where: { id }, data: { title: input.title, contactName: input.contactName, ...(input.email !== undefined ? { email: input.email } : {}), ...(input.phone !== undefined ? { phone: input.phone } : {}), version: { increment: 1 } } });
      await recordCrmEvent(tx, { organizationId: row.organizationId, actorId: actor.accountId, eventName: "crm.lead.updated", subjectType: "lead", subjectId: row.id, reason: input.reason, before: { version: row.version, title: row.title, contactName: row.contactName, email: row.email, phone: row.phone }, after: { version: updated.version, title: updated.title, contactName: updated.contactName, email: updated.email, phone: updated.phone } }); return updated;
    });
  }
  async changeStage(actor: CrmActor, id: string, input: { expectedVersion: number; toStage: Stage; reason?: string | undefined }) {
    return this.db.$transaction(async (tx) => {
      await this.lockedActor(tx, actor); const row = await this.lockLead(tx, actor, id); await this.permit(actor, row.branchId, "lead.stage_change", tx);
      if (row.version !== input.expectedVersion) throw new ConflictException("Lead changed; reload and try again");
      let transition; try { transition = evaluateLeadTransition(row.stage, input.toStage, input.reason); } catch (error) { throw new ConflictException(error instanceof Error ? error.message : "Invalid transition"); }
      const lostReason = input.toStage === "LOST" ? input.reason!.trim() : undefined;
      const updated = await tx.lead.update({ where: { id }, data: { stage: input.toStage, version: { increment: 1 }, ...(input.toStage === "WON" || input.toStage === "LOST" ? { outcomeAt: new Date() } : {}), ...(lostReason ? { lostReason } : {}) } });
      const change = await tx.leadStageChange.create({ data: { organizationId: row.organizationId, leadId: id, fromStage: row.stage, toStage: input.toStage, direction: transition.direction, skippedStages: transition.skippedStages, ...(input.reason !== undefined ? { reason: input.reason } : {}), actorId: actor.accountId, leadVersion: updated.version } });
      await recordCrmEvent(tx, { organizationId: row.organizationId, actorId: actor.accountId, eventName: "crm.lead.stage_changed", subjectType: "lead", subjectId: id, reason: input.reason ?? "Adjacent forward stage transition", before: { stage: row.stage, version: row.version }, after: { stage: updated.stage, version: updated.version, stageChangeId: change.id, skippedStages: change.skippedStages } }); return { lead: updated, stageChange: change };
    });
  }
  async addActivity(actor: CrmActor, id: string, input: { kind: string; note: string }) {
    return this.db.$transaction(async (tx) => {
      await this.lockedActor(tx, actor); const row = await this.lockLead(tx, actor, id); await this.permit(actor, row.branchId, "lead.activity_create", tx);
      const activity = await tx.leadActivity.create({ data: { organizationId: row.organizationId, leadId: row.id, kind: input.kind, note: input.note, actorId: actor.accountId } });
      await recordCrmEvent(tx, { organizationId: row.organizationId, actorId: actor.accountId, eventName: "crm.lead.activity_recorded", subjectType: "lead_activity", subjectId: activity.id, reason: "Lead interaction recorded", after: { leadId: row.id, activityId: activity.id, kind: activity.kind } }); return activity;
    });
  }
  async createClient(actor: CrmActor, input: { name: string; reason: string; contacts: Array<{ name: string; email?: string | undefined; phone?: string | undefined }> }) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    return this.db.$transaction(async (tx) => { await this.lockedActor(tx, actor); const row = await tx.client.create({ data: { organizationId: actor.organizationId, name: input.name } }); for (const contact of input.contacts) await tx.clientContact.create({ data: { clientId: row.id, organizationId: actor.organizationId, name: contact.name, ...(contact.email ? { email: contact.email } : {}), ...(contact.phone ? { phone: contact.phone } : {}) } }); const contacts = await tx.clientContact.findMany({ where: { clientId: row.id, organizationId: actor.organizationId } }); await recordCrmEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "crm.client.created", subjectType: "client", subjectId: row.id, reason: input.reason, after: { clientId: row.id, version: row.version, name: row.name, contacts: contacts.map((x) => ({ id: x.id, name: x.name, email: x.email, phone: x.phone })) } }); return { ...row, contacts }; });
  }
  async updateClient(actor: CrmActor, id: string, input: { name: string; expectedVersion: number; reason: string; contacts: Array<{ id?: string | undefined; name: string; email?: string | null | undefined; phone?: string | null | undefined }> }) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    return this.db.$transaction(async (tx) => { await this.lockedActor(tx, actor); const rows = await tx.$queryRaw<Array<{ id: string; organizationId: string; version: number; name: string }>>`SELECT "id", "organizationId", "version", "name" FROM "clients" WHERE "id" = ${id}::uuid AND "organizationId" = ${actor.organizationId}::uuid FOR UPDATE`; const row = rows[0]; if (!row) throw new NotFoundException("Client not found"); if (row.version !== input.expectedVersion) throw new ConflictException("Client changed; reload and try again");
      const current = await tx.clientContact.findMany({ where: { clientId: id, organizationId: actor.organizationId } }); const known = new Set(current.map((x) => x.id)); const requestedIds = input.contacts.flatMap((x) => x.id ? [x.id] : []); if (new Set(requestedIds).size !== requestedIds.length || requestedIds.some((contactId) => !known.has(contactId))) throw new ConflictException("Contact does not belong to this client");
      for (const contact of input.contacts) { if (contact.id) await tx.clientContact.update({ where: { id: contact.id }, data: { name: contact.name, ...(contact.email !== undefined ? { email: contact.email } : {}), ...(contact.phone !== undefined ? { phone: contact.phone } : {}) } }); else await tx.clientContact.create({ data: { clientId: id, organizationId: actor.organizationId, name: contact.name, ...(contact.email ? { email: contact.email } : {}), ...(contact.phone ? { phone: contact.phone } : {}) } }); }
      const updated = await tx.client.update({ where: { id }, data: { name: input.name, version: { increment: 1 } }, include: { contacts: true } }); const touched = new Set([...requestedIds, ...updated.contacts.filter((x) => !known.has(x.id)).map((x) => x.id)]); await recordCrmEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "crm.client.updated", subjectType: "client", subjectId: id, reason: input.reason, before: { version: row.version, name: row.name, contacts: current.filter((x) => touched.has(x.id)).map((x) => ({ id: x.id, name: x.name, email: x.email, phone: x.phone })) }, after: { version: updated.version, name: updated.name, contacts: updated.contacts.filter((x) => touched.has(x.id)).map((x) => ({ id: x.id, name: x.name, email: x.email, phone: x.phone })) } }); return updated; });
  }
  private async lockLead(tx: Tx, actor: CrmActor, id: string) { const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "leads" WHERE "id" = ${id}::uuid AND "organizationId" = ${actor.organizationId}::uuid FOR UPDATE`; if (!rows[0]) throw new NotFoundException("Lead not found"); const row = await tx.lead.findUnique({ where: { id } }); if (!row) throw new NotFoundException("Lead not found"); return row; }
}

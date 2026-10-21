import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountKind, AccountState, ApprovalRequestState, Prisma, SkillLevel } from "./generated/prisma/client.js";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService, type ApprovalHandler } from "./approval.service.js";
import type { ProjectActor } from "./project.service.js";
import { recordProjectEvent } from "./project-events.js";

type Tx = Prisma.TransactionClient;
type SessionActor = ProjectActor & { sessionId?: string };
type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
const levels: Level[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const reasonValid = (v: string) => typeof v === "string" && v.trim().length >= 3 && v.length <= 1000;

@Injectable()
export class SkillsService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService, private readonly approvals: ApprovalService) {
    approvals.registerHandler(this.approvalHandler());
  }
  private get db() { return this.database.prisma; }
  private async transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    try { return await this.db.$transaction(fn, { timeout: 30000 }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) throw new ConflictException("Skill data changed. Refresh and retry"); throw error; }
  }
  private async active(tx: Tx, actor: SessionActor) {
    if (!actor.sessionId) throw new ForbiddenException("Current session required");
    await tx.$queryRaw`SELECT id FROM accounts WHERE id=${actor.accountId}::uuid FOR SHARE`;
    const account = await tx.account.findUnique({ where: { id: actor.accountId }, include: { employee: true } });
    const now = new Date(), session = await tx.session.findUnique({ where: { id: actor.sessionId } });
    if (!account || account.state !== AccountState.ACTIVE || account.kind !== actor.kind || (account.kind !== AccountKind.OWNER && account.kind !== AccountKind.STAFF) || !session || session.accountId !== actor.accountId || session.revokedAt || session.expiresAt <= now || session.lastUsedAt.getTime() + 1800000 <= now.getTime()) throw new ForbiddenException("Current active session required");
    const org = await tx.organization.findFirst({ select: { id: true } });
    if (!org || org.id !== actor.organizationId || actor.kind === AccountKind.STAFF && (!account.employee || account.employee.state !== "ACTIVE" || account.employee.organizationId !== org.id)) throw new ForbiddenException("Active employee required");
    return account.employee;
  }
  private async employee(tx: Tx, actor: SessionActor, id: string) {
    const target = await tx.employee.findFirst({ where: { id, organizationId: actor.organizationId, state: "ACTIVE" } });
    if (!target) throw new NotFoundException("Employee unavailable"); return target;
  }
  private async manager(tx: Tx, actor: SessionActor, targetId: string, permission: "skills.view" | "skills.manage") {
    if (actor.kind === AccountKind.OWNER) return true;
    const self = await this.active(tx, actor), target = await this.employee(tx, actor, targetId);
    if (!self || self.id === target.id || self.homeBranchId !== target.homeBranchId || self.homeTeamId !== target.homeTeamId) return false;
    try { await this.authorization.assertPermission(actor.accountId, permission, { kind: "TEAM", organizationId: actor.organizationId, branchId: target.homeBranchId, teamId: target.homeTeamId }, tx); }
    catch (e) { if (e instanceof ForbiddenException) return false; throw e; }
    const employees = await tx.employee.findMany({ where: { organizationId: actor.organizationId, homeBranchId: target.homeBranchId, homeTeamId: target.homeTeamId, state: "ACTIVE" }, select: { id: true, reportsToId: true } });
    const parents = new Map(employees.map(x => [x.id, x.reportsToId])); let parent = target.reportsToId; const seen = new Set<string>();
    while (parent && !seen.has(parent)) { if (parent === self.id) return true; seen.add(parent); parent = parents.get(parent) ?? null; }
    return false;
  }
  private async canView(tx: Tx, actor: SessionActor, employeeId: string) {
    const self = await this.active(tx, actor);
    if (actor.kind === AccountKind.OWNER || self?.id === employeeId) return true;
    return this.manager(tx, actor, employeeId, "skills.view");
  }
  async setup(actor: SessionActor) {
    return this.transaction(async tx => {
      const self = await this.active(tx, actor), isOwner = actor.kind === AccountKind.OWNER;
      const visibleEmployees = [];
      for (const e of await tx.employee.findMany({ where: { organizationId: actor.organizationId, state: "ACTIVE" }, orderBy: [{ employeeCode: "asc" }, { id: "asc" }], select: { id: true, employeeCode: true, account: { select: { normalizedEmail: true } }, homeBranchId: true, homeTeamId: true } })) {
        if (isOwner || self?.id === e.id || await this.manager(tx, actor, e.id, "skills.view")) visibleEmployees.push({ id: e.id, employeeCode: e.employeeCode, label: e.employeeCode ?? e.account.normalizedEmail, homeBranchId: e.homeBranchId, homeTeamId: e.homeTeamId });
      }
      const owners = await tx.account.findMany({ where: { kind: AccountKind.OWNER, state: AccountState.ACTIVE }, select: { id: true, normalizedEmail: true } });
      const eligibleApprovers = [];
      for (const employee of visibleEmployees) {
        const approvers = [];
        for (const owner of owners) if (owner.id !== actor.accountId) approvers.push({ accountId: owner.id, label: owner.normalizedEmail });
        for (const candidate of await tx.employee.findMany({ where: { organizationId: actor.organizationId, homeBranchId: employee.homeBranchId, homeTeamId: employee.homeTeamId, state: "ACTIVE" }, select: { id: true, accountId: true, employeeCode: true, account: { select: { normalizedEmail: true } } } })) {
          if (candidate.accountId !== actor.accountId && await this.managerWithoutSession(tx, candidate.accountId, AccountKind.STAFF, actor.organizationId, employee.id, "skills.manage")) approvers.push({ accountId: candidate.accountId, label: candidate.employeeCode ?? candidate.account.normalizedEmail });
        }
        eligibleApprovers.push({ employeeId: employee.id, approvers });
      }
      return { skills: await tx.skillCatalogue.findMany({ where: { organizationId: actor.organizationId }, orderBy: [{ normalizedName: "asc" }, { id: "asc" }] }), employees: visibleEmployees, eligibleApprovers };
    });
  }
  async profile(actor: SessionActor, employeeId: string) {
    return this.transaction(async tx => {
      await this.active(tx, actor); if (!await this.canView(tx, actor, employeeId)) throw new ForbiddenException("Employee skill access denied");
      await this.employee(tx, actor, employeeId);
      const [ratings, changes, requestRows] = await Promise.all([
        tx.skillRating.findMany({ where: { organizationId: actor.organizationId, employeeId }, orderBy: [{ skillId: "asc" }] }),
        tx.skillRatingChange.findMany({ where: { organizationId: actor.organizationId, ratingId: { in: (await tx.skillRating.findMany({ where: { organizationId: actor.organizationId, employeeId }, select: { id: true } })).map(x => x.id) } }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] }),
        tx.skillChangeRequest.findMany({ where: { organizationId: actor.organizationId, employeeId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] })
      ]);
      const requests = [];
      for (const row of requestRows) {
        const approval = await tx.approvalRequest.findUnique({ where: { id: row.approvalRequestId } });
        const approver = approval ? await tx.account.findUnique({ where: { id: approval.approverId }, include: { employee: true } }) : null;
        const decision = approval ? await tx.approvalDecision.findUnique({ where: { requestId: approval.id } }) : null;
        const label = approver?.employee?.employeeCode ?? approver?.normalizedEmail ?? "Eligible approver";
        const canDecide = !!approval && approval.state === ApprovalRequestState.PENDING && approval.approverId === actor.accountId && await this.currentEligibleWithoutSession(tx, actor.accountId, actor.organizationId, approval);
        requests.push({ ...row, approvalState: approval?.state ?? null, approverAccountId: approval?.approverId ?? null, approverLabel: label, decisionEvidence: decision ? { outcome: decision.outcome, reason: decision.reason, deciderId: decision.deciderId, decidedAt: decision.decidedAt } : null, canDecide });
      }
      const canManage = actor.kind === AccountKind.OWNER || await this.manager(tx, actor, employeeId, "skills.manage");
      return { ratings, changes, requests, capabilities: { currentAccountId: actor.accountId, canRequest: actor.kind !== AccountKind.OWNER && ((await this.active(tx, actor))?.id === employeeId || canManage), canManage, canDirectRate: actor.kind === AccountKind.OWNER } };
    });
  }

  /** Read-only, reference-bearing skill evidence for the assistance workspace. */
  async assistanceEvidence(actor: SessionActor, employeeId: string) {
    const profile = await this.profile(actor, employeeId);
    return {
      ratings: profile.ratings.map((row) => ({ id: row.id, skillId: row.skillId, level: row.level, version: row.version })),
      changes: profile.changes.map((row) => ({ id: row.id, ratingId: row.ratingId, level: row.toLevel, occurredAt: row.occurredAt }))
    };
  }

  /** Factual, date-bounded report evidence through the same live profile authorization. */
  async reportEvidence(actor: SessionActor, employeeId: string, from: string, to: string) {
    const profile = await this.profile(actor, employeeId);
    return {
      ratings: profile.ratings.map((row) => ({
        id: row.id,
        skillId: row.skillId,
        level: row.level,
        version: row.version,
      })),
      changes: profile.changes
        .filter((row) => {
          const date = row.occurredAt.toISOString().slice(0, 10);
          return date >= from && date <= to;
        })
        .map((row) => ({
          id: row.id,
          ratingId: row.ratingId,
          fromLevel: row.fromLevel,
          toLevel: row.toLevel,
          occurredAt: row.occurredAt,
        })),
    };
  }
  private async command<T>(actor: SessionActor, commandId: string, op: string, payload: unknown, fn: (tx: Tx) => Promise<T>, authorize: (tx: Tx) => Promise<void>): Promise<T> {
    return this.transaction(async tx => {
      await this.active(tx, actor); await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":skills:" + actor.accountId + ":" + commandId},0))`; await this.active(tx, actor); await authorize(tx);
      const prior = await tx.skillReceipt.findUnique({ where: { actorId_commandId: { actorId: actor.accountId, commandId } } }), payloadHash = hash({ op, payload });
      if (prior) { if (prior.payloadHash !== payloadHash) throw new ConflictException("Command ID was used with different values"); await this.active(tx, actor); return prior.result as T; }
      const result = await fn(tx); await this.active(tx, actor);
      await tx.skillReceipt.create({ data: { organizationId: actor.organizationId, actorId: actor.accountId, commandId, payloadHash, result: json(result) } }); return result;
    });
  }
  async createCatalogue(actor: SessionActor, input: { commandId: string; name: string; reason: string }) {
    if (!reasonValid(input.reason)) throw new BadRequestException("Reason required");
    return this.command(actor, input.commandId, "catalogue", input, async tx => {
      await this.active(tx, actor); if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner catalogue access required");
      await tx.$queryRaw`SELECT id FROM accounts WHERE id=${actor.accountId}::uuid FOR SHARE`;
      const name = input.name.trim(), normalizedName = name.toLocaleLowerCase("en-US"); if (name.length < 1 || name.length > 120) throw new BadRequestException("Invalid skill name");
      if (await tx.skillCatalogue.findFirst({ where: { organizationId: actor.organizationId, normalizedName } })) throw new ConflictException("Skill already exists");
      const id = randomUUID(), eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "skill.catalogue_created", subjectType: "skill_catalogue", subjectId: id, reason: input.reason, after: { name, normalizedName } });
      const row = await tx.skillCatalogue.create({ data: { id, organizationId: actor.organizationId, name, normalizedName, createdById: actor.accountId, eventId } }); return row;
    }, async tx => { await this.active(tx, actor); if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner catalogue access required"); });
  }
  private async requestChange(tx: Tx, actor: SessionActor, input: { employeeId: string; skillId?: string | undefined; proposedSkillName?: string | undefined; requestedLevel: Level; expectedRatingVersion: number; approverAccountId: string; reason: string; trainingSourceId?: string | undefined }) {
    await this.active(tx, actor); const target = await this.employee(tx, actor, input.employeeId);
    const self = await this.active(tx, actor);
    if (self?.id !== target.id && !await this.manager(tx, actor, target.id, "skills.manage")) throw new ForbiddenException("Skill request access denied");
    if (input.trainingSourceId) {
      const training = await tx.trainingAssignment.findFirst({ where: { id: input.trainingSourceId, organizationId: actor.organizationId, employeeId: target.id, state: "COMPLETED" } });
      if (!training) throw new BadRequestException("Own completed training source required");
    }
    if (!reasonValid(input.reason) || !levels.includes(input.requestedLevel) || !Number.isInteger(input.expectedRatingVersion) || input.expectedRatingVersion < 0) throw new BadRequestException("Invalid skill request");
    if (!!input.skillId === !!input.proposedSkillName) throw new BadRequestException("Choose a catalogue skill or proposed name");
    const skillId = input.skillId;
    let proposedSkillName: string | undefined;
    if (skillId && !await tx.skillCatalogue.findFirst({ where: { id: skillId, organizationId: actor.organizationId } })) throw new NotFoundException("Skill unavailable");
    if (input.proposedSkillName) {
      proposedSkillName = input.proposedSkillName.trim(); if (proposedSkillName.length < 1 || proposedSkillName.length > 120) throw new BadRequestException("Invalid skill name");
      const normalized = proposedSkillName.toLocaleLowerCase("en-US");
      if (await tx.skillCatalogue.findFirst({ where: { organizationId: actor.organizationId, normalizedName: normalized } })) throw new ConflictException("Skill already exists; select the catalogue skill");
      const matches = await tx.skillCatalogue.findMany({ where: { organizationId: actor.organizationId, normalizedName: { contains: normalized } }, select: { id: true } });
      if (matches.length) throw new ConflictException("Proposed skill name is ambiguous");
    }
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":skill-rating:" + target.id + ":" + (skillId ?? proposedSkillName!.toLocaleLowerCase("en-US"))},0))`;
    const rating = skillId ? await tx.skillRating.findFirst({ where: { organizationId: actor.organizationId, employeeId: target.id, skillId } }) : null;
    if ((rating?.version ?? 0) !== input.expectedRatingVersion) throw new ConflictException("Current skill rating version changed");
    if (skillId && await this.hasPending(tx, actor.organizationId, target.id, skillId, null)) throw new ConflictException("A pending request already exists");
    if (proposedSkillName && await this.hasPending(tx, actor.organizationId, target.id, null, proposedSkillName)) throw new ConflictException("A pending request already exists");
    const approver = await tx.account.findFirst({ where: { id: input.approverAccountId, state: AccountState.ACTIVE, OR: [{ kind: AccountKind.OWNER }, { kind: AccountKind.STAFF, employee: { state: "ACTIVE", organizationId: actor.organizationId } }] }, include: { employee: true } });
    if (!approver || approver.id === actor.accountId || approver.kind !== AccountKind.OWNER && (!approver.employee || !await this.managerWithoutSession(tx, approver.id, approver.kind, actor.organizationId, target.id, "skills.manage"))) throw new ForbiddenException("Selected approver is not currently eligible");
    const id = randomUUID();
    const approval = await this.approvals.createRequest(tx, { accountId: actor.accountId, organizationId: actor.organizationId }, "skill.change", { sourceType: "skill_change_request", sourceId: id, reason: input.reason, context: { employeeId: target.id, skillId: skillId ?? null, proposedSkillName: proposedSkillName ?? null, requestedLevel: input.requestedLevel, expectedRatingVersion: input.expectedRatingVersion, approverAccountId: approver.id }, evidence: { trainingSourceId: input.trainingSourceId ?? null } });
    // Skill policy explicitly binds the selected approver. ApprovalService's handler resolves the immutable assigned account.
    if (approval.approverId !== approver.id) throw new ForbiddenException("Selected approver is not eligible under skill policy");
    const request = await tx.skillChangeRequest.create({ data: { id, organizationId: actor.organizationId, employeeId: target.id, skillId: skillId ?? null, proposedSkillName: proposedSkillName ?? null, requestedLevel: input.requestedLevel as SkillLevel, expectedRatingVersion: input.expectedRatingVersion, requestedById: actor.accountId, approvalRequestId: approval.id, trainingSourceId: input.trainingSourceId ?? null, reason: input.reason } });
    await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "skill.change_requested", subjectType: "skill_change_request", subjectId: request.id, reason: request.reason, after: { employeeId: target.id, requestedLevel: input.requestedLevel, approvalRequestId: approval.id, expectedRatingVersion: input.expectedRatingVersion } });
    return request;
  }
  private async hasPending(tx: Tx, organizationId: string, employeeId: string, skillId: string | null, proposedSkillName: string | null) {
    const rows = await tx.skillChangeRequest.findMany({ where: { organizationId, employeeId, ...(skillId ? { skillId } : { proposedSkillName: { equals: proposedSkillName, mode: "insensitive" } }) } });
    for (const row of rows) { const request = await tx.approvalRequest.findFirst({ where: { id: row.approvalRequestId, state: ApprovalRequestState.PENDING } }); if (request) return true; }
    return false;
  }
  async request(actor: SessionActor, input: { commandId: string; employeeId: string; skillId?: string | undefined; proposedSkillName?: string | undefined; requestedLevel: Level; expectedRatingVersion: number; approverAccountId: string; reason: string; trainingSourceId?: string | undefined }) {
    if (!reasonValid(input.reason)) throw new BadRequestException("Reason required");
    return this.command(actor, input.commandId, "request", input, tx => this.requestChange(tx, actor, input), async tx => {
      await this.active(tx, actor); const target = await this.employee(tx, actor, input.employeeId), self = await this.active(tx, actor);
      if (self?.id !== target.id && !await this.manager(tx, actor, target.id, "skills.manage")) throw new ForbiddenException("Skill request access denied");
    });
  }
  async directRate(actor: SessionActor, input: { commandId: string; employeeId: string; skillId: string; level: Level; expectedRatingVersion: number; reason: string }) {
    if (!reasonValid(input.reason)) throw new BadRequestException("Reason required");
    return this.command(actor, input.commandId, "direct-rate", input, async tx => {
      await this.active(tx, actor); if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner rating control required");
      const employee = await this.employee(tx, actor, input.employeeId), skill = await tx.skillCatalogue.findFirst({ where: { id: input.skillId, organizationId: actor.organizationId } }); if (!skill) throw new NotFoundException("Skill unavailable");
      if (!levels.includes(input.level) || !Number.isInteger(input.expectedRatingVersion) || input.expectedRatingVersion < 0) throw new BadRequestException("Invalid rating");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":skill-rating:" + employee.id + ":" + skill.id},0))`;
      const prior = await tx.skillRating.findFirst({ where: { organizationId: actor.organizationId, employeeId: employee.id, skillId: skill.id } }); if ((prior?.version ?? 0) !== input.expectedRatingVersion) throw new ConflictException("Current skill rating version changed");
      return this.applyRating(tx, actor, employee.id, skill.id, input.level, input.reason, prior, null, null);
    }, async tx => { await this.active(tx, actor); if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner rating control required"); await this.employee(tx, actor, input.employeeId); });
  }
  private async applyRating(tx: Tx, actor: SessionActor, employeeId: string, skillId: string, level: Level, reason: string, prior: { id: string; version: number; level: SkillLevel; currentChangeId: string } | null, approvalRequestId: string | null, trainingSourceId: string | null) {
    const version = (prior?.version ?? 0) + 1, ratingId = prior?.id ?? randomUUID(), changeId = randomUUID();
    const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "skill.rating_changed", subjectType: "skill_rating", subjectId: ratingId, reason, ...(prior ? { before: { employeeId, skillId, version: prior.version } } : {}), after: { employeeId, skillId, version, toLevel: level, fromLevel: prior?.level ?? null, approvalRequestId, trainingSourceId } });
    const rating = prior ? await tx.skillRating.update({ where: { id: ratingId }, data: { level: level as SkillLevel, version, currentChangeId: changeId } }) : await tx.skillRating.create({ data: { id: ratingId, organizationId: actor.organizationId, employeeId, skillId, level: level as SkillLevel, version, currentChangeId: changeId } });
    const change = await tx.skillRatingChange.create({ data: { id: changeId, organizationId: actor.organizationId, ratingId, version, fromLevel: prior?.level ?? null, toLevel: level as SkillLevel, actorId: actor.accountId, reason, approvalRequestId, trainingSourceId, eventId } });
    return { rating, change };
  }
  private approvalHandler(): ApprovalHandler {
    return {
      typeKey: "skill.change", canSelfApprove: false,
      resolveApprover: async (tx, actor, input) => {
        const context = input.context as { employeeId: string; approverAccountId: string };
        const employee = await tx.employee.findFirst({ where: { id: context.employeeId, organizationId: actor.organizationId, state: "ACTIVE" } });
        if (!employee) throw new ForbiddenException("Skill target unavailable");
        if (context.approverAccountId === employee.accountId || context.approverAccountId === actor.accountId) throw new ForbiddenException("Self approval is not allowed");
        const approver = await tx.account.findFirst({ where: { id: context.approverAccountId, state: AccountState.ACTIVE, OR: [{ kind: AccountKind.OWNER }, { kind: AccountKind.STAFF, employee: { organizationId: actor.organizationId, state: "ACTIVE" } }] }, include: { employee: true } });
        // A missing or scope-revoked approver is a workflow state, not a denial of the requester's authority.
        if (!approver) throw new ConflictException({ message: "The selected approver is no longer an active account", code: "SKILL_APPROVER_UNAVAILABLE" });
        if (approver.kind !== AccountKind.OWNER && !await this.managerWithoutSession(tx, approver.id, approver.kind, actor.organizationId, employee.id)) throw new ConflictException({ message: "The selected approver no longer holds current skill approval scope", code: "SKILL_APPROVER_SCOPE_REVOKED" });
        return { accountId: approver.id, level: approver.kind === AccountKind.OWNER ? "OWNER" : "MANAGER" };
      },
      canView: async (tx, actor, request) => { const r = await tx.skillChangeRequest.findFirst({ where: { approvalRequestId: request.id } }), account = await tx.account.findUnique({ where: { id: actor.accountId }, select: { kind: true } }); return !!r && !!account && (actor.accountId === request.requesterId || actor.accountId === request.approverId || account.kind === AccountKind.OWNER || await this.managerWithoutSession(tx, actor.accountId, account.kind, actor.organizationId, r.employeeId, "skills.view")); },
      canDecide: async (tx, actor, request, { delegated }) => !delegated && actor.accountId === request.approverId && await this.currentEligibleWithoutSession(tx, actor.accountId, actor.organizationId, request),
      projectCard: async (tx, request) => { const row = await tx.skillChangeRequest.findFirst({ where: { approvalRequestId: request.id } }); return { title: "Skill change request", summary: row ? `${row.requestedLevel} for employee ${row.employeeId}` : "Skill change", subjectLabel: "Employee skill", requesterLabel: "Employee", levelLabel: request.approvalLevel }; },
      onDecision: async (tx, request, decision, deciderId) => {
        const row = await tx.skillChangeRequest.findFirst({ where: { approvalRequestId: request.id } }); if (!row) throw new NotFoundException("Skill request unavailable");
        const kind = (await tx.account.findUniqueOrThrow({ where: { id: deciderId }, select: { kind: true } })).kind;
        if (!await this.managerWithoutSession(tx, deciderId, kind, row.organizationId, row.employeeId, "skills.manage")) throw new ConflictException({ message: "Current skill approver scope was revoked during this decision", code: "SKILL_APPROVER_SCOPE_CHANGED" });
        const actor = { accountId: deciderId, kind, organizationId: row.organizationId } as SessionActor;
        if (decision.outcome !== "APPROVED") return;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${row.organizationId + ":skill-rating:" + row.employeeId + ":" + (row.skillId ?? row.proposedSkillName!.toLocaleLowerCase("en-US"))},0))`;
        const rating = row.skillId ? await tx.skillRating.findFirst({ where: { organizationId: row.organizationId, employeeId: row.employeeId, skillId: row.skillId } }) : null;
        if ((rating?.version ?? 0) !== row.expectedRatingVersion) throw new ConflictException("Skill request is stale; current rating has changed");
        let skillId = row.skillId;
        if (!skillId && row.proposedSkillName) {
          const normalizedName = row.proposedSkillName.trim().toLocaleLowerCase("en-US");
          let skill = await tx.skillCatalogue.findFirst({ where: { organizationId: row.organizationId, normalizedName } });
          if (!skill) { const id = randomUUID(); const eventId = await recordProjectEvent(tx, { organizationId: row.organizationId, actorId: deciderId, eventName: "skill.catalogue_created", subjectType: "skill_catalogue", subjectId: id, reason: decision.reason, after: { name: row.proposedSkillName, normalizedName } }); skill = await tx.skillCatalogue.create({ data: { id, organizationId: row.organizationId, name: row.proposedSkillName, normalizedName, createdById: deciderId, eventId } }); }
          skillId = skill.id;
        }
        if (!skillId) throw new ConflictException("Requested skill is unavailable");
        await this.applyRating(tx, actor, row.employeeId, skillId, row.requestedLevel, decision.reason, rating, request.id, row.trainingSourceId);
      }
    };
  }
  private async managerWithoutSession(tx: Tx, accountId: string, kind: AccountKind, organizationId: string, targetId: string, permission: "skills.view" | "skills.manage" = "skills.manage") {
    const target = await tx.employee.findFirst({ where: { id: targetId, organizationId, state: "ACTIVE" } });
    if (!target) return false;
    if (kind === AccountKind.OWNER) return !!await tx.account.findFirst({ where: { id: accountId, kind, state: AccountState.ACTIVE } });
    const self = await tx.employee.findFirst({ where: { accountId, organizationId, state: "ACTIVE" } });
    if (!self || !target || self.id === target.id || self.homeBranchId !== target.homeBranchId || self.homeTeamId !== target.homeTeamId) return false;
    try { await this.authorization.assertPermission(accountId, permission, { kind: "TEAM", organizationId, branchId: target.homeBranchId, teamId: target.homeTeamId }, tx); }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
    const employees = await tx.employee.findMany({ where: { organizationId, homeBranchId: target.homeBranchId, homeTeamId: target.homeTeamId, state: "ACTIVE" }, select: { id: true, reportsToId: true } }), parents = new Map(employees.map(e => [e.id, e.reportsToId]));
    let parent = target.reportsToId; const seen = new Set<string>(); while (parent && !seen.has(parent)) { if (parent === self.id) return true; seen.add(parent); parent = parents.get(parent) ?? null; } return false;
  }
  private async currentEligibleWithoutSession(tx: Tx, accountId: string, organizationId: string, request: { id: string }) {
    const row = await tx.skillChangeRequest.findFirst({ where: { approvalRequestId: request.id } });
    const account = await tx.account.findUnique({ where: { id: accountId }, select: { kind: true } });
    return !!row && !!account && await this.managerWithoutSession(tx, accountId, account.kind, organizationId, row.employeeId, "skills.manage");
  }
  async decide(actor: SessionActor, requestId: string, input: { commandId: string; outcome: "APPROVED" | "REJECTED"; reason: string }) {
    if (!reasonValid(input.reason)) throw new BadRequestException("Reason required");
    return this.command(actor, input.commandId, "decision", { requestId, input }, async tx => {
      await this.active(tx, actor); const row = await tx.skillChangeRequest.findFirst({ where: { id: requestId, organizationId: actor.organizationId } }); if (!row) throw new NotFoundException("Skill request unavailable");
      if (actor.accountId === row.requestedById) throw new ForbiddenException("Self approval is not allowed");
      await this.approvals.decide(tx, { accountId: actor.accountId, organizationId: actor.organizationId }, row.approvalRequestId, { outcome: input.outcome, reason: input.reason });
      return { id: row.id, state: input.outcome };
    }, async tx => {
      const row = await tx.skillChangeRequest.findFirst({ where: { id: requestId, organizationId: actor.organizationId } }); if (!row) throw new NotFoundException("Skill request unavailable");
      if (actor.accountId === row.requestedById || !await this.managerWithoutSession(tx, actor.accountId, actor.kind, actor.organizationId, row.employeeId, "skills.manage")) throw new ForbiddenException("Current named skill approver scope required");
      const approval = await tx.approvalRequest.findUnique({ where: { id: row.approvalRequestId } }); if (!approval || approval.approverId !== actor.accountId) throw new ForbiddenException("Named skill approver required");
    });
  }
}

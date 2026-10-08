import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountKind, AccountState, ApprovalDecisionOutcome, ApprovalRequestState, OutboxConsumer, Prisma, type ApprovalRequest } from "./generated/prisma/client.js";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "./database.service.js";
import { assertSafeDomainPayload, isDomainEventName } from "./domain-event-catalogue.js";

export interface ApprovalActor { accountId: string; organizationId: string; }
export interface ApprovalCard { title: string; summary: string; subjectLabel: string; requesterLabel: string; levelLabel: string; }
export interface ApprovalRequestInput {
  sourceType: string; sourceId: string; sourceGeneration?: number;
  reason: string; comment?: string; context: Prisma.InputJsonValue; evidence?: Prisma.InputJsonValue; expiresAt?: Date;
}
export interface ApprovalDecisionInput { outcome: "APPROVED" | "REJECTED"; reason: string; comment?: string; evidence?: Prisma.InputJsonValue; }

/** A domain module registers one immutable policy per type. Callbacks always receive the owning transaction. */
export interface ApprovalHandler {
  readonly typeKey: string;
  resolveApprover(tx: Prisma.TransactionClient, actor: ApprovalActor, input: ApprovalRequestInput): Promise<{ accountId: string; level: string }>;
  canView(tx: Prisma.TransactionClient, actor: ApprovalActor, request: ApprovalRequest): Promise<boolean>;
  canDecide(tx: Prisma.TransactionClient, actor: ApprovalActor, request: ApprovalRequest, context: { delegated: boolean }): Promise<boolean>;
  canDelegate?(tx: Prisma.TransactionClient, actor: ApprovalActor, request: ApprovalRequest): Promise<boolean>;
  canWithdraw?(tx: Prisma.TransactionClient, actor: ApprovalActor, request: ApprovalRequest): Promise<boolean>;
  canSelfApprove: boolean;
  projectCard(tx: Prisma.TransactionClient, request: ApprovalRequest): Promise<ApprovalCard>;
  onDecision(tx: Prisma.TransactionClient, request: ApprovalRequest, decision: ApprovalDecisionInput, deciderId: string): Promise<void>;
}

const AUDIT_RETENTION_YEARS = 10;
const lifecycleEvent = {
  requested: "approval.requested",
  delegated: "approval.delegated",
  withdrawn: "approval.withdrawn",
  decided: "approval.decided"
} as const;

@Injectable()
export class ApprovalService {
  private readonly handlers = new Map<string, ApprovalHandler>();
  constructor(private readonly database: DatabaseService) {}

  /** Owning-handler visibility for a retained approval reference, without exposing its payload. */
  async canReadEvidence(tx: Prisma.TransactionClient, actor: ApprovalActor, requestId: string): Promise<boolean> {
    try {
      await this.assertActor(tx, actor);
      const request = await tx.approvalRequest.findFirst({ where: { id: requestId, organizationId: actor.organizationId } });
      if (!request) return false;
      const handler = this.handlers.get(request.typeKey);
      return !!handler && await handler.canView(tx, actor, request);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) return false;
      throw error;
    }
  }

  registerHandler(handler: ApprovalHandler): void {
    if (!/^[a-z][a-z0-9_.-]{1,119}$/.test(handler.typeKey)) throw new Error("Invalid approval type key");
    if (this.handlers.has(handler.typeKey)) throw new Error(`Approval handler already registered: ${handler.typeKey}`);
    this.handlers.set(handler.typeKey, handler);
  }

  /** Internal owner-module API. The caller's transaction owns the request and its lifecycle evidence. */
  async createRequest(tx: Prisma.TransactionClient, actor: ApprovalActor, typeKey: string, input: ApprovalRequestInput): Promise<ApprovalRequest> {
    await this.assertActor(tx, actor);
    const handler = this.requireHandler(typeKey);
    this.validateRequest(input);
    const assigned = await handler.resolveApprover(tx, actor, input);
    if (!assigned.accountId || !assigned.level || assigned.level.trim().length < 1 || assigned.level.length > 80) throw new ForbiddenException("Approval policy did not assign a valid approver and level");
    if (!handler.canSelfApprove && assigned.accountId === actor.accountId) throw new ForbiddenException("Self-approval is not allowed");
    await this.assertActor(tx, { accountId: assigned.accountId, organizationId: actor.organizationId });
    const request = await tx.approvalRequest.create({ data: {
      organizationId: actor.organizationId, typeKey, sourceType: input.sourceType, sourceId: input.sourceId,
      sourceGeneration: input.sourceGeneration ?? 1, requesterId: actor.accountId, approverId: assigned.accountId,
      approvalLevel: assigned.level, reason: input.reason, ...(input.comment === undefined ? {} : { comment: input.comment }),
      context: input.context, ...(input.evidence === undefined ? {} : { evidence: input.evidence }),
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {})
    } });
    await this.recordLifecycle(tx, actor.accountId, request, lifecycleEvent.requested, input.reason, { state: request.state, typeKey });
    return request;
  }

  /** Explicit delegation is scoped to one request and expires; policy decides who may delegate. */
  async delegate(tx: Prisma.TransactionClient, actor: ApprovalActor, requestId: string, delegateAccountId: string, reason: string, expiresAt: Date): Promise<ApprovalRequest> {
    await this.assertActor(tx, actor);
    const request = await this.lockedRequest(tx, actor.organizationId, requestId);
    const handler = this.requireHandler(request.typeKey);
    if (request.state !== ApprovalRequestState.PENDING || request.expiresAt && request.expiresAt <= new Date()) throw new ConflictException("Approval is no longer pending");
    if (!handler.canDelegate || !(await handler.canDelegate(tx, actor, request))) throw new ForbiddenException("Approval delegation is not allowed");
    if (delegateAccountId === request.requesterId || expiresAt <= new Date() || request.expiresAt && expiresAt > request.expiresAt) throw new ForbiddenException("Delegation is outside the request policy");
    const row = await tx.approvalRequest.update({ where: { id: request.id }, data: {
      delegationAccountId: delegateAccountId, delegationIssuedById: actor.accountId, delegationReason: reason,
      delegatedAt: new Date(), delegationExpiresAt: expiresAt
    } });
    await this.assertActor(tx, { accountId: delegateAccountId, organizationId: actor.organizationId });
    this.validateReason(reason);
    assertSafeDomainPayload(lifecycleEvent.delegated, { reason, delegationAccountId: delegateAccountId });
    await this.recordLifecycle(tx, actor.accountId, row, lifecycleEvent.delegated, reason,
      { delegationAccountId: delegateAccountId, expiresAt: expiresAt.toISOString() },
      { delegationAccountId: request.delegationAccountId, expiresAt: request.delegationExpiresAt?.toISOString() ?? null });
    return row;
  }

  async withdraw(tx: Prisma.TransactionClient, actor: ApprovalActor, requestId: string, reason: string): Promise<ApprovalRequest> {
    await this.assertActor(tx, actor);
    const request = await this.lockedRequest(tx, actor.organizationId, requestId);
    const handler = this.requireHandler(request.typeKey);
    if (request.state !== ApprovalRequestState.PENDING || !handler.canWithdraw || !(await handler.canWithdraw(tx, actor, request))) throw new ForbiddenException("Approval withdrawal is not allowed");
    this.validateReason(reason);
    assertSafeDomainPayload(lifecycleEvent.withdrawn, { reason });
    const row = await tx.approvalRequest.update({ where: { id: request.id }, data: { state: ApprovalRequestState.WITHDRAWN, resolvedAt: new Date() } });
    await this.recordLifecycle(tx, actor.accountId, row, lifecycleEvent.withdrawn, reason, { state: row.state }, { state: request.state });
    return row;
  }

  async decide(tx: Prisma.TransactionClient, actor: ApprovalActor, requestId: string, decision: ApprovalDecisionInput): Promise<void> {
    await this.assertActor(tx, actor);
    const request = await this.lockedRequest(tx, actor.organizationId, requestId);
    const handler = this.requireHandler(request.typeKey);
    const now = new Date();
    if (request.state !== ApprovalRequestState.PENDING) throw new ConflictException("Approval is already resolved");
    if (request.expiresAt && request.expiresAt <= now) throw new ConflictException("Approval has expired");
    const delegationActive = request.delegationAccountId === actor.accountId && request.delegationExpiresAt !== null && request.delegationExpiresAt > now;
    if (!(await handler.canDecide(tx, actor, request, { delegated: delegationActive }))) throw new ForbiddenException("Approval decision is not allowed");
    if (!handler.canSelfApprove && request.requesterId === actor.accountId) throw new ForbiddenException("Self-approval is not allowed");
    if (decision.reason.trim().length < 3 || decision.reason.length > 1000 || (decision.comment?.length ?? 0) > 2000) throw new ForbiddenException("Decision evidence is invalid");
    assertSafeDomainPayload(lifecycleEvent.decided, {
      reason: decision.reason,
      ...(decision.comment === undefined ? {} : { comment: decision.comment }),
      ...(decision.evidence === undefined ? {} : { evidence: decision.evidence })
    });
    if (JSON.stringify(decision.evidence ?? null).length > 8000) throw new ForbiddenException("Decision evidence is too large");
    const outcome = decision.outcome === "APPROVED" ? ApprovalDecisionOutcome.APPROVED : ApprovalDecisionOutcome.REJECTED;
    await tx.approvalDecision.create({ data: {
      requestId: request.id, organizationId: request.organizationId, outcome, deciderId: actor.accountId,
      reason: decision.reason, ...(decision.comment === undefined ? {} : { comment: decision.comment }),
      ...(decision.evidence === undefined ? {} : { evidence: decision.evidence })
    } });
    const state = outcome === ApprovalDecisionOutcome.APPROVED ? ApprovalRequestState.APPROVED : ApprovalRequestState.REJECTED;
    await tx.approvalRequest.update({ where: { id: request.id }, data: { state, resolvedAt: now } });
    await handler.onDecision(tx, request, decision, actor.accountId);
    await this.recordLifecycle(tx, actor.accountId, { ...request, state, resolvedAt: now }, lifecycleEvent.decided, decision.reason,
      { outcome, state }, { state: request.state });
  }

  async attention(actorId: string, limit: number, cursor?: string) {
    const org = await this.database.prisma.organization.findFirst({ select: { id: true } });
    if (!org) return { items: [], nextCursor: null };
    const actor = await this.database.prisma.account.findUnique({ where: { id: actorId }, select: { id: true, kind: true, state: true, employee: { select: { organizationId: true, state: true } } } });
    if (!actor || actor.state !== AccountState.ACTIVE || actor.kind === AccountKind.STAFF && (actor.employee?.organizationId !== org.id || actor.employee.state !== "ACTIVE")) throw new ForbiddenException("Permission denied");
    const now = new Date();
    let after: { requestedAt: Date; id: string } | undefined;
    if (cursor) {
      const decoded = this.decodeCursor(cursor);
      after = decoded;
    }
    const typeKeys = [...this.handlers.keys()];
    if (typeKeys.length === 0) return { items: [], nextCursor: null };
    const scanSize = Math.min(500, Math.max(50, limit * 10));
    const visible: Array<{ request: ApprovalRequest; card: ApprovalCard }> = [];
    let scanAfter = after;
    let scanned = 0;
    let exhausted = false;
    while (visible.length <= limit && scanned < 5000 && !exhausted) {
      const rows = await this.database.prisma.approvalRequest.findMany({
        where: {
          organizationId: org.id, state: ApprovalRequestState.PENDING, typeKey: { in: typeKeys },
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            ...(scanAfter ? [{ OR: [
              { requestedAt: { lt: scanAfter.requestedAt } }, { requestedAt: scanAfter.requestedAt, id: { lt: scanAfter.id } }
            ] }] : [])
          ]
        }, orderBy: [{ requestedAt: "desc" }, { id: "desc" }], take: Math.min(scanSize, 5000 - scanned)
      });
      scanned += rows.length;
      exhausted = rows.length < scanSize;
      if (rows.length) scanAfter = { requestedAt: rows.at(-1)!.requestedAt, id: rows.at(-1)!.id };
      for (const request of rows) {
        const handler = this.handlers.get(request.typeKey);
        if (handler) {
          const projected = await this.database.prisma.$transaction(async (tx) => {
            if (!(await handler.canView(tx, { accountId: actorId, organizationId: org.id }, request))) return null;
            return handler.projectCard(tx, request);
          });
          if (projected) visible.push({ request, card: projected });
          if (visible.length > limit) break;
        }
      }
      if (visible.length > limit) break;
    }
    const page = visible.slice(0, limit);
    const last = page.at(-1)?.request;
    const hasMore = visible.length > limit || !exhausted && scanned >= 5000;
    return {
      items: page.map(({ request, card }) => ({ id: request.id, typeKey: request.typeKey, title: card.title, summary: card.summary, subjectLabel: card.subjectLabel, requesterLabel: card.requesterLabel, reason: request.reason, requestedAt: request.requestedAt, expiresAt: request.expiresAt, approvalLevel: card.levelLabel, state: request.state })),
      nextCursor: hasMore && last ? this.encodeCursor(last.requestedAt, last.id) : hasMore && scanAfter ? this.encodeCursor(scanAfter.requestedAt, scanAfter.id) : null
    };
  }

  /** Exact, read-only handoff for an item already governed by its registered approval policy. */
  async attentionItem(actorId: string, requestId: string) {
    const org = await this.database.prisma.organization.findFirst({ select: { id: true } });
    if (!org) throw new NotFoundException("Approval request is unavailable");
    const actor = await this.database.prisma.account.findUnique({ where: { id: actorId }, select: { id: true, kind: true, state: true, employee: { select: { organizationId: true, state: true } } } });
    if (!actor || actor.state !== AccountState.ACTIVE || actor.kind === AccountKind.STAFF && (actor.employee?.organizationId !== org.id || actor.employee.state !== "ACTIVE")) throw new ForbiddenException("Permission denied");
    return this.database.prisma.$transaction(async tx => {
      await this.assertActor(tx, { accountId: actorId, organizationId: org.id });
      const rows = await tx.$queryRaw<ApprovalRequest[]>`SELECT * FROM "approval_requests" WHERE "id" = ${requestId}::uuid AND "organizationId" = ${org.id}::uuid AND "state" = ${ApprovalRequestState.PENDING}::"ApprovalRequestState" AND ("expiresAt" IS NULL OR "expiresAt" > ${new Date()}) FOR SHARE`;
      const request = rows[0];
      const handler = request && this.handlers.get(request.typeKey);
      if (!request || !handler) throw new NotFoundException("Approval request is unavailable");
      const currentActor = { accountId: actorId, organizationId: org.id };
      if (!(await handler.canView(tx, currentActor, request))) throw new NotFoundException("Approval request is unavailable");
      const card = await handler.projectCard(tx, request);
      return { id: request.id, typeKey: request.typeKey, title: card.title, summary: card.summary, subjectLabel: card.subjectLabel, requesterLabel: card.requesterLabel, reason: request.reason, requestedAt: request.requestedAt, expiresAt: request.expiresAt, approvalLevel: card.levelLabel, state: request.state };
    });
  }

  private requireHandler(typeKey: string): ApprovalHandler {
    const handler = this.handlers.get(typeKey);
    if (!handler) throw new ForbiddenException("Approval type is not registered");
    return handler;
  }
  private async assertActor(tx: Prisma.TransactionClient, actor: ApprovalActor): Promise<void> {
    const [account, organization] = await Promise.all([
      tx.$queryRaw<Array<{ id: string; kind: AccountKind }>>`SELECT "id", "kind" FROM "accounts" WHERE "id" = ${actor.accountId}::uuid AND "state" = 'ACTIVE'::"AccountState" FOR SHARE`,
      tx.organization.findUnique({ where: { id: actor.organizationId }, select: { id: true } })
    ]);
    if (!account[0] || !organization) throw new ForbiddenException("Permission denied");
    if (account[0].kind === AccountKind.OWNER) return;
    const employee = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "employees" WHERE "accountId" = ${actor.accountId}::uuid AND "organizationId" = ${organization.id}::uuid AND "state" = 'ACTIVE' FOR SHARE`;
    if (!employee[0]) throw new ForbiddenException("Permission denied");
  }
  private validateRequest(input: ApprovalRequestInput): void {
    if (input.sourceType.length < 1 || input.sourceType.length > 100 || input.sourceId.length < 1 || input.sourceId.length > 200 ||
      !Number.isInteger(input.sourceGeneration ?? 1) || (input.sourceGeneration ?? 1) < 1 ||
      input.reason.trim().length < 3 || input.reason.length > 1000 || (input.comment?.length ?? 0) > 2000 ||
      JSON.stringify(input.context).length > 8000 || JSON.stringify(input.evidence ?? null).length > 8000 || input.expiresAt && input.expiresAt <= new Date()) {
      throw new ForbiddenException("Approval request is invalid");
    }
    assertSafeDomainPayload(lifecycleEvent.requested, {
      reason: input.reason,
      ...(input.comment === undefined ? {} : { comment: input.comment }),
      context: input.context,
      ...(input.evidence === undefined ? {} : { evidence: input.evidence })
    });
  }
  private validateReason(reason: string): void {
    if (reason.trim().length < 3 || reason.length > 1000) throw new ForbiddenException("Approval reason is invalid");
  }
  private async lockedRequest(tx: Prisma.TransactionClient, organizationId: string, requestId: string): Promise<ApprovalRequest> {
    const rows = await tx.$queryRaw<ApprovalRequest[]>`SELECT * FROM "approval_requests" WHERE "id" = ${requestId}::uuid AND "organizationId" = ${organizationId}::uuid FOR UPDATE`;
    if (!rows[0]) throw new NotFoundException("Approval not found");
    return rows[0];
  }
  private async recordLifecycle(tx: Prisma.TransactionClient, actorId: string, request: ApprovalRequest, eventName: string, reason: string, after: Record<string, unknown>, before?: Record<string, unknown>): Promise<void> {
    if (!isDomainEventName(eventName)) throw new Error("Approval event is absent from the versioned catalogue");
    const actor = await tx.account.findUnique({ where: { id: actorId }, select: { normalizedEmail: true } });
    if (!actor) throw new Error("Approval actor was not found");
    const occurredAt = new Date();
    const correlationId = randomUUID();
    const retentionExpiresAt = new Date(occurredAt);
    retentionExpiresAt.setUTCFullYear(retentionExpiresAt.getUTCFullYear() + AUDIT_RETENTION_YEARS);
    const safeAfter = { requestId: request.id, typeKey: request.typeKey, ...after };
    const audit = await tx.auditEvent.create({ data: {
      organizationId: request.organizationId, eventKey: eventName, schemaVersion: 1, occurredAt, actorId,
      actorSnapshot: { accountId: actorId, email: actor.normalizedEmail }, subjectType: "approval_request", subjectId: request.id,
      reason, ...(before ? { before: before as Prisma.InputJsonValue } : {}), after: safeAfter as Prisma.InputJsonValue, retentionExpiresAt, correlationId
    } });
    const payload = { auditEventId: audit.id, requestId: request.id, typeKey: request.typeKey, lifecycle: eventName };
    assertSafeDomainPayload(eventName, payload);
    const event = await tx.domainEvent.create({ data: {
      eventName, schemaVersion: 1, occurredAt, organizationId: request.organizationId, actorId,
      subjectType: "approval_request", subjectId: request.id, correlationId, payload
    } });
    await tx.outboxDelivery.create({ data: { eventId: event.id, consumer: OutboxConsumer.NTF } });
  }
  private encodeCursor(requestedAt: Date, id: string): string { return Buffer.from(JSON.stringify({ requestedAt: requestedAt.toISOString(), id })).toString("base64url"); }
  private decodeCursor(cursor: string): { requestedAt: Date; id: string } {
    try {
      const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { requestedAt?: string; id?: string };
      const requestedAt = new Date(value.requestedAt ?? "");
      if (!value.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.id) || Number.isNaN(requestedAt.getTime())) throw new Error();
      return { requestedAt, id: value.id };
    } catch { throw new NotFoundException("Invalid queue cursor"); }
  }
}

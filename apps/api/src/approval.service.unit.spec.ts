import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { AccountKind, ApprovalDecisionOutcome, ApprovalRequestState, type ApprovalRequest, type Prisma } from "./generated/prisma/client.js";
import { ApprovalService, type ApprovalActor, type ApprovalDecisionInput, type ApprovalHandler, type ApprovalRequestInput } from "./approval.service.js";

const actorId = "11111111-1111-4111-8111-111111111111";
const approverId = "22222222-2222-4222-8222-222222222222";
const orgId = "33333333-3333-4333-8333-333333333333";
const requestId = "44444444-4444-4444-8444-444444444444";
const actor: ApprovalActor = { accountId: actorId, organizationId: orgId };
const input: ApprovalRequestInput = { sourceType: "test", sourceId: "source-1", reason: "Needs approval", context: { label: "Fixture" } };
const decision: ApprovalDecisionInput = { outcome: "APPROVED", reason: "Reviewed and accepted" };

function harness(overrides: { request?: Partial<ApprovalRequest>; accountKind?: AccountKind } = {}) {
  const request = {
    id: requestId, organizationId: orgId, typeKey: "test.approval", sourceType: "test", sourceId: "source-1", sourceGeneration: 1,
    requesterId: actorId, approverId, approvalLevel: "Owner", state: ApprovalRequestState.PENDING,
    reason: "Needs approval", comment: null, context: { label: "Fixture" }, evidence: null,
    requestedAt: new Date("2026-09-27T00:00:00.000Z"), expiresAt: null, resolvedAt: null,
    delegationAccountId: null, delegationIssuedById: null, delegationReason: null, delegatedAt: null, delegationExpiresAt: null,
    ...overrides.request
  } as ApprovalRequest;
  const tx = {
    $queryRaw: jest.fn(async (parts: TemplateStringsArray) => {
      const query = parts.join("");
      if (query.includes('FROM "accounts"')) return [{ id: actorId, kind: overrides.accountKind ?? AccountKind.OWNER }];
      if (query.includes('FROM "employees"')) return [{ id: "employee-1" }];
      if (query.includes('FROM "approval_requests"')) return [request];
      return [];
    }),
    organization: { findUnique: jest.fn(async () => ({ id: orgId })) },
    account: { findUnique: jest.fn(async () => ({ normalizedEmail: "actor@example.test" })) },
    approvalRequest: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...request, ...data })),
      update: jest.fn(async ({ data }: { data: Partial<ApprovalRequest> }) => Object.assign(request, data))
    },
    approvalDecision: { create: jest.fn(async () => ({ id: "decision-1" })) },
    auditEvent: { create: jest.fn(async () => ({ id: "audit-1" })) },
    domainEvent: { create: jest.fn(async () => ({ id: "event-1" })) },
    outboxDelivery: { create: jest.fn(async () => ({ id: "outbox-1" })) }
  };
  const database = { prisma: { $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) } };
  const service = new ApprovalService(database as never);
  const handler: ApprovalHandler = {
    typeKey: "test.approval",
    resolveApprover: jest.fn(async () => ({ accountId: approverId, level: "Owner" })),
    canView: jest.fn(async () => true),
    canDecide: jest.fn(async () => true),
    canDelegate: jest.fn(async () => true),
    canWithdraw: jest.fn(async () => true),
    canSelfApprove: false,
    projectCard: jest.fn(async () => ({ title: "Approval", summary: "Review", subjectLabel: "Fixture", requesterLabel: "Requester", levelLabel: "Owner" })),
    onDecision: jest.fn(async () => undefined)
  };
  service.registerHandler(handler);
  return { service, handler, tx, database, request };
}

describe("ApprovalService S05 policy and transaction behavior", () => {
  it("uses the registered approver policy and writes request, audit, domain event and outbox through the supplied transaction", async () => {
    const { service, handler, tx } = harness();
    await service.createRequest(tx as unknown as Prisma.TransactionClient, actor, handler.typeKey, input);
    expect(handler.resolveApprover).toHaveBeenCalledWith(tx, actor, input);
    expect(tx.approvalRequest.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      organizationId: orgId, requesterId: actorId, approverId, approvalLevel: "Owner",
      sourceGeneration: 1, reason: input.reason
    }) });
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventKey: "approval.requested", organizationId: orgId }) });
    expect(tx.domainEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventName: "approval.requested", organizationId: orgId }) });
    expect(tx.outboxDelivery.create).toHaveBeenCalledWith({ data: { eventId: "event-1", consumer: "NTF" } });
  });

  it("rejects a policy that assigns the requester as approver when self-approval is disabled", async () => {
    const { service, handler, tx } = harness();
    (handler.resolveApprover as jest.Mock).mockResolvedValue({ accountId: actorId, level: "Team Lead" });
    await expect(service.createRequest(tx as unknown as Prisma.TransactionClient, actor, handler.typeKey, input)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.approvalRequest.create).not.toHaveBeenCalled();
  });

  it("requires current handler decision authority for a delegate", async () => {
    const delegatedRequest = { delegationAccountId: actorId, delegationExpiresAt: new Date(Date.now() + 60_000) };
    const { service, handler, tx } = harness({ request: delegatedRequest });
    (handler.canDecide as jest.Mock).mockResolvedValue(false);
    await expect(service.decide(tx as unknown as Prisma.TransactionClient, actor, requestId, decision)).rejects.toBeInstanceOf(ForbiddenException);
    expect(handler.canDecide).toHaveBeenCalledWith(tx, actor, expect.anything(), { delegated: true });
    expect(tx.approvalDecision.create).not.toHaveBeenCalled();
  });

  it("rejects expired requests before writing a decision", async () => {
    const { service, handler, tx } = harness({ request: { expiresAt: new Date(Date.now() - 1) } });
    await expect(service.decide(tx as unknown as Prisma.TransactionClient, { accountId: approverId, organizationId: orgId }, requestId, decision)).rejects.toBeInstanceOf(ConflictException);
    expect(handler.canDecide).not.toHaveBeenCalled();
    expect(tx.approvalDecision.create).not.toHaveBeenCalled();
  });

  it("rejects requester self-decision and does not create decision evidence", async () => {
    const { service, tx } = harness();
    await expect(service.decide(tx as unknown as Prisma.TransactionClient, actor, requestId, decision)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.approvalDecision.create).not.toHaveBeenCalled();
  });

  it("rejects delegation back to the requester before persisting it", async () => {
    const { service, handler, tx } = harness();
    await expect(service.delegate(tx as unknown as Prisma.TransactionClient, { accountId: approverId, organizationId: orgId }, requestId, actorId, "Delegate review", new Date(Date.now() + 60_000))).rejects.toBeInstanceOf(ForbiddenException);
    expect(handler.canDelegate).toHaveBeenCalled();
    expect(tx.approvalRequest.update).not.toHaveBeenCalled();
  });

  it("filters the read-only queue with the registered view policy", async () => {
    const { service, handler, database, request } = harness();
    const hidden = { ...request, id: "hidden-request" } as ApprovalRequest;
    (handler.canView as jest.Mock).mockImplementation(async (_tx: unknown, _candidateActor: unknown, candidate: ApprovalRequest) => candidate.id !== hidden.id);
    const prisma = database.prisma as unknown as {
      organization: { findFirst: () => Promise<{ id: string }> };
      account: { findUnique: () => Promise<{ id: string; kind: AccountKind; state: string; employee: { organizationId: string; state: string } }> };
      approvalRequest: { findMany: () => Promise<ApprovalRequest[]> };
    };
    prisma.organization = { findFirst: async () => ({ id: orgId }) };
    prisma.account = { findUnique: async () => ({ id: actorId, kind: AccountKind.STAFF, state: "ACTIVE", employee: { organizationId: orgId, state: "ACTIVE" } }) };
    prisma.approvalRequest = { findMany: async () => [request, hidden] };

    const result = await service.attention(actorId, 25);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: requestId, title: "Approval" });
    expect(handler.canView).toHaveBeenCalledTimes(2);
    expect(handler.projectCard).toHaveBeenCalledTimes(1);
  });

  it("reauthorizes an exact pending card with the current typed handler and no decision mutation", async () => {
    const { service, handler, database, tx } = harness();
    const prisma = database.prisma as unknown as {
      organization: { findFirst: () => Promise<{ id: string }>; };
      account: { findUnique: () => Promise<{ id: string; kind: AccountKind; state: string; employee: null }> };
    };
    prisma.organization = { findFirst: async () => ({ id: orgId }) };
    prisma.account = { findUnique: async () => ({ id: actorId, kind: AccountKind.OWNER, state: "ACTIVE", employee: null }) };
    const item = await service.attentionItem(actorId, requestId);
    expect(item).toMatchObject({ id: requestId, typeKey: "test.approval", title: "Approval", state: ApprovalRequestState.PENDING });
    expect(handler.canView).toHaveBeenCalledWith(tx, { accountId: actorId, organizationId: orgId }, expect.objectContaining({ id: requestId }));
    expect(handler.projectCard).toHaveBeenCalledTimes(1);
    expect(tx.approvalDecision.create).not.toHaveBeenCalled();
    expect(tx.approvalRequest.update).not.toHaveBeenCalled();
  });

  it("does not reveal an exact request when its current owning handler hides it", async () => {
    const { service, handler, database, tx } = harness();
    const prisma = database.prisma as unknown as {
      organization: { findFirst: () => Promise<{ id: string }> };
      account: { findUnique: () => Promise<{ id: string; kind: AccountKind; state: string; employee: null }> };
    };
    prisma.organization = { findFirst: async () => ({ id: orgId }) };
    prisma.account = { findUnique: async () => ({ id: actorId, kind: AccountKind.OWNER, state: "ACTIVE", employee: null }) };
    (handler.canView as jest.Mock).mockResolvedValue(false);
    await expect(service.attentionItem(actorId, requestId)).rejects.toBeInstanceOf(NotFoundException);
    expect(handler.projectCard).not.toHaveBeenCalled();
    expect(tx.approvalDecision.create).not.toHaveBeenCalled();
  });

  it("runs the typed owning-domain callback and decision audit/outbox after appending one decision", async () => {
    const { service, handler, tx } = harness();
    await service.decide(tx as unknown as Prisma.TransactionClient, { accountId: approverId, organizationId: orgId }, requestId, decision);
    expect(tx.approvalDecision.create).toHaveBeenCalledWith({ data: expect.objectContaining({ requestId, outcome: ApprovalDecisionOutcome.APPROVED, deciderId: approverId }) });
    expect(tx.approvalRequest.update).toHaveBeenCalledWith({ where: { id: requestId }, data: { state: ApprovalRequestState.APPROVED, resolvedAt: expect.any(Date) } });
    expect(handler.onDecision).toHaveBeenCalledWith(tx, expect.objectContaining({ id: requestId }), decision, approverId);
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventKey: "approval.decided" }) });
    expect(tx.outboxDelivery.create).toHaveBeenCalledWith({ data: { eventId: "event-1", consumer: "NTF" } });
  });
});

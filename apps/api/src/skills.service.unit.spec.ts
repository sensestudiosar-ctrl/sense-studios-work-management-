import { ForbiddenException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { AccountKind } from "./generated/prisma/client.js";
import { SkillsService } from "./skills.service.js";
import { ApprovalService, type ApprovalHandler } from "./approval.service.js";
import type { DatabaseService } from "./database.service.js";
import type { AuthorizationService } from "./authorization.service.js";

const accountId = "c64f2145-5810-4a7e-9485-fbe9099c50cf", organizationId = "92b47f8e-8b4c-43f4-9b96-33f700e568f1", sessionId = "a5a5f862-0473-4bd2-9329-90fa057139f1";

type ResolverArgs = Parameters<ApprovalHandler["resolveApprover"]>;
function resolveApprover(service: SkillsService, tx: unknown, actor: ResolverArgs[1], input: ResolverArgs[2]) {
  const handler = (service as unknown as { approvalHandler(): ApprovalHandler }).approvalHandler();
  return handler.resolveApprover(tx as ResolverArgs[0], actor, input);
}
function onDecision(service: SkillsService, tx: unknown, request: unknown, decision: unknown, deciderId: string) {
  const handler = (service as unknown as { approvalHandler(): ApprovalHandler }).approvalHandler();
  return handler.onDecision(tx as Parameters<ApprovalHandler["onDecision"]>[0], request as Parameters<ApprovalHandler["onDecision"]>[1], decision as Parameters<ApprovalHandler["onDecision"]>[2], deciderId);
}

describe("SkillsService authorization", () => {
  it("requires a supplied live session even for service-level reads", async () => {
    const transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
    const service = new SkillsService({ prisma: { $transaction: transaction } } as unknown as DatabaseService, {} as AuthorizationService, { registerHandler: jest.fn() } as unknown as ApprovalService);
    await expect(service.setup({ accountId, organizationId, kind: AccountKind.STAFF })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rechecks catalogue authority before returning an actor-scoped replay receipt", async () => {
    const skillReceiptFind = jest.fn();
    const tx = {
      $queryRaw: jest.fn(async () => []), $executeRaw: jest.fn(async () => 1),
      account: { findUnique: jest.fn(async () => ({ id: accountId, state: "ACTIVE", kind: "STAFF", employee: { id: "emp-1", state: "ACTIVE", organizationId } })) },
      session: { findUnique: jest.fn(async () => ({ id: sessionId, accountId, revokedAt: null, expiresAt: new Date(Date.now() + 60000), lastUsedAt: new Date() })) },
      organization: { findFirst: jest.fn(async () => ({ id: organizationId })) },
      skillReceipt: { findUnique: skillReceiptFind }
    };
    const database = { prisma: { $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)) } };
    const service = new SkillsService(database as unknown as DatabaseService, {} as AuthorizationService, { registerHandler: jest.fn() } as unknown as ApprovalService);
    await expect(service.createCatalogue({ accountId, organizationId, kind: AccountKind.STAFF, sessionId }, { commandId: "b5fa0138-d635-47aa-ae7e-8c7795c55fc8", name: "Lighting", reason: "Add a skill" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(skillReceiptFind).not.toHaveBeenCalled();
  });
});

describe("SkillsService skill.change approval handler", () => {
  // Both cases are workflow states, not requester denials, so they must be 409 with a stable code rather than 403.
  // The shared resolveApprover helper above does the private-method cast; here we drive it with a shaped transaction.
  it("returns 409 SKILL_APPROVER_UNAVAILABLE when the named approver account is missing", async () => {
    const tx = { account: { findFirst: jest.fn(async () => null) }, employee: { findFirst: jest.fn(async () => ({ id: "emp-1", state: "ACTIVE", organizationId })) } };
    const service = new SkillsService({ prisma: { $transaction: jest.fn() } } as unknown as DatabaseService, {} as AuthorizationService, new ApprovalService({ prisma: { $transaction: jest.fn() } } as unknown as DatabaseService));
    await expect(resolveApprover(service, tx, { accountId, organizationId }, { sourceType: "skill_change_request", sourceId: "x", reason: "r", context: { employeeId: "emp-1", approverAccountId: "missing" } })).rejects.toMatchObject({ status: 409, response: { code: "SKILL_APPROVER_UNAVAILABLE" } });
  });

  it("returns 409 SKILL_APPROVER_SCOPE_REVOKED when the named approver's session-bound scope is gone", async () => {
    const tx = { account: { findFirst: jest.fn(async () => ({ id: "app-1", state: "ACTIVE", kind: "STAFF", employee: { id: "emp-app", state: "ACTIVE", organizationId } })) }, employee: { findFirst: jest.fn(async () => ({ id: "emp-1", state: "ACTIVE", organizationId })) } };
    const service = new SkillsService({ prisma: { $transaction: jest.fn() } } as unknown as DatabaseService, {} as AuthorizationService, new ApprovalService({ prisma: { $transaction: jest.fn() } } as unknown as DatabaseService));
    // managerWithoutSession is a private method on SkillsService itself; stub it to simulate revoked manager scope.
    (service as unknown as { managerWithoutSession: () => Promise<boolean> }).managerWithoutSession = async () => false;
    await expect(resolveApprover(service, tx, { accountId, organizationId }, { sourceType: "skill_change_request", sourceId: "x", reason: "r", context: { employeeId: "emp-1", approverAccountId: "app-1" } })).rejects.toMatchObject({ status: 409, response: { code: "SKILL_APPROVER_SCOPE_REVOKED" } });
  });

  it("returns 409 SKILL_APPROVER_SCOPE_CHANGED when the decider's skill scope is revoked mid-decision", async () => {
    const tx = {
      skillChangeRequest: { findFirst: jest.fn(async () => ({ id: "req-1", approvalRequestId: "req-1", organizationId, employeeId: "emp-1", skillId: null, proposedSkillName: null, expectedRatingVersion: 0, requestedLevel: "SENIOR" })) },
      account: { findUniqueOrThrow: jest.fn(async () => ({ kind: AccountKind.STAFF })) }
    };
    const service = new SkillsService({ prisma: { $transaction: jest.fn() } } as unknown as DatabaseService, {} as AuthorizationService, new ApprovalService({ prisma: { $transaction: jest.fn() } } as unknown as DatabaseService));
    // decisionPolicy already ran canDecide/currentEligibleWithoutSession; simulate the scope being revoked between that check and onDecision.
    (service as unknown as { managerWithoutSession: () => Promise<boolean> }).managerWithoutSession = async () => false;
    await expect(onDecision(service, tx, { id: "req-1" }, { outcome: "APPROVED" }, "app-1")).rejects.toMatchObject({ status: 409, response: { code: "SKILL_APPROVER_SCOPE_CHANGED" } });
  });

  it("rejects a 409 when skills.manage is revoked between the eligibility check and the decision", async () => {
    // The real race: decisionPolicy runs canDecide (which calls currentEligibleWithoutSession ->
    // managerWithoutSession, call 1) and then onDecision calls managerWithoutSession again (call 2).
    // A revocation landing in that window must not leave the decider looking merely unauthorized.
    const tx = {
      skillChangeRequest: { findFirst: jest.fn(async () => ({ id: "req-1", approvalRequestId: "req-1", organizationId, employeeId: "emp-1", skillId: null, proposedSkillName: null, expectedRatingVersion: 0, trainingSourceId: null })) },
      account: { findUniqueOrThrow: jest.fn(async () => ({ kind: AccountKind.STAFF })) }
    };
    const service = new SkillsService({ prisma: { $transaction: jest.fn() } } as unknown as DatabaseService, {} as AuthorizationService, new ApprovalService({ prisma: { $transaction: jest.fn() } } as unknown as DatabaseService));
    const scope = service as unknown as { managerWithoutSession: () => Promise<boolean> };
    let checks = 0;
    scope.managerWithoutSession = async () => ++checks !== 1; // canDecide passed upstream; onDecision's own re-check is the first call here and must see it revoked
    const handler = (service as unknown as { approvalHandler(): ApprovalHandler }).approvalHandler();
    await expect(handler.onDecision(tx as Parameters<ApprovalHandler["onDecision"]>[0], { id: "req-1" } as Parameters<ApprovalHandler["onDecision"]>[1], { outcome: "APPROVED" } as Parameters<ApprovalHandler["onDecision"]>[2], "app-1")).rejects.toMatchObject({ status: 409, response: { code: "SKILL_APPROVER_SCOPE_CHANGED" } });
    expect(checks).toBe(1);
  });
});

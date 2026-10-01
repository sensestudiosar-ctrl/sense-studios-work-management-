import { ForbiddenException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { AccountKind, AccountState, EmployeeState } from "./generated/prisma/client.js";
import { AuthorizationService } from "./authorization.service.js";
import { OperationalRecipientPredicate } from "./notification-worker.js";

const eventId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const orgId = "33333333-3333-4333-8333-333333333333";
const branchId = "44444444-4444-4444-8444-444444444444";
const projectId = "55555555-5555-4555-8555-555555555555";
const auditId = "66666666-6666-4666-8666-666666666666";
const reason = "Current Project Lead exited; Owner replacement required";

describe("S13 escalation recipient delivery", () => {
  const roundId = "77777777-7777-4777-8777-777777777777";
  const employeeId = "88888888-8888-4888-8888-888888888888";
  const taskId = "99999999-9999-4999-8999-999999999999";
  const actorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const escalationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  let event: Record<string, unknown>;
  let audit: Record<string, unknown>;
  let escalation: Record<string, unknown> | null;
  let round: Record<string, unknown>;
  let project: Record<string, unknown>;
  let account: Record<string, unknown>;
  let assignment: Record<string, unknown> | null;
  let authorization: { assertPermission: jest.Mock };
  let predicate: OperationalRecipientPredicate;
  beforeEach(() => {
    event = { id: eventId, eventName: "review.escalated", organizationId: orgId, actorId, subjectType: "review", subjectId: roundId, correlationId: "correlation", payload: { auditEventId: auditId } };
    audit = { organizationId: orgId, actorId, eventKey: "review.escalated", subjectType: "review", subjectId: roundId, correlationId: "correlation", reason: "Review needs management attention", after: { escalationId, recipientAccountId: accountId, projectId, taskId, roundId } };
    escalation = { id: escalationId, organizationId: orgId, projectId, roundId, actorId, recipientAccountId: accountId, reason: audit.reason };
    round = { id: roundId, organizationId: orgId, projectId, taskId };
    project = { id: projectId, organizationId: orgId, branchId, status: "ACTIVE", currentLeadEmployeeId: employeeId };
    account = { id: accountId, kind: AccountKind.STAFF, state: AccountState.ACTIVE, employee: { id: employeeId, organizationId: orgId, state: EmployeeState.ACTIVE, homeBranchId: branchId } };
    assignment = { crossBranchAuthorized: false };
    const prisma = {
      domainEvent: { findUnique: jest.fn(async () => event) }, auditEvent: { findUnique: jest.fn(async () => audit) },
      reviewEscalation: { findUnique: jest.fn(async () => escalation) }, reviewRound: { findUnique: jest.fn(async () => round) },
      project: { findUnique: jest.fn(async () => project) }, account: { findUnique: jest.fn(async () => account) },
      projectAssignment: { findFirst: jest.fn(async () => assignment) }
    };
    authorization = { assertPermission: jest.fn(async () => undefined) };
    predicate = new OperationalRecipientPredicate({ prisma } as never, authorization as unknown as AuthorizationService);
  });
  it("delivers to the named active current Lead with project.view", async () => {
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(true);
    expect(authorization.assertPermission).toHaveBeenCalledWith(accountId, "project.view", { kind: "BRANCH", organizationId: orgId, branchId });
  });
  it("rejects changed Lead, revoked assignment, revoked grants and exited employees", async () => {
    project.currentLeadEmployeeId = actorId;
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    project.currentLeadEmployeeId = employeeId;
    assignment = null;
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    assignment = { crossBranchAuthorized: false };
    authorization.assertPermission.mockImplementation(async () => { throw new ForbiddenException(); });
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    authorization.assertPermission.mockImplementation(async () => undefined);
    account.employee = { ...(account.employee as object), state: EmployeeState.EXITED };
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
  });
  it("requires explicit cross-branch assignment", async () => {
    project.branchId = actorId;
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    assignment = { crossBranchAuthorized: true };
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(true);
  });
  it("delivers only to the named active Owner fallback on an active project", async () => {
    account = { id: accountId, kind: AccountKind.OWNER, state: AccountState.ACTIVE, employee: null };
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(true);
    await expect(predicate.isAuthorized(eventId, actorId)).resolves.toBe(false);
    project.status = "ON_HOLD";
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    project.status = "ACTIVE";
    account.state = AccountState.SUSPENDED;
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
  });
  it("rejects forged audit linkage and mismatched escalation evidence", async () => {
    audit.correlationId = "forged";
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    audit.correlationId = "correlation";
    escalation!.reason = "Different reason";
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    escalation!.reason = audit.reason;
    round.taskId = actorId;
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    round.taskId = taskId;
    escalation = null;
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
  });
});

describe("OperationalRecipientPredicate", () => {
  let predicate: OperationalRecipientPredicate;
  let prisma: {
    domainEvent: { findUnique: jest.Mock };
    account: { findUnique: jest.Mock };
    auditEvent: { findUnique: jest.Mock };
    projectAssignment: { findMany: jest.Mock };
  };
  let authorization: { assertPermission: jest.Mock };
  let event: Record<string, unknown>;
  let account: Record<string, unknown>;
  let audit: Record<string, unknown>;
  let assignments: Array<Record<string, unknown>>;

  beforeEach(() => {
    event = { id: eventId, eventName: "project.on_hold", organizationId: orgId, subjectId: projectId, payload: { auditEventId: auditId } };
    account = { id: accountId, kind: AccountKind.STAFF, state: AccountState.ACTIVE, employee: { id: "77777777-7777-4777-8777-777777777777", state: EmployeeState.ACTIVE, organizationId: orgId, homeBranchId: branchId } };
    audit = { reason, after: { status: "ON_HOLD" } };
    assignments = [{ project: { branchId }, crossBranchAuthorized: false }];
    prisma = {
      domainEvent: { findUnique: jest.fn(async () => event) },
      account: { findUnique: jest.fn(async () => account) },
      auditEvent: { findUnique: jest.fn(async () => audit) },
      projectAssignment: { findMany: jest.fn(async () => assignments) }
    };
    authorization = { assertPermission: jest.fn(async () => undefined) };
    predicate = new OperationalRecipientPredicate({ prisma } as never, authorization as unknown as AuthorizationService);
  });

  it("allows only an active Owner to receive employee-exit events", async () => {
    event.eventName = "organization.employee.exited";
    account = { id: accountId, kind: AccountKind.OWNER, state: AccountState.ACTIVE, employee: null };
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(true);
    account = { id: accountId, kind: AccountKind.STAFF, state: AccountState.ACTIVE, employee: { id: "77777777-7777-4777-8777-777777777777", state: EmployeeState.ACTIVE, organizationId: orgId, homeBranchId: branchId } };
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    account = { id: accountId, kind: AccountKind.OWNER, state: AccountState.SUSPENDED, employee: null };
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
  });

  it("allows current same-organization staff with active assignment, matching exit evidence and project.view", async () => {
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(true);
    expect(prisma.projectAssignment.findMany).toHaveBeenCalledWith({ where: { organizationId: orgId, employeeId: "77777777-7777-4777-8777-777777777777", projectId, revokedAt: null }, include: { project: true } });
    expect(authorization.assertPermission).toHaveBeenCalledWith(accountId, "project.view", { kind: "BRANCH", organizationId: orgId, branchId });
  });

  it("rejects revoked or cross-organization identities and assignments", async () => {
    account = { ...account, employee: { ...(account.employee as object), state: EmployeeState.EXITED } };
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    account = { ...account, employee: { ...(account.employee as object), state: EmployeeState.ACTIVE, organizationId: "88888888-8888-4888-8888-888888888888" } };
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    account = { ...account, employee: { ...(account.employee as object), organizationId: orgId } };
    assignments = [];
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
  });

  it("requires branch match or explicit cross-branch authorization", async () => {
    assignments = [{ project: { branchId: "99999999-9999-4999-8999-999999999999" }, crossBranchAuthorized: false }];
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    assignments[0] = { project: { branchId: "99999999-9999-4999-8999-999999999999" }, crossBranchAuthorized: true };
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(true);
  });

  it("rejects missing project.view and mismatched or absent audit evidence", async () => {
    authorization.assertPermission.mockImplementation(async () => { throw new ForbiddenException("Permission denied"); });
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    authorization.assertPermission.mockImplementation(async () => undefined);
    audit = { reason: "A different reason", after: { status: "ON_HOLD" } };
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    audit = { reason, after: { status: "ACTIVE" } };
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    event.payload = {};
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
  });

  it("denies unrecognized events while allowing active Owner-wide operational access", async () => {
    event.eventName = "task.completed";
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(false);
    expect(prisma.account.findUnique).not.toHaveBeenCalled();
    event.eventName = "project.on_hold";
    account = { id: accountId, kind: AccountKind.OWNER, state: AccountState.ACTIVE, employee: null };
    await expect(predicate.isAuthorized(eventId, accountId)).resolves.toBe(true);
  });
});

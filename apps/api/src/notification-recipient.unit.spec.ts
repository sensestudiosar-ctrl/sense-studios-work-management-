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

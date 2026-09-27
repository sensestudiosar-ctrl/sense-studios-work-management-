import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { AccountKind, AccountState, EmployeeState, OrganizationEventType } from "./generated/prisma/client.js";
import { OrganizationService } from "./organization.service.js";

function serviceHarness(overrides: Record<string, unknown> = {}) {
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    account: { findUnique: jest.fn().mockResolvedValue({ id: "account-1", kind: AccountKind.STAFF, state: AccountState.ACTIVE }) },
    branch: { findFirst: jest.fn().mockResolvedValue({ id: "branch-1", organizationId: "org-1", active: true }) },
    team: { findFirst: jest.fn().mockResolvedValue({ id: "team-1", branchId: "branch-1", organizationId: "org-1", active: true }) },
    jobRole: { findMany: jest.fn().mockResolvedValue([{ id: "role-1" }, { id: "role-2" }]) },
    employee: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue({ id: "employee-1", accountId: "account-1", organizationId: "org-1", state: EmployeeState.ACTIVE, homeBranchId: "branch-1", homeTeamId: "team-1", reportsToId: null }),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "employee-1", accountId: "account-1" }),
      update: jest.fn().mockResolvedValue({ id: "employee-1" }),
    },
    employeeMembershipHistory: { findFirst: jest.fn().mockResolvedValue({ effectiveFrom: new Date("2025-01-01T00:00:00.000Z") }), create: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    employeeJobRoleAssignment: { createMany: jest.fn().mockResolvedValue({ count: 2 }), findMany: jest.fn().mockResolvedValue([{ jobRoleId: "role-1" }]), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    employeePermissionOverride: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    organizationEvent: { create: jest.fn().mockResolvedValue({ id: "legacy-event-1", occurredAt: new Date("2025-01-01T00:00:00.000Z") }) },
    auditEvent: { create: jest.fn().mockResolvedValue({ id: "audit-event-1" }) },
    domainEvent: { create: jest.fn().mockResolvedValue({ id: "domain-event-1" }) },
    outboxDelivery: { create: jest.fn().mockResolvedValue({ id: "outbox-1" }) },
  };
  Object.assign(tx, overrides);
  const prisma = Object.assign(tx, { $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) });
  const database = { prisma };
  const identity = { suspendStaffWithinTransaction: jest.fn().mockResolvedValue(2) };
  const authorization = { assertPermission: jest.fn().mockResolvedValue(undefined) };
  const service = new OrganizationService(database as never, identity as never, authorization as never);
  return { service, tx, database, identity, authorization };
}

const hiredAt = new Date("2025-01-01T00:00:00.000Z");
const creationInput = {
  organizationId: "org-1", accountId: "account-1", branchId: "branch-1", teamId: "team-1",
  jobRoleIds: ["role-1", "role-2"], hiredAt, reason: "Initial employment",
};

describe("OrganizationService S03 transaction behavior", () => {
  it("creates an employee only from active Staff identity and same-organization home membership and roles, recording dated history and actor/reason event", async () => {
    const { service, tx, database } = serviceHarness();
    await service.createEmployee("owner-1", creationInput);

    expect(database.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.account.findUnique).toHaveBeenCalledWith({ where: { id: "account-1" } });
    expect(tx.branch.findFirst).toHaveBeenCalledWith({ where: { id: "branch-1", organizationId: "org-1", active: true } });
    expect(tx.team.findFirst).toHaveBeenCalledWith({ where: { id: "team-1", branchId: "branch-1", organizationId: "org-1", active: true } });
    expect(tx.jobRole.findMany).toHaveBeenCalledWith({ where: { id: { in: ["role-1", "role-2"] }, organizationId: "org-1", active: true } });
    expect(tx.employeeMembershipHistory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ employeeId: "employee-1", organizationId: "org-1", branchId: "branch-1", teamId: "team-1", effectiveFrom: hiredAt, recordedById: "owner-1", reason: "Initial employment" }) });
    expect(tx.employeeJobRoleAssignment.createMany).toHaveBeenCalledWith({ data: [
      expect.objectContaining({ employeeId: "employee-1", organizationId: "org-1", jobRoleId: "role-1", effectiveFrom: hiredAt, recordedById: "owner-1", reason: "Initial employment" }),
      expect.objectContaining({ employeeId: "employee-1", organizationId: "org-1", jobRoleId: "role-2", effectiveFrom: hiredAt, recordedById: "owner-1", reason: "Initial employment" }),
    ] });
    expect(tx.organizationEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ organizationId: "org-1", eventType: OrganizationEventType.EMPLOYEE_CREATED, actorId: "owner-1", subjectId: "employee-1", reason: "Initial employment", after: expect.objectContaining({ branchId: "branch-1", teamId: "team-1", jobRoleIds: ["role-1", "role-2"] }) }) });
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      organizationId: "org-1", eventKey: "organization.employee.created", actorId: "owner-1",
      subjectType: "employee", subjectId: "employee-1", reason: "Initial employment",
      legacyOrganizationEventId: "legacy-event-1", retentionExpiresAt: new Date("2035-01-01T00:00:00.000Z")
    }) });
    expect(tx.domainEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      eventName: "organization.employee.created", schemaVersion: 1, subjectType: "employee", subjectId: "employee-1",
      payload: { auditEventId: "audit-event-1", sourceOrganizationEventId: "legacy-event-1" }
    }) });
    expect(tx.outboxDelivery.create).toHaveBeenCalledWith({ data: { eventId: "domain-event-1", consumer: "NTF" } });
  });

  it("rejects non-Staff identities, foreign/missing membership resources, and foreign/missing roles before creating an employee", async () => {
    const nonStaff = serviceHarness();
    nonStaff.tx.account.findUnique.mockResolvedValue({ id: "account-1", kind: AccountKind.OWNER, state: AccountState.ACTIVE });
    await expect(nonStaff.service.createEmployee("owner-1", creationInput)).rejects.toBeInstanceOf(NotFoundException);
    expect(nonStaff.tx.employee.create).not.toHaveBeenCalled();

    const badBranch = serviceHarness();
    badBranch.tx.branch.findFirst.mockResolvedValue(null);
    await expect(badBranch.service.createEmployee("owner-1", creationInput)).rejects.toBeInstanceOf(NotFoundException);
    expect(badBranch.tx.employee.create).not.toHaveBeenCalled();

    const badTeam = serviceHarness();
    badTeam.tx.team.findFirst.mockResolvedValue(null);
    await expect(badTeam.service.createEmployee("owner-1", creationInput)).rejects.toBeInstanceOf(NotFoundException);

    const badRole = serviceHarness();
    badRole.tx.jobRole.findMany.mockResolvedValue([{ id: "role-1" }]);
    await expect(badRole.service.createEmployee("owner-1", creationInput)).rejects.toBeInstanceOf(NotFoundException);
    expect(badRole.tx.employee.create).not.toHaveBeenCalled();
  });

  it("serializes a membership move, closes the current period, and audits the before and after state", async () => {
    const { service, tx } = serviceHarness();
    tx.employee.findFirst.mockResolvedValue({ id: "employee-1", state: EmployeeState.ACTIVE, homeBranchId: "branch-old", homeTeamId: "team-old", reportsToId: "manager-old" });
    tx.branch.findFirst.mockResolvedValue({ id: "branch-2" });
    tx.team.findFirst.mockResolvedValue({ id: "team-2" });
    tx.employee.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === "employee-1"
      ? { id: "employee-1", state: EmployeeState.ACTIVE, homeBranchId: "branch-old", homeTeamId: "team-old", reportsToId: "manager-old" }
      : { id: where.id, homeBranchId: "branch-2", homeTeamId: "team-2", reportsToId: null });

    await service.changeMembership("owner-1", "employee-1", { organizationId: "org-1", branchId: "branch-2", teamId: "team-2", reportsToId: "manager-new", reason: "Team transfer" });

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.employeeMembershipHistory.updateMany).toHaveBeenCalledWith({ where: { employeeId: "employee-1", effectiveTo: null }, data: { effectiveTo: expect.any(Date) } });
    expect(tx.employeeMembershipHistory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ employeeId: "employee-1", organizationId: "org-1", branchId: "branch-2", teamId: "team-2", reportsToId: "manager-new", recordedById: "owner-1", reason: "Team transfer", effectiveFrom: expect.any(Date) }) });
    expect(tx.organizationEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: OrganizationEventType.EMPLOYEE_MEMBERSHIP_CHANGED, actorId: "owner-1", subjectId: "employee-1", reason: "Team transfer", before: { branchId: "branch-old", teamId: "team-old", reportsToId: "manager-old" }, after: { branchId: "branch-2", teamId: "team-2", reportsToId: "manager-new" } }) });
  });

  it("rejects a reporting cycle without closing membership history", async () => {
    const { service, tx } = serviceHarness();
    let managerLookups = 0;
    tx.employee.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "employee-1") return { id: "employee-1", state: EmployeeState.ACTIVE, homeBranchId: "branch-1", homeTeamId: "team-1", reportsToId: null };
      if (where.id === "manager-1" && managerLookups++ === 0) return { id: "manager-1", state: EmployeeState.ACTIVE, homeBranchId: "branch-1", homeTeamId: "team-1" };
      return { reportsToId: "employee-1" };
    });
    await expect(service.changeMembership("owner-1", "employee-1", { organizationId: "org-1", branchId: "branch-1", teamId: "team-1", reportsToId: "manager-1", reason: "Invalid cycle" })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.employeeMembershipHistory.updateMany).not.toHaveBeenCalled();
    expect(tx.organizationEvent.create).not.toHaveBeenCalled();
  });

  it("serializes, dates, and audits job-role reassignment", async () => {
    const { service, tx } = serviceHarness();
    tx.employee.findFirst.mockResolvedValue({ id: "employee-1", state: EmployeeState.ACTIVE });
    tx.employeeJobRoleAssignment.findMany.mockResolvedValue([{ jobRoleId: "role-old" }]);
    tx.jobRole.findMany.mockResolvedValue([{ id: "role-2" }]);
    await service.setEmployeeJobRoles("owner-1", "employee-1", { organizationId: "org-1", jobRoleIds: ["role-2"], reason: "Role change" });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.employeeJobRoleAssignment.updateMany).toHaveBeenCalledWith({ where: { employeeId: "employee-1", effectiveTo: null }, data: { effectiveTo: expect.any(Date) } });
    expect(tx.employeeJobRoleAssignment.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ employeeId: "employee-1", organizationId: "org-1", jobRoleId: "role-2", effectiveFrom: expect.any(Date), recordedById: "owner-1", reason: "Role change" })] });
    expect(tx.organizationEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: OrganizationEventType.EMPLOYEE_JOB_ROLES_CHANGED, actorId: "owner-1", subjectId: "employee-1", reason: "Role change", before: { jobRoleIds: ["role-old"] }, after: { jobRoleIds: ["role-2"] } }) });
  });

  it("suspends staff and revokes session access, employee overrides, and records evidence in one transaction", async () => {
    const { service, tx, identity, database } = serviceHarness();
    tx.employee.findFirst.mockResolvedValue({ id: "employee-1", accountId: "account-1", organizationId: "org-1", state: EmployeeState.ACTIVE });
    const result = await service.suspendEmployee("owner-1", "employee-1", "Access review");
    expect(database.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(identity.suspendStaffWithinTransaction).toHaveBeenCalledWith(tx, "account-1", "owner-1", "Access review");
    expect(tx.employee.update).toHaveBeenCalledWith({ where: { id: "employee-1" }, data: { state: EmployeeState.SUSPENDED, suspendedAt: expect.any(Date) } });
    expect(tx.employeePermissionOverride.updateMany).toHaveBeenCalledWith({ where: { employeeId: "employee-1", revokedAt: null }, data: { revokedAt: expect.any(Date), revokedById: "owner-1", revocationReason: "Access review" } });
    expect(tx.organizationEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ organizationId: "org-1", eventType: OrganizationEventType.EMPLOYEE_SUSPENDED, actorId: "owner-1", subjectId: "employee-1", reason: "Access review", before: { state: EmployeeState.ACTIVE }, after: { state: EmployeeState.SUSPENDED, accountId: "account-1" } }) });
    expect(result).toEqual({ suspended: true });
  });

  it("requires explicit team-scoped read permission before returning managed employees", async () => {
    const { service, tx, authorization } = serviceHarness();
    authorization.assertPermission.mockRejectedValue(new ForbiddenException("Permission denied"));
    await expect(service.listManagedEmployees("team-leader-account")).rejects.toBeInstanceOf(ForbiddenException);
    expect(authorization.assertPermission).toHaveBeenCalledWith("team-leader-account", "org.employee.read", {
      kind: "TEAM", organizationId: "org-1", branchId: "branch-1", teamId: "team-1"
    });
    expect(tx.employee.findMany).not.toHaveBeenCalled();
  });

  it("requires explicit team-scoped manage permission in the reporting-change transaction", async () => {
    const { service, tx, authorization } = serviceHarness();
    authorization.assertPermission.mockRejectedValue(new ForbiddenException("Permission denied"));
    await expect(service.changeManagedEmployeeReporting("team-leader-account", "employee-2", "employee-1", "Change manager")).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(authorization.assertPermission).toHaveBeenCalledWith("team-leader-account", "org.employee.manage", {
      kind: "TEAM", organizationId: "org-1", branchId: "branch-1", teamId: "team-1"
    }, tx);
    expect(tx.employeeMembershipHistory.updateMany).not.toHaveBeenCalled();
  });

  it("rejects duplicate role IDs and future employee start dates", async () => {
    const { service, database } = serviceHarness();
    await expect(service.createEmployee("owner-1", { ...creationInput, hiredAt: new Date(Date.now() + 60_000) })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createEmployee("owner-1", { ...creationInput, jobRoleIds: ["role-1", "role-1"] })).rejects.toBeInstanceOf(BadRequestException);
    expect(database.prisma.$transaction).not.toHaveBeenCalled();
  });
});

import { ForbiddenException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { OrganizationService } from "./organization.service.js";

function harness() {
  const db = {
    account: { findUnique: jest.fn<(query: unknown) => Promise<unknown>>().mockResolvedValue({ kind: "STAFF", state: "ACTIVE", employee: { id: "self", state: "ACTIVE" } }) },
    employee: {
      findFirst: jest.fn().mockResolvedValue({ id: "self", organizationId: "org", homeBranchId: "branch", homeTeamId: "team", account: { normalizedEmail: "self@example.test" } }),
      findMany: jest.fn().mockResolvedValue([
        { id: "self", reportsToId: null, account: { normalizedEmail: "self@example.test" } },
        { id: "report", reportsToId: "self", account: { normalizedEmail: "report@example.test" } },
        { id: "peer", reportsToId: null, account: { normalizedEmail: "peer@example.test" } },
      ])
    }
  };
  const authorization = { assertPermission: jest.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined), evaluatePermissions: jest.fn<(...args: unknown[]) => Promise<boolean[]>>().mockResolvedValue([false]) };
  const service = new OrganizationService({ prisma: db } as never, {} as never, authorization as never, {} as never, {} as never, {} as never);
  return { service, db, authorization };
}

describe("People self and scoped team projections", () => {
  it("reads only the session account's employee and selects no permissions or credential material", async () => {
    const { service, db } = harness();
    expect(await service.myEmployeeProfile("session-account")).toEqual({ employee: { id: "self", state: "ACTIVE" } });
    expect(db.account.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "session-account" } }));
    const query = db.account.findUnique.mock.calls[0]![0] as { select: Record<string, unknown> };
    expect(Object.keys(query.select).sort()).toEqual(["employee", "kind", "state"]);
    const selected = JSON.stringify(query);
    expect(selected).not.toMatch(/passkey|permission|recovery|csrf|sessions/i);
    expect(selected).toContain('"effectiveTo":null');
  });

  it.each([
    null,
    { kind: "STAFF", state: "SUSPENDED", employee: null },
    { kind: "STAFF", state: "ACTIVE", employee: { state: "EXITED" } },
    { kind: "CLIENT", state: "ACTIVE", employee: null },
    { kind: "EXTERNAL", state: "ACTIVE", employee: null },
  ])("denies inactive or noninternal self reads: %j", async account => {
    const { service, db } = harness(); db.account.findUnique.mockResolvedValue(account);
    await expect(service.myEmployeeProfile("session-account")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each(["OWNER", "STAFF"])("represents an active %s account without an employee honestly", async kind => {
    const { service, db } = harness(); db.account.findUnique.mockResolvedValue({ kind, state: "ACTIVE", employee: null });
    expect(await service.myEmployeeProfile("session-account")).toEqual({ employee: null });
  });

  it.each([false, true])("derives reporting edit capability independently of read scope: %s", async allowed => {
    const { service, db, authorization } = harness(); authorization.evaluatePermissions.mockResolvedValue([allowed]);
    const result = await service.listManagedEmployees("session-account");
    expect(result.employees.map(employee => employee.id)).toEqual(["report"]);
    expect(result.capabilities).toEqual({ canManageReporting: allowed });
    expect(db.employee.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", homeBranchId: "branch", homeTeamId: "team", state: "ACTIVE" } }));
    expect(authorization.assertPermission).toHaveBeenCalledWith("session-account", "org.employee.read", expect.objectContaining({ kind: "TEAM", branchId: "branch", teamId: "team" }));
    expect(authorization.evaluatePermissions).toHaveBeenCalledWith("session-account", [{ permissionKey: "org.employee.manage", scope: { kind: "TEAM", organizationId: "org", branchId: "branch", teamId: "team" } }]);
  });

  it("does not query employees after the current read grant is denied", async () => {
    const { service, db, authorization } = harness(); authorization.assertPermission.mockRejectedValue(new ForbiddenException());
    await expect(service.listManagedEmployees("session-account")).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.employee.findMany).not.toHaveBeenCalled();
  });
});

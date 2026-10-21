import { jest } from "@jest/globals";
import { ForbiddenException } from "@nestjs/common";
import { AccountKind, AccountState, EmployeeState } from "./generated/prisma/client.js";
import { TaskService } from "./task.service.js";

function serviceHarness(actorKind: AccountKind, rolePresentations: Array<string | null> = []) {
  const employee = actorKind === AccountKind.STAFF
    ? { id: "employee-1", organizationId: "org-1", state: EmployeeState.ACTIVE, homeBranchId: "branch-1", homeTeamId: "team-1", reportsToId: null }
    : null;
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: "account-1" }]),
    account: { findUnique: jest.fn().mockResolvedValue({ id: "account-1", kind: actorKind, state: AccountState.ACTIVE, employee }) },
    employee: {
      findUnique: jest.fn().mockResolvedValue(employee),
      findMany: jest.fn().mockResolvedValue([])
    },
    projectAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    project: { findMany: jest.fn().mockResolvedValue([]) },
    employeeJobRoleAssignment: { findMany: jest.fn().mockResolvedValue(rolePresentations.map((creationPresentation) => ({ jobRole: { creationPresentation } }))) },
    projectPlanItem: { findMany: jest.fn().mockResolvedValue([]) }
  };
  const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
  const approvals = { registerHandler: jest.fn() };
  const service = new TaskService({ prisma } as never, { assertPermission: jest.fn().mockRejectedValue(new ForbiddenException("Permission denied")) } as never, approvals as never);
  const actor = { accountId: "account-1", kind: actorKind, organizationId: "org-1" };
  return { service, tx, actor };
}

describe("TaskService.setup creation profile", () => {
  it("resolves only the employee's active same-organization assignments and leaves assignment authority unchanged", async () => {
    const { service, tx, actor } = serviceHarness(AccountKind.STAFF, ["SITE"]);
    const setup = await service.setup(actor);

    expect(tx.employeeJobRoleAssignment.findMany).toHaveBeenCalledWith({
      where: { employeeId: "employee-1", organizationId: "org-1", effectiveTo: null, jobRole: { active: true } },
      select: { jobRole: { select: { creationPresentation: true } } }
    });
    expect(setup.creationProfile).toEqual({ version: 1, variant: "SITE", resolution: "CONFIGURED_ROLE" });
    expect(setup.canAssign).toBe(false);
  });

  it("resolves Owner from the canonical account kind without loading employee role assignments", async () => {
    const { service, tx, actor } = serviceHarness(AccountKind.OWNER, ["SITE"]);
    const setup = await service.setup(actor);

    expect(setup.creationProfile).toEqual({ version: 1, variant: "OWNER", resolution: "ACCOUNT_KIND" });
    expect(tx.employeeJobRoleAssignment.findMany).not.toHaveBeenCalled();
  });
});

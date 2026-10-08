import { hasPermission, type AuthorizationContext, type AuthorizationScope } from "./authorization.js";
import { AuthorizationService } from "./authorization.service.js";
import type { DatabaseService } from "./database.service.js";
import { jest } from "@jest/globals";

const self: AuthorizationScope = {
  kind: "SELF", organizationId: "org-1", branchId: "branch-1", teamId: "team-1", employeeId: "emp-1",
};
const team: AuthorizationScope = { kind: "TEAM", organizationId: "org-1", branchId: "branch-1", teamId: "team-1" };
const branch: AuthorizationScope = { kind: "BRANCH", organizationId: "org-1", branchId: "branch-1" };
const org: AuthorizationScope = { kind: "ORGANIZATION", organizationId: "org-1" };

function context(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    owner: false,
    organizationId: "org-1",
    employee: { id: "emp-1", organizationId: "org-1", branchId: "branch-1", teamId: "team-1", jobRoleIds: ["role-1"], state: "ACTIVE" },
    rolePermissionRules: [],
    employeeOverrides: [],
    ...overrides,
  };
}

describe("hasPermission", () => {
  it("defaults to deny, including missing and inactive employees", () => {
    expect(hasPermission(context(), "task.view", self)).toBe(false);
    expect(hasPermission(context({ employee: null }), "task.view", self)).toBe(false);
    expect(hasPermission(context({ employee: { ...context().employee!, state: "SUSPENDED" } }), "task.view", self)).toBe(false);
  });

  it("gives Owner organization authority, while rejecting foreign organizations", () => {
    expect(hasPermission(context({ owner: true }), "anything.manage", org)).toBe(true);
    expect(hasPermission(context({ owner: true }), "anything.manage", { ...org, organizationId: "org-2" })).toBe(false);
  });

  it("applies dynamic role grants by scope and scope inheritance", () => {
    const c = context({ rolePermissionRules: [
      { permissionKey: "work.read", scopeKind: "ORGANIZATION" },
      { permissionKey: "team.manage", scopeKind: "BRANCH", branchId: "branch-1" },
      { permissionKey: "team.review", scopeKind: "TEAM", teamId: "team-1" },
      { permissionKey: "profile.read", scopeKind: "SELF" },
    ] });
    expect(hasPermission(c, "work.read", self)).toBe(true);
    expect(hasPermission(c, "team.manage", team)).toBe(true);
    expect(hasPermission(c, "team.manage", self)).toBe(true);
    expect(hasPermission(c, "team.review", self)).toBe(true);
    expect(hasPermission(c, "team.review", branch)).toBe(false);
    expect(hasPermission(c, "profile.read", self)).toBe(true);
    expect(hasPermission(c, "profile.read", team)).toBe(false);
  });

  it("applies explicit allow and deny overrides, with deny taking precedence", () => {
    const c = context({
      rolePermissionRules: [{ permissionKey: "task.assign", scopeKind: "ORGANIZATION" }],
      employeeOverrides: [
        { permissionKey: "task.assign", effect: "ALLOW", scopeKind: "SELF" },
        { permissionKey: "task.assign", effect: "DENY", scopeKind: "TEAM", teamId: "team-1" },
      ],
    });
    expect(hasPermission(c, "task.assign", self)).toBe(false);
    expect(hasPermission(c, "task.assign", org)).toBe(true);
  });

  it("ignores expired overrides", () => {
    const c = context({ employeeOverrides: [
      { permissionKey: "task.read", effect: "DENY", scopeKind: "SELF", expiresAt: new Date("2026-01-01T00:00:00Z") },
      { permissionKey: "task.read", effect: "ALLOW", scopeKind: "SELF", expiresAt: new Date("2027-01-01T00:00:00Z") },
    ] });
    expect(hasPermission(c, "task.read", self, new Date("2026-09-26T00:00:00Z"))).toBe(true);
  });

  it("denies foreign org, branch, and team scopes", () => {
    const c = context({ rolePermissionRules: [
      { permissionKey: "org.x", scopeKind: "ORGANIZATION" },
      { permissionKey: "x", scopeKind: "TEAM", teamId: "team-1" },
      { permissionKey: "branch.x", scopeKind: "BRANCH", branchId: "branch-1" },
    ] });
    expect(hasPermission(c, "org.x", { ...self, organizationId: "org-2" })).toBe(false);
    expect(hasPermission(c, "branch.x", { ...team, branchId: "branch-2" })).toBe(false);
    expect(hasPermission(c, "x", { ...team, teamId: "team-2" })).toBe(false);
    expect(hasPermission(c, "x", { ...self, employeeId: "emp-2" })).toBe(false);
  });

  it("does not use job-role labels or titles to infer permissions", () => {
    const c = context({ employee: { ...context().employee!, jobRoleIds: ["Owner / Team Leader / Admin"] } });
    expect(hasPermission(c, "employee.manage", org)).toBe(false);
  });
});

describe("AuthorizationService batch evaluation", () => {
  const scope = (branchId: string, organizationId = "org-1"): AuthorizationScope => ({ kind: "BRANCH", organizationId, branchId });

  it("loads one current graph for an ordered capability matrix and observes later revocation", async () => {
    const row = {
      id: "account-1", kind: "STAFF", state: "ACTIVE",
      employee: {
        id: "employee-1", organizationId: "org-1", homeBranchId: "branch-1", homeTeamId: "team-1", state: "ACTIVE",
        jobRoleAssignments: [{ jobRoleId: "role-1", jobRole: { permissions: [
          { permissionKey: "lead.view", scopeKind: "BRANCH", branchId: "branch-1", teamId: null },
          { permissionKey: "lead.create", scopeKind: "BRANCH", branchId: "branch-1", teamId: null },
          { permissionKey: "lead.edit", scopeKind: "BRANCH", branchId: "branch-1", teamId: null },
          { permissionKey: "lead.activity_create", scopeKind: "BRANCH", branchId: "branch-1", teamId: null },
          { permissionKey: "lead.stage_change", scopeKind: "BRANCH", branchId: "branch-1", teamId: null },
        ] } }],
        permissionOverrides: [
          { permissionKey: "lead.edit", effect: "DENY", scopeKind: "BRANCH", branchId: "branch-1", teamId: null, expiresAt: null },
          { permissionKey: "lead.view", effect: "ALLOW", scopeKind: "BRANCH", branchId: "branch-1", teamId: null, expiresAt: new Date("2026-10-06T00:00:00Z") },
          { permissionKey: "lead.create", effect: "ALLOW", scopeKind: "BRANCH", branchId: "branch-1", teamId: null, expiresAt: null },
        ]
      }
    };
    const findUnique = jest.fn().mockImplementation(async () => row);
    const findFirst = jest.fn().mockResolvedValue({ id: "org-1" });
    const service = new AuthorizationService({ prisma: { account: { findUnique }, organization: { findFirst } } } as unknown as DatabaseService);
    const checks = ["lead.view", "lead.create", "lead.edit", "lead.activity_create", "lead.stage_change", "lead.view", "lead.view", "lead.view"]
      .map((permissionKey) => ({ permissionKey, scope: scope("branch-1") }));
    checks[5] = { permissionKey: "lead.view", scope: scope("branch-2") };
    checks[6] = { permissionKey: "lead.view", scope: scope("branch-1", "org-2") };
    checks[7] = { permissionKey: "lead.view", scope: { kind: "BRANCH", organizationId: "org-1" } };

    await expect(service.evaluatePermissions("account-1", checks)).resolves.toEqual([true, true, false, true, true, false, false, false]);
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(findUnique.mock.calls[0]?.[0]).toMatchObject({ include: { employee: { include: {
      jobRoleAssignments: { where: { effectiveTo: null, jobRole: { active: true } } },
      permissionOverrides: { where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] } },
    } } } });

    row.employee.jobRoleAssignments[0]!.jobRole.permissions = [];
    await expect(service.evaluatePermissions("account-1", checks)).resolves.toEqual([false, true, false, false, false, false, false, false]);
    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it("denies inactive identities and preserves Owner organization boundaries", async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: "owner", kind: "OWNER", state: "ACTIVE", employee: null });
    const findFirst = jest.fn().mockResolvedValue({ id: "org-1" });
    const service = new AuthorizationService({ prisma: { account: { findUnique }, organization: { findFirst } } } as unknown as DatabaseService);
    await expect(service.evaluatePermissions("owner", [
      { permissionKey: "anything", scope: { kind: "ORGANIZATION", organizationId: "org-1" } },
      { permissionKey: "anything", scope: { kind: "ORGANIZATION", organizationId: "org-2" } },
    ])).resolves.toEqual([true, false]);
    findUnique.mockResolvedValueOnce({ id: "inactive", kind: "STAFF", state: "DISABLED", employee: null });
    await expect(service.evaluatePermissions("inactive", [{ permissionKey: "anything", scope: org }])).resolves.toEqual([false]);
    findUnique.mockResolvedValueOnce({ id: "suspended", kind: "STAFF", state: "ACTIVE", employee: {
      id: "employee-1", organizationId: "org-1", homeBranchId: "branch-1", homeTeamId: "team-1", state: "SUSPENDED",
      jobRoleAssignments: [{ jobRoleId: "role-1", jobRole: { permissions: [{ permissionKey: "anything", scopeKind: "ORGANIZATION" }] } }], permissionOverrides: [],
    } });
    await expect(service.evaluatePermissions("suspended", [{ permissionKey: "anything", scope: org }])).resolves.toEqual([false]);
  });

  it("uses the supplied transaction, denies missing or unscoped identities, and propagates database errors", async () => {
    const checks = [{ permissionKey: "anything", scope: org }];
    const transactionError = new Error("database unavailable");
    const tx = {
      account: { findUnique: jest.fn().mockResolvedValue(null) },
      organization: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const fallback = {
      account: { findUnique: jest.fn().mockRejectedValue(new Error("unexpected fallback client use")) },
      organization: { findFirst: jest.fn() },
    };
    const service = new AuthorizationService({ prisma: fallback } as unknown as DatabaseService);

    await expect(service.evaluatePermissions("missing", checks, tx as never)).resolves.toEqual([false]);
    expect(tx.account.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.organization.findFirst).not.toHaveBeenCalled();
    expect(fallback.account.findUnique).not.toHaveBeenCalled();

    tx.account.findUnique.mockResolvedValueOnce({ id: "unscoped", kind: "STAFF", state: "ACTIVE", employee: null });
    await expect(service.evaluatePermissions("unscoped", checks, tx as never)).resolves.toEqual([false]);
    expect(tx.organization.findFirst).toHaveBeenCalledTimes(1);

    tx.account.findUnique.mockRejectedValueOnce(transactionError);
    await expect(service.evaluatePermissions("db-error", checks, tx as never)).rejects.toBe(transactionError);
  });
});

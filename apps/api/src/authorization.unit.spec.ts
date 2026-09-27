import { hasPermission, type AuthorizationContext, type AuthorizationScope } from "./authorization.js";

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

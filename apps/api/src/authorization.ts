/** Pure authorization evaluation. Permission keys are explicit; job-role names/titles are never consulted. */
export type ScopeKind = "ORGANIZATION" | "BRANCH" | "TEAM" | "SELF";

export interface AuthorizationScope {
  kind: ScopeKind;
  organizationId: string;
  branchId?: string;
  teamId?: string;
  employeeId?: string;
}

export interface ScopedPermissionRule {
  permissionKey: string;
  scopeKind: ScopeKind;
  branchId?: string;
  teamId?: string;
}

export interface EmployeePermissionOverride extends ScopedPermissionRule {
  effect: "ALLOW" | "DENY";
  expiresAt?: Date | null;
}

export interface AuthorizationContext {
  owner: boolean;
  organizationId: string;
  employee?: {
    id: string;
    organizationId: string;
    branchId: string;
    teamId: string;
    jobRoleIds: readonly string[];
    state: string;
  } | null;
  rolePermissionRules: readonly ScopedPermissionRule[];
  employeeOverrides: readonly EmployeePermissionOverride[];
}

function containsScope(
  grant: Pick<ScopedPermissionRule, "scopeKind" | "branchId" | "teamId">,
  requested: AuthorizationScope,
  employee: NonNullable<AuthorizationContext["employee"]>,
): boolean {
  if (requested.organizationId !== employee.organizationId) return false;
  if ((requested.kind === "TEAM" || requested.kind === "SELF") && requested.branchId !== employee.branchId) return false;
  if (requested.kind === "SELF" && requested.teamId !== employee.teamId) return false;
  switch (grant.scopeKind) {
    case "ORGANIZATION":
      return true;
    case "BRANCH":
      return Boolean(grant.branchId && employee.branchId === grant.branchId && requested.branchId === grant.branchId &&
        (requested.kind === "BRANCH" || requested.kind === "TEAM" ||
          (requested.kind === "SELF" && requested.employeeId === employee.id)));
    case "TEAM":
      return Boolean(grant.teamId && employee.teamId === grant.teamId && requested.teamId === grant.teamId &&
        (requested.kind === "TEAM" || (requested.kind === "SELF" && requested.employeeId === employee.id)));
    case "SELF":
      return requested.kind === "SELF" && requested.employeeId === employee.id;
  }
}

/** Default deny; matching employee DENY overrides take precedence over all grants. */
export function hasPermission(
  context: AuthorizationContext,
  permissionKey: string,
  requestedScope: AuthorizationScope,
  now: Date = new Date(),
): boolean {
  if (requestedScope.organizationId !== context.organizationId) return false;
  if (context.owner) return true;

  const employee = context.employee;
  if (!employee || employee.state !== "ACTIVE" || employee.organizationId !== context.organizationId) return false;

  const matchingOverrides = context.employeeOverrides.filter((rule) => {
    if (rule.permissionKey !== permissionKey) return false;
    if (rule.expiresAt && rule.expiresAt.getTime() <= now.getTime()) return false;
    return containsScope(rule, requestedScope, employee);
  });
  if (matchingOverrides.some((rule) => rule.effect === "DENY")) return false;
  if (matchingOverrides.some((rule) => rule.effect === "ALLOW")) return true;

  return context.rolePermissionRules.some((rule) => rule.permissionKey === permissionKey &&
    containsScope(rule, requestedScope, employee));
}

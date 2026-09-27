import { ForbiddenException, Injectable } from "@nestjs/common";
import { AccountKind, AccountState, Prisma } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { hasPermission, type AuthorizationScope } from "./authorization.js";

@Injectable()
export class AuthorizationService {
  constructor(private readonly database: DatabaseService) {}

  async assertPermission(accountId: string, permissionKey: string, scope: AuthorizationScope, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.database.prisma;
    const account = await client.account.findUnique({
      where: { id: accountId },
      include: {
        employee: {
          include: {
            homeBranch: true,
            homeTeam: true,
            jobRoleAssignments: { where: { effectiveTo: null, jobRole: { active: true } }, include: { jobRole: { include: { permissions: { where: { revokedAt: null } } } } } },
            permissionOverrides: { where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }
          }
        }
      }
    });
    if (!account || account.state !== AccountState.ACTIVE) throw new ForbiddenException("Permission denied");
    const organization = await client.organization.findFirst({ select: { id: true } });
    const organizationId = account.employee?.organizationId ?? organization?.id;
    if (!organizationId) throw new ForbiddenException("Permission denied");
    const employee = account.employee;
    const allowed = hasPermission({
      owner: account.kind === AccountKind.OWNER,
      organizationId,
      employee: employee ? {
        id: employee.id,
        organizationId: employee.organizationId,
        branchId: employee.homeBranchId,
        teamId: employee.homeTeamId,
        jobRoleIds: employee.jobRoleAssignments.map((assignment) => assignment.jobRoleId),
        state: employee.state
      } : null,
      rolePermissionRules: employee?.jobRoleAssignments.flatMap((assignment) => assignment.jobRole.permissions).map((row) => ({
        permissionKey: row.permissionKey, scopeKind: row.scopeKind,
        ...(row.branchId ? { branchId: row.branchId } : {}), ...(row.teamId ? { teamId: row.teamId } : {})
      })) ?? [],
      employeeOverrides: employee?.permissionOverrides.map((row) => ({
        permissionKey: row.permissionKey, effect: row.effect,
        scopeKind: row.scopeKind, ...(row.branchId ? { branchId: row.branchId } : {}),
        ...(row.teamId ? { teamId: row.teamId } : {}), expiresAt: row.expiresAt
      })) ?? []
    }, permissionKey, scope);
    if (!allowed) throw new ForbiddenException("Permission denied");
  }
}

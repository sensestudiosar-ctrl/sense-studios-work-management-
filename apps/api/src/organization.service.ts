import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountKind, AccountState, EmployeeState, OrganizationEventType, PermissionEffect, PermissionScopeKind, Prisma } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { IdentityService } from "./identity.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { recordOrganizationMutation } from "./organization-events.js";

type PermissionScopeInput = { scopeKind: PermissionScopeKind; branchId?: string; teamId?: string };

@Injectable()
export class OrganizationService {
  constructor(private readonly database: DatabaseService, private readonly identity: IdentityService, private readonly authorization: AuthorizationService) {}

  private get db() {
    return this.database.prisma;
  }

  async getOrganization() {
    return this.db.organization.findFirst({ include: { branches: { where: { active: true }, orderBy: { name: "asc" } } } });
  }

  async createOrganization(actorId: string, name: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.organization.findFirst();
      if (existing) throw new ConflictException("Organization is already configured");
      const row = await tx.organization.create({ data: { name } });
      await recordOrganizationMutation(tx, {
        organizationId: row.id, eventType: OrganizationEventType.ORGANIZATION_CREATED,
        actorId, subjectId: row.id, reason, after: { id: row.id, name: row.name }
      });
      return row;
    });
  }

  async listBranches(organizationId: string) {
    return this.db.branch.findMany({ where: { organizationId, active: true }, orderBy: { name: "asc" } });
  }

  async createBranch(actorId: string, organizationId: string, name: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      const row = await tx.branch.create({ data: { organizationId, name } });
      await recordOrganizationMutation(tx, {
        organizationId, eventType: OrganizationEventType.BRANCH_CREATED, actorId, subjectId: row.id,
        reason, after: { id: row.id, name: row.name, active: row.active }
      });
      return row;
    });
  }

  async listTeams(organizationId: string, branchId?: string) {
    return this.db.team.findMany({ where: { organizationId, active: true, ...(branchId ? { branchId } : {}) }, orderBy: { name: "asc" } });
  }

  async createTeam(actorId: string, organizationId: string, branchId: string, name: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      const branch = await tx.branch.findFirst({ where: { id: branchId, organizationId, active: true } });
      if (!branch) throw new NotFoundException("Branch not found");
      const row = await tx.team.create({ data: { organizationId, branchId, name } });
      await recordOrganizationMutation(tx, {
        organizationId, eventType: OrganizationEventType.TEAM_CREATED, actorId, subjectId: row.id,
        reason, after: { id: row.id, branchId, name: row.name, active: row.active }
      });
      return row;
    });
  }

  async listJobRoles(organizationId: string) {
    return this.db.jobRole.findMany({ where: { organizationId, active: true }, include: { permissions: { where: { revokedAt: null } } }, orderBy: { name: "asc" } });
  }

  async createJobRole(actorId: string, organizationId: string, name: string, reason: string, description?: string) {
    return this.db.$transaction(async (tx) => {
      const row = await tx.jobRole.create({ data: { organizationId, name, ...(description ? { description } : {}) } });
      await recordOrganizationMutation(tx, {
        organizationId, eventType: OrganizationEventType.JOB_ROLE_CREATED, actorId, subjectId: row.id,
        reason, after: { id: row.id, name: row.name, description: row.description }
      });
      return row;
    });
  }

  async listEmployees(organizationId: string) {
    return this.db.employee.findMany({
      where: { organizationId, state: { not: EmployeeState.EXITED } },
      include: {
        account: { select: { id: true, normalizedEmail: true, state: true } },
        homeBranch: { select: { id: true, name: true } },
        homeTeam: { select: { id: true, name: true } },
        jobRoleAssignments: { where: { effectiveTo: null }, include: { jobRole: { select: { id: true, name: true } } } },
        permissionOverrides: { where: { revokedAt: null }, orderBy: { createdAt: "desc" } },
        reportsTo: { select: { id: true, account: { select: { normalizedEmail: true } } } }
      },
      orderBy: [{ homeBranch: { name: "asc" } }, { homeTeam: { name: "asc" } }, { createdAt: "asc" }]
    });
  }

  async createEmployee(actorId: string, input: {
    organizationId: string; accountId: string; branchId: string; teamId: string; jobRoleIds?: string[];
    reportsToId?: string; employeeCode?: string; hiredAt: Date; reason: string;
  }) {
    if (input.hiredAt.getTime() > Date.now()) throw new BadRequestException("Employee start date cannot be in the future");
    const requestedRoleIds = input.jobRoleIds ?? [];
    if (new Set(requestedRoleIds).size !== requestedRoleIds.length) throw new BadRequestException("Duplicate job role assignment");
    return this.db.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: input.accountId } });
      if (!account || account.kind !== AccountKind.STAFF || account.state !== AccountState.ACTIVE) {
        throw new NotFoundException("Active staff identity not found");
      }
      const [branch, team, roles, manager] = await Promise.all([
        tx.branch.findFirst({ where: { id: input.branchId, organizationId: input.organizationId, active: true } }),
        tx.team.findFirst({ where: { id: input.teamId, branchId: input.branchId, organizationId: input.organizationId, active: true } }),
        requestedRoleIds.length ? tx.jobRole.findMany({ where: { id: { in: requestedRoleIds }, organizationId: input.organizationId, active: true } }) : Promise.resolve([]),
        input.reportsToId ? tx.employee.findFirst({ where: { id: input.reportsToId, organizationId: input.organizationId, state: EmployeeState.ACTIVE } }) : Promise.resolve(null)
      ]);
      if (!branch || !team) throw new NotFoundException("Branch or team not found");
      if (roles.length !== requestedRoleIds.length) throw new NotFoundException("Job role not found");
      if (input.reportsToId && !manager) throw new NotFoundException("Reporting manager not found");
      if (manager && (manager.homeBranchId !== branch.id || manager.homeTeamId !== team.id)) {
        throw new BadRequestException("Reporting manager must belong to the employee’s home team");
      }
      if (await tx.employee.findUnique({ where: { accountId: account.id } })) throw new ConflictException("Staff identity already has an employee record");
      const row = await tx.employee.create({ data: {
        organizationId: input.organizationId, accountId: account.id, homeBranchId: branch.id, homeTeamId: team.id,
        ...(manager ? { reportsToId: manager.id } : {}),
        ...(input.employeeCode ? { employeeCode: input.employeeCode } : {}), hiredAt: input.hiredAt
      } });
      await tx.employeeMembershipHistory.create({ data: {
        employeeId: row.id, organizationId: input.organizationId, branchId: branch.id, teamId: team.id,
        ...(manager ? { reportsToId: manager.id } : {}),
        effectiveFrom: input.hiredAt, recordedById: actorId, reason: input.reason
      } });
      if (roles.length) await tx.employeeJobRoleAssignment.createMany({ data: roles.map((role) => ({
        employeeId: row.id, organizationId: input.organizationId, jobRoleId: role.id,
        effectiveFrom: input.hiredAt, recordedById: actorId, reason: input.reason
      })) });
      await recordOrganizationMutation(tx, {
        organizationId: input.organizationId, eventType: OrganizationEventType.EMPLOYEE_CREATED,
        actorId, subjectId: row.id, reason: input.reason,
        after: { id: row.id, accountId: row.accountId, branchId: branch.id, teamId: team.id, jobRoleIds: roles.map((role) => role.id), reportsToId: manager?.id ?? null }
      });
      return row;
    });
  }

  async changeMembership(actorId: string, employeeId: string, input: {
    organizationId: string; branchId: string; teamId: string;
    reportsToId?: string | null; reason: string;
  }) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(2603)`;
      const employee = await tx.employee.findFirst({ where: { id: employeeId, organizationId: input.organizationId, state: EmployeeState.ACTIVE } });
      if (!employee) throw new NotFoundException("Active employee not found");
      const nextManagerId = input.reportsToId === undefined ? employee.reportsToId : input.reportsToId;
      const [branch, team, manager] = await Promise.all([
        tx.branch.findFirst({ where: { id: input.branchId, organizationId: input.organizationId, active: true } }),
        tx.team.findFirst({ where: { id: input.teamId, branchId: input.branchId, organizationId: input.organizationId, active: true } }),
        nextManagerId ? tx.employee.findFirst({ where: { id: nextManagerId, organizationId: input.organizationId, state: EmployeeState.ACTIVE } }) : Promise.resolve(null)
      ]);
      if (!branch || !team) throw new NotFoundException("Branch or team not found");
      if (nextManagerId && (!manager || manager.id === employee.id)) throw new NotFoundException("Reporting manager not found");
      if (manager && (manager.homeBranchId !== branch.id || manager.homeTeamId !== team.id)) {
        throw new BadRequestException("Reporting manager must belong to the employee’s home team");
      }
      if (nextManagerId && await this.reportingCycle(tx, employee.id, manager!.id, input.organizationId)) throw new ConflictException("Reporting relationship would create a cycle");
      if (employee.homeBranchId !== branch.id || employee.homeTeamId !== team.id) {
        const directReports = await tx.employee.findMany({ where: { reportsToId: employeeId }, select: { id: true }, take: 1 });
        if (directReports.length) throw new ConflictException("Move or reassign direct reports before transferring this employee");
      }
      const currentMembership = await tx.employeeMembershipHistory.findFirst({ where: { employeeId, effectiveTo: null }, select: { effectiveFrom: true } });
      if (!currentMembership) throw new ConflictException("Current employee membership history is inconsistent");
      const now = new Date(Math.max(Date.now(), currentMembership.effectiveFrom.getTime() + 1));
      const before = { branchId: employee.homeBranchId, teamId: employee.homeTeamId, reportsToId: employee.reportsToId };
      const currentHistory = await tx.employeeMembershipHistory.updateMany({
        where: { employeeId, effectiveTo: null }, data: { effectiveTo: now }
      });
      if (currentHistory.count !== 1) throw new ConflictException("Current employee membership history is inconsistent");
      const updated = await tx.employee.update({ where: { id: employeeId }, data: {
        homeBranchId: branch.id, homeTeamId: team.id, reportsToId: manager?.id ?? null
      } });
      await tx.employeeMembershipHistory.create({ data: {
        employeeId, organizationId: input.organizationId, branchId: branch.id, teamId: team.id,
        ...(manager ? { reportsToId: manager.id } : {}),
        effectiveFrom: now, recordedById: actorId, reason: input.reason
      } });
      await recordOrganizationMutation(tx, {
        organizationId: input.organizationId, eventType: OrganizationEventType.EMPLOYEE_MEMBERSHIP_CHANGED,
        actorId, subjectId: employeeId, reason: input.reason, before,
        after: { branchId: branch.id, teamId: team.id, reportsToId: manager?.id ?? null }
      });
      return updated;
    });
  }

  async setEmployeeJobRoles(actorId: string, employeeId: string, input: {
    organizationId: string; jobRoleIds: string[]; reason: string;
  }) {
    const uniqueIds = [...new Set(input.jobRoleIds)];
    if (uniqueIds.length !== input.jobRoleIds.length) throw new BadRequestException("Duplicate job role assignment");
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(2603)`;
      const employee = await tx.employee.findFirst({ where: { id: employeeId, organizationId: input.organizationId, state: EmployeeState.ACTIVE } });
      if (!employee) throw new NotFoundException("Active employee not found");
      const [roles, current] = await Promise.all([
        uniqueIds.length ? tx.jobRole.findMany({ where: { id: { in: uniqueIds }, organizationId: input.organizationId, active: true } }) : Promise.resolve([]),
        tx.employeeJobRoleAssignment.findMany({ where: { employeeId, effectiveTo: null }, select: { jobRoleId: true } })
      ]);
      if (roles.length !== uniqueIds.length) throw new NotFoundException("Job role not found");
      const beforeRoleIds = current.map((row) => row.jobRoleId).sort();
      const afterRoleIds = [...uniqueIds].sort();
      if (beforeRoleIds.length === afterRoleIds.length && beforeRoleIds.every((roleId, index) => roleId === afterRoleIds[index])) return { changed: false };
      const now = new Date();
      if (current.length) {
        await tx.employeeJobRoleAssignment.updateMany({
          where: { employeeId, effectiveTo: null }, data: { effectiveTo: now }
        });
      }
      if (roles.length) await tx.employeeJobRoleAssignment.createMany({ data: roles.map((role) => ({
        employeeId, organizationId: input.organizationId, jobRoleId: role.id,
        effectiveFrom: now, recordedById: actorId, reason: input.reason
      })) });
      await recordOrganizationMutation(tx, {
        organizationId: input.organizationId, eventType: OrganizationEventType.EMPLOYEE_JOB_ROLES_CHANGED,
        actorId, subjectId: employeeId, reason: input.reason,
        before: { jobRoleIds: beforeRoleIds }, after: { jobRoleIds: afterRoleIds }
      });
      return { changed: true, jobRoleIds: afterRoleIds };
    });
  }

  async listManagedEmployees(actorAccountId: string) {
    const actor = await this.db.employee.findFirst({
      where: { accountId: actorAccountId, state: EmployeeState.ACTIVE },
      select: { id: true, organizationId: true, homeBranchId: true, homeTeamId: true, account: { select: { normalizedEmail: true } } }
    });
    if (!actor) throw new NotFoundException("Active employee membership not found");
    await this.authorization.assertPermission(actorAccountId, "org.employee.read", {
      kind: "TEAM", organizationId: actor.organizationId, branchId: actor.homeBranchId, teamId: actor.homeTeamId
    });
    const rows = await this.db.employee.findMany({
      where: { organizationId: actor.organizationId, homeBranchId: actor.homeBranchId, homeTeamId: actor.homeTeamId, state: EmployeeState.ACTIVE },
      select: {
        id: true, reportsToId: true, employeeCode: true, hiredAt: true, createdAt: true,
        account: { select: { normalizedEmail: true } },
        jobRoleAssignments: { where: { effectiveTo: null }, include: { jobRole: { select: { id: true, name: true } } } }
      },
      orderBy: { createdAt: "asc" }
    });
    const managedIds = this.descendantIds(actor.id, rows);
    const employees = rows.filter((row) => managedIds.has(row.id));
    const managerOptions = [{ id: actor.id, email: actor.account.normalizedEmail }, ...employees.map((employee) => ({ id: employee.id, email: employee.account.normalizedEmail }))];
    return { employees, managerOptions };
  }

  async changeManagedEmployeeReporting(actorAccountId: string, employeeId: string, reportsToId: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(2603)`;
      const actor = await tx.employee.findFirst({
        where: { accountId: actorAccountId, state: EmployeeState.ACTIVE },
        select: { id: true, organizationId: true, homeBranchId: true, homeTeamId: true }
      });
      if (!actor) throw new NotFoundException("Active employee membership not found");
      await this.authorization.assertPermission(actorAccountId, "org.employee.manage", {
        kind: "TEAM", organizationId: actor.organizationId, branchId: actor.homeBranchId, teamId: actor.homeTeamId
      }, tx);
      const [target, rows] = await Promise.all([
        tx.employee.findFirst({
          where: { id: employeeId, organizationId: actor.organizationId, homeBranchId: actor.homeBranchId, homeTeamId: actor.homeTeamId, state: EmployeeState.ACTIVE },
          select: { id: true, homeBranchId: true, homeTeamId: true, reportsToId: true }
        }),
        tx.employee.findMany({
          where: { organizationId: actor.organizationId, homeBranchId: actor.homeBranchId, homeTeamId: actor.homeTeamId, state: EmployeeState.ACTIVE },
          select: { id: true, reportsToId: true }
        })
      ]);
      if (!target || target.id === actor.id) throw new NotFoundException("Managed employee not found");
      const managedIds = this.descendantIds(actor.id, rows);
      if (!managedIds.has(target.id)) throw new NotFoundException("Managed employee not found");
      const manager = await tx.employee.findFirst({
        where: { id: reportsToId, organizationId: actor.organizationId, homeBranchId: actor.homeBranchId, homeTeamId: actor.homeTeamId, state: EmployeeState.ACTIVE },
        select: { id: true }
      });
      if (!manager || (manager.id !== actor.id && !managedIds.has(manager.id))) throw new NotFoundException("Reporting manager is outside the managed team");
      if (await this.reportingCycle(tx, target.id, manager.id, actor.organizationId)) throw new ConflictException("Reporting relationship would create a cycle");
      const membership = await tx.employeeMembershipHistory.findFirst({
        where: { employeeId: target.id, effectiveTo: null },
        select: { id: true, effectiveFrom: true, branchId: true, teamId: true }
      });
      if (!membership) throw new ConflictException("Current employee membership history is inconsistent");
      if (target.reportsToId === manager.id) return { changed: false };
      const now = new Date(Math.max(Date.now(), membership.effectiveFrom.getTime() + 1));
      const closed = await tx.employeeMembershipHistory.updateMany({ where: { id: membership.id, effectiveTo: null }, data: { effectiveTo: now } });
      if (closed.count !== 1) throw new ConflictException("Employee membership changed concurrently");
      await tx.employee.update({ where: { id: target.id }, data: { reportsToId: manager.id } });
      await tx.employeeMembershipHistory.create({ data: {
        employeeId: target.id, organizationId: actor.organizationId, branchId: membership.branchId, teamId: membership.teamId,
        reportsToId: manager.id, effectiveFrom: now, recordedById: actorAccountId, reason
      } });
      await recordOrganizationMutation(tx, {
        organizationId: actor.organizationId, eventType: OrganizationEventType.EMPLOYEE_MEMBERSHIP_CHANGED,
        actorId: actorAccountId, subjectId: target.id, reason,
        before: { branchId: membership.branchId, teamId: membership.teamId, reportsToId: target.reportsToId },
        after: { branchId: membership.branchId, teamId: membership.teamId, reportsToId: manager.id }
      });
      return { changed: true, reportsToId: manager.id };
    });
  }

  private descendantIds<T extends { id: string; reportsToId: string | null }>(rootId: string, employees: readonly T[]): Set<string> {
    const descendants = new Set<string>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const employee of employees) {
        if (!descendants.has(employee.id) && (employee.reportsToId === rootId || (employee.reportsToId && descendants.has(employee.reportsToId)))) {
          descendants.add(employee.id);
          changed = true;
        }
      }
    }
    return descendants;
  }

  private async reportingCycle(tx: Prisma.TransactionClient, employeeId: string, proposedManagerId: string, organizationId: string): Promise<boolean> {
    let cursor: string | null = proposedManagerId;
    const seen = new Set<string>();
    while (cursor) {
      if (cursor === employeeId || seen.has(cursor)) return true;
      seen.add(cursor);
      const row: { reportsToId: string | null } | null = await tx.employee.findFirst({
        where: { id: cursor, organizationId }, select: { reportsToId: true }
      });
      cursor = row?.reportsToId ?? null;
    }
    return false;
  }

  private assertScope(scope: PermissionScopeInput) {
    const isOrgOrSelf = scope.scopeKind === PermissionScopeKind.ORGANIZATION || scope.scopeKind === PermissionScopeKind.SELF;
    const isBranch = scope.scopeKind === PermissionScopeKind.BRANCH;
    const isTeam = scope.scopeKind === PermissionScopeKind.TEAM;
    if ((isOrgOrSelf && (scope.branchId || scope.teamId)) || (isBranch && (!scope.branchId || scope.teamId)) || (isTeam && (!scope.branchId || !scope.teamId))) {
      throw new ConflictException("Permission scope does not match its branch or team identifiers");
    }
  }

  async grantRolePermission(actorId: string, roleId: string, input: {
    organizationId: string; permissionKey: string; scope: PermissionScopeInput; reason: string;
  }) {
    this.assertScope(input.scope);
    return this.db.$transaction(async (tx) => {
      const role = await tx.jobRole.findFirst({ where: { id: roleId, organizationId: input.organizationId, active: true } });
      if (!role) throw new NotFoundException("Job role not found");
      if (input.scope.branchId) {
        const branch = await tx.branch.findFirst({ where: { id: input.scope.branchId, organizationId: input.organizationId, active: true } });
        if (!branch) throw new NotFoundException("Branch not found");
      }
      if (input.scope.teamId) {
        const team = await tx.team.findFirst({ where: { id: input.scope.teamId, branchId: input.scope.branchId!, organizationId: input.organizationId, active: true } });
        if (!team) throw new NotFoundException("Team not found");
      }
      const existing = await tx.rolePermission.findFirst({ where: {
        roleId, organizationId: input.organizationId, permissionKey: input.permissionKey,
        scopeKind: input.scope.scopeKind, branchId: input.scope.branchId ?? null,
        teamId: input.scope.teamId ?? null, revokedAt: null
      } });
      if (existing) throw new ConflictException("Permission is already granted for this scope");
      const row = await tx.rolePermission.create({ data: {
        roleId, organizationId: input.organizationId, permissionKey: input.permissionKey,
        scopeKind: input.scope.scopeKind, ...(input.scope.branchId ? { branchId: input.scope.branchId } : {}),
        ...(input.scope.teamId ? { teamId: input.scope.teamId } : {})
      } });
      await recordOrganizationMutation(tx, {
        organizationId: input.organizationId, eventType: OrganizationEventType.ROLE_PERMISSION_CHANGED,
        actorId, subjectId: row.id, reason: input.reason,
        after: { roleId, permissionKey: input.permissionKey, ...input.scope }
      });
      return row;
    });
  }

  async revokeRolePermission(actorId: string, roleId: string, permissionId: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      const row = await tx.rolePermission.findFirst({ where: { id: permissionId, roleId, revokedAt: null } });
      if (!row) throw new NotFoundException("Active role permission not found");
      const result = await tx.rolePermission.updateMany({ where: { id: row.id, revokedAt: null }, data: { revokedAt: new Date(), revokedById: actorId, revocationReason: reason } });
      if (result.count !== 1) throw new ConflictException("Permission changed concurrently");
      await recordOrganizationMutation(tx, {
        organizationId: row.organizationId, eventType: OrganizationEventType.ROLE_PERMISSION_CHANGED,
        actorId, subjectId: row.id, reason,
        before: { roleId: row.roleId, permissionKey: row.permissionKey, scopeKind: row.scopeKind, branchId: row.branchId, teamId: row.teamId },
        after: { revoked: true }
      });
    });
  }

  async grantEmployeeOverride(actorId: string, employeeId: string, input: {
    organizationId: string; permissionKey: string; effect: PermissionEffect; scope: PermissionScopeInput; reason: string; expiresAt?: Date;
  }) {
    this.assertScope(input.scope);
    if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) throw new BadRequestException("Permission expiry must be in the future");
    return this.db.$transaction(async (tx) => {
      const employee = await tx.employee.findFirst({ where: { id: employeeId, organizationId: input.organizationId, state: EmployeeState.ACTIVE } });
      if (!employee) throw new NotFoundException("Active employee not found");
      if (input.scope.branchId) {
        const branch = await tx.branch.findFirst({ where: { id: input.scope.branchId, organizationId: input.organizationId, active: true } });
        if (!branch) throw new NotFoundException("Branch not found");
      }
      if (input.scope.teamId) {
        const team = await tx.team.findFirst({ where: { id: input.scope.teamId, branchId: input.scope.branchId!, organizationId: input.organizationId, active: true } });
        if (!team) throw new NotFoundException("Team not found");
      }
      const row = await tx.employeePermissionOverride.create({ data: {
        employeeId, organizationId: input.organizationId, permissionKey: input.permissionKey, effect: input.effect,
        scopeKind: input.scope.scopeKind, ...(input.scope.branchId ? { branchId: input.scope.branchId } : {}),
        ...(input.scope.teamId ? { teamId: input.scope.teamId } : {}), reason: input.reason,
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {})
      } });
      await recordOrganizationMutation(tx, {
        organizationId: input.organizationId, eventType: OrganizationEventType.EMPLOYEE_PERMISSION_CHANGED,
        actorId, subjectId: row.id, reason: input.reason,
        after: { employeeId, permissionKey: input.permissionKey, effect: input.effect, ...input.scope, expiresAt: input.expiresAt?.toISOString() ?? null }
      });
      return row;
    });
  }

  async revokeEmployeeOverride(actorId: string, employeeId: string, overrideId: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      const row = await tx.employeePermissionOverride.findFirst({ where: { id: overrideId, employeeId, revokedAt: null } });
      if (!row) throw new NotFoundException("Active employee permission override not found");
      const result = await tx.employeePermissionOverride.updateMany({ where: { id: row.id, revokedAt: null }, data: { revokedAt: new Date(), revokedById: actorId, revocationReason: reason } });
      if (result.count !== 1) throw new ConflictException("Permission changed concurrently");
      await recordOrganizationMutation(tx, {
        organizationId: row.organizationId, eventType: OrganizationEventType.EMPLOYEE_PERMISSION_CHANGED,
        actorId, subjectId: row.id, reason,
        before: { employeeId: row.employeeId, permissionKey: row.permissionKey, effect: row.effect, scopeKind: row.scopeKind, branchId: row.branchId, teamId: row.teamId },
        after: { revoked: true }
      });
    });
  }

  async suspendEmployee(actorId: string, employeeId: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      const employee = await tx.employee.findFirst({ where: { id: employeeId, state: EmployeeState.ACTIVE } });
      if (!employee) throw new NotFoundException("Active employee not found");
      await this.identity.suspendStaffWithinTransaction(tx, employee.accountId, actorId, reason);
      const now = new Date();
      await tx.employee.update({ where: { id: employee.id }, data: { state: EmployeeState.SUSPENDED, suspendedAt: now } });
      await tx.employeePermissionOverride.updateMany({
        where: { employeeId, revokedAt: null }, data: { revokedAt: now, revokedById: actorId, revocationReason: reason }
      });
      await recordOrganizationMutation(tx, {
        organizationId: employee.organizationId, eventType: OrganizationEventType.EMPLOYEE_SUSPENDED,
        actorId, subjectId: employee.id, reason,
        before: { state: employee.state }, after: { state: EmployeeState.SUSPENDED, accountId: employee.accountId }
      });
      return { suspended: true };
    });
  }

  async finalizeEmployeeExit(employeeId: string) {
    const employee = await this.db.employee.findFirst({ where: { id: employeeId, state: { not: EmployeeState.EXITED } }, select: { id: true } });
    if (!employee) throw new NotFoundException("Employee not found");
    throw new ConflictException("Employee exit cannot be finalized until active project leads and unfinished tasks are handled by S07 and S09");
  }
}

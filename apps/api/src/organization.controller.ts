import { BadRequestException, Body, Controller, ForbiddenException, Get, Header, Headers, Inject, Param, Post, Put, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { PERMISSION_CATALOGUE, isKnownPermissionKey } from "@sense/contracts";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { OrganizationService } from "./organization.service.js";

const id = z.uuid();
const name = z.string().trim().min(2).max(160);
const reason = z.string().trim().min(10).max(1000);
const organizationBody = z.object({ name, reason }).strict();
const branchBody = z.object({ organizationId: id, name: z.string().trim().min(2).max(120), reason }).strict();
const teamBody = z.object({ organizationId: id, branchId: id, name: z.string().trim().min(2).max(120), reason }).strict();
const roleBody = z.object({ organizationId: id, name: z.string().trim().min(2).max(120), description: z.string().trim().max(1000).optional(), reason }).strict();
const roleCreationPresentation = z.enum(["EMPLOYEE", "LEADER", "SITE"]).nullable();
const roleCreationPresentationBody = z.object({
  organizationId: id,
  creationPresentation: roleCreationPresentation,
  expectedCreationPresentation: roleCreationPresentation,
  reason
}).strict();
const employeeBody = z.object({
  organizationId: id,
  accountId: id,
  branchId: id,
  teamId: id,
  jobRoleIds: z.array(id).max(16).optional(),
  reportsToId: id.optional(),
  employeeCode: z.string().trim().min(1).max(64).optional(),
  hiredAt: z.iso.date(),
  reason
}).strict();
const membershipBody = z.object({
  organizationId: id,
  branchId: id,
  teamId: id,
  reportsToId: id.nullable().optional(),
  reason
}).strict();
const employeeJobRolesBody = z.object({ organizationId: id, jobRoleIds: z.array(id).max(16), reason }).strict();
const rolePermissionBody = z.object({
  organizationId: id,
  permissionKey: z.string().trim().min(3).max(160).refine(isKnownPermissionKey, "Choose a supported permission from the catalogue."),
  scopeKind: z.enum(["ORGANIZATION", "BRANCH", "TEAM", "SELF"]),
  branchId: id.optional(),
  teamId: id.optional(),
  reason
}).strict();
const employeeOverrideBody = rolePermissionBody.extend({ effect: z.enum(["ALLOW", "DENY"]), expiresAt: z.iso.datetime({ offset: true }).optional() });
const reasonOnlyBody = z.object({ reason }).strict();
const reportingBody = z.object({ reportsToId: id, reason }).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Invalid request");
  return result.data;
}

@Controller("org")
export class OrganizationController {
  constructor(
    private readonly identity: IdentityService,
    private readonly organization: OrganizationService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private cookie(request: Request): string | undefined {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const pair = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return pair?.slice(name.length + 1);
  }

  private async owner(request: Request) {
    const active = await this.identity.session(this.cookie(request));
    if (active.row.account.kind !== "OWNER" || !(await this.identity.ownerReady(active.row.accountId))) {
      throw new ForbiddenException("Owner identity setup is required");
    }
    return active;
  }

  private async mutation(request: Request, csrfToken?: string) {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const active = await this.owner(request);
    this.identity.verifyCsrf(active, csrfToken);
    if (active.row.createdAt.getTime() + 5 * 60_000 <= Date.now()) {
      throw new ForbiddenException("Sign in again before changing organization access");
    }
    return active;
  }

  private async staffMutation(request: Request, csrfToken?: string) {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const active = await this.identity.session(this.cookie(request));
    if (active.row.account.kind !== "STAFF") throw new ForbiddenException("Staff access is required");
    this.identity.verifyCsrf(active, csrfToken);
    if (active.row.createdAt.getTime() + 5 * 60_000 <= Date.now()) {
      throw new ForbiddenException("Sign in again before changing employee access");
    }
    return active;
  }

  @Get()
  @Header("Cache-Control", "no-store")
  async getOrganization(@Req() request: Request) {
    await this.owner(request);
    return this.organization.getOrganization();
  }

  @Post()
  async createOrganization(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    const input = parse(organizationBody, body);
    return this.organization.createOrganization(active.row.accountId, input.name, input.reason);
  }

  @Get("branches")
  @Header("Cache-Control", "no-store")
  async listBranches(@Req() request: Request, @Query("organizationId") organizationId?: string) {
    await this.owner(request);
    if (!id.safeParse(organizationId).success) throw new BadRequestException("Invalid organization");
    return this.organization.listBranches(organizationId!);
  }

  @Post("branches")
  async createBranch(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    const input = parse(branchBody, body);
    return this.organization.createBranch(active.row.accountId, input.organizationId, input.name, input.reason);
  }

  @Get("teams")
  @Header("Cache-Control", "no-store")
  async listTeams(@Req() request: Request, @Query("organizationId") organizationId?: string, @Query("branchId") branchId?: string) {
    await this.owner(request);
    if (!id.safeParse(organizationId).success || (branchId && !id.safeParse(branchId).success)) throw new BadRequestException("Invalid organization or branch");
    return this.organization.listTeams(organizationId!, branchId);
  }

  @Put(":id/timezone")
  async changeTimezone(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Param("id") organizationId: string, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    return this.organization.changeTimezone(active.row.accountId, parse(id, organizationId), parse(z.object({ timezone: z.string().trim().min(1).max(80), expectedVersion: z.number().int().min(1), reason }).strict(), body));
  }

  @Put("teams/:id/waiting-alerts")
  async changeWaitingAlerts(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Param("id") teamId: string, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    return this.organization.changeWaitingAlerts(active.row.accountId, parse(id, teamId), parse(z.object({ enabled: z.boolean(), expectedVersion: z.number().int().min(1), reason }).strict(), body));
  }

  @Post("teams")
  async createTeam(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    const input = parse(teamBody, body);
    return this.organization.createTeam(active.row.accountId, input.organizationId, input.branchId, input.name, input.reason);
  }

  @Get("roles")
  @Header("Cache-Control", "no-store")
  async listJobRoles(@Req() request: Request, @Query("organizationId") organizationId?: string) {
    await this.owner(request);
    if (!id.safeParse(organizationId).success) throw new BadRequestException("Invalid organization");
    return this.organization.listJobRoles(organizationId!);
  }

  @Get("permission-catalogue")
  @Header("Cache-Control", "no-store")
  async permissionCatalogue(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.owner(request);
    response.setHeader("Cache-Control", "no-store");
    return { version: 1, groups: PERMISSION_CATALOGUE };
  }

  @Post("roles")
  async createJobRole(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    const input = parse(roleBody, body);
    return this.organization.createJobRole(active.row.accountId, input.organizationId, input.name, input.reason, input.description);
  }

  @Put("roles/:roleId/creation-presentation")
  async setJobRoleCreationPresentation(@Req() request: Request, @Param("roleId") roleId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    if (!id.safeParse(roleId).success) throw new BadRequestException("Invalid job role");
    const input = parse(roleCreationPresentationBody, body);
    return this.organization.setJobRoleCreationPresentation(active.row.accountId, roleId, input);
  }

  @Get("employees")
  @Header("Cache-Control", "no-store")
  async listEmployees(@Req() request: Request, @Query("organizationId") organizationId?: string) {
    await this.owner(request);
    if (!id.safeParse(organizationId).success) throw new BadRequestException("Invalid organization");
    return this.organization.listEmployees(organizationId!);
  }

  @Post("employees")
  async createEmployee(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    const input = parse(employeeBody, body);
    return this.organization.createEmployee(active.row.accountId, {
      organizationId: input.organizationId, accountId: input.accountId, branchId: input.branchId,
      teamId: input.teamId, ...(input.jobRoleIds ? { jobRoleIds: input.jobRoleIds } : {}),
      ...(input.reportsToId ? { reportsToId: input.reportsToId } : {}),
      ...(input.employeeCode ? { employeeCode: input.employeeCode } : {}),
      hiredAt: new Date(`${input.hiredAt}T00:00:00.000Z`), reason: input.reason
    });
  }

  @Put("employees/:id/membership")
  async changeMembership(@Req() request: Request, @Param("id") employeeId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    if (!id.safeParse(employeeId).success) throw new BadRequestException("Invalid employee");
    const input = parse(membershipBody, body);
    return this.organization.changeMembership(active.row.accountId, employeeId, {
      organizationId: input.organizationId, branchId: input.branchId, teamId: input.teamId,
      ...(input.reportsToId !== undefined ? { reportsToId: input.reportsToId } : {}), reason: input.reason
    });
  }

  @Put("employees/:id/job-roles")
  async setEmployeeJobRoles(@Req() request: Request, @Param("id") employeeId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    if (!id.safeParse(employeeId).success) throw new BadRequestException("Invalid employee");
    const input = parse(employeeJobRolesBody, body);
    return this.organization.setEmployeeJobRoles(active.row.accountId, employeeId, input);
  }

  @Post("roles/:roleId/permissions")
  async grantRolePermission(@Req() request: Request, @Param("roleId") roleId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    if (!id.safeParse(roleId).success) throw new BadRequestException("Invalid job role");
    const input = parse(rolePermissionBody, body);
    return this.organization.grantRolePermission(active.row.accountId, roleId, {
      organizationId: input.organizationId, permissionKey: input.permissionKey,
      scope: { scopeKind: input.scopeKind, ...(input.branchId ? { branchId: input.branchId } : {}), ...(input.teamId ? { teamId: input.teamId } : {}) },
      reason: input.reason
    });
  }

  @Put("roles/:roleId/permissions/:permissionId/revoke")
  async revokeRolePermission(@Req() request: Request, @Param("roleId") roleId: string, @Param("permissionId") permissionId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    if (!id.safeParse(roleId).success || !id.safeParse(permissionId).success) throw new BadRequestException("Invalid permission");
    const input = parse(reasonOnlyBody, body);
    await this.organization.revokeRolePermission(active.row.accountId, roleId, permissionId, input.reason);
    return { revoked: true };
  }

  @Post("employees/:id/permissions")
  async grantEmployeeOverride(@Req() request: Request, @Param("id") employeeId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    if (!id.safeParse(employeeId).success) throw new BadRequestException("Invalid employee");
    const input = parse(employeeOverrideBody, body);
    return this.organization.grantEmployeeOverride(active.row.accountId, employeeId, {
      organizationId: input.organizationId, permissionKey: input.permissionKey, effect: input.effect,
      scope: { scopeKind: input.scopeKind, ...(input.branchId ? { branchId: input.branchId } : {}), ...(input.teamId ? { teamId: input.teamId } : {}) },
      reason: input.reason, ...(input.expiresAt ? { expiresAt: new Date(input.expiresAt) } : {})
    });
  }

  @Put("employees/:id/permissions/:overrideId/revoke")
  async revokeEmployeeOverride(@Req() request: Request, @Param("id") employeeId: string, @Param("overrideId") overrideId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    if (!id.safeParse(employeeId).success || !id.safeParse(overrideId).success) throw new BadRequestException("Invalid permission");
    const input = parse(reasonOnlyBody, body);
    await this.organization.revokeEmployeeOverride(active.row.accountId, employeeId, overrideId, input.reason);
    return { revoked: true };
  }

  @Put("employees/:id/suspend")
  async suspendEmployee(@Req() request: Request, @Param("id") employeeId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    if (!id.safeParse(employeeId).success) throw new BadRequestException("Invalid employee");
    const input = parse(reasonOnlyBody, body);
    return this.organization.suspendEmployee(active.row.accountId, employeeId, input.reason);
  }

  @Post("employees/:id/exit")
  async finalizeEmployeeExit(@Req() request: Request, @Param("id") employeeId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    if (!id.safeParse(employeeId).success) throw new BadRequestException("Invalid employee");
    const input = parse(reasonOnlyBody, body);
    return this.organization.finalizeEmployeeExit(active.row.accountId, employeeId, input.reason);
  }

  @Get("team/employees")
  @Header("Cache-Control", "no-store")
  async listManagedEmployees(@Req() request: Request) {
    const active = await this.identity.session(this.cookie(request));
    if (active.row.account.kind !== "STAFF") throw new ForbiddenException("Staff access is required");
    return this.organization.listManagedEmployees(active.row.accountId);
  }

  @Get("self")
  @Header("Cache-Control", "no-store")
  async myEmployeeProfile(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    const active = await this.identity.session(this.cookie(request));
    if (!["OWNER", "STAFF"].includes(active.row.account.kind) || active.row.account.kind === "OWNER" && !await this.identity.ownerReady(active.row.accountId)) {
      throw new ForbiddenException("Current internal identity required");
    }
    return this.organization.myEmployeeProfile(active.row.accountId);
  }

  @Put("team/employees/:id/reporting")
  async changeManagedEmployeeReporting(@Req() request: Request, @Param("id") employeeId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.staffMutation(request, csrfToken);
    if (!id.safeParse(employeeId).success) throw new BadRequestException("Invalid employee");
    const input = parse(reportingBody, body);
    return this.organization.changeManagedEmployeeReporting(active.row.accountId, employeeId, input.reportsToId, input.reason);
  }
}

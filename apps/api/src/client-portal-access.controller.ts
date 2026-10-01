import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { ClientPortalAccessService } from "./client-portal-access.service.js";

const reason = z.string().trim().min(3).max(1000);
const primary = z.object({ email: z.email().max(320), expectedProjectVersion: z.number().int().positive(), expectedPrimaryGrantId: z.uuid().nullable(), expectedPrimaryGrantVersion: z.number().int().positive().optional(), reason }).strict();
const access = z.discriminatedUnion("action", [
  z.object({ action: z.literal("REVOKE"), expectedVersion: z.number().int().positive(), reason }).strict(),
  z.object({ action: z.literal("SET_EXPIRY"), expiresAt: z.iso.datetime(), expectedVersion: z.number().int().positive(), reason }).strict()
]);
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException("Invalid request");
  return result.data;
}

@Controller("client-access")
export class ClientPortalAccessController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly portal: ClientPortalAccessService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}

  private async actor(request: Request, csrf?: string, mutate = false) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const cookie = request.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
    const active = await this.identity.session(cookie?.slice(name.length + 1));
    const actor = await this.projects.actor(active.row.accountId);
    if (actor.kind !== "OWNER" || !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner access is required");
    if (mutate) {
      if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
      this.identity.verifyCsrf(active, csrf);
    }
    return actor;
  }

  @Get("projects/:projectId")
  async list(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("projectId") projectId: string) {
    response.setHeader("Cache-Control", "no-store");
    return this.portal.list(await this.actor(request), parse(z.uuid(), projectId));
  }

  @Post("projects/:projectId/primary")
  async appoint(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("projectId") projectId: string, @Body() body: unknown) {
    response.setHeader("Cache-Control", "no-store");
    return this.portal.setPrimary(await this.actor(request, csrf, true), parse(z.uuid(), projectId), parse(primary, body));
  }

  @Post("grants/:grantId")
  async change(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("grantId") grantId: string, @Body() body: unknown) {
    response.setHeader("Cache-Control", "no-store");
    const actor = await this.actor(request, csrf, true);
    const input = parse(access, body);
    return this.portal.changeAccess(actor, parse(z.uuid(), grantId), { expectedVersion: input.expectedVersion, reason: input.reason, ...(input.action === "REVOKE" ? { revoke: true } : { expiresAt: input.expiresAt }) });
  }
}

import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { TurnkeyService } from "./turnkey.service.js";
import { PublicRoute } from "./auth.guard.js";
import { ClientPortalIdentityService } from "./client-portal-identity.service.js";

const uuid = z.uuid();
const reason = z.string().trim().min(3).max(1000);
const versioned = z.object({ expectedVersion: z.number().int().min(1), reason }).strict();
const decimal = z.string().regex(/^\d{1,12}(?:\.\d{1,4})?$/);
const create = z.object({ revisionIds: z.array(uuid).min(1).max(50), lines: z.array(z.object({ key: z.string().trim().min(1).max(40), description: z.string().trim().min(2).max(500), quantity: decimal, unit: z.string().trim().min(1).max(40) }).strict()).min(1).max(100), prices: z.array(z.object({ key: z.string().trim().min(1).max(40), unitPrice: decimal }).strict()).min(1).max(100), currency: z.string().regex(/^[A-Z]{3}$/), reason, replacesReleaseId: uuid.optional(), changeReason: reason.optional() }).strict();
const requestInput = versioned.extend({ approverAccountId: uuid }).strict();
const decision = versioned.extend({ outcome: z.enum(["APPROVED", "REJECTED"]) }).strict();
const materialInput = versioned.extend({ selections: z.array(z.object({ lineKey: z.string().trim().min(1).max(40), material: z.string().trim().min(2).max(500) }).strict()).min(1).max(100) }).strict();
const progressInput = versioned.extend({ stage: z.enum(["PROCUREMENT", "FACTORY"]), status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]) }).strict();
const shareInput = versioned.extend({ accountId: uuid, view: z.boolean() }).strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new BadRequestException("Invalid request"); return result.data; }

@Controller("turnkey")
export class TurnkeyController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly turnkey: TurnkeyService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private async actor(request: Request, write = false, csrf?: string) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const cookie = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
    const active = await this.identity.session(cookie);
    const actor = await this.projects.actor(active.row.accountId);
    if (actor.kind === "OWNER" && !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner identity setup required");
    if (write) { if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed"); this.identity.verifyCsrf(active, csrf); }
    return { ...actor, sessionId: active.row.id };
  }
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  @Get("projects") async list(@Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.turnkey.projects(await this.actor(request)); }
  @Get("projects/:id") async detail(@Req() request: Request, @Param("id") id: string, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.turnkey.detail(await this.actor(request), parse(uuid, id)); }
  @Post("projects/:id/releases") async create(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.turnkey.create(await this.actor(request, true, csrf), parse(uuid, id), parse(create, body)); }
  @Post("releases/:id/cost-request") async costRequest(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.turnkey.request(await this.actor(request, true, csrf), parse(uuid, id), "cost", parse(requestInput, body)); }
  @Post("releases/:id/cost-decision") async costDecision(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.turnkey.decide(await this.actor(request, true, csrf), parse(uuid, id), "cost", parse(decision, body)); }
  @Post("releases/:id/materials") async materials(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.turnkey.materials(await this.actor(request, true, csrf), parse(uuid, id), parse(materialInput, body)); }
  @Post("releases/:id/procurement-request") async procurementRequest(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.turnkey.request(await this.actor(request, true, csrf), parse(uuid, id), "procurement", parse(requestInput, body)); }
  @Post("releases/:id/procurement-decision") async procurementDecision(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.turnkey.decide(await this.actor(request, true, csrf), parse(uuid, id), "procurement", parse(decision, body)); }
  @Post("releases/:id/progress") async progress(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.turnkey.progress(await this.actor(request, true, csrf), parse(uuid, id), parse(progressInput, body)); }
  @Post("releases/:id/cost-share") async share(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.turnkey.share(await this.actor(request, true, csrf), parse(uuid, id), parse(shareInput, body)); }
}

@Controller("client-portal")
@PublicRoute()
export class ClientTurnkeyController {
  constructor(private readonly identity: ClientPortalIdentityService, private readonly turnkey: TurnkeyService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  @Get("projects/:id/costs")
  async costs(@Req() request: Request, @Param("id") id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_client_sid" : "sense_client_sid";
    const cookie = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
    return this.turnkey.clientCosts(await this.identity.session(cookie), parse(uuid, id));
  }
}

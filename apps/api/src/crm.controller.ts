import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Put, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { CrmService } from "./crm.service.js";

const uuid = z.uuid();
const reason = z.string().trim().min(3).max(1000);
const contact = z.object({ name: z.string().trim().min(2).max(160), email: z.email().max(320).optional(), phone: z.string().trim().max(64).optional() }).strict();
const createLead = z.object({ branchId: uuid, title: z.string().trim().min(2).max(160), contactName: z.string().trim().min(2).max(160), email: z.email().max(320).optional(), phone: z.string().trim().max(64).optional(), sourceId: uuid, clientId: uuid.optional(), priorLostLeadId: uuid.optional(), reason }).strict();
const updateLead = z.object({ expectedVersion: z.number().int().positive(), title: z.string().trim().min(2).max(160), contactName: z.string().trim().min(2).max(160), email: z.union([z.email().max(320), z.null()]).optional(), phone: z.union([z.string().trim().min(1).max(64), z.null()]).optional(), reason }).strict();
const stageBody = z.object({ expectedVersion: z.number().int().positive(), toStage: z.enum(["NEW", "CONTACTED", "MEETING_DISCUSSION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]), reason: z.string().trim().min(3).max(1000).optional() }).strict();
const activity = z.object({ kind: z.enum(["NOTE", "CALL", "MEETING", "PROPOSAL", "OTHER"]), note: z.string().trim().min(3).max(2000) }).strict();
const clientCreate = z.object({ name: z.string().trim().min(2).max(160), reason, contacts: z.array(contact).max(10) }).strict();
const clientUpdate = z.object({ name: z.string().trim().min(2).max(160), expectedVersion: z.number().int().positive(), reason, contacts: z.array(z.object({ id: uuid.optional(), name: z.string().trim().min(2).max(160), email: z.union([z.email().max(320), z.null()]).optional(), phone: z.union([z.string().trim().min(1).max(64), z.null()]).optional() }).strict()).max(10) }).strict();
const sourceCreate = z.object({ name: z.string().trim().min(2).max(120), reason }).strict();
const sourceUpdate = z.object({ active: z.boolean(), expectedUpdatedAt: z.iso.datetime({ offset: true }), reason }).strict();
const stages = z.enum(["NEW", "CONTACTED", "MEETING_DISCUSSION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]);
const page = z.preprocess((value) => typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value, z.number().int().min(0).max(100_000));
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const out = schema.safeParse(value); if (!out.success) throw new BadRequestException("Invalid request"); return out.data; }

@Controller("crm")
export class CrmController {
  constructor(private readonly identity: IdentityService, private readonly crm: CrmService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private cookie(request: Request) { const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid"; const pair = request.headers.cookie?.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`)); return pair?.slice(name.length + 1); }
  private async actor(request: Request) {
    const active = await this.identity.session(this.cookie(request));
    const actor = await this.crm.actor(active.row.accountId);
    if (actor.kind === "OWNER" && !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner identity setup is required");
    return { active, actor };
  }
  private async mutate(request: Request, csrf?: string) { if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed"); const result = await this.actor(request); this.identity.verifyCsrf(result.active, csrf); return result.actor; }
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  @Get("setup") async setup(@Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); const { actor } = await this.actor(request); return this.crm.setup(actor); }
  @Get("leads") async leads(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Query("branchId") branchId?: string, @Query("stage") stage?: string, @Query("offset") offset?: string, @Query("limit") limit?: string) {
    this.noStore(response); const { actor } = await this.actor(request); if (!uuid.safeParse(branchId).success || (stage !== undefined && !stages.safeParse(stage).success)) throw new BadRequestException("Invalid query");
    const pageOffset = page.safeParse(offset ?? "0"); const pageLimit = page.safeParse(limit ?? "50"); if (!pageOffset.success || !pageLimit.success) throw new BadRequestException("Invalid pagination");
    const offsetValue = pageOffset.data; const limitValue = pageLimit.data;
    if (limitValue < 1 || limitValue > 100) throw new BadRequestException("Invalid pagination");
    return this.crm.listLeads(actor, { branchId: branchId!, ...(stage ? { stage: stage as "NEW" | "CONTACTED" | "MEETING_DISCUSSION" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" } : {}), offset: offsetValue, limit: limitValue });
  }
  @Get("leads/:id") async detail(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string) { this.noStore(response); const { actor } = await this.actor(request); if (!uuid.safeParse(id).success) throw new BadRequestException("Invalid lead"); return this.crm.detail(actor, id); }
  @Post("leads") async create(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.crm.createLead(actor, parse(createLead, body)); }
  @Put("leads/:id") async update(@Req() request: Request, @Param("id") id: string, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { const actor = await this.mutate(request, csrf); if (!uuid.safeParse(id).success) throw new BadRequestException("Invalid lead"); return this.crm.updateLead(actor, id, parse(updateLead, body)); }
  @Post("leads/:id/stage") async stage(@Req() request: Request, @Param("id") id: string, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { const actor = await this.mutate(request, csrf); if (!uuid.safeParse(id).success) throw new BadRequestException("Invalid lead"); return this.crm.changeStage(actor, id, parse(stageBody, body)); }
  @Post("leads/:id/activities") async addActivity(@Req() request: Request, @Param("id") id: string, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { const actor = await this.mutate(request, csrf); if (!uuid.safeParse(id).success) throw new BadRequestException("Invalid lead"); return this.crm.addActivity(actor, id, parse(activity, body)); }
  @Get("clients") async clients(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Query("branchId") branchId?: string) { this.noStore(response); const { actor } = await this.actor(request); if (!uuid.safeParse(branchId).success) throw new BadRequestException("Invalid branch"); return this.crm.listClients(actor, branchId!); }
  @Post("sources") async createSource(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.crm.createSource(actor, parse(sourceCreate, body)); }
  @Put("sources/:id") async updateSource(@Req() request: Request, @Param("id") id: string, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { const actor = await this.mutate(request, csrf); if (!uuid.safeParse(id).success) throw new BadRequestException("Invalid source"); const input = parse(sourceUpdate, body); return this.crm.updateSource(actor, id, { active: input.active, expectedUpdatedAt: new Date(input.expectedUpdatedAt), reason: input.reason }); }
  @Post("clients") async createClient(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { const actor = await this.mutate(request, csrf); const input = parse(clientCreate, body); return this.crm.createClient(actor, input); }
  @Put("clients/:id") async updateClient(@Req() request: Request, @Param("id") id: string, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { const actor = await this.mutate(request, csrf); if (!uuid.safeParse(id).success) throw new BadRequestException("Invalid client"); return this.crm.updateClient(actor, id, parse(clientUpdate, body)); }
}

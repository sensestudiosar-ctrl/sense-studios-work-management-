import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";

const uuid = z.uuid();
const createProject = z.object({ branchId: uuid, title: z.string().trim().min(2).max(160), deliveryType: z.enum(["DESIGN", "TURNKEY"]), scopes: z.array(z.string().trim().min(2).max(120)).min(1).max(12), clientId: uuid.optional(), wonLeadId: uuid.optional(), reason: z.string().trim().min(3).max(1000) }).strict();
const page = z.preprocess((value) => typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value, z.number().int().min(0).max(100_000));
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const out = schema.safeParse(value); if (!out.success) throw new BadRequestException("Invalid request"); return out.data; }

@Controller("projects")
export class ProjectController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private cookie(request: Request) { const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid"; const pair = request.headers.cookie?.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`)); return pair?.slice(name.length + 1); }
  private async actor(request: Request) {
    const active = await this.identity.session(this.cookie(request));
    const actor = await this.projects.actor(active.row.accountId);
    if (actor.kind === "OWNER" && !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner identity setup is required");
    if (actor.kind !== "OWNER") throw new ForbiddenException("Owner access is required");
    return { active, actor };
  }
  private async mutate(request: Request, csrf?: string) { if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed"); const result = await this.actor(request); this.identity.verifyCsrf(result.active, csrf); return result.actor; }
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  @Get("setup") async setup(@Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); const { actor } = await this.actor(request); return this.projects.setup(actor); }
  @Get() async list(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Query("branchId") branchId?: string, @Query("offset") offset?: string, @Query("limit") limit?: string) {
    this.noStore(response);
    const { actor } = await this.actor(request);
    if (!uuid.safeParse(branchId).success) throw new BadRequestException("Invalid branch");
    const parsedOffset = page.safeParse(offset ?? "0"); const parsedLimit = page.safeParse(limit ?? "50");
    if (!parsedOffset.success || !parsedLimit.success || parsedLimit.data < 1 || parsedLimit.data > 100) throw new BadRequestException("Invalid pagination");
    return this.projects.list(actor, branchId!, parsedOffset.data, parsedLimit.data);
  }
  @Get(":id") async detail(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string) { this.noStore(response); const { actor } = await this.actor(request); if (!uuid.safeParse(id).success) throw new BadRequestException("Invalid project"); return this.projects.detail(actor, id); }
  @Post() async create(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.projects.create(actor, parse(createProject, body)); }
}

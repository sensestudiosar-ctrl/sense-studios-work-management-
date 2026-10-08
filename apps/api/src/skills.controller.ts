import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { SkillsService } from "./skills.service.js";
import { Inject } from "@nestjs/common";

const uuid = z.uuid(), reason = z.string().trim().min(3).max(1000), command = { commandId: uuid, reason }, level = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]);
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new BadRequestException("Invalid skill request"); return result.data; }

@Controller("skills")
export class SkillsController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly skills: SkillsService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private async actor(request: Request) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid", cookie = request.headers.cookie?.split(";").map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1);
    const active = await this.identity.session(cookie), actor = await this.projects.actor(active.row.accountId);
    if (!["OWNER", "STAFF"].includes(actor.kind) || actor.kind === "OWNER" && !await this.identity.ownerReady(actor.accountId)) throw new ForbiddenException("Internal identity required");
    return { active, actor: { ...actor, sessionId: active.row.id } };
  }
  private async mutate(request: Request, csrf?: string) {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const { active, actor } = await this.actor(request); this.identity.verifyCsrf(active, csrf); return actor;
  }
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  @Get("setup") async setup(@Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.skills.setup((await this.actor(request)).actor); }
  @Get("employees/:employeeId") async profile(@Param("employeeId") id: string, @Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.skills.profile((await this.actor(request)).actor, parse(uuid, id)); }
  @Post("catalogue") async catalogue(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { return this.skills.createCatalogue(await this.mutate(request, csrf), parse(z.object({ ...command, name: z.string().trim().min(1).max(120) }).strict(), body)); }
  @Post("requests") async createRequest(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) {
    return this.skills.request(await this.mutate(request, csrf), parse(z.object({ ...command, employeeId: uuid, skillId: uuid.optional(), proposedSkillName: z.string().trim().min(1).max(120).optional(), requestedLevel: level, expectedRatingVersion: z.number().int().min(0), approverAccountId: uuid, trainingSourceId: uuid.optional() }).strict(), body));
  }
  @Post("requests/:requestId/decision") async decide(@Param("requestId") id: string, @Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { return this.skills.decide(await this.mutate(request, csrf), parse(uuid, id), parse(z.object({ ...command, outcome: z.enum(["APPROVED", "REJECTED"]) }).strict(), body)); }
  @Post("ratings") async rating(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { return this.skills.directRate(await this.mutate(request, csrf), parse(z.object({ ...command, employeeId: uuid, skillId: uuid, level, expectedRatingVersion: z.number().int().min(0) }).strict(), body)); }
}

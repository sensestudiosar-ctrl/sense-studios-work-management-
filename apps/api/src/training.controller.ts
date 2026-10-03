import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { TrainingService } from "./training.service.js";

const uuid = z.uuid(), reason = z.string().trim().min(3).max(1000), command = { commandId: uuid, reason };
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new BadRequestException("Invalid training request"); return result.data; }

@Controller("training")
export class TrainingController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly training: TrainingService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private async actor(request: Request) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid", cookie = request.headers.cookie?.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${name}=`))?.slice(name.length + 1);
    const active = await this.identity.session(cookie), actor = await this.projects.actor(active.row.accountId);
    if (!["OWNER", "STAFF"].includes(actor.kind) || actor.kind === "OWNER" && !await this.identity.ownerReady(actor.accountId)) throw new ForbiddenException("Internal identity required");
    return { active, actor: { ...actor, sessionId: active.row.id } };
  }
  private async mutate(request: Request, csrf?: string) {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const { active, actor } = await this.actor(request); this.identity.verifyCsrf(active, csrf); return actor;
  }
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  @Get("setup") async setup(@Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.training.setup((await this.actor(request)).actor); }
  @Get("assignments") async list(@Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.training.list((await this.actor(request)).actor); }
  @Get("assignments/:id") async detail(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string) { this.noStore(response); return this.training.detail((await this.actor(request)).actor, parse(uuid, id)); }
  @Post("assignments") async assign(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) {
    const input = parse(z.object({ ...command, employeeId: uuid, moduleVersionId: uuid, reviewerAccountId: uuid, recommendationReason: reason.optional(), practicalTaskId: uuid.optional() }).strict(), body);
    const { recommendationReason, practicalTaskId, ...required } = input;
    return this.training.assign(await this.mutate(request, csrf), { ...required, ...(recommendationReason ? { recommendationReason } : {}), ...(practicalTaskId ? { practicalTaskId } : {}) });
  }
  @Post("assignments/:id/submissions") async submit(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const input = parse(z.object({ ...command, expectedVersion: z.number().int().positive(), answers: z.array(z.object({ questionId: z.string().min(1).max(80), optionIds: z.array(z.string().min(1).max(80)).max(12) }).strict()).max(30).optional(), practicalTaskId: uuid.optional(), note: z.string().trim().min(3).max(2000) }).strict(), body);
    const { answers, practicalTaskId, ...required } = input;
    return this.training.submit(await this.mutate(request, csrf), parse(uuid, id), { ...required, ...(answers ? { answers } : {}), ...(practicalTaskId ? { practicalTaskId } : {}) });
  }
  @Post("assignments/:id/assessments") async assess(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const input = parse(z.object({ ...command, expectedVersion: z.number().int().positive(), outcome: z.enum(["PASSED", "CHANGES_REQUIRED"]), observation: z.string().trim().min(3).max(2000) }).strict(), body);
    return this.training.assess(await this.mutate(request, csrf), parse(uuid, id), input);
  }
  @Post("assignments/:id/effectiveness") async effectiveness(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const input = parse(z.object({ ...command, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), observation: z.string().trim().min(3).max(2000), practicalTaskId: uuid.optional() }).strict(), body);
    const { practicalTaskId, ...required } = input;
    return this.training.effectiveness(await this.mutate(request, csrf), parse(uuid, id), { ...required, ...(practicalTaskId ? { practicalTaskId } : {}) });
  }
}

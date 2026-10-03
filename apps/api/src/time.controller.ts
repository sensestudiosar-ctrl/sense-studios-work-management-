import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { TimeService } from "./time.service.js";
const uuid = z.uuid(); const reason = z.string().trim().min(3).max(1000);
const data = z.object({ projectId: uuid.nullable().optional(), taskId: uuid.nullable().optional(), stageId: uuid.nullable().optional(), activityLabel: z.string().trim().min(1).max(160).nullable().optional(), workNote: z.string().trim().min(1).max(1000), location: z.enum(["OFFICE", "SITE", "REMOTE"]), billable: z.boolean(), evidenceFileId: uuid.nullable().optional() }).strict();
const manual = data.extend({ date: z.iso.date(), startedAt: z.iso.datetime({ offset: true }).nullable().optional(), endedAt: z.iso.datetime({ offset: true }).nullable().optional(), durationSeconds: z.number().int().min(1).max(31_536_000) }).refine(v => (!v.startedAt && !v.endedAt) || !!v.startedAt && !!v.endedAt && Date.parse(v.endedAt) > Date.parse(v.startedAt) && v.durationSeconds <= Math.ceil((Date.parse(v.endedAt) - Date.parse(v.startedAt)) / 1000), "Start/end/duration differ");
const change = z.object({ commandId: uuid, expectedVersion: z.number().int().min(1), reason }).strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new BadRequestException("Invalid time request"); return result.data; }
@Controller("time")
export class TimeController {
 constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly time: TimeService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
 private async actor(request: Request) { const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid"; const cookie = request.headers.cookie?.split(";").map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1); const active = await this.identity.session(cookie); const actor = await this.projects.actor(active.row.accountId); if (actor.kind !== "OWNER" && actor.kind !== "STAFF" || actor.kind === "OWNER" && !await this.identity.ownerReady(actor.accountId)) throw new ForbiddenException("Internal identity required"); return { active, actor: { ...actor, sessionId: active.row.id } }; }
 private async mutate(request: Request, csrf?: string) { if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed"); const { actor, active } = await this.actor(request); this.identity.verifyCsrf(active, csrf); return actor; }
 @Get("setup") async setup(@Req() req: Request, @Res({ passthrough: true }) res: Response) { res.setHeader("Cache-Control", "no-store"); return this.time.setup((await this.actor(req)).actor); }
 @Get() async list(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Query("scope") scope = "mine") { res.setHeader("Cache-Control", "no-store"); return this.time.list((await this.actor(req)).actor, parse(z.enum(["mine", "managed"]), scope)); }
 @Post("timers") async start(@Req() req: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { return this.time.start(await this.mutate(req, csrf), parse(data.extend({ commandId: uuid }), body)); }
 @Post("timers/:id/:action") async timer(@Req() req: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Param("action") action: string, @Body() body: unknown) { return this.time.timerCommand(await this.mutate(req, csrf), parse(uuid, id), parse(z.enum(["pause", "resume", "stop"]), action), parse(change, body)); }
 @Post("entries") async manual(@Req() req: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { return this.time.manual(await this.mutate(req, csrf), parse(manual.safeExtend({ commandId: uuid, employeeId: uuid.optional() }), body)); }
 @Post("entries/:id/corrections") async correct(@Req() req: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.time.correct(await this.mutate(req, csrf), parse(uuid, id), parse(manual.safeExtend(change.shape), body)); }
 @Post("entries/:id/approve") async approve(@Req() req: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.time.approve(await this.mutate(req, csrf), parse(uuid, id), parse(change, body)); }
 @Post("entries/:id/export") async export(@Req() req: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.time.export(await this.mutate(req, csrf), parse(uuid, id), parse(change, body)); }
 @Post("deliveries/:id/retry") async retry(@Req() req: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { parse(z.object({ reason }).strict(), body); return this.time.dispatch(await this.mutate(req, csrf), parse(uuid, id)); }
}

import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Put, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { TaskRecurrenceService } from "./task-recurrence.service.js";

const uuid = z.uuid();
const state = z.object({ expectedTaskVersion: z.number().int().min(1), expectedVersion: z.number().int().min(1), reason: z.string().trim().min(3).max(1000) }).strict();
const configure = state.extend({ expectedVersion: z.number().int().min(0), frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]), firstOccurrenceDate: z.iso.date() }).strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new BadRequestException("Invalid request"); return result.data; }

@Controller("tasks/:id/recurrence")
export class TaskRecurrenceController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly recurrence: TaskRecurrenceService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private cookie(request: Request) { const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid"; const pair = request.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`)); return pair?.slice(name.length + 1); }
  private async actor(request: Request) { const active = await this.identity.session(this.cookie(request)); const actor = await this.projects.actor(active.row.accountId); if (actor.kind === "OWNER" && !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner identity setup is required"); return { active, actor }; }
  private async mutate(request: Request, csrf?: string) { if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed"); const result = await this.actor(request); this.identity.verifyCsrf(result.active, csrf); return result.actor; }
  @Get() async detail(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string) { response.setHeader("Cache-Control", "no-store"); const { actor } = await this.actor(request); return this.recurrence.detail(actor, parse(uuid, id)); }
  @Put() async configure(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.recurrence.configure(actor, parse(uuid, id), parse(configure, body)); }
  @Post("pause") async pause(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.recurrence.setPaused(actor, parse(uuid, id), true, parse(state, body)); }
  @Post("resume") async resume(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.recurrence.setPaused(actor, parse(uuid, id), false, parse(state, body)); }
}

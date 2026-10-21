import { BadRequestException, Controller, ForbiddenException, Get, Inject, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { taskPrioritySelection, taskCollaboratorSelection } from "./task-read-filters.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { TaskStatus, TaskType } from "./generated/prisma/client.js";
import { MyWorkService } from "./my-work.service.js";
const integer = z.preprocess(value => typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value, z.number().int().min(0).max(100_000));
export const attentionQuerySchema = z.object({ priorities: taskPrioritySelection, collaboratorEmployeeIds: taskCollaboratorSelection, source: z.enum(["all", "task", "review", "approval"]).optional(), q: z.string().trim().max(160).optional(), projectId: z.uuid().optional(), status: z.enum(TaskStatus).optional(), phase: z.enum(["waiting", "review", "completed"]).optional(), type: z.enum(TaskType).optional(), ownerEmployeeId: z.uuid().optional(), planItemId: z.uuid().optional(), dateBasis: z.enum(["target", "committed"]).optional(), dateFrom: z.iso.date().optional(), dateTo: z.iso.date().optional(), offset: integer.default(0), limit: integer.refine(value => value >= 1 && value <= 100).default(50) }).strict().refine(value => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo).refine(value => !(value.dateFrom || value.dateTo) || !!value.dateBasis);
@Controller("my-work")
export class MyWorkController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly work: MyWorkService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  @Get("attention") async attention(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Query() query: unknown) {
    response.setHeader("Cache-Control", "no-store");
    const parsed = attentionQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException("Invalid My Work query");
    const cookieName = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const cookie = request.headers.cookie?.split(";").map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    const active = await this.identity.session(cookie), actor = await this.projects.actor(active.row.accountId);
    if (actor.kind === "OWNER" && !await this.identity.ownerReady(actor.accountId)) throw new ForbiddenException("Owner identity setup is required");
    return this.work.attention(actor, parsed.data);
  }
}

import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Put, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { TaskService } from "./task.service.js";

const uuid = z.uuid();
const reason = z.string().trim().min(3).max(1000);
const version = z.number().int().min(1);
const page = z.preprocess((value) => typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value, z.number().int().min(0).max(100_000));
const create = z.object({
  title: z.string().trim().min(2).max(160),
  type: z.enum(["PROJECT", "NON_PROJECT", "RECURRING", "CORRECTION", "SITE", "TRAINING_PRACTICAL"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  targetDate: z.iso.date(),
  startDate: z.iso.date().optional(),
  estimatedHours: z.number().min(0).max(100_000).optional(),
  description: z.string().trim().max(2000).optional(),
  projectId: uuid.optional(),
  planItemId: uuid.optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  checklist: z.array(z.object({ label: z.string().trim().min(1).max(120), checked: z.boolean() }).strict()).max(10).optional(),
  ownerEmployeeId: uuid.optional(),
  reviewRequirement: z.enum(["NONE", "INTERNAL", "CLIENT", "BOTH"]).optional(),
  collaborators: z.array(z.object({ employeeId: uuid, estimatedHours: z.number().min(0).max(100_000).optional() }).strict()).max(30).optional(),
  reason
}).strict();
const transition = z.object({ toState: z.enum(["IN_PROGRESS", "COMPLETED"]), expectedVersion: version, reason, acknowledgeUnfinishedDependencies: z.literal(true).optional() }).strict();
const wait = z.object({ expectedVersion: version, reason, delayCause: reason, responsibleParty: z.string().trim().min(1).max(160).optional() }).strict();
const resume = z.object({ expectedVersion: version, reason }).strict();
const committedDate = z.object({ expectedVersion: version, committedDueDate: z.iso.date(), reason }).strict();
const extensionRequest = z.object({ expectedVersion: version, proposedDate: z.iso.date(), approverAccountId: uuid, reason }).strict();
const extensionDecision = z.object({ outcome: z.enum(["APPROVED", "REJECTED"]), reason }).strict();
const addDependency = z.object({ predecessorTaskId: uuid, expectedVersion: version, reason }).strict();
const removeDependency = z.object({ expectedVersion: version, reason }).strict();
const reassign = z.object({ newOwnerEmployeeId: uuid, expectedVersion: version, reason }).strict();
const edit = z.object({ expectedVersion: version, reason, title: z.string().trim().min(2).max(160), description: z.string().trim().max(2000).optional(), targetDate: z.iso.date(), startDate: z.iso.date().optional(), estimatedHours: z.number().min(0).max(100_000).optional(), priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), planItemId: uuid.nullable().optional(), tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(), checklist: z.array(z.object({ label: z.string().trim().min(1).max(120), checked: z.boolean() }).strict()).max(10).optional() }).strict();
const closeout = z.object({ projectId: uuid, ownerEmployeeId: uuid, title: z.string().trim().min(2).max(160), workScope: z.string().trim().min(3).max(2000), targetDate: z.iso.date(), priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), reason }).strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new BadRequestException("Invalid request"); return result.data; }

@Controller("tasks")
export class TaskController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly tasks: TaskService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private cookie(request: Request) { const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid"; const pair = request.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`)); return pair?.slice(name.length + 1); }
  private async actor(request: Request) { const active = await this.identity.session(this.cookie(request)); const actor = await this.projects.actor(active.row.accountId); if (actor.kind === "OWNER" && !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner identity setup is required"); return { active, actor }; }
  private async mutate(request: Request, csrf?: string) { if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed"); const result = await this.actor(request); this.identity.verifyCsrf(result.active, csrf); return result.actor; }
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  @Get("setup") async setup(@Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); const { actor } = await this.actor(request); return this.tasks.setup(actor); }
  @Get() async list(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Query("scope") scope?: string, @Query("offset") offset?: string, @Query("limit") limit?: string) {
    this.noStore(response); const { actor } = await this.actor(request);
    const parsedOffset = page.safeParse(offset ?? "0"); const parsedLimit = page.safeParse(limit ?? "50");
    if ((scope !== "mine" && scope !== "assigned") || !parsedOffset.success || !parsedLimit.success || parsedLimit.data < 1 || parsedLimit.data > 100) throw new BadRequestException("Invalid task list request");
    return this.tasks.list(actor, scope, parsedOffset.data, parsedLimit.data);
  }
  @Get(":id") async detail(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string) { this.noStore(response); const { actor } = await this.actor(request); return this.tasks.detail(actor, parse(uuid, id)); }
  @Get(":id/dependency-candidates") async dependencyCandidates(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string, @Query("q") query?: string) { this.noStore(response); const { actor } = await this.actor(request); return this.tasks.dependencyCandidates(actor, parse(uuid, id), parse(z.string().trim().max(160), query ?? "")); }
  @Get(":id/extension-approvers") async extensionApprovers(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string) { this.noStore(response); const { actor } = await this.actor(request); return this.tasks.extensionApprovers(actor, parse(uuid, id)); }
  @Post() async create(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.create(actor, parse(create, body)); }
  @Post("closeout") async closeout(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.createCloseout(actor, parse(closeout, body)); }
  @Put(":id") async edit(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.edit(actor, parse(uuid, id), parse(edit, body)); }
  @Post(":id/state") async state(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.transition(actor, parse(uuid, id), parse(transition, body)); }
  @Post(":id/wait") async wait(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.wait(actor, parse(uuid, id), parse(wait, body)); }
  @Post(":id/resume") async resume(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.resume(actor, parse(uuid, id), parse(resume, body)); }
  @Post(":id/committed-date") async committedDate(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.changeCommittedDate(actor, parse(uuid, id), parse(committedDate, body)); }
  @Post(":id/extension-requests") async requestExtension(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.requestExtension(actor, parse(uuid, id), parse(extensionRequest, body)); }
  @Post(":id/extension-requests/:approvalId/decision") async decideExtension(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Param("approvalId") approvalId: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.decideExtension(actor, parse(uuid, id), parse(uuid, approvalId), parse(extensionDecision, body)); }
  @Post(":id/extension-requests/:approvalId/withdraw") async withdrawExtension(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Param("approvalId") approvalId: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.withdrawExtension(actor, parse(uuid, id), parse(uuid, approvalId), parse(z.object({ reason }).strict(), body).reason); }
  @Post(":id/dependencies") async addDependency(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.addDependency(actor, parse(uuid, id), parse(addDependency, body)); }
  @Post(":id/dependencies/:predecessorId/remove") async removeDependency(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Param("predecessorId") predecessorId: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.removeDependency(actor, parse(uuid, id), parse(uuid, predecessorId), parse(removeDependency, body)); }
  @Post(":id/reassign") async reassign(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.reassign(actor, parse(uuid, id), parse(reassign, body)); }
  @Post(":id/closeout/revoke") async revokeCloseout(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.revokeCloseout(actor, parse(uuid, id), parse(z.object({ reason }).strict(), body).reason); }
}

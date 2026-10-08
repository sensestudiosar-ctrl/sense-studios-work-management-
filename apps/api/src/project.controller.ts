import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, Inject, Param, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { TaskService } from "./task.service.js";

const uuid = z.uuid();
const createProject = z.object({ branchId: uuid, title: z.string().trim().min(2).max(160), deliveryType: z.enum(["DESIGN", "TURNKEY"]), scopes: z.array(z.string().trim().min(2).max(120)).min(1).max(12), clientId: uuid.optional(), wonLeadId: uuid.optional(), reason: z.string().trim().min(3).max(1000), templateVersionId: uuid.optional(), idempotencyKey: uuid.optional() }).strict().refine((value) => !!value.templateVersionId === !!value.idempotencyKey);
const page = z.preprocess((value) => typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value, z.number().int().min(0).max(100_000));
const reason = z.string().trim().min(3).max(1000);
const version = z.number().int().min(1);
const assignment = z.object({ employeeId: uuid, expectedVersion: version, reason }).strict();
const versionedReason = z.object({ expectedVersion: version, reason }).strict();
const cancelInput = versionedReason.extend({ clientAccessEndTimes: z.array(z.object({ grantId: uuid, expectedVersion: version, expiresAt: z.iso.datetime({ offset: true }) }).strict()).max(200).optional() }).strict();
const statusChange = versionedReason.extend({ toStatus: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]), overrideMilestones: z.boolean().optional() }).strict();
const transfer = versionedReason.extend({ toBranchId: uuid }).strict();
const scopeApprover = versionedReason.extend({ accountId: uuid }).strict();
const scopeRequest = versionedReason.extend({ name: z.string().trim().min(2).max(120) }).strict();
const scopeDecision = z.object({ outcome: z.enum(["APPROVED", "REJECTED"]), reason }).strict();
const cancellationRequest = z.object({ reason }).strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const out = schema.safeParse(value); if (!out.success) throw new BadRequestException("Invalid request"); return out.data; }

@Controller("projects")
export class ProjectController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly workflows: ProjectWorkflowService, private readonly tasks: TaskService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private cookie(request: Request) { const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid"; const pair = request.headers.cookie?.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`)); return pair?.slice(name.length + 1); }
  private async actor(request: Request) {
    const active = await this.identity.session(this.cookie(request));
    const actor = await this.projects.actor(active.row.accountId);
    if (actor.kind === "OWNER" && !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner identity setup is required");
    return { active, actor };
  }
  private async mutate(request: Request, csrf?: string) { if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed"); const result = await this.actor(request); this.identity.verifyCsrf(result.active, csrf); return result.actor; }
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  @Get("setup") async setup(@Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); const { actor } = await this.actor(request); return this.workflows.setup(actor); }
  @Get() async list(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Query("branchId") branchId?: string, @Query("offset") offset?: string, @Query("limit") limit?: string, @Query("q") q?: string, @Query("stageKey") stageKey?: string, @Query("sort") sort?: string, @Query("direction") direction?: string) {
    this.noStore(response);
    const { actor } = await this.actor(request);
    if (branchId !== undefined && !uuid.safeParse(branchId).success) throw new BadRequestException("Invalid branch");
    const parsedOffset = page.safeParse(offset ?? "0"); const parsedLimit = page.safeParse(limit ?? "50");
    if (!parsedOffset.success || !parsedLimit.success || parsedLimit.data < 1 || parsedLimit.data > 100) throw new BadRequestException("Invalid pagination");
    const parsedQ = q === undefined ? undefined : z.string().trim().max(160).safeParse(q);
    const parsedStage = stageKey === undefined ? undefined : z.string().trim().min(1).max(80).safeParse(stageKey);
    if (parsedQ && !parsedQ.success || parsedStage && !parsedStage.success || sort !== undefined && !["created", "name", "milestone"].includes(sort) || direction !== undefined && !["asc", "desc"].includes(direction)) throw new BadRequestException("Invalid project list filters");
    return this.workflows.list(actor, branchId, parsedOffset.data, parsedLimit.data, { ...(parsedQ?.success && parsedQ.data ? { q: parsedQ.data } : {}), ...(parsedStage?.success ? { stageKey: parsedStage.data } : {}), ...(sort ? { sort: sort as "created" | "name" | "milestone" } : {}), ...(direction ? { direction: direction as "asc" | "desc" } : {}) });
  }
  @Get(":id") async detail(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string) { this.noStore(response); const { actor } = await this.actor(request); if (!uuid.safeParse(id).success) throw new BadRequestException("Invalid project"); return this.workflows.detail(actor, id); }
  @Get(":id/plan") async plan(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string) { this.noStore(response); const { actor } = await this.actor(request); return this.workflows.plan(actor, parse(uuid, id)); }
  @Post(":id/plan-items/:itemId/complete") async completePlanItem(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Param("itemId") itemId: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.workflows.completePlanItem(actor, parse(uuid, id), parse(uuid, itemId), parse(versionedReason, body)); }
  @Post() async create(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.projects.create(actor, parse(createProject, body)); }
  @Post(":id/assignments") async assign(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.workflows.assignment(actor, parse(uuid, id), parse(assignment, body)); }
  @Delete(":id/assignments/:employeeId") async revoke(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Param("employeeId") employeeId: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.workflows.revokeAssignment(actor, parse(uuid, id), parse(uuid, employeeId), parse(versionedReason, body)); }
  @Post(":id/lead") async lead(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.workflows.lead(actor, parse(uuid, id), parse(assignment, body)); }
  @Post(":id/status") async status(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.workflows.status(actor, parse(uuid, id), parse(statusChange, body)); }
  @Post(":id/transfer") async transfer(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.workflows.transfer(actor, parse(uuid, id), parse(transfer, body)); }
  @Post(":id/scope-approver") async scopeApprover(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.workflows.setScopeApprover(actor, parse(uuid, id), parse(scopeApprover, body)); }
  @Post(":id/scope-requests") async scopeRequest(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.workflows.requestScope(actor, parse(uuid, id), parse(scopeRequest, body)); }
  @Post(":id/scope-requests/:approvalId/decision") async scopeDecision(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Param("approvalId") approvalId: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.workflows.decideScope(actor, parse(uuid, id), parse(uuid, approvalId), parse(scopeDecision, body)); }
  @Post(":id/scope-requests/:approvalId/withdraw") async scopeWithdraw(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Param("approvalId") approvalId: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.workflows.withdrawScope(actor, parse(uuid, id), parse(uuid, approvalId), parse(cancellationRequest, body).reason); }
  @Post(":id/cancellation-requests") async cancellationRequest(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.workflows.requestCancellation(actor, parse(uuid, id), parse(cancellationRequest, body).reason); }
  @Post(":id/cancel") async cancel(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { const actor = await this.mutate(request, csrf); return this.tasks.cancelProject(actor, parse(uuid, id), parse(cancelInput, body)); }
}

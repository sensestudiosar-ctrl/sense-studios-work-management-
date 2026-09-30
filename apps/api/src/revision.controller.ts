import { BadRequestException, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Body, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { RevisionService } from "./revision.service.js";

const uuid = z.uuid();
const reason = z.string().trim().min(3).max(1000);
const drawingInput = z.object({
  documentNumber: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  fileId: uuid,
  reason
}).strict();
const clientReviewInput = z.object({ expectedVersion: z.number().int().positive(), reason }).strict();
const revisionInput = z.object({
  fileId: uuid,
  series: z.enum(["R", "CR"]),
  expectedVersion: z.number().int().positive(),
  reason
}).strict();
const issueInput = z.object({
  revisionIds: z.array(uuid).min(1).max(500),
  recipientAccountIds: z.array(uuid).min(1).max(500),
  purpose: z.string().trim().min(3).max(500),
  reason,
  acknowledgementRequired: z.boolean()
}).strict();
const acknowledgementInput = z.object({ note: z.string().trim().max(1000).optional(), reason }).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Invalid request");
  return result.data;
}

@Controller("revisions")
export class RevisionController {
  constructor(
    private readonly identity: IdentityService,
    private readonly projects: ProjectService,
    private readonly revisions: RevisionService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private cookie(request: Request) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const pair = request.headers.cookie?.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
    return pair?.slice(name.length + 1);
  }

  private async actor(request: Request) {
    const active = await this.identity.session(this.cookie(request));
    const actor = await this.projects.actor(active.row.accountId);
    if (actor.kind === "OWNER" && !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner identity setup is required");
    return { active, actor };
  }

  private async mutate(request: Request, csrf?: string) {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const result = await this.actor(request);
    this.identity.verifyCsrf(result.active, csrf);
    return result.actor;
  }

  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }

  @Get("projects/:projectId")
  async list(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("projectId") projectId: string) {
    this.noStore(response);
    return this.revisions.list((await this.actor(request)).actor, parse(uuid, projectId));
  }

  @Post("projects/:projectId/drawings")
  async createDrawing(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("projectId") projectId: string, @Body() body: unknown) {
    return this.revisions.createDrawing(await this.mutate(request, csrf), parse(uuid, projectId), parse(drawingInput, body));
  }

  @Post("drawings/:drawingId")
  async appendRevision(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("drawingId") drawingId: string, @Body() body: unknown) {
    return this.revisions.appendRevision(await this.mutate(request, csrf), parse(uuid, drawingId), parse(revisionInput, body));
  }

  @Post("drawings/:drawingId/client-review")
  async selectClientReview(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("drawingId") drawingId: string, @Body() body: unknown) {
    return this.revisions.selectClientReview(await this.mutate(request, csrf), parse(uuid, drawingId), parse(clientReviewInput, body));
  }

  @Post("projects/:projectId/issues")
  async issue(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("projectId") projectId: string, @Body() body: unknown) {
    return this.revisions.issue(await this.mutate(request, csrf), parse(uuid, projectId), parse(issueInput, body));
  }

  @Post("transmittals/:transmittalId/acknowledge")
  async acknowledge(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("transmittalId") transmittalId: string, @Body() body: unknown) {
    const input = parse(acknowledgementInput, body);
    return this.revisions.acknowledge(await this.mutate(request, csrf), parse(uuid, transmittalId), { note: input.note ?? "", reason: input.reason });
  }

  @Get(":revisionId/stream")
  async stream(@Req() request: Request, @Res() response: Response, @Param("revisionId") revisionId: string) {
    const file = await this.revisions.stream((await this.actor(request)).actor, parse(uuid, revisionId));
    this.noStore(response);
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("Content-Length", String(file.size));
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    response.setHeader("X-Revision-Label", file.label);
    response.setHeader("X-Revision-State", file.state);
    if (file.state === "SUPERSEDED") response.setHeader("Warning", '299 - "Superseded - Do Not Use"');
    file.stream.on("error", () => response.destroy());
    response.on("close", () => file.stream.destroy());
    file.stream.pipe(response);
  }
}

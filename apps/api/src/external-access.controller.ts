import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { ExternalPortalService } from "./external-portal.service.js";

type StreamFile = { stream: NodeJS.ReadableStream & { destroy?: () => void }; mimeType: string; sizeBytes: number | string; fileName: string; sha256?: string };

const uuid = z.uuid();
const reason = z.string().trim().min(3).max(1000);
const ids = z.array(uuid).max(100).refine((values) => new Set(values).size === values.length, "Duplicate IDs are not allowed");
const grant = z.object({
  email: z.email().max(320), portalType: z.enum(["CONSULTANT", "VENDOR_FACTORY"]),
  revisionIds: ids, releaseIds: ids, packageIds: ids, expiresAt: z.iso.datetime().optional(), closeoutTaskId: uuid.optional(), reason
}).strict();
const grantChange = z.object({
  expectedVersion: z.number().int().positive(), reason,
  revisionIds: ids.optional(), releaseIds: ids.optional(), packageIds: ids.optional(), expiresAt: z.iso.datetime().optional(), revoke: z.literal(true).optional()
}).strict().refine((value) => {
  const hasChanges = value.revisionIds !== undefined || value.releaseIds !== undefined || value.packageIds !== undefined || value.expiresAt !== undefined;
  return value.revoke === true ? !hasChanges : hasChanges;
}, "Provide either a revocation or a grant change");
const portalRequest = z.object({ grantId: uuid, title: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(2000), dueDate: z.iso.datetime().optional(), expectedGrantVersion: z.number().int().positive(), reason }).strict();
const cadShare = z.object({ grantId: uuid, revisionId: uuid, nativeLinkId: z.string().trim().min(1).max(160), url: z.url().max(4000), extractionCode: z.string().min(1).max(512), expectedGrantVersion: z.number().int().positive(), reason }).strict();
const cadRevoke = z.object({ expectedVersion: z.number().int().positive(), confirmation: z.string().trim().min(3).max(1000), reason }).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Invalid request");
  return result.data;
}

@Controller("external-access")
export class ExternalAccessController {
  constructor(
    private readonly identity: IdentityService,
    private readonly projects: ProjectService,
    private readonly external: ExternalPortalService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }

  private async actor(request: Request, csrf?: string, write = false) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const pair = request.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
    const active = await this.identity.session(pair?.slice(name.length + 1));
    const actor = await this.projects.actor(active.row.accountId);
    if (actor.kind === "OWNER" && !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner identity setup required");
    if (write) {
      if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
      this.identity.verifyCsrf(active, csrf);
    }
    return { ...actor, sessionId: active.row.id };
  }

  private send(response: Response, file: StreamFile) {
    this.noStore(response);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'self'; sandbox");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("Content-Length", file.sizeBytes);
    response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    if (file.sha256) response.setHeader("X-Content-SHA256", file.sha256);
    response.on("close", () => file.stream.destroy?.());
    file.stream.on("error", () => response.destroy());
    file.stream.pipe(response);
  }

  @Get("projects/:projectId")
  async workspace(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("projectId") projectId: string) {
    this.noStore(response);
    return this.external.staffWorkspace(await this.actor(request), parse(uuid, projectId));
  }

  @Post("projects/:projectId/grants")
  async createGrant(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("projectId") projectId: string, @Body() body: unknown) {
    this.noStore(response);
    return this.external.createGrant(await this.actor(request, csrf, true), parse(uuid, projectId), parse(grant, body));
  }

  @Post("grants/:grantId/change")
  async changeGrant(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("grantId") grantId: string, @Body() body: unknown) {
    this.noStore(response);
    return this.external.changeGrant(await this.actor(request, csrf, true), parse(uuid, grantId), parse(grantChange, body));
  }

  @Post("projects/:projectId/requests")
  async createRequest(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("projectId") projectId: string, @Body() body: unknown) {
    this.noStore(response);
    return this.external.createRequest(await this.actor(request, csrf, true), parse(uuid, projectId), parse(portalRequest, body));
  }

  @Post("projects/:projectId/cad-shares")
  async issueCad(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("projectId") projectId: string, @Body() body: unknown) {
    this.noStore(response);
    return this.external.issueCad(await this.actor(request, csrf, true), parse(uuid, projectId), parse(cadShare, body));
  }

  @Post("cad-shares/:shareId/revoke")
  async revokeCad(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("shareId") shareId: string, @Body() body: unknown) {
    this.noStore(response);
    return this.external.revokeCad(await this.actor(request, csrf, true), parse(uuid, shareId), parse(cadRevoke, body));
  }

  @Get("uploads/:uploadId/file")
  async uploadFile(@Req() request: Request, @Res() response: Response, @Param("uploadId") uploadId: string) {
    this.noStore(response);
    const actor = await this.actor(request);
    this.send(response, await this.external.staffUploadFile(actor, parse(uuid, uploadId)) as StreamFile);
  }

  @Get("cad-shares/:shareId")
  async ownerCadShare(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("shareId") shareId: string) {
    this.noStore(response);
    return this.external.ownerCadShare(await this.actor(request), parse(uuid, shareId));
  }
}

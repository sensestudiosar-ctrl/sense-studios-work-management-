import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Put, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { PublicRoute } from "./auth.guard.js";
import { ExternalPortalIdentityService, type ActiveExternalPortalSession } from "./external-portal-identity.service.js";
import { ExternalPortalService } from "./external-portal.service.js";

const uuid = z.uuid();
const reason = z.string().trim().min(3).max(1000);
const submission = z.object({
  grantId: uuid, kind: z.enum(["REQUEST", "REVIEW", "COMMENT", "PRODUCTION_STATUS"]),
  title: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(2000),
  revisionId: uuid.optional(), releaseId: uuid.optional(), packageId: uuid.optional(), reason
}).strict();
const acknowledge = z.object({ note: z.string().trim().min(1).max(1000), reason }).strict();
const uploadStart = z.object({ grantId: uuid, fileName: z.string().trim().min(1).max(240), mimeType: z.string().trim().min(1).max(160), sizeBytes: z.number().safe().int().positive(), reason }).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Invalid request");
  return result.data;
}

type ExternalActor = { accountId: string; sessionId: string };
type StreamFile = { stream: NodeJS.ReadableStream & { destroy?: () => void }; mimeType: string; sizeBytes: number | string; fileName: string; sha256?: string; superseded?: boolean };

@Controller("external-portal")
@PublicRoute()
export class ExternalPortalController {
  constructor(
    private readonly identity: ExternalPortalIdentityService,
    private readonly external: ExternalPortalService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  private cookie(request: Request): string | undefined {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_external_sid" : "sense_external_sid";
    const pair = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return pair?.slice(name.length + 1);
  }

  private async active(request: Request, write = false, csrf?: string): Promise<{ active: ActiveExternalPortalSession; actor: ExternalActor }> {
    if (write && request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const active = await this.identity.session(this.cookie(request));
    if (write) this.identity.verifyCsrf(active, csrf);
    return { active, actor: { accountId: active.account.id, sessionId: active.row.id } };
  }

  private send(response: Response, file: StreamFile, download: boolean) {
    this.noStore(response);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'self'; sandbox");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("Content-Length", file.sizeBytes);
    response.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    if (file.sha256) response.setHeader("X-Content-SHA256", file.sha256);
    if (file.superseded) response.setHeader("X-Sense-Revision-Warning", "Superseded historical revision");
    response.on("close", () => file.stream.destroy?.());
    file.stream.on("error", () => response.destroy());
    file.stream.pipe(response);
  }

  private async raw(request: Request, maxBytes: number): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const part of request) {
      const bytes = Buffer.isBuffer(part) ? part : Buffer.from(part as string);
      size += bytes.length;
      if (size > maxBytes) throw new BadRequestException("Upload chunk is too large");
      chunks.push(bytes);
    }
    if (!size) throw new BadRequestException("Upload chunk is empty");
    return Buffer.concat(chunks);
  }

  @Get("projects")
  async projects(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.noStore(response);
    return this.external.projects((await this.active(request)).actor);
  }

  @Get("projects/:projectId")
  async workspace(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("projectId") projectId: string) {
    this.noStore(response);
    return this.external.workspace((await this.active(request)).actor, parse(uuid, projectId));
  }

  @Get("revisions/:revisionId/file")
  async revisionFile(@Req() request: Request, @Res() response: Response, @Param("revisionId") revisionId: string) {
    this.noStore(response);
    const { actor } = await this.active(request);
    const download = request.query.download === "1";
    this.send(response, await this.external.file(actor, parse(uuid, revisionId)) as StreamFile, download);
  }

  @Post("projects/:projectId/submissions")
  async submit(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Headers("x-idempotency-key") idempotencyKey: string | undefined, @Param("projectId") projectId: string, @Body() body: unknown) {
    this.noStore(response);
    const { actor } = await this.active(request, true, csrf);
    const key = parse(uuid, idempotencyKey);
    return this.external.submit(actor, parse(uuid, projectId), parse(submission, body), key);
  }

  @Post("transmittals/:transmittalId/acknowledge")
  async acknowledge(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("transmittalId") transmittalId: string, @Body() body: unknown) {
    this.noStore(response);
    const { actor } = await this.active(request, true, csrf);
    return this.external.acknowledge(actor, parse(uuid, transmittalId), parse(acknowledge, body));
  }

  @Get("cad-shares/:shareId")
  async cadShare(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("shareId") shareId: string) {
    this.noStore(response);
    return this.external.cadShare((await this.active(request)).actor, parse(uuid, shareId));
  }

  @Post("projects/:projectId/uploads")
  async uploadStart(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("projectId") projectId: string, @Body() body: unknown) {
    this.noStore(response);
    const { actor } = await this.active(request, true, csrf);
    return this.external.uploadStart(actor, parse(uuid, projectId), parse(uploadStart, body));
  }

  @Put("uploads/:uploadId/chunks/:index")
  async uploadChunk(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Headers("x-chunk-sha256") checksum: string | undefined, @Param("uploadId") uploadId: string, @Param("index") index: string) {
    this.noStore(response);
    const { actor } = await this.active(request, true, csrf);
    if (!request.is("application/octet-stream")) throw new BadRequestException("Upload chunk must use application/octet-stream");
    const chunkIndex = parse(z.coerce.number().int().nonnegative().max(100_000), index);
    const sha256 = parse(z.string().regex(/^[a-fA-F0-9]{64}$/), checksum).toLowerCase();
    const bytes = await this.raw(request, 8 * 1024 * 1024);
    return this.external.uploadChunk(actor, parse(uuid, uploadId), chunkIndex, bytes, sha256);
  }

  @Post("uploads/:uploadId/finalize")
  async uploadFinalize(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("uploadId") uploadId: string) {
    this.noStore(response);
    const { actor } = await this.active(request, true, csrf);
    return this.external.uploadFinalize(actor, parse(uuid, uploadId));
  }

  @Get("uploads/:uploadId/file")
  async uploadFile(@Req() request: Request, @Res() response: Response, @Param("uploadId") uploadId: string) {
    this.noStore(response);
    const { actor } = await this.active(request);
    this.send(response, await this.external.uploadFile(actor, parse(uuid, uploadId)) as StreamFile, true);
  }
}

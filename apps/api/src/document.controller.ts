import { BadRequestException, Controller, Get, Headers, Inject, Param, Post, Put, Body, Query, Req, Res, ForbiddenException } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { DocumentService } from "./document.service.js";
import { DOCUMENT_CHUNK_SIZE } from "./document-file-policy.js";

const uuid = z.uuid();
const reason = z.string().trim().min(3).max(1000);
const folderInput = z.object({ name: z.string().trim().min(1).max(160), parentId: uuid.optional(), confidential: z.boolean(), reason }).strict();
const uploadInput = z.object({ folderId: uuid, fileName: z.string().trim().min(1).max(240), mimeType: z.string().max(160), sizeBytes: z.number().int().positive(), confidential: z.boolean(), viewOnly: z.boolean(), reason }).strict();
const grantInput = z.object({ resourceKind: z.enum(["FOLDER", "FILE"]), resourceId: uuid, employeeId: uuid, reason }).strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new BadRequestException("Invalid request"); return result.data; }

@Controller("documents")
export class DocumentController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly documents: DocumentService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private cookie(request: Request) { const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid"; const pair = request.headers.cookie?.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`)); return pair?.slice(name.length + 1); }
  private async actor(request: Request) {
    const active = await this.identity.session(this.cookie(request));
    const actor = await this.projects.actor(active.row.accountId);
    if (actor.kind === "OWNER" && !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner identity setup is required");
    return { active, actor };
  }
  private async mutate(request: Request, csrf?: string) { if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed"); const result = await this.actor(request); this.identity.verifyCsrf(result.active, csrf); return result.actor; }
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }

  @Get("project-picker") async projectPicker(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Query("offset") offset?: string, @Query("limit") limit?: string, @Query("branchId") branchId?: string, @Query("q") q?: string) {
    this.noStore(response);
    const input = parse(z.object({ offset: z.coerce.number().int().min(0).max(100000), limit: z.coerce.number().int().min(1).max(100), branchId: uuid.optional(), q: z.string().trim().max(160).optional() }), { offset: offset ?? 0, limit: limit ?? 50, ...(branchId ? { branchId } : {}), ...(q ? { q } : {}) });
    return this.documents.projectPicker((await this.actor(request)).actor, input.offset, input.limit, { ...(input.branchId ? { branchId: input.branchId } : {}), ...(input.q ? { q: input.q } : {}) });
  }
  @Get("projects/:projectId") async list(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("projectId") projectId: string) { this.noStore(response); return this.documents.list((await this.actor(request)).actor, parse(uuid, projectId)); }
  @Post("projects/:projectId/folders") async createFolder(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("projectId") projectId: string, @Body() body: unknown) { return this.documents.createFolder(await this.mutate(request, csrf), parse(uuid, projectId), parse(folderInput, body)); }
  @Post("projects/:projectId/provision-template") async provisionTemplate(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("projectId") projectId: string) { return this.documents.provisionTemplate(await this.mutate(request, csrf), parse(uuid, projectId)); }
  @Post("folders/:folderId/retry") async retryFolder(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("folderId") folderId: string) { return this.documents.provisionFolder(await this.mutate(request, csrf), parse(uuid, folderId)); }
  @Post("projects/:projectId/uploads") async startUpload(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("projectId") projectId: string, @Body() body: unknown) { return this.documents.startUpload(await this.mutate(request, csrf), parse(uuid, projectId), parse(uploadInput, body)); }
  @Put("uploads/:uploadId/chunks/:index") async chunk(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Headers("x-chunk-sha256") checksum: string | undefined, @Param("uploadId") uploadId: string, @Param("index") index: string) {
    const actor = await this.mutate(request, csrf);
    if (!request.is("application/octet-stream") || !checksum || !/^[0-9a-f]{64}$/i.test(checksum) || !/^(0|[1-9]\d{0,6})$/.test(index)) throw new BadRequestException("Invalid chunk request");
    const chunks: Buffer[] = []; let size = 0;
    for await (const part of request) { const bytes = Buffer.from(part); size += bytes.length; if (size > DOCUMENT_CHUNK_SIZE) throw new BadRequestException("Chunk is too large"); chunks.push(bytes); }
    return this.documents.writeChunk(actor, parse(uuid, uploadId), Number(index), Buffer.concat(chunks), checksum);
  }
  @Post("uploads/:uploadId/finalize") async finalize(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("uploadId") uploadId: string) { return this.documents.finalize(await this.mutate(request, csrf), parse(uuid, uploadId)); }
  @Get("files/:fileId/stream") async stream(@Req() request: Request, @Res() response: Response, @Param("fileId") fileId: string) {
    const file = await this.documents.stream((await this.actor(request)).actor, parse(uuid, fileId));
    this.noStore(response); response.setHeader("Content-Type", file.mimeType); response.setHeader("Content-Length", String(file.size));
    response.setHeader("X-Content-Type-Options", "nosniff"); response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    file.stream.on("error", () => response.destroy());
    response.on("close", () => file.stream.destroy());
    file.stream.pipe(response);
  }
  @Get("projects/:projectId/grants") async grants(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("projectId") projectId: string) { this.noStore(response); return this.documents.grants((await this.actor(request)).actor, parse(uuid, projectId)); }
  @Post("projects/:projectId/grants") async grant(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("projectId") projectId: string, @Body() body: unknown) { return this.documents.grant(await this.mutate(request, csrf), parse(uuid, projectId), parse(grantInput, body)); }
  @Post("grants/:grantId/revoke") async revoke(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("grantId") grantId: string, @Body() body: unknown) { return this.documents.revokeGrant(await this.mutate(request, csrf), parse(uuid, grantId), parse(z.object({ reason }).strict(), body).reason); }
  @Get("reconciliation") async reconciliation(@Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.documents.reconciliation((await this.actor(request)).actor); }
  @Post("reconciliation") async reconcile(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined) { return this.documents.reconcile(await this.mutate(request, csrf)); }
}

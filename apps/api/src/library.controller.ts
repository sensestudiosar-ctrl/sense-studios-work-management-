import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Put, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { LibraryService } from "./library.service.js";
import { DOCUMENT_CHUNK_SIZE } from "./document-file-policy.js";

const uuid = z.uuid();
const reason = z.string().trim().min(3).max(1000);
const command = { commandId: uuid, reason };
const kind = z.enum(["SOP", "KNOWLEDGE", "MODULE"]);
const audience = z.enum(["ORGANIZATION", "BRANCH", "TEAM"]);
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new BadRequestException("Invalid library request"); return result.data; }

@Controller("library")
export class LibraryController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly library: LibraryService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private cookie(request: Request) { const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid"; const pair = request.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`)); return pair?.slice(name.length + 1); }
  private async actor(request: Request) {
    const active = await this.identity.session(this.cookie(request));
    const actor = await this.projects.actor(active.row.accountId);
    if (!["OWNER", "STAFF"].includes(actor.kind) || actor.kind === "OWNER" && !await this.identity.ownerReady(actor.accountId)) throw new ForbiddenException("Internal identity required");
    return { active, actor: { ...actor, sessionId: active.row.id } };
  }
  private async mutate(request: Request, csrf?: string) {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const result = await this.actor(request); this.identity.verifyCsrf(result.active, csrf); return result.actor;
  }
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }

  @Get("setup") async setup(@Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.library.setup((await this.actor(request)).actor); }
  @Get() async list(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Query("kind") rawKind: unknown, @Query("search") rawSearch: unknown) {
    this.noStore(response);
    const input: { kind?: "SOP" | "KNOWLEDGE" | "MODULE"; search?: string } = {};
    if (rawKind !== undefined) input.kind = parse(kind, rawKind);
    if (rawSearch !== undefined) input.search = parse(z.string().max(120), rawSearch);
    return this.library.list((await this.actor(request)).actor, input);
  }
  @Get(":recordId") async detail(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("recordId") recordId: string) { this.noStore(response); return this.library.detail((await this.actor(request)).actor, parse(uuid, recordId)); }
  @Post() async create(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) {
    const input = parse(z.object({ ...command, kind, title: z.string().trim().min(1).max(160), category: z.string().trim().min(1).max(80), audience, branchId: uuid.optional(), teamId: uuid.optional(), content: z.unknown().refine((value) => value !== undefined), acknowledgementRequired: z.boolean() }).strict(), body);
    const { branchId, teamId, ...required } = input;
    return this.library.create(await this.mutate(request, csrf), { ...required, ...(branchId ? { branchId } : {}), ...(teamId ? { teamId } : {}) });
  }
  @Post(":recordId/versions") async appendVersion(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("recordId") recordId: string, @Body() body: unknown) {
    const input = parse(z.object({ ...command, expectedVersion: z.number().int().positive(), content: z.unknown().refine((value) => value !== undefined), acknowledgementRequired: z.boolean() }).strict(), body);
    return this.library.appendVersion(await this.mutate(request, csrf), parse(uuid, recordId), input);
  }
  @Post(":recordId/activate") async activateModule(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("recordId") recordId: string, @Body() body: unknown) {
    const input = parse(z.object({ ...command, expectedVersion: z.number().int().positive() }).strict(), body);
    return this.library.activateModule(await this.mutate(request, csrf), parse(uuid, recordId), input);
  }
  @Post(":recordId/publication-requests") async requestPublication(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("recordId") recordId: string, @Body() body: unknown) {
    const input = parse(z.object({ ...command, versionId: uuid, approverAccountId: uuid }).strict(), body);
    return this.library.requestPublication(await this.mutate(request, csrf), parse(uuid, recordId), input);
  }
  @Post("publication-requests/:requestId/decision") async decidePublication(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("requestId") requestId: string, @Body() body: unknown) {
    const input = parse(z.object({ commandId: uuid, outcome: z.enum(["APPROVED", "REJECTED"]), reason }).strict(), body);
    return this.library.decidePublication(await this.mutate(request, csrf), parse(uuid, requestId), input);
  }
  @Post(":recordId/publish") async publishDirect(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("recordId") recordId: string, @Body() body: unknown) {
    const input = parse(z.object({ commandId: uuid, versionId: uuid, reason }).strict(), body);
    return this.library.publishDirect(await this.mutate(request, csrf), parse(uuid, recordId), input);
  }
  @Post(":recordId/uploads") async startUpload(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("recordId") recordId: string, @Body() body: unknown) {
    const input = parse(z.object({ ...command, name: z.string().trim().min(1).max(160), mime: z.string().trim().min(1).max(100), bytes: z.number().int().positive() }).strict(), body);
    return this.library.startUpload(await this.mutate(request, csrf), { ...input, recordId: parse(uuid, recordId) });
  }
  @Put("uploads/:uploadId/chunks/:index") async chunk(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Headers("x-chunk-sha256") checksum: string | undefined, @Param("uploadId") uploadId: string, @Param("index") rawIndex: string) {
    const actor = await this.mutate(request, csrf);
    if (!request.is("application/octet-stream") || !checksum || !/^[0-9a-f]{64}$/i.test(checksum) || !/^(0|[1-9]\d{0,6})$/.test(rawIndex)) throw new BadRequestException("Invalid chunk request");
    const chunks: Buffer[] = []; let size = 0;
    for await (const part of request) { const bytes = Buffer.from(part); size += bytes.length; if (size > DOCUMENT_CHUNK_SIZE) throw new BadRequestException("Chunk is too large"); chunks.push(bytes); }
    return this.library.writeChunk(actor, parse(uuid, uploadId), Number(rawIndex), Buffer.concat(chunks), checksum);
  }
  @Post("uploads/:uploadId/finalize") async finalizeUpload(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("uploadId") uploadId: string, @Body() body: unknown) {
    const input = parse(z.object({ commandId: uuid, reason }).strict(), body);
    return this.library.finalizeUpload(await this.mutate(request, csrf), parse(uuid, uploadId), input);
  }
  @Get("files/:fileId/stream") async streamFile(@Req() request: Request, @Res() response: Response, @Param("fileId") fileId: string) {
    const file = await this.library.streamFile((await this.actor(request)).actor, parse(uuid, fileId));
    this.noStore(response); response.setHeader("Content-Type", file.mime); response.setHeader("Content-Length", String(file.size));
    response.setHeader("X-Content-Type-Options", "nosniff"); response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    file.stream.on("error", () => response.destroy()); response.on("close", () => file.stream.destroy()); file.stream.pipe(response);
  }
  @Post("versions/:versionId/acknowledgements") async acknowledge(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("versionId") versionId: string, @Body() body: unknown) {
    return this.library.acknowledge(await this.mutate(request, csrf), parse(uuid, versionId), parse(z.object(command).strict(), body));
  }
  @Post("references") async reference(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) {
    const input = parse(z.object({ ...command, versionId: uuid, taskId: uuid.optional(), templateVersionId: uuid.optional() }).strict(), body);
    const { taskId, templateVersionId, ...required } = input;
    return this.library.createReference(await this.mutate(request, csrf), { ...required, ...(taskId ? { taskId } : {}), ...(templateVersionId ? { templateVersionId } : {}) });
  }
}

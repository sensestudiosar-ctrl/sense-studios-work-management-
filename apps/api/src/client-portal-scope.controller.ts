import { BadRequestException, Body, Controller, ForbiddenException, Get, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { PublicRoute } from "./auth.guard.js";
import { ClientPortalIdentityService } from "./client-portal-identity.service.js";
import { ClientPortalScopeService } from "./client-portal-scope.service.js";
import { ClientPortalFilesService } from "./client-portal-files.service.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";

const reason = z.string().trim().min(3).max(1000);
const invitation = z.object({ email: z.email().max(320), reason }).strict();
const itemGrant = z.object({ itemId: z.uuid(), portalGrantId: z.uuid(), expectedVersion: z.number().int().nonnegative(), view: z.boolean(), comment: z.boolean(), review: z.boolean(), approve: z.boolean(), download: z.boolean(), reason }).strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new BadRequestException("Invalid request");
  return parsed.data;
}

@Controller("client-portal")
@PublicRoute()
export class ClientPortalScopeController {
  constructor(private readonly identity: ClientPortalIdentityService, private readonly scope: ClientPortalScopeService, private readonly files: ClientPortalFilesService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private async active(request: Request, write = false) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_client_sid" : "sense_client_sid";
    const cookie = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
    const active = await this.identity.session(cookie);
    if (write) {
      if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
      this.identity.verifyCsrf(active, request.get("x-csrf-token"));
    }
    return active;
  }
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  @Get("projects")
  async projects(@Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.scope.projects(await this.active(request)); }
  @Get("projects/:id/handover")
  async handover(@Param("id") id: string, @Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.files.handover(await this.active(request), parse(z.uuid(), id)); }
  @Post("handover/:id/acknowledge")
  async acknowledge(@Param("id") id: string, @Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.files.acknowledge(await this.active(request, true), parse(z.uuid(), id), parse(z.object({ note: z.string().trim().min(1).max(1000), reason }).strict(), body)); }
  @Get("projects/:id/access")
  async access(@Param("id") id: string, @Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.scope.access(await this.active(request), parse(z.uuid(), id)); }
  @Post("projects/:id/invitations")
  async invite(@Param("id") id: string, @Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.scope.invite(await this.active(request, true), parse(z.uuid(), id), parse(invitation, body)); }
  @Post("item-grants")
  async grant(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.scope.setItemGrant(await this.active(request, true), parse(itemGrant, body)); }
  private send(response: Response, file: Awaited<ReturnType<ClientPortalFilesService["stream"]>>, download: boolean) {
    this.noStore(response);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'self'; sandbox");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Type", file.mime);
    response.setHeader("Content-Length", file.size);
    response.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    if (file.superseded) response.setHeader("X-Sense-Revision-Warning", "Superseded historical revision");
    response.on("close", () => file.stream.destroy());
    file.stream.on("error", () => response.destroy());
    file.stream.pipe(response);
  }
  @Get("items/:id/stream")
  async stream(@Param("id") id: string, @Req() request: Request, @Res() response: Response) {
    this.noStore(response);
    const download = request.query.download === "1";
    this.send(response, await this.files.stream(await this.active(request), parse(z.uuid(), id), download), download);
  }
  @Post("items/:id/references")
  async reference(@Param("id") id: string, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.noStore(response);
    const active = await this.active(request, true);
    const name = parse(z.string().min(1).max(240), request.get("x-file-name"));
    const mime = parse(z.string().min(1).max(160), request.get("x-file-mime"));
    const uploadReason = parse(reason, request.get("x-reason"));
    if (!request.is("application/octet-stream")) throw new BadRequestException("Reference upload must use application/octet-stream");
    const parts: Buffer[] = [];
    let size = 0;
    for await (const part of request) {
      const bytes = Buffer.isBuffer(part) ? part : Buffer.from(part as string);
      size += bytes.length;
      if (size > 8 * 1024 * 1024) throw new BadRequestException("Reference exceeds 8 MiB");
      parts.push(bytes);
    }
    return this.files.reference(active, parse(z.uuid(), id), { name, mime, reason: uploadReason, bytes: Buffer.concat(parts) });
  }
  @Get("references/:id/stream")
  async referenceStream(@Param("id") id: string, @Req() request: Request, @Res() response: Response) { this.noStore(response); this.send(response, await this.files.referenceStream(await this.active(request), parse(z.uuid(), id)), false); }
}

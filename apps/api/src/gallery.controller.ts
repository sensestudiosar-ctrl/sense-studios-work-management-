import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { Inject } from "@nestjs/common";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { GalleryService } from "./gallery.service.js";
import { PublicRoute } from "./auth.guard.js";
import { ClientPortalIdentityService } from "./client-portal-identity.service.js";

const uuid = z.uuid();
const reason = z.string().trim().min(3).max(1000);
const addEntry = z.object({ itemId: uuid, label: z.string().trim().min(1).max(160), reason }).strict();
const prepare = z.object({ sourceFileId: uuid, title: z.string().trim().min(1).max(160), altText: z.string().trim().min(1).max(500), reason, imageBase64: z.string().min(4).max(11_185_000) }).strict();
const transition = z.object({ expectedVersion: z.number().int().positive(), reason }).strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new BadRequestException("Invalid request"); return result.data; }

@Controller("galleries")
export class GalleryController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly galleries: GalleryService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private cookie(request: Request) { const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid"; const pair = request.headers.cookie?.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`)); return pair?.slice(name.length + 1); }
  private async actor(request: Request, csrf?: string, mutate = false) {
    if (mutate && request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const active = await this.identity.session(this.cookie(request));
    if (mutate) this.identity.verifyCsrf(active, csrf);
    const actor = await this.projects.actor(active.row.accountId);
    if (actor.kind === "OWNER" && !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner identity setup is required");
    return actor;
  }
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  @Get("projects/:projectId") async workspace(@Param("projectId") projectId: string, @Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.galleries.gallery(await this.actor(request), parse(uuid, projectId)); }
  @Post("projects/:projectId") async add(@Param("projectId") projectId: string, @Body() body: unknown, @Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.galleries.addEntry(await this.actor(request, csrf, true), parse(uuid, projectId), parse(addEntry, body)); }
}

@Controller("portfolio")
export class PortfolioController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly galleries: GalleryService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private cookie(request: Request) { const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid"; const pair = request.headers.cookie?.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`)); return pair?.slice(name.length + 1); }
  private async actor(request: Request, csrf?: string, mutate = false) {
    if (mutate && request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const active = await this.identity.session(this.cookie(request));
    if (mutate) this.identity.verifyCsrf(active, csrf);
    const actor = await this.projects.actor(active.row.accountId);
    if (actor.kind === "OWNER" && !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner identity setup is required");
    return actor;
  }
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  @Get("projects/:projectId") async workspace(@Param("projectId") projectId: string, @Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.galleries.portfolioWorkspace(await this.actor(request), parse(uuid, projectId)); }
  @Post("projects/:projectId") async prepareDerivative(@Param("projectId") projectId: string, @Body() body: unknown, @Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.galleries.prepare(await this.actor(request, csrf, true), parse(uuid, projectId), parse(prepare, body)); }
  @Post(":id/publish") async publish(@Param("id") id: string, @Body() body: unknown, @Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.galleries.transition(await this.actor(request, csrf, true), parse(uuid, id), "publish", parse(transition, body)); }
  @Post(":id/withdraw") async withdraw(@Param("id") id: string, @Body() body: unknown, @Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.galleries.transition(await this.actor(request, csrf, true), parse(uuid, id), "withdraw", parse(transition, body)); }
}

@Controller("client-portal")
@PublicRoute()
export class ClientGalleryController {
  constructor(private readonly identity: ClientPortalIdentityService, private readonly galleries: GalleryService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  private async active(request: Request) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_client_sid" : "sense_client_sid";
    const cookie = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
    return this.identity.session(cookie);
  }
  @Get("projects/:projectId/gallery") async list(@Param("projectId") projectId: string, @Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.galleries.clientGallery(await this.active(request), parse(uuid, projectId)); }
  @Get("projects/:projectId/gallery/items/:itemId/stream") async stream(@Param("projectId") projectId: string, @Param("itemId") itemId: string, @Req() request: Request, @Res() response: Response) {
    this.noStore(response);
    const file = await this.galleries.clientGalleryStream(await this.active(request), parse(uuid, projectId), parse(uuid, itemId));
    response.setHeader("X-Content-Type-Options", "nosniff"); response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'self'; sandbox"); response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Type", file.mime); response.setHeader("Content-Length", file.size); response.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    response.on("close", () => file.stream.destroy()); file.stream.on("error", () => response.destroy()); file.stream.pipe(response);
  }
}

@Controller("public/portfolio")
@PublicRoute()
export class PublicPortfolioController {
  constructor(private readonly galleries: GalleryService) {}
  @Get() async list(@Res({ passthrough: true }) response: Response) { response.setHeader("Cache-Control", "no-store"); return this.galleries.publicList(); }
  @Get(":id/stream") async stream(@Param("id") id: string, @Res() response: Response) {
    response.setHeader("Cache-Control", "no-store");
    const image = await this.galleries.publicDerivative(parse(uuid, id));
    response.setHeader("X-Content-Type-Options", "nosniff"); response.setHeader("Content-Security-Policy", "default-src 'none'; sandbox"); response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Type", image.mime); response.setHeader("Content-Length", image.bytes.length); response.end(image.bytes);
  }
}

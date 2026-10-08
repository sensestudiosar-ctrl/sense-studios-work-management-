import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Req, Res } from "@nestjs/common";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { AiAssistanceService } from "./ai-assistance.service.js";

const uuid = z.uuid();
type HttpRequest = { headers: { cookie?: string; origin?: string } };
type HttpResponse = { setHeader(name: string, value: string): unknown };

@Controller("ai")
export class AiAssistanceController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly assistance: AiAssistanceService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}

  private async actor(request: HttpRequest) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const cookie = request.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
    const active = await this.identity.session(cookie);
    const actor = await this.projects.actor(active.row.accountId);
    if (!["OWNER", "STAFF"].includes(actor.kind) || actor.kind === "OWNER" && !await this.identity.ownerReady(actor.accountId)) throw new ForbiddenException("Internal identity required");
    return { active, actor: { ...actor, sessionId: active.row.id } };
  }

  private async mutation(request: HttpRequest, csrf: string | undefined) {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const session = await this.actor(request);
    this.identity.verifyCsrf(session.active, csrf);
    return session.actor;
  }

  private id(value: string) { if (!uuid.safeParse(value).success) throw new BadRequestException("Invalid assistance identifier"); return value; }
  private noStore(response: HttpResponse) { response.setHeader("Cache-Control", "no-store"); response.setHeader("Pragma", "no-cache"); }

  @Get("context") async context(@Req() request: HttpRequest, @Res({ passthrough: true }) response: HttpResponse) { this.noStore(response); return this.assistance.context((await this.actor(request)).actor); }
  @Get("runs") async list(@Req() request: HttpRequest, @Res({ passthrough: true }) response: HttpResponse) { this.noStore(response); return this.assistance.listRuns((await this.actor(request)).actor); }
  @Post("runs") async create(@Req() request: HttpRequest, @Res({ passthrough: true }) response: HttpResponse, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) { this.noStore(response); return this.assistance.createRun(await this.mutation(request, csrf), body); }
  @Get("runs/:id") async get(@Req() request: HttpRequest, @Res({ passthrough: true }) response: HttpResponse, @Param("id") id: string) { this.noStore(response); return this.assistance.getRun((await this.actor(request)).actor, this.id(id)); }
  @Post("runs/:id/decisions") async decide(@Req() request: HttpRequest, @Res({ passthrough: true }) response: HttpResponse, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { this.noStore(response); return this.assistance.decide(await this.mutation(request, csrf), this.id(id), body); }
  @Post("runs/:id/outcomes") async outcome(@Req() request: HttpRequest, @Res({ passthrough: true }) response: HttpResponse, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { this.noStore(response); return this.assistance.observeOutcome(await this.mutation(request, csrf), this.id(id), body); }
}


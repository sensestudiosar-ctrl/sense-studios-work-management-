import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { PerformanceService } from "./performance.service.js";
import { parseCommand } from "./performance-calculations.js";

@Controller("performance")
export class PerformanceController {
  constructor(
    private readonly identity: IdentityService,
    private readonly projects: ProjectService,
    private readonly performance: PerformanceService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  private async actor(request: Request) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const cookie = request.headers.cookie?.split(";").map(value => value.trim())
      .find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
    const active = await this.identity.session(cookie);
    const actor = await this.projects.actor(active.row.accountId);
    if (!["OWNER", "STAFF"].includes(actor.kind) || actor.kind === "OWNER" && !await this.identity.ownerReady(actor.accountId)) {
      throw new ForbiddenException("Internal identity required");
    }
    return { active, actor: { ...actor, sessionId: active.row.id } };
  }

  private id(value: string) {
    if (!z.uuid().safeParse(value).success) throw new BadRequestException("Invalid performance subject");
    return value;
  }

  @Get("context")
  async context(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.performance.context((await this.actor(request)).actor);
  }

  @Get("employees/:id")
  async employee(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string) {
    response.setHeader("Cache-Control", "no-store");
    return this.performance.employee((await this.actor(request)).actor, this.id(id));
  }

  @Get("projects/:id")
  async project(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string) {
    response.setHeader("Cache-Control", "no-store");
    return this.performance.project((await this.actor(request)).actor, this.id(id));
  }

  @Post("commands")
  async command(@Req() request: Request, @Res({ passthrough: true }) response: Response,
    @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) {
    response.setHeader("Cache-Control", "no-store");
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const { active, actor } = await this.actor(request);
    this.identity.verifyCsrf(active, csrf);
    return this.performance.command(actor, parseCommand(body));
  }
}

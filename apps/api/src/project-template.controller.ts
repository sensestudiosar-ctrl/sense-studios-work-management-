import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { ProjectTemplateService } from "./project-template.service.js";
import { templateDefinitionSchema } from "./template-definition.js";

const uuid = z.uuid();
const reason = z.string().trim().min(3).max(1000);
const createTemplate = z.object({ name: z.string().trim().min(2).max(160), definition: templateDefinitionSchema, reason }).strict();
const addVersion = z.object({ definition: templateDefinitionSchema, reason }).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Invalid request");
  return result.data;
}

@Controller("project-templates")
export class ProjectTemplateController {
  constructor(
    private readonly identity: IdentityService,
    private readonly projects: ProjectService,
    private readonly templates: ProjectTemplateService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private cookie(request: Request) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const pair = request.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
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

  @Get()
  async list(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    const { actor } = await this.actor(request);
    return this.templates.list(actor);
  }

  @Post()
  async create(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) {
    const actor = await this.mutate(request, csrf);
    return this.templates.create(actor, parse(createTemplate, body));
  }

  @Post(":id/versions")
  async version(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.mutate(request, csrf);
    return this.templates.version(actor, parse(uuid, id), parse(addVersion, body));
  }
}

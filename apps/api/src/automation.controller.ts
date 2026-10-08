import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Put, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { AutomationService } from "./automation.service.js";
import { exportReport, type ReportFormat, type ReportTable } from "./report-exports.js";
import { reportDefinitionSchema } from "./automation-reports.js";

const uuid = z.uuid();
const formatSchema = z.enum(["csv", "xlsx", "pdf", "print"]);
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Invalid automation request");
  return result.data;
}

@Controller("automation")
export class AutomationController {
  constructor(
    private readonly identity: IdentityService,
    private readonly projects: ProjectService,
    private readonly automation: AutomationService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  private async actor(request: Request) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const cookie = request.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
    const active = await this.identity.session(cookie);
    const actor = await this.projects.actor(active.row.accountId);
    if (!["OWNER", "STAFF"].includes(actor.kind) || actor.kind === "OWNER" && !await this.identity.ownerReady(actor.accountId)) throw new ForbiddenException("Internal identity required");
    return { active, actor: { ...actor, sessionId: active.row.id } };
  }

  private async mutation(request: Request, csrf: string | undefined) {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const session = await this.actor(request);
    this.identity.verifyCsrf(session.active, csrf);
    return session.actor;
  }

  private id(value: string): string {
    if (!uuid.safeParse(value).success) throw new BadRequestException("Invalid automation identifier");
    return value;
  }

  private async sendExport(response: Response, table: ReportTable, format: ReportFormat) {
    const exported = await exportReport(table, format);
    const disposition = format === "print" ? "inline" : "attachment";
    const filename = `sense-${table.category}-${table.from}-${table.to}.${exported.extension}`;
    response.setHeader("Content-Type", exported.mimeType);
    response.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
    response.setHeader("X-Content-Type-Options", "nosniff");
    return response.status(200).send(exported.bytes);
  }

  @Get("context") async context(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.automation.context((await this.actor(request)).actor);
  }

  @Post("reports/preview") async preview(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) {
    response.setHeader("Cache-Control", "no-store");
    return this.automation.preview(await this.mutation(request, csrf), parse(reportDefinitionSchema, body));
  }

  @Post("reports") async saveReport(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) {
    response.setHeader("Cache-Control", "no-store");
    return this.automation.saveReport(await this.mutation(request, csrf), body);
  }

  @Put("reports/:id") async updateReport(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    response.setHeader("Cache-Control", "no-store");
    return this.automation.saveReport(await this.mutation(request, csrf), body, this.id(id));
  }

  @Get("reports/:id/preview") async savedPreview(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string) {
    response.setHeader("Cache-Control", "no-store");
    return this.automation.savedPreview((await this.actor(request)).actor, this.id(id));
  }

  @Get("reports/:id/export") async exportSaved(@Req() request: Request, @Res() response: Response, @Param("id") id: string, @Query("format") rawFormat: string) {
    response.setHeader("Cache-Control", "no-store");
    const actor = (await this.actor(request)).actor;
    const format = parse(formatSchema, rawFormat);
    const { table } = await this.automation.savedPreview(actor, this.id(id));
    return this.sendExport(response, table, format);
  }

  @Get("runs/:id/report") async runReport(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string) {
    response.setHeader("Cache-Control", "no-store");
    return this.automation.runReport((await this.actor(request)).actor, this.id(id));
  }

  @Get("runs/:id/report/export") async exportRunReport(@Req() request: Request, @Res() response: Response, @Param("id") id: string, @Query("format") rawFormat: string) {
    response.setHeader("Cache-Control", "no-store");
    const actor = (await this.actor(request)).actor;
    const format = parse(formatSchema, rawFormat);
    const { table } = await this.automation.runReport(actor, this.id(id));
    return this.sendExport(response, table, format);
  }

  @Post("rules") async saveRule(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) {
    response.setHeader("Cache-Control", "no-store");
    return this.automation.saveRule(await this.mutation(request, csrf), body);
  }

  @Put("rules/:id") async updateRule(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    response.setHeader("Cache-Control", "no-store");
    return this.automation.saveRule(await this.mutation(request, csrf), body, this.id(id));
  }

  @Post("runs/:id/decision") async decide(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    response.setHeader("Cache-Control", "no-store");
    return this.automation.decide(await this.mutation(request, csrf), this.id(id), body);
  }
}

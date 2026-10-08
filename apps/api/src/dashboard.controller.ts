import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { DashboardService, dashboardSources } from "./dashboard.service.js";
import { exportReport, type ReportFormat, type ReportTable } from "./report-exports.js";
import { parse, reportFilterSchema, scheduleSchema, snapshotSchema, reminderSchema } from "./dashboard-policy.js";

const formatSchema = z.enum(["csv", "xlsx", "pdf", "print"]);
const exportQuerySchema = reportFilterSchema.extend({ format: formatSchema }).strict();

@Controller()
export class DashboardController {
  constructor(
    private readonly identity: IdentityService,
    private readonly projects: ProjectService,
    private readonly dashboardService: DashboardService,
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

  private async mutation(request: Request, csrf: string | undefined) {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const session = await this.actor(request);
    this.identity.verifyCsrf(session.active, csrf);
    return session.actor;
  }

  private noStore(response: Response): void {
    response.setHeader("Cache-Control", "no-store");
  }

  private id(value: string): string {
    if (!z.uuid().safeParse(value).success) throw new BadRequestException("Invalid dashboard report identifier");
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

  @Get("dashboard")
  async dashboard(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.noStore(response);
    return this.dashboardService.dashboard((await this.actor(request)).actor);
  }

  @Get("dashboard/sources/:source")
  async source(@Req() request: Request, @Res({ passthrough: true }) response: Response,
    @Param("source") source: string) {
    this.noStore(response);
    const selectedSource = parse(z.enum(dashboardSources), source);
    return this.dashboardService.dashboardSource((await this.actor(request)).actor, selectedSource);
  }
  @Get("reports/context")
  async context(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.noStore(response);
    return this.dashboardService.context((await this.actor(request)).actor);
  }

  @Post("reports/preview")
  async preview(@Req() request: Request, @Res({ passthrough: true }) response: Response,
    @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) {
    this.noStore(response);
    const actor = await this.mutation(request, csrf);
    return this.dashboardService.preview(actor, parse(reportFilterSchema, body));
  }

  @Post("reports/snapshots")
  async freeze(@Req() request: Request, @Res({ passthrough: true }) response: Response,
    @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) {
    this.noStore(response);
    const actor = await this.mutation(request, csrf);
    return this.dashboardService.freeze(actor, parse(snapshotSchema, body));
  }

  @Get("reports/snapshots")
  async snapshots(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.noStore(response);
    return this.dashboardService.snapshots((await this.actor(request)).actor);
  }

  @Get("reports/snapshots/:id/export")
  async snapshotExport(@Req() request: Request, @Res() response: Response, @Param("id") id: string, @Query("format") rawFormat: string) {
    this.noStore(response);
    const { actor } = await this.actor(request);
    const format = parse(formatSchema, rawFormat);
    const { table } = await this.dashboardService.snapshot(actor, this.id(id));
    return this.sendExport(response, table, format);
  }

  @Get("reports/snapshots/:id")
  async snapshot(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string) {
    this.noStore(response);
    return this.dashboardService.snapshot((await this.actor(request)).actor, this.id(id));
  }

  @Get("reports/export")
  async export(@Req() request: Request, @Res() response: Response, @Query() query: unknown) {
    this.noStore(response);
    const { actor } = await this.actor(request);
    const { format, ...filter } = parse(exportQuerySchema, query);
    const table = await this.dashboardService.preview(actor, filter);
    return this.sendExport(response, table, format);
  }

  @Get("dashboard/schedules")
  async schedules(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.noStore(response);
    return this.dashboardService.schedules((await this.actor(request)).actor);
  }

  @Post("dashboard/schedules")
  async addSchedule(@Req() request: Request, @Res({ passthrough: true }) response: Response,
    @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) {
    this.noStore(response);
    return this.dashboardService.saveSchedule(await this.mutation(request, csrf), parse(scheduleSchema, body));
  }

  @Post("dashboard/schedules/:id")
  async updateSchedule(@Req() request: Request, @Res({ passthrough: true }) response: Response,
    @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    this.noStore(response);
    return this.dashboardService.saveSchedule(await this.mutation(request, csrf), parse(scheduleSchema, body), this.id(id));
  }

  @Get("dashboard/reminders")
  async reminders(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.noStore(response);
    return this.dashboardService.reminders((await this.actor(request)).actor);
  }

  @Get("dashboard/summaries")
  async summaries(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.noStore(response);
    return this.dashboardService.summaries((await this.actor(request)).actor);
  }

  @Post("dashboard/reminders")
  async addReminder(@Req() request: Request, @Res({ passthrough: true }) response: Response,
    @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown) {
    this.noStore(response);
    return this.dashboardService.addReminder(await this.mutation(request, csrf), parse(reminderSchema, body));
  }
}

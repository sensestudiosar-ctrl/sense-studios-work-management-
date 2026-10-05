import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { SiteService, type SiteOfflineCommand } from "./site.service.js";
import type { ProjectActor } from "./project.service.js";

// S20 staff API boundary.
const uuid = z.uuid();
const reason = z.string().trim().min(3).max(1000);
const common = z.object({ expectedVersion: z.number().int().min(0), reason }).strict();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(year!, month! - 1, day!);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month! - 1 && parsed.getUTCDate() === day;
});
const decimal = z.string().regex(/^\d{1,12}(?:\.\d{1,4})?$/);
const percent = decimal.refine((value) => Number(value) <= 100);
const photos = z.array(uuid).max(20);
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const packageCreate = common.extend({ title: text(2, 160), date, tomorrowPlan: text(1, 2000), plannedPercent: percent, plannedQuantity: decimal, unit: text(1, 40), critical: z.boolean(), releaseId: uuid.optional() }).strict();
const progressInput = common.extend({ actualPercent: percent, actualQuantity: decimal, qualityStatus: z.enum(["PENDING", "PASSED", "FAILED"]), materialStatus: text(1, 500), blockers: text(0, 2000), tomorrowPlan: text(1, 2000), photoIds: photos }).strict();
const manpowerInput = common.extend({ date, trade: text(1, 120), count: z.number().int().min(0).max(10000), employeeAccountIds: z.array(uuid).max(100), note: text(0, 2000) }).strict();
const reportInput = common.extend({ date, workCompleted: text(1, 4000), manpower: z.array(z.object({ trade: text(1, 120), count: z.number().int().min(0).max(10000) }).strict()).max(100), materialsReceived: text(0, 2000), photoIds: photos, issues: text(0, 4000), delayCauses: text(0, 2000), tomorrowPlan: text(1, 2000), supersedesReportId: uuid.optional() }).strict();
const snagInput = common.extend({ title: text(2, 160), description: text(1, 4000), packageId: uuid.optional(), photoIds: photos }).strict();
const assignInput = common.extend({ fixerAccountId: uuid }).strict();
const readyInput = common.extend({ note: text(1, 2000), photoIds: photos }).strict();
const verifierInput = common.extend({ verifierAccountId: uuid }).strict();
const verifyInput = common.extend({ outcome: z.enum(["PASSED", "FAILED"]), note: text(3, 2000), photoIds: photos }).strict();
const handoverInput = common.extend({ note: text(1, 4000) }).strict();
const responsibleInput = common.extend({ accountId: uuid }).strict();
const offlineCommon = { commandId: uuid, localId: uuid, baseRecordVersion: z.number().int().positive().nullable(), reason };
const offlineInput = z.discriminatedUnion("action", [
  z.object({ ...offlineCommon, action: z.literal("NOTE"), payload: z.object({ note: text(1, 4000), photoIds: photos }).strict() }).strict(),
  z.object({ ...offlineCommon, action: z.literal("MANPOWER"), payload: manpowerInput.omit({ expectedVersion: true, reason: true }) }).strict(),
  z.object({ ...offlineCommon, action: z.literal("REPORT"), payload: reportInput.omit({ expectedVersion: true, reason: true }) }).strict(),
  z.object({ ...offlineCommon, action: z.literal("SNAG"), payload: snagInput.omit({ expectedVersion: true, reason: true }) }).strict(),
  z.object({ ...offlineCommon, action: z.literal("PACKAGE_PROGRESS"), payload: progressInput.omit({ expectedVersion: true, reason: true }).extend({ recordId: uuid }).strict() }).strict()
]);
const offlinePhotoInput = z.object({ localId: uuid, folderId: uuid, fileName: text(1, 240), mimeType: text(1, 160), sizeBytes: z.number().int().positive(), reason }).strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new BadRequestException("Invalid request"); return result.data; }
function omitUndefined<T extends object>(value: T): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> };
}

type SiteActor = ProjectActor & { sessionId?: string };

@Controller("site")
export class SiteController {
  constructor(private readonly identity: IdentityService, private readonly projects: ProjectService, private readonly site: SiteService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private async actor(request: Request, write = false, csrf?: string): Promise<SiteActor> {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const cookie = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
    const active = await this.identity.session(cookie);
    const actor = await this.projects.actor(active.row.accountId);
    if (actor.kind === "OWNER" && !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner identity setup required");
    if (write) { if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed"); this.identity.verifyCsrf(active, csrf); }
    return { ...actor, sessionId: active.row.id };
  }
  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  @Post("projects/:id/offline-commands") async offlineCommand(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.site.offlineCommand(await this.actor(request, true, csrf), parse(uuid, id), omitUndefined(parse(offlineInput, body)) as SiteOfflineCommand); }
  @Post("projects/:id/offline-photos") async offlinePhoto(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.site.offlinePhoto(await this.actor(request, true, csrf), parse(uuid, id), parse(offlinePhotoInput, body)); }
  @Get("projects") async list(@Req() request: Request, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.site.projects(await this.actor(request)); }
  @Get("projects/:id") async detail(@Req() request: Request, @Param("id") id: string, @Res({ passthrough: true }) response: Response) { this.noStore(response); return this.site.detail(await this.actor(request), parse(uuid, id)); }
  @Post("projects/:id/responsible") async responsible(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.responsible(await this.actor(request, true, csrf), parse(uuid, id), parse(responsibleInput, body)); }
  @Post("projects/:id/packages") async createPackage(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.createPackage(await this.actor(request, true, csrf), parse(uuid, id), omitUndefined(parse(packageCreate, body))); }
  @Post("packages/:id/progress") async progress(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.progress(await this.actor(request, true, csrf), parse(uuid, id), parse(progressInput, body)); }
  @Post("packages/:id/complete") async completePackage(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.completePackage(await this.actor(request, true, csrf), parse(uuid, id), parse(common, body)); }
  @Post("projects/:id/manpower") async manpower(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.manpower(await this.actor(request, true, csrf), parse(uuid, id), parse(manpowerInput, body)); }
  @Post("projects/:id/reports") async report(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.report(await this.actor(request, true, csrf), parse(uuid, id), omitUndefined(parse(reportInput, body))); }
  @Post("reports/:id/confirm") async confirmReport(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.confirmReport(await this.actor(request, true, csrf), parse(uuid, id), parse(common, body)); }
  @Post("projects/:id/snags") async snag(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.snag(await this.actor(request, true, csrf), parse(uuid, id), omitUndefined(parse(snagInput, body))); }
  @Post("snags/:id/assign") async assignFixer(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.assignFixer(await this.actor(request, true, csrf), parse(uuid, id), parse(assignInput, body)); }
  @Post("snags/:id/start") async startRepair(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.startRepair(await this.actor(request, true, csrf), parse(uuid, id), parse(common, body)); }
  @Post("snags/:id/ready") async readyRepair(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.readyRepair(await this.actor(request, true, csrf), parse(uuid, id), parse(readyInput, body)); }
  @Post("snags/:id/verifier") async appointVerifier(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.appointVerifier(await this.actor(request, true, csrf), parse(uuid, id), parse(verifierInput, body)); }
  @Post("snags/:id/verify") async verify(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.verify(await this.actor(request, true, csrf), parse(uuid, id), parse(verifyInput, body)); }
  @Post("snags/:id/close") async closeSnag(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.closeSnag(await this.actor(request, true, csrf), parse(uuid, id), parse(common, body)); }
  @Post("projects/:id/handover") async handover(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Param("id") id: string, @Body() body: unknown) { return this.site.handover(await this.actor(request, true, csrf), parse(uuid, id), parse(handoverInput, body)); }
}

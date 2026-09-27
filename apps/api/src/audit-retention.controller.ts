import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Put, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { AuditRetentionBackupDisposition } from "./generated/prisma/client.js";
import { IdentityService } from "./identity.service.js";
import { AuditRetentionService } from "./audit-retention.service.js";

const uuid = z.uuid();
const reason = z.string().trim().min(10).max(1000);
const pagination = z.object({
  cursor: uuid.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  eventKey: z.string().trim().min(1).max(160).optional(),
  subjectId: z.string().trim().min(1).max(200).optional()
}).strict();
const configBody = z.object({ noticeIntervalDays: z.number().int().min(1).max(3650).nullable() }).strict();
const holdBody = z.object({ reason }).strict();
const correctionBody = z.object({
  reason,
  correction: z.record(z.string().min(1).max(80), z.union([z.string().max(1000), z.number().finite(), z.boolean(), z.null()]))
    .refine((value) => Object.keys(value).length > 0 && Object.keys(value).length <= 50
      && Object.entries(value).every(([key, item]) => !/(?:password|passkey|credential|session|csrf|token|recovery|secret|private.?key|nas.?path|file.?path|storage.?key)/i.test(key)
        && !(typeof item === "string" && (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(item)
          || /\bBearer\s+\S+/i.test(item)
          || /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/.test(item)
          || /(?:[A-Za-z]:\\|\\\\[^\\]+\\|\/(?:mnt|nas|srv|volume|shares?)\/)/i.test(item)))))
}).strict();
const acknowledgementBody = z.object({
  backupDisposition: z.enum(AuditRetentionBackupDisposition),
  evidenceRef: z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9._:-]+$/).optional()
}).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Invalid request");
  return result.data;
}

@Controller("audit")
export class AuditRetentionController {
  constructor(
    private readonly identity: IdentityService,
    private readonly retention: AuditRetentionService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private cookie(request: Request): string | undefined {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const pair = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return pair?.slice(name.length + 1);
  }

  private async owner(request: Request) {
    const active = await this.identity.session(this.cookie(request));
    if (active.row.account.kind !== "OWNER" || !(await this.identity.ownerReady(active.row.accountId))) {
      throw new ForbiddenException("Owner identity setup is required");
    }
    return active;
  }

  private async mutation(request: Request, csrfToken?: string) {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const active = await this.owner(request);
    this.identity.verifyCsrf(active, csrfToken);
    if (active.row.createdAt.getTime() + 5 * 60_000 <= Date.now()) {
      throw new ForbiddenException("Sign in again before changing audit retention");
    }
    return active;
  }

  @Get("events")
  async searchEvents(@Req() request: Request, @Query() query: Record<string, unknown>) {
    await this.owner(request);
    const input = parse(pagination, query);
    return this.retention.searchEvents({
      limit: input.limit,
      ...(input.cursor ? { cursor: input.cursor } : {}),
      ...(input.eventKey ? { eventKey: input.eventKey } : {}),
      ...(input.subjectId ? { subjectId: input.subjectId } : {})
    });
  }

  @Post("events/:eventId/corrections")
  async correctEvent(@Req() request: Request, @Param("eventId") eventId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    if (!uuid.safeParse(eventId).success) throw new BadRequestException("Invalid audit event");
    const input = parse(correctionBody, body);
    return this.retention.createCorrection(active.row.accountId, eventId, input.reason, input.correction);
  }

  @Get("retention")
  async overview(@Req() request: Request) {
    await this.owner(request);
    return this.retention.retentionOverview();
  }

  @Put("retention/config")
  async configure(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    const input = parse(configBody, body);
    return this.retention.configureNoticeInterval(active.row.accountId, input.noticeIntervalDays);
  }

  @Post("events/:eventId/holds")
  async placeHold(@Req() request: Request, @Param("eventId") eventId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    if (!uuid.safeParse(eventId).success) throw new BadRequestException("Invalid audit event");
    const input = parse(holdBody, body);
    return this.retention.placeHold(active.row.accountId, eventId, input.reason);
  }

  @Post("retention/holds/:holdId/release")
  async releaseHold(@Req() request: Request, @Param("holdId") holdId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    if (!uuid.safeParse(holdId).success) throw new BadRequestException("Invalid retention hold");
    const input = parse(holdBody, body);
    return this.retention.releaseHold(active.row.accountId, holdId, input.reason);
  }

  @Post("retention/notices/:noticeId/acknowledge")
  async acknowledgeNotice(@Req() request: Request, @Param("noticeId") noticeId: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.mutation(request, csrfToken);
    if (!uuid.safeParse(noticeId).success) throw new BadRequestException("Invalid retention notice");
    const input = parse(acknowledgementBody, body);
    return this.retention.acknowledgeNotice(active.row.accountId, noticeId, input.backupDisposition, input.evidenceRef);
  }
}

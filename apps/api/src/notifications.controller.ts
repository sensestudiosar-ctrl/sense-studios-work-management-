import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Patch, Post, Put, Query, Req, Res, Inject } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { NotificationChannel } from "./generated/prisma/client.js";
import { NotificationsService } from "./notifications.service.js";
import { EmailVerificationService } from "./email-verification.service.js";

const preferenceBody = z.object({ category: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,99}$/), channel: z.enum(NotificationChannel), enabled: z.boolean() }).strict();
const quietHoursBody = z.object({ startLocal: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endLocal: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), timeZone: z.string().min(1).max(100) }).strict();
const verificationCodeBody = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Invalid request");
  return result.data;
}

@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly identity: IdentityService,
    private readonly notifications: NotificationsService,
    private readonly emailVerification: EmailVerificationService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private cookie(request: Request): string | undefined {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const pair = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return pair?.slice(name.length + 1);
  }

  private async active(request: Request) { return this.identity.session(this.cookie(request)); }

  private async verifyMutation(request: Request, csrfToken: string | undefined) {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const active = await this.active(request);
    this.identity.verifyCsrf(active, csrfToken);
    return active;
  }

  @Get()
  async inbox(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Query("cursor") cursor?: string) {
    response.setHeader("Cache-Control", "no-store");
    if (cursor && !z.uuid().safeParse(cursor).success) throw new BadRequestException("Invalid notification cursor");
    const active = await this.active(request);
    return this.notifications.listInbox(active.row.accountId, cursor);
  }

  /**
   * Read-only unread summary for the caller's own account. No cursor, no
   * paging, no cross-account read — the count is derived from the same
   * predicate as `listInbox`, so a badge and its inbox cannot disagree.
   */
  @Get("unread")
  async unread(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    const active = await this.active(request);
    return this.notifications.unreadSummary(active.row.accountId);
  }

  @Patch(":id/read")
  async markRead(@Req() request: Request, @Param("id") id: string, @Headers("x-csrf-token") csrfToken?: string) {
    const active = await this.verifyMutation(request, csrfToken);
    if (!z.uuid().safeParse(id).success) throw new BadRequestException("Invalid notification");
    return this.notifications.markRead(active.row.accountId, id);
  }

  @Get("preferences")
  async preferences(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    const active = await this.active(request);
    return this.notifications.getPreferences(active.row.accountId);
  }

  @Get("email-status")
  async emailStatus(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    const active = await this.active(request);
    const [verification, items] = await Promise.all([
      this.emailVerification.status(active.row.accountId),
      this.notifications.getEmailDeliveryStatus(active.row.accountId)
    ]);
    return { ...verification, items };
  }

  @Post("email-verification")
  async requestEmailVerification(@Req() request: Request, @Headers("x-csrf-token") csrfToken?: string) {
    const active = await this.verifyMutation(request, csrfToken);
    return this.emailVerification.requestCode(active.row.accountId);
  }

  @Post("email-verification/verify")
  async verifyEmail(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.verifyMutation(request, csrfToken);
    return this.emailVerification.verifyCode(active.row.accountId, parse(verificationCodeBody, body).code);
  }

  @Put("preferences")
  async setPreference(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.verifyMutation(request, csrfToken);
    const input = parse(preferenceBody, body);
    return this.notifications.setPreference(active.row.accountId, input.category, input.channel, input.enabled);
  }

  @Put("quiet-hours")
  async setQuietHours(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    const active = await this.verifyMutation(request, csrfToken);
    return this.notifications.setQuietHours(active.row.accountId, parse(quietHoursBody, body));
  }

  @Delete("quiet-hours")
  async clearQuietHours(@Req() request: Request, @Headers("x-csrf-token") csrfToken?: string) {
    const active = await this.verifyMutation(request, csrfToken);
    return this.notifications.clearQuietHours(active.row.accountId);
  }
}

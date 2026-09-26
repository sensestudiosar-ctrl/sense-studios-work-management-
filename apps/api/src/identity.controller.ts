import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, HttpCode, HttpException, Inject, Param, Post, Query, Req, Res, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { PublicRoute } from "./auth.guard.js";

const emailBody = z.object({ email: z.email().max(320) }).strict();
const bootstrapBody = emailBody.extend({ secret: z.string().min(32).max(512) });
const ceremonyBody = z.object({ ceremonyId: z.uuid(), response: z.object({ id: z.string().min(1).max(2048) }).passthrough() }).strict();
const tokenBody = z.object({ token: z.string().min(32).max(512) }).strict();
const invitationVerifyBody = ceremonyBody.extend({ token: z.string().min(32).max(512) });
const recoveryBody = z.object({ reason: z.string().trim().min(10).max(1000), verifiedOutOfBand: z.literal(true) }).strict();
const reasonBody = z.object({ reason: z.string().trim().min(10).max(1000) }).strict();
const ownerRecoveryOptionsBody = emailBody.extend({ code: z.string().min(32).max(512) });
const ownerRecoveryVerifyBody = ceremonyBody.extend({ email: z.email().max(320), code: z.string().min(32).max(512) });
const recoveryAckBody = z.object({ confirmedStoredOffline: z.literal(true) }).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Invalid request");
  return result.data;
}

@Controller("auth")
export class IdentityController {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly identity: IdentityService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}

  private origin(request: Request): void {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
  }

  private limit(key: string, maximum: number): void {
    const now = Date.now();
    const entry = this.attempts.get(key);
    if (!entry || entry.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    } else if (++entry.count > maximum) {
      throw new HttpException("Too many attempts", 429);
    }
    if (this.attempts.size > 10_000) this.attempts.clear();
  }

  private throttle(request: Request, action: string, identifier?: string): void {
    this.limit(`${request.ip ?? "unknown"}:${action}`, 300);
    if (identifier) this.limit(`${action}:${identifier.trim().toLowerCase()}`, 20);
  }

  private cookieName(): string {
    return this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
  }

  private cookie(request: Request): string | undefined {
    const name = this.cookieName();
    const pair = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return pair?.slice(name.length + 1);
  }

  private setSessionCookie(response: Response, secret: string): void {
    response.cookie(this.cookieName(), secret, {
      httpOnly: true,
      secure: this.config.webOrigin.startsWith("https:"),
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60_000
    });
  }

  private clearSessionCookie(response: Response): void {
    response.clearCookie(this.cookieName(), { path: "/", sameSite: "lax", secure: this.config.webOrigin.startsWith("https:") });
  }

  private requireRecentAuthentication(createdAt: Date): void {
    if (createdAt.getTime() + 5 * 60_000 <= Date.now()) {
      throw new ForbiddenException("Sign in again before changing credentials or recovery settings");
    }
  }

  @Post("bootstrap/options")
  @PublicRoute()
  async bootstrapOptions(@Req() request: Request, @Body() body: unknown) {
    this.origin(request);
    const input = parse(bootstrapBody, body);
    this.throttle(request, "bootstrap", input.email);
    return this.identity.bootstrapOptions(input.email, input.secret);
  }

  @Post("bootstrap/verify")
  @PublicRoute()
  async bootstrapVerify(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown) {
    this.origin(request);
    this.throttle(request, "bootstrap");
    const input = parse(ceremonyBody, body);
    const result = await this.identity.registerVerify(input.ceremonyId, input.response as unknown as RegistrationResponseJSON, "bootstrap", undefined, request.headers["user-agent"], request.ip);
    if (!result) throw new UnauthorizedException("Authentication failed");
    this.setSessionCookie(response, result.secret);
    return { authenticated: true };
  }

  @Post("passkey/login/options")
  @PublicRoute()
  async loginOptions(@Req() request: Request, @Body() body: unknown) {
    this.origin(request);
    const input = parse(emailBody, body);
    this.throttle(request, "login", input.email);
    return this.identity.loginOptions(input.email);
  }

  @Post("passkey/login/verify")
  @PublicRoute()
  async loginVerify(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown) {
    this.origin(request);
    this.throttle(request, "login");
    const input = parse(ceremonyBody, body);
    const result = await this.identity.loginVerify(input.ceremonyId, input.response as unknown as AuthenticationResponseJSON, request.headers["user-agent"], request.ip);
    this.setSessionCookie(response, result.secret);
    return { authenticated: true };
  }

  @Get("session")
  @PublicRoute()
  async session(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      const active = await this.identity.session(this.cookie(request));
      response.setHeader("Cache-Control", "no-store");
      return {
        account: { id: active.row.account.id, email: active.row.account.normalizedEmail, kind: active.row.account.kind },
        csrfToken: active.csrfToken,
        ownerSetupRequired: active.row.account.kind === "OWNER" ? !(await this.identity.ownerReady(active.row.account.id)) : false,
        activePasskeyCount: await this.identity.activePasskeyCount(active.row.account.id)
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) this.clearSessionCookie(response);
      throw error;
    }
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrfToken?: string) {
    this.origin(request);
    const active = await this.identity.session(this.cookie(request));
    this.identity.verifyCsrf(active, csrfToken);
    await this.identity.logout(this.cookie(request));
    this.clearSessionCookie(response);
  }

  @Get("sessions")
  async sessions(@Req() request: Request) {
    const active = await this.identity.session(this.cookie(request));
    const rows = await this.identity.listSessions(active.row.accountId);
    return rows.map((row) => ({ ...row, current: row.id === active.row.id }));
  }

  @Delete("sessions/:id")
  @HttpCode(204)
  async revoke(@Req() request: Request, @Param("id") id: string, @Headers("x-csrf-token") csrfToken?: string) {
    this.origin(request);
    const active = await this.identity.session(this.cookie(request));
    this.identity.verifyCsrf(active, csrfToken);
    if (!z.uuid().safeParse(id).success) throw new BadRequestException("Invalid session");
    await this.identity.revokeSession(active.row.accountId, id);
  }

  @Post("passkey/register/options")
  async registerOptions(@Req() request: Request, @Headers("x-csrf-token") csrfToken?: string) {
    this.origin(request);
    const active = await this.identity.session(this.cookie(request));
    this.identity.verifyCsrf(active, csrfToken);
    this.requireRecentAuthentication(active.row.createdAt);
    return this.identity.beginRegistration(active.row.accountId);
  }

  @Post("passkey/register/verify")
  async registerVerify(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    this.origin(request);
    const active = await this.identity.session(this.cookie(request));
    this.identity.verifyCsrf(active, csrfToken);
    this.requireRecentAuthentication(active.row.createdAt);
    const input = parse(ceremonyBody, body);
    await this.identity.registerVerify(input.ceremonyId, input.response as unknown as RegistrationResponseJSON, "active", active.row.accountId);
    return { registered: true };
  }

  @Post("staff/invitations")
  async inviteStaff(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    this.origin(request);
    const active = await this.identity.session(this.cookie(request));
    this.identity.verifyCsrf(active, csrfToken);
    this.requireRecentAuthentication(active.row.createdAt);
    const input = parse(emailBody, body);
    return this.identity.inviteStaff(active.row.accountId, input.email);
  }

  @Post("staff/invitations/options")
  @PublicRoute()
  async invitationOptions(@Req() request: Request, @Body() body: unknown) {
    this.origin(request);
    this.throttle(request, "invitation");
    return this.identity.invitationOptions(parse(tokenBody, body).token);
  }

  @Post("staff/invitations/verify")
  @PublicRoute()
  async invitationVerify(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown) {
    this.origin(request);
    this.throttle(request, "invitation");
    const input = parse(invitationVerifyBody, body);
    const result = await this.identity.invitationVerify(input.token, input.ceremonyId, input.response as unknown as RegistrationResponseJSON, request.headers["user-agent"], request.ip);
    if (!result) throw new UnauthorizedException("Authentication failed");
    this.setSessionCookie(response, result.secret);
    return { authenticated: true };
  }

  @Post("staff/:id/recovery")
  async staffRecovery(@Req() request: Request, @Param("id") id: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    this.origin(request);
    const active = await this.identity.session(this.cookie(request));
    this.identity.verifyCsrf(active, csrfToken);
    this.requireRecentAuthentication(active.row.createdAt);
    if (!z.uuid().safeParse(id).success) throw new BadRequestException("Invalid account");
    const input = parse(recoveryBody, body);
    return this.identity.authorizeStaffRecovery(active.row.accountId, id, input.reason);
  }

  @Get("staff")
  async lookupStaff(@Req() request: Request, @Query("email") email: string | undefined) {
    const active = await this.identity.session(this.cookie(request));
    const parsed = z.email().max(320).safeParse(email);
    if (!parsed.success) throw new BadRequestException("Invalid email");
    return { account: await this.identity.lookupStaff(active.row.accountId, parsed.data) };
  }

  @Post("staff/:id/revoke-sessions")
  async forceLogoutStaff(@Req() request: Request, @Param("id") id: string, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    this.origin(request);
    const active = await this.identity.session(this.cookie(request));
    this.identity.verifyCsrf(active, csrfToken);
    this.requireRecentAuthentication(active.row.createdAt);
    if (!z.uuid().safeParse(id).success) throw new BadRequestException("Invalid account");
    const input = parse(reasonBody, body);
    return { revokedSessions: await this.identity.forceLogoutStaff(active.row.accountId, id, input.reason) };
  }

  @Post("owner/recovery-code")
  async issueOwnerRecoveryCode(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined) {
    this.origin(request);
    const active = await this.identity.session(this.cookie(request));
    this.identity.verifyCsrf(active, csrfToken);
    this.requireRecentAuthentication(active.row.createdAt);
    return this.identity.issueOwnerRecoveryCode(active.row.accountId);
  }

  @Post("owner/recovery-code/ack")
  @HttpCode(204)
  async acknowledgeOwnerRecoveryCode(@Req() request: Request, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    this.origin(request);
    const active = await this.identity.session(this.cookie(request));
    this.identity.verifyCsrf(active, csrfToken);
    parse(recoveryAckBody, body);
    await this.identity.acknowledgeOwnerRecoveryCode(active.row.accountId);
  }

  @Post("owner/recovery/options")
  @PublicRoute()
  async ownerRecoveryOptions(@Req() request: Request, @Body() body: unknown) {
    this.origin(request);
    const input = parse(ownerRecoveryOptionsBody, body);
    this.throttle(request, "owner-recovery", input.email);
    return this.identity.ownerRecoveryOptions(input.email, input.code);
  }

  @Post("owner/recovery/verify")
  @PublicRoute()
  async ownerRecoveryVerify(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown) {
    this.origin(request);
    this.throttle(request, "owner-recovery");
    const input = parse(ownerRecoveryVerifyBody, body);
    const result = await this.identity.ownerRecoveryVerify(input.email, input.code, input.ceremonyId, input.response as unknown as RegistrationResponseJSON, request.headers["user-agent"], request.ip);
    if (!result) throw new UnauthorizedException("Recovery unavailable");
    this.setSessionCookie(response, result.secret);
    return { authenticated: true };
  }
}

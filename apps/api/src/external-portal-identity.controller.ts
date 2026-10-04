import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, HttpCode, HttpException, Inject, Param, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { PublicRoute } from "./auth.guard.js";
import { ExternalPortalIdentityService } from "./external-portal-identity.service.js";

const emailBody = z.object({ email: z.email().max(320) }).strict();
const verifyBody = emailBody.extend({ code: z.string().regex(/^\d{6}$/) }).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new BadRequestException("Invalid request");
  return parsed.data;
}

@Controller("external-portal/auth")
@PublicRoute()
export class ExternalPortalIdentityController {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();
  private lastPrunedAt = 0;

  constructor(
    private readonly identity: ExternalPortalIdentityService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }
  private origin(request: Request) {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
  }

  private cookieName() {
    return this.config.webOrigin.startsWith("https:") ? "__Host-sense_external_sid" : "sense_external_sid";
  }

  private cookie(request: Request): string | undefined {
    const name = this.cookieName();
    const pair = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return pair?.slice(name.length + 1);
  }

  private setCookie(response: Response, secret: string) {
    response.cookie(this.cookieName(), secret, {
      httpOnly: true, secure: this.config.webOrigin.startsWith("https:"), sameSite: "lax", path: "/", maxAge: 12 * 60 * 60_000
    });
  }

  private clearCookie(response: Response) {
    response.clearCookie(this.cookieName(), { path: "/", sameSite: "lax", secure: this.config.webOrigin.startsWith("https:") });
  }

  private pruneExpired(now: number) {
    if (now - this.lastPrunedAt < 60_000) return;
    this.lastPrunedAt = now;
    for (const [key, entry] of this.attempts) if (entry.resetAt <= now) this.attempts.delete(key);
  }

  private limit(key: string, maximum: number) {
    const now = Date.now();
    this.pruneExpired(now);
    const entry = this.attempts.get(key);
    if (entry) {
      if (entry.resetAt <= now) { this.attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 }); return; }
      if (++entry.count > maximum) throw new HttpException("Too many attempts", 429);
      return;
    }
    if (this.attempts.size >= 10_000) {
      for (const [expiredKey, expiredEntry] of this.attempts) if (expiredEntry.resetAt <= now) this.attempts.delete(expiredKey);
      if (this.attempts.size >= 10_000) throw new HttpException("Too many attempts", 429);
    }
    this.attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
  }

  private throttle(request: Request, action: string, address?: string) {
    this.limit(`${request.ip ?? "unknown"}:${action}`, 300);
    if (address) this.limit(`${action}:${address.trim().toLowerCase()}`, 20);
  }

  @Post("code")
  @PublicRoute()
  @HttpCode(202)
  async requestCode(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown) {
    this.noStore(response);
    this.origin(request);
    const input = parse(emailBody, body);
    this.throttle(request, "external-code-request", input.email);
    return this.identity.requestCode(input.email);
  }

  @Post("verify")
  @PublicRoute()
  async verify(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown) {
    this.noStore(response);
    this.origin(request);
    const input = parse(verifyBody, body);
    this.throttle(request, "external-code-verify", input.email);
    const result = await this.identity.verifyCode(input.email, input.code, request.headers["user-agent"], request.ip);
    this.setCookie(response, result.secret);
    return { authenticated: true };
  }

  @Get("session")
  @PublicRoute()
  async session(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.noStore(response);
    try {
      const active = await this.identity.session(this.cookie(request));
      return { account: { id: active.account.id, email: active.account.normalizedEmail, kind: "EXTERNAL" as const }, csrfToken: active.csrfToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) this.clearCookie(response);
      throw error;
    }
  }

  @Post("logout")
  @PublicRoute()
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrfToken?: string) {
    this.noStore(response);
    this.origin(request);
    const secret = this.cookie(request);
    const active = await this.identity.session(secret);
    this.identity.verifyCsrf(active, csrfToken);
    await this.identity.logout(secret);
    this.clearCookie(response);
  }

  @Get("sessions")
  @PublicRoute()
  async sessions(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.noStore(response);
    const active = await this.identity.session(this.cookie(request));
    const rows = await this.identity.listSessions(active.account.id);
    return rows.map((row) => ({ ...row, current: row.id === active.row.id }));
  }

  @Delete("sessions/:sessionId")
  @PublicRoute()
  @HttpCode(204)
  async revoke(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrfToken: string | undefined, @Param("sessionId") sessionId: string) {
    this.noStore(response);
    this.origin(request);
    const active = await this.identity.session(this.cookie(request));
    this.identity.verifyCsrf(active, csrfToken);
    if (!z.uuid().safeParse(sessionId).success) throw new BadRequestException("Invalid session");
    await this.identity.revokeSession(active.account.id, sessionId);
  }
}

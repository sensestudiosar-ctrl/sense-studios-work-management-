import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, HttpCode, HttpException, Inject, Param, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { PublicRoute } from "./auth.guard.js";
import { ClientPortalIdentityService } from "./client-portal-identity.service.js";
import { DatabaseService } from "./database.service.js";

const emailBody = z.object({ email: z.email().max(320) }).strict();
const codeBody = emailBody.extend({ code: z.string().regex(/^\d{6}$/) }).strict();
const ceremonyBody = z.object({
  ceremonyId: z.uuid(),
  response: z.object({ id: z.string().min(1).max(2048) }).passthrough()
}).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Invalid request");
  return result.data;
}

@Controller("client-portal/auth")
@PublicRoute()
export class ClientPortalIdentityController {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();
  private lastPrunedAt = 0;

  constructor(
    private readonly identity: ClientPortalIdentityService,
    private readonly database: DatabaseService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private noStore(response: Response): void {
    response.setHeader("Cache-Control", "no-store");
  }

  private origin(request: Request): void {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
  }

  private cookieName(): string {
    return this.config.webOrigin.startsWith("https:") ? "__Host-sense_client_sid" : "sense_client_sid";
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
    response.clearCookie(this.cookieName(), {
      path: "/",
      sameSite: "lax",
      secure: this.config.webOrigin.startsWith("https:")
    });
  }

  private active(request: Request) {
    return this.identity.session(this.cookie(request));
  }

  private pruneExpired(now: number): void {
    if (now - this.lastPrunedAt < 60_000) return;
    this.lastPrunedAt = now;
    for (const [key, entry] of this.attempts) {
      if (entry.resetAt <= now) this.attempts.delete(key);
    }
  }

  private limit(key: string, maximum: number): void {
    const now = Date.now();
    this.pruneExpired(now);
    const entry = this.attempts.get(key);
    if (entry) {
      if (entry.resetAt <= now) {
        this.attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
        return;
      }
      if (++entry.count > maximum) throw new HttpException("Too many attempts", 429);
      return;
    }
    if (this.attempts.size >= 10_000) {
      this.lastPrunedAt = now;
      for (const [expiredKey, expiredEntry] of this.attempts) {
        if (expiredEntry.resetAt <= now) this.attempts.delete(expiredKey);
      }
      if (this.attempts.size >= 10_000) throw new HttpException("Too many attempts", 429);
    }
    this.attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
  }

  private throttle(request: Request, action: string, identifier?: string): void {
    this.limit(`${request.ip ?? "unknown"}:${action}`, 300);
    if (identifier) this.limit(`${action}:${identifier.trim().toLowerCase()}`, 20);
  }

  @Post("code/request")
  @PublicRoute()
  @HttpCode(202)
  async requestCode(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown) {
    this.noStore(response);
    this.origin(request);
    const input = parse(emailBody, body);
    this.throttle(request, "portal-code-request", input.email);
    return this.identity.requestCode(input.email);
  }

  @Post("code/verify")
  @PublicRoute()
  async verifyCode(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown) {
    this.noStore(response);
    this.origin(request);
    const input = parse(codeBody, body);
    this.throttle(request, "portal-code-verify", input.email);
    const result = await this.identity.verifyCode(input.email, input.code, request.headers["user-agent"], request.ip);
    this.setSessionCookie(response, result.secret);
    return { authenticated: true };
  }

  @Get("session")
  @PublicRoute()
  async session(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.noStore(response);
    try {
      const active = await this.active(request);
      const activePasskeyCount = await this.database.prisma.passkeyCredential.count({
        where: { accountId: active.account.id, revokedAt: null }
      });
      return {
        account: { id: active.account.id, email: active.account.normalizedEmail, kind: "CLIENT" as const },
        csrfToken: active.csrfToken,
        activePasskeyCount
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) this.clearSessionCookie(response);
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
    this.clearSessionCookie(response);
  }

  @Get("sessions")
  @PublicRoute()
  async sessions(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.noStore(response);
    const active = await this.active(request);
    const rows = await this.identity.listSessions(active.account.id);
    return rows.map((row) => ({ ...row, current: row.id === active.row.id }));
  }

  @Delete("sessions/:id")
  @PublicRoute()
  @HttpCode(204)
  async revoke(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("id") id: string, @Headers("x-csrf-token") csrfToken?: string) {
    this.noStore(response);
    this.origin(request);
    const active = await this.identity.session(this.cookie(request));
    this.identity.verifyCsrf(active, csrfToken);
    if (!z.uuid().safeParse(id).success) throw new BadRequestException("Invalid session");
    await this.identity.revokeSession(active.account.id, id);
  }

  @Post("passkeys/options")
  @PublicRoute()
  async registerOptions(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrfToken?: string) {
    this.noStore(response);
    this.origin(request);
    const active = await this.identity.session(this.cookie(request));
    this.identity.verifyCsrf(active, csrfToken);
    return this.identity.registerOptions(active);
  }

  @Post("passkeys/verify")
  @PublicRoute()
  async registerVerify(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrfToken: string | undefined, @Body() body: unknown) {
    this.noStore(response);
    this.origin(request);
    const active = await this.identity.session(this.cookie(request));
    this.identity.verifyCsrf(active, csrfToken);
    const input = parse(ceremonyBody, body);
    await this.identity.registerVerify(active, input.ceremonyId, input.response as unknown as RegistrationResponseJSON);
    return { registered: true };
  }
}

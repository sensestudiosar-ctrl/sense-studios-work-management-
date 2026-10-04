import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { BadRequestException, ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { Prisma, SecurityEventResult, SecurityEventType } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { BrevoEmailAdapter } from "./brevo-email.js";

const codeLifetimeMs = 10 * 60_000;
const resendIntervalMs = 60_000;
const sendWindowMs = 60 * 60_000;
const maximumSendsPerWindow = 5;
const maximumCodeAttempts = 5;
const sessionLifetimeMs = 12 * 60 * 60_000;
const sessionIdleLifetimeMs = 30 * 60_000;

type ExternalAccount = { id: string; normalizedEmail: string; kind: string; state: string };
type ExternalSessionRow = {
  id: string; accountId: string; tokenHash: string; csrfTokenHash: string; createdAt: Date;
  lastUsedAt: Date; expiresAt: Date; revokedAt: Date | null; userAgent: string | null; ipAddress: string | null;
};
export type ActiveExternalPortalSession = { row: ExternalSessionRow; account: ExternalAccount; csrfToken: string };

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const newSecret = () => randomBytes(32).toString("base64url");

function safeEqualHex(expected: string, actual: string): boolean {
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(actual, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

@Injectable()
export class ExternalPortalIdentityService {
  constructor(
    private readonly database: DatabaseService,
    private readonly email: BrevoEmailAdapter,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private get db() { return this.database.prisma; }

  private codeHash(accountId: string, email: string, code: string): string {
    if (!this.config.emailVerificationSecret) throw new UnauthorizedException("External portal sign-in is unavailable");
    return createHmac("sha256", this.config.emailVerificationSecret)
      .update(`${accountId}:${email}:${code}`)
      .digest("hex");
  }

  /** Returns a generic result for unknown, inactive, and ungranted addresses. */
  async requestCode(email: string): Promise<{ accepted: true }> {
    const normalizedEmail = normalizeEmail(email);
    if (!this.config.emailVerificationSecret) return { accepted: true };
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const verification = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedEmail}))`;
      const located = await tx.account.findUnique({ where: { normalizedEmail }, select: { id: true } });
      if (!located) return null;
      await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${located.id}::uuid FOR UPDATE`;
      const account = await tx.account.findUnique({ where: { id: located.id } });
      if (!account || account.normalizedEmail !== normalizedEmail || account.kind !== "EXTERNAL" || account.state !== "ACTIVE") return null;
      const now = new Date();
      if (!(await this.hasUsableGrant(tx, account.id))) return null;

      const existing = await tx.externalPortalCode.findUnique({ where: { accountId: account.id } });
      if (existing && existing.lastSentAt.getTime() + resendIntervalMs > now.getTime()) return null;
      const windowStartedAt = existing && existing.sendWindowStartedAt.getTime() + sendWindowMs > now.getTime()
        ? existing.sendWindowStartedAt : now;
      const sendsInWindow = existing && windowStartedAt.getTime() === existing.sendWindowStartedAt.getTime() ? existing.sendsInWindow : 0;
      if (sendsInWindow >= maximumSendsPerWindow) return null;

      await tx.externalPortalCode.upsert({
        where: { accountId: account.id },
        create: {
          accountId: account.id, codeHash: this.codeHash(account.id, account.normalizedEmail, code), attempts: 0,
          sendWindowStartedAt: windowStartedAt, sendsInWindow: sendsInWindow + 1, lastSentAt: now,
          expiresAt: new Date(now.getTime() + codeLifetimeMs), consumedAt: null
        },
        update: {
          codeHash: this.codeHash(account.id, account.normalizedEmail, code), attempts: 0,
          sendWindowStartedAt: windowStartedAt, sendsInWindow: sendsInWindow + 1, lastSentAt: now,
          expiresAt: new Date(now.getTime() + codeLifetimeMs), consumedAt: null
        }
      });
      return { email: account.normalizedEmail, code };
    });

    if (verification) {
      try {
        await this.email.send(verification.email, {
          subject: "Your Sense Studios external portal sign-in code",
          textContent: `Your external portal sign-in code is ${verification.code}. It expires in 10 minutes. If you did not request this, ignore this message.`
        });
      } catch {
        // Keep provider details and whether an address is eligible out of the public response.
      }
    }
    return { accepted: true };
  }

  async verifyCode(email: string, code: string, userAgent?: string, ipAddress?: string): Promise<{ secret: string }> {
    const normalizedEmail = normalizeEmail(email);
    const result = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedEmail}))`;
      const located = await tx.account.findUnique({ where: { normalizedEmail }, select: { id: true } });
      if (!located) return null;
      await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${located.id}::uuid FOR UPDATE`;
      const account = await tx.account.findUnique({ where: { id: located.id } });
      if (!account || account.normalizedEmail !== normalizedEmail || account.kind !== "EXTERNAL" || account.state !== "ACTIVE") return null;
      const now = new Date();
      const challenge = await tx.externalPortalCode.findUnique({ where: { accountId: account.id } });
      if (!challenge || challenge.consumedAt || challenge.expiresAt <= now || challenge.attempts >= maximumCodeAttempts || !(await this.hasUsableGrant(tx, account.id))) return null;
      const candidateHash = this.codeHash(account.id, account.normalizedEmail, code);
      if (!safeEqualHex(challenge.codeHash, candidateHash)) {
        await tx.externalPortalCode.updateMany({
          where: { accountId: account.id, consumedAt: null, attempts: { lt: maximumCodeAttempts } },
          data: { attempts: { increment: 1 } }
        });
        await tx.securityEvent.create({ data: { eventType: SecurityEventType.LOGIN, result: SecurityEventResult.FAILURE, subjectId: account.id } });
        return null;
      }
      const consumed = await tx.externalPortalCode.updateMany({
        where: { accountId: account.id, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: maximumCodeAttempts }, codeHash: challenge.codeHash },
        data: { consumedAt: now }
      });
      if (consumed.count !== 1) return null;
      const secret = newSecret();
      const csrfToken = createHmac("sha256", secret).update("external-portal-csrf").digest("base64url");
      await tx.externalPortalSession.create({
        data: {
          accountId: account.id, tokenHash: digest(secret), csrfTokenHash: digest(csrfToken),
          expiresAt: new Date(now.getTime() + sessionLifetimeMs), userAgent: userAgent?.slice(0, 512) ?? null,
          ipAddress: ipAddress?.slice(0, 64) ?? null
        }
      });
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.LOGIN, result: SecurityEventResult.SUCCESS, actorId: account.id, subjectId: account.id } });
      return { secret };
    });
    if (!result) throw new UnauthorizedException("External portal authentication failed");
    return result;
  }

  async session(secret: string | undefined): Promise<ActiveExternalPortalSession> {
    if (!secret || secret.length > 128) throw new UnauthorizedException("Authentication required");
    const row = await this.db.externalPortalSession.findUnique({ where: { tokenHash: digest(secret) } });
    const now = new Date();
    if (!row || row.revokedAt || row.expiresAt <= now || row.lastUsedAt.getTime() + sessionIdleLifetimeMs <= now.getTime()) {
      throw new UnauthorizedException("Authentication required");
    }
    const account = await this.db.account.findUnique({ where: { id: row.accountId } });
    if (!account || account.kind !== "EXTERNAL" || account.state !== "ACTIVE" || !(await this.hasUsableGrant(this.db, account.id))) {
      throw new UnauthorizedException("Authentication required");
    }
    if (row.lastUsedAt.getTime() + 60_000 < now.getTime()) {
      await this.db.externalPortalSession.updateMany({ where: { id: row.id, revokedAt: null }, data: { lastUsedAt: now } });
    }
    const csrfToken = createHmac("sha256", secret).update("external-portal-csrf").digest("base64url");
    return { row, account, csrfToken };
  }

  verifyCsrf(active: ActiveExternalPortalSession, token: string | undefined): void {
    if (!token || !safeEqualHex(digest(active.csrfToken), digest(token)) || digest(token) !== active.row.csrfTokenHash) {
      throw new ForbiddenException("Request could not be verified");
    }
  }

  async logout(secret: string | undefined): Promise<void> {
    const active = await this.session(secret);
    await this.db.$transaction(async (tx) => {
      const changed = await tx.externalPortalSession.updateMany({ where: { id: active.row.id, revokedAt: null }, data: { revokedAt: new Date() } });
      if (changed.count !== 1) throw new UnauthorizedException("Authentication required");
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.SESSION_REVOKED, result: SecurityEventResult.SUCCESS, actorId: active.account.id, subjectId: active.account.id } });
    });
  }

  async listSessions(accountId: string) {
    return this.db.externalPortalSession.findMany({
      where: { accountId }, select: { id: true, createdAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true, userAgent: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async revokeSession(accountId: string, id: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const changed = await tx.externalPortalSession.updateMany({ where: { id, accountId, revokedAt: null }, data: { revokedAt: new Date() } });
      if (changed.count !== 1) throw new BadRequestException("Session unavailable");
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.SESSION_REVOKED, result: SecurityEventResult.SUCCESS, actorId: accountId, subjectId: accountId } });
    });
  }

  private async hasUsableGrant(client: Prisma.TransactionClient | typeof this.db, accountId: string): Promise<boolean> {
    const rows = await client.$queryRaw<Array<{ usable: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM external_portal_grants g
        WHERE g."accountId" = ${accountId}::uuid AND s21_grant_usable(g.id)
      ) AS usable
    `;
    return rows[0]?.usable === true;
  }
}

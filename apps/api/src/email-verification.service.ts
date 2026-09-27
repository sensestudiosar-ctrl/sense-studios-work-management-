import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { ForbiddenException, HttpException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { AccountState } from "./generated/prisma/client.js";
import { BrevoEmailAdapter, SafeEmailDeliveryError } from "./brevo-email.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { DatabaseService } from "./database.service.js";
import { Inject } from "@nestjs/common";

const codeLifetimeMs = 10 * 60_000;
const resendIntervalMs = 60_000;
const sendWindowMs = 60 * 60_000;
const maximumSendsPerWindow = 5;
const maximumAttempts = 5;

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly email: BrevoEmailAdapter,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private get db() { return this.database.prisma; }

  async status(accountId: string): Promise<{ verified: boolean; available: boolean }> {
    const account = await this.db.account.findFirst({ where: { id: accountId, state: AccountState.ACTIVE }, select: { emailVerifiedAt: true } });
    if (!account) throw new ForbiddenException("Active account required");
    return {
      verified: account.emailVerifiedAt !== null,
      available: Boolean(this.config.emailVerificationSecret && this.config.brevoApiKey && this.config.brevoSenderEmail && this.config.brevoSenderName)
    };
  }

  async requestCode(accountId: string): Promise<{ sent: true }> {
    if (!this.config.emailVerificationSecret) throw new ServiceUnavailableException("Email verification is not configured");
    const verification = await this.db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${accountId}))`;
        await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${accountId}::uuid FOR UPDATE`;
        const account = await tx.account.findFirst({ where: { id: accountId, state: AccountState.ACTIVE }, select: { normalizedEmail: true, emailVerifiedAt: true } });
        if (!account) throw new ForbiddenException("Active account required");
        if (account.emailVerifiedAt) throw new ForbiddenException("Email address is already verified");

        const now = new Date();
        const existing = await tx.emailVerificationChallenge.findUnique({ where: { accountId } });
        if (existing && existing.lastSentAt.getTime() + resendIntervalMs > now.getTime()) {
          throw new HttpException("Wait before requesting another verification email", 429);
        }
        const windowStart = existing && existing.sendWindowStartedAt.getTime() + sendWindowMs > now.getTime()
          ? existing.sendWindowStartedAt : now;
        const sends = existing && windowStart === existing.sendWindowStartedAt ? existing.sendsInWindow : 0;
        if (sends >= maximumSendsPerWindow) throw new HttpException("Email verification limit reached", 429);

        const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
        const codeHash = this.hashCode(accountId, account.normalizedEmail, code);
        await tx.emailVerificationChallenge.upsert({
          where: { accountId },
          create: {
            accountId, codeHash, attempts: 0, sendWindowStartedAt: windowStart,
            sendsInWindow: sends + 1, lastSentAt: now, expiresAt: new Date(now.getTime() + codeLifetimeMs)
          },
          update: {
            codeHash, attempts: 0, sendWindowStartedAt: windowStart,
            sendsInWindow: sends + 1, lastSentAt: now, expiresAt: new Date(now.getTime() + codeLifetimeMs)
          }
        });
        return { email: account.normalizedEmail, code };
    });

    try {
      await this.email.send(verification.email, {
        subject: "Verify your Sense Studios email",
        textContent: `Your Sense Studios email verification code is ${verification.code}. It expires in 10 minutes. If you did not request this, ignore this message.`
      });
    } catch (error) {
      const code = error instanceof SafeEmailDeliveryError ? error.failureCode : "email_provider_unavailable";
      throw new ServiceUnavailableException(code === "email_not_configured" ? "Email verification is not configured" : "Verification email could not be sent");
    }
    return { sent: true };
  }

  async verifyCode(accountId: string, code: string): Promise<{ verified: true }> {
    if (!this.config.emailVerificationSecret) throw new ServiceUnavailableException("Email verification is not configured");
    const valid = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${accountId}))`;
      await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${accountId}::uuid FOR UPDATE`;
      const account = await tx.account.findFirst({ where: { id: accountId, state: AccountState.ACTIVE }, select: { normalizedEmail: true, emailVerifiedAt: true } });
      const challenge = await tx.emailVerificationChallenge.findUnique({ where: { accountId } });
      const now = new Date();
      if (!account || account.emailVerifiedAt) return "unavailable" as const;
      if (!challenge || challenge.expiresAt <= now || challenge.attempts >= maximumAttempts) return "unavailable" as const;

      const expected = Buffer.from(challenge.codeHash, "hex");
      const actual = Buffer.from(this.hashCode(accountId, account.normalizedEmail, code), "hex");
      if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
        const marked = await tx.account.updateMany({ where: { id: accountId, state: AccountState.ACTIVE, emailVerifiedAt: null }, data: { emailVerifiedAt: now } });
        if (marked.count !== 1) return "unavailable" as const;
        await tx.emailVerificationChallenge.delete({ where: { accountId } });
        return "verified" as const;
      }
      await tx.emailVerificationChallenge.update({ where: { accountId }, data: { attempts: { increment: 1 } } });
      return "invalid" as const;
    });
    if (valid !== "verified") throw new UnauthorizedException("Verification code is invalid or expired");
    return { verified: true };
  }

  private hashCode(accountId: string, email: string, code: string): string {
    return createHmac("sha256", this.config.emailVerificationSecret!).update(`${accountId}:${email}:${code}`).digest("hex");
  }
}

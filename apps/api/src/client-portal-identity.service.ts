import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { BadRequestException, ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { AccountKind, AccountState, Prisma, SecurityEventResult, SecurityEventType } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { BrevoEmailAdapter } from "./brevo-email.js";

const codeLifetimeMs = 10 * 60_000;
const resendIntervalMs = 60_000;
const sendWindowMs = 60 * 60_000;
const maximumSendsPerWindow = 5;
const maximumCodeAttempts = 5;
const ceremonyLifetimeMs = 5 * 60_000;
const sessionLifetimeMs = 12 * 60 * 60_000;
const sessionIdleLifetimeMs = 30 * 60_000;

type PortalAccount = { id: string; normalizedEmail: string; kind: AccountKind; state: AccountState };
type PortalSessionRow = {
  id: string;
  accountId: string;
  tokenHash: string;
  csrfTokenHash: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
};
export type ActiveClientPortalSession = { row: PortalSessionRow; account: PortalAccount; csrfToken: string };

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function randomSecret(): string {
  return randomBytes(32).toString("base64url");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function safeEqualHex(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(actual, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

@Injectable()
export class ClientPortalIdentityService {
  constructor(
    private readonly database: DatabaseService,
    private readonly email: BrevoEmailAdapter,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private get db() { return this.database.prisma; }

  private get rpID(): string {
    return new URL(this.config.webOrigin).hostname;
  }

  private codeHash(accountId: string, email: string, code: string): string {
    if (!this.config.emailVerificationSecret) throw new UnauthorizedException("Client portal sign-in is unavailable");
    return createHmac("sha256", this.config.emailVerificationSecret)
      .update(`${accountId}:${email}:${code}`)
      .digest("hex");
  }

  private async hasUsableGrant(client: Prisma.TransactionClient | typeof this.db, accountId: string, now = new Date()): Promise<boolean> {
    return (await client.clientPortalGrant.count({
      where: {
        accountId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      }
    })) > 0;
  }

  private async hasNonCancelledUsableGrant(client: Prisma.TransactionClient | typeof this.db, accountId: string, now = new Date()): Promise<boolean> {
    const grants = await client.clientPortalGrant.findMany({
      where: { accountId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { projectId: true }
    });
    if (!grants.length) return false;
    return (await client.project.count({ where: { id: { in: grants.map((grant) => grant.projectId) }, status: { not: "CANCELLED" } } })) > 0;
  }

  /** Always returns the same public result. Unknown, inactive and ungranted addresses do not receive mail. */
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
      if (!account || account.normalizedEmail !== normalizedEmail || account.kind !== AccountKind.CLIENT || account.state !== AccountState.ACTIVE) return null;
      const now = new Date();
      if (!(await this.hasUsableGrant(tx, account.id, now))) return null;

      const existing = await tx.clientPortalCode.findUnique({ where: { accountId: account.id } });
      if (existing && existing.lastSentAt.getTime() + resendIntervalMs > now.getTime()) return null;
      const windowStartedAt = existing && existing.sendWindowStartedAt.getTime() + sendWindowMs > now.getTime()
        ? existing.sendWindowStartedAt
        : now;
      const sendsInWindow = existing && windowStartedAt.getTime() === existing.sendWindowStartedAt.getTime()
        ? existing.sendsInWindow
        : 0;
      if (sendsInWindow >= maximumSendsPerWindow) return null;

      await tx.clientPortalCode.upsert({
        where: { accountId: account.id },
        create: {
          accountId: account.id,
          codeHash: this.codeHash(account.id, account.normalizedEmail, code),
          attempts: 0,
          sendWindowStartedAt: windowStartedAt,
          sendsInWindow: sendsInWindow + 1,
          lastSentAt: now,
          expiresAt: new Date(now.getTime() + codeLifetimeMs),
          consumedAt: null
        },
        update: {
          codeHash: this.codeHash(account.id, account.normalizedEmail, code),
          attempts: 0,
          sendWindowStartedAt: windowStartedAt,
          sendsInWindow: sendsInWindow + 1,
          lastSentAt: now,
          expiresAt: new Date(now.getTime() + codeLifetimeMs),
          consumedAt: null
        }
      });
      return { email: account.normalizedEmail, code };
    });

    if (verification) {
      try {
        await this.email.send(verification.email, {
          subject: "Your Sense Studios client portal sign-in code",
          textContent: `Your client portal sign-in code is ${verification.code}. It expires in 10 minutes. If you did not request this, ignore this message.`
        });
      } catch {
        // Keep the public response generic; provider details and codes are never logged or returned.
      }
    }
    return { accepted: true };
  }

  async verifyCode(email: string, code: string, userAgent?: string, ipAddress?: string): Promise<{ secret: string; csrfToken: string; sessionId: string }> {
    const normalizedEmail = normalizeEmail(email);
    const codeValue = typeof code === "string" ? code : "";
    const result = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedEmail}))`;
      const located = await tx.account.findUnique({ where: { normalizedEmail }, select: { id: true } });
      if (!located) return null;
      await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${located.id}::uuid FOR UPDATE`;
      const account = await tx.account.findUnique({ where: { id: located.id } });
      if (!account || account.normalizedEmail !== normalizedEmail || account.kind !== AccountKind.CLIENT || account.state !== AccountState.ACTIVE) return null;
      const now = new Date();
      const challenge = await tx.clientPortalCode.findUnique({ where: { accountId: account.id } });
      if (!challenge || challenge.consumedAt || challenge.expiresAt <= now || challenge.attempts >= maximumCodeAttempts || !(await this.hasUsableGrant(tx, account.id, now))) return null;

      const candidateHash = this.codeHash(account.id, account.normalizedEmail, codeValue);
      if (!safeEqualHex(challenge.codeHash, candidateHash)) {
        await tx.clientPortalCode.updateMany({
          where: { accountId: account.id, consumedAt: null, attempts: { lt: maximumCodeAttempts } },
          data: { attempts: { increment: 1 } }
        });
        await tx.securityEvent.create({ data: { eventType: SecurityEventType.LOGIN, result: SecurityEventResult.FAILURE, subjectId: account.id } });
        return null;
      }
      const consumed = await tx.clientPortalCode.updateMany({
        where: { accountId: account.id, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: maximumCodeAttempts }, codeHash: challenge.codeHash },
        data: { consumedAt: now }
      });
      if (consumed.count !== 1) return null;
      const secret = randomSecret();
      const csrfToken = createHmac("sha256", secret).update("client-portal-csrf").digest("base64url");
      const session = await tx.clientPortalSession.create({
        data: {
          accountId: account.id,
          tokenHash: digest(secret),
          csrfTokenHash: digest(csrfToken),
          expiresAt: new Date(now.getTime() + sessionLifetimeMs),
          userAgent: userAgent?.slice(0, 512) ?? null,
          ipAddress: ipAddress?.slice(0, 64) ?? null
        },
        select: { id: true }
      });
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.LOGIN, result: SecurityEventResult.SUCCESS, actorId: account.id, subjectId: account.id } });
      return { secret, csrfToken, sessionId: session.id };
    });
    if (!result) throw new UnauthorizedException("Client portal authentication failed");
    return result;
  }

  async session(secret: string | undefined): Promise<ActiveClientPortalSession> {
    if (!secret || secret.length > 128) throw new UnauthorizedException("Authentication required");
    const row = await this.db.clientPortalSession.findUnique({ where: { tokenHash: digest(secret) } });
    const now = new Date();
    if (!row || row.revokedAt || row.expiresAt <= now || row.lastUsedAt.getTime() + sessionIdleLifetimeMs <= now.getTime()) {
      throw new UnauthorizedException("Authentication required");
    }
    const account = await this.db.account.findUnique({ where: { id: row.accountId } });
    if (!account || account.kind !== AccountKind.CLIENT || account.state !== AccountState.ACTIVE || !(await this.hasUsableGrant(this.db, account.id, now))) {
      throw new UnauthorizedException("Authentication required");
    }
    if (row.lastUsedAt.getTime() + 60_000 < now.getTime()) {
      await this.db.clientPortalSession.updateMany({ where: { id: row.id, revokedAt: null }, data: { lastUsedAt: now } });
    }
    const csrfToken = createHmac("sha256", secret).update("client-portal-csrf").digest("base64url");
    return { row, account, csrfToken };
  }

  verifyCsrf(active: ActiveClientPortalSession, token: string | undefined): void {
    if (!token || !safeEqualHex(digest(active.csrfToken), digest(token)) || digest(token) !== active.row.csrfTokenHash) {
      throw new ForbiddenException("Request could not be verified");
    }
  }

  async logout(secret: string | undefined): Promise<void> {
    const active = await this.session(secret);
    await this.db.$transaction(async (tx) => {
      const changed = await tx.clientPortalSession.updateMany({ where: { id: active.row.id, revokedAt: null }, data: { revokedAt: new Date() } });
      if (changed.count !== 1) throw new UnauthorizedException("Authentication required");
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.SESSION_REVOKED, result: SecurityEventResult.SUCCESS, actorId: active.account.id, subjectId: active.account.id } });
    });
  }

  async listSessions(accountId: string) {
    return this.db.clientPortalSession.findMany({
      where: { accountId },
      select: { id: true, createdAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true, userAgent: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async revokeSession(accountId: string, id: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const changed = await tx.clientPortalSession.updateMany({ where: { id, accountId, revokedAt: null }, data: { revokedAt: new Date() } });
      if (changed.count !== 1) throw new BadRequestException("Session unavailable");
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.SESSION_REVOKED, result: SecurityEventResult.SUCCESS, actorId: accountId, subjectId: accountId } });
    });
  }

  async registerOptions(active: ActiveClientPortalSession) {
    this.assertActiveClient(active);
    if (!(await this.hasNonCancelledUsableGrant(this.db, active.account.id))) throw new ForbiddenException("Registration is unavailable");
    const credentials = await this.db.passkeyCredential.findMany({ where: { accountId: active.account.id, revokedAt: null }, select: { credentialId: true } });
    const options = await generateRegistrationOptions({
      rpName: "Sense Studios",
      rpID: this.rpID,
      userName: active.account.normalizedEmail,
      userID: Buffer.from(active.account.id.replaceAll("-", ""), "hex"),
      attestationType: "none",
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      excludeCredentials: credentials.map((item) => ({ id: item.credentialId }))
    });
    const ceremony = await this.db.clientPortalCeremony.create({
      data: {
        accountId: active.account.id,
        sessionId: active.row.id,
        purpose: "REGISTRATION",
        challenge: options.challenge,
        binding: {},
        expiresAt: new Date(Date.now() + ceremonyLifetimeMs)
      },
      select: { id: true }
    });
    return { ceremonyId: ceremony.id, options };
  }

  async registerVerify(active: ActiveClientPortalSession, ceremonyId: string, response: RegistrationResponseJSON): Promise<void> {
    this.assertActiveClient(active);
    const ceremony = await this.consumeCeremony(this.db, ceremonyId, active, "REGISTRATION");
    let verified: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
    try {
      verified = await verifyRegistrationResponse({
        response,
        expectedChallenge: ceremony.challenge,
        expectedOrigin: this.config.webOrigin,
        expectedRPID: this.rpID,
        requireUserVerification: true
      });
    } catch {
      await this.db.securityEvent.create({ data: { eventType: SecurityEventType.CREDENTIAL_ADDED, result: SecurityEventResult.FAILURE, subjectId: active.account.id } });
      throw new UnauthorizedException("Passkey registration failed");
    }
    if (!verified.verified || !(await this.hasNonCancelledUsableGrant(this.db, active.account.id))) {
      await this.db.securityEvent.create({ data: { eventType: SecurityEventType.CREDENTIAL_ADDED, result: SecurityEventResult.FAILURE, subjectId: active.account.id } });
      throw new UnauthorizedException("Passkey registration failed");
    }
    const credentialId = verified.registrationInfo.credential.id;
    if (await this.db.passkeyCredential.findUnique({ where: { credentialId }, select: { id: true } })) {
      await this.db.securityEvent.create({ data: { eventType: SecurityEventType.CREDENTIAL_ADDED, result: SecurityEventResult.FAILURE, subjectId: active.account.id } });
      throw new UnauthorizedException("Passkey registration failed");
    }
    await this.persistRegisteredCredential(active, response, verified);
  }

  private async persistRegisteredCredential(
    active: ActiveClientPortalSession,
    response: RegistrationResponseJSON,
    verified: Awaited<ReturnType<typeof verifyRegistrationResponse>>
  ): Promise<void> {
    const registrationInfo = verified.registrationInfo;
    if (!verified.verified || !registrationInfo) throw new UnauthorizedException("Passkey registration failed");
    const credentialId = registrationInfo.credential.id;
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${active.account.id}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM client_portal_sessions WHERE id = ${active.row.id}::uuid FOR UPDATE`;
      const now = new Date();
      const account = await tx.account.findUnique({ where: { id: active.account.id } });
      const portalSession = await tx.clientPortalSession.findUnique({ where: { id: active.row.id } });
      if (!account || account.kind !== AccountKind.CLIENT || account.state !== AccountState.ACTIVE || !portalSession || portalSession.accountId !== account.id || portalSession.revokedAt || portalSession.expiresAt <= now || portalSession.lastUsedAt.getTime() + sessionIdleLifetimeMs <= now.getTime() || !(await this.hasNonCancelledUsableGrant(tx, account.id, now))) {
        throw new UnauthorizedException("Passkey registration failed");
      }
      await tx.passkeyCredential.create({
        data: {
          credentialId,
          accountId: account.id,
          publicKey: Buffer.from(registrationInfo.credential.publicKey),
          counter: BigInt(registrationInfo.credential.counter),
          transports: response.response.transports ?? []
        }
      });
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.CREDENTIAL_ADDED, result: SecurityEventResult.SUCCESS, actorId: account.id, subjectId: account.id } });
    });
  }

  async approvalOptions(active: ActiveClientPortalSession, binding: Record<string, unknown>) {
    this.assertActiveClient(active);
    const credentials = await this.db.passkeyCredential.findMany({
      where: { accountId: active.account.id, revokedAt: null },
      select: { credentialId: true, transports: true }
    });
    if (!credentials.length) throw new ForbiddenException("A registered passkey is required");
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: "required",
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        ...(Array.isArray(credential.transports) ? { transports: credential.transports as AuthenticatorTransport[] } : {})
      }))
    });
    const ceremony = await this.db.clientPortalCeremony.create({
      data: {
        accountId: active.account.id,
        sessionId: active.row.id,
        purpose: "APPROVAL",
        challenge: options.challenge,
        binding: binding as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + ceremonyLifetimeMs)
      },
      select: { id: true }
    });
    return { ceremonyId: ceremony.id, options };
  }

  /**
   * Internal transaction boundary for exact-item approval consumers; do not expose as a generic approval endpoint.
   * The business consumer remains responsible for exact project/item-grant and current-revision authorization.
   * It must catch this method's verification rejection inside its transaction callback, commit consumed ceremony
   * state, and reject outside the transaction so an invalid proof cannot be replayed.
   */
  async verifyApprovalWithinTransaction(
    tx: Prisma.TransactionClient,
    active: ActiveClientPortalSession,
    ceremonyId: string,
    response: AuthenticationResponseJSON,
    binding: Record<string, unknown>
  ): Promise<{ accountId: string; credentialId: string }> {
    this.assertActiveClient(active);
    await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${active.account.id}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM client_portal_sessions WHERE id = ${active.row.id}::uuid FOR UPDATE`;
    const account = await tx.account.findUnique({ where: { id: active.account.id } });
    const portalSession = await tx.clientPortalSession.findUnique({ where: { id: active.row.id } });
    const now = new Date();
    if (!account || account.kind !== AccountKind.CLIENT || account.state !== AccountState.ACTIVE || !portalSession || portalSession.accountId !== account.id || portalSession.revokedAt || portalSession.expiresAt <= now || portalSession.lastUsedAt.getTime() + sessionIdleLifetimeMs <= now.getTime() || !(await this.hasUsableGrant(tx, account.id, now))) {
      throw new UnauthorizedException("Approval verification failed");
    }
    const ceremony = await this.consumeCeremony(tx, ceremonyId, active, "APPROVAL");
    if (canonicalJson(ceremony.binding) !== canonicalJson(binding)) throw new UnauthorizedException("Approval verification failed");
    await tx.$queryRaw`SELECT id FROM passkey_credentials WHERE "credentialId" = ${response.id} FOR UPDATE`;
    const credential = await tx.passkeyCredential.findUnique({ where: { credentialId: response.id } });
    if (!credential || credential.accountId !== account.id || credential.revokedAt) throw new UnauthorizedException("Approval verification failed");
    // Locks and WebAuthn verification can outlive session or grant expiry.
    // Check the current clock after each wait before authorizing the proof.
    const assertUnexpiredAccess = async () => {
      const checkedAt = new Date();
      if (portalSession.expiresAt <= checkedAt || portalSession.lastUsedAt.getTime() + sessionIdleLifetimeMs <= checkedAt.getTime() || !(await this.hasUsableGrant(tx, account.id, checkedAt))) {
        throw new UnauthorizedException("Approval verification failed");
      }
      return checkedAt;
    };
    await assertUnexpiredAccess();
    let verified: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
    try {
      verified = await verifyAuthenticationResponse({
        response,
        expectedChallenge: ceremony.challenge,
        expectedOrigin: this.config.webOrigin,
        expectedRPID: this.rpID,
        credential: {
          id: credential.credentialId,
          publicKey: new Uint8Array(credential.publicKey),
          counter: Number(credential.counter),
          ...(Array.isArray(credential.transports) ? { transports: credential.transports as AuthenticatorTransport[] } : {})
        },
        requireUserVerification: true
      });
    } catch {
      throw new UnauthorizedException("Approval verification failed");
    }
    if (!verified.verified) throw new UnauthorizedException("Approval verification failed");
    const verifiedAt = await assertUnexpiredAccess();
    const advanced = await tx.passkeyCredential.updateMany({
      where: { id: credential.id, accountId: account.id, counter: credential.counter, revokedAt: null },
      data: { counter: BigInt(verified.authenticationInfo.newCounter), lastUsedAt: verifiedAt }
    });
    if (advanced.count !== 1) throw new UnauthorizedException("Approval verification failed");
    await tx.securityEvent.create({ data: { eventType: SecurityEventType.LOGIN, result: SecurityEventResult.SUCCESS, actorId: account.id, subjectId: account.id, metadata: { purpose: "client_approval_step_up" } } });
    return { accountId: account.id, credentialId: credential.id };
  }

  private assertActiveClient(active: ActiveClientPortalSession): void {
    if (active.account.kind !== AccountKind.CLIENT || active.account.state !== AccountState.ACTIVE || active.row.accountId !== active.account.id || active.row.revokedAt || active.row.expiresAt <= new Date() || active.row.lastUsedAt.getTime() + sessionIdleLifetimeMs <= Date.now()) {
      throw new UnauthorizedException("Authentication required");
    }
  }

  private async consumeCeremony(
    client: Prisma.TransactionClient | typeof this.db,
    ceremonyId: string,
    active: ActiveClientPortalSession,
    purpose: "REGISTRATION" | "APPROVAL"
  ) {
    const now = new Date();
    const ceremony = await client.clientPortalCeremony.findUnique({ where: { id: ceremonyId } });
    if (!ceremony || ceremony.accountId !== active.account.id || ceremony.sessionId !== active.row.id || ceremony.purpose !== purpose || ceremony.consumedAt || ceremony.expiresAt <= now) {
      throw new UnauthorizedException("Authentication ceremony unavailable");
    }
    const consumed = await client.clientPortalCeremony.updateMany({
      where: { id: ceremony.id, accountId: active.account.id, sessionId: active.row.id, purpose, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now }
    });
    if (consumed.count !== 1) throw new UnauthorizedException("Authentication ceremony unavailable");
    return ceremony;
  }
}

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { AccountKind, AccountState, EnrollmentGrantPurpose, Prisma, SecurityEventResult, SecurityEventType, WebAuthnChallengePurpose } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { Inject } from "@nestjs/common";

const challengeLifetimeMs = 5 * 60_000;
const sessionLifetimeMs = 12 * 60 * 60_000;
const sessionIdleLifetimeMs = 30 * 60_000;
const invitationLifetimeMs = 24 * 60 * 60_000;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function randomSecret(): string {
  return randomBytes(32).toString("base64url");
}

function constantTimeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(digest(a), "hex");
  const bb = Buffer.from(digest(b), "hex");
  return timingSafeEqual(aa, bb);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

@Injectable()
export class IdentityService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private get rpID(): string {
    return new URL(this.config.webOrigin).hostname;
  }

  private get db() {
    return this.database.prisma;
  }

  /** S03 calls this only inside its membership/suspension transaction so account and access revocation are atomic. */
  async suspendStaffWithinTransaction(tx: Prisma.TransactionClient, accountId: string, actorId: string, reason: string): Promise<number> {
    const changed = await tx.account.updateMany({
      where: { id: accountId, kind: AccountKind.STAFF, state: AccountState.ACTIVE },
      data: { state: AccountState.SUSPENDED }
    });
    if (changed.count !== 1) throw new UnauthorizedException("Active staff identity not found");
    const sessions = await tx.session.updateMany({ where: { accountId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.securityEvent.create({ data: {
      eventType: SecurityEventType.ACCOUNT_STATE_CHANGED,
      result: SecurityEventResult.SUCCESS,
      actorId,
      subjectId: accountId,
      metadata: { state: AccountState.SUSPENDED, reason }
    } });
    return sessions.count;
  }

  private async event(eventType: SecurityEventType, result: SecurityEventResult, actorId?: string, subjectId?: string): Promise<void> {
    await this.db.securityEvent.create({ data: { eventType, result, ...(actorId ? { actorId } : {}), ...(subjectId ? { subjectId } : {}) } });
  }

  private async newRegistrationChallenge(accountId: string): Promise<{ ceremonyId: string; options: Awaited<ReturnType<typeof generateRegistrationOptions>> }> {
    const account = await this.db.account.findUniqueOrThrow({ where: { id: accountId }, include: { passkeyCredentials: true } });
    const options = await generateRegistrationOptions({
      rpName: "Sense Studios",
      rpID: this.rpID,
      userName: account.normalizedEmail,
      userID: Buffer.from(account.id.replaceAll("-", ""), "hex"),
      attestationType: "none",
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      excludeCredentials: account.passkeyCredentials.filter((item) => !item.revokedAt).map((item) => ({ id: item.credentialId }))
    });
    const challenge = await this.db.webAuthnChallenge.create({
      data: {
        accountId,
        purpose: WebAuthnChallengePurpose.REGISTRATION,
        challenge: options.challenge,
        expiresAt: new Date(Date.now() + challengeLifetimeMs)
      }
    });
    return { ceremonyId: challenge.id, options };
  }

  async bootstrapOptions(email: string, secret: string) {
    const expectedEmail = this.config.ownerBootstrapEmail;
    const expectedSecret = this.config.ownerBootstrapSecret;
    if (!expectedEmail || !expectedSecret || normalizeEmail(email) !== expectedEmail || !constantTimeEqual(secret, expectedSecret)) {
      throw new UnauthorizedException("Unable to begin registration");
    }
    const account = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(2602)`;
      const existing = await tx.account.findFirst({ where: { kind: AccountKind.OWNER } });
      if (existing) {
        if (existing.state !== AccountState.PENDING || existing.normalizedEmail !== expectedEmail) throw new ForbiddenException("Owner bootstrap is closed");
        return existing;
      }
      return tx.account.create({ data: { normalizedEmail: expectedEmail, kind: AccountKind.OWNER } });
    });
    return this.newRegistrationChallenge(account.id);
  }

  private async consumeChallenge(id: string, purpose: WebAuthnChallengePurpose) {
    const result = await this.db.webAuthnChallenge.updateMany({
      where: { id, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() }
    });
    if (result.count !== 1) throw new UnauthorizedException("Authentication failed");
    return this.db.webAuthnChallenge.findUniqueOrThrow({ where: { id } });
  }

  async registerVerify(ceremonyId: string, response: RegistrationResponseJSON, mode: "bootstrap" | "invitation" | "active" | "ownerRecovery", expectedAccountId?: string, userAgent?: string, ipAddress?: string, recoveryCode?: string, enrollmentGrantId?: string) {
    const challenge = await this.consumeChallenge(ceremonyId, WebAuthnChallengePurpose.REGISTRATION);
    if (!challenge.accountId) throw new UnauthorizedException("Authentication failed");
    let verified: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
    try {
      verified = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.config.webOrigin,
        expectedRPID: this.rpID,
        requireUserVerification: true
      });
    } catch {
      await this.event(SecurityEventType.CREDENTIAL_ADDED, SecurityEventResult.FAILURE, undefined, challenge.accountId);
      throw new UnauthorizedException("Authentication failed");
    }
    if (!verified.verified) throw new UnauthorizedException("Authentication failed");
    const account = await this.db.account.findUniqueOrThrow({ where: { id: challenge.accountId } });
    if (account.state === AccountState.SUSPENDED) throw new UnauthorizedException("Authentication failed");
    if (mode === "bootstrap" && (account.kind !== AccountKind.OWNER || account.state !== AccountState.PENDING)) throw new UnauthorizedException("Authentication failed");
    if (mode === "invitation" && (account.kind !== AccountKind.STAFF || account.state !== AccountState.PENDING || account.id !== expectedAccountId)) throw new UnauthorizedException("Authentication failed");
    if (mode === "active" && (account.state !== AccountState.ACTIVE || account.id !== expectedAccountId)) throw new UnauthorizedException("Authentication failed");
    if (mode === "ownerRecovery" && (account.kind !== AccountKind.OWNER || account.state !== AccountState.ACTIVE || account.id !== expectedAccountId || !recoveryCode)) throw new UnauthorizedException("Authentication failed");
    await this.db.$transaction(async (tx) => {
      if (mode === "invitation") {
        if (!enrollmentGrantId) throw new UnauthorizedException("Invitation unavailable");
        const claimed = await tx.identityEnrollmentGrant.updateMany({
          where: { id: enrollmentGrantId, accountId: account.id, consumedAt: null, expiresAt: { gt: new Date() } },
          data: { consumedAt: new Date() }
        });
        if (claimed.count !== 1) throw new UnauthorizedException("Invitation unavailable");
      }
      if (account.state === AccountState.PENDING) {
        const activated = await tx.account.updateMany({ where: { id: account.id, state: AccountState.PENDING }, data: { state: AccountState.ACTIVE } });
        if (activated.count !== 1) throw new UnauthorizedException("Authentication failed");
      }
      if (mode === "ownerRecovery") {
        const code = await tx.ownerRecoveryCode.findUnique({ where: { codeHash: digest(recoveryCode!) } });
        if (!code || code.accountId !== account.id || code.usedAt || code.replacedAt) throw new UnauthorizedException("Authentication failed");
        const used = await tx.ownerRecoveryCode.updateMany({ where: { id: code.id, usedAt: null, replacedAt: null }, data: { usedAt: new Date() } });
        if (used.count !== 1) throw new UnauthorizedException("Authentication failed");
        await tx.passkeyCredential.updateMany({ where: { accountId: account.id, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.session.updateMany({ where: { accountId: account.id, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.securityEvent.create({ data: { eventType: SecurityEventType.RECOVERY_USED, result: SecurityEventResult.SUCCESS, actorId: account.id, subjectId: account.id } });
      }
      await tx.passkeyCredential.create({
        data: {
          credentialId: verified.registrationInfo.credential.id,
          accountId: account.id,
          publicKey: Buffer.from(verified.registrationInfo.credential.publicKey),
          counter: BigInt(verified.registrationInfo.credential.counter),
          transports: response.response.transports ?? []
        }
      });
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.CREDENTIAL_ADDED, result: SecurityEventResult.SUCCESS, actorId: account.id, subjectId: account.id } });
    });
    return mode === "active" ? null : this.createSession(account.id, userAgent, ipAddress);
  }

  async loginOptions(email: string) {
    const account = await this.db.account.findUnique({ where: { normalizedEmail: normalizeEmail(email) } });
    const options = await generateAuthenticationOptions({ rpID: this.rpID, userVerification: "required" });
    const challenge = await this.db.webAuthnChallenge.create({
      data: {
        accountId: account?.state === AccountState.ACTIVE ? account.id : null,
        purpose: WebAuthnChallengePurpose.AUTHENTICATION,
        challenge: options.challenge,
        expiresAt: new Date(Date.now() + challengeLifetimeMs)
      }
    });
    return { ceremonyId: challenge.id, options };
  }

  async loginVerify(ceremonyId: string, response: AuthenticationResponseJSON, userAgent?: string, ipAddress?: string) {
    const challenge = await this.consumeChallenge(ceremonyId, WebAuthnChallengePurpose.AUTHENTICATION);
    const credential = await this.db.passkeyCredential.findUnique({ where: { credentialId: response.id }, include: { account: true } });
    if (!challenge.accountId || !credential || credential.revokedAt || credential.accountId !== challenge.accountId || credential.account.state !== AccountState.ACTIVE) {
      await this.event(SecurityEventType.LOGIN, SecurityEventResult.FAILURE, undefined, challenge.accountId ?? undefined);
      throw new UnauthorizedException("Authentication failed");
    }
    let verified: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
    try {
      verified = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.config.webOrigin,
        expectedRPID: this.rpID,
        credential: {
          id: credential.credentialId,
          publicKey: new Uint8Array(credential.publicKey),
          counter: Number(credential.counter),
          ...(Array.isArray(credential.transports) ? { transports: credential.transports as [] } : {})
        },
        requireUserVerification: true
      });
    } catch {
      await this.event(SecurityEventType.LOGIN, SecurityEventResult.FAILURE, undefined, challenge.accountId);
      throw new UnauthorizedException("Authentication failed");
    }
    if (!verified.verified) throw new UnauthorizedException("Authentication failed");
    const advanced = await this.db.passkeyCredential.updateMany({
      where: { id: credential.id, counter: credential.counter, revokedAt: null },
      data: { counter: BigInt(verified.authenticationInfo.newCounter), lastUsedAt: new Date() }
    });
    if (advanced.count !== 1) throw new UnauthorizedException("Authentication failed");
    await this.event(SecurityEventType.LOGIN, SecurityEventResult.SUCCESS, credential.accountId, credential.accountId);
    return this.createSession(credential.accountId, userAgent, ipAddress);
  }

  private async createSession(accountId: string, userAgent?: string, ipAddress?: string) {
    const secret = randomSecret();
    const csrfToken = createHmac("sha256", secret).update("csrf").digest("base64url");
    const session = await this.db.session.create({
      data: {
        accountId,
        tokenHash: digest(secret),
        csrfTokenHash: digest(csrfToken),
        expiresAt: new Date(Date.now() + sessionLifetimeMs),
        userAgent: userAgent?.slice(0, 512) ?? null,
        ipAddress: ipAddress?.slice(0, 64) ?? null
      }
    });
    return { secret, csrfToken, sessionId: session.id };
  }

  async session(secret: string | undefined) {
    if (!secret || secret.length > 128) throw new UnauthorizedException("Authentication required");
    const row = await this.db.session.findUnique({ where: { tokenHash: digest(secret) }, include: { account: true } });
    if (!row || row.revokedAt || row.expiresAt <= new Date() || row.lastUsedAt.getTime() + sessionIdleLifetimeMs <= Date.now() || row.account.state !== AccountState.ACTIVE) {
      throw new UnauthorizedException("Authentication required");
    }
    if (row.lastUsedAt.getTime() + 60_000 < Date.now()) {
      await this.db.session.updateMany({ where: { id: row.id, revokedAt: null }, data: { lastUsedAt: new Date() } });
    }
    const csrfToken = createHmac("sha256", secret).update("csrf").digest("base64url");
    return { row, csrfToken };
  }

  verifyCsrf(session: Awaited<ReturnType<IdentityService["session"]>>, token: string | undefined): void {
    if (!token || !constantTimeEqual(token, session.csrfToken) || digest(token) !== session.row.csrfTokenHash) {
      throw new ForbiddenException("Request could not be verified");
    }
  }

  async logout(secret: string | undefined): Promise<void> {
    const active = await this.session(secret);
    await this.db.$transaction(async (tx) => {
      const changed = await tx.session.updateMany({ where: { id: active.row.id, revokedAt: null }, data: { revokedAt: new Date() } });
      if (changed.count !== 1) throw new UnauthorizedException("Authentication required");
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.SESSION_REVOKED, result: SecurityEventResult.SUCCESS, actorId: active.row.accountId, subjectId: active.row.accountId } });
    });
  }

  async listSessions(accountId: string) {
    return this.db.session.findMany({ where: { accountId }, select: { id: true, createdAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true, userAgent: true }, orderBy: { createdAt: "desc" } });
  }

  async revokeSession(accountId: string, id: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const changed = await tx.session.updateMany({ where: { id, accountId, revokedAt: null }, data: { revokedAt: new Date() } });
      if (changed.count !== 1) throw new BadRequestException("Session unavailable");
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.SESSION_REVOKED, result: SecurityEventResult.SUCCESS, actorId: accountId, subjectId: accountId } });
    });
  }

  async beginRegistration(accountId: string) {
    const account = await this.db.account.findUniqueOrThrow({ where: { id: accountId } });
    if (account.state !== AccountState.ACTIVE) throw new ForbiddenException();
    return this.newRegistrationChallenge(accountId);
  }

  async inviteStaff(ownerId: string, email: string) {
    const owner = await this.db.account.findUniqueOrThrow({ where: { id: ownerId } });
    if (owner.kind !== AccountKind.OWNER || !(await this.ownerReady(ownerId))) throw new ForbiddenException("Owner enrollment is incomplete");
    const normalizedEmail = normalizeEmail(email);
    const account = await this.db.account.upsert({
      where: { normalizedEmail },
      create: { normalizedEmail, kind: AccountKind.STAFF },
      update: {}
    });
    if (account.kind !== AccountKind.STAFF || account.state !== AccountState.PENDING) throw new BadRequestException("Account cannot be invited");
    const token = randomSecret();
    await this.db.identityEnrollmentGrant.create({
      data: {
        purpose: EnrollmentGrantPurpose.STAFF_INVITATION,
        tokenHash: digest(token),
        accountId: account.id,
        normalizedEmail,
        authorizedByAccountId: ownerId,
        expiresAt: new Date(Date.now() + invitationLifetimeMs)
      }
    });
    return { invitationToken: token, expiresInSeconds: invitationLifetimeMs / 1000 };
  }

  async invitationOptions(token: string) {
    const grant = await this.db.identityEnrollmentGrant.findUnique({ where: { tokenHash: digest(token) } });
    if (!grant || (grant.purpose !== EnrollmentGrantPurpose.STAFF_INVITATION && grant.purpose !== EnrollmentGrantPurpose.STAFF_RECOVERY) || grant.consumedAt || grant.expiresAt <= new Date() || !grant.accountId) {
      throw new UnauthorizedException("Invitation unavailable");
    }
    return this.newRegistrationChallenge(grant.accountId);
  }

  async invitationVerify(token: string, ceremonyId: string, response: RegistrationResponseJSON, userAgent?: string, ipAddress?: string) {
    const grant = await this.db.identityEnrollmentGrant.findUnique({ where: { tokenHash: digest(token) } });
    const challenge = await this.db.webAuthnChallenge.findUnique({ where: { id: ceremonyId } });
    if (!grant || (grant.purpose !== EnrollmentGrantPurpose.STAFF_INVITATION && grant.purpose !== EnrollmentGrantPurpose.STAFF_RECOVERY) || grant.consumedAt || grant.expiresAt <= new Date() || !grant.accountId || challenge?.accountId !== grant.accountId) {
      throw new UnauthorizedException("Invitation unavailable");
    }
    const result = await this.registerVerify(ceremonyId, response, "invitation", grant.accountId, userAgent, ipAddress, undefined, grant.id);
    if (grant.recoveryAuthorizationId) {
      await this.db.staffRecoveryAuthorization.update({ where: { id: grant.recoveryAuthorizationId }, data: { usedAt: new Date() } });
      await this.event(SecurityEventType.RECOVERY_USED, SecurityEventResult.SUCCESS, grant.authorizedByAccountId ?? undefined, grant.accountId);
    }
    return result;
  }

  async authorizeStaffRecovery(ownerId: string, staffId: string, reason: string) {
    const owner = await this.db.account.findUniqueOrThrow({ where: { id: ownerId } });
    const staff = await this.db.account.findUnique({ where: { id: staffId }, include: { passkeyCredentials: { where: { revokedAt: null } } } });
    if (owner.kind !== AccountKind.OWNER || owner.state !== AccountState.ACTIVE || !(await this.ownerReady(ownerId)) || !staff || staff.kind !== AccountKind.STAFF || staff.state !== AccountState.ACTIVE) {
      throw new ForbiddenException("Recovery unavailable");
    }
    const token = randomSecret();
    await this.db.$transaction(async (tx) => {
      const now = new Date();
      await tx.passkeyCredential.updateMany({ where: { accountId: staffId, revokedAt: null }, data: { revokedAt: now } });
      await tx.session.updateMany({ where: { accountId: staffId, revokedAt: null }, data: { revokedAt: now } });
      await tx.account.update({ where: { id: staffId }, data: { state: AccountState.PENDING } });
      const authorization = await tx.staffRecoveryAuthorization.create({
        data: { accountId: staffId, authorizedByAccountId: ownerId, reason, lostCredentialIds: staff.passkeyCredentials.map((item) => item.id) }
      });
      await tx.identityEnrollmentGrant.create({
        data: {
          purpose: EnrollmentGrantPurpose.STAFF_RECOVERY,
          tokenHash: digest(token),
          accountId: staffId,
          normalizedEmail: staff.normalizedEmail,
          authorizedByAccountId: ownerId,
          recoveryAuthorizationId: authorization.id,
          reason,
          expiresAt: new Date(Date.now() + invitationLifetimeMs)
        }
      });
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.RECOVERY_AUTHORIZED, result: SecurityEventResult.SUCCESS, actorId: ownerId, subjectId: staffId } });
    });
    return { recoveryToken: token, expiresInSeconds: invitationLifetimeMs / 1000 };
  }

  async lookupStaff(ownerId: string, email: string) {
    const owner = await this.db.account.findUniqueOrThrow({ where: { id: ownerId } });
    if (owner.kind !== AccountKind.OWNER || !(await this.ownerReady(ownerId))) throw new ForbiddenException();
    const staff = await this.db.account.findUnique({ where: { normalizedEmail: normalizeEmail(email) } });
    if (!staff || staff.kind !== AccountKind.STAFF) return null;
    return { id: staff.id, email: staff.normalizedEmail, state: staff.state };
  }

  async forceLogoutStaff(ownerId: string, staffId: string, reason: string): Promise<number> {
    const owner = await this.db.account.findUniqueOrThrow({ where: { id: ownerId } });
    const staff = await this.db.account.findUnique({ where: { id: staffId } });
    if (owner.kind !== AccountKind.OWNER || !(await this.ownerReady(ownerId)) || !staff || staff.kind !== AccountKind.STAFF) throw new ForbiddenException();
    return this.db.$transaction(async (tx) => {
      const updated = await tx.session.updateMany({ where: { accountId: staffId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.SESSION_REVOKED, result: SecurityEventResult.SUCCESS, actorId: ownerId, subjectId: staffId, metadata: { reason } } });
      return updated.count;
    });
  }

  async ownerReady(ownerId: string): Promise<boolean> {
    const [credentialCount, codeCount] = await Promise.all([
      this.db.passkeyCredential.count({ where: { accountId: ownerId, revokedAt: null } }),
      this.db.ownerRecoveryCode.count({ where: { accountId: ownerId, usedAt: null, replacedAt: null, acknowledgedAt: { not: null } } })
    ]);
    return credentialCount >= 2 && codeCount >= 1;
  }

  async issueOwnerRecoveryCode(ownerId: string) {
    const owner = await this.db.account.findUniqueOrThrow({ where: { id: ownerId } });
    if (owner.kind !== AccountKind.OWNER || owner.state !== AccountState.ACTIVE) throw new ForbiddenException();
    const credentialCount = await this.db.passkeyCredential.count({ where: { accountId: ownerId, revokedAt: null } });
    if (credentialCount < 2) throw new ForbiddenException("Register a second passkey first");
    const code = randomSecret();
    await this.db.$transaction(async (tx) => {
      await tx.ownerRecoveryCode.updateMany({ where: { accountId: ownerId, usedAt: null, replacedAt: null }, data: { replacedAt: new Date() } });
      await tx.ownerRecoveryCode.create({ data: { accountId: ownerId, codeHash: digest(code) } });
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.RECOVERY_KIT_ISSUED, result: SecurityEventResult.SUCCESS, actorId: ownerId, subjectId: ownerId } });
    });
    return { recoveryCode: code };
  }

  async acknowledgeOwnerRecoveryCode(ownerId: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const result = await tx.ownerRecoveryCode.updateMany({
        where: { accountId: ownerId, usedAt: null, replacedAt: null, acknowledgedAt: null },
        data: { acknowledgedAt: new Date() }
      });
      if (result.count !== 1) throw new BadRequestException("Recovery kit is unavailable");
      await tx.securityEvent.create({ data: { eventType: SecurityEventType.RECOVERY_KIT_ACKNOWLEDGED, result: SecurityEventResult.SUCCESS, actorId: ownerId, subjectId: ownerId } });
    });
  }

  async activePasskeyCount(accountId: string): Promise<number> {
    return this.db.passkeyCredential.count({ where: { accountId, revokedAt: null } });
  }

  async ownerRecoveryOptions(email: string, code: string) {
    const owner = await this.db.account.findUnique({ where: { normalizedEmail: normalizeEmail(email) } });
    const stored = await this.db.ownerRecoveryCode.findUnique({ where: { codeHash: digest(code) } });
    if (!owner || owner.kind !== AccountKind.OWNER || owner.state !== AccountState.ACTIVE || !stored || stored.accountId !== owner.id || stored.usedAt || stored.replacedAt) {
      throw new UnauthorizedException("Recovery unavailable");
    }
    return this.newRegistrationChallenge(owner.id);
  }

  async ownerRecoveryVerify(email: string, code: string, ceremonyId: string, response: RegistrationResponseJSON, userAgent?: string, ipAddress?: string) {
    const owner = await this.db.account.findUnique({ where: { normalizedEmail: normalizeEmail(email) } });
    const challenge = await this.db.webAuthnChallenge.findUnique({ where: { id: ceremonyId } });
    if (!owner || owner.kind !== AccountKind.OWNER || challenge?.accountId !== owner.id) throw new UnauthorizedException("Recovery unavailable");
    return this.registerVerify(ceremonyId, response, "ownerRecovery", owner.id, userAgent, ipAddress, code);
  }

  async cleanupExpired(): Promise<void> {
    const now = Date.now();
    await this.db.webAuthnChallenge.deleteMany({ where: { expiresAt: { lt: new Date(now - 7 * 24 * 60 * 60_000) } } });
    await this.db.identityEnrollmentGrant.deleteMany({ where: { expiresAt: { lt: new Date(now - 30 * 24 * 60 * 60_000) } } });
    await this.db.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date(now - 30 * 24 * 60 * 60_000) } },
          { revokedAt: { lt: new Date(now - 30 * 24 * 60 * 60_000) } }
        ]
      }
    });
  }
}

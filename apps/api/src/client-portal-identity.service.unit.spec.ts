import { createHash } from "node:crypto";
import { BadRequestException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { AccountKind, AccountState } from "./generated/prisma/client.js";
import { ClientPortalIdentityService } from "./client-portal-identity.service.js";
import type { DatabaseService } from "./database.service.js";
import type { RuntimeConfig } from "./config.js";
import type { BrevoEmailAdapter } from "./brevo-email.js";

const accountId = "c64f2145-5810-4a7e-9485-fbe9099c50cf";
const otherAccountId = "c9c0cb64-334f-46c8-997b-7c5ce4fd97a4";
const sessionId = "a5a5f862-0473-4bd2-9329-90fa057139f1";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const config: RuntimeConfig = {
  nodeEnv: "test",
  port: 4000,
  databaseUrl: "postgresql://test:test@localhost:5432/test",
  webOrigin: "http://localhost:5173",
  ownerBootstrapEmail: undefined,
  ownerBootstrapSecret: undefined,
  emailVerificationSecret: "s".repeat(48)
};

function serviceWith(prisma: Record<string, unknown>, send = jest.fn(async (email: string, content: { subject: string; textContent: string }) => {
  void email;
  void content;
})) {
  const database = { prisma } as unknown as DatabaseService;
  return { service: new ClientPortalIdentityService(database, { send } as unknown as BrevoEmailAdapter, config), send };
}

function activeSession(overrides: Record<string, unknown> = {}) {
  const secret = "client-portal-secret";
  const csrfToken = "client-portal-csrf-token";
  return {
    row: {
      id: sessionId,
      accountId,
      tokenHash: digest(secret),
      csrfTokenHash: digest(csrfToken),
      createdAt: new Date(),
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      userAgent: null,
      ipAddress: null,
      ...((overrides.row ?? {}) as Record<string, unknown>)
    },
    account: { id: accountId, normalizedEmail: "client@example.test", kind: AccountKind.CLIENT, state: AccountState.ACTIVE },
    csrfToken
  } as never;
}

describe("client portal emailed-code identity", () => {
  it("returns the same accepted response for an unknown address and a granted client, sending mail only to the latter", async () => {
    let account: Record<string, unknown> | null = null;
    const grantCount = jest.fn(async () => 1);
    const tx = {
      $executeRaw: jest.fn(),
      account: { findUnique: jest.fn(async () => account) },
      clientPortalGrant: { count: grantCount },
      $queryRaw: jest.fn(),
      clientPortalCode: {
        findUnique: jest.fn(async () => null),
        upsert: jest.fn(async () => undefined)
      }
    };
    const prisma = { $transaction: async <T>(run: (client: typeof tx) => Promise<T>) => run(tx) };
    const { service, send } = serviceWith(prisma);

    const unknown = await service.requestCode(" Nobody@Example.Test ");
    account = { id: accountId, kind: AccountKind.CLIENT, state: AccountState.ACTIVE, normalizedEmail: "client@example.test" };
    const known = await service.requestCode("client@example.test");

    expect(unknown).toEqual({ accepted: true });
    expect(known).toEqual(unknown);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toBe("client@example.test");
    expect(send.mock.calls[0]?.[1].textContent).toContain("sign-in code is ");
    expect(known).not.toHaveProperty("code");
    expect(tx.clientPortalCode.upsert).toHaveBeenCalledTimes(1);
  });

  it("silently enforces the resend interval and hourly send ceiling", async () => {
    const now = new Date();
    const upsert = jest.fn();
    const findUnique = jest.fn(async () => ({
      lastSentAt: now,
      sendWindowStartedAt: new Date(now.getTime() - 59 * 60_000),
      sendsInWindow: 5
    }));
    const tx = {
      $executeRaw: jest.fn(), $queryRaw: jest.fn(),
      account: { findUnique: jest.fn(async () => ({ id: accountId, normalizedEmail: "client@example.test", kind: AccountKind.CLIENT, state: AccountState.ACTIVE })) },
      clientPortalGrant: { count: jest.fn(async () => 1) },
      clientPortalCode: { findUnique, upsert }
    };
    const { service, send } = serviceWith({ $transaction: async <T>(run: (client: typeof tx) => Promise<T>) => run(tx) });

    await expect(service.requestCode("client@example.test")).resolves.toEqual({ accepted: true });

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(upsert).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("persists each wrong-code attempt before returning the generic authentication failure", async () => {
    const challenge = {
      accountId,
      codeHash: "0".repeat(64),
      attempts: 2,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null
    };
    const updateMany = jest.fn(async ({ data }: { data: { attempts: { increment: number } } }) => {
      challenge.attempts += data.attempts.increment;
      return { count: 1 };
    });
    const tx = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      account: { findUnique: jest.fn(async () => ({ id: accountId, normalizedEmail: "client@example.test", kind: AccountKind.CLIENT, state: AccountState.ACTIVE })) },
      clientPortalGrant: { count: jest.fn(async () => 1) },
      clientPortalCode: { findUnique: jest.fn(async () => challenge), updateMany },
      clientPortalSession: { create: jest.fn() },
      securityEvent: { create: jest.fn() }
    };
    const { service } = serviceWith({ $transaction: async <T>(run: (client: typeof tx) => Promise<T>) => run(tx) });

    await expect(service.verifyCode("client@example.test", "123456")).rejects.toBeInstanceOf(UnauthorizedException);

    expect(challenge.attempts).toBe(3);
    expect(updateMany).toHaveBeenCalledWith({
      where: { accountId, consumedAt: null, attempts: { lt: 5 } },
      data: { attempts: { increment: 1 } }
    });
    expect(tx.clientPortalSession.create).not.toHaveBeenCalled();
  });

  it("rereads CLIENT state after locking so a suspension cannot race code verification", async () => {
    const accountReads = jest.fn()
      .mockResolvedValueOnce({ id: accountId })
      .mockResolvedValueOnce({ id: accountId, normalizedEmail: "client@example.test", kind: AccountKind.CLIENT, state: AccountState.SUSPENDED });
    const codeLookup = jest.fn();
    const sessionCreate = jest.fn();
    const tx = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      account: { findUnique: accountReads },
      clientPortalCode: { findUnique: codeLookup },
      clientPortalSession: { create: sessionCreate },
      securityEvent: { create: jest.fn() }
    };
    const { service } = serviceWith({ $transaction: async <T>(run: (client: typeof tx) => Promise<T>) => run(tx) });

    await expect(service.verifyCode("client@example.test", "123456")).rejects.toBeInstanceOf(UnauthorizedException);

    expect(accountReads).toHaveBeenNthCalledWith(1, { where: { normalizedEmail: "client@example.test" }, select: { id: true } });
    expect(accountReads).toHaveBeenNthCalledWith(2, { where: { id: accountId } });
    expect(accountReads).toHaveBeenCalledTimes(2);
    expect(codeLookup).not.toHaveBeenCalled();
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("does not accept a code after expiry, consumption or the attempt ceiling", async () => {
    for (const challenge of [
      { consumedAt: new Date(), expiresAt: new Date(Date.now() + 60_000), attempts: 0 },
      { consumedAt: null, expiresAt: new Date(Date.now() - 1), attempts: 0 },
      { consumedAt: null, expiresAt: new Date(Date.now() + 60_000), attempts: 5 }
    ]) {
      const updateMany = jest.fn();
      const tx = {
        $executeRaw: jest.fn(), $queryRaw: jest.fn(),
        account: { findUnique: jest.fn(async () => ({ id: accountId, normalizedEmail: "client@example.test", kind: AccountKind.CLIENT, state: AccountState.ACTIVE })) },
        clientPortalGrant: { count: jest.fn(async () => 1) },
        clientPortalCode: { findUnique: jest.fn(async () => ({ accountId, codeHash: "0".repeat(64), ...challenge })), updateMany },
        clientPortalSession: { create: jest.fn() }
      };
      const { service } = serviceWith({ $transaction: async <T>(run: (client: typeof tx) => Promise<T>) => run(tx) });
      await expect(service.verifyCode("client@example.test", "123456")).rejects.toBeInstanceOf(UnauthorizedException);
      expect(updateMany).not.toHaveBeenCalled();
      expect(tx.clientPortalSession.create).not.toHaveBeenCalled();
    }
  });

  it("creates a separate portal session after atomically consuming a valid code", async () => {
    const challenge = {
      accountId,
      codeHash: createHash("sha256").update("unreachable").digest("hex"),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null
    };
    const sessionCreate = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: sessionId, data }));
    const codeUpdate = jest.fn(async () => ({ count: 1 }));
    const tx = {
      $executeRaw: jest.fn(), $queryRaw: jest.fn(),
      account: { findUnique: jest.fn(async () => ({ id: accountId, normalizedEmail: "client@example.test", kind: AccountKind.CLIENT, state: AccountState.ACTIVE })) },
      clientPortalGrant: { count: jest.fn(async () => 1) },
      clientPortalCode: { findUnique: jest.fn(async () => challenge), updateMany: codeUpdate },
      clientPortalSession: { create: sessionCreate },
      securityEvent: { create: jest.fn() }
    };
    const { service } = serviceWith({ $transaction: async <T>(run: (client: typeof tx) => Promise<T>) => run(tx) });
    // Obtain the HMAC output without exposing a test hook by using a known request's persisted upsert data.
    const requestTx = {
      $executeRaw: jest.fn(), $queryRaw: jest.fn(),
      account: { findUnique: jest.fn(async () => ({ id: accountId, normalizedEmail: "client@example.test", kind: AccountKind.CLIENT, state: AccountState.ACTIVE })) },
      clientPortalGrant: { count: jest.fn(async () => 1) },
      clientPortalCode: { findUnique: jest.fn(async () => null), upsert: jest.fn(async ({ create }: { create: { codeHash: string } }) => { challenge.codeHash = create.codeHash; }) }
    };
    const { service: requester, send } = serviceWith({ $transaction: async <T>(run: (client: typeof requestTx) => Promise<T>) => run(requestTx) });
    await requester.requestCode("client@example.test");
    const sentCode = (send.mock.calls[0]?.[1].textContent.match(/code is (\d{6})/) ?? [])[1];
    expect(sentCode).toBeDefined();
    const result = await service.verifyCode("client@example.test", sentCode!);

    expect(result).toMatchObject({ sessionId });
    expect(result.secret).toHaveLength(43);
    expect(result.csrfToken).toBeTruthy();
    expect(codeUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ accountId, consumedAt: null, attempts: { lt: 5 } }) }));
    const data = sessionCreate.mock.calls[0]?.[0].data;
    expect(data).toEqual(expect.objectContaining({ accountId, expiresAt: expect.any(Date), tokenHash: digest(result.secret), csrfTokenHash: digest(result.csrfToken) }));
  });
});

describe("client portal session and ceremony isolation", () => {
  it.each([
    ["revoked", { revokedAt: new Date() }],
    ["absolutely expired", { expiresAt: new Date(Date.now() - 1) }],
    ["idle expired", { lastUsedAt: new Date(Date.now() - 30 * 60_000 - 1) }]
  ])("rejects a %s portal session", async (_label, changes) => {
    const row = { id: sessionId, accountId, tokenHash: digest("secret"), csrfTokenHash: digest("csrf"), createdAt: new Date(), lastUsedAt: new Date(), expiresAt: new Date(Date.now() + 60_000), revokedAt: null, userAgent: null, ipAddress: null, ...changes };
    const findUnique = jest.fn(async () => row);
    const { service } = serviceWith({ clientPortalSession: { findUnique }, account: { findUnique: jest.fn() } });
    await expect(service.session("secret")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).toHaveBeenCalledWith({ where: { tokenHash: digest("secret") } });
  });

  it("rejects missing client grants, checks CSRF, and scopes session revocation to its owner", async () => {
    const current = activeSession() as { row: { id: string; accountId: string; csrfTokenHash: string }; account: { id: string }; csrfToken: string };
    const updateMany = jest.fn(async () => ({ count: 0 }));
    const tx = {
      clientPortalSession: { findUnique: jest.fn(async () => current.row), updateMany },
      securityEvent: { create: jest.fn() }
    };
    const { service } = serviceWith({
      ...tx,
      account: { findUnique: jest.fn(async () => ({ ...current.account, normalizedEmail: "client@example.test", kind: AccountKind.CLIENT, state: AccountState.ACTIVE })) },
      clientPortalGrant: { count: jest.fn(async () => 0) },
      $transaction: async <T>(run: (client: typeof tx) => Promise<T>) => run(tx)
    });
    await expect(service.session("secret")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(() => service.verifyCsrf(current as never, "wrong")).toThrow(ForbiddenException);
    await expect(service.revokeSession(accountId, sessionId)).rejects.toBeInstanceOf(BadRequestException);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: sessionId, accountId, revokedAt: null }, data: { revokedAt: expect.any(Date) } });
    expect(updateMany.mock.calls[0]?.[0].where).not.toHaveProperty("accountId", otherAccountId);
  });

  it("blocks passkey registration when all remaining access is for cancelled projects", async () => {
    const active = activeSession();
    const ceremonyCreate = jest.fn();
    const { service } = serviceWith({
      clientPortalGrant: { findMany: jest.fn(async () => [{ projectId: "a6f9ee4b-47e8-4ee6-94f3-627c12274341" }]) },
      project: { count: jest.fn(async () => 0) },
      clientPortalCeremony: { create: ceremonyCreate }
    });
    await expect(service.registerOptions(active)).rejects.toBeInstanceOf(ForbiddenException);
    expect(ceremonyCreate).not.toHaveBeenCalled();
  });

  it("does not persist a registered passkey if the portal session was revoked after ceremony issuance", async () => {
    const active = activeSession();
    const credentialCreate = jest.fn();
    const tx = {
      $queryRaw: jest.fn(),
      account: { findUnique: jest.fn(async () => ({ id: accountId, normalizedEmail: "client@example.test", kind: AccountKind.CLIENT, state: AccountState.ACTIVE })) },
      clientPortalSession: { findUnique: jest.fn(async () => ({ id: sessionId, accountId, expiresAt: new Date(Date.now() + 60_000), lastUsedAt: new Date(), revokedAt: new Date() })) },
      passkeyCredential: { create: credentialCreate },
      securityEvent: { create: jest.fn() }
    };
    const { service } = serviceWith({ $transaction: async <T>(run: (client: typeof tx) => Promise<T>) => run(tx) });
    const persist = (service as unknown as {
      persistRegisteredCredential: (session: typeof active, response: unknown, verified: unknown) => Promise<void>
    }).persistRegisteredCredential.bind(service);
    const response = { response: { transports: [] } } as never;
    const verified = { verified: true, registrationInfo: { credential: { id: "new-credential", publicKey: new Uint8Array([1, 2]), counter: 0 } } } as never;

    await expect(persist(active, response, verified)).rejects.toBeInstanceOf(UnauthorizedException);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.clientPortalSession.findUnique).toHaveBeenCalledWith({ where: { id: sessionId } });
    expect(credentialCreate).not.toHaveBeenCalled();
  });

  it("consumes an approval ceremony bound to the current account/session before rejecting a mismatched immutable binding", async () => {
    const active = activeSession();
    const ceremony = {
      id: "84f2fab8-75bb-4407-b43f-2b0d78469f7a",
      accountId,
      sessionId,
      purpose: "APPROVAL",
      challenge: "webauthn-challenge",
      binding: { revisionId: "one", version: 1 },
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null
    };
    const consume = jest.fn(async () => {
      ceremony.consumedAt = new Date();
      return { count: 1 };
    });
    const tx = {
      $queryRaw: jest.fn(),
      account: { findUnique: jest.fn(async () => ({ id: accountId, normalizedEmail: "client@example.test", kind: AccountKind.CLIENT, state: AccountState.ACTIVE })) },
      clientPortalSession: { findUnique: jest.fn(async () => ({ id: sessionId, accountId, expiresAt: new Date(Date.now() + 60_000), lastUsedAt: new Date(), revokedAt: null })) },
      clientPortalGrant: { count: jest.fn(async () => 1) },
      clientPortalCeremony: { findUnique: jest.fn(async () => ceremony), updateMany: consume }
    };
    const { service } = serviceWith({});
    await expect(service.verifyApprovalWithinTransaction(tx as never, active, ceremony.id, { id: "credential" } as never, { revisionId: "two", version: 1 })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(consume).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: ceremony.id, accountId, sessionId, purpose: "APPROVAL", consumedAt: null }),
      data: { consumedAt: expect.any(Date) }
    }));
    await expect(service.verifyApprovalWithinTransaction(tx as never, active, ceremony.id, { id: "credential" } as never, { revisionId: "two", version: 1 })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(consume).toHaveBeenCalledTimes(1);
  });

  it.each(["account", "credential"])("rejects approval when the session expires during the %s lock wait", async (lock) => {
    jest.useFakeTimers();
    try {
      const started = new Date("2026-10-01T00:00:00Z");
      jest.setSystemTime(started);
      const active = activeSession() as unknown as { account: { id: string }; row: { id: string } };
      const portalSession = { id: sessionId, accountId, revokedAt: null, expiresAt: new Date(started.getTime() + 60_000), lastUsedAt: started };
      const ceremony = { id: sessionId, accountId, sessionId, purpose: "APPROVAL", binding: { item: "one" }, challenge: "challenge", consumedAt: null, expiresAt: new Date(started.getTime() + 300_000) };
      let lockCount = 0;
      let credentialMaterialRead = false;
      const consume = jest.fn(async () => ({ count: 1 }));
      const credentialUpdate = jest.fn();
      const tx = {
        $queryRaw: jest.fn(async () => {
          lockCount++;
          if (lockCount === (lock === "account" ? 1 : 3)) jest.setSystemTime(started.getTime() + 60_001);
        }),
        account: { findUnique: jest.fn(async () => ({ id: accountId, kind: AccountKind.CLIENT, state: AccountState.ACTIVE })) },
        clientPortalSession: { findUnique: jest.fn(async () => portalSession) },
        clientPortalGrant: { count: jest.fn(async () => 1) },
        clientPortalCeremony: { findUnique: jest.fn(async () => ceremony), updateMany: consume },
        passkeyCredential: {
          findUnique: jest.fn(async () => ({ id: "credential-row", accountId, credentialId: "credential", revokedAt: null, counter: 0n, transports: [], get publicKey() { credentialMaterialRead = true; return new Uint8Array([1]); } })),
          updateMany: credentialUpdate
        },
        securityEvent: { create: jest.fn() }
      };
      const { service } = serviceWith({});

      await expect(service.verifyApprovalWithinTransaction(tx as never, active as never, ceremony.id, { id: "credential" } as never, { item: "one" })).rejects.toBeInstanceOf(UnauthorizedException);

      expect(consume).toHaveBeenCalledTimes(lock === "account" ? 0 : 1);
      expect(credentialMaterialRead).toBe(false);
      expect(credentialUpdate).not.toHaveBeenCalled();
      expect(tx.securityEvent.create).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("rechecks grant expiry with the current clock after a credential lock wait", async () => {
    jest.useFakeTimers();
    try {
      const started = new Date("2026-10-01T00:00:00Z");
      jest.setSystemTime(started);
      const active = activeSession();
      const grantExpiry = started.getTime() + 1000;
      let lockCount = 0;
      let credentialMaterialRead = false;
      const grantCount = jest.fn(async ({ where }: { where: { OR: [{ expiresAt: null }, { expiresAt: { gt: Date } }] } }) => where.OR[1].expiresAt.gt.getTime() < grantExpiry ? 1 : 0);
      const tx = {
        $queryRaw: jest.fn(async () => { if (++lockCount === 3) jest.setSystemTime(grantExpiry + 1); }),
        account: { findUnique: jest.fn(async () => ({ id: accountId, kind: AccountKind.CLIENT, state: AccountState.ACTIVE })) },
        clientPortalSession: { findUnique: jest.fn(async () => ({ id: sessionId, accountId, revokedAt: null, expiresAt: new Date(started.getTime() + 60_000), lastUsedAt: started })) },
        clientPortalGrant: { count: grantCount },
        clientPortalCeremony: {
          findUnique: jest.fn(async () => ({ id: sessionId, accountId, sessionId, purpose: "APPROVAL", binding: {}, challenge: "challenge", consumedAt: null, expiresAt: new Date(started.getTime() + 300_000) })),
          updateMany: jest.fn(async () => ({ count: 1 }))
        },
        passkeyCredential: { findUnique: jest.fn(async () => ({ id: "credential-row", accountId, credentialId: "credential", revokedAt: null, counter: 0n, get publicKey() { credentialMaterialRead = true; return new Uint8Array([1]); } })) }
      };
      const { service } = serviceWith({});

      await expect(service.verifyApprovalWithinTransaction(tx as never, active, sessionId, { id: "credential" } as never, {})).rejects.toBeInstanceOf(UnauthorizedException);

      expect(grantCount).toHaveBeenCalledTimes(2);
      expect(credentialMaterialRead).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});

import { createHash, createHmac } from "node:crypto";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { AccountState, SecurityEventResult, SecurityEventType, WebAuthnChallengePurpose } from "./generated/prisma/client.js";
import { IdentityService } from "./identity.service.js";
import type { DatabaseService } from "./database.service.js";
import type { RuntimeConfig } from "./config.js";

const accountId = "c64f2145-5810-4a7e-9485-fbe9099c50cf";
const sessionId = "a5a5f862-0473-4bd2-9329-90fa057139f1";
const secret = "random-session-secret";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const config: RuntimeConfig = {
  nodeEnv: "test",
  port: 4000,
  databaseUrl: "postgresql://test:test@localhost:5432/test",
  webOrigin: "http://localhost:5173",
  ownerBootstrapEmail: "owner@example.test",
  ownerBootstrapSecret: "b".repeat(48)
};

function serviceWith(prisma: Record<string, unknown>) {
  return new IdentityService({ prisma } as unknown as DatabaseService, config);
}

function activeSession() {
  const csrfToken = createHmac("sha256", secret).update("csrf").digest("base64url");
  const row = {
    id: sessionId,
    accountId,
    tokenHash: digest(secret),
    csrfTokenHash: digest(csrfToken),
    lastUsedAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null as Date | null,
    account: { id: accountId, state: AccountState.ACTIVE }
  };
  return { row, csrfToken };
}

describe("identity session security", () => {
  it.each([
    ["missing", undefined],
    ["overlong", "x".repeat(129)]
  ])("rejects %s session secrets before database lookup", async (_label, input) => {
    const findUnique = jest.fn();
    const identity = serviceWith({ session: { findUnique } });
    await expect(identity.session(input)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["unknown", null],
    ["revoked", { ...activeSession().row, revokedAt: new Date() }],
    ["expired", { ...activeSession().row, expiresAt: new Date(Date.now() - 1) }],
    ["suspended account", { ...activeSession().row, account: { id: accountId, state: AccountState.SUSPENDED } }]
  ])("rejects %s sessions", async (_label, row) => {
    const findUnique = jest.fn().mockResolvedValue(row && { ...row, account: row.account ?? { id: accountId, state: AccountState.ACTIVE } });
    const identity = serviceWith({ session: { findUnique } });
    await expect(identity.session(secret)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).toHaveBeenCalledWith({
      where: { tokenHash: digest(secret) },
      include: { account: true }
    });
  });

  it("validates CSRF against both the session-bound token and its stored hash", async () => {
    const { row, csrfToken } = activeSession();
    const identity = serviceWith({});
    const session = { row, csrfToken } as Awaited<ReturnType<IdentityService["session"]>>;
    expect(() => identity.verifyCsrf(session, undefined)).toThrow();
    expect(() => identity.verifyCsrf(session, "wrong-token")).toThrow();
    expect(() => identity.verifyCsrf(session, csrfToken)).not.toThrow();
    const forgedStoredHash = { ...session, row: { ...row, csrfTokenHash: digest("different") } } as Awaited<ReturnType<IdentityService["session"]>>;
    expect(() => identity.verifyCsrf(forgedStoredHash, csrfToken)).toThrow();
  });

  it("revokes the current session on logout and emits a success event", async () => {
    const { row } = activeSession();
    const updateMany = jest.fn(async ({ data }: { data: { revokedAt: Date } }) => { row.revokedAt = data.revokedAt; return { count: 1 }; });
    const findUnique = jest.fn(async () => ({ ...row, account: { id: accountId, state: AccountState.ACTIVE } }));
    const securityEventCreate = jest.fn();
    const transaction = { session: { findUnique, updateMany }, securityEvent: { create: securityEventCreate } };
    const identity = serviceWith({ ...transaction, $transaction: async (run: (tx: typeof transaction) => Promise<void>) => run(transaction) });

    await identity.logout(secret);

    expect(updateMany).toHaveBeenCalledWith({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: expect.any(Date) } });
    expect(securityEventCreate).toHaveBeenCalledWith({
      data: {
        eventType: SecurityEventType.SESSION_REVOKED,
        result: SecurityEventResult.SUCCESS,
        actorId: accountId,
        subjectId: accountId
      }
    });
    await expect(identity.session(secret)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("scopes targeted revocation by account and rejects missing or foreign sessions", async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const transaction = { session: { updateMany }, securityEvent: { create: jest.fn() } };
    const identity = serviceWith({ ...transaction, $transaction: async (run: (tx: typeof transaction) => Promise<void>) => run(transaction) });
    await expect(identity.revokeSession(accountId, sessionId)).rejects.toBeInstanceOf(BadRequestException);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: sessionId, accountId, revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
  });

  it("returns only nonsecret device fields for the requested account's session list", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const identity = serviceWith({ session: { findMany } });
    await identity.listSessions(accountId);
    expect(findMany).toHaveBeenCalledWith({
      where: { accountId },
      select: { id: true, createdAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true, userAgent: true },
      orderBy: { createdAt: "desc" }
    });
  });
});

describe("generic unknown-account authentication", () => {
  it("returns the same public login-options shape for known and unknown emails", async () => {
    let account: { id: string; state: string } | null = null;
    const created: Array<{ accountId: string | null; purpose: string }> = [];
    const prisma = {
      account: { findUnique: jest.fn(async () => account) },
      webAuthnChallenge: {
        create: jest.fn(async ({ data }: { data: { accountId: string | null; purpose: string } }) => {
      created.push({ accountId: data.accountId, purpose: data.purpose });
          return { id: `ceremony-${created.length}` };
        })
      }
    };
    const identity = serviceWith(prisma);

    const unknown = await identity.loginOptions(" Nobody@Example.Test ");
    account = { id: accountId, state: AccountState.ACTIVE };
    const known = await identity.loginOptions("owner@example.test");

    expect(Object.keys(unknown).sort()).toEqual(Object.keys(known).sort());
    expect(Object.keys(unknown.options).sort()).toEqual(Object.keys(known.options).sort());
    expect(unknown).not.toHaveProperty("accountId");
    expect(known).not.toHaveProperty("accountId");
    expect(created).toEqual([
      { accountId: null, purpose: WebAuthnChallengePurpose.AUTHENTICATION },
      { accountId, purpose: WebAuthnChallengePurpose.AUTHENTICATION }
    ]);
    expect(prisma.account.findUnique).toHaveBeenNthCalledWith(1, { where: { normalizedEmail: "nobody@example.test" } });
  });

  it("uses the generic authentication failure for unknown accounts and missing credentials", async () => {
    const cases = [
      { accountId: null, credential: null },
      { accountId, credential: null }
    ];
    const messages: string[] = [];
    for (const testCase of cases) {
      const prisma = {
        webAuthnChallenge: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "ceremony", accountId: testCase.accountId, challenge: "challenge" })
        },
        passkeyCredential: { findUnique: jest.fn().mockResolvedValue(testCase.credential) },
        securityEvent: { create: jest.fn() }
      };
      const identity = serviceWith(prisma);
      try {
        await identity.loginVerify("ceremony", { id: "unknown-credential" } as never);
        throw new Error("expected login verification to fail");
      } catch (error) {
        messages.push(error instanceof UnauthorizedException ? error.message : "unexpected failure");
      }
    }
    expect(messages).toEqual(["Authentication failed", "Authentication failed"]);
  });
});

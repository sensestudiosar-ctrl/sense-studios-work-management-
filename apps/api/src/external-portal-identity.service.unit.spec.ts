import { createHash, createHmac } from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { ExternalPortalIdentityService } from "./external-portal-identity.service.js";
import type { DatabaseService } from "./database.service.js";
import type { RuntimeConfig } from "./config.js";
import type { BrevoEmailAdapter } from "./brevo-email.js";

const accountId = "c64f2145-5810-4a7e-9485-fbe9099c50cf";
const sessionId = "a5a5f862-0473-4bd2-9329-90fa057139f1";
const secretKey = "s".repeat(48);
const config = {
  nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test",
  webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined,
  emailVerificationSecret: secretKey
} as RuntimeConfig;

function makeService(prisma: Record<string, unknown>, send = jest.fn(async (email: string, content: { subject: string; textContent: string }) => {
  void email;
  void content;
})) {
  const database = { prisma } as unknown as DatabaseService;
  return { service: new ExternalPortalIdentityService(database, { send } as unknown as BrevoEmailAdapter, config), send };
}

const account = { id: accountId, normalizedEmail: "vendor@example.test", kind: "EXTERNAL", state: "ACTIVE" };

describe("external portal isolated OTP identity", () => {
  it("keeps the generic accepted result for unknown and eligible addresses, even when delivery fails", async () => {
    let found: typeof account | null = null;
    const codeUpsert = jest.fn(async () => undefined);
    const tx = {
      $executeRaw: jest.fn(), $queryRaw: jest.fn(async () => [{ usable: true }]),
      account: { findUnique: jest.fn(async () => found) },
      externalPortalCode: { findUnique: jest.fn(async () => null), upsert: codeUpsert }
    };
    const prisma = { $transaction: async <T>(run: (client: typeof tx) => Promise<T>) => run(tx) };
    const send = jest.fn(async () => { throw new Error("mail provider details"); });
    const { service } = makeService(prisma, send as never);

    await expect(service.requestCode("nobody@example.test")).resolves.toEqual({ accepted: true });
    found = account;
    await expect(service.requestCode(" Vendor@Example.Test ")).resolves.toEqual({ accepted: true });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toBe("vendor@example.test");
    expect(send.mock.calls[0]?.[1].textContent).toMatch(/sign-in code is \d{6}/);
    expect(codeUpsert).toHaveBeenCalledTimes(1);
  });

  it("persists wrong-code attempts and consumes a valid code once", async () => {
    const validCode = "004201";
    const challenge: { codeHash: string; attempts: number; consumedAt: Date | null; expiresAt: Date } = {
      codeHash: createHmac("sha256", secretKey).update(`${accountId}:vendor@example.test:${validCode}`).digest("hex"),
      attempts: 0, consumedAt: null, expiresAt: new Date(Date.now() + 60_000)
    };
    const codeUpdate = jest.fn(async ({ where, data }: { where: { consumedAt?: null }; data: { attempts?: { increment: number }; consumedAt?: Date } }) => {
      if (data.attempts) challenge.attempts += data.attempts.increment;
      if (data.consumedAt && challenge.consumedAt === null) { challenge.consumedAt = data.consumedAt; return { count: 1 }; }
      if (where.consumedAt === null && data.consumedAt) return { count: 0 };
      return { count: 1 };
    });
    const sessionCreate = jest.fn(async () => ({ id: sessionId }));
    const tx = {
      $executeRaw: jest.fn(), $queryRaw: jest.fn(async () => [{ usable: true }]),
      account: { findUnique: jest.fn(async () => account) },
      externalPortalCode: {
        findUnique: jest.fn(async () => challenge),
        updateMany: codeUpdate
      },
      externalPortalSession: { create: sessionCreate },
      securityEvent: { create: jest.fn() }
    };
    const prisma = { $transaction: async <T>(run: (client: typeof tx) => Promise<T>) => run(tx) };
    const { service } = makeService(prisma);

    await expect(service.verifyCode("vendor@example.test", "123456")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(challenge.attempts).toBe(1);
    await expect(service.verifyCode("vendor@example.test", validCode, "browser", "127.0.0.1")).resolves.toEqual({ secret: expect.any(String) });
    expect(challenge.consumedAt).toBeInstanceOf(Date);
    expect(sessionCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ accountId, tokenHash: expect.any(String), expiresAt: expect.any(Date), userAgent: "browser", ipAddress: "127.0.0.1" }) }));
    await expect(service.verifyCode("vendor@example.test", validCode)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessionCreate).toHaveBeenCalledTimes(1);
  });

  it("stops checking a code after five recorded failures without consuming it or issuing a session", async () => {
    const updateMany = jest.fn();
    const createSession = jest.fn();
    const tx = {
      $executeRaw: jest.fn(), $queryRaw: jest.fn(async () => [{ usable: true }]),
      account: { findUnique: jest.fn(async () => account) },
      externalPortalCode: {
        findUnique: jest.fn(async () => ({ codeHash: "0".repeat(64), attempts: 5, consumedAt: null, expiresAt: new Date(Date.now() + 60_000) })),
        updateMany
      },
      externalPortalSession: { create: createSession }
    };
    const { service } = makeService({ $transaction: async <T>(run: (client: typeof tx) => Promise<T>) => run(tx) });

    await expect(service.verifyCode("vendor@example.test", "004201")).rejects.toBeInstanceOf(UnauthorizedException);

    expect(updateMany).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("rejects staff/client accounts and expired, revoked or unusable grants when restoring an external session", async () => {
    const token = "known-secret";
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const base = {
      id: sessionId, accountId, tokenHash, csrfTokenHash: "0".repeat(64), revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000), lastUsedAt: new Date(), createdAt: new Date()
    };
    const sessions = { findUnique: jest.fn(async () => base), updateMany: jest.fn() };
    const rawQuery = jest.fn(async () => [{ usable: true }]);
    const accounts = { findUnique: jest.fn(async () => account) };
    const { service } = makeService({ externalPortalSession: sessions, account: accounts, $queryRaw: rawQuery });

    await expect(service.session(token)).resolves.toMatchObject({ account: { kind: "EXTERNAL" }, row: { id: sessionId } });
    accounts.findUnique.mockImplementation(async () => ({ ...account, kind: "STAFF" }) as never);
    await expect(service.session(token)).rejects.toBeInstanceOf(UnauthorizedException);
    accounts.findUnique.mockImplementation(async () => account);
    rawQuery.mockImplementation(async () => [{ usable: false }] as never);
    await expect(service.session(token)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.updateMany).not.toHaveBeenCalled();
  });
});

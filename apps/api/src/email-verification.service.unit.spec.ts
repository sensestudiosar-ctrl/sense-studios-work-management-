import { jest } from "@jest/globals";
import { AccountState } from "./generated/prisma/client.js";
import { EmailVerificationService } from "./email-verification.service.js";

const accountId = "0f4b56bb-5f64-4ae9-850f-4a39aee4a3ed";
const emailAddress = "employee@example.test";

function harness() {
  const challenge = { accountId, codeHash: "", attempts: 0, sendWindowStartedAt: new Date(), sendsInWindow: 1, lastSentAt: new Date(), expiresAt: new Date(Date.now() + 600_000) };
  const tx = {
    $executeRaw: jest.fn(async () => 0),
    $queryRaw: jest.fn(async () => [{ id: accountId }]),
    account: {
      findFirst: jest.fn(async () => ({ normalizedEmail: emailAddress, emailVerifiedAt: null })),
      updateMany: jest.fn(async () => ({ count: 1 }))
    },
    emailVerificationChallenge: {
      findUnique: jest.fn(async () => challenge.codeHash ? challenge : null),
      upsert: jest.fn(async ({ create }: { create: typeof challenge }) => { Object.assign(challenge, create); return challenge; }),
      update: jest.fn(async ({ data }: { data: { attempts: { increment: number } } }) => { challenge.attempts += data.attempts.increment; return challenge; }),
      delete: jest.fn(async () => challenge)
    }
  };
  const prisma = { $transaction: jest.fn(async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx)) };
  const email = { send: jest.fn(async (recipient: string, content: { subject: string; textContent: string }) => { void recipient; void content; }) };
  const config = { emailVerificationSecret: "v".repeat(48) };
  const service = new EmailVerificationService({ prisma } as never, email as never, config as never);
  return { service, prisma, tx, email, challenge };
}

describe("email verification", () => {
  it("sends a short-lived code, persists only its keyed digest, and consumes it once", async () => {
    const { service, tx, email, challenge } = harness();
    await expect(service.requestCode(accountId)).resolves.toEqual({ sent: true });
    const body = email.send.mock.calls[0]?.[1]?.textContent ?? "";
    const code = body.match(/code is (\d{6})\./)?.[1];
    expect(code).toMatch(/^\d{6}$/);
    expect(challenge.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(challenge.codeHash).not.toBe(code);
    await expect(service.verifyCode(accountId, code!)).resolves.toEqual({ verified: true });
    expect(tx.account.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: accountId, state: AccountState.ACTIVE, emailVerifiedAt: null },
      data: { emailVerifiedAt: expect.any(Date) }
    }));
    expect(tx.emailVerificationChallenge.delete).toHaveBeenCalledWith({ where: { accountId } });
  });

  it("counts invalid codes and rejects attempts after the bound", async () => {
    const { service, tx, challenge, email } = harness();
    await service.requestCode(accountId);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const mailed = emailCodeFrom(email.send.mock.calls[0]?.[1]?.textContent ?? "");
      const wrongCode = mailed === "999999" ? "000000" : "999999";
      await expect(service.verifyCode(accountId, wrongCode)).rejects.toThrow("Verification code is invalid or expired");
    }
    expect(challenge.attempts).toBe(5);
    await expect(service.verifyCode(accountId, "000000")).rejects.toThrow("Verification code is invalid or expired");
    expect(tx.account.updateMany).not.toHaveBeenCalled();
  });
});

function emailCodeFrom(text: string): string {
  return text.match(/code is (\d{6})\./)?.[1] ?? "";
}

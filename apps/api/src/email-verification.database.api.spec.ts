import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "./database.service.js";
import { EmailVerificationService } from "./email-verification.service.js";
import type { RuntimeConfig } from "./config.js";

const databaseUrl = process.env.DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;
const config: RuntimeConfig = {
  nodeEnv: "test", port: 4000,
  databaseUrl: databaseUrl ?? "postgresql://sense_app_runtime@127.0.0.1:5432/sense_s04_test",
  webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined,
  emailVerificationSecret: "v".repeat(48)
};

integrationDescribe("email verification with PostgreSQL", () => {
  let database: DatabaseService;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("DATABASE_URL must point to a dedicated test database");
    database = new DatabaseService(config);
    const rows = await database.prisma.$queryRaw<Array<{ databaseName: string }>>`SELECT current_database() AS "databaseName"`;
    if (!/_test(?:db)?$/i.test(rows[0]?.databaseName ?? "")) {
      await database.onModuleDestroy();
      throw new Error("Email verification integration tests require a dedicated _test database");
    }
  });
  afterAll(async () => database?.onModuleDestroy());

  it("stores only keyed code digests, rate limits sends and attempts, and binds verification to the current address", async () => {
    const sentMessages: Array<{ recipient: string; content: { subject: string; textContent: string } }> = [];
    const service = new EmailVerificationService(
      database,
      { send: async (recipient, content) => { sentMessages.push({ recipient, content }); } } as never,
      config
    );
    const first = await database.prisma.account.create({ data: { normalizedEmail: `verify-${randomUUID()}@example.test`, kind: "STAFF", state: "ACTIVE" } });
    const second = await database.prisma.account.create({ data: { normalizedEmail: `verify-${randomUUID()}@example.test`, kind: "STAFF", state: "ACTIVE" } });
    try {
      await expect(service.requestCode(first.id)).resolves.toEqual({ sent: true });
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0]?.recipient).toBe(first.normalizedEmail);
      const code = sentMessages[0]?.content.textContent.match(/code is (\d{6})\./)?.[1];
      expect(code).toMatch(/^\d{6}$/);
      const stored = await database.prisma.emailVerificationChallenge.findUniqueOrThrow({ where: { accountId: first.id } });
      expect(stored.codeHash).toMatch(/^[a-f0-9]{64}$/);
      expect(stored.codeHash).not.toBe(code);
      await expect(service.requestCode(first.id)).rejects.toThrow("Wait before requesting another verification email");
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await expect(service.verifyCode(first.id, code === "999999" ? "000000" : "999999")).rejects.toThrow("Verification code is invalid or expired");
      }
      await expect(service.verifyCode(first.id, code!)).rejects.toThrow("Verification code is invalid or expired");
      expect((await database.prisma.account.findUniqueOrThrow({ where: { id: first.id } })).emailVerifiedAt).toBeNull();

      await service.requestCode(second.id);
      const secondCode = sentMessages[1]?.content.textContent.match(/code is (\d{6})\./)?.[1];
      await expect(service.verifyCode(second.id, secondCode!)).resolves.toEqual({ verified: true });
      expect((await database.prisma.account.findUniqueOrThrow({ where: { id: second.id } })).emailVerifiedAt).toBeInstanceOf(Date);
      expect(await database.prisma.emailVerificationChallenge.findUnique({ where: { accountId: second.id } })).toBeNull();
    } finally {
      await database.prisma.emailVerificationChallenge.deleteMany({ where: { accountId: { in: [first.id, second.id] } } });
      await database.prisma.account.deleteMany({ where: { id: { in: [first.id, second.id] } } });
    }
  });
});

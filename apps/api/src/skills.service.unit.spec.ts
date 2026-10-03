import { ForbiddenException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { AccountKind } from "./generated/prisma/client.js";
import { SkillsService } from "./skills.service.js";
import type { DatabaseService } from "./database.service.js";
import type { AuthorizationService } from "./authorization.service.js";
import type { ApprovalService } from "./approval.service.js";

const accountId = "c64f2145-5810-4a7e-9485-fbe9099c50cf", organizationId = "92b47f8e-8b4c-43f4-9b96-33f700e568f1", sessionId = "a5a5f862-0473-4bd2-9329-90fa057139f1";

describe("SkillsService authorization", () => {
  it("requires a supplied live session even for service-level reads", async () => {
    const transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
    const service = new SkillsService({ prisma: { $transaction: transaction } } as unknown as DatabaseService, {} as AuthorizationService, { registerHandler: jest.fn() } as unknown as ApprovalService);
    await expect(service.setup({ accountId, organizationId, kind: AccountKind.STAFF })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rechecks catalogue authority before returning an actor-scoped replay receipt", async () => {
    const skillReceiptFind = jest.fn();
    const tx = {
      $queryRaw: jest.fn(async () => []), $executeRaw: jest.fn(async () => 1),
      account: { findUnique: jest.fn(async () => ({ id: accountId, state: "ACTIVE", kind: "STAFF", employee: { id: "emp-1", state: "ACTIVE", organizationId } })) },
      session: { findUnique: jest.fn(async () => ({ id: sessionId, accountId, revokedAt: null, expiresAt: new Date(Date.now() + 60000), lastUsedAt: new Date() })) },
      organization: { findFirst: jest.fn(async () => ({ id: organizationId })) },
      skillReceipt: { findUnique: skillReceiptFind }
    };
    const database = { prisma: { $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)) } };
    const service = new SkillsService(database as unknown as DatabaseService, {} as AuthorizationService, { registerHandler: jest.fn() } as unknown as ApprovalService);
    await expect(service.createCatalogue({ accountId, organizationId, kind: AccountKind.STAFF, sessionId }, { commandId: "b5fa0138-d635-47aa-ae7e-8c7795c55fc8", name: "Lighting", reason: "Add a skill" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(skillReceiptFind).not.toHaveBeenCalled();
  });
});

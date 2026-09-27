import { ConflictException } from "@nestjs/common";
import { AccountKind } from "./generated/prisma/client.js";
import { jest } from "@jest/globals";
import { CrmService } from "./crm.service.js";
import type { DatabaseService } from "./database.service.js";
import type { AuthorizationService } from "./authorization.service.js";

describe("CrmService list boundaries", () => {
  const branchId = "11111111-1111-4111-8111-111111111111";
  const actor = { accountId: "22222222-2222-4222-8222-222222222222", kind: AccountKind.STAFF, organizationId: "33333333-3333-4333-8333-333333333333" };
  const row = { id: "44444444-4444-4444-8444-444444444444", branchId, priorLostLeadId: "55555555-5555-4555-8555-555555555555", source: { id: "66666666-6666-4666-8666-666666666666", name: "Referral" } };
  const setup = () => {
    const prisma = {
      account: { findUnique: jest.fn().mockResolvedValue({ id: actor.accountId, state: "ACTIVE", kind: "STAFF", employee: { organizationId: actor.organizationId, state: "ACTIVE" } }) },
      organization: { findFirst: jest.fn() },
      lead: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([row]) }
    };
    const authorization = { assertPermission: jest.fn().mockResolvedValue(undefined) };
    return { service: new CrmService({ prisma } as unknown as DatabaseService, authorization as unknown as AuthorizationService), prisma };
  };
  it("omits prior-record linkage from branch list projections", async () => {
    const { service } = setup();
    const result = await service.listLeads(actor, { branchId, offset: 0, limit: 50 });
    expect(result.total).toBe(1);
    expect(result.items[0]).not.toHaveProperty("priorLostLeadId");
    expect(result.items[0]).toHaveProperty("source.name", "Referral");
  });
  it("enforces pagination bounds at the service boundary", async () => {
    const { service, prisma } = setup();
    await expect(service.listLeads(actor, { branchId, offset: 0, limit: 101 })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.lead.findMany).not.toHaveBeenCalled();
  });
});

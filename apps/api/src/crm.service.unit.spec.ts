import { ConflictException, ForbiddenException } from "@nestjs/common";
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

describe("CrmService setup authorization batching", () => {
  it("evaluates the five branch capabilities in one ordered batch", async () => {
    const organizationId = "33333333-3333-4333-8333-333333333333";
    const actor = { accountId: "22222222-2222-4222-8222-222222222222", kind: AccountKind.STAFF, organizationId };
    const branches = Array.from({ length: 24 }, (_, index) => ({ id: `branch-${String(index + 1).padStart(2, "0")}`, name: `Branch ${String(index + 1).padStart(2, "0")}` }));
    const prisma = {
      account: { findUnique: jest.fn().mockResolvedValue({ id: actor.accountId, state: "ACTIVE", kind: "STAFF", employee: { organizationId, state: "ACTIVE" } }) },
      organization: { findFirst: jest.fn() },
      crmSource: { createMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
      branch: { findMany: jest.fn().mockResolvedValue(branches) },
    };
    const batch = Array.from({ length: branches.length * 5 }, (_, index) => index % 5 === 0 || index === 6 || index === 24 * 5 - 1);
    const sourceManageScope = { kind: "ORGANIZATION", organizationId };
    const authorization = {
      assertPermission: jest.fn().mockRejectedValue(new ForbiddenException("Permission denied")),
      evaluatePermissions: jest.fn().mockResolvedValue(batch),
    };
    const service = new CrmService({ prisma } as unknown as DatabaseService, authorization as unknown as AuthorizationService);

    const result = await service.setup(actor);

    expect(authorization.evaluatePermissions).toHaveBeenCalledTimes(1);
    expect(authorization.evaluatePermissions).toHaveBeenCalledWith(actor.accountId, [
      ...branches.flatMap((branch) => ["lead.view", "lead.create", "lead.edit", "lead.activity_create", "lead.stage_change"].map((permissionKey) => ({ permissionKey, scope: { kind: "BRANCH", organizationId, branchId: branch.id } }))),
    ]);
    expect(authorization.assertPermission).toHaveBeenCalledTimes(1);
    expect(authorization.assertPermission).toHaveBeenCalledWith(actor.accountId, "crm_source.manage", sourceManageScope, undefined);
    expect(result.branches).toHaveLength(24);
    expect(result.branches[0]).toEqual({ id: "branch-01", name: "Branch 01", capabilities: { view: true, create: false, edit: false, activityCreate: false, stageChange: false } });
    expect(result.branches[1]).toEqual({ id: "branch-02", name: "Branch 02", capabilities: { view: true, create: true, edit: false, activityCreate: false, stageChange: false } });
    expect(result.branches[23]).toEqual({ id: "branch-24", name: "Branch 24", capabilities: { view: true, create: false, edit: false, activityCreate: false, stageChange: true } });
    expect(result.sourceManage).toBe(false);
  });
});

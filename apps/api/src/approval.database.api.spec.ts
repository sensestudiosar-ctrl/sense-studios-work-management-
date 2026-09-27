import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { AccountKind, AccountState, ApprovalDecisionOutcome, ApprovalRequestState } from "./generated/prisma/client.js";
import type { RuntimeConfig } from "./config.js";
import { DatabaseService } from "./database.service.js";
import { ApprovalService, type ApprovalActor, type ApprovalHandler } from "./approval.service.js";

const databaseUrl = process.env.DATABASE_URL;
const postgresDescribe = databaseUrl ? describe : describe.skip;
const config: RuntimeConfig = {
  nodeEnv: "test", port: 4000, databaseUrl: databaseUrl ?? "postgresql://test:test@127.0.0.1:5432/sense_s05_test",
  webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined
};

postgresDescribe("S05 approvals with PostgreSQL", () => {
  let database: DatabaseService;
  let service: ApprovalService;
  let actorId: string;
  let organizationId: string;
  let actor: ApprovalActor;
  let handler: ApprovalHandler;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("DATABASE_URL must point to a dedicated test database");
    database = new DatabaseService(config);
    const rows = await database.prisma.$queryRaw<Array<{ databaseName: string }>>`SELECT current_database() AS "databaseName"`;
    if (!/_test(?:db)?$/i.test(rows[0]?.databaseName ?? "")) {
      await database.onModuleDestroy();
      throw new Error("S05 integration tests require a dedicated _test database");
    }
    const organization = await database.prisma.organization.findFirst() ?? await database.prisma.organization.create({ data: { name: `S05 fixture ${randomUUID()}` } });
    const branch = await database.prisma.branch.create({ data: { organizationId: organization.id, name: `S05 ${randomUUID()}` } });
    const team = await database.prisma.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `S05 ${randomUUID()}` } });
    const actorAccount = await database.prisma.account.create({ data: {
      normalizedEmail: `s05-staff-${randomUUID()}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE
    } });
    await database.prisma.employee.create({ data: {
      organizationId: organization.id, accountId: actorAccount.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date()
    } });
    organizationId = organization.id;
    actorId = actorAccount.id;
    actor = { accountId: actorId, organizationId };
    service = new ApprovalService(database);
    handler = {
      typeKey: `test.${randomUUID().replaceAll("-", "")}`,
      resolveApprover: async () => ({ accountId: actorId, level: "Team Lead" }),
      canView: async () => true,
      canDecide: async () => true,
      canDelegate: async () => true,
      canWithdraw: async () => true,
      canSelfApprove: true,
      projectCard: async () => ({ title: "Fixture", summary: "Integration", subjectLabel: "Subject", requesterLabel: "Owner", levelLabel: "Owner" }),
      onDecision: async () => undefined
    };
    service.registerHandler(handler);
  });

  afterAll(async () => database?.onModuleDestroy());

  it("persists deduplicated requests, binds decisions to organization, resolves once under concurrency, and rolls back callback failures", async () => {
    const first = await database.prisma.$transaction((tx) => service.createRequest(tx, actor, handler.typeKey, {
      sourceType: "test", sourceId: randomUUID(), reason: "Concurrent approval fixture", comment: "Request note",
      context: { label: "Concurrency" }, evidence: { metadata: "fixture" }
    }));
    expect(first).toMatchObject({ organizationId, requesterId: actorId, approverId: actorId, approvalLevel: "Team Lead", state: ApprovalRequestState.PENDING, comment: "Request note" });

    await expect(database.prisma.$transaction((tx) => service.createRequest(tx, actor, handler.typeKey, {
      sourceType: first.sourceType, sourceId: first.sourceId, sourceGeneration: first.sourceGeneration,
      reason: "Duplicate approval fixture", context: { label: "Duplicate" }
    }))).rejects.toMatchObject({ code: "P2002" });

    await expect(database.prisma.approvalDecision.create({ data: {
      requestId: first.id, organizationId: randomUUID(), outcome: ApprovalDecisionOutcome.APPROVED,
      deciderId: actorId, reason: "Cross organization decision"
    } })).rejects.toThrow();

    const outcomes = await Promise.allSettled([
      database.prisma.$transaction((tx) => service.decide(tx, actor, first.id, { outcome: "APPROVED", reason: "Accepted concurrent decision" })),
      database.prisma.$transaction((tx) => service.decide(tx, actor, first.id, { outcome: "REJECTED", reason: "Competing concurrent decision" }))
    ]);
    expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(await database.prisma.approvalDecision.count({ where: { requestId: first.id } })).toBe(1);
    const resolved = await database.prisma.approvalRequest.findUniqueOrThrow({ where: { id: first.id } });
    expect([ApprovalRequestState.APPROVED, ApprovalRequestState.REJECTED]).toContain(resolved.state);
    await expect(database.prisma.approvalDecision.update({ where: { requestId: first.id }, data: { reason: "Mutated" } })).rejects.toThrow();

    const rollback = await database.prisma.$transaction((tx) => service.createRequest(tx, actor, handler.typeKey, {
      sourceType: "test", sourceId: randomUUID(), reason: "Rollback callback fixture", context: { label: "Rollback" }
    }));
    handler.onDecision = async () => { throw new Error("simulated owning-domain failure"); };
    await expect(database.prisma.$transaction((tx) => service.decide(tx, actor, rollback.id, { outcome: "APPROVED", reason: "Must roll back" }))).rejects.toThrow("simulated owning-domain failure");
    expect((await database.prisma.approvalRequest.findUniqueOrThrow({ where: { id: rollback.id } })).state).toBe(ApprovalRequestState.PENDING);
    expect(await database.prisma.approvalDecision.count({ where: { requestId: rollback.id } })).toBe(0);
    expect(await database.prisma.auditEvent.count({ where: { subjectType: "approval_request", subjectId: rollback.id, eventKey: "approval.decided" } })).toBe(0);
    expect(await database.prisma.domainEvent.count({ where: { subjectType: "approval_request", subjectId: rollback.id, eventName: "approval.decided" } })).toBe(0);
  });
});

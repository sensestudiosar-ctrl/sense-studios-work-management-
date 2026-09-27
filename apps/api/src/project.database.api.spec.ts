import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "./database.service.js";
import { AccountKind, AccountState, Prisma } from "./generated/prisma/client.js";
import { ProjectService, type ProjectActor } from "./project.service.js";
import type { RuntimeConfig } from "./config.js";

const databaseUrl = process.env.DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
class FixtureRollback extends Error {}
const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: databaseUrl ?? "", webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined };

databaseDescribe("S07 project baseline database invariants", () => {
  let database: DatabaseService;
  beforeAll(async () => {
    database = new DatabaseService(config);
    const rows = await database.prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!/_test(?:db)?$/.test(rows[0]?.name ?? "")) throw new Error("Project checks require a dedicated test database");
  });
  afterAll(async () => database?.onModuleDestroy());

  async function fixture(run: (value: {
    tx: Prisma.TransactionClient; organizationId: string; branchId: string; otherBranchId: string;
    ownerId: string; clientId: string; sourceId: string; service: ProjectService; actor: ProjectActor; staffActor: ProjectActor;
  }) => Promise<void>) {
    try {
      await database.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.findFirst() ?? await tx.organization.create({ data: { name: "S07 fixture" } });
        const suffix = randomUUID();
        const branch = await tx.branch.create({ data: { organizationId: organization.id, name: `S07 ${suffix}` } });
        const otherBranch = await tx.branch.create({ data: { organizationId: organization.id, name: `S07 other ${suffix}` } });
        const owner = await tx.account.create({ data: { normalizedEmail: `s07-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
        const staff = await tx.account.create({ data: { normalizedEmail: `s07-staff-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
        const client = await tx.client.create({ data: { organizationId: organization.id, name: `S07 client ${suffix}` } });
        const source = await tx.crmSource.create({ data: { organizationId: organization.id, name: `S07 source ${suffix}` } });
        const prisma = new Proxy(tx, { get(target, key) {
          if (key === "$transaction") return async (callback: (inner: Prisma.TransactionClient) => Promise<unknown>) => {
            await tx.$executeRaw`SAVEPOINT project_command`;
            try { const result = await callback(tx); await tx.$executeRaw`RELEASE SAVEPOINT project_command`; return result; }
            catch (error) { await tx.$executeRaw`ROLLBACK TO SAVEPOINT project_command`; await tx.$executeRaw`RELEASE SAVEPOINT project_command`; throw error; }
          };
          return Reflect.get(target, key, target) as unknown;
        } });
        const service = new ProjectService({ prisma } as unknown as DatabaseService);
        await run({ tx, organizationId: organization.id, branchId: branch.id, otherBranchId: otherBranch.id, ownerId: owner.id, clientId: client.id, sourceId: source.id, service, actor: { accountId: owner.id, organizationId: organization.id, kind: AccountKind.OWNER }, staffActor: { accountId: staff.id, organizationId: organization.id, kind: AccountKind.STAFF } });
        throw new FixtureRollback();
      }, { timeout: 30_000 });
    } catch (error) { if (!(error instanceof FixtureRollback)) throw error; }
  }

  async function expectRejected(tx: Prisma.TransactionClient, action: () => Promise<unknown>) {
    await tx.$executeRaw`SAVEPOINT project_test`;
    await expect((async () => { await action(); await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`; })()).rejects.toThrow();
    await tx.$executeRaw`ROLLBACK TO SAVEPOINT project_test`;
    await tx.$executeRaw`RELEASE SAVEPOINT project_test`;
  }

  it("requires a baseline scope and initial status evidence, then protects ownership and history", async () => {
    await fixture(async ({ tx, organizationId, branchId, otherBranchId, ownerId }) => {
      const project = await tx.project.create({ data: { organizationId, branchId, title: "Direct design project", deliveryType: "DESIGN", createdById: ownerId } });
      const scope = await tx.projectScope.create({ data: { organizationId, projectId: project.id, name: "Architecture", normalizedName: "architecture" } });
      await tx.projectStatusChange.create({ data: { organizationId, projectId: project.id, toStatus: "DRAFT", projectVersion: 1, actorId: ownerId } });
      await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
      expect((await tx.project.findUniqueOrThrow({ where: { id: project.id }, include: { scopes: true, statusChanges: true } })).scopes).toHaveLength(1);
      await expectRejected(tx, () => tx.project.update({ where: { id: project.id }, data: { branchId: otherBranchId, version: { increment: 1 } } }));
      await expectRejected(tx, () => tx.project.update({ where: { id: project.id }, data: { status: "ACTIVE", version: { increment: 1 } } }));
      await expectRejected(tx, () => tx.project.update({ where: { id: project.id }, data: { status: "CANCELLED", version: { increment: 1 } } }));
      await expectRejected(tx, () => tx.projectScope.delete({ where: { id: scope.id } }));
      await expectRejected(tx, () => tx.projectStatusChange.delete({ where: { projectId_projectVersion: { projectId: project.id, projectVersion: 1 } } }));
      expect((await tx.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe("DRAFT");
    });
  });

  it("accepts one Won-lead conversion in its Branch and rejects duplicate or mismatched provenance", async () => {
    await fixture(async ({ tx, organizationId, branchId, otherBranchId, ownerId, clientId, sourceId }) => {
      const lead = await tx.lead.create({ data: { organizationId, branchId, sourceId, clientId, title: "Won design enquiry", contactName: "Client contact", createdById: ownerId } });
      await tx.leadStageChange.create({ data: { organizationId, leadId: lead.id, toStage: "NEW", direction: "CREATED", skippedStages: [], actorId: ownerId, leadVersion: 1 } });
      await tx.lead.update({ where: { id: lead.id }, data: { stage: "WON", outcomeAt: new Date(), version: { increment: 1 } } });
      await tx.leadStageChange.create({ data: { organizationId, leadId: lead.id, fromStage: "NEW", toStage: "WON", direction: "FORWARD", skippedStages: ["CONTACTED", "MEETING_DISCUSSION", "PROPOSAL", "NEGOTIATION"], reason: "Direct agreement", actorId: ownerId, leadVersion: 2 } });
      const project = await tx.project.create({ data: { organizationId, branchId, wonLeadId: lead.id, wonStageChangeId: (await tx.leadStageChange.findFirstOrThrow({ where: { leadId: lead.id, toStage: "WON" } })).id, clientId, title: "Converted design project", deliveryType: "DESIGN", createdById: ownerId } });
      await tx.projectScope.create({ data: { organizationId, projectId: project.id, name: "Interior Design", normalizedName: "interior design" } });
      await tx.projectStatusChange.create({ data: { organizationId, projectId: project.id, toStatus: "DRAFT", projectVersion: 1, actorId: ownerId } });
      await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
      expect((await tx.project.findUniqueOrThrow({ where: { id: project.id } })).wonStageChangeId).toBe((await tx.leadStageChange.findFirstOrThrow({ where: { leadId: lead.id, toStage: "WON" } })).id);
      await expectRejected(tx, () => tx.project.create({ data: { organizationId, branchId, wonLeadId: lead.id, clientId, title: "Duplicate conversion", deliveryType: "TURNKEY", createdById: ownerId } }));
      await expectRejected(tx, () => tx.project.create({ data: { organizationId, branchId: otherBranchId, wonLeadId: lead.id, clientId, title: "Wrong Branch conversion", deliveryType: "DESIGN", createdById: ownerId } }));
      await expectRejected(tx, () => tx.project.create({ data: { organizationId, branchId, wonLeadId: lead.id, title: "Client-mismatched conversion", deliveryType: "DESIGN", createdById: ownerId } }));
      expect((await tx.project.findUniqueOrThrow({ where: { id: project.id } })).wonLeadId).toBe(lead.id);
    });
  });

  it("creates audited Draft projects atomically and preserves exact Won provenance", async () => {
    await fixture(async ({ tx, organizationId, branchId, otherBranchId, ownerId, clientId, sourceId, service, actor, staffActor }) => {
      const direct = await service.create(actor, { branchId, title: "Direct design project", deliveryType: "DESIGN", scopes: ["Architecture", "Interior Design"], clientId, reason: "Signed direct commission" });
      expect(direct.project).toMatchObject({ branchId, deliveryType: "DESIGN", status: "DRAFT", version: 1, clientId, wonLeadId: null });
      expect(direct.project.scopes.map((scope) => scope.normalizedName)).toEqual(["architecture", "interior design"]);
      expect((await service.list(actor, branchId, 0, 10)).items.map((project) => project.id)).toContain(direct.project.id);
      expect((await service.list(actor, otherBranchId, 0, 10)).items).toHaveLength(0);
      await expect(service.list(staffActor, branchId, 0, 10)).rejects.toThrow("Owner access");
      await expect(service.detail(staffActor, direct.project.id)).rejects.toThrow("Owner access");
      await expect(service.create(staffActor, { branchId, title: "Forbidden project", deliveryType: "DESIGN", scopes: ["Architecture"], reason: "Staff create attempt" })).rejects.toThrow("Owner access");
      const created = await tx.auditEvent.findFirst({ where: { subjectType: "project", subjectId: direct.project.id, eventKey: "project.created" } });
      expect(created).toBeTruthy();
      expect(await tx.domainEvent.count({ where: { subjectType: "project", subjectId: direct.project.id, eventName: "project.created" } })).toBe(1);
      expect(await tx.outboxDelivery.count({ where: { event: { subjectType: "project", subjectId: direct.project.id } } })).toBe(1);
      await expect(service.create(actor, { branchId, title: "Duplicate scopes", deliveryType: "DESIGN", scopes: ["Architecture", "architecture"], reason: "Invalid scope baseline" })).rejects.toThrow();
      expect(await tx.project.count({ where: { title: "Duplicate scopes", organizationId } })).toBe(0);

      const lead = await tx.lead.create({ data: { organizationId, branchId, sourceId, clientId, title: "Won opportunity", contactName: "Client contact", createdById: ownerId } });
      await tx.leadStageChange.create({ data: { organizationId, leadId: lead.id, toStage: "NEW", direction: "CREATED", skippedStages: [], actorId: ownerId, leadVersion: 1 } });
      await tx.lead.update({ where: { id: lead.id }, data: { stage: "WON", outcomeAt: new Date(), version: { increment: 1 } } });
      const won = await tx.leadStageChange.create({ data: { organizationId, leadId: lead.id, fromStage: "NEW", toStage: "WON", direction: "FORWARD", skippedStages: ["CONTACTED", "MEETING_DISCUSSION", "PROPOSAL", "NEGOTIATION"], reason: "Client awarded work", actorId: ownerId, leadVersion: 2 } });
      const converted = await service.create(actor, { branchId, title: "Won design project", deliveryType: "DESIGN", scopes: ["Architecture"], wonLeadId: lead.id, reason: "Convert awarded opportunity" });
      expect(converted.project.clientId).toBe(clientId);
      expect(converted.wonLeadProvenance).toMatchObject({ stageChangeId: won.id, leadId: lead.id, leadVersion: 2 });
      expect((await service.detail(actor, converted.project.id)).wonLeadProvenance).toMatchObject({ stageChangeId: won.id });
      await expect(service.create(actor, { branchId, title: "Second conversion", deliveryType: "TURNKEY", scopes: ["Construction"], wonLeadId: lead.id, reason: "Duplicate conversion attempt" })).rejects.toThrow();
      expect(await tx.project.count({ where: { wonLeadId: lead.id } })).toBe(1);
    });
  });

  it("enforces assignment, lifecycle, transfer, scope approval, and cancellation guards in PostgreSQL", async () => {
    await fixture(async ({ tx, organizationId, branchId, otherBranchId, ownerId, service, actor }) => {
      const project = (await service.create(actor, { branchId, title: "Guarded workflow", deliveryType: "DESIGN", scopes: ["Architecture"], reason: "Create baseline" })).project;
      const suffix = randomUUID();
      const team = await tx.team.create({ data: { organizationId, branchId, name: `S07 team ${suffix}` } });
      const account = await tx.account.create({ data: { normalizedEmail: `s07-employee-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
      const employee = await tx.employee.create({ data: { organizationId, accountId: account.id, homeBranchId: branchId, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
      const foreignTeam = await tx.team.create({ data: { organizationId, branchId: otherBranchId, name: `S07 other team ${suffix}` } });
      const foreignAccount = await tx.account.create({ data: { normalizedEmail: `s07-foreign-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
      const foreignEmployee = await tx.employee.create({ data: { organizationId, accountId: foreignAccount.id, homeBranchId: otherBranchId, homeTeamId: foreignTeam.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });

      const assignment = await tx.projectAssignment.create({ data: { projectId: project.id, organizationId, employeeId: employee.id, grantedById: ownerId, grantReason: "Same Branch work" } });
      await expectRejected(tx, () => tx.projectAssignment.create({ data: { projectId: project.id, organizationId, employeeId: foreignEmployee.id, grantedById: ownerId, grantReason: "Missing cross-Branch authorization" } }));
      const crossBranchAssignment = await tx.projectAssignment.create({ data: { projectId: project.id, organizationId, employeeId: foreignEmployee.id, crossBranchAuthorized: true, grantedById: ownerId, grantReason: "Owner approved cross-Branch work" } });
      await expectRejected(tx, () => tx.projectAssignment.delete({ where: { id: assignment.id } }));

      await expectRejected(tx, () => tx.project.update({ where: { id: project.id }, data: { status: "ACTIVE", version: { increment: 1 }, currentLeadEmployeeId: employee.id } }));
      await expectRejected(tx, () => tx.project.update({ where: { id: project.id }, data: { branchId: otherBranchId, version: { increment: 1 } } }));
      await expectRejected(tx, () => tx.project.update({ where: { id: project.id }, data: { status: "CANCELLED", version: { increment: 1 } } }));

      const scopeChange = await tx.projectScopeChange.create({ data: { projectId: project.id, organizationId, name: "Lighting", normalizedName: "lighting", requesterId: ownerId, requestReason: "Client requested lighting scope" } });
      await expectRejected(tx, () => tx.projectScope.create({ data: { projectId: project.id, organizationId, name: "Lighting", normalizedName: "lighting", baseline: false, scopeChangeId: scopeChange.id } }));
      await expectRejected(tx, () => tx.projectScopeChange.delete({ where: { id: scopeChange.id } }));

      await expectRejected(tx, () => tx.project.update({ where: { id: project.id }, data: { scopeApproverAccountId: ownerId, version: { increment: 1 } } }));
      expect((await tx.projectAssignment.findUniqueOrThrow({ where: { id: crossBranchAssignment.id } })).revokedAt).toBeNull();
    });
  });
});

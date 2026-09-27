import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { CrmService, type CrmActor } from "./crm.service.js";
import { AccountKind, AccountState, PermissionScopeKind, Prisma } from "./generated/prisma/client.js";
import type { RuntimeConfig } from "./config.js";

const databaseUrl = process.env.DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
class FixtureRollback extends Error {}
const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: databaseUrl ?? "", webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined };

databaseDescribe("S06 CRM persistence and scope", () => {
  let database: DatabaseService;
  beforeAll(async () => {
    database = new DatabaseService(config);
    const rows = await database.prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!/_test(?:db)?$/.test(rows[0]?.name ?? "")) throw new Error("CRM tests require a dedicated test database");
  });
  afterAll(async () => database?.onModuleDestroy());

  async function fixture(run: (value: { service: CrmService; owner: CrmActor; staff: CrmActor; branchId: string; otherBranchId: string; sourceId: string; tx: Prisma.TransactionClient }) => Promise<void>) {
    try {
      await database.prisma.$transaction(async (tx) => {
        // Savepoints give service transactions real rollback behavior inside a disposable fixture.
        const prisma = new Proxy(tx, { get(target, key) {
          if (key === "$transaction") return async (callback: (inner: Prisma.TransactionClient) => Promise<unknown>) => {
            await tx.$executeRaw`SAVEPOINT crm_command`;
            try { const result = await callback(tx); await tx.$executeRaw`RELEASE SAVEPOINT crm_command`; return result; }
            catch (error) { await tx.$executeRaw`ROLLBACK TO SAVEPOINT crm_command`; await tx.$executeRaw`RELEASE SAVEPOINT crm_command`; throw error; }
          };
          return Reflect.get(target, key, target) as unknown;
        } });
        const db = { prisma } as unknown as DatabaseService;
        const service = new CrmService(db, new AuthorizationService(db));
        const org = await tx.organization.findFirst() ?? await tx.organization.create({ data: { name: "CRM isolated fixture" } });
        const suffix = randomUUID();
        const branch = await tx.branch.create({ data: { organizationId: org.id, name: `CRM ${suffix}` } });
        const other = await tx.branch.create({ data: { organizationId: org.id, name: `Other ${suffix}` } });
        const team = await tx.team.create({ data: { organizationId: org.id, branchId: branch.id, name: `CRM ${suffix}` } });
        const ownerAccount = await tx.account.create({ data: { normalizedEmail: `crm-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
        const staffAccount = await tx.account.create({ data: { normalizedEmail: `crm-staff-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
        const employee = await tx.employee.create({ data: { organizationId: org.id, accountId: staffAccount.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date() } });
        for (const permissionKey of ["lead.view", "lead.create", "lead.edit", "lead.stage_change", "lead.activity_create"]) {
          await tx.employeePermissionOverride.create({ data: { employeeId: employee.id, organizationId: org.id, permissionKey, effect: "ALLOW", scopeKind: PermissionScopeKind.BRANCH, branchId: branch.id, reason: "CRM scoped fixture" } });
        }
        const source = await tx.crmSource.create({ data: { organizationId: org.id, name: `CRM source ${suffix}` } });
        await run({ service, owner: { accountId: ownerAccount.id, kind: AccountKind.OWNER, organizationId: org.id }, staff: { accountId: staffAccount.id, kind: AccountKind.STAFF, organizationId: org.id }, branchId: branch.id, otherBranchId: other.id, sourceId: source.id, tx });
        throw new FixtureRollback();
      }, { timeout: 30_000 });
    } catch (error) { if (!(error instanceof FixtureRollback)) throw error; }
  }

  it("initializes built-in sources idempotently across repeated setup calls", async () => {
    await fixture(async ({ service, staff, tx }) => {
      await Promise.all([service.setup(staff), service.setup(staff)]);
      const sources = await tx.crmSource.findMany({ where: { organizationId: staff.organizationId, name: { in: ["Referral", "Website", "Manual"] } } });
      expect(sources).toHaveLength(3);
      expect(sources.every((source) => source.builtIn && source.active)).toBe(true);
    });
  });

  it("persists distinct stage and activity evidence, Lost renewal, Won provenance and scoped client access", async () => {
    await fixture(async ({ service, owner, staff, branchId, otherBranchId, sourceId, tx }) => {
      const client = await service.createClient(owner, { name: "CRM customer", reason: "Create CRM fixture customer", contacts: [{ name: "Contact", email: "client@example.test" }] });
      await expect(service.createClient(staff, { name: "Forbidden", reason: "Denied shared edits", contacts: [] })).rejects.toBeInstanceOf(ForbiddenException);
      const lead = await service.createLead(owner, { branchId, sourceId, clientId: client.id, title: "Design enquiry", contactName: "Contact", reason: "New enquiry" });
      const forward = await service.changeStage(staff, lead.id, { expectedVersion: 1, toStage: "PROPOSAL", reason: "Existing discussion completed elsewhere" });
      expect(forward.stageChange.skippedStages).toEqual(["CONTACTED", "MEETING_DISCUSSION"]);
      await service.addActivity(staff, lead.id, { kind: "PROPOSAL", note: "Recorded separate proposal interaction" });
      await service.changeStage(staff, lead.id, { expectedVersion: 2, toStage: "CONTACTED", reason: "Revisit requirements" });
      const lost = await service.changeStage(staff, lead.id, { expectedVersion: 3, toStage: "LOST", reason: "Client postponed" });
      expect(lost.lead.outcomeAt).not.toBeNull();
      await expect(service.changeStage(staff, lead.id, { expectedVersion: 4, toStage: "NEW", reason: "Attempt reopen" })).rejects.toBeInstanceOf(ConflictException);
      const renewal = await service.createLead(staff, { branchId, sourceId, clientId: client.id, priorLostLeadId: lead.id, title: "Renewed enquiry", contactName: "Contact", reason: "Client returned" });
      expect(renewal.id).not.toBe(lead.id);
      await service.changeStage(staff, renewal.id, { expectedVersion: 1, toStage: "WON", reason: "Renewal agreed directly" });
      const detail = await service.detail(staff, renewal.id);
      expect(detail.candidate).toMatchObject({ leadId: renewal.id, branchId, clientId: client.id });
      expect(detail.candidate?.stageChangeId).toBeTruthy();
      expect(detail.priorLostLead).toMatchObject({ id: lead.id });
      const original = await service.detail(staff, lead.id);
      expect(original.lead).toMatchObject({ stage: "LOST", lostReason: "Client postponed", version: 4 });
      expect(original.stageChanges).toHaveLength(4);
      expect(original.activities).toHaveLength(1);
      expect((await service.listClients(staff, branchId)).items.map((item) => item.id)).toContain(client.id);
      const foreign = await service.createLead(owner, { branchId: otherBranchId, sourceId, title: "Other branch", contactName: "Other contact", reason: "Other branch fixture" });
      await expect(service.detail(staff, foreign.id)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.listLeads(staff, { branchId: otherBranchId, offset: 0, limit: 25 })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.changeStage(staff, foreign.id, { expectedVersion: 1, toStage: "CONTACTED" })).rejects.toBeInstanceOf(ForbiddenException);
      await service.changeStage(owner, foreign.id, { expectedVersion: 1, toStage: "LOST", reason: "Other opportunity lost" });
      await expect(service.createLead(staff, { branchId, sourceId, priorLostLeadId: foreign.id, title: "Denied link", contactName: "Contact", reason: "No prior visibility" })).rejects.toBeInstanceOf(ForbiddenException);
      const hiddenLink = await service.createLead(owner, { branchId, sourceId, priorLostLeadId: foreign.id, title: "Scoped renewal", contactName: "Contact", reason: "Owner linked enquiry" });
      expect((await service.detail(staff, hiddenLink.id)).priorLostLead).toBeUndefined();
      expect((await service.detail(staff, hiddenLink.id)).lead.priorLostLeadId).toBeUndefined();
      expect((await service.listLeads(staff, { branchId, offset: 0, limit: 25 })).items.every((item) => !("priorLostLeadId" in item))).toBe(true);
      await expect(service.updateClient(staff, client.id, { name: "Denied", expectedVersion: 1, reason: "Denied customer edit", contacts: [] })).rejects.toBeInstanceOf(ForbiddenException);
      await tx.employeePermissionOverride.deleteMany({ where: { organizationId: staff.organizationId, permissionKey: "lead.view", branchId } });
      await expect(service.createLead(staff, { branchId, sourceId, clientId: client.id, title: "Hidden client", contactName: "Contact", reason: "Create alone cannot select hidden client" })).rejects.toBeInstanceOf(ForbiddenException);
      const audit = await tx.auditEvent.count({ where: { organizationId: owner.organizationId, eventKey: { startsWith: "crm." } } });
      const events = await tx.domainEvent.count({ where: { organizationId: owner.organizationId, eventName: { startsWith: "crm." } } });
      expect(audit).toBeGreaterThan(10); expect(events).toBe(audit);
    });
  }, 30_000);

  it("rejects stale updates and rolls back a command when audit/event emission fails", async () => {
    await fixture(async ({ service, owner, branchId, sourceId, tx }) => {
      const lead = await service.createLead(owner, { branchId, sourceId, title: "Version fixture", contactName: "Contact", reason: "Create version fixture" });
      await expect(service.changeStage(owner, lead.id, { expectedVersion: 9, toStage: "CONTACTED" })).rejects.toBeInstanceOf(ConflictException);
      await expect(service.detail(owner, randomUUID())).rejects.toBeInstanceOf(NotFoundException);
      const before = await tx.leadStageChange.count({ where: { leadId: lead.id } });
      const brokenTx = new Proxy(tx, { get(target, key) { if (key === "auditEvent") return { create: async () => { throw new Error("forced CRM audit failure"); } }; return Reflect.get(target, key, target) as unknown; } });
      const db = { prisma: new Proxy(tx, { get(target, key) {
        if (key === "$transaction") return async (callback: (inner: Prisma.TransactionClient) => Promise<unknown>) => {
          await tx.$executeRaw`SAVEPOINT crm_rollback`;
          try { return await callback(brokenTx); } catch (error) { await tx.$executeRaw`ROLLBACK TO SAVEPOINT crm_rollback`; throw error; }
        }; return Reflect.get(target, key, target) as unknown;
      } }) } as unknown as DatabaseService;
      const broken = new CrmService(db, new AuthorizationService(db));
      await expect(broken.changeStage(owner, lead.id, { expectedVersion: 1, toStage: "CONTACTED" })).rejects.toThrow("forced CRM audit failure");
      expect((await tx.lead.findUniqueOrThrow({ where: { id: lead.id } })).stage).toBe("NEW");
      expect(await tx.leadStageChange.count({ where: { leadId: lead.id } })).toBe(before);
    });
  }, 30_000);

  it("enforces immutable history and ownership in PostgreSQL", async () => {
    await fixture(async ({ service, owner, branchId, otherBranchId, sourceId, tx }) => {
      const lead = await service.createLead(owner, { branchId, sourceId, title: "Database guards", contactName: "Contact", reason: "Constraint fixture" });
      const activity = await service.addActivity(owner, lead.id, { kind: "NOTE", note: "Immutable activity evidence" });
      const history = await tx.leadStageChange.findFirstOrThrow({ where: { leadId: lead.id } });
      async function denied(write: () => Promise<unknown>) {
        await tx.$executeRaw`SAVEPOINT crm_guard`;
        await expect(write()).rejects.toThrow();
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT crm_guard`;
        await tx.$executeRaw`RELEASE SAVEPOINT crm_guard`;
      }
      await denied(() => tx.leadActivity.update({ where: { id: activity.id }, data: { note: "Overwrite" } }));
      await denied(() => tx.leadStageChange.delete({ where: { id: history.id } }));
      await denied(() => tx.lead.update({ where: { id: lead.id }, data: { branchId: otherBranchId, version: 2 } }));
      await denied(() => tx.lead.delete({ where: { id: lead.id } }));
      await denied(() => tx.crmSource.delete({ where: { id: sourceId } }));
      await denied(() => tx.crmSource.update({ where: { id: sourceId }, data: { name: "Rewrite historical source" } }));
      await service.changeStage(owner, lead.id, { expectedVersion: 1, toStage: "LOST", reason: "Constraint outcome" });
      await denied(() => tx.lead.update({ where: { id: lead.id }, data: { stage: "NEW", version: 3, outcomeAt: null, lostReason: null } }));
      expect((await tx.leadActivity.findUniqueOrThrow({ where: { id: activity.id } })).note).toBe("Immutable activity evidence");
    });
  }, 30_000);

  it("supports persisted CRM commands under the restricted runtime database role", async () => {
    await fixture(async ({ service, owner, branchId, sourceId, tx }) => {
      await tx.$executeRaw`SET LOCAL ROLE sense_app_runtime`;
      const lead = await service.createLead(owner, { branchId, sourceId, title: "Runtime role fixture", contactName: "Contact", reason: "Restricted runtime verification" });
      const changed = await service.changeStage(owner, lead.id, { expectedVersion: 1, toStage: "CONTACTED" });
      expect(changed.lead.stage).toBe("CONTACTED");
      expect((await service.detail(owner, lead.id)).stageChanges).toHaveLength(2);
      const source = await service.createSource(owner, { name: `Runtime ${randomUUID()}`, reason: "Restricted source management" });
      const disabled = await service.updateSource(owner, source.id, { active: false, expectedUpdatedAt: source.updatedAt, reason: "Restricted source deactivation" });
      expect(disabled.active).toBe(false);
    });
  }, 30_000);

  it("preserves client contact identity, records changed values, clears optional fields and denies stale edits", async () => {
    await fixture(async ({ service, owner, branchId, sourceId, tx }) => {
      const client = await service.createClient(owner, { name: "Original client", reason: "Customer fixture", contacts: [{ name: "Primary contact", email: "old@example.test", phone: "12345" }] });
      const contact = client.contacts[0]!;
      const updated = await service.updateClient(owner, client.id, { name: "Updated client", expectedVersion: 1, reason: "Correct shared contact", contacts: [{ id: contact.id, name: "Updated contact", email: null, phone: null }] });
      expect(updated.contacts[0]).toMatchObject({ id: contact.id, email: null, phone: null });
      expect(updated.version).toBe(2);
      await expect(service.updateClient(owner, client.id, { name: "Stale client", expectedVersion: 1, reason: "Stale update denied", contacts: [] })).rejects.toBeInstanceOf(ConflictException);
      await expect(service.updateClient(owner, client.id, { name: "Wrong contact", expectedVersion: 2, reason: "ID tampering denied", contacts: [{ id: randomUUID(), name: "Tampered contact" }] })).rejects.toBeInstanceOf(ConflictException);
      const event = await tx.auditEvent.findFirstOrThrow({ where: { subjectId: client.id, eventKey: "crm.client.updated" } });
      expect(event.before).toMatchObject({ name: "Original client" });
      expect(event.after).toMatchObject({ name: "Updated client" });
      const lead = await service.createLead(owner, { branchId, sourceId, title: "Optional fields", contactName: "Contact", email: "old@example.test", phone: "12345", reason: "Create optional field fixture" });
      const edited = await service.updateLead(owner, lead.id, { expectedVersion: 1, title: "Updated optional fields", contactName: "Contact", email: null, phone: null, reason: "Clear stale contact details" });
      expect(edited).toMatchObject({ email: null, phone: null, version: 2 });
    });
  }, 30_000);

  it("limits source visibility and management to the organization permission", async () => {
    await fixture(async ({ service, owner, staff, branchId, sourceId, tx }) => {
      const source = await tx.crmSource.findUniqueOrThrow({ where: { id: sourceId } });
      const disabled = await service.updateSource(owner, sourceId, { active: false, expectedUpdatedAt: source.updatedAt, reason: "Retire old source" });
      const staffSetup = await service.setup(staff);
      expect(staffSetup.sourceManage).toBe(false);
      expect(staffSetup.sources.some((item) => item.id === sourceId)).toBe(false);
      await expect(service.createSource(staff, { name: "Staff source", reason: "Attempt unauthorized source" })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.createLead(staff, { branchId, sourceId, title: "Inactive source", contactName: "Contact", reason: "Inactive cannot create" })).rejects.toBeInstanceOf(NotFoundException);
      const employee = await tx.employee.findUniqueOrThrow({ where: { accountId: staff.accountId } });
      await tx.employeePermissionOverride.create({ data: { employeeId: employee.id, organizationId: staff.organizationId, permissionKey: "crm_source.manage", effect: "ALLOW", scopeKind: PermissionScopeKind.ORGANIZATION, reason: "Owner granted source management" } });
      const managerSetup = await service.setup(staff);
      expect(managerSetup.sourceManage).toBe(true);
      expect(managerSetup.sources.some((item) => item.id === sourceId && !item.active)).toBe(true);
      const created = await service.createSource(staff, { name: "Partner referral", reason: "Add a configurable source" });
      expect(created.builtIn).toBe(false);
      await expect(service.createSource(staff, { name: "Partner referral", reason: "Duplicate source rejected" })).rejects.toBeInstanceOf(ConflictException);
      const updated = await service.updateSource(staff, created.id, { active: false, expectedUpdatedAt: created.updatedAt, reason: "Disable unused source" });
      expect(updated.active).toBe(false);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
      await expect(service.updateSource(staff, created.id, { active: true, expectedUpdatedAt: created.updatedAt, reason: "Stale source edit" })).rejects.toBeInstanceOf(ConflictException);
      const audits = await tx.auditEvent.findMany({ where: { subjectId: created.id, eventKey: { in: ["crm.source.created", "crm.source.updated"] } }, orderBy: { occurredAt: "asc" } });
      expect(audits).toHaveLength(2);
      expect(audits[1]?.before).toMatchObject({ active: true });
      expect(audits[1]?.after).toMatchObject({ active: false });
      const events = await tx.domainEvent.count({ where: { subjectId: created.id, eventName: { in: ["crm.source.created", "crm.source.updated"] } } });
      expect(events).toBe(2);
      const deliveries = await tx.outboxDelivery.count({ where: { event: { subjectId: created.id } } });
      expect(deliveries).toBe(2);
      expect(disabled.updatedAt.getTime()).toBeGreaterThan(source.updatedAt.getTime());
    });
  }, 30_000);
});

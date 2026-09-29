import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "./database.service.js";
import { OrganizationService } from "./organization.service.js";
import { IdentityService } from "./identity.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { TaskService } from "./task.service.js";
import { NotificationsService } from "./notifications.service.js";
import type { RuntimeConfig } from "./config.js";
const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: process.env.DATABASE_URL ?? "", webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined };
class Rollback extends Error {}
(process.env.DATABASE_URL ? describe : describe.skip)("S10 Owner scheduling and Team alert settings", () => {
  let database: DatabaseService;
  beforeAll(async () => {
    database = new DatabaseService(config);
    const rows = await database.prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!rows[0]?.name.endsWith("_test")) throw new Error("Dedicated test database required");
  });
  afterAll(async () => database?.onModuleDestroy());
  it("persists versioned Owner settings, denies staff/stale/invalid requests and missing SQL evidence", async () => {
    try {
      await database.prisma.$transaction(async (tx) => {
        const prisma = new Proxy(tx, { get(target, key) {
          if (key === "$transaction") return async (callback: (inner: typeof tx) => Promise<unknown>) => {
            await tx.$executeRaw`SAVEPOINT settings_command`;
            try { const result = await callback(tx); await tx.$executeRaw`RELEASE SAVEPOINT settings_command`; return result; }
            catch (error) { await tx.$executeRaw`ROLLBACK TO SAVEPOINT settings_command`; throw error; }
          };
          return Reflect.get(target, key, target);
        } });
        const db = { prisma } as unknown as DatabaseService;
        const authorization = new AuthorizationService(db);
        const service = new OrganizationService(db, new IdentityService(db, config), authorization, new ProjectWorkflowService(db, authorization, new ApprovalService(db)), new TaskService(db, authorization), new NotificationsService(db));
        const suffix = randomUUID();
        const org = await tx.organization.findFirst() ?? await tx.organization.create({ data: { name: "S10 settings" } });
        const owner = await tx.account.findFirst({ where: { kind: "OWNER", state: "ACTIVE" } }) ?? await tx.account.create({ data: { normalizedEmail: `settings-owner-${suffix}@example.test`, kind: "OWNER", state: "ACTIVE" } });
        const staff = await tx.account.create({ data: { normalizedEmail: `settings-staff-${suffix}@example.test`, kind: "STAFF", state: "ACTIVE" } });
        const branch = await tx.branch.create({ data: { organizationId: org.id, name: `Settings ${suffix}` } });
        const team = await tx.team.create({ data: { organizationId: org.id, branchId: branch.id, name: `Settings ${suffix}` } });
        expect(team.waitingAlertsEnabled).toBe(false);
        await expect(service.changeWaitingAlerts(staff.id, team.id, { enabled: true, expectedVersion: 1, reason: "Staff cannot configure" })).rejects.toMatchObject({ status: 403 });
        await service.changeWaitingAlerts(owner.id, team.id, { enabled: true, expectedVersion: 1, reason: "Enable manager waiting visibility" });
        expect(await tx.team.findUniqueOrThrow({ where: { id: team.id } })).toMatchObject({ waitingAlertsEnabled: true, settingsVersion: 2 });
        await expect(service.changeWaitingAlerts(owner.id, team.id, { enabled: false, expectedVersion: 1, reason: "Stale version rejected" })).rejects.toMatchObject({ status: 409 });
        await expect(service.changeTimezone(owner.id, org.id, { timezone: "Mars/Invalid", expectedVersion: org.settingsVersion, reason: "Invalid zone" })).rejects.toMatchObject({ status: 400 });
        const changed = await service.changeTimezone(owner.id, org.id, { timezone: org.timezone === "UTC" ? "Asia/Kolkata" : "UTC", expectedVersion: org.settingsVersion, reason: "Use approved organization schedule zone" });
        expect(changed.settingsVersion).toBe(org.settingsVersion + 1);
        await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
        await tx.$executeRaw`SAVEPOINT missing_settings_evidence`;
        await expect(tx.team.update({ where: { id: team.id }, data: { waitingAlertsEnabled: false, settingsVersion: 3 } })).rejects.toThrow("Owner audit");
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT missing_settings_evidence`;
        expect(await tx.auditEvent.count({ where: { subjectId: team.id, eventKey: "organization.team.updated" } })).toBe(1);
        throw new Rollback();
      }, { timeout: 30_000 });
    } catch (error) { if (!(error instanceof Rollback)) throw error; }
  });
});

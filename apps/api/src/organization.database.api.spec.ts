import "reflect-metadata";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AccountKind, AccountState, EmployeeState, OrganizationEventType, OutboxConsumer, PermissionEffect, PermissionScopeKind } from "./generated/prisma/client.js";
import { AuthorizationService } from "./authorization.service.js";
import { DatabaseService } from "./database.service.js";
import { IdentityService } from "./identity.service.js";
import { OrganizationService } from "./organization.service.js";
import type { RuntimeConfig } from "./config.js";

const databaseUrl = process.env.DATABASE_URL;
const databaseApiDescribe = databaseUrl ? describe : describe.skip;
const config: RuntimeConfig = {
  nodeEnv: "test", port: 4000,
  databaseUrl: databaseUrl ?? "postgresql://test:test@127.0.0.1:5432/sense_s03_test",
  webOrigin: "http://localhost:5173",
  ownerBootstrapEmail: "s03-bootstrap@example.test",
  ownerBootstrapSecret: randomBytes(32).toString("base64url")
};

class RollbackFixture extends Error {}

databaseApiDescribe("organization and authorization with PostgreSQL", () => {
  let database: DatabaseService;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("DATABASE_URL must point to a dedicated test database");
    database = new DatabaseService(config);
    const rows = await database.prisma.$queryRaw<Array<{ databaseName: string }>>`SELECT current_database() AS "databaseName"`;
    if (!/_test(?:db)?$/i.test(rows[0]?.databaseName ?? "")) {
      await database.onModuleDestroy();
      throw new Error("S03 integration tests refuse to run unless the database name ends in _test or _testdb");
    }
  });

  afterAll(async () => database?.onModuleDestroy());

  it("persists hierarchy and grants, scopes Team Leader reads/writes, blocks tampering, and suspends atomically", async () => {
    try {
      await database.prisma.$transaction(async (tx) => {
        const prisma = new Proxy(tx, {
          get(target, property) {
            if (property === "$transaction") return (callback: (client: typeof tx) => unknown) => callback(tx);
            return Reflect.get(target, property, target) as unknown;
          }
        });
        const transactionalDatabase = { prisma } as never;
        const identity = new IdentityService(transactionalDatabase, config);
        const authorization = new AuthorizationService(transactionalDatabase);
        const organization = new OrganizationService(transactionalDatabase, identity, authorization);
        const suffix = randomUUID();
        const owner = await tx.account.create({ data: {
          normalizedEmail: `s03-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE
        } });
        const org = await organization.createOrganization(owner.id, "S03 integration fixture", "Temporary PostgreSQL integration fixture");
        const branch = await organization.createBranch(owner.id, org.id, "S03 branch", "Temporary branch integration fixture");
        const otherBranch = await organization.createBranch(owner.id, org.id, "S03 other branch", "Second branch integration fixture");
        const team = await organization.createTeam(owner.id, org.id, branch.id, "S03 team", "Temporary team integration fixture");
        const otherTeam = await organization.createTeam(owner.id, org.id, otherBranch.id, "S03 other team", "Second team integration fixture");
        const leaderRole = await organization.createJobRole(owner.id, org.id, "S03 leader", "Team-scoped integration role");
        await organization.grantRolePermission(owner.id, leaderRole.id, {
          organizationId: org.id, permissionKey: "org.employee.read", scope: { scopeKind: PermissionScopeKind.TEAM, branchId: branch.id, teamId: team.id }, reason: "Grant scoped team read"
        });
        await organization.grantRolePermission(owner.id, leaderRole.id, {
          organizationId: org.id, permissionKey: "org.employee.manage", scope: { scopeKind: PermissionScopeKind.TEAM, branchId: branch.id, teamId: team.id }, reason: "Grant scoped team management"
        });
        const hiredAt = new Date(Date.now() - 86_400_000);
        const account = async (kind = AccountKind.STAFF) => tx.account.create({ data: {
          normalizedEmail: `s03-${randomUUID()}@example.test`, kind, state: AccountState.ACTIVE
        } });
        const leaderAccount = await account();
        const lead = await organization.createEmployee(owner.id, {
          organizationId: org.id, accountId: leaderAccount.id, branchId: branch.id, teamId: team.id,
          jobRoleIds: [leaderRole.id], hiredAt, reason: "Create scoped Team Leader"
        });
        const firstAccount = await account();
        const first = await organization.createEmployee(owner.id, {
          organizationId: org.id, accountId: firstAccount.id, branchId: branch.id, teamId: team.id,
          reportsToId: lead.id, hiredAt, reason: "Create direct report one"
        });
        const secondAccount = await account();
        const second = await organization.createEmployee(owner.id, {
          organizationId: org.id, accountId: secondAccount.id, branchId: branch.id, teamId: team.id,
          reportsToId: lead.id, hiredAt, reason: "Create direct report two"
        });
        const outsideAccount = await account();
        const outside = await organization.createEmployee(owner.id, {
          organizationId: org.id, accountId: outsideAccount.id, branchId: otherBranch.id, teamId: otherTeam.id,
          hiredAt, reason: "Create separate branch employee"
        });

        const suspendedIdentity = await account();
        await tx.account.update({ where: { id: suspendedIdentity.id }, data: { state: AccountState.SUSPENDED } });
        await tx.$executeRaw`SAVEPOINT s03_identity_guard`;
        await expect(tx.employee.create({ data: {
          organizationId: org.id, accountId: suspendedIdentity.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt
        } })).rejects.toThrow();
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT s03_identity_guard`;

        await tx.$executeRaw`SAVEPOINT s03_reporting_team`;
        await expect(tx.employee.update({ where: { id: first.id }, data: { reportsToId: outside.id } })).rejects.toThrow();
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT s03_reporting_team`;

        const managed = await organization.listManagedEmployees(leaderAccount.id);
        expect(managed.employees.map((employee) => employee.id).sort()).toEqual([first.id, second.id].sort());
        expect(managed.managerOptions.map((option) => option.id)).toContain(lead.id);
        await expect(authorization.assertPermission(leaderAccount.id, "org.employee.read", {
          kind: "TEAM", organizationId: org.id, branchId: otherBranch.id, teamId: otherTeam.id
        })).rejects.toBeInstanceOf(ForbiddenException);
        await expect(organization.changeManagedEmployeeReporting(leaderAccount.id, outside.id, first.id, "Tamper another branch"))
          .rejects.toBeInstanceOf(NotFoundException);

        await organization.changeManagedEmployeeReporting(leaderAccount.id, first.id, second.id, "Reassign within reporting team");
        await expect(organization.changeManagedEmployeeReporting(leaderAccount.id, second.id, first.id, "Create a cycle"))
          .rejects.toBeInstanceOf(ConflictException);
        const currentHistory = await tx.employeeMembershipHistory.count({ where: { employeeId: first.id, effectiveTo: null } });
        expect(currentHistory).toBe(1);
        const history = await tx.employeeMembershipHistory.findMany({ where: { employeeId: first.id }, orderBy: { effectiveFrom: "asc" } });
        expect(history).toHaveLength(2);
        expect(history[0]?.effectiveTo).not.toBeNull();
        expect(history[0]?.reason).toBe("Create direct report one");
        expect(history[1]?.reportsToId).toBe(second.id);

        const override = await organization.grantEmployeeOverride(owner.id, second.id, {
          organizationId: org.id, permissionKey: "task.review", effect: PermissionEffect.DENY,
          scope: { scopeKind: PermissionScopeKind.SELF }, reason: "Temporary review restriction"
        });
        const rawSessionSecret = randomBytes(32).toString("base64url");
        const tokenHash = createHash("sha256").update(rawSessionSecret).digest("hex");
        const session = await tx.session.create({ data: {
          accountId: secondAccount.id, tokenHash, csrfTokenHash: createHash("sha256").update("csrf").digest("hex"),
          expiresAt: new Date(Date.now() + 60 * 60_000), userAgent: "S03 integration fixture", ipAddress: "127.0.0.1"
        } });
        await expect(authorization.assertPermission(secondAccount.id, "task.review", {
          kind: "SELF", organizationId: org.id, branchId: branch.id, teamId: team.id, employeeId: second.id
        })).rejects.toBeInstanceOf(ForbiddenException);
        await organization.suspendEmployee(owner.id, second.id, "Suspend integration fixture employee");
        expect((await tx.account.findUniqueOrThrow({ where: { id: secondAccount.id } })).state).toBe(AccountState.SUSPENDED);
        expect((await tx.employee.findUniqueOrThrow({ where: { id: second.id } })).state).toBe(EmployeeState.SUSPENDED);
        expect((await tx.session.findUniqueOrThrow({ where: { id: session.id } })).revokedAt).not.toBeNull();
        expect((await tx.employeePermissionOverride.findUniqueOrThrow({ where: { id: override.id } })).revokedAt).not.toBeNull();
        await expect(authorization.assertPermission(secondAccount.id, "org.employee.read", {
          kind: "TEAM", organizationId: org.id, branchId: branch.id, teamId: team.id
        })).rejects.toBeInstanceOf(ForbiddenException);

        await tx.$executeRaw`SAVEPOINT s03_reporting_cycle`;
        await expect(tx.employee.update({ where: { id: lead.id }, data: { reportsToId: first.id } })).rejects.toThrow();
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT s03_reporting_cycle`;

        await tx.$executeRaw`SAVEPOINT s03_membership_unique`;
        await expect(tx.employeeMembershipHistory.create({ data: {
          employeeId: lead.id, organizationId: org.id, branchId: branch.id, teamId: team.id,
          effectiveFrom: new Date(Date.now() + 10_000), recordedById: owner.id, reason: "Duplicate current history"
        } })).rejects.toThrow();
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT s03_membership_unique`;

        await tx.$executeRaw`SAVEPOINT s03_permission_scope`;
        await expect(tx.rolePermission.create({ data: {
          organizationId: org.id, roleId: leaderRole.id, permissionKey: "invalid.scope", scopeKind: PermissionScopeKind.TEAM
        } })).rejects.toThrow();
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT s03_permission_scope`;

        const event = await tx.organizationEvent.findFirstOrThrow({ where: { eventType: OrganizationEventType.EMPLOYEE_SUSPENDED, subjectId: second.id } });
        const [legacyCount, auditCount, domainCount, outboxCount] = await Promise.all([
          tx.organizationEvent.count({ where: { organizationId: org.id } }),
          tx.auditEvent.count({ where: { organizationId: org.id } }),
          tx.domainEvent.count({ where: { organizationId: org.id } }),
          tx.outboxDelivery.count({ where: { event: { organizationId: org.id } } }),
        ]);
        expect(auditCount).toBe(legacyCount);
        expect(domainCount).toBe(legacyCount);
        expect(outboxCount).toBe(legacyCount);
        const canonical = await tx.auditEvent.findFirstOrThrow({ where: { legacyOrganizationEventId: event.id } });
        expect(canonical).toMatchObject({
          eventKey: "organization.employee.suspended", actorId: owner.id, subjectType: "employee", subjectId: second.id,
          reason: "Suspend integration fixture employee", legacyOrganizationEventId: event.id
        });
        await tx.$executeRaw`SAVEPOINT s03_event_immutable`;
        await expect(tx.organizationEvent.update({ where: { id: event.id }, data: { reason: "tampered" } })).rejects.toThrow();
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT s03_event_immutable`;
        const canonicalEvent = await tx.domainEvent.findFirstOrThrow({ where: { legacyOrganizationEventId: event.id }, include: { deliveries: true } });
        expect(canonicalEvent.deliveries).toHaveLength(1);
        expect(canonicalEvent.deliveries[0]?.consumer).toBe("NTF");
        await tx.$executeRaw`SAVEPOINT s04_event_immutable`;
        await expect(tx.auditEvent.update({ where: { id: canonical.id }, data: { reason: "tampered" } })).rejects.toThrow();
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT s04_event_immutable`;
        await tx.$executeRaw`SAVEPOINT s04_domain_event_immutable`;
        await expect(tx.domainEvent.update({ where: { id: canonicalEvent.id }, data: { eventName: "tampered" } })).rejects.toThrow();
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT s04_domain_event_immutable`;
        throw new RollbackFixture("Roll back temporary organization test records");
      });
    } catch (error) {
      if (!(error instanceof RollbackFixture)) throw error;
    }
  });

  it("rolls back organization state, legacy evidence, canonical audit/event, and outbox together", async () => {
    try {
      await database.prisma.$transaction(async (tx) => {
        const owner = await tx.account.create({ data: {
          normalizedEmail: `s04-owner-${randomUUID()}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE
        } });
        const org = await tx.organization.create({ data: { name: `S04 rollback ${randomUUID()}` } });
        const brokenTx = new Proxy(tx, {
          get(target, property) {
            if (property === "$transaction") return (callback: (client: typeof tx) => unknown) => callback(brokenTx);
            if (property === "outboxDelivery") return new Proxy(target.outboxDelivery, {
              get(delegate, method) {
                if (method === "create") return () => delegate.create({ data: {
                  eventId: randomUUID(), consumer: OutboxConsumer.NTF
                } });
                return Reflect.get(delegate, method, delegate) as unknown;
              }
            });
            return Reflect.get(target, property, target) as unknown;
          }
        });
        const brokenDatabase = { prisma: brokenTx } as never;
        const organization = new OrganizationService(
          brokenDatabase, new IdentityService(brokenDatabase, config), new AuthorizationService(brokenDatabase)
        );
        const before = {
          branches: await tx.branch.count({ where: { organizationId: org.id } }),
          legacy: await tx.organizationEvent.count({ where: { organizationId: org.id } }),
          audit: await tx.auditEvent.count({ where: { organizationId: org.id } }),
          events: await tx.domainEvent.count({ where: { organizationId: org.id } }),
          outbox: await tx.outboxDelivery.count({ where: { event: { organizationId: org.id } } }),
        };
        await tx.$executeRaw`SAVEPOINT s04_atomicity`;
        await expect(organization.createBranch(owner.id, org.id, "Should Roll Back", "Outbox failure fixture")).rejects.toThrow();
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT s04_atomicity`;
        expect(await tx.branch.count({ where: { organizationId: org.id } })).toBe(before.branches);
        expect(await tx.organizationEvent.count({ where: { organizationId: org.id } })).toBe(before.legacy);
        expect(await tx.auditEvent.count({ where: { organizationId: org.id } })).toBe(before.audit);
        expect(await tx.domainEvent.count({ where: { organizationId: org.id } })).toBe(before.events);
        expect(await tx.outboxDelivery.count({ where: { event: { organizationId: org.id } } })).toBe(before.outbox);
        throw new RollbackFixture("Roll back S04 atomicity fixture");
      });
    } catch (error) {
      if (!(error instanceof RollbackFixture)) throw error;
    }
  });
});

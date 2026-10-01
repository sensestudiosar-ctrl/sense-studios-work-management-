import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { DatabaseService } from "./database.service.js";
import { AccountKind, AccountState, type Prisma } from "./generated/prisma/client.js";
import { ProjectService, type ProjectActor } from "./project.service.js";
import { ClientPortalAccessService } from "./client-portal-access.service.js";
import { ClientPortalIdentityService } from "./client-portal-identity.service.js";
import { IdentityService } from "./identity.service.js";
import type { BrevoEmailAdapter } from "./brevo-email.js";
import type { RuntimeConfig } from "./config.js";
import { recordProjectEvent } from "./project-events.js";

const url = process.env.S14_DATABASE_URL;
const databaseDescribe = url ? describe : describe.skip;
jest.setTimeout(30_000);

databaseDescribe("S14 portal identity PostgreSQL acceptance", () => {
  let database: DatabaseService;
  let projects: ProjectService;
  let access: ClientPortalAccessService;
  let identity: ClientPortalIdentityService;
  let internal: IdentityService;
  let owner: ProjectActor;
  let branchId: string;
  const sent = new Map<string, string>();

  beforeAll(async () => {
    if (!url || !/(?:_test)$/.test(new URL(url).pathname) || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) throw new Error("S14 requires a dedicated local _test database");
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: url, webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined, emailVerificationSecret: "s14-test-verification-secret-is-not-production" };
    database = new DatabaseService(config);
    const prisma = database.prisma;
    const org = await prisma.organization.findFirst() ?? await prisma.organization.create({ data: { name: "S14 isolated acceptance organization" } });
    const account = await prisma.account.findFirst({ where: { kind: AccountKind.OWNER, state: AccountState.ACTIVE } }) ?? await prisma.account.create({ data: { normalizedEmail: `s14-owner-${randomUUID()}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
    owner = { accountId: account.id, organizationId: org.id, kind: AccountKind.OWNER };
    const branch = await prisma.branch.create({ data: { organizationId: org.id, name: `S14 test ${randomUUID()}` } });
    branchId = branch.id;
    projects = new ProjectService(database);
    access = new ClientPortalAccessService(database);
    const email = { send: async (address: string, content: { textContent: string }) => {
      const match = content.textContent.match(/code is (\d{6})/);
      if (!match) throw new Error("Expected a test sign-in code");
      sent.set(address, match[1]);
    } } as unknown as BrevoEmailAdapter;
    identity = new ClientPortalIdentityService(database, email, config);
    internal = new IdentityService(database, config);
  });
  afterAll(async () => { await database?.onModuleDestroy(); });

  async function fixture() {
    const created = await projects.create(owner, { branchId, title: `S14 identity ${randomUUID()}`, deliveryType: "DESIGN", scopes: ["Architecture"], reason: "S14 isolated identity acceptance" });
    const email = `s14-client-${randomUUID()}@example.test`;
    const result = await access.setPrimary(owner, created.project.id, { email, expectedProjectVersion: created.project.version, expectedPrimaryGrantId: null, reason: "Owner appoints Primary Client for acceptance" });
    return { project: created.project, email, grant: result.grant };
  }

  it("persists Owner primary appointment with atomic immutable audit/event/outbox evidence and rejects grant tampering", async () => {
    const timezone = await database.prisma.$queryRaw<Array<{ TimeZone: string }>>`SHOW timezone`;
    expect(timezone[0].TimeZone).toBe("UTC");
    const { grant } = await fixture();
    const history = await database.prisma.clientPortalGrantChange.findUniqueOrThrow({ where: { grantId_grantVersion: { grantId: grant.id, grantVersion: 1 } } });
    const audit = await database.prisma.auditEvent.findUniqueOrThrow({ where: { id: history.auditEventId } });
    expect(audit.eventKey).toBe("client.access_changed");
    expect(await database.prisma.domainEvent.count({ where: { eventName: "client.access_changed", subjectId: grant.id } })).toBe(1);
    await expect(database.prisma.clientPortalGrant.update({ where: { id: grant.id }, data: { primary: false, version: 2 } })).rejects.toThrow();
    await expect(database.prisma.clientPortalGrantChange.update({ where: { id: history.id }, data: { reason: "Rewrite retained evidence" } })).rejects.toThrow();
    await expect(database.prisma.clientPortalGrant.delete({ where: { id: grant.id } })).rejects.toThrow();
    expect((await database.prisma.clientPortalGrant.findUniqueOrThrow({ where: { id: grant.id } })).primary).toBe(true);
  });

  it("commits invalid code attempts, allows exactly one concurrent valid-code session, and rejects internal-cookie reuse", async () => {
    const { grant, email } = await fixture();
    await identity.requestCode(email);
    const code = sent.get(email)!;
    const wrong = code === "000000" ? "000001" : "000000";
    await expect(identity.verifyCode(email, wrong)).rejects.toBeInstanceOf(UnauthorizedException);
    expect((await database.prisma.clientPortalCode.findUniqueOrThrow({ where: { accountId: grant.accountId } })).attempts).toBe(1);
    const attempts = await Promise.allSettled([identity.verifyCode(email, code), identity.verifyCode(email, code)]);
    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const result = attempts.find((item) => item.status === "fulfilled") as PromiseFulfilledResult<Awaited<ReturnType<typeof identity.verifyCode>>>;
    expect((await identity.session(result.value.secret)).account.kind).toBe(AccountKind.CLIENT);
    await expect(internal.session(result.value.secret)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(projects.actor(grant.accountId)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(database.prisma.session.create({ data: { accountId: grant.accountId, tokenHash: randomUUID(), csrfTokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60_000) } })).rejects.toThrow();
    expect(await database.prisma.clientPortalSession.count({ where: { accountId: grant.accountId } })).toBe(1);
  });

  it("rejects staff identity in portal sessions, codes and ceremonies at the SQL boundary", async () => {
    await expect(database.prisma.clientPortalSession.create({ data: { accountId: owner.accountId, tokenHash: "a".repeat(64), csrfTokenHash: "b".repeat(64), expiresAt: new Date(Date.now() + 60_000) } })).rejects.toThrow();
    await expect(database.prisma.clientPortalCode.create({ data: { accountId: owner.accountId, codeHash: "c".repeat(64), sendWindowStartedAt: new Date(), lastSentAt: new Date(), expiresAt: new Date(Date.now() + 60_000) } })).rejects.toThrow();
  });

  it("requires current Owner authority and rejects simultaneous stale Primary Client replacements", async () => {
    const { grant, project } = await fixture();
    await expect(access.setPrimary({ ...owner, kind: AccountKind.STAFF }, project.id, { email: `denied-${randomUUID()}@example.test`, expectedProjectVersion: project.version, expectedPrimaryGrantId: grant.id, expectedPrimaryGrantVersion: grant.version, reason: "Denied staff primary replacement" })).rejects.toBeInstanceOf(ForbiddenException);
    const results = await Promise.allSettled(["one", "two"].map((label) => access.setPrimary(owner, project.id, { email: `${label}-${randomUUID()}@example.test`, expectedProjectVersion: project.version, expectedPrimaryGrantId: grant.id, expectedPrimaryGrantVersion: grant.version, reason: "Concurrent Owner primary replacement" })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failure = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(failure.reason).toBeInstanceOf(ConflictException);
    expect(await database.prisma.clientPortalGrant.count({ where: { projectId: project.id, primary: true, revokedAt: null } })).toBe(1);
  });

  it("audits finite expiry changes and denies an expired grant on every session request", async () => {
    const { grant, email } = await fixture();
    await identity.requestCode(email);
    const login = await identity.verifyCode(email, sent.get(email)!);
    const end = new Date(Date.now() + 1500).toISOString();
    const updated = await access.changeAccess(owner, grant.id, { expectedVersion: grant.version, expiresAt: end, reason: "Owner sets this client's individual end time" });
    expect(updated.expiresAt?.toISOString()).toBe(end);
    expect(await database.prisma.clientPortalGrantChange.count({ where: { grantId: grant.id } })).toBe(2);
    await new Promise((resolve) => setTimeout(resolve, 1600));
    await expect(identity.session(login.secret)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("revokes live portal access atomically and preserves sign-in and grant evidence", async () => {
    const { grant, email } = await fixture();
    await identity.requestCode(email);
    const login = await identity.verifyCode(email, sent.get(email)!);
    await access.changeAccess(owner, grant.id, { expectedVersion: grant.version, revoke: true, reason: "Owner revokes client access with retained history" });
    await expect(identity.session(login.secret)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(identity.verifyCode(email, sent.get(email)!)).rejects.toBeInstanceOf(UnauthorizedException);
    expect((await database.prisma.clientPortalSession.findUniqueOrThrow({ where: { id: login.sessionId } })).revokedAt).not.toBeNull();
    expect((await database.prisma.clientPortalCode.findUniqueOrThrow({ where: { accountId: grant.accountId } })).consumedAt).not.toBeNull();
  });

  it("rolls back primary setup when canonical audit writing fails", async () => {
    const created = await projects.create(owner, { branchId, title: `S14 rollback ${randomUUID()}`, deliveryType: "DESIGN", scopes: ["Architecture"], reason: "Create rollback acceptance project" });
    const email = `rollback-${randomUUID()}@example.test`;
    await expect(access.setPrimary(owner, created.project.id, { email, expectedProjectVersion: created.project.version, expectedPrimaryGrantId: null, reason: "x".repeat(1001) })).rejects.toThrow();
    expect(await database.prisma.clientPortalGrant.count({ where: { projectId: created.project.id } })).toBe(0);
    expect(await database.prisma.account.count({ where: { normalizedEmail: email } })).toBe(0);
  });

  it("rejects suspended Primary Client invitations and canonically evidenced Additional Client access changes", async () => {
    const { grant, project } = await fixture();
    const replacement = await access.setPrimary(owner, project.id, {
      email: `active-primary-${randomUUID()}@example.test`, expectedProjectVersion: project.version,
      expectedPrimaryGrantId: grant.id, expectedPrimaryGrantVersion: grant.version,
      reason: "Owner replacement creates additional-client guard fixture"
    });
    const additional = await database.prisma.clientPortalGrant.findUniqueOrThrow({ where: { id: grant.id } });
    const invitedAccount = await database.prisma.account.create({ data: { normalizedEmail: `denied-invitation-${randomUUID()}@example.test`, kind: AccountKind.CLIENT, state: AccountState.ACTIVE } });
    await expect(database.prisma.$transaction(async (tx) => {
      await tx.account.update({ where: { id: replacement.grant.accountId }, data: { state: AccountState.SUSPENDED } });
      await tx.clientPortalGrant.create({ data: {
        organizationId: owner.organizationId, projectId: project.id, accountId: invitedAccount.id,
        invitedById: replacement.grant.accountId, reason: "Suspended Primary Client attempts invitation"
      } });
    })).rejects.toThrow();
    expect(await database.prisma.clientPortalGrant.count({ where: { projectId: project.id, accountId: invitedAccount.id } })).toBe(0);

    await expect(database.prisma.$transaction(async (tx) => {
      await tx.account.update({ where: { id: replacement.grant.accountId }, data: { state: AccountState.SUSPENDED } });
      const changed = await tx.clientPortalGrant.update({ where: { id: additional.id }, data: { expiresAt: new Date(Date.now() + 60_000), version: { increment: 1 } } });
      const snapshot = (value: typeof additional) => ({ primary: value.primary, expiresAt: value.expiresAt?.toISOString() ?? null, revokedAt: value.revokedAt?.toISOString() ?? null });
      const before = snapshot(additional);
      const after = snapshot(changed);
      const reason = "Suspended Primary Client attempts access change";
      const eventId = await recordProjectEvent(tx, {
        organizationId: owner.organizationId, actorId: replacement.grant.accountId,
        eventName: "client.access_changed", subjectType: "client_access", subjectId: additional.id, reason,
        before: { access: before }, after: { projectId: project.id, accountId: additional.accountId, version: changed.version, access: after }
      });
      const event = await tx.domainEvent.findUniqueOrThrow({ where: { id: eventId } });
      await tx.clientPortalGrantChange.create({ data: {
        organizationId: owner.organizationId, projectId: project.id, grantId: additional.id,
        grantVersion: changed.version, actorId: replacement.grant.accountId, reason,
        auditEventId: (event.payload as { auditEventId: string }).auditEventId, before, after
      } });
      // Execute the deferred guard here so the regression fails specifically on actor authority.
      await tx.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");
    })).rejects.toThrow(/Client access changes require an active actor/);
    expect((await database.prisma.account.findUniqueOrThrow({ where: { id: replacement.grant.accountId } })).state).toBe(AccountState.ACTIVE);
    expect((await database.prisma.clientPortalGrant.findUniqueOrThrow({ where: { id: additional.id } })).version).toBe(additional.version);
    expect(await database.prisma.clientPortalGrantChange.count({ where: { grantId: additional.id } })).toBe(2);
  });

  it("enforces actual Primary Client expiry after transaction waits and locks an active grant actor against concurrent suspension", async () => {
    const { grant, project } = await fixture();
    const invitee = await database.prisma.account.create({ data: { normalizedEmail: `authority-race-${randomUUID()}@example.test`, kind: AccountKind.CLIENT, state: AccountState.ACTIVE } });
    const snapshot = (value: typeof grant) => ({ primary: value.primary, expiresAt: value.expiresAt?.toISOString() ?? null, revokedAt: value.revokedAt?.toISOString() ?? null });
    const evidence = async (tx: Prisma.TransactionClient, changed: typeof grant, before: Record<string, unknown>, actorId: string) => {
      const after = snapshot(changed);
      const reason = "Verify client grant authority through a transaction wait";
      const eventId = await recordProjectEvent(tx, {
        organizationId: owner.organizationId, actorId, eventName: "client.access_changed", subjectType: "client_access", subjectId: changed.id, reason,
        before: { access: before }, after: { projectId: project.id, accountId: changed.accountId, version: changed.version, access: after }
      });
      const event = await tx.domainEvent.findUniqueOrThrow({ where: { id: eventId } });
      await tx.clientPortalGrantChange.create({ data: {
        organizationId: owner.organizationId, projectId: project.id, grantId: changed.id, grantVersion: changed.version,
        actorId, reason, auditEventId: (event.payload as { auditEventId: string }).auditEventId, before: before as Prisma.InputJsonValue, after
      } });
    };
    await expect(database.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT CURRENT_TIMESTAMP`;
      const expiresAt = new Date(Date.now() + 300);
      const changed = await tx.clientPortalGrant.update({ where: { id: grant.id }, data: { expiresAt, version: { increment: 1 } } });
      await evidence(tx, changed, snapshot(grant), owner.accountId);
      await tx.$executeRaw`SELECT pg_sleep(0.35)`;
      expect(expiresAt.getTime()).toBeLessThan(Date.now());
      await tx.clientPortalGrant.create({ data: {
        organizationId: owner.organizationId, projectId: project.id, accountId: invitee.id, invitedById: grant.accountId,
        reason: "Expired Primary attempts an invitation after waiting"
      } });
    })).rejects.toThrow(/Only Primary Client or Owner invites additional users/);
    expect((await database.prisma.clientPortalGrant.findUniqueOrThrow({ where: { id: grant.id } })).expiresAt).toBeNull();

    await expect(database.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT CURRENT_TIMESTAMP`;
      const expiresAt = new Date(Date.now() + 300);
      const changed = await tx.clientPortalGrant.update({ where: { id: grant.id }, data: { expiresAt, version: { increment: 1 } } });
      await evidence(tx, changed, snapshot(grant), owner.accountId);
      const added = await tx.clientPortalGrant.create({ data: {
        organizationId: owner.organizationId, projectId: project.id, accountId: invitee.id, invitedById: grant.accountId,
        reason: "Primary invitation must retain current authority through commit"
      } });
      await evidence(tx, added, {}, grant.accountId);
      await tx.$executeRaw`SELECT pg_sleep(0.35)`;
      await tx.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");
    })).rejects.toThrow(/Only Owner or current Primary Client may change client access/);

    const rollback = new Error("Rollback successful actor-lock regression transaction");
    await expect(database.prisma.$transaction(async (tx) => {
      const added = await tx.clientPortalGrant.create({ data: {
        organizationId: owner.organizationId, projectId: project.id, accountId: invitee.id, invitedById: grant.accountId,
        reason: "Active Primary retains authority until grant transaction completes"
      } });
      await evidence(tx, added, {}, grant.accountId);
      await tx.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");
      await expect(database.prisma.$transaction(async (other) => {
        await other.$executeRawUnsafe("SET LOCAL lock_timeout = '50ms'");
        await other.account.update({ where: { id: grant.accountId }, data: { state: AccountState.SUSPENDED } });
      })).rejects.toThrow(/lock timeout/);
      throw rollback;
    })).rejects.toBe(rollback);
    expect((await database.prisma.account.findUniqueOrThrow({ where: { id: grant.accountId } })).state).toBe(AccountState.ACTIVE);
    expect(await database.prisma.clientPortalGrant.count({ where: { projectId: project.id, accountId: invitee.id } })).toBe(0);
  });

  it("requires client grant end times later than the actual cancellation transition after a transaction wait", async () => {
    const { grant, project } = await fixture();
    await expect(database.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT CURRENT_TIMESTAMP`;
      const expiresAt = new Date(Date.now() + 300);
      const changed = await tx.clientPortalGrant.update({ where: { id: grant.id }, data: { expiresAt, version: { increment: 1 } } });
      const before = { primary: grant.primary, expiresAt: null, revokedAt: null };
      const after = { primary: changed.primary, expiresAt: expiresAt.toISOString(), revokedAt: null };
      const reason = "Owner sets a client end time that expires while cancellation waits";
      const eventId = await recordProjectEvent(tx, {
        organizationId: owner.organizationId, actorId: owner.accountId, eventName: "client.access_changed", subjectType: "client_access", subjectId: grant.id, reason,
        before: { access: before }, after: { projectId: project.id, accountId: grant.accountId, version: changed.version, access: after }
      });
      const event = await tx.domainEvent.findUniqueOrThrow({ where: { id: eventId } });
      await tx.clientPortalGrantChange.create({ data: {
        organizationId: owner.organizationId, projectId: project.id, grantId: grant.id, grantVersion: changed.version,
        actorId: owner.accountId, reason, auditEventId: (event.payload as { auditEventId: string }).auditEventId, before, after
      } });
      await tx.$executeRaw`SELECT pg_sleep(0.35)`;
      expect(expiresAt.getTime()).toBeLessThan(Date.now());
      // The BEFORE guard must reject this immediately, before deferred project-history checks.
      await tx.project.update({ where: { id: project.id }, data: { status: "CANCELLED", version: { increment: 1 } } });
    })).rejects.toThrow(/Owner must set a future end date for every retained client grant/);
    expect((await database.prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe(project.status);
    expect((await database.prisma.clientPortalGrant.findUniqueOrThrow({ where: { id: grant.id } })).expiresAt).toBeNull();
  });
});

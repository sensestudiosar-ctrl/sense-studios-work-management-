import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { AccountKind, AccountState, AuditRetentionBackupDisposition, OrganizationEventType, OutboxConsumer, OutboxDeliveryState } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuditRetentionService } from "./audit-retention.service.js";
import type { RuntimeConfig } from "./config.js";

const databaseUrl = process.env.DATABASE_URL;
const retentionDescribe = databaseUrl ? describe : describe.skip;
const config: RuntimeConfig = {
  nodeEnv: "test", port: 4000,
  databaseUrl: databaseUrl ?? "postgresql://sense_app_runtime@127.0.0.1:5432/sense_s04_test",
  webOrigin: "http://localhost:5173",
  ownerBootstrapEmail: undefined,
  ownerBootstrapSecret: undefined
};
class RollbackFixture extends Error {}

retentionDescribe("audit retention with PostgreSQL", () => {
  let database: DatabaseService;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("DATABASE_URL must point to a dedicated test database");
    database = new DatabaseService(config);
    const rows = await database.prisma.$queryRaw<Array<{ databaseName: string }>>`SELECT current_database() AS "databaseName"`;
    if (!/_test(?:db)?$/i.test(rows[0]?.databaseName ?? "")) {
      await database.onModuleDestroy();
      throw new Error("Audit retention integration tests require a dedicated _test database");
    }
  });

  afterAll(async () => database?.onModuleDestroy());

  it("keeps append-only evidence inaccessible to API DML and purges only after every retention gate", async () => {
    await expect(database.prisma.auditEvent.update({ where: { id: randomUUID() }, data: { reason: "tampered" } })).rejects.toThrow();
    await expect(database.prisma.auditEvent.delete({ where: { id: randomUUID() } })).rejects.toThrow();

    try {
      await database.prisma.$transaction(async (tx) => {
        const client = new Proxy(tx, {
          get(target, property) {
            if (property === "$transaction") return (callback: (value: typeof tx) => unknown) => callback(client as typeof tx);
            return Reflect.get(target, property, target) as unknown;
          }
        });
        const organization = await tx.organization.findFirst() ?? await tx.organization.create({ data: { name: `S04 retention ${randomUUID()}` } });
        const owner = await tx.account.create({ data: {
          normalizedEmail: `s04-retention-${randomUUID()}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE
        } });
        await tx.auditRetentionConfiguration.update({ where: { singletonKey: 1 }, data: { noticeIntervalDays: 30 } });

        const legacy = await tx.organizationEvent.create({ data: {
          organizationId: organization.id, eventType: OrganizationEventType.ORGANIZATION_CREATED,
          actorId: owner.id, subjectId: organization.id, occurredAt: new Date("2000-01-01T00:00:00.000Z"),
          reason: "Retention integration fixture"
        } });
        const correlationId = randomUUID();
        const audit = await tx.auditEvent.create({ data: {
          organizationId: organization.id, eventKey: "organization.created", schemaVersion: 1,
          occurredAt: new Date("2000-01-01T00:00:00.000Z"), actorId: owner.id,
          actorSnapshot: { accountId: owner.id, email: owner.normalizedEmail }, subjectType: "organization",
          subjectId: organization.id, reason: "Retention integration fixture", retentionExpiresAt: new Date("2010-01-01T00:00:00.000Z"),
          correlationId, legacyOrganizationEventId: legacy.id
        } });
        const correctionCorrelationId = randomUUID();
        const correction = await tx.auditEvent.create({ data: {
          organizationId: organization.id, eventKey: "audit.corrected", schemaVersion: 1,
          occurredAt: new Date("2001-01-01T00:00:00.000Z"), actorId: owner.id,
          actorSnapshot: { accountId: owner.id, email: owner.normalizedEmail }, subjectType: "audit_event",
          subjectId: audit.id, reason: "Correct the recorded organization name", after: { name: "Corrected name" },
          correctsEventId: audit.id, retentionExpiresAt: new Date("2011-01-01T00:00:00.000Z"),
          correlationId: correctionCorrelationId
        } });
        const event = await tx.domainEvent.create({ data: {
          eventName: "organization.created", occurredAt: audit.occurredAt, organizationId: organization.id,
          actorId: owner.id, subjectType: "organization", subjectId: organization.id, correlationId,
          payload: { auditEventId: audit.id, sourceOrganizationEventId: legacy.id }, legacyOrganizationEventId: legacy.id
        } });
        await tx.outboxDelivery.create({ data: { eventId: event.id, consumer: OutboxConsumer.NTF, state: OutboxDeliveryState.PENDING } });
        const correctionEvent = await tx.domainEvent.create({ data: {
          eventName: "audit.corrected", occurredAt: correction.occurredAt, organizationId: organization.id,
          actorId: owner.id, subjectType: "audit_event", subjectId: audit.id, correlationId: correctionCorrelationId,
          payload: { auditEventId: correction.id, correctsAuditEventId: audit.id }
        } });
        await tx.outboxDelivery.create({ data: { eventId: correctionEvent.id, consumer: OutboxConsumer.NTF, state: OutboxDeliveryState.PENDING } });
        const notice = await tx.auditRetentionNotice.create({ data: {
          auditEventId: audit.id, noticeAt: new Date("2009-01-01T00:00:00.000Z"),
          acknowledgedAt: new Date("2009-02-01T00:00:00.000Z"), acknowledgedById: owner.id,
          backupDisposition: AuditRetentionBackupDisposition.CLEARED, backupEvidenceRef: "backup-run-2042-017",
          backupClearedAt: new Date("2009-02-01T00:00:00.000Z")
        } });
        const correctionNotice = await tx.auditRetentionNotice.create({ data: {
          auditEventId: correction.id, noticeAt: new Date("2010-01-01T00:00:00.000Z"),
          acknowledgedAt: new Date("2010-02-01T00:00:00.000Z"), acknowledgedById: owner.id,
          backupDisposition: AuditRetentionBackupDisposition.CLEARED, backupEvidenceRef: "backup-run-2042-018",
          backupClearedAt: new Date("2010-02-01T00:00:00.000Z")
        } });
        const retention = new AuditRetentionService({ prisma: client } as never);
        const searchSubjectId = `audit-search-${randomUUID()}`;
        const exactSearchEvent = await tx.auditEvent.create({ data: {
          organizationId: organization.id, eventKey: "audit.searchfixture", schemaVersion: 1,
          occurredAt: new Date("2022-01-01T00:00:00.000Z"), actorId: owner.id,
          actorSnapshot: { accountId: owner.id, email: owner.normalizedEmail }, subjectType: "audit_search_test",
          subjectId: searchSubjectId, retentionExpiresAt: new Date("2032-01-01T00:00:00.000Z"), correlationId: randomUUID()
        } });
        await tx.auditEvent.create({ data: {
          organizationId: organization.id, eventKey: "audit.searchfixture.detail", schemaVersion: 1,
          occurredAt: new Date("2023-01-01T00:00:00.000Z"), actorId: owner.id,
          actorSnapshot: { accountId: owner.id, email: owner.normalizedEmail }, subjectType: "audit_search_test",
          subjectId: searchSubjectId, retentionExpiresAt: new Date("2033-01-01T00:00:00.000Z"), correlationId: randomUUID()
        } });
        const exactSearch = await retention.searchEvents({ eventKey: "AUDIT.SEARCHFIXTURE", subjectId: searchSubjectId, limit: 10 });
        expect(exactSearch.items.map((item) => item.id)).toEqual([exactSearchEvent.id]);
        const correctionTarget = await tx.auditEvent.create({ data: {
          organizationId: organization.id, eventKey: "organization.created", schemaVersion: 1,
          occurredAt: new Date("2020-01-01T00:00:00.000Z"), actorId: owner.id,
          actorSnapshot: { accountId: owner.id, email: owner.normalizedEmail }, subjectType: "organization",
          subjectId: organization.id, reason: "Correction target fixture", retentionExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
          correlationId: randomUUID()
        } });
        const corrected = await retention.createCorrection(owner.id, correctionTarget.id,
          "Correct the organization's recorded name", { name: "Corrected organization name" });
        expect(corrected.correctsEventId).toBe(correctionTarget.id);
        expect(corrected.eventKey).toBe("audit.corrected");
        const correctionDelivery = await tx.outboxDelivery.findFirst({ where: { event: { subjectId: correctionTarget.id, eventName: "audit.corrected" } } });
        expect(correctionDelivery).toMatchObject({ consumer: OutboxConsumer.NTF, state: OutboxDeliveryState.PENDING });

        const noPurgeBeforeNoticeIntervalConfiguration = await tx.auditRetentionConfiguration.update({ where: { singletonKey: 1 }, data: { noticeIntervalDays: null } });
        expect(noPurgeBeforeNoticeIntervalConfiguration.noticeIntervalDays).toBeNull();
        const disabled = await tx.$queryRaw<Array<{ purged: boolean }>>`SELECT purge_expired_audit_event(${audit.id}::uuid) AS purged`;
        expect(disabled[0]?.purged).toBe(false);
        await tx.auditRetentionConfiguration.update({ where: { singletonKey: 1 }, data: { noticeIntervalDays: 30 } });

        await tx.auditRetentionHold.create({ data: { auditEventId: audit.id, heldById: owner.id, reason: "Pending legal hold" } });
        const held = await tx.$queryRaw<Array<{ purged: boolean }>>`SELECT purge_expired_audit_event(${audit.id}::uuid) AS purged`;
        expect(held[0]?.purged).toBe(false);
        await tx.auditRetentionHold.updateMany({ where: { auditEventId: audit.id, releasedAt: null }, data: {
          releasedAt: new Date("2009-03-01T00:00:00.000Z"), releasedById: owner.id, releaseReason: "Hold ended"
        } });

        const undelivered = await tx.$queryRaw<Array<{ purged: boolean }>>`SELECT purge_expired_audit_event(${audit.id}::uuid) AS purged`;
        expect(undelivered[0]?.purged).toBe(false);
        await tx.outboxDelivery.update({ where: { eventId_consumer: { eventId: event.id, consumer: OutboxConsumer.NTF } }, data: {
          state: OutboxDeliveryState.DELIVERED, deliveredAt: new Date("2009-04-01T00:00:00.000Z")
        } });
        const correctionPending = await tx.$queryRaw<Array<{ purged: boolean }>>`SELECT purge_expired_audit_event(${audit.id}::uuid) AS purged`;
        expect(correctionPending[0]?.purged).toBe(false);
        await tx.outboxDelivery.update({ where: { eventId_consumer: { eventId: correctionEvent.id, consumer: OutboxConsumer.NTF } }, data: {
          state: OutboxDeliveryState.DELIVERED, deliveredAt: new Date("2010-03-01T00:00:00.000Z")
        } });

        const success = await tx.$queryRaw<Array<{ purged: boolean }>>`SELECT purge_expired_audit_event(${audit.id}::uuid) AS purged`;
        expect(success[0]?.purged).toBe(true);
        expect(await tx.auditEvent.findUnique({ where: { id: audit.id } })).toBeNull();
        expect(await tx.auditEvent.findUnique({ where: { id: correction.id } })).toBeNull();
        expect(await tx.organizationEvent.findUnique({ where: { id: legacy.id } })).toBeNull();
        expect(await tx.domainEvent.findUnique({ where: { id: event.id } })).toBeNull();
        expect(await tx.domainEvent.findUnique({ where: { id: correctionEvent.id } })).toBeNull();
        expect(await tx.auditRetentionNotice.findUnique({ where: { id: notice.id } })).toBeNull();
        expect(await tx.auditRetentionNotice.findUnique({ where: { id: correctionNotice.id } })).toBeNull();
        const tombstone = await tx.auditDeletionTombstone.findUniqueOrThrow({ where: { auditEventId: audit.id } });
        expect(tombstone.backupDisposition).toBe(AuditRetentionBackupDisposition.CLEARED);
        expect(tombstone.noticeAcknowledgedAt).toEqual(new Date("2009-02-01T00:00:00.000Z"));
        const correctionTombstone = await tx.auditDeletionTombstone.findUniqueOrThrow({ where: { auditEventId: correction.id } });
        expect(correctionTombstone.backupDisposition).toBe(AuditRetentionBackupDisposition.CLEARED);

        const duplicate = await retention.purgeEligibleEvents(new Date("2011-01-01T00:00:00.000Z"));
        expect(duplicate).toBe(0);
        throw new RollbackFixture("Roll back temporary audit retention fixtures");
      });
    } catch (error) {
      if (!(error instanceof RollbackFixture)) throw error;
    }
  });
});

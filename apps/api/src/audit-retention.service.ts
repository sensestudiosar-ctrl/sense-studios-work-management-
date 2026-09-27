import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  AccountKind,
  AccountState,
  AuditRetentionBackupDisposition,
  OutboxConsumer,
  Prisma
} from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { assertSafeDomainPayload, isDomainEventName } from "./domain-event-catalogue.js";

const auditLifetimeYears = 10;
const defaultBatchSize = 50;

function retentionExpiry(occurredAt: Date): Date {
  const expiresAt = new Date(occurredAt);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + auditLifetimeYears);
  return expiresAt;
}

function assertSafeCorrection(value: Record<string, string | number | boolean | null>): void {
  const fields = Object.entries(value);
  if (fields.length === 0 || fields.length > 50) throw new BadRequestException("Correction details are invalid");
  for (const [key, item] of fields) {
    if (!/^[A-Za-z][A-Za-z0-9_. -]{0,79}$/.test(key)
      || /password|passkey|credential|session|csrf|token|recovery|secret|private.?key|nas.?path|file.?path|storage.?key/i.test(key)) {
      throw new BadRequestException("Correction details contain an invalid field");
    }
    if (typeof item === "string" && (item.length > 1000
      || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(item)
      || /\bBearer\s+\S+/i.test(item)
      || /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/.test(item)
      || /(?:[A-Za-z]:\\|\\\\[^\\]+\\|\/(?:mnt|nas|srv|volume|shares?)\/)/i.test(item))) {
      throw new BadRequestException("Correction details contain a sensitive value");
    }
  }
}

async function recordRetentionChange(
  tx: Prisma.TransactionClient,
  actorId: string,
  eventKey: string,
  subjectType: string,
  subjectId: string,
  reason: string,
  before: Prisma.InputJsonValue,
  after: Prisma.InputJsonValue
): Promise<void> {
  if (!isDomainEventName(eventKey)) throw new Error("Retention event is absent from the versioned event catalogue");
  const organization = await tx.organization.findFirst({ select: { id: true } });
  const actor = await tx.account.findUnique({ where: { id: actorId }, select: { normalizedEmail: true, kind: true, state: true } });
  if (!organization || !actor || actor.kind !== AccountKind.OWNER || actor.state !== AccountState.ACTIVE) {
    throw new NotFoundException("Retention authority is unavailable");
  }
  const occurredAt = new Date();
  const correlationId = randomUUID();
  await tx.auditEvent.create({ data: {
    organizationId: organization.id,
    eventKey,
    schemaVersion: 1,
    occurredAt,
    actorId,
    actorSnapshot: { accountId: actorId, email: actor.normalizedEmail },
    subjectType,
    subjectId,
    reason,
    before,
    after,
    retentionExpiresAt: retentionExpiry(occurredAt),
    correlationId
  } });
  const payload = { subjectId };
  assertSafeDomainPayload(eventKey, payload);
  const event = await tx.domainEvent.create({ data: {
    eventName: eventKey,
    schemaVersion: 1,
    occurredAt,
    organizationId: organization.id,
    actorId,
    subjectType,
    subjectId,
    correlationId,
    payload
  } });
  await tx.outboxDelivery.create({ data: { eventId: event.id, consumer: OutboxConsumer.NTF } });
}

@Injectable()
export class AuditRetentionService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.prisma;
  }

  async searchEvents(input: { cursor?: string; limit: number; eventKey?: string; subjectId?: string }) {
    const items = await this.db.auditEvent.findMany({
      where: {
        ...(input.eventKey ? { eventKey: input.eventKey.toLowerCase() } : {}),
        ...(input.subjectId ? { subjectId: input.subjectId } : {})
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      take: input.limit + 1,
      select: {
        id: true, eventKey: true, schemaVersion: true, occurredAt: true, actorId: true,
        actorSnapshot: true, subjectType: true, subjectId: true, reason: true, before: true,
        after: true, correctsEventId: true, retentionExpiresAt: true, correlationId: true
      }
    });
    const hasMore = items.length > input.limit;
    const page = hasMore ? items.slice(0, input.limit) : items;
    return { items: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null };
  }

  async createCorrection(actorId: string, auditEventId: string, reason: string, correction: Record<string, string | number | boolean | null>) {
    assertSafeCorrection(correction);
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${auditEventId}))`;
      const [original, actor] = await Promise.all([
        tx.auditEvent.findUnique({ where: { id: auditEventId } }),
        tx.account.findUnique({ where: { id: actorId }, select: { normalizedEmail: true, kind: true, state: true } })
      ]);
      if (!original) throw new NotFoundException("Correctable audit event not found");
      if (original.correctsEventId) throw new BadRequestException("Corrections must link to the original audit event");
      if (!actor || actor.kind !== AccountKind.OWNER || actor.state !== AccountState.ACTIVE) throw new NotFoundException("Correction authority is unavailable");
      const occurredAt = new Date();
      const correlationId = randomUUID();
      const corrected = await tx.auditEvent.create({ data: {
        organizationId: original.organizationId,
        eventKey: "audit.corrected",
        schemaVersion: 1,
        occurredAt,
        actorId,
        actorSnapshot: { accountId: actorId, email: actor.normalizedEmail },
        subjectType: "audit_event",
        subjectId: original.id,
        reason,
        after: correction as Prisma.InputJsonValue,
        correctsEventId: original.id,
        retentionExpiresAt: retentionExpiry(occurredAt),
        correlationId
      } });
      const payload = { auditEventId: corrected.id, correctsAuditEventId: original.id };
      assertSafeDomainPayload("audit.corrected", payload);
      const event = await tx.domainEvent.create({ data: {
        eventName: "audit.corrected",
        schemaVersion: 1,
        occurredAt,
        organizationId: original.organizationId,
        actorId,
        subjectType: "audit_event",
        subjectId: original.id,
        correlationId,
        payload
      } });
      await tx.outboxDelivery.create({ data: { eventId: event.id, consumer: OutboxConsumer.NTF } });
      return corrected;
    });
  }

  async retentionOverview() {
    const [configuration, notices, holds, tombstoneCount] = await Promise.all([
      this.db.auditRetentionConfiguration.findUnique({ where: { singletonKey: 1 } }),
      this.db.auditRetentionNotice.findMany({
        where: { acknowledgedAt: null },
        orderBy: { noticeAt: "asc" },
        take: 100,
        include: { auditEvent: { select: { id: true, eventKey: true, occurredAt: true, retentionExpiresAt: true, subjectType: true, subjectId: true } } }
      }),
      this.db.auditRetentionHold.findMany({
        where: { releasedAt: null }, orderBy: { heldAt: "desc" }, take: 100,
        select: { id: true, auditEventId: true, reason: true, heldAt: true }
      }),
      this.db.auditDeletionTombstone.count()
    ]);
    return { configuration, notices, activeHolds: holds, tombstoneCount };
  }

  async configureNoticeInterval(actorId: string, days: number | null) {
    if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) {
      throw new BadRequestException("Notice interval must be between 1 and 3650 days, or unset");
    }
    return this.db.$transaction(async (tx) => {
      const current = await tx.auditRetentionConfiguration.findUniqueOrThrow({ where: { singletonKey: 1 } });
      const updated = await tx.auditRetentionConfiguration.update({
        where: { singletonKey: 1 }, data: { noticeIntervalDays: days, updatedById: actorId }
      });
      await recordRetentionChange(tx, actorId, "audit.retention.notice_interval.updated", "audit_retention_configuration", "1",
        "Owner updated the audit expiry notice interval", { noticeIntervalDays: current.noticeIntervalDays }, { noticeIntervalDays: updated.noticeIntervalDays });
      return updated;
    });
  }

  async placeHold(actorId: string, auditEventId: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM audit_events WHERE id = ${auditEventId}::uuid FOR UPDATE`;
      const event = await tx.auditEvent.findUnique({ where: { id: auditEventId }, select: { id: true, eventKey: true } });
      if (!event) throw new NotFoundException("Audit event not found");
      const existing = await tx.auditRetentionHold.findFirst({ where: { auditEventId, releasedAt: null } });
      if (existing) throw new ConflictException("An active hold already exists");
      const hold = await tx.auditRetentionHold.create({ data: { auditEventId, heldById: actorId, reason } });
      await recordRetentionChange(tx, actorId, "audit.retention.hold.placed", "audit_event", auditEventId, reason,
        { held: false, eventKey: event.eventKey }, { held: true, holdId: hold.id });
      return hold;
    });
  }

  async releaseHold(actorId: string, holdId: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      const hold = await tx.auditRetentionHold.findUnique({ where: { id: holdId }, include: { auditEvent: { select: { eventKey: true } } } });
      if (!hold) throw new NotFoundException("Retention hold not found");
      await tx.$queryRaw`SELECT id FROM audit_events WHERE id = ${hold.auditEventId}::uuid FOR UPDATE`;
      if (hold.releasedAt) throw new ConflictException("Retention hold has already been released");
      const updated = await tx.auditRetentionHold.update({ where: { id: holdId }, data: {
        releasedAt: new Date(), releasedById: actorId, releaseReason: reason
      } });
      await recordRetentionChange(tx, actorId, "audit.retention.hold.released", "audit_event", hold.auditEventId, reason,
        { held: true, holdId }, { held: false, eventKey: hold.auditEvent.eventKey });
      return updated;
    });
  }

  async acknowledgeNotice(actorId: string, noticeId: string, disposition: AuditRetentionBackupDisposition, evidenceRef?: string) {
    if (disposition === AuditRetentionBackupDisposition.CLEARED && !evidenceRef) {
      throw new BadRequestException("A backup clearance reference is required");
    }
    if (disposition === AuditRetentionBackupDisposition.NOT_APPLICABLE && evidenceRef) {
      throw new BadRequestException("A backup reference is not valid when no backups apply");
    }
    return this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM audit_retention_notices WHERE id = ${noticeId}::uuid FOR UPDATE`;
      if (rows.length === 0) throw new NotFoundException("Retention notice not found");
      const notice = await tx.auditRetentionNotice.findUniqueOrThrow({ where: { id: noticeId }, include: { auditEvent: { select: { eventKey: true, retentionExpiresAt: true } } } });
      const now = new Date();
      if (notice.acknowledgedAt) throw new ConflictException("Retention notice has already been acknowledged");
      if (notice.noticeAt >= notice.auditEvent.retentionExpiresAt || now >= notice.auditEvent.retentionExpiresAt) {
        throw new ConflictException("Advance notice can no longer be acknowledged after expiry");
      }
      const updated = await tx.auditRetentionNotice.update({ where: { id: noticeId }, data: {
        acknowledgedAt: now,
        acknowledgedById: actorId,
        backupDisposition: disposition,
        ...(evidenceRef ? { backupEvidenceRef: evidenceRef } : {}),
        backupClearedAt: now
      } });
      await recordRetentionChange(tx, actorId, "audit.retention.notice.acknowledged", "audit_event", notice.auditEventId,
        "Owner acknowledged expiry notice after backup lifecycle review", { acknowledged: false },
        { acknowledged: true, backupDisposition: disposition, backupEvidenceRef: evidenceRef ?? null });
      return updated;
    });
  }

  async scheduleDueNotices(now = new Date()): Promise<number> {
    const rows = await this.db.$queryRaw<Array<{ id: string }>>`
      INSERT INTO audit_retention_notices (id, "auditEventId", "noticeAt")
      SELECT gen_random_uuid(), e.id, ${now}
      FROM audit_events e
      CROSS JOIN audit_retention_configuration c
      WHERE c."singletonKey" = 1
        AND c."noticeIntervalDays" IS NOT NULL
        AND e."retentionExpiresAt" > ${now}
        AND e."retentionExpiresAt" <= ${now} + make_interval(days => c."noticeIntervalDays")
      ON CONFLICT ("auditEventId") DO NOTHING
      RETURNING id`;
    return rows.length;
  }

  async purgeEligibleEvents(now = new Date(), batchSize = defaultBatchSize): Promise<number> {
    const candidates = await this.db.auditEvent.findMany({
      where: {
        retentionExpiresAt: { lte: now },
        retentionNotice: {
          is: {
            acknowledgedAt: { not: null },
            backupDisposition: { not: null },
            backupClearedAt: { not: null }
          }
        },
        retentionHolds: { none: { releasedAt: null } },
      },
      orderBy: { retentionExpiresAt: "asc" },
      take: Math.min(Math.max(batchSize, 1), 500),
      select: { id: true }
    });
    let purged = 0;
    for (const candidate of candidates) {
      const result = await this.db.$queryRaw<Array<{ purged: boolean }>>`SELECT purge_expired_audit_event(${candidate.id}::uuid) AS purged`;
      if (result[0]?.purged) purged += 1;
    }
    return purged;
  }
}

import { randomUUID } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { Prisma, OutboxConsumer } from "./generated/prisma/client.js";
import { assertSafeDomainPayload } from "./domain-event-catalogue.js";

export async function recordProjectEvent(tx: Prisma.TransactionClient, input: {
  organizationId: string; actorId: string; eventName: string; subjectType: string; subjectId: string;
  reason: string; before?: Record<string, unknown>; after?: Record<string, unknown>;
}): Promise<string> {
  const occurredAt = new Date();
  const correlationId = randomUUID();
  const retentionExpiresAt = new Date(occurredAt);
  retentionExpiresAt.setUTCFullYear(retentionExpiresAt.getUTCFullYear() + 10);
  const actor = await tx.account.findUnique({ where: { id: input.actorId }, select: { normalizedEmail: true } });
  if (!actor) throw new Error("Project actor not found");
  const auditBefore = input.before;
  const auditAfter = input.after ?? {};
  try {
    if (auditBefore) assertSafeDomainPayload(input.eventName, auditBefore);
    assertSafeDomainPayload(input.eventName, auditAfter);
  } catch { throw new BadRequestException("Audit evidence is too large or contains an unsupported value"); }
  const audit = await tx.auditEvent.create({ data: {
    organizationId: input.organizationId, eventKey: input.eventName, schemaVersion: 1, occurredAt,
    actorId: input.actorId, actorSnapshot: { accountId: input.actorId, email: actor.normalizedEmail },
    subjectType: input.subjectType, subjectId: input.subjectId, reason: input.reason,
    ...(auditBefore ? { before: auditBefore as Prisma.InputJsonValue } : {}),
    after: auditAfter as Prisma.InputJsonValue, retentionExpiresAt, correlationId
  } });
  const payload = { auditEventId: audit.id, subjectId: input.subjectId };
  assertSafeDomainPayload(input.eventName, payload);
  const event = await tx.domainEvent.create({ data: {
    eventName: input.eventName, schemaVersion: 1, occurredAt, organizationId: input.organizationId,
    actorId: input.actorId, subjectType: input.subjectType, subjectId: input.subjectId, correlationId, payload
  } });
  await tx.outboxDelivery.create({ data: { eventId: event.id, consumer: OutboxConsumer.NTF } });
  return event.id;
}

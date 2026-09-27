import { randomUUID } from "node:crypto";
import { OrganizationEventType, OutboxConsumer, type Prisma } from "./generated/prisma/client.js";
import { assertSafeDomainPayload, isDomainEventName } from "./domain-event-catalogue.js";

const catalogue: Record<OrganizationEventType, { name: string; subjectType: string }> = {
  [OrganizationEventType.ORGANIZATION_CREATED]: { name: "organization.created", subjectType: "organization" },
  [OrganizationEventType.BRANCH_CREATED]: { name: "organization.branch.created", subjectType: "branch" },
  [OrganizationEventType.BRANCH_UPDATED]: { name: "organization.branch.updated", subjectType: "branch" },
  [OrganizationEventType.TEAM_CREATED]: { name: "organization.team.created", subjectType: "team" },
  [OrganizationEventType.TEAM_UPDATED]: { name: "organization.team.updated", subjectType: "team" },
  [OrganizationEventType.JOB_ROLE_CREATED]: { name: "organization.job_role.created", subjectType: "job_role" },
  [OrganizationEventType.JOB_ROLE_UPDATED]: { name: "organization.job_role.updated", subjectType: "job_role" },
  [OrganizationEventType.EMPLOYEE_CREATED]: { name: "organization.employee.created", subjectType: "employee" },
  [OrganizationEventType.EMPLOYEE_MEMBERSHIP_CHANGED]: { name: "organization.employee.membership_changed", subjectType: "employee" },
  [OrganizationEventType.EMPLOYEE_JOB_ROLES_CHANGED]: { name: "organization.employee.job_roles_changed", subjectType: "employee" },
  [OrganizationEventType.EMPLOYEE_SUSPENDED]: { name: "organization.employee.suspended", subjectType: "employee" },
  [OrganizationEventType.ROLE_PERMISSION_CHANGED]: { name: "authorization.role_permission.changed", subjectType: "role_permission" },
  [OrganizationEventType.EMPLOYEE_PERMISSION_CHANGED]: { name: "authorization.employee_permission.changed", subjectType: "employee_permission" },
};

type OrganizationMutation = Prisma.OrganizationEventUncheckedCreateInput;

function assertSafeAuditValue(value: unknown, path = "audit"): void {
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "number") return;
  if (typeof value === "string") {
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value)
      || /\bBearer\s+\S+/i.test(value)
      || /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/.test(value)
      || /(?:[A-Za-z]:\\|\\\\[^\\]+\\|\/(?:mnt|nas|srv|volume|shares?)\/)/i.test(value)) {
      throw new Error(`Sensitive value cannot be stored in ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeAuditValue(item, `${path}[${index}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (/(?:password|passkey|credential|session|csrf|token|recovery|secret|private.?key|nas.?path|file.?path|storage.?key)/i.test(key)) {
        throw new Error(`Sensitive field cannot be stored in ${path}`);
      }
      assertSafeAuditValue(nested, `${path}.${key}`);
    }
  }
}

/** Writes the legacy S03 record and its canonical audit/event/outbox representation atomically. */
export async function recordOrganizationMutation(tx: Prisma.TransactionClient, data: OrganizationMutation): Promise<void> {
  const mapping = catalogue[data.eventType];
  if (!isDomainEventName(mapping.name)) throw new Error("Organization event is absent from the versioned event catalogue");
  const legacy = await tx.organizationEvent.create({ data });
  const actor = await tx.account.findUnique({ where: { id: data.actorId }, select: { normalizedEmail: true } });
  if (!actor) throw new Error("Organization mutation actor was not found");
  const occurredAt = legacy.occurredAt;
  const correlationId = randomUUID();
  const retentionExpiresAt = new Date(occurredAt);
  retentionExpiresAt.setUTCFullYear(retentionExpiresAt.getUTCFullYear() + 10);
  const subjectId = data.subjectId ?? data.organizationId;
  const before = data.before;
  const after = data.after;
  assertSafeAuditValue(data.reason, "reason");
  assertSafeAuditValue(before, "before");
  assertSafeAuditValue(after, "after");
  const audit = await tx.auditEvent.create({ data: {
    organizationId: data.organizationId,
    eventKey: mapping.name,
    schemaVersion: 1,
    occurredAt,
    actorId: data.actorId,
    actorSnapshot: { accountId: data.actorId, email: actor.normalizedEmail },
    subjectType: mapping.subjectType,
    subjectId,
    ...(data.reason === undefined ? {} : { reason: data.reason }),
    ...(before === undefined ? {} : { before: before as Prisma.InputJsonValue }),
    ...(after === undefined ? {} : { after: after as Prisma.InputJsonValue }),
    retentionExpiresAt,
    correlationId,
    legacyOrganizationEventId: legacy.id,
  } });
  const payload = { auditEventId: audit.id, sourceOrganizationEventId: legacy.id };
  assertSafeDomainPayload(mapping.name, payload);
  const event = await tx.domainEvent.create({ data: {
    eventName: mapping.name,
    schemaVersion: 1,
    occurredAt,
    organizationId: data.organizationId,
    actorId: data.actorId,
    subjectType: mapping.subjectType,
    subjectId,
    correlationId,
    payload,
    legacyOrganizationEventId: legacy.id,
  } });
  await tx.outboxDelivery.create({ data: { eventId: event.id, consumer: OutboxConsumer.NTF } });
}

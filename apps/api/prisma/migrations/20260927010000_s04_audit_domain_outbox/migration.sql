CREATE TYPE "OutboxDeliveryState" AS ENUM ('PENDING', 'LEASED', 'DELIVERED', 'DEAD');
CREATE TYPE "OutboxConsumer" AS ENUM ('NTF');

CREATE TABLE "audit_events" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "eventKey" VARCHAR(160) NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" UUID NOT NULL,
  "actorSnapshot" JSONB NOT NULL,
  "sessionDeviceRequest" JSONB,
  "subjectType" VARCHAR(100) NOT NULL,
  "subjectId" VARCHAR(200) NOT NULL,
  "reason" VARCHAR(1000),
  "before" JSONB,
  "after" JSONB,
  "correctsEventId" UUID,
  "retentionExpiresAt" TIMESTAMPTZ(3) NOT NULL,
  "correlationId" UUID NOT NULL,
  "legacyOrganizationEventId" UUID,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "audit_events_legacyOrganizationEventId_key" ON "audit_events"("legacyOrganizationEventId");
CREATE INDEX "audit_events_organizationId_occurredAt_idx" ON "audit_events"("organizationId", "occurredAt");
CREATE INDEX "audit_events_actorId_occurredAt_idx" ON "audit_events"("actorId", "occurredAt");
CREATE INDEX "audit_events_subjectType_subjectId_occurredAt_idx" ON "audit_events"("subjectType", "subjectId", "occurredAt");
CREATE INDEX "audit_events_retentionExpiresAt_idx" ON "audit_events"("retentionExpiresAt");

CREATE TABLE "domain_events" (
  "id" UUID NOT NULL,
  "eventName" VARCHAR(160) NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "organizationId" UUID,
  "actorId" UUID,
  "subjectType" VARCHAR(100) NOT NULL,
  "subjectId" VARCHAR(200) NOT NULL,
  "correlationId" UUID NOT NULL,
  "payload" JSONB NOT NULL,
  "legacyOrganizationEventId" UUID,
  CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "domain_events_legacyOrganizationEventId_key" ON "domain_events"("legacyOrganizationEventId");
CREATE INDEX "domain_events_eventName_occurredAt_idx" ON "domain_events"("eventName", "occurredAt");
CREATE INDEX "domain_events_organizationId_occurredAt_idx" ON "domain_events"("organizationId", "occurredAt");
CREATE INDEX "domain_events_subjectType_subjectId_occurredAt_idx" ON "domain_events"("subjectType", "subjectId", "occurredAt");

CREATE TABLE "outbox_deliveries" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "consumer" "OutboxConsumer" NOT NULL,
  "state" "OutboxDeliveryState" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseExpiresAt" TIMESTAMPTZ(3),
  "leaseToken" UUID,
  "failureCode" VARCHAR(100),
  "deliveredAt" TIMESTAMPTZ(3),
  CONSTRAINT "outbox_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "outbox_deliveries_eventId_consumer_key" ON "outbox_deliveries"("eventId", "consumer");
CREATE INDEX "outbox_deliveries_state_availableAt_leaseExpiresAt_idx" ON "outbox_deliveries"("state", "availableAt", "leaseExpiresAt");

ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_correctsEventId_fkey" FOREIGN KEY ("correctsEventId") REFERENCES "audit_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_legacyOrganizationEventId_fkey" FOREIGN KEY ("legacyOrganizationEventId") REFERENCES "organization_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_legacyOrganizationEventId_fkey" FOREIGN KEY ("legacyOrganizationEventId") REFERENCES "organization_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outbox_deliveries" ADD CONSTRAINT "outbox_deliveries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "domain_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Copy legacy evidence exactly; source event IDs provide idempotent provenance. No outbox
-- rows are created here, so historical organization activity does not cause notifications.
INSERT INTO "audit_events" (
  "id", "organizationId", "eventKey", "schemaVersion", "occurredAt", "actorId", "actorSnapshot",
  "subjectType", "subjectId", "reason", "before", "after", "retentionExpiresAt", "correlationId", "legacyOrganizationEventId"
)
SELECT e."id", e."organizationId",
  CASE e."eventType"::text
    WHEN 'ORGANIZATION_CREATED' THEN 'organization.created'
    WHEN 'BRANCH_CREATED' THEN 'organization.branch.created'
    WHEN 'BRANCH_UPDATED' THEN 'organization.branch.updated'
    WHEN 'TEAM_CREATED' THEN 'organization.team.created'
    WHEN 'TEAM_UPDATED' THEN 'organization.team.updated'
    WHEN 'JOB_ROLE_CREATED' THEN 'organization.job_role.created'
    WHEN 'JOB_ROLE_UPDATED' THEN 'organization.job_role.updated'
    WHEN 'EMPLOYEE_CREATED' THEN 'organization.employee.created'
    WHEN 'EMPLOYEE_MEMBERSHIP_CHANGED' THEN 'organization.employee.membership_changed'
    WHEN 'EMPLOYEE_JOB_ROLES_CHANGED' THEN 'organization.employee.job_roles_changed'
    WHEN 'EMPLOYEE_SUSPENDED' THEN 'organization.employee.suspended'
    WHEN 'ROLE_PERMISSION_CHANGED' THEN 'authorization.role_permission.changed'
    WHEN 'EMPLOYEE_PERMISSION_CHANGED' THEN 'authorization.employee_permission.changed'
  END,
  1, e."occurredAt", e."actorId", jsonb_build_object('accountId', e."actorId", 'email', a."normalizedEmail"),
  CASE
    WHEN e."eventType"::text = 'EMPLOYEE_PERMISSION_CHANGED' THEN 'employee_permission'
    WHEN e."eventType"::text LIKE 'EMPLOYEE%' THEN 'employee'
    WHEN e."eventType"::text LIKE 'ROLE_PERMISSION%' THEN 'role_permission'
    WHEN e."eventType"::text LIKE 'JOB_ROLE%' THEN 'job_role'
    WHEN e."eventType"::text LIKE 'TEAM%' THEN 'team'
    WHEN e."eventType"::text LIKE 'BRANCH%' THEN 'branch'
    WHEN e."eventType"::text LIKE 'ORGANIZATION%' THEN 'organization'
    ELSE 'permission'
  END,
  COALESCE(e."subjectId"::text, e."organizationId"::text), e."reason", e."before", e."after",
  e."occurredAt" + INTERVAL '10 years', e."id", e."id"
FROM "organization_events" e
JOIN "accounts" a ON a."id" = e."actorId";

INSERT INTO "domain_events" (
  "id", "eventName", "schemaVersion", "occurredAt", "organizationId", "actorId", "subjectType", "subjectId",
  "correlationId", "payload", "legacyOrganizationEventId"
)
SELECT gen_random_uuid(), a."eventKey", 1, e."occurredAt", e."organizationId", e."actorId", a."subjectType",
  a."subjectId", e."id", jsonb_build_object('sourceOrganizationEventId', e."id"), e."id"
FROM "organization_events" e
JOIN "audit_events" a ON a."legacyOrganizationEventId" = e."id";

CREATE FUNCTION "reject_audit_event_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit events are append-only'; END;
$$;
CREATE TRIGGER "audit_events_append_only" BEFORE UPDATE OR DELETE ON "audit_events" FOR EACH ROW EXECUTE FUNCTION "reject_audit_event_mutation"();

CREATE FUNCTION "reject_domain_event_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'domain events are append-only'; END;
$$;
CREATE TRIGGER "domain_events_append_only" BEFORE UPDATE OR DELETE ON "domain_events" FOR EACH ROW EXECUTE FUNCTION "reject_domain_event_mutation"();

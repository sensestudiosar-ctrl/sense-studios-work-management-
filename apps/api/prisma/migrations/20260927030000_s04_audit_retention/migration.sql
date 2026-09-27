-- Database roles separate ordinary API DML from audit table ownership and guarded purge.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sense_app_runtime') THEN
    EXECUTE 'CREATE ROLE sense_app_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS';
  ELSIF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'sense_app_runtime'
      AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR NOT rolcanlogin)
  ) THEN
    RAISE EXCEPTION 'sense_app_runtime role exists with unsafe attributes';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sense_audit_data_owner') THEN
    EXECUTE 'CREATE ROLE sense_audit_data_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS';
  ELSIF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'sense_audit_data_owner'
      AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR rolcanlogin)
  ) THEN
    RAISE EXCEPTION 'sense_audit_data_owner role exists with unsafe attributes';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sense_retention_executor') THEN
    EXECUTE 'CREATE ROLE sense_retention_executor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS';
  ELSIF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'sense_retention_executor'
      AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR rolcanlogin)
  ) THEN
    RAISE EXCEPTION 'sense_retention_executor role exists with unsafe attributes';
  END IF;
END;
$$;

CREATE TYPE "AuditRetentionBackupDisposition" AS ENUM ('CLEARED', 'NOT_APPLICABLE');

CREATE TABLE "audit_retention_configuration" (
  "singletonKey" SMALLINT NOT NULL DEFAULT 1,
  "noticeIntervalDays" SMALLINT,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedById" UUID,
  CONSTRAINT "audit_retention_configuration_pkey" PRIMARY KEY ("singletonKey"),
  CONSTRAINT "audit_retention_configuration_singleton_check" CHECK ("singletonKey" = 1),
  CONSTRAINT "audit_retention_configuration_interval_check" CHECK ("noticeIntervalDays" IS NULL OR "noticeIntervalDays" BETWEEN 1 AND 3650)
);
INSERT INTO "audit_retention_configuration" ("singletonKey", "noticeIntervalDays") VALUES (1, NULL);
ALTER TABLE "audit_retention_configuration" ADD CONSTRAINT "audit_retention_configuration_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "audit_retention_notices" (
  "id" UUID NOT NULL,
  "auditEventId" UUID NOT NULL,
  "noticeAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMPTZ(3),
  "acknowledgedById" UUID,
  "backupDisposition" "AuditRetentionBackupDisposition",
  "backupEvidenceRef" VARCHAR(200),
  "backupClearedAt" TIMESTAMPTZ(3),
  CONSTRAINT "audit_retention_notices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_retention_notices_ack_check" CHECK (("acknowledgedAt" IS NULL) = ("acknowledgedById" IS NULL)),
  CONSTRAINT "audit_retention_notices_backup_check" CHECK (("backupDisposition" IS NULL AND "backupClearedAt" IS NULL) OR ("backupDisposition" IS NOT NULL AND "backupClearedAt" IS NOT NULL)),
  CONSTRAINT "audit_retention_notices_backup_ref_check" CHECK ("backupEvidenceRef" IS NULL OR ("backupDisposition" = 'CLEARED' AND length("backupEvidenceRef") > 0))
);
CREATE UNIQUE INDEX "audit_retention_notices_auditEventId_key" ON "audit_retention_notices"("auditEventId");
CREATE INDEX "audit_retention_notices_noticeAt_acknowledgedAt_idx" ON "audit_retention_notices"("noticeAt", "acknowledgedAt");
ALTER TABLE "audit_retention_notices" ADD CONSTRAINT "audit_retention_notices_auditEventId_fkey" FOREIGN KEY ("auditEventId") REFERENCES "audit_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_retention_notices" ADD CONSTRAINT "audit_retention_notices_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "audit_retention_holds" (
  "id" UUID NOT NULL,
  "auditEventId" UUID NOT NULL,
  "heldById" UUID NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "heldAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMPTZ(3),
  "releasedById" UUID,
  "releaseReason" VARCHAR(1000),
  CONSTRAINT "audit_retention_holds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_retention_holds_release_check" CHECK (("releasedAt" IS NULL AND "releasedById" IS NULL AND "releaseReason" IS NULL) OR ("releasedAt" IS NOT NULL AND "releasedById" IS NOT NULL AND "releaseReason" IS NOT NULL))
);
CREATE INDEX "audit_retention_holds_auditEventId_releasedAt_idx" ON "audit_retention_holds"("auditEventId", "releasedAt");
CREATE UNIQUE INDEX "audit_retention_holds_one_active_per_event_idx" ON "audit_retention_holds"("auditEventId") WHERE "releasedAt" IS NULL;
ALTER TABLE "audit_retention_holds" ADD CONSTRAINT "audit_retention_holds_auditEventId_fkey" FOREIGN KEY ("auditEventId") REFERENCES "audit_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_retention_holds" ADD CONSTRAINT "audit_retention_holds_heldById_fkey" FOREIGN KEY ("heldById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_retention_holds" ADD CONSTRAINT "audit_retention_holds_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "audit_deletion_tombstones" (
  "id" UUID NOT NULL,
  "auditEventId" UUID NOT NULL,
  "eventKey" VARCHAR(160) NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL,
  "retentionExpiresAt" TIMESTAMPTZ(3) NOT NULL,
  "purgedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "noticeAcknowledgedAt" TIMESTAMPTZ(3) NOT NULL,
  "backupDisposition" "AuditRetentionBackupDisposition" NOT NULL,
  "backupClearedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "audit_deletion_tombstones_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "audit_deletion_tombstones_auditEventId_key" ON "audit_deletion_tombstones"("auditEventId");
CREATE INDEX "audit_deletion_tombstones_purgedAt_idx" ON "audit_deletion_tombstones"("purgedAt");

ALTER TABLE "audit_events" OWNER TO "sense_audit_data_owner";
ALTER TABLE "domain_events" OWNER TO "sense_audit_data_owner";
ALTER TABLE "organization_events" OWNER TO "sense_audit_data_owner";
ALTER TABLE "audit_retention_notices" OWNER TO "sense_audit_data_owner";
ALTER TABLE "audit_retention_holds" OWNER TO "sense_audit_data_owner";
ALTER TABLE "audit_deletion_tombstones" OWNER TO "sense_audit_data_owner";
ALTER TABLE "audit_retention_configuration" OWNER TO "sense_audit_data_owner";
ALTER FUNCTION "reject_audit_event_mutation"() OWNER TO "sense_audit_data_owner";
ALTER FUNCTION "reject_domain_event_mutation"() OWNER TO "sense_audit_data_owner";

CREATE OR REPLACE FUNCTION "reject_audit_event_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_user = 'sense_retention_executor' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'audit events are append-only';
END;
$$;
CREATE OR REPLACE FUNCTION "reject_domain_event_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_user = 'sense_retention_executor' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'domain events are append-only';
END;
$$;
CREATE OR REPLACE FUNCTION "reject_organization_event_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_user = 'sense_retention_executor' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'organization events are append-only';
END;
$$;
ALTER FUNCTION "reject_organization_event_mutation"() OWNER TO "sense_audit_data_owner";

CREATE FUNCTION "reject_retention_notice_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_user = 'sense_retention_executor' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE'
    AND OLD."id" = NEW."id"
    AND OLD."auditEventId" = NEW."auditEventId"
    AND OLD."noticeAt" = NEW."noticeAt"
    AND OLD."acknowledgedAt" IS NULL
    AND NEW."acknowledgedAt" IS NOT NULL
    AND NEW."acknowledgedById" IS NOT NULL
    AND OLD."backupDisposition" IS NULL
    AND NEW."backupDisposition" IS NOT NULL
    AND NEW."backupClearedAt" IS NOT NULL
    AND OLD."backupEvidenceRef" IS NULL
    THEN RETURN NEW;
  END IF;
  RAISE EXCEPTION 'retention notices allow one acknowledged backup-clearance update';
END;
$$;
ALTER FUNCTION "reject_retention_notice_mutation"() OWNER TO "sense_audit_data_owner";
CREATE TRIGGER "audit_retention_notices_guard" BEFORE UPDATE OR DELETE ON "audit_retention_notices" FOR EACH ROW EXECUTE FUNCTION "reject_retention_notice_mutation"();

CREATE FUNCTION "reject_retention_hold_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_user = 'sense_retention_executor' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE'
    AND OLD."id" = NEW."id"
    AND OLD."auditEventId" = NEW."auditEventId"
    AND OLD."heldById" = NEW."heldById"
    AND OLD."reason" = NEW."reason"
    AND OLD."heldAt" = NEW."heldAt"
    AND OLD."releasedAt" IS NULL
    AND NEW."releasedAt" IS NOT NULL
    AND NEW."releasedById" IS NOT NULL
    AND NEW."releaseReason" IS NOT NULL
    THEN RETURN NEW;
  END IF;
  RAISE EXCEPTION 'retention holds are immutable except for one release';
END;
$$;
ALTER FUNCTION "reject_retention_hold_mutation"() OWNER TO "sense_audit_data_owner";
CREATE TRIGGER "audit_retention_holds_guard" BEFORE UPDATE OR DELETE ON "audit_retention_holds" FOR EACH ROW EXECUTE FUNCTION "reject_retention_hold_mutation"();

CREATE FUNCTION "reject_retention_tombstone_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'retention tombstones are append-only'; END;
$$;
ALTER FUNCTION "reject_retention_tombstone_mutation"() OWNER TO "sense_audit_data_owner";
CREATE TRIGGER "audit_deletion_tombstones_append_only" BEFORE UPDATE OR DELETE ON "audit_deletion_tombstones" FOR EACH ROW EXECUTE FUNCTION "reject_retention_tombstone_mutation"();

CREATE FUNCTION "purge_expired_audit_event"(target_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  target public.audit_events%ROWTYPE;
  notice public.audit_retention_notices%ROWTYPE;
BEGIN
  SELECT * INTO target FROM public.audit_events WHERE id = target_id FOR UPDATE;
  IF NOT FOUND OR target."retentionExpiresAt" > statement_timestamp() THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.audit_retention_configuration WHERE "singletonKey" = 1 AND "noticeIntervalDays" IS NOT NULL) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.audit_retention_holds WHERE "auditEventId" = target_id AND "releasedAt" IS NULL) THEN RETURN false; END IF;
  IF target."correctsEventId" IS NOT NULL OR EXISTS (SELECT 1 FROM public.audit_events WHERE "correctsEventId" = target_id OR (id <> target_id AND "correlationId" = target."correlationId")) THEN RETURN false; END IF;
  SELECT * INTO notice FROM public.audit_retention_notices WHERE "auditEventId" = target_id FOR UPDATE;
  IF NOT FOUND OR notice."acknowledgedAt" IS NULL OR notice."backupDisposition" IS NULL OR notice."backupClearedAt" IS NULL THEN RETURN false; END IF;
  IF notice."noticeAt" >= target."retentionExpiresAt" OR notice."acknowledgedAt" >= target."retentionExpiresAt" OR notice."backupClearedAt" >= target."retentionExpiresAt" THEN RETURN false; END IF;
  IF EXISTS (
    SELECT 1 FROM public.domain_events d
    JOIN public.outbox_deliveries o ON o."eventId" = d.id
    WHERE d."correlationId" = target."correlationId" AND o.state <> 'DELIVERED'
    FOR UPDATE OF o
  ) THEN RETURN false; END IF;
  IF EXISTS (
    SELECT 1 FROM public.domain_events d
    JOIN public.notifications n ON n."eventId" = d.id
    WHERE d."correlationId" = target."correlationId" AND n."deliveryState" <> 'DELIVERED'
    FOR UPDATE OF n
  ) THEN RETURN false; END IF;

  INSERT INTO public.audit_deletion_tombstones (
    id, "auditEventId", "eventKey", "occurredAt", "retentionExpiresAt", "noticeAcknowledgedAt", "backupDisposition", "backupClearedAt"
  ) VALUES (
    gen_random_uuid(), target.id, target."eventKey", target."occurredAt", target."retentionExpiresAt", notice."acknowledgedAt", notice."backupDisposition", notice."backupClearedAt"
  );

  DELETE FROM public.notifications n USING public.domain_events d
    WHERE n."eventId" = d.id AND d."correlationId" = target."correlationId";
  DELETE FROM public.outbox_deliveries o USING public.domain_events d
    WHERE o."eventId" = d.id AND d."correlationId" = target."correlationId";
  DELETE FROM public.domain_events WHERE "correlationId" = target."correlationId";
  DELETE FROM public.audit_retention_notices WHERE "auditEventId" = target_id;
  DELETE FROM public.audit_retention_holds WHERE "auditEventId" = target_id;
  DELETE FROM public.audit_events WHERE id = target_id;
  IF target."legacyOrganizationEventId" IS NOT NULL THEN
    DELETE FROM public.organization_events WHERE id = target."legacyOrganizationEventId";
  END IF;
  RETURN true;
END;
$$;
ALTER FUNCTION "purge_expired_audit_event"(UUID) OWNER TO "sense_retention_executor";

GRANT USAGE ON SCHEMA public TO sense_app_runtime, sense_audit_data_owner, sense_retention_executor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sense_app_runtime;
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER ON "audit_events", "domain_events", "organization_events", "audit_deletion_tombstones" FROM sense_app_runtime;
GRANT SELECT, INSERT ON "audit_events", "domain_events", "organization_events" TO sense_app_runtime;
REVOKE INSERT ON "audit_deletion_tombstones" FROM sense_app_runtime;
GRANT SELECT ON "audit_deletion_tombstones" TO sense_app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON "audit_retention_configuration", "audit_retention_notices", "audit_retention_holds" TO sense_app_runtime;

GRANT SELECT, UPDATE, DELETE ON "audit_events", "domain_events", "organization_events", "outbox_deliveries", "notifications", "audit_retention_notices", "audit_retention_holds" TO sense_retention_executor;
GRANT INSERT ON "audit_deletion_tombstones" TO sense_retention_executor;
GRANT SELECT ON "audit_retention_configuration" TO sense_retention_executor;
REVOKE ALL ON FUNCTION "purge_expired_audit_event"(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "purge_expired_audit_event"(UUID) TO sense_app_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sense_app_runtime;

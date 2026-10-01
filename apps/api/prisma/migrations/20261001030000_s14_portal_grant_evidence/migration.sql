CREATE TABLE "client_portal_grant_changes" (
 "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "projectId" UUID NOT NULL,
 "grantId" UUID NOT NULL, "grantVersion" INTEGER NOT NULL, "actorId" UUID NOT NULL,
 "reason" VARCHAR(1000) NOT NULL, "auditEventId" UUID NOT NULL UNIQUE,
 "before" JSONB NOT NULL, "after" JSONB NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "client_portal_change_grant_fk" FOREIGN KEY ("grantId","organizationId","projectId") REFERENCES "client_portal_grants"("id","organizationId","projectId") ON DELETE RESTRICT,
 CONSTRAINT "client_portal_change_actor_fk" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT,
 CONSTRAINT "client_portal_change_audit_fk" FOREIGN KEY ("auditEventId") REFERENCES "audit_events"("id") ON DELETE RESTRICT,
 CONSTRAINT "client_portal_change_shape" CHECK ("grantVersion">0 AND length(btrim("reason")) BETWEEN 3 AND 1000 AND jsonb_typeof("before")='object' AND jsonb_typeof("after")='object')
);
CREATE UNIQUE INDEX "client_portal_grant_changes_grantId_grantVersion_key" ON "client_portal_grant_changes"("grantId","grantVersion");
CREATE TRIGGER "s14_client_grant_history_immutable" BEFORE UPDATE OR DELETE ON "client_portal_grant_changes" FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();
CREATE TRIGGER "s14_client_grant_no_delete" BEFORE DELETE ON "client_portal_grants" FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();

-- Extend the existing approved event constraint without replacing its prior catalogue.
DO $$
DECLARE old_definition TEXT;
BEGIN
 SELECT pg_get_constraintdef(oid) INTO old_definition FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF old_definition IS NULL THEN RAISE EXCEPTION 'Existing domain event catalogue constraint missing'; END IF;
 ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE 'ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" ' || replace(old_definition, 'CHECK (', 'CHECK ("eventName" IN (''client.access_changed'') OR ');
END $$;

CREATE FUNCTION "check_s14_grant_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE history_row "client_portal_grant_changes"; actor_kind TEXT;
BEGIN
 SELECT * INTO history_row FROM "client_portal_grant_changes" WHERE "grantId"=NEW."id" AND "grantVersion"=NEW."version";
 IF history_row."id" IS NULL THEN RAISE EXCEPTION 'Client access requires immutable change evidence'; END IF;
 SELECT "kind"::text INTO actor_kind FROM "accounts" WHERE "id"=history_row."actorId" AND "state"='ACTIVE';
 IF TG_OP='INSERT' AND history_row."actorId"<>NEW."invitedById" THEN RAISE EXCEPTION 'Client invitation actor mismatch'; END IF;
 IF actor_kind IS DISTINCT FROM 'OWNER' THEN
  IF NEW."primary" OR TG_OP='UPDATE' AND OLD."primary" OR NOT EXISTS(SELECT 1 FROM "client_portal_grants" g WHERE g."projectId"=NEW."projectId" AND g."accountId"=history_row."actorId" AND g."primary" AND g."revokedAt" IS NULL AND (g."expiresAt" IS NULL OR g."expiresAt">CURRENT_TIMESTAMP)) THEN RAISE EXCEPTION 'Only Owner or current Primary Client may change client access'; END IF;
  IF EXISTS(SELECT 1 FROM "projects" WHERE "id"=NEW."projectId" AND "status" IN ('CANCELLED','COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Only Owner may change closed-project client access'; END IF;
 END IF;
 IF history_row."after" IS DISTINCT FROM jsonb_build_object('primary',NEW."primary",'expiresAt',to_char(NEW."expiresAt" AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'revokedAt',to_char(NEW."revokedAt" AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) THEN RAISE EXCEPTION 'Client access change snapshot mismatch'; END IF;
 IF TG_OP='INSERT' AND history_row."before"<>'{}'::jsonb OR TG_OP='UPDATE' AND history_row."before" IS DISTINCT FROM jsonb_build_object('primary',OLD."primary",'expiresAt',to_char(OLD."expiresAt" AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'revokedAt',to_char(OLD."revokedAt" AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) THEN RAISE EXCEPTION 'Client access prior snapshot mismatch'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM "audit_events" a JOIN "domain_events" e ON e."payload"->>'auditEventId'=a."id"::text
  JOIN "outbox_deliveries" o ON o."eventId"=e."id"
  WHERE a."id"=history_row."auditEventId" AND a."organizationId"=NEW."organizationId"
   AND a."actorId"=history_row."actorId" AND a."reason"=history_row."reason"
   AND a."eventKey"='client.access_changed' AND e."eventName"=a."eventKey"
   AND e."organizationId"=a."organizationId" AND e."actorId"=a."actorId"
   AND a."subjectId"=NEW."id"::text AND a."after"->>'projectId'=NEW."projectId"::text
   AND a."after"->>'accountId'=NEW."accountId"::text AND a."after"->>'version'=NEW."version"::text
   AND a."after"->'access'=history_row."after" AND a."before"->'access'=history_row."before"
 ) THEN RAISE EXCEPTION 'Client access requires canonical audit/event/outbox evidence'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "s14_client_grant_evidence" AFTER INSERT OR UPDATE ON "client_portal_grants" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_grant_evidence"();

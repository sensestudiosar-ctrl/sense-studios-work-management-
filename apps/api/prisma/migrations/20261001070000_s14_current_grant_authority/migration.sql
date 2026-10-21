-- Use the current clock and retain active actor row locks through client grant mutations.
CREATE OR REPLACE FUNCTION "check_s14_portal_grant_scope"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE project_state TEXT; inviter_kind TEXT;
BEGIN
 SELECT "status"::text INTO project_state FROM "projects" WHERE "id"=NEW."projectId" FOR SHARE;
 IF TG_OP='INSERT' AND project_state IN ('CANCELLED','COMPLETED','ARCHIVED') THEN RAISE EXCEPTION 'Closed project cannot invite client users'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "accounts" WHERE "id"=NEW."accountId" AND "kind"='CLIENT') THEN RAISE EXCEPTION 'Client grant requires client identity'; END IF;
 SELECT "kind"::text INTO inviter_kind FROM "accounts" WHERE "id"=NEW."invitedById" AND "state"='ACTIVE' FOR SHARE;
 IF TG_OP='INSERT' THEN
  IF inviter_kind IS NULL THEN RAISE EXCEPTION 'Client invitation requires an active actor'; END IF;
  IF NEW."primary" AND inviter_kind IS DISTINCT FROM 'OWNER' THEN RAISE EXCEPTION 'Only Owner appoints Primary Client'; END IF;
  IF NOT NEW."primary" AND inviter_kind IS DISTINCT FROM 'OWNER' AND NOT EXISTS(SELECT 1 FROM "client_portal_grants" g WHERE g."projectId"=NEW."projectId" AND g."accountId"=NEW."invitedById" AND g."primary" AND g."revokedAt" IS NULL AND (g."expiresAt" IS NULL OR g."expiresAt">clock_timestamp())) THEN RAISE EXCEPTION 'Only Primary Client or Owner invites additional users'; END IF;
 ELSE
  IF ROW(NEW."accountId",NEW."projectId",NEW."organizationId",NEW."invitedById",NEW."createdAt",NEW."reason") IS DISTINCT FROM ROW(OLD."accountId",OLD."projectId",OLD."organizationId",OLD."invitedById",OLD."createdAt",OLD."reason") THEN RAISE EXCEPTION 'Client grant identity is immutable'; END IF;
  IF NEW."version"<>OLD."version"+1 THEN RAISE EXCEPTION 'Client grant changes require next version'; END IF;
 END IF;
 IF project_state='CANCELLED' AND NEW."revokedAt" IS NULL AND NEW."expiresAt" IS NULL THEN RAISE EXCEPTION 'Cancelled project client access requires finite expiry'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION "check_s14_grant_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE history_row "client_portal_grant_changes"; actor_kind TEXT;
BEGIN
 SELECT * INTO history_row FROM "client_portal_grant_changes" WHERE "grantId"=NEW."id" AND "grantVersion"=NEW."version";
 IF history_row."id" IS NULL THEN RAISE EXCEPTION 'Client access requires immutable change evidence'; END IF;
 SELECT "kind"::text INTO actor_kind FROM "accounts" WHERE "id"=history_row."actorId" AND "state"='ACTIVE' FOR SHARE;
 IF TG_OP='INSERT' AND history_row."actorId"<>NEW."invitedById" THEN RAISE EXCEPTION 'Client invitation actor mismatch'; END IF;
 IF actor_kind IS NULL THEN RAISE EXCEPTION 'Client access changes require an active actor'; END IF;
 IF actor_kind IS DISTINCT FROM 'OWNER' THEN
  IF NEW."primary" OR TG_OP='UPDATE' AND OLD."primary" OR NOT EXISTS(SELECT 1 FROM "client_portal_grants" g WHERE g."projectId"=NEW."projectId" AND g."accountId"=history_row."actorId" AND g."primary" AND g."revokedAt" IS NULL AND (g."expiresAt" IS NULL OR g."expiresAt">clock_timestamp())) THEN RAISE EXCEPTION 'Only Owner or current Primary Client may change client access'; END IF;
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



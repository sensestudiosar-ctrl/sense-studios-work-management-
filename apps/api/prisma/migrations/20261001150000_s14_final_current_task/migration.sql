CREATE OR REPLACE FUNCTION "guard_s14_final_approval"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE closure_time TIMESTAMPTZ(3);
BEGIN
 IF TG_OP='UPDATE' THEN
  SELECT min("occurredAt") INTO closure_time FROM "project_status_changes" WHERE "projectId"=NEW."projectId" AND "toStatus" IN ('COMPLETED','CANCELLED');
  IF (to_jsonb(NEW)-ARRAY['closedAt','retainUntil']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['closedAt','retainUntil']) OR OLD."closedAt" IS NOT NULL OR closure_time IS NULL OR NEW."closedAt" IS DISTINCT FROM closure_time OR NEW."retainUntil" IS DISTINCT FROM closure_time+interval '10 years' THEN RAISE EXCEPTION 'Final client approval evidence is immutable except initial derived retention'; END IF;
  RETURN NEW;
 END IF;
 IF NOT "s14_primary_authority"(NEW."accountId",NEW."projectId",false) THEN RAISE EXCEPTION 'Final overall approval requires current Primary Client'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "passkey_credentials" WHERE "id"=NEW."credentialId" AND "accountId"=NEW."accountId" AND "revokedAt" IS NULL) THEN RAISE EXCEPTION 'Final approval requires the Primary Client active passkey'; END IF;
 -- Retain the current task tuple through the final batch write, including waits
 -- during WebAuthn verification and concurrent task ownership recovery.
 PERFORM t."id" FROM "tasks" t JOIN "client_review_items" i ON i."taskId"=t."id" WHERE i."packageId"=NEW."packageId" ORDER BY t."id" FOR SHARE OF t;
 IF EXISTS(SELECT 1 FROM "client_review_items" i JOIN "tasks" t ON t."id"=i."taskId" WHERE i."packageId"=NEW."packageId" AND (
  t."status"<>'CLIENT_APPROVED' OR t."requiresReassignment" OR
  i."snapshot"->>'taskId' IS DISTINCT FROM t."id"::text OR
  i."snapshot"->>'title' IS DISTINCT FROM t."title" OR
  i."snapshot"->>'description' IS DISTINCT FROM t."description" OR
  i."snapshot"->>'ownerEmployeeId' IS DISTINCT FROM t."primaryOwnerEmployeeId"::text OR
  i."snapshot"->>'reviewRequirement' IS DISTINCT FROM t."reviewRequirement"::text OR
  i."snapshot"->>'targetDate' IS DISTINCT FROM t."targetDate"::text OR
  i."snapshot"->>'startDate' IS DISTINCT FROM t."startDate"::text OR
  i."snapshot"->>'planItemId' IS DISTINCT FROM t."planItemId"::text OR
  i."snapshot"->'estimatedHours' IS DISTINCT FROM coalesce(to_jsonb(t."estimatedHours"),'null'::jsonb) OR
  i."snapshot"->'tags' IS DISTINCT FROM to_jsonb(t."tags") OR
  i."snapshot"->'checklist' IS DISTINCT FROM t."checklist"
 )) THEN RAISE EXCEPTION 'Final approval requires current exact approved task content'; END IF;
 PERFORM 1 FROM "client_review_packages" WHERE "id"=NEW."packageId" AND "status"='OPEN' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Final approval requires open exact package'; END IF;
 PERFORM 1 FROM "client_review_items" WHERE "packageId"=NEW."packageId" ORDER BY "id" FOR UPDATE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM "client_review_items" i LEFT JOIN "client_item_decisions" d ON d."itemId"=i."id" WHERE i."packageId"=NEW."packageId" AND (i."status"<>'APPROVED' OR d."id" IS NULL OR d."kind"<>'APPROVED')) THEN RAISE EXCEPTION 'Final approval requires every exact item approved'; END IF;
 IF EXISTS(SELECT 1 FROM "client_review_items" i JOIN "document_revisions" r ON r."id"=i."revisionId" WHERE i."packageId"=NEW."packageId" AND (NOT r."isCurrent" OR r."state" NOT IN ('APPROVED','ISSUED') OR r."sha256" IS DISTINCT FROM i."snapshot"->>'sha256' OR NOT EXISTS(SELECT 1 FROM "revision_approval_facts" f WHERE f."revisionId"=r."id" AND f."kind"='INTERNAL'))) THEN RAISE EXCEPTION 'Final approval cannot approve stale or internally unapproved exact revisions'; END IF;
 IF EXISTS(SELECT 1 FROM "client_review_items" i JOIN "document_revisions" r ON r."id"=i."revisionId" WHERE i."packageId"=NEW."packageId" AND r."series"='CR' AND NOT EXISTS(SELECT 1 FROM "client_review_classifications" c WHERE c."itemId"=i."id")) THEN RAISE EXCEPTION 'Every CR client revision requires audited cause classification before final approval'; END IF;
 IF NEW."itemSnapshot" IS DISTINCT FROM "s14_final_item_snapshot"(NEW."packageId") THEN RAISE EXCEPTION 'Final approval requires exact sorted item decision snapshot'; END IF;
 IF NEW."closedAt" IS NOT NULL OR NEW."retainUntil" IS NOT NULL THEN RAISE EXCEPTION 'Active project approval cannot predate project closure'; END IF;
 RETURN NEW;
END $$;


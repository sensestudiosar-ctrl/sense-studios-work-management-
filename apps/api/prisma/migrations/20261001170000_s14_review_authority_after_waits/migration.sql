CREATE OR REPLACE FUNCTION "s14_primary_authority"(actor_id UUID,project_id UUID,allow_owner BOOLEAN) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE account_row "accounts"%ROWTYPE; project_row "projects"%ROWTYPE; grant_row "client_portal_grants"%ROWTYPE;
BEGIN
 SELECT * INTO project_row FROM "projects" WHERE "id"=project_id FOR SHARE;
 SELECT * INTO account_row FROM "accounts" WHERE "id"=actor_id FOR SHARE;
 IF project_row."id" IS NULL OR project_row."status"<>'ACTIVE' OR account_row."state" IS DISTINCT FROM 'ACTIVE' THEN RETURN false; END IF;
 IF allow_owner AND account_row."kind"='OWNER' THEN RETURN true; END IF;
 IF account_row."kind"<>'CLIENT' THEN RETURN false; END IF;
 SELECT * INTO grant_row FROM "client_portal_grants" g WHERE g."projectId"=project_id AND g."accountId"=actor_id FOR SHARE;
 RETURN grant_row."id" IS NOT NULL AND grant_row."primary" AND grant_row."revokedAt" IS NULL AND (grant_row."expiresAt" IS NULL OR grant_row."expiresAt">clock_timestamp());
END $$;

CREATE OR REPLACE FUNCTION "s14_client_item_authority"(actor_id UUID,item_id UUID,capability TEXT) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE item_row "client_review_items"%ROWTYPE; grant_row "client_portal_grants"%ROWTYPE; item_grant "client_item_grants"%ROWTYPE;
BEGIN
 SELECT * INTO item_row FROM "client_review_items" WHERE "id"=item_id;
 PERFORM 1 FROM "projects" WHERE "id"=item_row."projectId" AND "status"='ACTIVE' FOR SHARE;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM "accounts" WHERE "id"=actor_id AND "kind"='CLIENT' AND "state"='ACTIVE' FOR SHARE;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT * INTO grant_row FROM "client_portal_grants" WHERE "projectId"=item_row."projectId" AND "organizationId"=item_row."organizationId" AND "accountId"=actor_id FOR SHARE;
 IF grant_row."id" IS NULL OR grant_row."revokedAt" IS NOT NULL OR grant_row."expiresAt"<=clock_timestamp() THEN RETURN false; END IF;
 IF grant_row."primary" THEN RETURN true; END IF;
 SELECT * INTO item_grant FROM "client_item_grants" WHERE "portalGrantId"=grant_row."id" AND "itemId"=item_id FOR SHARE;
 RETURN (grant_row."expiresAt" IS NULL OR grant_row."expiresAt">clock_timestamp()) AND coalesce(item_grant."view" AND CASE capability WHEN 'view' THEN true WHEN 'comment' THEN item_grant."comment" WHEN 'review' THEN item_grant."review" WHEN 'approve' THEN item_grant."approve" WHEN 'download' THEN item_grant."download" ELSE false END,false);
END $$;

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
 -- Currentness and immutable file tuple are held through the final fact batch.
 PERFORM d."id" FROM "drawing_records" d JOIN "document_revisions" r ON r."drawingId"=d."id" JOIN "client_review_items" i ON i."revisionId"=r."id" WHERE i."packageId"=NEW."packageId" ORDER BY d."id" FOR SHARE OF d;
 PERFORM r."id" FROM "document_revisions" r JOIN "client_review_items" i ON i."revisionId"=r."id" WHERE i."packageId"=NEW."packageId" ORDER BY r."id" FOR SHARE OF r;
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
 IF NOT "s14_primary_authority"(NEW."accountId",NEW."projectId",false) THEN RAISE EXCEPTION 'Final approval requires current Primary Client after tuple waits'; END IF;
 PERFORM 1 FROM "passkey_credentials" WHERE "id"=NEW."credentialId" AND "accountId"=NEW."accountId" AND "revokedAt" IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Final approval requires the Primary Client active passkey'; END IF;
 RETURN NEW;
END $$;



CREATE FUNCTION "s14_final_item_snapshot"(package_id UUID) RETURNS JSONB LANGUAGE sql STABLE AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('itemId',i."id",'itemVersion',i."version",'decisionId',d."id",'taskId',i."taskId",'revisionId',i."revisionId",'drawingId',i."snapshot"->'drawingId','fileId',i."snapshot"->'fileId','blobId',i."snapshot"->'blobId','sha256',i."snapshot"->'sha256') ORDER BY i."id"),'[]'::jsonb)
 FROM "client_review_items" i LEFT JOIN "client_item_decisions" d ON d."itemId"=i."id" WHERE i."packageId"=package_id
$$;

CREATE FUNCTION "guard_s14_final_approval"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE closure_time TIMESTAMPTZ(3);
BEGIN
 IF TG_OP='UPDATE' THEN
  SELECT min("occurredAt") INTO closure_time FROM "project_status_changes" WHERE "projectId"=NEW."projectId" AND "toStatus" IN ('COMPLETED','CANCELLED');
  IF (to_jsonb(NEW)-ARRAY['closedAt','retainUntil']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['closedAt','retainUntil']) OR OLD."closedAt" IS NOT NULL OR closure_time IS NULL OR NEW."closedAt" IS DISTINCT FROM closure_time OR NEW."retainUntil" IS DISTINCT FROM closure_time+interval '10 years' THEN RAISE EXCEPTION 'Final client approval evidence is immutable except initial derived retention'; END IF;
  RETURN NEW;
 END IF;
 IF NOT "s14_primary_authority"(NEW."accountId",NEW."projectId",false) THEN RAISE EXCEPTION 'Final overall approval requires current Primary Client'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "passkey_credentials" WHERE "id"=NEW."credentialId" AND "accountId"=NEW."accountId" AND "revokedAt" IS NULL) THEN RAISE EXCEPTION 'Final approval requires the Primary Client active passkey'; END IF;
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
CREATE TRIGGER "s14_final_primary_guard" BEFORE INSERT OR UPDATE ON "client_final_approvals" FOR EACH ROW EXECUTE FUNCTION "guard_s14_final_approval"();

CREATE FUNCTION "check_s14_final_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE audit_row "audit_events"%ROWTYPE;
BEGIN
 SELECT * INTO audit_row FROM "audit_events" WHERE "id"=NEW."auditEventId";
 IF NOT "s14_canonical_audit"(NEW."auditEventId",NEW."organizationId",NEW."projectId",NEW."accountId",'client.final_approved',NEW."id") OR audit_row."after"->>'finalApprovalId' IS DISTINCT FROM NEW."id"::text OR audit_row."after"->>'packageId' IS DISTINCT FROM NEW."packageId"::text OR audit_row."after"->'itemSnapshot' IS DISTINCT FROM NEW."itemSnapshot" OR audit_row."after"->>'signatureName' IS DISTINCT FROM NEW."signatureName" OR audit_row."after"->'consent' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Final approval requires immutable exact signature batch evidence'; END IF;
 IF EXISTS(SELECT 1 FROM "client_review_items" i WHERE i."packageId"=NEW."packageId" AND i."revisionId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "revision_approval_facts" f JOIN "audit_events" a ON a."id"=f."auditEventId" WHERE f."revisionId"=i."revisionId" AND f."kind"='CLIENT' AND a."actorId"=NEW."accountId" AND a."after"->>'finalApprovalId'=NEW."id"::text AND "s12_exact_evidence"(a."id",i."revisionId",'client.approved'))) THEN RAISE EXCEPTION 'Final batch must produce exact client approval facts'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "s14_final_canonical_evidence" AFTER INSERT ON "client_final_approvals" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_final_evidence"();

-- Existing historical facts are preserved. Every newly written CLIENT fact now
-- additionally requires the immutable Primary final batch that contains its item.
CREATE FUNCTION "check_s14_client_fact_final"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."kind"='CLIENT' AND NOT EXISTS(
  SELECT 1 FROM "audit_events" a JOIN "client_final_approvals" f ON f."id"::text=a."after"->>'finalApprovalId'
  JOIN "client_review_items" i ON i."packageId"=f."packageId" AND i."revisionId"=NEW."revisionId"
  JOIN "client_item_decisions" d ON d."itemId"=i."id" AND d."kind"='APPROVED'
  WHERE a."id"=NEW."auditEventId" AND a."organizationId"=f."organizationId" AND a."actorId"=f."accountId"
   AND f."projectId"=NEW."projectId" AND f."organizationId"=NEW."organizationId"
   AND f."itemSnapshot" @> jsonb_build_array(jsonb_build_object('itemId',i."id",'decisionId',d."id",'revisionId',NEW."revisionId"))
 ) THEN RAISE EXCEPTION 'Client revision fact requires Primary final overall batch'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "s14_client_fact_final" AFTER INSERT ON "revision_approval_facts" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_client_fact_final"();

CREATE FUNCTION "anchor_s14_final_retention"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE closure_time TIMESTAMPTZ(3);
BEGIN
 IF NEW."toStatus" NOT IN ('COMPLETED','CANCELLED') THEN RETURN NULL; END IF;
 SELECT min("occurredAt") INTO closure_time FROM "project_status_changes" WHERE "projectId"=NEW."projectId" AND "toStatus" IN ('COMPLETED','CANCELLED');
 UPDATE "client_final_approvals" SET "closedAt"=closure_time,"retainUntil"=closure_time+interval '10 years' WHERE "projectId"=NEW."projectId" AND "closedAt" IS NULL;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "s14_project_final_retention" AFTER INSERT ON "project_status_changes" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "anchor_s14_final_retention"();

CREATE FUNCTION "check_s14_cancel_pending_reviews"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."status"='CANCELLED' AND OLD."status"<>'CANCELLED' AND (
  EXISTS(SELECT 1 FROM "client_review_packages" WHERE "projectId"=NEW."id" AND "status"='OPEN') OR
  EXISTS(SELECT 1 FROM "client_review_items" WHERE "projectId"=NEW."id" AND "status" IN ('PENDING','IN_REVIEW'))
 ) THEN RAISE EXCEPTION 'Cancellation must atomically withdraw pending client reviews'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "s14_cancellation_review_withdrawal" AFTER UPDATE ON "projects" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_cancel_pending_reviews"();


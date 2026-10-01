ALTER TABLE "review_submissions" ADD COLUMN "taskSnapshot" JSONB NOT NULL;
ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submission_snapshot_shape" CHECK (jsonb_typeof("taskSnapshot")='object' AND length("taskSnapshot"->>'title') BETWEEN 2 AND 160 AND "taskSnapshot"->>'ownerEmployeeId' IS NOT NULL);

CREATE FUNCTION "guard_s13_category"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Review categories cannot be deleted'; END IF;
 IF TG_OP='UPDATE' AND (ROW(NEW."id",NEW."organizationId",NEW."name",NEW."normalizedName",NEW."createdById",NEW."createdAt") IS DISTINCT FROM ROW(OLD."id",OLD."organizationId",OLD."name",OLD."normalizedName",OLD."createdById",OLD."createdAt") OR NEW."active"=OLD."active") THEN RAISE EXCEPTION 'Only reasoned category activation may change'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "review_category_guard" BEFORE UPDATE OR DELETE ON "review_categories" FOR EACH ROW EXECUTE FUNCTION "guard_s13_category"();

CREATE FUNCTION "guard_s13_assignment"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Review assignments cannot be deleted'; END IF;
 IF TG_OP='UPDATE' AND (ROW(NEW."id",NEW."organizationId",NEW."projectId",NEW."taskId") IS DISTINCT FROM ROW(OLD."id",OLD."organizationId",OLD."projectId",OLD."taskId") OR NEW."reviewerEmployeeId"=OLD."reviewerEmployeeId") THEN RAISE EXCEPTION 'Only changed reviewer assignment may update'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "review_assignment_guard" BEFORE UPDATE OR DELETE ON "review_assignments" FOR EACH ROW EXECUTE FUNCTION "guard_s13_assignment"();

CREATE FUNCTION "guard_s13_round"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Review rounds cannot be deleted'; END IF;
 IF ROW(NEW."id",NEW."organizationId",NEW."projectId",NEW."taskId",NEW."submissionId") IS DISTINCT FROM ROW(OLD."id",OLD."organizationId",OLD."projectId",OLD."taskId",OLD."submissionId") THEN RAISE EXCEPTION 'Review round identity is immutable'; END IF;
 IF OLD."status" IN ('APPROVED','CORRECTIONS_REQUIRED') AND NEW."status"<>OLD."status" THEN RAISE EXCEPTION 'Review decision is final'; END IF;
 IF OLD."decidedAt" IS NOT NULL AND ROW(NEW."decidedAt",NEW."decidedById",NEW."decisionComment",NEW."severity",NEW."categoryId",NEW."categoryName") IS DISTINCT FROM ROW(OLD."decidedAt",OLD."decidedById",OLD."decisionComment",OLD."severity",OLD."categoryId",OLD."categoryName") THEN RAISE EXCEPTION 'Review decision evidence is immutable'; END IF;
 IF OLD."correctionTaskId" IS NOT NULL AND NEW."correctionTaskId" IS DISTINCT FROM OLD."correctionTaskId" THEN RAISE EXCEPTION 'Correction task link is immutable'; END IF;
 IF NEW."status" IS DISTINCT FROM OLD."status" AND NOT (OLD."status"='SUBMITTED' AND NEW."status" IN ('IN_REVIEW','APPROVED','CORRECTIONS_REQUIRED') OR OLD."status"='IN_REVIEW' AND NEW."status" IN ('APPROVED','CORRECTIONS_REQUIRED')) THEN RAISE EXCEPTION 'Invalid internal review transition'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "review_round_guard" BEFORE UPDATE OR DELETE ON "review_rounds" FOR EACH ROW EXECUTE FUNCTION "guard_s13_round"();

CREATE FUNCTION "check_s13_category_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "review_category_changes" h JOIN "audit_events" a ON a."organizationId"=h."organizationId" AND a."eventKey"='review.category_changed' AND a."subjectId"=h."categoryId"::text AND a."actorId"=h."actorId" AND a."reason"=h."reason" WHERE h."categoryId"=NEW."id" AND h."action"=CASE WHEN TG_OP='INSERT' THEN 'CREATED' WHEN NEW."active" THEN 'ACTIVATED' ELSE 'DEACTIVATED' END AND a."after"->>'active'=NEW."active"::text AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Category mutation requires canonical reasoned history'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "review_category_evidence" AFTER INSERT OR UPDATE ON "review_categories" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s13_category_evidence"();

CREATE FUNCTION "check_s13_assignment_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "tasks" t JOIN "review_assignment_changes" h ON h."taskId"=NEW."taskId" AND h."newReviewerEmployeeId"=NEW."reviewerEmployeeId" JOIN "audit_events" a ON a."organizationId"=NEW."organizationId" AND a."eventKey"='review.assigned' AND a."subjectId"=NEW."taskId"::text AND a."actorId"=h."actorId" AND a."reason"=h."reason" WHERE t."id"=NEW."taskId" AND t."projectId"=NEW."projectId" AND t."organizationId"=NEW."organizationId" AND t."reviewRequirement" IN ('INTERNAL','BOTH') AND (TG_OP='INSERT' OR h."oldReviewerEmployeeId"=OLD."reviewerEmployeeId") AND a."after"->>'reviewerEmployeeId'=NEW."reviewerEmployeeId"::text AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Reviewer assignment requires scoped canonical history'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "review_assignment_evidence" AFTER INSERT OR UPDATE ON "review_assignments" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s13_assignment_evidence"();

CREATE FUNCTION "check_s13_submission_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "tasks" t JOIN "review_rounds" r ON r."submissionId"=NEW."id" JOIN "audit_events" a ON a."organizationId"=NEW."organizationId" AND a."eventKey"='review.requested' AND a."subjectId"=r."id"::text AND a."actorId"=NEW."submittedById" AND a."reason"=NEW."reason" WHERE t."id"=NEW."taskId" AND t."projectId"=NEW."projectId" AND t."organizationId"=NEW."organizationId" AND t."reviewRequirement" IN ('INTERNAL','BOTH') AND NEW."taskSnapshot"->>'ownerEmployeeId'=t."primaryOwnerEmployeeId"::text AND a."after"->>'submissionId'=NEW."id"::text AND a."after"->>'taskId'=NEW."taskId"::text AND a."after"->>'roundNumber'=NEW."roundNumber"::text AND (NEW."revisionId" IS NULL OR EXISTS(SELECT 1 FROM "document_revisions" d WHERE d."id"=NEW."revisionId" AND d."projectId"=NEW."projectId" AND d."organizationId"=NEW."organizationId" AND d."series"='R' AND a."after"->>'revisionId'=d."id"::text AND a."after"->>'sha256'=d."sha256")) AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Submission requires exact canonical review evidence'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "review_submission_evidence" AFTER INSERT ON "review_submissions" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s13_submission_evidence"();

CREATE FUNCTION "check_s13_round_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_key TEXT;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "review_submissions" s WHERE s."id"=NEW."submissionId" AND s."taskId"=NEW."taskId" AND s."projectId"=NEW."projectId" AND s."organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'Round must bind exact submission'; END IF;
 IF TG_OP='UPDATE' AND NEW."reviewerEmployeeId" IS DISTINCT FROM OLD."reviewerEmployeeId" AND NOT EXISTS(SELECT 1 FROM "review_assignment_changes" h JOIN "audit_events" a ON a."eventKey"='review.assigned' AND a."actorId"=h."actorId" AND a."subjectId"=NEW."taskId"::text AND a."reason"=h."reason" WHERE h."taskId"=NEW."taskId" AND h."oldReviewerEmployeeId"=OLD."reviewerEmployeeId" AND h."newReviewerEmployeeId"=NEW."reviewerEmployeeId" AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Reviewer reassignment requires immutable history'; END IF;
 IF TG_OP='UPDATE' AND NEW."status" IS DISTINCT FROM OLD."status" THEN
  event_key:=CASE NEW."status" WHEN 'IN_REVIEW' THEN 'review.started' WHEN 'APPROVED' THEN 'review.approved' ELSE 'review.correction_requested' END;
  IF NOT EXISTS(SELECT 1 FROM "audit_events" a WHERE a."organizationId"=NEW."organizationId" AND a."eventKey"=event_key AND a."subjectId"=NEW."id"::text AND a."after"->>'taskId'=NEW."taskId"::text AND (NEW."decidedById" IS NULL OR a."actorId"=NEW."decidedById") AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Review transition requires canonical decision evidence'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW."correctionTaskId" IS DISTINCT FROM OLD."correctionTaskId" AND NOT EXISTS(SELECT 1 FROM "tasks" t JOIN "audit_events" a ON a."eventKey"='review.correction_assigned' AND a."subjectId"=NEW."id"::text AND a."after"->>'correctionTaskId'=t."id"::text WHERE t."id"=NEW."correctionTaskId" AND t."projectId"=NEW."projectId" AND t."type"='CORRECTION' AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Correction task requires canonical link evidence'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "review_round_evidence" AFTER INSERT OR UPDATE ON "review_rounds" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s13_round_evidence"();

CREATE FUNCTION "check_s13_comment_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "review_rounds" r JOIN "audit_events" a ON a."organizationId"=NEW."organizationId" AND a."eventKey" IN ('review.requested','review.commented','review.approved','review.correction_requested') AND a."subjectId"=NEW."roundId"::text AND a."actorId"=NEW."authorId" WHERE r."id"=NEW."roundId" AND r."projectId"=NEW."projectId" AND r."organizationId"=NEW."organizationId" AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Review markup requires canonical round evidence'; END IF;
 IF NEW."markupFileId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "documents" d WHERE d."id"=NEW."markupFileId" AND d."organizationId"=NEW."organizationId" AND d."projectId"=NEW."projectId") THEN RAISE EXCEPTION 'Markup file must belong to review project'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "review_comment_evidence" AFTER INSERT ON "review_comments" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s13_comment_evidence"();

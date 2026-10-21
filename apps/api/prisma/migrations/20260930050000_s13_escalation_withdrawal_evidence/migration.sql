
ALTER TABLE "review_rounds" ADD COLUMN "withdrawnAt" TIMESTAMPTZ(3),
  ADD COLUMN "withdrawnById" UUID,
  ADD COLUMN "withdrawalReason" VARCHAR(1000);
ALTER TABLE "review_rounds" ADD CONSTRAINT "review_round_withdrawn_actor_fk"
  FOREIGN KEY ("withdrawnById") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "review_rounds" DROP CONSTRAINT "review_round_shape";
ALTER TABLE "review_rounds" ADD CONSTRAINT "review_round_shape" CHECK (
  (("status" IN ('APPROVED','CORRECTIONS_REQUIRED')) = ("decidedAt" IS NOT NULL AND "decidedById" IS NOT NULL AND "decisionComment" IS NOT NULL))
  AND (("status"='WITHDRAWN') = ("withdrawnAt" IS NOT NULL AND "withdrawnById" IS NOT NULL AND length(btrim("withdrawalReason")) BETWEEN 3 AND 1000))
  AND ("status"<>'CORRECTIONS_REQUIRED' OR ("severity" IS NOT NULL AND "categoryId" IS NOT NULL AND "categoryName" IS NOT NULL))
  AND ("status"='CORRECTIONS_REQUIRED' OR ("severity" IS NULL AND "categoryId" IS NULL AND "categoryName" IS NULL AND "correctionTaskId" IS NULL))
);

CREATE TABLE "review_escalations" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "projectId" UUID NOT NULL,
  "roundId" UUID NOT NULL, "actorId" UUID NOT NULL, "recipientAccountId" UUID NOT NULL,
  "reason" VARCHAR(1000) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_escalation_round_fk" FOREIGN KEY ("roundId","organizationId","projectId") REFERENCES "review_rounds"("id","organizationId","projectId") ON DELETE RESTRICT,
  CONSTRAINT "review_escalation_actor_fk" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT,
  CONSTRAINT "review_escalation_recipient_fk" FOREIGN KEY ("recipientAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT,
  CONSTRAINT "review_escalation_shape" CHECK (length(btrim("reason")) BETWEEN 3 AND 1000)
);
CREATE INDEX "review_escalations_organizationId_roundId_createdAt_idx" ON "review_escalations"("organizationId","roundId","createdAt");
CREATE TRIGGER "review_escalations_immutable" BEFORE UPDATE OR DELETE ON "review_escalations"
  FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();
REVOKE UPDATE, DELETE, TRUNCATE ON "review_escalations" FROM sense_app_runtime;

DO $$
DECLARE previous_definition TEXT;
BEGIN
 SELECT pg_get_constraintdef(oid) INTO previous_definition FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF previous_definition IS NULL OR left(previous_definition,6)<>'CHECK ' THEN RAISE EXCEPTION 'Expected event catalogue missing'; END IF;
 ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE 'ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" ' || left(previous_definition,length(previous_definition)-1) || ' OR "eventName" IN (''review.escalated'',''review.withdrawn''))';
END $$;

CREATE OR REPLACE FUNCTION "guard_s13_round"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Review rounds cannot be deleted'; END IF;
 IF ROW(NEW."id",NEW."organizationId",NEW."projectId",NEW."taskId",NEW."submissionId") IS DISTINCT FROM ROW(OLD."id",OLD."organizationId",OLD."projectId",OLD."taskId",OLD."submissionId") THEN RAISE EXCEPTION 'Review round identity is immutable'; END IF;
 IF OLD."status" IN ('APPROVED','CORRECTIONS_REQUIRED','WITHDRAWN') AND NEW."status"<>OLD."status" THEN RAISE EXCEPTION 'Review outcome is final'; END IF;
 IF OLD."decidedAt" IS NOT NULL AND ROW(NEW."decidedAt",NEW."decidedById",NEW."decisionComment",NEW."severity",NEW."categoryId",NEW."categoryName") IS DISTINCT FROM ROW(OLD."decidedAt",OLD."decidedById",OLD."decisionComment",OLD."severity",OLD."categoryId",OLD."categoryName") THEN RAISE EXCEPTION 'Review decision evidence is immutable'; END IF;
 IF OLD."withdrawnAt" IS NOT NULL AND ROW(NEW."withdrawnAt",NEW."withdrawnById",NEW."withdrawalReason") IS DISTINCT FROM ROW(OLD."withdrawnAt",OLD."withdrawnById",OLD."withdrawalReason") THEN RAISE EXCEPTION 'Review withdrawal evidence is immutable'; END IF;
 IF OLD."correctionTaskId" IS NOT NULL AND NEW."correctionTaskId" IS DISTINCT FROM OLD."correctionTaskId" THEN RAISE EXCEPTION 'Correction task link is immutable'; END IF;
 IF NEW."status" IS DISTINCT FROM OLD."status" AND NOT (OLD."status"='SUBMITTED' AND NEW."status" IN ('IN_REVIEW','APPROVED','CORRECTIONS_REQUIRED','WITHDRAWN') OR OLD."status"='IN_REVIEW' AND NEW."status" IN ('APPROVED','CORRECTIONS_REQUIRED','WITHDRAWN')) THEN RAISE EXCEPTION 'Invalid internal review transition'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION "check_s13_round_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_key TEXT;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "review_submissions" s WHERE s."id"=NEW."submissionId" AND s."taskId"=NEW."taskId" AND s."projectId"=NEW."projectId" AND s."organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'Round must bind exact submission'; END IF;
 IF TG_OP='UPDATE' AND NEW."reviewerEmployeeId" IS DISTINCT FROM OLD."reviewerEmployeeId" AND NOT EXISTS(SELECT 1 FROM "review_assignment_changes" h JOIN "audit_events" a ON a."eventKey"='review.assigned' AND a."actorId"=h."actorId" AND a."subjectId"=NEW."taskId"::text AND a."reason"=h."reason" WHERE h."taskId"=NEW."taskId" AND h."oldReviewerEmployeeId"=OLD."reviewerEmployeeId" AND h."newReviewerEmployeeId"=NEW."reviewerEmployeeId" AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Reviewer reassignment requires immutable history'; END IF;
 IF TG_OP='UPDATE' AND NEW."status" IS DISTINCT FROM OLD."status" THEN
  event_key:=CASE NEW."status" WHEN 'IN_REVIEW' THEN 'review.started' WHEN 'APPROVED' THEN 'review.approved' WHEN 'WITHDRAWN' THEN 'review.withdrawn' ELSE 'review.correction_requested' END;
  IF NOT EXISTS(SELECT 1 FROM "audit_events" a WHERE a."organizationId"=NEW."organizationId" AND a."eventKey"=event_key AND a."subjectId"=NEW."id"::text AND a."after"->>'taskId'=NEW."taskId"::text AND (NEW."decidedById" IS NULL OR a."actorId"=NEW."decidedById") AND (NEW."withdrawnById" IS NULL OR a."actorId"=NEW."withdrawnById" AND a."reason"=NEW."withdrawalReason") AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Review transition requires canonical decision evidence'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW."correctionTaskId" IS DISTINCT FROM OLD."correctionTaskId" AND NOT EXISTS(SELECT 1 FROM "tasks" t JOIN "audit_events" a ON a."eventKey"='review.correction_assigned' AND a."subjectId"=NEW."id"::text AND a."after"->>'correctionTaskId'=t."id"::text WHERE t."id"=NEW."correctionTaskId" AND t."projectId"=NEW."projectId" AND t."type"='CORRECTION' AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Correction task requires canonical link evidence'; END IF;
 RETURN NULL;
END $$;

CREATE FUNCTION "check_s13_escalation_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "audit_events" a JOIN "domain_events" d ON d."organizationId"=a."organizationId" AND d."payload"->>'auditEventId'=a."id"::text JOIN "notifications" n ON n."eventId"=d."id" AND n."recipientAccountId"=NEW."recipientAccountId" AND n."channel"='IN_APP' WHERE a."organizationId"=NEW."organizationId" AND a."eventKey"='review.escalated' AND a."subjectId"=NEW."roundId"::text AND a."actorId"=NEW."actorId" AND a."reason"=NEW."reason" AND a."after"->>'escalationId'=NEW."id"::text AND a."after"->>'recipientAccountId'=NEW."recipientAccountId"::text AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Review escalation requires exact canonical alert evidence'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "review_escalation_evidence" AFTER INSERT ON "review_escalations"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s13_escalation_evidence"();

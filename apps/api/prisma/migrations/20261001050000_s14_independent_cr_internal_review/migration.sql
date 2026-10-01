-- Owner-authorized S14: independent CR content must pass its own exact internal review.
-- Preserve every existing scope, reviewer, canonical audit and immutable-file guard.
CREATE OR REPLACE FUNCTION "check_s13_submission_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "tasks" t JOIN "review_rounds" r ON r."submissionId"=NEW."id" JOIN "audit_events" a ON a."organizationId"=NEW."organizationId" AND a."eventKey"='review.requested' AND a."subjectId"=r."id"::text AND a."actorId"=NEW."submittedById" AND a."reason"=NEW."reason" WHERE t."id"=NEW."taskId" AND t."projectId"=NEW."projectId" AND t."organizationId"=NEW."organizationId" AND t."reviewRequirement" IN ('INTERNAL','BOTH') AND NEW."taskSnapshot"->>'ownerEmployeeId'=t."primaryOwnerEmployeeId"::text AND a."after"->>'submissionId'=NEW."id"::text AND a."after"->>'taskId'=NEW."taskId"::text AND a."after"->>'roundNumber'=NEW."roundNumber"::text AND (NEW."revisionId" IS NULL OR EXISTS(SELECT 1 FROM "document_revisions" d WHERE d."id"=NEW."revisionId" AND d."projectId"=NEW."projectId" AND d."organizationId"=NEW."organizationId" AND d."series" IN ('R','CR') AND a."after"->>'revisionId'=d."id"::text AND a."after"->>'sha256'=d."sha256")) AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Submission requires exact canonical review evidence'; END IF;
 RETURN NULL;
END $$;

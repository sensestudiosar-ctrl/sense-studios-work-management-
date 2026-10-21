-- Client item/final approval remains a client decision; authorized internal
-- managers may complete a task only after retained Primary final evidence.
ALTER TABLE "client_references" DROP CONSTRAINT "s14_reference_shape";
ALTER TABLE "client_references" ADD CONSTRAINT "s14_reference_shape" CHECK (length(btrim("name")) BETWEEN 1 AND 240 AND "size">0 AND "size"<=20971520 AND "sha256"~'^[a-f0-9]{64}$' AND "mime" IN ('application/pdf','image/png','image/jpeg','image/gif','image/webp'));
-- Add exact S14 transitions while preserving all existing S09/S10/S13 evidence guards.
CREATE OR REPLACE FUNCTION "check_s09_task_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE status_event TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM "task_status_changes" h WHERE h."taskId" = NEW."id" AND h."organizationId" = NEW."organizationId" AND h."taskVersion" = 1 AND h."fromStatus" IS NULL AND h."toStatus" = 'NOT_STARTED' AND h."actorId" = NEW."createdById") THEN
      RAISE EXCEPTION 'Task creation requires initial status evidence';
    END IF;
    status_event := 'task.created';
  ELSE
    IF ROW(NEW."status",NEW."requiresReassignment",NEW."waitingPreviousStatus",NEW."waitingReason",NEW."waitingDelayCause",NEW."waitingResponsibleParty") IS DISTINCT FROM ROW(OLD."status",OLD."requiresReassignment",OLD."waitingPreviousStatus",OLD."waitingReason",OLD."waitingDelayCause",OLD."waitingResponsibleParty") THEN
      IF NOT EXISTS (SELECT 1 FROM "task_status_changes" h WHERE h."taskId" = NEW."id" AND h."organizationId" = NEW."organizationId" AND h."taskVersion" = NEW."version" AND h."fromStatus" = OLD."status" AND h."toStatus" = NEW."status") THEN
        RAISE EXCEPTION 'Task state requires immutable transition evidence';
      END IF;
      IF NOT (
        OLD."status" = 'NOT_STARTED' AND NEW."status" = 'IN_PROGRESS' AND NOT NEW."requiresReassignment" OR
        OLD."status" = 'IN_PROGRESS' AND NEW."status" = 'COMPLETED' AND NEW."reviewRequirement" = 'NONE' OR
        OLD."status" = 'IN_PROGRESS' AND NEW."status" = 'COMPLETED' AND NEW."reviewRequirement" = 'INTERNAL' AND EXISTS (
          SELECT 1 FROM "review_submissions" s JOIN "review_rounds" r ON r."submissionId"=s."id"
          JOIN "employees" e ON e."accountId"=s."submittedById"
          WHERE s."taskId"=NEW."id" AND s."roundNumber"=(SELECT max("roundNumber") FROM "review_submissions" WHERE "taskId"=NEW."id")
            AND r."status"='APPROVED' AND e."state"='EXITED' AND e."id"<>NEW."primaryOwnerEmployeeId"
            AND s."taskSnapshot"->>'title'=NEW."title"
            AND s."taskSnapshot"->>'description' IS NOT DISTINCT FROM NEW."description"
            AND s."taskSnapshot"->>'targetDate'=NEW."targetDate"::text
            AND s."taskSnapshot"->>'startDate' IS NOT DISTINCT FROM NEW."startDate"::text
            AND s."taskSnapshot"->>'planItemId' IS NOT DISTINCT FROM NEW."planItemId"::text
            AND s."taskSnapshot"->'estimatedHours' IS NOT DISTINCT FROM coalesce(to_jsonb(NEW."estimatedHours"),'null'::jsonb)
            AND s."taskSnapshot"->'tags'=to_jsonb(NEW."tags")
            AND s."taskSnapshot"->'checklist'=NEW."checklist"
        ) OR
        OLD."status" = 'IN_PROGRESS' AND NEW."status" = 'WAITING' AND NOT NEW."requiresReassignment" AND NEW."waitingPreviousStatus" = OLD."status" OR
        OLD."status" = 'WAITING' AND NOT OLD."requiresReassignment" AND NOT NEW."requiresReassignment" AND NEW."status" = OLD."waitingPreviousStatus" AND NEW."status" = 'IN_PROGRESS' OR
        NEW."status" = 'WAITING' AND NEW."requiresReassignment" AND NEW."waitingPreviousStatus" = OLD."status" AND EXISTS (SELECT 1 FROM "employees" e WHERE e."id" = NEW."primaryOwnerEmployeeId" AND e."state" = 'EXITED') OR
        OLD."status" = 'WAITING' AND OLD."requiresReassignment" AND NOT NEW."requiresReassignment" AND NEW."primaryOwnerEmployeeId" IS DISTINCT FROM OLD."primaryOwnerEmployeeId" AND NEW."status" = CASE WHEN OLD."waitingPreviousStatus" = 'NOT_STARTED' THEN 'NOT_STARTED'::"TaskStatus" ELSE 'IN_PROGRESS'::"TaskStatus" END OR
        (
          OLD."status" IN ('IN_PROGRESS','CORRECTIONS_REQUIRED') AND NEW."status"='SUBMITTED_INTERNAL_REVIEW'
          AND NEW."reviewRequirement" IN ('INTERNAL','BOTH') AND EXISTS (
            SELECT 1 FROM "review_submissions" s JOIN "review_rounds" r ON r."submissionId"=s."id"
            WHERE s."taskId"=NEW."id" AND s."taskVersion"=NEW."version" AND r."status" IN ('SUBMITTED','IN_REVIEW','APPROVED','CORRECTIONS_REQUIRED')
          )
        ) OR
        (
          OLD."status"='SUBMITTED_INTERNAL_REVIEW' AND NEW."status"='IN_INTERNAL_REVIEW'
          AND EXISTS (SELECT 1 FROM "review_rounds" r WHERE r."taskId"=NEW."id" AND r."status"='IN_REVIEW')
        ) OR
        (
          OLD."status" IN ('SUBMITTED_INTERNAL_REVIEW','IN_INTERNAL_REVIEW') AND NEW."status" IN ('INTERNAL_APPROVED','CORRECTIONS_REQUIRED')
          AND EXISTS (
            SELECT 1 FROM "review_submissions" s JOIN "review_rounds" r ON r."submissionId"=s."id"
            WHERE s."taskId"=NEW."id" AND r."status"=CASE WHEN NEW."status"='INTERNAL_APPROVED' THEN 'APPROVED'::"InternalReviewStatus" ELSE 'CORRECTIONS_REQUIRED'::"InternalReviewStatus" END
              AND s."roundNumber"=(SELECT max("roundNumber") FROM "review_submissions" WHERE "taskId"=NEW."id")
          )
        ) OR
        (
          OLD."status"='INTERNAL_APPROVED' AND NEW."status"='COMPLETED' AND NEW."reviewRequirement"='INTERNAL'
          AND EXISTS (SELECT 1 FROM "review_submissions" s JOIN "review_rounds" r ON r."submissionId"=s."id"
            WHERE s."taskId"=NEW."id" AND r."status"='APPROVED'
              AND s."roundNumber"=(SELECT max("roundNumber") FROM "review_submissions" WHERE "taskId"=NEW."id"))
        ) OR
        (
          (OLD."status"='INTERNAL_APPROVED' AND NEW."reviewRequirement"='BOTH' OR OLD."status"='IN_PROGRESS' AND NEW."reviewRequirement"='CLIENT')
          AND NEW."status"='SUBMITTED_CLIENT_REVIEW' AND EXISTS (
            SELECT 1 FROM "client_review_items" i JOIN "client_review_packages" p ON p."id"=i."packageId"
            WHERE i."taskId"=NEW."id" AND i."organizationId"=NEW."organizationId" AND i."projectId"=NEW."projectId"
              AND i."snapshot"->>'taskVersion'=NEW."version"::text AND p."status"='OPEN' AND i."status" IN ('PENDING','IN_REVIEW')
              AND (NEW."reviewRequirement"='CLIENT' OR EXISTS(SELECT 1 FROM "review_submissions" s JOIN "review_rounds" r ON r."submissionId"=s."id"
                WHERE s."taskId"=NEW."id" AND r."status"='APPROVED' AND s."revisionId" IS NOT DISTINCT FROM i."revisionId"
                  AND s."roundNumber"=(SELECT max("roundNumber") FROM "review_submissions" WHERE "taskId"=NEW."id")))
          )
        ) OR
        (
          OLD."status"='SUBMITTED_CLIENT_REVIEW' AND NEW."status"='IN_CLIENT_REVIEW'
          AND EXISTS(SELECT 1 FROM "client_review_items" i JOIN "client_review_packages" p ON p."id"=i."packageId"
            WHERE i."taskId"=NEW."id" AND p."status"='OPEN' AND i."status"='IN_REVIEW')
        ) OR
        (
          OLD."status" IN ('SUBMITTED_CLIENT_REVIEW','IN_CLIENT_REVIEW') AND NEW."status" IN ('CLIENT_APPROVED','CLIENT_REVISION_REQUIRED')
          AND EXISTS(SELECT 1 FROM "client_review_items" i JOIN "client_review_packages" p ON p."id"=i."packageId"
            JOIN "client_item_decisions" d ON d."itemId"=i."id" JOIN "task_status_changes" h ON h."taskId"=NEW."id" AND h."taskVersion"=NEW."version"
            WHERE i."taskId"=NEW."id" AND p."status"='OPEN' AND h."actorId"=d."accountId"
              AND (NEW."status"='CLIENT_APPROVED' AND d."kind"='APPROVED' AND i."status"='APPROVED' OR
                NEW."status"='CLIENT_REVISION_REQUIRED' AND d."kind" IN ('REVISION_REQUIRED','REJECTED') AND i."status" IN ('REVISION_REQUIRED','REJECTED')))
        ) OR
        (
          OLD."status"='CLIENT_APPROVED' AND NEW."status"='COMPLETED'
          AND EXISTS(SELECT 1 FROM "client_review_items" i JOIN "client_final_approvals" f ON f."packageId"=i."packageId"
            JOIN "task_status_changes" h ON h."taskId"=NEW."id" AND h."taskVersion"=NEW."version"
            WHERE i."taskId"=NEW."id" AND i."status"='APPROVED' AND (h."actorId"=f."accountId" OR "s14_internal_authority"(h."actorId",NEW."projectId",'client.review_manage',true))
              AND f."itemSnapshot" @> jsonb_build_array(jsonb_build_object('itemId',i."id",'taskId',NEW."id")))
        ) OR
        (
          OLD."status"='CLIENT_REVISION_REQUIRED' AND NEW."status"='IN_PROGRESS'
          AND EXISTS(SELECT 1 FROM "client_review_items" i JOIN "client_corrections" c ON c."itemId"=i."id"
            JOIN "tasks" correction ON correction."id"=c."correctionTaskId" AND correction."status"='COMPLETED'
            JOIN "audit_events" a ON a."after"->>'itemId'=i."id"::text AND a."after"->>'correctionTaskId'=c."correctionTaskId"::text
            JOIN "task_status_changes" h ON h."taskId"=NEW."id" AND h."taskVersion"=NEW."version" AND h."actorId"=a."actorId"
            WHERE i."taskId"=NEW."id" AND a."eventKey"='client.correction_resumed' AND a."after"->>'taskId'=NEW."id"::text
              AND a."after"->>'taskVersion'=NEW."version"::text AND "s11_canonical_delivery"(a."id")
              AND "s14_internal_authority"(a."actorId",NEW."projectId",'client.correction_assign',true))
        ) OR
        NEW."status" = 'STOPPED_DUE_TO_PROJECT_CANCELLATION'
      ) THEN RAISE EXCEPTION 'Invalid S09 task transition or unavailable review workflow'; END IF;
      IF NEW."status" = 'WAITING' AND NOT NEW."requiresReassignment" AND NOT EXISTS (
        SELECT 1 FROM "task_status_changes" h WHERE h."taskId" = NEW."id" AND h."taskVersion" = NEW."version" AND h."previousStatus" = OLD."status" AND h."reason" = NEW."waitingReason" AND h."delayCause" = NEW."waitingDelayCause" AND h."responsibleParty" IS NOT DISTINCT FROM NEW."waitingResponsibleParty") THEN
        RAISE EXCEPTION 'Ordinary Waiting requires matching cause and responsible-party history';
      END IF;
      IF OLD."status" = 'WAITING' AND NOT OLD."requiresReassignment" AND NEW."status" = 'IN_PROGRESS' AND NOT EXISTS (
        SELECT 1 FROM "task_status_changes" h WHERE h."taskId" = NEW."id" AND h."taskVersion" = NEW."version" AND h."previousStatus" = OLD."waitingPreviousStatus" AND h."delayCause" = OLD."waitingDelayCause" AND h."responsibleParty" IS NOT DISTINCT FROM OLD."waitingResponsibleParty") THEN
        RAISE EXCEPTION 'Ordinary resume requires matching saved waiting history';
      END IF;
    END IF;
    IF NEW."primaryOwnerEmployeeId" IS DISTINCT FROM OLD."primaryOwnerEmployeeId" AND NOT EXISTS (
      SELECT 1 FROM "task_owner_changes" h WHERE h."taskId" = NEW."id" AND h."organizationId" = NEW."organizationId" AND h."taskVersion" = NEW."version" AND h."oldOwnerEmployeeId" = OLD."primaryOwnerEmployeeId" AND h."newOwnerEmployeeId" = NEW."primaryOwnerEmployeeId") THEN
      RAISE EXCEPTION 'Task owner change requires immutable assignment evidence';
    END IF;
    IF NEW."committedDueDate" IS DISTINCT FROM OLD."committedDueDate" THEN
      IF NEW."type" = 'CLOSEOUT' THEN RAISE EXCEPTION 'Approved closeout due date cannot change'; END IF;
      IF (to_jsonb(NEW) - ARRAY['committedDueDate','version','updatedAt']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['committedDueDate','version','updatedAt']) THEN
        RAISE EXCEPTION 'Committed date must change in its own command';
      END IF;
      IF NEW."committedDueDate" IS NULL OR NOT EXISTS (
        SELECT 1 FROM "task_committed_date_changes" h
        WHERE h."taskId" = NEW."id" AND h."organizationId" = NEW."organizationId"
          AND h."taskVersion" = NEW."version" AND h."oldDate" IS NOT DISTINCT FROM OLD."committedDueDate"
          AND h."newDate" = NEW."committedDueDate"
      ) THEN RAISE EXCEPTION 'Committed date requires matching immutable history'; END IF;
    END IF;
    status_event := CASE WHEN NEW."committedDueDate" IS DISTINCT FROM OLD."committedDueDate" THEN 'task.deadline_changed'
      WHEN NEW."primaryOwnerEmployeeId" IS DISTINCT FROM OLD."primaryOwnerEmployeeId" THEN 'task.assigned'
      WHEN NEW."status" = 'WAITING' AND NEW."requiresReassignment" IS DISTINCT FROM OLD."requiresReassignment" THEN 'task.waiting'
      WHEN NEW."status" IS NOT DISTINCT FROM OLD."status" THEN 'task.updated'
      WHEN NEW."status" = 'STOPPED_DUE_TO_PROJECT_CANCELLATION' THEN 'task.stopped'
      WHEN NEW."status" = 'WAITING' THEN 'task.waiting'
      WHEN NEW."status" = 'COMPLETED' THEN 'task.completed'
      WHEN NEW."status" = 'IN_PROGRESS' THEN 'task.started' ELSE 'task.updated' END;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "audit_events" a WHERE a."organizationId" = NEW."organizationId" AND a."eventKey" = status_event AND a."subjectType" = 'task' AND a."subjectId" = NEW."id"::text AND (a."after"->>'version')::int = NEW."version") THEN
    RAISE EXCEPTION 'Task mutation requires canonical audit evidence';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."committedDueDate" IS DISTINCT FROM OLD."committedDueDate" AND NOT EXISTS (
    SELECT 1 FROM "task_committed_date_changes" h JOIN "audit_events" a
      ON a."organizationId" = h."organizationId" AND a."eventKey" = 'task.deadline_changed'
      AND a."subjectType" = 'task' AND a."subjectId" = h."taskId"::text
      AND a."actorId" = h."actorId" AND a."reason" = h."reason"
      AND (a."after"->>'version')::int = h."taskVersion"
    WHERE h."taskId" = NEW."id" AND h."taskVersion" = NEW."version"
      AND a."before"->>'committedDueDate' IS NOT DISTINCT FROM OLD."committedDueDate"::text
      AND a."after"->>'committedDueDate' = NEW."committedDueDate"::text
  ) THEN RAISE EXCEPTION 'Committed date requires matching canonical audit evidence'; END IF;
  IF NEW."type" = 'CLOSEOUT' AND NOT EXISTS (SELECT 1 FROM "task_closeout_approvals" c WHERE c."taskId" = NEW."id" AND c."organizationId" = NEW."organizationId") THEN
    RAISE EXCEPTION 'Closeout task requires approval evidence';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."type" = 'CLOSEOUT' THEN
    IF ROW(NEW."title",NEW."description",NEW."targetDate",NEW."startDate",NEW."priority",NEW."estimatedHours") IS DISTINCT FROM ROW(OLD."title",OLD."description",OLD."targetDate",OLD."startDate",OLD."priority",OLD."estimatedHours") THEN
      RAISE EXCEPTION 'Closeout requires current approval and immutable approved scope';
    END IF;
  END IF;
  RETURN NULL;
END $$;





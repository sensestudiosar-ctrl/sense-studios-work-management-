CREATE TYPE "InternalReviewStatus" AS ENUM ('SUBMITTED','IN_REVIEW','APPROVED','CORRECTIONS_REQUIRED');
CREATE TYPE "InternalReviewSeverity" AS ENUM ('MINOR','MODERATE','MAJOR','CRITICAL');

CREATE TABLE "review_categories" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "name" VARCHAR(120) NOT NULL,
  "normalizedName" VARCHAR(120) NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" UUID NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_category_org_fk" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "review_category_actor_fk" FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT,
  CONSTRAINT "review_category_shape" CHECK (length(btrim("name")) BETWEEN 2 AND 120 AND "normalizedName"=lower(btrim("name")))
);
CREATE UNIQUE INDEX "review_categories_organizationId_normalizedName_key" ON "review_categories"("organizationId","normalizedName");
CREATE UNIQUE INDEX "review_categories_id_organizationId_key" ON "review_categories"("id","organizationId");

CREATE TABLE "review_category_changes" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "categoryId" UUID NOT NULL,
  "actorId" UUID NOT NULL, "action" VARCHAR(20) NOT NULL, "reason" VARCHAR(1000) NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_category_change_category_fk" FOREIGN KEY ("categoryId","organizationId") REFERENCES "review_categories"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "review_category_change_actor_fk" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT,
  CONSTRAINT "review_category_change_shape" CHECK ("action" IN ('CREATED','ACTIVATED','DEACTIVATED') AND length(btrim("reason")) BETWEEN 3 AND 1000)
);
CREATE INDEX "review_category_changes_organizationId_categoryId_occurredAt_idx" ON "review_category_changes"("organizationId","categoryId","occurredAt");

CREATE TABLE "review_assignments" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "projectId" UUID NOT NULL, "taskId" UUID NOT NULL UNIQUE,
  "reviewerEmployeeId" UUID NOT NULL, "assignedById" UUID NOT NULL, "reason" VARCHAR(1000) NOT NULL,
  "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_assignment_task_fk" FOREIGN KEY ("taskId","organizationId") REFERENCES "tasks"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "review_assignment_project_fk" FOREIGN KEY ("projectId","organizationId") REFERENCES "projects"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "review_assignment_reviewer_fk" FOREIGN KEY ("reviewerEmployeeId","organizationId") REFERENCES "employees"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "review_assignment_actor_fk" FOREIGN KEY ("assignedById") REFERENCES "accounts"("id") ON DELETE RESTRICT,
  CONSTRAINT "review_assignment_shape" CHECK (length(btrim("reason")) BETWEEN 3 AND 1000)
);
CREATE UNIQUE INDEX "review_assignments_taskId_organizationId_projectId_key" ON "review_assignments"("taskId","organizationId","projectId");

CREATE TABLE "review_assignment_changes" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "projectId" UUID NOT NULL, "taskId" UUID NOT NULL,
  "oldReviewerEmployeeId" UUID, "newReviewerEmployeeId" UUID NOT NULL, "actorId" UUID NOT NULL,
  "reason" VARCHAR(1000) NOT NULL, "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_assignment_change_task_fk" FOREIGN KEY ("taskId","organizationId","projectId") REFERENCES "review_assignments"("taskId","organizationId","projectId") ON DELETE RESTRICT,
  CONSTRAINT "review_assignment_change_actor_fk" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT,
  CONSTRAINT "review_assignment_change_shape" CHECK (length(btrim("reason")) BETWEEN 3 AND 1000)
);
CREATE INDEX "review_assignment_changes_organizationId_taskId_occurredAt_idx" ON "review_assignment_changes"("organizationId","taskId","occurredAt");

CREATE TABLE "review_submissions" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "projectId" UUID NOT NULL, "taskId" UUID NOT NULL,
  "revisionId" UUID UNIQUE, "taskVersion" INTEGER NOT NULL, "roundNumber" INTEGER NOT NULL,
  "submittedById" UUID NOT NULL, "reason" VARCHAR(1000) NOT NULL,
  "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_submission_task_fk" FOREIGN KEY ("taskId","organizationId") REFERENCES "tasks"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "review_submission_revision_fk" FOREIGN KEY ("revisionId","organizationId","projectId") REFERENCES "document_revisions"("id","organizationId","projectId") ON DELETE RESTRICT,
  CONSTRAINT "review_submission_actor_fk" FOREIGN KEY ("submittedById") REFERENCES "accounts"("id") ON DELETE RESTRICT,
  CONSTRAINT "review_submission_shape" CHECK ("taskVersion">1 AND "roundNumber">0 AND length(btrim("reason")) BETWEEN 3 AND 1000)
);
CREATE UNIQUE INDEX "review_submissions_taskId_roundNumber_key" ON "review_submissions"("taskId","roundNumber");
CREATE UNIQUE INDEX "review_submissions_id_organizationId_projectId_key" ON "review_submissions"("id","organizationId","projectId");
CREATE INDEX "review_submissions_organizationId_taskId_submittedAt_idx" ON "review_submissions"("organizationId","taskId","submittedAt");

CREATE TABLE "review_rounds" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "projectId" UUID NOT NULL, "taskId" UUID NOT NULL,
  "submissionId" UUID NOT NULL UNIQUE, "reviewerEmployeeId" UUID NOT NULL,
  "status" "InternalReviewStatus" NOT NULL DEFAULT 'SUBMITTED', "startedAt" TIMESTAMPTZ(3),
  "decidedAt" TIMESTAMPTZ(3), "decidedById" UUID, "decisionComment" VARCHAR(2000),
  "severity" "InternalReviewSeverity", "categoryId" UUID, "categoryName" VARCHAR(120),
  "correctionTaskId" UUID UNIQUE,
  CONSTRAINT "review_round_submission_fk" FOREIGN KEY ("submissionId","organizationId","projectId") REFERENCES "review_submissions"("id","organizationId","projectId") ON DELETE RESTRICT,
  CONSTRAINT "review_round_task_fk" FOREIGN KEY ("taskId","organizationId") REFERENCES "tasks"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "review_round_reviewer_fk" FOREIGN KEY ("reviewerEmployeeId","organizationId") REFERENCES "employees"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "review_round_decider_fk" FOREIGN KEY ("decidedById") REFERENCES "accounts"("id") ON DELETE RESTRICT,
  CONSTRAINT "review_round_category_fk" FOREIGN KEY ("categoryId","organizationId") REFERENCES "review_categories"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "review_round_correction_fk" FOREIGN KEY ("correctionTaskId","organizationId") REFERENCES "tasks"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "review_round_shape" CHECK (
    (("status" IN ('APPROVED','CORRECTIONS_REQUIRED'))=("decidedAt" IS NOT NULL AND "decidedById" IS NOT NULL AND "decisionComment" IS NOT NULL))
    AND ("status"<>'CORRECTIONS_REQUIRED' OR ("severity" IS NOT NULL AND "categoryId" IS NOT NULL AND "categoryName" IS NOT NULL))
    AND ("status"='CORRECTIONS_REQUIRED' OR ("severity" IS NULL AND "categoryId" IS NULL AND "categoryName" IS NULL AND "correctionTaskId" IS NULL))
  )
);
CREATE UNIQUE INDEX "review_rounds_id_organizationId_projectId_key" ON "review_rounds"("id","organizationId","projectId");
CREATE INDEX "review_rounds_organizationId_reviewerEmployeeId_status_idx" ON "review_rounds"("organizationId","reviewerEmployeeId","status");

CREATE TABLE "review_comments" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "projectId" UUID NOT NULL,
  "roundId" UUID NOT NULL, "authorId" UUID NOT NULL, "comment" VARCHAR(2000) NOT NULL,
  "annotations" JSONB NOT NULL DEFAULT '[]'::jsonb, "markupFileId" UUID,
  "reason" VARCHAR(1000) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_comment_round_fk" FOREIGN KEY ("roundId","organizationId","projectId") REFERENCES "review_rounds"("id","organizationId","projectId") ON DELETE RESTRICT,
  CONSTRAINT "review_comment_author_fk" FOREIGN KEY ("authorId") REFERENCES "accounts"("id") ON DELETE RESTRICT,
  CONSTRAINT "review_comment_markup_fk" FOREIGN KEY ("markupFileId","organizationId") REFERENCES "documents"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "review_comment_shape" CHECK (length(btrim("comment")) BETWEEN 1 AND 2000 AND length(btrim("reason")) BETWEEN 3 AND 1000 AND jsonb_typeof("annotations")='array')
);
CREATE INDEX "review_comments_organizationId_roundId_createdAt_idx" ON "review_comments"("organizationId","roundId","createdAt");

CREATE TRIGGER "review_category_changes_immutable" BEFORE UPDATE OR DELETE ON "review_category_changes" FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();
CREATE TRIGGER "review_assignment_changes_immutable" BEFORE UPDATE OR DELETE ON "review_assignment_changes" FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();
CREATE TRIGGER "review_submissions_immutable" BEFORE UPDATE OR DELETE ON "review_submissions" FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();
CREATE TRIGGER "review_comments_immutable" BEFORE UPDATE OR DELETE ON "review_comments" FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();
REVOKE UPDATE, DELETE, TRUNCATE ON "review_category_changes", "review_assignment_changes", "review_submissions", "review_comments" FROM sense_app_runtime;
REVOKE DELETE, TRUNCATE ON "review_categories", "review_assignments", "review_rounds" FROM sense_app_runtime;

DO $$
DECLARE previous_definition TEXT;
BEGIN
 SELECT pg_get_constraintdef(oid) INTO previous_definition FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF previous_definition IS NULL OR left(previous_definition,6)<>'CHECK ' THEN RAISE EXCEPTION 'Expected event catalogue missing'; END IF;
 ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE 'ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" ' || left(previous_definition,length(previous_definition)-1) || ' OR "eventName" IN (''review.assigned'',''review.commented'',''review.correction_assigned'',''review.category_changed''))';
END $$;

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


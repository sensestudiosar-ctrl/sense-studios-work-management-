-- S10B separates a controlled commitment from the operational target date.
-- All S10A rows keep their existing values and receive a nullable commitment.
ALTER TABLE "tasks" ADD COLUMN "committedDueDate" DATE;

CREATE TABLE "task_committed_date_changes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  "oldDate" DATE,
  "newDate" DATE NOT NULL,
  "actorId" UUID NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "taskVersion" INTEGER NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_committed_date_changes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_committed_date_changes_taskId_taskVersion_key" UNIQUE ("taskId", "taskVersion"),
  CONSTRAINT "task_committed_date_changes_shape" CHECK ("taskVersion" > 1 AND "oldDate" IS DISTINCT FROM "newDate" AND length(btrim("reason")) BETWEEN 3 AND 1000),
  CONSTRAINT "task_committed_date_changes_task_fkey" FOREIGN KEY ("taskId", "organizationId") REFERENCES "tasks"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "task_committed_date_changes_actor_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "task_committed_date_changes_org_task_time_idx" ON "task_committed_date_changes"("organizationId", "taskId", "occurredAt");
CREATE TRIGGER "task_committed_date_changes_append_only" BEFORE UPDATE OR DELETE ON "task_committed_date_changes" FOR EACH ROW EXECUTE FUNCTION "guard_s09_append_only"();

-- A history row cannot be inserted independently of its versioned task update
-- and canonical audit record. The task evidence trigger below checks the reverse.
CREATE FUNCTION "check_s10_committed_date_history"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "tasks" t WHERE t."id" = NEW."taskId" AND t."organizationId" = NEW."organizationId"
      AND t."version" = NEW."taskVersion" AND t."committedDueDate" = NEW."newDate"
  ) OR NOT EXISTS (
    SELECT 1 FROM "audit_events" a WHERE a."organizationId" = NEW."organizationId"
      AND a."eventKey" = 'task.deadline_changed' AND a."subjectType" = 'task'
      AND a."subjectId" = NEW."taskId"::text AND a."actorId" = NEW."actorId"
      AND a."reason" = NEW."reason" AND (a."after"->>'version')::int = NEW."taskVersion"
      AND a."before"->>'committedDueDate' IS NOT DISTINCT FROM NEW."oldDate"::text
      AND a."after"->>'committedDueDate' = NEW."newDate"::text
  ) THEN RAISE EXCEPTION 'Committed-date history requires a matching task update and canonical audit evidence'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "task_committed_date_history_evidence"
  AFTER INSERT ON "task_committed_date_changes" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "check_s10_committed_date_history"();
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


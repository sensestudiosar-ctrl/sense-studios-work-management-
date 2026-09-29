-- S10A extends ordinary Waiting without weakening C-023 reassignment waiting.
-- Nullable additions preserve every existing S09 task and immutable history row.
ALTER TABLE "tasks" ADD COLUMN "waitingDelayCause" VARCHAR(1000), ADD COLUMN "waitingResponsibleParty" VARCHAR(160);
ALTER TABLE "task_status_changes" ADD COLUMN "delayCause" VARCHAR(1000), ADD COLUMN "responsibleParty" VARCHAR(160);
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_waiting_reassignment_check";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_waiting_shape_check" CHECK (
  ("status" = 'WAITING' AND "waitingPreviousStatus" IS NOT NULL AND "waitingReason" IS NOT NULL AND length(btrim("waitingReason")) BETWEEN 3 AND 1000 AND
    (("requiresReassignment" AND "waitingDelayCause" IS NULL AND "waitingResponsibleParty" IS NULL) OR
     (NOT "requiresReassignment" AND "waitingPreviousStatus" = 'IN_PROGRESS' AND "waitingDelayCause" IS NOT NULL AND length(btrim("waitingDelayCause")) BETWEEN 3 AND 1000 AND
      ("waitingResponsibleParty" IS NULL OR length(btrim("waitingResponsibleParty")) BETWEEN 1 AND 160)))) OR
  ("status" <> 'WAITING' AND NOT "requiresReassignment" AND "waitingPreviousStatus" IS NULL AND "waitingReason" IS NULL AND "waitingDelayCause" IS NULL AND "waitingResponsibleParty" IS NULL)
);
ALTER TABLE "task_status_changes" ADD CONSTRAINT "task_status_changes_waiting_metadata_check" CHECK (
  ("delayCause" IS NULL OR (length(btrim("delayCause")) BETWEEN 3 AND 1000 AND ("fromStatus" = 'WAITING' OR "toStatus" = 'WAITING'))) AND
  ("responsibleParty" IS NULL OR ("delayCause" IS NOT NULL AND length(btrim("responsibleParty")) BETWEEN 1 AND 160))
);

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
    status_event := CASE WHEN NEW."primaryOwnerEmployeeId" IS DISTINCT FROM OLD."primaryOwnerEmployeeId" THEN 'task.assigned'
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

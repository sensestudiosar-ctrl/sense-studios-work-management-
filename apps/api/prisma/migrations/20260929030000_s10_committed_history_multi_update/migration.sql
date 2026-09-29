-- A task can have more than one legitimate versioned change in a transaction.
-- Earlier committed-date history must remain valid after later task versions.
-- Every version already has a canonical task audit event; reject a fabricated
-- deadline event attached to a version whose real event is for another command.
CREATE OR REPLACE FUNCTION "check_s10_committed_date_history"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "tasks" t WHERE t."id" = NEW."taskId" AND t."organizationId" = NEW."organizationId"
      AND t."version" >= NEW."taskVersion"
      AND (t."version" <> NEW."taskVersion" OR t."committedDueDate" = NEW."newDate")
  ) OR NOT EXISTS (
    SELECT 1 FROM "audit_events" a WHERE a."organizationId" = NEW."organizationId"
      AND a."eventKey" = 'task.deadline_changed' AND a."subjectType" = 'task'
      AND a."subjectId" = NEW."taskId"::text AND a."actorId" = NEW."actorId"
      AND a."reason" = NEW."reason" AND (a."after"->>'version')::int = NEW."taskVersion"
      AND a."before"->>'committedDueDate' IS NOT DISTINCT FROM NEW."oldDate"::text
      AND a."after"->>'committedDueDate' = NEW."newDate"::text
  ) OR EXISTS (
    SELECT 1 FROM "audit_events" other WHERE other."organizationId" = NEW."organizationId"
      AND other."subjectType" = 'task' AND other."subjectId" = NEW."taskId"::text
      AND other."after"->>'version' = NEW."taskVersion"::text
      AND other."eventKey" <> 'task.deadline_changed'
  ) THEN RAISE EXCEPTION 'Committed-date history requires a matching task update and canonical audit evidence'; END IF;
  RETURN NULL;
END $$;

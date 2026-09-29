-- S10D uses the shared approval engine while binding approved commitments to
-- an immutable, task-specific request and decision.
CREATE UNIQUE INDEX "approval_requests_one_pending_task_extension"
  ON "approval_requests"("organizationId", "sourceId")
  WHERE "typeKey" = 'task.deadline_extension' AND "state" = 'PENDING';

ALTER TABLE "task_committed_date_changes" ADD COLUMN "extensionApprovalId" UUID;
CREATE UNIQUE INDEX "task_committed_date_changes_extension_approval_key"
  ON "task_committed_date_changes"("extensionApprovalId", "organizationId");
ALTER TABLE "task_committed_date_changes" ADD CONSTRAINT "task_committed_date_changes_extension_approval_fkey"
  FOREIGN KEY ("extensionApprovalId", "organizationId") REFERENCES "approval_requests"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "guard_s10_extension_request"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE committed_date DATE; owner_account UUID; owner_employee UUID; project_state "ProjectStatus";
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."typeKey" = 'task.deadline_extension' THEN RAISE EXCEPTION 'Task extension requests are append-only'; END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD."typeKey" = 'task.deadline_extension' AND
      (to_jsonb(NEW) - ARRAY['state','resolvedAt']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['state','resolvedAt']) THEN
      RAISE EXCEPTION 'Task extension request evidence is immutable';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW."typeKey" <> 'task.deadline_extension' THEN RETURN NEW; END IF;
  IF NEW."sourceType" <> 'task' OR NEW."sourceId" !~ '^[0-9a-fA-F-]{36}$' OR
    NEW."sourceGeneration" < 1 OR NEW."context"->>'approverAccountId' IS DISTINCT FROM NEW."approverId"::text OR
    NEW."context"->>'taskId' IS DISTINCT FROM NEW."sourceId" OR
    COALESCE(NEW."context"->>'proposedDate' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', false) = false OR
    COALESCE(NEW."context"->>'previousDate' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', false) = false OR
    NEW."context"->>'ownerEmployeeId' IS NULL OR NEW."requesterId" = NEW."approverId" THEN
    RAISE EXCEPTION 'Invalid task extension request evidence';
  END IF;
  SELECT t."committedDueDate", e."accountId", e."id", p."status" INTO committed_date, owner_account, owner_employee, project_state
    FROM "tasks" t JOIN "employees" e ON e."id" = t."primaryOwnerEmployeeId"
    LEFT JOIN "projects" p ON p."id" = t."projectId"
    WHERE t."id" = NEW."sourceId"::uuid AND t."organizationId" = NEW."organizationId"
      AND t."type" <> 'CLOSEOUT' AND t."status" NOT IN ('COMPLETED','STOPPED_DUE_TO_PROJECT_CANCELLATION')
      AND NOT t."requiresReassignment";
  IF committed_date IS NULL OR owner_account IS DISTINCT FROM NEW."requesterId" OR
    owner_employee::text IS DISTINCT FROM NEW."context"->>'ownerEmployeeId' OR
    project_state IS NOT NULL AND project_state <> 'ACTIVE' OR
    committed_date::text IS DISTINCT FROM NEW."context"->>'previousDate' OR
    NEW."context"->>'proposedDate' <= NEW."context"->>'previousDate' THEN
    RAISE EXCEPTION 'Task extension request does not match its current commitment and owner';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "task_extension_request_guard" BEFORE INSERT OR UPDATE OR DELETE ON "approval_requests"
  FOR EACH ROW EXECUTE FUNCTION "guard_s10_extension_request"();

CREATE FUNCTION "check_s10_approved_extension_date"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."extensionApprovalId" IS NULL THEN RETURN NULL; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "approval_requests" r JOIN "approval_decisions" d ON d."requestId" = r."id"
    JOIN "audit_events" a ON a."organizationId" = NEW."organizationId" AND a."subjectType" = 'task'
      AND a."subjectId" = NEW."taskId"::text AND a."eventKey" = 'task.deadline_changed'
      AND a."actorId" = NEW."actorId" AND a."after"->>'version' = NEW."taskVersion"::text
    WHERE r."id" = NEW."extensionApprovalId" AND r."organizationId" = NEW."organizationId"
      AND r."typeKey" = 'task.deadline_extension' AND r."sourceType" = 'task'
      AND r."sourceId" = NEW."taskId"::text AND r."state" = 'APPROVED'
      AND d."outcome" = 'APPROVED' AND d."deciderId" = NEW."actorId"
      AND r."context"->>'previousDate' = NEW."oldDate"::text
      AND r."context"->>'proposedDate' = NEW."newDate"::text
      AND a."after"->>'extensionApprovalId' = r."id"::text
  ) THEN RAISE EXCEPTION 'Approved extension date requires matching request, decision and audit evidence'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "task_approved_extension_date_evidence"
  AFTER INSERT ON "task_committed_date_changes" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "check_s10_approved_extension_date"();

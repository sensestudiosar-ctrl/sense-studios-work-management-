-- Applied S10D evidence remains untouched. New requests bind the task version;
-- approval requires both the immutable decision and its committed-date change.
CREATE OR REPLACE FUNCTION "guard_s10_extension_request"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE task_row RECORD; previous_date DATE; proposed_date DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."typeKey" = 'task.deadline_extension' THEN RAISE EXCEPTION 'Task extension requests are append-only'; END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (OLD."typeKey" = 'task.deadline_extension' OR NEW."typeKey" = 'task.deadline_extension')
       AND OLD."typeKey" IS DISTINCT FROM NEW."typeKey" THEN
      RAISE EXCEPTION 'Task extension request type is immutable';
    END IF;
    IF OLD."typeKey" = 'task.deadline_extension' THEN
      IF OLD."state" <> 'PENDING' AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
        RAISE EXCEPTION 'Resolved task extension evidence is immutable';
      END IF;
      IF (to_jsonb(NEW) - ARRAY['state','resolvedAt']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['state','resolvedAt']) THEN
        RAISE EXCEPTION 'Task extension request evidence is immutable';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW."typeKey" <> 'task.deadline_extension' THEN RETURN NEW; END IF;
  IF NEW."state" <> 'PENDING' OR NEW."resolvedAt" IS NOT NULL OR NEW."sourceType" <> 'task'
     OR NEW."sourceId" !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     OR NEW."sourceGeneration" < 1 OR NEW."requesterId" = NEW."approverId"
     OR NEW."delegationAccountId" IS NOT NULL OR NEW."delegationIssuedById" IS NOT NULL
     OR NEW."delegationReason" IS NOT NULL OR NEW."delegatedAt" IS NOT NULL OR NEW."delegationExpiresAt" IS NOT NULL
     OR jsonb_typeof(NEW."context") IS DISTINCT FROM 'object'
     OR NEW."context"->>'approverAccountId' IS DISTINCT FROM NEW."approverId"::text
     OR NEW."context"->>'taskId' IS DISTINCT FROM NEW."sourceId"
     OR COALESCE(NEW."context"->>'proposedDate' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', false) = false
     OR COALESCE(NEW."context"->>'previousDate' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', false) = false
     OR NEW."context"->>'ownerEmployeeId' IS NULL
     OR jsonb_typeof(NEW."context"->'taskVersion') IS DISTINCT FROM 'number'
     OR COALESCE(NEW."context"->>'taskVersion' ~ '^[1-9][0-9]*$', false) = false THEN
    RAISE EXCEPTION 'Invalid task extension request evidence';
  END IF;
  previous_date := (NEW."context"->>'previousDate')::date;
  proposed_date := (NEW."context"->>'proposedDate')::date;
  IF previous_date::text <> NEW."context"->>'previousDate' OR proposed_date::text <> NEW."context"->>'proposedDate'
     OR proposed_date <= previous_date THEN RAISE EXCEPTION 'Invalid task extension dates'; END IF;
  SELECT t.*, e."accountId" AS owner_account, e."state" AS owner_state,
      a."state" AS owner_account_state, p."status" AS project_state
    INTO task_row FROM "tasks" t JOIN "employees" e ON e."id" = t."primaryOwnerEmployeeId"
    JOIN "accounts" a ON a."id" = e."accountId" LEFT JOIN "projects" p ON p."id" = t."projectId"
    WHERE t."id" = NEW."sourceId"::uuid AND t."organizationId" = NEW."organizationId";
  IF task_row."id" IS NULL OR task_row."type" = 'CLOSEOUT'
     OR task_row."status" IN ('COMPLETED','STOPPED_DUE_TO_PROJECT_CANCELLATION') OR task_row."requiresReassignment"
     OR task_row."committedDueDate" IS DISTINCT FROM previous_date
     OR task_row.owner_account IS DISTINCT FROM NEW."requesterId" OR task_row.owner_state <> 'ACTIVE'
     OR task_row.owner_account_state <> 'ACTIVE'
     OR task_row."primaryOwnerEmployeeId"::text IS DISTINCT FROM NEW."context"->>'ownerEmployeeId'
     OR task_row."version" IS DISTINCT FROM (NEW."context"->>'taskVersion')::int
     OR task_row.project_state IS NOT NULL AND task_row.project_state <> 'ACTIVE'
     OR NOT EXISTS (SELECT 1 FROM "accounts" a WHERE a."id" = NEW."approverId" AND a."state" = 'ACTIVE') THEN
    RAISE EXCEPTION 'Task extension request does not match its current commitment, version and owner';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION "check_s10_approved_extension_date"() RETURNS trigger LANGUAGE plpgsql AS $$
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
      AND d."organizationId" = r."organizationId" AND d."outcome" = 'APPROVED'
      AND d."deciderId" = r."approverId" AND d."deciderId" = NEW."actorId" AND d."reason" = NEW."reason"
      AND r."context"->>'previousDate' = NEW."oldDate"::text
      AND r."context"->>'proposedDate' = NEW."newDate"::text AND NEW."newDate" > NEW."oldDate"
      AND (r."context"->>'taskVersion')::int = NEW."taskVersion" - 1
      AND a."after"->>'extensionApprovalId' = r."id"::text
      AND a."before"->>'version' = (NEW."taskVersion" - 1)::text
  ) THEN RAISE EXCEPTION 'Approved extension date requires matching request, version, assigned decision and audit evidence'; END IF;
  RETURN NULL;
END $$;

CREATE FUNCTION "check_s10_extension_resolution_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE request_row "approval_requests"%ROWTYPE; decision_row "approval_decisions"%ROWTYPE;
        lifecycle_key TEXT; lifecycle_actor UUID; lifecycle_reason TEXT;
BEGIN
  SELECT * INTO request_row FROM "approval_requests" WHERE "id" = NEW."id";
  IF request_row."typeKey" <> 'task.deadline_extension' THEN RETURN NULL; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "audit_events" a JOIN "domain_events" e
      ON e."payload"->>'auditEventId' = a."id"::text AND e."organizationId" = a."organizationId"
      AND e."eventName" = a."eventKey" AND e."actorId" = a."actorId"
      AND e."subjectType" = a."subjectType" AND e."subjectId" = a."subjectId"
    JOIN "outbox_deliveries" o ON o."eventId" = e."id" AND o."consumer" = 'NTF'
    WHERE a."organizationId" = request_row."organizationId" AND a."subjectType" = 'approval_request'
      AND a."subjectId" = request_row."id"::text AND a."eventKey" = 'approval.requested'
      AND a."actorId" = request_row."requesterId" AND a."reason" = request_row."reason"
      AND a."after"->>'requestId' = request_row."id"::text AND a."after"->>'typeKey' = 'task.deadline_extension'
  ) THEN RAISE EXCEPTION 'Task extension request requires canonical audit, event and outbox evidence'; END IF;
  IF request_row."state" = 'PENDING' THEN RETURN NULL; END IF;
  IF request_row."state" = 'WITHDRAWN' THEN
    lifecycle_key := 'approval.withdrawn';
    SELECT a."actorId", a."reason" INTO lifecycle_actor, lifecycle_reason FROM "audit_events" a
      JOIN "accounts" actor ON actor."id" = a."actorId" AND actor."kind" = 'OWNER'
      WHERE a."organizationId" = request_row."organizationId" AND a."subjectType" = 'approval_request'
        AND a."subjectId" = request_row."id"::text AND a."eventKey" = lifecycle_key
        AND a."after"->>'state' = 'WITHDRAWN' LIMIT 1;
  ELSE
    SELECT * INTO decision_row FROM "approval_decisions" WHERE "requestId" = request_row."id";
    IF decision_row."id" IS NULL OR decision_row."organizationId" <> request_row."organizationId"
       OR decision_row."outcome"::text <> request_row."state"::text
       OR decision_row."deciderId" <> request_row."approverId" OR decision_row."deciderId" = request_row."requesterId" THEN
      RAISE EXCEPTION 'Task extension resolution requires its assigned approver decision';
    END IF;
    lifecycle_key := 'approval.decided'; lifecycle_actor := decision_row."deciderId"; lifecycle_reason := decision_row."reason";
    IF request_row."state" = 'APPROVED' AND NOT EXISTS (
      SELECT 1 FROM "task_committed_date_changes" h WHERE h."extensionApprovalId" = request_row."id"
        AND h."organizationId" = request_row."organizationId" AND h."taskId"::text = request_row."sourceId"
        AND h."actorId" = decision_row."deciderId" AND h."reason" = decision_row."reason"
        AND h."oldDate"::text = request_row."context"->>'previousDate'
        AND h."newDate"::text = request_row."context"->>'proposedDate'
        AND h."taskVersion" - 1 = (request_row."context"->>'taskVersion')::int
    ) THEN RAISE EXCEPTION 'Approved task extension requires its committed-date change'; END IF;
  END IF;
  IF lifecycle_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM "audit_events" a JOIN "domain_events" e
      ON e."payload"->>'auditEventId' = a."id"::text AND e."organizationId" = a."organizationId"
      AND e."eventName" = a."eventKey" AND e."actorId" = a."actorId"
      AND e."subjectType" = a."subjectType" AND e."subjectId" = a."subjectId"
    JOIN "outbox_deliveries" o ON o."eventId" = e."id" AND o."consumer" = 'NTF'
    WHERE a."organizationId" = request_row."organizationId" AND a."subjectType" = 'approval_request'
      AND a."subjectId" = request_row."id"::text AND a."eventKey" = lifecycle_key
      AND a."actorId" = lifecycle_actor AND a."reason" = lifecycle_reason
      AND a."after"->>'state' = request_row."state"::text
      AND a."after"->>'requestId' = request_row."id"::text AND a."after"->>'typeKey' = 'task.deadline_extension'
  ) THEN RAISE EXCEPTION 'Task extension resolution requires canonical audit, event and outbox evidence'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "task_extension_resolution_evidence"
  AFTER INSERT OR UPDATE ON "approval_requests" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "check_s10_extension_resolution_evidence"();

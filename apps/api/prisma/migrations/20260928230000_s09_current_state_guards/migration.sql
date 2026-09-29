-- Historical transitions keep their evidence; current access is checked at write time.
-- Classify edits independently of current state, and constrain S09 state moves.
CREATE OR REPLACE FUNCTION "check_s09_task_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE status_event TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM "task_status_changes" h WHERE h."taskId" = NEW."id" AND h."organizationId" = NEW."organizationId" AND h."taskVersion" = 1 AND h."fromStatus" IS NULL AND h."toStatus" = 'NOT_STARTED' AND h."actorId" = NEW."createdById") THEN
      RAISE EXCEPTION 'Task creation requires initial status evidence';
    END IF;
    status_event := 'task.created';
  ELSE
    IF NEW."status" IS DISTINCT FROM OLD."status" OR NEW."requiresReassignment" IS DISTINCT FROM OLD."requiresReassignment" THEN
      IF NOT EXISTS (SELECT 1 FROM "task_status_changes" h WHERE h."taskId" = NEW."id" AND h."organizationId" = NEW."organizationId" AND h."taskVersion" = NEW."version" AND h."fromStatus" = OLD."status" AND h."toStatus" = NEW."status") THEN
        RAISE EXCEPTION 'Task state requires immutable transition evidence';
      END IF;
      IF NOT (
        OLD."status" = 'NOT_STARTED' AND NEW."status" = 'IN_PROGRESS' AND NOT NEW."requiresReassignment" OR
        OLD."status" = 'IN_PROGRESS' AND NEW."status" = 'COMPLETED' AND NEW."reviewRequirement" = 'NONE' OR
        NEW."status" = 'WAITING' AND NEW."requiresReassignment" AND NEW."waitingPreviousStatus" = OLD."status" AND EXISTS (SELECT 1 FROM "employees" e WHERE e."id" = NEW."primaryOwnerEmployeeId" AND e."state" = 'EXITED') OR
        OLD."status" = 'WAITING' AND OLD."requiresReassignment" AND NOT NEW."requiresReassignment" AND NEW."primaryOwnerEmployeeId" IS DISTINCT FROM OLD."primaryOwnerEmployeeId" AND NEW."status" = CASE WHEN OLD."waitingPreviousStatus" = 'NOT_STARTED' THEN 'NOT_STARTED'::"TaskStatus" ELSE 'IN_PROGRESS'::"TaskStatus" END OR
        NEW."status" = 'STOPPED_DUE_TO_PROJECT_CANCELLATION'
      ) THEN RAISE EXCEPTION 'Invalid S09 task transition or unavailable review workflow'; END IF;
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


CREATE FUNCTION "guard_s09_current_closeout"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."type" = 'CLOSEOUT' AND NOT EXISTS (SELECT 1 FROM "task_closeout_approvals" c WHERE c."taskId" = OLD."id" AND c."revokedAt" IS NULL) THEN
    RAISE EXCEPTION 'Closeout requires current approval';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "tasks_current_closeout" BEFORE UPDATE ON "tasks" FOR EACH ROW EXECUTE FUNCTION "guard_s09_current_closeout"();

CREATE OR REPLACE FUNCTION "check_project_decision_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lead_branch UUID; lead_state "EmployeeState"; account_state "AccountState"; current_project RECORD;
BEGIN
  IF NEW."branchId" IS DISTINCT FROM OLD."branchId" AND NOT EXISTS (
    SELECT 1 FROM "project_branch_transfers" WHERE "projectId" = NEW."id" AND "organizationId" = NEW."organizationId"
      AND "projectVersion" = NEW."version" AND "fromBranchId" = OLD."branchId" AND "toBranchId" = NEW."branchId") THEN
    RAISE EXCEPTION 'Branch transfer requires matching immutable evidence';
  END IF;
  IF NEW."currentLeadEmployeeId" IS DISTINCT FROM OLD."currentLeadEmployeeId" AND NOT EXISTS (
    SELECT 1 FROM "project_lead_changes" WHERE "projectId" = NEW."id" AND "organizationId" = NEW."organizationId"
      AND "projectVersion" = NEW."version" AND "oldEmployeeId" IS NOT DISTINCT FROM OLD."currentLeadEmployeeId"
      AND "newEmployeeId" IS NOT DISTINCT FROM NEW."currentLeadEmployeeId") THEN
    RAISE EXCEPTION 'Project Lead change requires matching immutable evidence';
  END IF;
  IF NEW."scopeApproverAccountId" IS DISTINCT FROM OLD."scopeApproverAccountId" AND NOT EXISTS (
    SELECT 1 FROM "project_scope_policy_changes" WHERE "projectId" = NEW."id" AND "organizationId" = NEW."organizationId"
      AND "projectVersion" = NEW."version" AND "oldApproverId" IS NOT DISTINCT FROM OLD."scopeApproverAccountId"
      AND "newApproverId" = NEW."scopeApproverAccountId") THEN
    RAISE EXCEPTION 'Scope policy change requires matching immutable evidence';
  END IF;
  IF NEW."status" IS DISTINCT FROM OLD."status" AND NOT EXISTS (
    SELECT 1 FROM "project_status_changes" WHERE "projectId" = NEW."id" AND "organizationId" = NEW."organizationId"
      AND "projectVersion" = NEW."version" AND "fromStatus" = OLD."status" AND "toStatus" = NEW."status") THEN
    RAISE EXCEPTION 'Project status change requires matching immutable evidence';
  END IF;
  IF NEW."branchId" IS DISTINCT FROM OLD."branchId" AND EXISTS (
    SELECT 1 FROM "project_assignments" a JOIN "employees" e ON e."id" = a."employeeId"
    WHERE a."projectId" = NEW."id" AND a."revokedAt" IS NULL AND e."homeBranchId" <> NEW."branchId") THEN
    RAISE EXCEPTION 'Transfer must revoke access outside the new owning Branch';
  END IF;
  SELECT * INTO current_project FROM "projects" WHERE "id" = NEW."id";
  IF current_project."status" = 'ACTIVE' THEN
    SELECT e."homeBranchId", e."state", ac."state" INTO lead_branch, lead_state, account_state
      FROM "employees" e JOIN "accounts" ac ON ac."id" = e."accountId"
      WHERE e."id" = current_project."currentLeadEmployeeId" AND e."organizationId" = NEW."organizationId";
    IF lead_state IS DISTINCT FROM 'ACTIVE' OR account_state IS DISTINCT FROM 'ACTIVE' OR NOT EXISTS (
      SELECT 1 FROM "project_assignments" a WHERE a."projectId" = NEW."id" AND a."employeeId" = current_project."currentLeadEmployeeId"
        AND a."revokedAt" IS NULL AND (lead_branch = current_project."branchId" OR a."crossBranchAuthorized")) THEN
      RAISE EXCEPTION 'Active project requires an eligible assigned Project Lead';
    END IF;
  END IF;
  RETURN NULL;
END $$;



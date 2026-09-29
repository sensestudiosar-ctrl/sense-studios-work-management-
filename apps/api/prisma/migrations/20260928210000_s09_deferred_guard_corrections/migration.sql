-- A project may be Active and then placed On Hold in the same transaction
-- (employee exit). Deferred evidence checks must validate current eligibility.
CREATE OR REPLACE FUNCTION "check_project_decision_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lead_branch UUID; lead_state "EmployeeState"; account_state "AccountState";
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
  IF NEW."status" = 'ACTIVE' AND EXISTS (SELECT 1 FROM "projects" p WHERE p."id" = NEW."id" AND p."status" = 'ACTIVE') THEN
    SELECT e."homeBranchId", e."state", ac."state" INTO lead_branch, lead_state, account_state
      FROM "employees" e JOIN "accounts" ac ON ac."id" = e."accountId"
      WHERE e."id" = NEW."currentLeadEmployeeId" AND e."organizationId" = NEW."organizationId";
    IF lead_state IS DISTINCT FROM 'ACTIVE' OR account_state IS DISTINCT FROM 'ACTIVE' OR NOT EXISTS (
      SELECT 1 FROM "project_assignments" a WHERE a."projectId" = NEW."id" AND a."employeeId" = NEW."currentLeadEmployeeId"
        AND a."revokedAt" IS NULL AND (lead_branch = NEW."branchId" OR a."crossBranchAuthorized")) THEN
      RAISE EXCEPTION 'Active project requires an eligible assigned Project Lead';
    END IF;
  END IF;
  RETURN NULL;
END $$;

-- Qualify the cancellation reason; PL/pgSQL's local variable name otherwise
-- collides with the status-change column in the deferred query.
CREATE OR REPLACE FUNCTION "check_s09_cancelled_project"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_actor UUID; cancellation_reason TEXT;
BEGIN
  IF NEW."status" <> 'CANCELLED' OR OLD."status" = 'CANCELLED' THEN RETURN NULL; END IF;
  SELECT h."actorId", h."reason" INTO owner_actor, cancellation_reason FROM "project_status_changes" h WHERE h."projectId" = NEW."id" AND h."organizationId" = NEW."organizationId" AND h."projectVersion" = NEW."version" AND h."toStatus" = 'CANCELLED';
  IF owner_actor IS NULL OR NOT EXISTS (SELECT 1 FROM "accounts" WHERE "id" = owner_actor AND "kind" = 'OWNER') THEN RAISE EXCEPTION 'Cancellation requires Owner status evidence'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "audit_events" a WHERE a."organizationId" = NEW."organizationId" AND a."eventKey" = 'project.cancelled' AND a."subjectId" = NEW."id"::text AND a."actorId" = owner_actor AND a."reason" = cancellation_reason AND (a."after"->>'version')::int = NEW."version") THEN RAISE EXCEPTION 'Cancellation requires canonical audit evidence'; END IF;
  IF EXISTS (SELECT 1 FROM "tasks" t WHERE t."projectId" = NEW."id" AND t."type" <> 'CLOSEOUT' AND t."status" NOT IN ('COMPLETED','STOPPED_DUE_TO_PROJECT_CANCELLATION')) THEN RAISE EXCEPTION 'Cancellation must stop unfinished delivery tasks'; END IF;
  RETURN NULL;
END $$;

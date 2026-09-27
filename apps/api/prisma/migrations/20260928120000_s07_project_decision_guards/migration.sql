-- Project updates and immutable decision evidence must commit together.
CREATE FUNCTION "check_project_decision_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
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
  IF NEW."status" = 'ACTIVE' THEN
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
CREATE CONSTRAINT TRIGGER "project_decision_evidence" AFTER UPDATE ON "projects"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_project_decision_evidence"();

CREATE FUNCTION "check_active_lead_assignment"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."revokedAt" IS NOT NULL AND OLD."revokedAt" IS NULL AND EXISTS (
    SELECT 1 FROM "projects" p WHERE p."id" = NEW."projectId" AND p."status" = 'ACTIVE'
      AND p."currentLeadEmployeeId" = NEW."employeeId") THEN
    RAISE EXCEPTION 'Active Project Lead assignment cannot be revoked';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "project_active_lead_assignment" AFTER UPDATE OF "revokedAt" ON "project_assignments"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_active_lead_assignment"();

CREATE FUNCTION "check_project_scope_award"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT NEW."baseline" AND NOT EXISTS (
    SELECT 1 FROM "project_scope_changes" sc JOIN "approval_requests" ar ON ar."id" = sc."approvalId"
    WHERE sc."id" = NEW."scopeChangeId" AND sc."projectId" = NEW."projectId" AND sc."organizationId" = NEW."organizationId"
      AND sc."normalizedName" = NEW."normalizedName" AND ar."state" = 'APPROVED' AND ar."typeKey" = 'project.scope_change'
      AND ar."sourceType" = 'project_scope_change' AND ar."sourceId" = sc."id"::text) THEN
    RAISE EXCEPTION 'Additional scope requires approved project scope change';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "project_scope_award_guard" BEFORE INSERT ON "project_scopes"
  FOR EACH ROW EXECUTE FUNCTION "check_project_scope_award"();

CREATE FUNCTION "check_scope_change_approval_link"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."approvalId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "approval_requests" ar WHERE ar."id" = NEW."approvalId" AND ar."organizationId" = NEW."organizationId"
      AND ar."typeKey" = 'project.scope_change' AND ar."sourceType" = 'project_scope_change'
      AND ar."sourceId" = NEW."id"::text AND ar."requesterId" = NEW."requesterId") THEN
    RAISE EXCEPTION 'Scope request requires its matching approval';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "project_scope_approval_link_guard" BEFORE UPDATE OF "approvalId" ON "project_scope_changes"
  FOR EACH ROW EXECUTE FUNCTION "check_scope_change_approval_link"();

-- Strengthen the S09 handover and cancellation invariants after the owning commands exist.
CREATE FUNCTION "check_s09_employee_exit"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."state" <> 'EXITED' OR OLD."state" = 'EXITED' THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM "accounts" a WHERE a."id" = NEW."accountId" AND a."state" = 'SUSPENDED') OR
     EXISTS (SELECT 1 FROM "sessions" s WHERE s."accountId" = NEW."accountId" AND s."revokedAt" IS NULL) OR
     EXISTS (SELECT 1 FROM "employee_permission_overrides" o WHERE o."employeeId" = NEW."id" AND o."revokedAt" IS NULL) OR
     EXISTS (SELECT 1 FROM "employee_job_role_assignments" r WHERE r."employeeId" = NEW."id" AND r."effectiveTo" IS NULL) OR
     EXISTS (SELECT 1 FROM "project_assignments" p WHERE p."employeeId" = NEW."id" AND p."revokedAt" IS NULL) THEN
    RAISE EXCEPTION 'Exit must revoke all current employee access';
  END IF;
  IF EXISTS (SELECT 1 FROM "tasks" t WHERE t."primaryOwnerEmployeeId" = NEW."id" AND t."status" NOT IN ('COMPLETED','STOPPED_DUE_TO_PROJECT_CANCELLATION') AND (t."status" <> 'WAITING' OR NOT t."requiresReassignment" OR t."waitingPreviousStatus" IS NULL)) THEN
    RAISE EXCEPTION 'Exit must place unfinished owned tasks in reassignment waiting';
  END IF;
  IF EXISTS (SELECT 1 FROM "projects" p WHERE p."currentLeadEmployeeId" = NEW."id" AND p."status" = 'ACTIVE') THEN
    RAISE EXCEPTION 'Exit must hold Active projects led by the employee';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "audit_events" a WHERE a."organizationId" = NEW."organizationId" AND a."eventKey" = 'organization.employee.exited' AND a."subjectId" = NEW."id"::text AND a."after"->>'state' = 'EXITED') THEN
    RAISE EXCEPTION 'Exit requires canonical audit evidence';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "employee_exit_consistency" AFTER UPDATE OF "state" ON "employees" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s09_employee_exit"();

CREATE FUNCTION "check_s09_task_stop_link"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."toStatus" <> 'STOPPED_DUE_TO_PROJECT_CANCELLATION' THEN RETURN NULL; END IF;
  IF NEW."projectStatusChangeId" IS NULL OR NOT EXISTS (
    SELECT 1 FROM "project_status_changes" p JOIN "tasks" t ON t."projectId" = p."projectId" AND t."organizationId" = p."organizationId"
    WHERE t."id" = NEW."taskId" AND p."id" = NEW."projectStatusChangeId" AND p."toStatus" = 'CANCELLED'
      AND p."actorId" = NEW."actorId" AND p."reason" = NEW."reason") THEN
    RAISE EXCEPTION 'Stopped delivery task must link matching project cancellation';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "task_stop_cancellation_link" AFTER INSERT ON "task_status_changes" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s09_task_stop_link"();

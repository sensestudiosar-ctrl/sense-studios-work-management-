-- S09 enables effective cancellation only with matching task stops and canonical evidence.
ALTER TABLE "task_status_changes" ALTER COLUMN "reason" SET NOT NULL;
ALTER TABLE "task_status_changes" ADD CONSTRAINT "task_status_changes_shape" CHECK (
  "taskVersion" > 0 AND length(btrim("reason")) BETWEEN 3 AND 1000 AND
  (("fromStatus" IS NULL AND "toStatus" = 'NOT_STARTED' AND "taskVersion" = 1) OR
   ("fromStatus" IS NOT NULL AND ("fromStatus" <> "toStatus" OR "toStatus" = 'WAITING')))
);
ALTER TABLE "task_owner_changes" ADD CONSTRAINT "task_owner_changes_shape" CHECK (
  "taskVersion" > 1 AND "oldOwnerEmployeeId" IS DISTINCT FROM "newOwnerEmployeeId" AND length(btrim("reason")) BETWEEN 3 AND 1000
);

CREATE OR REPLACE FUNCTION "protect_project_s07"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Projects cannot be deleted'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'DRAFT' OR NEW."version" <> 1 THEN RAISE EXCEPTION 'Projects begin Draft at version 1'; END IF;
    IF NEW."wonLeadId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "leads" l JOIN "lead_stage_changes" s ON s."id" = NEW."wonStageChangeId" AND s."leadId" = l."id" AND s."toStage" = 'WON'
      WHERE l."id" = NEW."wonLeadId" AND l."organizationId" = NEW."organizationId" AND l."branchId" = NEW."branchId"
        AND l."clientId" IS NOT DISTINCT FROM NEW."clientId" AND l."stage" = 'WON') THEN
      RAISE EXCEPTION 'Project conversion requires exact Won evidence in the owning Branch';
    END IF;
  ELSE
    IF ROW(NEW."organizationId", NEW."clientId", NEW."wonLeadId", NEW."wonStageChangeId", NEW."deliveryType", NEW."createdById", NEW."createdAt") IS DISTINCT FROM
       ROW(OLD."organizationId", OLD."clientId", OLD."wonLeadId", OLD."wonStageChangeId", OLD."deliveryType", OLD."createdById", OLD."createdAt") THEN
      RAISE EXCEPTION 'Project identity and provenance are immutable';
    END IF;
    IF OLD."status" IN ('ARCHIVED', 'CANCELLED') THEN RAISE EXCEPTION 'Terminal projects cannot change'; END IF;
    IF NEW."version" <> OLD."version" + 1 THEN RAISE EXCEPTION 'Project version must advance once'; END IF;
    IF NEW."branchId" IS DISTINCT FROM OLD."branchId" AND NOT EXISTS (
      SELECT 1 FROM "branches" WHERE "id" = NEW."branchId" AND "organizationId" = NEW."organizationId" AND "active" = true) THEN
      RAISE EXCEPTION 'Transfer requires an active Branch in the same organization';
    END IF;
    IF NEW."status" IS DISTINCT FROM OLD."status" AND NOT (
      OLD."status" = 'DRAFT' AND NEW."status" IN ('ACTIVE','CANCELLED') OR
      OLD."status" = 'ACTIVE' AND NEW."status" IN ('ON_HOLD','COMPLETED','CANCELLED') OR
      OLD."status" = 'ON_HOLD' AND NEW."status" IN ('ACTIVE','CANCELLED') OR
      OLD."status" = 'COMPLETED' AND NEW."status" = 'ARCHIVED') THEN
      RAISE EXCEPTION 'Invalid project status transition';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "guard_s09_task_core"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE project_state "ProjectStatus";
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Tasks cannot be deleted'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'NOT_STARTED' OR NEW."version" <> 1 OR NEW."requiresReassignment" THEN RAISE EXCEPTION 'Tasks begin Not Started at version 1'; END IF;
  ELSE
    IF ROW(NEW."organizationId",NEW."projectId",NEW."type",NEW."createdById",NEW."createdAt",NEW."reviewRequirement") IS DISTINCT FROM
       ROW(OLD."organizationId",OLD."projectId",OLD."type",OLD."createdById",OLD."createdAt",OLD."reviewRequirement") THEN
      RAISE EXCEPTION 'Task identity, project, type and review requirement are immutable';
    END IF;
    IF OLD."status" IN ('COMPLETED','STOPPED_DUE_TO_PROJECT_CANCELLATION') THEN RAISE EXCEPTION 'Terminal tasks cannot change'; END IF;
    IF NEW."version" <> OLD."version" + 1 THEN RAISE EXCEPTION 'Task version must advance once'; END IF;
  END IF;
  IF NEW."projectId" IS NOT NULL THEN
    SELECT "status" INTO project_state FROM "projects" WHERE "id" = NEW."projectId" AND "organizationId" = NEW."organizationId" FOR SHARE;
    IF TG_OP = 'INSERT' AND NOT ((NEW."type" = 'CLOSEOUT' AND project_state = 'CANCELLED') OR (NEW."type" <> 'CLOSEOUT' AND project_state IN ('DRAFT','ACTIVE'))) THEN
      RAISE EXCEPTION 'Project state does not permit this task';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW."status" IS DISTINCT FROM OLD."status" AND NOT ((NEW."type" = 'CLOSEOUT' AND project_state = 'CANCELLED') OR (NEW."type" <> 'CLOSEOUT' AND project_state IN ('ACTIVE','ON_HOLD','CANCELLED'))) THEN
      RAISE EXCEPTION 'Project state does not permit this task transition';
    END IF;
  ELSIF NEW."type" IN ('PROJECT','CORRECTION','SITE','CLOSEOUT') THEN
    RAISE EXCEPTION 'Task type requires a project';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "tasks_core_guard" BEFORE INSERT OR UPDATE OR DELETE ON "tasks" FOR EACH ROW EXECUTE FUNCTION "guard_s09_task_core"();

CREATE FUNCTION "check_s09_task_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE status_event TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM "task_status_changes" h WHERE h."taskId" = NEW."id" AND h."organizationId" = NEW."organizationId" AND h."taskVersion" = 1 AND h."fromStatus" IS NULL AND h."toStatus" = 'NOT_STARTED') THEN
      RAISE EXCEPTION 'Task creation requires initial status evidence';
    END IF;
    status_event := 'task.created';
  ELSE
    IF NEW."status" IS DISTINCT FROM OLD."status" OR NEW."requiresReassignment" IS DISTINCT FROM OLD."requiresReassignment" THEN
      IF NOT EXISTS (SELECT 1 FROM "task_status_changes" h WHERE h."taskId" = NEW."id" AND h."organizationId" = NEW."organizationId" AND h."taskVersion" = NEW."version" AND h."fromStatus" = OLD."status" AND h."toStatus" = NEW."status") THEN
        RAISE EXCEPTION 'Task state requires immutable transition evidence';
      END IF;
    END IF;
    IF NEW."primaryOwnerEmployeeId" IS DISTINCT FROM OLD."primaryOwnerEmployeeId" AND NOT EXISTS (
      SELECT 1 FROM "task_owner_changes" h WHERE h."taskId" = NEW."id" AND h."organizationId" = NEW."organizationId" AND h."taskVersion" = NEW."version" AND h."oldOwnerEmployeeId" = OLD."primaryOwnerEmployeeId" AND h."newOwnerEmployeeId" = NEW."primaryOwnerEmployeeId") THEN
      RAISE EXCEPTION 'Task owner change requires immutable assignment evidence';
    END IF;
    status_event := CASE WHEN NEW."status" = 'STOPPED_DUE_TO_PROJECT_CANCELLATION' THEN 'task.stopped'
      WHEN NEW."status" = 'WAITING' THEN 'task.waiting' WHEN NEW."primaryOwnerEmployeeId" IS DISTINCT FROM OLD."primaryOwnerEmployeeId" THEN 'task.assigned'
      WHEN NEW."status" = 'COMPLETED' THEN 'task.completed' WHEN NEW."status" = 'IN_PROGRESS' THEN 'task.started' ELSE 'task.updated' END;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "audit_events" a WHERE a."organizationId" = NEW."organizationId" AND a."eventKey" = status_event AND a."subjectType" = 'task' AND a."subjectId" = NEW."id"::text AND (a."after"->>'version')::int = NEW."version") THEN
    RAISE EXCEPTION 'Task mutation requires canonical audit evidence';
  END IF;
  IF NEW."type" = 'CLOSEOUT' AND NOT EXISTS (SELECT 1 FROM "task_closeout_approvals" c WHERE c."taskId" = NEW."id" AND c."organizationId" = NEW."organizationId") THEN
    RAISE EXCEPTION 'Closeout task requires approval evidence';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "tasks_evidence" AFTER INSERT OR UPDATE ON "tasks" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s09_task_evidence"();

CREATE FUNCTION "check_s09_cancelled_project"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_actor UUID; reason TEXT;
BEGIN
  IF NEW."status" <> 'CANCELLED' OR OLD."status" = 'CANCELLED' THEN RETURN NULL; END IF;
  SELECT h."actorId", h."reason" INTO owner_actor, reason FROM "project_status_changes" h WHERE h."projectId" = NEW."id" AND h."organizationId" = NEW."organizationId" AND h."projectVersion" = NEW."version" AND h."toStatus" = 'CANCELLED';
  IF owner_actor IS NULL OR NOT EXISTS (SELECT 1 FROM "accounts" WHERE "id" = owner_actor AND "kind" = 'OWNER') THEN RAISE EXCEPTION 'Cancellation requires Owner status evidence'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "audit_events" a WHERE a."organizationId" = NEW."organizationId" AND a."eventKey" = 'project.cancelled' AND a."subjectId" = NEW."id"::text AND a."actorId" = owner_actor AND a."reason" = reason AND (a."after"->>'version')::int = NEW."version") THEN RAISE EXCEPTION 'Cancellation requires canonical audit evidence'; END IF;
  IF EXISTS (SELECT 1 FROM "tasks" t WHERE t."projectId" = NEW."id" AND t."type" <> 'CLOSEOUT' AND t."status" NOT IN ('COMPLETED','STOPPED_DUE_TO_PROJECT_CANCELLATION')) THEN RAISE EXCEPTION 'Cancellation must stop unfinished delivery tasks'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "project_cancellation_consistency" AFTER UPDATE OF "status" ON "projects" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s09_cancelled_project"();

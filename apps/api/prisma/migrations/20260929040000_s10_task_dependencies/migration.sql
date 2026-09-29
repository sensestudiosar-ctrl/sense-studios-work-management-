-- S10C: same-project finish-to-start links retain their full add/remove history.
ALTER TABLE "tasks" ADD COLUMN "dependencyRevision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "task_status_changes" ADD COLUMN "earlyStartAcknowledged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "task_status_changes" ADD COLUMN "unfinishedPredecessorIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

CREATE TABLE "task_dependencies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "dependentTaskId" UUID NOT NULL,
  "predecessorTaskId" UUID NOT NULL,
  "addedById" UUID NOT NULL,
  "addReason" VARCHAR(1000) NOT NULL,
  "addedTaskVersion" INTEGER NOT NULL,
  "addedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "removedById" UUID,
  "removeReason" VARCHAR(1000),
  "removedTaskVersion" INTEGER,
  "removedAt" TIMESTAMPTZ(3),
  CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_dependencies_distinct_tasks" CHECK ("dependentTaskId" <> "predecessorTaskId"),
  CONSTRAINT "task_dependencies_add_shape" CHECK ("addedTaskVersion" > 1 AND length(btrim("addReason")) BETWEEN 3 AND 1000),
  CONSTRAINT "task_dependencies_remove_shape" CHECK (
    ("removedById" IS NULL AND "removeReason" IS NULL AND "removedTaskVersion" IS NULL AND "removedAt" IS NULL) OR
    ("removedById" IS NOT NULL AND "removeReason" IS NOT NULL AND "removedTaskVersion" > "addedTaskVersion" AND "removedAt" IS NOT NULL AND length(btrim("removeReason")) BETWEEN 3 AND 1000)
  ),
  CONSTRAINT "task_dependencies_dependent_fkey" FOREIGN KEY ("dependentTaskId", "organizationId") REFERENCES "tasks"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "task_dependencies_predecessor_fkey" FOREIGN KEY ("predecessorTaskId", "organizationId") REFERENCES "tasks"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "task_dependencies_addedBy_fkey" FOREIGN KEY ("addedById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "task_dependencies_removedBy_fkey" FOREIGN KEY ("removedById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "task_dependencies_dependentTaskId_addedTaskVersion_key" UNIQUE ("dependentTaskId", "addedTaskVersion"),
  CONSTRAINT "task_dependencies_dependentTaskId_removedTaskVersion_key" UNIQUE ("dependentTaskId", "removedTaskVersion")
);
CREATE UNIQUE INDEX "task_dependencies_one_active_edge" ON "task_dependencies"("dependentTaskId", "predecessorTaskId") WHERE "removedAt" IS NULL;
CREATE INDEX "task_dependencies_org_dependent_active_idx" ON "task_dependencies"("organizationId", "dependentTaskId", "removedAt");
CREATE INDEX "task_dependencies_org_predecessor_active_idx" ON "task_dependencies"("organizationId", "predecessorTaskId", "removedAt");

CREATE FUNCTION "check_s10_dependency_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dependent_project UUID; predecessor_project UUID; dependent_type "TaskType"; predecessor_type "TaskType"; project_status "ProjectStatus";
BEGIN
  SELECT "projectId", "type" INTO dependent_project, dependent_type FROM "tasks" WHERE "id" = NEW."dependentTaskId" AND "organizationId" = NEW."organizationId";
  SELECT "projectId", "type" INTO predecessor_project, predecessor_type FROM "tasks" WHERE "id" = NEW."predecessorTaskId" AND "organizationId" = NEW."organizationId";
  IF dependent_project IS NULL OR predecessor_project IS DISTINCT FROM dependent_project OR dependent_type = 'CLOSEOUT' OR predecessor_type = 'CLOSEOUT' THEN
    RAISE EXCEPTION 'Dependencies require two non-closeout tasks in the same project';
  END IF;
  SELECT "status" INTO project_status FROM "projects" WHERE "id" = dependent_project AND "organizationId" = NEW."organizationId";
  IF project_status IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION 'Dependencies require an Active project'; END IF;
  -- Every insert, including direct SQL, shares the project graph lock.
  PERFORM pg_advisory_xact_lock(hashtextextended(dependent_project::text, 0));
  IF EXISTS (
    WITH RECURSIVE reachable(task_id) AS (
      SELECT NEW."predecessorTaskId"
      UNION
      SELECT d."predecessorTaskId" FROM "task_dependencies" d JOIN reachable r ON d."dependentTaskId" = r.task_id WHERE d."removedAt" IS NULL
    ) SELECT 1 FROM reachable WHERE task_id = NEW."dependentTaskId"
  ) THEN RAISE EXCEPTION 'Task dependency cycle is forbidden'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "task_dependency_insert_graph" BEFORE INSERT ON "task_dependencies" FOR EACH ROW EXECUTE FUNCTION "check_s10_dependency_insert"();

CREATE FUNCTION "guard_s10_dependency_removal"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Task dependency history is append-only'; END IF;
  IF OLD."removedAt" IS NOT NULL OR NEW."removedAt" IS NULL OR
     (to_jsonb(NEW) - ARRAY['removedById','removeReason','removedTaskVersion','removedAt']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['removedById','removeReason','removedTaskVersion','removedAt']) THEN
    RAISE EXCEPTION 'Task dependency history is append-only';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "task_dependency_one_way_remove" BEFORE UPDATE OR DELETE ON "task_dependencies" FOR EACH ROW EXECUTE FUNCTION "guard_s10_dependency_removal"();

CREATE FUNCTION "check_s10_dependency_edge_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE edge_version INTEGER; edge_actor UUID; edge_reason TEXT; edge_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    edge_version := NEW."addedTaskVersion"; edge_actor := NEW."addedById"; edge_reason := NEW."addReason"; edge_action := 'added';
  ELSE
    edge_version := NEW."removedTaskVersion"; edge_actor := NEW."removedById"; edge_reason := NEW."removeReason"; edge_action := 'removed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "tasks" t WHERE t."id" = NEW."dependentTaskId" AND t."organizationId" = NEW."organizationId" AND t."version" >= edge_version)
    OR NOT EXISTS (SELECT 1 FROM "audit_events" a WHERE a."organizationId" = NEW."organizationId" AND a."subjectType" = 'task' AND a."subjectId" = NEW."dependentTaskId"::text
      AND a."eventKey" = 'task.updated' AND a."actorId" = edge_actor AND a."reason" = edge_reason
      AND a."after"->>'version' = edge_version::text AND a."after"->>'dependencyAction' = edge_action AND a."after"->>'dependencyId' = NEW."id"::text)
    OR EXISTS (SELECT 1 FROM "audit_events" other WHERE other."organizationId" = NEW."organizationId" AND other."subjectType" = 'task'
      AND other."subjectId" = NEW."dependentTaskId"::text AND other."after"->>'version' = edge_version::text AND other."eventKey" <> 'task.updated') THEN
    RAISE EXCEPTION 'Task dependency requires matching versioned audit evidence';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "task_dependency_add_evidence" AFTER INSERT ON "task_dependencies" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s10_dependency_edge_evidence"();
CREATE CONSTRAINT TRIGGER "task_dependency_remove_evidence" AFTER UPDATE ON "task_dependencies" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s10_dependency_edge_evidence"();

CREATE FUNCTION "check_s10_dependency_task_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE edge_id UUID; edge_action TEXT; unresolved UUID[];
BEGIN
  IF NEW."dependencyRevision" IS DISTINCT FROM OLD."dependencyRevision" THEN
    IF NEW."dependencyRevision" <> OLD."dependencyRevision" + 1 OR NEW."version" <> OLD."version" + 1 OR
      (to_jsonb(NEW) - ARRAY['dependencyRevision','version','updatedAt']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['dependencyRevision','version','updatedAt']) THEN
      RAISE EXCEPTION 'A dependency edit must be its own versioned task command';
    END IF;
    SELECT d."id", CASE WHEN d."addedTaskVersion" = NEW."version" THEN 'added' ELSE 'removed' END INTO edge_id, edge_action
      FROM "task_dependencies" d WHERE d."dependentTaskId" = NEW."id" AND d."organizationId" = NEW."organizationId"
      AND (d."addedTaskVersion" = NEW."version" OR d."removedTaskVersion" = NEW."version");
    IF edge_id IS NULL OR NOT EXISTS (SELECT 1 FROM "audit_events" a WHERE a."organizationId" = NEW."organizationId" AND a."subjectType" = 'task' AND a."subjectId" = NEW."id"::text
      AND a."eventKey" = 'task.updated' AND a."after"->>'version' = NEW."version"::text AND a."after"->>'dependencyRevision' = NEW."dependencyRevision"::text
      AND a."after"->>'dependencyAction' = edge_action AND a."after"->>'dependencyId' = edge_id::text) THEN
      RAISE EXCEPTION 'Dependency revision requires immutable edge and audit evidence';
    END IF;
  END IF;
  IF OLD."status" = 'NOT_STARTED' AND NEW."status" = 'IN_PROGRESS' THEN
    SELECT COALESCE(array_agg(d."predecessorTaskId" ORDER BY d."predecessorTaskId"), ARRAY[]::UUID[]) INTO unresolved
      FROM "task_dependencies" d JOIN "tasks" predecessor ON predecessor."id" = d."predecessorTaskId"
      WHERE d."dependentTaskId" = NEW."id" AND d."removedAt" IS NULL AND predecessor."status" <> 'COMPLETED';
    IF cardinality(unresolved) > 0 AND NOT EXISTS (
      SELECT 1 FROM "task_status_changes" h JOIN "audit_events" a ON a."organizationId" = h."organizationId"
        AND a."subjectType" = 'task' AND a."subjectId" = h."taskId"::text AND a."eventKey" = 'task.started'
        AND a."actorId" = h."actorId" AND a."reason" = h."reason" AND a."after"->>'version' = h."taskVersion"::text
      WHERE h."taskId" = NEW."id" AND h."taskVersion" = NEW."version" AND h."earlyStartAcknowledged"
        AND h."unfinishedPredecessorIds" = unresolved AND a."after"->>'earlyStartAcknowledged' = 'true'
        AND a."after"->'unfinishedPredecessorIds' = to_jsonb(unresolved)
    ) THEN RAISE EXCEPTION 'Early task start requires explicit dependency acknowledgement and audit evidence'; END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "task_dependency_task_evidence" AFTER UPDATE ON "tasks" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s10_dependency_task_evidence"();

ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ("eventName" IN (
  'template.version_created', 'project.template_applied', 'project.plan_item_completed', 'project.gate_overridden',
  'organization.created', 'organization.branch.created', 'organization.branch.updated', 'organization.team.created',
  'organization.team.updated', 'organization.job_role.created', 'organization.job_role.updated',
  'organization.employee.created', 'organization.employee.membership_changed', 'organization.employee.job_roles_changed',
  'organization.employee.suspended', 'organization.employee.exited', 'authorization.role_permission.changed',
  'authorization.employee_permission.changed', 'audit.corrected', 'audit.retention.notice_interval.updated',
  'audit.retention.hold.placed', 'audit.retention.hold.released', 'audit.retention.notice.acknowledged',
  'project.created', 'project.activated', 'project.on_hold', 'project.scope_changed', 'project.completed',
  'project.archived', 'project.assignment_changed', 'project.lead_changed', 'project.transferred',
  'project.scope_policy_changed', 'project.scope_requested', 'project.cancellation_requested', 'project.cancelled',
  'task.created', 'task.assigned', 'task.started', 'task.waiting', 'task.overdue', 'task.completed',
  'task.deadline_changed', 'task.updated', 'task.stopped', 'task.closeout_approved', 'task.dependency_completed',
  'review.requested', 'review.started', 'review.correction_requested', 'review.approved',
  'client.review_requested', 'client.revision_requested', 'client.approved', 'document.uploaded',
  'revision.created', 'document.approved', 'document.issued', 'document.superseded',
  'time.started', 'time.logged', 'time.changed', 'leave.requested', 'leave.approved', 'attendance.checked_in',
  'employee_performance.changed', 'project_health.changed', 'capacity.threshold_exceeded',
  'approval.requested', 'approval.delegated', 'approval.withdrawn', 'approval.decided',
  'crm.lead.created', 'crm.lead.updated', 'crm.lead.stage_changed', 'crm.lead.activity_recorded',
  'crm.client.created', 'crm.client.updated', 'crm.source.created', 'crm.source.updated'
));

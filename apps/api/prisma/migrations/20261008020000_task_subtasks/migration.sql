-- Immutable one-level links preserve existing task rows and raw task serializers.
CREATE TABLE "task_subtask_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "parentTaskId" UUID NOT NULL,
  "childTaskId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_subtask_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_subtask_links_childTaskId_organizationId_key" UNIQUE ("childTaskId", "organizationId"),
  CONSTRAINT "task_subtask_links_distinct_check" CHECK ("parentTaskId" <> "childTaskId"),
  CONSTRAINT "task_subtask_links_reason_check" CHECK (length(trim("reason")) BETWEEN 3 AND 1000),
  CONSTRAINT "task_subtask_links_parent_fkey" FOREIGN KEY ("parentTaskId", "organizationId") REFERENCES "tasks"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "task_subtask_links_child_fkey" FOREIGN KEY ("childTaskId", "organizationId") REFERENCES "tasks"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "task_subtask_links_project_fkey" FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "task_subtask_links_creator_fkey" FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX "task_subtask_links_organizationId_parentTaskId_childTaskId_idx" ON "task_subtask_links"("organizationId", "parentTaskId", "childTaskId");

-- Both explicit finish-to-start dependencies and parent completion requirements
-- point from the task needing completion to the work it needs completed first.
CREATE FUNCTION "task_completion_path_exists"(org_id UUID, start_id UUID, target_id UUID) RETURNS boolean LANGUAGE sql VOLATILE AS $$
  WITH RECURSIVE edges(dependent_id, prerequisite_id) AS (
    SELECT "dependentTaskId", "predecessorTaskId" FROM "task_dependencies" WHERE "organizationId"=org_id AND "removedAt" IS NULL
    UNION ALL
    SELECT "parentTaskId", "childTaskId" FROM "task_subtask_links" WHERE "organizationId"=org_id
  ), reachable(task_id) AS (
    SELECT start_id
    UNION
    SELECT edge.prerequisite_id FROM edges edge JOIN reachable r ON edge.dependent_id=r.task_id
  ) SELECT EXISTS (SELECT 1 FROM reachable WHERE task_id=target_id)
$$;

CREATE FUNCTION "guard_task_subtask_link"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent "tasks"%ROWTYPE; child "tasks"%ROWTYPE; project_state "ProjectStatus";
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Subtask links are immutable'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."projectId"::text, 0));
  -- Deterministic order also serializes competing A->B and B->A links.
  PERFORM "id" FROM "tasks" WHERE "id" IN (NEW."parentTaskId", NEW."childTaskId") ORDER BY "id" FOR UPDATE;
  SELECT * INTO parent FROM "tasks" WHERE "id"=NEW."parentTaskId" AND "organizationId"=NEW."organizationId";
  SELECT * INTO child FROM "tasks" WHERE "id"=NEW."childTaskId" AND "organizationId"=NEW."organizationId";
  IF parent."id" IS NULL OR child."id" IS NULL OR parent."id"=child."id" OR parent."projectId" IS NULL
     OR parent."projectId" IS DISTINCT FROM NEW."projectId" OR child."projectId" IS DISTINCT FROM NEW."projectId" THEN
    RAISE EXCEPTION 'Subtasks require distinct tasks in the same project and organization';
  END IF;
  IF EXISTS (SELECT 1 FROM "task_subtask_links" WHERE "childTaskId"=NEW."parentTaskId")
     OR EXISTS (SELECT 1 FROM "task_subtask_links" WHERE "parentTaskId"=NEW."childTaskId") THEN
    RAISE EXCEPTION 'Subtasks support one level only';
  END IF;
  IF "task_completion_path_exists"(NEW."organizationId", NEW."childTaskId", NEW."parentTaskId") THEN
    RAISE EXCEPTION 'Task dependency or subtask completion cycle is forbidden';
  END IF;
  SELECT "status" INTO project_state FROM "projects" WHERE "id"=NEW."projectId" AND "organizationId"=NEW."organizationId" FOR SHARE;
  IF project_state IS DISTINCT FROM 'ACTIVE'::"ProjectStatus" OR parent."requiresReassignment"
     OR parent."type"='CLOSEOUT' OR parent."status" IN ('SUBMITTED_INTERNAL_REVIEW','IN_INTERNAL_REVIEW','INTERNAL_APPROVED','SUBMITTED_CLIENT_REVIEW','IN_CLIENT_REVIEW','CLIENT_APPROVED','COMPLETED','STOPPED_DUE_TO_PROJECT_CANCELLATION')
     OR child."status" <> 'NOT_STARTED' OR child."version" <> 1 THEN
    RAISE EXCEPTION 'Task state does not permit adding a subtask';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "task_subtask_link_guard" BEFORE INSERT OR UPDATE OR DELETE ON "task_subtask_links" FOR EACH ROW EXECUTE FUNCTION "guard_task_subtask_link"();

CREATE FUNCTION "guard_task_subtask_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "audit_events" audit JOIN "domain_events" event
      ON event."payload"->>'auditEventId'=audit."id"::text
      AND event."organizationId"=audit."organizationId" AND event."subjectId"=audit."subjectId" AND event."eventName"=audit."eventKey"
    WHERE audit."organizationId"=NEW."organizationId" AND audit."subjectId"=NEW."childTaskId"::text AND audit."eventKey"='task.created'
      AND audit."actorId"=NEW."createdById" AND audit."reason"=NEW."reason"
      AND audit."after"->>'parentTaskId'=NEW."parentTaskId"::text
      AND audit."after"->>'projectId'=NEW."projectId"::text
  ) OR NOT EXISTS (
    SELECT 1 FROM "audit_events" audit JOIN "domain_events" event
      ON event."payload"->>'auditEventId'=audit."id"::text
      AND event."organizationId"=audit."organizationId" AND event."subjectId"=audit."subjectId" AND event."eventName"=audit."eventKey"
    WHERE audit."organizationId"=NEW."organizationId" AND audit."subjectId"=NEW."parentTaskId"::text AND audit."eventKey"='task.updated'
      AND audit."actorId"=NEW."createdById" AND audit."reason"=NEW."reason"
      AND audit."after"->>'subtaskAction'='created' AND audit."after"->>'childTaskId'=NEW."childTaskId"::text
  ) THEN RAISE EXCEPTION 'Subtask link requires canonical child and parent evidence'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "task_subtask_evidence_guard" AFTER INSERT ON "task_subtask_links" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "guard_task_subtask_evidence"();

CREATE FUNCTION "guard_task_subtask_completion"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."organizationId" IS DISTINCT FROM OLD."organizationId" OR NEW."projectId" IS DISTINCT FROM OLD."projectId" THEN
    IF EXISTS (SELECT 1 FROM "task_subtask_links" WHERE "parentTaskId"=OLD."id" OR "childTaskId"=OLD."id") THEN
      RAISE EXCEPTION 'Linked subtask scope is immutable';
    END IF;
  END IF;
  IF OLD."status"='COMPLETED' AND NEW."status" <> 'COMPLETED' THEN
    PERFORM parent."id" FROM "task_subtask_links" link JOIN "tasks" parent ON parent."id"=link."parentTaskId" AND parent."organizationId"=link."organizationId"
      WHERE link."childTaskId"=OLD."id" AND link."organizationId"=OLD."organizationId" FOR SHARE OF parent;
    IF EXISTS (
      SELECT 1 FROM "task_subtask_links" link JOIN "tasks" parent ON parent."id"=link."parentTaskId" AND parent."organizationId"=link."organizationId"
      WHERE link."childTaskId"=OLD."id" AND link."organizationId"=OLD."organizationId" AND parent."status"='COMPLETED'
    ) THEN RAISE EXCEPTION 'A completed parent requires every child to remain completed'; END IF;
  END IF;
  IF NEW."status"='COMPLETED' AND OLD."status" IS DISTINCT FROM NEW."status" AND EXISTS (
    SELECT 1 FROM "task_subtask_links" link JOIN "tasks" child ON child."id"=link."childTaskId" AND child."organizationId"=link."organizationId"
    WHERE link."parentTaskId"=NEW."id" AND link."organizationId"=NEW."organizationId" AND child."status" <> 'COMPLETED'
  ) THEN RAISE EXCEPTION 'Complete all subtasks before completing the parent task'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "task_subtask_completion_guard" BEFORE UPDATE ON "tasks" FOR EACH ROW EXECUTE FUNCTION "guard_task_subtask_completion"();

-- Extend the existing dependency guard in this new forward migration only.
CREATE OR REPLACE FUNCTION "check_s10_dependency_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dependent_project UUID; predecessor_project UUID; dependent_type "TaskType"; predecessor_type "TaskType"; project_status "ProjectStatus";
BEGIN
  SELECT "projectId", "type" INTO dependent_project, dependent_type FROM "tasks" WHERE "id"=NEW."dependentTaskId" AND "organizationId"=NEW."organizationId";
  SELECT "projectId", "type" INTO predecessor_project, predecessor_type FROM "tasks" WHERE "id"=NEW."predecessorTaskId" AND "organizationId"=NEW."organizationId";
  IF dependent_project IS NULL OR predecessor_project IS DISTINCT FROM dependent_project OR dependent_type='CLOSEOUT' OR predecessor_type='CLOSEOUT' THEN
    RAISE EXCEPTION 'Dependencies require two non-closeout tasks in the same project';
  END IF;
  SELECT "status" INTO project_status FROM "projects" WHERE "id"=dependent_project AND "organizationId"=NEW."organizationId";
  IF project_status IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION 'Dependencies require an Active project'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(dependent_project::text, 0));
  IF "task_completion_path_exists"(NEW."organizationId", NEW."predecessorTaskId", NEW."dependentTaskId") THEN
    RAISE EXCEPTION 'Task dependency or subtask completion cycle is forbidden';
  END IF;
  RETURN NEW;
END $$;

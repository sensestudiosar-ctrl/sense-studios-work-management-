-- Owner-approved V1-05C: one task-owned append-only retry identity.
CREATE TABLE "task_creation_receipts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "actorId" UUID NOT NULL,
  "key" UUID NOT NULL,
  "command" VARCHAR(24) NOT NULL,
  "parentTaskId" UUID,
  "taskId" UUID NOT NULL,
  "payloadHash" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_creation_receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_creation_receipts_organizationId_actorId_key_key" UNIQUE ("organizationId", "actorId", "key"),
  CONSTRAINT "task_creation_receipts_kind_check" CHECK (
    ("command"='CREATE_TASK' AND "parentTaskId" IS NULL) OR
    ("command"='CREATE_SUBTASK' AND "parentTaskId" IS NOT NULL AND "parentTaskId"<>"taskId")
  ),
  CONSTRAINT "task_creation_receipts_hash_check" CHECK ("payloadHash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "task_creation_receipts_task_fkey" FOREIGN KEY ("taskId", "organizationId") REFERENCES "tasks"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "task_creation_receipts_parent_fkey" FOREIGN KEY ("parentTaskId", "organizationId") REFERENCES "tasks"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "task_creation_receipts_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "task_creation_receipts_actor_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE FUNCTION "guard_task_creation_receipt"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Task creation receipts are immutable'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "tasks" task JOIN "accounts" actor ON actor."id"=NEW."actorId"
    WHERE task."id"=NEW."taskId" AND task."organizationId"=NEW."organizationId"
      AND task."createdById"=NEW."actorId" AND actor."kind" IN ('OWNER','STAFF')
      AND (actor."kind"='OWNER' OR EXISTS (SELECT 1 FROM "employees" employee
        WHERE employee."accountId"=actor."id" AND employee."organizationId"=NEW."organizationId"))
  ) THEN RAISE EXCEPTION 'Task creation receipt actor and task scope must match'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "task_creation_receipt_guard" BEFORE INSERT OR UPDATE OR DELETE ON "task_creation_receipts" FOR EACH ROW EXECUTE FUNCTION "guard_task_creation_receipt"();

-- Deferred because the child link and parent evidence are recorded by the same command.
CREATE FUNCTION "guard_task_creation_receipt_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."command"='CREATE_SUBTASK' AND NOT EXISTS (
    SELECT 1 FROM "task_subtask_links" link WHERE link."organizationId"=NEW."organizationId"
      AND link."parentTaskId"=NEW."parentTaskId" AND link."childTaskId"=NEW."taskId" AND link."createdById"=NEW."actorId"
  )) OR (NEW."command"='CREATE_TASK' AND EXISTS (
    SELECT 1 FROM "task_subtask_links" link WHERE link."childTaskId"=NEW."taskId"
  )) OR NOT EXISTS (
    SELECT 1 FROM "audit_events" audit JOIN "domain_events" event
      ON event."payload"->>'auditEventId'=audit."id"::text
      AND event."organizationId"=audit."organizationId" AND event."subjectId"=audit."subjectId" AND event."eventName"=audit."eventKey"
    WHERE audit."organizationId"=NEW."organizationId" AND audit."subjectId"=NEW."taskId"::text
      AND audit."eventKey"='task.created' AND audit."actorId"=NEW."actorId"
  ) THEN RAISE EXCEPTION 'Task creation receipt requires canonical task evidence'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "task_creation_receipt_evidence_guard" AFTER INSERT ON "task_creation_receipts" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "guard_task_creation_receipt_evidence"();

CREATE TYPE "TaskRecurrenceFrequency" AS ENUM ('DAILY','WEEKLY','MONTHLY');
CREATE TABLE "task_recurrence_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "sourceTaskId" UUID NOT NULL, "frequency" "TaskRecurrenceFrequency" NOT NULL,
  "anchorDate" DATE NOT NULL, "effectiveFromDate" DATE NOT NULL, "paused" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1, "configuredById" UUID NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_recurrence_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_recurrence_rules_id_organizationId_key" UNIQUE ("id","organizationId"),
  CONSTRAINT "task_recurrence_rules_sourceTaskId_key" UNIQUE ("sourceTaskId"),
  CONSTRAINT "task_recurrence_rules_sourceTaskId_organizationId_key" UNIQUE ("sourceTaskId","organizationId"),
  CONSTRAINT "task_recurrence_rules_shape" CHECK ("version">0 AND "effectiveFromDate">="anchorDate"),
  CONSTRAINT "task_recurrence_rules_source_fkey" FOREIGN KEY ("sourceTaskId","organizationId") REFERENCES "tasks"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "task_recurrence_rules_actor_fkey" FOREIGN KEY ("configuredById") REFERENCES "accounts"("id") ON DELETE RESTRICT
);
CREATE INDEX "task_recurrence_rules_org_paused_idx" ON "task_recurrence_rules"("organizationId","paused");
CREATE TABLE "task_recurrence_changes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "ruleId" UUID NOT NULL,
  "ruleVersion" INTEGER NOT NULL, "action" VARCHAR(20) NOT NULL, "actorId" UUID NOT NULL,
  "reason" VARCHAR(1000) NOT NULL, "before" JSONB, "after" JSONB NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_recurrence_changes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_recurrence_changes_ruleId_ruleVersion_key" UNIQUE ("ruleId","ruleVersion"),
  CONSTRAINT "task_recurrence_changes_shape" CHECK ("ruleVersion">0 AND "action" IN ('configured','paused','resumed') AND length(btrim("reason")) BETWEEN 3 AND 1000),
  CONSTRAINT "task_recurrence_changes_rule_fkey" FOREIGN KEY ("ruleId","organizationId") REFERENCES "task_recurrence_rules"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "task_recurrence_changes_actor_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT
);
CREATE TABLE "task_recurrence_occurrences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "ruleId" UUID NOT NULL,
  "scheduledDate" DATE NOT NULL, "generatedTaskId" UUID NOT NULL, "ruleVersion" INTEGER NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_recurrence_occurrences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_recurrence_occurrences_ruleId_scheduledDate_key" UNIQUE ("ruleId","scheduledDate"),
  CONSTRAINT "task_recurrence_occurrences_generatedTaskId_key" UNIQUE ("generatedTaskId"),
  CONSTRAINT "task_recurrence_occurrences_generatedTaskId_organizationId_key" UNIQUE ("generatedTaskId","organizationId"),
  CONSTRAINT "task_recurrence_occurrences_rule_fkey" FOREIGN KEY ("ruleId","organizationId") REFERENCES "task_recurrence_rules"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "task_recurrence_occurrences_task_fkey" FOREIGN KEY ("generatedTaskId","organizationId") REFERENCES "tasks"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "task_recurrence_occurrences_version" CHECK ("ruleVersion">0)
);
CREATE TRIGGER "task_recurrence_changes_append_only" BEFORE UPDATE OR DELETE ON "task_recurrence_changes" FOR EACH ROW EXECUTE FUNCTION "guard_s09_append_only"();
CREATE TRIGGER "task_recurrence_occurrences_append_only" BEFORE UPDATE OR DELETE ON "task_recurrence_occurrences" FOR EACH ROW EXECUTE FUNCTION "guard_s09_append_only"();

CREATE FUNCTION "guard_s10_recurrence_rule"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Recurrence history cannot be deleted'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."version"<>1 OR NOT EXISTS (SELECT 1 FROM "tasks" t WHERE t."id"=NEW."sourceTaskId" AND t."organizationId"=NEW."organizationId" AND t."type"='RECURRING') THEN
      RAISE EXCEPTION 'Recurrence requires a RECURRING source task and initial version';
    END IF;
  ELSIF ROW(NEW."id",NEW."organizationId",NEW."sourceTaskId",NEW."createdAt") IS DISTINCT FROM ROW(OLD."id",OLD."organizationId",OLD."sourceTaskId",OLD."createdAt") OR NEW."version"<>OLD."version"+1 THEN
    RAISE EXCEPTION 'Recurrence identity is immutable and version must advance once';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "task_recurrence_rule_guard" BEFORE INSERT OR UPDATE OR DELETE ON "task_recurrence_rules" FOR EACH ROW EXECUTE FUNCTION "guard_s10_recurrence_rule"();

CREATE FUNCTION "check_s10_recurrence_rule_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "task_recurrence_changes" h JOIN "audit_events" a ON a."organizationId"=h."organizationId" AND a."subjectType"='task_recurrence' AND a."subjectId"=h."ruleId"::text
      AND a."eventKey"='task.recurrence_'||h."action" AND a."actorId"=h."actorId" AND a."reason"=h."reason" AND a."after"->>'version'=h."ruleVersion"::text
    WHERE h."ruleId"=NEW."id" AND h."organizationId"=NEW."organizationId" AND h."ruleVersion"=NEW."version" AND h."actorId"=NEW."configuredById"
      AND h."after"->>'frequency'=NEW."frequency"::text AND h."after"->>'anchorDate'=NEW."anchorDate"::text
      AND h."after"->>'effectiveFromDate'=NEW."effectiveFromDate"::text AND h."after"->>'paused'=NEW."paused"::text
      AND (a."after" - 'sourceTaskId')=h."after"
      AND (TG_OP='INSERT' AND h."before" IS NULL OR TG_OP='UPDATE' AND h."before"->>'version'=OLD."version"::text)
  ) THEN RAISE EXCEPTION 'Recurrence mutation requires immutable history and canonical audit evidence'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "task_recurrence_rule_evidence" AFTER INSERT OR UPDATE ON "task_recurrence_rules" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s10_recurrence_rule_evidence"();

CREATE FUNCTION "check_s10_recurrence_history_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "task_recurrence_rules" r WHERE r."id"=NEW."ruleId" AND r."organizationId"=NEW."organizationId" AND r."version">=NEW."ruleVersion") OR NOT EXISTS (
    SELECT 1 FROM "audit_events" a WHERE a."organizationId"=NEW."organizationId" AND a."subjectType"='task_recurrence' AND a."subjectId"=NEW."ruleId"::text
      AND a."eventKey"='task.recurrence_'||NEW."action" AND a."actorId"=NEW."actorId" AND a."reason"=NEW."reason"
      AND a."after"->>'version'=NEW."ruleVersion"::text AND (a."after" - 'sourceTaskId')=NEW."after" AND a."before" IS NOT DISTINCT FROM NEW."before"
  ) THEN RAISE EXCEPTION 'Recurrence history requires matching canonical audit evidence'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "task_recurrence_history_evidence" AFTER INSERT ON "task_recurrence_changes" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s10_recurrence_history_evidence"();

CREATE FUNCTION "check_s10_recurrence_occurrence_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "tasks" t WHERE t."id"=NEW."generatedTaskId" AND t."organizationId"=NEW."organizationId" AND t."type"='RECURRING' AND t."targetDate"=NEW."scheduledDate") OR NOT EXISTS (
    SELECT 1 FROM "audit_events" a WHERE a."organizationId"=NEW."organizationId" AND a."subjectType"='task_recurrence' AND a."subjectId"=NEW."ruleId"::text AND a."eventKey"='task.recurrence_generated'
      AND a."after"->>'occurrenceId'=NEW."id"::text AND a."after"->>'generatedTaskId'=NEW."generatedTaskId"::text
      AND a."after"->>'scheduledDate'=NEW."scheduledDate"::text AND a."after"->>'ruleVersion'=NEW."ruleVersion"::text
  ) THEN RAISE EXCEPTION 'Recurrence occurrence requires generated task and canonical audit evidence'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "task_recurrence_occurrence_evidence" AFTER INSERT ON "task_recurrence_occurrences" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s10_recurrence_occurrence_evidence"();

-- Preserve every prior catalogue entry, including extension and dependency events.
DO $$
DECLARE prior_expression TEXT;
BEGIN
  SELECT pg_get_expr(conbin,conrelid) INTO prior_expression FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
  ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
  EXECUTE format('ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName" IN (''task.recurrence_configured'',''task.recurrence_paused'',''task.recurrence_resumed'',''task.recurrence_generated''))',prior_expression);
END $$;

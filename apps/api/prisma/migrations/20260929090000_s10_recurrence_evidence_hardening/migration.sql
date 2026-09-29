-- Preserve applied migration34 and strengthen both directions of its evidence.
CREATE FUNCTION "s10_recurrence_canonical_delivery"(audit_id UUID) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM "audit_events" a JOIN "domain_events" e ON e."organizationId"=a."organizationId"
      AND e."eventName"=a."eventKey" AND e."subjectType"=a."subjectType" AND e."subjectId"=a."subjectId"
      AND e."actorId"=a."actorId" AND e."correlationId"=a."correlationId" AND e."payload"->>'auditEventId'=a."id"::text
    JOIN "outbox_deliveries" o ON o."eventId"=e."id" AND o."consumer"='NTF' WHERE a."id"=audit_id
  )
$$;

CREATE OR REPLACE FUNCTION "check_s10_recurrence_rule_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_snapshot JSONB; previous_snapshot JSONB;
BEGIN
  current_snapshot := jsonb_build_object('frequency',NEW."frequency",'anchorDate',NEW."anchorDate"::text,'effectiveFromDate',NEW."effectiveFromDate"::text,'paused',NEW."paused",'version',NEW."version",'configuredById',NEW."configuredById"::text);
  IF TG_OP='UPDATE' THEN
    previous_snapshot := jsonb_build_object('frequency',OLD."frequency",'anchorDate',OLD."anchorDate"::text,'effectiveFromDate',OLD."effectiveFromDate"::text,'paused',OLD."paused",'version',OLD."version",'configuredById',OLD."configuredById"::text);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "task_recurrence_changes" h JOIN "audit_events" a ON a."organizationId"=h."organizationId"
      AND a."subjectType"='task_recurrence' AND a."subjectId"=h."ruleId"::text AND a."eventKey"='task.recurrence_'||h."action"
      AND a."actorId"=h."actorId" AND a."reason"=h."reason"
    WHERE h."ruleId"=NEW."id" AND h."organizationId"=NEW."organizationId" AND h."ruleVersion"=NEW."version" AND h."actorId"=NEW."configuredById"
      AND h."after"=current_snapshot AND h."before" IS NOT DISTINCT FROM previous_snapshot
      AND a."after"=current_snapshot||jsonb_build_object('sourceTaskId',NEW."sourceTaskId"::text)
      AND a."before" IS NOT DISTINCT FROM previous_snapshot AND "s10_recurrence_canonical_delivery"(a."id")
      AND (h."action"='configured' OR h."action"='paused' AND NEW."paused" AND NOT OLD."paused"
        OR h."action"='resumed' AND NOT NEW."paused" AND OLD."paused")
  ) THEN RAISE EXCEPTION 'Recurrence mutation requires immutable history and canonical audit/event/outbox evidence'; END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION "check_s10_recurrence_history_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "task_recurrence_rules" r WHERE r."id"=NEW."ruleId" AND r."organizationId"=NEW."organizationId" AND r."version">=NEW."ruleVersion") OR NOT EXISTS (
    SELECT 1 FROM "audit_events" a JOIN "task_recurrence_rules" r ON r."id"=NEW."ruleId" AND r."organizationId"=NEW."organizationId"
    WHERE a."organizationId"=NEW."organizationId" AND a."subjectType"='task_recurrence' AND a."subjectId"=NEW."ruleId"::text
      AND a."eventKey"='task.recurrence_'||NEW."action" AND a."actorId"=NEW."actorId" AND a."reason"=NEW."reason"
      AND a."after"->>'version'=NEW."ruleVersion"::text AND a."after"=NEW."after"||jsonb_build_object('sourceTaskId',r."sourceTaskId"::text)
      AND a."before" IS NOT DISTINCT FROM NEW."before" AND "s10_recurrence_canonical_delivery"(a."id")
  ) THEN RAISE EXCEPTION 'Recurrence history requires matching canonical audit/event/outbox evidence'; END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION "check_s10_recurrence_occurrence_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_id UUID;
BEGIN
  SELECT "sourceTaskId" INTO source_id FROM "task_recurrence_rules" WHERE "id"=NEW."ruleId" AND "organizationId"=NEW."organizationId";
  IF source_id IS NULL OR source_id=NEW."generatedTaskId" OR NOT EXISTS (
    SELECT 1 FROM "task_recurrence_changes" h WHERE h."ruleId"=NEW."ruleId" AND h."organizationId"=NEW."organizationId" AND h."ruleVersion"=NEW."ruleVersion"
      AND h."after"->>'paused'='false' AND NEW."scheduledDate">=(h."after"->>'effectiveFromDate')::date
      AND CASE h."after"->>'frequency'
        WHEN 'DAILY' THEN true
        WHEN 'WEEKLY' THEN (NEW."scheduledDate"-(h."after"->>'anchorDate')::date)%7=0
        WHEN 'MONTHLY' THEN extract(day FROM NEW."scheduledDate")=least(extract(day FROM (h."after"->>'anchorDate')::date),extract(day FROM date_trunc('month',NEW."scheduledDate")+interval '1 month - 1 day'))
        ELSE false END
  ) OR NOT EXISTS (
    SELECT 1 FROM "tasks" t JOIN "audit_events" a ON a."organizationId"=t."organizationId" AND a."subjectType"='task' AND a."subjectId"=t."id"::text AND a."eventKey"='task.created'
    WHERE t."id"=NEW."generatedTaskId" AND t."organizationId"=NEW."organizationId" AND t."type"='RECURRING'
      AND t."targetDate"=NEW."scheduledDate" AND t."version"=1 AND t."status"='NOT_STARTED' AND t."committedDueDate" IS NULL
      -- Created-at is immutable under the task guard; historical tasks cannot
      -- be relabelled as new occurrences. This also works within savepoints.
      AND t."createdAt">=date_trunc('milliseconds',transaction_timestamp())
      AND a."after"->>'version'='1' AND a."reason"='Scheduled recurring task occurrence' AND "s10_recurrence_canonical_delivery"(a."id")
  ) OR NOT EXISTS (
    SELECT 1 FROM "audit_events" a WHERE a."organizationId"=NEW."organizationId" AND a."subjectType"='task_recurrence' AND a."subjectId"=NEW."ruleId"::text AND a."eventKey"='task.recurrence_generated'
      AND a."after"->>'occurrenceId'=NEW."id"::text AND a."after"->>'sourceTaskId'=source_id::text AND a."after"->>'generatedTaskId'=NEW."generatedTaskId"::text
      AND a."after"->>'scheduledDate'=NEW."scheduledDate"::text AND a."after"->>'ruleVersion'=NEW."ruleVersion"::text AND "s10_recurrence_canonical_delivery"(a."id")
  ) THEN RAISE EXCEPTION 'Recurrence occurrence requires its new task, schedule version and canonical audit/event/outbox evidence'; END IF;
  RETURN NULL;
END $$;

-- Validate the approved copy at occurrence insertion, before later legitimate
-- source edits can change it. Prior migrations34/36 remain immutable.
CREATE FUNCTION "guard_s10_recurrence_occurrence_copy"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_id UUID;
BEGIN
  SELECT "sourceTaskId" INTO source_id FROM "task_recurrence_rules" WHERE "id"=NEW."ruleId" AND "organizationId"=NEW."organizationId";
  IF source_id IS NULL OR source_id=NEW."generatedTaskId" OR NOT EXISTS (
    SELECT 1 FROM "tasks" generated JOIN "tasks" source ON source."id"=source_id AND source."organizationId"=generated."organizationId"
    WHERE generated."id"=NEW."generatedTaskId" AND generated."organizationId"=NEW."organizationId"
      AND generated."type"='RECURRING' AND generated."version"=1 AND generated."status"='NOT_STARTED'
      AND generated."targetDate"=NEW."scheduledDate" AND generated."committedDueDate" IS NULL AND generated."startDate" IS NULL
      AND ROW(generated."title",generated."description",generated."priority",generated."primaryOwnerEmployeeId",generated."estimatedHours",generated."tags",generated."checklist",generated."reviewRequirement",generated."projectId")
        IS NOT DISTINCT FROM ROW(source."title",source."description",source."priority",source."primaryOwnerEmployeeId",source."estimatedHours",source."tags",source."checklist",source."reviewRequirement",source."projectId")
  ) OR EXISTS (SELECT 1 FROM "task_dependencies" WHERE "dependentTaskId"=NEW."generatedTaskId" OR "predecessorTaskId"=NEW."generatedTaskId")
    OR EXISTS (SELECT 1 FROM "task_recurrence_rules" WHERE "sourceTaskId"=NEW."generatedTaskId")
    OR EXISTS (
      (SELECT "employeeId","estimatedHours" FROM "task_collaborators" WHERE "taskId"=source_id EXCEPT SELECT "employeeId","estimatedHours" FROM "task_collaborators" WHERE "taskId"=NEW."generatedTaskId")
      UNION ALL
      (SELECT "employeeId","estimatedHours" FROM "task_collaborators" WHERE "taskId"=NEW."generatedTaskId" EXCEPT SELECT "employeeId","estimatedHours" FROM "task_collaborators" WHERE "taskId"=source_id)
    ) THEN RAISE EXCEPTION 'Recurrence occurrence must copy the approved current source fields and collaborators'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "task_recurrence_occurrence_copy_guard" BEFORE INSERT ON "task_recurrence_occurrences" FOR EACH ROW EXECUTE FUNCTION "guard_s10_recurrence_occurrence_copy"();

CREATE FUNCTION "check_s10_recurrence_occurrence_actor"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "task_recurrence_changes" h JOIN "audit_events" generation ON generation."organizationId"=h."organizationId"
      AND generation."subjectType"='task_recurrence' AND generation."subjectId"=h."ruleId"::text AND generation."eventKey"='task.recurrence_generated'
      AND generation."after"->>'occurrenceId'=NEW."id"::text AND generation."actorId"::text=h."after"->>'configuredById'
    JOIN "tasks" generated ON generated."id"=NEW."generatedTaskId" AND generated."createdById"=generation."actorId"
    JOIN "audit_events" creation ON creation."organizationId"=NEW."organizationId" AND creation."subjectType"='task'
      AND creation."subjectId"=generated."id"::text AND creation."eventKey"='task.created' AND creation."actorId"=generation."actorId"
    WHERE h."ruleId"=NEW."ruleId" AND h."ruleVersion"=NEW."ruleVersion" AND h."organizationId"=NEW."organizationId"
      AND "s10_recurrence_canonical_delivery"(generation."id") AND "s10_recurrence_canonical_delivery"(creation."id")
  ) THEN RAISE EXCEPTION 'Recurrence generation must use the currently evidenced configuration actor'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "task_recurrence_occurrence_actor_evidence" AFTER INSERT ON "task_recurrence_occurrences" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s10_recurrence_occurrence_actor"();

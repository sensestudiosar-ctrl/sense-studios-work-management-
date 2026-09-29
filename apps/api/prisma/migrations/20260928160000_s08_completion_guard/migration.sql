-- Qualify project status to avoid PL/pgSQL variable/column ambiguity; retain target baseline.
CREATE OR REPLACE FUNCTION "protect_s08_plan_item"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE definition JSONB; entry JSONB; item_project_status "ProjectStatus";
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Project plan items are retained'; END IF;
 IF TG_OP = 'UPDATE' THEN
  IF (to_jsonb(NEW) - 'completedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'completedAt') OR OLD."completedAt" IS NOT NULL OR NEW."completedAt" IS NULL THEN RAISE EXCEPTION 'Only first completion is permitted'; END IF;
  SELECT p."status" INTO item_project_status FROM "projects" p WHERE p."id" = NEW."projectId";
  IF item_project_status <> 'ACTIVE' THEN RAISE EXCEPTION 'Plan completion requires Active project'; END IF;
 ELSE
  SELECT pp."definition" INTO definition FROM "project_plans" pp JOIN "projects" p ON p."id" = pp."projectId" WHERE pp."projectId" = NEW."projectId" AND pp."organizationId" = NEW."organizationId" AND p."status" = 'DRAFT' AND p."version" = 1;
  IF definition IS NULL OR NEW."completedAt" IS NOT NULL THEN RAISE EXCEPTION 'Items must originate in initial Draft plan'; END IF;
  entry := (definition->CASE WHEN NEW."kind" = 'STAGE' THEN 'stages' ELSE 'milestones' END)->NEW."position";
  IF entry IS NULL OR entry->>'key' IS DISTINCT FROM NEW."key" OR entry->>'label' IS DISTINCT FROM NEW."label" OR
    (NEW."kind" = 'MILESTONE' AND (entry->>'stageKey' IS DISTINCT FROM NEW."stageKey" OR (entry->>'required')::boolean IS DISTINCT FROM NEW."required")) THEN RAISE EXCEPTION 'Item must match applied template'; END IF;
  IF NEW."kind" = 'MILESTONE' AND NEW."targetAt" IS DISTINCT FROM (SELECT CASE WHEN entry ? 'targetOffsetDays' THEN p."createdAt" + ((entry->>'targetOffsetDays')::integer * interval '1 day') ELSE NULL END FROM "projects" p WHERE p."id" = NEW."projectId") THEN RAISE EXCEPTION 'Milestone target must retain template baseline'; END IF;
 END IF;
 RETURN NEW;
END $$;

ALTER TABLE "tasks" ADD COLUMN "planItemId" UUID, ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}', ADD COLUMN "checklist" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_planItemId_organizationId_fkey" FOREIGN KEY ("planItemId","organizationId") REFERENCES "project_plan_items"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_checklist_array" CHECK (jsonb_typeof("checklist") = 'array' AND jsonb_array_length("checklist") <= 10);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tags_size" CHECK (cardinality("tags") <= 10);
CREATE FUNCTION "guard_s09_optional_fields"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."planItemId" IS NOT NULL AND (NEW."projectId" IS NULL OR NOT EXISTS (SELECT 1 FROM "project_plan_items" p WHERE p."id" = NEW."planItemId" AND p."organizationId" = NEW."organizationId" AND p."projectId" = NEW."projectId")) THEN
    RAISE EXCEPTION 'Task plan item must belong to its project';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(NEW."tags") tag WHERE length(btrim(tag)) NOT BETWEEN 1 AND 30) OR cardinality(NEW."tags") <> (SELECT count(DISTINCT tag) FROM unnest(NEW."tags") tag) THEN RAISE EXCEPTION 'Invalid or duplicate task tags'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW."checklist") item WHERE jsonb_typeof(item) <> 'object' OR jsonb_typeof(item->'label') IS DISTINCT FROM 'string' OR length(btrim(item->>'label')) NOT BETWEEN 1 AND 120 OR jsonb_typeof(item->'checked') IS DISTINCT FROM 'boolean' OR item - ARRAY['label','checked'] <> '{}'::jsonb) THEN RAISE EXCEPTION 'Invalid task checklist'; END IF;
  IF TG_OP = 'UPDATE' AND OLD."type" = 'CLOSEOUT' AND ROW(NEW."planItemId",NEW."tags",NEW."checklist") IS DISTINCT FROM ROW(OLD."planItemId",OLD."tags",OLD."checklist") THEN RAISE EXCEPTION 'Approved closeout fields are immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "tasks_optional_field_guard" BEFORE INSERT OR UPDATE ON "tasks" FOR EACH ROW EXECUTE FUNCTION "guard_s09_optional_fields"();

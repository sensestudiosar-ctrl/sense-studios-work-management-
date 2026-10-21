-- Check Draft state when plan is inserted, and validate complete structure at commit.
CREATE OR REPLACE FUNCTION "check_s08_plan_baseline"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE definition JSONB; kind TEXT; project_status "ProjectStatus";
BEGIN
 SELECT p."status", v."definition" INTO project_status, definition FROM "projects" p
 JOIN "project_template_versions" v ON v."id" = NEW."templateVersionId" AND v."organizationId" = NEW."organizationId"
 WHERE p."id" = NEW."projectId" AND p."organizationId" = NEW."organizationId" AND v."definition"->>'deliveryType' = p."deliveryType"::text;
 IF definition IS DISTINCT FROM NEW."definition" THEN RAISE EXCEPTION 'Plan must apply exact version to a Draft project'; END IF;
 IF (SELECT jsonb_agg(s."name" ORDER BY lower(s."name")) FROM "project_scopes" s WHERE s."projectId" = NEW."projectId" AND s."baseline") IS DISTINCT FROM
    (SELECT jsonb_agg(x ORDER BY lower(x)) FROM jsonb_array_elements_text(definition->'scopes') x) THEN RAISE EXCEPTION 'Plan scopes must match project baseline'; END IF;
 IF (SELECT count(*) FROM "project_plan_items" WHERE "projectId" = NEW."projectId") <> jsonb_array_length(definition->'stages') + jsonb_array_length(definition->'milestones') THEN RAISE EXCEPTION 'Plan structure must be complete'; END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION "guard_s08_plan_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "projects" WHERE "id" = NEW."projectId" AND "organizationId" = NEW."organizationId" AND "status" = 'DRAFT' AND "version" = 1) THEN RAISE EXCEPTION 'Plan can only be applied at initial Draft creation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "project_plan_insert_guard" BEFORE INSERT ON "project_plans" FOR EACH ROW EXECUTE FUNCTION "guard_s08_plan_insert"();

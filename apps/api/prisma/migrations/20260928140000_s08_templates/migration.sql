-- CreateTable
CREATE TABLE "project_templates" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_template_versions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "createdById" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_plans" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "templateVersionId" UUID NOT NULL,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_plan_items" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "label" VARCHAR(160) NOT NULL,
    "stageKey" VARCHAR(80),
    "position" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "targetAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "project_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_plan_completions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "projectVersion" INTEGER NOT NULL,

    CONSTRAINT "project_plan_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_gate_overrides" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "projectVersion" INTEGER NOT NULL,
    "milestoneIds" UUID[],
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_gate_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_creation_receipts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "key" UUID NOT NULL,
    "payloadHash" VARCHAR(64) NOT NULL,
    "projectId" UUID NOT NULL,

    CONSTRAINT "project_creation_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_templates_organizationId_createdAt_idx" ON "project_templates"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_templates_id_organizationId_key" ON "project_templates"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "project_template_versions_id_organizationId_key" ON "project_template_versions"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "project_template_versions_templateId_number_key" ON "project_template_versions"("templateId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "project_plans_projectId_key" ON "project_plans"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_plans_id_organizationId_key" ON "project_plans"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "project_plans_projectId_organizationId_key" ON "project_plans"("projectId", "organizationId");

-- CreateIndex
CREATE INDEX "project_plan_items_projectId_kind_position_idx" ON "project_plan_items"("projectId", "kind", "position");

-- CreateIndex
CREATE UNIQUE INDEX "project_plan_items_id_organizationId_key" ON "project_plan_items"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "project_plan_items_projectId_kind_key_key" ON "project_plan_items"("projectId", "kind", "key");

-- CreateIndex
CREATE UNIQUE INDEX "project_plan_completions_itemId_key" ON "project_plan_completions"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "project_gate_overrides_projectId_projectVersion_key" ON "project_gate_overrides"("projectId", "projectVersion");

-- CreateIndex
CREATE UNIQUE INDEX "project_creation_receipts_organizationId_actorId_key_key" ON "project_creation_receipts"("organizationId", "actorId", "key");

-- AddForeignKey
ALTER TABLE "project_template_versions" ADD CONSTRAINT "project_template_versions_templateId_organizationId_fkey" FOREIGN KEY ("templateId", "organizationId") REFERENCES "project_templates"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_plans" ADD CONSTRAINT "project_plans_projectId_organizationId_fkey" FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_plans" ADD CONSTRAINT "project_plans_templateVersionId_organizationId_fkey" FOREIGN KEY ("templateVersionId", "organizationId") REFERENCES "project_template_versions"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_plan_items" ADD CONSTRAINT "project_plan_items_projectId_organizationId_fkey" FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_plan_completions" ADD CONSTRAINT "project_plan_completions_itemId_organizationId_fkey" FOREIGN KEY ("itemId", "organizationId") REFERENCES "project_plan_items"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_creation_receipts" ADD CONSTRAINT "project_creation_receipts_projectId_organizationId_fkey" FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- S08 retained configuration and decision evidence.
ALTER TABLE "project_templates" ADD FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
ALTER TABLE "project_templates" ADD FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "project_template_versions" ADD FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "project_plan_completions" ADD FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "project_gate_overrides" ADD FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT;
ALTER TABLE "project_gate_overrides" ADD FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "project_creation_receipts" ADD FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "project_template_versions" ADD CHECK ("number" > 0 AND length(btrim("reason")) BETWEEN 3 AND 1000 AND jsonb_typeof("definition") = 'object');
ALTER TABLE "project_plan_items" ADD CHECK ("kind" IN ('STAGE','MILESTONE') AND "position" >= 0 AND length("key") > 0 AND ("kind" <> 'STAGE' OR ("stageKey" IS NULL AND NOT "required" AND "targetAt" IS NULL)));
ALTER TABLE "project_plan_completions" ADD CHECK ("projectVersion" > 1 AND length(btrim("reason")) BETWEEN 3 AND 1000);
ALTER TABLE "project_gate_overrides" ADD CHECK ("projectVersion" > 1 AND length(btrim("reason")) BETWEEN 3 AND 1000 AND cardinality("milestoneIds") > 0);

CREATE FUNCTION "reject_s08_evidence_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'S08 versions, applied baseline and decisions are immutable'; END $$;
CREATE TRIGGER "template_versions_immutable" BEFORE UPDATE OR DELETE ON "project_template_versions" FOR EACH ROW EXECUTE FUNCTION "reject_s08_evidence_mutation"();
CREATE TRIGGER "project_plans_immutable" BEFORE UPDATE OR DELETE ON "project_plans" FOR EACH ROW EXECUTE FUNCTION "reject_s08_evidence_mutation"();
CREATE TRIGGER "plan_completions_immutable" BEFORE UPDATE OR DELETE ON "project_plan_completions" FOR EACH ROW EXECUTE FUNCTION "reject_s08_evidence_mutation"();
CREATE TRIGGER "gate_overrides_immutable" BEFORE UPDATE OR DELETE ON "project_gate_overrides" FOR EACH ROW EXECUTE FUNCTION "reject_s08_evidence_mutation"();
CREATE TRIGGER "creation_receipts_immutable" BEFORE UPDATE OR DELETE ON "project_creation_receipts" FOR EACH ROW EXECUTE FUNCTION "reject_s08_evidence_mutation"();

CREATE FUNCTION "check_s08_plan_baseline"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE definition JSONB; kind TEXT; project_status "ProjectStatus";
BEGIN
 SELECT p."status", v."definition" INTO project_status, definition FROM "projects" p
 JOIN "project_template_versions" v ON v."id" = NEW."templateVersionId" AND v."organizationId" = NEW."organizationId"
 WHERE p."id" = NEW."projectId" AND p."organizationId" = NEW."organizationId" AND v."definition"->>'deliveryType' = p."deliveryType"::text;
 IF project_status IS DISTINCT FROM 'DRAFT' OR definition IS DISTINCT FROM NEW."definition" THEN RAISE EXCEPTION 'Plan must apply exact version to a Draft project'; END IF;
 IF (SELECT jsonb_agg(s."name" ORDER BY lower(s."name")) FROM "project_scopes" s WHERE s."projectId" = NEW."projectId" AND s."baseline") IS DISTINCT FROM
    (SELECT jsonb_agg(x ORDER BY lower(x)) FROM jsonb_array_elements_text(definition->'scopes') x) THEN RAISE EXCEPTION 'Plan scopes must match project baseline'; END IF;
 IF (SELECT count(*) FROM "project_plan_items" WHERE "projectId" = NEW."projectId") <> jsonb_array_length(definition->'stages') + jsonb_array_length(definition->'milestones') THEN RAISE EXCEPTION 'Plan structure must be complete'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "project_plan_baseline_guard" AFTER INSERT ON "project_plans" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s08_plan_baseline"();

CREATE FUNCTION "protect_s08_plan_item"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE definition JSONB; entry JSONB; status "ProjectStatus";
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Project plan items are retained'; END IF;
 IF TG_OP = 'UPDATE' THEN
  IF (to_jsonb(NEW) - 'completedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'completedAt') OR OLD."completedAt" IS NOT NULL OR NEW."completedAt" IS NULL THEN RAISE EXCEPTION 'Only first completion is permitted'; END IF;
  SELECT "status" INTO status FROM "projects" WHERE "id" = NEW."projectId";
  IF status <> 'ACTIVE' THEN RAISE EXCEPTION 'Plan completion requires Active project'; END IF;
 ELSE
  SELECT pp."definition" INTO definition FROM "project_plans" pp JOIN "projects" p ON p."id" = pp."projectId" WHERE pp."projectId" = NEW."projectId" AND pp."organizationId" = NEW."organizationId" AND p."status" = 'DRAFT' AND p."version" = 1;
  IF definition IS NULL OR NEW."completedAt" IS NOT NULL THEN RAISE EXCEPTION 'Items must originate in initial Draft plan'; END IF;
  entry := (definition->CASE WHEN NEW."kind" = 'STAGE' THEN 'stages' ELSE 'milestones' END)->NEW."position";
  IF entry IS NULL OR entry->>'key' IS DISTINCT FROM NEW."key" OR entry->>'label' IS DISTINCT FROM NEW."label" OR
    (NEW."kind" = 'MILESTONE' AND (entry->>'stageKey' IS DISTINCT FROM NEW."stageKey" OR (entry->>'required')::boolean IS DISTINCT FROM NEW."required")) THEN RAISE EXCEPTION 'Item must match applied template'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "project_plan_item_guard" BEFORE INSERT OR UPDATE OR DELETE ON "project_plan_items" FOR EACH ROW EXECUTE FUNCTION "protect_s08_plan_item"();

CREATE FUNCTION "check_s08_completion_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item_id UUID;
BEGIN
 IF TG_TABLE_NAME = 'project_plan_items' THEN item_id := NEW."id"; ELSE item_id := NEW."itemId"; END IF;
 IF NOT EXISTS (SELECT 1 FROM "project_plan_items" i JOIN "project_plan_completions" c ON c."itemId" = i."id" AND c."organizationId" = i."organizationId"
 JOIN "projects" p ON p."id" = i."projectId" WHERE i."id" = item_id AND i."completedAt" = c."occurredAt" AND p."version" >= c."projectVersion") THEN RAISE EXCEPTION 'Plan completion requires matching immutable evidence'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "plan_item_completion_evidence" AFTER UPDATE ON "project_plan_items" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s08_completion_evidence"();
CREATE CONSTRAINT TRIGGER "plan_completion_evidence" AFTER INSERT ON "project_plan_completions" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s08_completion_evidence"();

CREATE FUNCTION "check_s08_project_completion"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE missing UUID[];
BEGIN
 IF NEW."status" = 'COMPLETED' AND OLD."status" <> 'COMPLETED' THEN
  SELECT array_agg("id" ORDER BY "id") INTO missing FROM "project_plan_items" WHERE "projectId" = NEW."id" AND "kind" = 'MILESTONE' AND "required" AND "completedAt" IS NULL;
  IF missing IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "project_gate_overrides" WHERE "projectId" = NEW."id" AND "organizationId" = NEW."organizationId" AND "projectVersion" = NEW."version" AND "milestoneIds" @> missing AND missing @> "milestoneIds") THEN RAISE EXCEPTION 'Required milestones block project completion'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "project_milestone_completion_guard" AFTER UPDATE OF "status" ON "projects" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s08_project_completion"();

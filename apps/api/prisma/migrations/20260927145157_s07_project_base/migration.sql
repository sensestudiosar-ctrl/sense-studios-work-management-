-- CreateEnum
CREATE TYPE "ProjectDeliveryType" AS ENUM ('DESIGN', 'TURNKEY');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "deliveryType" "ProjectDeliveryType" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "clientId" UUID,
    "wonLeadId" UUID,
    "currentLeadEmployeeId" UUID,
    "scopeApproverAccountId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_scopes" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "normalizedName" VARCHAR(120) NOT NULL,
    "baseline" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_status_changes" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "fromStatus" "ProjectStatus",
    "toStatus" "ProjectStatus" NOT NULL,
    "projectVersion" INTEGER NOT NULL,
    "reason" VARCHAR(1000),
    "actorId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_organizationId_branchId_status_createdAt_id_idx" ON "projects"("organizationId", "branchId", "status", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_id_organizationId_key" ON "projects"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_wonLeadId_organizationId_key" ON "projects"("wonLeadId", "organizationId");

-- CreateIndex
CREATE INDEX "project_scopes_organizationId_projectId_idx" ON "project_scopes"("organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_scopes_projectId_normalizedName_key" ON "project_scopes"("projectId", "normalizedName");

-- CreateIndex
CREATE INDEX "project_status_changes_projectId_occurredAt_id_idx" ON "project_status_changes"("projectId", "occurredAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "project_status_changes_projectId_projectVersion_key" ON "project_status_changes"("projectId", "projectVersion");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_branchId_organizationId_fkey" FOREIGN KEY ("branchId", "organizationId") REFERENCES "branches"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_organizationId_fkey" FOREIGN KEY ("clientId", "organizationId") REFERENCES "clients"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_wonLeadId_organizationId_fkey" FOREIGN KEY ("wonLeadId", "organizationId") REFERENCES "leads"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_currentLeadEmployeeId_organizationId_fkey" FOREIGN KEY ("currentLeadEmployeeId", "organizationId") REFERENCES "employees"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_scopeApproverAccountId_fkey" FOREIGN KEY ("scopeApproverAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_scopes" ADD CONSTRAINT "project_scopes_projectId_organizationId_fkey" FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_status_changes" ADD CONSTRAINT "project_status_changes_projectId_organizationId_fkey" FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_status_changes" ADD CONSTRAINT "project_status_changes_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- S07 invariants supplement the generated relational schema.
ALTER TABLE "projects" ADD CONSTRAINT "projects_version_positive" CHECK ("version" > 0);
ALTER TABLE "projects" ADD CONSTRAINT "projects_active_lead_required" CHECK ("status" <> 'ACTIVE' OR "currentLeadEmployeeId" IS NOT NULL);
ALTER TABLE "project_scopes" ADD CONSTRAINT "project_scopes_name_shape" CHECK (
  length("name") BETWEEN 2 AND 120 AND "name" = btrim("name") AND "normalizedName" = lower("name"));
ALTER TABLE "project_status_changes" ADD CONSTRAINT "project_status_changes_shape" CHECK (
  "projectVersion" > 0 AND
  (("fromStatus" IS NULL AND "toStatus" = 'DRAFT' AND "projectVersion" = 1) OR
   ("fromStatus" IS NOT NULL AND "fromStatus" <> "toStatus")));

CREATE FUNCTION "protect_project_s07"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_stage "LeadStage"; source_branch UUID; source_client UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Projects cannot be deleted'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'DRAFT' OR NEW."version" <> 1 THEN RAISE EXCEPTION 'Projects begin Draft at version 1'; END IF;
    IF NEW."wonLeadId" IS NOT NULL THEN
      SELECT "stage", "branchId", "clientId" INTO source_stage, source_branch, source_client
        FROM "leads" WHERE "id" = NEW."wonLeadId" AND "organizationId" = NEW."organizationId" FOR SHARE;
      IF source_stage IS DISTINCT FROM 'WON'::"LeadStage" OR source_branch IS DISTINCT FROM NEW."branchId"
         OR source_client IS DISTINCT FROM NEW."clientId" THEN
        RAISE EXCEPTION 'Project conversion requires a Won lead in the owning Branch with its client';
      END IF;
    END IF;
  ELSE
    IF ROW(NEW."organizationId", NEW."branchId", NEW."clientId", NEW."wonLeadId", NEW."deliveryType", NEW."createdById", NEW."createdAt") IS DISTINCT FROM
       ROW(OLD."organizationId", OLD."branchId", OLD."clientId", OLD."wonLeadId", OLD."deliveryType", OLD."createdById", OLD."createdAt") THEN
      RAISE EXCEPTION 'Project ownership and provenance are immutable in S07 base';
    END IF;
    IF OLD."status" IN ('ARCHIVED', 'CANCELLED') THEN RAISE EXCEPTION 'Terminal projects cannot change'; END IF;
    IF NEW."status" = 'CANCELLED' THEN RAISE EXCEPTION 'Effective cancellation requires S09 task-stop workflow'; END IF;
    IF NEW."version" <> OLD."version" + 1 THEN RAISE EXCEPTION 'Project version must advance once'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "projects_protect_s07" BEFORE INSERT OR UPDATE OR DELETE ON "projects"
  FOR EACH ROW EXECUTE FUNCTION "protect_project_s07"();

CREATE FUNCTION "reject_project_base_evidence_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Project baseline and status evidence are append-only'; END $$;
CREATE TRIGGER "project_scopes_immutable" BEFORE UPDATE OR DELETE ON "project_scopes"
  FOR EACH ROW EXECUTE FUNCTION "reject_project_base_evidence_mutation"();
CREATE TRIGGER "project_status_changes_immutable" BEFORE UPDATE OR DELETE ON "project_status_changes"
  FOR EACH ROW EXECUTE FUNCTION "reject_project_base_evidence_mutation"();

CREATE FUNCTION "check_project_base_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_id UUID; current_status "ProjectStatus"; current_version INTEGER;
        evidence_status "ProjectStatus"; evidence_version INTEGER; has_scope BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'projects' THEN target_id := NEW."id"; ELSE target_id := NEW."projectId"; END IF;
  SELECT "status", "version" INTO current_status, current_version FROM "projects" WHERE "id" = target_id;
  SELECT "toStatus", "projectVersion" INTO evidence_status, evidence_version
    FROM "project_status_changes" WHERE "projectId" = target_id ORDER BY "projectVersion" DESC LIMIT 1;
  IF evidence_status IS DISTINCT FROM current_status OR evidence_version IS NULL OR evidence_version > current_version THEN
    RAISE EXCEPTION 'Project state requires matching status evidence';
  END IF;
  SELECT EXISTS (SELECT 1 FROM "project_scopes" WHERE "projectId" = target_id AND "baseline" = true) INTO has_scope;
  IF NOT has_scope THEN RAISE EXCEPTION 'Project requires at least one baseline scope'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "projects_base_evidence" AFTER INSERT OR UPDATE OF "status" ON "projects"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_project_base_evidence"();
CREATE CONSTRAINT TRIGGER "project_status_base_evidence" AFTER INSERT ON "project_status_changes"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_project_base_evidence"();

-- CreateEnum
CREATE TYPE "ClientReviewPackageStatus" AS ENUM ('OPEN', 'APPROVED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ClientReviewItemStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REVISION_REQUIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ClientItemDecisionKind" AS ENUM ('APPROVED', 'REVISION_REQUIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ClientRevisionCategory" AS ENUM ('PREFERENCE_NEW_REQUIREMENT', 'EMPLOYEE_WORK_ERROR');

-- CreateTable
CREATE TABLE "client_review_packages" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "createdById" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ClientReviewPackageStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "client_review_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_review_items" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "revisionId" UUID,
    "snapshot" JSONB NOT NULL,
    "label" VARCHAR(160) NOT NULL,
    "status" "ClientReviewItemStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_review_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_item_decisions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "kind" "ClientItemDecisionKind" NOT NULL,
    "signatureName" VARCHAR(160),
    "consent" BOOLEAN,
    "comment" VARCHAR(2000) NOT NULL DEFAULT '',
    "credentialId" UUID,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(512),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auditEventId" UUID NOT NULL,

    CONSTRAINT "client_item_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_review_comments" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "text" VARCHAR(2000) NOT NULL,
    "annotations" JSONB NOT NULL DEFAULT '[]',
    "referenceId" UUID,
    "auditEventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_review_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_references" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "name" VARCHAR(240) NOT NULL,
    "mime" VARCHAR(120) NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "storageKey" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_item_grants" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "portalGrantId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "view" BOOLEAN NOT NULL DEFAULT false,
    "comment" BOOLEAN NOT NULL DEFAULT false,
    "review" BOOLEAN NOT NULL DEFAULT false,
    "approve" BOOLEAN NOT NULL DEFAULT false,
    "download" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "changedById" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "client_item_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_item_grant_changes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "grantId" UUID NOT NULL,
    "grantVersion" INTEGER NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "auditEventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_item_grant_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_review_classifications" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "category" "ClientRevisionCategory" NOT NULL,
    "version" INTEGER NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "auditEventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_review_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_corrections" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "correctionTaskId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "auditEventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_final_approvals" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "signatureName" VARCHAR(160) NOT NULL,
    "consent" BOOLEAN NOT NULL,
    "credentialId" UUID NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(512),
    "itemSnapshot" JSONB NOT NULL,
    "auditEventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ(3),
    "retainUntil" TIMESTAMPTZ(3),

    CONSTRAINT "client_final_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_review_packages_organizationId_projectId_status_crea_idx" ON "client_review_packages"("organizationId", "projectId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_review_packages_id_organizationId_projectId_key" ON "client_review_packages"("id", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "client_review_items_organizationId_projectId_taskId_created_idx" ON "client_review_items"("organizationId", "projectId", "taskId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_review_items_id_organizationId_projectId_key" ON "client_review_items"("id", "organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "client_review_items_packageId_taskId_key" ON "client_review_items"("packageId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "client_item_decisions_itemId_key" ON "client_item_decisions"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "client_item_decisions_auditEventId_key" ON "client_item_decisions"("auditEventId");

-- CreateIndex
CREATE INDEX "client_item_decisions_organizationId_projectId_accountId_cr_idx" ON "client_item_decisions"("organizationId", "projectId", "accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_item_decisions_id_organizationId_projectId_key" ON "client_item_decisions"("id", "organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "client_review_comments_auditEventId_key" ON "client_review_comments"("auditEventId");

-- CreateIndex
CREATE INDEX "client_review_comments_organizationId_projectId_itemId_crea_idx" ON "client_review_comments"("organizationId", "projectId", "itemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_references_storageKey_key" ON "client_references"("storageKey");

-- CreateIndex
CREATE INDEX "client_references_organizationId_projectId_itemId_createdAt_idx" ON "client_references"("organizationId", "projectId", "itemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_references_id_organizationId_projectId_key" ON "client_references"("id", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "client_item_grants_organizationId_projectId_itemId_idx" ON "client_item_grants"("organizationId", "projectId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "client_item_grants_id_organizationId_projectId_key" ON "client_item_grants"("id", "organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "client_item_grants_portalGrantId_itemId_key" ON "client_item_grants"("portalGrantId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "client_item_grant_changes_auditEventId_key" ON "client_item_grant_changes"("auditEventId");

-- CreateIndex
CREATE UNIQUE INDEX "client_item_grant_changes_grantId_grantVersion_key" ON "client_item_grant_changes"("grantId", "grantVersion");

-- CreateIndex
CREATE UNIQUE INDEX "client_review_classifications_auditEventId_key" ON "client_review_classifications"("auditEventId");

-- CreateIndex
CREATE UNIQUE INDEX "client_review_classifications_itemId_version_key" ON "client_review_classifications"("itemId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "client_corrections_itemId_key" ON "client_corrections"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "client_corrections_correctionTaskId_key" ON "client_corrections"("correctionTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "client_corrections_auditEventId_key" ON "client_corrections"("auditEventId");

-- CreateIndex
CREATE UNIQUE INDEX "client_final_approvals_packageId_key" ON "client_final_approvals"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "client_final_approvals_auditEventId_key" ON "client_final_approvals"("auditEventId");

-- CreateIndex
CREATE INDEX "client_final_approvals_organizationId_projectId_accountId_c_idx" ON "client_final_approvals"("organizationId", "projectId", "accountId", "createdAt");

-- SQL composite keys preserve organization/project boundaries without ORM-only relations.
ALTER TABLE "client_review_packages" ADD CONSTRAINT "s14_package_project_fk" FOREIGN KEY ("projectId","organizationId") REFERENCES "projects"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "client_review_packages" ADD CONSTRAINT "s14_package_creator_fk" FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "client_review_packages" ADD CONSTRAINT "s14_package_shape" CHECK (length(btrim("title")) BETWEEN 1 AND 160 AND length(btrim("reason")) BETWEEN 3 AND 1000 AND "version">0);
ALTER TABLE "client_review_items" ADD CONSTRAINT "s14_item_package_fk" FOREIGN KEY ("packageId","organizationId","projectId") REFERENCES "client_review_packages"("id","organizationId","projectId") ON DELETE RESTRICT;
ALTER TABLE "client_review_items" ADD CONSTRAINT "s14_item_task_fk" FOREIGN KEY ("taskId","organizationId") REFERENCES "tasks"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "client_review_items" ADD CONSTRAINT "s14_item_revision_fk" FOREIGN KEY ("revisionId","organizationId","projectId") REFERENCES "document_revisions"("id","organizationId","projectId") ON DELETE RESTRICT;
ALTER TABLE "client_review_items" ADD CONSTRAINT "s14_item_shape" CHECK (length(btrim("label")) BETWEEN 1 AND 160 AND "version">0 AND jsonb_typeof("snapshot")='object');
ALTER TABLE "client_item_decisions" ADD CONSTRAINT "s14_decision_item_fk" FOREIGN KEY ("itemId","organizationId","projectId") REFERENCES "client_review_items"("id","organizationId","projectId") ON DELETE RESTRICT;
ALTER TABLE "client_item_decisions" ADD CONSTRAINT "s14_decision_account_fk" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "client_item_decisions" ADD CONSTRAINT "s14_decision_credential_fk" FOREIGN KEY ("credentialId") REFERENCES "passkey_credentials"("id") ON DELETE RESTRICT;
ALTER TABLE "client_item_decisions" ADD CONSTRAINT "s14_decision_audit_fk" FOREIGN KEY ("auditEventId") REFERENCES "audit_events"("id") ON DELETE RESTRICT;
ALTER TABLE "client_item_decisions" ADD CONSTRAINT "s14_decision_signature" CHECK ("kind"<>'APPROVED' OR ("signatureName" IS NOT NULL AND length(btrim("signatureName")) BETWEEN 1 AND 160 AND "consent" IS TRUE AND "credentialId" IS NOT NULL));
ALTER TABLE "client_review_comments" ADD CONSTRAINT "s14_comment_item_fk" FOREIGN KEY ("itemId","organizationId","projectId") REFERENCES "client_review_items"("id","organizationId","projectId") ON DELETE RESTRICT;
ALTER TABLE "client_review_comments" ADD CONSTRAINT "s14_comment_author_fk" FOREIGN KEY ("authorId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "client_review_comments" ADD CONSTRAINT "s14_comment_reference_fk" FOREIGN KEY ("referenceId","organizationId","projectId") REFERENCES "client_references"("id","organizationId","projectId") ON DELETE RESTRICT;
ALTER TABLE "client_review_comments" ADD CONSTRAINT "s14_comment_audit_fk" FOREIGN KEY ("auditEventId") REFERENCES "audit_events"("id") ON DELETE RESTRICT;
ALTER TABLE "client_review_comments" ADD CONSTRAINT "s14_comment_shape" CHECK (length(btrim("text")) BETWEEN 1 AND 2000 AND jsonb_typeof("annotations")='array' AND jsonb_array_length("annotations")<=100);
ALTER TABLE "client_references" ADD CONSTRAINT "s14_reference_item_fk" FOREIGN KEY ("itemId","organizationId","projectId") REFERENCES "client_review_items"("id","organizationId","projectId") ON DELETE RESTRICT;
ALTER TABLE "client_references" ADD CONSTRAINT "s14_reference_actor_fk" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "client_references" ADD CONSTRAINT "s14_reference_shape" CHECK (length(btrim("name")) BETWEEN 1 AND 240 AND "size">0 AND "size"<=20971520 AND "sha256"~'^[a-f0-9]{64}$' AND "mime" IN ('application/pdf','image/png','image/jpeg','image/webp'));
ALTER TABLE "client_item_grants" ADD CONSTRAINT "s14_item_grant_portal_fk" FOREIGN KEY ("portalGrantId","organizationId","projectId") REFERENCES "client_portal_grants"("id","organizationId","projectId") ON DELETE RESTRICT;
ALTER TABLE "client_item_grants" ADD CONSTRAINT "s14_item_grant_item_fk" FOREIGN KEY ("itemId","organizationId","projectId") REFERENCES "client_review_items"("id","organizationId","projectId") ON DELETE RESTRICT;
ALTER TABLE "client_item_grants" ADD CONSTRAINT "s14_item_grant_actor_fk" FOREIGN KEY ("changedById") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "client_item_grants" ADD CONSTRAINT "s14_item_grant_shape" CHECK ("version">0 AND length(btrim("reason")) BETWEEN 3 AND 1000 AND ("view" OR NOT ("comment" OR "review" OR "approve" OR "download")));
ALTER TABLE "client_item_grant_changes" ADD CONSTRAINT "s14_item_change_grant_fk" FOREIGN KEY ("grantId","organizationId","projectId") REFERENCES "client_item_grants"("id","organizationId","projectId") ON DELETE RESTRICT;
ALTER TABLE "client_item_grant_changes" ADD CONSTRAINT "s14_item_change_actor_fk" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "client_item_grant_changes" ADD CONSTRAINT "s14_item_change_audit_fk" FOREIGN KEY ("auditEventId") REFERENCES "audit_events"("id") ON DELETE RESTRICT;
ALTER TABLE "client_item_grant_changes" ADD CONSTRAINT "s14_item_change_shape" CHECK ("grantVersion">0 AND length(btrim("reason")) BETWEEN 3 AND 1000 AND jsonb_typeof("before")='object' AND jsonb_typeof("after")='object');
ALTER TABLE "client_review_classifications" ADD CONSTRAINT "s14_classification_item_fk" FOREIGN KEY ("itemId","organizationId","projectId") REFERENCES "client_review_items"("id","organizationId","projectId") ON DELETE RESTRICT;
ALTER TABLE "client_review_classifications" ADD CONSTRAINT "s14_classification_actor_fk" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "client_review_classifications" ADD CONSTRAINT "s14_classification_audit_fk" FOREIGN KEY ("auditEventId") REFERENCES "audit_events"("id") ON DELETE RESTRICT;
ALTER TABLE "client_review_classifications" ADD CONSTRAINT "s14_classification_shape" CHECK ("version">0 AND length(btrim("reason")) BETWEEN 3 AND 1000);
ALTER TABLE "client_corrections" ADD CONSTRAINT "s14_correction_item_fk" FOREIGN KEY ("itemId","organizationId","projectId") REFERENCES "client_review_items"("id","organizationId","projectId") ON DELETE RESTRICT;
ALTER TABLE "client_corrections" ADD CONSTRAINT "s14_correction_task_fk" FOREIGN KEY ("correctionTaskId","organizationId") REFERENCES "tasks"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "client_corrections" ADD CONSTRAINT "s14_correction_actor_fk" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "client_corrections" ADD CONSTRAINT "s14_correction_audit_fk" FOREIGN KEY ("auditEventId") REFERENCES "audit_events"("id") ON DELETE RESTRICT;
ALTER TABLE "client_corrections" ADD CONSTRAINT "s14_correction_shape" CHECK (length(btrim("reason")) BETWEEN 3 AND 1000);
ALTER TABLE "client_final_approvals" ADD CONSTRAINT "s14_final_package_fk" FOREIGN KEY ("packageId","organizationId","projectId") REFERENCES "client_review_packages"("id","organizationId","projectId") ON DELETE RESTRICT;
ALTER TABLE "client_final_approvals" ADD CONSTRAINT "s14_final_account_fk" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "client_final_approvals" ADD CONSTRAINT "s14_final_credential_fk" FOREIGN KEY ("credentialId") REFERENCES "passkey_credentials"("id") ON DELETE RESTRICT;
ALTER TABLE "client_final_approvals" ADD CONSTRAINT "s14_final_audit_fk" FOREIGN KEY ("auditEventId") REFERENCES "audit_events"("id") ON DELETE RESTRICT;
ALTER TABLE "client_final_approvals" ADD CONSTRAINT "s14_final_shape" CHECK (length(btrim("signatureName")) BETWEEN 1 AND 160 AND "consent" AND jsonb_typeof("itemSnapshot")='array' AND jsonb_array_length("itemSnapshot")>0 AND (("closedAt" IS NULL AND "retainUntil" IS NULL) OR ("closedAt" IS NOT NULL AND "retainUntil"="closedAt"+interval '10 years')));

DO $$
DECLARE table_name TEXT;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['client_item_decisions','client_review_comments','client_references','client_item_grant_changes','client_review_classifications','client_corrections'] LOOP
  EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"()', 's14_'||table_name||'_immutable',table_name);
  EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON %I FROM sense_app_runtime',table_name);
 END LOOP;
 FOREACH table_name IN ARRAY ARRAY['client_review_packages','client_review_items','client_item_grants','client_final_approvals'] LOOP
  EXECUTE format('CREATE TRIGGER %I BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"()', 's14_'||table_name||'_no_delete',table_name);
  EXECUTE format('REVOKE DELETE, TRUNCATE ON %I FROM sense_app_runtime',table_name);
 END LOOP;
END $$;

DO $$
DECLARE previous_definition TEXT;
BEGIN
 SELECT pg_get_constraintdef(oid) INTO previous_definition FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF previous_definition IS NULL THEN RAISE EXCEPTION 'Expected event catalogue missing'; END IF;
 ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE 'ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" ' || left(previous_definition,length(previous_definition)-1) || ' OR "eventName" IN (''client.review_sent'',''client.review_started'',''client.item_decided'',''client.commented'',''client.reference_uploaded'',''client.item_access_changed'',''client.revision_classified'',''client.correction_assigned'',''client.correction_resumed'',''client.final_approved'',''client.review_withdrawn''))';
END $$;


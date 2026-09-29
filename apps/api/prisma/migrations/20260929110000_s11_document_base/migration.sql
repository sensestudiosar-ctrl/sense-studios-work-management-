CREATE TYPE "DocumentProvisionState" AS ENUM ('PENDING','READY','FAILED');
CREATE TYPE "DocumentUploadState" AS ENUM ('STAGING','FINALIZED','ABORTED');
CREATE TYPE "DocumentResourceKind" AS ENUM ('FOLDER','FILE');
CREATE TYPE "DocumentRetentionClass" AS ENUM ('NONE','ISSUED_DRAWING','CLIENT_APPROVAL_EVIDENCE');

CREATE TABLE "document_folders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL, "projectId" UUID NOT NULL, "parentId" UUID,
  "name" VARCHAR(160) NOT NULL, "normalizedName" VARCHAR(160) NOT NULL,
  "logicalPath" VARCHAR(600) NOT NULL, "templatePath" VARCHAR(240),
  "confidential" BOOLEAN NOT NULL DEFAULT false,
  "provisionState" "DocumentProvisionState" NOT NULL DEFAULT 'PENDING',
  "provisionError" VARCHAR(500), "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_folders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_folders_id_organizationId_key" UNIQUE ("id","organizationId"),
  CONSTRAINT "document_folders_id_organizationId_projectId_key" UNIQUE ("id","organizationId","projectId"),
  CONSTRAINT "document_folders_projectId_logicalPath_key" UNIQUE ("projectId","logicalPath"),
  CONSTRAINT "document_folders_name_check" CHECK (length(btrim("name")) BETWEEN 1 AND 160 AND "name" NOT IN ('.','..') AND position('/' IN "name")=0 AND position(chr(92) IN "name")=0),
  CONSTRAINT "document_folders_provision_check" CHECK (("provisionState"='FAILED') = ("provisionError" IS NOT NULL)),
  CONSTRAINT "document_folders_project_fkey" FOREIGN KEY ("projectId","organizationId") REFERENCES "projects"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "document_folders_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "document_folders_parent_fkey" FOREIGN KEY ("parentId","organizationId","projectId") REFERENCES "document_folders"("id","organizationId","projectId") ON DELETE RESTRICT,
  CONSTRAINT "document_folders_actor_fkey" FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT
);
CREATE INDEX "document_folders_org_project_parent_idx" ON "document_folders"("organizationId","projectId","parentId");

CREATE TABLE "documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL, "folderId" UUID NOT NULL,
  "documentNumber" VARCHAR(80), "title" VARCHAR(160) NOT NULL,
  "confidential" BOOLEAN NOT NULL DEFAULT false, "viewOnly" BOOLEAN NOT NULL DEFAULT false,
  "createdById" UUID NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "documents_id_organizationId_key" UNIQUE ("id","organizationId"),
  CONSTRAINT "documents_title_check" CHECK (length(btrim("title")) BETWEEN 1 AND 160),
  CONSTRAINT "documents_project_fkey" FOREIGN KEY ("projectId","organizationId") REFERENCES "projects"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "documents_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "documents_folder_fkey" FOREIGN KEY ("folderId","organizationId","projectId") REFERENCES "document_folders"("id","organizationId","projectId") ON DELETE RESTRICT,
  CONSTRAINT "documents_actor_fkey" FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT
);
CREATE INDEX "documents_org_project_folder_created_idx" ON "documents"("organizationId","projectId","folderId","createdAt");

CREATE TABLE "file_blob_metadata" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "documentId" UUID NOT NULL, "storageKey" UUID NOT NULL,
  "fileName" VARCHAR(240) NOT NULL, "mimeType" VARCHAR(160) NOT NULL,
  "sizeBytes" BIGINT NOT NULL, "sha256" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "file_blob_metadata_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "file_blob_metadata_id_organizationId_key" UNIQUE ("id","organizationId"),
  CONSTRAINT "file_blob_metadata_storageKey_key" UNIQUE ("storageKey"),
  CONSTRAINT "file_blob_metadata_shape" CHECK ("sizeBytes">0 AND "sha256" ~ '^[0-9a-f]{64}$' AND length(btrim("fileName")) BETWEEN 1 AND 240),
  CONSTRAINT "file_blob_metadata_document_fkey" FOREIGN KEY ("documentId","organizationId") REFERENCES "documents"("id","organizationId") ON DELETE RESTRICT
);
CREATE INDEX "file_blob_metadata_org_document_created_idx" ON "file_blob_metadata"("organizationId","documentId","createdAt");

CREATE TABLE "document_uploads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL, "folderId" UUID NOT NULL, "actorId" UUID NOT NULL,
  "fileName" VARCHAR(240) NOT NULL, "mimeType" VARCHAR(160) NOT NULL,
  "sizeBytes" BIGINT NOT NULL, "chunkSize" INTEGER NOT NULL, "chunkCount" INTEGER NOT NULL,
  "confidential" BOOLEAN NOT NULL DEFAULT false, "viewOnly" BOOLEAN NOT NULL DEFAULT false,
  "reason" VARCHAR(1000) NOT NULL, "state" "DocumentUploadState" NOT NULL DEFAULT 'STAGING',
  "finalizedBlobId" UUID, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL, "finalizedAt" TIMESTAMPTZ(3),
  CONSTRAINT "document_uploads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_uploads_id_organizationId_key" UNIQUE ("id","organizationId"),
  CONSTRAINT "document_uploads_finalizedBlobId_key" UNIQUE ("finalizedBlobId"),
  CONSTRAINT "document_uploads_shape" CHECK ("sizeBytes">0 AND "chunkSize" BETWEEN 1 AND 8388608 AND "chunkCount">0 AND "chunkCount"<=1000000 AND length(btrim("reason")) BETWEEN 3 AND 1000 AND "expiresAt">"createdAt" AND (("state"='FINALIZED')=("finalizedBlobId" IS NOT NULL AND "finalizedAt" IS NOT NULL))),
  CONSTRAINT "document_uploads_project_fkey" FOREIGN KEY ("projectId","organizationId") REFERENCES "projects"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "document_uploads_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "document_uploads_folder_fkey" FOREIGN KEY ("folderId","organizationId","projectId") REFERENCES "document_folders"("id","organizationId","projectId") ON DELETE RESTRICT,
  CONSTRAINT "document_uploads_actor_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT
);
CREATE INDEX "document_uploads_org_project_state_expiry_idx" ON "document_uploads"("organizationId","projectId","state","expiresAt");

CREATE TABLE "document_upload_chunks" (
  "uploadId" UUID NOT NULL, "index" INTEGER NOT NULL, "organizationId" UUID NOT NULL,
  "sizeBytes" INTEGER NOT NULL, "sha256" CHAR(64) NOT NULL,
  "writtenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_upload_chunks_pkey" PRIMARY KEY ("uploadId","index"),
  CONSTRAINT "document_upload_chunks_shape" CHECK ("index">=0 AND "sizeBytes">0 AND "sizeBytes"<=8388608 AND "sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "document_upload_chunks_upload_fkey" FOREIGN KEY ("uploadId","organizationId") REFERENCES "document_uploads"("id","organizationId") ON DELETE RESTRICT
);

CREATE TABLE "document_access_grants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL, "resourceKind" "DocumentResourceKind" NOT NULL,
  "resourceId" UUID NOT NULL, "employeeId" UUID NOT NULL,
  "grantedById" UUID NOT NULL, "reason" VARCHAR(1000) NOT NULL,
  "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMPTZ(3),
  CONSTRAINT "document_access_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_access_grants_reason_check" CHECK (length(btrim("reason")) BETWEEN 3 AND 1000),
  CONSTRAINT "document_access_grants_project_fkey" FOREIGN KEY ("projectId","organizationId") REFERENCES "projects"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "document_access_grants_employee_fkey" FOREIGN KEY ("employeeId","organizationId") REFERENCES "employees"("id","organizationId") ON DELETE RESTRICT,
  CONSTRAINT "document_access_grants_actor_fkey" FOREIGN KEY ("grantedById") REFERENCES "accounts"("id") ON DELETE RESTRICT
);
CREATE INDEX "document_access_grants_lookup_idx" ON "document_access_grants"("organizationId","projectId","resourceKind","resourceId","employeeId","revokedAt");
CREATE UNIQUE INDEX "document_access_grants_one_active" ON "document_access_grants"("projectId","resourceKind","resourceId","employeeId") WHERE "revokedAt" IS NULL;

CREATE TABLE "file_retention_records" (
  "blobId" UUID NOT NULL, "organizationId" UUID NOT NULL,
  "retentionClass" "DocumentRetentionClass" NOT NULL,
  "projectClosedAt" TIMESTAMPTZ(3), "retainUntil" TIMESTAMPTZ(3),
  "ownerNoticeAt" TIMESTAMPTZ(3), "holdPlacedAt" TIMESTAMPTZ(3),
  "holdReason" VARCHAR(1000), "backupExpiresAt" TIMESTAMPTZ(3), "deletionProof" JSONB,
  CONSTRAINT "file_retention_records_pkey" PRIMARY KEY ("blobId"),
  CONSTRAINT "file_retention_records_blobId_organizationId_key" UNIQUE ("blobId","organizationId"),
  CONSTRAINT "file_retention_records_shape" CHECK (("projectClosedAt" IS NULL AND "retainUntil" IS NULL) OR ("projectClosedAt" IS NOT NULL AND "retainUntil"="projectClosedAt" + interval '10 years')),
  CONSTRAINT "file_retention_records_hold_check" CHECK (("holdPlacedAt" IS NULL)=("holdReason" IS NULL)),
  CONSTRAINT "file_retention_records_blob_fkey" FOREIGN KEY ("blobId","organizationId") REFERENCES "file_blob_metadata"("id","organizationId") ON DELETE RESTRICT
);

CREATE FUNCTION "guard_s11_immutable_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Document file evidence is immutable'; END $$;
CREATE TRIGGER "documents_no_mutation" BEFORE UPDATE OR DELETE ON "documents" FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();
CREATE TRIGGER "file_blobs_no_mutation" BEFORE UPDATE OR DELETE ON "file_blob_metadata" FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();
CREATE TRIGGER "upload_chunks_no_mutation" BEFORE UPDATE OR DELETE ON "document_upload_chunks" FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();

CREATE FUNCTION "guard_s11_access_grant"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Document grants cannot be deleted'; END IF;
  IF TG_OP='UPDATE' THEN
    IF ROW(NEW."id",NEW."organizationId",NEW."projectId",NEW."resourceKind",NEW."resourceId",NEW."employeeId",NEW."grantedById",NEW."reason",NEW."grantedAt")
       IS DISTINCT FROM ROW(OLD."id",OLD."organizationId",OLD."projectId",OLD."resourceKind",OLD."resourceId",OLD."employeeId",OLD."grantedById",OLD."reason",OLD."grantedAt")
       OR OLD."revokedAt" IS NOT NULL OR NEW."revokedAt" IS NULL THEN RAISE EXCEPTION 'Document grant history is immutable'; END IF;
  ELSE
    IF NEW."resourceKind"='FOLDER' AND NOT EXISTS (SELECT 1 FROM "document_folders" f WHERE f."id"=NEW."resourceId" AND f."organizationId"=NEW."organizationId" AND f."projectId"=NEW."projectId")
       OR NEW."resourceKind"='FILE' AND NOT EXISTS (SELECT 1 FROM "documents" d WHERE d."id"=NEW."resourceId" AND d."organizationId"=NEW."organizationId" AND d."projectId"=NEW."projectId")
    THEN RAISE EXCEPTION 'Document grant resource must belong to project'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "document_access_grants_guard" BEFORE INSERT OR UPDATE OR DELETE ON "document_access_grants" FOR EACH ROW EXECUTE FUNCTION "guard_s11_access_grant"();

-- Preserve the previously reviewed event whitelist while extending only the S11 names.
DO $$
DECLARE previous_definition TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO previous_definition FROM pg_constraint
    WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
  IF previous_definition IS NULL OR left(previous_definition, 6) <> 'CHECK ' THEN
    RAISE EXCEPTION 'Expected domain event catalogue constraint is unavailable';
  END IF;
  ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
  EXECUTE 'ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" ' ||
    left(previous_definition, length(previous_definition)-1) ||
    ' OR "eventName" IN (''document.folder_created'',''document.folder_provisioned'',''document.folder_failed'',''document.access_granted'',''document.access_revoked''))';
END $$;

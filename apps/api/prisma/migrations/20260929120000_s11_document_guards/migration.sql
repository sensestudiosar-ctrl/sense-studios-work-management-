CREATE UNIQUE INDEX "document_folders_project_path_ci_key" ON "document_folders"("projectId", lower("logicalPath"));

CREATE FUNCTION "guard_s11_folder"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Document folders cannot be deleted'; END IF;
  IF ROW(NEW."id",NEW."organizationId",NEW."projectId",NEW."parentId",NEW."name",NEW."normalizedName",NEW."logicalPath",NEW."templatePath",NEW."confidential",NEW."createdById",NEW."createdAt")
     IS DISTINCT FROM ROW(OLD."id",OLD."organizationId",OLD."projectId",OLD."parentId",OLD."name",OLD."normalizedName",OLD."logicalPath",OLD."templatePath",OLD."confidential",OLD."createdById",OLD."createdAt")
  THEN RAISE EXCEPTION 'Document folder identity and policy are immutable'; END IF;
  IF NEW."provisionState"='READY' AND NEW."provisionError" IS NOT NULL THEN RAISE EXCEPTION 'Ready folder cannot have an error'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "document_folders_guard" BEFORE UPDATE OR DELETE ON "document_folders" FOR EACH ROW EXECUTE FUNCTION "guard_s11_folder"();

CREATE FUNCTION "guard_s11_upload"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Upload history cannot be deleted'; END IF;
  IF ROW(NEW."id",NEW."organizationId",NEW."projectId",NEW."folderId",NEW."actorId",NEW."fileName",NEW."mimeType",NEW."sizeBytes",NEW."chunkSize",NEW."chunkCount",NEW."confidential",NEW."viewOnly",NEW."reason",NEW."createdAt",NEW."expiresAt")
     IS DISTINCT FROM ROW(OLD."id",OLD."organizationId",OLD."projectId",OLD."folderId",OLD."actorId",OLD."fileName",OLD."mimeType",OLD."sizeBytes",OLD."chunkSize",OLD."chunkCount",OLD."confidential",OLD."viewOnly",OLD."reason",OLD."createdAt",OLD."expiresAt")
  THEN RAISE EXCEPTION 'Upload manifest is immutable'; END IF;
  IF OLD."state"<>'STAGING' OR NEW."state" NOT IN ('FINALIZED','ABORTED') THEN RAISE EXCEPTION 'Upload state transition is invalid'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "document_uploads_guard" BEFORE UPDATE OR DELETE ON "document_uploads" FOR EACH ROW EXECUTE FUNCTION "guard_s11_upload"();

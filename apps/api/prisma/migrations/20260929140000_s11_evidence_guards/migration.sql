CREATE FUNCTION "s11_canonical_delivery"(audit_id UUID) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM "audit_events" a
    JOIN "domain_events" e ON e."organizationId"=a."organizationId" AND e."eventName"=a."eventKey"
      AND e."subjectType"=a."subjectType" AND e."subjectId"=a."subjectId" AND e."actorId"=a."actorId"
      AND e."payload"->>'auditEventId'=a."id"::text
    JOIN "outbox_deliveries" o ON o."eventId"=e."id" AND o."consumer"='NTF'
    WHERE a."id"=audit_id
  )
$$;

CREATE FUNCTION "check_s11_folder_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_key TEXT;
BEGIN
  IF TG_OP='INSERT' THEN event_key := 'document.folder_created';
  ELSIF NEW."provisionState"='READY' THEN event_key := 'document.folder_provisioned';
  ELSE event_key := 'document.folder_failed'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "audit_events" a
    WHERE a."organizationId"=NEW."organizationId" AND a."eventKey"=event_key
      AND a."subjectType"='document_folder' AND a."subjectId"=NEW."id"::text
      AND a."after"->>'projectId'=NEW."projectId"::text
      AND (TG_OP<>'INSERT' OR a."actorId"=NEW."createdById")
      AND (TG_OP='INSERT' OR a."after"->>'provisionState'=NEW."provisionState"::text)
      AND "s11_canonical_delivery"(a."id")
  ) THEN RAISE EXCEPTION 'Folder mutation requires canonical audit/event/outbox evidence'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "document_folder_evidence" AFTER INSERT OR UPDATE ON "document_folders" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s11_folder_evidence"();

CREATE FUNCTION "check_s11_file_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE document_row "documents"%ROWTYPE; upload_row "document_uploads"%ROWTYPE; blob_row "file_blob_metadata"%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME='documents' THEN
    document_row := NEW;
    SELECT * INTO blob_row FROM "file_blob_metadata" b WHERE b."documentId"=document_row."id" AND b."organizationId"=document_row."organizationId";
  ELSE
    blob_row := NEW;
    SELECT * INTO document_row FROM "documents" d WHERE d."id"=blob_row."documentId" AND d."organizationId"=blob_row."organizationId";
  END IF;
  SELECT * INTO upload_row FROM "document_uploads" u WHERE u."finalizedBlobId"=blob_row."id" AND u."organizationId"=blob_row."organizationId" AND u."state"='FINALIZED';
  IF document_row."id" IS NULL OR blob_row."id" IS NULL OR upload_row."id" IS NULL
     OR ROW(document_row."projectId",document_row."folderId",document_row."createdById",document_row."confidential",document_row."viewOnly")
        IS DISTINCT FROM ROW(upload_row."projectId",upload_row."folderId",upload_row."actorId",upload_row."confidential",upload_row."viewOnly")
     OR ROW(blob_row."fileName",blob_row."mimeType",blob_row."sizeBytes") IS DISTINCT FROM ROW(upload_row."fileName",upload_row."mimeType",upload_row."sizeBytes")
     OR NOT EXISTS (
       SELECT 1 FROM "audit_events" a WHERE a."organizationId"=document_row."organizationId"
         AND a."eventKey"='document.uploaded' AND a."subjectType"='document' AND a."subjectId"=document_row."id"::text
         AND a."actorId"=upload_row."actorId" AND a."reason"=upload_row."reason"
         AND a."after"->>'projectId'=document_row."projectId"::text
         AND a."after"->>'folderId'=document_row."folderId"::text
         AND a."after"->>'blobId'=blob_row."id"::text
         AND a."after"->>'sha256'=blob_row."sha256"
         AND a."after"->>'sizeBytes'=blob_row."sizeBytes"::text
         AND "s11_canonical_delivery"(a."id")
     )
  THEN RAISE EXCEPTION 'File registration requires matching upload and canonical evidence'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "document_registration_evidence" AFTER INSERT ON "documents" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s11_file_evidence"();
CREATE CONSTRAINT TRIGGER "file_blob_registration_evidence" AFTER INSERT ON "file_blob_metadata" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s11_file_evidence"();

CREATE FUNCTION "check_s11_upload_finalization"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."state"='FINALIZED' AND NOT EXISTS (
    SELECT 1 FROM "file_blob_metadata" b JOIN "documents" d ON d."id"=b."documentId" AND d."organizationId"=b."organizationId"
    WHERE b."id"=NEW."finalizedBlobId" AND b."organizationId"=NEW."organizationId"
      AND d."projectId"=NEW."projectId" AND d."folderId"=NEW."folderId" AND d."createdById"=NEW."actorId"
  ) THEN RAISE EXCEPTION 'Finalized upload requires its registered document'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "document_upload_finalization_evidence" AFTER UPDATE ON "document_uploads" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s11_upload_finalization"();

CREATE FUNCTION "check_s11_grant_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_key TEXT;
BEGIN
  event_key := CASE WHEN TG_OP='INSERT' THEN 'document.access_granted' ELSE 'document.access_revoked' END;
  IF NOT EXISTS (
    SELECT 1 FROM "audit_events" a JOIN "accounts" actor ON actor."id"=a."actorId"
    WHERE a."organizationId"=NEW."organizationId" AND a."eventKey"=event_key
      AND a."subjectType"='document_grant' AND a."subjectId"=NEW."id"::text
      AND actor."kind"='OWNER' AND actor."state"='ACTIVE'
      AND (TG_OP<>'INSERT' OR a."actorId"=NEW."grantedById" AND a."reason"=NEW."reason")
      AND a."after"->>'projectId'=NEW."projectId"::text
      AND a."after"->>'resourceKind'=NEW."resourceKind"::text
      AND a."after"->>'resourceId'=NEW."resourceId"::text
      AND a."after"->>'employeeId'=NEW."employeeId"::text
      AND "s11_canonical_delivery"(a."id")
  ) THEN RAISE EXCEPTION 'Document grant mutation requires Owner canonical evidence'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "document_grant_evidence" AFTER INSERT OR UPDATE ON "document_access_grants" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s11_grant_evidence"();

CREATE FUNCTION "guard_s11_upload_chunk_manifest"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE manifest "document_uploads"%ROWTYPE; expected_size INTEGER;
BEGIN
  SELECT * INTO manifest FROM "document_uploads" u WHERE u."id"=NEW."uploadId" AND u."organizationId"=NEW."organizationId";
  IF manifest."id" IS NULL OR manifest."state"<>'STAGING' OR manifest."expiresAt"<=CURRENT_TIMESTAMP OR NEW."index">=manifest."chunkCount" THEN
    RAISE EXCEPTION 'Upload chunk is not part of an active manifest';
  END IF;
  expected_size := CASE WHEN NEW."index"=manifest."chunkCount"-1 THEN manifest."sizeBytes"-NEW."index"*manifest."chunkSize" ELSE manifest."chunkSize" END;
  IF NEW."sizeBytes"<>expected_size THEN RAISE EXCEPTION 'Upload chunk size differs from manifest'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "document_upload_chunk_manifest_guard" BEFORE INSERT ON "document_upload_chunks" FOR EACH ROW EXECUTE FUNCTION "guard_s11_upload_chunk_manifest"();

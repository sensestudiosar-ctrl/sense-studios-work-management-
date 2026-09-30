CREATE FUNCTION "guard_s12_file_retention"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE file_project UUID;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Protected file retention cannot be deleted'; END IF;
 SELECT d."projectId" INTO file_project FROM "file_blob_metadata" b JOIN "documents" d ON d."id"=b."documentId" AND d."organizationId"=b."organizationId" WHERE b."id"=NEW."blobId" AND b."organizationId"=NEW."organizationId";
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW."blobId",NEW."organizationId") IS DISTINCT FROM ROW(OLD."blobId",OLD."organizationId") OR OLD."retentionClass"<>'NONE' AND NEW."retentionClass"<>OLD."retentionClass" THEN RAISE EXCEPTION 'Protected file policy cannot be downgraded'; END IF;
  IF OLD."projectClosedAt" IS NOT NULL AND ROW(NEW."projectClosedAt",NEW."retainUntil") IS DISTINCT FROM ROW(OLD."projectClosedAt",OLD."retainUntil") THEN RAISE EXCEPTION 'Protected file clock cannot be reset'; END IF;
 END IF;
 IF NEW."retentionClass"='ISSUED_DRAWING' AND NOT EXISTS(SELECT 1 FROM "document_revisions" r JOIN "transmittal_items" i ON i."revisionId"=r."id" WHERE r."blobId"=NEW."blobId") THEN RAISE EXCEPTION 'Issued drawing policy requires exact issued evidence'; END IF;
 IF NEW."projectClosedAt" IS NOT NULL AND NEW."projectClosedAt" IS DISTINCT FROM (SELECT min("occurredAt") FROM "project_status_changes" WHERE "projectId"=file_project AND "toStatus" IN ('COMPLETED','CANCELLED')) THEN RAISE EXCEPTION 'Protected file clock requires first canonical project close'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "file_retention_protected_clock" BEFORE INSERT OR UPDATE OR DELETE ON "file_retention_records" FOR EACH ROW EXECUTE FUNCTION "guard_s12_file_retention"();
-- An association created after closure must use the existing first-close clock as well.
CREATE FUNCTION "anchor_s12_new_file_retention"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE closed_at TIMESTAMPTZ(3);
BEGIN
 IF NEW."retentionClass" NOT IN ('ISSUED_DRAWING','CLIENT_APPROVAL_EVIDENCE') OR NEW."projectClosedAt" IS NOT NULL THEN RETURN NULL; END IF;
 SELECT min(h."occurredAt") INTO closed_at FROM "project_status_changes" h JOIN "documents" d ON d."projectId"=h."projectId" JOIN "file_blob_metadata" b ON b."documentId"=d."id" WHERE b."id"=NEW."blobId" AND h."toStatus" IN ('COMPLETED','CANCELLED');
 IF closed_at IS NOT NULL THEN UPDATE "file_retention_records" SET "projectClosedAt"=closed_at,"retainUntil"=closed_at+interval '10 years' WHERE "blobId"=NEW."blobId" AND "projectClosedAt" IS NULL; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "new_file_retention_close_anchor" AFTER INSERT OR UPDATE ON "file_retention_records" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "anchor_s12_new_file_retention"();

-- Forward defense in depth: native delivery and production evidence remain exact.
CREATE FUNCTION s21_native_delivery_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g external_portal_grants%ROWTYPE; p projects%ROWTYPE;
BEGIN
 SELECT * INTO p FROM projects WHERE id=NEW."projectId" AND "organizationId"=NEW."organizationId" FOR SHARE;
 SELECT * INTO g FROM external_portal_grants WHERE id=NEW."grantId" FOR SHARE;
 IF p.id IS NULL OR (p.status<>'ACTIVE' AND NOT(p.status='CANCELLED' AND g."closeoutTaskId" IS NOT NULL))
 OR NOT EXISTS(SELECT 1 FROM document_revisions r JOIN file_blob_metadata b ON b.id=r."blobId"
   WHERE r.id=NEW."revisionId" AND r."projectId"=p.id AND b."documentId"=r."fileId" AND b.sha256=r.sha256 AND b."fileName" ~* '\.(dwg|skp|rvt)$')
 THEN RAISE EXCEPTION 'Native shares require an exact CAD revision and current delivery/closeout state'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s21_native_delivery BEFORE INSERT ON external_cad_shares FOR EACH ROW EXECUTE FUNCTION s21_native_delivery_scope();

CREATE FUNCTION s21_advisory_production_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."releaseId" IS NOT NULL THEN
  PERFORM id FROM turnkey_releases WHERE id=NEW."releaseId" AND "projectId"=NEW."projectId" FOR SHARE;
  IF NOT EXISTS(SELECT 1 FROM turnkey_releases WHERE id=NEW."releaseId" AND "projectId"=NEW."projectId" AND "organizationId"=NEW."organizationId" AND state='RELEASED' AND "replacedById" IS NULL)
  THEN RAISE EXCEPTION 'Advisory production evidence requires current exact released context'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s21_advisory_production BEFORE INSERT ON external_portal_records FOR EACH ROW EXECUTE FUNCTION s21_advisory_production_scope();

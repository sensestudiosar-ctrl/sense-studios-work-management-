-- Forward guard tightening; preserve all previously applied migrations/data.
CREATE OR REPLACE FUNCTION s21_grant_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p projects%ROWTYPE;
BEGIN
 SELECT * INTO p FROM projects WHERE id=NEW."projectId" AND "organizationId"=NEW."organizationId" FOR SHARE;
 IF p.id IS NULL OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."accountId" AND kind='EXTERNAL') THEN RAISE EXCEPTION 'Exact external project identity required'; END IF;
 IF TG_OP='INSERT' THEN
  IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."invitedById" AND kind IN('OWNER','STAFF') AND state='ACTIVE') THEN RAISE EXCEPTION 'Current internal inviter required'; END IF;
  IF NEW."closeoutTaskId" IS NULL AND p.status<>'ACTIVE' THEN RAISE EXCEPTION 'Active project grant required'; END IF;
  IF NEW."closeoutTaskId" IS NOT NULL AND (p.status<>'CANCELLED' OR cardinality(NEW."releaseIds")>0 OR NOT EXISTS(SELECT 1 FROM tasks t JOIN task_closeout_approvals c ON c."taskId"=t.id WHERE t.id=NEW."closeoutTaskId" AND t."projectId"=p.id AND t.type='CLOSEOUT' AND t.status NOT IN('COMPLETED','STOPPED_DUE_TO_PROJECT_CANCELLATION') AND c."revokedAt" IS NULL)) THEN RAISE EXCEPTION 'Approved closeout files/package scope required'; END IF;
 ELSE
  IF ROW(NEW.id,NEW."organizationId",NEW."projectId",NEW."accountId",NEW."portalType",NEW."invitedById",NEW.reason,NEW."createdAt",NEW."closeoutTaskId") IS DISTINCT FROM ROW(OLD.id,OLD."organizationId",OLD."projectId",OLD."accountId",OLD."portalType",OLD."invitedById",OLD.reason,OLD."createdAt",OLD."closeoutTaskId") OR NEW.version<>OLD.version+1 OR OLD."revokedAt" IS NOT NULL THEN RAISE EXCEPTION 'Grant identity/history retained'; END IF;
 END IF;
 -- Revocation must remain possible after a source becomes Confidential/replaced.
 IF NEW."revokedAt" IS NULL AND (EXISTS(SELECT 1 FROM unnest(NEW."revisionIds") i WHERE NOT EXISTS(SELECT 1 FROM document_revisions r WHERE r.id=i AND r."projectId"=p.id AND s21_nonconfidential_revision(i))) OR EXISTS(SELECT 1 FROM unnest(NEW."releaseIds") i WHERE NOT EXISTS(SELECT 1 FROM turnkey_releases r WHERE r.id=i AND r."projectId"=p.id AND r.state='RELEASED' AND r."replacedById" IS NULL)) OR EXISTS(SELECT 1 FROM unnest(NEW."packageIds") i WHERE NOT EXISTS(SELECT 1 FROM site_records r WHERE r.id=i AND r."projectId"=p.id AND r.kind='PACKAGE'))) THEN RAISE EXCEPTION 'Exact current project resources required'; END IF;
 IF NEW."closeoutTaskId" IS NOT NULL AND cardinality(NEW."releaseIds")>0 THEN RAISE EXCEPTION 'Closeout cannot regain delivery releases'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION s21_record_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g external_portal_grants%ROWTYPE; k text; p text;
BEGIN
 SELECT * INTO g FROM external_portal_grants WHERE id=NEW."grantId" FOR SHARE;
 SELECT kind::text INTO k FROM accounts WHERE id=NEW."actorId" AND state='ACTIVE' FOR SHARE;
 SELECT status::text INTO p FROM projects WHERE id=NEW."projectId" FOR SHARE;
 IF NOT s21_grant_usable(g.id) OR (p<>'ACTIVE' AND g."closeoutTaskId" IS NULL) THEN RAISE EXCEPTION 'Current delivery/closeout grant required'; END IF;
 IF NEW.kind='STAFF_REQUEST' THEN IF k NOT IN('OWNER','STAFF') THEN RAISE EXCEPTION 'Internal request authority required'; END IF;
 ELSE
  IF k IS DISTINCT FROM 'EXTERNAL' OR g."accountId"<>NEW."actorId" OR NEW."idempotencyKey" IS NULL OR NEW."payloadHash" IS NULL THEN RAISE EXCEPTION 'Own external submission/idempotency required'; END IF;
  IF NEW.kind='REVIEW' AND (g."portalType"<>'CONSULTANT' OR NEW."revisionId" IS NULL) OR NEW.kind='PRODUCTION_STATUS' AND (g."portalType"<>'VENDOR_FACTORY' OR NEW."releaseId" IS NULL AND NEW."packageId" IS NULL) THEN RAISE EXCEPTION 'Scoped advisory persona required'; END IF;
 END IF;
 IF NEW."revisionId" IS NOT NULL AND (NOT NEW."revisionId"=ANY(g."revisionIds") OR NOT s21_nonconfidential_revision(NEW."revisionId")) OR NEW."releaseId" IS NOT NULL AND NOT NEW."releaseId"=ANY(g."releaseIds") OR NEW."packageId" IS NOT NULL AND NOT NEW."packageId"=ANY(g."packageIds") THEN RAISE EXCEPTION 'Exact scoped evidence required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s21_record_scope BEFORE INSERT ON external_portal_records FOR EACH ROW EXECUTE FUNCTION s21_record_scope();

CREATE FUNCTION s21_upload_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g external_portal_grants%ROWTYPE; p text;
BEGIN
 SELECT * INTO g FROM external_portal_grants WHERE id=NEW."grantId" FOR SHARE;
 SELECT status::text INTO p FROM projects WHERE id=NEW."projectId" FOR SHARE;
 IF NOT s21_grant_usable(g.id) OR g."accountId"<>NEW."actorId" OR (p<>'ACTIVE' AND g."closeoutTaskId" IS NULL) THEN RAISE EXCEPTION 'Own active external upload scope required'; END IF;
 IF TG_OP='INSERT' THEN IF NEW.state<>'STAGING' THEN RAISE EXCEPTION 'Upload must stage first'; END IF;
 ELSE
  IF OLD.state<>'STAGING' OR NEW.state<>'FINALIZED' OR ROW(NEW.id,NEW."organizationId",NEW."projectId",NEW."grantId",NEW."actorId",NEW."fileName",NEW."mimeType",NEW."sizeBytes",NEW."chunkSize",NEW."chunkCount",NEW.reason,NEW."expiresAt",NEW."createdAt") IS DISTINCT FROM ROW(OLD.id,OLD."organizationId",OLD."projectId",OLD."grantId",OLD."actorId",OLD."fileName",OLD."mimeType",OLD."sizeBytes",OLD."chunkSize",OLD."chunkCount",OLD.reason,OLD."expiresAt",OLD."createdAt") OR OLD."expiresAt"<=clock_timestamp() THEN RAISE EXCEPTION 'Exact one-way upload finalization required'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER s21_upload_scope BEFORE INSERT OR UPDATE ON external_portal_uploads FOR EACH ROW EXECUTE FUNCTION s21_upload_guard();
CREATE TRIGGER s21_upload_delete BEFORE DELETE ON external_portal_uploads FOR EACH ROW EXECUTE FUNCTION s21_immutable();
CREATE FUNCTION s21_chunk_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE u external_portal_uploads%ROWTYPE; expected integer;
BEGIN
 SELECT * INTO u FROM external_portal_uploads WHERE id=NEW."uploadId" FOR SHARE;
 expected:=CASE WHEN NEW.index=u."chunkCount"-1 THEN u."sizeBytes"-NEW.index::bigint*u."chunkSize" ELSE u."chunkSize" END;
 IF u.state<>'STAGING' OR u."expiresAt"<=clock_timestamp() OR NOT s21_grant_usable(u."grantId") OR NEW.index>=u."chunkCount" OR NEW."sizeBytes"<>expected THEN RAISE EXCEPTION 'Current exact upload chunk required'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER s21_chunk_scope BEFORE INSERT ON external_portal_upload_chunks FOR EACH ROW EXECUTE FUNCTION s21_chunk_guard();

CREATE FUNCTION s21_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE head integer;
BEGIN
 IF NEW."subjectType"='external_portal_grants' THEN SELECT version INTO head FROM external_portal_grants WHERE id=NEW."subjectId" AND "projectId"=NEW."projectId" AND "organizationId"=NEW."organizationId";
 ELSIF NEW."subjectType"='external_cad_shares' THEN SELECT version INTO head FROM external_cad_shares WHERE id=NEW."subjectId" AND "projectId"=NEW."projectId" AND "organizationId"=NEW."organizationId";
 ELSIF NEW."subjectType"='external_portal_uploads' THEN SELECT CASE WHEN state='FINALIZED' THEN 2 ELSE 1 END INTO head FROM external_portal_uploads WHERE id=NEW."subjectId" AND "projectId"=NEW."projectId" AND "organizationId"=NEW."organizationId";
 ELSIF NEW."subjectType"='external_portal_records' THEN SELECT 1 INTO head FROM external_portal_records WHERE id=NEW."subjectId" AND "projectId"=NEW."projectId" AND "organizationId"=NEW."organizationId";
 END IF;
 IF head IS NULL OR NEW."subjectVersion">head OR NEW.snapshot->>'id' IS DISTINCT FROM NEW."subjectId"::text OR NEW.snapshot->>'projectId' IS DISTINCT FROM NEW."projectId"::text THEN RAISE EXCEPTION 'Real scoped external evidence version required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM domain_events e JOIN audit_events a ON a.id=(e.payload->>'auditEventId')::uuid JOIN outbox_deliveries o ON o."eventId"=e.id AND o.consumer='NTF' WHERE e.id=NEW."eventId" AND e."eventName"='external.changed' AND a."eventKey"='external.changed' AND e."subjectType"=NEW."subjectType" AND a."subjectType"=NEW."subjectType" AND e."organizationId"=NEW."organizationId" AND a."organizationId"=NEW."organizationId" AND e."actorId"=NEW."actorId" AND a."actorId"=NEW."actorId" AND e."subjectId"=NEW."subjectId"::text AND a."subjectId"=NEW."subjectId"::text AND a.reason=NEW.reason AND a."after"=jsonb_build_object('projectId',NEW."projectId",'version',NEW."subjectVersion",'snapshotSha256',encode(sha256(convert_to(NEW.snapshot::text,'UTF8')),'hex'))) THEN RAISE EXCEPTION 'Exact external canonical history required'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s21_history_canonical AFTER INSERT ON external_portal_history DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s21_history_guard();

CREATE FUNCTION s21_external_handover_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p projects%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."accountId" AND kind='EXTERNAL') THEN RETURN NEW; END IF;
 SELECT * INTO p FROM projects WHERE id=NEW."projectId" AND "organizationId"=NEW."organizationId" FOR SHARE;
 IF TG_OP='INSERT' AND p.status<>'ACTIVE' THEN RAISE EXCEPTION 'External issue requires Active delivery'; END IF;
 PERFORM id FROM external_portal_grants WHERE "projectId"=p.id AND "accountId"=NEW."accountId" FOR SHARE;
 IF EXISTS(SELECT 1 FROM transmittal_items i WHERE i."transmittalId"=NEW."transmittalId" AND (NOT s21_nonconfidential_revision(i."revisionId") OR NOT EXISTS(SELECT 1 FROM external_portal_grants g WHERE g."projectId"=p.id AND g."accountId"=NEW."accountId" AND i."revisionId"=ANY(g."revisionIds") AND s21_grant_usable(g.id)))) THEN RAISE EXCEPTION 'External transmittal requires every current exact grant'; END IF;
 IF TG_OP='UPDATE' AND p.status<>'ACTIVE' AND NOT EXISTS(SELECT 1 FROM external_portal_grants g WHERE g."projectId"=p.id AND g."accountId"=NEW."accountId" AND g."closeoutTaskId" IS NOT NULL AND s21_grant_usable(g.id)) THEN RAISE EXCEPTION 'External acknowledgement requires delivery or approved closeout'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s21_external_recipient BEFORE INSERT OR UPDATE ON transmittal_recipients FOR EACH ROW EXECUTE FUNCTION s21_external_handover_guard();

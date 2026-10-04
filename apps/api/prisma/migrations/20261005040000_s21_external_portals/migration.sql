CREATE TABLE external_portal_grants (
 id uuid PRIMARY KEY,"organizationId" uuid NOT NULL,"projectId" uuid NOT NULL,"accountId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 "portalType" varchar(20) NOT NULL CHECK("portalType" IN ('CONSULTANT','VENDOR_FACTORY')),
 "revisionIds" uuid[] NOT NULL,"releaseIds" uuid[] NOT NULL,"packageIds" uuid[] NOT NULL,
 "expiresAt" timestamptz(3),"closeoutTaskId" uuid REFERENCES tasks(id) ON DELETE RESTRICT,"revokedAt" timestamptz(3),version integer NOT NULL DEFAULT 1 CHECK(version>0),
 "invitedById" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,reason varchar(1000) NOT NULL CHECK(length(trim(reason))>=3),"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(id,"organizationId","projectId"),FOREIGN KEY("projectId","organizationId") REFERENCES projects(id,"organizationId") ON DELETE RESTRICT,
 CHECK(cardinality("revisionIds")+cardinality("releaseIds")+cardinality("packageIds") BETWEEN 1 AND 150),CHECK("closeoutTaskId" IS NULL OR "expiresAt" IS NOT NULL)
);
CREATE INDEX external_portal_grants_account_idx ON external_portal_grants("accountId","revokedAt","expiresAt");
CREATE TABLE external_portal_sessions (
 id uuid PRIMARY KEY,"accountId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,"tokenHash" char(64) NOT NULL UNIQUE,"csrfTokenHash" char(64) NOT NULL,
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"lastUsedAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"expiresAt" timestamptz(3) NOT NULL,"revokedAt" timestamptz(3),"userAgent" varchar(512),"ipAddress" varchar(64),
 CHECK("tokenHash"~'^[a-f0-9]{64}$' AND "csrfTokenHash"~'^[a-f0-9]{64}$' AND "expiresAt">"createdAt")
);
CREATE INDEX external_portal_sessions_account_idx ON external_portal_sessions("accountId","revokedAt","expiresAt");
CREATE TABLE external_portal_codes (
 "accountId" uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE RESTRICT,"codeHash" char(64) NOT NULL,attempts integer NOT NULL DEFAULT 0,"sendWindowStartedAt" timestamptz(3) NOT NULL,"sendsInWindow" integer NOT NULL DEFAULT 1,"lastSentAt" timestamptz(3) NOT NULL,"expiresAt" timestamptz(3) NOT NULL,"consumedAt" timestamptz(3),
 CHECK("codeHash"~'^[a-f0-9]{64}$' AND attempts BETWEEN 0 AND 5 AND "sendsInWindow" BETWEEN 1 AND 5 AND "expiresAt">"lastSentAt")
);
CREATE INDEX external_portal_codes_expires_idx ON external_portal_codes("expiresAt");
CREATE TABLE external_portal_history (
 id uuid PRIMARY KEY,"organizationId" uuid NOT NULL,"projectId" uuid NOT NULL,"subjectType" varchar(30) NOT NULL,"subjectId" uuid NOT NULL,"subjectVersion" integer NOT NULL CHECK("subjectVersion">0),"actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 reason varchar(1000) NOT NULL CHECK(length(trim(reason))>=3),snapshot jsonb NOT NULL,"eventId" uuid NOT NULL UNIQUE REFERENCES domain_events(id) ON DELETE RESTRICT,"occurredAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("subjectId","subjectVersion"),FOREIGN KEY("projectId","organizationId") REFERENCES projects(id,"organizationId") ON DELETE RESTRICT
);
CREATE INDEX external_portal_history_project_idx ON external_portal_history("projectId","occurredAt",id);
CREATE TABLE external_portal_records (
 id uuid PRIMARY KEY,"organizationId" uuid NOT NULL,"projectId" uuid NOT NULL,"grantId" uuid NOT NULL,"actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 kind varchar(25) NOT NULL CHECK(kind IN('STAFF_REQUEST','REQUEST','REVIEW','COMMENT','PRODUCTION_STATUS')),title varchar(160) NOT NULL CHECK(length(trim(title))>0),body varchar(2000) NOT NULL,
 "revisionId" uuid REFERENCES document_revisions(id) ON DELETE RESTRICT,"releaseId" uuid REFERENCES turnkey_releases(id) ON DELETE RESTRICT,"packageId" uuid REFERENCES site_records(id) ON DELETE RESTRICT,"dueDate" timestamptz(3),
 "idempotencyKey" uuid,"payloadHash" char(64),reason varchar(1000) NOT NULL CHECK(length(trim(reason))>=3),"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("actorId","idempotencyKey"),FOREIGN KEY("grantId","organizationId","projectId") REFERENCES external_portal_grants(id,"organizationId","projectId") ON DELETE RESTRICT
);
CREATE INDEX external_portal_records_project_idx ON external_portal_records("projectId","grantId","createdAt",id);
CREATE TABLE external_portal_uploads (
 id uuid PRIMARY KEY,"organizationId" uuid NOT NULL,"projectId" uuid NOT NULL,"grantId" uuid NOT NULL,"actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 "fileName" varchar(240) NOT NULL,"mimeType" varchar(160) NOT NULL,"sizeBytes" bigint NOT NULL CHECK("sizeBytes">0),"chunkSize" integer NOT NULL,"chunkCount" integer NOT NULL CHECK("chunkCount">0),
 state varchar(20) NOT NULL DEFAULT 'STAGING' CHECK(state IN('STAGING','FINALIZED')),"storageKey" varchar(255),sha256 char(64),reason varchar(1000) NOT NULL CHECK(length(trim(reason))>=3),"expiresAt" timestamptz(3) NOT NULL,"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"finalizedAt" timestamptz(3),
 FOREIGN KEY("grantId","organizationId","projectId") REFERENCES external_portal_grants(id,"organizationId","projectId") ON DELETE RESTRICT,
 CHECK("chunkSize"=8388608 AND "chunkCount"=ceil("sizeBytes"::numeric/"chunkSize")),CHECK((state='STAGING' AND "storageKey" IS NULL AND sha256 IS NULL AND "finalizedAt" IS NULL) OR (state='FINALIZED' AND "storageKey" IS NOT NULL AND sha256~'^[a-f0-9]{64}$' AND "finalizedAt" IS NOT NULL))
);
CREATE INDEX external_portal_uploads_project_idx ON external_portal_uploads("projectId","grantId","createdAt",id);
CREATE TABLE external_portal_upload_chunks (
 id uuid PRIMARY KEY,"uploadId" uuid NOT NULL REFERENCES external_portal_uploads(id) ON DELETE RESTRICT,index integer NOT NULL CHECK(index>=0),"sizeBytes" integer NOT NULL CHECK("sizeBytes">0),sha256 char(64) NOT NULL CHECK(sha256~'^[a-f0-9]{64}$'),UNIQUE("uploadId",index)
);
CREATE TABLE external_cad_shares (
 id uuid PRIMARY KEY,"organizationId" uuid NOT NULL,"projectId" uuid NOT NULL,"grantId" uuid NOT NULL,"revisionId" uuid NOT NULL REFERENCES document_revisions(id) ON DELETE RESTRICT,
 "nativeLinkId" varchar(160) NOT NULL,"encryptedSecret" text NOT NULL,"issuedById" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,"issuedAt" timestamptz(3) NOT NULL,"expiresAt" timestamptz(3) NOT NULL,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),"revokedAt" timestamptz(3),"revokedById" uuid REFERENCES accounts(id) ON DELETE RESTRICT,confirmation varchar(1000),reason varchar(1000) NOT NULL CHECK(length(trim(reason))>=3),
 FOREIGN KEY("grantId","organizationId","projectId") REFERENCES external_portal_grants(id,"organizationId","projectId") ON DELETE RESTRICT,
 CHECK("expiresAt"="issuedAt"+interval '7 days'),CHECK(("revokedAt" IS NULL AND "revokedById" IS NULL AND confirmation IS NULL) OR ("revokedAt" IS NOT NULL AND "revokedById" IS NOT NULL AND length(trim(confirmation))>=3))
);
CREATE INDEX external_cad_shares_project_idx ON external_cad_shares("projectId","grantId","revokedAt","expiresAt");

CREATE OR REPLACE FUNCTION check_s14_session_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE k text;
BEGIN
 SELECT kind::text INTO k FROM accounts WHERE id=NEW."accountId";
 IF TG_TABLE_NAME='sessions' AND k NOT IN('OWNER','STAFF') THEN RAISE EXCEPTION 'Internal sessions require internal identity'; END IF;
 IF TG_TABLE_NAME<>'sessions' AND k IS DISTINCT FROM 'CLIENT' THEN RAISE EXCEPTION 'Client portal identity required'; END IF;
 IF TG_TABLE_NAME='client_portal_ceremonies' AND NOT EXISTS(SELECT 1 FROM client_portal_sessions WHERE id=NEW."sessionId" AND "accountId"=NEW."accountId") THEN RAISE EXCEPTION 'Same client session required'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION s21_session_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."accountId" AND kind='EXTERNAL') THEN RAISE EXCEPTION 'External identity required'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER s21_session_kind BEFORE INSERT OR UPDATE ON external_portal_sessions FOR EACH ROW EXECUTE FUNCTION s21_session_identity();
CREATE TRIGGER s21_code_kind BEFORE INSERT OR UPDATE ON external_portal_codes FOR EACH ROW EXECUTE FUNCTION s21_session_identity();

CREATE FUNCTION s21_grant_usable(gid uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM external_portal_grants g JOIN projects p ON p.id=g."projectId" JOIN accounts a ON a.id=g."accountId" WHERE g.id=gid AND a.kind='EXTERNAL' AND a.state='ACTIVE' AND g."revokedAt" IS NULL AND (g."expiresAt" IS NULL OR g."expiresAt">clock_timestamp()) AND (
  g."closeoutTaskId" IS NULL AND p.status NOT IN('CANCELLED','ARCHIVED') OR g."closeoutTaskId" IS NOT NULL AND p.status='CANCELLED' AND EXISTS(SELECT 1 FROM tasks t JOIN task_closeout_approvals c ON c."taskId"=t.id WHERE t.id=g."closeoutTaskId" AND t."projectId"=p.id AND t.type='CLOSEOUT' AND t.status NOT IN('COMPLETED','STOPPED_DUE_TO_PROJECT_CANCELLATION') AND c."revokedAt" IS NULL)))
$$;
CREATE FUNCTION s21_nonconfidential_revision(rid uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM document_revisions r JOIN documents d ON d.id=r."fileId" WHERE r.id=rid AND NOT d.confidential AND NOT EXISTS(
 WITH RECURSIVE f AS(SELECT id,"parentId",confidential FROM document_folders WHERE id=d."folderId" UNION ALL SELECT p.id,p."parentId",p.confidential FROM document_folders p JOIN f ON f."parentId"=p.id) SELECT 1 FROM f WHERE confidential))
$$;
CREATE FUNCTION s21_grant_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p projects%ROWTYPE;
BEGIN
 SELECT * INTO p FROM projects WHERE id=NEW."projectId" AND "organizationId"=NEW."organizationId" FOR SHARE;
 IF p.id IS NULL OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."accountId" AND kind='EXTERNAL') THEN RAISE EXCEPTION 'Exact external project identity required'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW."closeoutTaskId" IS NULL AND p.status<>'ACTIVE' THEN RAISE EXCEPTION 'Active project grant required'; END IF;
  IF NEW."closeoutTaskId" IS NOT NULL AND (p.status<>'CANCELLED' OR NOT EXISTS(SELECT 1 FROM tasks t JOIN task_closeout_approvals c ON c."taskId"=t.id WHERE t.id=NEW."closeoutTaskId" AND t."projectId"=p.id AND t.type='CLOSEOUT' AND t.status NOT IN('COMPLETED','STOPPED_DUE_TO_PROJECT_CANCELLATION') AND c."revokedAt" IS NULL)) THEN RAISE EXCEPTION 'Approved closeout task required'; END IF;
 ELSE
  IF ROW(NEW.id,NEW."organizationId",NEW."projectId",NEW."accountId",NEW."portalType",NEW."invitedById",NEW.reason,NEW."createdAt",NEW."closeoutTaskId") IS DISTINCT FROM ROW(OLD.id,OLD."organizationId",OLD."projectId",OLD."accountId",OLD."portalType",OLD."invitedById",OLD.reason,OLD."createdAt",OLD."closeoutTaskId") OR NEW.version<>OLD.version+1 OR OLD."revokedAt" IS NOT NULL THEN RAISE EXCEPTION 'Grant identity/history retained'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM unnest(NEW."revisionIds") i WHERE NOT EXISTS(SELECT 1 FROM document_revisions r WHERE r.id=i AND r."projectId"=p.id AND s21_nonconfidential_revision(i))) OR EXISTS(SELECT 1 FROM unnest(NEW."releaseIds") i WHERE NOT EXISTS(SELECT 1 FROM turnkey_releases r WHERE r.id=i AND r."projectId"=p.id AND r.state='RELEASED')) OR EXISTS(SELECT 1 FROM unnest(NEW."packageIds") i WHERE NOT EXISTS(SELECT 1 FROM site_records r WHERE r.id=i AND r."projectId"=p.id AND r.kind='PACKAGE')) THEN RAISE EXCEPTION 'Exact project resources required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s21_grant_scope BEFORE INSERT OR UPDATE ON external_portal_grants FOR EACH ROW EXECUTE FUNCTION s21_grant_guard();

CREATE FUNCTION s21_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'S21 retained evidence is immutable'; END $$;
CREATE TRIGGER s21_grant_delete BEFORE DELETE ON external_portal_grants FOR EACH ROW EXECUTE FUNCTION s21_immutable();
CREATE TRIGGER s21_history_immutable BEFORE UPDATE OR DELETE ON external_portal_history FOR EACH ROW EXECUTE FUNCTION s21_immutable();
CREATE TRIGGER s21_record_immutable BEFORE UPDATE OR DELETE ON external_portal_records FOR EACH ROW EXECUTE FUNCTION s21_immutable();
CREATE TRIGGER s21_chunk_immutable BEFORE UPDATE OR DELETE ON external_portal_upload_chunks FOR EACH ROW EXECUTE FUNCTION s21_immutable();
CREATE FUNCTION s21_share_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g external_portal_grants%ROWTYPE;
BEGIN
 SELECT * INTO g FROM external_portal_grants WHERE id=NEW."grantId" FOR SHARE;
 IF TG_OP='INSERT' THEN
  IF NOT s21_grant_usable(g.id) OR NOT NEW."revisionId"=ANY(g."revisionIds") OR NOT s21_nonconfidential_revision(NEW."revisionId") OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."issuedById" AND kind='OWNER' AND state='ACTIVE') THEN RAISE EXCEPTION 'Owner exact CAD recipient required'; END IF;
 ELSE
  IF OLD."revokedAt" IS NOT NULL OR NEW."revokedAt" IS NULL OR ROW(NEW.id,NEW."organizationId",NEW."projectId",NEW."grantId",NEW."revisionId",NEW."nativeLinkId",NEW."encryptedSecret",NEW."issuedById",NEW."issuedAt",NEW."expiresAt",NEW.reason) IS DISTINCT FROM ROW(OLD.id,OLD."organizationId",OLD."projectId",OLD."grantId",OLD."revisionId",OLD."nativeLinkId",OLD."encryptedSecret",OLD."issuedById",OLD."issuedAt",OLD."expiresAt",OLD.reason) OR NEW.version<>OLD.version+1 OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."revokedById" AND kind='OWNER' AND state='ACTIVE') THEN RAISE EXCEPTION 'One-way Owner native confirmation required'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER s21_share_scope BEFORE INSERT OR UPDATE ON external_cad_shares FOR EACH ROW EXECUTE FUNCTION s21_share_guard();
CREATE TRIGGER s21_share_delete BEFORE DELETE ON external_cad_shares FOR EACH ROW EXECUTE FUNCTION s21_immutable();

CREATE FUNCTION s21_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE h external_portal_history%ROWTYPE; expected jsonb; v integer;
BEGIN
 IF TG_TABLE_NAME='external_portal_grants' THEN expected:=to_jsonb(NEW); v:=NEW.version;
 ELSIF TG_TABLE_NAME='external_cad_shares' THEN expected:=to_jsonb(NEW)-'encryptedSecret'; v:=NEW.version;
 ELSIF TG_TABLE_NAME='external_portal_uploads' THEN expected:=to_jsonb(NEW)-'storageKey'; v:=CASE WHEN NEW.state='FINALIZED' THEN 2 ELSE 1 END;
 ELSE expected:=to_jsonb(NEW); v:=1; END IF;
 SELECT * INTO h FROM external_portal_history WHERE "subjectId"=NEW.id AND "subjectVersion"=v;
 IF h.id IS NULL OR h.snapshot<>expected OR h."organizationId"<>NEW."organizationId" OR h."projectId"<>NEW."projectId" OR NOT EXISTS(SELECT 1 FROM domain_events e JOIN audit_events a ON a.id=(e.payload->>'auditEventId')::uuid JOIN outbox_deliveries o ON o."eventId"=e.id AND o.consumer='NTF' WHERE e.id=h."eventId" AND e."eventName"='external.changed' AND a."eventKey"='external.changed' AND e."organizationId"=h."organizationId" AND a."organizationId"=h."organizationId" AND e."actorId"=h."actorId" AND a."actorId"=h."actorId" AND e."subjectId"=h."subjectId"::text AND a."subjectId"=h."subjectId"::text AND a.reason=h.reason AND a."after"=jsonb_build_object('projectId',h."projectId",'version',h."subjectVersion",'snapshotSha256',encode(sha256(convert_to(h.snapshot::text,'UTF8')),'hex'))) THEN RAISE EXCEPTION 'S21 exact canonical history/event/audit/outbox required'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s21_grant_evidence AFTER INSERT OR UPDATE ON external_portal_grants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s21_evidence_guard();
CREATE CONSTRAINT TRIGGER s21_record_evidence AFTER INSERT ON external_portal_records DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s21_evidence_guard();
CREATE CONSTRAINT TRIGGER s21_share_evidence AFTER INSERT OR UPDATE ON external_cad_shares DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s21_evidence_guard();
CREATE CONSTRAINT TRIGGER s21_upload_evidence AFTER INSERT OR UPDATE ON external_portal_uploads DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s21_evidence_guard();
CREATE FUNCTION s21_cancel_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.status='CANCELLED' AND OLD.status<>'CANCELLED' AND (EXISTS(SELECT 1 FROM external_cad_shares WHERE "projectId"=NEW.id AND "revokedAt" IS NULL AND "expiresAt">clock_timestamp()) OR EXISTS(SELECT 1 FROM external_portal_grants WHERE "projectId"=NEW.id AND "closeoutTaskId" IS NULL AND "revokedAt" IS NULL)) THEN RAISE EXCEPTION 'Native revocation and external access cancellation required'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER s21_cancel_native BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION s21_cancel_guard();
DO $$ DECLARE prior text; BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO prior FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF prior IS NULL THEN RAISE EXCEPTION 'Existing event catalogue required'; END IF;
 ALTER TABLE domain_events DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE format('ALTER TABLE domain_events ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName"=''external.changed'')',prior);
END $$;

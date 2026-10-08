CREATE TABLE automation_records (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "creatorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, "actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 kind varchar(10) NOT NULL CHECK(kind IN ('REPORT','RULE')), "projectId" uuid REFERENCES projects(id) ON DELETE RESTRICT,
 version integer NOT NULL DEFAULT 1 CHECK(version>0), enabled boolean NOT NULL DEFAULT true, data jsonb NOT NULL,
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX automation_record_scope ON automation_records("organizationId",kind,enabled);
CREATE TABLE automation_versions (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "recordId" uuid NOT NULL REFERENCES automation_records(id) ON DELETE RESTRICT, "actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 version integer NOT NULL CHECK(version>0), enabled boolean NOT NULL, data jsonb NOT NULL,
 reason varchar(1000) NOT NULL CHECK(length(btrim(reason)) BETWEEN 3 AND 1000),
 "eventId" uuid NOT NULL UNIQUE REFERENCES domain_events(id) ON DELETE RESTRICT,
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("recordId",version)
);
CREATE TABLE automation_runs (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "ruleId" uuid NOT NULL REFERENCES automation_records(id) ON DELETE RESTRICT, "ruleVersion" integer NOT NULL CHECK("ruleVersion">0),
 "sourceEventId" uuid NOT NULL REFERENCES domain_events(id) ON DELETE RESTRICT,
 "recipientId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 status varchar(20) NOT NULL CHECK(status IN ('DELIVERED','GENERATED','PENDING','SKIPPED')),
 "actionKind" varchar(20) NOT NULL CHECK("actionKind" IN ('NOTIFY','REPORT','RECOMMENDATION')), data jsonb NOT NULL,
 "approvalRequestId" uuid UNIQUE REFERENCES approval_requests(id) ON DELETE RESTRICT,
 "eventId" uuid NOT NULL UNIQUE REFERENCES domain_events(id) ON DELETE RESTRICT,
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("ruleId","ruleVersion","sourceEventId"),
 CHECK((status='PENDING')=("approvalRequestId" IS NOT NULL)), CHECK(status<>'PENDING' OR "actionKind"='RECOMMENDATION')
);
CREATE INDEX automation_run_scope ON automation_runs("organizationId","recipientId","createdAt");
CREATE TABLE automation_receipts (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, "commandId" uuid NOT NULL,
 "payloadHash" char(64) NOT NULL, result jsonb NOT NULL, "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("actorId","commandId")
);
CREATE FUNCTION s26_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'S26 evidence is append-only'; END $$;
CREATE TRIGGER s26_versions_immutable BEFORE UPDATE OR DELETE ON automation_versions FOR EACH ROW EXECUTE FUNCTION s26_immutable();
CREATE TRIGGER s26_runs_immutable BEFORE UPDATE OR DELETE ON automation_runs FOR EACH ROW EXECUTE FUNCTION s26_immutable();
CREATE TRIGGER s26_receipts_immutable BEFORE UPDATE OR DELETE ON automation_receipts FOR EACH ROW EXECUTE FUNCTION s26_immutable();
CREATE TRIGGER s26_records_no_delete BEFORE DELETE ON automation_records FOR EACH ROW EXECUTE FUNCTION s26_immutable();
CREATE FUNCTION s26_record_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.id<>OLD.id OR NEW."organizationId"<>OLD."organizationId" OR NEW."creatorId"<>OLD."creatorId" OR NEW.kind<>OLD.kind OR NEW."projectId" IS DISTINCT FROM OLD."projectId" OR NEW."createdAt"<>OLD."createdAt" OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'S26 identity or version mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s26_record_transition BEFORE UPDATE ON automation_records FOR EACH ROW EXECUTE FUNCTION s26_record_transition();
CREATE FUNCTION s26_record_head() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM automation_versions v WHERE v."recordId"=NEW.id AND v."organizationId"=NEW."organizationId" AND v.version=NEW.version AND v.data=NEW.data AND v.enabled=NEW.enabled AND v."actorId"=NEW."actorId") OR NEW."projectId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=NEW."projectId" AND p."organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'S26 head/version scope mismatch'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s26_record_head AFTER INSERT OR UPDATE ON automation_records DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s26_record_head();
CREATE FUNCTION s26_canonical() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e domain_events; a audit_events; expected text; subject uuid;
BEGIN
 SELECT * INTO e FROM domain_events WHERE id=NEW."eventId";
 SELECT * INTO a FROM audit_events WHERE id=(e.payload->>'auditEventId')::uuid;
 expected:=CASE WHEN TG_TABLE_NAME='automation_versions' THEN 'automation.record_changed' ELSE 'automation.run_created' END;
 subject:=CASE WHEN TG_TABLE_NAME='automation_versions' THEN NEW."recordId" ELSE NEW.id END;
 IF e.id IS NULL OR a.id IS NULL OR e."eventName" IS DISTINCT FROM expected OR a."eventKey" IS DISTINCT FROM expected OR e."organizationId" IS DISTINCT FROM NEW."organizationId" OR a."organizationId" IS DISTINCT FROM NEW."organizationId" OR e."subjectId"::text IS DISTINCT FROM subject::text OR a."subjectId"::text IS DISTINCT FROM subject::text OR a."actorId" IS DISTINCT FROM e."actorId" OR a."correlationId" IS DISTINCT FROM e."correlationId" OR NOT EXISTS(SELECT 1 FROM outbox_deliveries WHERE "eventId"=e.id AND consumer='NTF') THEN RAISE EXCEPTION 'S26 canonical evidence mismatch'; END IF;
 IF TG_TABLE_NAME='automation_versions' THEN
  IF a.after->'data' IS DISTINCT FROM NEW.data OR (a.after->>'version')::integer IS DISTINCT FROM NEW.version OR (a.after->>'enabled')::boolean IS DISTINCT FROM NEW.enabled OR a.reason IS DISTINCT FROM NEW.reason OR e."actorId" IS DISTINCT FROM NEW."actorId" OR NOT EXISTS(SELECT 1 FROM automation_records r WHERE r.id=NEW."recordId" AND r."organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'S26 version evidence mismatch'; END IF;
 ELSE
  IF a.after->>'dataHash' IS DISTINCT FROM encode(sha256(convert_to(NEW.data::text,'UTF8')),'hex') OR a.after->>'sourceEventId' IS DISTINCT FROM NEW."sourceEventId"::text OR a.after->>'status' IS DISTINCT FROM NEW.status OR a.after->>'recipientId' IS DISTINCT FROM NEW."recipientId"::text OR NOT EXISTS(SELECT 1 FROM automation_versions v JOIN automation_records r ON r.id=v."recordId" JOIN domain_events s ON s.id=NEW."sourceEventId" WHERE r.id=NEW."ruleId" AND r.kind='RULE' AND v.version=NEW."ruleVersion" AND v."organizationId"=NEW."organizationId" AND s."organizationId"=NEW."organizationId" AND s."occurredAt">=v."createdAt" AND v.enabled AND v.data->'eventNames' ? s."eventName") THEN RAISE EXCEPTION 'S26 run source/evidence mismatch'; END IF;
  IF NEW."approvalRequestId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM approval_requests p WHERE p.id=NEW."approvalRequestId" AND p."organizationId"=NEW."organizationId" AND p."sourceId"=NEW.id::text AND p."typeKey"='AUTOMATION_RECOMMENDATION') THEN RAISE EXCEPTION 'S26 approval identity mismatch'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s26_version_canonical AFTER INSERT ON automation_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s26_canonical();
CREATE CONSTRAINT TRIGGER s26_run_canonical AFTER INSERT ON automation_runs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s26_canonical();
GRANT SELECT, INSERT, UPDATE ON automation_records TO sense_app_runtime;
GRANT SELECT, INSERT ON automation_versions,automation_runs,automation_receipts TO sense_app_runtime;
REVOKE TRUNCATE, DELETE, UPDATE ON automation_versions,automation_runs,automation_receipts FROM sense_app_runtime;


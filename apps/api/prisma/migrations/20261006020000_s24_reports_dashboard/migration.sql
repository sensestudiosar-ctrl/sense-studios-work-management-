CREATE TABLE report_snapshots (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "creatorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 category varchar(30) NOT NULL CHECK(category IN ('project','employee','leader','time','attendance','quality','documents','skills_training')),
 "from" date NOT NULL, "to" date NOT NULL CHECK("to">="from"), "table" jsonb NOT NULL, manifest jsonb NOT NULL,
 "correctsId" uuid REFERENCES report_snapshots(id) ON DELETE RESTRICT, reason varchar(1000) NOT NULL CHECK(length(btrim(reason)) BETWEEN 3 AND 1000),
 "eventId" uuid NOT NULL UNIQUE REFERENCES domain_events(id) ON DELETE RESTRICT, "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX report_snapshots_org_time ON report_snapshots("organizationId","createdAt",id);
CREATE TABLE dashboard_rules (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "creatorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 enabled boolean NOT NULL, data jsonb NOT NULL, "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX dashboard_rules_org_enabled ON dashboard_rules("organizationId",enabled);
CREATE TABLE dashboard_rule_versions (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "ruleId" uuid NOT NULL REFERENCES dashboard_rules(id) ON DELETE RESTRICT, version integer NOT NULL CHECK(version>0), enabled boolean NOT NULL,
 data jsonb NOT NULL, "actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 reason varchar(1000) NOT NULL CHECK(length(btrim(reason)) BETWEEN 3 AND 1000),
 "eventId" uuid NOT NULL UNIQUE REFERENCES domain_events(id) ON DELETE RESTRICT, "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("ruleId",version)
);
CREATE TABLE personal_reminders (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "creatorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, title varchar(160) NOT NULL CHECK(length(btrim(title))>0),
 "dueAt" timestamptz(3) NOT NULL, reason varchar(1000) NOT NULL CHECK(length(btrim(reason)) BETWEEN 3 AND 1000),
 "eventId" uuid NOT NULL UNIQUE REFERENCES domain_events(id) ON DELETE RESTRICT, "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX personal_reminders_creator_due ON personal_reminders("creatorId","dueAt");
CREATE TABLE dashboard_runs (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "sourceId" uuid NOT NULL, "recipientId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, slot varchar(120) NOT NULL,
 manifest jsonb NOT NULL, "eventId" uuid NOT NULL UNIQUE REFERENCES domain_events(id) ON DELETE RESTRICT,
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("sourceId","recipientId",slot)
);
CREATE TABLE dashboard_receipts (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, "commandId" uuid NOT NULL, "payloadHash" char(64) NOT NULL,
 result jsonb NOT NULL, "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("actorId","commandId")
);
CREATE FUNCTION s24_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'S24 evidence is append-only'; END $$;
CREATE TRIGGER s24_snapshot_immutable BEFORE UPDATE OR DELETE ON report_snapshots FOR EACH ROW EXECUTE FUNCTION s24_immutable();
CREATE TRIGGER s24_version_immutable BEFORE UPDATE OR DELETE ON dashboard_rule_versions FOR EACH ROW EXECUTE FUNCTION s24_immutable();
CREATE TRIGGER s24_reminder_immutable BEFORE UPDATE OR DELETE ON personal_reminders FOR EACH ROW EXECUTE FUNCTION s24_immutable();
CREATE TRIGGER s24_run_immutable BEFORE UPDATE OR DELETE ON dashboard_runs FOR EACH ROW EXECUTE FUNCTION s24_immutable();
CREATE TRIGGER s24_receipt_immutable BEFORE UPDATE OR DELETE ON dashboard_receipts FOR EACH ROW EXECUTE FUNCTION s24_immutable();
CREATE TRIGGER s24_rule_no_delete BEFORE DELETE ON dashboard_rules FOR EACH ROW EXECUTE FUNCTION s24_immutable();
CREATE FUNCTION s24_rule_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id<>OLD.id OR NEW."organizationId"<>OLD."organizationId" OR NEW."creatorId"<>OLD."creatorId" OR NEW."createdAt"<>OLD."createdAt" OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'S24 rule identity/version is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s24_rule_transition BEFORE UPDATE ON dashboard_rules FOR EACH ROW EXECUTE FUNCTION s24_rule_transition();
CREATE FUNCTION s24_canonical() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a audit_events; e domain_events; expected text; subject uuid; actor uuid; org uuid;
BEGIN
 SELECT * INTO e FROM domain_events WHERE id=NEW."eventId";
 SELECT * INTO a FROM audit_events WHERE id=(e.payload->>'auditEventId')::uuid;
 expected:=CASE TG_TABLE_NAME WHEN 'report_snapshots' THEN 'report.finalized' WHEN 'dashboard_rule_versions' THEN 'dashboard.rule_changed' WHEN 'personal_reminders' THEN 'dashboard.reminder_created' ELSE 'dashboard.delivered' END;
 subject:=CASE WHEN TG_TABLE_NAME='dashboard_rule_versions' THEN NEW."ruleId" ELSE NEW.id END;
 actor:=CASE WHEN TG_TABLE_NAME='dashboard_rule_versions' THEN NEW."actorId" WHEN TG_TABLE_NAME='dashboard_runs' THEN e."actorId" ELSE NEW."creatorId" END;
 org:=NEW."organizationId";
 IF e.id IS NULL OR a.id IS NULL OR e."eventName" IS DISTINCT FROM expected OR a."eventKey" IS DISTINCT FROM expected OR e."organizationId" IS DISTINCT FROM org OR a."organizationId" IS DISTINCT FROM org OR e."subjectId"::text IS DISTINCT FROM subject::text OR a."subjectId"::text IS DISTINCT FROM subject::text OR e."actorId" IS DISTINCT FROM actor OR a."actorId" IS DISTINCT FROM actor OR a."correlationId" IS DISTINCT FROM e."correlationId" OR NOT EXISTS(SELECT 1 FROM outbox_deliveries WHERE "eventId"=e.id AND consumer='NTF') THEN RAISE EXCEPTION 'S24 canonical evidence mismatch'; END IF;
 IF TG_TABLE_NAME='report_snapshots' THEN
  IF a.after->>'category' IS DISTINCT FROM NEW.category OR a.after->>'tableHash' IS DISTINCT FROM encode(sha256(convert_to(NEW."table"::text,'UTF8')),'hex') OR a.after->>'manifestHash' IS DISTINCT FROM encode(sha256(convert_to(NEW.manifest::text,'UTF8')),'hex') OR a.reason IS DISTINCT FROM NEW.reason OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."creatorId" AND kind='OWNER' AND state='ACTIVE') THEN RAISE EXCEPTION 'S24 frozen evidence mismatch'; END IF;
  IF NEW."correctsId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM report_snapshots p WHERE p.id=NEW."correctsId" AND p."organizationId"=org AND p.category=NEW.category AND p."from"=NEW."from" AND p."to"=NEW."to") THEN RAISE EXCEPTION 'S24 corrective identity mismatch'; END IF;
 ELSIF TG_TABLE_NAME='dashboard_rule_versions' THEN
  IF a.after->'data' IS DISTINCT FROM NEW.data OR (a.after->>'enabled')::boolean IS DISTINCT FROM NEW.enabled OR (a.after->>'version')::integer IS DISTINCT FROM NEW.version OR a.reason IS DISTINCT FROM NEW.reason OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."actorId" AND kind='OWNER' AND state='ACTIVE') OR NOT EXISTS(SELECT 1 FROM dashboard_rules r WHERE r.id=NEW."ruleId" AND r."organizationId"=org AND r.version>=NEW.version) THEN RAISE EXCEPTION 'S24 rule evidence mismatch'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s24_snapshot_canonical AFTER INSERT ON report_snapshots DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s24_canonical();
CREATE CONSTRAINT TRIGGER s24_version_canonical AFTER INSERT ON dashboard_rule_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s24_canonical();
CREATE CONSTRAINT TRIGGER s24_reminder_canonical AFTER INSERT ON personal_reminders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s24_canonical();
CREATE CONSTRAINT TRIGGER s24_run_canonical AFTER INSERT ON dashboard_runs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s24_canonical();
CREATE FUNCTION s24_rule_head() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM dashboard_rule_versions v WHERE v."ruleId"=NEW.id AND v."organizationId"=NEW."organizationId" AND v.version=NEW.version AND v.enabled=NEW.enabled AND v.data=NEW.data) THEN RAISE EXCEPTION 'S24 rule head/version mismatch'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s24_rule_head AFTER INSERT OR UPDATE ON dashboard_rules DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s24_rule_head();
GRANT SELECT, INSERT ON report_snapshots,dashboard_rule_versions,personal_reminders,dashboard_runs,dashboard_receipts TO sense_app_runtime;
GRANT SELECT, INSERT, UPDATE ON dashboard_rules TO sense_app_runtime;
REVOKE TRUNCATE, DELETE, UPDATE ON report_snapshots,dashboard_rule_versions,personal_reminders,dashboard_runs,dashboard_receipts FROM sense_app_runtime;

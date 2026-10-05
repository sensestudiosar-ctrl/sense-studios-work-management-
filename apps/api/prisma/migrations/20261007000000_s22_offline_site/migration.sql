-- S22 additive offline receipts and immutable independent site notes.
ALTER TABLE site_records DROP CONSTRAINT site_records_kind_check;
ALTER TABLE site_records ADD CONSTRAINT site_records_kind_check CHECK(kind IN ('PACKAGE','MANPOWER','REPORT','SNAG','HANDOVER','NOTE'));

CREATE FUNCTION s22_note_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.kind='NOTE' THEN
  IF TG_OP='UPDATE' OR NEW.state<>'RECORDED' OR NEW.version<>1 OR
     NOT(NEW.data ?& ARRAY['note','photoEvidence']) OR jsonb_typeof(NEW.data->'note')<>'string' OR
     length(trim(NEW.data->>'note')) NOT BETWEEN 1 AND 4000 OR jsonb_typeof(NEW.data->'photoEvidence')<>'array'
  THEN RAISE EXCEPTION 'S22 independent note is immutable with valid evidence'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s22_note_guard BEFORE INSERT OR UPDATE ON site_records FOR EACH ROW EXECUTE FUNCTION s22_note_guard();

CREATE TABLE site_command_receipts (
 "commandId" uuid PRIMARY KEY, "organizationId" uuid NOT NULL, "projectId" uuid NOT NULL,
 "actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, "localId" uuid NOT NULL,
 action varchar(30) NOT NULL CHECK(action IN('NOTE','MANPOWER','REPORT','SNAG','PACKAGE_PROGRESS')),
 fingerprint char(64) NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'), "recordId" uuid NOT NULL,
 "recordVersion" integer NOT NULL CHECK("recordVersion">0), "workspaceVersion" integer NOT NULL CHECK("workspaceVersion">0),
 "eventId" uuid NOT NULL REFERENCES domain_events(id) ON DELETE RESTRICT,
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("actorId","projectId","localId"),
 FOREIGN KEY("recordId","organizationId","projectId") REFERENCES site_records(id,"organizationId","projectId") ON DELETE RESTRICT,
 FOREIGN KEY("projectId","organizationId") REFERENCES projects(id,"organizationId") ON DELETE RESTRICT
);
CREATE TRIGGER s22_receipt_retained BEFORE UPDATE OR DELETE ON site_command_receipts FOR EACH ROW EXECUTE FUNCTION s20_retained();
CREATE FUNCTION s22_receipt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE h site_history%ROWTYPE; expected_kind text;
BEGIN
 expected_kind:=CASE WHEN NEW.action='PACKAGE_PROGRESS' THEN 'PACKAGE' ELSE NEW.action END;
 SELECT * INTO h FROM site_history WHERE "subjectId"=NEW."recordId" AND "subjectVersion"=NEW."recordVersion" AND "subjectType"='site_record';
 IF h.id IS NULL OR h."eventId"<>NEW."eventId" OR h."actorId"<>NEW."actorId" OR h."organizationId"<>NEW."organizationId" OR h."projectId"<>NEW."projectId" OR h.snapshot->>'kind'<>expected_kind OR
    NOT EXISTS(SELECT 1 FROM site_workspaces w WHERE w.id=h."workspaceId" AND w.version=NEW."workspaceVersion") OR
    NOT EXISTS(SELECT 1 FROM site_records r WHERE r.id=NEW."recordId" AND r.version=NEW."recordVersion" AND r.kind=expected_kind) OR
    NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=NEW."projectId" AND p."organizationId"=NEW."organizationId" AND p.status='ACTIVE' AND p."deliveryType"='TURNKEY')
 THEN RAISE EXCEPTION 'S22 receipt requires exact current scoped canonical record evidence'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s22_receipt_guard AFTER INSERT ON site_command_receipts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s22_receipt_guard();

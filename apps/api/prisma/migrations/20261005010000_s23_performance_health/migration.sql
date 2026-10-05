-- S23 additive evidence and policy persistence; no active policy defaults.
CREATE TABLE performance_records (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id),
 kind varchar(24) NOT NULL CHECK (kind IN ('POLICY','ASSIGNMENT','SCORE','HEALTH','DELAY','CYCLE')),
 state varchar(24) NOT NULL CHECK (state IN ('DRAFT','APPROVED','ACTIVE','OPEN','FINALIZED')),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 "employeeId" uuid, "projectId" uuid, data jsonb NOT NULL CHECK (jsonb_typeof(data)='object'),
 "createdById" uuid NOT NULL REFERENCES accounts(id), "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(id,"organizationId"),
 FOREIGN KEY ("employeeId","organizationId") REFERENCES employees(id,"organizationId"),
 FOREIGN KEY ("projectId","organizationId") REFERENCES projects(id,"organizationId"),
 CHECK ((kind='POLICY' AND state IN ('DRAFT','APPROVED') AND "employeeId" IS NULL AND "projectId" IS NULL)
 OR (kind IN ('ASSIGNMENT','SCORE') AND state='ACTIVE' AND "employeeId" IS NOT NULL AND "projectId" IS NULL)
 OR (kind='CYCLE' AND state IN ('OPEN','FINALIZED') AND "employeeId" IS NOT NULL AND "projectId" IS NULL)
 OR (kind IN ('HEALTH','DELAY') AND state='ACTIVE' AND "projectId" IS NOT NULL))
);
CREATE INDEX performance_records_employee_idx ON performance_records("organizationId",kind,"employeeId","createdAt");
CREATE INDEX performance_records_project_idx ON performance_records("organizationId",kind,"projectId","createdAt");
CREATE TABLE performance_versions (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id), "recordId" uuid NOT NULL,
 version integer NOT NULL CHECK(version>0), state varchar(24) NOT NULL, data jsonb NOT NULL,
 reason varchar(1000) NOT NULL CHECK(length(trim(reason))>=3), "actorId" uuid NOT NULL REFERENCES accounts(id),
 "eventId" uuid NOT NULL UNIQUE REFERENCES domain_events(id), "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("recordId",version), FOREIGN KEY("recordId","organizationId") REFERENCES performance_records(id,"organizationId")
);
CREATE TABLE performance_receipts (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id), "actorId" uuid NOT NULL REFERENCES accounts(id),
 "commandId" uuid NOT NULL, "payloadHash" char(64) NOT NULL, result jsonb NOT NULL,
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("actorId","commandId")
);
CREATE FUNCTION s23_immutable_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'S23 evidence is immutable' USING ERRCODE='23514';
END $$;
CREATE TRIGGER s23_versions_immutable BEFORE UPDATE OR DELETE ON performance_versions FOR EACH ROW EXECUTE FUNCTION s23_immutable_evidence();
CREATE TRIGGER s23_receipts_immutable BEFORE UPDATE OR DELETE ON performance_receipts FOR EACH ROW EXECUTE FUNCTION s23_immutable_evidence();
CREATE FUNCTION s23_record_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'S23 record cannot be deleted' USING ERRCODE='23514'; END IF;
 IF NEW.id<>OLD.id OR NEW."organizationId"<>OLD."organizationId" OR NEW.kind<>OLD.kind
 OR NEW."employeeId" IS DISTINCT FROM OLD."employeeId" OR NEW."projectId" IS DISTINCT FROM OLD."projectId"
 OR NEW."createdById"<>OLD."createdById" OR NEW."createdAt"<>OLD."createdAt" OR NEW.version<>OLD.version+1 THEN
 RAISE EXCEPTION 'S23 identity/version immutable' USING ERRCODE='23514'; END IF;
 IF OLD.kind IN ('ASSIGNMENT','SCORE','HEALTH','DELAY') OR OLD.kind='POLICY' AND OLD.state='APPROVED' THEN
 RAISE EXCEPTION 'S23 published evidence immutable' USING ERRCODE='23514'; END IF;
 IF OLD.kind='POLICY' AND (NEW.state<>'APPROVED' OR NEW.data<>OLD.data) THEN
 RAISE EXCEPTION 'S23 policy approval cannot edit definition' USING ERRCODE='23514'; END IF;
 IF OLD.kind='CYCLE' AND OLD.state='FINALIZED' AND
 (NEW.state<>'FINALIZED' OR NEW.data-'acknowledgements'<>OLD.data-'acknowledgements') THEN
 RAISE EXCEPTION 'S23 finalized review frozen' USING ERRCODE='23514'; END IF;
 IF OLD.kind='CYCLE' AND NEW.data->'acknowledgements' IS DISTINCT FROM OLD.data->'acknowledgements' THEN
  IF jsonb_typeof(NEW.data->'acknowledgements')<>'array' OR jsonb_typeof(OLD.data->'acknowledgements')<>'array'
   OR jsonb_array_length(NEW.data->'acknowledgements')<>jsonb_array_length(OLD.data->'acknowledgements')+1
   OR (SELECT jsonb_agg(value ORDER BY ord) FROM jsonb_array_elements(NEW.data->'acknowledgements') WITH ORDINALITY AS a(value,ord) WHERE ord<=jsonb_array_length(OLD.data->'acknowledgements')) IS DISTINCT FROM NULLIF(OLD.data->'acknowledgements','[]'::jsonb)
   OR NEW.data->'acknowledgements'->-1->>'actorId' IS DISTINCT FROM (SELECT "accountId"::text FROM employees WHERE id=NEW."employeeId") THEN
   RAISE EXCEPTION 'S23 acknowledgement must append the employee action' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s23_record_guard BEFORE UPDATE OR DELETE ON performance_records FOR EACH ROW EXECUTE FUNCTION s23_record_guard();
CREATE FUNCTION s23_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE v performance_versions; e domain_events; BEGIN
 SELECT * INTO v FROM performance_versions WHERE "recordId"=NEW.id AND version=NEW.version;
 IF NOT FOUND OR v."organizationId"<>NEW."organizationId" OR v.state<>NEW.state OR v.data<>NEW.data THEN
 RAISE EXCEPTION 'S23 canonical history missing' USING ERRCODE='23514'; END IF;
 SELECT * INTO e FROM domain_events WHERE id=v."eventId";
 IF e."organizationId"<>NEW."organizationId" OR e."subjectId"<>NEW.id::text OR e."actorId"<>v."actorId" OR e."eventName" NOT IN ('employee_performance.changed','project_health.changed') THEN
 RAISE EXCEPTION 'S23 history event mismatch' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' AND NEW.kind='CYCLE' AND NEW.data->'acknowledgements' IS DISTINCT FROM OLD.data->'acknowledgements'
 AND NEW.data->'acknowledgements'->-1->>'actorId' IS DISTINCT FROM v."actorId"::text THEN
  RAISE EXCEPTION 'S23 acknowledgement actor mismatch' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s23_history_guard AFTER INSERT OR UPDATE ON performance_records DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s23_history_guard();

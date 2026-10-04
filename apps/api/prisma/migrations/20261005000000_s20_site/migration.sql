CREATE TABLE site_workspaces (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL, "projectId" uuid NOT NULL UNIQUE,
 version integer NOT NULL DEFAULT 1 CHECK(version>0), "responsibleAccountId" uuid REFERENCES accounts(id) ON DELETE RESTRICT,
 UNIQUE(id,"organizationId","projectId"),
 FOREIGN KEY("projectId","organizationId") REFERENCES projects(id,"organizationId") ON DELETE RESTRICT
);
CREATE TABLE site_records (
 id uuid PRIMARY KEY, "workspaceId" uuid NOT NULL, "organizationId" uuid NOT NULL, "projectId" uuid NOT NULL,
 kind varchar(20) NOT NULL CHECK(kind IN ('PACKAGE','MANPOWER','REPORT','SNAG','HANDOVER')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), state varchar(30) NOT NULL, data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(id,"organizationId","projectId"),
 FOREIGN KEY("workspaceId","organizationId","projectId") REFERENCES site_workspaces(id,"organizationId","projectId") ON DELETE RESTRICT
);
CREATE INDEX site_records_workspace_kind_created_idx ON site_records("workspaceId",kind,"createdAt",id);
CREATE TABLE site_history (
 id uuid PRIMARY KEY, "workspaceId" uuid NOT NULL, "organizationId" uuid NOT NULL, "projectId" uuid NOT NULL,
 "subjectType" varchar(30) NOT NULL CHECK("subjectType" IN('site_workspace','site_record')), "subjectId" uuid NOT NULL,
 "subjectVersion" integer NOT NULL CHECK("subjectVersion">0), "actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 "eventName" varchar(100) NOT NULL, reason varchar(1000) NOT NULL CHECK(length(trim(reason))>=3), snapshot jsonb NOT NULL,
 "eventId" uuid NOT NULL UNIQUE REFERENCES domain_events(id) ON DELETE RESTRICT,
 "occurredAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("subjectId","subjectVersion"),
 FOREIGN KEY("workspaceId","organizationId","projectId") REFERENCES site_workspaces(id,"organizationId","projectId") ON DELETE RESTRICT
);
CREATE INDEX site_history_workspace_occurred_idx ON site_history("workspaceId","occurredAt",id);
CREATE TABLE site_verification_attempts (
 id uuid PRIMARY KEY, "workspaceId" uuid NOT NULL, "organizationId" uuid NOT NULL, "projectId" uuid NOT NULL, "snagId" uuid NOT NULL,
 "repairGeneration" integer NOT NULL CHECK("repairGeneration">0),
 "fixerAccountId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, "verifierAccountId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 outcome varchar(10) NOT NULL CHECK(outcome IN('PASSED','FAILED')), note varchar(2000) NOT NULL CHECK(length(trim(note))>=3),
 "photoEvidence" jsonb NOT NULL CHECK(jsonb_typeof("photoEvidence")='array'), "eventId" uuid UNIQUE REFERENCES domain_events(id) ON DELETE RESTRICT,
 "occurredAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK("fixerAccountId"<>"verifierAccountId"), UNIQUE("snagId","repairGeneration"), UNIQUE(id,"organizationId","projectId"),
 FOREIGN KEY("workspaceId","organizationId","projectId") REFERENCES site_workspaces(id,"organizationId","projectId") ON DELETE RESTRICT,
 FOREIGN KEY("snagId","organizationId","projectId") REFERENCES site_records(id,"organizationId","projectId") ON DELETE RESTRICT
);
CREATE INDEX site_attempts_workspace_snag_occurred_idx ON site_verification_attempts("workspaceId","snagId","occurredAt");
CREATE FUNCTION s20_retained() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'S20 evidence is retained and immutable'; END $$;
CREATE TRIGGER s20_history_retained BEFORE UPDATE OR DELETE ON site_history FOR EACH ROW EXECUTE FUNCTION s20_retained();
CREATE TRIGGER s20_record_retained BEFORE DELETE ON site_records FOR EACH ROW EXECUTE FUNCTION s20_retained();
CREATE TRIGGER s20_workspace_retained BEFORE DELETE ON site_workspaces FOR EACH ROW EXECUTE FUNCTION s20_retained();
CREATE TRIGGER s20_attempt_retained BEFORE DELETE ON site_verification_attempts FOR EACH ROW EXECUTE FUNCTION s20_retained();
CREATE FUNCTION s20_workspace_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND (ROW(NEW.id,NEW."organizationId",NEW."projectId") IS DISTINCT FROM ROW(OLD.id,OLD."organizationId",OLD."projectId") OR NEW.version<>OLD.version+1) THEN RAISE EXCEPTION 'S20 workspace identity/version'; END IF;
 IF TG_OP='INSERT' AND NEW.version<>1 THEN RAISE EXCEPTION 'S20 initial workspace version'; END IF;
 IF NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=NEW."projectId" AND p."organizationId"=NEW."organizationId" AND p."deliveryType"='TURNKEY' AND p.status='ACTIVE') THEN RAISE EXCEPTION 'S20 Active Turnkey project required'; END IF;
 IF NEW."responsibleAccountId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM accounts a JOIN employees e ON e."accountId"=a.id JOIN project_assignments pa ON pa."employeeId"=e.id WHERE a.id=NEW."responsibleAccountId" AND a.state='ACTIVE' AND e.state='ACTIVE' AND pa."projectId"=NEW."projectId" AND pa."organizationId"=NEW."organizationId" AND pa."revokedAt" IS NULL) THEN RAISE EXCEPTION 'S20 responsible person must already be assigned'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s20_workspace_guard BEFORE INSERT OR UPDATE ON site_workspaces FOR EACH ROW EXECUTE FUNCTION s20_workspace_guard();
CREATE FUNCTION s20_record_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_data jsonb; attempt site_verification_attempts%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=NEW."projectId" AND p."organizationId"=NEW."organizationId" AND p."deliveryType"='TURNKEY' AND p.status='ACTIVE') THEN RAISE EXCEPTION 'S20 delivery stopped'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW."workspaceId",NEW."organizationId",NEW."projectId",NEW.kind,NEW."createdAt") IS DISTINCT FROM ROW(OLD.id,OLD."workspaceId",OLD."organizationId",OLD."projectId",OLD.kind,OLD."createdAt") OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'S20 immutable identity/current version'; END IF;
  IF OLD.kind IN('MANPOWER','HANDOVER') OR OLD.kind='REPORT' AND OLD.state='CONFIRMED' OR OLD.kind='PACKAGE' AND OLD.state='COMPLETED' OR OLD.kind='SNAG' AND OLD.state='CLOSED' THEN RAISE EXCEPTION 'S20 confirmed/completed evidence immutable'; END IF;
 ELSE IF NEW.version<>1 THEN RAISE EXCEPTION 'S20 initial record version'; END IF; END IF;
 IF NEW.kind='PACKAGE' THEN
  IF NEW.state NOT IN('OPEN','COMPLETED') OR NOT(NEW.data ?& ARRAY['title','date','plannedPercent','actualPercent','plannedQuantity','actualQuantity','qualityStatus','photoEvidence']) OR NEW.data->>'qualityStatus' NOT IN('PENDING','PASSED','FAILED') OR jsonb_typeof(NEW.data->'photoEvidence')<>'array' THEN RAISE EXCEPTION 'S20 package fields/state'; END IF;
  IF NEW.data->>'plannedPercent' !~ '^\d{1,12}(\.\d{1,4})?$' OR NEW.data->>'actualPercent' !~ '^\d{1,12}(\.\d{1,4})?$' OR (NEW.data->>'plannedPercent')::numeric>100 OR (NEW.data->>'actualPercent')::numeric>100 OR NEW.data->>'plannedQuantity' !~ '^\d{1,12}(\.\d{1,4})?$' OR NEW.data->>'actualQuantity' !~ '^\d{1,12}(\.\d{1,4})?$' THEN RAISE EXCEPTION 'S20 quantities'; END IF;
  IF TG_OP='UPDATE' AND ROW(NEW.data->'releaseId',NEW.data->'plannedQuantity',NEW.data->'plannedPercent',NEW.data->'unit',NEW.data->'date',NEW.data->'title') IS DISTINCT FROM ROW(OLD.data->'releaseId',OLD.data->'plannedQuantity',OLD.data->'plannedPercent',OLD.data->'unit',OLD.data->'date',OLD.data->'title') THEN RAISE EXCEPTION 'S20 package plan identity retained'; END IF;
  IF TG_OP='INSERT' AND NEW.state<>'OPEN' THEN RAISE EXCEPTION 'S20 package begins Open'; END IF;
 ELSIF NEW.kind='MANPOWER' THEN
  IF NEW.state<>'RECORDED' OR NOT(NEW.data ?& ARRAY['date','trade','count','employeeAccountIds','note']) OR (NEW.data->>'count')::integer NOT BETWEEN 0 AND 10000 OR jsonb_typeof(NEW.data->'employeeAccountIds')<>'array' THEN RAISE EXCEPTION 'S20 manpower fields'; END IF;
 ELSIF NEW.kind='REPORT' THEN
  IF NEW.state NOT IN('DRAFT','CONFIRMED') OR NOT(NEW.data ?& ARRAY['date','workCompleted','manpower','materialsReceived','photoEvidence','issues','delayCauses','tomorrowPlan']) OR jsonb_typeof(NEW.data->'manpower')<>'array' OR jsonb_typeof(NEW.data->'photoEvidence')<>'array' THEN RAISE EXCEPTION 'S20 report fields'; END IF;
  IF TG_OP='INSERT' AND NEW.state<>'DRAFT' THEN RAISE EXCEPTION 'S20 report begins Draft'; END IF;
  IF TG_OP='UPDATE' AND (OLD.state<>'DRAFT' OR NEW.state<>'CONFIRMED' OR NEW.data-ARRAY['confirmedBy','confirmedAt','progressSnapshot']::text[]<>OLD.data OR NOT(NEW.data ?& ARRAY['confirmedBy','confirmedAt','progressSnapshot']) OR NOT EXISTS(SELECT 1 FROM site_workspaces w WHERE w.id=NEW."workspaceId" AND w."responsibleAccountId"=(NEW.data->>'confirmedBy')::uuid)) THEN RAISE EXCEPTION 'S20 responsible exact report confirmation'; END IF;
 ELSIF NEW.kind='SNAG' THEN
  IF NEW.state NOT IN('OPEN','ASSIGNED','IN_PROGRESS','READY_FOR_VERIFICATION','VERIFIED','CLOSED') OR NOT(NEW.data ?& ARRAY['title','description','repairGeneration','photoEvidence']) OR (NEW.data->>'repairGeneration')::integer<0 THEN RAISE EXCEPTION 'S20 snag fields/state'; END IF;
  IF NEW.data->>'fixerAccountId'=NEW.data->>'verifierAccountId' OR NEW.data->>'repairedBy'=NEW.data->>'verifierAccountId' THEN RAISE EXCEPTION 'S20 independent fixer/verifier required'; END IF;
  IF NEW.data ? 'packageId' AND NOT EXISTS(SELECT 1 FROM site_records p WHERE p.id=(NEW.data->>'packageId')::uuid AND p."workspaceId"=NEW."workspaceId" AND p.kind='PACKAGE') THEN RAISE EXCEPTION 'S20 same-project package required'; END IF;
  IF TG_OP='INSERT' AND (NEW.state<>'OPEN' OR (NEW.data->>'repairGeneration')::integer<>0) THEN RAISE EXCEPTION 'S20 snag begins Open'; END IF;
  IF TG_OP='UPDATE' THEN
   IF NOT((OLD.state='OPEN' AND NEW.state IN('OPEN','ASSIGNED')) OR (OLD.state='ASSIGNED' AND NEW.state IN('ASSIGNED','IN_PROGRESS')) OR (OLD.state='IN_PROGRESS' AND NEW.state IN('IN_PROGRESS','ASSIGNED','READY_FOR_VERIFICATION')) OR (OLD.state='READY_FOR_VERIFICATION' AND NEW.state IN('READY_FOR_VERIFICATION','IN_PROGRESS','VERIFIED')) OR (OLD.state='VERIFIED' AND NEW.state='CLOSED')) THEN RAISE EXCEPTION 'S20 invalid snag transition'; END IF;
   IF NEW.state='READY_FOR_VERIFICATION' AND OLD.state='IN_PROGRESS' THEN
    IF (NEW.data->>'repairGeneration')::integer<>(OLD.data->>'repairGeneration')::integer+1 OR NEW.data->>'repairedBy' IS DISTINCT FROM NEW.data->>'fixerAccountId' THEN RAISE EXCEPTION 'S20 exact repair generation/fixer required'; END IF;
   ELSIF NEW.data->'repairGeneration' IS DISTINCT FROM OLD.data->'repairGeneration' THEN RAISE EXCEPTION 'S20 repair generation retained'; END IF;
   IF OLD.state='READY_FOR_VERIFICATION' AND NEW.state IN('IN_PROGRESS','VERIFIED') THEN
    SELECT * INTO attempt FROM site_verification_attempts a WHERE a.id=(NEW.data->>'latestVerificationId')::uuid AND a."snagId"=NEW.id AND a."repairGeneration"=(NEW.data->>'repairGeneration')::integer AND a."fixerAccountId"=(NEW.data->>'repairedBy')::uuid AND a."verifierAccountId"=(NEW.data->>'verifierAccountId')::uuid;
    IF NOT FOUND OR (NEW.state='VERIFIED' AND attempt.outcome<>'PASSED') OR (NEW.state='IN_PROGRESS' AND attempt.outcome<>'FAILED') THEN RAISE EXCEPTION 'S20 exact current verification required'; END IF;
   END IF;
   IF NEW.state='CLOSED' THEN
    SELECT * INTO attempt FROM site_verification_attempts a WHERE a.id=(NEW.data->>'closureVerificationId')::uuid AND a.id=(NEW.data->>'latestVerificationId')::uuid AND a."snagId"=NEW.id AND a.outcome='PASSED' AND a."repairGeneration"=(NEW.data->>'repairGeneration')::integer AND a."fixerAccountId"=(NEW.data->>'repairedBy')::uuid AND a."verifierAccountId"=(NEW.data->>'verifierAccountId')::uuid;
    IF NOT FOUND OR NOT(NEW.data ?& ARRAY['closedBy','closedAt']) THEN RAISE EXCEPTION 'S20 passed verification and separate closure required'; END IF;
   END IF;
  END IF;
 ELSIF NEW.kind='HANDOVER' THEN
  IF NEW.state<>'CONFIRMED' OR NOT(NEW.data ?& ARRAY['decidedBy','decidedAt','packages','snags','note']) OR jsonb_array_length(NEW.data->'packages')=0 OR EXISTS(SELECT 1 FROM site_records r WHERE r."workspaceId"=NEW."workspaceId" AND ((r.kind='PACKAGE' AND (r.state<>'COMPLETED' OR r.data->>'qualityStatus'<>'PASSED')) OR (r.kind='SNAG' AND r.state<>'CLOSED'))) THEN RAISE EXCEPTION 'S20 handover package/quality/snag gates'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s20_record_guard BEFORE INSERT OR UPDATE ON site_records FOR EACH ROW EXECUTE FUNCTION s20_record_guard();
CREATE FUNCTION s20_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE snag site_records%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD."eventId" IS NOT NULL OR NEW."eventId" IS NULL OR to_jsonb(NEW)-'eventId'<>to_jsonb(OLD)-'eventId' THEN RAISE EXCEPTION 'S20 verification attempts are immutable'; END IF;
 ELSE
  SELECT * INTO snag FROM site_records WHERE id=NEW."snagId" AND kind='SNAG' AND state='READY_FOR_VERIFICATION' AND "workspaceId"=NEW."workspaceId";
  IF NOT FOUND OR (snag.data->>'repairGeneration')::integer<>NEW."repairGeneration" OR snag.data->>'repairedBy'<>NEW."fixerAccountId"::text OR snag.data->>'verifierAccountId'<>NEW."verifierAccountId"::text THEN RAISE EXCEPTION 'S20 current named repair verification required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s20_attempt_guard BEFORE INSERT OR UPDATE ON site_verification_attempts FOR EACH ROW EXECUTE FUNCTION s20_attempt_guard();
CREATE FUNCTION s20_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE h site_history%ROWTYPE; expected jsonb; workspace_id uuid; current_attempt site_verification_attempts%ROWTYPE;
BEGIN
 IF TG_TABLE_NAME='site_workspaces' THEN
  workspace_id:=NEW.id;
  SELECT * INTO h FROM site_history WHERE "subjectId"=NEW.id AND "subjectVersion"=NEW.version AND "subjectType"='site_workspace';
  expected:=jsonb_build_object('projectId',NEW."projectId",'id',NEW.id,'version',NEW.version,'responsibleAccountId',NEW."responsibleAccountId");
 ELSIF TG_TABLE_NAME='site_records' THEN
  workspace_id:=NEW."workspaceId";
  SELECT * INTO h FROM site_history WHERE "subjectId"=NEW.id AND "subjectVersion"=NEW.version AND "subjectType"='site_record';
  expected:=jsonb_build_object('projectId',NEW."projectId",'recordId',NEW.id,'kind',NEW.kind,'state',NEW.state,'version',NEW.version,'data',NEW.data);
 ELSE
  workspace_id:=NEW."workspaceId";
  SELECT * INTO current_attempt FROM site_verification_attempts WHERE id=NEW.id;
  SELECT * INTO h FROM site_history WHERE "subjectId"=current_attempt."snagId" AND "eventId"=current_attempt."eventId" AND "subjectType"='site_record';
  expected:=h.snapshot;
  IF h.snapshot->'data'->>'latestVerificationId' IS DISTINCT FROM NEW.id::text THEN RAISE EXCEPTION 'S20 attempt canonical snag decision required'; END IF;
 END IF;
 IF h.id IS NULL OR h."workspaceId"<>workspace_id THEN RAISE EXCEPTION 'S20 canonical history required'; END IF;
 IF h.snapshot<>expected OR h."organizationId"<>NEW."organizationId" OR h."projectId"<>NEW."projectId" OR NOT EXISTS(SELECT 1 FROM domain_events e JOIN audit_events a ON a.id=(e.payload->>'auditEventId')::uuid JOIN outbox_deliveries o ON o."eventId"=e.id WHERE e.id=h."eventId" AND e."organizationId"=h."organizationId" AND e."actorId"=h."actorId" AND e."subjectId"=h."subjectId"::text AND e."subjectType"=h."subjectType" AND e."eventName"=h."eventName" AND a."eventKey"=h."eventName" AND a."actorId"=h."actorId" AND a."subjectId"=h."subjectId"::text AND a.reason=h.reason AND a."after"=h.snapshot) THEN RAISE EXCEPTION 'S20 canonical atomic audit/event/outbox required'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s20_workspace_evidence AFTER INSERT OR UPDATE ON site_workspaces DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s20_evidence_guard();
CREATE CONSTRAINT TRIGGER s20_record_evidence AFTER INSERT OR UPDATE ON site_records DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s20_evidence_guard();
CREATE CONSTRAINT TRIGGER s20_attempt_evidence AFTER INSERT OR UPDATE ON site_verification_attempts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s20_evidence_guard();
DO $$ DECLARE prior_expression text; BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO prior_expression FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF prior_expression IS NULL THEN RAISE EXCEPTION 'Existing event catalogue required'; END IF;
 ALTER TABLE domain_events DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE format('ALTER TABLE domain_events ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName" IN (''site.changed'',''site.workspace_changed''))',prior_expression);
END $$;

-- Preserve the full current event allowlist and add only S27's two canonical events.
DO $$ DECLARE prior_expression text;
BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO prior_expression FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF prior_expression IS NULL THEN RAISE EXCEPTION 'Existing domain event catalogue required'; END IF;
 ALTER TABLE domain_events DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE format('ALTER TABLE domain_events ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName" IN (''ai.run_created'',''ai.decision_recorded''))',prior_expression);
END $$;

CREATE TABLE ai_runs (
  id uuid PRIMARY KEY,
  "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  "requesterId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  kind varchar(16) NOT NULL,
  "projectId" uuid,
  "taskId" uuid,
  purpose varchar(20),
  "currentTeamId" uuid,
  "currentTeamBranchId" uuid,
  "broaderSearch" boolean NOT NULL DEFAULT false,
  "fromDate" date NOT NULL,
  "toDate" date NOT NULL,
  provider varchar(64) NOT NULL,
  "providerVersion" varchar(40) NOT NULL,
  "inputHash" char(64) NOT NULL,
  request jsonb NOT NULL,
  manifest jsonb NOT NULL,
  result jsonb NOT NULL,
  reason varchar(1000) NOT NULL,
  "eventId" uuid NOT NULL UNIQUE REFERENCES domain_events(id) ON DELETE RESTRICT,
  "decisionVersion" integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id,"organizationId"),
  CHECK(kind IN ('DAILY','PROJECT','MANAGEMENT','ASSIGNMENT')),
  CHECK((kind='PROJECT' AND "projectId" IS NOT NULL) OR kind<>'PROJECT'),
  CHECK((kind='ASSIGNMENT' AND "taskId" IS NOT NULL AND purpose IS NOT NULL AND purpose IN ('PRIMARY_OWNER','COLLABORATOR','REVIEWER')) OR (kind<>'ASSIGNMENT' AND "taskId" IS NULL AND purpose IS NULL AND "currentTeamId" IS NULL AND "broaderSearch"=false)),
  CHECK(("currentTeamId" IS NULL)=("currentTeamBranchId" IS NULL)),
  CHECK("toDate">="fromDate" AND ("toDate"-"fromDate")<=30),
  CHECK(provider='deterministic-evidence-v1' AND "providerVersion"='1'),
  CHECK("inputHash" ~ '^[0-9a-f]{64}$'),
  CHECK(jsonb_typeof(request->'authorizedInput')='object' IS TRUE),
  CHECK(jsonb_typeof(request)='object' AND jsonb_typeof(manifest)='array' AND jsonb_typeof(result)='object'),
  CHECK("decisionVersion">=0 AND length(btrim(reason)) BETWEEN 3 AND 1000),
  CHECK((octet_length(request::text)<=1048576 AND octet_length(manifest::text)<=262144 AND octet_length(result::text)<=2097152 AND jsonb_array_length(manifest)<=1000 AND jsonb_typeof(result->'facts')='array' AND jsonb_typeof(result->'candidates')='array' AND jsonb_typeof(result->'unavailableFactors')='array' AND jsonb_typeof(result->'limitations')='array' AND jsonb_array_length(result->'facts')<=500 AND jsonb_array_length(result->'candidates')<=250 AND jsonb_array_length(result->'unavailableFactors')<=100 AND jsonb_array_length(result->'limitations')<=50) IS TRUE),
  FOREIGN KEY("projectId","organizationId") REFERENCES projects(id,"organizationId") ON DELETE RESTRICT,
  FOREIGN KEY("taskId","organizationId") REFERENCES tasks(id,"organizationId") ON DELETE RESTRICT,
  FOREIGN KEY("currentTeamId","currentTeamBranchId","organizationId") REFERENCES teams(id,"branchId","organizationId") ON DELETE RESTRICT
);
CREATE INDEX ai_runs_requester_recent ON ai_runs("organizationId","requesterId","createdAt",id);
CREATE INDEX ai_runs_task_scope ON ai_runs("organizationId","taskId","createdAt",id);

CREATE TABLE ai_decisions (
  id uuid PRIMARY KEY,
  "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  "runId" uuid NOT NULL,
  version integer NOT NULL,
  kind varchar(12) NOT NULL,
  "actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  outcome varchar(12),
  "selectionEmployeeId" uuid,
  "selectionPurpose" varchar(20),
  "priorDecisionId" uuid,
  "sourceTaskId" uuid,
  observation jsonb,
  reason varchar(1000) NOT NULL,
  "eventId" uuid NOT NULL UNIQUE REFERENCES domain_events(id) ON DELETE RESTRICT,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id,"organizationId","runId"),
  UNIQUE("runId",version),
  CHECK(version>0 AND kind IN ('DECISION','OUTCOME')),
  CHECK(outcome IS NULL OR outcome IN ('ACCEPTED','REJECTED','OVERRIDDEN')),
  CHECK(("selectionEmployeeId" IS NULL)=("selectionPurpose" IS NULL)),
  CHECK("selectionPurpose" IS NULL OR "selectionPurpose" IN ('PRIMARY_OWNER','COLLABORATOR','REVIEWER')),
  CHECK(length(btrim(reason)) BETWEEN 3 AND 1000),
  CHECK((kind='DECISION' AND outcome IS NOT NULL AND "priorDecisionId" IS NULL AND "sourceTaskId" IS NULL AND observation IS NULL) OR (kind='OUTCOME' AND outcome IS NULL AND "priorDecisionId" IS NOT NULL AND "sourceTaskId" IS NOT NULL AND observation IS NOT NULL AND jsonb_typeof(observation)='object' AND "selectionEmployeeId" IS NOT NULL AND "selectionPurpose" IS NOT NULL)),
  FOREIGN KEY("runId","organizationId") REFERENCES ai_runs(id,"organizationId") ON DELETE RESTRICT,
  FOREIGN KEY("selectionEmployeeId","organizationId") REFERENCES employees(id,"organizationId") ON DELETE RESTRICT,
  FOREIGN KEY("sourceTaskId","organizationId") REFERENCES tasks(id,"organizationId") ON DELETE RESTRICT,
  FOREIGN KEY("priorDecisionId","organizationId","runId") REFERENCES ai_decisions(id,"organizationId","runId") ON DELETE RESTRICT
);
CREATE INDEX ai_decisions_run_recent ON ai_decisions("organizationId","runId","createdAt");

CREATE TABLE ai_receipts (
  id uuid PRIMARY KEY,
  "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  "actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  "commandId" uuid NOT NULL,
  operation varchar(16) NOT NULL,
  "payloadHash" char(64) NOT NULL,
  "runId" uuid NOT NULL,
  "decisionId" uuid,
  result jsonb NOT NULL,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("actorId","commandId"),
  CHECK(operation IN ('CREATE_RUN','DECISION','OUTCOME')),
  CHECK("payloadHash" ~ '^[0-9a-f]{64}$' AND jsonb_typeof(result)='object'),
  CHECK((operation='CREATE_RUN' AND "decisionId" IS NULL AND result IS NOT DISTINCT FROM jsonb_build_object('runId',"runId")) OR (operation IN ('DECISION','OUTCOME') AND "decisionId" IS NOT NULL AND result IS NOT DISTINCT FROM jsonb_build_object('runId',"runId",'decisionId',"decisionId"))),
  FOREIGN KEY("runId","organizationId") REFERENCES ai_runs(id,"organizationId") ON DELETE RESTRICT,
  FOREIGN KEY("decisionId","organizationId","runId") REFERENCES ai_decisions(id,"organizationId","runId") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX ai_receipt_run_once ON ai_receipts("runId") WHERE operation='CREATE_RUN';
CREATE UNIQUE INDEX ai_receipt_decision_once ON ai_receipts("decisionId") WHERE "decisionId" IS NOT NULL;

CREATE FUNCTION s27_run_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'S27 runs are retained'; END IF;
  IF (to_jsonb(NEW)-'decisionVersion') IS DISTINCT FROM (to_jsonb(OLD)-'decisionVersion') OR NEW."decisionVersion"<>OLD."decisionVersion"+1 THEN RAISE EXCEPTION 'S27 run evidence is immutable; decision head must advance by one'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER s27_run_immutable BEFORE UPDATE OR DELETE ON ai_runs FOR EACH ROW EXECUTE FUNCTION s27_run_immutable();

CREATE FUNCTION s27_run_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor_kind text;
BEGIN
  IF NEW."decisionVersion"<>0 OR NEW."inputHash" IS DISTINCT FROM encode(sha256(convert_to((NEW.request->'authorizedInput')::text,'UTF8')),'hex') THEN RAISE EXCEPTION 'S27 authorized input digest or initial version mismatch'; END IF;
  IF (NEW.kind='ASSIGNMENT') IS DISTINCT FROM (NEW.request->>'purpose' IS NOT NULL) OR NEW.request->>'kind' IS DISTINCT FROM NEW.kind OR NEW.request->>'projectId' IS DISTINCT FROM NEW."projectId"::text OR NEW.request->>'taskId' IS DISTINCT FROM NEW."taskId"::text OR NEW.request->>'from' IS DISTINCT FROM NEW."fromDate"::text OR NEW.request->>'to' IS DISTINCT FROM NEW."toDate"::text OR NEW.request->>'purpose' IS DISTINCT FROM NEW.purpose OR NEW.request->>'currentTeamId' IS DISTINCT FROM NEW."currentTeamId"::text OR NEW.request->>'currentTeamBranchId' IS DISTINCT FROM NEW."currentTeamBranchId"::text OR (NEW.request->>'broaderSearch')::boolean IS DISTINCT FROM NEW."broaderSearch" OR NEW.request->>'reason' IS DISTINCT FROM NEW.reason THEN RAISE EXCEPTION 'S27 request scope mismatch'; END IF;
  SELECT kind INTO actor_kind FROM accounts WHERE id=NEW."requesterId" AND state='ACTIVE';
  IF actor_kind IS NULL OR actor_kind NOT IN ('OWNER','STAFF') OR actor_kind='STAFF' AND NOT EXISTS(SELECT 1 FROM employees WHERE "accountId"=NEW."requesterId" AND "organizationId"=NEW."organizationId" AND state='ACTIVE') THEN RAISE EXCEPTION 'S27 current internal requester required'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER s27_run_insert_guard BEFORE INSERT ON ai_runs FOR EACH ROW EXECUTE FUNCTION s27_run_insert_guard();

CREATE FUNCTION s27_decision_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'S27 decisions are retained'; END $$;
CREATE TRIGGER s27_decision_immutable BEFORE UPDATE OR DELETE ON ai_decisions FOR EACH ROW EXECUTE FUNCTION s27_decision_immutable();
CREATE TRIGGER s27_receipt_immutable BEFORE UPDATE OR DELETE ON ai_receipts FOR EACH ROW EXECUTE FUNCTION s27_decision_immutable();

CREATE FUNCTION s27_decision_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r ai_runs; prior ai_decisions;
BEGIN
  SELECT * INTO r FROM ai_runs WHERE id=NEW."runId" AND "organizationId"=NEW."organizationId" FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'S27 run is unavailable'; END IF;
  IF NEW.version<>r."decisionVersion"+1 THEN RAISE EXCEPTION 'S27 decision version must advance the locked run head by one'; END IF;
  IF NEW.kind='DECISION' THEN
    IF NEW.outcome='REJECTED' AND (NEW."selectionEmployeeId" IS NOT NULL OR NEW."selectionPurpose" IS NOT NULL) THEN RAISE EXCEPTION 'Rejected S27 decision cannot select an employee'; END IF;
    IF r.kind='ASSIGNMENT' AND NEW.outcome IN ('ACCEPTED','OVERRIDDEN') AND (NEW."selectionEmployeeId" IS NULL OR NEW."selectionPurpose" IS DISTINCT FROM r.purpose) THEN RAISE EXCEPTION 'Assignment S27 decision requires a matching selection'; END IF;
    IF r.kind<>'ASSIGNMENT' AND (NEW."selectionEmployeeId" IS NOT NULL OR NEW."selectionPurpose" IS NOT NULL) THEN RAISE EXCEPTION 'Summary S27 decision cannot select an employee'; END IF;
  ELSE
    SELECT * INTO prior FROM ai_decisions WHERE id=NEW."priorDecisionId" AND "organizationId"=NEW."organizationId" AND "runId"=NEW."runId";
    IF NEW."sourceTaskId" IS DISTINCT FROM r."taskId" OR r.kind<>'ASSIGNMENT' OR prior.id IS NULL OR prior.kind<>'DECISION' OR prior.version>=NEW.version OR prior.outcome NOT IN ('ACCEPTED','OVERRIDDEN') OR NEW."selectionEmployeeId" IS DISTINCT FROM prior."selectionEmployeeId" OR NEW."selectionPurpose" IS DISTINCT FROM prior."selectionPurpose" THEN RAISE EXCEPTION 'S27 outcome must bind the accepted or overridden decision for the same task'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER s27_decision_guard BEFORE INSERT ON ai_decisions FOR EACH ROW EXECUTE FUNCTION s27_decision_guard();

CREATE FUNCTION s27_task_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r ai_runs; t tasks;
BEGIN
  IF TG_TABLE_NAME='ai_runs' THEN
    r:=NEW;
  ELSE
    SELECT * INTO r FROM ai_runs WHERE id=NEW."runId" AND "organizationId"=NEW."organizationId";
  END IF;
  IF r."taskId" IS NOT NULL THEN
    SELECT * INTO t FROM tasks WHERE id=r."taskId" AND "organizationId"=r."organizationId";
    IF t.id IS NULL OR r."projectId" IS DISTINCT FROM t."projectId" THEN RAISE EXCEPTION 'S27 task and project scope mismatch'; END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s27_run_task_scope AFTER INSERT ON ai_runs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s27_task_scope_guard();

CREATE FUNCTION s27_head_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run_id uuid; org_id uuid; head integer; count_rows integer; max_version integer;
BEGIN
  IF TG_TABLE_NAME='ai_runs' THEN run_id:=NEW.id; org_id:=NEW."organizationId"; ELSE run_id:=NEW."runId"; org_id:=NEW."organizationId"; END IF;
  SELECT "decisionVersion" INTO head FROM ai_runs WHERE id=run_id AND "organizationId"=org_id;
  SELECT count(*),coalesce(max(version),0) INTO count_rows,max_version FROM ai_decisions WHERE "runId"=run_id AND "organizationId"=org_id;
  IF head IS NULL OR head<>count_rows OR head<>max_version THEN RAISE EXCEPTION 'S27 decision head must equal contiguous retained evidence count'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s27_run_head AFTER INSERT OR UPDATE ON ai_runs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s27_head_guard();
CREATE CONSTRAINT TRIGGER s27_decision_head AFTER INSERT ON ai_decisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s27_head_guard();

CREATE FUNCTION s27_canonical_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e domain_events; a audit_events; run_row ai_runs; decision_row ai_decisions; receipt ai_receipts; expected text; subject text; actor uuid; org uuid; after_data jsonb; receipt_count integer;
BEGIN
  IF TG_TABLE_NAME='ai_runs' THEN
    SELECT * INTO run_row FROM ai_runs WHERE id=NEW.id AND "organizationId"=NEW."organizationId";
    expected:='ai.run_created'; subject:=NEW.id::text; actor:=NEW."requesterId"; org:=NEW."organizationId";
    SELECT * INTO e FROM domain_events WHERE id=NEW."eventId";
  ELSE
    SELECT * INTO decision_row FROM ai_decisions WHERE id=NEW.id AND "organizationId"=NEW."organizationId" AND "runId"=NEW."runId";
    expected:='ai.decision_recorded'; subject:=NEW.id::text; actor:=NEW."actorId"; org:=NEW."organizationId";
    SELECT * INTO e FROM domain_events WHERE id=NEW."eventId";
  END IF;
  IF e.id IS NULL THEN RAISE EXCEPTION 'S27 canonical event missing'; END IF;
  SELECT * INTO a FROM audit_events WHERE id=(e.payload->>'auditEventId')::uuid;
  IF a.id IS NULL OR e."eventName" IS DISTINCT FROM expected OR a."eventKey" IS DISTINCT FROM expected OR e."schemaVersion"<>1 OR a."schemaVersion"<>1 OR e."organizationId" IS DISTINCT FROM org OR a."organizationId" IS DISTINCT FROM org OR e."actorId" IS DISTINCT FROM actor OR a."actorId" IS DISTINCT FROM actor OR e."subjectType" IS DISTINCT FROM (CASE WHEN expected='ai.run_created' THEN 'ai_run' ELSE 'ai_decision' END) OR a."subjectType" IS DISTINCT FROM e."subjectType" OR e."subjectId" IS DISTINCT FROM subject OR a."subjectId" IS DISTINCT FROM subject OR e.payload->>'auditEventId' IS DISTINCT FROM a.id::text OR e.payload->>'subjectId' IS DISTINCT FROM subject OR a."correlationId" IS DISTINCT FROM e."correlationId" OR NOT EXISTS(SELECT 1 FROM outbox_deliveries WHERE "eventId"=e.id AND consumer='NTF') THEN RAISE EXCEPTION 'S27 canonical event identity mismatch'; END IF;
  IF expected='ai.run_created' THEN
    SELECT count(*) INTO receipt_count FROM ai_receipts WHERE "runId"=run_row.id AND operation='CREATE_RUN';
    SELECT * INTO receipt FROM ai_receipts WHERE "runId"=run_row.id AND operation='CREATE_RUN' AND "actorId"=run_row."requesterId";
    IF receipt_count<>1 OR receipt.id IS NULL THEN RAISE EXCEPTION 'S27 run must have exactly one requester command receipt'; END IF;
    after_data:=jsonb_build_object('operation',receipt.operation,'actorId',receipt."actorId",'kind',run_row.kind,'projectId',run_row."projectId",'taskId',run_row."taskId",'purpose',run_row.purpose,'currentTeamId',run_row."currentTeamId",'currentTeamBranchId',run_row."currentTeamBranchId",'broaderSearch',run_row."broaderSearch",'fromDate',run_row."fromDate",'toDate',run_row."toDate",'provider',run_row.provider,'providerVersion',run_row."providerVersion",'inputHash',run_row."inputHash",'requestHash',encode(sha256(convert_to(run_row.request::text,'UTF8')),'hex'),'manifestHash',encode(sha256(convert_to(run_row.manifest::text,'UTF8')),'hex'),'resultHash',encode(sha256(convert_to(run_row.result::text,'UTF8')),'hex'),'commandId',receipt."commandId",'payloadHash',receipt."payloadHash");
    IF a.after IS DISTINCT FROM after_data OR a.reason IS DISTINCT FROM run_row.reason THEN RAISE EXCEPTION 'S27 run event evidence mismatch'; END IF;
  ELSE
    SELECT count(*) INTO receipt_count FROM ai_receipts WHERE "decisionId"=decision_row.id;
    SELECT * INTO receipt FROM ai_receipts WHERE "decisionId"=decision_row.id AND "actorId"=decision_row."actorId" AND "runId"=decision_row."runId";
    IF receipt_count<>1 OR receipt.id IS NULL OR receipt.operation IS DISTINCT FROM (CASE WHEN decision_row.kind='DECISION' THEN 'DECISION' ELSE 'OUTCOME' END) THEN RAISE EXCEPTION 'S27 decision must have exactly one matching command receipt'; END IF;
    after_data:=jsonb_build_object('operation',receipt.operation,'actorId',receipt."actorId",'runId',decision_row."runId",'version',decision_row.version,'kind',decision_row.kind,'outcome',decision_row.outcome,'selectionEmployeeId',decision_row."selectionEmployeeId",'selectionPurpose',decision_row."selectionPurpose",'priorDecisionId',decision_row."priorDecisionId",'sourceTaskId',decision_row."sourceTaskId",'observationHash',CASE WHEN decision_row.observation IS NULL THEN NULL ELSE encode(sha256(convert_to(decision_row.observation::text,'UTF8')),'hex') END,'commandId',receipt."commandId",'payloadHash',receipt."payloadHash");
    IF a.after IS DISTINCT FROM after_data OR a.reason IS DISTINCT FROM decision_row.reason THEN RAISE EXCEPTION 'S27 decision event evidence mismatch'; END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s27_run_canonical AFTER INSERT ON ai_runs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s27_canonical_guard();
CREATE CONSTRAINT TRIGGER s27_decision_canonical AFTER INSERT ON ai_decisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s27_canonical_guard();

CREATE FUNCTION s27_receipt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run_row ai_runs; decision_row ai_decisions; account_kind text;
BEGIN
  SELECT * INTO run_row FROM ai_runs WHERE id=NEW."runId" AND "organizationId"=NEW."organizationId";
  IF run_row.id IS NULL OR NEW.result - 'runId' - 'decisionId' <> '{}'::jsonb THEN RAISE EXCEPTION 'S27 receipt must retain references only'; END IF;
  IF NEW.operation='CREATE_RUN' THEN
    IF NEW."decisionId" IS NOT NULL OR NEW."actorId" IS DISTINCT FROM run_row."requesterId" THEN RAISE EXCEPTION 'S27 run receipt actor mismatch'; END IF;
  ELSE
    SELECT * INTO decision_row FROM ai_decisions WHERE id=NEW."decisionId" AND "runId"=NEW."runId" AND "organizationId"=NEW."organizationId";
    IF decision_row.id IS NULL OR decision_row."actorId" IS DISTINCT FROM NEW."actorId" OR (NEW.operation='DECISION' AND decision_row.kind<>'DECISION') OR (NEW.operation='OUTCOME' AND decision_row.kind<>'OUTCOME') THEN RAISE EXCEPTION 'S27 decision receipt identity mismatch'; END IF;
  END IF;
  SELECT kind INTO account_kind FROM accounts WHERE id=NEW."actorId" AND state='ACTIVE';
  IF account_kind IS NULL OR account_kind NOT IN ('OWNER','STAFF') THEN RAISE EXCEPTION 'S27 internal actor required'; END IF;
  IF account_kind='STAFF' AND NOT EXISTS(SELECT 1 FROM employees WHERE "accountId"=NEW."actorId" AND "organizationId"=NEW."organizationId" AND state='ACTIVE') THEN RAISE EXCEPTION 'S27 active staff membership required'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER s27_receipt_guard BEFORE INSERT ON ai_receipts FOR EACH ROW EXECUTE FUNCTION s27_receipt_guard();

REVOKE ALL PRIVILEGES ON ai_runs,ai_decisions,ai_receipts FROM sense_app_runtime;
GRANT SELECT, INSERT ON ai_runs,ai_decisions,ai_receipts TO sense_app_runtime;
GRANT UPDATE("decisionVersion") ON ai_runs TO sense_app_runtime;
REVOKE TRUNCATE, DELETE, UPDATE ON ai_runs,ai_decisions,ai_receipts FROM sense_app_runtime;

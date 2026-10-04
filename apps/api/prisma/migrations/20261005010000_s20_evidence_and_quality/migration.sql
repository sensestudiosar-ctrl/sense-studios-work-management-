-- Additive correction: preserve completed decisions while recording factual quality, and bind full evidence by SHA256.
CREATE OR REPLACE FUNCTION s20_record_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_data jsonb; attempt site_verification_attempts%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=NEW."projectId" AND p."organizationId"=NEW."organizationId" AND p."deliveryType"='TURNKEY' AND p.status='ACTIVE') THEN RAISE EXCEPTION 'S20 delivery stopped'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW."workspaceId",NEW."organizationId",NEW."projectId",NEW.kind,NEW."createdAt") IS DISTINCT FROM ROW(OLD.id,OLD."workspaceId",OLD."organizationId",OLD."projectId",OLD.kind,OLD."createdAt") OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'S20 immutable identity/current version'; END IF;
  IF OLD.kind IN('MANPOWER','HANDOVER') OR OLD.kind='REPORT' AND OLD.state='CONFIRMED' OR OLD.kind='SNAG' AND OLD.state='CLOSED' THEN RAISE EXCEPTION 'S20 confirmed/completed evidence immutable'; END IF;
 ELSE IF NEW.version<>1 THEN RAISE EXCEPTION 'S20 initial record version'; END IF; END IF;
 IF NEW.kind='PACKAGE' THEN
  IF NEW.state NOT IN('OPEN','COMPLETED') OR NOT(NEW.data ?& ARRAY['title','date','plannedPercent','actualPercent','plannedQuantity','actualQuantity','qualityStatus','photoEvidence']) OR NEW.data->>'qualityStatus' NOT IN('PENDING','PASSED','FAILED') OR jsonb_typeof(NEW.data->'photoEvidence')<>'array' THEN RAISE EXCEPTION 'S20 package fields/state'; END IF;
  IF NEW.data->>'plannedPercent' !~ '^\d{1,12}(\.\d{1,4})?$' OR NEW.data->>'actualPercent' !~ '^\d{1,12}(\.\d{1,4})?$' OR (NEW.data->>'plannedPercent')::numeric>100 OR (NEW.data->>'actualPercent')::numeric>100 OR NEW.data->>'plannedQuantity' !~ '^\d{1,12}(\.\d{1,4})?$' OR NEW.data->>'actualQuantity' !~ '^\d{1,12}(\.\d{1,4})?$' THEN RAISE EXCEPTION 'S20 quantities'; END IF;
  IF TG_OP='UPDATE' AND ROW(NEW.data->'releaseId',NEW.data->'plannedQuantity',NEW.data->'plannedPercent',NEW.data->'unit',NEW.data->'date',NEW.data->'title') IS DISTINCT FROM ROW(OLD.data->'releaseId',OLD.data->'plannedQuantity',OLD.data->'plannedPercent',OLD.data->'unit',OLD.data->'date',OLD.data->'title') THEN RAISE EXCEPTION 'S20 package plan identity retained'; END IF;
  IF TG_OP='UPDATE' AND OLD.state='COMPLETED' AND (NEW.state<>'COMPLETED' OR ROW(NEW.data->'completedBy',NEW.data->'completedAt') IS DISTINCT FROM ROW(OLD.data->'completedBy',OLD.data->'completedAt')) THEN RAISE EXCEPTION 'S20 completion decision retained'; END IF;
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

CREATE OR REPLACE FUNCTION s20_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
 IF h.snapshot<>expected OR h."organizationId"<>NEW."organizationId" OR h."projectId"<>NEW."projectId" OR NOT EXISTS(SELECT 1 FROM domain_events e JOIN audit_events a ON a.id=(e.payload->>'auditEventId')::uuid JOIN outbox_deliveries o ON o."eventId"=e.id WHERE e.id=h."eventId" AND e."organizationId"=h."organizationId" AND e."actorId"=h."actorId" AND e."subjectId"=h."subjectId"::text AND e."subjectType"=h."subjectType" AND e."eventName"=h."eventName" AND a."eventKey"=h."eventName" AND a."actorId"=h."actorId" AND a."subjectId"=h."subjectId"::text AND a.reason=h.reason AND (a."after"=h.snapshot OR a."after"=jsonb_build_object('projectId',h."projectId",'version',h."subjectVersion",'snapshotSha256',encode(sha256(convert_to(h.snapshot::text,'UTF8')),'hex')))) THEN RAISE EXCEPTION 'S20 canonical atomic audit/event/outbox required'; END IF;
 RETURN NULL;
END $$;

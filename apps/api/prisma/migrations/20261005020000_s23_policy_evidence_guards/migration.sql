-- Additive final S23 integrity review. Applied migration 98 remains unchanged.
CREATE OR REPLACE FUNCTION s23_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v performance_versions; e domain_events; p performance_records; expected_event text; actor_kind text; actor_state text;
BEGIN
 SELECT * INTO v FROM performance_versions WHERE "recordId"=NEW.id AND version=NEW.version;
 IF NOT FOUND OR v."organizationId"<>NEW."organizationId" OR v.state<>NEW.state OR v.data<>NEW.data THEN
  RAISE EXCEPTION 'S23 canonical history missing' USING ERRCODE='23514';
 END IF;
 SELECT * INTO e FROM domain_events WHERE id=v."eventId";
 expected_event:=CASE WHEN NEW.kind IN ('HEALTH','DELAY') THEN 'project_health.changed' ELSE 'employee_performance.changed' END;
 IF NOT FOUND OR e."organizationId"<>NEW."organizationId" OR e."subjectId"<>NEW.id::text OR e."actorId"<>v."actorId" OR e."eventName"<>expected_event THEN
  RAISE EXCEPTION 'S23 history event mismatch' USING ERRCODE='23514';
 END IF;
 SELECT kind::text,state::text INTO actor_kind,actor_state FROM accounts WHERE id=v."actorId";
 IF ((NEW.kind IN ('POLICY','ASSIGNMENT','DELAY')) OR (NEW.kind='CYCLE' AND NEW.state='FINALIZED' AND (TG_OP='INSERT' OR OLD.state<>'FINALIZED')))
  AND (actor_kind IS DISTINCT FROM 'OWNER' OR actor_state IS DISTINCT FROM 'ACTIVE') THEN
  RAISE EXCEPTION 'S23 protected decision requires Owner' USING ERRCODE='23514';
 END IF;
 IF NEW.kind IN ('SCORE','HEALTH') THEN
  SELECT * INTO p FROM performance_records WHERE id=(NEW.data->>'policyId')::uuid AND "organizationId"=NEW."organizationId";
  IF NOT FOUND OR p.kind<>'POLICY' OR p.state<>'APPROVED' OR p.version IS DISTINCT FROM (NEW.data->>'policyVersion')::integer
   OR p.data->>'family' IS DISTINCT FROM NEW.data->>'family' OR p.data->>'groupKey' IS DISTINCT FROM NEW.data->>'groupKey'
   OR NEW.data->>'from' IS NULL OR p.data->>'effectiveFrom'>NEW.data->>'from'
   OR (NEW.kind='SCORE' AND NEW.data->>'family' NOT IN ('EMPLOYEE','LEADER'))
   OR (NEW.kind='HEALTH' AND NEW.data->>'family' NOT IN ('DESIGN','TURNKEY')) THEN
   RAISE EXCEPTION 'S23 score requires exact approved policy' USING ERRCODE='23514';
  END IF;
  IF NEW.kind='HEALTH' AND NEW.data->>'family' IS DISTINCT FROM (SELECT "deliveryType"::text FROM projects WHERE id=NEW."projectId" AND "organizationId"=NEW."organizationId") THEN
   RAISE EXCEPTION 'S23 health requires exact project delivery formula' USING ERRCODE='23514';
  END IF;
  IF NEW.data->>'status' NOT IN ('SCORED','INSUFFICIENT_EVIDENCE') OR NEW.data->>'status' IS NULL
   OR (NEW.data->>'status'='SCORED' AND (jsonb_typeof(NEW.data->'score') IS DISTINCT FROM 'number' OR (NEW.data->>'score')::numeric<0 OR (NEW.data->>'score')::numeric>100))
   OR (NEW.data->>'status'='INSUFFICIENT_EVIDENCE' AND NEW.data->'score' IS DISTINCT FROM 'null'::jsonb) THEN
   RAISE EXCEPTION 'S23 score status and value mismatch' USING ERRCODE='23514';
  END IF;
  IF NEW.kind='SCORE' AND NOT EXISTS (
   SELECT 1 FROM performance_records a WHERE a."organizationId"=NEW."organizationId" AND a.kind='ASSIGNMENT'
   AND a."employeeId"=NEW."employeeId" AND a.data->>'family'=NEW.data->>'family'
   AND a.data->>'groupKey'=NEW.data->>'groupKey' AND a.data->>'effectiveFrom'<=NEW.data->>'from'
  ) THEN RAISE EXCEPTION 'S23 score requires explicit dated role group' USING ERRCODE='23514'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW.kind='CYCLE' AND NEW.data->'acknowledgements' IS DISTINCT FROM OLD.data->'acknowledgements'
  AND NEW.data->'acknowledgements'->-1->>'actorId' IS DISTINCT FROM v."actorId"::text THEN
  RAISE EXCEPTION 'S23 acknowledgement actor mismatch' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;

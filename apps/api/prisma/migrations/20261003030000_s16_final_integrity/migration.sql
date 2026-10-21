-- Additive final integrity checks; applied S16 migrations remain unchanged.
CREATE OR REPLACE FUNCTION s16_final_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v time_entry_versions%ROWTYPE; e time_entries%ROWTYPE; t time_timers%ROWTYPE;
 tr time_transitions%ROWTYPE; expected JSONB; prior_data JSONB;
BEGIN
 IF TG_TABLE_NAME='time_accounting_deliveries' THEN
  SELECT * INTO e FROM time_entries WHERE id=NEW."entryId";
  SELECT * INTO v FROM time_entry_versions WHERE "entryId"=NEW."entryId" AND version=NEW.revision;
  expected:=jsonb_build_object('schemaVersion',1,'recordId',e.id,'revision',NEW.revision,'organizationId',e."organizationId",'employeeId',e."employeeId",'projectId',e."projectId",'taskId',e."taskId",'stageId',v.data->'stageId','date',v.data->'date','startedAt',v.data->'startedAt','endedAt',v.data->'endedAt','durationSeconds',v.data->'durationSeconds','workNote',v.data->'workNote','location',v.data->'location','billable',v.data->'billable','activityLabel',v.data->'activityLabel','approvedAt',NEW.payload->'approvedAt');
  IF e.id IS NULL OR v.id IS NULL OR NEW.payload IS DISTINCT FROM expected OR (NEW.payload->>'approvedAt')::timestamptz IS DISTINCT FROM e."approvedAt" THEN RAISE EXCEPTION 'Exact accounting payload required'; END IF;
 ELSIF TG_TABLE_NAME='time_entries' THEN
  IF TG_OP='UPDATE' THEN
   IF NEW.version=OLD.version AND (NEW."projectId" IS DISTINCT FROM OLD."projectId" OR NEW."taskId" IS DISTINCT FROM OLD."taskId") THEN RAISE EXCEPTION 'Time reference correction requires new version'; END IF;
   IF NEW.version=OLD.version+1 AND (NEW."approvedVersion" IS NOT NULL OR NEW."approvedAt" IS NOT NULL) THEN RAISE EXCEPTION 'Time correction requires reapproval'; END IF;
   IF NEW.version=OLD.version AND OLD."approvedVersion" IS NOT NULL AND (NEW."approvedVersion" IS DISTINCT FROM OLD."approvedVersion" OR NEW."approvedAt" IS DISTINCT FROM OLD."approvedAt") THEN RAISE EXCEPTION 'Time approval is immutable'; END IF;
  END IF;
  IF NEW.locked AND NEW."approvedVersion" IS NULL AND NOT EXISTS(SELECT 1 FROM time_approvals WHERE "entryId"=NEW.id) THEN RAISE EXCEPTION 'Time locking requires approval'; END IF;
  IF NEW."timerId" IS NOT NULL THEN
   SELECT * INTO t FROM time_timers WHERE id=NEW."timerId";
   IF t.id IS NULL OR t.state<>'STOPPED' OR t."organizationId"<>NEW."organizationId" OR t."employeeId"<>NEW."employeeId" THEN RAISE EXCEPTION 'Time entry timer identity differs'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME='time_timers' THEN
  SELECT * INTO tr FROM time_transitions WHERE "timerId"=NEW.id AND version=NEW.version;
  IF tr.id IS NULL OR tr."organizationId"<>NEW."organizationId" THEN RAISE EXCEPTION 'Exact timer transition required'; END IF;
  IF TG_OP='INSERT' THEN
   IF NEW.version<>1 OR NEW.state<>'RUNNING' OR NEW."elapsedMs"<>0 OR tr."fromState" IS NOT NULL OR NEW."projectId" IS DISTINCT FROM (NEW.data->>'projectId')::uuid OR NEW."taskId" IS DISTINCT FROM (NEW.data->>'taskId')::uuid THEN RAISE EXCEPTION 'Invalid initial timer'; END IF;
  ELSE
   IF tr."fromState" IS DISTINCT FROM OLD.state OR NOT ((OLD.state='RUNNING' AND NEW.state IN ('PAUSED','STOPPED')) OR (OLD.state='PAUSED' AND NEW.state IN ('RUNNING','STOPPED'))) THEN RAISE EXCEPTION 'Invalid timer transition'; END IF;
   IF NEW."elapsedMs"<>OLD."elapsedMs"+(CASE WHEN OLD."runningSince" IS NULL THEN 0 ELSE greatest(0,(extract(epoch FROM (tr."occurredAt"-OLD."runningSince"))*1000)::bigint) END) THEN RAISE EXCEPTION 'Timer elapsed snapshot differs'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME='time_entry_versions' THEN
  IF NEW.version<1 OR jsonb_typeof(NEW.data->'durationSeconds') IS DISTINCT FROM 'number' OR (NEW.data->>'durationSeconds')::bigint NOT BETWEEN 1 AND 31536000 OR jsonb_typeof(NEW.data->'billable') IS DISTINCT FROM 'boolean' OR jsonb_typeof(NEW.data->'workNote') IS DISTINCT FROM 'string' OR length(btrim(NEW.data->>'workNote')) NOT BETWEEN 1 AND 1000 OR NEW.data->>'location' IS NULL OR NEW.data->>'location' NOT IN ('OFFICE','SITE','REMOTE') OR NEW.data->>'date' IS NULL THEN RAISE EXCEPTION 'Complete time data required'; END IF;
  IF NEW.version>1 THEN
   SELECT data INTO prior_data FROM time_entry_versions WHERE "entryId"=NEW."entryId" AND version=NEW.version-1;
   IF prior_data IS NULL OR NOT EXISTS(SELECT 1 FROM domain_events de JOIN audit_events a ON a.id=(de.payload->>'auditEventId')::uuid WHERE de.id=NEW."eventId" AND a.before->'data'=prior_data AND (a.before->>'version')::int=NEW.version-1) THEN RAISE EXCEPTION 'Original time correction snapshot required'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s16_final_integrity AFTER INSERT ON time_accounting_deliveries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s16_final_integrity();
CREATE CONSTRAINT TRIGGER s16_final_integrity AFTER INSERT OR UPDATE ON time_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s16_final_integrity();
CREATE CONSTRAINT TRIGGER s16_final_integrity AFTER INSERT OR UPDATE ON time_timers DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s16_final_integrity();
CREATE CONSTRAINT TRIGGER s16_final_integrity AFTER INSERT ON time_entry_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s16_final_integrity();

CREATE OR REPLACE FUNCTION s16_canonical() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE evt TEXT; subject TEXT; target TEXT; actor UUID; org UUID; evidence UUID; why TEXT; ver INT;
BEGIN
 org:=NEW."organizationId";
 IF TG_TABLE_NAME='time_entry_versions' THEN evt:=CASE WHEN NEW.version=1 THEN 'time.logged' ELSE 'time.changed' END; subject:='time_entry'; target:=NEW."entryId"::text; actor:=NEW."editorId";
 ELSIF TG_TABLE_NAME='time_approvals' THEN evt:='time.approved'; subject:='time_entry'; target:=NEW."entryId"::text; actor:=NEW."actorId";
 ELSIF TG_TABLE_NAME='time_transitions' THEN evt:=CASE WHEN NEW.version=1 THEN 'time.started' ELSE 'time.timer_changed' END; subject:='time_timer'; target:=NEW."timerId"::text; actor:=NEW."actorId";
 ELSE evt:='time.export_requested'; subject:='time_delivery'; target:=NEW.id::text; actor:=NEW."requestedById"; END IF;
 evidence:=NEW."eventId"; why:=NEW.reason;
 IF TG_TABLE_NAME<>'time_accounting_deliveries' THEN ver:=NEW.version; END IF;
 IF NOT EXISTS(SELECT 1 FROM domain_events e JOIN audit_events a ON a.id=(e.payload->>'auditEventId')::uuid JOIN outbox_deliveries o ON o."eventId"=e.id WHERE e.id=evidence AND e."eventName"=evt AND e."subjectType"=subject AND e."subjectId"=target AND e."actorId"=actor AND e."organizationId"=org AND a."eventKey"=evt AND a."actorId"=actor AND a."organizationId"=org AND a."subjectId"=target AND a.reason=why AND (ver IS NULL OR (a.after->>'version')::int=ver)) THEN RAISE EXCEPTION 'Canonical time evidence required'; END IF;
 IF TG_TABLE_NAME='time_entry_versions' THEN
  IF NOT EXISTS(SELECT 1 FROM time_entries WHERE id=NEW."entryId" AND "organizationId"=org) OR (NEW.data->>'durationSeconds')::int<1 OR NEW.data->>'location' NOT IN ('OFFICE','SITE','REMOTE') THEN RAISE EXCEPTION 'Invalid time version'; END IF;
  IF NOT EXISTS(SELECT 1 FROM audit_events a JOIN domain_events e ON a.id=(e.payload->>'auditEventId')::uuid WHERE e.id=evidence AND a.after->'data'=NEW.data) THEN RAISE EXCEPTION 'Time version snapshot differs'; END IF;
 END IF;
 IF TG_TABLE_NAME='time_transitions' THEN
 IF NOT EXISTS(SELECT 1 FROM time_timers WHERE id=NEW."timerId" AND "organizationId"=org AND version=NEW.version AND state=NEW."toState" AND "elapsedMs"=NEW."elapsedMs") THEN RAISE EXCEPTION 'Timer transition differs'; END IF;
 END IF;
 RETURN NEW;
END $$;

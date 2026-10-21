-- Tighten canonical delivery scope and retained history insertion without changing applied migrations.
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
 IF h.snapshot<>expected OR h."organizationId"<>NEW."organizationId" OR h."projectId"<>NEW."projectId" OR NOT EXISTS(SELECT 1 FROM domain_events e JOIN audit_events a ON a.id=(e.payload->>'auditEventId')::uuid JOIN outbox_deliveries o ON o."eventId"=e.id WHERE e.id=h."eventId" AND e."organizationId"=h."organizationId" AND e."actorId"=h."actorId" AND e."subjectId"=h."subjectId"::text AND e."subjectType"=h."subjectType" AND e."eventName"=h."eventName" AND a."organizationId"=h."organizationId" AND a."subjectType"=h."subjectType" AND o.consumer='NTF' AND a."eventKey"=h."eventName" AND a."actorId"=h."actorId" AND a."subjectId"=h."subjectId"::text AND a.reason=h.reason AND (a."after"=h.snapshot OR a."after"=jsonb_build_object('projectId',h."projectId",'version',h."subjectVersion",'snapshotSha256',encode(sha256(convert_to(h.snapshot::text,'UTF8')),'hex')))) THEN RAISE EXCEPTION 'S20 canonical atomic audit/event/outbox required'; END IF;
 RETURN NULL;
END $$;

CREATE FUNCTION s20_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE head_version integer;
BEGIN
 IF NEW."subjectType"='site_workspace' THEN
  SELECT version INTO head_version FROM site_workspaces WHERE id=NEW."subjectId" AND id=NEW."workspaceId" AND "organizationId"=NEW."organizationId" AND "projectId"=NEW."projectId";
  IF NEW."eventName"<>'site.workspace_changed' OR NEW.snapshot->>'id' IS DISTINCT FROM NEW."subjectId"::text THEN RAISE EXCEPTION 'S20 exact workspace history identity'; END IF;
 ELSE
  SELECT version INTO head_version FROM site_records WHERE id=NEW."subjectId" AND "workspaceId"=NEW."workspaceId" AND "organizationId"=NEW."organizationId" AND "projectId"=NEW."projectId";
  IF NEW."eventName"<>'site.changed' OR NEW.snapshot->>'recordId' IS DISTINCT FROM NEW."subjectId"::text THEN RAISE EXCEPTION 'S20 exact record history identity'; END IF;
 END IF;
 IF head_version IS NULL OR NEW."subjectVersion">head_version OR NEW.snapshot->>'version' IS DISTINCT FROM NEW."subjectVersion"::text OR NEW.snapshot->>'projectId' IS DISTINCT FROM NEW."projectId"::text THEN RAISE EXCEPTION 'S20 history must bind a real scoped version'; END IF;
 IF NOT EXISTS(SELECT 1 FROM domain_events e JOIN audit_events a ON a.id=(e.payload->>'auditEventId')::uuid JOIN outbox_deliveries o ON o."eventId"=e.id AND o.consumer='NTF'
 WHERE e.id=NEW."eventId" AND e."organizationId"=NEW."organizationId" AND e."actorId"=NEW."actorId" AND e."subjectId"=NEW."subjectId"::text AND e."subjectType"=NEW."subjectType" AND e."eventName"=NEW."eventName"
 AND a."organizationId"=NEW."organizationId" AND a."subjectType"=NEW."subjectType" AND a."eventKey"=NEW."eventName" AND a."actorId"=NEW."actorId" AND a."subjectId"=NEW."subjectId"::text AND a.reason=NEW.reason
 AND (a."after"=NEW.snapshot OR a."after"=jsonb_build_object('projectId',NEW."projectId",'version',NEW."subjectVersion",'snapshotSha256',encode(sha256(convert_to(NEW.snapshot::text,'UTF8')),'hex')))) THEN RAISE EXCEPTION 'S20 history requires exact canonical atomic delivery'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s20_history_evidence AFTER INSERT ON site_history DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s20_history_guard();
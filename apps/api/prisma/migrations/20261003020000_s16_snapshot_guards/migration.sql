-- Strengthen additive snapshot checks without changing applied migration checksums.
CREATE OR REPLACE FUNCTION s16_head_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Time history cannot be deleted'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.id<>OLD.id OR NEW."organizationId"<>OLD."organizationId" OR NEW."employeeId"<>OLD."employeeId" THEN RAISE EXCEPTION 'Invalid time identity'; END IF;
  IF TG_TABLE_NAME='time_entries' THEN
   IF NEW."timerId" IS DISTINCT FROM OLD."timerId" OR NEW."createdAt"<>OLD."createdAt" OR OLD.locked AND NOT NEW.locked OR NEW.version NOT IN (OLD.version,OLD.version+1) THEN RAISE EXCEPTION 'Invalid time entry change'; END IF;
  ELSE
   IF NEW.data<>OLD.data OR NEW.version<>OLD.version+1 OR NEW."elapsedMs"<OLD."elapsedMs" OR NEW."projectId" IS DISTINCT FROM OLD."projectId" OR NEW."taskId" IS DISTINCT FROM OLD."taskId" OR NEW."startedAt"<>OLD."startedAt" OR OLD.state='STOPPED' THEN RAISE EXCEPTION 'Invalid timer change'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION s16_head_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE transition time_transitions%ROWTYPE; current_data JSONB; BEGIN
 IF TG_TABLE_NAME='time_entries' THEN
  SELECT data INTO current_data FROM time_entry_versions WHERE "entryId"=NEW.id AND version=NEW.version AND "organizationId"=NEW."organizationId";
  IF current_data IS NULL OR (current_data->>'projectId')::uuid IS DISTINCT FROM NEW."projectId" OR (current_data->>'taskId')::uuid IS DISTINCT FROM NEW."taskId" THEN RAISE EXCEPTION 'Exact time head version required'; END IF;
  IF NEW."approvedVersion" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM time_approvals WHERE "entryId"=NEW.id AND version=NEW."approvedVersion" AND "organizationId"=NEW."organizationId" AND "occurredAt"=NEW."approvedAt") THEN RAISE EXCEPTION 'Exact time approval required'; END IF;
 ELSE
  SELECT * INTO transition FROM time_transitions WHERE "timerId"=NEW.id AND version=NEW.version AND "toState"=NEW.state AND "elapsedMs"=NEW."elapsedMs";
  IF transition.id IS NULL OR NEW.state='RUNNING' AND NEW."runningSince"<>transition."occurredAt" OR NEW.state='STOPPED' AND NEW."stoppedAt"<>transition."occurredAt" OR NEW.version=1 AND NEW."startedAt"<>transition."occurredAt" THEN RAISE EXCEPTION 'Exact time transition required'; END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION s16_exact_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE entry time_entries%ROWTYPE; v time_entry_versions%ROWTYPE; audit_after JSONB; BEGIN
 SELECT * INTO entry FROM time_entries WHERE id=NEW."entryId";
 SELECT * INTO v FROM time_entry_versions WHERE "entryId"=NEW."entryId" AND version=NEW.revision;
 SELECT a.after INTO audit_after FROM domain_events e JOIN audit_events a ON a.id=(e.payload->>'auditEventId')::uuid WHERE e.id=NEW."eventId";
 IF entry.id IS NULL OR entry."organizationId"<>NEW."organizationId" OR entry.version<>NEW.revision OR entry."approvedVersion"<>NEW.revision OR entry."approvedVersion" IS NULL OR NOT entry.locked OR v.id IS NULL THEN RAISE EXCEPTION 'Approved current time export required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."requestedById" AND kind='OWNER' AND state='ACTIVE') THEN RAISE EXCEPTION 'Owner time export required'; END IF;
 IF NEW.payload->>'recordId'<>entry.id::text OR (NEW.payload->>'revision')::int<>NEW.revision OR NEW.payload->>'employeeId'<>entry."employeeId"::text OR NEW.payload->>'organizationId'<>entry."organizationId"::text OR (NEW.payload->>'projectId')::uuid IS DISTINCT FROM entry."projectId" OR (NEW.payload->>'taskId')::uuid IS DISTINCT FROM entry."taskId" OR audit_after->>'entryId'<>entry.id::text OR audit_after->>'payloadHash'<>NEW."payloadHash" OR (audit_after->>'revision')::int<>NEW.revision THEN RAISE EXCEPTION 'Time export identity differs'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(v.data) field WHERE field.key IN ('stageId','date','startedAt','endedAt','durationSeconds','workNote','location','billable','activityLabel') AND NEW.payload->field.key IS DISTINCT FROM field.value) OR (NEW.payload->>'approvedAt')::timestamptz IS DISTINCT FROM entry."approvedAt" THEN RAISE EXCEPTION 'Time export snapshot differs'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s16_exact_delivery AFTER INSERT ON time_accounting_deliveries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s16_exact_delivery();

REVOKE DELETE,TRUNCATE ON time_timers,time_entries,time_entry_versions,time_approvals,time_transitions,time_command_receipts,time_accounting_deliveries,time_accounting_attempts FROM sense_app_runtime;

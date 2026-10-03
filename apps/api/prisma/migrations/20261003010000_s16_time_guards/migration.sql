-- Additive guards. Existing records and prior-column values are untouched.
CREATE UNIQUE INDEX time_one_open_timer ON time_timers ("employeeId") WHERE state IN ('RUNNING','PAUSED');
ALTER TABLE time_timers ADD CONSTRAINT time_timer_state CHECK (state IN ('RUNNING','PAUSED','STOPPED') AND version>0 AND "elapsedMs">=0 AND ((state='RUNNING')=("runningSince" IS NOT NULL)) AND ((state='STOPPED')=("stoppedAt" IS NOT NULL)));
ALTER TABLE time_entries ADD CONSTRAINT time_entry_version CHECK (version>0 AND ("approvedVersion" IS NULL OR "approvedVersion"=version AND locked AND "approvedAt" IS NOT NULL));
ALTER TABLE time_accounting_deliveries ADD CONSTRAINT time_delivery_state CHECK (state IN ('PENDING','SENDING','FAILED','DELIVERED') AND revision>0 AND attempts>=0);
ALTER TABLE time_timers ADD FOREIGN KEY ("employeeId","organizationId") REFERENCES employees(id,"organizationId") ON DELETE RESTRICT;
ALTER TABLE time_timers ADD FOREIGN KEY ("projectId","organizationId") REFERENCES projects(id,"organizationId") ON DELETE RESTRICT;
ALTER TABLE time_timers ADD FOREIGN KEY ("taskId","organizationId") REFERENCES tasks(id,"organizationId") ON DELETE RESTRICT;
ALTER TABLE time_entries ADD FOREIGN KEY ("employeeId","organizationId") REFERENCES employees(id,"organizationId") ON DELETE RESTRICT;
ALTER TABLE time_entries ADD FOREIGN KEY ("projectId","organizationId") REFERENCES projects(id,"organizationId") ON DELETE RESTRICT;
ALTER TABLE time_entries ADD FOREIGN KEY ("taskId","organizationId") REFERENCES tasks(id,"organizationId") ON DELETE RESTRICT;
ALTER TABLE time_entries ADD FOREIGN KEY ("timerId") REFERENCES time_timers(id) ON DELETE RESTRICT;
ALTER TABLE time_entry_versions ADD FOREIGN KEY ("entryId") REFERENCES time_entries(id) ON DELETE RESTRICT;
ALTER TABLE time_entry_versions ADD FOREIGN KEY ("editorId") REFERENCES accounts(id) ON DELETE RESTRICT;
ALTER TABLE time_entry_versions ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) ON DELETE RESTRICT;
ALTER TABLE time_approvals ADD FOREIGN KEY ("entryId") REFERENCES time_entries(id) ON DELETE RESTRICT;
ALTER TABLE time_approvals ADD FOREIGN KEY ("actorId") REFERENCES accounts(id) ON DELETE RESTRICT;
ALTER TABLE time_approvals ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) ON DELETE RESTRICT;
ALTER TABLE time_transitions ADD FOREIGN KEY ("timerId") REFERENCES time_timers(id) ON DELETE RESTRICT;
ALTER TABLE time_transitions ADD FOREIGN KEY ("actorId") REFERENCES accounts(id) ON DELETE RESTRICT;
ALTER TABLE time_transitions ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) ON DELETE RESTRICT;
ALTER TABLE time_command_receipts ADD FOREIGN KEY ("actorId") REFERENCES accounts(id) ON DELETE RESTRICT;
ALTER TABLE time_accounting_deliveries ADD FOREIGN KEY ("entryId") REFERENCES time_entries(id) ON DELETE RESTRICT;
ALTER TABLE time_accounting_deliveries ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) ON DELETE RESTRICT;
ALTER TABLE time_accounting_attempts ADD FOREIGN KEY ("deliveryId") REFERENCES time_accounting_deliveries(id) ON DELETE RESTRICT;

DO $$ DECLARE prior TEXT; BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO prior FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF prior IS NULL THEN RAISE EXCEPTION 'Existing event catalogue required'; END IF;
 ALTER TABLE domain_events DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE format('ALTER TABLE domain_events ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName" IN (''time.started'',''time.timer_changed'',''time.logged'',''time.changed'',''time.approved'',''time.export_requested''))',prior);
END $$;

CREATE FUNCTION s16_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'S16 immutable evidence'; END $$;
DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['time_entry_versions','time_approvals','time_transitions','time_command_receipts','time_accounting_attempts'] LOOP
 EXECUTE format('CREATE TRIGGER s16_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION s16_immutable()',t);
 EXECUTE format('CREATE TRIGGER s16_no_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION s16_immutable()',t);
 END LOOP;
END $$;

CREATE FUNCTION s16_canonical() RETURNS trigger LANGUAGE plpgsql AS $$
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
 IF TG_TABLE_NAME='time_transitions' AND NOT EXISTS(SELECT 1 FROM time_timers WHERE id=NEW."timerId" AND "organizationId"=org AND version=NEW.version AND state=NEW."toState" AND "elapsedMs"=NEW."elapsedMs") THEN RAISE EXCEPTION 'Timer transition differs'; END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t TEXT; BEGIN FOREACH t IN ARRAY ARRAY['time_entry_versions','time_approvals','time_transitions','time_accounting_deliveries'] LOOP
 EXECUTE format('CREATE CONSTRAINT TRIGGER s16_evidence AFTER INSERT ON %I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s16_canonical()',t);
END LOOP; END $$;

CREATE FUNCTION s16_head_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Time history cannot be deleted'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.id<>OLD.id OR NEW."organizationId"<>OLD."organizationId" OR NEW."employeeId"<>OLD."employeeId" THEN RAISE EXCEPTION 'Invalid time identity'; END IF;
  IF TG_TABLE_NAME='time_entries' THEN
   IF OLD.locked AND NOT NEW.locked OR NEW.version NOT IN (OLD.version,OLD.version+1) THEN RAISE EXCEPTION 'Invalid time entry change'; END IF;
  ELSE
   IF NEW.data<>OLD.data OR NEW.version<>OLD.version+1 OR NEW."elapsedMs"<OLD."elapsedMs" THEN RAISE EXCEPTION 'Invalid timer change'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s16_head BEFORE UPDATE OR DELETE ON time_entries FOR EACH ROW EXECUTE FUNCTION s16_head_guard();
CREATE TRIGGER s16_head BEFORE UPDATE OR DELETE ON time_timers FOR EACH ROW EXECUTE FUNCTION s16_head_guard();

CREATE FUNCTION s16_head_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_TABLE_NAME='time_entries' THEN
  IF NOT EXISTS(SELECT 1 FROM time_entry_versions WHERE "entryId"=NEW.id AND version=NEW.version AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'Time version required'; END IF;
  IF NEW."approvedVersion" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM time_approvals WHERE "entryId"=NEW.id AND version=NEW."approvedVersion" AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'Time approval required'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM time_transitions WHERE "timerId"=NEW.id AND version=NEW.version AND "toState"=NEW.state AND "elapsedMs"=NEW."elapsedMs") THEN RAISE EXCEPTION 'Time transition required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s16_head_evidence AFTER INSERT OR UPDATE ON time_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s16_head_evidence();
CREATE CONSTRAINT TRIGGER s16_head_evidence AFTER INSERT OR UPDATE ON time_timers DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s16_head_evidence();

CREATE FUNCTION s16_delivery_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR NEW.id<>OLD.id OR NEW."entryId"<>OLD."entryId" OR NEW.revision<>OLD.revision OR NEW.payload<>OLD.payload OR NEW."payloadHash"<>OLD."payloadHash" OR NEW."eventId"<>OLD."eventId" OR NEW."organizationId"<>OLD."organizationId" OR NEW."requestedById"<>OLD."requestedById" OR NEW.reason<>OLD.reason THEN RAISE EXCEPTION 'Delivery identity immutable'; END IF;
 IF OLD.state='DELIVERED' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Delivered receipt immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s16_delivery BEFORE UPDATE OR DELETE ON time_accounting_deliveries FOR EACH ROW EXECUTE FUNCTION s16_delivery_guard();
GRANT SELECT,INSERT,UPDATE,DELETE ON time_timers,time_entries,time_entry_versions,time_approvals,time_transitions,time_command_receipts,time_accounting_deliveries,time_accounting_attempts TO sense_app_runtime;

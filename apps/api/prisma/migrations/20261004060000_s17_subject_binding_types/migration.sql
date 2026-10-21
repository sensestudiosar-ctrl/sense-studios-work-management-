CREATE OR REPLACE FUNCTION s17_version_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE e domain_events; a audit_events; r workforce_records; BEGIN
 SELECT * INTO e FROM domain_events WHERE id=NEW."eventId";
 SELECT * INTO a FROM audit_events WHERE id=(e.payload->>'auditEventId')::uuid;
 SELECT * INTO r FROM workforce_records WHERE id=NEW."recordId";
 IF e.id IS NULL OR a.id IS NULL OR r.id IS NULL OR e."eventName"<>'workforce.changed' OR e."subjectId"<>NEW."recordId"::text OR e."subjectType"<>'workforce_record' OR e."organizationId"<>NEW."organizationId" OR e."actorId"<>NEW."actorId" OR a."eventKey"<>e."eventName" OR a."subjectId"<>e."subjectId" OR a."actorId"<>e."actorId" OR a."organizationId"<>e."organizationId" OR a.after->>'kind'<>r.kind OR (a.after->>'version')::int<>NEW.version OR a.after->>'state'<>NEW.state OR a.after->'data' IS DISTINCT FROM NEW.data OR a.reason<>NEW.reason OR NOT EXISTS (SELECT 1 FROM outbox_deliveries WHERE "eventId"=e.id AND consumer='NTF') THEN RAISE EXCEPTION 'Workforce version requires exact audit/event/outbox'; END IF;
 IF NEW.version>1 AND NOT EXISTS (SELECT 1 FROM workforce_versions WHERE "recordId"=NEW."recordId" AND version=NEW.version-1) THEN RAISE EXCEPTION 'Workforce version sequence missing'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION s17_ledger_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE e domain_events; a audit_events; r workforce_records; day jsonb; BEGIN
 SELECT * INTO e FROM domain_events WHERE id=NEW."eventId"; SELECT * INTO a FROM audit_events WHERE id=(e.payload->>'auditEventId')::uuid;
 IF e.id IS NULL OR a.id IS NULL OR e."organizationId"<>NEW."organizationId" OR a."eventKey"<>e."eventName" OR a."subjectId"<>e."subjectId" OR a."actorId"<>e."actorId" OR a."organizationId"<>e."organizationId" OR NOT EXISTS (SELECT 1 FROM outbox_deliveries WHERE "eventId"=e.id AND consumer='NTF') THEN RAISE EXCEPTION 'Workforce ledger requires canonical evidence'; END IF;
 IF NEW.kind IN ('GRANT','ADJUSTMENT','CARRY') THEN
  IF e."eventName"<>'workforce.credited' OR e."subjectId"<>NEW."employeeId"::text OR (a.after->>'year')::int<>NEW.year OR (a.after->>'days')::numeric<>NEW.days THEN RAISE EXCEPTION 'Entitlement calculation evidence mismatch'; END IF;
 ELSE
  SELECT * INTO r FROM workforce_records WHERE id=(NEW.data->>'recordId')::uuid;
  SELECT d INTO day FROM jsonb_array_elements(a.after->'data'->'days') d WHERE d->>'date'=NEW.data->>'date';
  IF r.id IS NULL OR r.kind<>'LEAVE' OR r."employeeId"<>NEW."employeeId" OR r."organizationId"<>NEW."organizationId" OR e."eventName"<>'workforce.changed' OR e."subjectId"<>r.id::text OR a.after->>'state'<>'APPROVED' OR day IS NULL OR NEW.year<>left(day->>'date',4)::int OR NEW.days<>((day->>'days')::numeric * CASE WHEN NEW.kind='DEBIT' THEN -1 ELSE 1 END) OR NOT (a.after->'data'->>'consumesBalance')::boolean THEN RAISE EXCEPTION 'Leave ledger lacks exact approved day evidence'; END IF;
  IF NEW.kind='REVERSAL' AND (NOT (a.after->'data'->'cancelledDates' ? (day->>'date')) OR NOT EXISTS (SELECT 1 FROM workforce_ledger l WHERE l."employeeId"=NEW."employeeId" AND l.kind='DEBIT' AND l.data->>'recordId'=r.id::text AND l.data->>'date'=day->>'date')) THEN RAISE EXCEPTION 'Reversal lacks original debit and cancellation'; END IF;
 END IF;
 RETURN NEW;
END $$;

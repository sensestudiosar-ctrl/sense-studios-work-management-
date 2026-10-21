-- Additive workforce ownership and immutable evidence guards; prior rows are untouched.
ALTER TABLE workforce_records ADD CONSTRAINT workforce_kind CHECK (kind IN ('POLICY','SCHEDULE','OVERRIDE','HOLIDAY','SITE','ALLOCATION','LEAVE','ATTENDANCE') AND version>0 AND jsonb_typeof(data)='object');
ALTER TABLE workforce_records ADD CONSTRAINT workforce_scope CHECK ((kind IN ('SCHEDULE','OVERRIDE','ALLOCATION','LEAVE','ATTENDANCE'))=("employeeId" IS NOT NULL) AND (kind IN ('POLICY','HOLIDAY','SITE'))=("branchId" IS NOT NULL) AND (kind='ALLOCATION')=("taskId" IS NOT NULL));
CREATE UNIQUE INDEX workforce_identity ON workforce_records(id,"organizationId");
CREATE UNIQUE INDEX workforce_one_open_attendance ON workforce_records("employeeId") WHERE kind='ATTENDANCE' AND state='OPEN';
ALTER TABLE workforce_records ADD FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE RESTRICT;
ALTER TABLE workforce_records ADD FOREIGN KEY ("employeeId","organizationId") REFERENCES employees(id,"organizationId") ON DELETE RESTRICT;
ALTER TABLE workforce_records ADD FOREIGN KEY ("branchId","organizationId") REFERENCES branches(id,"organizationId") ON DELETE RESTRICT;
ALTER TABLE workforce_records ADD FOREIGN KEY ("taskId","organizationId") REFERENCES tasks(id,"organizationId") ON DELETE RESTRICT;
ALTER TABLE workforce_versions ADD FOREIGN KEY ("recordId","organizationId") REFERENCES workforce_records(id,"organizationId") ON DELETE RESTRICT;
ALTER TABLE workforce_versions ADD FOREIGN KEY ("actorId") REFERENCES accounts(id) ON DELETE RESTRICT;
ALTER TABLE workforce_versions ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) ON DELETE RESTRICT;
ALTER TABLE workforce_ledger ADD FOREIGN KEY ("employeeId","organizationId") REFERENCES employees(id,"organizationId") ON DELETE RESTRICT;
ALTER TABLE workforce_ledger ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) ON DELETE RESTRICT;
ALTER TABLE workforce_ledger ADD CONSTRAINT workforce_ledger_kind CHECK (kind IN ('GRANT','ADJUSTMENT','CARRY','DEBIT','REVERSAL') AND year BETWEEN 1900 AND 9999 AND (kind<>'DEBIT' OR days<0) AND (kind<>'REVERSAL' OR days>0) AND (kind<>'CARRY' OR days BETWEEN 0 AND 5));
ALTER TABLE workforce_receipts ADD FOREIGN KEY ("actorId") REFERENCES accounts(id) ON DELETE RESTRICT;
ALTER TABLE workforce_selfies ADD FOREIGN KEY ("attendanceId","organizationId") REFERENCES workforce_records(id,"organizationId") ON DELETE RESTRICT;
ALTER TABLE workforce_selfies ADD CONSTRAINT selfie_capture_expiry CHECK ("expiresAt"="capturedAt"+interval '90 days' AND ("purgedAt" IS NULL OR "purgedAt">="expiresAt" AND "noticeAt" IS NOT NULL AND "holdReason" IS NULL));

CREATE FUNCTION s17_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Workforce evidence is immutable'; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['workforce_versions','workforce_ledger','workforce_receipts'] LOOP EXECUTE format('CREATE TRIGGER s17_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION s17_immutable()',t); END LOOP; END $$;
CREATE FUNCTION s17_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Workforce history cannot be deleted'; END IF;
 IF NEW.id<>OLD.id OR NEW."organizationId"<>OLD."organizationId" OR NEW.kind<>OLD.kind OR NEW."employeeId" IS DISTINCT FROM OLD."employeeId" OR NEW."branchId" IS DISTINCT FROM OLD."branchId" OR NEW."taskId" IS DISTINCT FROM OLD."taskId" OR NEW."createdAt"<>OLD."createdAt" OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Invalid workforce head update'; END IF;
 IF NEW.kind IN ('POLICY','SCHEDULE','OVERRIDE','HOLIDAY','SITE','ALLOCATION') THEN RAISE EXCEPTION 'Effective workforce configuration/allocation is append-only'; END IF;
 IF NEW.kind='LEAVE' AND (NEW.data->'days' IS DISTINCT FROM OLD.data->'days' OR NEW.data->'levels' IS DISTINCT FROM OLD.data->'levels' OR NEW.data->'typeKey' IS DISTINCT FROM OLD.data->'typeKey' OR NEW.data->'policyId' IS DISTINCT FROM OLD.data->'policyId' OR NEW.data->'consumesBalance' IS DISTINCT FROM OLD.data->'consumesBalance' OR NEW.data->'emergency' IS DISTINCT FROM OLD.data->'emergency' OR NEW.data->'approvalLevel' IS DISTINCT FROM OLD.data->'approvalLevel') THEN RAISE EXCEPTION 'Leave original request and approval-level evidence is immutable'; END IF;
 IF NEW.kind='ATTENDANCE' AND (NEW.data->'date' IS DISTINCT FROM OLD.data->'date' OR NEW.data->'mode' IS DISTINCT FROM OLD.data->'mode' OR NEW.data->'siteId' IS DISTINCT FROM OLD.data->'siteId' OR NEW.data->'checkedInAt' IS DISTINCT FROM OLD.data->'checkedInAt' OR NEW.data->'schedule' IS DISTINCT FROM OLD.data->'schedule' OR NEW.data->'scheduledStartAt' IS DISTINCT FROM OLD.data->'scheduledStartAt' OR NEW.data->'scheduledEndAt' IS DISTINCT FROM OLD.data->'scheduledEndAt' OR NEW.data->'provisional' IS DISTINCT FROM OLD.data->'provisional' OR OLD.data->>'checkedOutAt' IS NOT NULL AND NEW.data->'checkedOutAt' IS DISTINCT FROM OLD.data->'checkedOutAt') THEN RAISE EXCEPTION 'Attendance original capture evidence is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s17_head_identity BEFORE UPDATE OR DELETE ON workforce_records FOR EACH ROW EXECUTE FUNCTION s17_identity_guard();
CREATE FUNCTION s17_version_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE e domain_events; a audit_events; r workforce_records; BEGIN
 SELECT * INTO e FROM domain_events WHERE id=NEW."eventId";
 SELECT * INTO a FROM audit_events WHERE id=(e.payload->>'auditEventId')::uuid;
 SELECT * INTO r FROM workforce_records WHERE id=NEW."recordId";
 IF e.id IS NULL OR a.id IS NULL OR r.id IS NULL OR e."eventName"<>'workforce.changed' OR e."subjectId"<>NEW."recordId" OR e."subjectType"<>'workforce_record' OR e."organizationId"<>NEW."organizationId" OR e."actorId"<>NEW."actorId" OR a."eventKey"<>e."eventName" OR a."subjectId"<>e."subjectId" OR a."actorId"<>e."actorId" OR a."organizationId"<>e."organizationId" OR a.after->>'kind'<>r.kind OR (a.after->>'version')::int<>NEW.version OR a.after->>'state'<>NEW.state OR a.after->'data' IS DISTINCT FROM NEW.data OR a.reason<>NEW.reason OR NOT EXISTS (SELECT 1 FROM outbox_deliveries WHERE "eventId"=e.id AND consumer='NTF') THEN RAISE EXCEPTION 'Workforce version requires exact audit/event/outbox'; END IF;
 IF NEW.version>1 AND NOT EXISTS (SELECT 1 FROM workforce_versions WHERE "recordId"=NEW."recordId" AND version=NEW.version-1) THEN RAISE EXCEPTION 'Workforce version sequence missing'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s17_version_evidence AFTER INSERT ON workforce_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s17_version_evidence();
CREATE FUNCTION s17_head_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r workforce_records; BEGIN
 SELECT * INTO r FROM workforce_records WHERE id=NEW.id;
 IF NOT EXISTS (SELECT 1 FROM workforce_versions v WHERE v."recordId"=r.id AND v."organizationId"=r."organizationId" AND v.version=r.version AND v.state=r.state AND v.data=r.data) OR EXISTS (SELECT 1 FROM workforce_versions v WHERE v."recordId"=r.id AND v.version>r.version) THEN RAISE EXCEPTION 'Workforce head lacks exact immutable version'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s17_head_evidence AFTER INSERT OR UPDATE ON workforce_records DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s17_head_evidence();
CREATE FUNCTION s17_ledger_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE e domain_events; a audit_events; r workforce_records; day jsonb; BEGIN
 SELECT * INTO e FROM domain_events WHERE id=NEW."eventId"; SELECT * INTO a FROM audit_events WHERE id=(e.payload->>'auditEventId')::uuid;
 IF e.id IS NULL OR a.id IS NULL OR e."organizationId"<>NEW."organizationId" OR a."eventKey"<>e."eventName" OR a."subjectId"<>e."subjectId" OR a."actorId"<>e."actorId" OR a."organizationId"<>e."organizationId" OR NOT EXISTS (SELECT 1 FROM outbox_deliveries WHERE "eventId"=e.id AND consumer='NTF') THEN RAISE EXCEPTION 'Workforce ledger requires canonical evidence'; END IF;
 IF NEW.kind IN ('GRANT','ADJUSTMENT','CARRY') THEN
  IF e."eventName"<>'workforce.credited' OR e."subjectId"<>NEW."employeeId" OR (a.after->>'year')::int<>NEW.year OR (a.after->>'days')::numeric<>NEW.days THEN RAISE EXCEPTION 'Entitlement calculation evidence mismatch'; END IF;
 ELSE
  SELECT * INTO r FROM workforce_records WHERE id=(NEW.data->>'recordId')::uuid;
  SELECT d INTO day FROM jsonb_array_elements(a.after->'data'->'days') d WHERE d->>'date'=NEW.data->>'date';
  IF r.id IS NULL OR r.kind<>'LEAVE' OR r."employeeId"<>NEW."employeeId" OR r."organizationId"<>NEW."organizationId" OR e."eventName"<>'workforce.changed' OR e."subjectId"<>r.id OR a.after->>'state'<>'APPROVED' OR day IS NULL OR NEW.year<>left(day->>'date',4)::int OR NEW.days<>((day->>'days')::numeric * CASE WHEN NEW.kind='DEBIT' THEN -1 ELSE 1 END) OR NOT (a.after->'data'->>'consumesBalance')::boolean THEN RAISE EXCEPTION 'Leave ledger lacks exact approved day evidence'; END IF;
  IF NEW.kind='REVERSAL' AND (NOT (a.after->'data'->'cancelledDates' ? (day->>'date')) OR NOT EXISTS (SELECT 1 FROM workforce_ledger l WHERE l."employeeId"=NEW."employeeId" AND l.kind='DEBIT' AND l.data->>'recordId'=r.id::text AND l.data->>'date'=day->>'date')) THEN RAISE EXCEPTION 'Reversal lacks original debit and cancellation'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s17_ledger_evidence AFTER INSERT ON workforce_ledger DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s17_ledger_evidence();
CREATE FUNCTION s17_selfie_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Selfie deletion proof metadata must remain'; END IF;
 IF NEW.id<>OLD.id OR NEW."organizationId"<>OLD."organizationId" OR NEW."attendanceId"<>OLD."attendanceId" OR NEW."storageKey"<>OLD."storageKey" OR NEW.checksum<>OLD.checksum OR NEW.mime<>OLD.mime OR NEW."capturedAt"<>OLD."capturedAt" OR NEW."expiresAt"<>OLD."expiresAt" OR OLD."purgedAt" IS NOT NULL OR OLD."noticeAt" IS NOT NULL AND NEW."noticeAt" IS DISTINCT FROM OLD."noticeAt" THEN RAISE EXCEPTION 'Selfie immutable capture/expiry identity'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER s17_selfie_identity BEFORE UPDATE OR DELETE ON workforce_selfies FOR EACH ROW EXECUTE FUNCTION s17_selfie_identity();

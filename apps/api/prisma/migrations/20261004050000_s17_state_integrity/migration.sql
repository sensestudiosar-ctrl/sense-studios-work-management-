CREATE FUNCTION s17_leave_state_integrity() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r workforce_records; d jsonb; request_id uuid; approved_id uuid; BEGIN
 SELECT * INTO r FROM workforce_records WHERE id=NEW.id;
 IF r.kind<>'LEAVE' THEN RETURN NEW; END IF; d=r.data;
 IF r.state NOT IN ('PENDING','REJECTED','APPROVED','CANCEL_PENDING') THEN RAISE EXCEPTION 'Invalid leave state'; END IF;
 IF r.state IN ('APPROVED','CANCEL_PENDING') THEN
  approved_id=(d->>'approvalRequestId')::uuid;
  IF NOT EXISTS(SELECT 1 FROM approval_requests q JOIN approval_decisions a ON a."requestId"=q.id WHERE q.id=approved_id AND q."organizationId"=r."organizationId" AND q."sourceId"=r.id::text AND q."typeKey"='workforce.leave' AND q.state='APPROVED' AND a.outcome='APPROVED' AND q."approvalLevel"=d->'levels'->>(jsonb_array_length(d->'levels')-1)) THEN RAISE EXCEPTION 'Approved leave requires final exact shared approval'; END IF;
 END IF;
 IF r.state='CANCEL_PENDING' THEN
  request_id=(d->>'cancellationRequestId')::uuid;
  IF NOT EXISTS(SELECT 1 FROM approval_requests q WHERE q.id=request_id AND q."organizationId"=r."organizationId" AND q."sourceId"=r.id::text AND q."typeKey"='workforce.leave_cancel' AND q.state='PENDING' AND q."approvalLevel"=d->'levels'->>((d->>'levelIndex')::int)) THEN RAISE EXCEPTION 'Cancellation must retain same-level pending approval'; END IF;
 END IF;
 IF jsonb_array_length(d->'cancelledDates')>0 AND NOT EXISTS(SELECT 1 FROM approval_requests q JOIN approval_decisions a ON a."requestId"=q.id WHERE q.id=(d->>'cancellationRequestId')::uuid AND q."sourceId"=r.id::text AND q."typeKey"='workforce.leave_cancel' AND q.state='APPROVED' AND a.outcome='APPROVED' AND q."approvalLevel"=d->'levels'->>(jsonb_array_length(d->'levels')-1)) THEN RAISE EXCEPTION 'Cancelled leave requires separate final same-level approval'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s17_leave_state_integrity AFTER INSERT OR UPDATE ON workforce_records DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s17_leave_state_integrity();
CREATE FUNCTION s17_selfie_capture_integrity() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r workforce_records; BEGIN
 SELECT * INTO r FROM workforce_records WHERE id=NEW."attendanceId";
 IF r.kind<>'ATTENDANCE' OR r.data->>'mode'<>'SITE' OR (r.data->>'checkedInAt')::timestamptz<>NEW."capturedAt" OR NEW.mime<>'image/jpeg' THEN RAISE EXCEPTION 'Selfie must bind exact site check-in capture'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s17_selfie_capture AFTER INSERT ON workforce_selfies DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s17_selfie_capture_integrity();

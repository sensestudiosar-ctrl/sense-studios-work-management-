CREATE OR REPLACE FUNCTION s17_leave_state_integrity() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r workforce_records; d jsonb; request_id uuid; approved_id uuid; BEGIN
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
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'cancelledDates') cancelled_date WHERE NOT EXISTS(SELECT 1 FROM workforce_versions v JOIN approval_requests q ON q.id=(v.data->>'cancellationRequestId')::uuid JOIN approval_decisions a ON a."requestId"=q.id WHERE v."recordId"=r.id AND v.state='APPROVED' AND v.data->'cancelledDates' ? cancelled_date AND q."sourceId"=r.id::text AND q."typeKey"='workforce.leave_cancel' AND q.state='APPROVED' AND a.outcome='APPROVED' AND q."approvalLevel"=d->'levels'->>(jsonb_array_length(d->'levels')-1))) THEN RAISE EXCEPTION 'Each cancelled portion requires its historical same-level approval'; END IF;
 IF (d->>'consumesBalance')::boolean AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'cancelledDates') cancelled_date WHERE NOT EXISTS(SELECT 1 FROM workforce_ledger l WHERE l.kind='REVERSAL' AND l."employeeId"=r."employeeId" AND l.data->>'recordId'=r.id::text AND l.data->>'date'=cancelled_date)) THEN RAISE EXCEPTION 'Cancelled paid portion requires exact reversal ledger'; END IF;
 RETURN NEW;
END $$;

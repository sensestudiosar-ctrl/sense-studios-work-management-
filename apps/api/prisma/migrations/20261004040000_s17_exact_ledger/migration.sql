CREATE FUNCTION s17_exact_ledger_guard() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE e domain_events; a audit_events; d jsonb; expected jsonb; BEGIN
 SELECT * INTO e FROM domain_events WHERE id=NEW."eventId"; SELECT * INTO a FROM audit_events WHERE id=(e.payload->>'auditEventId')::uuid;
 IF NEW.kind IN ('GRANT','ADJUSTMENT','CARRY') THEN expected=a.after->'exactDays'; ELSE
 SELECT day INTO d FROM jsonb_array_elements(a.after->'data'->'days') day WHERE day->>'date'=NEW.data->>'date';
 expected=d->'exactDays';
 IF NEW.kind='DEBIT' THEN expected=jsonb_build_object('numerator',(-((expected->>'numerator')::numeric))::text,'denominator',expected->>'denominator'); END IF;
 END IF;
 IF NEW.data->'exactDays' IS DISTINCT FROM expected OR (expected->>'denominator')::numeric<=0 OR round((expected->>'numerator')::numeric/(expected->>'denominator')::numeric,9)<>NEW.days THEN RAISE EXCEPTION 'Exact entitlement/leave rational evidence mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s17_exact_ledger AFTER INSERT ON workforce_ledger DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s17_exact_ledger_guard();

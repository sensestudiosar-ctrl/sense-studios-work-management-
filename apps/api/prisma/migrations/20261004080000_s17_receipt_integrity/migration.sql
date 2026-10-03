CREATE FUNCTION s17_receipt_integrity() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r workforce_records; v workforce_versions; BEGIN
 SELECT * INTO r FROM workforce_records WHERE id=(NEW.result->>'id')::uuid;
 IF r.id IS NULL OR r."organizationId"<>NEW."organizationId" OR (NEW.result ? 'employeeId' AND NEW.result->>'employeeId' IS DISTINCT FROM r."employeeId"::text) OR (NEW.result ? 'taskId' AND NEW.result->>'taskId' IS DISTINCT FROM r."taskId"::text) THEN RAISE EXCEPTION 'Command receipt subject is not canonical'; END IF;
 SELECT * INTO v FROM workforce_versions WHERE "recordId"=r.id AND "actorId"=NEW."actorId" AND (NOT (NEW.result ? 'version') OR version=(NEW.result->>'version')::int) ORDER BY version DESC LIMIT 1;
 IF v.id IS NULL OR (NEW.result ? 'data' AND NEW.result->'data' IS DISTINCT FROM v.data) OR (NEW.result ? 'state' AND NEW.result->>'state' IS DISTINCT FROM v.state) THEN RAISE EXCEPTION 'Command receipt result lacks exact actor/version snapshot'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s17_receipt_integrity AFTER INSERT ON workforce_receipts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s17_receipt_integrity();

-- Keep delivery claims and outcomes bound to durable lease/attempt evidence.
CREATE FUNCTION s16_delivery_state_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'PENDING' OR NEW.attempts<>0 OR NEW."leaseToken" IS NOT NULL OR NEW."leaseUntil" IS NOT NULL OR NEW."deliveredAt" IS NOT NULL OR NEW."lastError" IS NOT NULL THEN RAISE EXCEPTION 'Initial accounting delivery must be pending'; END IF;
 ELSE
  IF NEW.state='SENDING' THEN
   IF OLD.state='DELIVERED' OR OLD."leaseUntil">clock_timestamp() OR NEW.attempts<>OLD.attempts+1 OR NEW."leaseToken" IS NULL OR NEW."leaseToken" IS NOT DISTINCT FROM OLD."leaseToken" OR NEW."leaseUntil" IS NULL OR NEW."leaseUntil"<=clock_timestamp() OR NEW."deliveredAt" IS NOT NULL OR NEW."lastError" IS NOT NULL THEN RAISE EXCEPTION 'Valid accounting lease claim required'; END IF;
  ELSIF NEW.state IN ('DELIVERED','FAILED') THEN
   IF OLD.state<>'SENDING' OR OLD."leaseToken" IS NULL OR NEW.attempts<>OLD.attempts OR NEW."leaseToken" IS NOT NULL OR NEW."leaseUntil" IS NOT NULL OR (NEW.state='DELIVERED')<>(NEW."deliveredAt" IS NOT NULL) OR (NEW.state='FAILED')<>(NEW."lastError" IS NOT NULL) THEN RAISE EXCEPTION 'Accounting outcome requires claimed lease'; END IF;
  ELSE RAISE EXCEPTION 'Invalid accounting delivery state transition';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s16_delivery_state BEFORE INSERT OR UPDATE ON time_accounting_deliveries FOR EACH ROW EXECUTE FUNCTION s16_delivery_state_guard();

CREATE FUNCTION s16_delivery_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.state IN ('DELIVERED','FAILED') AND NOT EXISTS(SELECT 1 FROM time_accounting_attempts WHERE "deliveryId"=NEW.id AND "leaseToken"=OLD."leaseToken" AND outcome=NEW.state) THEN RAISE EXCEPTION 'Accounting outcome attempt required'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s16_delivery_attempt AFTER UPDATE ON time_accounting_deliveries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s16_delivery_attempt_guard();
ALTER TABLE time_accounting_attempts ADD CONSTRAINT s16_attempt_outcome CHECK (outcome IN ('FAILED','DELIVERED'));
CREATE UNIQUE INDEX time_accounting_attempts_delivery_lease_key ON time_accounting_attempts ("deliveryId","leaseToken");

-- Preserve the full prior event allowlist and add only the two S26 canonical producer events.
DO $$ DECLARE prior_expression text;
BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO prior_expression FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF prior_expression IS NULL THEN RAISE EXCEPTION 'Existing domain event catalogue required'; END IF;
 ALTER TABLE domain_events DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE format('ALTER TABLE domain_events ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName" IN (''automation.record_changed'',''automation.run_created''))',prior_expression);
END $$;

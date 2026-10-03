DO $$ DECLARE prior text; BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO prior FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF prior IS NULL THEN RAISE EXCEPTION 'Canonical event catalogue constraint missing'; END IF;
 ALTER TABLE domain_events DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE format('ALTER TABLE domain_events ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName" IN (''workforce.changed'',''workforce.credited''))',prior);
END $$;
GRANT SELECT,INSERT,UPDATE,DELETE ON workforce_records,workforce_versions,workforce_receipts,workforce_ledger,workforce_selfies TO sense_app_runtime;

DO $$
DECLARE previous_definition TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO previous_definition FROM pg_constraint
    WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
  IF previous_definition IS NULL OR left(previous_definition, 6) <> 'CHECK ' THEN
    RAISE EXCEPTION 'Expected domain event catalogue constraint is unavailable';
  END IF;
  ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
  EXECUTE 'ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" ' ||
    left(previous_definition, length(previous_definition)-1) ||
    ' OR "eventName" = ''document.upload_aborted'')';
END $$;

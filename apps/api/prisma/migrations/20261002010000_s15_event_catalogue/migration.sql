-- Add only the canonical S15 event names while retaining the full prior catalogue.
-- The already-applied S15 records migration remains unchanged.
DO $$
DECLARE prior_expression TEXT;
BEGIN
  SELECT pg_get_expr(conbin, conrelid) INTO prior_expression
  FROM pg_constraint
  WHERE conrelid = 'domain_events'::regclass
    AND conname = 'domain_events_eventName_catalogue_check'
    AND contype = 'c';
  IF prior_expression IS NULL THEN
    RAISE EXCEPTION 'Existing domain event catalogue constraint is required';
  END IF;
  ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
  EXECUTE format(
    'ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName" IN (''gallery.entry_added'', ''portfolio.prepared'', ''portfolio.published'', ''portfolio.withdrawn''))',
    prior_expression
  );
END $$;

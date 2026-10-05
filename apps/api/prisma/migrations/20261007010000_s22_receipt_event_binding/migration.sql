-- One canonical SITE mutation supplies exactly one offline receipt.
-- Forward migration preserves the already applied S22 definition and all rows.
ALTER TABLE site_command_receipts ADD CONSTRAINT site_command_receipts_eventId_key UNIQUE("eventId");

-- Each retained grant must end after the actual cancellation transition, including lock waits.
CREATE OR REPLACE FUNCTION "check_s14_cancel_client_expiry"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."status"='CANCELLED' AND OLD."status"<>'CANCELLED' AND EXISTS(SELECT 1 FROM "client_portal_grants" WHERE "projectId"=NEW."id" AND "revokedAt" IS NULL AND ("expiresAt" IS NULL OR "expiresAt"<=clock_timestamp())) THEN RAISE EXCEPTION 'Owner must set a future end date for every retained client grant'; END IF;
 RETURN NEW;
END $$;


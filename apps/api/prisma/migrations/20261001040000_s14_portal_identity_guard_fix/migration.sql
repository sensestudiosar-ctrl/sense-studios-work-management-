-- PL/pgSQL resolves NEW fields for each relation before boolean short-circuiting.
-- Only ceremonies have sessionId, so isolate that access in its own branch.
CREATE OR REPLACE FUNCTION "check_s14_session_identity"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account_kind TEXT;
BEGIN
 SELECT "kind"::text INTO account_kind FROM "accounts" WHERE "id"=NEW."accountId";
 IF TG_TABLE_NAME='sessions' AND account_kind='CLIENT' THEN RAISE EXCEPTION 'Client identities require portal sessions'; END IF;
 IF TG_TABLE_NAME<>'sessions' AND account_kind IS DISTINCT FROM 'CLIENT' THEN RAISE EXCEPTION 'Portal identity must be a client'; END IF;
 IF TG_TABLE_NAME='client_portal_ceremonies' THEN
  IF NOT EXISTS(SELECT 1 FROM "client_portal_sessions" s WHERE s."id"=NEW."sessionId" AND s."accountId"=NEW."accountId") THEN RAISE EXCEPTION 'Portal ceremony requires the same account session'; END IF;
 END IF;
 RETURN NEW;
END $$;

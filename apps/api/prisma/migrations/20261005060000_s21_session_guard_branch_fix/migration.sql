-- S21 explicitly allows only internal account kinds for staff sessions while
-- retaining S14's table-specific NEW-record branching (sessionId is ceremony-only).
CREATE OR REPLACE FUNCTION check_s14_session_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account_kind text;
BEGIN
 SELECT kind::text INTO account_kind FROM accounts WHERE id=NEW."accountId";
 IF TG_TABLE_NAME='sessions' THEN
  IF account_kind IS NULL OR account_kind NOT IN('OWNER','STAFF') THEN RAISE EXCEPTION 'Internal sessions require internal identity'; END IF;
 ELSE
  IF account_kind IS DISTINCT FROM 'CLIENT' THEN RAISE EXCEPTION 'Client portal identity required'; END IF;
  IF TG_TABLE_NAME='client_portal_ceremonies' THEN
   IF NOT EXISTS(SELECT 1 FROM client_portal_sessions WHERE id=NEW."sessionId" AND "accountId"=NEW."accountId") THEN RAISE EXCEPTION 'Same client session required'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE TABLE integration_calendar_events (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "creatorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, "projectId" uuid REFERENCES projects(id) ON DELETE RESTRICT,
 kind varchar(20) NOT NULL CHECK(kind IN ('MEETING','SITE_VISIT')), "startAt" timestamptz(3) NOT NULL, "endAt" timestamptz(3) NOT NULL,
 state varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('ACTIVE','CANCELLED')), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK("endAt">"startAt"), UNIQUE(id,"organizationId")
);
CREATE INDEX integration_calendar_events_scope ON integration_calendar_events("organizationId","creatorId","projectId");
CREATE TABLE integration_calendar_history (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "calendarEventId" uuid NOT NULL, version integer NOT NULL CHECK(version>0), "actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 reason varchar(1000) NOT NULL CHECK(length(trim(reason))>=3), data jsonb NOT NULL, "eventId" uuid NOT NULL UNIQUE REFERENCES domain_events(id) ON DELETE RESTRICT,
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("calendarEventId",version),
 FOREIGN KEY("calendarEventId","organizationId") REFERENCES integration_calendar_events(id,"organizationId") ON DELETE RESTRICT
);
CREATE TABLE integration_subscriptions (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "accountId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, "tokenHash" char(64) NOT NULL UNIQUE,
 "revokedAt" timestamptz(3), "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX integration_subscriptions_account ON integration_subscriptions("accountId","revokedAt");
CREATE TABLE integration_receipts (
 id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "actorId" uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, "commandId" uuid NOT NULL,
 operation varchar(40) NOT NULL, "payloadHash" char(64) NOT NULL, result jsonb NOT NULL,
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("actorId","commandId")
);
CREATE FUNCTION s25_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'S25 evidence is append-only'; END $$;
CREATE TRIGGER s25_calendar_history_immutable BEFORE UPDATE OR DELETE ON integration_calendar_history FOR EACH ROW EXECUTE FUNCTION s25_immutable();
CREATE TRIGGER s25_receipt_immutable BEFORE UPDATE OR DELETE ON integration_receipts FOR EACH ROW EXECUTE FUNCTION s25_immutable();
CREATE FUNCTION s25_calendar_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."projectId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW."projectId" AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'S25 project organization mismatch'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id,NEW."organizationId",NEW."creatorId",NEW."projectId",NEW.kind,NEW."createdAt") IS DISTINCT FROM (OLD.id,OLD."organizationId",OLD."creatorId",OLD."projectId",OLD.kind,OLD."createdAt") THEN RAISE EXCEPTION 'S25 calendar identity is immutable'; END IF;
 IF TG_OP='UPDATE' AND (NEW.version<>OLD.version+1 OR OLD.state='CANCELLED') THEN RAISE EXCEPTION 'S25 invalid calendar transition'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s25_calendar_scope BEFORE INSERT OR UPDATE ON integration_calendar_events FOR EACH ROW EXECUTE FUNCTION s25_calendar_scope();
CREATE FUNCTION s25_calendar_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE h integration_calendar_history; e domain_events; a audit_events;
BEGIN
 SELECT * INTO h FROM integration_calendar_history WHERE "calendarEventId"=NEW.id AND version=NEW.version;
 SELECT * INTO e FROM domain_events WHERE id=h."eventId";
 SELECT * INTO a FROM audit_events WHERE id=(e.payload->>'auditEventId')::uuid;
 IF h.id IS NULL OR e."subjectType" IS DISTINCT FROM 'integration_calendar_event' OR e."subjectId" IS DISTINCT FROM NEW.id::text OR e."organizationId" IS DISTINCT FROM NEW."organizationId" OR e."actorId" IS DISTINCT FROM h."actorId" OR a."subjectId" IS DISTINCT FROM NEW.id::text OR a."subjectType" IS DISTINCT FROM 'integration_calendar_event' OR a."actorId" IS DISTINCT FROM h."actorId" OR a.reason IS DISTINCT FROM h.reason OR a.after IS DISTINCT FROM h.data OR h.data->>'state' IS DISTINCT FROM NEW.state OR (h.data->>'startAt')::timestamptz IS DISTINCT FROM NEW."startAt" OR (h.data->>'endAt')::timestamptz IS DISTINCT FROM NEW."endAt" OR (h.data->>'version')::integer IS DISTINCT FROM NEW.version THEN RAISE EXCEPTION 'S25 calendar evidence mismatch'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s25_calendar_evidence AFTER INSERT OR UPDATE ON integration_calendar_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s25_calendar_evidence();

CREATE TRIGGER s25_calendar_no_delete BEFORE DELETE ON integration_calendar_events FOR EACH ROW EXECUTE FUNCTION s25_immutable();
DO $$ DECLARE prior_expression text;
BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO prior_expression FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF prior_expression IS NULL THEN RAISE EXCEPTION 'Existing domain event catalogue required'; END IF;
 ALTER TABLE domain_events DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE format('ALTER TABLE domain_events ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName" IN (''integration.calendar_changed'',''integration.subscription_changed''))',prior_expression);
END $$;
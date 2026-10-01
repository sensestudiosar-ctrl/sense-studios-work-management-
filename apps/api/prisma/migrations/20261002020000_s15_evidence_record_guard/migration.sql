-- Preserve all S15 evidence requirements; avoid resolving grant-only fields for other records.
CREATE OR REPLACE FUNCTION s15_canonical_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_event TEXT; actor UUID; evidence UUID; subject_id TEXT; expected_reason TEXT; expected_subject TEXT;
BEGIN
 IF TG_TABLE_NAME='publication_grants' THEN subject_id:=NEW."publicationId"::text; ELSE subject_id:=NEW."id"::text; END IF;
 expected_subject:=CASE WHEN TG_TABLE_NAME='gallery_entries' THEN 'gallery_entry' ELSE 'portfolio_publication' END;
 IF TG_TABLE_NAME='gallery_entries' THEN expected_event:='gallery.entry_added'; actor:=NEW."createdById";
 ELSIF TG_TABLE_NAME='portfolio_publications' AND TG_OP='INSERT' THEN expected_event:='portfolio.prepared'; actor:=NEW."createdById";
 ELSIF TG_TABLE_NAME='portfolio_publications' THEN
  expected_event:=CASE WHEN NEW."state"='PUBLISHED' THEN 'portfolio.published' ELSE 'portfolio.withdrawn' END;
  SELECT "actorId","eventId","reason" INTO actor,evidence,expected_reason FROM "publication_grants" WHERE "publicationId"=NEW."id" AND "toVersion"=NEW."version" AND "action"::text=NEW."state"::text;
 ELSE
  expected_event:=CASE WHEN NEW."action"='PUBLISHED' THEN 'portfolio.published' ELSE 'portfolio.withdrawn' END; actor:=NEW."actorId"; evidence:=NEW."eventId";
 END IF;
 IF expected_reason IS NULL THEN expected_reason:=NEW."reason"; END IF;
 IF TG_TABLE_NAME='publication_grants' THEN
  -- Resolve grant-only NEW fields only for the grant trigger's record type.
  IF NOT EXISTS(SELECT 1 FROM "portfolio_publications" WHERE "id"=NEW."publicationId" AND "version"=NEW."toVersion" AND "state"::text=NEW."action"::text) THEN
   RAISE EXCEPTION 'Grant must match current publication transition';
  END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM "accounts" WHERE "id"=actor AND "kind"='OWNER' AND "state"='ACTIVE') THEN RAISE EXCEPTION 'Owner authority required for S15'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM "domain_events" e JOIN "audit_events" a ON a."id"=(e."payload"->>'auditEventId')::uuid
  JOIN "outbox_deliveries" o ON o."eventId"=e."id"
  WHERE e."eventName"=expected_event AND e."organizationId"=NEW."organizationId" AND e."actorId"=actor
  AND e."subjectId"=subject_id
  AND e."subjectType"=expected_subject AND (evidence IS NULL OR e."id"=evidence)
  AND a."eventKey"=expected_event AND a."actorId"=actor AND a."organizationId"=NEW."organizationId"
  AND a."subjectType"=expected_subject AND a."subjectId"=subject_id
  AND a."reason"=expected_reason AND a."after"->>'projectId'=NEW."projectId"::text
 ) THEN RAISE EXCEPTION 'S15 canonical audit/event/outbox evidence required'; END IF;
 RETURN NEW;
END $$;

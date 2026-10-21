ALTER TABLE "drawing_transmittals" ADD CONSTRAINT "transmittal_close_clock_pair" CHECK (("projectClosedAt" IS NULL)=("retainUntil" IS NULL));
ALTER TABLE "file_retention_records" ADD CONSTRAINT "file_close_clock_pair" CHECK (("projectClosedAt" IS NULL)=("retainUntil" IS NULL));
CREATE FUNCTION "check_s12_internal_approval_actor"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE audit_row "audit_events"%ROWTYPE;
BEGIN
 IF NEW."toState"<>'APPROVED' THEN RETURN NULL; END IF;
 SELECT a.* INTO audit_row FROM "domain_events" e JOIN "audit_events" a ON a."id"::text=e."payload"->>'auditEventId' WHERE e."id"=NEW."eventId";
 IF NOT EXISTS(SELECT 1 FROM "revision_approval_facts" f JOIN "audit_events" source ON source."id"=f."auditEventId" WHERE f."revisionId"=NEW."revisionId" AND f."kind"='INTERNAL' AND source."actorId"=NEW."actorId" AND audit_row."after"->>'sourceAuditEventId'=source."id"::text) THEN RAISE EXCEPTION 'Approved transition must use exact internal decision actor and evidence'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "revision_approval_actor_evidence" AFTER INSERT ON "revision_state_changes" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s12_internal_approval_actor"();
CREATE FUNCTION "check_s12_transmittal_close_clock"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."projectClosedAt" IS NOT NULL AND NEW."projectClosedAt" IS DISTINCT FROM (SELECT min("occurredAt") FROM "project_status_changes" WHERE "projectId"=NEW."projectId" AND "toStatus" IN ('COMPLETED','CANCELLED')) THEN RAISE EXCEPTION 'Transmittal must retain first actual project close clock'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "transmittal_first_close_clock" BEFORE INSERT OR UPDATE ON "drawing_transmittals" FOR EACH ROW EXECUTE FUNCTION "check_s12_transmittal_close_clock"();

-- Forward-only alignment with the existing S05 lowercase type-key contract; migration107 is retained unchanged.
CREATE OR REPLACE FUNCTION s26_canonical() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e domain_events; a audit_events; expected text; subject uuid;
BEGIN
 SELECT * INTO e FROM domain_events WHERE id=NEW."eventId";
 SELECT * INTO a FROM audit_events WHERE id=(e.payload->>'auditEventId')::uuid;
 expected:=CASE WHEN TG_TABLE_NAME='automation_versions' THEN 'automation.record_changed' ELSE 'automation.run_created' END;
 subject:=CASE WHEN TG_TABLE_NAME='automation_versions' THEN (to_jsonb(NEW)->>'recordId')::uuid ELSE NEW.id END;
 IF e.id IS NULL OR a.id IS NULL OR e."eventName" IS DISTINCT FROM expected OR a."eventKey" IS DISTINCT FROM expected OR e."organizationId" IS DISTINCT FROM NEW."organizationId" OR a."organizationId" IS DISTINCT FROM NEW."organizationId" OR e."subjectId"::text IS DISTINCT FROM subject::text OR a."subjectId"::text IS DISTINCT FROM subject::text OR a."actorId" IS DISTINCT FROM e."actorId" OR a."correlationId" IS DISTINCT FROM e."correlationId" OR NOT EXISTS(SELECT 1 FROM outbox_deliveries WHERE "eventId"=e.id AND consumer='NTF') THEN RAISE EXCEPTION 'S26 canonical evidence mismatch'; END IF;
 IF TG_TABLE_NAME='automation_versions' THEN
  IF a.after->'data' IS DISTINCT FROM NEW.data OR (a.after->>'version')::integer IS DISTINCT FROM NEW.version OR (a.after->>'enabled')::boolean IS DISTINCT FROM NEW.enabled OR a.reason IS DISTINCT FROM NEW.reason OR e."actorId" IS DISTINCT FROM NEW."actorId" OR NOT EXISTS(SELECT 1 FROM automation_records r WHERE r.id=NEW."recordId" AND r."organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'S26 version evidence mismatch'; END IF;
 ELSE
  IF a.after->>'dataHash' IS DISTINCT FROM encode(sha256(convert_to(NEW.data::text,'UTF8')),'hex') OR a.after->>'sourceEventId' IS DISTINCT FROM NEW."sourceEventId"::text OR a.after->>'status' IS DISTINCT FROM NEW.status OR a.after->>'recipientId' IS DISTINCT FROM NEW."recipientId"::text OR NOT EXISTS(SELECT 1 FROM automation_versions v JOIN automation_records r ON r.id=v."recordId" JOIN domain_events s ON s.id=NEW."sourceEventId" WHERE r.id=NEW."ruleId" AND r.kind='RULE' AND v.version=NEW."ruleVersion" AND v."organizationId"=NEW."organizationId" AND s."organizationId"=NEW."organizationId" AND s."occurredAt">=v."createdAt" AND v.enabled AND v.data->'eventNames' ? s."eventName") THEN RAISE EXCEPTION 'S26 run source/evidence mismatch'; END IF;
  IF NEW."approvalRequestId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM approval_requests p WHERE p.id=NEW."approvalRequestId" AND p."organizationId"=NEW."organizationId" AND p."sourceId"=NEW.id::text AND p."typeKey"='automation.recommendation') THEN RAISE EXCEPTION 'S26 approval identity mismatch'; END IF;
 END IF;
 RETURN NULL;
END $$;


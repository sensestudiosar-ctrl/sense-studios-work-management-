CREATE OR REPLACE FUNCTION s24_scheduled_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e domain_events; a audit_events; r dashboard_rules; p personal_reminders;
BEGIN
 SELECT * INTO e FROM domain_events WHERE id=NEW."eventId";
 SELECT * INTO a FROM audit_events WHERE id=(e.payload->>'auditEventId')::uuid;
 IF TG_TABLE_NAME='personal_reminders' THEN
  IF e."subjectType" IS DISTINCT FROM 'personal_reminder' OR a."subjectType" IS DISTINCT FROM 'personal_reminder' OR a.reason IS DISTINCT FROM NEW.reason OR a.after->>'title' IS DISTINCT FROM NEW.title OR (a.after->>'dueAt')::timestamptz IS DISTINCT FROM NEW."dueAt" THEN RAISE EXCEPTION 'S24 personal reminder evidence mismatch'; END IF;
 ELSE
  IF e."subjectType" IS DISTINCT FROM 'dashboard_run' OR a."subjectType" IS DISTINCT FROM 'dashboard_run' OR a.after->>'sourceId' IS DISTINCT FROM NEW."sourceId"::text OR a.after->>'recipientId' IS DISTINCT FROM NEW."recipientId"::text OR a.after->>'slot' IS DISTINCT FROM NEW.slot OR a.after->>'manifestHash' IS DISTINCT FROM encode(sha256(convert_to(NEW.manifest::text,'UTF8')),'hex') OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=e."actorId" AND kind='OWNER' AND state='ACTIVE') THEN RAISE EXCEPTION 'S24 generated evidence mismatch'; END IF;
  SELECT * INTO r FROM dashboard_rules WHERE id=NEW."sourceId";
  SELECT * INTO p FROM personal_reminders WHERE id=NEW."sourceId";
  IF r.id IS NULL AND p.id IS NULL OR r.id IS NOT NULL AND (r."organizationId"<>NEW."organizationId" OR NOT r.enabled OR (NEW.manifest->>'ruleVersion')::integer IS DISTINCT FROM r.version) OR p.id IS NOT NULL AND (p."organizationId"<>NEW."organizationId" OR p."creatorId"<>NEW."recipientId" OR NEW.slot<>'personal') THEN RAISE EXCEPTION 'S24 generated source mismatch'; END IF;
 END IF;
 RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION s24_canonical() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a audit_events; e domain_events; expected text; subject uuid; actor uuid; org uuid;
BEGIN
 SELECT * INTO e FROM domain_events WHERE id=NEW."eventId";
 SELECT * INTO a FROM audit_events WHERE id=(e.payload->>'auditEventId')::uuid;
 expected:=CASE TG_TABLE_NAME WHEN 'report_snapshots' THEN 'report.finalized' WHEN 'dashboard_rule_versions' THEN 'dashboard.rule_changed' WHEN 'personal_reminders' THEN 'dashboard.reminder_created' ELSE 'dashboard.delivered' END;
 subject:=CASE WHEN TG_TABLE_NAME='dashboard_rule_versions' THEN (to_jsonb(NEW)->>'ruleId')::uuid ELSE NEW.id END;
 actor:=CASE WHEN TG_TABLE_NAME='dashboard_rule_versions' THEN (to_jsonb(NEW)->>'actorId')::uuid WHEN TG_TABLE_NAME='dashboard_runs' THEN e."actorId" ELSE (to_jsonb(NEW)->>'creatorId')::uuid END;
 org:=NEW."organizationId";
 IF e.id IS NULL OR a.id IS NULL OR e."eventName" IS DISTINCT FROM expected OR a."eventKey" IS DISTINCT FROM expected OR e."organizationId" IS DISTINCT FROM org OR a."organizationId" IS DISTINCT FROM org OR e."subjectId"::text IS DISTINCT FROM subject::text OR a."subjectId"::text IS DISTINCT FROM subject::text OR e."actorId" IS DISTINCT FROM actor OR a."actorId" IS DISTINCT FROM actor OR a."correlationId" IS DISTINCT FROM e."correlationId" OR NOT EXISTS(SELECT 1 FROM outbox_deliveries WHERE "eventId"=e.id AND consumer='NTF') THEN RAISE EXCEPTION 'S24 canonical evidence mismatch'; END IF;
 IF TG_TABLE_NAME='report_snapshots' THEN
  IF a.after->>'category' IS DISTINCT FROM NEW.category OR a.after->>'tableHash' IS DISTINCT FROM encode(sha256(convert_to(NEW."table"::text,'UTF8')),'hex') OR a.after->>'manifestHash' IS DISTINCT FROM encode(sha256(convert_to(NEW.manifest::text,'UTF8')),'hex') OR a.reason IS DISTINCT FROM NEW.reason OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."creatorId" AND kind='OWNER' AND state='ACTIVE') THEN RAISE EXCEPTION 'S24 frozen evidence mismatch'; END IF;
  IF NEW."correctsId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM report_snapshots p WHERE p.id=NEW."correctsId" AND p."organizationId"=org AND p.category=NEW.category AND p."from"=NEW."from" AND p."to"=NEW."to") THEN RAISE EXCEPTION 'S24 corrective identity mismatch'; END IF;
 ELSIF TG_TABLE_NAME='dashboard_rule_versions' THEN
  IF a.after->'data' IS DISTINCT FROM NEW.data OR (a.after->>'enabled')::boolean IS DISTINCT FROM NEW.enabled OR (a.after->>'version')::integer IS DISTINCT FROM NEW.version OR a.reason IS DISTINCT FROM NEW.reason OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."actorId" AND kind='OWNER' AND state='ACTIVE') OR NOT EXISTS(SELECT 1 FROM dashboard_rules r WHERE r.id=NEW."ruleId" AND r."organizationId"=org AND r.version>=NEW.version) THEN RAISE EXCEPTION 'S24 rule evidence mismatch'; END IF;
 END IF;
 RETURN NULL;
END $$;

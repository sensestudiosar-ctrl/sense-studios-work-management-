CREATE OR REPLACE FUNCTION "purge_expired_audit_event"(target_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  root_id UUID;
  notice_days INTEGER;
  family_ids UUID[];
  legacy_ids UUID[];
BEGIN
  SELECT COALESCE("correctsEventId", id) INTO root_id FROM public.audit_events WHERE id = target_id;
  IF root_id IS NULL THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(root_id::text));
  PERFORM 1 FROM public.audit_events WHERE id = root_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  PERFORM 1 FROM public.audit_events
    WHERE id = root_id OR "correctsEventId" = root_id ORDER BY id FOR UPDATE;
  SELECT array_agg(id) INTO family_ids FROM public.audit_events
    WHERE id = root_id OR "correctsEventId" = root_id;
  IF family_ids IS NULL OR cardinality(family_ids) = 0 THEN RETURN false; END IF;
  SELECT "noticeIntervalDays" INTO notice_days FROM public.audit_retention_configuration WHERE "singletonKey" = 1;
  IF notice_days IS NULL THEN RETURN false; END IF;
  SELECT array_agg("legacyOrganizationEventId") INTO legacy_ids FROM public.audit_events
    WHERE id = ANY(family_ids) AND "legacyOrganizationEventId" IS NOT NULL;

  IF EXISTS (SELECT 1 FROM public.audit_events WHERE id = ANY(family_ids) AND "retentionExpiresAt" > statement_timestamp()) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.audit_retention_holds WHERE "auditEventId" = ANY(family_ids) AND "releasedAt" IS NULL) THEN RETURN false; END IF;
  IF EXISTS (
    SELECT 1 FROM public.audit_events e LEFT JOIN public.audit_retention_notices n ON n."auditEventId" = e.id
    WHERE e.id = ANY(family_ids)
      AND (n.id IS NULL OR n."acknowledgedAt" IS NULL OR n."backupDisposition" IS NULL OR n."backupClearedAt" IS NULL
        OR n."noticeAt" > e."retentionExpiresAt" - make_interval(days => notice_days)
        OR n."acknowledgedAt" >= e."retentionExpiresAt" OR n."backupClearedAt" >= e."retentionExpiresAt")
  ) THEN RETURN false; END IF;
  IF EXISTS (
    SELECT 1 FROM public.domain_events d JOIN public.outbox_deliveries o ON o."eventId" = d.id
    WHERE d."correlationId" IN (SELECT "correlationId" FROM public.audit_events WHERE id = ANY(family_ids))
      AND o.state <> 'DELIVERED' FOR UPDATE OF o
  ) THEN RETURN false; END IF;
  IF EXISTS (
    SELECT 1 FROM public.domain_events d JOIN public.notifications n ON n."eventId" = d.id
    WHERE d."correlationId" IN (SELECT "correlationId" FROM public.audit_events WHERE id = ANY(family_ids))
      AND n."deliveryState" <> 'DELIVERED' FOR UPDATE OF n
  ) THEN RETURN false; END IF;

  INSERT INTO public.audit_deletion_tombstones (
    id, "auditEventId", "eventKey", "occurredAt", "retentionExpiresAt", "noticeAcknowledgedAt", "backupDisposition", "backupClearedAt"
  )
  SELECT gen_random_uuid(), e.id, e."eventKey", e."occurredAt", e."retentionExpiresAt", n."acknowledgedAt", n."backupDisposition", n."backupClearedAt"
  FROM public.audit_events e JOIN public.audit_retention_notices n ON n."auditEventId" = e.id
  WHERE e.id = ANY(family_ids);

  DELETE FROM public.notifications n USING public.domain_events d
    WHERE n."eventId" = d.id AND d."correlationId" IN (SELECT "correlationId" FROM public.audit_events WHERE id = ANY(family_ids));
  DELETE FROM public.outbox_deliveries o USING public.domain_events d
    WHERE o."eventId" = d.id AND d."correlationId" IN (SELECT "correlationId" FROM public.audit_events WHERE id = ANY(family_ids));
  DELETE FROM public.domain_events WHERE "correlationId" IN (SELECT "correlationId" FROM public.audit_events WHERE id = ANY(family_ids));
  DELETE FROM public.audit_retention_notices WHERE "auditEventId" = ANY(family_ids);
  DELETE FROM public.audit_retention_holds WHERE "auditEventId" = ANY(family_ids);
  DELETE FROM public.audit_events WHERE id = ANY(family_ids);
  DELETE FROM public.organization_events WHERE id = ANY(legacy_ids);
  RETURN true;
END;
$$;
ALTER FUNCTION "purge_expired_audit_event"(UUID) OWNER TO "sense_retention_executor";

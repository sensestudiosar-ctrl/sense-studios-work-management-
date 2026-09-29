ALTER TABLE "organizations" ADD COLUMN "timezone" VARCHAR(80) NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE "organizations" ADD COLUMN "settingsVersion" INTEGER NOT NULL DEFAULT 1 CHECK ("settingsVersion" > 0);
ALTER TABLE "teams" ADD COLUMN "waitingAlertsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "teams" ADD COLUMN "settingsVersion" INTEGER NOT NULL DEFAULT 1 CHECK ("settingsVersion" > 0);

ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ("eventName" IN (
  'template.version_created', 'project.template_applied', 'project.plan_item_completed', 'project.gate_overridden',
  'organization.created', 'organization.settings.changed', 'organization.branch.created', 'organization.branch.updated', 'organization.team.created',
  'organization.team.updated', 'organization.job_role.created', 'organization.job_role.updated',
  'organization.employee.created', 'organization.employee.membership_changed', 'organization.employee.job_roles_changed',
  'organization.employee.suspended', 'organization.employee.exited', 'authorization.role_permission.changed',
  'authorization.employee_permission.changed', 'audit.corrected', 'audit.retention.notice_interval.updated',
  'audit.retention.hold.placed', 'audit.retention.hold.released', 'audit.retention.notice.acknowledged',
  'project.created', 'project.activated', 'project.on_hold', 'project.scope_changed', 'project.completed',
  'project.archived', 'project.assignment_changed', 'project.lead_changed', 'project.transferred',
  'project.scope_policy_changed', 'project.scope_requested', 'project.cancellation_requested', 'project.cancelled',
  'task.created', 'task.assigned', 'task.started', 'task.waiting', 'task.overdue', 'task.completed',
  'task.deadline_changed', 'task.updated', 'task.stopped', 'task.closeout_approved', 'task.dependency_completed',
  'task.recurrence_configured', 'task.recurrence_paused', 'task.recurrence_resumed', 'task.recurrence_generated',
  'review.requested', 'review.started', 'review.correction_requested', 'review.approved',
  'client.review_requested', 'client.revision_requested', 'client.approved', 'document.uploaded',
  'revision.created', 'document.approved', 'document.issued', 'document.superseded',
  'time.started', 'time.logged', 'time.changed', 'leave.requested', 'leave.approved', 'attendance.checked_in',
  'employee_performance.changed', 'project_health.changed', 'capacity.threshold_exceeded',
  'approval.requested', 'approval.delegated', 'approval.withdrawn', 'approval.decided',
  'crm.lead.created', 'crm.lead.updated', 'crm.lead.stage_changed', 'crm.lead.activity_recorded',
  'crm.client.created', 'crm.client.updated', 'crm.source.created', 'crm.source.updated'
));

CREATE FUNCTION "check_s10_settings_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE final_row JSONB; before_row JSONB; event_key TEXT; subject_type TEXT; organization_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'organizations' THEN
    IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW."timezone") THEN RAISE EXCEPTION 'Organization timezone is invalid'; END IF;
    IF TG_OP = 'INSERT' THEN
      IF NEW."timezone" <> 'Asia/Kolkata' OR NEW."settingsVersion" <> 1 THEN
        RAISE EXCEPTION 'Organization settings must start with approved defaults';
      END IF;
      RETURN NULL;
    END IF;
    IF NEW."timezone" IS NOT DISTINCT FROM OLD."timezone" THEN
      IF NEW."settingsVersion" <> OLD."settingsVersion" THEN RAISE EXCEPTION 'Settings version needs a timezone change'; END IF;
      RETURN NULL;
    END IF;
    event_key := 'organization.settings.changed'; subject_type := 'organization';
    organization_id := NEW.id;
    before_row := jsonb_build_object('timezone', OLD."timezone", 'settingsVersion', OLD."settingsVersion");
    final_row := jsonb_build_object('timezone', NEW."timezone", 'settingsVersion', NEW."settingsVersion");
  ELSE
    IF TG_OP = 'INSERT' THEN
      IF NEW."waitingAlertsEnabled" OR NEW."settingsVersion" <> 1 THEN
        RAISE EXCEPTION 'Team Waiting alerts must start disabled with the initial settings version';
      END IF;
      RETURN NULL;
    END IF;
    IF NEW."waitingAlertsEnabled" IS NOT DISTINCT FROM OLD."waitingAlertsEnabled" THEN
      IF NEW."settingsVersion" <> OLD."settingsVersion" THEN RAISE EXCEPTION 'Settings version needs a Waiting-alert change'; END IF;
      RETURN NULL;
    END IF;
    event_key := 'organization.team.updated'; subject_type := 'team';
    organization_id := NEW."organizationId";
    before_row := jsonb_build_object('waitingAlertsEnabled', OLD."waitingAlertsEnabled", 'settingsVersion', OLD."settingsVersion");
    final_row := jsonb_build_object('waitingAlertsEnabled', NEW."waitingAlertsEnabled", 'settingsVersion', NEW."settingsVersion");
  END IF;
  IF NEW."settingsVersion" <> OLD."settingsVersion" + 1 OR NOT EXISTS (
    SELECT 1 FROM audit_events a JOIN accounts actor ON actor.id=a."actorId"
    JOIN domain_events e ON e."correlationId"=a."correlationId" AND e."eventName"=a."eventKey"
      AND e."organizationId"=a."organizationId" AND e."actorId"=a."actorId"
      AND e."subjectType"=a."subjectType" AND e."subjectId"=a."subjectId"
      AND e."payload"->>'auditEventId'=a.id::text
    JOIN outbox_deliveries o ON o."eventId"=e.id AND o.consumer='NTF'
    WHERE a."organizationId"=organization_id AND a."eventKey"=event_key
      AND a."subjectType"=subject_type AND a."subjectId"=NEW.id::text
      AND actor.kind='OWNER' AND actor.state='ACTIVE' AND length(trim(a.reason)) BETWEEN 3 AND 1000
      AND a."before" @> before_row AND a."after" @> final_row
  ) THEN RAISE EXCEPTION 'Settings change requires versioned Owner audit/event/outbox evidence'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "organization_settings_evidence" AFTER INSERT OR UPDATE ON "organizations"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s10_settings_evidence"();
CREATE CONSTRAINT TRIGGER "team_waiting_settings_evidence" AFTER INSERT OR UPDATE ON "teams"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s10_settings_evidence"();

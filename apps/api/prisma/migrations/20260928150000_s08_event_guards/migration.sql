-- Keep S08 producers in the database catalogue.
ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ("eventName" IN (
  'template.version_created',
  'project.template_applied',
  'project.plan_item_completed',
  'project.gate_overridden',
  'organization.created',
  'organization.branch.created',
  'organization.branch.updated',
  'organization.team.created',
  'organization.team.updated',
  'organization.job_role.created',
  'organization.job_role.updated',
  'organization.employee.created',
  'organization.employee.membership_changed',
  'organization.employee.job_roles_changed',
  'organization.employee.suspended',
  'authorization.role_permission.changed',
  'authorization.employee_permission.changed',
  'audit.corrected',
  'audit.retention.notice_interval.updated',
  'audit.retention.hold.placed',
  'audit.retention.hold.released',
  'audit.retention.notice.acknowledged',
  'project.created',
  'project.activated',
  'project.on_hold',
  'project.scope_changed',
  'project.completed',
  'project.archived',
  'project.assignment_changed',
  'project.lead_changed',
  'project.transferred',
  'project.scope_policy_changed',
  'project.scope_requested',
  'project.cancellation_requested',
  'task.created',
  'task.assigned',
  'task.started',
  'task.waiting',
  'task.overdue',
  'task.completed',
  'task.deadline_changed',
  'review.requested',
  'review.started',
  'review.correction_requested',
  'review.approved',
  'client.review_requested',
  'client.revision_requested',
  'client.approved',
  'document.uploaded',
  'revision.created',
  'document.approved',
  'document.issued',
  'document.superseded',
  'time.started',
  'time.logged',
  'time.changed',
  'leave.requested',
  'leave.approved',
  'attendance.checked_in',
  'employee_performance.changed',
  'project_health.changed',
  'capacity.threshold_exceeded',
  'approval.requested',
  'approval.delegated',
  'approval.withdrawn',
  'approval.decided',
  'crm.lead.created',
  'crm.lead.updated',
  'crm.lead.stage_changed',
  'crm.lead.activity_recorded',
  'crm.client.created',
  'crm.client.updated',
  'crm.source.created',
  'crm.source.updated'
));

-- No manual completion or override can bypass retained canonical evidence.
CREATE FUNCTION "check_s08_canonical_completion"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE project_id UUID;
BEGIN
 SELECT "projectId" INTO project_id FROM "project_plan_items" WHERE "id" = NEW."itemId";
 IF NOT EXISTS (SELECT 1 FROM "audit_events" WHERE "organizationId" = NEW."organizationId" AND "eventKey" = 'project.plan_item_completed' AND "subjectId" = project_id::text AND "actorId" = NEW."actorId" AND "reason" = NEW."reason" AND "after"->>'itemId' = NEW."itemId"::text AND ("after"->>'projectVersion')::int = NEW."projectVersion") THEN RAISE EXCEPTION 'Plan completion requires canonical audit'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "plan_completion_canonical_evidence" AFTER INSERT ON "project_plan_completions" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s08_canonical_completion"();
CREATE FUNCTION "check_s08_override_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "project_status_changes" WHERE "projectId" = NEW."projectId" AND "projectVersion" = NEW."projectVersion" AND "toStatus" = 'COMPLETED' AND "actorId" = NEW."actorId" AND "reason" = NEW."reason") OR NOT EXISTS (SELECT 1 FROM "audit_events" WHERE "organizationId" = NEW."organizationId" AND "eventKey" = 'project.gate_overridden' AND "subjectId" = NEW."projectId"::text AND "actorId" = NEW."actorId" AND "reason" = NEW."reason" AND ("after"->>'projectVersion')::int = NEW."projectVersion") THEN RAISE EXCEPTION 'Milestone override requires matching status and canonical audit'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "gate_override_evidence" AFTER INSERT ON "project_gate_overrides" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s08_override_evidence"();

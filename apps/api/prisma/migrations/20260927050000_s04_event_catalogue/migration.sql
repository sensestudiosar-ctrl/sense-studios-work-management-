ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ("eventName" IN (
  'organization.created',
  'organization.branch.created', 'organization.branch.updated',
  'organization.team.created', 'organization.team.updated',
  'organization.job_role.created', 'organization.job_role.updated',
  'organization.employee.created', 'organization.employee.membership_changed',
  'organization.employee.job_roles_changed', 'organization.employee.suspended',
  'authorization.role_permission.changed', 'authorization.employee_permission.changed',
  'audit.corrected', 'audit.retention.notice_interval.updated', 'audit.retention.hold.placed',
  'audit.retention.hold.released', 'audit.retention.notice.acknowledged',
  'project.created', 'project.activated', 'project.on_hold', 'project.scope_changed', 'project.completed',
  'task.created', 'task.assigned', 'task.started', 'task.waiting', 'task.overdue', 'task.completed', 'task.deadline_changed',
  'review.requested', 'review.started', 'review.correction_requested', 'review.approved',
  'client.review_requested', 'client.revision_requested', 'client.approved',
  'document.uploaded', 'revision.created', 'document.approved', 'document.issued', 'document.superseded',
  'time.started', 'time.logged', 'time.changed', 'leave.requested', 'leave.approved', 'attendance.checked_in',
  'employee_performance.changed', 'project_health.changed', 'capacity.threshold_exceeded'
));

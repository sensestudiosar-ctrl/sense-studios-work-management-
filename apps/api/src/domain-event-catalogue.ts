export const DOMAIN_EVENT_CATALOGUE = {
  "organization.created": { producer: "S03 organization", subjectType: "organization", schemaVersion: 1 },
  "organization.branch.created": { producer: "S03 organization", subjectType: "branch", schemaVersion: 1 },
  "organization.branch.updated": { producer: "S03 organization", subjectType: "branch", schemaVersion: 1 },
  "organization.team.created": { producer: "S03 organization", subjectType: "team", schemaVersion: 1 },
  "organization.team.updated": { producer: "S03 organization", subjectType: "team", schemaVersion: 1 },
  "organization.job_role.created": { producer: "S03 organization", subjectType: "job_role", schemaVersion: 1 },
  "organization.job_role.updated": { producer: "S03 organization", subjectType: "job_role", schemaVersion: 1 },
  "organization.employee.created": { producer: "S03 organization", subjectType: "employee", schemaVersion: 1 },
  "organization.employee.membership_changed": { producer: "S03 organization", subjectType: "employee", schemaVersion: 1 },
  "organization.employee.job_roles_changed": { producer: "S03 organization", subjectType: "employee", schemaVersion: 1 },
  "organization.employee.suspended": { producer: "S03 organization", subjectType: "employee", schemaVersion: 1 },
  "authorization.role_permission.changed": { producer: "S03 authorization", subjectType: "role_permission", schemaVersion: 1 },
  "authorization.employee_permission.changed": { producer: "S03 authorization", subjectType: "employee_permission", schemaVersion: 1 },
  "audit.corrected": { producer: "S04 audit", subjectType: "audit_event", schemaVersion: 1 },
  "audit.retention.notice_interval.updated": { producer: "S04 audit", subjectType: "audit_retention_configuration", schemaVersion: 1 },
  "audit.retention.hold.placed": { producer: "S04 audit", subjectType: "audit_event", schemaVersion: 1 },
  "audit.retention.hold.released": { producer: "S04 audit", subjectType: "audit_event", schemaVersion: 1 },
  "audit.retention.notice.acknowledged": { producer: "S04 audit", subjectType: "audit_event", schemaVersion: 1 },
  "project.created": { producer: "S07 projects", subjectType: "project", schemaVersion: 1 },
  "project.activated": { producer: "S07 projects", subjectType: "project", schemaVersion: 1 },
  "project.on_hold": { producer: "S07 projects", subjectType: "project", schemaVersion: 1 },
  "project.scope_changed": { producer: "S07 projects", subjectType: "project", schemaVersion: 1 },
  "project.completed": { producer: "S07 projects", subjectType: "project", schemaVersion: 1 },
  "task.created": { producer: "S09 tasks", subjectType: "task", schemaVersion: 1 },
  "task.assigned": { producer: "S09 tasks", subjectType: "task", schemaVersion: 1 },
  "task.started": { producer: "S09 tasks", subjectType: "task", schemaVersion: 1 },
  "task.waiting": { producer: "S09 tasks", subjectType: "task", schemaVersion: 1 },
  "task.overdue": { producer: "S09 tasks", subjectType: "task", schemaVersion: 1 },
  "task.completed": { producer: "S09 tasks", subjectType: "task", schemaVersion: 1 },
  "task.deadline_changed": { producer: "S09 tasks", subjectType: "task", schemaVersion: 1 },
  "review.requested": { producer: "S13 review", subjectType: "review", schemaVersion: 1 },
  "review.started": { producer: "S13 review", subjectType: "review", schemaVersion: 1 },
  "review.correction_requested": { producer: "S13 review", subjectType: "review", schemaVersion: 1 },
  "review.approved": { producer: "S13 review", subjectType: "review", schemaVersion: 1 },
  "client.review_requested": { producer: "S14 client", subjectType: "client_review", schemaVersion: 1 },
  "client.revision_requested": { producer: "S14 client", subjectType: "client_review", schemaVersion: 1 },
  "client.approved": { producer: "S14 client", subjectType: "client_review", schemaVersion: 1 },
  "document.uploaded": { producer: "S11 documents", subjectType: "document", schemaVersion: 1 },
  "revision.created": { producer: "S12 revisions", subjectType: "revision", schemaVersion: 1 },
  "document.approved": { producer: "S13 review", subjectType: "document", schemaVersion: 1 },
  "document.issued": { producer: "S12 issue", subjectType: "document_revision", schemaVersion: 1 },
  "document.superseded": { producer: "S12 issue", subjectType: "document_revision", schemaVersion: 1 },
  "time.started": { producer: "S16 time", subjectType: "time_entry", schemaVersion: 1 },
  "time.logged": { producer: "S16 time", subjectType: "time_entry", schemaVersion: 1 },
  "time.changed": { producer: "S16 time", subjectType: "time_entry", schemaVersion: 1 },
  "leave.requested": { producer: "S17 workforce", subjectType: "leave_request", schemaVersion: 1 },
  "leave.approved": { producer: "S17 workforce", subjectType: "leave_request", schemaVersion: 1 },
  "attendance.checked_in": { producer: "S17 workforce", subjectType: "attendance", schemaVersion: 1 },
  "employee_performance.changed": { producer: "S23 analytics", subjectType: "employee_performance", schemaVersion: 1 },
  "project_health.changed": { producer: "S23 analytics", subjectType: "project_health", schemaVersion: 1 },
  "capacity.threshold_exceeded": { producer: "S17 workforce", subjectType: "capacity", schemaVersion: 1 },
  "approval.requested": { producer: "S05 approvals", subjectType: "approval_request", schemaVersion: 1 },
  "approval.delegated": { producer: "S05 approvals", subjectType: "approval_request", schemaVersion: 1 },
  "approval.withdrawn": { producer: "S05 approvals", subjectType: "approval_request", schemaVersion: 1 },
  "approval.decided": { producer: "S05 approvals", subjectType: "approval_request", schemaVersion: 1 }
} as const;

export type DomainEventName = keyof typeof DOMAIN_EVENT_CATALOGUE;

export function isDomainEventName(value: string): value is DomainEventName {
  return Object.hasOwn(DOMAIN_EVENT_CATALOGUE, value);
}

export function assertSafeDomainPayload(eventName: string, payload: unknown): void {
  if (!isDomainEventName(eventName) || !payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Domain event payload is invalid");
  }
  const inspect = (value: unknown, depth: number): void => {
    if (depth > 8) throw new Error("Domain event payload is too deep");
    if (value === null || typeof value === "boolean" || typeof value === "number") return;
    if (typeof value === "string") {
      if (value.length > 2000 || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(value)
        || /\bBearer\s+\S+/i.test(value)
        || /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/.test(value)
        || /(?:[A-Za-z]:\\|\\\\[^\\]+\\|\/(?:mnt|nas|srv|volume|shares?)\/)/i.test(value)) {
        throw new Error("Sensitive value cannot be stored in a domain event");
      }
      return;
    }
    if (Array.isArray(value)) { value.forEach((item) => inspect(item, depth + 1)); return; }
    if (typeof value === "object") {
      for (const [key, nested] of Object.entries(value)) {
        if (/(?:password|passkey|credential|session|csrf|token|recovery|secret|private.?key|nas.?path|file.?path|storage.?key)/i.test(key)) {
          throw new Error("Sensitive field cannot be stored in a domain event");
        }
        inspect(nested, depth + 1);
      }
      return;
    }
    throw new Error("Domain event payload contains an unsupported value");
  };
  inspect(payload, 0);
  if (JSON.stringify(payload).length > 8000) throw new Error("Domain event payload is too large");
}

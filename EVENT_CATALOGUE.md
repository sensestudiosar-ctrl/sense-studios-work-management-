# Domain event catalogue — proposed, no events implemented

Source: R-095 and related workflows. Business state changes and an outbox record must be written in the same PostgreSQL transaction. Event names are stable dotted past-tense facts. A worker may retry delivery, so consumers must be idempotent. Event publication is not authorization: each recipient/view/integration checks current scope before showing data.

## Envelope

event_id; event_type; schema_version; occurred_at UTC; organization_id; branch_id when relevant; aggregate_type/id/version; actor_id and safe display snapshot; correlation_id/causation_id; minimal type-specific payload. Never put credentials, full file paths, private file bodies, medical/attendance evidence or hidden AI reasoning into event payloads. Consumers use event_id plus destination to deduplicate; failures and retries are visible. Permission revocation invalidates future delivery/access even if an event was queued earlier.

## Initial families

| Family | Canonical events and key consumers |
| --- | --- |
| Lead | lead.created, lead.stage_changed, lead.won, lead.lost → CRM activity, conversion and reporting. C-017 stage_changed includes from/to, skipped-stage list, reason, actor and time; reporting never counts a skipped stage as completed. Under C-018 a returning enquiry emits a new lead.created event with a link to the prior Lost lead; it does not rewrite lead.lost. C-019 backward stage changes use the same immutable stage_changed event with direction and reason; earlier activity is not deleted. |
| Project | project.created, project.activated, project.on_hold, project.lead_exit_hold, project.lead_replaced, project.scope_changed, project.completed, project.cancelled → notifications, health and reports. Project cancellation also emits task.stopped_due_to_project_cancellation for each unfinished delivery task and project.vendor_consultant_access_revoked and project.client_portal_read_only in the same committed transition; closeout.task_authorized and closeout.external_access_granted/revoked record C-016 scoped follow-up work; client_portal.read_only_access_expired and client_portal.access_extended record later C-014/C-015 per-client expiry/Owner decisions; the committed state denies further vendor/consultant project access, while events suppress active-work reminders and update downstream views (C-011/C-012). |
| Task | task.created, task.assigned, task.reassigned, task.started, task.waiting, task.waiting_for_reassignment, task.deadline_changed, task.overdue, task.completed → reminders, workload and summaries. Overdue is emitted once per due-date version; C-023 waiting tasks leave active capacity while deadlines stay visible to managers. |
| Review | review.requested, review.started, review.correction_requested, review.approved → assignee notifications and evidence. |
| Client | client.review_requested, client.revision_requested, client.item_approved, client.final_approved → portal decision queue and transmittal readiness. Exact item/revision IDs required. |
| Document | document.uploaded, revision.created, document.approved, document.issued, document.superseded, transmittal.acknowledged, external_share.issued, external_share.cancelled → register and recipient notifications. Native share secrets/extraction codes never enter event payloads. |
| Workforce | employee.exited, time.started, time.logged, time.changed, leave.requested, leave.approved, leave.cancellation_requested, leave.cancellation_approved, leave.cancellation_denied, attendance.checked_in, skill.change_approved → capacity and accounting integration. C-022 cancellation approval triggers compensating balance/capacity calculation and affected-task alerts without deleting the original approval. |
| Site | site.progress_recorded, site.daily_report_submitted, snag.verifier_assigned, snag.verification_passed, snag.verification_failed, snag.state_changed → project health and site alerts. C-020 failed verification retains evidence and returns the same snag to In Progress. C-021 snag.closed records a separate assigned Project Lead/authorized Team Leader decision after a current passed check. |
| Decision/security | approval.requested, approval.decided, permission.changed, session.revoked, passkey.revoked, retention.hold_placed, retention.deleted → management queue, expiry and access invalidation. Security events carry no secret material. |
| Analytics | employee_performance.changed, project_health.changed, capacity.threshold_exceeded → dashboards/summaries; payload points to versioned evidence rather than copying private details. |

## Launch notification routing baseline

The Owner's C-008 launch channels are in-app and email; mobile push, SMS and WhatsApp are later. These are technical defaults to be reviewed as each slice becomes active. Every delivery rechecks current recipient scope and skips a revoked or expired grant. In-app records remain authoritative if Brevo email is delayed or unavailable; email retry uses an idempotency key and never includes file bodies, native CAD link codes or sensitive attendance evidence.

| Trigger | Actionable recipients | Default handling |
| --- | --- | --- |
| Assignment, reassignment, deadline or review request | Current assignee/reviewer and the project manager when the action changes their work | Mandatory in-app; email for direct action requests, configurable for routine copies. A C-023 exited person is never a recipient. |
| Correction, approval and issued revision | Submitter/task owner, current reviewer or scoped project/client recipient | In-app plus email when a response or issued transmittal is required; exact revision and permission checked at delivery and view. No new delivery decision is sent during a C-024 lead-exit hold. |
| Leave decision or cancellation impact | Employee, approver, affected Team Leader and affected task owners | Mandatory in-app; email for approver/actionable impact; C-022 pending cancellation changes no capacity. |
| Project cancellation, lead-exit hold, access loss or critical site risk | Owner and affected internal managers; external recipients only through an explicitly approved notification/template | Immediate mandatory in-app and essential email for internal decision makers; critical alerts may bypass quiet hours under an Owner-configured policy. Existing portal grants are still enforced on every view. |
| Morning/evening/weekly/monthly summaries and personal reminders | User's current authorized scope | Respect preferences and quiet hours; dedupe by recipient/period/version. Summaries do not substitute for actionable alerts. |

Reminder schedules and critical thresholds are versioned Owner configuration before their respective slices run. Missing recipient, quiet-hour rule, failed email or stale grant is visible in operations status rather than silently counted as delivered. Only create events when a domain slice needs them. A source module owns its event schema. Consumers must not replicate another module's business rule; projections can be rebuilt from authoritative records.

# Domain event catalogue — proposed, no events implemented

Source: R-095 and related workflows. Business state changes and an outbox record must be written in the same PostgreSQL transaction. Event names are stable dotted past-tense facts. A worker may retry delivery, so consumers must be idempotent. Event publication is not authorization: each recipient/view/integration checks current scope before showing data.

## Envelope

event_id; event_type; schema_version; occurred_at UTC; organization_id; branch_id when relevant; aggregate_type/id/version; actor_id and safe display snapshot; correlation_id/causation_id; minimal type-specific payload. Never put credentials, full file paths, private file bodies, medical/attendance evidence or hidden AI reasoning into event payloads. Consumers use event_id plus destination to deduplicate; failures and retries are visible. Permission revocation invalidates future delivery/access even if an event was queued earlier.

## Initial families

| Family | Canonical events and key consumers |
| --- | --- |
| Lead | lead.created, lead.stage_changed, lead.won, lead.lost → CRM activity, conversion and reporting. |
| Project | project.created, project.activated, project.on_hold, project.scope_changed, project.completed, project.cancelled → notifications, health and reports. Project cancellation also emits task.stopped_due_to_project_cancellation for each unfinished delivery task and project.vendor_consultant_access_revoked and project.client_portal_read_only in the same committed transition; the committed state denies further vendor/consultant project access, while events suppress active-work reminders and update downstream views (C-011/C-012). |
| Task | task.created, task.assigned, task.reassigned, task.started, task.waiting, task.deadline_changed, task.overdue, task.completed → reminders, workload and summaries. Overdue is emitted once per due-date version. |
| Review | review.requested, review.started, review.correction_requested, review.approved → assignee notifications and evidence. |
| Client | client.review_requested, client.revision_requested, client.item_approved, client.final_approved → portal decision queue and transmittal readiness. Exact item/revision IDs required. |
| Document | document.uploaded, revision.created, document.approved, document.issued, document.superseded, transmittal.acknowledged, external_share.issued, external_share.cancelled → register and recipient notifications. Native share secrets/extraction codes never enter event payloads. |
| Workforce | time.started, time.logged, time.changed, leave.requested, leave.approved, attendance.checked_in, skill.change_approved → capacity and accounting integration. |
| Site | site.progress_recorded, site.daily_report_submitted, snag.state_changed → project health and site alerts. |
| Decision/security | approval.requested, approval.decided, permission.changed, session.revoked, passkey.revoked, retention.hold_placed, retention.deleted → management queue, expiry and access invalidation. Security events carry no secret material. |
| Analytics | employee_performance.changed, project_health.changed, capacity.threshold_exceeded → dashboards/summaries; payload points to versioned evidence rather than copying private details. |

Only create events when a domain slice needs them. A source module owns its event schema. Consumers must not replicate another module's business rule; projections can be rebuilt from authoritative records.

# S10E configured Waiting notices — R-025.c

Owner-approved boundary: ordinary Waiting alerts are opt-in per Team; only the Owner may change that setting. The source task's current primary owner's home Team determines the setting. Disabled is the default. C-023 forced exit waiting and S10C dependency-completion notices remain separate paths.

In scope: versioned, reasoned, Owner-only persisted Team opt-in; an ordinary Waiting command queues one in-app notice for each currently active Owner and currently authorized scoped task manager. Manager title alone confers no authority. Non-project managers require the existing home Team/reporting-tree and task.assign authority. Project managers require current explicit project assignment, cross-Branch authorization where necessary, project.view, project.manage and task.assign. The notice gives a generic waiting message and authorized task route; no extra predecessor/person information is exposed.

Delivery rechecks the same Team opt-in, task owner/team, task access, manager authority, active actor/employee, ordinary Waiting state, and exact Waiting task version. Resumed, reassigned, newer Waiting cycles, exited, cancelled, revoked and disabled-settings cases fail closed. Notification insertion shares the task state/history/audit/event/outbox transaction. Retry is idempotent through the existing per-event/recipient/channel constraint.

Owner-only organization timezone setting is included as the recurrence prerequisite, initially Asia/Kolkata. Settings require strict session/origin/CSRF/fresh-Owner-session, expected settings version and reason; canonical immutable audit/event/outbox evidence is required by deferred database guards. These settings do not grant task access.

Out of scope: email, reminder schedules/escalations, automatic resumes, S11 or later work. Acceptance: current-owner/scoped-manager allow and title-only/cross-scope deny; default-disabled, enable/disable/reload persistence; stale settings conflicts and forged SQL denial; resumed/reassigned/revoked notification suppression; exact recipient/atomic rollback tests; desktop/mobile settings UI, typecheck/lint/build and final repository verification. This specification does not claim completion.

Final local acceptance passed as part of S10; see S10_COMPLETION_REPORT.md. Team opt-in and timezone changes persisted through desktop/mobile refresh, forged SQL settings evidence was denied, and real delivery/resume/revocation races passed.

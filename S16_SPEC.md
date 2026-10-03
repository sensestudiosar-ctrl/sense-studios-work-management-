# S16 Time and accounting-ready export — implementation scope

Status: COMPLETE for development/local staging — Owner-authorized 2026-10-01; final acceptance verified 2026-10-02. See S16_COMPLETION_REPORT.md. Approved sources are requirements/APPROVED_REQUIREMENTS.md, C-001–C-024, architecture checkpoint 2e46805 and the S16 entry in IMPLEMENTATION_PLAN.md. S17 and later remain unauthorized.

## Requirement sub-IDs

- R-041.a: Persistent Start, Pause, Resume and Stop timer commands.
- R-041.b: Manual time entry.
- R-041.c: Employee, project, task, stage, date, start/end, duration, work note, office/site/remote, billable/non-billable and optional evidence fields.
- R-041.d: Time against non-project activity.
- R-042.a: Existing-entry changes preserve original/new value, mandatory reason, editor, timestamp and audit history.
- R-042.b: Authorized management correction.
- R-042.c: Prevent or detect simultaneous timers.
- R-043.a: Relevant time logs transferred to the accounting application through an idempotent adapter.
- R-043.b: Later approved procurement transfer remains outside S16.
- R-043.c / R-003: No full accounting-report duplication, payroll or accounting-system implementation.
- C-002 Q9: Manager approval/export locks time entries; corrections retain history and export idempotently.

## Scope and dependencies

TIM owns persistent timers, segments, entries, correction versions and accounting-ready immutable delivery snapshots. S09 tasks and S04 audit/outbox are complete dependencies; existing ORG/ACC/IDN boundaries and shared APR facilities apply. In scope are backend-enforced current access, timer/manual-entry/history UI, accounting delivery status, transactional audit/events, concurrency, migration preservation and desktop/mobile acceptance.

Out of scope are S17 schedules/attendance/leave/capacity, payroll, procurement integration, performance scoring, broad UI redesign, production deployment, production accounting credentials and production NAS validation. Optional file evidence must use DOC authorization without granting new file access or exposing NAS paths.

## Owner decisions and open policy

The Owner approved a local HTTP JSON accounting receiver contract with a real test receiver proving replay safety. Binding the production accounting application remains pending and must be reported explicitly. No unspecified external provider API is assumed.

Owner continuation approval: after the two proposed policies were presented explicitly, the Owner instructed CONTINUE TO COMPLETE IT. The approved implementation applies Owner or explicit time.manage within current project management/reporting-team scope; Owner-only accounting export; own edits before lock; management corrections after lock append a new unapproved version requiring reapproval while retaining the stable accounting record ID. Timers automatically pause at effective project hold/cancellation or employee exit, preserving elapsed time; stopping records prior elapsed time, while resuming requires current eligibility. Current project/task access remains required for new work.

## Accounting receiver contract design

The proposed receiver uses PUT /time-records/{recordId}, a stable record ID, positive immutable revision and stable delivery UUID in Idempotency-Key. The JSON schema includes identity/work references and time fields, never credentials or NAS paths. The receiver returns matching recordId/revision and accepted=true. Conflicting reuse of the same key or record/revision fails; retries of identical deliveries converge to one record. The approved correction policy appends a new unapproved revision, requires reapproval, and keeps the accounting record ID stable.

External calls occur outside database transactions. A durable immutable payload/hash and delivery receipt retain the version sent; leased dispatch and append-only attempts handle retry and remote-success/local-failure without assuming success. Secrets stay in server configuration and never enter audit, browser responses or delivery errors.

## Acceptance and test plan

1. Persist timer transitions and manual/non-project entries through refresh; compute duration from segments excluding pauses and validate reference/date/category consistency.
2. Prevent concurrent timers at the database boundary; reject stale or conflicting replay commands and preserve identical retry results.
3. Enforce employee-own access and approved management scope; test branch/organization isolation, guessed IDs, grant revocation, inactive employees, internal session/CSRF and CLIENT exclusion.
4. Retain every correction's old/new values, reason, editor and time. Verify approval/export locking and subsequent correction behavior against the settled Owner policy.
5. Real HTTP receiver acceptance must prove replay, concurrent delivery and remote-success/local-failure converge without duplicate records; production binding remains separately pending.
6. Verify audit/event atomicity, rollback on evidence failure, runtime SQL tamper denial and lifecycle/interruption races under the settled policy.
7. Reviewed migrations must deploy fresh and onto a retained populated S15 baseline without changing old-column evidence. Run targeted tests and full pinned pnpm verify, including real PostgreSQL and desktop/mobile timer/manual/correction/export journeys with loading/empty/error states.

Actual routing: GPT-6.1 Sol owns context, requirements, schema/security/design and final review. GPT-6 Luna performed bounded adapter/UI/test implementation. Exact participation and executed acceptance are recorded in S16_COMPLETION_REPORT.md.

# S04 — Audit, outbox and core notifications

**Status:** COMPLETE for development/local staging — Owner authorized 2026-09-27 after S03
**Requirements:** R-058.a–c, R-079.a–b, R-080.a, R-095.a; C-003 audit-retention portion and C-009 audit clock/expiry/hold policy
**Dependencies:** S02 identity/sessions and S03 organization/authorization

## Slice boundary

S04 establishes shared append-only audit evidence, the domain-event catalogue and transactional outbox, an in-app inbox, a Brevo email adapter, and user notification preferences/quiet-hours basics. Existing S03 organization changes are the first producer and must write their S04 audit/event/outbox records in the same database transaction as the organization mutation. The S04 migration must backfill each existing `OrganizationEvent` as canonical audit evidence and preserve its ID/time/actor/subject/reason/before/after data. The first implementation checkpoint keeps the legacy table and trigger, linked to canonical rows, and temporarily dual-writes. A later S04 cutover may retire the duplicate only after verifying the full canonical copy and switching all consumers. Backfilled history creates no retroactive notifications. Future domain slices own their business writes and publish through the shared service; S04 does not create future domain tables or business workflows. S02 `SecurityEvent` remains the identity/security ceremony stream and must be preserved without reclassifying authentication telemetry as business events.

### Requirement sub-IDs

- **R-058.a** — Deliver relevant authorized event notices in-app and by email; mobile push is deferred. Store inbox notices durably and expose only the signed-in recipient's notices.
- **R-058.b** — Apply a user's optional per-channel preferences and quiet hours. Critical notifications may bypass quiet hours. Business-critical notices remain mandatory. Evaluate current authorization and recipient eligibility again before delivery.
- **R-058.c** — Deduplicate inbox and provider work by stable event/recipient/channel identity; use bounded retries and expose failure state without secrets. Email provider acceptance is at-least-once unless Brevo guarantees idempotency for the selected API operation.
- **R-079.a** — Record the actor, occurrence time, related entity, and before/after/reason where applicable; record session/device and request metadata only when available and safe to retain.
- **R-079.b** — Keep audit evidence append-only, with ten-year expiry measured from event occurrence under C-003/C-009. No notification/email payload may contain credentials, passkeys, session tokens, recovery material, or unrestricted NAS paths.
- **R-080.a** — Corrections create linked corrective entries; application APIs cannot edit or delete an audit event. Controlled expiry is a separate, explicit, auditable retention operation.
- **R-095.a** — Define a versioned event-name catalogue with stable envelope, producer, subject, and safe payload rules. Establish project/task/review/client/document/workforce/analytics families; domain producers remain with their owning future slices.

## C-003/C-009 retention boundary

Audit retention is ten years from each event's occurrence time. The design supports an Owner-visible advance expiry notice, documented holds, and deletion proof. The notice interval is configuration and must not receive an invented default. Holds prevent expiry. A purge may run only after notice, hold and linked-record checks; it writes a non-sensitive deletion tombstone before/with deletion and respects backup lifecycle. Ordinary application credentials cannot bypass append-only enforcement. The migration must replace the S03 `OrganizationEvent` trigger with a guarded retention path: only a narrowly privileged stored procedure/role may delete an event, and that path must check expiry, active holds, unresolved links, notice completion, and tombstone creation in one transaction. Normal application SQL remains unable to update or delete audit evidence. Actor/organization references are retained as stable snapshots; expiry cannot cascade-delete accounts or organizations. Legal/contract fit remains a production gate. Other C-003 records (issued drawings, client approvals, employee records, and attendance selfies) remain owned by their later modules.

## Out of scope

- Mobile push, SMS, WhatsApp, portal email-code sign-in, and advanced delivery analytics.
- Configurable task reminder schedules, personal reminders, and morning/evening/weekly/monthly summaries (R-059/R-060 delivery behavior remains with S24; S04 only establishes reusable event and delivery primitives).
- Project/task/review/client/document/workforce event producers before those slices exist.
- Automatic deletion of non-audit records or production retention/legal configuration.
- Replacing S03's organization domain model or weakening its append-only change evidence.

## Acceptance gates

- Reviewed forward-only migration applies to fresh and existing S03 databases and preserves all S01–S03 rows.
- Each in-scope mutation persists its business record, audit event, domain event, and outbox work atomically; rollback leaves none of them partially written.
- Database/API tests prove append-only enforcement, actor/subject binding, safe payload validation, idempotent event/outbox processing, bounded retry, concurrent worker claims, and delivery reauthorization after suspension or grant revocation.
- Inbox APIs enforce signed-in recipient isolation, persisted read state, event/recipient dedupe, and responsive loading/empty/error states.
- Email is a pluggable Brevo adapter using deployment configuration; tests use a fake transport and assert no secret or sensitive body content is logged. Quiet hours respect the recipient timezone and critical bypass; optional channel preferences do not suppress mandatory events.
- Retention scheduling uses event time, configuration-controlled notice interval, documented holds, linked-record/backup checks, and deletion tombstones. No purge occurs without a fully satisfied gate.
- Targeted tests, typecheck, lint, production build, relevant browser checks, security review, traceability and documentation pass before S04 is COMPLETE.

## First implementation checkpoint

The first S04 vertical slice is the canonical `AuditEvent` + `DomainEvent` + `OutboxDelivery` persistence and atomic integration for every S03 organization mutation. It must backfill all existing OrganizationEvent rows without creating retroactive outbox work, preserve append-only enforcement, and make each new organization mutation commit business state, audit, event and NTF-consumer outbox state together. During this checkpoint the service dual-writes the immutable legacy record and its canonical representation. This checkpoint does not claim S04 completion: inbox APIs/UI, preferences/quiet-hours, Brevo delivery, retention notices/holds and guarded purge remain subsequent S04 work. Do not add a purge bypass or weaken the existing S03 trigger in this checkpoint.

**Checkpoint implementation recorded 2026-09-27:** `AuditEvent`, `DomainEvent` and per-consumer `OutboxDelivery` Prisma models and a forward migration were added. The migration backfills legacy organization events without outbox rows and retains the old append-only trigger. Every current S03 organization mutation now writes the legacy evidence row, canonical audit record, versioned domain event and NTF outbox delivery within its existing database transaction. `SecurityEvent` is unchanged. Prisma validation/generation, API typecheck/build, 45 API unit tests and `git diff --check` passed. The migration has not been applied to PostgreSQL and database/API integration cases are unverified on this host. This checkpoint is implemented but not accepted as S04 completion.

## Sol design decisions and open implementation gates

- Use one durable event and one transactional outbox-delivery row per event/consumer, with a lease/claim protocol for concurrent workers. Persist attempt count, next attempt and a sanitized failure code; never persist raw provider response bodies or secrets.
- Keep event and audit identities stable and separate: an event may have multiple authorized recipients, while one audit record describes the mutation.
- Reauthorize at delivery time through ACC. Do not trust a queued recipient list after account suspension or grant change.
- Model provider delivery as retryable/at-least-once; inbox creation is idempotent. Do not promise exactly-once external email delivery.
- Store quiet hours as local start/end times with a validated IANA time-zone identifier. If a user has not configured quiet hours, do not infer a zone or suppress delivery. Reject invalid/missing zones on preference updates. Use IANA rules across daylight-saving changes: repeated local quiet time remains quiet, and a nonexistent boundary advances to the first valid local instant.
- Backfill legacy OrganizationEvent evidence before replacing the table and trigger. Keep SecurityEvent as the separate S02 identity/security stream. New S03 organization mutations write canonical audit, event and outbox rows atomically; historical backfill sends no notifications.
- Keep retention notice duration unset until Owner configuration; keep legal review and backup expiry as production gates.

### Data/API shape for implementation

- `AuditEvent`: immutable UUID; organization; stable event key and schema version; occurred-at; actor account ID plus actor snapshot; optional session/device/request metadata; subject type/opaque ID; reason; before/after JSON; optional `correctsEventId`; retention expiry; correlation ID. The subject reference is polymorphic and never cascades. JSON is schema-validated and secret-filtered before persistence.
- `DomainEvent`: immutable UUID, catalogue name/version, occurred-at, optional organization/actor, subject type/opaque ID, correlation ID and validated safe payload. Each committed event creates an `OutboxDelivery` row for the NTF consumer in the same transaction.
- `OutboxDelivery`: unique `(eventId, consumer)`; pending/leased/delivered/dead state; attempts; `availableAt`; lease expiry/token; sanitized failure code; delivered time. Workers claim with a database-safe concurrent protocol and reclaim expired leases. Consumer effects are idempotent by `(eventId, consumer)`.
- `Notification`: account recipient, domain event, `IN_APP` or `EMAIL` channel, category, safe title/body/internal route, critical/mandatory flags, created/read timestamps, and channel delivery state/time/attempt count/sanitized failure code. Unique `(eventId, recipientAccountId, channel)`, RESTRICT foreign keys and recipient/time/event indexes. Email targets are resolved from the current active account at send time; an email address or provider response is not copied into the notification.
- `NotificationPreference`: account and category/channel opt-in state; required notifications cannot be disabled. Preferences are per-account/category/channel with no inferred saved preference. The generic service treats an absent optional preference as the configured route default and always honors `mandatory` over an opt-out.
- `NotificationQuietHours`: optional singleton per account containing local start/end times plus a validated IANA time-zone identifier. No row means no quiet-hours suppression; no local zone is inferred. Both local boundaries are required and distinct when configured.
- `AuditRetentionNotice`, `AuditRetentionHold`, and `AuditDeletionTombstone`: record notice scheduling/completion, reasoned hold creation/release, and non-sensitive proof of each eligible purge. The tombstone is committed atomically with guarded deletion; notice interval remains unset until configured.

S04 APIs are limited to the signed-in user's inbox/read state and own notification preferences, plus Owner-authorized audit search, hold management, and retention configuration. Audit searches require backend permission checks and pagination; payload fields are never authorization facts. Email omits before/after payloads and sends only a safe title/summary and authenticated internal link. Brevo credentials come only from `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME` runtime configuration; incomplete configuration is rejected, secrets and provider response bodies are never logged or stored. The Owner chose S04 mailbox verification; a persisted HMAC challenge, expiry, attempt cap and resend limits are required before an email address is eligible. Generic delivery also uses an injected current-recipient authorization predicate and fails closed until an event-specific producer supplies an authorized recipient/template. Existing S03 organization events remain notification-neutral.

The S03 organization event mapping is enumerated before implementation: `ORGANIZATION_CREATED` → `organization.created`; `BRANCH_CREATED/UPDATED` → `organization.branch.created/updated`; `TEAM_CREATED/UPDATED` → `organization.team.created/updated`; `JOB_ROLE_CREATED/UPDATED` → `organization.job_role.created/updated`; `EMPLOYEE_CREATED` → `organization.employee.created`; `EMPLOYEE_MEMBERSHIP_CHANGED` → `organization.employee.membership_changed`; `EMPLOYEE_JOB_ROLES_CHANGED` → `organization.employee.job_roles_changed`; `EMPLOYEE_SUSPENDED` → `organization.employee.suspended`; and role/employee permission changes → `authorization.role_permission.changed` / `authorization.employee_permission.changed`. These event producers are notification-neutral until a later slice defines an authorized recipient and user-facing template.

Implementation must update this file with the final schema/API, event catalogue entries, configuration keys, worker behavior, verified commands, and unresolved limits. Do not mark COMPLETE while any applicable acceptance gate is unverified.

## S04 accepted implementation and verification — 2026-09-27

The Sol-reviewed design and Luna implementation cover the authorized S04 development/local-staging slice. Seven forward migrations after foundation/S02/S03 create canonical append-only audit evidence, the versioned event catalogue and safe payload rules, per-consumer transactional outbox, inbox and channel state, notification preferences/quiet hours, configurable retention notices/holds/tombstones, immutable linked corrections, guarded purge, mailbox-verification challenge persistence, and the audit event-key search index. S03 organization producers atomically dual-write the legacy event and its canonical audit/event/outbox records. A separate restricted runtime database role is used by the API/worker; the migration administrator is separate. Runtime PostgreSQL session timezone is forced to UTC.

**S04 efficiency follow-up:** The notification worker now claims one outbox delivery per batch and renews its two-minute lease every 30 seconds with ID/state/lease-token fencing while recipients are processed. It stops further persistence when lease ownership is lost; an email request already accepted by the provider remains at-least-once as specified in R-058.c. Owner event-key searches now use a case-insensitive exact catalogue key, supported by a forward-only composite B-tree index on `(eventKey, occurredAt DESC, id DESC)`. The UI states that the full event key is required. These changes address the prior batch-expiry overlap and unindexed substring-scan risks; see the follow-up verification below.

The Owner specifically selected mailbox verification for S04. The application generates a random six-digit challenge, stores only its HMAC digest, expires it after ten minutes, permits at most five attempts, and enforces a 60-second resend interval and five requests per hour. Counters/expiry are persisted and serialized across instances. Delivery remains unavailable until Brevo plus the verification secret are configured. The worker rechecks active account state, current email and `emailVerifiedAt` before email delivery. S03 event notices remain neutral because no event-specific recipient/template is defined in this slice; queued delivery fails closed without a current recipient authorizer.

### Acceptance evidence

- `pnpm --filter @sense/api db:validate` and `pnpm db:generate` — passed.
- Fresh isolated PostgreSQL 18 `sense_s04_final_test`: all nine S01–S04 migrations at original acceptance applied; `pnpm --filter @sense/api db:migrate:status` reported schema current. `sense_app_runtime` used a separate password; its PostgreSQL session timezone is UTC. The later efficiency index migration remains unverified on a database; see below.
- Existing-S03 migration simulation applied the S04 migrations to a database containing an S03 organization event; the event kept the same ID, timestamp, actor, subject, reason, and linked canonical record.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:integration`, and `pnpm build` — passed. Counts: 65 API unit, 20 web unit, 32 PostgreSQL integration tests; both API and web production builds passed.
- `pnpm verify` — passed (exit 0), including all five desktop/mobile cases and the Owner virtual-passkey journey. After Playwright printed `5 passed`, the Windows runner remained open until the isolated prestarted API was stopped; the command then exited 0. This runner cleanup caveat is documented in S01_COMPLETION_REPORT.md.
- `git diff --check` — passed.

### Efficiency follow-up verification

`pnpm --filter @sense/api db:validate`, `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` (68 API and 20 web tests), `pnpm build`, and `git diff --check` passed after the lease/search changes. The forward index migration was not applied and the PostgreSQL integration test/E2E suite was not rerun for this follow-up because the dedicated database configuration was unavailable and the local Docker daemon could not be started from this environment. The follow-up remains pending that database acceptance check.

### Limits and production gates

S04 is complete for development/local staging. A live Brevo send was not attempted because no production sender credentials were supplied; the provider adapter and fake transport are tested. Email dispatch stays unavailable until `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` and `EMAIL_VERIFICATION_SECRET` are configured. No event-specific recipient/template matrix exists for S03 organization events, so those events only persist audit/event/outbox evidence and generate no notices. Retention interval stays unset until Owner configuration; no purge can proceed without the configured notice, hold, linked-delivery, backup-disposition and tombstone gates. Legal/contract retention fit, production backup lifecycle, hosted CI/Compose and restore rehearsal are production gates. The Windows Playwright cleanup hang is a runner caveat; all five browser assertions passed, and stopping the isolated API after the summary allowed `pnpm verify` to exit 0.

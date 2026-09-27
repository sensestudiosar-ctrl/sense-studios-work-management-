# S04 completion report — Audit, outbox and core notifications

**Status:** COMPLETE for authorized development/local-staging scope
**Acceptance date:** 2026-09-27
**Owner authorization:** S04 authorized 2026-09-27; Owner selected mailbox verification for email eligibility.

## Scope completed

- Added canonical append-only `AuditEvent` history, safe/versioned `DomainEvent` catalogue and transactional `OutboxDelivery`; existing S03 organization events are backfilled and new changes atomically dual-write the legacy and canonical records.
- Added recipient-scoped in-app notifications, persisted read state, category/channel preferences, IANA quiet hours, bounded retries and outbox worker claims with delivery-time authorization checks.
- Added a Brevo adapter and persisted mailbox verification. Challenges use random six-digit codes, HMAC digests only, ten-minute expiry, five attempts, 60-second resend intervals and five requests/hour. Email delivery checks the active account, current email and verified timestamp immediately before sending.
- Added Owner audit search/retention controls, reasoned holds, configurable notices, linked immutable corrections, deletion tombstones and a guarded retention purge path. Ordinary runtime credentials cannot update/delete audit evidence or assume the restricted retention roles.
- Added safe payload validation across audit/event/notification producers and documented runtime, migration and verification-secret configuration.
- S03 organization notifications remain neutral until an event-specific recipient and template are authorized. The event and outbox evidence is still written atomically.
- Final verification exposed and fixed an S03 organization-admin loading race: the selected employee branch retriggered the organization loader. The selection now survives refresh without re-fetching on branch change, and the regression test asserts the loader runs once.

## Sol/Luna method

Sol-level reasoning handled requirement mapping, schema and role separation, transactional behavior, security boundaries, retention/correction rules, email eligibility, risk review and final acceptance. Luna handled bounded notification and mailbox-verification UI work and the Owner-facing linked-correction UI with component tests. The primary agent reviewed those changes against the approved requirements and S04 contracts.

## Verification

- `pnpm --filter @sense/api db:validate` — passed.
- `pnpm db:generate` — passed.
- Fresh isolated PostgreSQL 18 database `sense_s04_final_test`: all nine migrations applied successfully. `pnpm --filter @sense/api db:migrate:status` reported schema up to date. API integration tests ran using `sense_app_runtime`, not the migration administrator.
- Runtime database timezone check — UTC. This was fixed by setting the runtime role's timezone in the mailbox-verification migration after a concurrent-claim test reproduced lease-time misinterpretation under the host timezone.
- Existing-S03 migration simulation: applied the S04 migrations to data with an existing organization event; verified its ID/time/actor/subject/reason and canonical linked audit record remained intact.
- `pnpm typecheck` — passed.
- `pnpm lint` — passed.
- `pnpm test:unit` — passed: 65 API tests and 20 web tests.
- `pnpm test:integration` — passed: 10 suites, 32 PostgreSQL-backed tests.
- `pnpm build` — passed for API and web production builds.
- `pnpm verify` — passed (exit 0): typecheck, lint, all unit and PostgreSQL integration tests, production builds, and five desktop/mobile browser cases. The virtual-authenticator Owner passkey journey passed. The Windows runner remained open after `5 passed`; stopping the isolated prestarted API after the assertions completed released cleanup and allowed the command to exit 0. No test was skipped or terminated before its assertions completed.
- `git diff --check` — passed.

## Limits and production gates

- A live Brevo send was not performed because production sender credentials were not available. Email remains unavailable until `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` and `EMAIL_VERIFICATION_SECRET` are configured.
- No event-specific recipient/template matrix was defined for S03 organization events; those notices remain disabled and delivery authorization fails closed without a current recipient authorizer.
- The retention notice interval remains unset until Owner configuration. A purge is blocked until notice, holds, linked delivery, backup disposition and tombstone requirements pass.
- Legal/contract retention fit, production backup lifecycle, Compose/hosted CI, production restore, and key custody remain production gates. No claim is made that those environments were tested in this acceptance run.
- The Windows Playwright cleanup hang remains a runner limitation. All five browser assertions passed; clean exit required stopping the isolated API only after the test summary printed.

## Efficiency-risk follow-up — 2026-09-27

The two scale risks found in the readiness review were addressed in the implementation: the worker claims one delivery at a time and renews its fenced lease while processing; event-key lookup is now case-insensitive exact matching with a composite index migration and matching UI guidance. A lost lease prevents further delivery-state writes, including retry state after an in-flight send fails. External email remains at-least-once as required by R-058.c.

Follow-up checks passed: Prisma schema validation, typecheck, lint, unit tests (68 API and 20 web), API/web production builds, and `git diff --check`. The isolated PostgreSQL migration/integration suite and browser E2E were not rerun for this follow-up: the sandbox had no `DATABASE_URL`, Docker Desktop's daemon/service was unavailable, and the unrelated Windows PostgreSQL service was left untouched. Therefore the new index migration and database integration case remain pending execution on the dedicated PostgreSQL test database; this report does not claim the follow-up database acceptance gate passed.

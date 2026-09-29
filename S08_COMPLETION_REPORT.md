# S08 completion report

Date: 2026-09-28. Scope: authorized development/local staging. **S08 COMPLETE for development/local staging.** S09 and later remain unauthorized.

## Delivered scope

R-014.a–b, R-015.a–b, R-016.c and the supported R-017.a–d structure are implemented. Design has the approved 11 default stages; Turnkey has the approved 10. Reusable organization templates contain delivery type, ordered service scopes/stages/milestones, required flags, optional target-day offsets, logical folder intent and optional naming convention. Unsupported future configuration is rejected.

Owner or explicitly organization-granted template managers create templates and immutable numbered versions with reasons and canonical evidence. A project retains its exact selected version and definition snapshot. Project creation remains Owner-only and preserves direct/Won conversion behavior. One transaction persists the project, baseline scopes, applied plan, items, retry receipt, canonical audit, domain events and outbox. Identical retries return the original project; conflicting payload reuse is denied.

An assigned current Project Lead or explicitly granted assigned staff can complete Active plan items with reason, current project version and immutable actor/time evidence. Required milestones block project completion. Owner or explicitly authorized Team Leader with current project access, project.manage and project.gate_override may complete projects; a missing-milestone override requires an explicit command flag and reasoned retained evidence. Other lifecycle and formal scope-approval gates remain enforced. Team Leader authority follows explicit permission grants, not job-title inheritance.

UI covers organization template management, version selection, Draft creation, applied version and ordered plan display, loading/empty/denied/error/retry states, stale-response protection, reasoned progress and authorized overrides. Template management works independently of project branch access. Successful project creation clears template selection; retries retain a stable key for the same payload.

## Verification evidence

Environment: Windows, Node 24.19.0, pnpm 11.19.0, PostgreSQL 18.6, isolated loopback test cluster on port 56508. Frozen offline dependency install passed using the existing D:\.pnpm-store. Prisma generation, schema validation and migration status passed. Twenty migrations deploy successfully on fresh dedicated test databases.

An S07 baseline database was seeded through the existing project service with accounts, session, project, scopes, status history, audit and approval data. All four S08 migrations applied; SHA-256 checksums of complete ordered row JSON across accounts, sessions, projects, project_scopes, project_status_changes, audit_events and approval_requests remained unchanged. This rehearsal does not assert coverage of every possible existing production row.

Focused S08 PostgreSQL coverage passed four tests including strict immutable versions/snapshots, template permission boundaries, identical/conflicting retry, required gates, explicit completion grants, suspended/revoked access, On Hold blocking, optimistic conflicts, immutable evidence and direct SQL bypass rejection. Deferred constraints were forced immediate before fixture rollback.

`node scripts/check-s08-concurrency.mjs` passed on a separately migrated empty test database: simultaneous identical creates return one project/plan/receipt/item, conflicting reuse is rejected, concurrent new versions serialize to numbers 2 and 3, the original applied version is preserved, and failed creation rolls back its receipt before corrected retry succeeds. An injected audit-insert failure after structure creation also rolls back all project/plan/receipt rows, followed by a successful corrected retry. The script intentionally preserves its dedicated test fixtures and requires an empty local _test database.

Desktop/mobile S08 browser acceptance passed: template and required milestone creation, selected-version project creation, reload persistence, assignment/lead setup, required milestone 409, recorded completion, final project completion and persisted database assertions. Both check no horizontal overflow; mobile plan screenshot was visually inspected.

Final `pnpm verify` exited 0 against pristine sense_s08_acceptance_20260928_test: typecheck, lint, 97 API unit tests across 17 suites, 47 web unit tests across 7 files, 79 API/PostgreSQL tests across 19 suites, contracts/API/web production builds, and all 11 Playwright cases. The real identity dependency plus desktop/mobile business checks all ran. Services were prestarted explicitly; no Windows cleanup workaround was needed in this final run.

## Defects corrected during verification

- Database event catalogue initially omitted S08 producers; a forward migration adds them and deferred canonical completion/override evidence guards.
- PL/pgSQL status ambiguity and plan insertion checks interfering with same-transaction lifecycle progression were reproduced and corrected in forward migrations. Applied migrations were preserved.
- Direct SQL item date/baseline mutation and unaudited completion/override paths are now guarded and regression-covered.
- UI parent mocks were updated to supply the newly visible template endpoint; an accessible label and a hidden option locator were corrected without weakening behavior assertions.
- The identity browser fixture deleted its temporary Owner while parallel S08 tests used it. Playwright now completes the real identity dependency first; business tests use a separate ready single-Owner fixture and independent sessions. The virtual-authenticator identity journey remains required.
- An incorrectly formatted test environment file and reuse of a database with old notification outbox fixtures caused failed runs. Final acceptance uses a pristine database with UTC timezone. These failures were classified as harness/environment issues; no production behavior or valid assertions were weakened.

## Review and limits

Root retained requirement interpretation, schema/transaction and permission design, difficult debugging, database safeguards and final acceptance review with Sol-level reasoning. Actual gpt-6-luna agents handled bounded defaults, initial template service/UI/tests and supporting documentation; root reviewed and corrected integrated output. This is the requested Sol/Luna flow, not a claim that the root model was automatically changed.

No S09 work, task execution, review/client approval decisions, procurement/financial processing, SOP runtime, physical NAS provisioning, notifications/report/automation execution or effective cancellation is delivered by S08. Folder names are planned intent only; stage labels are not formal approval evidence. S08 changes have not run hosted CI, Compose or production NAS checks and are not deployed. Existing production gates remain in the earlier completion reports. PostgreSQL adapter concurrency checks emitted the existing pg deprecation warning about queued client queries; current acceptance passes, but a future pg major upgrade needs separate review. The unrelated existing app.tsx passkey-error edit was preserved.


Final cleanup: temporary baseline migration copies were removed after verifying the exact workspace path. The isolated API, web and test PostgreSQL processes were stopped; test database files and ignored local verification settings were preserved. git diff --check and focused ESLint on the additional concurrency script passed after final documentation updates.
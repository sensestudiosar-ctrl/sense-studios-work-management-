# S15 progress report — 2026-10-01

Current status: COMPLETE for development/local staging; see final acceptance below and S15_COMPLETION_REPORT.md. The following initial IN PROGRESS checkpoint is historical. Owner policies are settled; the pending-choice discussion below is a historical checkpoint superseded by S15_SPEC.md and the continuation note. The Owner requested “Start and complete S15 using our Sol 6.1 and Luna 6 methodology”, authorizing S15. S16 and later remain unauthorized. No S15 application implementation or completion is claimed at this checkpoint.

## Context and decisions

GPT-6.1 Sol (`gpt-6.1-sol`) performed routed context intake and focused documentation review. GPT-6 Luna (`gpt-6-luna`) performed bounded specification/status documentation and baseline work. These are actual agent model selections, not a claim that routing changes an already-running chat model.

S15_SPEC.md expands R-040.a–c and records dependencies, boundaries and provisional acceptance. CURRENT_STATE.md, IMPLEMENTATION_STATUS.md and IMPLEMENTATION_PLAN.md record S15 authorization and pending decisions. S11 and S14 are the completed dependencies for development/local staging.

The Owner confirmed that only the Owner may approve, publish or withdraw public portfolio content. Every such action requires a recorded reason and audit history. The approved architecture requires a distinct public derivative and persistent publication grant; internal files never publish automatically.

Two Owner questions remain pending at this checkpoint:

1. Should private galleries curate only existing exact S14 PDF/image items under current client item grants, or also support new gallery-only entries with a separately approved sharing policy?
2. Should Confidential sources be prohibited and public derivatives remain published until explicit Owner withdrawal, including after cancellation, or should an alternative declassification and/or cancellation-withdrawal policy apply?

AGENTS.md, “Before changing code”, rule 2 requires: “Ask the owner to decide unspecified behavior that materially affects workflow, ownership, access, approvals, calculations, notifications, audit or destructive actions.” The unresolved choices change client/public access and publication transitions. Dependent schema, permissions and application behavior therefore remain unimplemented while the Owner answers. No unanswered choice has been treated as approval.

## Preliminary verification evidence

The primary agent reported the following baseline results; these are preliminary existing-code checks, not S15 acceptance:

- Node 24.19.0 was confirmed. Default `pnpm` resolved to 11.25.0, while `corepack pnpm --version` returned required 11.19.0.
- `corepack pnpm install --frozen-lockfile` passed for all four workspace projects; dependencies were already current.
- An initial verification attempt stopped before checks because nested script calls resolved the default pnpm version. A temporary process-local PATH shim selected the pinned Corepack pnpm without repository configuration changes.
- The subsequent baseline passed typecheck and lint, 25 API unit suites / 154 tests, and 11 web unit files / 82 tests.
- Integration results were 16 suites / 90 tests passed and 19 suites / 86 tests skipped. Missing slice-specific database environment variables prevent these skips from counting as persistence verification.
- Production builds passed. Browser acceptance lacked DATABASE_URL; no successful E2E result is claimed.

Luna completed baseline environment setup after the preliminary checks. The preserved, documented temporary PostgreSQL 18.6 cluster was recovered running on `127.0.0.1:56433`. Three previously absent dedicated test databases were created: `sense_s15_baseline_20261001_test`, `sense_s12_s15_baseline_20261001_test` and `sense_s13_s15_baseline_20261001_test`. Each received all 69 existing reviewed migrations successfully. These are fresh baseline deployments; no S15 schema or migration was created, and no retained-data upgrade preservation is claimed.

A gitignored `.env.s15-baseline.test` was created with isolated NAS fixtures and E2E API/web ports 4015/5185. `DATABASE_URL` and `S15_DATABASE_URL` point to the dedicated S15 database; S12 and S13 point to their own databases. Secret values are not reproduced here. During the initial database-enabled baseline, `S14_DATABASE_URL` was unset because the client-review suite requires a `sense_s14_*_test` database on port 56434. A separate isolated PostgreSQL 18.6 cluster on that port was subsequently prepared; the env file now contains the valid S14 URL and cluster path.

The database-enabled `pnpm verify` baseline was then run with Node 24.19.0, pnpm 11.19.0 and the process-local Corepack shim. Typecheck (including Prisma Client generation from the pre-S15 schema), repository lint, 154 API unit tests and 82 web unit tests passed. Integration ended with 31 suites passed, one failed and three skipped; 150 tests passed, one failed and 25 skipped. The failing case is `apps/api/src/revision.database.api.spec.ts`, “issues only exact approved current evidence, records named acknowledgement, and supersedes without losing history”: its S12 downstream-evidence fixture is rejected by the S14 `Client revision fact requires Primary final overall batch` database guard. No source fix was made. The skipped suites include database suites whose slice-specific environment was not enabled; S14 was not verified. Since `pnpm verify` is fail-fast, production build and Playwright E2E were not reached in this run. No E2E pass or failure is claimed.

At this earlier checkpoint, the S15 migration had not yet been created or deployed. That statement is superseded by the migration and preservation evidence below.

## S15 migration and retained-data verification — 2026-10-02

Owner approval for the three S15 policy choices was received before deploying the reviewed migration `20261002000000_s15_galleries_publication`. A separate PostgreSQL 18.6 cluster was initialized with the existing local test role, loopback-only on port 56434; the preserved cluster on port 56433 and all existing databases were left intact. The new strict-guard database is `sense_s14_s15_baseline_20261002_test`.

The S14 identity, current portal scope/private references, and client review database suites passed 25/25 tests on that database after applying the existing 69 migrations. Before S15, the data snapshot covered 101 tables and 1,453 rows. After S15 migration, all old-table row counts and ordered old-column digests matched.

The reviewed S15 migration was applied to the existing dedicated databases without resetting them. Pre/post snapshots verified every prior table row count and ordered old-column digest:

- `sense_s15_baseline_20261001_test`: 69 → 70 migrations; 101 tables, 22 rows preserved.
- `sense_s12_s15_baseline_20261001_test`: 69 → 70; 101 tables, 875 rows preserved.
- `sense_s13_s15_baseline_20261001_test`: 69 → 70; 101 tables, 1,180 rows preserved.
- `sense_s14_s15_baseline_20261002_test`: 69 → 70; 101 tables, 1,453 rows preserved.

A distinct empty database, `sense_s15_fresh_20261002_test`, accepted the complete 70-migration chain from scratch. Prisma schema validation passed, and `db:migrate:status` reported all 70 migrations current on the four upgraded databases and the fresh database. `.env.s15-baseline.test` now records `S15_DATABASE_URL`, `S15_FRESH_DATABASE_URL`, and the strict port-56434 `S14_DATABASE_URL`; values are not included in this report. Ordered digest snapshots remain in the user temp directory under `sense-s15-pre-*-20261002.json`.

These checks verify schema deployment and retained-data preservation, not whole-slice S15 completion. The prior fail-fast `pnpm verify` record above remains the latest full-repository run; build and E2E were not reached there. The root agent will run full gates after implementation tests are ready.

Whole-slice completion still requires S15 behavior tests, persisted desktop/mobile journeys, and all applicable repository gates.

## Next work and limits

Owner choices and the Sol schema/security contract are settled. Complete bounded backend/frontend regression tests and persisted browser journeys, then perform Sol security and acceptance review against the full repository gates. Preserve the extensive existing S13/S14 working-tree changes and retained data. Record exact completed checks and any unrelated failures before claiming acceptance. Production NAS, hosted CI, deployment, offsite backup/key custody and production restore are not verified by this checkpoint.

## Resumed implementation checkpoint — 2026-10-01

Exact GPT-6.1 Sol performed restored context intake and security review. The trusted Owner continuation policies are explicit: Owner-only reasoned public approval/publication/withdrawal; private galleries curate existing explicitly granted exact S14 PDF/image items; Confidential source documents and any Confidential ancestor folder are blocked; independent published derivatives persist project cancellation until Owner withdrawal. Earlier pending-policy wording is historical and superseded.

The additive S15 schema/migration, backend services/controllers, sanitized derivative preparation, grant/event catalogue integration, NAS reconciliation references, Owner/private/public UI and initial unit/database tests are present in the preserved working tree. Implementation presence is not acceptance. The root agent's resumed full verification stopped at web gallery test type inference; the bounded frontend agent is correcting that test. Backend sanitizer verification also exposed retained image density metadata, requiring a clean pixel reconstruction and regression checks before accepting sanitized derivatives.

Remaining acceptance includes exact private grants, expired/revoked/cross-project access, cancellation issued-only rules, public persistence through cancellation, immutable evidence/tamper/rollback checks, withdrawal during derivative loading, responsive persisted browser journeys and a final successful full repository gate. No successful resumed full verification or S15 completion is claimed at this checkpoint. Production NAS/hosted CI/deployment/offsite backup/key custody/restore remain unverified.
## S15 follow-up migration verification — resumed continuation

Real PostgreSQL acceptance exposed two implementation defects: the database event catalogue omitted the four S15 event names, and the shared deferred evidence trigger resolved grant-only NEW fields when invoked for a gallery entry. A rolled-back SQL diagnostic returned PostgreSQL 42703, `record "new" has no field "publicationId"`, at the compound grant predicate. Sol created additive migrations `20261002010000_s15_event_catalogue` and `20261002020000_s15_evidence_record_guard`. The first preserves the prior event CHECK expression and admits exactly four S15 events. The second nests grant validation under its table branch; every authority/canonical evidence requirement remains intact. Already-applied migrations were not rewritten.

Both follow-ups deployed successfully to all five retained isolated databases. Existing-row counts and ordered old-column digests across all 104 tables matched before/after each deployment (excluding migration history): main S15 309 rows at 70→71 and 452 at 71→72; S12 875, S13 1,180, strict S14 1,453 and prior fresh S15 one row at both transitions. Main fixture counts increased between deployments because acceptance retries added isolated records; each migration comparison was unchanged. Preservation snapshots use `sense-s15-event-pre-*` and `sense-s15-record-pre-*` files in the user temp directory.

A separate empty `sense_s15_fresh72_20261002_test` database on loopback PostgreSQL port 56433 accepted the entire 72-migration chain from scratch; `corepack pnpm --filter @sense/api db:migrate:status` reported up to date. Retained databases were not reset. These successful migration checks do not constitute whole-slice S15 acceptance; behavior and full gates remain pending.

## General regression database isolation correction

The root agent's resumed integration run reported nine failed/27 passed suites and 23 failed/154 passed tests. General DATABASE_URL suites construct a temporary Owner inside rollback transactions and expect no persisted Owner/history; using the retained S15 fixture database therefore caused `accounts_one_owner_key` and historical-fixture collisions. This is classified as test-environment isolation, not a reason to delete acceptance records, weaken uniqueness or change valid rollback tests.

Sol prepared a separate empty `sense_s15_verify_20261001_test` on the existing loopback 56433 cluster, applied all 72 migrations and confirmed current status. After the failed run ended, only DATABASE_URL in the ignored `.env.s15-baseline.test` was changed to this new general regression database. S15_DATABASE_URL and dedicated S12/S13/S14 URLs remain unchanged. All retained fixture data and earlier fresh-chain evidence remain intact. A corrected full verification result is pending.

The corrected-isolation full verification subsequently passed typecheck/lint, 160 API unit, 86 web unit and all 36 PostgreSQL suites/177 integration tests with no integration skips, plus production builds (primary agent report). Browser execution overlapped a separate targeted run on the same server ports, causing identity-dependency timeout; it was cancelled with 28 dependent cases unrun. Clean server/database isolation and completed browser acceptance remain pending. No successful full verification exit is claimed.

## Reproducible browser bootstrap diagnosis and final isolation

A clean browser rerun still failed before passkey registration: retained trace showed `/api/v1/auth/bootstrap/options` HTTP 403 and the initial setup page. Sol queried the isolated general database and found an active `s15-gallery-owner-*` fixture account; S02 cleanup targets only its own canonical bootstrap email, so the existing Owner correctly closed bootstrap. This failure is distinct from Windows server cleanup or slow passkeys. No authentication permission, cleanup safeguard or timeout was weakened.

Sol created another separate empty `sense_s15_final_verify_20261001_test`, applied all 72 migrations and confirmed current status. The ignored general DATABASE_URL now points there; prior fixture/verification databases remain retained. Targeted S15 browser work uses its dedicated S15_DATABASE_URL and separate API/web ports. The frontend agent reports the latest dedicated desktop/mobile journeys both passed, with overflow checks and captures for Owner, populated client gallery, published portfolio and withdrawal. Final full verification remains pending.

## Full browser fixture compatibility checkpoint

The next full verification passed all pre-browser gates again, but browser results were 18 passed, five failed and six skipped. Identity passed. Two internal-review cases rejected the general database's S15 test prefix under their older S13-only safety allowlist. Three task/date assertions examined the default Owner task after reload rather than reselecting their persisted fixture; database completion/date evidence remained correct. These are browser fixture compatibility/selection defects, not a basis for changing task or approval rules.

Sol approved bounded test-only fixes: preserve loopback/port/test-name restrictions and existing S14/S15 explicit opt-ins while admitting the combined S15 acceptance test database; retain no-live-Brevo safeguards; reselect exact fixture tasks after Owner reload before existing state/date assertions. No production permissions, database evidence, assertion expectation or identity dependency is weakened.

A separate empty `sense_s15_full_acceptance_20261001_test` accepted all 72 migrations and reports current. The ignored general environment points there with explicit S14/S15 browser flags and blank Brevo sender credentials. Dedicated persistence-suite URLs remain unchanged. Earlier fixture databases are retained. Final successful full verification is still pending.

## Final acceptance continuation and separate S06 CRM race

The resumed full verification passed typecheck, repository lint, 160 API unit tests, 86 web unit tests, all 36 PostgreSQL integration suites/177 tests with no skips and production builds (primary agent report). Its browser phase finished 28 passed/one failed: the dependency desktop fixture did not reselect its exact dependent task after reload. Sol added that reselection and a heading assertion while retaining all warning/state/database evidence assertions; focused ESLint passed. This full `pnpm verify` did not exit successfully and is not reported as a pass.

A fresh browser-only run subsequently passed 28 cases, including both persisted S15 journeys, but exposed a separate existing S06 CRM setup race. Trace evidence shows duplicate setup requests, two empty list responses, successful lead creation (HTTP 201), then a populated list response (one lead); the late setup response invalidated the mutation's branch generation, so the UI retained zero leads despite “Changes saved.” R-010.a–d correction scope is recorded in IMPLEMENTATION_PLAN.md. GPT-6 Luna added a setup request generation guard and deferred StrictMode regression, reviewed by GPT-6.1 Sol. With the guard removed the regression failed (three list requests instead of two); after restoration the focused CRM suite passed 11/11 and focused ESLint exited 0. A premature broader web test run had an unrelated task notice assertion failure and is not counted as passing. Final web gates and all-29 browser acceptance remain pending at this checkpoint.

Every resumed browser database was separately created with all 72 reviewed migrations and zero Owner accounts before bootstrap; prior fixture data remains retained. Reusing a populated browser database closes bootstrap under the existing one-Owner rule, so fresh full-browser acceptance must use a new empty dedicated database. No authentication safeguard was weakened.

## S15 final acceptance — 2026-10-01

S15 is COMPLETE for development/local staging. R-040.a–c provide private curation of existing exact granted S14 PDF/image items and explicitly reasoned Owner publication/withdrawal of separate sanitized PNG derivatives. Confidential sources and ancestors are denied; public publication persists cancellation until Owner withdrawal. All 72 migrations passed fresh deployment and retained-data preservation. Aggregate final gates passed: typecheck, repository lint, 160 API unit tests, 87 web unit tests, 36 PostgreSQL suites/177 integration tests without skips, production builds and all 29 desktop/mobile browser cases without skips or retries. The last full pnpm verify had passed pre-browser checks but ended with 28 browser passes/one fixture failure; after the fixture correction and separately reproduced S06 CRM race correction, affected web gates and final pnpm test:e2e passed. No successful exit of that earlier pnpm verify is claimed. See S15_COMPLETION_REPORT.md for evidence and limits. Actual routing used GPT-6.1 Sol and GPT-6 Luna. S16 onward remain unauthorized; hosted CI/deployment and production NAS/backup/key custody/restore are unverified production gates.

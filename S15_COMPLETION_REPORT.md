# S15 Galleries and publication — completion report

Status: COMPLETE for development/local staging. Owner-authorized R-040.a–c and applicable aggregate quality gates are verified. Production deployment/hosted CI/NAS gates remain unverified.

## Authorized behavior

R-040.a–c implement Owner-authorized project galleries and public portfolio publication. Private galleries curate existing exact S14 PDF/image review items under current project/item grants; they introduce no new sharing permission. Exact snapshots, current/superseded revisions and cancelled-project issued-only/per-client-expiry rules remain enforced through S14 authorization and file services.

Only the Owner prepares, publishes or withdraws public derivatives, with reasons and canonical audit/domain/outbox evidence. A separately supplied single-frame PNG/JPEG/WebP is decoded, oriented, reconstructed from pixels and stored as an independent PNG, bounded to 8 MiB input/output and 40 million pixels. Source documents and Confidential ancestor folders cannot be public sources. Public publication persists project cancellation until Owner withdrawal. Anonymous responses expose approved title, alternative text, media type and derivative URL, without private source/project/client/storage metadata.

Publication content is immutable; DRAFT/version 1 → PUBLISHED/version 2 → WITHDRAWN/version 3 advances through expected-version commands and append-only grants. Public reads verify distinct derivative storage, persistent grant/state, source eligibility and exact stored size/checksum, then recheck authorization after loading bytes. A withdrawal committed during loading denies that response. Bytes already authorized and delivered cannot be recalled.

## Verification currently established

- Required Node 24.19.0 and Corepack pnpm 11.19.0 are confirmed. The primary agent reports the latest frozen install, typecheck and repository lint passed. Express 5.2.1 is now a direct pinned API dependency for the scoped JSON parser; Sharp 0.35.5 is pinned for sanitization.
- Sol deployed the S15 records migration and two additive corrections: exact S15 event catalogue extension and safe table-specific deferred evidence field resolution. Existing migrations were not rewritten. All five retained test databases accepted 70→71→72 with all 104 existing-table row counts/ordered old-column digests preserved; exact counts and original 69→70 evidence are in S15_PROGRESS_REPORT.md.
- A separate empty `sense_s15_fresh72_20261002_test` accepted all 72 migrations from scratch; Prisma migration status reports current.
- The bounded backend agent reports the final focused S15 PostgreSQL acceptance test passed. It exercises exact Additional view grants/revocation/expiry, non-Owner preparation denial, immutable gallery/publication mutation denial, distinct sanitized bytes, Confidential-source preparation denial, one-winner publication concurrency, derivative corruption denial/restoration, public persistence through cancellation, private unissued-item cancellation denial, reasoned retained grants and withdrawal during a paused NAS read followed by denial at the final recheck.
- The bounded backend agent reports six focused unit tests passed: metadata removal/malformed raster rejection, source/ancestor Confidential fail-closed checks and controller session/origin/CSRF/client-cookie/public-route boundaries. Confidential-after-publication coverage uses mocked read state because existing S11 policy immutability prevents changing document/folder confidentiality in the database; no existing guard was disabled.
- The bounded frontend agent reports 12 focused gallery/client-review UI unit tests passed. Persisted browser journeys and final integrated counts remain pending.

The S14 client-review PostgreSQL acceptance separately verifies positive issued-file streaming after cancellation. Gallery streaming delegates to that exact S14 file service; this is inherited evidence, not a newly run gallery-specific issued-file positive test. Mutation-denial rollback was exercised; no injected audit-failure acceptance test is claimed.

## Defects resolved during acceptance

Initial verification exposed web test inference/response fixture failures, premature refresh notices, source image density metadata surviving the first sanitizer, missing database S15 event names, grant-only record resolution in the shared deferred trigger, absent isolated Owner fixture, general rollback-test database collisions and API startup requiring a direct Express dependency. Bounded fixes retain approved access/evidence rules. SQL PostgreSQL 42703 was reproduced inside a rolled-back transaction before the additive trigger correction.

## Acceptance and limits

Final aggregate acceptance passed: typecheck, repository lint, 160 API unit tests (27 suites), 87 web unit tests (12 files), all 36 PostgreSQL integration suites/177 tests without skips, production builds and all 29 desktop/mobile Playwright cases without skips or retries. The last full pnpm verify passed pre-browser checks and ended with 28 browser passes/one dependency fixture failure; it did not exit successfully. After exact task reselection and the independently reproduced S06 CRM setup race correction, affected web gates passed and final pnpm test:e2e exited 0 with all 29 cases in 41.8 seconds. Existing S13/S14 work and retained test data were preserved. S16 onward remain unauthorized.

Production NAS validation, hosted CI/deployment, offsite encrypted backup, key custody and production restore are not verified by this local work. Published images cannot be recalled from prior downloads. Public derivative/source separation is an application authorization and storage boundary, not a claim that published bytes are secret.

## Actual models

GPT-6.1 Sol (`gpt-6.1-sol`) performed routed/restored intake, schema/security decisions, migration diagnosis/deployment, evidence documentation and review. GPT-6 Luna (`gpt-6-luna`) performed bounded backend, frontend and test implementation. This reports actual agent selections; it does not change the already-running chat model or claim a measured 70/30 token ratio.

## Historical full-gate checkpoint — superseded by final acceptance below

The primary agent reports corrected-isolation `pnpm verify` passed typecheck, repository lint, 160 API unit tests, 86 web unit tests, all 36 PostgreSQL integration suites/177 tests with no integration skips, and production builds. The browser phase collided with a concurrently running targeted server on the same ports and was cancelled after the identity dependency timed out; its 28 dependent cases did not run. This is not a successful full `pnpm verify` or browser acceptance result. Clean isolated server/database browser runs and final gate completion remain required before marking S15 COMPLETE.

## Final Sol acceptance review — 2026-10-01

GPT-6.1 Sol reviewed the settled Owner policies, current authorization/storage boundaries, exact-session fixture isolation and the bounded CRM correction. No remaining blocker was found for development/local staging. Final browser result is 29 passed, zero skipped/retried, exit 0; `.last-run.json` records passed with no failed tests. Both S15 persisted Owner/client/public publication/withdrawal journeys passed at desktop/mobile widths; the eight final screenshots remain under `test-results/gallery-Owner-curates-exac-d9d88-persists-through-withdrawal-{desktop,mobile}-chromium/` (`s15-owner-gallery.png`, `s15-client-gallery.png`, `s15-portfolio-published.png`, `s15-portfolio-withdrawn.png`). Prior responsive captures were visually inspected; final journeys retain overflow assertions.

The separate existing S06 defect (R-010.a–d) was a late duplicate CRM setup response invalidating a successful lead creation list refresh. Actual trace proves POST 201 and populated list total 1 while the UI retained zero. GPT-6 Luna added a latest-setup generation guard and deferred StrictMode regression; it failed without the guard (three list requests instead of two) and passed with it (11 focused CRM tests). GPT-6.1 Sol reviewed it. Final all-web suite passed 87 tests after the correction, plus typecheck, repository lint and production builds. No CRM schema, access or stage rules changed.

The preceding failed/reused-database browser runs remain historical evidence. Fresh final acceptance used a separately created dedicated database with all 72 migrations and zero Owners before bootstrap; populated fixture databases were not reset. Aggregate gate completion is reported accurately rather than claiming the earlier full pnpm verify exited 0. Production NAS, hosted CI/deployment, encrypted offsite backup, key custody and production restore remain unverified gates; S16 is unauthorized.

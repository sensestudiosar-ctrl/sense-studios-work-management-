# S20 Site progress, reports and snags — completion report

**Status: COMPLETE for development/local staging (2026-10-04).** Backend, additive schema/migrations, staff API, responsive UI, focused persistence/security tests, and aggregate acceptance passed. Sol completed source/schema/permission/evidence/concurrency and visual review and accepted this scope. Production and actual-project R-105 gates remain outside this completion.

## Scope implemented

The internal `/api/v1/site` API provides accessible Turnkey project reads and reasoned, version-checked commands for responsible-person appointment; package creation/progress/explicit completion; factual manpower; daily-report drafts/confirmation; snag creation, fixer assignment, repair, independent verification and separate closure; and separate site handover. The responsive workspace presents these workflows and consumes S19 operational material/release data and S17 scoped attendance through public service ports.

The controller requires internal session/Owner readiness, applies no-store to reads and same-origin CSRF checks to writes, and validates strict request schemas, UUIDs, actual calendar dates, bounded decimals, arrays, and common version/reason fields. The service rechecks current identity/session, employee, project assignment/cross-branch authorization, permission grants and Active Turnkey status in locked transactions. Every mutation uses the project workspace version.

Three additive migrations create four models: `SiteWorkspace`, `SiteRecord`, append-only `SiteHistory`, and immutable `SiteVerificationAttempt`. Deferred SQL guards bind current records to scoped versions, exact history, canonical audit/domain-event/outbox evidence, allowed states and immutable repair/verification decisions. There is no command-replay receipt model. Reports are confirmed only by the current responsible person and retain progress snapshots. Failed verification retains its attempt and repair evidence while returning the same snag to repair; only a current independent verifier may decide a repair, and management closure is a separate command. Handover records current package/quality/snag gate snapshots without granting client acceptance or completing the project.

Document evidence reuses existing immutable DOC records and reauthorizes access, including Confidential ancestry, on selection and reads. Site-only readers see a hidden-evidence marker without file identity or metadata when access is absent. Site history dates serialize as ISO-8601 strings. Manpower counts remain factual observations; the read-only S17 attendance port does not introduce payroll/capacity calculations or modify Workforce records.

## Verification recorded

- Combined S16/S17/S19 dependency acceptance was satisfied before S20 business implementation, as recorded by the coordinating run.
- The coordinating run reports Prisma generation/schema validation passed, 90 migrations applied on fresh test databases, and no pending migrations on the retained populated S19 database. Its 108-table snapshot preservation check passed.
- The latest focused S20 API run passed 2 suites/11 tests: eight PostgreSQL cases in `site.database.api.spec.ts` and three controller cases in `site.controller.api.spec.ts`. Coverage includes responsible-person-only report confirmation, immutable confirmation snapshots, package quality/completion, independent failed/reworked/passed snag verification, separate closure/handover, stale-version and assignment revocation, held/cancelled write denials, client/branch/guessed-ID denials, rollback, confidential-photo redaction, session/OwnerReady, no-store, origin/CSRF, strict parsing, all mutation routes, and canonical history/audit bindings.
- The final fresh aggregate `pnpm verify` exited 0: typecheck, lint, 172 API unit tests, 112 web unit tests, 220 PostgreSQL integration tests across 42 suites, production builds, and 37 desktop/mobile Playwright cases; no skips or retries. Nine fresh test databases received all 90 migrations. The retained populated S19 upgrade had no pending migrations and its 108-table snapshot preservation passed. The final site browser captures were inspected by Sol.

## Verification history and remaining gates

Earlier aggregate attempts are retained here for accurate classification, not as acceptance evidence: one run completed with 34 browser passes and 3 failures (two task-extension timezone/reload fixture races and one client-review `ERR_NO_BUFFER_SPACE` browser infrastructure error); its reused-database retry failed 22/220 integration cases across 8 suites because persisted browser Owner bootstrap data violated the singleton-Owner fixture precondition. No valid test or permission was weakened. The fresh final run then passed with exit code 0: all 172 API unit, 112 web unit, 220 PostgreSQL integration, and 37 desktop/mobile browser tests, plus typecheck, lint, and production builds. Sol accepted the development/local-staging scope after source/schema/permission/evidence/concurrency and visual review.

R-105 has fixture/local-staging acceptance; a separately identified actual-project checkpoint remains unverified. Production NAS validation, hosted CI/deployment, backup/key custody and production restore remain outside this completion and are not claimed.

## Routing and evidence limits

Repository routing assigns context, schema, permission and final acceptance review to GPT-6.1 Sol and bounded implementation/testing/docs to GPT-6 Luna. This delegated agent did not have runtime model telemetry and makes no claim about its actual serving model or allocation ratio. This report records Sol acceptance of the authorized development/local-staging scope; it does not claim production deployment or verification.

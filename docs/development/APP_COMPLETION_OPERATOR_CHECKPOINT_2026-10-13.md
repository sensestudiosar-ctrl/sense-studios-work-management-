# Application acceptance operators — source checkpoint

Status: source preparation verified; consolidated authenticated readiness **PENDING**. No approval requested or recorded, no database connection, migration, server launch or authenticated browser action performed in this continuation.

The active `Validate MW-I02 refinements` chat is implementing the reviewed D2/E1 global mixed queue, D3 task-filter behavior and Create task dialog in the shared checkout. Its changes are preserved. Earlier web415/API305/typecheck/lint/build evidence predates those changes and does not certify the latest checkout. Fresh final candidate checks and fingerprints must follow integration.

## Implemented guard corrections

- `scripts/acceptance/app-completion-authorization.mjs` validates the actual approval record before dispatch: exact narrow scope, target/system ID, no cluster lifecycle, recorded authorization/time and reviewed source/operator hashes. Setup and task checks reject source drift; exact manifest-owned cleanup may proceed after application-source drift. Operator changes block every stage, including cleanup.
- `authAdapterFingerprint()` binds private adapters and the tracked dispatcher, approval validator and policy module. Independent GPT-6.1 Sol review identified the missing tracked-operator binding; it was corrected and regression-tested.
- The private preflight rejects `-AllowStartup` immediately and no longer contains the copied cluster-start implementation. A stopped cluster stops the run. The task adapter exposes only the two existing rollback task suites; separate committed subtask/concurrency suites retain their dedicated main-cluster guards.

The existing narrow operator entry is `node scripts/acceptance/app-completion-auth.mjs --check`. It checks source/operator preparation only. Its setup/tasks/cleanup stages require a future explicit approval record and exact run manifest; they are not authorized by this checkpoint. Target: `sense_app_completion_20261013_ac13_test`, existing loopback cluster45434, application ports59442/59443, source118 migrations. No accepted preview/source database is a mutation target. This limited adapter is not a full application acceptance harness.

Verified under Node24.19.0/pnpm11.19.0:19/19 pure policy/approval tests,71/71 offline preflight fixtures, scoped operator ESLint, syntax and diff checks pass. The narrow source-only operator check passes. No PostgreSQL connection is needed by these checks; they do not establish live identity, migration, persistence or authenticated behavior. Logs are retained privately under `.env.checkpoint-tools/app-completion-acceptance/`.

## Remaining consolidated readiness

Prepare/review the full21-suite and populated-clone adapters plus current-source authenticated browser scenarios before requesting one consolidated operation. Preserve the fixed23-target inventory and all existing OID/marker/process/catalog/cleanup guards. Do not invoke unchanged historical operators, weaken committed-suite endpoint guards, or treat source-only checks as persistence acceptance.

Add the approved mixed queue to final acceptance: all eligible records evaluated before global ordering/paging; independent source counts; one RepeatableRead transaction and readAt/timezone; no fresh complete page on source failure; source-aware filters/Clear; multipage counts/order and concurrent eligibility; exact review/approval access; no hidden IDs in search/counts; session/actor isolation. Keep subtask commit/completion/graph race and role-setting persistence evidence, and final four-role/four-width prototype comparison.

Only after source integration, matching affected checks and consolidated readiness pass should the Owner receive the exact bounded database/host proposal required by Step8 of `OWNER_COMPLETION_PROTOCOL_2026-10-10.md`. MW-I02/application remain IN PROGRESS; MW-I03 and production/actual-project acceptance remain gated.

Actual models in this continuation: GPT-6.1 Sol for required intake and independent review. Existing accepted implementation work used Sol and Luna as recorded in the source report.

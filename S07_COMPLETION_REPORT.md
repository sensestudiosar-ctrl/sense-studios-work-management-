# S07 completion report — 2026-09-28

Status: **COMPLETE for authorized development/local staging.** S08 and later remain unauthorized. Effective project cancellation and full employee exit remain unavailable until S09 can make their required task and access changes in one transaction.

## Delivered

- Branch-owned Design and Turnkey projects can be created directly or from one Won lead. A conversion retains the exact Won stage-change ID. Initial service scopes remain an immutable baseline.
- Owner project actions persist explicit contributor grants/revocations, one accountable eligible Active Project Lead and lead history, reasoned lifecycle transitions, named scope approver policy, and formal Branch transfers. Transfer revokes contributors whose home Branch differs from the destination until explicit Owner regrant; loss of an Active lead puts the project On Hold.
- Later service scopes use an S05 approval request with an independent named approver. Approval appends a distinct scope row and retains request, decision and original baseline. An unavailable approver is handled by reasoned Owner withdrawal, replacement and a new request.
- Project Lead or explicitly granted staff can request cancellation without changing project state. S07 has no effective cancellation endpoint. The C-024 project hold/replacement primitive is ready for S09 to call inside its future employee-exit transaction; S03 still refuses full exit until that dependency is present.
- API writes enforce session, origin, CSRF, project/Branch scope, current assignment, permission and version or approval-state checks. Project mutations write canonical audit, domain event and outbox evidence. The responsive UI covers Owner management, staff read/request, loading/empty/denied/conflict states and persisted refresh.

## Verification

- Node 24.19.0 and pnpm 11.19.0. Prisma schema validation, client generation and migration status passed. All 16 migrations applied on a fresh PostgreSQL 18 dedicated test database. An S06 database copy was upgraded with account, lead, approval and audit fixture rows preserved.
- Final `pnpm verify` exited **0** on pristine `sense_s07_verify_20260928_test` with `TZ=UTC` and isolated `E2E_API_PORT=4001`: contracts/API/web typecheck, ESLint, 89 API unit tests, 43 web unit tests, 68 PostgreSQL integration tests, production API/web builds and 9 Playwright desktop/mobile tests passed. The two S07 Playwright cases use a real assigned-staff session and database, confirm Branch isolation and cancellation-request persistence after refresh, and check mobile overflow.
- Project-focused tests cover direct and Won conversion, immutable baseline/provenance, status/assignment/lead/transfer/scope database guards, named approval and self-approval denial, HTTP origin/CSRF/validation, and UI actions. `git diff --check` passed.

## Review and limits

The final review checked guessed IDs, Branch leakage, stale versions, Owner-only transfer/cross-Branch grants, approved-scope evidence, lead and status evidence, immutable history and fail-closed cancellation. A browser refresh issue that cleared selected detail after an action was fixed. A composite Prisma relation update that changed an immutable project field during transfer was replaced with scalar ID updates, including lead revocation and exit hold. Stale home-Branch assignments no longer expose a Branch in staff setup, and only the Owner may withdraw a pending scope request.

The initial full gate on a reused test database failed because older organization tests require an empty singleton; a later attempt reached Playwright with a separate main-checkout API already occupying port 4000. No test was weakened. The final pristine-database run with isolated port 4001 passed. Hosted CI and production NAS deployment were not run for S07; earlier S01 production gates remain as documented.

## Model routing

Sol-level root work handled requirements, Owner decisions, schema/migrations, authorization, service integration, defect investigation, security review and final acceptance. Luna agents handled bounded project UI, HTTP test and database test work; root reviewed, corrected and verified the integrated result.

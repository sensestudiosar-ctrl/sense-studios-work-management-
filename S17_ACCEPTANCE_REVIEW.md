# S17 Sol acceptance review — 2026-10-02

Status: COMPLETE for development/local staging. Historical checkpoints below retain their contemporaneous status; final evidence is recorded in S17_COMPLETION_REPORT.md.

Exact GPT-6.1 Sol reread R-046–R-051 and C-003/C-004/C-009/C-022 against the implementation and current Owner decisions. No material unanswered product choice remains: schedule-derived full/half/hourly minutes, dated person allocations, overnight start-date attribution, expiring carry first and future-date-only cancellation are explicitly approved. Numeric policies remain explicit Owner configuration with setup gates.

| Requirement | Reviewed behavior and focused evidence | Final acceptance result |
| --- | --- | --- |
| R-046 | Effective schedules/overrides, full/part time, days/offs/breaks; historical membership holidays and approved leave; real DB schedule/override/holiday tests pass | Passed final9 full regression and final10 responsive journeys |
| R-047 | Explicit dated person allocations, task/project participation and scope enforced; estimated work requiring allocations exposed without invented equal division | Passed injected task assignment hook regression |
| R-048 | Daily and explicit interval workload, effective-policy grouped categories; configurable thresholds and overload acknowledgement; full366-day coverage passed after query repair | Passed management hook and UI gates |
| R-049, C-004 | Configured types/routing including WFH without debit; exact rational allowance/proration/debit/reversal sources, bounded carry and expiry; real DB routing/proration/cancellation tests pass; worker January upfront credit/idempotency/no GET writes passes | Passed carry-first source/expiry and revoked-grant replay evidence |
| R-050 | Scoped critical affected tasks, explicit eligible capacity suggestions, manager/task-owner alerts and immediate emergency analysis; no automatic reassignment | Passed critical-task/privacy regression |
| R-051 | Office/site in/out, overnight scheduled boundaries, missing/late/early, provisional reason/review, sanitized private QR/location/selfie validation | Passed bounded HTTP and live desktop/mobile site evidence |
| C-003/C-009 |90-day capture expiry; automatic advance Owner notice; hold-aware scheduled deletion; durable intent/physical deletion/completion/reconciliation retains attendance | Passed final9 full suite; production legal/backup gates remain distinct |
| C-022 | Same original management levels, future-date-only cancellation, pending unchanged, separate preserved reversal history and handover alerts | Passed final9 full regression |

Source review corrected a C-009 gap: the worker had scheduled notices without expiry deletion. It now calls the existing guarded durable purge workflow for expired, noticed, interval-elapsed evidence without a hold and reconciles prior intents first. Actual worker PostgreSQL suite passes3/3 in1.921s, including hold-block/release automatic deletion and injected physical purge failure recovery. Evidence: .env.s17-tools/workforce-worker-focused.log. Earlier focused core PostgreSQL suite passes13/13 in4.7s: .env.s17-tools/workforce-db-focused86-rerun2.log. Five calculation unit tests, API typecheck and scoped backend/test lint have passed. Applied migrations78–86 are unchanged after deployment.

Before COMPLETE: expanded Luna API security/task/carry/critical regressions, latest migration86 populated-table preservation, full pinned pnpm verify, persisted desktop/mobile browser checks/screenshots and final review of their actual logs. Production NAS/legal/contract/offsite/backup/hosted CI gates are not claimed by local acceptance. Actual routing: GPT-6.1 Sol intake/schema/backend/calculations/security/final review; GPT-6 Luna UI/tests/environment. No measured token ratio is claimed.

## Expanded API review

Actual workforce-db-final-focused2.log shows 18/18 passing across core and worker suites in 10.446s. Sol reviewed injected TaskService warning/rollback and acknowledged success, same-command positive replay followed by revoked grant denial, true separate-database approval concurrency with one debit/receipt, and critical-task suggestions/manager notices with employee/outsider privacy. Carry-first debit source fractions and source-year/expiry snapshots are verified. A further rollover edge regression (current annual four days, prior carry five, four days used, next carry four) was requested because a five-day cap can hide ordering errors. No backend defect was found in that reviewed calculation. Final whole gates and preservation remain pending.

The additional rollover edge is now verified: workforce-db-final-focused3.log passes 19/19 in 13.4s. Prior allowance six produces capped carry five, current allowance four remains untouched after four carry-first debit days, and following-year carry is exactly four; the unused old carry is not carried again. Sol inspected the actual assertions and result. Expanded API/worker acceptance is settled; final whole-project/browser/preservation gates remain pending.

## Final migration evidence inspected

Sol independently inspected final-db-status-primary.log and final-db-status-workforce.log: both report all 86 migrations and current schema. final-db-validate.log confirms valid schema. Direct comparison of s17-final-primary-before83-86.json and s17-final-primary-after86.json found 112 tables before and after with zero row-count/SHA256 differences. Full browser/verify acceptance remains pending.

Legacy preservation independently verified: normalize table_name/digest/string rows in s16-populated-old104-before.json to table/sha256/numeric rows in s17-final-primary-old104-after86.json; all 104 historical table/column snapshots have identical row counts and hashes. No retained data reset occurred.

## Final Sol acceptance

Final9 durable exit0,172 API unit/99 web/202 integration/33 browser passes and schema/preservation evidence were independently reviewed. Final CSS-only affected web gates and both browser journeys passed; all four final10 screenshots show readable Week selection and responsive forms/history/attendance. Applicable S17 DoD is fulfilled for local development/staging. No remaining Owner choice or blocking defect; production gates and S18 scope remain excluded.

## Shipping acceptance follow-up — 2026-10-03

Exact GPT-6.1 Sol reviewed the signed carry-adjustment correction against R-049.b/C-004 and the additive ledger guards. Carry reconciliation uses immutable ADJUSTMENT evidence and never changes annual entitlement; all carry consumers distinguish it from annual corrections. The strengthened real PostgreSQL case verifies the signed carry correction, annual entitlement, deficit/denial and repeat-sync idempotence. Fresh exact-staged API 172, web 99, core PostgreSQL 18 and worker PostgreSQL 3 tests, typecheck, lint and both builds pass. The preceding carry13 full run passed 203 integration and 33 browser cases; it precedes the final narrow correction and is reported separately. The deterministic date/reload fixture correction changes test setup only. Documentation corruption is repaired, unrelated working changes remain preserved, and applied migration bytes remain unchanged. S17 remains COMPLETE for development/local staging; S18 onward and production gates remain excluded. See S17_COMPLETION_REPORT.md for exact evidence and limits.

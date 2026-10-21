# V1 delivery progress — 15 October 2026

Status: **IN PROGRESS.** First source implementation batch is verified by the checks below. V1, V1-00, V1-01 and MW-I02 are not marked COMPLETE; current PostgreSQL, authenticated responsive/visual and pilot acceptance remain open.

Subsequent delivery: [People and focused Settings source progress](V1_PEOPLE_SETTINGS_PROGRESS_2026-10-15.md). The Owner has explicitly requested V1 as an active goal. The first-batch evidence below retains its original source boundary.

The Owner authorized starting the [V1 internal pilot plan](V1_INTERNAL_PILOT_PLAN_2026-10-15.md). Existing work, retained databases, identities, credentials and stopped-run evidence were preserved. No migration, retained-data mutation, server restart, authenticated acceptance retry, deployment, commit or push was performed.

## 1. Candidate and runtime baseline

- HEAD: `3f06f9c03f118a80b4d954ffc5c99d78ff0430a6` plus substantial existing staged/unstaged/untracked work; HEAD alone is not the candidate.
- Pinned tools actually checked: Node `24.19.0`, pnpm `11.19.0`.
- Existing source-fingerprint helper initially reported 569 files, hash `dace3b7e747d5112abefbda6d6ba37716ad7e312c0d17b2aa9ec4657fdc2543b` and 118 migration directories.
- The read-only canonical runtime status passed outside Windows sandbox process-inspection restrictions: web `http://localhost:59443/`, API port `59442`, loopback PostgreSQL `45434`, database `sense_latest_retained_20261014_test`, owner `sense_demo`, OID `145606`, cluster system ID `7693570241708228348`, 118 finished migrations and no unfinished migration.
- That status proves the inspected process/listener/database identities and public health endpoints. It does not bind the running server's loaded modules to the new workspace source or prove authenticated feature acceptance.
- No schema changes were made in this batch. Source migration tip remains `20261008020000_task_subtasks`.

The October 14 stop-on-drift record remains intact. A current source fingerprint does not renew its stopped one-run acceptance authorization, and no such retry was made.

## 2. Implemented task-description correction

Requirements: R-021.a–b, R-019.a–c, R-018.a–b and current create/edit/subtask contracts. This is a bounded existing-form defect correction, not a new MW-I03 workflow.

Root cause: task and subtask create layouts accepted up to 4,000 characters while their strict API schema accepted 2,000. The client posted oversized descriptions and relied on the generic server failure; drafts could not be corrected using a specific explanation before the request.

Changes:

- Shared `TASK_DESCRIPTION_MAX_LENGTH = 2000` in `@sense/contracts`; ordinary create, subtask create and edit use it in the API and frontend.
- Compact and expanded create/subtask inputs use the same native maximum. Edit retains the same existing maximum through the shared constant.
- Submit handlers reject an oversized trimmed description before any write, keep the form and text intact, and report “Description must be 2000 characters or fewer.” They do not silently truncate it.
- Required ownership, dates, reason, review, capacity, parent-version and authorization behavior is unchanged.

Two new regression cases failed before the fix for the expected bad submission behavior. After implementation, the initial test query needed to be scoped to the actual modal because existing UI renders the same error in the inert background and the dialog; the behavioral assertions were retained. Four final frontend cases cover compact/expanded create, edit and subtask draft preservation and 2,000-character acceptance. Three new HTTP cases cover create/edit/subtask rejecting 2,001 before service dispatch and accepting a trimmed 2,000.

## 3. Implemented V1-01A permission catalogue

Requirements: R-006.a–c, R-007.b, R-079/R-080/R-092/R-099 and existing S03 scoped-grant behavior.

- Added 51 current permission keys, grouped into 13 areas with readable action labels, in `packages/contracts/src/permissions.ts`.
- Owner-only `GET /api/v1/org/permission-catalogue` returns `{ version: 1, groups }` with `Cache-Control: no-store`; unauthenticated, Staff and unsecured Owner reads are denied.
- Existing Settings role-grant and employee-override forms now use grouped selects instead of free-text keys. They share the same catalogue used by server validation.
- New role grants and employee allow/deny overrides must name a supported exact key. Controller validation rejects malformed/unsupported keys; owning service methods also reject them before opening a transaction, including direct internal callers.
- Historical unknown grants/overrides are still returned, shown with an “Unrecognized permission” review note and revocable with their original audit evidence. No existing record was rewritten or removed.
- Job roles, four existing generic scope kinds, explicit membership, deny precedence, source-domain conditions, review independence and Owner-only administration are unchanged. No preset grants or automatic role mapping were introduced.

The existing Settings test used the inert example key `task.review`; its new-override fixture now uses the actually consumed `review.decide`. The scoped grant, reason, CSRF and revocation assertions remain. Additional service/HTTP cases cover unknown keys, approval/event names and wildcards, supported key forwarding, historical unknown-key revocation and catalogue security.

Source inventory found all 51 keys referenced in non-test API source, no duplicate keys and no unregistered literal keys in direct `assertPermission` calls. Its initial extraction included conditional comparison strings such as `CANCELLED`; the extractor was corrected to inspect conditional result branches. This is static reference evidence, not proof of every dynamic call path, effective access or real persistence.

## 4. Actual verification

| Check | Result |
| --- | --- |
| Baseline `pnpm typecheck` | PASS |
| Baseline API unit, normal host execution | 57 suites / 363 tests PASS |
| Baseline web unit, `VITEST_WORKERS=2` | 45 files / 457 tests PASS |
| New create regressions before fix | 2 expected failures, proving the defect |
| Focused final description frontend cases | 4 PASS; 60 nonselected tests in that targeted run |
| Task controller HTTP contract | 18 PASS, including 3 new boundary cases; mocked services, no PostgreSQL |
| Organization service unit | 17 PASS, including 5 new rejection/history cases |
| Organization controller HTTP contract | 14 PASS, including 6 new catalogue/grant cases; mocked services, no PostgreSQL |
| Focused Settings frontend cases | 2 PASS; remaining cases nonselected in that targeted run |
| Final `pnpm typecheck` | PASS, including client generation and all workspace source checks |
| Final `pnpm lint` | PASS, repository-wide |
| Final `pnpm build` | PASS, contracts/API/web |
| Final API unit | 57 suites / 368 tests PASS; 0 failed, 0 pending |
| First final web run, two workers | 44 files passed / 1 failed; 460 passed / 1 failed |
| Unchanged failing attention file, isolated | 16 PASS without source/assertion/timeout changes |
| Consolidated final web run, one worker | 45 files / 461 tests PASS; 0 failed/skipped |
| Source permission inventory | 51 unique keys, all source-referenced, no unregistered direct literal check keys |
| Scoped `git diff --check` on changed application/contract/test files | PASS |

The two-worker web failure was `actionable-work.test.tsx:76`: rows were already rendered while the last count callback was still `loading`. That file and component were unchanged by this batch. It passed alone and in the full one-worker run. Timing remains a test-stability follow-up, not a confirmed product regression or a repaired product defect. No test was skipped, weakened or given a longer timeout to obtain the final full pass; nonselected counts above belong only to explicit focused `-t` runs.

Initial sandbox API execution had 18 failures across seven suites from blocked loopback requests and temporary rename/symlink operations. A sandbox frontend attempt also had a temporary-file load error and a subtask timing failure. They were classified as environment/verification failures, not fixed in product code; the complete unchanged baseline then passed in normal host execution before implementation.

Existing warning classes remain: React `act` warnings, a SiteRoute render/update warning observed in the baseline, PDF Node-build guidance, and Vite's large-chunk/ineffective-dynamic-import warnings. Build and test completion do not claim these warnings resolved.

**Not run:** full real-PostgreSQL suite, current authenticated desktop/mobile Playwright acceptance, production or hosted CI, actual R-104/R-105, pilot onboarding, backup/restore or deployment. `pnpm verify` was not reported as run/passed. Selected HTTP tests using Jest's integration configuration are explicitly not real-database acceptance.

## 5. Evidence and source boundary

Evidence root: `.artifacts/v1/20261015-start/` (ignored local verification artifacts):

- `api-baseline.json`, `web-baseline.json`.
- `description-before.json`, `description-after.json` (initial modal-query ambiguity), `description-final.json`.
- `task-http-after.json`, `permission-service.json`, `permission-http.json`, `permission-web.json`.
- `api-final.json`, `web-final.json` (failed two-worker run), `attention-check.json`, `web-final-serial.json`.
- `permission-source-inventory.mjs` / `.json`, `source-receipt.json`.

Final source helper result: **570 files**, hash `6b66b8242730f73193b842f0c45c2f580148d00646c5703d60a6f2b30fb15f7e`, **118** migration directories. The source receipt separately hashes canonical runtime configuration and the quality workflow, which the existing source helper does not include. No acceptance-run authorization or immutable checkout is created by this receipt.

Application/contract/test changes in this batch are confined to the shared contract index/new permission catalogue; task controller/HTTP spec and web task/spec; organization controller/service/specs; and web App/spec. Existing unrelated changes and staged state were not reset or committed. Documentation records this result separately from older accepted fingerprints.

## 6. Remaining delivery order

| Package | Current boundary / next acceptance |
| --- | --- |
| V1-00 | Toolchain, source receipt, read-only runtime identity and source gates established; current frozen MW-I02/real persistence/browser acceptance and harness reconciliation still open. |
| V1-01 | Catalogue source implemented and tested; effective-access explanations, broader access audit, persistence/concurrency and authenticated UI acceptance still open. |
| V1-02 | Shared shell/design foundation and returned-demo integration remain; no new design system was invented in this batch. |
| V1-03 | Dedicated People destination, scoped detail/read contract and ordinary onboarding; display-name policy/schema remains a distinct pending decision. |
| V1-04 | Permission selection improved; focused settings panel extraction, saved-state/conflict/recent-sign-in recovery and domain configuration work remain. |
| V1-05 | Description boundary corrected; shared composer extraction, context-valid assignment choices, review planning, broader validation and retry design remain. |
| V1-06 | Existing MW-I02 acceptance sequencing retained; no MW-I03 or new action semantics started. |
| V1-07 | Project Tasks/composer integration and coherent project child tabs remain; existing project authority unchanged. |
| V1-08 | Staff pilot, actual Design R-104, scoped Turnkey R-105 and operational readiness remain unverified. |

This is a completed first implementation batch with explicitly partial feature acceptance, not a declaration that V1 or an affected S-slice is complete. Planning and implementation used the current Codex agent only; no delegated Opus/Sonnet review or independent final acceptance is claimed. Exact runtime model ID is not asserted without evidence.

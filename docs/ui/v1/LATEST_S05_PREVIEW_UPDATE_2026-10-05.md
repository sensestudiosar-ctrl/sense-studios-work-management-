# Latest S05 Preview Update — Preparation Report

**Date:** 2026-10-05  
**Status:** Source preparation in progress; live switch pending by Owner instruction.  
**Scope:** Latest S05 preview UI/integration preparation against the accepted S24 source. This report does not authorize or claim an original-database upgrade, runtime switch, or deployment.

## Baseline and current state

The accepted source baseline is S24, with 104 primary migration files and S24 development/local-staging acceptance recorded in `S24_COMPLETION_REPORT.md` and `S24_ACCEPTANCE_REVIEW.md`. New preview UI/integration work is in progress on top of that baseline. It is not accepted as complete and has not passed full `pnpm verify`.

The API read integration has passed its focused typecheck and focused tests: 24 HTTP tests and 23 database tests across three suites of each kind. The frontend Luna implementation is still in progress and has not been accepted. No full-slice, full-repository, or browser acceptance is claimed for this preview update.

The canonical HTTPS/runtime configuration and the UI runtime worktree at `C:\Users\HI\.codex\worktrees\9bd6\sensestudios work management app` remain unchanged, as explicitly directed by the Owner. This preparation does not switch a runtime or repoint the application.

## Requirement coverage being prepared

The preview work is being organized against these approved requirement groups; their inclusion here is traceability, not a claim that this preview update has completed or newly accepted them:

- **R-018, R-019, R-021, R-024 and C-023:** project/task lifecycle, waiting and dependency behavior, and suspension/exit constraints in their owning slices.
- **R-036.a–b and R-039.a–b:** document/revision and gallery/publication evidence boundaries.
- **R-027.a–b, R-028.a–b and R-037/S13.a:** internal review, correction rounds and the applicable review handoff.
- **R-073, R-074, R-077, C-001, R-006 and R-092:** dashboard/report reads remain within the approved hierarchy, explicit authorization and existing source-evidence boundaries.

Implementation and acceptance must continue to follow the approved requirements, addenda and settled slice decisions. This report introduces no new workflow, authority, or policy decision.

## Original S05 database audit

The read-only audit connected only after verifying the exact target `127.0.0.1:56432/sense_iphone_https_dev`. It found 132 public base tables (excluding `_prisma_migrations`) containing 252 rows. The S05 account-related aggregate was two active passkeys and one unused, unreplaced recovery code across four active accounts. No row contents were emitted in the audit output.

The original database has 91 completed migration-history records. The current primary source contains 104 migration files. Eighteen primary migration files are not present in the original history, while five completed S18-only records remain in that history. The expected post-upgrade clone history is therefore 109 records if all 104 current primary migrations are applied and the five existing extra history records remain intact. This expectation is **unrehearsed**; no migration was applied to the original database or to a clone.

Thirteen already-applied S16/S17 migration checksums differ from the current primary files. Ten match after line-ending normalization. Three also differ in content: `20261003030000_s16_final_integrity`, `20261004060000_s17_subject_binding_types`, and `20261004070000_s17_partial_cancel_history`. These differences must remain visible during clone rehearsal; this report does not resolve or rewrite them.

The saved read-only helper and baseline are in the ignored local path `.env.s05-upgrade-rehearsal/inspect.mjs` and `.env.s05-upgrade-rehearsal/original-before.json`. The baseline contains table names, column lists, row counts and digests, not row payloads. No credentials are included in this report.

## Rehearsal and acceptance still required

The PostgreSQL custom-format backup and isolated clone were not created. Automatic approval review blocked the required elevated workspace operation after reaching the account usage limit; ordinary workspace execution also failed while applying Windows read ACLs. No workaround was attempted. Accordingly, preservation after restore, migration deployment, the expected 109-record clone history and the unchanged original state have not been verified.

The remaining preparation-to-live sequence is:

1. Create a protected PostgreSQL 18 custom-format backup of the exact guarded original database and restore it only into a uniquely named clone on port 56432.
2. Capture and compare every original public table's column list, row count and sorted-row digest, plus the S05 account credential counts, before and after the clone upgrade.
3. Deploy only the 104 primary migration files to the clone. Preserve all five existing S18 history records; do not add S18 migration source or rewrite migration history.
4. Confirm the clone retains the old table values and expected history, and confirm the original database remains unchanged. Compare the clone's S16/S17 function definitions, triggers, constraints, privileges and runtime roles against a fresh accepted 104-migration database. The three content checksum differences concern accounting/timer integrity, subject binding and historical partial-cancellation evidence; successful deployment alone cannot prove those existing guards are current. Run the corresponding tamper/cancellation/evidence regressions on the clone. Any necessary repair requires a separately reviewed forward migration; never rewrite applied checksums or history.
5. Complete and review the frontend implementation, then pass the applicable focused, full integration, typecheck, lint, build and browser acceptance gates before any Owner-authorized guarded original update or primary-runtime repoint.

Until those steps and acceptance are complete, the clone upgrade is unrehearsed and the live update remains pending. The current HTTPS configuration and `9bd6` UI runtime worktree remain unchanged.

## Preparation checks completed after the initial draft

The prepared source now includes the shared workspace shell, My Work, Projects, scoped task/document/review reads, the PDF.js evidence viewer, and the existing S24 routes. Web typecheck passes. The focused app/session and navigation regressions pass 30/30. Controlled browser checks pass for the shell (241 checks, no page errors), Documents (32), Projects (32), and My Work (92); the task mobile overflow found by the shell check was corrected.

The task fixture check still needs diagnosis against the current pagination response and the review evidence check still has protected-stream sequencing failures at the 320px case. These remain unresolved preparation checks, not acceptance of the live server. Earlier web unit timeout/fixture failures were not established as unrelated baseline defects. A fresh pinned serial run on 2026-10-05 (`pnpm exec vitest run --pool=threads --maxWorkers=1`, from `apps/web`) passed all 27 files and 176 tests, exit 0, in 51.89 seconds. This run preceded the next focused review-workspace corrections and does not verify those later edits or full `pnpm verify`. S25 calendar work appeared concurrently in the shared primary source and remains preserved and outside this S24 preview switch.

The retained S05 HTTPS sign-in check on 2026-10-05 passed: sign-in visible, secure context, passkey options HTTP 201 with the canonical HTTPS relying-party ID, and no page errors. This check requested login options only; it did not sign in or change account credentials, database data, migrations or the runtime mapping.

The current API unit suite also passed (`pnpm --filter @sense/api test:unit --runInBand`): 36 suites, 217 tests, exit 0, in 25.395 seconds. This includes concurrent source present in the shared checkout and does not claim S25 acceptance. A fresh Documents controlled-browser check passed 32 checks with no failures or page errors.

Focused lint exposed five unused task UI values (`compact`, `desktop`, `pageRange`, `applyFilters`, `resetFilters`). Inspection and fixture reproduction confirmed that the filter form, page range, paging controls and Compact switch were missing from the rendered task page. The previous assertion failure was therefore a real missing-controls integration defect, rather than an established fixture mismatch. The controls and list-first task detail behavior have now been restored. The repository lint gate passes. Controlled Task browser acceptance then passed 73 checks across 320, 390, 768 and 1440px with no page errors. The actual two-page PDF evidence browser acceptance passes 60 checks across the same widths; Sol found and corrected the 768px review panel squeeze, then visually accepted its refreshed screenshot. Focused review unit tests passed 7/7 at this checkpoint; final added security/readiness regressions and broader source gates remain pending.

## Model and routing record

Context interpretation, API integration and acceptance review used GPT-6.1 Sol. Bounded frontend implementation, read-only database audit and report drafting used GPT-6 Luna. Frontend implementation remains in progress. No measured 70/30 allocation ratio is available. The model routing record describes actual task assignment and does not imply acceptance of unfinished work.

## Final source-preparation checkpoint

The 2026-10-05 task UI gap was resolved: the filter form, page range, paging controls, desktop Compact option, truthful Owner scope, list-first selection and Back to list are rendered. Task acceptance passed 73 controlled browser checks at 320, 390, 768 and 1440px, with no failures or page errors. Sol inspected the refreshed captures and accepted the views.

Review was corrected to reload active/history inbox scope, select an exact round, discard stale reads and evidence callbacks, clear protected data on denial, preserve exact API-provided file metadata, and bind annotations and decisions to the currently inspected round. Drawing-bound decisions require authorized evidence readiness; drawing annotations use an actual viewer-selected point and validated page. Historical rounds remain read-only. The 768px review layout issue found during Sol visual review was corrected. The actual bundled PDF.js two-page browser run passed 60 checks at 320, 390, 768 and 1440px with no page errors, and Sol accepted the refreshed captures.

Final focused source gates at this checkpoint passed: pinned web typecheck; repository lint; production build; and serial web unit tests, 27 files and 187 tests. The build emitted existing large-chunk and ineffective dynamic-import warnings. Focused internal-review and PDF viewer tests passed 7 and 5 tests respectively before the last regressions were added; the final 187-test web run includes those latest review regressions. API unit tests passed 217 tests across 36 suites. The S24 task/review/document read integration previously passed 24 HTTP tests and 23 PostgreSQL tests on dedicated targets. The prepared shell/navigation browser check passed 241 checks with no page errors; Documents passed 32. These controlled-browser checks do not establish backend authorization or persistence beyond the separately listed API/database tests.

The dashboard route and navigation are present in the prepared UI at `/dashboard`; the isolated prepared-source shell check passed all 241 route/navigation checks, and dashboard component tests are included in the passing web suite. The current S05 HTTPS server remains on the older runtime tree, so it does not yet serve this route. Per Owner instruction, no primary-runtime switch is claimed or performed. The original S05 database remains at its audited 91 migration records; no backup, clone upgrade or original database migration was performed. The requested backup/clone rehearsal and its approval remain the outstanding prerequisite before a guarded S05 runtime update. Concurrent S25 source remains untouched by this preparation and has its own incomplete acceptance gates. Accordingly, this report records completed UI source preparation and verification, not completed database rehearsal or live-server update.

Actual routing: GPT-6.1 Sol handled context intake, implementation boundaries and security/visual review; GPT-6 Luna handled the bounded task UI restoration and browser check. No measured 70/30 allocation ratio is available.

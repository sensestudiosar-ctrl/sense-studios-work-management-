# MW-I01 validation — COMPLETE for bounded local acceptance

**Status:** COMPLETE for the authorized MW-I01 development/local validation scope, 9 October 2026. Final authenticated browser run 17 passed; Task/Review PostgreSQL checks, affected frontend checks, typecheck, lint and build passed. Exact-target cleanup passed, and GPT-6.1 Sol accepted the actual loaded desktop/mobile evidence in [FINAL_REVIEW.md](FINAL_REVIEW.md). The full web suite retains 19 pre-existing failures; production readiness and whole-checkout acceptance are not claimed. MW-I02 has not started.

## Scope and environment

Validation uses only the Owner-approved disposable database `sense_mw_i01_validation_20261009_test` on PostgreSQL at `127.0.0.1:57434`. Setup recorded the cluster identity and pre-create database catalog, confirmed the exact target absent, created the target as `sense_demo`, and verified that all other catalog entries remained unchanged. The new target has the current 116 migrations and began with zero accounts, organizations, or sessions. Setup and migration evidence is in [setup.log](evidence/setup.log); focused target integration evidence is in [task-postgres.log](evidence/task-postgres.log). The run manifest and service logs are under the ignored run directory and are not copied here.

Only the newly created disposable database was targeted. Existing databases and their contents remain outside this validation scope. Runtime services are bound to loopback and use this run's environment. Cleanup completed at 2026-10-09T18:07:58Z after exact-target and process-identity verification.

## Verification completed

Pinned Node 24.19.0 / pnpm 11.19.0 checks completed so far:

| Check | Result |
|---|---|
| Focused TaskWorkspace and MyWorkAttention web tests | 26/26 passed across 2 files; [focused-web-tests.log](evidence/focused-web-tests.log) |
| Task state/recurrence policy unit tests | 15/15 passed across 2 suites; [task-api-unit.log](evidence/task-api-unit.log). Controller specs supplied to this unit command are excluded by its configuration and are not claimed tested here. |
| Task and recurrence PostgreSQL integration | 26/26 passed across 2 suites against the exact disposable target; [task-postgres.log](evidence/task-postgres.log) |
| Review PostgreSQL integration | 3/3 passed after the authenticated browser journey, reusing the same target; [review-postgres.log](evidence/review-postgres.log) |
| Full web unit regression | 214 passed, 19 failed; same 19 failures as the recorded pre-MW-I01 baseline, including 18 in `app.test.tsx` and 1 in `workspace-navigation.test.tsx`; [full-web-tests.log](evidence/full-web-tests.log) and [current-failures.txt](evidence/current-failures.txt) |
| Typecheck | Passed; [resumed-typecheck.log](evidence/resumed-typecheck.log) |
| Lint | Passed; [resumed-lint.log](evidence/resumed-lint.log) |
| Production build | Passed; [resumed-build.log](evidence/resumed-build.log). Vite reported existing chunk-size and ineffective dynamic-import warnings. |
| MW-I01 Task source preservation | `task.tsx`, `task.css`, and `task.test.tsx` hashes match the recorded before/after values; [task-source-before.json](evidence/task-source-before.json), [task-source-after.json](evidence/task-source-after.json) |

The full web suite still has the same pre-existing 19 failures; they are not counted as passing. The relevant Task-focused web tests, backend policy unit tests, and real Task PostgreSQL suites passed.

## Authenticated browser acceptance

The comprehensive normal-authentication journey passed on attempt 15 and again on final attempt 17: 1/1 test in 34.8 seconds (36.4 seconds total), across all four personas. Final log: [browser-run-17.log](evidence/browser-run-17.log). See [browser-run-15.log](evidence/browser-run-15.log). Attempts 1–14 were unsuccessful harness or environment iterations; their failures are summarized below so they are not mistaken for production regressions.

| Attempt | Observed result |
|---|---|
| 1 | Timed out waiting for the second Owner passkey registration verification response; [browser-run-1.log](evidence/browser-run-1.log). |
| 2 | The second registration returned successfully, then CDP rejected adding a duplicate credential to the virtual authenticator; [browser-run-2.log](evidence/browser-run-2.log). |
| 3 | Recovery-code UI hydration raced the test; the expected recovery-code control was not found; [browser-run-3.log](evidence/browser-run-3.log). |
| 4 | The sandbox lacked the Playwright Chromium executable, so the browser journey did not execute. Parent is using the already-installed browser through the approved environment; [browser-run-4.log](evidence/browser-run-4.log). |
| 5 | A logout-navigation race left the sign-in input unavailable; [browser-run-5.log](evidence/browser-run-5.log). |
| 6 | The normal UI logout POST returned 204, then the app navigated through its existing signed-out Dashboard guard rather than directly rendering the expected sign-in heading. GPT-6.1 Sol classified this navigation behavior as outside MW-I01. The final harness verifies the subsequent 401 and visible “Return to sign in” path; [browser-run-6.log](evidence/browser-run-6.log). |
| 7–14 | Harness/environment corrections for setup organization discovery, duplicate logout controls, a closed page during logout, strict locator matching, task detail form selectors, stale-version permission preconditions, exact pagination rows, and duplicate scope-task matches; each failure is recorded in [browser-run-7.log](evidence/browser-run-7.log) through [browser-run-14.log](evidence/browser-run-14.log). No new production defect was established by these iterations. |

The passing journey used normal sign-in for all four roles and verified a stable 52-task pagination dataset; list, cards, Kanban, and timeline views; 320px and 390px layouts without horizontal overflow; touch targets; create/edit/start/wait/reload/resume/complete flows; review/correction presentation and dates; Back navigation with filters; foreign-record 403, manager assignment 201, disallowed manager progress 403, malformed input 400, stale version 409; and keyboard Tab focus with a 3px indicator and Enter activation. It checks the 14 filter options and selected real workflows. Component tests cover all 13 state labels; the browser journey does not claim every state label has a runtime workflow. Logout verification follows the existing signed-out Dashboard guard, then confirms 401 and the visible “Return to sign in” route.

No production source changes were made for the harness iterations. Screenshots from the passing actual-app run are in `evidence/artifacts/`, including [desktop list](evidence/artifacts/acceptance-MW-I01-authenti-76536-mmands-and-responsive-shell-mw-i01-chromium/tasks-desktop-list.png), [desktop cards](evidence/artifacts/acceptance-MW-I01-authenti-76536-mmands-and-responsive-shell-mw-i01-chromium/tasks-desktop-cards.png), [task detail](evidence/artifacts/acceptance-MW-I01-authenti-76536-mmands-and-responsive-shell-mw-i01-chromium/tasks-detail-desktop.png), [320px mobile queue](evidence/artifacts/acceptance-MW-I01-authenti-76536-mmands-and-responsive-shell-mw-i01-chromium/tasks-mobile-320-queue-viewport.png), [390px mobile queue](evidence/artifacts/acceptance-MW-I01-authenti-76536-mmands-and-responsive-shell-mw-i01-chromium/tasks-mobile-390-queue-viewport.png), [team leader](evidence/artifacts/acceptance-MW-I01-authenti-76536-mmands-and-responsive-shell-mw-i01-chromium/tasks-leader-desktop-viewport.png), and [employee My Work](evidence/artifacts/acceptance-MW-I01-authenti-76536-mmands-and-responsive-shell-mw-i01-chromium/tasks-site-employee-my-work.png). These are real authenticated application captures, not mocked component images.

## Cleanup and remaining review

Cleanup passed using the exact approved target `sense_mw_i01_validation_20261009_test` at `127.0.0.1:57434`. The reviewed guard matched database OID, cluster identity, marker and catalog; revoked/expired 53 internal session rows with zero active sessions remaining; verified zero active client/external sessions; stopped only recorded validation API/web processes; verified zero target connections; dropped only the approved database; verified its absence and an unchanged other-database catalog. Owned NAS/tmp files, `auth-state.json` and `server.env.test.json` were removed. See [cleanup-final.log](evidence/cleanup-final.log). No existing database contents were migrated, reset or deleted by these commands. Catalog preservation is verified; this does not claim a contents fingerprint of every unrelated database.

The first cleanup attempt stopped before any mutation because a Windows path substring check did not recognize the API's encoded file URL. Sol traced the mismatch and approved matching the exact recorded launch arguments and run-local files while retaining all PID, creation-date, executable, command-line, database and catalog checks. No broad deletion, forced connection termination or alternative database was used.

Attempt 16 added loaded-row screenshot waits and exposed the Team Leader's valid empty default personal queue. Final attempt 17 explicitly selected the existing authorized All visible tasks scope, preserved the permission checks, passed the entire journey and captured loaded rows. Earlier screenshots were overwritten by final captures; the final artifact paths above are the authoritative screenshots.

No new MW-I01 functional regression was established. Remaining UX limitations observed in actual captures: initial mobile rows remain below the fold, the narrow Scope selector clips its selected text, and desktop rows are tall. These must be disclosed during Owner review rather than described as fully optimized. The existing logout Dashboard-guard navigation quirk remains outside this slice. Production readiness and whole-repository verification are not claimed; the full web suite retains 19 baseline failures and two Dashboard errors.

Actual models used: GPT-6 Luna for bounded harness/documentation and GPT-6.1 Sol for context, safety, authorization interpretation and acceptance review. No model allocation percentage is claimed. MW-I02 remains excluded. Final Sol loaded-image review passed; see [FINAL_REVIEW.md](FINAL_REVIEW.md). Recommendation: COMPLETE for bounded MW-I01. Stop for Owner review before MW-I02.



## Owner authorization note — 9 October 2026

The Owner authorized proceeding with the bounded MW-I02 slice after GPT-6.1 Sol settles its specification. This note records authorization for that separate slice; it does not broaden MW-I01 acceptance. MW-I01's full web suite retains the same 19 pre-existing failures documented against its baseline, and production readiness and actual-project acceptance remain explicitly excluded.

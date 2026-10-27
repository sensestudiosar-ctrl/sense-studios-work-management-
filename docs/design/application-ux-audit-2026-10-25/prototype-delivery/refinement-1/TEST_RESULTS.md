# Confirmed final results

**82 passed; 0 failed; 0 skipped; 0 flaky; retries disabled.** The final normal run uses `connected-refinement.config.mjs`. [Actual JSON](playwright-results.json) · [HTML report](playwright-report/index.html) · [Final artifact/source receipt](FINAL_VERIFICATION.json).

| Coverage | Widths | Result |
|---|---|---|
| Existing workflow/recovery/responsive/keyboard regression | 1440, 1024, 783, 768, 767, 390, 320 | 42 passed, including 14 zero-difference candidate image comparisons |
| Authorized manager creation and separate independent reviewer assignment | 1440, 1024, 768, 390, 320 | 5 passed |
| Employee creation, responsible manager, start/reviewer prerequisites and project-scoped assignment restriction | Same five | 5 passed |
| Active search/Project/priority filters, group, exact task, scroll and keyboard focus through project and return | Same five | 5 passed |
| Eight persistent project sections, current selection, overflow hint, touch height and keyboard selection | Same five | 5 passed |
| Correction completion → prominent original-task return → updated evidence → current round/reviewer and Dashboard guidance | Same five | 5 passed |
| My Work row no longer advertises obsolete correction work after submission | Same five | 5 passed |
| Unfinished subtask replaces ineligible parent completion with responsible-actor guidance | Same five | 5 passed |
| Unsaved detail/draft protection, keyboard focus restoration and phone control geometry | Same five | 5 passed |

Every test asserts zero uncaught page errors and zero attempted HTTP(S) requests while such requests are blocked. Candidate snapshots were prepared separately; the final run did not update them. These are synthetic local-file Chromium results, not real-role authentication, API authorization, human usability or production acceptance.

The 35 before/after pairs compare the preserved preceding artifact with the refinement at five requested widths. Visual inspection included phone My Work, Project Tasks, comments, employee review setup, manager creation and the smallest-screen action footer. The gallery supports viewport filtering; click an image for the original full-size PNG. Task/project screenshots can scroll differently because the refinement restores/highlights the exact originating task.

The final source fingerprint checks 909 tracked application/API/contracts/dependency/script/infra/configuration files. **907 match; two concurrent files differ:** `apps/web/src/my-work/my-work-parity.css` and `apps/web/src/task.tsx`. They were unchanged in earlier checks and changed during this task outside its authored files. Neither was edited, reverted or accepted by this prototype work. Exact hashes are retained in `PRESERVATION.json`; this check is not presented as a whole-checkout pass. The final HTML hash matches the capture receipt.

No real application, backend, database, API, authorization, dependency declaration/lockfile or staging change was made by this task. No application build/full-verify, retained-data check, migration, seed, deployment, commit or push was run.

Earlier failing attempts remain preserved. The six desktop/tablet failures in the first broad run came from tests clicking the separate People control at a task row's geometric center; final tests use explicit task keyboard activation and verify focus return. The added subtask scenario initially raced pending creation/start results; it now waits for the actual confirmation state. Initial origin-marker and duplicate-label findings were fixed in the artifact. No failure is counted as a pass in the final result.

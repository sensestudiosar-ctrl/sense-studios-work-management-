# Projects redesign implementation — 28 October 2026

Status: COMPLETE for the bounded Projects frontend implementation and isolated-fixture acceptance. Implements the Owner's D1–D8 and E1–E6 decisions in the existing application. Staging deployment, aggregate concurrent master acceptance and production acceptance are not claimed. The final acceptance below supersedes historical pending-run notes.

## Changes

- Project task detail uses the existing native dialog drawer from List, Cards, Kanban and Timeline. TaskWorkspace retains reads, permissions, commands, draft guards and URL ownership. Each editor renders once. Existing drawer focus, Escape, modal isolation and scroll handling are reused.
- Phones use a labelled Project section selector and a single Kanban status column. All thirteen canonical statuses remain available with counts explicitly limited to the current page. Desktop boards scroll within the workspace.
- Create project opens a focused view with its existing fields, template effects, Draft outcome, confirmed-result reopening and uncertain-write recovery. The Owner-selected shared branch state is retained. A saved directory snapshot restores branch, search, stage, sorting and page on cancellation or confirmed creation. Dirty and pending departures are guarded.
- Project drawer typography and touch targets are scoped to Projects. Existing My Work presentation remains on its default drawer styling.

## Original reported findings

The implementation base already contains these fixes; this slice preserves them and verifies the relevant callers:

| Finding | Current behavior | Regression evidence |
|---|---|---|
| Lead/contributor selections linked | Separate lead and contributor state; selecting a contributor leaves Set lead unselected | project.test.tsx |
| Document access unclear | Explains separate project/document access and directs the user to an Owner permission check; section-local failures retain project context | document.test.tsx, project-resources.test.tsx |
| Workload zeros before setup | Schedule-derived capacity figures show Not ready and Setup required in plain language | workforce.test.tsx |
| Reviewer technical language | Creation explains that an authorized person appoints an independent reviewer in Internal reviews | task-composer-fields.test.tsx, task.test.tsx |
| Lead cannot discover assignment | Server-eligible owner selection is available while creating a project task; canonical reassignment remains available | task-composer-fields.test.tsx, task-creation-options.test.tsx, task.test.tsx |

## Historical verification record (superseded by final reviewed acceptance)

- Focused project creation tests: 9 passed; project task context tests: 17 passed; task creation recovery tests: 9 passed. These are bounded runs, not full-suite acceptance.
- Earlier web typecheck, targeted lint and production build passed. A later typecheck caught unsupported Testing Library `exact` test options; these were removed and recheck passed.
- First broad web run: 715 passed, 2 creation-recovery timing failures. Both recovery tests passed in the isolated nine-test run. A settled-source single-worker full run is pending; the failed run is not acceptance evidence.
- A second broad run also returned 715/717, with two different post-create title waits exceeding Testing Library's one-second default. The isolated creation suite passed 9/9. The four asynchronous post-create title waits now allow five seconds while retaining identical canonical ID, exact command, write-count and queue assertions. Final acceptance runs in a committed isolated checkout because concurrent shared-navigation edits appeared in the original checkout.
- Authenticated desktop/mobile browser acceptance, rendered screenshots and final selected-file review are pending.
- The initial sandboxed database preparation hit a loopback EACCES error. Disposable fixtures were preserved. Subsequent provisioning uses ownership-checked fresh clusters outside the restricted networking sandbox. No retained staging database has been migrated or seeded.

No schema, API contract, approval rule, permission policy or workload calculation changes are proposed. Canonical staging has not been updated by this slice. Actual operational and production limits remain unchanged.

## Earlier committed candidate checks (not deployment acceptance)

Candidate: `c610612c144f241c0d97a8064512b2fe47819871` (implementation `22b7552`, asynchronous test waits `c610612`). Tests run in the Git-exported source for build `c610612c144f-1793164156062`, excluding concurrent shared-navigation/backlog changes in the original checkout.

- Web regression: **717 passed / 72 files**, zero failures, on the isolated candidate. Report: `.env.staging/builds/c610612c144f-1793164156062/.env.projects-review-temp/web-acceptance.json`.
- Candidate web typecheck and targeted ESLint: exit 0. Contracts/API/web production build and sealed release packaging: exit 0; artifact remains BUILT_NOT_PROMOTED.
- Browser execution remains pending. A fixture setup error was corrected to create tasks through the authenticated API, preserving required initial task evidence. A later pnpm dependency-mode issue stopped the runner before tests; the disposable environment is being restored from the frozen offline lockfile and Playwright invoked directly.
- No full `pnpm verify`, complete API/PostgreSQL regression, hosted CI or production acceptance is claimed for this frontend slice.
- Actual routing: current Codex session for implementation and verification; the earlier independent read-only Codex plan review is recorded in the companion plan. No additional implementation agent or Opus/Sonnet acceptance is claimed.

Native-browser acceptance found a real focus defect: Project task refreshes removed the originating queue button while the drawer opened/closed, so native dialog focus restoration had no connected target. Project Tasks now retain their already authorized current page during refresh, matching the shared drawer's existing My Work behavior. Loading feedback and authorization rechecks remain; denied responses still clear protected data. The four-view unit regression now checks that the original button stays connected and receives focus after close (17/17 focused tests passed). The earlier c610612 artifact is retained but is **not an accepted deployment candidate**. Final reruns cover this correction plus Owner/contributor selection independence and a real authorized lead create/reassign journey.

## Final bounded checks

All 717 web tests passed again after the opener-focus correction (`web-final-focus.json`). The focused creation entry and secondary-action correction then passed all 53 affected tests (`final-projects.json`). The independent command-anchor correction is covered by the final 65-test and five-browser runs below. Reports are under `.env.staging/builds/c610612c144f-1793164156062/.env.projects-review-temp/`.

Final fixture 1793145600011_aabbccddeeff passed all three browser tests: identity, desktop Projects and phone Projects; zero skips, retries or flaky results. All four task views, native modal/focus behavior, all eight project sections, 320/390/768/1024/1440px overflow checks, branch restoration, independent lead/contributor selection, and persisted authorized lead task creation and reassignment passed. The fixture explicitly grants the contributor project.view, uses the exposed Assign to another person control, and activates the project through the normal lifecycle before reassignment. No permission or lifecycle rule was relaxed.

Browser evidence: `.env.staging/builds/c610612c144f-1793164156062/.env.review-routing-20261023/1793145600011_aabbccddeeff/browser-results.json`, accompanying log, traces and 36 screenshots (18 desktop, 18 phone). Current Codex visually inspected project sections, task panels, focused creation and lead assignment captures on desktop/phone. Final selected application content is through 7c6c752; browser fixture corrections through bd5eabb. Selected-source comparisons account explicitly for Windows CRLF versus Git LF; raw fixture identity checks remain unchanged.

Concurrent navigation, task-people and My Work changes in the original checkout are preserved and excluded from these bounded acceptance claims. The original c610612 sealed artifact is retained and must not be promoted: it predates the focus/creation correction. No staging deployment or retained migration was performed.

## Final reviewed acceptance — authoritative

Final selected Projects application/test content: **2525206**, with the original five usability corrections inherited from the implementation base. Thirteen selected source/test files were compared against committed content, explicitly normalizing CRLF/LF while retaining raw SHA256 fixture identity. The isolated source inventory matched the fixture fingerprint after verification. This is bounded selected-source acceptance, not acceptance of unrelated concurrent master changes.

| Check | Actual result |
|---|---|
| Full web regression after opener-focus fix | 717 passed /72 files; final later changes covered below |
| Final Projects and shared drawer unit regression | 65 passed, zero failures |
| Real PostgreSQL Workforce suite | 19 passed, including missing-schedule versus configured-day-off coverage |
| Focused schedule-coverage API unit | 1 passed |
| Final authenticated browser run | 5 passed; zero skipped, unexpected or flaky results; no retries |
| Final web typecheck, targeted ESLint and preview build | Exit0 |
| Independent Codex source review | One P2 command-anchor defect fixed; reviewer confirmed resolution, no further concrete concern |

The five browser cases are identity plus desktop/phone document and Projects journeys. They prove confidential PDF upload, refresh and download; all eight Project sections; all four task views; native modal/focus restoration; command-shortcut focus; phone section/status selectors including all13 states; viewport overflow checks at320/390/768/1024/1440; cancellation and confirmed creation restoring shared branch context; independent contributor/lead drafts; and real authorized lead assignment/reassignment checked against persisted rows. Current Codex inspected desktop/phone captures; no independent visual review is claimed.

Final evidence root: `.env.staging/builds/c610612c144f-1793164156062/`. Unit/API reports and logs are in `.env.projects-review-temp/`; final browser results, log, traces and36 Project screenshots are in `.env.review-routing-20261023/1793145600012_aabbccddeeff/`. `final-acceptance.json` records the source fingerprint, exact boundaries and cleanup result. Disposable cluster identities were verified before shutdown; data/evidence remain preserved. Retained staging was not migrated, seeded or deployed.

The authoritative receipt is `.env.projects-review-temp/final-acceptance.json`; the thirteen-file comparison is `.env.projects-review-temp/final-selected-source.json`. Both final isolated clusters stopped successfully with identity verification. Independent reviewer confirmed the P2 resolution after inspecting the changed gate and the 65-test evidence; final native browser assertions subsequently passed on desktop and phone.

The final application differs from the earlier c610612 artifact. A future staging update must select and build an approved matched source candidate including these corrections; never promote the older artifact. Full `pnpm verify`, full backend regression, aggregate concurrent master, actual operational acceptance and production readiness are not claimed.

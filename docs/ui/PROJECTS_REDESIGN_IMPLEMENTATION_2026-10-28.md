# Projects redesign implementation — 28 October 2026

Status: IN PROGRESS. Implements the Owner's D1–D8 and E1–E6 decisions in the existing application. This report does not authorize deployment or claim production acceptance.

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

## Verification record

- Focused project creation tests: 9 passed; project task context tests: 17 passed; task creation recovery tests: 9 passed. These are bounded runs, not full-suite acceptance.
- Earlier web typecheck, targeted lint and production build passed. A later typecheck caught unsupported Testing Library `exact` test options; these were removed and recheck passed.
- First broad web run: 715 passed, 2 creation-recovery timing failures. Both recovery tests passed in the isolated nine-test run. A settled-source single-worker full run is pending; the failed run is not acceptance evidence.
- A second broad run also returned 715/717, with two different post-create title waits exceeding Testing Library's one-second default. The isolated creation suite passed 9/9. The four asynchronous post-create title waits now allow five seconds while retaining identical canonical ID, exact command, write-count and queue assertions. Final acceptance runs in a committed isolated checkout because concurrent shared-navigation edits appeared in the original checkout.
- Authenticated desktop/mobile browser acceptance, rendered screenshots and final selected-file review are pending.
- The initial sandboxed database preparation hit a loopback EACCES error. Disposable fixtures were preserved. Subsequent provisioning uses ownership-checked fresh clusters outside the restricted networking sandbox. No retained staging database has been migrated or seeded.

No schema, API contract, approval rule, permission policy or workload calculation changes are proposed. Canonical staging has not been updated by this slice. Actual operational and production limits remain unchanged.

## Committed candidate acceptance

Candidate: `c610612c144f241c0d97a8064512b2fe47819871` (implementation `22b7552`, asynchronous test waits `c610612`). Tests run in the Git-exported source for build `c610612c144f-1793164156062`, excluding concurrent shared-navigation/backlog changes in the original checkout.

- Web regression: **717 passed / 72 files**, zero failures, on the isolated candidate. Report: `.env.staging/builds/c610612c144f-1793164156062/.env.projects-review-temp/web-acceptance.json`.
- Candidate web typecheck and targeted ESLint: exit 0. Contracts/API/web production build and sealed release packaging: exit 0; artifact remains BUILT_NOT_PROMOTED.
- Browser execution remains pending. A fixture setup error was corrected to create tasks through the authenticated API, preserving required initial task evidence. A later pnpm dependency-mode issue stopped the runner before tests; the disposable environment is being restored from the frozen offline lockfile and Playwright invoked directly.
- No full `pnpm verify`, complete API/PostgreSQL regression, hosted CI or production acceptance is claimed for this frontend slice.
- Actual routing: current Codex session for implementation and verification; the earlier independent read-only Codex plan review is recorded in the companion plan. No additional implementation agent or Opus/Sonnet acceptance is claimed.

Native-browser acceptance found a real focus defect: Project task refreshes removed the originating queue button while the drawer opened/closed, so native dialog focus restoration had no connected target. Project Tasks now retain their already authorized current page during refresh, matching the shared drawer's existing My Work behavior. Loading feedback and authorization rechecks remain; denied responses still clear protected data. The four-view unit regression now checks that the original button stays connected and receives focus after close (17/17 focused tests passed). The earlier c610612 artifact is retained but is **not an accepted deployment candidate**. Final reruns cover this correction plus Owner/contributor selection independence and a real authorized lead create/reassign journey.

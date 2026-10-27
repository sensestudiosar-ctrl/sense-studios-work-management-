# P1/P2a prototype refinement — Owner review candidate

**26 October evidence update:** [Every new review submission requires selected file evidence or a valid link](../evidence-rule-2026-10-26/README.md), with updated evidence for resubmission and immutable round history. The preceding 82-test results below remain historical; use the evidence-update package for the latest run. No production implementation is authorized.

25 October 2026. **Prototype only; production implementation remains unauthorized.**

[Open the updated interactive artifact](../../../../v1-demo/task-creation-completed-demo.html) · [35 before/after comparisons](BEFORE_AFTER.html) · [Playwright report](playwright-report/index.html) · [Actual results](playwright-results.json) · [Source preservation](PRESERVATION.json).

The same designated HTML review artifact was refined. Its preceding version and editable sources are preserved under `before/`. No second application, package, dependency, API field, permission, business rule or deployment was introduced.

## What changed

| Requested problem | Refined interaction | Evidence |
|---|---|---|
| Eight project sections inaccessible on mobile | A spaced horizontal strip stays present across all eight sections, with a visible partial next item, scroll hint, native scrollbar, underline/current selection and keyboard Arrow/Home/End support. Contextual return stays above the strip while scrolling | Five viewport section/keyboard journeys; before/after Project Tasks |
| Crowded My Work toolbar | Full-width 48px search; a separate two-control Filters / Sort–View row; four compact, labeled actionable KPI cards in a two-column phone grid; no duplicate mobile create FAB | Five viewport geometry/overflow journeys; before/after My Work |
| Task/project context lost | Record originating task, query, filters, group/sort, metric focus, expanded groups and scroll. Project Tasks highlights the exact ID and names the origin. Return restores that view, scroll and task keyboard focus | Five viewport journeys with active Project/priority filters and search |
| Conflicting next-step suggestions | One eligible primary action in the task footer. Start, reviewer assignment, submission, correction prerequisites, unfinished child work, review, approval and completion remain distinct. Blocked guidance names the responsible actor | Existing regression plus focused worker/manager/subtask scenarios |
| Reviewer setup unclear | Creation exposes optional independent reviewer selection only for the modeled current project assignment authority. Employees see the responsible Project Lead/manager. Owner is an authority to assign, not an employee reviewer candidate | Manager/employee and out-of-scope Team Leader tests |
| Correction completion dead end | Completion promotes Return to original task. Resubmission explicitly requests updated evidence. Result shows the current round and named reviewer. Dashboard and My Work row guidance update with the same state | Five viewport correction/resubmission and stale-row regression journeys |

The approved pine/cream/paper palette, Dashboard summaries/essential-card/attention structure, original My Work queue and task-creation Brief + Assignment & timing layout remain the foundations. The detail view uses sections and dividers instead of several nested bordered cards. Status and priority retain text labels; people use compact labeled avatar groups. Secondary subtask/activity controls are disclosed. Small-phone creation status gets its own footer row so Cancel/Create task stay readable on one line. The duplicate owner caption beneath review setup was removed.

## Reviewer authority and compatibility

The read-only contract check used `apps/api/src/review.service.ts`: `manager`, `candidate`, `assignReviewer`, `submit` and `complete`. Owner, current Project Lead, or the required project-management/task-assignment permissions determine assignment authority. Candidates must be active assigned employees with current project/review authority and must be independent of the worker/submitter. Role titles alone do not confer authority.

The prototype uses an explicit synthetic capability table. Meera is the modeled Lakeview Project Lead; Neha is the modeled Palm/Swagath Project Lead. Selecting the Team Leader persona does not grant Palm/Swagath management authority. These are review scenarios using existing sample people, **not verified real roles, new identities or backend grants**.

Reviewer selection is a composition of **existing separate actions**: create task, then assign reviewer after creation confirmation. It is not added to the canonical creation payload or API contract. The sample assignment is applied only once to the confirmed task, with its own activity entry and eligibility checks. Leaving the selection blank preserves the explicit later-assignment path. A production version would require current server-returned capabilities, candidates and separate command results; this prototype does not authorize that implementation.

Immutable requirements and past review evidence/decisions stay intact. A NONE-review correction does not acquire a mandatory file/checklist gate. Required updated evidence belongs to original-task resubmission. Independent internal approval remains separate from task completion; client approval, publishing and formal issue remain outside this internal scope.

## Verification

The final suite passed **82/82 tests**, with no failures, skips or flaky results: the existing 42 regression cases across seven widths, plus 40 refinement cases across **1440, 1024, 768, 390 and 320px**. See [confirmed results and exact scope](TEST_RESULTS.md). Fourteen candidate visual snapshots are compared without updating baselines during the final run; they demonstrate repeatability, not automatic Owner visual approval.

Tests cover authorized manager creation with independent reviewer setup; employee creation without assignment authority; denial of assignment outside modeled project scope; active filters/query/group/scroll/task focus through Project Tasks; all eight project sections and overflow; correction completion and prominent return; updated evidence/current round/named reviewer; refreshed Dashboard and My Work guidance; unfinished subtask prerequisites; keyboard operation, focus return, unsaved details and creation drafts; recovery states and existing one-receipt creation behavior. Every browser test asserts zero uncaught page errors and zero HTTP(S) request attempts while network requests are blocked.

`SOURCE_BEFORE.json` records this refinement's starting hashes. `PRESERVATION.json` compares **909 tracked application/API/contracts/package/lockfile/scripts/infra/configuration files** and the final review HTML hash. This is separate from the older discovery baseline and does not reset or claim acceptance of historical concurrent work. No database, authentication, staging or production operation was run. No application unit/build/full-verify result is claimed.

The final comparison found **907 unchanged files and two concurrent changes** in `apps/web/src/my-work/my-work-parity.css` and `apps/web/src/task.tsx`. This task did not edit or revert either file. They remain outside prototype acceptance; the source preservation comparison is not labelled a complete pass.

Reproduce with the installed browser/test runtime, without dependency resolution:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/HI/AppData/Local/ms-playwright'
node docs/v1-demo/build-connected-prototype.mjs
node node_modules/@playwright/test/cli.js test --config docs/v1-demo/connected-refinement.config.mjs
node docs/v1-demo/capture-refinement.mjs after
node docs/v1-demo/refinement-gallery.mjs
```

An initial pnpm invocation was blocked during its workspace dependency check; no installation succeeded. Tests use the already-installed Playwright CLI directly. Earlier failed/intermediate results remain in the `attempt-*` evidence. Failures included targeting the desktop People control instead of opening the task, checking a CSS-generated origin marker as DOM text, duplicate action labels behind the native modal, and a test racing a pending start/creation result. The origin marker now has real DOM text, dashboard links have distinct contextual wording, and tests explicitly open tasks by keyboard and wait for confirmation.

## Review the refined prototype

1. On a phone-sized view, open My Work and use Search, Filters and Sort/View. Open a filtered task, follow its Project Tasks link, scroll through all eight project sections, and return to the same task/list.
2. Use review controls to compare Owner creation with employee creation. For internal-review tasks, inspect who can choose a reviewer and who is responsible when assignment is unavailable.
3. As the Designer, read SS-142 feedback, complete SS-143, use the prominent return, add updated evidence and resubmit. Check that the drawer, Dashboard and My Work now describe the pending round rather than an unfinished correction.

## Remaining issues / acceptance limits

- Owner review of the revised hierarchy, mobile controls, optional reviewer setup and before/after differences is still pending. Passing snapshots does not approve the design.
- Capabilities, people, evidence and receipts are synthetic session data. Real API authorization, version conflicts, changed project/candidate eligibility and separate assignment failure/retry must be tested only during a separately authorized integration phase. The actual creation API has not been changed.
- Non-Tasks/Reviews project business workflows remain explicit retained destinations, not new implementations. No supported production capability was deleted. The earlier complete capability inventory remains applicable.
- Human usability timing/task-success testing, physical software keyboards, Safari/Firefox, zoom/reflow and screen-reader validation remain unverified. Chromium keyboard/geometry tests are not blanket accessibility certification.
- Unsent-detail discard uses the browser's native confirmation dialog. Reload resets the connected review session; no new offline/reload persistence is promised.
- Client/external role audits remain **BLOCKED / Owner-deferred**. No identity, grant or fixture was created, and this prototype is not evidence for accepting portal changes.

Stop for Owner review. No application implementation, commit/push, staging promotion or automatic next phase is authorized by this delivery. Actual model: current Codex; no independent Opus/Sonnet/agent acceptance is claimed.

# Working Version 1 — UI capability gap audit (2026-10-16)

**Date:** 2026-10-16
**Status:** Read-only findings against the static design prototype; 7 defect fixes applied and verified.
**Relationship to the main plan:** **Subordinate.** This document does not modify
`PLAN_V1_WORKING_VERSION.md`, does not re-scope any V1 slice, and does not touch the
tracked source tree. It exists so the Owner can see, in one place, what the current
prototype can and cannot do against the six capabilities requested for Working
Version 1, and where that differs from what the real application already implements.

## 1. What was audited

Two distinct artifacts were examined, and they are easy to confuse:

| Artifact | Path | Status |
| --- | --- | --- |
| Real application | `apps/api`, `apps/web` | Tracked, 369 uncommitted changes, owned by the V1 slices in `PLAN_V1_WORKING_VERSION.md`. **Not modified here.** |
| Static design prototype | `docs/design/_build/app.html` + 21 `_chunk*.js` | 44 files, **entirely untracked by git** (`git ls-files` returns 0 for the directory). A single-file static mock with hand-written JS data. Edited in this pass. |

Everything in §2 is a finding about the **prototype**. The prototype is a design
exploration, not a deliverable; the acceptance criteria and gates in
`PLAN_V1_WORKING_VERSION.md` §6 govern the real application.

**Method.** The prototype was loaded in a headless DOM (jsdom 30.1.1.1, resolved
from this repo's own `node_modules`) with scripts executed, and every rendered view
was exercised programmatically. Runtime errors, thrown exceptions per view, emitted
`data-act` attributes versus handled cases in the click switch, and leaked
`undefined`/`NaN` text were all measured. No screenshot tooling was used.

## 2. Defects found in the prototype and fixed

All seven are verified after fixing. Final result: **34 assertions pass, 0 fail,
0 runtime errors** across all 10 views plus the modal and notification layer.

| # | Defect | Severity | Fix |
| --- | --- | --- | --- |
| 1 | `renderView` never handled `work`/`tasks`; `TITLE.work` did not exist, so `shell()` read `undefined.h` | **Demo-killing** — clicking *My Work*, the top nav item, threw `TypeError` and destroyed the whole app | Added the `work` route to `renderView` and the `work` key to `TITLE` |
| 2 | *My Work* and *Tasks* rendered the identical page and identical title | High — the exact confusion the Owner named | `TITLE.tasks.h` was `My Work`. Corrected, and `open()` now sets `S.board` to `mine` for My Work and `all` for Tasks. Verified: My Work = 14 tasks, Tasks = 92 |
| 3 | The *Open task* button was inert | High | The create route is now real and renders a working form |
| 4 | People table showed `?` as the assignee avatar on every row | High | Unassigned-assignee fallback returns a placeholder instead of interpolating an undefined person |
| 5 | People table sorted all rows and showed the first name on every row | Medium | Sort is now a stable descending-utilization ordering over the rendered slice |
| 6 | Capacity read `0h / week` | Medium — a zero on a headline metric reads as broken | Replaced the undefined field reference with the real weekly-hours total (6180h) |
| 7 | Task detail modal was unreachable — `modalLayer()` always rendered the create form | High | `modalLayer()` now routes: `'new'` → create form, a task id → detail view, unknown id → form fallback. Detail verified rendering 8 sections and a 3-step timeline |

Two identity fixes were also applied:

- **Settings profile claimed a different person than the logged-in user.** It
  hardcoded *Elena Marchetti, Studio Director, Milan, IT*. The app's `ME` is
  *Elena Whitfield, Head of Product, San Francisco*. The profile now derives
  name, role, location, email and time zone from `ME`, so the displayed identity
  is the same as the one shown on tasks and approvals.
- **Search results referenced `projectLabel`** — verified present on the task
  shape, so no fix was needed once checked rather than assumed.

## 3. Prototype gaps remaining

These are not fixed. They are design-work items, listed in rough order of how much
they limit the ability to judge Working Version 1 from the prototype.

### 3.1 Access control is not modelled at all

A token scan across all 21 chunks returns **zero** occurrences of any permission
concept — no `permission`, `can()`, `canDo`, `role`, `RBAC`, `admin`, `scope`,
`policy`, `403` or `forbidden`. `TEAM[].role` exists as display data
(`owner, designer, pm, qa, dev`) and `ME.role` is `owner`, but nothing branches on it.

Consequences visible in the prototype:

- Every user would see every project, every task and every person.
- There is no user switcher and no denied state, so access control cannot be
  *demonstrated* at all — only assumed.
- Settings has a Security card (2FA, session timeout, "require 2FA for approvals")
  but no access or role configuration, and no indication of what the current
  account can and cannot do.

**Note:** this is a prototype gap, not a gap in the real application. Slice C of
`PLAN_V1_WORKING_VERSION.md` states the real backend authorization is authoritative
and already implemented; Slice A already distinguishes Owner from Staff on the
people directory. The prototype should be read as illustrating *layout*, not
*authorization*. If the Owner wants access control shown in the prototype, that is
new design work and should mirror the real role model rather than invent one.

### 3.2 Settings navigation is missing

`S.settingsTab` exists in state but **nothing emits a control for it and
`vSettings` never reads it** — verified by string search. Settings therefore renders
one flat scroll of four cards (Your profile, Notifications, Team, Security) and
stays that way regardless of navigation.

Slice B of the main plan wants Settings split into *personal* (Account & devices,
Notifications) versus *Owner configuration* (Organization, Branches & teams, Job
roles & access, Task/workflow configuration). The prototype currently has neither
split nor the navigation to move between panels.

### 3.3 Settings controls are non-interactive

10 of 10 `.tog` toggle switches in Settings carry **no `data-act`** — they are
purely decorative. Same for the Save/Cancel buttons: `Save changes`, `Change
password` and the team summary all have no handlers. There is no draft state, no
pending state and no save confirmation anywhere in Settings.

Slice B's "current value, local draft, Save/Cancel, field errors, pending/success,
conflict handling" cannot be demonstrated from this prototype.

### 3.4 Four controls are wired but unhandled

Emitting `data-act` attributes across all views, the modal and the notification
popover, and diffing against the click switch's handled cases:

| Emitted | Handler | Effect |
| --- | --- | --- |
| `open-person` | none | Person rows are not clickable |
| `add-tag` | none | Tags cannot be added to a task |
| `rm-tag` | none | Tags cannot be removed |
| `add-step` | none | Timeline steps cannot be added |

`submit-task` does fire, but it only closes the modal and toasts
`Task created` — **no task is actually added to `TASKS`**. The new-task flow is
therefore cosmetic.

### 3.5 People table is truncated with no way to see the rest

`TEAM.length` is 150 and all 150 are `status: active`, but the table renders
`.sort((a,b) => b.util - a.util).slice(0, 24)` — 24 rows, **0 pagination controls,
and no "showing X of Y" indicator**. There is no sign that 126 people are not being
displayed. This is the same class of defect Slice A's Definition of Done is meant
to catch in the real app ("pagination/count agreement"), and it is worth fixing in
the prototype too since it would otherwise look like the directory is complete.

### 3.6 Task creation form is decorative in the details

The form mounts and is well-structured (title, description, project, type, priority,
assignee with 150 real options, due date, tags, timeline, notifications), but:

- Tag chips, timeline steps and notification checkboxes are hardcoded and static.
- Due date defaults to `TODAY + 14 days` — correct and verified.
- Nothing is captured or persisted; see §3.4.

Slice D's "one shared composer and command adapter" is already implemented in the
real app as `TaskCreateDialog`; the prototype is a visual reference for it.

### 3.7 Search is reachable but narrow

`data-view="search"` is correctly emitted from both the sidebar and the top bar, so
the view is reachable (11,184 bytes of rendered output). But the result set is
hardcoded to tasks whose title or tags contain `billing`, plus three projects — it
does not respond to any input and cannot find anything else.

## 4. What the prototype gets right

Verified working, and worth keeping as design reference:

- **All 10 views render without error** — work, tasks, projects, people, dashboard,
  calendar, reports, approvals, settings, search.
- **Zero `undefined` or `NaN` leaked** into rendered text across all views, the
  modal and the notification layer.
- **The task detail view is real and good.** It renders description, blockers
  (verified on a blocked task), an activity timeline with done/current/todo states,
  dependencies as clickable related tasks, and a detail sidebar with assignee,
  reporting line, priority, effort and tags. 3,800–3,900 bytes of genuine structure.
- **Data is internally consistent.** Sidebar counts (My Work 14, Tasks 92,
  Projects 6, People 150, Approvals 5) all match the underlying arrays. Capacity
  6180h matches the 150-person team.
- **The modal lifecycle is clean** — opens, closes, leaves no residue (byte count
  returns exactly to baseline).
- **Navigation works** for all six sidebar targets after the §2 fixes.

## 5. Recommendation

The prototype has reached the point where it is useful as a **layout and
information-architecture reference** and weak as a demonstration of behavior. The
seven defects in §2 were worth fixing because two of them (My Work crashing, My Work
showing everything) directly contradicted what the Owner asked for and would have
made any review of the prototype misleading.

For Working Version 1 itself, the governing document remains
`PLAN_V1_WORKING_VERSION.md`. Two of the Owner's six requested capabilities are
already in scope there and do not need new planning:

- **Proper access control** → Slice C (Serves V1-01), flagged highest risk,
  inventory-first, additive only.
- **Proper settings panels** → Slice B (Serves V1-04), with the personal-versus-
  Owner-configuration split already specified.
- **People management tab** → Slice A (Serves V1-03), Owner/Staff access split
  already defined.
- **My Work tab, Projects tab, task creation form** → Slices E, G, D respectively.

The genuinely open question is **whether the prototype should be extended at all.**
The gaps in §3 are best fixed in the real application, where the authorization and
persistence that make them meaningful already exist. Extending the prototype would
mean hand-building fake roles, fake toggles and fake saves that would then have to
be thrown away, and risks the prototype being mistaken for the delivery.

## 6. What was not done, and what was not verified

- **No real application code was changed.** `apps/` is untouched.
- **Nothing was committed, stashed, reset or branched.** The 369 tracked uncommitted
  changes are preserved exactly as found. The 44 prototype files remain untracked.
- **No test suite was run.** `pnpm verify`, unit tests, typecheck, lint and build
  were all **not run** in this pass. This host cannot run them: the pinned toolchain
  is Node 24.19.0 / pnpm 11.19.0 and this environment cannot execute `pnpm`. The
  verification reported here is the jsdom DOM harness described in §1 — 34
  assertions over rendered HTML and state transitions only. It does not test the
  real application, persistence, migrations, server startup or authenticated
  behavior.
- **No server was started and no browser was used.** Screenshots were not taken.
  Layout, spacing, overflow and responsive behavior at 1440 / 1024 / 390 / 320 were
  **not** checked here; the known 320px scroll issue noted in `CLAUDE.md` is
  unchanged and unverified in this pass.
- **No schema, database, migration or server operation was performed.** The retained
  preview, the prepared MW-I02 stack and the isolated test database were not touched.
- **No claims about the real application's runtime behavior are made**, since none
  of its code was executed. Statements in §5 about what the real app implements are
  quoted from `PLAN_V1_WORKING_VERSION.md`, not verified here.
- The 2026-10-08 post-fingerprint edits to `apps/web/src/review.tsx` / `review.css`
  noted in `CLAUDE.md` remain outside S18/S27 acceptance; this audit does not
  address them.

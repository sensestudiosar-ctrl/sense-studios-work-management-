# Demo-parity completion — items 2 and 3

Target: make the My Work tab visually match
`D:/1.Sensestudios/DR RAJA/01.Designer/03. Renders/AFTERPHOTOSHOP/Sense_Studios_My_Work_Final_Demo.html`
and add the backend the demo implies.

## What is already done (verified this session)

**Item 1 — parity rows are live.** `parityEnabled` at
`apps/web/src/task.tsx:180` is now `personalOnly && listFirst` (was
`false && …`), so the personal My Work list renders `.my-work-demo-row`
markup through `MyWorkParityList`. Legacy `.task-queue-row` rows are
suppressed when parity is active, and the `<nav>` survives only for its
empty state. Cards / Board / Timeline and every non-personal route keep
their existing markup — the Tasks route is untouched. This matches the
Owner-approved Option A recorded in `CURRENT_STATE.md`.

Three tests were updated to the new markup (`.my-work-demo-row`,
`.my-work-priority-cell .my-work-priority`, `.my-work-row-text`). One
genuine defect was found and fixed at source rather than papered over in
the test: `my-work-parity.tsx` rendered the raw status
(`row.status.replaceAll("_"," ")` → "NOT STARTED") where the rest of the
app renders "Not started". Added `parityStatusLabel()` and used it in both
the row-text and status cells.

Gates run this session: `apps/web` unit suite **45 files / 456 tests
pass** (includes 60 task + 20 parity). Typecheck, lint and API suite have
**not** been run since these edits.

## Remaining gap analysis

The demo has four role scopes (Designer / Team Lead / Owner / Site Staff),
role-specific metric tiles, and a People popover with an "Assigned by"
identity. Mapping each against the real application:

| Demo concept | Status |
|---|---|
| 7-column row + priority pill + status chips | Done — renders from real data |
| "Next action" column | Done — derived client-side in `parityNextAction()` (`task.tsx:73`) |
| Due grouping (Overdue/Today/This week/…) | Done — `parityDueGroup()` |
| Pin toggle | **Partially there, no persistence** |
| Metric tiles (4 tiles, role-dependent) | **Missing** |
| Role-aware scopes (My Work / My Team / Site work / Organization) | **Missing** |
| People popover "Assigned by" | **Missing backend data** |
| Demo's role `<select>` preview switcher | **Out of scope — see below** |

Everything below is backend. Nothing here needs a schema migration.

## Decision needed — the demo's role switcher

The demo has a top-bar `<select id="role">` that re-renders the whole page
as Designer / Team Leader / Owner / Site Employee. That is demo
theatre: in the real app the role is the signed-in account, and
`apps/api/src/dashboard.service.ts:293` already derives
`OWNER` / `TEAM_LEADER` / `EMPLOYEE` from `actor.kind` and
`canManage`.

**DECIDED (Owner): do not build a client-side role switcher.** Selecting
"Owner" would either show data the signed-in user cannot see, or show
empty tiles, and the app has no precedent for impersonation UI. The
layout is driven from the real derived role instead.

## Item 2 — role-aware scopes and metric tiles

### 2a. Scope options by real role

`scopeOptions` at `task.tsx:572` currently offers the same six scopes to
everyone (Owner gets two filtered out). The demo wants:

| Derived role | Scopes |
|---|---|
| Owner | My Work, Organization |
| Team Leader | My Work, My Team |
| Site employee | My Work, Site work |
| Other staff | My Work |

The real backend scopes already cover the intent:

- **Organization** → existing `all` scope (`actor.kind === OWNER` → `{}`)
- **My Team** → existing `assigned` scope, which already resolves
  `managedReportIds()` — the reporting tree within the manager's own
  team, exactly the demo's `My Team`
- **Site work** → `all` scoped to `type: SITE`; `TaskType.SITE` exists

So this is a **frontend-only relabel and filter** — no API change. Extend
`scopeOptions` to emit the role-appropriate subset, reusing the existing
scope values so every existing authorization path is preserved. For
Site work, add a `type: "SITE"` filter on top of an existing scope rather
than a new scope value, so authorization is unchanged.

### 2b. Metric tiles from `dashboard/sources/tasks`

The demo's four tiles are role-dependent
(`summaryMetrics()`: Site Staff gets action/snags/uploads/overdue,
everyone else gets action/overdue/reviews/waiting).

`GET /dashboard/sources/:source` already returns exactly the right
sections for the non-site roles
(`dashboard.service.ts:274`):

| Demo tile | Existing section key |
|---|---|
| Needs action | `attention` |
| Overdue | `attention` (date < today) — needs a distinct `overdue` key |
| Reviews / corrections | `reviews` |
| Waiting / blocked | `waiting` |

**Backend change (small, additive):** add an `overdue` section to the
`tasks` source so "Overdue" is a first-class, clickable count rather than
a subset of `attention`. It reuses the same predicate
`periodDate(committedDueDate ?? targetDate) < today` already used in
`attention`, so it is authorization-neutral — it filters the same
already-authorized `allTasks(actor)` list.

The two Site Staff tiles (`snags`, `uploads`) map to
`SiteRecord.kind === "SNAG"` and evidence-upload state.

**DECIDED (Owner): build `snags` only, and omit `uploads` entirely.**
Snags read the existing `site` dashboard source, which already iterates
them (`dashboard.service.ts:282`). "Uploads pending" is omitted rather
than rendered as unavailable or faked — upload state is stored in JSON
`evidence` with no first-class queryable state, so a real count needs
schema work. The Site role therefore shows three tiles: action, snags,
overdue.

Frontend: add a `MyWorkMetricTiles` component following the existing
`PersonalPhaseCount` pattern in `my-work-attention.tsx` — same
loading / stale / denied / unavailable state handling, same
`onCountChange` plumbing. Each tile is a button that filters the queue
(`metricFilter` in the demo), which maps onto the existing
`temporaryPhase` / `metric: "reviews"` mechanism already in
`task.tsx:267`.

## Item 3 — People popover "Assigned by"

The demo's People modal distinguishes four relationships: responsible
worker, collaborators, **assigned by** (from assignment history, not a
collaborator), and reviewer (a separate role). The current
`TaskPeople` component shows owner and collaborators only.

The data exists:
- `TaskOwnerChange.actorId` → who performed the reassignment
- `Task.createdById` → who created the task
- `TaskCollaborator.addedById` → who added each collaborator
- reviewer is separate and already exposed via the review model

**Backend change (additive):** extend the task detail response with a
`people` object carrying `assignedBy: { accountId, name } | null` and
`collaboratorAddedBy` per collaborator, resolved from
`TaskOwnerChange` (latest) falling back to `Task.createdById`. Authorization
is unchanged — this reads from tasks the caller is already authorized to
see, and names are already exposed through
`primaryOwner.account.normalizedEmail`.

Frontend: extend `TaskPeople` to render the four relationships with the
demo's copy, keeping the existing accessible-name convention
(`People · <title>`) that `task.test.tsx:126` asserts on.

## Out of scope

- The demo's role `<select>` — **decided: not built.** Layout derives
  from the real signed-in role
- The demo's "Uploads pending" tile — **decided: omitted.** No queryable
  upload state; would need schema work
- The demo's inline task creation and site forms (already covered by the
  app's real creation flows)
- Any change to `.task-queue-row` markup or non-personal routes
- Migrations — no schema change is required

## Verification

Per `CLAUDE.md`, every claimed gate must actually run in this session.

1. `pnpm --filter @sense/api test:unit -- <touched spec files>`
2. `pnpm --filter @sense/web test:unit -- src/task.test.tsx src/my-work/`
3. `pnpm typecheck`, `pnpm lint`, `pnpm build`
4. Full `pnpm test:unit` (API + web)
5. Report exact pass/fail counts. `test:integration` and `test:e2e`
   require the CI disposable-Postgres lifecycle and cannot run on this
   host — state that plainly rather than implying they passed.

If `parityEnabled` lands as a real contract change for the personal route,
note that the S18/S27 acceptance fingerprint no longer covers it, per the
acceptance boundary in `CLAUDE.md`.

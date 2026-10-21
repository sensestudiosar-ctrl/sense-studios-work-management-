# My Work demo parity — gap analysis (2026-10-14)

Source of truth for this document: the Owner-supplied prototype
`Sense_Studios_My_Work_Final_Demo.html` (243 KB, single file, SHA256
`F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`, recorded
byte-identical to the locked prototype in CURRENT_STATE.md), compared against
the current checkout.

## Method and limits

Compared by reading source only: the prototype's markup/CSS/JS, and the
current `apps/web/src/*my-work*`, `actionable-work.tsx`, `task.tsx`,
`task-detail-drawer.tsx`, plus `apps/api/src/my-work.{controller,service}.ts`
and `packages/contracts/src/my-work.ts`.

**Nothing here was verified against a running application.** The sandbox used
for this analysis has Node 22.23.2 and no `pnpm`, against the pinned Node
24.19.0 / pnpm 11.19.0. No PostgreSQL, no server, no authenticated session, no
`pnpm verify`. Every statement below is a source-level observation, and each
one should be re-confirmed on a real host before anyone acts on it.

## Headline finding

**The My Work backend and most of the My Work frontend already exist and are
considerably more rigorous than the prototype.** This is not a blank build.
The prototype is a single-page mockup with 24 hardcoded tasks and
`localStorage`; the real app has a composed, transactional, permission-enforced
attention queue across three sources.

The genuine gap is **not** "the backend is missing". It is:

1. **Visual fidelity** — the prototype's signature "Sense task colour system"
   (per-state row rails and row tints, priority pills, centred status cells,
   metric colour cards, mobile row cards) is only partially present, and the
   live queue row in `task.tsx` renders with an *older, different* design
   language than the prototype uses.
2. **A handful of prototype affordances** that do not exist in the real app
   (task pinning, per-group "show more", metric focus panel, draft-note guard,
   site quick-actions panel, arrow-key row navigation).
3. **One real reliability weakness** in the backend: in-memory pagination.
4. **Live acceptance is still BLOCKED**, per the top CURRENT_STATE.md entry
   dated today. Source checks pass; nothing proves it works against real data.

Per the Owner's answer to my questions, this session targets full parity with
backend hardening. The rest of this document is the specific delta list.

---

## 1. What already matches (do not rebuild)

**Backend — `apps/api/src/my-work.service.ts` + `my-work.controller.ts`**

Already present and stronger than the prototype:

- One composed `GET /my-work/attention` endpoint projecting three sources
  (task, review, approval) into a single ordered queue, with per-source
  counts — the prototype has no backend at all.
- A single `RepeatableRead` transaction wrapping the actor read, organization
  timezone read, and all three source projections, with `FOR SHARE` locks on
  the canonical actor/reviewer/approval reads. No domain write occurs.
- Actor re-validation inside the transaction (`account.findFirst` on
  `id`/`state`/`kind`) and an explicit `ownerReady` gate for OWNER accounts.
- Zod validation on every query parameter (`attentionQuerySchema`), including
  a `dateFrom <= dateTo` refinement and a `dateBasis` requirement when any date
  bound is present. Strict mode rejects unknown keys.
- Deterministic ordering: organization-timezone deadline day, then priority
  rank, then source, then source ID.
- An honest failure envelope: any non-401/403/404 error becomes
  `ServiceUnavailableException("My Work sources are unavailable; no complete
  page or count was published")` — no partial queue is ever published.
- A contract-validating frontend consumer (`validAttentionPage` in
  `actionable-work.tsx`) that rejects a malformed page rather than rendering
  it, and independently derives source counts.

**Frontend — already present**

- `MyWorkTopCards` (Needs action / Overdue / Reviews / Waiting) with
  independent per-source counts, stale/denied/unavailable states, and retry.
- `MyWorkPhaseSummary` personal-phase counts with the same state machine.
- `MyWorkFilterChips`, `MyWorkQueuePreferences`, `MyWorkSavedViews`,
  `MyWorkMetricFocus`, `ActionableWork` composed queue, `TaskDetailDrawer`
  (4 tabs: Overview / Checklist / Evidence / Activity), `TaskCreateDialog`,
  `TaskPeople`.
- `/my-work` route wired in `app.tsx` line 1485, rendering `TaskWorkspace`
  with `personalOnly` and `MyWorkManagement`.
- The organization calendar drives the Overdue boundary
  (`previousCalendarDay`), never the browser timezone.
- Stale-snapshot messaging that separates queue staleness from count staleness.
- Confirmed-empty suppression so a zero-count source does not render an empty
  section.

**This is the part to protect.** Any parity work must not regress it.

---

## 2. The visual gap — "feels like this"

This is the largest real gap and the one that most affects "feels like the
demo". The prototype defines a complete semantic colour system in
`Sense_Studios_My_Work_Final_Demo.html`:

```
--state-todo:#758496; --state-progress:#2384be; --state-review:#e3a52d;
--state-waiting:#7d5cb9; --state-correction:#c84955; --state-done:#2b916a;
--priority-urgent:#b72f42; --priority-high:#d17623;
--priority-normal:#4a76a9; --priority-low:#647d76;
```

with these behaviours:

| Prototype mechanism | Effect | Present in real app? |
|---|---|---|
| `.task-row.state-*` sets `--state-rail` | 5px coloured left rail per status | **Partial** — `state-rail` exists in `my-work-visual.css` (12 refs) |
| `.task-row.state-*` sets `--row-tint` | whole-row tint per status | **Missing** — 0 refs anywhere |
| `.priority-pill.pr-*` | coloured priority pill | **Missing** — 0 refs anywhere |
| `.task-status-cell .status` | centred status chip, full column width | **Missing** — 0 refs |
| `.mobile-state` / `.mobile-due` | status + due chips inside the mobile row | **Missing** — 0 refs |
| `.metric.metric-action` / `-overdue` / `-snags` | metric cards with coloured left border + gradient | **Missing** — 0 refs |
| `.task-row:hover` → `#edf5f2` with inset ring | hover/selected treatment | Different values in real CSS |
| prototype row grid `minmax(245px,2.35fr) minmax(120px,1fr) 82px 114px 91px 115px` | 6-column desktop row | Real `task-queue-header` is 7 columns: Task, People, Priority, Status, Target, Committed, Next action |
| prototype mobile row `min-height:92px`, flex, priority line at left:10px | mobile card row | Real mobile row differs |

**The critical structural mismatch:** `task.tsx` line 620 renders the queue row
as

```
className={`task-list-item task-queue-row task-row-state-${task.status.toLowerCase()}...`}
```

using `task-state-${status}` and `task-priority-${priority}` classes defined in
`task.css` lines 123–130 — a *different* naming scheme and a different visual
treatment (soft tinted chips) from the prototype's solid-fill
`.status.todo/.progress/.review/.waiting/.correction/.done` chips and its
rail-plus-row-tint row.

So `my-work-visual.css` carries *some* of the prototype's language, but the
live row markup does not use it. That is why the app does not currently feel
like the demo.

**Consequence:** matching the demo's feel requires either (a) restyling the
existing `task-queue-row` / `task-state-*` markup in place, or (b) introducing
a new row renderer that uses the prototype's classes. Option (b) is what the
Owner selected (isolated `apps/web/src/my-work/`), and it is also the lower-risk
option because it does not touch the post-fingerprint `review.tsx` /
`review.css` edits or the 369 preserved changes.

---

## 3. Functional affordances in the prototype that are absent

Ordered by how much they affect "feels like the demo".

**Present in prototype, absent in real app:**

1. **Task pinning** — a pin toggle per row (`data-pin`), persisted in
   `localStorage`, with a "Pinned" group at the top of the queue. The real app
   has no pin concept.
2. **Grouping** — the prototype groups into *Pinned*, *Needs My Action*, then
   by due bucket (`Overdue / Today / This week / Next week / This month /
   Later / Without a date`) or by priority. Real app has a flat paginated list
   with sort.
3. **Per-group "Show N more"** — `state.shown[name]`, six at a time, with a
   `Show 6 more of 14 ▾` control. Real app uses server pagination only.
4. **Metric focus panel** — `renderMetricFocus()` shows a focused explanation
   of the selected metric with a clear action. `MyWorkMetricFocus` exists but
   is a narrower implementation.
5. **Draft-note guard on drawer close** — `mayLeaveDraft()` confirms before
   discarding an unsaved note. `TaskDetailDrawer` has a dirty-navigation guard
   for the drawer as a whole, but not the per-task note draft confirm.
6. **Site quick actions panel** — a 3-column grid of six shortcuts (Check
   in/out, Capture photos, Report snag, Request drawing, Daily report, Pending
   uploads) shown only to Site Staff, with a live pending-upload count.
   Entirely absent.
7. **Arrow-key row navigation** — Up/Down moves focus between `.task-row`
   elements. Real rows are buttons; no roving focus.
8. **Status legend** — `renderLegend()` renders a clickable status key that
   toggles a status filter. Absent.
9. **Sixth and seventh metric cards** — the prototype shows *Site snags* and
   *Uploads pending* for Site Staff (`summaryMetrics()` returns
   `['action','snags','uploads','overdue']` for Site Staff and
   `['action','overdue','reviews','waiting']` otherwise). The real app has four
   cards: Needs action, Overdue, Reviews, Waiting/blocked. **Note:** the top
   CURRENT_STATE entry records that the Owner settled the four card meanings
   (D1–D4). Adding snags/uploads is a change to a settled design and needs
   explicit Owner direction, not a silent parity addition.
10. **Time logging bar** — a running timer with start/stop and manual entry,
    writing to the time module. Prototype-only UI; the real Time module exists
    separately.

**Prototype features that are deliberately prototype-only** (the prototype
says so in its own copy, and these must NOT be copied):

- "Creating a task adds sample metadata to this browser; it does not create a
  record in the real Sense Studios app."
- "Names displayed as demo-only references. File bytes are not stored."
- "Demo shortcuts · permissions checked in app."
- The review canvas / annotation comparison (`reviewCanvas`, `modeRect`,
  `modePoint`, `annotationCount`) is a visual mock with no persistence.
- Role switching via `state.role` — the real app derives role from the
  authenticated session, and frontend visibility is never authorization.

---

## 4. Backend reliability gap

**In-memory pagination (real, worth fixing).**
`MyWorkService.attention` projects *all* matching rows from all three sources,
deduplicates, sorts, and only then applies
`unique.slice(query.offset, query.offset + query.limit)`. For a firm whose task
count grows into the thousands, this loads every actionable task, review round
and approval request into memory on every page request, inside a 30 s
RepeatableRead transaction. It is correct today and wrong at scale.

The fix is to push the ordering and paging into the database. The existing
`orderAttention` comparator (timezone deadline day → priority rank → source →
source ID) is expressible in SQL, but the timezone-aware `deadlineDay` for
`decision_expiry` rows needs care: it must stay a database-side expression in
the organization timezone, not a JavaScript `Intl` call. This is a
Sol-level design change (query shape, index requirements, and a decision about
whether to keep the in-memory path as a fallback for small result sets), not a
Luna-sized edit.

**What is already correct and must be preserved:** the RepeatableRead snapshot,
the `FOR SHARE` guards, the actor re-validation, the "no partial page" failure
envelope, and the strict zod schema.

**Not assessed (needs a real host):** index coverage for the new query shape,
actual lock contention under concurrency, and whether the 30 s timeout is
right once paging moves into SQL.

---

## 5. Live acceptance status — read this before promising anything

The top entry of `CURRENT_STATE.md` (dated today, 2026-10-14) states that the
D1–D4/E1 parity changes are implemented and that final pinned source checks
pass (API 355/57 suites, web 428/44 files, typecheck, lint, API and web
builds), and that a synthetic 32-capture gallery covers 1440×900 / 1024×900 /
390×844 / 320×740 with no overlap or overflow and card normal-text contrast
≥ 4.5.

It then states, verbatim in substance: **Functional Reliability and Prototype
Visual Fidelity for this new candidate remain BLOCKED** pending fresh bounded
authorization; fifteen real-PostgreSQL cases and one current browser journey
are *prepared but unrun*; source migration 118 was written but **not
deployed**; the retained 115-migration preview, 50 tasks, five staff and Owner
credentials are unchanged.

It also flags a specific residual risk: "Potential short-screen attention
discoverability remains: component first action requires 172px scroll at 320."

So: **the app is source-ready for My Work parity and is not proven to work
against real data.** Anyone asking "does it work like the demo?" must be told
"the source says yes and no live run has confirmed it", not "yes".

---

## 6. Recommended sequence

1. **Confirm the folder structure question with the Owner.** The existing My
   Work code is flat files in `apps/web/src/` and `apps/api/src/`
   (`my-work-attention.tsx`, `my-work-metrics.tsx`, `my-work.controller.ts`,
   …). The Owner selected `apps/web/src/my-work/` + `apps/api/src/my-work/`,
   which would diverge from that convention. Either adopt a folder and move the
   existing files (touches the preserved tree), or add the new parity files
   alongside the existing flat files. **This needs an Owner decision, not an
   assumption.**
2. **Build the prototype's colour system as an isolated, additive stylesheet**
   plus a new row renderer that consumes it, so the existing `task-queue-row`
   markup is untouched. Gate it behind the `/my-work` route only.
3. **Add the absent affordances in priority order:** pinning + grouping +
   per-group show-more (highest "feels like the demo" value), then metric focus,
   then arrow-key navigation, then the site quick-actions panel (Site Staff
   only, and only with Owner confirmation that it belongs in My Work rather
   than the Site module).
4. **Do not add snags/uploads cards without explicit Owner direction**, because
   the four-card set is a settled decision.
5. **Fix backend pagination as a separate, Sol-level slice** with its own
   acceptance criteria. Do not bundle it with UI work.
6. **Verify on a real host**: pinned Node/pnpm, `pnpm verify`, then the
   prepared fifteen real-PostgreSQL cases and the one browser journey, then
   fresh four-width authenticated captures. Until that runs, this remains
   IN PROGRESS.

## 7. What this analysis could not establish

- Whether the current My Work page renders correctly in a browser.
- Whether any of the ~20 existing My Work web tests pass (no `pnpm` here).
- Whether the backend compiles against the generated Prisma client here.
- Whether the prototype's colour values meet WCAG AA at every size (the repo's
  own synthetic contrast evidence claims ≥ 4.5 for card normal text; that is a
  synthetic check, not an authenticated one).
- Whether migration 118 applies cleanly (never deployed).

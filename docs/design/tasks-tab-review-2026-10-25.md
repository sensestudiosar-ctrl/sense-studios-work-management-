# Tasks tab — design & usability review

**Date:** 2026-10-25
**Scope:** The tasks surface in `apps/web` — My Work queue (`personalOnly`), the shared Tasks list (`listFirst`), filter bar, List/Cards/Kanban/Timeline views, the create-task composer, and the task detail drawer.
**Method:** Full read of the source (`task.tsx`, `task.css`, `my-work-parity.tsx/.css`, `task-detail-drawer.tsx/.css`) plus benchmarks via Refero: Linear (issue lists, issue detail), Asana home, Todoist "My work", Wrike table+side-panel, Hello Ivy task board, Marathon ticket.

---

## 1. What the benchmark consensus actually is

Six strong apps agree on a small number of structural moves. Use this as the target model before touching the current one.

| Concern | Linear | Asana | Todoist | Wrike | Hello Ivy | Marathon |
|---|---|---|---|---|---|---|
| **List row** | 5 cols: [status dot] [ID] [title] [project·label] [avatar] [date]. One heavy text element. | 4–5 cols, avatar prominent, due as chip | 2 cols: checkbox + title, metadata as chips | 6 cols, expandable | 4 status columns, card = checkbox + title + assignee + priority + due | Title + tags + avatars, single column |
| **Row height** | 24–48px | 40px | 36px | 40px | ~60px | 56px |
| **Grouping** | By status (In Progress / Todo / Backlog / Done), collapsible, count pill per header | By list/column | By project (Today, Upcoming, Inbox) | By view (table/board/calendar) | Status-as-column | Status |
| **Detail** | 3-column page: left nav, wide center scroll, fixed right properties panel (~260px). Not a modal. | Same, side panel | Full-page detail | 2-col: table left, inspector right | Side sheet | Full-page detail |
| **Filtering** | One horizontal filter bar above the list, removable value chips, in-place popovers, saved views | Filter panel + chips | Filter chips + sort, minimal | Table filter popover | Board filter popover | Filter menu |
| **Color** | Near-zero decoration. White/neutral-900 surfaces, 1px dividers, ONE accent (indigo) reserved for selection/primary. Color only where data has it: status dots + priority icons (4 fixed hues). Muted gray elsewhere. | Same discipline | Red header as single brand accent, rows neutral | Neutral, status in badges only | White, status as column, light tints | Neutral, tags colored |
| **Type** | One UI face (Inter), 13/12/20–24px scale, tight leading | One face, 13–14px body | One face, 14px | One face | One face | One face |

**The single most transferable lesson:** status is the dominant signal. Encode it once (dot or column), keep everything else quiet, and let urgency (overdue, critical) be the only other color.

---

## 2. Scorecard of the current tasks tab

Ratings are against the benchmark above, not against the internal demo-prototype. "Demo-parity" is noted where the current behavior intentionally matches the supplied prototype rather than the strong apps.

| Area | State | Rating | Notes |
|---|---|---|---|
| My Work 7-col queue row | 7 columns + per-row color rail + row tint + 4-level type | **Below benchmark** | `my-work-parity.css:82-107` |
| Priority pill | 4-color pill, 9px, ALL-CAPS, bold 800 | **Below benchmark** | `my-work-parity.css:143-161` |
| Status chip | Solid colored fill, 10px, inside each row *and* legend | **Above benchmark (too much)** | `my-work-parity.css:41-70` |
| Group headers | Text 12px, count pill 10px, uppercase column labels | OK | `my-work-parity.css:174-179` |
| Task detail drawer | 4 tabs (Overview/Checklist/Evidence/Activity) in a 570px modal | **Below benchmark** | `task-detail-drawer.tsx:35-40` |
| Filter bar | 12-field grid, apply/commit model, second inline sort select | **Below benchmark** | `task.tsx:1054-1072` |
| Views | List/Cards/Kanban/Timeline | OK | — |
| Create composer | Full dialog, 14 fields, capacity warning, uncertain-creation recovery | Strong (defensive) | `task-composer-fields.tsx` |
| Empty states | Text-only, one `⌕` glyph | Thin but acceptable | `my-work-parity.tsx:190-192` |
| Mobile (≤700px) | Rows become 92px cards, status+due chips, 44px targets | Good | `my-work-parity.css:221-240` |
| Accessibility | `:focus-visible` outlines, `aria-label` on rows, keyboard arrows, reduced-motion respected | Good | throughout |

**Net:** the hard engineering (state management, concurrency guards, permissions, recovery paths, responsive behavior) is well above the benchmark. The visual/interaction layer is intentionally demo-parity where the benchmark says "less." The review below separates what to keep from what to move.

---

## 3. Specific findings, ordered by impact

### F1 — The row carries too many equal signals (highest impact)

`my-work-parity.tsx:242-273` renders, per row:
- a 5px status-colored left rail
- a full row background tint by status
- a solid status chip
- a 4-color priority pill
- a colored next-action button (all rows)
- a pin, title (680 weight), context (10px), "Next: …" line (10px)

That is ~6 simultaneous emphasis layers. The benchmark apps carry at most 2 (one status dot, one priority marker). The result: no hierarchy, low scanability for the actual decision ("which task is urgent right now").

**Fix (Linear-style, keep the demo's structure):**
- Cut to 5 columns: `[status+priority merged icon] [title + one-line context] [due] [avatar] [chevron]`.
- Kill the per-row left color rail and the row tint. Keep a 3px status dot at the row's left edge — that's the only color on the row.
- Demote the priority pill to an icon glyph (● colored dot, no text) so it reads as a marker, not a label.
- Make the next-action affordance the only colored element; encode it as a single right-edge affordance (a `→` button that is filled when the row needs action and ghost when it doesn't), not a per-row labeled button that's always the same green.
- Move "primary owner" into an avatar with hover/tooltip instead of a text column. The `TaskPeople` column already exists; fold it into the avatar slot.

This is a re-scope of `ParityRow` plus a grid-template change in `my-work-parity.css:87`. Authorization and data are untouched — it is purely presentation, which the parity contract explicitly permits.

### F2 — Group-by-due is the right axis; the status legend below the queue is redundant

`my-work-parity.tsx:50` (`DUE_BUCKETS`) already groups by Overdue/Today/This week/Next week/This month/Later/Without a date. That matches the benchmark "due-bucket" pattern. But `my-work-status-legend` (rendered at `task.tsx:1076`) offers a second, status-axis filter right below the queue, and every row *also* shows a solid status chip. The user is being asked to read status three ways at once.

**Fix:** since due-buckets already separate "Overdue" (the urgent set), the per-row status chip can drop its solid fill and become a small dot + muted text (as F1 suggests). The legend then becomes the *only* place status is color-assertive. Remove or collapse the legend into the filter popover — Linear hides status filters in the toolbar, not as a permanent strip.

### F3 — All-caps 9–10px priority labels violate the "no ALL-CAPS labels" rule and hurt readability

`my-work-parity.css:143-157`: `.my-work-priority` is `font-size: 9px; text-transform: uppercase; font-weight: 800`. The group headers are also uppercase 10px (`:179`). At 9px uppercase, "URGENT" / "NORMAL" is near the edge of legibility, and the demo's own "Normal" is the most common value, so a pill appears on most rows — which is exactly the "color noise" problem.

**Fix:** drop the text pill entirely for Normal/Medium (the majority case) and show only an icon for Urgent/High, or render priority as a single 6px colored dot with a tooltip. Sentence-case 11px minimum for any visible text.

### F4 — Detail is a modal drawer with tabs; the benchmark is a deep-linkable page with a right properties panel

`task-detail-drawer.tsx` puts Overview / Checklist / Evidence / Activity in **four tabs** inside a 570px `<dialog>`. The benchmark (Linear, Wrike, Marathon) puts everything on one scrollable surface: title → description → sub-issues → activity → comments, with a fixed right panel for the editable properties (Status, Priority, Assignee, Dates). Tabs fragment context: a user checking "what's blocking this" has to click Checklist, then Activity, then back.

**Fix (incremental, presentation-level, no route change):**
- Widen the drawer to ~640px and make the header sticky with the status/priority/due/owner as **click-to-edit inline fields** (the current badges at `task-detail-drawer.css:130-164` are static; make them popover editors — Linear's signature move).
- Replace the 4 tabs with **one scroll** that sections: Description → Subtasks → Properties (right-aligned block) → Activity → Comments. Keep the tab *component* for a/b testing but default to the single-scroll layout.
- This is the biggest single usability win and it's achievable without touching `task.tsx`'s state machine — the drawer already receives `overview/checklist/evidence/activity` as ReactNode, so a "single scroll" variant just renders them in one column.

### F5 — The filter bar is a 12-field grid with a commit model; Linear uses a chip-based in-place bar

`task.tsx:1054-1072` + `task.css:48-53`: the full grid exposes Project / Stage / Priority / Collaborators / Owner / Status / Phase / Sort / Date basis / Date from / Date through / Search — all at once, with an explicit **Apply** button. The benchmark is a compact bar where each active filter is a removable chip, the rest collapse into one "Filters" popover, and sort is its own chip.

**Fix:**
- Keep the search input as the always-visible element (it already is).
- Collapse the 11 secondary fields into the existing `Filters` `<details>` popover (already implemented for `personalOnly` at `task.tsx:1056` — the non-personal route still shows the full grid; unify them).
- Surface each applied filter as a removable chip (the `MyWorkFilterChips` component at `task.tsx:1073` already does this for personal — extend it to the shared Tasks route).
- Make sort a chip too, not a second inline `<select>` competing with the one in the filter grid (`task.tsx:1075` has a duplicate sort control next to the queue).
- Remove the duplicate sort control.

### F6 — Type scale and color are intentionally "Monday-style" but sit 2–3 stops heavier than the benchmark

The demo's palette (`my-work-parity.css:18-28`) is a fixed 6-state + 4-priority set that the Owner supplied as a reference. That is a legitimate brand constraint, so **do not** "improve" it into Linear's indigo — the brief's own words win. What *can* change without breaking that constraint is **weight and size**, not hue:

- Row title 12px/680 → keep (it's the one heavy element; correct).
- Context/Next lines 10px → raise to 11–12px (10px is below the 12px meta floor the benchmark keeps).
- Priority 9px uppercase 800 → the fix in F3 (icon + tooltip).
- Group head 12px 750 uppercase → sentence-case 13px 600, drop the count pill's 10px to 11px.
- The 65px/50px row height is on the tall side for a 7-column dense queue (benchmark 24–48px). After F1 cuts columns to 5, 56px comfortable / 44px compact is the right target.

### F7 — Create-task composer is strong; two usability nits

- The capacity-warning + uncertain-creation recovery is genuinely better than anything in the benchmark — keep it.
- The composer shows 14 fields. For the `EMPLOYEE`/`SITE` variant it already compacts optional planning (`compactOptionalPlanning`, `task.tsx:286`). Extend that to **default the owner to self and hide the assignee picker** for employee variants (Linear does this) so the 2-field happy path is: title + due.
- The `Create task` button (`task.tsx:831`) is the only primary action in the header; good. It should be reachable via a global keyboard shortcut (Linear: `C`) — cheap win.

### F8 — The "Next action" column duplicates what the row itself is

Every row ends in a green "Open task → / Open correction / Submit for review" button (F in `my-work-parity.tsx:272`). On a dense list this is the 6th repeated element. The benchmark encodes "next action" **in the status** (a "Corrections required" row *is* the action). **Fix:** keep the next-action label only for the non-default statuses (corrections, review, approvals) where it adds information, and for plain "In progress" rows collapse the last column into a neutral chevron. This is what F1's "single right-edge affordance" means.

---

## 4. Recommended sequence (lowest-risk first)

All of these are presentation-only and live in `my-work-parity.css` / `my-work-parity.tsx` / `task-detail-drawer.css` / `task.tsx` (render branches). None touches the API, permissions, or state machine — consistent with the "demo-parity row renderer is presentation only" contract already in the code.

1. **F1 + F3 + F8** — row re-scope to 5 columns, status dot, priority icon, conditional next-action. One file: `my-work-parity.tsx` + `.css`. Highest scanability win.
2. **F5** — unify the filter bar: chip-based + popover on the shared Tasks route; remove the duplicate sort select. Touches `task.tsx` render only.
3. **F4** — drawer: widen, sticky click-to-edit properties header, single-scroll body variant (tabs kept as fallback). `task-detail-drawer.tsx/.css`.
4. **F2** — demote the legend to the filter popover; status read from the row's dot only.
5. **F6** — type-scale/row-height pass across the row and group head.
6. **F7** — composer: default-owner + `C` shortcut.

Estimated: 1–2 focused sessions each; 1 and 2 are independent and can run in parallel.

---

## 5. What NOT to do

- **Do not** restyle the canonical status set (13 statuses → 6 parity states) any further. The `parityState` mapping is documented as "presentation only, never authoritative" — keep it that way.
- **Do not** adopt Linear's indigo or any single-accent look; the Owner-supplied 6+4 color reference is the constraint, per the frontend-design rule that the brief's own words win.
- **Do not** change the API scopes or authorization. The parity renderer's whole value is that "the same authorized page renders through `MyWorkParityList` instead of the legacy `.task-queue-row` markup" — every change above preserves that.
- **Do not** remove the cards/kanban/timeline views; they're the benchmark's "view switcher" and already correct.

---

## 6. Benchmark sources

- **Linear** — issue list (grouped, 5-col, status dot + priority icon + avatar + date, collapsible status groups with count), issue detail (3-column, right properties panel, in-place popover editors, activity+comments as one feed), filter bar (removable chips, saved views, empty state = "No matching issues" + clear). *Best reference for the queue and detail.*
- **Asana home** — greeting + status pills + one checklist card + two cards; weekly view dropdown; customize. *Reference for the "My work" top-card density.*
- **Todoist "My work"** — 3-column (nav / categorized tasks / right productivity panel with progress charts); red-orange top bar as the single brand accent. *Reference for how much color a personal queue can carry: almost none in the rows.*
- **Wrike table + side panel** — table left, inspector right, expandable fields, status in badges only. *Reference for F4's panel layout.*
- **Hello Ivy task board** — 4 status columns, card = checkbox + title + assignee + priority + due + comments; clean white; filtering flow. *Closest structural match to the Kanban view already present.*
- **Marathon ticket** — title + tags + avatars, overflow 3-dot menu, single-column detail. *Reference for collapsing row actions into an overflow menu instead of a 7th column.*

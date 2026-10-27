# Task creation composer — refinement candidates (owner-requested, 2026-10-26)

**Scope:** first step only — a refinement proposal. No application code changed yet.
Production implementation remains unauthorized (D04 boundary,
`docs/design/application-ux-audit-2026-10-25/prototype-delivery/README.md`); this doc is the
design step the owner requested before any implementation.

## Research base

- **Demo (primary reference):** `docs/v1-demo/task-create-refinement.js` +
  `docs/v1-demo/TASK_UI_DEMO_README.md`. Demo desktop: 920px dialog, 280px right "Assignment
  & timing" panel, brief/reason in left column, collaborators / planning / checklist / tags
  all inside **closed** accordions, live footer progress line ("N required details remaining"),
  44px minimum touch targets.
- **Current app:** V15 composer (`apps/web/src/task-composer-fields.tsx` + `task-composer-v15.css`)
  inside `TaskCreateDialog` (`task-create-dialog.tsx/.css`), used by the drawer create form and the
  subtask form (`task.tsx:1110`, `task.tsx:981`).
- **Refero references:** Programa (programa.design, ID 937 — calm, premium, architectural: off-white
  canvas, muted neutrals, warm bronze accents, generous whitespace, restrained color) as the
  named reference; Linear "New issue" modal (compact single-column form, priority/assignee inline
  in footer); Hello Ivy task-creation modal (title + brief + status/priority/due in one card);
  Wrike table+side-panel (left content, right inspector). Programmatic confirmation: Wrike's
  `053b797e` inbox screen and Hello Ivy `3533f88d` both keep creation to one card of essentials
  with detail pushed to the object view.
- **Prior review:** `docs/design/tasks-tab-review-2026-10-25.md` F7 (composer: 14 fields strong but
  dense; capacity/recovery better than benchmark — keep).

## Design plan (token-level, per skill process)

- **Color:** keep the existing reference-lock: ink `#26312b`, pine `#244f43`, line `#e8e8e2`,
  cream canvas `#f7f5f0`, panel `#f4f6f0`, priority tones (low `#4a7a5c` / medium `#b07c1f` /
  high `#d97706` / critical `#dc2626`). No new palette — the brief is structural, not a
  restyle. Programa influence = restraint (fewer visible fields, calm panel), not a new hue.
- **Type:** existing Inter/sans UI face; labels 11–12px/740, meta 11px/400, title 24px.
  No caps labels, no new eyebrows.
- **Layout:** two-zone desktop (editing canvas left, bounded Assignment & timing inspector
  right) — already the V15 structure; refinements below make the *essentials* fit without
  scroll and match the demo's *feel*.
- **Principle:** essentials visible, optional collapsed. The demo proves it: its scroll-free
  desktop comes from closed accordions, not from a taller dialog.

## Refinements (ordered by owner's four points)

### R1 — One brief, matching the demo (owner point 1)

The demo has a **single** "Task brief · optional" textarea; the app's left canvas labels the
same `description` field "Task brief" but the validation message and aria-label still say
"Description". Unify the wording:

- Label stays `Task brief · optional`; helper: "What needs to be delivered? Add scope, context
  and the expected result." (already present).
- `taskDraftErrors.description` message → `Task brief must be 2,000 characters or fewer.`
- Keep `name="description"` and `aria-label="Description (optional)"` unchanged (payload
  contract + existing tests).
- Confirm no second description field remains (the drawer's `task-description` display is the
  object view, not the form — no change).

### R2 — Group Target / Start / Effort into one Timing block (owner point 2)

Currently: `Target date` row → `task-property-row--pair` (Start + Estimated hours) →
`Priority` row, all separate. Rebuild the aside middle as **one bordered "Timing" group**:

- Group header `Timing` (12px/740, same as `Assign to`).
- Inside: `Target date *` (41px control, full width), then a `Start date · Estimated hours`
  pair row — but the two paired inputs share one bordered strip with an internal 1px
  divider so the pair reads as one control group, not two orphan rows.
- Errors render inside the group; the capacity note ("An estimate does not automatically
  create a dated capacity allocation.") becomes the group's footnote.
- CSS: one new `task-timing-group` wrapper in `task-composer-v15.css`; the `--pair` rules
  are restated inside it. No state change.

### R3 — Desktop: create without scrolling (owner point 3)

Height budget at 1440×900: 92dvh ≈ 828px − header ≈115 − footer ≈62 ⇒ ~650px usable body
height. Budget the essentials (brief 3 rows + aside essentials) to that:

| Item | Current | Change |
|---|---|---|
| Dialog width | `min(760px, …)` | **940px** desktop only (`@media (min-width: 701px)`); grid becomes `minmax(0,1fr) 320px`, gap 28 |
| Dialog height | `min(90dvh, 900px)` | **92dvh** (matches demo's 92dvh) |
| Brief textarea | `rows=4` | **3** on desktop (demo `min-height:108px`); mobile keeps 4 |
| Aside `Reviews` | 3 cards, 58px min + sequence | **compact segmented row** (3 chips side by side, one line; keep `BOTH` sequence note). Saves ~45px |
| `Tags` | always-visible chip area | **moves into** `More task settings` accordion (with checklist + stage + collaborator hours). Saves ~65px |
| `More task settings` | collapsed (good) | keep collapsed by default; toggle hint reads "Stage, tags, checklist, collaborator hours" |
| Priority | select + hint line | segmented control (R4) — drops the 10px hint line, saves ~20px |

Projected aside essentials height ≈ 560px ⇒ no scroll at 900px-tall viewports; at 768px-tall
laptops the short overflow scrolls the body only (existing `overflow:auto`), and at ≤700px the
mobile single-column flow is untouched. Verification gate: measure `dialog body
scrollHeight === clientHeight` at 1440×900 and 1280×800 in the preview harness
(`__v15-preview.tsx`).

### R4 — People & Priority "exactly like the demo" (owner point 4)

- **Priority:** replace the tinted `<select>` with the demo's **four-button segmented
  control** (Low / Medium / High / Urgent), each with its tone dot; selected button gets the
  tone fill + edge (tokens already exist as `tone-*` CSS vars). Keyboard: radiogroup
  semantics (arrow keys), one-line height (~44px) replaces the ~60px select+hint. `value`
  mapping to `LOW/MEDIUM/HIGH/CRITICAL` unchanged.
- **People ("Assign to"):** the demo uses **rounded 27px avatars + a search input + name ×
  chips**; the app has a better 44px avatar strip + people menu + per-person hours.
  Convergence without losing capability:
  - Avatar strip stays (larger touch targets are the accessibility win; demo's 27px fails
    mobile targets).
  - Add a **visible count** to the section title: `Assign to · 2 selected` (demo behavior).
  - People menu rows: show role under name (demo shows `<small>role</small>`; app has the
    data in `options`).
  - Per-collaborator hours stay in `More task settings` (today's placement is fine).
- **Owner select:** keep the `<select>` (long employee lists exceed what a picker does
  better at 320px); just tighten its helper line to "One person is accountable." (already
  there).

## Secondary refinements (low risk, same pass)

- **S1 — live readiness line:** adopt the demo's footer status (`"Ready to create"` /
  `"N required details remaining"`), computed from `taskDraftErrors` — reuses existing logic,
  no new state. Replaces nothing; adds direction without mood (skill's copy rule).
- **S2 — demo parity on recovery:** demo's lost-response card ("Submitted details are
  locked" + Check creation result) vs app's `creationRecovery` — compare copy side-by-side;
  the app's recovery is already strong; only align the button label `Check creation result`.
- **S3 — Enter submits:** demo relies on native submit; the app already force-submits on
  Enter in the title (`task-create-dialog.tsx:56-70`). No change; document it.

## What explicitly does not change

- Payload (`taskCreateBody`), `taskDraftErrors` semantics beyond the R1 message, validation,
  authorization, `TaskCreationOptions`, capacity warning, recovery, subtask form reuse,
  mobile (≤700px) flow, focus management, and all existing test contracts keyed to field
  `name`s.
- The queue/detail findings in `tasks-tab-review-2026-10-25.md` (F1–F8) — separate slice.
- No new dependencies; all changes are `task-composer-fields.tsx`, `task-composer-v15.css`,
  `task-create-dialog.css` (+ their `.js` compiled mirrors) and composer tests.

## Test impact checklist

1. `task-composer-fields.test.tsx/.js` — label/message assertions (R1 message; R4 aria roles).
2. `ux-usability.test.tsx` — validation summary links (fields unchanged ⇒ low risk).
3. `task-ux.test.*`, `task-creation-flow.test.*` — behavior, not presentation: should pass
   unmodified; run them to confirm.
4. New: a visual-fit assertion (R3) in the v15 preview harness: body `scrollHeight` equals
   `clientHeight` at 940px width.

**Open owner decisions (blocking):** (a) 940px/92dvh desktop dialog, (b) Tags moved into
More-task-settings, (c) Priority segmented control replacing the tinted select. Mobile and
payload stay as-is either way.

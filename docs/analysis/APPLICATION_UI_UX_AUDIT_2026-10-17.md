# Application UI/UX Audit + Verification — 2026-10-17

Source state: branch `codex/s20-site-integration`, ~190 modified / ~80 untracked
files. Nothing committed. All figures below were produced in this session on
Node 24.19.0.

Refero MCP (`https://api.refero.design/mcp`, token from `.mcp.json`) verified
live: `refero_server` v0.2.0, 10 tools.

---

## 1. Verification results

| Gate | Result | Note |
| --- | --- | --- |
| `pnpm typecheck` | **PASS** (exit 0) | contracts → api → web, 3 packages |
| `eslint apps packages tests scripts` | **PASS** (exit 0, 0 errors / 0 warnings) | Scoped. See caveat below. |
| `pnpm build` | **PASS** (exit 0) | contracts 617ms, api 1241ms, web 5.9s / 199 modules |
| API unit tests | **PASS** — 456 tests / 64 suites, 56s | `pnpm test:unit` in `apps/api` |
| Web unit tests | **570 tests / 58 files, all pass** — but only with raised timeout | See the flake below. |
| E2E (`playwright test`) | **BLOCKED** — 0 tests / 0 files | `SyntaxError: Cannot use 'import.meta' outside a module` |
| `pnpm verify` | **Not run** | Chains the blocked e2e gate. |

### Caveat A — lint root includes/ (sandbox artifact, not a code fault)
`pnpm lint` (repo-wide) fails with `EPERM: operation not permitted, open
'includes/.gitkeep'`, and the same call fails even after `mkdir includes &&
touch includes/.gitkeep`. The directory is gitignored, the workspace has ~190
uncommitted edits, and this shell's cwd is a path containing spaces
(`D:\app\sensestudios work management app`) — ESLint resolves the gitignored
directory entry and chokes. Scoping to real source passes clean. **This is an
environment failure, not a lint finding.** Worth retrying on a clean tree.

### Caveat B — web test timeouts are a resource artefact, not product defects
The headline number to be careful about. Same 570 tests, three different
results depending only on how they are launched:

```
npx vitest run                                   → 28–30 failed (9 files)
npx vitest run --testTimeout=30000               → 1 failed
npx vitest run --isolate=false --testTimeout=20000 → 2 failed (site-offline-capture only)
```

Cause: vitest reports `Isolate 58 workers spawned · ~1.52s startup each`
(58 files × ~1.5s of worker + jsdom environment setup ≈ 90s of pure boot on a
machine reporting `total: 3.56 GB / free: 1.11 GB` / 28.6 GB). The tests
themselves run in milliseconds-to-seconds; they exceed the default timeout
because they queue behind worker startup. Proof: `task-creation-flow.test.tsx`
run alone is 7/7 pass; under the full parallel load it was 1/7.

**Recommendation:** this is not an app defect and no Agent 1 product code is
implied to be broken. But it makes the suite unreliable as a gate. Either pin
`--isolate=false` (or a bounded `poolOptions.threads.maxThreads`) in
`apps/web/vitest.config.ts`, or raise the default timeout to ~30s. Without one
of those, a red gate and a green gate are both correct answers to "did it
pass?".

### Caveat C — the two surviving failures at low worker load
`src/site-offline-capture.test.tsx` (2 tests: "keeps the same command ID when a
lost response is retried", "reports local quota failures without showing a
saved queue item"). That file predates this Agent 1 work — it is not one of the
19 Agent 1 modified files — so it is a pre-existing issue, not a regression
from the task-creation refinement. Both are offline-queue/idempotency cases,
which is worth a look, but it is outside Agent 1's slices.

### Caveat D — e2e is not runnable here at all
`npx playwright test --list` → `Total: 0 tests in 0 files`. Every
`tests/e2e/*.spec.ts` fails to load with `Cannot use 'import.meta' outside a
module` (repeated 6×), i.e. the Playwright config's transpilation of the spec
imports isn't resolving. No authenticated or even unauthenticated browser
journey could be executed. **No claim of e2e coverage can be made from this
session.**

---

## 2. What Refero shows — and what it implies for this app

### 2.1 The strongest single finding: there is no shared EmptyState component
`grep -rn "EmptyState|empty-state|no results|No results" src --include="*.tsx"`
returns **nothing outside tests**. Every "no data" case is hand-written per
screen, and several screens fall through to a bare table header with no message.

Three references all solve the same problem, and all three preserve the user's
current context in the empty state:

- **Loom** (75d51a33) — "No results found", with the search field **still
  holding the previous query** and an explicit **Clear** action. The page
  behind stays visible, blurred.
- **Xbox** (6806559a) — empty search result: search bar, illustration, "Looks
  empty in here...", and a **close icon on the query** so clearing is one tap.
- **Slite** (dc1571ab) — notification-center empty state with the panel's own
  category toggles and a **mute-duration dropdown (30m / 1h / 2h)** attached to
  the empty panel itself.

**Action:** build one `EmptyState` component with slots for title, a one-line
reason, one primary action, and one "what to do instead" link. The rule to
enforce across all of it: **never lose the query or filter that produced the
empty state.** Every reference above keeps it visible and one-keystroke away
from clearing. With 41 CSS files and no component layer, this is the single
highest-leverage addition.

### 2.2 Task creation: split primary from secondary fields, and name the draft action
**Linear** (e5fb7da7) is the cleanest match for slice D — "centered *create new
issue* modal over a dimmed dashboard… white cards, gray text, blue primary
actions." Its function list is a spec: "create and categorize issues with
title, description, and tags, **save as draft or submit immediately**,
optionally **keep creating more**."

The app has `CreateTaskInline`, `TaskDraftStrip`, and `task-creation-form.test.tsx`
already covering draft preservation, uncertain responses and duplicate-safe
recovery — so the mechanics are built. The gap is presentation:

- Promote **title + assignee + due date** to the always-visible primary band.
  Everything else (priority, tags/labels, status, project) belongs in a
  collapsible secondary section.
- Make **Save draft** and **Submit** an explicit pair — Linear names both as
  distinct outcomes, and the current UI risks presenting a single ambiguous
  submit.
- Consider **"Create another"** as a post-submit option (Linear lists it as a
  first-class function). For a team doing batch intake this is a real time
  saver, and the existing keyset/dedup work means it won't create duplicates.

**Programa flow 13442** (6 screens) is worth keeping as the canonical journey
reference for the whole slice: `Empty To-Do List → Open Task Composer → Enter
Task Details → Set Due Date → Assign Task → Save Task`. That step order —
details before due date before assignment — is a useful check against the
current field ordering.

### 2.3 My Work: master-detail beats a full drawer at desktop width
Slice E's open items are search, filters, sorting, counts, pagination.

- **Wrike** (3d3e2910) — "a clean project management dashboard with a left-side
  task table and a right-side task details panel for the selected item, using a
  minimal neutral palette with **blue and green status highlights**." Function
  set: browse/select tasks, update status and assignee, manage dates and
  subtasks, upload, comment.
- **Linear** (4a094449) — three-column: sidebar nav / **grouped task lists** /
  right-side profile panel. Tagged `Stats`, `Checklist & To Do`, `Progress Bar`.
- **Hello Ivy** (6e885ff3) — top control bar with project selector + navigation
  tabs + `Filter & Sorting, Date & Time` patterns, and **add-task / add-column
  links at the bottom of each column**.

`task-my-work-drawer.test.tsx` already asserts prev/next navigation "within the
current filtered page" and "keeps list-first and legacy non-My-Work task
callers inline" — i.e. the drawer behaviour is intentional and tested. But at
desktop widths a full-screen drawer is heavier than the reference pattern.

**Action:** at desktop widths, consider a **table + side panel** (Wrike) instead
of a full-screen drawer, keeping the drawer for narrow widths where the side
panel can't fit. The existing prev/next-within-page tests would still apply.

### 2.4 Filters should be a persistent bar, not a disclosure
The plan already has `task-query-refinements.test.tsx` asserting multiple
priority/collaborator selections and canonical sort reach the server read, and
`task.test.tsx` covering the filter disclosure with Escape-to-restore-focus.
So the machinery is proven.

The references disagree with a disclosure-only approach: **Hello Ivy** carries
filtering, date controls and a project selector in a **persistent top control
bar**, and shows the applied state visibly. For a tool used daily to triage
work, hiding active filters behind a panel is a small per-keystroke tax paid
hundreds of times.

**Action:** persistent compact filter bar with the **applied filter count**
always visible; the disclosure can remain for the full filter set.

### 2.5 People directory: two-column, not table-then-navigate
Two clean references for the plan's P2 People item:

- **Aboard** (b428cabd) — "narrow left navigation and **people list**, and a wide
  centered **profile panel** with banner, avatar, name/title, action buttons, and
  a three-item info row." Selecting a person changes the right panel; the list
  is retained.
- **Hello Ivy** (a73e30bf) — "People" dashboard: left sidebar + team members
  **in a table** with tabs, search field, avatars, tagged `Members`.

`people.test.tsx` already covers "filters authorized people and preserves list
filters through selected detail and return" and "does not substitute another
person for an unavailable deep-link ID" — so filter preservation across
detail-and-back is already a tested requirement. The Aboard layout satisfies
that structurally (the list never unmounts), which is why it's the better
target than list-then-navigate.

### 2.6 Notifications: category filters + mute + an explanatory empty state
**Slite** (dc1571ab) is the model: one centered floating panel, title bar with
action icons, **two side-by-side category toggles**, an empty-state area with
illustration, and a **mute dropdown** (30m / 1h / 2h) bound to that same panel.
The mute affordance matters — "mute for 30 minutes" is a meaningfully different
answer to "stop these" than either dismiss-each or disable-the-category.

### 2.7 Approvals / reviews: activity timeline + composer, not a status badge
**Asana** (3b719cd0) — "activity feed showing **approval/rejection updates**, a
**comment composer** with attachment tools and thumbnails, collaborator avatars,
and a leave-approval link." Layout is single-column: header + action icons →
activity feed → comment area with toolbar and attachments → collaborators row →
right-aligned leave link.

For the app's approval/review surfaces this means the status badge is not enough
— the decision history and the comment thread are the content users actually
consult.

### 2.8 Design tokens: already good, and the problem is above them
`src/styles.css` has 19 base tokens and `src/studio-theme.css` has 66, loaded
in that order from `main.tsx`. The system is coherent and well-prefixed:

```
--sense-ink #182c29 / --sense-canvas #f4f1e9 / --sense-surface #fffdf7
--sense-pine #182c29 (hover #35534a) / --sense-gold #e7c680
--sense-radius-control .55rem / --studio 9px   --sense-radius-panel .8rem / 15px
--sense-focus #b98f49 / --studio #8c6b30
--sense-page-gutter clamp(1rem, 2.2vw, 2rem)  --sense-content-max 1600px
font: Inter (via --sense-font-ui)
```

Warm pine/gold on cream is a deliberate, distinctive palette — it reads as a
considered product rather than default admin chrome. The `studio` override is a
scoped `.workspace-page` re-declaration of the same names (legitimate cascade,
**not** duplication), tightened to `#26312b` ink, pure-white surfaces and 9/15px
radii for the denser workspace views.

**The actual gap is the layer above the tokens.** 41 separate CSS files in
`src/`, one per feature, with no shared components for the patterns every screen
needs: empty state, filter bar, person chip, status pill. The token system is
finished; the component system is absent. Section 2.1 is where to start.

One genuine a11y note: **`--sense-focus: #b98f49`** (gold-on-cream) is a low-
contrast focus colour. Focus indicators are safety-critical and gold is the
lowest-contrast colour in the palette. Worth checking against the 3:1 UI
component threshold — a darker variant (the studio's `#8c6b30`) would clear it
more comfortably.

---

## 3. Prioritised list

| # | Improvement | Evidence | Effort |
| --- | --- | --- | --- |
| 1 | Shared `EmptyState` component; never lose the active query/filter | No `EmptyState` anywhere in `src`; Loom / Xbox / Slite all preserve context | S |
| 2 | Split create-task primary vs. secondary fields; explicit Save-draft / Submit pair; optional "Create another" | Linear e5fb7da7 function list; mechanics already built (`TaskDraftStrip`, `task-creation-form.test.tsx`) | S–M |
| 3 | My Work: table + side panel at desktop width, drawer at narrow width | Wrike 3d3e2910 master-detail; Linear 4a094449 three-column | M |
| 4 | Persistent compact filter bar with applied-count; keep disclosure for the full set | Hello Ivy 6e885ff3; `task-query-refinements.test.tsx` already proven | S |
| 5 | People: two-column list + detail panel | Aboard b428cabd; `people.test.tsx` already requires filter preservation | M |
| 6 | Notification center: category toggles + mute durations + explanatory empty state | Slite dc1571ab | M |
| 7 | Approval/review: activity timeline + comment composer | Asana 3b719cd0 | M |
| 8 | Darken `--sense-focus` (`#b98f49` → `#8c6b30`-class) for 3:1 UI contrast | Token audit; a11y safety | XS |
| 9 | Pin `--isolate=false` or raise timeout in web vitest config | 30 fails → 2 fails on the same 570 tests | XS |
| 10 | Fix e2e `import.meta` load failure so browser journeys can run at all | 0 tests / 0 files listed | M |

---

## 4. Limits of this audit

- **No browser was launched.** All UX findings come from code inspection and
  Refero's screen/flow metadata, not from observing the running app.
- **Refero image quality was capped.** `refero_get_screen_image` returned
  ~10–27 KB JPEGs where `image_size: "full"` and `"thumbnail"` were
  byte-identical, so visual detail (exact spacing, type scale, colour values)
  could not be read off the screenshots. The structured metadata — layout
  descriptions, function lists, tagged UX patterns, UI element inventories —
  is what the findings rest on, and that was complete.
- **`refero_search_styles` returned `NO_RESULTS`** for the palette/density
  queries tried, so the visual-direction guidance here is screen-derived rather
  than style-derived.
- **E2E and full `pnpm verify` could not be executed** (Caveat D), so no
  authenticated journey or acceptance claim is possible from this session.

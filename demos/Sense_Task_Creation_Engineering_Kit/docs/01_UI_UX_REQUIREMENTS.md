# 01 — Exact UX/UI requirements (approved V15-RC1)

## A. Visual foundation

The design reference is `reference/sense_task_creation_production_candidate.html`. Open it at the same browser zoom and viewport as the screenshot baselines. Aim to match **the task creation surface**, not the synthetic dashboard or demo controller.

CSS design token values extracted from the approved prototype:

| Purpose | Value |
|---|---|
| Primary pine | `#153F35` (`--pine`) |
| Deep pine | `#102E28` |
| Soft pine | `#EAF1EB` |
| Page paper | `#F7F7F2` |
| Task surface | `#FFFFFF` |
| Main ink | `#202A25` |
| Muted text | `#68746D` |
| Quiet text | `#87918A` |
| Hairline border | `#E1E6DF` |
| Strong border | `#CAD4CA` |
| Warm gold accent | `#BA9963` |
| Red/error | `#B04445` |
| Amber/warning | `#936822` |
| Blue/informational | `#406D92` |
| Standard radius | `13px` when used on normal cards (many input/property controls use smaller corner radii) |
| Typography | Inter first, system sans-serif fallback; match existing app font or integrate permissible font supply without distributing font files |

No bright colour blocks to decorate the form. Use priority colours *only to communicate selected priority*, review state colours only for meaningful states, and neutral styling for “No review.” Most of the interface should be white, warm neutral grey and graphite. Avoid heavy outlines on every field.

## B. Desktop layout

- Preserve a **Programa-style left editing canvas and narrow right properties inspector** with light neutral background. V15 specimen is a right-side task creation surface within the existing app context, not a new full-page dashboard.
- Task name directly editable in large type, not a large outlined textbox. Description directly underneath; reason is required but reads like a natural field (“Why is this task needed?”), not a form-heavy section.
- Compact context near task title; show project identity once, not both in header and body. If launched inside a fixed project, lock the project.
- Subtasks and checklist underneath the main text in simple rows and with minimal chrome. Files/discussion after save only.
- Properties inspector: task type dropdown; eligible project; **Assign to** avatar strip; aligned Start Date + Target Date; Estimated effort underneath; colour-coded Priority selector; Review routing with inline conditional expansion; visible tags; secondary stage/milestone and related planning sections when appropriate.
- The panel has a close control with unsaved guard, independently scrollable body, sticky action footer. No redundant jump-navbar or V15 demo toolbar in production.
- At 1440×768 **normal empty/default form** should allow creation without scrolling. Longer text, opened reviewer/recurrence settings and many collaborators can scroll while footer stays available.

## C. Mobile layout — field order is critical

Order displayed on phone, **without making the user open More settings first**:

1. Task name (direct edit).
2. Description immediately below the title (optional direct edit).
3. Assign to (if role/context allows; if self-assigned, display compactly or avoid redundancy).
4. Target Date (required, readable date display, calendar popover).
5. Reason (required).
6. More task settings, collapsed by default, with concise summary showing relevant Type, selected Priority and Review route; opening reveals optional/conditional controls.

Start date and effort in More settings on mobile; Type/Project/Reviews still discoverable and editable where eligible. Keep “Create task” sticky, visible with safe area and keyboard; tapping inputs must not hide validation messages behind the footer. 320px width is a required case. No x-axis scrolling of document; horizontal people strip may scroll within its own region.

## D. Assign to

- Single horizontal avatar strip of real eligible people from backend. Real photo if reliably available through approved avatar source; fallback two-letter initials with sufficient contrast.
- `+` immediately after last avatar opens **inline searchable results** directly beneath the strip. Inline results show avatar, human-readable name and selection mark. No separate full-screen picker for a routine assignment.
- The **first avatar is Main**; use a subtle pine outline/“Main” indicator. Remaining avatars are collaborators. No separate Collaborators panel.
- Drag to reorder on desktop with clear insertion target; on mobile/keyboard, tap avatar for a menu including “Make main” / “Move left/right” / “Remove” and collaborator hours when allowed. Never drag-only.
- Preserve person order, assignment eligibility and distinctness on save/reload. Do not allow already-selected primary as collaborator, duplicate IDs, unauthorized cross-branch staff, or more than 30 collaborators.
- Actor without a linked employee must explicitly pick eligible Main. When actor is authorized for ordinary personal self-assignment, don't force redundant selection.
- If all people are ineligible or options cannot load, show a real explanation and Retry; do not manufacture a fallback person.

## E. Controls / conditional sections

- Type: single dropdown; enumerations governed by API, not arbitrary custom labels. Project fields show only when relevant.
- Priority: low, medium, high, critical; compact selected-colour segmented/slide control. Default MEDIUM; only selected tone receives prominence.
- Dates: desktop start+target on one row, compact calendar with month navigation, Today/Tomorrow, readable `DD Mon YYYY`; validation start <= target; API date `YYYY-MM-DD`.
- Effort: small `6h` style for estimated hours. Optional; not a time log. Empty != explicit zero.
- Reviews: `NONE`, `INTERNAL`, `BOTH`, corresponding UI labels “No review”, “Internal” and “Internal + Client”. Conditional inline expansion beneath Review routing, not another dialog. For BOTH show **Internal → Client** reviewer sequence. Eligibility and authorization are server-owned. Named reviewer selection is a **prototype-only extension until a real API exists**; do not silently submit/display it as persisted.
- Recurring: when type = RECURRING, optional inline frequency section (Daily/Weekly/Monthly, interval, weekdays) only behind verified persistence feature gate; otherwise mark as unavailable. No separate pop-up dialog.
- Tags: directly visible chips and “+ Add tag”, not dropdown; max 10 distinct tags of 1–30 chars. Keep add/delete keyboard accessible.
- Checklist: inline row with checkbox + label, “+ Add checklist item”, Enter inserts another. Max 10, labels 1–120 chars. Saved inside parent task payload.
- Subtasks: inline rows visually similar to checklist but use a task icon, not a checked state. Add/edit/remove, Enter to add next, drag or up/down reordering. Create after parent success with own endpoint and version check. Show subtask count/progress only when useful.
- Files: simple post-create attachment area with independent progress/error/retry using the app's existing file pipeline. No blob upload in parent task payload.
- Discussion: real comments after task exists in task details; not an extra creation field. Do not fabricate a “chat message saved” state before actual successful API response.

## F. Entry contexts and permission presentation

One React implementation, contextual prefill and restrictions:

| Entry | Context |
|---|---|
| My Work → Create task | Authorized default personal task, compact essentials. |
| Tasks → Create task | Context from task workspace with valid optional project choice. |
| Project → Tasks → Create task | Current eligible project prefilled and fixed. |
| Task details → Add subtask | Parent fixed, project inherited, separate child command. |
| Site quick actions | Same composer with site-eligible permissions and fields, not a new unguarded module. |

Owner/Leader/Employee/Site are presentation variants only; authorization comes from backend. Project changes invalidate stale participants, plan items and forbidden review configurations. Show a short explanation if a selection is cleared.

## G. Interaction and accessibility

- Mouse: click-to-edit title/description/reason; clear labels or ARIA labels even where visible headings are minimal.
- Keyboard: predictable Tab order, visible focus, Enter to add checklist/subtasks when in item editor; Esc closes calendar/picker first then handles unsaved drawer close, Ctrl/⌘+Enter submits only when eligible and no text composition.
- Dialog semantics: focus trap while modal open, background interaction blocked/scroll locked, focus restored to triggering button on close. Unsaved state uses explicit confirm, not accidental destructive dismiss.
- Accessibility: `aria-describedby` for field errors, accessible names for icons, live status output without repeated spamming, sufficient touch target 44 CSS pixels, reduced motion support; actual screen reader and colour contrast audit before release.
- Failure states: inline short messages near exact inputs, focus first invalid field, expand More settings when error hidden there, preserve draft. Forbidden/no eligible person, capacity, uncertain results must not be represented as generic field errors.
- On success: preserve project context, open the actual task and offer separate Files/Discussion workflows. Parent/children/file operations may partially succeed; show per-item statuses.

## H. Explicitly excluded from production

Never port synthetic role/state switchers, demo brand bar, fake project list/dashboard, payload debug inspector as a production feature, simulated success timers, mocked member permissions, test-case buttons or test-only keyboard shortcuts that conflict with the real app.

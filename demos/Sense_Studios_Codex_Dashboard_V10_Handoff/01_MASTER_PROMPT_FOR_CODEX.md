# MASTER IMPLEMENTATION PROMPT — Sense Studios Dashboard & Application Shell V10

> **Copy the entire document into Codex (or instruct Codex to read this file from the handoff folder).** This is an implementation task for the EXISTING Sense Studios Work Management application, NOT a greenfield app, a second demo, or an authorization redesign.
>
> Source authority order: **(1)** actual current repository/contract and authenticated authorization behavior, **(2)** approved requirements/decisions and attached backend contracts, **(3)** V10 standalone HTML as the locked UI/interaction reference, **(4)** screenshots and design notes. If the demo conflicts with a real API or an approved workflow, keep the real contract, preserve visual intent, and record the gap explicitly. Do not silently mock production data or expand permissions.

## A. Outcome

Implement the production-integrated **Dashboard** and shared **Application Shell** so that they visually and behaviorally match `reference/Sense_Studios_Dashboard_V10_Refined_Shell.html` to high fidelity. The V10 prototype contains V9 customizable draggable widgets, V8 balanced spacing, the V7 compact time card/unified performance card, and the V10 improved left sidebar, global shell, responsive mobile bottom navigation, and page finder.

**Outcome is a working feature in the EXISTING React/TypeScript frontend** connected through existing Nest/API contracts. Preserve task/review/approval/permission logic, database schema, auth, routes, service behavior, and all completed slices. Never treat HTML synthetic demo fixture functions as production domain code. Prototype screenshot fidelity alone is insufficient; implement real permitted interactions and honest unavailable states. If integration surfaces are not ready, implement a bounded adapter/feature shell with explicit blocked items; do not invent missing endpoints or scores.

## B. First actions — inspect before modifying

1. Read `00_START_HERE.md`, `contracts/APPLICATION_SHELL_DASHBOARD_BRIEF_2026-10-15.md`, `contracts/VERIFIED_BACKEND_STRUCTURE_2026-10-15.md`, `docs/DESIGN_LOCK_AND_WIDGETS.md`, and `docs/ACCEPTANCE_MATRIX.md`.
2. Open the runnable prototype `reference/Sense_Studios_Dashboard_V10_Refined_Shell.html` in a normal browser, and compare `reference/screenshots/` at 1440, 1024, 390, and 320 widths. Treat screenshots as visual evidence and HTML as the behavior specification. Inspect edit-mode references from V9 if needed.
3. Inspect the ACTUAL repository: package manager, routes, layout shell, task list/drawer, Dashboard/Attention/notifications APIs, time-log APIs, review and approval reads, organization and project reads, RBAC, design tokens, current test harness, and existing docs. Search code before claiming a capability is missing. Record observed reality, do not assume the historical contracts remain complete.
4. Find the previously approved **My Work final demo** in the repo if present; it is the approved component/density reference. Its file is NOT included in this handoff. Do not claim exact My Work matching if it cannot be found; report this gap and continue with V10 as shell/Dashboard visual baseline.
5. Produce a short `DASHBOARD_V10_IMPLEMENTATION_AUDIT.md`: existing vs proposed surfaces, exact endpoints/types found, reusable components, conflicts, risk areas, and bounded file-change plan. List what will not change. Then implement in small reviewable commits or independent steps. Avoid introducing a new framework, new state manager, new drag library, or DB migration unless truly necessary and approved.

## C. Non-negotiable integration boundaries

- Do NOT rewrite, replace, or alter backend business logic; schema; identity/passkey/session/CSRF; task states; review and client-approval authority; project stages; time authorization; RBAC grants; audit trails; or existing API semantics. New additive backend work requires a separate reviewed spec/owner decision.
- Do NOT introduce a fake global `isAdmin`, derive grants from UI role labels, or use synthetic demo capability arrays in production. `OWNER` vs `STAFF` is the real account-kind split; Team Leader, reviewer, site employee and cross-branch access are actual resource/team/capability scopes, not arbitrary new session kinds.
- Enforce current server-side authorization at source endpoints. UI visibility is **presentation**, never authorization. Navigation, search, Add Widgets, drill-downs and request payloads may only expose current authorized context. 401, 403, 404, 409 and 503 are distinct.
- Client/external portals must NOT appear inside this internal signed-in shell.
- Never invent persisted health, percentage completion, utilization, capacity, score, employee name, team score, site upload count, time entry, approval, review round or finance data. If missing, use precise **unavailable / not configured / no data** UI, not zero and not a demo-derived calculation.
- Do NOT replace the approved My Work task list/drawer. Share its components and navigate to its existing canonical routes with list/scroll/filter context intact.
- Do not rewrite all other modules in this work. The shell must link to them through real routes, not fabricate their page content. Where a module is genuinely unimplemented, show a transparent integrated placeholder only if already permitted by the app's routing conventions.
- Use V10 HTML **as a visual/interaction reference, not a copy-paste production implementation**. Extract reusable typed components, small adapters and tests. Keep synthetic dataset isolated in demo/dev tests only.

## D. Design and styling fidelity

Retain Sense Studios identity: cream page `#f4f1e9`, soft surface `#faf8f2`, paper `#fffdf7`, pine `#182c29`, action pine `#29463d`, text `#20332e`, muted `#61736b`, thin border `#d9d8cd`, active `#e3eadf`, restrained gold `#e7c680`, deeper gold `#b98f49`; red `#a7463b` only for genuine danger/overdue states. Inter/system sans UI. Prefer existing token/component set, map to these design roles and document deliberate deviations. Do not introduce arbitrary gradient-heavy cards or new brand colors.

Maintain the V10 structural pattern: strongly identifiable dark-pine sidebar, light working canvas, subtle card boundaries, compact operational typography, real visible focus, consistent 12–16px gaps, responsive content width, and no giant dead zones. On desktop use naturally stacked independent-height widget columns; never stretch a short widget merely to match a tall one. On mobile use one column with comfortable touch targets and safe-area padding.

Use the actual Sense Studios logo from the repo when one exists; the prototype's embedded symbol is an approximation, not authorization to replace a production logo.

## E. Application shell — desktop and tablet

Build a reusable shell around ALL authorized workspaces:

1. Brand/organization context at sidebar top. Provide collapse/expand to a compact icon rail, with tooltip/accessible label for every icon. Sidebar collapsed state may be remembered as a display preference.
2. Keep primary navigation destinations visible: **Dashboard**, **My Work**, **Projects**, **Decisions** when authorized. **People** must remain discoverable when permitted. Do not expose missing permissions by showing unusable links with secret metadata.
3. Organize secondary destinations into collapsible groups resembling V10: **Project Delivery** (Tasks, Documents, Drawing Register, Reviews, Client Reviews, Site, Turnkey), **People & Insights** (People, Time, Workforce, Performance, Learning, Reports), **More Tools** (Notifications, Automation, Assistance, Integrations, External Access and other app-supported destinations). Preserve actual route names/permissions rather than copying a demo route blindly.
4. Stable bottom utility: Settings, user/account. Clear active highlighting; expand parent group of active route, not every group by default. Current organization/branch is context, not a permission switch.
5. Header: breadcrumb/page context, page finder, notifications unread count, account menu, and **one** clear New Task action. New Task uses the existing authorized shared composer, not a second homemade form. Account menu uses verified identity fields; do not fabricate a friendly name from email.
6. Page finder: **Ctrl/Cmd+K**, with `/` shortcut only outside edit fields if compatible; find available **page destinations only**, keyboard up/down, Enter, Esc, no results, visible focus and a sensible return target. Do not call it global search of tasks/projects; full-content search is a different capability.
7. Working browser routing Back/Forward. Keep list filters/scroll/location when drawer or destination is closed; if app routing already supports this, reuse it.
8. Overlays (navigation search, account, notifications, task detail, More sheet) must handle open/close, Esc, focus containment, focus return, screen readers, and narrow/short viewports. Avoid duplicate independently mounted global overlays.

## F. Application shell — mobile

At <= mobile breakpoint, switch to compact top app bar (context + search + notifications), **fixed bottom navigation** with exactly five destinations: **Home (Dashboard) | My Work | Projects | Decisions | More**, hiding/disabling a destination appropriately to authorized route policy rather than falsely granting access. The More bottom sheet contains all other permitted workspaces, Settings, account and support actions. Keep a prominent accessible floating **New Task** action when authorized, positioned above the bottom bar without covering content or controls. Respect safe-area insets; no scroll trapped behind sheets; no horizontal page overflow at 320px. Check 320x740 and short heights. Use real app paths (not demo synthetic navigation), Back/Forward and destination focus.

## G. Dashboard information architecture — simplify, DO NOT add clutter

1. **Top summary card strip is fixed/non-draggable.** V10 shows five compact infographic task summaries (overdue, due today, high priority, waiting, task reviews/corrections). Preserve visual component style and **source-backed** count/date semantics, but only render authorized and meaningful values. A given task can appear in multiple summary buckets: NEVER sum buckets as a unique count. Distinguish unavailable from zero. Each summary links to its matching *authorized* list/filter/destination. Preserve `Committed` if present else `Target` date for Dashboard summaries; do not impose the My Work attention algorithm on these cards.
2. **Curated widget defaults** below summary strip — limited to 3–4 widgets, not every analytics component. Use exact V9 IDs as stable starting point (see `docs/DESIGN_LOCK_AND_WIDGETS.md`). Avoid duplicate status and health charts.
3. **Compact Time Tracking card** — approximately square/365px desktop footprint, sits immediately beneath summary cards within widget grid, **NOT** a page-width banner. Active timer, project/task selector, start/pause/resume/save and manual entry when supported by existing time domain. One active timer across the app; switching task requires confirmation; never lose running time through navigation/widget unmount. Do not save to in-memory data in production. If backend timer/session features are absent, implement only supported time-log entry flow and list remaining commands as gaps; do not claim saved work when persistence failed.
4. **Projects widget** — concise authorized project cards: name, current stage/milestone, factual risk/review indicators when present, link to project workspace. Merge generic Project Health into this widget unless the user explicitly enables a separate optional risk widget. No invented completion percentages.
5. **ONE combined People & Performance widget** — Owner sees **Teams / Employees** selector. Teams show a comparison with each current authorized Team Lead name, real scoring period, metric/scale and selected team details; Employees show dropdown for a person and actual authorized score/breakdown. Team Leader sees **only** permitted employee view, not organization-wide team rankings. Staff without performance capability do not receive the widget. Scores need persisted authorized snapshots with configured completion/deadline/quality/complexity policy and effective dates; if missing, show `Performance snapshot unavailable` with no fictional numbers or percentages.
6. **Decisions and assigned reviews** — separate underlying streams, preferably one compact mixed-purpose preview with clearly distinct sections and labels. Exact review round/approval identities, no generic approve-anything action, no conflating task-state review counts with reviewer obligations. Click each record to the authorized owning workflow.
7. **Next Action** — one recommended task/approval with next responsible actor and next permitted action; do not fabricate a composite priority calculation if the existing backend does not supply a corresponding sort. Reuse the app's actual authorized next-action/attention query.
8. **Site Delivery** — only for authorized site context; factual snags, verification and upcoming site work; don't show unsupported photo upload totals.
9. **Attention Queue is fixed at the VERY BOTTOM across all contexts**. Initially show only two authorized records and a Show More/Go to My Work affordance. It is NOT draggable and is not hidden by widget customization. Keep clear distinction between Needs My Action and Waiting on Others where provided. On a 320x740 viewport, first useful action must not be buried behind extensive decorative metrics.
10. Hide detailed workload, training, secondary status distribution, and similar widgets by default; allow them in widget gallery only if supported by real data and authorization. A user can get deep analysis in its proper module.

## H. Curated role-specific defaults

Source prototype fixture keys are illustrative only. Compute real eligibility from existing current-source access. Preserve the demo's widget default intent, not its synthetic role switcher:

| Demo context | Default movable widgets in order | Additional constraint |
|---|---|---|
| Owner | `time`, `decisions`, `projects`, `performance` | Performance unified tabs: Teams + Employees; Owner may have NO Employee record, so personal task/time affordances must not invent an employee identity. |
| Team Leader/manager | `time`, `decisions`, `projects`, `performance` | Performance employees only; permitted team/project scope; no org-wide comparison. |
| Employee | `time`, `nextAction`, `projects` | No management widgets or assignment to another employee without separate grant. |
| Site Employee | `time`, `nextAction`, `site`, `projects` | Site actions prioritized; no protected costs, personnel or finance. |
| Assigned reviewer | `decisions`, `nextAction`, `time` | Named exact review rounds, no self-approval; responsibility alone gives no admin capability. |
| Cross-branch collaborator | `time`, `nextAction`, `projects` | Only explicitly granted external-branch project participation. |

Role responsibilities can overlap; these are starting configurations chosen from permitted widgets, NOT a new backend role enum. If a widget is not authorized or its data source unavailable, omit/relabel appropriately and never query across unauthorized boundaries. Do not offer inaccessible widgets in Customize.

## I. iPhone-inspired draggable widget customization — V9 behavior preserved

1. `Customize` enters explicit edit mode; mobile touch-and-hold ~600ms on a widget also enters. Brief motion feedback only; obey `prefers-reduced-motion`. Widgets should not perpetually jiggle while being operated.
2. While editing, show drag handles, clear hide/minus control on OPTIONAL widgets, Add Widgets gallery, Done and Reset to Role Default. Hide means **only remove from Dashboard**, never revoke module access.
3. Top summary cards stay fixed and cannot be moved, hidden, or resized. The bottom Attention Queue stays fixed last, cannot be moved or hidden. Everything else is optional and can be rearranged subject to permitted widget catalog.
4. Desktop: two naturally stacked independent columns with consistent gaps; allow drag within and across columns. Drag placeholder reflects insertion point, no big empty boxes or accidental stretched rows. Mobile: one column with long-press and pointer/touch reorder. Avoid accidental route navigation while dragging.
5. Provide keyboard-accessible move up/down and move-column controls with instructions, live announcements and focused handle. Reordering must work without pointer gestures.
6. Persist **only widget IDs/order/column, version, and minimal display preferences** per authenticated account/context, not private task/score/work records. Prefer an existing versioned account preference store; if NONE exists, implement a localStorage-scoped interim adapter with documented limitation and reset, and propose (do not invent as deployed) a server endpoint. Store separate desktop and mobile orders and stable registry IDs; reconcile removed/renamed widgets and server-revoked access. Never write other people's data to browser storage.
7. Reset restores 3–4 curated defaults, not every widget. Re-entering and leaving edit mode must preserve order without flicker. Drag changes persist after refresh, navigation and return; if no remote preference store exists, report that persistence is local to the browser.
8. **Never trust saved widget IDs as access grants.** Always intersect saved layout with current server-authorized registry; invalidate/erase inaccessible data and details immediately on access loss/account change.

## J. Data and API integration rules

Verify live routes/types from source before wiring. The 2026-10-15 contract documents these as EXISTING under `/api/v1`:
- `GET /auth/session` returns account `{id,email,kind:'OWNER'|'STAFF'}`, `csrfToken`, `ownerSetupRequired`, `activePasskeyCount`; it has NO universal feature grant list or guaranteed display name.
- `GET /dashboard` is the authorized dashboard projection.
- `GET /dashboard/sources/:source`, where `source` is `tasks|decisions|health|performance|workload|site|training`; each is independently loading/ready/stale/empty/denied/error and has its own freshness. Do not let one failed source blank all healthy widgets.
- `GET /tasks/:id` for canonical task detail, command capabilities and authorized linked projections.
- `GET /notifications?cursor=...` and `PATCH /notifications/:id/read` for personal inbox.
- `GET /approvals/attention`, `GET /approvals/attention/:requestId`, `GET /approvals/actionable` for approval obligations. Approval itself goes to its OWN domain command, not a generic dashboard approval endpoint.
- `GET /reviews/inbox`, `GET /reviews/tasks/:taskId` and relevant round commands for named review workflow.
- `GET /projects/:id`, `GET /projects/:id/plan` and permitted `GET /tasks?scope=all&projectId=:id...` for project records; maintain server-side scope.
- Time, workforce, learning and site APIs: **inspect actual present source** and re-use. Do not guess route or payloads from HTML.

Dashboard source rows `sections` include `key`, `label`, `rows`, optional `unavailable`; each source has its own `readCompletedAt` and `today`. Source `tasks` rows include `id`, `label`, `status`, `date`, `route`, `projectId`, `sourceRef`. Honor returned destinations and types. Unknown score/health fields are NOT automatically an approved domain contract.

Protected fetch: same-origin existing session cookies, `no-store` for private reads as already enforced, `X-CSRF-Token` for mutations under existing Origin/CSRF rules; preserve session expiry and recency requirements. Never turn a 403 into a cached display of previously permitted data. Recheck on navigation and before mutations through owning backend. Disable actions during pending submission, show confirmed result only after actual authoritative response, and handle uncertain network failures without silent duplicate writes.

No cross-source frontend join that fetches all organization employees or projects then filters locally. List totals and metrics must be authorized server-side, not based on first 50 paginated items. When a needed field/service is absent, write `DASHBOARD_V10_INTEGRATION_GAPS.md` with exact location and proposed minimal backend addition; do NOT build an unreviewed API/migration.

## K. State, notifications and source-freshness behavior

For each widget: initial loading, genuine no items, permitted ready, missing/denied, partial unavailable, stale/last-success time, retry and independent recovery. Unavailable is NOT 0. Surface the read timestamp and effective scope in a concise manner. Give retry only where meaningful. 401 signout/session loss clears private dashboard/drawers; on actor/session changes abort or ignore late requests from older identity. 403 during a detail view clears the record immediately. Notifications are shared with the app's real inbox/unread badge; marking read updates the source after an acknowledged write; historical notification destination cannot grant current resource access.

## L. Screen, UX and accessibility acceptance

- Responsive at **1440 x ~900**, **1024 x ~768**, **390 x ~844**, **320 x 740** and short heights; no horizontal page overflow; sticky/fixed header/footer never covers accessible controls.
- Fidelity against all `reference/screenshots/` captures: typography, shell width, sidebar/collapsed rail, order, gaps, card size, charts, icons, menu density, desktop columns, mobile fixed tabs. Document deviations forced by real content/permissions.
- Each link, summary, project, person/lead selector, timer control, notification and drag control produces genuine authorized navigation/command/action; no inert visuals, fake toast, decorative form, or phantom permission.
- Works with keyboard Tab/Shift-Tab, Ctrl/Cmd+K, Enter, Esc, arrow reordering, screen reader labels, reduced motion and touch controls; returns focus after overlay dismissal; clear focus ring.
- No stale private data after logout, revoke, role/scope changes; no backend-rule bypass by direct deep link, custom widget config, archived notification or devtools event.
- Route history Back/Forward, dashboard filters, My Work return context and independent source retries behave correctly.
- Performance Team/Employee widget is exactly ONE Owner panel, not duplicate cards; Team Leader cannot access Owner comparison.
- Small timer below fixed main summaries, NOT full-width, and Attention Queue is last.

## M. Execution sequence and checkpoints

**Checkpoint 1 — Audit & design lock:** inventory actual repo, existing tests/slots, routes, CSS tokens, permissions, source projection, existing timer and scoring services. Produce file-by-file plan and classification EXISTING / PROPOSED / DEMO. Record any My Work reference gap. **Do not begin broad rewrite.**

**Checkpoint 2 — Shell only:** reusable sidebar/header/mobile bar/More/page finder, matching V10; route registry from current authorized application, no duplicate menu implementations. Capture/screenshots and tests.

**Checkpoint 3 — Dashboard widgets:** fixed task summary cards, slim action+decision previews, compact time, projects, unified scoped performance, site (when allowed), bottom Attention Queue. Use independently sourced adapters; honest states.

**Checkpoint 4 — Widget personalization:** registry+eligibility, role defaults, accessible edit mode with drag and keyboard movement, Add/Hide/Reset, per-account responsive layout persistence and migration.

**Checkpoint 5 — Regression/convergence:** focused unit/integration/e2e tests, existing repository's lint/typecheck/build/verify command, visual screenshots and pixel/semantic comparison to reference. Test six contexts and failures. Fix until pass. Do not declare PASS based on historical demo screenshots or previous slice results. Report remaining actual gaps separately.

At each checkpoint deliver a concise change summary, changed files, verified commands/results, screenshots and known blockers. Do not alter authoritative contracts merely to make a test pass. Commit in small changes if repo workflow supports it.

## N. Required automated tests

1. All six contexts: Owner without Employee, scoped Team Leader, Employee, Site Employee, named Reviewer, explicit cross-branch participant.
2. Navigation: active state, collapse, grouped routes, search/page finder, direct URL, browser Back/Forward, mobile More, account menu and notifications.
3. Source states: success, empty, partial failure, stale, 503 retry, 401 session loss, 403 revocation while open, canceled late response; no private stale data.
4. Summary counts: Dashboard Committed-else-Target; overlapping buckets; factual zero vs unavailable; task-state review vs assigned review vs approval obligations independent.
5. Widgets: expected defaults, Add/Hide/Reset, desktop cross-column drag, keyboard moves, touch long-press and reorder, fixed summary/attention, persistence, hidden inaccessible widgets, no data persisted, fast browser resize.
6. Timer: start/pause/resume/save/manual when supported, single active timer, confirm switching tasks, route/unmount continuity, failed save recovery, authorization.
7. Performance: one panel for Owner, Team/Employees tabs, selected team lead and authorized people; Team Leader Employee only, no unauthorized data; no fictitious values for missing snapshots.
8. Project and decision drill-down: actual permitted canonical destination; direct denied link fails safely; each card uses current project/context.
9. A11y: focus, labels, Escape, focus return, reduced motion, 44px-ish touch target where feasible.
10. Screenshots with explicit dimensions above. Include failure evidence and reproduce commands for any blocked check.

## O. Final deliverables back to the Owner

- Working integrated implementation on a bounded branch/commits; no regressions in existing My Work, projects and auth.
- Before/after screenshots at all specified widths, including collapsed rail, edit mode, Owner team/employee switch, Team Leader and site contexts.
- `DASHBOARD_V10_IMPLEMENTATION_AUDIT.md`, `DASHBOARD_V10_INTEGRATION_GAPS.md`, a source/adapter map, component inventory, route/action map and widget registry table.
- Tests with exact commands + counts, failures, known unverified scope; app startup instructions for the current repo.
- Handoff statement distinguishing VERIFIED production behavior, DEMO-only presentation, and PROPOSED data/API changes. No claim of pilot completion or permission correctness without authenticated acceptance evidence.

## P. Stop conditions

Stop and request one narrow Owner decision **only** if there is a material conflict that cannot be resolved from existing signed-off sources (for example changing approval authority, time logging data semantics, scoring formula, security grant model, or changing a shared backend API/schema). Otherwise proceed using the current source of truth, keeping unsupported surface honest and recording bounded gaps. Avoid repeated broad questionnaires.

**Begin with the repository audit and a V10 screen-to-component mapping, then implement the smallest viable bounded checkpoint.**

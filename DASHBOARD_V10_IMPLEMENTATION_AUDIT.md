# DASHBOARD_V10_IMPLEMENTATION_AUDIT

Checkpoint 1 of the V10 master prompt. Maps every V10 demo component to the
existing repository, classifies EXISTING / PROPOSED / DEMO, and states the
bounded file-change plan. No code has been written yet.

Source authority order used throughout: (1) current repo + real
authorization, (2) approved requirements/contracts, (3) V10 HTML,
(4) screenshots. Where they conflict, the real contract wins and the gap
is recorded.

## 1. Repository baseline

- React + TypeScript SPA under `apps/web/src`, Nest/Prisma API under
  `apps/api`. Router: react-router v6 (`app.tsx`).
- Working tree already carries 369 uncommitted changes; V10 work is
  additive and will not commit or reset them.
- Web dev server on 59443, API on 59442, Postgres cluster 45434 are
  currently up for local verification.

## 2. Existing surfaces the V10 build reuses

| V10 concern | Existing source | Classification |
| --- | --- | --- |
| App shell (desktop grouped sidebar, mobile bar, More sheet, page filter, unread badge) | `workspace-navigation.tsx` + `workspace-navigation.css` | EXISTING — restyle + extend, not replace |
| Dashboard root + 7-source loader + reports/summaries/schedules tabs | `dashboard.tsx` | EXISTING — add V10 layout above the source cards |
| Dashboard source projection (`/dashboard/sources/:source`) | `apps/api/src/dashboard.service.ts` | EXISTING |
| Task summaries (overdue / due today / high / waiting / reviews) | `dashboard` source `tasks` sections `attention/overdue/today/priority/waiting/reviews` | EXISTING |
| Project status + health score | `health` source `score`/`scoreScale`, `GET /projects/:id` | EXISTING |
| Time tracking (start/pause/resume/save, timers) | `time.tsx`, `POST /time/timers`, `/time/timers/:id/:action` | EXISTING |
| Decisions & reviews (approvals + assigned rounds) | `decisions` source, `GET /approvals/attention`, `GET /reviews/inbox` | EXISTING |
| Performance (one unified panel, team/employee) | `performance` source, `GET /performance/context` + `employee`/`project` reads | EXISTING |
| Site delivery (snags/verification) | `site` source, `GET /site/projects` | EXISTING |
| My Work task list/drawer (do not replace) | `task.tsx`, `my-work/my-work-parity.tsx` | EXISTING — V10 links to it |
| Shared task composer ("New Task") | `task-composer-fields.tsx`, `TaskCreateDialog` in `task.tsx` | EXISTING — shell action reuses it |
| Notifications inbox + unread | `notifications.tsx`, `GET /notifications/unread` | EXISTING |
| My Work demo reference (master prompt §B.4) | `my-work/my-work-parity.tsx` (presentation-only, already wired) | FOUND — gap closed |

## 3. What V10 adds (PROPOSED, additive)

| Item | Location | Classification |
| --- | --- | --- |
| Dark-pine collapsible icon rail (desktop) | new styles in `workspace-navigation.css` + small `workspace-navigation.tsx` changes | PROPOSED |
| Mobile fixed 5-destination bottom bar (Home/My Work/Projects/Decisions/More) | `workspace-navigation.tsx` mobile section | PROPOSED |
| Ctrl/Cmd+K page finder overlay (destinations only) | new `page-finder.tsx` + `workspace-navigation.tsx` hook | PROPOSED |
| Fixed 5-card task summary strip | `dashboard.tsx` (top of dashboard tab) | PROPOSED |
| Compact Time Tracking widget (below cards, ~square) | `dashboard.tsx` reusing `time` API | PROPOSED |
| Projects widget | `dashboard.tsx` reusing `health`+`/projects` | PROPOSED |
| Unified People & Performance widget (Teams/Employees, one panel) | `dashboard.tsx` reusing `performance` | PROPOSED |
| Decisions & assigned reviews widget | `dashboard.tsx` reusing `decisions` | PROPOSED |
| Site Delivery widget (when authorized) | `dashboard.tsx` reusing `site` | PROPOSED |
| Fixed Attention Queue (bottom, max 2 rows + Show more) | `dashboard.tsx` reusing `my-work/attention` | PROPOSED |
| Widget registry + role-default eligibility | new `dashboard-widgets.ts` | PROPOSED |
| Drag/reorder (dnd-kit) + add/hide/restore + per-user persistence | new `widget-prefs.ts` (localStorage adapter), dnd-kit wiring in `dashboard.tsx` | PROPOSED — dnd-kit approved by Owner |
| Design token alignment to V10 lock | `dashboard.css` + shell css | PROPOSED |

## 4. Widget registry (V10 `WIDGET_INFO` / `WIDGET_DEFAULTS`)

Registry IDs are stable UI IDs, **not** API endpoints. Eligibility is
computed from real source access, never from a demo capability array.

| ID | Widget | Default contexts |
| --- | --- | --- |
| `time` | Time tracking | owner, manager, employee, site, cross, reviewer |
| `decisions` | Decisions & reviews | owner, manager, reviewer |
| `projects` | Projects | owner, manager, employee, site, cross |
| `performance` | People & performance (unified) | owner, manager |
| `nextAction` | Next action | employee, site, reviewer, cross |
| `site` | Site delivery | site |
| `workload` `training` `health` `signals` `shortcuts` | optional, gallery-only | when authorized |

Fixed, never draggable/hidden: the 5 summary cards (top) and the
Attention Queue (bottom). Everything else is reorderable when the user is
authorized to add it.

## 5. Data-integrity rules enforced in this build

- Summary counts come from the `tasks` source sections only; a task may
  appear in multiple buckets, so buckets are **never summed** into a
  unique total.
- Overdue/due-today classification uses Committed-when-present-else-Target
  as returned by the API; the UI shows the date basis, it does not recompute.
- Performance shows a persisted authorized snapshot or the literal
  `Performance snapshot unavailable` — no fabricated score or percentage.
- No synthetic demo scores, permissions, or time entries enter production
  paths. The V10 HTML fixtures stay in the demo/test folder only.
- 401/403/404/409/503 are distinct; a 403 clears the record immediately;
  saved widget layouts are intersected with the current authorized
  registry and inaccessible widgets are dropped.

## 6. File-change plan (bounded, per checkpoint)

- **CP2 (shell):** `workspace-navigation.tsx`, `workspace-navigation.css`,
  new `page-finder.tsx` + `.css`. No API change.
- **CP3 (dashboard widgets):** `dashboard.tsx`, `dashboard.css`, new
  `dashboard-widgets.tsx` (widget renderers) + `.css`. Reuses existing
  sourceData/time/performance/decisions reads.
- **CP4 (personalization):** new `widget-prefs.ts` (registry, eligibility,
  localStorage adapter + reset), dnd-kit wiring in `dashboard.tsx`.
- **CP5 (regression):** targeted tests in `dashboard.test.tsx`,
  `workspace-navigation.test.tsx` (new), plus typecheck/lint/build.
  Screenshots at 1440/1024/390/320 per the acceptance matrix.

## 7. What will NOT change

- Backend business logic, schema, identity/passkey/CSRF, task state,
  review/client-approval authority, project stages, time authorization,
  RBAC grants, audit trails, or existing API semantics.
- The My Work task list/drawer; V10 links to it, does not replace it.
- Other modules; the shell links through real routes only.

## 8. Risks / open items

- No server-side per-user dashboard-layout preference store exists yet;
  §I.6 permits a documented localStorage adapter as the interim. A server
  endpoint is proposed, not invented as deployed.
- A single active timer across the app is a client concern; the existing
  `time` API already enforces server-side timer authority. The dashboard
  widget reads the same timer state rather than a second source.
- Team-lead scoring period/metric fields must be taken from the real
  performance context; where absent, the panel shows unavailable language.

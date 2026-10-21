# Sense Studios — application shell and Dashboard demo brief

Prepared 15 October 2026. This is the first UI demo for the V1 internal pilot with real staff. It specifies a synthetic interactive prototype; it does not change permissions, approve new backend behavior, or claim pilot readiness.

Read this with [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md). Use the Owner's approved `Sense_Studios_My_Work_Final_Demo.html` as the primary visual reference when attached. The existing [design lock](../ui/UX_REFERO_DESIGN_LOCK_2026-10-08.md) supplies established tokens where the approved demo does not settle a detail.

## 1. Outcome and boundary

Create one reusable application shell and its Dashboard page. The shell will later host My Work, Projects, People and Settings, so keep navigation, header, content container, dialogs, drawers and common controls reusable.

The Dashboard should answer: **What needs attention, what is due, and where should I go next within my access?** Make important work visible without making the page a second full task manager.

Deliver editable, working source: either one self-contained HTML file with CSS/JavaScript, or a complete small React/TypeScript package. Use synthetic records, a Promise-based in-memory mock API and local assets. Keep mock data access separate from rendering. The real application uses React/TypeScript, Nest and PostgreSQL; demo integration will replace mocks with owning-service calls.

## 2. Visual direction

- Follow the attached approved My Work demo for component character, density, spacing, colors and interaction patterns. Carry the same system into this shell and Dashboard.
- Established fallback tokens: cream canvas `#f4f1e9`, light surfaces `#faf8f2` / `#fffdf7`, forest text/actions `#182c29` / `#29463d`, muted text `#61736b`, borders `#d9d8cd`, active surface `#e3eadf`, gold accent/focus `#e7c680` / `#b98f49`.
- Use Inter/system sans for controls, labels, tables and navigation. Keep any established Georgia treatment limited to brand/headings. Use compact operational headings, readable rows, light borders and restrained shadows.
- Define reusable tokens for typography, spacing, surfaces, status colors, radius, buttons and focus. Status colors convey meaning alongside readable text.
- Use existing brand assets or a simple text wordmark. Provide local assets or reliable system fallbacks.

## 3. Application shell

### Desktop and tablet

Include:

1. Sense Studios identity and organization name.
2. Grouped sidebar with clear active route, usable collapse/expand behavior and navigation search.
3. Easy access to Dashboard, My Work, Projects and People.
4. Header with current page/breadcrumb, notifications entry and account menu.
5. Stable Settings utility entry and an authorized Create task entry point.
6. Consistent page container, headings, toolbars, buttons, badges, row treatments, dialogs, drawers and toasts.

Navigation search searches page names in this demo. A search across all project/task/document content is a proposed capability and must be listed as such if added.

Account menu: signed-in email, account kind, account/settings link and simulated sign-out. A friendly staff name may be a clearly identified demo-only field; current Account/Employee source has no stored display-name field. Never infer a real person's name from email. Organization and branch labels describe context; a branch selector cannot grant access.

### Navigation destinations

Propose sensible grouping and progressive disclosure. Preserve a clear path to all existing workspaces; keep advanced destinations in secondary groups rather than making every route a top-level item.

| Destination | Route / integration status |
| --- | --- |
| Dashboard | `/dashboard` — existing default signed-in destination |
| My Work | `/my-work` — existing |
| Projects | `/projects` — existing |
| People | `/people` — proposed dedicated V1 route |
| Tasks, Decisions, Notifications | `/tasks`, `/decisions`, `/notifications` — existing |
| Project documents, Drawing register | `/documents`, `/revisions` — existing |
| Internal reviews, Client reviews | `/reviews`, `/client-reviews` — existing |
| Site delivery, Turnkey operations | `/site`, `/turnkey` — existing, scoped |
| Time, Workforce, Learning | `/time`, `/workforce`, `/learning` — existing, scoped |
| Performance, Reports, Saved Reports | `/performance`, `/reports`, `/saved-reports` — existing |
| Automation & reports, Evidence assistance | `/automation`, `/assistance` — existing |
| Integrations, External access | `/integrations`, `/external-access` — existing |
| Account & settings | `/settings` — existing; focused V1 panels come later |

For destinations outside this demo, navigation can open a clearly labeled module preview with a return path. A preview must not pretend the full module is implemented. Keep URL, active navigation and visible page consistent; support browser Back/Forward and context restoration.

### Mobile

Use a short primary destination bar and an accessible More sheet. Keep My Work and Projects easy to reach and Settings discoverable. Document the proposed mobile destination order for review. The current application's primary paths are Dashboard, My Work, Tasks and Documents; a changed order is a demo proposal.

More sheet, account menu and drawers must support keyboard focus, Escape, focus return, screen-reader labels and scrolling on short screens. At 320px, keep navigation and first useful actions reachable without horizontal page overflow. Respect reduced motion and use comfortable touch targets.

## 4. Dashboard structure

Keep Dashboard as the default signed-in landing page. Display date, signed-in/context information and source freshness. Show the personal or managed scope actually represented by the data; any scope selector is limited to contexts that the mock service permits.

### Primary area

Show a compact set of factual task summaries with counts and short previews:

- Overdue and incomplete.
- Due today.
- High / critical priority.
- Waiting and blockers.
- Reviews and corrections, clearly labeled as task-state summaries.

Use an attention area for urgent task rows and a separate decision/approval preview. Choose the arrangement to make the next action easy to scan. A task may appear in several task summaries: their counts overlap and must not be added into a total. Show a count only when the corresponding authorized source loaded successfully.

Dashboard task-source logic currently uses **Committed date when present, otherwise Target** for its overdue/today classification. Show the date basis clearly. My Work's typed attention queue is a separate contract: assigned review rounds and approval obligations are not interchangeable with task-state counts. Any change to date/count semantics must be listed as proposed rather than silently applied.

Task rows should show title, project when present, status, priority, due date/date basis and next destination. Add owner metadata only when supplied by an authorized task/detail read; the current Dashboard source row does not itself supply an owner label. Display long text gracefully.

### Secondary source cards

Provide reusable cards for:

- Project health and risks.
- Employee / Team Leader performance.
- Workload and leave.
- Site delivery.
- Training and improvement.

Prioritize these for the selected permitted context. Put secondary material below urgent work or in compact expandable sections. A task-only Site profile must not gain People, finance or performance data from its title.

Health/performance values require an authorized persisted snapshot and approved policy. Show the score's period, scale and evidence context when available; otherwise show factual unavailable language. Do not invent utilization, productivity, financial, completion or health scores. Site work has genuine source records; an upload count is not supported.

### Actions

- Clicking a summary opens its matching rows or navigates to the appropriate owning workspace. Do not claim an unsupported API filter exists.
- Clicking a task opens a lightweight canonical task preview or the returned task destination. Include a working Back/close path.
- Clicking a decision opens its authorized owning context. Decisions are human workflow actions; there is no generic approve-anything Dashboard command.
- Each source card can refresh/retry independently and shows its last successful read time.
- Create task opens a clearly labeled shared-composer preview entry point. The full creation form is the next demo, so keep one reusable integration boundary rather than implementing another domain workflow here.
- Notifications opens a synthetic inbox preview; marking one read updates the shared mock store and the corresponding badge. Derive unread counts from the full mock inbox; flag any required aggregate endpoint as proposed for integration.

## 5. Backend mapping and honest demo models

Existing paths below have the `/api/v1` prefix in the real application:

| UI concern | Current source |
| --- | --- |
| Signed-in identity | `GET /auth/session` |
| Complete Dashboard projection | `GET /dashboard` |
| Independent Dashboard source | `GET /dashboard/sources/:source` |
| Canonical task preview | `GET /tasks/:id` |
| Personal notification inbox | `GET /notifications?cursor=...` |
| Mark a notification read | `PATCH /notifications/:id/read` |

Dashboard source keys are `tasks`, `decisions`, `health`, `performance`, `workload`, `site`, `training`. A source response includes `source`, `today`, `readCompletedAt`, `sections`, and a `decisions` projection for the decisions source. Sections contain `key`, `label`, `rows` and optional `unavailable`; ordinary task rows contain `id`, `label`, `status`, `date`, `route`, `projectId`, `sourceRef`. Preserve returned route/source identity.

The current session contains account `{ id, email, kind: OWNER | STAFF }`, `csrfToken`, `ownerSetupRequired`, `activePasskeyCount`; it does not contain a universal permissions bundle. Any mock `capabilities`, scope picker, friendly names, dashboard layout preferences or badge aggregates are **DEMO MODEL / PROPOSED V1**, unless mapped to another existing contract.

Use explicit fixture capabilities returned by the mock service to render permitted actions. Actual authority still depends on current backend resource checks. Default deny, deny precedence, membership, branch restrictions and workflow conditions continue to apply.

## 6. Required scenarios and states

Use one synthetic organization, two branches, stable UUIDs and shared people/project/task records. Freeze today at **2026-10-15, Asia/Kolkata**.

Show separate synthetic contexts:

- Owner with organization management context and no Employee record: personal tasks can be empty while management obligations exist.
- Team manager: only granted reporting-team and assigned-project records.
- Ordinary employee: own/permitted work.
- Site employee: assigned site work and genuine snags.
- Named reviewer: exact assigned review obligations; reviewer responsibility does not grant organization-wide administration.
- Cross-branch participant: one explicitly assigned project in the other branch, without neighboring records.

Client and External account kinds have separate portals; this internal shell serves Owner and Staff. Manager/Site/reviewer are overlapping responsibilities, not new account kinds. A demo scenario selector belongs in a visibly separate **Demo controls** harness outside the product shell; it is not a production role switcher.

Demonstrate initial loading, ready, genuine zero/empty, no search results, denied, source error/retry, partial source failure, stale data, session expiry and access revoked while a preview is open. Keep successful sources usable when another source fails. Unavailable is not zero. Clear private content on sign-out, account change or revocation; ignore late responses from the prior account.

## 7. Acceptance and handoff

Verify the demo at 1440, 1024, 390 and 320px and at a short mobile height. Check keyboard operation, visible focus, readable contrast, menus/drawers, long labels, dense rows and browser Back/Forward.

Return:

1. Complete working source and all assets, with simple run instructions.
2. Reusable shell/components and a small token/style guide.
3. Synthetic fixtures with stable IDs and a separate mock API/store.
4. Interaction/route map, including links to future module previews.
5. Persona/state checklist and responsive captures.
6. Existing API mapping plus a separate list of proposed fields, APIs, access rules and persistence needs.

Every visible control should navigate, change real mock state, open a useful preview, or explain its restriction. Counts and badges should derive from the same store as their rows. Acceptance of this demo settles its visual/interaction target; backend integration and real pilot verification are subsequent work.

> Current revision: [Refero-informed validation package](UX_REFERO_REVISION_PACKAGE_2026-10-07.md) and [capability-to-home map](UX_CAPABILITY_HOME_MAP_2026-10-07.md) supersede earlier layout descriptions. The current connected prototype uses condensed Dashboard sections and disclosed secondary widgets. S18 and bounded S27 are IN PROGRESS under current Owner direction; historical exclusion wording below is superseded. Current artifact checks are recorded in UX_REFERO_REVISION_CHECK_2026-10-07.cjs; earlier checks are historical.

# Sense Studios UX Architecture

**Date:** 2026-10-07  
**Status:** PROPOSED architecture for Owner review; planning only. No route, screen, API, permission, workflow, schema, or visual styling changes are authorized by this package.

## Evidence and status vocabulary

- **CURRENT** means the route or capability was confirmed in the working-tree UI/source and current project status documents. It does not mean a new live usability or production test was performed.
- **PLANNED** means documented in approved requirements or a slice plan but unavailable in the accepted current scope. S18 Skills/Learning remains excluded and S27 remains deferred pending the real-project R-104/R-105 checkpoint.
- **PROPOSED** means a UX recommendation in this package. It is not an implementation commitment.

The UI/UX Master Transformation Plan is useful prior planning, but its screen audit is pinned to S22 commit `d21ccd1` and explicitly excludes later UI evidence. This package rechecked the current route registry, navigation source, selected screen components and test assertions against the current S23–S26 completion record. It is a code-backed destination/action inventory, not a live user study or a full audit of every individual form control. Current operational project use for R-104/R-105 remains unverified; the separately authorized synthetic test-server demonstration does not establish it.

The UI/UX Pro Max skill was applied for navigation hierarchy, progressive disclosure, accessibility, touch, responsive content priority, error/empty/loading states and consistent interaction. Its focused search script could not run because the configured Windows `python.exe` launcher was inaccessible; the skill's searchable UX guidance in `SKILL.md` was used directly. Relevant principles applied here: navigation hierarchy, no overloaded global navigation, contextual actions, primary-action clarity, accessible focus and keyboard paths, labeled forms, inline errors, truthful loading/empty/unavailable states, mobile-first content priority, 44pt/48dp touch targets and no gesture-only critical actions.

## A. Executive UX diagnosis

The scattered feeling is supported by the current structure:

1. **Too many peers in global navigation.** The desktop sidebar puts 17 links at the same level: Workspace, My Work, Tasks, Projects, Project documents, Drawing register, Internal reviews, Client reviews, Dashboard & reports, Integrations, Automation & reports, Performance, External access, Turnkey operations, Site delivery, Time and Workforce. A user must know module names and choose between personal and management views before understanding the work context.
2. **The starting point conflicts with the Owner's intended mental model.** A ready internal session enters `/my-work` (confirmed by `app.test.tsx`); Dashboard is a separate route. The Owner has decided Dashboard is the internal sign-in home. This package treats that as a future navigation requirement only.
3. **Project work is distributed across global workspaces.** Project selection is repeated on project, documents, drawing register, reviews, Turnkey and site routes. Related actions are not consistently reached from one project context.
4. **Dashboard combines several jobs.** Its current Overview, scheduled summaries, reports, reminders and schedules are all under “Dashboard & reports”; actionable attention competes with management/report configuration. It also has a dashboard “Open approvals” link to `/approvals`, but the current route table does not register `/approvals`.
5. **Existing screens contain real workflow complexity.** Task detail includes dates, recurrence, extensions, waiting, assignment, closeout, review requirements and history. Review includes exact evidence, rounds, annotations, decisions, corrections and category administration. The issue is not missing capability; it is the need to make the next relevant step and its context easier to recognize.
6. **Accepted role-scoped capabilities span more modules than the earlier UX plan reflected.** S23 performance/health, S24 reports/dashboard, S25 integrations and S26 automation/custom reports are accepted for development/local staging. The prior master plan's PLANNED labels for these are stale. Their exact current UI was not comprehensively inspected here, so screen-level judgments are marked source-only where appropriate.

**UX principle:** Recognition over recall; stable global destinations; object-centered contextual navigation; one primary action per current context; progressive disclosure; honest scope and evidence states.  
**PROPOSED solution:** Dashboard answers “what needs attention?”, My Work answers “what should I work on?”, Projects is the project directory, and a selected Project Workspace owns project-specific navigation/actions. Make specialized operation worklists reachable contextually and through a restrained More area.  
**Why it fits Sense Studios:** Architecture/interiors work is stage- and drawing-centered, with distinct review, client approval, issue, site verification and handover authorities. People should navigate by project/task/review context without collapsing these separate business states.

## B. Current navigation map

### Internal current routes and destinations

| CURRENT destination / route | Current location and primary users | Typical frequency | Context / discoverability observation |
|---|---|---:|---|
| Workspace `/workspace` | Full signed-in landing aggregate; staff and Owner | Daily initially | Legacy landing with approval queue plus project/task workspaces; competes with dedicated routes. |
| My Work `/my-work` | Personal attention, approval queue and personal-only task workspace | Daily | Current default after sign-in; label sounds personal but also starts with decisions. |
| Tasks `/tasks` | Organization or scoped task list, filters, list/board/timeline, detail, create | Daily/frequent | Separate from project and personal task entry; Owner scope is organization tasks. |
| Projects `/projects` | Project directory/detail workspace | Daily/frequent | Project selection is available globally; current detail structure is not a unified home for all modules. |
| Project documents `/documents` | Project file/folder, upload, access and document actions | Frequent | Global route, project picker/context; drawing/review links can return here. |
| Drawing register `/revisions` | Drawing records, revision history, issue/transmittal and acknowledgement | Frequent | Separate global destination despite project-specific exact revision context. |
| Internal reviews `/reviews` | Assigned review inbox, exact-round review, comments, annotations, decision, correction, escalation/withdrawal | Frequent | Separate route; inbox has review-specific authority and must stay distinct from generic approvals. |
| Client reviews `/client-reviews` | Staff management of client review packages/items and exact decisions | Occasional/frequent by project phase | Global destination for project-specific external workflow. Client portal itself has separate authentication/shell. |
| Dashboard & reports `/dashboard` | Role-scoped dashboard, summaries, fixed reports/snapshots, reminders and schedule rules | Daily for overview; reports occasional; schedules rare | Current dashboard is a broad multi-tab workspace, not only an attention router. |
| Integrations `/integrations` | Authorized calendar, website enquiry, maps and integration setup/status | Occasional/rare | Administrative cross-cutting concern in global navigation. |
| Automation & reports `/automation` | S26 rule/report definitions, run/history, approval-proposal boundary | Occasional/rare | Name bundles two separate concepts and implies reports live here and Dashboard. |
| Performance `/performance` | Personal/scoped performance, evidence/review-cycle workflows; project health-related insights | Occasional | Accepted S23 feature; distinct policy and sensitive named-score permissions. |
| External access `/external-access` | Staff exact consultant/vendor/factory grants and scoped requests | Occasional/rare | Project-keyed access administration exposed globally. |
| Turnkey operations `/turnkey` | Project picker, released design/BOQ, cost/procurement approvals/material/factory status | Frequent in applicable projects | Project-specific, delivery-type specific. Separate route can expose irrelevant complexity to Design users. |
| Site delivery `/site` | Site packages, offline capture, manpower, reports, snags, checks, closure/handover | Daily in active site work | Project-specific; long operational workspace and mobile-first use case. |
| Time `/time` | Own/authorized time records, timer/manual entry, corrections and Owner export | Daily/frequent | Cross-project personal action currently has a top-level peer. |
| Workforce `/workforce` | Attendance, leave, WFH, schedules, allocation/workload, policy and Owner retention | Daily for attendance; occasional/admin for policies | Self-service and management configuration share one route. |
| Identity setup routes `/bootstrap`, `/enroll`, `/owner-recovery` | First Owner setup, invitation/recovery enrollment, Owner recovery | Rare | Separate account/security flows; not everyday navigation. |
| Client portal routes/screens | Client Dashboard, project/review package/item and gallery under separate client session | Occasional | Constrained external shell; internal nav must not leak across it. |
| Consultant/vendor/factory portal | Granted exact project evidence, requests/submissions, uploads, transmittals, CAD share and own sessions | Occasional | Separate external shell/session; external advice is not formal approval. |

**Current app-shell behavior:** `/` and `/workspace` render the signed-in aggregate landing, which currently includes the ApprovalQueue, ProjectWorkspace, TaskWorkspace and a flat navigation bar. `/my-work` composes the ApprovalQueue, MyWorkAttention and personal-only TaskWorkspace. `/dashboard` is separately routed. Mobile current primary links are My Work, Tasks and Project documents; the other 14 destinations are in a More dialog. This audit confirms destinations from source; it does not assert that every current component has been independently usability tested.

## C. Action inventory

Frequency is a UX estimate based on the action's expected workflow, not telemetry. “Current location” names verified route/component context. Current permissions remain authoritative; roles are only shown where the existing UI or approved role scope supports them.

| Action / destination | Current location | Who / frequency | Context | Current discoverability/problem | Recommended location |
|---|---|---|---|---|---|
| See urgent/overdue/blocked/waiting items and choose next step | My Work attention and Dashboard overview; current section links vary by source | All internal roles / daily | Dashboard-attention, personal work | Split between Dashboard and My Work; dashboard attention not first landing | Dashboard attention summary; drill to source; full personal set in My Work |
| Work own and collaborating tasks; create, start, wait/resume, complete, edit | `/my-work`, `/tasks`; TaskWorkspace detail | Employee/collaborator; manager when authorized / daily | Personal work, Task | Duplicate entry points; a large detail/action form has many conditional commands | My Work for personal list, Project > Plan & Tasks for project work, Task detail for object actions; keep scoped management list in More |
| Assign/reassign owner/collaborators, acknowledge workload warning, approve closeout task | `/tasks` task list/detail/create | Owner or explicitly permitted manager / frequent/occasional | Task / administration | Assignment is embedded in create/detail; closeout task competes with ordinary create | Task detail/create when acting on task; separately labeled admin action in project closeout context |
| Set target/committed dates; request/decide extension; recurrence; waiting reason; dependencies | `/tasks` detail | Employee/manager according to capability / frequent | Task | Date concepts and recurring rules increase form density; committed vs target distinction easy to miss | Task detail’s Dates & schedule section, with pending request adjacent to committed date; advanced recurrence disclosure |
| Start/submit, review, annotate, decide approve/correct, assign correction | `/reviews` and task-linked review context | Submitter/reviewer/authorized correction assigner / frequent | Review | Separate route and documents route links; exact file/round scope is specialized | Project > Reviews and exact Task/Review context; task action routes to exact round |
| View/upload files; manage folders/visibility/access | `/documents` | Project staff / frequent | Project/document | Global project picker; review markup directs back to project documents | Project > Documents; file-level actions on selected file; retain a global authorized picker only as secondary entry |
| Create drawing, add R/CR revision, require client review, issue exact approved revision, acknowledge transmittal | `/revisions` | Design/Project Lead/Owner and named recipient under current capability / frequent | Project/document/review | Revision register is global and visually distinct from Documents/Reviews | Project > Documents > Drawing register and Project > Reviews; exact issue action remains on selected approved revision/transmittal |
| Manage client package/items, comments, annotations, approval | `/client-reviews`; separate client portal | Project staff, Primary Client/delegate per exact scope / occasional | Project/review | Internal management route distinct from project workspace; client authority differs by item vs final package | Project > Reviews > Client review; client portal remains a distinct constrained journey |
| See project stage, milestone, lead, scope, status, blocker, next action | `/projects` and project data in several routes | All internal roles / daily/frequent | Project | Stage/status/context is repeated across module pickers; no single “what happens next” view | Project Overview, with source links and clear active/blocked/review state |
| Change project scope/lifecycle/lead/assignment, transfer, cancellation, hold | `/projects` detail controls | Owner/authorized Project Lead/manager based on capability / occasional | Project/administration | Consequential actions among ordinary project content | Project > Overview or Team & Scope; destructive/high-impact actions isolated with reason and confirmation |
| Leads, client/contact/source, stage, activity, convert/lost | `/workspace` CRM surface (CRM is embedded in landing) | Owner/authorized lead managers / frequent/occasional | People/client | No first-class global route in current nav; likely hard to predict inside broad Workspace | Leads & Clients global destination for authorized users; client/contact actions in record context |
| Log time, run/stop timer, correct/review time, export accounting delivery | `/time`; task context may provide work context | Employees; approver/Owner for scoped review/export / daily/occasional | Personal work/task | Time is separate from task users are working on; accounting export is a rare Owner action | Start/log time in Task/Project context; own Time history in My Work; management/export under More or Manage |
| Attendance check-in/out, leave/WFH, see schedule/workload | `/workforce` | Employee / daily; manager review / frequent | Personal work/people | Self-service mixes with management policy, site setup and retention actions | Self-service in My Work/People area; management view in People; configuration/retention in Manage |
| Site notes/photos, work packages/progress, manpower, reports, snags, verify/close/handover | `/site` project picker and long workspace | Site/field staff; verifier/manager / daily when active | Site/project | Project selection separate from Projects; long page combines capture, management, history, handover | Project > Delivery > Site; today’s field actions first; administration/history conditionally below |
| Turnkey release/BOQ/material/procurement/factory updates/cost decisions | `/turnkey` project picker | Design/Owner/procurement and vendor in limited portal / frequent in Turnkey projects | Project/delivery | Always-visible global route irrespective of project type; internal/external responsibilities differ | Applicable Project > Delivery > Turnkey; cost approvals stay in their exact approval context |
| External grant create/change/revoke, scoped request, CAD issue/revoke confirmation | `/external-access` project ID form | Owner/authorized manager; CAD issue Owner-only / rare | Project/people/security | Starts with manual project ID and bundles grants, requests, CAD cancellation | Project > Team & Access for grants; exact file/revision actions remain contextual; account/session actions in Account |
| View performance, review cycles, goals/actions, project health/delay attribution | `/performance`, dashboard data | Employee own; managers/Owner only current permitted scopes / occasional | Insights/project | “Performance” can blend personal review and project health concepts | My Work/Account for own review; Insights for authorized performance and project health; project-specific health in Overview |
| Build/view/export/freeze/correct reports; schedule notices/summaries/reminders | `/dashboard` tabs; `/automation` custom reports | Owner and explicitly scoped report users per grants / occasional/rare | Insights/manage | Fixed and custom reports split across two ambiguous destinations; schedules mixed with dashboard | Reports global under Insights; saved report builder remains Reports; reminder preferences under Account/My Work; org schedules in Manage |
| Create/edit/pause automation, view runs/proposed approvals | `/automation` | Owner/org or specifically granted staff / rare | Manage/project | Name does not disclose approval boundary; global route can obscure project rule context | Manage > Automation, with project rule accessible from Project > Automations only when applicable and authorized |
| Calendar connection, website enquiry intake, map links, integration delivery | `/integrations` | Owner/authorized manager; occasional operational staff use links / rare setup | Manage/project | Setup versus everyday map use is mixed conceptually | Integration setup in Manage; map link at relevant Project/Site; delivery failures in source context plus Dashboard attention only where actionable |
| Configure org/branch/team/employee roles, grants, templates, retention, audit | `/workspace` organization administration and specialized surfaces | Owner/explicitly scoped administrators / rare | Administration/security | Admin nested inside broad landing; distinct settings compete with operational areas | Manage > Organization & Access, Templates, Audit & Retention; permissions remain enforced server-side |
| Manage passkeys/recovery/sessions/notifications/preferences; sign out | Auth and account controls; some account/session UI inside identity/portal surfaces | All authenticated accounts / rare except notifications | Account/security | Not clearly grouped as a coherent account destination in global nav | Account menu/destination; notification preferences and sessions separated from organization admin |

## D. Scattered-action analysis

| PROBLEM | UX PRINCIPLE | PROPOSED SOLUTION | WHY IT FITS SENSE STUDIOS |
|---|---|---|---|
| One project’s work is split among project, task, documents, revisions, internal/client reviews, Turnkey, site and external access routes. | Contextual navigation and object locality | Enter project once; show only applicable Overview, Plan & Tasks, Documents, Reviews, Delivery and Activity areas. | Stage, drawing and delivery context are project-specific. |
| My Work and Tasks overlap but have different scope. | Explicit scope and stable mental models | Name My Work as personal/assigned/collaborating; keep organization/scoped task management separate. If current API cannot deliver complete personal scope, label exact scope honestly. | Employee's core question is next work; manager's list is assignment oversight. |
| Dashboard is broad and its actionable layer is not first in current signed-in path. | Orient, then route; progressive disclosure | Make Dashboard internal default; prioritize exceptions and decisions, route onward; place report building/configuration in Insights/Manage. | Owner explicitly set Dashboard as home and requested actionable—not exhaustive—content. |
| Different kinds of “approval” coexist: shared management approvals, internal drawing review, client item/final approval, procurement/cost, site verification/closure/handover. | Preserve domain states and authority | A shared Decisions hub can index existing requests and exact source actions, but every detail/command remains in owning project/review/cost/site context. Keep internal review inbox distinct from generic decisions. | Prevents authority and evidence conflation. |
| Employee self-service and management configuration coexist (Workforce, Time, report schedules). | Role-based progressive disclosure | Surface self actions by personal context; show management/configuration only with current capability. | Reduces employee cognitive load without changing permissions. |
| The current screen labels themselves reinforce module memorization (“Turnkey operations,” “Site delivery,” “Drawing register”). | User language and predictable grouping | Place feature names under project context; retain familiar terms as section labels and redirects. | Users know the project and activity, not the internal module boundary. |

## E. Information architecture problems

1. **Navigation objects differ in kind:** destinations mix people, work objects, workflows, analytics and administration.
2. **No one authoritative project frame:** contexts are reselected across workspaces, obscuring stage and next milestone.
3. **Two task scopes are under-signaled:** personal work and organization/scoped task management both read as “tasks.”
4. **Dashboard/Reports/Automation naming overlaps:** accepted fixed and custom report features are distributed across `/dashboard` and `/automation`.
5. **No dedicated Decisions route:** shared ApprovalQueue is embedded in Workspace and My Work, and Dashboard points at unregistered `/approvals`. A generic decision center must not absorb review or client authority.
6. **Global navigation overexposes low-frequency specialist/administrative destinations.**
7. **Responsive navigation is currently optimized around My Work, Tasks and Documents**, which omits the Owner-chosen Dashboard as a mobile primary destination and gives two task destinations global prominence.

## F. Proposed final information architecture

### Internal global navigation (PROPOSED)

1. **Dashboard** — default internal home; attention and routing.
2. **My Work** — personal assignments, collaboration, due/blocked/waiting/correction and own work context.
3. **Projects** — authorized project directory; enters Project Workspace.
4. **Decisions** — paginated, currently eligible shared approval requests and decision context, with drill-through to the authoritative object. Do not treat notifications or review statuses as decisions.
5. **More** — grouped, role/capability-aware destinations: **People** (Time, Workforce); **Insights** (Performance, Project Health, Reports); **Manage** (Leads & Clients, Organization & Access, Templates, Integrations, Automation, Audit & Retention); **Account** (Sessions, Passkeys/Recovery, Preferences/Notifications, Sign out).

This is the smallest sensible global set for daily work. Leads & Clients is a distinct business area but low-frequency/management-focused enough for More; where current CRM lacks a dedicated route, that is a route gap, not a claim of current screen. Documents should not be a primary global destination: enter from Project Workspace, with an authorized project-picker shortcut under More if needed. Tasks, Drawing register, Internal reviews, Client reviews, Turnkey and Site should be available within project/task/review contexts and optionally as scoped cross-project worklists under More if current read models support them. Never hide a time-sensitive eligible review or decision just to reduce nav count.

**Do not add** an app-wide search/command palette unless a reviewed, scope-safe server search contract exists. Candidate structure is not approval to implement search.

### Project Workspace (PROPOSED)

`Project > Overview | Plan & Tasks | Documents | Reviews | Delivery | Activity`

- **Overview:** identity, Design/Turnkey type, owning branch, lead, stage, current milestone, lifecycle/hold, real source-backed health, due dates, top blockers/attention, active/current work and next permitted action.
- **Plan & Tasks:** stage/milestone plan, task list, dependencies/date basis and project-filtered work. Planning remains schedule/gate context; avoid a second task truth.
- **Documents:** folders/files, upload state, Drawing register, exact revisions, transmittals, gallery/publication only where current capabilities apply.
- **Reviews:** internal submissions/rounds, correction tasks and client package/item flow, with distinct labels and authority.
- **Delivery:** Turnkey and Site subsections only when type/features apply; exact cost, procurement, site report/snags, verification and handover contexts remain distinct.
- **Activity:** authorized project/task/review/scope history, not unrestricted audit payloads.

**Team & Access** is a contextual project management subpage or section available only to capable users; external-grant actions remain exact-scope. Integration configuration, organization settings, general report definitions and Account controls stay out of the project tabs unless the specific project action is in scope.

## G. Global vs contextual navigation map

| Context | Global entry | Contextual navigation | Actions at object level |
|---|---|---|---|
| Global | Dashboard, My Work, Projects, Decisions, More | — | Create only high-frequency, low-risk supported actions where their context is known |
| Dashboard / attention | Dashboard | Exception/source type | Open exact task/project/review/decision; no business mutations from summary rows unless existing UI supports a safe exact action |
| Personal work | My Work | Today / All relevant / Waiting & blocked / Reviews & corrections / Upcoming / Recent | Start/log time, open task, respond to correction, resume, submit through existing workflow |
| Project | Projects | Overview, Plan & Tasks, Documents, Reviews, Delivery, Activity; Team & Access conditionally | Project-specific scope/lifecycle, plan, documents, reviews, delivery and access actions |
| Task | Task detail reached from My Work/Plan & Tasks | Summary, Work & dates, Dependencies, Review, History | Start/wait/resume/complete, edit, extension, assign/reassign, time entry; only current authorized actions |
| Review | Project Reviews / exact task review | Inbox, Review detail, round/version, comments and history | Start, comment/annotate, approve or request correction, assign correction, escalate/withdraw per capability |
| Decision | Decisions list | Exact request/source context | Decide only an eligible current version; preserve reason and owning workflow |
| Document | Project Documents | Folder, file, Drawing register, transmittals | Upload/retry, manage metadata/access where allowed, append revision, issue exact eligible revisions |
| Site | Project > Delivery > Site | Today/capture, packages, reports, snags/checks, handover/history | Capture/submit/check/close/handover only under current role and online/offline policy |
| People | More > People; own actions via My Work/Account | Self-service vs scoped management | Attendance, leave, allocations, review/capacity, policy only by capability |
| Insights | More > Insights; selected project overview | Performance, project health, reports, saved custom reports | Preview/export/freeze/correct; data and fields remain current-permission-filtered |
| Admin | More > Manage | Org, access, templates, integrations, automation, audit/retention | Reasoned privileged actions; low-frequency separated from daily work |
| Account/security | Account menu | Passkeys, recovery, sessions, notification/preferences | Security/session actions only; separate from Organization & Access |

## H. Role-based navigation matrix

All visibility is capability-filtered by existing authorization. The matrix proposes information priority, not new role rights. “Team Leader/Project Lead” does not itself grant permissions; exact grants remain authoritative.

| Persona | Primary destinations | Daily actions / attention | Secondary / rare | Hide or progressively disclose |
|---|---|---|---|---|
| Owner | Dashboard, Projects, Decisions, My Work | Company attention, overdue/blockers, approvals, project health/risks, client/site exceptions, own work if applicable | Leads/Clients, Insights, org/security, templates, integration/automation, audit/retention, time export | Detailed rule/policy/report configuration; source detail until opened; never imply employee personal work where no employee identity exists |
| Team Leader / Project Lead | Dashboard, My Work, Projects, Decisions | Explicitly scoped reviews, team/project blockers, workload, deadlines, corrections, stage/milestone issues | Scoped People/Workforce, reports, project access management | Company-wide metrics, unassigned/ungranted identities, unrelated admin |
| Employee/collaborator | Dashboard, My Work, Projects | Today/next task, due/overdue, Waiting, blocked, correction/returned work, own review/notifications, own time/leave | Authorized project files, own history/Performance, Time/Workforce self-service | Management queues, policies, named peer scores, org-level reports and administrative controls |
| Site/field user | Dashboard, My Work, Projects (mobile emphasis) | Current assigned site/project, today's packages/actions, capture/report/snags, required photos/docs, named checks, offline queue and sync state | Project documents/plan, tomorrow's plan, handover only if permitted | Internal performance/admin/financial details; unavailable/online-only actions; irrelevant Design-only delivery sections |
| Client / Primary / delegate | Separate client portal only | Exact granted package/items, requests for review, comments/annotations, decisions appropriate to authority, approved/issued files | Own history, gallery and security/session | Internal navigation, hidden project items, staff notes, delegate-only item authority vs Primary final-package authority preserved |
| Consultant | Separate external portal | Exact granted revision, staff request, advisory review/comment, upload, transmittal acknowledgement | Own submissions/uploads/session | Formal approval, ungranted project folders/files, internal decisions, vendor production data unless specifically granted |
| Vendor/factory | Separate external portal | Granted release/package/production context, requested update, advisory submission, own upload/transmittal/session | Limited granted production records | Protected price unless explicitly granted, design/client review internals, authority to approve or validate production |

## I. Dashboard architecture

### Above the fold (PROPOSED)

1. Page title **Dashboard**, date basis/timezone and last successful update when relevant.
2. A compact **Needs your attention** list, sorted by urgency and grouped by action: overdue/blocked; review/correction; decision/approval; client/site dependency. Each row names source, project, stage, due/age and next required action; clicking opens exact authorized context.
3. A short **Today / next** My Work summary (up to a few most relevant items), with a clear “Open My Work” route.
4. A small **Projects needing attention** list for Owner/authorized managers; employee/site roles see only relevant assigned project signals.

No decorative KPI wall, universal project percentage, or duplication of a full queue/table. If no actionable items exist, show a calm explicit all-clear plus the next useful destination, not empty panels for every possible category.

### Content visibility rules

| Information | Always show | Conditional / collapse | Drill-down |
|---|---|---|---|
| Urgent overdue/blocked/waiting, due reviews/corrections, actionable decisions | Yes when authorized and available; source and action context | Empty categories disappear; incomplete source has explicit unavailable state | Exact task/review/decision source |
| Project pulse | Top few actionable projects, with stage and reason | More projects collapse; no issue = lower priority | Project Overview / relevant review or delivery area |
| My Work | Concise near-term list/count only if complete and truthful | Detailed lists, filters, history and time entry stay out | My Work |
| Upcoming deadlines | Near-term only when schedule/date basis exists | Group later dates; avoid duplicate every task | Task/Project plan |
| Decisions | Attention count or rows only if current eligible approval requests exist | Nonurgent/full queue stays in Decisions | Exact approval/source context |
| Reports/metrics | Not above-fold by default | Role-relevant, fresh, authorized summary may appear below fold | Insights > Reports |
| Reminders/schedules | Personal due reminder summary if actionable | Organization schedules and configuration are Manage; settings don't occupy home | Account/Manage |
| Quick actions | At most high-frequency safe role-relevant action with unambiguous context (e.g. open My Work; current task action from a known task) | Create task, upload, site capture appear only when context/permission is known | Owning context |

**Role behavior:** Owner sees company exceptions and authorized decisions first, then project risk and workload. Team Leader/Project Lead sees explicitly scoped team/project issues and assigned reviews. Employee sees today/next, overdue, corrections, blocked/waiting and relevant notices. Site/field users see current project/site, today's permitted action and sync state. Client/consultant/vendor use their existing separate portal start pages; they do not inherit the internal Dashboard.

**Critical dependency:** S24 Dashboard currently combines factual summary sections, decisions, scheduled summaries, fixed reports/snapshots, reminders and schedules. S23/S24 source completeness, eligible actor, freshness and partial-failure behavior must be preserved. Do not turn a displayed row into an action without an existing route and capability. No use of a generic `/approvals` route is proposed as though it exists; current source has no route registration for it.

## J. My Work architecture

**Question:** “What should I work on now?”  
**Default:** a relevance-ranked **Today / Next** list, not a pile of status tabs. Show current work first if a timer/task is active; then overdue, due today, blocked/waiting that needs the user, correction work and upcoming. The order reflects an existing valid priority/date/attention basis, not guessed urgency.

Proposed page structure:

1. **Now**: current task/time context and next permitted action, if available.
2. **Needs me**: overdue, due, correction/returned, review assigned, decision if capable, blocked/waiting with a clear reason/next actor.
3. **Upcoming**: short horizon, grouped by day/week with committed date distinguished from target date.
4. **Recently completed**: collapsed, optional when useful for resuming context.

Use one continuous grouped list with optional compact status filters (“All”, “Due”, “Waiting/blocked”, “Corrections & reviews”) only if current read contract supports them. Provide search/filter within the supported task scope. Keep sort controls secondary; default to urgency + due date with stable tie-breakers. Every row shows task name, project, stage/milestone where known, status, target/committed date label, owner/collaboration relationship, priority and next action. A task hierarchy shows parent/subtask relationship if persisted; do not flatten it into misleading duplicate work.

Current `/my-work` combines ApprovalQueue + MyWorkAttention + personal-only TaskWorkspace. The task API/source has separate task scopes; do not claim a unified complete worklist until current service response scope is verified. Owner without employee identity receives explicit empty personal work and a path to authorized Tasks, not organization tasks mislabeled as personal. Time logging belongs on task context and own Time history remains accessible through My Work/People.

## K. Project Workspace architecture

Candidate structure accepted with refinement: **Overview / Plan & Tasks / Documents / Reviews / Delivery / Activity**. This is recommended because it maps project lifecycle and exact evidence without exposing all modules globally.

**Overview hierarchy:** project name/code; Design or Turnkey type; lifecycle status and hold/cancellation banner; owning branch and lead; current stage and milestone; active/next task; blocker/review/client dependency; important dates; responsible people; source-backed project health and coverage; next required action. State labels distinguish project lifecycle, task, review, client approval, issue, site verification, closure and handover.

**Plan & Tasks:** stages/milestones as the organizing spine; list of current/relevant tasks; date basis; dependency and Waiting reason; open task detail. Avoid presenting task board as a substitute for the stage plan.

**Documents:** project folders/files and upload progress; drawing register and exact revision history; formal transmittals/acknowledgements; gallery/publication only if applicable. A document's current/approved/issued state is explicit; do not infer from upload completion.

**Reviews:** internal task-bound round/version, exact evidence viewer, feedback/correction, resubmission; separate Client review package/item and Primary final approval. Separate queues/filters may be needed, but authority labels stay explicit.

**Delivery:** show Turnkey and Site only for applicable project. Turnkey carries released design/BOQ, cost/procurement decisions, materials/factory status. Site carries capture, packages, daily report confirmation, snags, independent verification, management closure, handover. Keep online/offline state explicit; S22 offline commands remain bounded.

**Activity:** readable authorized project history; system/audit data remains under Manage/Audit.

## L. Task UX

### Create hierarchy

**Essential during creation:** task name; task type when required; project (optional only when genuinely supported); stage/milestone conditional on project; target date; owner only for actors permitted to assign (otherwise self-task); reason where the existing command requires it. Priority remains visible but defaults only to an existing approved default.

**Important but secondary:** description; collaborators and their estimated hours; tags; checklist; start date; task-level estimated hours; project/stage context. Show these as a clearly named “More details” section if this changes no required fields/behavior.

**Advanced / conditional:** dependencies and early start confirmation; committed date and extension; recurrence and timezone; reminder if supported for this object; review requirement/reviewer context; correction relationship/round; closeout scope; time entry; attachments via current document authority. Render only when current task type, status, capability and project support them.

**System / audit:** immutable history, version, exact correction/review identifiers, transition/assignment reasons, recurrence rule version, closeout approval snapshot, actor/timestamps. Read-only and collapsed under History/Details.

Current source-backed create fields include name, type, priority, target date, optional project/stage/milestone, description, tags, checklist, start date, estimated hours, collaborators/estimates, optional management assignment/owner, and reason. Task detail also exposes edit, status transition, Waiting/resume with reason/cause, owner reassign, committed date, extension requests/decisions, recurrence configure/pause/resume/history, closeout approval/revocation, dependencies/early-start warning, review link and task history. Not all of these are shown to all actors. Reviewer appointment is in Review workflow, not assumed to be a task-create field. Attachments use project document records; no task attachment storage capability is invented.

### Detail layout (PROPOSED)

Header: task title + state + project/stage breadcrumb + primary action. First block: owner/collaborators, due/committed dates, priority, next dependency and review/correction state. Then Work & dates, Plan context, Review/evidence, Collaboration, and History. One primary action follows current state: Start, Resume, Submit for review, Complete, or the permitted review/correction action. Other actions are secondary; reassignment, cancellation, closeout and destructive changes need clear reason/confirmation and remain capability-gated.

## M. Review Workspace

Keep a single review mental model, reached from Project > Reviews or exact task/review, with separate internal and client flows.

**Review detail order:** exact project/task/drawing and current stage; review type (internal/client); submitted file/revision label, checksum/version and submitter/time; current round/status; assigned reviewer/authority; exact visual evidence; unresolved comments/annotations; previous rounds read-only; correction task/status and assignee; next permitted action.

**State sequence:** Submission → internal review → annotation/feedback → approved OR correction required → linked correction task → resubmission/new immutable round → approval/further correction → client package/item review where required → Primary final package approval when applicable → formal issue/transmittal/acknowledgement. Do not collapse internal approval into client approval, item decisions into Primary batch approval, or an approved revision into issued delivery.

**Primary action rule:** reviewer with submitted work: “Begin review”; reviewing current round: “Record decision” (Approve / Request corrections), with required comment and exact evidence; assignee: “Open correction task”; submitter: “Resubmit exact updated revision.” Annotation is secondary to the selected evidence. Historical rounds are read-only. If evidence cannot load, is unsupported, denied or stale, disable decisions that require inspecting it and explain why. Mobile provides an evidence/feedback switch without losing selected revision, round or draft context; all controls have keyboard and touch alternatives.

## N. Decisions UX

Define a **Decision** as an existing persisted, typed request with a currently eligible actor and explicit command: shared management approval, owner decision/exception or supported cost/procurement approval. Client approval is an exact package/item flow in the client review context; internal drawing review is a Review action; site verification is not a generic approval. Do not invent “material decision” or stage approval unless an accepted workflow provides it.

**Dashboard:** urgency/count and a few actionable rows only.  
**Decisions workspace:** paginated eligible items with type, source object/project, requester, impact, exact evidence, version/freshness, reason, age/due and allowed next action; filters by actionable type/project/date only where supported. Open detail in owning context. Decisions are not a generic notification inbox; notification read state does not resolve a request. No generic bulk approval. If the request changed, expired or is no longer eligible, refresh and block the stale command.

**Dependency / possible API gap:** `/approvals/attention` is used by the queue component, but current route registration has no `/approvals` page even though the Dashboard link points there. Proposed Decisions requires the existing queue read contract plus exact detail/deep-link context; do not create backend or route behavior in this phase.

## O. Action hierarchy

| Class | Rule | Examples |
|---|---|---|
| Primary | One action that advances the current object's present state; only when current capability/state supports it | Start task; Begin review; Record current decision; Capture site report |
| Secondary | Useful reversible or supporting action | Refresh, filter, add comment, open documents |
| Contextual | Appears beside the exact object/evidence it affects | Add revision to drawing; acknowledge transmittal; change task date |
| Tertiary | Rare, history, export or navigation action | View audit/history, export, open older round |
| Administrative | Capability-filtered, usually Manage/contextual management area | Change policy, manage templates, configure automation, manage grant |
| Destructive/high impact | Separate, explicit, reasoned and confirmed; never a casual inline primary action | Cancel project, revoke access, withdraw/close, purge evidence, final approval/handover |

System identity, immutable version and audit timestamps are informational, not action controls. Disabled actions explain the missing prerequisite only if doing so does not disclose restricted data.

## P. Progressive disclosure plan

- Global nav: only five primary entries; group rare destinations inside More and preserve direct access to urgent work.
- Dashboard: show populated/urgent sections; collapse secondary project signal lists; move reports and configuration to their own contexts.
- My Work: grouped list; advanced filters only on request; completed/recent collapsed.
- Project: show Delivery options when applicable; Team & Access only to capable users; stage/task detail in Plan & Tasks.
- Task: creation essentials first; More details for supporting fields; state-specific advanced forms; history/system metadata collapsed.
- Review: current exact round first; prior rounds read-only; annotation controls appear only when viewer/evidence and capability are ready.
- Workforce: employee self-service separated from manager/policy/site setup/retention sections.
- Reports/automation: builder steps (data, filters, fields, grouping/chart, saved definition) progressively revealed; execution remains internal report generation/notices as accepted in S26.
- Mobile: one main content column; contextual full-page object detail; bottom actions for the one current task; More for secondary navigation. No hover-only or swipe-only action; focused dialogs preserve escape/back and focus return.

## Q. Critical user journeys

The table describes likely CURRENT friction based on code/navigation, not observed user behavior. No real-user baseline was collected. All navigation changes are PROPOSED.

| Journey | Current flow / friction | Proposed flow / nav changes | Cognitive load / owner decisions / expected benefit |
|---|---|---|---|
| J01 Start of day | Sign in → My Work; decisions and personal tasks are mixed; Dashboard separate | Sign in → Dashboard → attention item or My Work | Short orientation, clear difference between “what is happening” and “what I do”; Owner decision already settled (Dashboard home). |
| J02 Employee work | My Work → task; time is separate; submit/review route may require remembered module | Dashboard → My Work → exact task → work/time → submit in task/review context | One project/task context; preserve explicit time semantics; expected less route recall. |
| J03 Internal review | Global Internal reviews → task/review → exact round/evidence → approve/correction → correction task → resubmit | Project → Reviews or task link → exact review round → decision/correction → linked task → new round | Clear current version/next action; no new approval authority. |
| J04 Project management | Dashboard or Projects, then separate Task/Document/Review/Turnkey/Site routes and repeated project selection | Dashboard issue → Project Overview → Plan/Reviews/Delivery exact context | Stage and blocker remain visible while moving among sources; project status not inferred. |
| J05 Client review | Staff Client reviews route or separate client portal; package/item vs Primary approval requires distinction | Project → Reviews → Client review; client lands in own exact package/item portal and sees permitted action | Less module knowledge, stronger authority clarity; keep separate sessions. |
| J06 Turnkey/site | Global Turnkey/Site route → select project → long combined workflow | Dashboard → applicable Project → Delivery → Turnkey or Site; mobile Today capture first | Relevant project context; client-facing/cost authority stays gated. |
| J07 Owner attention | Workspace/queue and Dashboard across modules; no stable global decision destination | Dashboard → exception → exact project/task/review/decision → owner-authorized action | Attention directs without duplicating module; no unsupported universal metrics. |
| J08 Team Leader | Dashboard/Workforce/Tasks/Reviews split; navigation does not express scope | Dashboard → scoped project/team exception → exact context → permitted review/assignment/resolution | Role-relevant complexity, explicit scope; job title itself grants no rights. |

For every journey, evaluate completion, hesitation, wrong navigation, backtracking, missed state, misunderstood terminology, help requests and authority errors; fewer clicks alone is not success.

## R. Mobile UX architecture

**PROPOSED internal mobile primary bar:** Dashboard · My Work · Projects · Decisions · More. Five destinations fit the skill guidance for a compact primary navigation and reflect the Owner's home decision. More holds People, Insights, Manage and Account. Keep task/site/review current-context actions accessible from their object, and use permitted cross-project worklists under More only when the source can truthfully provide them.

- **Dashboard:** attention first, then Today/Next and project signals; no dashboard table requiring horizontal scroll.
- **My Work:** compact task cards with project/stage, state, due basis and primary action; one main vertical scroll.
- **Project:** project identity/stage/status remains visible; contextual tabs become a labeled section menu; delivery shows only applicable mode.
- **Task:** primary action reachable, dates and owner visible, optional fields/history lower; touch targets >=44pt/48dp, no gesture-only change.
- **Review:** exact evidence context maintained across evidence/feedback panes; annotation has non-gesture controls; decision remains disabled if evidence unavailable.
- **Site:** capture, image, report, snag and today's plan prioritized; distinguish saved locally from synchronized; conflict comparison and retry remain explicit; do not imply offline support for unsupported commands/time.
- **Approvals/notifications:** exact authority and source link; no swipe-to-approve. Push behavior is not assumed (R-058 push later).
- **Accessibility:** keyboard/screen-reader parity where applicable, visible focus, labels and state announcements, readable at large text, no focus under sticky bars, reduced motion, error next to field, safe back/cancel.

## S. Terminology recommendations

| Prefer / define consistently | Avoid or explain | Reason |
|---|---|---|
| Dashboard | Dashboard & reports as one home label | Reports are a separate job; Dashboard is attention/orientation. |
| My Work | Personal task list when it also contains reviews/corrections/attention | Names the user's operational workspace. |
| Decisions | Approval queue where request types vary | Use only for persisted actionable decisions; describe each typed action precisely. |
| Project Workspace / Delivery | Turnkey operations / Site delivery as peer destinations | Makes project context primary; keep terms in section names. |
| Stage / milestone | Phase where it could mean a different domain object | Preserve configured plan terminology and distinguish stage from milestone. |
| Target date / committed due date | Due date without basis | Existing model distinguishes operational target and explicit commitment. |
| Waiting / Blocked | Overloaded “pending” | Show who/what is awaited and next action when supported. Do not equate with review pending. |
| Request corrections / Correction task | Returned without explanation | Clearly separates decision from assigned fix work. |
| Current revision / approved / issued / acknowledged | “Final” or generic “done” | Distinct document/transmittal states have different evidence. |
| Client item decision / Primary final package approval | Client approval for both | Preserves authority distinction. |
| Site verified / management closed / handed over | Complete | Separate verifier, closure and handover outcomes. |
| Saved on this device / synchronized | Saved | Offline queue requires truthful storage/sync distinction. |
| Organization & Access | Admin, system, security in one bucket | User-level configuration and account security have distinct owners. |
| Report definition / generated report / frozen snapshot | Report | Distinguishes mutable setup from immutable output. |

Hide raw IDs/technical names in routine UI; show concise record references when users need them to identify exact evidence or support an action.

## T. Low-fidelity UX wireframes

```text
APP SHELL + DASHBOARD
+--------------------------------------------+
| Brand/context                    Account   |
+------------------+-------------------------+
| Dashboard        | Dashboard · date basis  |
| My Work          | Needs your attention    |
| Projects         | [source · project · due]|
| Decisions        | [source · next action]  |
| More             | Today / Next (short)    |
|                  | Projects needing action |
|                  | Open My Work / Projects |
+------------------+-------------------------+
Mobile: Dashboard | My Work | Projects | Decisions | More
```

```text
MY WORK
My Work · current user
[Now: active task / timer + next action]
Needs me
  Overdue / due today
  Correction / review
  Blocked or waiting (reason + next actor)
Upcoming (grouped by day; target vs committed)
Filters: All · Due · Waiting · Reviews/Corrections
[task: title | project / stage | owner | date | state]
Recent completed (collapsed)
```

```text
PROJECT WORKSPACE
Projects > Project name · Design/Turnkey · lifecycle
Branch | Lead | Current stage > milestone | due
Overview | Plan & Tasks | Documents | Reviews | Delivery | Activity
Overview: next required action + risk/blocker + people + deadlines
Delivery: [Turnkey when applicable] [Site when applicable]
Context actions for current project; Team & Access if capable
```

```text
TASK DETAIL / CREATE
Project > Stage > Task title                         [Primary action]
State | owner/collaborators | priority | target/committed date
Work & plan context
Review / correction / dependency (when relevant)
More details: description, tags, checklist, estimates, dates
State-specific action panel (wait / extension / recurrence etc.)
History (collapsed; immutable reasons and versions)
Create: essentials first → More details → Create task
```

```text
REVIEW WORKSPACE
Project > Reviews > Internal / Client
Task/drawing | exact revision/version | submitter | reviewer | state
Current round: [visual evidence viewer]
Unresolved comments / annotations
Decision: Approve OR Request corrections (one current action)
Correction task and status / resubmission link
Previous rounds (read-only) | History
Client package: item decisions separated from Primary final approval
```

These structural sketches intentionally specify no colors, typography, spacing system, component appearance, iconography, shadow, animation or visual brand direction.

## U. UX usability test plan

Run unassisted sessions with representative internal Owner, explicitly authorized leader/project lead, employee/collaborator, site/field user/verifier, client Primary/delegate and consultant/vendor as applicable. Use safe seeded data and consent; do not expose sensitive real project data. Include desktop and small mobile; site tasks include offline queue states only where supported.

Task prompts (do not tell the participant where to go):

1. Open the application and determine what needs your attention.
2. Find what you should work on next and explain why.
3. Find one overdue task and identify its project and date basis.
4. Find which project needs attention and identify its current stage and next milestone.
5. Find a drawing waiting for internal review and identify the exact revision.
6. Review the submission and request a correction; explain what happens next.
7. Find what is waiting for client approval and identify who can make the final package decision.
8. Find a blocked project and open the source of the blocker.
9. Create a site snag and attach required evidence using the supported flow.
10. Find organization security settings and distinguish them from personal session controls.
11. (External roles) Find the exact item you are permitted to review and state what authority you have.

For each task record task start/end and completion definition; completion/time; pauses/hesitation; wrong navigation/backtracking; missed/misread information; terminology confusion; unnecessary steps; help requests; abandonment; and any evidence/decision/permission error severity. Capture participant role (pseudonymized), device/viewport, fixture state and observed behavior separately from interpretation. Do not set percentage improvement targets until the baseline distribution and serious-error cases are reviewed with the Owner and representative users.

## V. UX dependency / possible API gap register

Planning only; revalidate against S23–S26 contracts before design freeze. No missing capability is implemented here.

| ID | UX need | Current limitation / possible API-data gap | Importance | Can UX proceed? |
|---|---|---|---|---|
| UXD-01 | Complete personal work across owned/collaborating tasks, reviews/corrections and actionable attention | Current `/my-work` composes separate queue/attention/task sources; verify each source scope, dedupe, completeness and pagination before claiming “all my work.” | High | Yes, with truthful source-group labels and explicit partial/unavailable states. |
| UXD-02 | Decisions global destination + exact eligible detail | Queue component calls `/approvals/attention`; `/approvals` route is not registered though Dashboard links there. Exact detail/deep-link may need route contract. | High | Yes for architecture; no route implementation or promise until separately authorized. |
| UXD-03 | Project-attention links with current source and action eligibility | S23 health / S24 dashboard read models require freshness, coverage, action actor and source identity. Verify exact deep links and partial-source states. | High | Yes, present source-specific summaries and drill only to existing paths. |
| UXD-04 | Unified Project Workspace linking tasks/docs/reviews/Turnkey/site | Existing capabilities are separate route components and picker/read models; project-context routing and preserving selection/filters may need presentation/route work, not new business APIs. | High | Yes, at IA level; keep current route behavior until approved. |
| UXD-05 | Unified personal time action on current task | Time exists as a separate workspace; verify task-context start/log route and whether it already uses exact task/project/date. | Medium | Yes; link to current Time workspace until capability is verified. |
| UXD-06 | Global document/project search | Existing UI is project-scoped; no reviewed global index/current-grant/Confidential filtering contract assumed. | Medium | Yes, retain authorized project picker and per-project search/list. |
| UXD-07 | Complete review history/queue | Verify current accepted REV query scope, pagination, total and all current states; old master gap register described a capped active inbox at S22. | High | Yes, truthfully label actionable inbox vs history. |
| UXD-08 | Actionable dashboard attention aggregation | Verify S24 source freshness/completeness, ID deduplication, chronology and current actor capability across task/review/decision/site/project. | High | Yes, keep source sections distinct and disclose unavailable sources. |
| UXD-09 | Task form hierarchy includes reviewer, attachment, reminder, checklist/dependencies/correction context | Some items exist in other object workflows or may not be supported on every task. Do not move capabilities across ownership boundaries by assumption. | Medium | Yes; show only fields supported by current task type and action contract. |
| UXD-10 | Rich visual evidence annotation/comparison | Current review supports exact-file visual evidence/point annotations/markup references per accepted scope; rectangles or side-by-side revision comparison are not assumed. | Medium | Yes with current supported viewer and safe fallback; advanced comparison is out of scope. |
| UXD-11 | Mobile offline behavior | S22 supports bounded site capture only; time, approval and other commands are not generally offline. | High | Yes, explicitly mark supported commands and sync states; do not imply universal offline. |
| UXD-12 | Report and automation findability | S24 fixed reports/snapshots and S26 custom report definitions/automation accepted; reconcile exact current UI and permissions. | Medium | Yes; separate Reports in Insights from rule/run administration in Manage. |
| UXD-13 | Final current screen evidence for S23–S26 | Master evidence register is S22-only; current working-tree screen routes have not all been freshly inspected visually. | High | UX architecture can proceed as code-backed; Gate B and freeze should wait for refreshed accepted captures. |
| UXD-14 | S18 skills/training nav and metrics | S18 excluded/conflict unresolved; no accepted current source or metric. | Low for current UX | Yes by omitting active navigation and metrics; keep conditional future slot only. |
| UXD-15 | S27 AI/recommendation UI | S27 deferred pending real-project R-104/R-105, no source/schema/migration implemented. | Out of current scope | No S27 assumptions; this UX package does not authorize S27. |

## W. Owner decisions

No unresolved product decision is required to deliver this proposed architecture. The following are requested for review, not prerequisites to this package:

1. Approve, revise or reject the five-item internal primary navigation: Dashboard, My Work, Projects, Decisions, More.
2. Confirm Documents should be entered primarily through Project Workspace, with an optional authorized picker in More.
3. Confirm Decisions is a focused view of existing eligible persisted requests and does not absorb internal drawing reviews, client review decisions or site verification.
4. Confirm the proposed Project Workspace sections and conditional Delivery area.
5. Confirm Dashboard's attention-first content priority while keeping full work details in My Work.

The next process remains Owner review → UX corrections → explicit UX approval/freeze → Gate B visual design → representative high-fidelity prototypes → Owner approval → separate implementation authorization. S27 remains deferred pending the actual operational checkpoint. This document does not authorize T01–T08, UI redesign, routes or implementation.


## Owner validation correction — global Tasks, 7 October 2026

The Owner identified global Tasks as an essential missing destination. This supersedes the earlier candidate that relied on My Work and project-specific Tasks alone. The low-fidelity prototype now exposes desktop Work → Tasks and visible mobile Work entry points. Tasks owns the cross-project authorized directory, All accessible tasks, Created by me, Assigned to me, Collaborating and creation. My Work prioritizes personal/shared work; project Tasks filters the same records. Creator and current owner remain distinct. Created by me is a newly requested prototype filter; production stores creator identity but its current query interface has no creator filter. No backend or production navigation changes are authorized by this prototype correction. Mobile primary navigation remains provisional; validate Tasks prominence before freezing IA.


## Owner Dashboard / widget requirement — 7 October 2026

Dashboard is an interactive attention, orientation and action-routing layer: See → Understand → Open/Act → Resolve → Dashboard Updates. Every count drills into its matching scope, and known items route to exact canonical records. Contextual Back restores selection, filters, tab and position without restoring stale work state. Source actions update derived task/review/client/decision/site summaries. Review and Decisions remain distinct; high-consequence actions require evidence context. Expandable Dashboard widgets and embedded typed source action panels replace generic blocking dialogs. Safe inline recipient-notification read and UI filters remain separate from domain decisions. Loading/unavailable/stale/restricted section states never treat unknown as zero.

The mandatory per-element interaction matrix, source/capability mapping, empty/error states, API dependencies and actual artifact checks are in [UX_DASHBOARD_INTERACTION_MATRIX_2026-10-07.md](UX_DASHBOARD_INTERACTION_MATRIX_2026-10-07.md). This amendment supersedes prior passive Dashboard/dialog descriptions. It does not authorize production implementation or freeze UX.


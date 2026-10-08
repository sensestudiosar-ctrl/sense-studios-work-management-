> Current revision: [Refero-informed validation package](UX_REFERO_REVISION_PACKAGE_2026-10-07.md) and [capability-to-home map](UX_CAPABILITY_HOME_MAP_2026-10-07.md) supersede earlier layout descriptions. The current connected prototype uses condensed Dashboard sections and disclosed secondary widgets. S18 and bounded S27 are IN PROGRESS under current Owner direction; historical exclusion wording below is superseded. Current artifact checks are recorded in UX_REFERO_REVISION_CHECK_2026-10-07.cjs; earlier checks are historical.

# Interactive Dashboard and contextual widgets — Owner validation

**7 October 2026 · provisional UX only.** Implements the Owner's supplied requirement as architecture and low-fidelity representation. No production implementation, visual direction, backend/business-rule/permission change or UX freeze.

[Prototype](UX_VALIDATION_LOW_FIDELITY_2026-10-07.html) · [Artifact interaction check](UX_DASHBOARD_CHECK_2026-10-07.cjs)

## Core architecture

**See → Understand → Open/Act → Resolve → Dashboard updates.** Dashboard is an attention, orientation and routing layer over canonical objects. It creates no separate Dashboard task, review, decision, snag or approval record. Its rows/counts are projections of the same sample task/review state, request records, client package, site attempts, plan items, workforce allocations and recipient notifications used in the underlying representations.

Counts route with their matching predicate. Known objects open exact context with identifiers, selected project and relevant tab. Contextual Back restores the previous route, task/review selection, tab, list filters, display mode, actor/scope and scroll position; it does not restore obsolete domain state or undo completed actions. Changing sample role clears the navigation stack. Browser hash is a location label, not a production deep-link contract.

**Overdue semantics:** committed date takes precedence when present, otherwise target date, consistent with the current S24 read model. RCP target 6 Oct / committed 8 Oct is separately identified as target-slipped, not canonically overdue on 7 Oct. A second Azure task has target 5 Oct / committed 6 Oct to demonstrate a genuine overdue drill-down. No business calculation changed.

## Mandatory element matrix

| Dashboard element | Source of data | Who can see it | What happens when clicked | Can action occur inline? | Canonical destination | What happens after action | Empty state | Error / partial state |
|---|---|---|---|---|---|---|---|---|
| Overdue / waiting / target-slip counts | Accessible tasks; active state; committed-or-target date; Waiting state | Owner/authorized management; Employee personal/shared; Site User assigned project | Tasks already filtered by the exact predicate; each row opens task ID | Filters/open/expand only | Tasks → exact Task Detail | Completion removes active/overdue row; same task changes in My Work/project Tasks | Verified 0 is clickable and opens empty matching list | Loading/unavailable count is unknown, never 0 |
| Correction attention | Exact review drawing/revision/round plus linked correction task ID | Accessible project/assigned work | Exact linked correction task; optional source review | Expand/open only | Correction Task ↔ exact Review | Resubmission changes required actor and exact revision; correction count falls until further correction | No correction pending | Failed review source removes unknown projection while tasks remain usable |
| My Work today | Current primary-owned/collaborator active tasks; short first two | Current person within existing sample scope | Exact task, or full My Work | Open only; supported timer through linked Time | My Work / Task / linked Time | State changes update personal work and Dashboard | No current assigned/shared work | Section loading/unavailable independently |
| Projects needing attention | Authorized projects + canonical task/review/request/client/site exceptions | Authorized project scope only | Project with relevant Tasks/Reviews/Delivery tab; count opens attention-filtered Projects | Open/expand only | Exact Project Workspace | Source resolution recomputes reasons; project leaves list when all verified reasons clear | No projects with verified attention reasons | Dependent-source uncertainty must not be presented as “healthy”; see dependency note below |
| Reviews waiting for me / internal in scope | Exact review state Submitted/Resubmitted/In review, named reviewer | Own assigned review or permitted broader oversight | Matching Review list → exact drawing/revision/round | No drawing approval inline | Review Workspace + evidence/comments | Approval removes waiting record; task completion and drawing issue remain separate | No matching waiting reviews | Loading/unavailable/stale notice; unknown count omitted; stale marked 9:10 AM |
| Corrections pending review count | Reviews with Corrections required + source task | Accessible scope | Filtered correction review list with linked task | No correction decision inline | Review / Correction Task | New immutable R2/R3 moves to reviewer work; prior rounds retained | No matching corrections | Review source state applies |
| Waiting for client | Exact CP-03 / L-101 R2 package state and grants | Permitted staff status; isolated granted client session | Exact package evidence/status; client opens granted consent workflow | No client final consent inline | Client package / Client Portal | Primary final package approval updates package state and waiting count; internal/task actions separate | No waiting granted packages | Unknown/unavailable client source should omit count; no internal totals exposed |
| Eligible Decisions | Typed request ID, owning domain, pending state, designated approver, expiry | Current eligible actor only | Exact request evidence and source history, not generic module | No important decision inline | COST-042 / PROC-042, SC-018, EXT-019, LV-013, REC-007 owning workflow | Approval/rejection removes request from pending; cost does not approve procurement; recommendation does not mutate domain | No pending request designates this actor | Unknown source count omitted; expired/revoked capability must disable action |
| Team / Workload | Employee ID + dated allocation/leave impact evidence; explicit schedules | Owner / authorized Team Leader | Workforce focused on exact employee/period | Inspect only; allocation changes in source panel | Workforce → employee / period | Source allocations would reproject issue; prototype does not calculate new capacity | No verified workload issues | Restricted section exposes no employee identity or count; no invented policy score |
| Site Today / workers / open snags / verification | Palm WP-04, DR-006 manpower rows, S-014 repair/verification attempts | Relevant Owner/manager/site assignment | Exact work package/report or snag evidence | No verification or handover inline | Project Delivery → Site / S-014 | Fail/pass/management closure updates site, task and Dashboard; separate handover/client acceptance | Verified 0 open/pending remains a source drill-down | Independent source loading/unavailable; unknown worker count is not 0 |
| Upcoming | Named plan item ID/project/date/state | Authorized projects | Project Plan focused on exact milestone (MS-AZ-DD, MS-CD-FREEZE, MS-PC-BATH) | No gate completion inline | Project → Plan → exact milestone | Source milestone completion removes upcoming record | No upcoming milestones | Unknown Plan source must not imply no deadlines |
| Project stages | Authorized project current stage | Current accessible project scope | Projects filtered to clicked stage in Card/List | Filter only | Projects → stage-filtered directory | Stage changes should move counts, retaining scope | Verified zero if stage offered with no records | Loading/unavailable source means unknown count |
| Recipient notification | Actual notice ID/recipient/read status | Exact recipient | Exact linked request/task | Mark recipient notice read; never arbitrary attention acknowledgement | Canonical inbox + exact source | Inbox read flag updates Dashboard; domain work remains unresolved | No unread own notices | Notification source isolated; read action cannot conceal work or mandatory policy |
| Scope / details widgets | Existing authorized sample scope and projections | Own available scope options | Reproject authorized sections or expand details | Yes, UI-only | Dashboard projection | Same canonical data, different permitted view | No matching work for scope | Scope changes do not bypass authorization |

## Contextual action widgets

The Owner explicitly requested both Dashboard widgets and contextual action panels. Dashboard sections now expand/collapse and offer counts, drill-downs and safe controls. Generic blocking dialogs were replaced with **embedded source panels** that keep the record/evidence page visible. Cancel/Escape closes the panel and restores its opening scroll position.

Panels use relevant widgets: named selects, date/time/number inputs, current-state evidence, advanced sections, exact-item read-only fields, local file selection feedback, and retained history. Task panels show owner/status/date/dependency/recurrence; review/client panels show exact revision/round/page/category/markup; site panels show responsible/verifier/attempt; workforce shows employee/dates/allocation; time shows task/stage and a single-running sample timer. High-consequence actions remain in their full evidence source context.

Local file selection does not upload/finalize a file. Passkey/signature widgets do not collect credentials or perform consent. General panel submit records a walkthrough note; only explicitly implemented sample state transitions update canonical sample records. Supporting panels remain representations rather than complete business-rule implementations.

## Loading, isolation and performance dependency

The prototype includes initial loading, Reviews-only loading, failed Reviews with other usable sections, stale Reviews and restricted workforce scenarios. Unknown values are labelled unknown and have no numerical drill-down. Recheck restores the available sample read model. Empty counts are only shown for verified sample data.

Production UX/API dependencies to resolve separately:

- Existing S24 aggregates route some rows to generic module URLs. Exact task/revision/round/request/employee/plan-item/site-object deep-link contracts and authorization-aware count-list predicates need an implementation review after UX acceptance.
- Source projections need per-section loading/failure/last-refresh capability and completeness metadata. Project risk spans task/review/client/site sources; production must mark incomplete reasons when a dependent source fails. Prototype scenarios illustrate section isolation, not a real asynchronous aggregator.
- Loading priority: shell → critical attention → current personal work → project attention → secondary reviews/decisions/workload/site/upcoming. Reuse accepted read models; do not fetch entire modules to count them. New aggregation is a recorded API dependency, not an authorized backend change.
- Scroll/filter return restoration and browser history/deep-link reload behavior need a route contract. The prototype provides its own contextual Back stack; it does not prove production browser navigation or persistence.

## Owner validation findings

| UX issue | Current/proposed solution | Screen | Why | Owner decision needed? |
|---|---|---|---|---|
| Passive counts and generic destinations | Clickable matching counts and exact source links | Dashboard | Avoid searching again for known work | Validate hierarchy and count labels |
| Conflicting Dashboard state | Canonical projections after source actions | Dashboard / source | One task/review/request record | No new business rule |
| Context lost after nested navigation | Contextual Back restores frame without rolling back work | All connected screens | Preserve project, filters, tab and position | Trial usability |
| Blocking generic dialogs | Embedded typed action panels with source evidence visible | Source workflows | Keep decision context understandable | Validate panel location and essential fields |
| Review and Decision mixed together | Separate sections and evidence routes | Dashboard | Different actors/evidence/states | Confirm findability |
| Timer could be unsafe inline | Route through linked Time; prototype enforces one running timer | My Work today / Task Time | Exact actor/task context before tracking | Evaluate future inline start/resume separately |
| Too many expanded sections | Expand/collapse widget sections; concise summaries | Dashboard | Progressive disclosure with discoverable routes | Choose initial expansion through usage trials |

## Actual artifact checks

`UX_DASHBOARD_CHECK_2026-10-07.cjs` passed count drill-downs, exact-object routes, contextual Back, decision/notification updates, task/review/snag/client updates, independent section states, sample role scope, embedded panels and 390px width; zero page errors. Node 24.19.0 / existing Playwright cache. This is automated prototype evidence, not participant UX validation or server authorization testing.

Stop at Owner review. S18 excluded; S27 deferred. No Gate B, production UI/backend/schema/permissions/business-rule edits or T01–T08.


### Top notification bell — Owner request

The internal header now shows a notification bell with the canonical recipient unread count. Its expandable inbox opens exact linked tasks/requests, permits marking own notices read, and links to full inbox/preferences. Read status updates header and Dashboard together; domain work remains unresolved until its canonical action. Sample external sessions do not inherit the internal inbox. This is notification data, not a duplicate global attention record or a claim of real delivery.


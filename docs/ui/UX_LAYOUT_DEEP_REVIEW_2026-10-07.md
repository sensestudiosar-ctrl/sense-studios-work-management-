# Sense Studios — deep layout review

**7 October 2026 · provisional low-fidelity UX review.**

[Current prototype](UX_VALIDATION_LOW_FIDELITY_2026-10-07.html) · [Captured screens](layout-audit-2026-10-07/observations.json)

## Conclusion

The prototype now has broad capability coverage and useful canonical links, but its layout still recreates part of the Owner's original problem: **“Options and actions are all over the place.”** Features have been added as extra buttons, cards and groups without a final pass on hierarchy. Adding more styling would not solve this.

The strongest direction is: persistent work navigation; one page toolbar; compact scope/filter controls; a clear current object; one primary action; advanced management disclosed in its proper context. Preserve every developed capability and the requested List/Cards/Kanban/Timeline modes. Reduce simultaneous choices and duplicated entry controls, not feature coverage.

This review documents improvements. It does **not** apply a new layout, freeze UX, begin visual design or authorize production edits.

## Evidence and method

Used the Refero audit method with the existing Owner brief and captured prototype as the primary references, plus its bundled `craft-details.md` guidance on forms, focus and touch controls. No live Refero tools were available. This audit did not choose colors, typography, branding or a visual style. Exact GPT-6.1 Sol independently reviewed current source/context and navigation/authority implications.

Screens captured at **1440 × 900 desktop** and **390 × 844 mobile** using installed Playwright Chromium. Screens were visually inspected; heights/button counts are browser measurements. This is an expert layout inspection, not participant usability evidence or production permission validation.

| Desktop screen | Full document height | Buttons in page content | Observation |
|---|---:|---:|---|
| Settings | 1,344px | 11 | Seven peer groups plus the full app navigation compete for orientation. |
| Dashboard | 4,481px | 42 | Almost five viewport heights; important sections are far apart. |
| Tasks List | 1,476px | 19 | First task row is below the initial 900px viewport; repeated controls consume the top. |
| Tasks Kanban | 1,875px | 19 | Board begins very low; four columns visible with two further columns off-screen. |
| Cedar Project Tasks | 1,344px | 11 | Task configuration is offered before selecting an exact task. |
| Cedar Review | 1,344px | 7 | Exact identity is clear, but evidence is a small text block and unrelated feature cards remain below it. |
| Time | 1,344px | 12 | Timer, entry corrections and accounting export receive similar emphasis. |

Document height includes the sidebar: a 1,344px page is not proof the main content itself needs that height. Full-page mobile screenshots place the fixed bottom navigation at the first viewport boundary; that does not mean it remains across the middle of content while scrolling.

## Findings and recommendations

Priority: **P1** impairs a core journey or creates wrong context; **P2** adds avoidable friction; **P3** improves consistency. “Decision” means UX placement review, not a new business policy.

| ID / priority | UX issue and evidence | Recommended layout / interaction change | Screen | Why | Owner decision needed? |
|---|---|---|---|---|---|
| L01 / P1 | Reviews has no desktop Work or mobile More entry, although its queue exists. Owner already asked where Reviews is. | Add a persistent **Reviews** queue entry beside Tasks/Projects/Decisions. Keep project Reviews and exact-review shortcuts. Separate assigned reviews, corrections and client-waiting views within that queue. | Navigation | Cross-project review work needs a predictable home. | Confirm persistent Reviews placement. |
| L02 / P1 | Work navigation appears in sidebar, content prefix, Dashboard shortcuts and Tasks toolbar. Tasks has two Create task controls. | One page header with title, scope and primary Create task; keep global navigation once. Remove repeated My Work/Tasks/Create strips on desktop. Mobile gets one consistent contextual entry pattern. | Shell / Tasks / Dashboard | Extra navigation consumes space and feels like competing homes. | No feature change; validate single placement. |
| L03 / P1 | Dashboard is 4,481px tall, with all ten widgets expanded and 42 content buttons. Decisions appear in both Attention and Decisions; the same request also has a notification. | Top: highest-priority exceptions and short personal next work. Next: project attention and concise Reviews/Decisions summaries. Workload/Site appear by role. Upcoming/stages start compact. Repeated source references remain shortcuts, not repeated full rows. | Dashboard | Preserve connected widgets while making the next action visible without scanning the full page. | Decide default expanded sections after a role-specific trial. |
| L04 / P1 | Task List first records appear below the fold; mobile scope, filters and modes consume over a viewport before records. | Title + one Create action; scope tabs; one compact filter/view toolbar; active-filter chips with Clear. On mobile show search and current view, with remaining filters in an expandable panel. | Tasks | Users should see work soon after opening Tasks. | Validate default filter disclosure. |
| L05 / P1 | Mobile List has seven desktop columns in horizontal overflow. Open, creator and date columns can be off-screen. | Use a compact mobile row: title/state, project, owner/date, visible Open; creator remains accessible on expansion or Created-by-me view. Keep desktop table and explicit Cards mode. | Mobile Tasks | Core actions should not require horizontal discovery. | Validate essential mobile fields. |
| L06 / P1 | Supporting workflow pages render every permitted action as an equal button wall. Time shows timer, manual entry, locks, corrections and accounting export together. | Separate daily action panel, secondary controls and management/advanced sections. Time: current timer first; entry list/manual log next; corrections/approval on selected entry; accounting export under Owner administration. | Time / Workforce / Documents / other workflows | Retain capability while showing which action applies now. | Confirm grouping with users performing each workflow. |
| L07 / P1 | Project Tasks includes Task advanced actions without choosing a task; Time also inherits the last global `taskId`. This can show a different project's task. | List pages offer list/create/filter actions only. Task actions require explicit selected task identity. Global Time starts with a context selector or existing running timer; entry from Task preselects that task. | Project Tasks / Time | Prevent stale context and the wrong object being edited. | No new rule; fix representation context. |
| L08 / P1 | Review evidence is a short placeholder, while feature cards below it include Azure client context even on Cedar. | Dominant exact-evidence region with revision/round/status pinned above; comments/current action beside it on desktop. Mobile: evidence → comments → decision. Move planning/access administration into secondary sections with selected-project content. | Review | Decision evidence should dominate; another project's context is distracting. | Validate evidence/comment split, not visual styling. |
| L09 / P1 | Settings repeats Organization, Templates, Integrations, Automation and Account destinations from the sidebar. “Authorized tools” is vague. | Settings owns **configuration** entries. Operational workspaces retain their daily destinations. Settings tiles name the setting, scope and current state; avoid dumping whole feature modules. Rename ambiguous categories. | Settings / sidebar | One configuration home; shortcuts may link there without competing controls. | Decide configuration-versus-work boundaries. |
| L10 / P1 | Settings has seven wide category buttons wrapping on mobile. Changing category has no stable subnavigation layout. | Desktop Settings category rail + content. Mobile category selector/list with breadcrumb to current category. Consolidate notifications and quiet hours into one preference section; preserve reminder distinction. | Settings | Reduce category scanning and horizontal button wrapping. | Confirm grouping; do not merge policy with personal controls. |
| L11 / P1 | Action widget appended after the full source screen; Time panel follows a button wall and history. Starting timer panel also asks for manual-entry minutes and generic validation notes. | Mount the action panel beside or immediately below its originating object/action group. Show fields for the chosen action only. Use a compact current-timer widget for start/pause/stop; reason fields only when the workflow needs them. | Contextual panels | Interactive widget should reduce effort, not become a longer form. | Confirm preferred desktop panel placement; mobile inline below selected record. |
| L12 / P1 | Role visibility is partly simulated with role names; start controls may be shown even if sample actor cannot execute them. Review actor-switch button changes identity mid-journey. | Show required actor/capability and unavailable-action explanation beside the action. Put actor switching in a clearly separate prototype control. Never make it appear as a product approval bypass. | Tasks / Review / Site / settings | User must understand what they can do versus what someone else owes. | No permission changes; representation only. |
| L13 / P2 | Header controls float in the middle; role selector is as prominent as notification/settings utilities. On mobile header and prototype notice consume substantial space. | Header: app/context left; compact notifications/settings/account right. Move sample role switch, coverage and scenario controls into a clearly labelled validation tray. Keep a concise always-visible “Prototype” status. | App shell | Separate daily product use from validation mechanics. | Validate this presentation within low fidelity. |
| L14 / P2 | Full-width explanatory notice and implementation descriptions repeat on every page. | One short prototype banner; details in validation tray. Page copy describes work, state and next action. Keep slice IDs/source notes in coverage mode rather than everyday work cards. | All pages | Necessary audit material should not dominate user flows. | No product decision. |
| L15 / P2 | Desktop sidebar has 22 always-visible links, extending below 900px; scrolling content stretches sidebar height. | Keep frequent Work/People/Insights visible. Use expandable secondary Manage/Account groups or Settings links. Allow navigation to scroll independently; preserve current selection. Do not automatically hide all specialist work in More. | Desktop navigation | Predictability + low cognitive load, not minimum count. | Decide frequent Owner destinations through observed use. |
| L16 / P2 | Mobile primary bar lacks Tasks/Reviews; More is a flat destination dump despite Tasks being declared major. | Give Tasks/Reviews deliberate mobile prominence: evaluate Tasks replacing My Work in primary navigation with personal scope inside Tasks, versus retaining candidate five and a consistent Work switcher. Group More by People/Insights/Manage/Account. | Mobile navigation | Do not silently freeze the original candidate after new major requirements. | **Yes — compare these two navigation hypotheses.** |
| L17 / P2 | Kanban has empty columns first and later review/completed columns off-screen; cards repeat long prose. | Visible state selector/column count strip; concise cards with title, project, owner and date; expand details. Preserve empty columns but identify horizontal continuation. Mobile focuses one selected state at a time while keeping column navigation. | Kanban | Improve board scanning without hiding states or dropping card view. | Validate ordering/default state. Drag/drop remains a separate behavior decision. |
| L18 / P2 | Timeline is an ordered list headed by dates, rather than a temporal layout; dates sometimes stored as labels rather than full values. | Choose and label a low-fi **date-grouped view** now, or validate a true timeline with explicit start/target/committed dates and range controls. Do not imply schedule editing or dates that do not exist. | Tasks Timeline | Mode label should predict the representation. | **Yes — date grouping versus timeline scope.** |
| L19 / P2 | Card mode and list mode have no distinct field-priority strategy beyond layout; creator/owner/date text competes. | Card: title/state → project/stage → owner/next date; creator as secondary line. Created-by-me view keeps creator invariant and emphasizes current owner/state. List preserves comparable columns. | Task Cards/List | Modes should support different scanning jobs, not just rearrange prose. | Validate essential fields. |
| L20 / P2 | Notification panel is full-width before main content, shifting the page. It can remain open after following a source link. | Anchor a labelled notification region to the bell; bound its size and scroll; close on source navigation. Preserve inbox read state and exact link. Mobile can use a full-screen notification panel with clear Back. | Bell / inbox | Attention utilities should not disrupt the current page unexpectedly. | Confirm overlay versus inline preference. |
| L21 / P2 | Breadcrumbs expose route identifiers such as reviewQueue/decision; same-screen navigation adds redundant Back frames. Browser Back is not synchronized with internal frames. | Human-readable breadcrumbs, meaningful object labels, no same-route self frame. Unify browser and contextual history; retain selected Settings subgroup and focused item. | Navigation | Back should restore place predictably, not loop through repeated screens. | No new business behavior. |
| L22 / P2 | `?view=cards`/`?view=kanban` overrides the hash on every reload, so a later #projects or #settings route can reopen Tasks. | Apply display-view query only when destination is Tasks; persist view separately from route; support predictable reload. | Deep links | Current URL should describe the current destination. | No product decision. |
| L23 / P2 | Non-project tasks print a project name in some personal work views and supporting widgets. Team Leader descriptions can identify the wrong sample person. | Derive labels from canonical actor/task context; show Non-project consistently and use owner/collaborator/reviewer scopes explicitly. | My Work / Time / cards | Avoid misleading relationship or ownership cues. | No business rule change. |
| L24 / P2 | Submit button says “Record prototype step” for all actions; success is often represented as an appended text note, including some read-only actions. | Choose action-specific labels, separate preview/read from mutate, state what changed versus not persisted. Retain a demo flag outside the product wording. Show concise inline result and error near action. | Action panels | Users should predict the outcome and know whether work remains. | Validate phrasing and feedback. |
| L25 / P3 | Shared generic CSS makes checkbox inputs full-width blocks; selected styling applies broadly to all links/buttons for a route. | Treat checkboxes/radio groups as their own control layout, navigation selection only in its appropriate region, focus indication separately from selected state. | Forms / navigation | Improve recognizability and keyboard/touch use. | No visual direction needed. |
| L26 / P3 | Project Overview is attention plus broad management cards; Plan/Delivery contain generic workflow catalog cards rather than a first-level working view. | Overview: project status, next milestone, responsible person and ranked exceptions; management under Project settings. Plan: actual stages/milestones; Delivery: work package/procurement/site summary before advanced controls. | Project Workspace | Preserve requested sections while giving each a clear job. | Validate whether Delivery needs Turnkey/Site subtabs. |

## Proposed structural layout for the next validation revision

### Shared shell

```text
Header: Project/app context                    Notifications | Settings | Account
Sidebar: Work / People / Insights              Validation controls: separate tray
Page: Breadcrumb / contextual Back
      Title + short context                    One primary action
      Relevant scope/view/filter controls
      Canonical records or exact object/evidence
      Secondary / advanced / history
```

Persistent Work hypothesis: **Dashboard, My Work, Tasks, Reviews, Projects, Decisions**. This is a proposed placement revision, not frozen architecture. Preserve visible Owner People/Insights. Review management configuration in Settings separately from day-to-day review work.

### Dashboard

```text
Scope + last-known source state
Needs attention (ranked short list)   My next work (short, role-sensitive)
Projects needing attention           Reviews / Decisions summaries
Relevant Site today or Team workload
Upcoming / stage drill-down (compact)
```

Do not simply turn every current section into two columns: screen roles and length differ. First choose the main task per role. Owner personal empty state should not consume a large block; Employee focuses own work; Site User focuses today's package/evidence. Lower-priority sections remain expandable and clickable.

### Tasks

```text
Tasks                                         Create task
All accessible | Created by me | Assigned to me | Collaborating
Search | active filter chips                  List | Cards | Kanban | Timeline
Records start here
```

Desktop table remains comparable; mobile uses compact rows or selected card view with visible actions. Kanban and Cards both stay available. Changing display mode preserves the same scope, filters and canonical records.

### Settings

```text
Settings
Personal / security categories      Current category: labelled setting rows
Organization / policy categories    Scope + state + open/edit action
Authorized integration categories   Advanced / history when relevant
```

Settings should not become another feature directory. Personal versus organization and configuration versus operation are the primary boundaries. Project-specific grants/settings remain in their project. External identities retain separate portal security.

### Exact task / review / action widget

```text
Exact object + status + actor + due/context     Primary current action
Work/evidence region                          Comments / next step panel
Contextual action form with only needed inputs
Advanced settings                             Retained history
```

Review evidence needs a meaningful neutral viewer area, exact revision selector/history and page/markup placeholder; it does not need final imagery or styling to validate hierarchy.

## Source and status conflicts to retain explicitly

The replacing Owner instructions authorize S18 integration and bounded S27 implementation, with the actual-project prerequisite waived for that bounded implementation only. `IMPLEMENTATION_STATUS.md` records both **IN PROGRESS**. The prototype and historical UX register still say S18 excluded/S27 deferred; `CURRENT_STATE.md` opens with old deferred wording. Those claims need a current-status annotation before this package is treated as current coverage. Do not claim S18/S27 finished or that actual operational R-104/R-105 passed. This layout review does not undertake their implementation.

## Recommended work order

1. Correct source/context defects: unselected-task actions, wrong project cards, same-screen Back frames, query/hash behavior, Settings subgroup restoration and outdated scope annotations.
2. Establish navigation and one toolbar: explicit Reviews, preserve Tasks, consolidate repeated links and settle mobile hypothesis through Owner review.
3. Reduce vertical overhead: validation tray, compact Tasks controls, Settings rail/category selector and meaningful mobile records.
4. Rank Dashboard sections and shorten repeated object previews while retaining exact links and count predicates.
5. Replace action walls with current-step primary/secondary/advanced groups and action-specific embedded panels.
6. Validate unassisted journeys again: find creator-owned task; find assigned review; inspect exact R2; resolve correction; find employee workload; open settings and return to same subgroup; use mobile with filters; observe unchanged canonical authority.

No improvement requires choosing colors, fonts, branding, shadows or animation. Keep the next revision neutral and low fidelity.

## Owner review decisions

The major placement decisions are: persistent Reviews; mobile Tasks/Reviews prominence; Settings versus operational navigation; initial Dashboard expansion by role; true timeline versus date-grouped view; desktop evidence/action panel split. The remaining recommendations are consistency and context corrections within already requested behavior.

## Screens inspected

- [Desktop Settings](layout-audit-2026-10-07/settings.png)
- [Desktop Dashboard](layout-audit-2026-10-07/dashboard.png)
- [Tasks List](layout-audit-2026-10-07/tasks.png)
- [Tasks Kanban](layout-audit-2026-10-07/kanban.png)
- [Project Tasks](layout-audit-2026-10-07/project.png)
- [Exact Review](layout-audit-2026-10-07/review.png)
- [Time](layout-audit-2026-10-07/time.png)
- [Mobile Tasks](layout-audit-2026-10-07/mobile-tasks.png)
- [Mobile Settings](layout-audit-2026-10-07/mobile-settings.png)
- [Mobile Time action panel](layout-audit-2026-10-07/mobile-time-panel.png)

Actual audit routing: GPT-6.1 Sol for read-only project/context review; root for rendered inspection and report. No assertion about root serving model. No production code, backend, schema, migrations, rules or permissions changed; no new automated regression tests were run. Prototype itself remains unchanged by this audit.

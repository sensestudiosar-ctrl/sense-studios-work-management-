# Sense Studios — Refero research for UX validation

7 October 2026. Reference research for the current provisional low-fidelity prototype.

Refero is now responding through its live tools. This document maps inspected references to the [current layout review](UX_LAYOUT_DEEP_REVIEW_2026-10-07.md). It proposes the next UX validation revision; the prototype has not been edited in this research pass.

## Research brief

Designing connected desktop and mobile work journeys for the Sense Studios Owner, team leads, designers and site staff. The main goal is predictable placement of work and actions: “Options and actions are all over the place.” Research covers navigation, hierarchy, progressive disclosure, contextual actions and state visibility. The existing approved requirements remain the authority for business rules and access.

Use Refero **screens** to study the structure of individual pages and **flows** to study what happens before and after an action. A visual style search belongs to a later visual design phase. Reference screenshots are examples to investigate; their inclusion is not evidence that those designs will work for Sense Studios.

## Inspected reference map

The following five screen images were fetched and visually inspected. The task filtering flow was retrieved with its step descriptions. Searches alone were not used to justify layout choices.

| Reference | Observed pattern | Sense Studios adaptation | Current finding |
|---|---|---|---|
| [Linear task list](https://refero.design/pages/ab6ce0f5-7d32-4e4e-bdd4-d47a817c1d3e) | Compact top scope and filter controls; tasks immediately below; status action attached to a selected row. | One Tasks title/Create action, clear ownership scopes and one search/filter/view toolbar. Put records near the top. Keep List, Cards, Kanban and Timeline available. | L02, L04, L19 |
| [Wrike task details](https://refero.design/pages/3d3e2910-8459-4f1b-9209-d57cf29d27ed) | Task list remains visible beside selected task details; title, state, assignee and dates precede attachments/comments. | Desktop task panel preserves the originating list, filters and selected task. Put project/stage, owner, dates and required action first; reveal dependencies, corrections and history progressively. Mobile opens a full task screen with contextual Back. | L07, L11, L21 |
| [Hello Ivy file review](https://refero.design/pages/f81922ed-0520-4a99-a185-84a8bee91f2c) | File title, version selector and approval status stay in a top identity strip; evidence occupies the main area; comments sit beside it. | Review shows exact drawing/revision/round/reviewer/state together. Evidence gets the main working area; comments, correction context and current authorized action stay adjacent. Internal review and client approval retain distinct labels. | L08, L12 |
| [Kitchen.co Settings](https://refero.design/pages/aaa8ec62-50d2-4cfc-8548-c7aec4e3ee7c) | Dedicated Settings navigation with labelled groups; one selected category fills the content pane. | Group personal/security settings and authorized organization configuration. Distinguish configuration from operational destinations already in People/Insights/Manage. Preserve the selected group on Back; use a group selector on mobile. | L09, L10, L21 |
| [Marathon work overview](https://refero.design/pages/0ef30cb0-a2c5-4f08-bb9f-d87ae3093a4b) | Next, In Progress and Review work are separate visible groups; review controls are attached to their work cards. | Explore concise next-work and review summaries on Dashboard/My Work. Dashboard entries open their exact task or review context. Determine summaries by current role and state. | L03, L06 |
| [Hello Ivy task filtering flow](https://refero.design/flows/4473) | Open filters, select constraints, indicate active filters, close the panel and inspect updated work. | Expand secondary filters on demand, show active criteria and Clear, preserve criteria when opening a task or changing view. Use Sense Studios project/status/ownership fields already represented in the prototype. | L04, L05, L21 |

The review-flow search did not establish a complete equivalent of Sense Studios' correction/resubmission loop. Use the file-review reference for evidence placement only. Derive the loop and permissions from Sense Studios requirements. Refero descriptions include inferred behavior; inspect screenshots and the actual prototype before treating any inference as a supported interaction.

## Proposed structure to validate

Use Linear's compact work structure as the main navigation/list hypothesis. Borrow Wrike's retained worklist context, Hello Ivy's evidence placement and Kitchen.co's Settings grouping for those specific areas.

| Area | Next low-fidelity experiment | Required check |
|---|---|---|
| Navigation | Predictable Work destinations with a visible Reviews entry; keep frequent People and Insights groups. One shared header for notifications, Settings and account. | Owner can predict where all tasks, review work, people work and configuration belong. |
| Dashboard | Rank exceptions and next work first; concise project/review/decision summaries; expandable secondary widgets. The current capture is 4,481px tall with 42 content buttons. | Owner can identify the next action from the first viewport; each summary opens the exact source and reflects its updated state. |
| My Work | Personal work ordered by actionable state, with blocked/waiting work clearly distinguished. | A designer can tell what to work on now and what requires someone else. |
| Tasks | One Create task control; All accessible / Assigned to me / Created by me / Collaborating scopes; compact search, filters and view switch. | First work records are visible in the initial desktop viewport; changing List/Cards/Kanban/Timeline preserves scope and filters. |
| Projects | Keep simultaneous project Card/List modes. Inside a project, retain Overview, Plan, Tasks, Documents, Reviews, applicable Delivery and Activity as current candidates. | Each section has a distinct job. Project actions retain project context. Record any grouping problem before renaming sections. |
| Task detail/create | Essentials first; one state-appropriate primary action; reviewer/correction/dependency context visible when relevant; advanced configuration and history expandable. | The selected task identity is explicit. Create produces a discoverable task in its appropriate scope; Back restores the source. |
| Review | Identity strip + drawing evidence + comments/current decision. Correction links directly to its task and resubmission. | Revision, review round, actor and required action are clear through every transition. |
| Supporting workflows | Separate current daily work from selected-record actions and advanced management. For example, current timer, time entries, selected-entry correction, then authorized export. | A selected action always belongs to the visible record; advanced capability remains discoverable. |
| Settings/bell | Selected Settings group with labelled context; notification panel attached to the bell and closed after following its source. | Configuration has a clear home. Notifications do not shift or obscure the user's work unexpectedly. |
| Mobile | Compact work rows and expandable filters; full task/review screens with retained Back context. Compare the candidate Dashboard/My Work/Projects/Decisions/More with a variant that gives Tasks primary visibility. | Users can find all Tasks, Created by me, Create task and Reviews without hidden table columns. Treat both navigation variants as hypotheses. |

## Owner walkthrough for the next prototype

Run each scenario with the relevant sample role. Ask the participant to predict the destination before navigating. Record first choice, navigation steps, wrong turns, lost filters/context and whether they can explain the current state. No participant results have been collected in this research pass.

1. **Find today's work:** Dashboard → My Work → Azure reflected ceiling plan task. Identify owner, stage, due date and next action.
2. **Find work I created:** Tasks → Created by me → select task → return to the same filtered list. Change List → Cards → Kanban and check that the task set stays consistent.
3. **Create project work:** Cedar Project → Tasks → Create task. Confirm project/stage/owner/reviewer context and find the created task again.
4. **Complete the correction loop:** Cedar kitchen drawing review → inspect the exact revision → request correction as the authorized reviewer → correction task as its owner → resubmit → inspect the new review round → authorized review decision. Keep client approval identifiable as its own step when applicable.
5. **Find site context:** Palm Turnkey project → Delivery/Site → snag task → waiting/blocking context → relevant action.
6. **Handle an attention item:** Bell or Dashboard → exact review/decision → act → return. Explain what changed and what still requires action.
7. **Find configuration:** Top Settings → personal notification setting; Owner → organization configuration. Distinguish settings from operational People and Insights work.
8. **Repeat key journeys on mobile:** Find Tasks, Created by me, Create task, Reviews and the correction task. Compare the two navigation candidates using the same scenarios.

A proposal improves UX only if these journeys become easier to predict and complete while retaining capability and accurate context. Counts and layouts are design hypotheses until the Owner/user walkthrough provides evidence.

## Feature preservation and scope

Maintain a capability-to-home map alongside the [feature coverage inventory](UX_VALIDATION_FEATURE_COVERAGE_2026-10-07.md): capability, primary home, contextual shortcut, visible roles, required state and walkthrough. Multiple routes can refer to the same underlying task/review; they must preserve one identity and workflow. Consolidating repeated controls must not remove All Tasks, Created by me, Create task, project Card/List, task List/Cards/Kanban/Timeline, Reviews, notifications or Settings.

Current Owner direction records S18 and bounded S27 as IN PROGRESS. Any historical prototype exclusion labels need to be reconciled with that direction in a future coverage revision; this research does not claim either slice is accepted or operationally verified.

This pass used live Refero MCP search, screen-image retrieval and flow retrieval plus the existing exact GPT-6.1 Sol layout audit. It added this research document only. No production implementation, business-rule changes or user-validation claims are included.

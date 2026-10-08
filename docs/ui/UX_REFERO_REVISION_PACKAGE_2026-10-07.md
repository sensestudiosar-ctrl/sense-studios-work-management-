> 8 October revision: [S18/S27 and remaining gap package](UX_FRONTEND_GAP_REVISION_2026-10-08.md) supersedes earlier missing-destination and excluded-scope statements. Both slices remain IN PROGRESS.

# Sense Studios — Refero-informed UX validation package

> People follow-up: [Deeper People UX review](UX_PEOPLE_REFERO_REVIEW_2026-10-07.md) records the distinct Time, Workforce, Leave/WFH and Attendance structures and supersedes their earlier generic page layout. U01–U08 results below describe the earlier bounded revision; the follow-up report records its own review evidence.

**7 October 2026 · provisional low-fidelity UX · Owner review**

## A. Revised connected prototype

[Open the revised prototype](UX_VALIDATION_LOW_FIDELITY_2026-10-07.html#dashboard). It includes Dashboard, My Work, Tasks, Projects, Project Workspace, Task Detail/Create, Reviews, Review Workspace, Decisions, Settings and both mobile candidates.

Realistic sample work connects Azure Residence design/RCP, Cedar kitchen drawings and Palm Courtyard Turnkey/site work through canonical sample objects, owners, reviewers, stages, dates, milestones and correction rounds.

Sources: current Owner instructions; approved requirements R073/R074, R058–R060, R077, R018–R026, R011–R017, R027–R034 and R096/R097; [architecture](UX_ARCHITECTURE_PHASE_2026-10-07.md); [Refero research](UX_REFERO_RESEARCH_PLAN_2026-10-07.md); [layout audit](UX_LAYOUT_DEEP_REVIEW_2026-10-07.md). This package supersedes earlier layout descriptions where they conflict.

Production UI, backend, API, schema, permissions and business rules were not changed. UX remains provisional; Gate B has not begun. S18 and bounded S27 remain **IN PROGRESS** under current Owner direction. The S27 prerequisite waiver does not establish actual-project operational acceptance; this UX pass implements neither slice.

## B. Updated navigation map

| Group | Destinations | Disclosure |
|---|---|---|
| Work | Dashboard · My Work · Tasks · Projects · Reviews · Decisions | Visible |
| People | Time · Workforce | Visible operational destinations |
| Insights | Performance · Project Health · Reports | Visible operational destinations |
| Business | Existing CRM capabilities | Retained supporting work |
| Manage | Organization & Access · Templates · Integrations · Automation · Audit & Retention | Expandable; authorized sample roles |
| Account / Settings | Personal preferences · notifications · sessions · passkeys/recovery · sign out | Dedicated Settings groups |
| Header | Bell · Settings · validation controls | Sample actor/mobile selector disclosed |

Skills & Learning is not represented as an accepted completed capability.

**Project:** Overview → Plan → Tasks → Documents → Reviews → Delivery → Activity. Plan owns stages/milestones/gates/sequencing. Tasks owns actionable work, ownership, status and creation.

**Connected journeys:** Dashboard → My Work → Task; Dashboard → project/tab → Task; Dashboard/bell → exact review/decision; Project → Documents/Reviews/Delivery/Site; Review → correction Task → resubmission → new round.

## C. Dashboard refinement

| Priority | Revised content | Reduction |
|---|---|---|
| A — Needs your attention | Ranked overdue, review, correction, decision and site/blocker exceptions | Exact-source records first |
| B — What next / My Work | Current/next work and due/waiting summary | Full worklist in My Work |
| C — Projects needing action | Exception-bearing projects | Portfolio stays in Projects |
| D — Reviews / Decisions | Separate concise summaries | Counts open matching filtered work |
| E — Secondary | Workload, Site Today, Upcoming, stages and activity | Progressive disclosure |

Repeated navigation/action strips and simultaneous full-widget controls were condensed. Existing capabilities remain in their workspaces or disclosed sections.

At **1440 × 900**, Dashboard changed from **4,481px to 1,615px** tall. First attention action begins around **407px**; first Tasks record around **460px**. These measure visibility, not participant comprehension.

[Dashboard interaction matrix](UX_DASHBOARD_INTERACTION_MATRIX_2026-10-07.md) specifies source, sample roles, click destination, inline action, resolution, empty and error/partial states. Unknown/restricted sources never become verified zero. Reading a notification does not resolve its work.

## D. Tasks workspace

| Entry | Question | Object |
|---|---|---|
| My Work | What should I personally work on now? | Canonical task |
| Tasks | What accessible work can I manage/search? | Same task |
| Project → Tasks | What work belongs to this project? | Same task |

All accessible, Assigned to me, Created by me and Collaborating scopes share search, sort, expandable filters, active criteria and Clear. **List, Cards, Kanban and Timeline** retain the same matching task set.

Desktop retains the originating list beside task detail, including selection/scope/filters/sort/view and contextual Back. Mobile opens a full task screen with Back.

Detail order: title; project/stage; state; owner/collaborators; priority; target/committed date; required action. Description/checklist/estimates/dependencies/reminders/tags/review context/advanced settings/history are disclosed.

Cedar task creation retains project/stage/owner context. Reviewer context is read-only; creation does not invent reviewer assignment.

**Limitations:** Created by me uses retained sample creator identity; current production API has no creator-query filter. Timeline is explicitly date-grouped, not temporal schedule editing.

## E. Reviews workspace

Visible global Reviews provides cross-project waiting, my-review, correction-returned, resubmitted and relevant client state. Project Reviews filters the same canonical objects. Internal Review, Client Review, Decisions and Site Verification stay separate.

Reviews filters/scope/sort survive opening and contextual Back. A retained side-by-side worklist is implemented for tasks; it is not claimed for review details.

## F. Review workspace refinement

| Hierarchy | Representation |
|---|---|
| Identity | Project, drawing/file/task, exact revision, round, submitter, reviewer, state |
| Evidence | Largest working area; neutral drawing/page placeholder |
| Adjacent comments | Current feedback alongside evidence |
| Current action | Begin when submitted; authorized Approve or Request Correction in review |
| Correction | Linked task, owner, due date, state and resubmitted revision |
| History | Previous rounds and exact-revision comments read-only |

**R1 correction → R2 resubmission → review → correction → R3 resubmission → review → approval** is connected. Task completion, client approval and drawing issue remain separate. Placeholder evidence validates hierarchy, not real PDF annotation fidelity.

## G. Settings structure

| Personal / Account | Authorized Organization / Admin |
|---|---|
| Preferences / notifications | Organization / access |
| Sessions | Templates / integrations |
| Passkeys / recovery | Automation/rules |
| Sign out | Audit/retention |

Selected category survives action panels and Back. Operational Time/Workforce/Reports/Project Health stay outside Settings. Contextual panels use action-specific fields and labels.

## H. Mobile variant comparison

Use **Validation controls → mobile candidate** at a narrow viewport.

| Journey | A: Dashboard / My Work / Projects / Decisions / More | B: Dashboard / My Work / Tasks / Projects / More |
|---|---|---|
| Tasks / Created / Create | More → Tasks → shared scope/Create | Direct Tasks → shared scope/Create |
| Reviews / correction | More → Reviews → exact object | Same |
| Decisions | Direct | More → Decisions |
| Project / Site | Projects → Palm → Delivery → Site | Same |
| Settings | Header Settings or More | Same |
| Tradeoff to test | Frequent decision access | Frequent global task access |

Both pass connected artifact journeys at **390 × 844**, including Back and checked horizontal-overflow checks. No participant winner or freeze is claimed. Neither yet demonstrates a need for an alternative.

## I. Capability-to-home map

[Complete map](UX_CAPABILITY_HOME_MAP_2026-10-07.md) contains primary home, shortcuts, sample roles, canonical object, required state and journey.

Inventory retains **33 families and all 335 original action labels**. Runtime presence checks cover **37 role/family visits and 375 unique role-visible controls**. Presence is not execution of every command or production permission acceptance.

Preserved: task scopes/views/Create; project Card/List; Reviews; Notifications; Settings; Time; Workforce; Site; client review; Decisions; supporting modules. Shortcuts converge on canonical sample objects.

## J. Validation findings

| Issue | Reference/pattern | Change | Why | Still needs testing |
|---|---|---|---|---|
| Dashboard too long | Marathon; audit | Ranked attention, condensed/disclosed summaries | Early next action | Unprompted prioritization across roles |
| Missing task home | Linear | Visible Tasks, clear scopes | Predictable search | Scope vocabulary |
| Task loses originating list | Wrike | Desktop split; mobile contextual Back | Preserve work context | Participant switching behavior |
| Views lost in simplification | Linear; Hello Ivy filters | Four views, same records | Preserve capability | Scanning fields / Timeline expectation |
| Reviews hard to find | Hello Ivy | Global Reviews plus project queue | Predictable review home | Reviews versus Decisions understanding |
| Revision / next actor unclear | Hello Ivy placement; Sense rules | Identity/comments/correction/history | Explain next action | Real evidence usability |
| Settings mixes operations | Kitchen.co | Dedicated personal/admin groups | Configuration home | Category names/frequency |
| Filters/Back reset | Wrike; filtering flow | Retained scope/filter/sort/view/position | Avoid repeated search | Long-list/browser habits |
| Actions lack record context | Wrike | Selected object and contextual panels | Avoid stale task/project | Supporting domain walkthroughs |
| Mobile task/decision tradeoff | Owner A/B | Identical journeys in both | Comparable evidence | First-choice success / wrong turns |
| Read confused with resolution | Sense source workflow | Recipient read separate from domain | Remaining work stays visible | Explanation after action |
| Review approval confused with completion | Sense rules | Separate pending completion label | Preserve workflow | Explanation of remaining work |

### Remaining placement risks

- Create Task in Tasks/My Work/Project Tasks is one form/workflow with contextual shortcuts. Test whether users recognize this.
- Dashboard and bell review/decision entries route to source actions; they are not independent approval systems.
- Lower-frequency management commands remain behind disclosure; frequency evidence must identify any hidden too deeply.
- Time requires explicit task selection, avoiding inherited prior-task context.
- No missing capability home remains in the catalog audit. Supporting workflows need domain validation beyond U01–U08.

### Actual walkthrough evidence

| Scenario | Result |
|---|---|
| U01 | Dashboard → My Work → Azure RCP; owner/project/stage/date/action and Back retained |
| U02 | Created scope/search/sort retained; all four views preserve matching task IDs |
| U03 | Cedar project/stage/owner/read-only reviewer context; created task found again |
| U04 | Exact R1/R2/R3, correction handoffs, historical comments and separate completion |
| U05 | Palm Delivery → WP-04 / snag S-014; repair/waiting/verification context |
| U06 | Bell → cost decision 042 → action → Back; source updates; procurement separate |
| U07 | Personal preference, Security/session panel, authorized organization groups |
| U08 | Both candidates: Tasks/Created/Create/Reviews/correction/Projects/Site |

[Artifact check](UX_REFERO_REVISION_CHECK_2026-10-07.cjs) exited **0**; [results](refero-revision-2026-10-07/results.json) report no page errors. Further checks cover source partial/restricted states, project Card/List context, Reviews filter restoration and URL-view isolation. Old Dashboard-only checks were not rerun against this revision. People follow-up reran U01–U08; unique command labels are counted because contextual shortcuts share actions.

No participant sessions, production verification or operational acceptance are claimed.

## K. Owner decisions

| Decision | When | Basis |
|---|---|---|
| Desktop placement / Plan versus Tasks terminology | Owner/user validation feedback | Connected prototype |
| Mobile A versus B | After participant comparison | Task versus decision frequency, U08 |
| Created by me production query support | Before later implementation | Current API query limitation |
| True temporal Timeline versus date grouping | Before later implementation if needed | Disclosed representation limitation |

No new permission or business-rule decision was introduced.

## L. Readiness recommendation

**READY FOR UNASSISTED USER VALIDATION** for bounded U01–U08 navigation, discovery, context retention and sample state-transition journeys.

Walkthrough checks and independent final review pass. Drawing placeholders, in-memory actions, proposed creator filtering and date-grouped Timeline remain disclosed. Record first destination, wrong turns, hesitation, completion and users' explanation of revision/next actor/remaining work.

Actual routing: **GPT-6.1 Sol** context intake/final review; **GPT-6 Luna** bounded Dashboard revision and initial package draft; root integration, artifact checks and final package.

**STOP and return to Owner. UX is not frozen.**

### Refero evidence

[Linear](https://refero.design/pages/ab6ce0f5-7d32-4e4e-bdd4-d47a817c1d3e) · [Wrike](https://refero.design/pages/3d3e2910-8459-4f1b-9209-d57cf29d27ed) · [Hello Ivy review](https://refero.design/pages/f81922ed-0520-4a99-a185-84a8bee91f2c) · [Kitchen.co](https://refero.design/pages/aaa8ec62-50d2-4cfc-8548-c7aec4e3ee7c) · [Marathon](https://refero.design/pages/0ef30cb0-a2c5-4f08-bb9f-d87ae3093a4b) · [Hello Ivy filters](https://refero.design/flows/4473). Placement evidence only; Sense Studios requirements remain authoritative.

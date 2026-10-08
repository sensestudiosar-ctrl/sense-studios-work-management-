# Sense Studios — mobile UX revision

## Scope

Owner direction: desktop is accepted; improve mobile independently without losing capabilities. This is the connected low-fidelity validation prototype only. Desktop structure and canonical commands remain the baseline. No visual direction, production implementation, Gate B or UX freeze follows.

Exact GPT-6.1 Sol performed context intake and settled the handoff. GPT-6 Luna handles bounded mobile shell and object-layout changes. Root integrates and returns the package for Sol source review. Prototype role visibility illustrates fixture access; it is not authorization.

## Refero evidence and decision ledger

Live Refero MCP inspected mobile screen metadata and complete flow goals, actions and responses before implementation. The Asana task-list image was also inspected. These references supply placement and recovery patterns, never Sense Studios business rules.

| Mobile issue | Evidence | Adaptation | Boundary |
|---|---|---|---|
| Crowded worklist controls | [Asana mobile task list](https://refero.design/screens/5fcd6419-6b51-494f-98af-d52d9a5def5e) | Compact labeled view selector, visible create/search/filter; actual work remains early | Keep List, Cards, Kanban, Timeline and existing scope contracts |
| Scope selection loses meaning | [Linear mobile filtering flow 6628](https://refero.design/flows/6628) | Show selected scope, preserve query when selecting another scope, reuse existing handlers | No global search engine or new filter contract |
| Detail identity competes with advanced fields | [Asana mobile task detail](https://refero.design/screens/fef9d82b-7b23-4c92-b6ba-0dd51d57bbc2) | Exact task/project/stage/state/action before description/history; full-screen detail with contextual Back | Same canonical task and existing assignment/reviewer rules |
| Comments consume evidence space | [Dropbox mobile document commenting flow 2440](https://refero.design/flows/2440) | File/page identity stays with evidence; secondary history disclosed | Unresolved feedback and authorized correction/approval remain visible; no Dropbox workflow logic |
| Creation becomes a separate navigation puzzle | [Joi mobile create flow 4379](https://refero.design/flows/4379) | Keep create at the worklist and return to the originating context | Sense project/stage/owner inputs and read-only reviewer context remain; no automatic reviewer assignment; do not copy title-only creation |
| Settings resembles operational work | [Lumy mobile settings flow 6167](https://refero.design/flows/6167) | Dedicated category selector, current category/value visible and contextual return | No borrowed notification offsets or policy defaults |
| Selected directory record lies below a long list | Owner Project Health requirement + list/detail continuity | Selected project/report directory becomes a labeled disclosure above exact detail; direct switching retained | Health remains unavailable without computed snapshot; definitions/runs/snapshots remain distinct |

## Navigation candidate

Use B as the mobile working candidate: **Dashboard / My Work / Tasks / Projects / More**. A remains selectable in Validation controls: Dashboard / My Work / Projects / Decisions / More. This is a hypothesis for user validation, not a freeze.

More retains grouped Work, People, Insights, Business, Manage and Account homes where allowed. Reviews and Decisions remain explicit destinations, with additional exact-object routes from Dashboard, My Work and notifications. Create task stays contextual in Tasks and Project → Tasks. Settings and notification bell remain in the header.

Project sections remain **Overview / Plan / Tasks / Documents / Reviews / Delivery / Activity** through a compact selector. Plan and Tasks remain separate. Project Health continues to expose all accessible projects, then retains switching beside/above selected health evidence.

## Capability preservation

The existing capability-to-home map remains authoritative: **35 families / 352 action labels** in the prior inventory. Mobile changes replace crowded selectors with compact controls and disclose secondary content; they do not remove canonical commands. Inventory presence does not demonstrate that every action executes.

| Area | Preserved mobile paths |
|---|---|
| Tasks | All accessible, Assigned to me, Created by me, Collaborating; Create; List/Cards/Kanban/Timeline; same task detail and Back |
| Projects | Cards/List directory; all seven project sections; project-scoped create, documents, internal review, client review and Delivery/Site |
| Reviews/Decisions | Separate queues; exact revision/round, correction task, resubmission and actor handoff; distinct decision and site workflows |
| People | Time, Workforce, Leave, Attendance, Skills/Learning; dated records, allocations, requests and supported configuration/history |
| Insights | Performance, Project Health, Reports and Saved Reports; same evidence, six report fields, definition/version/run/snapshot and uncomputed-state distinctions |
| Other families | Grouped permitted More destinations, S18 learning and S27 human evidence assistance, operational Business and authorized Manage homes |
| Account | Notifications, Settings personal/admin categories, sessions, passkeys/recovery and existing sign-out representation |

## Owner walkthrough

1. Tasks → Created by me → Cards → Kanban → task → contextual Back. Same scope/query/view should remain.
2. Cedar → Tasks → Create → select stage/owner and inspect reviewer context → find the created task.
3. Reviews → Cedar A-201 exact revision/round → request correction → linked task → resubmit → new review round. Client approval stays separate.
4. Palm → Delivery → Site → S-014 snag → waiting/blocking context → authorized action.
5. Project Health → any accessible project → switch directly to another project without Back.
6. Saved Reports → selected definition/version → retained snapshot/run → change definition without losing identity.
7. People → timer, punch, leave request and allocation; distinguish operational action from configuration/history.
8. More → Reviews, Decisions, S18/S27 and every role-appropriate family; Settings → personal preferences versus authorized admin.
9. Repeat discovery using navigation A and B; choose based on findability, not item count.

## Validation status

Exact GPT-6.1 Sol reviewed the assembled source. Fixes from source review: replacement selectors were moved outside hidden control groups; Project toolbar search/clear/create remains visible; Project Tasks retains all four views; More includes S27 assistance and searches the contextual Palm Delivery/Site link; Project Health initially shows every accessible project; Saved Report draft selection is explicit; directory disclosures preserve expansion per role/context. CSS changes are guarded by the mobile breakpoint; canonical rendering is retained and the mobile enhancer returns immediately on desktop. No production files were changed by this pass.

Luna reported successful syntax and whitespace checks on its new helper files. No automated journey tests were requested or run for this mobile pass. The previously reported browser restriction on the local file remains; no alternate browser/hosting workaround is used. Rendered mobile, keyboard, scrolling and touch behavior require Owner inspection. Earlier walkthrough results do not validate this revision.

| Remaining issue | Why | Owner decision needed? |
|---|---|---|
| A versus B navigation discoverability | B gives frequent Tasks a visible home; Decisions requires More or contextual entry. A reverses that tradeoff. | After observing the same journeys in both candidates |
| More search and secondary disclosures | Source routes are preserved, but real users must demonstrate they can find Site, Reviews, S18/S27 and settings without prompting. | Validation observation, no business-rule decision |
| Narrow tables, keyboard and touch behavior | Source safeguards do not establish rendered usability at 360–430px or large text. | Guided rendered review before unassisted validation |
| Created by me production contract | Existing prototype proposal remains; the current production query contract does not provide the scope. Mobile does not settle this implementation gap. | Separate contract decision before production implementation |

**NOT READY FOR UNASSISTED USER VALIDATION** until rendered mobile review and the journeys above have been observed. Ready for guided Owner review of the revised low-fidelity representation. S18/S27 development acceptance and actual-project operations are not claimed by this UX package.

## Startup defect correction — Owner requested prototype check

The assembled HTML failed to parse: `$` and `$$` in the mobile shell became two `$` declarations. The assembler supplied a string to `String.replace`; JavaScript interprets `$$` in replacement strings as one literal dollar sign. This prevented the entire prototype script from starting on both desktop and mobile. The earlier source review and helper-only syntax checks missed the assembled artifact failure.

Exact GPT-6.1 Sol identified and reviewed the cause; GPT-6 Luna fixed CSS/JavaScript insertion to use replacement callbacks. The assembler now parses all inline classic scripts before writing the artifact and refuses to save on a syntax error. The prototype was rebuilt successfully.

Following the Owner's explicit check request, `node docs/ui/UX_MOBILE_STARTUP_CHECK_2026-10-08.cjs` passed **55 script/DOM checks**: desktop/mobile startup, directory and operational routes, Created by me through all four task views, task contextual Back, project task view and section controls, S27 destination, and Palm Site search. The test uses jsdom with a virtual history origin; no server, network request or alternate rendered browser was used. This verifies script/DOM behavior, not rendered layout, native keyboard, touch or browser history behavior on local files. Guided rendered validation remains outstanding.

## Focused mobile revision — Dashboard, Tasks and My Work

The Owner found these three pages insufficiently optimized. Exact GPT-6.1 Sol's follow-up intake identified that stacked control rows and explanatory text still delayed actual records. Live Refero MCP re-inspected the Asana mobile task-list records [24d1bd17-aa99-4ef0-88f5-f9d3d7a34f8a](https://refero.design/screens/24d1bd17-aa99-4ef0-88f5-f9d3d7a34f8a) and [5fcd6419-6b51-494f-98af-d52d9a5def5e](https://refero.design/screens/5fcd6419-6b51-494f-98af-d52d9a5def5e): compact current view/filter controls, accessible creation and early work records. The selected adaptation uses existing Sense state and handlers, not Asana's completion or permissions rules.

| Page | Mobile arrangement | Preserved capability |
|---|---|---|
| Dashboard | Attention first; next work and project exceptions next; lower summaries disclosed; sample loading-state controls below operational content | Exact-object actions, source-unavailable notices, count drill-downs and every secondary widget |
| Tasks | Title/Create → Search → Scope/View together → Filter/Sort disclosure → active criteria/count → records | All scopes, all four views, every filter/sort, original/revised dates, creator context and contextual Back |
| My Work | Title/Create → Search → State/View together → Sort/reset disclosure → records; explanatory context lower | Personal/shared distinctions, all work states, List/Board/Timeline and same task commands |

Desktop uses its original canonical markup. Mobile changes move existing DOM controls and apply media-scoped structure. They do not create a second task or command system. Rendered first-viewport fit remains an observation to perform, not an asserted outcome from DOM checks.

Final integration corrected two Sol review findings: active-filter placement now follows insertion of its Filter/Sort disclosure; Reviews/Decisions bodies collapse while count drill-downs and unavailable-source notices remain outside the collapsed content. The mobile header retains Bell/Settings and access to the existing validation tray, avoiding a duplicate validation button. Dashboard summary text receives the full row width before its action, reducing narrow text columns.

`node docs/ui/UX_MOBILE_ASSEMBLE_2026-10-08.cjs` rebuilt the artifact successfully with inline compilation. `node docs/ui/UX_MOBILE_STARTUP_CHECK_2026-10-08.cjs` passed **84 script/DOM checks** covering startup, work views/scopes, project filters, Create, actual asynchronous contextual Back restoration, Dashboard order/collapsed summaries/visible counts and partial-source notices. The earlier 55-check suite did not wait for asynchronous Back and therefore established only that filter variables persisted; the current suite waits for `popstate` and asserts the restored Tasks route. Rendered viewport fit, native keyboard/touch and local-file browser behavior remain unverified.

# Sense application UX audit and master redesign plan

25 October 2026 · **Proposal for Owner review. No implementation authorized by this document.**

## 1. Recommendation

Make the existing application easier to navigate by organizing it around daily work, projects, people and insights. Preserve every supported capability and its owning workflow. Reuse the approved Dashboard shell and canonical Task/Project components; do not start another frontend or design system.

The largest problem is information architecture and task focus, rather than the absence of a visual identity. The deployed shell already has a consistent pine sidebar, paper canvas, header, mobile navigation and page finder. Individual modules still present many separate workspaces, repeat context selection, mix setup with execution, and expose internal terminology. Cosmetic consistency alone will not resolve those problems.

Priorities:

1. Clarify the relationship between Dashboard, My Work, Tasks and Decisions.
2. Make Project the persistent context for documents, drawings, reviews and delivery.
3. Separate operational lists from creation/configuration forms using explicit actions and progressive disclosure.
4. Standardize the object header, list toolbar, detail presentation, filters, form feedback and return navigation.
5. Validate real employee, manager, site and portal journeys before committing to their navigation defaults.

## 2. Evidence, scope and limits

### What was inspected in this session

- Current owner instructions, CURRENT_STATE, IMPLEMENTATION_STATUS and MODULE_REGISTRY; relevant architecture, product, permissions, workflows, domain, storage, database, trace, plan and testing documents. Historical statements are read in light of the latest Owner decisions.
- React route composition in `apps/web/src/main.tsx` and `app.tsx`; shared navigation; project sections; task composition/detail; settings and insights navigation; source contracts and existing audit/demo evidence.
- The Owner's existing authenticated local-staging browser session, explicitly identified by the Owner. All **28 internal route entry views** were visited at **1440 × 900 and 390 × 844**. Dashboard desktop was captured separately; see the evidence ledger for exact coverage and any later replacement captures.
- All eight sections of Local Test Project A: Overview, Plan, Tasks, People, Documents, Reviews, Delivery, Activity. Task detail, task creation without submission, expanded task filters, a submitted review round, selected project Documents and Site delivery were inspected. Additional states and captures are enumerated in `live-owner-evidence.json`.
- A separate Playwright run covers live anonymous routes and **synthetic** Owner/Staff unavailable-source shell states. Those synthetic sessions exist only in intercepted browser responses; they do not create accounts, sessions or grants. They are not role permission acceptance.
- Live web and API release metadata and readiness are recorded in `browser-evidence.json`. The deployed matched release is `70b047cd57af5d4a755e45c5c99b06e4039a46c8`, build `70b047cd57af-1792849822919`, schema 120. Checkout HEAD at the browser baseline was `acc98be4f20374b52bf60fee5afd0b5d8bf1c6c6`; checkout source is not claimed identical to the deployed release.

### What is not complete

The **master plan and Owner-route baseline are deliverables; the exhaustive cross-role interaction audit remains IN PROGRESS**. Only the Owner authenticated session was available. Team Leader, Project Lead, Designer/employee, Site Staff, Primary/secondary Client and EXTERNAL consultant/vendor/factory sessions have not been authenticated in this session. A mock STAFF session cannot establish their visibility, authority or workflow success.

No business mutations, approvals, uploads, invitations, password changes, offline preparation/sync, report generation/freeze/export or policy changes were performed. Empty/configuration states limit inspection of populated drawings, client packages, reports, training and site records. Those later states require suitable existing records or separately authorized disposable fixtures. Read-only navigation cannot prove mutation persistence, concurrency or end-to-end usability.

No full `pnpm verify`, unit suite, API integration suite, database migration, deployment, build or production acceptance was run for this audit. Historical passing checks are references only. This is a heuristic and workflow audit, not an empirical user study or accessibility certification.

### Read-only meaning

Only audit documentation, scripts, screenshots and evidence are added in this new directory. Application/backend/API/schema/permissions/business rules are not edited. Ordinary authenticated GET requests may update session last-use metadata; exact database byte equality is not asserted. Browser-only filters, disclosures and navigation are not domain changes. The standalone runner blocks all non-GET API requests. The attached Owner walkthrough uses only read/navigation controls and leaves mutation controls untouched.

## 3. Actual frontend architecture and navigation

The application is an existing React SPA with BrowserRouter. `main.tsx` owns install, client portal, external portal, public portfolio and a checkout preview entry; `app.tsx` owns staff/Owner identity, protected modules and not-found handling. Many route wrappers restore the same internal session and mount WorkspaceLayout around an owning module. Clients and external collaborators use separate session surfaces; sharing visual primitives must never share their staff session/navigation.

The core is not 28 independent products. Several routes are focused presentations of the same component: Performance/Project Health, Dashboard/Reports, Automation/Saved Reports and Learning/Skills/Training. Tasks are already reused in My Work, the global register and Project Tasks. Consolidate the visible homes and preserve canonical components and command boundaries.

Current navigation:

```text
Internal workspace
├─ Dashboard
├─ Work
│  ├─ My Work, Decisions, Tasks, Projects
│  ├─ Project documents, Drawing register, Internal reviews, Client reviews
│  └─ Evidence assistance, Turnkey operations, Site delivery
├─ People: People, Time, Workforce, Learning
├─ Insights: Performance
│  └─ Local navigation: Performance, Project Health, Reports, Saved Reports
├─ Manage: Account & settings, Integrations, Automation & reports, External access
└─ Settings (also a separate persistent navigation link)

Phone: Home · My Work · Projects · Decisions · More
More: grouped secondary destinations and settings
Header: Find a page · New task · Notifications · account · Log out

Legacy /workspace: identity/organization/CRM + aggregate operational workspaces
Project: Overview · Plan · Tasks · People · Documents · Reviews · Delivery · Activity
Learning: Skills · Training · Library
Dashboard: Overview · Scheduled summaries · Reports · Reminders & schedules
```

The source `destinations` array has 22 entries. It is not the full route inventory: six additional focused internal routes are contextual, legacy/identity paths are separate, and public/portal routes belong to another shell. See [PAGE_INVENTORY.md](PAGE_INVENTORY.md) and [source-inventory.json](source-inventory.json).

## 4. Findings by severity and role

Severity describes the likely user consequence, not a measured defect rate. **Critical** means a confirmed safety/access blocker; **High** obstructs frequent work or creates consequential ambiguity; **Medium** increases effort or inconsistency; **Low** is polish. No new Critical security/business defect was established.

Evidence labels: **Live** = authenticated Owner snapshot/capture; **Source** = inspected frontend/source contract; **Historical** = existing report, not rerun; **Hypothesis** = needs other-role/user validation. Snapshot field totals include hidden controls and must not be read as simultaneously visible fields.

| ID | Severity / type | Evidence and affected role | Finding | Proposed treatment |
|---|---|---|---|---|
| UX01 | High usability | Live shell; all internal roles, frequency to validate | Work exposes 11 sibling destinations, alongside Dashboard. Project-specific operations compete with daily task queues. | Stable daily links, grouped specialist queues, project-context entry; keep every route reachable. |
| UX02 | High usability | Live `/external-access`; Owner/authorized access manager | Entry requires a raw Project ID and exposes `S21 · STAFF MANAGEMENT`. | Enter from selected Project; authorized project selector for standalone use; technical ID in disclosed details. |
| UX03 | High usability | Live selected Project Overview; Owner/project manager | Overview puts reason, lifecycle controls, cancellation, transfer and scope changes alongside basic project facts. | Readable overview; explicit Manage actions with action-local reason and unchanged consequences/gates. |
| UX04 | High usability | Live `/projects`; Owner | Directory and Draft creation form occupy the same page; creation remains visible before New project is invoked. | Directory-first page; reveal existing create workflow through New project. Preserve template, scope, client/lead provenance and recovery. |
| UX05 | High usability | Live `/client-reviews`; Owner and authorized staff | Client access, sending review work, private gallery and public portfolio preparation appear together. | Separate Packages, Client access and Presentation subviews. Public publication remains explicit and separate. |
| UX06 | High usability | Live `/automation`, `/saved-reports`; authorized report/rule manager | Custom reports appear in Automation and Saved Reports; Reports also exists in Dashboard and `/reports`. | One Reports home with explicit Standard reports, Saved definitions, Frozen history and Runs links; Automation owns rules. No data/object merging. |
| UX07 | High usability | Live task list; Owner/scoped managers, employee impact to validate | 51 tasks (50 loaded) produce approximately 10,834px desktop and 16,681px phone documents, dominated by repeated row metadata. | Compact desktop rows and phone cards with title/state/date/owner; disclose secondary metadata. Preserve current pagination and full record access. |
| UX08 | High usability | Live selected Site project; Site Staff/manager hypothesis | Daily work, responsible-person setup, offline tools, packages, manpower, reports, snags and handover form one long surface. | Today overview and explicit capture actions; Records subviews; Setup and handover actions disclosed by context. Preserve independent checks and sync states. |
| UX09 | High usability | Live `/performance`, `/project-health`; Owner/manager | Reading scores and health shares substantial space with dated assignments, cycles and formula policy setup. | View-first Insights; configure policies in a clear management subview. Keep unavailable/unscored states and explicit values. |
| UX10 | Medium usability | Live My Work; Owner | Owner without an employee sees a zero personal queue, although organization has 51 tasks. All teams and the empty-state explanation already exist. | Strengthen personal/management scope labeling and organization-work entry. Do not change default scope or grant employee identity automatically. |
| UX11 | Medium usability | Live Documents/Revisions/Turnkey/Site entry; all project workers | Independent global entry views ask users to choose the same project repeatedly. Existing Project shortcuts already pass `projectId`. | Prefer those context links; one Project context header; standalone selectors remain available. Validate every consumer actually retains the query context. |
| UX12 | Medium usability | Live notifications; all internal roles | Empty inbox is followed by email configuration state, optional channel preferences and quiet-hour forms. | Inbox-first; notification preferences reachable in Settings and through one settings action. Notice read state never resolves the underlying task. |
| UX13 | Medium usability | Live Time; employee/manager hypothesis | Manual entry asks for contextual and technical information, including duration in seconds and evidence file ID. | Group work context/time/evidence; use a human-readable duration adapter only if exact existing units/validation remain. Retain explicit file-ID fallback if no authorized picker API exists. |
| UX14 | Medium usability | Live review list/detail, external access, library | User-facing slice codes, UUIDs, underscore states and technical evidence prose add interpretation work. | Human labels and concise explanations; preserve exact IDs/state values in details and payloads. Human naming uses existing fields only. |
| UX15 | Medium usability | Live/source navigation | Page finder and sidebar both say Find a page; only destination labels are searched. Focused routes are not all present in the global destination array. | Clarify sidebar Filter navigation vs Find a page; index existing contextual destinations if approved. Never imply content search. |
| UX16 | Medium usability | Live Learning and focused routes; Owner/learning users | `/learning` combines Skills and Training while dedicated routes expose those separately. | Learning landing/tab selection with consistent Skills, Training, Library views; retain old URLs and links. |
| UX17 | Medium usability | Live/source labels | Project documents/ Documents, Internal reviews/Internal work review and Turnkey operations/BOQ and production use different names at different navigation layers. | One navigation glossary, with descriptive page subtitles rather than competing names. |
| UX18 | Medium usability | Live Project Documents/Reviews | Existing project sections often show a summary, then send users to another full workspace. | Reuse existing owning views under a persistent project context, starting with context headers/returns. Avoid pretending every panel is already embedded. |
| UX19 | Medium usability | Live mobile; all internal roles, especially site hypothesis | More holds frequent specialist tools. Decisions is always a primary destination even when empty. | Initially keep approved five-item bar; test task/review/site discoverability before changing it or offering role-specific defaults. |
| UX20 | Medium system consistency | Source theme + historical approved tokens | Shared shell tokens, studio tokens, My Work tokens and module-specific CSS overlap. A prior proposal is not identical to current computed styles. | Map primitive → semantic → component aliases over accepted shell values; migrate incrementally with rendered comparison. |
| UX21 | Medium usability | Live `/workspace` CRM + source; Owner/CRM staff | CRM has no dedicated normal navigation destination and remains in the legacy aggregate, alongside repeated Project/Task lists and a misleading “capabilities are added” welcome. | Explicit Sales & clients navigation to the existing CRM surface; no new backend or duplicate CRM. Resolve its final home with users before implementation. |
| UX22 | Low usability | Live Settings and navigation | Account & settings, Settings, My account & devices and sign-out actions repeat. | One settings home with Account, Organization and Tools sections; preserve contextual shortcuts. |

### Technical defects and environment limitations — separate register

- No new backend, authorization, data-loss or calculation defect was demonstrated. Opening a page as Owner does not prove employee access correctness.
- Existing `docs/ui/LEGACY_WORKSPACE_320_FINDING_2026-10-24.md` documents legacy 320px overflow. Treat as historical until reproduced; this audit's 390/1440 entry views do not establish 320px correctness.
- Transactional email is unconfigured; Workforce policies and performance policies are absent; project files and client packages are empty in inspected records. These are truthful setup/data conditions, not automatically product failures.
- Legacy review rounds can lack newly required submission evidence. Do not backfill, relabel or mutate them to improve appearance.
- Standalone browser startup first lacked its sandbox-visible Chromium path; the initial network-restricted run could not reach staging. The unsandboxed local-only runner uses the installed browser path. The first network-idle pass was interrupted and retained separately; final bounded results are distinct.
- A selector expecting a `Filters` button failed because Tasks uses a native disclosure, and a generic Project combobox selector did not match Documents' accessible name. Corrected read-only exploration followed DOM inspection; these automation assumptions are not application bugs.
- Initial attached-browser full-page captures sometimes rendered narrow columns despite correct reported geometry. A stable viewport-only pass captured all 28 entries at each width with correct geometry and visual contact-sheet inspection. Keep initial captures as diagnostic evidence, not responsive-defect proof. Some final entry captures show transient source loading; the earlier populated DOM observations and separate populated Dashboard captures remain available.
- The standalone page-finder keyboard attempt timed out before explicit shell readiness. Its four other shell interactions passed. A separate readiness-aware recheck passed click, Control+K, Time filtering and Enter navigation; this does not retroactively turn the original failed attempt into a pass.

## 5. Proposed information architecture

### Desktop

Use a small daily group and expandable secondary groups. These are proposed navigation homes; routes and supported capabilities remain intact.

```text
Daily
  Dashboard                  current evidence and attention
  My Work                    personal or existing management scope, explicitly labeled
  Tasks                      cross-project register, filtered views
  Projects                   directory and persistent selected-project context
  Decisions                  approval obligations; links to owning workflows

Project work                 cross-project specialist queues retained
  Documents & drawings       links to distinct Files and Drawing register views
  Reviews                    Internal reviews | Client review packages
  Delivery                   Turnkey operations | Site delivery, contextual project selection

People
  Directory | Time | Workforce | Learning (Skills, Training, Library)

Insights
  Performance | Project Health | Reports | Evidence assistance

Manage
  Organization & access | Integrations | Automation | Sales & clients

Utilities
  Notifications | Settings/account | Find a page
```

This reduces initially expanded choices; it does not promise a particular smaller total route count. Validate label grouping through tree testing. Cross-project drawing/review/site specialists retain direct access. No new 'workspace', Brand or Department organizational entity is introduced.

### Project context

Retain the eight existing sections initially. A selected-project header shows Project title, owning Branch, delivery type, status and contextual return. Project People means assignments and lead; organization People means employee membership and reporting.

- **Overview:** project facts, relevant next obligations and milestones available from existing reads. Management actions are explicit.
- **Plan:** current applied template/stages/milestones and unchanged plan workflows.
- **Tasks:** existing TaskWorkspace with fixed project context and preserved URL keys.
- **People:** current lead and contributors; unchanged management commands.
- **Documents:** Files, Drawing register and Confirmed drawings are distinct linked views. Final Primary Client approval must identify exact evidence. Confirmed never means formally Issued.
- **Reviews:** Internal and Client subviews; exact round/item identifiers survive navigation. Cross-project queues remain available.
- **Delivery:** existing Turnkey and Site contexts; unrelated delivery types retain truthful unavailable states.
- **Activity:** current histories and requests, with no invented cross-domain event ledger.

Do not add summary counts unless their current authorized read contract already supplies them. Deep-linking and visual composition may be frontend work; new backend aggregates are excluded.

### Phone and tablet

Retain the accepted Home, My Work, Projects, Decisions, More bar while researching alternatives. Use one shell mode at the existing 768px breakpoint; test 767/768/783px explicitly. More should expose labeled groups, all retained routes and the current location. A project switcher and local section selector sit within project context, not another global tab bar.

Use single-column task detail; a desktop side panel can be considered where the canonical component already supports it. Full-screen phone forms need a concise context header, clear Close/Back, visible Save/Create action, keyboard-safe layout and preserved draft/uncertain-result behavior. Routine lists should not force users through giant forms. Large tables may scroll in a labeled region where genuinely necessary; the whole viewport must not overflow.

Do not change employee/manager default destinations, add a new persistent role preference or replace Decisions with Site without Owner approval following usage evidence. Role labels cannot stand in for actual capability context.

## 6. Core journeys and fewer unnecessary steps

Counts are proposed navigation targets, not timings or measured usability gains. Required evidence, reasons, confirmations and independent decisions remain.

| Journey / users | Current observed structure or source dependency | Proposed efficient path | Must preserve |
|---|---|---|---|
| Find work / employee, leader | Dashboard, My Work and Tasks overlap; employee session pending | My Work → relevant filtered queue → same task detail; aim ≤2 navigation actions | Existing personal/management scopes and distinct source counts |
| Owner manage team work | My Work personal empty, All teams exists | My Work → All teams → existing team/employee drill-down | Current home-Team grouping; no new grant |
| Create project task / assigned worker/manager | Project Tasks already embeds canonical composer | Project → Tasks → Create; fixed project and eligible owners; aim ≤2 from project overview | Mandatory fields, immutable requirements, retry identity, project access |
| Complete/submit task / worker | Task details provide Next step and reason | Queue → detail → required evidence/reason → canonical submit | Mandatory file/link for new review work; no shortcut to approval |
| Independently review / reviewer | Review inbox → exact task/round | Review queue or notification → exact evidence/round → existing decision | Named reviewer, independence, correction/history and concurrency gates |
| Client final approval / Primary Client | Separate client authentication and exact review package | Client project → awaiting review → exact item evidence → existing final approval | Item vs final approval, Primary authority and signature/step-up |
| Find confirmed drawing / internal/client allowed context | Project Documents already lists final-approved exact evidence | Project → Documents → Confirmed drawings; target no project reselection | Current file/Confidential permissions; exact evidence; no implicit issue |
| Issue drawing / authorized issuer | Drawing register owns revision/transmittal | Project → Drawing register → exact approved revision → existing Issue flow | Approved vs Issued, transmittal and superseded history |
| Grant external access / authorized manager | Standalone entry asks Project ID | Project context → Access → exact existing grant workflow | Consultant/vendor/factory types, resource access, expiry/revocation |
| Record site observation / Site Staff | Site workspace has many forms; selected project captured | Project → Site → explicit Note/Report/Snag action | Current offline preparation and queue, reauthorization, independent verification |
| Record time / employee | Current manual entry form and task selectors | Task → existing Time context where supported, or Time → entry action | Exact seconds, dates/timezones, overlap, locks/corrections and billing semantics |
| Leave/WFH / employee and manager | Self-service and policy setup share route | Workforce → My records → request; managers use existing Managed records | Schedule-derived capacity, configured routing, balances and future-only cancellation |
| Review performance / employee/manager | Policy setup beside results | Insights → scoped subject → evidence; Configure policy via management action | Explicit formulas, unscored state, dated groups and sensitive-score access |
| Report / authorized analyst | Standard, saved and frozen concepts split across four entries | Reports → Standard preview / Saved definitions / Frozen history | Preview/read is not freeze, run, publish or export; current source reauthorization |
| Training / employee/reviewer | Skills and training mixed on legacy learning | Learning → Training → exact assignment/version | Completion does not change official skill; named reviewer and effectiveness |
| CRM to project / CRM user/Owner | CRM is in legacy workspace | Explicit Sales & clients → existing lead → existing won-lead Project workflow | Existing branch ownership, client match and won-lead provenance |
| Account recovery / staff/client/external | Distinct passkey and email-code flows | Clear role entry → existing method → truthful recovery/help | No client-password migration, new auth method or bypass |

Use [ROLE_AND_WORKFLOW_MATRIX.md](ROLE_AND_WORKFLOW_MATRIX.md) for dependencies and unverified role coverage.

## 7. Unified design system and component inventory

### Reference lock

**Primary:** existing Owner-approved cream/pine/gold foundation and deployed V10/Dashboard shared shell. Preserve paper canvas, dark pine navigation, quiet borders, functional typography, unboxed page titles, existing gutters and underline local navigation.

**Bounded secondary references:** Linear for work-row hierarchy and view/detail continuity; Asana for personal work vs project navigation; monday.com for grouped hierarchy; Programa for a project-centered client information home. Do not import their roles, databases, board system, colors or approval semantics.

Refero's fresh architectural Studio Emmerer style search produced a preview/full-style theme conflict and marketing-specific rules. It is rejected as the operational visual authority. The skill's generic enterprise design-system query returned a marketing hero/CTA pattern and unrelated palette; that recommendation is also rejected. Existing approved system and verified product documentation take precedence. See [RESEARCH_AND_REUSE.md](RESEARCH_AND_REUSE.md).

### Foundations

| Layer | Contract |
|---|---|
| Color | Derive semantic aliases from current accepted shell; pine action, gold brand accent, paper canvas, selected surface and explicit danger/warning/success. Never encode approval solely with a color. |
| Type | Existing Inter/system UI stack, 14–16px operational copy and 16px phone inputs; keep shipped title sizing until the target is reviewed. IDs and technical data use restrained monospace in details. |
| Space | 4px spacing scale; consistent 8px control gaps and 16/24/32px grouping. Preserve existing responsive shell gutters. |
| Shape | Existing control/panel radii; flat routine rows, stronger depth for real overlays. Avoid nested cards around every paragraph. |
| Accessibility | WCAG 2.2 AA target; 4.5:1 normal text, 3:1 meaningful control boundaries; visible focus, semantic labels, error association, 44px practical phone targets. This audit does not certify those thresholds. |
| Motion | Short purposeful transitions, reduced-motion support; no motion needed to understand work state. |
| Copy | Sentence-case human names and verb-led actions; Task owner vs organization Owner; Target vs Committed date; notification vs obligation; Submitted vs Approved vs Issued. |

### Components to reuse and converge

| Component family | Existing implementation to reuse | Target consistency |
|---|---|---|
| App shell | WorkspaceLayout, WorkspaceHeader, PageFinder, RouteAccessibility | One navigation mode/header/title and return/focus contract |
| Page/object header | Dashboard title/gutters; Project context and Task Next step | Title, context, exact source/state, one primary authorized action |
| Worklist | TaskWorkspace, My Work queue, People/project directory | Query/filter/sort state; clear count basis; rows/cards; pagination retained |
| Task forms | TaskCreateDialog, task composer fields, creation options | Same validation and payload across My Work/Tasks/Project/subtask contexts |
| Object detail | TaskDetailDrawer and existing inline task detail | Shared information order and action placement; no duplicate lifecycle |
| Project sections | ProjectWorkspace, project resources/relationships | Stable context, section URL and scoped source composition |
| Filters | Existing task/project filters and saved views | Search visible; common quick filters; advanced disclosure with active filter summary |
| Evidence and state | review-evidence, ConfirmedDrawings, source timestamps | Exact revision/round/file/link and next actor; state labels supplement colors |
| Feedback | Existing denied, unavailable, conflict, retry, uncertain-create states | Distinguish no records, no match, no permission, missing setup, failed read and offline |
| Forms | Native labeled inputs/selects, reason fields, existing dialogs | Action-local reason/error, clear required fields, retained limits; no invented defaults |
| Preferences | Existing widget/queue preferences and Settings sections | Respect account/device keys and schema; do not introduce a new settings service |
| Security/portal primitives | Existing client/external auth, sessions and file presentation | Shared visual language only; independent identity/authority shells |

Keep framework, dependencies and stylesheet ownership initially. No shadcn migration or new UI library is needed to fix this IA. Extract a primitive only after at least two real callers share the same behavior; do not rebuild a component library as a prerequisite.

## 8. Screen-by-screen roadmap

Each phase ends with review of existing-route screenshots and capability preservation. This proposal authorizes no phase implementation.

| Phase | Screens and concrete changes | Dependencies / exit |
|---|---|---|
| A — evidence closure | Real Leader, employee, Site, Primary/secondary Client and EXTERNAL audit; populated drawings/report/training states; route and action parity ledger | Existing approved sessions/records, no retained seeding; missing evidence remains explicit |
| B — navigation and grammar | Workspace shell, More, page finder, glossary; contextual Insights/Learning links; keep approved shell treatment | Owner accepts tree-test results; all old routes reachable; 320–1440px shell/keyboard checks |
| C — daily work | Dashboard, My Work, Tasks list/cards/board/timeline, task detail/composer, Decisions, Notifications | Reuse current canonical sources; task/review/approval count meanings unchanged; query/back/draft continuity |
| D — project center | Projects directory/create, all eight sections, Documents, Drawing register, Internal/Client reviews, access context | Existing `projectId`/section/query contracts; exact-evidence/Confidential/issue checks; no summary endpoints |
| E — people and self-service | People profile/directory, Time, Workforce, Skills/Training/Library | Existing self/reporting/capability context; no formula/date/HR authority changes |
| F — operations and management | Turnkey, Site, Performance/Project Health, Standard/Saved reports, Automation, Integrations, Settings, existing CRM | Separate viewing/doing/setup; same domain commands; contextual setup actions preserve every field |
| G — portal coherence and acceptance | Staff sign-in/recovery, client/external entry/project/review/cost/gallery, public portfolio, Install/update/offline states | Portal sessions remain isolated; actual role/keyboard/mobile regression and matched candidate review |

Suggested first implementation slice after approval: **Projects directory and Overview progressive disclosure**, or **Tasks row density**, selected after the remaining employee/site audit. These are bounded, visible changes with existing persistence/contracts. Do not implement a new aggregate Inbox or a universal project API as the first step.

### Explicit route treatment

- `/dashboard`: retain current overview, widgets and truthful counts; keep summary/report/reminder workflows reachable through clear links/subviews.
- `/my-work`, `/tasks`, `/decisions`: retain distinct purposes; reduce repeated controls and improve scope/return clarity.
- `/projects`: directory-first and stronger project identity; no second project frontend.
- `/documents`, `/revisions`: coordinated navigation, distinct file/revision workflows; preserve exact routes and old links.
- `/reviews`, `/client-reviews`: common navigation family, separate internal/client actions and authorities.
- `/turnkey`, `/site`, `/external-access`: context entry from Project and retained standalone queues/selection.
- `/people`, `/time`, `/workforce`: clear directory/self-service/managed boundaries, no implied organizational restructuring.
- `/learning`, `/learning/skills`, `/learning/training`, `/learning/library`: one family, explicit focused views; preserve legacy path.
- `/performance`, `/project-health`: shared grammar and policy setup disclosure, distinct score families.
- `/reports`, `/saved-reports`, `/automation`: consolidate report discovery, retain definition/run/frozen/rule object boundaries.
- `/integrations`, `/assistance`: clearer context and setup vs evidence views; no new providers, inference or external transmission.
- `/settings`, `/workspace`: inventory and preserve legacy-only CRM/admin capabilities before reducing legacy prominence.
- Identity, client/external portal, portfolio and install routes: coherent primitives and truthful states; no auth or publication-policy changes.
- Checkout `/v15-preview`: experimental only. Do not advertise as accepted production task creation or build another preview frontend.

## 9. Frontend/backend compatibility and migration risks

| Risk | Required compatibility control |
|---|---|
| Dropping links when regrouping navigation | Retain paths, query keys, fragments, saved views and notification targets. Add labels/groups without deleting routes. |
| Treating UI role label as permission | Use only current authoritative capabilities where supplied. Existing server authorization remains final. Do not infer manager scope from account kind. |
| Losing exact evidence in a unified review UI | Carry task ID, round ID, submitted version, evidence IDs/URLs and current authority to the existing workflow. No generic Approve action across domains. |
| Conflating final approval and issue | Confirmed drawings remains exact Primary-final-approved evidence; Issue still creates the canonical transmittal. |
| Mutating required/default values during field simplification | Reveal advanced fields rather than remove them; preserve command normalization, required reasons, dates and review requirement choices. |
| Implicit action on selecting a tab | Selection/read must not create a draft, report, grant, offline cache or approval. Creation stays explicit. |
| Drafts/retry receipts lost on route remount | Preserve form drafts, task creation retry identity, uncertain-result state and dirty-context guards; reauthorization still occurs. |
| Sharing a new Project context across accounts | Reset on account/session changes; validate current project access. Preserve session-ended and visibility refresh behavior. |
| New visual aggregates imply complete data | Retain source-local counts, overlap warnings, timestamps, page limits and unavailable states. Never sum heterogeneous sources. |
| Exposure through names/previews | No unauthorized project/person/file titles in navigation caches, search or recent items; Confidential ancestor and file grants stay enforced. |
| Visual token regression | Audit computed values after stylesheet cascade; compare current accepted shell and module states, not only proposed token JSON. |
| Offline/PWA updates discard work | Preserve account/project IndexedDB isolation, pending captures and waiting-worker activation; never clear browser storage for rollout. |
| Old prototype contains unsupported features | Map every adopted screen/action to current routes, reads and commands. A prototype control is not evidence of backend capability. |
| Legacy removal hides CRM/admin | Complete capability parity before reducing `/workspace` visibility; keep a reachable fallback. |
| Schema/API changes sneak into UX work | Zero schema migration, API contract/permission changes or automatic retained-data migration. Record any unmet read requirement as deferred. |

Deferred under the present constraint: universal content search, cross-module command execution, new unread/action aggregate, new calendar/board backend, persistent role-specific navigation model, new name fields, consolidated permission API, new report aggregation, client passwords, live AI and external delivery expansion. A later Owner decision can separately scope those; the UX plan does not assume them.

## 10. Acceptance and usability validation

### Capability preservation

Every inventory row needs a before/after home, canonical module/component, entry link, required fields, roles/capabilities, exceptional states and browser case. Every existing supported action remains reachable. Tests must cover old deep links and all four Task entry contexts, not merely the new navigation.

### Proposed usability success criteria

- With at least two representative participants per key internal persona and suitable Client/external participants, run moderated tasks on desktop and phone. Use existing authorized or disposable test records; never ask participants to experiment on consequential live workflows.
- Establish baseline completion rate, wrong turns, navigation actions, time on task, assistance requests and a 1–7 Single Ease Question score. No baseline/user-performance numbers are currently claimed.
- Target ≥90% unassisted success for routine tasks, median ease ≥5/7, and ≥25% fewer navigation actions for the project-document/review journeys where baseline includes reselection. Treat targets as release criteria to validate, not promised results.
- All participants must distinguish internal approval, client item approval, Primary final approval, formal issue and site handover in scenario testing. Any consequential confusion blocks acceptance regardless of average speed.
- Tree-test the proposed homes for drawings, client packages, CRM, report definitions, leave and site capture. Keep direct specialist access if group labels impair findability.

### UI/accessibility acceptance

- Desktop 1440/1395/1024, tablet 783/768/767 and phone 390/320; expanded/collapsed shell, zoom 200%, long labels and mobile keyboard. Exactly one global navigation mode; no viewport overflow or content covered by sticky bars.
- Keyboard-only page finder, More, section navigation, filters, dialogs and return paths; Escape closes appropriately and restores focus. Screen-reader roles, heading order, labels/errors/live feedback checked with a real assistive technology session.
- Default list keeps meaningful work visible; task title, exact status, primary owner and relevant date can be recognized without opening each record. Required gates remain visible at consequential action time.
- Check actual contrast in every composed state, 44px phone targets where practical, reduced motion, loading/empty/no-match/denied/unavailable/expired/conflict/offline/uncertain-write states.

### Engineering/release acceptance for later implementation

Before any code slice, add its requirement sub-IDs/scope/dependencies/acceptance in IMPLEMENTATION_PLAN as required by AGENTS. Anchors include R-005/R-006/R-007 identity/access/navigation, R-071 responsive UX, relevant domain requirements and R-099–R-102 security/verification; use approved exact clauses for each slice rather than assigning new business requirements here.

Run targeted meaningful component/query/navigation tests, web typecheck/lint/build and appropriate affected regression. High-risk paths need existing ID-tampering, branch isolation, evidence immutability, independent approval and concurrency coverage on dedicated approved targets. Then perform the repository's applicable full acceptance and independent review before selected-commit staging promotion. Pinned Node 24.19.0/pnpm 11.19.0 are present; their presence is not a passing test claim.

Roll out one approved slice in `apps/web`, retain old route entry points and data, compare screenshots, explicitly commit selected files, and promote only the exact accepted matched release through canonical staging workflow. Keep previous artifacts for rollback. Do not deploy this audit or treat the working checkout as accepted. Operational R-104/R-105 and production/NAS gates remain outside this UX proposal.

## 11. Review decisions before design/implementation

The Owner can review this concrete proposal now. The remaining choices are navigation naming/grouping, the CRM discovery home, and which bounded slice to design first. Mobile primary destination changes and role-specific defaults should wait for remaining-role evidence. Business-rule changes are neither needed nor proposed.

Model disclosure: current Codex performed this audit. No Opus, Sonnet, independent-agent acceptance or user-study result is claimed. No subagents were used.

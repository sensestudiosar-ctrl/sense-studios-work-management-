# UI v1 screen contracts — review draft

Companion: UI_SPECIFICATION_V1.md. All field/action definitions are subject to the approved domain rules and actual server capabilities. These are acceptance scenarios to implement later, not claims that tests have run. Scope is internal S01–S13 presentation. Fictional mock data is not API or permission evidence.

## Shared contract (SC-00)

- Purpose: give all core screens one navigation and state model without changing domain authority.
- Users/access: active internal sessions; Owner setup gate preserved. External CLIENT sessions cannot enter this shell. Branch/team/project/item permission applies to data, labels, counts and actions. Default deny; denied content does not leak identifying details.
- Data: authenticated permitted identity/context; authorized source records; server capabilities; configuration timezone. Never infer permissions from job title or a branch selection.
- Actions: permitted reads, contextual navigation, authenticated domain commands. Missing rights hide actions; valid rights with state blocks show a disabled control plus reason. Server checks remain authoritative.
- Desktop/mobile: semantic header/nav/main; comfortable content width; page-level scrolling. Mobile cards preserve core identity/date/status fields and all authorized core workflows. Dialog/drawer choice does not change authority.
- States: initial loading; honest empty; filter-no-results with Reset; section-level retry; read-only notice for known state/capability; access loss clears protected content; session expiry hands off to sign-in; stale version preserves user input but refreshes capabilities; save pending prevents duplicates; field errors remain adjacent; success updates authoritative data.
- Acceptance: SC00-A keyboard completes navigation and dialogs; B 320px/390px/768px/1024px/1440px has no page overflow or covered actions; C denied branch/project/file/CLIENT identity cannot retrieve data even by URL/ID; D revocation invalidates access and clears stale visible sensitive content on next request/session signal; E date labels distinguish target/committed and use configured timezone; F loading/error never displays misleading zeros or a success; G back/deep-link preserves relevant navigation context.

- Visual layer (UI-V01): use UX_WORKFLOW_PLAN.md's visual planning matrix and fixtures for SC-01–08. Graphics supplement exact labels/evidence; each has an accessible text/list equivalent and equivalent mobile interaction. Nodes, edges, thumbnails, annotations and counts obey source permissions. No inferred completion percentage, fabricated preview or diagram-based decision bypass. Shared components cover loading/empty/error/read-only/stale/access-loss states. Exact shapes/colours and comprehension/accessibility acceptance remain pending mockup review.
- Visual acceptance (SC00-V): A users correctly identify current state, responsible person and next action; B target/committed/proposed dates remain distinguishable; C upload/approved/issued/superseded labels cannot be confused; D exact review evidence remains stable after newer upload; E keyboard/text/mobile equivalents preserve meaning; F hidden identities and partial/unavailable totals are not revealed or represented as zero. These are planned checks, not verification evidence.

Research preview contract (SC00-P, candidates 07/08/09): My Work and Project Tasks may expose a read-only preview with exact task/project identity, current owner, status, priority, Target/Committed dates and relevant waiting, proposed-extension or review evidence. It contains no domain mutation controls. Desktop side preview and mobile modal have labelled close/full-detail actions, keyboard dismissal and focus return. Closing preserves filters and scroll; full detail offers return to the same list context. Display changes preserve essential fields. Rendering a different role/state clears preview content immediately; real revocation/session signals must also clear it in the eventual application. Prototype role selectors and clearing tests do not prove backend authorization. A nonmodal split view is not implemented. Acceptance includes five widths, keyboard/touch access, context return, unchanged committed dates during pending extension and current ownership during reassignment waiting.

## SC-01 Application shell

Purpose: organize the internal application around personal work and accessible projects. Requirements R-004–R-009/R-071/R-099; C-001/C-002.

Users/permissions: all authenticated internal users; each destination requires its source access. Owner and staff land on My Work. Deep links remain available where permitted.

Data: application name, current user, permitted destinations, active destination/project breadcrumb; authorized notification indicator only when complete count exists.

Actions: destination navigation; More menu on mobile; notifications/profile/security/sign-out; return from record to context. Prototype destinations outside this package explain their design status and cannot impersonate working production routes.

Desktop: full sidebar/header; intermediate-width rail/drawer; mobile: compact header, My Work/Projects/Decisions/More bottom navigation and safe-area spacing.

Loading/empty/error/read-only: loading identity hides privileged destinations; no projects is handled in Projects, not by disabling My Work; failed identity/session verification displays a safe sign-in/retry handoff; read-only records retain navigation, with writes disabled in their own screen.

Acceptance: SC01-A Owner/staff ordinary login opens My Work; B permitted deep link returns after authentication; C active navigation has programmatic current state; D touch/keyboard opens/closes More/profile and returns focus; E no branch selector expands access; F existing document/revision/review URLs remain reachable after shell migration.

## SC-02 My Work

Purpose: show the current person's actions and own/collaborator tasks. Requirements R-018–R-029/R-058/R-096–R-097; C-023/C-024. No broad S24 analytics.

Users/permissions: all internal accounts. Personal tasks use effective employee identity and explicit collaboration. Management tasks require a separately labelled authorized scope. Owner without employee identity gets decisions plus an honest personal-task empty state.

Data: attention source ID/type/title/reason/project/action destination; source chronology; task ID/title/project/status/priority/owner/target/committed date/waiting or review summary. Missing committed date says Not committed. Counters need complete authorized totals.

Actions: open attention evidence; open task; permitted self-task creation; search; Active/Approaching/Waiting/Review & correction/Completed filters; explicit date range and date basis; reset. Creation cannot assign others without the separate grant.

Desktop: attention list above filter bar and task rows; mobile: attention above compact task cards, wrapping filter controls, dates fully labelled. Attention does not push all tasks behind a dashboard of metrics.

States: independent attention/task skeletons; no attention says You're up to date; no tasks offers permitted creation or assignment guidance; no matching tasks offers Reset; each section's failure retries without blanking the other; read-only disables creation while permitted records can still open. Global access loss obeys SC-00.

Acceptance: SC02-A user never sees another team's task without grant; B pending review/decision is deduplicated by source and opens the exact evidence; C completed/stopped work is excluded from Active; D filter combinations/reset/date basis produce expected results; E search does not claim completeness over one loaded page; F pending extension is not approved from a tile; G notification read does not resolve a decision; H Owner without employee has no invented self-assignment; I all empty/loading/error/read-only states render without contradictory totals.

## SC-03 Project Overview

Purpose: establish current delivery context and permitted next steps. Requirements R-011–R-017/R-092; C-010/C-011/C-016/C-024.

Users/permissions: Owner and explicitly assigned/scoped internal staff. Project Lead and authorized manager actions are capabilities, not title-based access. Cross-branch membership remains explicit.

Data: project identity/branch/delivery type/status/lead; baseline/service scopes; applied template version and available stages/milestones; recorded hold/cancellation reason; authorized pending work links. No health score or unverified completion percentage.

Actions: navigate project tabs; inspect scope/template; access permitted lifecycle and scope-request commands through reason/evidence forms. Overview prototype only navigates and illustrates these command positions; it does not implement every management form.

Desktop: persistent header, tabs, main delivery context and side facts; mobile: header → key facts → current plan → next work. Scope content wraps and never merges branches.

States: skeleton replaces facts; empty plan says No applied plan rather than 0% complete; section retry; read-only keeps accessible historical context. Lead-exit On Hold displays Owner replacement path; cancelled displays terminal delivery state and separately approved closeout; do not assume every Completed/Archived record is uniformly editable/read-only.

Acceptance: SC03-A correct owning branch and named lead; B unauthorized project IDs disclose no metadata; C later template edits do not rewrite applied version; D lead-exit hold cannot resume without eligible Owner replacement; E staff cannot cancel; F cancelled delivery cannot reopen through UI/deep link; G required milestone gating remains enforced; H unavailable summaries remain unavailable rather than zero.

## SC-04 Project Tasks

Purpose: manage project work using the same task model as My Work. Requirements R-018–R-026; C-011/C-016/C-023.

Users/permissions: current permitted project staff; assignment/reassignment/closeout creation require their distinct capabilities. A project view alone does not grant management rights.

Data: project-scoped task identity/status/priority/owner/collaborators/target/committed dates/review requirement/waiting reason; count/pagination only where API supports them; stopped and closeout tasks remain distinguished.

Actions: search/filter/open; scoped creation/assignment through authorized forms; list versus board design comparison only. V1 board implementation, if selected later, remains informational unless a separate reviewed transition design is approved.

Desktop: rows with name, owner, state, priority and dates; compact-density comparison; mobile: cards retain fields and wrap filters. Board preview stacks columns at narrow width; never relies on drag interaction.

States: task skeleton, No project tasks, No filter matches, retry without losing project header, capability-based read-only and no stale writable state.

Acceptance: SC04-A every result belongs to the authorized project; B filters/counts include complete source scope or explicitly loaded-only scope; C create/reassign candidates obey reporting/project membership; D exited-owner unfinished task retains that current owner while Waiting and requires eligible individual reassignment before resume; E stopped delivery excluded from active lists and distinct closeout still follows approval; F board grouping does not silently change task state; G mobile dates remain labelled.

## SC-05 Project Reviews

Purpose: discover authorized project submissions and correction rounds. Requirements R-027–R-030/R-037.

Users/permissions: project-scoped read access plus REV evidence/file permission; deciding needs named independent reviewer capability. A personal review inbox is not assumed to be the complete project review register.

Data: task, round, submitter, named reviewer, exact revision when drawing-bound, submission/decision state/time, linked correction task and escalation/withdrawal evidence as permitted.

Actions: filter/open a round; open parent/correction task; open evidence; assign reviewer/start/decision only in detail with actual capabilities. No batch approve.

Desktop: project review rows; mobile: review cards with exact revision and next destination. Completed rounds separate from active work without deleting history.

States: skeleton; No submissions with permitted task navigation; filtered empty with Reset; retry; read-only historical rounds; inaccessible confidential evidence cannot leak preview/filename and cannot be treated as reviewed.

Acceptance: SC05-A project register excludes unrelated/denied rounds; B revoked file permission blocks evidence reads; C no implicit self-review authority; D historical correction/withdrawal/escalation retains identity; E selecting a round opens that exact snapshot rather than newest revision; F empty personal inbox is not presented as a complete empty project register.

## SC-06 Project Documents and drawing register

Purpose: find permitted files and distinguish revision, approval and issue evidence. Requirements R-030/R-035–R-039/R-079–R-080.

Users/permissions: scoped project/document readers; Confidential reads need all required exact ancestor/file grants; upload/Confidential classification/grants/issue remain separately authorized. Stream checks current access.

Data: folders/files; drawing identifier/title; immutable revision ID/label/blob reference; approval/current/superseded/issue state; author/date where allowed; transmittal/acknowledgement history; upload state where relevant. No raw NAS paths/credentials.

Actions: folder/register search; open permitted exact file; inspect revisions; upload/provision/create new revision/formal issue only through existing guarded commands. Global Documents uses project selection in v1 unless a cross-project authorized read model is approved. Mock global register is a review proposal, not current API evidence.

Desktop: folder navigation and revision table; mobile: folder breadcrumb then document cards; document viewer separate with usable zoom and exact revision header. Open/Download controls follow actual file policy.

States: loading without fake preview; empty folder/drawing register distinguished; upload progress/retry/finalization/abort distinct; retry preserves metadata; permission loss clears preview; read-only allows permitted viewing and suppresses writes; superseded warning remains visible regardless of date sort.

Acceptance: SC06-A Working R2 never displaces approved R1; B Superseded R0 says Do Not Use; C opening R1 streams that exact immutable file; D denied Confidential ancestor/file grants block direct stream; E no private path appears; F required approval/selected or CR issue gate cannot be bypassed by button/URL; G issue and acknowledgement history stays unchanged after newer upload; H upload finalization failure is not shown as success; I global search cannot expose denied project file names.

## SC-07 Task Detail

Purpose: understand work and carry out the next valid task operation. Requirements R-018–R-026/R-028; C-011/C-016/C-023.

Users/permissions: own/collaborator/current scoped readers; edit, state, wait, resume, reassignment, committed-date, extension, dependencies and closeout revocation use separate capabilities. Owner title alone does not fabricate a staff task identity.

Data: task identity/version/project/primary owner/collaborators/type/status/priority/description/checklist; target/committed date history; predecessor summaries with permitted hidden-count handling; waiting reason/cause/previous state; extensions; review requirement/link; correction parent; closeout approval; immutable changes.

Actions: relevant guarded next step; edit; Wait/Resume; request extension and select eligible approver; committed date change/reassign/dependency management for permitted actors; open linked review/correction. Require reason/version where existing contract does. Review-required completion uses REV gate rather than generic task status.

Desktop: title/actions, main work area with related evidence, side ownership/date facts; mobile: status/action → facts → checklist/dependencies → reviews → history. Action area never covers content.

States: skeleton; inaccessible/not-found generic safe state; empty checklist/history as appropriate; section error retry; read-only with reason; pending command disables duplicate write; conflict retains draft reason/description and refreshes current state; missing prerequisite shows precise next-step explanation.

Acceptance: SC07-A target/committed labels/history remain distinct; B dependency warning and early-start evidence survive; C extension does not change deadline while pending; D expectedVersion rejects stale writes; E ordinary Waiting resume differs from exit reassignment; F correction completion does not approve parent; G required internal review gates completion; H reasons/history/audit survive actual writes; I direct task-ID tampering denied.

## SC-08 Review and correction detail

Purpose: review a retained submission, make an independent decision and follow correction work. Requirements R-024/R-027–R-030/R-037/R-079–R-080.

Users/permissions: scoped authorized readers; named reviewer distinct from submitter/current owner with current review.decide and evidence access; management assignment/priority/deadline/correction capabilities separate. Owner is not automatically the named deciding reviewer.

Data: task/snapshot/version; round/submission identity; exact drawing/file/revision when applicable; reviewer/submitter; markup and annotations/page position; comments; category/severity and retained historical labels; decision; correction task; escalation/withdrawal; previous rounds.

Actions: assign reviewer, submit exact eligible revision, start, comment/markup, Approve or Request corrections with reason; separately assign correction owner; open correction task; revised submission/new round; escalate/withdraw; separately authorized priority/deadline changes. Prototype decisions are illustrative dialogs with no persistence and must say so.

Desktop: evidence area beside decision/context, retained round timeline below; mobile: exact evidence header → viewer/markup → decision → correction link → rounds. Selecting history does not replace the current write target silently.

States: evidence loading blocks decision; no submission offers authorized submission; missing revision indicates selection requirement; failed viewer blocks unverified approval; read-only/historical/withdrawn round has no decision writes; interrupted review explains current recovery path; conflict refreshes capabilities without automatically replaying decision.

Acceptance: SC08-A submitter/current owner cannot decide; B named reviewer without current grant/file access cannot decide; C decision binds exact submitted R revision despite newer upload; D category/severity/reason validation for corrections; E new correction task/assignment is permissioned and retains parent link; F round/comment/markup/decision immutable through resubmission; G exited reviewer/owner recovery obeys reassignment rules; H correction assignment privilege cannot be inferred from reviewer decision privilege; I approval writes audit/event and cannot bypass outstanding task/issue gates; J mobile/keyboard evidence and decision sequence usable.

## Later screen contracts

### SC08-C Conversational canvas — Owner-requested review direction, 2026-10-01

Design intent: make review feel like selecting part of an image and discussing a requested change beside it. Reference: [official ChatGPT image-editing interaction](https://help.openai.com/en/articles/11084440-images-in-chatgpt). This is interface inspiration; v1 planning uses human review comments/annotations and existing formal review commands. AI generation/editing is not included in this presentation decision.

- Desktop: persistent exact task/round/file/revision header; large PDF/image canvas with page/zoom controls; conversation panel beside it; clear formal decision area. Mobile: large canvas with accessible Feedback/Changes view, retaining exact evidence header and composer context; no tiny side panel or hover requirement.
- Flow: open exact submission → select page/location or general comment → describe requested change → post authorized feedback → inspect linked numbered pin/message → separately record Approve or Request corrections. A message is not a formal decision; Enter in the composer posts feedback, never approves.
- Structured message context: actor/time, exact submission/round/file/page and existing annotation coordinates when present. Category/severity/reason belong to the formal correction command under current rules. Use existing comments and immutable structured annotations; no new issue/resolved/accepted status model or automatic correction assignment.
- Composer authority: current S13 comment/annotation command requires the named independent reviewer with current project/file access. Other permitted readers see read-only feedback; chat styling does not give the submitter/current owner a reply right or imply unrestricted two-way messaging. Timeline entries can show existing task/review events without adding chat-message authority.
- Actual annotation shape: positive 1-based page; normalized x/y in [0,1]; annotation text. Map to the exact rendered page/image content rectangle, excluding viewer margins, and preserve positioning through fit/zoom/pan/rotation. Disable capture until page dimensions are known; validate page against the exact rendered file. Pin numbering is presentation over retained annotation identity, not a new mutable identifier.
- Pin-to-message and message-to-pin navigation share exact identity. General feedback needs no invented coordinates. Location input has a text/list alternative using page and location description. Zoom/rotation/page rendering must map positions to the existing coordinate contract; inspect actual renderer/DTOs before implementation. A brush/region/freehand tool is conditional on a reviewed supported markup contract, not implied by point selection.
- Human requested changes stay separate from submitted source bytes. Overlay toggles only change presentation. Do not repaint, erase, regenerate or replace the immutable evidence; a staff-authored revised upload is a new revision/submission/round through existing guards. Old feedback remains attached to old evidence.
- Historical rounds allow permitted inspection with read-only conversation/decisions. Changing round clears selection/composer attachment context and preserves recoverable draft text safely; it never silently retargets an unsent message. Conflicts require deliberate re-evaluation, no automatic decision replay.
- Viewer loading/failure disables location tools and decisions until exact evidence can be inspected. Unsupported files get honest permitted fallback and general feedback; no fabricated PDF/CAD preview. Read-only/access loss suppresses writes and clears protected canvas, comments, identities and cached selections on detection. No external AI upload or generic sharing action.
- Acceptance SC08-C1–C7: exact pin/message identity survives zoom and page changes; keyboard/touch/list equivalents; safe historical selection and unsent draft handling; failed/denied evidence cannot be decided; comments cannot become approval or bypass assignment; source checksums/evidence unchanged; revised round retains old feedback. Real permission, persistence, audit, concurrency and viewer behavior are future authorized application checks. This section is a design contract, not an implemented viewer.

Proposed next mockup: apply this anatomy to internal Review/Correction with fictional PDF/image-like evidence and a clearly labelled illustrative renderer. Include employee, independent reviewer, historical, failed-evidence and read-only cases before design acceptance. Optional before/after comparison remains research candidate 45 conditional on authorization of both exact streams. Automatic change suggestions or generated alternatives require separate S27/provider/security design and product authorization; they must never become approved drawings automatically.

Mockup checkpoint 2026-10-02: review-canvas.html demonstrates this anatomy with a clearly labelled fictional SVG drawing and local-only feedback/decision previews. 105 separate presentation checks passed; REVIEW_AND_VERIFICATION.md records fixes and evidence. Actual PDF rendering, real permissions/commands, human comprehension and full assistive-technology review remain unverified. Existing original Review screen remains available for comparison and links to the experiment. This does not freeze the design.

Owner correction, 2026-10-02: clicking a point opens a comment box beside that point on the canvas. Add a Rectangle tool: mark an area, then write feedback beside the marked area. The conversation list remains a secondary history/navigation view. The inline editor carries exact round/revision/page context, keeps its controls inside the viewport and has keyboard/text location alternatives. Rectangle bounds are normalized to the same rendered page and do not change source bytes. Rectangle geometry is a fictional design experiment: current S13 annotation DTO supports point x/y, not region bounds. Real region persistence/rendering requires a separately reviewed extension before application implementation; no silent flattening of a rectangle into an exact-region record. Existing reviewer, draft, history, access-loss and formal-decision safeguards apply. Earlier 105 checks predate this correction.

Handoff: UI_DELIVERY_PLAN.md maps core fields/actions to current owning read sources and unresolved complete-register/search/viewer contracts. Dedicated illustrative scene fixtures are in workflow-fixtures.html, with actual comprehension/accessibility findings to be recorded in DESIGN_REVIEW_WORKSHEET.md. These scene descriptions are not new persisted states. The fixture board supplements core R/A/V evidence and does not implement forms, commands or real access checks.

CRM, full Decisions, People, Administration and S14+ portal screens need this same contract template before their own implementation. Their placeholder presence in shell does not mean their detailed design or acceptance is complete. Broad UI implementation remains gated on the frozen reviewed package and relevant product slice authorization.

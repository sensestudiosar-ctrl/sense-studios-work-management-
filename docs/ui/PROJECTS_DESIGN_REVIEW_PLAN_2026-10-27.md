# Projects workspace design review

Date: 27 October 2026; engineering review resumed 28 October 2026. Status: design decisions complete; engineering review in progress. Application implementation has not started under this review.

## Brief and scope

Design the existing Sense Projects experience for Owners, project leads and authorized contributors on desktop, tablet and mobile. Cover the directory, project creation, Overview, Plan, Tasks, People, Documents, Reviews, Delivery and Activity. Tasks includes List, Kanban, Cards, Timeline, filters, creation, canonical detail, assignment and review routing. Owner selected all seven design review dimensions plus deeper Tasks and project-creation review.

Requirement anchors: PRJ R-011–R-013 and R-016, TSK R-018–R-024, internal/client review R-027–R-029 and R-037–R-039, and existing access/evidence rules. Confirm exact clauses against the approved sources before implementation. This is a design plan, not new workflow authorization.

## What already exists

- Approved design lock: `docs/ui/UX_REFERO_DESIGN_LOCK_2026-10-08.md`. It governs Sense forest/cream/gold tokens, operational typography and existing navigation. A new root DESIGN.md is not needed to supersede it.
- Project directory, focused project context, URL restoration and eight project sections in `apps/web/src/project.tsx` and `project-directory.tsx`.
- Shared canonical TaskWorkspace with List, Cards, Kanban and Timeline; protected creation-options and action capabilities. Task states and commands stay canonical.
- Independently authorized Documents and Reviews summaries in `project-resources.tsx`; exact final-approved drawings in the existing Confirmed drawings component.
- Project creation/template controls, uncertain-write recovery and separate domain command owners.
- Existing in-progress UX fixes and unrelated checkout changes must be preserved and reviewed separately before any selected-file commit.

## Research and reference lock

Primary foundation is the approved Sense design lock, including its Zelt surface hierarchy and Say Briefly emphasis. New research retrieved full Refero Linear, Wrike and Cron styles; these provide comparisons, not permission to replace Sense branding or import marketing layouts.

- Linear: restrained hierarchy and clear separation of navigation, work and contextual detail. Retain the Sense light theme.
- Workflow task board: https://refero.design/pages/e987bd0f-22ad-412f-853d-da7951262b34. Borrow separation of project context and board content.
- Weekrise board: https://refero.design/pages/7f4a082e-896d-4612-a1c7-32ee33df8cc2. Borrow nearby search/filters and clear column headers. Do not copy draggable transitions, arbitrary columns or sharing capabilities.
- Spline creation flow: https://refero.design/flows/260. Borrow a clear entry, submission confirmation and selected new-project context. Sense still requires its existing fields and creates Draft projects.
- OpenAI project creation flow: https://refero.design/flows/4186. Borrow context confirmation after creation; do not copy its simplified form or imply immediate Sense activation.
- Refero craft references: visible form labels, focus-visible rings, local errors, truthful recovery and URL-backed context.

Preserve the existing canvas #f4f1e9, surfaces #faf8f2/#fffdf7, pine ink/actions #182c29/#29463d, hairlines #d9d8cd, active surface #e3eadf and gold focus/accent roles. Preserve existing application typography per the approved lock. Status hues remain semantic. No decorative imagery is required.

## Decision ledger

| Decision | Source | Role / rule | State |
|---|---|---|---|
| Full review plus deeper Tasks and creation | Owner D1 and “B also” | All pages remain in scope | Approved |
| A: focused project workspace, horizontal sections | Owner D2, Refero task patterns | Give the selected section the primary work area | Approved |
| Restore directory context on return | Owner D2 and existing URL contract | Preserve search, branch, sort and page | Approved |
| Focused project creation inside Projects | Owner D4 | Back/Cancel returns to the directory context; existing Draft command | Approved |
| Consistent task-detail panel across all four views | Owner D5 | Desktop side panel; mobile full-screen; return to originating view | Approved |
| One primary surface per project section | Owner D6 | Dividers and spacing for ordinary content; interaction boundaries retained | Approved |
| Labelled project-section picker on phones | Owner D7 | All eight destinations; current section visible; desktop horizontal nav retained | Approved |
| Single-column phone Kanban with status picker | Owner D8 | All thirteen states and page counts retained | Approved |
| Preserve Sense visual identity | Existing approved reference lock | Color and type roles remain product-specific | Existing approved constraint |
| Independent section state and recovery presentation | Owner D3 | Preserve project context; feedback stays inside the affected section | Approved |

## Information architecture: approved direction A

```text
Existing Sense application navigation
  Projects directory: heading + authorized count + New project
    Search / supported filters / Cards–List / pagination
    Select project
      Project header: identity, branch, delivery type, lead, real status
      Overview | Plan | Tasks | People | Documents | Reviews | Delivery | Activity
        Selected section fills the available work area
        Tasks: one toolbar + List / Kanban / Cards / Timeline + canonical detail
      Back to projects restores directory context
    New project: existing Draft creation workflow, detailed composition pending
```

Directory counts must distinguish matching totals from page size. Board column counts currently describe the page, not the whole project. All thirteen canonical task states must remain represented; no merged status or drag transition is approved. Keep supported task scope, filters, view and task/project selection through the current URL contracts.

Pass 1 assessment: 4/10 before the navigation decision; 8/10 after direction A. Detailed creation, task-detail and mobile composition remain for the subsequent passes. This score describes plan completeness, not verified live-interface quality.

## Design sketch evidence

Experimental HTML: `C:/Users/HI/.codex/visualizations/2026/10/27/01a17d2c-65ff-74a2-a752-5cc520c7abf8/projects-design-review.html`.

Directions A/B/C are navigation studies using invented records. The Owner selected A's workspace direction. This does not approve every sample control, sample field, example action or layout detail. The gstack designer binary was unavailable; browser rendering was blocked by Work settings, so rendered QA is not claimed. The permitted visualization directory holds this local sketch; the skill's preferred ~/.gstack artifact directory is outside this session's writable roots.

## NOT in scope

- New permissions, business states, task-status grouping, drag-to-transition behavior, schema changes or default policies: existing domain rules remain authoritative.
- A competing frontend or backend: any later approved implementation maps to existing apps/web routes and APIs.
- Automatic migration or promotion of retained staging: exact candidate acceptance and matched-release deployment remain separate gates.
- Whole-application branding replacement: retain the existing approved Sense lock.

## Remaining review passes

2. Interaction states and safe recovery: section-local feedback approved in D3; matrix below.
3. User journeys and emotional arc: approved D4/D5; specification below.
4. Specificity and generic-design risks: approved D6; specification below.
5. Design system alignment: evaluated; existing approved tokens/components suffice.
6. Responsive and accessibility: D7/D8 approved; specification below.
7. Remaining decisions and implementation task synthesis: evaluated; no new product-design choice remains open.

## Interaction state coverage: approved D3

Project identity and navigation remain visible while an individual section loads or fails. Initial project authorization is separate: do not show protected project metadata until the project read succeeds; clear protected content after session expiry or revoked access. Independent errors never imply that hidden records do not exist.

| Feature | Loading | Empty | Error / unavailable | Success | Partial |
|---|---|---|---|---|---|
| Directory | Reserved result area; count reads Updating | Distinguish no authorized projects from zero filter matches; offer authorized creation or Clear filters | Retry directory; count unavailable | Real authorized total and page range | Do not infer absent metadata or totals |
| Overview | Reserve factual project fields | Identify unassigned lead or unapplied plan explicitly | Local message with retry | Show confirmed project state | Unavailable facts are labelled, not synthesized |
| Plan | Section loading indicator | No applied plan; authorized setup action | Local retry or capability-specific unavailable state | Existing stages, milestones and gates | Keep confirmed entries distinct from unavailable content |
| Tasks, all views | Stable toolbar and result area; no stale project tasks | No tasks versus no matching tasks; authorized New task or Clear filters | Local retry; access denial distinct from empty | Same authorized filter/page across views; exact task detail | Page-only board counts; unsupported totals never estimated |
| People | Reserve lead/contributor regions | No lead / no additional contributors | Retry or generic access message | Confirmed assignment and lead changes | Separate lead and contributor drafts; capability-bound actions |
| Documents | Separate file and Confirmed drawings loading | No accessible files / no final-approved evidence | Document access guidance; retry only for retryable reads | Exact accessible files and approval evidence | One resource may succeed while the other remains unavailable |
| Reviews | Reserve waiting-round list | No waiting accessible rounds | Local retry or access guidance | Exact round identity and canonical destination | Clearly label preview count and supported total |
| Delivery | Reserve applicable links/context | Explain no applicable delivery action | Local retry or unavailable state | Links reflect real type/state/capability | No invented progress or inferred Site authority |
| Activity | Reserve history area | No recorded history available | Local retry | Existing authorized history | Do not treat truncated history as complete |
| Project/task creation | Keep entered values while dependencies load; submit shows pending | Clear required fields and optional setup | Inline validation, actionable read errors and existing uncertain-write recovery | Confirmation only after a confirmed command | Creation success and subsequent detail-read failure are distinct |

Status text is announced without moving focus on ordinary refresh. Field errors associate with their inputs; submission errors focus an error summary or first invalid field. A new project/section request cannot display an earlier response under the new identity. Mutation recovery must use existing server-supported receipts and versions, never a generic automatic retry.

Pass 2: 4/10 → 8/10 for design specification after D3. Responsive presentation and interaction verification remain open.

## User journey review: approved D4/D5

| Step | User goal / likely concern | Design requirement |
|---|---|---|
| Find a project | Locate the right work quickly | Search/filters with factual metadata and matching totals |
| Open project | Know where they are | Stable project identity and section navigation |
| Switch task view | Scan the same work differently | Preserve filters, scope, page and selected task where supported |
| Open task | Act without losing the queue | Canonical detail and explicit return to prior context |
| Create project | Understand fields and the resulting state | Focused form; visible branch/template/scope relationships; Draft outcome |
| Resolve a failed submission | Avoid losing work or making a duplicate | Existing uncertain-write recovery; retain draft; distinguish confirmed success from failed follow-up read |
| Continue setup | Know the next authorized action | Newly created Draft context with existing People and Plan paths |

### Project creation: approved D4

Open a focused Create project view inside the existing Projects route. Keep visible Back/Cancel controls and restore directory branch, query, sorting and page on return. Dirty draft and pending-command guards must remain. Confirm route/query details against existing guards during engineering review; do not invent a competing creation endpoint.

The form groups project identity and owning branch first, delivery type and optional template next, then the resulting service scopes and client/Won-lead relationships. Keep all current required fields, validation and template-version consequences. A short outcome panel states that the result is Draft. Show template-supplied scopes/plan facts with their real provenance; do not imply editable derived values when the current contract locks them.

Submit through the existing command. Confirm success only when creation is confirmed, then enter the returned canonical Draft project. Present existing People and Plan setup paths without implying automatic lead assignment, activation or approval. A successful creation followed by a failed detail read must offer reopening the confirmed project, not a second creation. Uncertain writes retain the existing supported recovery path.

### Task opening: approved D5

Use the same task-detail side panel for List, Kanban, Cards and Timeline on desktop; use full-screen detail on mobile and whenever a useful panel width cannot coexist with the source view. Preserve canonical project/task URL identity, draft guards, filters, scope, page and view. Restore source focus and scroll on close, including the Kanban horizontal position. Label the return action for the actual originating view rather than calling every view a list. Deep links without an opening row return to the same project's Tasks section.

Reuse the existing TaskDetailDrawer where its semantics fit, with all canonical overview, checklist, evidence, activity and permitted actions. Do not transplant My Work-only filtering or authority. Keep commands subject to current capabilities, version/reason rules and denial clearing. During loading, show the selected identity only when authorized; never show a previous task under a new heading. Keyboard and close/dirty-draft behavior will be specified in Pass 6.

### Task creation journey

Retain the shared canonical task composer and current role/capability-aware fields. Keep the selected project explicit and locked when opening from Project Tasks. Make primary-owner selection discoverable only for actors whose creation-options permits assignment; distinguish the owner from optional collaborators. Show task brief, reason and timing with visible labels; retain all supported planning, checklist, tags, priority and effort fields through explicit optional disclosures. Preserve existing validation limits and supported payload mapping.

Show only supported review routes and the ordinary independent-reviewer appointment path before submission. Do not invent named-reviewer creation fields, recurrence schedules or automatic delivery authority. Pending submission retains values and blocks duplicate commands. A confirmed result opens the returned canonical task in the selected project's detail panel. Failed validation retains fields and focuses the error; uncertain commands use existing recovery support. Do not promise a newly created task will match the old filters or appear on the current page; make its confirmed detail available independently.

### Journey acceptance

Five-second orientation: project identity, current section and available primary action are immediately visible. Five-minute work: switch views, open/edit a task, create work and return without losing context. Long-term trust: exact evidence, factual counts, clear denied/unavailable states and confirmed outcomes. Test Owner, authorized lead and contributor journeys separately, with slow network, uncertain creation, stale versions and permission revocation.

Pass 3: 4/10 → 8/10 after D4/D5. Detailed responsive and focus behavior remains in Pass 6; no runtime acceptance is implied.

## Specificity and generic-design risk: approved D6

Classifier: APP UI. Use restrained operational layout with one accent, factual metadata and utility language. The existing approved Sense palette remains intentional brand context; it is not a reason to add editorial hero styling or ornamental serif word swaps.

Finding: nested panels, filter frames, task workspace containers and per-section boxes can compete with the task rows and editable form. Existing CSS includes rounded/shadowed project panels and separately framed task controls. Owner D6 selects one primary section surface, whitespace and dividers for ordinary content. Retain meaningful boundaries for interactive cards, dialogs and real grouped controls. Do not remove a boundary needed for contrast, state, focus or interaction.

Reference checks: Sense remains identifiable; project title is the visual anchor; headings state each section's job; task cards exist because they open tasks; motion only indicates opening/closing or state change; the interface should remain legible with decorative shadows removed. No marketing imagery, promotional hero, fake progress metric or status-colored ornament is proposed.

Pass 4: 5/10 → 8/10 in the design specification. Rendered comparison remains unverified.

## Design system alignment: Pass 5

No new design-system decision is needed. The approved lock and existing --sense-* tokens already define the foundation. Consume --sense-surface, --sense-surface-muted, --sense-surface-active, --sense-ink, --sense-ink-strong, --sense-ink-muted, --sense-border, --sense-pine-2 and --sense-focus through scoped project/task tokens. Avoid raw per-screen color overrides. Semantic danger, warning and status styles retain their current roles.

Reuse --sense-font-ui under the approved typography policy. Operational titles use the existing application face, never decorative serif/italic word swaps. Use 28/24px page/project headings, 20px section headings and 16px body/form controls as planning targets; secondary metadata may use 14px where legible, with essential status/action information at normal reading size. Validate actual type metrics and contrast in rendered views. Use the existing 4/8px spacing rhythm; reserve larger gutters for page/section separation. Retain existing control/panel radius tokens only where a bounded component is needed; ordinary section content is unboxed per D6.

Reuse canonical ProjectDirectory, ProjectPlan, ProjectRelationships, ProjectTemplatePanel, ConfirmedDrawings, ProjectResourceSummary, TaskWorkspace, TaskComposerFields, TaskCreateDialog and TaskDetailDrawer rather than duplicate business UI. Any drawer adaptation must be scoped to presentation with permission-aware inputs. Existing task views, confirmation rules and evidence components remain available. Common action components should preserve consistent focus, disabled, pending and error states.

Pass 5: 7/10 → 8/10 from explicit token/component mapping. No issue requiring a new Owner decision. Final alignment depends on rendered verification.

## Responsive and accessibility: approved D7/D8

Verify 1440, 1024, 768, 390 and 320px widths plus landscape and 200% zoom. Desktop retains the existing application shell and approved horizontal project navigation. On tablets, controls wrap intentionally and the task panel expands full-screen if its minimum usable width and the source view cannot coexist. On phones, preserve project identity, readable status and section heading; creation forms become one column with reachable submit/cancel controls and no keyboard-obscured fields. Never shrink controls or labels to fit desktop density.

All actionable targets are at least 44px high with visible labels and focus. Dialog/panel behavior follows the reused modal component: labelled title, focus entry and containment, inert background, Escape/close through the existing dirty/pending guards, and focus restoration to the originating task or an appropriate Tasks heading if that element disappeared. Keyboard users can perform every authorized action without dragging. Do not announce pagination or refresh as command success. Honor reduced motion and avoid animation that delays action.

Long project names, employee identifiers, task titles and all thirteen task-state labels must wrap without overlap. Critical data cannot disappear at narrow widths; list rows can use labelled summaries with supplementary fields accessible through the same task detail. Timeline remains a list of recorded dates, with no invented duration bars. Column overflow is restricted to the Kanban region, never the page.

### Mobile project navigation: approved D7

Use a visible label, Project section, and an accessible native selector on phones. Include all eight current sections, show the selected section and keep its heading below. Preserve the existing section URL values and Back/Forward behavior. A selection change passes through the same dirty-task and pending-command guards as desktop navigation; a cancelled change restores the prior selection. Do not hide project identity to make room. Desktop retains horizontal section navigation, with overflow handling at intermediate widths.

### Mobile Kanban: approved D8

Show one status column at a time on phones, with a labelled Kanban status picker containing all thirteen canonical states and their current-page counts. Keep the selected column when opening/closing a task. If the selected state has no tasks on this page, show that fact rather than silently jumping columns. Desktop retains individually labelled lanes with contained horizontal scrolling; preserve all state labels and avoid stacking all thirteen columns into a long multi-row grid.

Counts describe the same filtered current page; a zero count is not evidence that the project has no such tasks. Selecting a displayed column is a presentation control, not a task-state transition or a new server filter. Retain supported filtering, paging and exact task access. Do not merge review states or add drag actions.

For touch, show a clear task-opening control and full labels. For keyboard use, native selectors expose every status; focus remains stable through presentation changes. Keep board scroll separate from the document; open task detail through the same D5 behavior. Column selection must not alter the list/timeline data set.

Pass 6: 4/10 → 8/10 for explicit responsive and accessibility requirements. Runtime checks remain acceptance tasks.

## Remaining decisions: Pass 7

No additional product-design decision was identified after D1–D8. The selected navigation, section-local states, focused project creation, canonical task panel, surface hierarchy and phone patterns form one coherent direction. Engineering review must resolve implementation details against the existing URL/draft guards, resource contracts and shared component callers. If it uncovers a material business-rule conflict, return to the Owner before changing that rule.

The following are verification obligations, not unresolved taste choices: rendered review at the required widths, keyboard/screen-reader checks, authenticated role journeys, source/permission regressions and exact candidate acceptance. No independently reviewed implementation or deployment is claimed.

### TODO disposition

No separate deferred design-debt item is proposed. All identified accessibility, mobile, empty-state and recovery work is included in the implementation tasks below. TODOS.md is therefore unchanged; no item was silently deferred.

## Implementation Tasks

Synthesized from review findings. Estimates are rough planning ranges, not elapsed-time guarantees. Human estimates describe a small team; Codex estimates exclude approval waits and environment setup.

- [ ] **T1 (P1, human: ~1 day / Codex: ~1–2h)** — Projects shell and directory — Implement the focused project frame and context-preserving navigation.
  - Surfaced by: Pass 1 / D2; competing directory and project context.
  - Files: `apps/web/src/project.tsx`, `project.css`, `project-directory.tsx`, `project-directory.css`, `projects-route.tsx` only if routing requires it.
  - Verify: project directory, URL restoration, deep-link, loading-race and project-task-context tests; Back/Forward across branch/search/page.
- [ ] **T2 (P1, human: ~1 day / Codex: ~1–2h)** — Project creation — Move the existing Draft form into the focused create view.
  - Surfaced by: Pass 3 / D4; form below the directory obscures its scope and outcome.
  - Files: `apps/web/src/project.tsx`, `project.css`, `project-relationships.tsx`, `project-template.tsx` as needed.
  - Verify: creation flow, template/client/Won-lead constraints, Cancel/draft guards, duplicate submission, uncertain command and confirmed-create/read-failure recovery.
- [ ] **T3 (P1, human: ~1–2 days / Codex: ~2–3h)** — Project task detail — Adapt the canonical task panel for all four views.
  - Surfaced by: Pass 3 / D5; detail composition differs between list and non-list views.
  - Files: `apps/web/src/task.tsx`, `task-detail-drawer.tsx`, `task-detail-drawer.css`, `task.css`, existing project task integration tests.
  - Verify: opening/closing and Back/Forward from all views; exact project/task identity; dirty/pending guards; all permitted commands; no My Work regression.
- [ ] **T4 (P1, human: ~1 day / Codex: ~1–2h)** — Task views and phone Kanban — Preserve one task dataset and implement readable canonical lanes.
  - Surfaced by: Passes 1/6 and D8; thirteen-state board and page-count semantics.
  - Files: `apps/web/src/task.tsx`, `task.css`, task view/filter/context tests.
  - Verify: same filters/scope/page across List/Cards/Kanban/Timeline; every state available; page-only counts; selected phone status survives detail; no drag transition or invented timeline duration.
- [ ] **T5 (P1, human: ~1 day / Codex: ~1–2h)** — State feedback — Apply section-local loading, empty, error and partial-access patterns.
  - Surfaced by: Pass 2 / D3; users must distinguish empty data, unavailable access and failed reads.
  - Files: `apps/web/src/project.tsx`, `project-resources.tsx`, `confirmed-drawings.tsx`, owning section components only as required.
  - Verify: denial/expiry clears sensitive content; late responses rejected; resource failure isolated; retries retain context; no duplicate writes.
- [ ] **T6 (P2, human: ~1 day / Codex: ~1–2h)** — Section hierarchy — Refine Overview, Plan, People, Documents, Reviews, Delivery and Activity with one primary surface.
  - Surfaced by: Passes 4/5 and D6; nested framing and competing headings.
  - Files: `apps/web/src/project.tsx`, `project.css`, `project-directory.css`, `project-resources.tsx`, relevant shared components if needed.
  - Verify: existing actions/fields remain discoverable; canonical evidence/round links; lead/contributor independence; semantic statuses; token/contrast review.
- [ ] **T7 (P1, human: ~1 day / Codex: ~1–2h)** — Mobile and accessibility — Implement D7 section picker and reliable focus/zoom behavior.
  - Surfaced by: Pass 6; eight sections and task detail must remain operable on phones.
  - Files: affected Project/Task components and scoped CSS; existing keyboard/responsive tests.
  - Verify: 320/390/768/1024/1440px, landscape, 200% zoom, reduced motion, 44px targets, dialog focus/Escape/restoration, long labels, page-level overflow.
- [ ] **T8 (P1, human: ~1 day / Codex: ~2–3h)** — Acceptance — Verify the exact selected implementation and rendered direction before release.
  - Surfaced by: all passes; sketches are not runtime evidence.
  - Files: relevant web tests and existing `tests/e2e` project/task journeys; acceptance records.
  - Verify: pinned Node/pnpm checks; Owner/lead/contributor authenticated journeys; affected permission/persistence regressions; visual comparison to this plan and updated sketch. Commit explicit selected files only; deploy a matched approved candidate through the existing staging workflow.

Tracked JavaScript mirrors must follow the repository's existing build conventions; do not silently leave TSX and executed JS behavior different.

## Completion summary and evidence limits

| Pass | Initial → planned completeness | Outcome |
|---|---|---|
| 1 · Information architecture | 4 → 8 | D2 focused workspace |
| 2 · Interaction states | 4 → 8 | D3 matrix and isolated recovery |
| 3 · Journey | 4 → 8 | D4 creation, D5 detail, composer/recovery specification |
| 4 · Specificity / generic-design risk | 5 → 8 | D6 one primary surface |
| 5 · Design-system alignment | 7 → 8 | Existing tokens/components mapped; no new decision needed |
| 6 · Responsive/accessibility | 4 → 8 | D7 section picker and D8 phone Kanban; verification requirements |
| 7 · Remaining decisions | 0 open choices | No further material design ambiguity identified |

Overall plan completeness: 4/10 → 8/10. These scores assess the written design specification, not rendered quality or passing runtime acceptance. Eight Owner decision points resolved; no design decision intentionally deferred. One HTML sketch set produced and updated; no generated bitmap mockups or rendered browser verification. The Owner approved direction and interaction choices, not a pixel-exact screenshot.

Source inspection and Refero research informed the review. Both HTML scripts passed a JavaScript syntax check; no browser rendering, application tests or full verification were run for this planning-only work. Actual model: GPT-6.1 Sol; no Opus/Sonnet or independent model review claimed. Engineering review is the next required gate. Run visual design QA after implementation. The optional autoplan task JSONL aggregation is unavailable because jq is not installed; the full task list remains in this plan.

Local gstack review-log and review-read both ran successfully at HEAD 71b01cd. The available local log contains this design-plan review only; skip_eng_review is false. Readiness: Design CLEAR (FULL, written plan); Eng missing; CEO/Adversarial/Outside Voice not run in the available log. Overall shipping verdict: NOT CLEARED, engineering review required. No unrecorded review is inferred from historical completion reports.

## Engineering review: architecture decision E2

Owner approved keeping TaskWorkspace as the sole task state/command owner and extending the existing drawer presentation. Existing protected reads, creation options, command handlers, optimistic-version checks, reasons, evidence loading and leave guards remain in that owner. The drawer receives canonical content/callbacks and handles visual layout, modal focus and scrolling. Render each task's editors once; never leave a hidden duplicate inline form behind the drawer. Project context uses the existing projectTask… URL namespace and exact project identity checks. My Work and organization Tasks retain their current behavior unless explicitly covered by a bounded shared presentation change and regression checks.

```text
Projects URL / section selection
  -> ProjectWorkspace + leave guard
      -> TaskWorkspace (projectContext; protected reads; drafts; commands)
          -> List | Cards | Kanban | Timeline (one authorized page)
          -> TaskDetailDrawer (one mounted canonical detail)
              -> close / navigate / mutate callbacks -> TaskWorkspace
                  -> existing API -> permission/version checks -> persistence
```

Failure cases to verify: changed project during a late detail read; permission revoked while open; dirty task cancelled navigation; create result outside current filters; pending command during close; deep-link close without an originating history entry. Never resolve these through a second task controller or implicit data grants. Architecture pattern is existing component composition; no new infrastructure, package, backend service or migration is proposed.

Architecture review: E2 resolved; implementation remains pending. Code-quality review is in progress, with task-close duplication under evaluation.

## Engineering review: code-quality decision E3

Owner approved one TaskWorkspace close handler for Project task Close, Escape and Back controls. Reuse the existing guard and history fallback; do not duplicate command/draft state in the drawer. Return labels reflect List, Kanban, Cards or Timeline. Browser popstate remains handled through existing context guards rather than recursively invoking history.back. Verify denied close restores both URL and visible selection. Adapt shared behavior only where needed; keep unrelated My Work and organization-task semantics intact. Update nearby comments and ensure tracked JS mirrors match executed source.

Code-quality review: E3 resolved. Avoid broad extraction of project forms or generic navigation frameworks merely to change their presentation. Existing resource-summary parsing already validates project and round identity; retain those checks.

## Engineering test review: current coverage and planned paths

Frameworks inspected: Vitest + Testing Library with jsdom for web units, Playwright for authenticated browser journeys, existing API/PostgreSQL gates for owning domain behavior. This planning review has not run these tests. Existing assertions are evidence of coverage structure, not a fresh passing result.

```text
CODE PATHS                              USER FLOW / REQUIRED COVERAGE
ProjectWorkspace URL + request guards   Find/open/switch project
  existing project-loading-race tests     late reads / Back already represented
  existing project-task-context tests     project/task URL isolation represented
  GAP: focused create-view URL            Cancel, reload, dirty draft, confirmed ID
TaskWorkspace -> shared task drawer      Open/close from all four project views
  existing drawer unit tests              modal, Escape, focus, pending represented
  GAP: project-mode composition           once-mounted editors, exact project guard
  GAP: source scroll + history            [E2E] board scroll, direct-link fallback
Phone section / status selectors        Change section / displayed Kanban column
  GAP: rejected navigation                prior selector + URL restored
  GAP: status and page semantics          13 states, zero-page count, no mutation
Shared callers                          My Work + organization Tasks regression
  existing suites                         rerun after shared changes
  GAP: actual browser modal composition   [E2E] inertness, focus, keyboard, mobile
```

No LLM/prompt code or eval is involved. No coverage percentage is claimed from this bounded source audit. Existing task/project persistence tests continue to protect unchanged commands. Add tests alongside changed behavior, including project-specific drawer integration in `project-task-context.test.tsx` or a focused adjacent test, creation view/recovery in `project-creation-flow.test.tsx`, and phone presentation assertions in task/project view suites. Browser interaction coverage must verify real native modal behavior because jsdom tests explicitly stub showModal/close. Test strategy decision E4 is pending before finalizing browser-spec placement.

## Engineering test strategy: approved E4

E4 supersedes the pending note above. Add `tests/e2e/projects-redesign.spec.ts` using existing authenticated fixtures, isolated database guards and current server startup conventions. Do not create a test-only product route, bypass authentication or seed retained staging. Keep current project/task persistence journeys and shared-caller tests. Cover Owner, authorized lead and contributor permissions with real backend outcomes.

Browser cases: List/Cards/Kanban/Timeline open the same canonical task and return with filters/page/view intact; modal focus, Escape, backdrop and Close obey E3; dirty task prevents section/project departure; deep-link close has a safe fallback; phone section picker restores its previous value when navigation is rejected; all thirteen phone Kanban statuses remain available; a zero page count stays honest; creation Cancel restores directory context; confirmed creation opens its canonical ID; uncertain creation and failed follow-up read never create a duplicate. Verify one editor instance, no background interactions while modal, and no unrelated task metadata after denial or a late response. Reuse existing server/API tests for persistence; add new domain tests only if implementation changes a domain path.

## Engineering performance review

No new performance defect was established from this source review. Existing task page reads are bounded and the load callback depends on query context, not display view (`task.tsx:420–426`). Kanban renders from `visiblePage.items` (`task.tsx:1118`). Preserve that property: changing List/Cards/Kanban/Timeline or the phone-displayed status must not issue a new task read or alter the server query merely for presentation. Keep current authorized refresh, mutation and permission-revalidation behavior. Do not add cross-account or cross-project caches.

Documents and review summaries mount only for the selected section; retain this rather than prefetching all sections. Existing abort/generation guards in ProjectResourceSummary must remain. Avoid mounting both old inline detail and modal content: that would duplicate editors, effects and identifiers. The existing 50-row page bound does not justify introducing virtualization or a new data-fetching library in this presentation slice. Add request-count assertions for view/status switches and verify that project changes and explicit refresh still reauthorize normally.

Performance review complete with preservation requirements; no additional Owner decision is needed.

## Engineering acceptance failure matrix

| Planned path | Realistic failure | Required check / handling | User sees |
|---|---|---|---|
| Focused creation | Request accepted but connection lost | Existing receipt-aware recovery; unit + browser case | Uncertain outcome with supported recovery |
| Post-create opening | Detail read fails after confirmed save | Keep canonical result ID; retry read only | Created confirmation plus reopening action |
| Task panel | Permission revoked or wrong project returned | Existing authorization/context validation; integration + browser | Generic unavailability; protected content cleared |
| Closing | Dirty draft or pending command | Shared E3 guard; all close triggers tested | Guarded stay/leave behavior without silent loss |
| Project switching | Old request finishes late | Generation/context guard; existing race suite plus project drawer case | Only current authorized context |
| Phone selectors | User rejects navigation | Restore selector and URL; unit + browser | Prior section/status remains selected |
| View switching | New view resets filters or refetches | Shared state and request-count assertions | Same work in the selected presentation |
| Shared drawer caller | Projects changes affect My Work | Existing drawer/My Work/register suites | Existing caller behavior retained |

These are mandatory planned tests, not fresh passing results. No silent failure is intentionally accepted. Implementation remains incomplete until these cases and applicable full gates pass.

## Engineering execution and remaining review

Sequential implementation, no parallelization opportunity: the changes share ProjectWorkspace/TaskWorkspace and scoped CSS. Stage 1 reconciles latest deployed source and implements focused frame/creation; Stage 2 implements the shared task panel and close path; Stage 3 completes task views/mobile selectors and section feedback; Stage 4 runs role/browser/visual acceptance and exact selected-file review. Existing eight tasks remain in scope; E2–E4 refine T2–T5/T7/T8. No separate deferred TODO is proposed.

Architecture, code quality, tests and performance have been evaluated. Independent outside-voice review remains to be decided; engineering review is not yet logged as complete. No code changes or tests were executed as part of this plan review.

## GSTACK REVIEW REPORT

Engineering scope checkpoint, 28 October: Owner instructed continue after the recommendation to preserve full coverage in bounded stages. Proceed with that execution strategy; do not reduce approved page coverage. Live source is now HEAD 17eb1e4, beyond the prior design-log HEAD 71b01cd. CURRENT_STATE records subsequent directory, inner-project and task-composer releases. Reconcile each implementation task with that current source so accepted refinements are retained rather than reimplemented or overwritten. Architecture review is in progress; no engineering clearance is claimed.

| Review | Trigger | Why | Runs | Status | Findings |
|---|---|---|---|---|---|
| Design Review | /plan-design-review with Refero | Full Projects experience | 1 | design plan complete; visual verification pending | 4/10 → 8/10; D1–D8 settled; eight implementation tasks |
| Eng Review | /plan-eng-review | Architecture, shared callers and tests | Not run for this plan | required | Validate task drawer reuse, route/draft recovery and affected contracts |

VERDICT: Written design plan complete; engineering review required. Browser rendering and implementation acceptance remain unverified.

NO UNRESOLVED DECISIONS

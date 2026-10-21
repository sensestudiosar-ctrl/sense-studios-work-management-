# Sense Studios — consolidated My Work demo parity plan

Date: 13 October 2026
Revision: 1.2 reviewed plan
Mode: HOLD SCOPE
Status: PLAN REVIEW COMPLETE. CEO D1–D4 and engineering E1 are settled; engineering architecture/code-quality/test/performance review is complete for this document. This does not certify the current application or authorize a database/host run. MW-I02 remains IN PROGRESS.

## 1. Outcome and authority

My Work answers: **What should I work on now, and what is my next permitted action?**

Use the exact Owner-supplied Final Demo for visual structure and interaction, subject to the explicitly retained application rules and D4 contrast exception. Reuse existing task, review, approval, document/evidence, time, workforce and Site workflows. Shared presentation does not turn their records into one Task lifecycle.

Primary reference: D:/1.Sensestudios/DR RAJA/01.Designer/03. Renders/AFTERPHOTOSHOP/Sense_Studios_My_Work_Final_Demo.html
SHA256: F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8.
It matches D:/SCRAP/prototype (2).html. Do not substitute older demos or generic monday task boards.

Relevant requirements: R-018.a–b ownership/collaboration; R-019.a–c assignment/self-creation; R-021.a–b fields; R-022 priority; R-023.a separate Target/Committed; R-024.a–b lifecycle/history; R-027–R-029 review/correction; R-037 exact evidence; R-006/R-079/R-080/R-092 access/audit; R-096–R-097 attention; C-011/C-023/C-024 cancellation/exit/human decisions.

### Decisions recorded in this review

| ID | Owner decision | Consequence |
| --- | --- | --- |
| D1 | Hold scope | Complete the requested plan; no speculative expansion |
| D2 | One globally ordered server-paged attention queue | Do not concatenate frontend pages; retain separate Tasks/Reviews/Decisions counts |
| D3 | Task-only filters visibly select Tasks; Clear restores mixed work | Never apply task status/owner meaning to a review or approval |
| D4 | Exact status fills, darker labels on three low-contrast badges | Preserve fills; use #0b100d for Not started/In progress/Completed labels; minimally strengthen secondary text/focus where required |
| E1 | One composer-owned read snapshot | All source ports use one RepeatableRead transaction and readAt/calendar context; count/order/page derive from the same eligible set |

Existing repository decisions also approve bounded source work for actor-action-specific reads, one-level same-project subtasks and optional Owner-configured creation presentation. Their current implementation is in progress. This plan preserves that work; it does not start it again.

## 2. What already exists and what remains

| Capability | Current boundary | Plan treatment |
| --- | --- | --- |
| Studio colours/shell/notification styling; compact cards; mobile collision corrections | Implemented; earlier evidence preserved | Retain; no shell redesign |
| Search/Filters/chips/Clear, circular People, List/Cards/Kanban/Timeline | Existing working components | Extend only supported contracts; regress all callers |
| Browser-local saved views/basic Customize | Implemented, account-scoped | Preserve; no server preference store |
| Task opening drawer | Native right drawer/full mobile, four tabs, dirty/busy guards, canonical commands | Reuse; remaining rich context remains gated by existing slice sequence |
| Owner personal zero and genuine management holds | Accepted bounded behavior | Preserve independent count/disclosure/access |
| Creation role profile | Nullable JobRole setting, resolver/setup/configuration source present | Finish/review/persist-test; hint is presentation only |
| Real subtasks | TaskSubtaskLink, child endpoints/policy/migration source present | Finish all completion/security/concurrency proof and authorized child UI |
| Actionable reads | Review/approval work in progress; no completed global projection established | Complete domain ports and server composition |
| Final current-source acceptance | Not run for the concurrent candidate | Source freeze, complete checks, then separately authorized real-browser/persistence acceptance |

Do not equate historical141 affected drawer tests or intermediate347 web tests with a current whole-tree PASS. Later session/source additions and118 source migration directories are outside those earlier acceptance boundaries. Retained preview was115; no migration deployment occurred during this planning work.

## 3. Architecture and source identities

```text
authenticated actor + validated query
                 |
        My Work read composition
          /          |          \
     Task port   Review port   Approval port
     current     named round  pending/unexpired/
     action      + evidence   delegated/domain decision
          \          |          /
       authorized typed summaries + source states
                 |
      source-aware filter -> dedup -> stable order -> page
                 |
        shared compact work-row presentation
                 |
        exact task / round / request destination
                 |
       owning command reauthorizes under its locks
```

Proposed endpoint: GET /api/v1/my-work/attention. Register a small read composer/controller using existing Nest application conventions; do not add a new persistent WorkItem table, generic write endpoint or second permission engine.

Each row carries source, sourceId, canonical taskId/roundId/requestId only where real and authorized, title, authorized project context, responsibility, typed reason, applicable deadline plus deadline kind, optional existing priority, and an owning-domain destination/action descriptor. Do not infer links from arbitrary approval sourceId.

Stable keys are source-qualified. Tasks with multiple attention reasons appear once with their reasons. A named review round and an approval request retain their distinct obligations even when related to the same task. Never collapse them solely by taskId or label their sum as personal tasks.

Personal task totals retain their current meaning. Existing authorized management reassignment holds remain independently counted and discoverable, including the confirmed-empty Owner's automatically expanded five-item disclosure.

### Eligibility

- Task actions: due today/overdue by Target and organization calendar, returned corrections, or another concrete current canonical command for this actor. In Progress alone is insufficient.
- Collaborator/blocked work: include only a concrete authorized action belonging to that actor. Free text, dependency notifications and reporting relationships do not establish it.
- Reviews: current named reviewer; active exact round/latest submission; current project/task and evidence/independence policy. Preserve the domain's Committed-to-Target deadline meaning.
- Decisions: pending, unexpired, current delegation/handler canDecide/canView/self-approval policy. Preserve legitimate handler-specific exceptions. Commands recheck.
- Unsupported risk/follow-up/severity predicates stay absent until separately specified.

### Complete pagination and count contract

Return explicit sourceStates and sourceCounts, query context, read timestamps, rows and paging metadata. Counts and rows use the same source eligibility/filter evaluators. An unavailable/incomplete source has no exact count; it is never zero.

For a healthy mixed result, authorize/filter the complete contributing set before global ordering/paging. Do not merge already paged arrays. Compare the applicable organization-calendar date first (undated decisions last), then canonical existing priority where supplied: CRITICAL, HIGH, MEDIUM, LOW, unspecified. Use source and sourceId as deterministic final tie-breakers. Preserve date-only versus instant deadline kinds: sorting does not invent a task due-time, alter review deadlines or delay an approval's exact expiry check. Publish this ordering in the contract; preserve canonical task sort controls in Tasks scope.

Use bounded offset/limit pagination matching existing task/review ports and harness conventions. Validate integer ranges strictly, evaluate the complete authorized filtered set, apply the global ordering, and slice once. Every request reauthorizes. Under concurrent edits, report current read time and permit Refresh; do not claim a frozen historical snapshot. A changed sort key can move an item; test this explicitly. Do not add signing secrets/token storage solely for pagination; consider keyset pagination later only for a measured need.

Exact totals may require complete eligible-source evaluation. Do not hide a scan ceiling as an exact total. Resource exhaustion returns explicit unavailable/incomplete. Performance proof must precede acceptance; offset or cursor paging does not itself solve expensive authorization/count scans.

### Engineering E1 — Shared response snapshot selected

Every published page and its source counts must derive from one consistent authorized candidate set. Current review/approval actionable methods open separate RepeatableRead transactions. Do not compose these wrappers and assume they share a snapshot.

Owner selected: composer-owned RepeatableRead transaction with one readAt/organization-calendar context; transaction-aware domain read ports accept that transaction, retain their authorization, and feed one evaluation/order/page pass. All clock-sensitive eligibility uses that supplied readAt. Public source endpoints keep their own thin transaction wrappers. Do not invoke independently transacting wrappers from the composer. Each later page is a fresh authorized read, not a retained authorization snapshot. Unexpected database failure ends that response with controlled unavailable/stale recovery; no command retry follows. The independent-read/version-validation alternative was not selected.

If any required source fails, the mixed queue is unavailable or explicitly stale, with no fresh complete-page claim. Keep independent known source states/counts and existing authorized source destinations available. Never retain protected data after401/403 or session revocation.

## 4. Search, filters and card interaction

### Shared versus source-specific

- Common search matches authorized projected fields only. Do not search secret evidence/context and disclose its existence through a count.
- Work type selects All work/Tasks/Reviews/Decisions.
- Project matches an authorized canonical project link. Unlinked decisions do not match a selected project; do not manufacture a link.
- Source-specific filters visibly select their source. Task status/type/primary owner/priority/stage/Target/Committed remain task meanings.
- A visible Tasks scope chip explains D3. Clear task-only filtering restores the mixed queue while preserving applicable common search/project context; clearing all resets all active predicates.
- Counts for an inactive source must say not included, not0. Mixed queue counts describe exactly the active filter context. Independent base-source information, when shown, is separately labeled and timestamped.
- Query, source, view, sort, pagination and detail selection survive Refresh/Back/deep link where supported. Preference restoration never changes identity or permissions.

### Top cards

Use the supplied demo proportions and click feel: obvious selected state, toggle current selection off, replace another lens, reset paging/selection safely, reveal/focus results and show removable selection feedback. Preserve dirty/busy protection.

| Card | Predicate / result |
| --- | --- |
| Needs action | New actor-action-specific mixed queue; separate source numbers, no invented total |
| Overdue | Existing unfinished personal tasks past Target |
| Reviews | Demo-style personal review/correction task lens, distinct from assigned reviewer obligations |
| Waiting / blocked | Canonical Waiting tasks; no invented blocker responsibility |

For the narrow Reviews task lens, use pending internal/client review or revision-required states and unfinished correction tasks; exclude approved and terminal work. Preserve the broader historical review phase and named reviewer inbox separately. The precise predicate and count/query parity require source tests; do not replace review authority with this lens.

Keep positive/loading/denied/stale/failed source obligations reachable. Suppress only freshly confirmed zero explanatory panels. Do not duplicate correction tasks as extra Tasks rows or repeat large framing blocks before the queue.

## 5. Create task and role presentation

Reuse current canonical create payload/validation, reason, assignment/project eligibility, review requirement and capacity acknowledgement. Extract a bounded presentation component instead of cloning submit logic.

```text
Create -> setup loading -> profile + permitted choices
                     |
        required task definition -> assignment/submission
                     |
            optional supported planning
                     |
          validate -> submit once -> confirmed task
                          |
              field error / capacity / conflict rescue
```

Match the demo's centered desktop modal, role introduction, progressive sections and fixed footer; mobile uses a bounded full-height modal with body-only scroll. Owner/Leader presentation exposes authorized assignment choices; Employee/Site presentation is compact/progressive. All currently supported fields/types remain reachable.

Owner account kind takes precedence. Configured active job-role hints determine LEADER/SITE/EMPLOYEE presentation; missing/conflicting hints use generic Employee. Hints never grant assignment, project, Site or review authority. An employee-less Owner still needs a valid authorized task employee assignment; no fictional personal owner.

No create-time reviewer/evidence/reminder/recording shortcut is implemented unless it reuses an existing authorized contract with genuine persistence. Demo role switching, local uploads and fake success are not production behavior.

## 6. Real subtasks

Keep the current immutable TaskSubtaskLink representation, subject to engineering verification. Reconcile the earlier parentTaskId proposal in the contract; do not add a second relationship. Existing task rows/serializers remain compatible.

One level, same non-null project and organization; ordinary explicit assignment/access; own Target, assignee and canonical workflow. A compact child marker distinguishes it without making checklist items or dependency/correction links into subtasks.

- Create through the canonical child command with expectedParentVersion, reason, capacity and ordinary creation checks.
- Parent/child access is independent. Show parent/child identifiers only when independently authorized.
- Link creation increments parent version and records ordinary child-created and parent-updated audit/events.
- Lock parent/graph consistently for child insertion versus completion, including combined dependency/subtask cycles.
- Parent completion requires every child COMPLETED. Stopped/cancelled is not completed.
- Apply the guard to task, internal-review and client-review completion plus SQL writes. Keep generic blockers for hidden children.
- Preserve cancellation/archive/exit/review policies. No reparent/detach/cascade-delete or automatic child recurrence is introduced.
- Rollback must retain relationships and database completion constraints once child data exists.
- Audit every permitted child transition away from COMPLETED. The current migration already locks/checks completed parents for this case (lines95–101); verify it through service and raw-SQL regression tests, including concurrent parent completion. Do not invent automatic parent reopening.

## 7. Refero frontend / UX specification

### Reference lock

Primary palette/layout/component authority is the supplied demo, not a synthesized replacement. Refero research supports only bounded patterns: monday My Work search/date-group hierarchy; contextual side sheet; circular People; filter recovery and progressive creation sequencing.

Research: three style searches/three full styles, three screen searches/four retrieved screen records/two visually inspected images, two fallback flows. Exact monday My Work flow was not available. Marketing-scale violet/neon/black CTAs, unrelated fonts and large whitespace were rejected.

[Monday My Work](https://refero.design/pages/cd8daa3e-c396-43fd-a8d7-3e594b28e93a);
[contextual side sheet](https://refero.design/pages/e22fd93a-3a4c-4e44-831b-305cfe07e301);
[People popover](https://refero.design/pages/f30eed51-3bf5-4bcc-87d5-61109d1cf98f).
Full ledger: MY_WORK_PARITY_REVIEW_BRIEF_2026-10-13.md.

| Element | Locked treatment / accepted exception |
| --- | --- |
| Canvas/actions/surfaces | #f7f5f0 / #244f43 / white, divider #e8e8e2; existing studio shell retained |
| Typography | Demo Inter/system sans-serif hierarchy; no marketing font substitution |
| Status fills | #758496 / #2384be / #e3a52d / #c84955 / #7d5cb9 / #2b916a |
| D4 labels | #0b100d on Not started/In progress/Completed; other source text pairs retained if adequate |
| Secondary text / focus | Strengthen only failing pairs; candidate #667069 on cream, stronger pine focus edge; verify all computed states |
| Cards | Four desktop columns; accepted mobile2x2 with no horizontal rail takes precedence over the source demo's scrolling rail |
| Work queue | One compact panel; heading/actions, search/Filters/local views, removable chips, concise layout controls, immediately reachable rows |
| Desktop/tablet rows | Follow source proportions where space permits; preserve title/context/People/priority/status/Target with secondary detail; no page overflow |
| Mobile rows | Source card hierarchy: type/ID, readable title/context, state/priority/deadline, People, next action; practical touch targets |
| Detail | Existing native right drawer; full mobile; queue retained; tabs/body-only scroll/fixed footer and guarded departure |
| Filters | Anchored desktop popover; accessible mobile sheet; existing corrected320px Apply layout retained |
| Notifications | Existing real feed, read actions and authorized destinations; never use loaded page length as an exact unread total |

D4 source contrast: white on the three affected fills is3.82/4.11/3.92:1; approved dark labels calculate5.02/4.68/4.90:1. Calculations are not rendered application acceptance. [W3C normal-text guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) supplies the4.5:1 criterion.

### State and accessibility matrix

| Component | Required states / interactions |
| --- | --- |
| Queue/source counts | Initial loading, genuine empty, ready, denied, unavailable, stale/incomplete, query race and session loss |
| Cards/chips | Unselected, selected, hover, keyboard focus, counts loading/error, toggle/replace/Clear |
| Filters/search | Touch/keyboard, expanded disclosure state, Apply/reset/remove, no-result recovery, source scope feedback |
| Create | Setup loading/denied, missing profile fallback, field errors, busy, capacity warning, stale setup, success, dirty close |
| Detail/children | Loading/unavailable, current authorized content, hidden-child blocker, conflict, Back/Escape/overlay, focus return |
| Notifications | Real empty/loading/error/read states and exact authorized destination; badge unavailable where no exact contract |

Use native semantic controls, visible focus, labeled icon buttons, announced result/source changes, reduced-motion support and no unexpected mobile autofocus. Preserve tabs and browser navigation. Increase hit areas without inflating every row; do not remove zoom or use colour as the only meaning.

### Exact comparison measurements

Capture1440x900,1024x900,390x844,320x740, at matching source state and scrollY0 before interaction.

For mobile record main-content top, each task-local section height, queue container top, first-task button top/bottom, fixed-nav top, visible task area, minimum required scroll and post-scroll clearance separately. Do not confuse queue top with first-task position.

Aim for the first populated action fully inside the unobstructed390px viewport; pursue the same at320x740. If the unchanged shell prevents this, quantify shell versus task-local contribution and obtain Owner review of the actual result. No automatic fidelity PASS based on a component fixture or hidden controls.

Cover Designer initial/Waiting, Site populated, Leader and Owner five holds; focused search/filters, open disclosures/Create/detail and long titles/IDs/counts. Preserve all four task modes. Classify differences as current MW-I02, necessary backend rule, accepted accessibility exception, shared shell/MW-I09 or future slice.

## 8. Execution increments and dependencies

These are implementation plans, not operations performed in this review. Original MW-I03–MW-I09 gates remain; existing specifically authorized extensions are not a blanket start of a later slice.

| ID / priority | Increment | Dependencies / proof |
| --- | --- | --- |
| T1 P1 | Freeze current source/contracts; reconcile completed work and harness assertions | Record actual hashes/migration list; preserve concurrent changes and earlier evidence |
| T2 P1 | Complete exact domain actionable read ports | Current actor/capability/evidence/approval policy; identical count/page criteria |
| T3 P1 | Compose complete server queue and validated source-aware bounded paging | T2 and E1; multipage/dedup/order/filter/partial/error/security tests |
| T4 P1 | Connect mixed queue, Needs action, source counts and D3 controls | T3; existing My Tasks/views/drawer/source obligations unchanged |
| T5 P1 | Finish/review role profile and demo Create presentation | Existing role source; canonical payload/capacity/reason tests; no inferred permission |
| T6 P1 | Finish subtasks and permitted child UI | Current link source; all-path SQL/service/concurrency/preservation tests |
| T7 P1 | Apply remaining bounded demo details and approved D4 contrast | T4–T6 where relevant; four-width component geometry before authenticated run |
| T8 P1 | Current-source checks, guarded real acceptance and Owner review | All prior ready; fresh separate environment/migration authorization |

Complexity is L overall because several existing domains participate; do not disguise it as one CSS change. Keep each increment reviewable. Human versus agent timing is not estimated without a frozen candidate and final gap inventory.

Likely existing files: D:/app/sensestudios work management app/apps/api/src/task.service.ts, review.service.ts, approval.service.ts, organization.service.ts, task-creation-profile.ts, task-subtask-policy.ts, app.module.ts and their controllers/tests; schema/migrations; apps/web/src/task.tsx, task-detail-drawer.tsx, my-work-attention.tsx, my-work-metrics.tsx, my-work-filter-chips.tsx, my-work-queue-preferences.tsx and corresponding styles/tests.
Proposed new focused files: apps/api/src/my-work.service.ts/controller.ts and their tests; a typed shared contract; a small Create presentation component. Exact names are implementation targets, not claims those files exist.

Sequential integration in shared API/web modules. Independent QA/reference documentation can run alongside it; do not parallel-edit task.tsx/schema/domain services without explicit ownership. Sol owns contracts, schema/access/concurrency and final review; Luna handles settled bounded presentation/documentation work.

## 9. Error, security, performance and operations

The complete named error/rescue map and threat register are in MY_WORK_CEO_ARCHITECTURE_REVIEW_2026-10-13.md. Every new path needs a controlled visible failure and a test; no catch-to-empty or silent undefined state.

Measure expensive eligibility scans, query counts, memory and pool occupancy on large representative fixtures. Avoid N+1 detail requests and cross-user protected caches. Do not claim latency numbers that have not been measured.

Use existing safe structured logging: request/source correlation, elapsed time, completeness, filter scope and failure class. Redact titles/evidence/emails/credentials. Track failure/incomplete rates, queue latency and stale conflicts. No new telemetry provider/background jobs/external transmission is proposed.

```text
candidate freeze -> unit/type/lint/build + inert harness checks
                 -> separately approved dedicated schema/persistence run
                 -> security/concurrency + authenticated four-width run
                 -> manifest cleanup/catalog proof -> Owner acceptance

rollback: disable new entry -> retain child/link constraints and data
        -> compatible earlier presentation/commands -> verify blockers
```

Production/hosted CI/NAS/backup/key custody/actual operational R-104/R-105 remain separate gates. A local fixture pass is not production readiness.

## 10. Verification plan and source evidence

Detailed tester-facing plan: MY_WORK_PARITY_TEST_PLAN_2026-10-13.md. Use current Jest/API, Vitest/Testing Library/web and Playwright infrastructure; no new test framework.

Planned gates with Node24.19.0/pnpm11.19.0: affected frontend/API unit suites, pinned typecheck, lint, production build; then authorized PostgreSQL integration and the existing monolithic authenticated journey. Do not run pnpm verify against an unapproved database: its integration/E2E phases are stateful.

Preserve unrelated baseline failures as evidence. Historical20, later24/three errors and intermediate347PASS are different candidate boundaries; compare exact failing names and hashes before classifying new regressions. A synthetic missing fixture is not an application defect.

Tests must cover:
- eligibility/count/page agreement beyond a page; task reason dedup; distinct round/request IDs; ordering ties/authority changes;
- D3 source selection/clear/back/local-view behavior and unsupported cross-source filters;
- session revocation and response races; every source error/denied/stale/no-result state;
- foreign IDs/branches/evidence, approval delegation/self-approval and command reauthorization;
- profile fallback/Owner precedence/no privilege changes; Create field/capacity/version/reason behavior;
- one-level/same-project child persistence, audit, hidden access, combined dependency cycles and every completion path under races;
- four modes and shared TaskWorkspace callers; touch/keyboard/modal/navigation clearance; D4 computed contrast and no overlaps/overflow.

Functional Reliability and Prototype Visual Fidelity are separate acceptance results. Neither is marked PASS for the new candidate by this planning exercise.

## 11. Environment authorization boundary

No host run, startup, migration deployment, new database, authenticated test or preview reseed is authorized by this plan.

After source/harness readiness, submit one exact combined request using the reviewed Windows Medium context, Node24.19.0/pnpm11.19.0, retained PG18 directory/system7693570241708228348 and127.0.0.1:45434. Reuse corrected ownership/preflight logic.

The later request must name the actual reviewed migration tip (source snapshot currently118 directories, not historical116), source pins, recovery-copy proof, target absence and exact disposable database sense_mw_i02_validation_20261009_test, API59442/web59443 ports, one setup/task/browser/review sequence and manifest-bound cleanup/catalog preservation. Conditional startup/prior-state restoration are included only when explicitly approved; no retries/fallbacks.

Leave retained preview database sense_local_preview_20261008_1791474390772_test, its50 tasks and existing server/switcher intact. Do not deploy new schema into that retained preview implicitly. Database risk: ordinary authorized dedicated-cluster recovery plus synthetic disposable writes; retained data must be preserved and verified.

## 12. NOT in scope / gated parity backlog

| Item | Why excluded from immediate execution / next decision |
| --- | --- |
| No-date tasks / demo lifecycle replacement | Owner deliberately retained required Target and canonical states/types/priorities |
| Client/evidence visibility expansion | Original access rules retained |
| New risk/follow-up/blocker severity rules | No verified actor/responsibility/urgency contract |
| Mixed teams/multiple memberships | Owner requires separate discussion |
| Private tasks | Archive at handover is settled; trigger/audience/access/retention still need policy |
| Real names/photos | Needs canonical profile/storage/visibility contract |
| Calendar groups / pins / advanced Customize | Remaining requested parity roadmap; agree complete-result grouping/calendar and bounded preferences after the current checkpoint |
| Exact unread notification badge | Requires exact recipient/unread count contract; no loaded-page approximation |
| Rich drawer/time/evidence/next-action extensions | Existing native drawer retained; later MW-I03 context scope remains gated |
| Owner organization/Team Work/workload/Insights | Existing modules reused later; no team access/count inference |
| Missing Site drawing-request/upload relationships | Plan separately; reuse real Site/report/snags/offline workflows where supported |
| Production readiness and future provider features | Not established by this local UX plan |

The full demo contains these future/gated features. This plan does not claim literal complete functional parity while they remain excluded. Their questions are preserved here rather than silently implemented or added as new unrelated TODOs.

## 13. Dream state delta and handoff

Current: useful canonical workflows with partially adapted My Work, concurrent additive source work and unverified final fidelity.
This plan: one truthful next-action queue, source-aware controls, role presentation, genuine children, preserved commands and actual evidence.
Longer term: later Owner-authorized team/site/time/preferences composition using the same domain contracts.

No replacement backend, new permission taxonomy or demo-only production data path is needed. Start any implementation continuation from the actual current diff and this decision record. MW-I02 remains IN PROGRESS; do not declare COMPLETE or begin MW-I03 automatically.

## Implementation Tasks

These checkboxes track future source work and verification, not work performed by this planning review. Use current code at handoff; do not rebuild completed components. Effort is relative (M/L), not a promised duration.

- [ ] **T1 — P1, M: Freeze the actual candidate and reconcile contracts.** Record hashes, migration list, relevant callers and current evidence; align the child contract with TaskSubtaskLink. Verify by source/contract/harness inspection.
- [ ] **T2 — P1, L: Complete transaction-aware domain actionable ports.** Reuse exact actor/evidence/decision predicates in TaskService/ReviewService/ApprovalService. Verify unit/API and authorized real-PG count/access cases.
- [ ] **T3 — P1, L: Implement the shared-snapshot composer.** Add validated source-aware query, exact separate counts, dedup/order and bounded paging. Verify multipage/current-read/source-failure and query-cost evidence.
- [ ] **T4 — P1, M: Connect the common work rows and D3 filter behavior.** Reuse current metrics/attention/task view components; preserve Owner management and all existing task commands. Verify component/session/race/keyboard/touch tests.
- [ ] **T5 — P1, M: Finish the configured role presentation and demo Create modal.** Keep one canonical submit/capacity path and no permission inference. Verify Owner/generic/ambiguous/Site/Leader and stale-setting/input cases.
- [ ] **T6 — P1, L: Finish genuine children and all completion safeguards.** Preserve immutable link/access/audit and existing lifecycle; verify real-PG raw-write and insert/complete/reopen/dependency races.
- [ ] **T7 — P1, M: Apply and measure remaining bounded visual details.** Retain accepted mobile fixes, exact fills and D4 labels; inspect four-width source fixtures before authenticated comparison.
- [ ] **T8 — P1, L: Run authorized candidate acceptance and report.** Finish unit/static/build/harness readiness first; then separately approved dedicated persistence/browser run and manifest cleanup/catalog proof. Obtain Owner acceptance.

No new tasks arise from unsupported risk/follow-up or the explicitly gated future backlog. Existing gating is retained, not a new TODO proposal. Test requirements are detailed in MY_WORK_PARITY_TEST_PLAN_2026-10-13.md; review evidence is in MY_WORK_ENGINEERING_REVIEW_2026-10-13.md and MY_WORK_CEO_ARCHITECTURE_REVIEW_2026-10-13.md.

## GSTACK REVIEW REPORT

| Review | Scope | Status |
| --- | --- | --- |
| CEO | Eleven sections, Hold scope | Evaluated; D1–D4 settled |
| Refero | Exact demo lock, live supporting research, UI/state specification | Prepared; rendered acceptance pending |
| Engineering | This consolidated plan | Architecture/code quality/tests/performance evaluated; E1 selected; no unresolved review decision |
| Application acceptance | Current candidate | NOT RUN |

VERDICT: CEO and engineering plan reviews complete; Refero reference/UI/state plan prepared. Current source implementation, tests, persistence and rendered acceptance remain unverified by this review. The future backlog is gated; this is not a claim of complete demo functionality.

NO UNRESOLVED DECISIONS


## Source implementation update —14 October2026

The Owner instruction to act on this reviewed report has been carried through source correction and current checks. T1–T7 have source implementation/evidence; their real persistence/authenticated acceptance gates are still open. T8 is prepared, not executed. See MY_WORK_PARITY_FINDINGS_RESOLUTION_2026-10-14.md and MY_WORK_PARITY_CANDIDATE_ACCEPTANCE_PLAN_2026-10-13.md. Runtime source policies share RepeatableRead and one authorization clock while preserving FOR SHARE locks; this is a read operation in code, not PostgreSQL READ ONLY mode. Production/domain rules remain canonical. Fresh Owner approval is required for conditional cluster startup,118-migration disposable setup/browser/integration/cleanup. No COMPLETE or MW-I03 follows source PASS.

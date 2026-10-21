# P0 current application validation

8 October 2026. Scope: source/contract review, existing read-only runtime states and focused frontend tests. This is not whole-application runtime acceptance. The Owner approved the design baseline and this isolated prototype, not production implementation.

## Authority and baseline

Exact GPT-6.1 Sol handled current Owner/status intake, the approved UX lock, the six foundation documents/tokens, requirements and focused My Work/task/review contracts. Current Owner instructions supersede historical S18/S27 exclusion wording. Completed functional slices stay completed within their original accepted scopes. Later concurrent UX/source changes are outside the accepted 484-file S18/S27 fingerprint and remain IN PROGRESS.

[Source baseline](evidence/source-baseline.json) records HEAD, dirty status and hashes of tracked files outside docs/design at this task's start. Existing concurrent edits are preserved. Current status/verification documents contain different prior partial runs; none establishes an accepted latest checkout. Prior database failures and unreached browser gates are not repaired by this task.

[Final preservation comparison](evidence/final-source-preservation.json) checked all811 baseline tracked paths outside docs/design. HEAD stayed the same; `.github/workflows/s01-quality.yml` changed concurrently during the task. This task did not edit that file. Other baseline tracked hashes matched; untracked concurrent work is outside this hash comparison. Do not infer acceptance of the latest checkout from this documentation-only delivery.

## Route and component validation

| Area | Current evidence | Finding / classification |
|---|---|---|
| Entry shells | apps/web/src/main.tsx | CLIENT, EXTERNAL and public portfolio are separately routed before internal App. **Exists**; preserve identity/shell isolation. |
| Internal routes | apps/web/src/app.tsx:1483 onward | My Work, Decisions, Tasks, Projects, documents/revisions/reviews/client review, Time, Workforce, Learning homes, insights/reports/health, settings/integration/automation/assistance and Site/Turnkey routes exist. **Exists; overall runtime acceptance pending.** No replacement route is needed. |
| Navigation | workspace-navigation.tsx | Dashboard plus Work/People/Insights/Manage and mobile primary destinations/More exist. Find a page filters destination labels. **Exists; navigation test mismatch below.** Global content search remains deferred. |
| My Work composition | app.tsx:1352–1371 | Session-gated Decisions queue, MyWorkAttention and personal TaskWorkspace already exist. **Exists**, not a missing module. |
| Personal tasks | task.tsx:47–57; task.service.ts:236–286 | Current employee's primary-owned OR explicitly collaborating work. Owner without employee has empty personal scope, not organization-wide tasks. **Exists.** Created-by-me is a global Tasks scope, not a current My Work tab. |
| Task views | task.tsx:367,405–408 | List/Cards/Kanban/Timeline, compact presentation and canonical selection exist. **Exists; populated runtime not verified here.** No drag scheduler/one-click arbitrary status command is implied. |
| Filters and continuity | task.tsx:47–69,149–192,358,409 | Query-backed scope/project/plan/owner/search/status/phase/date basis/range/sort/page/view/task, history and contextual Back exist. **Exists; cross-route/focus restoration only partially evidenced.** Persistent URL context is not a new database preference. |
| Task metadata/actions | task.tsx:9–24,411–443 | Primary owner, collaborators, project/plan, named dates, version, review requirement, history, capabilities and owning commands exist. **Exists; needs clearer hierarchy and exact-context presentation.** |
| Attention sources | my-work-attention.tsx:26–46,49–74,92–111 | Independent review/correction/reassignment reads, pagination, loading/error/empty/retry and exact review/task links exist. **Exists.** Not one aggregate decision list. |
| Project sections | project.tsx | Overview/Plan/Tasks/Documents/Reviews/Delivery/Activity and query context exist. **Exists.** Active TURNKEY Site remains distinct from DESIGN. |
| Semantic design system | styles.css + module CSS | Cream/pine/gold and local variables already exist. Reusable primitive→semantic→component architecture, stronger secondary/focus/control contrast and consistent evidence strip are **partially adopted/proposed**. Mixed local values remain. |
| My Work six attention lenses | task filters + separate attention components | Existing phase/date filters can supply related queries. Prominent Active/Overdue/Due today/Waiting/Reviews/Upcoming placement is **proposed presentation**. Query counts overlap. Global filtering of heterogeneous decisions/reviews is **not supplied by one task query**. |
| Offline My Work | task.tsx; S22 prepared workflows | General My Work cache/offline decision capability is **not established**. Prototype offline scenario is illustrative read-only sample presentation, not a promised cache implementation. |

Broad route review establishes source presence and boundaries, not positive acceptance for every destination. Focused My Work/task/review inspection governs this prototype. Older gap tables are historical: do not reopen completed S09/S10/S13 functionality because of their wording.

## Current read-only runtime observation

A separate browser tab opened the existing `http://localhost:59223/my-work`; no production command was submitted. The URL normalized to `?scope=personal&phase=active`. At desktop/default viewport and 390×844:

- My Work shell, task views, filters, contextual account label and navigation rendered.
- Decisions showed “No pending decisions in this list.”
- Reviews, corrections and management reassignment independently showed “Permission denied.”
- Task area showed “You do not have access to these tasks”; Owner-without-active-employee explanatory copy was present.
- Mobile retained Dashboard/My Work/Tasks/Project documents/More. Decision/attention panels occupy the first screen before task rows. This is a hierarchy observation, not measured staff usability.

These states do not establish the root cause of denial, misconfigured policy, populated task metadata, functioning mutations, or permission acceptance. No grants, fixtures or database were changed to obtain a positive view.

## Focused checks actually run

Pinned Node **24.19.0** ran the existing Vitest suites. No dependencies were installed.

| Check | Actual result | Meaning |
|---|---|---|
| Initial four-suite run, maxWorkers=1 | Navigation: 1 passed/1 failed; other three files hit ENOENT in sandbox temporary transform cache | Separate assertion failure from runner infrastructure failure; not a passing run. |
| Task + MyWorkAttention + ApprovalQueue, threads pool and ignored local TEMP | **31 tests passed across 3 files**, exit 0 | Mocked frontend contracts/state/query behavior; not real API persistence. [Log](evidence/current-focused-tests.log). |
| Navigation rerun with same local TEMP/threads | **1 passed, 1 failed**, exit 1 | Reproduced current heading accessible-name mismatch. [Log](evidence/current-navigation-tests.log). |
| Current frontend TypeScript | **Passed**, exit 0, using pinned Node outside the restricted runner | Read-only web tsconfig check. The first incorrect binary path and restricted-runner declaration-resolution errors were not treated as source defects; the corrected unrestricted rerun succeeded. [Log](evidence/current-web-typecheck.log). |

Reproduction: workspace-navigation.test.tsx:34 expects heading name `Work`, while the updated heading includes `Contains the current page.` (`WorkContains the current page.` in the test output). The retained navigation test has not been weakened or edited. Current UI/test agreement needs separate production-scope work and validation; this prototype does not resolve it. The short descriptive marker also needs deliberate accessibility naming review.

No full pnpm verify, PostgreSQL integration, real domain mutation, production browser journey or screen-reader acceptance was run by P0. This task's prototype results are recorded separately.

[Current My Work mobile capture](evidence/current-my-work-mobile.jpg) preserves the observed denied/empty state only; it is not a populated workflow acceptance screenshot.

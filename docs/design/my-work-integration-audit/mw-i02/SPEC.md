# MW-I02 — personal action hierarchy and truthful source states

9 October 2026. **Owner-authorized MW-I02 only; specification before implementation.** Exact GPT-6.1 Sol performed context/contract interpretation. MW-I01 is complete for bounded local validation; its 19 baseline web failures remain disclosed. MW-I03–08 are excluded.

**Current Owner direction:** Apply [the prototype fidelity and existing application integration policy](../../PROTOTYPE_FIDELITY_POLICY.md). MW-I02 delivers the bounded changes in the existing production route with real contracts; the exact approved prototype is its sole visual reference. Preserve accepted MW-I01 functional work, record earlier visual deviations as future bounded remediation, and do not claim actual-app differences without comparison. Compare equivalent actual-app and prototype states at1440/1024/390/320 and submit both acceptance gates for Owner approval. MW-I03–08 remain separately authorized slices; MW-I09 owns final cross-screen acceptance. This direction does not authorize a whole-app redesign or relax the current database/startup blocker.

## Authority and boundary

Current Owner direction authorizes interactive truthful personal widgets, separate reviews/client reviews/corrections/reassignment/approvals, independent recovery states and bounded mobile Scope/vertical-space and desktop density corrections. Existing reference lock remains: cream/pine/gold, Refero SC15 Linear/SC06 monday, supplied Blueprint section20. Prototype compound metrics are presentation proposals, not new predicates or permissions.

Requirements: preserve R-018.a–b ownership/collaborators, R-019.a–c assignment/self-creation, R-021.a–b fields, R-022.a–b priorities, R-023.a separate dates, R-024.a–b states/history; R-027–R-029 review/correction boundaries and R-037 exact revision evidence; R-006/R-079/R-080/R-092 authorization/audit boundaries; S05 typed approvals, S10 dates/waiting, S13/S14 independent internal/client review, C-011/C-023/C-024. This is frontend composition only. No backend/schema/business/permission change, inferred team membership, new workflow or fake aggregate.

## Settled widget contracts

| Control | Authoritative read and membership | Drill-down |
|---|---|---|
| Active personal tasks | `/api/v1/tasks?scope=personal&phase=active&offset=0&limit=1` plus existing applied task filters; server `total`. Active excludes COMPLETED and STOPPED_DUE_TO_PROJECT_CANCELLATION. | Same personal TaskWorkspace and exact query predicate, offset reset; retain full pagination. |
| Waiting personal tasks | Same query, `phase=waiting`; exact WAITING, without claiming dependency-blocked work. | Same queue with waiting predicate. |
| Personal review-phase tasks | Same query, `phase=review`; existing server predicate includes correction type and enumerated review-related states, including approved states. Label/description must explain this is task phase, not reviewer obligations. | Same queue with review predicate. |
| Completed personal tasks | Same query, `phase=completed`; exact COMPLETED. | Same queue with completed predicate. |
| Reviews awaiting you | `/api/v1/reviews/inbox?personal=true&offset=N&limit=50`, existing authorized `total`; identities are review rounds, not unique tasks. | Expand/focus this same independently paginated list; each row retains `/reviews?taskId=…&roundId=…`. |
| Your correction tasks | `/api/v1/tasks/attention?kind=corrections&offset=N&limit=50`; existing total after service access checks, personal active CORRECTION tasks. | Same independent list and `/tasks?taskId=…` links. |
| Employee-exit reassignment | `/api/v1/tasks/attention?kind=reassignment&offset=N&limit=50`; existing total includes only currently reassign-capable authorized management tasks. | Same independent list and existing task detail/reassignment handler. |
| Open decisions | Existing `/api/v1/approvals/attention?limit=30` and cursor contract; **no total exists**. Uncounted action, not numerical KPI. | Existing ApprovalQueue, preserve approvalId exact lookup/focus, cursor pagination and owning decision workflow. Loaded-item labels only inside list, expressly not inbox totals. |
| Client reviews | No global personal-count contract: staff reads are project-scoped. **No personal total**. | Clearly labeled project-context navigation to existing `/client-reviews`; owning workspace selects authorized project. |

Task summaries use current authorized `personal` scope (primary owner OR collaborator); no employee identity yields zero through the existing contract, never organization-wide fallback. Each tile's total comes from its own exact query, never current-page length, summation or exhaustive client scanning. Forward the same existing applied project/plan/person/search/status/type/reassignment/date filters to counts and queue. Temporary widget phase replaces the base phase for both count and selected drill-down, while counts are calculated before temporary selection; clearing restores original phase/context. Do not sum overlapping categories or attention sources. Existing Target/Committed date basis/filter strings remain unchanged; no new Overdue/Today/calendar predicate is introduced here.

Widgets are keyboard buttons with aria-pressed, exact selected-count/context banner and reversible Clear. Reclick clears. Scope/account change clears temporary selection; applied filter changes refetch all relevant totals. Server-confirmed task refresh/commands trigger relevant counts refresh. Queue remains one nonduplicated paginated list; count can exceed visible page and must say Showing N–M of total.

## Source states and hierarchy

Keep compact personal task summary and work queue prominent; keep independently labeled action sources grouped compactly above/alongside it without long expanded empty panels. Use accessible disclosure or matching-list focus for action drill-downs, preserving all existing rows/actions/pagination. Do not convert round counts to task counts or formal approvals to review states.

Each count/list loads independently. Loading shows loading, not zero; authorized successful empty shows zero/empty; 403 shows denied; 401 retains existing session-expiry path; failed/invalid response shows unavailable with source-local Retry. Refresh failure may retain last successful data only with explicit stale label/time/context; stale count must not claim live agreement. Denial/session loss clears protected stale records. Request sequence/abort guards prevent earlier filter/account/pagination responses overwriting current context. Refresh timestamp is local fetch freshness, not domain update time. No all-or-nothing Promise.all gate.

Approval refresh/load-more retains exact lookup, selected unavailable state, and registered policy boundary. Fix late load-more response contamination through request/context guards if needed. No new inline approve/deny commands are introduced. Client review remains separate navigation with explicit unavailable personal total explanation.

## Bounded layout corrections

Task mobile Scope selected text must remain understandable at320/390 (allow full-width control/reflow or accurate visible selected-scope caption; do not shorten scope meaning). Reduce task-local repeated heading/spacing/filter-action vertical cost so the queue begins sooner, keeping accessible labels/touch targets, single existing creation command and all filter controls. Do not refactor global shell or add future toolbar/saved-view/date-chip features. Desktop queue rows may use tighter safe spacing/layout; preserve complete labels, People primary-owner identity, four priorities, 13 states, separate dates, Next Action, reassignment warning and all list/cards/board/timeline/legacy callers.

## Implementation handoff and acceptance

Luna may implement within `apps/web/src/app.tsx` MyWorkRoute only, `my-work-attention.tsx/.css`, `approval-queue.tsx` and focused tests/styles, plus narrowly scoped `task.tsx/.css/.test.tsx` summary/filter integration and density. Shared non-MyWork callers must retain behavior; add optional composition interfaces rather than duplicate TaskWorkspace or polling its DOM. Reuse existing fetch/auth/command/query conventions. Escalate any new unsupported contract or permission interpretation to Sol; do not edit API/contracts/schema.

Tests: exact query/count/drill-down parity over >one page and overlapping owner/collaborator records; count response differs from loaded rows; independent delays/403/401/failure/retry/stale and late-response races; zero and employee-less Owner; clearing restores base phase; scope/context and command refresh; approval cursor/selected lookup unaffected; source-specific review/task identities and correct links. Preserve all MW-I01 focused tests and existing command coverage. Test full status/priority presentation at component layer, no fabricated production states.

Before edits preserve git diff/source hashes and actual available baseline. Run pinned Node24.19.0/pnpm11.19.0 affected tests, typecheck/lint/build and full-web comparison to19 known baseline failures. Actual authenticated desktop320/390 journeys must verify count-to-filter pagination, independent state recovery (controlled browser responses may test failures, labeled as such), all preserved views/commands, keyboard/focus/touch and readable scope/density screenshots. Any database provisioning or writes need current explicit named target authorization; MW-I01 disposed target must not silently be recreated. Final Sol review and truthful evidence/status are required before COMPLETE. No production/whole-checkout clean-verify claim.

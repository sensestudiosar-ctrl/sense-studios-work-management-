# Agent 1 — Slice E query implementation boundary

Status: **SOURCE IMPLEMENTED / ACCEPTANCE IN PROGRESS.** Continues after the D/G Project Tasks batch. The Owner assigned E to Agent 1; this document bounded the read changes before code. Current implementation/evidence and unrun persistence gates are recorded in V1_AGENT1_QUERY_PROGRESS_2026-10-15.md. Approved task priority/search/ownership rules and the settled mixed-source My Work contract remain authoritative. No new access grant, workflow, stored preference service or schema is introduced.

## Current callers that must move together

- TaskController list query, TaskService authorized list/count/order, controller/unit/persistence tests.
- TaskWorkspace filters, URL state, applied chips, Project Tasks namespacing, list/cards/board/timeline and the existing account-scoped browser saved-view validator.
- My Work metrics already call the ordinary task list with limit1 and use its exact total. New filters must reach these requests rather than introducing an independent count calculation.
- MyWorkAttentionQuery/controller, TaskService actionable read port, MyWorkService source selection/filter/count/page, ActionableWork and their tests. The composer retains one RepeatableRead/readAt/calendar context and separate task/review/approval identities.

## Proposed read contract

Implemented wire names: `priorities=HIGH,CRITICAL`, `collaboratorEmployeeIds=<uuid>,<uuid>`, `sort=priority_desc`. Empty selections omit the parameter. Unsupported/duplicate/oversized values fail boundary validation. New constants/types live in task-query.ts; the existing shared barrel has one bounded additive export. Saved-view fields remain optional for legacy records.

1. Priority selection: optional supported LOW/MEDIUM/HIGH/CRITICAL values. A selected group matches any selected priority; an empty selection means no additional predicate. Parse and bound the complete list at the API boundary.
2. Collaborator selection: optional bounded employee-ID list. Match any selected collaborator, intersected with the ordinary actor-visible task predicate. Primary owner remains a separate existing filter. Selecting a person never grants access; option names must come only from current authorized projections. Invalid IDs fail validation, and an inaccessible/nonmatching record cannot enter rows or totals.
3. Priority sorting: CRITICAL → HIGH → MEDIUM → LOW, then Target ascending, then canonical task ID. Preserve every existing sort. Do not change the approved deadline-first ordering of mixed Needs action.

   While Needs action is selected, ordinary task-sort controls are disabled and any retained sort chip says it is paused. Clearing that selection restores ordinary task ordering/context.
4. Search: retain existing title/project/owner/creator and current source-ID behavior where supported. Add description and linked stage/milestone label for task searches only. Searchable metadata need not be sent in the public MyWorkRow. A shared implementation must keep count and page predicates together; do not approximate matches on one browser page.
5. Reviewer selection: use the current actor's authorized assigned-review rounds and owning review source. Do not add an arbitrary reviewer-account picker or turn a review round into a Task state. The existing Reviews/Needs action mechanisms are the starting point. If a genuinely new reviewer policy is required, record the missing rule before dependent code.
6. Priority/collaborator task predicates explicitly select Tasks within mixed work; Clear restores the mixed-source context. Common project/search filters retain their existing source-aware behavior. Never apply Task priority/owner/state meanings to approval or review records.

## Persistence and compatibility

Keep existing browser-local views and account isolation. Add a backward-compatible snapshot reader/defaulting step if optional query fields are introduced; preserve existing valid saved views instead of declaring them corrupt. Do not silently rewrite invalid stored records or introduce server persistence. Project list q/sort/offset remain distinct from embedded task predicates.

Shared contracts must be settled before frontend controls are displayed. Give any shared export change one owner and preserve concurrent edits. Slice C's authorization inventory/evaluator remains with the other agent; query changes compose its existing resource predicates and do not alter them.

## Required verification

Test validation boundaries, multi-value any/all combinations, AND with current project/owner/date/state scope, malformed/foreign IDs, explicit denies and revoked membership through the ordinary owning policy. Verify total/page/order agreement across more than one page and stable priority/date ties; include Owner with no employee, ordinary employee, scoped manager and Site presentation. Test description/plan-label matches without returning protected metadata.

Exercise direct query URLs, all task views, Project task namespace, old/new saved views and actor switching. Verify task-only filters exclude review/approval counts honestly and Clear restores mixed work; assigned review rows retain round identity and route. Source/unit/mock-browser evidence remains distinct from real PostgreSQL, concurrency and authenticated candidate acceptance. No production/database lifecycle action is authorized by this design record.

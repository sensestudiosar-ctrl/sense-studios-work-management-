# My Work actionable queue — source gaps, 13 October 2026

Planning addendum to CARD_INTERACTION_AND_ATTENTION_PLAN_2026-10-12.md. GPT-6.1 Sol performed context and contract interpretation. No implementation, tests, live requests or database operations were performed for this report. MW-I02 remains IN PROGRESS; MW-I03 is excluded.

## Latest Owner direction

My Work is where a user identifies what to work on now. Reviews and other actionable obligations should appear as types of work in one understandable task-style experience. Show real subtasks compactly like the supplied demo/monday pattern. The exact Final_Demo.html hash remains F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8.

This direction settles presentation intent. It does not convert review rounds or approval requests into persisted Task records, change their permissions, authorize backend gap implementation, or supply a parent/subtask business model. The Owner previously required a report before implementing backend gaps. The bounded task-opening drawer may continue independently.

Requirements remain R-018–R-024, R-027–R-029, R-037, R-006/R-079/R-080/R-092, R-096–R-097 and C-023/C-024. Preserve independent review, exact evidence, typed human approval and ordinary domain commands.

## Settled behavior

Owner clarified the proposed subtask model: each real subtask has its own assignee, Target date and task workflow; the parent cannot complete until all its subtasks are completed. This settles that product rule for the implementation plan. It does not authorize a migration/database run under the current frontend task. Scope/access inheritance, review completion and cancellation/archive treatment still need explicit contract design and conflict review.

- Present actionable work with a common row/card language and explicit work type, responsible actor, reason, deadline and next authorized action.
- Task due-today/overdue attention uses Target and the organization calendar day. Review/approval deadlines retain their own domain meaning.
- Visibility, collaboration, priority or an In progress status alone does not prove this user has an action now. Work waiting on another actor must say who acts next.
- Named reviewer obligations may appear even when the user does not own the underlying task, through their existing review authorization. Management obligations require the actual authorized intervention. Owner without an employee remains zero personal tasks; authorized Owner decisions are still work.
- Preserve existing task/review/approval routes and commands. A review row opens its exact task/round workflow; a decision row opens its owning approval workflow. No simulated command or automatic decision.
- Deduplicate canonical task IDs within task totals while retaining every qualifying action reason. Distinct review rounds and independent decision requests remain distinguishable obligations. Never sum their source totals and label the result tasks.
- Keep denied, unavailable, stale and loading states explicit per source. A partial result cannot claim a complete actionable total.

## Current source capability and gaps

| Source | Available now | Backend gap |
| --- | --- | --- |
| Personal task list, task.service.ts | Authorized primary owner/collaborator tasks; server count/paging; separate Target/Committed fields and capability-checked commands | No shared actor-specific actionable-now predicate or cross-source paginated queue. |
| Review inbox, review.service.ts:155 onward | Exact taskId/roundId, named reviewer, current active round/project checks, independent review permission, domain deadline; total counts rounds | Need a task/action projection for cross-source ordering and dedup; personal-task scope cannot substitute for reviewer responsibility. |
| Corrections/reassignment, task.service.ts:288 onward | Canonical correction tasks and scoped management attention | Include only actual current work/intervention capability; ordinary Waiting text is not a typed responsibility. |
| Approval attention and domain handlers | Typed request identity, expiry/delegation, canDecide and self-approval checks; current attention uses cursor/loaded records | No complete task-style aggregate/count or universal task link. Unlinked decisions must remain typed decision items. |
| Subtasks | Task checklist, task dependencies, recurrence occurrences and correction links exist | Search of Task schema, task controller/service, contracts and frontend found no generic parentTaskId/subtask relationship. These other relationships must not be relabeled subtasks. Demo subtasks are fictional local arrays. |

## Proposed backend contract boundary — requires explicit approval

An additive read projection should return authorized work items, stable source identity, canonical task ID where present, source type, responsible actor, typed reasons, applicable deadline, urgency, existing action/link and freshness. Count and pagination must share the same permission/actionability evaluator and stable ordering. Review identity must retain exact round ID; approval identity must retain exact request/type. Deduplicate before paging, rather than merging currently loaded frontend pages and claiming an exhaustive queue.

Start with reasons backed by current canonical rules: actionable Target-due task work, returned corrections, named current review, decidable approval and genuine employee-exit reassignment. Do not infer follow-up, verified risk, escalation severity or team responsibility from text/tags/notifications. The proposed narrow Reviews task-state filter in the previous plan remains unimplemented and is distinct from review work assigned to this actor.

No schema change is assumed for this read projection. A genuine subtask feature would require a separately approved relationship, ownership/access, lifecycle/completion, date, audit and deletion contract. Rendering existing correction linkage can use its accurate label now; checklist entries can remain checklist entries.

## Decisions and scope request before backend work

1. Approve an additive actionable-work read contract encompassing existing authorized task, named-review and decidable-approval sources. Confirm card labels/totals: distinct linked tasks and separately identified decision/work-item counts, or an explicitly labeled work-item total with published dedup semantics.
2. Set the responsibility rule for due personal collaborator work and blocked tasks; define urgency thresholds and unsupported follow-up/risk sources if wanted. Target date itself is already settled.
3. Plan the approved own-assignee/date/workflow subtask model with parent-completion gating. Settle access/visibility inheritance, nesting/cycle constraints, review/cancellation/archive behavior and audit before schema implementation. Do not infer children from dependencies/corrections or display fictional subtask counts.

The exact implementation proposal must audit each domain handler and preserve branch/project/employee/client isolation, reviewer independence, delegation expiry, self-approval prevention, project holds/cancellation, expected versions and request-time authorization. No backend change is authorized by this report.

## Acceptance plan for an approved contract

Verify named reviewer versus submitter, Owner without employee, collaborator action responsibility, leader team exclusion, blocked/terminal/cancelled work, exact correction linkage, delegation/self-approval, duplicate linked actions, distinct rounds/decisions, authorization leakage, count/page parity and stable ordering beyond one page. Frontend checks include source failure/partial freshness, type labels, exact destination IDs, keyboard/mobile interaction and queue context restoration. Genuine subtask acceptance needs its separately settled model. Existing frontend evidence and 20 tracked baseline failures remain preserved; this report claims no new test result.

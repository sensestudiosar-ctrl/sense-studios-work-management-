# My Work cards — interaction correction and backend filter plan

MW-I02 IN PROGRESS. This plan does not authorize backend changes, database operations or another acceptance run. Previously accepted functional evidence remains valid within its recorded source boundary.

## Owner direction and exact reference

Reference: `D:/SCRAP/prototype (2).html`, SHA256 `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`, metric definitions/handlers at lines625–657. Requirements: MW-I02, R-018–R-024/R-027–R-029, R-006/R-092, R-096–R-097 and C-023/C-024.

The Owner approved Reviews as a task filter with the reviewer inbox retained. After the source audit disclosed the broader existing Review phase, the Owner selected preparation of an exact backend-filter plan. The latest Needs Your Attention rules supersede the sample-flag proposal: authorized action required now, with a specific next action, rather than every In Progress task.

## Frontend interaction correction

Supported Overdue/Waiting card selections toggle on a second click and replace one another. Activation closes selected task detail, resets pagination, preserves search/applied filters and display mode, and reveals/focuses the Work queue below the header. A queue-local result strip uses the actual server total and supplies Clear widget filter. Loading, denied, unavailable and stale results remain explicit. Card counts remain independent of the temporary selection. No page-local filtering or fabricated count is introduced.

Needs action and Reviews remain source shortcuts until their replacement predicates are approved and implemented. The existing reviewer inbox and management sources remain accessible. The existing Review phase in More is preserved.

## Source audit: supported evidence and gaps

| Condition | Existing canonical source | Gap / required protection |
| --- | --- | --- |
| Personal tasks | `task.service.ts:235–285`, active employee owner/collaborator scope | Visibility alone does not establish a current action. Owner without an employee still has zero personal tasks. |
| Overdue / due today | Organization day: `dashboard.service.ts:272`; task Target/Committed filters | Current Overdue card uses Target; dashboard/review due dates can use Committed fallback Target. Deadline precedence must be explicit. |
| Corrections | `task.service.ts:288–304` | Existing correction source checks active type/access; new attention evaluator also needs actual action capabilities and project/employee-exit gates. |
| Review required | `review.service.ts:155–188` | Named active reviewer, open current round, project access and independence checks already exist. Count distinct task IDs rather than summing rounds. |
| Approval required | `approval.service.ts:117–123`, domain handlers | Require current `canDecide`, active delegation and self-approval protections; `canView` is insufficient. Task links are domain-specific. |
| Blocked intervention | Genuine reassignment plus `capabilities.reassign`, `task.service.ts:288–304` | General Waiting reasons/responsible parties are free text. Resume permission alone is not proof of an intervention obligation. |
| Follow-up required | No typed actor/deadline obligation found | Do not infer from tags, text or notifications. Needs a canonical source before inclusion. |
| Verified risk | Dashboard date/priority projections exist | No actor-specific verified intervention predicate found. Do not turn every late/high-priority task into a verified risk. |

### Reviews / corrections: precise proposed filter

Add a separate, additive server metric filter; do not change existing `phase=review`. Both the card count and paginated queue use the same authorization and predicate:

- Personal owner/collaborator visibility, current project access and existing applied search/status/date/project/owner filters.
- Nonterminal tasks in `SUBMITTED_INTERNAL_REVIEW`, `IN_INTERNAL_REVIEW`, `CORRECTIONS_REQUIRED`, `SUBMITTED_CLIENT_REVIEW`, `IN_CLIENT_REVIEW`, or `CLIENT_REVISION_REQUIRED`.
- Also include unfinished canonical `type=CORRECTION` tasks, because the real workflow creates separate correction tasks whose status can be Not started/In progress/Waiting.
- Exclude `INTERNAL_APPROVED`, `CLIENT_APPROVED`, Completed and stopped work, including correction-type tasks in those states.
- This is a task-state view. A submission awaiting another person's review may appear here but must not thereby enter that submitter's Needs Your Attention.
- Preserve the reviewer inbox as a clearly labeled independent shortcut/source with its own round count.

The existing `phase=review` at `task.service.ts:269` includes approved work and every correction type, including completed corrections. Reusing it would not match the requested narrower behavior.

#### Exact additive Reviews contract

Proposed request: `GET /api/v1/tasks?scope=personal&metric=reviews&offset=0&limit=50`. Add optional strict `metric: "reviews"` validation to the current controller parser and service filter type. Reject unknown metrics and require personal scope for this bounded metric. Do not change or reinterpret existing `phase=review` requests.

Build one authorization/base-filter `where`, then AND the metric predicate: status is not `COMPLETED`, `STOPPED_DUE_TO_PROJECT_CANCELLATION`, `INTERNAL_APPROVED` or `CLIENT_APPROVED`, AND (type is `CORRECTION` OR status is one of the six pending review/correction states listed above). This explicitly excludes approved correction tasks too. Continue passing the same `where` to `count` and paginated `findMany`, with the existing stable ID tie-breaker. The card may request limit1 and use the returned total; the queue requests its ordinary page size. Never count only loaded rows.

Preserve applied base phase, status, search and other filters by intersecting them with the metric. Incompatible filters truthfully yield zero; do not silently override them. The card's metric count is independent of the temporary card selection. Introduce a distinct temporary `reviews` selection; retain the existing broader `review` phase key in More and browser preferences.

| Proposed production file | Bounded change |
| --- | --- |
| `apps/api/src/task.controller.ts` | Strict additive query validation and personal-scope constraint. |
| `apps/api/src/task.service.ts` | Optional filter type and shared count/page metric predicate. |
| `apps/web/src/task.tsx` | Server metric requests, independent card total, queue selection, retained reviewer shortcut. |
| `apps/web/src/my-work-metrics.tsx` | Reviews task total/selection rather than reviewer-round total. |
| `apps/web/src/my-work-metric-focus.tsx` | Distinct Reviews result label; preserve existing Review phase label. |
| `apps/web/src/my-work-queue-preferences.tsx` | Distinct temporary `reviews` key and safe URL/preference restoration. |

Affected tests: `apps/api/src/task.controller.api.spec.ts`, `apps/api/src/task.database.api.spec.ts`, and existing web task/metrics/focus/preferences tests. Verify every included/excluded status with ordinary and correction types, strict query rejection, employee-less Owner zero, owner/collaborator scope, leader team exclusion, project/organization isolation, base-filter intersections, count/page agreement and pagination, toggle/Clear/URL restoration, reviewer inbox retention and denied/stale states. No schema change is proposed for this Reviews slice. This is a plan; these backend changes and tests have not run.

### Needs Your Attention: proposed implementation boundary

Use one server-side actionability evaluator, shared by count and pagination. Return canonical task IDs with typed reasons, responsible actor, relevant deadline, urgency and an existing authorized action/link. Deduplicate task IDs before counting/paging; preserve every qualifying reason. Recheck authorization when opening/performing the existing command.

Include only a real due/overdue task action, returned correction, designated review, decidable approval or verified management intervention. An ordinary In Progress state is insufficient. Waiting on another actor, terminal work and future work with no current reason are excluded. An overdue blocked task needs a separately established action for this user; do not imply they can complete blocked work. A leader does not inherit all team overdue tasks.

The attention task queue may include a review or management task outside personal ownership only through that source's real authorization. Label this scope explicitly; do not relabel those records as the Owner's personal tasks. Unlinked approval/decision records remain separate decision items and counts, not synthetic tasks. Independent sources must retain loading/denied/stale/failure visibility.

Use the Owner's Critical / High / Normal attention tiers, then earliest relevant deadline and project priority, with a stable ID tie-breaker. Task priority alone is not an attention tier. Severe-overdue thresholds, escalation severity and project-priority availability need confirmation before assigning tiers.

## Decisions required before backend implementation

### Subsequent Owner decision — 2026-10-12

The Owner selected **Use Target date** for task due-today/overdue attention. Compare the canonical task Target date with the organization calendar day; do not substitute Committed date or a Committed-to-Target fallback for this task-attention rule. This settles item2 below; its original wording is retained as historical context. Existing review/approval deadlines retain their own domain meaning. This decision records the plan only and does not implement attention eligibility or authorize backend/database operations.

1. Confirm the proposed narrow Reviews predicate, including unfinished separate correction tasks.
2. Choose task deadline precedence: existing card Target, or current Committed date with Target fallback. Preserve the current Overdue rule until explicitly changed.
3. Confirm an attention card displaying distinct task count plus a separately labeled decision count; never add their independent source totals and label the sum tasks.
4. Define canonical follow-up and verified-risk sources, severe-overdue thresholds and urgent-blocker severity. Unsupported reasons remain unimplemented and disclosed until those rules exist.

## Bounded implementation and verification proposal

First implement the additive Reviews task filter and retain the reviewer inbox. Then implement only attention reasons backed by existing canonical action/permission evidence under the settled deadline/count rules. Audit handlers individually before adding approvals. New follow-up/risk models are a separate approved change if required; no schema change is assumed necessary for the supported predicates.

Acceptance: actor/branch isolation, employee-less Owner truth, named reviewer independence, delegation/self-approval, project/exit/terminal gates, Waiting next actors, leader team-overdue exclusion, duplicate reasons, count/queue agreement across pagination, stable ordering and source failures. Frontend: select/toggle/replace/Clear, base-filter restoration, four views, task commands, touch/keyboard focus and header/bottom-nav clearance at1440×900,1024×900,390×844,320×740. Use the existing guarded environment only after a separate applicable bounded authorization.

No production data, permissions, lifecycle, shared shell or MW-I03 changes are proposed as part of the frontend interaction correction. Source audit/context intake used GPT-6.1 Sol; the focused component implementation used its existing agent model, not a claimed Luna substitution.

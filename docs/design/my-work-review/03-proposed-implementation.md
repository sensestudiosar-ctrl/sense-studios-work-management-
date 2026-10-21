# Exact proposed production changes — approval required

This list is a bounded My Work presentation proposal. It is **not implemented in production** and is not authorization to start. The isolated prototype demonstrates it with fictional, disconnected records. Existing Task/Review/Approval operations remain authoritative.

| ID | Proposed production change | Existing foundation / limits | Acceptance before adoption |
|---|---|---|---|
| MW-01 | Refine My Work page hierarchy: personal work first, compact typed decision/attention sections with visible source states | Reuse MyWorkRoute, ApprovalQueue, MyWorkAttention and TaskWorkspace; retain independently authorized sources and management-only exit attention | Every existing queue/action/empty/error/retry/page remains reachable; no role-title permission inference |
| MW-02 | Add prominent Active/Overdue/Due today/Waiting/Reviews/Upcoming lenses using supported task phase/date filters | Active includes waiting/review; target-date flags are not persisted status; Reviews task phase differs from personal exact reviewer inbox; counts overlap | Calendar boundary follows existing organization semantics; authorized query counts, pagination and source identity; no summed total |
| MW-03 | Refine List rows/cards to show exact owner, project/stage, status and named target/committed dates | Reuse authorized task/setup labels; no committed-date fallback, normalized-email versus display-name confusion or invented stage | Long titles wrap; missing stage/commitment labeled; correct personal membership, no private project-name leakage |
| MW-04 | Make selected detail and filtered list context easier to retain; provide contextual mobile return and focus restoration | URL/query/popstate/Back already exist; extend rather than rewrite. Retain List/Cards/Kanban/Timeline and existing detail-only behavior | Direct link, filters/sort/page/view, Back/Forward/reload and cross-module exact return; no inaccessible stale detail |
| MW-05 | Add evidence/action strip and next actor/action presentation to My Work task detail | Existing task version/capabilities/history; exact review task/round/revision where supported. No new shared workflow engine | Each field traces to authorized current response; actual actor and command match; no optimistic success or arbitrary state dropdown |
| MW-06 | Present existing commands through readable bounded context/reason/prerequisite surfaces | Preserve Start/Complete/Wait/Resume, early-start acknowledgement, edit/assignment/checklist/collaborators/dependency/recurrence/date/extension/closeout and owning Review links | Full operation parity inventory before code; expectedVersion/reasons/required review/holds/conflicts preserved; each consequential command verified in owning workflow |
| MW-07 | Distinguish loading, empty, no matches, denied, source error, session loss and offline presentation | Existing task/attention states reused; general My Work offline cache is not established | Denied never masquerades as zero; partial sources remain independently truthful; no cached privileged names shown as current; offline decisions unavailable |
| MW-08 | Apply approved semantic typography/contrast/focus/control spacing to bounded My Work surfaces | Map existing CSS to semantic roles; no app-wide theme or library replacement | Readable 14px rows/12px metadata, 44px touch controls, contrast/reflow/keyboard/real screen-reader checks; no covered controls |

MW-01–07 are UX improvements: hierarchy, finding work, interpretation, continuity, decision confidence and recovery. MW-08 includes accessibility UX and cosmetic alignment. Purely cosmetic options are limited to operational heading typography, icon alignment, radii and decorative dividers; they must not substitute for acceptance of the behavioral contracts.

## Subsequent role and detail-close proposal

The Owner's later requests add these isolated prototype explorations; they still do not authorize production changes.

| ID | Proposed production change | Boundary and acceptance |
|---|---|---|
| MW-09 | Personal versus management work context for permitted team leaders and Owner | Session and current server-authorized read/capability determine availability. The prototype role selector is demonstration-only and must never become a production privilege switch. Leader uses existing authorized all-source union, not an invented all-Team query; Owner scope stays in the current organization. |
| MW-10 | Owner/project/status filters and recorded progress overview in management context | Retain existing reads and canonical states/dates; counts identify returned scope/page. No guessed completion percentages or utilization calculations. Keep independent reviewer/approval sources separate. |
| MW-11 | Contextual create-and-assign / eligible reassignment presentation | Reuse existing owning Tasks commands, eligible candidates, reasons/version/project/review/capacity gates and immutable history. A focused ordinary-work preview does not imply full create-type/form parity or authorize new operations. |
| MW-12 | Close desktop detail and expand the worklist, with accessible reopen/context return | Preserve filters/page and task URL/history; close clears selected task explicitly, focus returns to its row, selecting a task reopens detail. Preserve mobile return and unknown/denied states. |

See [team leader and Owner mapping](06-leader-owner-work.md) for source, requirement, reference and validation boundaries. MW-09–12 are workflow/accessibility UX proposals; the earlier color treatment remains semantic presentation. Any future management addition would need a separately selected bounded scope and affected production verification.

## Candidate frontend edit boundary

Later selected implementation would be bounded to MyWorkRoute composition in `apps/web/src/app.tsx`, personal-mode presentation/context in `task.tsx` and `task.css`, attention presentation in `my-work-attention.tsx`/`.css`, and the queue presentation in `approval-queue.tsx`/`.css`. Any shared visual extraction would require an explicit operation-parity review before widening this boundary. Existing module tests would be retained and extended for the selected changes. No edit to `main.tsx` route isolation, API, contracts package, Prisma/schema/migration, authentication/permission policy or production deployment is proposed. General Task view behavior must remain intact because My Work currently shares TaskWorkspace.

## Explicitly excluded

Backend/database/schema/permission changes; new task states/transitions or date rules; broader creator/manager access; drag scheduling; bulk approvals; automatic task actions; generic Undo; general content search; persistent account pin/density storage; new offline caching; timer behavior; client final-batch decisions; changes to other production modules; roadmap-wide adoption. No completed functional slice is reopened by this proposal.

If current APIs cannot supply a required label, source capability, calendar boundary or context, record the dependency and stop that item for a bounded Owner decision; do not fabricate data or infer authority. Approving this prototype is still distinct from a later instruction selecting production changes.

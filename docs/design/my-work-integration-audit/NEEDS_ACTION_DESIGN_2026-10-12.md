# Needs action — demo behaviour and proposed application design

Status: design for Owner discussion. No task-based Needs action filter, backend API, schema or permission change has been implemented by this report. MW-I02 remains IN PROGRESS; MW-I03 remains excluded.

## Exact reference

`D:/SCRAP/prototype (2).html`, SHA256 `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`.

The demo defines `needsAction` on each sample task (`make`, line541), defaulting it to true. Its actual predicate is `task.needsAction && task.status !== 'done'` (line626). The flag is sample data, not a rule derived from status, due date or authorization. The prototype was inspected directly from its HTML/JavaScript; a new browser capture of the file URL was unavailable under the browser tool's HTTP/HTTPS restriction.

### What the demo includes and excludes

| Demo task | State / timing | Needs action | What this establishes |
| --- | --- | --- | --- |
| SS-142 Revise bedroom wardrobe working drawing | Correction, due today | Yes | Corrections can require action. |
| SS-153 Submit kitchen 3D perspective | In progress, due tomorrow | Yes | Action can be required before the due date. |
| SS-176 Update lounge false-ceiling plan | To do, due in three days | Yes | Ordinary unfinished work can be flagged. |
| SS-167 Confirm bathroom tile measurements | Waiting, overdue | No | Overdue and Waiting alone do not qualify. |
| SS-188 Submit master bedroom lighting layout | Review, due today | No | Work awaiting somebody else's review may not require the worker's action. |
| SS-182 Prepare paint and veneer mood board | To do, due in eight days | No | Not every unfinished task qualifies. |
| SS-305 Resolve ceiling snag escalation | Waiting, overdue | Yes | Some Waiting tasks are flagged despite a recorded next actor. |
| SS-408 Resolve procurement cost escalation | Waiting, overdue | Yes | The flag does not consistently prove that work is ready for the signed-in person. |

In the untouched sample data, empty search and each role's personal My Work scope produce Designer3, Site Staff5, Team Lead4 and Owner3 flagged tasks. These are **demo sample counts**, not live application totals or five genuine employee-exit obligations.

## Click interaction to adopt

1. Show a single count of distinct matching task IDs.
2. Derive it from the current authorized scope, search and applied filters, without applying the temporary card selection to the card's own count.
3. Clicking the card selects it (`aria-pressed=true`), adds the selected border/checkmark, filters the existing queue and brings the queue/search into view below the fixed header.
4. Show a compact queue result indicator: `N tasks · Needs action`, with `Clear widget filter`.
5. Clicking the same card again or Clear restores the base queue, preserving search and applied filters. Selecting another card replaces the temporary selection.
6. Keep normal pagination, display modes and existing task commands. Keyboard activation and touch should use the same action; focus must remain visible.

The other demo cards use this same temporary selection pattern. The current Reviews card opens the assigned reviewer inbox; the demo Reviews / corrections card filters task states. That is a separate count/scope decision, not just a styling change. Existing reviewer-inbox access must remain available whichever presentation is chosen.

## Recommended real application rule

Define Needs action as **unfinished tasks with an actionable obligation for the signed-in account**, using real assignment, task/project state and existing authorized workflow capabilities. Treat the label as work the person can act on now, rather than as another Overdue metric.

Examples of possible reasons, subject to the decisions below:

- Complete assigned correction work.
- Work on an assigned task that is ready to start or continue.
- Review a submission that is currently assigned to this reviewer.
- Reassign a genuine employee-exit hold when this account is authorized to do so.

A task with several reasons still counts once. An independent Decisions record with no canonical task link must stay a separate source. Do not add approval records, correction totals and management totals together and call that a task count. Do not infer readiness from free-text waiting reasons or invent task totals for an Owner without an employee identity.

### Decisions needed before implementation

1. **Ordinary work:** should every assigned task that is ready to start/continue qualify, or only work due today/overdue or explicitly needing a response? The demo includes future-due work, so a due-today-only rule would differ.
2. **Scope:** should the filter include authorized review and management tasks outside the personal ownership/collaborator queue, or remain personal tasks only? The broader option needs an explicit action-required scope and independent permission review. The ordinary Owner personal count must remain0.
3. **Waiting:** what establishes that the user can act now? Waiting for another actor must not qualify merely because a Resume control exists. Owner reassignment holds are a specific, supported obligation.

## Smallest implementation after rule approval

Use one server-side predicate for both the paginated queue and its count. Return actor-specific eligibility/reasons from existing rules; a new manually editable flag or database column is not automatically necessary. Add a validated read filter only after the scope and eligibility decisions are settled. Preserve every current task/read/action permission.

Frontend selection can then apply a temporary `needs_action` preset to the existing queue, use the same count query at limit1, retain base filters and expose Clear. Do not fetch one page and filter it in the browser: that would produce incomplete results, wrong pagination and unreliable totals.

Required verification includes personal and broader-scope isolation, unique task counting, count/query agreement, terminal/cancelled/project-hold states, employee-exit gates, assignment changes, waiting next actors, stale/denied/error states, preserved filters, all four views and commands, keyboard/touch, and 1440×900 / 1024×900 / 390×844 / 320×740 geometry. Authenticated database operations still require a fresh bounded Owner authorization.

## Current implementation boundary

The earlier approved interim card still shows **separate Corrections and Management numbers**, with Decisions navigation. It is an independent-source shortcut, not the new task filter. Its extra source labels/link make it taller than the prototype; replacing it with the agreed single task metric should restore the compact card proportion. Do not claim that the new task-based behaviour is already working.

No production data, PostgreSQL operation, task lifecycle, backend contract, schema or permission was changed for this design. Actual context/design review used GPT-6.1 Sol.

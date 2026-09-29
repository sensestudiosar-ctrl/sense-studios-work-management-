# S09 Tasks, participants and state

**Status:** COMPLETE for development/local staging. The Owner authorized S09 on 2026-09-28. S08 is COMPLETE; see `S08_COMPLETION_REPORT.md`. S10 and later remain unauthorized. S09_COMPLETION_REPORT.md records actual acceptance and limits.

## Approved source and requirement sub-IDs

The source is `requirements/APPROVED_REQUIREMENTS.md` and approved clarifications C-001–C-024. S09 depends on S03 authorization, S04 audit/outbox, S05 approvals, S07 branch-owned projects and S08 applied plans. The four increments below are implemented; final acceptance evidence is recorded in S09_COMPLETION_REPORT.md.

- R-018.a: each task has exactly one non-null Primary Owner; R-018.b: zero or more distinct collaborators may contribute without replacing accountability. Optional per-person estimated effort is explicit, never divided automatically; S17 owns capacity calculations under R-047.
- R-019.a: Owner and explicitly authorized Team Leaders create and assign work within their scope; R-019.b: any active employee can create a self-task; R-019.c: ordinary employees cannot assign others.
- R-020.a: represent project, non-project, recurring, correction, site and training/practical task types. Recurrence generation, review, site and training execution stay with their owning later slices.
- R-021.a: name, Primary Owner, priority, type and target date are required. R-021.b: description, project/plan item, collaborators, reviewer, start date, estimate, tags and checklist are conditional/optional. Attachments, dependencies, reminders, committed due-date changes, recurrence execution, skills and formal review/client visibility wait for S10–S18/S24 as applicable; do not imply these features run from stored labels.
- R-022.a: Low, Medium, High and Critical priorities; R-022.b: Critical escalation is deferred to S24 notification rules, while the priority is persisted and visible now.
- R-023.a: distinguish an operational target date from a controlled committed due date. S09 requires a target date; S10 owns committed due-date history, extension requests and management decisions.
- R-024.a: persist valid task states with reasoned transitions and history; R-024.b: review states may only execute after their S13/S14 review handlers exist, and `Overdue` remains derived rather than persisted. C-011.a adds a terminal `Stopped due to project cancellation` outcome for unfinished delivery tasks.
- C-023.a: employee exit immediately revokes sessions/grants and atomically puts every unfinished owned task in Waiting with a needs-reassignment reason while preserving owner and prior state. C-023.b: each task needs an explicit eligible manager reassignment and valid resume, with history and audit; terminal tasks stay unchanged.
- C-024.a: the same exit operation holds Active projects led by the exiting employee, revokes current lead authority, preserves history and alerts the Owner. Only Owner replacement permits ordinary audited resume.
- C-010.a/C-011.b: only Owner finalizes cancellation from Draft, Active or On Hold with a reason; one transaction stops unfinished delivery tasks, preserves completed work and evidence, and records project/task audit and outbox.
- C-012.a/C-013.a/C-014.a/C-015.a: cancellation must fail closed while active native CAD links lack confirmed Owner revocation or client project grants lack individually chosen expiry; vendor/consultant access ends, client access narrows and pending client decisions withdraw when those later modules exist. No such external grants, links or client decisions exist in S09's current schema; future slices must join the cancellation transaction before introducing them.
- C-016.a: a distinct linked closeout task on a Cancelled project requires assigned Project Lead or expressly granted Team Leader approval, with reason, scope, owner, due date, actor and time. C-016.b narrow expiring vendor/consultant closeout grants are deferred to S21 and must never be inferred from a task approval.

## In scope and boundaries

Persist tasks, one owner, collaborators and their optional explicit effort estimates, type/priority/core fields, state/version and immutable assignment/state evidence. Provide scoped creation, reads, edits and transitions through backend authorization, audit/events/outbox and responsive own/assigned views. Project tasks require current project access and the owning branch; a project assignment alone does not grant task management. Self-tasks cannot name another owner. Authorized manager assignment checks the employee, reporting/project scope and explicit permission. Guessed IDs, stale versions, revoked access, cross-branch leakage and invalid transitions must fail.

Effective employee exit and project cancellation join all current consequences in atomic transactions. New task writes on On Hold, Completed, Archived or Cancelled projects are denied except C-016 approved closeout on Cancelled. Unfinished stopped delivery tasks cannot resume. Completion cannot bypass future required review gates. S09 stores only fields whose behavior is implemented or clearly marked as metadata.

Out of scope: S10 committed dates, dependencies, recurrence and ordinary Waiting delay workflow; S11/S12 files; S13/S14 review and client decisions; S16 time; S17 capacity; S18 training; S21 external portals/CAD links; S24 reminders/escalation. Those slices must extend the task policy without treating an S09 label as execution or approval evidence.

## Increment and acceptance plan

1. **S09A task-state policy:** define valid initial/active/terminal states and the S09-owned transition boundary; unit-test invalid transition, stopped-delivery finality, exit-wait preservation and review-gate fail-closed behavior. No database or HTTP behavior is claimed by this increment.
2. **S09B task persistence and API:** reviewed migration with non-null owner, organization/project composite references, valid type/priority/state, optimistic version and append-only history. Rehearse upgrade from S08 without changing existing rows. Implement scoped reads/creation/assignment/state commands, canonical audit/event/outbox and API/database tests for self-task, manager assignment, branch/project isolation, tampering, concurrency and rollback.
3. **S09C responsive UI:** own/assigned lists and forms, explicit permissions, loading/empty/denied/error/conflict states, refresh persistence and desktop/mobile checks.
4. **S09D exit and cancellation:** join S03 revocation, S07 project hold/cancellation, task waits/stops and canonical evidence in single transactions. Verify rollback under injected failure, completed-task preservation, denied resume before reassignment, Owner-only cancellation, closeout approval and current access denial. Keep future external access integrations fail-closed.

All four increments passed the applicable schema, backend, API, permissions, persistence, audit/outbox, UI, tests, typecheck, lint, build, desktop/mobile and documentation gates on dedicated PostgreSQL databases. S09_COMPLETION_REPORT.md records exact checks and deferred scope.

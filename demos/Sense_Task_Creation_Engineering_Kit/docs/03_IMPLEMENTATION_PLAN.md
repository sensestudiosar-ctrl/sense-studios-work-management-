# 03 — Engineering workflow and file ownership

## Phase 0 — Audit and protect

- Confirm repo root, single canonical frontend and backend, active branch/commit, `git status`, dependency versions, package scripts, and running local servers. Match server process build to commit/source before screenshots.
- Inspect current `task.tsx`, `task-create-dialog.tsx`, `task-create-dialog.css`, `task-composer-fields.tsx`, `task-creation-options.ts`, shared contract and API task controller/service. Record diffs between latest current implementation and earlier handoff. Respect unrelated uncommitted edits.
- Inventory create-task entry points: My Work, Tasks, Project Tasks, Add Subtask, Site where supported. Identify whether they already invoke one shared composer.
- Make a screenshot of existing app (before). Keep a clean, narrowly scoped branch or worktree based on the latest approved integration commit. Never build from stale initial branch.

## Phase 1 — Visual decomposition (no backend writes)

Use `reference/sense_task_creation_production_candidate.html` as a specimen, not as React code. Split into existing React components where appropriate:

| Surface | Preferred existing owner | Responsibility |
|---|---|---|
| Task create dialog/drawer | `task-create-dialog.tsx` | dialog lifecycle, sticky Create, Escape, scroll, focus restore, unsaved guard, responsive shell |
| Main editor | `task-composer-fields.tsx` | title, description, reason direct editors, inline subtasks/checklist |
| Properties inspector | same shared composer component or small subcomponents in same existing module | Task Type, Project, Assign to, Start/Target, Estimated Effort, Priority, Reviews, stage, tags |
| Authorized selection | `task-creation-options.ts` | no-store eligible options, stale reads and permission reconciliation |
| Draft/commands | `task.tsx` | one state machine and payload creation, 409/unknown-outcome recovery, success/open-task |
| Existing API/contracts | unchanged unless separately approved | strict payload validation, tenant scope, review routing and persistence |

A few small accessible reusable components may be extracted (AvatarStrip, PersonPicker, CalendarPopover, PrioritySegment, ReviewRoute, InlineItemList); avoid introducing a new UI toolkit or second task creation workflow.

## Phase 2 — Functional integration

1. Wire title, description and reason as controlled fields with validation and direct-edit look.
2. Wire type/project and authorized options. Only project choice from server setup. Project-scoped route is fixed and valid. Clear dependent fields on project changes.
3. Build ordered assignee strip and inline selection. Distinguish eligible `owners` and `collaborators`; promote only if eligible as primary. Reconcile on options refresh.
4. Wire optional dates, effort and plan item. Date controls use locale-aware display + stable ISO input values. Do not invent future-only date rule.
5. Wire tags and checklist within existing limits. Subtasks are staged in UI but persisted individually after parent success.
6. Wire existing review route and client-publishing authorization. Gate named reviewer selections (if unsupported); verify saved routing from task readback.
7. Wire Recurring Type. Gate unsupported frequency controls pending backend scope and approval. Do not send unknown fields.
8. Wire parent POST, idempotency, retries, capacity acknowledgement, no-duplicate guard, success ID and original task selection mechanism.
9. After creation, open task detail; files/comments use existing endpoints. Show partial-success per operation.
10. Preserve unsaved-close guard and secure draft handling. Do not ship demo `sessionStorage` without approval.

## Phase 3 — Fidelity and interaction iteration

Use side-by-side screenshots at 1440×900, 1440×768, 1024×768, 783×768, 390×844, 320×700 and 320×650. Match task composer dimensions and spacing; compare typography, layout, tags/subtasks, avatar row, review expansion and mobile field order. Use actual test content of reasonable lengths plus an extremely long title/project name. Iterate CSS until differences from V15 specimen are modest and explain any intentional shell differences.

## Phase 4 — Integration/security testing

Run TypeScript checks, lint, unit tests, build and authenticated Playwright. Confirm server validation and database persistence only in disposable environment; ensure correct branch/commit served. Test real 403/409/5xx scenarios, cross-branch restrictions, options stale reset, unknown-result idempotency key, child version checks and partial success. Test manual keyboard, screen reader and touch. Avoid access credentials in screenshots and logs.

## Phase 5 — Handoff, not automatic deployment

Prepare final change summary with changed files and exact commands/results; screenshot comparison; functional trace; release gates; known feature flags; rollback. Request explicit approval before a backend contract extension, schema migration, retained staging change or production/NAS deployment. The deployment owner should release reviewed commits to **one canonical test server** and verify current commit through a health/build identifier.

## Definition of done / anti-duplication checks

- All required entries open the **same** composer and share **the same** create payload builder and existing backend command.
- The old task UI is updated/replaced in place; the app does not dynamically route to a second form or fallback to first version.
- No alternate app server is served as canonical after integration; a runtime build/hash diagnostic can prove what's currently running.
- Existing accepted tasks, reviews and project workflows are unchanged except intended UI improvements.
- No irreversible data actions occurred.

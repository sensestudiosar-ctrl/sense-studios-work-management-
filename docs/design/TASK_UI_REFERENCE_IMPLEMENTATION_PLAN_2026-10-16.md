# Task UI — reference and implementation plan

Date: 16 October 2026. Status: PREPARED FOR DEMO AND IMPLEMENTATION HANDOFF. This plan follows `TASK_CREATION_COMPLETED_UX_RESEARCH_2026-10-16.md` and its Refero evidence JSON. It does not start implementation, reopen the completed Agent1 goal, authorize database lifecycle operations or accept the forthcoming UI demo.

Outcome: staff can create the right task in context, safely recover an uncertain creation, understand completion blockers, and find completed work with its evidence. Preserve the accepted D/G/E/H behavior while improving presentation and discoverability.

## Owner correction — 17 October 2026

The Owner rejected the replacement My Work queue and requires the exact previous `Sense_Studios_My_Work_Final_Demo.html` (SHA-256 f8c18088e04c72acee34c38bdb458bf84fc8cf9fc834667a75e3d5a3d95c59b8). This overrides suggestions below to replace the existing My Work composition. The revised standalone demo copies that base and isolates only task creation. Default viewport images/main DOM match at1440/1024/390/320; this is prototype evidence only. Keep the original widget/row/filter/drawer/mobile composition in later integration. Refero is secondary for creation details. See `../v1-demo/TASK_UI_DEMO_README.md`.

## 1. Reference map and visual target

| Surface | Primary reference | Adopt | Keep out |
|---|---|---|---|
| Creation composition | [Linear task creation](https://refero.design/pages/e5fb7da7-81e7-4855-880d-9cb566924d24), [flow](https://refero.design/flows/6645) | Title/description first, compact labelled metadata, one creation action, contextual success. | Arbitrary status selection, unsaved-draft promises, new recurrence/file-upload contracts. |
| Assignment/context | [Programa composer](https://refero.design/pages/3e7906f9-acc8-4889-9ea1-7f5a9f58608b), [assigned-task flow](https://refero.design/flows/13442) | Date/owner visible before submission, quiet surrounding workspace. | Its “Done” creation label, clear-completed action and unrestricted assignee model. |
| Project task entry | [Workflow creation](https://refero.design/pages/04de1d3e-d515-46eb-aec7-d33233ecd734) | Briefing stays with project context; secondary details have less emphasis. | Decorative file-drop affordance without the real owning workflow. |
| Completed browsing | [MonoDesk completed table](https://refero.design/pages/05f9a012-a1c2-4c8e-b6e0-e195a6e39e06), [browse/filter flow](https://refero.design/flows/10846) | Readable history rows, search, project scope, count/range and pagination. | Unsupported client/column filters, bulk reopen/export and unimplemented completion-date sort. |
| Empty/no-match result | [MonoDesk no matches](https://refero.design/pages/0df8afb0-c39c-464e-9363-84a64829f9a8) | Specific explanation and a useful next action. | Treating unavailable/denied data as an empty successful result. |
| Completion marker/feedback | [Dona completed list](https://refero.design/pages/2fe241a5-6152-4157-9456-cfcd22d449bb), [MonoDesk feedback](https://refero.design/flows/10844) | Small check, clear success, View task destination. | Whole-title strikethrough, faded unreadable records, Undo, deletion or terminal-state toggle. |

**Visual authority:** the existing Sense Studios tokens and Owner My Work reference; the supplied shell/dashboard demo governs shared chrome once inspected. Refero contributes the bounded layout/interaction choices above. Preserve current typography, pine actions, neutral canvas, status meanings and accessible ink. Use existing icon/component conventions, no added font or palette. The shell demo is reported ready but has not been supplied or inspected in this chat; do not invent its measurements.

**Reference lock before implementation:** capture the selected desktop and mobile demo states; identify their files/version and token mapping; record canvas, form order, density, spacing, action placement and recovery panel as the build target. A responsive form must retain access to all required fields; matching a screenshot cannot justify dropping behavior.

## 2. Scope, requirements and ownership

This is a refinement of V1-05/D (R-018–R-024 task ownership/creation/workflow), V1-06/E (My Work query consistency), V1-07/G (canonical Project Tasks), R-006 access and R-099 verification, with H/V1-02 responsive/accessibility requirements. These are implementation work-item IDs, not newly approved product requirements:

| Work item | Scope | Dependency | Delivery condition |
|---|---|---|---|
| TUX-01 | Reference lock and six demo scenes | Existing research; shell demo for exact integration | Concrete reviewed screen/state target and token mapping. |
| TUX-02 | Shared composer hierarchy and eligible people picker | TUX-01; existing creation-options contract | Same canonical command from all entry points; essential fields discoverable. |
| TUX-03 | Creation validation, feedback and same-request recovery | TUX-02; accepted task receipts | Draft preservation, duplicate prevention, exact-key recovery and canonical success. |
| TUX-04 | Completed browsing/detail and visible completion readiness | TUX-01; current Task/Review APIs | Correct phase/scope/count/page; terminal records and server-confirmed completion. |
| TUX-05 | Integration, accessibility, regression and closeout | TUX-02/03/04 | Exact-source functional/visual evidence and explicit local acceptance. |
| TUX-X1 — optional extension | Completion-summary list projection and completion-date ordering/filtering | Separate bounded read-contract decision | Authorized accurate metadata; global predicate/order/page agreement. Not required for core TUX-01–05. |

Agent1 should implement owned Task/My Work/Project components after the demo handoff. Agent2 retains shared shell/dashboard/navigation/auth/access presentation, organization People/Settings and notifications. Coordinate via a written token/component interface; do not independently edit the same shared files. Agent1's Project People surface is distinct from organization People. No agents were launched or messaged by preparing this plan.

Core scope excludes permission-policy changes, new task states, reopen/Undo/delete-completed, bulk actions/export, persistent drafts, new recurrence behavior, uploads in the composer, automatic completion from checklists, new dashboard KPIs and a separate top-level Completed tab. No schema migration is planned for the core UI work.

## 3. TUX-01 — demo package and reference approval

Build one interactive prototype with shared components and fixture-driven states, using the Owner shell. Supply editable source/assets, run instructions, token definitions and screenshots at1440×900,1024×900,390×844 and320×740. Avoid screenshot-only delivery: focus, disclosures, form errors and recovery must be exercisable. State switches are demo controls, visibly separate from product controls. No live API/provider connection is required for the demo.

Required scenes:

1. Create my task: essentials plus expanded optional groups, valid/invalid inputs and dirty-close decision.
2. Assign Project task: fixed project, eligible primary owner/collaborators, review summary; New subtask variant names the parent.
3. Creation outcomes: pending, rejected, overload acknowledgement, uncertain successful write, same-request recovery, canonical success outside current personal/filter scope.
4. Completion readiness: permitted ordinary completion, unfinished-child block, required-review destination, stale version, access changed, final success.
5. Completed queue: search/project scope/filters/page/count, long titles, desktop/mobile; no current overdue warning for completed work.
6. Completed detail: Overview/Checklist/Evidence/Activity, accurate recorded metadata, empty/no-match/error/revoked states and return context.

Acceptance: every visible product control has defined behavior; fixture-only future fields are labelled; current backend-backed core scenes are separated from optional TUX-X1. Select the concrete demo as the implementation target, with current domain rules retained. A demo must not silently approve a workflow or storage change.

## 4. TUX-02 — shared creation composition

Modify `apps/web/src/task-composer-fields.tsx`, `task-create-dialog.tsx`/CSS and their callers/tests in `task.tsx`. Reuse `task-creation-options.ts`; introduce a small owned eligible-person picker only if the existing components cannot support the interaction. Do not refactor the whole TaskWorkspace to deliver this refinement.

Form order: New task / named Project or parent context; task name and optional description; primary owner and Target date; priority/type; visible review summary for project work; required “Why is this task needed?” reason; named optional Collaborators, Planning, Tags/checklist groups; Cancel/Create task footer. Presentation variants can change emphasis/defaults, never authority. Hide technical OWNER/EMPLOYEE variant labels from the main user flow.

Use the existing eligible owners/collaborators response, with local text search and an accessible selection list. No Staff directory call. Show selected collaborators compactly, permit removal and retain their explicitly entered effort. Keep owner distinct from collaborators. Project changes refresh eligibility and clear dependent selections with a visible explanation; late options for a previous project/account cannot restore invalid choices. Project Tasks fixes project; subtasks fix both parent/project. Owner without employee identity explicitly chooses an eligible employee.

Keep existing initial defaults and command normalization. Required fields remain visible; no invented date/reason. Preserve current native dialog, body scroll lock, guarded close and return focus. Named disclosures require keyboard/focus/touch behavior, not CSS-only hiding. On mobile use one column and a footer clear of the software keyboard and safe area; expanded content may scroll.

Acceptance/tests: ordinary/self/Owner-without-employee/manager/fixed-project/child variants use the same `taskCreateBody`; options loading/error/retry/no-eligible-owner states work; search reveals only eligible choices; context changes reject old reads; required/review values survive disclosure changes;44px controls and first-error focus. Extend existing composer/options/dialog tests rather than parallel form implementations.

## 5. TUX-03 — reliable creation states

Modify the creation presentation/callers in `task.tsx` and narrowly extract an owned feedback component if necessary. Preserve `creationPending`, uncertain command body/key, receipt semantics, capacity acknowledgement and canonical returned-ID handling.

| State | Product behavior | Verification |
|---|---|---|
| Editing | All required fields discoverable; dirty close asks Continue editing/Discard. | Keyboard and pointer close; no lost values. |
| Invalid | Explain the exact field error, focus it; blocked submit has a visible reason. | Required title/Target/owner/reason and bounded values; no network request. |
| Sending | Creating…; prevent second submit and dismissal; values stay stable. | Two same-tick submissions produce one HTTP command. |
| Confirmed rejection | Keep fields; show domain/access explanation and appropriate retry path. |403/409/validation cases; no success or phantom row. |
| Capacity warning | Existing acknowledgement, explicit user action, draft retained. | Changed draft invalidates acknowledgement; no fabricated capacity projection. |
| Unconfirmed | Single prominent recovery panel and locked submitted summary. “Check creation result” resends the exact same command/key. | Lost real201 response then recovery: same task ID, one receipt/task/evidence set. |
| Confirmed | Close composer, announce success, open/offer canonical task and refresh real relevant counts. | Correct ID outside filtered page/personal ownership; no local insertion into an unauthorized or unrelated queue. |
| Expired/revoked | Clear protected reads and ask for appropriate sign-in/access recovery. | Old account/context cannot receive late fields/options/results. No durable-draft promise. |

No “Saved draft” badge, auto-retry with fresh key, generic completion-retry receipt or reload-survival claim. Discarding an uncertain request must explain that a task may already exist and preserve the existing explicit decision guard.

Extend `task-creation-flow.test.tsx`, `task-create-dialog.test.tsx`, `task-composer-fields.test.tsx` and Project context regressions. Receipt/backend code changes only if a reproduced regression requires them; visual integration alone does not justify rewriting the accepted receipt design.

## 6. TUX-04 — completed work and readiness

Use current `GET /api/v1/tasks` with `phase=completed` and the existing personal/assigned/project scope, supported filters/sort/offset/limit. Add a discoverable Completed control within the queue, using existing URL/history namespaces. Entering Completed should not retain a conflicting active-status filter unnoticed: preserve compatible filters, clear conflicting phase/status/metric or source-only selections explicitly, and reflect the resulting chips. Back returns the previous view/search/page. Needs action continues to use its separate actionable-source contract.

Modify `task.tsx`, owned My Work row presentation in `my-work/my-work-parity.tsx`/CSS, refinement controls and `task-detail-drawer.tsx` only as necessary. Prefer reuse of canonical rows/drawer. A shared display mode may emphasize Completed state without duplicating the task domain model.

Desktop row: noninteractive completion indicator, readable title, project, owner, accurately labelled Target and priority/state. Mobile row: title, project/owner, state and date without hidden hover actions. Preserve accessible status fills/ink. Completed rows do not display current overdue warning, active next-step verbs or an unchecked/reopen control. Existing supported sorting must be honestly labelled; core V1 must not call created-date order “Recently completed.”

Detail keeps Overview/Checklist/Evidence/Activity, current access checks and canonical destinations. Show a completed banner and known completion transition time/reason from current detail history. Do not infer completion actor from task owner; use an authorized typed actor display only if supplied. Remove stale checklist guidance to “Edit task” when edit capability is absent. Do not broadly suppress specialized domain actions merely from status: retain their actual capability checks.

For open work, provide a visible readiness/action panel: permitted Complete task, required reason and final-state explanation; or a specific blocker and authorized destination. Reuse existing task/subtask/current-review facts. Missing facts are unavailable, not ready. Do not invent a second client-side eligibility algorithm; backend still decides. Required-review completion remains in its existing owning internal/client workspace; ordinary completion uses `POST /api/v1/tasks/:id/state` with current version/reason. No generic Done dropdown bypass.

Pending completion retains detail and blocks repetition; confirmed success keeps the completed detail inspectable, refreshes affected views and offers View completed. On409 refresh current facts before a new command; preserve useful reason without reapplying stale decisions. On lost completion response re-read canonical task before offering another action. No Undo/reopen promise. Checklists do not automatically complete tasks or add new blocking requirements.

Tests: completed/active URL context and filter composition; matching count/page; no overdue for terminal tasks; ordinary vs required review action; hidden child names not exposed; final detail without ordinary mutations; empty vs no-match vs failed/denied reads; keyboard focus after row leaves Active. Reuse Task/Project/My Work regressions and actual authenticated owning workflows.

## 7. TUX-X1 — optional completion metadata read contract

This extension is proposed separately so core delivery can finish using existing fields. Desired additions: accurate Completed on/by and optional completion-date filtering/order. Owner review should settle the exact public fields, actor-display privacy, organization-timezone day boundaries, unknown-history behavior and desired ordering before implementation. No default numeric policy or automatic new table.

Proposed design direction: derive a typed completion summary from canonical `TaskStatusChange` records where `toStatus=COMPLETED`, scoped to authorized tasks/organization, deterministically chosen by taskVersion and ID. Keep missing history explicitly unknown; never substitute `Task.updatedAt`, Target or review approval. Resolve display names via existing permitted task evidence conventions, not a general people directory. Bulk-load summaries for authorized page IDs; do not add one detail request per row.

For global completion order/filter, database predicates must apply before pagination and match the total count. Page-local sorting is invalid. Use parameterized/typed queries and stable task-ID ties. A separate `completed` date basis/query contract must not silently change existing target/committed date meanings or actionable-source behavior. Unknown-time rows have an explicitly decided position. Prove query bounds and real authorization/count/order behavior. If an index/schema change is actually necessary, prepare a bounded decision before migration; no migration is presumed or authorized by this plan.

## 8. API mapping and preserved rules

| UI need | Existing owning contract |
|---|---|
| Context/eligible people | Task setup plus `GET /api/v1/tasks/creation-options?projectId=…`. Server decides eligibility. |
| Ordinary creation | `POST /api/v1/tasks`, current strict body/CSRF and optional idempotency key. |
| Child creation | `POST /api/v1/tasks/:id/subtasks`, same fields and `expectedParentVersion`; one-level same-project rules. |
| List/completed history | `GET /api/v1/tasks`, existing phase/scope/query/count/order/page. |
| Detail/subtask readiness | `GET /api/v1/tasks/:id`, `GET /api/v1/tasks/:id/subtasks`; actual current capabilities/version and per-resource access. |
| Ordinary completion | Existing `POST /api/v1/tasks/:id/state`; eligible IN_PROGRESS, reason/version, primary-owner/Owner authority, project/reassignment/review/child gates. |
| Required-review completion | Existing internal/client-review workspace and commands. Route using actual canonical task/round context; no new synthetic endpoint. |

Preserve atomic task/receipt/history/audit/event creation, immutable review snapshots, optimistic versions, branch/project isolation and cancellation/employee-exit history. Frontend labels/pickers never grant authority. Do not reinterpret an assigned reviewer as the task owner.

## 9. Implementation order and verification

Order: TUX-01 → TUX-02 → TUX-03 → TUX-04 → TUX-05. Within planning, TUX-04's fixture/demo can be prepared independently of the composer, but `task.tsx` edits need one integration owner. Agent2 may continue the shell/dashboard independently under their existing scope. Do not run two writers against task.tsx. Optional TUX-X1 starts only after its contract is settled and is integrated after the core completed view.

Before code: record actual current source and shared working changes; inspect the selected demo and affected callers/tests. Accepted Agent1 snapshot remains historical evidence, not evidence for changed UI. Keep changes narrow; preserve other-agent edits. No reset/stash, broad refactor, commit/push/deploy is part of this plan.

During implementation: reproduce meaningful failures before fixing, add focused regression coverage at the cheapest reliable layer; run affected web tests, then relevant API/controller/database cases only if contracts/commands changed. Use Node24.19.0/pnpm11.19.0. Existing commands are `pnpm --filter @sense/web test:unit`, `pnpm --filter @sense/api test:unit`, dedicated configured integration tests, `pnpm typecheck`, `pnpm lint`, `pnpm build`. At final integration use the required applicable full gates; `pnpm verify` is the repository's full verification command and cannot be claimed until actually run successfully in an authorized environment.

The two prior Agent1 PostgreSQL targets and MW-I02 are stopped and preserved. Preparing this plan or a demo grants no restart/migration/seed authority. For real browser/persistence acceptance, identify an authorized dedicated lifecycle first; if no active authorized target exists, prepare its concrete bounded harness and obtain the required lifecycle decision. Static/demo work proceeds independently. No retained/production operation or fake CI override.

Final browser matrix: four specified widths; ordinary/self/assigned/project/child creation; repeated submit; changed eligibility; overload; lost success response/same-key recovery; completion blockers/required review; completed detail/history; stale/revoked/session expiry; preserved URL/search/scroll. Measure controls, focus, readable contrast and overflow. Add an actual software-keyboard device check; desktop viewport emulation alone cannot prove it. Compare representative viewport/full-page captures against the locked demo, with defects fixed and recaptured. Do not claim all reference images or automated states were independently visually reviewed.

Definition of done: exact-source implementation and applicable local checks pass; current backend permissions/persistence/evidence/workflows preserved; demo deviations recorded; no unsupported controls or promises; visible loading/empty/error/denied/conflict/uncertain states; keyboard/mobile behavior verified; current status/report updated with actual model/checks/limits. A further review follows then-current model instructions; the previous Owner Codex exception was bounded to the earlier Agent1 acceptance, not automatically this new work. Staff-pilot and production acceptance remain separate.

## 10. Handoff checklist

- Owner supplies shell/dashboard demo source and the chosen task demo package; integrator records the visual target/version.
- Agent2 supplies shared tokens/chrome interfaces; Agent1 owns task-specific composition/behavior. Cross-owner requests are written handoffs, not silent edits.
- Implement core TUX-02/03/04 with existing APIs, retain the accepted backend and safe recovery behavior.
- Keep TUX-X1 visibly optional until its read contract is decided; do not ship mock completion dates as real data.
- Deliver source, state/test matrix, reference comparisons, exact check results, stopped-owned-target receipt where applicable and concise residual limits.

Prepared deliverables: this implementation plan; the linked research report; Refero evidence JSON. No new implementation, model-independent acceptance or application test run is claimed by preparing them.

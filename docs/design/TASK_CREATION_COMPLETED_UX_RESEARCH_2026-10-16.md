# Task creation and completed work — UI/UX investigation

16 October 2026. Research and demo requirements, not a production redesign or implementation approval. Prepared with the installed Refero design skill and live Refero references, current frontend/backend source, and preserved Agent1 acceptance captures. No application source, database or runtime was changed. Prior Agent1 completion is unchanged.

## Recommendation

Use one focused creation experience across My Work, Tasks and Project Tasks; preserve the entry context and real command/recovery rules. Present completed tasks as searchable work records with readable evidence and history. Make completion a guided, permission-aware action whose result is confirmed by the server. A completed work record is distinct from a checklist item, review approval or cancelled task.

Designing for real internal staff on responsive web. Goal: create the correct work with minimal repeated input, understand the next permitted step, and retrieve finished work later. Existing Sense Studios tokens, My Work demo and the forthcoming Owner shell/dashboard demo remain the visual authority. This investigation borrows interaction patterns, not another product's brand or authorization model.

## Refero research and reference lock

Reviewed three full style references after three style searches; seven full screen references; four full flows. Visually inspected the Linear creation, Dona completed list and MonoDesk completed table images through Refero. Also inspected the preserved320px uncertain-creation capture from the real app. Refero captures describe the reference versions; they do not certify the products' current releases. Some Refero descriptions infer animations, bulk actions or exports from static screens; those inferences are not treated as verified features here.

| Reference | What it contributes | What does not transfer |
|---|---|---|
| [Linear creation screen](https://refero.design/pages/e5fb7da7-81e7-4855-880d-9cb566924d24), [creation flow](https://refero.design/flows/6645) | Clear title/description hierarchy, compact explicit metadata controls, one named creation action, confirmation returning to work context. | Its saved-draft promise, recurrence settings, file uploads, nested pre-create children and arbitrary status choices are separate contracts; they are not implied by our composer. |
| [Programa composer](https://refero.design/pages/3e7906f9-acc8-4889-9ea1-7f5a9f58608b), [assigned-task flow](https://refero.design/flows/13442) | In-context entry with title/notes, date and assignee before saving; useful precedent for creative-studio work. | “Done” is ambiguous for task creation here. Use “Create task.” No “Clear completed.” |
| [Workflow creation](https://refero.design/pages/04de1d3e-d515-46eb-aec7-d33233ecd734) | Project context and metadata stay with the briefing; optional material is visually subordinate. | A file dropzone would require a real document/evidence workflow and partial-failure handling. It is not a decorative promise in V1 creation. |
| [MonoDesk completed list](https://refero.design/pages/05f9a012-a1c2-4c8e-b6e0-e195a6e39e06), [browse/filter flow](https://refero.design/flows/10846), [no-match screen](https://refero.design/pages/0df8afb0-c39c-464e-9363-84a64829f9a8) | Searchable work history, explicit project context, readable rows, pagination and distinct no-match recovery. This is the primary structural reference for completed work. | Client/list/column controls, completion-date sorting, exports and bulk actions are not existing Sense task-list contracts. No new top-level app tab is required. |
| [Dona completed list](https://refero.design/pages/2fe241a5-6152-4157-9456-cfcd22d449bb), [Amie completed screen](https://refero.design/pages/b86e234b-830e-48a7-9994-4545afbe5a56) | Small check indicator and clear completed-state separation. Dona's whole-title strikethrough is a useful counterexample for dense work records: keep our long titles fully readable. | No deletion, unchecked toggle, permanent clearing or low-contrast faded record. |
| [MonoDesk completion feedback flow](https://refero.design/flows/10844) | Clear pending/success feedback and a way to inspect the affected task. | Its “Undo” would violate our terminal state contract. Offer “View task” or “View completed,” with no reversal promise. |

Full styles studied: Asana (`a62c0ef5-f510-4e58-9321-e7605524a47e`), Todoist (`d9a3223e-d0d5-436b-aa09-0facd1805a1e`), shadcn UI (`c14c0a94-1037-449e-bf5b-4cb972656ac7`). These are marketing/component style systems, not evidence of in-app behavior. Borrow only disciplined hierarchy, neutral separation and restrained emphasis. Reject Asana's large display scale, Todoist's action-red branding and shadcn's black-only CTA scheme for this app.

Reference lock: existing Sense canvas, pine primary actions, typography, approved status fills with readable ink, restrained borders and existing component shapes. Primary interaction foundation: Linear's focused creation; primary completed-list structure: MonoDesk. Secondary contributions: Programa's contextual metadata and Dona's small completion marker. No new font, palette, decorative illustration, gradient or celebration overlay. Use code-native icons; motion, if added, is brief and respects reduced motion.

## Current behavior and useful refinements

| Current source/evidence | UX implication |
|---|---|
| `task-create-dialog.tsx` already uses a native modal with body scroll lock, guarded dismissal and restored focus; CSS has a760px desktop maximum and94dvh mobile sheet. | Preserve this architecture. Improve hierarchy inside it; do not introduce a competing creation route/form. Mobile software-keyboard visibility still needs a dedicated demo/test; existing four-width captures do not prove it. |
| `task-composer-fields.tsx` contains title, type, priority, target date, project, ownership, collaborators, planning and reason. Optional planning collapses for Employee/Site but expands for Owner/Leader. Collaborators currently render as individual choices. | Make optional groups consistent across presentations and replace a long participant wall with an eligible-person picker. Do not hide required owner/reason/review choices in an unexplained overflow. |
| Creation header exposes OWNER/EMPLOYEE/SITE variants and explains employee identity/manager permission in technical terms. | Use ordinary labels (“New task,” “Assigned to you,” “Choose a primary owner”). Variant names belong in implementation, not the main user journey. Eligibility explanations should describe the specific missing assignment or available action. |
| The real320px uncertain-create capture preserves the command and puts “Check creation result” above locked fields. | Keep the safety mechanism. Use one prominent recovery panel, neutral warning language and a compact submitted summary so recovery is visible without scrolling through disabled fields. Never replace it with a fresh “Try again” create. |
| `task.tsx` has Completed phase and completed status shortcuts. `TaskService.list` already supports `phase=completed`; My Work Needs action is a separate source-qualified queue. | Add discoverability within the work queue instead of creating another task store or forcing completed records into Needs action. Preserve the project and personal/assigned access scope. |
| Task detail already has Overview, Checklist, Evidence and Activity, and capability-based actions. Completion may be disabled with an explanation in a hover title. | Keep the drawer/tabs; place visible readiness explanations beside the action because touch/keyboard users cannot depend on a tooltip. Completed detail should emphasize recorded outcome/history and permitted evidence navigation. |
| `task-state-policy.ts` makes COMPLETED terminal. Ordinary completion needs IN_PROGRESS, no required review, current version, reason and domain authority. Required reviews complete through dedicated owning workflows. | No generic Done checkbox, drag-to-Done bypass, reopen, Undo or “clear finished work.” Approval is not synonymous with completed. Checklist progress alone is not a completion gate in the current model. |
| `Task` has target/committed/start/created/updated dates but no `completedAt` field. Status history records the completion transition; current list projection has no completion summary/sort. | Never label `updatedAt` or Target as “Completed on.” Derive a bounded authorized summary from canonical completion history if that read contract is added. Completion-date filters/order/grouping require backend work; no new table is automatically required. |
| Current task row code excludes COMPLETED from overdue styling. | Preserve this. A past target can remain visible as Target, without a current red overdue warning. “Completed late” requires comparing an actual completion timestamp with a clearly named target/commitment. |

Source pointers: `apps/web/src/task.tsx`, `task-create-dialog.tsx`, `task-composer-fields.tsx`, `task-creation-options.ts`, `task-detail-drawer.tsx`, `my-work/my-work-parity.tsx`; `apps/api/src/task.service.ts`, `task-state-policy.ts`, `review.service.ts`, `task-read-filters.ts`; `apps/api/prisma/schema.prisma`; S09/S10/S13/S14 workflows and approved V1-05/06. These findings are inspection/recommendations, not newly executed behavior tests.

## Task creation: proposed interaction

1. Enter through a consistent “Create task” action. Preserve the page, project, search and scroll context. A child entry says “New subtask” and names its parent.
2. Show the essential group first: task name, optional description, project/context, primary owner, Target date, priority/type and required reason. Owner choice is visible when required; self ownership is explicit when the actor has an eligible employee identity. Keep the reason label understandable: “Why is this task needed?” with an audit-purpose hint.
3. Put optional details in named disclosures: Collaborators; Planning (stage/milestone, start date, effort); Tags and checklist. Review requirement should have an always-visible summary for project work (“No review required” / selected requirement); its control can expand inline. Do not bury a significant review decision inside an unlabelled More menu.
4. Keep one primary action: “Create task.” Secondary: Cancel. Retain exact existing validation (title2–160, description≤2000, reason3–1000, required Target/owner, eligible project/type). A visible hint must explain a blocked submit. On attempted invalid submit, show field errors and move focus to the first error. Existing defaults may be displayed; do not invent a Target, owner or reason.
5. When project changes, refresh eligible owners/collaborators and plan items; visibly identify selections cleared by that change. In Project Tasks the project is fixed; in a subtask both parent and project are fixed. A SITE presentation alone does not identify an active site.
6. While sending, show “Creating…” and prevent duplicate commands. Keep the submitted form stable. Successful server confirmation closes creation, identifies the canonical task and opens it or offers “View task.” Preserve the surrounding queue. A task created for someone else must not appear as the creator's personal task merely to provide success feedback.
7. On overload, show the existing capacity warning and explicit acknowledgement action, retaining the submitted values. No invented numeric “hours after adding this task.” Changing the draft invalidates the acknowledgement as it does today.
8. On uncertain outcome, lock the submitted command and show “Creation not confirmed” plus “Check creation result.” Explain that it checks the same request. Do not auto-submit a fresh key or claim failure. The new demo must simulate loss of the response after server success and recover the same ID.
9. On confirmed rejection, preserve editable fields and show a specific reason. On stale/changed access, refresh eligible options without granting authority from the old selection. Session expiry needs sign-in; do not show prior-account fields to a different account. Drafts are currently component state: no “Saved” badge or reload/cross-device recovery promise.
10. Dismissal with an unchanged form is immediate. Dirty dismissal offers Continue editing / Discard; pending requests block dismissal. An unresolved command must retain explicit recovery/discard wording, since leaving or reloading is not proof the server did not create it. Do not add a durable draft service as cosmetic UI work.

Suggested content arrangement (same fields on all entry points):

```text
New task                                  Close
Project: Riverside / or choose context

Task name
Description (optional)
Primary owner       Target date
Priority            Type
Review: No review required  [Change]
Why is this task needed?

Collaborators (optional)              Expand
Planning / Tags and checklist         Expand

Cancel                            Create task
```

This is a hierarchy sketch, not a fixed pixel spec. At320px use one column, readable16px inputs,44px controls, scrollable body and safe-area-aware action footer. The footer must remain reachable with the software keyboard and must not cover the last field. At1440/1024 retain a focused modal rather than a full-width administration form. No claim that every optional combination fits without scrolling.

## Completing work and browsing completed tasks

Completion action:

- Ordinary work: show Complete task only for the supported state/authority. Collect or retain the required reason in an inline completion panel. State that completion is final; use a second confirmation only if the interaction needs that explicit acknowledgement, not a chain of modal dialogs.
- Readiness includes current project state, assignment, required reviews and unfinished real subtasks. Explain a blocker visibly and link to its owning workspace when authorized. Inaccessible blockers get a neutral explanation without private task names. Do not infer readiness solely from checklist percentage or a green review badge.
- Required internal/client review: route to the canonical review action and its exact round/task context. Show “Review approved” until the real completion command confirms COMPLETED. A reviewer, collaborator and task owner are different responsibilities.
- Pending completion: disable repetition and wait for the server. Only then display “Task completed” and update list/counts. On409 reload the current task and preserve useful reason input; on403 show access changed; on lost completion response, re-read the canonical task before another action. Creation receipts do not provide a generic completion-retry guarantee.
- Keep the current detail open as a completed record after success. When it leaves an Active-only queue, explain that it moved out of that view and offer View completed / Back to active. Move keyboard focus predictably if its row disappears. No automatic next-task jump or repeated full-screen celebration.

Completed browsing:

- Provide an obvious Completed choice within the existing My Work/Tasks queue controls and the same view in Project Tasks. Use the current phase/status query, not a new top-level navigation tab. Show personal/assigned/project scope clearly. Needs action remains actionable work, not completion history.
- Desktop: readable rows with a noninteractive check icon, task title, project, primary owner, original Target, priority and Completed state. Once the completion-summary contract exists, replace emphasis on Target with Completed on/by. Make the title/row open the canonical detail; keep independent controls separate and keyboard accessible.
- Mobile: one compact row/card with title first, project/owner second, completion state and accurately labelled date. Keep primary text legible; avoid whole-title strikethrough or fading the entire row. No inert checkbox that suggests reopening.
- Keep supported search/filter/page behavior and source totals. Current date filters mean Target/Committed dates, not completion date. Label them explicitly. Default “Recently completed” ordering, Today/Yesterday groups, completion-period filters and a completion count card need a reviewed read contract before real integration.
- Detail: clear Completed banner; recorded date/actor/reason only when supplied by canonical history; retain Overview, Checklist, Evidence and Activity. Completed work has no ordinary edit/reassign/start/resume/complete controls. Other specialized actions must follow their own capabilities rather than a blanket rule inferred from the status. Evidence access is still checked at read time; completion does not make a record public.
- Distinguish four states: no completed work yet; no matches for filters; unavailable/error; access revoked. No matches offers Clear filters; true empty offers View active work. An unavailable source must not be rendered as zero completed tasks or an “all done” celebration.

## Backend feasibility and change boundaries

| Proposal | Existing support / next work |
|---|---|
| Clearer composer hierarchy, meaningful labels, optional disclosures, visible blocker explanations, completed view shortcut | Existing commands/phase queries; frontend refinements with focused regression/accessibility checks. These are recommendations, not applied changes. |
| Searchable eligible-person picker | Reuse current creation-options response; show only server-authorized choices. Search over returned eligible options is possible; remote search/pagination would need its own contract. No general employee directory access. |
| Show final completion date/actor/reason in detail | Canonical status history exists. Add a typed, authorized presentation summary where needed; resolve actor display through an approved bounded read, not a Staff directory request. Unknown/legacy metadata must remain unknown. |
| Sort/filter/group completed list by completion timestamp | Proposed backend read enhancement. Apply authorized predicates and canonical completion summary consistently to count/page/order; stable ID ties. Never sort only the fetched page or use task.updatedAt. No schema migration decision is made here. |
| New completed KPI, bulk action, export, comments, notifications or file upload in composer | Separate product/API/access/workflow decisions. Exclude from a V1 UI demo unless clearly labelled future exploration. |
| Undo/reopen/delete completed records; approved review treated as completion; drag bypass | Conflicts with current domain rules. Exclude; a visual reference does not authorize it. |
| Persistent drafts / reload-safe uncertain-command recovery | Current draft/retry state is in memory. Requires a bounded storage, account isolation, retention and recovery contract before any “saved” promise. Keep existing same-session receipt recovery working. |

## Decision ledger

| Decision | Grounding | Reason |
|---|---|---|
| Existing tokens remain primary | Owner My Work/app reference; three full style comparisons | Shell demo integration must not create another design system. |
| Focused modal with named optional groups | Linear/Workflow creation + existing native dialog | Preserve context and reduce initial scanning without changing required fields. |
| Eligible owner/context visible before submit | Programa assignment flow + task creation authority | Responsibility must be clear; manager presentation is not a grant. |
| Recovery panel ahead of locked summary | Current real uncertain-create capture + immutable receipt command | User can recover a committed result instead of duplicating work. |
| Searchable readable completed record | MonoDesk browse flow; Dona contrast example | Finished work must remain discoverable and inspectable. |
| No Undo, clear, drag shortcut or reopen | Current terminal policy and immutable evidence | Reference conveniences cannot bypass completion/review rules. |
| Readiness explanation visible on touch | Current disabled-title pattern + Refero craft focus/forms guidance | Hover-only explanations fail mobile and keyboard discoverability. |
|44px controls, safe footer, meaningful error focus | Existing accepted H boundary + Refero craft details | Reuse verified accessibility direction and test keyboard obstruction separately. |

## UI demo handoff — six scenes

Build these inside the supplied shell; reusable creation/detail components, not six unrelated pages. Mock data and state transitions are acceptable for the demo, clearly identified as fixtures. Do not call real APIs or request database changes for a demo.

1. **Create my task**: non-project, eligible self-owner, essential fields and optional groups; show expanded planning and validation.
2. **Assign a Project task**: fixed project, eligible primary owner, collaborators, review requirement and a real subtask variant naming its parent. Owner without employee identity must choose an employee.
3. **Create outcomes**: sending; field rejection; overload acknowledgement; lost successful response; locked same-request recovery returning the same ID; confirmed task outside current personal/filter scope.
4. **Completion readiness**: ordinary permitted completion; visible unfinished-child blocker; required-review destination; stale version/access changed; confirmed final completion. Preserve separate “review approved” and “task completed” states.
5. **Completed work list**: existing personal/project context, search, meaningful dates, active filters, page/count agreement, long titles and readable mobile rows. Completion-date ordering may be shown as a labelled proposed-contract variant, never represented as connected functionality.
6. **Completed task detail and recovery states**: Overview/Checklist/Evidence/Activity; actual completion history; no unauthorized mutation controls; true empty/no matches/error/revocation; return to active work without losing context.

Use1440×900,1024×900,390×844 and320×740. Include keyboard-only opening, picker navigation, dirty-close confirmation, retry focus, error focus, row/detail return focus, visible focus,44px actions and contrast≥4.5:1 for normal text. Add a real mobile software-keyboard check before claiming mobile readiness.

Acceptance for a later implementation: one task per confirmed/recovered create, correct fixed context and eligible ownership, no phantom personal-row insertion, current server capability checks, parent/review gates preserved, no irreversible state shown before confirmation, exact completed filter/count/page semantics, accurate completion metadata, no denied-data exposure, preserved back/search/scroll, responsive touch/keyboard behavior and affected unit/API/real-persistence/browser checks. This research did not rerun application tests; production source was not changed.

# My Work for a team leader and Owner

9 October 2026. Owner requested assignment/progress views for team leaders, then added Owner oversight. The later browser comment requests a desktop task-detail close button that restores full worklist width. Scope remains an isolated prototype; production implementation is not authorized.

## What changes by responsibility

| Persona | Personal work | Oversight | Supported responsibility |
|---|---|---|---|
| Employee | Primary-owned or explicitly collaborating tasks | No management scope implied | Progress own work; independently assigned review inbox |
| Team leader with explicit grants | Same personal scope | Manage visible work: permitted reports and explicitly managed projects, alongside own/collaborating work | Create and assign within eligibility; inspect owner/status/target/committed dates; reassign when the exact task capability permits |
| Owner | Same personal scope; no employee link means empty personal work | Organization work in the current organization | Inspect task progress across permitted organization records; create/assign to active eligible employees; perform existing authorized management commands |

My Work should not turn every management task into a personal assignment. A clearly separate work context lets a leader find their own obligations and oversee delegated work without confusing the two. The Owner gets organization oversight even when their personal task scope is empty.

Progress is the recorded canonical task state and dates, not a guessed percentage of work done. Loaded-sample state counts plus project/owner/status filters let the user answer who owns the work, what is overdue, what is waiting, what requires corrections and what is in review. No new utilization formula, ranking, teamId API, escalation automation or message-sending action is proposed.

## Current source and guardrails

Existing task scope `all` is authorized server-side. Staff visibility is a union of personal/collaborating work, permitted reporting-tree nonproject tasks and explicitly managed project tasks. It is not synonymous with every member of a Team. Owner visibility is organization-scoped. `assigned` still includes collaborators and is not a clean delegated-team definition. A Team Leader title alone grants no access. Current production MyWork remains `personalOnly`; this management context is a new presentation proposal over existing reads, not a claim it already ships.

The hierarchy remains Organization → Branch → Team → Employee. A project has one owning branch; cross-branch work requires explicit assignment. Leader fixtures must name the task.assign Team grant and reporting-tree eligibility or the specific project membership/view/manage and branch task.assign grants. Owner candidates still need active account/employee and exact project eligibility. A coarse setup.canAssign flag never authorizes every selectable employee.

Assignment previews are bounded to ordinary PROJECT/NON_PROJECT work with review requirement NONE. Existing priority LOW/MEDIUM/HIGH/CRITICAL is an explicitly chosen form field, not inferred from color. Required title2–160, target ISO date, one primary owner, reason3–1000 and project for PROJECT preserve the current ordinary create contract. Owner without employee cannot use self-task creation. Optional stage must belong to that project; committed date belongs to a separate authorized command. The focused preview does not reproduce every existing optional create field/type.

Reassignment uses exact task/version, a different active eligible owner, required reason and the existing configured capacity-warning acknowledgement when applicable. Ordinary Waiting stays Waiting; an employee-exit hold restores stored NOT_STARTED or IN_PROGRESS according to existing command semantics. No mutation occurs in the preview. Completed/stopped tasks and held/frozen project work are not eligible in this demonstration; approved closeout and review-movement edge cases stay in their existing owning workflows.

Leader management does not authorize Start/Wait/Resume/Complete on another employee's task. Owner broad task authority does not confer a named independent STAFF reviewer decision. Exact reviewer inbox and typed approval requests remain independent sources; oversight review-state rows never become personal approval requests. Pending internal-review movements, client decisions and approval bypasses remain excluded.

Relevant sources: task.controller.ts:17,40,53–63,86; task.service.ts:184–231,235–278,334–373,382–404,869–888; task.tsx current creation/reassignment forms; review.service.ts:399–401. Requirement mapping: R-018/R-019/R-021–024 and C-023; S09/S10/S13 remain completed within their accepted scopes.

## Prototype proposal and reference trace

Retain the approved worklist/detail grammar, color meanings and mobile return. Add explicit preview persona/work context, owner filtering, loaded-sample progress, and guarded create/assign/reassign previews. Every preview result states no change saved and leaves task owner/status/version/counts unchanged. Filter/context URLs and Back/Forward preserve the selected view; role changes must clear stale task/review context.

The desktop close button belongs in TASK DETAILS. Closing hides the pane and removes its reserved width, preserves filters/page, and returns focus to the selected row. Selecting a task reopens it. Mobile contextual return remains accessible. This is the one requested layout behavior change, distinct from the earlier color-only revision.

Reuse SC01/SC02/SC06/SC15 and FL01 from the approved research ledger. The targeted missing assignment reference is [FL08 Linear6647](https://refero.design/flows/6647), retrieved in full, with [SC20 assignee picker](https://refero.design/pages/669f5daa-0a1e-413f-a0b4-5e39c29ebcac) inspected as an actual full image. Adapt an explicit owner picker and retained composer context. Reject its No assignee, invitations, saved draft and unspecified permission assumptions. The flow ends with an assigned composer, not verified persisted creation. [Raw reference records](evidence/role-refero-records.json).

## Required validation for this extension

- [x] Employee personal behavior and source-state contracts retained in focused source/browser checks.
- [x] Leader fixture-authorized union and Owner separately labeled organization view reviewed; Owner personal no-employee scope empty. Employee direct URL to management-only task displays unavailable, without title/detail.
- [x] Owner/project/status filters and work context survive reload; Back closes management dialogs and restores task context.
- [x] Leader oversight on Maya's task offers no staff completion command. Owner exact review opens read-only evidence mock; reviewer inbox stays empty.
- [x] Candidate eligibility, required reason/current version and project gates reviewed. Alex's configured warning blocks create and reassign previews until acknowledged; no capacity number invented.
- [x] Create/reassign receipts leave owner/state/version/list count unchanged. Ordinary Waiting receipt stays Waiting; exit-hold preview identifies stored Not started restoration. Fieldstone project hold has no unsupported leader reassignment.
- [x] Desktop close expands worklist and restores keyboard focus; reopen/Back/reload/mobile close checked.
- [x] Desktop/mobile rendering and dialog focus containment checked. Receipt focuses Return; Tab wraps to Close; Escape returns to opener. Unavailable filters hide metadata, Offline disables assignment previews, Ready restores retained filters.
- [x] Pinned TypeScript, focused lint and isolated build pass; GPT-6.1 Sol accepted bounded source, with final browser-driven amendments separately reviewed.

## Verification evidence and limits

Owner final close style: desktop now adopts mobile's plain22px muted × with no resting border/fill, retaining44px target and keyboard focus outline. Browser1143 confirmed border0/transparent fill/44px size and visible keyboard outline;989 still has one close. Isolated build exited0. [Plain desktop close](evidence/desktop-plain-close.jpg). Sol context/review and Luna CSS change; prototype only.

Tablet duplicate correction: the desktop toolbar × was previously hidden only below768px while tablet also showed a top close control. The hide rule now covers all widths below1024px. Actual browser checks at390/989/1023/1024/1440 show exactly one visible close control; tablet close hides the pane and returns focus to `task-row-TSK-2473`. Isolated Vite build exited0. [Tablet single-close capture](evidence/tablet-single-close.jpg). CSS-only, Sol context review and Luna implementation; no route/command changes.

Later Owner refinement: the desktop × is centered in its44px hit area, with native padding removed and a12px right gutter. Browser checks at1440/1024 found the button centered within0.5px of the header center; close/focus return and mobile Back remain intact. Isolated build exited0. [Placement screenshot](evidence/close-position-refined.jpg) and [geometry record](evidence/close-position-verification.json). This later CSS refinement supersedes the earlier CSS/build fingerprint only; it adds no task behavior.

Focused browser verification used the actual loopback React preview, including desktop1440×900, mobile390×844 and narrow320×800. Closing desktop detail expanded the observed main width from645 to1033px at the default viewport, hid the pane (`display:none`), persisted an explicit empty task query and focused `task-row-TSK-2481`. Mobile closed state survives reload and has no horizontal overflow at320px. These are prototype runtime checks, not real authorization or persistence acceptance.

See [browser record](evidence/role-browser-verification.json) and [exact check log](../my-work-prototype/verification-roles.log). Captures: [leader desktop](evidence/role-leader-desktop.jpg), [full-width closed detail](evidence/role-fullwidth-closed.jpg), [Owner desktop](evidence/role-owner-desktop.jpg), [leader mobile](evidence/role-leader-mobile-list.jpg), [mobile detail](evidence/role-leader-mobile-detail.jpg), [Owner mobile](evidence/role-owner-mobile.jpg), [assignment receipt](evidence/role-assignment-receipt.jpg), [reassignment receipt](evidence/role-reassignment-receipt.jpg).

The native date control required keyboard segment entry to trigger React's change event through the browser automation surface; the verified create receipt used2026-10-21. No API request or task mutation was performed. The demonstrated form omits optional description/start date/estimate/stage and other owning-module task types; it does not claim full form parity. The current sample pool happens to give the leader visibility to every loaded record through personal or explicit management grants; organization-wide exclusion needs additional real API/permission fixtures before production acceptance.

Real API persistence, permission enforcement, screen-reader/zoom/device tests and production/actual-project readiness remain outside this disconnected prototype. Full `pnpm verify` was not rerun for this documentation/prototype extension. Actual model routing: GPT-6.1 Sol context/source review and GPT-6 Luna bounded prototype changes. Production files have concurrent unrelated edits; this task changed only its design/prototype artifacts and does not accept the whole checkout.

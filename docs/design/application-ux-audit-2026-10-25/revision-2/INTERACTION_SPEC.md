# Master UX interaction specification

UXI-2 · 25 October 2026 · Normative **proposed UI behavior**, not implemented behavior or new business authority. User constraints and current backend/domain contracts prevail. Each ID becomes an acceptance target only within a later explicitly approved slice.

## 0. Shared state and terminology

All views distinguish `not requested`, `loading`, `available`, `empty`, `no match`, `setup missing`, `permission denied`, `expired session`, `not found/no longer accessible`, `read failed`, `stale/conflict`, `offline`, `command pending`, `command outcome uncertain` and `confirmed success`. Never represent every non-available state as zero/empty. Composite screens maintain those states independently per owning source.

Human labels may format canonical values, but payload values/calculations are unchanged. Target and Committed date are named separately. Primary Owner is a task employee; Owner account is the organization identity. A task phase is a presentation grouping, not a new status. Approval obligation, internal review, client item decision, Primary final approval, formal issue and site handover remain distinct.

## 1. Shell and navigation

| ID | Trigger/context | Required response | Focus/history/access contract |
|---|---|---|---|
| SH01 | Enter any authenticated internal route | Same WorkspaceLayout/Header, visible page context and current destination; one main landmark and clear page title | Session restoration/failed restoration stay truthful; do not render protected record names before access is established |
| SH02 | Navigate from sidebar, More or context link | Open existing route; preserve exact object/query context as supported | Browser Back/Forward restores prior query/selection; programmatic route focus uses current RouteAccessibility without creating an unwanted visible static box |
| SH03 | Expand/collapse sidebar/group | Show current group and access to every retained destination; collapsed icons have accessible names | Keep current preference storage scope; focus stays on trigger. No new preference API |
| SH04 | Ctrl/Cmd+K or Find a page | Native accessible Page finder; destination-label filtering, arrow movement, Enter navigation and Escape close | Trap focus only while modal, restore trigger on close; do not label as global content search. Include reviewed focused destinations without protected content indexing |
| SH05 | Type sidebar filter | Filter navigation labels; no-match message and Clear filter | Label it Filter navigation to distinguish page finder; do not hide current location without explanation |
| SH06 | Open phone More | Labeled sheet with four IA categories, current destination and every secondary route | Focus enters sheet, Escape/Close returns to More. Tapping a destination closes sheet and moves route focus; no second global nav |
| SH07 | Open selected Project/Person | Context header names the exact current object and owning scope | UI does not infer Project Branch from employee home Branch; inaccessible object gets safe recovery without leaked title |
| SH08 | New task from global/header/project | Open canonical composer in the supported context | Project/parent fixed when context requires; header action does not invent an employee for Owner or grant assignment |
| SH09 | Account/session changes | Recheck session, reset inaccessible context and use existing account-bound storage handling | No cross-account list/draft/evidence leak; no blanket storage clear during update |

Page grammar: context/breadcrumb → page/object title and primary permitted action → scope/source/filter toolbar → primary list/detail → supporting evidence/history. Do not apply dashboard cards around every nested section. Keep the current accepted shell's typography, paper/pine roles, title/gutters and underline section treatment.

## 2. Lists, filters, sorting and saved views

| ID | Interaction | Specification |
|---|---|---|
| LS01 | Open worklist | Display actual server-authorized scope, record count basis, loaded range, page controls and independently loading/error sources. Preserve server pagination and limits |
| LS02 | Scan desktop row / phone card | Prioritize title, project/context, exact human status, named relevant date, primary owner and next action. Secondary plan/version/technical metadata is disclosed without losing it. No truncated-only essential name |
| LS03 | Select object | Open same canonical object/detail; show selected state with text/semantic state as appropriate. Do not toggle lifecycle state by clicking row background |
| LS04 | Search | Preserve each owning module's current search behavior and parameters. Show whether filters are unapplied; do not introduce universal live-search semantics or new API. Enter/Apply commits where current form requires it |
| LS05 | Open advanced filters | Search/scope and common filters visible; advanced filters disclosed with active-filter summary. Opening/closing disclosure does not apply/reset values. Existing complete filter set remains reachable |
| LS06 | Apply filters | Normalize using current query contract; reset page offset only when required; preserve selected detail if still valid, otherwise explain/return safely. Announce results without moving focus on each refresh |
| LS07 | Remove chip/reset | Remove exactly its named criterion; Reset restores the current supported default, not a new policy. Maintain separate status/phase/date basis; expose all existing filters in the parity ledger |
| LS08 | Sort | Use existing allowed sort values/direction and server semantics. Keep sort visible and retained on detail return. Sorting one page cannot imply full-dataset reordering if current source only provides a page |
| LS09 | Change List/Cards/Kanban/Timeline | Same canonical task set, scope, filters and selected object. Keep existing views; no invented drag-to-state/commit or new scheduling capability. Label current-page grouping/counts |
| LS10 | Group / Show more / paginate | Group current page as supported, label that basis; Show more within group is not Next server page. Do not call an overlapping summary the list total |
| LS11 | Save/apply/delete view or customize | Use current account/device-scoped preference behavior and supported fields. Store display/query preferences only; no role grants or protected record data in a new shared store |
| LS12 | Late/out-of-order request | Current object/account/query wins; stale responses must not replace new context. Preserve existing sequence guards; no unsupported caching/aggregation layer |
| LS13 | Permission changes while open | Existing server reauthorization remains final. Remove/recover inaccessible selection without claiming successful mutation or displaying prior protected evidence |

Filter state must expose current scope, an accessible result count and a clear reset path. Do not force mobile users through the entire form to reach the first work item. Any local horizontal table region has a label and keyboard access; the viewport itself must reflow.

## 3. Task and object detail presentation

| ID | Event | Specification |
|---|---|---|
| DT01 | Open from list, notification or project | Same canonical ID and current source. Capture originating route/query/page/group/selection and supported scroll/focus context. Direct deep links still work without a list origin |
| DT02 | Desktop detail | Prefer existing TaskDetailDrawer/shared detail. A side-by-side view is allowed only if list and detail remain readable; use the current full-detail presentation otherwise. Never duplicate task state/commands in a new pane implementation |
| DT03 | Tablet/phone detail | Single-column full detail when a split would cramp content. Visible Back/Close and exact object title. Keep first authorized next action, current state and required reason/evidence guidance discoverable |
| DT04 | Close/read-only detail | Restore originating row and view context; direct-link fallback returns to existing owning list. Back acts on history rather than silently changing filters |
| DT05 | Attempt close while editing | Dirty changes invoke Keep editing / Discard through the existing guard; no automatic discard on backdrop, route, project, Back or Escape. Preserve current pending/uncertain operation locks |
| DT06 | Open another detail/child/review | Carry exact object identifiers and contextual return. Avoid stacked navigable drawers with hidden ownership; replace detail or open the supported owning route with an explicit return |
| DT07 | Read evidence/history | Header/evidence strip shows source/object, current state, exact version/round/revision and next actor where supplied. History remains available. Technical IDs may be disclosed; no fabricated names/dates/actors |
| DT08 | Choose action | Show only current permitted actions or explain current prerequisite. Expanding Dependencies/Reassign/Committed date/Edit does not execute commands. Reasons sit with their action rather than acting as an unexplained page-wide password |

The existing Tasks register inline detail, My Work drawer and Project Tasks context may differ in container, but must use the same domain details/actions. Global workspace and Project People remain separate object types. A phone Back target stays reachable with a software keyboard and long evidence content.

## 4. Creation and editing

### Creation contract

CR01: One canonical task creation workflow from My Work, Tasks, Project Tasks and Task detail → Subtask. Reuse `task-create-dialog`, shared composer fields, creation-options and current receipt identity. No role-specific duplicate frontend or payload builder.

CR02: Use the approved Task Creation demo's Brief plus Assignment & timing hierarchy; phone stacks the same fields. Required task title/type/priority/Target/project where applicable/eligible primary owner/reason remain clear. Review requirement is visible and explicit because it becomes immutable. Collaborators, stage/start/effort, checklist and tags can be disclosed; disclosure never drops values or validation. All currently supported task types remain reachable beyond the Project/non-project shortcut.

CR03: Render assignment choices from current `canCreate`, `canAssign`, actorEmployeeId and eligible owners/collaborators response. Existing configured creation profile affects wording/composition only. Owner with no employee chooses an eligible employee. A Team Leader title or Site label cannot create authority, choose a site or auto-enable offline capture.

CR04: Changing Project refreshes eligible participants/plan items through the existing endpoint; preserve valid entries and clear incompatible ones with an explanation. Ignore late options for prior context/account. Project Task fixes Project; Subtask fixes parent and applicable Project. Primary owner cannot also be collaborator. Do not source assignable people from an unrestricted directory.

CR05: Preserve current field constraints and exact normalization: title2–160, description≤2000, reason3–1000, Target valid date, project/type compatibility, existing numeric/array limits. Blank vs zero effort remains distinct. Existing MEDIUM initial priority is not a new numeric policy. No new past-date rule, automatic committed date or recurrence schedule is inferred from demo appearance.

CR06: Submitting validates all fields. Focus the first invalid field for a single/local error; for multiple errors focus a concise linked summary, retaining inline associations. Do not announce the same error repeatedly or shift focus on each keystroke. Preserve entered values after failed reads/writes where access still permits.

CR07: While pending, prevent duplicate submission and accidental dismissal; keep an announced pending state. Confirmed success opens the returned canonical ID without silently changing personal/organization filters to make it appear. If assignment belongs outside the creator's personal queue, explain the result without broadening scope.

CR08: Lost response is **outcome uncertain**, not failed creation. Preserve the existing creation key/command and supported Check creation result/receipt behavior. Never create a new command key or auto-retry an unsupported operation. A confirmed creation followed by failed detail read still reports creation as confirmed with a safe open/retry path.

CR09: Dirty Close/Escape/Back offers Keep editing / Discard through the existing guard. Preserve current in-memory/account/device draft boundary; do not promise reload/cloud recovery unsupported by the application.

### Editing contract

ED01: Open existing edit form on the current canonical object/version. Retain the same editable field set and required reason; immutable review requirements/evidence/history/parent links cannot become editable for visual symmetry.

ED02: Validate with current constraints and server version. On conflict, state that the record changed, keep the user's unsaved input where safe and offer current-record review; do not silently overwrite, merge consequential fields or automatically resubmit.

ED03: Cancel edit restores the last confirmed record, not a partially normalized payload. Close/navigation while dirty uses DT05. A versioned write success and its follow-up read failure are distinct.

ED04: Reassign, change committed date, dependencies, blocker/wait, recurrence, review submission and lifecycle changes remain their own named commands. No universal Edit state or status dropdown grants transitions.

## 5. Review, approval and evidence

| ID | Interaction | Required sequence / safeguard |
|---|---|---|
| RV01 | Open assigned review | Preserve taskId/roundId and current assignment; distinguish accessible history from a pending obligation. Deep links select exact round and state |
| RV02 | Inspect submission | Evidence strip identifies exact submitted version/file/link/revision and current reviewer. Current task fields and submitted snapshot are labeled separately |
| RV03 | Submit new work for review | Mandatory file/link evidence and current required routing remain. Creation requirements are immutable; submission is not approval |
| RV04 | Internal decision/correction | Current independent named reviewer executes existing permitted action. Required category/severity/comment/reason remain; consequential action cannot happen from row hover or a generic checkbox |
| RV04a | Worker reads correction comments and resubmits | Put an exact-round correction summary/instructions link before technical submitted-snapshot metadata; retain full immutable reviewer comment/category/severity and canonical correction-task link. The assigned correction task must be completed before eligible original-task resubmission. Preserve prior evidence/history and submit required updated evidence as a new round; no arbitrary Edit/Complete shortcut or editing of the prior reviewer decision |
| RV05 | Internal approval to client delivery | Show existing durable publishing authorization/attempt status. Authorized automatic delivery follows the existing rule only; no manual visual toggle creates authority or sends unapproved work |
| RV06 | Client item decision | Separate CLIENT session and current exact-item grant; existing item decision, comments/reference/correction states retained |
| RV07 | Primary final approval | Explicit final scope and exact evidence; Primary authority and current step-up/signature remain. Secondary Client does not acquire this action because they can view an item |
| RV08 | Confirmed drawing and issue | Primary-final-approved exact evidence appears in Project Documents → Confirmed drawings. Formal Issue/transmittal remains the separate authorized revision workflow; never badge final approval as issued |
| RV09 | Approval obligations | Decisions is a navigation/attention surface. Display request type, subject, named actor/state and source. Open the owning workflow for full context/authorization; never generic Approve all |
| RV10 | Revoke/expire/conflict while viewing | Reauthorize through existing API, remove protected evidence as required, explain safe return/retry. Do not keep a stale enabled decision or substitute a newer revision silently |
| RV11 | Site quality/closure/handover | Retain observation, independent verification, management closure, site handover, client acceptance and project completion as distinct current gates |

The prototype must exercise the distinctions, including blocked paths, but its synthetic decisions are labeled simulated and are never counted as server evidence.

## 6. Empty, loading, error and permission states

| ID / state | Copy/content and actions | Interaction/focus requirements |
|---|---|---|
| ST01 · first loading | Name the source/current object, reserve sensible space; no zero counts | Non-blocking status announcement; no endless focus changes |
| ST02 · refresh with safe existing data | Identify refresh and source age; existing content only while current access policy permits | Keep list position and keyboard focus; prevent stale data being called current |
| ST03 · true empty | Explain no records in this authorized context; offer applicable existing create action | Action capability checked; empty never means no access |
| ST04 · no filter match | Show active scope/criteria and Clear filters | Retain criteria until explicitly cleared; do not offer irrelevant setup |
| ST05 · setup missing | Name the missing current policy/template/routing and the authorized setup owner/path | Do not seed defaults or enable a blocked action from the empty state |
| ST06 ·403 | Explain current permission/scope limit in plain language, safe return and retry where appropriate | No inaccessible names/evidence; do not suggest changing roles as a casual self-service action |
| ST07 ·401/expired | Announce expiry and existing sign-in route; preserve permitted draft handling within current lifecycle | No silent impersonation or background privilege fallback |
| ST08 ·404/no longer accessible | Safe generic unavailable message and return to owning list | Do not disclose whether an inaccessible record exists |
| ST09 · read/network failure | Distinguish failed source, retry only that read, show safe previously read timestamp if permitted | Error associated/announced; no full-page reset for unrelated source failures |
| ST10 · version/conflict | Explain changed record/access; offer current review/reload | Keep safe draft, no automatic overwrite; exact-version evidence stays immutable |
| ST11 · pending command | Name action/progress and lock repeat submission | Pending state announced; no premature success or unguarded Close |
| ST12 · uncertain command outcome | Explain uncertainty and existing supported recovery/check result | Same receipt/command identity; no new ID or unsupported automatic retry |
| ST13 · confirmed success | State actual canonical result and source; open/link it | Focus to result/detail or meaningful confirmation, not an incidental toast only |
| ST14 · offline | Differentiate cached shell from authorized offline Site preparation/drafts | No general offline My Work/client-evidence promise; existing queue isolation/conflict handling retained |
| ST15 · partial sources | Show available/unknown/denied/error per source, including distinct counts | Do not sum overlapping task/review/approval counts or turn unknown into zero |

Operational error copy contains useful next steps, not slice codes, raw stack traces or service implementation prose. IDs/technical details remain available when relevant through explicit disclosure.

## 7. Responsive contract

| ID | Viewport/context | Behavior |
|---|---|---|
| RS01 |1440/1395 desktop | Current accepted full shell; readable rows and adaptive list/detail; no oversized empty wrapper or nested administration forms in routine lists |
| RS02 |1024/783/768 tablet | Desktop shell at≥768; content chooses full detail if split is cramped. All actions/fields remain available; no parallel mobile bar |
| RS03 |767/390/320 phone | Existing five-destination bar; one-column list/detail/forms and disclosed local navigation; no viewport-level horizontal scroll |
| RS04 | Software keyboard, safe areas | Focused field and error remain visible; footer action does not cover input/evidence/content; route Back/Close remains reachable |
| RS05 | Text zoom/reflow | Text can resize to200%; test320CSS-pixel reflow and browser zoom equivalents. Dense two-dimensional evidence/tables use a clearly labeled region only when justified |
| RS06 | Long names, translation/date/time | Wrap essential names/labels; do not shrink text or remove metadata to fit. Server date/timezone semantics and explicit units remain |
| RS07 | Overlay/sticky bars | Calculate content clearance for actual header/footer; no covered first/last row or focus target. Restore scroll behavior on close |

These are proposed acceptance behaviors; current tests at selected widths do not certify every viewport or device keyboard.

## 8. Keyboard, screen reader and accessibility

KB01: Use semantic links/buttons/native form controls. One logical main landmark, a meaningful heading structure and a working Skip to main content. Visible focus is retained; programmatic route focus must not obscure location or force scrolling past relevant context.

KB02: Tab order follows reading/action order; Shift+Tab reverses it. Enter activates the focused action, Space native button/checkbox behavior. No route navigation just because a control receives focus. Do not replace all tab stops with invented arrow-key grids.

KB03: Native dialog/sheet has accessible name, focus containment, Escape handling subject to dirty/pending guards and trigger-focus restoration. Background content is inert while modal. Closing nested controls returns to their own trigger; it must not dismiss the parent form unexpectedly.

KB04: Local tabs follow a coherent documented pattern. Use correct tablist/tabpanel semantics and arrows when implementing true tabs, or ordinary links/buttons with current-state semantics for navigation. Do not attach tab roles to unrelated controls merely for appearance.

KB05: Row-open targets and separate People/actions must be independently operable; no nested clickable buttons. Selection/current/expanded/pressed states are exposed semantically, never color alone. Icon-only controls have specific names.

KB06: Errors have visible labels and associated text; multiple-error summary links to fields. Announce asynchronous result/status changes without repeatedly interrupting reading. Do not announce every background timestamp or every count poll.

KB07: Prefer44×44CSS-pixel phone targets as the product criterion. WCAG2.2AA's24px minimum/spacing exceptions are a separate conformance rule; do not falsely call44px the AA minimum. Use4.5:1 normal text and3:1 large text/meaningful non-text UI thresholds where applicable.

KB08: No essential hover, long-press or dragging-only operation. Widget reordering includes visible Move controls, not just drag. Reduced-motion users retain all information and controls.

KB09: Screen reader testing covers navigation, list selection, filter results, dialog validation, exact review evidence/actor and permission errors. Automated tooling alone cannot pass these scenarios.

KB10: Never compromise access/security/functionality to match a demo focus color, target size, truncated label, drag interaction, decorative icon or font. Record the approved adaptation with evidence.

Standards references: [WCAG2.2](https://www.w3.org/TR/WCAG22/), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [Target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [Focus not obscured](https://w3c.github.io/wcag/understanding/focus-not-obscured-minimum.html). These references inform future acceptance, not a current conformance claim.

## 9. Traceability and verification

Every prototype node and later screen names the relevant SH/LS/DT/CR/ED/RV/ST/RS/KB IDs, W01–W15 journey and feature-parity IDs. A scenario must show its entry, intermediate decisions, result, error/recovery and return. Known data/access absences stay blocked in real-session evidence. See ACCEPTANCE for separate gate outcomes and PROTOTYPE_ROADMAP for the connected graph.

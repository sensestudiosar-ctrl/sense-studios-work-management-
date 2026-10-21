# Sense Studios — task creation demo brief

20 October 2026. A design and interaction brief for an editable demo that the Owner will return for implementation in the real application. This brief does not authorize new business rules. Current requirements and source were inspected; no application code, database, runtime or credentials were changed for this brief, and no application tests were run.

## 1. What you are designing

Design a focused, responsive **Create task** experience for an architecture/interior-design studio. A person should understand the work, its project, its accountable employee and its Target date before submitting. Simple self-tasks should be quick; manager assignments should expose the necessary choices without turning every task into a large administration form.

Use one shared experience opened from **My Work**, **Tasks**, **Project → Tasks**, and **Task detail → Add subtask**. Preserve where the user came from, including project, filters, grouping and scroll position. Improve the creation experience, then show the actual created task in its detail drawer.

The existing My Work design is the surrounding visual authority. Keep its sidebar, widgets, groups, task rows, legend, filters, saved views and mobile navigation. The earlier Owner correction explicitly preserved that layout. This assignment does not require a new dashboard or task-list design.

Existing editable starting point: `docs/v1-demo/task-creation-completed-demo.html`. Read `docs/v1-demo/TASK_UI_DEMO_README.md` before changing it. Its existing creation module is `docs/v1-demo/task-create-refinement.js`. Work on a copy when exploring a new version.

## 2. Business background and data structure

- Organization → Branch → Team → Employee. There is no separate Brand or Department organizational tier.
- Each project has one owning branch. An employee working across branches needs an explicit project assignment.
- Each task has exactly **one Primary Owner**, who is an employee and remains accountable. Collaborators are additional participants; they do not replace the owner.
- Tasks may belong to a project and optionally one stage or milestone from that project. A non-project task has no project.
- A subtask is a real task with its own owner, Target date, priority, state and review requirement. It has an immutable link to one project-task parent. A checklist entry is just an item inside a task.
- Creating a task is different from starting it, submitting a review, approving a drawing, committing a deadline or issuing a document.

Conceptual structure:

```text
Organization
└─ Branch
   ├─ Teams → Employees
   └─ Project
      ├─ Stages / milestones
      └─ Task
         ├─ Primary owner: one eligible employee
         ├─ Collaborators: zero or more eligible employees
         ├─ Tags / checklist / optional planning
         ├─ State, assignment and audit history
         ├─ Review / evidence links through their owning workflows
         └─ Subtasks: one level, each a real task

Non-project tasks belong to the organization without a project.
```

## 3. People and permission scenarios

| Demo persona | Creation experience |
|---|---|
| Owner account without an employee record | Must explicitly choose an eligible employee as Primary Owner. Never invent “Owner” as an employee option. |
| Team Leader / authorized manager | May assign eligible employees and collaborators only within current permission, reporting and project scope. |
| Project Lead | Project leadership alone must not imply assignment permission. Demonstrate assignment only when the current capability permits it. |
| Employee / reviewer / part-time employee / intern | May create a self-task while eligible. Primary Owner is themselves. Their job title does not grant assignment authority. |
| Site employee | Same authorization rules, with a mobile-friendly presentation. A Site label alone does not identify a particular site/project or enable offline creation. |
| Client / consultant / vendor / factory contact | No access to this internal task-creation form. Their portal requests use separate workflows. |

The real app supplies `canCreate`, `canAssign`, eligible owners and collaborators for the selected context. A demo role switch is a **prototype control only**, outside the product interface; it is not real account switching.

## 4. Required screens and overlays

1. Existing My Work/Tasks screen with a clear **Create task** entry.
2. New task form for an employee self-task.
3. New task form for Owner/manager assignment.
4. Project-context form with the project fixed and visible.
5. New subtask form naming the fixed parent and project.
6. Person picker with search, selected state, no results and loading/error states.
7. Expanded optional details: collaborators, planning, tags and checklist.
8. Inline validation and first-error focus.
9. Capacity warning requiring explicit acknowledgement.
10. Creating/pending state and a successful created-task drawer.
11. Unconfirmed creation with a same-request recovery action.
12. Dirty-close confirmation, denied access and expired-session states.

These are states of a shared composer, not twelve separate product pages. Include both desktop and phone versions of the important states.

## 5. Form fields and exact constraints

Keep required fields clearly labelled. Show optional detail groups by progressive disclosure; never require every optional field for a simple task.

| Field / visible label | Requirement and behavior |
|---|---|
| **Task name** | Required; trimmed text, 2–160 characters. Example: “Prepare living-room ceiling layout”. |
| **Description** | Optional plain text; at most 2,000 characters. Explain deliverable/context. Rich-text formatting is a proposal, not a current API promise. |
| **Task type** | Required: Project, Non-project, Recurring, Correction, Site, Training/practical. Friendly labels map to the existing enum values. |
| **Project** | Required for Project, Correction and Site types; absent for Non-project. Other types follow their context. Only authorized Draft/Active projects are eligible for ordinary creation. In Project Tasks, show it as fixed/read-only. |
| **Primary Owner** | Required in the resulting task; exactly one eligible active employee. Self-task shows “Assigned to you”. Owner without an employee record must choose a person. Never select an arbitrary first employee. |
| **Priority** | Required: Low, Medium, High, Critical. Existing default is Medium. Use text plus icon/color, not color alone. Critical is a priority, not a separate task state. |
| **Target date** | Required valid date, stored as `YYYY-MM-DD`. Start empty unless the user supplies a date through an explicit context. Do not silently choose today/tomorrow. Label it Target date, not a committed deadline. |
| **Review requirement** | Project-work control/summary: No review required, Internal review, Client review, Internal and client review. Default None. Keep its current value visible; do not bury this decision. For the basic non-project demo keep None; an executable non-project review workflow is not settled by this brief. |
| **Why is this task needed?** | Required reason, 3–1,000 trimmed characters; API field `reason`. Hint: “Recorded in the task history.” Do not auto-fill a meaningless generic reason. |
| **Collaborators** | Optional when assignment is permitted; up to 30 distinct eligible employees. Exclude the Primary Owner and prevent duplicates. Use a searchable picker and removable selections. |
| **Stage or milestone** | Optional single plan item from the selected project. Never display unrelated project items. Changing project clears it. |
| **Start date** | Optional valid date; must be on or before Target date. |
| **Estimated hours** | Optional number, 0–100,000. Current controls use quarter-hour steps. Use hours as the unit, not days. |
| **Collaborator estimated hours** | Optional explicit estimate for each selected collaborator, same bounds. Do not divide total effort automatically or fabricate capacity figures. |
| **Tags** | Optional; up to 10 distinct trimmed tags, 1–30 characters each. Chips are fine; preserve these constraints. |
| **Checklist** | Optional; up to 10 entries, 1–120 characters each, with label and checked state. Prefer add/remove rows to requiring users to type special notation. Not real subtasks. |
| **Parent task** | Subtask context only; fixed and visible. Parent/project cannot be changed in that form. Its current version is passed invisibly to the command. |

The general Tasks composer currently begins as Non-project/Medium/No review, with no Target or reason. Choosing a project changes an incompatible Non-project type to Project; clearing project must resolve project-required types. A Project Tasks entry supplies its project explicitly. The demo may improve how scope/type choices are presented, but must not create contradictory combinations.

The backend returns employee identity labels; current source often uses email as the name. Fictional display names/avatars are fine in a demo, but do not assume every real employee has a stored photo, job label or display name.

## 6. Features to keep in their existing follow-up workflows

The approved requirements describe more task-related features than the ordinary create endpoint accepts. Include them in the design inventory without pretending they are functioning create-form fields.

| Feature | Compatible demo treatment |
|---|---|
| Reviewer selection | Show the review requirement now; name/select reviewers in the later review workspace. Do not add a reviewer ID to the ordinary create payload. |
| Attachments / drawings / evidence | After creation, open the existing Evidence/Documents workflow. A pre-create dropzone needs an explicit upload/partial-failure design and backend integration. |
| Dependencies | After creation, manage authorized same-project dependencies in task detail. A dependency is not a child task. |
| Committed due date / extension | Separate controlled, reasoned management workflow; not interchangeable with Target date. |
| Reminder | Separate existing reminder workflow. No default reminder or guaranteed delivery claim in task creation. |
| Recurrence | Choosing type Recurring is not enough to schedule occurrences. Use the dedicated recurrence workflow. |
| Client visibility | Use explicit client grants and review/issue workflows. No public/private or “client can see this” switch inferred from project membership. |
| Required / preferred skills | Separate skills/training integration; not fields accepted by this create command. Mark any proposed addition as “Requires backend work”. |
| Subtasks inside an unsaved parent | Current compatible flow: create parent, then add real children. Creating an entire unsaved task tree atomically would be a new contract. |
| Closeout on a cancelled project | Separate approval/closeout command. Do not add Closeout to the ordinary task-type menu. |
| Save draft / autosave | Current form draft is in memory. No reload, cross-device or durable “Saved” promise without new work. |

Do not add a status picker, “Create and complete”, approval bypass, unrestricted assignment, nested children beyond one level, or an automatic project/employee permission grant.

## 7. Suggested information hierarchy

Use a focused modal on desktop and a full-height sheet/modal on phone. A desktop two-column arrangement can put the brief on the left and assignment/timing on the right. A single column is also acceptable if the flow is clear. The existing production modal has a 760px maximum; a wider demo should justify the change rather than filling the screen.

```text
New task                                             Close
My Work / Riverside Residence

TASK BRIEF                         ASSIGNMENT & TIMING
Task name *                        Primary Owner *
Description                        Target date *
Project / work context *           Priority *
Task type *                        Review requirement
Why is this task needed? *

Collaborators (optional)                                  +
Planning: stage/milestone, start date, estimated hours      +
Tags and checklist                                        +

Cancel                                          Create task
```

Do not repeat a fixed project as an editable selector. Keep the owner and Target date easy to find. Review requirements should have a readable summary when collapsed. One primary action: **Create task** or **Create subtask**.

Use existing Sense Studios tokens: canvas `#f7f5f0`, white surfaces, pine `#244f43`, ink `#26312b`, border `#e8e8e2`; Inter/system sans-serif. Use restrained borders, familiar component shapes, readable labels and existing status colors. Preserve the supplied My Work style if a token differs; do not redesign the surrounding shell to match a reference website.

## 8. Interaction rules

**Opening:** retain the launch page/context, show the correct fixed project/parent, load current eligible people and focus the dialog heading or first useful field. Do not focus a hidden input.

**Changing project:** load the new eligible participants and plan items. Clear incompatible owner/collaborator/plan selections and explain what changed. Ignore late responses from a previously selected project. The old participant list must not remain actionable while new eligibility is loading.

**Validation:** identify the field and explain how to fix it. Preserve everything already entered. On invalid submission, move focus to the first invalid field; an error summary may link to fields. If Create is disabled, show the reason visibly.

**Capacity warning:** retain the draft and show the existing warning. Offer “Acknowledge and create task” and a way back to editing. Do not invent numeric remaining hours, percentages or a hard blocking policy. Editing the submitted values invalidates the acknowledgement.

**Sending:** show “Creating…”, prevent duplicate submission and prevent dismissal while the request is pending. Do not optimistically insert a second task or announce success early.

**Confirmed success:** use the confirmed canonical task ID, close the composer and open/offer its detail drawer. Refresh the appropriate view. When a manager creates work for someone else, do not force it into the manager's personal My Work queue merely to show success. Keep filters and scroll context; explain when the task is outside the current view.

**Unconfirmed result:** simulate a request that created the task but lost its response. Display “Creation not confirmed” with the submitted summary and **Check creation result**. Freeze that command, reuse its exact idempotency key/details and recover the same task ID. Never retry with a fresh key or state that the task definitely failed. This is a real creation-receipt contract, not a cosmetic spinner.

**Closing:** clean form closes immediately. Dirty form offers **Keep editing / Discard**. Leaving an unconfirmed command must explicitly explain the task may already exist and recovery context will be lost. Component-state drafts do not survive reload by promise.

**Access/session changes:** keep a specific, neutral error; re-read current choices after a context/access conflict. Expiry requires sign-in. Never expose the previous person's private draft to a newly signed-in account. UI role labels and old picker results never authorize a write.

## 9. Subtask rules the demo must respect

- Add from an existing eligible parent task, not from an arbitrary task row without checking its capability.
- Parent and child have the same non-null project. The parent must be top-level and eligible for child creation.
- No children of children, reparenting or automatic copying of owner/date/review requirements.
- New children cannot be added to terminal or review-protected/reassignment-blocked parents through this ordinary flow.
- Every child must be Completed before parent completion; a stopped/cancelled child is not a completed child.
- Parent and child visibility are independently authorized. Do not reveal hidden titles or fabricate hidden-child counts.
- A checklist may be 100% checked without the task being Completed. Parent completion never bypasses required review evidence.

## 10. Required demo states and walkthroughs

Provide a small, clearly separated **Demo scenarios** control so I can inspect these without manipulating code:

1. Employee creates a valid non-project self-task.
2. Employee creates work in an assigned project.
3. Owner without an employee identity must choose a Primary Owner.
4. Authorized manager assigns a person and two collaborators.
5. Unauthorized employee cannot assign another person.
6. Project Tasks launch keeps project fixed; subtask launch also keeps parent fixed.
7. Project change removes incompatible people/plan selections.
8. Missing title/Target/reason and invalid dates show useful validation.
9. Participant loading, no eligible owner, no picker search results, and read failure with Retry.
10. Capacity warning → edit or acknowledge → one created task.
11. Dirty close → Keep editing retains all values; Discard removes the draft.
12. Pending request blocks repetition; confirmed success opens the created task.
13. Response lost after successful creation → same-request check → one task, same ID.
14. Confirmed rejection/changed project/access preserves the editable draft appropriately.
15. Session expiry with a safe return/sign-in explanation.
16. Small phone with long title, many selected people, expanded optional groups and visible final action.

Suggested fixture people: Ananya Rao (employee), Kiran Mehta (eligible collaborator), Meera Iyer (authorized team lead), Dev Shah (different-branch employee without assignment), and a separate Owner account with no employee identity. Suggested projects: Riverside Residence (Active), Studio Renovation (Draft), Heritage House (On Hold). Names are fictional and capability fixtures determine eligibility; title/branch alone never grants access.

Example task: “Prepare living-room ceiling layout”; Project Riverside Residence; owner Ananya; priority High; Target 23 October 2026; estimated effort 4h; stage Design Development; Internal review; reason “Needed for the coordinated lighting review”; checklist “Check beam levels”, “Coordinate AC slots”, “Prepare issued PDF”. Use deterministic fixture dates so the demo does not unexpectedly change as the clock advances.

## 11. Responsive and accessibility requirements

- Design and inspect 1440×900, 1024×900, 390×844 and 320×740.
- Desktop: focused dialog with readable line lengths. Phone: one column, scrollable form body, reachable fixed/sticky action area with safe-area padding.
- At least 44px interactive targets; approximately 16px mobile input text; no horizontal scrolling.
- The footer must not cover the last field or become unreachable when the software keyboard opens. Actual phone/keyboard inspection is separate from viewport resizing.
- Keyboard-operable pickers, visible focus, labelled controls, Escape/close following dirty/pending rules, dialog focus containment and return to the launch control.
- Errors connected to fields, pending/success announced, and state distinctions expressed in text. Use readable contrast and respect reduced motion.
- Keep long employee labels, long project names, helper text and picker popovers inside the viewport.

## 12. Backend structure for later integration

The demo can use synthetic data and local simulated responses. It does not need a server or real credentials. Its interactions should map to these existing owners:

| Layer | Existing implementation |
|---|---|
| Shared creation modal | `apps/web/src/task-create-dialog.tsx` and `.css` |
| Shared fields, validation and payload | `apps/web/src/task-composer-fields.tsx` |
| Context-specific participants | `apps/web/src/task-creation-options.ts` |
| Ordinary/child submission and recovery | `apps/web/src/task.tsx` |
| Runtime option types | `packages/contracts/src/task-creation.ts` |
| Strict HTTP validation and session/CSRF boundary | `apps/api/src/task.controller.ts` |
| Authorization, persistence, capacity and lifecycle | `apps/api/src/task.service.ts` |
| Creation retry identity | `TaskCreationReceipt` and `task-create-identity.ts` |
| Real child relationships | `TaskSubtaskLink` |
| Canonical records/evidence | `Task`, `TaskCollaborator`, `TaskOwnerChange`, `TaskStatusChange`, `AuditEvent`, `DomainEvent`, outbox delivery |

Relevant API paths use the `/api/v1` prefix:

| Request | Purpose |
|---|---|
| `GET /api/v1/tasks/setup` | Authorized project/plan context and creation presentation hint. A presentation hint grants no authority. |
| `GET /api/v1/tasks/creation-options?projectId=…` | Current project/no-project `canCreate`, `canAssign`, actor employee and eligible people. Omit the query parameter for no project. |
| `POST /api/v1/tasks` | Create an ordinary task; keyed replays recover the same command through this endpoint. No invented receipt-lookup endpoint is needed. |
| `GET /api/v1/tasks/:id` | Read the confirmed canonical task/capabilities. |
| `GET /api/v1/tasks/:id/subtasks` | Authorized child context, version and create capability. |
| `POST /api/v1/tasks/:parentId/subtasks` | Create a child with `expectedParentVersion` and normal creation fields. |

Example manager-assigned project-task body; all UUIDs below are synthetic:

```json
{
  "idempotencyKey": "10000000-0000-4000-8000-000000000001",
  "title": "Prepare living-room ceiling layout",
  "description": "Coordinate lighting, AC slots and beam levels.",
  "type": "PROJECT",
  "priority": "HIGH",
  "targetDate": "2026-10-23",
  "projectId": "20000000-0000-4000-8000-000000000001",
  "ownerEmployeeId": "30000000-0000-4000-8000-000000000001",
  "estimatedHours": 4,
  "reviewRequirement": "INTERNAL",
  "collaborators": [
    { "employeeId": "30000000-0000-4000-8000-000000000002", "estimatedHours": 1 }
  ],
  "tags": ["Ceiling", "Coordination"],
  "checklist": [{ "label": "Check beam levels", "checked": false }],
  "reason": "Needed for the coordinated lighting review"
}
```

The server independently validates identity, current access, employee/project eligibility, dates, capacity acknowledgement, command identity and parent version. Creation records the task, ordinary evidence/events and receipt through its transaction. Real mutation requests require the internal session, exact Origin and CSRF token. Actor IDs, branch authority, creator and initial state are not trusted client inputs. New ordinary tasks start Not Started; creation must not mark work In Progress or Completed.

## 13. References to use selectively

- **Primary visual target:** existing Owner My Work demo / Sense Studios design tokens.
- [Linear creation screen](https://refero.design/pages/e5fb7da7-81e7-4855-880d-9cb566924d24): focused title/description hierarchy, compact metadata and a clear final action.
- [Linear creation flow](https://refero.design/flows/6645): in-context open → compose → confirm → return. Its recurrence, uploads and unsaved child-tree features do not automatically transfer.
- [Programa task screen](https://refero.design/pages/3e7906f9-acc8-4889-9ea1-7f5a9f58608b): studio-work context and visible date/assignee information.
- [Workflow composer](https://refero.design/pages/04de1d3e-d515-46eb-aec7-d33233ecd734): keep project metadata beside the brief, with optional material secondary.

These screens/flow were retrieved through Refero MCP for this brief. A Linear style search was also inspected; its dark marketing style is not the app's design direction. Earlier broader research is in `docs/design/TASK_CREATION_COMPLETED_UX_RESEARCH_2026-10-16.md`. Reference descriptions are design evidence, not proof of a current external product's complete behavior.

## 14. What to return for implementation

1. Editable HTML/CSS/JS or a Figma file with working prototype links. A self-contained HTML demo is easiest to compare and inspect.
2. Desktop and phone layouts, including expanded fields, errors, pending, success, capacity and unconfirmed-result states.
3. A short README: how to open, which scenario controls exist, and which behaviors are simulated.
4. Source assets/icons/fonts and token values; avoid dependencies that require private accounts or missing files.
5. Field/interaction annotations where a screenshot alone would be ambiguous.
6. A separate **Proposed new behavior** list for additions beyond this brief. Keep the compatible main flow distinct so implementation does not silently change business rules.
7. The original My Work layout alongside the revised creation experience, so surrounding-shell changes are identifiable.

When the demo is returned, integration should map its approved visuals and interactions onto the shared production composer, reuse existing API/persistence/security rules, and verify real authorization, persistence, recovery, responsive behavior and accessibility. A beautiful simulated demo alone is not production acceptance.

## 15. Copy/paste prompt for your demo builder

> Create an editable, interactive task-creation demo for Sense Studios, an architecture/interior-design work-management app. Use the supplied existing My Work demo as the unchanged surrounding layout. Redesign only the shared Create task / Create subtask experience and its connected success drawer. Follow the accompanying TASK_CREATION_DEMO_BRIEF_2026-10-20.md for exact fields, limits, permissions and state behavior. Use a calm cream/white/pine-green visual system with readable typography. Show title, description, project/type, one Primary Owner, Target date, priority, review requirement and mandatory reason; progressively disclose collaborators, planning, tags and checklist. Demonstrate employee self-tasks, authorized manager assignment, an Owner with no employee identity, fixed project/parent context, validation, capacity warning, dirty-close handling, pending/success and lost-response recovery of the same task without duplicates. Build responsive layouts at 1440, 1024, 390 and 320px with keyboard-accessible controls and a reachable mobile footer. Use fictional data and clearly separated demo scenario controls. Do not invent authority, automatic approvals, a committed deadline, client visibility, durable autosave or a pre-create upload/recurrence/child-tree contract. Return editable source, assets, annotated states and a README. List additional ideas separately as proposals requiring backend review.

## Sources and verification boundary

Approved requirements R-018–R-024/R-027–R-029 and C-023/C-024; S09_SPEC/S10_SPEC; current Task controller/service/contracts/composer; approved one-level child/receipt refinements and `docs/development/APP_ACTIONS_SUBTASKS_CONTRACT_2026-10-13.md`; existing demo README and Refero research. This document distinguishes source contracts from design recommendations and unimplemented proposals. It does not supersede current operational/production acceptance limits or certify the concurrently edited checkout.

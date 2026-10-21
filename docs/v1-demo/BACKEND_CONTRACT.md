# Sense Studios V1 — backend structure and tab demo contract

Prepared 15 October 2026 for the Owner's **internal pilot with real staff** and ChatGPT demo handoff. Read the [delivery plan](../development/V1_INTERNAL_PILOT_PLAN_2026-10-15.md) and [demo instructions](README.md).

Delivery update, same date: the source now includes the Owner-only 51-key permission catalogue, grouped permission selectors and validation of new grant keys. Task descriptions now share the existing 2,000-character API limit across create/edit/subtasks with client draft-preserving validation. See [exact verification and remaining gates](../development/V1_DELIVERY_PROGRESS_2026-10-15.md); no current runtime/pilot acceptance is implied.

## 0. How to use this contract

Build the visual demos against the entities, commands and behavior below. Use synthetic data and an in-memory mock service. When a demo returns, replace that service with reviewed API adapters and reuse the real application's existing authorization and workflows.

Three labels matter throughout:

- **EXISTING SOURCE:** route/model/behavior inspected in the current repository. This does not claim its current runtime or acceptance tests passed.
- **PROPOSED V1:** an addition to design and implement in a bounded slice; the demo may simulate it with an explicit note.
- **DEMO MODEL:** a frontend shape or scenario fixture, not a promised current HTTP response or database migration.

All relative API paths below use the existing **`/api/v1`** prefix. Browser pages such as `/projects?projectId=...` are distinct from API paths such as `/api/v1/projects/:id`. Real IDs are UUIDs. Illustrative `:id` values in route tables are placeholders, not literal requests.

## 1. Backend architecture shared by all tabs

Retain the current modular monolith: React/TypeScript web UI → Nest controllers/services → Prisma/PostgreSQL; file content remains behind the document/NAS service. A tab is a view into the owning modules, not a new database silo.

| Tab / surface | Owns or reads | Existing owning services | Database structure |
| --- | --- | --- | --- |
| My Work | Personal tasks, action-required tasks, assigned review rounds, decidable approvals | TaskService, MyWorkService, ReviewService, ApprovalService; DashboardService for existing summaries | Reads existing tasks/reviews/approvals; **no new WorkItem table** |
| Task creation/detail | Canonical task and participants, date/state history, dependencies, real children | TaskService, plus owning review/document/time/workforce workflows | Task, TaskCollaborator, TaskOwnerChange, TaskStatusChange, TaskCommittedDateChange, TaskDependency, TaskSubtaskLink and existing evidence |
| Projects | Branch-owned project, scopes, assignments, lead, lifecycle, template plan | ProjectService, ProjectWorkflowService, template service; read ports of Tasks/Documents/Reviews/Turnkey/Site | Project, ProjectScope, ProjectAssignment, lead/transfer/scope/lifecycle history, ProjectPlan/ProjectPlanItem/completion evidence |
| People | Staff identity linked to employee, membership, reporting, roles/access | IdentityService, OrganizationService, AuthorizationService; separate PRJ/WFM/SKL/TRN read links | Account, Employee, Branch, Team, JobRole, EmployeeMembershipHistory, EmployeeJobRoleAssignment, RolePermission, EmployeePermissionOverride |
| Settings | Personal security/notifications and permitted organization/domain configuration | Identity, Organization, Notifications and owning configuration services | Existing domain configuration; **no universal arbitrary settings JSON store** |
| Dashboard/Decisions/Notifications | Authorized projections and actionable links | DashboardService, ApprovalService, Notification services | Existing source projections, approval records and persisted notification/delivery records |

Organization structure is **Organization → Branch → Team → Employee**. A project has one owning branch. A person may have several job roles, one current home branch/team, an explicit reporting manager and separately granted project assignments. No Brand/Department tier is introduced.

Important writes follow the existing pattern: current session → current resource/scope/conditions → input validation → owning transaction/serialization → current authority/version checks → domain write + immutable evidence + events/outbox. NAS bytes follow the existing staged upload/finalization protocol, not a pretend database transaction over files.

## 2. Shared identity, capabilities and screen states

### Current session — EXISTING SOURCE

`GET /auth/session` returns the following shape:

```ts
type InternalSession = {
  account: { id: string; email: string; kind: "OWNER" | "STAFF" };
  csrfToken: string;
  ownerSetupRequired: boolean;
  activePasskeyCount: number;
};
```

The session is not a complete permission catalogue. Resource detail/setup responses and owning authorization checks determine actions. Do not add `role: "admin"` to the session and infer broad authority from it. Client/external identities use separate portals, cookies and session flows; they never enter internal tabs.

Real requests use same-origin cookies, no-store protected reads, and `X-CSRF-Token` on mutations under the existing origin/CSRF rules. Some organization/access mutations require sign-in within five minutes. Show a sign-in recovery state when required; a fresh browser read does not make an old session newly authenticated.

### DEMO MODEL for asynchronous screens

```ts
type LoadState<T> =
  | { state: "loading" }
  | { state: "ready"; data: T }
  | { state: "empty" }
  | { state: "denied"; message: string }
  | { state: "error"; message: string }
  | { state: "stale"; data: T; refreshedAt: string }
  | { state: "conflict"; message: string };
```

This is UI state, not a new HTTP envelope. Preserve existing wire error shapes. Handle 400 validation, 401 session loss, 403 denied/current-scope loss, 404 unavailable/not found, 409 state/version/capacity conflicts and 503 unavailable sources. Differentiate them using actual response/code/context; do not label every 409 a stale version. Not every existing error has field details or a stable code.

On account change/logout, clear all private rows, counts, pickers, dialogs and account-scoped preferences; ignore late responses belonging to the prior actor. Same-account CSRF rotation should preserve valid navigation context. After actual access revocation, do not leave private content visible as a stale cache.

### Effective access rules for every demo

| Actor context | What the real backend allows |
| --- | --- |
| Owner | Organization authority with current secured setup/session; reasons, workflow constraints and immutable evidence still apply. |
| Scoped manager / Team Leader | Only granted team/reporting-tree or assigned-project actions. A job title never grants personnel or project administration. |
| Project Lead | Delivery management within assignment/grants; **current project contributor assignment and lead appointment endpoints are Owner-only**. |
| Employee | Self-task creation, own/permitted work and personal workflows; cannot assign another employee without separate authority. |
| Site employee | Explicitly assigned site/project workflows; presentation does not add finance/personnel access. |
| Named reviewer | Exact assigned round and permitted evidence; no self-review or generic permission to complete every task. |
| Cross-branch employee | Only explicitly Owner-authorized project participation; no other project/people access in that branch. |

Backend deny overrides allow; default deny. Resource membership, confidentiality, expiry, task/project state and independent reviewer/approver conditions still apply. Hiding a button is only presentation.

## 3. My Work tab

### Purpose and UI structure

Answer: **What should I work on now, and what is my next permitted action?** Show the approved summary area, personal queue, supported filters/views and task drawer. Needs action is a typed queue of actual obligations; it is not the organization's entire task list.

Keep personal task phases distinct from role-appropriate second scopes. The visible label “My Work” is not itself an API scope. Current personal reads use `scope=personal`; current UI scope selection/profile mapping must not replace it with a display label or accidentally send `mine`.

### Read structure — EXISTING SOURCE

| Read | Meaning |
| --- | --- |
| `GET /tasks/setup` | Actor employee identity, presentation profile, currently scoped project/person/plan choices, broad assignment capability |
| `GET /tasks?scope=personal&offset=0&limit=50` | Authorized personal task page, `{ total, items }`; applies supported task filters |
| `GET /my-work/attention?source=all&offset=0&limit=50` | One composed, ordered task/review/approval page and source counts from one read snapshot |
| `GET /reviews/inbox` / `GET /reviews/actionable` | Owning reviewer inbox/action read, with its own supported query/paging contract |
| `GET /approvals/actionable` | Decidable approvals; owning type decides actual commands |
| `GET /tasks/:id` and `GET /tasks/:id/subtasks` | Canonical task detail, current command capabilities and independently authorized child projection |
| `GET /dashboard/sources/tasks` | Existing dashboard task-source projection; do not substitute it for arbitrary filtered queue totals |

Task list supports `scope=mine|assigned|personal|all|owned|created|collaborating`, `offset`, `limit` (1–100), and current `projectId`, `planItemId`, `ownerEmployeeId`, `q`, `status`, `phase=active|waiting|review|completed`, `dateBasis=target|committed`, `dateFrom`, `dateTo`, `type`, `requiresReassignment`, `metric=reviews`, `sort=created_desc|target_asc|title_asc|owner_asc`. These scopes remain subject to authorization; none is a bypass.

Attention query supports `source=all|task|review|approval`, `q`, `projectId`, task-only `status`, `phase=waiting|review|completed`, `type`, `ownerEmployeeId`, `planItemId`, `dateBasis`, `dateFrom`, `dateTo`, `offset`, `limit` (1–100). Task-only filters force the Tasks source; the UI must reveal that change. Date ranges require `dateBasis` and ordered bounds.

The actual composed response contract is:

```ts
type WorkSource = "task" | "review" | "approval";
type WorkRow = {
  source: WorkSource;
  sourceId: string;
  title: string;
  taskId?: string;
  roundId?: string;
  requestId?: string;
  project?: { id: string; title: string } | null;
  responsibility: string;
  reason: string;
  reasons?: string[];
  deadline: string | null;
  deadlineKind: "target_date" | "review_date" | "decision_expiry";
  priority?: string;
  status?: string;
  destination: string;
  isSubtask?: boolean;
};
type AttentionPage = {
  status: "ready";
  source: "all" | WorkSource;
  sourceCounts: Record<WorkSource,
    { status: "ready"; total: number } | { status: "excluded" }>;
  items: WorkRow[];
  offset: number;
  limit: number;
  totalItems: number;
  hasMore: boolean;
  readAt: string;
  timezone: string;
};
```

Use key `${source}:${sourceId}`. Multiple reasons for the same task produce one task row, but a review round and an approval remain distinct obligations. The sum is work items, not “tasks.” Current ordering uses organization-calendar deadline day, existing priority, source and source ID. A missing decision deadline sorts after dated work; do not manufacture a task Target for an approval.

If composition fails, current service returns unavailable rather than publishing a misleading complete page/count. Independent summary widgets can have their own error/stale state; do not fabricate per-source success fields in `AttentionPage`.

### Required demo behavior

- Selecting a summary tile opens its matching authorized result; Clear restores prior context. Overdue is derived from unfinished state + Target + organization day; Waiting is its canonical workflow, not every dependency warning.
- Task click opens real-ID detail; review click opens exact task/round; decision click opens the request's owning context. Return restores list/filter/page/scroll/focus.
- Show separate Tasks/Reviews/Decisions counts and management reassignment holds. Employee-less Owner may have zero personal tasks while still having management actions.
- No uploads count for Site without an implemented queryable source. No “No date” creation/filter behavior is invented for required-target tasks.
- Saved views/customization are currently account-scoped browser preferences; a demo must not promise organization sharing or server synchronization.

**PROPOSED V1:** remaining accessibility/polish and integration with returned demo; contract additions only for demonstrated gaps. Do not rebuild an existing attention composer as a second frontend aggregation.

## 4. Task creation form and task detail

### Current setup — EXISTING SOURCE

```ts
type TaskSetup = {
  actorEmployeeId: string | null;
  creationProfile: {
    version: 1;
    variant: "OWNER" | "EMPLOYEE" | "LEADER" | "SITE";
    resolution: "ACCOUNT_KIND" | "CONFIGURED_ROLE" |
      "GENERIC_FALLBACK" | "AMBIGUOUS";
  };
  projects: Array<{
    id: string; title: string; status: string; branchId: string;
    canApproveCloseout: boolean;
  }>;
  planItems: Array<{
    id: string; projectId: string; kind: string; label: string;
  }>;
  employees: Array<{ id: string; name: string; homeBranchId: string }>;
  canAssign: boolean;
};
```

Current `name` commonly contains email. The presentation profile changes layout only. Owner wins by account kind; conflicting/missing classifications fall back to Employee. No client role switcher is part of the real form. `canAssign` can cover more than one resource context; it does not guarantee a particular employee is assignable to a particular project. Current writes independently recheck that combination.

### Main form fields

Delivery update: ordinary task and subtask creation now use one typed field component and payload/validation builder. `GET /tasks/creation-options?projectId=:id` supplies current-context permitted owners/collaborators with `actorEmployeeId`, `project`, `canAssign`, `canCreate`, `owners`, `collaborators`, `readAt`; omit projectId for non-project work. This no-store read does not grant access; the write still reauthorizes. Invalid or unknown query fields fail. See [source checks and acceptance limits](../development/V1_TASK_COMPOSER_PROGRESS_2026-10-15.md).

| Group | Fields / behavior |
| --- | --- |
| Essentials | Name (2–160), one owner, type, priority, required Target (`YYYY-MM-DD`); current required reason (3–1,000) |
| Context | Project where applicable; stage/milestone must belong to that project; project launch preselects context |
| Planning | Description ≤2,000; optional start; estimate 0–100,000; tags max10, each1–30; checklist max10, each label1–120 |
| People | Distinct optional collaborators, max30; optional explicit per-person estimate; no automatic equal allocation |
| Review | `NONE|INTERNAL|CLIENT|BOTH`; actual reviewer/evidence planning uses the owning review workflow |
| Later/contextual actions | Real file upload, dependency, recurrence, committed date/extension and subtask commands; no label-only pretend implementation |

Core types accepted by ordinary create: `PROJECT`, `NON_PROJECT`, `RECURRING`, `CORRECTION`, `SITE`, `TRAINING_PRACTICAL`. `CLOSEOUT` uses a separate approval command. A type value alone does not generate a correction round, schedule recurrence, publish training or submit site evidence.

### Example ordinary create payload — EXISTING SOURCE

`POST /tasks` with cookie/CSRF; all IDs and content below are synthetic:

```json
{
  "title": "Prepare ground-floor layout",
  "type": "PROJECT",
  "priority": "HIGH",
  "targetDate": "2026-10-16",
  "projectId": "30000000-0000-4000-8000-000000000001",
  "ownerEmployeeId": "20000000-0000-4000-8000-000000000002",
  "description": "Prepare the layout for the internal design review.",
  "estimatedHours": 3,
  "reviewRequirement": "INTERNAL",
  "tags": ["Layout"],
  "checklist": [{ "label": "Check room dimensions", "checked": false }],
  "reason": "Assign the agreed design work"
}
```

For an ordinary employee self-task, omit `ownerEmployeeId`; the server resolves the active employee. An employee-less Owner cannot self-own and must explicitly choose an eligible employee. Do not default all staff to team assignment or auto-create an Employee for Owner.

Task create/edit/subtask source now shares `TASK_DESCRIPTION_MAX_LENGTH = 2000` with its strict API. Oversized submissions stay in the form with a clear explanation and no request; do not truncate text silently. Current ordinary create has **no idempotency key in its strict input**; do not claim safe durable retry exists. Disable double submission, preserve drafts on failure, show uncertain outcomes honestly, and record bounded backend retry/idempotency work as a gap.

### Existing task commands

| Method / path | Input / purpose |
| --- | --- |
| `POST /tasks` | Ordinary create above |
| `PUT /tasks/:id` | Supported edit fields, expectedVersion and reason; derive exact editable fields from current schema during integration |
| `POST /tasks/:id/state` | `{ toState: "IN_PROGRESS"|"COMPLETED", expectedVersion, reason, acknowledgeUnfinishedDependencies?: true }` |
| `POST /tasks/:id/wait` | `{ expectedVersion, reason, delayCause, responsibleParty? }` |
| `POST /tasks/:id/resume` | `{ expectedVersion, reason }` |
| `POST /tasks/:id/reassign` | `{ newOwnerEmployeeId, expectedVersion, reason, acknowledgeOverload?: boolean }` |
| `POST /tasks/:id/committed-date` | `{ expectedVersion, committedDueDate, reason }` |
| `POST /tasks/:id/extension-requests` | `{ expectedVersion, proposedDate, approverAccountId, reason }`; manager decision/Owner withdrawal are separate subroutes |
| `POST /tasks/:id/dependencies` | `{ predecessorTaskId, expectedVersion, reason }` |
| `POST /tasks/:id/dependencies/:predecessorId/remove` | `{ expectedVersion, reason }` |
| `POST /tasks/:parentId/subtasks` | Ordinary create fields plus `expectedParentVersion`; current parent capability and same-project policy required |
| `POST /tasks/closeout` | Separate approved closeout workflow; not an ordinary type selection |

For editing task details, current `PUT /tasks/:id` requires `expectedVersion`, `reason`, `title`, `targetDate` and `priority`; optional supported fields are `description`, `startDate`, `estimatedHours`, nullable `planItemId`, `tags` and `checklist`. It is not a generic partial patch of every Task column; ownership, project association and review state cannot be changed by adding arbitrary keys.

Task detail currently returns `task`, `people`, `collaborators`, `history`, `extensions`, `dependencies`, `closeoutApproval`, `linkedReviewTaskId` and `capabilities`. Relevant capability names are `edit`, `transition`, `wait`, `resume`, `changeCommittedDate`, `requestExtension`, `manageDependencies`, `reassign`, `revokeCloseout`. Subtask creation capability comes from the subtask projection, not that list. Capabilities are current action hints; all writes reauthorize.

### Exact task states — EXISTING SOURCE

```text
NOT_STARTED
IN_PROGRESS
WAITING
SUBMITTED_INTERNAL_REVIEW
IN_INTERNAL_REVIEW
CORRECTIONS_REQUIRED
INTERNAL_APPROVED
SUBMITTED_CLIENT_REVIEW
IN_CLIENT_REVIEW
CLIENT_REVISION_REQUIRED
CLIENT_APPROVED
COMPLETED
STOPPED_DUE_TO_PROJECT_CANCELLATION
```

Do not implement a free status dropdown that writes any state. The ordinary state endpoint accepts only its two target states and may still reject them. Review/client-review commands own review transitions. Overdue is derived and is not in this enum. Checklist completion does not complete real children. One-level same-project real children keep their own owner/Target/review; every child must be COMPLETED before ordinary/internal/client parent completion. No reparent/detach/cascade behavior is introduced.

**SOURCE IMPLEMENTED:** shared typed fields/payload/validation for ordinary tasks and subtasks, context-specific `creation-options`, project review-requirement control and canonical ordinary-create opening. **STILL V1 WORK:** Project Tasks embedding, durable create retry/idempotency, complete current-source persistence and authenticated acceptance. Non-project review workflow support is a pending Owner choice; do not invent that workflow in a demo. Reviewer/evidence planning remains with its existing owning commands.

## 5. Projects tab

### List, workspace and backing records

List essentials: title, branch, delivery type, state, current lead, next milestone; optional authorized client and applied stage context. Workspace sections: Overview, Plan, Tasks, People, Documents, Reviews, Delivery, Activity. People as a dedicated project section and embedded Tasks are **PROPOSED V1**; current Tasks/Documents/Reviews/Delivery sections primarily navigate to their canonical workspaces.

### Reads — EXISTING SOURCE

| API | Response / role |
| --- | --- |
| `GET /projects/setup` | `{ owner, ownerAccountId?, branches, employees }`; choices are scoped, employee choices currently supplied to Owner |
| `GET /projects?offset=0&limit=50` | `{ total, stageKeys, items }`; current filters `branchId`, `q`, `stageKey`, `sort=created|name|milestone`, `direction=asc|desc`; limit1–100 |
| `GET /projects/:id` | `project`, `capabilities`, lead fields, assignments, leadChanges, transfers, scopeChanges, cancellationRequests and optional Won provenance |
| `GET /projects/:id/plan` | `{ plan, items, history, capabilities: { complete, override } }` |
| `GET /tasks?scope=all&projectId=:id&offset=0&limit=50` | Canonical project task page, still actor-authorized; never filter a single downloaded page and claim a global total |
| `GET /documents/projects/:id` | Owning authorized document listing |
| `GET /reviews/tasks/:taskId` | Exact task review context; inbox is not a complete historical project review register |
| `GET /client-reviews/projects/:id` | Existing internal staff client-review context, with its own authority |

There is no current project-list `status`/`deliveryType` query parameter in the inspected controller. Either limit a demo to supported filters or label new server filters PROPOSED. Never silently filter a paged result and present it as the full project count. No new invented percentage, budget, health score or staff capacity appears in Overview.

### Create and management commands — EXISTING SOURCE

```ts
type CreateProject = {
  branchId: string;
  title: string;                  // 2–160
  deliveryType: "DESIGN" | "TURNKEY";
  scopes: string[];               // 1–12, each 2–120
  clientId?: string;
  wonLeadId?: string;
  reason: string;                 // 3–1000
  templateVersionId?: string;
  idempotencyKey?: string;        // UUID; required iff templateVersionId is sent
};
```

`POST /projects` creates through current Owner authority; do not give every Project Lead a Create Project command. Template application retains its actual version and atomic create/retry contract. Plain creation does not inherit template-specific idempotency merely because the UI has a Save button.

| Method / path | Input / authority |
| --- | --- |
| `POST /projects/:id/assignments` | `{ employeeId, expectedVersion, reason }`; **Owner-only**, cross-branch grant is explicit |
| `DELETE /projects/:id/assignments/:employeeId` | `{ expectedVersion, reason }`; current Owner command, active lead removal restrictions |
| `POST /projects/:id/lead` | `{ employeeId, expectedVersion, reason }`; **Owner-only**, eligible currently assigned lead |
| `POST /projects/:id/status` | `{ toStatus: ACTIVE|ON_HOLD|COMPLETED|ARCHIVED, expectedVersion, reason, overrideMilestones? }`; current lifecycle capability and gates |
| `POST /projects/:id/transfer` | `{ toBranchId, expectedVersion, reason }`; Owner transfer and access consequences |
| `POST /projects/:id/scope-approver` | `{ accountId, expectedVersion, reason }`; named approver configuration under existing Owner rules |
| `POST /projects/:id/scope-requests` | `{ name, expectedVersion, reason }`; a proposal does not immediately alter approved scope |
| `POST /projects/:id/scope-requests/:approvalId/decision` | `{ outcome: APPROVED|REJECTED, reason }`; named current approver |
| `POST /projects/:id/cancellation-requests` | `{ reason }`; request only, no direct cancellation authority |
| `POST /projects/:id/cancel` | `{ expectedVersion, reason, clientAccessEndTimes?: [{grantId, expectedVersion, expiresAt}] }`; Owner-only, current native-link/client expiry prerequisites |
| `POST /projects/:id/plan-items/:itemId/complete` | `{ expectedVersion, reason }`; permitted current plan authority |

Project states: `DRAFT|ACTIVE|ON_HOLD|COMPLETED|ARCHIVED|CANCELLED`. A state enum is not a permission to transition arbitrarily. Active requires an accountable eligible lead; lead exit holds the project and requires Owner replacement before resume. Required milestones gate completion. Cancelled delivery never resumes through ordinary task creation; separately approved closeout remains distinct.

Relevant current project capability names include `assignLead`, `manageLead`, `assignContributor`, `manageAssignments`, `changeStatus`, `manageLifecycle`, `requestScopeChange`, `requestScope`, `requestCancellation`, and current rights such as `decideScope`. Do not infer them from a client-side title. Use current response fields rather than a new blanket `isAdmin` flag.

### Project child-tab structure

| Section | Backend connection / behavior |
| --- | --- |
| Overview | Project detail/plan fields; permitted state actions with action-specific reason form |
| Plan | Existing plan/template/version/completion contracts; no fake draggable schedule persistence |
| Tasks | Same Task list/detail/composer as My Work, fixed project context; one canonical record |
| People | Current project assignments/lead, Owner actions; not a company directory or automatic grant |
| Documents | Current document service: folder/upload/stream, exact file permission and revision/issue context; never NAS paths |
| Reviews | Current internal and client review workflows, exact task/round/item IDs; separate from ordinary task completion |
| Delivery | Existing Design handover/revision context or Turnkey/Site workspaces according to type and capability |
| Activity | Existing authorized lifecycle/scope/lead/transfer evidence; no unrestricted raw audit table read |

**PROPOSED V1:** embedded project task view/composer, focused People section, and authorized overview/history read additions only where current data is insufficient. Design each new aggregate through source-domain authorization; a project membership alone does not authorize every underlying source.

## 6. People management tab

Delivery update: a dedicated browser `/people` destination, Owner local-filter directory/selected-person editor, Staff self profile/reporting-team view and focused Settings entry points are now source-implemented. See [People/Settings checks and remaining gaps](../development/V1_PEOPLE_SETTINGS_PROGRESS_2026-10-15.md). This is not current authenticated/pilot acceptance. The fuller profile composition below remains a V1 design target where not implemented.

### Screen and entity structure

Directory → person detail → separate action forms. Directory columns: identity label, employee code, home branch/team, job roles, reporting manager, employment state and onboarding readiness where available. Profile sections: Overview, Organization/reporting, Roles & access, Project assignments, Work context and History. Work context is permission-bound links/read projections, not a new performance database.

`Account` login state `PENDING|ACTIVE|SUSPENDED` is distinct from `Employee` employment state `ACTIVE|SUSPENDED|EXITED`. Invitation/enrollment stages are UI projections, not invented Employee enum values. A person can be authenticated but still lack employee membership/grants required for usable work.

Current Account has email; Employee has employeeCode, homeBranchId, homeTeamId, reportsToId, state, hiredAt and history. A separate friendly display name is **PROPOSED V1**, not a field already accepted by employee create.

### Reads — EXISTING SOURCE

| API | Authority / limitations |
| --- | --- |
| `GET /auth/staff` | Secured Owner identity inventory; not an organization-wide employee directory for staff |
| `GET /org/employees?organizationId=:id` | Owner employee list; currently excludes EXITED records |
| `GET /org/self` | Active current internal subject's own employee/code/home membership/reporting/current role labels, or `{ employee: null }`; no target ID/grants/credentials; secured Owner setup required |
| `GET /org/team/employees` | STAFF with `org.employee.read` at current TEAM scope; returns active same-home-team/branch reporting descendants and manager options, plus `capabilities.canManageReporting` evaluated from the separate current `org.employee.manage` check |
| `GET /org`, `/org/branches`, `/org/teams`, `/org/roles` | Current Owner organization reads with required organizationId queries on the list routes |
| `GET /projects/:id` | Current project participant/lead projection under project view authority |

The current employee list responses are not a new unified paginated People API. Do not call Owner list endpoints from an ordinary employee and filter their data locally. Existing manager endpoints do not imply every managed person can see the entire team.

Organization protected reads return no-store. The self projection has no display name or effective-access explanation; a missing employee is an onboarding state, not a failed directory query.

### Mutations — EXISTING SOURCE

| API | Purpose / payload |
| --- | --- |
| `POST /auth/staff/invitations` | Owner identity invitation using the current identity input; enrollment completes through ordinary passkey flow |
| `POST /org/employees` | Link an accepted active STAFF identity to an employee; payload below |
| `PUT /org/employees/:id/membership` | `{ organizationId, branchId, teamId, reportsToId?: string|null, reason }`; Owner |
| `PUT /org/employees/:id/job-roles` | `{ organizationId, jobRoleIds, reason }`; Owner |
| `PUT /org/team/employees/:id/reporting` | `{ reportsToId, reason }`; STAFF plus explicit current `org.employee.manage` team/report-tree authority |
| `PUT /org/employees/:id/suspend` | `{ reason }`; Owner suspension, preserving business history |
| `POST /org/employees/:id/exit` | `{ reason }`; Owner atomic exit and task/project/session consequences |
| `POST /auth/staff/:id/revoke-sessions` | Owner identity security action; identity ID is an Account ID |
| `POST /auth/staff/:id/recovery` | Owner-controlled staff recovery; preserve actual passkey/recovery procedure |

Existing employee create input:

```ts
type CreateEmployee = {
  organizationId: string;
  accountId: string;
  branchId: string;
  teamId: string;
  jobRoleIds?: string[];        // max16
  reportsToId?: string;
  employeeCode?: string;        // 1–64
  hiredAt: string;              // YYYY-MM-DD
  reason: string;               // 10–1000
};
```

Do not send `name`, `displayName`, `expectedVersion`, `isAdmin`, a password or invented invitation status to this strict input. Account IDs and Employee IDs are different; a project assignment takes Employee ID.

### Lifecycle behavior the demo must preserve

1. Invite → register passkey/accept → create employee → set membership/roles → grant explicit access → assign project. Show readiness for each real prerequisite.
2. Job role assignment and reporting manager changes do not automatically assign projects or broaden confidentiality/file rights.
3. Exit immediately ends access, retains old ownership/history, moves unfinished owned work to Waiting for individual authorized reassignment and holds Active projects led by the leaver. Do not auto-reassign tasks to the manager.
4. Suspension and exit are distinct commands. Do not add a generic delete-person button. Do not offer unsupported unsuspend/reactivate flows as existing backend actions.

### PROPOSED V1 read/presentation additions

- A paginated Owner/report-tree/self People projection with search/filter metadata and per-resource action hints. The final route/shape is to be reviewed; **`GET /people` is not an existing API**.
- Owner-only archived/exited-person history reads, preserving employment records and narrowing sensitive fields.
- Scoped person detail/access explanation and assignment links composed from owning sources. A self profile read is not a right to all other personnel.
- Optional Employee displayName: proposed Owner-managed audited edit, nullable legacy records, no automatic email-name inference, and no migration/backfill until the policy is approved.
- An onboarding checklist can derive readiness; it must not expose recovery secrets or falsely mark email delivery/passkey setup successful.

A demo can use readable fictional names, but its schema notes must identify displayName as proposed. Before wiring, agree on the additional read fields and their authorization instead of faking them from unrestricted Owner queries.

## 7. Settings panels and Access Control

Existing source now offers focused `section=organization&panel=structure|access|presentation` browser entry points and links to People. The legacy combined organization editor remains for compatibility; full independent draft/navigation/recent-sign-in recovery remains V1 work.

### Panel map

| Panel | Backend structure / actual connection | Demo behavior |
| --- | --- | --- |
| My account & devices | `GET /auth/session`, `GET /auth/sessions`, `DELETE /auth/sessions/:id`, passkey registration option/verify routes, `POST /auth/logout` | Current account, security readiness, own session controls; browser authenticators use real flows during integration |
| My notifications | `GET /notifications/preferences`, `PUT /notifications/preferences`, `PUT`/`DELETE /notifications/quiet-hours`; email status/verification routes | Category/channel preferences and supported quiet hours; mandatory notices cannot be silently disabled |
| Organization | `GET`/`POST /org`, `PUT /org/:id/timezone` | Owner, explicit timezone, current settingsVersion, reason; no fake profile/avatar/currency setting without a contract |
| Branches & teams | `GET`/`POST /org/branches`, `GET`/`POST /org/teams`, `PUT /org/teams/:id/waiting-alerts` | One branch per team; reasoned creation and existing Waiting-alert setting; no invented delete/archive/rename endpoint |
| Job roles & access | `GET`/`POST /org/roles`; role/employee permission commands below | Dynamic role bundles and explicit overrides; known actions and valid scopes |
| People | Link to dedicated People area; current commands remain owned by IDN/ORG | Avoid a second full person editor inside Settings |
| Task presentation | `PUT /org/roles/:roleId/creation-presentation` | Owner-configured optional EMPLOYEE/LEADER/SITE hint; no permission effect |
| Templates and domain policies | Existing `project-templates` routes and current Workforce/notification/retention configuration workspaces | Link or embed only actual owning forms; no arbitrary policy default values |
| Integrations/operations | Existing integration/delivery/configuration workspaces; source-specific authorization | Configured/unconfigured/failed states; no fake successful connection or direct provider secrets in demo |

Personal routes are available to the signed-in subject under their owning rules. Organization/role/permission operations in the inspected controller are Owner-only, with setup/fresh sign-in restrictions on access mutations. A staff Team Settings page cannot call them on the basis of a frontend management role.

### Actual permission records and mutation inputs

```ts
type ScopeKind = "ORGANIZATION" | "BRANCH" | "TEAM" | "SELF";
type GrantRolePermission = {
  organizationId: string;
  permissionKey: string;        // existing source key, 3–160
  scopeKind: ScopeKind;
  branchId?: string;
  teamId?: string;
  reason: string;               // 10–1000
};
type GrantEmployeeOverride = GrantRolePermission & {
  effect: "ALLOW" | "DENY";
  expiresAt?: string;           // ISO timestamp with offset
};
```

| Endpoint | Input |
| --- | --- |
| `POST /org/roles/:roleId/permissions` | GrantRolePermission |
| `PUT /org/roles/:roleId/permissions/:permissionId/revoke` | `{ reason }` |
| `POST /org/employees/:id/permissions` | GrantEmployeeOverride |
| `PUT /org/employees/:id/permissions/:overrideId/revoke` | `{ reason }` |
| `PUT /org/roles/:roleId/creation-presentation` | `{ organizationId, creationPresentation: EMPLOYEE|LEADER|SITE|null, expectedCreationPresentation: EMPLOYEE|LEADER|SITE|null, reason }` |

`PROJECT` and `FILE` are **not** generic RolePermission `scopeKind` enum values. Explicit project membership and Confidential item grants are separate records/commands. A generic permissions grid cannot invent project/file scope payloads or imply that a team grant authorizes another branch.

Verified example source keys include `org.employee.read`, `org.employee.manage`, `project.view`, `project.manage`, `project.closeout_approve`, `project.plan_complete`, `project.gate_override`, `task.assign`, `task.deadline_change`, `document.view`, `document.upload`. The complete current 51-key source catalogue is in `packages/contracts/src/permissions.ts`; use it rather than invented free-form examples such as `projects.read` or `task.review`.

**EXISTING SOURCE:** `GET /org/permission-catalogue` returns `{ version: 1, groups: [{ label, permissions: [{ key, label }] }] }` to a secured Owner with `Cache-Control: no-store`. New role grants and employee overrides accept only supported exact keys; existing unknown historical grants remain visible/revocable and flagged for review. The Settings pickers use the same shared catalogue.

**PROPOSED V1:** effective-access explanation and a preview of affected scope; no explanation endpoint is implemented by the catalogue change. A grid cell represents an actual rule/scope; it is not a universal checkbox across all branches. Saving reports the server result and refreshes current rules.

### Existing settings payload examples

```json
{
  "timezone": "Asia/Kolkata",
  "expectedVersion": 2,
  "reason": "Use the agreed studio scheduling timezone"
}
```

This payload is for `PUT /org/:id/timezone`. `PUT /org/teams/:id/waiting-alerts` instead takes `{ enabled, expectedVersion, reason }`. Presentation uses `expectedCreationPresentation`, not a fabricated integer settings version.

Notifications `PUT /notifications/preferences` takes `{ category, channel, enabled }`; quiet hours take `{ startLocal: "22:00", endLocal: "08:00", timeZone: "Asia/Kolkata" }`. Values shown here demonstrate shape and are not new Owner policy defaults. Existing preference response/channel/category contracts remain authoritative; the API does not take the entire panel as arbitrary JSON.

### Required Settings interactions

Each panel loads current values, edits a local draft, saves only its own supported fields and retains recoverable drafts on validation/network/conflict/fresh-sign-in failure. Cancel restores the loaded values. Role/permission changes show affected scope and required reason. Success appears only after server confirmation; no page-refresh-only fake save.

Do not show destructive reset, delete all data, automatic invite delivery, blanket permission cloning or silently permissive presets. Credential material, recovery codes, NAS paths and provider secrets do not appear in mock fixtures or screenshots.

## 8. Supporting tabs needed for a working V1

These preserve current workflows; redesigning every advanced module is not required for the first tab demo set.

| Tab | Backing structure / commands | Demo and integration rule |
| --- | --- | --- |
| Dashboard | `GET /dashboard`, `GET /dashboard/sources/:source`; existing authorized source services | Summary and next-action links; independent source errors; no invented performance/health scores or combined partial totals |
| Decisions | `GET /approvals/attention`, `/approvals/attention/:requestId`, `/approvals/actionable` | ApprovalRequest plus owning domain; there is **no generic approve-anything endpoint** in the inspected controller. Navigate using returned authorized context. |
| Notifications | `GET /notifications?cursor=...`, `PATCH /notifications/:id/read` | Own persisted inbox and authorized destination; a historical notice cannot confer current resource access |
| Internal reviews | `GET /reviews/inbox`, `/reviews/tasks/:taskId`; `POST /reviews/tasks/:taskId/reviewer`, `/submit`; `POST /reviews/rounds/:roundId/start`, `/comment`, `/decision`, `/correction`; owning completion command | Named independent reviewer, exact immutable round/revision/evidence; no generic status dropdown or self-approval |
| Client review/approval | Current staff `client-reviews` context and separate client portal | Independent client identity, exact item/revision and formal passkey approval; primary final authority; do not mix internal and client sessions |
| Documents/revisions | Documents/folders/upload chunks/finalize/stream; existing revision/issue/transmittal owners | Opaque file IDs, current Confidential/branch/project checks, no raw NAS links; formal issue is distinct from upload/review |
| Time/Workforce/Learning | Existing owning workspaces/read ports | Preserve scoped access and explicit schedule/policy configuration; no invented utilization or leave balances |
| Turnkey/Site | Existing source services and permissions, linked from project Delivery | Include only when actual pilot scope/gates support it; cost visibility, independent snag verification and handover remain distinct |

## 9. Shared demo fixtures and behavior tests

Use one synthetic organization and two branches so denied cross-branch cases are visible. Keep stable IDs when handing over separate tab demos. Suggested UUID namespaces (DEMO ONLY): Accounts `10000000-0000-4000-8000-...`, Employees `20000000-0000-4000-8000-...`, Projects `30000000-0000-4000-8000-...`, Tasks `40000000-0000-4000-8000-...`, review rounds `50000000-0000-4000-8000-...`, approval requests `60000000-0000-4000-8000-...`. Store full valid UUIDs, not truncated labels.

Freeze demo “today” at **2026-10-15 in Asia/Kolkata** and use date-only Targets; retain ISO offset timestamps for approval expiry. Do not let examples silently change when the browser date changes.

| Scenario | What must be demonstrable |
| --- | --- |
| Owner without Employee | Personal queue empty, real management/review/decision obligations separate; cannot self-own a task |
| Manager in Branch A | Can assign permitted descendants/current project participants; cannot manage Branch B employee/permission bundle by title |
| Ordinary employee | Creates self-task; gets assigned project task; assignment picker cannot confer new access |
| Named reviewer | Sees exact assigned round with approve/correction only when independent and eligible |
| Site person | Site-scoped work and genuine snags; no made-up upload count, office-wide people or protected costs |
| Cross-branch participant | Sees one explicitly assigned Branch B project and no neighboring project/employee records |
| Deadline cases | Overdue, today, future, Waiting and completed tasks; Target distinct from controlled Committed date |
| Subtask case | Parent with one unfinished real child cannot complete, checklist completion makes no difference |
| Review case | Required internal review → correction → resubmission → proper approval, then permitted completion |
| People lifecycle | Pending identity/enrollment, ready employee, suspension, exited employee history, waiting reassignment and held lead project |
| Errors | Empty/denied/loading/error/stale/conflict; permission changes while detail/form is open; failed/uncertain create |

Personas are separate synthetic test contexts. If a demo includes a fixture selector for review, keep it visibly outside the product shell and describe it as a **demo-only harness**; it must not be imported into the real UI. Never simulate authorization by downloading all personas' private data to a live client.

### DEMO MODEL service boundary

Use an injected mock object with Promise-based reads/commands, for example:

```ts
interface DemoApi {
  readSession(): Promise<InternalSession>;
  taskSetup(): Promise<TaskSetup>;
  listTasks(query: Record<string, string>): Promise<unknown>;
  taskDetail(id: string): Promise<unknown>;
  attention(query: Record<string, string>): Promise<AttentionPage>;
  createTask(input: Record<string, unknown>): Promise<unknown>;
  listProjects(query: Record<string, string>): Promise<unknown>;
  projectDetail(id: string): Promise<unknown>;
  people(context: Record<string, string>): Promise<unknown>; // PROPOSED read adapter
  settings(panel: string): Promise<unknown>;               // frontend grouping
}
```

This interface is illustrative, not a replacement for runtime validators or `@sense/contracts`. Real integration should use precise types, owning command methods and current payloads, not keep broad `Record`/`unknown` signatures. Keep mock data access out of click handlers/render functions so it can be replaced without rewriting the approved UI.

Every clickable control must perform a local mock action, navigate, open a contextual form, or explain a real restriction. After a successful mock create, update the shared task store once, derive permitted personal/project views from it, recalculate matching counts and open the new canonical task. Do not hard-code a success toast over static rows. After failure, preserve the form; after conflict, require refresh/review. Do not claim durable retries/persistence from in-memory demo state.

## 10. Contract gaps to record before integration

| Gap | Current boundary | Treatment |
| --- | --- | --- |
| Employee display name | No stored field in inspected Account/Employee schema | Proposed additive field + edit policy; explicit decision/migration review |
| Unified People/exited reads | Dedicated People UI and session-bound `/org/self` now in source; Owner list excludes exited and manager remains reporting descendants | Fuller scoped projection/detail/history design remains; no broadened staff directory by default |
| Permission catalogue/access explanation | Catalogue and supported-key new-grant validation now in source; existing evaluator unchanged | Effective-access explanation and its scoped read remain proposed; real persistence/UI acceptance remains open |
| Project Tasks embedding | Current section links to general list | Reuse task components/adapters; project context and same canonical IDs |
| Context-valid assignment choices | No-store `creation-options` now implements current project/non-project owner/collaborator checks | Writes independently reauthorize; persistence/concurrency and authenticated acceptance remain |
| Task form validation/review controls | Shared typed ordinary/subtask fields, existing limits and project review requirement now in source | Reviewer/evidence planning remains with owning workflows; non-project review choice and full acceptance remain |
| Create retry safety | Current ordinary task create strict input has no durable request key | Review existing patterns, design bounded receipt if required, then test actual replay/concurrency |
| New project filters/overview totals | Current query supports branch/q/stage/sort/direction only | Add approved backend projection/filter or omit unsupported control |
| Current feature acceptance | 118 migration directories in source; retained runtime/evidence boundaries differ | Prove exact current candidate on dedicated authorized targets; no inherited PASS |

No API listed as PROPOSED is approved for deployment by this document. Returned UI/workflow choices are reviewed against this register; implementing them requires their normal bounded source and data/authorization decisions.

## 11. Source map for integration

Verified source families: `apps/api/src/{identity,organization,task,project,my-work,review,client-review,document,notifications,approvals,dashboard}.controller.ts`; `authorization.service.ts`, `authorization.ts`, `organization.service.ts`, `task.service.ts`, `project.service.ts`, `project-workflow.service.ts`, `my-work.service.ts`, `task-creation-profile.ts`; `packages/contracts/src/my-work.ts`; `apps/api/prisma/schema.prisma`.

Existing web callers: `app.tsx`, `settings-homes.tsx`, `workspace-navigation.tsx`, `task.tsx`, `task-create-dialog.tsx`, `task-detail-drawer.tsx`, `actionable-work.tsx`, `my-work-attention.tsx`, `project.tsx`, `projects-route.tsx`.

This contract records current source and proposals. Initial preparation was read-only planning; subsequent implementation and exact source/unit/HTTP checks are in the linked delivery report. No migrations or live staff actions were performed in that delivery batch, and no whole-application acceptance or production readiness is claimed.

Planning authorship: the current Codex agent only; no delegated or independent Opus/Sonnet acceptance review was performed. No exact runtime model identifier is asserted without evidence.

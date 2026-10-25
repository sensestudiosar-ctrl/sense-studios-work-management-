# Sense task-creation panel: design-agent handoff

Prepared 2026-10-23 from current repository source. Purpose: create a UI demo that can be implemented in the existing application. This is a design handoff, not authorization to change domain rules, deploy, migrate data or build a replacement app.

## 1. Product and technical context

Sense Studios is an existing work-management monorepo. Organization structure is Organization → Branch → Team → Employee. Projects have one owning Branch; cross-branch participation requires explicit assignment. Owner and Staff are account kinds; Leader, Employee and Site are creation-presentation profiles, not independent access grants.

- `apps/web`: React 19, TypeScript, Vite, React Router. Existing CSS and shared components, no requirement to introduce a new UI framework.
- `apps/api`: NestJS 12 on Express 5, TypeScript, Zod request validation, Prisma 7 with PostgreSQL.
- `packages/contracts`: shared contracts/constants.
- Pinned runtime: Node 24.19.0, pnpm 11.19.0.
- Canonical local app: http://localhost:59443 . API uses the same-origin `/api/v1` prefix through the web server; internal staging API port is 59442.
- Current accepted retained schema: 120, including the additive task-review routing migration. Never apply migrations, seed or reset retained staging for a UI demo.
- A database-backed task creation transaction persists the task, eligible collaborators, audit/event evidence and an idempotency receipt where supplied. Review routing authorization is also recorded when applicable.

Use the current Sense pine/paper visual language: dark pine primary actions, restrained status colours, light paper surfaces, readable text and clear field hierarchy. The demo may improve composition and interaction but must map to existing fields and rules below.

## 2. Existing integration points

Paths are relative to `D:\app\sensestudios work management app`:

| File | Responsibility |
|---|---|
| `apps/web/src/task.tsx` | TaskWorkspace: opening/closing, draft state, role presentation, commands, duplicate-safe recovery, capacity acknowledgement, success refresh/selection |
| `apps/web/src/task-create-dialog.tsx` | Native modal wrapper, focus/scroll lifecycle, Escape/close requests, submit keyboard shortcut, sticky header/footer |
| `apps/web/src/task-create-dialog.css` | Responsive creation surface styling |
| `apps/web/src/task-composer-fields.tsx` | Shared task/subtask fields, field validation, participant choices, payload mapping |
| `apps/web/src/task-creation-options.ts` | Reads current authorized participant options for selected context; loading, denial and retry |
| `packages/contracts/src/task-creation.ts` | Participant/options response contract |
| `packages/contracts/src/index.ts` | `TASK_DESCRIPTION_MAX_LENGTH = 2000` |
| `apps/api/src/task.controller.ts` | HTTP validation, session/origin/CSRF enforcement |
| `apps/api/src/task.service.ts` | Creation, eligibility, access, project rules, persistence/audit and retry receipts |
| `apps/api/src/task-creation-profile.ts` | Resolves presentation from existing account/configured job roles |
| `apps/api/src/task-create-identity.ts` | Canonical creation payload identity/hash |

Task creation is shared by My Work, Tasks and Project Tasks. Subtask fields reuse the composer inside task details. Keep one implementation; do not create separate role-specific applications or parallel persistence.

## 3. Role and surface variants

| Variant | Current heading | Behavior to preserve |
|---|---|---|
| OWNER | Create or assign a task | May select eligible employee; Owner without linked employee must explicitly select primary owner. Expanded optional planning/collaboration available. |
| LEADER | Assign work | Self or authorized assignment as permitted by server; expanded planning/collaboration. Never assume all employees are assignable. |
| EMPLOYEE | Create my task | Personal quick capture; optional planning/collaborator sections currently compact/hidden. Assignment only if server explicitly permits it. |
| SITE | Create site work | Compact quick capture with the same server-authorized project and participant rules. |

Creation profile comes from `GET /tasks/setup`; it is presentation only. `canAssign`, `canCreate`, `actorEmployeeId`, `owners` and `collaborators` from creation-options control actual available choices. Do not infer authorization from a title or variant.

Current desktop creation is a centered modal up to about 760px with a scrollable body and persistent actions. Phone presentation is responsive. The new demo can propose a side panel, but must show all four variants, a narrow phone layout and scrolling with actions reachable. Native dialog focus containment, background scroll lock, trigger focus restoration and unsaved-draft close guard must survive implementation.

## 4. Fields and validation

| UI field | API key | Required / constraints |
|---|---|---|
| Task name | `title` | Required, trimmed 2–160 characters |
| Type | `type` | Required: PROJECT, NON_PROJECT, RECURRING, CORRECTION, SITE, TRAINING_PRACTICAL |
| Priority | `priority` | Required: LOW, MEDIUM, HIGH, CRITICAL; current initial value MEDIUM |
| Target date | `targetDate` | Required valid `YYYY-MM-DD`; planned target, not committed due date |
| Project | `projectId` | Eligible UUID; required for PROJECT/CORRECTION/SITE; forbidden for NON_PROJECT |
| Primary owner | `ownerEmployeeId` | Eligible Employee UUID; omitted for ordinary self-assignment; required explicitly if actor has no linked employee |
| Description | `description` | Optional, trimmed maximum 2,000 characters |
| Reason | `reason` | Required, trimmed 3–1,000 characters; recorded in history |
| Start date | `startDate` | Optional valid date, on or before target |
| Estimated hours | `estimatedHours` | Optional number 0–100,000; blank differs from explicit zero |
| Stage or milestone | `planItemId` | Optional existing plan item belonging to selected project |
| Tags | `tags` | Optional maximum 10 distinct strings, each 1–30 characters |
| Checklist | `checklist` | Optional maximum 10 `{label, checked}` entries; label 1–120 chars |
| Collaborators | `collaborators` | Maximum 30 distinct eligible Employees; primary owner cannot also be a collaborator |
| Collaborator hours | `collaborators[].estimatedHours` | Optional 0–100,000 per collaborator |
| Review requirements | `reviewRequirement` | NONE, INTERNAL, BOTH; legacy CLIENT input is normalized to BOTH |

Current tags input splits commas. Current checklist input splits lines and supports `[x]`/`[ ]`; a nicer tag/chip/checklist editor may still emit the same arrays. Do not add unpersisted mandatory fields such as Brand, Department, budget, reviewer, files or custom recurrence rules without identifying them as proposals.

Important date distinction: the current checkout includes a browser-date minimum on Target input, while shared validation and API do not establish that as a new past-date policy. Do not turn that presentation hint into a new business rule. Do not auto-fill target, effort or organization policy numbers from the demo. Recurrence configuration, committed-date changes, dependencies, file uploads and review submission have separate workflows; selecting RECURRING alone is not permission to invent a schedule builder.

## 5. Read APIs

All examples use `/api/v1` prefix. Reads use `credentials: include`, `cache: no-store`.

### GET `/tasks/setup`

Provides current actor employee, visible projects, plan items, authorized employee context, canAssign and creationProfile. Project choices contain id/title/status/branchId and existing closeout authority metadata. Creation selects only DRAFT/ACTIVE projects. The project-scoped entry fixes the project instead of allowing reassignment.

### GET `/tasks/creation-options?projectId=<uuid>`

Omit query for non-project context. This is the authoritative eligible-participant source; do not populate owners from a global employee directory.

```ts
type TaskCreationPerson = { id: string; name: string; homeBranchId: string };
type TaskCreationOptions = {
  actorEmployeeId: string | null;
  project: { id: string; title: string; status: string } | null;
  canAssign: boolean;
  canCreate: boolean;
  owners: TaskCreationPerson[];
  collaborators: TaskCreationPerson[];
  readAt: string;
};
```

The hook validates that returned project matches current selection and ignores old async responses. Project changes clear owner, collaborators, collaborator hours and plan item; removing project clears project review settings. It also reconciles type PROJECT/NON_PROJECT. Preserve these resets and explain them to the user.

Backend filters active employees/accounts in the organization. Project participants require current project eligibility; staff assignment requires existing assignment authority and allowed reporting/project relationships. Only DRAFT/ACTIVE projects accept ordinary new delivery work. Options may become stale, so the create command rechecks everything.

## 6. Create API and payload

### POST `/tasks`

Cookie-authenticated same-origin command. Set `Content-Type: application/json`, `X-CSRF-Token` from current authenticated session, and `credentials: include`. Browser supplies Origin. Never embed a token, credential or production database URL in the demo.

```json
{
  "idempotencyKey": "<request-uuid>",
  "title": "Prepare ground-floor layout",
  "type": "PROJECT",
  "priority": "MEDIUM",
  "targetDate": "2026-11-06",
  "projectId": "<eligible-project-uuid>",
  "ownerEmployeeId": "<eligible-employee-uuid>",
  "description": "Coordinate the entrance and circulation layout.",
  "startDate": "2026-11-02",
  "estimatedHours": 6,
  "planItemId": "<project-plan-item-uuid>",
  "tags": ["Layout"],
  "checklist": [{ "label": "Check room dimensions", "checked": false }],
  "collaborators": [{ "employeeId": "<other-eligible-employee-uuid>", "estimatedHours": 2 }],
  "reviewRequirement": "INTERNAL",
  "reason": "Prepare the layout for design coordination."
}
```

Angle-bracket IDs are placeholders, not runnable UUIDs. Omit unused optional properties. API schema is strict and rejects unknown keys. Success is a created task object, including `id`; existing UI closes/resets the form, refreshes data and selects/opens that task according to entry context.

### POST `/tasks/:parentTaskId/subtasks`

Same creation body plus `expectedParentVersion` (positive integer). Parent/context eligibility and concurrency are checked. Subtasks stay in the parent's project and do not recursively create arbitrary nested children. Closeout tasks have a separate approval endpoint and must not be offered as an ordinary type.

## 7. Critical workflow states

Show these in the demo, not only the happy path:

1. Loading eligible participants: retain draft, disable creation until ready.
2. No eligible owner / creation forbidden: explain, do not invent a person or silently switch scope.
3. Participant read failure: preserve draft with Retry participants.
4. Invalid submit: inline errors and focusable summary linking to exact controls, including collapsed sections.
5. Creating: prevent duplicate clicks; preserve payload while pending.
6. Capacity conflict: backend responds 409 overload warning; show explicit acknowledgement before retry with `acknowledgeOverload: true`. Never auto-acknowledge.
7. Unknown outcome (network failure/5xx): submitted fields lock, remain visible, show **Check creation result**. Replay the same body/idempotency key; never silently generate a new request.
8. Authorization/stale context conflict: preserve draft, refresh legitimate choices; never bypass backend denial.
9. Unsaved close/navigation: preserve the existing confirmation guard. Busy/uncertain commands cannot be discarded as if nothing happened.
10. Success: clear only the successful draft and provide task-created confirmation with the existing task selection behavior.

Idempotency is server-backed: actor/organization/key/payload identity is checked transactionally; reusing a key for changed details conflicts. Do not replace this with a frontend-only disabled button.

## 8. Review behavior to preserve

Internal and client review settings are selected at task creation and immutable afterward. Client review implies internal approval, requires a project and current client-publishing authority. The backend normalizes CLIENT to BOTH and records routing authorization. Do not offer a bypass or promise that an arbitrary employee can enable client delivery.

Work is submitted for review later with file/link evidence; creation is not submission. Independent internal approval precedes authorized automatic client delivery. Final Primary Client approval is what surfaces exact evidence in Projects → Documents → Confirmed drawings. The demo must not mark a task approved, completed or client-delivered merely because it was created.

## 9. Requested demo deliverables

- One self-contained HTML/CSS/JS demo, or clearly organized source folder, using synthetic labeled data only.
- Owner, Leader, Employee and Site states; self versus explicit assignment; project-fixed and non-project contexts; subtask variant.
- Desktop around 1440 and 1024, compact desktop 783, phones 390 and 320; no horizontal overflow; long project/person/task names and large collaborator lists.
- Complete field inventory and realistic loading, error, empty, capacity, submitting, uncertain-outcome and success states.
- Keyboard and screen-reader names, logical focus order, Escape/close behavior, 44px controls, visible focus, sticky actions with independently scrolling body.
- A short field-to-API mapping and list of intentional visual changes. Label any proposed new behavior separately for Owner decision.

The implementation agent must preserve existing business rules, tests and real records, update existing `apps/web` routes/components, and verify against the approved requirements. UI demos are not backend source of truth.

## 10. Tests and release boundary

Relevant tests: `apps/web/src/task-create-dialog.test.tsx`, `task-composer-fields.test.tsx`, `task-creation-options.test.tsx`, `task-creation-flow.test.tsx`, `project-task-context.test.tsx`; API `task.controller.api.spec.ts`, `task-creation-options.unit.spec.ts`, `task-create-receipt.unit.spec.ts`, `task.database.api.spec.ts`, `task-subtask-commit.database.api.spec.ts`; authenticated `tests/e2e/task.spec.ts` plus task-review tests.

Run appropriate typecheck/lint/unit/build and isolated real persistence/browser checks before acceptance; do not claim unrun checks. Use dedicated disposable databases only. Preserve current unrelated work. Only explicitly selected reviewed commits may be built/deployed to canonical staging; no automatic retained migrations. No production/NAS/hosted-CI acceptance is implied by a design demo.

At preparation, source checkout contains newer task-composer work than deployed staging, plus unrelated Time edits. Read the actual files before implementing; do not overwrite them based on an older screenshot. The dashboard-context-panel change is a separate IN PROGRESS task, not part of this creation demo.

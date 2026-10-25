# 02 — Existing API / domain / state contract

> Derived from the original repository handoff inspected 23 October 2026 and RC handoff 24 October 2026. **The implementing agent must verify these details against the current checked-out source.** If code differs, report and preserve actual backend invariants; do not assume this document authorizes changes.

## 1. Existing application / integration locations

- `apps/web`: React 19 + TypeScript + Vite + React Router; existing shared CSS/components.
- `apps/api`: NestJS 12 / Express 5 / Zod / Prisma 7 / PostgreSQL.
- `packages/contracts`: shared API contracts.
- Runtime observed in initial handoff: Node 24.19.0, pnpm 11.19.0.
- Originally recorded local canonical app `http://localhost:59443`; same-origin API `/api/v1` (internal API staging 59442). **Confirm these before running or deploying.**
- Original repo source path recorded as `D:\app\sensestudios work management app`, but do not hardcode absolute paths into implementation.

## 2. Read APIs and authority

| Endpoint | Request | Response / requirement |
|---|---|---|
| `GET /api/v1/tasks/setup` | Cookie session, `credentials: 'include'`, `cache: 'no-store'` | Actor, available projects, valid plan items, `canAssign`, presentation profile and context. The profile is not a permission grant. |
| `GET /api/v1/tasks/creation-options?projectId=<uuid>` | Same credentials + no-store; omit project query for personal task | Authoritative eligible primary owners and collaborators for chosen scope. Check returned project matches selected ID, ignore stale async results. |

Last observed creation-options shape:

```ts
type TaskCreationPerson = {
  id: string;
  name: string;
  homeBranchId: string;
};
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

Do not populate assignees from an unrestricted organization directory. Cross-branch participation, active employee/account status, reporting relationships, valid project status and actor permissions are enforced server-side and must be reconciled on context changes. Project-scoped entry fixes project. Creation normally targets DRAFT/ACTIVE projects per current backend rules.

## 3. Create API

`POST /api/v1/tasks` — existing cookie-authenticated same-origin command. Set `Content-Type: application/json`, current `X-CSRF-Token` header via existing auth layer, and `credentials: 'include'`. Rely on existing origin/CSRF/session handling. Do not store secrets in code.

Supported fields (re-verify current Zod schema):

| Display | JSON key | Value / rules |
|---|---|---|
| Task Name | `title` | required trimmed length **2–160** |
| Task Type | `type` | `PROJECT`, `NON_PROJECT`, `RECURRING`, `CORRECTION`, `SITE`, `TRAINING_PRACTICAL` |
| Priority | `priority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`; initial `MEDIUM` |
| Target Date | `targetDate` | required valid ISO calendar date `YYYY-MM-DD` |
| Project | `projectId` | eligible UUID; required for PROJECT/CORRECTION/SITE, forbidden for NON_PROJECT |
| Main assignee | `ownerEmployeeId` | valid eligible Employee UUID where explicit owner required; may be omitted for authorized self-assignment |
| Description | `description` | optional trimmed max 2000 |
| Reason | `reason` | required trimmed length 3–1000; logged in history |
| Start Date | `startDate` | optional date `YYYY-MM-DD`; must not exceed target |
| Estimated effort | `estimatedHours` | optional 0–100000; **omitted blank != explicit zero** |
| Stage/Milestone | `planItemId` | optional eligible plan item within selected project |
| Tags | `tags` | optional up to 10 unique strings length 1–30 |
| Checklist | `checklist` | optional up to 10 `{label, checked}` objects; label length 1–120 |
| Collaborators | `collaborators` | optional up to 30 distinct eligible employees, not including primary |
| Collaborator effort | `collaborators[].estimatedHours` | optional 0–100000 |
| Review route | `reviewRequirement` | `NONE`, `INTERNAL`, `BOTH`; legacy `CLIENT` normalized to `BOTH` |
| Idempotency | `idempotencyKey` | UUID identifying identical payload command/recovery |
| Capacity acknowledgement | `acknowledgeOverload` | only when explicitly acknowledged after real 409 response and current server accepts it |

Example structure (placeholders are NOT actual IDs):

```json
{
  "idempotencyKey": "<new-request-uuid>",
  "title": "Prepare kitchen working drawings",
  "type": "PROJECT",
  "priority": "MEDIUM",
  "targetDate": "2026-11-06",
  "projectId": "<authorized-project-uuid>",
  "ownerEmployeeId": "<authorized-primary-employee-uuid>",
  "description": "Prepare approved kitchen plans and details.",
  "reason": "Required for execution coordination.",
  "startDate": "2026-11-02",
  "estimatedHours": 6,
  "planItemId": "<valid-project-milestone-uuid>",
  "tags": ["Working drawings"],
  "checklist": [
    { "label": "Check dimensions", "checked": false }
  ],
  "collaborators": [
    { "employeeId": "<authorized-collaborator-uuid>", "estimatedHours": 2 }
  ],
  "reviewRequirement": "INTERNAL"
}
```

**Omit unused optional properties.** The strict server rejects unknown keys. In particular, do not include `reviewerId`, `clientReviewerId`, `recurrenceFrequency`, `weekdays`, file arrays, comments or synthetic view state without an explicitly approved schema and backend implementation.

## 4. Ordered Assign to → API mapping

```
selectedPeople = [P0, P1, P2, ...]
P0 -> ownerEmployeeId (or authorized implicit self-assignment)
P1.. -> collaborators: [{employeeId: Px.id, estimatedHours?: n}]
```

- Keep people unique, ensure eligible main owner belongs to `owners`, and every collaborator belongs to eligible `collaborators`. Someone eligible only for collaboration is **not automatically eligible to become main**; disable promotion with an explanation instead of bypassing the server.
- Changing project triggers new authorized options; reconcile/clear invalid selected assignees, collaborator hours and plan item; remove forbidden project review selection. Preserve title/description/reason drafts where compatible.
- Main is the *first item* after a permitted reordering. If actor has no `actorEmployeeId`, an explicit eligible primary is required.
- No multi-owner back-end model is introduced. UI only describes primary owner + collaborators.

## 5. Parent and subtask persistence

Parent: `POST /api/v1/tasks`, gets a created `id` and version according to actual response. Child: `POST /api/v1/tasks/:parentTaskId/subtasks` using the corresponding supported creation body **and** positive `expectedParentVersion`. After each successful child, get the newest parent version before the next; handle 409 concurrent parent version conflicts without silently overwriting. Child belongs to parent's context; no unlimited nesting. Staged subtask drafts are never appended to the parent's strict JSON body. Each child has independent command identity and result state.

Checklist differs: `checklist[]` is included with parent creation, not separate subtask commands. Files, comments/discussion and review evidence are independent post-create actions. If parent succeeded but optional operations did not, never show an all-or-nothing failure or re-create the parent.

## 6. Review / recurrence boundaries

- The supported `reviewRequirement: BOTH` implies internal before client. Client delivery requires current authorized publishing rights and project context. Routing is immutable after creation as documented. Task creation ≠ submitted for review, approved, client-delivered or completed.
- The approved visual demo has **named internal/client reviewer selection**. Current strict create contract does not document persisting reviewer IDs. Keep control feature-gated until real eligibility/read, persistence, audit, lifecycle and server authorization exist.
- The demo has **recurrence frequency/interval/weekday** controls. Current contract documents the `RECURRING` task type only, not its schedule. Same feature-gate requirement. Do not show settings as successfully configured unless a committed readback supports them.

## 7. Finite state / recovery matrix

| State | Visible behaviour | Request / integrity rule |
|---|---|---|
| Setup/options loading | Loading context, disable create, draft remains editable when safe | `no-store`, ignore late response to older project |
| No eligible owner / forbidden | Context-specific explanation, retry/reselect only authorized option | no fabricated option |
| Options fetch error | Non-destructive retry, preserve draft | do not re-use stale eligible list silently |
| Invalid | First-error focus, inline errors, expand hidden settings, summary if multiple | no create request |
| Submitting | Pending indicator and disabled duplicate submit/edit, submitted payload snapshot | one command identity |
| 409 capacity | Explain workload warning and require explicit acknowledgement | authorized payload update, appropriate fresh idempotency identity |
| 401/403/stale | Explain denial; refresh eligibility and clear invalid choices | never retry as escalated role |
| network/5xx uncertain | Clearly state uncertain, lock submitted snapshot; “Check creation result” | replay *identical* body and same key as existing receipt protocol |
| Confirmed success | Open actual created task, refresh affected list and clear only successful draft | server-provided ID |
| Parent succeeded / child or file failed | Show parent success and per-item retry with receipt | do not create duplicate parent |
| Close/navigation with edits | Unsaved confirmation | avoid lost changes and respect busy/uncertain state |

Draft caching from standalone RC uses `sessionStorage` only as a synthetic UX example, **not an authorized production design**. Reuse secure draft state already in `task.tsx`; if persistence is desired, document expiry/account/organization isolation and receive security approval before introducing it.

## 8. Existing tests/files (verify they exist now)

Web: `task-create-dialog.test.tsx`, `task-composer-fields.test.tsx`, `task-creation-options.test.tsx`, `task-creation-flow.test.tsx`, `project-task-context.test.tsx`.
API: `task.controller.api.spec.ts`, `task-creation-options.unit.spec.ts`, `task-create-receipt.unit.spec.ts`, `task.database.api.spec.ts`, `task-subtask-commit.database.api.spec.ts`, plus review API unit/integration tests.
Browser: `tests/e2e/task.spec.ts` and review flows.

The canonical source checkout contained newer composer changes than deployed staging on 2026-10-23; **audit current commits before selecting a test server**. Do not trust that a running port reflects the latest branch.

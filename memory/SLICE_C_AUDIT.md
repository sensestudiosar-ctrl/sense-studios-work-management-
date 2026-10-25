---
name: slice-c-audit
description: Access audit — all guards, permission keys, scopes, workflow conditions
metadata:
  type: project
---

# Slice C — Access Audit Findings

Read-only audit of `apps/api/src/` plus the contracts catalogue and the three
authorization files. No code was changed.

## Architecture in one paragraph

There is **no `@UseGuards()` anywhere in `apps/api/src/`** — zero matches for
`@UseGuards`, `@Roles`, `@Authenticated`, `CanActivate`. Authorization is done
entirely inside handler bodies. A single global guard (`APP_GUARD`, registered
in `apps/api/src/app.module.ts:131`) is the only Nest guard, and it only
resolves the session — it **always returns `true`** (`apps/api/src/auth.guard.ts:19-26`),
even when `identity.session()` throws. The real enforcement is (a) the
`identity.session()` call itself, which throws `UnauthorizedException` when the
cookie is missing/invalid/expired/idle/re-suspended, and (b) per-request
`assertPermission()` calls inside services. Controllers opt out of the global
guard with `@PublicRoute()` (`apps/api/src/auth.guard.ts:9,20`).

`AuthGuard` reads the cookie name from config (`__Host-sense_sid` for https,
else `sense_sid`) and calls `this.identity.session(...)`. It **discards the
result**; every controller re-derives the session independently with its own
private `cookie()` helper and its own `identity.session()` call. That is a
double read of the same session per request, not a security gap by itself.

---

## Permission Catalogue (from `packages/contracts/src/permissions.ts`)

51 keys in 13 groups. Full list, verbatim:

**People**
- `org.employee.read` — View managed employees
- `org.employee.manage` — Manage reporting relationships
- `employee.manage` — Employee oversight for delivery and evidence

**Projects**
- `project.view` — View assigned projects
- `project.manage` — Manage project delivery
- `project.plan_complete` — Complete project plan items
- `project.gate_override` — Override project completion gates with a reason
- `project.scope_request` — Request project scope changes
- `project.scope_decide` — Decide scope changes as the named approver
- `project.cancellation_request` — Request project cancellation
- `project.closeout_approve` — Approve scoped closeout work

**Templates**
- `template.view` — View project templates
- `template.manage` — Manage project templates

**Tasks and reviews**
- `task.assign` — Assign tasks within current scope
- `task.deadline_change` — Change committed task deadlines
- `review.decide` — Decide assigned internal reviews

**Documents**
- `document.view` — View permitted project documents
- `document.upload` — Upload project documents
- `document.manage` — Manage document revisions
- `document.issue` — Issue approved document revisions
- `document.client_review_select` — Select revisions for client review

**Client and external workflows**
- `client.review_manage` — Manage client review packages
- `client.revision_classify` — Classify client revision requests
- `client.correction_assign` — Assign client correction work
- `external.manage` — Manage scoped external portal access

**Leads**
- `lead.view` — View leads
- `lead.create` — Create leads
- `lead.edit` — Edit leads
- `lead.activity_create` — Record lead activity
- `lead.stage_change` — Change lead stages with a reason
- `crm_source.manage` — Manage lead sources

**Time and workforce**
- `time.manage` — Manage scoped time records
- `workforce.manage` — Manage scoped workforce records

**Skills and training**
- `skills.view` — View scoped skill profiles
- `skills.manage` — Manage scoped skill changes
- `training.view` — View permitted training
- `training.manage` — Manage scoped training

**Knowledge library**
- `library.view` — View permitted library content
- `library.manage` — Manage scoped library content

**Performance, reports and automation**
- `performance.view` — View permitted performance evidence
- `performance.manage` — Manage scoped performance workflows
- `report.manage` — Manage personal saved reports within current scope
- `automation.manage` — Manage permitted automation rules

**Turnkey delivery**
- `turnkey.view` — View permitted Turnkey delivery
- `turnkey.manage` — Manage Turnkey delivery
- `turnkey.cost_view` — View protected Turnkey costs
- `turnkey.cost_approve` — Decide costs as the named approver
- `turnkey.procurement_approve` — Decide procurement as the named approver

**Site delivery**
- `site.view` — View assigned site delivery
- `site.work` — Submit permitted site work
- `site.manage` — Manage scoped site delivery

Catalogue header comment (`permissions.ts:1`): "Keys consumed by current
owning-domain policies. Job titles never imply these grants."
`isKnownPermissionKey` (`permissions.ts:86-88`) validates new configuration
only, against the same set.

**Key coverage.** All 51 keys have at least one production `assertPermission`
caller (verified by filename, excluding `*.spec.ts` and
`s18-test-fixture.ts`). No catalogue key is grant-only.

Five keys are asserted in exactly one file — `project-workflow.service.ts`:
`project.plan_complete`, `project.gate_override`, `project.scope_request`,
`project.scope_decide`, `project.cancellation_request` (all via the shared
`assertProjectScope` helper at `project-workflow.service.ts:75`, which resolves
the key from the action). Single-file keys elsewhere:
`document.manage` → `document.service.ts`; `document.issue` →
`revision.service.ts`; `library.manage` → `library.service.ts`;
`site.work` and `site.manage` → `site.service.ts`.

`library.view` is the only key asserted in two unrelated domains
(`library.service.ts:145` and `training.service.ts:57,63`) — training
audience checks delegate to the library read permission.

---

## Guard Map

**`@UseGuards()` — none.** No controller, handler, or method in
`apps/api/src/` uses `@UseGuards`. Enforcement is in-body.

### Global guard (the only Nest guard)

| Guard | Registration | What it checks |
|---|---|---|
| `AuthGuard` (`auth.guard.ts:11-27`) | `app.module.ts:131` `{ provide: APP_GUARD, useClass: AuthGuard }` | Skips entirely when the handler/class carries `@PublicRoute()` metadata. Otherwise reads the session cookie (`__Host-sense_sid` on https, else `sense_sid`) and calls `identity.session()`. **Always `return true`** — the call's side effect (throwing `UnauthorizedException`) is the only enforcement. |

### `@PublicRoute()` opt-outs (24 occurrences, 11 controllers)

These bypass the global guard entirely, so the handler is solely responsible
for its own authentication:

| Controller | Lines | Notes |
|---|---|---|
| `client-portal-identity.controller.ts` | 24, 111, 122, 134, 154, 167, 176, 188, 198 | External client-portal login/registration/recovery |
| `client-portal-review.controller.ts` | 32 | Client portal review |
| `client-portal-scope.controller.ts` | 20 | Client portal scope |
| `external-portal-identity.controller.ts` | 18, 81, 92, 104, 117, 130, 139 | External portal identity |
| `external-portal.controller.ts` | 29 | External portal |
| `gallery.controller.ts` | 56, 76 | Portfolio/gallery |
| `health.controller.ts` | 9 | Health probe |
| `identity.controller.ts` | 83, 92, 104, 113, 124, 199, 207, 268, 277 | Passkey bootstrap/login/recovery/invitations |
| `integration.controller.ts` | 98, 161 | Integration endpoints |
| `turnkey.controller.ts` | 49 | Turnkey (client-facing subclass) |

### Per-controller in-body identity gates (the real "guards")

Every non-public controller repeats the same private helper pattern. Named
variants observed:

| Pattern | Controllers | What it checks |
|---|---|---|
| `private async actor(request)` → `identity.session()` + `projects.actor()` + `ownerReady` | `task.controller.ts:50`, `review.controller.ts:71-76`, `my-work.controller.ts:20` | Session valid; actor is OWNER/STAFF; if OWNER, `ownerReady()` (≥2 passkeys + ≥1 acknowledged recovery code) |
| `private async mutate(request, csrf)` → origin check + `actor()` + `verifyCsrf` | `task.controller.ts:51`, `review.controller.ts:78-83` | `headers.origin === config.webOrigin`; CSRF token constant-time match |
| `private async owner(request)` → kind + `ownerReady` | `organization.controller.ts:74-80` | `account.kind === "OWNER"` and `ownerReady` |
| `private async mutation(request, csrf)` → origin + owner + csrf + **5-minute session age** | `organization.controller.ts:82-90` | All of the above **plus** `session.createdAt + 5 min <= Date.now()` → "Sign in again before changing organization access" |
| `private async staffMutation(request, csrf)` → origin + kind + csrf + 5-minute age | `organization.controller.ts:92-101` | `account.kind === "STAFF"`, same 5-minute freshness gate |
| `identity.session()` inline | `approvals.controller.ts:20,30,42`, `audit-retention.controller.ts:55`, `automation.controller.ts:31`, `crm.controller.ts:28`, `dashboard.controller.ts:27`, `document.controller.ts:22`, `performance.controller.ts:23`, `project-template.controller.ts:37`, `project.controller.ts:31`, `library.controller.ts:22`, `gallery.controller.ts:25,42`, `integration.controller.ts:43`, `notifications.controller.ts:35`, `client-review.controller.ts:43`, `ai-assistance.controller.ts:19`, `identity.controller.ts` (×12), `external-access.controller.ts:49`, `client-portal-access.controller.ts:28`, `client-portal-identity.controller.ts:72,181,192,202`, `client-portal-scope.controller.ts:23-26`, `client-portal-review.controller.ts:48-50`, `external-portal-identity.controller.ts:108,133,144`, `external-portal.controller.ts:44-46` | Varies — see the controllers themselves |

**Origin check inconsistency**: `task.controller.ts:51` and
`review.controller.ts:79` check `request.headers.origin !== this.config.webOrigin`
on every mutation. Most other controllers (`automation`, `crm`, `document`,
`performance`, `project-template`, `library`, `gallery`, `dashboard`,
`project`, `client-review`, `ai-assistance`, `time`, `workforce`, `site`,
`skills`, `training`, `turnkey`, `revision`, `task-recurrence`) do **not**
check `Origin` — they rely on CSRF alone. Worth noting as an inconsistency, not
necessarily a defect (CSRF token is the stronger control).

**CSRF check**: `IdentityService.verifyCsrf` (`identity.service.ts:263-267`)
does a constant-time compare of the token **and** a second `digest(token) !==
session.row.csrfTokenHash` check. Both must pass.

---

## Permission Assertions

90 `assertPermission` / `evaluatePermissions` call sites in production code
(excluding `authorization.service.ts` itself and specs). All go through
`AuthorizationService.assertPermission` (`authorization.service.ts:11-14`),
which evaluates exactly one check and throws `ForbiddenException("Permission
denied")` on default-deny.

### Evaluator (`authorization.service.ts:16-64` + `authorization.ts:63-85`)

Resolution order:
1. Load account + employee + active job-role assignments (`effectiveTo: null`,
   `jobRole.active: true`, permissions `revokedAt: null`) + non-revoked,
   non-expired employee overrides (`authorization.service.ts:24-36`).
2. Account must exist and be `ACTIVE`, else **all checks false**
   (`authorization.service.ts:37`).
3. Organization must resolve (employee's org, else first org), else all false
   (`:38-40`).
4. `hasPermission` (`authorization.ts:63-85`):
   - `requestedScope.organizationId !== context.organizationId` → false (`:69`)
   - **`context.owner` → `true` immediately** (`:70`). The Owner bypasses every
     key and every scope check, subject only to the org match above.
   - Employee must be present, `state === "ACTIVE"`, same org (`:73`)
   - **DENY overrides beat everything** (`:80`) — a matching expired-override
     is filtered at `:77`
   - matching ALLOW override → true (`:81`)
   - else any matching role rule (`:83-84`)

Scope containment (`authorization.ts:39-60` `containsScope`): cross-org false;
TEAM/SELF requests require `requested.branchId === employee.branchId`; SELF
requires `requested.teamId === employee.teamId`. `ORGANIZATION` grants match
any scope. `BRANCH` grants require the employee to sit in that branch, the
request to target that branch, and (for SELF) `requested.employeeId ===
employee.id`. `TEAM` grants require the employee to sit in that team and the
request to target that team (or SELF on self).

### Assertion inventory

| Service | Line | Key | Scope kind | Condition |
|---|---|---|---|---|
| `project.service.ts` | 26 | `project.view` | BRANCH (project.branchId) | `reportContext`: staff must have explicit non-revoked `projectAssignment` and (same home branch **or** `crossBranchAuthorized`) |
| `project.service.ts` | 48 | `project.view` | BRANCH | `integrationContext`: same assignment rule |
| `project.service.ts` | 49 | `project.manage` | BRANCH | `integrationContext(manage=true)` — same, plus manage key |
| `project-workflow.service.ts` | 75 | key varies | BRANCH | `assertProjectScope` — resolves key from action |
| `project-workflow.service.ts` | 90, 91 | `project.manage`, `project.view` | BRANCH | checks a *third-party* `employee.accountId` |
| `project-workflow.service.ts` | 106 | `project.view` | BRANCH | branch-by-branch capability probe (catch → skip) |
| `project-workflow.service.ts` | 174 | `project.view` | BRANCH | third-party employee |
| `project-template.service.ts` | 36, 70, 93 | `template.view` / `template.manage` | ORGANIZATION | after `activeActor` |
| `task.service.ts` | 90 | varies | BRANCH | project-scoped task authority |
| `task.service.ts` | 104 | `task.assign` | BRANCH | project assignee check |
| `task.service.ts` | 108 | `task.assign` | TEAM | reassignment to another employee |
| `task.service.ts` | 132 | `task.deadline_change` | BRANCH | committed-date change, project path |
| `task.service.ts` | 135 | `task.deadline_change` | TEAM | committed-date change, owner path |
| `task.service.ts` | 167 | `project.view` | BRANCH | third-party (owner employee) |
| `task.service.ts` | 174, 265 | `task.assign` | TEAM | manager-of-target check |
| `task.service.ts` | 209, 277, 306 | `task.assign` | BRANCH / TEAM | reassign/collaborator paths |
| `task.service.ts` | 254, 1118 | `project.closeout_approve` | BRANCH | closeout approval (also used as a capability probe) |
| `task.service.ts` | 622 | `task.assign` | BRANCH | task create on project |
| `task.service.ts` | 624 | `project.manage` | BRANCH | closeout task creation |
| `task.service.ts` | 625 | `employee.manage` | BRANCH | closeout task creation |
| `review.service.ts` | 44 | `project.view` | BRANCH | review read on project |
| `review.service.ts` | 55, 56 | `project.manage`, `task.assign` | BRANCH | reviewer assignment |
| `review.service.ts` | 65, 66 | `project.view`, `review.decide` | BRANCH | third-party reviewer eligibility |
| `review.service.ts` | 448, 449, 450 | `project.manage`, `task.assign`, `task.deadline_change` | BRANCH | round priority/deadline change |
| `document.service.ts` | 45, 46 | `project.view` + varies | BRANCH | document read/write on project |
| `revision.service.ts` | 58, 59 | `project.view` + varies | BRANCH | revision register read/write |
| `client-review.service.ts` | — | `document.view`, `document.client_review_select` | BRANCH | client review package |
| `client-portal-scope.service.ts` | 85 | `project.view` | BRANCH | portal scope |
| `client-portal-scope.service.ts` | 86 | `client.review_manage` / `client.revision_classify` / `client.correction_assign` | BRANCH | mode-dependent, **skipped when `project.currentLeadEmployeeId === employee.id`** for the classify case |
| `external-portal.service.ts` | 49 | `project.view` | BRANCH | external portal staff |
| `external-portal.service.ts` | 50 | `project.closeout_approve` (closeout/cancelled) or `external.manage` | BRANCH | **skipped when `project.currentLeadEmployeeId === employee.id`** |
| `crm.service.ts` | 40 | `lead.view`/`create`/`edit`/`activity_create`/`stage_change` | BRANCH | per-branch key |
| `crm.service.ts` | 61, 67, 78 | `crm_source.manage` | ORGANIZATION | lead source management |
| `time.service.ts` | 44, 45, 47 | `time.manage`, `project.view`, `project.manage` | BRANCH | project time |
| `time.service.ts` | 51 | `time.manage` | TEAM | employee time |
| `time.service.ts` | 85, 91 | `project.view` | BRANCH | third-party / self |
| `time.service.ts` | 143 | `project.view` | BRANCH | capability probe (catch → skip) |
| `workforce.service.ts` | 52 | `workforce.manage` | TEAM | employee workforce |
| `workforce.service.ts` | 302 | `task.assign` | TEAM | staff task management; **also requires a non-revoked `projectAssignment`** when the task has a project |
| `workforce.service.ts` | 340 | `project.view` | BRANCH | same assignment rule |
| `workforce.service.ts` | 364 | `site.view` | BRANCH | site read |
| `workforce.service.ts` | 376 | `site.view` + `project.view` | BRANCH | third-party person |
| `performance.service.ts` | 39 | key varies | TEAM | employee performance |
| `performance.service.ts` | 45 | `project.view`, `performance.manage`, `project.manage` | BRANCH | project subject; `project.manage` only when `project.currentLeadEmployeeId !== self.id` |
| `performance.service.ts` | 51 | key varies | BRANCH | project performance |
| `skills.service.ts` | 46 | `skills.view` / `skills.manage` | TEAM | `manager()` — after same branch+team, then reporting-chain walk |
| `skills.service.ts` | 263 | `skills.view` / `skills.manage` | TEAM | `managerWithoutSession()` — same, without a live session |
| `training.service.ts` | 41, 57, 63 | `training.view`/`manage`, `library.view` | TEAM / BRANCH / ORGANIZATION | audience-dependent |
| `library.service.ts` | 145 | `library.view` / `library.manage` | ORGANIZATION | library read/write |
| `library.service.ts` | 370 | `template.manage` | ORGANIZATION | capability probe (catch → flag) |
| `library.service.ts` | 670, 683 | `template.manage` | ORGANIZATION | template write |
| `site.service.ts` | 112, 113, 114 | `project.view`, `site.view`, then the action key | BRANCH | site read/write |
| `site.service.ts` | 122 | `site.manage`, `project.manage`, `employee.manage` | BRANCH | site manage (all three required) |
| `turnkey.service.ts` | 61, 62 | `project.view` + action key | BRANCH | turnkey read/write |
| `turnkey.service.ts` | 70, 71, 72 | `project.manage`, `employee.manage`, `turnkey.cost_view` | BRANCH | turnkey manage; `cost_view` required when key ends `_approve` |
| `automation.service.ts` | 44 | `report.manage` | BRANCH | saved-report manage; also `record.creatorId !== actor.accountId` → Forbidden |
| `automation.service.ts` | 45 | `automation.manage` | BRANCH | rule manage; requires project for staff |
| `ai-assistance.service.ts` | 117 | `employee.manage` **and** `task.assign` | BRANCH | broader-search probe, both required |
| `organization.service.ts` | 327 | `org.employee.read` | TEAM (actor's own) | `listManagedEmployees` |
| `organization.service.ts` | 357 | `org.employee.manage` | TEAM (actor's own) | `changeManagedEmployeeReporting` |
| `notification-worker.ts` | 87 | `workforce.manage` | TEAM | recipient authorization |
| `notification-worker.ts` | 113, 138, 158 | `project.view` | BRANCH | notification recipient eligibility |
| `external-portal.service.ts` | — | `external.manage` | BRANCH | see above |

**There are no `assertProjectAccess()` or `assertManagedEmployee()` methods.**
Those names do not exist in the codebase. The equivalent functions are
`ProjectService.reportContext` (`project.service.ts:18-33`),
`ProjectService.integrationContext` (`:36-52`), `WorkforceService`'s project
helper (`workforce.service.ts:340`), `OrganizationService.listManagedEmployees`
(`:321`) and `OrganizationService.changeManagedEmployeeReporting` (`:349`).

---

## Non-trivial Auth Exceptions

475 `throw ForbiddenException` / `UnauthorizedException` sites in production
code. The meaningful access-control ones (not input validation):

### Identity / session
- `identity.service.ts:59` `suspendStaffWithinTransaction` — no active STAFF account found → `UnauthorizedException`
- `identity.service.ts:101-103` `bootstrapOptions` — owner email/secret mismatch
- `identity.service.ts:108` `bootstrapOptions` — "Owner bootstrap is closed" when an OWNER exists that is not PENDING or not the expected email
- `identity.service.ts:121` `consumeChallenge` — challenge missing/consumed/expired
- `identity.service.ts:127,139,141,143,144,145,146,147,155,159,163,165,203,222,224,229` — WebAuthn ceremony and recovery-code guards
- `identity.service.ts:251-255` `session()` — no secret, >128 chars, missing/revoked/expired/idle(>30 min) session, or account not ACTIVE / not OWNER-or-STAFF → `UnauthorizedException("Authentication required")`
- `identity.service.ts:265` `verifyCsrf` — token mismatch → `ForbiddenException("Request could not be verified")`
- `identity.service.ts:273` `logout` — session already revoked
- `identity.service.ts:292` `beginRegistration` — account not ACTIVE
- `identity.service.ts:298` `inviteStaff` — caller not a ready OWNER
- `identity.service.ts:305` `inviteStaff` — target not an invitable PENDING STAFF
- `identity.service.ts:323,332` `invitationOptions` / `invitationVerify` — grant invalid/consumed/expired/wrong account
- `identity.service.ts:345` `authorizeStaffRecovery` — owner not ready or staff not ACTIVE
- `identity.service.ts:376,385` `lookupStaff` / `forceLogoutStaff` — caller not ready OWNER, or target not STAFF
- `identity.service.ts:403,405` `issueOwnerRecoveryCode` — not OWNER/ACTIVE, or <2 passkeys
- `identity.service.ts:433,442` `ownerRecovery*` — owner/code/challenge mismatch

### Owner / staff kind gates
- `organization.controller.ts:76-78` — not OWNER or owner not ready → "Owner identity setup is required"
- `organization.controller.ts:83` — mutation with disallowed `Origin`
- `organization.controller.ts:86-88` — **session older than 5 minutes** on org-access mutation
- `organization.controller.ts:93` — staff mutation with disallowed `Origin`
- `organization.controller.ts:95` — not STAFF → "Staff access is required"
- `organization.controller.ts:97-99` — **session older than 5 minutes** on employee-access mutation
- `organization.controller.ts:292` — `GET /org/team/employees` requires STAFF
- `organization.controller.ts:301-303` — `GET /org/self` requires OWNER-or-STAFF, and OWNER must be ready
- `task.controller.ts:50` — OWNER without `ownerReady` → "Owner identity setup is required"
- `task.controller.ts:51` — disallowed `Origin`
- `review.controller.ts:74` — same owner-readiness gate
- `review.controller.ts:79` — disallowed `Origin`
- `approvals.controller.ts:21,31,43` — OWNER without `ownerReady`
- `project.service.ts:22` — account not ACTIVE / kind mismatch / not OWNER-STAFF
- `project.service.ts:25` — no explicit project assignment for staff
- `project.service.ts:40,43` — same for `integrationContext`
- `project.service.ts:46` — no assignment / cross-branch not authorized
- `project.service.ts:66` `actor()` — not OWNER/STAFF or no organization
- `project.service.ts:69,73,75` — `owner()` / `lockedOwner()` — OWNER required, ACTIVE, org match
- `project-workflow.service.ts:21` — `owner()` OWNER required
- `project-workflow.service.ts:22` — `activeActor()` identity revalidation
- `dashboard.service.ts:65` — account/org/employee/session/owner-flag consistency
- `dashboard.service.ts:66` — session row must belong to the actor, not revoked/expired/idle
- `dashboard.service.ts:76` — "Current employee scope changed; retry" (concurrent membership change)
- `dashboard.service.ts:93` — Learning reports require a live `sessionId`
- `skills.service.ts:29` — `active()` requires a sessionId (API-only actors rejected)
- `skills.service.ts:33` — account/session/employee triple check
- `skills.service.ts:35` — org match, employee ACTIVE and same org
- `skills.service.ts:80` — skill profile access denied
- `skills.service.ts:146,152` — catalogue create requires OWNER
- `skills.service.ts:157,198` — skill request access denied (self or manager-with-scope)
- `skills.service.ts:180` — selected approver not currently eligible
- `skills.service.ts:184` — "Selected approver is not eligible under skill policy" (second, post-`createRequest` check)
- `skills.service.ts:204,210` — direct rate requires OWNER
- `skills.service.ts:225,227` — approver unavailable / self-approval
- `skills.service.ts:239` — approver scope revoked during decision
- `skills.service.ts:277` — requester may not decide own skill change
- `skills.service.ts:282,283` — decider must be a current named approver with live scope
- `approval.service.ts:275,278` `assertActor` — account ACTIVE and (OWNER or ACTIVE employee in the org)
- `approval.service.ts:68` — handler did not assign a valid approver/level
- `approval.service.ts:69` — self-approval blocked by policy
- `approval.service.ts:88` — delegation not permitted by handler policy
- `approval.service.ts:89` — delegate is the requester, or expiry outside policy
- `approval.service.ts:107` — withdrawal not permitted
- `approval.service.ts:120,126` — decision evidence invalid / too large
- `approval.service.ts:147` — `handler.canDecide` false
- `approval.service.ts:148` — self-approval
- `approval.service.ts:195` — `attention` actor not ACTIVE, or STAFF outside the org / employee not ACTIVE
- `approval.service.ts:251` — same for `attentionItem`
- `approval.service.ts:267` — unregistered approval type
- `approval.service.ts:299` — approval not found (org-scoped)
- `approval.service.ts:331` — invalid cursor
- `automation.service.ts:43` — `active()` revalidates identity; mismatched kind/org → Forbidden
- `automation.service.ts:44` — saved report belongs to another manager; no employee for staff
- `automation.service.ts:45` — staff rule without an assigned project
- `ai-assistance.service.ts:76` — `active()` identity revalidation
- `integration.service.ts:28` — `active()` identity revalidation
- `library.service.ts:121` — `active()` identity revalidation
- `performance.service.ts:27` — `active()` identity revalidation
- `performance.service.ts:45` — "Project scope required" / "Current explicit project assignment required"
- `external-portal.service.ts:27` — `staff()` identity revalidation

### Authorization denials
- `authorization.service.ts:13` — the single "Permission denied" throw for every failed `assertPermission`

---

## Session/Identity Checks

There are **no `session()` / `owner()` / `staff()` / `activeActor()` helper
methods with those exact names on a shared service**. The names in the codebase
are:

| Name | Location | What it gates |
|---|---|---|
| `IdentityService.session(secret)` | `identity.service.ts:250-261` | The root session check. Validates secret length, session hash, `revokedAt`, `expiresAt`, 30-minute idle window, account ACTIVE, kind OWNER/STAFF. Returns `{ row, csrfToken }`. Throws `UnauthorizedException`. |
| `IdentityService.verifyCsrf(session, token)` | `identity.service.ts:263-267` | CSRF. Throws `ForbiddenException`. |
| `IdentityService.ownerReady(ownerId)` | `identity.service.ts:393-399` | ≥2 non-revoked passkeys **and** ≥1 acknowledged, unused, unreplaced recovery code. Not a throw — a boolean, called by controllers and by `inviteStaff`/`lookupStaff`/`forceLogoutStaff`/`authorizeStaffRecovery`. |
| `ProjectService.actor(accountId)` | `project.service.ts:63-68` | Builds `ProjectActor` from account kind + employee org (falls back to the first org). Throws `ForbiddenException("Permission denied")` if not OWNER/STAFF or no org. |
| `ProjectService.owner(actor)` | `project.service.ts:69` | OWNER-only. Throws. |
| `ProjectService.lockedOwner(tx, actor)` | `project.service.ts:70-76` | OWNER + ACTIVE + org match, with `FOR SHARE` row lock. Throws. |
| `ProjectWorkflowService.owner(actor)` | `project-workflow.service.ts:21` | OWNER-only. Throws. |
| `ProjectWorkflowService.activeActor(tx, actor)` | `project-workflow.service.ts:22` | Re-resolves the actor inside the transaction; rethrows on drift. |
| `DashboardService.active(tx, actor, owner=false)` | `dashboard.service.ts:62-79` | The heaviest check in the codebase: account ACTIVE, kind match, OWNER/STAFF, optional owner flag, employee ACTIVE + org; session row `FOR SHARE` + ownership + revocation + expiry + 30-min idle; org row `FOR SHARE`; then `FOR UPDATE` fences over `employees` (by org+team), `employee_job_role_assignments`, `job_roles`, `role_permissions`, `employee_permission_overrides`; finally re-reads the employee and fails if team/branch/state/org changed. |
| `SkillsService.active(tx, actor)` | `skills.service.ts:28-37` | Requires a `sessionId` on the actor; account ACTIVE + kind match + OWNER/STAFF; session row exists, belongs to actor, not revoked/expired, ≤30 min idle; org match; STAFF must have an ACTIVE employee in that org. |
| `SkillsService.manager(tx, actor, targetId, permission)` | `skills.service.ts:42-52` | Owner → true. Else same branch+team, `assertPermission(key, TEAM)`, then a reporting-chain walk to confirm the target is a descendant. Returns boolean, does not throw. |
| `SkillsService.managerWithoutSession(tx, accountId, kind, organizationId, targetId, permission)` | `skills.service.ts:257-267` | Same policy without a live session — used for third-party approver eligibility. |
| `SkillsService.currentEligibleWithoutSession` | `skills.service.ts:268-272` | Re-checks approver eligibility at decision time. |
| `ApprovalService.assertActor(tx, actor)` | `approval.service.ts:270-279` | Account ACTIVE (`FOR SHARE`) and organization present; OWNER short-circuits; STAFF needs an ACTIVE employee row in that org. |
| `LibraryService.active(tx, actor)` | `library.service.ts:121` | Identity revalidation. |
| `AutomationService.active(tx, actor)` | `automation.service.ts:43` | Calls `transactionalReadPorts(dashboard, tx).automationAuthorize(actor, [])` then re-resolves the actor and fails on kind/org drift. |
| `IntegrationService.active(tx, actor)` | `integration.service.ts:28` | Identity revalidation. |
| `PerformanceService.active(tx, actor)` | `performance.service.ts:27` | Identity revalidation. |
| `ExternalPortalService.staff(tx, actor, projectId, write, closeout)` | `external-portal.service.ts:27` | Identity + project scope for external-portal staff. |
| `AuthGuard` (global) | `auth.guard.ts:19-26` | Calls `identity.session()` and **ignores the result**; always returns `true`. |

**Notable**: `AuthGuard` calls `identity.session()` on every non-public request
and throws away the result, then each controller calls `identity.session()`
again with the same cookie. Two session reads and two `lastUsedAt` update
attempts per request. The guard's read is redundant work, not a control.

---

## Findings — Access Control Issues

1. **The global `AuthGuard` returns `true` unconditionally.**
   `auth.guard.ts:25` — `return true` regardless of whether
   `identity.session()` succeeded. The guard's only value is the throw. This is
   fragile: any future controller that forgets its own `identity.session()`
   call is silently unauthenticated. There is no defense-in-depth — the guard
   does not attach the session to the request, so nothing downstream can rely
   on it.

2. **Owner bypass is total and unconditional.**
   `authorization.ts:70` — `if (context.owner) return true;`. Once
   `requestedScope.organizationId === context.organizationId`, an OWNER account
   passes every permission key at every scope kind. Combined with
   `project.service.ts:66`, any ACTIVE OWNER account resolves to an
   organization even without an employee row. There is no Owner-level
   separation of duties, no per-key Owner restriction, and no audit path that
   records that the Owner bypass was used rather than a role grant.

3. **`project.closeout_approve` is used as a capability probe and as a gate, and
   the two are the same call.** `task.service.ts:254` wraps it in
   try/catch to set `canApproveCloseout`; `task.service.ts:1118` calls it
   directly as an enforcement point. Same key, same scope, same semantics —
   consistent here, but note that a caller cannot distinguish "probe" from
   "enforce" without reading the source. Not a defect.

4. **`organization.controller.ts:86-88` and `:97-99` impose a 5-minute session
   freshness gate on org/employee mutations, but nothing else does.** Task,
   review, project, document, approval, skills, time, workforce, turnkey,
   automation and CRM mutations have no equivalent. The gate is a
   step-up-authentication control applied to exactly one controller. This is an
   intentional-looking inconsistency, but it is not documented in
   `PERMISSIONS.md` as far as this audit read. **UNRESOLVED — needs
   clarification** on whether the 5-minute gate is meant to be org-only or is
   a gap.

5. **`skills.service.ts:184` performs a second approver-eligibility check after
   `ApprovalService.createRequest` has already resolved the approver.**
   The first check is inside `requestChange` at `:180`
   (`managerWithoutSession(..., "skills.manage")`); `createRequest` then calls
   the handler's `resolveApprover` (`approval.service.ts:67` →
   `skills.service.ts:222-232`), which re-checks with the same
   `managerWithoutSession` but **without a `permission` argument**, defaulting
   to `"skills.manage"` (`skills.service.ts:257`). The line-184 check is a
   belt-and-braces re-assertion. Three evaluations of the same predicate per
   request; consistent but redundant.

6. **`skills.service.ts:263` (`managerWithoutSession`) evaluates permissions
   without a live session**, while `skills.service.ts:46` (`manager`) requires
   one. `managerWithoutSession` is used for third-party approver eligibility and
   for `canView`/`canDecide` on approval requests, where the subject is a
   different account than the caller. This is deliberate (the comment at
   `skills.service.ts:228` says a missing approver is a workflow state, not a
   denial) but it means a suspended-or-idle third party can still be listed as
   an eligible approver as long as their account is ACTIVE. The session state
   of the *approver* is not checked — only their account and employee state.

7. **`client-portal-scope.service.ts:86` and `external-portal.service.ts:50`
   skip the permission assertion when the actor is the project's current lead.**
   Both do `if (project.currentLeadEmployeeId !== employee.id)` before
   asserting. Being named lead substitutes for the permission key. This is a
   presentation-derived authority: `currentLeadEmployeeId` is a mutable project
   field, not a grant. Anyone who can set that field (via `project.manage`) can
   implicitly acquire `external.manage` and `client.review_manage` without
   either key ever being granted or audited.

   **Exact semantics differ per site** — worth being precise:
   - `client-portal-scope.service.ts:86` — the condition is
     `mode === "classify" || project.currentLeadEmployeeId !== employee.id`.
     So `client.revision_classify` is **always** asserted, even for the current
     lead. The lead exemption applies only to `mode === "manage"`
     (`client.review_manage`) and the correction-assign branch
     (`client.correction_assign`).
   - `external-portal.service.ts:50` — the lead exemption covers **both**
     `external.manage` and `project.closeout_approve`.

8. **`performance.service.ts:45` has the same lead-implied-authority pattern**:
   `if (project.currentLeadEmployeeId !== self!.id) await
   assertPermission("project.manage", ...)`. The current lead is exempt from
   `project.manage` for performance management.

9. **`task.service.ts:174`, `:265` and `skills.service.ts:46`/`:263` gate on a
   reporting-chain walk, not on the permission key alone.** The walk is
   `descendantIds`-style (`organization.service.ts:403-416`) or inline
   (`skills.service.ts:49-50`, `:265-266`). Both compute descendants over a
   snapshot of same-team employees. This is a second, parallel authority model
   layered on top of the key evaluator. It is consistent within each service
   but is **not** part of `hasPermission` and cannot be reasoned about from the
   catalogue.

10. **`crm.service.ts:40` resolves the key from the action and asserts at BRANCH
    scope using a `branchId` taken from the request/lead.** Combined with
    `crm.service.ts:61,67,78` asserting `crm_source.manage` at ORGANIZATION
    scope. The per-branch keys (`lead.view`, `lead.create`, `lead.edit`,
    `lead.activity_create`, `lead.stage_change`) have no ORGANIZATION-scope
    short-circuit in the evaluator — a grant must be per-branch. See
    `authorization.ts:51-53`: a BRANCH grant matches only when the requested
    branch equals the employee's own branch. **An org-wide lead grant is not
    expressible.** UNRESOLVED — needs clarification on whether that is intended.

11. **`dashboard.service.ts:71-75` takes `FOR UPDATE` locks on `employees`
    filtered by `organizationId` + `homeTeamId`, and on `job_roles` /
    `role_permissions` reachable from the actor's own assignments.** The
    `employees` lock covers every employee in the actor's team, not just the
    actor. On a large team this is a broad row lock held for the whole report
    transaction (`timeout: 120000` at `dashboard.service.ts:61`). Contention
    and deadlock risk, not an access-control hole. Flagging because the audit
    brief asked for workflow conditions that gate access.

12. **`automation.service.ts:44` — `record.creatorId !== actor.accountId` →
    Forbidden, before any `assertPermission`.** Ownership of the saved report is
    a separate gate from `report.manage`. A staff member with
    ORGANIZATION-scoped `report.manage` still cannot touch another manager's
    report. Deliberate, but the interaction is not visible from the catalogue.

13. **`notification-worker.ts:87,113,138,158` evaluate permissions outside any
    request transaction and outside `withAuthorizationReadTime`.** These use
    `authorizationTime(undefined)` → `new Date()` per call. If a notification is
    processed while an override expires mid-flight, recipient eligibility can
    differ between the enqueue-time and send-time reads. Not exploitable, but
    the read-time discipline that `approval.service.ts:158` applies
    (`withAuthorizationReadTime`) is not applied here.

14. **`gallery.service.ts:55` and `client-review.service.ts:135,176` assert
    `document.view` / `document.client_review_select` via
    `DocumentService.authorizeFile`** (`document.service.ts:71`), which routes
    to the private `access()` at `document.service.ts:39-47`. That is
    **BRANCH-scoped on the project's own branch** (`:44`) and carries the same
    explicit-assignment precondition (`:42-43`: non-revoked
    `projectAssignment`, and same home branch or `crossBranchAuthorized`) plus
    `project.view` (`:45`) before the document key (`:46`). Confidential
    folders/files additionally require a live `documentAccessGrant`
    (`:49-53`, `:66-69`). Consistent with the rest of the codebase — **no
    finding**. Recording it here because the gallery is a public-facing
    portfolio surface and its authority path was worth tracing.

15. **`external-portal.controller.ts:44-46` and `client-portal-*.controller.ts`
    are `@PublicRoute()` and build their own actor type
    (`ExternalActor` / client-portal actor).** Their authorization is entirely
    in `ExternalPortalService.staff` (`external-portal.service.ts:27`) and the
    portal-identity services. These are separate identity domains (external
    portal users are not `Account` rows with OWNER/STAFF kind) and are outside
    the `hasPermission` evaluator. Any finding there would need a separate audit
    of `external-portal.service.ts` / `client-portal-*.service.ts`.

---

## Findings — Presentation vs Authority

Places where the client (or a capability field) infers a capability that is
not backed by the server evaluator at the point of use.

1. **`project.currentLeadEmployeeId` implies authority.**
   `client-portal-scope.service.ts:86`, `external-portal.service.ts:50`,
   `performance.service.ts:45`. The lead field suppresses
   `client.review_manage`, `external.manage` and `project.manage` checks. A UI
   that shows or hides "Manage external access" based on lead status is reading
   a mutable project attribute as if it were a grant. Changing the lead changes
   the effective permission without any role grant, override, or audit event
   tied to the permission.

2. **`OrganizationService.listManagedEmployees` returns
   `capabilities.canManageReporting` (`organization.service.ts:342-346`)** from
   a live `evaluatePermissions("org.employee.manage", TEAM)` call. This one is
   correctly backed — the same key and scope are re-asserted at
   `organization.service.ts:357` inside the mutation transaction. Good example
   of the right pattern.

3. **`SkillsService.profile` returns `capabilities.canRequest`, `.canManage`,
   `.canDirectRate` (`skills.service.ts:97`)** — all three are computed from
   live `manager()` / `actor.kind` checks in the same transaction, and each is
   re-asserted at the command boundary (`skills.service.ts:157,198,204,210`).
   Correctly backed.

4. **`SkillsService.profile` returns `canDecide` per request
   (`skills.service.ts:93-94`)** via `currentEligibleWithoutSession`. The
   decision path re-asserts at `skills.service.ts:282-283` and again inside
   `ApprovalService.decisionPolicy` (`approval.service.ts:147`). Correctly
   backed.

5. **`ai-assistance.service.ts:117` sets `canBroaderSearch` from an
   `assertPermission` try/catch requiring both `employee.manage` and
   `task.assign`.** `ai-assistance.tsx:206` gates a checkbox on
   `context.capabilities?.canBroaderSearch`. The server re-evaluates at request
   time. Backed.

6. **`ProjectService.integrationProjects` computes `canManageEvents` from a
   try/catch around `integrationContext(manage=true)`**
   (`project.service.ts:56`), then additionally requires
   `project.status === "ACTIVE"`. The client sees a boolean derived from a real
   probe — backed, though it performs the full `integrationContext` (including
   `FOR SHARE` locks and two `assertPermission` calls) twice per project.

7. **`library.service.ts:370`, `time.service.ts:143`,
   `project-workflow.service.ts:106`, `task.service.ts:254` all use
   `assertPermission`-in-try/catch as a capability probe.** Each swallows only
   `ForbiddenException` and rethrows anything else. This is the established
   pattern in this codebase and is sound. The risk is that a `ForbiddenException`
   raised for a *different* reason (e.g. a nested `integrationContext` failing
   on assignment rather than on the key) is indistinguishable from a permission
   denial. See `library.service.ts:370` — the probe asserts only
   `template.manage`, so it is clean; `time.service.ts:143` likewise. But
   `task.service.ts:254`'s probe is a bare `assertPermission`, so it is also
   clean. No defect found, noting the pattern's fragility.

8. **`client-review.tsx` gates on `reviews.capabilities.manage` /
   `.classify` / `.assignCorrection`** (e.g. `client-review.tsx:391,400,408,
   419,435,474`). These come from `ClientPortalScopeService`
   (`client-portal-scope.service.ts:85-86`), which asserts
   `client.review_manage` / `client.revision_classify` /
   `client.correction_assign` — **except when the actor is the current lead**
   (finding 7 in the previous section). So the client's `classify` capability
   can be `true` without the actor ever holding `client.revision_classify`.
   This is the clearest presentation-vs-authority issue in the audit: the
   boolean the UI trusts is derived from a project attribute, not from the
   evaluator.

9. **`apps/web/src/ai-assistance.tsx:212` renders "No supported request is
   currently available for this role" when
   `Object.keys(context.capabilities ?? {}).length === 0`.** An empty
   capabilities object is treated as "no capability". The server sends an empty
   object for an unauthorized audience (`ai-assistance.test.tsx:128` mocks
   `capabilities: {}` with `unavailableCapabilities: ["Management context is
   not authorized"]`). This conflates "no capabilities" with "not authorized"
   — a UI inference, not a server gap.

10. **`crm.tsx`-style `capabilities: { view, create, edit, activityCreate,
    stageChange }`** (see `crm.test.tsx:11,48,115,159`) are per-branch booleans
    from `crm.service.ts:40` + `evaluatePermissions` (`crm.service.ts:55-57`).
    These are correctly backed by a batch evaluation of the same keys and
    scopes the mutations assert.

---

## Escalations — Must go to integration owner or Owner

1. **Owner bypass (`authorization.ts:70`) is unconditional.** Any change to it
   (per-key Owner restrictions, Owner separation-of-duties, or auditing the
   bypass) is an evaluator change in a shared file that every service depends
   on. Requires the integration owner's sign-off and a full re-run of the
   authorization suite (`authorization.unit.spec.ts`).

2. **Lead-implied authority (`client-portal-scope.service.ts:86`,
   `external-portal.service.ts:50`, `performance.service.ts:45`).** Removing
   the `currentLeadEmployeeId !== employee.id` exemption, or replacing it with
   an explicit grant, changes behaviour for every current project lead. Touches
   three services and their specs. Escalate before changing.

3. **The 5-minute session freshness gate
   (`organization.controller.ts:86-88,97-99`) vs. its absence everywhere
   else.** Deciding whether to extend it (or remove it) is a security-policy
   decision that touches shared controller patterns.

4. **`managerWithoutSession` (`skills.service.ts:257-267`) evaluates
   permissions for a third party with no session check.** If the policy should
   require the approver to have a live, non-idle session, that is a change to
   the skill approval workflow and to `ApprovalService`'s handler contract.

5. **BRANCH-scoped-only lead permissions (finding 10).** If leads need to be
   manageable org-wide, `crm.service.ts:40` and the grant UI
   (`organization-admin.tsx`) both change, and `PERMISSIONS.md` needs an entry.

6. **`gallery.service.ts` / `client-review.service.ts` `document.view` scope
   (finding 14) is untraced.** Needs a clarification pass before any change.

7. **`AuthGuard` returning `true` unconditionally (`auth.guard.ts:25`).**
   Making it fail closed, or attaching the resolved session to the request so
   controllers stop re-deriving it, changes the global guard registration in
   `app.module.ts:131` and every controller's `cookie()` helper. High blast
   radius.

8. **`dashboard.service.ts:71-75` team-wide `FOR UPDATE` lock.** If report
   concurrency is a problem, narrowing the lock is a schema/query change with
   correctness implications for the "scope changed; retry" check at
   `dashboard.service.ts:76`.

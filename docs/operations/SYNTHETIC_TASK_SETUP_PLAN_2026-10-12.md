# Bounded synthetic task setup — 12 October 2026

**Prepared for Owner approval. No execution is authorized or performed by this plan.**

## Target and purpose

Enable ordinary task creation in the **existing** local test server:

- Web: `http://localhost:59223`; API: `http://127.0.0.1:59224`.
- Database: `sense_local_preview_20261008_1791474390772_test`.
- Retained PostgreSQL18 directory: `D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9`.
- Endpoint: `127.0.0.1:45434`; system identifier: `7693570241708228348`.
- Minimum per-command Windows Medium host context, pinned Node24.19.0/pnpm11.19.0 where commands are needed.

The last guarded read-only check found zero organizations, branches, teams, employees and tasks, and one active fully secured Owner. This is prior evidence, not a promise about the next execution. Repeat the guards immediately before writing. Preserve the existing Owner account, credentials, recovery configuration, data and history.

Requirements: R-004/R-006 organization and access; R-005/R-007 and C-008 normal identity/passkeys; R-018.a–b/R-019.a–c/R-021.a–b task ownership/assignment; R-092 retained evidence. Organization → Branch → Team → Employee remains the hierarchy.

## Exact records proposed

| Record | Proposed value |
|---|---|
| Organization | Sense Local Task Test |
| Branch | Local Test Branch |
| Team | Local Test Team |
| STAFF identity | task-test-20261012@example.test |
| Employee | LOCAL-TASK-001, hired 2026-10-12, in the branch/team above |
| Verification task | MW-I02 task creation check; NON_PROJECT; MEDIUM; Target 2026-10-20; assigned to LOCAL-TASK-001; no review requirement |

Organization/branch/team/employee mutation reason: **Owner-approved synthetic local task setup**. Task reason: **Verify ordinary task creation in the retained local test server**.

No job role, permission override, reporting manager, project, cross-branch assignment or extra team membership is needed. The employee receives only the access inherent in the existing active STAFF/self-task rules. The Owner remains without an employee identity and therefore keeps zero personal tasks; assigned employee work is created through **Tasks**.

## One continuous bounded execution after approval

1. **Preflight, read-only.** Reuse the established identity check against the exact database, server system identifier, address/port and directory. Verify existing API/web process ownership and their configured database; require both already running. Reconfirm the secured Owner, zero organization/membership/task baseline, absent proposed staff email and no conflicting invitation. Stop on any changed baseline, identity/process mismatch, duplicate, unavailable server or schema error. No startup, restart, migration, alternate target or automatic retry.
2. **Preservation evidence.** Record the target database OID and unrelated-database catalog; retain a local, untracked pre-setup custom-format dump of only this exact database at `.env.checkpoint-tools/runs/task-test-setup-20261012-<runId>/pre-setup.dump`. Use `C:/Program Files/PostgreSQL/18/bin/pg_dump.exe`, the exact approved endpoint/database and the existing verified connection role; never print its password. Require exit code0, a nonempty archive and successful read-only archive listing with the installed PostgreSQL18 `pg_restore.exe --list` before the first application write. Stop if any preservation check fails. The dump may contain security-sensitive database records; it stays local, is not added to Git or screenshots, and is never automatically restored. No permissions or OS security changes.
3. **Normal Owner authentication.** Owner signs in with an existing passkey. Organization writes and staff invitation require a session created within five minutes, correct Origin and current CSRF token. Reauthenticate normally if the five-minute window expires; never reuse a stale session or change the security rule.
4. **Create organization, branch and team** through the existing supported APIs/UI, using only returned IDs.
5. **Invite the one STAFF identity.** The existing invitation API creates a PENDING STAFF account and one-use enrollment grant. It returns a token, expires after 24 hours and does not send external email. Do not record token, cookies, CSRF secrets or credential responses in reports/logs/screenshots. Stop on a partial or duplicate invitation; do not issue a replacement automatically.
6. **User-controlled staff enrollment.** Owner completes the normal `/enroll` flow and new staff passkey registration. Prefer a separate browser profile/session so the staff cookie does not replace the Owner session. If unavailable, coordinate normal sign-out/sign-in with the user; do not silently switch their account. No fabricated/inserted credentials, virtual-authenticator substitution, token forgery or authentication shortcut. This human step is part of the plan, not an invitation to bypass it.
7. **Create the employee.** In a fresh Owner session, look up the exact email through the existing staff lookup; require ACTIVE state and no employee membership. Create LOCAL-TASK-001 using that returned account ID, the returned organization/branch/team IDs, empty jobRoleIds and no manager.
8. **Verify one ordinary task save.** In `/tasks`, select that primary owner and submit only the named NON_PROJECT task above. Read back its ID, owner, Target, priority and initial NOT_STARTED state. Reload and confirm it persists. The Owner's personal total remains zero; the employee's personal queue can contain this task. No lifecycle transitions, time logs, evidence upload or further task creation.
9. **Record and retain.** Capture the enabled creation form, save confirmation and persisted task without secrets. Record exact created IDs and expected audit/history/security/session/outbox side effects. Confirm the pre-existing Owner credential IDs/key material and recovery configuration were not replaced/revoked; normal authentication counters/last-use times and appended session/security events are expected. Verify unrelated database catalog entries are unchanged.

## Supported request bodies

All protected writes use the current session, same-origin request and CSRF token through the existing app. This table is an execution specification, not a command to run now. Never supply guessed IDs.

| Request | Exact body / inputs |
|---|---|
| `POST /api/v1/org` | `{name:"Sense Local Task Test",reason:"Owner-approved synthetic local task setup"}` |
| `POST /api/v1/org/branches` | `{organizationId:<returned>,name:"Local Test Branch",reason:<same>}` |
| `POST /api/v1/org/teams` | `{organizationId:<returned>,branchId:<returned>,name:"Local Test Team",reason:<same>}` |
| `POST /api/v1/auth/staff/invitations` | `{email:"task-test-20261012@example.test"}` |
| Normal enrollment | `POST /api/v1/auth/staff/invitations/options` takes the one-use token; `POST /api/v1/auth/staff/invitations/verify` takes token, ceremonyId and the genuine WebAuthn response. User completes credential registration. |
| `GET /api/v1/auth/staff?email=task-test-20261012%40example.test` | Require the exact ACTIVE account; no reuse of an unexpected pre-existing identity. |
| `POST /api/v1/org/employees` | `{organizationId:<returned>,accountId:<lookup>,branchId:<returned>,teamId:<returned>,employeeCode:"LOCAL-TASK-001",hiredAt:"2026-10-12",jobRoleIds:[],reason:<same>}` |
| `POST /api/v1/tasks` | `{title:"MW-I02 task creation check",type:"NON_PROJECT",priority:"MEDIUM",targetDate:"2026-10-20",ownerEmployeeId:<returned employee>,reason:"Verify ordinary task creation in the retained local test server"}`; canonical default review requirement NONE. |

## Retention, failure handling and risks

These records are **persistent test setup**, not a disposable acceptance database. Retain them for the Owner to use. Do not drop the database, delete accounts, revoke existing Owner sessions/credentials, erase audit history or undo a singleton organization by SQL. No automatic rollback/restore or fixture deletion is included. On failure, stop and report which records were committed; keep supported audit evidence. Any later cleanup/removal requires a separate bounded decision and ordinary retained-history workflows.

Expected risks are limited to synthetic records and normal identity/audit/session/history side effects in the named test database. Inviting/enrolling the staff identity and establishing membership creates real access inside this test environment; the explicit approval below must include that scope. No organization-wide/manager permission grant, external email, production access, backend change or infrastructure restart is included.

Database baseline is115 migrations. Current source also has116 (`20261008000000_s27_ai_run_privilege_repair`), which only repairs S27 ai_runs decisionVersion update privileges. It is unrelated to these organization/identity/NON_PROJECT paths. **Do not apply116 here**; no general S27 or whole-app schema/acceptance claim. Stop if the ordinary setup/task path reveals a schema problem, then report a separate plan.

## Combined Owner authorization required

> Approve one bounded setup on the exact existing local test database above: repeat the read-only guards and local pre-setup preservation dump, create only the named organization/branch/team, invite and normally enroll the named synthetic STAFF account with user-controlled passkey registration, create its one employee membership without extra role/permission grants, save the one named NON_PROJECT verification task, verify persistence/Owner preservation/catalog boundaries, and retain the records for ongoing testing. No startup/restart, migration, alternate database, direct SQL writes, automatic retry/restore/deletion, production or security-policy changes. Stop on an unexpected result and report committed records. This approval is for this setup only, not a full MW-I02 acceptance run or MW-I03.

Plan preparation used GPT-6.1 Sol intake/source review. No environment run, authenticated writes or database state-changing operation was performed while preparing it.

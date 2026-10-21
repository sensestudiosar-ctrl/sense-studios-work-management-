# Five synthetic test accounts — bounded extension proposal

Prepared by GPT-6.1 Sol for one Owner decision. No invitations, credentials, memberships or tasks are created by this document.

## Existing state and target

Use only the retained preview database `sense_local_preview_20261008_1791474390772_test`, OID32768, PostgreSQL18 system7693570241708228348 at127.0.0.1:45434, weblocalhost59223/API59224. Preserve the existing secured Owner, two credential identities, recovery configuration, unrelated catalogs and115 migrations. No restart, migration116, alternate database or direct SQL writes.

The approved organization/branch/team already exist. The first staff invitation is PENDING: `task-test-20261012@example.test`, account473d501d-b547-4329-a30d-bacbfa064747. Verify this current state before continuing; do not re-invite it. Prior private preservation archive remains retained. Any changed baseline or unexpected failure stops the run and requires a report of committed records.

## Exact proposed additions

Five total STAFF identities, excluding the existing Owner:

1. task-test-20261012@example.test — existing PENDING invitation.
2. task-test-02-20261012@example.test.
3. task-test-03-20261012@example.test.
4. task-test-04-20261012@example.test.
5. task-test-05-20261012@example.test.

For useful task testing, propose one active employee per identity in the existing Local Test Branch/Local Test Team, employee codes LOCAL-TASK-001 through005, hired2026-10-12. No roles, permission overrides, reporting manager, project assignments or additional memberships. These employee memberships extend the previously approved single employee and require explicit approval. Retain the original single NON_PROJECT verification task; create no additional tasks under this extension.

Requirements: R-004/R-006, R-005/R-007/C-008, R-018/R-019/R-021 and R-092. Staff identities alone do not grant employee/business access. Active employee self-task rules remain canonical; employees gain no authority to assign others.

## Authentication choice requiring Owner decision

The existing approved setup expressly requires genuine user-controlled enrollment and forbids virtual-authenticator substitution. The new request to add accounts automatically does not silently replace that restriction.

**Option A: normal human passkeys.** Create four additional PENDING invitations through the ordinary Owner invitation API, then hand off all five enrollment ceremonies to the user. Accounts become ACTIVE only after normal registration; five pending invitations are not five usable staff logins.

**Option B: explicitly approved software test authenticators.** Use isolated test browser contexts with Chromium CDP virtual authenticators for only these five synthetic staff identities. Existing `.env.checkpoint-tools/mw-i02-acceptance/acceptance.spec.ts` demonstrates CTAP2/internal/resident/user-verifying authenticators, ordinary browser WebAuthn registration and per-target credential persistence. Its whole acceptance harness is bound to another disposable database and bootstraps a synthetic Owner: do not run that harness or remove its guards. Prepare a separate narrowly guarded helper after approval, source-review it before live execution, and never attach a virtual authenticator to the real Owner session.

Option B is test credential simulation, not evidence of real-device authentication. It requires explicit approval of new software credentials and private-key persistence. No server authentication bypass, fake session, inserted credential, modified policy or UI backdoor is permitted. CUA enrollment restrictions remain respected: software enrollment happens only in separately authorized test browser automation, never by silently completing a new-credential prompt in the user's browser.

## Supported sequence after the decision

Verify exact cluster/database/process identities, saved backup hash, current hierarchy/invitation state and absent four new emails. Preserve Owner credential/recovery hashes and catalog before and after. Owner authenticates normally with existing passkeys; invitation/org mutations require same origin, current CSRF and session age under five minutes. Expiry requires ordinary human reauthentication, never simulated Owner credentials.

Create exactly four invitations with `POST /api/v1/auth/staff/invitations` and `{email}`. Retain invitation tokens privately; no external messages are sent. Reuse only the verified current first invitation; stop if expired, consumed unexpectedly or unavailable instead of issuing a replacement automatically.

For each account, ordinary `POST /api/v1/auth/staff/invitations/options` accepts `{token}` and `/verify` accepts `{token,ceremonyId,response}`. Option A uses user-controlled browser registration. Option B uses the separately approved isolated software authenticator; the server still verifies its real cryptographic ceremony against configured origin/RP/challenge. Verify exact ACTIVE STAFF identity through normal Owner lookup before employee creation.

Create five employee records through `/api/v1/org/employees` with returned organization/account/branch/team IDs, approved employee code/date, `jobRoleIds:[]` and reason `Owner-approved synthetic local task setup`; omit manager. Preserve ordinary API audit/history/session effects. Verify each scoped task setup, no extra grants, and the previously approved single task if not already created. Do not claim production or full MW-I02 acceptance.

For Option B, persist only synthetic staff credentials in a private untracked local run directory bound to exact DBname/OID/systemID, app origin/RP, account IDs and emails. Never print/log/screenshot tokens, cookies, credential responses or private keys. Validate the directory's existing Windows access restrictions rather than assuming Unix mode0600 protects it. If adequate private storage cannot be established within approved scope, stop. Retain staff credentials for test reuse; no automatic credential deletion/recovery/revocation or broader cleanup.

## One combined decision

Approve either human enrollment or software test-authenticator enrollment for these exact five total STAFF accounts, four additional invitations, five employee memberships without extra grants, and the previously approved single verification task on this exact existing preview. If software enrollment is selected, explicitly supersede the prior human-only/no-virtual-substitution restriction for these synthetic STAFF credentials only and approve private local credential retention. Preserve normal Owner authentication and all target/security/history guards. Stop on unexpected results; retain committed records. No alternate targets, direct SQL writes, new roles, migrations, restarts, automatic retries or full acceptance run.

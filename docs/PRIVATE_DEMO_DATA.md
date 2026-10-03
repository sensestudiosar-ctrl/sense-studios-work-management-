# Private demo data

Owner authorized fictional organization/employee/workspace data on 2026-10-02 so the app can be explored without manual entry. This is dedicated development-test data, not production or a new feature slice.

## Scope

Reuse the Owner-created singleton organization; add a clearly labeled demo branch/team/role, three fictional employee records, six non-project tasks and one draft design project. S03 organization/membership (R-004.a–d, R-006.a–c), S07 project foundation (R-011.a, R-012.a, R-013.a) and S09 task creation (R-018.a–b, R-019.a, R-021.a, R-024.a) provide the existing persistence and service rules. No employee sign-in, public publishing, review approvals, workforce/payroll data or production data is seeded.

## Safety and use

The seed script is restricted to the exact local `sense_iphone_https_dev` database on port 56432 and requires an explicit apply argument. Existing Owner authentication and existing records are preserved. A database backup was saved before seeding at `C:\Users\HI\AppData\Local\Temp\sense-before-demo-seed-20261002.dump`.

Fictional staff accounts have no passkeys, sessions or enrollment tokens and cannot sign in. Their active fixture state allows assignment to real employee records in this dedicated database. Use the existing Owner account to explore the samples; choose a demo employee as Primary owner when creating a task. Dummy addresses use the reserved `.example.test` domain.

Organization membership, tasks and projects are created through existing domain services so their history and audit events persist. Only the new demo role receives branch-scoped project view permission for its sample project assignments. Repeated seeding must reuse matching samples and must not reset edits, statuses, permissions, user records or credential data.

## Outcome

Applied successfully on 2026-10-02 with `node scripts/seed-private-demo.mjs --apply`. Reused the Owner-created organization `sensestudios`; added Demo Branch, Demo Design Team, Demo Designer role, three employees (`demo.alex@example.test`, `demo.maya@example.test`, `demo.lee@example.test`), six `[Demo]` non-project tasks and `[Demo] Studio workspace` (Draft, three explicit assignments). All tasks begin Not started and can be used for subsequent workflow exploration.

Real TaskService outcome inspection returned `canAssign: true`, three eligible employees and six tasks in both Owner list scopes. Owner count remained 1, passkey count 2 and session count 13 before/after each run. A second apply reused the fixtures; organization/branch/team/employee/account/project/task/audit/domain-event totals remained unchanged at `1/2/2/3/5/1/6/23/23`. Existing user branch/team and the pending staff identity were preserved. No sample sign-in material was created.

Syntax check and scoped ESLint passed. API readiness reported ready/database ready and the private HTTPS home returned HTTP 200. No automated tests or full quality suite were run for this data-only operation; authenticated browser interaction remains for the Owner to confirm. First apply emitted a pg overlapping-query deprecation warning from existing service transaction behavior but completed successfully; repeat apply succeeded without that warning.

Run from the workspace root after API artifacts are built. The script fails closed for a different database, non-development environment, unexpected Owner/organization, or conflicting fixture records. It refuses changed fixtures instead of overwriting user edits. Context intake/review used GPT-6.1 Sol; script implementation used GPT-6 Luna, with root review refinements for preservation of revoked permissions, origin configuration and list limits.

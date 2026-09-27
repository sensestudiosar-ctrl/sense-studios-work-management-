# S03 — Branch, Employees and RBAC

**Status:** COMPLETE for development/local staging — Owner authorized 2026-09-26.

## Source and clause boundary

Requirements: R-004.a–d, R-006.a–c, R-007.b, R-008.a, R-009.a, R-092; approved clarifications C-001, C-002 Q1/Q15, C-023 and C-024. S02 is the required identity/session dependency. S04 audit/outbox/notifications is authorized and COMPLETE for development/local staging; S07 projects and S09 tasks remain unauthorized and do not exist yet.

The source's original Brand and Department wording is superseded by C-001. The runtime hierarchy is Organization → Branch → Team → Employee. Every employee has exactly one current home Branch and Team; cross-branch work is a separate, explicit, Owner-authorized project assignment. Job role, reporting relationship, and permission remain separate concepts. Job titles do not grant permissions by themselves.

## In scope

- Persist the Organization, Branch, Team, configurable JobRole, Employee-to-Account link, reporting relationship, current home membership, and dated membership history. One employee may hold multiple current job-role assignments; role assignment history is separately dated.
- Configure resource/action/scope permission bundles for dynamic job roles and explicit per-employee allow/deny overrides. Authorization is enforced in the API with default deny; deny overrides allow. Team and Branch scopes are bounded by active home membership and explicit assignments.
- Provide Owner organization authority and narrowly scoped employee/role/permission management APIs and responsive Owner UI. Team Leader authority is an explicit grant and scope, never inferred from the title.
- Suspend an account immediately with reason, revoking active sessions and permission grants atomically. Keep employee records and historical ownership references.
- Establish the project-grant authorization contract so only the Owner can issue cross-branch project assignments when S07 owns the Project relation. Do not create unvalidated project IDs before that module exists.

## Deferred within this slice's dependency boundary

- Effective employee exit when the employee has an unfinished task or is lead on an Active project. Immediate access suspension remains available. S09 must atomically put unfinished primary-owned tasks into Waiting for individual reassignment (C-023); S07 must atomically put Active led projects On Hold and require an Owner-appointed replacement before resume (C-024). Until both dependencies exist, any exit command must reject rather than partially transition business work.
- Project membership CRUD and cross-branch project grants until S07 provides the project table and transfer/lead invariants. The later implementation must require an Owner actor and must not expand access to the whole foreign Branch.
- External identities and portals (S14/S21), business audit/outbox/notification infrastructure (S04), and any later business modules.

## Persistence and API design

Proposed records: singleton Organization; Branch owned by Organization; Team owned by Branch; JobRole; Employee linked uniquely to an internal Account with current home Branch/Team, optional reports-to Employee and employment state; append-only EmployeeMembershipHistory; dated EmployeeJobRoleAssignment rows (multiple roles per employee); RolePermission entries; and EmployeePermissionOverride entries. All IDs are opaque UUIDs. Constraints must prevent duplicate names within a parent, cross-Branch Team assignment, self-reporting/cycles, more than one current home-membership period, duplicate current role assignment, and assigning an Employee to a suspended/non-staff identity. No Brand or Department tables.

The authorization service accepts actor, permission action, resource, scope, and current workflow conditions. It resolves the current Employee, direct reporting/team/Branch memberships, dynamic role bundles, explicit overrides, and explicit cross-branch assignment when available. It defaults to deny and checks permissions on every protected API call. A role assignment alone grants no resource access. ID tampering and stale/revoked membership must fail server-side.

Organization writes need durable actor/reason/time evidence. Until S04's shared AUD service exists, S03 will own append-only access-change evidence for membership, permission, and suspension changes, with no secret/session-token data. It must be designed for later AUD integration rather than making these records mutable.

## Acceptance and checks

- Reviewed forward-only migration applies on a fresh database and an S02 database; Prisma validates and reports schema current. Existing identity/session data remains intact.
- Database tests cover unique Account membership, one current home Branch/Team, Team/Branch consistency, dated history, valid manager graph, role/permission separation, grant constraints, and rollback of partial changes.
- API tests cover Owner management, explicit scoped Team Leader management, deny-by-default, allow/deny precedence, cross-Branch and ID-tampering denial, CSRF/origin, suspension revoking active sessions/grants in one transaction, and refusal to finalize exit while S07/S09 dependencies are missing.
- UI supports persisted refresh and loading, empty, validation, denied, network/error and confirmation states on desktop/mobile; no fake organization data.
- Targeted tests, typecheck, lint, production build, browser checks, migration review, security review, traceability and documentation pass before S03 is COMPLETE.

## Current local verification

On 2026-09-27, the S01→S02→S03 migration chain applied on a fresh isolated PostgreSQL 16 database, and Prisma reported the schema up to date. On a separate database with the S01 and S02 migrations already applied and an Owner account plus active session seeded, S03 applied successfully and both identity/session rows remained. The guarded API integration suite passed 23/23, API unit tests 31/31, and web unit tests 14/14. `pnpm --filter @sense/api db:validate` and `db:migrate:status` passed. `pnpm verify` exited 0: typecheck, lint, unit tests, integration tests, API/web production builds, and all five Playwright desktop/mobile checks passed, including Owner passkey enrollment/login/session restore/logout. For the clean Playwright exit, API and Vite were prestarted and the tests reused them; an initial managed-server run executed all five tests but hung during Windows runner cleanup. A separate end-to-end run is not available for S03 organization administration; the S03 UI is covered by unit tests and backend behavior by HTTP/database tests. The database evidence supplements, rather than replaces, the earlier dedicated S02 acceptance in S02_COMPLETION_REPORT.md.

Implemented: Organization/Branch/Team/JobRole and Employee persistence; dated home-membership/reporting and multi-role history; Owner administration APIs/UI; explicit scoped job-role permission bundles and employee allow/deny overrides; default-deny backend checks; Team Leader report-tree listing and scoped reporting updates; atomic suspension, session revocation, and grant revocation; append-only organization events; and fail-closed employee-exit refusal while S07/S09 transition support is absent. The Owner can configure organization structure and employee memberships, permissions, roles, and suspension. Staff team UI exposes only permitted direct/indirect reports. Project-grant integration remains deferred until S07 owns project records. Effective exit remains deferred until S07/S09 can satisfy C-024/C-023 atomically; S03 rejects exit requests while those owning services do not exist. API authorization, CSRF/origin, ID-tampering, audit evidence, cycle/membership constraints, and suspension behavior were reviewed; unit, HTTP, database and UI unit tests passed. Complete verification details are above. S03 is COMPLETE for development/local staging with the explicit S07/S09 dependency boundary preserved.

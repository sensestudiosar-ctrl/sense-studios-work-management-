# S03 completion evidence — Branch, employees and RBAC

**Scope:** development and local staging only
**Owner authorization:** 2026-09-26
**Recorded completion:** 2026-09-27
**Requirements:** R-004.a–d, R-006.a–c, R-007.b, R-008.a, R-009.a, R-092; C-001, C-002 Q1/Q15, C-023, C-024

## Recorded acceptance evidence

The detailed implementation boundary and verification record is [S03_SPEC.md](S03_SPEC.md). It records the following checks as passed on 2026-09-27:

- Applied the S01→S02→S03 migration chain on a fresh isolated PostgreSQL 16 database; Prisma reported the schema up to date.
- Applied S03 to an existing S02 database seeded with an Owner and active session; both identity/session records remained.
- Passed Prisma `db:validate` and `db:migrate:status`.
- Passed `pnpm verify`: typecheck, lint, API unit tests (31), web unit tests (14), API integration tests (23), production builds, and five Playwright desktop/mobile checks. API and Vite were prestarted for Playwright because the Windows managed-server cleanup hung after all tests passed.
- S03 organization administration has no separate browser E2E. Its UI has unit coverage; its backend has HTTP/database coverage.

The implementation records organization/branch/team/job-role and employee membership/history, scoped role grants and employee overrides, deny-by-default authorization, Team Leader reporting scope, atomic suspension/session/grant revocation, append-only organization change evidence, and fail-closed employee exit while S07/S09 transitions are absent. Cross-branch project grants and effective exit remain deferred to S07/S09 as specified.

## Initial independent recheck on 2026-09-27 (before S04 database setup)

Environment: Node 24.19.0, pnpm 11.19.0; dependencies installed. At that point the shell had no `DATABASE_URL`, no listening PostgreSQL test port, and Docker did not respond.

`pnpm verify` was run against the current working tree. Typecheck, lint, 31 API unit tests, 14 web unit tests, 16 API integration tests, and API/web production builds passed. Seven database-dependent API integration tests were skipped. Playwright did not start: its API server rejected startup because `DATABASE_URL` was unset. Therefore that recheck did **not** reproduce the dedicated PostgreSQL migration/integration checks or the five browser checks recorded above. The later S04 verification is recorded below.

## Evidence limits

The historical PostgreSQL and browser outcomes are recorded in S03_SPEC.md and CURRENT_STATE.md, but there are no retained CI/test logs or a committed S03 revision in this workspace to independently tie those outcomes to an immutable source snapshot. Current Git HEAD is 58957d1 (the S02 completion commit); the S03 implementation and its verification notes are working-tree changes. This report preserves that limitation rather than presenting the historical record as a current rerun.

S03 is recorded COMPLETE for its authorized development/local-staging scope based on the contemporaneous check record. The current recheck is partial because this host lacks the dedicated database configuration. Production deployment gates do not form part of this S03 scope.

## Follow-up found during S04 verification

The later S04 `pnpm verify` run exercised S03 organization UI and PostgreSQL coverage on the current tree. It exposed a UI reload race: the organization loader callback depended on the employee branch selection and reran after the initial load, briefly hiding the permission form. The loader now retains the branch selection through a ref without depending on selection changes, and the UI regression test asserts the organization endpoint is loaded once. The full verification run then passed, including all 20 web unit tests and 32 PostgreSQL integration tests. This follow-up does not expand S03 scope.

# S13 internal review and correction — progress

Status: COMPLETE for the Owner-authorized development/local-staging slice on 2026-09-30. S13_COMPLETION_REPORT.md supersedes the interim checks below with final acceptance evidence. S14 client approval remains outside this slice.

## Implemented and checked so far

- Review categories, named reviewer assignment, task-bound immutable submissions and snapshots, review rounds, structured annotations, uploaded markup references, correction task assignment, revised R-series submissions, independent decisions, and internal task completion use persisted PostgreSQL state with scoped HTTP commands.
- The review decision creates canonical audit/domain/outbox evidence and consumes the S12 exact-revision private port. A newer internally approved R revision becomes current; selected or CR issue still requires S14 exact client approval.
- Current project assignment, branch authorization, independent reviewer grant, task owner, project state, revision file and Confidential access are checked in backend commands. Revoked review grants and reviewer becoming current task owner deny further review actions.
- Three additive S13 migrations applied to a fresh PostgreSQL 18 database and to a populated S12 baseline. A normalized dump of all pre-S13 business rows was identical before and after the upgrade (SHA-256 `BCF39D48E0616C3E0814D0B8709A4BE436838DE8F5B12F0AE7B2369CDA56BFEC`). The Prisma schema validates.
- Focused S13 database/API checks pass, including correction loop, exact R0/R1 approval, ID tampering, rollback, grant revocation, current-owner independence and Confidential reviewer denial. The desktop/mobile S13 Playwright journey passed 2/2. Web unit tests passed 67/67; API unit tests passed 128/128. Typecheck, lint and production build passed after the latest changes. A clean dedicated database run passed 29 enabled API integration suites and 130 tests; the separately configured S12 database suite was skipped because `S12_DATABASE_URL` was unset.

## Resolved before acceptance

- The Owner answered the three policies on 2026-09-30. Escalation routes to the active Project Lead with Owner fallback; an exit-interrupted round needs reasoned manager withdrawal after reassignment; reviewer priority/deadline changes require existing management grants, with a separate deadline grant for committed dates. Backend, schema, delivery-time authorization and responsive UI acceptance passed.
- Final `pnpm verify` exited 0: 136 API unit, 69 web unit, 133 API/PostgreSQL integration and 19 browser tests passed, including S13 desktop/mobile. All 51 migrations applied on fresh and populated upgrade databases; Prisma validates. Optional-suite settings, fixed defects and production limits are detailed in S13_COMPLETION_REPORT.md.

## Check classification

- One full `pnpm verify` attempt failed because the new task shortcut called `useNavigate` in standalone task unit tests. The task shortcut now uses a native deep link; the web unit suite passes.
- A later full attempt used a database already containing targeted test fixtures and failed the global single-Owner account constraint. A newly created database with UTC timezone passed every enabled API integration suite. Final whole-gate verification still has to run against a fresh database after the remaining work.
- An optional S12 acknowledgement integration case failed on the S12-only baseline and after S13 migration on this local PostgreSQL 18 cluster; it is independent of the S13 changes. The standard full integration invocation skips this separate suite without `S12_DATABASE_URL`.

Sol-level reasoning owns S13 requirements, schema, permissions, security and final acceptance. Luna agents implemented bounded API/UI/browser checks and were reviewed against the approved sources.

# MW-I02 post-refinement validation — awaiting Owner authorization

10 October 2026. This report records checks against the current working tree after the later refinement edits. MW-I02 remains **IN PROGRESS**. MW-I03 was not started.

## Current-tree evidence

| Check | Result | Evidence / limit |
|---|---|---|
| MW-I02 focused frontend tests | PASS, 50/50 | `task.test.tsx`, `my-work-attention.test.tsx`, `approval-queue.test.tsx`; Node 24.19.0, installed Vitest 5.0.2. |
| Four affected frontend test files | FAIL, 64/82 | Adding `app.test.tsx` produced 18 failures, all in the existing identity/authentication-shell failure family, and two unhandled `DashboardWorkspace` exceptions at `dashboard.tsx:109`. The earlier baseline record documents the same 18 `app.test.tsx` failures and Dashboard exception; this run does not claim them fixed. |
| Web typecheck | BLOCKED | Pinned pnpm11.19.0 is present, but `pnpm typecheck` exited1 before starting checks: pnpm failed `[EPERM] realpath 'D:\\app\\sensestudios work management app'` while running its dependency status check. It attempted an implicit `pnpm install` subprocess, which failed at the same realpath error. Direct `tsc` without the prerequisite contracts build produced broad workspace declaration/export errors and is not accepted as a valid typecheck. |
| Affected lint | PASS with warnings | ESLint exited 0; it warned that the two CSS files have no matching lint configuration. |
| Web production build | PASS | Direct Vite production build completed successfully after the latest edits. Existing chunk-size and ineffective dynamic-import warnings remain. |
| Authenticated browser run and captures | BLOCKED | Current source timestamps are later than the retained final9 captures: `task.tsx` 16:14, `task.test.tsx` 16:14, `task.css` 16:09, `my-work-attention.tsx` 16:10, `my-work-attention.css` 16:06 and `app.tsx` 16:08; retained authenticated captures are 15:32. They are explicitly not post-latest-code evidence. |

The earlier report's final9 screenshots and authenticated run are preserved, but are not offered as current acceptance evidence. They include the Owner's five-item reassignment disclosure in its collapsed state; they do not provide a new post-refinement check that it opens. No actual screenshot is claimed for Owner setup loading/denied behavior after the current edits.

## Why authenticated validation is unavailable

The previous approved Playwright run used the installed local browser infrastructure with API `127.0.0.1:59442`, web `localhost:59443`, and the named disposable PostgreSQL target `sense_mw_i02_validation_20261009_test` on `127.0.0.1:57434`. Its exact-target cleanup stopped its owned API/web processes, revoked synthetic sessions, dropped that disposable database and confirmed catalog preservation. A current read-only check reports `pg_ctl: no server running` for the retained PostgreSQL 18 cluster; no listener exists on ports 57434, 59442, 59443 or the old preview port 59223. Thus Playwright is installed, but there is no authenticated application/database to load. No server, database, session, fixture or production data was changed during this validation attempt.

The earlier run had cleaned up the named target and consumed its previously approved startup. The Owner approved a bounded rerun and then one retry after read-only listener checks found no owner. The first startup failed binding `127.0.0.1:57434`; its [log](../../../../../.env.checkpoint-tools/mw-i02-postgres-start-postrefine-20261010.log) records the socket-address-in-use error. Windows excluded-port diagnostics were unavailable (`netsh` returned “command not found”), so port reservation remains unknown.

The approved retry returned success and its [log](../../../../../.env.checkpoint-tools/mw-i02-postgres-start-postrefine-retry1-20261010.log) records PostgreSQL listening on `127.0.0.1:57434`, completing ordinary WAL recovery, and reporting ready. However, the guarded read-only preflight then received `EACCES` from Node connecting to that loopback endpoint, `pg_isready` reported no response, and a subsequent `pg_ctl status` reported no server. Read-only listener checks again showed no endpoint. No database setup helper, migration, fixture, session or browser regression was run. The current execution context therefore cannot keep or reach this server. The one approved retry is consumed; any further launch needs another Owner decision, with a host-owned process context considered only after approval. No process was terminated, no port was changed, and the API/web ports remain unused.

## Proposed bounded resumption plan

The approved startup and retry attempts above are exhausted. Any further startup or new disposable database now needs another explicit Owner decision. If the Owner approves a new host-owned startup after the sandbox reachability limitation and port reservation are resolved:

1. Recheck no listener/PID, the retained cluster path `.env.checkpoint-tools/pg-demo-20261006-a7c9`, PostgreSQL 18.6 and expected system identifier `7693570241708228348`; stop on any mismatch.
2. Start that exact existing cluster once with ordinary recovery, no reset, reinitialization, repair, configuration edit or manual WAL/PID action. Verify the live data directory, system identifier, loopback address and port before proceeding.
3. Verify the exact target name is absent. Create only `sense_mw_i02_validation_20261009_test` on `127.0.0.1:57434`, apply the existing 116 migrations, and use only the reviewed synthetic four-persona fixture and existing guarded harness.
4. Run the authenticated regressions against current source; capture Owner, Designer initial/Waiting, Site Employee and Owner setup loading/denied states where supported at 1440, 1024, 390 and 320px. Verify disclosure open/close, management isolation, mobile search, row overflow, fixed-nav clearance and existing task views/commands. Compare each available state to the hash-verified approved prototype at the same viewport; label unsupported prototype states and backend-rule differences.
5. Rerun the affected frontend suite, pinned typecheck/lint/build and scoped authenticated PostgreSQL/browser checks. Record baseline failures separately.
6. Revoke run-owned sessions, stop only manifest-owned API/web processes, drop only the manifest-bound target after checking its OID/marker/identity/no connections, compare the remaining catalog, and return the cluster to its prior stopped state only if it has no unowned connections. Stop and ask Owner if any guard fails.

**Functional Reliability: BLOCKED** and **Prototype Visual Fidelity: BLOCKED** for post-refinement acceptance. The prior final9 PASS statements apply only to their earlier source snapshot. The approved startup retry logged ready but was not reachable and did not remain running in this execution context; no database was created. Do not launch again without another Owner decision.

## Owner-approved host-owned startup attempt — 10 October 2026

The Owner approved one hidden host-owned startup attempt against the exact retained cluster and port. `pg_ctl` exited 1; no startup log was created. An immediate read-only check reports `pg_ctl: no server running`, no listener on 57434, and no database preflight was possible. The one approved attempt is consumed. No setup helper, database creation, migration, fixtures, sessions, or browser run occurred. I did not make another attempt. Authenticated post-refinement validation remains blocked pending a new Owner decision and a working approved runtime path.

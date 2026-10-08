# Current UX integration verification — 8 October 2026

Status: **IN PROGRESS.** Owner authorized integration of the current presentation edits. Existing accepted S18/S27 evidence does not accept this modified checkout.

## Latest full-gate attempt — 8 October 2026

Pinned Node24.19.0/pnpm11.19.0 runner `.env.s27-tools/verify-s27-1791476374393.log` passed typecheck, lint, API unit (281/281 across49 suites), and web unit (231/231 across34 files). API/PostgreSQL integration ran62 suites: 52 passed, 10 failed; 343 passed, 30 failed. Failures are fixture setup collisions on `accounts_one_owner_key` because existing dedicated suite databases already contain Owner rows. The aggregate stopped before package build and browser checks; an independent contracts/API/web production build and PWA generation passed. Earlier accepted `pnpm verify` evidence is for its recorded source fingerprint and does not override this current-tree result.

No existing test database, source clone, or snapshot was reset. Read-only inspection confirms `template1` on ports57433 and56436 is clean (UTF8, C locale, default-only public schema, no relations/functions, plpgsql only), but fresh `CREATE DATABASE ... TEMPLATE template1` fails PostgreSQL58P01 because `base/1/4171` is missing. `template0` likewise rejects connections / prior creation failed on `base/4/4171`. Read-only migration/snapshot preflight from the earlier accepted run still reports22 suite targets at115, source109 and154 retained snapshots unchanged. The missing physical files are infrastructure defects; no repair or restart was attempted.

The Owner authorized disposable PostgreSQL18.6 clusters on loopback ports58440/58441 and expanding only the local ignored runner allowlists. A current attempt to initialize the first cluster hangs during PostgreSQL's Windows shared-memory default probe (after `selecting default max_connections` / at `shared_buffers`); the process was stopped, and the second cluster was not started. No new cluster or database was created, and no existing cluster, database, accepted source or snapshot was modified. PostgreSQL integration remains unverified for the current checkout and the aggregate browser gate has not run. Do not mark the current UI source fully accepted until those gates pass.

## Changes and focused checks

- Removed the proposed automatic historical `.env.s05.test` API fallback and global hardcoded Vite preview port. The dedicated preview launcher supplies its configuration explicitly.
- Fixed Project Health same-project history/reselection clearing the loaded detail without a replacement read. Its focused suite passed6/6.
- Updated Workforce tests to navigate the selected operational section, retaining policy payload and management access assertions. Settings/Workforce focused suites passed38/38; direct Notifications settings coverage checks Owner/staff section visibility.
- Updated Project scope-decision tests to open Activity, retaining reason, CSRF and exact payload assertions. Project/Health focused suites passed13/13.
- New review-escalation notices include the existing exact round ID; project lead-exit hold notices include the existing exact project ID. Added persisted route expectations. Retained notices and delivery/authorization rules are unchanged. The added colleague fixture initially lacked the existing required project.view grant; after supplying that fixture grant, focused real PostgreSQL Task/Review passed23/23 across2 suites. No application permission was weakened.
- API units use two workers by default with a validated optional `API_TEST_WORKERS`. Assertions and five-second timeouts remain unchanged. Two default-worker runs failed different storage timeouts; isolated NAS5/5 and Library4/4 and unchanged two-worker API281/49 passed.

## Aggregate evidence

Pinned Node24.19.0/pnpm11.19.0 run `.env.s27-tools/verify-s27-1791475962262.log` passed typecheck, lint, API281/49 suites and web226/33 files. A separate pinned `pnpm build` exited0 for contracts, API and web; existing large-chunk and ineffective dynamic-import warnings remain. PostgreSQL acceptance fails on existing singleton Owner fixture collisions (`accounts_one_owner_key`) in the reused target. Browser gates are not established by this run. Prior failed attempts remain recorded in their logs. The recorded source fingerprint matched with zero changed files after these checks.

The reviewed fresh-target helper was attempted to avoid resetting retained databases. `provision-s27.mjs` failed at fresh `CREATE DATABASE ... TEMPLATE template0` with PostgreSQL58P01: missing file `base/4/4171`. No successful new acceptance target was reported. Do not infer that all databases are down or attempt destructive template repair.

Subsequent host read-only preflight `.env.s27-tools/migration-status-1791476178659.json` passed22 isolated targets at115 plus accepted source109; all154 populated-clone original-table snapshots remain unchanged. This proves accepted target readiness/preservation, not full application acceptance. No restart, reset or source migration was performed.

## Limits and next steps

After the passing typecheck/lint/unit/build evidence, the notification test fixture grant was corrected and verified separately23/23. A subsequent concurrent edit changed `apps/web/src/app.tsx` and added passkey-registration helper/test files. Those later passkey edits are outside this run's fingerprint and have not been accepted by its results. The latest checkout as a whole remains unverified.

Exact GPT-6.1 Sol supplied context, safety review, notification route scope and timeout diagnosis. GPT-6 Luna supplied focused regressions and notification implementations. Both agents subsequently failed with the account usage limit. Required final Sol review and any PostgreSQL template repair interpretation remain pending; no model substitution or measured allocation ratio is claimed.

Resume with Sol diagnosis of template creation failure, then provision separate fresh targets using reviewed guards, migrate only those targets and rerun PostgreSQL/browser gates. Preserve source109, accepted snapshots and existing test/server data. Current preview59223 responds200 and API59224 readiness responds200; its empty database is not authenticated workflow acceptance. S23 policy-dependent metrics, remaining notification/operation parity, authenticated responsive visual review, actual-project R-104/R-105, hosted gates and production remain unverified. Git push remains subject to the previously reported external-destination approval rejection.

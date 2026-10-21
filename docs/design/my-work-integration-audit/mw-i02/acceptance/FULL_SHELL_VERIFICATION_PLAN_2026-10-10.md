# MW-I02 full-shell visual verification — proposed single run

Superseded preparation plan: use `FINAL_CONSOLIDATED_ACCEPTANCE_PLAN_2026-10-10.md` for the next authorization and execution sequence, including the source-only readiness gate and guarded independent Review stage.

Status: preparation complete; **Owner authorization pending**. No database call, setup, authenticated browser or application environment was executed during preparation. No additional application UI changes. Prior successful evidence remains intact; MW-I02 IN PROGRESS, MW-I03 excluded.

## Exact target and execution context

- Existing Windows user, Medium Mandatory Level host context, pinned Node24.19.0/pnpm11.19.0. Request only the minimum per-command host access; no persistent elevation or security changes.
- Retained PostgreSQL18 data directory `D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9`; system identifier `7693570241708228348`; endpoint `127.0.0.1:45434`.
- Only disposable database `sense_mw_i02_validation_20261009_test`, existing116 reviewed migrations and existing synthetic fixtures. Three additional ordinary run-local tasks plus the two existing run-local Site Employee tasks generate five genuine exit holds through the supported Owner API.
- API127.0.0.1:59442 and web localhost:59443; setup refuses conflicting ports. No alternate endpoint or target.

## Mandatory read-only preflight, within authorized run

Verify token Medium SID `S-1-16-8192` using `C:/Windows/System32/whoami.exe /groups`; pinned versions; `pg_ctl.exe -D <exact retained directory> status`; disk identifier via `pg_controldata.exe`; live TCP listener ownership via `Get-NetTCPConnection`; PostgreSQL executable/data-directory command lines, parent/PID identity and owner via `Get-CimInstance Win32_Process`/`Invoke-CimMethod GetOwner`; reconcile the retained `postmaster.pid` with the process tree. Do not alter PID files. Verify no conflicting process owns either app port. Any unavailable or ambiguous identity check stops the run.

Then run the existing read-only `check-absence.mjs`. It verifies live server address, port, directory and system identifier in a READ ONLY transaction and exact database absence. The guarded setup independently repeats identity/absence/catalog guards before creation. Current live state is **not claimed from historical evidence**; these checks must pass immediately before setup.

If stopped, mismatched, already-existing target, process/port conflict or failed safety guard: STOP. No PostgreSQL startup/restart/stop, retry, fallback, repair, permissions/firewall/port-reservation changes or unrelated service changes.

## Exact execution sequence after preflight

From repository root in the authorized host context:

```powershell
$mwNode = 'C:\Users\HI\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$mwHarness = '.env.checkpoint-tools/mw-i02-acceptance'
& $mwNode "$mwHarness/check-absence.mjs"
# Only after successful read-only identity/ownership/absence guards:
& $mwNode "$mwHarness/setup.mjs"
# Set this to the EXACT manifest path printed by this setup invocation:
$mwManifest = '<exact newly created run manifest path>'
& $mwNode "$mwHarness/run-task-integration.mjs" $mwManifest --stage tasks
& $mwNode "$mwHarness/run-tests.mjs" $mwManifest
# Run independently even if browser assertions fail, only while safety guards hold:
& $mwNode "$mwHarness/run-task-integration.mjs" $mwManifest --stage review
# Attempt in finally after every test outcome, only when cleanup guards pass:
& $mwNode "$mwHarness/cleanup.mjs" $mwManifest
```

One setup, one monolithic browser invocation, no retries. Failed task/browser assertions are retained; review integration is independent when safe. A safety failure stops dependent execution. Setup failure uses only a valid manifest/marker for any guarded cleanup; never guess a target or bypass its guards.

## Prepared harness changes

Current test-only changes are `.env.checkpoint-tools/mw-i02-acceptance/acceptance.spec.ts`, `run-task-integration.mjs`, `readiness.mjs` and `setup.mjs`. The Review stage is independent of browser success; setup runs readiness before any database access. Accepted frontend hashes remain unchanged.

- Existing captures1440×900,1024×900,390×844,320×740; mobile touch loop now uses the same320×740 height.
- Capture baselines wait for source/count settlement, retain keyboard phase checks, then use a real heading click to leave Search focus and restore strip/window scroll to0. This prevents focus-disclosed Apply/Reset from accidentally defining the initial state.
- Current concise Waiting text asserted, with existing exact API/URL/task assertions retained.
- Record main/account/task-local geometry, phase/source disclosure and focus state, queue top separately from first-task top/bottom, sticky header/fixed-navigation bounds, available unobstructed height, visible pixels/ratio and minimum scroll estimates. Record actual native first-task scroll delta and post-scroll clearance plus a separate scrolled screenshot. Do not force visibility or replace Owner visual judgment with a pixel pass threshold.
- Same journey adds explicitly labeled controlled review-source loading/stale503/denied403/initialfailed503 supplements, using real baseline total/items and continuing real requests on recovery. No fabricated healthy totals or authorization bypass. These supplements remain separate from actual server-backed fidelity screenshots and cannot claim real server denial/failure.
- Strict harness TypeScript validation and the hash-bound source readiness gate PASS; fresh affected frontend tests45/45, typecheck, lint and build PASS. These checks do not establish authenticated runtime success.

## Required evidence and comparison

Fresh unique manifest run directory; preserve all older captures/manifests. Designer initial/Waiting, populated Site Employee, Team Leader and confirmed employee-less Owner five genuine holds at all four widths. Positive management remains expanded; independently confirmed-zero compaction and uncertain-source visibility are checked separately. Retain existing search/filter/four views/pagination/keyboard/touch/task-command/role-isolation tests. Mobile clearance uses actual fixed navigation, including the shorter740px viewport.

Exact approved prototype SHA256 rechecked during preparation: `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`. Source: `D:/app/reference from codex chat/Sense_Studios_My_Work_UX_Package/Sense_Studios_My_Work/prototype.html`. Capture/compare matching dimensions, scroll baseline and equivalent selection; prototype sample grouping/counts are not canonical data. Report A material MW-I02 / B backend-driven / C shared-shell MW-I09 / D future MW-I03–08 differences. Keep queue and first-task metrics separate. Preserve frontend45/45/typecheck/lint/build evidence; report new failures separately from known19 baseline failures.

## Mandatory cleanup and risk

Attempt existing manifest-bound cleanup after every outcome when safe: revoke only run sessions, stop only manifest-owned API/web identities, verify exact target name/OID/marker/system identifier/connections and other-database catalog, drop only the database created by this run, and verify remaining catalog unchanged. Stop on guard failure without unsafe deletion. Leave retained PostgreSQL running; retain recovery copy and historical manifests.

Risk: synthetic writes confined to the exact disposable database and run-owned processes/sessions. No production data, schema contracts or unrelated database writes; no retained-cluster lifecycle operation authorized. Final Functional Reliability and Prototype Visual Fidelity reported independently; stop for Owner acceptance without declaring COMPLETE or starting MW-I03.

Actual preparation routing: GPT-6.1 Sol intake/review, GPT-6 Luna bounded supplemental harness code, parent measurement/plan preparation. No claim that static syntax checking verifies runtime success.

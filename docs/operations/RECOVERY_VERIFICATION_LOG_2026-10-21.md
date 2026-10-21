# Recovery verification log — 21 October 2026

Status: IN PROGRESS. These are current-session results with explicit source boundaries, not final acceptance or production readiness.

## Preservation and database

The complete regular-file snapshot was restored and checksum-verified: 114,964 files, with 94 link records and all 69 Git refs retained in the verified history bundle. Existing archives, deferred designs, failed rehearsal evidence and the original Git index/diffs remain preserved privately.

The verified migration118 logical backup was restored into a new isolated target. Applying migration119 preserved the hashes of all 173 pre-existing tables and 995 rows; the sole new table was the empty task-creation receipt table. Existing migration ledger entries were unchanged. No restore or migration was applied over the retained database.

The retained cluster was started after cold-copy preservation and identity checks. Read-only checks verified system7693570241708228348, OID145606, database `sense_latest_retained_20261014_test`, all119 migration names/checksums, 174 tables and1,011 rows. After interruption rehearsals, every table count and content hash exactly matched the pre-rehearsal fingerprint. No retained records changed in that interval.

## Passing checks

Native isolated run `1792554465544-b21a845c204f`, source fingerprint `7d8ff78ac3ff787b2398771641e2796fa177ad4200c6ae1cd6c609aafd310859`, passed typecheck, lint, API507 tests/66 suites, web616 tests/63 files, PostgreSQL420 tests/64 suites, nine additional receipt/concurrency cases, production build and26 local-runtime/NAS mock tests. All24 new targets had the reviewed119 migration ledger and restricted runtime roles. This was the native equivalent of the supported gates; it is not reported as a literal `pnpm verify` invocation. Subsequent browser/tooling corrections require their own evidence.

Other recorded passes include104 focused Dashboard/Site/task cases,117 recovery-guard cases,17 native-harness safety cases, seven staging operations cases, frozen dependency installation, JavaScript syntax/PowerShell parsing, and actual synthetic Docker Compose configuration rendering. Docker engine startup and production NAS operation were not tested.

## Staging and browser boundary

The immutable matched release `71d47eb63d44763a4317b1e23effa7cc4fca72fc`, build `71d47eb63d44-1792555254508`, was served at `http://localhost:59443/` with API59442 and the retained database45434. Public web/API identity and exact database/schema readiness passed. The release includes required API font assets and sealed artifact-local dependency links.

Actual anonymous canonical-origin checks passed at1440,390 and320 pixels, with matching web/API identity, no page errors or horizontal overflow. The320-pixel capture was visually inspected. Authenticated57-case desktop/mobile acceptance is still running and has exposed obsolete UI selectors; no complete browser pass is claimed.

An isolated cached-browser rehearsal used the actual older production Workbox artifact and persistent browser profiles. Pending IndexedDB commands and a local draft survived upgrade and offline reopen. A genuinely old, uninstrumented cached page required one explicit hard reload; users must save their work first. This was not the user's personal browser profile. The current artifact passed this rehearsal; later release artifacts require rechecking.

## Recovery findings still open

The actual interruption rehearsal exposed a race between process termination, Node's child exit event and the supervisor's listener check. A web interruption caused `REQUIRES_ACTION` rather than immediate child recovery. Manual scheduled-task restoration succeeded, and a subsequent API interruption recovered. Abrupt supervisor termination did not automatically recover within the180-second rehearsal deadline despite Windows task retry settings. The first rehearsal is FAIL; its web step was influenced by manual restoration and is not accepted as automatic recovery evidence. Corrected runtime and a new complete rehearsal are required.

Windows denied the S4U startup registration and the elevation prompt was canceled. A normal-user interactive task, `Sense Studios Canonical Staging`, was installed and manually invoked successfully. Startup after HI signs in is configured; before-login startup and actual reboot behavior remain unverified.

Hosted CI reached isolated fixture provisioning and failed because its historical provisioner expected116 migrations. It has not passed the119 candidate yet. DraftPR1 remains open against `codex/sense-release`; the remote default branch has not been changed or final release merged.

## Subsequent verified correction — candidate5fc6d8f

Candidate `5fc6d8f1b9eb3b76ddc1706280350a3d32d36196`, build `5fc6d8f1b9eb-1792557200674`, corrected the process-exit/listener race and added a bounded bootstrap retry after abrupt supervisor termination. It refuses automatic retry when the supervisor records `REQUIRES_ACTION`. Existing bootstrap files were backed up before updating the stopped installed bootstrap; the scheduled-task identity and pinned executable were checked.

All three actual interruption steps passed without manual intervention: web3500→7736 and API20768→35880 under the same supervisor, followed by supervisor38792→10760 with owned-orphan cleanup and matched-pair readiness. This proves bootstrap recovery inside the installed scheduled task; it does not prove Windows reboot or before-login startup. Evidence: private `live-process-recovery-1792557407292.json`.

All174 retained table counts/content hashes remained identical after the full rehearsal. Live canonical anonymous checks again passed at1440/390/320; the exact-artifact historical-cache/pending-command/draft rehearsal passed. Current candidate quality passed typecheck/lint/build, API507, web617 and26 runtime/NAS cases. Eight staging operations checks passed, including an absent-process-before-exit-event regression and refusal of a reused PID. PostgreSQL420/64 and nine receipt cases remain supported by the prior full run with identical API/schema/contracts hashes at this candidate.

The57-browser run at source `9f5e0034a5f13fe3dbf15123d4056b2b832bf1a37ca145c90694847b27685360` finished53 passed/four failed/no skipped. The remaining failures were the still-present obsolete client sign-in button and ambiguous task list/detail status selectors; both were corrected for the next fresh run. The earlier full run finished42 passed/15 failed/no skipped and also found missing mobile Tasks/Documents navigation, fixed with retained navigation assertions. No final browser acceptance is claimed yet.

Hosted provisioning passed119 but exposed guard-port mismatches and an old one-off fixture restriction. Commit1fdbd6e changes only tests/fixture configuration: the containers now listen on exact guard-approved58440/58441, a separate manifest-bound CI parity database is cloned and verified, and committed-subtask checks accept a current explicit hosted119 target. All role/negative/persistence assertions remain. A fresh quality/browser run and hosted run are in progress. The attempted bounded stage on a changed-source manifest correctly refused execution before fixture writes; no bounded pass is claimed.

## Current acceptance — source304889a3

Commit `2e3b7f5a0fb17db6e3751a2b03fd2fd8b0487f83` has source fingerprint `304889a3ec4fb1cbfe440f7aaa42689df2cfd2e4dde7cfde88e7aa06c04f7485` over663 files. Fresh browser run `1792562368020-3f9aa9eaf852` passed all57 desktop/mobile cases with zero failures/skips/retries, then passed two bounded project database cases and all five additional browser cases across1440/1024/390/320. These exercise the real application and APIs with isolated synthetic records; they do not modify retained staging accounts.

The native full final run `1792562886057-a726200a514d` passed at the identical fingerprint: API508/66 suites, web617/63 files, PostgreSQL420/64 suites, nine additional receipt/concurrency cases, typecheck/lint/production build and26 runtime/NAS mock checks. No failures or skips were reported. This is the complete supported native gate sequence, not a literal `pnpm verify` command. Its24 fresh targets were checked at119 with restricted runtime roles and stopped with data/evidence preserved. The latest local lint and script syntax checks also passed after the fixture-only corrections.

Hosted CI has passed provisioning, typecheck, lint, API/PostgreSQL/frontend tests, production build and phone-delivery validation. Hosted browser and container/recovery gates remain in progress; no whole hosted pass is claimed yet.

Hosted fixture corrections preserve API-test data while preparing distinct pristine browser clones. The API parity target receives only its own synthetic Organization/Owner, matching native setup. Browser manifests bind new generated names/suffixes, URL host/port/protocol and role. API and browser targets are never reset or restored over existing targets. The build step explicitly uses production mode while test services retain test mode.

## Review and deferred scope

Read-only inspection confirmed that the preserved retained staging role `sense_demo` is the original PostgreSQL superuser, with CREATEDB/CREATEROLE/BYPASSRLS. Recovery has not changed that role or granted new privileges. The staging listeners are loopback-only, providers/bootstrap/workers are disabled, and this is local test staging only. Least-privilege production runtime provisioning remains a concrete security gate; the restricted native/hosted acceptance roles do not prove the retained runtime role is restricted.

Actual reviews used current Codex and independent Codex agents under the Owner's explicit model exception. Independent review covered feature reconciliation, test provisioning and release security; later changes require current-agent review where independent agents are unavailable. No Opus or Sonnet review is claimed.

Client-password migration120, unfinished V10 customization/widgets/pins/timer/performance/global composer, unaccepted archive alternatives and ArchiFlow remain deferred. Actual-project R-104/R-105, hosted deployment, production NAS/offsite backup/key custody/restore and production acceptance remain unverified.


## Hosted fixture corrections and Windows startup boundary

Hosted2e3 completed52/57 browsers: S27 screenshot containment (two), stale AUT migration port (two), and a Library second-acknowledgement response race (one). After screenshot correction, e8 completed55/57 with only AUT port failures. One duplicate e8 job exceeded the default5-second real-clock timer test budget; the other passed all420 PostgreSQL cases. The timer case deliberately waits3.3seconds plus fixture/transaction work; only that case now has15seconds. Library now waits for the exact second-version acknowledgement response and keeps the count2 persistence assertion. AUT validates the exact generated disposable manifest and connected58440 identity; no retained target is enabled. Commit9d033c5 is pushed; hosted acceptance is pending.

Vite now rejects explicit59443 and enforces strict port binding to prevent fallback onto the canonical port. Actual development/preview refusals and a separate live loopback development port passed. The pg_ctl inherited-output fix uses ignored stdio with its existing dedicated log. An identity-checked stopped disposable PostgreSQL18 cluster cold-started in311ms and was stopped cleanly; retained PostgreSQL was not stopped for this rehearsal.

The scheduled task later returned0xC000013A. A direct hidden launch reached READY. Experimental hidden script-host and PowerShell task actions were preserved, but Windows left the scheduled launcher sole thread in Wait/Suspended with zero CPU before application execution. The final launcher uses hidden PowerShell, a retained child process handle, and process-only RemoteSigned for the generated local script; system execution policy remains Restricted. Task XML is backed up; principal/triggers/settings are compared before/after action-only updates. Start validates the single exact action, working directory and generated script. Ten current staging tests passed, including actual hidden child exit7. This does not certify scheduled startup, S4U or reboot. The exact stalled task was stopped and the approved2e3b7f5 release restored with the verified hidden direct bootstrap. Canonical1440/390/320 checks passed again; all174 retained table fingerprints matched the original baseline.


### Owner-cleared launcher and final native candidate

Owner replied “TRY NOW I ALLOWED IT.” The exact guarded owned stop/scheduled start then exited0 and reached READY (private staging-owner-allowed-start.json); real canonical1440/390/320 checks passed in browser/live-1792566026886/report.json. The OS-suspended-launcher observation is historical; actual reboot/before-login remains unverified. No security/process-control bypass was performed by this recovery.

Native final candidate3b8303aeefaad393fb21c5bb07eeb02d8555e1f4 at source bf059b02d19dc48c0bb99c8c96166a591b47359d4f70742ed2df696f525f3bb0 completed full api-all: typecheck/lint, API508, web617, PostgreSQL420, nine receipts, productionbuild and26 runtime/NAS cases. Marker reports/api-all-completed.json finished2026-10-21T07:06:57.065Z. Isolated targets were stopped. Exact-candidate browser run1792566500000-3b8303a00002 remains in progress.

The exact3b artifact built and passed isolated historical-cache/precache/offline/pending-command/draft preservation; read-only119 binding and174 retained table fingerprints are intact. Hosted9d browser55/57 failed only AUT because the freshly cloned browser runtime URL retained the API-clone migration URL. Its exact-same-database guard refused execution, preserving fixtures. Correct the generated browser migration URL, keeping this guard unchanged; final hosted acceptance remains pending.


Final native browser run1792566500000-3b8303a00002 completed all57 desktop/mobile, five bounded browser journeys and two bounded project-database cases with zero failures/skips/retries at the identical bf059b02 source. Both final native clusters were stopped and preserved. The subsequent source delta is only scripts/ci/prepare-disposable-postgres.mjs: set the browser migration URL from the same freshly cloned DATABASE_URL target, then assert their database names match before writing the fixture manifest. Existing guarded AUT worker identity validation is unchanged. No application/API/contracts/schema/runtime behavior changes after this full native acceptance. Hosted acceptance of this fixture-only correction remains pending.

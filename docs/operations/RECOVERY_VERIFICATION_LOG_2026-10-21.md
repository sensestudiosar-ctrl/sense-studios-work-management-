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

## Review and deferred scope

Actual reviews used current Codex and independent Codex agents under the Owner's explicit model exception. Independent review covered feature reconciliation, test provisioning and release security; later changes require current-agent review where independent agents are unavailable. No Opus or Sonnet review is claimed.

Client-password migration120, unfinished V10 customization/widgets/pins/timer/performance/global composer, unaccepted archive alternatives and ArchiFlow remain deferred. Actual-project R-104/R-105, hosted deployment, production NAS/offsite backup/key custody/restore and production acceptance remain unverified.

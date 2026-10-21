# Sense recovery acceptance — 2026-10-21

Status: IN PROGRESS. Final exact-source native acceptance passed; hosted gates and the release-branch deployment receipt are pending. This report does not certify production or actual-project R-104/R-105 acceptance.

## Authoritative application and release

Canonical source: `D:\app\sensestudios work management app`. Integration: `codex/sense-integration`. Release: `codex/sense-release`, through recovery PR1. Reviewed candidate: `3b8303aeefaad393fb21c5bb07eeb02d8555e1f4`; application/test/operational-source fingerprint: `bf059b02d19dc48c0bb99c8c96166a591b47359d4f70742ed2df696f525f3bb0`. Final promotion requires the explicit matched release commit and private artifact-manifest SHA256. Read the actual deployed identity from `/release.json`, `/api/v1/health/release`, the visible release footer and `pnpm staging:status`.

Canonical staging: **http://localhost:59443/**, with the matched API on loopback59442 and retained PostgreSQL on loopback45434. Immutable artifacts contain web, API, contracts, dependencies and pinned Node24.19.0 together. Builds do not promote themselves or migrate retained data. Historic releases, configuration and source evidence remain outside the served root. Experimental Vite servers reject59443 and cannot automatically fall through to another occupied port.

## Consolidated scope and discrepancies

The existing approved Sense monorepo remains the application: authentication/permissions; Dashboard; My Work and task creation/details; projects/planning; reviews/corrections; People/workforce; Site; finance/reporting and the approved later bounded modules. The feature matrix records retained source and authorization boundaries. This recovery corrects factual Dashboard presentation, configured Site employee snag counts, mobile route access, stale update-notice handling, test isolation and release/runtime consistency. It preserves existing routes, contracts, real persistence and backend business rules.

ArchiFlow is excluded. Client-password migration120 and its incomplete implementation remain preserved and deferred; existing client codes/passkeys remain. Unfinished V10 widgets/customization/timer/performance/pins/global-composer alternatives remain deferred rather than promoted as approved behavior. Archived work without completed acceptance is preserved. No completed approved feature was established as archive-only and silently discarded. See `RECOVERY_FEATURE_MATRIX_2026-10-21.md` for the detailed reconciliation.

## Preservation and database compatibility

The original source/configuration/evidence snapshot restored and checksum-verified114,964 regular files (3,465,282,876bytes), retained94 link records and excluded19 dependency roots. All69 original Git refs are preserved in a verified all-ref bundle; original index/diffs, archives, retained configuration and Owner references remain recoverable in ignored `.env.consolidation-20261021/`. Failed rehearsal artifacts are also retained.

The bounded candidate contains119 migrations. Existing110–115 were not replayed. All119 successful retained-ledger names/checksums match the candidate; migration120 is absent. An isolated populated118→119 restoration preserved all173 prior tables/995rows and added an empty receipt table. Read-only retained checks preserve all174 tables/1,011rows with unchanged content hashes. No retained migration, seed/reset or record overwrite was performed by this recovery. The original retained `sense_demo` role has broad PostgreSQL privileges; production least-privilege remediation remains a separate gate.

## Verification evidence

Pinned toolchain: Node24.19.0 / pnpm11.19.0. The final exact-source native runs passed508 API tests/66suites,617 web tests/63files,420 real PostgreSQL tests/64suites, nine receipt/concurrency cases, all57 desktop/mobile browsers, five bounded real-browser journeys, two bounded project-database cases, typecheck/lint/build and26 runtime/NAS cases, without failures/skips/retries. The full native runs share the bf059b02 fingerprint. The subsequent delta is only the hosted fixture generator assigning the migration URL to its new browser database; application/contracts/schema/runtime code remain identical. Exact results and source hashes are recorded in `RECOVERY_VERIFICATION_LOG_2026-10-21.md`.

Ten current staging safety tests pass, including a real hidden child that exits7. Actual Vite development/preview refusal and a separate loopback development server passed. A stopped, identity-checked disposable PostgreSQL18 cluster cold-started in311ms with the corrected output handling and was stopped cleanly. Native tests use PostgreSQL18; hosted fixtures use PostgreSQL17.10.

The exact candidate artifact passed the historical cached-worker rehearsal, preserving a pending capture command and local draft. Clean profiles and upgraded cached profiles retained their offline shell. The old worker required one explicit online Ctrl+Shift+R after saving work; no browser storage was cleared. These are isolated persistent profiles carrying the actual historical worker, not the Owner's personal browser profile.

Actual owned web/API/supervisor interruption recovery passed at its recorded artifact. After Windows suspended scheduled launchers before code execution, the Owner allowed the process and the guarded scheduled start reached READY again. Live canonical desktop1440/mobile390/320 checks passed. Before-login startup and an actual Windows reboot remain unverified; the installed task uses HI's interactive logon identity because S4U registration/elevation was unavailable. Hosted CI and final deployed matched-release verification remain pending.

## Permanent demo integration procedure

1. Map the supplied HTML/UI/UX demo to its existing Sense page and identify the approved behavior and requirement IDs. Escalate material product-rule conflicts to the Owner.
2. Implement directly in `apps/web`, retaining existing routes/components/APIs/shared contracts and backend authorization/business rules. Use real data and preserve unaffected features and unsaved work. Keep experimental previews labeled and separate.
3. Reproduce defects, verify persistence and relevant Owner/Team Lead/Employee/Site Employee access, and test loading/empty/error/denied/mobile states. Run the applicable pinned checks and review the exact candidate.
4. Explicitly stage only reviewed files and commit through the integration/release workflow. Build matched web/API artifacts from the explicit approved40-character commit; verify119 compatibility without migrating retained data automatically.
5. Promote only that accepted immutable artifact. Verify the canonical URL, matching visible web/API commit/build identities, clean/cached browsers and owned-process recovery. Preserve prior release artifacts and pointers for explicit compatible rollback.

Actual reviewers: current Codex and independent Codex agents, under the Owner's explicit exception for unavailable Opus/Sonnet. Model substitution does not waive verification. Full evidence, hashes, historical failures and production/hosted/reboot limitations are recorded separately; unrun checks are not reported as passed.

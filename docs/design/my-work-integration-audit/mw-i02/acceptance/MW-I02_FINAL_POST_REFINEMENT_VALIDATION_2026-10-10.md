# MW-I02 Final Post-Refinement Validation — 2026-10-10

**Status: IN PROGRESS.** This run is evidence for Owner review; it does not mark MW-I02 complete or authorize MW-I03.

## Environment recovery

- The default Codex command context was a restricted Windows token. It reproduced the pnpm/Node `EPERM` realpath failure and TCP `EACCES`; commands in the Owner-authorized Windows Medium Mandatory Level context could resolve the pinned runtime and connect to the test server. Server, API, frontend, Playwright, and validation were run in that same Medium context. This isolates those symptoms to the restricted execution context, not application code.
- The former port 57434 lies inside the Windows dynamic range and had a historical TCP/IP ephemeral-port-exhaustion event. No historic owner of the failing socket was established. Owner-approved port 45434 was verified unowned and outside current excluded ranges before use.
- PostgreSQL 18 reported the retained data directory and expected system identifier `7693570241708228348`. It started once on `127.0.0.1:45434`, reached readiness, and accepted connections from the same Medium context. The dedicated cluster and the test runner therefore communicated successfully in that context.
- The recovery copy remained available and its canonical content-manifest hash matched `87d3ade8f6f9a6f73c5c85e1e37ea84f5cc4d661410283545f6eb615263e1007` before the one startup. No data directory repair, reset, reinitialization, WAL/PID manipulation, port reservation change, permission change, or unrelated service action occurred.
- The exact one-run disposable database `sense_mw_i02_validation_20261009_test` was set up from guarded synthetic fixtures and existing migrations (116). The pre-run absence and live cluster identity checks passed.
- Manifest-bound cleanup passed: run sessions revoked; only the recorded API/web PIDs stopped; exact disposable database dropped; before/after other-database catalog snapshots matched. Final connection inspection found only PostgreSQL internal background workers. The retained test cluster was then stopped and `pg_ctl status` confirmed no server running.

## Changed harness files

Only the five approved harness scripts were updated from 57434 to 45434, plus the acceptance spec was corrected to address current controls and persona behavior. No application source, production configuration, schema, historical manifest, unrelated service, or recovery-copy content was changed.

- `.env.checkpoint-tools/mw-i02-acceptance/setup.mjs`
- `.env.checkpoint-tools/mw-i02-acceptance/check-absence.mjs`
- `.env.checkpoint-tools/mw-i02-acceptance/run-task-integration.mjs`
- `.env.checkpoint-tools/mw-i02-acceptance/run-tests.mjs`
- `.env.checkpoint-tools/mw-i02-acceptance/cleanup.mjs`
- `.env.checkpoint-tools/mw-i02-acceptance/acceptance.spec.ts`

Harness fixes in the spec use exact heading locators, recognize the current Owner empty-state wording and selector, avoid asking an Owner without employee identity to use employee-only controls, and accommodate the observed delayed shared-shell logout transition after the server has revoked the session.

## Checks and authenticated evidence

- Pinned Node 24.19.0 and pnpm 11.19.0 were used. Prepending the existing `.env.s22-tools/bin` shim to the child-process `PATH` was necessary because nested pnpm otherwise resolved 11.25.0. No system-wide dependency was installed.
- Typecheck: **PASS** (contracts, API, web).
- ESLint: **PASS**.
- Production build: **PASS**, with existing chunk-size and ineffective dynamic-import warnings.
- Complete web unit suite: **FAIL** — 231/250 passed; 19 failed, with two uncaught Dashboard errors. Failures include current shared-shell auth/workspace-navigation behavior; no application code was changed to mask them. See the associated run output in the Codex task history.
- Authenticated MW-I02 Playwright acceptance: **PASS** — one test, 22.8 seconds. Owner, Team Leader, Designer, and Site Employee paths were exercised; captures contain Owner initial, Team Leader initial, Designer initial and Waiting-selected, and Site Employee initial at 1440, 1024, 390, and 320 CSS pixels (full-page and viewport screenshots). Owner setup loading/denied screens were not separately captured: the available journey bootstraps and authenticates the Owner; it does not expose a distinct Owner setup loading/denied view after setup.
- Task integration stage: **PASS**, 2 suites / 26 tests. Review integration stage: **PASS**, 1 suite / 3 tests.
- Current Owner capture has zero personal tasks and explicitly says the account has no active employee identity. However, its authorized employee-exit reassignment section also reports **0 items**. The required five management reassignments and their five-item disclosure behavior were therefore **not verified**. No task rows were invented to force the expected count.
- All 28 fresh geometry records report no horizontal document overflow. They do not alone establish that every control is usable or that a fixed navigation element never occludes actions. The Designer Waiting mobile capture shows a floating action button and fixed bottom navigation; the full actual images must be visually reviewed at native size before acceptance.
- The Owner capture shows only the management section’s aggregate zero count and empty state. Since there were no management records, the run could not verify either the five-item disclosure or the contents exposed by its expanded detail; no claim about unauthorized-information isolation is made from this empty state.

## New actual screenshots and prototype comparison

All actual screenshots below were produced after the latest application-source changes in the successful authenticated run. The exact approved prototype images are under `prototype/`; the matching viewport files are linked beside them. Actual fixtures are synthetic and run-specific, so compare layout and interaction states, not literal task names or totals.

| State | 1440 actual / prototype | 1024 actual / prototype | 390 actual / prototype | 320 actual / prototype |
|---|---|---|---|---|
| Owner, no active employee identity | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-owner-initial-1440.png) / [prototype](prototype/prototype-owner-my-work-1440.png) | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-owner-initial-1024.png) / [prototype](prototype/prototype-owner-my-work-1024.png) | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-owner-initial-390.png) / [prototype](prototype/prototype-owner-my-work-390.png) | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-owner-initial-320.png) / [prototype](prototype/prototype-owner-my-work-320.png) |
| Designer, populated initial queue | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-initial-1440.png) / [prototype](prototype/prototype-designer-initial-1440.png) | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-initial-1024.png) / [prototype](prototype/prototype-designer-initial-1024.png) | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-initial-390.png) / [prototype](prototype/prototype-designer-initial-390.png) | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-initial-320.png) / [prototype](prototype/prototype-designer-initial-320.png) |
| Designer, Waiting selected | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-waiting-selected-1440.png) / [prototype](prototype/prototype-designer-waiting-1440.png) | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-waiting-selected-1024.png) / [prototype](prototype/prototype-designer-waiting-1024.png) | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-waiting-selected-390.png) / [prototype](prototype/prototype-designer-waiting-390.png) | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-waiting-selected-320.png) / [prototype](prototype/prototype-designer-waiting-320.png) |
| Site Employee, populated queue | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-site-initial-1440.png) / [prototype](prototype/prototype-site-my-work-1440.png) | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-site-initial-1024.png) / [prototype](prototype/prototype-site-my-work-1024.png) | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-site-initial-390.png) / [prototype](prototype/prototype-site-my-work-390.png) | [actual](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-site-initial-320.png) / [prototype](prototype/prototype-site-my-work-320.png) |

The [capture summary](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-capture-summary.json) records viewports, geometry, overflow metrics, and capture names. The full artifact directory also includes viewport-only captures and task/detail/action views. For example, the new [Owner 1440 capture](evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-owner-initial-1440.png) visibly shows the empty personal queue and the zero-item management section.

### Difference classification

- **MW-I02 correction/acceptance blockers now:** management section has zero rather than five reassignment obligations; the five-item disclosure could not be exercised. The actual Owner and Designer content hierarchy/layout materially differs from the approved prototype. At 1440, for example, the actual page uses a full-width personal-task list and four count cards while the Owner prototype depicts summary cards and an actionable work queue; these are not equivalent task fixtures/states. The actual Designer page similarly places a long personal task list before attention sections, unlike the prototype’s compact actionable queue. Mobile search/control usability, all row readability, and fixed-nav action clearance still need an explicit interaction-level visual pass; no overflow is necessary but insufficient evidence for those points.
- **Shared shell, reserve for bounded MW-I09 remediation:** shell header, side/bottom navigation, global typography/branding, and stale workspace after a server-confirmed logout. The existing workspace-nav accessible-name assertion and auth-shell unit failures belong to this shared-shell surface unless triage shows otherwise. The present run did not alter shared-shell application code.
- **MW-I03–MW-I08 future functionality:** do not treat prototype controls for create-task/customize/save-view or future task actions as implemented by MW-I02. Existing task views/commands that were already available should be checked against the current source contract; this run exercised task open/action paths in the authenticated journey but does not certify future slice functionality.
- **Real backend/fixture differences:** Owner without employee identity correctly has no personal queue. The test fixture set provided no reassignment obligations, so the Owner count stayed zero. Run-specific synthetic Designer tasks and their totals are not production data and do not match the prototype’s illustrative examples. No production data was read or changed.

## Reusable MW-I03–MW-I09 environment procedure

1. For each future slice, obtain its specific Owner authorization before host-context execution or any disposable database mutation. Reuse the retained PostgreSQL 18 cluster, pinned Node 24.19.0/pnpm 11.19.0, existing Chromium/Playwright, and reviewed MW-I02 harness. Do not use a different cluster, port, or container without separate approval.
2. Run in one approved Windows Medium Mandatory Level context, with no persistent elevation or security-policy changes. Prepend the existing `.env.s22-tools/bin` shim to `PATH` so nested pnpm uses the pin. Keep server, API, web, test runner, and browser in that same context.
3. Before startup, recheck the exact data directory and system identifier, stopped status, data-dir process ownership, cold-copy content hash, and the Owner-approved endpoint’s TCP and excluded-range status. Any mismatch stops the run. Start at most the number explicitly authorized, using the exact quoted `pg_ctl.exe` invocation.
4. Run the guarded absence/identity checker before setup. Use a unique, expressly approved disposable database, synthetic fixtures, reviewed migrations, and exact run manifest. Never reuse an existing target or fall back to another database.
5. Save new screenshots under a unique artifact run directory. Compare actual screenshots with immutable approved prototype images at identical viewport and equivalent state. Do not overwrite or substitute old evidence.
6. Execute only the slice’s affected tests plus the requested pinned checks. Preserve raw logs and classify failures by slice/shared shell/environment.
7. Use the manifest-bound cleanup to revoke run sessions, stop exact manifest-owned app PIDs, confirm database OID/marker/connections and pre-run catalog, and drop only that run’s database. Recheck catalog and recovery-copy hash. Stop the cluster only after a read-only connection check finds no unowned client sessions; otherwise leave it running and report why.

This procedure is reusable guidance, not authorization for future host-context execution or state changes.

## Final gate

**Functional Reliability: FAIL** — targeted authenticated/API/task journeys pass, but the required five Owner management obligations are absent and the complete web unit suite has failures.

**Prototype Visual Fidelity: FAIL** — fresh actual evidence exists at all four widths, but material page-content/layout differences remain and the required Owner state is not equivalent because the five reassignment records are absent. Owner visual review is still required after those blockers are resolved.

MW-I02 remains **IN PROGRESS**. Preserve the accepted evidence and frontend changes. Do not mark complete or begin MW-I03 without Owner authorization.

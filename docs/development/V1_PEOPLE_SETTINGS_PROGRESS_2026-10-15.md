# V1 People and focused Settings delivery — 15 October 2026

Status: **IN PROGRESS for feature/pilot acceptance.** The Owner instructed completion of V1 and explicitly requested an active goal. This report records the next bounded source delivery after the [first batch](V1_DELIVERY_PROGRESS_2026-10-15.md). It does not declare V1, current-tree authenticated acceptance or the staff pilot complete.

## Implemented source

- Added authenticated `/people`, included in desktop grouped navigation and mobile More. Owner setup/session gates and actor-keyed mounting use the existing route-session pattern.
- Owner directory uses the existing secured organization inventory. Search, branch/team/state filters and selected employee ID are URL-backed; returning to the list retains filters. An inaccessible/missing selected ID shows unavailable rather than substituting another person. The API still excludes exited employees; no all-staff directory or exited-history endpoint was invented.
- Selected person detail reuses the original membership, job-role, explicit override, suspension and exit editors. Existing commands, CSRF, reasons and C-023/C-024 backend consequences remain. Invitation/recovery and employee enrollment are separately named onboarding steps. Identity Account IDs are compared to Account IDs when detecting an existing employee, correcting the previous employee-ID/account-ID comparison.
- Extracted OrganizationAdmin and TeamWorkspace from App into their owning frontend module. Existing legacy organization/team settings entry points remain usable. Focused settings URLs use `section=organization&panel=structure|access|presentation`; their forms reuse the current commands. The People panel does not mount organization-wide role configuration, and focused settings do not mount the employee editor.
- Added `GET /api/v1/org/self`: current active internal account's own employee ID/code/start date/home branch/home team/reporting manager/current active role labels, or `{ employee: null }` for an enrolled identity without employee membership. No target account/employee selector, permissions, credentials or company directory is returned. Portal/inactive identities and inactive employee memberships are denied; an unsecured Owner is denied by the controller.
- Existing `GET /org/team/employees` retains its active same-team/branch reporting-descendant scope. Added `capabilities.canManageReporting`, evaluated from the current `org.employee.manage` TEAM check. Read-only team members see reporting information without a write form; the existing mutation still independently reauthorizes.
- Protected Organization GET handlers now return `Cache-Control: no-store`.
- Failed membership/role/suspension/exit writes now return a failure result to the caller rather than closing the editor after a swallowed error. Draft/reason remains after conflict, denied/recent-sign-in and network failures. Success is shown only after confirmed writes; a confirmed write followed by a failed reload is described separately. Denied refreshes clear old employee/team records. Generation and active-instance guards discard stale reads after unmount/account replacement.

Requirements/scope/test plan are recorded at the top of IMPLEMENTATION_PLAN.md under V1-03A/03B/04A. No schema/migration/grant changes, retained data mutations, canonical server restarts, deployment, commit/push or stopped MW-I02 acceptance retry were performed.

## Verification and evidence

Pinned Node `24.19.0` and pnpm `11.19.0` were checked. Source before this batch matched the previous receipt: 570 files, hash `6b66b8242730f73193b842f0c45c2f580148d00646c5703d60a6f2b30fb15f7e`, 118 migration directories.

Evidence is under `.artifacts/v1/20261015-people/`:

- Initial sandbox baseline: App's 80 tests passed; two other files could not load because sandbox temporary module files disappeared (ENOENT), with zero failed assertions in those files. The host baseline then ran 86 passed / one failed: the unchanged revoked-session test could not find Work email. That same pre-existing test had previously shown intermittent failure; no assertion/timeout was weakened here. Subsequent surrounding/full runs are recorded separately.
- Before-fix regressions: all five failed as expected — four editors disappeared after denied/conflicting saves, and old employee content survived a denied refresh. After-fix recovery and navigation tests passed.
- Full API unit suite: **379 tests / 58 suites passed**; the new People service file contributes 11 tests, including self-ID isolation, inactive/portal denial, missing membership, reporting-descendant filtering, read denial and separate edit capability.
- Focused organization service checks: **28 passed**. Mocked-service organization HTTP checks: **15 passed**, including session-bound self reads, forged query targets ignored, Owner setup and no-store. These HTTP checks do not use real PostgreSQL.
- Focused frontend/authentication/settings/navigation: **107 passed** before the final layout refinement.
- Full frontend suite: **481 tests passed** before the final detail-header refinement. Final checks and source receipt are recorded below once complete.
- Whole-workspace typecheck, lint and contracts/API/web build passed before the final detail-header refinement; final affected checks remain separately recorded below. Vite still reports the existing large bundle / ineffective dynamic import warnings.
- Synthetic browser fixtures: 20 captures over 1440×900, 1024×900, 390×844 and 320×640; Owner directory/detail, focused access/presentation settings and Staff self/read-only team. All asserted no horizontal page overflow and no page errors; four conflict interactions retained the actual membership reason/editor. All API calls were intercepted; external traffic blocked and all writes returned a synthetic conflict. This is component/browser evidence, not authenticated or database acceptance.
- Initial and refined captures are retained in `browser/` and `browser-final/`. Selected desktop/mobile captures were visually inspected against the existing studio UI direction. A capture helper initially used URL-encoded spaces in an output filename; its 20 generated images were moved into the intended workspace after exact path/filename verification, only empty generated adjacent folders were removed, and the helper now uses `fileURLToPath`.

The temporary Vite fixture listener used loopback port 59743, independent of retained/canonical services. It was stopped after checks and a host loopback probe confirmed ECONNREFUSED. No real staff credentials or records were used. The local V1 evidence directory is now explicitly ignored in Git; unrelated artifacts were preserved.

### Final source boundary

After the last selected-person header refinement, the unchanged-source full frontend run passed **481/481 tests across 48 files**, with zero failed/pending tests (`web-current.json`). The full API source remained unchanged from its **379/379 tests across 58 suites** pass. Mocked organization HTTP **15/15** passed. Whole-workspace typecheck passed; the final web typecheck, web build and repository lint passed after the last UI refinement; the full contracts/API/web build also passed during this batch. No test assertions or timeouts were weakened.

The final responsive capture run again passed **20 captures and four conflict interactions**, with no unexpected API calls or page errors and no horizontal page overflow. Final selected-person mobile, Owner directory and access-settings captures were visually inspected after reducing repeated context and showing onboarding as a disclosure. This is an internal component/layout review against the existing studio direction, not independent Owner/demo parity or authenticated acceptance.

Final source helper: **578 files**, hash `30411ee64707cb21c35e8ab4ab763aa6032d835de4cff9be4fe5a8255efe5ccc`, **118 migrations**, unchanged before/after the final full frontend run. `source-receipt.json` records the source and individual gate evidence. Scoped diff whitespace checks passed. Existing large web-bundle/dynamic-import and baseline React/PDF warnings remain; actual PostgreSQL, concurrency, hosted CI and authenticated browser/visual acceptance were not run. V1 and this feature acceptance remain IN PROGRESS.

## Remaining V1 work

People still needs reviewed effective-access explanations, project-assignment/detail history composition, exited-history reads and complete onboarding/readiness acceptance. Display-name policy/schema remains unapproved; the UI uses actual email/code. Ordinary staff self information is now source-implemented, replacing that specific proposed-read gap.

Settings still needs fuller independent Save/Cancel/draft recovery across navigation and recent-sign-in recovery. The legacy combined administration route is preserved for compatibility. Returned Owner UI demos will supply the final visual target; this slice extends the existing direction.

The next delivery work remains shared task composition/context-valid assignment and review planning, canonical Project Tasks integration and coherent project sections, broader access audit, then exact-candidate persistence/concurrency/authenticated responsive validation. The existing MW-I02 stop-on-drift condition is preserved. Actual staff, R-104/R-105 and operational/production gates remain unverified.

Actual model routing: current Codex agent only; no delegated or independent Opus/Sonnet/final acceptance review was performed. Exact model ID is not asserted without evidence.

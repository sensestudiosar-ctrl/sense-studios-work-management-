# MW-I02 final visual reacceptance — 2026-10-10

Run **1791645789215-1922209c6d12**, one Owner-authorized run, no retry.

**Functional Reliability: PASS — bounded MW-I02 journeys.**

**Prototype Visual Fidelity: FAIL — remaining task-local mobile hierarchy/discoverability gap.**

MW-I02 remains **IN PROGRESS**. Stop for Owner visual acceptance; MW-I03 has not begun. No further application changes were made during this run.

## Fresh actual screenshots and comparison

- [Twenty requested role/state/width pairs](SCREENSHOT_INDEX.md): Owner, Team Leader, Designer initial, Designer Waiting-selected and Site Employee at 1440/1024/390/320 CSS pixels.
- [Side-by-side approved prototype / fresh actual gallery](COMPARISON.html).
- [Detailed discrepancy classification](VISUAL_DISCREPANCY_MATRIX.md).
- [Machine-readable run, geometry, source-hash and cleanup evidence](RUN_EVIDENCE.json).

Twenty-eight fresh application captures were recorded, including supplemental Designer empty and explicitly controlled error-response states. Their viewport companions are retained. They are not old captures or component fixtures. The approved interactive prototype hash was independently rechecked: `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`. Equivalent persona, viewport and Waiting-selection states were compared; differing sample records/counts and the Owner prototype's populated personal state are disclosed rather than treated as equivalent backend data.

## Functional and visual results

| Check | Actual result |
|---|---|
| Four-role authenticated journey | PASS; normal authentication and authorized workflows for Owner, Team Leader, Designer, Site Employee |
| Task integrations | PASS, 26/26, two suites |
| Monolithic Playwright | PASS, 1/1, 31.3s test / 32.0s runner, zero retries |
| Review integration | PASS, 3/3, one suite; independent result retained |
| Five genuine Owner employee-exit holds | PASS; generated through supported exit workflow, automatically expanded, five links individually open exact task headings |
| Unauthorized Designer isolation | PASS; none of the Owner's five held task IDs exposed in Designer reassignment response |
| Owner personal identity | PASS; no active employee identity, truthful zero personal tasks; management source remains independent |
| Views / commands | PASS for existing tested List, Cards, Kanban, Timeline, search/filter, task commands and permission journeys |
| 320px collision | FIXED in fresh actual Designer initial/Waiting captures: Filters & sort and Apply filters occupy separate rows; required controls retained |
| 390px collision | FIXED in fresh actual captures: Management label and count occupy separate tracks; no count covers the label |
| Mobile search/filter/task action | PASS at 390 and 320: touch search, real disclosure opening and `open` assertion, visible status selection, real filtered HTTP200 and URL, task opening, resume reason input; no resume submitted |
| Fixed-navigation action clearance | PASS at both mobile widths: resume action fully in viewport and its bottom strictly above fixed navigation top |
| Horizontal document overflow | None in all 28 capture metadata records; mobile journey asserts none independently |
| Widget visual states | Waiting selected dark; Completed remains light/unselected in fresh actual Waiting captures. Mobile Owner captures also show an independent gold focus ring. Prior final-source component rendering verified keyboard Tab/3px outline and light unselected hover; this run did not add a separate computed-style hover/focus assertion |
| 1024px density | IMPROVED: Designer initial first row121px, Site141px, Designer Waiting141px. All title/owner/priority/status/target/committed fields remain readable. Shared264px sidebar still constrains width; prototype rows are denser |
| Mobile queue discovery | FAIL visual criterion: Designer queue y842px at390 and887px at320; Site842/907; Designer Waiting1018/1034. No queue or task is visible in the initial390 viewport. Prototype Designer queue begins approximately334px. Shared shell explains only part of the difference |

The remaining vertical cost is task-local: independent source cards, About-counts spacing, two-row widgets, Display/Refresh, filter actions, selection copy and pagination still delay the queue even when attention counts are zero. Truthful separate counts do not require this much vertical space. This is an MW-I02 discrepancy, not future aggregation or shared-shell work.

Owner framing is shorter and five obligations remain prominent. At1024/390/320 the full capture includes the personal-empty explanation and authorized Tasks link. The1440 full capture omits the lower end of that section; this remains a capture limitation, not proof of production clipping or missing functionality. Real-browser Owner pending/denied setup capture remains absent; passing denied/unavailable frontend cases are not substituted for that evidence.

## Frontend checks and baseline separation

Final source hashes match the five frontend files tested before authorization. [Final-source frontend evidence](../../frontend-corrections-20261010/): focused **40/40**, root typecheck/lint/build **exit0**. Existing build chunk-size/dynamic-import warnings remain. These checks were not falsely rerun or relabeled as part of database acceptance.

- **New MW-I02 functional regressions:** none observed in affected frontend tests or this authenticated/integration run.
- **Baseline debt:** prior complete web result remains232pass/19established failures, with two known DashboardWorkspace exceptions. The complete web suite was not rerun here; do not infer baseline debt is resolved or claim a fresh full-suite failing-name comparison.
- **Missing fixture coverage:** five genuine exit holds are now present and verified. Owner setup pending/denied real-browser evidence remains missing.
- **Actual visual discrepancies:** remaining mobile hierarchy/discoverability is independently FAIL despite functional PASS. Collision, selection-state and tablet-density fixes are demonstrated.

## Environment and cleanup

Read-only preflight at `2026-10-10T15:23:00.564Z` verified Windows **Medium Mandatory Level**, Node24.19.0/pnpm11.19.0, running retained PostgreSQL18 PID35672, `127.0.0.1:45434`, system ID **7693570241708228348**, exact retained `pg-demo-20261006-a7c9` directory, expected process command, and exact target absence. Guarded setup created only `sense_mw_i02_validation_20261009_test`, OID **100792**, and applied116 existing migrations. Owned API PID7604 and web PID13276 served this run.

Manifest-bound cleanup completed at `2026-10-10T15:24:58.195Z`:

- Revalidated server, run marker, database identity/OID and process ownership.
- Revoked8 run-owned sessions; remaining active0; client/external portal sessions0.
- Stopped only owned API7604 and web13276; connection-drain guard passed before drop.
- Dropped only this run's exact disposable database; independent read-only absence check passed at15:25:36Z.
- Other-database catalog before/after SHA256 both `51eec71680e80efdbc0d6438b7a806dff8de6b9100647d29b990ceabb2c6546e`.
- Retained PostgreSQL remained running PID35672. No startup/restart/stop, alternate port, production data, schema, permission or shell change occurred. Recovery copy retained.

Historical manifests and evidence remain preserved. Current run's reviewed cleanup updated its own manifest normally; no historical manifest was modified. Sanitized evidence excludes creation tokens and authentication secrets.

## Acceptance boundary

Remaining MW-I02: mobile queue hierarchy and remaining presentation/capture evidence. Shared header/sidebar/navigation proportions are reserved for bounded shell remediation/MW-I09. Date/pinned grouping, saved/customized views, drawers and Site Actions remain MW-I03–MW-I08. Backend-driven truthful phases, independent obligation counts, recorded dates and permissions remain necessary differences.

Actual models: GPT-6.1 Sol context and independent final visual review; GPT-6 Luna earlier bounded attention presentation implementation; primary agent executed this approved run and reviewed Owner captures. No further redesign or acceptance retry is authorized by this completed run.

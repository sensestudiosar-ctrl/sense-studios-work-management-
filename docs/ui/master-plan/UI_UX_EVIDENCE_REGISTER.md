# UI/UX Evidence Register

**Baseline:** 2026-10-05, commit `d21ccd1` (through S22; concurrent S23 work excluded)  
**Evidence type:** read-only review of retained, seeded Chromium screenshots  
**Scope:** existing PNG files under `.env.qa21-checkpoint-da15e02`, `.env.s14-tools`, `.env.s16-tools`, `.env.s17-tools`, `.env.s19-tools`, `.env.s20-tools`, `.env.s21-tools`, and `.env.s22-tools`.

The later Owner-provided project status reports S23 COMPLETE on 2026-10-05. This evidence register intentionally documents the earlier S22 capture audit and does not claim that S23's ten completion captures were visually inspected here. Add those images and their accepted commit/fixture provenance only during the required post-S27 rebaseline.

## Method and limits

I enumerated PNG files only under the named directories. Dependency artwork below `.env.qa21-checkpoint-da15e02/node_modules` was excluded because it is not an application capture. I inspected the 20 files listed in the next section with the local image viewer. The remaining capture inventory is listed below but was not visually inspected.

These images are retained implementation evidence, not a fresh acceptance run. Acceptance reports and their prior checks were not rerun for this audit. The screenshots show seeded local Chromium states with test identities, fixture data, and fixed sample dates. They do not establish production-project use, live deployment coverage, measured usability, or behavior across every role and state. In a few paired files, desktop and mobile fixture states differ, so they should not be read as pixel-matched responsive snapshots.

The S16 mobile screenshot predates the later `da15e02` workspace-navigation fix. Its compressed/wrapped top navigation is a historical observation from that image and is **not evidence of a current defect**.

## Files visually inspected

Paths are relative to the repository root; each link opens the exact capture.

1. [`.env.s16-tools/screenshots-final5/desktop-s16-time-owner-export-retry.png`](../../../.env.s16-tools/screenshots-final5/desktop-s16-time-owner-export-retry.png)
2. [`.env.s16-tools/screenshots-final5/mobile-s16-time-owner-export-retry.png`](../../../.env.s16-tools/screenshots-final5/mobile-s16-time-owner-export-retry.png)
3. [`.env.s17-tools/screenshots-final10/s17-workforce-desktop-chromium-owner.png`](../../../.env.s17-tools/screenshots-final10/s17-workforce-desktop-chromium-owner.png)
4. [`.env.s17-tools/screenshots-final10/s17-workforce-mobile-chromium-owner.png`](../../../.env.s17-tools/screenshots-final10/s17-workforce-mobile-chromium-owner.png)
5. [`.env.s17-tools/screenshots-final10/s17-workforce-desktop-chromium-staff.png`](../../../.env.s17-tools/screenshots-final10/s17-workforce-desktop-chromium-staff.png)
6. [`.env.s17-tools/screenshots-final10/s17-workforce-mobile-chromium-staff.png`](../../../.env.s17-tools/screenshots-final10/s17-workforce-mobile-chromium-staff.png)
7. [`.env.s19-tools/screenshots/s19-turnkey-desktop-chromium.png`](../../../.env.s19-tools/screenshots/s19-turnkey-desktop-chromium.png)
8. [`.env.s19-tools/screenshots/s19-turnkey-mobile-chromium.png`](../../../.env.s19-tools/screenshots/s19-turnkey-mobile-chromium.png)
9. [`.env.s20-tools/screenshots/s20-site-desktop-chromium.png`](../../../.env.s20-tools/screenshots/s20-site-desktop-chromium.png)
10. [`.env.s20-tools/screenshots/s20-site-mobile-chromium.png`](../../../.env.s20-tools/screenshots/s20-site-mobile-chromium.png)
11. [`.env.s21-tools/screenshots/s21-desktop-chromium.png`](../../../.env.s21-tools/screenshots/s21-desktop-chromium.png)
12. [`.env.s21-tools/screenshots/s21-mobile-chromium.png`](../../../.env.s21-tools/screenshots/s21-mobile-chromium.png)
13. [`.env.s21-tools/screenshots/s21-staff-desktop-chromium.png`](../../../.env.s21-tools/screenshots/s21-staff-desktop-chromium.png)
14. [`.env.s21-tools/screenshots/s21-staff-mobile-chromium.png`](../../../.env.s21-tools/screenshots/s21-staff-mobile-chromium.png)
15. [`.env.s21-tools/screenshots/s21-vendor-desktop-chromium.png`](../../../.env.s21-tools/screenshots/s21-vendor-desktop-chromium.png)
16. [`.env.s21-tools/screenshots/s21-vendor-mobile-chromium.png`](../../../.env.s21-tools/screenshots/s21-vendor-mobile-chromium.png)
17. [`.env.s22-tools/screenshots/s22-offline-cold-desktop-chromium.png`](../../../.env.s22-tools/screenshots/s22-offline-cold-desktop-chromium.png)
18. [`.env.s22-tools/screenshots/s22-offline-cold-mobile-chromium.png`](../../../.env.s22-tools/screenshots/s22-offline-cold-mobile-chromium.png)
19. [`.env.s22-tools/screenshots/s22-offline-conflicts-desktop-chromium.png`](../../../.env.s22-tools/screenshots/s22-offline-conflicts-desktop-chromium.png)
20. [`.env.s22-tools/screenshots/s22-offline-conflicts-mobile-chromium.png`](../../../.env.s22-tools/screenshots/s22-offline-conflicts-mobile-chromium.png)

## Visual observations

The inspected application screens share a warm cream page background, dark green primary controls, restrained gold/green accents, serif section headings, and pale bordered cards. Status and empty-state panels are visually distinct. The repeated visual language reads consistently across the S16–S22 samples.

The S19 turnkey screen presents a released design input, bill of quantities, material, procurement and factory status, and collapsible history. Desktop uses available width for grouped content; mobile stacks the release and its subpanels into a readable single column. The S21 consultant portal similarly separates granted revisions from production requirements on desktop and stacks them on mobile. The consultant and vendor captures show explicit empty states, staff requests, advisory submissions, upload-retention text, and session controls. Consultant and vendor fixture content is intentionally different.

The S17 workforce view combines leave/WFH requests, attendance, workload, request history, and leave balances. Owner and staff captures differ in available actions and fixture states. The desktop workload table is dense; on mobile its columns compress and wrap. The remaining content stacks into cards without obvious horizontal clipping in the captured viewport. These are full-page views, so their narrow rendered previews make fine text harder to judge.

The S20 site operations view contains many sections in one long page: active project summary, offline capture, site notes, work packages, manpower, daily reports, snags, handover, and history. The full-page images are exceptionally tall (desktop capture 1280×6340; mobile capture 1082×22691), so they appear very small when fit to the viewer. The images establish section presence and broad stacking, but do not make every label or control legible at the overview scale.

The S16 time screen shows a manual-entry form and entry history. The mobile form becomes one column and history entries become stacked cards. The historical mobile capture also shows workspace navigation links crowded together at the top; as noted above, this predates the later navigation fix and does not establish a present issue. The desktop/mobile captures have different history counts (2 versus 4), which limits direct responsive comparison.

The S22 offline-capture screen clearly explains that capture is local and that server authentication and project authorization have not been checked, then presents a queue with item statuses and discard controls. The conflict screen displays current server values alongside editable local values and the “Keep server values” and “Amend and retry” actions. Both screens stack cleanly in the mobile images. This visual review does not verify offline synchronization correctness or security behavior.

No obvious overlap or horizontal overflow appears in the inspected pairs. This observation is limited to the captured states and viewport images; it is not a responsive interaction test or usability measurement.

## Complete retained PNG inventory

The named folders contain these application-like PNG captures. S17 has historical/final/recheck duplicates; only the `screenshots-final10` owner and staff pairs were inspected.

### `.env.qa21-checkpoint-da15e02`

No application PNG captures found after excluding dependency artwork in `node_modules`.

### `.env.s14-tools`

No PNG captures found.

### `.env.s16-tools`

- `screenshots-final5/desktop-s16-time-owner-export-retry.png` — inspected
- `screenshots-final5/desktop-s16-time-worker-timer-manual.png` — not inspected
- `screenshots-final5/mobile-s16-time-owner-export-retry.png` — inspected
- `screenshots-final5/mobile-s16-time-worker-timer-manual.png` — not inspected

### `.env.s17-tools`

- `screenshots-final10/s17-workforce-desktop-chromium-owner.png` — inspected
- `screenshots-final10/s17-workforce-desktop-chromium-staff.png` — inspected
- `screenshots-final10/s17-workforce-mobile-chromium-owner.png` — inspected
- `screenshots-final10/s17-workforce-mobile-chromium-staff.png` — inspected
- `screenshots-final9/s17-workforce-desktop-chromium-owner.png`
- `screenshots-final9/s17-workforce-desktop-chromium-staff.png`
- `screenshots-final9/s17-workforce-mobile-chromium-owner.png`
- `screenshots-final9/s17-workforce-mobile-chromium-staff.png`
- `workforce-ui-recheck/workforce-workforce-setup--db387-rsist-on-desktop-and-mobile-desktop-chromium/s17-workforce-desktop-chromium-owner.png`
- `workforce-ui-recheck/workforce-workforce-setup--db387-rsist-on-desktop-and-mobile-desktop-chromium/s17-workforce-desktop-chromium-staff.png`
- `workforce-ui-recheck/workforce-workforce-setup--db387-rsist-on-desktop-and-mobile-mobile-chromium/s17-workforce-mobile-chromium-owner.png`
- `workforce-ui-recheck/workforce-workforce-setup--db387-rsist-on-desktop-and-mobile-mobile-chromium/s17-workforce-mobile-chromium-staff.png`

### `.env.s19-tools`

- `screenshots/s19-turnkey-desktop-chromium.png` — inspected
- `screenshots/s19-turnkey-mobile-chromium.png` — inspected

### `.env.s20-tools`

- `screenshots/s20-site-desktop-chromium.png` — inspected
- `screenshots/s20-site-mobile-chromium.png` — inspected

### `.env.s21-tools`

- `screenshots/s21-desktop-chromium.png` — inspected (consultant portal)
- `screenshots/s21-mobile-chromium.png` — inspected (consultant portal)
- `screenshots/s21-staff-desktop-chromium.png` — inspected (external project access management)
- `screenshots/s21-staff-mobile-chromium.png` — inspected (external project access management)
- `screenshots/s21-vendor-desktop-chromium.png` — inspected (vendor/factory portal)
- `screenshots/s21-vendor-mobile-chromium.png` — inspected (vendor/factory portal)

### `.env.s22-tools`

- `screenshots/s22-offline-cold-desktop-chromium.png` — inspected
- `screenshots/s22-offline-cold-mobile-chromium.png` — inspected
- `screenshots/s22-offline-conflicts-desktop-chromium.png` — inspected
- `screenshots/s22-offline-conflicts-mobile-chromium.png` — inspected
- `screenshots/s22-offline-site-desktop-chromium.png` — not inspected
- `screenshots/s22-offline-site-mobile-chromium.png` — not inspected

## Missing surfaces and future capture recommendation

There are no retained PNGs in the allowed folders for the broad S01–S15 workspace surfaces. In particular, this audit has no screenshot evidence for home/dashboard, project portfolio and detail, tasks, project documents/drawing register/internal reviews, or governance/admin/audit controls such as role and branch administration, approvals, data retention, backup/recovery, and migration status. The current source surface inventory and requirements remain the authority for which of these screens exist; absence here means only that no allowed retained capture was found.

After functional development through S27 is accepted, refresh the audit with a consistent capture matrix: each in-scope module on desktop and mobile at documented viewport sizes; key user roles (Owner, explicitly authorized manager/Project Lead, employee/collaborator, site staff/verifier, client/Primary/delegate, consultant/vendor/factory); representative empty, populated, validation/error, pending/approved, stale/conflict and restricted states; and long-page section captures at normal viewport scale in addition to any full-page overview. Include home, project and task flows, documents/reviews, time/workforce, turnkey/site, client/external portals, galleries, governance, offline flows and the actually accepted S23–S27 screens. Record the fixture identity/state and source commit beside every image. This recommends later evidence collection and does not authorize it now. S23 status may progress concurrently; it stays outside this document's S22 CURRENT baseline. S18 remains conditional/excluded pending separate Owner reconciliation.

## Source and test provenance

The companion master plan records the baseline route and source inventory. The `d21ccd1` web tree includes 19 unit-test files and 20 Playwright spec files spanning identity, CRM, projects/templates, tasks/dates/dependencies, documents/revisions/reviews, portals/gallery, time/workforce, turnkey/site and offline site. Audit retention and notifications have unit coverage; there are no dedicated E2E filenames for them in this baseline. A filename inventory does not prove every state is covered or passed. Historical S22 acceptance results are in `S22_COMPLETION_REPORT.md`; no tests or services were run for this planning audit.

Capture paths above point into local retained evidence folders, which may be ignored by Git and unavailable in another checkout. Do not treat these as self-contained published assets. Before later design freeze, retain approved non-sensitive evidence in an agreed durable location with commit, viewport and fixture provenance.

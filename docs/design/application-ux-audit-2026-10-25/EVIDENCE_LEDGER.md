# Evidence and verification ledger

25 October 2026 · Current audit only.

- 44 current checkout Route declarations, including catch-alls; 62 non-test TSX source modules indexed.
- 28/28 internal entry routes covered with actual Owner desktop and phone captures.
- 148 Owner capture records; 145 unique Owner image files, including project sections, selected contexts, task creation/detail/filter and legacy workspace.
- 196 standalone captures: 84 live anonymous, 56 synthetic Owner, 56 synthetic Staff.
- Synthetic results do not establish actual role permissions or populated workflows.
- Standalone navigation errors: 0; uncaught page errors: 0; viewport overflows in those captures: 0; blocked mutation attempts: 0.
- Original shell interactions: four PASS and one page-finder timeout. Focused readiness-aware recheck: PASS. Preserve both results.
- Live Owner walkthrough submitted no domain changes. Normal session GET metadata may update.
- Initial browser-path/sandbox network failures and an interrupted network-idle run occurred. The latter JSON is retained as browser-interrupted-networkidle.json; final browser-evidence.json is the separate bounded run.
- No full test suite, build, database check/migration, production acceptance or deployment was run.

## Owner entry coverage

| Route | 1440px | 390px |
|---|---|---|
| /dashboard | Captured | Captured |
| /my-work | Captured | Captured |
| /tasks | Captured | Captured |
| /projects | Captured | Captured |
| /people | Captured | Captured |
| /settings | Captured | Captured |
| /decisions | Captured | Captured |
| /notifications | Captured | Captured |
| /documents | Captured | Captured |
| /revisions | Captured | Captured |
| /reviews | Captured | Captured |
| /client-reviews | Captured | Captured |
| /external-access | Captured | Captured |
| /turnkey | Captured | Captured |
| /time | Captured | Captured |
| /workforce | Captured | Captured |
| /learning | Captured | Captured |
| /learning/skills | Captured | Captured |
| /learning/training | Captured | Captured |
| /learning/library | Captured | Captured |
| /performance | Captured | Captured |
| /project-health | Captured | Captured |
| /reports | Captured | Captured |
| /integrations | Captured | Captured |
| /automation | Captured | Captured |
| /saved-reports | Captured | Captured |
| /assistance | Captured | Captured |
| /site | Captured | Captured |

## Evidence files

- live-owner-evidence.json: actual attached-session DOM snapshots and captures. Earlier loading snapshots are retained; the gallery uses the latest image record for a shared filename.
- browser-evidence.json: standalone anonymous/synthetic snapshots, geometry, release metadata and original shell interaction receipts.
- finder-recheck.json: focused separate finder test after shell readiness.
- source-inventory.json: current source routes/composition, module hashes and static form/heading/endpoint signals.
- AUDIT_SUMMARY.json: machine-readable totals, missing-image/source checks and outstanding roles.
- EVIDENCE_GALLERY.html: local browseable screenshot gallery.

## Stable-source check

The three route/shell files hashed before the standalone run were compared again while preparing this report. This covers only those files, not the whole dirty checkout:
- apps/web/src/main.tsx: unchanged
- apps/web/src/app.tsx: unchanged
- apps/web/src/workspace-navigation.tsx: unchanged

## Review boundary

The master UX plan is ready for Owner review. Exhaustive cross-role and important-state coverage remains IN PROGRESS. A current screenshot does not validate a proposed layout, mutation behavior, persistence, or production readiness.

## Capture anomaly classification

Initial attached-browser full-page captures sometimes rendered narrow columns despite correct reported DOM geometry. A separate stable viewport-only pass captured all 28 routes at both widths; its 56 images and their main-width geometry were reviewed in the contact sheets. The primary gallery uses this pass. Earlier full-page/context images remain diagnostic/supplementary evidence; do not classify their narrow rendering as a confirmed application defect. Some settled captures show transient source loading, not populated-state acceptance. The independently captured populated Dashboard and earlier DOM snapshots remain available.

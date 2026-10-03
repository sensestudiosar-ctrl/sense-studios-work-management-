# Sense Studios UI v1 design review

Status: review draft; broad application UI implementation has not started.

New Review/Correction direction: open http://127.0.0.1:4180/review-canvas.html (also linked from the original Review screen). This is a separate conversational-canvas experiment with a fictional architectural SVG sheet, numbered human-feedback pins and separate formal decisions. Switch reviewer/employee, round and evidence state to inspect the contract. No real PDF, AI image editing or saved review is provided. Start the local allowlisted server with `node docs/ui/v1/preview-server.mjs 4180` if needed. Verification for this experiment is recorded separately in review-canvas-verification.json after checks run.

Owner's inline correction is now available: select Point comment and click directly on the sheet, or select Rectangle comment and drag around an area. Write and post in the nearby on-canvas box. Numeric location fields provide a keyboard alternative. Rectangle bounds are local prototype geometry, not the current backend point-annotation contract. Separate inline verification passed 87 checks; the canvas regression suite passed 105. Nothing is saved.

Planning handoff: UI_DELIVERY_PLAN.md maps implementation order, all 60 research IDs, real read sources and explicit API dependencies. Review DESIGN_REVIEW_WORKSHEET.md against the main mockups and the eight-scene-fixture board at http://127.0.0.1:4179/workflow-fixtures.html. Board verification: 477 presentation checks passed at 2026-10-01T06:30:13.906Z; no human-comprehension or application acceptance is claimed.

Owner-requested competitor research is in WORK_MANAGEMENT_DESIGN_RESEARCH.md: nine products, 60 distinct candidates, source links, safety/acceptance boundaries and a first-12 shortlist. Classification: 37 design-now, 15 conditional contracts, eight later-scope ideas. This is a research appendix, not approved implementation scope; existing design decisions remain open.

Latest prototype pass: 630 fictional-data presentation assertions, zero failures/browser errors at 2026-10-01T06:11:04.462Z. Research candidates 07/08/09 now have a bounded experiment: choose Preview task from My Work or Project Tasks; close it or open full detail and return to the filtered list. My Work's Display options compares comfortable/compact density while retaining essential fields. Desktop uses a modal side preview and mobile a modal card; the background list cannot be operated while the preview is open. These choices remain under review. Human comprehension/full accessibility and application acceptance remain pending; UI v1 is unfrozen.

Owner's updated review structure: Requirements → UX flows → UI specification/mockups → implementation → tests. Start with UX_WORKFLOW_PLAN.md: 15 journeys, screen flows, primary actions, friction rules and edge cases. Keep the detailed UI draft as supporting reference; do not expand it into another large UX document or approval layer.

UI-V01 graphics planning is part of UX_WORKFLOW_PLAN.md: per-screen visual purpose, desktop/mobile compositions, data/interaction boundaries and five review fixtures. Shell/My Work graphics are now in the fictional mockup, with 449 presentation assertions passing at five widths and three personas. Remaining core graphics are being refined; the initial 317-assertion evidence predates this layer. Review follows shell/My Work → Project Workspace → Task/Review → Documents; no need to wait for S24. Human comprehension/accessibility acceptance and Owner freeze remain pending.

Review order:

1. Open mockups.html, starting with My Work; inspect desktop shell and forced Mobile view.
2. Switch My Work through Ready, Loading, Empty, Error and Read-only.
3. Review Project Overview, Tasks, Reviews and Documents under the same project header.
4. Follow a task into its exact review/correction history and back to the correction task.
5. Compare comfortable/compact task density, list/board and global/project documents. Inspect the cream/forest palette and system typography on actual screens.
6. Walk UX_WORKFLOW_PLAN.md against the mockups; consult SCREEN_CONTRACTS.md where permissions or states need precision. Record choices below before freeze.

Use Preview as Avery to inspect personal work/corrections, Noah for the named independent reviewer, and Maya for scoped management attention. These fictional personas demonstrate separately granted actions; a job title is not the authorization rule. In My Work, Approaching exposes its date basis and date range. In Project Tasks, compare Comfortable/Compact and List/Board. Use the mobile More menu to compare global Documents with project Documents.

The mockup uses fictional data and local presentation interactions. No action saves to the real application. Profile/screen/state/width controls support design inspection and do not represent real permission enforcement.

## Review decisions

| Choice | Owner decision | Status |
| --- | --- | --- |
| My Work landing for all | Confirmed in chat | Confirmed |
| Attention before task list | Confirmed in chat | Confirmed |
| Clean studio styling | Confirmed in chat | Confirmed |
| Desktop/mobile equal support | Confirmed in chat | Confirmed |
| Comfortable/compact task density | Pending mockup review | Open |
| List/board for v1 | Pending mockup review | Open |
| Global Documents plus project Documents | Pending mockup review | Open |
| Exact palette and typeface | Pending mockup review | Open |
| Final package freeze | Pending complete package review | Not frozen |

## Preview and verification

From the repository root, `node docs/ui/v1/preview-server.mjs` serves only the two allowlisted design HTML files at http://127.0.0.1:4178. Optional argument `4179` starts the same local-only server on the review-board port without disturbing an existing 4178 preview. It never serves arbitrary repository files or exposes a public listener. `node docs/ui/v1/generate-workflow-fixtures.mjs` regenerates the scene board; `node docs/ui/v1/verify-workflow-fixtures.mjs` verifies it separately.

`node docs/ui/v1/verify-preview.mjs` uses the already installed Playwright Chromium to exercise the standalone mockup. Its report is preview-verification.json and screenshots are in previews/. This verifies presentation only; application gates and server permission/persistence/audit verification remain part of authorized implementation.

Verification evidence and limitations are recorded in REVIEW_AND_VERIFICATION.md after checks run.

Latest main-screen verification: 630 assertions passed with no browser errors at 320/390/768/1024/1440px. The board's separate 477 checks verify scene presentation, not extra real workflows. Creation/upload/file-viewer and workflow actions remain representative previews with no real persistence. Four Owner choices, human/accessibility review and final acceptance are required before UI v1 freeze.

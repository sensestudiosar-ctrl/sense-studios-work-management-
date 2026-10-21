# My Work prototype and P0 review package

8–9 October 2026 · **ISOLATED PROTOTYPE — Owner review required before production changes.**

The approved cream/pine/gold design baseline is recorded in [Owner approval](../APPROVAL_2026-10-08.md). This delivery validates current frontend contracts and explores My Work hierarchy, work rows, context retention, detail/action evidence and recovery. Existing functional slices stay completed within their accepted scope.

9 October refinement: the Owner accepted the layout and requested stronger color cues for importance. See [semantic color emphasis](05-color-emphasis.md) for the bounded prototype mapping and verification evidence.

Subsequent request: [team leader and Owner work contexts](06-leader-owner-work.md) addresses assigning tasks, checking progress and closing desktop detail for a full-width worklist. This remains a proposed, disconnected prototype extension.

## Deliverables

| Deliverable | Artifact |
|---|---|
| A. Current application validation | [Current findings](01-current-validation.md), source fingerprint and focused test logs |
| B. Existing versus proposed | [Comparison and traceability](02-comparison-and-traceability.md) |
| C. Desktop/mobile prototype | [React source](../my-work-prototype/main.tsx), [isolated CSS](../my-work-prototype/prototype.css), local Vite entry/config; no production route wiring |
| D. Local preview/captures | [Open isolated preview](http://localhost:59420/); captures and verification results in the acceptance record |
| E. Refero traceability | Existing SC02/04/06/07/15/18 and FL02/03/07, approved Zelt-led direction; [mapping](02-comparison-and-traceability.md) |
| F. Acceptance checklist | [Functional/accessibility record](04-acceptance-checklist.md) |
| G. Exact proposed changes | [MW-01–12 and candidate frontend boundary](03-proposed-implementation.md) |

## Review the prototype

Fictional records, fixed sample date **8 October 2026**, no API/session/database/file connection. Source-state controls are demonstration controls, not product settings. Counts describe loaded samples and overlap. Workflow previews never save a task, submit a review or make an approval. Exact review destination is a local mock with unavailable fixture-file preview, not a real drawing.

Try the six work lenses, search/project/owner/status/sort, paging, task selection, browser Back/Forward/reload, exact review return and the Preview scenarios controls. Choose the demo Teamleader persona and Manage visible work, or Owner and Organization work, to inspect recorded-state counts and guarded create/reassign previews. The demo persona picker models sample contexts; it is not a production privilege switch. Close Task details with the header × to restore full worklist width. Inspect ordinary waiting versus employee-exit hold and independent unavailable sources. Mobile uses full detail and contextual return. This focused list prototype does not replace the existing production Cards/Kanban/Timeline or full owning-module forms.

To restart the preview, run `docs/design/my-work-prototype/start-preview.ps1` in PowerShell. It uses the existing pinned Node executable and installed Vite, binds only loopback port59420 and has no API proxy or PWA. It does not install dependencies. Keep the terminal/server running during review; Ctrl+C stops the foreground launcher. Generated standalone build lives inside the prototype's `dist/` only.

## Review boundary

Production pages, backend/database/schema/permissions/domain logic are unchanged by this task. Existing task capabilities, named independent reviews and immutable evidence remain authoritative. Current production denial and navigation test mismatch are documented; a synthetic populated preview does not resolve them or establish real persistence/permission acceptance. Screen-reader, actual-project and whole-checkout acceptance remain distinct.

Owner review should decide the My Work composition, density, lens placement, named dates/actors/evidence, mobile behavior and exact proposed implementation list. No production implementation will start from this delivery without a separate bounded instruction.

# MW-I02 approved prototype reference captures

These images are visual references from the approved interactive Sense Studios My Work prototype. They are not authenticated application evidence, product data, or proof that the live application meets MW-I02 acceptance.

The captured HTML is the approved source `D:/app/reference from codex chat/Sense_Studios_My_Work_UX_Package/Sense_Studios_My_Work/prototype.html`, SHA-256 `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`. The temporary local copy used by Playwright has the same hash and was not edited. The ignored harness is `.env.checkpoint-tools/mw-i02-prototype-capture/capture.mjs`.

The capture set has 28 full-page screenshots: Designer My Work initial, Waiting-selected, empty, and simulated-error states at 1440, 1024, 390, and 320 CSS pixels; plus the initial My Work view for Designer, Team Leader, Site Employee, and Owner at each width. The capture manifest records the selector-driven steps, source role labels, counts, page errors, viewport widths, page scroll widths, and DOM bounding boxes for the scope control, all metric cards, queue, toolbar, and first task row.

The Waiting view uses the real prototype control `[data-metric="waiting"]` and exposes its sample task `SS-167`, “Confirm bathroom tile measurements.” The prototype's lowercase `waiting` field is illustrative only; actual application data must retain the canonical state and meaning established by the MW-I02 contract. Other task IDs, titles, counts, roles, and sample relationships are also illustrative.

The error image is produced by the prototype's own local recovery demonstration through Customize → Preview UX error states → Simulate load failure. It sends no request and is not a real server failure. The prototype has no separate triggerable pending/initial loading state, so none is claimed or fabricated. Its own recovery panel also says role previews are not authorization and actual route guards are required; no denied/access-control image is represented here.

The harness used pinned Node 24.19.0 and the repository's installed Playwright package, rendering only the hash-checked local HTML via `page.setContent`. It made no API, app-server, or database calls. All 28 pages completed with zero JavaScript page errors. Manifest and compact run log are `manifest.json` and `capture.log`.

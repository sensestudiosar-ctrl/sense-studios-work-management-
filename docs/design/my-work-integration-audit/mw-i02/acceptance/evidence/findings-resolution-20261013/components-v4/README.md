# Components v4 synthetic capture bundle

Generated with the loopback-only GET fixture at `http://127.0.0.1:4173/mw-i02-after.html`. No authenticated browser, production data, database, or write request was used. These captures are synthetic component evidence, not visual acceptance.

The bundle contains 32 screenshots across 1440×900, 1024×900, 390×844, and 320×740 for Designer initial, Waiting, Needs action, Team Leader populated, Site populated, Owner with five holds, Create dialog, and task drawer states. `measurements.json` records fixture semantics, source hashes, layout geometry, touch interactions, focus/scroll behavior, and computed selected action card contrast checks.

All 32 captures completed without page errors or horizontal document overflow. Both mobile sizes passed filter open/status apply/reset, task drawer open/close, Needs action open/page/clear; the drawer footer was visible and the first task remained clear of the fixed navigation. Create dialog controls measured at least 44 px high at every viewport. Create/drawer close restored body scrolling and trigger focus.

The selected Needs action card source-count `<small>` labels pass the 4.5:1 normal-text contrast threshold (12.57:1 across the two gradient endpoint samples); the hint passes at 7.08:1. The title label still fails at 4.10:1 in all four viewports: foreground `rgb(109, 124, 112)` against `linear-gradient(115deg, rgb(240, 248, 254), rgb(255, 255, 255) 56%)`. This is reported as captured; see the per-node `selectedActionContrast` details in `measurements.json`.

Gallery: `index.html`. Preserve this bundle as v4 evidence; v3 and older bundles remain unchanged.

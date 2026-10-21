# Components v6 synthetic evidence

Captured with the approved loopback GET-only fixture. No authenticated browser, production data, database, or write requests were used. This is synthetic component evidence, not visual acceptance.

The bundle has 32 screenshots across 1440×900, 1024×900, 390×844, and 320×740 for Designer initial, Waiting, Needs action, Team Leader populated, Site populated, Owner with five holds, Create dialog, and task drawer. See `index.html` and `measurements.json` for the gallery and measurements. Source hashes include `actionable-work.tsx/css` and `my-work-parity.tsx/css`.

The first actionable row is “Synthetic actionable task 1” with source status “Tasks”. Its badge foreground `rgb(38, 49, 43)` on `rgb(239, 243, 238)` measures 12.03:1 at all widths. Row/action bounds at capture: 1440×900 and 1024×900 y=696–805; 390×844 y=665–774; 320×740 y=730–839. Mobile minimum scroll to clear the fixed navigation is 4 px at 390×844 and 173 px at 320×740; after applying that scroll the row has 8 px clearance above the nav at both sizes. The exact row text and contrast checks are recorded in each Needs action capture.

All 32 captures completed without capture errors, page errors, or horizontal overflow. Both mobile interaction suites passed filter open/status apply/reset, drawer open/close, Needs action open/page/clear, and controls have no overlaps. Create form controls are at least 44 px high; dialog/drawer close restored body scroll and trigger focus.

Earlier evidence bundles are preserved.

# Components v7 synthetic evidence

One fresh capture of the current source using the approved loopback-only GET fixture. No authenticated browser, production data, database, write requests, or preview interaction was used. This is synthetic component evidence, not visual acceptance.

The bundle contains 32 screenshots across 1440×900, 1024×900, 390×844, and 320×740 for Designer initial, Waiting, Needs action, Team Leader populated, Site populated, Owner with five holds, Create dialog, and task drawer states. See `index.html` and `measurements.json`.

The first actionable task status chip says “Tasks” with foreground `rgb(38, 49, 43)` on `rgb(239, 243, 238)`, measured contrast 12.03:1 at each viewport. No first-row text checks failed. Captured row bounds were y=696–805 at 1440×900 and 1024×900, y=665–774 at 390×844, and y=730–839 at 320×740. Mobile minimum scroll to clear fixed navigation was 4 px and 173 px, respectively; the row had 8 px of clearance afterward in both cases.

All 32 captures had zero capture errors, page errors, and horizontal overflow. Both mobile interaction sequences passed; dialog and drawer checks, mobile control overlap checks, and touch-sized Create fields passed. Source hashes include updated actionable-work and my-work parity files.

Earlier evidence bundles remain preserved.

# QA: authorized slices through S21

Date: 2026-10-04
Status: IN PROGRESS
Checkpoint: 56b0fba (S21 implementation 78fb730)
Scope: S01–S17 and S19–S21; S18 excluded due unresolved authorization.
Tier: Standard (critical/high/medium fixes; low issues recorded).
Environment: dedicated local QA PostgreSQL clone, copied private NAS fixtures, API 58130/web 58131/accounting receiver 58132.
Production systems and actual-project R-105 are outside this local acceptance.

## Coverage and evidence

Baseline browser exploration completed for ten routes at desktop and mobile sizes. Prior S21 acceptance: 176 API unit, 122 web unit, 237 PostgreSQL integration, 39 browser tests; this is prior evidence, not a new QA result.

## Findings

ISSUE001 is a reproduced low-severity visual/usability finding, documented below with viewport captures and DOM evidence.

## Runtime notes

Installed gstack browse required its bundled Node adapter and a private ignored dependency repair. Native browser tool failed its Windows sandbox initialization. The local browse adapter is healthy.

Browser baseline completed for ten routes (home, time, workforce, site, documents, revisions, reviews, client reviews, external access, turnkey) at 1280x720 and 375x812. Twenty viewport screenshots and page-text/accessibility captures are in `screenshots/` and `.env.s21-tools/qa21/`; all ten route pairs loaded, all measured `scrollWidth <= innerWidth`, and no persistent console errors were recorded. Existing populated S20 site and Documents details were also opened read-only; API reads returned 200 and displayed 34 site-history events and one view-only project file.

### ISSUE001 — Homepage workspace navigation links run together (reproduced)

**Severity:** Low (visual/accessibility usability). **Status:** Reproduced twice; not fixed in this QA pass.

At `/`, the nine workspace navigation anchors render as inline elements with zero spacing. Their labels concatenate (for example, `TimeWorkforceSite deliveryProject documentsDrawing registerInternal reviewsClient reviewsExternal accessTurnkey operations`) at both 1280x720 and 375x812, making the route choices difficult to scan, especially on mobile. Reproduced on direct home reload at both viewport sizes. Computed DOM evidence and timestamps are in `.env.s21-tools/qa21/ISSUE001-before-desktop.txt` and `ISSUE001-before-mobile.txt`; screenshots are `screenshots/ISSUE001-home-desktop-before.png` and `screenshots/ISSUE001-home-mobile-before.png`. No horizontal overflow or browser console errors. Other route navigation appeared legible in the captured screens.

The single HTTP 500 seen once during site-route loading was not reproduced during two isolated reloads and later successful site/project reads. It coincided with the reported CRM/task DB timeouts during CPU contention and is recorded as transient/unconfirmed, not an application defect.

### ISSUE-001 — Homepage navigation labels joined together (Medium, Visual)
Reproduced after reload at 1280×720 and 375×812: adjacent links touched with no spacing. DOM evidence showed inline anchors and block parent gap normal. Fix: homepage-only flex wrapping and gap in apps/web/src/styles.css. Before: screenshots/ISSUE001-home-desktop-before.png and ISSUE001-home-mobile-before.png. After: screenshots/ISSUE001-home-desktop-after.png and ISSUE001-home-mobile-after.png. Fix status: browser verified at both viewports; production build/full gates pending.

### DOC-001 — Stale integrated S16/S17 release status
Corrected the current Release 3 status row to reflect accepted integration; S18 exclusion preserved. Commit ea511b7. Documentation-only finding, excluded from browser health scoring.

## Fresh manual workflow evidence

- Ordinary existing STAFF session verified; created `QA21 handoff notes` through UI, moved Not started → In progress → Waiting (reason and delay cause), reloaded and saw Waiting, resumed with reason, reloaded and saw In progress. Mobile capture: screenshots/self-task-resumed-mobile.png. No permission overrides introduced.
- Ordinary STAFF Notifications panel opened; optional category/channel and quiet-hour controls rendered. Site project selector had no available projects for this persona. Access projections respected this limited fixture's scopes.
- Browser exploratory malformed API probes produced 400/404; those are tester-generated probes, not application defects. Initial expected signed-out 401 and staff permission-denied 403 are separated from JavaScript errors.
- Parallel broad web run failed two timing-sensitive cases; isolated CRM/review rerun passed 15/15. Two homepage reload retries and populated S20 API requests succeeded after heavy run stopped. Earlier transaction 500 remains transient/unconfirmed; no auth or timeout defaults changed.
- ISSUE001 CSS fix committed as da15e02; refreshed desktop/mobile viewport captures inspected by root. Final gates remain pending.

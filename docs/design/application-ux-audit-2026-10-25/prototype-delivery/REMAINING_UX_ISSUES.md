# Remaining UX issues and acceptance boundary

| Priority | Issue / affected audience | Required next evidence |
|---|---|---|
| P0 before any portal change | Client, secondary Client, consultant/vendor/factory audits are Owner-deferred and BLOCKED | Real existing role sessions/data and authorized read-only audit; no identities/grants/fixtures now |
| P1 before prototype visual acceptance | Dashboard adaptation, shared shell, comments-first detail and larger phone controls differ from exact demos | Owner review of the documented deviations; no production implementation implied |
| P1 before production UX acceptance | Persona and eligible-reviewer lists are synthetic; real options, current capability responses, project lifecycle, stale versions and access loss remain authoritative | Controlled real-session integration tests after separate implementation approval |
| P1 before usability acceptance | No human timing or task-success study has been run | Test approved top workflows with representative internal users; use existing revised-plan success/time/navigation/error criteria |
| P1 before accessibility acceptance | Core create/detail keyboard loops and focus return tested; retained My Work helper popovers/menus have broader legacy keyboard behavior | Manual keyboard and screen-reader audit of every retained helper and real controls; no blanket WCAG claim |
| P1 before mobile acceptance | Emulated Chromium widths cover 320–1440; physical software keyboard, Safari/Firefox, zoom and assistive tech are unverified | Device/browser/200–400% zoom and screen-reader sessions on the eventual integrated candidate |
| P2 future design slice | Widget customization, account/page finder/notifications, other task views, rich review markup, reviewer reassignment, escalation/withdrawal, dependencies, recurrence, site/time/training/closeout are not newly implemented here | Retain owning app routes/actions; expand only through an approved subsequent prototype/implementation slice |
| P2 fidelity limit | Evidence is a text reference; no preview bytes, checksum, upload or external URL is fetched | Integrate existing private file/review contract only after approval; maintain exact snapshot identity |
| P2 recovery limit | Connected objects/receipts are session memory; a reload discards this review session | Do not promise reload/offline persistence from this prototype; use existing production receipt/draft behavior in future integration |

The supplemental source fingerprint reports three differences from the earlier discovery baseline, attributable to the newer independent CI fixture commit; an unrelated ESLint configuration worktree edit also appeared. These remain untouched. No whole-checkout, CI, database, retained-row, staging, operational or production acceptance is claimed by this delivery.

No new product-policy decisions are requested here. D01–D04 are recorded as settled for this bounded scope. The Owner is reviewing the connected prototype and deliberate design deviations. Production implementation remains unauthorized after this delivery.

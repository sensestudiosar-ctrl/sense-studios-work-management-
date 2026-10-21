# Top card adaptation — 12 October 2026

Status: Owner mapping approved; frontend implementation in progress, authenticated acceptance pending.

## Reference and settled scope

Owner requested the demo's Needs action, Overdue, Reviews and Waiting / blocked top cards. The visual reference remains `D:/SCRAP/prototype (2).html`, SHA-256 `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`.

Match the small icon/title, large count, contextual hint, arrow/check and selected treatment. Preserve four accessible controls at 320px and 390px, compact task discoverability, and distinct selected, hover and keyboard-focus states.

Requirements: R-018–R-029, R-096–R-097 and C-023. Current canonical personal scope, independent attention sources, source failures and all task commands remain authoritative. No backend, database, lifecycle, permission or authenticated acceptance work is authorized by this presentation request.

## Metric differences that require a decision

| Requested card | Exact demo membership | Existing application source / unresolved difference |
|---|---|---|
| Needs action | Sample `needsAction` flag excluding done | No authoritative equivalent flag or deduplicated total. Decisions, corrections and management obligations have independent identities and access rules. |
| Overdue | Sample due date before today excluding done | Existing server date filters can query Target or Committed; the card's date basis, day boundary and terminal exclusions need explicit agreement. Do not count only a loaded page. |
| Reviews | Sample review or correction task states | Personal review phase includes approved states and corrections; assigned reviewer inbox counts review rounds. These are different units. |
| Waiting / blocked | Sample waiting state | Canonical Waiting task total is supported. Dependency-blocked work is not the same population and has no separate list total. |

Owner answered “Use this mapping; keep source counts separate.” Implement Needs action as an uncounted shortcut opening Decisions, Corrections and Management, Overdue as unfinished personal tasks past Target, Reviews as assigned reviewer inbox rounds, and Waiting / blocked as canonical Waiting tasks only. Preserve Active, Waiting, Review phase and Completed under More (Task phases for the confirmed-empty Owner); do not relabel phase counts as reviewer-round totals.

## Implemented source contract

- Overdue obtains the authoritative organization day from existing `GET /api/v1/dashboard/sources/tasks`; only its `today` is used. Dashboard attention rows use a different date rule and are not counted here. UTC calendar arithmetic derives yesterday, then the existing task endpoint supplies `scope=personal&phase=active&dateBasis=target&dateTo=yesterday` and the exact server total. Active excludes completed and cancellation-stopped tasks.
- Project, stage, owner, search and status filters are retained. The temporary Overdue preset explicitly pauses an applied date range because the existing single dateBasis cannot intersect Target and Committed ranges. The visible selection explains this, and Clear restores the original applied range and phase. No applied filter is rewritten to disguise the preset.
- Reviews uses existing `GET /api/v1/reviews/inbox?personal=true&offset=0&limit=1` and counts review rounds, without adding corrections. It opens the existing review source and exact round/task links. The card and disclosure are independent snapshots of the same authorized source.
- Waiting uses the existing personal `phase=waiting` total and restores the base phase when cleared. No dependency-blocked task population is inferred.
- Needs action displays Open, not an invented combined number. Its shortcuts reveal existing independent disclosures. These remain mounted during queue loading/failure; authorization remains enforced by their existing APIs.
- Loading, unavailable, denied and stale counts remain explicit, with per-source retry. Invalid or failed calendar reads never fall back to the browser clock, and an active Overdue queue is withheld until the current calendar/count guard is ready. Focus/visibility return and Refresh reread counts/calendar. A stale queue warning is preserved separately.
- Desktop retains four cards. Mobile uses the exact reference's horizontally scrollable 120–145px compact cards, keyboard focus reveals off-screen cards, and inset focus rings stay visible. No horizontal document overflow is introduced.

## Verification plan

Inspect the current card source and callers; preserve count requests, state recovery, phase selection and clearing. Run the affected frontend checks and inspect the current-source read-only component fixture at 1440×900, 1024×900, 390×844 and 320×740, storing new evidence separately under `mw-i02/acceptance/evidence/top-cards-20261012`. Fixtures do not establish authenticated role or backend acceptance. Preserve previous reports and screenshots. MW-I02 remains IN PROGRESS; MW-I03 is excluded.

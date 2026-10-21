# My Work top cards — 12 October 2026

Status: frontend implemented; authenticated acceptance pending. MW-I02 remains IN PROGRESS.

## Approved mapping

| Card | Real meaning and interaction |
|---|---|
| Needs action | Open separate Decisions, Corrections and Management disclosures. No combined number or invented task population. |
| Overdue | Personal unfinished tasks past Target. Organization-local today comes from the existing dashboard source, and the existing task endpoint returns the exact total through yesterday. Completed and cancellation-stopped tasks are excluded by canonical active phase. |
| Reviews | Assigned reviewer inbox total, in review rounds. Opens the existing review source and its real round/task links. Corrections are a separate source. |
| Waiting / blocked | Canonical personal Waiting tasks only. No dependency-blocked aggregate. Clicking selects the matching queue; clicking again or Clear restores the base phase. |

Active, Waiting, Review phase and Completed controls remain under More (Task phases for the confirmed-empty Owner). List, Cards, Kanban, Timeline, search, filters, pagination, Refresh and task commands remain accessible.

Overdue keeps project/stage/owner/search/status filters. An applied date range is visibly paused while the Target-overdue preset is selected; Clear restores that original range. The current single-date-basis API cannot intersect Target and Committed ranges. Calendar failures never fall back to browser time or zero; the selected Overdue queue is withheld until its current calendar/count guards pass. Counts reread on Refresh and focus/visibility return. Loading, denied, unavailable, stale, retry and stale-queue warnings remain independent.

## Visual and interaction evidence

[Screenshot gallery](GALLERY.html). Desktop matches the reference's four-card hierarchy; mobile uses its horizontally scrollable 120–145px strip with native touch scrolling, keyboard focus that reveals every card, and inset focus indicators. Selected, hover and focus states remain distinct. Source shortcuts also work while the task queue is pending; independently authorized sources remain mounted.

All NEW captures are current-source frontend component fixtures with synthetic GET responses and writes disabled. The seven Overdue fixture records and five management links are synthetic coverage, not authenticated task data or genuine exit-workflow evidence. Previous authenticated acceptance and images remain preserved. No PostgreSQL access, startup/stop, disposable database, migration, API runtime or authenticated acceptance occurred in this correction. Only the owned frontend fixture server was used and stopped afterward.

### Mobile geometry at scrollY 0

| Viewport | State | Queue top | First task top–bottom | Fixed nav top | First task visible | Scroll to expose / full task +12px |
|---|---|---:|---:|---:|---:|---:|
| 390 × 844 | Initial | 387.6 | 398.6–620.4 | 778 | 100% | 0 / 0px |
| 390 × 844 | Waiting | 438 | 449–670.8 | 778 | 100% | 0 / 0px |
| 320 × 740 | Initial | 387.6 | 398.6–620.4 | 674 | 100% | 0 / 0px |
| 320 × 740 | Waiting | 438 | 449–670.8 | 674 | 100% | 0 / 9px |

Initial and Waiting task buttons fit above fixed navigation in both sizes. At 320px Waiting the outer card clears navigation by 3.2px; its action has additional internal padding. A 9px scroll adds 12px outer clearance. Post-scroll task clearance and no document overflow passed. Tablet task rows remain 65px. Geometry: [LAYOUT_EVIDENCE.json](LAYOUT_EVIDENCE.json).

The existing component journey verifies touch search/native Filters/Apply/task opening, all four views, preserved phase access, keyboard focus, selection/clear, exact seven-row Overdue fixture results, separate source disclosure shortcuts and full-width five-link Owner disclosure. Unit coverage verifies server totals rather than loaded page size, month/leap/calendar validation, context/race safety, authorization failures, stale/denied recovery, date-filter restoration and shortcuts during slow queue loading.

## Final checks

Pinned Node 24.19.0 / pnpm 11.19.0. Affected frontend **61/61 PASS**. Typecheck for contracts/web/API current client, ESLint and production web build PASS. Full web: **255 passed / 20 failed / 275 total**.

Exact failure classification: **19 known baseline failures**, plus 1 separately observed failure(s): external portal records an Owner-created native share and exposes unconfirmed revocation blockers. The external portal source/test is unchanged by this work and its independent failure was already recorded in the prior report; it is not relabelled as a new MW-I02 regression or added to the 19 historic names. No new affected-test failure remains. Intermediate results from a missing jsdom scrollIntoView double are retained under before-scroll-stub filenames; the corrected test preserves real disclosure/focus assertions.

[Focused results](focused-final.json) · [full suite](full-web-final.json) · [classification](TEST_CLASSIFICATION.json) · [gates](FRONTEND_CHECKS.json) · [combined checks](STUDIO_FRONTEND_CHECKS.json) · [source hashes](SOURCE_HASHES.json)

## Differences and scope

- MW-I02: requested card presentation and approved mappings implemented. Needs action deliberately displays Open rather than a fabricated total. Reviews counts rounds; Waiting does not invent dependency blockers. Current component inspection found no unresolved collision/overflow defect in these states.
- Shared shell: no further shell change in this correction; the previous Owner-authorized studio styling remains. Canonical navigation/permissions are preserved.
- Backend-driven: mandatory Target, optional separate Committed, exact source units, employee-less Owner zero personal tasks and permission-enforced management sources remain. Organization calendar is read via the existing dashboard source; a dedicated lighter calendar endpoint would require later backend planning, not this change.
- Future: mixed-team/membership rules, compound Needs action totals, private-task archival rules and true subtasks remain deferred. No MW-I03–MW-I08 functionality was implemented.

Changed production frontend files: apps/web/src/my-work-metrics.tsx (new), my-work-attention.tsx, my-work-visual.css, task.tsx. Tests: my-work-metrics.test.tsx (new), task.test.tsx. The read-only fixture and existing frontend geometry/check helpers were updated; historical manifests and earlier evidence are untouched. Owner mapping is recorded in TOP_CARD_ADAPTATION_2026-10-12.md.

Functional Reliability: affected frontend PASS; full-web FAIL for separately classified reliability debt; current-source authenticated acceptance BLOCKED pending a newly authorized run. Prior Owner-accepted bounded functional PASS remains preserved.

Prototype Visual Fidelity: inspected current-source component presentation PASS with the approved semantic differences; authenticated visual acceptance BLOCKED pending fresh evidence and Owner review. No literal all-state parity or automatic MW-I02 completion is claimed. MW-I03 was not started.

Intake and final source review: GPT-6.1 Sol. A requested bounded implementation agent reported GPT-6.1 Sol; the test agent's exact runtime selector was not confirmed, so Luna use is not claimed.

# MW-I02 structural UX correction — 2026-10-12

## Scope and evidence boundary

This is current-source frontend evidence from the My Work component with explicitly synthetic GET responses and a simulated shell. The fixture blocks writes and makes no authenticated, API-server, PostgreSQL, or production-data requests. It does not replace authenticated full-shell acceptance. The real authenticated comparison baseline is run `1791787629637-f67aa05623b9` and remains preserved.

The synthetic shell uses the accepted 76px desktop / 119px mobile header, 264px desktop sidebar, and 60px mobile navigation measurements. Its shell is simulated; the new screenshots are not authenticated application captures.

## Structural correction

- Removed the duplicate account eyebrow above the My Work heading.
- Kept the independently sourced personal phase summary compact and moved it ahead of obligations.
- Kept separately authorized Owner/management obligations ahead of the personal queue. Confirmed zero attention sources collapse into one keyboard/touch disclosure with their separate counts; positive, loading, stale, denied, and failed sources remain visible, and positive/error sources expand automatically.
- Kept Search and Filters before the actionable queue. Display/refresh controls, pagination, and explanatory count details follow the queue.
- At 320px, placed confirmed-empty obligation summaries in a single column to avoid narrow, over-wrapped summary cards.
- Search, status filters, Apply, native disclosure state, task opening, selected phase, keyboard phase navigation, focus outline, hover state, and task/navigation clearance were exercised in the synthetic fixture at all four widths.

No backend, schema, permission, lifecycle, or production configuration was changed. After Owner clarification, the existing shared-header Notifications link received the prototype-inspired rounded white alert-control styling. Its route and accessible name are unchanged, and no sample unread count was fabricated. This is a limited styling adoption; shared-shell layout differences remain reserved for MW-I09.

## First-task positions

The `before` column is authenticated evidence from the preserved run. The `after` column is the new component fixture at the same viewport dimensions and simulated shell sizes; treat it as frontend geometry evidence, not full-shell acceptance.

| State / viewport | Before: authenticated queue / first task | After: fixture queue / first task | First task visible at scrollY 0 | Scroll to clear fixed navigation |
|---|---:|---:|---:|---:|
| Designer initial, 1440×900 | 796 / 898 | 374 / 460 | 54px of 54px | 0px |
| Designer initial, 1024×900 | 784 / 838 | 374 / 428 | 121px of 121px | 0px |
| Designer initial, 390×844 | 612 / 653 | 400 / 441 | 229px of 229px | 0px |
| Designer initial, 320×740 | 657 / 698 | 484 / 525 | 155px of 229px (68%) | 86px |
| Designer Waiting, 390×844 | 664 / 706 | 400 / 494 | 229px of 229px | 0px |
| Designer Waiting, 320×740 | 709 / 750 | 484 / 578 | 102px of 229px (45%) | 139px |

At 390×844, the complete first fixture task is visible before scrolling in both states; the simulated bottom navigation begins at y=784. At 320×740, the first task begins above the fixed navigation, but the full 229px task button cannot fit in the 561px unobstructed viewport: 155px is visible initially for Designer initial and 102px for Waiting. The task/action becomes fully clear after scrolling 86px and 139px respectively, with 12px clearance in Waiting. No horizontal document overflow was measured at any width.

## Prototype comparison

Prototype references were hash-verified in the existing manifest (prototype HTML SHA-256 `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`). In the reference, the first sample task begins at y=619 for 1440px and y=540 for 390px; the new synthetic fixture begins at y=460 and y=441. The fixture is 159px and 99px earlier, respectively. That earlier position comes from compact task-local summary/queue structure and omitting prototype-only sample grouping/overdue categories. The prototype’s 320px first row starts at y=540 while the fixture starts at y=525; shell details, task row content, and task-local layout differ, so this is not a pixel-equivalent comparison.

Material task-local issue addressed: the previous authenticated first task sat below the initial viewport on mobile after several task-local summaries and controls. The current fixture demonstrates the first action inside the 390px viewport and substantially more of it at 320px. Remaining shared-header/sidebar differences, including the prototype Alerts control, are reserved for MW-I09 pending scope clarification. Prototype date grouping, overdue categorization, and sample action counts remain future-slice or noncanonical demo data; they were not copied into the application.

## Frontend files and verification

MW-I02 source changes are in `apps/web/src/app.tsx`, `apps/web/src/task.tsx`, `apps/web/src/task.css`, `apps/web/src/task.test.tsx`, `apps/web/src/my-work-attention.tsx`, `apps/web/src/my-work-attention.css`, and `apps/web/src/my-work-attention.test.tsx`. The fixture entry is `apps/web/mw-i02-after.html`; synthetic shell/data and geometry automation are under `.env.checkpoint-tools/mw-i02-visual/`.

- Focused task and attention tests: **49/49 passed** in the serial rerun after one initial concurrent run exposed a transient disclosure-visibility assertion; that test also passed in isolation.
- Web TypeScript check: **passed**.
- ESLint on the affected TS/TSX files: **passed, 0 errors**. ESLint ignores CSS because no CSS configuration is supplied.
- Web production build: **passed** (existing bundle-size and ineffective-dynamic-import warnings remain).
- Responsive synthetic component run: **passed** at 1440×900, 1024×900, 390×844, and 320×740, including initial and Waiting states, Search plus status filtering, Apply, task opening, keyboard focus, and fixed-navigation clearance.
- Full `app.test.tsx` was also sampled but is not a passing gate: 18/32 tests failed while `DashboardWorkspace` threw at `apps/web/src/dashboard.tsx:109` and related Dashboard assertions failed. This is outside the changed My Work components and is consistent with the separately tracked concurrent/baseline frontend reliability debt; this run does not establish a new MW-I02 regression there.

Functional behavior for the bounded MW-I02 scope remains the previously accepted PASS. Prototype Visual Fidelity remains **pending authenticated reacceptance**; the synthetic component fixture cannot establish the full-shell result. On 2026-10-12 the approved authenticated run stopped before database preflight because the readiness script still pinned the superseded 2026-10-10 component source manifest. No PostgreSQL or database operation ran. The historical source manifest remains unchanged; a separate current-source fingerprint now binds the approved frontend state for offline readiness checks. MW-I02 remains IN PROGRESS, and MW-I03 is not started.

## Final desktop adoption and readiness follow-up

- The shared header Notifications link now uses the approved prototype’s compact rounded white alert-control styling on desktop and mobile. The live route and accessible name remain “Notifications”; the prototype-only unread count was not copied because no authoritative current count is available in this header.
- Typecheck, affected TS/TSX lint, and production build passed after the styling change. The affected 49-test suite passed serially; an initial concurrent run had one nonreproducible disclosure visibility assertion, which passed in isolation and in the serial suite.
- The single authorized live acceptance attempt stopped before live cluster inspection: `readiness.mjs` compared current approved `task.tsx` against the historical 2026-10-10 source manifest. That manifest remains unchanged. Readiness now uses separate current frontend and harness source fingerprints and keeps historical review fingerprints for files not superseded by those manifests.
- Offline verification then passed **70 source/readiness checks** and **71/71 inert PowerShell cases**, including parser/operator checks. This is not evidence about live PostgreSQL state. No database setup, PostgreSQL startup, authenticated browser, or API test ran in this attempt.
- A new live preflight and acceptance run requires fresh Owner authorization because the prior single-run authorization ended at the readiness failure.

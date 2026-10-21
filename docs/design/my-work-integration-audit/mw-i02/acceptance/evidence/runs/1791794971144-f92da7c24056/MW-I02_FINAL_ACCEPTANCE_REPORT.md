# MW-I02 authenticated visual reacceptance — 2026-10-12

## Result

- Previously accepted bounded Functional Reliability remains PASS. This reacceptance run's Functional Reliability is **BLOCKED**: the single Playwright journey stopped at the controlled stale-review simulation when its Refresh button was hidden and the locator timed out at `acceptance.spec.ts:1054` after 15 seconds. The test did not establish an API, database, authorization, or user-facing defect. No retry was performed.
- Prototype Visual Fidelity is **BLOCKED** for final acceptance because the monolithic journey did not reach its final assertions/completion. The run did capture fresh authenticated My Work screens before that failure; measurements and key visual states are recorded below. Owner acceptance and formal completion remain pending.

## Evidence boundary for latest Search/Filters styling

After this authenticated run, the task-local Search and Filters controls received the latest prototype-inspired icon, placeholder, applied-filter chip, and compact desktop/mobile styling. The header Notifications styling shown in this run already matches the adopted rounded alert-control treatment. The Search/Filters screenshots linked below predate that final task-local styling adjustment, so they are not evidence of its authenticated appearance. Current-source verification after the adjustment: `task.test.tsx` passed 28/28 and `my-work-attention.test.tsx` passed 21/21 when run individually; a combined serial invocation was 48/49 because the existing positive attention disclosure visibility assertion was intermittent. Typecheck, affected TS/TSX lint, and production build passed. No authenticated rerun is authorized by the consumed one-run approval.

## Environment and checks

- Windows Medium context, Node 24.19.0, pnpm 11.19.0.
- Read-only live preflight passed before setup: retained PG18 cluster PID 26252, system ID `7693570241708228348`, exact approved data directory, `127.0.0.1:45434`; exact disposable target absent; API/web ports free.
- Guarded setup created only `sense_mw_i02_validation_20261009_test`, applied 116 migrations and bound OID `129184` to run `1791794971144-f92da7c24056`.
- Task PostgreSQL integration: **26/26 passed**. Independent Review integration: **3/3 passed**.
- Focused frontend tests: **49/49 passed** serially. Typecheck, affected TS/TSX lint and production build passed. One initial concurrent test run had a single disclosure visibility assertion; it passed in isolation and in the serial rerun.
- Cleanup state: **cleaned**. Run-owned API and web processes stopped; only the manifest-bound database was dropped; the six-entry other-database catalog was preserved. The retained cluster remains running. A post-cleanup read-only identity/absence check passed.

## Authenticated mobile discoverability measurements

Coordinates are CSS pixels at `scrollY=0`. The fixed navigation top defines the unobstructed content limit.

| Role/state | Viewport | Queue top | First task top–bottom | Fixed nav top | Initially visible before nav | Scroll to clear first task |
|---|---:|---:|---:|---:|---:|---:|
| Designer initial | 390×844 | 399 | 440–669 | 784 | Full task | 0 |
| Site Employee initial | 390×844 | 399 | 440–669 | 784 | Full task | 0 |
| Designer Waiting | 390×844 | 452 | 493–742 | 784 | Full task | 0 |
| Designer initial | 320×740 | 484 | 525–753 | 680 | 155px of 228px | 85px; 11px clearance |
| Site Employee initial | 320×740 | 484 | 525–753 | 680 | 155px of 228px | 85px; 11px clearance |
| Designer Waiting | 320×740 | 536 | 578–826 | 680 | 102px of 248px | 158px; 12px clearance |

No horizontal document overflow was recorded at these states. Search-focused and expanded-filter captures were produced at 390px and 320px. At 390px, the first task is fully visible without scrolling. At 320px, the actionable task is discoverable above navigation and fully clear after the recorded scroll; no task action is covered after scrolling.

## Role evidence

- Owner initial captures show zero personal phase counts and five actual authorized Management items. The Management disclosure is expanded and the items are visible; the Owner has no active employee identity. This is run-local synthetic workflow data, not a hardcoded UI count.
- Team Leader, Designer initial/Waiting, and Site Employee authenticated captures were generated at the approved viewport sizes.
- The monolithic test progressed through these role/queue flows and responsive screenshots before failing in the later controlled stale-review simulation. Assertions scheduled after the failure are not claimed as verified by this run.

## Prototype comparison and difference classification

- The notification link now has the compact rounded white alert-control treatment inspired by the approved prototype at desktop and mobile sizes. Its live destination and accessible name remain Notifications. The prototype's sample unread count `3` was not fabricated.
- Search, filter disclosure, Apply/Reset, pagination, display modes, and existing task actions remain the authenticated application's real controls. The current queue uses canonical backend task data; prototype sample categories, dates, Save view control, and sample counts are not represented as live data.
- Remaining overall header/sidebar/navigation composition differences belong to the shared shell and are reserved for MW-I09. Prototype-only grouping and additional future task functions are reserved for their approved future slices. No separate MW-I02 visual defect was demonstrated by this run, but final visual acceptance remains blocked by the incomplete browser journey.

## Fresh authenticated captures

All files below are from this run's actual application and are not component-fixture screenshots.

- Designer initial: [1440](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-initial-1440.png), [1024](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-initial-1024.png), [390](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-initial-390.png), [320](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-initial-320.png).
- Designer Waiting: [1440](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-waiting-selected-1440.png), [1024](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-waiting-selected-1024.png), [390](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-waiting-selected-390.png), [320](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-waiting-selected-320.png).
- Site Employee: [1440](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-site-initial-1440.png), [1024](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-site-initial-1024.png), [390](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-site-initial-390.png), [320](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-site-initial-320.png).
- Owner: [1440](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-owner-initial-1440.png), [1024](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-owner-initial-1024.png), [390](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-owner-initial-390.png), [320](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-owner-initial-320.png).
- Team Leader: [1440](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-leader-initial-1440.png), [1024](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-leader-initial-1024.png), [390](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-leader-initial-390.png), [320](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-leader-initial-320.png).
- Search/filter focus: [search focused 390](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-search-focused-390.png), [search focused 320](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-search-focused-320.png), [filters expanded 390](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-filter-expanded-390.png), [filters expanded 320](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-designer-filter-expanded-320.png).

Approved prototype references are under `../../../prototype/`; their canonical file hashes remain unchanged.

MW-I02 remains **IN PROGRESS**. Do not start MW-I03 or mark MW-I02 complete without Owner acceptance.

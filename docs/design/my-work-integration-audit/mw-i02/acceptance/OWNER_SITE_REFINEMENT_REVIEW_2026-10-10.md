# MW-I02 Owner and Site Employee refinement — review

10 October 2026. This is a focused follow-up to the accepted MW-I02 functional scope. It changes the existing `/my-work` presentation only. No backend, schema, permission, persistence, or workflow code changed. MW-I03 was not started.

## Changes in this refinement

- Owner-without-employee presentation now depends on a successful `/api/v1/tasks/setup` response explicitly returning `actorEmployeeId: null`. A loading or denied setup response is not misclassified as an employee-less Owner.
- When that Owner's personal task result is successfully empty, the existing independently authorized decisions, reviews, corrections, and employee-exit reassignment block moves above the personal queue. The reassignment disclosure opens so its authorized five-item list is visible near the top. Its count remains its own server count; no organization task count is inferred.
- The empty personal queue remains zero and has one short explanation plus a link to the existing Tasks route. Redundant list, filter, paging, and display controls are omitted only for this confirmed empty state. Populated personal queues and their views, filters, commands, and refresh behavior remain unchanged.
- Mobile search, filter, display, summary, long-text, and error spacing rules were tightened for 320px and 390px. Existing buttons retain their touch sizing and focus styling. The shared fixed navigation was not changed.

## Verification

- Focused web tests: **38 passed across `task.test.tsx` and `my-work-attention.test.tsx`**, including successful employee-less setup, denied setup, five-item reassignment disclosure, and existing task/attention behavior.
- Scoped ESLint: passed.
- Pinned web TypeScript check: passed (`pnpm --filter @sense/web typecheck`, Node 24.19.0 / pnpm 11.19.0).
- Web production build: passed. Vite emitted its existing large-chunk and ineffective-dynamic-import warnings.
- No PostgreSQL database was created or accessed for this follow-up. No authenticated browser server is running in this workspace, so a post-change authenticated browser journey and actual after screenshots could not be captured. A visual screenshot attempt with a temporary local fixture also could not run because no Playwright browser binary is installed. No fixture screenshot is presented as real application evidence.
- The previous authenticated Owner captures below are preserved as **before** evidence; the prototype images are the exact approved reference artifacts. They do not show the new after state.

## Visual evidence — 1440px desktop

| Approved prototype | Actual application before refinement |
|---|---|
| ![Approved Owner prototype at 1440px](<D:/app/sensestudios work management app/docs/design/my-work-integration-audit/mw-i02/acceptance/prototype/prototype-owner-my-work-1440.png>) | ![Authenticated Owner application before refinement at 1440px](<D:/app/sensestudios work management app/docs/design/my-work-integration-audit/mw-i02/acceptance/evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-owner-initial-1440.png>) |

## Visual evidence — 1024px tablet

| Approved prototype | Actual application before refinement |
|---|---|
| ![Approved Owner prototype at 1024px](<D:/app/sensestudios work management app/docs/design/my-work-integration-audit/mw-i02/acceptance/prototype/prototype-owner-my-work-1024.png>) | ![Authenticated Owner application before refinement at 1024px](<D:/app/sensestudios work management app/docs/design/my-work-integration-audit/mw-i02/acceptance/evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-owner-initial-1024.png>) |

## Visual evidence — 390px mobile

| Approved prototype | Actual application before refinement |
|---|---|
| ![Approved Owner prototype at 390px](<D:/app/sensestudios work management app/docs/design/my-work-integration-audit/mw-i02/acceptance/prototype/prototype-owner-my-work-390.png>) | ![Authenticated Owner application before refinement at 390px](<D:/app/sensestudios work management app/docs/design/my-work-integration-audit/mw-i02/acceptance/evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-owner-initial-390.png>) |

## Visual evidence — 320px small mobile

| Approved prototype | Actual application before refinement |
|---|---|
| ![Approved Owner prototype at 320px](<D:/app/sensestudios work management app/docs/design/my-work-integration-audit/mw-i02/acceptance/prototype/prototype-owner-my-work-320.png>) | ![Authenticated Owner application before refinement at 320px](<D:/app/sensestudios work management app/docs/design/my-work-integration-audit/mw-i02/acceptance/evidence/artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-owner-initial-320.png>) |

## Acceptance status

**Functional Reliability: PASS for focused frontend behavior and the previously accepted authenticated scope.** The new conditional layout and disclosure behavior passed component tests; the backend and accepted workflows were untouched. Authenticated regression after this exact refinement remains unverified.

**Prototype Visual Fidelity: BLOCKED pending actual after screenshots and Owner comparison.** The code now places separately authorized Owner obligations before the empty personal queue, and mobile spacing/readability rules are refined. A live authenticated app was unavailable to capture the resulting screens, so this report makes no visual sign-off claim. The 320px bottom-navigation conclusion remains the prior finding: the task list is below the initial viewport, while the page reserves scroll space for fixed navigation; this follow-up did not alter shared navigation.

## Remaining differences

- Shared identity header, sidebar, and fixed mobile navigation are outside this refinement; retain them for the approved shell remediation/final cross-screen review.
- The prototype's populated Owner metrics and sample tasks differ from the truthful employee-less Owner's zero personal queue. The prototype cannot authorize fabricated personal membership or substitute organization counts.
- After screenshots at 1440, 1024, 390, and 320, including Owner's five reassignment items and a Site Employee worklist, still require an authenticated application session. The exact disposable validation database was already cleaned and was not recreated.

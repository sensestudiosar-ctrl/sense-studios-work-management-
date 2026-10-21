# My Work prototype acceptance record

9 October 2026 · **Ready for Owner design review. Production implementation remains unauthorized.**

Subsequent Owner color refinement is recorded in [color emphasis](05-color-emphasis.md), including refreshed checks and screenshots. The layout was retained; prior results below describe the initial prototype acceptance and remain separately scoped.

This record separates source review, disconnected browser verification and unrun production acceptance. Exact GPT-6.1 Sol reviewed current authority/contracts and accepted the fixture source with no remaining material contract findings. GPT-6 Luna built the bounded isolated prototype and corrected review findings. The parent performed browser verification and documentation. These were actual models used; no allocation percentage is claimed.

## Checks actually performed

| Check | Result / evidence |
|---|---|
| Prototype TypeScript, focused ESLint, isolated Vite production build | Passed, exit 0, pinned Node24.19.0 and existing dependencies. [Final exact commands/output](../my-work-prototype/verification-final.log); earlier [TypeScript](evidence/prototype-typecheck.log), [lint](evidence/prototype-lint.log), [build](evidence/prototype-build.log). No package installation. |
| Existing Task/MyWorkAttention/ApprovalQueue suites | 31 passed / 3 files. Mocked frontend coverage only. |
| Existing navigation suite | 1 passed / 1 failed: current accessible heading mismatch. Retained unchanged; [findings](01-current-validation.md). |
| Current web TypeScript | Passed, exit 0. No full pnpm verify or database/browser production acceptance. |
| Browser | Codex in-app browser against the isolated loopback preview on port59420. Fictional records, fixed sample date8 October2026. |

The initial restricted-runner cache/config failures, failed port59264 launch and earlier Vite development/HMR errors remain historical evidence. Browser logs included createRoot warnings during hot updates and failed reloads during source editing; a fresh final navigation is distinct from those earlier logs. No claim of an error-free development history is made. The production build passed separately.

[Browser verification record](evidence/browser-verification.json) preserves the disconnected scope, observed passes and limits. [Source preservation](evidence/final-source-preservation.json) records the concurrent CI workflow change outside this task's edit boundary.

## Functional and accessibility checklist

| Contract | Verified scope / result |
|---|---|
| Six attention lenses | Rendered Active/Overdue/Due today/Waiting/Reviews/Upcoming; counts explicitly loaded samples and overlapping. Waiting included ordinary and exit-held work. |
| Exact task metadata | Inspected owner/collaborator, project/branch/stage, canonical status, target and committed date separately, Not committed, task version and next actor. Completed detail retains target without overdue badge after the observed correction. |
| Filter persistence | Search lighting + Cedar & Stone Hotel + IN_PROGRESS + title sort survived reload with one matching row. |
| Paging/history | Page2 survived reload; browser Back restored page1 and Forward restored page2. |
| No matches | Search with no matching fixture showed No tasks match these filters and a clear recovery action; Reset restored rows. |
| Task keyboard selection | Enter on the ordinary waiting row selected it; Resume preview was available. |
| Mobile focus/context | At390×844, task selection focused Back to tasks; background main-area/navigation were inert. Return restored focus to the originating task row. URL task detail also opened with contextual return. |
| Action reason/prerequisite | Wait preview disabled until reason and delay cause supplied. Start preview remained disabled with reason until early-start acknowledgement checked. Source review verified trimmed3–1000 bounds. |
| Action focus and non-mutation | Wait dialog focused its reason; receipt focused Return to task. Tab wrapped to Close, Escape closed and restored the originating action button. Receipt stated Preview only; no change saved. Task status remained IN_PROGRESS. |
| Evidence/action strip | Task/branch/status/version/next actor displayed in task/action/review context. No source file connected; mock review displays Evidence preview unavailable rather than substitute drawing. |
| Exact review return | TSK-2458 + REV-HH-612-03 showed Round3/A-612/R03/named independent reviewer. Return restored prior task and list query. A deliberately stale round showed Task or review round unavailable. Missing/unknown pair denial also source-reviewed. |
| Authorization presentation | Owner-without-employee showed no employee-linked task scope/details. Exit hold retained Devon Brooks as owner with Jordan as collaborator; no ordinary Resume. Terminal task offered read-only history. These are fixture presentations, not server authorization tests. |
| Loading/empty/denied/offline/error | Each task-source scenario rendered distinctly. Denied hid task details/names; offline retained explicitly sample read-only context and disabled command previews; retry recovered. |
| Independent sources | Reviews Denied hid exact review links while authorized task metadata remained visible. Correction/reassignment sources kept their separate task-source outcomes. Decision fixture intentionally empty, with typed queue/source-state presentation retained. |
| Responsive reflow | DOM geometry at1440/1024/768/390/320 found no document/body horizontal overflow. Filter controls remained within the viewport; selects were44px high. Final390 mobile list/detail and1440 desktop captures inspected. [Geometry](evidence/prototype-geometry.json). |
| Visible focus and labels | Pine focus visible on mobile return; native controls/action fields/row commands exposed accessible names in the browser tree. Keyboard modal containment and return checked above. This is not full screen-reader certification. |

## Screenshots

- [Desktop list/detail](evidence/prototype-desktop.jpg)
- [Mobile list](evidence/prototype-mobile-list.jpg)
- [Mobile selected detail](evidence/prototype-mobile-detail.jpg)
- [Preview-only action receipt](evidence/prototype-action-preview.jpg)
- [Current application mobile denied state](evidence/current-my-work-mobile.jpg)

Desktop detail and list use separate scroll regions; mobile detail can show nested vertical scroll indicators. Owner review and later real-device usability checks should assess this scrolling behavior. A narrow320px native sort select shortens its displayed option; opening the native control exposes its complete choices. Neither observation is claimed as final product acceptance.

## Required before any production acceptance

The subsequent leader/Owner and desktop-close extension has its own focused [acceptance record](06-leader-owner-work.md), screenshots, exact check log and browser evidence. MW-09–12 are additional proposals; the original personal-only Owner observation above describes the earlier version, not the new organization context.

- [ ] Owner approves the composition and selects a bounded subset of MW-01–08 for implementation.
- [ ] Full parity inventory: existing List/Cards/Kanban/Timeline and all task/owning-module operations remain reachable. This concentrated prototype does not implement every form/view.
- [ ] Real authorized staff/manager/Owner/client/external sessions, independent source grants, branch isolation, revoked access, held/canceled projects and stale versions verified through existing APIs.
- [ ] Real persistence/reasons/prerequisites/review versions/evidence/notifications/audit/conflicts verified in each owning workflow; no decision inferred from UI visibility.
- [ ] Calendar boundary/count pagination and task-phase versus exact reviewer-inbox meaning validated against actual organizational semantics.
- [ ] Screen-reader checks,200% text sizing/400% browser zoom, contrast measurement of every adopted state, reduced motion, long labels/localization and real touch-device testing.
- [ ] General My Work offline caching remains separately unestablished; no prototype sample cache promise becomes product behavior.
- [ ] Existing navigation mismatch resolved under separate authorized production scope; affected/full required checks pass on the exact implementation tree.
- [ ] Actual-project R-104/R-105 and production readiness remain separate, unverified gates.

No backend/database/schema/permissions/domain changes or production route wiring were made by this delivery. The exact future proposal is [MW-01–08](03-proposed-implementation.md). Work stops for Owner review.

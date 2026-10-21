# Shared studio design language — 12 October 2026

**Status: frontend foundation implemented; authenticated visual acceptance pending. MW-I02 remains IN PROGRESS.**

Owner expanded the final-demo visual language throughout the app. The locked reference is D:/SCRAP/prototype (2).html, SHA-256 F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8. No reference file was changed.

## Delivered

- Shared pine navigation, cream canvas, white panels, sans-serif typography, consistent borders/radii/shadows, form sizing and focus rings across existing workspace routes. Desktop sidebar 232px; tablet icon rail 65px; mobile header 60px and bottom navigation 66px.
- Central palette also reaches sign-in, client/external entry screens and portfolio surfaces. Existing page structures, messages, roles, routes and domain actions remain.
- My Work has compact independent phase widgets, connected Work queue/search/filter/More presentation, canonical colored task rails/status/priority, separate Target and Committed dates, readable mobile task cards and compact 65px tablet rows.
- Search stays expanded after first focus until Reset, preventing the reproduced 50px movement of Filters between touch focus and click. Native filter and display disclosures remain real keyboard/touch controls. All four views and Refresh remain in More.
- Expanded Owner management content uses full width; zero personal tasks and five synthetic holds remain separate. Only fresh confirmed-zero sources compact. Positive, unavailable, denied, loading and stale behavior retains existing logic and unit coverage.

## Evidence boundary

[Open screenshot gallery](GALLERY.html). All NEW captures here are **frontend component previews with synthetic GET responses and writes disabled**, using current TaskWorkspace/MyWorkAttention/WorkspaceLayout or actual Projects/Documents/Reviews/entry components. They are not authenticated acceptance, real task data, role authorization evidence, genuine workflow-generated holds, or backend verification. Prior authenticated results and images remain preserved separately.

The before fixture used a simulated old header; current fixtures use the real WorkspaceLayout and synthetic header/session. Compare task-local sections separately from shell changes. No PostgreSQL access/start/stop, database creation, migrations, authenticated run or backend changes occurred in this work. No current cluster-state claim is made.

## Mobile discoverability — current source fixture at scrollY0

| Viewport | State | Queue container top | First task top–bottom | Fixed nav top | Task visible | Minimum scroll to expose / for full task +12px |
|---|---|---:|---:|---:|---:|---:|
| 390 × 844 | Initial | 386.3 | 397.3–619.1 | 778 | 100% | 0 / 0px |
| 390 × 844 | Waiting selected | 436.7 | 447.7–669.5 | 778 | 100% | 0 / 0px |
| 320 × 740 | Initial | 386.3 | 397.3–619.1 | 674 | 100% | 0 / 0px |
| 320 × 740 | Waiting selected | 436.7 | 447.7–669.5 | 674 | 100% | 0 / 8px |

Both initial tasks are fully visible without scrolling. Waiting at 320px also fits; its outer card clears navigation by 4.5px, while the action has internal padding. An 8px scroll adds 12px outer clearance. Queue container and first task are distinct measurements; the demo at 390px: queue top 334.3px is not the first task, which starts at 540.3px.

### Task-local section comparison (top / height, CSS px)

| Width | Section | Before fixture | Current source fixture |
|---|---|---:|---:|
| 390px | heading | 135 / 44 | 76 / 44 |
| 390px | phases | 185.4 / 71.5 | 132 / 72 |
| 390px | obligations | 264.8 / 60 | 216 / 59 |
| 390px | filters | 332 / 60.4 | 324.3 / 62 |
| 390px | queue | 398 / 9649.3 | 386.3 / 9748.2 |
| 390px | firstTask | 439.1 / 228.5 | 397.3 / 221.8 |
| 320px | heading | 135 / 44 | 76 / 44 |
| 320px | phases | 185.4 / 71.5 | 132 / 72 |
| 320px | obligations | 264.8 / 99.8 | 216 / 59 |
| 320px | filters | 371.8 / 105.2 | 324.3 / 62 |
| 320px | queue | 482.5 / 9887.3 | 386.3 / 9748.2 |
| 320px | firstTask | 523.7 / 228.5 | 397.3 / 221.8 |

Full geometry and actual post-scroll checks: [LAYOUT_EVIDENCE.json](final/LAYOUT_EVIDENCE.json). Twelve representative workspace captures plus 16 entry/portal captures have no horizontal document overflow: [STUDIO_EVIDENCE.json](studio/STUDIO_EVIDENCE.json). Native More/filters/search/status Apply/task opening, four views, Refresh, focus and touch checks passed; simulated header errors are labelled separately.

## Verification

Pinned Node 24.19.0 / pnpm 11.19.0. Focused task/attention tests **49/49 PASS**. Current full web: **243 passed, 20 failed / 263**. All 3 new/current navigation checks pass; the stale navigation assertion remains part of known debt. TypeScript for contracts/web/API against the current generated client and web production build PASS; ESLint PASS. No database generation/migration or API runtime test was invoked.

- **19 known baseline failures:** 18 identity/auth-shell tests and 1 outdated navigation test match the preserved baseline names.
- **1 separately observed independent failure:** external portal native-share/revocation-blocker text. Portal source/test was not edited here. It also failed in isolation; do not classify it as a demonstrated MW-I02 regression or silently add it to the 19 baseline.
- One intermediate attention visibility failure was an assertion racing the existing asynchronous opening effect. Its original result is retained in full-web-before-disclosure-wait.json; the test now waits for both visibility and native open state, without removing either assertion. Final focused/full runs pass that test. A TypeScript-only Testing Library option error was also corrected before final gates.

Exact evidence: [checks](STUDIO_FRONTEND_CHECKS.json), [typecheck/build](FRONTEND_CHECKS.json), [focused](focused-final.json), [full web](full-web-final.json), [failure classification](TEST_CLASSIFICATION.json), [source hashes](SOURCE_HASHES.json).

## Prototype discrepancy matrix

| Surface | Reference / new actual component capture | Corrected structure or presentation | Necessary/backend difference | Deferred difference |
|---|---|---|---|---|
| Designer initial | prototype/designer-{width}.png / final/fixture-designer-initial-{width}.png | Cream/pine shell, compact phase cards, search/filter/More proportions, status rails, dense readable queue | Canonical phase counts, mandatory Target and separate Committed, actual owner rather than demo sample names | No date omitted by Owner; combined Needs action and date groups require settled semantics |
| Designer Waiting | Same locked demo; final/fixture-designer-waiting-{width}.png | Selected phase clear; unselected/hover/focus remain distinct; filtered task visible | Real canonical Waiting phase with independent source totals | Demo noncanonical state names and aggregate counts not copied |
| Owner confirmed empty | Locked design language; final/fixture-owner-empty-five-holds-{width}.png | Full-width automatic management disclosure above empty personal queue | No employee identity means zero personal tasks; five run-local synthetic records are fixture evidence only | Genuine holds/authorization must be reconfirmed through authorized authenticated harness |
| Projects/Documents/Reviews | Locked palette/type/surfaces; studio/fixture-{surface}-{width}.png | Shared shell, typography, neutral panels/controls, readable responsive grids | Existing domain-specific fields/permissions and page structure preserved | Page-specific literal demo parity is not claimed; additional real-data states require review |
| Sign-in/client/external/portfolio | Locked visual tokens; studio/fixture-{surface}-{width}.png | Shared neutral canvas/panel/type language; no overflow | Existing authentication and published-item rules preserved | Populated authenticated portal/portfolio media states not inspected |

**Material current-source MW-I02 defects found in component inspection:** touch focus movement and narrowed Owner panel were corrected and rechecked. No other overlapping control or document-overflow defect was found in inspected states. All-module/all-state visual acceptance is not established by representative fixtures.

**Shared shell:** latest Owner authorization includes styling across routes. Destination sets and workflows remain canonical; shell semantics differ from the demo role switch, Online control and fictional Alerts3 count. No unread total is fabricated.

**Future/backend planning:** private tasks archive at handover once trigger/access/retention are agreed; true subtasks remain planned. Mixed teams/multiple memberships and Needs action need Owner discussion. Keep original client/evidence rules, dates and lifecycle. No new backend capability or future MW-I03–MW-I08 feature was implemented.

## Changed frontend files and acceptance

Production/style: apps/web/src/main.tsx, workspace-navigation.tsx, my-work-shell.css, studio-theme.css, task.tsx, my-work-visual.css. Tests: task.test.tsx, my-work-attention.test.tsx, workspace-navigation.test.tsx. New read-only preview entries: apps/web/mw-i02-after.html, studio-preview.html and visual-fixtures/mw-i02.tsx, visual-fixtures/studio.tsx. Existing unrelated checkout changes are preserved.

**Functional Reliability:** current frontend affected checks PASS; whole-web reliability FAIL due the separately classified 20 failures; current-source authenticated acceptance BLOCKED pending new bounded authorization. Prior Owner-accepted bounded functional PASS is preserved.

**Prototype Visual Fidelity:** component presentation checks PASS for inspected states with the documented domain differences; final authenticated/full-app visual acceptance BLOCKED pending fresh authorized evidence and Owner acceptance. No pixel-exact/all-state claim or automatic MW-I02 completion. MW-I03 was not started.

Context and final source review: GPT-6.1 Sol. Bounded stylesheet/preview work was delegated using the repository routing preference; those agents could not confirm their exact underlying model selector, so Luna use is not claimed. The only process started here was the owned frontend-only fixture server; it is stopped after capture. The pre-existing local application and PostgreSQL processes are untouched.

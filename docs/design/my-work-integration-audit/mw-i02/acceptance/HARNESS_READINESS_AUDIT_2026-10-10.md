# MW-I02 test-only readiness audit

Audit status: PASS

No authenticated runtime claim. This is source/type/local-test readiness, not final functional or visual acceptance. No database or authenticated environment was accessed during this audit. MW-I02 remains IN PROGRESS; MW-I03 excluded.

## Scope and actual review

Parent and GPT-6 Luna inspected the complete monolithic acceptance journey, helpers and current component contracts; GPT-6.1 Sol performed context intake, Review dependency analysis and independent final source review. All existing acceptance scripts/config were read and their exact targets, stage ordering and guards examined. No production/application changes. Previous accepted six frontend hashes and prior successful evidence are preserved.

| Journey area | Current-source comparison / reviewed assumptions |
|---|---|
| Bootstrap, second passkey, recovery, staff enrollment, login/logout | app.tsx identity labels/route guards, normal session endpoints, durable virtual credential binding, one resident Owner credential per virtual device; all manually created contexts have touch capability. Logout checks session revocation before permitted legacy-shell re-navigation. |
| Organization/project fixture setup | Existing supported domain APIs, explicit branch/team grants, assignment/version refreshes and project lead/status workflow; no application permission changes. |
| Reviews/corrections | Genuine submit/start/decision workflow, independent reviewer, category created through Owner API, actual correction task; source totals never merged. |
| Queue fixture counts | 52 named Team Leader tasks yield50+2 pagination; committed-date fixture is52nd. Designer queue counts fetched from API, not inferred from52. Site Employee receives its own task before captures. |
| Task commands | Current form labels/validation and notices; start/wait/resume/edit/complete task states; API expectedVersion and real response statuses; four views, canonical14 status options, exact titles and page contents. |
| Search/filter/navigation | Current labels and form submission; native disclosure open checked before hidden select interaction; reset/current URL/taskId/browser-back behavior; mobile focus exposes Apply/Reset and pending drafts retain actions. |
| Personal phases | Active/Waiting status wording now shared helper with exact current concise text, singular/plural and selected aria-pressed assertion. Count source, workPhase URL, exact corresponding task and clear selection assertions retained. |
| Role permissions | Owner/Team Leader/Designer/Site Employee actual sessions; unrelated task read/write403, malformed ID400, assignment-only manager transition403, stale version409; no role hidden by frontend treated as authorization. |
| Owner holds | Three additional ordinary task records + two run-local Site Employee tasks; exact5 active tasks before supported employee exit; exact5 Owner holds/links, zero Designer visibility, confirmed-empty Owner auto-expanded disclosure. Site populated captures occur before its exit. |
| Responsive/keyboard | Required1440×900/1024×900/390×844/320×740. All mobile loops corrected to shorter320 height. Native tap actionability; explicit44px critical control target assertions; keyboard phase scrolling, queue outline, task opening. |
| Capture state | Wait for exactly3 attention summaries and4 phases to settle, avoid vacuous empty-array readiness. After keyboard check, real heading click leaves Search focus, strip/window reset to0. Normal baseline and focused-search/expanded-filter screenshots kept separate. |
| Geometry | Main/account/task-local sections, queue vs first task, sticky header/nav, available viewport, visible ratio/minimum scroll and actual native post-scroll clearance recorded separately. No geometry-forced visibility or arbitrary pixel acceptance threshold. |
| Controlled state supplements | Real review baseline total/items; request gate continues live loading; explicit503/403 failure-only simulations; independent source statuses/cards remain visible. Phase stale/retry/denied states and whole-queue failure supplements separately labeled; real healthy screenshots captured first. |
| Stage dependency | Review integration creates its own branch/team/staff/grants/project/tasks/evidence/review fixtures per test and uses service actors; no browser-pass/session prerequisite. It runs after browser attempt to avoid visual count contamination. Exact target/live/OID guards remain. |
| Cleanup | Manifest path/root, marker/token, system/starttime/name/URL/user/OID/owner, process creation/executable/command, connection drain and before/after other-catalog guards unchanged. Only run-owned sessions/processes/database removed. No PG lifecycle commands or automatic retries. |

## Minimal corrections made

- acceptance.spec.ts: obsolete early Active/Waiting wording removed; all selected phase assertions use one exact helper. Earlier supplementary mobile loop and /tasks mobile loop use320×740. Added explicit Owner-authenticator existence guards in callbacks and typed create/start Waiting responses, found by semantic TypeScript. Added critical control target-size assertions and separate real focused-search/expanded-filter captures. No valid state/query/task assertion skipped or relaxed.
- run-task-integration.mjs: only procedural browser-PASS prerequisite removed, because Review fixtures are independent; stage argument guidance corrected. Existing live identity/OID/target/env guards unchanged.
- readiness.mjs: source-only semantic TypeScript plus all script syntax; source contracts/viewport/touch/capture paths/fixture and guard checks; exact prototype and six frontend hashes; manual-review version bindings and fresh focused/gate results. Does not import pg or execute the test module.
- setup.mjs: invokes readiness before loading pg or doing port/database work. A changed audited harness/source or failed affected check stops before setup proceeds.

No separate mobile acceptance test and no major monolithic rewrite. Future modularization is reserved for Owner-authorized MW-I03+ work.

## Verification record

Fresh pinned Node24.19.0/pnpm11.19.0: affected task + attention frontend tests **45/45**, workspace typecheck/lint/build **exit0**. Readiness semantic harness/config typecheck uses installed Playwright declarations resolved through the existing pnpm junction graph; no replacement types or dependency installation. Strict check caught8 test typing errors, corrected locally before database authorization. Original mobile component renders/interactions remain applicable because all6 accepted source hashes match; they are synthetic/component evidence, not full-shell acceptance. Previous19 full-web baseline failures remain separately tracked; full web was not rerun.

Readiness evidence directory: evidence/harness-readiness-20261010. Final source audit bindings are written only after edits/review settle, then the gate must run successfully. Static assertions protect reviewed contracts but cannot mechanically prove every dynamic locator or authenticated behavior. Remaining risk is runtime-only synchronization/backend/real-shell geometry; it will be measured by one separately authorized run.

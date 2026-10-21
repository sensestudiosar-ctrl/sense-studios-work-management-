# My Work review findings — source resolution and acceptance preparation

Date: 14 October 2026. **MW-I02 IN PROGRESS.** No MW-I03, deployment, migration application or automatic completion.

## Result

The reviewed bounded changes are implemented in source. Final pinned Node24.19.0/pnpm11.19.0 checks pass: **359 API unit tests /57 suites, 453 frontend tests /45 files, typecheck, lint and API/web builds**. Source readiness passes800 checks; PowerShell safety cases86/86, inert authorization/identity/stage cases57/57, and API target-guard cases30/30 pass. These are source/inert results, not live cluster safety or persistence acceptance. The Owner selected preserving the preview and preparing separate acceptance ports59542/59543; execution still requires fresh bounded approval.

**Functional Reliability: BLOCKED for this new candidate pending authorized real persistence/authenticated regression.** Prior Owner-accepted bounded MW-I02 functional PASS remains preserved.

**Prototype Visual Fidelity: BLOCKED pending current authenticated comparison and Owner acceptance.** Component evidence does not replace that comparison.

## Findings and corrections

| Finding | Resolution in source | Evidence / remaining gate |
| --- | --- | --- |
| Independently paged source arrays cannot form a complete mixed queue | Composer reads Task, Review and Decision policies through one RepeatableRead transaction; filter/count/deduplicate/order once, then page | Unit coverage, 15 prepared real-PG cases; DB cases unrun |
| Permissions could be evaluated at different times inside one response | Transaction-bound authorization read clock and organization calendar; commands retain their current execution-time checks | Authorization/clock unit regressions pass |
| PostgreSQL READ ONLY conflicts with preserved FOR SHARE authorization locks | Preserve RepeatableRead and existing locks; remove READ ONLY transaction mode | Regression and independent Sol source review; real-PG snapshot interleaving prepared |
| Review phase contains approved/terminal work | Add narrow Reviews task metric; retain broad historical phase and assigned reviewer inbox | Predicate/count/query tests and current journey checks |
| Task-only filters silently distort mixed sources | Visible Tasks scope, excluded source counts, Clear restoration retaining shared context | Component/API unit cases; server and browser cases prepared |
| Native Create portaled outside workspace loses form styling | Scope canonical field styles inside dialog; body scroll and footer remain separate | All four captures: fields at least44px, focus/scroll restoration pass |
| Child draft/capacity acknowledgement can outlive navigation | Discard accepted child draft/prompt when changing task; reject dirty/busy departures before card changes | Three reproduced task regressions pass |
| Role label risks implying permission | Nullable Owner-configured presentation only; generic/ambiguous fallback and Owner precedence; canonical capabilities unchanged | Unit cases; real-PG configuration/denial/no-grant case prepared |
| Parent completion / alternate writes / child races need proof | Immutable same-project one-level links, independent access, command and SQL completion guards preserved | Ordinary task regressions plus prepared internal/client completion, commit and concurrent cases |
| Selected source labels inherit near-white text on white tile | Restore dark source labels; darken low-contrast title/hint text under approved D4 exception | Final card normal-text contrast checks pass at all four widths; failed v4 evidence retained |
| Acceptance pins/selectors describe historical source | Current118 migration hashes, portaled form, narrow metric, mixed queue selectors, touch contexts and simulation labels | Full journey semantic TypeScript / MJS parser checks pass |
| Operator ordering/identity depends on manual assumptions | Reusable marker/live identity validation and bound one-attempt stage receipts; independent Review after failed browser; UTC-normalized exact startup timestamp |57 inert cases; no live execution |
| Isolated parity PDF sits outside existing NAS cleanup tree | Place it under runDir/nas/parity; retain existing guarded whole-NAS cleanup | Final independent GPT-6.1 Sol source review PASS; real cleanup remains unrun |
| Preview occupies the former acceptance ports | Pin separate API59542/web59543 in every active harness/target assertion; reject retained ports and URLs; recheck all endpoint exclusions before startup/setup | Timestamped read-only Windows evidence,86 native cases and57 binding cases; no service change |
| Concurrent row rendering invents missing status/priority | Use truthful neutral source chips and omit absent priority; retain canonical supplied values and server order | Four focused regressions plus final453-test frontend run |
| Invalid response timezone crashes new row annotations | Validate timezone before accepting the complete response; render unavailable rather than fabricated fresh rows/counts | Focused invalid-timezone/organization-clock tests |
| Concurrent palette uses inaccessible small labels | Preserve exact fills; approved dark status labels and minimally darkened Low-priority text; all four priority contrasts≥4.5 |36 focused tests and final matched v8 component evidence |

## Changed source areas

- Contracts: `packages/contracts/src/my-work.ts`, exported through `index.ts`.
- API: `my-work.service.ts`, `my-work.controller.ts`, `app.module.ts`; actionable transaction ports in Task/Review/Approval services; `authorization-read-context.ts`, authorization clock; narrow `task-review-metric.ts`.
- Frontend: `actionable-work.tsx/.css` and tests; My Work mount/metrics and TaskWorkspace integrations; `task-create-dialog.tsx/.css` and tests; `my-work-visual.css`; task/session/navigation regressions and jsdom native-dialog test support.
- Existing approved role/subtask source is retained. Candidate migration117 is role presentation;118 is immutable subtask links/guards. **None was deployed here.**
- Prepared persistence evidence: `my-work-parity.database.api.spec.ts`, `mw-i02-disposable-test-target.ts` and30 inert cases. Existing S27 commit-target guard is not widened.
- Harness: current `setup.mjs`, `run-tests.mjs`, `run-task-integration.mjs`, `acceptance.spec.ts`; new `readiness-parity-20261013.mjs`, `parity-source-readiness.mjs`, `authorization-record.mjs`/tests and `run-binding.mjs`/tests. Historical manifests/readiness/captures are unchanged.
- Minor Skills unit-test import/type repair preserves concurrent work and its assertions; no additional Skills business changes were made for this final lint fix.

## Responsive evidence

[Final synthetic gallery](mw-i02/acceptance/evidence/findings-resolution-20261013/components-v8/index.html) contains32 current component captures: eight states at1440×900,1024×900,390×844,320×740. GET-only synthetic fixture; no authentication or real database. All captures have no browser/capture errors or horizontal document overflow. Search/Filters/More controls do not overlap at both mobile sizes; form fields are at least44px. Touch filter apply/reset, drawer opening, attention paging/clear and dialog restoration pass. The truthful neutral attention source chip measures12.03:1; captured first-row text contrast passes. Earlier v5 card contrast checks remain valid for unchanged card styles; v5–v7 are preserved. Four priority contrast assertions pass after the Low label correction.

Exact approved demo SHA256: **F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8**.

| Synthetic state | Viewport | Queue container y | First clickable task/action top–bottom | Fixed nav y | Initial visible target pixels |
| --- | --- | ---: | ---: | ---: | ---: |
| Designer / Site / Leader initial |390×844|433|445–694|778|249|
| Designer Waiting |390×844|502|514–763|778|249|
| Designer / Site / Leader initial |320×740|444|456–705|674|218|
| Designer Waiting |320×740|540|552–801|674|122|
| Designer mixed attention |390×844|433|665–774|778|109|
| Designer mixed attention |320×740|444|730–839|674|0|

Main content starts at y60; fixed navigation is66px tall. Clickable task targets include the row surface: their initial visible portion opens the task. Full initial/Waiting rows at320 require39/135px of scroll respectively for an8px full-row clearance (computed from measured bounds). Mixed attention at320 requires173px: measured post-scroll target557–666,8px above nav. At390 it needs4px for8px clearance, measured661–770 above nav778. Touch task opening separately passes at both widths. Container and first-target measurements are not interchangeable.

### Remaining differences to decide from real evidence

1. **MW-I02, potentially material:** the mixed attention action at320 is below navigation at scrollY0 in this component fixture; it needs173px of scroll. Confirm actual full-shell behavior and demo-equivalent state before closing discoverability. No visual PASS is claimed.
2. **Backend-driven:** separate source counts, required Target/reason, canonical status vocabulary, reviewer/approval authority, Owner zero personal tasks and genuine child lifecycle remain truthful. Sample demo totals/states never replace them.
3. **Shared shell:** header/sidebar/fixed navigation differences beyond already approved styling remain separately classified for bounded shell work/MW-I09. Header contribution is measured separately.
4. **Future slices:** date groups, rich task tabs without canonical data, Site Actions, private-task archival, mixed memberships, risk/follow-up aggregation and new client visibility remain gated. Their absence is not a new MW-I02 regression.

## Test evidence and preserved failures

- API: `.env.checkpoint-tools/mw-findings-api-separate-ports-final-20261014.log` —359/359,57 suites. API input hashes remained unchanged through final frontend verification.
- Web: `.env.checkpoint-tools/mw-findings-web-current-verified-separate-ports-final-20261014.log` —453/453,45 files.
- Static: `.env.checkpoint-tools/mw-findings-source-checks-current-verified-separate-ports-final-20261014.json` —all8 steps pass.
- Readiness: [source-readiness.json](mw-i02/acceptance/evidence/findings-resolution-20261013/source-readiness.json) —800 checks; no live safety claim.
- Frozen [candidate-source.json](mw-i02/acceptance/evidence/findings-resolution-20261013/candidate-source.json) —746 source/runtime/harness files,118 exact migration hashes; source fingerprint752761cbc613f382a4abcfdc58bd209e5cc1b18ec166ba5d7de7eb94e8f722b2.

Historical19/20 frontend failures and earlier accepted runs remain preserved; none reproduces in the full current frontend unit run. This does not establish authenticated reliability. Retained preparation failures include working-directory errors, nested pnpm pin mismatch, Router fixtures, readiness syntax, one5-second frontend timeout during concurrent heavy checks, concurrent source drift, an unused import and an incorrect new-test priority-label expectation. The timed-out test passed unchanged in isolation and in subsequent serial full suites; no assertion/timeout was weakened. Source drift stopped readiness before live operations. Genuine concurrent defects—undefined logout setter, fabricated optional row labels, invalid-timezone rendering and label contrast—have focused coverage and matching final source checks. Build chunk/dynamic-import warnings remain; no production performance PASS is inferred.

Windows source checks use the existing user at Medium Mandatory Level. Read-only diagnosis observed unsupported Linux dependency reparse entries; offline frozen pnpm did not initially restore resolution. Later checks observed native Windows junctions and successful pinned resolution. The guarded single-link repair refused the changed entry and performed no mutation. This report does not attribute that intervening conversion to that failed command. Lockfile and package contents are preserved. Read-only cluster/absence and Windows port diagnostics are separately recorded. No PostgreSQL startup, disposable database creation, preview writes or authenticated acceptance occurred in this preparation.

Known actual models: GPT-6.1 Sol for independent architecture/source review and initial guarded persistence preparation; GPT-6 Luna for bounded dialog/component evidence. A prior agent's exact model was not reported. Two agent continuations hit usage limits; root completed integration/readiness corrections. No routing percentage or final independent live review is claimed.

Final independent GPT-6.1 Sol acceptance-guard source review PASS: exact target/source/marker/OID/approval/stage/cleanup bindings verified, sole synthetic-PDF cleanup finding corrected. It executed no live operations or tests. Newly generated approval receipts will be created only from the actual future Owner reply. The retained115 preview is not upgraded to this118-migration candidate; this report does not claim new backend functionality is running on that server.

## Next authorized gate

Use the [separate-port plan](MW_I02_SEPARATE_PORT_ACCEPTANCE_PLAN_2026-10-14.md) and detailed candidate plan. Request one new bounded approval for this fingerprint and API59542/web59543: conditional one startup if safely stopped, one absent named disposable database with118 migrations, one browser journey, independent integrations, guarded cleanup and restoration only if this run started PostgreSQL. Earlier approvals identify different source/endpoints and cannot authorize this revised candidate. Preserve the existing preview processes and all retained databases,50 tasks,five staff and Owner credentials.

## Native operator wiring correction before live execution

The approved5805…9887 run was not launched. Complete pre-execution inspection caught historical readiness wiring and fixed startup paths. Initial correction changed three native/readiness files and passed78 inert cases. Subsequent fingerprint comparison also caught concurrent application changes; the earlier statement that all application sources were unchanged was inaccurate and is corrected here. Final preparation includes the consistent separate-port changes,86 native cases,57 binding cases, concurrent frontend corrections and800 readiness checks. Case-sensitive unique AttemptId/exclusive startup logs and markers remain required. Current-plan command blocks are parsed. Exact source and migration inputs recorded before checks must match at freeze; matching v8 captures are required. All intermediate fingerprints/logs are preserved. Independent GPT-6.1 Sol source review passes; no startup, setup, authenticated run or database cleanup was executed.

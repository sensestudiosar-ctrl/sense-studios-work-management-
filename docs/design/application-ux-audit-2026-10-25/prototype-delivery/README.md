# Connected internal UX prototype — P1 + P2a

**26 October review-evidence update:** [Mandatory evidence for every review](evidence-rule-2026-10-26/README.md) and [EV01–EV10 application specification](evidence-rule-2026-10-26/APPLICATION_SPEC.md) supersede filename-only prototype evidence. This remains prototype/specification scope; no production implementation is implied.

**Current review candidate:** [Owner-requested P1/P2a refinement](refinement-1/README.md), with before/after evidence and its own final test report. The original delivery and results below remain historical evidence; they are not the latest refinement acceptance.

25 October 2026 · **Prototype review only. Production implementation is not authorized.**

Open [the existing designated review artifact](../../../v1-demo/task-creation-completed-demo.html) directly in a browser. No install, application server, login, backend connection or deployment is needed. [Screenshot gallery](GALLERY.html) · [Playwright report](playwright-report/index.html) · [Visual comparison](VISUAL_COMPARISON.md) · [Capability mapping](SUPPORTED_CAPABILITY_MAPPING.md) · [Remaining issues](REMAINING_UX_ISSUES.md).

## Review the connected workflows

1. Dashboard opens by default. Open **My Work**, search/group the queue, then **New task**. Complete the approved form. The created task opens in the shared detail drawer; its project link opens **Project Tasks** with the same task ID. Return to My Work to retain the query and group.
2. In **Review controls & scope**, select the fictional Owner to create and assign work to another employee. That assignment is visible in Project Tasks and does not enter the Owner's personal queue.
3. Start from **Read review comments** on Dashboard. The original task SS-142 shows the exact round-1 comment, category, severity, evidence reference and linked correction SS-143. Resubmission is blocked while that correction remains unfinished.
4. Open the correction, carry out its sample work and **Complete correction** with a reason. Its optional reference/checklist does not introduce a new completion rule. Return to SS-142, enter a reason and updated file/link reference, and **Resubmit for internal review**. A new round retains the old evidence and decision.
5. Close the drawer and use the separate review controls to select fictional Team Leader. Open the exact review through **Internal reviews** (phone: **More → Internal reviews**). The named independent reviewer can request corrections with comment/category/severity/reason, then separately assign a linked correction. Internal approval and subsequent task completion also remain separate.
6. A newly created internal-review task starts without a reviewer assignment. A manager assigns the independent reviewer through task detail; the worker starts the task and submits evidence. The fixture selector changes the actor in this synthetic session, not application permissions.

Inspect Loading, Error, Empty and Permission states in the review controls, then retry. Creation **Demo states → Lost response** demonstrates checking one request/receipt and recovering the same task without duplication. **Access denied** preserves the draft. Dirty creation closes through Keep editing/Discard; unsent reviewer notes use a discard confirmation. Reload intentionally resets the connected sample session.

## Scope and preservation

This extends `docs/v1-demo/task-creation-completed-demo.html`; its editable creation module remains reused, and `connected-internal-prototype.js` is embedded into that same standalone artifact. There is no new app/package/build target, dependency, API proxy, identity, grant, database fixture or staging operation. The rebuild helper only assembles the existing review HTML from its preserved baseline and review-only sources.

The original approved My Work and Dashboard V10 files remain unchanged; the previous designated artifact and creation source are preserved in `baseline/`. Existing application routes and capabilities remain in the real React application. Unimplemented prototype destinations say so explicitly instead of impersonating functional production screens.

**D01:** Client/external role audits remain **BLOCKED / Owner-deferred**. No client/external identity, grant or fixture was created. Their audit/acceptance must precede portal changes; it does not gate this internal prototype.

**D02:** Creation/assignment, daily/project work and comments → linked corrections → resubmission are the prototype priorities.

**D03:** Daily / Project work / Management / Configuration is used only in this review artifact. Sales & clients retains the existing `/workspace` CRM context. Reports exposes Standard/Saved/Frozen/Run labels while retaining `/reports` and `/saved-reports`. Scheduled summaries and audit remain contexts in their existing owning routes, not invented services or routes. Dashboard remains the default and the phone has five destinations.

**D04:** Only connected P1/P2a construction, tests and delivery are authorized. No production implementation, navigation change or deployment follows this handoff automatically.

## Verification and limits

Use the final `playwright-results.json` and HTML report for exact counts. The final suite contains 42 Chromium tests: six scenarios at each of 1440, 1024, 783, 768, 767, 390 and 320px. Fourteen deterministic viewport image assertions cover Dashboard and review feedback. Their baseline is this review candidate; passing them proves repeatability, **not Owner approval or pixel identity with the approved demos**. Reference comparisons are documented separately.

Tests cover creation/assignment, required errors, personal-scope preservation, one-receipt recovery, shared task/project identity, explicit reviewer assignment, start/submission, correction gating/assignment/completion/resubmission, immutable prior rounds, independent approval, separate completion, state recovery, responsive shell/overflow, dirty close, focus return and modal keyboard containment. All HTTP(S) requests are blocked and counted during prototype tests. Screenshots include desktop, tablet, phone and state examples.

The application-source check in `VERIFICATION.json` intentionally reports drift rather than silently passing: 688/693 hashes match the earlier discovery baseline. Three API-test/CI-fixture differences match the newer unrelated `1520434` commit; concurrent changes also appeared in `apps/web/public/pwa-update-guard.js`, `scripts/staging/service-worker.js` and `eslint.config.mjs` (the latter is outside the old 693-file register). None was edited or reverted by this prototype work. This is not whole-checkout acceptance. No app unit/build/full verify, real-role permission test, database check, staging read/write or deployment was run for this prototype.

Five sampled text/background contrast pairs range from 6.23:1 to 13.11:1. This is sampled evidence, not full WCAG certification. Human usability sessions, physical tablet/phone software keyboard and screen-reader validation remain outstanding. Actual model used: current Codex model; no Opus/Sonnet or independent-agent acceptance is claimed.

Reproduce with installed Node 24.19.0, pnpm 11.19.0 and Chromium:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/HI/AppData/Local/ms-playwright'
node docs/v1-demo/build-connected-prototype.mjs
pnpm exec playwright test --config docs/v1-demo/connected-prototype.config.mjs
node docs/v1-demo/verify-connected-delivery.mjs
```

The supplemental verifier exits nonzero when the old source baseline drifts; inspect its recorded differences. Do not reset or modify unrelated source to make it pass. Historical failed/intermediate attempts are retained separately; only the final candidate's report is the delivery result. Stop here for Owner review.

# P1/P2a Review Evidence presentation refinement

26 October 2026 · **Owner review candidate; prototype only.**

[Open the same interactive prototype](../../../../v1-demo/task-creation-completed-demo.html) · [Playwright acceptance report](playwright-report/index.html) · [Actual test JSON](playwright-results.json).

**Final result: 122/122 passed; zero failures, skips or flaky cases; retries disabled.** [Screenshot gallery](GALLERY.html) · [Final hash/results receipt](FINAL_VERIFICATION.json). The same local preview returned HTTP 200 with the local-selection and reviewer-access disclosures. File-positive cases explicitly simulate a receipt; they are not successful real uploads or proof of storage.

The separately named `task-creation-completed-demo(2).html` was not present in the workspace or local Downloads. This refinement uses the canonical artifact served in the user's browser, `docs/v1-demo/task-creation-completed-demo.html`; its preceding version and evidence module are preserved under `before/`. No duplicate frontend/application was created.

## Requested refinements

| Request | Result |
|---|---|
| Evidence immediately beneath guidance | The required **Review Evidence** panel is the next sibling of next-action guidance. Evidence and the existing action reason precede the brief, people/target metadata and secondary details. |
| Clear evidence choices and preview | **Attach file** / **Add link** have selected-state styling. The panel shows the selected filename/size or normalized URL as text; it does not create or open an external preview link. |
| Block review without current qualifying evidence | The shared command guard preserves the exact required inline message and focuses the invalid evidence control. Correcting evidence clears a stale evidence error. Existing worker/start/reviewer/correction/reason checks still apply. |
| Local selection is not storage | Local selection/hash stays `LOCAL_SELECTED` and cannot qualify as a confirmed attachment. It explicitly says not uploaded/stored. A separate **Demo: simulate storage confirmation** test control creates only `SIMULATED_CONFIRMED` / `DEMO-RECEIPT-*` metadata. It is labelled synthetic and never uploads or retains file contents. |
| URL format is not access | Validation follows the existing public HTTPS format rules. Ready/pending previews explicitly say reviewer access is unverified. No external URL is fetched or opened. |
| No duplicate current-round messages | One current-round/reviewer status remains. Guidance and success feedback no longer repeat its round number/awaiting text. Review history is progressively disclosed and remains available in full. |
| Mobile next-action hierarchy | Dashboard's existing Next action card moves before the fixed summary module on phones in **DOM and visual order**. Desktop placement, design foundations, task creation and navigation remain. Task guidance/evidence are early in the drawer with the primary action retained in the sticky footer. |
| Exact versions/history/carry-forward | Task/submission/round snapshots remain immutable; old evidence alone, renamed identical bytes and unchanged/fragment-only URLs cannot satisfy a new round. BOTH retains independent internal approval and reuses the exact approved evidence identity without a duplicate upload. |
| Client scope | The rule remains normative for INTERNAL, CLIENT and BOTH. Client staff preparation uses the shared guard but does not publish or create a client round. Client/external audit acceptance remains **BLOCKED**. |

The prototype's simulated receipt is **not** an actual upload/storage receipt or proof of file eligibility/access. Submitted file snapshots keep `uploaded:false`, `retained:false` and the simulated receipt identity. The pending/read-only preview preserves the disclosure, rather than implying a local hash uploaded anything. Production must use the existing completed storage receipt, exact private file/revision and current server authorization; this task does not implement those services.

## Acceptance scope

The configured suite contains **122 cases**: the previous 107 regression/evidence cases plus 15 presentation/storage/access checks across **1440, 1024, 768, 390 and 320px**. The legacy responsive cases additionally cover 767/783 boundaries. Fourteen candidate visual comparisons cover desktop/mobile Dashboard and review layouts; candidate snapshots were generated separately, not treated as Owner approval. Read the final JSON/HTML report for actual pass/failure counts and duration.

Coverage includes missing evidence, malformed/private/credential-bearing links, valid links, local file selection blocked before simulation, explicitly simulated confirmation, repeated file/link rejection, updated correction resubmission, exact immutable earlier snapshots, BOTH approval/carry-forward, blocked Client publication, focus/draft protection, structural evidence placement, filename/link preview and disclosure, early mobile next action, and a single current-round status. Browser tests assert zero uncaught errors and zero attempted HTTP(S) requests while those requests are blocked.

Before/after HTML is retained; screenshots are in `screenshots/`, and visual baselines in `visual-baselines/`. The initial focused-test failure was an ambiguous Close selector matching both the close icon and Back to list; the selector was corrected and the failed attempt retained separately.

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/HI/AppData/Local/ms-playwright'
node docs/v1-demo/build-connected-prototype.mjs
node node_modules/@playwright/test/cli.js test --config docs/v1-demo/evidence-presentation.config.mjs
```

## Remaining limits

Owner visual/usability approval remains pending. No physical mobile, Safari/Firefox, screen-reader or human usability study is claimed. No real stored attachment, remote link access, Client identity/role, client publishing or production authorization has been verified by a simulation. The previously documented server-side freshness enforcement gap still needs a separately authorized application implementation and real persistence/version/concurrency tests. No production frontend/backend, database, API, permission, dependency or deployment was modified by this work; unrelated application worktree changes remain untouched.

Stop after Owner review delivery. No automatic production implementation follows.

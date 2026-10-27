# Mandatory review evidence — prototype/specification delivery

**Current Owner refinement candidate:** [Review Evidence placement and storage/access clarification](../evidence-refinement-2026-10-26/README.md). Local file selection/hash alone no longer qualifies in the prototype: positive file tests require a distinctly labelled simulated receipt, with no actual upload/retention. The preceding 107-case report below is historical; use the refinement's 122-case acceptance report for the current artifact.

26 October 2026 · [Application specification EV01–EV10](APPLICATION_SPEC.md) · [Updated prototype](../../../../v1-demo/task-creation-completed-demo.html) · [Actual test results](playwright-results.json) · [Playwright report](playwright-report/index.html).

**Confirmed final result: 107/107 passed; 0 failed, skipped or flaky; retries disabled.** This includes the previous 82 regression cases, 25 evidence-specific cases and 14 unchanged candidate visual comparisons. [Screenshots](GALLERY.html) and [final artifact receipt](FINAL_VERIFICATION.json) are included. The local preview returned HTTP 200 with the new policy and exact validation message at `http://127.0.0.1:59444/task-creation-completed-demo.html`.

The same connected review artifact now requires a selected file attachment or valid public HTTPS link for an eligible review submission. Typed filenames, invalid/private/credential-bearing links and empty evidence are blocked with exactly:

> Add at least one file or link before submitting for review.

The current API accepts one selected file/revision/link; the prototype explicitly chooses File or Link. Files are hashed locally in browser memory for synthetic evidence identity and never uploaded. Links are never opened or fetched. A pending hash or invalid current source cannot pass the guard.

Every accepted initial submission/resubmission gets an immutable task/version/submission/round evidence snapshot. Resubmission starts with no selected evidence; unchanged file bytes are rejected even if renamed, and unchanged/fragment-only links are rejected. Updated files/links create a new snapshot without changing the earlier evidence or closed-round history. Creating/starting work and completing ordinary NONE-review correction tasks remain possible without review evidence.

BOTH still requires independent internal approval before authorized client handoff. The handoff refers to exactly the approved evidence snapshot, so no duplicate upload is needed. Current publishing, confidentiality/file, client, Primary Client and final-approval gates remain mandatory. CLIENT staff evidence preparation uses the same guard but deliberately cannot publish or create a client round: the real Client/external audits remain **BLOCKED / Owner-deferred** under D01.

The application workflow, master UX plan, interaction specification and acceptance gates reference EV01–EV10. This is normative coverage for every review mode, not authorization to change production. Read-only source inspection confirms existing evidence/URL validation, immutable snapshots and exact approved-evidence carry-forward. **Full server-side rejection of unchanged correction evidence was not verified in the inspected path.** A separately authorized implementation must enforce that rule with current stored versions/digests and real persistence/permission/concurrency tests. No backend/API/schema/permission changes were made here.

The test suite includes the existing **82 regression cases** and **25 evidence cases** at 1440, 1024, 768, 390 and 320px. Use the final JSON/HTML report for actual counts. Evidence cases cover missing/typed/invalid evidence, valid links and actual file selections, renamed unchanged files, unchanged/fragment-only links, updated resubmission, exact-round metadata and unchanged history, independent BOTH approval/same-identity carry-forward, and blocked Client publication. Browser tests block/count HTTP(S) requests and assert zero uncaught page errors. These are synthetic local-file checks, not client-role or production acceptance.

Previous artifacts are preserved in `before/`; failed/intermediate test attempts remain separate. The exact new message and real evidence choices replace older filename-only fixtures. Earlier failures exposed an ambiguous test locator and a reference to an inaccessible inherited closure; both were corrected. The final test command uses installed dependencies directly:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/HI/AppData/Local/ms-playwright'
node docs/v1-demo/build-connected-prototype.mjs
node node_modules/@playwright/test/cli.js test --config docs/v1-demo/mandatory-evidence.config.mjs
```

No application/staging code, database, permissions, APIs, dependency declarations or deployment were changed by this work. Existing unrelated worktree changes were left untouched. Local file hashes do not prove server upload/access; changed URLs do not prove remote content changes; historical provenance must not be fabricated. Real client-role, physical-device, screen-reader and operational acceptance remain outstanding. Production implementation/deployment remains unauthorized after delivery.

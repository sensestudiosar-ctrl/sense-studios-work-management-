# Task UI demo — connected P1/P2a review extension

Latest Owner review candidate: [Review Evidence presentation/storage clarification](../design/application-ux-audit-2026-10-25/prototype-delivery/evidence-refinement-2026-10-26/README.md). Evidence is directly beneath guidance; local selection is not stored evidence, URL format is not reviewer access, and client publishing remains unverified/blocked. The same designated artifact is used; no production implementation is authorized.

26 October evidence rule: [Mandatory evidence for every review](../design/application-ux-audit-2026-10-25/prototype-delivery/evidence-rule-2026-10-26/README.md). File selection or valid link is required for a new review submission; updated evidence and exact immutable round history are preserved. This remains prototype/specification work, not application implementation or deployment.

Current refinement candidate: [mobile navigation, contextual return, reviewer setup and state-aware guidance](../design/application-ux-audit-2026-10-25/prototype-delivery/refinement-1/README.md). The same artifact is updated; production implementation remains unauthorized. Earlier notes below describe the preserved baseline.

25 October 2026: Owner D01–D04 authorize **prototype only**. The same designated `task-creation-completed-demo.html` now connects Dashboard, approved My Work/creation, Project Tasks, internal review, linked corrections and resubmission. Default fictional persona is Designer; Owner remains in separate review controls. Read the [delivery and exact test/acceptance boundary](../design/application-ux-audit-2026-10-25/prototype-delivery/README.md). No application implementation or deployment is authorized. The following 17 October notes describe the preserved approved baseline; its original artifact/source are retained in the delivery `baseline/` directory.

17 October 2026. Open `task-creation-completed-demo.html` directly in a modern browser. It is self-contained; no server, package install, real API or database is required.

## Current Owner correction

The Owner rejected the replacement queue and requested My Work exactly as their past demo, with better task creation. The current HTML uses the exact supplied `Sense_Studios_My_Work_Final_Demo.html` as its base, SHA-256 `f8c18088e04c72acee34c38bdb458bf84fc8cf9fc834667a75e3d5a3d95c59b8`.

Read-only original: `D:/1.Sensestudios/DR RAJA/01.Designer/03. Renders/AFTERPHOTOSHOP/Sense_Studios_My_Work_Final_Demo.html`. No external reference was edited.

The sidebar, default role layout, widgets, groups, rows, color legend, filters, saved-view controls, drawers and mobile navigation come directly from that original. The original defaults to its Owner preview, so task creation requires an explicit employee. Role selectors remain prototype controls, not real impersonation or authorization.

Only the base browser-storage namespace changes (`sense-demo-` to `sense-task-refined-demo-`), isolating this study from the original preferences/tasks. An appended isolated creation module replaces creation entry points. All added styling lives in Shadow DOM and cannot restyle My Work.

## Improved task creation

Desktop has a brief column and separate Assignment & timing panel; mobile stacks the same fields in a native modal with scrollable body and fixed action footer. Project/non-project scope, primary owner, Target, priority and review requirement remain visible. Collaborators, planning, checklist and tags expand as optional details. Owner has no invented employee identity. There is no mandatory upload, reminder, private-visibility promise or role-as-owner field.

Use the original Create task header/floating action. Fill title, Project (for project work), primary owner if required, Target and reason. Team Lead/Owner can choose an employee and search collaborators. Staff self-tasks use the original demo's current person. Created records enter the original fixture store and their canonical drawer opens; filters/grouping/scope remain. An assignment need not appear in its creator's personal queue.

The form's Demo states menu supports success, lost response after creation, capacity warning and denied access. A lost response commits one fixture task and offers Check creation result, using the same command/key and returning the same ID. Pending creation blocks repetition/dismissal. Dirty close asks Keep editing/Discard. Draft/recovery state is in memory; no reload recovery promise.

All inherited My Work actions remain original prototype behavior. Copying them grants no new production reopen/delete/approval authority. The real application's terminal rules and owning workflows remain authoritative during integration.

## Verification

Four final local-file journeys passed at1440x900,1024x900,390x844 and320x740. Default My Work viewport screenshot bytes and rendered main DOM matched the original exactly at all four widths, using the same fixture clock and clean storage. This proves those equivalent baseline states, not all-role/all-state production fidelity.

Those journeys also passed validation/first-error focus, lost-response one-task/one-receipt recovery, dirty-close retention, Owner assignment/collaborators and personal-scope preservation. No page errors or external requests were observed. All owned browsers closed. Initial tests omitted the Owner's required employee; the failed fixture run is preserved and final journeys select it explicitly.

Evidence: `.artifacts/v1/20261017-task-ui-correction/` at the repository root, including original/revised images, creation/recovery/assignment captures, checks, report and final source receipt. The rejected earlier HTML is preserved there. Editable creation source is `task-create-refinement.js`, embedded in the standalone HTML; editing that source alone does not rebuild the HTML automatically.

The Refero research remains secondary for creation hierarchy/recovery. The exact Owner My Work reference overrides the earlier generic completed-list composition. No application code, runtime or database changed. Actual mobile software-keyboard, real permission/persistence and staff-pilot acceptance are not claimed.

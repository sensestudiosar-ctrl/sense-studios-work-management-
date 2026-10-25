# Real-role UX audit — revision2

25 October 2026 · Actual backend-authenticated existing test accounts. No simulated session/API fulfillment.

## Authentication and scope

Existing enrolled STAFF test passkeys were loaded from the protected test store into a virtual authenticator, then normal server challenge/signature/user-verification/session checks ran. Account IDs and STAFF kind were verified from `/auth/session`; employee/job-role context from `/org/self`; assignment capability from `/tasks/setup`; Project Lead/current capabilities from `/projects/:id`; named waiting reviews from `/reviews/inbox`. Hardware is emulated, **server identity, session, persisted role, scope and responses are real**. No test-only session insertion, grant bypass or mocked role responses occurred. This does not establish physical passkey-device or actual operational staff acceptance.

The first run was interrupted to correct an encoded-space evidence-output path. Its89 Leader1 captures remain preserved under initial-url-path-attempt; no application files were involved. A repeated login from the older authenticator counter returned401. Public current signing-counter metadata was read in a READ ONLY transaction to restore the test authenticator counter; the server credential/verification policy was not edited or bypassed. The subsequent ordinary interaction logins passed. Normal auth changes ceremonies/counters/security events/sessions; no domain command was submitted.

## Actual role coverage

| Account fixture | Persisted job role | Read-only entry views | Verified project authority | Assignment / presentation | Waiting reviews |
|---|---|---|---|---|---|
| leader1 | Team Leader | 29 routes ×1440/783/390 | Current Project Lead; returned capabilities apply | canAssign=true; EMPLOYEE/GENERIC_FALLBACK | 2 |
| leader2 | Team Leader | 29 routes ×1440/783/390 | Current Project Lead; returned capabilities apply | canAssign=true; EMPLOYEE/GENERIC_FALLBACK | 1 |
| designer1 | Designer | 29 routes ×1440/783/390 | Assigned contributor; returned capabilities apply | canAssign=false; EMPLOYEE/GENERIC_FALLBACK | 1 |
| designer2 | Designer | 29 routes ×1440/783/390 | Assigned contributor; returned capabilities apply | canAssign=false; EMPLOYEE/GENERIC_FALLBACK | 1 |
| site | Site Staff | 29 routes ×1440/783/390 | Assigned contributor; returned capabilities apply | canAssign=false; EMPLOYEE/GENERIC_FALLBACK | 0 |

Both Team Leaders are recorded Project Leads, not a separate account kind. All five currently receive generic EMPLOYEE creation presentation; do not change this by inferring a profile from their titles. Leaders canAssign=true, Designer/Site=false, but other Project commands follow their exact returned capability set. Current Project Lead capability does not grant Owner-only contributor/lead administration.

Evidence totals: 435 broad real-account entry captures; 604 capture records including creation/detail/Project/review and focused correction states. Some entries contain source-loading states. These are walkthrough evidence, not604 passed product test cases.

## Important read-only interactions

- Each of five accounts opened/closed its actual current task creation form without submission, inspected an own accessible task detail and its real Project/People context.
- The four Leader/Designer accounts had named waiting-review records and opened one assigned review. Site had zero waiting assignments; no review was fabricated.
- Designer1 and Leader1 traced an existing correction-required task to its exact round decision/comment/severity/category and linked canonical correction task. The response reports submit=false while correction is incomplete. Current review service requires correction completion before eligible original-task resubmission. No work was changed/completed/resubmitted.
- Task/Project/history/source data came from actual retained fixture records. Caller role alone did not select a scope or manufacture a successful decision.

## Findings affecting the plan

| Finding | Interpretation and UX response |
|---|---|
| Independent attention/queue source loading | Preserve per-source loading/unknown/error and current count basis. A task count may load before separate review/decision data. Do not display unknown as0 |
| Generic creation profile on all five staff accounts | Presentation configuration and assignment authority are separate. Keep current server values; Owner can review presentation configuration separately if desired |
| Current Project Lead differs from Owner | Supervision UI may expose current lifecycle work without exposing Owner-only assignment/lead administration. Use returned capabilities |
| Project-template reads return403 for these staff | A real denied state, not automatically a defect. Retain clear unavailable access path; do not infer permission from title |
| Incomplete correction blocks resubmission | Put exact review comments and correction task link close to the worker action; explain current prerequisite; no universal Edit/Complete shortcut |
| Site title alone is insufficient authority | Existing assignment/responsible-person/grants and capabilities decide operational controls; do not invent site permissions or offline defaults |

## CLIENT/EXTERNAL and absent states

READ ONLY retained inventory verifies one OWNER/five STAFF accounts; **zero CLIENT/EXTERNAL accounts, zero portal grants/sessions, zero client packages/items**. There is no existing canonical portal session/password to reuse. Earlier disposable tests do not prove current sessions. The Owner is asked only for the isolated-fixture decision D01; no password/OTP is requested.

Primary Client, secondary Client, Consultant, Vendor/Factory and any absent part-time/intern/configured policy/site/training/evidence variants remain **BLOCKED / NOT VERIFIED**. Anonymous login and approved demo persona controls do not close them. The internal accounts cover current staff roles, not every possible future grant/policy combination.

## Verification limits

- Uncaught page errors in retained successful role runs: 0.
- Blocked domain mutation attempts recorded: 0. No task/project/review/HR/configuration command submitted.
- Per-page navigation capture errors: 0; exact failures, if any, remain in VALIDATION_SUMMARY.json.
- Readiness/role audit does not certify ID tampering, cross-Branch security, concurrency, persistence after writes or full operational workflows; no adversarial permission suite or product suite was run.
- Actual human usability study, screen reader, physical software keyboard, full regression/build/deployment and production acceptance remain NOT RUN.

## Role evidence files

- REAL_ROLE_EVIDENCE.json and initial-url-path-attempt/REAL_ROLE_EVIDENCE.json: broad entry run and preserved first Leader1 session.
- ROLE_INTERACTION_EVIDENCE.json:5 normal backend sessions, current role/capability responses and selected interactions.
- CORRECTION_WORKFLOW_EVIDENCE.json: focused Designer1/Leader1 comment/correction reads.
- RETAINED_ROLE_INVENTORY.json: current account-kind/grant/package counts, no tokens/private keys.
- ROLE_AND_DEMO_GALLERY.html: actual selected-role images and distinctly labeled reference demos.

# Mandatory evidence for every review submission

**Presentation/storage clarification, 26 October:** [The refined prototype](../evidence-refinement-2026-10-26/README.md) places Review Evidence directly beneath next-action guidance. A local file selection/hash is not a completed upload or storage receipt and must not pass a production submission gate. The prototype's positive file tests use a separately labelled simulated confirmation, retaining `uploaded:false` / `retained:false`; they do not verify storage. HTTPS format validity does not verify reviewer access. Retain one current-round status, an early mobile next action and exact unchanged history. These clarifications do not change EV01–EV10, current backend authority, or the blocked client-role acceptance boundary.

26 October 2026 · Explicit Owner requirement · Normative application UX specification and prototype rule. **Production implementation/deployment remains separately unauthorized.**

This supersedes any demo behavior that accepts a typed filename, checklist, comment, or historical evidence alone as a new review submission. It applies equally on desktop, tablet and mobile, while preserving current authorization, private-file access, API contracts and review sequencing.

| ID | Mandatory rule and acceptance |
|---|---|
| EV01 | INTERNAL, CLIENT and BOTH submissions require a current file attachment or valid current review link. Creating, starting and working on a task do not require review evidence. |
| EV02 | Apply the same guard to initial submission and every correction resubmission, from every task/project/review/worklist entry point. |
| EV03 | Disable or block submit if current evidence is missing, invalid, pending, failed, inaccessible or unconfirmed. Keep the draft and focus the evidence control after a failed attempt. |
| EV04 | Display exactly: **“Add at least one file or link before submitting for review.”** Supporting guidance may explain invalid links or unchanged evidence but must not replace this message. |
| EV05 | Bind evidence to the exact task ID, server task version/expectedVersion, submission ID/version and review round. File evidence retains exact file/revision/blob IDs, checksum and confirmed access/receipt. Link evidence retains its normalized URL/digest. A typed filename or pending upload does not qualify. |
| EV06 | Every accepted submission creates a new immutable evidence snapshot. Never overwrite or silently replace an earlier round's evidence. Preserve reviewer comments, correction linkage and decision history. Existing pending decisions may progress normally; completed-round evidence cannot be edited. |
| EV07 | Resubmission requires newly supplied updated evidence. Do not auto-select history for a new round. Re-selecting unchanged bytes, renaming an unchanged file, or providing the unchanged previous reference alone is insufficient. |
| EV08 | BOTH requires independent internal approval of exact submitted evidence before authorized client review. Legitimate internal→client carry-forward references that same approved snapshot/submission and does not require another upload. This carry-forward is not a correction resubmission. |
| EV09 | Retain existing current worker/start, independent reviewer, active project, expected-version, correction completion, confidentiality/file access, publishing/client-role, Primary Client and final-approval requirements. Evidence readiness grants no authority. |
| EV10 | Server failure must not produce optimistic success. Preserve draft/current evidence and use existing retry/receipt semantics. Failed client routing must not fabricate approval, replace evidence or create duplicate publication/upload. |

## Selection and validity

The current review API accepts **exactly one selected file, drawing revision or link**. The minimum-evidence requirement does not authorize a multiple-file API payload. The prototype explicitly selects File or Link and submits that current source; other supported attachment workflows retain their existing contracts.

Links follow `apps/api/src/review-work-evidence.ts / reviewLink`: public HTTPS; at most 2,048 characters; no whitespace/control characters/backslashes, credentials, private/local host/IP literal or unsupported port. Normalize consistently. Links are references and must never be fetched or opened to perform validation. Existing server validation remains authoritative.

Production file evidence must use the existing completed upload/storage receipt and authorized current file/revision. The prototype file picker hashes selected bytes locally in memory and records a **synthetic** evidence ID/checksum. It neither uploads bytes nor proves server storage/access. A real file selection is needed for the file branch; file content never leaves the browser.

The prototype detects unchanged prior file bytes by SHA-256 even when renamed. It compares normalized version-specific links without treating fragment-only changes as new evidence. A URL change identifies a new reference, not proof that remote content changed. For resubmission, an unchanged shared URL alone is blocked: provide a new version-specific reference. Production must enforce freshness through current stored version/checksum/immutable evidence data without arbitrary URL fetching or an invented attestation bypass. Preserve incomplete legacy provenance as historical data; never fabricate checksums or rewrite history to pass validation.

## Review-specific workflow

| Context | Evidence and unchanged existing gates |
|---|---|
| Initial Internal | Current file/revision/link; worker/start/reviewer/project/version/access checks |
| Internal correction resubmission | Updated evidence/new round; assigned correction complete; previous snapshot unchanged |
| Initial Client | Exact evidence accepted by existing publishing workflow; current staff/client/file authority and task/revision eligibility |
| Client correction resubmission | Updated evidence/new owning submission/item version through existing correction/approval workflow; earlier package/item snapshot retained |
| BOTH internal stage | Current evidence and independent internal review before client delivery |
| BOTH client carry-forward | Same exact internally approved evidence identity, with current publishing/client/file eligibility rechecked; no duplicate upload |
| BOTH after corrections | Updated evidence/new internal round, followed by authorized carry-forward of that exact newly approved evidence |

## Backend compatibility and explicit implementation gap

Read-only inspection confirms `ReviewService.submit` already requires exactly one file/revision/link, enforces worker/version/reviewer/correction gates, and writes the submitted snapshot. `review-work-evidence.ts` normalizes strict HTTPS references, stores file/blob/checksum identifiers and detects snapshot digest changes. `ClientReviewService` retains exact work submission/evidence, rejects absent evidence and preserves exact independent approval for BOTH. Existing authorized routing carries approved evidence forward without another upload; client final approval and formal issue remain separate.

**This task does not implement or certify production enforcement of the new freshness rule or exact UI message.** The inspected server path was not shown to reject every unchanged-evidence correction resubmission. Freshness is now normative under the Owner's instruction. A separately authorized implementation must enforce it server-side using existing immutable evidence/version data and verify real persistence, permissions, stale-version behavior and concurrency. A prototype/frontend guard is not complete application enforcement. No backend/API/schema/permission change or deployment occurred here.

Client/external real-role audits remain **BLOCKED / Owner-deferred** under D01. The prototype uses the shared guard for Client **staff evidence preparation**, and demonstrates BOTH's approval/carry-forward gate. It does not create identities/grants or execute a client publishing/portal action. Those checks are not client-portal acceptance.

## Required checks

At 1440, 1024, 768, 390 and 320px, reject empty evidence, typed filenames, invalid/private/credential-bearing links with EV04; accept eligible selected files and valid links; permit creation/start without evidence; reject identical bytes renamed or unchanged/fragment-only URLs for a new round; accept updated files/links without changing earlier snapshots; retain exact task/version/round association; block premature BOTH client handoff and reuse the same snapshot identity after independent approval. Re-run P1/P2a, recovery, keyboard and responsive regression tests.

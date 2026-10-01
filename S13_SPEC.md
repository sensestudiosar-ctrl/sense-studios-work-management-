# S13 Internal review and correction — implementation scope

Status: COMPLETE for the Owner-authorized development/local-staging slice on 2026-09-30; see S13_COMPLETION_REPORT.md. The approved source is `requirements/APPROVED_REQUIREMENTS.md` and C-001–C-024, with architecture checkpoint 2e46805. S09 and S11–S12 are prerequisites.

## Requirement sub-IDs

- R-027.a: Enforce configured internal review before task completion and exact drawing issue.
- R-027.b: Assign an eligible, authorized reviewer; preserve review actions to approve, request corrections, comment, annotate PDF/image, upload markup, assign correction, and escalate. Priority and committed-date changes require their separate existing authorities.
- R-028.a: Persist an immutable original submission, review round, correction task, revised submission and new review round. No rejected submission or blob is reopened or overwritten.
- R-028.b: Retain reviewer, exact submission/version, comments, markup, timestamp, decision, severity and category for each round.
- R-029.a: Use Minor, Moderate, Major and Critical severity.
- R-029.b: Owner-configurable correction categories, with historical category identity/label preserved after configuration changes.
- R-024/S13.a: Advance only the internal-review task states through dedicated guarded commands, preserving existing Waiting, employee-exit, cancellation and S14 client-review boundaries.
- R-037/S13.a: Produce canonical exact-revision submission/correction/internal-approval evidence for the S12 internal ports; an internal approval may make the newer revision current, while selected/CR formal issue still waits for S14 client approval.

## Scope and dependency boundary

S13 owns internal review persistence, scoped commands and reads, reviewer/correction workflow, task and drawing integration, responsive UI and atomic audit/outbox evidence. The Owner selected the assigned Project Lead or explicitly granted project manager to assign the reviewer and correction owner. The submitter cannot decide their own submission. Reviewer assignment also requires current project access and the distinct review grant; a job title alone gives no access. Exact document and Confidential-file access is rechecked on every read and decision.

The Owner also selected a required linked project task for every drawing review. A task owner submits the exact R-series revision through that task; S13 does not offer taskless drawing approval. PDF/image annotations are immutable structured page, coordinate and text records, with separate uploaded markup files. A graphical drawing tool is not required for S13.

The Owner selected a reasoned in-app escalation to the assigned active Project Lead, falling back to the Owner when no eligible Lead is available. The alert carries generic text; the reviewer and recipient use current access checks to open review details. After a submitting task owner exits and the task is reassigned, an authorized Project Lead or granted manager must explicitly withdraw the still-open round with a reason before the replacement owner submits a new round. The withdrawn round, submission, comments and exact revision remain immutable. The Owner also selected separate planning authority: an assigned reviewer may change priority only with existing `project.manage` and `task.assign` authority, and may change a committed due date only with those grants plus `task.deadline_change`. The review grant alone never changes planning metadata.

S14 client identities, portal decisions, passkey signatures, change classification and external delivery remain outside S13. S13 cannot synthesize client approval or bypass the selected/CR issue gate. S24 broad escalation/notification policy remains outside S13; an explicit reasoned escalation record and its authorization are in scope.

## Acceptance and test plan

1. An assigned task owner can submit eligible work; required review cannot be skipped. Only the named, active, scoped and separately granted reviewer can decide. Self-review, cross-branch and forged IDs fail.
2. Each review round binds the exact task submission/version and, when applicable, exact drawing revision/blob/checksum. Approval and correction are mutually exclusive and single-decision; stale and concurrent decisions leave one result.
3. Corrections retain severity/category/comment/markup and create an actionable, separately owned correction task. Revised submission creates a new round without altering prior evidence.
4. Exact approved R revisions promote through the S12 internal port. Selected and CR revisions still fail formal issue without S14 exact client approval. Old current revisions become superseded atomically.
5. Cancellation, employee exit, reassignment, project holds, grant revocation and Confidential access fail closed without losing prior rounds. Exit-interrupted rounds require reasoned withdrawal after reassignment; a replacement submits a new round.
6. Configurable categories retain historical labels. Escalation retains its reason and routes a current-access-checked alert to the Lead or Owner. Reviewer priority/committed-date changes require their distinct existing management grants and retain task history/audit evidence.
7. Fresh and upgrade migrations preserve existing rows, enforce scope/evidence constraints and pass Prisma validation. API, concurrency, rollback, unit, desktop/mobile browser, typecheck, lint, production build and full `pnpm verify` gates pass before COMPLETE.

## Model routing

Sol owns requirement interpretation, schema, permission and state design, difficult debugging and final review. Luna takes bounded implementation/UI work after interfaces settle. Report actual models used and checks run.

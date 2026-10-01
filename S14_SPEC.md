# S14 Client portal and exact approval — implementation scope

Status: COMPLETE for authorized development/local staging. The Owner authorized S14 on 2026-09-30. Client identity, Owner-managed access, exact review and approval, item delegation, corrections, cancellation and handover are implemented; whole-slice acceptance is recorded in S14_COMPLETION_REPORT.md. The approved sources are `requirements/APPROVED_REQUIREMENTS.md`, approved clarifications C-001–C-024, architecture checkpoint 2e46805, and the existing S14 entry in `IMPLEMENTATION_PLAN.md`.

## Requirement sub-IDs

These sub-IDs expand the requirements for this slice; implementation details that are still Owner decisions are identified below.

- R-024/S14.a: Add the approved client-review task transitions while preserving S09–S10 task behavior, S13 internal-review gates, Waiting/exit/cancellation rules, and the separate internal R and client CR revision series. Do not treat CR as a generic correction-request label (C-002 Q7).
- R-031.a: A Team Leader or Owner classifies each client-review revision (CR) as Preference / New Requirement or Employee Work Error.
- R-031.b: Preference / New Requirement must not negatively affect employee performance. Employee Work Error may affect performance; this classification does not itself define a score or formula.
- R-031.c: Audit classification changes.
- R-032.a: Client review supports view, comment, annotate, upload reference, request revision, approve, reject, and permission-controlled download.
- R-032.b: Support partial approval with item-level outcomes, including approved, revision required, and pending states.
- R-033.a: Each project has a Primary Client Approver.
- R-033.b: The Primary Client may invite additional client users and configure their access.
- R-033.c: Additional client users may view, comment, or review; approval is allowed only when explicitly delegated.
- R-033.d: The Primary Client retains final overall client approval. Additional client users may receive approval delegation only for specified items; delegation does not transfer overall final approval (C-002 Q5).
- R-034.a: Portal electronic approval is initially sufficient; paid DSC/eSign integration is not required.
- R-034.b: Preserve approval evidence for the client user, exact item, exact revision, electronic signature/signature capture, date/time, approval comments, and IP/device where appropriate.
- R-037/S14.a: Produce client approval bound to an exact revision for the existing S12 issue boundary; never mutate historical approval evidence or silently replace the approved revision.
- R-039/S14.a: Apply backend-enforced, client-specific project/item/document access and protected PDF/image viewing. Permission-controlled download; practical copy deterrence is allowed, but screenshot prevention must not be promised.
- R-075/S14.a: Implement the client portal surface for project progress, review, comment, annotation, approval/signature, decisions, files, gallery, and approved client reports. No portal exposes internal employee-performance information. The S14 portal may expose only content allowed by current client/project/item grants and document policy.
- R-076.a: Invited external portal users authenticate with emailed one-time codes. C-008 specifies clients and consultants use these codes.
- R-076.b: Formal client approval requires a registered passkey step-up; email code alone is insufficient.
- C-008.a: Use the approved sign-in and approval assurance rules. Brevo's free transactional email plan may be used; launch channels are in-app alerts and email, without automated SMS/WhatsApp. Email delivery, plan limits, domain authentication, and mail-outage fallback must be validated before portal launch.
- C-013.a: After project cancellation takes effect, currently authorized Primary and Additional Client users retain read-only access only to previously formally issued PDF/image revisions within their existing client scope and their own approval history. Existing item grants and exact-revision checks remain.
- C-013.b: Cancelled-project access does not expose drafts, internal records, CAD files, new transmittals, or new project decisions. Pending review/approval requests become Withdrawn due to cancellation with prior evidence retained; new reviews, comments, approvals, invitations, and uploads are disabled. Superseded issued revisions remain marked where applicable. Owner revocation remains available.
- C-014/C-015.a: The Owner sets a separate required end date for each authorized client grant at cancellation; there is no shared expiry period. The date must be later than cancellation effective time and supplied before cancellation finalizes.
- C-014/C-015.b: Every protected request enforces the current grant end time. Owner shortening, revocation, and extension require reason and preserve actor, prior/new time, and audit evidence. An extension has a new explicit end time. Record retention does not grant portal access.
- R-104.a: Demonstrate one actual Design project through project creation, tasks, internal review, corrections, client review, client approval, final drawing issue, and handover within the application.

## Scope and dependencies

S14 owns the client-facing review and approval workflow, client portal identities/invitations and their project/item grants, portal authentication and formal-approval step-up, exact-revision approval evidence, revision classification, cancellation effects on client access, and the integration needed to finish the first Design-project checkpoint. Use existing S02 identity/passkey foundations, S03 scoped authorization, S04 audit/event/outbox, S05 approval primitives, S09 project cancellation and task behavior, S11 document access, S12 immutable revisions/issue/transmittal, and S13 internal review and correction. Dependencies are S05, S09, S11–S13; requirements for S14 call out S05 and S12–S13, while cancellation implementation also relies on S09/S11.

Backend authorization is mandatory on every invitation, read, stream/download, annotation, comment, upload, review decision, approval, classification, expiry change, and cancellation transition. Re-check current account/session, project and client grant, item/document scope, exact revision, expiry, and project state at command time. Keep each client's scope and approval history isolated. Audit important mutations and emit the established domain events/outbox records atomically with their business writes. Use existing document/storage access abstractions; do not disclose physical NAS paths or credentials.

S14 includes the client portal's authorized gallery view as a presentation surface for permitted client content. Project-gallery creation/management, public derivative records, and publication workflows remain S15. Consultant and vendor/factory portal workflows remain S21. Employee and project score formulas/score changes remain S23. Production deployment and production gates remain out of this development/local-staging slice, including final ingress, NAS, offsite-backup/key-custody/restore, legal/contract retention validation, and mail deliverability/limits/fallback validation.

## Implemented S14 scope

Clients use distinct CLIENT accounts, separate portal sessions/cookies, HMAC-digested emailed one-time codes with attempt/resend limits and UV-required passkey enrollment. Internal and portal identities are isolated in both service and database guards. Owner-only Primary appointment/replacement, per-client expiry/revocation and immutable grant history require reason, expected versions and canonical audit/event/outbox evidence.

Published review packages retain exact immutable task/revision/file/blob/hash snapshots. Primary Clients invite Additional Clients and explicitly grant each item's view/comment/review/approve/download capabilities. Client review starts before item decisions. Comments, normalized annotations and private PDF/image references remain scoped to that item. Approval requires typed signature, consent and fresh exact-binding passkey proof; item approvals alone do not issue approval facts. Primary-only final overall approval verifies the complete current batch and produces canonical exact CLIENT revision approval evidence for S12 issue. Required final approval gates task completion.

Owner or an explicitly authorized Team Leader classifies CR revisions and negative review outcomes using the two approved categories. Preference / New Requirement has no negative performance calculation; S23 scoring remains excluded. Client-requested correction tasks are assigned by Owner, current assigned Project Lead or explicitly authorized Team Leader. Normal task completion precedes resumption of the original work, and a corrected drawing requires its new exact internal review and client approval.

Design handover retains S12 exact transmittals and named CLIENT recipients with current scoped PDF/image access. Cancellation atomically withdraws pending packages/items and requires a future end time for every retained client grant. After cancellation, access is limited to previously issued scoped PDF/images and the client's own approval history; new decisions, comments, uploads, invitations and acknowledgements are denied. Expiry/revocation are checked on every protected request, including after permission-lock waits.

There are 69 migrations. Fresh deployment and the retained populated S13 upgrade passed with all 86 existing-table old-column checksums preserved. Exact validation evidence and final scope status are recorded in the acceptance report.

## Settled Owner decisions

1. Only Owner appoints/replaces Primary Client, with a reason and audit history.
2. CR may contain independent files, after their own internal review.
3. Corrections are assigned by Owner, the assigned Project Lead or an explicitly authorized Team Leader.

No material product decision remains pending. S14_REVIEW_CONTRACT.md records the implementation interfaces. S15 publication and S23 score calculations remain outside this slice.
## Acceptance and proportional test plan

1. Primary and additional client identities are invited and scoped according to approved authority. Unauthorized, expired, revoked, cross-client, cross-project, item-tampered, and guessed-ID requests fail at the API/backend boundary; client access never exposes internal performance information.
2. Portal sign-in consumes an emailed one-time code; formal approval independently requires a registered passkey step-up. Replayed/expired codes, absent or failed step-up, stale sessions, and revoked access cannot approve.
3. Each review action uses the resolved item and revision policy. Comments, annotations, reference uploads, requests, rejection, partial decisions, and approvals preserve history and exact content/revision identity. Approval is single-decision and immutable; stale or concurrent decisions cannot create conflicting final evidence.
4. Approval evidence records every required R-034 field available by policy. Only the Primary Client or a user with explicit item delegation can approve; final overall authority follows C-002 Q5 and the Owner-resolved appointment/replacement policy.
5. Team Leader/Owner classification is restricted, persists one of the two approved categories for each client-review revision (CR), records each change, and keeps Preference / New Requirement from negatively affecting performance. No S14 score formula is introduced.
6. Cancellation atomically withdraws pending client reviews/approvals and applies C-013 access limits. Each active client grant has its Owner-set end date before cancellation finalizes. At expiry, protected reads/streams/downloads deny immediately even if a scheduled cleanup is delayed; shortening, revocation, and extension require reason and immutable audit evidence.
7. Client approval is consumed by the existing S12 exact-issue gate without bypassing internal S13 approval or altering R/CR history. Superseded revisions remain traceable and correctly marked.
8. The first Design-project checkpoint runs end to end through handover. Include desktop and mobile portal journeys, accessible loading/empty/error/denied/expired states, and protected document viewing.
9. Validate fresh and upgrade migrations, Prisma/schema validation, persistence constraints, authorization/ID-tampering tests, state and concurrency behavior, transaction rollback, audit/outbox atomicity, upload safety, typecheck, lint, build, and the repository's required `pnpm verify`. Run only after the Owner decisions that affect those cases are resolved; record any environment-limited or unrelated failure without claiming the slice COMPLETE.

## Model routing

Model routing: `gpt-6-luna` handled the bounded identity, UI, CR, documentation and testing implementation; `gpt-6.1-sol` handled the access/security review. Sol reviewed schema, permissions, exact evidence, concurrency and approval-consumer boundaries. The parent retains final acceptance; the completion report records actual checks and limitations.

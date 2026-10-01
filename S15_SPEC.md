# S15 Galleries and publication — implementation scope

Status: COMPLETE for development/local staging — Owner-authorized 2026-10-01; Owner policies implemented and acceptance verified. This document defines the development/local-staging slice. Schema, backend, frontend and whole-slice acceptance are verified; see S15_COMPLETION_REPORT.md for exact evidence and production limits. The approved sources are `requirements/APPROVED_REQUIREMENTS.md`, approved clarifications C-001–C-024, architecture checkpoint 2e46805, and the S15 entry in `IMPLEMENTATION_PLAN.md`.

## Requirement sub-IDs

- R-040.a: Provide a private project client gallery using content that is currently authorized for the relevant client. The Owner approved only existing exact S14 PDF/image items under current client item grants; no gallery-only sharing grants are introduced.
- R-040.b: Support an explicitly approved public portfolio through separate public derivatives and persistent publication grants. The Owner is the sole publication authority. Every grant and publication action records a reason and append-only audit evidence.
- R-040.c: Internal files are never automatically published. Public access must resolve only to a separately stored public derivative under a current publication grant, with authorization enforced by the backend.

## Scope and dependencies

S15 provides project-gallery and publication records, the private gallery UI, public derivative lifecycle and explicitly authorized public portfolio publishing. Dependencies are S11 private NAS document storage/access and S14 client identities, item grants and portal presentation. S14's gallery view is a client presentation surface; S15 owns gallery records and public publication.

## Confirmed Owner decision

Only the Owner may approve, publish or withdraw public publication. Each action requires a recorded reason and audit history. The approved architecture separates a NAS-hosted public derivative from the internal source file and binds public visibility to a persistent publication grant.

## Owner continuation decisions — 2026-10-01

The Owner explicitly settled the following continuation policies: private galleries curate only existing exact S14 PDF/image items, retaining current grants, snapshot/checksum/supersession checks and cancelled-project issued-only/per-client-expiry rules. Confidential source documents and every Confidential ancestor folder are prohibited for public preparation and publication. Explicitly Owner-published independent derivatives remain public through project cancellation until the Owner withdraws them. No automatic publication or declassification is introduced.

The Owner prepares a separate sanitized PNG derivative, then explicitly publishes it as the publication approval. Publication content is immutable; state advances DRAFT → PUBLISHED → WITHDRAWN with expected versions, append-only grants and canonical audit/event/outbox evidence. Withdrawal stops future reads; already downloaded content cannot be recalled. Public responses expose only approved title, alternative text and derivative media identifiers, never private source/project/client metadata.

## In scope and out of scope

In scope: persisted private gallery and public publication/derivative/grant records; Owner-only reasoned publication approval; backend enforcement of current grants; public derivative storage separated from private sources; audit/event evidence; client gallery UI; and fail-closed behavior for missing, expired, revoked, or withdrawn publication grants.

Out of scope: changing S11 source-file access or S14 client approval/grant rules; automatic publication of internal files; publication decisions by non-Owners; unrelated portal, project, or scoring workflows; production deployment and production NAS validation.

## Acceptance and proportional test plan

1. Private-gallery reads are constrained to the resolved approved content policy and the current client's project/item grants. Cross-client, cross-project, guessed-ID, expired, and revoked access is denied by the backend.
2. Only the Owner can create/approve/revoke a public publication grant; reason, actor, target derivative, timestamps and prior/current state are retained in audit history. Unauthorized attempts and missing reasons fail.
3. Public reads serve only a distinct derivative and require a current persistent grant. Source files, internal revisions and physical NAS paths are never exposed. No upload or internal-file mutation causes implicit publication.
4. Withdrawal/revocation immediately denies public access, including concurrent or stale requests; behavior for confidentiality and project lifecycle follows the Owner's settled policy.
5. Verify persistence and migration behavior, ID tampering, permission boundaries, grant lifecycle/concurrency, derivative/source separation, audit atomicity, UI loading/empty/error/denied states, responsive behavior, typecheck, lint, build and required repository gates. Record environment limits and unrelated failures; do not mark complete until applicable gates pass.

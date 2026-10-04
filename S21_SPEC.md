# S21 — Consultant and vendor/factory portals

Status: **COMPLETE for development/local staging (2026-10-04)** under the Owner instruction: “start and complete s21 slice in our sol 6.1 and luna 6 methodology.” S21_COMPLETION_REPORT.md records final acceptance: pinned pnpm verify exited 0 with 176 API unit, 122 web unit, 237 PostgreSQL integration and 39 desktop/mobile browser cases; all 95 migrations are current, 125 original-table snapshots are preserved and six refreshed captures passed Sol review. Production gates remain unverified. This supersedes older S21-unauthorized/in-progress wording. S18 remains unresolved/excluded; S22–S27 remain unauthorized.

## Approved sources and decisions

Use current Owner decisions, requirements/APPROVED_REQUIREMENTS.md, approved C-001–C-024, approved architecture checkpoint 2e46805, then implementation. Required context intake was performed by an agent dispatched as exact `gpt-6.1-sol`; bounded implementation is routed to `gpt-6-luna`. Dispatch identifiers are the available model evidence; report any telemetry limitations honestly.

The Owner settled two S21 questions on 2026-10-04:

1. Ordinary external invitations and grants/revocations may be managed by the Owner, currently assigned Project Lead, or explicitly authorized Team Leader. Grants require exact project/item/work-package scope, reason and audit. A title alone grants nothing. Native CAD issuance/cancellation remains Owner-only.
2. Consultant reviews/comments and vendor/factory production updates are advisory submissions. Existing staff/internal/client acceptance and validation authorities remain responsible for formal decisions. An external submission does not approve a revision, modify approved production inputs, finalize S19 production progress, confirm an S20 report, verify/close a snag, hand over a site, or complete a project.

## Requirement expansion

| Sub-ID | S21 boundary |
| --- | --- |
| R-075/S21.a | Consultant assigned-project list and explicitly granted exact documents; no unrelated project/item access. |
| R-075/S21.b | Consultant uploads, requests, reviews and comments retained as scoped advisory evidence. |
| R-075/S21.c | Consultant formal exact-revision transmittals and own-recipient acknowledgements. |
| R-075/S21.d | Vendor/factory explicitly granted relevant drawings, operational production requirements and deadlines. |
| R-075/S21.e | Vendor/factory uploads, own-recipient acknowledgements and advisory production-status submissions. |
| R-075/S21.f | Every external response excludes internal employee performance, unrelated records, protected prices/costs, internal identities/history, confidential content and unrestricted NAS paths. |
| R-076/S21.a | Invited external email-code sign-in using the approved C-008 external OTP policy; separate revocable portal sessions/cookies, current-grant checks, CSRF/origin, generic request-code response and throttling. Password sign-in is superseded by approved passwordless policy. |
| R-076/S21.b | Current expiry/revocation enforced on every request; own-session/device listing and revocation. |
| C-006.a | Only Owner records a native MinisCloud share for one explicitly granted CAD file/revision and assigned consultant/vendor recipient; native seven-day expiry and extraction code required. |
| C-006.b | Record recipient, revision/checksum, issuer, native link identity, issue/expiry and cancellation; protect link/code secrets and exclude them from audit/logs. No automatic MinisCloud API is assumed. |
| C-006.c | Access loss immediately denies app retrieval and surfaces every still-active native link requiring Owner cancellation; cancellation confirmation records native identity, proof, actor and time. Native links can be forwarded; tell recipients not to share. |
| C-012.a | Owner cancellation inventories active native links and stays pending while any lacks confirmed revocation; final cancellation atomically ends ordinary external project access alongside existing task/client effects. |
| C-016/S21.a | Separate cancelled-project closeout grant approved only by assigned Project Lead or expressly authorized Team Leader (Owner retains organizational authority), naming existing approved closeout task, permitted work-package/files and finite end time. |
| C-016/S21.b | Closeout grant ends at task completion, approval revocation, grant expiry or earlier revocation; never restores original delivery grants. CAD remains Owner-only and linked native shares still require confirmed cancellation on access loss. |
| R-038/S21.a | Extend existing exact transmittal/recipient evidence to external recipients without weakening internal/client approval prerequisites. |
| R-039/S21.a | Portal type, exact scope and fresh file/grant/session checks enforce file access; CAD delivery uses native links rather than an unrestricted source download endpoint. |
| R-079/R-080/S21.a | Grant changes, submissions, transmittals/acknowledgements, CAD issuance/revocation and cancellation/closeout evidence retain canonical transactional audit/domain-event/outbox evidence; corrective entries preserve original evidence. |

Cross-cutting: R-006/R-092, C-001/C-002 branch/assignment isolation; C-003/C-009 retained issue/audit evidence; C-010/C-011 cancellation authority and task stops; C-013–C-015 client cancellation behavior remains unchanged; C-023/C-024 active internal authority and project-hold checks.

## Dependencies and exclusions

S12 and S14 provide exact revision issue and isolated portal conventions. S19/S20 are locally accepted, including integrated S16/S17 dependencies. S03/S04/S05/S07/S09/S11 provide internal authority, canonical evidence, cancellation/closeout and private storage. S18 is not required.

Exclude S18 skills/training/knowledge; S22 offline queue/sync; S23 scoring; later reminders/automation/integrations/AI; accounting duplication; new formal external approval authority; unrestricted folders; CAD streaming/download outside Owner native shares; client access expansion; public publication; automatic external communications; production deployment. Portal account OTP mail is the existing approved sign-in mechanism. No launch claim for installed NAS native-link behavior or Brevo production delivery is made without running those environments.

## Architecture and persistence boundary

Use additive EXTERNAL account identity, a separate external cookie/session/code store, project grants with CONSULTANT or VENDOR_FACTORY persona and explicit exact revision/release/package scopes. Never reuse CLIENT identity or staff sessions. Internal identity and database session guards must explicitly allow OWNER/STAFF, preventing new external kinds from passing historical `kind != CLIENT` checks. Existing client passkey approval remains isolated.

PORT owns external grants, submissions/upload metadata and native-share records; DOC owns existing file/revision/transmittal writes, TURNKEY owns finalized production inputs/status and SITE owns finalized package/report/snags. Use public scoped service ports; never fabricate an internal actor for an external caller. Cross-module read projections must select permitted fields explicitly. Normal grant management requires Active delivery; held/completed projects permit already authorized read history, while new delivery submissions are denied. Cancelled projects deny ordinary external access; only separate valid C-016 grants permit named closeout work. Confidential files/ancestors fail closed.

External uploads use private NAS staging, existing supported-file/signature/checksum validation and resumable chunks below the Tunnel limit; finalized uploads remain advisory evidence and do not become approved current revisions. A retry returns retained finalized metadata; stale/revoked access cannot publish staged bytes. Independent submissions append once and never alter original evidence. Grant/state commands use expected versions, transaction locks and current-clock rechecks after waits.

Native share secrets use authenticated encryption under a deployment-configured key. Native creation/revocation is performed in MinisCloud by the Owner and recorded explicitly; app expiry/denial is not evidence of native cancellation. A cancellation blocker must preserve its pending request and display unconfirmed link identities without secrets. Concurrent issuance and final cancellation serialize on project/grant state; no share may be introduced after cancellation or after access loss.

## Acceptance and test plan

Before changes classify baseline failures; use pinned Node 24.19.0/pnpm 11.19.0. Preserve existing work/data, migration history and retained original-table snapshots.

1. Review additive schema/migrations; fresh deploy plus retained populated upgrade, migration status and original-column counts/digests. Runtime role cannot mutate protected history or bypass canonical evidence guards.
2. Real PostgreSQL/API tests: consultant/vendor persona and exact project/item/package isolation; guessed IDs and foreign organization/branch/release/package; client/staff/portal cookie interchange; account/session/grant expiry after locks; held/completed/cancelled write denial; revoked staff manager; Confidential file/ancestor denial; cost/performance/path/secret redaction.
3. OTP replay/throttle/unknown-address/mail failure and device revocation; resumable retry/checksum/type/path checks, interrupted finalize and current-authority recheck; advisory submission persistence and duplicate prevention.
4. Exact formal issue/own acknowledgement with immutable revision/checksum/evidence; consultant review cannot create internal/client approval; vendor submission cannot finalize production; production replacement invalidates stale-context submissions.
5. Owner-only native share, seven-day expiry/code, no client CAD, encrypted secret roundtrip/redaction; app access loss and pending native revocation; cancellation blocked until all active links confirmed revoked; final atomic task/client/external effects; rollback and issuance/revocation/cancellation races.
6. C-016 closeout exact task/package/files, finite expiry/completion/revocation and ungranted approver denial; no restarted delivery/client approval; linked CAD blockers remain visible to Owner.
7. Web unit/component and desktop/mobile browser journeys cover staff management, isolated OTP/session portal, persisted upload/request/review/comment/status, transmittal acknowledgement, CAD display and cancellation blockers/closeout. Inspect captures; verify loading/empty/error/revoked/expired states and refresh persistence.
8. Run full pinned `pnpm verify`: typecheck, lint, API/web unit, real PostgreSQL integration, production builds and desktop/mobile Playwright. Record exact command exit/counts and separately classify any failures. Update implementation/status/context/module/trace/security/workflow/storage/test documentation and completion report only with actual evidence.

Local controlled native-link fixtures verify app records/guards and explicit confirmation flow. Installed MinisCloud creation, extraction-code protection, native expiry/revocation and real recipient transfer remain production-launch gates until actually observed. Actual-project R-105 remains independently unverified.

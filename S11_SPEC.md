# S11 NAS document base — scope and acceptance plan

Status: Owner-authorized and COMPLETE for development/local staging on 2026-09-29; acceptance is recorded in S11_COMPLETION_REPORT.md. Approved requirements are requirements/APPROVED_REQUIREMENTS.md and approved clarifications C-001–C-024. The approved architecture checkpoint is 2e46805.

## Requirement sub-IDs

- **R-035.a — Supported files and primary storage:** support the approved PDF, image, DWG, SKP, RVT, Office, D5/Lumion, ZIP, video and audio file families. The firm's NAS remains primary physical storage; do not duplicate large architecture files into cloud storage without need.
- **R-036.a — Application authorization boundary:** the application mediates access. Users do not receive unrestricted NAS credentials or direct physical storage paths.
- **R-036.b — Metadata separate from physical location:** persist project, folder, document number, file reference, revision reference where applicable, current/approval/issue metadata where applicable, and access policy as application metadata, distinct from the NAS location. Physical paths or NAS credentials do not become authorization tokens.
- **R-036.c — Project folder structures:** allow project creation to provision its approved template folder structure on the NAS. Provisioning failures are visible and retryable; a project must not report physical folders as created before the storage operation succeeds.
- **R-039.a — Scoped access:** enforce file access on the backend by role, team, project, folder, file and external portal type, as supported by the actor and grant in the relevant slice. Recheck current authorization for reads/streams and mutations.
- **R-039.b — Confidential content:** support confidential file/folder classification and enforce its access restrictions independently of general project visibility.
- **R-039.c — View-only and copy deterrence:** allow client view-only behavior where configured and use protected viewers/watermarks or equivalent practical controls to discourage ordinary download/copy. Do not promise screenshot prevention on arbitrary devices.
- **C-003/C-009.a — S11 retention metadata for future protected records:** make policy association/clock data possible for client approval evidence and issued drawings so each receives a ten-year retention period starting at associated project closure. Expiry planning includes advance Owner notice, documented holds, backup lifecycle and deletion proof. This slice does not create formal approval/issue evidence; S12/S14 own those records and must use this policy association when implemented.

## In scope

- DOC module NAS adapter boundary and project/folder/document/file-blob metadata persistence, with opaque application IDs and a storage reference that does not reveal a raw NAS path to users.
- Physical project folder provisioning from the S08 applied template folder intent, including visible asynchronous/retryable failure and idempotent retry behavior.
- Authorized staged and resumable/chunked uploads for supported file families, server-side name/type/size validation, checksum verification, safe finalization without replacing an existing protected blob, and orphan detection/reconciliation.
- Authorized file metadata registration, file register/upload UI, and backend-mediated view/download streaming with fresh permission checks. S11 stores view-only policy metadata for later client use; external portal identity, protected client viewer and client workflow remain S14.
- Confidentiality and resource-scope enforcement across project, folder and file. The design supports external-portal-type policy inputs without creating portal users or granting external access in S11.
- Retention-policy association for the future ten-year classes above, including project-close clock anchor and hold/expiry metadata needed for a later controlled expiry workflow.
- Audit/outbox evidence for material file/folder operations using S04's established services and event conventions.

## Out of scope

- Revision numbering/series, immutable revision workflow, review/approval states, supersession, formal issue, transmittals and acknowledgements (S12).
- Internal reviews and correction rounds (S13), external client portal identities/decisions and their evidence (S14), client-specific portal expiry/grants (S14), or publication/gallery flows (S15).
- Native MinisCloud CAD link issue/revocation (C-006/C-012), SMB exposure, direct NAS access, or assuming an unverified NAS automation API.
- Retention policy for audit events, exited-employee records or site selfies; deletion/purge execution, legal holds adjudication, production legal/contract certification, production backup lifecycle configuration, or proof of production deletion. S11 may include metadata/plumbing for future controlled expiry only.
- Cloud file replication or a public cloud file store.

## Dependencies

- S07 project ownership and explicit project assignments determine the owning branch and project access boundary.
- S03 organization, membership and scoped authorization provide role/team/branch context; S04 provides audit, domain events and outbox.
- S08 supplies immutable applied project-plan snapshots and template folder intent. Its folder JSON is not itself a physical NAS directory.
- Approved architecture in ARCHITECTURE.md and FILE_STORAGE.md; DOC owns document writes and storage coordination. Physical NAS/service-account configuration and an isolated test share are required for storage acceptance.
- S12–S15 consume S11's metadata and authorization interfaces; they are dependencies for subsequent slices, not prerequisites for S11's base upload/register/view capabilities.

## Acceptance criteria

1. A project file can be uploaded through the application, persisted on the configured NAS through the adapter, registered with opaque IDs and checksum metadata, then viewed/downloaded only after server-side authorization.
2. Supported file-family validation and configured size policy reject invalid inputs before finalization. Chunk interruptions and retries are safe and idempotent; checksum mismatch cannot finalize a file.
3. Project/folder/file authorization denies unassigned and cross-project access, guessed or substituted IDs, confidential-resource access without its grant, revoked access, and direct/raw path access. It rechecks access at stream time.
4. The browser/API does not disclose NAS credentials, SMB paths or physical paths. Path traversal and symlink/root escape attempts are rejected by the adapter.
5. Project folder provisioning follows the applied S08 folder intent and exposes a recoverable failure; retry does not duplicate or misreport folders.
6. View-only policy metadata is available for S14's protected client viewer, without exposing a client stream in S11 or claiming absolute screenshot prevention.
7. Database metadata and blob lifecycle remain consistent across interruption/failure: staged/final orphans are detectable and reconcilable, and existing approved/protected content is never overwritten.
8. Future client-approval evidence and issued-drawing records can reference the C-003/C-009 ten-year-from-project-close retention policy. Clock anchor, advance-notice/hold metadata and deletion/backup design are documented; expiry behavior is not represented as legally certified.
9. Material file/folder operations produce appropriately scoped audit/event evidence; failures do not leave success-shaped records.
10. Responsive register/upload/view UI has persisted refresh behavior and loading, empty, error and permission-denied states.

## Test plan

- **Unit:** file family and configured limits; opaque storage key/path canonicalization; policy evaluation for role/team/project/folder/file/classification and read-only mode; upload state/retry/idempotency; retention category and project-close clock derivation.
- **PostgreSQL/API integration:** migration on fresh and prior-slice databases; persistent folder/document/blob and retention associations; authorized and denied upload/read/stream, guessed-ID substitution, cross-branch assigned versus unassigned project access, confidentiality, permission revocation, audit/outbox atomicity and rollback.
- **NAS adapter integration:** isolated temporary share; traversal/symlink escape denial; chunk interruptions/reassembly/retry; checksum mismatch; atomic finalize; no overwrite; folder create/retry; missing/orphan reconciliation; raw path and credential non-disclosure.
- **Browser:** desktop and mobile staff upload/register/view journeys with refresh, progress/error/retry, empty state and confidential denial. Client view-only browser acceptance belongs to S14.
- **Release checks:** Prisma validation/generation and reviewed fresh/upgrade migrations; targeted tests plus repository typecheck, lint and production build. Record any unavailable real-NAS or environment-specific check as unverified, not passed.

## Decisions and unresolved implementation details

The Owner confirmed on 2026-09-29 that folder creation and project file upload may be performed by the Owner and by assigned staff with document grants. Assignment and the applicable document permission must both be checked at the backend for each operation; neither alone is sufficient. The Owner also confirmed that Confidential reads are limited to the Owner and explicit item grantees, and that only the Owner classifies new folders/files as Confidential. The implementation requires exact active grants for each Confidential ancestor folder and each Confidential file.

Approved policy establishes the NAS as primary storage, the application's authorization role, metadata separation, listed file families, file access dimensions and C-003/C-009 retention clocks. S11 uses a private mounted directory configured by `NAS_ROOT`, 8 MiB binary chunks, a configurable 20 GiB default upload ceiling, extension/MIME checks plus first-chunk signatures for supported formats, and SHA-256 verification. The API uses scoped `document.view`, `document.upload` and Owner-only `document.manage` actions. Physical NAS capabilities and capacity must be verified before production use.

Production deployment still requires legal/contract review of retention periods and verification of NAS capabilities, backup lifecycle, key custody and production restore. These do not block development/local staging, but must not be claimed as satisfied by local adapter tests.

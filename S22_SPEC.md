# S22 Offline site capture — authorized scope, 2026-10-04

Status: **COMPLETE for development/local staging, 2026-10-05**, under the Owner's 2026-10-04 instruction to start and complete S22. S22_COMPLETION_REPORT.md records final pinned verification, populated upgrade preservation, Sol acceptance and the unintended local postgres migration. This supersedes earlier S22-unauthorized wording only. S18 remains unresolved/excluded; S23–S27 remain unauthorized.

Approved sources: R-071, R-072 and R-098 in requirements/APPROVED_REQUIREMENTS.md; approved architecture at 2e46805, DATABASE.md/WORKFLOWS.md conflict rules and IMPLEMENTATION_PLAN.md. Dependency S20 is complete for development/local staging. Existing S21 and all other work are preserved.

## Requirement expansion and scope

- R-071/S22.a: responsive mobile site capture with explicit local draft/pending/error/conflict/synchronized states. Existing online mobile workflows retain their owning slice scope.
- R-072.a: responsive installable PWA with cached static shell; no API/file response cache. R-072.b native iOS/Android wrapper remains later work.
- R-098.a: durable IndexedDB commands and captured image bytes with stable local IDs/idempotency keys; account/project isolation, truthful persistence failures and supported-browser fallback.
- R-098.b: offline photos and notes append independent observations once; new images upload through existing DOC authorization/storage, never uncontrolled NAS paths.
- R-098.c: new OPEN snags and daily-report drafts append once, retaining original evidence. Daily report confirmation remains a separate online responsible-person action.
- R-098.d: factual manpower observations and package progress updates synchronize through SITE rules. Package updates carry the base record version; unrelated workspace changes do not conflict with independent new evidence.
- R-098.e: same-record conflicts stop, display local/current server values, and require a human to keep server values or submit an amended command with a new key, current base version and reason. No last-write-wins or automatic rebase.
- R-098.f: reconnect synchronization repeats current internal identity/session/assignment/branch/action/file authorization; replay appends no duplicate record/history/event. Local capture never establishes authority.
- R-098.g: time information is deferred under the source's explicit phased allowance. Offline timers, attendance, report confirmation, approvals, package completion, assignments, independent verification, closure, handover, external portals, video/voice, native wrappers, analytics/AI and production deployment are out of scope.

Cross-cutting R-006/R-092, R-079/R-080, C-001/C-003/C-009/C-010/C-011/C-023/C-024 and S20/C-020/C-021 remain enforced. No material Owner product decision is unresolved in this phased contract.

## Persistence, permissions and conflict contract

SITE owns a new immutable SiteCommandReceipt and new retained NOTE SiteRecord kind. Commands carry commandId/localId, action/payload and nullable baseRecordVersion. Receipts bind organization/project/actor/local ID/action/fingerprint/result record/version and canonical history event. Unique keys and project serialization make record, history, audit/event/outbox, workspace version and receipt atomic. A reused key with different content is rejected. The existing online aggregate expectedVersion guard is retained; offline PACKAGE_PROGRESS uses the actual target record version, while creation commands append independent facts.

Supported actions: NOTE, MANPOWER, REPORT, SNAG and PACKAGE_PROGRESS. PHOTO is represented by NOTE with captured image evidence, or image attachment to a supported command. Each offline command requires current site.work; progress and references remain same-project. Replays also require current active delivery access. Conflicts expose only currently authorized/redacted record values. Amended progress records a new retained version through the ordinary SITE save/history boundary.

Stable image-upload initiation binds a caller-supplied UUID to the current actor/project, full manifest and ordinary DOC permission. Repeated initiation returns the same manifest; changed/reused foreign manifests are rejected. Only newly captured supported images and currently authorized nonconfidential folders are supported; confidential ancestors are denied. Existing chunk checksum/size/finalization and immutable blob checks apply. Receipt success waits for all referenced photo finalizations. A partial physical upload is a retryable DOC staging artifact, not a synchronized site record.

The web queue stores only a minimal explicitly prepared project context, local input and captured image bytes. No session cookies, CSRF tokens, downloaded project files, financial data, staff directories, attendance/private workforce data or external secrets are persisted. The current account owns the queue. Logout/account change and detected access loss remove/hide associated local content; every server request reauthorizes. Users can explicitly discard drafts. Unsupported IndexedDB/quota failures keep online workflows available and never report a successful local save. Foreground reconnect/manual synchronization is supported; background execution is not guaranteed.

## Acceptance and test plan

1. Reviewed additive migration/schema/client generation/status; fresh deployment and retained populated S21 upgrade preserve every original table's old-column counts/digests. No resets or rewrites of applied migrations.
2. PostgreSQL/API: independent append after unrelated changes; exact/concurrent/lost-response replay once; fingerprint/local-ID collisions; target-record stale conflict and reasoned amended version; no partial receipt/history after rollback; immutable scoped receipt guards and canonical audit/outbox.
3. Authorization: guessed project/record/photo/folder IDs, other branches/accounts/portals, revoked assignment/session/employee, project hold/cancellation/completion, lock-wait expiry and Confidential ancestry deny. Replays cannot recover unauthorized results.
4. Photo staging/chunk/finalization retries persist one document and one site observation; denied/failed uploads retain visible pending/error state and no false completion.
5. Web tests: durable queue/account isolation, connectivity/loading/storage failure, conflict compare/keep/amend, no silent base-version replacement, logout/revocation cleanup and unsupported-browser fallback.
6. Real desktop/mobile browser journeys: explicit preparation, offline capture/photos/notes/report/snags/progress, reload durability, reconnect persistence/replay, same-record conflict choice, current denial and responsive screenshots. Validate production PWA shell offline independently of dev-only assets.
7. Final pinned Node 24.19.0/pnpm 11.19.0 pnpm verify: typecheck, lint, unit/API/PostgreSQL, builds and desktop/mobile Playwright; Sol source/security/concurrency/visual final review and updated status/evidence. Unrun gates remain unverified.

Production NAS/hosting/CI/Brevo/MinisCloud/backup/key custody/restore and separately identified actual-project R-105 remain existing production gates. Exact model dispatch: gpt-6.1-sol owns intake/design/schema/backend/security/final review; gpt-6-luna owns bounded UI/tests/docs. A measured allocation ratio is not available.

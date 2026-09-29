# S11 NAS document base — completion report

Date: 2026-09-29. Status: **COMPLETE for development/local staging**. Owner-authorized S11; S12 and later remain unauthorized. Requirements and boundaries are in S11_SPEC.md: R-035.a, R-036.a–c, R-039.a–c and C-003/C-009 retention association. This report does not certify production NAS or retention operations.

## Implemented behavior

- Private mounted-NAS adapter configured by absolute `NAS_ROOT`; UUID storage keys, traversal/junction/symlink checks, physical template folders with visible ready/failed state and retry.
- Persisted folders, documents, immutable blob/checksum metadata, upload manifests and chunks, exact Confidential grants, and retention association metadata through four reviewed forward migrations.
- 8 MiB binary chunk uploads with checksums, exact retry, bounded payloads, supported family/name/MIME/signature validation, configurable 20 GiB default ceiling, atomic finalization and no blob overwrite. Downloads stream through the API with fresh authorization and close the file stream when the client disconnects.
- Owner or active assigned staff with applicable scoped document grants may create folders/upload. Cross-branch access also requires an explicitly authorized assignment. Only the Owner classifies Confidential content. Confidential reads require the Owner or exact active grants for each Confidential ancestor and the Confidential file. Revocation is enforced on the next request.
- Canonical audit, event and outbox evidence for material folder, finalized-file and grant transitions, backed by deferred database guards. Existing file evidence cannot be changed or deleted through these paths.
- Owner reconciliation reports missing/orphan blobs and cleans expired/aborted upload staging. Finalized orphan blobs are reported for investigation, not automatically deleted.
- Responsive Documents UI: template setup/retry, folder creation, chunk progress/retry, persisted register, grant/revoke, direct streamed download, loading/empty/error/denied states.
- File retention classes and project-close/retain-until/notice/hold/backup-expiry/deletion-proof fields are available for later issued-drawing and client-approval associations. S11 does not create formal issue, approval, external viewer or purge workflows.

## Verification evidence

Node 24.19.0 and pnpm 11.19.0; frozen dependency installation passed. PostgreSQL 18.6 ran in an isolated temporary loopback cluster on port 55444. NAS acceptance used isolated temporary local directories, not the firm's production NAS.

| Check | Actual result |
| --- | --- |
| Fresh migration | All 41 migrations applied with Prisma on fresh dedicated S11 test databases |
| Prisma validation/generation | Passed |
| Whole repository `pnpm verify` | Final run exited 0 on `sense_s11_acceptance_test`: typecheck, lint, 128 API unit, 64 web unit, 120 PostgreSQL/API, production build and 19 Playwright checks. Earlier full run also passed on `sense_s11_verify_test` |
| Final changed browser coverage | Desktop and mobile assigned-staff upload, Owner Confidential upload, exact grants/revoke, physical template folders, refresh/download and width checks passed |
| S10-shaped upgrade | Applied 37 prior migrations, seeded organization/account/branch/team/employee data, cloned to `sense_s11_upgrade_test`, applied four S11 SQL migrations; all 63 prior table counts and ordered old-column digests preserved (six populated tables, six rows). Empty-table checks prove shape/count only |
| Storage/security regression | Chunk retry/concurrent duplicate, checksum mismatch, interrupted assembly, traversal/junction escape, inventory/cleanup, real persisted staff upload and stream, unassigned project denial, Confidential denial/revoke, immutable blob and forged-file evidence denial passed |

The first API typecheck needed the shared-contract build in the clean worktree. Browser fixture fixes satisfied S08's full plan invariants and exact selectors. A final rerun exposed the existing S05 committed fixture versus S03 empty-organization ordering defect; the integration sequencer now runs singleton bootstrap tests first while preserving all assertions and fixtures. Its CommonJS lint convention and direct `@jest/test-sequencer` dependency were corrected before the final successful whole-repository acceptance run. No failing run is counted as passed.

## Routing and review

Sol-level routing kept schema, migrations, authorization, path safety, concurrency and final acceptance with the primary agent. `gpt-6-luna` agents implemented bounded planning documentation, document UI and controller/browser coverage; their changes were reviewed against approved sources and corrected before acceptance. The host's model was not changed by routing instructions.

Automatic approval review rejected a proposed global JSON body-limit increase because of API denial-of-service exposure. The implemented binary chunk route has its own 8 MiB bound and leaves the global JSON limit unchanged.

## Limits and production gates

Real NAS mount/ACL/service-account behavior, capacity, maximum-size load, network interruption, multi-process crash recovery and production backup/restore have not been exercised. No S11 hosted CI, Compose deployment or production deployment is claimed. Production must verify private NAS setup, encrypted offsite backup/key custody/restore and legal/contract retention fit. Proprietary CAD/media validation checks extension/MIME and executable rejection; it is not malware scanning or a complete proprietary-format parser. View-only is stored policy for S14; internal S11 users can download. Upload resume/retry is available in the current browser session, with server-side manifests; browser restart recovery is not implemented. Later S12/S14 must bind immutable issue/approval evidence to the ten-year-from-project-close policy and implement protected client viewing.

The initial implementation was saved in the managed S11 worktree as `fc77862`. After the Owner identified that the original checkout still ended at S10, the same implementation was applied to `D:\app\sensestudios work management app` as `144ecfc`. The committed trees match; all five existing passkey diagnostic files were preserved byte-for-byte. No production-like data was reset, no PR/deployment is claimed.

Acceptance was then rerun from that original checkout against fresh `sense_s11_checkout_test` and a separate temporary NAS directory. Frozen install and all 41 migrations passed; `pnpm verify` exited 0 with 128 API unit, 64 web unit, 120 PostgreSQL/API and 19 desktop/mobile browser tests, plus typecheck, lint and production builds. The existing uncommitted diagnostic files remained intact throughout.

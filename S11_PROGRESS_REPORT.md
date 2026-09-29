# S11 progress — 2026-09-29

Historical initial increment report. Superseded by S11_COMPLETION_REPORT.md, which records S11 development/local-staging acceptance and current production limits. The statements below describe the initial adapter increment before the later schema/API/UI work.

## Scope and routing

- S11_SPEC.md and the expanded S11 row in IMPLEMENTATION_PLAN.md map R-035.a, R-036.a–c, R-039.a–c and C-003/C-009 to boundaries, acceptance and tests. A `gpt-6-luna` subagent authored this bounded planning draft; the primary Sol-level agent reviewed and corrected the S14 client-viewer boundary.
- The primary Sol-level agent implemented and reviewed the storage adapter because path safety, immutable file handling and interrupted uploads are security and data-integrity work.
- The Owner confirmed folder creation and uploads may be done by the Owner and assigned staff with document grants. Confidential access policy is still being clarified and has not been implemented.

## Implemented

- `NasStorage` requires an absolute, existing real directory as its private NAS mount root and rejects linked roots or private directories.
- It uses private staging and blob directories under that mount. UUID-only keys prevent caller-supplied paths. Upload chunks are bounded at 8 MiB, checksum verified, written exclusively and synced. An exact duplicate can be retried; a changed duplicate is rejected.
- Finalization verifies a complete sequential manifest, size and whole-file SHA-256, writes an assembly file on the same mount and renames it to a random immutable blob key. It returns an opaque key, size and checksum. Staged chunks remain until metadata commits and the caller invokes idempotent cleanup.
- Authorized services can later use `openBlob`; the adapter itself does not grant access. An internal key inventory supports later metadata-versus-storage orphan reconciliation without returning physical paths to API clients.
- Current state, implementation status, module registry and requirement trace now record S11 as IN PROGRESS and S12 onward as unauthorized.

## Checks actually run

- Node `24.19.0`, pnpm `11.19.0`; `pnpm install --frozen-lockfile` passed in the isolated S11 worktree.
- Shared contracts build passed. API typecheck passed after the contracts build. Repository lint passed.
- Focused `nas-storage.unit.spec.ts`: 3 tests passed, covering chunk retry/reassembly, checksum and traversal denial, inventory/cleanup and Windows junction escape denial.
- `git diff --check` passed after the final documentation edits; untracked files remain subject to later review when staged.

The first standalone API typecheck failed because the clean worktree lacked built `@sense/contracts` output; building the contracts resolved it. An initial lint run found two missing error causes in the adapter; those were fixed and lint then passed. Neither failure is counted as a final passing gate without its successful rerun above.

## Outstanding S11 work

- Resolve Confidential item-grant policy and finish the Sol-level schema, permission and retention design.
- Add reviewed Prisma schema/migration; persist upload sessions, folders, documents, blob metadata and retention policy association.
- Wire the mount root through runtime configuration; add authorized API upload, registration, listing and stream endpoints, audit/outbox and a reconciliation worker. Validate file name/type and final upload limits; add physical folder provisioning/retry.
- Build responsive register/upload/view UI and run PostgreSQL/API, NAS fixture, browser desktop/mobile, fresh/upgrade migration and full repository gates. No `pnpm verify`, real NAS validation, Compose run or hosted CI is claimed for S11.
- Production legal/contract retention review, offsite backup/key custody and production NAS restore remain separate release gates.

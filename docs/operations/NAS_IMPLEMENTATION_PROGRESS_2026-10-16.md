# NAS deployment preparation — 16 October 2026

Status: source preparation implemented; **IN PROGRESS for complete release/NAS acceptance**. Owner authorized the plan and current Codex routing exception. Scope: NAS-01–04 in IMPLEMENTATION_PLAN.md; approved proposal: NAS_MOBILE_DEPLOYMENT_PLAN_2026-10-16.md. No production-ready or whole-V1 completion claim.

Baseline: Node24.19.0/pnpm11.19.0 confirmed. Docker client29.8.0 exists, but the Linux engine named pipe is absent; no engine was started. Extensive pre-existing concurrent modified/untracked work is preserved. Exact domain, NAS OS/paths, offsite destination, restore downtime and real phone inventory remain unknown. This work does not resume stopped acceptance targets, migrate retained databases, publish images, modify DNS or connect to a NAS.

Source findings reproduced by inspection: staging/localhost Compose, absent NAS mount/secrets, unbounded runtime configuration, Nginx without chunk-size override, scheme derived from internal HTTP, SVG-only PWA icons and automatic worker activation. Existing site queue uses account/project-bound IndexedDB and is retained unchanged unless a demonstrated regression requires a bounded fix.

Verification and final source boundaries will be recorded here as work proceeds. No unrun check is claimed.

## Implemented

- Separate production Compose with explicit private configuration, immutable image references, private database/application networks, no host-published service ports, restricted persistent document/PG/backup/history mounts and no automatic API-startup migration. API/worker pools are8/4; application service memory limits total3GiB, with512MiB for a scheduled backup container. These are initial budgets, not measured NAS capacity.
- Production HTTPS origin/storage/share-secret validation, bounded database connection settings, explicit0/1 trusted proxy hops, no-store API responses and production Swagger removal. No business identity/permission/schema changes. The private Cloudflare→web ingress sets public HTTPS and overwrites client identity; other ingress architectures are not accepted implicitly.
- Nginx route-specific8MiB chunks/6MiB attendance/12MiB portfolio limits; default1MiB elsewhere; streaming/timeouts; dynamic Docker API DNS; explicit JavaScript module MIME; safe private-response caching and static asset history. Docker build context now excludes local evidence/tool directories and backup artifacts.
- Android/iPhone raster/maskable/touch icons derived from the existing SVG; `/install` guide and sign-in link. Prompt-based worker registration uses an explicit saved-work acknowledgement, pending-queue check and worker-side sole-window activation guard. Existing IndexedDB data is not deleted. No native wrapper, push service, expanded offline authority or new account grant.
- Explicit-target Node operational CLI with configuration validation, local Docker/context/image guards, owned-container/lock checks, consistent logical database/global-role/file/checksum backup, encrypted local/offsite restic copy/verification receipts and safe writer resumption. Failure paths do not create successful offsite receipts. No backup/retention pruning or automatic stale-lock removal.
- Isolated restore rehearsal verifies files, restores into a new labelled PostgreSQL17 cluster without network/ports, preserves roles/ownership/grants without role-password hashes, compares table counts and retains the stopped target/evidence. Real application-role/password/approval/revocation recovery remains a separate gate.
- Local health/outbox/disk/backup monitoring and an offsite public readiness probe; unchanged issues stay quiet. Scheduling, recipient setup and real alert delivery remain unconfigured. Manual CI candidate-image workflow checks exact-commit quality, production PWA and Nginx images before publishing; it has not run. [Operating runbook](../NAS_DEPLOYMENT.md).

## Actual checks and boundaries

| Check | Result |
| --- | --- |
| Node/pnpm | Confirmed24.19.0/11.19.0; existing dependencies used, no new package dependency or installation claim. |
| Baseline API config |4/4 passed. |
| Existing offline tests |6/6 passed after choosing a dedicated temporary directory. Initial sandbox temporary-file failure remains recorded as failed infrastructure execution. |
| New API config/worker-health checks |10/10 passed. |
| Full API unit suite |456/456 across64suites passed in an approved unsandboxed run; report `.artifacts/nas/api-unit-unsandboxed.json`. Initial sandbox run had443passes/13failures across7suites from loopback EACCES/junction EPERM, not a passing run. No PostgreSQL integration was run. |
| Full frontend unit suite |570/570 across58files passed; `.artifacts/nas/web-unit.json`. After the final sign-in link and timeout-listener cleanup, all91affected tests across5files passed; `.artifacts/nas/web-affected-final.json`. |
| NAS safety/orchestration tests |21/21 passed, no skips. Docker/restic/provider operations are mocked; real filesystem/hash/junction and process-diagnostic checks run on dedicated temporary paths. Success/failure restore orchestration is not a real database restore. Windows junction checks required the approved unsandboxed execution. |
| Typecheck | Root `pnpm typecheck` passed; the `pnpm verify` attempt also passed typecheck. |
| Build | Final root `pnpm build` exited0 after the source changes; final frontend build also passed. Existing large-chunk/ineffective-dynamic-import warnings remain. |
| Scoped lint | All changed application files, PWA worker and NAS scripts passed. Evidence/artifact directories are excluded; no rule or check for application source was disabled. |
| Root `pnpm verify` | Exit1 at root lint after typecheck;668errors in existing, concurrently edited `docs/design/_build` fragments. Later independent root lint recorded669errors in the same21unowned files and no errors outside that directory. Root verify did not reach its unit/integration/build/browser steps. Those later steps are not claimed as a passing whole run. |
| Compose | `node scripts/nas/verify-compose.mjs` passed synthetic rendering/structure assertions, including opt-in release/operations profiles. It never starts containers or proves mounts. |
| CI YAML | Both quality and candidate-image workflows parsed successfully using the installed YAML parser. Hosted CI, registry publication and branch promotion were not performed. |
| Production PWA browser journey | Passed real Chromium against an owned ephemeral loopback static server at320/390/1024/1440;8captures in `.artifacts/nas/phone-delivery`. Checked actual waiting-worker activation/defer, preserved in-memory draft, multiple-window denial, pending queue denial, retained IndexedDB after explicit activation, offline reload and absence of cached API responses. Queue entries are synthetic; no authenticated domain writes or real phone install/passkeys were exercised. Browser/server closed successfully. |
| Visual review | Current Codex inspected representative320px install/update,390px update and1440px install captures against the existing-design-system reference lock. No independent/Opus/Sol visual review is claimed. |
| Container/Nginx smoke | Attempted, unavailable: Docker Desktop Linux engine named pipe is absent. The engine was not started because retained containers could restart. The test harness is prepared for an isolated labelled private upstream; no container startup, real proxy upload or Docker restore success is claimed. |

The new custom deployment/runtime-input fingerprint is591files with119migration SQL files, SHA-256 `9314ed1ce7ce71eddd7bb7ea0953827b6b7d3af0e6ab351f1bc905d8dd052e53` in `.artifacts/nas/source-final.json`. Its exact file list is authoritative; it excludes generated clients, documentation and prior acceptance harness/evidence and must not be confused with Agent1's610-file acceptance fingerprint. Final post-build/post-check `.artifacts/nas/source-after-final.json` matched exactly (591files, zero changed entries). Changed tracked files also passed `git diff --check`. No schema or migration file was edited by this work; no retained database operation, implicit PostgreSQL restart, stopped MW-I02 retry or deployment occurred.

## Remaining before activation

Exact website/app domain; verified model/OS/CPU/filesystem paths; real NAS/registry/tunnel/sender configuration; offsite destination/physical-location/key custody; scheduler/alert recipient and restore downtime; real phones and representative load. Keep secrets outside the repository/chat. Resolve the unrelated current-tree lint failures or form a clean explicitly reviewed candidate excluding unrelated work, then run the full required gates on dedicated targets. Run real PG17 populated-upgrade/container/proxy/storage tests, actual offsite encrypted backup plus full application restore, lost-device/role/pilot tests and real-project R-104/R-105 acceptance before operational reliance. The S27 prerequisite waiver remains bounded and does not waive these gates.

Models/review: current Codex agent only under the express16October exception; no delegation, unavailable Opus/Sonnet substitution claim or independent final production acceptance. Skills used: NAS Deploy release safeguards and Refero existing-system UI reference lock. No messages were sent to employees or other people.

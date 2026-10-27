# Master branch consolidation — 27 October 2026

Status: IN PROGRESS. Owner explicitly requested review of all branches, merger of required work and one master containing all work. This supersedes the earlier canonical integration-branch name.

## Source selection and preservation

The canonical application tree starts at `05108bf3526b7e90ede72b434b1cc3751faf0066` from the new remote. Both remotes were freshly fetched without pruning. Before mutation, a complete verified 48-ref Git bundle and SHA-256-checked copy of all 78 changed/untracked files (2,308,355 bytes) were saved privately under `.env.branch-consolidation-20261027/`. Binary working/index diffs and original refs/status are retained. Existing ignored database files, configuration, runtime artifacts and historical archives were not copied into public Git or changed.

The original checkout remains separate during review. Its current changes are included through the preservation snapshot, with source fixes reviewed below. Measurement PNGs, browser traces, scratch files and live factory checkpoint JSON remain private. The active factory worktree is retained.

## Reviewed reconciliation

- S01/S07/S20/recovery/old master and prior old-origin release are existing ancestors.
- S11 `fc77862` is patch-equivalent to integrated `144ecfc`.
- S17/S18 `e9df56e` was integrated at `e0f5c34`. Five SQL blobs are byte-identical under the later canonical migration names `20261007051000` through `20261007055000`; duplicate historical directory names must never return.
- Dashboard `e780a5f` is already incorporated and enhanced in `8c31410`; preserve the current live-source/context/task-detail implementation.
- Projects `76fa3d2` is patch-equivalent. Project-inner `7f28668` contributes three missing acceptance synchronizations: ready evidence button, loaded Studio option and exact Tasks heading. Newer Task brief labels remain.
- Factory `2aacdd1` corrects stale branch guidance. Apply that correction for master while retaining later hot-loop instructions.
- Old `17ac08e` demo seeds, diagnostics and optional audit-reason fallback remain recoverable through ancestry/archive. Canonical explicit reasons and approved real application workflows remain active.
- Current source edits include independent project lead/contributor drafts, generic document-access help, task composer assignment/reviewer guidance and missing-schedule workload evidence plus regressions. The additive read flag does not alter capacity arithmetic, authorization, persistence or schema.
- Factory lease/tooling review found ineffective ownership/concurrency protections and a false duplicate-trigger assertion. The corrected tool is reviewed/tested separately; no scheduler or automation is activated. Live lease records are gitignored.

Historical duplicate branches are joined through explicit history-only merge parents after semantic reconciliation. This makes their commits reachable without replacing newer accepted implementations or replaying old migrations. The canonical 120 migration files are unchanged; migration120 is task-review work routing, never client-password.

## Branch inventory before consolidation

| Ref | Exact tip prefix |
|---|---|
| codex/cleanup-preserved-20261014-65b5 | `5ea5a8f4031e` |
| codex/cleanup-preserved-20261014-9bd6 | `e9df56e67820` |
| codex/cleanup-preserved-20261014-s07-project-ownership | `09b5d9561f70` |
| codex/cleanup-preserved-20261014-s11-nas-documents | `fc77862059d0` |
| codex/dashboard-context-panels | `e780a5f5c167` |
| codex/project-inner-release-20261027 | `7f286689350c` |
| codex/projects-release-20261026 | `76fa3d2c6c97` |
| codex/recovery-pre-consolidation-20261021 | `3f06f9c03f11` |
| codex/s07-project-ownership | `09b5d9561f70` |
| codex/s11-nas-documents | `fc77862059d0` |
| codex/s17-workforce | `e9df56e67820` |
| codex/s20-site-integration | `3f06f9c03f11` |
| codex/sense-integration | `05108bf3526b` |
| codex/sense-release | `3f06f9c03f11` |
| factory/f-001-claude-md-tree-state | `2aacdd170cd1` |
| master | `2e4680570e6f` |
| s01-runtime-verification | `2bb39da773a2` |
| new | `05108bf3526b` |
| new/codex/cleanup-preserved-20261014-65b5 | `5ea5a8f4031e` |
| new/codex/cleanup-preserved-20261014-9bd6 | `e9df56e67820` |
| new/codex/cleanup-preserved-20261014-s07-project-ownership | `09b5d9561f70` |
| new/codex/cleanup-preserved-20261014-s11-nas-documents | `fc77862059d0` |
| new/codex/dashboard-context-panels | `e780a5f5c167` |
| new/codex/recovery-pre-consolidation-20261021 | `3f06f9c03f11` |
| new/codex/s07-project-ownership | `09b5d9561f70` |
| new/codex/s11-nas-documents | `fc77862059d0` |
| new/codex/s17-workforce | `e9df56e67820` |
| new/codex/s20-site-integration | `3f06f9c03f11` |
| new/codex/sense-integration | `05108bf3526b` |
| new/codex/sense-release | `3f06f9c03f11` |
| new/master | `2e4680570e6f` |
| new/s01-runtime-verification | `2bb39da773a2` |
| origin | `2bb39da773a2` |
| origin/codex/s07-project-ownership | `09b5d9561f70` |
| origin/codex/s17-workforce | `e9df56e67820` |
| origin/codex/s20-site-integration | `3f06f9c03f11` |
| origin/codex/sense-integration | `283e22c3586a` |
| origin/codex/sense-release | `58872f0396a1` |
| origin/s01-runtime-verification | `2bb39da773a2` |

## Verification and publication

Pinned Node24.19.0/pnpm11.19.0. Fresh acceptance results and final commit will be recorded here before publication. Planned remote result: master is the sole active branch in `sensestudiosar-ctrl/sense-studios-work-management-`; original branch tips are retained under `archive/20261027/…` tags before redundant heads are retired. Old origin repository remains unchanged. Active local worktrees remain recoverable.

This is source/repository consolidation. Canonical staging remains its previously accepted matched release; no retained migration, seed, reset, deployment, production or operational acceptance is implied.

Reviewers: current GPT-6.1 Sol and independent GPT-6.1 Sol subagents for branch/source and factory review. Earlier generic GPT-6 attribution in chat was imprecise; no Opus/Sonnet execution is claimed.

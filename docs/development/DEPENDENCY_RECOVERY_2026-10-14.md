# Dependency recovery — 14 October 2026

Status: dependency/configuration recovery VERIFIED in the Windows checkout. Application/MW-I02 remain IN PROGRESS pending real persistence and authenticated acceptance.

## Reproduction and cause

The Owner supplied a report of broken pnpm links and Jest failing to locate its ts-jest transformer. In this Windows checkout, the failure occurred earlier: Node24.19.0 could not resolve ts-jest/Jest/Nest packages or open the Jest CLI. The ts-jest link had NTFS reparse tag `0xa000001d` (Linux symlink), containing a nonempty valid-looking POSIX relative target. Native Windows Node could read its link text, but realpath failed with EACCES and module loading failed with MODULE_NOT_FOUND. Thus the external zero-length/EIO mount observation is not the actual Windows link payload; the runtime compatibility problem is reproduced here.

The new manual repair utilities select package directories by name without preserving lockfile versions and peer contexts. Their repaired-link count is not evidence of a correct dependency graph. They were not executed during this recovery. Do not use them to reconstruct this checkout's dependencies. No Jest transformer/configuration or dependency version change was needed.

## Recovery

Used pinned Node24.19.0 and pnpm11.19.0. An initial frozen offline force-install reported already up to date and did not repair the links. Preserved the four workspace dependency directories under `.env.checkpoint-tools/dependency-recovery-20261014/previous/`, with absolute source/destination containment checks and no overwrites. Nothing was recursively deleted.

With those directories preserved, `pnpm install --frozen-lockfile --offline --ignore-scripts` rebuilt the native Windows pnpm graph:1072 packages reused,0 downloads,9.3seconds. Lockfile SHA256 is unchanged. Subsequent typecheck/build generated the Prisma client through the ordinary project command; no migration or database connection was performed. Node now resolves ts-jest, Jest, Nest Common and reflect-metadata; Jest `--showConfig` succeeds.

Luna corrected11 lint errors in the five existing local repair utilities using explanatory comments in intentional catch blocks and removing one unused binding. Their behavior was not changed, they were not executed, and they remain ignored local tools rather than newly committed application code.

## Fresh verification

| Check | Result |
| --- | --- |
| API unit tests, database URLs unset |355/355 tests,57/57 suites,exit0 |
| Web unit tests |428/428 tests,44/44 files,exit0 |
| Repository typecheck, including Prisma client generation |exit0 |
| Repository lint after utility cleanup |exit0 |
| Production contracts/API/web build |exit0 |
| Jest configuration and Node resolution |PASS |
| Lockfile SHA256 comparison |unchanged |

Private logs and metadata are in `.env.checkpoint-tools/dependency-recovery-20261014/`. The final web/build attempts explicitly record exit codes; earlier tool session handles became unavailable despite completed logs, so those checks were repeated to capture reliable completion evidence. Existing build chunk/dynamic-import warnings remain. No database, migrations, services, authenticated browser, deployment or complete `pnpm verify` was run; these source checks do not certify operational readiness. Subsequent application edits require matching checks.

Actual routed models: GPT-6.1 Sol for project intake and independent recovery review, GPT-6 Luna for bounded local-tool lint cleanup. Existing work, databases and historical evidence are preserved.

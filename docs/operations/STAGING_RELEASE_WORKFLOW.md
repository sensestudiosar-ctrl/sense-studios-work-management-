# Canonical Sense staging workflow

The canonical application is `D:/app/sensestudios work management app`: React in `apps/web`, NestJS in `apps/api`, shared contracts in `packages/contracts`. `codex/sense-integration` is the recovery integration branch. Historical branches, worktree archives, private snapshots and deferred prototypes remain recovery evidence. Do not merge old migration lineages or introduce a competing application.

Staging is `http://localhost:59443/`, with a fixed loopback API on59442 and the retained PostgreSQL database on45434. `config/local-runtime.json` pins the database name, user, OID, system identifier,119 migration count and retained file directory. `config/staging.json` defines the release and supervisor locations. Staging has no automatic migration, seed, bootstrap, mail/provider configuration, or background worker startup. Actual-project R-104/R-105 and production readiness remain unverified.

## Every future UI demo

1. Identify the existing route/page and its approved requirement IDs. Separate approved presentation from proposed changes to ownership, calculations, access, persistence, notifications or approvals. Resolve material unspecified rules before implementation.
2. Preserve the submitted editable demo and compare it with current accepted behavior. A demo is a reference, not a replacement backend or a source of permission grants.
3. Implement directly in the canonical frontend. Reuse current routes, components, real APIs and shared contracts. Keep unaffected features, loading/empty/error/denied states and unsaved work. Keep experimental previews clearly labeled and outside the staging build.
4. Reproduce defects, add useful regression coverage, verify appropriate frontend/backend/persistence/role checks and responsive widths. Record the current candidate's exact results and gaps.
5. Review and explicitly stage the intended source/tests/docs, scan for secrets and private evidence, then commit to the integration workflow. Never deploy a dirty checkout or stage all untracked artifacts.
6. Build matched web/API from the approved40-character commit, verify the exact artifact and compatible database on isolated targets, then promote only that artifact. Check clean and cached browsers and confirm both visible release identities match.

## Build and promotion

Use Node24.19.0 and pnpm11.19.0. The build exports an explicit Git commit into a fresh private directory, installs its frozen lockfile from the local package store, builds web/API/contracts together and deploys a self-contained production API dependency closure. The final artifact is `.env.staging/releases/<commit>/`; do not rename it, because Windows package junctions may be absolute. Build failures are preserved for diagnosis. No build command promotes a release.

Root `pnpm dev` and the compatibility `runtime:*` commands now use this same approved-release supervisor. They do not serve the dirty checkout on the canonical address. Developers may run the existing per-package development commands on their separate development ports with an explicitly selected disposable database; these previews are not staging releases.

```powershell
node scripts/staging/build.mjs 'D:/app/sensestudios work management app' <40-character-commit>
node scripts/staging/cli.mjs promote <40-character-commit> <private-acceptance-json>
node scripts/staging/cli.mjs install-startup
node scripts/staging/cli.mjs start
node scripts/staging/cli.mjs status
```

Promotion requires passing acceptance bound to the exact commit and private manifestSHA256. Preserve a prior active pointer before switching. A running supervisor validates a new pointer/artifact/database before changing either child. Rollback is the same explicit acceptance-and-promotion process for a preserved compatible artifact; no automatic database downgrade is provided. Old release directories are outside the web root.

The Windows scheduled task uses the current user's S4U identity, startup/logon triggers, one running instance and bounded task retries. Verify registration and invocation on the actual host; neither source review nor a manual invocation proves a real reboot. The supervisor verifies its OS process identities, fixed loopback listeners, exact successful migration/checksum ledger, retained database identity, canonical file root and artifact integrity. It refuses unrelated occupied ports or contradictory database ownership. Child restarts are bounded; exhausted retry/log budgets persist `REQUIRES_ACTION` and preserve evidence. Stop uses a token-bound request and stops only owned app children; retained PostgreSQL data are kept.

## Cache and release verification

The visible release footer and `/release.json` identify the web build. `/api/v1/health/release` exposes only public API commit/build/time/schema count; `/api/v1/health/ready` additionally validates the full database identity and successful migration ledger. A mismatch/unavailable API is visible without automatically discarding drafts or reloading a page.

The staging worker checks the network for navigation, retains a release-specific offline fallback and never caches API responses. Updates use the existing explicit saved-work/other-window/pending-capture guard. A genuinely old cached shell cannot retroactively display the new footer: test the preserved historical worker and document any required one-time save/reload/close-and-reopen step. Do not clear IndexedDB, silently navigate clients or claim a new clean profile proves existing cached-profile acceptance.

Record actual deployed identity, tests, source/artifact fingerprints and remaining limitations in the recovery acceptance report. This document describes the controlled implementation; actual startup, cache, role, persistence and reboot results must be recorded separately.

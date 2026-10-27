# Canonical Application Map — VERIFIED

Verified 2026-10-27 by direct git/port/tool inspection. Where a fact came
from a repo document rather than a live check, it is marked **[doc]** and
re-verification is required before acting. Live facts are marked **[live]**.

> **Live drift alert (L-002):** HEAD moved `fd1697f → 05108bf`
> ("fix(web): make client-portal-auth sign-in test deterministic")
> *during* the 2026-10-27 session — a concurrent worker is active on this
> checkout. The uncommitted-change count below is a snapshot, not a fact:
> **always re-derive branch/HEAD/dirty-state with git at session boot.**

## Repository identity
- **Path:** `D:\app\sensestudios work management app` **[live]**
- **Remotes:**
  - `origin` → `github.com/vijaychintala05/WORK-MANAGEMENT-APP-sense-studios` **[live]**
  - `new` → `github.com/sensestudiosar-ctrl/sense-studios-work-management-` **[live]**
- **Branch of record:** `codex/sense-integration`; HEAD `fd1697f` at
  factory-init, `05108bf` at readiness review (both **[live]**, 2026-10-27)
- **Worktrees:** single worktree (the main checkout). No side worktrees **[live]**
- **Uncommitted:** ~29 changes at init (22 modified, 6 untracked, 1 deleted)
  **[live, snapshot]** — grew slightly with concurrent activity; recount
  before acting.
- **Discrepancy note:** `CLAUDE.md` claims branch `codex/s20-site-integration`
  with 369 uncommitted changes. **Git shows the opposite.** Git is the source
  of truth. The factory regenerates this map after any branch change; treat
  CLAUDE.md's "Current branch and tree state" section as stale.

## Monorepo layout **[live]**
- `pnpm-workspace.yaml` → apps `api` and `web`, plus `packages/*`
  (including `@sense/contracts`).
- **`apps/web`** — `@sense/web`: Vite frontend. Source of truth is `.tsx`;
  **committed `.js` twins are what Vite actually serves**. Tooling:
  `scripts/dev-js-twin-watcher.mjs` re-emits twins on save. Unit: vitest.
  Build: `vite build`.
- **`apps/api`** — `@sense/api`: NestJS + Prisma. Unit: jest
  (`jest.config.cjs`). Integration: jest against PostgreSQL.
- **`packages/contracts`** — shared API contracts.

## Quality gates (`pnpm verify`) **[live]**
`typecheck → lint → test (unit api+web, integration) → build → test:e2e`.
- Pinned toolchain: **Node 24.19.0, pnpm 11.19.0** (both confirmed on host
  **[live]**). `packageManager: pnpm@11.19.0`.
- `test:e2e` = `playwright test` (desktop + mobile journeys).

## Running servers **[live, verified 2026-10-27]**
| Concern | Port | State |
|---|---|---|
| PostgreSQL host | 45434 | LISTENING (pid 22904) |
| Sealed API | 59442 | LISTENING (pid 24508) |
| Sealed web | 59443 | LISTENING (pid 23856) |
| MW-I02 acceptance API | 59542 | not started |
| MW-I02 acceptance web | 59543 | not started |
| Hot dev loop (working tree) | 5180 | idle (start on demand) |
| Vite preview (launch.json) | 5173 | config present, idle |

- **59443/59442 = sealed commit-based release.** Serves only committed
  revisions via `scripts/staging/build.mjs` (`git archive <commit>`). Owner-
  gated. Do not migrate/reseed/reset.
- **5180 hot loop** = working-tree view; proxy points at sealed 59442 API.
  API changes need a separate dev API; point `API_PROXY_TARGET` there.

## Git identity and CI **[live]**
- Git user: `codex <codex@openai.com>` (local config).
- GitHub CLI authenticated as **`vijaychintala05`** (keyring), scopes
  `gist, read:org, repo, workflow`. Two remotes — `origin` (primary) and
  `new` (ArchiFlow-adjacent org, excluded per AGENTS.md recovery direction).
- CI: `.github/workflows/s01-quality.yml` (push + PR; Node + pnpm +
  PostgreSQL service; a `nas-release-images.yml` also exists).

## Excluded / preserved **[doc — AGENTS.md recovery direction 2026-10-21]**
- Exclude **ArchiFlow** and the unaccepted client-password migration 120.
- Preserve all historical branches, archives, evidence, configs, retained
  data. Never auto-run retained migrations.

## Authoritative surfaces for acceptance
- S18/S27 acceptance is scoped to a 484-file fingerprint; later concurrent
  edits to `review.tsx`/`review.css` are outside that run. Confirm the
  current serving commit before any acceptance claim.

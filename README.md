# Sense Studios Work Management

The verified canonical source is **[`master`](https://github.com/sensestudiosar-ctrl/sense-studios-work-management-/tree/master)**, now published to the public repository under the Owner’s explicit approval. Twelve redundant remote branch heads were retired after archive/ancestry verification. GitHub’s current default remains `codex/sense-integration` because the connected account lacks repository administration permission. A repository administrator must select `master` as the default, then the last historical integration head can be retired.

Start application work from `master`. Historical feature/release branches have been reconciled into its history; their original tips and review decisions are recorded in the [consolidation audit](docs/operations/BRANCH_CONSOLIDATION_2026-10-27.md). Archived implementations and experiments remain recoverable in Git history.

## Application

| Path | Responsibility |
|---|---|
| `apps/web` | React/Vite browser application |
| `apps/api` | NestJS API, authorization and persistence |
| `packages/contracts` | Shared contracts |
| `apps/api/prisma` | Canonical schema and reviewed migrations |
| `scripts/staging` | Controlled local release tooling |

Use [CURRENT_STATE.md](CURRENT_STATE.md) for the latest source/deployment status and [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for feature acceptance. Read [AGENTS.md](AGENTS.md) before changing source. Approved behavior lives in [requirements/APPROVED_REQUIREMENTS.md](requirements/APPROVED_REQUIREMENTS.md) and its approved addenda.

## Development and verification

Use **Node 24.19.0** and **pnpm 11.19.0**. Install reproducibly with `pnpm install --frozen-lockfile`, then generate the client with `pnpm db:generate`.

`pnpm verify` runs type checking, lint, API/web units, PostgreSQL integration, production builds and desktop/mobile browser checks. Database/browser acceptance requires explicitly bound disposable test fixtures; see [TESTING.md](TESTING.md) and the consolidation audit for the commands actually run.

## Local staging

The source branch and deployed release have separate identities. Check the current controlled release with `pnpm staging:status`; follow [STAGING_RELEASE_WORKFLOW.md](docs/operations/STAGING_RELEASE_WORKFLOW.md) for promotion. Never automatically migrate, seed or reset retained data. The canonical source has 120 migrations, including the accepted task-review work-routing migration; older duplicate migration names must not be restored.

Factory tooling is local and separately tested. Scheduling remains unactivated; see [its recovery runbook](docs/ai-factory/RECOVERY.md). Execution leases/checkpoint JSON and environment files remain private local state.

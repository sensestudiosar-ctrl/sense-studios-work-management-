# Local working environment

Use the root commands below for the single local working environment:

```text
pnpm dev
pnpm runtime:status
pnpm runtime:restart
pnpm runtime:stop
```

`pnpm dev` starts only when the configured ports are free. Use `runtime:status` when already running. `runtime:restart` prepares and builds the backend before stopping the owned processes; it preserves the existing database, files and credentials. A failed guard stops the operation without automatic retries. Inspect reported failures before another attempt.

The sole operational configuration is `config/local-runtime.json`. It supplies API/web ports, browser origin, the saved database identity, NAS location and active process-manifest path. Private configuration is `.env.local-runtime`, ignored by Git; it holds only the existing external-share secret. Runtime startup derives database URL and frontend proxy from the canonical configuration. Do not create a competing root `.env` or use historical acceptance/preview launchers for ordinary work.

The application source remains the primary checkout. `apps/api/src/app.module.ts` composes the one backend; `apps/api/src/database.service.ts` supplies its shared database client; `apps/api/prisma/schema.prisma` defines the schema. All feature resources use the existing `/api/v1` API and backend authorization/domain services. Separate controllers are resources within that API. The web app accesses it through `/api` on the same browser origin.

The frontend uses Vite hot reload. Backend changes become active after `pnpm runtime:restart`, which rebuilds the contracts and API. Database migrations remain a separate reviewed operation; no runtime command creates, migrates, resets, seeds or deletes a database.

The active process record is `.env.local-runtime-tools/active.json`; unique attempt logs remain beneath that private directory. Historical `.env.checkpoint-tools`, `.env.working-server-20261014`, old operation reports and preserved databases are recovery/acceptance evidence, not active runtime configuration. Keep them intact. This local setup does not claim production readiness or whole-application acceptance.

On 14 October 2026 the canonical preflight and restart passed with pinned Node24.19.0/pnpm11.19.0, fresh contracts/API builds, five process/listener rejection tests and focused ESLint. Active saved118 database/OID145606, exact loopback process ownership and root/direct/proxied readiness were verified. A directory mutex serializes mutation commands; an unexpected stale lock requires inspection rather than automatic removal. Failed attempts preserve evidence and any recorded children for explicit ownership review. All broader feature acceptance remains separately tracked.

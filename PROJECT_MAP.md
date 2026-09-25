# Project map

As of 2026-09-25, S01 Runtime and Verification is complete. Architecture is approved at checkpoint 2e46805. Only foundation/runtime code is authorized; S02 and later business capabilities have not started.

- requirements/APPROVED_REQUIREMENTS.md — verbatim Owner source; requirements/CLARIFICATIONS.md — approved addenda C-001–C-024.
- AGENTS.md, CURRENT_STATE.md, IMPLEMENTATION_STATUS.md — entry points, commands and current state.
- PRODUCT.md, REQUIREMENTS_TRACE.md — product boundary and source-section traceability.
- MODULE_REGISTRY.md, IMPLEMENTATION_PLAN.md — planned boundaries and the 27-slice sequence.
- ARCHITECTURE.md, DATABASE.md, DOMAIN_MODEL.md, PERMISSIONS.md, WORKFLOWS.md, FILE_STORAGE.md, EVENT_CATALOGUE.md — approved architecture and domain plans.
- S01_PLAN.md, S01_COMPLETION_REPORT.md, TESTING.md — S01 task map, verification commands, evidence and remaining gates.
- DECISIONS.md, REQUIREMENT_QUESTIONS.md, KNOWN_ISSUES.md — Owner decisions, question history and confirmed risks.
- package.json, pnpm-workspace.yaml, pnpm-lock.yaml, tsconfig.base.json, eslint.config.mjs — pinned workspace and quality tooling.
- apps/web — React/Vite PWA shell and frontend tests.
- apps/api — NestJS API/worker shells, runtime config, health checks, Prisma schema and reviewed SQL migration.
- packages/contracts — shared health contracts.
- tests/e2e — desktop/mobile Playwright foundation checks.
- infra — API/web Dockerfiles, Nginx configuration and PostgreSQL/API/worker/web Compose staging.
- .github/workflows/s01-quality.yml — CI quality and container/recovery workflow.
- scripts/rehearse-backup.mjs — database-and-file backup rehearsal for a running Compose stack.

No business module or business schema has been created. Compose startup and recovery rehearsal passed locally. The Owner confirmed hosted GitHub Actions is green for commit 570d52f. S02 and later remain unauthorized.
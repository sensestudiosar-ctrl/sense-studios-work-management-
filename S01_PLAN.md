# S01 implementation contract

Architecture baseline: approved by the Owner on 2026-09-25 at Git checkpoint 2e46805. Scope is S01 Runtime and Verification only. This checklist expands R-091, R-093, R-099–R-102, R-103, C-007, the S01 row in IMPLEMENTATION_PLAN.md and section 17 of FINAL_PRE_IMPLEMENTATION_REVIEW.md. Later business slices remain out of scope.

## Preconditions and assumptions

- The Git baseline is clean at 2e4680570e6f6e31bb3fff58f7a01b92782980dc.
- Node 24.19.0 is installed and is an LTS release; pnpm 11.19.0 is installed. Pin exact versions in the workspace. Pin supported stable package versions after registry compatibility checks.
- The Windows host has PostgreSQL 16.15 installed, but its running PostgreSQL16-FirmBooksTest service belongs to another application. Do not touch that data directory. A separate temporary cluster on port 55433 was used for S01 checks. Docker Desktop is now running (Docker 29.8.0; Compose 5.5.1); Compose configuration, builds, startup, service readiness and recovery rehearsal passed on 2026-09-25. The hosted GitHub Actions workflow remains unverified. The supplied remote is configured locally, but automatic review rejected publishing the S01 source pending explicit Owner approval.
- No new product or architecture owner decision is required to establish the foundation. Exact package versions, file layout and test harness are engineering choices within the approved stack.

## Tasks, requirement map and acceptance evidence

| ID | Task | Source | Required evidence |
| --- | --- | --- | --- |
| S01-A | Root pnpm workspace, pinned Node/pnpm and clean scripts; boundaries for web, API/worker, shared contract, infra and tests. | R-093, R-103, R-102 | Clean install and build from a clean checkout; no business modules. |
| S01-B | Typed, validated safe configuration with example environment and ignored real secrets. | R-099, R-093 | Missing mandatory configuration fails clearly; secret scan finds no committed credential. |
| S01-C | NestJS API shell and distinct process health/readiness; real PostgreSQL check via Prisma. | R-093, R-099, R-100 | Automated healthy/unhealthy readiness tests and real database connectivity. |
| S01-D | Prisma schema and reviewed foundational SQL migration only; fresh and backed-up test-database migration rehearsal. | R-093, R-100, R-102 | Migration files reviewed; fresh and restored test DB migrations recorded. |
| S01-E | React/Vite responsive PWA shell with routes, loading/error/empty states and health representation. | R-093, R-100, R-102 | Desktop/mobile browser checks and frontend tests; no fake business data. |
| S01-F | Typecheck, lint, unit, API integration, frontend and browser E2E commands plus CI quality gate. | R-100, R-101, R-102 | Exact commands and results; clean checkout sequence install → test DB migrate → checks → build. |
| S01-G | Local/staging Compose configuration for web, API, worker and PostgreSQL with secrets outside Git. | R-093, R-099, R-102 | Compose validation/startup and service connectivity, or explicit blocked result if runtime unavailable. |
| S01-H | Consistent test PostgreSQL-plus-file backup/restore rehearsal with checksum and documented offsite/key policy. | R-091, C-007, R-099, R-102 | Test record/file restored and checksum matched; never use production data. |
| S01-I | Update developer commands, repository map, status, trace and independent review; commit logical checkpoint. | R-101, R-102, R-103 | Re-run checks after fixes; status matches evidence and no S02 work. |

## Explicit boundaries

No production authentication, organization/employee/Branch RBAC, lead, client, project, task, review, approval, NAS document workflow, notification, workforce, Turnkey, analytics, integration or AI functionality. S01 may create only foundation infrastructure and non-business test fixtures.

## Completion rule

Use the 13-point Owner checklist in the S01 approval and the ten criteria in FINAL_PRE_IMPLEMENTATION_REVIEW.md. A clean codebase without live database/container/restore evidence remains IN PROGRESS or BLOCKED, never COMPLETE. Report each missing gate and finish with S01 COMPLETE — READY FOR REVIEW or S01 BLOCKED.

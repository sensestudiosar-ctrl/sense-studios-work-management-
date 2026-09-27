# S07 progress report — 2026-09-27

Status: **IN PROGRESS**. Owner authorized S07. This checkpoint implements S07A, the first persisted vertical increment for project ownership. S08 and later remain unauthorized.

## Implemented

- Owner-only Draft Design/Turnkey creation, Branch-filtered list, detail and setup APIs, plus an initial responsive Owner UI. Session/setup checks and CSRF/origin checks protect writes.
- Direct project creation and one-project-per-Won-lead conversion. Conversion checks the current Won state and owning Branch, inherits the lead's Client and records exact Won-stage provenance in the canonical event and response.
- Branch-owned Project persistence, immutable baseline scopes, append-only Draft status evidence, version and cross-organization constraints. The database prevents effective cancellation until its task/access/NAS dependencies are implemented.
- One atomic transaction for project, scopes, status evidence, audit event, domain event and outbox. A pure lifecycle policy encodes allowed transitions for later persisted commands; no transition endpoint is exposed yet.
- Owner decisions recorded: direct creation or Won conversion; one project per Won lead; a per-project named scope-change approver selected by the Owner; requester and approver must differ.

## Verification performed

- Node 24.19.0, pnpm 11.19.0. Frozen dependency install succeeded after the offline cache proved incomplete.
- Prisma format, validate and client generation passed. The reviewed S07 migration applied as migration 14 on fresh dedicated PostgreSQL test databases.
- Project-focused checks passed: 4 lifecycle unit, 3 PostgreSQL/database, 4 HTTP and 4 UI tests.
- Full available suites passed: API unit 89/89 (15 suites), PostgreSQL/API 63/63 (16 suites on fresh UTC `sense_s07_acceptance_test`), web unit 40/40 (6 files).
- Contracts/API/web TypeScript checks, ESLint, API production compilation and Vite/PWA production build passed. `git diff --check` passed.
- A PostgreSQL worker test timed out on a reused development test database; the fresh acceptance database run passed. No test was weakened.

## Remaining S07 acceptance

Implement scoped staff project grants and explicit cross-branch assignments, accountable Project Lead assignment/history and Owner transfer, persisted lifecycle commands with gates and audited overrides, S05-backed named scope-change approval and immutable revisions, and cancellation request handling. Effective cancellation and full employee exit remain unavailable until S09 task/access workflows can make their required atomic changes. Complete responsive project workflows, desktop/mobile Playwright, upgrade migration rehearsal on S06 data, full `pnpm verify` and final security/requirement review before marking S07 COMPLETE.

## Method

Sol-level root work handled requirement interpretation, schema/migration, authorization, security review and final acceptance. Two Luna agents handled bounded lifecycle-policy and Draft API/UI implementation; root reviewed, integrated and corrected their work. The S07 changes live on isolated branch `codex/s07-project-ownership`; the original checkout's unrelated local web edit was preserved.

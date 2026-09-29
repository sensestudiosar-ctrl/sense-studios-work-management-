# S09 completion report

Status: COMPLETE for authorized development/local staging. Owner authorization: 2026-09-28. S08 is COMPLETE; S10 and later remain unauthorized.

## Delivered scope

- R-018–R-022: persisted tasks with exactly one Primary Owner, distinct collaborators and explicit per-person estimates, required type/priority/target date, description/start/estimate and optional project plan link, tags and checklist. Owner and granted managers assign within checked reporting/project scope; staff create self-tasks. Type labels do not execute later recurrence, site, review or training workflows.
- R-023.a/R-024.a: operational target dates, versioned edits, Not Started → In Progress → Completed, immutable owner/state history and canonical audit/event/outbox. Required review blocks completion until the later review handlers exist. Overdue is not a persisted state.
- C-023: atomic Owner employee exit suspends access, revokes sessions/current grants and memberships, waits unfinished owned work while retaining owner/prior state, and preserves terminal tasks. Each waiting task needs explicit eligible reassignment before valid progress. Authorized managers can see their report/project queue. The Owner receives a mandatory persisted alert.
- C-024: exit places the employee's Active lead projects On Hold, clears current lead authority with history, revokes assignments and alerts current assigned staff. Owner replacement and ordinary gate-checked resume are required. Cancelled/Archived projects retain their terminal outcome while access can be revoked.
- C-010/C-011: Owner cancellation from Draft/Active/On Hold atomically stops unfinished delivery tasks, links reason/actor/time, preserves completed work and prevents reopening. Internal C-016 closeout is distinct approved work on a Cancelled project, with immutable approved scope/owner/date and Owner revocation.
- Responsive own/assigned task workspace supports loading, empty, denied, error/conflict, refresh, creation, edit, transition, reassignment and closeout approval/revocation. Owner employee exit and effective project cancellation controls are integrated.

Backend access checks enforce active identity, current project assignment, explicit cross-branch authorization and scoped permission. Assignment alone conveys no task-management authority. SQL guards enforce history, valid workflow evidence, one-owner references and closeout scope immutability. Guessed IDs, old-task ownership takeover, stale versions, revoked access and stopped-task resume are rejected.

## Actual verification

Environment: Windows; Node 24.19.0; pnpm 11.19.0; dedicated local PostgreSQL 18.6 on loopback with UTC timezone. Frozen offline lockfile install passed during S09. Credentials stayed in ignored local environment settings.

| Check | Actual result |
| --- | --- |
| Fresh `pnpm db:migrate:deploy` | All 27 migrations applied on `sense_s09_release_20260928_test`; seven are S09 migrations |
| `pnpm --filter @sense/api db:validate` / `db:migrate:status` | Valid Prisma schema; all 27 migrations current on upgraded copy |
| `pnpm verify` | Exit 0: typecheck, ESLint, 108 API unit / 19 suites, 51 web unit / 8 files, 91 PostgreSQL/API tests / 21 suites, production builds, 13 Playwright cases |
| Focused S09 database suite | Seven cases passed, including manager scope, review bypass denial, cancellation/closeout, SQL evidence tampering, explicit cross-branch access/revocation and atomic exit rollback |
| `node scripts/check-s09-concurrency.mjs` | Passed on fresh `sense_s09_final_race_20260928_test`: actual concurrent start and cancellation, version conflict, injected cancellation-audit rollback, employee exit versus task progress, and access revocation on a Cancelled project |
| Desktop/mobile S09 Playwright | Actual HTTP/session and database persistence: create, refresh, start, edit tags/checklist, complete, refresh and unrelated-task denial; no horizontal overflow. Both task screenshots visually inspected |
| Final reassignment-alert UI increment | Five focused task tests, then all 52 web unit tests, web typecheck, repository lint and web build passed. `pnpm test:e2e tests/e2e/task.spec.ts --project desktop-chromium --project mobile-chromium --no-deps` passed both browser cases |

The complete existing suite ran; no PostgreSQL cases were skipped. Dedicated test fixtures were retained. API/web servers were started separately to avoid the documented Windows managed-server cleanup issue; `pnpm verify` completed normally with exit 0.

## Upgrade preservation

An S08 database dump was restored into `sense_s09_upgrade_20260928_test`, then all S09 migrations applied forward. Ordered full-row JSON checksums and counts matched the untouched S08 source in all ten checked tables: accounts (8), employees (7), projects (4), scopes (6), project status changes (8), assignments (4), template versions (2), plans (2), plan items (24), completions (2). No reset or deletion was used.

## Review and resolved defects

Final review corrected old-task access checks before reassignment, collaborator promotion without duplicate ownership, preservation of promoted effort evidence, active identity and project-access checks, current-owner rechecks after exit row locking, actual locked lead-hold results, and terminal project mutation handling. Database guards were tightened with forward migrations for canonical task versions, exit/stop linkage and closeout revocation. Regression and concurrency checks above verify the affected behavior.

Harness issues were classified separately: reusing a populated database violates older singleton-Owner test fixtures, and a cross-branch test initially supplied an ineligible foreign-branch permission and lacked initial project status evidence. The fixture now uses the existing organization-scoped cross-branch grant policy plus explicit project assignment; production permissions were not weakened. The upgrade checksum command initially named the completion table incorrectly; the corrected `project_plan_completions` query matched both rows.

The post-increment web suite once failed the existing refreshed-session-revocation assertion. The isolated 15-test identity suite and a complete 52-test web rerun passed unchanged; the cause is unconfirmed and remains an intermittent test reliability observation. `pnpm exec playwright` was unavailable in this shell; the repository `pnpm test:e2e` script ran the required browser checks successfully. Neither harness failure is represented as a passing first attempt.

## Routing and limits

The primary agent used GPT-6 with Sol-level reasoning for requirement interpretation, schema/security decisions, difficult debugging, integration and final acceptance. Actual `gpt-6-luna` agents handled bounded schema scaffolding, task policy, UI, HTTP/unit tests and documentation. The primary agent reviewed their outputs against approved requirements. The existing root task was not automatically switched to a Sol model.

S10 committed dates, ordinary waiting/dependencies/recurrence; S11/S12 files; S13/S14 review/client decisions; S16 time; S17 capacity; S18 training; S21 external portals/CAD grants; and S24 reminders/escalation remain deferred. Current schema contains no external project grants, native links or client approval requests. C-012–C-015 and C-016 external closeout consequences must join the atomic cancellation operation before those later modules introduce that data; this report claims only current internal cancellation/closeout behavior.

Hosted CI, Compose deployment, live email delivery and production NAS validation were not run for S09. Existing encrypted offsite backup, key custody and production restore gates remain. No deployment, commit, push or S10 work is included in this completion.

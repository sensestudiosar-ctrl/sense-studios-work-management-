# Local test task creation blocker — 12 October 2026

## Established cause

The live `http://localhost:59223/tasks` screen is signed in as the local Owner, but Create task is disabled and the task queue shows an access denial. Guarded read-only SQL on the exact existing test database confirms **0 organizations, 0 branches, 0 teams, 0 employees and 0 tasks**, with one active, fully secured Owner. Cluster system identifier `7693570241708228348`, retained directory `.env.checkpoint-tools/pg-demo-20261006-a7c9`, endpoint `127.0.0.1:45434`, database `sense_local_preview_20261008_1791474390772_test`, 115 existing migrations. No data or schema was changed.

`ProjectService.actor()` requires an organization before task setup/list reads. Its absence correctly denies the Tasks workspace. Organization/employee setup is required before an Owner can assign a real task; a personal task cannot be fabricated for an Owner without an employee identity.

## Two frontend defects found

1. With no organization, `OrganizationService.getOrganization()` returns null. The installed Nest Express adapter sends a successful empty body for null; `OrganizationAdmin` calls `response.json()` and shows a misleading load error. A failed/denied read also incorrectly leaves the setup form visible because null is the initial state.
2. Once task setup is available, an employee-less Owner's `/tasks` creation form defaults to self-task and omits `ownerEmployeeId`. The backend correctly rejects it with `A primary owner is required`, obscured by generic frontend permission wording.

## Bounded correction

Requirements: organization hierarchy/access under S03/S04 and R-018.a–b, R-019.a–c, R-021.a–b task ownership/assignment. Frontend only: handle the established successful empty organization response, distinguish unconfirmed/denied/error from confirmed absence, and require an explicit primary employee owner whenever successful task setup confirms no employee identity. Preserve existing employee self-task defaults, CSRF, project eligibility, mandatory dates and backend authorization. Scope is `apps/web/src/app.tsx`, `task.tsx` and their existing regression tests. No backend, database, permission, migration, cluster lifecycle, fixture seeding or new authenticated acceptance is authorized by this diagnosis.

Verification: regression tests for an empty-body organization response, denied/malformed setup, explicit Owner employee assignment and existing self-task behavior; affected frontend gates; live read-only confirmation of the organization setup UI. No live task will be created without its real owner/details and the appropriate authorization.

## Correction and evidence

Implemented the two frontend corrections. All four new reproduction cases failed before the fix. The three organization response/denial cases and new Owner assignment case pass afterward, along with the existing staff self-task/CSRF case (5 selected tests). The full affected task/attention/card set is 62/62 PASS. Pinned Node24.19.0/pnpm11.19.0 typecheck, ESLint and build PASS. Full web:259passed/20failed/279total, retaining the19known baseline failures and separately tracked unchanged external-portal failure; no new full-suite failure. No clean full verify is claimed.

The existing Vite server serves these changes through HMR. On the actual authenticated Owner organization-settings screen, the confirmed-empty setup form now appears without the misleading load error. No form was submitted. The mandatory employee-owner form is covered by frontend tests; actual task persistence cannot be demonstrated until operational setup is provided.

- [Actual setup screenshot](evidence/task-creation-20261012/organization-setup-live.jpg)
- [Guarded read-only diagnosis](evidence/task-creation-20261012/READ_ONLY_DIAGNOSIS.json)
- [Affected tests](evidence/task-creation-20261012/focused-final.json)
- [Full web results](evidence/task-creation-20261012/full-web-final.json)
- [Typecheck/build](evidence/task-creation-20261012/FRONTEND_CHECKS.json)
- [Combined checks](evidence/task-creation-20261012/STUDIO_FRONTEND_CHECKS.json)

Changed application files: apps/web/src/app.tsx and task.tsx. Regression coverage: app.test.tsx and task.test.tsx. No backend/schema/security rule change, account provisioning, data write, migration, cluster start/stop or authenticated acceptance run. Existing server processes and database data were retained. Investigation/context/final source review used GPT-6.1 Sol.

## Remaining data setup

The existing test database still needs an organization, branch, team and an active staff employee through ordinary secured Owner workflows. Names, intended staff account and role/permissions must be chosen by Owner; do not invent or silently provision them. The Owner may complete Settings → Organization administration, then invite/enrol staff and create employee membership, and use Tasks with an explicit primary owner. Any agent-assisted setup must have a concrete bounded authorization; no environment reset or new database is needed. MW-I02 remains IN PROGRESS; MW-I03 excluded.

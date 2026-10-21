# V1 shared task composer and context choices — 15 October 2026

Status: **IN PROGRESS.** Continues the active internal-staff V1 goal after [People/Settings](V1_PEOPLE_SETTINGS_PROGRESS_2026-10-15.md). Requirements and package bounds are in IMPLEMENTATION_PLAN.md under V1-05A. This record is not whole-application or staff-pilot acceptance.

## Implemented source

`GET /api/v1/tasks/creation-options?projectId=<uuid>` is a no-store, session-bound participant read. Unknown query fields and malformed project IDs are rejected. Its shared contract returns actorEmployeeId, selected project summary, canAssign/canCreate, owners, collaborators and readAt. It uses the existing current-account, project membership, branch/cross-branch, recipient project-view and assignment/reporting-tree checks. Owner's organization choices, manager non-project descendants, project management and self-only Staff remain distinct. Closed/held projects reject new-delivery choices. No grants or project assignments are created by selection; the create command still independently reauthorizes every participant.

The ordinary task dialog and one-level subtask form now share `TaskComposerFields`, one typed draft, validation and payload builder. Essentials remain name/type/priority/Target/one owner/reason. Optional planning retains description, start, estimate, stage/milestone, tags and checklist, with supported review requirement on project work and a link/explanation for the owning review workflow. Shared limits remain description2000, tags10×30, checklist10×120, estimate0–100000 and collaborators30. Checklists remain distinct from real children; no arbitrary state writing was added.

Participant reads happen when the composer opens or changes project, with loading/error/retry and exact response-context matching. Submission waits for a successful current read. Old-context responses cannot replace current choices; switching project clears incompatible participant/plan values. A lost assignment capability falls back to self presentation, and removed candidates are cleared. Project/type mismatches and invalid field/participant values fail before writing without truncation.

Capacity acknowledgement is invalidated by draft changes and rechecks current creation/parent context before submitting the original warned command. Normal confirmed creation opens its returned canonical task ID without injecting someone else's work into the creator's personal-owned list. Uncertain normal-create network/server outcomes retain the draft, explain uncertainty and do not automatically retry. Durable create idempotency remains outstanding; no retry-safety claim is made.

## Evidence and limits

Before source:578files, hash `30411ee64707cb21c35e8ab4ab763aa6032d835de4cff9be4fe5a8255efe5ccc`;118 migrations. Local artifacts: `.artifacts/v1/20261015-task-composer/` (ignored).

- Creation-option service tests:13passed, including self/manager/Owner distinctions, reporting descendants, forbidden project/recipient reads, revoked/cross-branch assignments, terminal/held projects and unavailable authorization. Mocked task HTTP checks:19passed, including strict-query/session/no-store boundaries. Neither result proves real PostgreSQL execution.
- Initial task regressions exposed the new asynchronous-read boundary in older mocks/tests. Explicit creation-option fixture branches and waits were added; no assertion or timeout was weakened. One older self-create mock returned `{task}` rather than the actual ordinary create row; it was corrected to the current API shape.
- During consolidation an unchanged child-projection timing test failed once and passed in the next full affected group without source/assertion changes. A new test's dialog cleanup order initially removed its mock before React unmounted; explicit cleanup now runs first. The three create-flow tests passed after that harness correction.
- Whole-workspace typecheck/lint/contracts+API+web build passed after the shared form and scope changes. Existing large bundle/ineffective dynamic import warnings remain. Final current-source checks are recorded below as they finish.
- Synthetic browser fixture passed16captures/16denied-write draft-preservation interactions across Owner/Leader/Employee/Site at1440,1024,390,320px. Page overflow, dialog footer visibility and page errors were checked. Browser fixture mocks its reads and rejects writes; no authentication/database acceptance is implied. The first capture failed because its exact field-label selector did not match the browser's accessible name; a role/name locator resolved the harness issue.

The temporary fixture listener on loopback59744 was stopped after evidence collection; a host loopback probe confirmed ECONNREFUSED. It was independent of retained/canonical services. No migration, retained database write, canonical server change, stopped MW-I02 authenticated retry, deployment, commit or push is part of this source batch.

### Final source checks

Final current-source web run: **505/505 tests across 51 files passed**, zero failed/pending (`web-final.json`). Full API unit: **392/392 tests across 59 suites passed**, zero failed/pending (`api-full.json`). The final aggregate typecheck/lint/contracts+API+web build command exited0 after the pending-submission guard and capacity-acknowledged canonical-ID correction. Existing Vite bundle/import warnings remain. API code was unchanged after its full unit run.

A synchronous in-flight guard now prevents repeated create/subtask/capacity-acknowledgement submission events while the same request is pending; the full frontend run includes the double-submit regression. This is a browser guard, not durable backend idempotency. Confirmed capacity-acknowledged ordinary creation also opens the returned canonical task ID. Earlier create-flow cleanup failures and the transient existing projection test are reported above; final tests passed without weakening assertions/timeouts.

Final source helper: **585 files**, hash `23b2d95ef89b5548acf6dca93f1bad9afb7232256c2bd884ffd5c453018900d9`, **118 migration directories**, matching before/after the final checks. `source-receipt.json` records the boundary. Final synthetic browser report again contains16captures/16draft-preservation interactions with no recorded failure; it precedes the final submission-only guard and acknowledgement-ID change and is not an authenticated acceptance run. Scoped diff whitespace checks passed. Real PostgreSQL/concurrency, full `pnpm verify`, hosted CI, authenticated visual and actual staff acceptance were not run in this batch. Status remains **IN PROGRESS**.

## Still required

Project Tasks must embed the canonical list/composer without overwriting project-list context, followed by coherent project People sections. Task creation still needs reviewed durable idempotency and final current-resource persistence/concurrency/authenticated/visual acceptance. The Owner was asked whether V1 non-project work needs an internal-review workflow; that material choice is pending. No new non-project review workflow or backend rule was invented while awaiting it.

V1-00/MW-I02 acceptance, broader access explanation/audit, Settings recovery, returned demo integration, real-staff/operational R-104/R-105 and production readiness remain separate open gates. The V1 goal stays active; no COMPLETE claim. Actual routing is the current Codex agent only, with no independent final acceptance.

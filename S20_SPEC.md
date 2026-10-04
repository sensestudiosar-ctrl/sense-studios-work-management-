# S20 Site progress, daily reports and snags — authorized scope

Current execution status: **COMPLETE for development/local staging (2026-10-04).** Combined dependency acceptance preceded implementation. Backend, additive migrations, staff API, responsive site UI and focused persistence/security tests are implemented. Final `pnpm verify` exited 0 with all required gates; both desktop/mobile journeys passed and Sol accepted source, schema, permissions, evidence, concurrency and final screenshots. R-105 actual-project and production gates remain unverified.

Historical authorization checkpoint: **AUTHORIZED / WAITING ON S17 INTEGRATION — 2026-10-03.** That wait has since been satisfied: S16/S17 source was integrated and combined dependency acceptance passed before S20 implementation. S20 business scope remains bounded by the Owner decisions and settled contract below. S18 authorization remains disputed; S21–S27 remain unauthorized.

Approved sources: the current Owner decisions, requirements/APPROVED_REQUIREMENTS.md, approved addenda C-001–C-024, architecture checkpoint 2e46805, and IMPLEMENTATION_PLAN.md. Existing S19 business/source/documentation changes are preserved.

## Owner decisions — 2026-10-03

1. **Dependency:** Wait for S17 before implementing S20. Do not implement a manual-manpower substitute to bypass the dependency. Preserve the separately authorized S17 acceptance; integration and combined acceptance must precede S20 implementation.
2. **Site responsible person:** The Owner, assigned Project Lead or explicitly authorized Team Leader may appoint one currently assigned person as the site's responsible person. Only that person confirms/submits daily reports. Appointment/replacement requires a reason and retained history. Appointment does not grant project access or independent snag-verification authority.
3. **Site handover:** The Owner, assigned Project Lead or explicitly authorized Team Leader makes a separate site handover decision after all current work packages are completed, quality has passed and all snags are Closed. Client acceptance and project completion remain separate. S20 adds no new project-completion gate.

C-020 and C-021 already settle independent snag verification and separate management closure; those approved rules remain in force.

## Requirement sub-IDs

These sub-IDs expand the multi-clause source for implementation and testing; they add no new requirements.

| ID | Required behavior |
| --- | --- |
| R-068.a | Show today's work on the specialized site dashboard. |
| R-068.b | Show tomorrow's plan. |
| R-068.c | Show workers/manpower today. |
| R-068.d | Show progress. |
| R-068.e | Show photos. |
| R-068.f | Show snags. |
| R-068.g | Show site approvals. |
| R-068.h | Show pending decisions. |
| R-068.i | Show materials. |
| R-068.j | Show blockers. |
| R-068.k | Show critical activities. |
| R-069.a | Capture work completed today. |
| R-069.b | Capture manpower. |
| R-069.c | Capture materials received. |
| R-069.d | Capture photos. |
| R-069.e | Capture issues. |
| R-069.f | Capture delay causes. |
| R-069.g | Capture tomorrow's plan. |
| R-069.h | The named site responsible person confirms/submits the report; system precompilation from activity is optional. |
| R-070.a | Support planned percentage and actual percentage. |
| R-070.b | Support quantity completion. |
| R-070.c | Support work-package completion. |
| R-070.d | Support quality status. |
| R-070.e | Support material status. |
| R-070.f | Support snags. |
| R-070.g / C-020 | Open → Assigned → In Progress → Ready for Verification → Verified, with a named independent verifier and failed checks returning the same snag to In Progress with attempts retained. |
| R-070.h / C-021 | A separate authorized management decision closes a currently Verified snag using its current latest passed verification. |
| R-105.a | Prove the Turnkey continuation through approved design, BOQ/materials, procurement, factory/site execution, manpower, progress, quality, snags and handover. |

Cross-cutting requirements: R-006/R-092 project and branch authorization, R-079/R-080 canonical audit and retained evidence, C-001 hierarchy and explicit cross-branch assignment, C-023/C-024 immediate exit/access loss and delivery holds, and existing document and approval rules. S19 owns BOQ/material/procurement/factory operations; S20 consumes their operational evidence without duplicating accounting or exposing protected costs.

## Scope and dependencies

Dependencies are S09, S11, S17 and S19, as recorded in IMPLEMENTATION_PLAN.md. S09/S11/S19 are complete for development/local staging. S16/S17 source is integrated, and combined dependency acceptance passed before S20 implementation. S05/S07/S08/S12–S14 provide existing approvals, project gates, exact design evidence and issued-document handover boundaries where applicable.

Planned in scope: site work packages, manpower/progress, exact photo/file evidence, confirmed daily reports, independent snag verification and separate closure, site handover, backend authorization and persisted history, canonical audit/events/outbox, and responsive desktop/mobile site presentation.

Out of scope: starting workforce dependencies without authorization, S21 consultant/vendor portals, S22 offline capture/sync, accounting/inventory/payroll, analytics/AI, new client-acceptance rules, new project-completion gates, and production deployment. Existing project completion and client issued-document handover remain separate domain commands.

## Implemented technical boundaries

The following summarizes the S20 implementation in tracked source; `S20_API_CONTRACT.md` contains its exact API shapes. Scope remains limited to S20.

- SITE owns site packages, progress/manpower observations, report drafts/confirmed snapshots, responsible-person history, snags, repair/appointment/verification/closure history and site handover evidence. Four additive tables (`site_workspaces`, `site_records`, `site_history`, `site_verification_attempts`) were added by three forward migrations; no command receipt table was added. Organization/project composite references and immutable evidence guards preserve existing data.
- UI → controller validation/session/CSRF → authorization → SITE domain command → transaction/persistence/audit/outbox. Other modules supply public services rather than direct writes to their tables.
- Only Active Turnkey projects accept site delivery writes. Every operation rechecks active account/employee/session, current assignment, explicit cross-branch authority and effective action grants against the project's current branch. Delivery holds/cancellation/completion stop new writes while ordinary scoped historical reads remain possible.
- The assigned Project Lead is resolved from current project authority. An explicitly authorized Team Leader must hold effective management and specific action authority; titles alone grant nothing. Current service checks include `project.view`, `site.view`, `site.work`, and for non-lead Team Leaders `site.manage`, `project.manage`, and `employee.manage`; checks are against the project's current Branch and current project assignment.
- Responsible-person appointment never grants membership. Daily-report confirmation never grants snag verification or closure. C-020 verifier appointment/reassignment records reason/actor/time and never creates cross-branch access.
- Track the person who actually performed the repair. Only the current named verifier with current snag/project access may pass/fail that repair; the fixer cannot verify. Failed checks retain notes and available photo/file evidence and return the same snag to In Progress. A stale or superseded repair/check cannot support closure or handover.
- C-021 closure is a separate command by the assigned Project Lead or explicitly authorized Team Leader, with current passed verification reference, closer/time and closure note. The same manager may verify and close only through separate actions if they hold both authorities. Preserve every failed attempt and repair/assignment history.
- Use DocumentService.authorizeFile within the caller transaction for immutable photo/file evidence; retain exact document/blob/checksum identity. Reauthorize metadata and streams on each read, including Confidential ancestors; do not expose NAS paths, credentials or ungranted files.
- Consume S19 operational release/material/factory data through a public nonfinancial service boundary. Retain released input identity and do not replace production inputs silently; costs/financial approvals remain under S19 policy.
- Percentages/quantities use server and SQL validation. Planned/actual values remain independent factual decimal strings; no conversion, manpower capacity formula or new workforce rule is introduced. Attendance is supplied through a narrow S17 public port, while manually recorded trade counts remain separate site evidence.
- Versioned commands and row locks reject stale updates; session/grant checks repeat after waits. Material changes, history, audit/events/outbox and handover evidence commit atomically. Immutable confirmed report corrections use retained corrective evidence rather than destructive rewrite.
- Site handover references the current completed packages, passed quality and Closed snags in its explicit management decision. It neither substitutes for client acceptance nor changes project completion automatically.

## Acceptance and verification

The settled API and schema are implemented in `apps/api/src/site.controller.ts`, `apps/api/src/site.service.ts`, Prisma schema and additive S20 migrations. `S20_API_CONTRACT.md` is the API reference. The authorized development/local-staging acceptance passed; exact final evidence and classified earlier attempts are recorded below and in S20_COMPLETION_REPORT.md.

1. Fresh and populated-upgrade migrations preserve existing rows and evidence. Verify Prisma schema/generation/status and reviewed SQL constraints, immutable history, same-project references and canonical evidence enforcement.
2. Real persistence and refresh preserve packages, manpower, progress, exact evidence, report confirmation, snag history and handover; dashboard clauses map to authoritative scoped source data.
3. Responsible-person appointment/replacement is audited and scoped; other staff cannot confirm reports. Report confirmation cannot appoint/verify/close snags.
4. Test C-020 named appointment/reassignment, current access, actual fixer independence, allowed pass/fail, retained failed attempts, same-snag rework and current repair binding.
5. Test C-021 separate closure, denied fixer self-verification, denied verifier-only closure, denied ordinary staff/ungranted manager, and rejected failed/stale/superseded check references. A manager holding both roles still records separate verification and closure.
6. Test site handover authority and all current-package/quality/snag gates. Verify client acceptance and existing project-completion behavior stay separate.
7. Test organization/project ID tampering, branch leakage, explicit cross-branch versus unassigned access, immediate grant/session/employee revocation, hold/cancellation/completion denial and document/Confidential evidence access.
8. Test genuine concurrent updates, assignment/verification/closure races, lock-wait session expiry, duplicate/stale decisions and injected audit-failure rollback without partial history or operational changes.
9. Verify loading/empty/error/denied/conflict states, readable evidence/history and critical workflow navigation on desktop and mobile. Browser acceptance uses dedicated test databases and real backend persistence, with refresh and denied-action evidence.
10. Run appropriate targeted tests and final pnpm verify: typecheck, lint, unit/API/PostgreSQL tests, production builds and desktop/mobile Playwright. Record exact commands, failures/classifications, skips and environment limitations. A fixture journey is local-staging proof; R-105's actual-project checkpoint needs separately identified real project evidence.

## Implementation evidence and limits — 2026-10-04

The coordinating run applied all 90 migrations on the fresh test DBs; the retained populated S19 upgrade reported no pending migrations and its existing 108-table snapshot preservation run passed. The focused S20 database/API run passed 11 tests across two suites. It covers responsible-person-only report confirmation, retained confirmation snapshots, independent failed/reworked/passed snag verification, separate closure and handover, stale-version and assignment revocation, held/cancelled write denial, client/branch/guessed-ID denials, rollback, and confidential-photo redaction. Controller tests cover internal-session/OwnerReady, client-cookie rejection, no-store reads, origin/CSRF, strict request parsing and all mutation routes.

The S20 API and UI focused build and backend suites were recorded as passed by the coordinating run. The final fresh aggregate `pnpm verify` exited 0: 172 API unit tests, 112 web unit tests, 220 PostgreSQL integration tests across 42 suites, all production builds, and 37 desktop/mobile Playwright cases without skips or retries; typecheck, lint, and migration checks passed. Nine fresh test databases received all 90 migrations. The retained populated S19 upgrade had no pending migrations and its 108-table snapshot preservation passed. Sol inspected final desktop/mobile screenshots and accepted source/schema/permissions/evidence/concurrency. Earlier failed runs remain classified in S20_COMPLETION_REPORT.md.

Project-context intake, boundary, schema, permission and final review routing was assigned to GPT-6.1 Sol; bounded implementation/testing/docs routing was assigned to GPT-6 Luna. This delegated agent cannot access serving-model telemetry and does not claim a specific runtime model or allocation ratio.

The Windows default command sandbox failed before launch with helper_unknown_error: apply deny-read ACLs. Read-only escalated commands succeeded; this environmental workaround did not reset data or alter existing source. Hosted CI, production NAS/backup/key custody/restore and production R-105 evidence remain unverified.

# Agent instructions

Architecture is approved by the Owner at checkpoint 2e46805. S01–S15 and S19 are COMPLETE for development/local staging; authorizations, clarifications and evidence are recorded in the project status documents and slice completion reports. S19 was Owner-authorized on 2026-10-03; S19_SPEC.md and S19_COMPLETION_REPORT.md record settled Owner decisions and final acceptance. S16/S17 accepted source at 6bfd14e is integrated and combined dependency acceptance passed. S20 is COMPLETE for development/local staging on 2026-10-04 under the 2026-10-03 Owner authorization; S20_SPEC.md and S20_COMPLETION_REPORT.md record settled decisions, implemented scope and final evidence. Full pinned pnpm verify exited 0 with 172 API unit, 112 web unit, 220 PostgreSQL integration and 37 desktop/mobile browser tests; all 90 migrations are current and 108 retained original-table snapshots were preserved. A separately identified actual-project R-105 checkpoint remains unverified; local fixture acceptance does not claim production use. S18 authorization conflicts with its separate-branch completion record and remains unresolved; do not start or integrate S18. S21–S27 remain unauthorized. The source of truth is requirements/APPROVED_REQUIREMENTS.md plus approved addenda C-001 through C-024 and subsequent explicit Owner decisions recorded for the authorized slice. The hierarchy is Organization → Branch → Team → Employee with no separate Brand or Department organizational tier. Each project has one owning branch; employees may work across branches only through explicit assignment.

## Source of truth and reading order

Use, in order: current owner instruction; approved requirements and explicit clarifications/addenda; approved architecture decisions; intended architecture; existing implementation; agent assumptions. Report conflicts rather than silently changing requirements.

For a task, read CURRENT_STATE.md and IMPLEMENTATION_STATUS.md, then its entry in MODULE_REGISTRY.md and relevant PRODUCT.md, REQUIREMENTS_TRACE.md, ARCHITECTURE.md, DOMAIN_MODEL.md, DATABASE.md, PERMISSIONS.md, WORKFLOWS.md, FILE_STORAGE.md and TESTING.md. Inspect only the source and callers needed after that. The full approved source is available when wording matters.

## Before changing code

1. Identify the requirement IDs and proposed slice in IMPLEMENTATION_PLAN.md. Expand multi-clause sections to sub-IDs, and state in-scope, out-of-scope, dependencies, acceptance and test plan.
2. Inspect current behavior, callers, tests and data consequences. Ask the owner to decide unspecified behavior that materially affects workflow, ownership, access, approvals, calculations, notifications, audit or destructive actions.
3. Preserve existing work. Never reset production-like data, discard unrelated changes, weaken valid tests/permissions or perform unrelated refactoring.

## Implementation and review

- Prefer small vertical slices with real persistence and backend-enforced rules. Frontend visibility is not authorization.
- For meaningful defects, reproduce, trace root cause, add regression coverage where practical, fix and verify affected behavior.
- Use existing conventions and the cheapest reliable test layer. Review high-risk work for ID tampering, branch leakage, approval bypass, evidence mutation, concurrency and requirement mismatch.
- Record material approved architecture changes in DECISIONS.md. Update context/status after meaningful changes; describe implemented behavior only.
- Classify failing checks before changes. Record unrelated confirmed defects separately.

## Model routing

### Context input and token rule — Owner instruction, 2026-10-01

- Always route project-context intake and interpretation to GPT-6.1 Sol (`gpt-6.1-sol`). This includes understanding Owner instructions, reading requirements/addenda and status documents, resolving conflicts, forming plans, restoring compacted context and preparing implementation handoffs.
- Read the required context in the documented order, then only the relevant sections and source/callers. Avoid repeatedly loading full documents or passing the entire conversation to routine implementation agents. Preserve requirement IDs, approved decisions, scope boundaries, permissions, acceptance criteria and unresolved questions in compact handoffs; never omit necessary context merely to save tokens.
- Keep the approximately 70% Luna / 30% Sol allocation target for bounded implementation work. Context intake always belongs to GPT-6.1 Sol even when the resulting implementation is delegated to Luna; Luna may read the focused files needed to execute its settled brief and must escalate new interpretation or material ambiguity.
- Use the exact `gpt-6.1-sol` model when creating a context-intake agent through a tool that supports model selection. Do not silently substitute another model. If unavailable, report the limitation and leave model-dependent routing unresolved until the Owner directs otherwise.
- This repository rule records the required routing; it does not change the model of an already-running chat or configure the app's model selector. Report actual models used and do not claim GPT-6.1 Sol was used unless it actually ran.

Use Sol-level reasoning for architecture, schema, authentication, authorization, branch isolation, state machines, calculations, offline sync, difficult debugging and security review. Use Luna for routine, well-specified implementation after design. Escalate by reasoning risk, not task size. Model choice does not waive verification.

Apply this routing automatically to future tasks in this project; the Owner does not need to repeat it.

- Keep requirement interpretation, architecture, permissions, schema and migration design, security, difficult debugging, and final acceptance review with Sol-level reasoning.
- When there is a concrete, bounded, well-specified implementation or documentation subtask that can run independently alongside useful work, assign it to a Luna agent. Give it the requirement IDs, slice boundary, acceptance criteria, relevant files or interfaces, and required checks. Review its result against the approved sources before accepting it.
- If Luna encounters an unclear business rule, an access or data consequence, a schema change, or a failed acceptance criterion, resolve the issue with Sol-level reasoning and involve the Owner only when an approved source does not settle a material product choice.
- Report the models actually used. Instructions in this file guide routing but do not change an existing task's model automatically.

## Definition of done and reporting

Mark a slice COMPLETE only when applicable acceptance, schema, backend, API, permission, real persistence, audit/events, UI states, responsive behavior, tests, type check, lint, build and documentation are verified. Unverified work remains IN PROGRESS or BLOCKED. Report actual changes, exact checks, defects, unresolved work and concrete risks. Never claim an unrun check passed.

## Repository commands

- Required tool versions: Node 24.19.0 and pnpm 11.19.0.
- Reproducible dependency setup: pnpm install --frozen-lockfile.
- Generate the Prisma client: pnpm db:generate.
- Apply reviewed migrations to a dedicated test database by setting DATABASE_URL, then running pnpm db:migrate:deploy.
- Run all local quality gates: pnpm verify (typecheck, lint, unit/API tests, production build, and desktop/mobile Playwright checks).
- Inspect/apply the schema workflow with pnpm --filter @sense/api db:validate, db:migrate:status, or db:migrate:dev as appropriate.
- Compose recovery rehearsal: set S01_DB_USER, S01_DB_NAME, S01_DB_PASSWORD, S01_DB_PORT and S01_DATABASE_URL in an untracked environment file, start infra/compose.yaml, then run node scripts/rehearse-backup.mjs.
- Do not claim Compose startup or hosted CI is verified until those environments have actually run successfully.

S01–S15 and S19 are COMPLETE for their authorized development/local-staging scopes; see their completion reports for evidence and limits. S16/S17 accepted source at 6bfd14e is integrated and combined dependency acceptance passed. S20 is COMPLETE for development/local staging on 2026-10-04 under the 2026-10-03 Owner authorization; S20_SPEC.md and S20_COMPLETION_REPORT.md record settled decisions, implemented scope and final evidence. Full pinned pnpm verify exited 0 with 172 API unit, 112 web unit, 220 PostgreSQL integration and 37 desktop/mobile browser tests; all 90 migrations are current and 108 retained original-table snapshots were preserved. A separately identified actual-project R-105 checkpoint remains unverified; local fixture acceptance does not claim production use. S18 authorization conflicts with its separate-branch completion record and remains unresolved; do not start or integrate S18. S21–S27 remain unauthorized. The Windows Playwright managed-server lifecycle caveat remains documented in S01_COMPLETION_REPORT.md; encrypted offsite backup, key custody, production NAS validation and production restore remain production gates.

## Current Owner routing preference

Aim for approximately 70% Luna and 30% Sol task allocation. Sol handles important decisions, schema/permissions, difficult debugging and final review. Luna handles general work within settled boundaries. This is a task allocation target; report actual models used and do not substitute the ratio for verification.


## Historical S17 implementation checkpoint — 2026-10-02

The current Owner instruction supersedes historical S17-unauthorized wording: S17 is COMPLETE for development/local staging. Approved calculations use schedule-derived full/half/hourly minutes, explicit dated person allocations, overnight start dates, expiring carry-first consumption and future-date-only cancellation. No numeric Owner policy defaults are invented. Final completion is supported by actual full gates/preservation/browser evidence and Sol acceptance; see S17_COMPLETION_REPORT.md. S18 and later remain unauthorized.


## Historical S17 final local acceptance — 2026-10-02

S17 is COMPLETE for development/local staging. Final9 pnpm verify exited0:172 API unit,99 web unit,202 real PostgreSQL integration and33 desktop/mobile browser tests; typecheck, lint and builds passed. After the final CSS-only mobile Period correction, affected web gates and both Workforce browser journeys passed; all four refreshed final10 screenshots were independently inspected. All86 migrations are current;112 prior-table and104 legacy snapshots remain unchanged. S16 local completion is confirmed by its original report and the current full regression. See S17_COMPLETION_REPORT.md for exact scope, evidence and limitations. S18 onward remains unauthorized; production NAS/legal/contract/offsite/backup/restore/accounting-provider/hosted CI/deployment gates are not claimed. Actual routing used GPT-6.1 Sol and GPT-6 Luna.

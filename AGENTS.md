# Agent instructions

This project is in initial setup. The owner has not supplied approved product requirements. Do not implement product features, select a technology stack, or infer business rules from the project name.

## Source of truth

Use, in order: the owner's current instruction; approved requirements when supplied; recorded decisions; intended architecture; existing implementation; agent assumptions. Report conflicts instead of silently changing requirements.

## Before changing code

1. Read `CURRENT_STATE.md`, `IMPLEMENTATION_STATUS.md`, and the relevant entry in `MODULE_REGISTRY.md`; consult the domain, database, permission, and architecture documents as needed.
2. Inspect the relevant source, callers, tests, and data consequences. Expand the search only when dependencies require it.
3. State the task's scope, dependencies, acceptance criteria, and verification plan. Ask the owner to decide unspecified behavior that materially affects workflows, access, ownership, approvals, calculations, notifications, audits, or destructive actions.
4. Preserve existing work. Do not reset databases, discard unrelated changes, weaken tests or permissions, or perform unrelated refactoring.

## Implementation and review

- Prefer small vertical slices with real persistence and server-side business rules. Frontend visibility is not authorization.
- For meaningful defects, reproduce, trace the root cause, add a regression test where practical, fix, and verify affected behavior.
- Use existing conventions and the cheapest reliable test layer. Review high-risk work for access bypass, tenant leakage, invalid state transitions, integrity, concurrency, and requirement mismatch.
- Record significant architecture choices in `DECISIONS.md`. Update context files after meaningful changes; describe implemented behavior only.
- Classify failures before changing code. Record unrelated, confirmed defects in `KNOWN_ISSUES.md` without widening task scope automatically.

## Model routing

Use Sol-level reasoning for architecture, schema, authentication, authorization, isolation, complex business logic, difficult debugging, migrations, and ambiguous requirements. Use Luna for routine implementation once architecture is decided. Escalate by reasoning risk, not task size. Model choice does not waive verification.

## Definition of done and reporting

Mark an implementation unit `COMPLETE` only when its applicable acceptance criteria, persistence, authorization, error states, tests, type check, lint, build, and documentation are verified. Mark unverified work `IN PROGRESS` or `BLOCKED` as appropriate. Report what changed, exact verification results, defects, unresolved work, and concrete risks in owner-friendly language. Never claim an unrun check passed.

## Repository commands

There are no application, test, lint, type-check, or build commands yet. Update `TESTING.md` and this section after a stack is selected and tooling exists.

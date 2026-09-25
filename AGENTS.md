# Agent instructions

Initial setup is approved. The product source is requirements/APPROVED_REQUIREMENTS.md. The owner's newer explicit decisions in DECISIONS.md supersede its brand wording: use branches, each project has one owning branch, and employees may work across branches only through explicit assignment. Phase 2 architecture is a proposal. Do not implement product features, install a stack or create migrations until the owner approves the architecture and resolves decisions needed for the slice.

## Source of truth and reading order

Use, in order: current owner instruction; approved requirements plus newer owner decisions; approved architecture decisions; intended architecture; existing implementation; agent assumptions. Report conflicts rather than silently changing requirements.

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

Use Sol-level reasoning for architecture, schema, authentication, authorization, branch isolation, state machines, calculations, offline sync, difficult debugging and security review. Use Luna for routine, well-specified implementation after design. Escalate by reasoning risk, not task size. Model choice does not waive verification.

## Definition of done and reporting

Mark a slice COMPLETE only when applicable acceptance, schema, backend, API, permission, real persistence, audit/events, UI states, responsive behavior, tests, type check, lint, build and documentation are verified. Unverified work remains IN PROGRESS or BLOCKED. Report actual changes, exact checks, defects, unresolved work and concrete risks. Never claim an unrun check passed.

## Repository commands

No application/test/lint/type-check/build commands exist yet. Define and verify exact commands during S01 after architecture approval; record them here and in TESTING.md.

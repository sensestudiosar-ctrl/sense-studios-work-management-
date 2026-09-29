# S08 Templates, stages and milestones

Status: **COMPLETE for development/local staging**. The Owner's instruction to start S08 after S07 completion applies now that S07 is recorded complete at commit `09b5d95`. S09 and later remain unauthorized. Acceptance and evidence are recorded in S08_COMPLETION_REPORT.md.

## Sources and dependencies

Approved requirements sections 14–17, approved addenda C-001–C-024, and the S08 row in IMPLEMENTATION_PLAN.md govern this slice. Dependencies: S03 membership and explicit authorization, S04 canonical audit/outbox, S05 approvals where an owning domain requires them, S06 CRM provenance and S07 project creation/access/lifecycle. Preserve S07 direct/Won creation, baseline scopes and history. Preserve the existing uncommitted passkey error-message edit.

## Expanded requirement IDs

- R-014.a: default Design stage order exactly matches section 14.
- R-014.b: configurable workflow through versioned templates; structural consultants and internal interior delivery do not create new organizational tiers or implicit grants.
- R-015.a: default Turnkey stage order exactly matches section 15, starting with Design Approval.
- R-015.b: operational procurement versus financial processing remains the S19/S25 boundary. Stage names alone confer no cost or procurement authority.
- R-016.c: configured project gates are checked by the backend. Owner or explicitly authorized Team Leader override requires actor, reason, timestamp and audit; override does not bypass identity, assignment, cross-branch access or dependent formal approval rules.
- R-017.a: versioned template delivery type and initial service scopes.
- R-017.b: ordered stages and milestones, with project-specific instances and retained template-version provenance.
- R-017.c: folder structure intent and file naming convention configuration; no physical NAS operation before S11.
- R-017.d: automatic, atomic creation of the currently supported project structure from one selected template version, with retry protection.
- R-017.e: standard tasks, estimates and dependencies require S09/S10. Reviews and client approvals require S13/S14. SOP links require S18; notification producers, reports and automation require their owning slices. No later runtime feature becomes authorized through template configuration.

## In scope and exclusions

In scope: versioned template configuration, management grant, source default sequences, persisted project stages/milestones/folder intent, creation from a recorded version, scoped read UI, authorized stage/milestone commands, configured lifecycle gates and audited permitted overrides. Editing a template cannot silently alter an already created project.

Out of scope: task execution, actual review/client approval evidence, procurement execution, physical folders/files, customer notifications, reports, automation execution, effective cancellation and full employee exit. A stage labelled Client Approval or Cost Approval is a plan item, not proof of a formal decision. Unsupported dependent capabilities must remain visibly unavailable.

## Historical first bounded implementation increment

Introduce pure immutable default Design and Turnkey stage definitions from the approved source, with focused order and mutation-protection tests. They are reference definitions for the later persisted template service. This increment exposes no endpoint and changes no project state, permission, schema or data. It does not constitute a vertical slice or S08 completion.

Sol-level root owns source interpretation, schema/transaction design, authorization, gate semantics and acceptance. Luna handles bounded source-default code and a requirement/dependency review. Root reviews the integrated output.

## Implemented persistence and command design

- ProjectTemplate owns reusable identity; TemplateVersion owns an immutable ordered configuration from creation. Store the applied version on each project and instantiate supported structure as project-owned records. A new version must not rewrite historical applied versions.
- All template and project references must enforce organization consistency. Project visibility follows S07 effective assignment/owning-branch checks; template grants must not create project access.
- Project creation, baseline scopes, stage/milestone/folder-intent instances, applied-version reference, audit and outbox must commit together. Extend the S07 creation service transaction rather than duplicating its Won conversion and baseline guards. Stable request keys plus payload matching must return the prior result on an identical retry and reject conflicting reuse; concurrent retries create one structure.
- Use scoped template-management grants with deny-by-default checks inside the mutation transaction. Version publication and application must serialize against conflicting changes.
- Stage/milestone changes and gate overrides need optimistic versions or row locks and append-only actor/reason/time evidence. No arbitrary client-supplied approval-complete flag.

These persistence/command rules are implemented and verified; see S08_COMPLETION_REPORT.md.

## Owner policy — 2026-09-28

The Owner approved ordinary stage/milestone completion by the assigned Project Lead or explicitly granted staff. All required milestones block project completion unless the Owner or an explicitly granted Team Leader records a reasoned audited override. Current project access and active assignment are prerequisites; a job title alone grants neither completion nor override authority. The implemented commands follow this policy. Organization-granted template managers may create reusable templates/new immutable versions; existing projects retain their applied version.

## Acceptance and checks

1. Reviewed migration applies fresh and upgrades an S07 database while preserving accounts, Won provenance, baseline scopes, assignments, approvals and audit evidence.
2. Immutable applied versions survive template edits; instance ordering and exact applied version are visible after refresh.
3. Atomic creation rolls back on structure/audit failure; identical and concurrent retries create one project and one set of instances, conflicting key reuse is denied.
4. Template grants, project IDs, branch isolation, revoked assignments, session/origin/CSRF and stale versions are enforced server-side. Job titles grant no authority.
5. Stage/milestone changes preserve baseline/evidence. Gate failures block transitions, audited authorized overrides work, unauthorized bypass and fabricated formal approval are denied.
6. UI covers setup/create/detail, empty/loading/denied/conflict/retry and desktop/mobile layouts without exposing unsupported future features.
7. Run Prisma validate/generate, fresh and upgrade migrations, focused unit/API/PostgreSQL/browser coverage, typecheck, lint, builds and final `pnpm verify`. Record actual outcomes; unrun checks remain unverified.

## Verification record

On 2026-09-28, frozen dependency install, Prisma generate/validate/status, fresh 20-migration deployment and an S07 data-preserving upgrade passed. Final pnpm verify exited 0: typecheck, lint, 97 API unit, 47 web unit, 79 API/PostgreSQL tests, production builds and 11 desktop/mobile/identity browser cases. Separate real concurrent-transaction and injected audit-failure rollback checks passed. S08_COMPLETION_REPORT.md records exact environments, corrections, review, model routing and limits. S09 and later remain unauthorized. Hosted CI, Compose and production NAS verification were not run for S08.
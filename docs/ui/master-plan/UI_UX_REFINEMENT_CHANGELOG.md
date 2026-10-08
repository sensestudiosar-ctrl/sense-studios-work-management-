# UI/UX master plan refinement record

Date: 2026-10-05 · Status: **PLAN ONLY**

This record tracks the Owner-requested refinement following approval of the original master strategy as a planning foundation. It does not approve implementation. The detailed original source-fidelity review is retained in `UI_UX_PLAN_REVIEW.md`; that review predates and does not accept this refinement revision.

## Changes made

- Added [Visual Reference & Benchmark Library](VISUAL_REFERENCE_BENCHMARK_LIBRARY.md) with Linear, Asana, Notion, ClickUp, Atlassian Design System and Shopify Polaris as principle references. Seventeen pattern entries document the current problem, references, principle to borrow, principle not to copy, Sense adaptation and applicable roles/workflows.
- Added distinct Gate A (UX Architecture) and Gate B (Visual Design) decisions. Neither approves implementation.
- Added a five-prototype review stop for App Shell, My Work, Project Workspace, Task Detail/Create and Review Workspace, with desktop/mobile states as applicable. Work stops for Owner review; visual propagation and T01 wait for separate explicit authorization.
- Reframed cream/green/serif as one candidate. Gate B must compare retaining, substantially evolving and replacing it. No direction is frozen.
- Split engineering migration, compatibility, rollback, regression and test research into [Engineering Migration & Regression Plan](ENGINEERING_MIGRATION_AND_REGRESSION_PLAN.md). Contract dependencies are separately indexed in [API Gap Register](API_GAP_REGISTER.md). [Documentation Structure](DOCUMENTATION_STRUCTURE.md) maps UX/product vs engineering context loading and identifies proposed post-S27 documents.
- Required unassisted task testing with representative real users. The protocol records hesitation, wrong navigation, misunderstood terms, missed information, unnecessary steps, assistance requests, completion success and serious decision errors. It establishes baseline measures first and sets acceptance targets only after baseline data exists; no percentage improvement is invented here.
- Kept permission/evidence safeguards, CURRENT/PLANNED/PROPOSED distinctions, post-S27 rebaseline, S18 exclusion and STOP condition.
- Updated project status from the latest Owner-provided AGENTS.md: S23 is now reported COMPLETE for local staging; S24–S27 remain unauthorized. The detailed UI evidence audit remains pinned at S22 and makes no claim to have inspected S23's new captures.

## Unresolved Owner decisions

- **Gate A:** final internal/portal information architecture, labels, navigation and role-aware hierarchy after the post-S27 rebaseline.
- **Gate B:** retain, substantially evolve or replace cream/green/serif; choose typography, palette, spacing, density, borders/radius/elevation, icons, tables/forms and motion.
- Final task list/board emphasis and density; mobile primary destinations; project/global document entry and any scope-safe search index.
- Whether a new exact evidence viewer, region annotation or revision comparison belongs in transformation scope or needs separately authorized functional contracts.
- S18 authorization/integration conflict and whether Skills/Learning enters the expected product. This remains excluded unless separately reconciled.
- Evidence and contract gaps G01–G14, to be reclassified against accepted post-S27 source; use safe fallbacks meanwhile.
- The baseline does not yet contain real-user task measurements, so final UX thresholds and any comparison sample requirements remain to be agreed after baseline sessions.

## Recommended next planning action

Continue S24–S27 functional development under its existing Owner authorization rules. Once functional work through S27 is accepted, pin that accepted commit and conduct the planned full visual/persona/state rebaseline, including inspection of the S23 captures. Then prepare Gate A materials and return for Owner architecture review. Gate B follows as a separate decision. After both, build only the five representative prototypes and STOP for Owner review. Do not start T01 or propagate the design system before explicit approval and a separate implementation instruction.

## Verification boundary

No application code, styling, components, API/backend/database behavior, permissions or business rules were modified in this refinement. No tests, servers, migrations, fixture seeds or dependencies were run. Shell-based file/link verification could not start because the execution helper returned `apply deny-read ACLs`; this is a tooling limitation, not an application test result. The prior image/source inspections remain bounded to their recorded evidence and the pinned S22 baseline.

## Owner direction after plan acceptance — 2026-10-05

The Owner accepted this master plan as a planning foundation and froze the UI/UX master planning phase. Do not begin T01–T08, redesign functional screens to match the plan, introduce major visual patterns unless needed for functional delivery, or change backend/business rules for redesign preparation. Continue S24–S27 only through their existing development plan, authorization and normal functional acceptance. Do not regenerate the master plan after each slice; record only factual status changes or newly discovered conflicts that materially affect the future UX plan.

When S27 is functionally complete and accepted, stop functional development and return to the UI/UX process at Gate 0 for a final baseline refresh. Do not advance from Gate 0 to Gate A, Gate B, the representative prototypes, or T01 without the approvals required by the master plan. This Owner instruction does not itself authorize any transformation work.

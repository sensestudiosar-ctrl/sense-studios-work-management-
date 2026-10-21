# My Work visual-first scope

**Date:** 12 October 2026  
**Status:** Owner-settled frontend scope; shared visual foundation implemented, authenticated acceptance pending.

## Reference and intent

Match the existing `/my-work` experience to the exact final prototype at `D:/SCRAP/prototype (2).html`, SHA-256 `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`. Treat the prototype as a visual and interaction reference only; its sample data and simulated role, timer, or submission behavior are not production rules.

This is a visual-parity-first frontend slice. It does not authorize backend, database, migration, authentication, or service execution. Preserve the existing domain contracts and connect only to already-supported authorized behavior. Do not introduce fake controls, simulated persistence, or controls that imply unsupported capabilities.

## In scope

- Frontend styling and layout tokens needed to reproduce the reference: spacing, typography, color, borders, elevation, responsive breakpoints, and shared surface treatments.
- My Work shell and navigation, page header, notification affordance/panel, task controls and filter presentation, and task/attention cards.
- Responsive layout and states for loading, empty, unavailable, and existing real data, using current application conventions and available contracts.
- Reuse existing task and notification reads/actions. Keep notification destinations and task actions bound to existing permission-checked behavior.
- Subsequent Owner direction, “add the same design language throughout the app,” extends the shared palette, typography, shell, surface and control styling across all existing workspace routes and entry/portal surfaces. It supersedes earlier task-only shared-shell styling limits for this frontend work. Domain-specific page structures, authorized actions and data contracts remain in place.

## Preserve existing product rules

- Keep Target mandatory and Committed optional and separate. Omit a “No date” filter or bucket because every task has a Target date.
- Keep canonical task lifecycle states, priority values, and task types. Any display wording must map to those canonical values and must not invent a state or type.
- Preserve one owning Branch per project, task ownership/assignment rules, client review boundaries, and exact immutable revision/evidence references. Do not imply that opening a notice completes its underlying action.
- Preserve current task/evidence visibility and permission enforcement; visual hiding is not authorization.

## Deferred or out of scope

- No backend/API/schema changes, new persistence, authentication/authorization redesign, database or migration run, service startup, or authenticated acceptance run.
- Mixed-team composition and multiple team memberships are deferred for Owner discussion.
- A compound “Needs action” roll-up remains excluded. Owner subsequently approved an uncounted Needs action shortcut exposing separate Decisions, Corrections and Management; top Overdue uses unfinished Target-overdue personal tasks, Reviews counts assigned reviewer inbox rounds, and Waiting / blocked counts only canonical Waiting tasks. See TOP_CARD_ADAPTATION_2026-10-12.md for the temporary date-filter and source-state contract. This frontend mapping supersedes the earlier exclusion of an Overdue card; no backend predicate or lifecycle was changed.
- Private-task behavior and true subtasks are future product decisions. Do not add placeholder switches, fake rows, or controls for them now.
- The prototype’s sample tasks, identities, metrics, local timers, role switching, and simulated actions are not to be copied as real product behavior.

## Private-task handover direction

The Owner directed that private tasks be archived at handover rather than erased. No deletion/purge behavior is authorized. The handover trigger, privacy audience, post-handover access, and retention details remain to be specified in a later backend plan. This direction aligns with approved requirements that approved deletion may remove a record from ordinary operational views while preserving audit evidence (R-006/R-079/R-080/R-092; `APPROVED_REQUIREMENTS.md` §81, around line 2037), employee exit preserves project history (§38, around line 2286), and historical revision evidence is never deleted (§15, around line 921). `FILE_STORAGE.md` also specifies retained superseded revision storage and retention handling. These future details do not block this visual-first slice because no private-task or archive control is in scope.

## Implementation and acceptance boundary

Implement within the existing frontend and current component/data contracts, extending shared visual tokens and shell treatments throughout the app while retaining the bounded My Work presentation changes. Frontend component checks and visual/responsive review may establish presentation quality for inspected states, but cannot establish backend authorization, audit, actual-project behavior, all-module visual acceptance or production readiness. Any future authenticated acceptance requires separate bounded authorization and the existing permission-checked APIs and guarded environment.

Current evidence: `mw-i02/acceptance/evidence/demo-visual-parity-20261012/REPORT.md` and its screenshot gallery. These new images are clearly labelled synthetic read-only component previews, not post-change authenticated acceptance. Existing authenticated results remain preserved.

Requirements context: R-018–R-029, R-096–R-097, C-023 and the existing MW-I02 scope/spec. Source of truth remains `requirements/APPROVED_REQUIREMENTS.md` and applicable approved addenda/Owner decisions. This record does not declare MW-I02 complete or authorize MW-I03.

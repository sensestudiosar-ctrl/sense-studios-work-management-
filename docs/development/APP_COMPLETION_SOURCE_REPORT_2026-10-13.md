# Application completion — source checkpoint, 13 October 2026

Subsequent concurrent boundary: the active `Validate MW-I02 refinements` chat is now implementing the reviewed global queue, filter and Create dialog changes. The415/305 evidence below predates those edits; latest checkout acceptance is pending fresh integration checks. Independent operator preparation continues in `APP_COMPLETION_OPERATOR_CHECKPOINT_2026-10-13.md`; no database/host approval is requested while consolidated readiness is incomplete.

Status: IN PROGRESS. The approved bounded feature source is implemented; actual persistence, migration preservation, concurrent transactions and authenticated acceptance remain unverified. No database connections, migration deployment, fixtures, production action or retained-preview lifecycle operation occurred in this work. Offline `pg_controldata` inspection is metadata evidence only.

## Implemented scope

- Fixed protected-route session loss and delayed response handling for eleven route components. Account-keyed authenticated workspace trees remove the previous actor's private data on account change; same-actor CSRF rotation preserves state. Meaningful regressions reproduced the old account-switch failure before the fix.
- Corrected stale shell/navigation and incomplete API fixtures, including relative seven-day CAD-share expiry. Kept authentication, CSRF, session-race and permission assertions; added expired-share coverage. Fixed shared search/filter SVG sizing using existing design tokens.
- Added optional checked JobRole task-form presentation, reasoned Owner configuration with current-value conflict detection, actor-only setup resolution and generic fallback. Form variants change presentation only; assignment/type/action permissions remain canonical.
- Added immutable scoped subtask links, independent assignment/Target/workflow, authorized relationship projection, a compact marker, versioned creation and parent audit. All three completion paths plus SQL enforce completed children. Explicit dependencies and implicit parent completion edges share cycle checks and project graph serialization. No access inheritance or hidden relationship IDs/counts.
- Added independent exact actionable task/review/approval sources. Approval reads share decision eligibility with commands; view permission alone does not qualify. Source-specific counts, paging, states, deadlines and canonical destinations are integrated in My Work. Waiting-resume authority is not represented as evidence of an external blocker being cleared.

## Verification boundary

Pinned Node 24.19.0/pnpm 11.19.0: API unit 305/54 suites; final web 415/43 files; final typecheck, lint and production build passed. Final web includes the two panel interaction corrections and has no failed tests. Prepared acceptance-tooling and persistence-test source additions require their own matching checks before execution. The build retains existing large-chunk/dynamic-import warnings. Source HTTP tests for the new endpoints passed with database URLs unset; they use mocked persistence and do not establish actual database behavior. Offline acceptance policy tests pass 3/3 and copied fail-closed preflight fixture tests pass 71/71; the one-target source readiness check passes without PostgreSQL connections.

Two final actionable-panel interaction defects were reproduced and corrected: explicit closed selection now closes every source, and card requests apply once per account/source/version instead of overriding later user navigation. Their affected checks passed 101/101 and the final full web run passed 415/415. Later edits still require fresh matching evidence.

Synthetic current-component browser fixtures passed 1440/1024/390/320 layouts for role settings, subtask drawer/create form and actionable sources: stable captured source hashes, no horizontal overflow/page errors, mobile 44px controls, reachable subtask reason/submit. Screenshots/measurements are in `app-completion-evidence-2026-10-13`. They do not prove authenticated shell fidelity or authorization.

## Remaining required work

Finish final interaction corrections and fresh source gates. Prepare and independently review exact identity-bound acceptance adapters/tests before asking for one consolidated live operation. Migration directory tip is 118; retained preview remains accepted at 115 and source109/154 snapshots remain untouched. The acceptance plan records exact proposed targets and fail-closed preservation/cleanup. Commit-time evidence, concurrency, all three completion paths, branch/access isolation, source count parity and actual four-role/four-width behavior require real dedicated-target acceptance.

MW-I02 and the application remain IN PROGRESS. MW-I03 onward retain their Owner acceptance sequencing. Actual operational R-104/R-105 and production NAS/offsite backup/key custody/restore/legal/accounting-provider/deployment/hosted-CI gates are not claimed.

Actual routed models: GPT-6.1 Sol for context, domain/schema/permission/concurrency design and independent review; GPT-6 Luna for bounded backend/form/component/test changes. Required models ran; transient capacity errors were retried without substitution. No 70/30 measured allocation is claimed.

# MW-I01 — shared Work Queue presentation

Owner authorization: 9 October 2026, MW-I01 only. Status: IN PROGRESS.

## Scope and authority

Refine TaskWorkspace queue presentation and mobile controls using existing React/TypeScript/CSS. Preserve all list/cards/board/timeline views, URL filters/selection/history, pagination, creation, task commands, capability checks and source states. Do not modify APIs, backend/schema, permissions or business logic. No unrelated shell/module refactor.

Requirement anchors: S09_SPEC R-018.a–b (primary owner/collaborators), R-019.a–c (assignment/self-creation), R-020.a (types), R-021.a–b (fields), R-022.a–b (priorities), R-023.a (dates), R-024.a–b (states/history). Preserve S10 date/dependency/waiting, S13/S14 review commands, C-011/C-023/C-024, R-006/R-079/R-080/R-092 boundaries.

Owner Q1–Q4 decisions are accepted for dependent work: existing home teams and separately labeled project rosters; Target default and organization calendar with separate Committed; authoritative counts/predicates and distinct person identities; browser-local account-scoped preferences only. These do not authorize MW-I02–08 features in this slice. Formal cross-functional teams remain a long-term requirement; domain decisions still needed include membership lifecycle, designated leadership, project relationships and authorization semantics. No new team entity is inferred.

## Reference lock and implementation brief

Primary target: supplied prototype's latest white Work Queue and Blueprint section20, adapted to the current data contract. Existing Refero ledger SC15 Linear compact rows and SC06 monday list/detail support density/context; approved Sense cream/pine/gold architecture supplies shell/action roles. White row surfaces; semantic status badges/rails; canonical priority text remains separate from lifecycle. No sample data, simplified enums or fabricated indicators.

| Decision | Authority / role |
|---|---|
| Compact white rows, primary task identity first | Owner prototype and MW-I01 instruction; background is neutral, selection uses restrained outline/accent |
| People = explicitly labeled Primary owner only where authorized | Current list/setup data; no collaborator/assigner/reviewer fan-out or guessing |
| LOW/MEDIUM/HIGH/CRITICAL and exact full status text | Canonical contract; semantic colors supplement labels |
| Separate Target and Committed; missing commitment labeled Not committed | R-023 and Owner Q2; no generic due fallback |
| Next Action = Open task | Existing selection behavior; row data does not establish mutation capability |
| Compact mobile controls and progressive filters | Owner mobile requirements; preserve every existing option and command |

Files expected: apps/web/src/task.tsx, task.css and focused task tests. Callers app.tsx451 (legacy),1349 (Tasks listFirst),1371 (personal My Work listFirst) must keep parity; no caller edits planned.

## Acceptance and checks

- Readable desktop row fields and narrow/mobile stacking without horizontal overflow; long labels wrap.
- Existing views, query payloads, filter validation/reset, pagination, detail selection and Back remain operational.
- Supported primary-owner name and honest fallback; no invented collaborators/assigner/reviewer/evidence state or aggregate counts.
- Reassignment warning and every canonical priority/status remain visible; no new transitions.
- Keyboard/native controls, visible focus, single Create entry, touch controls and independent empty/loading/error states preserved.
- Record working tree and fresh test baseline before code edits; capture actual app desktop/mobile before/after.
- Run focused task/MyWork tests, full web unit suite, typecheck, lint and affected production builds. Classify pre-existing failures separately. Actual browser checks across all four views/selection/filter/action forms; do not claim commands persisted unless verified.

Baseline artifacts are under evidence/. Historical PostgreSQL failures are documented in docs/ui/UX_CURRENT_VERIFICATION_2026-10-08.md; no database repair/reset is in scope. New baseline frontend failures must be distinguished from this change. No final application/production acceptance is inferred from earlier S18/S27 gates.

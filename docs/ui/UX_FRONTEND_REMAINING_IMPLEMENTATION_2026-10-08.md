# Remaining frontend presentation implementation — 8 October 2026

Status: **IN PROGRESS — implemented; runtime acceptance pending.** This is the bounded continuation of F-G01–F-G06 in the authorized prototype gap-closure plan. This increment changes frontend presentation only. Concurrent backend and test-file edits belong to separate work and are not evidence for this increment.

## Implemented homes and flows

| Home | Change | Preserved canonical flow |
|---|---|---|
| Tasks / My Work | List, Cards, Kanban and Timeline; Owner access to supported All accessible, Assigned to me, Created by me and Collaborating scopes; search with disclosed secondary filters and sort; retained originating view beside desktop detail; mobile detail with contextual Back. | All views consume the same authorized page and open the same task object. Kanban is a presentation of loaded records; Timeline groups their dates. No drag scheduling or new state command. |
| Project | Overview, Plan, Tasks, Documents, Reviews, Delivery and Activity sections, retained project/directory query context, separate internal/client review entry points. Plan stays mounted when changing sections. | Existing project commands and owning operational workspaces. Delivery/Site follows the current TURNKEY contract; historical wording that offered Site for active DESIGN projects is superseded. |
| Workforce | Separate Leave & WFH, Attendance, Allocation and Schedule & capacity sections; section URL restoration; Owner policy/setup behind disclosures. | Existing self/management scopes, requests, attendance, allocations, history and configured calculations. Allocation remains management-only. |
| Settings | Dedicated Personal account/security, Notifications, Organization and Team sections. Notification panel loads on first selection and retains context. Completed Owner setup updates the parent session. | Existing notification preferences, session actions, passkey/setup/recovery and organization/team commands. Operational Projects/Tasks/CRM/Decisions remain outside dedicated Settings. Legacy workspace remains supported. |
| Project Health | Authorized project directory first; selected project list stays beside detail; per-project factual health bars when a returned scored snapshot supports them; mobile list above detail. | Existing context, health snapshots, policy and delay evidence. Scores are returned evidence, not frontend calculations. Missing/insufficient/failed states remain explicit. |

Filters, scope, project selection and views remain URL/state context. Exact object reads and current capability guards remain authoritative. No new permissions, business rules, schema or API are introduced by these presentation changes.

## Refero evidence used

- [Wrike retained list/detail](https://refero.design/pages/3d3e2910-8459-4f1b-9209-d57cf29d27ed): retained selection beside exact detail for Tasks and Project Health.
- [Fibery grouped settings](https://refero.design/pages/2a0855d1-333d-4cd0-84be-1e4b671e715d): personal/organization navigation and selected pane.
- [Dropbox security settings](https://refero.design/pages/6bb72ede-e9e9-4da2-a2a1-757f29547caa): account/security information placement only.
- [Fingerprint preference flow](https://refero.design/flows/11176): explicit preference action and confirmation placement; Sense Studios categories and commands remain unchanged.
- Existing accepted Linear/Hello Ivy filter research supports compact records and secondary filter disclosure. Existing `UX_REFERO_DESIGN_LOCK_2026-10-08.md` remains the visual source; no new visual direction was selected.

The Refero skill and live MCP were used. References supply layout evidence, not domain workflow rules.

## Acceptance and checks

Actual models: exact **GPT-6.1 Sol** for context/contracts and final source review; **GPT-6 Luna** for bounded Workforce, Settings and Project implementation; primary agent for Tasks and Health composition. No measured allocation percentage is claimed.

Node 24.19.0 and installed workspace tools were used. A later pinned full-gate attempt passed current-tree typecheck, lint, API unit (281/281 across49 suites) and web unit (231/231 across34 files). The independent contracts/API/web production build and PWA generation also passed. PostgreSQL integration still has 10 failing suites/30 tests from reused-database singleton Owner fixture collisions; the aggregate stopped before browser checks. Vite reported existing large-chunk and ineffective dynamic-import warnings. Sandbox workspace resolution required host execution. A pnpm dependency preflight attempted an incompatible package-manager resolution; existing local tool binaries were used instead, without changing dependencies.

Exact GPT-6.1 Sol accepted the final bounded source changes, including the correction that prevents ordinary list reloads from clearing Project selection restored by Back/Forward. This is source acceptance only.

No tests were added or run by this increment. No rendered mobile/browser, authenticated journey, current-tree integration or full prototype parity acceptance is claimed. Other concurrent test edits/runs must be recorded independently.

## Remaining gaps / validation

1. Browser Back/Forward, reload, filtered-list return and selected-detail retention across these homes need current-tree runtime acceptance.
2. Rendered desktop/mobile validation is still required, especially Tasks/My Work detail return, disclosed filters, Settings setup/session changes and Project section history.
3. Exact-object notification routing is incomplete for some originating workflows; available typed IDs must be resolved through owning reads, never inferred from display text.
4. S23 Skills/Training scoring projection needs an approved scoring policy. Factual S18 reporting must not be treated as permission to invent scores.
5. S27 collaborator handoff has no supported participant mutation operation; retain its explicit limitation. Human domain decisions remain authoritative.
6. End-to-end operation/capability parity, including S18/S27 flows, remains open. This report does not replace their accepted slice evidence or extend that evidence to the modified checkout.

No production readiness or actual-project R-104/R-105 acceptance is claimed. Do not mark the whole UI COMPLETE from source checks alone.

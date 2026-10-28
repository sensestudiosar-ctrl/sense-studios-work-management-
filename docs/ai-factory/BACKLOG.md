# Factory Backlog (version-controlled mirror of pre-cutover rows)

**Issue store since 2026-10-27: Linear** — workspace SENSE STUDIOS,
project **Foundation & Infrastructure (`P-SEN-1`)**, team `SEN`. New
factory issues are created in Linear; this file holds the pre-cutover
rows (F-001…F-009, B-###) read-only until migrated (see LINEAR.md §Rules).

**Migration status (2026-10-28):** rows F-002b…F-009 and F-010…F-017 are
created in Linear P-SEN-1 (SEN-5…SEN-20) — live read-back verified; keys
are recorded on each row. F-001/F-002 remain record-only (closed). B-002/B-003
remain record-only blocked items (no Linear issues created).

Statuses: `BACKLOG · READY · IN_PROGRESS · IN_REVIEW · VERIFIED · DONE ·
BLOCKED · PAUSED`. Only `READY` + `approved: yes` + no active hold enters
the autonomous queue. An `owner_approval` field records who authorized
what. Duplicate check: search this file (and Linear when connected) for
the module + problem before adding an issue.

Issue fields: id · module · problem · evidence · severity · priority ·
expected · proposed fix · acceptance criteria · regression test · approval
status · branch/PR · verification results.

---

## READY — approved, low-risk, eligible for the pipeline
_(empty at factory init. The Owner's live instructions seed issues here;
autonomous work only starts from rows below with `approved: yes`.)_

## BACKLOG — discovered, not yet approved
| ID | Module | Problem | Evidence | Severity | Priority | Approved |
|---|---|---|---|---|---|---|
| F-001 | Factory | `CLAUDE.md` "Current branch and tree state" section is stale (claims `codex/s20-site-integration` + 369 changes; live git: `codex/sense-integration` + ~29). | live `git status` 2026-10-27 vs CLAUDE.md text | Low | Low | **YES — owner-approved 2026-10-27** · **VERIFIED-LOCAL**: commit `2aacdd1` on `factory/f-001-claude-md-tree-state` (worktree `.claude/worktrees/f-001`), independent release review APPROVE; Owner chose to keep it local — no push/PR |
| F-002 | My Work | Row density: dot-only status colour (rail + tint removed) + 56/44 rows. **MERGED TO MASTER** — commit `a094ad4` on `factory/f-002-my-work-row-density`, merged `a1e0f28`; 94/94 scoped gates green; independent release review APPROVE. | `docs/design/tasks-tab-review-2026-10-25.md` F1/F6; owner decisions 2026-10-27 (dot-only, 56/44) | Medium | High | **DONE (merged) · Linear: F-002 record-only** |
| F-002b | My Work | **DONE (commit `2731e11`)** — owner→avatar fold: People column renders initials avatar + name via shared `initials()` ("You"→Me, empty/"Task owner"→?), tooltip + aria-label preserved; 35/35 my-work gates. | `tasks-tab-review-2026-10-25.md` F1; `task-people.tsx:39` `initials()` | Medium | Medium | **DONE · Linear: SEN-5 (close when Linear tools available)** |
| F-009 | Docs | **DONE (commit `2c9ae3d`)** — tasks-tab-review doc now carries a shipped-state addendum (F-002 dot-only+56/44, F-002b avatar, F7 already-shipped, open F2/F6 sub-items). Original 2026-10-25 text preserved. | `docs/design/tasks-tab-review-2026-10-25.md` §F1/F6 vs `a094ad4` | Low | Low | **DONE · Linear: SEN-12 (close when Linear tools available)** |
| F-003 | Tasks | **CLOSED — VERIFIED ALREADY SHIPPED, no code change.** "C" opens the create-task dialog (guarded: not in inputs, not when closeout open/unauthorized) landed in `d38e957`; the employee/site variant already self-defaults the owner (`task.tsx` `chosenOwner = options.actorEmployeeId`), test-covered. No global cross-route shortcut by design. | `docs/design/tasks-tab-review-2026-10-25.md` F7; `task.tsx` C-shortcut effect + self-default | Low | Medium | **CLOSED 2026-10-28 · Linear: SEN-6 (close when Linear tools available)** |
| F-004 | Shell | **DONE (commit `3041a26`)** — "Later" on the PWA update banner now persists per tab session (sessionStorage, keyed to the waiting worker's script URL) so it no longer re-pins on reload; a genuinely new build still surfaces. The 401 console lines are browser network-level resource logs, not JS `console.error` — recorded out-of-scope (auth-bootstrap behavior, not this task). | live 59443 inspection 2026-10-27; `apps/web/src/pwa-delivery.tsx` | Medium | Medium | **DONE · Linear: SEN-7 (close when Linear tools available)** |
| F-005 | In-flight | Uncommitted composer/document/project/workforce batch needs matched API+web release before new UI work layers on it. | `docs/development/UX_FINDINGS_PROGRESS_2026-10-27.md` | High | Critical | owner-driven (existing work) · **Linear: SEN-8** (state Todo) |
| F-006 | Insights | **DONE (commit `bc4320a`)** — review view's workflow-facing status displays + Task-controls priority now route through the shared `workState()` helper (title-cased, app-wide convention); submission-snapshot audit values deliberately keep exact recorded values (UX14 "exact in details"). Follow-up: value-specific enums (reviewRequirement, slice codes) need a fixed label map + owner wording review — deferred, not silently mapped. | `docs/design/application-ux-audit-2026-10-25/MASTER_UX_PLAN.md` UX14 | Medium | Medium | **DONE (review-view scope) · Linear: SEN-9 (close when Linear tools available)** |
| F-007 | Navigation | Regroup "Daily" groups + cross-role validation (Phase A/B of the master plan) — requires Owner naming approval + real Leader/employee/Site sessions. | MASTER_UX_PLAN UX01, §11 | High | Low | no (structural) · **Linear: SEN-10** |
| F-008 | Factory | Scheduled autonomous tasks defined but unverified against a real usage-limit event; cloud tool availability unverified. | this file + TOOLS_MCP_READINESS | Medium | Medium | gated · **Linear: SEN-11** |
| F-010 | Projects (T1) | Shell & directory: implement the focused project frame and context-preserving navigation (Branch/search/sort/page URL restoration; deep-link; loading-race fixes). | `docs/ui/PROJECTS_DESIGN_REVIEW_PLAN_2026-10-27.md` §Implementation Tasks T1 (design approved D2) | High | P1 | design approved; implementation not yet authorized · **Linear: SEN-13** |
| F-011 | Projects (T2) | Project creation: move the existing Draft form into the focused create view; exit-path directory-context restoration per Owner decision E6. | plan T2 + §E6 (independent review + owner decision recorded in plan) | High | P1 | design approved; implementation not yet authorized · **Linear: SEN-14** |
| F-012 | Projects (T3) | Project task detail: adapt the canonical task panel for all four views (list/non-list) without My Work regression. | plan T3 (D5) | High | P1 | design approved; implementation not yet authorized · **Linear: SEN-15** |
| F-013 | Projects (T4) | Task views & phone Kanban: one task dataset across List/Cards/Kanban/Timeline; readable canonical lanes; page-only counts; no invented timeline duration. | plan T4 (D8) | High | P1 | design approved; implementation not yet authorized · **Linear: SEN-16** |
| F-014 | Projects (T5) | State feedback: section-local loading/empty/error/partial-access patterns; denial/expiry clears sensitive content; late responses rejected. | plan T5 (D3) | High | P1 | design approved; implementation not yet authorized · **Linear: SEN-17** |
| F-015 | Projects (T6) | Section hierarchy: refine Overview/Plan/People/Documents/Reviews/Delivery/Activity around one primary surface; token/contrast pass. | plan T6 (D6) | Medium | P2 | design approved; implementation not yet authorized · **Linear: SEN-18** |
| F-016 | Projects (T7) | Mobile & accessibility: D7 section picker; 320–1440px, 200% zoom, 44px targets, focus/Escape/restore, reduced motion. | plan T7 (D7/D8) | High | P1 | design approved; implementation not yet authorized · **Linear: SEN-19** |
| F-017 | Projects (T8) | Acceptance: pinned-toolchain checks, Owner/lead/contributor authenticated journeys, permission/persistence regression, visual comparison vs plan; explicit selected-file commit + matched staging release. | plan T8 + companion `docs/ui/PROJECTS_REDESIGN_TEST_PLAN_2026-10-28.md` | High | P1 | blocked on F-010…F-016 · **Linear: SEN-20** |

> **F-010…F-017 (Projects T1–T8):** sequential by design — the tasks share
> `ProjectWorkspace`/`TaskWorkspace` and scoped CSS; run T1→T8 in order
> (E4 approved the single-browser focused spec; no parallelization). Each
> task carries its own verify list from the plan. Linear target when
> connected: project group 5 "Projects & Planning" (P-SEN-5, uncreated);
> migrate these rows to Linear P-SEN-1 or P-SEN-5 and record the issue
> IDs here (never fabricate IDs).

## BLOCKED
| ID | Module | Reason | Unblock condition |
|---|---|---|---|
| B-001 | Linear | **RESOLVED 2026-10-27** — `linear-server` OAuth-authenticated; ✔ Connected. Was: "configured in `.mcp.json` but not authenticated". | OAuth via runbook in LINEAR.md |
| B-002 | MW-I02 stack | 59542/59543 prepared, not started. | Owner grants the one bounded approval under `docs/design/my-work-integration-audit/MW_I02_SEPARATE_PORT_ACCEPTANCE_PLAN_2026-10-14.md` |
| B-003 | Cross-role audit | Only Owner session authenticated in 2026-10-25 audit. | Real Leader/employee/Site/Client personas in a session |

## DONE
_(factory records its own completed work here with the checkpoint id + PR link.)_

---

## Conventions
- IDs: `F-###` factory-discovered, `B-###` blocked, `APP-###` app defects
  discovered by agents (route into the app's OWN defect tracking; this
  file tracks factory + process work only).
- Every READY row carries: issue id, module, problem, reproduction/evidence
  link, severity (Critical/High/Medium/Low), expected behavior, proposed
  fix, acceptance criteria, regression-test requirement, branch/PR,
  verification results.
- Approval is binary per row. An autonomous run never promotes a row to
  READY itself — that is the Owner's call.

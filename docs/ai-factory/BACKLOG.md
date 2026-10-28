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
| F-002b | My Work | **DONE (commit `2731e11`)** — owner→avatar fold: People column renders initials avatar + name via shared `initials()` ("You"→Me, empty/"Task owner"→?), tooltip + aria-label preserved; 35/35 my-work gates. | `tasks-tab-review-2026-10-25.md` F1; `task-people.tsx:39` `initials()` | Medium | Medium | **DONE · Linear SEN-5 closed (Done, read-back verified 2026-10-28)** |
| F-009 | Docs | **DONE (commit `2c9ae3d`)** — tasks-tab-review doc now carries a shipped-state addendum (F-002 dot-only+56/44, F-002b avatar, F7 already-shipped, open F2/F6 sub-items). Original 2026-10-25 text preserved. | `docs/design/tasks-tab-review-2026-10-25.md` §F1/F6 vs `a094ad4` | Low | Low | **DONE · Linear SEN-12 closed (Done 2026-10-28)** |
| F-003 | Tasks | **CLOSED — VERIFIED ALREADY SHIPPED, no code change.** "C" opens the create-task dialog (guarded: not in inputs, not when closeout open/unauthorized) landed in `d38e957`; the employee/site variant already self-defaults the owner (`task.tsx` `chosenOwner = options.actorEmployeeId`), test-covered. No global cross-route shortcut by design. | `docs/design/tasks-tab-review-2026-10-25.md` F7; `task.tsx` C-shortcut effect + self-default | Low | Medium | **CLOSED 2026-10-28 · Linear SEN-6 closed (Done)** |
| F-004 | Shell | **DONE (commit `3041a26`)** — "Later" on the PWA update banner now persists per tab session (sessionStorage, keyed to the waiting worker's script URL) so it no longer re-pins on reload; a genuinely new build still surfaces. The 401 console lines are browser network-level resource logs, not JS `console.error` — recorded out-of-scope (auth-bootstrap behavior, not this task). | live 59443 inspection 2026-10-27; `apps/web/src/pwa-delivery.tsx` | Medium | Medium | **DONE · Linear SEN-7 closed (Done 2026-10-28)** |
| F-005 | In-flight | Composer/document/project/workforce batch: **source work COMPLETE** (all five findings addressed; web regression 717, final affected 65, real Workforce PostgreSQL 19, browser 5 — see `docs/development/UX_FINDINGS_PROGRESS_2026-10-27.md` current-status line + `docs/ui/PROJECTS_REDESIGN_IMPLEMENTATION_2026-10-28.md`). **Remaining: owner-gated matched API+web staging release/promote** — factory does not promote sealed releases. | `docs/development/UX_FINDINGS_PROGRESS_2026-10-27.md` | High | Critical | owner action (release) · **Linear: SEN-8** |
| F-006 | Insights | **DONE (commit `bc4320a`)** — review view's workflow-facing status displays + Task-controls priority now route through the shared `workState()` helper (title-cased, app-wide convention); submission-snapshot audit values deliberately keep exact recorded values (UX14 "exact in details"). Follow-up: value-specific enums (reviewRequirement, slice codes) need a fixed label map + owner wording review — deferred, not silently mapped. | `docs/design/application-ux-audit-2026-10-25/MASTER_UX_PLAN.md` UX14 | Medium | Medium | **DONE (review-view scope) · Linear SEN-9 closed (Done 2026-10-28)** |
| F-007 | Navigation | Regroup "Daily" groups + cross-role validation (Phase A/B of the master plan) — requires Owner naming approval + real Leader/employee/Site sessions. | MASTER_UX_PLAN UX01, §11 | High | Low | no (structural) · **Linear: SEN-10** |
| F-008 | Factory | **PARTIALLY DONE 2026-10-28** — all four scheduler routines are configured and live via `mcp__scheduled-tasks__create_scheduled_task` (durable): `nightly-dev` (23 1), `daily-qa-audit` (41 9), `factory-recovery` (17 12), `weekly-retro` (7 20 Sun), all enabled with next-run times. Remaining, still open: verify against a real usage-limit event; cloud Refero/Playwright/DB availability; first observed scheduler fire. | `SCHEDULES.md` + `list_scheduled_tasks` | Medium | Medium | open (verification) · **Linear: SEN-11** |
| F-010 | Projects (T1) | **DONE** — focused project register/frame + context-preserving navigation shipped by the Projects session: `d90240e feat(projects): add project register and overview brief` + creation/focus fixes `7c6c752`; directory snapshot restoration (branch/search/stage/sort/page) verified in final acceptance. | `docs/ui/PROJECTS_REDESIGN_IMPLEMENTATION_2026-10-28.md` §Changes | High | P1 | **DONE 2026-10-28 (Projects session) · Linear SEN-13 closed (Done 2026-10-28)** |
| F-011 | Projects (T2) | **DONE** — Draft creation moved into the focused create view with E6 exit-path restoration (Owner decision E6, recorded in the plan); Cancel/confirmed-creation restore directory context, dirty/pending exits guarded. | impl doc §Changes "Create project opens a focused view…" | High | P1 | **DONE 2026-10-28 · Linear SEN-14 closed (Done 2026-10-28)** |
| F-012 | Projects (T3) | **DONE** — project task detail uses the native dialog drawer from all four views (List/Cards/Kanban/Timeline); drawer focus/Escape/modal isolation reused; My Work keeps its default drawer styling; final opener-focus correction `2525206`. | impl doc §Changes; final acceptance "All four task views…native modal/focus" | High | P1 | **DONE 2026-10-28 · Linear SEN-15 closed (Done 2026-10-28)** |
| F-013 | Projects (T4) | **DONE** — single Kanban status column on phones; all 13 canonical statuses available, counts explicitly page-limited; desktop boards scroll in-workspace; no invented timeline duration. | impl doc §Changes "Phones use a labelled…" + acceptance "phone section/status selectors including all13 states" | High | P1 | **DONE 2026-10-28 · Linear SEN-16 closed (Done 2026-10-28)** |
| F-014 | Projects (T5) | **DONE** — section-local loading/empty/error patterns with retained project context ("section-local failures retain project context"); denial/expiry content clearing covered by document.test + project-resources.test in the final 65-test regression. | impl doc "Original reported findings" table | High | P1 | **DONE 2026-10-28 · Linear SEN-17 closed (Done 2026-10-28)** |
| F-015 | Projects (T6) | **DONE** — section hierarchy: eight project-scoped panels consolidated under one "Project queues" disclosure (`b87764e`) + Overview brief (`d90240e`); token/contrast pass covered by scoped lint/build. | `git log b87764e, d90240e` | Medium | P2 | **DONE 2026-10-28 · Linear SEN-18 closed (Done 2026-10-28)** |
| F-016 | Projects (T7) | **DONE** — mobile section picker + viewport overflow checks at 320/390/768/1024/1440, 44px targets, focus/Escape/restore all in the final browser fixture run; 200% zoom + assistive-tech acceptance remain in F-017's open tail. | impl doc final acceptance "320/390/768/1024/1440px overflow checks" | High | P1 | **DONE 2026-10-28 (zoom/AT tail → F-017) · Linear SEN-19 closed (Done 2026-10-28)** |
| F-017 | Projects (T8) | **IN PROGRESS (bounded acceptance done; open tail)** — isolated-fixture acceptance COMPLETE (web regression 717, affected 65, Workforce PG 19, browser 5, typecheck/lint/build exit 0; independent Codex source review passed, P2 command-focus defect fixed in `2525206`). Still open: authenticated full-shell/zoom/assistive-tech journeys, visual comparison vs the plan's updated sketch, and the **owner-gated matched staging release** (CURRENT_STATE: "Authenticated…acceptance remains IN PROGRESS"). | `docs/ui/PROJECTS_REDESIGN_IMPLEMENTATION_2026-10-28.md` "Final reviewed acceptance — authoritative" + `CURRENT_STATE.md` top entry | High | P1 | open (acceptance tail + staging release = Owner) · **Linear: SEN-20** |

> **F-010…F-016 (Projects T1–T7) are DONE** — implemented and merged to
> master by the Projects session (commits `22b7552`, `c610612`, `7c6c752`,
> `b87764e`, `d90240e`, final selected-source `2525206`), with bounded
> isolated-fixture acceptance. Do not re-implement. Linear close-batch for
> SEN-13…SEN-19 ready when tools reachable.

## BLOCKED
| ID | Module | Reason | Unblock condition |
|---|---|---|---|
| B-001 | Linear | **RESOLVED 2026-10-27** — `linear-server` OAuth-authenticated; ✔ Connected. Was: "configured in `.mcp.json` but not authenticated". | OAuth via runbook in LINEAR.md |
| B-002 | MW-I02 stack | 59542/59543 prepared, not started. | Owner grants the one bounded approval under `docs/design/my-work-integration-audit/MW_I02_SEPARATE_PORT_ACCEPTANCE_PLAN_2026-10-14.md` |
| B-003 | Cross-role audit | Only Owner session authenticated in 2026-10-25 audit. | Real Leader/employee/Site/Client personas in a session |

## DONE
| ID | Result | Evidence |
|---|---|---|
| F-001 | Merged to master | commit `2aacdd1` (in master via consolidation) |
| F-002 | Merged to master | commit `a094ad4`, merge `a1e0f28`; 94/94 scoped gates; independent review APPROVE |
| F-002b | Committed to master | commit `2731e11`; 35/35 my-work+task-people gates; Linear SEN-5 close-ready |
| F-003 | Closed as verified-already-shipped | C-shortcut in `d38e957` + composer self-default in `task.tsx` (both test-covered); no code change; 97/97 task-suite gates re-verified |
| F-004 | Committed to master | commit `3041a26`; full web suite 733/733; 401 browser-network lines recorded out-of-scope |
| F-006 | Committed to master | commit `bc4320a`; 14/14 review+revision gates; value-enum follow-up deferred |
| F-009 | Committed to master | commit `2c9ae3d` (shipped-state addendum to the 2026-10-25 review) |
| F-008 | **Scheduling configured** | 4 durable routines live: `nightly-dev` 01:31, `daily-qa-audit` 09:50, `factory-recovery` 12:21, `weekly-retro` Sun 20:07 (first observed fires still pending) |
| F-010…F-016 (T1–T7) | Merged to master by the Projects session | commits `22b7552`…`d90240e` + final selected-source `2525206`; bounded isolated-fixture acceptance in `docs/ui/PROJECTS_REDESIGN_IMPLEMENTATION_2026-10-28.md` |

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

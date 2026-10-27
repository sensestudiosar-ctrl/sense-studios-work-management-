# Factory Backlog (version-controlled fallback; mirrors Linear when connected)

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
| F-002 | My Work | Row density: dot-only status colour (rail + tint removed) + 56/44 rows. **Implemented & independently reviewed (APPROVE)** — commit `a094ad4` on `factory/f-002-my-work-row-density`, checkpoint `f-002-implement` → **AWAITING_APPROVAL**; 94/94 scoped gates green; PR body staged `pr-f-002-body.md` (push+PR is Owner). | `docs/design/tasks-tab-review-2026-10-25.md` F1/F6; owner decisions 2026-10-27 (dot-only, 56/44) | Medium | High | **YES — owner-approved 2026-10-27 ("run F-002 next" + design Q&A)** |
| F-002b | My Work | Fold primary owner into an avatar (initials) with name tooltip, replacing the text People column. Needs the shared `initials` primitive + edge cases ("You", "Task owner", emails). Deferred from F-002. | `tasks-tab-review-2026-10-25.md` F1; `task-people.tsx:39` `initials()` | Medium | Medium | no |
| F-009 | Docs | `tasks-tab-review` / demo-parity docs still pin 65/50 + rail for the demo; F-002's dot-only + 56/44 is a deliberate owner-directed departure. Sync the review doc's target so code and doc don't drift (reviewer follow-up #1). | `docs/design/tasks-tab-review-2026-10-25.md` §F1/F6 vs `a094ad4` | Low | Low | no |
| F-003 | Tasks | No global "New task" keyboard shortcut; employee variant doesn't default owner to self. | `docs/design/tasks-tab-review-2026-10-25.md` F7; grep of `app.tsx`/`dashboard.tsx` 2026-10-27 | Low | Medium | no |
| F-004 | Shell | PWA "A new version is ready" banner pins over anonymous surfaces; two 401 session-poll console errors pre-auth. | live 59443 inspection 2026-10-27; `apps/web/src/pwa-delivery.tsx:68` | Medium | Medium | no |
| F-005 | In-flight | Uncommitted composer/document/project/workforce batch needs matched API+web release before new UI work layers on it. | `docs/development/UX_FINDINGS_PROGRESS_2026-10-27.md` | High | Critical | owner-driven (existing work) |
| F-006 | Insights | Technical labels (slice codes, UUIDs, underscore statuses) shown in user-facing review/document/library views. | `docs/design/application-ux-audit-2026-10-25/MASTER_UX_PLAN.md` UX14 | Medium | Medium | no |
| F-007 | Navigation | Regroup "Daily" groups + cross-role validation (Phase A/B of the master plan) — requires Owner naming approval + real Leader/employee/Site sessions. | MASTER_UX_PLAN UX01, §11 | High | Low | no (structural) |
| F-008 | Factory | Scheduled autonomous tasks defined but unverified against a real usage-limit event; cloud tool availability unverified. | this file + TOOLS_MCP_READINESS | Medium | Medium | gated |

## BLOCKED
| ID | Module | Reason | Unblock condition |
|---|---|---|---|
| B-001 | Linear | Configured in `.mcp.json` (http, mcp.linear.app) but **not authenticated**; account/auth required from Owner (runbook in LINEAR.md §"How to connect"). | Owner completes OAuth via `/mcp` or adds a Bearer API key + verifies in a fresh session |
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

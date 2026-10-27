# AI Factory Final Setup Report — 2026-10-27

Superseding consolidation correction: the original self-test did not exercise competing workers. Its duplicate-trigger and concurrency claims are withdrawn. The bounded replacement uses stable worker ownership, serialized local JSON updates and actual subprocess tests; see RECOVERY.md. Live execution JSON records remain local/ignored and privately preserved. No scheduler has been activated.

Structured per the Owner's Part 16 (A–G). Every claim traces to evidence
in this directory or a command run in-session.

## A. Application status

- **Canonical repository & branch:** `D:\app\sensestudios work management app`,
  `codex/sense-integration` (remotes `origin`
  vijaychintala05/WORK-MANAGEMENT-APP-sense-studios + `new`).
- **Frontend/backend identity:** `apps/web` @sense/web (Vite; .tsx
  source → committed .js twins), `apps/api` @sense/api (NestJS + Prisma),
  PostgreSQL on 45434. Toolchain Node 24.19.0 / pnpm 11.19.0 (pinned,
  matching).
- **Running test environment:** sealed release 59443 (web) / 59442 (API)
  serving commit **7f286689**, schema 120 — live-verified. Hot loop 5180
  available on demand. MW-I02 stack 59542/59543 prepared, **not started**
  (Owner-gated, B-002).
- **Implementation holds (active, unchanged):** production/NAS/
  operational R-104/R-105 gates; retained migration/seed/reset
  prohibitions; client-password migration 120 excluded; ArchiFlow
  excluded. Factory does not lift any of these.
- **Known architecture risks (carried, not new):** stale `CLAUDE.md`
  tree-state section (F-001, spec ready); concurrent session activity on
  the main checkout (live VERSION-DRIFT observed this session: HEAD
  fd1697f→05108bf); untracked scratch artifacts at repo root (L-005);
  legacy 320px overflow known issue still open; demo-parity acceptance
  boundary (484-file fingerprint) — later edits are outside it.

## B. Factory status

| Component | State |
|---|---|
| Factory rulebook (FACTORY.md) | Created, committed-to-working-tree |
| Canonical application map | Created; live-drift annotations added post-creation |
| 8 specialist agents | Created in `.claude/agents/`; **host does NOT auto-register them as `Agent` subagent types in this session** — documented workaround (spawn `general-purpose` + inline the agent file) in CHANGELOG_FACTORY |
| Reusable skills | `ui-ux-pro-max` + `opus-sonnet-cost-routing` verified installed |
| Design-system reference | DESIGN_RULES.md (references lock + non-negotiables) |
| Linear | **Not connected** — version-controlled BACKLOG.md fallback active |
| Test & CI procedures | `pnpm verify` documented; factory checkpoints gate on scoped gates; CI `s01-quality.yml` unchanged |
| Automation (schedules) | **BLOCKED** — both `create_scheduled_task` and `CronCreate` denied by session permission policy; registry + prompts ready in SCHEDULES.md |
| Recovery/checkpoint mechanism | `scripts/factory/checkpoint.mjs` + RECOVERY.md; local subprocess regression suite; see the superseding correction in RECOVERY.md |
| Self-improvement system | RCA.md taxonomy, METRICS.md baseline, LESSONS.md (5 seeded), factory-improver agent, "evaluate before adopt" rule; CHANGELOG_FACTORY history |
| Security/approval policy | FACTORY.md §3 table + per-agent tool grants (read-only auditors/guardians) |
| Troubleshooting/rollback runbooks | RECOVERY.md + per-PR rollback-note requirement (release-reviewer) |
| Factory health report | HEALTH.md (updated this session) |

## C. Review results

See [REVIEW_CYCLES_2026-10-27.md](REVIEW_CYCLES_2026-10-27.md):
R1 PASS (with live drift finding logged) · R2 PASS with 2 BLOCKED
sub-items (agent auto-discovery, Linear) · R3 PASS (pilot) · R4 PASS
(mechanism) / BLOCKED (scheduler) / NOT-TESTED (real usage-limit
event) · R5 PASS. No cycle is claimed beyond its evidence.

## D. Automation readiness (explicit classes)

- **Fully configured and tested:** checkpoint/recovery engine
  (self-tested), agent definitions + pipeline docs, backlog fallback,
  lessons/metrics/RCA systems, design rules.
- **Configured but not yet tested:** the four scheduled routines
  (registry written; a scheduler tool has not accepted one).
- **Requires my authentication/authorization:** scheduler tool
  permission (create_scheduled_task / CronCreate), Linear account +
  MCP OAuth, cross-role authenticated sessions (B-003), MW-I02 bounded
  approval (B-002).
- **Requires a paid service:** none new (Refero Bearer already
  provisioned; factory will not purchase anything).
- **Blocked by environment limitations:** custom `.claude/agents/`
  not surfaced as `Agent` subagent types in this session's host
  build; cloud scheduled sessions have no verified Refero/Playwright/DB
  access.
- **Not implemented:** cloud runner, GitHub-triggered PR-verification
  bot (no repo secrets/webhooks configured), real usage-limit recovery
  observation (needs a live event).

## E. Required human actions (prioritized)

1. **Approve a scheduler tool** (permission rule for
   `mcp__scheduled-tasks__create_scheduled_task` — or tell me to use
   `CronCreate`-style in-session scheduling) and I will register the
   four routines from SCHEDULES.md. *Without this, unattended
   operation is impossible by policy, not by design.*
2. **Authenticate Linear** (create workspace/team + MCP OAuth at
   mcp.linear.app) — otherwise BACKLOG.md remains the store.
3. **Approve F-001** (docs-only CLAUDE.md tree-state fix; spec ready in
   pilot-spec-F-001.md) or strike it from the backlog — the first
   pipeline item waiting on you.
4. **Release the in-flight composer/workforce batch** (F-005) as a
   matched API+web pair — other UI work layers on it.
5. **Provide cross-role sessions** (Leader/employee/Site/Client) when
   available, to unblock B-003 and Tier-3 navigation work.
6. **MW-I02 separate-port approval** when the acceptance stack is next
   needed (B-002, existing bounded-approval doc).

## F. First autonomous task (recommended)

**F-001 (CLAUDE.md tree-state correction)** as soon as approved —
docs-only, zero product-behavior change, zero backend, verifiable in
seconds, and it removes the single biggest boot-trap in the repo for
every future agent session. After that, the pipeline's first
*implementation* task should be **F-002 (My Work row density,
presentation-only)** — highest scanability win, one-file scope,
presentation-only contract already documented, tests scoped to
`my-work-parity` suites.

## G. Next operating state

**Ready for supervised pilot** — NOT ready for unattended development,
NOT ready for release review of app code. The factory mechanism
(discover → spec → implement → test → independent review → draft PR →
checkpoint/lesson) is built, self-tested, and pilot-run to
SPECIFY→BLOCKED. What keeps it out of "approved unattended
development" is precisely two permission-blocked items (scheduler
authorization, Linear auth) plus host agent-discovery. None of those
were bypassed.


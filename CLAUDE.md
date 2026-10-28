# CLAUDE.md — entrypoint for Claude Code

This is a NestJS API + React/Vite monorepo for a work-management app. The
full agent rules live in [AGENTS.md](./AGENTS.md); read it first and
treat its rules as binding. This file only adds what Claude Code
specifically needs to know.

## Read in this order before doing anything

1. [AGENTS.md](./AGENTS.md) — agent rules, model routing, source-of-truth
   hierarchy, definition of done.
2. [CURRENT_STATE.md](./CURRENT_STATE.md) — most recent status; entries
   are reverse-chronological, read the top one(s) first.
3. [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) — what's in
   progress and what's COMPLETE.
4. [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) — planned slices.
5. [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) — accumulated defects.
6. `requirements/APPROVED_REQUIREMENTS.md` plus addenda C-001…C-024.
7. The relevant slice's `*_SPEC.md`, `*_COMPLETION_REPORT.md`, and
   entries in `MODULE_REGISTRY.md`, `DOMAIN_MODEL.md`, `DATABASE.md`,
   `PERMISSIONS.md`, `TESTING.md` — only after the above, and only the
   sections that match the task.

## Toolchain (pinned)

- Node 24.19.0
- pnpm 11.19.0
- Prisma + PostgreSQL

Reproduce dependencies with `pnpm install --frozen-lockfile`. Generate
the Prisma client with `pnpm db:generate`. Run all local quality gates
with `pnpm verify`.

## Current branch and tree state

- Owner authorized one consolidated `master` on 2026-10-27. Read the live branch, HEAD and dirty state with `git status`; do not rely on historical counts.
- This is a NestJS API, React/Vite frontend and shared-contracts monorepo.
- Source contains 120 migrations. The 120th is accepted task-review work routing `20261023000000_task_review_work_routing`. The unaccepted client-password migration and ArchiFlow remain excluded.
- Retained staging is separate from current source and from disposable acceptance databases. See the latest CURRENT_STATE.md entry and `docs/operations/BRANCH_CONSOLIDATION_2026-10-27.md` for exact verified commits. Never migrate, seed or reset retained data automatically.
- Historical branches and alternative work remain recoverable through archived refs and merge ancestry. New application work starts from master.
- The original integration checkout may retain concurrent uncommitted changes; preserve them and inspect live state before any operation.

## Servers — three, don't confuse them

PostgreSQL is on port **45434** (system `7693570241708228348`).

**Retained preview — LIVE, and the primary environment.** Web on
`http://localhost:59443/`, API on 59442. Serves the original retained
preview database: 115 migrations, 50 exact tasks, 5 ACTIVE staff
personas, Owner credentials and recovery catalog intact. This is the
environment the S18/S27 acceptance evidence refers to. Staff personas
activate in a separate Chromium; Owner signs in normally. Do not reseed.
Note the older 59223/59224 pair is blocked by a Windows port exclusion
and is superseded by 59443.

**MW-I02 acceptance stack — PREPARED, NOT STARTED.** API **59542** /
web **59543**. The Owner chose these ports to preserve the existing
preview, and every active harness and target assertion now requires
them; older manifests are preserved. Read-only checks found the pair
free and unexcluded, but **no PostgreSQL startup, disposable database
setup, authenticated run or cleanup was executed** — authorized live
checks must repeat the port check. Starting it needs one fresh bounded
approval under
`docs/design/my-work-integration-audit/MW_I02_SEPARATE_PORT_ACCEPTANCE_PLAN_2026-10-14.md`.

**Fresh isolated test database** — `sense_app_completion_20261013_ac13_test`,
all 118 migrations applied, starts empty. Distinct from the preview;
see the migration bullets above.

For all three: any restart, reseed, migration or lifecycle operation
requires explicit Owner approval. Do not log Owner in through the
test-only controller.

## Hot dev loop — what is built is visible immediately (added 2026-10-26)

The 59443 preview is a sealed, commit-based release: it only shows working-tree
changes after an Owner-gated rebuild + promote. To view working-tree changes
*immediately, without rebuilding every time*, use the hot loop:

**Key fact:** the `apps/web` module graph imports **physical `.js` twins**
(e.g. `app.tsx` → `./task.js`); Vite serves the `.js`, not the `.tsx`. The
twins are generated artifacts kept in git; `.tsx` is the source of truth.
`scripts/dev-js-twin-watcher.mjs` re-emits a `.js` twin on every `.tsx` save,
so HMR reflects the edit within a second.

```bash
# 1) Dev server with HMR, API proxied to the running sealed API (59442, retained preview DB)
cd apps/web && API_PROXY_TARGET='http://localhost:59442' node node_modules/vite/bin/vite.js --port 5180 --strictPort
# -> http://localhost:5180  (sign-in works through the 59442 API; no commit required)

# 2) Twin watcher (run alongside the dev server)
node scripts/dev-js-twin-watcher.mjs
```

Rules of the hot loop:

- **5180 is the working-tree view.** 59443 remains the S18/S27 acceptance
  surface and stays Owner-gated as before; "live immediately" means 5180, not 59443.
- **Sealed releases are unaffected.** `scripts/staging/build.mjs` still builds
  from a committed revision (`git archive <commit>`), never from the working
  directory; this loop does not change that.
- **Stale twin?** Re-emit one file byte-faithfully with:
  `node node_modules/typescript/lib/tsc.js apps/web/src/<f>.tsx --outDir <tmp> --jsx react-jsx --target es2022 --module esnext --moduleResolution bundler --esModuleInterop --skipLibCheck --noEmit false`,
  then copy the emitted `<f>.js` back over `apps/web/src/<f>.js`.
  (Flag set verified byte-identical against `src/task-people.js`.)
- **API note:** the proxy points at the *sealed* 59442 API. If you change
  `apps/api`, the hot loop will not show it — run a separate dev API and point
  `API_PROXY_TARGET` there.
- Tests/typecheck/lint must pass in the `.tsx` **and** keep the committed
  `.js` twins in sync (watcher does this on save; run it before committing).

## Latest gate evidence (frozen source `752761cb`, 2026-10-14)

Reported by the MW-I02 separate-port preparation: API **359/57 suites**
and frontend **453/45 files** PASS, with typecheck, lint and build PASS;
800 readiness checks, 86 native safety cases, 57 authorization/manifest
cases and 30 API target-guard cases PASS. A 32-capture synthetic gallery
covers 1440×900, 1024×900, 390×844 and 320×740 with no errors or
overflow.

These are source and synthetic checks, **not authenticated acceptance**.
Candidate Functional Reliability and Prototype Visual Fidelity remain
**BLOCKED** pending the bounded approval above. One known issue carries
forward: mixed attention at 320px still requires ~173px of scroll, and
full-shell comparison remains open.

## Acceptance boundary

S18 and bounded S27 acceptance apply to the 484-file fingerprint in
`.env.s27-tools/final-current-1791435060-tree.json`. Later concurrent
edits to `apps/web/src/review.tsx` / `review.css` (2026-10-08) are
outside that acceptance — treat post-fingerprint changes there as
unverified by the S18/S27 run.

## node_modules — already recovered on the host (2026-10-14)

**`node_modules` in this checkout is healthy.** It was recovered natively
on the Windows host on 2026-10-14. The authoritative record is
`docs/development/DEPENDENCY_RECOVERY_2026-10-14.md` — read it before
touching dependencies.

Recovery used `pnpm install --frozen-lockfile --offline --ignore-scripts`
with pinned Node 24.19.0 / pnpm 11.19.0: **1072 packages reused, 0
downloads, lockfile SHA256 unchanged.** The four previous dependency
directories are preserved under
`.env.checkpoint-tools/dependency-recovery-20261014/previous/`.

Verified after recovery (exit 0):

- API unit tests — 355/355 tests, 57/57 suites
- Web unit tests — 428/428 tests, 44/44 files
- Repository typecheck, including Prisma client generation
- Repository lint
- Production contracts / API / web build

Those are the recovery-run numbers. Later MW-I02 preparation on frozen
source `752761cb` reported API 359/57 suites and frontend 453/45 files
PASS — see "Latest gate evidence" above for the newer figures and their
limits. Prefer the newest numbers for current source; the recovery
figures are kept because they are what the recovery report actually ran.

**These are source checks only.** They are not full `pnpm verify`, and
they do not certify real persistence, migrations, server startup, or
authenticated acceptance. Application / MW-I02 remain IN PROGRESS.

### Do not use the local repair utilities

`scripts/repair-*.mjs`, `scripts/fix-node-modules.mjs` and
`scripts/index-store.mjs` are gitignored local tools from an earlier
sandbox session. Per the recovery report, they **"select package
directories by name without preserving lockfile versions and peer
contexts"** and their repaired-link count **"is not evidence of a correct
dependency graph."** They were not used in the recovery. **Do not use
them to reconstruct this checkout's dependencies.** If dependencies are
broken, run the frozen offline install on a real host.

### In a sandboxed Linux VM mount

The pnpm `.pnpm` symlink store may appear broken, with `EIO` on
`readlink` and `ls -L` failing against `node_modules/*`. This is a mount
artifact, not a real dependency fault — the Windows cause was NTFS
reparse tag `0xa000001d` (Linux symlink) which native Windows Node could
not realpath. Do not hand-repair links to work around it, and do not
report a dependency failure from that observation. Run the frozen
offline install on a real host instead.

Note also that this VM has Node 22.23.2 and no `pnpm`, against a pinned
Node 24.19.0 / pnpm 11.19.0. **`pnpm verify` cannot be run here.** Any
test or gate result from a sandbox session must name what actually
executed and what could not.

## When the Owner returns

1. Read the top entry of `CURRENT_STATE.md`.
2. Identify the slice in question; pull its `*_SPEC.md`,
   `*_COMPLETION_REPORT.md`, and `MODULE_REGISTRY.md` entry.
3. Bounded, well-specified work → route to a Sonnet agent per AGENTS.md
   § Model routing. Architecture, schema, auth/permissions, branch
   isolation, state machines, calculations, security review, or final
   acceptance → Opus-level reasoning.
4. Never claim a check passed that wasn't run in this session.

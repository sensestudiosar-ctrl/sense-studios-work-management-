# Linear import payload — factory task list

**Purpose:** create the factory backlog as real Linear issues, one batch,
the moment `linear-server` MCP is connected in a session. This is a
READY payload, not a claim that any issue was created. **No Linear issue
IDs are fabricated here** — verify against the live server after import.

**Target (from LINEAR.md, checked 2026-10-27):**
- Workspace: `SENSE STUDIOS` · Team key: `SEN`
- Project: `P-SEN-1` (Foundation & Infrastructure) — the only project
  created so far. Projects-module tasks below are parked in `P-SEN-1`
  with a `module` label until `Projects & Planning` (P-SEN-5) exists;
  re-file them when that project is created.

**Priority mapping (Linear 0–3):** 0 Urgent · 1 High · 2 Medium ·
3 Low. **State:** `Backlog` (unapproved/gated) · `Todo` (approved,
ready) · `Done` (record only).

## How to execute (the one step that unblocks this)
In a session where `linear-server` is connected (run
`claude mcp add --transport http linear-server https://mcp.linear.app/mcp`,
complete the OAuth via `claude mcp`, then start a fresh session so the
tools load), run these `create_issue` calls (or the GraphQL batch
below) against team `SEN`, project `P-SEN-1`. Then record the returned
issue IDs in `BACKLOG.md` and mark the pre-cutover rows migrated.

GraphQL batch (Linear cloud endpoint), paste the `ids`/`issues` you get
back into the ledger:

```graphql
mutation {
  # one create_issue per row below; teamKey "SEN", project "P-SEN-1",
  # state "Backlog" unless noted. See each block for fields.
}
```

---

## Open factory work (create now)

### F-002b — My Work: owner → avatar fold
- team SEN · project P-SEN-1 · **priority 2 (Med)** · state **Backlog**
- label `module:my-work`
- Problem: the People column is a text string; fold the primary owner
  into an initials avatar with the name as tooltip, reusing the shared
  `initials()` primitive.
- Source: `docs/design/tasks-tab-review-2026-10-25.md` F1;
  `apps/web/src/task-people.tsx:39` `initials()`.
- Acceptance: avatar renders for owner; "You"/"Task owner"/email edge
  cases handled; accessible value preserved; desktop + phone 390/320.

### F-003 — Tasks: global "New task" shortcut + employee self-default
- team SEN · project P-SEN-1 · **priority 2 (Med)** · state **Backlog**
- label `module:tasks`
- No global keyboard shortcut opens the composer; employee/site
  variants don't default the owner to self (2-field happy path).
- Source: tasks-tab-review F7; grep of `app.tsx`/`dashboard.tsx`.
- Acceptance: shortcut opens composer (and the exact key is reviewed);
  employee variant defaults owner=self; no permission change.

### F-004 — Shell: PWA update banner + pre-auth 401 console errors
- team SEN · project P-SEN-1 · **priority 2 (Med)** · state **Backlog**
- label `module:shell`
- "A new version is ready" banner pins over anonymous surfaces; two
  401 session-poll errors log pre-auth.
- Source: live 59443 inspection; `apps/web/src/pwa-delivery.tsx:68`.
- Acceptance: banner deferred/dismissible post-login; pre-auth 401s
  suppressed; no PWA/offline regression.

### F-005 — Matched API+web release of the in-flight batch
- team SEN · project P-SEN-1 · **priority 1 (High)** · state **Todo**
  (owner-driven existing work) · label `module:in-flight`
- The uncommitted composer/document/project/workforce batch must ship as
  a matched API+web pair before new UI layers on it.
- Source: `docs/development/UX_FINDINGS_PROGRESS_2026-10-27.md`.
- Acceptance: matched-pair staging release, schema ledger verified,
  retained data unchanged.

### F-006 — Insights: human labels for technical values
- team SEN · project P-SEN-1 · **priority 2 (Med)** · state **Backlog**
- label `module:insights`
- User-facing review/document/library views expose slice codes, UUIDs,
  underscore statuses; humanize labels, keep exact IDs in details.
- Source: MASTER_UX_PLAN UX14.
- Acceptance: human names from existing fields only; exact values kept
  in a details disclosure.

### F-007 — Navigation: regroup "Daily" groups + cross-role validation
- team SEN · project P-SEN-1 · **priority 3 (Low)** · state **Backlog**
- label `module:navigation`
- Structural master-plan Phase A/B; needs Owner naming approval + real
  Leader/employee/Site sessions.
- Source: MASTER_UX_PLAN UX01 §11.
- Acceptance: tree-tested homes, all routes retained, 320–1440.

### F-008 — Factory: scheduler + cloud-tool verification
- team SEN · project P-SEN-1 · **priority 2 (Med)** · state **Backlog**
- (gated) Autonomous schedules defined but unverified against a real
  usage-limit event; cloud Refero/Playwright/DB access unverified.
- Source: `SCHEDULES.md`, `TOOLS_MCP_READINESS.md`.
- Acceptance: one observed scheduled fire + one observed limit-recovery;
  cloud availability documented.

### F-009 — Docs: sync tasks-tab-review target to the F-002 departure
- team SEN · project P-SEN-1 · **priority 3 (Low)** · state **Backlog**
- label `module:docs`
- The review doc still pins 65/50 + rail for the demo; F-002's
  dot-only + 56/44 is a deliberate owner-directed departure.
- Source: tasks-tab-review §F1/F6 vs commit `a094ad4`.
- Acceptance: doc target matches shipped CSS; no code change.

## Projects workspace design review (T1–T8) — added on Owner request
Sequential by design (shared ProjectWorkspace/TaskWorkspace + scoped
CSS); run in order. Route to P-SEN-1 now; move to `Projects & Planning`
when that project is created. All label `module:projects`.

### F-010 (T1) — Projects shell & directory (P1)
- **priority 1 (High)** · state **Backlog**
- Focused project frame + context-preserving navigation (Branch/
  search/sort/page URL restoration, deep-link, loading-race fixes).
- Files: `project.tsx`, `project.css`, `project-directory.tsx/.css`,
  `projects-route.tsx`. Verify: directory/URL-restore/deep-link/
  loading-race/task-context tests; Back/Forward across branch/search/page.

### F-011 (T2) — Project creation focused view (P1)
- **priority 1 (High)** · state **Backlog**
- Move existing Draft form into the focused create view; exit-path
  directory-context restoration per Owner decision E6 (shared-branch
  retained, restored on every exit path).
- Files: `project.tsx/.css`, `project-relationships.tsx`,
  `project-template.tsx`. Verify: creation flow, template/client/
  Won-lead constraints, Cancel/draft guards, duplicate submission,
  uncertain command + confirmed-create/read-failure recovery.

### F-012 (T3) — Project task detail across all views (P1)
- **priority 1 (High)** · state **Backlog**
- Adapt the canonical task panel for list + non-list views without
  My Work regression.
- Files: `task.tsx`, `task-detail-drawer.tsx/.css`, `task.css`.
  Verify: open/close + Back/Forward from all views, exact identity,
  dirty/pending guards, all commands, no My Work regression.

### F-013 (T4) — Task views & phone Kanban (P1)
- **priority 1 (High)** · state **Backlog**
- One task dataset across List/Cards/Kanban/Timeline; readable
  canonical lanes; page-only counts; no invented timeline duration.
- Files: `task.tsx`, `task.css`. Verify: same filters/scope/page across
  all four views; every state available; selected phone status survives
  detail.

### F-014 (T5) — State feedback (P1)
- **priority 1 (High)** · state **Backlog**
- Section-local loading/empty/error/partial-access; denial/expiry
  clears sensitive content; late responses rejected.
- Files: `project.tsx`, `project-resources.tsx`,
  `confirmed-drawings.tsx`. Verify: isolation of resource failure,
  retry retains context, no duplicate writes.

### F-015 (T6) — Section hierarchy (P2)
- **priority 2 (Med)** · state **Backlog**
- Refine Overview/Plan/People/Documents/Reviews/Delivery/Activity
  around one primary surface; token/contrast pass.
- Files: `project.tsx/.css`, `project-directory.css`,
  `project-resources.tsx`. Verify: actions/fields still discoverable,
  canonical evidence/round links, lead/contributor independence.

### F-016 (T7) — Mobile & accessibility (P1)
- **priority 1 (High)** · state **Backlog**
- D7 section picker; 320/390/768/1024/1440, landscape, 200% zoom,
  44px targets, focus/Escape/restore, reduced motion.
- Files: Project/Task components + scoped CSS. Verify: all listed
  viewports + zoom + reduced-motion + overflow.

### F-017 (T8) — Acceptance (P1, blocked on F-010…F-016)
- **priority 1 (High)** · state **Backlog**
- Pinned-toolchain checks, Owner/lead/contributor authenticated
  journeys, permission/persistence regression, visual comparison vs
  plan; commit explicit selected files; deploy a matched staging
  candidate.
- Companion: `docs/ui/PROJECTS_REDESIGN_TEST_PLAN_2026-10-28.md`.

## Blocked / unblock-condition items (record, don't start)
- **B-002** MW-I02 stack (59542/59543 prepared, not started) — priority
  3 · Backlog · unblock: Owner's one bounded approval.
- **B-003** cross-role audit (only Owner session in 2026-10-25 audit) —
  priority 3 · Backlog · unblock: real Leader/employee/Site/Client
  sessions.

## Closed this cycle (record only — do NOT create as open issues)
- **F-001** CLAUDE.md tree-state fix — merged to master (`2aacdd1`).
- **F-002** My Work row density (dot-only + 56/44) — merged to master
  (`a094ad4` / merge `a1e0f28`), 94/94 gates, independent review APPROVE.

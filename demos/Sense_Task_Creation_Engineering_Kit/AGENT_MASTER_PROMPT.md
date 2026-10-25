# AGENT EXECUTION PROMPT — SENSE STUDIOS TASK CREATION (V15-RC1)

You are the senior frontend/integration engineer working inside the **existing Sense Studios work-management monorepo**. Your assignment is to **implement the approved task creation UX with extremely high visual and interaction fidelity to the attached V15 production-candidate HTML**, while preserving the existing backend, security, domain rules, uncommitted work, app shell, and project/task lifecycle. Implement the work, not just a design proposal. Do not make a duplicate application or deploy an outdated branch.

## Inputs: read them in this order

1. `README_START_HERE.md` — package contents, source-of-truth hierarchy and conditions.
2. `reference/sense_task_creation_production_candidate.html` — **approved visual + interaction reference**, run locally in a browser; synthetic/mock UI, **not** network-connected production source.
3. `reference/screenshots/` — desktop and phone golden references, avatar search and reviewer sequence.
4. `reference/source_handoffs/original_repository_handoff.txt` — repo-specific API and file locations originally extracted from the application (dated 2026-10-23; re-verify because source may have advanced).
5. `reference/source_handoffs/production_candidate_handoff.md` and `reference/source_handoffs/production_candidate_qa.md` — compatibility, prior prototype QA and outstanding release gates.
6. `docs/01_UI_UX_REQUIREMENTS.md`, `docs/02_API_DOMAIN_AND_STATE_CONTRACT.md`, `docs/03_IMPLEMENTATION_PLAN.md`, `docs/04_ACCEPTANCE_TEST_MATRIX.md`, `docs/05_RELEASE_DECISIONS.md`.

## Non-negotiable execution rules

- **Exactly one canonical frontend and backend.** Modify the existing components and canonical route, not a separate React application, microfrontend, static HTML embed, parallel API, legacy test server, or new versioned clone. The finished UX must be reachable from every existing entry point (My Work, Tasks, Project Tasks, Add Subtask).
- **Preserve existing backend semantics.** Inspect current code and tests before coding. Do not change a strict API contract, role authorization, Prisma schema, tenant/branch scope, review workflow, timeline, idempotency or project lifecycle to fit the demo. Any proposed extension is a separately gated decision and PR/plan.
- **Never modify or reset retained real/staging data**, run migrations/seeds against retained instances, or deploy automatically. Test database persistence only with a disposable isolated database. Never overwrite unrelated changes, especially in-progress dashboard-context-panel or Time work.
- **Use the actual authenticated `/api/v1` services** when integrating. Never use demo names, demo UUIDs, or mock permissions in production builds. Read participants from authorized creation options, not from the global employee table or inferred job titles.
- **Do not silently fake persistence.** Reviewer names and recurring frequency from the prototype are not fields of the currently documented strict `POST /tasks` body. If repository inspection finds no approved backend support, production must hide/disable them behind named feature flags and clearly say why; meanwhile implement supported `reviewRequirement` and type `RECURRING` only as permitted. Deliver a separate backend extension plan for those two capabilities rather than claiming the demo UI saved them.
- **Preserve pixel/interaction design**, but DO NOT port the prototype's fake dashboard, dark role/state simulation toolbar, demo diagnostics, synthetic people/projects, local fake API, or simulation buttons into production.
- Aim for **>=90% visual similarity** of the task creation panel (not the surrounding app shell), assessed from side-by-side viewport-matched screenshots at identical zoom, data and font conditions. This is a practical review target, not an unverified performance claim. Check alignment, spacing, avatar row, typography, right properties column, mobile ordering, inline expansion, overlays and footer.
- Before final sign-off, provide actual evidence: screenshots, changed-file manifest, API trace/payload evidence, test execution output, limitations, and exact current commit and staging commit. Never report tests as run when they were not.

## Step 0 — locate the canonical version before any editing

1. Locate the actual repository root, current working branch, newest approved integration branch and running app instance. Record `git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse HEAD`, `git status --short`, package scripts, process/port ownership and staging branch/commit if visible. Establish that `http://localhost:59443` points to **that** code, not an older server (this URL was canonical in the original handoff; re-verify).
2. Inventory any alternative `task-create*` implementations and legacy server processes. **Do not delete or force-reset them**; identify canonical owner and routing, report conflicts, and implement only in the approved source tree.
3. Inspect present functionality and existing tests for creation, participants, review routing, capacity conflicts and subtask transaction receipts. This handoff reflects a 2026-10-23 checkout, not immutable truth.
4. If worktree has unrelated modifications, preserve them. Use a narrowly scoped feature branch or worktree with the latest required changes integrated. Do not choose an old checkout just because it already starts clean.

## Step 1 — exact visual and behavior implementation

Rebuild the *experience* of the provided HTML using the app's **existing React 19/TypeScript/Vite UI code** and shared components. Keep the sense pine/paper appearance. No new framework solely for this task.

**Desktop**: Programa-like editing canvas on the left and narrower softly tinted properties area on the right. Direct-edit large task title; description just beneath; natural-language reason; simple inline subtasks and checklist; discreet file/discussion affordances; slim properties with Task Type, project, horizontal Assign to avatars, Start and Target on the same row, Estimated effort below, selected-colour Priority control, Review routing and tags. Sticky actions; no extra large headings or duplicate navigation. At 1440×768 the essential task fields and Create action should be visible without form scrolling under typical content, while overflow remains scrollable for expanded details.

**Mobile**: Single column, direct entry order **Task name → Description → Assign to → Target date → Reason → More task settings**, compact spacing, full-width sticky Create, touch-accessible edit controls; all other fields (type/project/start/effort/priority/review/recurrence) remain discoverable in the existing inline settings area. No horizontal overflow at 320/390 CSS pixels and no soft-keyboard trapping. Do not move Description beneath settings.

**Assign to**: One horizontal row of circular profile photos if authorized real photos exist, otherwise initials. Add `+` immediately after last avatar. Show main assignee clearly as first avatar. Directly below `+`, an inline searchable eligible-person list with selected indicators. Maintain ordered assignment: first = existing primary owner `ownerEmployeeId`; the rest = eligible distinct `collaborators[]` (max 30). Reordering by drag on desktop and accessible promotion/move controls on touch/keyboard; visual indicator for new primary; optional effort per collaborator in avatar detail. Never change selected primary silently on refresh.

**Reviews**: Existing `NONE`, `INTERNAL`, `BOTH` route selector; `NONE` neutral, colour only chosen states. Conditional settings expand **in the same panel**, never a new modal. For `BOTH` show `Internal → Client` sequence. Preserve internal-before-client, authority checks, routing immutability. Named reviewer controls only work when a verified backend contract exists, else clearly gate. The Review section must not disappear mysteriously; in personal/nonproject contexts explain any unavailability.

**Recurring**: Task Type dropdown remains. On selecting `RECURRING`, display inline frequency/interval/weekday options only if approved persisted scheduling capability exists; otherwise make the unsupported condition evident and avoid implying saving. Do not invent a schedule builder in the create payload.

**Inline content**: Subtasks look like Programa, with small +, direct text editing, Enter-to-add, reorder, keyboard alternative and count. Keep subtask create separate from parent POST and advance `expectedParentVersion` correctly. Checklist looks almost the same visually but uses checkboxes and is an array on the parent record. Tags stay visible with chips and `+ Add tag`, not in a dropdown; maximums enforced. Files and Discussion look visually related to Programa but use post-create upload/comment APIs only, with independent progress/errors, not fields of parent create command.

**Dates / effort**: readable local date `DD Mon YYYY` with in-panel calendar and Today/Tomorrow shortcuts, stored `YYYY-MM-DD`; start <= target, do not establish a new future-only target-date policy; no unasked automatic date fill. Estimated effort `h` is an optional numeric value, not a time log. Blank is distinct from 0.

**Response states**: protect drafts; loading, denied, no eligible people, stale context, validation, capacity warning/acknowledgement, sending, uncertain outcome result check, success, partial child/file failure with isolated retry. Focus first error and expose errors inside collapsed fields. An uncertain result must retry/check the **same body and idempotency key**, not submit a newly generated one. Backend still decides all authorization. See docs for exact response matrix.

## Step 2 — integrate without parallel state/persistence

Prefer these established files, after checking that they still exist:

- `apps/web/src/task.tsx` — existing draft, commands, status, idempotency/receipt, capacity recovery, success selection; **one source of truth**.
- `apps/web/src/task-create-dialog.tsx` — lifecycle, focus containment, Escape, unsaved close, sticky footer, keyboard shortcut, portal/drawer.
- `apps/web/src/task-create-dialog.css` — V15 responsive styling within existing shell.
- `apps/web/src/task-composer-fields.tsx` — field UI; type/priority/project/assignees, date popover, reason, sections, tags/checklist/subtask.
- `apps/web/src/task-creation-options.ts` — authorized option read and stale-response handling.
- `packages/contracts/src/task-creation.ts` — **reuse** participant contract; don't change unless already approved.
- Backend controller/service stay intact for UI-only work.

Reuse existing hooks/state rather than adding another global store or second task creation route. Respect `credentials: 'include'`, `cache: 'no-store'` on context reads, same-origin cookie auth, current `X-CSRF-Token` flow for POST. Real project scope/role authority comes from server response. A state mapper may be added if necessary, but must be contained and typed and must not duplicate source of truth.

**Network payload**: only schema-supported keys, including the supported idempotency and overload acknowledgement fields. Parent and each subtask must have separate command identity. Unknown outcome locks submitted body until resolved. Do not put file blobs, comments, reviewer IDs or arbitrary recurrence fields into strict parent payload.

## Step 3 — test, compare, correct, repeat

1. First test the *approved reference* in `reference/sense_task_creation_production_candidate.html` locally to understand its interactions. Compare candidate screenshot to the same feature in actual app at 1440×768, 1024×768, 783×768, 390×844, 320×700 and 320×650. Keep application header/shell excluded from panel-only comparison. Repeat CSS/behavior corrections until no major differences are visible and no clipping/overflow exists.
2. Run repo-native lint, typecheck, unit tests, build, relevant API tests and authenticated Playwright flows using scripts actually found in package.json. Test personal, project, fixed project, subtask, Owner/Leader/Employee/Site presentations and creation eligibility. Follow `docs/04_ACCEPTANCE_TEST_MATRIX.md`.
3. Test real server results in an **isolated** environment: changed project invalidates prior assignee; eligible cross-branch rules; real permission denial; 409 overload explicit ack; timeout/5xx uncertain replay identity; parent created followed by child failure; post-create file/comment separate. Never claim a static mock as a successful integration test.
4. Test keyboard focus and screen readers NVDA, VoiceOver and TalkBack (manual gates; record results). Test physical narrow phone and zoom/soft keyboard. Preserve focus return to trigger and unsaved guard.
5. Collect feedback from actual staff on three paths: personal task, project task with multiple assignees, internal + client review. Record confusion/errors and differences from approved design.

## Step 4 — expected delivery from the agent

Provide: (a) existing repo files changed with rationale, (b) proof there is **one** canonical create component and API, (c) staging route and commit hash, (d) before/after screenshots at all target widths, (e) visual discrepancy log and fixes, (f) valid example request payload trace with any sensitive values redacted, (g) actual commands and results for every test suite, (h) feature-gate status of named reviewers/repeat schedule and security draft persistence, (i) known blockers and unverified work, (j) rollback instructions, and (k) deployment recommendation **without deploying or migrating unless explicitly authorized**.

**Definition of done:** The real app routes open the V15-matching single composer; authorized users can create a task with actual API persistence; validation, permission and recovery are correct; responsive/accessibility checks and tests are satisfied; no backend logic or unrelated work has regressed. If an API extension is required for named reviewers or recurrence schedule, mark it separately instead of misrepresenting the scope as complete.

Proceed with coding in the current authorized checkout after verifying repository state. Do not ask for confirmation at every step. Request explicit approval only before a genuinely consequential change such as migrations, backend contract alteration, live deployment or destructive data action.

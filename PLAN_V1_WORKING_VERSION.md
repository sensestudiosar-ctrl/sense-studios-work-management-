# Plan — Working Version 1 (revised 2026-10-15)

**Date:** 2026-10-15
**Status:** READY FOR BOUNDED IMPLEMENTATION — incorporates the Owner's source-grounded review and direction. Two-agent split (§8) is live; Slice C access audit starts immediately; shared code (§9) goes through the integration owner. No further plan rewrite needed before implementation begins. Pilot acceptance remains open.
**Branch:** `codex/s20-site-integration`

**Agent1 progress (16October):** Assigned D/G/E and H on owned screens are implemented and locally verified4/4. Technical acceptance review found no blocking defect; Owner approved Codex final acceptance on16October2026. Agent1 local development acceptance is COMPLETE (4/4); joint staff-pilot acceptance remains open. Current candidate:610files/119migrations, SHA-256 `8cab4afa39fb8350004f1d43f38576fb9f57267be3bf10bc9938d1ae9c7c6abf`. Final approved isolated acceptance passed2/2real Project database cases and5/5browser/bounded-query cases at1440/1024/390/320,60states/120PNGimages, no unexpected server errors. Final directory read:103projects,50returned,11SQLqueries/34ms. API450/63suites, frontend568/57files and root typecheck/lint/build passed within the exact boundaries in the acceptance report; the final CSS-only minimum-height correction additionally passed its own web build and four-width real browser matrix. Both approved targets are stopped, data/evidence preserved; shutdown ports59749/59751/59752/59753 refused connections. Migration119 remains unapplied to retained previews/production. No whole-V1 staff-pilot or production acceptance. Other-agent ownership and stopped MW-I02 remain unchanged. See `docs/development/V1_AGENT1_ACCEPTANCE_REVIEW_2026-10-16.md`.
**Relationship to the main plan:** This document is **subordinate**. It contributes compatible refinements to the active V1 delivery plan (V1-00 … V1-08). It does not replace that plan, does not restart implemented work, and does not introduce a second People / task / permission system.

---

## 1. Correction of the earlier draft

The earlier draft was written from a partial reading and contained stale and
overreaching claims. Those are corrected here, and each correction is marked
with what the source actually shows. Nothing below repeats a claim the source
does not support.

| Earlier claim | What the source shows | Correction |
|---|---|---|
| Staff can read the employee directory and role inventory | `apps/api/src/organization.controller.ts` guards `@Get("employees")`, `@Get("branches")`, `@Get("teams")`, `@Get("roles")` with `await this.owner(request)`. Staff has only session-bound `@Get("self")` and the independently authorized `@Get("team/employees")` reporting read, which requires `account.kind === "STAFF"` | **Slice A revised.** Owner gets the directory; Staff gets self + reporting descendants. A broader Staff directory or role-permission inventory needs a separately bounded read and privacy decision. The Owner endpoints are **not** loosened |
| `useCapabilities()` derives flags from job-role permissions already in the session | The session response does not issue the full job-role permission set | **Slice C revised.** Presentation profiles (`OWNER`/`STAFF` account kinds, `EMPLOYEE`/`LEADER`/`SITE` variants) are **presentation, not authorization**. Capability gating follows the server's existing evaluator, reporting scope, project membership and resource state. No new client-side authority |
| Backend saved views are settled, and no slice needs a schema change | `apps/web/src/my-work-saved-views.ts` implements account-scoped **browser-local** views, retained by the October 13 reviewed plan. No task saved-view persistence model or API exists | **Slice F revised.** Keep the existing local views. Cross-device persistence is an explicit **proposal** requiring a reviewed storage contract — it is not schema-free and is not settled |
| Real subtasks are absent; checklist is the only option | `apps/api/prisma/migrations/20261008020000_task_subtasks` exists; schema has `TaskSubtaskLink` with `parentTaskId`/`childTaskId`, `@@index([organizationId, parentTaskId, childTaskId])`, and `apps/api/src/task.controller.ts` has `@Get(":id/subtasks")` and `@Post(":id/subtasks")` with `expectedParentVersion` | **Out-of-scope entry corrected.** One-level same-project subtasks are Owner-approved and already implemented. They are verification work, not new work. Checklists remain a separate feature |
| Client sends `creationVariant` for audit | `task.controller.ts` create body has no such property and uses `.strict()`, so it would be rejected | **Slice D revised.** Do not send a client-asserted variant. The variant stays a layout/defaults hint. Any audit provenance is derived server-side under a reviewed contract |
| Capacity "after adding the estimate" is an existing calculation | `task.tsx` has an overload **acknowledgement** flow (`overloadPrompt`, `acknowledgeOverload`); estimates do not automatically become dated allocations | **Slice D revised.** Preserve the existing acknowledgement transaction check. A numeric projected-capacity pre-check needs authorized inputs, dates, units and distribution rules — not an invented formula |
| SITE variant identifies an active site and narrows task types | No source contract identifies a single active site from the variant, and no task-type restriction exists | **Slice D revised.** Preselect only an explicitly selected, currently accessible project/site context; use honest selection or unavailable states otherwise. Task types stay as supported |
| This host is Node 22 with no pnpm; 115 migrations; 184 uncommitted changes | Node **24.19.0**, pnpm **11.19.0**, **118** migration directories | **Environment corrected.** The stale host and migration numbers are removed |
| `pnpm --filter @sense/api test -- <specs>` | The missing command was the **package-level `test` script**; per-spec tests are supported through `test:unit` or `test:integration` | **Gate commands corrected** to the real pinned scripts |

---

## 2. What is retained from the earlier draft

These remain correct and are carried forward:

- Backend authorization stays authoritative; navigation is a presentation of current access.
- Owning services are reused for all writes; reasoned, versioned commands and canonical workflows are preserved.
- Unrelated work, retained data and the exact-source acceptance boundary are preserved.
- Search improvements, explicit filters, bounded project rows, notification discovery and Settings navigation are worthwhile.
- Pagination/count agreement, responsive layouts and honest loading/error/denied states are required.
- Production deployment stays separate, and the stopped MW-I02 run boundary stays preserved.

---

## 3. Environment and boundaries (corrected)

| Fact | Verified value |
|---|---|
| Node | 24.19.0 |
| pnpm | 11.19.0 |
| Migration directories in source | **118** (`ls` includes `migration_lock.toml` in the count; 118 are actual migration directories including `20261008020000_task_subtasks`) |
| Root test scripts | `test:unit`, `test:integration`, `test`, `test:e2e`, `verify` |
| `pnpm verify` scope | typecheck + lint + unit + integration + build + Playwright e2e |
| Description limit (contracts + API + form) | `TASK_DESCRIPTION_MAX_LENGTH = 2000` — **all three now agree** |
| Description schema column | `String? @db.VarChar(2000)` |

**Boundaries that bind this plan:**

1. **The V1 goal is an internal pilot with real staff.** Production is a separate milestone.
2. **The 484-file S18/S27 fingerprint no longer describes the tree.** Once these refinements land, any acceptance statement must name the new source state, not that fingerprint.
3. **No schema change is assumed.** The subtask migration already exists; anything further requires an explicit Owner decision.
4. **The retained preview, the MW-I02 prepared stack and the isolated test database are not touched.** No reseed, migration, or reset.
5. **Never claim a check passed that was not run in this session.**
6. **Full `pnpm verify` was not run while preparing this revision.** The authoritative pilot plan states it must run on the accepted harness; `pnpm verify` includes database integration and Playwright.

---

## 4. Revised slices — compatible refinements to the active V1 work

Each slice below states which V1 package it serves and what it must **not** do.

### Slice A — People directory (serves V1-03)

**Access is the controlling constraint.**

- **Owner** sees the permitted employee inventory and onboarding state, using the existing authorized `GET /org/employees`.
- **Staff** sees self (`GET /org/self`) and reporting descendants (`GET /org/team/employees`) only. Reporting descendants require `org.employee.read`, active membership, and existing branch/team restrictions.
- **A company-wide Staff directory is out of scope** — it is a separate access decision, not a default.
- Person detail separates identity/enrollment, home branch/team, reporting manager, job roles, effective access and project assignments. **No second privileged editor**: editing reuses the existing person editor.
- Onboarding chain is shown honestly: invitation → accepted identity/passkey → employee/home membership → explicit roles/grants → explicit project assignment → usable My Work. **A partially configured account is never shown as ready.**
- Suspension, exit and reassignment stay separate named actions with reasons and impact information. **Suspension is never presented as exit.**
- Names: the schema has email and employee code. A stored display name is a **proposal** requiring an explicit schema decision; until then, keep the honest legacy fallback and do not invent email-derived names.

**Definition of done:** Owner onboards one pilot employee through ordinary UI; a scoped manager cannot edit a peer or another branch; exited people retain history; exit revokes access while preserving task/project consequences.

### Slice B — Focused Settings panels (serves V1-04)

- Separate **personal** (Account & devices, Notifications) from **Owner configuration** (Organization, Branches & teams, Job roles & access, Task/workflow configuration, operational status).
- People links to the dedicated People area rather than duplicating its editor.
- **Do not hide all integrations and reports merely because the account is STAFF.** Integration setup supports active internal Staff; automation supports scoped Staff `report.manage` and project `automation.manage`. Owner-only configuration summaries are fine, but label **view versus manage** and preserve authorized Staff entry points.
- Each panel needs a current value, local draft, Save/Cancel, field errors, pending/success, conflict handling, and required reason/fresh sign-in. A reauthentication must **preserve the safe draft**.
- Show the actual setting version; do not invent `expectedVersion` on a command that uses another concurrency contract.
- Operational configuration shows configured/unconfigured/failed honestly. No editable provider secrets, no unsupported defaults.
- **Recovery and Save/Cancel behaviour come before cosmetic summaries.** An Integrations/Automation summary panel is a refinement, not a prerequisite.

### Slice C — Access control (serves V1-01) — highest risk, Opus-level review

- **Inventory first.** Enumerate the real guards, permission keys from callers and tests, their scopes and workflow conditions. Do not add checks blindly — blind additions break valid workflows.
- **Presentation profiles never grant assignment.** A presentation hint must not create an assignment or erase a valid explicit grant. Actual assignment comes from current grants, reporting scope, project membership and resource state.
- **Reuse the existing evaluator and `GET /tasks/creation-options`.** Do not build a second authorization system.
- Free-text `permissionKey` entry becomes a **source-derived, validated catalogue** with readable action/scope labels. The catalogue read is already implemented in the first authorized batch. **Preserve unknown historical grants for review; do not silently delete them.**
- Navigation capability reads need **loading / unavailable / revocation** semantics and resource scope. Revocation must remove access immediately.
- **Additive only:** every change adds checks. No existing check is loosened.
- Optional Owner/scoped-manager **effective-access explanation** read model, if existing responses cannot supply it: target, resource context, effective result, matching allowed rule/deny, expiry, missing membership. It must call the existing evaluator and reveal only what the operator may manage. A preview of an access change stays a proposal until the real command succeeds.
- A **Project Lead does not gain** Owner-only employee, project-assignment or lead-appointment powers.

**Definition of done:** role names and presentation profiles grant nothing; task management, deadline control, review, file access and personnel management stay distinct; forged IDs, direct URLs, counts/pickers/exports/streams, cross-branch assignment, explicit denies, expiry, logout/revocation and actor switching all behave correctly with negative tests.

### Slice D — Task creation (serves V1-05)

- **One shared composer and command adapter** from My Work, Tasks, Project Tasks and permitted parent-task detail. This already exists as `TaskCreateDialog` + `TaskComposerFields` (`apps/web/src/task-create-dialog.tsx`, `apps/web/src/task-composer-fields.tsx`); the work is to finish and verify it, not rebuild it.
- Always collect: task name, one **Primary owner**, Priority, Type, Target date, and the currently required reason. Essentials first; progressive optional planning.
- **Project context is preserved** when launched from a project. Personal creation defaults to self **only when a real employee identity exists**; an employee-less Owner chooses an eligible employee.
- Use authorized, context-valid project/employee/plan-item choices. `GET /api/v1/tasks/creation-options` (already implemented) supplies scoped assignment options and project-specific eligibility. **A picker never grants project access.**
- Clear incompatible stage/participant values when context changes.
- **Capacity:** preserve the existing overload acknowledgement. A numeric projected-capacity pre-check is a **proposal** needing authorized inputs, dates, units, allocation/distribution rules and revalidation. Never replace acknowledgement with a dismissible UI warning.
- **Ambiguous create outcomes** must resolve without encouraging blind duplicate submission. Bounded durable create idempotency is a **reviewed backend change** using existing receipt conventions — not a demo promise.
- Validation is already aligned at 2,000 for description across contracts, API and form. Verify boundary coverage and the tag/checklist limits (tags ≤ 10 × ≤ 30 chars; checklist ≤ 10 × ≤ 120 chars).

**Definition of done:** a created task persists once, appears in its intended Project and permitted personal views, updates relevant totals, and opens by its returned canonical ID. A manager assigning someone else does **not** falsely add the task to the manager's personal-owned queue.

### Slice E — My Work filters and search (serves V1-06)

- Priority, collaborator and reviewer filters, plus extended search, are **useful but bounded**: they follow an approved query contract first. Do not make unsupported controls visible.
- Define explicitly: **all/any** semantics, option visibility, source behaviour, stable ordering, and count/page/drill-down consistency.
- **Preserve the settled source-qualified mixed queue.** Needs action composes task/review/approval items with separate counts. Task-only filters visibly select Tasks; Clear restores mixed work. **Never sum source counts into "tasks."**
- A reviewer round is an obligation with its own identity, not merely an extra task filter.
- Share authorization, filter, clock and snapshot logic within each applicable source, then compose/order/page once.
- Add a **stable ID tie-breaker** to any new priority/date sort.

**Definition of done:** Owner, manager, employee, site staff and named reviewer each find their true next action; inaccessible records never enter rows, totals or option lists.

### Slice F — Notifications and saved views (serves V1-06)

- **Unread badge — useful bounded read proposal:** exact count of delivered `IN_APP` rows with `readAt = null` for the current recipient. Bind recipient to session, `no-store`, hidden at zero, **unavailable must be distinct from zero**, clear on actor change.
- **Saved views:** keep the existing account-scoped browser-local views (`my-work-saved-views.ts`). Cross-device backend persistence is an explicit **proposal** requiring a reviewed storage contract or an expressly suitable approved store. It is **not** declared settled and it is **not** schema-free.
- Do not move existing My Work views exclusively to `/tasks`.
- If a future view API is approved, register static task routes **before** `:id`.

**Definition of done:** the badge matches the inbox exactly, is hidden at zero, and is never shown as zero when the count is merely unavailable.

### Slice G — Projects workspace (serves V1-07)

- **Canonical Project Tasks and People come before list polish.** The list-only reading does not make Projects complete.
- Project Tasks embeds/reuses the canonical task list and composer with **fixed project context**; preserve list/filter/page/Back context without task/project query collisions.
- A People section shows current project contributors and lead. Owner controls assignment and lead changes under current APIs.
- Include setup → activation → work/review/correction → delivery gates, plus Hold/cancellation/archive restrictions.
- The current list API supports `branchId`, `q`, `stageKey`, `sort`, `direction`, `offset`, `limit` — **not** the full status/type/lead filter set. Any new filter needs its own contract.
- Bounded rows must avoid N+1 detail fetches and expose no inaccessible lead, milestone or participant data.
- Display no invented health/progress/financial totals.

**Definition of done:** create → configure → activate → add task → work/review/correct → complete required gates; forbidden lifecycle shortcuts fail; On Hold/cancelled/archive states show correct permitted actions; cancellation and exit cannot erase task/revision history.

### Slice H — Responsive UI (serves V1-02, applied throughout)

- Applied **within each vertical slice** against the approved visual reference, not as a separate cosmetic pass at the end.
- Four widths: **1440, 1024, 390, 320**. Include keyboard-only operation, visible focus, readable contrast, touch targets, short mobile viewports, long text, dirty forms and denied/stale/conflict states.
- **Replacing actions with an overflow menu and adding expand/tap disclosure are behaviour changes**, not CSS-only work. They need accessible interaction code and focus/keyboard/touch tests, and must retain next-action access.
- **Stacking cards may increase the very scroll distance the plan wants to reduce.** Verify actual first-action geometry against the approved demo at all four widths before choosing a layout. Do not promise zero scroll for every content length.
- Do not silently select a new palette or font system while integrating returned demos.

---

## 5. Cross-cutting requirements

| Concern | Rule |
|---|---|
| Authority | Backend authorization is authoritative; navigation and forms are presentation |
| No second system | Reuse the existing evaluator, owning services and canonical workflows |
| Source-qualified | My Work keeps separate source counts; never sum sources into "tasks" |
| One predicate | Within each applicable source, counts/totals/rows share the predicate |
| Stable ordering | Any new sort gets a stable ID tie-breaker |
| Honest states | denied / unavailable / stale / loading are never displayed as zero or as ready |
| No invented data | no fabricated capacity, health, progress or financial totals |
| Additive only | Access changes add checks; nothing is loosened |
| No schema change | None of these refinements requires a migration; if one becomes necessary, stop and escalate |
| Testing | Focused regressions during implementation, then full pinned gates on the accepted harness |
| Demo review | A returned demo's control cannot silently invent an endpoint or an authority |

---

## 6. Test flow (from the authoritative pilot plan)

```text
actor/session + current grants + project/reporting context
   -> authorized option/list/detail read
   -> shared form with explicit context and preserved draft
   -> ordinary owning command reauthorizes under current state/locks
   -> task ID + history/event + actual persisted result
   -> same task in eligible My Work and Project views
   -> review/correction/child-completion rules

negative paths: wrong ID/branch, portal/inactive account, expired/revoked grant,
stale parent/version, changed project, overload acknowledgement, duplicate submit,
uncertain response, actor switch, concurrent child creation/parent completion
```

**Gate commands (verified against the real root scripts):**

```bash
pnpm test:unit
```

```bash
pnpm test:integration
```

```bash
pnpm typecheck
```

```bash
pnpm lint
```

```bash
pnpm verify
```

`pnpm verify` is the full gate — typecheck, lint, unit, integration, build and
Playwright. It **includes database integration and browser tests** and is not a
database-free local gate. Use the real configured CI path or a separately
reviewed dedicated local acceptance path; never set fake CI flags or weaken
target guards to make an environment pass. Use `VITEST_WORKERS=2` for the
documented host resource limit.

---

## 7. Proposals requiring an explicit Owner decision

These are recorded as proposals. Dependent code must not assume them.

| Proposal | Status |
|---|---|
| Non-project task review | Whether personal/non-project tasks need internal review before completion; project-linked review is retained until this decision is settled |
| Stored employee display name + edit policy | Needs schema and field-policy decision; legacy fallback until then |
| Company-wide Staff directory / role-permission inventory | Separate access and privacy decision |
| Effective-access explanation read model | Only if existing responses cannot supply it |
| Backend-persisted cross-device saved views | Needs a reviewed storage contract; local views stay meanwhile |
| Project status/type/lead/count projections | Needs its own query contract |
| Numeric projected-capacity pre-check | Needs authorized inputs, dates, units and distribution rules |
| Durable create idempotency | Reviewed backend change using existing receipt conventions |

---

## 8. Two-agent assignment

Two agents work in parallel on disjoint file ownership. **A slice's owner is the only agent that edits that slice's files.** If work is needed in a file owned by the other agent, it is handed off rather than edited — see the integration owner in §9.

| Stage | Agent 1 | Agent 2 |
|---|---|---|
| **Start** | **D + G** — task creation and Projects integration | **A + B** — People and Settings completion |
| **Next** | **E** — My Work filters/search | **F** — unread notifications |
| **Throughout** | **H** — responsive work in owned screens | **H** — responsive work in owned screens |

**Owned files.** "Owned screens" means the screens the agent's slices touch, not the whole application.

- **Agent 1:** `apps/web/src/task.tsx`, `task-create-dialog.tsx`, `task-composer-fields.tsx`, the project task surface, and their tests.
- **Agent 2:** `apps/web/src/people*`, the Settings panels and their tests, plus `apps/api/src/organization.controller.ts` / `organization.service.ts` for the read paths Slice A needs.
- **Neither agent edits shared files directly** — see §9.

**Why this pairing.** D/G and A/B share no files, so both agents can start without blocking each other. Agent 1 opens on the largest surface (task creation is the highest-traffic write path), Agent 2 opens on the access-controlled read paths. E and F are sequenced second because both build on the creation and notification work that precedes them.

### Slice C starts now, in parallel

The access audit is **not** sequenced behind the agent pairs. It begins immediately.

- **Audit first, fixes second.** Agent 1 and Agent 2 each perform the audit for the modules they own, and fix findings in their own files. Cross-module findings are reported, not fixed.
- **Audit scope:** every guard, the permission keys callers and tests actually use, their scopes, and the workflow conditions that gate them.
- **Fix rule:** additive only. Every change adds a check. No existing check is loosened, no role name or presentation profile acquires authority, and no picker grants access.
- **Escalation:** any finding that would require loosening a check, changing the evaluator, or touching a file outside the agent's ownership goes to the integration owner and the Owner. Agents do not resolve those themselves.

---

## 9. Integration owner for shared code

One named owner holds every file both agents must touch. Without this, two agents editing a shared contract is how the two halves stop fitting together.

**The integration owner has sole write authority over:**

| Area | Files |
|---|---|
| Shared authorization | `apps/api/src/authorization.ts`, `authorization.service.ts`, `authorization-read-context.ts` and their specs |
| Contract exports | `packages/contracts/src/index.ts`, `permissions.ts`, `my-work.ts`, `task-creation.ts` |
| Navigation | `apps/web/src/app.tsx` and the shell/navigation it renders |
| Global web state | session, setup, capability and actor-switching modules plus their specs |

**Duties.**

- Agents **request** changes to shared files through the integration owner; they do not edit them.
- The integration owner keeps contract exports and navigation capability reads consistent with what the server actually authorizes.
- Navigation changes follow the capability semantics in Slice C — loading, unavailable and revocation, never a stale grant.
- Shared-spec updates land before the agents' focused tests are treated as green, so a shared change cannot silently pass on a stale contract.

**Conflict rule.** If an agent needs a shared change to proceed, the integration owner decides the shape; the agent waits. Neither agent resolves a shared-file conflict by editing the file.

---

## 10. Out of scope for working version 1

Production NAS/public rollout, encrypted offsite backup and production key/restore
validation, provider/legal/accounting integrations, full R-105, new analytics, live
AI/inference, external AI transmission, WhatsApp, deep CAD/BIM, new organizational
tiers, arbitrary custom workflow builders, a new permission engine, and replacing
the application framework.

---

## 11. What this revision does not claim

- No slice has been implemented by writing this revision. It is documentation only. Bounded implementation may begin under §8; nothing here claims it has happened.
- No typecheck, lint, unit test, integration test, build, or browser acceptance was run while preparing it.
- `pnpm verify` was **not** run. Unit and mock-browser checks do not satisfy the database or authenticated gates.
- The authoritative pilot plan and its dated progress reports remain the source of truth for what is already implemented. This document contributes refinements; it does not supersede them.
- The V1 goal remains active. Pilot acceptance is not claimed.

# 04 — Acceptance test plan: executable scenarios and evidence

**Important:** These are acceptance cases for the real integrated app. Previous 197 synthetic HTML checks passed; they cannot substitute for API, database or manual accessibility tests. Record each case as PASS / FAIL / BLOCKED / NOT RUN, its command, commit and evidence. Do not fabricate counts.

## A. UI visual baseline (P0/P1)

| ID | Scenario | Expected |
|---|---|---|
| VIS-01 | 1440×768 ordinary project task | Title, Description, Reason, Main assignment, Type/Project, Start+Target side-by-side, Effort, Priority, Review, Create visible without scrolling. |
| VIS-02 | 1440×900 full content | Two-column light paper/white layout, no duplicate headings, tags visible, inline subtasks/checklist. |
| VIS-03 | 1024×768 narrow desktop | Inspector and main content readable, sticky actions accessible, no unwanted clipping. |
| VIS-04 | 783×768 compact desktop | Layout adapts cleanly; no horizontal overflow. |
| VIS-05 | 390×844 mobile | Task Name then **Description immediately after**; Assign to → Target → Reason → More task settings; bottom Create visible. |
| VIS-06 | 320×700 and 320×650 phones | No page x-overflow, inputs remain usable with on-screen keyboard, sticky footer never covers error/last fields. |
| VIS-07 | Long content and 30 collaborators | Wrapping/overflow contained in permitted local scroll areas, names still accessible, no layout collapse. |
| VIS-08 | Basic V15 screenshot comparison | Task composer approximates reference spacing, icons, colour, input control styles and avatar treatment. Explicitly note variances and root cause. |

## B. Creation/permissions (P0)

| ID | Input/action | Expected |
|---|---|---|
| FLOW-01 | Employee authorized self personal task | Correct default type/priority, self-assignment implicit if allowed; create persists in correct scope. |
| FLOW-02 | Owner without linked employee | Must explicitly pick eligible main, cannot submit without it. |
| FLOW-03 | Leader creates project task with two colleagues | Options reflect authorization, primary `ownerEmployeeId`, other `collaborators[]`, no duplicates. |
| FLOW-04 | Site employee quick create | Only role-authorized site projects/participants, same composer/backend. |
| FLOW-05 | Fixed project entry | Correct project locked, attempts to switch blocked. |
| FLOW-06 | Project switch mid-draft | Clears invalid primary/collaborators/hours/plan item/reviews, preserves compatible title/description/reason and explains reset. |
| FLOW-07 | Delayed options response from old project | Old response ignored; no stale eligible people shown. |
| FLOW-08 | Primary vs collaborator eligibility | A collaborator who cannot be a primary cannot be promoted to Main. |
| FLOW-09 | Reordering avatars | First avatar changes only when eligibility permits; backend request mapping and persisted result reflect new Main. |
| FLOW-10 | Max collaborators / tags / checklist | Hard caps 30/10/10 and associated length validations. |
| FLOW-11 | No owners / 403 / failed eligible options read | Correct non-destructive empty/denied/retry states, no fabricated fallback. |
| FLOW-12 | Long title/description/reason | Trim, max/min validation, first error focus and readable message. |
| FLOW-13 | Invalid start date later than target | Inline error, blocked creation until corrected. |
| FLOW-14 | Past target date | Do **not** impose new future-only business rule if current server permits it. |
| FLOW-15 | Blank estimated hours vs explicit 0 | Blank omitted, 0 emitted when explicitly set. |
| FLOW-16 | Project type semantics | Project required for PROJECT/CORRECTION/SITE, forbidden for NON_PROJECT; eligible project states validated on server. |
| FLOW-17 | Review NONE / INTERNAL / BOTH | Correct enum and permissions; BOTH respects client-publishing authority and internal-first. |
| FLOW-18 | Reviewer-name / recurrence options gated | Unsupported extension never appears as persisted, sent or approved; existing `reviewRequirement` and `RECURRING` type still work if authorized. |
| FLOW-19 | Parent with checklist and tags | Checklist is part of parent payload with checked states; tags are distinct trimmed strings. |
| FLOW-20 | Parent and multiple subtasks | Parent created once; each child sent separately with fresh positive `expectedParentVersion`; concurrent-version conflict handled. |
| FLOW-21 | Files + Discussion | Only post-create, through existing upload/comment endpoints; no extra create-payload fields. |
| FLOW-22 | Review is routed but not submitted | Creation does not mark task approved, completed, or client delivered. |

## C. Reliability / safety (P0)

| ID | Trigger | Expected |
|---|---|---|
| ERR-01 | Invalid create | First invalid visible and focused; hidden More settings expands if necessary; no POST. |
| ERR-02 | Rapid double click / Ctrl+Enter | One command identity / no duplicate. |
| ERR-03 | Backend 409 overload warning | Explicit user acknowledgement; no automatic override; follow existing protocol for modified payload and idempotency identity. |
| ERR-04 | Network disconnect / HTTP 5xx after create POST | Submitted values locked; “Check creation result”; same body+key on uncertain result check, no duplicate. |
| ERR-05 | Unauthorized project/employee at submit | Server denies; UI refreshes eligibility, preserves compatible text and does not elevate permission. |
| ERR-06 | Parent success + one child failure | Parent remains created; failed child retry only, version reconciled; no duplicate parent. |
| ERR-07 | Parent success + file upload failure | Parent remains created; upload retry only. |
| ERR-08 | Navigate/close with edited draft | Unsaved confirmation and correct focus return; pending/uncertain submission cannot be silently discarded. |
| ERR-09 | Restore draft after refresh if feature approved | Stored draft is account/organization isolated, expires, revalidates permissions, cannot leak on shared device. If no approved storage, stick to safe existing in-memory lifecycle. |
| ERR-10 | Browser shows old UI | Confirm loaded server commit matches intended integration commit; fix test server/branch rather than testing obsolete build. |

## D. Accessibility and device checks (P0/P1)

- Keyboard: Tab order matches visual order, Shift+Tab works, Escape closes nested calendar/person picker before drawer, focus trapped in modal, focus restored to launcher; Enter-to-add works, Ctrl/⌘+Enter command doesn't interfere with IME/editor.
- Screen readers: icon-only controls have names; input errors announced; selected Main and reviewer sequence communicated with text, not colour alone; live status announces submission/receipt.
- Physical devices: Safari iPhone and Chrome Android, portrait, virtual keyboard; 44px targets, safe area, footer not overlapped, no zoom traps.
- Reduced motion, 200% zoom and WCAG contrast review; log failures as release issues, not deferred proof.

## E. Required test runs and environment

Use scripts that **actually exist** in the current `package.json`, but look for these repository test files:

- Web: `apps/web/src/task-create-dialog.test.tsx`, `task-composer-fields.test.tsx`, `task-creation-options.test.ts`, `task-creation-flow.test.tsx`, `project-task-context.test.tsx`.
- API: `apps/api/src/task.controller.api.spec.ts`, `task-creation-options.unit.spec.ts`, `task-create-receipt.unit.spec.ts`, `task.database.api.spec.ts`, `task-subtask-commit.database.api.spec.ts`, task review tests.
- End-to-end: `tests/e2e/task.spec.ts` (with browser auth) plus review/project flows.

Run: repo's existing lint, typecheck, build, web/API units, isolated DB integration and Playwright; report actual commands and results. No retained staging migrations/seeds. Static candidate regression results in `reference/source_handoffs/production_candidate_qa.md` are context only.

## F. Visual approval and release evidence template

| Gate | Reviewer | PASS / FAIL / BLOCKED | Evidence |
|---|---|---|---|
| Canonical app/server/commit verified | Engineering | | |
| Desktop/mobile screenshots compared | Product + UX | | |
| All current API mappings tested | Frontend + Backend | | |
| Role/branch authorization and revalidation | Security + Backend | | |
| Idempotency / overload / 5xx recovery | Backend + QA | | |
| Subtask versioning + partial success | Backend + QA | | |
| Manual accessibility + physical phone | Accessibility + QA | | |
| Reviewer/frequency extension feature gates | Owner + Backend | | |
| Staff pilot | Product | | |
| Single staging version reviewed and deploy authorized | Owner / Release | | |

Do not call this “production-ready” until all release-blocking rows pass.

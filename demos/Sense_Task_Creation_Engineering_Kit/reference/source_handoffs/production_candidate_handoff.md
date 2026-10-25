# Sense Studios — Task Creation · Production-Candidate Handoff

**Candidate:** V15-RC1  
**Prepared:** 24 October 2026  
**Status:** Visual design frozen; standalone interaction QA passed; **not approved for production deployment** until API integration, accessibility and usability gates are completed.  
**Baseline:** Approved Programa-inspired V15. No new navigation architecture or business rules.

## 1. Deliverables

- `sense_task_creation_production_candidate.html`: self-contained production-candidate design specimen. Synthetic data and simulated operations only; never sends a network request.
- `sense_task_rc_desktop.png`, `sense_task_rc_mobile.png`: render captures after reset at 1440×768 and 390×844.
- `sense_task_production_candidate_qa.md`: test results, limitations and release gates.
- Original approved V15 remains unchanged in the workspace.

## 2. Design decisions frozen from V15

- Programa-style two-column desktop editing canvas + right properties panel; single-column responsive mobile.
- Mobile field sequence **Task Name → Description → Assign to → Target Date → Reason → More settings**.
- One ordered, horizontal avatar row for assignees. First item is primary; eligible remaining people are collaborators. Drag or manage people without a separate Collaborators page.
- Compact type control, Start + Target on one desktop line, Estimated Effort directly beneath; compact priority selection and review route.
- Internal then client review sequence when authorized; inline reviewer settings are visible as a proposal.
- Recurrence options are inline as a proposal when Recurring is selected.
- Inline subtasks and checklist are visually related but have distinct data and persistence semantics.
- Tags are directly visible; Files and Discussion are post-creation workflows; sticky Create action and independent body scrolling.
- Colour palette: white/paper/graphite, dark pine action, restrained orange/red urgency, neutral no-review state.

## 3. Production-candidate hardening added

1. Session-only local *demo* draft snapshot for accidental refresh / reopen. A restored-draft notice permits dismissing the banner or discarding the stored draft. Draft is cleared on successful simulated creation, explicit discard, or reset.
2. Restored choices are revalidated against the current *synthetic* participant eligibility before display. **Do not treat a saved draft as permission** in the real application.
3. An inline, visible warning appears when named reviewer selection or a recurrence schedule is set: these settings are **not** supported by the current strict task-creation request. The preview does not silently claim to save them.
4. Clearer accessible focus indicators and live status announcement for simulation notifications, retaining Escape, focus containment, restored triggering focus and reduced-motion handling.
5. All prior V15 create, retry, validation and responsive interactions retained.

**Important about draft storage:** Browser `sessionStorage` is used solely for a synthetic offline design specimen. Before production, decide an organization-approved draft-retention strategy with account/organization isolation, expiry, encryption/privacy review and no cross-user leakage on shared devices. The user's current `task.tsx` draft lifecycle remains the source of truth.

## 4. Implementation entry points: reuse, do not fork

| Existing file | Production candidate integration |
|---|---|
| `apps/web/src/task-create-dialog.tsx` | Modal/drawer lifecycle, focus management, sticky actions, unsaved guard, Escape and trigger-focus restoration. |
| `apps/web/src/task-create-dialog.css` | Preserve V15 look and responsive arrangement without introducing a replacement app shell. |
| `apps/web/src/task-composer-fields.tsx` | Direct editors, type/priority controls, project/owner/participant context, date/calendar, reason, estimate, checklist, tags and review UI. |
| `apps/web/src/task.tsx` | Existing draft state, submit and response handling, idempotency, recovery, capacity acknowledgement, success selection. |
| `apps/web/src/task-creation-options.ts` | Authorized participant options and loading/denied/retry/refresh state; ignore stale responses. |
| `packages/contracts/src/task-creation.ts` | Eligible person/participant read response. |
| `apps/api/src/task.controller.ts`, `task.service.ts` | Current validation/authorization/persistence; **unchanged unless a separate explicitly approved feature is implemented**. |

**Avoid** creating an independent task backend, disconnected test server, parallel component registry, or duplicate React create form.

## 5. Exact existing APIs

Read: `GET /api/v1/tasks/setup` and `GET /api/v1/tasks/creation-options?projectId=...` (omit query for personal context). Send `credentials: include` and `cache: no-store`. These are authoritative for `actorEmployeeId`, `canCreate`, `canAssign`, eligible owners/collaborators and project identity; never derive them from display role alone.

Create parent: `POST /api/v1/tasks`, cookie-authenticated same-origin, `Content-Type: application/json`, `X-CSRF-Token` from the existing session, `credentials: include`. Do not embed tokens in HTML.

Existing supported keys:

| UI | API field | Requirement |
|---|---|---|
| Title | `title` | 2–160 trimmed chars; required |
| Type | `type` | PROJECT, NON_PROJECT, RECURRING, CORRECTION, SITE, TRAINING_PRACTICAL |
| Priority | `priority` | LOW, MEDIUM, HIGH, CRITICAL; default MEDIUM |
| Target | `targetDate` | Valid YYYY-MM-DD; required |
| Project | `projectId` | Project-context eligible UUID; required for PROJECT/CORRECTION/SITE, forbidden for NON_PROJECT |
| First assignee | `ownerEmployeeId` | Explicit eligible UUID when required; omitted for permitted implicit self-assignment |
| Other assignees | `collaborators[]` | `employeeId` + optional `estimatedHours`; max 30, eligible and distinct |
| Description | `description` | Optional; max 2000 |
| Reason | `reason` | Required; 3–1000 trimmed chars; persisted to history |
| Start date | `startDate` | Optional; valid and not after target |
| Effort | `estimatedHours` | Optional; 0–100000; blank and zero are distinct |
| Milestone | `planItemId` | Optional eligible plan item of project |
| Tags | `tags[]` | Max 10 distinct, 1–30 chars |
| Checklist | `checklist[]` | Max 10 `{label, checked}`, labels 1–120 chars |
| Review routing | `reviewRequirement` | NONE, INTERNAL, BOTH; client routing requires project + publishing authority |
| Idempotency | `idempotencyKey` | Unique per command identity; preserve key/body for uncertain-response checks |

Subtasks: `POST /api/v1/tasks/:parentTaskId/subtasks` with the corresponding create body and fresh `expectedParentVersion`. Draft subtasks are **not** silently added to the parent create payload. Obtain the latest parent version before each child create; do not overwrite concurrent changes.

Files, comments, review evidence, committed date, recurrence scheduling and dependencies use separate existing workflows, not extra keys appended to the strict parent creation endpoint.

## 6. Proposed fields: deploy only behind feature gates

**Release-blocking feature gates, not current contract claims:**

- **Named internal/client reviewers:** Requires approved reviewer options API, eligibility constraints, reviewer assignment persistence, security checks, audit/history, and immutable review routing semantics. Until available, hide/disarm the selector in production while preserving the supported `reviewRequirement` field. Never imply that choosing a name changes the routed task.
- **Recurrence frequency / interval / weekdays:** Requires explicit scheduling contract, validation, timezone behaviour, recurrence lifecycle, occurrence generation and idempotency semantics. The existing `type: RECURRING` is supported, but does not mean the demo schedule is saved. Hide or feature-gate repeat schedule controls until implemented.

Current creation must never be conflated with review **submission**, **approval**, **completion**, or **client delivery**. Internal review precedes client review. The designated client approval flow remains separate.

## 7. Critical response and recovery design

| Server or client event | UI response | Preserve |
|---|---|---|
| Participant read in progress | Loading context; disable create; allow draft review | Draft |
| No eligible owner, forbidden, or request failed | Explain and provide authorized retry; never invent options | Draft |
| Validation error | Inline field message, error summary, first invalid field focus; expand hidden settings | Draft |
| Create in progress | Disable duplicate create clicks and editing; show pending state | Same submitted body and idempotency key |
| Capacity conflict 409 | Display overload warning and explicit acknowledge/retry choice | Draft; generate appropriate new identity for acknowledged payload |
| Connection failure/5xx after submit | Mark outcome **uncertain**, lock submitted fields, show **Check creation result** | Same body and idempotency key |
| Eligibility/stale context | Refresh options and invalidate stale selections transparently | Compatible draft fields |
| Success | Select/open task, refresh affected lists, clear successful draft only | Any unfinished post-create operations independently |
| Parent succeeded; child/file failed | Show parent success and failed item separately; retry only failed operation with its own receipt | Parent ID, child expected version, file receipt |

The candidate HTML **simulates** these operations. Server-backed correctness remains an integration gate.

## 8. Accessibility and responsive acceptance

- Desktop 1440×900/768, 1024×768, compact 783×768; mobile 390×844, 320×700/650. Verify no horizontal overflow, enough scroll room with keyboard open, 44px tap controls on mobile, footer visible, focus indicators not clipped.
- Dialog focus management, Escape from nested controls before closing, alertdialog on unsaved discard, screen reader names and descriptions, status announcement, tab order, reduced motion.
- **Unverified for production:** manual NVDA/VoiceOver/TalkBack testing, automated full WCAG audit/contrast audit, 200% zoom, RTL/localization, physical touch device, soft keyboard overlaid viewport, and real employee usability study.

## 9. Release checklist — decision owners

1. **Product / Owner:** Approve freeze of V15 hierarchy and set feature gates for unsupported reviewer/repeat settings.
2. **Frontend:** Integrate in existing React components and route/entry contexts; preserve one canonical UI.
3. **Backend:** Confirm strict payload and project authorization without schema changes; implement separately approved reviewer/recurrence extensions if desired.
4. **QA:** Run full integration matrix with actual authenticated role contexts, real 409/5xx/permission responses, idempotency replay and interrupted child uploads.
5. **Accessibility:** Test with NVDA/VoiceOver/TalkBack and physical 320px-class device.
6. **Staff pilot:** Three representative tasks (personal, multi-assignee project, internal + client review); measure completion, errors, comprehension and recovery.
7. **Security:** CSRF/session/origin, tenant isolation, read freshness, inactive participant rejection, no cross-user draft restore, file size/type rules and audit log verification.
8. **Release:** One canonical staging branch and server; no parallel UI or backend versions; sign-off only after P0 issues resolved.

### Acceptance decision

**Approved for implementation handoff; not approved for live deployment.** These files supply a design reference and test plan, not modifications to the user's actual app repository.

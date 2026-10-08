# S18 and S27 — completed-slice frontend integration plan

8 October 2026. Part of the [frontend implementation plan](UX_FRONTEND_IMPLEMENTATION_PLAN_2026-10-08.md). **Planning only; existing backend contracts and business rules remain unchanged.**

## 1. Accepted source and scope

The Owner's completion update is confirmed by current top-level [state](../../CURRENT_STATE.md), [implementation status](../../IMPLEMENTATION_STATUS.md), [S18 completion/acceptance](../../S18_ACCEPTANCE_REVIEW.md) and [S27 completion/acceptance](../../S27_ACCEPTANCE_REVIEW.md). Both are **COMPLETE for development/local staging**. Their frontend presentation work no longer waits for slice completion.

Reported accepted evidence: pinned full verification exited 0 with API275, web220, PostgreSQL367 and all57 desktop/mobile browser cases; Sol accepted six S18 and two S27 captures. These are existing acceptance records, not checks rerun for this planning update. Acceptance is bounded to the recorded 484-file fingerprint; later concurrent Review UI changes and the checkout as a whole do not inherit that verification. Actual-project R-104/R-105 and production remain unverified.

Some API handoff headers retain historical IN PROGRESS wording. Current completion/acceptance records supersede those status labels. Their settled operation contracts still govern frontend payloads and behavior; inspect actual controller/service for staged or historical clauses.

## 2. Navigation and canonical homes

| Area | Primary home | Existing component/API | Contextual entry |
|---|---|---|---|
| Skills | People → Skills/Library/Training → Skills | `/learning`; `learning.tsx`, `/api/v1/skills` | Authorized own/scoped employee profile; exact skill request/decision |
| Library | Same People destination → Library | `library-workspace.tsx`, `/api/v1/library` | Exact published SOP reference from task or immutable template version |
| Training | Same destination → Training | `learning-training.tsx`, `/api/v1/training` | Exact assignment, assigned module version and linked practical task |
| Evidence assistance | Work → Evidence assistance | `/assistance`; `ai-assistance.tsx`, `/api/v1/ai` | Exact task/project → typed request; ordinary assignment/reviewer workflow |

Expose three distinct Learning areas while reusing the current Skills & Training/Library route components. This is frontend composition, not a new Learning API. Authoring and organization controls appear only with returned current capabilities, not merely a leadership title.

Desktop: selected directory/context beside detail where useful; retain employee/library kind/search/assignment/run selection. Mobile: directory then full-screen selected detail with contextual Back. Preserve exact employee, record/version, assignment or run IDs, selected area and return state. New query-state handling is frontend work; loading a query ID still requires the existing authorized exact-object read.

## 3. F09a — S18 frontend work

Requirement anchors: R-044.a–d, R-045.a–b, R-055.a–d, R-056.a–b, R-057.a–c; settled C-025–C-027.

| Work unit | Screen hierarchy and flow | Existing operation | Acceptance condition |
|---|---|---|---|
| S18-UI01 Skills profile/catalogue | Employee → current official levels → pending requests → immutable rating history; catalogue authoring separately disclosed | Skills setup/profile; catalogue and Owner direct-rating commands | BEGINNER/INTERMEDIATE/ADVANCED/EXPERT only; no invented numeric score, seeded catalogue or automatic promotion |
| S18-UI02 Skill request/decision | Own employee or scoped management recommendation → requested level/current version/reason → named eligible approver → exact decision → official history | `POST /skills/requests`, `POST /skills/requests/:id/decision` | Self/delegated approval remains denied; rejected request leaves rating unchanged; stale request cannot overwrite a later Owner rating |
| S18-UI03 Library directory/detail | Kind/search/current permitted audience → exact record → published or draft version → attached private evidence and version/publication history | Library setup/list/detail | No hidden-audience titles/files; draft and published pointer visibly distinct; older exact versions remain identifiable |
| S18-UI04 Library authoring/publication | Author supported blocks/category/fixed audience → immutable version → independent publication request/decision OR reasoned Owner direct publication | Record create/version; publication requests/decision; direct publish | Preserve fixed Organization/Branch/Team audience and independent publisher; no self-publication shortcut for employee/Team Leader; stale/newer publication ordering preserved |
| S18-UI05 Private files | Selected authored record → current upload/chunks → finalize → attach same-record finalized file to version → protected stream | Existing library upload/chunk/finalize/stream commands | Transferred/finalized/attached/published remain separate; NAS failure visible; no public URL/raw storage key, detached or foreign-record attachment |
| S18-UI06 SOP acknowledgement/reference | Exact published version → own acknowledgement; authorized task/template → exact SOP sidecar reference → retained reference | `POST /library/versions/:id/acknowledgements`, `POST /library/references` | New publication does not erase old acknowledgement/reference; reference confers no access and does not rewrite target workflow/template |
| S18-UI07 Module authoring/activation | MODULE record → authored criteria → quiz/questions/options/explicit threshold and practical requirement → immutable version → activate | Existing library MODULE version and `:recordId/activate` | Distinguish module activation from SOP/Knowledge publication. No default pass threshold; answer keys confined to authorized author/manager DTOs |
| S18-UI08 Assignment | Eligible employee → latest activated exact module → named independent reviewer → optional existing practical task → explicit reasons → assignment detail | Training setup/list/detail and assignment create | No automatic practical-task creation; reviewer/version remain immutable; eligible current audience/reviewer/task choices only |
| S18-UI09 Training work/review | Exact assignment/module/criteria → trainee quiz/practical evidence submission → named reviewer assessment → changes/resubmission OR completion | Assignment submissions/assessments | UI maps actual ASSIGNED/CHANGES_REQUIRED/SUBMITTED/COMPLETED states; quiz alone never completes assignment; prior attempts remain immutable |
| S18-UI10 Effectiveness/skill handoff | Completed assignment → dated effectiveness observation; separately → requested skill upgrade with completed assignment as evidence → independent decision | Effectiveness command; existing skill request with `trainingSourceId` | No numeric effectiveness/performance invention; completion does not change skill rating or approve the new request |

All commands retain actual required `commandId`, reason, expected rating/assignment versions and existing receipt behavior. Exact retry reuses the same command/payload; changed payload must follow the existing conflict/new-command flow. A timeout is not proof that the command failed. Refetch official state/history after success; on stale/conflict/denied response keep authored input safe and explain the actual recovery.

Skills management follows live home Branch/Team reporting scope plus explicit grants. Project assignment and display job title do not confer employee-skill/training authority. Library organization-authority and fixed audience are separate from employee/project authority. Clients/external actors do not gain internal Learning access.

## 4. F09b — S27 frontend work

Requirement anchors: bounded R-052.a–c, R-053.a–c, R-054.a–c, R-087.a–c, R-088, R-089.a–b, R-090.a–c.

| Work unit | Screen hierarchy and flow | Existing operation | Acceptance condition |
|---|---|---|---|
| S27-UI01 Context/request | Supported kind → current typed task/project/scope → explicit ordered window ≤31 days → reason → request | AI context; `POST /ai/runs` | DAILY/PROJECT/MANAGEMENT/ASSIGNMENT only. Assignment purpose PRIMARY_OWNER/COLLABORATOR/REVIEWER; no arbitrary prompt or new request kind |
| S27-UI02 Evidence detail | Exact run/kind/scope/window/provider/time → source-linked facts → unranked candidates/factors → unavailable factors/limitations | `GET /ai/runs/:id` | Display `deterministic-evidence-v1`, model `none`; source references preserved; no composite candidate score, predictive claims or fake capacity |
| S27-UI03 Team/broader scope | Current task-owner Team first → explicitly permitted broader search in request → currently eligible candidates | Existing context/run capabilities and owning-service eligibility | Broader search control only for complete current management predicate; no grant/membership changes or guessed role-name checks |
| S27-UI04 Human evidence decision | Exact retained run/decision version → ACCEPTED/REJECTED/OVERRIDDEN → permitted typed selection if required → reason → immutable history | `POST /ai/runs/:id/decisions` | Accepted/overridden assignment requires eligible purpose/person; rejected forbids selection; summary decision has no assignment selection; previous decisions remain |
| S27-UI05 Ordinary action handoff | Selected source/person/purpose → canonical task reassignment/collaborator/reviewer planning → explicit authorized domain action | Existing Task/Review APIs and frontend editors | Recording an evidence decision changes no task/project/review approval. User must complete the ordinary domain workflow; prefill cannot bypass current eligibility or independence |
| S27-UI06 Source observation | Prior accepted/overridden decision → actual matching persisted task/owner/collaborator/reviewer evidence → reason → retained observation | `POST /ai/runs/:id/outcomes` | Original run task/purpose/person must match actual source. No observation before the ordinary assignment exists; no causal success or score invented |
| S27-UI07 History/access recovery | Authorized returned runs → exact retained detail → current-source recheck, stale candidate/conflict/unavailable handling | Existing run list/read and receipts | Creator scope/Owner manifest authorization retained; list reflects actual returned records and supported controls, not invented paging/search. Conceal unavailable identities/Teams/factors and denied retained content |

An unavailable factor is not zero. Preserve observed zero where supplied, and unavailable reason where the source/policy/setup is missing. Display only returned authorized source context; internal authorized-input/provenance payloads are not a general inspection feature. Decisions/outcomes use the existing expected-decision-version and actor-scoped replay semantics.

No live inference, provider integration/API-key settings, raw-media upload for inference, client assistant, external transmission, autonomous assignment/approval, hidden chain-of-thought or new `ai.manage` permission is part of this plan.

## 5. Connected acceptance journeys for future frontend execution

| Journey | What the user must understand and what future checks must prove |
|---|---|
| L01 Official skill control | Find own/scoped employee; request proposed level; named independent actor decides; refresh shows exact official rating history; stale request cannot overwrite a later direct rating |
| L02 Exact SOP publication | Create/version supported content; request independent exact-version publication; authorized actor decides; own acknowledgement remains version-bound after publishing the next version |
| L03 Private library evidence | Upload/finalize/attach/read through existing commands; wrong-record/audience/access loss fails closed; task reference exposes no newly granted content |
| L04 Authored module/assignment | Author quiz threshold/practical criteria; activate; assign exact module and named reviewer; original assignment keeps its version after later activation |
| L05 Training correction loop | Trainee submit → reviewer changes → trainee resubmit → reviewer pass → completed assignment; answer keys hidden; prior attempts retained; no automatic official rating |
| L06 Effectiveness/recommendation | Record dated observation; open separate completed-training skill request; independent decision; distinguish training completion, recommendation and official rating |
| A01 Summary evidence | Authorized DAILY/PROJECT/MANAGEMENT request → exact window/facts/unavailable factors → reasoned decision; no inferred recommendations beyond returned result |
| A02 Candidate handoff | Exact task/purpose → current-Team candidates → accepted/overridden evidence → ordinary task/reviewer action → persisted source → verified observation |
| A03 Authorization/replay/conflict | Stale candidate, lost source, revoked audience/session and changed command payload conceal/deny correctly; exact retry retains same history; stale decision version requires actual refresh |
| M01 Mobile/context | Repeat representative L01–L06/A01–A03 with compact directories/full detail, exact context and Back; compare visibility against actual permissions, not prototype roles |

These are future application checks, not newly executed tests. Reuse existing accepted slice fixtures/suites and add focused frontend regression coverage when implementation is authorized. Retain full-pinned verification and rendered desktop/mobile inspection from the main plan.

## 6. Remaining integration gaps

- **G11 stays open as an integration gap, not a completion blocker:** `dashboard.service.ts` still reports Skills/Training unavailable and has no training Dashboard rows; `performance-calculations.ts` still lists Training/Skills/SOP recommendations unavailable; `automation-reports.ts` still excludes `skills_training`. S18 completion does not alter those accepted read contracts. Show truthful unavailable presentation; do not synthesize report columns, metrics, score weights or source rows in the browser.
- S27 can consume authorized S18 evidence through its owning read ports. This is distinct from making S18 an S23/S24/S26 reporting/scoring source.
- Prototype catalogue coverage does not demonstrate all S18 authoring/private-transfer/criteria/assignment cases or all S27 context/replay/selection/outcome cases. The operation ledger and the units above explicitly retain those capabilities.
- Exact Learning/assistance route selections and canonical task/reviewer/SOP handoffs need frontend wiring over existing interfaces. Do not invent new exact-object endpoints where the current component already loads the object.
- G01–G10/G12 in the main gap register are not resolved by S18/S27 completion.

## 7. Delivery and review boundary

F09a and F09b are settled, supported frontend planning scope. They can be scheduled with F07/F08 once the shared shell/context works; they need not wait for unrelated catalogue presentation work. Accepted slice completion removes their prior dependency gate, not the need to verify future frontend changes.

Actual routing for this update: exact `gpt-6.1-sol` interpreted completion/contract boundaries; `gpt-6-luna` updates the bounded main-plan and gap-register documentation; root integrates this detailed companion for Sol review. No application/backend/prototype edits and no tests are part of this planning update. Stop after returning the updated planning package to the Owner.

Final review: exact `gpt-6.1-sol` accepted the expanded S18/S27 planning coverage, with one G11 wording correction applied: S27 consumes authorized S18 evidence through owning read ports, which does not supply report/performance projection integration. The concurrent Review increment remains IN PROGRESS. This is document acceptance only, not runtime acceptance.

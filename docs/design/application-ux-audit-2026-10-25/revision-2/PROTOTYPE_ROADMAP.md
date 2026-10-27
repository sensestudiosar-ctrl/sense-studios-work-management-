# Prioritized connected prototype roadmap

**25 October Owner update:** P1 + P2a prototype-only construction was approved and is delivered in the existing designated review artifact. See [delivery](../prototype-delivery/README.md). D01 client/external audits remain BLOCKED and no production implementation is authorized. The plan-only wording below records the preceding discovery baseline, not the current authorization for this bounded prototype.

25 October 2026 · **Plan only. No prototype/app code, new server or dependencies authorized.**

## 1. Deliverable and integration boundary

One connected review artifact based on the existing approved demo package, with shared sample objects and retained navigation/return context. It reuses Dashboard V10 shell/overview, exact My Work composition and approved Task Creation hierarchy. It is not another independent frontend, deployed application, backend, permission engine or persistence implementation.

After explicit prototype-only approval, extend the existing repository-owned review artifact rather than create a new app/package/build target. Use installed browser/authoring tools and existing assets; no new dependencies or services. No production route, API proxy, credentials, database or deployment wiring. Every node names the existing React route/component it would later retrofit. If a real widget/component cannot be safely represented without code changes outside the approved artifact, document that constraint before construction rather than widening scope.

Sample state lives in memory within the prototype session. One fixture graph spans all pages; navigation cannot reset it. The prototype clearly says Demo with synthetic data. Persona/scenario controls live in a separate review panel, never in product chrome. It cannot be used as proof of real role permissions/persistence. Do not modify any exact supplied original; a reviewed artifact version records its source hashes and bounded changes.

## 2. Connected node map

| Node | Existing route/component target | Shared state / outgoing links |
|---|---|---|
| N01 Dashboard | `/dashboard`, DashboardWorkspace + current shell | Current sample sources and independent statuses → My Work, Task, Project, Decisions, assigned review |
| N02 My Work | `/my-work`, MyWorkManagement/TaskWorkspace/my-work-parity | Personal vs permitted management scope, query/group/page/selection → Task detail, Create, Project, assigned review |
| N03 Task register | `/tasks`, same canonical TaskWorkspace | Same task IDs/filter values/views as My Work/Project → Create/detail; retained existing other views |
| N04 Create task/subtask | Existing TaskCreateDialog/shared fields/options | Context/parent, eligible sample owner/collaborators and exact fields → validation/pending/recovery/result |
| N05 Task detail/edit | Existing detail/drawer/TaskWorkspace | Same returned task ID/version; contextual Next step, child/evidence links, history → original queue/project/review/time |
| N06 Project directory/detail | `/projects`, eight existing sections | Same Project A/Branch/client/contributors/tasks → Plan/Tasks/People/Documents/Reviews/Delivery/Activity |
| N07 Files/drawings | `/documents`, `/revisions`, ConfirmedDrawings | Shared exact evidence ID/checksum/revision/approval/issue states → same review/task/contextual project |
| N08 Internal review | `/reviews`, exact task/round | Submitted snapshot/evidence vs current task; named reviewer → correction/resubmission/approved/routing result |
| N09 Staff client packages | `/client-reviews` | Authorized publishing attempt and exact package/item → separate CLIENT scenario |
| N10 CLIENT project/review | Existing separate client portal | Same sample package/item/evidence; Primary vs secondary capability scenario → item/final decision and explicit result |
| N11 Site delivery | `/site` | Same Project A/released input; note/report/snag/quality/hand-over state → task/evidence/project and offline scenario |
| N12 Time/self-service | `/time`, `/workforce` | Same task/employee context; own vs managed records and configuration missing states |
| N13 Management/Configuration | Existing People/Reports/Settings/Automation/CRM homes | Existing action inventory reachable; exact parent/return links; no fictional policy values |
| N14 EXTERNAL context | Existing external portal | Same sample grant/project/exact evidence; consultant/vendor/factory distinctions; no internal workflow authority |

## 3. Complete workflow scenarios

### P1 — daily work and creation continuity (first prototype slice)

N01 Dashboard → N02 My Work → search/filter → N04 Create → invalid required field → correction → pending → returned Task T-new → N05 detail → N06 Project Tasks → same T-new → Back to original My Work filter/group/scroll.

Variants: employee self-task; Owner without employee assignment; current leader assignment with restricted eligible people; Site presentation using current profile; fixed-project task; subtask fixed parent/project. A task assigned to someone else must not suddenly appear in the creator's personal list. Include dirty Close/Keep editing and lost-response/Check creation result with one sample command and one returned ID.

Preserve existing My Work layout, Task List/Cards/Kanban/Timeline discovery and all fields. Priority P1 does not authorize expanding/refactoring those views. Exit: all P1 paths connect, data remains consistent, required fields/errors/close/recovery/returns work at desktop/tablet/phone and keyboard-only.

### P2a — internal review comments, corrections and resubmission (Owner priority)

This follows P1 immediately. From My Work or Project Tasks, open the original correction-required task → exact review round/decision comment/category/severity → existing linked correction task → inspect/perform its permitted work → complete it through current gates → return to original task/review → required updated file/link evidence → resubmit as the next round → retain prior comment/evidence/history → reviewer receives the new round. The current backend requires completion of the assigned correction task before eligible original-task resubmission; the prototype must demonstrate the blocked and eligible states rather than imply arbitrary editing is sufficient.

The focused real-account audit reads existing comments, decisions and linked correction tasks as Designer1/Leader1. It does not mutate work or prove a successful new resubmission. Client identity is not required to design this internal path; its CLIENT branch remains separately blocked.

### P2b — exact evidence and client handoff (after real Client audit)

N05 worker task → required file/link evidence E1 → N08 submitted round R1 → independent reviewer inspects snapshot E1 → request correction → correction task T-correction → updated evidence E2/resubmitted R2 → internal approval → existing authorized delivery status → N09 package P1/item I1 → N10 separate CLIENT item decision → Primary final approval → N07 Confirmed drawings lists exact E2.

Branch: formal Issue still requires its own existing authorized transmittal workflow. Branch: secondary Client can view/perform only current item actions, cannot finalize. Branch: stale/revoked evidence/current grant blocks the decision. This prototype may simulate these states only after real missing-role audit requirements are settled; never call its role picker verification.

Exit: every consequential state/actor/version distinction is understood in scenario tests; no generic approval; no evidence silently replaced; all return paths preserve source context.

### P3 — active site work and offline recovery

N06 Project → N11 Site Today → select Note/Report/Snag action → required evidence/detail → retained draft → explicitly prepared offline mode → queue pending → simulated sync conflict/reauthorization → corrected current record → independent quality/verification → management closure/handover context.

Keep actual Site rule distinctions: worker observation is not independent verification; management closure, handover, client acceptance and project completion are separate. Include missing responsible person, no authorized photo and no offline preparation. No live sync, location, camera or external transmission is performed by a prototype.

### P4 — team/Project oversight and routine records

N02 existing All teams → Team → Employee → Task detail → Project Lead context N06 → People view (current permitted controls only) → current Time context N12 → return to same manager filter. Then Workforce My vs Managed records and missing policy states. Training request/assignment links back to the same employee while official skill remains unchanged by mere training completion.

### P5 — management discovery, reports and configuration boundary

Management → Reports → Standard preview vs Saved definition vs Frozen history/run; view a source failure without erasing other context → Configuration Automation rule/history → return. Management Sales & clients → existing lead history/outcome → existing Project. Configuration contains existing policy/template/access/integration/notification/audit functions with separate explicit actions and retained capability links.

P5 prioritizes correct discovery and object distinctions. It does not create a new report engine, calendar, automatic domain mutation, credential method or global search.

## 4. Priority, dependencies and approval gates

| Order | Work | Inputs / prerequisite | Required review output |
|---|---|---|---|
| P0 | Finish absent-role fixture audit, confirm workflow ranking and IA | Owner decision D01; current unchanged accepted app | Real CLIENT/EXTERNAL evidence or explicit BLOCKED gates; confirmed priority order |
| P1 | Daily/create/detail/project continuity | Exact demo locks; owner prototype-only approval; W01–W04/W12 and SH/LS/DT/CR/ED rules | Connected desktop/tablet/phone scenario, state/error/return checklist, field and route parity |
| P2a | Internal comments → correction task → completion prerequisite → resubmission | P1 + focused current internal correction evidence | Owner-priority connected internal loop and blocked/eligible states |
| P2b | Client delivery/final/confirmed/issue distinctions | P1/P2a + real Client fixture evidence | Complete evidence/version/actor narrative and blocked branches |
| P3 | Site and offline | Site responsibility/verification/offline evidence | Phone-first complete scenario with truthful sync/conflict/permission states |
| P4 | Management/self-service | P1 scope continuity; current role capabilities | Current Project Lead/employee/site differences, no title-based grants |
| P5 | Reports/CRM/configuration discovery | Endpoint/control parity register and IA results | Every retained capability linked; configuration visibly distinct |
| P6 | Usability/visual/accessibility/parity review | All approved scenarios implemented in prototype only | Independent gate results, deviation log and explicit next application-slice proposal |

No phase auto-starts because the previous one is reviewed. A prototype-only approval states whether it covers P1 alone or a named bounded set. Application implementation requires a separate decision after prototype review.

## 5. Prototype acceptance and handoff

- At least one successful complete path and one relevant recovery/denied path for every approved scenario; no dead-end CTA or placeholder pretending to save.
- Every node has canonical sample object IDs, source ownership, current/proposed route, applicable interaction IDs and parity IDs. Role transitions occur only in the review controls; the same evidence/task versions survive them.
- Tested at1440/1024/783/768/767/390/320, keyboard-only,200% text and reduced motion where meaningful. Exact pixel comparison uses equivalent fixture state/date/scope and masks only documented nondeterministic content.
- Deliver scenario map, editable existing artifact changes, source hash manifest, screenshots, test records, approved adaptations and remaining gaps. No API/schema/auth/deploy implementation hidden in prototype work.
- Do not accept visual similarity over a lost field, inaccessible control, false permission, invented score or unreadable mobile state.

# Roles, permissions, dependencies and audit coverage

25 October 2026 · Source-grounded UX matrix. **This is not a replacement permission specification.** Latest Owner directions and approved requirements override historical exclusions. Server-side ACC/domain guards remain authoritative.

## Role coverage

| Persona / account boundary | Current supported context to preserve | Entry/priority UX | Evidence in this session | Outstanding validation |
|---|---|---|---|---|
| Owner / OWNER | Organization administration and existing Owner commands; still respects distinct review actors, exact evidence and formal domain gates | Dashboard, organization work, decisions, project oversight, configuration | Actual retained test Owner, all 28 internal entries × desktop/phone; selected project/tasks/review/documents/site | Populated records, all conditional setup/actions, no destructive/mutation testing |
| Team Leader / STAFF + current reporting/grants | Existing scoped employee/project/work management; no automatic organization visibility | Team queue, own work, workload, assigned review and decisions | Source + historical reports only; synthetic STAFF shell is not this role | Real current team scope, reporting change, cross-branch denial, own vs managed context |
| Project Lead / STAFF + assignment/authority | Project ownership/management and explicitly permitted commands; distinct from Team Leader | Project hub, Tasks/People/Reviews/Delivery | Source + Owner project view only | Real project lead session, project-only visibility, assignment loss and refresh |
| Designer/employee / STAFF | Own/scoped tasks, explicit cross-branch assignments, permitted documents/reviews; self-service data | My Work, Project Tasks, Time, Workforce, Learning | Source; actual employee session unavailable | Personal queue, allowed create/subtask, evidence submission, correct empty/denied states |
| Named internal reviewer / authorized internal account | Exact current assignment, independent review decisions and submitted evidence | Assigned reviewer inbox and exact round | Owner read of assigned round; Owner is not claimed the assigned reviewer | Named reviewer session; independence, obsolete round, correction/resubmission, revoked assignment |
| Site Staff / STAFF + site/project assignment | Active Turnkey project, current responsible-person and independent verification rules | Site Today, notes/report/snags, offline queue | Owner selected-site read; Site Staff session unavailable | Phone field work, offline/reauthorization, current assignment, independent check/closure/handover |
| Part-time/intern / STAFF | Approved grants and explicit schedules/allocations, not a separate account kind | Own work/self-service | Source only | Real configured schedule, limited scope and allocation; no invented entitlement defaults |
| Primary Client / CLIENT | Explicit current project/item grants; Primary final-approval authority and exact signature/step-up | Client project → review evidence → final decision | Anonymous portal entry + source/historical only | Real session, item/final decisions, exact evidence, grant loss, expired link, mobile evidence |
| Other Client / CLIENT | Only granted client data and existing item actions; no assumed Primary authority | Shared project/package/items | Anonymous entry + source only | Secondary role controls, no final authority, shared costs/gallery and session handling |
| Consultant / EXTERNAL | Current exact scoped grant, permitted submissions/requests; advice is not formal approval | External project evidence and own submissions | Anonymous entry + source only | Real consultant session, scope/expiry/revocation, protected downloads |
| Vendor/factory / EXTERNAL, existing VENDOR_FACTORY grant type | Existing permitted commercial/delivery evidence and submissions | Exact project/released material requests | Anonymous entry + source only | Real grant contexts, uploads/shares, no staff/client authority leakage |
| Public visitor / no session | Only published separately stored portfolio derivatives | Portfolio | Anonymous browser inventory | Populated derivative presentation, no Confidential/source leakage |

Organization → Branch → Team → Employee stays unchanged. Each Project has one owning Branch. Employee home Team/Branch, project assignment, reporting responsibility and task primary ownership are separate concepts. Labels and navigation cannot grant cross-branch access.

## Workflow and owning-module dependencies

| Workflow | Owners / read dependencies | Identity/state invariants | UX consequence |
|---|---|---|---|
| Session/navigation | IDN/ACC, WorkspaceLayout/RouteAccessibility | Active account, session refresh/expiry, Owner setup, account change and scoped source reads | Retain restoring/failed-read/signed-out distinctions and clear contextual return |
| Project lifecycle | PRJ + ORG/ACC + APR | One owning branch, explicit assignments, scope approvals, cancellation/completion gates and version/reason | Overview should not encourage casual lifecycle changes; action disclosure must retain consequences |
| Task create/assign/complete | TSK + PRJ/ACC + REV | Primary owner, immutable review requirement, plan/dependency context, mandatory evidence for new review work, receipt/retry identity | Reuse composer and Next step; never invent a quick-create payload or skip evidence |
| Internal review | REV + TSK/DOC/ACC | Current named independent reviewer; exact submitted task version/round/evidence; corrections/history | Exact object/round context before decisions; no generic approval action |
| Client review | S14 client/review + IDN/DOC + task routing | Internal approval precedes authorized automatic client delivery; exact items, Primary final approval, passkey/signature gates | Group visually while keeping item/final/internal decisions separate |
| Documents/issue | DOC + REV + PRJ/ACC | Private bytes, current Confidential ancestor/file access, immutable checksums, formal transmittal and superseded history | Confirmed drawings is a read projection, never a synonym for Issued |
| Typed decisions | APR + each owning domain | Current designated actor/type/state/evidence; ordinary domain finalization | Decisions routes to owning action; notice acknowledgement does not decide |
| Time | Time/TSK/PRJ/ACC | Server units/date/rounding, active records, overlaps, approvals/locks and corrections | Human-friendly formatting must not change calculation or payload semantics |
| Workforce | WFM/ORG/ACC + current schedules/approvals | Configured policies only, dated allocations, carry-first expiry, overnight dates, future-only cancellations | Self-service and setup can be separated visually; no invented policies or defaults |
| Performance/health | PER/HLT + current source ports | Explicit approved formulas/dated groups, current source access, unavailable required inputs stay unscored | Read-first results and disclosed policy setup; no attractive fabricated score |
| Reports | RPT + authorized domain sources; AUT definitions/runs | Source/field authorization, distinct preview/frozen snapshot/definition/run; read/export rechecks | One navigation home can link distinct types; do not merge their persistence |
| Automation/assistance | AUT/S27 + current source/event ports + APR | Internal notices/report generation only; deterministic assistance, nonbinding recommendations, human finalization | Avoid promises of automatic business-state change or live inference |
| Learning | SKL/TRN/Library + current publication/access ports | Official rating vs request; exact SOP/module version; named review/effectiveness; publication/acknowledgement | Explicit Skills/Training/Library views and truthful prerequisites |
| Turnkey/site | BOQ/procurement/factory/SITE + REV/DOC/WFM/ACC | Approved released input, cost/procurement authority, responsible person, independent checks, handover | Contextual project delivery with distinct operational gates |
| Offline site | SITE/DOC/IDN + account/project IndexedDB queue | Explicit preparation, retained drafts, idempotent sync, current access rechecked, conflicts visible | Do not auto-prepare/sync just because a page is opened |
| CRM/integrations | CRM/INT/PRJ/ACC | Signed configured enquiry, fixed branch, won-lead/client linkage, minimal calendar labels | Improve discovery while preserving owning branch and intake behavior |
| Gallery/portfolio | S14/S15/DOC | Granted private items vs separately sanitized public derivatives; explicit publication | Separate private presentation and public publication workflows |

## Audit continuation checklist

Use existing approved sessions/records where possible. Do not seed or migrate retained databases to fill the audit. If a necessary state is absent, request a separately scoped disposable fixture before executing state changes.

1. Real Leader and Project Lead desktop/phone navigation; confirm ordinary employee cannot see their management scope.
2. Real employee task create, evidence requirements, handoff and reviewer entry; audit read-only up to submission first.
3. Site Staff phone task/report/snag capture and offline queue states, including revoked access. Mutation acceptance belongs to a later controlled phase.
4. Primary/secondary client and consultant/vendor/factory walkthroughs, with exact permitted evidence and differing decision controls.
5. Populated drawing register, issue history, packages, reports/frozen runs, training/publication and private/public gallery states.
6. 320/767/768/783/1024/1395 breakpoints, zoom/keyboard/screen reader and slow/error/conflict states.
7. Establish task-success/navigation/time baselines with actual users. Do not infer them from screenshots or historical test counts.

Completion requires evidence per row, not simply another screenshot of the Owner view. The current master plan is reviewable before that continuation, but cross-role audit completion is not claimed.

# CEO review — My Work architecture

Date: 13 October 2026
Mode: HOLD SCOPE, explicitly selected by Owner in this chat (D1).
Status: CEO Sections 1–11 evaluated; D1–D4 selected by Owner. Engineering review of the consolidated plan is complete after E1 selection. This is plan evidence, not application acceptance.
Context/architecture intake: GPT-6.1 Sol. No application changes or tests/live operations.

## System boundary

```text
Signed-in My Work workspace
  |
  +-- Task source port ------> task access + actual next command
  +-- Named-review port ----> exact round + evidence + reviewer policy
  +-- Decidable-approval port -> pending/expiry/delegation/domain policy
  |
  +-- Existing task drawer / exact review / domain approval destination
                                  |
                          Owning authorized command
                                  |
                          persistence + audit/events

Task setup -> configured presentation profile -> canonical Create form
Canonical tasks -> immutable child links -> all-path completion guards
```

A shared row design does not change the owning command, data classification, task total, actor identity or access rule. The exact demo remains authoritative for presentation. Optional creation hints grant no authority.

## Four read paths

```text
request + active actor -> domain-owned eligibility -> source rows/count
         |                       |                         |
         + missing session       + denied identity         + ready >0
           clear protected UI      clear source data         show real rows
         + missing profile       + inaccessible object     + ready 0
           generic presentation    uniform unavailable       truthful empty
                                 + upstream failure        + incomplete/stale
                                   explicit source error     no exhaustive claim
```

- Employee-less Owner: personal task count remains zero. Independently authorized management and decision work remains reachable; five genuine reassignment holds retain the settled automatic disclosure.
- A failed/missing/loading/denied source is not converted to an empty result.
- Task eligibility is actor-action-specific. Ordinary In Progress, collaborator membership or a free-text waiting party does not establish an action.
- Assigned reviews retain round/submission identity; approvals require decidability, not only visibility.
- Hidden child tasks produce a generic completion blocker without leaking their identities.

## D2 — One ordered attention queue selected

**Established:** separately typed sources and honest separate counts are approved. Owner selected one mixed globally ordered server-paged queue in this chat. The alternatives below retain the reasoning; B was not selected.

Evidence: docs/development/APP_ACTIONS_SUBTASKS_CONTRACT_2026-10-13.md:7 explicitly permits independently paginated sections initially and describes a complete mixed server projection as later work. The supplied demo uses one task list. The Owner's goal is to identify the next work quickly.

### A. One server-paged attention queue — primary recommendation

Tasks, current assigned reviews and decidable approvals use one compact ordered list with explicit source badges and separate count chips. Keep management reassignment presentation and Owner personal zero unchanged. Opening a row uses its canonical task/round/request destination.

The server must apply authorized eligibility, source-aware filters, stable ordering and pagination to the complete contributing result set. Do not concatenate already paginated frontend arrays. Deduplicate task reasons by task ID; preserve distinct review rounds and approval requests. Do not label the sum of these sources as personal tasks or introduce a fabricated total.

Effort: L across domain read ports, bounded composition and frontend integration. Main risk: incomplete enumeration or mismatched source filtering/order. Coverage of the requested final attention experience: 10/10 once verified.

### B. Separate source sections with the same row design

One workspace contains Tasks, Reviews and Decisions sections, each with its own exact count, pagination, loading/error and filters. Reuse the currently approved source contracts with less orchestration. Source boundaries are immediately visible.

Effort: M. Main limitation: users compare sections themselves to decide what to work on next; no globally ordered next-action list. Coverage of the requested final attention experience: 7/10.

**Decision: A selected by Owner for this plan.** This planning decision does not authorize live database operations or acceptance runs. No single-feed implementation was performed by this review.

## Architecture checks already constrained by approved rules

| Concern | Review requirement |
| --- | --- |
| Count/dedup | Task ID once within task source; round ID/request ID retained. No sum relabeled as tasks. Exact count and page share eligibility. |
| Ordering | Real applicable deadline, existing priority where meaningful, stable source/ID tie-breaker. No invented urgency tiers. |
| Source failure | Explicit per-source incomplete/unavailable state; successful sources remain usable without an all-clear claim. |
| Cross-domain coupling | Read ports compose; writes remain in TSK/REV/APR/SITE/TIM/DOC. No replacement Task lifecycle. |
| Subtask data | Current schema uses TaskSubtaskLink; earlier contract proposes parentTaskId. Engineering must reconcile one representation, not add both. |
| Completion | Parent lock serializes child insertion/completion; all service completion paths plus SQL guard require persistence/concurrency proof. |
| Rollback | Additive schema and opt-in hints; disable new UI/read entry before reverting compatible code. Retain data; no automatic down migration or destructive restore. |
| Scaling | Do not call task detail per row or treat capped source scans as exhaustive. Index/paging/query-budget evidence required; no measured latency claim yet. |

## Current source versus acceptance

Current source contains creation-profile resolver/storage/configuration, child links/endpoints/migration and partial approval actionable reads. The complete attention UI/projection and final acceptance are not established.

Earlier accepted drawer evidence remains valid for its recorded source hashes. Concurrent additions need their own current-source tests, persistence/security/concurrency and authenticated four-viewport evidence.

## CEO Section 2 — Error and rescue map

Evaluated after D2. No additional product decision is needed: existing truthfulness, independent source states and ordinary command protections constrain recovery.

| Codepath / error | Cause | Required recovery / user state | Verification to add or retain |
| --- | --- | --- | --- |
| Session authentication, HTTP401 | Session ended or actor no longer active | Clear protected rows/counts; ordinary sign-in. Discard late responses from the old session generation. | Session loss during initial load, refresh and open drawer |
| Source ForbiddenException / HTTP403 | Current authority unavailable | Clear that protected source; generic denied state; preserve other authorized source destinations. | Foreign organization/branch, removed assignment, delegated authority expiry |
| Exact item NotFoundException / HTTP404 | Missing or inaccessible item/round/request | Uniform unavailable state; no hidden identity disclosure | Deep-link tampering and stale references |
| Successful empty source | Eligible result genuinely has zero rows | Exact zero/empty state. Employee-less Owner remains zero personal tasks. | Empty source versus denied/loading/error distinctions |
| Mixed-source read/network/DB timeout | Required source cannot supply a complete result | Mixed queue unavailable or explicitly stale; no fresh complete page/total claim. Keep independent known source states/counts and existing authorized destinations accessible. Read-only Retry. | Each source fails independently; no exception converted to zero |
| Review/task ConflictException / HTTP409 | Version, active round or project state changed | Refresh authoritative detail; retain safe draft; explicit user resubmission | Stale versions and authority lost after render |
| Approval ConflictException / HTTP409 | Request resolved or expired | Refresh/remove obsolete action; never automatically repeat a decision | Resolution/expiry race |
| Approval ForbiddenException / HTTP403 | canDecide, delegation or self-approval rule fails | Owning workflow explains current unavailable action; no generic bypass | Handler-specific self-approval exceptions and delegation expiry |
| Creation profile missing/conflicting | No one configured hint | Generic Employee presentation; permissions unchanged | Missing/conflicting/Owner precedence cases |
| Role configuration ConflictException / HTTP409 | Expected prior setting changed | Reload current configuration; explicit resubmit | Concurrent Owner edits |
| Subtask ConflictException / HTTP409 | Parent version/state/project or child set changed | Refresh parent and eligible choices; preserve safe draft | Cross-project, second level, stale parent, insertion/completion race |
| Parent completion blocked | Any child is not completed | Generic blocker; independently authorized child rows only | All service completion paths and database bypass rejection |
| Strict input HTTP400 | Invalid fields/query/reason | Field-level correction; no automatic mutation retry | Missing/oversized/malformed/unknown fields |

Actual current domain methods expose successful pages or throw. The mixed source-state envelope is a planned addition, not existing accepted behavior. Unknown programming/DB failures must propagate to a controlled source-unavailable response and structured diagnostic record; they must not be swallowed as ineligible rows.

## CEO Section 3 — Security and threat model

Evaluated. No new product-policy choice is required. The plan must retain these existing boundaries:

| Threat | Likelihood / impact | Required mitigation and proof |
| --- | --- | --- |
| Foreign IDs / branch leakage / count inference | Medium / High | Derive actor/organization from session; authorize rows and totals before projection; test task/project/round/request tampering |
| Approval visibility mistaken for authority | Medium / High | Shared domain decidability evaluator with pending/expiry/delegation/self-approval rules; recheck under command locks |
| Review evidence or reviewer identity leakage | Medium / High | Exact current round/submission, named reviewer and evidence authorization; no inferred task destination |
| Hidden child leakage / implicit access inheritance | Medium / High | Independent parent/child authorization; generic completion blocker; no hidden IDs/counts without contract |
| Parent completion race or alternative-path bypass | Medium / High | Parent lock, all completion service paths, SQL invariant and real concurrency acceptance |
| Presentation hint grants authority | Medium / High | Hint selects form presentation only; canonical assignment/site/create capability checks remain authoritative |
| Stale data retained after session loss | Medium / High | Generation-guarded response handling and protected state removal |
| Saved preferences expose protected data | Low / Medium | Store preference identifiers/settings only; reauthorize restored filters and destinations |
| CSRF / repeated command | Medium / High | Existing same-origin/session/CSRF guards, expected versions and command receipts where provided; no automatic mutation retry |

These are acceptance requirements, not claims that current concurrent source has passed them.

## CEO Section 4 — Mixed-filter decision selected (D3)

D2 settles one queue. Task-specific predicates do not have the same meaning for reviews and decisions:

- Tasks use canonical TaskStatus, TaskType, primary owner, Target/Committed and plan item.
- Reviews use exact round state, named reviewer and their domain deadline.
- Some approvals have no task/project link or task status/owner at all.

Owner selected: shared filters use common supported meaning; applying a task-only filter visibly scopes the queue to Tasks. Review/decision-specific filters scope their own source. Clear restores the mixed queue. Keep all current task filters available in My Tasks and the task-source scope. Never map In progress to a pending approval or primary owner to designated reviewer.

Alternative: leave review/decision rows visible while task filters apply only to task rows, with explicit unfiltered-source labels. This is usable but makes the mixed results harder to interpret.

D3 is settled by the Owner in this chat. The alternative above is not selected.

Evidence: task.controller.ts:53–65; task.service.ts:246–285,393–428; review.service.ts:155–188; approval.service.ts:140–181; task-subtask-policy.ts; organization.service.ts:125–141; task-creation-profile.ts; my-work-attention.tsx:200–207,291–315; APP_ACTIONS_SUBTASKS_CONTRACT_2026-10-13.md:7–17.


## CEO Section 5 — Code quality

Evaluated. No additional product choice. Use one typed source contract and query/context parser. Domain evaluators own access; composition owns ordering/paging. Reconcile the subtask contract to the implemented immutable TaskSubtaskLink after engineering verification; do not add a duplicate parent field. Extract creation presentation from task.tsx without duplicating canonical submit/capacity/assignment logic. Keep current callers compatible and avoid parallel status enums, count predicates and catch-to-empty recovery.

## CEO Section 6 — Test design

Evaluated. All listed paths require evidence; no new tests were run for this plan.

```text
SESSION -> eligible domain rows -> complete source envelopes
       -> count/dedup/order/page -> mixed UI -> exact destination
                                    |
                            D3 task-only filter
                                    |
                         visible Tasks scope -> Clear -> mixed

CREATE profile -> required fields -> validation -> canonical submission
                                            -> capacity/conflict rescue
PARENT -> authorized children -> independent workflow -> completion gate
                          INSERT CHILD <-> COMPLETE PARENT (serialized)

ASYNC: late responses, source timeouts, revocation, two tabs
JOBS / EXTERNAL TRANSMISSION: none introduced
```

| Layer | Required behavior coverage |
| --- | --- |
| Unit / frontend | Missing/conflicting profile; query validation and D3 restoration; dedup/order ties; counts; loading/empty/denied/stale/incomplete; draft/Back/focus; all modes and local preferences |
| API / real PostgreSQL | Actor/branch/round/request authorization; count-page parity; approval expiry/delegation/self-approval; child persistence/isolation; all completion paths and SQL guard |
| Concurrency | Child insert versus completion through TaskService, ReviewService and ClientReviewService; stale parent and role-setting edits |
| Authenticated browser | Four personas, genuine five holds, populated/Waiting; mixed pages; Create/detail/children; search/filter/view/command/touch/keyboard and four exact viewports |
| Chaos / recovery | A source timeout during session revocation and late responses; no stale private data, false zero or automatic command replay |

Freeze calendar/time boundaries and seed deterministic fixtures. Do not loosen assertions/timeouts to conceal failures. Compare failure names and hashes on the same candidate; earlier evidence is not a current whole-tree PASS.

## CEO Section 7 — Performance

Evaluated. No new product choice. Main risks are complete approval policy scans, review/evidence access and exact cross-source counts/order. Do not fetch the whole queue in the browser, call full detail per row, silently cap totals or add speculative infrastructure.

Measure query count, candidate/eligible rows, memory, transaction duration and pool occupancy with representative authorized fixtures. Review indexes against actual predicates and explain evidence. Reuse authorization only within its current transaction. No cross-user protected cache or invented p99 claim.

## CEO Section 8 — Observability and recovery

Evaluated. Use existing structured logging with request/source correlation, outcome, duration, completeness, filter scope and safe counts/conflict class. Redact task titles, evidence, emails, credentials and tokens. Track source-failure/incomplete rates, queue latency and stale conflicts. No new dashboard product is added.

Runbook: retry reads safely, verify active session/source health, retain diagnostic evidence; do not automatically repeat writes, reseed or restart infrastructure.

## CEO Section 9 — Rollout and rollback

Evaluated. Candidate source hashes -> source/static gates -> separately authorized dedicated migration/preservation tests -> concurrency/security/browser evidence -> Owner acceptance.

Deploy reviewed additive schema before dependent code. Verify the actual migration tip; do not assume retained115 equals the current source tip. Keep earlier deployed migrations and data intact.

Once child links exist, rollback must retain their database completion/link constraints. Disable new entry surfaces while keeping data and invariants; no destructive down migration, detach, restore or deletion. Verify old commands produce controlled blocker errors against retained constraints. Environment and production authorization remain separate.

## CEO Section 10 — Long-term trajectory

Evaluated. Read projection is relatively reversible (4/5); immutable persisted child relationships are less reversible (2/5). Document source IDs, source-aware filtering, domain deadlines, role-hint nonauthority and child locking. Reuse typed read ports for later approved sources without turning every domain object into a Task.

Previously deferred private-task, mixed-team, names/photos and missing Site policies remain explicit. No new expansion or TODO scope is proposed by this Hold-scope review.

## CEO Section 11 — UI/UX and reference conflict

Evaluated. Owner selected D4 option A: exact fills with dark labels; other contrast changes stay minimal and evidence-based.

```text
My Work -> loading / truthful empty / denied / unavailable-stale
        -> ordered rows + separate source counts
        -> task-only filter -> visible Tasks -> Clear -> all work
        -> exact task / review / decision -> authorized action
        -> success refresh OR explicit conflict recovery
        -> Create -> progressive required fields -> real result
```

For queue, cards, drawer, Create and children specify loading, empty, denied/error, success, incomplete/stale, session loss and dirty/busy departure. Preserve demo hierarchy and current state/interaction fixes. Verify 1440x900,1024x900,390x844,320x740 with keyboard/native modal focus and practical44px mobile hit targets. Do not make arbitrary spacing cuts or hide controls for screenshots.

### D4 — Minimal contrast exception to exact demo tokens

The source demo's small white status text calculates below the normal-text4.5:1 threshold: Not started3.8201, In progress4.1052, Completed3.9172. This is a reference-source calculation, not a fresh authenticated application defect or screenshot result.

[W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) requires at least4.5:1 for normal text. The source uses small status labels, so the large-text exception does not apply. Source muted text on cream is3.7679; the source focus outline against white is2.3066 and also needs rendered-state review.

Two bounded alternatives:

| Pair | Demo | A: exact fill, darker label | B: darker fill, white label |
| --- | --- | --- | --- |
| Not started | white on #758496,3.82 | #0b100d on #758496,5.02 | white on #687586,4.69 |
| In progress | white on #2384be,4.11 | #0b100d on #2384be,4.68 | white on #2079af,4.76 |
| Completed | white on #2b916a,3.92 | #0b100d on #2b916a,4.90 | white on #27835f,4.67 |

Recommendation A: preserve exact semantic fills and use a very dark label only where needed. In either option, minimally strengthen secondary text/focus where required; keep the remaining palette, layout and interaction design. Candidate muted text #667069 on cream is4.72; pine #244f43 can supply the stronger focus edge while retaining the reference ring as decoration.

Evidence: MY_WORK_REFERENCE_CONTRAST_EVIDENCE_2026-10-13.json; comparison: MY_WORK_REFERENCE_CONTRAST_OPTIONS_2026-10-13.svg. Ratios are evaluated unrounded. Final computed styles and all states must be checked after implementation.

D4 option A is adopted for the plan. No application style was changed during this planning review.

## GSTACK REVIEW REPORT

- D1: HOLD SCOPE selected.
- D2: one globally ordered server-paged queue selected, with separate source counts.
- D3: task-only filters visibly select Tasks; Clear restores the mixed queue.
- CEO Sections 1–10: evaluated; technical/verification requirements recorded.
- D4: exact fills/dark labels selected; minimal contrast exception recorded.
- CEO Section 11: evaluated; no unresolved CEO choice.
- Engineering: complete on MY_WORK_DEMO_PARITY_CONSOLIDATED_PLAN_2026-10-13.md after Owner E1 selection; see MY_WORK_ENGINEERING_REVIEW_2026-10-13.md.
- Refero: preparation research and source lock retained in MY_WORK_PARITY_REVIEW_BRIEF_2026-10-13.md.
- No test, DB, service or application mutation performed.

NO UNRESOLVED DECISIONS


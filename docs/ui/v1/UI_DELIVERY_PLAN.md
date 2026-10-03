# UI v1 delivery plan — review draft

2026-10-01. This is the compact handoff for the existing workflows, mockups and contracts; it is not another UX specification. Core design is under review, not frozen. Planning permission does not authorize application changes or later product slices. Read current project status when implementation begins: S14's concurrent completion supersedes older foundation-only wording.

## What this plan commits to designing

Everyone enters My Work. Attention precedes tasks. Desktop and mobile support the same authorized work. Graphics explain recorded location, ownership, dates, stages, review rounds and revisions; exact labels and evidence remain visible at decisions. No dashboard, percentage or visual shortcut creates business authority.

| Order | Contract / requirements | Deliverable and exit condition |
| --- | --- | --- |
| 1 | SC-00/01; UI-D01; R-004–009/R-071/R-099 | Responsive shell, accessible current location, protected deep links and return navigation. Keep existing routes usable. |
| 2 | SC-02; UI-D02; R-018–029/R-058/R-096–097, C-023/024 | Attention-first My Work, explicit personal scope, filters and read-only preview. Owner without employee gets honest personal empty state. Complete counts/search require the reviewed read contracts below. |
| 3 | SC-03–06; UI-D03; R-011–039, C-010/011/016/024 | Stable project header, Overview/Tasks/Reviews/Documents. Recorded applied plan, stage gates and lifecycle reasons. Separate incomplete personal inbox from project register. |
| 4 | SC-07/08; UI-D04; R-018–030/R-037, C-023 | Task, exact submission, independent review, correction and resubmission together. Date, waiting, reason, version and evidence guards use existing commands. |
| 5 | SC-06; DOC/REV; R-035–039 | Exact drawing register and file access, approved versus working versus issued/superseded states; honest upload finalization. Reuse the reviewed project layout. |
| 6 | UI-D05/UI-V01; SC-00 | Extract components from these screens, complete state/accessibility review and settle four Owner choices; freeze the concrete package. |
| 7 | Existing owning slices; separate contracts before work | Then design CRM, full Decisions, People and Administration. S14 portal redesign is a separate presentation contract against its completed source; S15+ remains separately authorized work. No inert production destinations. |

Implementation follows this same shell → My Work → workspace → task/review → register order after freeze and bounded authorization. Components are extracted as screens mature; stage 6 consolidates them rather than delaying reuse. Each increment declares requirement sub-IDs, source/callers, dependencies, in/out scope, acceptance and checks before application edits.

## Research selection without scope inflation

The research appendix contains 60 proposals, not 60 promises. Preserve its N/C/L classifications (37/15/8). The following are recommended core design directions pending review; partial treatments are not completed features.

| Disposition | Candidate IDs | Contract / boundary |
| --- | --- | --- |
| Refine representative core mockups | 01, 02, 10, 11, 12, 15, 16, 19, 20, 21, 22, 23, 24, 29, 31, 32, 33, 35, 36, 41, 43, 44, 46, 48, 49, 51 | SC-01–08. Existing mockups show representative anatomy, links and graphics; forms/viewer/comments are partly illustrative. Production completeness is unclaimed. |
| Newly explored together | 07, 08, 09 | SC00-P. Read-only modal preview, context return and density disclosure. 08 is partial; no independently interactive split view. |
| Useful N-class ideas kept in the design backlog | 03, 13, 17, 25, 27, 34, 42, 52 | Reviewed navigation launcher; date/group disclosure; history; pending board choice; permitted relationships; real annotation pins; existing notification preferences. No launcher, graph or proofing implementation inferred from icons. |
| Conditional read/capability contracts | 04, 05, 06, 14, 18, 26, 28, 30, 37, 38, 39, 45, 47, 50, 53 | Resolve scope/data/permission/version/cache rules first. Exclude these from the initial build unless specifically selected with an approved owning contract. |
| Later product scope | 40, 54, 55, 56, 57, 58, 59, 60 | No checklist task model, focus planning, capacity, subjective confidence, scheduled check-in, automation, analytics or AI implied by v1 graphics. |

## Field/action handoff and unresolved read models

Routes below were inspected in current controllers; payload completeness and effective access still require service/caller review in each authorized increment. Never replace that review with this table.

| Screen field/action | Current owning source | Needed before implementation / safe fallback | Acceptance |
| --- | --- | --- | --- |
| Identity, destinations, deep-link return | IDN/ACC, existing session and capability sources; SC-01 | Reuse protected session handling; review route compatibility. Destination visibility is not authorization. | Denied deep link leaks no metadata; permitted link survives login; list context returns. |
| Personal task identity, owner, dates, status | TSK: GET /tasks?scope=mine&offset&limit, GET /tasks/:id, /tasks/setup | Review employee-less Owner result and collaborator semantics. Current list accepts scope/offset/limit, not proposed project/date/search parameters. Complete personal query/read composition is a gap where needed. | Actual own/collaborator scope; no replacement with all assigned staff; distinguish absent dates. |
| Attention reason/source/destination | APR GET /approvals/attention; REV GET /reviews/inbox; scoped recovery sources | Compose authorized actionable sources and stable IDs without rewriting notifications. Review reassignment/hold source completeness. No aggregate count until complete authorized totals exist. | One source action, correct named actor, exact destination; notification read never resolves it. |
| Task/project search, date/state filters and totals | TSK list/detail | Server-filter/pagination contract is unresolved. A loaded-only filter must say so and cannot look like a complete register. Prefer resolving required complete list contract before release. | Multi-page fixtures; denied IDs/branches; filters remain through paging and return. |
| Project header, baseline/applied stages/gates | PRJ GET /projects/:id and /projects/:id/plan | Reuse retained applied plan/version; review list requires branchId and paging. Project picker only lists actual authorized results. | Correct owning branch/lead; later template edit does not change applied version; no invented percent. |
| Project Tasks register | TSK existing list/detail, PRJ project source | Project-scoped complete query is a gap; do not filter one arbitrary page into a supposedly complete project list. | Every result is in permitted project; stopped/closeout remain distinct. |
| Project Reviews register | REV /reviews/inbox and /reviews/tasks/:taskId | Inbox is personal, not project register. Review a scoped complete project read model; until available label only the real source scope or omit complete-register claims. | Empty personal inbox never means no project submissions; exact rounds retained. |
| Task writes, reasons, current action | TSK detail/setup and existing state/date/wait/reassign/dependency/extension commands | Keep backend capability, expectedVersion, CSRF and reason rules. Inspect command-specific idempotency; no generic state dropdown or auto-retry. | Denied/tampered actor, stale version, real persistence, reason/audit and affected state guards. |
| Review evidence/decision/correction | REV task detail/current commands; exact DOC/REV streams | Keep immutable task/round/file/revision; independent named reviewer; correction assignment separate. Historical selection is read-only. | New upload never replaces evidence; denied file blocks decision; completing correction does not approve parent. |
| Files, revision states, exact streams | DOC GET /documents/projects/:projectId; /documents/files/:fileId/stream; REV register GET /revisions/projects/:projectId and exact /revisions/:revisionId/stream | Current ordinary document stream uses attachment disposition. Embedded viewer/thumbnail processing is conditional, not supplied by a styled placeholder. Recheck exact access and Confidential ancestor grants. | No raw paths; authorized immutable bytes; Working/Approved/Issued/Superseded separate; revocation clears content. |
| Global Documents | Authorized project picker → existing project-scoped sources | Recommended fallback: global navigation opens project picker. Cross-project register needs explicit complete scoped read model; never fetch every project's files client-side. Owner choice pending. | Denied project filenames/counts absent; incomplete results not presented as complete. |
| Upload progress/finalization | DOC existing chunk/finalize/abort commands | Reuse current resumable contract. UI distinguishes transferred bytes from completed registration. No new offline sync. | Failed finalization produces no success; retries follow current contract and avoid duplicate register entries. |
| Preview/density preferences | SC00-P, current permitted task fields | Session-local prototype only. Production preference persistence requires separate reviewed storage boundary. Clear cached preview on role/session/access loss. | Preview has Open full task as its sole primary action; close returns focus; no mutations. |

## State coverage and evidence levels

Use R = rendered prototype, A = automated presentation checks, V = screenshot inspected, H = actual human review, P = real persisted application acceptance. R/A/V do not establish H/P. Current 630 assertions cover representative screens/personas/widths and preview flows; detailed evidence is REVIEW_AND_VERIFICATION.md. No complete accessibility claim.

| Component family | Required states / special cases | Current evidence / remaining work |
| --- | --- | --- |
| Shell, rows/cards, filter/disclosure, preview | Ready/loading/empty/error/read-only; focus/current location; filter-no-results; access-loss clearing | Representative R/A; selected V. Human review, real session revocation and complete search remain pending. |
| Attention and counters | Healthy section with failed sibling; employee-less Owner; unavailable/partial total | Representative R/A; no P for this new composition. Review each source and unavailable counts. |
| Stage/gate map | No plan, unmet gate, lead-exit hold, cancelled delivery, unavailable state | Representative ready R/A/V. Dedicated edge fixtures required; no diagram-derived transitions. |
| Date/wait/relationship display | Pending/rejected extension; ordinary vs exit Waiting; hidden predecessor; early-start warning | Pending/exit examples R/A/V. Dedicated rejected/hidden/early-start review fixtures required. |
| Evidence/round/correction | Loading/failed evidence disables decision; historical read-only; newer upload; stale write; correction loop | Exact identity/history representative R/A/V. Viewer is a placeholder; full connected form/error fixture and P remain pending. |
| Revision/upload/viewer | R0 superseded/R1 approved/R2 working; separately issued; unsupported/denied preview; transfer/finalization failure | Representative revision R/A/V. Exact issued/finalization/error fixtures and real viewer acceptance remain pending. |

## Definition of a solid handoff

Owner-requested review refinement: SC08-C specifies a conversational PDF/image canvas inspired by ChatGPT's selection-and-chat interaction: exact evidence header, large canvas, numbered human-feedback pins/messages and separate formal decisions. This refines SC-08, UX03/04 and candidates 41/42/43/44/49/51. It does not add AI editing, alter immutable evidence, imply a freehand/region renderer or settle conditional revision comparison. Apply it in the next fictional review mockup before accepting that screen. Existing 630/477 checks predate this new direction and do not verify it.

Concrete canvas experiment is now review-canvas.html, opened separately from the original Review screen. Its fictional SVG sheet supplies a real point/pin interaction without claiming PDF rendering. review-canvas-verification.json records its independent presentation checks; no counts from the earlier main mockup/storyboard establish this experiment's acceptance. Human comprehension, assistive-technology review, production renderer/stream mapping and real command/access tests remain pending.

1. Every core screen has SC-00 plus its explicit contract; each selected pattern has a source and safe unavailable state. Later screens stay in a contract queue, not falsely marked designed.
2. Five graphics comprehension fixtures in UX_WORKFLOW_PLAN.md have concrete state examples and an honest review worksheet. An incorrect owner/date/revision/decision-target interpretation blocks acceptance of that visual. Record friction; do not invent time savings.
3. Prototype checks at 320/390/768/1024/1440px, keyboard/dialog focus, 200% text/zoom wrapping, meaningful names, reduced motion and colour pairings are recorded. Full screen-reader/touch/human review remains separately recorded until actually performed.
4. Owner selects density, list/board, document entry and palette/typeface against actual screens. Recommendations stay provisional until the reply. Conditional API feasibility is an engineering dependency, not an extra aesthetic decision.
5. Owner accepts the corrected concrete package. Record wording/date and mark FROZEN — OWNER-APPROVED. A generic request to continue planning is not a freeze decision.
6. Each build increment reviews current service DTOs/callers and expands requirement clauses; obtains relevant authorization; verifies real access/persistence/evidence/concurrency/audit and applicable pnpm verify gates. No invented APIs, changed guards or later scope.

Dedicated edge/connected scene fixtures are now available in workflow-fixtures.html, with 477 separate automated presentation checks; they illustrate behavior rather than execute forms or commands. Known remaining blockers to freeze: Owner choices, human comprehension and full accessibility review of the concrete package. Known implementation dependencies: complete scoped read models/routing, real viewer capabilities where selected, and executable form/command recovery acceptance. No app code, data, schema or product slice completion follows from this handoff.

Accessibility reference: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/). Verify normal text at least 4.5:1, large text at least 3:1, and essential non-text indicators at least 3:1 against adjacent colours as applicable. The product's 44px mobile target is a design convention, not a claim that WCAG AA universally requires 44px. Decorative separators are not required state indicators. Measure actual rendered pairings and focus behaviour before claiming conformance.

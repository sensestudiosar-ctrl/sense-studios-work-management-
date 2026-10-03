# Work-management design research for Sense Studios

Research date: 2026-10-01. Status: candidate research appendix to UI-V01; not approved requirements, an implementation commitment or UI freeze.

## Recommendation

Use Linear's focused navigation/list controls, Notion's restrained detail hierarchy and Wrike's evidence-centred review patterns as the main references. Add Asana's personal-work organization, Teamwork's client-project context and Basecamp's progressive disclosure where useful. Consider selected ClickUp, monday.com and Trello interactions without adopting their flexible business models wholesale.

This is a design judgment, not an objective ranking of the “best-looking” products. Sense Studios should retain warm neutral surfaces, forest accents, readable type and equal mobile/desktop workflows. Its distinctive visual language should centre on recorded stages, responsibilities, dates, correction rounds and drawing revisions. More charts do not necessarily improve communication.

## Evidence and limits

Reviewed official documentation and product pages for nine products: Linear, Asana, Notion, Wrike, Teamwork.com, ClickUp, monday.com, Trello and Basecamp. Source links below support the observed reference patterns; every Sense Studios adaptation, classification and acceptance check is our own proposal. Some ideas synthesize several patterns rather than copy a competitor feature. Availability/pricing by tier was not assessed.

Public-page browser inspection captured Linear's illustrated display-options panel, Notion's layout example and Wrike's proofing page. Screenshots are in research/. These are public documentation/marketing references, not authenticated app testing. The Wrike detail capture did not fully load an interactive product illustration; it is not evidence of a tested comparison viewer. The Asana help pages returned a CSS/loading error when opened; their indexed official snippets and the accessible feature page provide limited evidence. The large Asana release-kit PDF could not be fetched and was not used for visual conclusions. No accounts were created, private data uploaded, competitor interaction benchmarks measured or marketing performance claims adopted.

Project context was interpreted by GPT-6.1 Sol; bounded competitor research used GPT-6 Luna; primary-agent synthesis and review completed this appendix. Current S14 continuation has implemented additional client workflows but remains IN PROGRESS for final acceptance. It supersedes older foundation-only descriptions. S15+ remains unauthorized; UI v1 remains in DESIGN REVIEW. Existing 555 checks apply to our fictional prototype, not these new research candidates.

## What to borrow from each product

Prototype disposition (2026-10-01): candidates 07/08/09 have been explored together in the fictional mockup as read-only task previews, context-preserving detail return and a My Work density disclosure. Candidate 08 is partial: desktop uses a modal side panel, not an independently interactive split view. No editable properties, changed state transitions, saved preferences or API access were introduced. Latest evidence is 630 presentation assertions at 2026-10-01T06:11:04.462Z; see REVIEW_AND_VERIFICATION.md. The other candidates remain proposals unless separately identified as existing mockup patterns. This increment does not settle the four Owner choices or authorize a build slice.

| Reference | Documented strength | Sense Studios judgment / boundary |
| --- | --- | --- |
| [Linear display options](https://linear.app/docs/display-options) | Grouping, ordering, field visibility and list/board controls | Excellent reference for controlled information density. Keep essential dates/evidence visible; do not copy drag-to-change-state semantics. |
| [Asana features](https://asana.com/features) | Personal tasks, multiple work views, approvals and proofing | Useful for recognizable daily work. A task completion checkbox cannot bypass our review gates. |
| [Notion layouts](https://www.notion.com/help/layouts) | Prominent properties, secondary detail panels and tabbed content | Strong match for a quiet studio interface. Adopt fixed reviewed layouts before any user-built layout system. |
| [Wrike proofing](https://www.wrike.com/features/online-proofing/) | Asset-local feedback and side-by-side versions | Strong drawing-review reference. Preserve exact immutable file identity and independent approval authority. |
| [Teamwork task lists](https://support.teamwork.com/projects/planning-managing-work/tasks-all-active-tasks) | Scoped cross-project lists, collapsible grouping and task detail access | Good agency/project context. Preserve single project/owning branch and explicit employee assignment. |
| [ClickUp My Tasks](https://help.clickup.com/hc/en-us/articles/31007956275863-My-Tasks) | Assigned work consolidated into a personal hub | Borrow scanning efficiency; avoid another competing home page or unapproved personal-task data model. |
| [monday.com My Work](https://support.monday.com/hc/en-us/articles/360019300579-My-Work) | Date/status/priority organization of assigned items | Useful view presets. Colours must retain labels; dates need our Target/Committed distinction. |
| [Trello navigation](https://support.atlassian.com/trello/docs/navigation-in-trello/) | Board/inbox/planner combinations | Borrow spatial continuity and simple cards. Board remains a pending choice and planning blocks are not deadlines. |
| [Basecamp projects](https://3.basecamp-help.com/article/25-projects) | Focused project tools and chronological activity | Borrow uncluttered project areas, not unrestricted tool removal or a new organizational hierarchy. |

## Classification for all 60 candidates

- **N — Design now:** existing-state presentation or navigation pattern that can be reviewed now. Production implementation still requires frozen contracts, actual API/capability mapping and bounded authorization. “N” does not mean already implemented.
- **C — Conditional:** useful, but requires a specific read-model, preference, interaction, file-processing or workflow contract; do not disguise it as CSS-only work.
- **L — Later:** depends on separately authorized product scope or a new material Owner decision. No present implementation authorization.

There are **37 N, 15 C and 8 L** candidates. Relative effort is judged by integration risk, not estimated calendar time: N is usually low/medium presentation work, C is medium/high with backend/security consequences, L needs its owning slice. Reuse existing prototype patterns where present instead of making duplicate features.

## 01–10: Shell, navigation and search

| ID | Pattern / reference | Concrete adaptation and benefit | Class | Safety / acceptance |
| --- | --- | --- | --- | --- |
| 01 | Consistent navigation hierarchy — [Linear team pages](https://linear.app/docs/default-team-pages) | Stable sidebar/header and labelled mobile destinations reduce relearning. | N | SC-01; branch selection never expands grants. |
| 02 | Visible location trail — [Linear projects](https://linear.app/docs/projects) | Project → area → exact record breadcrumb prevents working in the wrong project. | N | SC-00/01; no denied ancestor metadata. |
| 03 | Read-oriented command launcher — [Linear search](https://linear.app/docs/search) | Search/open permitted records from one visible button and shortcut. | N | Start with navigation only; no instant approval commands; available search scope explicit. |
| 04 | Cross-record search — [Linear search](https://linear.app/docs/search) | Search tasks/projects/documents by type with exact-ID matching. | C | Server-filter before snippets/counts; pagination and completeness contract required. |
| 05 | Recent records — [Linear search](https://linear.app/docs/search) | Quickly reopen recent tasks/reviews without searching again. | C | Permission recheck; clear protected cached labels after logout/revocation. |
| 06 | Personal favourites — [Linear favourites](https://linear.app/docs/favorites) | Pin permitted projects/views without changing everyone else's navigation. | C | Decide preference storage/scope; favourite is never a grant. |
| 07 | Keyboard preview with visible button — [Linear Peek](https://linear.app/docs/peek) | Read-only task preview retains surrounding list context. | N | Add touch/click equivalent; focus return; same permitted fields as detail. |
| 08 | Desktop split list/detail — [Trello navigation](https://support.atlassian.com/trello/docs/navigation-in-trello/) | Keep the list beside the selected task; use full detail on mobile. | N | Preserve source/filter/scroll; no misleading second editable record. |
| 09 | Quiet display-options popover — [Linear display options](https://linear.app/docs/display-options) | Put density/grouping controls in one predictable place. | N | Exact identity/status/committed date cannot disappear at a decision point. |
| 10 | Fixed task detail anatomy — [Notion layouts](https://www.notion.com/help/layouts) | Heading and key properties first; secondary detail beside/below. | N | Approved fixed layout; no schema/custom-layout builder implied. |

## 11–20: My Work and attention

| ID | Pattern / reference | Concrete adaptation and benefit | Class | Safety / acceptance |
| --- | --- | --- | --- | --- |
| 11 | Consolidated assigned work — [ClickUp My Tasks](https://help.clickup.com/hc/en-us/articles/31007956275863-My-Tasks) | One daily work destination across permitted projects. | N | SC-02; effective employee identity; attention above tasks. |
| 12 | Action-specific attention cards — [Asana Inbox](https://help.asana.com/s/article/inbox) | Review, extension and reassignment use different symbols/reasons and exact links. | N | Read notification ≠ resolve decision; illustrative pattern already in prototype. |
| 13 | Date-basis grouping — [monday My Work](https://support.monday.com/hc/en-us/articles/360019300579-My-Work) | Optional date groups labelled by Target or Committed. | N | R-023; pending extension cannot move a group based on commitment. |
| 14 | Durable named personal views — [Linear custom views](https://linear.app/docs/custom-views) | Save “My corrections” or “Waiting on my work” filters. | C | Preference contract; scope reauthorized each query; shared views never grant access. |
| 15 | Explicit missing dates — [ClickUp My Work](https://help.clickup.com/hc/en-us/articles/18947060934423-Use-the-My-Work-card) | Show “Not committed” instead of a blank date cell. | N | Missing target and missing commitment distinguished; no synthetic date. |
| 16 | Compact status + owner identity — [Linear display options](https://linear.app/docs/display-options) | Labelled badge, owner name and decorative initials scan quickly. | N | Title/colour/avatar never substitutes for role grants; exited current owner retained. |
| 17 | Collapsible work groups — [Teamwork task list](https://support.teamwork.com/projects/planning-managing-work/tasks-all-active-tasks) | Expand one project/status group without losing other group headings. | N | No false complete totals from one page; accessible expand controls. |
| 18 | Source-notification deduplication — [Asana Inbox](https://help.asana.com/s/article/inbox) | One actionable source can collect related updates without repeated cards. | C | Read-model/source-ID contract; preserve all events and unresolved decisions. |
| 19 | Personal/management separation — [monday My Work](https://support.monday.com/hc/en-us/articles/360019300579-My-Work) | Separate own work from separately granted management actions. | N | Owner without employee gets honest empty personal work; no substitute employee tasks. |
| 20 | Quick creation in valid context — [ClickUp personal mobile list](https://help.clickup.com/hc/en-us/articles/21737877492119-Use-Personal-List-on-mobile) | Open existing task creation with known project/context prefilled. | N | Existing self-task/assignment rules; no new free-floating personal inbox model. |

## 21–30: Project Workspace

| ID | Pattern / reference | Concrete adaptation and benefit | Class | Safety / acceptance |
| --- | --- | --- | --- | --- |
| 21 | Outcome/context summary — [Linear projects](https://linear.app/docs/projects) | Brief project identity, baseline scope and named lead above work. | N | Existing scope text; no new strategic goal hierarchy. |
| 22 | Project-area tabs — [Notion layouts](https://www.notion.com/help/layouts) | Overview, Tasks, Reviews, Documents share one stable project header. | N | Tabs are capabilities; no hidden-data fetching for inaccessible areas. |
| 23 | Applied stage/milestone map — [Linear projects](https://linear.app/docs/projects) | Recorded plan version and gate states communicate delivery sequence. | N | S08; milestone counts never imply project delivery percentage. |
| 24 | Related-resource panel — [ClickUp relationships](https://help.clickup.com/hc/en-us/articles/6304528030743-Intro-to-Relationships) | Open project files/tasks/reviews from relevant context. | N | Each linked record independently authorized; no raw NAS paths. |
| 25 | Activity separated from next work — [Basecamp activity](https://5.basecamp-help.com/article/1160-activity) | “What changed” timeline beside “What needs action”. | N | Existing permitted events; history is not a new approval queue. |
| 26 | Unified project activity feed — [Basecamp activity](https://5.basecamp-help.com/article/1160-activity) | Compose permitted task/review/document events into one chronology. | C | Source aggregation/paging and field-filter contract; audit retention unchanged. |
| 27 | Small approved/default view set — [monday My Work](https://support.monday.com/hc/en-us/articles/360019300579-My-Work) | Start with list and optional informational board; avoid many simultaneous layouts. | N | Owner list/board choice open; movement cannot mutate review/state. |
| 28 | Read-only deadline timeline — [Notion views](https://www.notion.com/en-gb/help/views-filters-and-sorts) | Date pins visualize real target/commitments without rescheduling. | C | Explicit date semantics/range, complete scoped query; no invented duration/critical path. |
| 29 | Hide secondary project panels — [Basecamp projects](https://3.basecamp-help.com/article/25-projects) | Collapse facts/history to leave current work visible. | N | Required hold/gate explanations remain prominent; no permission change. |
| 30 | Applied-template comparison — [Teamwork task-list templates](https://support.teamwork.com/projects/tasks/creating-a-task-list) | Inspect applied version beside a later template version before an authorized change. | C | Diff source/version contract; later template never rewrites applied plan silently. |

## 31–40: Task detail, ownership and editing

| ID | Pattern / reference | Concrete adaptation and benefit | Class | Safety / acceptance |
| --- | --- | --- | --- | --- |
| 31 | Primary facts near heading — [Notion layouts](https://www.notion.com/help/layouts) | Owner/status/date visible without opening a long properties list. | N | Exact labels essential; mobile wraps, never tiny horizontal text. |
| 32 | Current-state and next-action strip — [Linear issue relations](https://linear.app/docs/issue-relations) | Explain current state and relevant related review/correction action. | N | Actual state only; no universal workflow percent or implicit transition. |
| 33 | Distinct date markers — [Trello Planner](https://support.atlassian.com/trello/docs/trello-planner/) | Target, Committed and Requested extension shown separately. | N | S10/date history; pending/rejected proposal leaves commitment intact. |
| 34 | Relationship mini-map — [Linear issue relations](https://linear.app/docs/issue-relations) | Small predecessor/linked correction map with labelled connectors. | N | Existing relations only; hide denied nodes; approved early-start warning stays a warning. |
| 35 | Parent/correction backlink — [ClickUp relationships](https://help.clickup.com/hc/en-us/articles/6304528030743-Intro-to-Relationships) | Correction detail keeps its original task/round one click away. | N | Exact parent identity; completing correction does not approve parent. |
| 36 | Secondary-property disclosure — [Notion layouts](https://www.notion.com/help/layouts) | Fold less-used metadata/history under details. | N | Never hide blocked-action reason, current owner or decision evidence. |
| 37 | Guarded inline edits — [Teamwork list view](https://support.teamwork.com/projects/planning-managing-work/tasks-all-active-tasks) | Edit a permitted low-risk field without leaving the list. | C | Capability+expectedVersion; draft/retry; dates/ownership need their own guarded commands. |
| 38 | Selected-record action bar — [Linear selection](https://linear.app/docs/select-issues) | First support selected-record inspection/navigation; mutations only through approved contracts. | C | No bulk approval/reassignment; per-item scope/version and failure reporting required. |
| 39 | Assignment eligibility explanation — [Teamwork create task](https://support.teamwork.com/projects/tasks/create-a-task-list-view) | Clearly show eligible candidate and allowed assignment context. | C | Backend candidate read model; no disclosure of inaccessible staff; title alone irrelevant. |
| 40 | Assigned/due checklist sub-work — [Trello advanced checklists](https://support.atlassian.com/trello/docs/how-to-use-advanced-checklists-to-set-due-dates) | Potentially model individually owned checklist steps. | L | New ownership/deadline/workflow semantics need Owner decision; current checklist must not become tasks implicitly. |

## 41–50: Reviews and Documents

| ID | Pattern / reference | Concrete adaptation and benefit | Class | Safety / acceptance |
| --- | --- | --- | --- | --- |
| 41 | Persistent exact-evidence header — [Wrike proofing](https://help.wrike.com/hc/en-us/articles/210322845-Proofing-in-Wrike) | Task, round, file and revision stay beside viewer/decision. | N | R-027–030/R-037; new upload cannot replace retained submission. |
| 42 | Page/position-linked annotation pins — [Asana proofing](https://help.asana.com/s/article/proofing?language=en_US) | Existing markup opens its exact page/reason from pin or text list. | N | Immutable file/page coordinates; authorised annotator; existing markup model only. |
| 43 | Explicit reviewer identity — [Wrike proofing](https://www.wrike.com/features/online-proofing/) | Named reviewer and submitter shown beside permitted decision actions. | N | Independent reviewer and current file access; no role-title inference. |
| 44 | Retained review-round timeline — [Teamwork file versions](https://support.teamwork.com/projects/project-sections/uploading-and-viewing-versions-of-a-file) | Show historical decision → correction → current resubmission. | N | Historical reads separate from current write target; earlier evidence unchanged. |
| 45 | Side-by-side exact revision comparison — [Wrike comparison](https://www.wrike.com/features/online-proofing/) | Compare two permitted PDF/image revisions visually. | C | Authorize both streams; immutable identities and explicit active decision target; no automatic approval or unverified difference detection. |
| 46 | Revision stack with state labels — [Teamwork file versions](https://support.teamwork.com/projects/project-sections/uploading-and-viewing-versions-of-a-file) | Keep latest upload, current approved, issued and superseded distinct. | N | “Issued” requires exact issue evidence; superseded says Do Not Use. |
| 47 | Supported-file thumbnail gallery — [Notion gallery/views](https://www.notion.com/en-gb/help/views-filters-and-sorts) | Authorized previews make drawing identification faster. | C | Safe rendering/file processing, inherited Confidential checks, cache revocation; no fabricated CAD preview. |
| 48 | Clear view/comment/decision access cue — [ClickUp document permissions](https://help.clickup.com/hc/en-us/articles/6309221065495-Permissions-in-detail) | Show what this user can do to this exact record. | N | Capability display is explanatory; backend remains authoritative. |
| 49 | Version-local feedback — [Teamwork file versions](https://support.teamwork.com/projects/project-sections/uploading-and-viewing-versions-of-a-file) | Comments stay attached to the revision they describe. | N | Retained history; no migration of old comments onto latest revision. |
| 50 | Secure client decision package layout — [Wrike guest proofing](https://www.wrike.com/features/online-proofing/) | Clear granted-item list, exact scope and signature confirmation. | C | S14 final acceptance; isolated CLIENT identity, explicit item grants, passkey/Primary rules and expiry/cancellation. No generic external sharing. |

## 51–60: Communication and later capabilities

| ID | Pattern / reference | Concrete adaptation and benefit | Class | Safety / acceptance |
| --- | --- | --- | --- | --- |
| 51 | Compact existing discussion summaries — [Notion layouts](https://www.notion.com/help/layouts) | Keep discussion visible on demand instead of a tall permanent thread. | N | Complete permitted comment total or no number; unresolved correction reason remains visible. |
| 52 | Existing notification preference controls — [monday notifications](https://support.monday.com/hc/en-us/articles/360001292545-Notifications-explained) | Present supported preferences/quiet hours clearly. | N | Existing S04 settings only; no new recipients, reminders or guaranteed channels. |
| 53 | Structured input with visible destination — [monday WorkForms](https://support.monday.com/hc/en-us/articles/11040473466258-WorkForms-settings-and-permissions) | Existing intake forms show where a submission goes. | C | Approved field mapping/capabilities; public forms/spam/new approval flows need separate scope. |
| 54 | Personal focus-time planning — [Trello Planner](https://support.atlassian.com/trello/docs/trello-planner/) | Schedule a private work block separate from deadline. | L | New planning persistence/integration contract; S17/S25 where applicable; cannot change commitment. |
| 55 | Team capacity visualization — [Teamwork task management](https://www.teamwork.com/solutions/task-management-software/) | Later show demand against real available capacity. | L | S16/S17; approved hours/leave/allocation and branch scopes; not task-count capacity. |
| 56 | Human-authored confidence signal — [Basecamp Hill Charts](https://basecamp.com/hill-charts) | Possible explicit narrative-confidence update with author/time/history. | L | New Owner-approved semantics; subjective signal is not completion, approval or performance score. |
| 57 | Scheduled check-in surface — [Basecamp features](https://basecamp.com/features) | Optional periodic question/response with visible ownership. | L | New workflow/notification policy and S24/26 as applicable; no automatic escalation. |
| 58 | Approval-aware automation builder — [Trello automation](https://support.atlassian.com/trello/docs/automation-overview/) | Later show trigger → action → approval boundary and run evidence. | L | S26; reviewed rule version/idempotency, high-impact approvals cannot execute autonomously. |
| 59 | Explainable management charts — [Asana views/features](https://asana.com/features) | Later visualize approved health/delay/performance/report snapshots. | L | S23/S24; versioned formula/weights, scoped fields, external delay and evidence drill-down. |
| 60 | Permission-filtered AI work helper — [Linear features](https://linear.app/features) | Later suggest next work from authorized evidence with human confirmation. | L | S27; trusted source links, no autonomous assignment/approval, no cross-scope retrieval. |

## Deep dive: first 12 candidates to carry into design review

These are priorities for comparison mockups, not permission to build twelve new features immediately. Several already have representative prototype treatments.

| Priority / candidates | Source → UI → permitted action | Material failure to prevent | Planned acceptance |
| --- | --- | --- | --- |
| 1. Attention clarity, 12/19 | Actionable source ID + reason + capability → icon/label → exact evidence link | Reading an inbox update mistaken for decision completion; management tasks mistaken for personal assignment | Employee/reviewer/manager identify source and next action; no authority after revocation. SC-02. |
| 2. Date semantics, 13/33 | Target + Committed + request status → separate labelled markers → approved request/decision form | Pending date treated as committed; timezone day shift | Pending/rejected request leaves committed value unchanged after refresh; date-basis filters verified. SC-07/S10. |
| 3. Revision identification, 46 | Exact file/revision + approval + supersession + issue → labelled stack → exact stream | Latest working upload used as approved/issued | R0/R1/R2 fixture, separate issue fixture, tampered-ID and denied Confidential stream. SC-06/S11–13. |
| 4. Stable review target, 41/44 | Retained submission/round → fixed evidence header + history → current authorised decision | Historical selection or new upload silently changes approved file | Compare identity/checksum before and after upload/history navigation; self-review and stale-version denial. SC-08/S13. |
| 5. Stage/gate explanation, 23 | Applied plan version + recorded gates → vertical stage map → permitted details | Stage chronology interpreted as delivery percentage or automatic completion | Required gate remains unmet until existing command; template edit does not rewrite applied version. SC-03/S08. |
| 6. Secondary detail layout, 10/36 | Existing permitted fields → heading + collapsed secondary details → inspect | Simplification hides a reason or deadline needed to decide | Key facts/action/evidence stay visible at 320px; keyboard expansion/focus; no duplicated register cards. SC-00. |
| 7. Context-preserving preview, 07/08 | Scoped task detail → read-only preview beside list → open full detail | Peek reveals denied fields or discards list/filter context | Direct-ID denial; Escape returns focus; return preserves filters/scroll; mobile equivalent. SC-01/04/07. |
| 8. Controlled views, 09/14/27 | Existing filters/display fields → view controls → permitted read query | Saved view used as a sharing grant or partial search sold as complete | Filter combinations/pagination/reset; current user predicates not hard-coded; no read-model gap concealed. SC-02/04. |
| 9. Dependency clarity, 34/35 | Permitted existing relationships → small map + list → inspect related task | Hidden predecessor exposed; warning changed to hard block; correction approves parent | Denied identities absent; early-start acknowledgement retained; correction task completion leaves parent gate. S10/S13. |
| 10. Evidence-local feedback, 42/49 | File/page/coordinates + annotation author/reason → pin/text list → exact location | Zoom/revision swap attaches reason to wrong evidence | Same position after zoom; keyboard list equivalent; new revision leaves historical markup unchanged. SC-08. |
| 11. Preference clarity, 52 | Existing S04 preference record → labelled toggles → existing preference save | New recipients/critical reminders implied by a UI control | Existing policy preserved, persisted refresh and save-failure recovery. S04. |
| 12. Two-revision comparison, 45 | Two explicitly selected authorised immutable files → paired viewers → inspect only | Unauthorized second file or ambiguous decision target | Deny either file independently; mobile sequential comparison; explicit current submission; heavy-file loading failures handled. Conditional viewer spike before scheduling. |

## Attractive features we should not copy literally

Do not copy multi-project task ownership, arbitrary custom states, unrestricted drag-to-complete, mass approvals/reassignment, or free-form permission inheritance. Do not offer a public link as a substitute for S14 item grants/expiry. Do not infer health from task counts or confidence from a decorative chart. Do not use avatars, job titles or colours to imply authorization. Do not move deadlines by dragging a calendar block. Do not implement “undo” by mutating approved evidence/history. Do not adopt gamified employee rankings, automatic corrective assignments or AI approval recommendations as authority.

Trello's personal scheduling distinction is useful; its planner is not an existing Sense Studios requirement. Basecamp explicitly describes Hill Chart positioning as human-generated: we must label such a future idea subjective, not computed truth. Wrike's comparison is useful; automatic image-difference detection is a different processing feature that this research does not establish or approve.

## Safe delivery sequence and quality gates

1. Compare the first-wave patterns in our current shell/My Work → Project Workspace → Task/Review → Documents prototype. Prefer refinements to existing components over additional dashboards. Preserve four open Owner choices and equal mobile support.
2. Record selected candidates by ID in screen contracts. For every candidate map source fields, query completeness, capability, missing/error/stale/read-only state, desktop/mobile and acceptance before scheduling implementation. Discard patterns that make exact decisions harder.
3. Freeze only after Owner review of concrete mockups. A selected C candidate needs a separate bounded data/API/preference/file-processing contract before it can enter a build slice. L candidates wait for their owning authorization; don't let visual work smuggle them into earlier slices.
4. Implement one existing workflow at a time with real persistence and backend authorization. Test own/assigned and denied branch/project/file access, guessed IDs, independent review, unchanged deadline while pending, exact evidence despite newer uploads, stale version/concurrency, revocation and recoverable failure.
5. Verify 320/390/768/1024/1440px; keyboard/focus and screen-reader equivalents; labelled colour/icons; reduced motion; safe touch controls; supported viewer performance on realistic large files. Record measured time/error comparisons with the existing UI, not guessed productivity gains. Apply repository gates for app changes.

Human review should ask: Which record is this? Who owns it? What is its actual state? What can I do next? Which date is committed? Which exact drawing can I use? Which evidence would this decision approve? A wrong answer is a design defect even if the screen is attractive.

Current repository context also reports mockup-script lint errors separately from application lint/typecheck. This research did not reproduce or resolve them, and does not claim the whole repo is green. No application tests were run for this documentation-only research.

## Public visual references captured

- research/linear-public-reference.png: actual public documentation illustration of layout/group/order/property controls; the best visually inspected reference in this pass.
- research/notion-detail-reference.png: public layout-builder example, pinned-property hierarchy and subdued secondary UI.
- research/wrike-public-reference.png and wrike-detail-reference.png: public proofing page; partial illustration/loading limitation described above. Do not mistake its marketing typography for a suitable dense work-screen layout.

Original competitor logos, illustrations and proprietary assets are reference material only. Build our own component styling and SVG symbols; don't place their assets in Sense Studios UI.

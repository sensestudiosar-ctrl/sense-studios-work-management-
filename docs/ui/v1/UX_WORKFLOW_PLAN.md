# UX workflow plan — v1 review draft

Owner direction, 2026-10-01: Requirements → UX flows → UI specification/mockups → implementation → tests. Keep this plan compact; existing requirements and slice specifications own business rules. UI v1 remains unfrozen until the concrete designs and outstanding choices are reviewed.

Confirmed: clean studio styling, equal desktop/mobile support, everyone lands on My Work, attention above tasks. Mockups: mockups.html. Screen-level reference: SCREEN_CONTRACTS.md. The earlier UI_SPECIFICATION_V1.md is supporting draft detail, not an additional approval layer; use this flow plan as the review entry point.

## Journeys, screen flows and primary actions

| ID / user journey | Screen flow | Primary action at each step | Completion / exceptions |
| --- | --- | --- | --- |
| UX01 Employee receives and starts work | My Work → Task → Start work | Open task → Start work | Current owner/collaborator scope and valid transition; incomplete predecessor gives the approved early-start warning and acknowledgement, not a new hard block. |
| UX02 Employee submits work | Task → Submission → Exact evidence → Review status | Submit for review → Select exact eligible revision/evidence → Submit | Required reason, version and reviewer rules; submission locks its evidence identity. Return to the task with visible submission status. |
| UX03 Reviewer checks submission | My Work attention → Review → Exact submission → Decision | Open review → Start review where required → Inspect evidence → Decide | Named independent authorized reviewer; file permission and current state rechecked. A newer upload never replaces the submitted revision. |
| UX04 Correction and resubmission | Review decision → Correction task assignment → My Work → Correction task → Parent task → Revised submission | Request corrections → Authorized assignment → Complete correction → Resubmit | Category/severity/reason and retained rounds; assignment authority separate from decision authority. Completing correction does not approve parent. |
| UX05 Reviewed task completes | Task → Review evidence → Complete | Inspect approval → Complete task | Required internal/client gates satisfied through owning commands. Show completion and return to originating task list, preserving filters. |
| UX06 Team Lead assigns work | Project Tasks → Create/assign → Eligible owner → Task | Create task → Choose owner/collaborators → Save | Explicit assignment grant and reporting/project scope; title alone grants nothing. Show the persisted assigned task in its project list. |
| UX07 Manager reassigns work | My Work attention / Project Tasks → Task → Reassign | Open affected task → Select eligible replacement and reason → Confirm | Departed employee remains the recorded current primary owner while the task waits; an authorized individual replacement is required before work resumes. Preserve ownership history. Owner may perform eligible management actions; no new Owner-only reassignment rule. |
| UX08 Employee requests extension | Task → Extension request → Eligible approver → Task | Request extension → Choose eligible approver/date and reason → Submit | Current primary owner, approved date rules; committed date remains unchanged pending decision. Show pending request and destination. |
| UX09 Owner/eligible manager decides extension | My Work attention / Decisions → Task request → Evidence → Decision | Open request → Inspect old/proposed dates and reason → Approve/reject with reason | Only eligible named approver under existing policy. Rejection retains committed date and evidence; approval refreshes authoritative date/history. |
| UX10 Employee finds approved drawing | Project → Documents → Drawing → Current approved revision | Open Documents → Find drawing → Open exact permitted file | Show current approved separately from latest upload and formal issue. Superseded remains Do Not Use. Formal delivery uses issued revision where required. |
| UX11 Staff uploads document | Project Documents → Folder → Upload → Finalization → Register | Select permitted destination → Upload → Complete finalization | Progress, interruption/retry and server finalization distinct. Failed finalization never shows success. Existing resumable upload rules apply. |
| UX12 Work waits and resumes | Task → Waiting reason → Waiting task → Resume | Wait → Record cause/reason → Resume when permitted | Ordinary waiting records previous state. Employee-exit waiting requires manager reassignment; no generic resume shortcut. |
| UX13 Project Lead exits | Owner attention → Held project → Lead replacement → Resume | Open hold → Appoint eligible lead → Resume after guards | Active project held atomically, prior lead retained; Owner replacement required. Preserve tasks and explain outstanding recovery actions. |
| UX14 Client review/revision request | Client portal → Granted project → Shared exact item → Review request | Open item → Inspect PDF/image → Submit comments/revision request | Reference-only in this internal UI package. S14 is complete for local staging; S14_REVIEW_CONTRACT.md owns exact item grants, classification and settled correction authority. Internal data remains excluded. |
| UX15 Client exact approval | Client portal → Granted exact item/revision → Approval evidence → Passkey step-up → Confirmation | Inspect exact item → Review approval scope → Authenticate → Confirm | Reference-only here. S14 distinguishes item decisions under explicit item grants from Primary-only final complete-package approval; approved passkey/signature rules, individual expiry and cancellation apply. No latest-file substitution. |

## Friction rules

- Open an attention item directly at its actionable record/evidence, not a second generic queue.
- Carry task/project/round/revision context into the next screen; do not ask users to enter known identifiers again.
- Keep one obvious primary action for the current step; secondary actions remain discoverable.
- Preserve search/filter/scroll on return, and valid form text on recoverable failure. After success return to the logical source or remain on refreshed detail when inspection is useful.
- Explain blocked actions using approved state/capability reasons. Hide actions without authority; never reveal denied record metadata in the explanation.
- Read-only views retain permitted reads and suppress writes. Changing viewport or navigation cannot restore editing rights.
- Require confirmation for consequential decisions with exact affected record/evidence visible; prevent duplicate submission while pending.
- Mobile completes the same authorized core steps with readable dates and reachable controls. No hover-only requirement.

## Edge-case behaviour

| Case | Expected experience |
| --- | --- |
| Waiting | Show recorded cause and prior state; distinguish ordinary resume from required reassignment. |
| Rejected approval | Preserve request, reason and decision; show unchanged source state/date and eligible next action. |
| Permission removed/session expired | Block future requests, clear protected content on detection, offer safe sign-in/navigation; do not retry writes automatically. |
| Reassigned task | Refresh owner/capabilities; preserve history; old owner cannot continue through stale controls. |
| Overdue | Use approved source date semantics, label target vs committed; no invented escalation or score. |
| Superseded drawing | Prominent Do Not Use; preserve historical evidence and direct users to current approved/issued record as appropriate. |
| Failed upload | Honest progress/failure and permitted retry; never register success before finalization. |
| Network/offline | Preserve recoverable draft text, explain unavailable commands, avoid false success. Offline capture/sync is later scope, not implied by responsiveness. |
| Concurrent change | Preserve draft text; refresh record and action eligibility; require deliberate review before retrying a stale decision. |
| Cancelled project | Delivery remains stopped; separate approved closeout stays distinct. Client reads follow issued-item limits/expiry; new reviews/approvals stop. |

## Visual communication planning — UI-V01

Owner direction: start this planning now, without waiting for S24. Status: representative core graphics are now in the fictional mockups; human comprehension/accessibility acceptance and Owner freeze remain pending. IMPLEMENTATION_PLAN.md UI-V01 supplies safeguards and delivery gates; REVIEW_AND_VERIFICATION.md records actual presentation checks. Use a graphic + short label + exact detail at the decision point. Preserve attention-first My Work and the existing primary action for each journey.

| Order / screen | Question the visual answers | Proposed desktop / mobile composition | Source and interaction |
| --- | --- | --- | --- |
| 1. Shell | Where am I and where can I go? | Labelled sidebar icons and breadcrumb / labelled bottom navigation plus More. | SC-01 authorized destinations/current location; click navigates, never expands access. |
| 2. My Work | What needs me next? | Attention rows with action symbol → task/project → short reason → labelled action, followed by task rows / stacked cards in the same order. Each task retains labelled status, owner and dates. | SC-02; UX01/03/07–09/12. Exact actionable source links; separately labelled personal/management scope. No new urgency ranking or inferred notification count. |
| 3. Project Workspace | Which recorded stage/gate needs attention? | Applied plan with stage rows and nested milestone symbols; selected stage detail alongside / vertical expandable stage rows with details beneath. Tasks use a small dependency view only when relevant; Reviews shows retained submission links; Documents follows the revision pattern below. | SC-03–06; UX06/10/13. Persisted applied version, recorded states and gates. Inspect stage/milestone details; no diagram-driven automatic completion. Keep hold/cancellation explanation visible above the plan. |
| 4. Task Detail | Who owns this, what is the current step and which date applies? | Current-state strip with relevant review/correction links; named owner; separate labelled date markers and optional dependency list/diagram / current state and action first, then owner, date rows and vertical relationships. | SC-07; UX01/02/04/05/08/09/12. Workflow/history and authoritative date fields. Pending extension has a labelled proposed marker and does not move Committed. Dependency links open permitted records and retain approved early-start warning. |
| 5. Review / Correction | What exact evidence am I deciding on and what changed? | Persistent task/round/file/revision header above evidence; numbered existing annotation pins; decision panel; round history below / same header, viewer, labelled decision, linked correction, vertical round history. | SC-05/08; UX02–05. Exact submission evidence and page-bound annotations. Historical selection visibly becomes read-only; failed evidence loading blocks unverified decision. No generated comparison/difference claim without a separately scoped capability. |
| 6. Documents | Which revision may I use? | Register with available permission-checked thumbnails; selected drawing's labelled revision stack / document cards and vertical revision stack. | SC-06; UX10/11. Exact file identity, approval/issue/supersession records. Open exact revision; ordinary file-type icon when preview unsupported/unavailable. Upload transfer and finalization remain separate. |

### Concrete examples for the next mockup pass

These are fictional design fixtures, not domain status definitions or live data. Map every state to the existing contract before rendering.

- Attention card: `[review symbol] Studio Annex / Lighting plan · Round 2 ready for your review → Open exact submission`. A manager's reassignment card separately says `Waiting — needs reassignment`, retaining the current owner's name.
- Date markers: `Target: 10 Oct` · `Committed: 12 Oct` · `Extension requested: 15 Oct — Pending`. Pending/rejected requests leave the committed marker at 12 Oct; configured timezone applies.
- Revision stack: `R0 — Superseded, Do Not Use` / `R1 — Current approved` / `R2 — Working upload`. Show `Issued` only when that exact revision has an issue record; do not give an approved revision an inferred issued badge.
- Correction path: `Round 1: corrections requested → linked correction task → revised submission, Round 2: awaiting review`. Correction completion leaves the parent awaiting its required review/completion commands.

### Shared visual vocabulary and states

Review direction update (Owner, 2026-10-01): use a conversational canvas for UX03/04. Open the exact drawing, select a permitted page/location, describe the change beside it, and navigate between numbered annotation and human comment. Formal Request corrections/Approve stays a separate guarded action. SC08-C records desktop/mobile anatomy, coordinate mapping, historical/draft behavior and immutable-evidence safeguards. AI-generated changes are separate later scope. Mockup refinement/verification for this new direction is pending.

Use a small reusable set: labelled status badge; attention row/card; named owner indicator; date markers; stage/gate map; retained-round timeline; exact-revision stack; evidence annotation pin. Icons carry accessible names when meaningful; decorative repetitions are hidden from assistive technology. Reuse meaning across screens, not one generic green “done” symbol for uploaded/approved/issued/completed. Palette/typeface and exact icon shapes remain proposals for mockup review.

For each component specify Ready, Loading, Empty, Error and Read-only. Loading uses neutral placeholders, never a fake completed map; empty distinguishes no records from filtered-out records; error offers local retry and explicit unavailable data; read-only retains permitted inspection while suppressing writes. Show stale/last-refreshed data where relevant; access loss clears protected data on detection. Narrow screens use vertical sequence/list equivalents, not unreadable miniature diagrams. No hover-only details or drag-only actions.

### Planned review fixtures and completion evidence

1. Compare baseline and proposed My Work using an employee, named reviewer and authorized manager; identify source record, reason and next action without mistaking notification read for decision completion.
2. Inspect an applied project plan with an unmet required gate and a separate lead-exit hold. Users must distinguish milestone state from project completion and recognize the guarded recovery path.
3. Walk pending/rejected extension, ordinary Waiting, exit Waiting and a permitted early-start warning. Identify the current owner and committed date correctly.
4. Review a retained R1 submission after R2 upload; follow a correction through resubmission. Users must identify the decision target and understand that correction completion is not parent approval.
5. Find approved R1 among superseded R0 and working R2, then inspect a separately issued exact revision. Test unavailable preview, failed finalization and revoked access without false success or leaked metadata.

For all fixtures inspect 320/390/768/1024/1440px, keyboard/focus and text/screen-reader equivalents. Record comprehension errors, unnecessary navigation, readable labels and state fidelity against the baseline; measurements and accessibility checks are pending. Automated fictional-data preview checks prove presentation only. Actual permission, persistence, evidence and concurrent-state tests belong to authorized application implementation.

Current deliverables: core representative mockups and eight dedicated fictional scene fixtures in workflow-fixtures.html. These illustrate correction/resubmission, ordinary completion, held lead replacement, rejected extension, hidden dependency warning, failed evidence, failed finalization and revision/issue/access loss. They do not execute domain forms or commands. UI_DELIVERY_PLAN.md supplies source/gap mapping and research selection. Next: complete DESIGN_REVIEW_WORKSHEET.md with actual human/accessibility findings, settle four choices and correct the concrete package before Owner-approved freeze. Client presentation and later CRM/Decisions/People/Admin receive their own contracts before design acceptance; S23 scores and S24 dashboards await approved calculations and slice authorization.

## Review and acceptance

Walk UX01–UX05 as one connected design journey, then UX06–UX13. Review UX14–UX15 separately against the completed S14 contract before any portal redesign. Use the mockups to select task density, list/board, global/project document navigation and exact palette/typeface. Record Owner choices, correct screens/contracts, then freeze UI v1. No broad application implementation before freeze.

Each journey's implementation acceptance checks a real permitted success, denied actor/ID or expired access, relevant state/error recovery, retained evidence/history, mobile completion and correct return destination. Tests use the cheapest reliable domain/API/browser layer; mockup interaction checks do not prove real permissions, persistence or audit.

This plan introduces no new business authority, notifications, calculations, migrations or later-slice authorization. Models previously used for the design package: primary GPT-6 with Sol-level reasoning; GPT-6 Luna for the bounded standalone mockup. This workflow plan is maintained by the primary agent.

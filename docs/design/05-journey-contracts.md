# Journey and interaction contracts

8 October 2026 · Proposed presentation over current authorized behavior. The [research ledger](02-refero-research.md) supplies comparison evidence; requirements and slice specs supply business rules. This document does not add commands.

## Task creation — S09/S10, R-018–026

**Reference:** FL01/SC01–02. **Users:** authorized Owner/manager/creator; assignment eligibility is independent of visibility.

Entry is an existing project/plan context or authorized task directory. Preserve selected scope/project/view/filter/sort/page. A focused composer puts title, project/plan association, accountable owner, required dates and existing required fields first. Optional description/checklist/tags/dependency/recurrence/estimate fields use labeled disclosure; no functionality disappears. Defaults may reuse explicit selected context but never invent numeric policy, reviewer or cross-branch assignment.

Sequence: inspect selected project → enter required work/owner/dates → add supported details → submit owning create command → show exact accepted record → return to originating worklist. The list refresh and confirmed result identify the created task. A “Create another” option is conditional on accepted command and explicit contextual retention, not a new background automation.

Failure: retain form values on validation/permission/version error; identify field/prerequisite and safe Retry/Cancel. Double submit is prevented during the request. Local in-memory draft recovery is distinct from durable saved drafts. Closing warns only when actual edited values would be lost. No upload placeholder is called finalized evidence.

Future acceptance: allowed and denied creator; eligible/ineligible owner; explicit cross-branch assignment; valid/missing dates; failed request; Back/reload; mobile keyboard; parent/plan identity. Every submitted payload retains existing semantics.

## Task completion — S09/S10/S13/S14

**Reference:** FL02, full FL07 and SC17–19. **Users:** current task actor/reviewer/client as individually authorized.

Show current state and next allowed command, not a universal Done checkbox. Where work completion requires internal review, the action is the existing submit-for-review command. Show required evidence, named reviewer and next round. Where client review is required, internal approval and client progression remain separate. Corrected work returns through its exact correction/resubmission route.

Sequence: open task → inspect current obligation/prerequisites → perform allowed owning command → await accepted response → display new state/next actor → reconcile list/attention scope. The retained task remains accessible even if it leaves the current filter. A result link is useful; a generic Undo is excluded unless an existing authorized reversal command and audit policy allow it.

Failure: rejected transition leaves previous official state and draft context intact. Concurrent change reloads exact record and explains the conflict; no blind automatic retry. Waiting caused by employee exit differs from ordinary Waiting/resume. Dependencies preserve existing acknowledged early-start behavior rather than introducing a new blocker.

Future acceptance: ordinary complete path, gated review path, correction, cancellation/lead hold, employee exit/reassignment, stale version, permission loss and filtered-list return. A task's optimistic visual move must never imply that an unaccepted review gate passed.

## Review approvals and corrections — S12–S14

**Reference:** FL03/SC04–05/07–08. **Users:** independent named internal reviewer, authorized correction assigner, exact granted client; Primary Client owns final batch.

Evidence header identifies task/round, exact drawing revision/file/version and available immutable identity details. Provide readable filename and revision plus technical details in disclosure. Preview is paired with comments/annotations and the decision panel; preview failure offers supported access/recovery without substituting another version.

Internal sequence: exact submission → eligible independent named reviewer inspects → existing approval or correction decision → reason/classification/category/severity where required → retained decision → exact correction task/revision/new round → resubmission. Prior evidence is preserved. Escalation and interrupted-round recovery remain available to authorized users.

Client sequence: own internal clearance for exact R/CR evidence → exact granted item package → individual/delegated client decisions → Primary complete-batch review with passkey step-up → confirmed final issue facts. “Item approved” and “Final batch approved” have distinct wording and receipts. Neither broad team membership nor viewing grants reviewer/Primary authority.

Failure: stale/superseded file, revoked/expired grant, different actor, self-review, passkey failure, withdrawn package and cancellation all explain the next permitted step. Do not show a nonbinding suggestion as a completed domain decision. No generic asset-status dropdown replaces Sense approval rules.

Future acceptance: wrong revision/round, author trying own review, current permission loss, client item vs batch, final step-up failure/retry, exact receipt and immutable correction/history. All decisions require current backend guards and exact authorized bindings.

## Project navigation — S07/S08 plus owning modules

**Reference:** FL04/SC06/11–12. **Users:** currently authorized project participants, with distinct action scopes.

Keep canonical project directory selection and seven sections: Overview, Plan, Tasks, Documents, Reviews, Delivery, Activity. Header holds owning branch, accountable lead and lifecycle. When a section opens another owning workspace, preserve projectId and safe return parameters through supported routes. Each module performs current authorization; carried context is not authority.

Plan remains mounted/retained as currently designed when switching sections. Project Tasks and global Tasks open the same canonical task. Documents distinguish project documents from immutable drawing register; Reviews distinguish internal/client review. Delivery shows Turnkey and Site only under their accepted type/lifecycle rules: Site requires active TURNKEY.

Sequence: authorized directory → exact project → section/object → owning workspace/action → return with project/section/filter/selection intact. Current route-label filter is navigation finding only. Future project palette is an optional reference pattern, separately deferred if its authorized read is missing.

Failure: project unavailable/denied, changed lifecycle, lead-exit hold and stale selection show accurate states and safe directory return. Never infer project names or branches from an inaccessible stale row. Cancelled project retained evidence and narrow separately approved closeout are not reopened delivery.

Future acceptance: Back/Forward/reload/direct link/new tab, project switch, long name, section memory, filtered-list return, Design vs active Turnkey and denied branch access. Appwrite's metadata-described final navigation is not assumed validated by its last image.

## Time tracking — S16 R-041–043

**Reference:** FL05/FL06, SC09–10/13–14. **Users:** authorized employee/manager/Owner within separate scopes.

Primary contexts are existing timer and dated-entry ledger. Label selected task/project or explicit non-project activity before Start. Keep one-open-timer status discoverable through existing authorized reads; a cross-app timer strip is conditional on current read/lifecycle support, not a new polling or persistence contract.

Manual sequence: choose exact supported context → enter date and h/min/duration under existing units → submit → view accepted ledger row and history. Sense task association for project work is required even though Programa calls task optional. Do not copy arbitrary increments or billable flags.

Timer sequence: exact selected context → Start → supported running state → Stop → confirmed entry/receipt. References do not verify durable timer stop; Sense source/tests must. Current-account scope and correction/lock rules govern display and mutation. Accounting delivery is a distinct durable status, not inferred from a locally rendered export.

Failure: concurrent open timer, stop rejection, stale/revoked task association, correction under review, locked entry, lost session and network failure retain known official state and explain retry. A stopped visual counter is not a confirmed saved time entry.

Future acceptance: reload running timer, second Start rejection, correct task attribution, explicit non-project entry, exact date/duration, approved locked correction/history, stop failure and durable delivery receipt. Offline TIM is not inferred from offline Site scope.

## Shared contract for every module

1. Entry defines authorized object/scope and the retained return context.
2. Ready state distinguishes no data, no matches, denied, source failure and insufficient evidence.
3. Action uses the owning module's existing command/read; required reason/confirmation remains specific.
4. Pending state does not claim success.
5. Accepted result identifies exact persisted object/evidence/next actor.
6. Failure preserves recoverable draft/context and offers a permitted next step.
7. Historical evidence and corrections remain reachable; disclosures do not remove commands.
8. URL/history/canonical deep links work on desktop and mobile without adding authority.

Use this template for Workforce, Learning, Site/offline, Turnkey, reporting, automation, integrations and assistance. Their domain invariants and module acceptance targets are in [the roadmap](03-module-roadmap.md); no competitor flow overrides them.


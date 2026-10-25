# Sense UX master plan — revision 2

25 October 2026 · **Planning/specification only. Application implementation and prototype construction are not authorized.**

The Owner accepted revision 1 as a discovery baseline and requested this stronger package. That approval does not approve a navigation change, prototype build, production change or domain rule. The earlier evidence remains intact.

## 1. Recommended outcome

Retain the existing React frontend, owning modules, API contracts, database, permission evaluation, state machines, evidence requirements and matched-release deployment architecture. Make the product easier to operate by giving daily work, project work, management and configuration clear homes, then applying one interaction grammar to the existing screens.

The Owner-approved Dashboard V10, exact My Work demo and Task Creation demo remain the visual/interaction foundations. Accessibility, current supported functionality, truthful data and responsive correctness take precedence over copying a demo defect or unsupported behavior. Every adaptation is recorded, not silently substituted.

Recommended order: finish unavailable-role evidence → validate navigation and workflow priorities → build one connected prototype only after separate approval → test it with users → request bounded application implementation approval. No code phase starts automatically when a document is accepted.

## 2. Deliverable index

| Document | Decision/support provided |
|---|---|
| [Real-role audit](REAL_ROLE_AUDIT.md) | Actual server-authenticated staff identities, roles, capabilities, pages/interactions and remaining unavailable roles |
| [15-workflow map](WORKFLOW_PRIORITY_MAP.md) | Current desktop/phone paths, complexity, candidate frequency, proposed paths and measurable goals |
| [Final IA specification](INFORMATION_ARCHITECTURE.md) | A single selected hierarchy distinguishing Daily, Project work, Management and Configuration; original route retention |
| [Master interaction specification](INTERACTION_SPEC.md) | Shell, lists, filters, drawers, creation/editing, approvals/reviews, states, responsive and keyboard behavior |
| [Approved demo differences](DEMO_PARITY.md) | Exact source identities, inspected demo captures, deployed differences and explicit adaptation decisions |
| [Connected prototype roadmap](PROTOTYPE_ROADMAP.md) | Prioritized end-to-end scenarios, connected nodes, shared fixture continuity, scope and exit gates |
| [Feature parity matrix](FEATURE_PARITY_MATRIX.md) | User capability coverage and owning-route fallback; each row gets its own future test |
| [Endpoint register](ENDPOINT_PARITY_REGISTER.md) | All 374 handler declarations from the accepted deployed source, mapped to retained boundaries and proposed homes |
| [Acceptance specification](ACCEPTANCE.md) | Measurable usability, accessibility, functional and visual gates; precedence and deviation process |
| [Exact Owner decisions](DECISIONS.md) | Necessary missing-fixture decision, operational ranking and the bounded later prototype gate |

Machine-readable supporting evidence: `DEPLOYED_CAPABILITY_INVENTORY.json`, `REAL_ROLE_EVIDENCE.json`, `ROLE_INTERACTION_EVIDENCE.json`, `RETAINED_ROLE_INVENTORY.json`, `DEMO_EVIDENCE.json`, `VALIDATION_SUMMARY.json`. [Evidence gallery](ROLE_AND_DEMO_GALLERY.html) separates actual sessions from prototype references and earlier attempts.

## 3. Status against the ten requested requirements

| Requirement | Revision-2 delivery | Status / limit |
|---|---|---|
| 1. Real-role audits | Five existing STAFF accounts authenticated through the real backend; persisted job roles, employee identities, project-lead status and review assignments read; 29 entry routes at desktop/tablet/phone plus selected workflows | Existing staff coverage completed for read-only entry/form/detail scope. Client/EXTERNAL and absent configured states remain **BLOCKED**, not simulated or passed |
| 2. Frequent workflows | Fifteen candidate workflows with current paths, complexity and sources; Owner confirmed task creation, checking/project work and review-comment/correction/resubmission as primary clusters | Primary priorities confirmed; remaining frequency/cadence estimated, no telemetry fabricated |
| 3. Finalized IA | One coherent four-category specification and route-to-home mapping | Final specification candidate for Owner validation; no alternative competing architecture and no route removal |
| 4. Master interaction spec | Concrete behavior/state/focus/responsive rules with stable specification IDs | Ready for review; implementation/testing not claimed |
| 5. Approved demos | Three exact source hashes checked and existing demos captured at four widths; differences catalogued against actual deployed views/source | Structural comparison completed; unequal fixture data means no blanket pixel-fidelity pass |
| 6. Connected prototype | Five prioritized end-to-end journeys, shared object/state continuity, error branches and complete return paths | Planned only; no prototype code added |
| 7. Acceptance | Quantified targets and independent blocking gates; function/accessibility override unsafe fidelity | Specified, not measured as achieved |
| 8. Feature parity | User capability rows, all deployed route declarations and full 374-handler register; no-removal fallback | Design coverage, not proof of an unbuilt redesign. Runtime parity remains a mandatory future gate |
| 9. Preserve architecture | Existing frontend/modules/contracts/DB/auth/workflows/deployment retained as explicit invariants | No application changes made by this revision |
| 10. No independent frontend/dependencies/implementation | Existing review package is the proposed future prototype home; zero new dependencies, server or production route | No prototype/application construction performed |

## 4. Evidence and authority boundary

Canonical staging was inspected at `http://localhost:59443`, matched web/API commit `70b047cd57af5d4a755e45c5c99b06e4039a46c8`, build `70b047cd57af-1792849822919`, schema120. The immutable deployed source is the parity baseline. The checkout differs and contains unrelated work; revision2 does not treat those edits or `/v15-preview` as an accepted replacement.

The existing protected test-credential store contains five enrolled STAFF accounts. They were authenticated using ordinary passkey challenge/verification and current backend sessions. A virtual authenticator supplies their already-enrolled test key; **identity, session, roles, scope, responses and permission results are real persisted backend behavior**, not intercepted role responses. This is still test-account UX evidence, not actual operational staff-pilot acceptance or proof of physical passkey-device usability.

Read-only inventory verifies one OWNER and five STAFF accounts, **zero CLIENT/EXTERNAL accounts and zero client/external grants, portal sessions, client review packages or items** on canonical staging. Earlier disposable test fixtures do not make those identities available on this retained database. The Owner confirmed they do not hold passwords; none are needed for existing internal passkeys. We did not create portal identities, grant access, configure email, generate OTPs or bypass authentication to fill the gap.

All audit domain writes were blocked. Only normal authentication actions were allowed; sign-in/own-session logout legitimately updates ceremonies, signing counters, security events and session metadata. No task/project/review/HR/configuration command was submitted. The role reports preserve the initial interrupted evidence and an initial repeat-login401 separately from later ordinary successful logins. Prototype-reference captures are labeled as fixtures and never counted as real-role verification.

## 5. Key findings added by real-role work

1. **Names are not capabilities.** Both Team Leaders are actual Project Leads, yet their returned project capabilities allow some lifecycle work and do not grant Owner-only contributor/lead administration. Designers/Site Staff have a narrower capability result. The proposed IA cannot infer access from role titles.
2. **Presentation profiles are configured separately.** All five STAFF accounts currently receive generic EMPLOYEE creation presentation, including Team Leaders and Site Staff. Leader `canAssign=true` remains real authority; Designer/Site `canAssign=false`. Do not automatically map title strings to a different profile as part of visual cleanup.
3. **Review context differs by account.** The leaders/designers have named waiting assignments; the Site account has none in the checked waiting queue. A visible Reviews link is not evidence of a permitted decision. Show the returned exact assignment/state.
4. **Source loading is independent.** Some captures show a loaded task count while separate My Work attention/review reads are still loading. A new consolidated visual strip must preserve independent source states and must not replace an unknown count with zero.
5. **Current test data is not a fully configured studio.** No client packages, files, active scoring/leave policy or complete site-delivery lifecycle is available for every relevant state. Setup absence and true access denial are distinct from UI defects.
6. **The Owner's frequent correction loop needs stronger guidance.** Actual phone review detail puts extensive round/submitted-snapshot metadata before the correction instruction, while the linked correction task has a return-to-instructions link. Put an exact-round correction summary/link near the primary work context, retain the complete comment and snapshot, and explain why original resubmission is blocked until the correction task is complete.

The original22 usability findings remain a useful baseline. No newly observed403 is automatically a security bug, and no missing fixture is described as missing application functionality.

## 6. Proposed product organization

- **Daily:** Dashboard, My Work, Tasks, Decisions, Notifications; personal Time, Workforce and Learning as secondary destinations.
- **Project work:** Projects and its existing eight sections; cross-project Files/Drawings, Internal/Client review and Delivery queues remain directly reachable for specialists.
- **Management:** People and reporting context, Sales & clients, performance/project health, reports/summaries, workforce/learning management and evidence assistance.
- **Configuration:** Organization/access, task presentation, templates, policies, notification preferences, integrations, automation, audit/retention and account/devices.

These are information homes, not new organization tiers or permission scopes. A route may expose distinct personal and management views using its existing context. Each capability has one canonical owner; shortcuts do not create another workflow. No dashboard re-default or mobile-primary change is proposed without observed user need.

## 7. No-regression invariants

- Every existing accepted route, deep link, query key, fragment and owning-module action remains available until its explicitly mapped replacement has passed parity. The old route remains the fallback while that happens; no archive/delete shortcut.
- Keep `TaskWorkspace`, canonical creation fields/options/receipt recovery, current Project sections, WorkspaceLayout/Header, review evidence and owning-module forms. Do not fork role-specific task forms or add a new state store/backend.
- Requirements stay immutable. New review work still needs file/link evidence; independent internal approval precedes authorized automatic client delivery; Primary final approval identifies exact Confirmed drawings. Formal issue, transmittals and site handover are separate decisions.
- Preserve Branch/Team/project/reporting distinctions, current authorization on every read/mutation, Confidential ancestor/file controls, source-specific report access, current monetary/time/date/leave/scoring calculations and explicit policy values.
- Never add an API, schema, grant, global search service, default policy number, new identity method, external provider or automatic domain action under an interaction-spec label.
- Preserve offline drafts/queue and account/project isolation, PWA update waiting behavior, dirty form/uncertain write recovery and retained artifacts/configurations/branches/data. No automatic retained migrations.
- A beautiful demo does not establish current permission, evidence, persistence or responsive correctness.

## 8. Prioritized next gates

| Gate | Required result | What it authorizes |
|---|---|---|
| R2-A: absent-role fixture decision | Owner chooses isolated fixture audit or explicitly accepts a documented blocked portal gate | Only the chosen audit scope; no application implementation |
| R2-B: priorities and IA review | Owner confirms operational top workflows; tree-test the selected hierarchy | Baseline for prototype specification; not a live nav change |
| R2-C: prototype-only authorization | Owner explicitly approves the bounded connected P1/P2 review artifact, its exact approved demo sources and scenario set | Only prototype construction in the existing review package; no app code/server/database change |
| R2-D: prototype acceptance | Scenarios, accessibility, responsive, visual and parity design gates pass separately | Permission to request a specific application slice; no automatic implementation |
| R2-E: application slice approval | Exact selected files/scope/requirements/tests and staging acceptance approved | Only that bounded retrofit in existing React frontend, then existing reviewed release workflow |

The Owner confirmed the priority: create tasks, check work, work on Projects, read review comments, correct the work and resubmit. The first future prototype should therefore connect daily work → create → detail → Project tasks, immediately followed by internal review comments → linked correction task → existing completion prerequisite → resubmission. Client delivery/final approval follows after its missing real-role evidence. It reuses the three approved demos and tests context continuity rather than isolated screens.

## 9. Definition of “ready”

This revision makes the plan/specification reviewable. It does **not** close absent CLIENT/EXTERNAL roles, establish an actual top15 usage ranking, prove a future UI preserves every capability, certify accessibility, or authorize construction. Those gates have named evidence/decision requirements instead of assumed passes.

No application suite/build/migration/deploy was run or claimed. Audit harnesses and evidence validation are separate from product regression. Current Codex performed this revision; no Opus, Sonnet, subagent or independent acceptance is claimed.

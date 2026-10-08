# UI engineering migration and regression plan

Date: 2026-10-05 · Status: **PLAN ONLY — do not start T01**

This is detailed engineering context split from the product/UX master so implementation and QA sessions can load it only when needed. The current audit pins to accepted S22 commit `d21ccd1`; rebaseline after Owner-accepted S27 before using this plan. Every wave remains proposed, relies on owner-approved screen/visual artifacts, and needs a separate explicit implementation start instruction. This document is not an approved technical design, route contract, test execution request, migration, rollout or deployment authorization.

## Hard boundaries carried into engineering

- CURRENT / PLANNED / PROPOSED classifications in the master remain controlling. A specification or prototype is not an implemented/accepted capability.
- The UX transformation changes presentation. Domain business rules, approval actors, permission enforcement, data meaning, calculation/version, evidence identity and audit history remain in their owning modules.
- The only organizational hierarchy is Organization → Branch → Team → Employee. Project owning-branch and explicit cross-branch assignment semantics continue unchanged. Role names alone do not grant capabilities.
- Preserve exact revision/checksum/round and distinct internal review, client item decision, Primary final package approval, issue/transmittal, site verification, management closure and handover states.
- S22 offline mode stays deliberately bounded. No generic API/file/confidential/finance/workforce cache, new offline actions, auto-rebase or silent last-write-wins. Keep stable keys, current reauthorization and human conflict resolution.
- S18 remains out until the Owner separately resolves it. Do not stop, replace or reformat concurrent functional S23–S27 work for UI preparation.
- No production deployment readiness follows from local UI acceptance. Keep S22's separately disclosed unintended local `postgres` migration outside this plan; never clean/reset it as UI work.

## Dependency and responsibility model

The React/TypeScript/Vite PWA and versioned REST API form the established implementation architecture. Retain that stack unless a separately reviewed, explicit architecture change is approved. Keep domain state/read models in their service owners. Shared UI composition consumes documented read contracts and capability fields; it never calculates permissions, performance scores, entitlement, approval eligibility or workflow state. Internal, CLIENT, EXTERNAL and public portfolio identity/session boundaries stay separate.

Before editing any wave, write a handoff with: exact requirement IDs/sub-IDs; included/excluded pages/states; accepted source commit; existing route/callers; field/action-to-source/capability/version mapping; permission/evidence/cache consequences; unresolved rows from [API Gap Register](API_GAP_REGISTER.md); affected tests; and rollback point. Sol resolves material requirements/schema/security decisions and reviews acceptance. Luna can execute fully specified documentation/UI/test increments, with no authority to settle new business rules.

## Migration waves after all UX gates and authorization

The sequence below is a candidate. Reorder only after dependency review, without bypassing the five-screen representative prototype Owner stop.

| Wave | Candidate scope | Technical migration conditions |
| --- | --- | --- |
| T01 Shell | Shared internal shell/nav, route bridge, account/security placement and approved primitives | **Not approved.** Requires Gate A + Gate B + five-prototype Owner review and separate explicit start. Preserve portal shells/passkey/session/logout/return semantics. |
| T02 Work & decisions | My Work, task list/detail/create, actionable attention, exact review/correction | G01–G04 current accepted read/capability contracts or fallbacks; primary owner vs collaborators; stale versions and immutable histories. |
| T03 CRM & projects | Lead, project workspace, scope/team/templates, stage/milestone, lifecycle | Source lifecycle/access parity, branch/lead/exit/cancellation guards, scoped totals and direct-link return. |
| T04 Evidence & reviews | Documents/register/viewer, review, client items/final, issue/transmittal | G05–G07 decisions; checksum/current grant/Confidential tests; route/email/native handoff exactness; no screen-supplied file access. |
| T05 Field operations | Time, workforce, Turnkey/Site, offline queue and conflicts | Existing server calculations/approval; no photo cache expansion; old/new PWA queue migration and synchronized receipt preservation. |
| T06 Portals/public | Client, consultant/vendor/factory, gallery/portfolio | Identity/cookie isolation; exact grants/expiry/cancellation; public derivative publication lifecycle; session invalidation. |
| T07 S23–S27 product | Accepted Performance/Health, Reports, integrations, automation, internal assistant | Schema/API accepted first; historical version fidelity, role field filters, export/idempotency, source freshness and human-action record. |
| T08 Cleanup | Remove superseded view only after route/behavior parity | No hidden old route removal; full cross-product regressions, accessibility/usability, docs and recovery evidence. |

S18 remains a separate decision/development wave. Do not attach it to T07 simply because knowledge patterns are in the Visual Reference Library.

## Route, state and release migration

Preserve existing canonical route identities and allowed deep links while adopting shared shell patterns. Maintain direct links through login/step-up/passkey callback, notification, transmittal and native-share return. Project/task/document context must be reauthorized when opened and again before commands. Back returns to filters, pagination and scroll only while the identity/grant remains valid; access loss clears protected record, viewer pixels/object URLs and scoped drafts.

Use additively composed presentation around existing contracts. Any route/API/DTO/schema/dependency change gets a separate source owner, requirements map, permission review and additive data/preservation plan. Do not change API behavior merely to make a prototype fit. Any feature-flag or parallel-route migration requires an explicit release design. Keep one deployable prior UI revision and a tested rollback for each wave; rollback cannot revert durable commands, decision history or canonical offline receipts.

PWA shell update compatibility is high priority: test old installed shell with new server and new shell with queued S22 data. Keep cache contents within current allowlist. Do not silently migrate/delete IndexedDB commands; protect idempotency and account-binding, explicitly surface unsupported storage versions and restore a safe online route. Offline photo retention and grant loss follow existing S22 rules.

## Regression and acceptance matrix

Run only applicable existing/reviewed gates for a future approved wave, then repository-required checks. This table defines planned engineering evidence; none was run in this refinement pass.

| Layer | Required checks |
| --- | --- |
| Source/contract review | Every field/action maps to owning source, capability, version, evidence and scope/completeness; direct route load and deep link preserve exact identity. |
| UI component | Loading/empty/scoped-empty/partial/stale/denied/error/retry/conflict states; focus/keyboard, screen reader names/status, double submit, field errors, narrow reflow and preserved return. |
| API/security | Tampered record/file/branch IDs, cross-branch access, revoked grant/session, exact current/superseded evidence, self-review/self-approval, stale/concurrent command and actor eligibility. Verify protected strings/counts/exports do not leak through hidden UI or search. |
| Database/persistence | Refresh survives commands, history retained, no duplicate events, snapshots immutable. UI work does not change data; any functional additive schema contract has separately reviewed fresh/upgrade preservation. |
| Desktop/mobile E2E | All affected roles, 320/390/768/1024/1440 widths as applicable, return, reload, read-only/cancelled/revoked, long names and high-volume data; equal states should use matched fixtures. |
| Review/evidence | Source bytes/checksum unchanged; exact revision/round/recipient/decision; viewer failure blocks annotations; permission loss scrubs content. |
| Offline/PWA | Cold prepared capture, truthful local saved/uploaded/synchronized states, quota/storage failure, lost response, independent retry, conflict compare/keep/amend, identity switch/logout/purge and no protected API/file cache. |
| S23–S27 | Accepted score policy/formula versions and unscored states; authorized dashboard fields and immutable export; provider delivery failures/idempotency; human approval for high impact; evidence scoped AI and adversarial prompt/ID tests. |
| Visual/accessibility | Approved token state, matched capture fixture; keyboard/screen-reader; focus visible/unobscured; contrast; zoom/text spacing/reflow; reduced motion; touch target; no hover/drag-only essential paths. |
| Full gates | Pinned Node 24.19.0/pnpm 11.19.0; applicable typecheck, lint, build, unit, real PostgreSQL integration, desktop/mobile Playwright and `pnpm verify`; record environment/result. Do not claim server lifecycle, hosted CI or production deployment unless those run. |

Use dedicated isolated fixtures/test databases and preserve all retained records. Classify any failing gate before changing code. Never relax sound permissions/tests or use production-like data merely to obtain screenshots. Respect the Windows Playwright managed-server lifecycle caveat in the S01 completion record and the S22 incident disclosure. Update docs after meaningful approved implementation; this refinement pass must not edit shared status or functional slice reports.

## Human usability study and baseline protocol

Detailed protocol belongs beside engineering evidence because future test/design sessions need it without loading all functional context. Master-plan section 11 sets the acceptance principle; this section defines research handling.

Before redesign exposure, identify representative real users for each critical journey/persona, obtain consent and Owner approval for participation/data, and run the same task scripts on the current accepted product with realistic but safe records. Do not coach. Record assistance requests, and only supply standardized rescue when continued safety or protocol requires it. Never ask a participant to execute a real unauthorized approval/destructive command.

For each anonymized participant/task record role context, relevant permissions, data condition, device/browser/viewport/network, start/end definition, completion result/time, pauses/hesitation, wrong route/backtracking, terminology confusion, information missed, steps actually performed vs task minimum, assistance requested, abandonment and decision/evidence errors. Categorize error severity before summarizing; any serious authority/evidence/privacy error gets case review irrespective of aggregate success. Separate verbatim observations, observer interpretation and product decision. Keep source notes access-controlled and retention-limited; summaries use pseudonyms and omit project/employee sensitive data.

Calculate baseline measures with denominator, missing tasks and sample size exposed. After the baseline, the Owner and participants/research lead set per-task acceptance thresholds and explain the target using baseline distributions and risk. No improvement percentage, timing target or universal score is invented in this plan. Repeat the identical critical tasks after each relevant wave and final candidate; compare the same conditions. Final UX acceptance needs baseline-approved targets met and no unresolved serious decision error. A small sample may identify obvious problems but must not be presented as a statistically robust population estimate.

## Evidence management

Store post-S27 captures/research/regression results with accepted commit, route, persona/capability, fixture state, date/time, viewport/device, network, browser, test ID/result and reviewer. Keep full page plus normal viewport where useful. Matched before/after comparisons use identical fixture identities/states with non-sensitive fictional identifiers. Captures are not proof of permission/security or user success; link API/E2E/test/session records. Save approval records for Gate A, Gate B, prototype stop, each implementation scope and final UX acceptance separately.

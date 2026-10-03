# UI design review and verification

Date: 2026-10-01 (Asia/Kolkata). Status: DESIGN REVIEW; specification not frozen.

## Deliverables and limits

UI_SPECIFICATION_V1.md maps design scope, confirmed decisions, component proposals, known read-model gaps and the freeze gate. SCREEN_CONTRACTS.md supplies a shared contract and eight core screen contracts. mockups.html is a local, fictional-data presentation prototype; it does not read/write application records, enforce real permissions or change any S-series status.

Existing application source, schema, migrations and unrelated working-tree changes were preserved. The implementation plan and current-state context only record the requested design work. No dependencies were installed. The localhost preview serves the one design HTML only.

## Review findings

The primary agent's review found and requested corrections for cross-project sample data inside a project workspace, client/CR scope appearing in the internal design package, inferred health/progress, contradictory submitted/approved drawing identity, stale or generic task links, mobile document-table duplication, mobile date-label collisions, reviewer action inconsistency and read-only state restoration. Mockup browser execution also reproduced an undefined docSearch render error. These are design-prototype defects, not confirmed defects in the production application.

## Verification evidence

Final browser results are recorded in preview-verification.json. verify-preview.mjs covers seven screens at 320/390/768/1024/1440px, loading/empty/error/read-only at desktop/mobile widths, overflow/nonblank output, role-gated illustrative decisions, filter/reset, list/board comparison, exact correction task links, mobile document layout and local decision dialog controls. Captured screenshots are under previews/.

Final revised mockup run: `node docs/ui/v1/sync-mockup-interactions.mjs` succeeded and `node docs/ui/v1/verify-preview.mjs` exited 0. At 2026-10-01 10:30:58 Asia/Kolkata the recorded result was **317 assertions, 0 failures, 0 browser script errors**. This supersedes earlier prototype results. These are presentation assertions, not application acceptance tests.

The expanded pass checks individual visible content bounds as well as page overflow, informational board parity (all six tasks), editable date-range/basis filters, named-reviewer decision forms, read-only disabling, independent attention/task errors, document filtering, exact correction links, mobile More → global document register and manager attention without substituting employee tasks for personal work. A 768px document-action clipping defect was reproduced and fixed by using cards at 768–1023px. The generated intermediate-layout block is now replaced idempotently when synced.

Primary-agent screenshot inspection reviewed My Work desktop/mobile, project overview, mobile Documents, correction Task Detail and Review/Correction. Labels for target/committed dates are separated; mobile Documents uses cards without the duplicated desktop table; review displays exact revised R2 and retained R1 correction evidence; completed correction remains distinct from parent approval. Reviewer controls are visibly disabled for the submitter. Keyboard Escape dismissal was checked for the local decision dialog. Full keyboard/screen-reader and touch-target audits are still implementation acceptance work, not claimed complete here.

The compact workflow plan is the entry point. Its exit/reassignment journey now explicitly retains the departed current primary owner until authorized individual replacement. Mockups remain representative: action toasts and drawing placeholders illustrate positions rather than fully implementing creation, submission, real viewing, upload, approval persistence or every edge case. Client journeys remain S14-dependent design flows and are not part of this internal prototype.

Palette arithmetic checked contrast ratios: white/forest 8.20:1; ink/cream 12.32:1; secondary text/white 6.08:1; amber status text/fill 5.77:1; red status text/fill 6.00:1. These pairings exceed 4.5:1; this is not a full accessibility audit. Small labels, focus, touch targets and all component states still require implementation-stage inspection.

No pnpm verify, application typecheck/lint/build, API/database/permission/persistence/audit tests, CI, Compose or production checks were run for this design-only package. Mock role disabling is presentation demonstration, not evidence of server authorization. Spec acceptance scenarios remain planned tests for the eventual authorized implementation.

## UI-V01 shell and My Work graphics — 2026-10-01

The first graphics increment adds consistent labelled SVG navigation, action-type attention symbols, task status symbols/badges, named owners with decorative initials, and separate target/committed date markers. Management attention has its own scope label; inferred attention counts were removed. Navigation labels remain readable at intermediate widths and on mobile. No application source, schema, permissions or business state changed.

`node docs/ui/v1/sync-mockup-interactions.mjs` succeeded and a before/after SHA-256 comparison confirmed an unchanged regenerated HTML file. `node docs/ui/v1/verify-preview.mjs` exited 0 at 2026-10-01T05:33:31.298Z: **449 assertions, zero failures and zero browser errors**. Added checks exercise five widths and three personas, visible navigation/action labels, decorative SVG semantics, exact reviewer R2 evidence labels, separate management attention, owner/date bases and keyboard navigation/current destination. The earlier uppercase-label assertion mismatch was corrected after inspecting rendered text; it was a verifier case-sensitivity issue. Screenshot inspection caught and corrected a wrapped attention-action arrow.

My Work desktop/mobile screenshots were inspected. Attention remains above task work; labels stay beside status/owner/date graphics. Full screen-reader, contrast and human comprehension acceptance are pending. These are fictional-data presentation checks; no API/persistence/audit/permission or application quality gates were run. Models: GPT-6.1 Sol context intake; GPT-6 Luna bounded mockup edits; primary agent integration and final review.

## UI-V01 core graphics continuation — 2026-10-01

Overview now shows the applied three-stage plan with recorded states and required gates. Task Detail shows current state, Target/Committed markers and a separately labelled pending extension. Review shows retained R1 and current R2 summaries: inspecting historical R1 is read-only and does not replace R2 as the current decision target. The evidence area explicitly says it is an illustrative viewer placeholder. Documents shows exact R0/R1/R2 identities/states and opens the selected identity in a fictional viewer notice; detailed register rows/cards are in a collapsed native disclosure to avoid duplication.

During screenshot review a graphics insertion had removed the original core component-style block. It was reconstructed from earlier/surviving rules (the HTML had no Git baseline), then visually inspected; a computed-style regression assertion now checks core layout/panel styling. The first history-summary test expected the note to change rather than the separate read-only summary; that assertion was aligned to the summary-only design. The global-document test now opens the intentionally collapsed file-details section. No application defect or live-data change is implied.

Final `node docs/ui/v1/verify-preview.mjs` exited 0 at **2026-10-01T05:46:31.510Z: 555 assertions, zero failures and zero browser errors**. This supersedes the earlier 317/449/550 presentation results. Checks include five widths, all prior states/interactions, stage fidelity/no invented percentage, unchanged pending commitment, historical/current review separation, exact revision open notices and collapsed document details. Sync before/after hashes matched; JavaScript syntax checks passed. Desktop Overview/Task/Review and mobile Documents screenshots were inspected after the repair. Remaining full accessibility, real-user comprehension, held-project/dependency/error-evidence fixtures and real application permissions/persistence/audit gates are unverified. Models remain GPT-6.1 Sol for context, GPT-6 Luna for bounded mockups, primary agent for integration/review.

## Pending Owner review and freeze

### Inline point and rectangle comments — 2026-10-02

Owner corrected the intended interaction to clicking and writing beside the location, plus marking a rectangle area. review-inline-interactions.mjs now provides Point/Rectangle tools, normalized drag bounds (including reverse direction), adjacent inline composer, existing-pin feedback inspection and keyboard numeric corners. Posting routes through the same local reviewer-only feedback behavior; source SVG is unchanged. Per-round text drafts remain safe and location attachment clears on page/round change. Access loss clears overlays and hidden inline fields. Region geometry is explicitly fictional/local and requires a reviewed application persistence extension; no schema, DTO or source evidence changed.

`node docs/ui/v1/verify-inline-review.mjs` passed **87 checks at 2026-10-02T04:37:20.614Z**, zero failures/browser errors. Covers five widths, editor viewport bounds, point posting, reverse rectangle drag, region persistence through zoom/page return, source-SVG equality, role/history/access-loss guards and numeric rectangle alternative. Existing `verify-review-canvas.mjs` separately passed **105 checks at 2026-10-02T04:36:56.909Z**; its pin assertion now checks on-canvas feedback inspection to match Owner direction. Targeted prototype-script lint passed. Desktop/mobile screenshots inspected; an oversized mobile popover caused by conflicting fixed insets was corrected. Full touch-device/assistive-technology/human comprehension and real backend/renderer checks remain pending.

Models actually used: GPT-6.1 Sol context; GPT-6 Luna bounded CSS; primary interaction implementation, integration and verification. Rectangle selection is not AI editing, formal correction decision or approved application storage. UI v1 remains unfrozen.

### Conversational review canvas — 2026-10-02

SC08-C now has a separate fictional review-canvas.html experiment, linked from the original Review screen and served at http://127.0.0.1:4180/review-canvas.html. Large illustrative architectural SVG sheet, numbered pins, human feedback cards with actor/time/reason/location, page/zoom controls, keyboard coordinate alternative and mobile canvas/feedback jump controls demonstrate the proposed anatomy. Named reviewer can post local feedback; employee, historical and read-only states suppress writes. Separate decision dialog names exact Round 2/R2 and requires trimmed reason; corrections also require category/severity/comment. No renderer, AI edit, source bytes, real decisions or assignment authority were introduced.

Independent `node docs/ui/v1/verify-review-canvas.mjs` passed **105 checks at 2026-10-02T04:22:36.491Z**, zero failures/browser errors. Five-width state/role checks, pin-to-feedback focus, local posting, historical identity, per-round draft retention, page selection clearing, zoom identity, decision fields/whitespace validation, timestamp context, access-loss clearing and 200% text-size reflow are covered. Desktop/mobile screenshots were inspected and final desktop re-inspected after styling repair. `pnpm exec eslint docs/ui/v1/*.mjs docs/ui/v1/mockup-interactions.js` passed; script synchronization hash is idempotent; scoped whitespace check passed. Main mockup separately passed its 630 assertions at 2026-10-02T04:10:01.773Z after the new entry link. Neither count proves real authorization, saved commands, PDF coordinate accuracy, full accessibility or human comprehension.

Initial prototype defects included stale R2 historical labels/pins, discarded drafts, page-point retargeting, incomplete access clearing and decision validation. Sol review identified them; primary replaced the interaction script and verified the repairs. Screenshot inspection caught inherited feedback-grid styles and unreadable selector text; corrected. The large-text regression caught narrow form overflow; shrinkable controls and mobile stacking repaired it. No application defect or live-data mutation is implied.

Actual models: GPT-6.1 Sol context and rule review; GPT-6 Luna bounded visual markup; primary corrected interactions, integration, verification and documentation. Four Owner choices, human/assistive-technology review and explicit freeze remain pending. Real renderer, revoked stream/session handling and backend command/evidence/audit tests belong to authorized implementation.

### Latest planning-readiness increment

UI_DELIVERY_PLAN.md now gives a compact all-60 research disposition, source/gap matrix, scoped fallbacks and bounded build handoff. DESIGN_REVIEW_WORKSHEET.md records actual review still needed. Eight fictional storyboard fixtures illustrate review/correction/resubmission, non-review completion, lead-exit hold, rejected extension, hidden dependency warning, failed exact evidence, failed finalization and revision/issue/access loss. Their labels are illustrative context, not canonical persisted statuses. Sol review corrected former-lead/current-vacancy wording and separated task status from extension outcome. S14 is independently COMPLETE for local staging; stale UX14/15 references now point to its current exact item versus Primary final rules.

`node docs/ui/v1/verify-workflow-fixtures.mjs` passed **477 checks at 2026-10-01T06:30:13.906Z**, zero failures/browser errors. This is a separate report (workflow-fixture-verification.json), not added to the main mockup's 630 assertions. It covers eight fixtures and their scene selection at five widths, keyboard disclosure, rejected commitment/exact revision/finalization/access-loss labels, selected 44px control heights, reduced-motion preference and 200% text-size reflow. A reproduced text-size overflow was fixed by text wrapping and shrinkable scene-navigation controls. Desktop/mobile board screenshots were inspected; no executable form/command/permission test is implied.

Selected text pairing calculations: ink/cream 12.32:1; ink/white 13.54:1; muted/white 6.08:1; white/forest 8.20:1; forest/white 8.20:1. These five pair checks do not verify all semantic colours, control states, focus indicators or WCAG conformance. See W3C reference in UI_DELIVERY_PLAN.md. Full main-screen zoom, screen-reader and human-comprehension review remain pending.

Targeted `pnpm exec eslint docs/ui/v1/*.mjs docs/ui/v1/mockup-interactions.js` passed. The previous status observation about prototype lint defects is superseded by this actual check; this increment did not claim to fix unrelated application lint. No application quality gates were run by this UI turn. Models: GPT-6.1 Sol context and final rule/acceptance review; primary implementation/documentation; Luna delegation reached the agent thread limit and did not run in this increment. Final freeze still requires the four pending Owner choices, human/accessibility review and explicit concrete package acceptance.

Final handoff checks: the research disposition contains exactly IDs 01–60 once each; board regeneration hashes match; allowlisted board HTTP returns 200 and /AGENTS.md returns 404 from the local-only preview server. New generator/verifier syntax and scoped whitespace checks passed. These checks establish document consistency and preview isolation only.

### Research prototype increment: candidates 07/08/09

Read-only task previews are available from My Work and Project Tasks, with a desktop modal side panel and mobile modal card. Closing restores opener focus and scroll. Full detail provides return to the originating filtered list. Essential owner/status/date fields remain visible when My Work density changes through its Display options disclosure. No mutation commands were added to the preview; nonmodal split-view interaction remains unexplored.

Final standalone verification at **2026-10-01T06:11:04.462Z passed 630 assertions with zero failures/browser errors**, superseding the 555-assertion result above. Added checks cover five widths, keyboard dismissal/focus, filter-preserving return, read-only use, pending extension and reassignment context, essential compact fields, viewport bounds and immediate content clearing on state change. Desktop/mobile preview screenshots were inspected. A delayed dialog close event could clear a newly reopened dialog; the close handler now ignores that stale event when the dialog is open. This was a prototype defect. Full screen-reader testing, human comprehension and application permissions/persistence/audit remain unverified. No production quality gates were run for this fictional mockup increment.

Actual models this increment: GPT-6.1 Sol context intake and boundary review; primary agent implementation/integration and final presentation review. Luna delegation hit the agent thread limit, so no Luna implementation is claimed for this increment. Prior increments' model records remain historical.

Open decisions: comfortable/compact task density; list/board in v1; global Documents alongside project Documents; exact palette/typeface. Review recommendations are in UI_SPECIFICATION_V1.md. These choices and final package acceptance must be recorded before marking v1 FROZEN — OWNER-APPROVED. Broad UI implementation remains outside this turn.

Models used: primary GPT-6 agent for earlier contracts, local integration and final presentation review; GPT-6.1 Sol for this continuation's project-context intake and requirement-boundary review; GPT-6 Luna for bounded standalone mockup construction and final responsive refinements. GPT-6.1 Sol confirmed no material compact-flow mismatch and identified the employee-exit ownership wording clarification. The currently running primary chat was not automatically switched by AGENTS.md.

## Environment limitations

The default Windows shell and browser REPL failed before execution with the sandbox helper's apply deny-read ACLs error. Approved escalated shell execution provided repository inspection and local mockup/browser verification. Playwright used the existing installed Chromium. A temporary automatic-review usage-limit failure interrupted an earlier refinement attempt; later authorized calls succeeded, and no action in the current package remains blocked by it.

Unrelated context observation: PRODUCT.md retains older unauthorized/pending slice wording in historical paragraphs. CURRENT_STATE.md, IMPLEMENTATION_STATUS.md and current slice specifications supply the current status. No unrelated status rewrite was performed.

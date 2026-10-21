# SENSE STUDIOS — EFFICIENT DEVELOPMENT, TESTING AND COMPLETION PROTOCOL

## PRIMARY OBJECTIVE

Complete the Sense Studios Work Management application efficiently, accurately and with minimum unnecessary attempts.

We have spent too many development cycles on:

- Outdated Playwright selectors
- Test harness failures
- Repeated authenticated database setup
- Small UI corrections discovered after expensive testing
- Repeated Owner authorization requests
- Multiple validation reports without final feature completion

From now onward, follow a **SPEC → IMPLEMENT → SELF-REVIEW → VERIFY → CONVERGE → OWNER ACCEPTANCE** workflow.

**Your responsibility is to deliver a complete, internally verified implementation within each approved scope before requesting Owner acceptance.**

Do not reduce functional reliability, UI quality, authorization standards or security to save time.

Instead, eliminate avoidable testing failures, duplicated work and unnecessary validation cycles.

---

## PART 1 — IMMEDIATE MW-I02 STATUS

MW-I02 remains IN PROGRESS.

Current accepted facts:

- Previously authenticated bounded functionality: PASS
- Current frontend tests: 45/45 PASS
- Typecheck, lint and build: PASS
- Prior authenticated five-item Owner reassignment verification: PASS
- Latest mobile presentation corrections: implemented
- Current-source full-shell visual acceptance: BLOCKED
- MW-I03: NOT STARTED

The latest authenticated run, `1791647954161-9c235e5cf941`, failed because of TEST HARNESS defects, not a demonstrated application regression.

Established failures:

1. `acceptance.spec.ts:704` expects obsolete text:
   "Showing 2 active personal tasks."

   Current approved application text:
   "Active · 2 personal tasks."

2. Another obsolete Waiting assertion remains around line 722.

3. The review integration runner requires `authenticatedBrowserAcceptance.state=passed`, even though independent review testing was authorized after a browser assertion failure.

4. Because the journey is monolithic, those failures prevented the later Owner and mobile visual acceptance evidence from being captured.

Do not modify correct application wording merely to satisfy obsolete tests.

Do not restart the development process.

---

## PART 2 — FIX THE ROOT CAUSE BEFORE ANOTHER ACCEPTANCE RUN

Perform a comprehensive TEST-ONLY harness review.

Inspect the entire MW-I02 acceptance test, its helpers and all existing validation scripts.

Specifically:

### A. Audit all test selectors and assertions

Compare every relevant assertion with the CURRENT application source.

Inspect:

- Text expectations
- Accessible names
- Status messages
- Phase labels
- Task counts
- Disclosure labels
- Responsive controls
- URL expectations
- Navigation
- Task opening
- Empty states
- Loading, stale and denied states
- Selected and unselected widget states

Correct outdated assertions while preserving their semantic meaning and specificity.

Do not use excessively broad regex, arbitrary waits, forced visibility or skipped assertions to make tests pass.

Prefer resilient role/label-based locators and explicit state checks.

### B. Audit the complete Playwright journey

Inspect the test from beginning to end.

Identify likely failure points before execution:

- Incorrect text expectations
- Stale locators
- Context creation without required device capabilities
- Hidden disclosures
- Incorrect viewport heights
- Focus-dependent controls
- Unexpected navigation
- Incorrect fixture assumptions
- Missing synchronization
- Dependent tests incorrectly described as independent
- Cleanup sequencing problems

Correct legitimate HARNESS defects before requesting the expensive authenticated run.

Do not modify production application behavior unless independently demonstrated defective and within approved scope.

### C. Correct the review-stage dependency

Examine `run-task-integration.mjs` and its manifest requirements.

Determine whether review integration genuinely depends on browser-created records or authenticated-browser success.

If independent, allow the review stage to execute after failed browser assertions provided the exact run environment and fixture prerequisites remain valid.

If dependent, make the dependency explicit and provide a safe independently prepared fixture through the existing reviewed setup, if possible without expanding authorization or altering production behavior.

Do not bypass identity, database ownership, fixture integrity or cleanup guards.

A browser UI assertion failure should not unnecessarily prevent a genuinely independent PostgreSQL review test.

---

## PART 3 — ADD A PRE-ACCEPTANCE READINESS GATE

Create or reuse a lightweight acceptance-readiness check.

It must run BEFORE any future authenticated database setup.

Required checks:

1. Exact current source and test-harness versions identified.
2. Playwright syntax and TypeScript validation pass.
3. Selectors and expected wording audited against current frontend components.
4. Required viewport and touch capabilities verified.
5. Mobile disclosure and focus assumptions reviewed.
6. Expected fixture counts and task states reviewed against setup logic.
7. Test sequence and stage dependencies validated.
8. Required capture states and output paths validated.
9. Existing cleanup protections preserved.
10. No unexplained new affected frontend failures.

Use frontend unit tests, local component fixtures and read-only source inspection for this gate.

Do not claim static analysis proves authenticated runtime behavior.

If the readiness gate identifies a problem, fix and recheck that problem locally BEFORE requesting another full run.

Never start the database acceptance process merely to discover an easily detectable stale locator.

---

## PART 4 — MAKE THE WORKFLOW EFFICIENT

For all remaining My Work slices, use the following development sequence.

### Step 1: Understand

Read the approved requirements, decisions, prototype and existing implementation.

Identify what is already complete.

Do not repeat discovery work unless the source requirements actually changed.

### Step 2: Plan once

Prepare one coherent implementation plan covering:

- Functionality
- Permissions
- Role-specific behavior
- Responsive UI
- Interaction states
- Tests
- Integration dependencies
- Acceptance criteria

Resolve material ambiguities before implementation.

### Step 3: Implement coherently

Complete the approved feature scope in small reviewable changes.

Do not repeatedly interrupt the Owner for ordinary code decisions, CSS adjustments or test-harness corrections.

### Step 4: Self-review

Before declaring the implementation ready, independently review:

- Code correctness
- Existing architecture reuse
- Permission preservation
- Responsive layout
- Visual hierarchy
- Accessibility
- Task navigation
- Failure states
- Test coverage

Use available independent review agents where useful.

### Step 5: Test locally

Run focused tests and component-level visual checks.

Inspect the actual rendered interface.

Fix all observed material defects in a coordinated local correction cycle.

### Step 6: Verify the approved prototype

Use the exact approved Sense Studios prototype and compare equivalent states at:

- 1440px
- 1024px
- 390px
- 320px

Compare actual hierarchy, layout, density, task discoverability, controls and mobile navigation clearance.

Do not fabricate canonical task counts or backend behavior to imitate illustrative prototype data.

### Step 7: Acceptance readiness

Run the complete affected test suite, relevant typecheck/lint/build checks and the acceptance-readiness gate.

Classify known baseline failures separately from new regressions.

### Step 8: Authenticated acceptance

Only after readiness passes, prepare ONE consolidated authenticated verification run.

Request explicit Owner authorization for database creation, host-context operations or other restricted state changes.

Do not assume this prompt grants authorization.

### Step 9: Converge and report

Deliver the implementation, fresh evidence, remaining deviations and a clear acceptance recommendation.

Avoid repeating lengthy historical reports.

---

## PART 5 — IMPROVE PLAYWRIGHT DESIGN FOR FUTURE SLICES

Starting with MW-I03, prefer small independent acceptance tests over one excessively long monolithic journey.

Separate tests logically into:

- Authentication and role setup
- Personal task navigation
- Task commands and lifecycle
- Review and correction actions
- Owner/team management permissions
- Desktop visual layout
- Mobile visual layout and touch
- Loading/error/denied states

Reuse secure fixture setup, identity creation and manifest-bound cleanup utilities.

A failure in one mobile control should not prevent all independent desktop and Owner evidence from being collected.

Where supported, use a single reviewed setup with independently runnable scenarios and one guarded cleanup.

Do not create separate disposable databases unnecessarily.

Do not undertake a major MW-I02 harness rewrite merely to finish this slice. Fix its known problems minimally; apply larger modularization to future slices.

---

## PART 6 — FIX VISUAL ISSUES BEFORE DATABASE TESTING

Use the approved prototype throughout implementation.

Do not wait until authenticated acceptance to discover obvious:

- Mobile overlaps
- Excessive whitespace
- Queue placement problems
- Tall task rows
- Hidden controls
- Incorrect selection styling
- Responsive wrapping problems
- Bottom-navigation obstruction

During frontend development, use current components with explicitly labeled synthetic fixtures.

Measure relevant element positions and visible task areas.

Perform touch, keyboard and responsive checks before the expensive acceptance stage.

Preserve all real backend semantics.

Authenticated tests remain necessary for authorization and end-to-end validation; component tests do not replace them.

---

## PART 7 — SECURITY AND AUTHORIZATION

Autonomy applies to ordinary work within an approved scope, not unrestricted system access.

Never perform sensitive or state-changing infrastructure operations without their applicable approval.

Preserve:

- Exact PostgreSQL cluster identity checks
- Approved port and data directory
- Disposable database absence guards
- Synthetic data isolation
- Manifest/OID/marker-bound cleanup
- Production database isolation
- Process ownership verification
- Existing OS security boundaries

The established Windows Medium environment may be reused only when appropriately authorized.

Do not grant yourself persistent elevation or bypass restrictions.

If a guard fails, stop the unsafe operation and provide a concise explanation.

Do not automatically retry a failed restricted operation.

---

## PART 8 — KEEP OWNER INTERRUPTION MINIMAL

Ask for Owner decisions only when needed.

Examples:

- A material product requirement is ambiguous.
- An existing decision conflicts with another requirement.
- An architectural or permission change needs approval.
- Restricted infrastructure or database operations require authorization.
- A safety guard fails.
- A genuinely blocked implementation cannot proceed within scope.
- Final visual/product acceptance is required.

Do not request approval for each minor CSS fix, locator update, harmless refactor or focused frontend test.

Batch related implementation and validation work.

When authorization is necessary, submit ONE concise proposal with exact scope, commands, risks and cleanup.

Do not repeatedly request equivalent approvals because avoidable harness issues were left undiscovered.

---

## PART 9 — DEFINITION OF DONE

A feature is ready for Owner acceptance only when both independently reported gates are adequately supported.

### Functional Reliability

- Approved behavior implemented
- Required roles and permissions validated
- Affected tests pass
- Relevant real application workflows verified
- No unexplained new regressions
- Known baseline failures separately documented
- No unsafe database or environment changes

### Prototype UI/UX Fidelity

- Current-source application screenshots available
- Approved prototype comparison completed
- No material task-local hierarchy defects
- No unreadable or overlapping controls
- Task actions discoverable
- Touch and keyboard usable
- Responsive layout acceptable
- Backend-driven differences documented
- Future-slice features not wrongly required early

Do not mark a gate PASS if its required evidence is absent.

Do not pursue endless pixel-level polishing after material criteria are satisfied.

Shared-shell differences and future functionality must remain in their approved scopes.

---

## PART 10 — IMMEDIATE EXECUTION FOR MW-I02

Do the following now, without database operations:

1. Inspect the latest failed acceptance run `1791647954161-9c235e5cf941`.
2. Fix the obsolete Active and Waiting text assertions.
3. Audit all remaining MW-I02 Playwright assertions for similar source/test mismatches.
4. Correct the review integration stage dependency safely.
5. Preserve all existing security guards and valid assertions.
6. Run static harness checks, applicable affected frontend tests and the new readiness review.
7. Verify that the latest mobile discoverability implementation remains unchanged and the six source hashes match.
8. Preserve the earlier 45/45 frontend evidence and bounded authenticated functional PASS.
9. Prepare one consolidated final authenticated acceptance plan with complete four-role and mobile visual coverage.

STOP before any new PostgreSQL, disposable-database or authenticated browser operation requiring fresh authorization.

Return a SHORT readiness report containing:

- Harness defects fixed
- Files changed
- Tests executed
- Outstanding risk
- Whether the acceptance-readiness gate is PASS
- One exact bounded authorization request, only if genuinely ready

Do not repeat the entire historical MW-I02 timeline.

Do not begin MW-I03 until MW-I02 receives Owner acceptance.

---

## PERMANENT OPERATING PRINCIPLE

**Do not optimize for completing an individual tool call or making a test green. Optimize for delivering the correct, fully working, visually consistent application with the fewest avoidable development and validation cycles.**

Preserve quality, safety, traceability and approved requirements.

Finish coherent work before asking for review.

Avoid unnecessary implementation attempts.

Make the next Owner interaction a meaningful decision, not another report about an avoidable test-harness mismatch.
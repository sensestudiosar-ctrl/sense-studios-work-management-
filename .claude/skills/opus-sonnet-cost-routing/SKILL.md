---
name: opus-sonnet-cost-routing
description: Route implementation work between Opus 5.5 (heavy reasoning) and Sonnet 5 (cheap, bounded execution) by reasoning risk, then have Opus recheck Sonnet's output. Use when starting any multi-step coding, refactor, audit, or documentation task in this project, or when asked to "use the mix of opus 5.5 and sonnet 5" / "make coding more cost effective".
---

# Opus 5.5 / Sonnet 5 cost-effective routing

Cost-effectiveness here does not mean "use the small model for everything." It means
**spending expensive reasoning only where the reasoning is actually at risk**, and
using the cheap model as a *drafted-by* executor whose output is then *verified-by*
an expensive pass. The split is governed by reasoning risk, never by task size.

Two failure modes this skill exists to prevent:

1. **Over-spending.** Opus writing boilerplate, renaming variables, or formatting.
2. **Under-verifying.** Sonnet shipping a plausible-looking change that is subtly wrong,
   because nobody with strong reasoning re-read it against the approved sources.

The second failure is the dangerous one. A cheap model confidently breaking branch
isolation or an approval rule costs far more than the Opus tokens it saved.

---

## Step 1 — Classify the work before touching code

Decide the tier from the *consequence of being wrong*, not the line count. If the answer
is ambiguous, escalate to Opus. The direction of the error matters: routing to Sonnet when
you should have used Opus is worse than the reverse.

**Opus 5.5 tier** — reasoning risk is real. Always Opus:

- Architecture, schema and Prisma migration design
- Authentication, authorization, permission checks, branch isolation, ID tampering
- Approval and workflow state machines, concurrency, optimistic versioning, offline sync
- Calculations, derived values, anything that feeds money, hours, leave, or audit
- Difficult debugging where the root cause is not yet known
- Security review, and final acceptance review of any slice
- Deciding *what* should be built when an approved source does not settle a material choice
- Restoring compacted context and forming the implementation handoff
- **Rechecking Sonnet's output** (this is the step people skip — do not skip it)

**Sonnet 5 tier** — the decision is already made and the boundary is closed. Sonnet:

- Implementing a settled, well-specified slice where Opus has already written the plan
- Mechanical refactors with a known target shape and a covering test
- Adding tests that assert behavior already agreed upon
- Documentation updates, changelogs, status files, report prose
- Renames, moves, import tidy-ups, dependency bumps
- Running the gates and reporting exactly what passed and what failed
- Reading focused files to answer a bounded question

**Never route to Sonnet:** anything touching `.mjs` scripts that write to a database,
migration authoring, permission or authorization predicates, or a change where the
correct behavior is genuinely unclear. Sonnet should stop and escalate rather than guess.

Target roughly a 70% Sonnet / 30% Opus allocation of tasks, but the ratio is an outcome,
not a quota. Do not force a task down to Sonnet to hit the number.

---

## Step 2 — Give Sonnet a closed brief

Sonnet performs well when the brief is closed and badly when it is open. Every delegation
must carry all of the following, or Sonnet will fill the gap with invention:

1. **Requirement or issue IDs** — the exact slice boundary, in-scope and out-of-scope.
2. **The settled decision** — what Opus already concluded, stated plainly. Do not make
   Sonnet re-derive a decision you have already made.
3. **Relevant files and interfaces** — the specific files, and the exact signatures or
   contracts to match. Point at the file; do not paste the whole repo.
4. **Acceptance criteria** — the observable condition that means "done," including which
   gates must pass.
5. **Escalation triggers** — the explicit list of things that must stop the work and come
   back to Opus (see below).
6. **Forbidden actions** — no unrelated refactors, no weakening tests, no data resets,
   no new dependencies without approval.

State in the brief: *"If you hit an unclear business rule, an access or data consequence,
a schema change, or a failing acceptance criterion, stop and report it rather than
guessing."* This is the single most important sentence in the brief.

---

## Step 3 — Run the delegation

Launch Sonnet as a subagent so its work is isolated and its report comes back to you.
Run independent, non-conflicting Sonnet tasks in parallel; keep anything that touches the
same file sequential.

While Sonnet runs, do useful Opus work yourself — architecture notes, the recheck plan,
or the next slice's brief. Do not idle waiting on it.

---

## Step 4 — Opus rechecks Sonnet's work (mandatory)

This is the step that makes the whole scheme safe, and it is not optional. A Sonnet
result is a *draft* until Opus has reviewed it. Treat every delegated result as
unverified, including ones that claim to pass their tests.

Review in this order, cheapest signal first:

1. **Diff review.** Read the actual diff, not the summary. Compare it against the brief's
   stated boundary. Anything outside the boundary is a defect even if it works.
2. **Convention match.** Does it follow the existing patterns in the surrounding code,
   and the conventions in `AGENTS.md`? A locally-correct but idiomatically-foreign change
   is still a defect in this codebase.
3. **Claims check.** For every "tests pass" or "typecheck passes" claim, confirm the check
   actually ran. If a gate was skipped or the environment blocked it, that must be stated
   as such — never inherited as a pass. A claimed pass that was never run is the exact
   failure this project's `AGENTS.md` warns against ("Never claim an unrun check passed").
4. **Risk-focused read.** For the high-risk areas named in Step 1, re-read the logic
   directly. This is where Opus earns its cost: branch leakage, approval bypass,
   ID tampering, concurrency, calculation drift.
5. **Caller and data consequences.** Check callers of anything whose signature or behavior
   changed, and confirm no unrelated test was weakened or deleted to make things green.

If the recheck finds a problem, Opus fixes it directly rather than sending it back to
Sonnet — re-round-tripping a correction is usually more expensive than just doing it.

Only after this recheck is a slice eligible to be called complete.

---

## Step 5 — Report honestly

Report the models actually used, per task, and what was verified versus claimed. Follow
the project's own standard: unverified work stays IN PROGRESS or BLOCKED, and a check that
did not run is reported as not run.

---

## Quick reference

| Situation | Route to | Then |
|---|---|---|
| New slice, unclear correct behavior | Opus | Decide first, brief later |
| Schema / migration / permission change | Opus | Opus re-reads before complete |
| Settled slice with a written plan | Sonnet | **Opus recheck (mandatory)** |
| Mechanical refactor with covering test | Sonnet | Opus reads the diff |
| Adding tests for agreed behavior | Sonnet | Opus confirms they actually assert |
| Docs, changelog, status updates | Sonnet | Opus spot-checks accuracy |
| Running gates, reporting results | Sonnet | Opus verifies claims vs output |
| Difficult bug, root cause unknown | Opus | — |
| Final acceptance of any slice | Opus | — |

## What this skill deliberately does not do

It does not change the model of the current conversation, and it does not configure the
app's model selector. It governs how *subagent* work is routed. If a needed model is
unavailable, say so and leave the routing unresolved rather than silently substituting —
the same rule `AGENTS.md` already applies to Sol/Luna.

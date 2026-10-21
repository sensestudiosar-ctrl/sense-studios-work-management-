# Review findings 1 and 4 — remediation notes (2026-10-14)

Scope: findings 1 and 4 from the code review of `apps/web/src/app.tsx` and
`apps/api/src/authorization.service.ts`. Findings 2, 3, 5 and 6 were **not**
touched — they involve auth/permissions and are routed to Sol-level
reasoning per AGENTS.md § Model routing.

No `pnpm verify` was run in the session that made these changes. See
"Verification status" below for what did and did not execute.

---

## Finding 1 — session guard duplication (RECTIFIED)

### What the review said

"Eleven copies of the session-generation guard, with drift. Extract
`useGuardedSession()` and have all 11 routes call it."

That was **imprecise** and worth correcting, because the real defect is
different and arguably worse:

- A shared hook, `useProtectedRouteSession()`, **already existed**
  (`app.tsx`, before this change at line 1423).
- **11 routes already called it.**
- **10 route components still carried the old inline copy** of the same
  logic, alongside the hook.

So the extraction had been *started* and not finished, leaving **two
implementations of the session-guard invariant in one file**. The two had
already drifted: the canonical hook clears the failure flag on explicit
session loss (`setFailed(false)` inside the `ended` handler), while the
inline copies did not. A fix applied to the hook would not have reached the
inline copies, and vice versa.

### What was done

1. **Added `useSessionProbe()`** for `HeaderControls`. This component
   renders for anonymous visitors too, so a failed session read must not
   flip it into an error state — it has no `failed` flag and swallows read
   errors. It is a genuinely different shape, not a copy, so it was
   extracted as its own hook rather than being forced onto
   `useProtectedRouteSession()` with a flag it does not need.

2. **Extended `useProtectedRouteSession()` with `updateSession()`**, a
   stable `useCallback`-wrapped setter guarded by a `mounted` ref. Two
   call sites need to mutate the session they are handed:
   - `SettingsRoute` — `onSessionUpdate` from `<Identity>`
   - `MyWorkRoute` — `onSessionExpired` from `<TaskWorkspace>` and
     `<MyWorkManagement>`

   The original hook exposed only `{ session, failed }`, which could not
   express these. Without this, migrating `SettingsRoute` would have
   silently broken session updates.

   The `mounted` ref replaces the old `settingsActive` ref, whose purpose
   was the same (refuse state updates after unmount).

3. **Migrated all 10 remaining inline copies** to
   `useProtectedRouteSession()`: `DocumentsRoute`, `NotificationsRoute`,
   `SettingsRoute`, `DecisionsRoute`, `TasksRoute`, `MyWorkRoute`,
   `ReviewsRoute`, `ExternalAccessRoute`, `LearningRoute`, plus
   `HeaderControls` to `useSessionProbe()`.

   Net effect: 1711 → 1609 lines. The only remaining
   `let generation = 0` blocks in the file are the bodies of the two
   canonical hooks.

### Behaviour changes, stated explicitly

These are intentional. If any is unwanted, it is a one-line revert.

- **Explicit session loss now clears a previous read failure.**
  `sense-session-ended` sets `failed` back to `false`. Previously the
  inline copies left a stale `failed` flag set. Consequence: a user whose
  session read failed once and who is then explicitly signed out now sees
  "Sign in to view X" rather than "We couldn't check your session." This is
  the canonical hook's existing behaviour and is the more correct one.
- **`updateSession()` is a no-op after unmount.** Matches the old
  `settingsActive.current` guard, so no change in practice.
- **`HeaderControls` no longer has its own session state.** It now reads
  from `useSessionProbe()`. Logout still works: it calls
  `window.dispatchEvent(new Event("sense-session-ended"))` and the probe's
  `ended` handler sets `session` to `null`.

### Verification status — incomplete

**What ran:**
- `tsc -p apps/web/tsconfig.json --noEmit` — reported **only two**
  `TS2688` errors, for the unresolvable type libs `vite/client` and
  `vitest/globals`. **Zero** errors referenced `app.tsx`.
- A synthetic tsconfig that drops those two libs was tried, to get a real
  typecheck. It failed with `TS2307 Cannot find module 'react'` etc. for
  *every* dependency — the documented broken-symlink mount, not a code
  fault. The synthetic tsconfig was deleted afterwards.

**What did NOT run:**
- **`pnpm verify` cannot run in this environment** (Node 22.23.2, no
  `pnpm`; pinned toolchain is Node 24.19.0 / pnpm 11.19.0).
- **The web vitest suite did not run.** Vitest 8 requires the Rolldown
  native binding, unavailable here.
- Therefore the regression tests that would prove this extraction is
  behaviour-preserving — `app.actor-session.test.tsx`,
  `client-portal-auth.test.tsx` — **have not been executed.**

**This change is not verified as typecheck-clean by the project's own
gates.** Run on the Windows host before trusting it:

```
pnpm --filter web exec tsc --noEmit
pnpm --filter web test
```

---

## Finding 4 — repeated authorization reads (NOT RECTIFIED — blocked)

### What the review said

"`identity.session()` joins account, employee, home branch, home team,
job-role assignments and permission overrides on every request, and
`assertPermission` repeats the entire read — several times per task
request. A per-transaction permission cache would fix it without weakening
anything."

The last clause is **wrong**, and the reason is a real hazard.

### Why a per-transaction cache is not safe as described

`evaluatePermissions` loads permission rows (`jobRoleAssignments` →
`jobRole.permissions`, and `permissionOverrides`) on **every call**. A
cache keyed on `(accountId, tx)` would therefore hold rows describing
**authorization itself**.

`apps/api/src/organization.service.ts` mutates those very tables inside
transactions:

- `grantRolePermission` — `tx.rolePermission.create(...)` (line ~437)
- `revokeRolePermission` — `tx.rolePermission.updateMany(...)` (line ~455)

If any transaction mutates a permission table and then calls
`assertPermission`, a naive cache returns the **pre-mutation** rules. That
is not a performance bug — it is a **privilege-escalation bug**, and it
would also change the semantics of revocation inside a transaction, since
the mutation replaces the row an earlier read already loaded.

The review's "without weakening anything" does not hold.

### The safe shape, and why it is still Sol-level work

A correct cache must **invalidate on write**: every mutation of
`rolePermission`, `permissionOverride`, or `jobRoleAssignment` inside a
transaction drops the cached context for that transaction. That means:

- a write-side invalidation hook in `organization.service.ts` (and any
  future writer),
- invalidation that a future contributor can forget to add, re-opening the
  bug silently,
- tests that specifically cover mutate-then-authorize in one transaction.

That is materially more code than "add a cache", and it sits directly on
authorization semantics — which AGENTS.md § Model routing assigns to
Sol-level reasoning and Owner decision, not to a bounded task.

### Options for the Owner

**A. Per-transaction cache with write-side invalidation.**
Correct, but adds an invalidation hook that future permission writers must
remember. Needs Sol-level design and a mutate-then-authorize test.

**B. Request-scoped memoisation, same transaction only, no write path.**
Cache only within a single `assertPermission` fan-out (e.g. the several
calls in `task.service.ts` for one request), never across a transaction
boundary, and never in a transaction that writes permissions. Smaller
blast radius, real but partial win, no invalidation hook. This is what I
would recommend if the goal is a safe improvement now.

**C. Do nothing; measure first.**
The N+1 is real but bounded at one firm's scale. Confirm it matters with
a query count before adding machinery to the authorization path.

**My recommendation is B, then C if B does not measurably help.** A is the
technically complete answer but moves complexity onto the security-critical
path, which is the wrong trade for a performance finding.

---

## Not addressed (by design)

| Finding | Reason |
| --- | --- |
| 2 — `AuthGuard` returns `true` | Auth semantics; needs Owner decision on fail-closed vs. open-by-default. |
| 3 — `organization.findFirst` | Authorization/tenancy logic; Sol-level per AGENTS.md. |
| 5 — per-process rate limiter | Production-scaling gate, pair with C-007. |
| 6 — `review.tsx` / `review.css` | Outside the S18/S27 accepted fingerprint; needs fresh four-width authenticated capture against `localhost:59443`. |

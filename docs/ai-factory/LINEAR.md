# Linear Integration (Free tier) — configuration & fallback

## Status (2026-10-27): NOT CONNECTED — fallback active
No Linear MCP in `.mcp.json`. The version-controlled fallback backlog is
`docs/ai-factory/BACKLOG.md` and is the authoritative issue store until
Linear is connected. **Do not fabricate Linear issue IDs or updates.**

## Intended target (for when the Owner authorizes)
- **Server:** official Linear MCP at `https://mcp.linear.app/mcp`
  (OAuth flow; account creation + auth is an Owner action).
- **Workspace:** Sense Studios Development · **Team:** Application Engineering.
- **Project groups (created progressively, not all at once):**
  1. Foundation & Infrastructure
  2. Dashboard
  3. My Work
  4. Task Creation & Reviews
  5. Projects & Planning
  6. People & Permissions
  7. Site Execution
  8. UI/UX Quality
  9. AI Factory Improvements
- **Free-tier discipline:** respect Linear Free limits (projects, API
  rate); create groups one at a time as work lands; batch issue
  creation; never create duplicate PM infrastructure.

## Issue lifecycle (practical)
`Backlog → Ready → In Progress → In Review → Verified → Done`, with
`Blocked`/`Paused`. Every actionable issue carries: id, module, problem
statement, reproduction/evidence, severity & priority, expected behavior,
proposed fix, acceptance criteria, regression-test requirement,
approval status, branch/PR reference, verification results.

## Rules
- Factory development issues are distinct from tasks *inside* the
  Sense Studios application — never conflate the two.
- Only issues marked **approved + ready** enter the autonomous queue.
  Discovery never self-approves.
- When Linear is live, `BACKLOG.md` becomes a read-only mirror; the
  checkpoint CLI's `issue` field switches from `F-###` to the Linear ID.

# Linear Integration (Free tier) — configuration & fallback

## Status (2026-10-27): CONNECTED — OAuth, project scope
`linear-server` (official Linear MCP at `https://mcp.linear.app/mcp`) is
registered in `.mcp.json` and authenticated via OAuth (`claude mcp login`);
health check reports `✔ Connected`, and a fresh-session live check
confirmed end-to-end reads (MCP tools load via `WaitForMcpServers` when
absent from the initial tool set). Free-tier discipline below still
applies. **Do not fabricate Linear issue IDs or updates** — verify any
referenced ID against the live server.

**Actual workspace (checked 2026-10-27):** "SENSE STUDIOS"
(https://linear.app/sense-studios), one team "SENSE STUDIOS" (key `SEN`).
The intended "Sense Studios Development" / "Application Engineering"
names don't exist; the factory tracks against this workspace instead.

**Cutover (2026-10-27):** project 1 of 9 created —
**Foundation & Infrastructure, key `P-SEN-1`**
(https://linear.app/sense-studios/project/foundation-and-infrastructure-36af88b65fdd),
created via `save_project` (Owner-unblocked write). Groups 2–9 remain
uncreated per the free-tier progressive discipline.

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
- **Live since 2026-10-27 cutover (project `P-SEN-1`):** new factory
  issues are created in Linear; `BACKLOG.md` is the read-only mirror of
  pre-cutover rows until they are migrated. The checkpoint CLI's
  `issue` field carries the Linear ID for new issues.

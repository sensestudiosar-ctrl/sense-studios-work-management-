# Linear Integration (Free tier) — configuration & fallback

## Status (updated 2026-10-28): **IMPORT EXECUTED — 16 live issues in P-SEN-1**

In a 2026-10-28 session `linear-server` was connected and OAuth-authed
(workspace "SENSE STUDIOS", confirmed live via `get_workspace`). The ready
payload `docs/ai-factory/linear-import-payload.md` executed: **16 issues
created and individually read back live** in project `P-SEN-1`. Dedup check
ran first: P-SEN-1 held **zero** issues before the import. 8 module labels
(`module:my-work`, `module:tasks`, `module:shell`, `module:in-flight`,
`module:insights`, `module:navigation`, `module:docs`, `module:projects`)
were created on team `SEN` to carry the payload's label fields.

Created issues (Linear key → factory row; all in P-SEN-1, team SEN):

| Linear key | Factory row | State | Priority (raw value set) |
|---|---|---|---|
| SEN-5 | F-002b | Backlog | 2 |
| SEN-6 | F-003 | Backlog | 2 |
| SEN-7 | F-004 | Backlog | 2 |
| SEN-8 | F-005 | **Todo** | 1 |
| SEN-9 | F-006 | Backlog | 2 |
| SEN-10 | F-007 | Backlog | 3 |
| SEN-11 | F-008 | Backlog | 2 |
| SEN-12 | F-009 | Backlog | 3 |
| SEN-13 | F-010 | Backlog | 1 |
| SEN-14 | F-011 | Backlog | 1 |
| SEN-15 | F-012 | Backlog | 1 |
| SEN-16 | F-013 | Backlog | 1 |
| SEN-17 | F-014 | Backlog | 1 |
| SEN-18 | F-015 | Backlog | 2 |
| SEN-19 | F-016 | Backlog | 1 |
| SEN-20 | F-017 | Backlog | 1 |

Read-back confirmed: 16/16 returned via `list_issues` against P-SEN-1 with
matching status, priority value, and labels (SEN-8 = Todo, rest = Backlog;
SEN-8/F-005 is the only non-Backlog state; SEN-11/F-008 carries no label,
matching the payload). Issue keys are now recorded on the `BACKLOG.md` rows
F-002b…F-009 and F-010…F-017.

**Priority scale caveat (recorded truthfully):** the payload documents a
"0–3" mapping (0 Urgent · 1 High · 2 Med · 3 Low), but the live Linear API
uses a 5-value scale (0 None · 1 Urgent · 2 High · 3 Medium · 4 Low). The
raw values passed to `create_issue` were the payload's exact numbers, so a
payload value of `1` lands as Linear's "Urgent" and `2` as "High". Relative
ordering (F-005/F-010…F-017 highest, F-007/F-009 lowest) is preserved. If
the Owner wants the payload's intended labels (1=High, 2=Med, 3=Low) as
Linear display names, the +1 offset would need to be applied to every value
in a follow-up; this import did not shift values.

**Record-only rows not created (per payload):** F-001, F-002 (closed this
cycle), B-002, B-003 (blocked / unblock-condition) — no Linear issues.

Free-tier discipline below still applies. **Do not fabricate Linear
issue IDs or updates** — verify any referenced ID against the live
server.

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

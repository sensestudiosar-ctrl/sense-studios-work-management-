# Tool & MCP Readiness Report

Verified 2026-10-27 by direct invocation / inspection. Status classes:
**installed+verified** · installed-but-malfunctioning · available-not-connected
· requires-authentication · requires-paid-subscription · unsupported-here.

## Verified installed & working (local)
| Tool | Status | Evidence |
|---|---|---|
| Refero MCP (HTTP + Bearer) | installed+verified (paid) | `refero_search_sites` returned 106 results; `refero_search_styles/flows/screens/get_flow/get_style/get_screen` tools present in this session's toolset |
| Playwright MCP (`@playwright/mcp@0.0.83`, stdio) | installed+verified | `browser_navigate` on sealed web 59443 returned live DOM snapshot |
| GitHub CLI | installed+verified | `gh 2.102.0`; authenticated as `vijaychintala05` (scopes gist/read:org/repo/workflow) |
| ui-ux-pro-max skill (nextlevelbuilder) | installed+verified | `.claude/skills/ui-ux-pro-max/SKILL.md` + `.agents/skills/ui-ux-pro-max/` (data, references, scripts) present; `skills-lock.json` hash-pinned |
| opus-sonnet-cost-routing skill | installed+verified | `.claude/skills/opus-sonnet-cost-routing/SKILL.md` present and loaded |
| pnpm / Node | installed+verified | Node 24.19.0 and pnpm 11.19.0 pinned & matched on host |
| Prisma + PostgreSQL | installed | `pnpm db:generate` per CLAUDE.md; PG on 45434 confirmed |
| Vite + Playwright (repo) | installed | `playwright.config.ts` present |

## Unverified / not connected / auth-required
| Tool | Status | Note |
|---|---|---|
| Linear MCP | not connected | See `LINEAR.md` for fallback. No Linear MCP in `.mcp.json`. |
| Refero in cloud | available-not-verified | Local Refero is a repo-level Bearer; cloud scheduled sessions need their own connector or the repo `.mcp.json`. |
| Playwright in cloud | available-not-verified | Cloud tasks need a browser runtime; local MCP does not imply cloud availability. |
| Chrome DevTools MCP | not installed | Not required for current scope; add only on demonstrated need. |

## Fallbacks
- If Refero is unavailable in a run: use the cached
  `docs/design/application-ux-audit-2026-10-25/` + approved demos in
  `demos/`. Never fabricate a Refero call.
- If Playwright MCP is unavailable in a run: use the repo's
  `@playwright/test` regression suite (`pnpm test:e2e`).
- If a scheduled run cannot reach the required environment: record
  BLOCKED and continue independent approved work.

## Cost note
Refero uses a paid Bearer token already provisioned. Do not provision
new paid endpoints or increase subscriptions.

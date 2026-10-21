# Worktree and local server consolidation — 14 October 2026

Owner requested one checkout and one app server, then expressly selected the latest app with saved data.

## Completed

- Sole registered checkout: `D:\app\sensestudios work management app`, branch `codex/s20-site-integration`. Main checkout changes were preserved.
- Removed redundant checkouts `65b5`, `9bd6`, `s07-project-ownership`, and `s11-nas-documents`. Full nondependency file contents, ignored evidence/data and uncommitted/untracked work were archived into `.env.cleanup-worktrees-20261014/*.tar`. Each archive was extracted and compared against SHA256 manifests before removal. Dependency directories and Git pointer files were excluded. Original Git heads remain under `codex/cleanup-preserved-20261014-*`; original named branches remain. Archives are recovery copies, not merged source.
- Git removal of `9bd6` hit a Windows long-path error. Verified archives remained intact; exact residual paths were removed through native PowerShell. Final `git worktree list --porcelain` shows only the primary checkout.
- Latest current frontend and freshly built API replace historical115 processes8616/33072. Sole app stack: web59443/PID27808 and API59442/PID8764, both loopback. Retained PostgreSQL45434 remains required. Unrelated PostgreSQL/FirmBooks and Codex services were untouched.
- Saved database copied to `sense_latest_retained_20261014_test`, OID145606, migrated118. Original115 database/OID32768 and original NAS remain preserved. All retained table columns/counts/hashes and NAS hashes passed comparison; saved50tasks,5employees,6accounts and23session rows were preserved.
- Running URL: http://localhost:59443/. Existing credentials remain; session expiry may require ordinary login.

## Checks and limits

Pinned Node24.19.0/pnpm11.19.0 contracts/API builds exited0. Latest operator syntax/source preparation and independent GPT-6.1 Sol review passed. Fixed its comparison to freeze original115 columns, excluding newly introduced schema fields. Approved fresh source/build/operator hashes were recorded before one guarded execution. Operator exited0 with READY, originalUnchanged and accountsPreserved. HTTP root, proxied `/api/v1/health/ready` and current `/src/main.tsx` returned200. Exact process/listener ownership checks passed.

Evidence: `.env.checkpoint-tools/latest-retained-20261014/manifest.json`, dump, migration logs, approval/readiness manifests and `.env.cleanup-worktrees-20261014/` recovery manifests. These private artifacts may contain saved data and are ignored by Git.

## Browser stale-version correction

Owner subsequently reported the old UI at the retained origin. Reproduction in the selected authenticated browser tab showed `/assets/index-COGzg8ga.js` and `/registerSW.js`, while direct server HTML contained `/@vite/client` and `/src/main.tsx`. The former production service worker was serving its cached shell. Development `/sw.js` incorrectly returned the HTML fallback, preventing a valid worker update; an ordinary reload reproduced the old UI.

Added a development-only Vite middleware for `/sw.js` returning uncached JavaScript that replaces/unregisters the stale worker and reloads controlled window clients. It does not delete cache entries, account/session storage or credentials, and production builds retain their PWA configuration. Existing development tabs reload once. Independent GPT-6.1 Sol review found no blocker.

After reloading the existing tab, its script references switched to `/@vite/client` and `/src/main.tsx`; the authenticated current My Work overview cards and work queue loaded with live counts. Current screenshot: `.env.cleanup-worktrees-20261014/latest-browser-fixed.png`. HTTP worker response returned200 with `application/javascript` and `no-store`; proxied API readiness remained200. This browser evidence supersedes the earlier availability-only claim for the displayed My Work screen, without claiming full workflow acceptance.

All three existing browser tabs now load the current source assets. Pinned web typecheck and focused ESLint for `apps/web/vite.config.ts` exited0. Full `pnpm verify` was not rerun for this development-only response correction.

No full `pnpm verify`, authenticated browser workflow or feature acceptance was run for this operational cleanup. Earlier feature/production/actual-project acceptance limits remain. Actual models: GPT-6.1 Sol for context intake and independent launcher review; parent agent for cleanup/build/execution.

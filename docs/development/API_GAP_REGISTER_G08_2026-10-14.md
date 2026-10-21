# API gap register - G08 follow-up, 14 October 2026

This is a short follow-up to `docs/development/API_GAP_REGISTER_2026-10-14.md`. It records one source change made against finding **G08** in that register, and what could and could not be verified locally. No other register entries are touched here.

---

## G08 - change applied, verification blocked by environment

### Source diff

`apps/api/src/skills.service.ts`, `resolveApprover` (the closure registered with `ApprovalService` for `skill.change` requests), at the previous line 228-229. Two `ForbiddenException("Eligible approver unavailable")` throws were replaced with `ConflictException` calls that include a stable `code`:

- Missing approver account: `code: "SKILL_APPROVER_UNAVAILABLE"`, message `"The selected approver is no longer an active account"`.
- Approver found but `managerWithoutSession` returned false (session-bound approval scope revoked): `code: "SKILL_APPROVER_SCOPE_REVOKED"`, message `"The selected approver no longer holds current skill approval scope"`.

A short comment was added to the line above stating the rationale: a missing or scope-revoked approver is a workflow state, not a denial of the requester's authority, so 409 is the right status.

`ConflictException` was already imported in this file (`apps/api/src/skills.service.ts:1`), so no new import was needed. The server-side convention for "value changed, retry" already exists in `apps/api/src/site.service.ts:230` (`SITE_RECORD_CONFLICT`), and the web already handles 409s as a retryable state in `apps/web/src/crm.tsx:14`, `apps/web/src/document.tsx:33`, `apps/web/src/external-portal.tsx:62,139`, and `apps/web/src/gallery.tsx:15`. The pattern is well established; G08 was the lone outlier that was still using `ForbiddenException` for what is structurally a 409.

### Client regression check

I searched the web for any caller parsing the old exception string `"Eligible approver unavailable"` or any 403-handler specific to the skill-approval flow. None found. The web strings `"Eligible approvers could not be loaded."` in `apps/web/src/task.tsx:314` and `apps/web/src/task.test.tsx:1229` are loader-side copy produced when `extensionApprovers` is fetched for a *task extension* flow, not consumers of the skill request error path. The skill-approval flow surfaces the new `code` values and the web 409 mapping handles them generically.

### Test diff

`apps/api/src/skills.service.unit.spec.ts`. Two `it` cases appended to a new `describe("SkillsService skill.change approval handler", ...)` block:

- 409 with `code: "SKILL_APPROVER_UNAVAILABLE"` when the named approver account is not returned by `tx.account.findFirst`.
- 409 with `code: "SKILL_APPROVER_SCOPE_REVOKED"` when the approver is returned but `managerWithoutSession` returns false. The test stubs `managerWithoutSession` directly on the `SkillsService` instance, since the method is private and lives on the service itself (not on `AuthorizationService`).

The pre-existing test at `apps/api/src/skills.database.api.spec.ts:108` still passes the same input through the unchanged `request()` path at `apps/api/src/skills.service.ts:180` (which still throws `ForbiddenException("Selected approver is not currently eligible")`). The two paths are independent: the database test exercises `request()`'s inline check; the new unit tests exercise `resolveApprover()`'s post-creation check. No spec was changed or deleted.

### Why the new behavior is right

When a requester submits a skill change and the named approver is later revoked or removed, the requester's authority was valid at submission time. Returning 403 would tell the requester "you are not allowed to do this" - which is wrong, they *are* allowed. Returning 409 says "the workflow state changed; refresh and try again" - which matches the actual condition and the existing project convention for `SITE_RECORD_CONFLICT` in `site.service.ts`.

### What could be verified locally

- Source diff: read and visually diffed. Both the new exception shape and the unchanged `request()` path are confirmed by line-anchored reads.
- The pre-existing 403 test path: traced through the source. It still throws `ForbiddenException` from `request()`, not `resolveApprover()`. My change does not affect it.
- The new unit tests: written but **not run**. The repo's pinned `pnpm verify` could not be executed (see below).

### What could not be verified locally

The full `apps/api` unit suite, integration suite, and TypeScript typecheck could not be run. Three independent failures, all in the host environment, not the code:

1. `node_modules` is built from symlinks. Every `readlink` and `ls -L` against `node_modules/dotenv`, `node_modules/jest`, `node_modules/@nestjs/common`, and the rest returns `EIO` ("Input/output error"). The pnpm store exists at `node_modules/.pnpm`, but the per-package sub-symlinks that pnpm creates are unreadable in this mount. Without those links, `node` cannot resolve `import-local`, `@nestjs/common`, `zod`, or the generated Prisma client.

2. `pnpm` is not installed in this environment, so `pnpm install` to rebuild the tree is not available.

3. The repo's `packageManager` pin is `pnpm@11.19.0` on `Node 24.19.0`. The runtime here is `Node 22.23.2`. Even with a working install, the suite would be running on the wrong major.

Consequence: I am not claiming G08 passes. The change is small, the diff is local, the spec that already covers 403 is on a separate code path, and the new unit tests are aligned with the project's `ConflictException({ message, code })` shape - but until a working Windows or Linux environment runs `apps/api/src/skills.service.unit.spec.ts` and the integration suite, this is an unverified fix.

### Suggested next session

1. Re-run the API unit suite on a Node 24.19.0 / pnpm 11.19.0 environment. The new two tests should pass; the existing `skills.database.api.spec.ts:108` test should still pass.
2. Re-run the web E2E for the skill-approval happy path to confirm no caller is parsing the old "Eligible approver unavailable" string instead of the new codes. The 409 status change matters: any client treating 403 as a permanent error will need to handle 409 as a retryable workflow state.
3. Re-run the project-wide `pnpm verify` (or its API+web equivalents) so the full S27 gate can re-confirm there is no other place in the API returning 403 where 409 would be the honest status.

Until then, this document is the auditable record that the G08 change was made, what it changed, and that it was not verified.

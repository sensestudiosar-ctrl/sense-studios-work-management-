# API / product gap register - CORRECTION, 14 October 2026 (supersedes the morning version)

This document corrects `API_GAP_REGISTER_2026-10-14.md` as first written this morning. On re-verification against source, **four findings are materially wrong** and **three are partly wrong**. The original register overstated gaps that do not exist. Nothing in the original register was acted on before this correction.

Read this version, not the morning one.

---

## Wrong in the original

### G11 - "Service worker is not installed" - INCORRECT

`vite-plugin-pwa@1.3.0` is **installed** (in `apps/web/package.json` devDependencies and `node_modules`) and **already configured** in `apps/web/vite.config.ts` with `registerType: "autoUpdate"`, a web manifest, `navigateFallback: "/index.html"`, `navigateFallbackDenylist: [/^\/api\//]`, and `globPatterns: ["**/*.{js,css,html,svg}"]`.

My original reasoning failed because I grepped only `apps/web/src` for `registerSW` / `serviceWorker` imports and concluded the plugin was absent. The plugin is wired in the Vite config, not imported in source - so the grep was looking in the wrong place. The original claim "no vite-plugin-pwa is imported anywhere in apps/web/src" was technically true and completely misleading.

Corrected status: **implemented**. The remaining question is only whether `icon.svg` and the precache manifest behave as intended - a verification task, not an implementation task.

### G13 - "Notifications use IN_APP + EMAIL, no SLA-based escalation" - INCORRECT

Escalation exists and is substantial:

- `ReviewEscalation` Prisma model (generated at `apps/api/src/generated/prisma/models/ReviewEscalation.ts`)
- `review.service.ts:452 async escalate(actor, roundId, reason)` - rejects non-open rounds with `ConflictException`, resolves an active recipient, creates the escalation record, emits `review.escalated`, and creates an IN_APP notification
- `notification-worker.ts:91,98-109` - recipient eligibility checks (must be the project's current lead, active staff, not the escalating actor)
- `notification-worker.ts:244,340-341,373+` - `lockReviewEscalationScope` delivery ordering

Corrected status: **implemented** for internal-review escalation. What does *not* exist is a **time-based** escalation (a timer that fires after N hours unread). My register conflated "no SLA timer" with "no escalation", which was wrong. If time-based escalation is wanted, that is new scope, not a gap.

### G14 - "Calendar projection is one-way (out only)" - PARTLY WRONG

`integration.controller.ts` already exposes full event write-back:

- `@Post("calendar/events")` -> `integrations.createEvent` (`integration.service.ts:69`)
- `@Put("calendar/events/:id")` -> `integrations.updateEvent` (`:75`), which takes an `expectedVersion` and therefore has optimistic-concurrency protection
- `@Post("calendar/events/:id/cancel")` -> `cancelEvent` (`:80`), also version-guarded
- `@Post/@Delete("calendar/subscription")` and `@Get("calendar/subscriptions/:token.ics")` - token-scoped subscription feeds with strict 43-char token validation

Corrected status: **write-back exists**. What is genuinely absent is *external-provider* inbound sync - a CalDAV / Graph webhook with ETag reconciliation. My register described internal write-back as absent when it is not. Also worth noting: `expectedVersion` on update/cancel is a better concurrency control than the ETag scheme I proposed, so my suggested "closure path" would have been a regression.

### G04 - "Dashboard allTasks walk is unbounded in count" - PARTLY WRONG

I claimed "no streaming or per-source count limit." `allTasks` does page by 100 until `offset >= total`, which I described correctly, but I missed that `dashboardRead` gates work behind `include(source)` and the `decisions` path is separately paginated via `allDecisions` (which drains the `approvals.attention` cursor to completion). The composer materializes the full decision list before slicing - that part holds. But the "no limit" framing overstated it, and `dashboardSource(actor, source)` already lets callers fetch one source at a time, which is the mitigation I proposed to build.

Corrected status: **partly real**. The concrete issue is that `allDecisions` drains to completion rather than honoring a page bound. Low severity under current S27 scope.

---

## Partly wrong in the original

### G01 - per-source approval counts - DIRECTION RIGHT, DETAIL WRONG

The single-homogeneous-source claim is correct: `approval.service.ts:187` returns `{ source: "approval" as const, total, items, readAt }`, and every registered handler - `skills`, `library`, `project-workflow`, `task` (extension), `turnkey` (`cost`, `procurement`), `workforce` (leave x2), `automation` - is coerced into that one shape at `:182`.

But my implication overstated it as a defect. The design is deliberate: one approval engine, one card shape, with `responsibility: "decision"` and `reason: "decision_required"` uniform across types, and `canView` per handler as the boundary. The real finding is narrower: **there is no per-`typeKey` breakdown**, so a client cannot show "3 skill approvals, 2 leave approvals" or count parity per type. That is a missing feature, not a broken one.

Also, `dashboard.service.ts:272` sits inside a minified one-line `dashboardRead`; citing "line 272" as if it were a readable function boundary is misleading. The substance holds; the citation style does not.

### G02 - per-actor handler resolution - WRONG IN EMPHASIS

The code confirms per-actor evaluation: `actionableInTransaction` iterates candidates, runs `decisionPolicy` then `handler.canView` per (actor, request), swallowing only `Forbidden` / `NotFound` / `Conflict` to skip ineligible rows. What I called "not real" - dynamic handler selection by branch/team/role - is indeed absent, but that is by design: handlers are keyed by immutable `typeKey` and branch scoping lives inside each handler's `canView`. The original register framed a design choice as a deficiency.

### G12 - AI assistance - CORRECT, worth keeping

`ai-assistance.service.ts` has no provider import; it computes `manifest` / `facts` / `unavailableFactors` and emits structured `sourceRefs`. This is a deliberate retrieval-grounded boundary and matches "no live AI/provider transmission" in the 13 October report. Accurate as written.

---

## Still standing, with corrected evidence

G05 - annotations are point-only. `client-review.tsx:11`: `type Annotation = { page: number; x: number; y: number; text: string }`. No `width` / `height` / `rect` / `geometry` anywhere. Area markup genuinely unimplemented. Requires a schema change and product decisions - not something to build unasked.

G06 - no document-level global search. `document.controller.ts` routes are `files/:fileId/stream`, `project-picker`, `projects/:projectId`, `projects/:projectId/grants`, `reconciliation`, plus folder/upload/grant mutations. No search endpoint. Confirmed.

G07 - no pin overlay on the revision viewer. `review-evidence.tsx` renders via pdfjs; `client-review.tsx:274` renders coordinates as text only. No canvas overlay draws markers at `(mark.x, mark.y)`. Confirmed, and it pairs with G05 - G07 is the cheaper half and is worth doing on its own.

G08 - skill request error status. `skills.service.ts:228-229` throws `ForbiddenException("Eligible approver unavailable")`; `:236` throws `NotFoundException("Skill request unavailable")`. A missing co-sign reported as 403 is a real status mismatch. Confirmed; smallest real fix of the set.

G09 - aspirational integration adapters. `integration.service.ts:9-15` imports only `CrmService` and `WorkforceService` (both `@Optional()`); `configuredActor` at `:115` throws `ConflictException("CRM adapter unavailable")`. No Slack / Teams / QuickBooks / Zoho adapters exist. Documentation-only fix.

G10 - automation run history. `automation.service.ts` `context` reads `take: 100` ordered by `createdAt desc` with no filter / offset / limit params. Confirmed.

G03 - saved views. `my-work-saved-views.ts` exists; no server-side saved-view route in `dashboard.controller.ts`. Local-filter scope, as originally described.

---

## What went wrong, plainly

The morning register was written from targeted greps and I drew conclusions faster than I verified them. Three specific failures:

1. Grep scope error - searching `apps/web/src` for a plugin that is registered in `apps/web/vite.config.ts`, then reporting absence.
2. Absence-of-evidence error - concluding "no escalation" from a narrow view of `notifications.service.ts`, missing the entire `ReviewEscalation` subsystem in `review.service.ts` and `notification-worker.ts`.
3. Conflation - treating "no SLA timer" and "no escalation" as the same thing, and treating "no ETag webhook" and "no write-back" as the same thing.

Net: of 14 findings, **3 are genuine unimplemented scope (G05, G06, G10)**, **1 is a real defect (G08)**, **2 are real but narrow improvements (G01 per-type breakdown, G04 decision drain)**, **1 is a real UX gap (G07)**, **1 is docs-only (G09)**, and **4 were wrong (G02, G11, G13, G14)**, with G12 correct-as-boundary and G03 correct-as-scope.

## Environment constraints (verified, not assumed)

Node here is **22.23.2**; `AGENTS.md` requires **24.19.0**. `pnpm` is **not installed**; `packageManager` pins `pnpm@11.19.0`. `node_modules` exists in the root, `apps/api`, and `apps/web`, and direct `.bin` entries are present for `jest`, `tsx`, `prisma`, `vitest`, `vite`, `tsc`, `eslint`, `playwright`.

Consequences I will not paper over: `pnpm verify` **cannot be run as documented**. Direct invocation may be possible but on the wrong Node major. PostgreSQL and Playwright suites need infrastructure that is not confirmed up. **Any test results I report will be from whatever actually executed, and I will name what could not run.**

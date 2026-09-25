# Proposed target architecture — awaiting owner approval

This is a planning baseline for approved requirements in requirements/APPROVED_REQUIREMENTS.md and the newer owner clarification: the organization has branches, and each project belongs to exactly one branch. No stack or architecture has been implemented. Decisions in REQUIREMENT_QUESTIONS.md can change this proposal.

## Stack choices and tradeoffs

| Choice | Why | Alternatives and tradeoff |
| --- | --- | --- |
| TypeScript, current supported Node LTS, pnpm workspace | One typed language across web, API and worker; broad hiring/AI knowledge and tooling. Pin versions at implementation. | Python/Django is mature but splits web/backend languages; full-stack Next.js shortens deployment but places complex domain/background work near UI conventions. |
| React + Vite responsive PWA | Mature component ecosystem, fast local build, separate API contract, suitable for internal dashboards and portals without SEO dependence. | Next.js adds SSR/server actions that these workflows do not currently need; Vue is viable but reduces shared team conventions. |
| NestJS modular REST API, OpenAPI contract | Explicit module boundaries, guards, validation, dependency injection and generated API documentation suit broad workflows. | Express/Fastify alone needs more local conventions; microservices add deployment and data-consistency cost. |
| PostgreSQL | Relational constraints, transactions, JSON where justified, indexes and mature backup support for approvals, revisions, scopes and audit. | SQLite is simpler but weakens concurrent multi-user/server workflows; document stores make core relationships harder to enforce. |
| Prisma ORM with reviewed SQL migrations | Productive typed CRUD and broad documentation. Use reviewed SQL for constraints/features Prisma does not express; never use schema push on production data. Pin a vetted version after approval. | Kysely/SQL gives more direct control but requires more handwritten mapping; TypeORM has broad support but weaker migration discipline. |
| Jest (API/domain), Vitest + Testing Library (web), Playwright (E2E) | Layered fast tests plus real browser/device coverage. | One runner for everything is simpler but does not replace browser and DB behavior. |
| Docker Compose on the existing MINISFORUM NAS if capacity/security tests pass | Lowest recurring hosting cost; one operational unit for web/API, PostgreSQL and worker, with NAS file access local. The reported 8 GB RAM makes memory limits and load tests mandatory. | Small separate host becomes fallback if NAS compute/container isolation is inadequate; managed hosting adds recurring cost and private NAS connectivity work. |

These are recommendations, not installed dependencies or an approved stack. Vendor/version support, NAS model, HTTPS ingress and restore procedures must be verified before production deployment.

## System and dependency direction

One repository, modular monolith, one PostgreSQL database. A static web/PWA client calls a versioned JSON REST API. Nest modules own writes and publish domain events through a transactional outbox. A worker in the same codebase handles notification delivery, reminders, reports, NAS reconciliation and external sync. An HTTPS reverse proxy is the only public entry point. External portals use the same API with narrower resources and authorization.

UI → API controller/validation → authentication/session → authorization policy → owning domain service → transaction/repository → PostgreSQL; committed outbox → worker → notification/integration/read projection. Cross-module calls use explicit module services or events. No controller, UI, worker or AI path may bypass domain rules or policy checks.

## Core boundaries

- Frontend owns presentation, navigation, form UX, loading/empty/error states, and offline local queue. Backend owns business validation, transitions, permissions, scoring, audit, and writes.
- API contracts are generated from the backend OpenAPI document into a typed web client. All external inputs get server validation; version breaking changes.
- Each request carries authenticated actor, organization, branch scope, project membership and session identity. Default deny; an Owner has full organizational authority, with branch grant authority still being finalized. Use server-side revocable sessions, secure HttpOnly/SameSite cookies, CSRF protection for cookie-authenticated writes, rate limits, password hashing, safe headers/CSP and server upload validation. Support Google/Microsoft OIDC and email/password internally, portal password/expiring email OTP, and optional TOTP 2FA without paid SMS as a dependency.
- Job role, reporting hierarchy and permission grant are separate. Resource policies combine grants with branch/team/project scope and conditions. Hidden controls improve UX only.
- A permission change or forced logout must invalidate effective future access immediately: protected requests recheck server-side session/grant state rather than relying on long-lived self-contained tokens.
- A shared approval engine stores request type/resource, requester, approver/level, status, reason, evidence, expiration, delegation and audit. Type-specific policy validates the decision and applies the owning domain command. A management decision queue projects pending requests; it does not become a second source of business truth.
- Important mutations write before/after, actor ID/snapshot, reason where required, and business event in the same DB transaction. Audit is append-only; corrections create new entries.
- Notifications consume outbox events, use recipient policy checks, idempotency/dedupe keys and persisted delivery attempts. Scheduled jobs use the same durable job/outbox mechanism. Redis/BullMQ is a later scaling option, not initial infrastructure.
- Realtime status is a convenience stream (SSE or polling) over persisted notifications/decision views. Mobile push uses web push subscriptions where supported, with in-app fallback; push is not the sole record of a decision.
- NAS operations cannot participate in a PostgreSQL transaction. File upload uses staged object, validation/checksum, metadata finalization and reconciliation. No browser receives NAS credentials or raw paths. See FILE_STORAGE.md.
- Offline site work is phased: cache app shell, store explicitly supported drafts/commands in IndexedDB with stable local IDs and idempotency keys; sync on reconnect, compare versions, surface conflicts for human resolution. Do not assume background sync always runs. Do not cache confidential project files by default.
- Integration adapters own accounting, calendar, website, maps and future API/webhooks. Retries are idempotent; failures appear in operations status. AI is a later read/recommendation adapter over already authorized context; human decisions pass through ordinary domain APIs.
- Error responses carry stable codes and safe messages; server logs include request/correlation ID and relevant entity IDs without secrets, file paths or sensitive payloads. Health, failed jobs, storage reconciliation and backup checks are observable.

## Cost-aware deployment and recovery proposal

The owner reports a MINISFORUM NAS with 8 GB RAM, MinisCloud OS and an existing domain. MINISFORUM's N5 Air documentation lists Docker support; exact model is still being confirmed. Recommend a single NAS-hosted deployment with constrained web/API, PostgreSQL and worker containers only after memory, storage, upload and restore tests pass; do not run local AI on this baseline. Use least-privilege volumes/accounts. Prefer a Cloudflare Tunnel as low-cost public HTTPS ingress if approved: it avoids inbound router exposure, but Cloudflare carries traffic and its Free plan limits each proxied upload request to 100 MB, so file uploads require resumable chunks and realistic testing. Never expose NAS administration, SMB/NFS or PostgreSQL to the internet. If NAS capacity or OS isolation fails validation, move app/database to a small local server and keep NAS file storage/backup. The ingress/provider choice is an owner decision in REQUIREMENT_QUESTIONS.md.

Schedule database and metadata backups, NAS snapshots/versioning and restore drills. Keep the design portable so off-site backup can be added; same-NAS backups remain one physical failure domain. Separate staging from production before live data.

## Research basis

Official framework and platform documentation reviewed: NestJS modules (https://docs.nestjs.com/modules), NestJS OpenAPI (https://docs.nestjs.com/openapi/introduction), Vite guide (https://vite.dev/guide/), Prisma migrations (https://www.prisma.io/docs/orm/migrations/applying-a-migration), PostgreSQL row security (https://www.postgresql.org/docs/current/ddl-rowsecurity.html), Docker Compose production (https://docs.docker.com/compose/how-tos/production/), Playwright (https://playwright.dev/docs/intro), MDN IndexedDB and background sync (https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API and https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API).

# S25 specification — COMPLETE for development/local staging (2026-10-06)

Owner authorization: 2026-10-05, START AND COMPLETE S25 SLICE IN OUR LUNA AND SOL METHODOLOGY. S25 is COMPLETE for development/local staging; exact acceptance and limits are in `S25_ACCEPTANCE_REVIEW.md` and `S25_COMPLETION_REPORT.md`. This supersedes historical S25 unauthorized wording only. S18 remains unresolved/excluded; S26/S27 remain unauthorized. Production use is not claimed.

## Approved sources and settled scope

R-084 source section 84, approved architecture checkpoint 2e46805, current Owner decisions and existing owning-module permissions govern this slice. INT owns adapters/configuration, delivery state and retry identity; owning modules retain business writes. Dependencies S04, S06–S10, S16/S17 and S24 are complete for their local scopes. Existing extensive S23/S24/UI working-tree changes and retained databases must be preserved.

- R-084.a NAS: preserve DOC private storage/access; no new storage architecture.
- R-084.b Accounting: preserve TIM time transfer; procurement transfer is outside this bounded slice unless explicitly authorized.
- R-084.c Calendar: Owner approved one-way iCalendar export/subscription of authorized task deadlines, milestones and review assignments, with minimal labels, plus explicitly entered meeting/site-visit events. No provider-specific or two-way synchronization.
- R-084.d Website: website enquiry may create one NEW CRM lead. Owner approved Owner-configured signed enquiry creation through CRM, exactly one NEW lead in the fixed configured branch.
- R-084.e Maps: project/site location and existing S17 attendance validation. Owner approved explicit map links to configured site coordinates under current project authority, with unchanged attendance validation.
- R-084.f API/webhooks: future extensible adapters, authenticated ingestion, dedupe and failure status. Owner approved bounded signed ingestion; broader external CRUD and outbound feeds remain deferred.
- R-085.a WhatsApp and R-086.a deep CAD/BIM: explicitly future/excluded by source wording despite broad S25 planning-row references.

## Settled Owner bundle decision — 2026-10-05

The Owner explicitly answered Approve the proposed remaining S25 scope. Owner-only website configuration binds an active branch and Website source to a current authorized internal actor, accepts a signed stable enquiry ID, creates one NEW lead through CRM, and cannot choose branch/client/assignment/stage/project authority from the enquiry body. Maps use authorized existing S17 coordinates and unchanged geofence validation; third-party map transmission occurs only through an explicitly opened link. API extensibility does not expose unrestricted CRUD or outbound event feeds. These bounded rules were implemented under forward migrations 105–106 and accepted under the full gates and source/security/visual review recorded in the S25 acceptance and completion reports.

## Calendar design boundaries

Calendar is a projection, not assignment, approval or notification delivery. Task deadlines and milestone dates come from existing owning-domain public ports. Review assignments must retain their actual source identity/date and current authorization; absent dated source evidence must not receive an invented review deadline. Meeting/site-visit commands preserve explicit dated records, actor, reason and history. Project event management uses current project management scope; personal records are creator scoped. Any new business authority not settled by existing permissions must be escalated before implementation.

Exported labels are generic by event type; no project/task title, client/contact, notes, protected cost, location evidence, NAS paths or confidential file metadata. UID derives from stable source identity, version changes retain UID, and cancellations/access changes remove or cancel current events without rewriting source evidence. Times are explicit instants or existing date-only values, with valid iCalendar escaping, UTF-8 byte folding and CRLF serialization. Subscription credentials must be per-account, revocable, random and secret-safe; current active account and source access are checked on every fetch. Revocation cannot retract copies already imported into external calendars. No external/client portal identity gains internal integration access.

## Persistence, transaction and access rules

Sol owns schema/migrations after the preserved 104-migration baseline, authorization, receipt identity and transaction design. Configuration changes require reasoned canonical audit/events. Transport retries bind connector, operation, stable external/source ID and payload digest. Identical retries return retained results; reused identity with changed values conflicts. Website lead creation and receipt must commit atomically via a caller-transaction CRM public port, because current CrmService.createLead owns its transaction. INT must not directly write CRM tables. Source reads and delivery status remain scoped; secrets and enquiry contact payloads are excluded from status/audit/logs. Pending/failed/retry state is visible without broadening permissions.

## Acceptance and test plan

Use dedicated fresh databases and a separate populated S24 upgrade clone, never migrate the retained source or postgres/template databases. Preserve every original-table old-column count/digest and immutable prior migration files. Verify schema/client generation and migration status. Test signed ingestion forgery/expiry, inactive config/actor/branch/source, branch/ID tampering, exact/changed/concurrent replay, rollback, stable calendar identities, source updates/cancellation, current scope/revocation, credential rotation, serialization and safe map scope. Responsive desktop/mobile persisted journeys must cover empty/loading/error, setup/export/events/status and refreshed screenshots. Run pinned Node 24.19.0/pnpm 11.19.0 full pnpm verify; report exact results, failures and limitations. Sol reviews source/security and current screenshots before COMPLETE.

## Model allocation and handoffs

Exact gpt-6.1-sol owns intake, interpretation, schema, backend authorization/transactions and final acceptance. Exact gpt-6-luna handles settled controllers/serializers, responsive UI, focused tests, verification helpers and documentation. Target allocation is approximately 70% Luna/30% Sol, not a verification substitute.

Proposed bounded paths after contracts settle: apps/api/src/integration.controller.ts and controller tests; integration-calendar.ts and unit tests; integration-webhook.ts and unit tests; apps/web/src/integrations.tsx/css/test.tsx; tests/e2e/integrations.spec.ts. Sol retains integration.service.ts, Prisma schema/additive migrations and owning CRM/PRJ/TSK/REV/WFM public ports. Separate ignored .env.s25-tools prepares guarded verification and preservation. Existing app.module.ts/app.tsx/package scripts are coordinated integration edits.

Production deployment/provider binding, NAS/offsite backup/key custody/restore, hosted CI and actual-project R-105 remain separately unverified gates.

### Calendar implementation decisions (source-grounded, 2026-10-05)

Existing review assignments have no independent due timestamp. Their calendar date therefore uses the linked task committed deadline, falling back to its target date; undated source evidence is omitted. Current review-performing permission, named reviewer, active round/task/project and exact revision/file authorization remain required. Task events use the same deadline precedence. Milestones use actual target dates and source project versions. Personal entered events are creator-only; project entered events use existing explicit project.manage plus project.view/assignment/cross-branch authority. No attendee assignment or invitation is introduced. The subscription returns the random token only once, persists its hash, and excludes token/URL from command receipts and audit. Exact creation replay provides safe prior metadata; losing the one-time token requires an explicit new rotate command.

Calendar source was added under forward migration105 (four INT-owned tables) with retained history/canonical audit evidence, immutable receipts/history, source organization checks and monotonic cancellation/version rules. Schema generation, validation and focused API compilation passed; these checks do not establish persistence/migration/browser acceptance.

### Approved remaining bundle and ancillary repair — 2026-10-05

The Owner explicitly approved the proposed remaining S25 scope. Owner-only connectors fix an active branch, built-in active Website CRM source and currently authorized internal actor; HMAC enquiries create one NEW lead through CRM's public caller-transaction port. Exact signed retry is keyed by connector/external ID and canonical payload hash; changed values conflict. Configurable routing is immutable, rotation is versioned, signing credentials use existing EXTERNAL_SHARE_SECRET authenticated encryption with connector-bound AAD, and plaintext is revealed only once. Current actor/role/branch/source checks occur after serialization locks. Failed valid signed routing attempts retain only safe digest/status metadata when the configuring Owner remains active; same-payload sender retry may later succeed. Successful lead, NEW history, canonical audit and delivery evidence commit atomically. Unauthenticated attempts retain no deliveries. No payload/contact retention in INT status or audit.

Existing configured Workforce SITE coordinates are exposed through WFM's public port plus PRJ's current scope fence. Explicit OpenStreetMap links perform no automatic provider request; no attendance/selfie/QR evidence is exposed and existing geofence validation is unchanged. Broader CRUD/outbound feeds, WhatsApp and deep CAD/BIM remain excluded.

The Owner separately approved finishing bounded existing Task UI filter/density wiring to unblock verification: existing search/project/owner/status/phase/date filters, Apply/Reset, current page range and desktop compact toggle, preserving backend permissions and concurrent work. This is an ancillary gate repair, not expanded S25 business authority. Current concurrent source already contains parts of this wiring; agents reread before mutation. Historical verification failures remain recorded.

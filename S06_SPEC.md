# S06 Lead and client records

**Status:** COMPLETE for development/local staging. Owner authorized S06 on 2026-09-27 with “PUSH S05 AND START S06 IN OUR SOL AND LUNA FARMAT”. S07 and later remain unauthorized.

## Requirements and scope

- R-010.a: New → Contacted → Meeting/Discussion → Proposal → Negotiation → Won/Lost pipeline.
- R-010.b: Lost requires a reason; preserve outcome and interactions.
- R-010.c: Won is a conversion candidate with provenance; actual Project creation belongs to S07.
- R-010.d: Referral, Website, Manual and configurable other sources; advertising integrations are deferred.
- C-017.a: Scoped lead.stage_change authority, reasoned forward skips and retained from/to, skipped stages, actor and time.
- C-017.b: Report skipped stages separately from completed activities.
- C-018.a: Lost stays terminal; returning enquiry creates a separate linked lead and independent history/outcome/reporting period.
- C-018.b: Creation and prior-record visibility grants required; linking never expands either record's scope or copies approvals.
- C-019.a: Reasoned backward moves between nonterminal stages; retain stage and activity evidence.
- C-019.b: Won/Lost are not reopened; a genuine return does not rewrite history or undo formal decisions.

**Dependencies:** completed S03 ORG/ACC and S04 AUD/EVT/NTF. CRM owns Lead, LeadActivity, Client and contacts. Use current sessions, server authorization and atomic audit/event/outbox writes.

**In scope:** branch-owned lead persistence, client/contact records, source configuration, pipeline list/detail/form, activities, stage history, scoped transition APIs, returning-Lost links, Won candidate provenance.

**Out of scope:** projects and conversion execution, project grants/transfers, external portals, advertising/website integration, automatic client communication, approval workflows and all S07+ delivery work.

## Initial reviewed design and implemented boundary

The first bounded task is a pure stage evaluator in `apps/api/src/lead-stage-policy.ts`, with focused unit coverage. It performs no persistence, permission checks, audit, events or HTTP operation and is called by the transactional CRM service. NEW, CONTACTED, MEETING_DISCUSSION, PROPOSAL and NEGOTIATION are active stages; WON and LOST are terminal outcomes. Adjacent forward moves need no exception reason. Forward jumps, backward moves and Lost require a trimmed reason of 3–1000 characters. Forward jumps identify only intermediate active stages as skipped. Backward moves and Lost do not fabricate skipped/completed activities.

This reason bound is technical input validation, not a new business approval. All callers authorize the actual lead's scope and commit the transition, append-only history, actor/time/reason, canonical audit and outbox together. Use concurrency protection so two changes cannot overwrite a stage silently.

## Owner clarification and concrete implementation contract — 2026-09-27

Owner selected: only Owner edits shared client/contact records; granted staff may select currently visible clients and create leads. Owner also selected staff with a separate source-management grant. Source changes use organization-scoped `crm_source.manage`; Owner has implicit authority. Managers may add a source or activate/deactivate it with reason and an optimistic updatedAt token; no rename/delete. Inactive sources remain on existing leads but cannot be selected for new leads.

CRM leads use branch scope (no team/self inheritance), with independent `lead.view`, `lead.create`, `lead.edit`, `lead.activity_create`, `lead.stage_change` grants evaluated by ACC on the persisted branch. Owner still needs complete identity setup. List reads require one explicit branch selection and `lead.view`; no unfiltered global staff listing. Setup returns only currently permitted branches and sources plus per-branch capabilities. Staff client selection lists only clients linked to leads in a branch for which that actor has current lead.view. No client lead counts, other branch names, or unrelated history are returned. Direct client IDs need the same visible-link check, including when attaching to a new lead. Only Owner creates/updates shared clients/contacts, with reason, version and canonical audit.

Lead fields: title and contactName (2–160 characters), optional email/phone (320/64), sourceId, optional clientId, optional priorLostLeadId at creation, immutable organization/branch/creator/createdAt, stage/version/outcome/loss reason. No merge, deletion or branch transfer API. Leads start NEW; later-start renewal uses a separate reasoned transition, preserving both entries. Active lead details may be edited with version and reason; terminal records stay unchanged. Source/client/prior-Lost binding stays immutable after creation in S06. Client contact edits preserve contact IDs and use the parent's version; no silent replacement/deletion of contacts.

Every stage change locks the lead, rechecks current authority and expectedVersion, evaluates the pure policy, updates version/current stage/outcome and appends LeadStageChange in one transaction with safe canonical audit and domain/outbox events. Initial creation records NEW with direction CREATED and leadVersion 1. Stage evidence is immutable. Activity is an append-only interaction with kind NOTE/CALL/MEETING/PROPOSAL/OTHER and note (3–2000); it never implicitly advances stages. Activities may document terminal history without changing the original outcome. Won candidate returns leadId/branchId/clientId/wonAt and the exact Won stage-change ID, under lead.view; no project creation endpoint.

Returning links require new-branch lead.create, prior lead.view on its actual branch and prior stage LOST. Detail returns priorLostLeadId/prior title only after rechecking prior visibility; otherwise both are omitted. Each lead keeps independent contact/activity/history/outcome. No automatically copied client contact or prior history.

API shape: `/api/v1/crm/setup`; `/crm/leads?branchId=&stage=&offset=&limit=` → `{items,total}`; `/crm/leads/:id` → `{lead,stageChanges,activities,priorLostLead?,candidate?,capabilities}`; POST `/crm/leads`; PUT `/crm/leads/:id`; POST `/crm/leads/:id/stage` with `{expectedVersion,toStage,reason?}`; POST `/crm/leads/:id/activities` with `{kind,note}`; GET `/crm/clients?branchId=` → `{items}`; POST `/crm/clients` and PUT `/crm/clients/:id` Owner-only with reason and contacts. Each mutation checks session/origin/CSRF; each read no-store. UUIDs, bounded pagination, strict bodies and stable safe validation/permission/conflict errors are enforced. Clients `{id,name,version,contacts:[{id,name,email,phone}]}`; lead list projection excludes prior IDs and includes source display name. Setup `{branches:[{id,name,capabilities:{view,create,edit,activityCreate,stageChange}}],sources:[{id,name,active,builtIn}],owner}`. Detail history sorted chronologically and preserves skipped stages separately from activities. Do not add notifications to humans without approved recipient policy; events/outbox remain durable.

Database design: organization-bound composite FKs for source/client/prior lead and branch; immutable lead organization/branch/prior/source/client bindings and creator/createdAt; terminal stage/outcome protection; append-only activity/stage history; positive versions and unique stage history per lead/version. Fresh migration seeds Referral/Website/Manual for existing organization; CRM creation ensures the same built-ins for later organization setup through idempotent inserts, without allowing the caller to define defaults.

1. Stage-policy tests cover adjacent forward movement, reasoned skips, Lost, backward movement, same/invalid stages, terminal origins and reason bounds.
2. Reviewed migration applies to a fresh database and preserves existing S01–S05 records; organization/branch/customer/link constraints prevent tampering.
3. API and real PostgreSQL checks cover granted/denied scope, guessed IDs, cross-branch read/write/link leakage, terminal preservation, stale versions, stage/activity evidence and atomic rollback.
4. Won provenance and permission-filtered returning-lead history survive refresh. Skipped stages never count as completed activities.
5. Responsive UI covers loading, empty, denied, error/retry, validation and persisted list/detail updates on desktop/mobile.
6. Run applicable Prisma validation/generation/migration, typecheck, lint, unit/API suites, build and browser gates before COMPLETE.

## Actual progress and model routing

- Root retained Sol-level requirement interpretation, boundary design and review using the inherited model; no root model switch was performed.
- `gpt-6-luna` inspected approved sources and implemented the bounded pure policy and tests.
- Luna implemented bounded policy coverage, service/controller, HTTP contract tests and CRM UI. Root designed migrations, reviewed permissions and evidence, added database and browser checks, and fixed concurrency/access defects. Current verification is recorded in S06_COMPLETION_REPORT.md. S06 is COMPLETE for development/local staging; final evidence is in S06_COMPLETION_REPORT.md.

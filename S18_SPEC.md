# S18 Skills, SOP, knowledge and training

Status: COMPLETE for development/local staging (2026-10-08) after current-tree migration/preservation, permissions, persistence, full pinned verification, responsive desktop/mobile journeys and GPT-6.1 Sol capture review. The separate `codex/s17-workforce` acceptance at `e9df56e` remains source provenance; this completion is based on current combined-tree evidence in `S18_COMPLETION_REPORT.md` and `S18_ACCEPTANCE_REVIEW.md`. Production operations remain unverified.

## Requirements and slice boundary

Approved source: requirements/APPROVED_REQUIREMENTS.md sections44–45 and55–57; cross-cutting R-006/R-079/R-080/R-092/R-096/R-097 and C-001/C-003/C-009/C-023. Dependencies S05 shared approvals, S09 persisted tasks, S11 private NAS base and S17 current workforce/employee context are COMPLETE for their local scopes.

| Sub-ID | In-scope behavior |
| --- | --- |
| R-044.a | Employee skill profile and configurable organization catalogue. |
| R-044.b | Beginner, Intermediate, Advanced and Expert official levels. |
| R-044.c | Own skill addition/change request, preserving request history. |
| R-044.d | Official Team Leader/Owner control through explicit scoped authority and immutable rating history. |
| R-045.a | Completing training never changes official skill automatically. |
| R-045.b | Completed training may produce a distinct upgrade recommendation requiring management decision. |
| R-055.a | SOP text, image, PDF, video, links, checklists and template/reference content. |
| R-055.b | Exact approved versions; earlier content/publication versions retained. |
| R-055.c | Important updates may require own employee acknowledgement of exact version. |
| R-055.d | Task and project-template references preserve exact published SOP identity. |
| R-056.a | Knowledge categories include standards, construction details, materials, vendors, lessons, mistakes, software and policies. |
| R-056.b | Employee suggestions publish only through Team Leader/Owner approval. |
| R-057.a | Versioned authored modules with video, SOP, reference, quiz, practical task and reviewer assessment support. |
| R-057.b | Manual assignment and reasoned human recommendations for mistakes, skill gaps, new role/SOP or project requirement. |
| R-057.c | Retained assessments and dated effectiveness observations over time. |

Out of scope: R-045.c performance-generated recommendation producer (S23); R-056.c natural-language search and AI recommendation generators (S27); automatic promotion/assignment, performance scores, payroll, public/external library access, broad UI redesign, S19 onward and production deployment/NAS/legal/contract/offsite/restore gates. Existing behavior and retained data remain intact.

## Approved choices

The Owner approved choosing organization, Branch or Team library audiences through Owner/scoped Team Leader authority and private library-owned NAS files, with authorization rechecked for every request. Project-only document grants do not substitute for library access. A linked SOP/file/reference never grants an audience or project access.

C-026 now requires named reviewer pass against authored criteria plus dated effectiveness observations; C-027 requires different authorized publisher for employee/Team Leader submissions and permits Owner direct publication with reason. All material Owner questions for this scope are settled. Explicit organization library grants concern shared content only; report/employee/project/file boundaries remain intact. Exact implementation DTOs/access/evidence boundaries are in S18_API_CONTRACT.md.

Numeric quiz thresholds, automatic upgrade policies and artificial catalogue/default ratings are not invented. The authored module supplies criteria where needed. Current Owner/scoped explicit grants, active report-tree relationships, live sessions and immediate revocation remain required; role titles alone grant nothing.

## Acceptance and test plan

Fresh reviewed migrations and a populated S17 migration-only clone must succeed, with original old-column rows/digests preserved. Use a distinct fresh dedicated PostgreSQL acceptance database; tests must not mutate the preservation source/clone before comparison. Schema validation and generated client must pass. No resets/drops or unrelated working-file rewrites are authorized.

Backend/API acceptance proves real persistence, immutable exact rating/content/publication/assessment evidence, atomic state/audit/domain/outbox and replay receipts; stale-version and competing-request/decision races; rollback injection; own/manager/Owner scope; explicit denial of wrong Branch/Team, guessed IDs, revoked/expired sessions, self/bypass decisions, external actors, foreign files and retained-content overwrite. Private storage proves chunk retry/checksum/immutable bytes/traversal/symlink denial and no exposed NAS keys. Every file stream checks current access.

Training acceptance proves authored criteria, exact assigned module/SOP version, quiz/practical/reviewer history and effectiveness, plus a separate recommendation/approval path with official skill unchanged by completion alone. SOP acceptance proves old versions and individual acknowledgements survive new publication; task/template references never rewrite prior applied evidence.

Desktop/mobile journeys must cover persisted own profile/change request, scoped management decision/history, SOP/knowledge submission/publication/version/acknowledgement, assigned training/assessment and separate skill recommendation, refresh and permission loss. Inspect screenshots and loading/empty/error/access-denied states. Run required pinned Node24.19.0/pnpm11.19.0 pnpm verify (typecheck, lint, unit/API/real PostgreSQL tests, production build and desktop/mobile Playwright), with all relevant dedicated URLs provided and no skip masquerading as acceptance. Record exact commands, failures/classification, final Sol security/requirements review and actual models in completion/status documents before COMPLETE.

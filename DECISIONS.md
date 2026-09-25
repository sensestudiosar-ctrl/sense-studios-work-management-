# Decisions and proposals

## 2026-09-25 — Initialize an empty repository and context baseline

The supplied workspace was empty and had no Git metadata. Git was initialized for controlled checkpoints and project context files were added. No technology or product behavior was selected.

## 2026-09-25 — Approved source received

The owner supplied the 115-section Sense Studios Work Management Platform requirements. An exact copy is stored at requirements/APPROVED_REQUIREMENTS.md (SHA-256 C46124A2642199014CDF8697EFCB46ABB8C4408A97C83F8D09A1E07F2E0DE1D3). Architecture and implementation remain unapproved.

## 2026-09-25 — C-001: Branch-only organizational architecture (approved owner decision)

The approved hierarchy is Organization → Branch → Team → Employee. One organization may contain multiple branches; each project has exactly one owning branch. There is no separate Brand model, entity, table, permission scope or architectural layer. Brand and multi-brand wording in the verbatim source is superseded only where it describes organizational partitioning or isolation. Branch isolation is the required invariant. Employees may work on projects in other branches only through explicit assignment and applicable permissions; assignment does not confer access to the entire branch.

The source also lists Departments as an organizational layer. C-001 removes that tier. Reporting-manager relationships and configurable job roles remain distinct concepts within the approved hierarchy; their details are subject to the open owner decisions. The original source remains unchanged, and the precise addendum and affected source sections are recorded in requirements/CLARIFICATIONS.md.

## Proposed, not yet approved

ARCHITECTURE.md recommends a TypeScript/React/NestJS/PostgreSQL modular monolith, NAS-hosted Docker deployment if capacity and security checks pass, and a Cloudflare Tunnel for low-cost public ingress. These are proposals only. REQUIREMENT_QUESTIONS.md records decisions needed before implementation.

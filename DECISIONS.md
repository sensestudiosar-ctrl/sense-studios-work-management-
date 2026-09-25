# Decisions and proposals

## 2026-09-25 — Initialize an empty repository and context baseline

The supplied workspace was empty and had no Git metadata. Git was initialized for controlled checkpoints and project context files were added. No technology or product behavior was selected.

## 2026-09-25 — Approved source received

The owner supplied the 115-section Sense Studios Work Management Platform requirements. An exact copy is stored at requirements/APPROVED_REQUIREMENTS.md (SHA-256 C46124A2642199014CDF8697EFCB46ABB8C4408A97C83F8D09A1E07F2E0DE1D3). Architecture and implementation remain unapproved.

## 2026-09-25 — C-001: Branch-only organizational architecture (approved owner decision)

The approved hierarchy is Organization → Branch → Team → Employee. One organization may contain multiple branches; each project has exactly one owning branch. There is no separate Brand model, entity, table, permission scope or architectural layer. Brand and multi-brand wording in the verbatim source is superseded only where it describes organizational partitioning or isolation. Branch isolation is the required invariant. Employees may work on projects in other branches only through explicit assignment and applicable permissions; assignment does not confer access to the entire branch.

The source also lists Departments as an organizational layer. C-001 removes that tier. Reporting-manager relationships and configurable job roles remain distinct concepts within the approved hierarchy; C-002 resolves employee home-membership cardinality and cross-branch grant authority. The original source remains unchanged, and the precise addendum and affected source sections are recorded in requirements/CLARIFICATIONS.md.

## 2026-09-25 — C-002: Owner answers to Q1–Q15 (approved, with open details)

The owner answered all numbered interview questions. Approved selections and custom wording are recorded verbatim in substance in requirements/CLARIFICATIONS.md: Q1 A, Q2 B, Q3 A, Q4 A, Q5 A, Q6 A, Q7 A with R = internal review and CR = client review, Q8 B with exact periods pending, Q9 A, Q10 A with accrual/carry-forward rules pending, Q11 A, Q12 A with formula values pending, Q13 custom client PDF/image and possible vendor CAD download through NAS sharing, Q14 A, Q15 A (Owner-only cross-branch grants). Q13's precise transfer/authorization workflow remained open at C-002 and was later resolved by C-006. The later C-003–C-009 addenda resolve the other noted details. Final architecture is not yet approved.

## 2026-09-25 — C-003: Fixed Q8 retention durations (approved owner decision)

The owner approved follow-up Schedule A: 10 years for client approvals, issued drawings and audit records; 7 years after exit for exited-employee records; 90 days for site attendance selfies. C-003 in requirements/CLARIFICATIONS.md preserves the precise answer and separates approved durations from proposed clock anchors and purge mechanics. Applicable law and contracts must be checked before production. Final architecture remains unapproved.
## 2026-09-25 — C-004 through C-009: Later owner decisions (approved)

C-004 fixes a January–December leave year, full-year upfront credit, Owner-configured Branch allowances, calendar-day proration, five-day carry-forward cap and next-year expiry. C-005 fixes role-group employee formulas, Design/Turnkey health formulas and Owner approval of initial weights before scores appear. C-006 fixes Owner-only, file-specific seven-day coded MinisCloud CAD links for assigned vendors/consultants and immediate cancellation when access ends. C-007 fixes nightly encrypted backups to a reachable offsite computer/NAS with a one-day data-loss target. C-008 fixes staff passkeys, restricted external email-code sign-in, client passkey for formal approval, Brevo free email and in-app/email launch alerts. C-009 fixes retention clock anchors and scheduled deletion with notice and documented holds. The full approved wording is in requirements/CLARIFICATIONS.md. These decisions do not approve the final architecture or S01.

## Proposed, not yet approved

ARCHITECTURE.md recommends a TypeScript/React/NestJS/PostgreSQL modular monolith and NAS-hosted Docker deployment if capacity and security checks pass. The owner selected Cloudflare Tunnel for public app ingress in C-002 Q3; the complete architecture is still a proposal. REQUIREMENT_QUESTIONS.md records remaining material product decisions and deployment verification gates before implementation.

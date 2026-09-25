# Decisions and proposals

## 2026-09-25 — Initialize an empty repository and context baseline

The supplied workspace was empty and had no Git metadata. Git was initialized for controlled checkpoints and project context files were added. No technology or product behavior was selected.

## 2026-09-25 — Approved source received

The owner supplied the 115-section Sense Studios Work Management Platform requirements. An exact copy is stored at requirements/APPROVED_REQUIREMENTS.md (SHA-256 C46124A2642199014CDF8697EFCB46ABB8C4408A97C83F8D09A1E07F2E0DE1D3). Architecture and implementation remain unapproved.

## 2026-09-25 — Branch replaces brand (owner decision)

The owner's newer explicit instruction says the organization uses branches rather than brands and each project belongs to exactly one branch. This supersedes brand wording in the approved source, including multi-brand isolation references. Branch isolation is the required invariant. The owner also approved explicit cross-branch employee assignment; it grants access to assigned work, not an entire branch by implication.

## Proposed, not yet approved

ARCHITECTURE.md recommends a TypeScript/React/NestJS/PostgreSQL modular monolith, NAS-hosted Docker deployment if capacity and security checks pass, and a Cloudflare Tunnel for low-cost public ingress. These are proposals only. REQUIREMENT_QUESTIONS.md records decisions needed before implementation.

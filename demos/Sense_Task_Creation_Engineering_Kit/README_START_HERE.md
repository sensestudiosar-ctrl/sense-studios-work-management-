# Sense Studios — Task Creation Engineering Kit

**Approved design:** Programa-inspired V15 · **Engineering candidate:** V15-RC1 · **Date:** 24 October 2026

## How to give this to your coding agent

1. Give the agent this **whole ZIP** (or extract it into a temporary reference directory accessible from your repository).
2. Say: **“Read `AGENT_MASTER_PROMPT.md`, `README_START_HERE.md`, and all `docs/` files; then implement this in my existing canonical React/NestJS application. Use the HTML and screenshots under `reference/` for fidelity. Preserve backend contracts and existing work. Do not create a parallel application or deploy without approval.”**
3. Provide access to the **current app repository** and the canonical local development environment. Do **not** supply production credentials or live database backups to the agent.
4. Require the agent to return the acceptance evidence listed in `AGENT_MASTER_PROMPT.md` and `docs/04_ACCEPTANCE_TEST_MATRIX.md`.

## File map

| File | Role |
|---|---|
| `AGENT_MASTER_PROMPT.md` | Full execution instructions, integration boundaries, mandatory evidence and definition of done. |
| `docs/01_UI_UX_REQUIREMENTS.md` | Exact design elements, layout and responsive interaction specification. |
| `docs/02_API_DOMAIN_AND_STATE_CONTRACT.md` | Supported create fields, strict request mapping, eligibility, edge cases, optional features. |
| `docs/03_IMPLEMENTATION_PLAN.md` | Non-destructive implementation sequence and responsibility matrix. |
| `docs/04_ACCEPTANCE_TEST_MATRIX.md` | Specific pass/fail tests, viewport checks and sign-off criteria. |
| `docs/05_RELEASE_DECISIONS.md` | Open decisions, non-negotiable release gates, reviewer/frequency extension scope. |
| `reference/sense_task_creation_production_candidate.html` | **Primary UI fidelity reference** (standalone HTML with synthetic data; *not* production code). |
| `reference/sense_task_creation_programa_v15.html` | Approved V15 visual baseline predating candidate hardening. |
| `reference/screenshots/` | Desktop, mobile, people picker and internal/client reviewer example images. |
| `reference/source_handoffs/` | Current-app original handoff and reviewed candidate-specific engineering/QA notes. |

## Source-of-truth hierarchy

1. **Current repository code, contracts and authenticated API behaviour** govern what can actually be sent or persisted.
2. **Original repository handoff** documents the last inspected source architecture; confirm names and versions against the live repo.
3. **Production-candidate HTML** defines *appearance, ordering, behaviour and interaction states*, not new API semantics.
4. **Product-approved requirements** from this kit define feature intentions; if unsupported, keep them behind a feature gate, issue a separate backend change proposal and avoid implying they're saved.
5. Screenshots are visual comparators, not evidence of real persistence.

## Non-negotiable exclusions

The prototype's dark top “Role preview / Entry point / Simulated state” toolbar, synthetic dashboard shell, hardcoded employees/project names, fake backend and test/debug controls are **not** for your production UI. Do not clone them. Never apply retained migrations, deploy automatically, or create a second task creation app.

## Known scope boundaries

- `POST /api/v1/tasks` supports task-level `reviewRequirement` but **does not** currently document fields for named internal/client reviewers.
- `type: RECURRING` is a known task type but **does not** currently document `frequency`, `interval` or `weekdays` within strict create payload.
- Files, comments, review evidence and child tasks require separate workflows.
- Demo session draft persistence is not an approved production storage policy.
- Previous prototype QA: 197 automated assertions passed against synthetic HTML. This **does not** demonstrate real app integration, database persistence or full accessibility compliance.

**Engineering outcome expected:** A single UI matching V15 in the real Sense Studios application, safely connected to the current authorized backend and accompanied by verifiable test results and an explicit release recommendation.

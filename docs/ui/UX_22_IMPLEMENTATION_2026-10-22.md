# UX-22 — review improvements — 2026-10-22

Status: IN PROGRESS until exact-candidate browser/quality acceptance and matched staging verification. Owner instruction: “work to improve all the findings.” Scope is the twelve findings in UI_UX_REVIEW_2026-10-22.md, mapped in IMPLEMENTATION_PLAN.md. This is a refinement of existing Sense pages in apps/web, with migration119 unchanged; client-password120 and ArchiFlow remain excluded.

## Design and requirement boundary

The existing Sense design system is the locked visual target: warm canvas, pine primary actions, white surfaces, restrained borders and existing status meanings. References remain the Refero research in TASK_CREATION_DEMO_BRIEF_2026-10-20.md and docs/design/TASK_CREATION_COMPLETED_UX_RESEARCH_2026-10-16.md. This implements the reviewed usability changes rather than a new frontend or prototype contract. ui-ux-pro-max supplies supplemental keyboard, form, touch, typography and responsive checks.

| Finding | Implementation and preserved boundary |
|---|---|
| UX-01 | Retain accepted desktop/mobile navigation breakpoint fix at60d9292; validate its delivered behavior. |
| UX-02 | Shared task composer puts brief/required context first. Collaborators and planning use disclosures; eligible owner/collaborator search keeps selected people. Existing API eligibility remains authoritative. |
| UX-03 | One validation pass supplies command guard, field errors, aria descriptions and a focused error summary. Error links reveal optional groups. Invalid fields never submit commands. |
| UX-04 | Project is required for Project/Correction/Site task types; optional context retains the existing type/context clearing behavior. |
| UX-05 | Directory leads; template selection/management is secondary within project creation, with separate retained Staff reference/management access. Pending/recovery commands lock template controls as before. |
| UX-06 | Project relationships use authorized CRM client/won-lead names, search, paging, loading/error/retry and stale-branch guards. Optional direct-project behavior and backend reauthorization remain. |
| UX-07 | Scoped Dashboard typography increases functional microcopy/control sizing and permits wrapping without changing source counts or metric calculation. |
| UX-08 | Task completion explains unfinished-child/required-review blocking visibly. Existing transition gates remain unchanged. |
| UX-09 | Compact Settings navigation; current/active sessions precede a collapsed retained history. Existing session revoke permissions remain. |
| UX-10 | Dashboard/My Work/Projects page H1s, shared skip link and pathname focus; native modal focus is preserved. Search/filter changes do not refocus the route. |
| UX-11 | Human-readable review dates/states, clearer report/Owner empty-state copy. Operational dates use UTC formatting of the date component without viewer-timezone shifting. Missing evidence remains unavailable. |
| UX-12 | Client email-code sign-in uses shared auth framing with invitation, delivery-help and other-sign-in guidance. Existing email-code/passkey/security contracts remain. |

## Preservation and review

Pre-existing Dashboard CSS/widget edits and eslint configuration were preserved separately and excluded from this selected change. Dashboard source is staged only for this task's date/state/heading/copy edits. No retained-data migration, fixture insertion, credential request or storage clearing is authorized by this slice.

Independent Codex source review found two regressions in template placement (lost Staff panel and lost pending/recovery lock). Both were corrected and the reviewer confirmed resolution. The existing exact-body uncertain-template recovery test verifies the lock; a new regression verifies granted Staff management. No Opus/Sonnet or independent test execution is claimed.

## Verification record

Implementation runs and failed attempts are retained privately in .env.ux-review-20261022. The first unit run encountered sandbox temporary-directory ENOENT errors; later runs use an owned workspace TEMP/TMP directory. A malformed lookup response exposed a render-crash path during branch testing; client and lead response-shape guards now reject it. An initial navigation command could not find the sandbox browser path; rerunning with the installed managed-browser path passed all28 cases.

Latest broad web unit run:649 passed/1 old-copy assertion failed, with no claim that it passed. The assertion was updated to the new action label and an affected rerun is pending. Web typecheck passed before the last bounded corrections; final exact-candidate quality/build/browser checks and staging are pending. No complete acceptance or production readiness is claimed by this checkpoint.

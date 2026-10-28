# Root-Cause Classification (RCA) Taxonomy

When a problem recurs or a stage fails, classify the cause into exactly
one primary class (plus contributing classes). Use this, not free-form,
so repeated categories are detectable in METRICS.md.

| Class | Signature |
|---|---|
| `REQ-UNCLEAR` | Requirement ambiguous or missing; agent guessed and guessed wrong |
| `RULE-MISSING` | Business rule not written in approved docs; violated silently |
| `VERSION-DRIFT` | Wrong/outdated build or branch inspected; stale server |
| `INSTRUCTION-WEAK` | Agent prompt/definition too vague or missing a guard |
| `REUSE-POOR` | New code where a shared component/contract existed |
| `TEST-WEAK` | No regression coverage for the failing path |
| `REVIEW-THIN` | Same agent reviewed its own work; acceptance unchecked |
| `FIXTURE-BAD` | Invalid/missing test data or persona |
| `TOOL-WRONG` | Used a tool for what another tool does (or none) |
| `CONFLICT` | Two changes/agents touched the same surface concurrently |
| `DEP-EXCESS` | Unnecessary dependency, library, or tooling added |
| `DEPLOY-MISS` | Serving build not verified before comparison |
| `COST-WASTE` | Redundant runs, re-reads, or duplicate browser sessions |
| `RECOVERY-BUG` | Duplicate execution, stale lock, lost checkpoint |

## Rule
- Each RCA has: issue id, class(es), evidence, corrective action, owner,
  follow-up metric.
- A corrective action that touches *factory* procedure is proposed to
  `factory-improver` with a baseline comparison before adoption (FACTORY.md §6).
- Three occurrences of the same class in 30 days → process change is
  required, not another one-off fix.

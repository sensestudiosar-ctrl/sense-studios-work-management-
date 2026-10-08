# Proposed UI/UX documentation structure

Date: 2026-10-05 · Status: **structure proposed for planning discussion only**

This index separates product decisions, UX design, reference research and engineering proof. It is designed so a future session can load the one artifact that matches its task. The current package is the master plan plus the materialized support documents in the tree below. Other documents are **proposed future artifacts**; they do not yet exist and should be created after the post-S27 rebaseline and with the appropriate authorization. Do not create demo implementation or freeze unresolved rules merely to fill this tree.

```text
docs/ui/
├── master-plan/                         # Root: status, source links and what to load
│   ├── UI_UX_MASTER_PLAN.md             # UX/product strategy, scope, gates, personas, journeys, decision register
│   ├── DOCUMENTATION_STRUCTURE.md       # This context map
│   ├── VISUAL_REFERENCE_BENCHMARK_LIBRARY.md  # Product principles/adaptations by pattern
│   ├── ENGINEERING_MIGRATION_AND_REGRESSION_PLAN.md # routes, delivery waves, security/regression/usability proof
│   ├── API_GAP_REGISTER.md              # conditional read/evidence/permission dependencies
│   ├── UI_UX_EVIDENCE_REGISTER.md       # baseline sources and retained screenshots
│   ├── UI_UX_PLAN_REVIEW.md             # source-fidelity review; not design/implementation approval
│   └── UI_UX_REFINEMENT_CHANGELOG.md    # Owner-directed refinements, open decisions and next planning action
└── v2/                                  # Proposed, post-S27 approved UX specification package
    ├── UX_CONSTITUTION.md               # invariant product/UX principles and change boundaries
    ├── USER_JOURNEYS.md                 # role/task maps, successful/error/revoked paths
    ├── INFORMATION_ARCHITECTURE.md      # internal/portal nav, labels, routes and return/context model
    ├── PAGE_PATTERNS.md                 # screen contracts and content/state composition by page family
    ├── MOBILE_UX.md                     # field/site and responsive interaction contracts
    ├── DESIGN_SYSTEM.md                 # approved visual tokens, type, components, states and usage
    └── prototypes/                      # five Owner-reviewed representative prototypes and decision notes
        ├── app-shell/
        ├── my-work/
        ├── project-workspace/
        ├── task-detail-create/
        └── review-workspace/
```

## Context loading guide

| Session purpose | Required starting document(s) | Add only when needed |
| --- | --- | --- |
| Product/UX strategy or Owner decisions | `UI_UX_MASTER_PLAN.md`, relevant approved requirements/addenda | `USER_JOURNEYS.md`, `INFORMATION_ARCHITECTURE.md`, reference rows in `VISUAL_REFERENCE_BENCHMARK_LIBRARY.md` |
| Compare benchmark examples | `VISUAL_REFERENCE_BENCHMARK_LIBRARY.md` | Specific official linked docs; current screenshot observation sheet |
| Page/interaction specification | `PAGE_PATTERNS.md`, `UX_CONSTITUTION.md` | One applicable journey, IA section and relevant reference patterns |
| Visual direction/components | Approved Gate A record, `DESIGN_SYSTEM.md` | Gate B comparison, approved five prototypes, applicable page/mobile patterns |
| Mobile/site UX | `MOBILE_UX.md`, relevant journeys | S20–S22 accepted sources/reports and evidence captures for the specific route |
| API or permission feasibility | `API_GAP_REGISTER.md`, current accepted functional contracts | Exact owner service/DTO/tests and `PERMISSIONS.md`; never load full design history by default |
| UI implementation after authorization | Explicit implementation brief, approved page/prototype, accepted baseline | `ENGINEERING_MIGRATION_AND_REGRESSION_PLAN.md`, applicable API gap, narrow source/callers/tests |
| Regression/QA | `ENGINEERING_MIGRATION_AND_REGRESSION_PLAN.md`, approved acceptance IDs | Narrow related journeys/screenshots, current `TESTING.md`, test fixture contracts |
| Capture/evidence review | `UI_UX_EVIDENCE_REGISTER.md` | Only the relevant matched captures and source/acceptance report |

## Ownership and change control proposal

The UX master is the product-design index and decision trail. The UX Constitution holds approved invariants, not duplicated module requirements. Journey/IA/page/mobile documents contain designed user-facing behavior with links to exact requirement sub-IDs and authoritative functional contracts. The Visual Reference Library remains a research catalog; it does not override local policy. DESIGN_SYSTEM records Gate B decisions, but its visual package applies only to the prototypes until their specific approval. ENGINEERING_MIGRATION_AND_REGRESSION_PLAN owns source mapping, migration, rollback, regression and human study protocol; API_GAP_REGISTER owns contract questions; EVIDENCE_REGISTER owns capture provenance.

Record Gate A, Gate B, prototype-set review, transformation-start authorization and final acceptance as separate dated Owner decisions with scope and referenced artifacts. Update the source/index links when files move; do not duplicate mutable permission, calculation or workflow rules in UX copy. If a separate approved requirement changes, point to it and reconcile affected UX pages instead of silently redefining it here.

## Creation order after S27

1. Rebaseline accepted functionality and refresh evidence. Reconcile S18 and updated scope first.
2. Finalize Gate A architecture, then Gate B visual decision record.
3. Create the five representative prototypes and stop for Owner review.
4. After separate authorization, create the UX Constitution/Journeys/IA/Page Patterns/Mobile UX documents as a coherent approved package; populate DESIGN_SYSTEM only with Gate B decisions and approved prototype conventions.
5. Maintain API gaps and engineering/regression evidence separately as functional contracts evolve.

This order creates artifacts when source evidence and decisions exist. It does not start T01 or approve visual propagation.

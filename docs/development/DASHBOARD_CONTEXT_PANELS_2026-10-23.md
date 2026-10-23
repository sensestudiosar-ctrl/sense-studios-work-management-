# Dashboard context panels

Status: IN PROGRESS. Slice DASH-PANEL in IMPLEMENTATION_PLAN.md.

The Owner requests contextual side panels for dashboard widget clicks. Preserve the existing Sense pine/paper dashboard and native Task drawer as the primary design lock. Refero research: [Linear's task/profile side sheet](https://refero.design/pages/4a094449-e0ab-4893-8e58-c6239e7c228c) supplies a right-hand contextual reading surface; [Craft's task lists](https://refero.design/pages/24247619-8598-4191-b4e1-93a8088d324e) supplies concise category headers and separated task rows. Adapt structure only, keeping Sense tokens, existing metadata and authorized sources. No visual identity change or synthetic data.

Decision ledger: five task cards become buttons opening their exact current server section; Due today and Overdue retain distinct canonical definitions. All source rows are available in the panel, without the dashboard's five-row preview cap. Source widget details and project/task previews use the same surface. Explicit workspace navigation remains available inside the panel. Existing timer and performance controls keep their behavior. Native modal focus containment, Escape, close/backdrop dismissal and trigger focus restoration preserve dashboard context. Phone panels occupy the full viewport. Live source loading/error/unavailable state replaces evidence rather than retaining a copied row snapshot.

No backend, access, mutation, schema, migration or retained-data change. Concurrent Time/composer changes stay excluded from the selected release. Verification and exact deployment evidence will be recorded before completion.

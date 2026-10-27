# Supported capability mapping

[Machine-readable mapping](SUPPORTED_CAPABILITIES.json) retains all 409 discovery capability obligations, their IDs, existing routes, proposed homes, component and endpoint-family references. It adds prototype coverage without overwriting production acceptance. [Original full matrix](../revision-2/FEATURE_PARITY_MATRIX.md) and [374-handler register](../revision-2/ENDPOINT_PARITY_REGISTER.md) remain the discovery inventory; declarations are not independent features or verified runtime tests.

| Capability | Prototype support | Existing owner / compatibility |
|---|---|---|
| Dashboard → My Work / task / project | Connected, same sample object graph | `/dashboard`, `/my-work`, `/projects`; Dashboard/My Work/TaskWorkspace |
| Queue search/group and return context | Existing approved queue, retained query/group/scroll | Same React worklist; no new server paging/filter contract |
| Employee self-task / manager assignment | Approved creation form; distinct owner, collaborator and actor; personal queue excludes assignments to others | Canonical task creation and creation options; synthetic eligible people do not verify access |
| Create/subtask/fixed Project | Shared form and returned task; immutable sample parent/project | Existing ordinary/child commands; no new parent/type contract |
| Dirty/denied/pending/lost-response recovery | Draft retained; same command receipt and task ID recovered | Existing receipt design; prototype receipt is in-memory and has no persistence claim |
| Reviewer assignment / start / submit | Explicit manager assignment, worker start, reason and file/link submission | Existing REV assignment + TSK start + REV submit; no auto-created grant or self-approval |
| Review comment / category / severity / reason | Exact-round feedback; named independent decision | Existing REV decision; annotation/category administration remain app-owned |
| Linked correction | Separate request and manager assignment; same exact correction/task link | Existing REV correction assignment and TSK ordinary NONE-review completion |
| Correction completion → original resubmit | Block before correction complete; required updated evidence on new original round | Current backend gate retained. Checklist/file requirement is not added to NONE-review completion |
| Internal approval → completion | Exact round approved independently; separate eligible completion | Current INTERNAL_APPROVED/COMPLETED distinction; client delivery/final approval/issue excluded |
| Desktop/tablet/phone and recovery states | One shell, five phone destinations, native task/create dialogs, state recovery | Presentation prototype only; current routes, data and deployment unchanged |
| Other 409-row inventory obligations | Retained in current app, not implemented/accepted by this prototype | No action or route is removed from production. Existing route index is accessible from More; prototype destinations clearly state their scope |

Discovery correction: CAP-100 previously said “all six supported task types.” The existing schema also contains **CLOSEOUT**, alongside PROJECT, NON_PROJECT, RECURRING, CORRECTION, SITE and TRAINING_PRACTICAL. CLOSEOUT retains its existing cancellation/approval workflow; it is not introduced as an unrestricted task-creation shortcut. Recurrence, site, training and closeout flows remain in their owning app modules. P1 creation does not pretend to demonstrate these entire domain workflows.

This proves preservation of the existing application's capability surface by leaving its implementation unchanged and keeping every obligation mapped. It does **not** prove all 409 capabilities are functional in this limited prototype or that future implementation already has parity. Each row must receive its own current-route/role/state acceptance before a replacement is accepted. Client/external rows remain blocked under D01 and cannot borrow the prototype's persona controls as evidence.

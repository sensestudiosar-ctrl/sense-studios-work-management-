# My Work task opening — approved reference and bounded implementation

Latest Owner instruction: clicking a task must open like the exact supplied final demo. This authorizes the task-opening presentation in `/my-work`; existing task workflows and backend authorization remain authoritative.

## Requirements and boundary

R-018.a–b, R-019.a–c, R-021.a–b, R-022, R-023.a, R-024.a–b, R-027–R-029 and R-037 retain canonical ownership, fields, states, separate dates, reviews, checklist/history and evidence. R-006/R-079/R-080/R-092 preserve authorization and audit. No backend, schema, permission, database, task-state or private-task change. `/tasks` and other shared callers keep their existing detail layout. MW-I02 remains IN PROGRESS; this does not start MW-I03.

## Reference lock and decisions

Authoritative source: `D:/1.Sensestudios/DR RAJA/01.Designer/03. Renders/AFTERPHOTOSHOP/Sense_Studios_My_Work_Final_Demo.html`, SHA256 `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`.

| Decision | Reference | Rule |
| --- | --- | --- |
| Right modal drawer over retained queue | `openTask`, `.drawer` | Desktop min(570px,46vw), minimum410px; intermediate min(570px,65vw); <=700px full viewport |
| Header, summary, tabs and fixed footer | `renderDrawer`, `.drawer-top`, `.drawer-summary`, `.drawer-tabs`, `.drawer-foot` | White surfaces, existing pine accents, compact canonical metadata; only body scrolls |
| Overview/Checklist/Evidence/Activity | `renderDrawerContent` | Existing detail controls and records; no invented evidence/time/reviewer totals |
| Close/Escape/backdrop/previous-next | `closeDrawer`, `drawerNext` | Preserve dirty edits, keyboard focus and current queue; only loaded authorized rows are traversed |
| Evidence workflow | Existing `/reviews` link, R-037 | Route to canonical review evidence; no mock uploads or simulated confirmation |
| Accessible controls | Refero craft-details and existing application | Visible focus, native modal focus isolation, readable 44px targets, safe mobile footer |

Browser policy rejects file-protocol navigation to the supplied demo. Reference inspection uses its read-only source and existing approved captures; it will not be served or opened through an alternate browser to bypass that policy. Existing queue prototype captures do not establish drawer fidelity. Implementation evidence must be labeled as current component or actual application evidence.

## Implementation and verification

Add a bounded drawer frame and adapt My Work's existing detail presentation. Keep URL `taskId`, history/back, scope/filters/card selection/sort/page/view, authoritative detail reads, loading/denied/stale handling and every existing capability-gated command. Preserve unsaved edits on cancelled navigation. Checklist stays read-only with updates through the existing edit form. Activity uses canonical status/owner/committed-date history. Evidence uses the authorized existing review route. No fabricated timer, subtasks, assigned-by actor, evidence progress or sample approval action.

Use focused frontend coverage for opening/closing, Escape/backdrop, previous-next, focus restoration, dirty forms, URL/queue restoration, checklist/activity/evidence and unchanged shared callers. Run affected frontend checks, typecheck, lint and build under the pinned runtime; inspect component geometry at1440×900,1024×900,390×844 and320×740. No disposable database or authenticated acceptance run is included.

Routing: GPT-6.1 Sol intake/requirements/acceptance; GPT-6 Luna bounded drawer frame; primary integration. Preserve all earlier functional, visual, recovery and baseline-failure evidence.

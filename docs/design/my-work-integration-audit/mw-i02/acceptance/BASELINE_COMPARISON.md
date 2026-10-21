# MW-I02 web baseline comparison

This note compares the preserved full web Vitest run at `acceptance/final-full-web-20261010.log` with the earlier baseline at `../evidence/final-full-web.log`. Both logs remain unchanged.

Both runs report the same result: 34 files, 32 passed and 2 failed; 246 tests, 227 passed and 19 failed; two unhandled errors. The 19 failing test names match exactly. They are concentrated in `workspace-navigation.test.tsx` (the direct-URL active destination test) and 18 `app.test.tsx` identity/authentication-shell tests. The current log reports 23.09 seconds; the earlier baseline reports 36.01 seconds. Runtime differs, failure coverage does not.

Both logs report the same uncaught exception in `src/dashboard.tsx:109:210`: `TypeError: Cannot read properties of undefined (reading '0')`, during `DashboardWorkspace` state updates, with the initial signed-in landing test and invitation/recovery test as the last tests before the unhandled errors. These logs do not establish that the new My Work phase UI caused the exception. They do establish that full web unit acceptance remains failing; do not claim the full suite passed. Root should determine whether the separately scoped dashboard defect is pre-existing and handle it within its authorized scope.

The static image comparison is in `COMPARISON.html`. It maps the approved 28 references to attempt-4-before and the current actual capture set at four widths. The Owner no-employee state has no personal tasks because this authenticated Owner identity has no active employee identity; this differs from populated sample prototype data and is the intended truthful empty-state adaptation. The task-source failure images are explicitly marked simulated: they intercept one task API request and do not represent a server outage, full-app loading failure, or authorization denial.

Capture summaries sit beside their PNG files and record timestamps, viewport/document geometry, horizontal-overflow measurements, queue/first-task boxes, totals and simulation provenance. Comparison rows link directly to viewport and full-page PNGs. Review is pending; these materials are evidence for review, not an acceptance verdict.

# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: acceptance.spec.ts >> MW-I02 authenticated task acceptance: real identities, populated views, commands, and responsive shell
- Location: .env.checkpoint-tools\mw-i02-acceptance\acceptance.spec.ts:175:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.task-workspace nav.task-list button').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.task-workspace nav.task-list button').first() with timeout 15000ms
  - waiting for locator('.task-workspace nav.task-list button').first()

```

```yaml
- banner:
  - link "Sense Studios home":
    - /url: /
    - text: S
    - strong: SENSE STUDIOS
    - text: WORK MANAGEMENT
  - text: IDENTITY
  - link "Notifications":
    - /url: /notifications
  - button "Log out"
- complementary:
  - paragraph: Workspace
  - text: Find a page
  - searchbox "Find a page"
  - navigation "Workspace navigation":
    - link "Dashboard":
      - /url: /dashboard
    - region "Work":
      - heading "Work" [level=2]:
        - button "Work" [expanded]: Work Contains the current page.
      - link "My Work":
        - /url: /my-work
      - link "Decisions":
        - /url: /decisions
      - link "Tasks":
        - /url: /tasks
      - link "Projects":
        - /url: /projects
      - link "Project documents":
        - /url: /documents
      - link "Drawing register":
        - /url: /revisions
      - link "Internal reviews":
        - /url: /reviews
      - link "Client reviews":
        - /url: /client-reviews
      - link "Evidence assistance":
        - /url: /assistance
      - link "Turnkey operations":
        - /url: /turnkey
      - link "Site delivery":
        - /url: /site
    - region "People":
      - heading "People" [level=2]:
        - button "People"
    - region "Insights":
      - heading "Insights" [level=2]:
        - button "Insights"
    - region "Manage":
      - heading "Manage" [level=2]:
        - button "Manage"
- main:
  - text: Tasks mw-i02-site-employee@example.test
  - region "Tasks":
    - paragraph: Work management
    - heading "Tasks" [level=2]
    - paragraph: Track your work, collaborators and progress.
    - button "Create task"
    - group "Task list scope":
      - button "My primary tasks"
      - button "Collaborating or managed tasks"
      - button "All visible tasks" [pressed]
      - button "Owned by me"
      - button "Created by me"
      - button "Collaborating"
    - group "Task display":
      - button "List" [pressed]
      - button "Cards"
      - button "Kanban"
      - button "Timeline"
    - checkbox "Compact"
    - text: Compact
    - button "Refresh"
    - form "Task filters":
      - text: Search tasks
      - textbox "Search tasks"
      - group: Filters & sort
      - button "Apply filters"
      - button "Reset filters"
    - text: 0 filtered tasks
    - button "Previous" [disabled]
    - button "Next" [disabled]
    - navigation "All visible tasks":
      - heading "All visible tasks 0" [level=3]
      - paragraph: No visible tasks match these filters.
- contentinfo: Sense Studios · Secure workspace
```

# Test source

```ts
  380 |       if (reviewTask.status === "NOT_STARTED") {
  381 |         const started = await staff.designer.page.request.post(`/api/v1/tasks/${reviewTask.id}/state`, {
  382 |           headers: { Origin: baseURL, "X-CSRF-Token": designerCsrf },
  383 |           data: { toState: "IN_PROGRESS", expectedVersion: assignedReview.task.version, reason: "Start reviewable acceptance work" }
  384 |         });
  385 |         expect(started.status()).toBe(201);
  386 |         const startedTask = await started.json() as { version: number };
  387 |         await api(staff.designer.page, `/api/v1/reviews/tasks/${reviewTask.id}/submit`, "POST", {
  388 |           expectedVersion: startedTask.version, reason: "Submit for ordinary internal review"
  389 |         }, designerCsrf);
  390 |       }
  391 |       const reviewDetail = await api<{ rounds: Array<{ id: string }> }>(staff.employee.page, `/api/v1/reviews/tasks/${reviewTask.id}`, "GET");
  392 |       const reviewRoundId = reviewDetail.rounds[0]!.id;
  393 |       const employeeCsrf = await getCsrf(staff.employee.page);
  394 |       const round = reviewDetail.rounds[0] as { status?: string };
  395 |       if (round.status === "SUBMITTED" || round.status === "IN_REVIEW") {
  396 |         if (round.status === "SUBMITTED") await api(staff.employee.page, `/api/v1/reviews/rounds/${reviewRoundId}/start`, "POST", { reason: "Start independent review" }, employeeCsrf);
  397 |         const categoriesResponse = await api<{ categories: Array<{ id: string; name: string }> }>(ownerPage, "/api/v1/reviews/categories", "GET");
  398 |         const categoryName = `MW-I02 category ${runSuffix}`;
  399 |         const category = categoriesResponse.categories.find(item => item.name === categoryName)
  400 |           ?? await api<{ id: string }>(ownerPage, "/api/v1/reviews/categories", "POST", { name: categoryName, reason: why }, csrf);
  401 |         await api(staff.employee.page, `/api/v1/reviews/rounds/${reviewRoundId}/decision`, "POST", {
  402 |           kind: "CORRECTIONS_REQUIRED", severity: "Critical", categoryId: category.id,
  403 |           comment: "Clarify the acceptance task details before approval", reason: "Record required correction through review workflow"
  404 |         }, employeeCsrf);
  405 |       }
  406 |     }
  407 | 
  408 |     // Seed more than one visible page using ordinary task creation commands, with all fields supplied by the domain API.
  409 |     const seededTitles: string[] = [];
  410 |     for (let index = 0; index < 52; index += 1) {
  411 |       const title = `MW-I02 queue ${runSuffix} ${String(index + 1).padStart(2, "0")}`;
  412 |       seededTitles.push(title);
  413 |       if (!(await existingTask(ownerPage, title))) await api(ownerPage, "/api/v1/tasks", "POST", {
  414 |         title, type: "NON_PROJECT", priority: (["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const)[index % 4],
  415 |         targetDate: `2026-11-${String((index % 27) + 1).padStart(2, "0")}`,
  416 |         ownerEmployeeId: staff.designer.employeeId, reason: why
  417 |       }, csrf);
  418 |     }
  419 |     const committedFixture = await existingTask(ownerPage, seededTitles[51]!);
  420 |     if (committedFixture && committedFixture.status === "NOT_STARTED") {
  421 |       const started = await api<{ version: number }>(ownerPage, `/api/v1/tasks/${committedFixture.id}/state`, "POST", {
  422 |         toState: "IN_PROGRESS", expectedVersion: committedFixture.version, reason: "Prepare a queue fixture for a real committed date"
  423 |       }, csrf);
  424 |       await api(ownerPage, `/api/v1/tasks/${committedFixture.id}/committed-date`, "POST", {
  425 |         committedDueDate: "2026-11-30", expectedVersion: started.version, reason: "Create a committed-date queue example"
  426 |       }, csrf);
  427 |     }
  428 |     const waitingTitle = `Confirm bathroom tile measurements ${runSuffix}`;
  429 |     let waitingFixture = await existingTask(ownerPage, waitingTitle);
  430 |     if (!waitingFixture) waitingFixture = await api(ownerPage, "/api/v1/tasks", "POST", {
  431 |       title: waitingTitle, type: "NON_PROJECT", priority: "MEDIUM", targetDate: "2026-11-18",
  432 |       ownerEmployeeId: staff.designer.employeeId, reason: why
  433 |     }, csrf);
  434 |     if (waitingFixture.status === "NOT_STARTED") {
  435 |       waitingFixture = await api(ownerPage, `/api/v1/tasks/${waitingFixture.id}/state`, "POST", {
  436 |         toState: "IN_PROGRESS", expectedVersion: waitingFixture.version, reason: "Start the waiting-state acceptance fixture"
  437 |       }, csrf);
  438 |     }
  439 |     if (waitingFixture.status === "IN_PROGRESS") await api(ownerPage, `/api/v1/tasks/${waitingFixture.id}/wait`, "POST", {
  440 |       expectedVersion: waitingFixture.version, reason: "Wait for the confirmed tile measurement", delayCause: "Site measurement pending", responsibleParty: "Site Employee"
  441 |     }, csrf);
  442 | 
  443 |     await ownerPage.goto("/tasks");
  444 |     const workspace = ownerPage.locator(".task-workspace");
  445 |     await expect(workspace.getByRole("heading", { name: "Tasks" })).toBeVisible();
  446 |     await workspace.locator("details.task-secondary-filters > summary").click();
  447 |     await workspace.getByLabel("Sort tasks").selectOption("title_asc");
  448 |     await expect(workspace.getByLabel("Filter by status").locator("option")).toHaveCount(14);
  449 |     const search = workspace.getByLabel("Search tasks");
  450 |     const queueSearch = `MW-I02 queue ${runSuffix}`;
  451 |     await search.fill(queueSearch);
  452 |     await workspace.getByRole("button", { name: "Apply filters" }).click();
  453 |     await expect(workspace.locator(".task-queue-row")).toHaveCount(50);
  454 |     await expect(workspace.getByText(seededTitles[0]!, { exact: true })).toBeVisible();
  455 |     await expect(workspace.getByText(seededTitles[49]!, { exact: true })).toBeVisible();
  456 |     await expect(workspace.getByText(seededTitles[50]!, { exact: true })).toHaveCount(0);
  457 |     await expect(workspace.getByText("Primary owner", { exact: false }).first()).toBeVisible();
  458 |     for (const priority of ["LOW", "MEDIUM", "HIGH", "CRITICAL"]) await expect(workspace.locator(".task-queue-row").getByText(priority, { exact: true }).first()).toBeVisible();
  459 |     await expect(workspace.locator(".task-queue-row").getByText("Not committed", { exact: true }).first()).toBeVisible();
  460 |     await expect(workspace.locator(".task-queue-row").getByText(/2026-11-/).first()).toBeVisible();
  461 |     await ownerPage.setViewportSize({ width: 1440, height: 1000 });
  462 |     const filtersDisclosure = workspace.locator("details.task-secondary-filters > summary");
  463 |     await filtersDisclosure.click();
  464 |     await ownerPage.screenshot({ path: testInfo.outputPath("tasks-desktop-list.png"), fullPage: true });
  465 |     await ownerPage.screenshot({ path: testInfo.outputPath("tasks-desktop-list-viewport.png"), fullPage: false });
  466 |     await filtersDisclosure.click();
  467 |     await search.fill(reviewTitle);
  468 |     await workspace.getByRole("button", { name: "Apply filters" }).click();
  469 |     await expect(workspace.getByText(reviewTitle, { exact: true })).toBeVisible();
  470 |     await expect(workspace.locator(".task-queue-row .task-state").filter({ hasText: "Corrections required" })).toBeVisible();
  471 |     await search.fill(queueSearch);
  472 |     await workspace.getByRole("button", { name: "Apply filters" }).click();
  473 |     await expect(workspace.locator(".task-queue-row")).toHaveCount(50);
  474 |     await filtersDisclosure.click();
  475 | 
  476 |     for (const [persona, page] of [["leader", staff.leader.page], ["designer", staff.designer.page], ["site-employee", staff.employee.page]] as const) {
  477 |       await page.setViewportSize({ width: 1440, height: 1000 });
  478 |       await page.goto("/tasks?scope=all");
  479 |       await expect(page.locator(".task-workspace").getByRole("heading", { name: "Tasks" })).toBeVisible();
> 480 |       await expect(page.locator(".task-workspace nav.task-list button").first()).toBeVisible();
      |                                                                                  ^ Error: expect(locator).toBeVisible() failed
  481 |       await page.screenshot({ path: testInfo.outputPath(`tasks-${persona}-desktop.png`), fullPage: true });
  482 |       await page.screenshot({ path: testInfo.outputPath(`tasks-${persona}-desktop-viewport.png`), fullPage: false });
  483 |     }
  484 | 
  485 |     // Every supported view is exercised on the populated authenticated queue.
  486 |     for (const [label, selector] of [["Cards", "cards"], ["Kanban", "board"], ["Timeline", "timeline"], ["List", "list"]] as const) {
  487 |       await workspace.getByRole("button", { name: label, exact: true }).click();
  488 |       await expect(workspace.locator(selector === "board" ? ".task-board" : selector === "timeline" ? ".task-timeline" : selector === "cards" ? ".task-cards" : "nav.task-list")).toBeVisible();
  489 |       await expect(workspace.getByText(seededTitles[0]!, { exact: true })).toBeVisible();
  490 |       if (selector === "cards") {
  491 |         await ownerPage.screenshot({ path: testInfo.outputPath("tasks-desktop-cards.png"), fullPage: true });
  492 |         await ownerPage.screenshot({ path: testInfo.outputPath("tasks-desktop-cards-viewport.png"), fullPage: false });
  493 |       }
  494 |     }
  495 | 
  496 |     // Actual create form validation and full lifecycle, entered as the owning Designer.
  497 |     const designer = staff.designer;
  498 |     await designer.page.goto("/tasks");
  499 |     const designerWorkspace = designer.page.locator(".task-workspace");
  500 |     await expect(designerWorkspace.getByRole("heading", { name: "Tasks" })).toBeVisible();
  501 |     await designerWorkspace.getByRole("button", { name: "Create task", exact: true }).first().click();
  502 |     const create = designerWorkspace.getByRole("form", { name: "Create task" });
  503 |     await create.getByLabel("Reason").fill("Validate required task name before creating");
  504 |     await create.getByRole("button", { name: "Create task" }).click();
  505 |     await expect(create.getByLabel("Task name")).toBeFocused();
  506 |     const lifecycleTitle = `MW-I02 zz lifecycle ${runSuffix} ${randomUUID().slice(0, 8)}`;
  507 |     await create.getByLabel("Task name").fill(lifecycleTitle);
  508 |     await create.getByLabel("Target date").fill("2026-12-15");
  509 |     await create.getByLabel("Reason").fill("Create a task through the real task form");
  510 |     await create.getByRole("button", { name: "Create task" }).click();
  511 |     await expect(designerWorkspace.getByText("Task created.", { exact: true })).toBeVisible();
  512 |     await expect(designerWorkspace.getByRole("button", { name: new RegExp(lifecycleTitle) })).toBeVisible();
  513 |     await designerWorkspace.getByRole("button", { name: new RegExp(lifecycleTitle) }).click();
  514 |     await expect(designerWorkspace.getByRole("heading", { name: lifecycleTitle })).toBeVisible();
  515 |     await designerWorkspace.getByLabel("Reason for change").fill("Begin verified task lifecycle");
  516 |     await designerWorkspace.getByRole("button", { name: "Start task" }).click();
  517 |     await expect(designerWorkspace.locator(".task-detail .task-state")).toHaveText("In progress");
  518 |     const waiting = designerWorkspace.getByRole("form", { name: "Wait on task" });
  519 |     await waiting.getByLabel("Reason for waiting").fill("Waiting for a supplier response");
  520 |     await waiting.getByLabel("Delay cause").fill("Supplier response is pending");
  521 |     await waiting.getByRole("button", { name: "Move to waiting" }).click();
  522 |     await expect(designerWorkspace.locator(".task-detail .task-state")).toHaveText("Waiting");
  523 |     await designer.page.reload();
  524 |     await expect(designerWorkspace.locator(".task-detail .task-state")).toHaveText("Waiting");
  525 |     await designerWorkspace.getByLabel("Reason for resuming").fill("Supplier response arrived");
  526 |     await designerWorkspace.getByRole("button", { name: "Resume task" }).click();
  527 |     await expect(designerWorkspace.locator(".task-detail .task-state")).toHaveText("In progress");
  528 |     await designerWorkspace.getByRole("button", { name: "Edit task" }).click();
  529 |     await designerWorkspace.getByLabel("Task name").last().fill(`${lifecycleTitle} revised`);
  530 |     await designerWorkspace.getByLabel("Edit reason").fill("Correct the task title through edit form");
  531 |     await designerWorkspace.getByRole("button", { name: "Save task" }).click();
  532 |     await expect(designerWorkspace.getByRole("heading", { name: `${lifecycleTitle} revised` })).toBeVisible();
  533 |     await designerWorkspace.getByLabel("Reason for change").fill("Finish the verified task");
  534 |     await designerWorkspace.getByRole("button", { name: "Complete task" }).click();
  535 |     await expect(designerWorkspace.locator(".task-detail .task-state")).toHaveText("Completed");
  536 | 
  537 |     // Owner Tasks pagination, filters, search, selection and browser-back URL state.
  538 |     await filtersDisclosure.click();
  539 |     await search.fill(queueSearch);
  540 |     await workspace.getByRole("button", { name: "Apply filters" }).click();
  541 |     await expect(workspace.locator(".task-queue-row")).toHaveCount(50);
  542 |     await workspace.getByRole("button", { name: "Next", exact: true }).click();
  543 |     await expect(workspace.getByText(seededTitles[50]!, { exact: true })).toBeVisible();
  544 |     await expect(workspace.getByText(seededTitles[51]!, { exact: true })).toBeVisible();
  545 |     await workspace.getByRole("button", { name: "Previous", exact: true }).click();
  546 |     await expect(workspace.getByText(seededTitles[0]!, { exact: true })).toBeVisible();
  547 |     await search.fill(seededTitles[4]!);
  548 |     await workspace.getByRole("button", { name: "Apply filters" }).click();
  549 |     await expect(workspace.getByText(seededTitles[4]!, { exact: true })).toBeVisible();
  550 |     await expect(workspace.getByText(seededTitles[3]!, { exact: true })).toHaveCount(0);
  551 |     await workspace.getByRole("button", { name: new RegExp(seededTitles[4]!) }).click();
  552 |     await expect(workspace.getByRole("heading", { name: seededTitles[4]! })).toBeVisible();
  553 |     await expect(workspace.locator(".task-facts")).toContainText("2026-11-05");
  554 |     await expect(workspace.locator(".task-facts")).toContainText(personaEmails.designer);
  555 |     await ownerPage.screenshot({ path: testInfo.outputPath("tasks-detail-desktop.png"), fullPage: true });
  556 |     await workspace.getByRole("button", { name: "Back to task list" }).click();
  557 |     await expect(workspace.getByText(seededTitles[4]!, { exact: true })).toBeVisible();
  558 |     await workspace.getByRole("button", { name: new RegExp(seededTitles[4]!) }).click();
  559 |     await expect(workspace.getByRole("heading", { name: seededTitles[4]! })).toBeVisible();
  560 |     await ownerPage.goBack();
  561 |     await expect(ownerPage).toHaveURL(/\/tasks(?:\?.*)?$/);
  562 |     expect(new URL(ownerPage.url()).searchParams.has("taskId")).toBe(false);
  563 |     await expect(workspace.getByText(seededTitles[4]!, { exact: true })).toBeVisible();
  564 |     await workspace.getByRole("button", { name: "Reset filters" }).click();
  565 |     await workspace.getByLabel("Search tasks").fill(seededTitles[51]!);
  566 |     await workspace.getByRole("button", { name: "Apply filters" }).click();
  567 |     const committedRow = workspace.locator(".task-queue-row").filter({ hasText: seededTitles[51]! });
  568 |     await expect(committedRow).toContainText("2026-11-30");
  569 |     await committedRow.click();
  570 |     await expect(workspace.locator(".task-facts")).toContainText("2026-11-30");
  571 |     await workspace.getByRole("button", { name: "Reset filters" }).click();
  572 |     await workspace.getByLabel("Filter by status").selectOption("NOT_STARTED");
  573 |     await workspace.getByLabel("Filter by primary owner").selectOption(staff.designer.employeeId);
  574 |     await workspace.getByLabel("Filter date basis").selectOption("target");
  575 |     await workspace.getByLabel("Filter date from").fill("2026-11-05");
  576 |     await workspace.getByLabel("Filter date through").fill("2026-11-10");
  577 |     await workspace.getByRole("button", { name: "Apply filters" }).click();
  578 |     await expect(workspace.getByText(seededTitles[4]!, { exact: true })).toBeVisible();
  579 |     await expect(workspace.getByText(seededTitles[3]!, { exact: true })).toHaveCount(0);
  580 |     await workspace.getByRole("button", { name: "Reset filters" }).click();
```
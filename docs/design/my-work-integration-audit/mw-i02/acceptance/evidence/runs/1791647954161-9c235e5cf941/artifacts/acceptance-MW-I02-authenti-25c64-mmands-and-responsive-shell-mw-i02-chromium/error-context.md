# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: acceptance.spec.ts >> MW-I02 authenticated task acceptance: real identities, populated views, commands, and responsive shell
- Location: .env.checkpoint-tools\mw-i02-acceptance\acceptance.spec.ts:253:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('status').filter({ hasText: 'Showing 2 active personal tasks' })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('status').filter({ hasText: 'Showing 2 active personal tasks' }) with timeout 15000ms
  - waiting for getByRole('status').filter({ hasText: 'Showing 2 active personal tasks' })

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
  - text: My Work mw-i02-designer@example.test
  - region "My work":
    - paragraph: Work management
    - heading "My work" [level=2]
    - button "Create task"
    - group: Open decisions · action queue
    - region "Work needing attention":
      - group:
        - group:
          - text: Reviews
          - strong: 0 items
        - group:
          - text: Corrections
          - strong: 0 items
        - group:
          - text: Management
          - strong: 0 items
        - group: Client reviews Project context
    - region "Personal task phases":
      - article:
        - 'button "Active personal tasks: 2" [pressed]':
          - text: Active
          - strong: "2"
      - article:
        - 'button "Waiting personal tasks: 1"':
          - text: Waiting
          - strong: "1"
      - article:
        - 'button "Personal tasks in review phase: 1"':
          - text: Review phase
          - strong: "1"
      - article:
        - 'button "Completed personal tasks: 1"':
          - text: Completed
          - strong: "1"
      - status:
        - text: Active · 2 personal tasks
        - button "Clear phase selection": Clear
      - group: About task counts
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
      - group: Filters & sort · 1 applied
      - button "Apply filters"
      - button "Reset filters"
    - text: Showing 1–2 of 2 filtered tasks
    - button "Previous" [disabled]
    - button "Next" [disabled]
    - navigation "My tasks":
      - heading "My tasks 2" [level=3]
      - 'button "Open task: Confirm bathroom tile measurements 5e5cf941"':
        - strong: Confirm bathroom tile measurements 5e5cf941
        - text: No project
        - strong: mw-i02-designer@example.test
        - strong: MEDIUM
        - text: Waiting
        - strong: 2026-11-18
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: MEDIUM. Status: Waiting. Target date: 2026-11-18. Committed date: Not committed."
      - 'button "Open task: MW-I02 0000 corrections 5e5cf941"':
        - strong: MW-I02 0000 corrections 5e5cf941
        - text: MW-I02 review 5e5cf941
        - strong: mw-i02-designer@example.test
        - strong: HIGH
        - text: Corrections required
        - strong: 2026-12-28
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Corrections required. Target date: 2026-12-28. Committed date: Not committed."
- contentinfo: Sense Studios · Secure workspace
```

# Test source

```ts
  604 |     await designerWorkspace.getByRole("button", { name: "Start task" }).click();
  605 |     await expect(designerWorkspace.locator(".task-detail .task-state")).toHaveText("In progress");
  606 |     const waiting = designerWorkspace.getByRole("form", { name: "Wait on task" });
  607 |     await waiting.getByLabel("Reason for waiting").fill("Waiting for a supplier response");
  608 |     await waiting.getByLabel("Delay cause").fill("Supplier response is pending");
  609 |     await waiting.getByRole("button", { name: "Move to waiting" }).click();
  610 |     await expect(designerWorkspace.locator(".task-detail .task-state")).toHaveText("Waiting");
  611 |     await designer.page.reload();
  612 |     await expect(designerWorkspace.locator(".task-detail .task-state")).toHaveText("Waiting");
  613 |     await designerWorkspace.getByLabel("Reason for resuming").fill("Supplier response arrived");
  614 |     await designerWorkspace.getByRole("button", { name: "Resume task" }).click();
  615 |     await expect(designerWorkspace.locator(".task-detail .task-state")).toHaveText("In progress");
  616 |     await designerWorkspace.getByRole("button", { name: "Edit task" }).click();
  617 |     await designerWorkspace.getByLabel("Task name").last().fill(`${lifecycleTitle} revised`);
  618 |     await designerWorkspace.getByLabel("Edit reason").fill("Correct the task title through edit form");
  619 |     await designerWorkspace.getByRole("button", { name: "Save task" }).click();
  620 |     await expect(designerWorkspace.getByRole("heading", { name: `${lifecycleTitle} revised` })).toBeVisible();
  621 |     await designerWorkspace.getByLabel("Reason for change").fill("Finish the verified task");
  622 |     await designerWorkspace.getByRole("button", { name: "Complete task" }).click();
  623 |     await expect(designerWorkspace.locator(".task-detail .task-state")).toHaveText("Completed");
  624 | 
  625 |     // Owner Tasks pagination, filters, search, selection and browser-back URL state.
  626 |     await setFilterDisclosure(filtersDisclosure, true);
  627 |     await search.fill(queueSearch);
  628 |     await workspace.getByRole("button", { name: "Apply filters" }).click();
  629 |     await expect(workspace.locator(".task-queue-row")).toHaveCount(50);
  630 |     await workspace.getByRole("button", { name: "Next", exact: true }).click();
  631 |     await expect(workspace.getByText(seededTitles[50]!, { exact: true })).toBeVisible();
  632 |     await expect(workspace.getByText(seededTitles[51]!, { exact: true })).toBeVisible();
  633 |     await workspace.getByRole("button", { name: "Previous", exact: true }).click();
  634 |     await expect(workspace.getByText(seededTitles[0]!, { exact: true })).toBeVisible();
  635 |     await search.fill(seededTitles[4]!);
  636 |     await workspace.getByRole("button", { name: "Apply filters" }).click();
  637 |     await expect(workspace.getByText(seededTitles[4]!, { exact: true })).toBeVisible();
  638 |     await expect(workspace.getByText(seededTitles[3]!, { exact: true })).toHaveCount(0);
  639 |     await workspace.getByRole("button", { name: new RegExp(seededTitles[4]!) }).click();
  640 |     await expect(workspace.getByRole("heading", { name: seededTitles[4]! })).toBeVisible();
  641 |     await expect(workspace.locator(".task-facts")).toContainText("2026-11-05");
  642 |     await expect(workspace.locator(".task-facts")).toContainText(personaEmails.leader);
  643 |     await ownerPage.screenshot({ path: testInfo.outputPath("tasks-detail-desktop.png"), fullPage: true });
  644 |     await workspace.getByRole("button", { name: "Back to task list" }).click();
  645 |     await expect(workspace.getByText(seededTitles[4]!, { exact: true })).toBeVisible();
  646 |     await workspace.getByRole("button", { name: new RegExp(seededTitles[4]!) }).click();
  647 |     await expect(workspace.getByRole("heading", { name: seededTitles[4]! })).toBeVisible();
  648 |     await ownerPage.goBack();
  649 |     await expect(ownerPage).toHaveURL(/\/tasks(?:\?.*)?$/);
  650 |     expect(new URL(ownerPage.url()).searchParams.has("taskId")).toBe(false);
  651 |     await expect(workspace.getByText(seededTitles[4]!, { exact: true })).toBeVisible();
  652 |     await workspace.getByRole("button", { name: "Reset filters" }).click();
  653 |     await workspace.getByLabel("Search tasks").fill(seededTitles[51]!);
  654 |     await workspace.getByRole("button", { name: "Apply filters" }).click();
  655 |     const committedRow = workspace.locator(".task-queue-row").filter({ hasText: seededTitles[51]! });
  656 |     await expect(committedRow).toContainText("2026-11-30");
  657 |     await committedRow.click();
  658 |     await expect(workspace.locator(".task-facts")).toContainText("2026-11-30");
  659 |     await workspace.getByRole("button", { name: "Reset filters" }).click();
  660 |     await workspace.getByLabel("Filter by status").selectOption("NOT_STARTED");
  661 |     await workspace.getByLabel("Filter by primary owner").selectOption(staff.leader.employeeId);
  662 |     await workspace.getByLabel("Filter date basis").selectOption("target");
  663 |     await workspace.getByLabel("Filter date from").fill("2026-11-05");
  664 |     await workspace.getByLabel("Filter date through").fill("2026-11-10");
  665 |     await workspace.getByRole("button", { name: "Apply filters" }).click();
  666 |     await expect(workspace.getByText(seededTitles[4]!, { exact: true })).toBeVisible();
  667 |     await expect(workspace.getByText(seededTitles[3]!, { exact: true })).toHaveCount(0);
  668 |     await workspace.getByRole("button", { name: "Reset filters" }).click();
  669 | 
  670 |     // Mobile widths use the actual app shell and exercise native compact scope/view controls.
  671 |     for (const width of [320, 390]) {
  672 |       await ownerPage.setViewportSize({ width, height: 844 });
  673 |       await ownerPage.goto("/tasks");
  674 |       await expect(workspace.getByRole("heading", { name: "Tasks", exact: true })).toBeVisible();
  675 |       const mobileFirstTask = workspace.locator("nav.task-list button").first();
  676 |       await expect(mobileFirstTask).toBeVisible();
  677 |       const overflow = await ownerPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  678 |       expect(overflow, `horizontal overflow at ${width}px`).toBe(false);
  679 |       await ownerPage.screenshot({ path: testInfo.outputPath(`tasks-mobile-${width}-list.png`), fullPage: true });
  680 |       await ownerPage.screenshot({ path: testInfo.outputPath(`tasks-mobile-${width}-list-viewport.png`), fullPage: false });
  681 |       await mobileFirstTask.scrollIntoViewIfNeeded();
  682 |       await ownerPage.screenshot({ path: testInfo.outputPath(`tasks-mobile-${width}-queue-viewport.png`), fullPage: false });
  683 |       await workspace.getByLabel("Task display mode").selectOption("cards");
  684 |       await expect(workspace.locator(".task-card-choice").first()).toBeVisible();
  685 |       await ownerPage.screenshot({ path: testInfo.outputPath(`tasks-mobile-${width}.png`), fullPage: true });
  686 |       await ownerPage.screenshot({ path: testInfo.outputPath(`tasks-mobile-${width}-cards-viewport.png`), fullPage: false });
  687 |       await workspace.getByLabel("Task display mode").selectOption("list");
  688 |       await workspace.locator("nav.task-list button").first().tap();
  689 |       await expect(workspace.locator(".task-detail h3")).toBeVisible();
  690 |       await ownerPage.screenshot({ path: testInfo.outputPath(`tasks-mobile-${width}-detail.png`), fullPage: true });
  691 |     }
  692 |     await ownerPage.setViewportSize({ width: 1440, height: 1000 });
  693 | 
  694 |     // The employee receives assigned work, while the Site Employee has no visibility into another person’s task.
  695 |     await designer.page.goto("/my-work");
  696 |     await expect(designer.page.getByRole("heading", { name: "My work" })).toBeVisible();
  697 |     await expect(designer.page.locator(".task-workspace nav.task-list button").first()).toBeVisible();
  698 |     await designer.page.setViewportSize({ width: 1440, height: 1000 });
  699 |     await designer.page.screenshot({ path: testInfo.outputPath("my-work-designer-initial-1440.png"), fullPage: false });
  700 |     const activeCount = await api<{ total: number }>(designer.page, "/api/v1/tasks?scope=personal&phase=active&offset=0&limit=1", "GET");
  701 |     const activeTile = designer.page.getByRole("button", { name: `Active personal tasks: ${activeCount.total}`, exact: true });
  702 |     await expect(activeTile).toBeVisible();
  703 |     await activeTile.click();
> 704 |     await expect(designer.page.getByRole("status").filter({ hasText: `Showing ${activeCount.total} active personal tasks` })).toBeVisible();
      |                                                                                                                               ^ Error: expect(locator).toBeVisible() failed
  705 |     await expect(designer.page).toHaveURL(/workPhase=active/);
  706 |     await designer.page.screenshot({ path: testInfo.outputPath("my-work-designer-active-selected-1440.png"), fullPage: false });
  707 |     const activePage = await api<{ items: Array<{ title: string }>; total: number }>(designer.page, "/api/v1/tasks?scope=personal&phase=active&offset=0&limit=50", "GET");
  708 |     expect(activePage.total).toBe(activeCount.total);
  709 |     for (const task of activePage.items) await expect(designer.page.getByRole("button", { name: `Open task: ${task.title}`, exact: true })).toBeVisible();
  710 |     if (activeCount.total > 50) {
  711 |       await expect(designer.page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
  712 |       await designer.page.getByRole("button", { name: "Next", exact: true }).click();
  713 |       await expect(designer.page.locator(".task-queue-row")).toHaveCount(activeCount.total - 50);
  714 |       await designer.page.getByRole("button", { name: "Previous", exact: true }).click();
  715 |     }
  716 |     await activeTile.click();
  717 |     await expect(designer.page).not.toHaveURL(/workPhase=/);
  718 |     const waitingCount = await api<{ total: number }>(designer.page, "/api/v1/tasks?scope=personal&phase=waiting&offset=0&limit=1", "GET");
  719 |     const waitingTile = designer.page.getByRole("button", { name: `Waiting personal tasks: ${waitingCount.total}`, exact: true });
  720 |     await expect(waitingTile).toBeVisible();
  721 |     await waitingTile.click();
  722 |     await expect(designer.page.getByRole("status").filter({ hasText: `Showing ${waitingCount.total} waiting personal tasks` })).toBeVisible();
  723 |     await expect(designer.page.getByRole("button", { name: new RegExp(`Open task: ${waitingTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) })).toBeVisible();
  724 |     await designer.page.screenshot({ path: testInfo.outputPath("my-work-designer-waiting-selected-1440.png"), fullPage: false });
  725 |     await designer.page.getByRole("status").getByRole("button", { name: "Clear phase selection" }).click();
  726 |     await expect(designer.page).not.toHaveURL(/workPhase=/);
  727 |     for (const width of [1024, 390, 320]) {
  728 |       await designer.page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
  729 |       await expect(designer.page.locator(".task-workspace nav.task-list button").first()).toBeVisible();
  730 |       await designer.page.screenshot({ path: testInfo.outputPath(`my-work-designer-cleared-${width}.png`), fullPage: false });
  731 |     }
  732 |     await designer.page.setViewportSize({ width: 1440, height: 1000 });
  733 |     const privateTask = await api<{ id: string }>(ownerPage, "/api/v1/tasks", "POST", {
  734 |       title: `MW-I02 designer private ${randomUUID().slice(0, 8)}`, type: "NON_PROJECT", priority: "HIGH",
  735 |       targetDate: "2026-12-20", ownerEmployeeId: staff.designer.employeeId, reason: why
  736 |     }, csrf);
  737 |     const outsiderRead = await staff.employee.page.request.get(`/api/v1/tasks/${privateTask.id}`);
  738 |     expect(outsiderRead.status()).toBe(403);
  739 |     const outsiderWrite = await staff.employee.page.request.post(`/api/v1/tasks/${privateTask.id}/state`, {
  740 |       headers: { Origin: baseURL, "X-CSRF-Token": await getCsrf(staff.employee.page) },
  741 |       data: { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Attempt unauthorized task change" }
  742 |     });
  743 |     expect(outsiderWrite.status()).toBe(403);
  744 |     const malformed = await ownerPage.request.get("/api/v1/tasks/not-a-uuid");
  745 |     expect(malformed.status()).toBe(400);
  746 | 
  747 |     // Manager assignment rights are explicit employee overrides; unrelated staff has no task.assign.
  748 |     const managerTask = await api<{ id: string; version: number; title: string }>(ownerPage, "/api/v1/tasks", "POST", {
  749 |       title: `MW-I02 manager scope ${randomUUID().slice(0, 8)}`, type: "NON_PROJECT", priority: "MEDIUM",
  750 |       targetDate: "2026-12-21", ownerEmployeeId: staff.designer.employeeId, reason: why
  751 |     }, csrf);
  752 |     const leaderCsrf = await getCsrf(staff.leader.page);
  753 |     const assignment = await staff.leader.page.request.post(`/api/v1/tasks/${managerTask.id}/reassign`, {
  754 |       headers: { Origin: baseURL, "X-CSRF-Token": leaderCsrf },
  755 |       data: { newOwnerEmployeeId: staff.employee.employeeId, expectedVersion: managerTask.version, reason: "Assign within explicitly granted team scope" }
  756 |     });
  757 |     expect(assignment.status()).toBe(201);
  758 |     const reassignedTask = await assignment.json() as { version: number };
  759 |     const leaderStateChange = await staff.leader.page.request.post(`/api/v1/tasks/${managerTask.id}/state`, {
  760 |       headers: { Origin: baseURL, "X-CSRF-Token": await getCsrf(staff.leader.page) },
  761 |       data: { toState: "IN_PROGRESS", expectedVersion: reassignedTask.version, reason: "Attempt progress change as assignment-only manager" }
  762 |     });
  763 |     expect(leaderStateChange.status()).toBe(403);
  764 |     await staff.leader.page.goto("/tasks?scope=all");
  765 |     await expect(staff.leader.page.getByRole("heading", { name: "Tasks", exact: true })).toBeVisible();
  766 |     await staff.leader.page.screenshot({ path: testInfo.outputPath("tasks-team-leader-tasks.png"), fullPage: true });
  767 |     await staff.employee.page.goto("/my-work");
  768 |     await expect(staff.employee.page.getByRole("heading", { name: "My work" })).toBeVisible();
  769 |     await expect(staff.employee.page.getByText(managerTask.title, { exact: true })).toBeVisible();
  770 |     await staff.employee.page.setViewportSize({ width: 1440, height: 1000 });
  771 |     await staff.employee.page.screenshot({ path: testInfo.outputPath("my-work-site-employee-1440.png"), fullPage: false });
  772 |     await staff.leader.page.goto("/my-work");
  773 |     await expect(staff.leader.page.getByRole("heading", { name: "My work" })).toBeVisible();
  774 |     await staff.leader.page.setViewportSize({ width: 1440, height: 1000 });
  775 |     await staff.leader.page.screenshot({ path: testInfo.outputPath("my-work-team-leader-1440.png"), fullPage: false });
  776 |     await ownerPage.goto("/my-work");
  777 |     await expect(ownerPage.getByText(/no active employee identity/i)).toBeVisible();
  778 |     await ownerPage.setViewportSize({ width: 1440, height: 1000 });
  779 |     await ownerPage.screenshot({ path: testInfo.outputPath("my-work-owner-no-employee-1440.png"), fullPage: false });
  780 |     const staleTarget = await api<{ id: string; version: number }>(ownerPage, "/api/v1/tasks", "POST", {
  781 |       title: `MW-I02 stale version ${randomUUID().slice(0, 8)}`, type: "NON_PROJECT", priority: "LOW",
  782 |       targetDate: "2026-12-22", ownerEmployeeId: staff.designer.employeeId, reason: why
  783 |     }, csrf);
  784 |     const designerCsrfAgain = await getCsrf(staff.designer.page);
  785 |     const currentChange = await staff.designer.page.request.post(`/api/v1/tasks/${staleTarget.id}/state`, {
  786 |       headers: { Origin: baseURL, "X-CSRF-Token": designerCsrfAgain },
  787 |       data: { toState: "IN_PROGRESS", expectedVersion: staleTarget.version, reason: "Advance task before stale request" }
  788 |     });
  789 |     expect(currentChange.status()).toBe(201);
  790 |     const stale = await staff.designer.page.request.post(`/api/v1/tasks/${staleTarget.id}/state`, {
  791 |       headers: { Origin: baseURL, "X-CSRF-Token": await getCsrf(staff.designer.page) },
  792 |       data: { toState: "COMPLETED", expectedVersion: staleTarget.version, reason: "Attempt stale task transition" }
  793 |     });
  794 |     expect(stale.status()).toBe(409);
  795 | 
  796 |     // Keyboard focus remains visible on the real queue controls.
  797 |     await ownerPage.goto("/tasks");
  798 |     const keyboardTask = ownerPage.locator(".task-workspace nav.task-list button").first();
  799 |     let taskReachedByKeyboard = false;
  800 |     for (let index = 0; index < 80; index += 1) {
  801 |       await ownerPage.keyboard.press("Tab");
  802 |       if (await keyboardTask.evaluate(element => element === document.activeElement)) {
  803 |         taskReachedByKeyboard = true;
  804 |         break;
```
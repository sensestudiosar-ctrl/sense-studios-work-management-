# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: acceptance.spec.ts >> MW-I02 authenticated task acceptance: real identities, populated views, commands, and responsive shell
- Location: .env.checkpoint-tools\mw-i02-acceptance\acceptance.spec.ts:201:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('Filter by status')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByLabel('Filter by status') with timeout 15000ms
  - waiting for getByLabel('Filter by status')
    - locator resolved to <select aria-label="Filter by status">…</select>
    - unexpected value "hidden"

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
- navigation "Main workspace destinations":
  - link "Dashboard":
    - /url: /dashboard
  - link "My Work":
    - /url: /my-work
  - link "Tasks":
    - /url: /tasks
  - link "Project documents":
    - /url: /documents
- button "More"
- main:
  - text: Dashboard mw-i02-designer@example.test
  - region "Dashboard":
    - text: WORKSPACE OVERVIEW
    - heading "Dashboard" [level=2]
    - paragraph: A current view of decisions, tasks and project updates available to your account.
    - button "Refresh"
    - navigation "Dashboard sections":
      - button "Overview" [pressed]
      - button "Scheduled summaries"
      - button "Reports"
      - button "Reminders & schedules"
    - text: Organization date
    - strong: 2026-10-10
    - text: Account type
    - strong: Staff account
    - article:
      - heading "Decision center" [level=3]
      - paragraph: Read at 10/10/2026, 8:09:19 PM
      - paragraph: No current decisions.
    - article:
      - heading "Needs your attention" [level=3]
      - paragraph: Read at 10/10/2026, 8:09:19 PM
      - paragraph: No current items.
    - article:
      - heading "Today and due work" [level=3]
      - paragraph: Read at 10/10/2026, 8:09:19 PM
      - paragraph: No current items.
    - article:
      - heading "Priority work" [level=3]
      - paragraph: Read at 10/10/2026, 8:09:19 PM
      - list:
        - listitem:
          - strong: MW-I02 designer private 0957b623
          - text: NOT_STARTED · 2026-12-20 —
          - link "Open":
            - /url: /tasks?taskId=3647bbaa-a002-4548-8ad4-8ca54aa87d5f
        - listitem:
          - strong: MW-I02 0000 corrections c6cd5d12
          - text: CORRECTIONS_REQUIRED · 2026-12-28 —
          - link "Open":
            - /url: /tasks?taskId=f9c4f2b7-4258-4288-8394-3cfdddb7de1f
    - article:
      - heading "Reviews and corrections" [level=3]
      - paragraph: Read at 10/10/2026, 8:09:19 PM
      - list:
        - listitem:
          - strong: MW-I02 0000 corrections c6cd5d12
          - text: CORRECTIONS_REQUIRED · 2026-12-28 —
          - link "Open":
            - /url: /tasks?taskId=f9c4f2b7-4258-4288-8394-3cfdddb7de1f
    - article:
      - heading "Waiting and blockers" [level=3]
      - paragraph: Read at 10/10/2026, 8:09:19 PM
      - list:
        - listitem:
          - strong: Confirm bathroom tile measurements c6cd5d12
          - text: WAITING · 2026-11-18 —
          - link "Open":
            - /url: /tasks?taskId=d38541ff-01b4-438c-b81d-01e15c1e568b
    - article:
      - heading "Project health and risks" [level=3]
      - paragraph: Read at 10/10/2026, 8:09:19 PM
      - list:
        - listitem:
          - strong: MW-I02 review c6cd5d12
          - text: UNAVAILABLE Policy/evidence required
          - link "Open":
            - /url: /performance?projectId=8f1340b2-8085-43fe-be00-fce3eb4317f2
    - article:
      - heading "Employee and Team Leader performance" [level=3]
      - paragraph: Read at 10/10/2026, 8:09:19 PM
      - paragraph: No current items.
    - article:
      - heading "Workload and leave" [level=3]
      - paragraph: Read at 10/10/2026, 8:09:19 PM
      - list:
        - listitem:
          - strong: mw-i02-designer@example.test
          - text: SETUP_REQUIRED 0
          - link "Open":
            - /url: /workforce
    - article:
      - heading "Project site" [level=3]
      - paragraph: Read at 10/10/2026, 8:09:19 PM
      - paragraph: No current items.
    - article:
      - heading "Training and improvement" [level=3]
      - paragraph: Read at 10/10/2026, 8:09:20 PM
      - paragraph: No current items.
- contentinfo: Sense Studios · Secure workspace
```

# Test source

```ts
  764 |     expect(focusStyle.outlineStyle).toBe("solid");
  765 |     await ownerPage.keyboard.press("Enter");
  766 |     await expect(ownerPage.locator(".task-detail h3")).toBeVisible();
  767 | 
  768 |     // Prototype-matched authenticated My Work captures. These are actual
  769 |     // application views; only the separately named failure state below is simulated.
  770 |     const referenceWidths = [1440, 1024, 390, 320] as const;
  771 |     const capturePersona = async (page: Page, persona: string): Promise<void> => {
  772 |       await page.goto("/my-work");
  773 |       await expect(page.getByRole("heading", { name: "My work" })).toBeVisible();
  774 |       const totals = await api<{ total: number }>(page, "/api/v1/tasks?scope=personal&offset=0&limit=1", "GET");
  775 |       if (totals.total > 0) await expect(page.locator(".task-queue-row").first()).toBeVisible();
  776 |       else await expect(page.locator(persona === "owner" ? ".task-owner-empty" : ".task-empty")).toBeVisible();
  777 |       for (const width of referenceWidths) await captureMyWorkReferencePair(page, testInfo, persona, "initial", width, { actualPersonalTaskTotal: totals.total, evidence: "authenticated application backed by the run database" });
  778 |     };
  779 |     await capturePersona(staff.leader.page, "leader");
  780 |     await capturePersona(staff.employee.page, "site");
  781 | 
  782 |     // Turn five real, run-local task records into employee-exit reassignment
  783 |     // obligations through the ordinary Owner task and employee-exit workflows.
  784 |     // The two existing Site Employee queue fixtures are managerTask and the
  785 |     // populated-queue task; add three distinct rows so the expected total is exact.
  786 |     const exitTaskTitles = [1, 2, 3].map(index => `MW-I02 exit reassignment ${runSuffix} ${index}`);
  787 |     for (const title of exitTaskTitles) {
  788 |       if (!(await existingTask(ownerPage, title))) await api(ownerPage, "/api/v1/tasks", "POST", {
  789 |         title, type: "NON_PROJECT", priority: "MEDIUM", targetDate: "2026-12-30",
  790 |         ownerEmployeeId: staff.employee.employeeId, reason: "Create a bounded synthetic employee-exit acceptance task"
  791 |       }, csrf);
  792 |     }
  793 |     const employeeWorkBeforeExit = await api<{ total: number; items: Array<{ id: string; title: string; status: string }> }>(ownerPage,
  794 |       `/api/v1/tasks?scope=all&ownerEmployeeId=${encodeURIComponent(staff.employee.employeeId)}&phase=active&offset=0&limit=50`, "GET");
  795 |     expect(employeeWorkBeforeExit.total, "the exact five active Site Employee tasks are established before exit").toBe(5);
  796 |     const exit = await ownerPage.request.post(`/api/v1/org/employees/${encodeURIComponent(staff.employee.employeeId)}/exit`, {
  797 |       headers: { Origin: baseURL, "X-CSRF-Token": csrf },
  798 |       data: { reason: "Finalize the synthetic Site Employee exit for MW-I02 acceptance" }
  799 |     });
  800 |     expect(exit.status(), "the supported Owner employee-exit workflow succeeds").toBe(201);
  801 |     const ownerReassignments = await api<{ total: number; items: Array<{ id: string; title: string; reason: string }> }>(ownerPage,
  802 |       "/api/v1/tasks/attention?kind=reassignment&offset=0&limit=50", "GET");
  803 |     expect(ownerReassignments.total).toBe(5);
  804 |     expect(ownerReassignments.items).toHaveLength(5);
  805 |     for (const title of [...exitTaskTitles, managerTask.title, siteEmployeeVisibleTitle]) {
  806 |       expect(ownerReassignments.items.some(item => item.title === title), `Owner receives the genuine exit hold for ${title}`).toBe(true);
  807 |     }
  808 | 
  809 |     const designerPage = staff.designer.page;
  810 |     const designerReassignments = await api<{ total: number; items: Array<{ id: string; title: string }> }>(designerPage,
  811 |       "/api/v1/tasks/attention?kind=reassignment&offset=0&limit=50", "GET");
  812 |     expect(designerReassignments.total, "an unauthorized Designer cannot enumerate Owner reassignments").toBe(0);
  813 |     expect(designerReassignments.items.some(item => ownerReassignments.items.some(ownerItem => ownerItem.id === item.id))).toBe(false);
  814 | 
  815 |     await capturePersona(ownerPage, "owner");
  816 |     const managementDisclosure = ownerPage.locator(".my-work-attention__disclosure").filter({ hasText: "Management: employee-exit reassignment" });
  817 |     await expect.poll(() => managementDisclosure.evaluate(element => (element as HTMLDetailsElement).open)).toBe(true);
  818 |     await expect(managementDisclosure.locator("ul > li")).toHaveCount(5);
  819 |     for (const item of ownerReassignments.items) {
  820 |       const itemLink = managementDisclosure.locator(`a[href*="taskId=${encodeURIComponent(item.id)}"]`);
  821 |       await expect(itemLink).toBeVisible();
  822 |       await itemLink.click();
  823 |       await expect(ownerPage).toHaveURL(new RegExp(`/tasks\\?taskId=${item.id}`));
  824 |       await expect(ownerPage.getByRole("heading", { name: item.title, exact: true })).toBeVisible();
  825 |       await ownerPage.goto("/my-work");
  826 |       await expect(ownerPage.getByRole("heading", { name: "My work" })).toBeVisible();
  827 |     }
  828 | 
  829 |     await designerPage.goto("/my-work");
  830 |     await expect(designerPage.getByRole("heading", { name: "My work" })).toBeVisible();
  831 |     const baseTotals = await api<{ total: number }>(designerPage, "/api/v1/tasks?scope=personal&offset=0&limit=1", "GET");
  832 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "initial", width, { actualPersonalTaskTotal: baseTotals.total, evidence: "authenticated application backed by the run database" });
  833 | 
  834 |     await designerPage.goto("/my-work");
  835 |     const waitingTotals = await api<{ total: number }>(designerPage, "/api/v1/tasks?scope=personal&phase=waiting&offset=0&limit=1", "GET");
  836 |     expect(waitingTotals.total, "the authenticated journey created an actual waiting personal task").toBeGreaterThan(0);
  837 |     const waitingWidget = designerPage.getByRole("button", { name: `Waiting personal tasks: ${waitingTotals.total}`, exact: true });
  838 |     await expect(waitingWidget).toBeVisible();
  839 |     await waitingWidget.click();
  840 |     await expect(designerPage.getByRole("status").filter({ hasText: `Showing ${waitingTotals.total} waiting personal tasks` })).toBeVisible();
  841 |     await expect(designerPage.getByRole("button", { name: new RegExp(`Open task: ${waitingTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) })).toBeVisible();
  842 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "waiting-selected", width, { actualWaitingTotal: waitingTotals.total, evidence: "authenticated application backed by the run database" });
  843 | 
  844 |     // Exercise search, filters, touch targets and mobile action clearance at
  845 |     // both requested phone widths without committing a task-state change.
  846 |     for (const width of [390, 320]) {
  847 |       await designerPage.setViewportSize({ width, height: 844 });
  848 |       await designerPage.goto("/my-work");
  849 |       const mobileSearch = designerPage.getByRole("textbox", { name: "Search tasks" });
  850 |       await mobileSearch.scrollIntoViewIfNeeded();
  851 |       await expect(mobileSearch).toBeVisible();
  852 |       await mobileSearch.tap();
  853 |       await mobileSearch.fill(waitingTitle);
  854 |       await mobileSearch.press("Enter");
  855 |       const mobileQueue = designerPage.locator("nav.task-list");
  856 |       const waitingTask = mobileQueue.getByRole("button", { name: new RegExp(`Open task: ${waitingTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) });
  857 |       await expect(waitingTask).toBeVisible();
  858 |       const filtersSummary = designerPage.locator("details.task-secondary-filters > summary");
  859 |       await filtersSummary.scrollIntoViewIfNeeded();
  860 |       const filtersBox = await filtersSummary.boundingBox();
  861 |       expect(filtersBox, `mobile filter disclosure has a hit target at ${width}px`).not.toBeNull();
  862 |       await designerPage.touchscreen.tap(filtersBox!.x + filtersBox!.width / 2, filtersBox!.y + filtersBox!.height / 2);
  863 |       const mobileStatus = designerPage.getByLabel("Filter by status");
> 864 |       await expect(mobileStatus).toBeVisible();
      |                                  ^ Error: expect(locator).toBeVisible() failed
  865 |       await mobileStatus.selectOption("WAITING");
  866 |       await designerPage.getByRole("button", { name: "Apply filters", exact: true }).tap();
  867 |       await expect(waitingTask).toBeVisible();
  868 |       await waitingTask.tap();
  869 |       const resumeForm = designerPage.getByRole("form", { name: "Resume task" });
  870 |       await expect(resumeForm).toBeVisible();
  871 |       await resumeForm.getByLabel("Reason for resuming").tap();
  872 |       await resumeForm.getByLabel("Reason for resuming").fill("Mobile acceptance only; do not submit");
  873 |       const resumeButton = resumeForm.getByRole("button", { name: "Resume task", exact: true });
  874 |       await resumeButton.scrollIntoViewIfNeeded();
  875 |       const [buttonBox, navBox] = await Promise.all([
  876 |         resumeButton.boundingBox(),
  877 |         designerPage.locator(".workspace-mobile-nav").boundingBox()
  878 |       ]);
  879 |       expect(buttonBox, `task action is laid out at ${width}px`).not.toBeNull();
  880 |       expect(navBox, `fixed navigation exists at ${width}px`).not.toBeNull();
  881 |       expect(buttonBox!.y + buttonBox!.height, `fixed navigation does not cover the task action at ${width}px`).toBeLessThan(navBox!.y);
  882 |       expect(await designerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `no horizontal overflow at ${width}px`).toBe(true);
  883 |     }
  884 | 
  885 |     await designerPage.goto("/my-work");
  886 |     const noMatch = `mw-i02-empty-${randomUUID()}`;
  887 |     const emptyResult = await api<{ total: number }>(designerPage, `/api/v1/tasks?scope=personal&offset=0&limit=1&q=${encodeURIComponent(noMatch)}`, "GET");
  888 |     expect(emptyResult.total, "the server confirms the unique search has no personal task match").toBe(0);
  889 |     const emptySearch = designerPage.getByRole("textbox", { name: "Search tasks" });
  890 |     await emptySearch.fill(noMatch);
  891 |     await designerPage.getByRole("button", { name: "Apply filters", exact: true }).click();
  892 |     await expect(designerPage.locator(".task-empty")).toContainText("No tasks are assigned to you");
  893 |     await expect(designerPage.getByText("0 filtered tasks", { exact: true })).toBeVisible();
  894 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "empty", width, { serverConfirmedZeroMatch: true, searchToken: noMatch, evidence: "actual authenticated route and zero-result API response" });
  895 | 
  896 |     // Focused supplemental source-state checks. Each intercepted response is
  897 |     // explicitly labeled as controlled; authenticated session endpoints and
  898 |     // all unhandled task sources remain live against the run database.
  899 |     const supplementalActivePath = "/api/v1/tasks";
  900 |     const supplementalActiveTotal = (await api<{ total: number }>(designerPage, `${supplementalActivePath}?scope=personal&phase=active&offset=0&limit=1`, "GET")).total;
  901 |     await designerPage.goto("/my-work");
  902 |     const supplementalActiveTile = designerPage.getByRole("button", { name: `Active personal tasks: ${supplementalActiveTotal}`, exact: true });
  903 |     await expect(supplementalActiveTile).toBeVisible();
  904 |     await expect(designerPage.locator(".task-queue-row").first()).toBeVisible();
  905 |     const supplementalActiveArticle = designerPage.locator(".my-work-phase-summary__grid .my-work-phase").first();
  906 |     const supplementalQueue = designerPage.locator(".task-workspace nav.task-list");
  907 |     const supplementalQueueBefore = await designerPage.locator(".task-queue-row").count();
  908 |     let releaseSupplementalLoading: (() => void) | undefined;
  909 |     let signalSupplementalRoute: (() => void) | undefined;
  910 |     const supplementalRouteReached = new Promise<void>(resolveRoute => { signalSupplementalRoute = resolveRoute; });
  911 |     const supplementalRouteRelease = new Promise<void>(resolveRelease => { releaseSupplementalLoading = resolveRelease; });
  912 |     const supplementalActiveMatcher = (url: URL): boolean => url.pathname === supplementalActivePath && url.searchParams.get("scope") === "personal" && url.searchParams.get("phase") === "active" && url.searchParams.get("limit") === "1";
  913 |     try {
  914 |       await designerPage.route(supplementalActiveMatcher, async route => {
  915 |         signalSupplementalRoute?.();
  916 |         await supplementalRouteRelease;
  917 |         await route.continue();
  918 |       });
  919 |       await designerPage.locator(".task-toolbar").getByRole("button", { name: "Refresh", exact: true }).click();
  920 |       await supplementalRouteReached;
  921 |       await expect(supplementalActiveArticle.locator("strong")).toContainText("Loading");
  922 |       await designerPage.screenshot({ path: testInfo.outputPath("my-work-designer-active-count-loading-controlled-supplemental.png"), fullPage: false });
  923 |       releaseSupplementalLoading?.();
  924 |       await expect(designerPage.getByRole("button", { name: `Active personal tasks: ${supplementalActiveTotal}`, exact: true })).toBeVisible();
  925 |       await designerPage.unroute(supplementalActiveMatcher);
  926 | 
  927 |       let supplementalFailureAttempt = 0;
  928 |       await designerPage.route(supplementalActiveMatcher, async route => {
  929 |         supplementalFailureAttempt += 1;
  930 |         await route.fulfill({
  931 |           status: supplementalFailureAttempt === 1 ? 503 : 403,
  932 |           contentType: "application/json",
  933 |           body: JSON.stringify({ message: supplementalFailureAttempt === 1 ? "Controlled MW-I02 phase count 503 simulation" : "Controlled MW-I02 phase count 403 simulation" })
  934 |         });
  935 |       });
  936 |       await designerPage.locator(".task-toolbar").getByRole("button", { name: "Refresh", exact: true }).click();
  937 |       const supplementalStaleTile = designerPage.getByRole("button", { name: `Active personal tasks: Stale count ${supplementalActiveTotal}`, exact: true });
  938 |       await expect(supplementalStaleTile).toBeVisible();
  939 |       await expect(supplementalActiveArticle.locator(".my-work-phase__source-error[role=status]")).toContainText("Controlled MW-I02 phase count 503 simulation");
  940 |       await expect(supplementalQueue).toBeVisible();
  941 |       await expect(designerPage.locator(".task-queue-row")).toHaveCount(supplementalQueueBefore);
  942 |       const supplementalWorkingOtherPhase = designerPage.getByRole("button", { name: /^Waiting personal tasks: \d+$/ });
  943 |       await expect(supplementalWorkingOtherPhase).toBeVisible();
  944 |       const supplementalFailureLabel = await designerPage.addStyleTag({ content: "body::before{content:'CONTROLLED PHASE COUNT RESPONSE — supplemental acceptance capture';position:fixed;z-index:999999;top:8px;left:8px;padding:8px 12px;background:#8b1e2d;color:#fff;font:700 13px/1.3 system-ui,sans-serif;border-radius:4px;box-shadow:0 2px 8px #0005}" });
  945 |       await designerPage.screenshot({ path: testInfo.outputPath("my-work-designer-active-count-stale-controlled-supplemental.png"), fullPage: false });
  946 |       await supplementalActiveArticle.getByRole("button", { name: "Retry active count", exact: true }).click();
  947 |       await expect(supplementalActiveArticle.locator(".my-work-phase__source-error[role=status]")).toHaveText("Not available to this account.");
  948 |       await expect(supplementalActiveArticle.getByRole("button", { name: /^Active personal tasks: Not available$/ })).toBeVisible();
  949 |       await expect(supplementalActiveArticle.locator("strong")).toContainText("Not available");
  950 |       await designerPage.screenshot({ path: testInfo.outputPath("my-work-designer-active-count-denied-controlled-supplemental.png"), fullPage: false });
  951 |       await designerPage.unroute(supplementalActiveMatcher);
  952 |       await designerPage.locator(".task-toolbar").getByRole("button", { name: "Refresh", exact: true }).click();
  953 |       await expect(designerPage.getByRole("button", { name: `Active personal tasks: ${supplementalActiveTotal}`, exact: true })).toBeVisible();
  954 |       await expect(supplementalActiveArticle.locator(".my-work-phase__source-error")).toHaveCount(0);
  955 |       await supplementalFailureLabel.evaluate(element => element.remove());
  956 |       const supplementalActualRetry = await api<{ total: number }>(designerPage, `${supplementalActivePath}?scope=personal&phase=active&offset=0&limit=1`, "GET");
  957 |       expect(supplementalActualRetry.total, "the recovered phase count matches the actual authenticated API source").toBe(supplementalActiveTotal);
  958 |       await expect(designerPage.locator(".task-queue-row")).toHaveCount(supplementalQueueBefore);
  959 |     } finally {
  960 |       releaseSupplementalLoading?.();
  961 |       await designerPage.unroute(supplementalActiveMatcher).catch(() => undefined);
  962 |       await designerPage.locator("head style").evaluateAll(styles => styles.filter(style => style.textContent?.includes("CONTROLLED PHASE COUNT RESPONSE")).forEach(style => style.remove()));
  963 |     }
  964 | 
```
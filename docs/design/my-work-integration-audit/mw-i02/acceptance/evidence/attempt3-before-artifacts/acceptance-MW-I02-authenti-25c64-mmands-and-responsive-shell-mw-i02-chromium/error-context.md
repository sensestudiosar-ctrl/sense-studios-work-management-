# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: acceptance.spec.ts >> MW-I02 authenticated task acceptance: real identities, populated views, commands, and responsive shell
- Location: .env.checkpoint-tools\mw-i02-acceptance\acceptance.spec.ts:175:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('alert')
Expected substring: "Tasks could not be loaded. Try again."
Error: strict mode violation: getByRole('alert') resolved to 5 elements:
    1) <div role="alert" class="my-work-phase__source-error">…</div> aka getByText('Controlled MW-I02 acceptance failure simulationRetry active count')
    2) <div role="alert" class="my-work-phase__source-error">…</div> aka getByText('Controlled MW-I02 acceptance failure simulationRetry waiting count')
    3) <div role="alert" class="my-work-phase__source-error">…</div> aka getByText('Controlled MW-I02 acceptance failure simulationRetry review phase count')
    4) <div role="alert" class="my-work-phase__source-error">…</div> aka getByText('Controlled MW-I02 acceptance failure simulationRetry completed count')
    5) <p role="alert" class="task-error">…</p> aka getByText('Tasks could not be loaded.')

Call log:
  - Expect "toContainText" getByRole('alert') with timeout 15000ms
  - waiting for getByRole('alert')

```

# Test source

```ts
  690 |     await expect(staff.employee.page.getByRole("heading", { name: "My work" })).toBeVisible();
  691 |     await expect(staff.employee.page.getByText(managerTask.title, { exact: true })).toBeVisible();
  692 |     await staff.employee.page.setViewportSize({ width: 1440, height: 1000 });
  693 |     await staff.employee.page.screenshot({ path: testInfo.outputPath("my-work-site-employee-1440.png"), fullPage: false });
  694 |     await staff.leader.page.goto("/my-work");
  695 |     await expect(staff.leader.page.getByRole("heading", { name: "My work" })).toBeVisible();
  696 |     await staff.leader.page.setViewportSize({ width: 1440, height: 1000 });
  697 |     await staff.leader.page.screenshot({ path: testInfo.outputPath("my-work-team-leader-1440.png"), fullPage: false });
  698 |     await ownerPage.goto("/my-work");
  699 |     await expect(ownerPage.getByText(/This Owner account has no active employee identity/)).toBeVisible();
  700 |     await ownerPage.setViewportSize({ width: 1440, height: 1000 });
  701 |     await ownerPage.screenshot({ path: testInfo.outputPath("my-work-owner-no-employee-1440.png"), fullPage: false });
  702 |     const staleTarget = await api<{ id: string; version: number }>(ownerPage, "/api/v1/tasks", "POST", {
  703 |       title: `MW-I02 stale version ${randomUUID().slice(0, 8)}`, type: "NON_PROJECT", priority: "LOW",
  704 |       targetDate: "2026-12-22", ownerEmployeeId: staff.designer.employeeId, reason: why
  705 |     }, csrf);
  706 |     const designerCsrfAgain = await getCsrf(staff.designer.page);
  707 |     const currentChange = await staff.designer.page.request.post(`/api/v1/tasks/${staleTarget.id}/state`, {
  708 |       headers: { Origin: baseURL, "X-CSRF-Token": designerCsrfAgain },
  709 |       data: { toState: "IN_PROGRESS", expectedVersion: staleTarget.version, reason: "Advance task before stale request" }
  710 |     });
  711 |     expect(currentChange.status()).toBe(201);
  712 |     const stale = await staff.designer.page.request.post(`/api/v1/tasks/${staleTarget.id}/state`, {
  713 |       headers: { Origin: baseURL, "X-CSRF-Token": await getCsrf(staff.designer.page) },
  714 |       data: { toState: "COMPLETED", expectedVersion: staleTarget.version, reason: "Attempt stale task transition" }
  715 |     });
  716 |     expect(stale.status()).toBe(409);
  717 | 
  718 |     // Keyboard focus remains visible on the real queue controls.
  719 |     await ownerPage.goto("/tasks");
  720 |     const keyboardTask = ownerPage.locator(".task-workspace nav.task-list button").first();
  721 |     let taskReachedByKeyboard = false;
  722 |     for (let index = 0; index < 80; index += 1) {
  723 |       await ownerPage.keyboard.press("Tab");
  724 |       if (await keyboardTask.evaluate(element => element === document.activeElement)) {
  725 |         taskReachedByKeyboard = true;
  726 |         break;
  727 |       }
  728 |     }
  729 |     expect(taskReachedByKeyboard).toBe(true);
  730 |     await expect(keyboardTask).toBeFocused();
  731 |     const focusStyle = await keyboardTask.evaluate(element => ({
  732 |       visible: element.matches(":focus-visible"),
  733 |       outlineWidth: getComputedStyle(element).outlineWidth,
  734 |       outlineStyle: getComputedStyle(element).outlineStyle
  735 |     }));
  736 |     expect(focusStyle.visible).toBe(true);
  737 |     expect(focusStyle.outlineWidth).toBe("3px");
  738 |     expect(focusStyle.outlineStyle).toBe("solid");
  739 |     await ownerPage.keyboard.press("Enter");
  740 |     await expect(ownerPage.locator(".task-detail h3")).toBeVisible();
  741 | 
  742 |     // Prototype-matched authenticated My Work captures. These are actual
  743 |     // application views; only the separately named failure state below is simulated.
  744 |     const referenceWidths = [1440, 1024, 390, 320] as const;
  745 |     const capturePersona = async (page: Page, persona: string): Promise<void> => {
  746 |       await page.goto("/my-work");
  747 |       await expect(page.getByRole("heading", { name: "My work" })).toBeVisible();
  748 |       const totals = await api<{ total: number }>(page, "/api/v1/tasks?scope=personal&offset=0&limit=1", "GET");
  749 |       if (totals.total > 0) await expect(page.locator(".task-queue-row").first()).toBeVisible();
  750 |       else await expect(page.locator(".task-empty")).toBeVisible();
  751 |       for (const width of referenceWidths) await captureMyWorkReferencePair(page, testInfo, persona, "initial", width, { actualPersonalTaskTotal: totals.total, evidence: "authenticated application backed by the run database" });
  752 |     };
  753 |     await capturePersona(staff.leader.page, "leader");
  754 |     await capturePersona(staff.employee.page, "site");
  755 |     await capturePersona(ownerPage, "owner");
  756 | 
  757 |     const designerPage = staff.designer.page;
  758 |     await designerPage.goto("/my-work");
  759 |     await expect(designerPage.getByRole("heading", { name: "My work" })).toBeVisible();
  760 |     const baseTotals = await api<{ total: number }>(designerPage, "/api/v1/tasks?scope=personal&offset=0&limit=1", "GET");
  761 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "initial", width, { actualPersonalTaskTotal: baseTotals.total, evidence: "authenticated application backed by the run database" });
  762 | 
  763 |     await designerPage.goto("/my-work");
  764 |     const waitingTotals = await api<{ total: number }>(designerPage, "/api/v1/tasks?scope=personal&phase=waiting&offset=0&limit=1", "GET");
  765 |     expect(waitingTotals.total, "the authenticated journey created an actual waiting personal task").toBeGreaterThan(0);
  766 |     const waitingWidget = designerPage.getByRole("button", { name: `Waiting personal tasks: ${waitingTotals.total}`, exact: true });
  767 |     await expect(waitingWidget).toBeVisible();
  768 |     await waitingWidget.click();
  769 |     await expect(designerPage.getByRole("status").filter({ hasText: `Showing ${waitingTotals.total} waiting personal tasks` })).toBeVisible();
  770 |     await expect(designerPage.getByRole("button", { name: new RegExp(`Open task: ${waitingTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) })).toBeVisible();
  771 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "waiting-selected", width, { actualWaitingTotal: waitingTotals.total, evidence: "authenticated application backed by the run database" });
  772 | 
  773 |     await designerPage.goto("/my-work");
  774 |     const noMatch = `mw-i02-empty-${randomUUID()}`;
  775 |     const emptyResult = await api<{ total: number }>(designerPage, `/api/v1/tasks?scope=personal&offset=0&limit=1&q=${encodeURIComponent(noMatch)}`, "GET");
  776 |     expect(emptyResult.total, "the server confirms the unique search has no personal task match").toBe(0);
  777 |     const emptySearch = designerPage.getByRole("textbox", { name: "Search tasks" });
  778 |     await emptySearch.fill(noMatch);
  779 |     await designerPage.getByRole("button", { name: "Apply filters", exact: true }).click();
  780 |     await expect(designerPage.locator(".task-empty")).toContainText("No tasks are assigned to you");
  781 |     await expect(designerPage.getByText("0 filtered tasks", { exact: true })).toBeVisible();
  782 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "empty", width, { serverConfirmedZeroMatch: true, searchToken: noMatch, evidence: "actual authenticated route and zero-result API response" });
  783 | 
  784 |     // Separate, explicitly simulated API failure. Auth/session endpoints and
  785 |     // the surrounding application remain real; no screenshot is labeled as a
  786 |     // real loaded or server-failure state.
  787 |     await designerPage.goto("/my-work");
  788 |     await designerPage.route(url => url.pathname.endsWith("/api/v1/tasks") && url.searchParams.get("scope") === "personal", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Controlled MW-I02 acceptance failure simulation" }) }));
  789 |     await designerPage.reload();
> 790 |     await expect(designerPage.getByRole("alert")).toContainText("Tasks could not be loaded. Try again.");
      |                                                   ^ Error: expect(locator).toContainText(expected) failed
  791 |     await designerPage.addStyleTag({ content: "body::before{content:'SIMULATED API FAILURE — supplemental capture';position:fixed;z-index:999999;top:8px;left:8px;padding:8px 12px;background:#8b1e2d;color:#fff;font:700 13px/1.3 system-ui,sans-serif;border-radius:4px;box-shadow:0 2px 8px #0005}" });
  792 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "error-simulated", width, { simulated: true, interceptedRequest: "GET /api/v1/tasks?scope=personal → HTTP 503", evidence: "supplemental controlled client-side failure only; not a real server or whole-app loading failure" });
  793 |     await designerPage.unrouteAll({ behavior: "wait" });
  794 | 
  795 |   } finally {
  796 |     // Use each app's normal logout control even when an earlier assertion fails.
  797 |     for (const context of [ownerContext, ...staffContexts]) {
  798 |       const page = context.pages()[0];
  799 |       if (!page || page.isClosed()) continue;
  800 |       try {
  801 |         if (context === ownerContext && ownerAuth) state.ownerCredentials = mergeCredentials(state.ownerCredentials, await exportCredentials(ownerAuth));
  802 |         else {
  803 |           for (const [key, auth] of staffAuthenticators) {
  804 |             if (auth.cdp) state.personas[key] = { ...state.personas[key], credentials: mergeCredentials(state.personas[key]?.credentials ?? [], await exportCredentials(auth)) };
  805 |           }
  806 |         }
  807 |         saveAuthState(statePath, state);
  808 |       } catch { /* Credential snapshots are best effort during failure cleanup; preserve prior durable state. */ }
  809 |       try {
  810 |         await page.goto("/workspace");
  811 |         const signOut = page.getByRole("button", { name: "Sign out", exact: true });
  812 |         if (await signOut.count()) await logOut(page);
  813 |       } catch { /* Preserve the primary test error while still closing the isolated browser context. */ }
  814 |     }
  815 |     await ownerContext.close();
  816 |     for (const context of staffContexts) await context.close();
  817 |   }
  818 | });
  819 | 
```
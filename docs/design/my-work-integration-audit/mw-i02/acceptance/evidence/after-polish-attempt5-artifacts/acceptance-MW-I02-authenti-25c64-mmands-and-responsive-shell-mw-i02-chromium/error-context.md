# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: acceptance.spec.ts >> MW-I02 authenticated task acceptance: real identities, populated views, commands, and responsive shell
- Location: .env.checkpoint-tools\mw-i02-acceptance\acceptance.spec.ts:176:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.my-work-phase-summary__grid .my-work-phase').first().locator('.my-work-phase__source-error[role=status]')
Expected substring: "Controlled MW-I02 phase count 403 simulation"
Received string:    "Not available to this account."
Timeout: 15000ms

Call log:
  - Expect "toContainText" locator('.my-work-phase-summary__grid .my-work-phase').first().locator('.my-work-phase__source-error[role=status]') with timeout 15000ms
  - waiting for locator('.my-work-phase-summary__grid .my-work-phase').first().locator('.my-work-phase__source-error[role=status]')
    33 × locator resolved to <p role="status" class="my-work-phase__source-error">Not available to this account.</p>
       - unexpected value "Not available to this account."

```

```yaml
- status: Not available to this account.
```

# Test source

```ts
  736 |     }));
  737 |     expect(focusStyle.visible).toBe(true);
  738 |     expect(focusStyle.outlineWidth).toBe("3px");
  739 |     expect(focusStyle.outlineStyle).toBe("solid");
  740 |     await ownerPage.keyboard.press("Enter");
  741 |     await expect(ownerPage.locator(".task-detail h3")).toBeVisible();
  742 | 
  743 |     // Prototype-matched authenticated My Work captures. These are actual
  744 |     // application views; only the separately named failure state below is simulated.
  745 |     const referenceWidths = [1440, 1024, 390, 320] as const;
  746 |     const capturePersona = async (page: Page, persona: string): Promise<void> => {
  747 |       await page.goto("/my-work");
  748 |       await expect(page.getByRole("heading", { name: "My work" })).toBeVisible();
  749 |       const totals = await api<{ total: number }>(page, "/api/v1/tasks?scope=personal&offset=0&limit=1", "GET");
  750 |       if (totals.total > 0) await expect(page.locator(".task-queue-row").first()).toBeVisible();
  751 |       else await expect(page.locator(".task-empty")).toBeVisible();
  752 |       for (const width of referenceWidths) await captureMyWorkReferencePair(page, testInfo, persona, "initial", width, { actualPersonalTaskTotal: totals.total, evidence: "authenticated application backed by the run database" });
  753 |     };
  754 |     await capturePersona(staff.leader.page, "leader");
  755 |     await capturePersona(staff.employee.page, "site");
  756 |     await capturePersona(ownerPage, "owner");
  757 | 
  758 |     const designerPage = staff.designer.page;
  759 |     await designerPage.goto("/my-work");
  760 |     await expect(designerPage.getByRole("heading", { name: "My work" })).toBeVisible();
  761 |     const baseTotals = await api<{ total: number }>(designerPage, "/api/v1/tasks?scope=personal&offset=0&limit=1", "GET");
  762 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "initial", width, { actualPersonalTaskTotal: baseTotals.total, evidence: "authenticated application backed by the run database" });
  763 | 
  764 |     await designerPage.goto("/my-work");
  765 |     const waitingTotals = await api<{ total: number }>(designerPage, "/api/v1/tasks?scope=personal&phase=waiting&offset=0&limit=1", "GET");
  766 |     expect(waitingTotals.total, "the authenticated journey created an actual waiting personal task").toBeGreaterThan(0);
  767 |     const waitingWidget = designerPage.getByRole("button", { name: `Waiting personal tasks: ${waitingTotals.total}`, exact: true });
  768 |     await expect(waitingWidget).toBeVisible();
  769 |     await waitingWidget.click();
  770 |     await expect(designerPage.getByRole("status").filter({ hasText: `Showing ${waitingTotals.total} waiting personal tasks` })).toBeVisible();
  771 |     await expect(designerPage.getByRole("button", { name: new RegExp(`Open task: ${waitingTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) })).toBeVisible();
  772 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "waiting-selected", width, { actualWaitingTotal: waitingTotals.total, evidence: "authenticated application backed by the run database" });
  773 | 
  774 |     await designerPage.goto("/my-work");
  775 |     const noMatch = `mw-i02-empty-${randomUUID()}`;
  776 |     const emptyResult = await api<{ total: number }>(designerPage, `/api/v1/tasks?scope=personal&offset=0&limit=1&q=${encodeURIComponent(noMatch)}`, "GET");
  777 |     expect(emptyResult.total, "the server confirms the unique search has no personal task match").toBe(0);
  778 |     const emptySearch = designerPage.getByRole("textbox", { name: "Search tasks" });
  779 |     await emptySearch.fill(noMatch);
  780 |     await designerPage.getByRole("button", { name: "Apply filters", exact: true }).click();
  781 |     await expect(designerPage.locator(".task-empty")).toContainText("No tasks are assigned to you");
  782 |     await expect(designerPage.getByText("0 filtered tasks", { exact: true })).toBeVisible();
  783 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "empty", width, { serverConfirmedZeroMatch: true, searchToken: noMatch, evidence: "actual authenticated route and zero-result API response" });
  784 | 
  785 |     // Focused supplemental source-state checks. Each intercepted response is
  786 |     // explicitly labeled as controlled; authenticated session endpoints and
  787 |     // all unhandled task sources remain live against the run database.
  788 |     const supplementalActivePath = "/api/v1/tasks";
  789 |     const supplementalActiveTotal = (await api<{ total: number }>(designerPage, `${supplementalActivePath}?scope=personal&phase=active&offset=0&limit=1`, "GET")).total;
  790 |     await designerPage.goto("/my-work");
  791 |     const supplementalActiveTile = designerPage.getByRole("button", { name: `Active personal tasks: ${supplementalActiveTotal}`, exact: true });
  792 |     await expect(supplementalActiveTile).toBeVisible();
  793 |     await expect(designerPage.locator(".task-queue-row").first()).toBeVisible();
  794 |     const supplementalActiveArticle = designerPage.locator(".my-work-phase-summary__grid .my-work-phase").first();
  795 |     const supplementalQueue = designerPage.locator(".task-workspace nav.task-list");
  796 |     const supplementalQueueBefore = await designerPage.locator(".task-queue-row").count();
  797 |     let releaseSupplementalLoading: (() => void) | undefined;
  798 |     let signalSupplementalRoute: (() => void) | undefined;
  799 |     const supplementalRouteReached = new Promise<void>(resolveRoute => { signalSupplementalRoute = resolveRoute; });
  800 |     const supplementalRouteRelease = new Promise<void>(resolveRelease => { releaseSupplementalLoading = resolveRelease; });
  801 |     const supplementalActiveMatcher = (url: URL): boolean => url.pathname === supplementalActivePath && url.searchParams.get("scope") === "personal" && url.searchParams.get("phase") === "active" && url.searchParams.get("limit") === "1";
  802 |     try {
  803 |       await designerPage.route(url => supplementalActiveMatcher(url), async route => {
  804 |         signalSupplementalRoute?.();
  805 |         await supplementalRouteRelease;
  806 |         await route.continue();
  807 |       });
  808 |       await designerPage.locator(".task-toolbar").getByRole("button", { name: "Refresh", exact: true }).click();
  809 |       await supplementalRouteReached;
  810 |       await expect(supplementalActiveArticle.locator("strong")).toContainText("Loading");
  811 |       await designerPage.screenshot({ path: testInfo.outputPath("my-work-designer-active-count-loading-controlled-supplemental.png"), fullPage: false });
  812 |       releaseSupplementalLoading?.();
  813 |       await expect(designerPage.getByRole("button", { name: `Active personal tasks: ${supplementalActiveTotal}`, exact: true })).toBeVisible();
  814 |       await designerPage.unroute(url => supplementalActiveMatcher(url));
  815 | 
  816 |       let supplementalFailureAttempt = 0;
  817 |       await designerPage.route(url => supplementalActiveMatcher(url), async route => {
  818 |         supplementalFailureAttempt += 1;
  819 |         await route.fulfill({
  820 |           status: supplementalFailureAttempt === 1 ? 503 : 403,
  821 |           contentType: "application/json",
  822 |           body: JSON.stringify({ message: supplementalFailureAttempt === 1 ? "Controlled MW-I02 phase count 503 simulation" : "Controlled MW-I02 phase count 403 simulation" })
  823 |         });
  824 |       });
  825 |       await designerPage.locator(".task-toolbar").getByRole("button", { name: "Refresh", exact: true }).click();
  826 |       const supplementalStaleTile = designerPage.getByRole("button", { name: `Active personal tasks: Stale count ${supplementalActiveTotal}`, exact: true });
  827 |       await expect(supplementalStaleTile).toBeVisible();
  828 |       await expect(supplementalActiveArticle.locator(".my-work-phase__source-error[role=status]")).toContainText("Controlled MW-I02 phase count 503 simulation");
  829 |       await expect(supplementalQueue).toBeVisible();
  830 |       await expect(designerPage.locator(".task-queue-row")).toHaveCount(supplementalQueueBefore);
  831 |       const supplementalWorkingOtherPhase = designerPage.getByRole("button", { name: /^Waiting personal tasks: \d+$/ });
  832 |       await expect(supplementalWorkingOtherPhase).toBeVisible();
  833 |       const supplementalFailureLabel = await designerPage.addStyleTag({ content: "body::before{content:'CONTROLLED PHASE COUNT RESPONSE — supplemental acceptance capture';position:fixed;z-index:999999;top:8px;left:8px;padding:8px 12px;background:#8b1e2d;color:#fff;font:700 13px/1.3 system-ui,sans-serif;border-radius:4px;box-shadow:0 2px 8px #0005}" });
  834 |       await designerPage.screenshot({ path: testInfo.outputPath("my-work-designer-active-count-stale-controlled-supplemental.png"), fullPage: false });
  835 |       await supplementalActiveArticle.getByRole("button", { name: "Retry active count", exact: true }).click();
> 836 |       await expect(supplementalActiveArticle.locator(".my-work-phase__source-error[role=status]")).toContainText("Controlled MW-I02 phase count 403 simulation");
      |                                                                                                    ^ Error: expect(locator).toContainText(expected) failed
  837 |       await expect(supplementalActiveArticle.getByRole("button", { name: /^Active personal tasks: Not available$/ })).toBeVisible();
  838 |       await expect(supplementalActiveArticle.locator("strong")).toContainText("Not available");
  839 |       await designerPage.screenshot({ path: testInfo.outputPath("my-work-designer-active-count-denied-controlled-supplemental.png"), fullPage: false });
  840 |       await designerPage.unroute(url => supplementalActiveMatcher(url));
  841 |       await supplementalActiveArticle.getByRole("button", { name: "Retry active count", exact: true }).click();
  842 |       await expect(designerPage.getByRole("button", { name: `Active personal tasks: ${supplementalActiveTotal}`, exact: true })).toBeVisible();
  843 |       await expect(supplementalActiveArticle.locator(".my-work-phase__source-error")).toHaveCount(0);
  844 |       await supplementalFailureLabel.evaluate(element => element.remove());
  845 |       const supplementalActualRetry = await api<{ total: number }>(designerPage, `${supplementalActivePath}?scope=personal&phase=active&offset=0&limit=1`, "GET");
  846 |       expect(supplementalActualRetry.total, "the recovered phase count matches the actual authenticated API source").toBe(supplementalActiveTotal);
  847 |       await expect(designerPage.locator(".task-queue-row")).toHaveCount(supplementalQueueBefore);
  848 |     } finally {
  849 |       releaseSupplementalLoading?.();
  850 |       await designerPage.unroute(url => supplementalActiveMatcher(url)).catch(() => undefined);
  851 |       await designerPage.locator("head style").evaluateAll(styles => styles.filter(style => style.textContent?.includes("CONTROLLED PHASE COUNT RESPONSE")).forEach(style => style.remove()));
  852 |     }
  853 | 
  854 |     // Separate, explicitly simulated API failure. Auth/session endpoints and
  855 |     // the surrounding application remain real; no screenshot is labeled as a
  856 |     // real loaded or server-failure state.
  857 |     await designerPage.goto("/my-work");
  858 |     await designerPage.route(url => url.pathname.endsWith("/api/v1/tasks") && url.searchParams.get("scope") === "personal", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Controlled MW-I02 acceptance failure simulation" }) }));
  859 |     await designerPage.reload();
  860 |     await expect(designerPage.locator(".task-error[role=alert]")).toContainText("Tasks could not be loaded. Try again.");
  861 |     const simulatedPhaseErrors = designerPage.locator(".my-work-phase__source-error[role=alert]");
  862 |     await expect(simulatedPhaseErrors).toHaveCount(4);
  863 |     for (let index = 0; index < 4; index += 1) await expect(simulatedPhaseErrors.nth(index)).toContainText("Controlled MW-I02 acceptance failure simulation");
  864 |     const simulationLabel = await designerPage.addStyleTag({ content: "body::before{content:'SIMULATED API FAILURE — supplemental capture';position:fixed;z-index:999999;top:8px;left:8px;padding:8px 12px;background:#8b1e2d;color:#fff;font:700 13px/1.3 system-ui,sans-serif;border-radius:4px;box-shadow:0 2px 8px #0005}" });
  865 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "error-simulated", width, { simulated: true, interceptedRequest: "GET /api/v1/tasks?scope=personal → HTTP 503", evidence: "supplemental controlled client-side failure only; not a real server or whole-app loading failure" });
  866 |     await designerPage.unrouteAll({ behavior: "wait" });
  867 |     await simulationLabel.evaluate(element => element.remove());
  868 |     await designerPage.getByRole("button", { name: "Reload", exact: true }).click();
  869 |     await expect(designerPage.locator(".task-error[role=alert]")).toHaveCount(0);
  870 |     await expect(simulatedPhaseErrors).toHaveCount(0);
  871 |     await expect(designerPage.locator(".task-queue-row").first()).toBeVisible();
  872 | 
  873 |   } finally {
  874 |     // Use each app's normal logout control even when an earlier assertion fails.
  875 |     for (const context of [ownerContext, ...staffContexts]) {
  876 |       const page = context.pages()[0];
  877 |       if (!page || page.isClosed()) continue;
  878 |       try {
  879 |         if (context === ownerContext && ownerAuth) state.ownerCredentials = mergeCredentials(state.ownerCredentials, await exportCredentials(ownerAuth));
  880 |         else {
  881 |           for (const [key, auth] of staffAuthenticators) {
  882 |             if (auth.cdp) state.personas[key] = { ...state.personas[key], credentials: mergeCredentials(state.personas[key]?.credentials ?? [], await exportCredentials(auth)) };
  883 |           }
  884 |         }
  885 |         saveAuthState(statePath, state);
  886 |       } catch { /* Credential snapshots are best effort during failure cleanup; preserve prior durable state. */ }
  887 |       try {
  888 |         await page.goto("/workspace");
  889 |         const signOut = page.getByRole("button", { name: "Sign out", exact: true });
  890 |         if (await signOut.count()) await logOut(page);
  891 |       } catch { /* Preserve the primary test error while still closing the isolated browser context. */ }
  892 |     }
  893 |     await ownerContext.close();
  894 |     for (const context of staffContexts) await context.close();
  895 |   }
  896 | });
  897 | 
```
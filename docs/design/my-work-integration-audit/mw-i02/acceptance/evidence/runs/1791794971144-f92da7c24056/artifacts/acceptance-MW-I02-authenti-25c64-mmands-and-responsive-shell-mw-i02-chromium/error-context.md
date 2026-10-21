# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: acceptance.spec.ts >> MW-I02 authenticated task acceptance: real identities, populated views, commands, and responsive shell
- Location: .env.checkpoint-tools\mw-i02-acceptance\acceptance.spec.ts:267:5

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('.my-work-attention__zero-body .my-work-attention__disclosure').first().getByRole('button', { name: 'Refresh', exact: true })

```

# Test source

```ts
  954  |       await expect(designerPage).toHaveURL(url => url.pathname === "/my-work"
  955  |         && url.searchParams.get("status") === "WAITING" && url.searchParams.get("q") === waitingTitle);
  956  |       await expect(waitingTask).toBeVisible();
  957  |       await waitingTask.tap();
  958  |       await expect(designerPage.locator(".task-detail h3")).toHaveText(waitingTitle);
  959  |       await expect(designerPage.locator(".task-detail .task-state")).toHaveText("Waiting");
  960  |       const resumeForm = designerPage.getByRole("form", { name: "Resume task" });
  961  |       await expect(resumeForm).toBeVisible();
  962  |       await resumeForm.getByLabel("Reason for resuming").tap();
  963  |       await resumeForm.getByLabel("Reason for resuming").fill("Mobile acceptance only; do not submit");
  964  |       const resumeButton = resumeForm.getByRole("button", { name: "Resume task", exact: true });
  965  |       await resumeButton.scrollIntoViewIfNeeded();
  966  |       await expect(resumeButton).toBeInViewport({ ratio: 1 });
  967  |       await expect(designerPage.locator(".workspace-mobile-nav")).toBeVisible();
  968  |       await expect.poll(async () => {
  969  |         const [action, navigation] = await Promise.all([
  970  |           resumeButton.boundingBox(), designerPage.locator(".workspace-mobile-nav").boundingBox()
  971  |         ]);
  972  |         return action && navigation ? action.y + action.height - navigation.y : Number.POSITIVE_INFINITY;
  973  |       }, { message: `fixed navigation does not cover the task action at ${width}px` }).toBeLessThan(0);
  974  |       const [buttonBox, navBox] = await Promise.all([
  975  |         resumeButton.boundingBox(),
  976  |         designerPage.locator(".workspace-mobile-nav").boundingBox()
  977  |       ]);
  978  |       expect(buttonBox, `task action is laid out at ${width}px`).not.toBeNull();
  979  |       expect(navBox, `fixed navigation exists at ${width}px`).not.toBeNull();
  980  |       expect(buttonBox!.y + buttonBox!.height, `fixed navigation does not cover the task action at ${width}px`).toBeLessThan(navBox!.y);
  981  |       expect(await designerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `no horizontal overflow at ${width}px`).toBe(true);
  982  |     }
  983  | 
  984  |     await designerPage.goto("/my-work");
  985  |     const noMatch = `mw-i02-empty-${randomUUID()}`;
  986  |     const emptyResult = await api<{ total: number }>(designerPage, `/api/v1/tasks?scope=personal&offset=0&limit=1&q=${encodeURIComponent(noMatch)}`, "GET");
  987  |     expect(emptyResult.total, "the server confirms the unique search has no personal task match").toBe(0);
  988  |     const emptySearch = designerPage.getByRole("textbox", { name: "Search tasks" });
  989  |     await emptySearch.fill(noMatch);
  990  |     await designerPage.getByRole("button", { name: "Apply filters", exact: true }).click();
  991  |     await expect(designerPage.locator(".task-empty")).toContainText("No tasks are assigned to you");
  992  |     await expect(designerPage.getByText("0 filtered tasks", { exact: true })).toBeVisible();
  993  |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "empty", width, { serverConfirmedZeroMatch: true, searchToken: noMatch, evidence: "actual authenticated route and zero-result API response" });
  994  | 
  995  |     // Supplement the settled screenshots with actual authenticated review-inbox
  996  |     // state transitions. Only the three source outcomes under inspection are
  997  |     // controlled; the loading pass continues the live GET and every other
  998  |     // endpoint stays connected to the authorized run database.
  999  |     const reviewInboxPath = "/api/v1/reviews/inbox";
  1000 |     const reviewInboxMatcher = (url: URL): boolean => url.pathname === reviewInboxPath
  1001 |       && url.searchParams.get("personal") === "true"
  1002 |       && url.searchParams.get("offset") === "0"
  1003 |       && url.searchParams.get("limit") === "50";
  1004 |     const actualReviewInbox = await api<{ total: number; items: unknown[] }>(designerPage, `${reviewInboxPath}?personal=true&offset=0&limit=50`, "GET");
  1005 |     expect(Number.isInteger(actualReviewInbox.total), "authenticated review inbox returns an exact total").toBe(true);
  1006 |     expect(Array.isArray(actualReviewInbox.items), "authenticated review inbox returns its real page").toBe(true);
  1007 |     await designerPage.setViewportSize({ width: 390, height: 844 });
  1008 |     await designerPage.goto("/my-work");
  1009 |     const attentionGroup = designerPage.locator(".my-work-attention__zero-group");
  1010 |     const attentionSources = designerPage.locator(".my-work-attention__zero-body .my-work-attention__disclosure");
  1011 |     const reviewAttention = attentionSources.nth(0);
  1012 |     const reviewAttentionSummary = reviewAttention.locator("summary strong");
  1013 |     const correctionsAttentionSummary = attentionSources.nth(1).locator("summary strong");
  1014 |     const managementAttentionSummary = attentionSources.nth(2).locator("summary strong");
  1015 |     await expect.poll(async () => await reviewAttentionSummary.textContent()).toBe(`${actualReviewInbox.total} ${actualReviewInbox.total === 1 ? "item" : "items"}`);
  1016 |     await expect(attentionSources).toHaveCount(3);
  1017 |     await expect.poll(async () => (await attentionSources.locator("summary strong").allTextContents()).every(text => text !== "Loading")).toBe(true);
  1018 |     const attentionGroupClass = await attentionGroup.getAttribute("class");
  1019 |     if (attentionGroupClass?.includes("is-compact") && !(await attentionGroup.evaluate(element => (element as HTMLDetailsElement).open))) {
  1020 |       await attentionGroup.locator(":scope > summary").click();
  1021 |     }
  1022 |     await expect(attentionSources.nth(0)).toBeVisible();
  1023 |     await expect(attentionSources.nth(1)).toBeVisible();
  1024 |     await expect(attentionSources.nth(2)).toBeVisible();
  1025 |     if (!(await reviewAttention.evaluate(element => (element as HTMLDetailsElement).open))) await reviewAttention.locator("summary").click();
  1026 | 
  1027 |     let releaseReviewLoading: (() => void) | undefined;
  1028 |     let reviewLoadingRequestReached = false;
  1029 |     const reviewLoadingRelease = new Promise<void>(resolveRelease => { releaseReviewLoading = resolveRelease; });
  1030 |     try {
  1031 |       await designerPage.route(reviewInboxMatcher, async route => {
  1032 |         reviewLoadingRequestReached = true;
  1033 |         await reviewLoadingRelease;
  1034 |         await route.continue();
  1035 |       });
  1036 |       await reviewAttention.getByRole("button", { name: "Refresh", exact: true }).click();
  1037 |       await expect.poll(() => reviewLoadingRequestReached, { message: "the real review-inbox GET reaches the controlled loading gate" }).toBe(true);
  1038 |       await expect(reviewAttentionSummary).toHaveText("Loading");
  1039 |       await expect(attentionGroup).not.toHaveClass(/is-compact/);
  1040 |       await expect(attentionSources.nth(0)).toBeVisible();
  1041 |       await expect(correctionsAttentionSummary).not.toHaveText("Loading");
  1042 |       await expect(managementAttentionSummary).not.toHaveText("Loading");
  1043 |       releaseReviewLoading?.();
  1044 |       await expect(reviewAttentionSummary).toHaveText(`${actualReviewInbox.total} ${actualReviewInbox.total === 1 ? "item" : "items"}`);
  1045 |       await designerPage.unroute(reviewInboxMatcher);
  1046 |     } finally {
  1047 |       releaseReviewLoading?.();
  1048 |       await designerPage.unroute(reviewInboxMatcher).catch(() => undefined);
  1049 |     }
  1050 | 
  1051 |     const addControlledAttentionLabel = async (status: string) => designerPage.addStyleTag({ content: `body::before{content:'CONTROLLED REVIEW INBOX HTTP ${status} — supplemental acceptance capture';position:fixed;z-index:999999;top:8px;left:8px;padding:8px 12px;background:#8b1e2d;color:#fff;font:700 13px/1.3 system-ui,sans-serif;border-radius:4px;box-shadow:0 2px 8px #0005}` });
  1052 |     try {
  1053 |       await designerPage.route(reviewInboxMatcher, route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Controlled MW-I02 review inbox stale 503 simulation" }) }));
> 1054 |       await reviewAttention.getByRole("button", { name: "Refresh", exact: true }).click();
       |                                                                                   ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  1055 |       await expect(reviewAttentionSummary).toHaveText(`Stale · ${actualReviewInbox.total} ${actualReviewInbox.total === 1 ? "item" : "items"}`);
  1056 |       await expect(reviewAttention.locator(".my-work-attention__error[role=status]")).toContainText("Controlled MW-I02 review inbox stale 503 simulation");
  1057 |       await expect(attentionGroup).not.toHaveClass(/is-compact/);
  1058 |       await expect(reviewAttention).toBeVisible();
  1059 |       await expect(correctionsAttentionSummary).not.toHaveText("Loading");
  1060 |       await expect(managementAttentionSummary).not.toHaveText("Loading");
  1061 |       const staleLabel = await addControlledAttentionLabel("503");
  1062 |       await designerPage.screenshot({ path: testInfo.outputPath("my-work-review-inbox-stale-503-controlled-supplemental.png"), fullPage: false });
  1063 |       await staleLabel.evaluate(element => (element as HTMLStyleElement).remove());
  1064 | 
  1065 |       await designerPage.route(reviewInboxMatcher, route => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Controlled MW-I02 review inbox denied 403 simulation" }) }));
  1066 |       await reviewAttention.getByRole("button", { name: "Refresh", exact: true }).click();
  1067 |       await expect(reviewAttentionSummary).toHaveText("Access not available");
  1068 |       await expect(reviewAttention.locator(".my-work-attention__error[role=alert]")).toContainText("Controlled MW-I02 review inbox denied 403 simulation");
  1069 |       await expect(attentionGroup).not.toHaveClass(/is-compact/);
  1070 |       await expect(reviewAttention).toBeVisible();
  1071 |       await expect(correctionsAttentionSummary).not.toHaveText("Loading");
  1072 |       await expect(managementAttentionSummary).not.toHaveText("Loading");
  1073 |       const deniedLabel = await addControlledAttentionLabel("403");
  1074 |       await designerPage.screenshot({ path: testInfo.outputPath("my-work-review-inbox-denied-403-controlled-supplemental.png"), fullPage: false });
  1075 |       await deniedLabel.evaluate(element => (element as HTMLStyleElement).remove());
  1076 |       await designerPage.unroute(reviewInboxMatcher);
  1077 | 
  1078 |       await reviewAttention.getByRole("button", { name: "Refresh", exact: true }).click();
  1079 |       await expect(reviewAttentionSummary).toHaveText(`${actualReviewInbox.total} ${actualReviewInbox.total === 1 ? "item" : "items"}`);
  1080 |       await expect(reviewAttention.locator(".my-work-attention__error")).toHaveCount(0);
  1081 |     } finally {
  1082 |       await designerPage.unroute(reviewInboxMatcher).catch(() => undefined);
  1083 |       await designerPage.locator("head style").evaluateAll(styles => styles.filter(style => style.textContent?.includes("CONTROLLED REVIEW INBOX HTTP")).forEach(style => style.remove()));
  1084 |     }
  1085 | 
  1086 |     try {
  1087 |       await designerPage.route(reviewInboxMatcher, route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Controlled MW-I02 review inbox initial 503 simulation" }) }));
  1088 |       await designerPage.goto("/my-work");
  1089 |       const initialFailedReview = designerPage.locator(".my-work-attention__zero-body .my-work-attention__disclosure").nth(0);
  1090 |       await expect(initialFailedReview.locator("summary strong")).toHaveText("Unavailable");
  1091 |       await expect(initialFailedReview.locator(".my-work-attention__error[role=alert]")).toContainText("Controlled MW-I02 review inbox initial 503 simulation");
  1092 |       await expect(attentionGroup).not.toHaveClass(/is-compact/);
  1093 |       await expect(designerPage.locator(".my-work-attention__zero-body .my-work-attention__disclosure")).toHaveCount(3);
  1094 |       for (let index = 0; index < 3; index += 1) await expect(designerPage.locator(".my-work-attention__zero-body .my-work-attention__disclosure").nth(index)).toBeVisible();
  1095 |       const initialFailedLabel = await addControlledAttentionLabel("503 initial request");
  1096 |       await designerPage.screenshot({ path: testInfo.outputPath("my-work-review-inbox-initial-failed-503-controlled-supplemental.png"), fullPage: false });
  1097 |       await initialFailedLabel.evaluate(element => (element as HTMLStyleElement).remove());
  1098 |       await designerPage.unroute(reviewInboxMatcher);
  1099 |       await designerPage.reload();
  1100 |       const recoveredReview = designerPage.locator(".my-work-attention__zero-body .my-work-attention__disclosure").nth(0).locator("summary strong");
  1101 |       await expect(recoveredReview).toHaveText(`${actualReviewInbox.total} ${actualReviewInbox.total === 1 ? "item" : "items"}`);
  1102 |     } finally {
  1103 |       await designerPage.unroute(reviewInboxMatcher).catch(() => undefined);
  1104 |       await designerPage.locator("head style").evaluateAll(styles => styles.filter(style => style.textContent?.includes("CONTROLLED REVIEW INBOX HTTP")).forEach(style => style.remove()));
  1105 |     }
  1106 | 
  1107 |     // Focused supplemental source-state checks. Each intercepted response is
  1108 |     // explicitly labeled as controlled; authenticated session endpoints and
  1109 |     // all unhandled task sources remain live against the run database.
  1110 |     const supplementalActivePath = "/api/v1/tasks";
  1111 |     const supplementalActiveTotal = (await api<{ total: number }>(designerPage, `${supplementalActivePath}?scope=personal&phase=active&offset=0&limit=1`, "GET")).total;
  1112 |     await designerPage.goto("/my-work");
  1113 |     const supplementalActiveTile = designerPage.getByRole("button", { name: `Active personal tasks: ${supplementalActiveTotal}`, exact: true });
  1114 |     await expect(supplementalActiveTile).toBeVisible();
  1115 |     await expect(designerPage.locator(".task-queue-row").first()).toBeVisible();
  1116 |     const supplementalActiveArticle = designerPage.locator(".my-work-phase-summary__grid .my-work-phase").first();
  1117 |     const supplementalQueue = designerPage.locator(".task-workspace nav.task-list");
  1118 |     const supplementalQueueBefore = await designerPage.locator(".task-queue-row").count();
  1119 |     let releaseSupplementalLoading: (() => void) | undefined;
  1120 |     let supplementalRouteReached = false;
  1121 |     const supplementalRouteRelease = new Promise<void>(resolveRelease => { releaseSupplementalLoading = resolveRelease; });
  1122 |     const supplementalActiveMatcher = (url: URL): boolean => url.pathname === supplementalActivePath && url.searchParams.get("scope") === "personal" && url.searchParams.get("phase") === "active" && url.searchParams.get("limit") === "1";
  1123 |     try {
  1124 |       await designerPage.route(supplementalActiveMatcher, async route => {
  1125 |         supplementalRouteReached = true;
  1126 |         await supplementalRouteRelease;
  1127 |         await route.continue();
  1128 |       });
  1129 |       await designerPage.locator(".task-toolbar").getByRole("button", { name: "Refresh", exact: true }).click();
  1130 |       await expect.poll(() => supplementalRouteReached, { message: "refresh requests the supplemental active count" }).toBe(true);
  1131 |       await expect(supplementalActiveArticle.locator("strong")).toContainText("Loading");
  1132 |       await designerPage.screenshot({ path: testInfo.outputPath("my-work-designer-active-count-loading-controlled-supplemental.png"), fullPage: false });
  1133 |       releaseSupplementalLoading?.();
  1134 |       await expect(designerPage.getByRole("button", { name: `Active personal tasks: ${supplementalActiveTotal}`, exact: true })).toBeVisible();
  1135 |       await designerPage.unroute(supplementalActiveMatcher);
  1136 | 
  1137 |       let supplementalFailureAttempt = 0;
  1138 |       await designerPage.route(supplementalActiveMatcher, async route => {
  1139 |         supplementalFailureAttempt += 1;
  1140 |         await route.fulfill({
  1141 |           status: supplementalFailureAttempt === 1 ? 503 : 403,
  1142 |           contentType: "application/json",
  1143 |           body: JSON.stringify({ message: supplementalFailureAttempt === 1 ? "Controlled MW-I02 phase count 503 simulation" : "Controlled MW-I02 phase count 403 simulation" })
  1144 |         });
  1145 |       });
  1146 |       await designerPage.locator(".task-toolbar").getByRole("button", { name: "Refresh", exact: true }).click();
  1147 |       const supplementalStaleTile = designerPage.getByRole("button", { name: `Active personal tasks: Stale count ${supplementalActiveTotal}`, exact: true });
  1148 |       await expect(supplementalStaleTile).toBeVisible();
  1149 |       await expect(supplementalActiveArticle.locator(".my-work-phase__source-error[role=status]")).toContainText("Controlled MW-I02 phase count 503 simulation");
  1150 |       await expect(supplementalQueue).toBeVisible();
  1151 |       await expect(designerPage.locator(".task-queue-row")).toHaveCount(supplementalQueueBefore);
  1152 |       const supplementalWorkingOtherPhase = designerPage.getByRole("button", { name: /^Waiting personal tasks: \d+$/ });
  1153 |       await expect(supplementalWorkingOtherPhase).toBeVisible();
  1154 |       const supplementalFailureLabel = await designerPage.addStyleTag({ content: "body::before{content:'CONTROLLED PHASE COUNT RESPONSE — supplemental acceptance capture';position:fixed;z-index:999999;top:8px;left:8px;padding:8px 12px;background:#8b1e2d;color:#fff;font:700 13px/1.3 system-ui,sans-serif;border-radius:4px;box-shadow:0 2px 8px #0005}" });
```
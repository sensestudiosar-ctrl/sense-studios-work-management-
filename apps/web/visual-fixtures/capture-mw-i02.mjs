import { chromium } from "../../../node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const base = process.env.MW_FIXTURE_URL ?? "http://127.0.0.1:4173/mw-i02-after.html";
const out = process.env.MW_EVIDENCE_DIR;
if (!out) throw new Error("Set MW_EVIDENCE_DIR to a unique evidence folder.");
await mkdir(out, { recursive: true });
const viewports = [{ name: "1440x900", width: 1440, height: 900 }, { name: "1024x900", width: 1024, height: 900 }, { name: "390x844", width: 390, height: 844 }, { name: "320x740", width: 320, height: 740 }];
const cases = [
  { name: "designer-initial", role: "EMPLOYEE", action: async () => {} },
  { name: "designer-waiting", role: "EMPLOYEE", action: async page => { await page.getByRole("button", { name: /Waiting \/ blocked:/ }).click(); await page.locator(".task-queue-row.task-row-state-waiting").first().waitFor({ state: "visible" }); } },
  { name: "designer-attention", role: "EMPLOYEE", action: async page => { await page.getByRole("button", { name: /Needs action:/ }).click(); await page.getByRole("heading", { name: "Needs your attention" }).waitFor(); } },
  { name: "leader-populated", role: "LEADER", action: async page => { await page.locator(".task-queue-row").first().waitFor({ state: "visible" }); } },
  { name: "site-populated", role: "SITE", action: async () => {} },
  { name: "owner-five-holds", role: "OWNER", action: async page => { await page.getByText("5 items").first().waitFor(); } },
  { name: "create-dialog", role: "EMPLOYEE", action: async page => { await page.getByRole("button", { name: "Create task" }).click(); await page.getByRole("dialog").waitFor(); } },
  { name: "task-drawer", role: "EMPLOYEE", action: async page => { await page.locator(".task-queue-row").first().click(); await page.getByRole("dialog").waitFor(); } },
];
const browser = await chromium.launch({ headless: true });
const report = { classification: "SYNTHETIC READ-ONLY COMPONENT EVIDENCE; not authenticated, not production, and not visual acceptance", authentication: "none; browser fetch is fixture-mocked and all non-GET requests are rejected", generatedAt: new Date().toISOString(), fixture: base, fixtureSemantics: { endpoint: "/api/v1/my-work/attention", allSourceCounts: { task: 56, review: 56, approval: 3 }, pageSize: 25, ownerReassignmentHolds: 5, taskSubtasksProjection: "one synthetic child; canCreate=true; taskVersion=1" }, viewports: [], captures: [], interactions: [], controlLayoutChecks: [], sourceHashes: {} };
for (const viewport of process.env.MW_INTERACTIONS_ONLY === "1" ? [] : viewports) {
  for (const testCase of cases) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.width < 700, hasTouch: viewport.width < 700 });
    const consoleErrors = [];
    let captureError;
    page.setDefaultTimeout(8000);
    page.on("pageerror", error => consoleErrors.push(error.message));
    try {
      await page.goto(`${base}?role=${testCase.role}`, { waitUntil: "networkidle" });
      await page.locator("main.my-work-route").waitFor({ state: "visible" });
      await testCase.action(page);
    } catch (error) { captureError = error instanceof Error ? error.message : String(error); }
    const scrollAfterAction = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    await page.evaluate(() => window.scrollTo(0, 0));
    const metrics = await page.evaluate(() => {
      const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), bottom: Math.round(r.bottom) }; };
      const queue = document.querySelector(".task-queue-list");
      const row = document.querySelector(".task-queue-row");
      const rowButton = row?.querySelector(".task-queue-open-main");
      const actionableWork = document.querySelector(".actionable-work");
      const actionableList = actionableWork?.querySelector("ul");
      const actionableRow = actionableList?.querySelector(".actionable-work__row");
      const actionableControl = actionableRow?.querySelector("button, a");
      const main = document.querySelector("main");
      const route = document.querySelector(".my-work-route");
      const sections = Object.fromEntries([".my-work-phase-summary", ".my-work-obligations", ".my-work-queue-heading"].map(selector => [selector, rect(document.querySelector(selector))]));
      const nav = document.querySelector(".workspace-nav");
      const mobileNav = document.querySelector(".workspace-mobile-nav");
      const dialog = document.querySelector("dialog[open]");
      const footer = dialog?.querySelector(".task-create-dialog__footer, .task-detail-drawer__footer");
      const mobileBox = mobileNav?.getBoundingClientRect(), fixedMobileNav = mobileBox?.height ? mobileBox : undefined, firstBox = rowButton?.getBoundingClientRect();
      const navTop = nav?.getBoundingClientRect().width ? innerHeight : fixedMobileNav?.top ?? innerHeight;
      const visibleTop = firstBox ? Math.max(0, firstBox.top) : 0, visibleBottom = firstBox ? Math.min(navTop, firstBox.bottom) : 0;
      const actionBox = actionableControl?.getBoundingClientRect();
      const minimumScrollToClearFixedNav = actionBox && fixedMobileNav ? Math.max(0, Math.ceil(actionBox.bottom - fixedMobileNav.top + 8)) : 0;
      const textBounds = ["main h1", ".my-work-queue-heading h3", ".my-work-queue-heading p", ".actionable-work__header h3", ".actionable-work__header p", ".actionable-work__row-heading strong", ".task-queue-primary strong"].flatMap(selector => {
        const node = document.querySelector(selector);
        if (!node) return [];
        const bounds = rect(node);
        return [{ selector, bounds, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, textClipped: node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight }];
      });
      const fields = dialog?.classList.contains("task-create-dialog") ? [...dialog.querySelectorAll("input:not([type=checkbox]), select, textarea")].map(field => Math.round(field.getBoundingClientRect().height)) : [];
      return { viewport: { width: innerWidth, height: innerHeight }, scrollAtCapture: { x: window.scrollX, y: window.scrollY }, document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth, main: rect(main), route: rect(route), sections, queue: rect(queue), firstTask: rect(row), firstTaskButton: rect(rowButton), actionableWork: rect(actionableWork), actionableList: rect(actionableList), firstActionableRow: rect(actionableRow), firstActionableControl: rect(actionableControl), firstActionableControlTag: actionableControl?.tagName ?? null, minimumScrollToClearFixedNav, widgetTextBounds: textBounds, workspaceNav: rect(nav), mobileNav: rect(mobileNav), navTopForClearance: navTop, firstTaskUnobstructedPixels: Math.max(0, Math.round(visibleBottom - visibleTop)), openDialog: rect(dialog), dialogFooter: rect(footer), footerVisible: footer ? rect(footer).bottom <= innerHeight : null, bodyScrollLocked: document.body.style.overflow === "hidden", dialogActiveElement: dialog?.contains(document.activeElement) ? (document.activeElement.getAttribute("aria-label") || document.activeElement.textContent?.trim().slice(0, 70) || document.activeElement.tagName) : null, createFieldHeights: fields, createFieldsTouchSized: fields.length === 0 || fields.every(height => height >= 44) };
    });
    const postScrollActionClearance = await page.evaluate((minimumScroll) => {
      const action = document.querySelector(".actionable-work__row button, .actionable-work__row a");
      const nav = document.querySelector(".workspace-mobile-nav");
      if (minimumScroll > 0) window.scrollTo(0, minimumScroll);
      const item = action?.getBoundingClientRect(), navBox = nav?.getBoundingClientRect(), fixedNav = navBox?.height ? navBox : undefined;
      return { minimumScrollApplied: minimumScroll, actualScrollY: window.scrollY, actionTop: item ? Math.round(item.top) : null, actionBottom: item ? Math.round(item.bottom) : null, fixedNavTop: fixedNav ? Math.round(fixedNav.top) : null, pixelsAboveNav: item && fixedNav ? Math.round(fixedNav.top - item.bottom) : null, fullyAboveFixedNav: item && fixedNav ? item.bottom <= fixedNav.top : null };
    }, metrics.minimumScrollToClearFixedNav);
    const topCardContrast = testCase.name === "designer-attention" ? await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".my-work-top-cards .my-work-phase")];
      const rgb = value => {
        const match = value.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/);
        return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])] : null;
      };
      const luminance = color => {
        const channels = color.slice(0, 3).map(channel => { const c = channel / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
        return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
      };
      const ratio = (foreground, background) => { const a = luminance(foreground), b = luminance(background); return Number(((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2)); };
      const selectors = [".my-work-phase__title > span:last-child", ".my-work-action-count > strong", ".my-work-action-count > small", ".my-work-action-count-state", ".my-work-phase__hint > span"];
      const cardResults = cards.map(card => {
        const cardStyle = getComputedStyle(card), button = card.querySelector(".my-work-phase__select");
        const buttonStyle = button ? getComputedStyle(button) : null;
        const backgroundMatches = [...(cardStyle.backgroundImage.matchAll(/rgba?\([^)]*\)|#[\da-f]{3,8}/gi))].map(match => match[0]);
        const backgroundColors = backgroundMatches.length ? backgroundMatches.map(value => rgb(value) ?? (() => { const hex = value.slice(1); const full = hex.length === 3 ? [...hex].map(c => c + c).join("") : hex.slice(0, 6); return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16), 1]; })()) : [rgb(cardStyle.backgroundColor)].filter(Boolean);
        const opaque = backgroundColors.map(color => color[3] < 1 ? color.slice(0, 3).map(channel => Math.round(channel * color[3] + 255 * (1 - color[3]))) : color.slice(0, 3));
        if (!opaque.length || buttonStyle?.backgroundColor !== "rgba(0, 0, 0, 0)") opaque.push(rgb(buttonStyle?.backgroundColor ?? "")?.slice(0, 3) ?? [255, 255, 255]);
        const checks = selectors.flatMap(selector => [...card.querySelectorAll(selector)].filter(node => !node.closest("[aria-hidden=true]")).map(node => {
          const style = getComputedStyle(node), foreground = rgb(style.color)?.slice(0, 3) ?? [0, 0, 0], text = node.textContent?.trim() ?? "";
          const excluded = Boolean(button?.disabled) || /^(loading|unavailable|updating)(\b|\s)/i.test(text);
          const ratios = opaque.map(background => ratio(foreground, background));
          return { selector, text, foreground: style.color, computedCardBackgroundColor: cardStyle.backgroundColor, computedCardBackgroundImage: cardStyle.backgroundImage, effectiveBackgroundSamples: opaque.map(color => `rgb(${color.join(", ")})`), minimumContrastRatio: Math.min(...ratios), normalTextThreshold: 4.5, excludedDisabledOrLoading: excluded, passesNormalText: excluded || ratios.length > 0 && Math.min(...ratios) >= 4.5 };
        }));
        return { cardClass: card.className, selected: button?.getAttribute("aria-pressed") === "true", backgroundColor: cardStyle.backgroundColor, backgroundImage: cardStyle.backgroundImage, checks };
      });
      return { cards: cardResults, checks: cardResults.flatMap(card => card.checks) };
    }) : undefined;
    await page.evaluate(() => window.scrollTo(0, 0));
    const file = `${viewport.name}-${testCase.name}.png`;
    await page.screenshot({ path: `${out}/${file}`, fullPage: false, animations: "disabled" });
    const dialogCheck = (testCase.name === "create-dialog" || testCase.name === "task-drawer") && !captureError ? await (async () => {
      const closeLabel = testCase.name === "create-dialog" ? "Close create task" : "Close task details";
      const close = page.getByRole("button", { name: closeLabel });
      await close.click();
      await page.locator("dialog[open]").waitFor({ state: "detached" }).catch(() => {});
      return await page.evaluate((label) => ({ closed: document.querySelector("dialog[open]") === null, bodyScrollRestored: document.body.style.overflow !== "hidden", triggerFocusRestored: document.activeElement?.getAttribute("aria-label") === label || label === "task" && document.activeElement?.matches(".task-queue-open-main") }), testCase.name === "create-dialog" ? "Create task" : "task");
    })() : undefined;
    const attentionContrast = testCase.name === "designer-attention" ? await page.evaluate(() => {
      const rgb = value => { const match = value.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/); return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])] : null; };
      const luminance = color => { const channels = color.slice(0, 3).map(channel => { const c = channel / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }); return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]; };
      const contrast = (foreground, background) => { const a = luminance(foreground), b = luminance(background); return Number(((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2)); };
      const row = document.querySelector(".actionable-work__row");
      const button = row?.querySelector("button,a");
      const badge = row?.querySelector(".my-work-status");
      const badgeStyle = badge ? getComputedStyle(badge) : null;
      const foreground = rgb(badgeStyle?.color ?? "")?.slice(0, 3), background = rgb(badgeStyle?.backgroundColor ?? "")?.slice(0, 3);
      const nodes = row ? [...row.querySelectorAll(".my-work-status, .actionable-work__row-heading strong, .actionable-work__row-text small")] : [];
      const textChecks = nodes.map(node => {
        const style = getComputedStyle(node), fg = rgb(style.color)?.slice(0, 3) ?? [0, 0, 0];
        const bg = node.matches(".my-work-status") ? rgb(style.backgroundColor)?.slice(0, 3) ?? [255, 255, 255] : rgb(getComputedStyle(button).backgroundColor)?.slice(0, 3) ?? [255, 255, 255];
        const ratio = contrast(fg, bg);
        return { selector: node.className || node.tagName.toLowerCase(), text: node.textContent?.trim() ?? "", foreground: style.color, background: node.matches(".my-work-status") ? style.backgroundColor : getComputedStyle(button).backgroundColor, contrastRatio: ratio, normalTextThreshold: 4.5, passesNormalText: ratio >= 4.5 };
      });
      const rect = element => { if (!element) return null; const box = element.getBoundingClientRect(); return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height), bottom: Math.round(box.bottom) }; };
      return { rowStatus: badge?.textContent?.trim() ?? null, badgeBackground: badgeStyle?.backgroundColor ?? null, badgeForeground: badgeStyle?.color ?? null, badgeContrastRatio: foreground && background ? contrast(foreground, background) : null, badgePassesNormalText: foreground && background ? contrast(foreground, background) >= 4.5 : false, row: rect(row), action: rect(button), textChecks };
    }) : undefined;
    report.captures.push({ file, viewport: viewport.name, case: testCase.name, role: testCase.role, scrollAfterAction, topOfPageCapture: { scrollAtCapture: metrics.scrollAtCapture, firstTaskUnobstructedPixels: metrics.firstTaskUnobstructedPixels, navTopForClearance: metrics.navTopForClearance }, postScrollActionClearance, ...metrics, ...(topCardContrast ? { topCardContrast } : {}), ...(attentionContrast ? { attentionContrast } : {}), consoleErrors, ...(dialogCheck ? { dialogCheck } : {}), ...(captureError ? { captureError } : {}) });
    await page.close();
  }
}

// Exercise filter apply/reset, task opening, and attention paging at both phone sizes.
for (const viewport of viewports.filter(item => item.width < 700)) {
  const touch = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, isMobile: true, hasTouch: true });
  touch.setDefaultTimeout(8000);
  await touch.goto(`${base}?role=EMPLOYEE`, { waitUntil: "networkidle" });
  await touch.locator(".workspace-mobile-nav").waitFor({ state: "visible" });
  const navBefore = await touch.locator(".workspace-mobile-nav").boundingBox();
  let panelVisible = false, statusApplyPassed = false, resetPassed = false, drawerOpened = false, drawerFooterVisible = false;
  let attentionVisible = false, attentionCleared = false, attentionPagingPassed = false, taskClearancePixels = 0, interactionError;
  try {
    await touch.locator("details.task-display-options > summary").tap();
    await touch.locator("details.task-secondary-filters > summary").tap();
    const filterPanel = touch.locator(".task-filter-popover");
    await filterPanel.waitFor({ state: "visible" }); panelVisible = await filterPanel.isVisible();
    await touch.getByLabel("Filter by status").selectOption("WAITING");
    await touch.getByRole("button", { name: "Apply filters" }).tap();
    await touch.locator(".task-queue-row.task-row-state-waiting").first().waitFor({ state: "visible" }); statusApplyPassed = true;
    await touch.locator("details.task-secondary-filters > summary").tap();
    await touch.getByRole("button", { name: "Reset filters" }).tap();
    await touch.locator(".task-queue-row").first().waitFor({ state: "visible" }); resetPassed = true;
    await touch.locator(".task-queue-open-main").first().tap();
    await touch.locator("dialog.task-detail-drawer[open]").waitFor({ state: "visible" }); drawerOpened = true;
    drawerFooterVisible = await touch.locator(".task-detail-drawer__close-footer").isVisible().catch(() => false);
    taskClearancePixels = await touch.evaluate(() => { const row = document.querySelector(".task-queue-open-main")?.getBoundingClientRect(), nav = document.querySelector(".workspace-mobile-nav")?.getBoundingClientRect(); return row && nav ? Math.max(0, Math.min(row.bottom, nav.top) - Math.max(0, row.top)) : 0; });
    await touch.getByRole("button", { name: "Close task details" }).tap();
    await touch.locator("dialog.task-detail-drawer[open]").waitFor({ state: "detached" });
    await touch.getByRole("button", { name: /Needs action:/ }).tap();
    await touch.getByRole("heading", { name: "Needs your attention" }).waitFor(); attentionVisible = await touch.getByRole("region", { name: "Needs your attention" }).isVisible();
    const pager = touch.getByRole("navigation", { name: "Attention pages" });
    await pager.getByRole("button", { name: "Next" }).tap(); await pager.getByText("26–50 of 115 work items").waitFor();
    await pager.getByRole("button", { name: "Previous" }).tap(); await pager.getByText("1–25 of 115 work items").waitFor(); attentionPagingPassed = true;
    await touch.getByRole("button", { name: "Clear Needs action selection" }).tap(); attentionCleared = await touch.getByRole("heading", { name: "Needs your attention" }).count() === 0;
  } catch (error) { interactionError = error instanceof Error ? error.message : String(error); }
  report.interactions.push({ name: `${viewport.width}px touch filters/status/apply/reset/task/drawer/attention/page/clear`, navBefore, filterPanelOpened: panelVisible, statusApplyPassed, resetPassed, drawerOpened, drawerFooterVisible, taskClearancePixels, attentionVisible, attentionPagingPassed, attentionCleared, ...(interactionError ? { interactionError } : {}) });
  await touch.close();
}
for (const viewport of viewports.filter(item => item.width < 700)) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(8000);
  await page.goto(`${base}?role=EMPLOYEE`, { waitUntil: "networkidle" });
  await page.locator("details.task-display-options > summary").tap();
  const geometry = await page.evaluate(() => {
    const rect = node => { if (!node) return null; const r = node.getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) }; };
    const controls = { search: rect(document.querySelector(".task-search-control input")), filters: rect(document.querySelector("details.task-secondary-filters > summary")), more: rect(document.querySelector("details.task-display-options > summary")) };
    const overlaps = [];
    const entries = Object.entries(controls).filter(([, bounds]) => bounds && bounds.width && bounds.height);
    for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
      const [leftName, left] = entries[i], [rightName, right] = entries[j];
      if (left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top) overlaps.push([leftName, rightName]);
    }
    const textBounds = [".my-work-queue-heading h3", ".my-work-queue-heading p"].map(selector => {
      const node = document.querySelector(selector); return node ? { selector, bounds: rect(node), clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, clipped: node.scrollWidth > node.clientWidth } : null;
    }).filter(Boolean);
    return { viewport: { width: innerWidth, height: innerHeight }, controls, overlapPairs: overlaps, noControlOverlap: overlaps.length === 0, textBounds };
  });
  await page.locator("details.task-secondary-filters > summary").tap();
  const filterPopover = await page.locator(".task-filter-popover").boundingBox();
  report.controlLayoutChecks.push({ ...geometry, filterPopover: filterPopover && { x: Math.round(filterPopover.x), y: Math.round(filterPopover.y), width: Math.round(filterPopover.width), height: Math.round(filterPopover.height) }, filterPopoverVisible: await page.locator(".task-filter-popover").isVisible() });
  await page.close();
}
await browser.close();

for (const path of ["apps/web/visual-fixtures/mw-i02.tsx", "apps/web/visual-fixtures/capture-mw-i02.mjs", "apps/web/src/task.tsx", "apps/web/src/my-work-visual.css", "apps/web/src/my-work/my-work-parity.tsx", "apps/web/src/my-work/my-work-parity.css", "apps/web/src/actionable-work.tsx", "apps/web/src/actionable-work.css", "apps/web/src/task-create-dialog.tsx", "apps/web/src/task-create-dialog.css", "apps/web/src/task-detail-drawer.tsx", "apps/web/src/task-detail-drawer.css"]) {
  const { readFile } = await import("node:fs/promises");
  report.sourceHashes[path] = createHash("sha256").update(await readFile(new URL(`../../../${path}`, import.meta.url))).digest("hex");
}
await writeFile(`${out}/measurements.json`, JSON.stringify(report, null, 2));
const gallery = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Synthetic My Work component captures</title><style>body{font:15px/1.5 system-ui;margin:24px;background:#f7f5f0;color:#26312b}h1{font-size:24px}.notice{padding:12px 16px;border:1px solid #b88f38;background:#fff6df;border-radius:10px;margin:16px 0 24px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}.card{background:white;border:1px solid #e8e8e2;border-radius:12px;padding:12px}.card img{width:100%;height:auto;border-radius:6px}.meta{color:#536158;font-size:13px}</style><h1>My Work component captures</h1><div class="notice"><strong>Synthetic component evidence only.</strong> No authenticated browser or production data was used. These captures are not visual acceptance.</div><div class="grid">${report.captures.map(c => `<a class="card" href="${c.file}"><img src="${c.file}" alt="${c.role} ${c.case} at ${c.viewport}"><div class="meta">${c.viewport} · ${c.role} · ${c.case}</div></a>`).join("")}</div>`;
await writeFile(`${out}/index.html`, gallery);
console.log(JSON.stringify({ out, captures: report.captures.length, interactions: report.interactions, controlLayoutChecks: report.controlLayoutChecks, overflowFailures: report.captures.filter(c => !c.noHorizontalOverflow).map(c => c.file), consoleErrors: report.captures.flatMap(c => c.consoleErrors.map(error => `${c.file}: ${error}`)) }, null, 2));

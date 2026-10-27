import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

/**
 * V15-RC1 visual evidence for the task creation composer.
 *
 * Two capture strategies:
 * 1. "mock" mode (default, no credentials needed): intercepts the API with
 *    synthetic data matching the reference screenshots. Use this for visual
 *    comparison against the approved reference without a live database session.
 * 2. "live" mode (SENS_OWNER_SECRET / SENS_OWNER_CSRF set): uses a real
 *    authenticated session against the staging API.
 *
 * No database writes in either mode.
 */
const viewports = [
  { width: 1395, height: 884, name: "reference-1395x884" },
  { width: 1440, height: 768, name: "desktop-1440x768" },
  { width: 1024, height: 768, name: "desktop-1024x768" },
  { width: 1075, height: 884, name: "marked-1075x884" },
  { width: 783, height: 768, name: "compact-783x768" },
  { width: 390, height: 844, name: "mobile-390x844" },
  { width: 320, height: 700, name: "phone-320x700" },
  { width: 320, height: 650, name: "phone-320x650" },
];

const project = { id: "project-a", title: "Aadi3 Apartment — 8th Floor Interiors", status: "ACTIVE", branchId: "branch-a" };
const setupResponse = {
  actorEmployeeId: null,
  canAssign: true,
  canCreate: true,
  creationProfile: { version: 1, variant: "OWNER", resolution: "ACCOUNT_KIND" },
  projects: [project],
  planItems: [],
  employees: [
    { id: "emp-1", name: "Anjali Rao", homeBranchId: "branch-a" },
    { id: "emp-2", name: "Karthik Reddy", homeBranchId: "branch-a" },
    { id: "emp-3", name: "Meera Suresh", homeBranchId: "branch-a" },
    { id: "emp-4", name: "Sanjay Krishna", homeBranchId: "branch-a" },
    { id: "emp-5", name: "Pranav Chandrashekhar — Detached Technical Design & Site", homeBranchId: "branch-a" },
  ],
};
const optionsResponse = {
  actorEmployeeId: null,
  project,
  canAssign: true,
  canCreate: true,
  owners: [{ id: "emp-1", name: "Anjali Rao", homeBranchId: "branch-a" }, { id: "emp-2", name: "Karthik Reddy", homeBranchId: "branch-a" }],
  collaborators: [
    { id: "emp-1", name: "Anjali Rao", homeBranchId: "branch-a" },
    { id: "emp-2", name: "Karthik Reddy", homeBranchId: "branch-a" },
    { id: "emp-3", name: "Meera Suresh", homeBranchId: "branch-a" },
    { id: "emp-4", name: "Sanjay Krishna", homeBranchId: "branch-a" },
    { id: "emp-5", name: "Pranav Chandrashekhar — Detached Technical Design & Site", homeBranchId: "branch-a" },
  ],
  readAt: "2026-10-24T00:00:00Z",
};

function mockRoutes(page: Page): void {
  // Intercept every API route with sensible defaults; fall-through handles
  // routes we did not explicitly mock.
  page.route("**/api/v1/**", async route => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    if (p === "/api/v1/tasks/setup") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(setupResponse) });
    if (p.startsWith("/api/v1/tasks/creation-options")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...optionsResponse, project: url.searchParams.get("projectId") ? project : null }) });
    if (p === "/api/v1/tasks") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ total: 0, items: [] }) });
    if (p === "/api/v1/projects/setup") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ branches: [{ id: "branch-a", name: "Mumbai" }], employees: [] }) });
    if (p.endsWith("/plan")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ plan: null, items: [], history: [], capabilities: { complete: false, override: false } }) });
    if (p === "/api/v1/project-templates") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ templates: [], canManage: false, defaults: {} }) });
    if (p.startsWith("/api/v1/auth/session")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ account: { id: "owner-mock", kind: "OWNER", email: "owner@example.com", name: "Owner", state: "ACTIVE" }, csrfToken: "mock-csrf" }) });
    if (p.startsWith("/api/v1/auth/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "signed_in", account: { kind: "OWNER", name: "Owner", email: "owner@example.com" }, csrf: "mock-csrf" }) });
    if (p.startsWith("/api/v1/dashboard/sources/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ source: "tasks", today: "2026-10-24", sections: [] }) });
    // Default fallback for unmocked routes
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });
}

async function seed(page: Page): Promise<void> {
  await page.locator('input[aria-label="Task name"]').fill("Prepare kitchen working drawings");
  await page.locator('textarea[aria-label="Description (optional)"]').fill("Draw the kitchen elevations, joinery details and hardware schedule.");
  await page.locator('input[aria-label="Target date"]').fill("2026-11-06");
  await page.locator('input[aria-label="Reason"]').fill("Required for site coordination and fabrication.");
  // Select Type = Project task, then select the project.
  const typeSelect = page.locator('select[aria-label="Type"]').first();
  if (await typeSelect.isVisible().catch(() => false)) {
    const currentType = await typeSelect.inputValue();
    if (currentType !== "PROJECT") {
      await typeSelect.selectOption("PROJECT");
    }
    const projectSelect = page.locator('select[aria-label="Project"]').first();
    if (await projectSelect.isVisible().catch(() => false)) {
      await projectSelect.selectOption({ index: 1 }).catch(() => undefined);
    }
  }
  // Ownership uses its canonical select; the + menu manages collaborators.
  const owner = page.getByLabel("Primary owner", { exact: true });
  if (await owner.isVisible().catch(() => false)) await owner.selectOption("emp-1");
}

test("captures the V15 task creation composer at all reference viewports", async ({ page, context }) => {
  const live = !!(process.env.SENS_OWNER_SECRET && process.env.SENS_OWNER_CSRF);
  test.info().annotations.push({ description: live ? "live-session" : "mock-session" });

  if (live) {
    await context.addCookies([
      { name: "sense_sid", value: process.env.SENS_OWNER_SECRET!, url: "http://localhost:59553", httpOnly: true, sameSite: "strict" },
      { name: "sense_csrf", value: process.env.SENS_OWNER_CSRF!, url: "http://localhost:59553", httpOnly: true, sameSite: "strict" },
    ]);
  } else {
    mockRoutes(page);
  }

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    // /tasks?create=1 auto-opens the creation dialog via createIntent.
    await page.goto("/tasks?create=1", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForSelector(".task-composer-v15", { timeout: 45_000 });

    const dialog = page.locator("dialog[open]").first();
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await seed(page);
    for (const name of ["Target date", "Start date"]) {
      const control = dialog.getByLabel(name, { exact: true }).locator("..");
      const value = control.locator(".task-calendar-value");
      if (await value.count()) {
        await expect(value).toBeVisible();
        expect(await control.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      }
    }
    await dialog.locator(".task-create-dialog__body").evaluate(element => { element.scrollTop = 0; });
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await dialog.screenshot({ path: resolve(process.env.TASK_V15_EVIDENCE_DIR ?? "artifacts/task-v15", `${vp.name}.png`) });
    await dialog.getByRole("radiogroup", { name: "Priority" }).scrollIntoViewIfNeeded();
    for (const name of ["Low", "Medium", "High", "Critical"]) {
      const option = dialog.getByRole("radio", { name, exact: true });
      expect((await option.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      expect(await option.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    }
    const footer = await dialog.locator(".task-create-dialog__footer").boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(vp.height + 1);
    await dialog.screenshot({ path: resolve(process.env.TASK_V15_EVIDENCE_DIR ?? "artifacts/task-v15", `${vp.name}-controls.png`) });

    // Close without triggering the draft guard: navigate directly to clear the dialog.
    await page.goto("/tasks", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(400);
  }
});

test("marked task composer controls retain native dates, accessible priority selection and people search", async ({ page }) => {
  mockRoutes(page);
  await page.setViewportSize({ width: 1075, height: 884 });
  await page.goto("/tasks?create=1", { waitUntil: "domcontentloaded" });
  const dialog = page.getByRole("dialog", { name: "Create or assign a task", exact: true });
  await expect(dialog).toBeVisible();
  const title = dialog.getByPlaceholder("Task Name", { exact: true });
  const brief = dialog.getByPlaceholder("Add description...", { exact: true });
  await expect(title).toHaveAttribute("required", "");
  await expect(title).toHaveCSS("font-size", "18px");
  await expect(title).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
  await expect(brief).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
  await expect(dialog.getByText("· optional", { exact: true })).toHaveCount(0);
  await dialog.screenshot({ path: resolve(process.env.TASK_V15_EVIDENCE_DIR ?? "artifacts/task-v15", "writing-empty.png") });
  await title.fill("Prepare kitchen working drawings");
  await brief.fill("Draw the kitchen elevations and hardware schedule.");
  await expect(title).toHaveValue("Prepare kitchen working drawings");
  await expect(brief).toHaveValue("Draw the kitchen elevations and hardware schedule.");
  const add = dialog.getByRole("button", { name: "Add people", exact: true });
  await expect(add).toHaveText("+");
  await expect(add).toHaveCSS("border-top-style", "none");
  await expect(add).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await add.click();
  await expect(dialog.getByRole("searchbox", { name: "Search eligible people" })).toBeFocused();
  await dialog.getByRole("button", { name: "Add Meera Suresh", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Meera Suresh, collaborator. Press to manage." })).toBeVisible();
  await dialog.getByRole("button", { name: "Close people search" }).click();

  const priority = dialog.getByRole("radiogroup", { name: "Priority" });
  const selection = priority.locator(".task-priority-segmented__selection");
  const fills = new Set<string>();
  for (const level of ["Low", "Medium", "High", "Critical"]) {
    const option = priority.getByRole("radio", { name: level, exact: true });
    await option.click();
    await expect(option).toHaveAttribute("aria-checked", "true");
    await expect.poll(async () => {
      const selected = await selection.boundingBox(), button = await option.boundingBox();
      return selected && button ? Math.abs(selected.x - button.x) : 999;
    }).toBeLessThan(2);
    fills.add(await selection.evaluate(element => getComputedStyle(element).backgroundColor));
  }
  expect(fills.size).toBe(4);
  await priority.getByRole("radio", { name: "Critical" }).press("ArrowRight");
  await expect(priority.getByRole("radio", { name: "Low" })).toBeFocused();
  await expect(priority.getByRole("radio", { name: "Low" })).toHaveAttribute("aria-checked", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(selection).toHaveCSS("transition-duration", "0s");

  for (const name of ["Target date", "Start date"]) {
    const date = dialog.getByLabel(name, { exact: true });
    await expect(date).toHaveAttribute("type", "date");
    await expect(date).toHaveCSS("opacity", "0");
    await date.fill("");
    await expect(date.locator("..").locator("svg")).toBeVisible();
    await expect(date.locator("..").locator(".task-calendar-value")).toHaveCount(0);
    const box = await date.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await date.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await date.fill(name === "Target date" ? "2026-11-06" : "2026-11-05");
    await expect(date).toHaveAttribute("title", name === "Target date" ? "Target date: 06/11/2026" : "Start date: 05/11/2026");
    await expect(date.locator("..")).toHaveClass(/has-value/);
    await expect(date.locator("..").locator(".task-calendar-value")).toHaveText(name === "Target date" ? "06/11/2026" : "05/11/2026");
    await expect(date.locator("..").locator("svg")).toHaveCount(0);
  }
  await expect(dialog.locator(".task-composer__brief")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(dialog.locator(".task-composer__aside")).not.toHaveCSS("background-color", "rgb(255, 255, 255)");
  await dialog.screenshot({ path: resolve(process.env.TASK_V15_EVIDENCE_DIR ?? "artifacts/task-v15", "marked-controls.png") });
});

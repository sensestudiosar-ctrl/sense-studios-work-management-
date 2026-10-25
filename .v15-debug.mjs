import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 768 } });
await page.route("**/api/v1/**", async route => {
  const p = new URL(route.request().url()).pathname;
  if (p === "/api/v1/tasks/setup") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ actorEmployeeId: null, canAssign: true, canCreate: true, creationProfile: { version: 1, variant: "OWNER", resolution: "ACCOUNT_KIND" }, projects: [{ id: "project-a", title: "Aadi3", status: "ACTIVE", branchId: "branch-a" }], planItems: [], employees: [{ id: "emp-1", name: "Anjali Rao", homeBranchId: "branch-a" }] }) });
  if (p.startsWith("/api/v1/tasks/creation-options")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ actorEmployeeId: null, project: { id: "project-a", title: "Aadi3", status: "ACTIVE" }, canAssign: true, canCreate: true, owners: [{ id: "emp-1", name: "Anjali Rao" }], collaborators: [], readAt: "2026-10-24T00:00:00Z" }) });
  if (p.startsWith("/api/v1/auth/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "signed_in", account: { kind: "OWNER", name: "Owner", email: "owner@test", id: "acct-1" }, csrf: "mock-csrf" }) });
  if (p.startsWith("/api/v1/dashboard/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ source: "tasks", today: "2026-10-24", sections: [] }) });
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ total: 0, items: [] }) });
});
await page.goto("http://localhost:59553/tasks?create=1", { waitUntil: "networkidle" });
await page.waitForSelector(".task-composer-v15", { timeout: 20_000 });
const openDialogs = await page.locator("dialog[open]").count();
console.log("dialog[open] count:", openDialogs);
const taskName = page.locator('input[aria-label="Task name"]');
await taskName.fill("Prepare kitchen working drawings");
const desc = page.locator('textarea[aria-label="Description"]');
console.log("desc count:", await desc.count());
if (await desc.count()) await desc.fill("Kitchen elevations, joinery details and hardware schedule.");
await page.waitForTimeout(400);
// Screenshot the open dialog
const dialog = page.locator("dialog[open]").last();
await dialog.screenshot({ path: "artifacts/task-v15/debug-dialog.png" });
console.log("screenshot saved");
await browser.close();

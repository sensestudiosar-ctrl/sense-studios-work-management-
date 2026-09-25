import { expect, test } from "@playwright/test";

test("foundation shell reports ready without business data", async ({ page }) => {
  await page.route("**/api/v1/health/ready", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ready", service: "api", dependencies: { database: "ready" } })
  }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Work, clearly organized." })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("API and database ready");
  await expect(page.getByRole("heading", { name: "No workspace content yet" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("foundation shell shows the unavailable state and retry", async ({ page }) => {
  await page.route("**/api/v1/health/ready", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ status: "unavailable", dependencies: { database: "unavailable" } })
  }));
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("The service is unavailable right now.");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

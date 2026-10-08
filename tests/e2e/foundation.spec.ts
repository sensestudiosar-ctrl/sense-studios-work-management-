import { expect, test } from "@playwright/test";

test("signed-out identity shell is usable without business data", async ({ page }) => {
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Sign in with your passkey" })).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("session service failure offers retry and invalid sign-in stays generic", async ({ page }) => {
  let available = false;
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: available ? 401 : 503, contentType: "application/json", body: "{}" }));
  await page.route("**/api/v1/auth/passkey/login/options", (route) => route.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("alert")).toContainText("couldn’t check your session");
  available = true;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Sign in with your passkey" })).toBeVisible();
  await page.getByLabel("Work email").fill("unknown@example.test");
  await page.getByRole("button", { name: "Continue with passkey" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("alert")).toContainText("couldn’t sign you in");
});

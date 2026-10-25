import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";

const requireApi = createRequire(resolve("apps/api/package.json"));
const { Client } = requireApi("pg") as typeof import("pg");
let db: InstanceType<typeof Client>;
let email: string;
let accountId: string;
const originalPassword = "A long unique cedar river phrase!";

test.beforeAll(async () => {
  const path = resolve(".env.login-tools/acceptance-20261017/manifest.json");
  if (process.env.LOGIN_ACCEPTANCE_MANIFEST !== path) throw new Error("Explicit LOGIN acceptance manifest required");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  const url = new URL(manifest.databaseUrl);
  if (url.hostname !== "127.0.0.1" || url.port !== "59761" || url.pathname !== "/sense_login_flow_20261017_test" ||
      resolve(manifest.dataPath) !== resolve(path, "../data")) throw new Error("Refusing unowned browser target");
  db = new Client({ connectionString: manifest.databaseUrl });
  await db.connect();
  const identity = await db.query("SELECT system_identifier,current_database() AS name,current_user AS owner FROM pg_control_system()");
  expect(String(identity.rows[0].system_identifier)).toBe(manifest.systemId);
  expect(identity.rows[0].owner).toBe("login_test");
  expect(identity.rows[0].name).toBe("sense_login_flow_20261017_test");
  const fixture = JSON.parse(readFileSync(resolve(path, "../browser-fixture.json"), "utf8"));
  if (fixture.webOrigin !== "http://localhost:59763" || fixture.apiPort !== 59762) throw new Error("Preview identity mismatch");
  email = fixture.email;
  const account = await db.query('SELECT id FROM accounts WHERE "normalizedEmail"=$1 AND kind=\'CLIENT\' AND state=\'ACTIVE\'', [email]);
  expect(account.rowCount).toBe(1);
  accountId = account.rows[0].id;
});
test.afterAll(async () => { await db?.end(); });

for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
  test(`audience entries, keyboard and responsive layout at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    const routes = ["/sign-in", "/staff/sign-in", "/owner/sign-in", "/staff/recovery", "/bootstrap", "/enroll", "/owner-recovery",
      "/client-portal/login", "/client-portal/activate", "/client-portal/forgot-password", "/client-portal/reset-password",
      "/external-portal/consultant/login", "/external-portal/vendor/login", "/external-portal/factory/login"];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("h1").first()).toBeVisible();
      if (route.startsWith("/client-portal/")) await expect(page.getByText("Checking your client session…")).not.toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.activeElement?.tagName !== "BODY")).toBe(true);
      if (["/sign-in", "/staff/sign-in", "/staff/recovery", "/client-portal/login", "/client-portal/forgot-password", "/external-portal/consultant/login"].includes(route)) {
        await page.screenshot({ path: info.outputPath(route.replaceAll("/", "-").slice(1) + ".png"), fullPage: true });
      }
    }
  });
}

test("real client login, project-first landing, account separation and logout", async ({ page, context }, info) => {
  await page.goto("/client-portal/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(originalPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your project workspace" })).toBeVisible();
  await expect(page.locator(".client-dashboard")).toBeVisible();
  await expect(page.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute("aria-current", "page");
  expect((await context.cookies()).some(cookie => cookie.name === "sense_client_sid" && cookie.httpOnly)).toBe(true);
  expect((await context.cookies()).some(cookie => cookie.name === "sense_sid")).toBe(false);
  expect((await page.request.get("/api/v1/projects/setup")).status()).toBe(401);
  await page.getByRole("link", { name: "Account & security" }).click();
  await expect(page.getByRole("heading", { name: "Your account", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Password", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("client-account-security.png"), fullPage: true });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your projects, together" })).toBeVisible();
  expect((await page.request.get("/api/v1/client-portal/auth/session")).status()).toBe(401);
});

test("email-code alternative and generic recovery request remain usable", async ({ page }) => {
  await page.goto("/client-portal/login");
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await page.getByLabel("Email address").fill("unregistered-login-acceptance@example.test");
  await page.getByRole("button", { name: "Send sign-in code" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByLabel("One-time code")).toHaveAttribute("autocomplete", "one-time-code");
  await page.getByLabel("One-time code").fill("123456");
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page.getByRole("alert")).toContainText("could not be verified");
  await page.getByRole("button", { name: "Change email", exact: true }).click();
  await expect(page.getByLabel("Email address")).toHaveValue("unregistered-login-acceptance@example.test");
  await page.goto("/client-portal/forgot-password");
  await page.getByLabel("Email address").fill("unregistered-login-acceptance@example.test");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Request again in/ })).toBeDisabled();
});

test("reset proof is scrubbed, consumed once, signs out sessions and requires ordinary login", async ({ page }, info) => {
  const token = randomBytes(32).toString("base64url");
  // Synthetic proof is confined by the cluster/database/manifest guard above. No real mail is sent.
  await db.query('INSERT INTO client_portal_password_actions ("accountId","tokenHash",purpose,"credentialVersion","expiresAt","lastSentAt","sendWindowStartedAt","sendsInWindow") SELECT $1,$2,\'RESET\',version,CURRENT_TIMESTAMP+interval \'15 minutes\',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,1 FROM client_portal_passwords WHERE "accountId"=$1 ON CONFLICT ("accountId") DO UPDATE SET "tokenHash"=EXCLUDED."tokenHash",purpose=EXCLUDED.purpose,"credentialVersion"=EXCLUDED."credentialVersion","expiresAt"=EXCLUDED."expiresAt","consumedAt"=NULL', [accountId, createHash("sha256").update(token).digest("hex")]);
  const updated = "Another unique forest and ocean phrase!";
  await page.goto("/client-portal/reset-password#token=" + token);
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await page.getByLabel("New password", { exact: true }).fill(updated);
  await page.getByLabel("Confirm password", { exact: true }).fill(updated);
  await page.screenshot({ path: info.outputPath("client-reset-password.png"), fullPage: true });
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("heading", { name: "Your password is ready" })).toBeVisible();
  expect((await page.request.get("/api/v1/client-portal/auth/session")).status()).toBe(401);
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(updated);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your project workspace" })).toBeVisible();
  await page.getByRole("link", { name: "Account & security" }).click();
  await page.getByLabel("Current password", { exact: true }).fill(updated);
  await page.getByLabel("New password", { exact: true }).fill(originalPassword);
  await page.getByLabel("Confirm password", { exact: true }).fill(originalPassword);
  await page.getByRole("button", { name: "Change password and sign out" }).click();
  await expect(page.getByRole("heading", { name: "Your projects, together" })).toBeVisible();
  expect((await page.request.get("/api/v1/client-portal/auth/session")).status()).toBe(401);
  await page.goto("/client-portal/reset-password#token=" + token);
  await expect(page.getByRole("heading", { name: "This link is no longer available" })).toBeVisible();
});

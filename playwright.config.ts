import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "node:crypto";

const e2eBootstrapSecret = process.env.S02_E2E_BOOTSTRAP_SECRET ?? randomBytes(32).toString("base64url");
process.env.S02_E2E_BOOTSTRAP_SECRET = e2eBootstrapSecret;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:5173", trace: "retain-on-failure" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", testIgnore: "**/identity.spec.ts", use: { ...devices["Pixel 7"] } }
  ],
  webServer: [
    {
      command: "node apps/api/dist/main.js",
      url: "http://127.0.0.1:4000/api/v1/health/ready",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        WEB_ORIGIN: "http://localhost:5173",
        OWNER_BOOTSTRAP_EMAIL: "s02-e2e-owner@example.test",
        OWNER_BOOTSTRAP_SECRET: e2eBootstrapSecret
      }
    },
    {
      command: "pnpm --filter @sense/web dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    }
  ]
});

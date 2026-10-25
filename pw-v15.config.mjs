import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "task-v15-screenshot.spec.ts",
  timeout: 90_000,
  reporter: "list",
  use: { baseURL: "http://localhost:59553", trace: "retain-on-failure" },
  projects: [{ name: "desktop", testMatch: "task-v15-screenshot.spec.ts", use: { ...devices["Desktop Chrome"] } }],
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:59553", trace: "off" },
  projects: [
    { name: "v15", testMatch: "task-v15-screenshot.spec.ts", use: { ...devices["Desktop Chrome"] } },
  ],
});

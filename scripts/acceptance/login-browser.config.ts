import { defineConfig } from "@playwright/test";

// This configuration never launches/reuses the application's retained runtime.
export default defineConfig({
  testDir: "../../tests/acceptance",
  testMatch: "login-flows.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 60_000,
  outputDir: "../../.artifacts/login-auth-tests/browser",
  reporter: [["list"], ["json", { outputFile: ".artifacts/login-auth-tests/browser-results.json" }]],
  use: { baseURL: "http://localhost:59763", browserName: "chromium", trace: "retain-on-failure" }
});

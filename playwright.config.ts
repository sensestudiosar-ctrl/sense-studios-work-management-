import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "node:crypto";

const workersValue = process.env.PLAYWRIGHT_WORKERS;
if (workersValue !== undefined && (!/^[1-9]\d*$/.test(workersValue) || !Number.isSafeInteger(Number(workersValue)))) {
  throw new Error("PLAYWRIGHT_WORKERS must be a positive integer");
}
const workers = workersValue === undefined ? undefined : Number(workersValue);

const e2eBootstrapSecret = process.env.S02_E2E_BOOTSTRAP_SECRET ?? randomBytes(32).toString("base64url");
process.env.S02_E2E_BOOTSTRAP_SECRET = e2eBootstrapSecret;
const apiPort = Number(process.env.E2E_API_PORT ?? "4000");
const webPort = Number(process.env.E2E_WEB_PORT ?? "5173");
const webOrigin = `http://localhost:${webPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  ...(workers === undefined ? {} : { workers }),
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: webOrigin, trace: "retain-on-failure" },
  projects: [
    { name: "identity-desktop", testMatch: "**/identity.spec.ts", use: { ...devices["Desktop Chrome"] } },
    { name: "desktop-chromium", testIgnore: "**/identity.spec.ts", dependencies: ["identity-desktop"], use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", dependencies: ["identity-desktop"], testIgnore: "**/identity.spec.ts", use: { ...devices["Pixel 7"] } }
  ],
  webServer: [
    {
      command: "node apps/api/dist/main.js",
      url: `http://127.0.0.1:${apiPort}/api/v1/health/ready`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        PORT: String(apiPort),
        WEB_ORIGIN: webOrigin,
        OWNER_BOOTSTRAP_EMAIL: "s02-e2e-owner@example.test",
        OWNER_BOOTSTRAP_SECRET: e2eBootstrapSecret,
        ...(process.env.E2E_NAS_ROOT || process.env.NAS_ROOT
          ? { NAS_ROOT: process.env.E2E_NAS_ROOT ?? process.env.NAS_ROOT }
          : {})
      }
    },
    {
      command: `pnpm --filter @sense/web dev --port ${webPort}`,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: { API_PROXY_TARGET: `http://localhost:${apiPort}` }
    }
  ]
});

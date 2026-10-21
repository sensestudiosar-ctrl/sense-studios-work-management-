import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import base from "../../playwright.config.js";
import { loadRecoveryTestTarget } from "../../apps/api/src/recovery-test-target.js";

const root = resolve(import.meta.dirname, "../..");
loadRecoveryTestTarget(process.env, root, "DATABASE_URL");
const quoted = (value: string) => `"${value.replaceAll('"', '')}"`;
const apiCommand = `${quoted(process.execPath)} ${quoted(resolve(root, "apps/api/dist/main.js"))}`;
const webCommand = `${quoted(process.execPath)} ${quoted(resolve(root, "apps/web/node_modules/vite/bin/vite.js"))} preview --host 127.0.0.1 --port 58431 --strictPort`;
const servers = Array.isArray(base.webServer) ? base.webServer : [];
export default defineConfig({
  ...base,
  testDir: resolve(root, "tests/e2e"),
  outputDir: resolve(process.env.SENSE_RECOVERY_REPORT_DIR!, "browser-results"),
  forbidOnly: true,
  retries: 0,
  workers: 1,
  webServer: servers.map((server, index) => ({ ...server, cwd: root, command: index === 0 ? apiCommand : webCommand, reuseExistingServer: false })),
});

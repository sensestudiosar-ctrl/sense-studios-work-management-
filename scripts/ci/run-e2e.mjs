import { createConnection, createServer } from "node:net";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { assertNoSkipped, playwrightCounts, readJson, redact, reportDirectory, writeJson, writeSummary } from "./test-report-utils.mjs";

if (process.env.GITHUB_ACTIONS !== "true" || process.env.NODE_ENV !== "test" || process.env.S27_E2E_ENABLED !== "1") {
  throw new Error("Full browser acceptance requires the guarded GitHub CI environment.");
}
const reports = reportDirectory();
const reportFile = resolve(reports, "playwright.json");
const receiverPort = Number(process.env.S16_TEST_RECEIVER_PORT);
const receiverToken = process.env.S16_TEST_RECEIVER_TOKEN;
if (process.env.S16_TEST_RECEIVER_HOST !== "127.0.0.1" || !Number.isInteger(receiverPort) || receiverPort !== 58432 || !receiverToken) {
  throw new Error("The accounting test receiver must use the configured loopback-only fixture values.");
}
await mkdir(reports, { recursive: true });

const e2eMainDatabase = new URL(process.env.DATABASE_URL);
if (e2eMainDatabase.hostname !== "127.0.0.1" || e2eMainDatabase.port !== "58440" ||
    !/^\/sense_s27_main_s27_[a-z0-9_]+_test$/.test(e2eMainDatabase.pathname)) {
  throw new Error("The browser compatibility database must be the generated disposable S27 main target on loopback port 58440.");
}
// One legacy browser guard requires 57433. CI maps that loopback alias to this
// exact disposable PostgreSQL server; keep all API/Jest and PWA service URLs on 58440.
e2eMainDatabase.port = "57433";
const playwrightEnv = {
  ...process.env,
  CI: "true",
  PLAYWRIGHT_JSON_OUTPUT_NAME: reportFile,
  DATABASE_URL: e2eMainDatabase.href
};

async function portIsFree(port) {
  return new Promise((resolveFree, rejectFree) => {
    const server = createServer();
    server.once("error", (error) => error.code === "EADDRINUSE" ? resolveFree(false) : rejectFree(error));
    server.listen(port, "127.0.0.1", () => server.close(() => resolveFree(true)));
  });
}

function run(program, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(program, args, { cwd: process.cwd(), env: process.env, shell: false, windowsHide: true, ...options });
    const stdout = [];
    const stderr = [];
    child.stdout?.on("data", (chunk) => stdout.push(chunk));
    child.stderr?.on("data", (chunk) => stderr.push(chunk));
    child.once("error", rejectRun);
    child.once("close", (code) => {
      const out = redact(Buffer.concat(stdout).toString("utf8"));
      const err = redact(Buffer.concat(stderr).toString("utf8"));
      if (out) process.stdout.write(out);
      if (err) process.stderr.write(err);
      resolveRun({ code: code ?? 1, child });
    });
  });
}

function startProcess(name, program, args, env) {
  const child = spawn(program, args, {
    cwd: process.cwd(), env, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"]
  });
  const service = { name, child, logs: [], startError: null };
  child.stdout.on("data", (chunk) => service.logs.push(chunk));
  child.stderr.on("data", (chunk) => service.logs.push(chunk));
  child.once("error", (error) => { service.startError = error; });
  return service;
}

async function waitForService(service, probe, label) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (service.startError || service.child.exitCode !== null) throw new Error(`${label} exited before it became ready.`);
    try {
      const response = await fetch(probe, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return;
    } catch { /* Retry only the exact loopback health endpoint until the local fixture starts. */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`${label} did not become ready on its guarded loopback endpoint.`);
}

async function stopService(service) {
  if (!service || service.child.exitCode !== null || service.child.signalCode !== null) return;
  service.child.kill("SIGTERM");
  const closed = await Promise.race([
    new Promise((resolveClose) => service.child.once("close", resolveClose)),
    new Promise((resolveTimeout) => setTimeout(() => resolveTimeout(null), 5000))
  ]);
  if (closed === null) service.child.kill("SIGKILL");
}

const services = [];

async function receiverReady(service) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (service.startError || service.child.exitCode !== null) throw new Error("The loopback accounting test receiver exited before browser tests started.");
    const connected = await new Promise((resolveConnection) => {
      const socket = createConnection({ host: "127.0.0.1", port: receiverPort });
      socket.once("connect", () => { socket.destroy(); resolveConnection(true); });
      socket.once("error", () => resolveConnection(false));
    });
    if (connected) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error("The loopback accounting test receiver did not become ready.");
}

let failure;
try {
  for (const port of [58323, 58324, receiverPort]) {
    if (!await portIsFree(port)) throw new Error(`Refusing to use occupied CI fixture port ${port}.`);
  }
  const pwaApi = startProcess("production PWA API", process.execPath, ["apps/api/dist/main.js"], {
    ...process.env,
    PORT: "58324",
    WEB_ORIGIN: "http://localhost:58323",
    OWNER_BOOTSTRAP_EMAIL: "s02-e2e-owner@example.test",
    OWNER_BOOTSTRAP_SECRET: process.env.S02_E2E_BOOTSTRAP_SECRET,
    NAS_ROOT: process.env.E2E_NAS_ROOT
  });
  services.push(pwaApi);
  await waitForService(pwaApi, "http://127.0.0.1:58324/api/v1/health/ready", "Production PWA API");

  const pwaWeb = startProcess("production PWA preview", "pnpm", [
    "--filter", "@sense/web", "preview", "--host", "127.0.0.1", "--port", "58323", "--strictPort"
  ], { ...process.env, API_PROXY_TARGET: "http://127.0.0.1:58324" });
  services.push(pwaWeb);
  await waitForService(pwaWeb, "http://127.0.0.1:58323/", "Production PWA preview");

  const receiver = startProcess("accounting receiver", process.execPath, ["scripts/s16-accounting-test-receiver.mjs"], process.env);
  services.push(receiver);
  await receiverReady(receiver);
  const runResult = await run(process.execPath, [
    "node_modules/@playwright/test/cli.js", "test", "--reporter=github,json"
  ], { env: playwrightEnv });
  let report;
  try { report = await readJson(reportFile); }
  catch { throw new Error(`Playwright exited with code ${runResult.code} without a valid structured JSON report.`); }
  const counts = playwrightCounts(report);
  await writeJson(reportFile, report);
  await writeSummary([
    "## Desktop and mobile browser acceptance",
    "",
    `- ${counts.passed} passed, ${counts.failed} failed, ${counts.skipped} skipped, ${counts.total} total`
  ].join("\n"));
  process.stdout.write(`Playwright: ${counts.passed} passed, ${counts.failed} failed, ${counts.skipped} skipped.\n`);
  if (runResult.code !== 0) throw new Error(`Playwright exited with code ${runResult.code}.`);
  assertNoSkipped("Playwright", counts);
} catch (error) {
  failure = error;
} finally {
  for (const service of services.reverse()) await stopService(service);
}
if (failure) {
  for (const service of services) {
    const safeLogs = redact(Buffer.concat(service.logs).toString("utf8"));
    if (safeLogs) process.stderr.write(`[${service.name}]\n${safeLogs}`);
  }
  throw failure;
}

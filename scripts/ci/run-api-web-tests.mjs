import { mkdir } from "node:fs/promises";
import { createConnection, createServer } from "node:net";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import {
  assertNoSkipped, jestCounts, readJson, redact, reportDirectory, vitestCounts, writeJson, writeSummary
} from "./test-report-utils.mjs";

if (process.env.GITHUB_ACTIONS !== "true" || process.env.NODE_ENV !== "test" || process.env.S27_E2E_ENABLED !== "1") {
  throw new Error("Full fixture tests require the guarded GitHub CI environment.");
}
const workspace = process.cwd();
const reports = reportDirectory();
await mkdir(reports, { recursive: true });
const results = [];

function run(program, args, options) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(program, args, { cwd: workspace, env: process.env, shell: false, windowsHide: true, ...options });
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
      resolveRun(code ?? 1);
    });
  });
}

async function runJest(name, config, outputFile, additionalArgs = []) {
  const report = resolve(reports, outputFile);
  const cwd = resolve(workspace, "apps", "api");
  const code = await run(process.execPath, [
    "--experimental-vm-modules", "./node_modules/jest/bin/jest.js", "--config", config,
    "--json", "--outputFile", report, ...additionalArgs
  ], { cwd, env: { ...process.env, NODE_OPTIONS: "--experimental-vm-modules" } });
  let parsed;
  try { parsed = await readJson(report); }
  catch { results.push({ name, counts: null, code }); throw new Error(`${name} exited with code ${code} without a structured JSON report.`); }
  const counts = jestCounts(parsed);
  await writeJson(report, parsed);
  results.push({ name, counts, code });
  if (code !== 0) throw new Error(`${name} exited with code ${code}.`);
  assertNoSkipped(name, counts);
}

async function receiverPortIsFree() {
  const port = Number(process.env.S16_TEST_RECEIVER_PORT);
  return new Promise((resolveFree, rejectFree) => {
    const server = createServer();
    server.once("error", (error) => error.code === "EADDRINUSE" ? resolveFree(false) : rejectFree(error));
    server.listen(port, "127.0.0.1", () => server.close(() => resolveFree(true)));
  });
}

async function withAccountingReceiver(action) {
  const port = Number(process.env.S16_TEST_RECEIVER_PORT);
  if (process.env.S16_TEST_RECEIVER_HOST !== "127.0.0.1" || port !== 58432 || !process.env.S16_TEST_RECEIVER_TOKEN) {
    throw new Error("The API time integration suite requires the configured loopback-only fake accounting receiver.");
  }
  if (!await receiverPortIsFree()) throw new Error("Refusing to start the fake accounting receiver on an occupied port.");
  const receiver = spawn(process.execPath, ["scripts/s16-accounting-test-receiver.mjs"], {
    cwd: workspace,
    env: process.env,
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const logs = [];
  receiver.stdout.on("data", (chunk) => logs.push(chunk));
  receiver.stderr.on("data", (chunk) => logs.push(chunk));
  let failure;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (receiver.exitCode !== null) throw new Error("The fake accounting receiver exited before API integration began.");
      ready = await new Promise((resolveConnection) => {
        const socket = createConnection({ host: "127.0.0.1", port });
        socket.once("connect", () => { socket.destroy(); resolveConnection(true); });
        socket.once("error", () => resolveConnection(false));
      });
      if (ready) break;
      await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    }
    if (!ready) throw new Error("The fake accounting receiver did not become ready.");
    await action();
  } catch (error) {
    failure = error;
  } finally {
    receiver.kill("SIGTERM");
    const closed = await Promise.race([
      new Promise((resolveClose) => receiver.once("close", resolveClose)),
      new Promise((resolveTimeout) => setTimeout(() => resolveTimeout(null), 5000))
    ]);
    if (closed === null) receiver.kill("SIGKILL");
  }
  if (failure) {
    const safeLogs = redact(Buffer.concat(logs).toString("utf8"));
    if (safeLogs) process.stderr.write(safeLogs);
    throw failure;
  }
}

const failures = [];
for (const job of [
  () => runJest("API unit", "jest.config.cjs", "api-unit.json"),
  () => withAccountingReceiver(() => runJest("PostgreSQL integration", "jest.integration.config.cjs", "postgres-integration.json", ["--runInBand"]))
]) {
  try { await job(); } catch (error) { failures.push(error.message); }
}

const webReport = resolve(reports, "web-unit.json");
const webCode = await run(process.execPath, [
  "node_modules/vitest/vitest.mjs", "run", "--reporter=json", "--outputFile", webReport
], { cwd: resolve(workspace, "apps", "web") });
try {
  const parsed = await readJson(webReport);
  const counts = vitestCounts(parsed);
  await writeJson(webReport, parsed);
  results.push({ name: "Web unit", counts, code: webCode });
  if (webCode !== 0) throw new Error(`Web unit exited with code ${webCode}.`);
  assertNoSkipped("Web unit", counts);
} catch (error) {
  failures.push(error.message);
}

const summary = ["## API, PostgreSQL, and web test acceptance", ""];
for (const item of results) summary.push(`- ${item.name}: ${item.counts ? `${item.counts.passed} passed, ${item.counts.failed} failed, ${item.counts.skipped} skipped / pending` : `report unavailable (exit ${item.code})`}`);
if (failures.length) summary.push("", `**Rejected:** ${failures.join("; ")}`);
await writeSummary(summary.join("\n"));
process.stdout.write(`${summary.join("\n")}\n`);
if (failures.length) process.exitCode = 1;

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export function reportDirectory() {
  const directory = process.env.CI_REPORT_DIR;
  if (!directory || !directory.startsWith("/tmp/") && !directory.includes(".artifacts/ci/")) {
    throw new Error("CI_REPORT_DIR must point to this run's isolated report directory.");
  }
  return directory;
}

export function redact(value) {
  let text = String(value);
  for (const [key, secret] of Object.entries(process.env)) {
    if (secret && /(?:SECRET|TOKEN|PASSWORD|DATABASE_URL)/i.test(key)) text = text.replaceAll(secret, "[REDACTED]");
  }
  return text.replace(/(postgres(?:ql)?:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[REDACTED]@");
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(redactTree(value), null, 2)}\n`);
}

export function redactTree(value) {
  if (typeof value === "string") return redact(value);
  if (Array.isArray(value)) return value.map(redactTree);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redactTree(child)]));
  return value;
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeSummary(markdown) {
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown.trim()}\n`);
}

export function jestCounts(report) {
  return {
    passed: Number(report.numPassedTests ?? 0),
    failed: Number(report.numFailedTests ?? 0),
    skipped: Number(report.numPendingTests ?? 0) + Number(report.numTodoTests ?? 0),
    total: Number(report.numTotalTests ?? 0)
  };
}

export function vitestCounts(report) {
  return {
    passed: Number(report.numPassedTests ?? 0),
    failed: Number(report.numFailedTests ?? 0),
    skipped: Number(report.numPendingTests ?? 0),
    total: Number(report.numTotalTests ?? 0)
  };
}

export function playwrightCounts(report) {
  const skipped = Number(report.stats?.skipped);
  const failed = Number(report.stats?.unexpected ?? 0) + Number(report.stats?.flaky ?? 0) + Number(report.stats?.interrupted ?? 0);
  const passed = Number(report.stats?.expected ?? 0);
  if (!Number.isFinite(skipped) || !Number.isFinite(failed) || !Number.isFinite(passed)) throw new Error("Playwright JSON report is missing its structured run statistics.");
  return { passed, failed, skipped, total: passed + failed + skipped };
}

export function assertNoSkipped(name, counts) {
  if (!counts.total) throw new Error(`${name} reported no executed tests.`);
  if (counts.skipped > 0) throw new Error(`${name} acceptance rejected: ${counts.skipped} test(s) were skipped or marked pending.`);
  if (counts.failed > 0) throw new Error(`${name} acceptance failed: ${counts.failed} test(s) failed.`);
}

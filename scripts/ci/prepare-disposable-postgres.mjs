import { randomBytes } from "node:crypto";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.GITHUB_ACTIONS !== "true" || !process.env.GITHUB_RUN_ID || !process.env.GITHUB_ENV) {
  throw new Error("Disposable CI fixtures may be provisioned only inside a GitHub Actions job.");
}
if (Object.keys(process.env).some((key) => /^S\d+_(?:SOURCE|UPGRADE)_DATABASE_URL$|^S\d+_PRESERVATION_SNAPSHOT$/.test(key))) {
  throw new Error("Source, upgrade, or preservation inputs are not accepted by the GitHub fixture job.");
}

const { Client } = createRequire(new URL("../../apps/api/package.json", import.meta.url))("pg");
const workspace = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const attempt = process.env.GITHUB_RUN_ATTEMPT ?? "1";
const runId = `${process.env.GITHUB_RUN_ID}-${attempt}`;
if (!/^[0-9]+-[0-9]+$/.test(runId)) throw new Error("Unexpected GitHub run identity.");
const suffix = `${Date.now()}_${randomBytes(3).toString("hex")}`;
const envName = `s27-fresh-${suffix}.test`;
const toolsDir = resolve(workspace, ".env.s27-tools");
const reportDir = resolve(workspace, ".artifacts", "ci", runId);
const adminUser = "sense_ci_admin";
const runtimeUser = "sense_app_runtime";
const adminPassword = randomBytes(32).toString("base64url");
const runtimePassword = randomBytes(32).toString("base64url");
const clusterNames = { main: `sense-ci-pg-main-${runId}`, s14: `sense-ci-pg-s14-${runId}` };
const clusters = [
  { name: clusterNames.main, port: 58440 },
  { name: clusterNames.s14, port: 58441 }
];
const suiteKeys = [
  "DATABASE_URL", "S12_DATABASE_URL", "S13_DATABASE_URL", "S14_DATABASE_URL", "S15_DATABASE_URL",
  "S16_DATABASE_URL", "S17_DATABASE_URL", "S18_DATABASE_URL", "S19_DATABASE_URL", "S20_DATABASE_URL",
  "S21_DATABASE_URL", "S22_DATABASE_URL", "S23_DATABASE_URL", "S24_DATABASE_URL", "S24_SECURITY_DATABASE_URL",
  "S25_DATABASE_URL", "S25_SECURITY_DATABASE_URL", "S26_DATABASE_URL", "S26_SECURITY_DATABASE_URL",
  "S27_DATABASE_URL", "S27_SECURITY_DATABASE_URL"
];

function runDocker(args, options = {}) {
  const result = spawnSync("docker", args, { cwd: workspace, encoding: "utf8", stdio: "ignore", ...options });
  if (result.error || result.status !== 0) throw new Error("Could not start or inspect the disposable PostgreSQL fixture container.");
}

function databaseUrl(database, port, user = runtimeUser, password = runtimePassword) {
  const url = new URL(`postgresql://${user}:${password}@127.0.0.1:${port}/${database}`);
  url.searchParams.set("connection_limit", "8");
  return url.href;
}

function quoteIdentifier(value) {
  if (!/^sense_[a-z0-9_]+_test$/.test(value)) throw new Error("Refusing a database name outside the generated CI test-name pattern.");
  return `"${value.replaceAll('"', '""')}"`;
}

function quoteRole(value) {
  if (value !== adminUser && value !== runtimeUser) throw new Error("Refusing a role outside the CI fixture allowlist.");
  return `"${value}"`;
}

async function connectVerified(url, expectedDatabase, expectedPort) {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 4000, application_name: "sense-ci-fixture-identity" });
  await client.connect();
  try {
    const identity = (await client.query("SELECT current_database() AS database, inet_server_port() AS port")).rows[0];
    if (identity?.database !== expectedDatabase || Number(identity.port) !== expectedPort) {
      throw new Error("The disposable PostgreSQL server identity does not match the generated loopback target.");
    }
    return client;
  } catch (error) {
    await client.end().catch(() => undefined);
    throw error;
  }
}

async function waitForPostgres(url, database, port) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try { return await connectVerified(url, database, port); }
    catch { await new Promise((resolveWait) => setTimeout(resolveWait, 1000)); }
  }
  throw new Error(`Disposable PostgreSQL fixture did not become ready on loopback port ${port}.`);
}

async function ensureLoopbackPortFree(port) {
  const free = await new Promise((resolveFree, rejectFree) => {
    const server = createServer();
    server.once("error", (error) => error.code === "EADDRINUSE" ? resolveFree(false) : rejectFree(error));
    server.listen(port, "127.0.0.1", () => server.close(() => resolveFree(true)));
  });
  if (!free) throw new Error(`Refusing occupied GitHub fixture loopback port ${port}.`);
}

const started = [];
try {
  await mkdir(toolsDir, { recursive: true, mode: 0o700 });
  await mkdir(reportDir, { recursive: true });
  await ensureLoopbackPortFree(57433);
  for (const cluster of clusters) {
    const adminUrl = databaseUrl("postgres", cluster.port, adminUser, adminPassword);
    const readiness = new Client({ connectionString: adminUrl, connectionTimeoutMillis: 500, application_name: "sense-ci-port-preflight" });
    let available = true;
    try { await readiness.connect(); available = false; }
    catch { /* An unused loopback port is expected before the CI-owned container starts. */ }
    finally { await readiness.end().catch(() => undefined); }
    if (!available) throw new Error(`Refusing occupied loopback port ${cluster.port}.`);

    runDocker([
      "run", "--detach", "--rm", "--name", cluster.name,
      "--publish", `127.0.0.1:${cluster.port}:${cluster.port}`,
      ...(cluster.name === clusterNames.main ? ["--publish", "127.0.0.1:57433:58440"] : []),
      "--env", `POSTGRES_USER=${adminUser}`,
      "--env", "POSTGRES_PASSWORD",
      "--env", "POSTGRES_DB=postgres",
      "postgres:17.10-alpine3.24", "postgres", "-c", `port=${cluster.port}`
    ], { env: { ...process.env, POSTGRES_PASSWORD: adminPassword } });
    started.push(cluster.name);
    const admin = await waitForPostgres(adminUrl, "postgres", cluster.port);
    try {
      await admin.query(`CREATE ROLE ${quoteRole(runtimeUser)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${runtimePassword}'`);
    } finally { await admin.end(); }
  }

  const generated = {};
  const databaseNames = new Map();
  for (const key of suiteKeys) {
    const suiteNumber = key === "DATABASE_URL" ? "s27_main" : `s${/^S(\d+)/.exec(key)[1]}${key.includes("_SECURITY_") ? "_security" : ""}`;
    const name = `sense_${suiteNumber}_s27_${suffix}_test`;
    const port = key === "S14_DATABASE_URL" ? 58441 : 58440;
    if (databaseNames.has(name)) throw new Error("Generated CI database targets must be unique.");
    databaseNames.set(name, { key, port });
    generated[key] = databaseUrl(name, port);
  }

  const mainDatabase = new URL(generated.DATABASE_URL).pathname.slice(1);
  const s14Database = new URL(generated.S14_DATABASE_URL).pathname.slice(1);
  const mainAdmin = await connectVerified(databaseUrl("postgres", 58440, adminUser, adminPassword), "postgres", 58440);
  try {
    if ((await mainAdmin.query("SELECT 1 FROM pg_database WHERE datname = $1", [mainDatabase])).rowCount !== 0) throw new Error("Generated main fixture database already exists.");
    await mainAdmin.query(`CREATE DATABASE ${quoteIdentifier(mainDatabase)} OWNER ${quoteRole(adminUser)}`);
  }
  finally { await mainAdmin.end(); }
  const s14Admin = await connectVerified(databaseUrl("postgres", 58441, adminUser, adminPassword), "postgres", 58441);
  try {
    if ((await s14Admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [s14Database])).rowCount !== 0) throw new Error("Generated S14 fixture database already exists.");
    await s14Admin.query(`CREATE DATABASE ${quoteIdentifier(s14Database)} OWNER ${quoteRole(adminUser)}`);
  }
  finally { await s14Admin.end(); }

  const mainAlias = await connectVerified(databaseUrl(mainDatabase, 57433, adminUser, adminPassword), mainDatabase, 58440);
  await mainAlias.end();

  const environment = {
    ...generated,
    NODE_ENV: "test",
    S27_E2E_ENABLED: "1",
    S27_TEST_ENV_FILE: `.env.s27-tools/${envName}`,
    S27_EXPECTED_MIGRATIONS: "115",
    MIGRATION_DATABASE_URL: generated.DATABASE_URL,
    S16_ADMIN_DATABASE_URL: generated.S16_DATABASE_URL,
    API_TEST_WORKERS: "2",
    VITEST_WORKERS: "2",
    PLAYWRIGHT_WORKERS: "1",
    E2E_API_PORT: "58430",
    E2E_WEB_PORT: "58431",
    E2E_NAS_ROOT: `/tmp/sense-ci-nas-${runId}`,
    NAS_ROOT: `/tmp/sense-ci-nas-${runId}`,
    S02_E2E_BOOTSTRAP_SECRET: randomBytes(32).toString("base64url"),
    EMAIL_VERIFICATION_SECRET: randomBytes(32).toString("base64url"),
    EXTERNAL_SHARE_SECRET: randomBytes(32).toString("base64url"),
    S16_TEST_RECEIVER: "1",
    S16_TEST_RECEIVER_HOST: "127.0.0.1",
    S16_TEST_RECEIVER_PORT: "58432",
    S16_TEST_RECEIVER_TOKEN: randomBytes(32).toString("base64url"),
    TIME_ACCOUNTING_RECEIVER_URL: "http://127.0.0.1:58432",
    S18_SCREENSHOT_DIR: `.env.s18-tools/runs/${runId}/screenshots`,
    S24_SCREENSHOT_DIR: `.env.s24-tools/runs/${runId}/screenshots`,
    S25_SCREENSHOT_DIR: `.env.s25-tools/runs/${runId}/screenshots`,
    S26_SCREENSHOT_DIR: `.env.s26-tools/runs/${runId}/screenshots`,
    S27_SCREENSHOT_DIR: `.env.s27-tools/runs/${runId}/screenshots`,
    S27_RUN_ID: runId,
    S25_E2E_PRODUCTION_PREVIEW: "1",
    S27_E2E_PRODUCTION_PREVIEW: "1",
    S22_PWA_PREVIEW_URL: "http://localhost:58323"
  };
  for (let slice = 12; slice <= 27; slice += 1) environment[`S${slice}_E2E_ENABLED`] = "1";
  environment.S27_TEST_ENV_FILE = `.env.s27-tools/${envName}`;

  const envPath = resolve(toolsDir, envName);
  await writeFile(envPath, `${Object.entries(environment).map(([key, value]) => `${key}=${value}`).join("\n")}\n`, { flag: "wx", mode: 0o600 });
  const manifest = {
    version: 1,
    provider: "github-actions-disposable-postgres",
    runId,
    suffix,
    targets: [...databaseNames.entries()].map(([database, target]) => ({ database, key: target.key, port: target.port, migrations: 115 })),
    e2eCompatibilityAlias: "The GitHub-only loopback port 57433 maps to this run's disposable main server listening on 58440; it is verified against current_database() before tests.",
    identityChecks: "Each server and database name was checked before fixture creation; accepted local databases are not referenced."
  };
  await writeFile(resolve(toolsDir, `ci-fixtures-${suffix}.json`), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx", mode: 0o600 });

  for (const [targetUrl, adminUrl, label] of [
    [generated.DATABASE_URL, databaseUrl(mainDatabase, 58440, adminUser, adminPassword), "main"],
    [generated.S14_DATABASE_URL, databaseUrl(s14Database, 58441, adminUser, adminPassword), "S14"]
  ]) {
    const targetName = new URL(targetUrl).pathname.slice(1);
    const targetPort = Number(new URL(targetUrl).port);
    const verifiedTarget = await connectVerified(adminUrl, targetName, targetPort);
    await verifiedTarget.end();
    const migrated = spawnSync("pnpm", ["--filter", "@sense/api", "db:migrate:deploy"], {
      cwd: workspace,
      env: { ...process.env, ...environment, DATABASE_URL: targetUrl, MIGRATION_DATABASE_URL: adminUrl },
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024
    });
    if (migrated.status !== 0) throw new Error(`Prisma migrations failed for the isolated ${label} CI fixture.`);
  }

  const mainClient = await connectVerified(databaseUrl(mainDatabase, 58440, adminUser, adminPassword), mainDatabase, 58440);
  try {
      const migrations = await mainClient.query("SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS count, count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS incomplete FROM _prisma_migrations");
      if (migrations.rows[0]?.count !== 115 || migrations.rows[0]?.incomplete !== 0) throw new Error("The CI fixture template is not at migration 115 with a clean migration ledger.");
  } finally { await mainClient.end(); }

  const admin = await connectVerified(databaseUrl("postgres", 58440, adminUser, adminPassword), "postgres", 58440);
  try {
    for (const [database, target] of databaseNames) {
      if (database === mainDatabase || database === s14Database) continue;
      if (target.port !== 58440) throw new Error("Unexpected secondary-cluster database target.");
      if ((await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [database])).rowCount !== 0) throw new Error("Generated suite database already exists.");
      await admin.query(`CREATE DATABASE ${quoteIdentifier(database)} WITH TEMPLATE ${quoteIdentifier(mainDatabase)} OWNER ${quoteRole(adminUser)}`);
    }
  } finally { await admin.end(); }

  const s14Client = await connectVerified(databaseUrl(s14Database, 58441, adminUser, adminPassword), s14Database, 58441);
  try {
    const migrations = await s14Client.query("SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS count, count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS incomplete FROM _prisma_migrations");
    if (migrations.rows[0]?.count !== 115 || migrations.rows[0]?.incomplete !== 0) throw new Error("The isolated S14 fixture is not at migration 115 with a clean ledger.");
  } finally { await s14Client.end(); }

  for (const [database, target] of databaseNames) {
    const runtimeClient = await connectVerified(generated[target.key], database, target.port);
    await runtimeClient.end();
    const targetClient = await connectVerified(databaseUrl(database, target.port, adminUser, adminPassword), database, target.port);
    try {
      const migrations = await targetClient.query("SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS count, count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS incomplete FROM _prisma_migrations");
      if (migrations.rows[0]?.count !== 115 || migrations.rows[0]?.incomplete !== 0) throw new Error(`CI target ${target.key} is not at migration 115 with a clean migration ledger.`);
    } finally { await targetClient.end(); }
  }

  await mkdir(environment.NAS_ROOT, { recursive: true });
  for (const path of [environment.S18_SCREENSHOT_DIR, environment.S24_SCREENSHOT_DIR, environment.S25_SCREENSHOT_DIR, environment.S26_SCREENSHOT_DIR, environment.S27_SCREENSHOT_DIR]) {
    await mkdir(resolve(workspace, path), { recursive: true });
  }
  await appendFile(process.env.GITHUB_ENV, `${Object.entries(environment).map(([key, value]) => `${key}=${value}`).join("\n")}\nCI_REPORT_DIR=${reportDir}\n`, { mode: 0o600 });
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, "\n### Disposable PostgreSQL fixtures\n\n- 21 isolated suite targets were identity-checked at migration 115 across loopback ports 58440 and 58441.\n- S26 source migration 109 and populated-clone preservation remain separate local PostgreSQL gates; this ephemeral GitHub fixture does not claim those checks.\n");
  }
  process.stdout.write(`Provisioned ${databaseNames.size} isolated suite databases at migration 115 across loopback ports 58440 and 58441. CI credentials were generated for this run and were not printed.\n`);
} catch (error) {
  for (const name of started) spawnSync("docker", ["rm", "--force", name], { cwd: workspace, stdio: "ignore" });
  throw error;
}

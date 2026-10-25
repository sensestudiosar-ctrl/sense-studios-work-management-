import { randomBytes, randomUUID } from "node:crypto";
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
const mainPort = 58440;
const s14Port = 58441;
const mainCompatibilityPort = 57433;
const clusters = [
  { name: clusterNames.main, port: mainPort },
  { name: clusterNames.s14, port: s14Port }
];
const suiteKeys = [
  "DATABASE_URL", "S12_DATABASE_URL", "S13_DATABASE_URL", "S14_DATABASE_URL", "S15_DATABASE_URL",
  "S16_DATABASE_URL", "S17_DATABASE_URL", "S18_DATABASE_URL", "S19_DATABASE_URL", "S20_DATABASE_URL",
  "S21_DATABASE_URL", "S22_DATABASE_URL", "S23_DATABASE_URL", "S24_DATABASE_URL", "S24_SECURITY_DATABASE_URL",
  "S25_DATABASE_URL", "S25_SECURITY_DATABASE_URL", "S26_DATABASE_URL", "S26_SECURITY_DATABASE_URL",
  "S27_DATABASE_URL", "S27_SECURITY_DATABASE_URL", "S27_PARITY_DATABASE_URL"
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
  for (const port of [mainPort, s14Port, mainCompatibilityPort]) await ensureLoopbackPortFree(port);
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
      ...(cluster.name === clusterNames.main ? ["--publish", `127.0.0.1:${mainCompatibilityPort}:${mainPort}`] : []),
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
    const suiteNumber = key === "DATABASE_URL" ? "s27_main" : `s${/^S(\d+)/.exec(key)[1]}${key.includes("_SECURITY_") ? "_security" : key.includes("_PARITY_") ? "_parity" : ""}`;
    const name = `sense_${suiteNumber}_s27_${suffix}_test`;
    const port = key === "S14_DATABASE_URL"
      ? s14Port
      : mainPort;
    const serverPort = key === "S14_DATABASE_URL" ? s14Port : mainPort;
    if (databaseNames.has(name)) throw new Error("Generated CI database targets must be unique.");
    databaseNames.set(name, { key, port, serverPort });
    generated[key] = databaseUrl(name, port);
  }

  const mainDatabase = new URL(generated.DATABASE_URL).pathname.slice(1);
  const s14Database = new URL(generated.S14_DATABASE_URL).pathname.slice(1);
  const mainAdmin = await connectVerified(databaseUrl("postgres", mainPort, adminUser, adminPassword), "postgres", mainPort);
  try {
    if ((await mainAdmin.query("SELECT 1 FROM pg_database WHERE datname = $1", [mainDatabase])).rowCount !== 0) throw new Error("Generated main fixture database already exists.");
    await mainAdmin.query(`CREATE DATABASE ${quoteIdentifier(mainDatabase)} OWNER ${quoteRole(adminUser)}`);
  }
  finally { await mainAdmin.end(); }
  const s14Admin = await connectVerified(databaseUrl("postgres", s14Port, adminUser, adminPassword), "postgres", s14Port);
  try {
    if ((await s14Admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [s14Database])).rowCount !== 0) throw new Error("Generated S14 fixture database already exists.");
    await s14Admin.query(`CREATE DATABASE ${quoteIdentifier(s14Database)} OWNER ${quoteRole(adminUser)}`);
  }
  finally { await s14Admin.end(); }

  const mainAlias = await connectVerified(databaseUrl(mainDatabase, mainCompatibilityPort, adminUser, adminPassword), mainDatabase, mainPort);
  await mainAlias.end();

  const environment = {
    ...generated,
    NODE_ENV: "test",
    S27_E2E_ENABLED: "1",
    S27_TEST_ENV_FILE: `.env.s27-tools/${envName}`,
    S27_EXPECTED_MIGRATIONS: "120",
    MIGRATION_DATABASE_URL: databaseUrl(mainDatabase, mainPort, adminUser, adminPassword),
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
  await writeFile(resolve(toolsDir, "run-aut-batch-s27.mjs"), 'await import("../scripts/ci/run-aut-batch-s27.mjs");\n', { mode: 0o600 });
  const manifest = {
    version: 1,
    provider: "github-actions-disposable-postgres",
    runId,
    suffix,
    targets: [...databaseNames.entries()].map(([database, target]) => ({ database, key: target.key, hostPort: target.port, serverPort: target.serverPort, migrations: 120 })),
    e2eCompatibilityAlias: `The retained GitHub-only loopback alias ${mainCompatibilityPort} maps to this run's disposable main server listening on ${mainPort}. All current manifest-bound suite URLs use actual server ports ${mainPort}/${s14Port}.`,
    runtimeRoles: `Test clients use ${runtimeUser}; migration and fixture provisioning use the run-scoped ${adminUser}. Only the isolated S22 database grants ${runtimeUser} USAGE and CREATE on schema public and transfers audit_events ownership for its injected-trigger rollback test.`,
    identityChecks: "Each server and database name was checked before fixture creation; accepted local databases are not referenced."
  };
  await writeFile(resolve(toolsDir, `ci-fixtures-${suffix}.json`), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx", mode: 0o600 });

  for (const [targetUrl, adminUrl, label, targetPort] of [
    [generated.DATABASE_URL, databaseUrl(mainDatabase, mainPort, adminUser, adminPassword), "main", mainPort],
    [generated.S14_DATABASE_URL, databaseUrl(s14Database, s14Port, adminUser, adminPassword), "S14", s14Port]
  ]) {
    const targetName = new URL(targetUrl).pathname.slice(1);
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

  const mainClient = await connectVerified(databaseUrl(mainDatabase, mainPort, adminUser, adminPassword), mainDatabase, mainPort);
  try {
      const migrations = await mainClient.query("SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS count, count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS incomplete FROM _prisma_migrations");
      if (migrations.rows[0]?.count !== 120 || migrations.rows[0]?.incomplete !== 0) throw new Error("The CI fixture template is not at migration 120 with a clean migration ledger.");
  } finally { await mainClient.end(); }

  const admin = await connectVerified(databaseUrl("postgres", mainPort, adminUser, adminPassword), "postgres", mainPort);
  try {
    for (const [database, target] of databaseNames) {
      if (database === mainDatabase || database === s14Database) continue;
      if (target.serverPort !== mainPort) throw new Error("Unexpected secondary-cluster database target.");
      if ((await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [database])).rowCount !== 0) throw new Error("Generated suite database already exists.");
      await admin.query(`CREATE DATABASE ${quoteIdentifier(database)} WITH TEMPLATE ${quoteIdentifier(mainDatabase)} OWNER ${quoteRole(adminUser)}`);
      if (target.key === "S22_DATABASE_URL") {
        const s22 = await connectVerified(databaseUrl(database, mainPort, adminUser, adminPassword), database, mainPort);
        try {
          await s22.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${quoteRole(runtimeUser)}`);
          await s22.query(`ALTER TABLE audit_events OWNER TO ${quoteRole(runtimeUser)}`);
          const privileges = (await s22.query("SELECT has_schema_privilege($1, 'public', 'USAGE') AS can_use, has_schema_privilege($1, 'public', 'CREATE') AS can_create, pg_get_userbyid(c.relowner) = $1 AS owns_audit_events FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'audit_events'", [runtimeUser])).rows[0];
          if (!privileges?.can_use || !privileges?.can_create || !privileges?.owns_audit_events) throw new Error("The isolated S22 runtime role lacks its required test-only trigger ownership.");
        }
        finally { await s22.end(); }
      }
      if (target.key === "S27_PARITY_DATABASE_URL") {
        const parity = await connectVerified(databaseUrl(database,mainPort,adminUser,adminPassword),database,mainPort);
        try {
          await parity.query('INSERT INTO organizations(id,name,"updatedAt") VALUES($1,$2,CURRENT_TIMESTAMP)',[randomUUID(),"CI parity isolated fixture"]);
          await parity.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'OWNER\',\'ACTIVE\',CURRENT_TIMESTAMP)',[randomUUID(),`ci-parity-${suffix}@example.test`]);
        } finally { await parity.end(); }
      }
    }
  } finally { await admin.end(); }

  const s14Client = await connectVerified(databaseUrl(s14Database, s14Port, adminUser, adminPassword), s14Database, s14Port);
  try {
    const migrations = await s14Client.query("SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS count, count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS incomplete FROM _prisma_migrations");
    if (migrations.rows[0]?.count !== 120 || migrations.rows[0]?.incomplete !== 0) throw new Error("The isolated S14 fixture is not at migration 120 with a clean ledger.");
  } finally { await s14Client.end(); }

  for (const [database, target] of databaseNames) {
    const runtimeClient = await connectVerified(generated[target.key], database, target.serverPort);
    await runtimeClient.end();
    const targetClient = await connectVerified(databaseUrl(database, target.serverPort, adminUser, adminPassword), database, target.serverPort);
    try {
      const migrations = await targetClient.query("SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS count, count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS incomplete FROM _prisma_migrations");
      if (migrations.rows[0]?.count !== 120 || migrations.rows[0]?.incomplete !== 0) throw new Error(`CI target ${target.key} is not at migration 120 with a clean migration ledger.`);
    } finally { await targetClient.end(); }
  }

  // Keep committed API evidence intact. Browser enrollment uses new pristine
  // clones; no API database is reset or restored over an existing target.
  const browserSuffix = `${Date.now()}_${randomBytes(3).toString("hex")}`;
  const browserEnvName = `s27-fresh-${browserSuffix}.test`;
  const browserEnvironment = {...environment,S27_TEST_ENV_FILE:`.env.s27-tools/${browserEnvName}`,S27_RUN_ID:`${runId}-browser`,S27_SCREENSHOT_DIR:`.env.s27-tools/runs/${runId}-browser/screenshots`};
  const browserTargets=[];
  for (const [database,target] of databaseNames) {
    const name=database.replace(`_s27_${suffix}_test`,`_s27_${browserSuffix}_test`);
    if(name===database)throw new Error("Distinct browser target suffix required");
    const template=target.key==="S14_DATABASE_URL"?s14Database:mainDatabase;
    const browserAdmin=await connectVerified(databaseUrl("postgres",target.serverPort,adminUser,adminPassword),"postgres",target.serverPort);
    try {
      if((await browserAdmin.query("SELECT 1 FROM pg_database WHERE datname=$1",[name])).rowCount!==0)throw new Error("Browser fixture already exists; refusing reuse");
      await browserAdmin.query(`CREATE DATABASE ${quoteIdentifier(name)} WITH TEMPLATE ${quoteIdentifier(template)} OWNER ${quoteRole(adminUser)}`);
    } finally { await browserAdmin.end(); }
    browserEnvironment[target.key]=databaseUrl(name,target.port);
    if(target.key==="DATABASE_URL")browserEnvironment.MIGRATION_DATABASE_URL=databaseUrl(name,target.serverPort,adminUser,adminPassword);
    const verified=await connectVerified(browserEnvironment[target.key],name,target.serverPort);
    try {
      const ledger=await verified.query("SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS n,count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS incomplete FROM _prisma_migrations");
      if(ledger.rows[0].n!==120||ledger.rows[0].incomplete!==0)throw new Error("Browser fixture schema mismatch");
      const accounts=await verified.query("SELECT count(*)::int AS n FROM accounts");
      if(accounts.rows[0].n!==0)throw new Error("Browser fixture must be pristine before enrollment");
    } finally { await verified.end(); }
    browserTargets.push({database:name,key:target.key,port:target.port,migrations:120,pristine:true});
  }
  if(new URL(browserEnvironment.MIGRATION_DATABASE_URL).pathname!==new URL(browserEnvironment.DATABASE_URL).pathname)throw new Error("Browser runtime and migration fixtures must identify the same fresh database");
  await writeFile(resolve(toolsDir,browserEnvName),`${Object.entries(browserEnvironment).map(([key,value])=>`${key}=${value}`).join("\n")}\n`,{flag:"wx",mode:0o600});
  await writeFile(resolve(reportDir,"browser-fixtures.json"),JSON.stringify({provider:"github-actions-disposable-postgres",runId,targets:browserTargets,apiFixturesPreserved:true},null,2),{flag:"wx",mode:0o600});
  environment.SENSE_CI_BROWSER_ENV_FILE=`.env.s27-tools/${browserEnvName}`;
  await mkdir(environment.NAS_ROOT, { recursive: true });
  await mkdir(resolve(environment.NAS_ROOT, 'parity'), { recursive: true });
  for (const path of [environment.S18_SCREENSHOT_DIR, environment.S24_SCREENSHOT_DIR, environment.S25_SCREENSHOT_DIR, environment.S26_SCREENSHOT_DIR, environment.S27_SCREENSHOT_DIR]) {
    await mkdir(resolve(workspace, path), { recursive: true });
  }
  await appendFile(process.env.GITHUB_ENV, `${Object.entries(environment).map(([key, value]) => `${key}=${value}`).join("\n")}\nCI_REPORT_DIR=${reportDir}\n`, { mode: 0o600 });
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### Disposable PostgreSQL fixtures\n\n- 21 isolated suite targets were identity-checked at migration 120 on servers listening on loopback ports ${mainPort} (main) and ${s14Port} (S14).\n- The disposable main server is also exposed on loopback port ${mainCompatibilityPort} for the existing E2E DATABASE_URL contract; identity checks verify its actual server port remains ${mainPort}.\n- Only the isolated S22 test database grants the runtime role USAGE and CREATE on schema public and transfers audit_events ownership for its injected-trigger rollback test.\n- Test clients use the restricted runtime role; migrations and provisioning use the run-scoped administrator.\n- S26 source migration 109 and populated-clone preservation remain separate local PostgreSQL gates; this ephemeral GitHub fixture does not claim those checks.\n`);
  }
  process.stdout.write(`Provisioned ${databaseNames.size} isolated suite databases at migration 120 on loopback servers ${mainPort} (main) and ${s14Port} (S14), with the main compatibility alias on ${mainCompatibilityPort}. CI credentials were generated for this run and were not printed.\n`);
} catch (error) {
  for (const name of started) spawnSync("docker", ["rm", "--force", name], { cwd: workspace, stdio: "ignore" });
  throw error;
}

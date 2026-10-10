import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, realpathSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const toolsRoot = realpathSync(resolve(workspace, ".env.s27-tools")) + sep;
const envFile = realpathSync(resolve(workspace, process.argv[2] ?? ""));
const relativeEnvFile = relative(toolsRoot, envFile);
assert.ok(relativeEnvFile && !relativeEnvFile.startsWith("..") && !relativeEnvFile.includes(sep) && /^s27-fresh-[0-9]+_[a-f0-9]+\.test$/.test(relativeEnvFile), "Pass the generated S27 environment under .env.s27-tools");

const environment = Object.fromEntries(readFileSync(envFile, "utf8")
  .split(/\r?\n/)
  .map((line) => /^([^#=\s]+)=(.*)$/.exec(line))
  .filter(Boolean)
  .map(([, key, value]) => [key, value.trim().replace(/^"|"$/g, "")]));

assert.equal(environment.NODE_ENV, "test", "The S27 automation runner is test-only");
assert.equal(environment.S27_E2E_ENABLED, "1", "S27 browser acceptance must be explicitly enabled");
const runtimeUrl = new URL(environment.DATABASE_URL ?? "");
const adminUrl = new URL(environment.MIGRATION_DATABASE_URL ?? "");
assert.ok(["127.0.0.1", "localhost"].includes(runtimeUrl.hostname), "S27 runtime database must be loopback-only");
assert.equal(runtimeUrl.port, "58440", "S27 browser runtime must use the guarded CI compatibility port");
assert.match(runtimeUrl.pathname, /^\/sense_s27_main_s27_[0-9]+_[a-f0-9]+_test$/);
assert.ok(["127.0.0.1", "localhost"].includes(adminUrl.hostname), "S27 migration database must be loopback-only");
assert.equal(adminUrl.port, "57433", "S27 fixture migrations must remain on the main disposable PostgreSQL listener");
assert.equal(adminUrl.pathname, runtimeUrl.pathname, "S27 runtime and migration URLs must identify the same run-scoped database");
assert.equal(adminUrl.username, "sense_ci_admin", "Only the run-scoped fixture administrator may own the migration URL");

Object.assign(process.env, environment);
const require = createRequire(resolve(workspace, "apps/api/package.json"));
require("reflect-metadata");
const { NestFactory } = require("@nestjs/core");
const [{ AppModule }, { DatabaseService }, { AutomationService }] = await Promise.all([
  import("../../apps/api/dist/app.module.js"),
  import("../../apps/api/dist/database.service.js"),
  import("../../apps/api/dist/automation.service.js")
]);

const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
try {
  const database = app.get(DatabaseService);
  const identity = await database.prisma.$queryRawUnsafe("SELECT current_database() AS database, inet_server_port() AS port");
  assert.equal(identity[0]?.database, runtimeUrl.pathname.slice(1), "S27 automation database identity mismatch");
  assert.equal(Number(identity[0]?.port), 57433, "S27 automation must run against the isolated main server");
  await database.check();
  process.stdout.write(`${JSON.stringify(await app.get(AutomationService).runBatch())}\n`);
} finally {
  await app.close();
}

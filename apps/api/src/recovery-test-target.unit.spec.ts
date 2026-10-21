import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { Prisma } from "./generated/prisma/client.js";
import { loadRecoveryTestTarget, recoveryTestApproval, recoveryTestSource, validateRecoveryTestTarget, verifyRecoveryTestDatabase, type RecoveryTestKey, type RecoveryTestManifest } from "./recovery-test-target.js";

const root = resolve(process.cwd(), "../.."), runId = "1792530000000-a1b2c3d4e5f6";
function fixture(key: RecoveryTestKey = "DATABASE_URL", fixtureRoot = root) {
  const base = resolve(fixtureRoot, ".env.consolidation-20261021/acceptance", runId);
  const stem = key === "DATABASE_URL" ? "s27_main_s27" : `recovery_${key === "RECOVERY_PARITY_DATABASE_URL" ? "parity" : key === "RECOVERY_RECEIPT_DATABASE_URL" ? "receipts" : "browser"}`;
  const database = `sense_${stem}_${runId.replace("-", "_")}_test`, data = resolve(base, "postgres/main/data");
  const files = [{ path: "apps/api/src/recovery-test-target.ts", hash: "a".repeat(64) }];
  const migrations = Array.from({ length: 118 }, (_, i) => ({ name: `${20260925000000 + i}_fixture`, checksum: "b".repeat(64) }));
  migrations.push({ name: "20261015000000_task_creation_receipts", checksum: "c".repeat(64) });
  const identity = { database, address: "127.0.0.1", port: 58440, directory: data, version: 180006, systemId: "7699999999999999999", oid: "16400", owner: "sense_recovery_admin", marker: `recovery:${runId}:${key}` };
  const target = { database, port: 58440, username: "sense_app_runtime", data, identity, ...(key === "RECOVERY_BROWSER_DATABASE_URL" ? { apiPort: 58652, webPort: 58653, storage: resolve(base, "files/browser") } : {}) };
  const manifest: RecoveryTestManifest = { schema: 1, approval: recoveryTestApproval, phase: "ready", runId, source: { hash: createHash("sha256").update(JSON.stringify(files)).digest("hex"), files, migrations }, targets: { [key]: target } };
  const environment = { NODE_ENV: "test", SENSE_RECOVERY_TEST_MANIFEST: resolve(base, "manifest.json"), [key]: `postgresql://sense_app_runtime:inert-fixture-only@127.0.0.1:58440/${database}` };
  return { manifest, environment, target, key };
}

describe("fresh recovery119 test target guard", () => {
  it.each<RecoveryTestKey>(["DATABASE_URL", "RECOVERY_PARITY_DATABASE_URL", "RECOVERY_RECEIPT_DATABASE_URL", "RECOVERY_BROWSER_DATABASE_URL"])("binds the exact fresh %s target without a database connection", key => {
    const f = fixture(key), binding = validateRecoveryTestTarget(f.manifest, f.environment, root, key);
    expect(binding.target).toEqual(f.target);
  });
  it.each([
    "postgresql://staff:private-value@127.0.0.1:45434/sense_latest_retained_20261014_test",
    "postgresql://staff:private-value@127.0.0.1:59749/sense_v1_agent1_20261016_test",
    "postgresql://staff:private-value@127.0.0.1:59751/sense_v1_agent1_browser_20261016_test",
    "postgresql://sense_demo@127.0.0.1:45434/sense_mw_i02_validation_20261009_test"
  ])("refuses historical or retained datasource with a redacted error", url => {
    const f = fixture();
    try { validateRecoveryTestTarget(f.manifest, { ...f.environment, DATABASE_URL: url }, root, f.key); throw new Error("guard accepted old target"); }
    catch (error) { expect((error as Error).message).toBe("Exact Owner-authorized fresh recovery119 target and source required"); }
  });
  it.each([
    { NODE_ENV: "production" }, { SENSE_RECOVERY_TEST_MANIFEST: "" },
    { SENSE_RECOVERY_TEST_MANIFEST: resolve(root, ".env.consolidation-20261021/acceptance/other/manifest.json") }
  ])("refuses missing or different lifecycle authority %j", change => {
    const f = fixture(); expect(() => validateRecoveryTestTarget(f.manifest, { ...f.environment, ...change }, root, f.key)).toThrow();
  });
  it.each(["approval", "phase", "run", "port", "data", "system", "oid", "owner", "marker", "migration-count", "migration-checksum", "source-hash", "source-escape", "source-duplicate"])("rejects changed %s binding before connecting", mode => {
    const f = fixture(), m = f.manifest, t = f.target;
    if (mode === "approval") m.approval = "historical";
    if (mode === "phase") m.phase = "stopped";
    if (mode === "run") m.runId = "1792530000000-ffffffffffff";
    if (mode === "port") t.identity.port = 45434;
    if (mode === "data") t.identity.directory = resolve(root, ".env.checkpoint-tools/pg-demo-20261006-a7c9");
    if (mode === "system") t.identity.systemId = "";
    if (mode === "oid") t.identity.oid = "0";
    if (mode === "owner") t.identity.owner = "sense_demo";
    if (mode === "marker") t.identity.marker = "recovery:other:DATABASE_URL";
    if (mode === "migration-count") m.source.migrations.pop();
    if (mode === "migration-checksum") m.source.migrations[0]!.checksum = "not-a-checksum";
    if (mode === "source-hash") m.source.hash = "f".repeat(64);
    if (mode === "source-escape") m.source.files[0]!.path = "../outside.ts";
    if (mode === "source-duplicate") m.source.files.push({ ...m.source.files[0]! });
    expect(() => validateRecoveryTestTarget(m, f.environment, root, f.key)).toThrow();
  });
  it.each(["localhost", "external.example.test", "127.0.0.1:5432", "127.0.0.1:58441"])("rejects a different endpoint %s", endpoint => {
    const f = fixture(), url = new URL(f.environment.DATABASE_URL!); url.host = endpoint;
    expect(() => validateRecoveryTestTarget(f.manifest, { ...f.environment, DATABASE_URL: url.href }, root, f.key)).toThrow();
  });
  it("refuses browser output and old browser ports", () => {
    const f = fixture("RECOVERY_BROWSER_DATABASE_URL"); f.target.apiPort = 59752;
    expect(() => validateRecoveryTestTarget(f.manifest, f.environment, root, f.key)).toThrow();
  });
  it.each(["source", "migration"])("loads the real inventory then refuses changed %s bytes without a database connection", mode => {
    const temporary = mkdtempSync(join(tmpdir(), "sense-recovery-guard-unit-"));
    const cleanup = () => {
      if (dirname(temporary) !== resolve(tmpdir()) || !temporary.startsWith(join(resolve(tmpdir()), "sense-recovery-guard-unit-"))) throw new Error("Unexpected temporary fixture cleanup path");
      rmSync(temporary, { recursive: true, force: true });
    };
    try {
      const f = fixture("DATABASE_URL", temporary);
      const write = (path: string, value: string) => { mkdirSync(dirname(resolve(temporary, path)), { recursive: true }); writeFileSync(resolve(temporary, path), value); };
      for (const path of ["apps/api/src", "apps/api/prisma/migrations", "apps/web/src", "packages", "tests/e2e", "scripts"]) mkdirSync(resolve(temporary, path), { recursive: true });
      for (const path of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "eslint.config.mjs", "playwright.config.ts", "apps/web/vite.config.ts", "config/local-runtime.json", "apps/api/src/inert-fixture.ts"]) write(path, "inert source fixture\n");
      for (const migration of f.manifest.source.migrations) write(`apps/api/prisma/migrations/${migration.name}/migration.sql`, "-- inert migration fixture; never executed\n");
      mkdirSync(f.target.data, { recursive: true });
      f.manifest.source = recoveryTestSource(temporary);
      write(f.environment.SENSE_RECOVERY_TEST_MANIFEST, JSON.stringify(f.manifest));
      expect(loadRecoveryTestTarget(f.environment, temporary, f.key).target.database).toBe(f.target.database);
      write(mode === "source" ? "apps/api/src/inert-fixture.ts" : `apps/api/prisma/migrations/${f.manifest.source.migrations[0]!.name}/migration.sql`, "changed bytes\n");
      expect(() => loadRecoveryTestTarget(f.environment, temporary, f.key)).toThrow("Exact Owner-authorized fresh recovery119 target and source required");
    } finally { cleanup(); }
  });
  it.each(["valid", "system", "oid", "directory", "marker", "missing-identity", "runtime-role", "superuser", "create-db", "create-role", "bypass-rls", "checksum", "pending", "rolled-back", "extra-migration"])("checks actual server and clean ordered schema: %s", async mode => {
    const f = fixture(), binding = validateRecoveryTestTarget(f.manifest, f.environment, root, f.key);
    const identity = { ...f.target.identity, username: "sense_app_runtime", superuser: false, createDb: false, createRole: false, bypassRls: false };
    if (mode === "system") identity.systemId = "7690000000000000000";
    if (mode === "oid") identity.oid = "16401";
    if (mode === "directory") identity.directory = resolve(root, "some-other-cluster");
    if (mode === "marker") identity.marker = "unowned";
    if (mode === "runtime-role") identity.username = "sense_recovery_admin";
    if (mode === "superuser") identity.superuser = true;
    if (mode === "create-db") identity.createDb = true;
    if (mode === "create-role") identity.createRole = true;
    if (mode === "bypass-rls") identity.bypassRls = true;
    const migrations = f.manifest.source.migrations.map(row => ({ migration_name: row.name, checksum: row.checksum, finished_at: new Date(), rolled_back_at: null as Date | null }));
    if (mode === "checksum") migrations[0]!.checksum = "d".repeat(64);
    if (mode === "pending") migrations[0]!.finished_at = null as unknown as Date;
    if (mode === "rolled-back") migrations[0]!.rolled_back_at = new Date();
    if (mode === "extra-migration") migrations.push({ ...migrations[0]!, migration_name: "20261017000000_unaccepted120" });
    let calls = 0;
    const tx = { $queryRaw: async () => ++calls === 1 ? mode === "missing-identity" ? [] : [identity] : migrations } as unknown as Prisma.TransactionClient;
    if (mode === "valid") await expect(verifyRecoveryTestDatabase(tx, binding)).resolves.toBeUndefined();
    else await expect(verifyRecoveryTestDatabase(tx, binding)).rejects.toThrow("Exact Owner-authorized fresh recovery119 target and source required");
  });
});

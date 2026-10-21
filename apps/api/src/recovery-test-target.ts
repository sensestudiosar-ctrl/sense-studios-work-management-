import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { Prisma } from "./generated/prisma/client.js";

export const recoveryTestApproval = "2026-10-21:sense-recovery-fresh-119";
const keys = ["DATABASE_URL", "RECOVERY_PARITY_DATABASE_URL", "RECOVERY_RECEIPT_DATABASE_URL", "RECOVERY_BROWSER_DATABASE_URL"] as const;
export type RecoveryTestKey = typeof keys[number];
type Source = { hash: string; files: Array<{ path: string; hash: string }>; migrations: Array<{ name: string; checksum: string }> };
export type RecoveryIdentity = { database: string; address: string; port: number; directory: string; version: number; systemId: string; oid: string; owner: string; marker: string };
export type RecoveryTestTarget = { database: string; port: number; username: string; data: string; identity: RecoveryIdentity; apiPort?: number; webPort?: number; storage?: string };
export type RecoveryTestManifest = { schema: number; approval: string; phase: string; runId: string; source: Source; targets: Partial<Record<RecoveryTestKey, RecoveryTestTarget>> };
export type RecoveryTestBinding = { manifest: RecoveryTestManifest; target: RecoveryTestTarget; url: string };
function fail(): never { throw new Error("Exact Owner-authorized fresh recovery119 target and source required"); }
const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const samePath = (a: string, b: string) => resolve(a).toLowerCase() === resolve(b).toLowerCase();
function contained(root: string, path: string): boolean {
  const inside = relative(resolve(root), resolve(path));
  return Boolean(inside && !inside.startsWith("..") && !isAbsolute(inside));
}
function realContained(root: string, path: string): void {
  if (!contained(root, path)) fail();
  let ancestor = resolve(path);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  if (!samePath(realpathSync(ancestor), ancestor)) fail();
}

/** Canonical source inventory for the native fixture provisioner; no server access. */
export function recoveryTestSource(root: string): Source {
  const paths: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(resolve(root, directory), { withFileTypes: true })) {
      if (["generated", "dist", "node_modules", ".git"].includes(entry.name)) continue;
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) paths.push(path);
      else fail();
    }
  };
  for (const directory of ["apps/api/src", "apps/api/prisma", "apps/web/src", "packages", "tests/e2e", "scripts"]) walk(directory);
  paths.push("package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "eslint.config.mjs", "playwright.config.ts", "apps/web/vite.config.ts", "config/local-runtime.json");
  const files = paths.sort().map(path => ({ path, hash: hash(readFileSync(resolve(root, path))) }));
  const migrations = readdirSync(resolve(root, "apps/api/prisma/migrations"), { withFileTypes: true }).filter(row => row.isDirectory()).map(row => ({
    name: row.name, checksum: hash(readFileSync(resolve(root, "apps/api/prisma/migrations", row.name, "migration.sql")))
  })).sort((a, b) => a.name.localeCompare(b.name));
  return { hash: hash(JSON.stringify(files)), files, migrations };
}

/** Pure structural binding, used by inert regression fixtures before any connection. */
export function validateRecoveryTestTarget(value: unknown, environment: NodeJS.ProcessEnv, root: string, key: RecoveryTestKey): RecoveryTestBinding {
  try {
    const manifest = value as RecoveryTestManifest;
    if (environment.NODE_ENV !== "test" || !keys.includes(key) || manifest.schema !== 1 || manifest.approval !== recoveryTestApproval || manifest.phase !== "ready" || !/^\d+-[a-f0-9]{12}$/.test(manifest.runId)) fail();
    const base = resolve(root, ".env.consolidation-20261021/acceptance", manifest.runId);
    if (environment.SENSE_RECOVERY_TEST_MANIFEST !== resolve(base, "manifest.json")) fail();
    const target = manifest.targets[key], url = new URL(environment[key] ?? "");
    if (!target || !["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" || url.port !== "58440" || url.username !== "sense_app_runtime" || !url.password || url.search || url.hash) fail();
    const [timestamp, suffix] = manifest.runId.split("-");
    const stem = key === "DATABASE_URL" ? "s27_main_s27" : `recovery_${key === "RECOVERY_PARITY_DATABASE_URL" ? "parity" : key === "RECOVERY_RECEIPT_DATABASE_URL" ? "receipts" : "browser"}`;
    const database = `sense_${stem}_${timestamp}_${suffix}_test`, data = resolve(base, "postgres/main/data");
    const identity = target.identity;
    if (url.pathname !== `/${database}` || target.database !== database || target.port !== 58440 || target.username !== url.username || !samePath(target.data, data) || !samePath(identity.directory, data) || identity.database !== database || identity.address !== "127.0.0.1" || identity.port !== 58440 || identity.owner !== "sense_recovery_admin" || !/^\d+$/.test(identity.systemId) || !/^[1-9]\d*$/.test(identity.oid) || !Number.isInteger(identity.version) || identity.version < 180000 || identity.version >= 190000 || identity.marker !== `recovery:${manifest.runId}:${key}`) fail();
    if (key === "RECOVERY_BROWSER_DATABASE_URL" && (target.apiPort !== 58652 || target.webPort !== 58653 || !target.storage || !samePath(target.storage, resolve(base, "files/browser")))) fail();
    const source = manifest.source;
    if (!/^[a-f0-9]{64}$/.test(source.hash) || !Array.isArray(source.files) || !source.files.length || !Array.isArray(source.migrations) || source.migrations.length !== 119 || source.migrations.at(-1)?.name !== "20261015000000_task_creation_receipts") fail();
    const paths = new Set<string>(), migrationNames = new Set<string>();
    for (const file of source.files) {
      if (!file.path || isAbsolute(file.path) || !contained(root, resolve(root, file.path)) || paths.has(file.path.toLowerCase()) || !/^[a-f0-9]{64}$/.test(file.hash)) fail();
      paths.add(file.path.toLowerCase());
    }
    for (const migration of source.migrations) {
      if (!/^[0-9]{14}_[a-z0-9_]+$/.test(migration.name) || migrationNames.has(migration.name) || !/^[a-f0-9]{64}$/.test(migration.checksum)) fail();
      migrationNames.add(migration.name);
    }
    if (source.hash !== hash(JSON.stringify(source.files))) fail();
    return { manifest, target, url: url.href };
  } catch { return fail(); }
}

/** Exact filesystem/source validation happens once at suite/guard load. */
export function loadRecoveryTestTarget(environment: NodeJS.ProcessEnv, root: string, key: RecoveryTestKey): RecoveryTestBinding {
  try {
    const path = environment.SENSE_RECOVERY_TEST_MANIFEST;
    if (!path || !contained(resolve(root, ".env.consolidation-20261021/acceptance"), path)) fail();
    realContained(root, path);
    if (!samePath(realpathSync(path), path)) fail();
    const binding = validateRecoveryTestTarget(JSON.parse(readFileSync(path, "utf8")), environment, root, key);
    realContained(root, binding.target.data);
    if (binding.target.storage) realContained(root, binding.target.storage);
    const source = recoveryTestSource(root);
    if (JSON.stringify(source) !== JSON.stringify(binding.manifest.source)) fail();
    return binding;
  } catch { return fail(); }
}

/** Only the disposable cluster grants the narrow metadata reads this guard needs. */
export async function verifyRecoveryTestDatabase(tx: Prisma.TransactionClient, binding: RecoveryTestBinding): Promise<void> {
  const [identity] = await tx.$queryRaw<Array<RecoveryIdentity & { username: string; superuser: boolean; createDb: boolean; createRole: boolean; bypassRls: boolean }>>`SELECT current_database() AS database, host(inet_server_addr()) AS address, inet_server_port() AS port,
    current_setting('data_directory') AS directory, current_setting('server_version_num')::int AS version,
    (SELECT system_identifier::text FROM pg_control_system()) AS "systemId", d.oid::text AS oid,
    pg_get_userbyid(d.datdba) AS owner, shobj_description(d.oid,'pg_database') AS marker, current_user AS username,
    r.rolsuper AS superuser, r.rolcreatedb AS "createDb", r.rolcreaterole AS "createRole", r.rolbypassrls AS "bypassRls"
    FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()`;
  if (!identity || Object.keys(binding.target.identity).some(key => identity[key as keyof RecoveryIdentity] !== binding.target.identity[key as keyof RecoveryIdentity])) fail();
  if (identity.username !== "sense_app_runtime" || identity.superuser !== false || identity.createDb !== false || identity.createRole !== false || identity.bypassRls !== false) fail();
  const migrations = await tx.$queryRaw<Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>>`SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name`;
  if (JSON.stringify(migrations.map(row => ({ name: row.migration_name, checksum: row.checksum }))) !== JSON.stringify(binding.manifest.source.migrations) || migrations.some(row => !row.finished_at || row.rolled_back_at)) fail();
}

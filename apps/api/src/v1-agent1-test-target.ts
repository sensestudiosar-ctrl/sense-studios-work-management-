import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import type { Prisma } from "./generated/prisma/client.js";
import { loadRecoveryTestTarget, verifyRecoveryTestDatabase, type RecoveryTestBinding } from "./recovery-test-target.js";

const approval = "2026-10-16:agent1-fresh-local-119";
type Manifest = {
  recovery?: RecoveryTestBinding;
  approval: string; phase: string; database: string; port: number; data: string; systemId: string; marker: string;
  identity: { database: string; address: string; port: number; directory: string; version: number; systemId: string; oid: string; owner: string; marker: string };
  source: { hash: string; files: Array<{ path: string; hash: string }>; migrations: Array<{ name: string; checksum: string }> };
};
const fail = (): never => { throw new Error("Exact approved Agent1 isolated target/source required"); };

/** Operational test guard only; no application permission/evaluator changes. */
export function validateAgent1Target(value: unknown, connectionString: string | undefined, root: string): Manifest {
  try {
    const m = value as Manifest, url = new URL(connectionString ?? "");
    if (m.approval !== approval || m.phase !== "ready" || m.database !== "sense_v1_agent1_20261016_test" || m.port !== 59749 ||
      !["postgresql:", "postgres:"].includes(url.protocol) || url.hostname !== "127.0.0.1" || url.port !== "59749" || url.pathname !== `/${m.database}` || url.username !== "agent1_v1_20261016" || !/^[a-f0-9]{64}$/.test(url.password) || url.search) fail();
    const data = resolve(root, ".artifacts/v1/20261016-agent1-local/postgres/data");
    if (resolve(m.data).toLowerCase() !== data.toLowerCase() || resolve(m.identity.directory).toLowerCase() !== data.toLowerCase() || m.identity.database !== m.database ||
      m.identity.address !== "127.0.0.1" || m.identity.port !== m.port || m.identity.owner !== "agent1_v1_20261016" || !/^\d+$/.test(m.identity.oid) || !/^\d+$/.test(m.systemId) ||
      m.identity.systemId !== m.systemId || !/^v1-agent1:[a-f0-9-]{36}$/.test(m.marker) || m.identity.marker !== m.marker || !Number.isInteger(m.identity.version) || m.identity.version < 180000 || m.identity.version >= 190000) fail();
    if (!/^[a-f0-9]{64}$/.test(m.source.hash) || !Array.isArray(m.source.files) || m.source.files.length < 500 || m.source.migrations.length !== 119 || m.source.migrations.at(-1)?.name !== "20261015000000_task_creation_receipts") fail();
    const seen = new Set<string>();
    for (const file of m.source.files) {
      const path = relative(root, resolve(root, file.path));
      if (!path || path.startsWith("..") || isAbsolute(path) || seen.has(path) || !/^[a-f0-9]{64}$/.test(file.hash)) fail();
      seen.add(path);
    }
    return m;
  } catch { return fail(); }
}

export function loadAgent1Target(environment: NodeJS.ProcessEnv, root: string): { manifest: Manifest; url: string } {
  if (environment.SENSE_RECOVERY_TEST_MANIFEST) {
    const recovery = loadRecoveryTestTarget(environment, root, "RECOVERY_RECEIPT_DATABASE_URL");
    return { manifest: { ...recovery.target, approval: recovery.manifest.approval, phase: recovery.manifest.phase,
      systemId: recovery.target.identity.systemId, marker: recovery.target.identity.marker, source: recovery.manifest.source, recovery }, url: recovery.url };
  }
  const path = resolve(root, ".artifacts/v1/20261016-agent1-local/manifest.json");
  if (environment.V1_AGENT1_TEST_MANIFEST !== path || realpathSync(path).toLowerCase() !== path.toLowerCase()) fail();
  const url = environment.V1_AGENT1_DATABASE_URL;
  const manifest = validateAgent1Target(JSON.parse(readFileSync(path, "utf8")), url, root);
  for (const file of manifest.source.files) if (createHash("sha256").update(readFileSync(resolve(root, file.path))).digest("hex") !== file.hash) fail();
  if (createHash("sha256").update(JSON.stringify(manifest.source.files)).digest("hex") !== manifest.source.hash) fail();
  return { manifest, url: url! };
}

export async function verifyAgent1Database(tx: Prisma.TransactionClient, manifest: Manifest): Promise<void> {
  if (manifest.recovery) { await verifyRecoveryTestDatabase(tx, manifest.recovery); return; }
  const [row] = await tx.$queryRaw<Array<Manifest["identity"]>>`SELECT current_database() AS database, host(inet_server_addr()) AS address, inet_server_port() AS port,
    current_setting('data_directory') AS directory, current_setting('server_version_num')::int AS version,
    (SELECT system_identifier::text FROM pg_control_system()) AS "systemId", d.oid::text AS oid,
    pg_get_userbyid(d.datdba) AS owner, shobj_description(d.oid,'pg_database') AS marker FROM pg_database d WHERE d.datname=current_database()`;
  if (!row || Object.keys(manifest.identity).some(key => row[key as keyof typeof row] !== manifest.identity[key as keyof typeof row])) fail();
  const migrations = await tx.$queryRaw<Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>>`SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name`;
  if (JSON.stringify(migrations.map(row => ({ name: row.migration_name, checksum: row.checksum }))) !== JSON.stringify(manifest.source.migrations) || migrations.some(row => !row.finished_at || row.rolled_back_at)) fail();
}

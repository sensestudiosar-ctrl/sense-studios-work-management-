import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const MW_I02_DATABASE = "sense_mw_i02_validation_20261009_test";
export const MW_I02_URL = `postgresql://sense_demo@127.0.0.1:45434/${MW_I02_DATABASE}`;
export const MW_I02_SYSTEM = "7693570241708228348";
export const MW_I02_DIRECTORY = resolve("D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9");
export const MW_I02_RUNS = resolve(workspace, ".env.checkpoint-tools/mw-i02-acceptance/runs");
type RecordValue = Record<string, unknown>;
export type MWI02Target = { runId: string; runDir: string; manifestPath: string; databaseOid: string; markerToken: string; sourceHash: string; migrationSourceHash: string; serverStartedAt: string };
function record(value: unknown): RecordValue { assert.ok(value && typeof value === "object" && !Array.isArray(value), "Expected a run identity object"); return value as RecordValue; }

/** Pure binding checks, also exercised by inert unit fixtures. Paths supplied by
 * loadMWI02Target below have already been resolved through the filesystem. */
export function validateMWI02Target(environment: NodeJS.ProcessEnv, manifestPath: string, runDir: string, rawManifest: unknown, rawMarker: unknown): MWI02Target {
  assert.equal(environment.NODE_ENV, "test"); assert.equal(environment.MW_I02_ENABLED, "1");
  assert.equal(environment.DATABASE_URL, MW_I02_URL);
  assert.match(environment.MW_I02_SOURCE_HASH ?? "", /^[a-f0-9]{64}$/);
  const manifest = record(rawManifest), marker = record(rawMarker);
  const runId = String(manifest.runId ?? ""); assert.match(runId, /^\d+-[a-f0-9]{12}$/);
  assert.equal(environment.MW_I02_RUN_ID, runId);
  const inside = relative(MW_I02_RUNS, runDir);
  assert.ok(inside && !inside.startsWith("..") && !isAbsolute(inside));
  assert.equal(runDir, resolve(MW_I02_RUNS, runId));
  assert.equal(manifestPath, resolve(runDir, "manifest.json"));
  assert.equal(resolve(environment.MW_I02_MANIFEST ?? ""), manifestPath);
  assert.equal(manifest.runDir, runDir); assert.equal(manifest.markerPath, resolve(runDir, "created.marker.json"));
  assert.equal(manifest.state, "ready"); assert.equal(manifest.createdDatabase, true);
  assert.equal(manifest.schema, 1); assert.equal(manifest.enabled, true);
  assert.ok(typeof manifest.readyAt === "string" && Number.isFinite(Date.parse(manifest.readyAt)));
  assert.ok(Array.isArray(manifest.catalogBefore) && manifest.catalogBefore.every(row => record(row).datname !== MW_I02_DATABASE), "Run must have refused an already existing target");
  assert.equal(manifest.databaseName, MW_I02_DATABASE); assert.equal(manifest.databaseUrl, MW_I02_URL);
  assert.equal(manifest.postgresHost, "127.0.0.1"); assert.equal(Number(manifest.postgresPort), 45434); assert.equal(manifest.runtimeUser, "sense_demo");
  assert.equal(manifest.expectedMigrations, 118); assert.equal(manifest.appliedMigrations, 118);
  assert.equal(manifest.sourceHash, environment.MW_I02_SOURCE_HASH);
  assert.match(String(manifest.migrationSourceHash ?? ""), /^[a-f0-9]{64}$/);
  assert.equal(manifest.apiPort, 59542); assert.equal(manifest.webPort, 59543);
  assert.equal(manifest.apiUrl, "http://127.0.0.1:59542"); assert.equal(manifest.webUrl, "http://localhost:59543");
  const server = record(manifest.serverIdentity), identity = record(manifest.databaseIdentity);
  assert.equal(server.system_identifier, MW_I02_SYSTEM); assert.equal(identity.system_identifier, MW_I02_SYSTEM);
  assert.equal(resolve(String(server.data_directory)), MW_I02_DIRECTORY);
  assert.equal(identity.database, MW_I02_DATABASE); assert.equal(identity.server_address, "127.0.0.1"); assert.equal(Number(identity.server_port), 45434);
  assert.match(String(manifest.databaseOid ?? ""), /^[1-9]\d*$/); assert.match(String(manifest.markerToken ?? ""), /^[a-f0-9]{64}$/);
  assert.equal(marker.runId, runId); assert.equal(marker.databaseName, MW_I02_DATABASE);
  assert.equal(marker.serverSystemIdentifier, MW_I02_SYSTEM); assert.equal(marker.markerToken, manifest.markerToken);
  assert.ok(typeof server.server_started_at === "string" && server.server_started_at.length > 0);
  // A prepared suite/runner is not authorization to perform a stateful run.
  const authorization = record(manifest.parityAuthorization);
  assert.equal(authorization.ownerApproved, true); assert.equal(authorization.scope, "mw-i02-parity-persistence");
  assert.equal(authorization.runId, runId); assert.equal(authorization.sourceHash, manifest.sourceHash);
  assert.ok(typeof authorization.authorizationText === "string" && authorization.authorizationText.trim().length > 0);
  assert.ok(typeof authorization.approvedAt === "string" && Number.isFinite(Date.parse(authorization.approvedAt)));
  return { runId, runDir, manifestPath, databaseOid: String(manifest.databaseOid), markerToken: String(manifest.markerToken), sourceHash: String(manifest.sourceHash), migrationSourceHash: String(manifest.migrationSourceHash), serverStartedAt: server.server_started_at };
}

/** Independently bind the suite to the reviewed candidate's current file bytes. */
export function validateMWI02Source(target: Pick<MWI02Target, "sourceHash" | "migrationSourceHash">, rawCandidate: unknown, readSource: (file: string) => Buffer): void {
  const candidate = record(rawCandidate);
  for (const [inventoryKey, expected] of [["sourceHashes", target.sourceHash], ["migrationHashes", target.migrationSourceHash]] as const) {
    const inventory = record(candidate[inventoryKey]);
    assert.ok(Object.keys(inventory).length > 0);
    assert.equal(createHash("sha256").update(JSON.stringify(inventory)).digest("hex"), expected);
    for (const [file, hash] of Object.entries(inventory)) {
      const path = relative(workspace, resolve(workspace, file));
      assert.ok(path && !path.startsWith("..") && !isAbsolute(file) && !isAbsolute(path), "Reviewed file must remain inside the workspace");
      assert.match(String(hash), /^[a-f0-9]{64}$/);
      assert.equal(createHash("sha256").update(readSource(file)).digest("hex"), hash, `Reviewed source changed: ${file}`);
    }
  }
}

/** No connection or write: only the exact caller-supplied manifest is read. */
export function loadMWI02Target(environment: NodeJS.ProcessEnv = process.env): MWI02Target {
  assert.ok(environment.MW_I02_MANIFEST, "Exact reviewed MW-I02 manifest is required");
  const manifestPath = realpathSync(resolve(environment.MW_I02_MANIFEST));
  const manifest = record(JSON.parse(readFileSync(manifestPath, "utf8")));
  const runDir = realpathSync(resolve(String(manifest.runDir)));
  const markerPath = realpathSync(resolve(runDir, "created.marker.json"));
  assert.equal(markerPath, resolve(runDir, "created.marker.json"));
  const target = validateMWI02Target(environment, manifestPath, runDir, manifest, JSON.parse(readFileSync(markerPath, "utf8")));
  const candidate = JSON.parse(readFileSync(resolve(workspace, "docs/design/my-work-integration-audit/mw-i02/acceptance/evidence/findings-resolution-20261013/candidate-source.json"), "utf8"));
  validateMWI02Source(target, candidate, file => {
    const source = realpathSync(resolve(workspace, file)), inside = relative(workspace, source);
    assert.ok(inside && !inside.startsWith("..") && !isAbsolute(inside), "Reviewed file symlink must stay inside the workspace");
    return readFileSync(source);
  });
  return target;
}

export function assertMWI02LiveIdentity(target: MWI02Target, rawIdentity: unknown): void {
  const identity = record(rawIdentity);
  assert.equal(identity.database, MW_I02_DATABASE); assert.equal(identity.username, "sense_demo");
  assert.equal(identity.address, "127.0.0.1"); assert.equal(Number(identity.port), 45434);
  assert.equal(identity.system_identifier, MW_I02_SYSTEM); assert.equal(String(identity.oid), target.databaseOid);
  assert.equal(resolve(String(identity.data_directory)), MW_I02_DIRECTORY); assert.equal(identity.server_started_at, target.serverStartedAt);
}

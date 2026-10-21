import { MW_I02_DATABASE, MW_I02_DIRECTORY, MW_I02_RUNS, MW_I02_SYSTEM, MW_I02_URL, assertMWI02LiveIdentity, validateMWI02Source, validateMWI02Target } from "./mw-i02-disposable-test-target.js";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

function fixture() {
  const runId = "1791849600000-aabbccddeeff", runDir = resolve(MW_I02_RUNS, runId), manifestPath = resolve(runDir, "manifest.json");
  const sourceHash = "a".repeat(64), markerToken = "b".repeat(64), started = "2026-10-13 12:00:00+00";
  const environment = { NODE_ENV: "test", MW_I02_ENABLED: "1", DATABASE_URL: MW_I02_URL, MW_I02_RUN_ID: runId, MW_I02_SOURCE_HASH: sourceHash, MW_I02_MANIFEST: manifestPath };
  const manifest = { runId, runDir, markerPath: resolve(runDir, "created.marker.json"), state: "ready", createdDatabase: true, databaseName: MW_I02_DATABASE, databaseUrl: MW_I02_URL, postgresHost: "127.0.0.1", postgresPort: 45434, runtimeUser: "sense_demo", expectedMigrations: 118, appliedMigrations: 118, sourceHash, databaseOid: "12345", markerToken, apiPort: 59542, webPort: 59543, apiUrl: "http://127.0.0.1:59542", webUrl: "http://localhost:59543", serverIdentity: { system_identifier: MW_I02_SYSTEM, data_directory: MW_I02_DIRECTORY, server_started_at: started }, databaseIdentity: { system_identifier: MW_I02_SYSTEM, database: MW_I02_DATABASE, server_address: "127.0.0.1", server_port: 45434 }, parityAuthorization: { ownerApproved: true, scope: "mw-i02-parity-persistence", runId, sourceHash, authorizationText: "Fixture authorization only; no stateful execution", approvedAt: "2026-10-13T12:00:00Z" } };
  Object.assign(manifest, { schema: 1, enabled: true, readyAt: "2026-10-13T12:00:00Z", catalogBefore: [{ datname: "postgres" }], migrationSourceHash: "d".repeat(64) });
  const marker = { runId, databaseName: MW_I02_DATABASE, serverSystemIdentifier: MW_I02_SYSTEM, markerToken };
  return { environment, manifestPath, runDir, manifest, marker };
}
const validate = (f: ReturnType<typeof fixture>) => validateMWI02Target(f.environment, f.manifestPath, f.runDir, f.manifest, f.marker);
describe("MW-I02 exact disposable parity guard (inert fixtures)", () => {
  it("accepts only the fully bound prepared manifest and matching live identity", () => {
    const f = fixture(), target = validate(f);
    expect(() => assertMWI02LiveIdentity(target, { database: MW_I02_DATABASE, username: "sense_demo", address: "127.0.0.1", port: 45434, system_identifier: MW_I02_SYSTEM, oid: "12345", data_directory: MW_I02_DIRECTORY, server_started_at: target.serverStartedAt })).not.toThrow();
  });
  it.each(["NODE_ENV", "MW_I02_ENABLED", "DATABASE_URL", "MW_I02_RUN_ID", "MW_I02_SOURCE_HASH", "MW_I02_MANIFEST"])("refuses missing or conflicting %s", key => {
    const f = fixture(); (f.environment as Record<string, string>)[key] = ""; expect(() => validate(f)).toThrow();
  });
  it.each([{ state: "cleaned" }, { createdDatabase: false }, { databaseName: "sense_local_preview_20261008_1791474390772_test" }, { databaseUrl: MW_I02_URL.replace("45434", "58440") }, { databaseOid: "0" }, { markerToken: "" }, { expectedMigrations: 116 }, { appliedMigrations: 117 }, { sourceHash: "c".repeat(64) }, { apiPort: 59224 }, { webPort: 59223 }, { apiUrl: "http://localhost:59542" }, { postgresHost: "localhost" }, { runtimeUser: "postgres" }, { parityAuthorization: undefined }])("rejects unreviewed manifest %j", change => {
    const f = fixture(); Object.assign(f.manifest, change); expect(() => validate(f)).toThrow();
  });
  it("rejects path traversal, cross-run files and mismatched creation markers", () => {
    const f = fixture(); expect(() => validateMWI02Target(f.environment, f.manifestPath, resolve(MW_I02_RUNS, ".."), f.manifest, f.marker)).toThrow();
    expect(() => validateMWI02Target(f.environment, resolve(f.runDir, "other.json"), f.runDir, f.manifest, f.marker)).toThrow();
    for (const change of [{ runId: "other" }, { databaseName: "postgres" }, { markerToken: "c".repeat(64) }, { serverSystemIdentifier: "0" }]) expect(() => validateMWI02Target(f.environment, f.manifestPath, f.runDir, f.manifest, { ...f.marker, ...change })).toThrow();
  });
  it.each([{ apiPort: 59442 }, { webPort: 59443 }, { apiUrl: "http://127.0.0.1:59442" }, { webUrl: "http://localhost:59443" }])("rejects the retained preview endpoint %j", change => {
    const f = fixture(); Object.assign(f.manifest, change); expect(() => validate(f)).toThrow();
  });
  it("rejects a recreated target or conflicting live server before fixture writes", () => {
    const target = validate(fixture());
    const identity = { database: MW_I02_DATABASE, username: "sense_demo", address: "127.0.0.1", port: 45434, system_identifier: MW_I02_SYSTEM, oid: "12345", data_directory: MW_I02_DIRECTORY, server_started_at: target.serverStartedAt };
    for (const change of [{ database: "postgres" }, { oid: "54321" }, { port: 57434 }, { system_identifier: "0" }, { data_directory: "C:/Program Files/PostgreSQL/18/data" }, { server_started_at: "other" }]) expect(() => assertMWI02LiveIdentity(target, { ...identity, ...change })).toThrow();
  });
  it("keeps the retained PostgreSQL directory fixed when acceptance source is copied", () => {
    expect(MW_I02_DIRECTORY).toBe(resolve("D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9"));
    const target = validate(fixture());
    expect(() => assertMWI02LiveIdentity(target, { database: MW_I02_DATABASE, username: "sense_demo", address: "127.0.0.1", port: 45434, system_identifier: MW_I02_SYSTEM, oid: "12345", data_directory: resolve(MW_I02_RUNS, "isolated-copy/.env.checkpoint-tools/pg-demo-20261006-a7c9"), server_started_at: target.serverStartedAt })).toThrow();
  });
  it("refuses a manifest recording an already existing target", () => {
    const f = fixture(); Object.assign(f.manifest, { catalogBefore: [{ datname: MW_I02_DATABASE }] }); expect(() => validate(f)).toThrow();
  });
  it("binds reviewed inventories to current bytes and rejects changed, missing or escaping source", () => {
    const bytes = Buffer.from("inert reviewed source"), fileHash = createHash("sha256").update(bytes).digest("hex");
    const candidate = { sourceHashes: { "apps/api/src/inert.ts": fileHash }, migrationHashes: { "apps/api/prisma/migrations/inert/migration.sql": fileHash } };
    const target = { sourceHash: createHash("sha256").update(JSON.stringify(candidate.sourceHashes)).digest("hex"), migrationSourceHash: createHash("sha256").update(JSON.stringify(candidate.migrationHashes)).digest("hex") };
    expect(() => validateMWI02Source(target, candidate, () => bytes)).not.toThrow();
    expect(() => validateMWI02Source(target, candidate, () => Buffer.from("changed"))).toThrow();
    expect(() => validateMWI02Source(target, candidate, () => { throw new Error("missing"); })).toThrow();
    const escaping = { ...candidate, sourceHashes: { "../outside.ts": fileHash } };
    expect(() => validateMWI02Source({ ...target, sourceHash: createHash("sha256").update(JSON.stringify(escaping.sourceHashes)).digest("hex") }, escaping, () => bytes)).toThrow();
  });
});

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { assertReleaseDatabase, assertReleaseMigrations, publicReleaseIdentity, readReleaseIdentity, type ReleaseIdentity } from "./release-info.js";

const release: ReleaseIdentity = { schemaVersion: 1, commit: "a".repeat(40), buildId: "test-build", builtAt: "2026-10-21T00:00:00.000Z", migrations: [{ name: "20261015000000_task_creation_receipts", checksum: "b".repeat(64) }], database: { name: "sense_stage_test", user: "sense_demo", host: "127.0.0.1", port: 45434, oid: "145606", system: "7693570241708228348" } };
const row = { ...release.migrations[0]!, finishedAt: new Date(), rolledBackAt: null };
describe("release identity and schema compatibility", () => {
  it("exposes only the non-secret public projection", () => {
    expect(publicReleaseIdentity({ ...release, databaseUrl: "private", files: ["private-path"] } as ReleaseIdentity)).toEqual({ service: "api", mode: "release", commit: release.commit, buildId: "test-build", builtAt: release.builtAt, migrations: 1 });
    expect(publicReleaseIdentity(null)).toMatchObject({ mode: "development", commit: null });
  });
  it("rejects malformed metadata rather than advertising an invented version", () => {
    const dir = mkdtempSync(join(tmpdir(), "sense-release-"));
    try {
      const file = join(dir, "release.json");
      writeFileSync(file, JSON.stringify(release)); expect(readReleaseIdentity(file)?.commit).toBe(release.commit);
      writeFileSync(file, JSON.stringify({ ...release, commit: "dirty-working-tree" })); expect(() => readReleaseIdentity(file)).toThrow("Invalid release identity");
    } finally {
      assert.ok(resolve(dir).startsWith(resolve(tmpdir()) + sep + "sense-release-"), "Unexpected test cleanup path");
      rmSync(dir, { recursive: true });
    }
  });
  it("requires the exact successful migration checksum set", () => {
    expect(() => assertReleaseMigrations(release, [row])).not.toThrow();
    for (const rows of [[], [row, row], [{ ...row, checksum: "c".repeat(64) }], [{ ...row, finishedAt: null }], [row, { ...row, name: "20261017000000_client_password_login" }]]) {
      expect(() => assertReleaseMigrations(release, rows)).toThrow("Database migration ledger");
    }
  });
  it("rejects a replacement database even when its schema ledger is identical", () => {
    expect(() => assertReleaseDatabase(release, release.database)).not.toThrow();
    for (const change of [{ name: "wrong_test" }, { user: "wrong_role" }, { system: "1" }, { oid: "1" }, { port: 5432 }]) expect(() => assertReleaseDatabase(release, { ...release.database, ...change })).toThrow("Database identity");
  });
});

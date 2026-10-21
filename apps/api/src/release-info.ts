import { readFileSync } from "node:fs";

export type ReleaseIdentity = {
  schemaVersion: 1;
  commit: string;
  buildId: string;
  builtAt: string;
  migrations: Array<{ name: string; checksum: string }>;
  database: { name: string; user: string; host: string; port: number; oid: string; system: string };
};

export function readReleaseIdentity(file = process.env.SENSE_RELEASE_FILE): ReleaseIdentity | null {
  if (!file) return null;
  const value = JSON.parse(readFileSync(file, "utf8")) as ReleaseIdentity;
  if (value.schemaVersion !== 1 || !/^[a-f0-9]{40}$/.test(value.commit)
    || !/^[a-zA-Z0-9._-]{1,100}$/.test(value.buildId) || !Number.isFinite(Date.parse(value.builtAt))
    || !Array.isArray(value.migrations) || !value.migrations.length
    || value.migrations.some(row => !/^[0-9]{14}_[a-z0-9_]+$/.test(row.name) || !/^[a-f0-9]{64}$/.test(row.checksum))
    || new Set(value.migrations.map(row => row.name)).size !== value.migrations.length
    || !value.database || !/^[a-z][a-z0-9_]+$/.test(value.database.name) || !/^[a-z][a-z0-9_]+$/.test(value.database.user)
    || value.database.host !== "127.0.0.1" || !Number.isInteger(value.database.port) || value.database.port < 1 || value.database.port > 65535
    || !/^[1-9][0-9]*$/.test(value.database.oid) || !/^[0-9]+$/.test(value.database.system)) {
    throw new Error("Invalid release identity");
  }
  return value;
}

export function assertReleaseDatabase(release: ReleaseIdentity, actual: ReleaseIdentity["database"] | undefined): void {
  if (!actual || Object.entries(release.database).some(([key, value]) => actual[key as keyof typeof actual] !== value)) throw new Error("Database identity does not match this release");
}

export function publicReleaseIdentity(release: ReleaseIdentity | null): Record<string, unknown> {
  return release ? { service: "api", mode: "release", commit: release.commit, buildId: release.buildId, builtAt: release.builtAt, migrations: release.migrations.length }
    : { service: "api", mode: "development", commit: null, buildId: null, builtAt: null, migrations: null };
}

export function assertReleaseMigrations(release: ReleaseIdentity, rows: Array<{ name: string; checksum: string; finishedAt: Date | null; rolledBackAt: Date | null }>): void {
  const active = rows.filter(row => !row.rolledBackAt);
  const expected = new Map(release.migrations.map(row => [row.name, row.checksum]));
  if (active.length !== expected.size || new Set(active.map(row => row.name)).size !== active.length
    || active.some(row => !row.finishedAt || expected.get(row.name) !== row.checksum)) {
    throw new Error("Database migration ledger does not match this release");
  }
}

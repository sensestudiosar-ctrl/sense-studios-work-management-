import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isS27DisposableTestTarget, matchesS27DisposableServer } from "./s27-disposable-test-target.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env.s27-tools");
const suffix = `${Date.now()}_aabbcc`;
const manifest = resolve(root, `s27-fresh-${suffix}.test`);
const primary = `postgresql://fixture@127.0.0.1:58440/sense_s18_s27_${suffix}_test`;
const secondary = `postgresql://fixture@127.0.0.1:58441/sense_s14_s27_${suffix}_test`;
const environment: NodeJS.ProcessEnv = { NODE_ENV: "test", S27_E2E_ENABLED: "1", S27_TEST_ENV_FILE: manifest, S18_DATABASE_URL: primary, S14_DATABASE_URL: secondary };
const contents = `NODE_ENV=test\nS27_E2E_ENABLED=1\nS18_DATABASE_URL=${primary}\nS14_DATABASE_URL=${secondary}\n`;

beforeAll(() => { mkdirSync(root, { recursive: true }); writeFileSync(manifest, contents, { flag: "wx" }); });
afterAll(() => { rmSync(manifest); });

it("permits only the exact manifest-bound primary and S14 suite targets", () => {
  expect(isS27DisposableTestTarget("S18_DATABASE_URL", primary, environment)).toBe(true);
  expect(isS27DisposableTestTarget("S14_DATABASE_URL", secondary, environment)).toBe(true);
  expect(matchesS27DisposableServer(primary, `sense_s18_s27_${suffix}_test`, 58440)).toBe(true);
  expect(matchesS27DisposableServer(primary, `sense_s18_s27_${suffix}_test`, 57433)).toBe(false);
  expect(matchesS27DisposableServer(primary, "postgres", 58440)).toBe(false);
});

it("rejects absent activation, production and unavailable or outside manifests", () => {
  for (const change of [{ NODE_ENV: "production" }, { S27_E2E_ENABLED: "0" }, { S27_TEST_ENV_FILE: undefined }, { S27_TEST_ENV_FILE: resolve(root, "../package.json") }, { S27_TEST_ENV_FILE: resolve(root, "s27-fresh-0_aa.test") }]) {
    expect(isS27DisposableTestTarget("S18_DATABASE_URL", primary, { ...environment, ...change })).toBe(false);
  }
});

it("rejects foreign host, port, database, suffix and manifest/process mismatches", () => {
  for (const invalid of [primary.replace("127.0.0.1", "example.test"), primary.replace("58440", "58441"), primary.replace(`sense_s18_s27_${suffix}_test`, "postgres"), primary.replace(suffix, "0_aa"), primary.replace("postgresql:", "https:")]) {
    writeFileSync(manifest, contents.replace(primary, invalid));
    try { expect(isS27DisposableTestTarget("S18_DATABASE_URL", invalid, { ...environment, S18_DATABASE_URL: invalid })).toBe(false); }
    finally { writeFileSync(manifest, contents); }
  }
  expect(isS27DisposableTestTarget("S18_DATABASE_URL", primary, { ...environment, S18_DATABASE_URL: secondary })).toBe(false);
});

it("rejects preserved source, upgrade, admin and unknown keys", () => {
  for (const key of ["S27_SOURCE_DATABASE_URL", "S27_UPGRADE_DATABASE_URL", "S16_ADMIN_DATABASE_URL", "S99_DATABASE_URL"]) expect(isS27DisposableTestTarget(key, primary, { ...environment, [key]: primary })).toBe(false);
});

it("fails closed for duplicate manifest entries", () => {
  writeFileSync(manifest, contents + `S18_DATABASE_URL=${primary}\n`);
  try { expect(isS27DisposableTestTarget("S18_DATABASE_URL", primary, environment)).toBe(false); }
  finally { writeFileSync(manifest, contents); }
});

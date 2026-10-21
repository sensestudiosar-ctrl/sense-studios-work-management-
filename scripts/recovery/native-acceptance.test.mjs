import assert from 'node:assert/strict';
import { test } from 'node:test';
import { delimiter, resolve } from 'node:path';
import { approval, adminUser, runtimeUser, ports, suiteKeys, recoveryKeys, pathsFor, assertContained, targetName, quoteDatabase, cleanEnvironment, toolEnvironmentPath, connectionUrl, assertUrl, assertSource, redact, redactTree, verifyIdentity } from './native-acceptance-lib.mjs';

const root = resolve(import.meta.dirname, '../..'), runId = '1792530000000-a1b2c3d4e5f6';
test('native fixture names remain distinct, bounded and compatible with existing S27 suite guards', () => {
  const names = [...suiteKeys, ...recoveryKeys].map(key => targetName(runId, key));
  assert.equal(new Set(names).size, 24);
  for (const name of names) { assert.ok(Buffer.byteLength(name) <= 63); assert.equal(quoteDatabase(name), `"${name}"`); }
  assert.equal(names[0], 'sense_s27_main_s27_1792530000000_a1b2c3d4e5f6_test');
  assert.equal(targetName(runId, 'S14_DATABASE_URL'), 'sense_s14_s27_1792530000000_a1b2c3d4e5f6_test');
  assert.equal(approval, '2026-10-21:sense-recovery-fresh-119');
  assert.deepEqual([ports.main, ports.s14], [58440, 58441]);
});
for (const run of ['', '../old', '1792530000000-ac13', '1792530000000-A1B2C3D4E5F6', '1792530000000-a1b2c3d4e5f6/..']) test(`run identifier rejects ${JSON.stringify(run)}`, () => {
  assert.throws(() => pathsFor(root, run));
});
test('owned paths are contained and never resolve to the retained or historical data directory', () => {
  const paths = pathsFor(root, runId);
  assert.equal(paths.base, resolve(root, '.env.consolidation-20261021/acceptance', runId));
  assert.equal(assertContained(root, paths.manifest), paths.manifest);
  assert.throws(() => assertContained(paths.base, resolve(root, '.env.checkpoint-tools/pg-demo-20261006-a7c9')));
  assert.throws(() => assertContained(root, resolve(root, '../outside')));
  assert.throws(() => assertContained(root, root));
});
test('environment construction removes inherited targets, CI impersonation and provider delivery values', () => {
  const env = cleanEnvironment({ PATH: 'inert path', SystemRoot: 'C:/Windows', DATABASE_URL: 'retained', MIGRATION_DATABASE_URL: 'retained-admin', PGPORT: '45434', S27_TEST_ENV_FILE: 'old', S18_DATABASE_URL: 'old', SENSE_RELEASE_MANIFEST: 'old', SENSE_RECOVERY_ACCEPTANCE_APPROVED: approval, MW_I02_ENABLED: '1', V1_AGENT1_TEST_MANIFEST: 'old', GITHUB_ACTIONS: 'true', GITHUB_ENV: 'old', CI: 'true', BREVO_API_KEY: 'private-provider', OWNER_BOOTSTRAP_SECRET: 'private-owner', NODE_OPTIONS: '--inert' });
  assert.equal(env.PATH, 'inert path'); assert.equal(env.SystemRoot, 'C:/Windows');
  for (const key of ['DATABASE_URL', 'MIGRATION_DATABASE_URL', 'PGPORT', 'S27_TEST_ENV_FILE', 'S18_DATABASE_URL', 'SENSE_RELEASE_MANIFEST', 'SENSE_RECOVERY_ACCEPTANCE_APPROVED', 'MW_I02_ENABLED', 'V1_AGENT1_TEST_MANIFEST', 'GITHUB_ACTIONS', 'GITHUB_ENV', 'NODE_OPTIONS']) assert.equal(env[key], undefined);
  for (const key of ['BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'BREVO_SENDER_NAME', 'OWNER_BOOTSTRAP_SECRET']) assert.equal(env[key], '');
  assert.equal(env.NODE_ENV, 'test'); assert.equal(env.CI, '');
});
test('datasource construction never uses a retained, default or forwarded listener', () => {
  const database = targetName(runId, 'DATABASE_URL'), password = 'a'.repeat(64);
  const url = connectionUrl(database, ports.main, runtimeUser, password);
  assertUrl(url, { database, port: ports.main }, runtimeUser);
  assertUrl(connectionUrl(database, ports.main, adminUser, password), { database, port: ports.main }, adminUser);
  for (const port of [45434, 59749, 59751, 5432, 57433]) assert.throws(() => connectionUrl(database, port, runtimeUser, password));
  assert.throws(() => connectionUrl(database, ports.main, 'postgres', password));
  assert.throws(() => connectionUrl('template1', ports.main, adminUser, password));
  assert.throws(() => assertUrl(`${url}?database=postgres`, { database, port: ports.main }, runtimeUser));
});
for (const pathKey of ['Path', 'PATH', 'path']) test(`nested tools retain their original ${pathKey} plus pinned Node and shim directories`, () => {
  const env = toolEnvironmentPath({ [pathKey]: 'original-system-path', OTHER: 'retained' }, 'pinned-node-directory', 'owned-pnpm-shim');
  assert.deepEqual(Object.keys(env).filter(key => key.toUpperCase() === 'PATH'), ['PATH']);
  assert.equal(env.PATH, ['owned-pnpm-shim', 'pinned-node-directory', 'original-system-path'].join(delimiter));
  assert.equal(env.OTHER, 'retained');
});
test('duplicate case variants never enter a Windows child environment', () => {
  const env = toolEnvironmentPath({ Path: 'original-system-path', PATH: 'conflicting-path', path: 'another-conflict' }, 'pinned-node-directory');
  assert.deepEqual(Object.keys(env).filter(key => key.toUpperCase() === 'PATH'), ['PATH']);
  assert.equal(env.PATH, ['pinned-node-directory', 'original-system-path'].join(delimiter));
});
test('migration pin refuses an older or unaccepted schema before migration', () => {
  const make = count => ({ hash: 'a'.repeat(64), migrations: Array.from({ length: count }, (_, i) => ({ name: i === count - 1 ? '20261015000000_task_creation_receipts' : `fixture${i}` })) });
  assertSource(make(119));
  for (const count of [0, 109, 115, 116, 118, 120]) assert.throws(() => assertSource(make(count)));
});
test('identity verification binds exact system, port, directory, OID and creation marker', () => {
  const directory = resolve(pathsFor(root, runId).base, 'postgres/main/data');
  const identity = { database: targetName(runId, 'DATABASE_URL'), address: '127.0.0.1', port: ports.main, directory, version: 180006, systemId: '7699999999999999999', oid: '16400', owner: adminUser, marker: `recovery:${runId}:DATABASE_URL` };
  verifyIdentity(identity, identity);
  for (const patch of [{ systemId: '7693570241708228348' }, { port: 45434 }, { directory: resolve(root, '.env.checkpoint-tools/pg-demo-20261006-a7c9') }, { oid: '145606' }, { marker: 'old' }, { owner: runtimeUser }, { version: 170010 }, { address: '0.0.0.0' }]) assert.throws(() => verifyIdentity({ ...identity, ...patch }, identity));
});
test('diagnostics remove generated credentials and complete connection URLs', () => {
  const secret = 'inert-generated-secret', message = `failure ${secret} postgresql://user:password@127.0.0.1:45434/saved_test`;
  const result = redact(message, [secret]);
  assert.ok(!result.includes(secret) && !result.includes('password') && !result.includes('45434'));
});
test('structured reports redact strings before serialization without breaking escaped JSON',()=>{
  const original={message:'URL postgresql://user:password@host/test\\" end',nested:[{secret:'generated-secret',count:507}],success:true};
  const result=redactTree(original,['generated-secret']);
  assert.deepEqual(JSON.parse(JSON.stringify(result)),result);assert.equal(result.nested[0].count,507);assert.equal(result.success,true);
  assert.ok(!JSON.stringify(result).includes('password') && !JSON.stringify(result).includes('generated-secret'));
});

import assert from 'node:assert/strict';
import { existsSync, realpathSync } from 'node:fs';
import { delimiter, dirname, isAbsolute, relative, resolve } from 'node:path';
import { createServer } from 'node:net';

export const approval = '2026-10-21:sense-recovery-fresh-119';
export const adminUser = 'sense_recovery_admin';
export const runtimeUser = 'sense_app_runtime';
export const ports = { main: 58440, s14: 58441, api: 58430, web: 58431, receiver: 58432, pwaApi: 58324, pwaWeb: 58323, boundedApi: 58652, boundedWeb: 58653 };
export const suiteKeys = ['DATABASE_URL', 'S12_DATABASE_URL', 'S13_DATABASE_URL', 'S14_DATABASE_URL', 'S15_DATABASE_URL', 'S16_DATABASE_URL', 'S17_DATABASE_URL', 'S18_DATABASE_URL', 'S19_DATABASE_URL', 'S20_DATABASE_URL', 'S21_DATABASE_URL', 'S22_DATABASE_URL', 'S23_DATABASE_URL', 'S24_DATABASE_URL', 'S24_SECURITY_DATABASE_URL', 'S25_DATABASE_URL', 'S25_SECURITY_DATABASE_URL', 'S26_DATABASE_URL', 'S26_SECURITY_DATABASE_URL', 'S27_DATABASE_URL', 'S27_SECURITY_DATABASE_URL'];
export const recoveryKeys = ['RECOVERY_PARITY_DATABASE_URL', 'RECOVERY_RECEIPT_DATABASE_URL', 'RECOVERY_BROWSER_DATABASE_URL'];
export function assertRunId(runId) { assert.match(runId ?? '', /^\d{13}-[a-f0-9]{12}$/, 'Exact generated recovery run identifier required'); }
export function pathsFor(root, runId) {
  assertRunId(runId);
  const base = resolve(root, '.env.consolidation-20261021/acceptance', runId);
  return { base, manifest: resolve(base, 'manifest.json'), private: resolve(base, 'private.json'), environment: resolve(base, 'environment.test'), reports: resolve(base, 'reports') };
}
export function assertContained(root, path) {
  const target = resolve(path), inside = relative(resolve(root), target);
  assert.ok(inside && !inside.startsWith('..') && !isAbsolute(inside), 'Recovery path escapes its named root');
  let ancestor = target;
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  assert.equal(realpathSync(ancestor).toLowerCase(), ancestor.toLowerCase(), 'Recovery refuses symbolic-link or reparse paths');
  return target;
}
export function targetName(runId, key) {
  assertRunId(runId);
  assert.ok([...suiteKeys, ...recoveryKeys, 'TEMPLATE_DATABASE_URL'].includes(key), 'Unknown recovery fixture key');
  const suffix = runId.replace('-', '_');
  const stem = key === 'DATABASE_URL' ? 's27_main_s27' : key === 'TEMPLATE_DATABASE_URL' ? 'recovery_template' : key.startsWith('RECOVERY_') ? `recovery_${key === 'RECOVERY_PARITY_DATABASE_URL' ? 'parity' : key === 'RECOVERY_RECEIPT_DATABASE_URL' ? 'receipts' : 'browser'}` : `s${/^S(\d+)/.exec(key)[1]}${key.includes('_SECURITY_') ? '_security' : ''}_s27`;
  const name = `sense_${stem}_${suffix}_test`;
  assert.ok(Buffer.byteLength(name) <= 63, 'Recovery database name exceeds PostgreSQL identifier length');
  return name;
}
export function quoteDatabase(name) {
  assert.match(name, /^sense_[a-z0-9_]+_test$/);
  assert.ok(Buffer.byteLength(name) <= 63);
  return `"${name}"`;
}
export function cleanEnvironment(ambient = process.env) {
  const result = { ...ambient };
  for (const key of Object.keys(result)) if (/DATABASE_URL|^PG|^S\d+_|^MW_I|^V1_AGENT1|^GITHUB|^CI(?:_|$)|^SENSE_|^NAS_|^E2E_|^BREVO_|^OWNER_BOOTSTRAP_|^EMAIL_VERIFICATION_|^EXTERNAL_SHARE_|^TIME_ACCOUNTING_|^NODE_OPTIONS$|^(?:PORT|WEB_ORIGIN|API_PROXY_TARGET|TRUST_PROXY_HOPS|WORKER_HEALTH_PATH|PLAYWRIGHT_JSON_OUTPUT_NAME)$/.test(key)) delete result[key];
  return { ...result, NODE_ENV: 'test', BREVO_API_KEY: '', BREVO_SENDER_EMAIL: '', BREVO_SENDER_NAME: '', OWNER_BOOTSTRAP_EMAIL: '', OWNER_BOOTSTRAP_SECRET: '', EMAIL_VERIFICATION_SECRET: '', EXTERNAL_SHARE_SECRET: '', TIME_ACCOUNTING_RECEIVER_URL: '', CI: '' };
}
/** Windows environment keys are case-insensitive; plain JS objects are not. */
export function toolEnvironmentPath(environment, nodeDirectory, shimDirectory) {
  const result = { ...environment };
  const originalPath = Object.entries(result).find(([key]) => key.toUpperCase() === 'PATH')?.[1] ?? '';
  for (const key of Object.keys(result)) if (key.toUpperCase() === 'PATH') delete result[key];
  result.PATH = [shimDirectory, nodeDirectory, originalPath].filter(Boolean).join(delimiter);
  return result;
}
export function connectionUrl(database, port, username, password) {
  assert.ok([58440, 58441].includes(port));
  assert.ok(['postgres', ...[database].filter(name => /^sense_[a-z0-9_]+_test$/.test(name))].includes(database));
  assert.ok([adminUser, runtimeUser].includes(username));
  assert.match(password, /^[a-f0-9]{64}$/);
  return `postgresql://${username}:${password}@127.0.0.1:${port}/${database}`;
}
export function assertUrl(url, target, username) {
  const parsed = new URL(url);
  assert.equal(parsed.protocol, 'postgresql:'); assert.equal(parsed.hostname, '127.0.0.1'); assert.equal(Number(parsed.port), target.port);
  assert.equal(parsed.pathname, `/${target.database}`); assert.equal(parsed.username, username); assert.match(parsed.password, /^[a-f0-9]{64}$/);
  assert.equal(parsed.search, ''); assert.equal(parsed.hash, '');
}
export function assertSource(source) {
  assert.equal(source.migrations.length, 119, 'Recovery candidate must have exactly119 migrations');
  assert.equal(source.migrations.at(-1)?.name, '20261015000000_task_creation_receipts');
  assert.match(source.hash, /^[a-f0-9]{64}$/);
}
export function redact(value, secrets = []) {
  let result = String(value);
  for (const secret of secrets.filter(Boolean)) result = result.replaceAll(secret, '[REDACTED]');
  return result.replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/gi, '[database URL redacted]');
}
export function verifyIdentity(actual, expected, database = expected.database) {
  assert.equal(actual.database, database, 'Unexpected recovery database'); assert.equal(actual.address, '127.0.0.1', 'Recovery requires IPv4 loopback');
  assert.equal(actual.port, expected.port, 'Unexpected actual PostgreSQL listener');
  assert.equal(resolve(actual.directory).toLowerCase(), resolve(expected.data ?? expected.directory).toLowerCase(), 'Unexpected PostgreSQL data directory');
  assert.ok(actual.version >= 180000 && actual.version < 190000, 'PostgreSQL18 required');
  assert.equal(actual.systemId, expected.systemId, 'Unexpected PostgreSQL system identity');
  if (expected.oid) assert.equal(actual.oid, expected.oid, 'Unexpected database OID');
  if (expected.marker) assert.equal(actual.marker, expected.marker, 'Unexpected recovery creation marker');
  if (expected.owner) assert.equal(actual.owner, expected.owner, 'Unexpected database owner');
}
export async function freePort(port) {
  return new Promise((done, reject) => {
    const server = createServer();
    server.once('error', error => reject(new Error(error.code === 'EADDRINUSE' ? `Recovery refuses occupied loopback port${port}` : `Recovery loopback preflight failed on port${port} (${error.code ?? 'unknown'}); do not infer server state or stop an existing target`)));
    server.listen(port, '127.0.0.1', () => server.close(error => error ? reject(error) : done()));
  });
}

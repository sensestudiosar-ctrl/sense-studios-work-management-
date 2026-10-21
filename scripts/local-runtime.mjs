import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

export const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
export function loadConfig(root = repositoryRoot) {
  const config = JSON.parse(readFileSync(resolve(root, 'config/local-runtime.json'), 'utf8'));
  assert.equal(config.version, 1);
  for (const port of [config.apiPort, config.webPort, config.database.port]) {
    assert.ok(Number.isInteger(port) && port > 0 && port <= 65535, 'Invalid runtime port');
  }
  assert.equal(new Set([config.apiPort, config.webPort, config.database.port]).size, 3);
  assert.equal(config.webOrigin, `http://localhost:${config.webPort}`);
  assert.equal(config.database.host, '127.0.0.1');
  assert.match(config.database.name, /^[a-z][a-z0-9_]+$/);
  assert.match(config.database.user, /^[a-z][a-z0-9_]+$/);
  assert.match(config.database.oid, /^\d+$/);
  assert.match(config.database.system, /^\d+$/);
  assert.ok(Number.isInteger(config.database.migrations) && config.database.migrations > 0);
  assert.ok(typeof config.toolchain?.pnpmEntry === 'string' && isAbsolute(config.toolchain.pnpmEntry), 'Absolute pinned pnpm entry required');
  for (const key of ['nasRoot', 'activeManifest', 'environmentFile']) {
    assert.equal(typeof config[key], 'string');
    const inside = relative(root, resolve(root, config[key]));
    assert.ok(inside && !inside.startsWith('..') && !isAbsolute(inside), `${key} must stay inside repository`);
  }
  return config;
}
export function databaseUrl(config) {
  const db = config.database;
  return `postgresql://${db.user}@${db.host}:${db.port}/${db.name}`;
}
export function verifyProcesses(config, manifest, actual, listeners) {
  assert.equal(manifest.state, 'READY', 'Runtime manifest is not READY');
  assert.equal(manifest.database, config.database.name);
  assert.equal(manifest.url, config.webOrigin + '/');
  assert.equal(resolve(manifest.nas), resolve(repositoryRoot, config.nasRoot));
  assert.equal(listeners.length, 2, 'Expected exactly two configured listeners');
  for (const label of ['api', 'web']) {
    const expected = manifest.processes[label];
    assert.ok(Number.isInteger(expected.pid) && expected.pid > 0);
    assert.equal(expected.pid, expected.identity.ProcessId);
    assert.deepEqual(actual[label], expected.identity, `${label} process identity changed`);
    const port = label === 'api' ? config.apiPort : config.webPort;
    const listener = listeners.filter(row => row.LocalPort === port);
    assert.equal(listener.length, 1, `${label} listener missing or duplicated`);
    assert.equal(listener[0].LocalAddress, '127.0.0.1');
    assert.equal(listener[0].OwningProcess, expected.pid, `${label} listener owner changed`);
  }
  assert.notEqual(manifest.processes.api.pid, manifest.processes.web.pid);
}
export function powershell(code) {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', code], {
    encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000
  });
  assert.equal(result.status, 0, 'Read-only Windows runtime inspection failed');
  return JSON.parse(result.stdout);
}
export async function verifyDatabase(config) {
  const { Client } = createRequire(resolve(repositoryRoot, 'apps/api/package.json'))('pg');
  const client = new Client({ connectionString: databaseUrl(config), connectionTimeoutMillis: 5000, query_timeout: 5000 });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const identity = (await client.query("SELECT current_database() AS name,current_user AS owner,inet_server_port() AS port,(SELECT system_identifier::text FROM pg_control_system()) AS system,(SELECT oid::text FROM pg_database WHERE datname=current_database()) AS oid,(SELECT count(*)::int FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrations")).rows[0];
    assert.deepEqual(identity, { name: config.database.name, owner: config.database.user, port: config.database.port, system: config.database.system, oid: config.database.oid, migrations: config.database.migrations }, 'Database identity differs from canonical config');
    const failed = (await client.query('SELECT count(*)::int AS count FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL')).rows[0].count;
    assert.equal(failed, 0, 'Unfinished migration present');
    await client.query('ROLLBACK');
    return identity;
  } finally { await client.end(); }
}
export async function status() {
  assert.equal(process.versions.node, '24.19.0', 'Pinned Node 24.19.0 required');
  assert.equal(process.platform, 'win32', 'Runtime process inspection requires Windows');
  const config = loadConfig();
  assert.ok(existsSync(resolve(repositoryRoot, config.nasRoot)), 'Canonical NAS root missing');
  const manifest = JSON.parse(readFileSync(resolve(repositoryRoot, config.activeManifest), 'utf8'));
  const actual = {};
  for (const label of ['api', 'web']) {
    const pid = manifest.processes[label].pid;
    assert.ok(Number.isInteger(pid) && pid > 0);
    actual[label] = powershell(`Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}' | Select-Object ProcessId,CreationDate,ExecutablePath,CommandLine | ConvertTo-Json -Compress`);
  }
  const listeners = powershell(`$items=@(Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in ${config.apiPort},${config.webPort} } | Select-Object LocalAddress,LocalPort,OwningProcess); ConvertTo-Json -InputObject $items -Compress`);
  verifyProcesses(config, manifest, actual, listeners);
  const database = await verifyDatabase(config);
  for (const endpoint of [`http://127.0.0.1:${config.apiPort}/api/v1/health/ready`, config.webOrigin + '/', config.webOrigin + '/api/v1/health/ready']) {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(5000), redirect: 'error' });
    assert.equal(response.status, 200, `Runtime health failed: ${endpoint}`);
  }
  return { state: 'READY', url: config.webOrigin + '/', apiPort: config.apiPort, database, readOnly: true };
}
export function inspectProcesses(config, manifest) {
  const actual = {};
  for (const label of ['api', 'web']) {
    const pid = manifest.processes[label].pid;
    assert.ok(Number.isInteger(pid) && pid > 0);
    actual[label] = powershell(`Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}' | Select-Object ProcessId,CreationDate,ExecutablePath,CommandLine | ConvertTo-Json -Compress`);
  }
  const listeners = powershell(`$items=@(Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in ${config.apiPort},${config.webPort} } | Select-Object LocalAddress,LocalPort,OwningProcess); ConvertTo-Json -InputObject $items -Compress`);
  verifyProcesses(config, manifest, actual, listeners);
  return actual;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    assert.ok(process.argv.length === 2 || (process.argv.length === 3 && ['status', '--check'].includes(process.argv[2])), 'Only read-only status/--check is supported');
    console.log(JSON.stringify(await status(), null, 2));
  } catch (error) { console.error(`Runtime check failed: ${error.message}`); process.exitCode = 1; }
}

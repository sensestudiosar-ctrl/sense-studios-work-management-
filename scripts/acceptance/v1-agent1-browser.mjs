import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { agent1Source } from './v1-agent1-source.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const base = resolve(root, '.artifacts/v1/20261016-agent1-browser');
const data = resolve(base, 'postgres/data');
const manifestPath = resolve(base, 'manifest.json');
const privatePath = resolve(base, 'private.json');
const binaries = 'C:/Program Files/PostgreSQL/18/bin';
const database = 'sense_v1_agent1_browser_20261016_test', user = 'agent1_browser_20261016', port = 59751;
const approval = '2026-10-16:agent1-fresh-browser-119';
const api = resolve(root, 'apps/api');
const require = createRequire(resolve(api, 'package.json'));
const { Client } = require('pg');
const command = process.argv[2] ?? 'inspect';
assert.ok(['inspect', 'prepare', 'test', 'repin', 'stop'].includes(command), 'Unknown command');
let privateState;
const redact = value => String(value).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[database URL redacted]').split(privateState?.password ?? randomUUID()).join('[redacted]');

function contained(path) {
  const inside = relative(root, resolve(path));
  assert.ok(inside && !inside.startsWith('..') && !isAbsolute(inside), 'Target must stay inside workspace');
  let ancestor = resolve(path);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  assert.equal(realpathSync(ancestor).toLowerCase(), ancestor.toLowerCase(), 'Symlink/reparse target refused');
}
function source() {
  const value = agent1Source(root);
  assert.equal(value.migrations.length, 119, 'Candidate must have exactly119 migrations');
  assert.equal(value.migrations.at(-1).name, '20261015000000_task_creation_receipts');
  return value;
}
async function run(program, args, env = process.env, log) {
  const result = await new Promise((done, reject) => {
    const child = spawn(program, args, { cwd: api, env, shell: false, windowsHide: true });
    const output = []; child.stdout.on('data', chunk => output.push(chunk)); child.stderr.on('data', chunk => output.push(chunk));
    child.once('error', reject);
    // pg_ctl can exit while its detached server retains a pipe on Windows.
    // Wait for exit for that launcher only; ordinary command logs drain on close.
    const detachedStart = program.toLowerCase().endsWith('pg_ctl.exe') && args.includes('start');
    child.once(detachedStart ? 'exit' : 'close', code => {
      if (detachedStart) { child.stdout.destroy(); child.stderr.destroy(); child.stdin.end(); }
      done({ code, output: redact(Buffer.concat(output).toString('utf8')) });
    });
  });
  if (log) writeFileSync(resolve(base, log), result.output);
  assert.equal(result.code, 0, `${log ?? 'Preflight'} exited${result.code}; inspect its redacted log`);
  return result.output.trim();
}
async function freePort() {
  for (const candidatePort of [port, 59752, 59753]) await new Promise((done, reject) => { const server = createServer(); server.once('error', reject); server.listen(candidatePort, '127.0.0.1', () => server.close(error => error ? reject(error) : done())); });
}
function approved() {
  assert.equal(process.env.V1_AGENT1_BROWSER_ACCEPTANCE_APPROVED, approval, 'Fresh explicit Owner lifecycle approval required; this flag alone is not human authorization');
}
function environment() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/DATABASE_URL|^PG|^MW_I|^S\d\d_|^GITHUB_ACTIONS$/.test(key)) delete env[key];
  // Explicit blanks prevent dotenv from filling provider/bootstrap values from a local .env.
  return { ...env, NODE_ENV: 'test', DATABASE_URL: privateState.url, MIGRATION_DATABASE_URL: privateState.url,
    V1_AGENT1_BROWSER_DATABASE_URL: privateState.url, V1_AGENT1_BROWSER_TEST_MANIFEST: manifestPath, API_TEST_WORKERS: '1',
    WEB_ORIGIN: 'http://127.0.0.1:59753', API_PROXY_TARGET: 'http://127.0.0.1:59752', PORT: '59752', NAS_ROOT: resolve(base, 'files'),
    OWNER_BOOTSTRAP_EMAIL: '', OWNER_BOOTSTRAP_SECRET: '', BREVO_API_KEY: '', BREVO_SENDER_EMAIL: '', BREVO_SENDER_NAME: '',
    EMAIL_VERIFICATION_SECRET: '', EXTERNAL_SHARE_SECRET: '', TIME_ACCOUNTING_RECEIVER_URL: '', CI: '' };
}
async function connect(db = database) {
  const client = new Client({ host: '127.0.0.1', port, user, password: privateState.password, database: db, application_name: 'v1-agent1-browser-acceptance', connectionTimeoutMillis: 5000 });
  await client.connect(); return client;
}
async function identity(client) {
  const { rows } = await client.query(`SELECT current_database() AS database, host(inet_server_addr()) AS address, inet_server_port() AS port,
    current_setting('data_directory') AS directory, current_setting('server_version_num')::int AS version,
    (SELECT system_identifier::text FROM pg_control_system()) AS "systemId",
    d.oid::text AS oid, pg_get_userbyid(d.datdba) AS owner, shobj_description(d.oid,'pg_database') AS marker
    FROM pg_database d WHERE d.datname=current_database()`);
  const row = rows[0]; assert.ok(row); assert.equal(row.address, '127.0.0.1'); assert.equal(row.port, port);
  assert.equal(resolve(row.directory).toLowerCase(), data.toLowerCase()); assert.ok(row.version >= 180000 && row.version < 190000);
  assert.equal(row.owner, user); return row;
}
function writeManifest(value) { writeFileSync(manifestPath, JSON.stringify(value, null, 2)); }
function load() {
  assert.ok(existsSync(manifestPath) && existsSync(privatePath), 'No prepared target');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.approval, approval); assert.equal(manifest.database, database); assert.equal(manifest.port, port); assert.equal(manifest.data, data); assert.equal(manifest.apiPort, 59752); assert.equal(manifest.webPort, 59753); assert.equal(manifest.storage, resolve(base, 'files'));
  privateState = JSON.parse(readFileSync(privatePath, 'utf8'));
  const url = new URL(privateState.url); assert.equal(url.hostname, '127.0.0.1'); assert.equal(Number(url.port), port); assert.equal(url.pathname, `/${database}`); assert.equal(url.username, user);
  assert.equal(url.protocol, 'postgresql:'); assert.equal(url.search, ''); assert.match(privateState.password, /^[a-f0-9]{64}$/); assert.equal(url.password, privateState.password);
  return manifest;
}
async function verifyMigrations(client, candidate) {
  const rows = (await client.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
  assert.deepEqual(rows.map(row => ({ name: row.migration_name, checksum: row.checksum })), candidate.migrations);
  assert.ok(rows.every(row => row.finished_at && !row.rolled_back_at));
}
async function main() {
  assert.equal(process.version, 'v24.19.0'); contained(base); contained(data); contained(resolve(base, 'files')); contained(resolve(base, 'browser'));
  const candidate = command === 'stop' ? undefined : source();
  if (command === 'inspect') {
    const version = await run(resolve(binaries, 'initdb.exe'), ['--version']);
    assert.match(version, /18\.6/);
    if (!existsSync(base)) await freePort();
    console.log(JSON.stringify({ command, version, port, apiPort: 59752, webPort: 59753, data, database, exists: existsSync(base), sourceHash: candidate.hash, migrations: candidate.migrations.length, lifecycleExecuted: false })); return;
  }
  approved();
  if (command === 'prepare') {
    let manifest;
    if (command === 'prepare') {
      assert.ok(!existsSync(base), 'Existing target/evidence path refused; never reinitialize');
      await freePort();
      assert.match(await run(resolve(binaries, 'initdb.exe'), ['--version']), /18\.6/);
      mkdirSync(base, { recursive: true }); contained(base);
      privateState = { password: randomBytes(32).toString('hex') };
      privateState.url = `postgresql://${user}:${privateState.password}@127.0.0.1:${port}/${database}`;
      writeFileSync(privatePath, JSON.stringify(privateState), { mode: 0o600 });
      const passwordFile = resolve(base, 'bootstrap-password'); writeFileSync(passwordFile, privateState.password, { mode: 0o600 });
      manifest = { approval, database, port, data, source: candidate, createdAt: new Date().toISOString(), phase: 'initializing', apiPort: 59752, webPort: 59753, storage: resolve(base, 'files') }; writeManifest(manifest);
      mkdirSync(dirname(data), { recursive: true });
      await run(resolve(binaries, 'initdb.exe'), ['-D', data, '-U', user, '--auth-local=scram-sha-256', '--auth-host=scram-sha-256', '--encoding=UTF8', '--locale=C', `--pwfile=${passwordFile}`], process.env, 'initdb.log');
      await run(resolve(binaries, 'pg_ctl.exe'), ['-D', data, '-l', resolve(base, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port} -c timezone=UTC -c max_connections=40`, '-w', '-t', '20', 'start'], process.env, 'start.log');
    }
    let client = await connect('postgres');
    try {
      const initial = await identity(client); assert.equal(initial.database, 'postgres');
      assert.equal((await client.query('SELECT count(*)::int AS n FROM pg_database WHERE datname=$1', [database])).rows[0].n, 0, 'Ambiguous existing target refused');
      manifest.systemId = initial.systemId; manifest.marker = `v1-agent1-browser:${randomUUID()}`; manifest.phase = 'provisioning'; writeManifest(manifest);
      await client.query(`CREATE DATABASE "${database}" OWNER "${user}"`);
      // Fixed identifier plus generated marker, never a user-supplied SQL fragment.
      await client.query(`COMMENT ON DATABASE "${database}" IS '${manifest.marker}'`);
    } finally { await client.end(); }
    client = await connect();
    try { manifest.identity = await identity(client); assert.equal(manifest.identity.marker, manifest.marker); } finally { await client.end(); }
    manifest.phase = 'migrating'; writeManifest(manifest);
    assert.equal(source().hash, candidate.hash, 'Source drift before migration');
    await run(process.execPath, [resolve(api, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], environment(), 'migrations.log');
    client = await connect(); try { await verifyMigrations(client, candidate); } finally { await client.end(); }
    assert.equal(source().hash, candidate.hash, 'Source drift during migration'); manifest.phase = 'ready'; writeManifest(manifest);
    console.log(JSON.stringify({ command, database, port, migrations: 119, phase: 'ready', retainedTargetsTouched: false })); return;
  }
  const manifest = load();
  if (command === 'stop' && !manifest.identity) {
    assert.ok(['initializing', 'provisioning'].includes(manifest.phase), 'Only a just-created partial target may use its bootstrap identity');
    const bootstrap = await connect('postgres');
    try { const actual = await identity(bootstrap); if (manifest.systemId) assert.equal(actual.systemId, manifest.systemId); }
    finally { await bootstrap.end(); }
    await run(resolve(binaries, 'pg_ctl.exe'), ['-D', data, '-m', 'fast', '-w', '-t', '20', 'stop'], process.env, 'stop.log');
    manifest.phase = 'stopped'; writeManifest(manifest); console.log(JSON.stringify({ command, phase: 'stopped', partialDataPreserved: true })); return;
  }
  assert.ok(manifest.identity && manifest.systemId, 'Incomplete target identity');
  const client = await connect();
  try {
    assert.deepEqual(await identity(client), manifest.identity, 'Target identity changed');
    if (command === 'test' || command === 'repin') {
      if (command === 'test') assert.equal(candidate.hash, manifest.source.hash, 'Source drift: review before a new acceptance pin');
      await verifyMigrations(client, candidate);
    }
  } finally { await client.end(); }
  if (command === 'stop') {
    await run(resolve(binaries, 'pg_ctl.exe'), ['-D', data, '-m', 'fast', '-w', '-t', '20', 'stop'], process.env, 'stop.log');
    manifest.phase = 'stopped'; writeManifest(manifest); console.log(JSON.stringify({ command, phase: 'stopped', databasePreserved: true })); return;
  }
  assert.equal(manifest.phase, 'ready');
  if (command === 'repin') {
    assert.equal(process.argv[3], `--reviewed-source=${candidate.hash}`, 'Explicit reviewed current source hash required');
    assert.deepEqual(candidate.migrations, manifest.source.migrations, 'Applied migration changes cannot be repinned');
    const prior = new Map(manifest.source.files.map(row => [row.path, row.hash]));
    const changes = candidate.files.filter(row => prior.get(row.path) !== row.hash).map(row => row.path);
    const removed = manifest.source.files.filter(row => !candidate.files.some(current => current.path === row.path)).map(row => row.path);
    writeFileSync(resolve(base, `prior-source-${manifest.source.hash}.json`), JSON.stringify({ source: manifest.source, changes, removed, reviewedAt: new Date().toISOString() }, null, 2), { flag: 'wx' });
    manifest.source = candidate; writeManifest(manifest);
    console.log(JSON.stringify({ command, sourceHash: candidate.hash, changes, removed, databaseWrites: false })); return;
  }
  await run(process.execPath, ['--experimental-vm-modules', resolve(api, 'node_modules/jest/bin/jest.js'), '--config', resolve(api, 'jest.config.cjs'), '--runInBand', '--runTestsByPath', 'src/project-workflow.database.api.spec.ts', '--testMatch', '**/project-workflow.database.api.spec.ts', '--json', `--outputFile=${resolve(base, 'project-directory-tests.json')}`], environment(), 'project-directory-tests.log');
  await run(process.execPath, ['--experimental-vm-modules', resolve(api, 'node_modules/jest/bin/jest.js'), '--config', resolve(api, 'jest.config.cjs'), '--runInBand', '--runTestsByPath', 'src/v1-agent1-browser.acceptance.spec.ts', '--testMatch', '**/v1-agent1-browser.acceptance.spec.ts', '--json', `--outputFile=${resolve(base, 'browser-tests.json')}`], environment(), 'browser-tests.log');
  assert.equal(source().hash, candidate.hash, 'Source drift during tests'); console.log(JSON.stringify({ command, result: 'passed', sourceHash: candidate.hash, databasePreserved: true }));
}
await main().catch(error => { console.error(redact(error instanceof Error ? error.message : error)); process.exitCode = 1; });

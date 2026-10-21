import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createConnection } from 'node:net';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { recoveryTestSource, loadRecoveryTestTarget, verifyRecoveryTestDatabase } from '../../apps/api/src/recovery-test-target.ts';
import { approval, adminUser, runtimeUser, ports, suiteKeys, recoveryKeys, pathsFor, assertContained, targetName, quoteDatabase, cleanEnvironment, toolEnvironmentPath, connectionUrl, assertUrl, assertSource, redact, redactTree, verifyIdentity, freePort } from './native-acceptance-lib.mjs';
import { assertNoSkipped, jestCounts, vitestCounts, playwrightCounts } from '../ci/test-report-utils.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const apiRoot = resolve(root, 'apps/api'), webRoot = resolve(root, 'apps/web');
const binaries = 'C:/Program Files/PostgreSQL/18/bin';
const pnpmCli = 'C:/Users/HI/AppData/Local/node/corepack/v1/pnpm/11.19.0/bin/pnpm.cjs';
const { Client } = createRequire(resolve(apiRoot, 'package.json'))('pg');
const [command = 'inspect', runArgument, ...flags] = process.argv.slice(2);
const option = name => flags.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
assert.ok(['inspect', 'prepare', 'check', 'run', 'stop'].includes(command), 'Unknown recovery acceptance command');
const runId = runArgument && !runArgument.startsWith('--') ? runArgument : `${Date.now()}-${randomBytes(6).toString('hex')}`;
const paths = pathsFor(root, runId);
const secretValues = [];
let manifest, privateState;
const safe = value => redact(value, secretValues);
const writeJson = (path, value, exclusive = false) => { assertContained(root, path); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { ...(exclusive ? { flag: 'wx' } : {}), mode: 0o600 }); };
const persist = () => writeJson(paths.manifest, manifest);
const source = () => { const value = recoveryTestSource(root); assertSource(value); return value; };
const assertCurrent = () => assert.deepEqual(source(), manifest.source, 'Recovery source changed; prepare a newly reviewed run instead of silently repinning');
const identitySql = `SELECT current_database() AS database, host(inet_server_addr()) AS address, inet_server_port() AS port,
  current_setting('data_directory') AS directory, current_setting('server_version_num')::int AS version,
  (SELECT system_identifier::text FROM pg_control_system()) AS "systemId", d.oid::text AS oid,
  pg_get_userbyid(d.datdba) AS owner, shobj_description(d.oid,'pg_database') AS marker FROM pg_database d WHERE d.datname=current_database()`;

function authorized() {
  assert.equal(process.env.SENSE_RECOVERY_ACCEPTANCE_APPROVED, approval, 'Explicit Owner-authorized recovery lifecycle flag required; the flag itself is not human authorization');
}
function environment(additions = {}) {
  const env = { ...cleanEnvironment(), ...privateState?.environment, ...additions };
  const shim = existsSync(resolve(paths.base, 'bin/pnpm.cmd')) ? resolve(paths.base, 'bin') : undefined;
  return toolEnvironmentPath(env, dirname(process.execPath), shim);
}
function child(program, args, options = {}) {
  return spawn(program, args, { cwd: root, env: environment(), shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...options });
}
async function run(program, args, { log, cwd = root, env = environment(), acceptedCodes = [0], pgStart = false } = {}) {
  const result = await new Promise((done, reject) => {
    const process = child(program, args, { cwd, env });
    const output = []; let bytes = 0;
    for (const stream of [process.stdout, process.stderr]) stream.on('data', chunk => { bytes += chunk.length; if (bytes <= 16 * 1024 * 1024) output.push(chunk); });
    process.once('error', () => reject(new Error('Owned recovery command could not start')));
    process.once(pgStart ? 'exit' : 'close', code => {
      if (pgStart) { process.stdout.destroy(); process.stderr.destroy(); }
      done({ code, output: safe(Buffer.concat(output).toString('utf8')) + (bytes > 16 * 1024 * 1024 ? '\n[log truncated at16MiB]\n' : '') });
    });
  });
  if (log) { assertContained(paths.base, log); writeFileSync(log, result.output, { flag: 'wx', mode: 0o600 }); }
  assert.ok(acceptedCodes.includes(result.code), `Owned recovery command exited${result.code}; inspect its private redacted log`);
  return result;
}
async function toolchain() {
  assert.equal(process.version, 'v24.19.0', 'Pinned Node24.19.0 required');
  const version = (await run(process.execPath, [pnpmCli, '--version'], { env: cleanEnvironment() })).output.trim();
  assert.equal(version, '11.19.0');
  assert.match((await run(resolve(binaries, 'initdb.exe'), ['--version'], { env: cleanEnvironment() })).output, /18\.6/);
}
function adminUrl(database, port) { return connectionUrl(database, port, adminUser, privateState.adminPassword); }
async function connect(url) { const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000, application_name: 'sense-recovery-native-acceptance' }); await client.connect(); return client; }
async function migrations(client) {
  const rows = (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
  assert.deepEqual(rows.map(row => ({ name: row.migration_name, checksum: row.checksum })), manifest.source.migrations, 'Exact recovery migration names/checksums required');
  assert.ok(rows.every(row => row.finished_at && !row.rolled_back_at), 'Recovery requires a clean migration ledger');
}
async function verifiedCluster(cluster) {
  assertContained(paths.base, cluster.data);
  const client = await connect(adminUrl('postgres', cluster.port));
  try { verifyIdentity((await client.query(identitySql)).rows[0], cluster, 'postgres'); return client; }
  catch (error) { await client.end(); throw error; }
}
function load() {
  assertContained(root, paths.base); assert.ok(existsSync(paths.manifest) && existsSync(paths.private), 'No owned recovery run exists');
  manifest = JSON.parse(readFileSync(paths.manifest, 'utf8')); privateState = JSON.parse(readFileSync(paths.private, 'utf8'));
  assert.equal(manifest.schema, 1); assert.equal(manifest.approval, approval); assert.equal(manifest.runId, runId);
  assert.ok(['api', 'browser'].includes(manifest.purpose));
  assert.match(privateState.adminPassword, /^[a-f0-9]{64}$/); assert.match(privateState.runtimePassword, /^[a-f0-9]{64}$/);
  secretValues.push(privateState.adminPassword, privateState.runtimePassword, ...Object.entries(privateState.environment).filter(([key]) => /SECRET|TOKEN|PASSWORD|DATABASE_URL/.test(key)).map(([, value]) => value));
  assert.equal(privateState.environment.SENSE_RECOVERY_TEST_MANIFEST, paths.manifest);
  assert.deepEqual(Object.keys(manifest.targets).sort(), [...suiteKeys, ...recoveryKeys].sort());
  for (const [name, cluster] of Object.entries(manifest.clusters)) {
    assert.ok(['main', 's14'].includes(name)); assert.equal(cluster.port, ports[name]); assert.equal(resolve(cluster.data), resolve(paths.base, `postgres/${name}/data`));
    assertContained(paths.base, cluster.data);
  }
  for (const [key, target] of Object.entries(manifest.targets)) {
    assert.equal(target.database, targetName(runId, key)); assert.equal(target.port, key === 'S14_DATABASE_URL' ? ports.s14 : ports.main);
    assert.equal(target.data, manifest.clusters[key === 'S14_DATABASE_URL' ? 's14' : 'main'].data);
    assertUrl(privateState.environment[key], target, runtimeUser);
  }
}
async function checkAll() {
  assert.equal(manifest.phase, 'ready'); assertCurrent();
  for (const cluster of Object.values(manifest.clusters)) { const client = await verifiedCluster(cluster); await client.end(); }
  for (const [key, target] of Object.entries(manifest.targets)) {
    const client = await connect(privateState.environment[key]);
    try {
      verifyIdentity((await client.query(identitySql)).rows[0], { ...target, ...target.identity }); await migrations(client);
      const role = (await client.query('SELECT current_user AS username, rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
      assert.equal(role.username, runtimeUser); for (const field of ['rolsuper', 'rolcreatedb', 'rolcreaterole', 'rolbypassrls']) assert.equal(role[field], false);
    } finally { await client.end(); }
  }
  for (const key of ['DATABASE_URL', ...recoveryKeys]) {
    const binding = loadRecoveryTestTarget(privateState.environment, root, key);
    const client = await connect(binding.url);
    try { await verifyRecoveryTestDatabase({ $queryRaw: async (pieces) => (await client.query(pieces.join(''))).rows }, binding); }
    finally { await client.end(); }
  }
  assertCurrent();
}
async function stopClusters() {
  const failures = [];
  for (const [name, cluster] of Object.entries(manifest.clusters).reverse()) {
    if (!cluster.started || cluster.stoppedAt) continue;
    try {
      const status = await run(resolve(binaries, 'pg_ctl.exe'), ['-D', cluster.data, 'status'], { env: cleanEnvironment(), acceptedCodes: [0, 3] });
      if (status.code === 3) { await freePort(cluster.port); cluster.stoppedAt = new Date().toISOString(); cluster.stopEvidence = 'owned pg_ctl status3 and listener free'; persist(); continue; }
      const client = await verifiedCluster(cluster); await client.end();
      await run(resolve(binaries, 'pg_ctl.exe'), ['-D', cluster.data, '-m', 'fast', '-w', '-t', '30', 'stop'], { env: cleanEnvironment(), log: resolve(paths.base, `${name}-stop-${Date.now()}.log`) });
      await freePort(cluster.port); cluster.stoppedAt = new Date().toISOString(); persist();
    } catch { failures.push(name); }
  }
  assert.equal(failures.length, 0, `Could not safely stop owned recovery cluster(s):${failures.join(',')}; no unrelated process was stopped`);
  manifest.phase = 'stopped'; persist();
}
async function provision() {
  const candidate = source(); assert.equal(option('reviewed-source'), candidate.hash, 'Explicit reviewed current source hash required');
  const purpose = option('purpose'); assert.ok(['api', 'browser'].includes(purpose), 'Pass --purpose=api or --purpose=browser');
  assert.ok(!existsSync(paths.base), 'Existing recovery target/evidence directory refused; never reinitialize');
  assertContained(root, paths.base); for (const port of Object.values(ports)) await freePort(port);
  mkdirSync(paths.base, { recursive: true }); assertContained(root, paths.base);
  const suffix = runId.replace('-', '_'), envFile = `.env.s27-tools/s27-fresh-${suffix}.test`;
  assertContained(root, resolve(root, envFile));
  assert.ok(!existsSync(resolve(root, envFile)), 'Existing S27 compatibility environment refused');
  privateState = { adminPassword: randomBytes(32).toString('hex'), runtimePassword: randomBytes(32).toString('hex'), environment: {} };
  secretValues.push(privateState.adminPassword, privateState.runtimePassword);
  manifest = { schema: 1, approval, phase: 'initializing', runId, purpose, source: candidate, createdAt: new Date().toISOString(), clusters: {}, targets: {}, compatibilityEnvironment: envFile, privileges: 'Runtime role is not a superuser. Disposable-only metadata reads: pg_read_all_settings membership with INHERIT, pg_control_system EXECUTE. S22 alone grants schema CREATE and owns audit_events for injected-trigger rollback.' };
  for (const name of ['main', 's14']) manifest.clusters[name] = { data: resolve(paths.base, `postgres/${name}/data`), port: ports[name], started: false };
  const env = { NODE_ENV: 'test', DATABASE_POOL_MAX: '8', SENSE_RECOVERY_TEST_MANIFEST: paths.manifest,
    S27_TEST_ENV_FILE: envFile, S27_EXPECTED_MIGRATIONS: '119', API_TEST_WORKERS: '2', VITEST_WORKERS: '2', PLAYWRIGHT_WORKERS: '1',
    E2E_API_PORT: String(ports.api), E2E_WEB_PORT: String(ports.web), S16_TEST_RECEIVER: '1', S16_TEST_RECEIVER_HOST: '127.0.0.1', S16_TEST_RECEIVER_PORT: String(ports.receiver),
    TIME_ACCOUNTING_RECEIVER_URL: `http://127.0.0.1:${ports.receiver}`, S25_E2E_PRODUCTION_PREVIEW: '1', S27_E2E_PRODUCTION_PREVIEW: '1', S22_PWA_PREVIEW_URL: `http://localhost:${ports.pwaWeb}`,
    BREVO_API_KEY: '', BREVO_SENDER_EMAIL: '', BREVO_SENDER_NAME: '', OWNER_BOOTSTRAP_EMAIL: '', OWNER_BOOTSTRAP_SECRET: '',
    S27_RUN_ID: `recovery-${runId}`, NAS_ROOT: resolve(paths.base, 'files/main'), E2E_NAS_ROOT: resolve(paths.base, 'files/main'), SENSE_RECOVERY_REPORT_DIR: paths.reports };
  for (const slice of Array.from({ length: 16 }, (_, i) => i + 12)) env[`S${slice}_E2E_ENABLED`] = '1';
  for (const key of ['S02_E2E_BOOTSTRAP_SECRET', 'EMAIL_VERIFICATION_SECRET', 'EXTERNAL_SHARE_SECRET', 'S16_TEST_RECEIVER_TOKEN']) { env[key] = randomBytes(32).toString('hex'); secretValues.push(env[key]); }
  for (const slice of [19, 20, 21, 22, 23, 24, 25, 26]) env[`S${slice}_SCREENSHOT_DIR`] = resolve(paths.base, `screenshots/s${slice}`);
  env.S18_SCREENSHOT_DIR = resolve(root, '.env.s18-tools/runs', env.S27_RUN_ID, 'screenshots');
  env.S27_SCREENSHOT_DIR = resolve(root, '.env.s27-tools/runs', env.S27_RUN_ID, 'screenshots');
  for (const key of [...suiteKeys, ...recoveryKeys]) {
    const port = key === 'S14_DATABASE_URL' ? ports.s14 : ports.main, cluster = manifest.clusters[key === 'S14_DATABASE_URL' ? 's14' : 'main'];
    const target = { database: targetName(runId, key), port, username: runtimeUser, data: cluster.data };
    if (key === 'RECOVERY_BROWSER_DATABASE_URL') Object.assign(target, { apiPort: ports.boundedApi, webPort: ports.boundedWeb, storage: resolve(paths.base, 'files/browser') });
    manifest.targets[key] = target; env[key] = connectionUrl(target.database, port, runtimeUser, privateState.runtimePassword);
  }
  env.MIGRATION_DATABASE_URL = adminUrl(manifest.targets.DATABASE_URL.database, ports.main); env.S16_ADMIN_DATABASE_URL = env.S16_DATABASE_URL;
  privateState.environment = env; writeJson(paths.private, privateState, true); persist();
  try {
    const bin = resolve(paths.base, 'bin'); mkdirSync(bin, { recursive: true }); assertContained(paths.base, bin);
    writeFileSync(resolve(bin, 'pnpm.cmd'), `@echo off\r\n"${process.execPath}" "${pnpmCli}" %*\r\n`, { flag: 'wx', mode: 0o600 });
    for (const [name, cluster] of Object.entries(manifest.clusters)) {
      assertCurrent(); assertContained(paths.base, cluster.data); mkdirSync(dirname(cluster.data), { recursive: true });
      const pwfile = resolve(paths.base, `postgres/${name}/bootstrap-password`); writeFileSync(pwfile, privateState.adminPassword, { flag: 'wx', mode: 0o600 });
      await run(resolve(binaries, 'initdb.exe'), ['-D', cluster.data, '-U', adminUser, '--auth-local=scram-sha-256', '--auth-host=scram-sha-256', '--encoding=UTF8', '--locale=C', `--pwfile=${pwfile}`], { env: cleanEnvironment(), log: resolve(paths.base, `${name}-initdb.log`) });
      const control = await run(resolve(binaries, 'pg_controldata.exe'), ['-D', cluster.data], { env: cleanEnvironment() });
      cluster.systemId = /Database system identifier:\s*(\d+)/.exec(control.output)?.[1]; assert.match(cluster.systemId ?? '', /^\d+$/); persist();
      cluster.started = true; persist(); // Record ownership before launcher; cleanup can verify a partial start.
      await run(resolve(binaries, 'pg_ctl.exe'), ['-D', cluster.data, '-l', resolve(paths.base, `${name}-postgres.log`), '-o', `-h 127.0.0.1 -p ${cluster.port} -c timezone=UTC -c max_connections=80`, '-w', '-t', '30', 'start'], { env: cleanEnvironment(), log: resolve(paths.base, `${name}-start.log`), pgStart: true });
      const admin = await verifiedCluster(cluster);
      try {
        await admin.query(`CREATE ROLE ${runtimeUser} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${privateState.runtimePassword}'`);
        await admin.query(`GRANT pg_read_all_settings TO ${runtimeUser} WITH INHERIT TRUE`);
        await admin.query(`GRANT EXECUTE ON FUNCTION pg_control_system() TO ${runtimeUser}`);
      } finally { await admin.end(); }
    }
    manifest.phase = 'migrating'; persist();
    const template = targetName(runId, 'TEMPLATE_DATABASE_URL');
    for (const [database, clusterName] of [[template, 'main'], [manifest.targets.S14_DATABASE_URL.database, 's14']]) {
      const cluster = manifest.clusters[clusterName], admin = await verifiedCluster(cluster);
      try { assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])).rowCount, 0); await admin.query(`CREATE DATABASE ${quoteDatabase(database)} OWNER ${adminUser}`); }
      finally { await admin.end(); }
      assertCurrent();
      await run(process.execPath, [resolve(apiRoot, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
        cwd: apiRoot, env: environment({ DATABASE_URL: connectionUrl(database, cluster.port, runtimeUser, privateState.runtimePassword), MIGRATION_DATABASE_URL: adminUrl(database, cluster.port) }), log: resolve(paths.base, `${clusterName}-migrations.log`) });
      const migrated = await connect(adminUrl(database, cluster.port)); try { await migrations(migrated); } finally { await migrated.end(); }
    }
    for (const [key, target] of Object.entries(manifest.targets)) {
      const admin = await verifiedCluster(manifest.clusters[key === 'S14_DATABASE_URL' ? 's14' : 'main']);
      try {
        if (key !== 'S14_DATABASE_URL') { assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [target.database])).rowCount, 0); await admin.query(`CREATE DATABASE ${quoteDatabase(target.database)} WITH TEMPLATE ${quoteDatabase(template)} OWNER ${adminUser}`); }
        await admin.query(`COMMENT ON DATABASE ${quoteDatabase(target.database)} IS 'recovery:${runId}:${key}'`);
      } finally { await admin.end(); }
      const targetAdmin = await connect(adminUrl(target.database, target.port));
      try {
        if (key === 'S22_DATABASE_URL') { await targetAdmin.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${runtimeUser}`); await targetAdmin.query(`ALTER TABLE audit_events OWNER TO ${runtimeUser}`); }
        if (key === 'RECOVERY_PARITY_DATABASE_URL') {
          await targetAdmin.query('INSERT INTO organizations(id,name,"updatedAt") VALUES($1,$2,CURRENT_TIMESTAMP)', [randomUUID(), 'Recovery parity isolated fixture']);
          await targetAdmin.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'OWNER\',\'ACTIVE\',CURRENT_TIMESTAMP)', [randomUUID(), `recovery-parity-${runId}@example.test`]);
        }
        target.identity = (await targetAdmin.query(identitySql)).rows[0]; await migrations(targetAdmin);
      } finally { await targetAdmin.end(); }
    }
    for (const path of [paths.reports, env.NAS_ROOT, resolve(paths.base,'files/parity'), ...Object.entries(env).filter(([key]) => key.endsWith('_SCREENSHOT_DIR')).map(([, value]) => value), manifest.targets.RECOVERY_BROWSER_DATABASE_URL.storage]) { assertContained(root, path); mkdirSync(path, { recursive: true }); }
    const contents = `${Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n')}\n`;
    writeFileSync(paths.environment, contents, { flag: 'wx', mode: 0o600 });
    mkdirSync(resolve(root, '.env.s27-tools'), { recursive: true }); assertContained(root, resolve(root, envFile)); writeFileSync(resolve(root, envFile), contents, { flag: 'wx', mode: 0o600 });
    manifest.phase = 'ready'; persist(); await checkAll(); assertCurrent();
    writeJson(resolve(paths.reports, 'provision.json'), { runId, purpose, source: candidate.hash, migrations: 119, targets: Object.keys(manifest.targets).length, identityAndChecksumsVerified: true, retainedTargetsTouched: false }, true);
  } catch (error) {
    manifest.failure = safe(error.message); manifest.phase = 'failed'; persist();
    try { await stopClusters(); } catch { manifest.phase = 'failed-stop-required'; persist(); }
    throw error;
  }
}

async function service(label, args, env, probe, cwd = root) {
  const ownedProcess = child(process.execPath, args, { env, cwd }); let error; const output = [];
  ownedProcess.once('error', () => { error = true; }); for (const stream of [ownedProcess.stdout, ownedProcess.stderr]) stream.on('data', chunk => output.push(chunk));
  const owned = { label, process: ownedProcess, output };
  try {
    for (let attempt = 0; attempt < 120; attempt++) {
      assert.ok(!error && ownedProcess.exitCode === null && ownedProcess.signalCode === null, `${label} exited during startup`);
      try { if (await probe()) return owned; } catch { /* Exact new owned listener may still be starting. */ }
      await new Promise(done => setTimeout(done, 250));
    }
    throw new Error(`${label} did not become ready`);
  } catch (failure) { await stopService(owned); throw failure; }
}
async function stopService(owned) {
  if (owned.process.exitCode === null && owned.process.signalCode === null) {
    const closed = new Promise(done => owned.process.once('close', done)); owned.process.kill('SIGTERM');
    const graceful = await Promise.race([closed.then(() => true), new Promise(done => setTimeout(() => done(false), 5000))]);
    if (!graceful) { owned.process.kill('SIGKILL'); await Promise.race([closed, new Promise(done => setTimeout(done, 5000))]); }
  }
  const path = resolve(paths.reports, `${owned.label}-${Date.now()}.log`); writeFileSync(path, safe(Buffer.concat(owned.output).toString('utf8')), { flag: 'wx', mode: 0o600 });
}
const httpReady = url => async () => (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
const tcpReady = port => async () => new Promise(done => { const socket = createConnection({ host: '127.0.0.1', port }); socket.once('connect', () => { socket.destroy(); done(true); }); socket.once('error', () => done(false)); });
async function withReceiver(action) {
  await freePort(ports.receiver); const receiver = await service('accounting-receiver', [resolve(root, 'scripts/s16-accounting-test-receiver.mjs')], environment(), tcpReady(ports.receiver));
  try { await action(); } finally { await stopService(receiver); }
}
async function testCommand(stage, program, args, cwd, env, format) {
  const output = resolve(paths.reports, stage); assertContained(paths.base, output); mkdirSync(output, { recursive: true });
  const report = resolve(output, 'results.json');
  const parameters = format === 'jest' ? [...args, '--json', '--outputFile', report] : format === 'vitest' ? [...args, '--reporter=json', '--outputFile', report] : args;
  const result = await run(program, parameters, { cwd, env, log: resolve(output, 'command.log'), acceptedCodes: [0, 1] });
  const parsed = JSON.parse(readFileSync(report, 'utf8'));
  const counts = format === 'jest' ? jestCounts(parsed) : format === 'vitest' ? vitestCounts(parsed) : playwrightCounts(parsed);
  writeJson(report, redactTree(parsed,secretValues)); writeJson(resolve(output, 'summary.json'), { source: manifest.source.hash, exitCode: result.code, counts });
  assert.equal(result.code, 0, `${stage} failed; see private structured report`); assertNoSkipped(stage, counts); assertCurrent();
  process.stdout.write(`${JSON.stringify({ stage, ...counts })}\n`);
}
async function executeStage(stage) {
  const lockPath = resolve(paths.base, 'runner.lock');
  const lock = await open(lockPath, 'wx', 0o600);
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, stage, at: new Date().toISOString() })); await checkAll();
    assert.ok(['quality', 'postgres', 'receipts', 'bounded-browser', 'e2e', 'api-all'].includes(stage), 'Unknown explicit recovery stage');
    if (['postgres', 'receipts', 'api-all'].includes(stage)) assert.equal(manifest.purpose, 'api');
    if (['e2e', 'bounded-browser'].includes(stage)) assert.equal(manifest.purpose, 'browser');
    const reservations = stage === 'api-all' ? ['api-all', 'quality', 'postgres', 'receipts'] : [stage];
    for (const entry of reservations) assert.ok(!existsSync(resolve(paths.reports, `${entry}-started.json`)), 'Recovery stage already started; allocate a new reviewed fixture instead of replaying committed writes');
    for (const entry of reservations) writeJson(resolve(paths.reports, `${entry}-started.json`), { source: manifest.source.hash, startedAt: new Date().toISOString(), noFixtureReset: true, requestedStage: stage }, true);
    const jest = resolve(apiRoot, 'node_modules/jest/bin/jest.js'), jestArgs = ['--experimental-vm-modules', jest];
    const quality = async () => {
      for (const task of ['typecheck', 'lint']) await run(process.execPath, [pnpmCli, task], { log: resolve(paths.reports, `${task}.log`) });
      await testCommand('api-unit', process.execPath, [...jestArgs, '--config', 'jest.config.cjs'], apiRoot, environment(), 'jest');
      await testCommand('web-unit', process.execPath, [resolve(webRoot, 'node_modules/vitest/vitest.mjs'), 'run'], webRoot, environment(), 'vitest');
      await run(process.execPath, [pnpmCli, 'build'], { env:environment({NODE_ENV:'production'}), log: resolve(paths.reports, 'build.log') });
      await run(process.execPath, ['--test', 'scripts/local-runtime.test.mjs', 'scripts/nas/operations.test.mjs'], { log: resolve(paths.reports, 'runtime-nas.log') });
    };
    const postgres = () => withReceiver(() => testCommand('postgres-integration', process.execPath, [...jestArgs, '--config', 'jest.integration.config.cjs', '--runInBand'], apiRoot, environment(), 'jest'));
    const receipts = () => testCommand('receipts', process.execPath, [...jestArgs, '--config', 'jest.config.cjs', '--runInBand', '--runTestsByPath', 'src/v1-agent1-local.acceptance.spec.ts', '--testMatch', '**/v1-agent1-local.acceptance.spec.ts'], apiRoot, environment(), 'jest');
    if (stage === 'quality' || stage === 'api-all') await quality();
    if (stage === 'postgres' || stage === 'api-all') await postgres();
    if (stage === 'receipts' || stage === 'api-all') await receipts();
    if (stage === 'bounded-browser') {
      const env = environment({ DATABASE_URL: privateState.environment.RECOVERY_BROWSER_DATABASE_URL });
      await testCommand('bounded-project-database', process.execPath, [...jestArgs, '--config', 'jest.config.cjs', '--runInBand', '--runTestsByPath', 'src/project-workflow.database.api.spec.ts', '--testMatch', '**/project-workflow.database.api.spec.ts'], apiRoot, env, 'jest');
      await testCommand('bounded-browser', process.execPath, [...jestArgs, '--config', 'jest.config.cjs', '--runInBand', '--runTestsByPath', 'src/v1-agent1-browser.acceptance.spec.ts', '--testMatch', '**/v1-agent1-browser.acceptance.spec.ts'], apiRoot, environment(), 'jest');
    }
    if (stage === 'e2e') {
      const client = await connect(privateState.environment.DATABASE_URL);
      try { assert.equal((await client.query('SELECT count(*)::int AS n FROM accounts')).rows[0].n, 0, 'Full passkey browser stage requires a pristine unseeded main database'); }
      finally { await client.end(); }
      const owned = []; const report = resolve(paths.reports, 'e2e/results.json'); mkdirSync(dirname(report), { recursive: true });
      try {
        for (const port of [ports.pwaApi, ports.pwaWeb, ports.api, ports.web, ports.receiver]) await freePort(port);
        owned.push(await service('pwa-api', [resolve(apiRoot, 'dist/main.js')], environment({ PORT: String(ports.pwaApi), WEB_ORIGIN: `http://localhost:${ports.pwaWeb}`, OWNER_BOOTSTRAP_EMAIL: 's02-e2e-owner@example.test', OWNER_BOOTSTRAP_SECRET: privateState.environment.S02_E2E_BOOTSTRAP_SECRET }), httpReady(`http://127.0.0.1:${ports.pwaApi}/api/v1/health/ready`)));
        owned.push(await service('pwa-web', [resolve(webRoot, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(ports.pwaWeb), '--strictPort'], environment({ API_PROXY_TARGET: `http://127.0.0.1:${ports.pwaApi}` }), httpReady(`http://127.0.0.1:${ports.pwaWeb}/`), webRoot));
        owned.push(await service('accounting-receiver', [resolve(root, 'scripts/s16-accounting-test-receiver.mjs')], environment(), tcpReady(ports.receiver)));
        await testCommand('e2e', process.execPath, [resolve(root, 'node_modules/@playwright/test/cli.js'), 'test', '--config', 'scripts/recovery/playwright.config.ts', '--workers=1', '--retries=0', '--reporter=list,json'], root, environment({ PLAYWRIGHT_JSON_OUTPUT_NAME: report }), 'playwright');
      } finally { for (const ownedService of owned.reverse()) await stopService(ownedService); }
    }
    assertCurrent(); writeJson(resolve(paths.reports, `${stage}-completed.json`), { source: manifest.source.hash, finishedAt: new Date().toISOString(), passed: true }, true);
  } finally { await lock.close(); await unlink(lockPath); }
}

async function main() {
  if (command === 'inspect') {
    const candidate = source(); await toolchain();
    process.stdout.write(`${JSON.stringify({ command, runId, sourceHash: candidate.hash, files: candidate.files.length, migrations: 119, paths, ports, lifecycleExecuted: false })}\n`); return;
  }
  authorized(); await toolchain();
  if (command === 'prepare') await provision();
  else { load(); if (command === 'check') await checkAll(); if (command === 'run') await executeStage(option('stage')); if (command === 'stop') { assert.ok(!existsSync(resolve(paths.base, 'runner.lock')), 'Owned runner lock exists; do not stop its active cluster'); await stopClusters(); } }
  process.stdout.write(`${JSON.stringify({ command, runId, phase: manifest.phase, manifest: paths.manifest, environment: paths.environment, reports: paths.reports, retainedTargetsTouched: false })}\n`);
}
await main().catch(error => { process.stderr.write(`${safe(error instanceof Error ? error.message : error)}\n`); process.exitCode = 1; });

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, writeFile, lstat, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { validateConfig, composeEnvironment, imageFields } from './config.mjs';
import { createOperations, inventoryFiles, verifyRestoredFiles, createPrivateDirectory, parseCounts, run } from './operations.mjs';
import { restoreRehearsal } from './restore.mjs';
import { recordMonitorState } from './monitor.mjs';
import { checkExternalApp } from './external-probe.mjs';

export function validEnvironment() {
  const env = {
    NAS_ENVIRONMENT: 'production', NAS_PROJECT: 'sense-deployment-test', NAS_RELEASE: 'f'.repeat(40), NAS_WEB_ORIGIN: 'https://work.sensestudios.in',
    NAS_DB_NAME: 'sense_production', NAS_DB_USER: 'sense_migration', NAS_DB_PASSWORD: 'a'.repeat(64), NAS_APP_DB_PASSWORD: 'b'.repeat(64),
    NAS_APP_DATABASE_URL: 'postgresql://sense_app_runtime:' + 'b'.repeat(64) + '@db:5432/sense_production',
    NAS_MIGRATION_DATABASE_URL: 'postgresql://sense_migration:' + 'a'.repeat(64) + '@db:5432/sense_production',
    NAS_DOCUMENTS_DIR: '/srv/sense/documents', NAS_POSTGRES_DIR: '/srv/sense/postgres17', NAS_BACKUP_DIR: '/srv/sense/backups', NAS_BACKUP_SSH_DIR: '/srv/sense/ssh', NAS_ASSETS_DIR: '/srv/sense/assets',
    NAS_EXTERNAL_SHARE_SECRET: 'c'.repeat(64), NAS_EMAIL_VERIFICATION_SECRET: 'd'.repeat(64), NAS_BACKUP_PASSWORD: 'e'.repeat(64), NAS_TUNNEL_TOKEN: 'test-only-tunnel-token',
    NAS_BREVO_API_KEY: 'test-only-provider-token', NAS_BREVO_SENDER_EMAIL: 'test@sensestudios.in', NAS_OFFSITE_REPOSITORY: 'sftp:backup@offsite.sensestudios.in:/backups', NAS_OFFSITE_CONFIRMED: 'yes'
  };
  for (const key of imageFields) env[key] = (key === 'NAS_POSTGRES_IMAGE' ? 'postgres:17.10-alpine3.24' : 'registry.invalid/' + key.toLowerCase()) + '@sha256:' + '1'.repeat(64);
  return env;
}

test('configuration rejects placeholders, mutable images, a different DB major and nested storage without leaking credentials', () => {
  const valid = validEnvironment();
  assert.equal(validateConfig(valid).origin, valid.NAS_WEB_ORIGIN);
  for (const [key, value] of [['NAS_API_IMAGE', 'api:latest'], ['NAS_POSTGRES_IMAGE', 'postgres:18@sha256:' + '1'.repeat(64)], ['NAS_DOCUMENTS_DIR', '/'], ['NAS_ASSETS_DIR', '/srv/sense/documents/assets'], ['NAS_WEB_ORIGIN', 'https://secret@work.sensestudios.in/path'], ['NAS_OFFSITE_CONFIRMED', 'no'], ['NAS_DB_NAME', 'postgres'], ['NAS_MIGRATION_DATABASE_URL', valid.NAS_APP_DATABASE_URL]]) {
    assert.throws(() => validateConfig({ ...valid, [key]: value }), (error) => error.message.includes(key) && !error.message.includes(valid.NAS_DB_PASSWORD) && !error.message.includes('secret@'));
  }
});

test('explicit configuration replaces ambient production variables and accepts literal dollar signs without shell expansion', () => {
  const previous = process.env.NAS_PROJECT;
  process.env.NAS_PROJECT = 'wrong-ambient-target';
  try {
    const config = validateConfig({ ...validEnvironment(), NAS_BREVO_API_KEY: 'literal-$value-$(not-a-command)' });
    const env = composeEnvironment(config);
    assert.equal(env.NAS_PROJECT, config.project);
    assert.equal(env.NAS_BREVO_API_KEY, 'literal-$value-$(not-a-command)');
  } finally { if (previous === undefined) delete process.env.NAS_PROJECT; else process.env.NAS_PROJECT = previous; }
});

async function fixture(t, failAt) {
  const root = await mkdtemp(join(tmpdir(), 'sense-nas-ops-'));
  t.after(async () => { assert.equal(resolve(root, '..'), resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  const documents = join(root, 'documents'), backups = join(root, 'backups');
  await mkdir(documents); await mkdir(backups);
  await writeFile(join(documents, 'retained-photo.jpg'), 'retained original bytes');
  const base = validateConfig(validEnvironment());
  const config = { ...base, env: { ...base.env, NAS_DOCUMENTS_DIR: documents, NAS_BACKUP_DIR: backups, NAS_POSTGRES_DIR: join(root, 'original-postgres'), NAS_ASSETS_DIR: join(root, 'assets'), NAS_BACKUP_SSH_DIR: join(root, 'ssh') } };
  const ids = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)];
  const services = ['web', 'api', 'worker'];
  const running = Object.fromEntries(services.map((service) => [service, true]));
  const calls = [];
  let metadata;
  const runner = async (_executable, originalArgs, options) => {
    const args = originalArgs[0] === '--context' ? originalArgs.slice(2) : originalArgs;
    calls.push(args);
    if (args[0] === 'context') return JSON.stringify([{ Name: 'local', Endpoints: { docker: { Host: 'unix:///var/run/docker.sock' } } }]);
    if (args[0] === 'inspect') return JSON.stringify(args.slice(1).map((id) => ({ Id: id, State: { Running: running[services[ids.indexOf(id)]] }, Config: { Labels: { 'com.docker.compose.project': config.project, 'com.docker.compose.service': services[ids.indexOf(id)], 'org.opencontainers.image.revision': config.release } } })));
    if (args.includes('ps')) return (failAt === 'replacement' && calls.some((call) => call.includes('stop')) ? ['d'.repeat(64), ...ids.slice(1)] : ids).join('\n');
    if (args.includes('stop')) {
      running.web = false;
      if (failAt === 'partial-stop') throw new Error('simulated partial stop');
      running.api = false; running.worker = false;
      return '';
    }
    if (args.includes('start')) { for (const service of services) running[service] = true; return ''; }
    if (args.includes('exec')) {
      if (failAt === 'dump' && args.includes('pg_dump')) throw new Error('simulated dump failure');
      if (options.outputFile) await writeFile(options.outputFile, args.includes('pg_dumpall') ? '-- mock globals, not a real database' : 'MOCK-DUMP', { flag: 'wx' });
      if (args.some((part) => part.includes('pg_stat_activity'))) return failAt === 'other-client' ? '1' : '0';
      return args.includes('psql') ? '{"table":"_prisma_migrations","count":119}\n{"table":"projects","count":2}' : '';
    }
    if (args.includes('run')) {
      const commands = args.slice(args.indexOf('backup') + 1);
      if (commands.includes('backup')) {
        if (failAt === 'local') throw new Error('simulated local backup failure');
        const id = commands.at(-1).split('/').at(-1);
        metadata = JSON.parse(await readFile(join(backups, 'staging', id, 'backup.json'), 'utf8'));
        return JSON.stringify({ message_type: 'summary', snapshot_id: 'd'.repeat(64) });
      }
      if (commands.includes('copy')) {
        assert.ok(Object.values(running).every(Boolean), 'writers must resume before offsite transfer');
        if (failAt === 'offsite') throw new Error('simulated offsite failure');
      }
      if (commands.includes('snapshots')) return JSON.stringify([{ id: 'e'.repeat(64) }]);
      if (commands.includes('dump')) return JSON.stringify(failAt === 'wrong-offsite' ? { ...metadata, project: 'other-project' } : metadata);
      return '';
    }
    throw new Error('Unexpected mocked command: ' + args[0]);
  };
  return { root, documents, backups, config, calls, running, operations: createOperations(config, { runner, log: () => undefined, now: () => new Date('2026-10-16T10:00:00Z') }) };
}

for (const failure of ['partial-stop', 'other-client', 'dump', 'local', 'offsite', 'wrong-offsite']) test('backup failure at ' + failure + ' resumes only the original writers and never claims an offsite success', async (t) => {
  const f = await fixture(t, failure);
  const source = await inventoryFiles(f.documents);
  await assert.rejects(f.operations.backup());
  assert.ok(Object.values(f.running).every(Boolean));
  assert.deepEqual(await inventoryFiles(f.documents), source);
  assert.equal(await lstat(join(f.backups, 'operations.lock')).then(() => true, () => false), false);
  assert.equal(await readdir(join(f.backups, 'receipts')).catch(() => []).then((entries) => entries.length), 0);
  if (['partial-stop', 'other-client', 'dump', 'local'].includes(failure)) assert.equal(f.calls.some((call) => call.includes('copy')), false);
});

test('container replacement refuses automatic restart of an unrelated replacement', async (t) => {
  const f = await fixture(t, 'replacement');
  await assert.rejects(f.operations.backup(), /changed/);
  assert.equal(f.calls.some((call) => call.includes('start')), false);
  assert.equal(f.calls.some((call) => call.includes('copy')), false);
});

test('backup success records the exact offsite point, verifies copied metadata and removes only its own transient plaintext dumps', async (t) => {
  const f = await fixture(t);
  const original = await inventoryFiles(f.documents);
  const receipt = await f.operations.backup();
  assert.equal(receipt.status, 'OFFSITE_VERIFIED');
  assert.equal(receipt.offsiteSnapshot, 'e'.repeat(64));
  const saved = JSON.parse(await readFile(join(f.backups, 'receipts', receipt.backupId + '.json'), 'utf8'));
  assert.equal(saved.fileCount, 1); assert.equal(saved.pointAt, '2026-10-16T10:00:00.000Z');
  for (const file of ['database.dump', 'globals.sql']) assert.equal(await lstat(join(f.backups, 'staging', receipt.backupId, file)).then(() => true, () => false), false);
  assert.deepEqual(await inventoryFiles(f.documents), original);
  assert.ok(f.calls.some((call) => call.includes('check')));
});

test('an existing operations lock is preserved and prevents overlapping changes', async (t) => {
  const f = await fixture(t);
  const path = join(f.backups, 'operations.lock');
  await mkdir(path); await writeFile(join(path, 'owner.json'), 'retained owner');
  await assert.rejects(f.operations.backup(), /EEXIST/);
  assert.equal(await readFile(join(path, 'owner.json'), 'utf8'), 'retained owner');
  assert.equal(f.calls.length, 0);
});

test('restore refuses existing, production and backup destinations before accessing a provider', async (t) => {
  const f = await fixture(t);
  const operations = { lock: async () => { throw new Error('must not be reached'); } };
  for (const target of [f.documents, join(f.documents, 'new'), f.backups, f.root]) await assert.rejects(restoreRehearsal(f.config, operations, 'e'.repeat(64), target));
  await assert.rejects(restoreRehearsal(f.config, operations, 'short-id', join(f.root, 'restore-new')), /exact snapshot/);
});

test('file recovery rejects changed bytes, added files and traversal; database counts reject malformed or duplicate evidence', async (t) => {
  const f = await fixture(t);
  const manifest = await inventoryFiles(f.documents);
  assert.equal(await verifyRestoredFiles(f.documents, manifest), 1);
  await writeFile(join(f.documents, 'retained-photo.jpg'), 'changed bytes');
  await assert.rejects(verifyRestoredFiles(f.documents, manifest), /mismatch/);
  await assert.rejects(verifyRestoredFiles(f.documents, [{ path: '../escape', bytes: 0, sha256: 'a'.repeat(64) }]), /path/);
  assert.throws(() => parseCounts('{"table":"a","count":1}\n{"table":"a","count":1}'), /row-count/);
  assert.throws(() => parseCounts(''), /row-count/);
});

test('directory creation refuses a root escape and follows no symbolic links', async (t) => {
  const f = await fixture(t);
  await assert.rejects(createPrivateDirectory(f.backups, join(f.root, 'escape')), /leave/);
  const link = join(f.backups, 'alias');
  await symlink(f.documents, link, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(createPrivateDirectory(f.backups, join(link, 'new-directory')), /Unsafe/);
  assert.equal(await lstat(join(f.documents, 'new-directory')).then(() => true, () => false), false);
});

for (const failAt of [undefined, 'files', 'database']) test('restore orchestration ' + (failAt ?? 'success') + ' preserves the source and stops only its new isolated container', async (t) => {
  const f = await fixture(t);
  const original = await inventoryFiles(f.documents);
  const target = join(f.root, 'new-restore');
  const id = 'nas-1792144800000-0123456789abcdef';
  const snapshot = 'e'.repeat(64);
  let running = false, inspection, released = false, databaseCreated = false;
  const expected = [{ table: '_prisma_migrations', count: 119 }, { table: 'projects', count: 2 }];
  const operations = {
    lock: async () => async () => { released = true; },
    restic: async () => JSON.stringify([{ id: snapshot, tags: [f.config.project, id] }]),
    compose: async (args) => {
      assert.ok(args.includes('restore')); assert.ok(args.includes('--verify'));
      const docs = join(target, 'data', 'documents'), stage = join(target, 'backup', 'staging', id);
      await mkdir(docs, { recursive: true }); await mkdir(stage, { recursive: true });
      await writeFile(join(docs, 'photo.jpg'), 'restored fixture bytes');
      const manifest = await inventoryFiles(docs);
      await writeFile(join(stage, 'files.json'), JSON.stringify(manifest));
      await writeFile(join(stage, 'backup.json'), JSON.stringify({ id, project: f.config.project, postgresImage: f.config.env.NAS_POSTGRES_IMAGE, release: f.config.release, fileCount: 1 }));
      for (const name of ['database.dump', 'globals.sql']) await writeFile(join(stage, name), 'mock restore fixture, not a real database');
      await writeFile(join(stage, 'database-counts.json'), JSON.stringify(expected));
      if (failAt === 'files') await writeFile(join(docs, 'photo.jpg'), 'tampered');
      return '';
    },
    docker: async (args) => {
      if (args[0] === 'create') {
        inspection = { Id: 'f'.repeat(64), Name: '/' + args[args.indexOf('--name') + 1], Config: { Labels: { 'com.sense.restore': args[args.indexOf('--label') + 1].split('=')[1] } }, HostConfig: { NetworkMode: 'none', PortBindings: {} }, Mounts: [{ Source: join(target, 'isolated-postgres'), Destination: '/var/lib/postgresql/data' }] };
        assert.equal(args[args.indexOf('--network') + 1], 'none');
        return inspection.Id;
      }
      if (args[0] === 'inspect') return JSON.stringify([{ ...inspection, State: { Running: running } }]);
      if (args[0] === 'start') { running = true; return ''; }
      if (args[0] === 'stop') { assert.equal(args.at(-1), inspection.Id); running = false; return ''; }
      assert.equal(args[0], 'exec');
      if (args.includes('createdb')) databaseCreated = true;
      if (args.includes('pg_restore') && failAt === 'database') throw new Error('simulated restore failure');
      if (args.at(-1) === '-') return expected.map((entry) => JSON.stringify(entry)).join('\n');
      if (args.some((part) => part.includes('system_identifier'))) return '7697133367000000000';
      return '';
    }
  };
  if (failAt) await assert.rejects(restoreRehearsal(f.config, operations, snapshot, target));
  else {
    const report = await restoreRehearsal(f.config, operations, snapshot, target);
    assert.equal(report.status, 'DATABASE_AND_FILES_RESTORED'); assert.equal(report.fileCount, 1);
  }
  assert.equal(released, true); assert.equal(running, false);
  assert.equal(databaseCreated, failAt !== 'files');
  assert.deepEqual(await inventoryFiles(f.documents), original);
});

test('monitor emits initial failure/recovery changes and stays quiet for unchanged failures', async (t) => {
  const f = await fixture(t), path = join(f.backups, 'monitor.json');
  assert.equal(await recordMonitorState(path, { status: 'UNAVAILABLE', issues: ['app'] }), true);
  assert.equal(await recordMonitorState(path, { status: 'UNAVAILABLE', issues: ['app'] }), false);
  assert.equal(await recordMonitorState(path, { status: 'HEALTHY', issues: [] }), true);
});

test('external probe requires HTTPS and checks real readiness fields without exposing response bodies', async () => {
  await assert.rejects(checkExternalApp('http://work.sensestudios.in'), /HTTPS/);
  assert.deepEqual(await checkExternalApp('https://work.sensestudios.in', async () => ({ ok: true, json: async () => ({ status: 'ready', dependencies: { database: 'ready' } }) })), { status: 'HEALTHY', issues: [] });
  assert.deepEqual(await checkExternalApp('https://work.sensestudios.in', async () => { throw new Error('private backend details'); }), { status: 'UNAVAILABLE', issues: ['public-app-unreachable'] });
});

test('protected command diagnostics redact configured secrets', async (t) => {
  const f = await fixture(t);
  const secret = 'private-test-secret-value';
  await assert.rejects(run(process.execPath, ['-e', 'process.stderr.write(process.env.NAS_BREVO_API_KEY);process.exit(1)'], { env: { ...process.env, NAS_BREVO_API_KEY: secret }, diagnosticDirectory: f.backups }), (error) => !error.message.includes(secret));
  const name = (await readdir(f.backups)).find((name) => name.startsWith('operation-error-'));
  assert.equal(await readFile(join(f.backups, name), 'utf8'), '[redacted]');
});

test('status reports stale backups and delayed eligible outbox work without exposing recipients', async (t) => {
  const f = await fixture(t); await mkdir(f.config.env.NAS_POSTGRES_DIR);
  await mkdir(join(f.backups, 'receipts'));
  await writeFile(join(f.backups, 'receipts', 'nas-1792144800000-0123456789abcdef.json'), JSON.stringify({ project: f.config.project, state: 'OFFSITE_VERIFIED', offsiteSnapshot: 'e'.repeat(64), pointAt: '2026-10-14T00:00:00Z' }));
  const runner = async (_exe, args) => {
    if (args.includes('context')) return JSON.stringify([{ Name: 'local', Endpoints: { docker: { Host: 'unix:///var/run/docker.sock' } } }]);
    if (args.includes('ps')) return ['db', 'api', 'worker', 'web', 'tunnel'].map((Service) => JSON.stringify({ Service, State: 'running', Health: 'healthy' })).join('\n');
    if (args.includes('psql')) return JSON.stringify({ ready: 2, oldestReadyAgeSeconds: 301, expiredLeases: 0, dead: 0 });
    if (args.includes('snapshots')) return JSON.stringify([{ id: 'e'.repeat(64), tags: [f.config.project] }]);
    throw new Error('Unexpected status mutation');
  };
  const result = await createOperations(f.config, { runner, now: () => new Date('2026-10-16T10:00:00Z') }).status();
  assert.equal(result.status, 'ATTENTION'); assert.ok(result.issues.includes('outbox:failed-expired-or-delayed'));
  assert.ok(result.issues.includes('offsite-backup:missing-or-older-than-24h'));
  assert.equal(JSON.stringify(result).includes('recipient'), false);
});

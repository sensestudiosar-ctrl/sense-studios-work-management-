import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, lstat, mkdir, readFile, readdir, realpath, rmdir, statfs, unlink, writeFile } from 'node:fs/promises';
import { join, resolve, relative, posix } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { constants } from 'node:fs';
import { repositoryRoot, composeEnvironment, isWithin, snapshotPattern, backupIdPattern } from './config.mjs';

export async function run(executable, args, { env = process.env, input, outputFile, diagnosticDirectory, timeoutMs = 120_000 } = {}) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(executable, args, { env, cwd: repositoryRoot, windowsHide: true, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    if (input !== undefined) { child.stdin.on('error', () => undefined); child.stdin.end(input); }
    const output = [];
    let length = 0;
    let failed = false;
    let diagnostic = '';
    child.stderr.on('data', (chunk) => { if (diagnostic.length < 64 * 1024) diagnostic += chunk.toString(); });
    const stream = outputFile ? pipeline(child.stdout, createWriteStream(outputFile, { flags: 'wx', mode: 0o600 })) : undefined;
    if (stream) void stream.catch(() => { failed = true; child.kill(); });
    else child.stdout.on('data', (chunk) => { length += chunk.length; if (length > 32 * 1024 * 1024) { failed = true; child.kill(); } else output.push(chunk); });
    const timer = setTimeout(() => { failed = true; child.kill(); }, timeoutMs);
    child.once('error', () => { clearTimeout(timer); reject(new Error('Required local operation executable is unavailable')); });
    child.once('close', async (code) => {
      clearTimeout(timer);
      try {
        await stream;
        if (failed || code !== 0) throw new Error('Command did not complete successfully');
        resolveResult(Buffer.concat(output).toString('utf8').trim());
      } catch {
        if (diagnosticDirectory) {
          let redacted = diagnostic;
          for (const [key, value] of Object.entries(env)) if (key.startsWith('NAS_') && value.length >= 8) { redacted = redacted.replaceAll(value, '[redacted]').replaceAll(encodeURIComponent(value), '[redacted]'); }
          try { await writeFile(join(diagnosticDirectory, 'operation-error-' + randomBytes(8).toString('hex') + '.log'), redacted, { flag: 'wx', mode: 0o600 }); } catch { /* Preserve the original failure if protected diagnostics cannot be written. */ }
        }
        reject(new Error('NAS command failed; inspect the protected host logs. No credentials were printed.'));
      }
    });
  });
}

export function createOperations(config, { runner = run, now = () => new Date(), log = console.info } = {}) {
  const env = composeEnvironment(config);
  const composeArgs = ['compose', '--project-name', config.project, '--file', resolve(repositoryRoot, 'infra/compose.production.yaml')];
  let contextPromise;
  const localContext = () => contextPromise ??= (async () => {
    if (env.DOCKER_HOST && !/^unix:\/\//.test(env.DOCKER_HOST)) throw new Error('A remote Docker host is not an allowed NAS target');
    const entries = JSON.parse(await runner('docker', ['context', 'inspect'], { env }));
    if (entries.length !== 1 || !/^[a-zA-Z0-9_.-]+$/.test(entries[0].Name ?? '') || !/^unix:\/\//.test(entries[0].Endpoints?.docker?.Host ?? '')) throw new Error('Only a verified local Linux Docker context is allowed');
    return entries[0].Name;
  })();
  const docker = async (args, options = {}) => runner('docker', ['--context', await localContext(), ...args], { ...options, env, diagnosticDirectory: config.env.NAS_BACKUP_DIR });
  const compose = (args, options) => docker(composeArgs.concat(args), options);
  const restic = (args, options) => compose(['run', '--rm', '--no-deps', '-T', 'backup', ...args], { timeoutMs: 2 * 60 * 60_000, ...options });
  const backupRoot = config.env.NAS_BACKUP_DIR;

  async function inspectOwned(ids, services) {
    const entries = JSON.parse(await docker(['inspect', ...ids]));
    if (entries.length !== ids.length) throw new Error('Container identity count changed');
    for (const entry of entries) {
      const labels = entry.Config?.Labels;
      if (!ids.includes(entry.Id) || labels?.['com.docker.compose.project'] !== config.project || !services.includes(labels?.['com.docker.compose.service'])) throw new Error('Container ownership changed; refusing operation');
    }
    return entries;
  }

  async function activeWriters() {
    const ids = (await compose(['ps', '--all', '--quiet', 'web', 'api', 'worker'])).split(/\s+/).filter(Boolean);
    if (ids.length !== 3 || ids.some((id) => !snapshotPattern.test(id))) throw new Error('Exactly one existing web, API and worker is required');
    const entries = await inspectOwned(ids, ['web', 'api', 'worker']);
    if (new Set(entries.map((item) => item.Config.Labels['com.docker.compose.service'])).size !== 3 || entries.some((item) => !item.State.Running)) throw new Error('All three existing writer services must be running before backup');
    if (entries.some((item) => item.Config.Labels['org.opencontainers.image.revision'] !== config.release)) throw new Error('Use the currently running release environment for backup');
    return ids;
  }

  async function sameWriters(ids) {
    const current = (await compose(['ps', '--all', '--quiet', 'web', 'api', 'worker'])).split(/\s+/).filter(Boolean);
    if (current.length !== ids.length || current.some((id) => !ids.includes(id))) throw new Error('Writer containers changed; manual recovery is required');
    return inspectOwned(ids, ['web', 'api', 'worker']);
  }

  async function lock(operation) {
    const path = join(backupRoot, 'operations.lock');
    await mkdir(path, { mode: 0o700 });
    const token = randomBytes(16).toString('hex');
    await writeFile(join(path, 'owner.json'), JSON.stringify({ token, operation, pid: process.pid, startedAt: now().toISOString() }), { flag: 'wx', mode: 0o600 });
    return async () => {
      if (await realpath(path) !== path || !isWithin(backupRoot, path)) throw new Error('Operations lock path changed');
      const owner = JSON.parse(await readFile(join(path, 'owner.json'), 'utf8'));
      if (owner.token !== token) throw new Error('Operations lock ownership changed');
      await unlink(join(path, 'owner.json')); await rmdir(path);
    };
  }

  async function preflight() {
    await compose(['--profile', '*', 'config', '--quiet']);
    const context = JSON.parse(await docker(['context', 'inspect']));
    if (context.length !== 1 || !/^unix:\/\//.test(context[0].Endpoints?.docker?.Host ?? '')) throw new Error('Only a verified local Linux Docker context is allowed');
    await docker(['info', '--format', '{{.ServerVersion}}']);
    const rendered = JSON.parse(await compose(['--profile', '*', 'config', '--format', 'json']));
    for (const service of Object.values(rendered.services)) if (service.ports?.length || service.network_mode === 'host' || service.privileged || service.volumes?.some((volume) => /docker\.sock/.test(volume.source ?? ''))) throw new Error('Production services must not publish ports, use privileged/host mode or mount the Docker socket');
    for (const [key, kind] of [['NAS_API_IMAGE', 'api'], ['NAS_WEB_IMAGE', 'web'], ['NAS_POSTGRES_IMAGE', 'postgres'], ['NAS_BACKUP_IMAGE', 'backup'], ['NAS_TUNNEL_IMAGE', 'tunnel']]) {
      const images = JSON.parse(await docker(['image', 'inspect', config.env[key]]));
      if (images.length !== 1) throw new Error('Expected one pinned local image: ' + key);
      const image = images[0];
      if (['api', 'web'].includes(kind) && image.Config?.Labels?.['org.opencontainers.image.revision'] !== config.release) throw new Error('Image release label mismatch: ' + key);
      if (kind === 'web' && image.Config?.Labels?.['com.sense.web.variant'] !== 'production') throw new Error('Web image is not the production build target');
      if (kind === 'postgres' && !image.Config?.Env?.includes('PG_MAJOR=17')) throw new Error('PostgreSQL image major mismatch');
    }
    return { status: 'PASS', project: config.project, release: config.release, note: 'Configuration/image preflight only; mount permissions, restore and phone acceptance remain separate.' };
  }

  async function initBackups(repository) {
    if (!['local', 'offsite'].includes(repository)) throw new Error('Choose exactly one explicit local or offsite repository');
    const unlock = await lock('init-backups');
    try {
      // Explicit operator command only. Never init automatically after an auth/connection failure.
      await restic(repository === 'local' ? ['--repo', '/backup/local-repository', 'init'] : ['init', '--from-repo', '/backup/local-repository', '--copy-chunker-params']);
      return { status: 'INITIALIZED', project: config.project, repository };
    } finally { await unlock(); }
  }

  async function backup() {
    const unlock = await lock('backup');
    const id = `nas-${now().getTime()}-${randomBytes(8).toString('hex')}`;
    const stage = join(backupRoot, 'staging', id);
    let ids;
    let stopping = false;
    let resumed = false;
    const resume = async () => {
      if (!stopping || resumed) return;
      await sameWriters(ids);
      await compose(['start', 'api', 'worker', 'web']);
      const entries = await sameWriters(ids);
      if (entries.some((entry) => !entry.State.Running)) throw new Error('Writer restart failed; inspect the original services');
      resumed = true;
    };
    try {
      ids = await activeWriters();
      await restic(['--repo', '/backup/local-repository', 'cat', 'config']);
      await restic(['cat', 'config']);
      await createPrivateDirectory(backupRoot, stage);
      const pointAt = now().toISOString();
      stopping = true;
      await compose(['stop', '--timeout', '120', 'web', 'api', 'worker'], { timeoutMs: 180_000 });
      if ((await sameWriters(ids)).some((entry) => entry.State.Running)) throw new Error('Writers are still running; no consistent backup can be claimed');
      const remaining = await compose(['exec', '-T', 'db', 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '--username', config.env.NAS_DB_USER, '--dbname', config.env.NAS_DB_NAME, '--command', "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND backend_type = 'client backend'"]);
      if (remaining !== '0') throw new Error('Other database clients remain; no consistent backup can be claimed');
      log('Writers stopped; creating the consistent local backup.');
      const files = await inventoryFiles(config.env.NAS_DOCUMENTS_DIR);
      await compose(['exec', '-T', 'db', 'pg_dump', '--username', config.env.NAS_DB_USER, '--dbname', config.env.NAS_DB_NAME, '--format=custom'], { outputFile: join(stage, 'database.dump'), timeoutMs: 30 * 60_000 });
      await compose(['exec', '-T', 'db', 'pg_dumpall', '--username', config.env.NAS_DB_USER, '--globals-only', '--no-role-passwords'], { outputFile: join(stage, 'globals.sql'), timeoutMs: 120_000 });
      const rowCounts = await databaseCounts(compose, config);
      const metadata = { version: 1, id, project: config.project, release: config.release, pointAt, fileCount: files.length, postgresImage: config.env.NAS_POSTGRES_IMAGE, apiImage: config.env.NAS_API_IMAGE, webImage: config.env.NAS_WEB_IMAGE };
      await writeFile(join(stage, 'backup.json'), JSON.stringify(metadata, null, 2), { flag: 'wx', mode: 0o600 });
      await writeFile(join(stage, 'files.json'), JSON.stringify(files), { flag: 'wx', mode: 0o600 });
      await writeFile(join(stage, 'database-counts.json'), JSON.stringify(rowCounts), { flag: 'wx', mode: 0o600 });
      const output = await restic(['--repo', '/backup/local-repository', 'backup', '--json', '--host', config.project, '--tag', config.project, '--tag', id, '/data/documents', '/backup/staging/' + id]);
      const summary = output.split('\n').map((line) => JSON.parse(line)).findLast((line) => line.message_type === 'summary');
      if (!snapshotPattern.test(summary?.snapshot_id ?? '')) throw new Error('No complete local snapshot receipt');
      await resume();
      log('Original services resumed; copying the encrypted backup offsite.');
      await restic(['copy', '--from-repo', '/backup/local-repository', summary.snapshot_id]);
      const snapshots = JSON.parse(await restic(['snapshots', '--json', '--tag', config.project + ',' + id]));
      if (snapshots.length !== 1 || !snapshotPattern.test(snapshots[0].id)) throw new Error('Exact offsite snapshot was not found');
      const copied = JSON.parse(await restic(['dump', snapshots[0].id, '/backup/staging/' + id + '/backup.json']));
      if (JSON.stringify(copied) !== JSON.stringify(metadata)) throw new Error('Offsite recovery point does not match the local backup');
      await restic(['check']);
      const receipt = { ...metadata, state: 'OFFSITE_VERIFIED', localSnapshot: summary.snapshot_id, offsiteSnapshot: snapshots[0].id, verifiedAt: now().toISOString(), note: 'Full isolated restore and operational acceptance remain separate.' };
      await createPrivateDirectory(backupRoot, join(backupRoot, 'receipts'));
      await writeFile(join(backupRoot, 'receipts', id + '.json'), JSON.stringify(receipt, null, 2), { flag: 'wx', mode: 0o600 });
      // Only this run's transient dump; authoritative NAS files/backups are never pruned here.
      if (await realpath(stage) !== stage || !isWithin(join(backupRoot, 'staging'), stage)) throw new Error('Backup stage path changed');
      await unlink(join(stage, 'database.dump'));
      await unlink(join(stage, 'globals.sql'));
      return { status: receipt.state, project: config.project, backupId: id, pointAt, offsiteSnapshot: receipt.offsiteSnapshot };
    } finally {
      try { await resume(); } finally { await unlock(); }
    }
  }

  async function status() {
    const entries = JSON.parse(await compose(['ps', '--all', '--format', 'json']).then((output) => output.startsWith('[') ? output : '[' + output.split('\n').filter(Boolean).join(',') + ']'));
    const required = ['db', 'api', 'worker', 'web', 'tunnel'];
    const services = required.map((name) => ({ name, ready: entries.filter((entry) => entry.Service === name && entry.State === 'running' && (name === 'tunnel' || entry.Health === 'healthy')).length === 1 }));
    const queue = JSON.parse(await compose(['exec', '-T', 'db', 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '--username', config.env.NAS_DB_USER, '--dbname', config.env.NAS_DB_NAME, '--command', queueSql]));
    for (const key of ['ready', 'oldestReadyAgeSeconds', 'expiredLeases', 'dead']) if (!Number.isFinite(queue[key]) || queue[key] < 0) throw new Error('Invalid operational queue metrics');
    const storage = [];
    for (const key of ['NAS_DOCUMENTS_DIR', 'NAS_POSTGRES_DIR', 'NAS_BACKUP_DIR']) {
      const fs = await statfs(config.env[key]);
      if (fs.blocks <= 0) throw new Error('Storage capacity could not be measured');
      storage.push({ area: key, availableBytes: fs.bavail * fs.bsize, usedPercent: Math.round((fs.blocks - fs.bavail) * 1000 / fs.blocks) / 10 });
    }
    const receipts = [];
    try {
      for (const name of await readdir(join(backupRoot, 'receipts'))) {
        if (!/^nas-[0-9]{13}-[a-f0-9]{16}\.json$/.test(name)) continue;
        const entry = JSON.parse(await readFile(join(backupRoot, 'receipts', name), 'utf8'));
        if (entry.project === config.project && entry.state === 'OFFSITE_VERIFIED' && snapshotPattern.test(entry.offsiteSnapshot)) receipts.push(entry);
      }
    } catch (error) { if (error.code !== 'ENOENT') throw new Error('Backup receipts could not be read', { cause: error }); }
    const latest = receipts.sort((a, b) => Date.parse(b.pointAt) - Date.parse(a.pointAt))[0];
    const ageHours = latest ? (now().getTime() - Date.parse(latest.pointAt)) / 3_600_000 : Infinity;
    const backupReady = Number.isFinite(ageHours) && ageHours >= 0 && ageHours <= 24;
    const issues = services.filter((entry) => !entry.ready).map((entry) => entry.name + ':not-ready');
    let offsiteSnapshotPresent = false;
    if (latest) {
      try {
        const present = JSON.parse(await restic(['snapshots', '--json', latest.offsiteSnapshot], { timeoutMs: 120_000 }));
        offsiteSnapshotPresent = present.length === 1 && present[0].id === latest.offsiteSnapshot && present[0].tags?.includes(config.project);
      } catch { /* Failure is an operational issue; do not substitute an old local receipt. */ }
      if (!offsiteSnapshotPresent) issues.push('offsite-backup:unreachable-or-missing-snapshot');
    }
    if (queue.dead > 0 || queue.expiredLeases > 0 || queue.oldestReadyAgeSeconds > 300) issues.push('outbox:failed-expired-or-delayed');
    for (const area of storage) if (area.usedPercent >= 85) issues.push(area.area + ':storage-at-least-85-percent');
    if (!backupReady) issues.push('offsite-backup:missing-or-older-than-24h');
    else if (ageHours >= 20) issues.push('offsite-backup:approaching-24h');
    return { status: issues.length ? 'ATTENTION' : 'HEALTHY', project: config.project, services, queue, storage, offsiteSnapshotPresent, backupAgeHours: Number.isFinite(ageHours) ? Math.round(ageHours * 10) / 10 : null, issues };
  }

  async function publishAssets() {
    const unlock = await lock('publish-assets');
    const id = randomBytes(8).toString('hex');
    const stage = join(backupRoot, 'staging', 'assets-' + id);
    let container;
    const removeSource = async () => {
      if (container && snapshotPattern.test(container)) {
        const source = JSON.parse(await docker(['inspect', container]));
        if (source[0]?.Id !== container || source[0]?.Config?.Labels?.['com.sense.asset-copy'] !== id) throw new Error('Asset container ownership changed');
        await docker(['rm', container]);
      }
    };
    try {
      await createPrivateDirectory(backupRoot, stage);
      container = await docker(['create', '--network', 'none', '--label', 'com.sense.asset-copy=' + id, config.env.NAS_WEB_IMAGE]);
      if (!snapshotPattern.test(container)) throw new Error('Invalid asset source container identity');
      await docker(['cp', container + ':/usr/share/nginx/html/assets/.', stage]);
      const files = await inventoryFiles(stage);
      for (const file of files) {
        const destination = resolve(config.env.NAS_ASSETS_DIR, file.path);
        if (!isWithin(config.env.NAS_ASSETS_DIR, destination)) throw new Error('Asset path escaped its destination');
        await createPrivateDirectory(config.env.NAS_ASSETS_DIR, resolve(destination, '..'), 0o755);
        if (!isWithin(config.env.NAS_ASSETS_DIR, await realpath(resolve(destination, '..')))) throw new Error('Asset parent path escaped');
        try { await copyFile(resolve(stage, file.path), destination, constants.COPYFILE_EXCL); }
        catch (error) {
          if (error.code !== 'EEXIST' || (await lstat(destination)).isSymbolicLink() || await hashFile(destination) !== file.sha256) throw new Error('An existing asset conflicts; it was not overwritten', { cause: error });
        }
      }
      return { status: 'ASSETS_RETAINED', release: config.release, files: files.length };
    } finally {
      try { await removeSource(); } finally { await unlock(); }
    }
  }

  return { preflight, initBackups, backup, status, publishAssets, compose, docker, restic, lock };
}

export async function hashFile(path) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  return hash.digest('hex');
}

export async function createPrivateDirectory(root, target, mode = 0o700) {
  const absolute = resolve(target);
  if (!isWithin(root, absolute) || await realpath(root) !== resolve(root)) throw new Error('Directory creation would leave the dedicated root');
  let current = resolve(root);
  for (const segment of relative(root, absolute).split(/[\\/]/).filter(Boolean)) {
    current = join(current, segment);
    try { await mkdir(current, { mode }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(current) !== current) throw new Error('Unsafe directory in an operations path');
  }
}

export const countSql = `SELECT format('SELECT json_build_object(''table'', %L, ''count'', count(*))::text FROM %I.%I;', tablename, schemaname, tablename) FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
\\gexec
`;

export const queueSql = `SELECT json_build_object(
  'ready', count(*) FILTER (WHERE state = 'PENDING' AND "availableAt" <= CURRENT_TIMESTAMP),
  'oldestReadyAgeSeconds', COALESCE(max(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - "availableAt"))) FILTER (WHERE state = 'PENDING' AND "availableAt" <= CURRENT_TIMESTAMP), 0),
  'expiredLeases', count(*) FILTER (WHERE state = 'LEASED' AND "leaseExpiresAt" <= CURRENT_TIMESTAMP),
  'dead', count(*) FILTER (WHERE state = 'DEAD')) FROM outbox_deliveries;`;

export async function databaseCounts(compose, config) {
  const output = await compose(['exec', '-T', 'db', 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '--username', config.env.NAS_DB_USER, '--dbname', config.env.NAS_DB_NAME, '--file', '-'], { input: countSql, timeoutMs: 10 * 60_000 });
  return parseCounts(output);
}

export function parseCounts(output) {
  const entries = output.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  if (!entries.length || entries.some((entry) => typeof entry.table !== 'string' || !Number.isSafeInteger(entry.count) || entry.count < 0) || new Set(entries.map((entry) => entry.table)).size !== entries.length) throw new Error('Invalid database row-count evidence');
  return entries.sort((a, b) => a.table.localeCompare(b.table));
}

export async function inventoryFiles(root) {
  const actual = await realpath(root);
  if (actual !== resolve(root) || (await lstat(root)).isSymbolicLink()) throw new Error('Inventory root must be a real directory');
  const files = [];
  async function walk(directory) {
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name);
      const before = await lstat(path);
      if (before.isSymbolicLink()) throw new Error('Symlinks are not permitted in a recovery inventory');
      if (before.isDirectory()) await walk(path);
      else if (before.isFile()) {
        const sha256 = await hashFile(path);
        const after = await lstat(path);
        if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino) throw new Error('A source file changed during backup inventory');
        files.push({ path: relative(root, path).split('\\').join('/'), bytes: before.size, sha256 });
      } else throw new Error('Special files are not permitted in a recovery inventory');
    }
  }
  await walk(root);
  return files;
}

export async function verifyRestoredFiles(root, manifest) {
  if (!Array.isArray(manifest)) throw new Error('Invalid file manifest');
  const actual = await inventoryFiles(root);
  const normalized = manifest.map((file) => {
    if (typeof file.path !== 'string' || file.path.startsWith('/') || file.path.includes('\\') || posix.normalize(file.path) !== file.path || file.path === '..' || file.path.startsWith('../') || !snapshotPattern.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new Error('Invalid recovery manifest path or digest');
    return file;
  }).sort((a, b) => a.path.localeCompare(b.path));
  const sorted = actual.sort((a, b) => a.path.localeCompare(b.path));
  if (JSON.stringify(sorted) !== JSON.stringify(normalized)) throw new Error('Restored file inventory or checksum mismatch');
  return sorted.length;
}

export function assertBackupId(id) {
  if (!backupIdPattern.test(id)) throw new Error('Invalid backup identity');
  return id;
}

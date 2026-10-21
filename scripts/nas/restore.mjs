import { randomBytes } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { directoryFields, isWithin, snapshotPattern } from './config.mjs';
import { assertBackupId, countSql, parseCounts, verifyRestoredFiles } from './operations.mjs';

/** Rehearsal only: a new directory and a new labelled cluster with no network or ports. */
export async function restoreRehearsal(config, operations, snapshot, target, { now = () => new Date(), pause = (ms) => new Promise((done) => setTimeout(done, ms)) } = {}) {
  if (!snapshotPattern.test(snapshot) || !isAbsolute(target) || target !== resolve(target) || target === resolve(target, '..') || /[,\0\r\n]/.test(target) || (process.platform === 'linux' && target.includes(':'))) throw new Error('Supply an exact snapshot digest and an absolute NEW restore directory');
  for (const key of directoryFields) if (isWithin(config.env[key], target) || isWithin(target, config.env[key])) throw new Error('Restore target must be separate from every configured production/backup directory');
  // Do not reuse even an empty old target: identity and ownership must be new.
  try { await lstat(target); throw new Error('Restore target already exists'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const parent = resolve(target, '..');
  if (await realpath(parent) !== parent || !(await lstat(parent)).isDirectory()) throw new Error('Restore parent must be an existing real directory');
  const unlock = await operations.lock('restore-rehearsal');
  const startedAt = now().toISOString();
  const token = randomBytes(8).toString('hex');
  const name = config.project + '-restore-' + token;
  let container;
  let created = false;
  const stopOwnedRestore = async () => {
    if (created) {
      const entries = JSON.parse(await operations.docker(['inspect', container]));
      if (entries[0]?.Id !== container || entries[0]?.Config?.Labels?.['com.sense.restore'] !== token) throw new Error('Restore container changed; it was not stopped automatically');
      await operations.docker(['stop', '--time', '30', container]);
    }
  };
  try {
    await mkdir(target, { mode: 0o700 });
    const snapshots = JSON.parse(await operations.restic(['snapshots', '--json', snapshot]));
    if (snapshots.length !== 1 || snapshots[0].id !== snapshot || !snapshots[0].tags?.includes(config.project)) throw new Error('Snapshot does not belong to this project');
    const candidates = snapshots[0].tags.filter((tag) => /^nas-/.test(tag));
    if (candidates.length !== 1) throw new Error('Ambiguous backup identity');
    const id = assertBackupId(candidates[0]);
    // Only the newly created directory is added as a writable restore mount.
    await operations.compose(['run', '--rm', '--no-deps', '-T', '--volume', target + ':/restore', 'backup', 'restore', snapshot, '--target', '/restore', '--verify'], { timeoutMs: 2 * 60 * 60_000 });
    const stage = join(target, 'backup', 'staging', id);
    if (await realpath(stage) !== stage) throw new Error('Restored metadata path is unsafe');
    const metadata = JSON.parse(await readFile(join(stage, 'backup.json'), 'utf8'));
    if (metadata.id !== id || metadata.project !== config.project || metadata.postgresImage !== config.env.NAS_POSTGRES_IMAGE) throw new Error('Restored metadata or PostgreSQL target does not match');
    const files = JSON.parse(await readFile(join(stage, 'files.json'), 'utf8'));
    const fileCount = await verifyRestoredFiles(join(target, 'data', 'documents'), files);
    if (fileCount !== metadata.fileCount) throw new Error('Restored file count does not match metadata');
    for (const file of ['database.dump', 'globals.sql', 'database-counts.json']) if (!(await lstat(join(stage, file))).isFile() || (await lstat(join(stage, file))).isSymbolicLink()) throw new Error('Invalid restored database evidence');
    const cluster = join(target, 'isolated-postgres');
    await mkdir(cluster, { mode: 0o700 });
    if ((await readdir(cluster)).length) throw new Error('Restore cluster must be new and empty');
    const credentials = join(target, 'restore-only.env');
    await writeFile(credentials, 'POSTGRES_USER=sense_restore_operator\nPOSTGRES_DB=postgres\nPOSTGRES_PASSWORD=' + randomBytes(32).toString('hex') + '\n', { flag: 'wx', mode: 0o600 });
    container = await operations.docker(['create', '--name', name, '--network', 'none', '--label', 'com.sense.restore=' + token, '--env-file', credentials, '--mount', 'type=bind,src=' + cluster + ',dst=/var/lib/postgresql/data', '--mount', 'type=bind,src=' + target + ',dst=/restore,readonly', config.env.NAS_POSTGRES_IMAGE]);
    if (!snapshotPattern.test(container)) throw new Error('Invalid new restore container identity');
    created = true;
    const owned = async () => {
      const entries = JSON.parse(await operations.docker(['inspect', container]));
      if (entries.length !== 1 || entries[0].Id !== container || entries[0].Name !== '/' + name || entries[0].Config?.Labels?.['com.sense.restore'] !== token || entries[0].HostConfig?.NetworkMode !== 'none' || entries[0].HostConfig?.PortBindings && Object.keys(entries[0].HostConfig.PortBindings).length || !entries[0].Mounts?.some((mount) => mount.Source === cluster && mount.Destination === '/var/lib/postgresql/data')) throw new Error('Restore container identity or isolation changed');
      return entries[0];
    };
    await owned();
    await operations.docker(['start', container]);
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      try { await operations.docker(['exec', container, 'pg_isready', '-U', 'sense_restore_operator']); ready = true; break; }
      catch { await pause(1000); }
    }
    if (!ready) throw new Error('Isolated restore database did not become ready');
    await owned();
    await operations.docker(['exec', container, 'psql', '-U', 'sense_restore_operator', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', '/restore/backup/staging/' + id + '/globals.sql']);
    await operations.docker(['exec', container, 'createdb', '-U', 'sense_restore_operator', '-O', config.env.NAS_DB_USER, config.env.NAS_DB_NAME]);
    await operations.docker(['exec', container, 'pg_restore', '--exit-on-error', '-U', 'sense_restore_operator', '-d', config.env.NAS_DB_NAME, '/restore/backup/staging/' + id + '/database.dump'], { timeoutMs: 60 * 60_000 });
    const output = await operations.docker(['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'sense_restore_operator', '-d', config.env.NAS_DB_NAME, '-f', '-'], { input: countSql, timeoutMs: 10 * 60_000 });
    const expected = JSON.parse(await readFile(join(stage, 'database-counts.json'), 'utf8'));
    if (JSON.stringify(parseCounts(output)) !== JSON.stringify(expected)) throw new Error('Restored database row counts differ from the source recovery point');
    const systemIdentifier = await operations.docker(['exec', container, 'psql', '-X', '-A', '-t', '-U', 'sense_restore_operator', '-d', 'postgres', '-c', 'SELECT system_identifier FROM pg_control_system()']);
    if (!/^[0-9]+$/.test(systemIdentifier)) throw new Error('Invalid restore cluster system identifier');
    await owned();
    await operations.docker(['stop', '--time', '30', container]);
    if ((await owned()).State.Running) throw new Error('Restore cluster did not stop');
    created = false;
    const report = { status: 'DATABASE_AND_FILES_RESTORED', project: config.project, snapshot, backupId: id, sourceRelease: metadata.release, startedAt, finishedAt: now().toISOString(), fileCount, tables: expected.length, systemIdentifier, container, note: 'New isolated cluster only. Passkey, approval, application-role and real-phone/pilot acceptance still required. Cluster and restored data are preserved stopped.' };
    await writeFile(join(target, 'restore-result.json'), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
    return report;
  } finally {
    try {
      await stopOwnedRestore();
    } finally { await unlock(); }
  }
}

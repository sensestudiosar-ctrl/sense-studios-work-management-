import { lstat, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './config.mjs';
import { createOperations } from './operations.mjs';

/** Emit only a meaningful change; the operator configures the cron mail recipient. */
export async function recordMonitorState(path, state) {
  const identity = JSON.stringify({ status: state.status, issues: [...state.issues].sort() });
  let previous;
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('Monitor state must be a regular file');
    previous = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const changed = previous?.identity !== identity;
  if (changed) {
    const temporary = path + '.' + randomBytes(8).toString('hex') + '.tmp';
    await writeFile(temporary, JSON.stringify({ identity, observedAt: new Date().toISOString(), state }), { flag: 'wx', mode: 0o600 });
    await rename(temporary, path);
  }
  return changed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { 'env-file': { type: 'string' } } });
    const config = await loadConfig(values['env-file']);
    let maintenance;
    try { maintenance = JSON.parse(await readFile(join(config.env.NAS_BACKUP_DIR, 'operations.lock', 'owner.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const maintenanceAge = maintenance ? Date.now() - Date.parse(maintenance.startedAt) : undefined;
    if (maintenanceAge !== undefined && maintenanceAge >= 0 && maintenanceAge < 6 * 60 * 60_000) process.exit(0);
    let state;
    try { state = maintenance ? { status: 'ATTENTION', project: config.project, issues: ['operations-lock-overdue'] } : await createOperations(config).status(); }
    catch { state = { status: 'UNAVAILABLE', project: config.project, issues: ['local-operation-health-unavailable'] }; }
    if (await recordMonitorState(join(config.env.NAS_BACKUP_DIR, 'monitor-state.json'), state)) console.info(JSON.stringify(state));
    if (state.status !== 'HEALTHY') process.exitCode = 1;
  } catch { console.error('NAS monitoring configuration or protected state is unavailable.'); process.exitCode = 1; }
}

import { parseArgs } from 'node:util';
import { loadConfig } from './config.mjs';
import { createOperations } from './operations.mjs';
import { restoreRehearsal } from './restore.mjs';

const help = `NAS operations (Node24.19.0 on the Linux NAS; no implicit .env or target)
  node scripts/nas/cli.mjs validate --env-file /private/production.env
  node scripts/nas/cli.mjs preflight --env-file /private/production.env
  node scripts/nas/cli.mjs init-backups --repository local --env-file /private/production.env --confirm-project sense-production
  node scripts/nas/cli.mjs init-backups --repository offsite --env-file /private/production.env --confirm-project sense-production
  node scripts/nas/cli.mjs publish-assets --env-file /private/production.env --confirm-project sense-production
  node scripts/nas/cli.mjs backup --env-file /private/production.env --confirm-project sense-production
  node scripts/nas/cli.mjs status --env-file /private/production.env
  node scripts/nas/cli.mjs restore-rehearsal --env-file /private/production.env --confirm-project sense-production --snapshot FULL_DIGEST --target /absolute/NEW-restore-directory
No command migrates, deletes production data, changes DNS, prunes backups or publishes images.
`;

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { 'env-file': { type: 'string' }, 'confirm-project': { type: 'string' }, snapshot: { type: 'string' }, target: { type: 'string' }, repository: { type: 'string' }, help: { type: 'boolean' } } });
  if (values.help || !positionals.length) console.info(help);
  else {
    if (process.version !== 'v24.19.0') throw new Error('Required operational Node version is24.19.0');
    const command = positionals[0];
    if (positionals.length !== 1 || !['validate', 'preflight', 'init-backups', 'publish-assets', 'backup', 'status', 'restore-rehearsal'].includes(command)) throw new Error('Unknown NAS command; use --help');
    const config = await loadConfig(values['env-file'], { inspectPaths: command !== 'validate' });
    const mutates = ['init-backups', 'publish-assets', 'backup', 'restore-rehearsal'].includes(command);
    if (mutates && values['confirm-project'] !== config.project) throw new Error('Supply --confirm-project matching the explicit NAS target');
    const operations = createOperations(config);
    // Do not terminate halfway through writer quiescence. Finish the protected step/resume.
    if (mutates) for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { console.error('Interruption requested; waiting for the protected operation and writer recovery. Inspect status before retrying.'); process.exitCode = 1; });
    let result;
    if (command === 'validate') result = { status: 'CONFIG_VALID', project: config.project, release: config.release, note: 'No Docker, filesystem-mount or connectivity acceptance performed.' };
    else if (command === 'preflight') result = await operations.preflight();
    else if (command === 'init-backups') result = await operations.initBackups(values.repository);
    else if (command === 'publish-assets') result = await operations.publishAssets();
    else if (command === 'backup') result = await operations.backup();
    else if (command === 'status') result = await operations.status();
    else result = await restoreRehearsal(config, operations, values.snapshot ?? '', values.target ?? '');
    console.info(JSON.stringify(result, null, 2));
    if (result.status === 'ATTENTION') process.exitCode = 1;
  }
} catch (error) {
  // Only controlled validation/operation errors are useful outside the protected host.
  console.error(error instanceof Error && /^(Invalid or missing NAS configuration fields:|Supply |Production credentials|The NAS environment|NAS operations require|Required operational Node|Unknown NAS command|Unsafe or missing dedicated NAS directory:|NAS_BACKUP_DIR)/.test(error.message) ? error.message : 'NAS operation failed. Check the explicit target and protected host logs; no credentials were printed.');
  process.exitCode = 1;
}

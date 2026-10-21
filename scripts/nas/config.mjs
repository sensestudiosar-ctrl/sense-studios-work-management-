import { lstat, readFile, realpath } from 'node:fs/promises';
import { posix, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { isIP } from 'node:net';

export const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
export const imageFields = ['NAS_API_IMAGE', 'NAS_WEB_IMAGE', 'NAS_POSTGRES_IMAGE', 'NAS_TUNNEL_IMAGE', 'NAS_BACKUP_IMAGE'];
export const directoryFields = ['NAS_DOCUMENTS_DIR', 'NAS_POSTGRES_DIR', 'NAS_BACKUP_DIR', 'NAS_BACKUP_SSH_DIR', 'NAS_ASSETS_DIR'];
export const digestPattern = /^[a-z0-9][a-z0-9./:_-]*@sha256:[a-f0-9]{64}$/;
export const snapshotPattern = /^[a-f0-9]{64}$/;
export const backupIdPattern = /^nas-[0-9]{13}-[a-f0-9]{16}$/;

export function isWithin(root, target) {
  const part = relative(resolve(root), resolve(target));
  return part === '' || (!part.startsWith('..') && !isAbsolute(part));
}

/** Values are never interpolated as shell commands or echoed in diagnostics. */
export function validateConfig(input) {
  const env = { ...input };
  const invalid = new Set();
  const requireField = (key) => {
    const value = env[key];
    if (typeof value !== 'string' || !value || /REPLACE|YOUR_DOMAIN|YOUR_ACCOUNT/.test(value) || /[\0\r\n]/.test(value)) invalid.add(key);
    return value ?? '';
  };
  if (!/^sense-[a-z0-9-]{3,40}$/.test(requireField('NAS_PROJECT'))) invalid.add('NAS_PROJECT');
  if (requireField('NAS_ENVIRONMENT') !== 'production') invalid.add('NAS_ENVIRONMENT');
  if (!/^[a-f0-9]{40}$/.test(requireField('NAS_RELEASE'))) invalid.add('NAS_RELEASE');
  let origin;
  try {
    origin = new URL(requireField('NAS_WEB_ORIGIN'));
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.port || origin.pathname !== '/' || origin.search || origin.hash || isIP(origin.hostname) || !origin.hostname.includes('.') || !origin.hostname.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)) || /(?:^|\.)(localhost|example|test|invalid)$/.test(origin.hostname) || /(?:^|\.)example\.(com|net|org)$/.test(origin.hostname)) invalid.add('NAS_WEB_ORIGIN');
  } catch { invalid.add('NAS_WEB_ORIGIN'); }
  for (const key of imageFields) if (!digestPattern.test(requireField(key))) invalid.add(key);
  if (!/^postgres:17[.-]/.test(env.NAS_POSTGRES_IMAGE ?? '')) invalid.add('NAS_POSTGRES_IMAGE');
  for (const key of directoryFields) {
    const value = requireField(key);
    if (!posix.isAbsolute(value) || value === '/' || value.length < 5 || value.includes('\\') || value.includes(':') || posix.normalize(value) !== value || value.endsWith('/')) invalid.add(key);
  }
  for (let i = 0; i < directoryFields.length; i++) for (let j = i + 1; j < directoryFields.length; j++) {
    const a = env[directoryFields[i]] ?? '', b = env[directoryFields[j]] ?? '';
    if (a === b || a.startsWith(b + '/') || b.startsWith(a + '/')) { invalid.add(directoryFields[i]); invalid.add(directoryFields[j]); }
  }
  for (const key of ['NAS_DB_NAME', 'NAS_DB_USER']) if (!/^[a-z][a-z0-9_]{3,62}$/.test(requireField(key)) || ['postgres', 'template0', 'template1', 'sense_app_runtime'].includes(env[key])) invalid.add(key);
  for (const key of ['NAS_DB_PASSWORD', 'NAS_APP_DB_PASSWORD', 'NAS_EXTERNAL_SHARE_SECRET', 'NAS_EMAIL_VERIFICATION_SECRET', 'NAS_BACKUP_PASSWORD']) if (requireField(key).length < 32) invalid.add(key);
  if (env.NAS_DB_PASSWORD === env.NAS_APP_DB_PASSWORD) invalid.add('NAS_APP_DB_PASSWORD');
  for (const [key, user, password] of [['NAS_APP_DATABASE_URL', 'sense_app_runtime', env.NAS_APP_DB_PASSWORD], ['NAS_MIGRATION_DATABASE_URL', env.NAS_DB_USER, env.NAS_DB_PASSWORD]]) {
    try {
      const url = new URL(requireField(key));
      if (!['postgresql:', 'postgres:'].includes(url.protocol) || url.hostname !== 'db' || url.port !== '5432' || decodeURIComponent(url.username) !== user || decodeURIComponent(url.password) !== password || url.pathname !== '/' + env.NAS_DB_NAME || url.search || url.hash) invalid.add(key);
    } catch { invalid.add(key); }
  }
  requireField('NAS_BREVO_API_KEY'); requireField('NAS_TUNNEL_TOKEN');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requireField('NAS_BREVO_SENDER_EMAIL'))) invalid.add('NAS_BREVO_SENDER_EMAIL');
  const offsite = /^sftp:([a-zA-Z0-9_.-]+)@([a-zA-Z0-9.-]+):(\/[^\0\r\n]*)$/.exec(requireField('NAS_OFFSITE_REPOSITORY'));
  if (!offsite || ['localhost', '0.0.0.0', 'db', 'backup', origin?.hostname].includes(offsite[2]) || offsite[2].startsWith('127.') || offsite[3] === '/') invalid.add('NAS_OFFSITE_REPOSITORY');
  if (requireField('NAS_OFFSITE_CONFIRMED') !== 'yes') invalid.add('NAS_OFFSITE_CONFIRMED');
  if (Boolean(env.NAS_OWNER_BOOTSTRAP_EMAIL) !== Boolean(env.NAS_OWNER_BOOTSTRAP_SECRET) || (env.NAS_OWNER_BOOTSTRAP_SECRET && env.NAS_OWNER_BOOTSTRAP_SECRET.length < 32)) invalid.add('NAS_OWNER_BOOTSTRAP_SECRET');
  if (invalid.size) throw new Error('Invalid or missing NAS configuration fields: ' + [...invalid].sort().join(', '));
  return Object.freeze({ env: Object.freeze(env), project: env.NAS_PROJECT, release: env.NAS_RELEASE, origin: origin.origin });
}

export async function loadConfig(envFile, { platform = process.platform, inspectPaths = true } = {}) {
  if (!envFile || !isAbsolute(envFile)) throw new Error('Supply an absolute --env-file outside the repository');
  if (isWithin(repositoryRoot, envFile)) throw new Error('Production credentials must be outside the repository');
  const info = await lstat(envFile);
  if (await realpath(envFile) !== envFile) throw new Error('Production credentials must use a canonical path outside the repository');
  if (!info.isFile() || info.isSymbolicLink() || (platform !== 'win32' && (info.mode & 0o077))) throw new Error('The NAS environment file must be a private regular file (mode 600)');
  const config = validateConfig(parseEnv(await readFile(envFile, 'utf8')));
  if (inspectPaths) {
    if (platform !== 'linux') throw new Error('NAS operations require the local Linux NAS host; configuration validation is available separately');
    for (const key of directoryFields) {
      const path = config.env[key];
      const entry = await lstat(path);
      if (!entry.isDirectory() || entry.isSymbolicLink() || await realpath(path) !== path || isWithin(path, envFile) || isWithin(repositoryRoot, path)) throw new Error('Unsafe or missing dedicated NAS directory: ' + key);
    }
    const backup = await lstat(config.env.NAS_BACKUP_DIR);
    if (backup.mode & 0o077) throw new Error('NAS_BACKUP_DIR must be private (mode 700)');
    await lstat(resolve(config.env.NAS_BACKUP_SSH_DIR, 'known_hosts'));
  }
  return config;
}

export function composeEnvironment(config) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(NAS_|S0[124]_|COMPOSE_|DATABASE_URL$|MIGRATION_DATABASE_URL$|RESTIC_)/.test(key)));
  return { ...env, ...config.env, COMPOSE_INTERACTIVE_NO_CLI: '1', COMPOSE_MENU: 'false' };
}

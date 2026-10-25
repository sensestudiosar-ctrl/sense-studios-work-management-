// Bring back the canonical staging web child on 59443 (and the API child on
// 59442) after the v2 web swap left the app down. The API dir was never
// touched, so we relaunch it exactly as the supervisor does (same cwd, env
// from the release manifest + the runtime env file), and the web child now
// serves the swapped new-build files. PostgreSQL on 45434 is untouched.

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const staging = path.join(root, '.env.staging');
const COMMIT = '58872f0396a1fbbb3a6d4809edd1ba1ae02ec2c5';
const relDir = path.join(staging, 'releases', COMMIT);
const manifestPath = path.join(relDir, 'private-manifest.json');
const statePath = path.join(staging, 'runtime.json');
const token = JSON.parse(fs.readFileSync(statePath, 'utf8')).token;
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const db = manifest.database;

// Runtime env file the supervisor feeds the children (EXTERNAL_SHARE_SECRET).
const envFile = path.join(root, '.env.local-runtime');
const runtimeEnv = fs.readFileSync(envFile, 'utf8');
const secret = Object.fromEntries(runtimeEnv.split(/\r?\n/).filter(Boolean).map(line => line.split(/=(.+)/).map(v => v?.trim() ?? v)));

function findPortOwner(port) {
  const out = spawnSync('powershell', ['-NoProfile', '-Command',
    `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess`],
    { encoding: 'utf8', shell: false }).stdout.trim();
  return out ? Number(out) : null;
}

const safeEnv = Object.fromEntries(
  ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']
    .filter(key => process.env[key]).map(key => [key, process.env[key]])
);

function childEnv() {
  return {
    ...safeEnv,
    NODE_ENV: 'staging',
    PORT: '59442',
    API_LISTEN_HOST: '127.0.0.1',
    WEB_ORIGIN: 'http://localhost:59443',
    DATABASE_URL: `postgresql://${db.user}@${db.host}:${db.port}/${db.name}`,
    NAS_ROOT: path.resolve(root, '.env.checkpoint-tools/latest-retained-20261014/nas'),
    EXTERNAL_SHARE_SECRET: secret.EXTERNAL_SHARE_SECRET ?? '',
    SENSE_RELEASE_FILE: manifestPath,
    SENSE_RELEASE_ROOT: relDir,
    OWNER_BOOTSTRAP_EMAIL: '',
    OWNER_BOOTSTRAP_SECRET: '',
    BREVO_API_KEY: '',
    BREVO_SENDER_EMAIL: '',
    BREVO_SENDER_NAME: '',
    EMAIL_VERIFICATION_SECRET: '',
    TIME_ACCOUNTING_RECEIVER_URL: '',
    TIME_ACCOUNTING_RECEIVER_TOKEN: '',
  };
}

function start(label, entry, cwd) {
  const port = label === 'api' ? 59442 : 59443;
  if (findPortOwner(port)) { console.log(`[restart] ${label} already listening on ${port}, skipping.`); return; }
  const nodeExe = path.join(relDir, 'runtime', 'node.exe');
  console.log(`[restart] launching ${label}: ${nodeExe} ${path.relative(root, entry)}`);
  const child = spawn(nodeExe, [entry, `--sense-staging-owner=${token}`], {
    cwd, env: childEnv(), shell: false, windowsHide: true,
    stdio: label === 'api' ? ['ignore', 'inherit', 'inherit'] : ['ignore', 'ignore', 'inherit'],
    detached: true,
  });
  child.unref();
  console.log(`[restart] ${label} detached, PID ${child.pid}`);
}

// API first — the web server proxies /api to it.
start('api', path.join(relDir, 'api', 'dist', 'main.js'), path.join(relDir, 'api'));
start('web', path.join(relDir, 'runtime', 'server.mjs'), path.join(relDir, 'web'));

console.log('[restart] waiting for 59442 + 59443 …');
let apiOk = false, webOk = false;
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 1500));
  if (!apiOk) {
    try {
      const r = await fetch('http://127.0.0.1:59442/api/v1/health/ready', { signal: AbortSignal.timeout(1500) });
      if (r.status === 200) { apiOk = true; console.log('[restart] API ready on 59442'); }
    } catch { /* still starting */ }
  }
  if (!webOk) {
    try {
      const r = await fetch('http://127.0.0.1:59443/healthz', { signal: AbortSignal.timeout(1500) });
      if (r.status === 200) { const b = await r.json(); webOk = String(b.buildId ?? '').includes('uncommitted-'); if (webOk) console.log('[restart] WEB ready on 59443, buildId', b.buildId); }
    } catch { /* still starting */ }
  }
  if (apiOk && webOk) break;
}
console.log(`[restart] RESULT → API(59442): ${apiOk ? 'READY' : 'NOT READY'}   WEB-new-build(59443): ${webOk ? 'READY' : 'NOT READY'}`);
if (!apiOk || !webOk) {
  console.error('[restart] something did not come up. Check the API child console above (API stderr was inherited) and 59443. The web swap is still in place; use rollback if you want the sealed release back.');
}

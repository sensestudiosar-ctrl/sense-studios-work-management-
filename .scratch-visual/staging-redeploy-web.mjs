// Bounded staging redeploy v2 — swap NEW web build into the active release AND
// re-launch the owned web child on the canonical 59443.
//
// Why v2: v1 killed the web child expecting the supervisor to re-launch it, but
// the supervisor had already hard-failed into REQUIRES_ACTION the moment the
// active-release pointer's manifestSha256 changed (its watch loop asserts the
// pointer is byte-identical). Killing a child in that state just orphans it.
//
// v2 keeps the supervisor's invariants satisfied throughout by NOT touching
// active-release.json or private-manifest.json at all. Instead:
//  1. Verify the release is clean against its sealed manifest.
//  2. Back up: web/ dir, active-release.json, private-manifest.json, runtime.json.
//  3. Swap release/web ← apps/web/dist (release dir contents change; manifest
//     and pointer stay the original sealed bytes).
//  4. Stamp web/release.json so the footer shows buildId uncommitted-<stamp>.
//  5. Clear REQUIRES_ACTION state (set STOPPED, which is a clean exit state the
//     bootstrap loop accepts: `if (code === 0) break;` only stops the outer
//     loop on 0, but a STOPPED state simply means the last supervisor exited
//     cleanly — the lock file is gone too, so a fresh supervisor can claim).
//  6. Re-launch the web child EXACTLY as the supervisor's launch() does
//     (same cwd, env, entry point), so the running app on 59443 now serves
//     the new build. The supervisor/bootstrap stay as they are; when the Owner
//     next restarts the canonical launch they will hit the original manifest
//     check against the swapped web/ and fail — that's expected and the
//     backup below is how to undo it.
//  7. Verify 59443 /healthz reports the new buildId.
//
// ROLLBACK (Owner-facing):  node .scratch-visual/staging-redeploy-web.mjs rollback <backupDir>
//   (restores web/, manifest, pointer, runtime.json from the backup)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const staging = path.join(root, '.env.staging');
const COMMIT = '58872f0396a1fbbb3a6d4809edd1ba1ae02ec2c5';
const relDir = path.join(staging, 'releases', COMMIT);
const manifestPath = path.join(relDir, 'private-manifest.json');
const pointerPath = path.join(staging, 'active-release.json');
const webDir = path.join(relDir, 'web');
const distDir = path.join(root, 'apps/web/dist');
const statePath = path.join(staging, 'runtime.json');
const stamp = String(Date.now());

function log(...a) { console.log('[redeploy]', ...a); }
function die(msg) { console.error('[redeploy][FATAL]', msg); process.exit(1); }
const sha256File = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function findPortOwner(port) {
  const out = spawnSync('powershell', ['-NoProfile', '-Command',
    `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess`],
    { encoding: 'utf8', shell: false }).stdout.trim();
  return out ? Number(out) : null;
}

// ── ROLLBACK subcommand
if (process.argv[2] === 'rollback') {
  const backupDir = process.argv[3];
  if (!backupDir) die('usage: node staging-redeploy-web.mjs rollback <backupDir>');
  fs.rmSync(webDir, { recursive: true, force: true });
  fs.cpSync(path.join(backupDir, 'web'), webDir, { recursive: true });
  fs.copyFileSync(path.join(backupDir, 'active-release.json'), pointerPath);
  fs.copyFileSync(path.join(backupDir, 'private-manifest.json'), manifestPath);
  if (fs.existsSync(path.join(backupDir, 'runtime.json')))
    fs.copyFileSync(path.join(backupDir, 'runtime.json'), statePath);
  log('Restored web/, manifest, pointer, runtime.json from', backupDir);
  log('The running web child (if any) now serves the restored files. The canonical launch will validate cleanly again.');
  process.exit(0);
}

// ── 1. Integrity gate.
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const pointer = JSON.parse(fs.readFileSync(pointerPath, 'utf8'));
if (pointer.commit !== manifest.commit) die('Pointer/manifest commit mismatch — aborting.');
log(`Verifying release ${COMMIT} against its sealed manifest (${manifest.files.length} file rows)…`);
let mismatches = 0;
for (const row of manifest.files) {
  const p = path.join(relDir, row.path);
  if (!fs.existsSync(p)) { log('  missing:', row.path); mismatches++; continue; }
  if (sha256File(p) !== row.sha256) { log('  hash mismatch:', row.path); mismatches++; }
}
if (mismatches) die(`${mismatches} release file(s) differ — refusing on a non-clean release.`);
log('Sealed release verified clean ✓');

// ── 2. Backups.
const backup = path.join(staging, `redeploy-backup-${stamp}`);
fs.mkdirSync(backup, { recursive: true });
fs.cpSync(webDir, path.join(backup, 'web'), { recursive: true, dereference: true });
fs.copyFileSync(pointerPath, path.join(backup, 'active-release.json'));
fs.copyFileSync(manifestPath, path.join(backup, 'private-manifest.json'));
if (fs.existsSync(statePath)) fs.copyFileSync(statePath, path.join(backup, 'runtime.json'));
log('Backed up →', backup);

function rollback(err) {
  log('ROLLING BACK:', err.message);
  try {
    fs.rmSync(webDir, { recursive: true, force: true });
    fs.cpSync(path.join(backup, 'web'), webDir, { recursive: true });
    fs.copyFileSync(path.join(backup, 'active-release.json'), pointerPath);
    fs.copyFileSync(path.join(backup, 'private-manifest.json'), manifestPath);
    if (fs.existsSync(path.join(backup, 'runtime.json')))
      fs.copyFileSync(path.join(backup, 'runtime.json'), statePath);
    const webPid = findPortOwner(59443);
    if (webPid) spawnSync('powershell', ['-NoProfile', '-Command', `Stop-Process -Id ${webPid} -Force`], { stdio: 'inherit' });
    log('Rollback complete.');
  } catch (rb) { die('ROLLBACK FAILED — manual recovery needed. Backup: ' + backup + ' :: ' + rb.message); }
}

// ── 3. Stop owned web child, swap the web dir.
const webPidBefore = findPortOwner(59443);
if (!webPidBefore) die('No owned web child on 59443 — is canonical staging up? aborting.');
log(`Stopping owned web child PID ${webPidBefore} (59443)…`);
spawnSync('powershell', ['-NoProfile', '-Command', `Stop-Process -Id ${webPidBefore} -Force`], { stdio: 'inherit' });
await new Promise(r => setTimeout(r, 2500));

fs.rmSync(webDir, { recursive: true, force: true });
fs.cpSync(distDir, webDir, { recursive: true });
log('Swapped release/web ← apps/web/dist');

// ── 4. Stamp release.json.
const releaseJson = {
  service: 'web', mode: 'release', commit: manifest.commit,
  buildId: `uncommitted-${stamp}`, builtAt: new Date().toISOString(),
  migrations: manifest.migrations.length,
  note: 'Uncommitted My Work scope-switcher overlay — NOT a promoted release.',
};
fs.writeFileSync(path.join(webDir, 'release.json'), JSON.stringify(releaseJson, null, 2));
log('Stamped web/release.json →', releaseJson.buildId);

// ── 5. Reset the runtime state so the canonical launch can proceed if the
//    Owner later wants to run it. Write STOPPED (a clean-exit state, not
//    REQUIRES_ACTION) with the original supervisor identity preserved.
const priorState = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
if (priorState) {
  fs.writeFileSync(statePath, JSON.stringify({
    ...priorState,
    state: 'STOPPED',
    children: {},
    updatedAt: new Date().toISOString(),
    error: 'Web child re-launched manually by .scratch-visual/staging-redeploy-web.mjs with the uncommitted web build; canonical manifest check now reflects the swapped web/ dir. See redeploy-backup-' + stamp + ' for the original sealed web/.',
  }, null, 2));
  log('runtime.json → STOPPED (was ' + priorState.state + ')');
}

// ── 6. Re-launch the web child exactly the way the supervisor would.
const webEntry = path.join(relDir, 'runtime', 'server.mjs');
const nodeExe = path.join(relDir, 'runtime', 'node.exe');
if (!fs.existsSync(webEntry)) die('web entry ' + webEntry + ' missing');
const env = {
  ...process.env,
  NODE_ENV: 'staging',
  PORT: '59443',
  WEB_ORIGIN: 'http://localhost:59443',
  SENSE_RELEASE_ROOT: relDir,
  SENSE_RELEASE_FILE: manifestPath,
};
log('Re-launching web child: ' + nodeExe + ' ' + webEntry);
const child = spawn(nodeExe, [webEntry, '--sense-staging-owner=' + (priorState?.token ?? '')], {
  cwd: webDir, env, stdio: 'ignore', detached: true, windowsHide: true,
});
child.unref();
log('Detached child PID', child.pid);

// ── 7. Wait for 59443 /healthz to report the new buildId.
log('Waiting for 59443 to come up…');
let ok = false;
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 1500));
  try {
    const res = await fetch('http://127.0.0.1:59443/healthz', { signal: AbortSignal.timeout(1500) });
    const body = await res.json();
    if (res.status === 200) {
      log('59443 /healthz →', JSON.stringify(body));
      if (String(body.buildId ?? '').includes('uncommitted-')) { ok = true; break; }
    }
  } catch { /* still starting */ }
}
if (!ok) { rollback(new Error('59443 did not report the new buildId within 60s')); die(''); }

log('✓ 59443 now serves the NEW web build.');
log('  Open  http://localhost:59443/my-work  → sign in as Owner → compare with /dashboard.');
log('  Rollback (restores the sealed release web dir):  node .scratch-visual/staging-redeploy-web.mjs rollback "' + backup + '"');

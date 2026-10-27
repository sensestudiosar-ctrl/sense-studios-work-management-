/**
 * dev-js-twin-watcher — keep the committed .js twins of apps/web/src in sync
 * with the .ts/.tsx source while a Vite dev server runs.
 *
 * The web module graph resolves `./task.js` (not `./task.tsx`), so the Vite dev
 * server serves the physical .js twin. This watcher re-emits the twin for any
 * changed source file using the flags verified byte-identical against the
 * committed twins, so source edits hot reload without a manual rebuild.
 *
 * Dev loop only. Sealed staging releases (scripts/staging/build.mjs) build from
 * a committed git revision and are unaffected by this.
 *
 * Usage: node scripts/dev-js-twin-watcher.mjs
 * Requires a running Vite dev server for the reload to be visible.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, 'apps', 'web', 'src');
const tsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');
// Flags proven to reproduce the committed .js twins byte-for-byte.
const EMIT_FLAGS = ['--jsx', 'react-jsx', '--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--esModuleInterop', '--skipLibCheck', '--noEmit', 'false'];

function emitFor(relPath) {
  // relPath is like "task.tsx" or "my-work/my-work-parity.tsx"
  const sub = path.dirname(relPath); // "." for top-level, else e.g. "my-work"
  const outDir = sub === '.' ? '/tmp/js-twin-out' : path.join('/tmp', 'js-twin-out', sub);
  const dest = path.join(srcRoot, relPath.replace(/\.(tsx|ts)$/, '.js'));
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  // Single-file emit: tsc rootDir = the file's own dir, so outDir gets the basename.
  const result = spawnSync(process.execPath, [tsc, path.join(srcRoot, relPath), '--outDir', outDir, ...EMIT_FLAGS], { cwd: path.join(root, 'apps', 'web'), stdio: 'pipe' });
  const outJs = path.join(outDir, path.basename(relPath, path.extname(relPath)) + '.js');
  if (!fs.existsSync(outJs)) {
    console.error(`[js-twin-watcher] EMIT FAILED for ${relPath} — stale file risk, restarting watcher:\n${result.stdout?.toString().slice(0, 800)}\n${result.stderr?.toString().slice(0, 400)}`);
    // Keep watching so the next save retries; but surface the failure loudly.
    return;
  }
  fs.copyFileSync(outJs, dest);
  console.log(`[js-twin-watcher] synced ${relPath} -> ${path.relative(srcRoot, dest)} (hot reload ready)`);
}

const debounces = new Map();
function onChange(filename) {
  if (!filename || filename.endsWith('.js') || !/\.(tsx|ts)$/.test(filename)) return;
  const rel = filename.replace(/\\/g, '/');
  clearTimeout(debounces.get(rel));
  debounces.set(rel, setTimeout(() => { debounces.delete(rel); emitFor(rel); }, 150));
}

console.log('[js-twin-watcher] watching', srcRoot);
const watcher = fs.watch(srcRoot, { recursive: true }, (event, filename) => onChange(filename));
watcher.on('error', (error) => { console.error('[js-twin-watcher] fs.watch error', error); process.exit(1); });
process.on('SIGINT', () => { console.log('\n[js-twin-watcher] stopped'); process.exit(0); });

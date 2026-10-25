// Append the CURRENT web/ dir's file rows to the release's private-manifest.json
// and refresh the active-release pointer's manifestSha256. Run BEFORE relaunching
// the web child so its static-server allowlist accepts the new hash-named bundles.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const relDir = path.join(root, '.env.staging/releases/58872f0396a1fbbb3a6d4809edd1ba1ae02ec2c5');
const manifestPath = path.join(relDir, 'private-manifest.json');
const pointerPath = path.join(root, '.env.staging/active-release.json');
const webDir = path.join(relDir, 'web');

const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function walk(dir, prefix, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    const rel2 = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) walk(f, rel2, out); else out.push(rel2);
  }
}

const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const rows = {};
for (const r of m.files) if (!r.path.startsWith('web/')) rows[r.path] = r;
const webFiles = [];
walk(webDir, '', webFiles);
for (const rel of webFiles) {
  const p = path.join(webDir, rel);
  rows[`web/${rel.replaceAll('\\', '/')}`] = { path: `web/${rel.replaceAll('\\', '/')}`, bytes: fs.statSync(p).size, sha256: sha(p) };
}
m.files = Object.values(rows).sort((a, b) => (a.path < b.path ? -1 : 1));
fs.writeFileSync(manifestPath, JSON.stringify(m));
const pointer = JSON.parse(fs.readFileSync(pointerPath, 'utf8'));
pointer.manifestSha256 = sha(manifestPath);
fs.writeFileSync(pointerPath, JSON.stringify(pointer, null, 2));
console.log(`manifest now has ${Object.keys(rows).filter(k => k.startsWith('web/')).length} web rows; pointer updated to ${pointer.manifestSha256.slice(0, 16)}…`);

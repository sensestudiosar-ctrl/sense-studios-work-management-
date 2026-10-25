import fs from 'node:fs';
const p = process.argv[2];
const m = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('keys:', Object.keys(m).join(', '));
console.log('commit:', m.commit, 'buildId:', m.buildId, 'migrations:', m.migrations);
const files = m.files ?? [];
const web = files.filter(f => f.path?.startsWith('web/'));
console.log('total files:', files.length, 'web files:', web.length);
console.log('sample web:', web.slice(0, 6).map(f => f.path));
// Check a few of our changed files' presence
for (const probe of ['web/index.html']) {
  const found = web.find(f => f.path === probe);
  console.log(probe, 'in manifest:', !!found, found ? `sha ${String(found.sha256 ?? found.sha ?? '').slice(0, 12)}` : '');
}

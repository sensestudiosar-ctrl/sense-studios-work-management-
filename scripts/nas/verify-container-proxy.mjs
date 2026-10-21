import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { repositoryRoot } from './config.mjs';
import { run } from './operations.mjs';

const { values } = parseArgs({ options: { 'api-image': { type: 'string' }, 'web-image': { type: 'string' } } });
for (const key of ['api-image', 'web-image']) if (!/^sense-nas-ci-[a-z0-9-]+:[a-z0-9-]+$/.test(values[key] ?? '')) throw new Error('Only explicitly named local sense-nas-ci-* test images are allowed');
if (process.env.DOCKER_HOST && !/^(unix:|npipe:)/.test(process.env.DOCKER_HOST)) throw new Error('Container verification refuses a remote Docker host');
const context = JSON.parse(await run('docker', ['context', 'inspect']));
if (context.length !== 1 || !/^(unix:|npipe:)/.test(context[0].Endpoints?.docker?.Host ?? '')) throw new Error('Container verification requires an explicitly local Docker engine');
const token = randomBytes(8).toString('hex');
const network = 'sense-nas-ci-' + token;
const label = 'com.sense.nas.probe=' + token;
const containers = [];
let networkCreated = false;
const stub = `const http=require('node:http'),crypto=require('node:crypto');http.createServer(async(req,res)=>{const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>13*1024*1024){res.writeHead(413);res.end();return}parts.push(part)}res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','public,max-age=9999');res.end(JSON.stringify({size,sha256:crypto.createHash('sha256').update(Buffer.concat(parts)).digest('hex'),scheme:req.headers['x-forwarded-proto'],ip:req.headers['x-forwarded-for']}))}).listen(4000,'0.0.0.0');`;
try {
  await run('docker', ['network', 'create', '--internal', '--label', label, network]); networkCreated = true;
  const api = await run('docker', ['run', '--detach', '--name', network + '-api', '--label', label, '--network', network, '--network-alias', 'api', '--entrypoint', 'node', values['api-image'], '-e', stub]);
  containers.push(api);
  const web = await run('docker', ['run', '--detach', '--name', network + '-web', '--label', label, '--network', network, '--publish', '127.0.0.1::8080', values['web-image']]);
  containers.push(web);
  await run('docker', ['exec', web, 'nginx', '-t']);
  const port = await run('docker', ['port', web, '8080/tcp']);
  assert.match(port, /^127\.0\.0\.1:[0-9]+$/);
  const base = 'http://' + port;
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { ready = (await fetch(base + '/healthz')).ok; if (ready) break; } catch { /* Owned probe may still be starting. */ }
    await new Promise((done) => setTimeout(done, 250));
  }
  assert.equal(ready, true);
  const identity = await fetch(base + '/api/v1/probe', { headers: { 'CF-Connecting-IP': '198.51.100.23', 'X-Forwarded-For': '203.0.113.99', 'X-Forwarded-Proto': 'http' } });
  assert.equal(identity.headers.get('cache-control'), 'no-store');
  assert.equal(identity.headers.get('strict-transport-security'), 'max-age=31536000');
  assert.deepEqual(await identity.json(), { size: 0, sha256: createHash('sha256').update('').digest('hex'), scheme: 'https', ip: '198.51.100.23' });
  const chunk = Buffer.alloc(8 * 1024 * 1024, 97);
  const path = '/api/v1/documents/uploads/11111111-1111-4111-8111-111111111111/chunks/0';
  const upload = await fetch(base + path, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: chunk });
  assert.equal(upload.status, 200); assert.equal((await upload.json()).sha256, createHash('sha256').update(chunk).digest('hex'));
  assert.equal((await fetch(base + path, { method: 'PUT', body: Buffer.alloc(chunk.length + 1) })).status, 413);
  assert.equal((await fetch(base + '/api/v1/probe', { method: 'POST', body: Buffer.alloc(1024 * 1024 + 1) })).status, 413);
  for (const [route, bytes] of [['/api/v1/workforce/attendance/check-in', 6 * 1024 * 1024], ['/api/v1/portfolio/projects', 12 * 1024 * 1024]]) assert.equal((await fetch(base + route, { method: 'POST', body: Buffer.alloc(bytes) })).status, 200);
  assert.equal((await fetch(base + '/api/docs')).status, 404);
  assert.equal((await fetch(base + '/assets/missing-hash.js')).status, 404);
  const modulePath = await run('docker', ['exec', web, 'sh', '-c', 'ls /usr/share/nginx/html/assets/*.mjs']);
  const moduleName = modulePath.split('\n')[0].split('/').at(-1);
  assert.match((await fetch(base + '/assets/' + encodeURIComponent(moduleName))).headers.get('content-type'), /^application\/javascript/);
  assert.match((await fetch(base + '/sw.js')).headers.get('cache-control'), /no-store/);
  const html = await fetch(base + '/install'); assert.equal(html.status, 200); assert.equal(html.headers.get('cache-control'), 'no-cache');
  const output = resolve(repositoryRoot, '.artifacts/nas/container-proxy'); await mkdir(output, { recursive: true });
  const report = { status: 'PASS', boundary: 'Production Nginx image with a synthetic isolated upstream; proxy limits/headers only, no real API authorization, PostgreSQL, NAS, Cloudflare or phone acceptance.' };
  await writeFile(resolve(output, 'result.json'), JSON.stringify(report, null, 2)); console.info(JSON.stringify(report));
} finally {
  for (const container of containers.reverse()) {
    assert.match(container, /^[a-f0-9]{64}$/);
    const entries = JSON.parse(await run('docker', ['inspect', container]));
    assert.equal(entries[0]?.Config?.Labels?.['com.sense.nas.probe'], token);
    await run('docker', ['rm', '--force', container]);
  }
  if (networkCreated) {
    const entries = JSON.parse(await run('docker', ['network', 'inspect', network]));
    assert.equal(entries[0]?.Labels?.['com.sense.nas.probe'], token);
    await run('docker', ['network', 'rm', network]);
  }
}

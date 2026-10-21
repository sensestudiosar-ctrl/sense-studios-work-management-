import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { inside } from './manifest.mjs';

const types = { '.html':'text/html; charset=utf-8', '.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf', '.wasm':'application/wasm', '.pdf':'application/pdf' };
export function safeStaticPath(webRoot, rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.startsWith('/') || rawUrl.startsWith('//')) return null;
  let decoded; try { decoded = decodeURIComponent(rawUrl.split('?')[0]); } catch { return null; }
  if (/[\\\0%]/.test(decoded) || decoded.split('/').some(part => part === '..' || part.startsWith('.')) || decoded.includes(':')) return null;
  const file = path.resolve(webRoot, '.' + decoded);
  if (file !== path.resolve(webRoot) && !inside(webRoot, file)) return null;
  return { file, pathname: decoded };
}
export function createStagingServer({ webRoot, manifest, webPort = 59443, apiPort = 59442 }) {
  const root = fs.realpathSync(webRoot);
  const allowedHosts = new Set([`localhost:${webPort}`, `127.0.0.1:${webPort}`]);
  const publicFiles = new Set(manifest.files.filter(row => row.path.startsWith('web/')).map(row => row.path.slice(4)));
  const server = http.createServer((request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    if (!allowedHosts.has(request.headers.host?.toLowerCase())) { response.writeHead(403).end(); return; }
    const resolved = safeStaticPath(root, request.url);
    if (!resolved) { response.writeHead(400).end(); return; }
    if (resolved.pathname === '/api' || resolved.pathname.startsWith('/api/')) {
      const headers = { ...request.headers, host: `127.0.0.1:${apiPort}` };
      for (const key of Object.keys(headers)) if (key.startsWith('x-forwarded-') || ['forwarded','connection','proxy-authorization','proxy-connection'].includes(key)) delete headers[key];
      const upstream = http.request({ host: '127.0.0.1', port: apiPort, path: request.url, method: request.method, headers, timeout: 120000 }, result => {
        const outgoing = { ...result.headers, 'cache-control': 'no-store' }; delete outgoing.connection;
        result.on('error',()=>response.destroy());result.on('aborted',()=>response.destroy());
        response.writeHead(result.statusCode ?? 502, outgoing); result.pipe(response);
      });
      upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end('API unavailable'); });
      response.once('close',()=>{if(!response.writableFinished)upstream.destroy();});
      upstream.on('timeout', () => upstream.destroy()); request.on('aborted', () => upstream.destroy()); request.pipe(upstream); return;
    }
    if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    if (resolved.pathname === '/healthz') { response.setHeader('Content-Type','application/json'); response.end(JSON.stringify({ status:'alive', commit:manifest.commit, buildId:manifest.buildId })); return; }
    let file = resolved.file;
    if (resolved.pathname === '/') file = path.join(root, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      if (path.extname(resolved.pathname)) { response.writeHead(404).end(); return; }
      file = path.join(root, 'index.html');
    }
    if (!publicFiles.has(path.relative(root, file).replaceAll('\\', '/'))) { response.writeHead(404).end(); return; }
    const real = fs.realpathSync(file);
    if (!inside(root, real)) { response.writeHead(403).end(); return; }
    const type = types[path.extname(real)];
    if (!type || path.basename(real) === 'private-manifest.json') { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type',type);
    if (resolved.pathname.startsWith('/assets/')) response.setHeader('Cache-Control','public, max-age=31536000, immutable');
    response.setHeader('Content-Length',fs.statSync(real).size);
    if (request.method === 'HEAD') response.end(); else fs.createReadStream(real).on('error', () => response.destroy()).pipe(response);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const release = process.env.SENSE_RELEASE_ROOT;
  if (!release) throw new Error('Explicit immutable release required');
  const manifest = JSON.parse(fs.readFileSync(path.join(release,'private-manifest.json'),'utf8'));
  createStagingServer({ webRoot:path.join(release,'web'), manifest }).listen(59443,'127.0.0.1');
}

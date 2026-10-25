// Bounded staging WEB-only overlay for the My Work scope-switcher visual comparison.
//
// The running staging supervisor enforces a 25-minute manifest-frozen release
// (inventory check every 12 ticks at 2.5s) and the static web server
// (runtime/server.mjs) refuses any web file that isn't listed in the release's
// private-manifest.json — so a plain dist swap onto the active release is NOT
// an option without corrupting the sealed release.
//
// Instead this script:
//  1. Serves the freshly built apps/web/dist/ read-only on a free loopback port
//     (59743), proxying /api/* to the live staging API on 59442 (same behavior
//     as the real staging server, host-rewritten for loopback).
//  2. Leaves the sealed release, its web/API processes, the supervisor and the
//     PostgreSQL database completely untouched.
//  3. Prints the exact URL to open in the comparison script.
//
// Rollback: kill the node PID this script prints. Nothing else was changed.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const distDir = path.join(root, 'apps/web/dist');
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('apps/web/dist missing — run: pnpm --filter @sense/web build');
  process.exit(1);
}

const WEB_PORT = 59743;
const API_PORT = 59442;
const API_HOST = '127.0.0.1';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.pdf': 'application/pdf' };

// Sanity: confirm the live API is up before we point the overlay at it.
try {
  const res = await fetch(`http://${API_HOST}:${API_PORT}/api/v1/health/ready`, { signal: AbortSignal.timeout(3000) });
  console.log(`API on ${API_HOST}:${API_PORT} ready (${res.status})`);
} catch (error) {
  console.error(`API on ${API_HOST}:${API_PORT} unreachable — aborting: ${error.message}`);
  process.exit(1);
}

const server = http.createServer((request, response) => {
  request.on('error', () => { response.destroy(); });
  response.on('error', () => {});
  const url = request.url ?? '/';
  if (url === '/api' || url.startsWith('/api/')) {
    // Forward to the live staging API, mirroring the real staging server's proxy.
    const headers = { ...request.headers, host: `${API_HOST}:${API_PORT}` };
    for (const key of Object.keys(headers)) if (key.startsWith('x-forwarded-') || ['forwarded', 'connection', 'proxy-authorization', 'proxy-connection'].includes(key)) delete headers[key];
    const upstream = http.request({ host: API_HOST, port: API_PORT, path: url, method: request.method, headers, timeout: 120000 }, result => {
      const outgoing = { ...result.headers, 'cache-control': 'no-store' };
      delete outgoing.connection;
      result.on('error', () => response.destroy());
      result.on('aborted', () => response.destroy());
      if (!response.headersSent) response.writeHead(result.statusCode ?? 502, outgoing);
      result.pipe(response);
    });
    upstream.on('error', error => { if (!response.headersSent) response.writeHead(502, { 'content-type': 'text/plain' }); response.end(`API unavailable: ${error.message}`); });
    upstream.on('timeout', () => upstream.destroy());
    request.on('aborted', () => upstream.destroy());
    request.pipe(upstream);
    return;
  }
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  let decoded;
  try { decoded = decodeURIComponent(url.split('?')[0]); } catch { response.writeHead(400).end(); return; }
  if (!decoded.startsWith('/') || decoded.includes('\0') || decoded.split('/').some(part => part === '..' || part.startsWith('.'))) { response.writeHead(400).end(); return; }
  if (decoded === '/') decoded = '/index.html';
  // SPA deep links (e.g. /my-work) have no file on disk: serve index.html for any
  // path without a known file extension; real files are matched by their extension.
  const hasExtension = path.extname(decoded) !== '';
  const candidate = hasExtension ? path.resolve(distDir, '.' + decoded) : path.join(distDir, 'index.html');
  const servingFile = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(distDir, 'index.html');
  const isHtml = servingFile.endsWith('index.html');
  const type = isHtml ? 'text/html; charset=utf-8' : (types[path.extname(servingFile).toLowerCase()] ?? 'application/octet-stream');
  const distRoot = fs.realpathSync(distDir);
  const real = fs.realpathSync(servingFile);
  if (!real.startsWith(distRoot)) { response.writeHead(403).end(); return; }
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Content-Type', type);
  response.setHeader('Cache-Control', servingFile.endsWith('index.html') || !decoded.startsWith('/assets/') ? 'no-store' : 'public, max-age=31536000, immutable');
  if (request.method === 'HEAD') {
    response.writeHead(200, { 'Content-Length': fs.statSync(servingFile).size });
    response.end();
    return;
  }
  const stream = fs.createReadStream(servingFile);
  stream.on('error', () => { if (!response.headersSent) response.writeHead(500); response.destroy(); });
  response.writeHead(200);
  stream.pipe(response);
});

server.on('clientError', (error, socket) => socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'));
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(WEB_PORT, '127.0.0.1', resolve);
});
console.log(`Overlay web server (uncommitted dist + live 59442 API) running at:`);
console.log(`  http://localhost:${WEB_PORT}/`);
console.log(`PID ${process.pid} — kill it when the comparison is done; the sealed 59443 release was not touched.`);
// Keep the process alive.
process.on('SIGINT', () => { server.close(); process.exit(0); });

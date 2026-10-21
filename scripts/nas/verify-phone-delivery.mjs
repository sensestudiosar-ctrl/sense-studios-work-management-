import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { repositoryRoot, isWithin } from './config.mjs';

const directory = resolve(repositoryRoot, 'apps/web/dist');
const output = resolve(repositoryRoot, '.artifacts/nas/phone-delivery');
await mkdir(output, { recursive: true });
let workerVersion = 1;
const mime = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.startsWith('/api/')) { response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end('{"status":"unavailable"}'); return; }
    let path = resolve(directory, '.' + pathname);
    if (!isWithin(directory, path)) { response.writeHead(404); response.end(); return; }
    if (!(await stat(path).catch(() => undefined))?.isFile()) path = resolve(directory, 'index.html');
    const bytes = await readFile(path);
    response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(pathname === '/sw.js' ? Buffer.concat([bytes, Buffer.from('\n// NAS browser verification worker version ' + workerVersion)]) : bytes);
  } catch { response.writeHead(500); response.end('Static verification server error'); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = 'http://127.0.0.1:' + server.address().port;
let browser;
const errors = [];
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base + '/install');
  await page.getByRole('heading', { name: 'Your work, on your phone' }).waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  for (const width of [320, 390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.getByRole('link', { name: 'Open Sense Studios' }).evaluate((element) => element.getBoundingClientRect().height >= 44), true);
    await page.screenshot({ path: resolve(output, 'install-' + width + '.png'), fullPage: true });
  }
  const manifest = await (await context.request.get(base + '/manifest.webmanifest')).json();
  assert.equal(manifest.display, 'standalone'); assert.equal(manifest.id, '/');
  for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
    const bytes = await (await context.request.get(base + '/' + name)).body();
    assert.equal(bytes.readUInt32BE(16), size); assert.equal(bytes.readUInt32BE(20), size);
  }
  await page.evaluate(() => { const input = document.createElement('input'); input.id = 'verification-unsaved-draft'; input.value = 'draft survives a deferred update'; document.body.append(input); });
  workerVersion = 2;
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((registration) => registration.update()));
  await page.getByRole('complementary', { name: 'App update' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Update and reload' }).isDisabled(), true);
  assert.equal(await page.locator('#verification-unsaved-draft').inputValue(), 'draft survives a deferred update');
  for (const width of [320, 390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: resolve(output, 'update-' + width + '.png'), fullPage: true });
  }
  await page.getByRole('button', { name: 'Later' }).click();
  assert.equal(await page.getByRole('complementary', { name: 'App update' }).count(), 0);
  assert.equal(await page.locator('#verification-unsaved-draft').inputValue(), 'draft survives a deferred update');
  workerVersion = 3;
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((registration) => registration.update()));
  await page.getByRole('complementary', { name: 'App update' }).waitFor();
  const other = await context.newPage();
  await other.goto(base + '/install');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Update and reload' }).click();
  await page.getByRole('alert').filter({ hasText: 'Close all other tabs' }).waitFor();
  assert.equal(await page.locator('#verification-unsaved-draft').inputValue(), 'draft survives a deferred update');
  await other.close();
  await page.evaluate(async () => {
    const database = await new Promise((done, fail) => { const request = indexedDB.open('sense-site-offline-v1', 1); request.onsuccess = () => done(request.result); request.onerror = fail; });
    await new Promise((done, fail) => { const tx = database.transaction('commands', 'readwrite'); tx.objectStore('commands').put({ key: 'nas-test-pending', status: 'PENDING' }); tx.oncomplete = done; tx.onerror = fail; });
    database.close();
  });
  await page.getByRole('button', { name: 'Update and reload' }).click();
  await page.getByRole('alert').filter({ hasText: 'Synchronize or resolve' }).waitFor();
  assert.equal(await page.evaluate(() => navigator.serviceWorker.getRegistration().then((registration) => registration.waiting !== null)), true);
  await page.evaluate(async () => {
    const database = await new Promise((done, fail) => { const request = indexedDB.open('sense-site-offline-v1', 1); request.onsuccess = () => done(request.result); request.onerror = fail; });
    await new Promise((done, fail) => { const tx = database.transaction('commands', 'readwrite'); tx.objectStore('commands').delete('nas-test-pending'); tx.objectStore('commands').put({ key: 'nas-test-retained', status: 'SYNCED', payload: { retained: true } }); tx.oncomplete = done; tx.onerror = fail; });
    database.close();
  });
  await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Update and reload' }).click()]);
  await page.getByRole('heading', { name: 'Your work, on your phone' }).waitFor();
  assert.equal(await page.getByRole('complementary', { name: 'App update' }).count(), 0);
  assert.equal(await page.evaluate(async () => {
    const database = await new Promise((done, fail) => { const request = indexedDB.open('sense-site-offline-v1', 1); request.onsuccess = () => done(request.result); request.onerror = fail; });
    const value = await new Promise((done, fail) => { const request = database.transaction('commands').objectStore('commands').get('nas-test-retained'); request.onsuccess = () => done(request.result); request.onerror = fail; });
    database.close(); return value.payload.retained;
  }), true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { name: 'Your work, on your phone' }).waitFor();
  assert.equal(await page.evaluate(async () => {
    for (const key of await caches.keys()) for (const request of await (await caches.open(key)).keys()) if (new URL(request.url).pathname.startsWith('/api/')) return false;
    return true;
  }), true);
  await context.setOffline(false);
  assert.deepEqual(errors, []);
  const report = { status: 'PASS', widths: [320, 390, 1024, 1440], screenshots: 8, checks: ['platform help and icon dimensions', 'no automatic activation or reload', 'defer retains in-memory draft', 'another window blocks activation', 'pending site queue blocks activation', 'explicit activation preserves IndexedDB', 'offline help reload', 'no cached API responses'], boundary: 'Production build with local static server and synthetic queue entries; no real phones, passkey/domain/NAS/database/tunnel or site workflow acceptance.' };
  await writeFile(resolve(output, 'result.json'), JSON.stringify(report, null, 2));
  console.info(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}

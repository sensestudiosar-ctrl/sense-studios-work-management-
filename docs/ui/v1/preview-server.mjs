import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const files = new Map([['/', './mockups.html'], ['/mockups.html', './mockups.html'], ['/workflow-fixtures.html', './workflow-fixtures.html'], ['/review-canvas.html', './review-canvas.html']]);
const port = Number(process.argv[2] ?? '4178');
if (![4178, 4179, 4180].includes(port)) throw new Error('Only local design preview ports 4178/4179/4180 are supported');
const server = createServer(async (request, response) => {
  if (!files.has(request.url)) {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
    return;
  }
  try {
    const html = await readFile(new URL(files.get(request.url), import.meta.url));
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(html);
  } catch {
    response.writeHead(503, { 'Content-Type': 'text/plain' });
    response.end('Preview unavailable');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`UI design preview: http://127.0.0.1:${port}`));

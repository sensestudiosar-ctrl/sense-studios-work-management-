import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(resolve(root, 'apps/api/package.json'));
const sharp = require('sharp');
const source = await readFile(resolve(root, 'apps/web/public/icon.svg'));
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await sharp(source).resize(size, size).flatten({ background: '#182c29' }).png().toFile(resolve(root, 'apps/web/public', name));
  console.info(`Rendered ${name}: ${size} × ${size}`);
}

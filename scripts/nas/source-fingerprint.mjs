import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { repositoryRoot } from './config.mjs';

const files = [];
async function collect(path) {
  const info = await lstat(path);
  if (info.isSymbolicLink()) throw new Error('Source fingerprint refuses symbolic links');
  if (info.isDirectory()) {
    for (const name of (await readdir(path)).sort()) {
      if (['node_modules', 'dist', 'generated', '.artifacts'].includes(name) || name.startsWith('.env') || name.endsWith('.env') || name.includes('.bak')) continue;
      await collect(resolve(path, name));
    }
  } else if (info.isFile()) {
    const bytes = await readFile(path);
    files.push({ path: relative(repositoryRoot, path).replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
}
for (const path of ['apps/api/src', 'apps/api/prisma', 'apps/web/src', 'apps/web/public', 'packages/contracts/src', 'infra', 'scripts/nas', '.github/workflows', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', '.npmrc', '.dockerignore', 'eslint.config.mjs', 'tsconfig.base.json', 'apps/api/package.json', 'apps/api/prisma.config.ts', 'apps/api/tsconfig.json', 'apps/api/tsconfig.build.json', 'apps/web/package.json', 'apps/web/tsconfig.json', 'apps/web/index.html', 'apps/web/vite.config.ts', 'packages/contracts/package.json', 'packages/contracts/tsconfig.json']) await collect(resolve(repositoryRoot, path));
files.sort((a, b) => a.path.localeCompare(b.path));
console.info(JSON.stringify({ algorithm: 'SHA-256', fileCount: files.length, fingerprint: createHash('sha256').update(JSON.stringify(files)).digest('hex'), files }, null, 2));

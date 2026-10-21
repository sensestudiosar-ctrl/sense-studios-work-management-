import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/** Candidate evidence only; does not alter any historical acceptance policy. */
export function agent1Source(root) {
  const paths = [];
  const walk = dir => {
    for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
      if (['generated', 'dist', 'node_modules', '.git'].includes(entry.name)) continue;
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path); else if (entry.isFile()) paths.push(path);
    }
  };
  for (const dir of ['apps/api/src', 'apps/api/prisma', 'apps/web/src', 'packages', 'tests/e2e', 'scripts']) walk(dir);
  paths.push('package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'eslint.config.mjs', 'playwright.config.ts', 'apps/web/vite.config.ts');
  const files = paths.sort().map(path => ({ path, hash: createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex') }));
  const migrations = readdirSync(resolve(root, 'apps/api/prisma/migrations'), { withFileTypes: true }).filter(row => row.isDirectory()).map(row => ({
    name: row.name, checksum: createHash('sha256').update(readFileSync(resolve(root, 'apps/api/prisma/migrations', row.name, 'migration.sql'))).digest('hex')
  })).sort((a, b) => a.name.localeCompare(b.name));
  return { hash: createHash('sha256').update(JSON.stringify(files)).digest('hex'), files, migrations };
}

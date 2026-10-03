import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Usage: DATABASE_URL=<new local *_test on 56433> node ... before <source_test> [snapshot.json]
// Apply reviewed migrations to the clone, then run ... after [snapshot.json]. The source is read only.
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = require('pg');

function validatedTarget() {
  let url;
  try { url = new URL(process.env.DATABASE_URL ?? ''); }
  catch { throw new Error('DATABASE_URL must be a valid PostgreSQL URL'); }
  assert.match(url.protocol, /^postgres(?:ql)?:$/i, 'DATABASE_URL must use PostgreSQL');
  assert.match(url.hostname, /^(127\.0\.0\.1|localhost)$/i, 'Only localhost test databases are allowed');
  assert.equal(url.port, '56433', 'S18 preservation checks are restricted to the isolated PostgreSQL server on port 56433');
  const target = decodeURIComponent(url.pathname.slice(1));
  assert.match(target, /^[a-z0-9_]+_test$/, 'Destination database must end in _test');
  return { url, target };
}

const { url, target } = validatedTarget();
const mode = process.argv[2];
assert.ok(mode === 'before' || mode === 'after', 'Mode must be before or after');
const snapshotName = mode === 'before' ? process.argv[4] : process.argv[3];
assert.ok(snapshotName === undefined || /^[a-z0-9][a-z0-9._-]*\.json$/i.test(snapshotName), 'Snapshot path must be a simple JSON basename inside .env.s18-tools');
const snapshotPath = new URL(`../.env.s18-tools/${snapshotName ?? 's18-preservation.json'}`, import.meta.url);
const quote = value => `"${value.replaceAll('"', '""')}"`;

if (mode === 'before') {
  const source = process.argv[3];
  assert.match(source ?? '', /^[a-z0-9_]+_test$/, 'Source database must end in _test');
  assert.notEqual(source, target, 'Source and destination must be different databases');
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [target])).rowCount, 0, 'Destination must be new; never reset existing data');
    assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [source])).rowCount, 1, 'Approved source must exist');
    await admin.query(`CREATE DATABASE ${quote(target)} WITH TEMPLATE ${quote(source)}`);
  } finally { await admin.end(); }
}

const client = new Client({ connectionString: url.toString() });
await client.connect();
try {
  const digest = async (table, columns) => {
    const result = await client.query(`SELECT jsonb_build_array(${columns.map(quote).join(',')})::text AS row_text FROM public.${quote(table)} ORDER BY row_text`);
    const hash = createHash('sha256');
    for (const row of result.rows) hash.update(row.row_text).update('\n');
    return { rows: result.rowCount, sha256: hash.digest('hex') };
  };
  if (mode === 'before') {
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name<>'_prisma_migrations' ORDER BY table_name");
    const snapshot = { database: target, source: process.argv[3], tables: [] };
    for (const { table_name: table } of tables.rows) {
      const columns = (await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table])).rows.map(row => row.column_name);
      snapshot.tables.push({ table, columns, ...await digest(table, columns) });
    }
    const { mkdir } = await import('node:fs/promises');
    await mkdir(new URL('../.env.s18-tools/', import.meta.url), { recursive: true });
    await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
    console.log(`Captured ${snapshot.tables.length} table schemas and ${snapshot.tables.reduce((sum, table) => sum + table.rows, 0)} rows from an independent clone; source was not modified.`);
  } else {
    const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
    assert.equal(snapshot.database, target, 'Snapshot belongs to a different target database');
    for (const table of snapshot.tables) {
      const currentColumns = (await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table.table])).rows.map(row => row.column_name);
      assert.deepEqual(currentColumns.slice(0, table.columns.length), table.columns, `${table.table} original columns/order changed`);
      const current = await digest(table.table, table.columns);
      assert.equal(current.rows, table.rows, `${table.table} row count changed`);
      assert.equal(current.sha256, table.sha256, `${table.table} original-column content changed`);
    }
    const populated = snapshot.tables.filter(table => table.rows > 0);
    console.log(`PASS: all ${snapshot.tables.length} original table counts and ordered SHA-256 old-column digests preserved (${populated.length} populated tables, ${snapshot.tables.reduce((sum, table) => sum + table.rows, 0)} rows). Empty-table preservation proves shape/count only.`);
  }
} finally { await client.end(); }

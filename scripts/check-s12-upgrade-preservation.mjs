import { createRequire } from 'node:module';
import { writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Usage: DATABASE_URL=<new local *_test> node ... before <source_test>
// Then deploy reviewed migrations to DATABASE_URL and run ... after.
// Source is never modified; destination must not exist before cloning.
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = require('pg');
const url = new URL(process.env.DATABASE_URL ?? '');
assert.match(url.hostname, /^(127\.0\.0\.1|localhost)$/);
const target = decodeURIComponent(url.pathname.slice(1));
assert.match(target, /^[a-z0-9_]+_test$/);
const mode = process.argv[2];
assert.ok(mode === 'before' || mode === 'after');
const snapshotPath = new URL('../.env.s12-upgrade-preservation.json', import.meta.url);
const quote = value => `"${value.replaceAll('"', '""')}"`;
if (mode === 'before') {
  const source = process.argv[3];
  assert.match(source ?? '', /^[a-z0-9_]+_test$/);
  assert.notEqual(source, target);
  const adminUrl = new URL(url); adminUrl.pathname = '/postgres';
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
    const result = await client.query(`SELECT count(*)::int AS rows, md5(coalesce(string_agg(row_text,E'\\n' ORDER BY row_text),'')) AS digest FROM (SELECT jsonb_build_array(${columns.map(quote).join(',')})::text AS row_text FROM public.${quote(table)}) ordered_rows`);
    return result.rows[0];
  };
  if (mode === 'before') {
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name<>'_prisma_migrations' ORDER BY table_name");
    const snapshot = { database: target, source: process.argv[3], tables: [] };
    for (const { table_name: table } of tables.rows) {
      const columns = (await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table])).rows.map(row => row.column_name);
      snapshot.tables.push({ table, columns, ...await digest(table, columns) });
    }
    await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
    console.log(`Captured ${snapshot.tables.length} existing tables and ${snapshot.tables.reduce((sum, table) => sum + table.rows, 0)} rows from an independent clone; no source data changed.`);
  } else {
    const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
    assert.equal(snapshot.database, target);
    for (const table of snapshot.tables) {
      const current = await digest(table.table, table.columns);
      assert.equal(current.rows, table.rows, `${table.table} row count changed`);
      assert.equal(current.digest, table.digest, `${table.table} old-column content changed`);
    }
    const populated = snapshot.tables.filter(table => table.rows > 0);
    console.log(`PASS: all ${snapshot.tables.length} original table counts and ordered old-column digests preserved (${populated.length} populated tables, ${snapshot.tables.reduce((sum, table) => sum + table.rows, 0)} rows). Empty-table preservation proves shape/count only.`);
    console.log(populated.map(table => `${table.table}:${table.rows}`).join(', '));
  }
} finally { await client.end(); }

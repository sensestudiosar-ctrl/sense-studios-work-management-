import assert from 'node:assert/strict';
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
export const runSuffix = '1791849600000_ac13';
export const migrationCount = 118;
export const tip = '20261008020000_task_subtasks';
export const clusters = Object.freeze({
  main: { port: 58440, directory: '.env.s27-tools/pg18-main-58440', systemId: '7694339791027375604' },
  s14: { port: 58441, directory: '.env.s27-tools/pg18-s14-58441', systemId: '7694339834376938732' },
  source: { port: 57433, directory: 'C:/Users/HI/AppData/Local/Temp/sense-s14-verify-pg18-20261001-15a34bc7', systemId: '7691544104696726764' },
  auth: { port: 45434, directory: '.env.checkpoint-tools/pg-demo-20261006-a7c9', systemId: '7693570241708228348' }
});
export const suiteKeys = ['DATABASE_URL', ...Array.from({length:16}, (_, i) => `S${i+12}_DATABASE_URL`), ...[24,25,26,27].map(i => `S${i}_SECURITY_DATABASE_URL`)];
export const inventory = Object.freeze([...suiteKeys.map(key => ({ key, name: key === 'DATABASE_URL' ? `sense_s27_main_s27_${runSuffix}_test` : `sense_s${/^S(\d+)/.exec(key)[1]}${key.includes('_SECURITY_') ? '_security' : ''}_s27_${runSuffix}_test`, cluster: key === 'S14_DATABASE_URL' ? 's14' : 'main' })),
  {key:'POPULATED',name:`sense_s27_s26_populated_${runSuffix}_test`,cluster:'source'},
  {key:'AUTHENTICATED',name:'sense_app_completion_20261013_ac13_test',cluster:'auth'}]);
export function validateInventory(value) { assert.deepEqual(value, inventory, 'Exact reviewed inventory required'); assert.equal(new Set(value.map(row => row.name)).size,23); }
export function validateIdentity(cluster, value) { const expected=clusters[cluster]; assert.ok(expected); assert.equal(value.address,'127.0.0.1'); assert.equal(Number(value.port),expected.port); assert.equal(String(value.systemId),expected.systemId); assert.equal(resolve(value.directory).toLowerCase(),resolve(expected.directory).toLowerCase()); assert.equal(realpathSync(resolve(value.directory)).toLowerCase(),realpathSync(resolve(expected.directory)).toLowerCase()); }
export function validateOwnedTarget(value, cluster, catalog) {
  const expected=inventory.find(row => row.key===value.key); assert.ok(expected,'Unapproved target key'); assert.equal(expected.cluster,cluster); assert.equal(value.name,expected.name);
  assert.ok(/^\d+$/.test(String(value.oid))); assert.ok(typeof value.owner==='string'&&value.owner.length); assert.ok(/^[a-f0-9]{64}$/.test(value.marker));
  const current=catalog.find(row=>row.name===expected.name); assert.deepEqual(current,{name:expected.name,oid:String(value.oid),owner:value.owner,marker:value.marker},'Catalog/OID/owner/marker mismatch');
}
export function assertContained(path, root) { const actual=realpathSync(path),base=realpathSync(root),inside=relative(base,actual); assert.ok(inside&&!inside.startsWith('..')&&!isAbsolute(inside),'Path must be contained'); return actual; }
export function sourceFingerprint(root=process.cwd()) {
  const hash=createHash('sha256');
  const files=[]; const walk=dir=>{for(const entry of readdirSync(resolve(root,dir),{withFileTypes:true})){if(['node_modules','generated','dist','.git'].includes(entry.name))continue;const path=`${dir}/${entry.name}`;if(entry.isDirectory())walk(path);else if(entry.isFile())files.push(path);}};
  for(const path of ['apps/api/src','apps/api/prisma','apps/web/src','packages','tests/e2e','scripts'])walk(path);
  for(const path of ['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','eslint.config.mjs','playwright.config.ts'])files.push(path);
  for(const path of files.sort())hash.update(path).update('\0').update(readFileSync(resolve(root,path))).update('\0');
  const migrations=readdirSync(resolve(root,'apps/api/prisma/migrations'),{withFileTypes:true}).filter(row=>row.isDirectory()).map(row=>row.name).sort();
  assert.equal(migrations.length,migrationCount);assert.equal(migrations.at(-1),tip);
  return {hash:hash.digest('hex'),files:files.length,migrations};
}
export function authAdapterFingerprint(root=process.cwd()) {
  const base=resolve(root,'.env.checkpoint-tools/app-completion-acceptance');
  const entries=readdirSync(base).filter(name=>/\.(mjs|ps1|ts)$/.test(name)).sort();
  const operators = ['scripts/acceptance/app-completion-auth.mjs', 'scripts/acceptance/app-completion-authorization.mjs', 'scripts/acceptance/app-completion-policy.mjs'];
  const files = [...entries.map(name => `.env.checkpoint-tools/app-completion-acceptance/${name}`), ...operators].sort();
  return createHash('sha256').update(files.map(name=>`${name}:${createHash('sha256').update(readFileSync(resolve(root,name))).digest('hex')}`).join('\n')).digest('hex');
}

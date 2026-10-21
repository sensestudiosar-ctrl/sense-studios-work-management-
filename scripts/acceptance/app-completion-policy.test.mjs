import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inventory, validateInventory, validateIdentity, validateOwnedTarget, clusters, authAdapterFingerprint } from './app-completion-policy.mjs';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, sep } from 'node:path';
test('exact fixed inventory and suite endpoint mapping',()=>{validateInventory(inventory);assert.equal(inventory.filter(row=>row.cluster==='main').length,20);assert.equal(inventory.filter(row=>row.cluster==='s14').length,1);assert.throws(()=>validateInventory([...inventory,{name:'arbitrary_test'}]));assert.throws(()=>validateInventory(inventory.slice(1)));});
test('identity refuses wrong port, source directory and system identity',()=>{for(const [key,c]of Object.entries(clusters)){const value={address:'127.0.0.1',port:c.port,directory:c.directory,systemId:c.systemId};validateIdentity(key,value);for(const change of [{address:'0.0.0.0'},{port:c.port+1},{directory:'C:/Program Files/PostgreSQL/18/data'},{systemId:'0'}])assert.throws(()=>validateIdentity(key,{...value,...change}));}});
test('cleanup target requires exact key/name/OID/owner/marker',()=>{const expected=inventory[0],value={...expected,oid:'12345',owner:'sense_demo',marker:'a'.repeat(64)},catalog=[{name:expected.name,oid:'12345',owner:'sense_demo',marker:value.marker}];validateOwnedTarget(value,'main',catalog);for(const change of [{name:'postgres'},{oid:'2'},{owner:'other'},{marker:'b'.repeat(64)},{key:'SOURCE_DATABASE_URL'}])assert.throws(()=>validateOwnedTarget({...value,...change},'main',catalog));assert.throws(()=>validateOwnedTarget(value,'source',catalog));});
test('adapter fingerprint binds private and tracked execution guards', () => {
  const tempRoot = realpathSync(tmpdir());
  const fixture = mkdtempSync(resolve(tempRoot, 'sense-acceptance-hash-'));
  assert.ok(realpathSync(fixture).startsWith(`${tempRoot}${sep}`));
  const files = ['.env.checkpoint-tools/app-completion-acceptance/setup.mjs', 'scripts/acceptance/app-completion-auth.mjs', 'scripts/acceptance/app-completion-authorization.mjs', 'scripts/acceptance/app-completion-policy.mjs'];
  try {
    mkdirSync(resolve(fixture, '.env.checkpoint-tools/app-completion-acceptance'), { recursive: true });
    mkdirSync(resolve(fixture, 'scripts/acceptance'), { recursive: true });
    for (const file of files) writeFileSync(resolve(fixture, file), 'original guard');
    const original = authAdapterFingerprint(fixture);
    for (const file of files) {
      writeFileSync(resolve(fixture, file), 'modified guard');
      assert.notEqual(authAdapterFingerprint(fixture), original, file);
      writeFileSync(resolve(fixture, file), 'original guard');
    }
    assert.equal(authAdapterFingerprint(fixture), original);
  } finally {
    assert.ok(realpathSync(fixture).startsWith(`${tempRoot}${sep}`));
    rmSync(fixture, { recursive: true });
  }
});

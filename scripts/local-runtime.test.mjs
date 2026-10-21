import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { loadConfig, verifyProcesses, repositoryRoot } from './local-runtime.mjs';

function fixture() {
  const config = loadConfig();
  const actual = {
    api: { ProcessId: 100, CreationDate: 'original', ExecutablePath: 'node', CommandLine: 'api' },
    web: { ProcessId: 101, CreationDate: 'original', ExecutablePath: 'node', CommandLine: 'web' }
  };
  const manifest = { state: 'READY', database: config.database.name, url: config.webOrigin + '/', nas: resolve(repositoryRoot, config.nasRoot), processes: {
    api: { pid: 100, identity: structuredClone(actual.api) }, web: { pid: 101, identity: structuredClone(actual.web) }
  } };
  const listeners = [{ LocalAddress: '127.0.0.1', LocalPort: config.apiPort, OwningProcess: 100 }, { LocalAddress: '127.0.0.1', LocalPort: config.webPort, OwningProcess: 101 }];
  return { config, manifest, actual, listeners };
}
test('canonical configuration binds saved operational database and separate loopback ports', () => {
  const config = loadConfig();
  assert.equal(config.database.oid, '145606');
  assert.equal(config.database.migrations, 119);
  assert.notEqual(config.apiPort, config.webPort);
});
test('rejects reused PID with different creation identity', () => {
  const f = fixture(); f.actual.api.CreationDate = 'reused';
  assert.throws(() => verifyProcesses(f.config, f.manifest, f.actual, f.listeners), /identity changed/);
});
test('rejects unrelated listener ownership', () => {
  const f = fixture(); f.listeners[0].OwningProcess = 999;
  assert.throws(() => verifyProcesses(f.config, f.manifest, f.actual, f.listeners), /owner changed/);
});
test('rejects public interface and duplicate listener', () => {
  const f = fixture(); f.listeners[0].LocalAddress = '0.0.0.0';
  assert.throws(() => verifyProcesses(f.config, f.manifest, f.actual, f.listeners));
  const g = fixture(); g.listeners.push({ ...g.listeners[0] });
  assert.throws(() => verifyProcesses(g.config, g.manifest, g.actual, g.listeners), /exactly two/);
});
test('rejects a manifest pointing at a different database', () => {
  const f = fixture(); f.manifest.database = 'historical';
  assert.throws(() => verifyProcesses(f.config, f.manifest, f.actual, f.listeners));
});

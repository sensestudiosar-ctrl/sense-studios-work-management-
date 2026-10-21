import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectWindows, ownsListeners, sameIdentity } from './windows.mjs';

const timeout = () => Object.assign(new Error('spawnSync powershell.exe ETIMEDOUT'), {
  code: 'ETIMEDOUT', syscall: 'spawnSync powershell.exe'
});

test('read-only inspection retries one OS timeout and uses only the fresh result', () => {
  let calls = 0;
  const result = inspectWindows('read process', code => {
    assert.equal(code, 'read process');
    if (++calls === 1) throw timeout();
    return '{"ProcessId":42,"Created":"new"}';
  });
  assert.equal(calls, 2);
  assert.equal(sameIdentity(JSON.parse(result), { ProcessId: 42, Created: 'old' }), false);
  assert.throws(() => ownsListeners([{ LocalPort: 59443, LocalAddress: '127.0.0.1', OwningProcess: 42 }], [[59443, 7]]), /different process/);
});

test('inspection fails closed after the second timeout', () => {
  let calls = 0;
  const first = timeout(), second = timeout();
  assert.throws(() => inspectWindows('read', () => { throw ++calls === 1 ? first : second; }), error => error === second);
  assert.equal(calls, 2);
});

test('inspection never retries permission, command, or other timeout errors', () => {
  for (const error of [new Error('Access denied'), Object.assign(timeout(), { code: 'EPERM' }), Object.assign(timeout(), { syscall: 'another command' })]) {
    let calls = 0;
    assert.throws(() => inspectWindows('read', () => { calls++; throw error; }), thrown => thrown === error);
    assert.equal(calls, 1);
  }
});

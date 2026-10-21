import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAuthAuthorization } from './app-completion-authorization.mjs';

const approval = { ownerApproved: true, scope: 'auth-target-setup-tasks-cleanup', databaseName: 'sense_app_completion_20261013_ac13_test', clusterSystemId: '7693570241708228348', noClusterLifecycle: true, authorizationText: 'Synthetic approval fixture only; never written to the execution record.', approvedAt: '2026-10-13T12:00:00Z', sourceHash: 'a'.repeat(64), adapterHash: 'b'.repeat(64) };
const current = { sourceHash: approval.sourceHash, adapterHash: approval.adapterHash };
const manifest = { ...current, databaseName: approval.databaseName, createdDatabase: true, serverIdentity: { system_identifier: approval.clusterSystemId }, state: 'ready' };

test('approved exact scope permits setup and ready-run task checks', () => {
  validateAuthAuthorization(approval, 'setup', current);
  validateAuthAuthorization(approval, 'tasks', current, manifest);
});
for (const [field, value] of Object.entries({ ownerApproved: false, scope: 'full-suite', databaseName: 'postgres', clusterSystemId: '0', noClusterLifecycle: false, authorizationText: '', approvedAt: 'invalid', sourceHash: '0', adapterHash: 'c'.repeat(64) })) {
  test(`rejects invalid approval ${field} before execution`, () => assert.throws(() => validateAuthAuthorization({ ...approval, [field]: value }, 'setup', current)));
}
test('source drift stops setup and task checks, but permits exact-run cleanup', () => {
  const changed = { ...current, sourceHash: 'c'.repeat(64) };
  assert.throws(() => validateAuthAuthorization(approval, 'setup', changed));
  assert.throws(() => validateAuthAuthorization(approval, 'tasks', changed, manifest));
  validateAuthAuthorization(approval, 'cleanup', changed, manifest);
});
test('operator drift stops every stage including cleanup', () => {
  for (const stage of ['setup', 'tasks', 'cleanup']) assert.throws(() => validateAuthAuthorization(approval, stage, { ...current, adapterHash: 'c'.repeat(64) }, manifest));
});
test('wrong run identity or unfinished setup cannot enter task checks', () => {
  for (const change of [{ sourceHash: 'c'.repeat(64) }, { adapterHash: 'c'.repeat(64) }, { databaseName: 'postgres' }, { createdDatabase: false }, { serverIdentity: { system_identifier: '0' } }, { state: 'migration-failed' }]) assert.throws(() => validateAuthAuthorization(approval, 'tasks', current, { ...manifest, ...change }));
});
test('cleanup accepts a partially completed owned run but rejects unrelated manifests', () => {
  validateAuthAuthorization(approval, 'cleanup', current, { ...manifest, state: 'migration-failed' });
  assert.throws(() => validateAuthAuthorization(approval, 'cleanup', current, { ...manifest, createdDatabase: false }));
  assert.throws(() => validateAuthAuthorization(approval, 'cleanup', current));
});
test('unknown stage is rejected', () => assert.throws(() => validateAuthAuthorization(approval, 'browser', current, manifest)));

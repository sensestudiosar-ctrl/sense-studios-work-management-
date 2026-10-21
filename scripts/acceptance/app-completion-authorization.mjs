import assert from 'node:assert/strict';

// Pure validation only: this module never opens a database or launches a process.
export function validateAuthAuthorization(approval, stage, current, manifest) {
  assert.ok(['setup', 'tasks', 'cleanup'].includes(stage), 'Unknown acceptance stage');
  assert.equal(approval?.ownerApproved, true, 'Explicit Owner approval is required');
  assert.equal(approval.scope, 'auth-target-setup-tasks-cleanup', 'Wrong approval scope');
  assert.equal(approval.databaseName, 'sense_app_completion_20261013_ac13_test');
  assert.equal(approval.clusterSystemId, '7693570241708228348');
  assert.equal(approval.noClusterLifecycle, true);
  assert.ok(typeof approval.authorizationText === 'string' && approval.authorizationText.trim().length > 0, 'Record the actual Owner authorization');
  assert.ok(typeof approval.approvedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(approval.approvedAt) && Number.isFinite(Date.parse(approval.approvedAt)), 'Record the approval time');
  for (const key of ['sourceHash', 'adapterHash']) assert.match(approval[key] ?? '', /^[a-f0-9]{64}$/, 'Missing reviewed fingerprint');
  assert.equal(approval.adapterHash, current.adapterHash, 'Acceptance operator changed since approval');
  if (stage !== 'cleanup') assert.equal(approval.sourceHash, current.sourceHash, 'Source changed since approval');
  if (stage !== 'setup') {
    assert.equal(manifest?.sourceHash, approval.sourceHash, 'Run is outside the approved source');
    assert.equal(manifest?.adapterHash, approval.adapterHash, 'Run is outside the approved operators');
    assert.equal(manifest?.databaseName, approval.databaseName);
    assert.equal(manifest?.createdDatabase, true);
    assert.equal(manifest?.serverIdentity?.system_identifier, approval.clusterSystemId);
    if (stage === 'tasks') assert.equal(manifest?.state, 'ready', 'Setup must complete before task persistence tests');
  }
}

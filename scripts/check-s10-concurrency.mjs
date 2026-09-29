import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

// Run after the current API build and migrations against a NEW dedicated local
// _test database. This script never clears data; it preserves its race evidence.
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
require('reflect-metadata');
const { DatabaseService } = await import('../apps/api/dist/database.service.js');
const { AuthorizationService } = await import('../apps/api/dist/authorization.service.js');
const { TaskService } = await import('../apps/api/dist/task.service.js');
const url = new URL(process.env.DATABASE_URL ?? '');
assert.match(url.hostname, /^(127\.0\.0\.1|localhost)$/);
assert.match(url.pathname, /_test$/);
const database = new DatabaseService({ databaseUrl: url.toString(), nodeEnv: 'test', webOrigin: 'http://localhost:5173' });

function assertSingleWinner(results) {
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1, 'Exactly one command must commit');
  assert.equal(results.filter(result => result.status === 'rejected' && result.reason.status === 409).length, 1, 'The stale competing command must return a conflict');
}

try {
  const db = database.prisma;
  const actual = await db.$queryRaw`SELECT current_database() AS name`;
  assert.match(actual[0]?.name ?? '', /_test$/);
  assert.equal(await db.organization.count(), 0, 'Requires an empty dedicated database; no records are cleared');
  assert.equal(await db.account.count(), 0, 'Requires an empty dedicated database; no records are cleared');
  const organization = await db.organization.create({ data: { name: 'S10A waiting concurrency acceptance' } });
  const branch = await db.branch.create({ data: { organizationId: organization.id, name: 'Waiting race branch' } });
  const team = await db.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: 'Waiting race team' } });
  const account = await db.account.create({ data: { normalizedEmail: `s10-race-${randomUUID()}@example.test`, kind: 'STAFF', state: 'ACTIVE' } });
  await db.employee.create({ data: { organizationId: organization.id, accountId: account.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date('2026-01-01') } });
  const actor = { accountId: account.id, organizationId: organization.id, kind: 'STAFF' };
  const tasks = new TaskService(database, new AuthorizationService(database));
  const task = await tasks.create(actor, { title: 'Concurrent ordinary waiting', type: 'NON_PROJECT', priority: 'HIGH', targetDate: '2026-12-31', reason: 'S10 race fixture' });
  await tasks.transition(actor, task.id, { toState: 'IN_PROGRESS', expectedVersion: 1, reason: 'Start before concurrent waiting' });

  const waits = await Promise.allSettled([
    tasks.wait(actor, task.id, { expectedVersion: 2, reason: 'Concurrent waiting A', delayCause: 'Client pending', responsibleParty: 'Primary client' }),
    tasks.wait(actor, task.id, { expectedVersion: 2, reason: 'Concurrent waiting B', delayCause: 'Consultant pending', responsibleParty: 'Consultant' })
  ]);
  assertSingleWinner(waits);
  const waiting = await db.task.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(waiting.status, 'WAITING');
  assert.equal(waiting.version, 3);
  assert.equal(waiting.requiresReassignment, false);
  assert.equal(waiting.waitingPreviousStatus, 'IN_PROGRESS');
  const waitHistory = await db.taskStatusChange.findMany({ where: { taskId: task.id, toStatus: 'WAITING' } });
  assert.equal(waitHistory.length, 1);
  assert.equal(waitHistory[0].delayCause, waiting.waitingDelayCause);
  assert.equal(waitHistory[0].responsibleParty, waiting.waitingResponsibleParty);
  assert.equal(waitHistory[0].reason, waiting.waitingReason);
  assert.equal(await db.auditEvent.count({ where: { subjectId: task.id, eventKey: 'task.waiting' } }), 1);
  assert.equal(await db.domainEvent.count({ where: { subjectId: task.id, eventName: 'task.waiting' } }), 1);
  assert.equal(await db.outboxDelivery.count({ where: { event: { subjectId: task.id, eventName: 'task.waiting' } } }), 1);

  const resumes = await Promise.allSettled([
    tasks.resume(actor, task.id, { expectedVersion: 3, reason: 'Concurrent resume A' }),
    tasks.resume(actor, task.id, { expectedVersion: 3, reason: 'Concurrent resume B' })
  ]);
  assertSingleWinner(resumes);
  const resumed = await db.task.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(resumed.status, 'IN_PROGRESS');
  assert.equal(resumed.version, 4);
  assert.equal(resumed.waitingPreviousStatus, null);
  assert.equal(resumed.waitingReason, null);
  assert.equal(resumed.waitingDelayCause, null);
  assert.equal(resumed.waitingResponsibleParty, null);
  const resumeHistory = await db.taskStatusChange.findMany({ where: { taskId: task.id, fromStatus: 'WAITING', toStatus: 'IN_PROGRESS' } });
  assert.equal(resumeHistory.length, 1);
  assert.equal(resumeHistory[0].previousStatus, 'IN_PROGRESS');
  assert.equal(resumeHistory[0].delayCause, waitHistory[0].delayCause);
  assert.equal(resumeHistory[0].responsibleParty, waitHistory[0].responsibleParty);
  assert.equal(await db.taskStatusChange.count({ where: { taskId: task.id } }), 4);
  assert.equal(await db.auditEvent.count({ where: { subjectId: task.id } }), 4);
  assert.equal(await db.domainEvent.count({ where: { subjectId: task.id } }), 4);
  assert.equal(await db.outboxDelivery.count({ where: { event: { subjectId: task.id } } }), 4);
  console.log('PASS: real concurrent wait and resume each commit once, stale commands conflict, cause/party history survives, and audit/event/outbox evidence is exact');
} finally {
  await database.onModuleDestroy();
}

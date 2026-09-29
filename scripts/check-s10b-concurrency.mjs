import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

// Run after the API build and all migrations on a new, empty local _test DB.
// Fixtures are retained as race evidence; this script never clears data.
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
require('reflect-metadata');
const { DatabaseService } = await import('../apps/api/dist/database.service.js');
const { AuthorizationService } = await import('../apps/api/dist/authorization.service.js');
const { TaskService } = await import('../apps/api/dist/task.service.js');
const url = new URL(process.env.DATABASE_URL ?? '');
assert.match(url.hostname, /^(127\.0\.0\.1|localhost)$/);
assert.match(url.pathname, /_test$/);
const database = new DatabaseService({ databaseUrl: url.toString(), nodeEnv: 'test', webOrigin: 'http://localhost:5173' });

try {
  const db = database.prisma;
  assert.equal(await db.organization.count(), 0, 'Requires an empty dedicated database');
  assert.equal(await db.account.count(), 0, 'Requires an empty dedicated database');
  const organization = await db.organization.create({ data: { name: 'S10B date concurrency acceptance' } });
  const branch = await db.branch.create({ data: { organizationId: organization.id, name: 'Deadline race branch' } });
  const team = await db.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: 'Deadline race team' } });
  const owner = await db.account.create({ data: { normalizedEmail: `s10b-owner-${randomUUID()}@example.test`, kind: 'OWNER', state: 'ACTIVE' } });
  const staff = await db.account.create({ data: { normalizedEmail: `s10b-staff-${randomUUID()}@example.test`, kind: 'STAFF', state: 'ACTIVE' } });
  const employee = await db.employee.create({ data: { organizationId: organization.id, accountId: staff.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date('2026-01-01') } });
  const actor = { accountId: owner.id, organizationId: organization.id, kind: 'OWNER' };
  const tasks = new TaskService(database, new AuthorizationService(database));
  const task = await tasks.create(actor, { title: 'Concurrent committed date', type: 'NON_PROJECT', priority: 'HIGH', targetDate: '2026-12-31', ownerEmployeeId: employee.id, reason: 'S10B race fixture' });

  const results = await Promise.allSettled([
    tasks.changeCommittedDate(actor, task.id, { expectedVersion: 1, committedDueDate: '2026-11-01', reason: 'Client promise A' }),
    tasks.changeCommittedDate(actor, task.id, { expectedVersion: 1, committedDueDate: '2026-11-02', reason: 'Client promise B' })
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1, 'Exactly one command must commit');
  assert.equal(results.filter(result => result.status === 'rejected' && result.reason.status === 409).length, 1, 'Competing stale command must conflict');
  const updated = await db.task.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(updated.version, 2);
  assert.equal(updated.targetDate.toISOString().slice(0, 10), '2026-12-31');
  const history = await db.taskCommittedDateChange.findMany({ where: { taskId: task.id } });
  assert.equal(history.length, 1);
  assert.equal(history[0].taskVersion, 2);
  assert.equal(history[0].oldDate, null);
  assert.equal(history[0].newDate.toISOString(), updated.committedDueDate?.toISOString());
  assert.equal(await db.auditEvent.count({ where: { subjectId: task.id, eventKey: 'task.deadline_changed' } }), 1);
  assert.equal(await db.domainEvent.count({ where: { subjectId: task.id, eventName: 'task.deadline_changed' } }), 1);
  assert.equal(await db.outboxDelivery.count({ where: { event: { subjectId: task.id, eventName: 'task.deadline_changed' } } }), 1);
  console.log('PASS: simultaneous committed-date commands produced one commit, one conflict and exact immutable/audit/event/outbox evidence');
} finally {
  await database.onModuleDestroy();
}

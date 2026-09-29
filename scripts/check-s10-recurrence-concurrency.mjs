import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

// New local _test database only. This script retains all race fixtures.
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
require('reflect-metadata');
const { DatabaseService } = await import('../apps/api/dist/database.service.js');
const { AuthorizationService } = await import('../apps/api/dist/authorization.service.js');
const { TaskService } = await import('../apps/api/dist/task.service.js');
const { TaskRecurrenceService } = await import('../apps/api/dist/task-recurrence.service.js');
const url = new URL(process.env.DATABASE_URL ?? '');
assert.match(url.hostname, /^(127\.0\.0\.1|localhost)$/);
assert.match(url.pathname, /_test$/);
const database = new DatabaseService({ databaseUrl: url.toString(), nodeEnv: 'test', webOrigin: 'http://localhost:5173' });
try {
  const db = database.prisma;
  assert.equal(await db.organization.count(), 0, 'Requires an empty dedicated database');
  assert.equal(await db.account.count(), 0, 'Requires an empty dedicated database');
  const organization = await db.organization.create({ data: { name: 'S10 recurrence concurrency acceptance' } });
  const branch = await db.branch.create({ data: { organizationId: organization.id, name: 'Recurrence race branch' } });
  const team = await db.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: 'Recurrence race team' } });
  const owner = await db.account.create({ data: { normalizedEmail: `recurrence-owner-${randomUUID()}@example.test`, kind: 'OWNER', state: 'ACTIVE' } });
  const staff = await db.account.create({ data: { normalizedEmail: `recurrence-staff-${randomUUID()}@example.test`, kind: 'STAFF', state: 'ACTIVE' } });
  const employee = await db.employee.create({ data: { organizationId: organization.id, accountId: staff.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date('2026-01-01') } });
  const actor = { accountId: owner.id, organizationId: organization.id, kind: 'OWNER' };
  const tasks = new TaskService(database, new AuthorizationService(database));
  const recurrence = new TaskRecurrenceService(database, tasks);
  const source = await tasks.create(actor, { title: 'Recurring task race', type: 'RECURRING', priority: 'HIGH', targetDate: '2026-10-01', ownerEmployeeId: employee.id, reason: 'Recurrence race fixture' });
  const configure = { expectedTaskVersion: 1, expectedVersion: 0, frequency: 'DAILY', firstOccurrenceDate: '2026-10-01', reason: 'Daily recurring race schedule' };
  const configResults = await Promise.allSettled([recurrence.configure(actor, source.id, configure, new Date('2026-09-29')), recurrence.configure(actor, source.id, configure, new Date('2026-09-29'))]);
  assert.equal(configResults.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(configResults.filter(result => result.status === 'rejected' && result.reason.status === 409).length, 1);
  const generated = await Promise.all([recurrence.runBatch(new Date('2026-10-01')), recurrence.runBatch(new Date('2026-10-01'))]);
  assert.equal(generated.reduce((sum, value) => sum + value, 0), 1, 'Two workers must create only one occurrence');
  const rule = await db.taskRecurrenceRule.findUniqueOrThrow({ where: { sourceTaskId: source.id } });
  assert.equal(await db.taskRecurrenceOccurrence.count({ where: { ruleId: rule.id } }), 1);
  assert.equal(await db.task.count(), 2);
  for (const [eventKey, count] of [['task.recurrence_configured', 1], ['task.recurrence_generated', 1]]) {
    assert.equal(await db.auditEvent.count({ where: { subjectId: rule.id, eventKey } }), count);
    assert.equal(await db.domainEvent.count({ where: { subjectId: rule.id, eventName: eventKey } }), count);
    assert.equal(await db.outboxDelivery.count({ where: { event: { subjectId: rule.id, eventName: eventKey } } }), count);
  }
  assert.equal(await recurrence.runBatch(new Date('2026-10-01')), 0);
  console.log('PASS: simultaneous configuration gives one commit/one conflict; two workers generate one task/occurrence with exact audit/event/outbox counts; retry is idempotent');
} finally { await database.onModuleDestroy(); }

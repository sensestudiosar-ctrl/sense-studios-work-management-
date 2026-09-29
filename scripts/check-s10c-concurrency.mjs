import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

// Run after the API build and migrations on a new, empty local _test DB.
// The committed fixture is retained as race evidence.
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
require('reflect-metadata');
const { DatabaseService } = await import('../apps/api/dist/database.service.js');
const { AuthorizationService } = await import('../apps/api/dist/authorization.service.js');
const { TaskService } = await import('../apps/api/dist/task.service.js');
const { ProjectService } = await import('../apps/api/dist/project.service.js');
const { ProjectWorkflowService } = await import('../apps/api/dist/project-workflow.service.js');
const { ApprovalService } = await import('../apps/api/dist/approval.service.js');
const url = new URL(process.env.DATABASE_URL ?? '');
assert.match(url.hostname, /^(127\.0\.0\.1|localhost)$/);
assert.match(url.pathname, /_test$/);
const database = new DatabaseService({ databaseUrl: url.toString(), nodeEnv: 'test', webOrigin: 'http://localhost:5173' });

try {
  const db = database.prisma;
  assert.equal(await db.organization.count(), 0, 'Requires an empty dedicated database');
  assert.equal(await db.account.count(), 0, 'Requires an empty dedicated database');
  const organization = await db.organization.create({ data: { name: 'S10C graph race acceptance' } });
  const branch = await db.branch.create({ data: { organizationId: organization.id, name: 'Graph race branch' } });
  const team = await db.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: 'Graph race team' } });
  const owner = await db.account.create({ data: { normalizedEmail: `s10c-owner-${randomUUID()}@example.test`, kind: 'OWNER', state: 'ACTIVE' } });
  const staff = await db.account.create({ data: { normalizedEmail: `s10c-staff-${randomUUID()}@example.test`, kind: 'STAFF', state: 'ACTIVE' } });
  const employee = await db.employee.create({ data: { organizationId: organization.id, accountId: staff.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date('2026-01-01') } });
  for (const permissionKey of ['project.view', 'project.manage']) await db.employeePermissionOverride.create({ data: { organizationId: organization.id, employeeId: employee.id, permissionKey, effect: 'ALLOW', scopeKind: 'BRANCH', branchId: branch.id, reason: 'S10C project lead fixture' } });
  const actor = { accountId: owner.id, organizationId: organization.id, kind: 'OWNER' };
  const authorization = new AuthorizationService(database);
  const workflow = new ProjectWorkflowService(database, authorization, new ApprovalService(database));
  const tasks = new TaskService(database, authorization);
  const { project } = await new ProjectService(database).create(actor, { branchId: branch.id, title: 'Concurrent dependency project', deliveryType: 'DESIGN', scopes: ['Delivery'], reason: 'Create graph race project' });
  await workflow.assignment(actor, project.id, { employeeId: employee.id, expectedVersion: 1, reason: 'Assign graph owner' });
  await workflow.lead(actor, project.id, { employeeId: employee.id, expectedVersion: 2, reason: 'Appoint graph lead' });
  await workflow.status(actor, project.id, { toStatus: 'ACTIVE', expectedVersion: 3, reason: 'Activate graph work' });
  const createTask = (title) => tasks.create(actor, { title, type: 'PROJECT', projectId: project.id, priority: 'HIGH', targetDate: '2026-12-31', ownerEmployeeId: employee.id, reason: 'S10C race fixture' });
  const [a, b] = await Promise.all([createTask('Graph task A'), createTask('Graph task B')]);

  const results = await Promise.allSettled([
    tasks.addDependency(actor, a.id, { predecessorTaskId: b.id, expectedVersion: 1, reason: 'Opposite graph edge A' }),
    tasks.addDependency(actor, b.id, { predecessorTaskId: a.id, expectedVersion: 1, reason: 'Opposite graph edge B' })
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1, 'Exactly one opposing edge must commit');
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1, 'One opposing edge must be rejected');
  const edges = await db.taskDependency.findMany({ where: { removedAt: null, dependentTaskId: { in: [a.id, b.id] } } });
  assert.equal(edges.length, 1);
  assert.notEqual(edges[0].dependentTaskId, edges[0].predecessorTaskId);
  assert.equal(await db.auditEvent.count({ where: { eventKey: 'task.updated', subjectId: edges[0].dependentTaskId } }), 1);
  assert.equal(await db.domainEvent.count({ where: { eventName: 'task.updated', subjectId: edges[0].dependentTaskId } }), 1);
  assert.equal(await db.outboxDelivery.count({ where: { event: { eventName: 'task.updated', subjectId: edges[0].dependentTaskId } } }), 1);
  console.log('PASS: concurrent opposing dependency links produced one edge, one cycle denial and exact audit/event/outbox evidence');
} finally {
  await database.onModuleDestroy();
}

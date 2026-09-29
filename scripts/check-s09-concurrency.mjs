import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
require('reflect-metadata');
const { DatabaseService } = await import('../apps/api/dist/database.service.js');
const { AuthorizationService } = await import('../apps/api/dist/authorization.service.js');
const { ProjectService } = await import('../apps/api/dist/project.service.js');
const { TaskService } = await import('../apps/api/dist/task.service.js');
const { ProjectWorkflowService } = await import('../apps/api/dist/project-workflow.service.js');
const { ApprovalService } = await import('../apps/api/dist/approval.service.js');
const { OrganizationService } = await import('../apps/api/dist/organization.service.js');
const { IdentityService } = await import('../apps/api/dist/identity.service.js');
const { NotificationsService } = await import('../apps/api/dist/notifications.service.js');
const url = new URL(process.env.DATABASE_URL ?? '');
assert.match(url.hostname, /^(127\.0\.0\.1|localhost)$/);
assert.match(url.pathname, /_test$/);
const config = { databaseUrl: url.toString(), nodeEnv: 'test', webOrigin: 'http://localhost:5173' };
const database = new DatabaseService(config);
try {
  const db = database.prisma;
  assert.equal(await db.organization.count(), 0, 'Requires an empty dedicated database; fixtures are preserved');
  const organization = await db.organization.create({ data: { name: 'S09 transaction acceptance' } });
  const owner = await db.account.create({ data: { normalizedEmail: `s09-owner-${randomUUID()}@example.test`, kind: 'OWNER', state: 'ACTIVE' } });
  const branch = await db.branch.create({ data: { organizationId: organization.id, name: 'Concurrency branch' } });
  const team = await db.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: 'Concurrency team' } });
  const staff = await db.account.create({ data: { normalizedEmail: `s09-staff-${randomUUID()}@example.test`, kind: 'STAFF', state: 'ACTIVE' } });
  const employee = await db.employee.create({ data: { organizationId: organization.id, accountId: staff.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date('2026-01-01') } });
  const actor = { accountId: owner.id, organizationId: organization.id, kind: 'OWNER' };
  const staffActor = { ...actor, accountId: staff.id, kind: 'STAFF' };
  const authorization = new AuthorizationService(database);
  const tasks = new TaskService(database, authorization);
  const projects = new ProjectService(database);
  const workflow = new ProjectWorkflowService(database, authorization, new ApprovalService(database));
  const organizationService = new OrganizationService(database, new IdentityService(database, config), authorization, workflow, tasks, new NotificationsService(database));
  const input = { title: 'Concurrent task', ownerEmployeeId: employee.id, type: 'NON_PROJECT', priority: 'HIGH', targetDate: '2026-12-31', reason: 'S09 concurrency fixture' };
  const first = await tasks.create(actor, input);
  const starts = await Promise.allSettled([
    tasks.transition(actor, first.id, { toState: 'IN_PROGRESS', expectedVersion: 1, reason: 'Concurrent start A' }),
    tasks.transition(actor, first.id, { toState: 'IN_PROGRESS', expectedVersion: 1, reason: 'Concurrent start B' })
  ]);
  assert.equal(starts.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(starts.filter(result => result.status === 'rejected' && result.reason.status === 409).length, 1);
  assert.equal((await db.task.findUniqueOrThrow({ where: { id: first.id } })).version, 2);
  assert.equal(await db.taskStatusChange.count({ where: { taskId: first.id } }), 2);

  await db.employeePermissionOverride.create({ data: { organizationId: organization.id, employeeId: employee.id, permissionKey: 'project.view', scopeKind: 'BRANCH', branchId: branch.id, effect: 'ALLOW', reason: 'Project access fixture' } });
  const project = (await projects.create(actor, { branchId: branch.id, title: 'Concurrent cancellation', deliveryType: 'DESIGN', scopes: ['Architecture'], reason: 'S09 project race fixture' })).project;
  await workflow.assignment(actor, project.id, { employeeId: employee.id, expectedVersion: 1, reason: 'Assign fixture employee' });
  const work = await tasks.create(actor, { ...input, type: 'PROJECT', projectId: project.id });
  await db.$executeRawUnsafe(`CREATE FUNCTION s09_test_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.reason = 'S09 injected cancellation failure' AND NEW."eventKey" = 'project.cancelled' THEN RAISE EXCEPTION 'Injected audit failure'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe('CREATE TRIGGER s09_test_reject_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION s09_test_reject_audit()');
  try {
    await assert.rejects(tasks.cancelProject(actor, project.id, { expectedVersion: 2, reason: 'S09 injected cancellation failure' }));
    assert.equal((await db.project.findUniqueOrThrow({ where: { id: project.id } })).status, 'DRAFT');
    assert.equal((await db.task.findUniqueOrThrow({ where: { id: work.id } })).status, 'NOT_STARTED');
    assert.equal(await db.taskStatusChange.count({ where: { taskId: work.id } }), 1);
    assert.equal(await db.projectStatusChange.count({ where: { projectId: project.id, toStatus: 'CANCELLED' } }), 0);
    assert.equal(await db.auditEvent.count({ where: { eventKey: 'task.stopped', subjectId: work.id } }), 0);
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER s09_test_reject_audit ON audit_events');
    await db.$executeRawUnsafe('DROP FUNCTION s09_test_reject_audit()');
  }
  const cancellations = await Promise.allSettled([
    tasks.cancelProject(actor, project.id, { expectedVersion: 2, reason: 'Concurrent cancellation A' }),
    tasks.cancelProject(actor, project.id, { expectedVersion: 2, reason: 'Concurrent cancellation B' })
  ]);
  assert.equal(cancellations.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(cancellations.filter(result => result.status === 'rejected' && result.reason.status === 409).length, 1);
  assert.equal((await db.task.findUniqueOrThrow({ where: { id: work.id } })).status, 'STOPPED_DUE_TO_PROJECT_CANCELLATION');
  assert.equal(await db.taskStatusChange.count({ where: { taskId: work.id, toStatus: 'STOPPED_DUE_TO_PROJECT_CANCELLATION' } }), 1);

  const exitTask = await tasks.create(staffActor, { ...input, title: 'Exit race' });
  const exitRace = await Promise.allSettled([
    tasks.transition(staffActor, exitTask.id, { toState: 'IN_PROGRESS', expectedVersion: 1, reason: 'Start concurrent with exit' }),
    organizationService.finalizeEmployeeExit(owner.id, employee.id, 'Concurrent employee exit')
  ]);
  for (const result of exitRace) if (result.status === 'rejected') assert.ok([403, 409].includes(result.reason.status), 'A concurrency failure must be a permission/conflict response');
  if ((await db.employee.findUniqueOrThrow({ where: { id: employee.id } })).state !== 'EXITED') await organizationService.finalizeEmployeeExit(owner.id, employee.id, 'Retry exit after a concurrency conflict');
  const finalTask = await db.task.findUniqueOrThrow({ where: { id: exitTask.id } });
  assert.equal(finalTask.status, 'WAITING');
  assert.equal(finalTask.requiresReassignment, true);
  assert.ok(['NOT_STARTED', 'IN_PROGRESS'].includes(finalTask.waitingPreviousStatus));
  assert.equal((await db.account.findUniqueOrThrow({ where: { id: staff.id } })).state, 'SUSPENDED');
  assert.equal(await db.projectAssignment.count({ where: { employeeId: employee.id, revokedAt: null } }), 0);
  console.log('PASS: concurrent start/version conflicts, concurrent cancellation, cancellation audit-failure rollback, employee exit race, and revocation on a Cancelled project');
} finally { await database.onModuleDestroy(); }

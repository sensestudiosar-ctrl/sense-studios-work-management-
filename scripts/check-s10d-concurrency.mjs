import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

// After building the API and deploying all reviewed migrations, run against a
// fresh empty local _test database. Committed race fixtures remain as evidence.
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
require('reflect-metadata');
const { DatabaseService } = await import('../apps/api/dist/database.service.js');
const { AuthorizationService } = await import('../apps/api/dist/authorization.service.js');
const { TaskService } = await import('../apps/api/dist/task.service.js');
const { OrganizationService } = await import('../apps/api/dist/organization.service.js');
const { NotificationWorker, OperationalRecipientPredicate } = await import('../apps/api/dist/notification-worker.js');
const url = new URL(process.env.DATABASE_URL ?? '');
assert.match(url.hostname, /^(127\.0\.0\.1|localhost)$/);
assert.match(url.pathname, /_test$/);
const database = new DatabaseService({ databaseUrl: url.toString(), nodeEnv: 'test', webOrigin: 'http://localhost:5173' });
const db = database.prisma;
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
async function awaitBarrier(signal, operation, label) {
  await Promise.race([signal.promise, operation.then(() => { throw new Error(`${label} finished before its barrier`); }),
    delay(10_000, undefined, { ref: false }).then(() => { throw new Error(`${label} barrier timed out`); })]);
}
function transactionDatabase(tx) {
  return { prisma: new Proxy(tx, { get(target, key) {
    if (key === '$transaction') return async (run) => run(tx);
    return Reflect.get(target, key);
  } }) };
}
async function waitForBlockedQuery(fragment) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const rows = await db.$queryRaw`SELECT "pid" FROM pg_stat_activity WHERE datname=current_database()
      AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE ${`%${fragment}%`}`;
    if (rows.length) return;
    await delay(25);
  }
  throw new Error(`No blocked PostgreSQL query observed for ${fragment}`);
}
async function withOnlyDelivery(deliveryId, run) {
  // Retained earlier fixture deliveries cannot steal the worker's claim.
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "outbox_deliveries" WHERE "id"<>${deliveryId}::uuid ORDER BY "id" FOR UPDATE`;
    return run();
  }, { timeout: 30_000 });
}

try {
  assert.equal(await db.organization.count(), 0, 'Requires an empty dedicated database');
  assert.equal(await db.account.count(), 0, 'Requires an empty dedicated database');
  const organization = await db.organization.create({ data: { name: 'S10D and S10E concurrency acceptance' } });
  const branch = await db.branch.create({ data: { organizationId: organization.id, name: 'Approval race branch' } });
  const team = await db.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: 'Approval race team' } });
  const owner = await db.account.create({ data: { normalizedEmail: `s10d-owner-${randomUUID()}@example.test`, kind: 'OWNER', state: 'ACTIVE' } });
  const managerAccount = await db.account.create({ data: { normalizedEmail: `s10d-manager-${randomUUID()}@example.test`, kind: 'STAFF', state: 'ACTIVE' } });
  const staffAccount = await db.account.create({ data: { normalizedEmail: `s10d-staff-${randomUUID()}@example.test`, kind: 'STAFF', state: 'ACTIVE' } });
  const manager = await db.employee.create({ data: { organizationId: organization.id, accountId: managerAccount.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date('2026-01-01') } });
  const employee = await db.employee.create({ data: { organizationId: organization.id, accountId: staffAccount.id, homeBranchId: branch.id, homeTeamId: team.id, reportsToId: manager.id, hiredAt: new Date('2026-01-01') } });
  const ownerActor = { accountId: owner.id, organizationId: organization.id, kind: 'OWNER' };
  const managerActor = { accountId: managerAccount.id, organizationId: organization.id, kind: 'STAFF' };
  const staffActor = { accountId: staffAccount.id, organizationId: organization.id, kind: 'STAFF' };
  const authorization = new AuthorizationService(database);
  const tasks = new TaskService(database, authorization);
  // These rehearsed settings/grant commands do not call identity/project APIs.
  const organizationService = new OrganizationService(database, null, authorization, null, tasks, null);
  const scope = { scopeKind: 'TEAM', branchId: branch.id, teamId: team.id };
  const assignGrant = await organizationService.grantEmployeeOverride(owner.id, manager.id, { organizationId: organization.id, permissionKey: 'task.assign', effect: 'ALLOW', scope, reason: 'S10D scoped manager race authority' });
  await organizationService.grantEmployeeOverride(owner.id, manager.id, { organizationId: organization.id, permissionKey: 'task.deadline_change', effect: 'ALLOW', scope, reason: 'S10D explicit deadline race authority' });
  const create = (title) => tasks.create(ownerActor, { title, type: 'NON_PROJECT', priority: 'HIGH', targetDate: '2026-12-31', ownerEmployeeId: employee.id, reason: 'S10D concurrent command fixture' });
  const task = await create('Concurrent deadline extension');
  await tasks.changeCommittedDate(ownerActor, task.id, { expectedVersion: 1, committedDueDate: '2026-11-01', reason: 'Original committed race deadline' });
  const requests = await Promise.allSettled([
    tasks.requestExtension(staffActor, task.id, { expectedVersion: 2, proposedDate: '2026-11-05', approverAccountId: managerAccount.id, reason: 'Supplier delay proposal A' }),
    tasks.requestExtension(staffActor, task.id, { expectedVersion: 2, proposedDate: '2026-11-06', approverAccountId: managerAccount.id, reason: 'Supplier delay proposal B' })
  ]);
  assert.equal(requests.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(requests.filter((r) => r.status === 'rejected' && r.reason.status === 409).length, 1);
  const approvalId = requests.find((r) => r.status === 'fulfilled').value.approvalId;
  assert.equal(await db.approvalRequest.count({ where: { sourceId: task.id, state: 'PENDING' } }), 1);
  const decisions = await Promise.allSettled([
    tasks.decideExtension(managerActor, task.id, approvalId, { outcome: 'APPROVED', reason: 'Management approval race A' }),
    tasks.decideExtension(managerActor, task.id, approvalId, { outcome: 'APPROVED', reason: 'Management approval race B' })
  ]);
  assert.equal(decisions.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(decisions.filter((r) => r.status === 'rejected' && r.reason.status === 409).length, 1);
  const request = await db.approvalRequest.findUniqueOrThrow({ where: { id: approvalId } });
  assert.equal(request.state, 'APPROVED');
  assert.equal(await db.approvalDecision.count({ where: { requestId: approvalId } }), 1);
  const updated = await db.task.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(updated.version, 3);
  assert.equal(updated.committedDueDate.toISOString().slice(0, 10), request.context.proposedDate);
  assert.equal(await db.taskCommittedDateChange.count({ where: { extensionApprovalId: approvalId } }), 1);
  for (const eventKey of ['approval.requested', 'approval.decided']) {
    assert.equal(await db.auditEvent.count({ where: { subjectId: approvalId, eventKey } }), 1);
    assert.equal(await db.domainEvent.count({ where: { subjectId: approvalId, eventName: eventKey } }), 1);
    assert.equal(await db.outboxDelivery.count({ where: { event: { subjectId: approvalId, eventName: eventKey } } }), 1);
  }
  assert.equal(await db.taskCommittedDateChange.count({ where: { taskId: task.id } }), 2);
  assert.equal(await db.auditEvent.count({ where: { subjectId: task.id, eventKey: 'task.deadline_changed' } }), 2);
  assert.equal(await db.domainEvent.count({ where: { subjectId: task.id, eventName: 'task.deadline_changed' } }), 2);
  assert.equal(await db.outboxDelivery.count({ where: { event: { subjectId: task.id, eventName: 'task.deadline_changed' } } }), 2);
  console.log('PASS: concurrent extension requests and decisions each committed once, conflicted once, and retained exact approval/date/audit/event/outbox evidence');

  await organizationService.changeWaitingAlerts(owner.id, team.id, { expectedVersion: 1, enabled: true, reason: 'Enable scoped Waiting race notices' });
  const predicate = new OperationalRecipientPredicate(database, authorization, tasks);
  const makeWorker = (recipientPredicate = predicate) => new NotificationWorker(database, { send: async () => { throw new Error('Unexpected email delivery'); } }, { isVerified: async () => false }, recipientPredicate, { webOrigin: 'http://localhost:5173' });
  async function waitingFixture(title) {
    const row = await create(title);
    await tasks.transition(staffActor, row.id, { expectedVersion: 1, toState: 'IN_PROGRESS', reason: 'Start race work' });
    await tasks.wait(staffActor, row.id, { expectedVersion: 2, reason: 'Waiting race barrier', delayCause: 'Supplier input is pending' });
    const event = await db.domainEvent.findFirstOrThrow({ where: { subjectId: row.id, eventName: 'task.waiting' } });
    const delivery = await db.outboxDelivery.findFirstOrThrow({ where: { eventId: event.id } });
    const notice = await db.notification.findFirstOrThrow({ where: { eventId: event.id, recipientAccountId: managerAccount.id, channel: 'IN_APP' } });
    return { taskId: row.id, eventId: event.id, deliveryId: delivery.id, noticeId: notice.id };
  }

  const resumeFixture = await waitingFixture('Resume before notice delivery');
  await withOnlyDelivery(resumeFixture.deliveryId, async () => {
    const held = deferred(); const proceed = deferred();
    const resumer = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "tasks" WHERE "id"=${resumeFixture.taskId}::uuid FOR UPDATE`;
      held.resolve(); await proceed.promise;
      const scoped = transactionDatabase(tx);
      await new TaskService(scoped, new AuthorizationService(scoped)).resume(staffActor, resumeFixture.taskId, { expectedVersion: 3, reason: 'Resume linearizes before delivery' });
    }, { timeout: 30_000 });
    await awaitBarrier(held, resumer, 'Resume transaction');
    const delivery = makeWorker().runBatch();
    try { await waitForBlockedQuery('FROM "tasks"'); } finally { proceed.resolve(); }
    await Promise.all([resumer, delivery]);
  });
  assert.equal((await db.task.findUniqueOrThrow({ where: { id: resumeFixture.taskId } })).status, 'IN_PROGRESS');
  assert.equal((await db.notification.findUniqueOrThrow({ where: { id: resumeFixture.noticeId } })).deliveryState, 'DEAD');
  console.log('PASS: real task row lock serialized resume before delivery and suppressed the stale Waiting notice');

  const denyFixture = await waitingFixture('Delivery fences new DENY grant');
  const scopeHeld = deferred(); const finishDelivery = deferred();
  const barrierPredicate = { isAuthorized: async (eventId, accountId, tx) => {
    const allowed = await predicate.isAuthorized(eventId, accountId, tx);
    if (tx && eventId === denyFixture.eventId && accountId === managerAccount.id && allowed) {
      scopeHeld.resolve(); await finishDelivery.promise;
    }
    return allowed;
  } };
  let denial;
  await withOnlyDelivery(denyFixture.deliveryId, async () => {
    const delivery = makeWorker(barrierPredicate).runBatch();
    await awaitBarrier(scopeHeld, delivery, 'Locked notification delivery');
    const insertDeny = organizationService.grantEmployeeOverride(owner.id, manager.id, { organizationId: organization.id, permissionKey: 'task.assign', effect: 'DENY', scope, reason: 'Verify employee FK insertion fence' });
    try { await waitForBlockedQuery('employee_permission_overrides'); } finally { finishDelivery.resolve(); }
    [, denial] = await Promise.all([delivery, insertDeny]);
  });
  assert.equal((await db.notification.findUniqueOrThrow({ where: { id: denyFixture.noticeId } })).deliveryState, 'DELIVERED');
  assert.equal(await predicate.isAuthorized(denyFixture.eventId, managerAccount.id), false);
  await organizationService.revokeEmployeeOverride(owner.id, manager.id, denial.id, 'Retain DENY race history and restore grant');
  console.log('PASS: delivery held the recipient employee FK fence; new DENY insertion waited until authorized delivery committed');

  const revokeFixture = await waitingFixture('Permission revoke before notice delivery');
  await withOnlyDelivery(revokeFixture.deliveryId, async () => {
    const held = deferred(); const proceed = deferred();
    const revoker = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "employee_permission_overrides" WHERE "id"=${assignGrant.id}::uuid FOR UPDATE`;
      held.resolve(); await proceed.promise;
      const scoped = transactionDatabase(tx);
      await new OrganizationService(scoped, null, new AuthorizationService(scoped), null, tasks, null).revokeEmployeeOverride(owner.id, manager.id, assignGrant.id, 'Revocation linearizes before notification delivery');
    }, { timeout: 30_000 });
    await awaitBarrier(held, revoker, 'Grant revocation transaction');
    const delivery = makeWorker().runBatch();
    try { await waitForBlockedQuery('employee_permission_overrides'); } finally { proceed.resolve(); }
    await Promise.all([revoker, delivery]);
  });
  const revokedNotice = await db.notification.findUniqueOrThrow({ where: { id: revokeFixture.noticeId } });
  assert.equal(revokedNotice.deliveryState, 'DEAD');
  assert.equal(revokedNotice.failureCode, 'recipient_not_authorized');
  console.log('PASS: real grant row lock serialized revocation first and prevented unauthorized in-app delivery');
} finally {
  await database.onModuleDestroy();
}

import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
require('reflect-metadata');
const { DatabaseService } = await import('../apps/api/dist/database.service.js');
const { AuthorizationService } = await import('../apps/api/dist/authorization.service.js');
const { ProjectService } = await import('../apps/api/dist/project.service.js');
const { ProjectTemplateService } = await import('../apps/api/dist/project-template.service.js');
const url = new URL(process.env.DATABASE_URL ?? '');
assert.match(url.hostname, /^(127\.0\.0\.1|localhost)$/);
assert.match(url.pathname, /_test$/);
const database = new DatabaseService({ databaseUrl: url.toString() });
try {
  const db = database.prisma;
  const organization = await db.organization.create({ data: { name: 'S08 concurrent transaction acceptance' } });
  const owner = await db.account.create({ data: { normalizedEmail: `s08-race-${randomUUID()}@example.test`, kind: 'OWNER', state: 'ACTIVE' } });
  const branch = await db.branch.create({ data: { organizationId: organization.id, name: 'Concurrency branch' } });
  const actor = { accountId: owner.id, organizationId: organization.id, kind: 'OWNER' };
  const templates = new ProjectTemplateService(database, new AuthorizationService(database));
  const projects = new ProjectService(database);
  const definition = { deliveryType: 'DESIGN', scopes: ['Architecture'], stages: [{ key: 'BRIEF', label: 'Brief' }], milestones: [], folders: ['Brief'] };
  const template = (await templates.create(actor, { name: 'Concurrent template', definition, reason: 'Concurrency acceptance' })).template;
  const input = { branchId: branch.id, title: 'Same retry project', deliveryType: 'DESIGN', scopes: definition.scopes, reason: 'Concurrent identical retry', templateVersionId: template.versions[0].id, idempotencyKey: randomUUID() };
  const results = await Promise.all([projects.create(actor, input), projects.create(actor, input)]);
  assert.equal(results[0].project.id, results[1].project.id);
  assert.equal(await db.project.count(), 1);
  assert.equal(await db.projectPlan.count(), 1);
  assert.equal(await db.projectCreationReceipt.count(), 1);
  assert.equal(await db.projectPlanItem.count(), 1);
  await assert.rejects(projects.create(actor, { ...input, title: 'Conflicting retry' }));
  const versions = await Promise.all([templates.version(actor, template.id, { definition, reason: 'Concurrent version A' }), templates.version(actor, template.id, { definition, reason: 'Concurrent version B' })]);
  assert.deepEqual(versions.map(value => value.version.number).sort(), [2, 3]);
  assert.equal((await db.projectPlan.findFirstOrThrow()).templateVersionId, template.versions[0].id);
  const retryKey = randomUUID();
  await assert.rejects(projects.create(actor, { ...input, idempotencyKey: retryKey, clientId: randomUUID() }));
  assert.equal(await db.projectCreationReceipt.count({ where: { key: retryKey } }), 0);
  await projects.create(actor, { ...input, idempotencyKey: retryKey, title: 'Successful retry after rollback' });
  assert.equal(await db.project.count(), 2);
  await db.$executeRawUnsafe(`CREATE FUNCTION s08_test_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.reason = 'Injected audit failure' THEN RAISE EXCEPTION 'Injected audit failure'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER s08_test_reject_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION s08_test_reject_audit()`);
  const failedKey = randomUUID();
  try {
    await assert.rejects(projects.create(actor, { ...input, idempotencyKey: failedKey, reason: 'Injected audit failure' }));
    assert.equal(await db.project.count(), 2);
    assert.equal(await db.projectPlan.count(), 2);
    assert.equal(await db.projectCreationReceipt.count({ where: { key: failedKey } }), 0);
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER s08_test_reject_audit ON audit_events');
    await db.$executeRawUnsafe('DROP FUNCTION s08_test_reject_audit()');
  }
  await projects.create(actor, { ...input, idempotencyKey: failedKey, reason: 'Corrected retry after audit failure' });
  assert.equal(await db.project.count(), 3);
  console.log('PASS: concurrent identical creation, conflicting retry, concurrent version serialization, immutable applied version, rollback and corrected retry');
} finally { await database.onModuleDestroy(); }

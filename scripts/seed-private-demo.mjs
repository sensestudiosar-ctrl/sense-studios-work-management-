import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { config: loadEnv } = require('dotenv');
loadEnv({ path: fileURLToPath(new URL('../.env.iphone-https.test', import.meta.url)), quiet: true });

assert.equal(process.env.NODE_ENV, 'development', 'NODE_ENV must be development');
assert.ok(process.argv.includes('--apply'), 'Pass --apply to create or reuse the private demo fixtures');
const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
assert.match(databaseUrl.hostname, /^(127\.0\.0\.1|localhost)$/i, 'Database must be local');
assert.equal(databaseUrl.port, '56432', 'Database port must be 56432');
assert.equal(databaseUrl.pathname, '/sense_iphone_https_dev', 'Database must be sense_iphone_https_dev');

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

const config = { databaseUrl: databaseUrl.toString(), nodeEnv: 'development', webOrigin: process.env.WEB_ORIGIN };
const database = new DatabaseService(config);
const fixtureReason = 'Owner-authorized fictional private demo fixture';
const names = {
  branch: 'Demo Branch',
  team: 'Demo Design Team',
  role: 'Demo Designer',
  project: '[Demo] Studio workspace'
};
const people = [
  { email: 'demo.alex@example.test', code: 'DEMO-ALEX' },
  { email: 'demo.maya@example.test', code: 'DEMO-MAYA' },
  { email: 'demo.lee@example.test', code: 'DEMO-LEE' }
];
const sampleTasks = [
  { title: '[Demo] Review the studio intake checklist', priority: 'HIGH', offset: 2, checklist: [{ label: 'Confirm the fictional brief', checked: true }, { label: 'List open questions', checked: false }] },
  { title: '[Demo] Prepare two identity directions', priority: 'MEDIUM', offset: 5, checklist: [{ label: 'Sketch direction A', checked: false }, { label: 'Sketch direction B', checked: false }] },
  { title: '[Demo] Gather sample references', priority: 'LOW', offset: 3, checklist: [{ label: 'Collect color references', checked: false }] },
  { title: '[Demo] Draft a landing page outline', priority: 'HIGH', offset: 7, checklist: [{ label: 'Write hero copy', checked: false }, { label: 'Outline sections', checked: false }] },
  { title: '[Demo] Check the sample asset list', priority: 'MEDIUM', offset: 4, checklist: [{ label: 'Review image names', checked: false }] },
  { title: '[Demo] Summarize the fictional project handoff', priority: 'LOW', offset: 8, checklist: [{ label: 'Write handoff notes', checked: false }] }
];

const oneOrNone = (rows, label) => {
  assert.ok(rows.length <= 1, `Multiple ${label} matches exist; refusing ambiguous fixture reuse`);
  return rows[0] ?? null;
};
const expectMatch = (condition, label) => assert.ok(condition, `Existing ${label} does not match the demo fixture; refusing to overwrite it`);
const dayString = (date) => date.toISOString().slice(0, 10);

try {
  const db = database.prisma;
  const organization = await db.organization.findFirst();
  assert.ok(organization, 'Create the organization through setup before applying demo fixtures');
  assert.equal(organization.name, 'sensestudios', 'The existing singleton organization must remain sensestudios');
  const ownerAccount = await db.account.findUnique({ where: { normalizedEmail: 's05.owner@example.test' } });
  assert.ok(ownerAccount && ownerAccount.kind === 'OWNER' && ownerAccount.state === 'ACTIVE', 'Expected active Owner s05.owner@example.test');
  const actor = { accountId: ownerAccount.id, organizationId: organization.id, kind: 'OWNER' };

  const preservedBefore = {
    owners: await db.account.count({ where: { kind: 'OWNER' } }),
    passkeys: await db.passkeyCredential.count(),
    sessions: await db.session.count()
  };

  const authorization = new AuthorizationService(database);
  const tasks = new TaskService(database, authorization);
  const projects = new ProjectService(database);
  const workflow = new ProjectWorkflowService(database, authorization, new ApprovalService(database));
  const organizationService = new OrganizationService(database, new IdentityService(database, config), authorization, workflow, tasks, new NotificationsService(database));

  const branchMatch = oneOrNone(await db.branch.findMany({ where: { organizationId: organization.id, name: names.branch } }), 'Demo Branch');
  const branch = branchMatch ?? await organizationService.createBranch(ownerAccount.id, organization.id, names.branch, fixtureReason);
  expectMatch(branch.active, 'Demo Branch');

  const teamMatch = oneOrNone(await db.team.findMany({ where: { organizationId: organization.id, name: names.team } }), 'Demo Design Team');
  const team = teamMatch ?? await organizationService.createTeam(ownerAccount.id, organization.id, branch.id, names.team, fixtureReason);
  expectMatch(team.active && team.branchId === branch.id, 'Demo Design Team');

  const roleMatch = oneOrNone(await db.jobRole.findMany({ where: { organizationId: organization.id, name: names.role } }), 'Demo Designer');
  const role = roleMatch ?? await organizationService.createJobRole(ownerAccount.id, organization.id, names.role, fixtureReason, 'Fictional private demo staff role');
  expectMatch(role.active, 'Demo Designer');

  const demoPermissions = await db.rolePermission.findMany({ where: {
    roleId: role.id, organizationId: organization.id, permissionKey: 'project.view', scopeKind: 'BRANCH',
    branchId: branch.id, teamId: null
  } });
  expectMatch(demoPermissions.length <= 1 && demoPermissions.every((row) => row.revokedAt === null), 'demo project view permission');
  const existingPermission = demoPermissions[0];
  if (!existingPermission) await organizationService.grantRolePermission(ownerAccount.id, role.id, {
    organizationId: organization.id, permissionKey: 'project.view',
    scope: { scopeKind: 'BRANCH', branchId: branch.id }, reason: fixtureReason
  });

  const employees = [];
  for (const person of people) {
    let account = await db.account.findUnique({ where: { normalizedEmail: person.email } });
    if (!account) account = await db.account.create({ data: { normalizedEmail: person.email, kind: 'STAFF', state: 'ACTIVE' } });
    expectMatch(account.kind === 'STAFF' && account.state === 'ACTIVE' && account.emailVerifiedAt === null, `account ${person.email}`);
    const [passkeys, sessions, enrollments, verifications] = await Promise.all([
      db.passkeyCredential.count({ where: { accountId: account.id } }),
      db.session.count({ where: { accountId: account.id } }),
      db.identityEnrollmentGrant.count({ where: { accountId: account.id } }),
      db.emailVerificationChallenge.count({ where: { accountId: account.id } })
    ]);
    expectMatch(passkeys === 0 && sessions === 0 && enrollments === 0 && verifications === 0, `identity state for ${person.email}`);

    let employee = await db.employee.findUnique({ where: { accountId: account.id }, include: { jobRoleAssignments: { where: { effectiveTo: null }, include: { jobRole: true } } } });
    if (!employee) employee = await organizationService.createEmployee(ownerAccount.id, {
      organizationId: organization.id, accountId: account.id, branchId: branch.id, teamId: team.id,
      jobRoleIds: [role.id], employeeCode: person.code, hiredAt: new Date('2026-01-01T00:00:00.000Z'), reason: fixtureReason
    });
    employee = await db.employee.findUnique({ where: { id: employee.id }, include: { jobRoleAssignments: { where: { effectiveTo: null }, include: { jobRole: true } } } });
    expectMatch(employee.state === 'ACTIVE' && employee.organizationId === organization.id && employee.homeBranchId === branch.id && employee.homeTeamId === team.id && employee.employeeCode === person.code, `employee ${person.email}`);
    expectMatch(employee.jobRoleAssignments.length === 1 && employee.jobRoleAssignments[0].jobRoleId === role.id, `job role for ${person.email}`);
    employees.push({ ...person, id: employee.id, accountId: account.id });
  }

  const existingProject = oneOrNone(await db.project.findMany({ where: { organizationId: organization.id, title: names.project } }), names.project);
  let project = existingProject;
  if (project) expectMatch(project.branchId === branch.id && project.deliveryType === 'DESIGN' && project.status === 'DRAFT', names.project);
  else project = (await projects.create(actor, { branchId: branch.id, title: names.project, deliveryType: 'DESIGN', scopes: ['Fictional identity concepts'], reason: fixtureReason })).project;

  for (const employee of employees) {
    const currentProject = await db.project.findUniqueOrThrow({ where: { id: project.id } });
    const assignments = await db.projectAssignment.findMany({ where: { projectId: project.id, organizationId: organization.id, employeeId: employee.id } });
    expectMatch(assignments.length <= 1 && assignments.every((row) => row.revokedAt === null), `project assignment for ${employee.email}`);
    const assignment = assignments[0];
    if (!assignment) await workflow.assignment(actor, project.id, { employeeId: employee.id, expectedVersion: currentProject.version, reason: fixtureReason });
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  for (let index = 0; index < sampleTasks.length; index += 1) {
    const definition = sampleTasks[index];
    const found = oneOrNone(await db.task.findMany({ where: { organizationId: organization.id, title: definition.title } }), definition.title);
    if (found) {
      expectMatch(found.type === 'NON_PROJECT' && found.projectId === null && found.priority === definition.priority && found.primaryOwnerEmployeeId === employees[index % employees.length].id && found.description === 'Fictional sample task for the private demo environment.' && JSON.stringify(found.checklist) === JSON.stringify(definition.checklist), definition.title);
      continue;
    }
    const target = new Date(todayUtc);
    target.setUTCDate(target.getUTCDate() + definition.offset);
    await tasks.create(actor, {
      title: definition.title,
      description: 'Fictional sample task for the private demo environment.',
      type: 'NON_PROJECT', priority: definition.priority,
      targetDate: dayString(target), ownerEmployeeId: employees[index % employees.length].id,
      checklist: definition.checklist, reason: fixtureReason
    });
  }

  const setup = await tasks.setup(actor);
  const [mine, assigned, tasksForOrg] = await Promise.all([
    tasks.list(actor, 'mine', 0, 100), tasks.list(actor, 'assigned', 0, 100),
    db.task.count({ where: { organizationId: organization.id, title: { startsWith: '[Demo]' } } })
  ]);
  const preservedAfter = {
    owners: await db.account.count({ where: { kind: 'OWNER' } }),
    passkeys: await db.passkeyCredential.count(),
    sessions: await db.session.count()
  };
  assert.deepEqual(preservedAfter, preservedBefore, 'Owner, passkey and session counts must remain unchanged');

  console.log(JSON.stringify({
    applied: true,
    organization: organization.name,
    branch: branch.name,
    team: team.name,
    jobRole: role.name,
    employees: employees.map(({ email, code }) => ({ email, employeeCode: code })),
    project: { title: project.title, status: project.status, assignedEmployees: employees.length },
    sampleTasks: tasksForOrg,
    canAssign: setup.canAssign,
    setupEmployeeCount: setup.employees.length,
    taskLists: { mine: mine.total, assigned: assigned.total },
    preservedIdentityCounts: { before: preservedBefore, after: preservedAfter, unchanged: true }
  }, null, 2));
} finally {
  await database.onModuleDestroy();
}

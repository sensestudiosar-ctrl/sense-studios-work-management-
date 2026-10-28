import { test, expect } from "@playwright/test";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";

test("Projects sections and every task view retain context with a native task panel", async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!process.env.DATABASE_URL, "Dedicated local test database required");
  const url = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1", "db"].includes(url.hostname) || !url.pathname.endsWith("_test")) throw new Error("Project browser fixture requires a dedicated test database");
  const require = createRequire(resolve("apps/api/package.json"));
  const { Client } = require("pg") as typeof import("pg");
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const session = randomBytes(32).toString("base64url");
  const ownerSession = randomBytes(32).toString("base64url");
  const ownerCsrf = createHmac("sha256", ownerSession).update("csrf").digest("base64url");
  const csrf = createHmac("sha256", session).update("csrf").digest("base64url");
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const branchId = randomUUID(), otherBranchId = randomUUID(), teamId = randomUUID();
  const accountId = randomUUID(), employeeId = randomUUID(), projectId = randomUUID();
  const title = `Assigned project ${projectId.slice(0, 8)}`;
  await db.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(6092706)");
    const org = await db.query<{ id: string }>("SELECT id FROM organizations LIMIT 1");
    const organizationId = org.rows[0]?.id ?? randomUUID();
    if (!org.rows[0]) await db.query('INSERT INTO organizations(id,name,"updatedAt") VALUES ($1,$2,CURRENT_TIMESTAMP)', [organizationId, "Project browser fixture"]);
    await db.query('INSERT INTO branches(id,"organizationId",name,"updatedAt") VALUES ($1,$2,$3,CURRENT_TIMESTAMP),($4,$2,$5,CURRENT_TIMESTAMP)', [branchId, organizationId, `Project assigned ${branchId}`, otherBranchId, `Project hidden ${otherBranchId}`]);
    await db.query('INSERT INTO teams(id,"organizationId","branchId",name,"updatedAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)', [teamId, organizationId, branchId, "Project fixture team"]);
    await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES ($1,$2,\'STAFF\',\'ACTIVE\',CURRENT_TIMESTAMP)', [accountId, `project-${accountId}@example.test`]);
    await db.query('INSERT INTO employees(id,"organizationId","accountId","homeBranchId","homeTeamId","hiredAt","updatedAt") VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,CURRENT_TIMESTAMP)', [employeeId, organizationId, accountId, branchId, teamId]);
    for (const key of ["project.view", "project.cancellation_request"]) await db.query('INSERT INTO employee_permission_overrides(id,"organizationId","employeeId","permissionKey",effect,"scopeKind","branchId",reason) VALUES ($1,$2,$3,$4,\'ALLOW\',\'BRANCH\',$5,$6)', [randomUUID(), organizationId, employeeId, key, branchId, "Project browser grant"]);
    await db.query('INSERT INTO projects(id,"organizationId","branchId",title,"deliveryType","createdById","updatedAt") VALUES ($1,$2,$3,$4,\'DESIGN\',$5,CURRENT_TIMESTAMP)', [projectId, organizationId, branchId, title, accountId]);
    await db.query('INSERT INTO project_scopes(id,"projectId","organizationId",name,"normalizedName") VALUES ($1,$2,$3,$4,$5)', [randomUUID(), projectId, organizationId, "Architecture", "architecture"]);
    await db.query('INSERT INTO project_status_changes(id,"projectId","organizationId","toStatus","projectVersion","actorId") VALUES ($1,$2,$3,\'DRAFT\',1,$4)', [randomUUID(), projectId, organizationId, accountId]);
    await db.query('INSERT INTO project_assignments(id,"projectId","organizationId","employeeId","grantedById","grantReason") VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), projectId, organizationId, employeeId, accountId, "Assigned project fixture"]);
    await db.query('INSERT INTO sessions(id,"accountId","tokenHash","csrfTokenHash","expiresAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP+interval \'1 hour\')', [randomUUID(), accountId, hash(session), hash(csrf)]);
    const owner = await db.query<{ id: string }>("SELECT id FROM accounts WHERE kind='OWNER' AND state='ACTIVE' LIMIT 1");
    const ownerId = owner.rows[0]?.id ?? randomUUID();
    if (!owner.rows[0]) {
      await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'OWNER\',\'ACTIVE\',CURRENT_TIMESTAMP)', [ownerId, `projects-owner-${ownerId}@example.test`]);
      await db.query('INSERT INTO passkey_credentials(id,"credentialId","accountId","publicKey") VALUES($1,$2,$3,$4),($5,$6,$3,$7)', [randomUUID(), randomUUID(), ownerId, randomBytes(32), randomUUID(), randomUUID(), randomBytes(32)]);
      await db.query('INSERT INTO owner_recovery_codes(id,"accountId","codeHash","acknowledgedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [randomUUID(), ownerId, hash(randomUUID())]);
    }
    await db.query('INSERT INTO sessions(id,"accountId","tokenHash","csrfTokenHash","expiresAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP+interval \'1 hour\')', [randomUUID(), ownerId, hash(ownerSession), hash(ownerCsrf)]);
    await db.query("COMMIT");
    const created = await page.request.post('/api/v1/tasks', { headers: { Cookie: `sense_sid=${ownerSession}`, Origin: baseURL!, 'X-CSRF-Token': ownerCsrf }, data: { title: 'Redesign fixture task', type: 'PROJECT', projectId, ownerEmployeeId: employeeId, priority: 'MEDIUM', targetDate: '2026-12-31', reason: 'Verify the approved Projects presentation' } });
    expect(created.status()).toBe(201);
    await context.addCookies([{ name: "sense_sid", value: session, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    await page.goto('/projects?projectId=' + projectId);
    const workspace = page.locator('.project-workspace');
    await expect(workspace.getByRole('heading', { name: title, exact: true })).toBeVisible();
    const mobile = page.viewportSize()!.width <= 600;
    const section = async (name: string) => {
      if (mobile) await workspace.getByLabel('Project section', { exact: true }).selectOption(name.toLowerCase());
      else await workspace.getByRole('navigation', { name: title + ' sections' }).getByRole('button', { name, exact: true }).click();
    };
    for (const name of ['Plan', 'People', 'Documents', 'Reviews', 'Delivery', 'Activity', 'Overview']) {
      await section(name);
      await expect(workspace.locator('.project-active-section')).toHaveText(name);
      await expect(workspace.getByRole('heading', { name: title, exact: true })).toBeVisible();
    }
    await section('Tasks');
    const tasks = workspace.locator('.project-task-panel');
    for (const [view, value] of [['List','list'], ['Cards','cards'], ['Kanban','board'], ['Timeline','timeline']]) {
      if (mobile) await tasks.getByLabel('Task display mode').selectOption(value!);
      else await tasks.getByRole('group', { name: 'Task display', exact: true }).getByRole('button', { name: view!, exact: true }).click();
      if (mobile && value === 'board') {
        const picker = tasks.getByLabel('Kanban status', { exact: true });
        await expect(picker.locator('option')).toHaveCount(13);
        await picker.selectOption('NOT_STARTED');
        await expect(tasks.locator('.task-board-column:visible')).toHaveCount(1);
      }
      const opener = tasks.getByRole('button', { name: value === 'timeline' ? 'Redesign fixture task' : 'Open task: Redesign fixture task', exact: true });
      await opener.click();
      const panel = page.getByRole('dialog', { name: 'Redesign fixture task', exact: true });
      await expect(panel).toBeVisible();
      await expect(panel.getByRole('heading', { name: 'Redesign fixture task', exact: true })).toHaveCount(1);
      expect(await panel.evaluate((element: HTMLDialogElement) => element.matches(':modal'))).toBe(true);
      await expect(panel.getByRole('button', { name: 'Close task details' })).toBeFocused();
      await panel.screenshot({ path: testInfo.outputPath(`task-${value}.png`) });
      if (value === 'list') await page.goBack();
      else if (value === 'cards') await page.keyboard.press('Escape');
      else await panel.getByRole('button', { name: 'Close task details' }).click();
      await expect(panel).toHaveCount(0);
      await expect(opener).toBeFocused();
      expect(new URL(page.url()).searchParams.get('projectTaskId')).toBeNull();
      await expect(workspace.locator('.project-active-section')).toHaveText('Tasks');
    }
    for (const width of [320,390,768,1024,1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`projects-${width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: mobile ? 390 : 1440, height: 900 });
    await context.addCookies([{ name: 'sense_sid', value: ownerSession, url: baseURL!, httpOnly: true, sameSite: 'Strict' }]);
    await page.goto('/projects?branchId=' + branchId);
    await workspace.getByRole('button', { name: 'New project', exact: true }).click();
    const form = workspace.getByRole('form', { name: 'Create project', exact: true });
    await form.getByLabel('Creation branch').selectOption(otherBranchId);
    await form.getByLabel('Project title').fill('Owner draft from Projects');
    await page.screenshot({ path: testInfo.outputPath('create-project.png'), fullPage: true });
    page.once('dialog', dialog => dialog.dismiss());
    await form.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(form.getByLabel('Creation branch')).toHaveValue(otherBranchId);
    page.once('dialog', dialog => dialog.accept());
    await form.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(workspace.getByLabel('Project branch', { exact: true })).toHaveValue(branchId);
    await workspace.getByRole('button', { name: 'New project', exact: true }).click();
    await form.getByLabel('Creation branch').selectOption(otherBranchId);
    await form.getByLabel('Project title').fill('Owner draft from Projects');
    await form.getByLabel('Initial service scopes').fill('Architecture');
    await form.getByLabel('Creation reason').fill('Confirm the focused project creation journey');
    await form.getByRole('button', { name: 'Create Draft project', exact: true }).click();
    await expect(workspace.getByRole('heading', { name: 'Owner draft from Projects', exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('branchId')).toBe(branchId);
    await workspace.getByRole('button', { name: '← Back to projects', exact: true }).click();
    await expect(workspace.getByLabel('Project branch', { exact: true })).toHaveValue(branchId);
  } finally {
    await db.query('UPDATE sessions SET "revokedAt"=CURRENT_TIMESTAMP WHERE "accountId"=$1', [accountId]);
    await db.query('UPDATE sessions SET "revokedAt"=CURRENT_TIMESTAMP WHERE "tokenHash"=$1', [hash(ownerSession)]);
    await db.end();
  }
});

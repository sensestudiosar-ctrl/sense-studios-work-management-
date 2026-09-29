import { test, expect } from "@playwright/test";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";

test("project owner links a predecessor and explicitly acknowledges an early start", async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!process.env.DATABASE_URL, "Dedicated local test database required");
  const url = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1", "db"].includes(url.hostname) || !url.pathname.endsWith("_test")) throw new Error("Dependency browser fixture requires a dedicated test database");
  const require = createRequire(resolve("apps/api/package.json"));
  const { Client } = require("pg") as typeof import("pg");
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const suffix = randomUUID();
  const branchId = randomUUID(), teamId = randomUUID(), accountId = randomUUID(), employeeId = randomUUID();
  const ownerSecret = randomBytes(32).toString("base64url"), staffSecret = randomBytes(32).toString("base64url");
  const csrf = (secret: string) => createHmac("sha256", secret).update("csrf").digest("base64url");
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  await db.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(6092706)");
    const existingOrg = await db.query<{ id: string }>("SELECT id FROM organizations LIMIT 1");
    const organizationId = existingOrg.rows[0]?.id ?? randomUUID();
    if (!existingOrg.rows[0]) await db.query('INSERT INTO organizations(id,name,"updatedAt") VALUES($1,$2,CURRENT_TIMESTAMP)', [organizationId, "S10 dependency browser fixture"]);
    const existingOwner = await db.query<{ id: string }>("SELECT id FROM accounts WHERE kind='OWNER' AND state='ACTIVE' LIMIT 1");
    const ownerId = existingOwner.rows[0]?.id ?? randomUUID();
    if (!existingOwner.rows[0]) {
      await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'OWNER\',\'ACTIVE\',CURRENT_TIMESTAMP)', [ownerId, `dependency-owner-${suffix}@example.test`]);
      await db.query('INSERT INTO passkey_credentials(id,"credentialId","accountId","publicKey") VALUES($1,$2,$3,$4),($5,$6,$3,$7)', [randomUUID(), randomUUID(), ownerId, randomBytes(32), randomUUID(), randomUUID(), randomBytes(32)]);
      await db.query('INSERT INTO owner_recovery_codes(id,"accountId","codeHash","acknowledgedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [randomUUID(), ownerId, hash(randomUUID())]);
    }
    await db.query('INSERT INTO branches(id,"organizationId",name,"updatedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [branchId, organizationId, `S10 dependency ${suffix}`]);
    await db.query('INSERT INTO teams(id,"organizationId","branchId",name,"updatedAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)', [teamId, organizationId, branchId, `S10 dependency team ${suffix}`]);
    await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'STAFF\',\'ACTIVE\',CURRENT_TIMESTAMP)', [accountId, `dependency-${suffix}@example.test`]);
    await db.query('INSERT INTO employees(id,"organizationId","accountId","homeBranchId","homeTeamId","hiredAt","updatedAt") VALUES($1,$2,$3,$4,$5,CURRENT_DATE,CURRENT_TIMESTAMP)', [employeeId, organizationId, accountId, branchId, teamId]);
    await db.query('INSERT INTO employee_permission_overrides(id,"organizationId","employeeId","permissionKey",effect,"scopeKind","branchId",reason) VALUES($1,$2,$3,\'project.view\',\'ALLOW\',\'BRANCH\',$4,$5)', [randomUUID(), organizationId, employeeId, branchId, "Dependency browser access"]);
    await db.query('INSERT INTO employee_permission_overrides(id,"organizationId","employeeId","permissionKey",effect,"scopeKind","branchId",reason) VALUES($1,$2,$3,\'project.manage\',\'ALLOW\',\'BRANCH\',$4,$5)', [randomUUID(), organizationId, employeeId, branchId, "Dependency browser lead eligibility"]);
    for (const [account, secret] of [[ownerId, ownerSecret], [accountId, staffSecret]]) await db.query('INSERT INTO sessions(id,"accountId","tokenHash","csrfTokenHash","expiresAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP+interval \'1 hour\')', [randomUUID(), account, hash(secret), hash(csrf(secret))]);
    await db.query("COMMIT");

    const ownerHeaders = { Cookie: `sense_sid=${ownerSecret}`, Origin: baseURL!, "X-CSRF-Token": csrf(ownerSecret) };
    const projectResponse = await page.request.post("/api/v1/projects", { headers: ownerHeaders, data: { branchId, title: `Dependency project ${suffix}`, deliveryType: "DESIGN", scopes: ["Delivery"], reason: "Create dependency browser project" } });
    expect(projectResponse.status()).toBe(201);
    const { project } = await projectResponse.json() as { project: { id: string } };
    for (const [path, body] of [["assignments", { employeeId, expectedVersion: 1, reason: "Assign project task owner" }], ["lead", { employeeId, expectedVersion: 2, reason: "Appoint project task owner" }], ["status", { toStatus: "ACTIVE", expectedVersion: 3, reason: "Activate project task work" }]] as const) {
      const response = await page.request.post(`/api/v1/projects/${project.id}/${path}`, { headers: ownerHeaders, data: body });
      expect(response.status(), `${path}: ${await response.text()}`).toBe(201);
    }
    const createTask = async (title: string) => {
      const response = await page.request.post("/api/v1/tasks", { headers: ownerHeaders, data: { title, type: "PROJECT", projectId: project.id, ownerEmployeeId: employeeId, priority: "HIGH", targetDate: "2026-12-31", reason: "Create dependency browser task" } });
      expect(response.status()).toBe(201);
      return response.json() as Promise<{ id: string }>;
    };
    const predecessor = await createTask(`Predecessor ${suffix.slice(0, 8)}`);
    const dependentTitle = `Dependent ${suffix.slice(0, 8)}`;
    const dependent = await createTask(dependentTitle);
    await context.addCookies([{ name: "sense_sid", value: staffSecret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    await page.goto(`/?taskId=${dependent.id}`);
    const workspace = page.locator(".task-workspace");
    await expect(workspace.getByRole("heading", { name: dependentTitle })).toBeVisible();
    const links = workspace.getByRole("region", { name: "Task dependencies" });
    await links.getByLabel("Link an accessible predecessor").selectOption(predecessor.id);
    await links.getByLabel("Reason for dependency change").fill("Wait for predecessor delivery");
    await links.getByRole("button", { name: "Add dependency" }).click();
    await expect(workspace.getByText("Dependency added.")).toBeVisible();
    await page.reload();
    await expect(links.getByText(/Predecessor .* Not started/)).toBeVisible();
    await expect(links.getByText(/At least one predecessor is unfinished/)).toBeVisible();
    await workspace.getByLabel("Reason for change").fill("Begin work with recorded dependency warning");
    await workspace.getByRole("button", { name: "Review early start" }).click();
    await expect(workspace.getByRole("button", { name: "Start anyway" })).toBeVisible();
    await workspace.screenshot({ path: testInfo.outputPath("task-dependency-early-start.png") });
    await workspace.getByRole("button", { name: "Start anyway" }).click();
    await expect(workspace.locator(".task-state")).toHaveText("In progress");
    const evidence = await db.query<{ acknowledged: boolean; predecessors: string[] }>('SELECT "earlyStartAcknowledged" AS acknowledged,"unfinishedPredecessorIds" AS predecessors FROM task_status_changes WHERE "taskId"=$1 AND "toStatus"=\'IN_PROGRESS\'', [dependent.id]);
    expect(evidence.rows).toEqual([{ acknowledged: true, predecessors: [predecessor.id] }]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    await db.query('UPDATE sessions SET "revokedAt"=CURRENT_TIMESTAMP WHERE "tokenHash" IN ($1,$2)', [hash(ownerSecret), hash(staffSecret)]);
    await db.end();
  }
});

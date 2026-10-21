import { expect, test } from "@playwright/test";
import { isS27DisposableTestTarget, matchesS27DisposableServer } from "../../apps/api/src/s27-disposable-test-target.js";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const disposableS27Database = Boolean(process.env.DATABASE_URL && isS27DisposableTestTarget("DATABASE_URL", process.env.DATABASE_URL));
type FixtureDatabase = {
  connect(): Promise<void>;
  query<Row extends Record<string, unknown> = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{ rows: Row[]; rowCount: number | null }>;
  end(): Promise<void>;
};

type Auth = { secret: string; csrf: string; id: string };
type OfflineFixture = {
  db: FixtureDatabase;
  actor: Auth;
  owner: Auth;
  actorAccountId: string;
  projectId: string;
  projectTitle: string;
  packageId: string;
  secondPackageId: string;
  folderId: string;
  headers: Record<string, string>;
  ownerHeaders: Record<string, string>;
};

async function seedOfflineSite(page: import("@playwright/test").Page, context: import("@playwright/test").BrowserContext, baseURL: string | undefined): Promise<OfflineFixture> {
  const databaseUrl = new URL(process.env.DATABASE_URL!);
  const explicitlyEnabledS25Database = process.env.S25_E2E_ENABLED === "1" && ["localhost", "127.0.0.1"].includes(databaseUrl.hostname) && ["56433", "57433"].includes(databaseUrl.port) && /^\/sense_s25_main_s25_[a-z0-9_]+_test$/i.test(databaseUrl.pathname);
  const explicitlyEnabledS26Database = process.env.S26_E2E_ENABLED === "1" && ["localhost", "127.0.0.1"].includes(databaseUrl.hostname) && databaseUrl.port === "57433" && /^\/sense_s26_main_s26_[a-z0-9_]+_test$/i.test(databaseUrl.pathname);
  const explicitlyEnabledS27Database = process.env.S27_E2E_ENABLED === "1" && databaseUrl.hostname === "127.0.0.1" && databaseUrl.port === "57433" && /^\/sense_s27_main_s27_[a-z0-9_]+_test$/.test(databaseUrl.pathname) || disposableS27Database;
  if (!["localhost", "127.0.0.1"].includes(databaseUrl.hostname) || ((!explicitlyEnabledS25Database && !explicitlyEnabledS26Database && !explicitlyEnabledS27Database) && databaseUrl.port !== "56433") || (!/^\/sense_s15_s19_s17_s20_s22_.*_test$/.test(databaseUrl.pathname) && !explicitlyEnabledS25Database && !explicitlyEnabledS26Database && !explicitlyEnabledS27Database)) {
    throw new Error("Offline SITE browser acceptance requires the guarded dedicated localhost S22 or explicitly enabled exact S25 PostgreSQL database on port 56433");
  }
  const require = createRequire(resolve("apps/api/package.json"));
  const { Client } = require("pg") as { Client: new (config: { connectionString: string }) => FixtureDatabase };
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const suffix = randomUUID();
  const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
  const auth = (): Auth => {
    const secret = randomBytes(32).toString("base64url");
    return { secret, csrf: createHmac("sha256", secret).update("csrf").digest("base64url"), id: randomUUID() };
  };
  const owner = auth();
  const actor = auth();
  const organizationId = randomUUID();
  const branchId = randomUUID();
  const teamId = randomUUID();
  const actorAccountId = randomUUID();
  const employeeId = randomUUID();
  const projectTitle = `S22 offline ${suffix.slice(0, 8)}`;
  await db.connect();
  if (disposableS27Database) {
    const identity = await db.query<{ database: string; port: number }>("SELECT current_database() AS database, inet_server_port() AS port");
    if (!matchesS27DisposableServer(process.env.DATABASE_URL!, identity.rows[0]!.database, identity.rows[0]!.port)) throw new Error("Connected PostgreSQL server does not match the guarded S27 disposable target");
  }
  let committed = false;
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(6092706)");
    const existingOrganization = await db.query<{ id: string }>("SELECT id FROM organizations LIMIT 1");
    const orgId = existingOrganization.rows[0]?.id ?? organizationId;
    if (!existingOrganization.rows[0]) await db.query('INSERT INTO organizations(id,name,"updatedAt") VALUES($1,$2,CURRENT_TIMESTAMP)', [orgId, "S22 offline browser fixture"]);
    const existingOwner = await db.query<{ id: string }>("SELECT id FROM accounts WHERE kind='OWNER' AND state='ACTIVE' LIMIT 1");
    const ownerAccountId = existingOwner.rows[0]?.id ?? randomUUID();
    if (!existingOwner.rows[0]) await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'OWNER\',\'ACTIVE\',CURRENT_TIMESTAMP)', [ownerAccountId, `s22-owner-${suffix}@example.test`]);
    const credentials = await db.query<{ count: number }>('SELECT count(*)::int AS count FROM passkey_credentials WHERE "accountId"=$1 AND "revokedAt" IS NULL', [ownerAccountId]);
    for (let index = credentials.rows[0]!.count; index < 2; index += 1) await db.query('INSERT INTO passkey_credentials(id,"credentialId","accountId","publicKey") VALUES($1,$2,$3,$4)', [randomUUID(), randomUUID(), ownerAccountId, randomBytes(32)]);
    const recovery = await db.query('SELECT id FROM owner_recovery_codes WHERE "accountId"=$1 AND "usedAt" IS NULL AND "replacedAt" IS NULL AND "acknowledgedAt" IS NOT NULL LIMIT 1', [ownerAccountId]);
    if (!recovery.rows[0]) await db.query('INSERT INTO owner_recovery_codes(id,"accountId","codeHash","acknowledgedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [randomUUID(), ownerAccountId, hash(randomUUID())]);
    await db.query('INSERT INTO branches(id,"organizationId",name,"updatedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [branchId, orgId, `S22 offline ${suffix}`]);
    await db.query('INSERT INTO teams(id,"organizationId","branchId",name,"updatedAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)', [teamId, orgId, branchId, `S22 team ${suffix}`]);
    await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'STAFF\',\'ACTIVE\',CURRENT_TIMESTAMP)', [actorAccountId, `s22-worker-${suffix}@example.test`]);
    await db.query('INSERT INTO employees(id,"organizationId","accountId","homeBranchId","homeTeamId","hiredAt","updatedAt") VALUES($1,$2,$3,$4,$5,CURRENT_DATE,CURRENT_TIMESTAMP)', [employeeId, orgId, actorAccountId, branchId, teamId]);
    for (const permissionKey of ["project.view", "project.manage", "employee.manage", "site.view", "site.work", "document.view", "document.upload"]) {
      await db.query('INSERT INTO employee_permission_overrides(id,"organizationId","employeeId","permissionKey",effect,"scopeKind","branchId",reason) VALUES($1,$2,$3,$4,\'ALLOW\',\'BRANCH\',$5,$6)', [randomUUID(), orgId, employeeId, permissionKey, branchId, "S22 offline browser fixture grant"]);
    }
    for (const [accountId, credentials] of [[ownerAccountId, owner], [actorAccountId, actor]] as const) await db.query('INSERT INTO sessions(id,"accountId","tokenHash","csrfTokenHash","expiresAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP+interval \'1 hour\')', [credentials.id, accountId, hash(credentials.secret), hash(credentials.csrf)]);
    await db.query("COMMIT");
    committed = true;

    await context.addCookies([{ name: "sense_sid", value: owner.secret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    const ownerHeaders = { Cookie: `sense_sid=${owner.secret}`, Origin: baseURL!, "X-CSRF-Token": owner.csrf };
    const command = async (path: string, data: unknown) => {
      const response = await page.request.post(new URL(path, baseURL!).toString(), { headers: ownerHeaders, data });
      const body = await response.text();
      expect(response.status(), `${path}: ${body}`).toBe(201);
      return JSON.parse(body) as Record<string, unknown>;
    };
    const created = await command("/api/v1/projects", { branchId, title: projectTitle, deliveryType: "TURNKEY", scopes: ["Offline site capture"] , reason: "Create isolated S22 offline project" });
    const projectId = (created.project as { id: string }).id;
    let projectVersion = 1;
    await command(`/api/v1/projects/${projectId}/assignments`, { employeeId, expectedVersion: projectVersion, reason: "Assign offline site worker" });
    projectVersion = (await db.query<{ version: number }>('SELECT version FROM projects WHERE id=$1', [projectId])).rows[0]!.version;
    await command(`/api/v1/projects/${projectId}/lead`, { employeeId, expectedVersion: projectVersion, reason: "Appoint site worker as project lead" });
    projectVersion = (await db.query<{ version: number }>('SELECT version FROM projects WHERE id=$1', [projectId])).rows[0]!.version;
    await command(`/api/v1/projects/${projectId}/status`, { toStatus: "ACTIVE", expectedVersion: projectVersion, reason: "Activate S22 offline project" });
    const siteCommand = async (path: string, data: unknown) => {
      const response = await page.request.post(new URL(path, baseURL!).toString(), { headers: ownerHeaders, data });
      const body = await response.text();
      expect(response.status(), `${path}: ${body}`).toBe(201);
      return JSON.parse(body) as Record<string, unknown>;
    };
    const today = new Date().toISOString().slice(0, 10);
    const packageCreated = await siteCommand(`/api/v1/site/projects/${projectId}/packages`, { title: "North slab", date: today, tomorrowPlan: "Continue slab preparation", plannedPercent: "25", plannedQuantity: "12.5", unit: "m3", critical: false, expectedVersion: 0, reason: "Seed package for offline progress" });
    const secondPackageCreated = await siteCommand(`/api/v1/site/projects/${projectId}/packages`, { title: "East wall", date: today, tomorrowPlan: "Continue wall preparation", plannedPercent: "10", plannedQuantity: "8", unit: "m2", critical: false, expectedVersion: packageCreated.version as number, reason: "Seed a second package for conflict choices" });
    const folder = await command(`/api/v1/documents/projects/${projectId}/folders`, { name: "Offline site photos", confidential: false, reason: "Create supported offline photo folder" });

    await context.clearCookies();
    await context.addCookies([{ name: "sense_sid", value: actor.secret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    return { db, actor, owner, actorAccountId, projectId, projectTitle, packageId: packageCreated.id as string, secondPackageId: secondPackageCreated.id as string, folderId: folder.id as string, headers: { Cookie: `sense_sid=${actor.secret}`, Origin: baseURL!, "X-CSRF-Token": actor.csrf }, ownerHeaders: { Cookie: `sense_sid=${owner.secret}`, Origin: baseURL!, "X-CSRF-Token": owner.csrf } };
  } catch (error) {
    if (committed) await db.query('UPDATE sessions SET "revokedAt"=CURRENT_TIMESTAMP WHERE id = ANY($1::uuid[])', [[owner.id, actor.id]]);
    await db.end();
    throw error;
  }
}

test("offline SITE capture persists locally, replays once, resolves conflicts and reauthorizes access", async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(180_000);
  test.skip(process.env.S22_E2E_ENABLED !== "1" && process.env.S25_E2E_ENABLED !== "1" && process.env.S27_E2E_ENABLED !== "1", "S22, S25, or S27 browser acceptance must be enabled by its guarded dedicated test environment");
  const preview = process.env.S22_PWA_PREVIEW_URL;
  if (!preview) throw new Error("S22_E2E_ENABLED requires the production PWA preview at S22_PWA_PREVIEW_URL");
  const previewUrl = new URL(preview);
  const s22Preview = previewUrl.hostname === "localhost" && previewUrl.port === "58223";
  const s27Preview = process.env.S27_E2E_ENABLED === "1" && previewUrl.hostname === "localhost" && previewUrl.port === "58323";
  if (!s22Preview && !s27Preview) throw new Error("S22 requires its localhost:58223 preview; S27 may use only its explicitly enabled localhost:58323 preview");
  const f = await seedOfflineSite(page, context, baseURL);
  const screenshotDirectory = resolve(process.env.S22_SCREENSHOT_DIR ?? ".env.s22-tools/screenshots");
  mkdirSync(screenshotDirectory, { recursive: true });
  try {
    await context.addCookies([{ name: "sense_sid", value: f.actor.secret, url: preview, httpOnly: true, sameSite: "Strict" }]);
    await page.goto(new URL("/site", preview).toString());
    const workspace = page.locator(".site-workspace");
    await expect(workspace.getByRole("heading", { name: "Site progress and daily work" })).toBeVisible({ timeout: 20_000 });
    await workspace.getByLabel("Active Turnkey project").selectOption(f.projectId);
    await expect(workspace.getByRole("heading", { name: f.projectTitle })).toBeVisible();
    const capture = workspace.locator(".site-offline");
    await capture.getByRole("button", { name: "Prepare offline capture" }).click();
    await expect(capture.locator(".site-offline-context")).toContainText(`Offline capture prepared for ${f.projectTitle}`);

    await context.setOffline(true);
    await capture.getByLabel("Observation note").fill("North slab reinforcement checked on site");
    await capture.getByLabel("Photo upload folder").selectOption(f.folderId);
    await capture.getByLabel("Captured photos").setInputFiles({ name: "north-slab.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=", "base64") });
    await capture.getByLabel("Reason for this offline command").fill("Capture the checked reinforcement and photo");
    await capture.getByRole("button", { name: "Save offline draft" }).click();
    await expect(capture.getByText("Offline draft saved on this device.")).toBeVisible();

    const saveAction = async (action: string, fields: Array<[string, string]>, reason: string): Promise<void> => {
      await capture.getByLabel("Offline capture type").selectOption({ label: action });
      for (const [label, value] of fields) await capture.getByLabel(label).fill(value);
      await capture.getByLabel("Reason for this offline command").fill(reason);
      await capture.getByRole("button", { name: "Save offline draft" }).click();
      await expect(capture.getByText("Offline draft saved on this device.")).toBeVisible();
    };
    await saveAction("Manpower observation", [["Trade", "Masonry"], ["People counted", "4"], ["Manpower note", "North crew on slab"]], "Record today's factual masonry count");
    await saveAction("Daily report draft", [["Work completed today", "Marked north slab reinforcement"], ["Materials received", "Binding wire"], ["Issues", "None"], ["Delay causes", "None"], ["Plan for tomorrow", "Complete slab inspection"]], "Prepare an unconfirmed daily report");
    await saveAction("Open snag", [["Snag title", "Exposed reinforcement end"], ["Snag description", "One bar end remains exposed at the north edge"]], "Record a new open site snag");
    await capture.getByLabel("Offline capture type").selectOption({ label: "Package progress" });
    await capture.getByLabel("Package progress target").selectOption({ index: 1 });
    await capture.getByLabel("Actual progress (%)").fill("35");
    await capture.getByLabel("Actual quantity").fill("4.5");
    await capture.getByLabel("Material status").fill("Materials available");
    await capture.getByLabel("Blockers").fill("None");
    await capture.getByLabel("Plan for tomorrow").fill("Continue slab work");
    await capture.getByLabel("Reason for this offline command").fill("Record observed progress at the slab");
    await capture.getByRole("button", { name: "Save offline draft" }).click();
    await expect(capture.getByText("Offline draft saved on this device.")).toBeVisible();
    await expect(capture.getByRole("heading", { name: "Offline capture queue" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // Production precache must reopen the route after a cold navigation while the network is unavailable.
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker?.controller))).toBe(true);
    const cachedApiResponses = await page.evaluate(async () => {
      const names = await caches.keys();
      const keys = await Promise.all(names.map(async (name) => (await caches.open(name)).keys()));
      return keys.flat().map((request) => request.url).filter((url) => /\/api\/v1\//.test(url));
    });
    expect(cachedApiResponses).toEqual([]);
    await context.setOffline(false);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Site progress and daily work" })).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText(/Local capture only\. Server authentication and project authorization have not been checked/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("North slab reinforcement checked on site")).toBeVisible();
    await expect(page.getByText("Exposed reinforcement end")).toBeVisible();
    const savedProgress = await page.evaluate(() => new Promise<string>((resolve, reject) => {
      const request = indexedDB.open("sense-site-offline-v1", 1);
      request.onsuccess = () => { const db = request.result; const tx = db.transaction("commands", "readonly"); const all = tx.objectStore("commands").getAll(); all.onsuccess = () => { const progress = all.result.find((item: { action: string }) => item.action === "PACKAGE_PROGRESS"); resolve(String(progress?.payload.actualPercent ?? "")); db.close(); }; all.onerror = () => reject(all.error); };
      request.onerror = () => reject(request.error);
    }));
    expect(savedProgress).toBe("35");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const coldCapture = await page.locator(".site-offline").screenshot();
    await testInfo.attach(`s22-offline-cold-${testInfo.project.name}`, { body: coldCapture, contentType: "image/png" });
    writeFileSync(join(screenshotDirectory, `s22-offline-cold-${testInfo.project.name}.png`), coldCapture);
    await context.setOffline(false);
    await page.reload();
    await workspace.getByLabel("Active Turnkey project").selectOption(f.projectId);
    await expect(workspace.getByRole("heading", { name: f.projectTitle })).toBeVisible();
    await expect(capture.getByRole("button", { name: "Sync now" })).toBeEnabled();

    const commandRequests: { url: string; data: Record<string, unknown> }[] = [];
    const photoRequests: { url: string; data: Record<string, unknown> }[] = [];
    page.on("request", (request) => { if (request.url().endsWith(`/api/v1/site/projects/${f.projectId}/offline-commands`)) commandRequests.push({ url: request.url(), data: request.postDataJSON() as Record<string, unknown> }); });
    page.on("request", (request) => { if (request.url().endsWith(`/api/v1/site/projects/${f.projectId}/offline-photos`)) photoRequests.push({ url: request.url(), data: request.postDataJSON() as Record<string, unknown> }); });
    const initialSyncButton = capture.getByRole("button", { name: "Sync now" });
    if (await initialSyncButton.isEnabled()) await initialSyncButton.click();
    await expect(capture.getByText("Synchronized", { exact: true })).toHaveCount(5, { timeout: 30_000 });
    const receipts = await f.db.query<{ action: string; count: number }>('SELECT action,count(*)::int AS count FROM site_command_receipts WHERE "projectId"=$1 AND "actorId"=$2 GROUP BY action ORDER BY action', [f.projectId, f.actorAccountId]);
    expect(receipts.rows.reduce((total, row) => total + row.count, 0)).toBe(5);
    expect(receipts.rows.map((row) => row.action).sort()).toEqual(["MANPOWER", "NOTE", "PACKAGE_PROGRESS", "REPORT", "SNAG"]);
    expect((await f.db.query<{ count: number }>('SELECT count(*)::int AS count FROM site_records WHERE "projectId"=$1 AND kind IN (\'NOTE\',\'MANPOWER\',\'REPORT\',\'SNAG\')', [f.projectId])).rows[0]?.count).toBe(4);
    expect((await f.db.query<{ count: number }>('SELECT count(*)::int AS count FROM documents WHERE "projectId"=$1', [f.projectId])).rows[0]?.count).toBe(1);
    expect(commandRequests.length).toBeGreaterThanOrEqual(5);
    const replayRequest = commandRequests.find((item) => item.data.action === "NOTE")!;
    const replayResponse = await page.request.post(replayRequest.url, { headers: { "Content-Type": "application/json", ...f.headers, Origin: preview }, data: replayRequest.data });
    expect(replayResponse.status()).toBe(201);
    expect(await replayResponse.json()).toMatchObject({ replayed: true });
    expect((await f.db.query<{ count: number }>('SELECT count(*)::int AS count FROM site_command_receipts WHERE "projectId"=$1 AND "commandId"=$2::uuid', [f.projectId, replayRequest.data.commandId])).rows[0]?.count).toBe(1);
    expect(photoRequests).toHaveLength(1);
    const manifestReplay = await page.request.post(photoRequests[0]!.url, { headers: { "Content-Type": "application/json", ...f.headers, Origin: preview }, data: photoRequests[0]!.data });
    expect(manifestReplay.status()).toBe(201);
    expect(await manifestReplay.json()).toMatchObject({ uploadId: photoRequests[0]!.data.localId });

    const workspaceVersion = (await f.db.query<{ version: number }>('SELECT version FROM site_workspaces WHERE "projectId"=$1', [f.projectId])).rows[0]!.version;
    await capture.getByLabel("Offline capture type").selectOption({ label: "Package progress" });
    await capture.getByLabel("Package progress target").selectOption({ index: 1 });
    await capture.getByLabel("Actual progress (%)").fill("40");
    await capture.getByLabel("Actual quantity").fill("5");
    await capture.getByLabel("Material status").fill("Owner has current materials");
    await capture.getByLabel("Blockers").fill("None");
    await capture.getByLabel("Plan for tomorrow").fill("Continue north slab");
    await capture.getByLabel("Reason for this offline command").fill("Capture the worker's version of progress");
    await capture.getByRole("button", { name: "Save offline draft" }).click();
    await context.setOffline(true);
    await capture.getByLabel("Offline capture type").selectOption({ label: "Package progress" });
    await capture.getByLabel("Package progress target").selectOption({ index: 2 });
    await capture.getByLabel("Actual progress (%)").fill("20");
    await capture.getByLabel("Actual quantity").fill("1.5");
    await capture.getByLabel("Material status").fill("Owner has wall material");
    await capture.getByLabel("Blockers").fill("None");
    await capture.getByLabel("Plan for tomorrow").fill("Continue east wall");
    await capture.getByLabel("Reason for this offline command").fill("Capture second worker progress observation");
    await capture.getByRole("button", { name: "Save offline draft" }).click();

    await context.setOffline(true);
    const ownerProgress = await page.request.post(new URL(`/api/v1/site/packages/${f.packageId}/progress`, preview).toString(), {
      headers: { ...f.ownerHeaders, Origin: preview },
      data: { actualPercent: "45", actualQuantity: "6", qualityStatus: "PENDING", materialStatus: "Owner current observation", blockers: "None", tomorrowPlan: "Owner plan", photoIds: [], expectedVersion: workspaceVersion, reason: "Record a current server progress observation" },
    });
    expect(ownerProgress.status(), await ownerProgress.text()).toBe(201);
    const ownerProgress2 = await page.request.post(new URL(`/api/v1/site/packages/${f.secondPackageId}/progress`, preview).toString(), {
      headers: { ...f.ownerHeaders, Origin: preview },
      data: { actualPercent: "30", actualQuantity: "2", qualityStatus: "PENDING", materialStatus: "Server wall observation", blockers: "None", tomorrowPlan: "Owner wall plan", photoIds: [], expectedVersion: workspaceVersion + 1, reason: "Record current east wall progress" },
    });
    expect(ownerProgress2.status(), await ownerProgress2.text()).toBe(201);
    await context.setOffline(false);
    const conflictSyncButton = capture.getByRole("button", { name: "Sync now" });
    if (await conflictSyncButton.isEnabled()) await conflictSyncButton.click();
    await expect(capture.getByText("Conflict", { exact: true })).toHaveCount(2, { timeout: 30_000 });
    const conflictScreenshot = await capture.locator("div.site-offline-conflict").first().screenshot();
    await testInfo.attach(`s22-offline-conflicts-${testInfo.project.name}`, { body: conflictScreenshot, contentType: "image/png" });
    writeFileSync(join(screenshotDirectory, `s22-offline-conflicts-${testInfo.project.name}.png`), conflictScreenshot);
    const serverConflict = capture.locator("li").filter({ hasText: "North slab · base version" }).locator(".site-offline-conflict");
    await expect(serverConflict.getByRole("heading", { name: /Current server values · version/ })).toBeVisible();
    await expect(serverConflict.locator("dl").first()).toContainText("Owner current observation");
    await serverConflict.getByRole("button", { name: "Keep server values" }).click();
    await expect(capture.getByText("Conflict", { exact: true })).toHaveCount(1);
    await expect(capture.getByText("The server’s current record was kept. This local draft was discarded.")).toBeVisible();

    const remainingConflictSyncButton = capture.getByRole("button", { name: "Sync now" });
    if (await remainingConflictSyncButton.isEnabled()) await remainingConflictSyncButton.click();
    await expect(capture.getByText("Conflict", { exact: true })).toHaveCount(1, { timeout: 30_000 });
    const amendment = capture.locator("li").filter({ hasText: "East wall · base version" }).locator(".site-offline-conflict");
    const beforeAmendReceiptCount = (await f.db.query<{ count: number }>('SELECT count(*)::int AS count FROM site_command_receipts WHERE "projectId"=$1', [f.projectId])).rows[0]!.count;
    await amendment.getByLabel("Actual progress (%)").fill("25");
    await amendment.getByLabel("Amendment reason").fill("Use displayed server version after comparing current progress");
    await amendment.getByRole("button", { name: "Amend and retry" }).click();
    await expect(capture.getByText("Amended command saved with the displayed server version. Sync it when ready.")).toBeVisible();
    const amendSyncButton = capture.getByRole("button", { name: "Sync now" });
    if (await amendSyncButton.isEnabled()) await amendSyncButton.click();
    await expect(capture.getByText("Synchronized", { exact: true })).toHaveCount(6, { timeout: 30_000 });
    const amendedReceipts = (await f.db.query<{ count: number }>('SELECT count(*)::int AS count FROM site_command_receipts WHERE "projectId"=$1', [f.projectId])).rows[0]!.count;
    expect(amendedReceipts).toBe(beforeAmendReceiptCount + 1);
    const latestProgress = await f.db.query<{ version: number; actualPercent: string; reason: string }>(`SELECT r.version,r.data->>'actualPercent' AS "actualPercent",h.reason FROM site_records r JOIN site_history h ON h."subjectId"=r.id AND h."subjectVersion"=r.version WHERE r.id=$1`, [f.secondPackageId]);
    expect(latestProgress.rows[0]).toMatchObject({ actualPercent: "25", reason: "Use displayed server version after comparing current progress" });

    const screenshot = await capture.screenshot();
    await testInfo.attach(`s22-offline-site-${testInfo.project.name}`, { body: screenshot, contentType: "image/png" });
    writeFileSync(join(screenshotDirectory, `s22-offline-site-${testInfo.project.name}.png`), screenshot);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await context.setOffline(true);
    await capture.getByLabel("Offline capture type").selectOption({ label: "Note" });
    await capture.getByLabel("Observation note").fill("Pending note after worker access ends");
    await capture.getByLabel("Reason for this offline command").fill("Capture while offline before access check");
    await capture.getByRole("button", { name: "Save offline draft" }).click();
    const employeeId = (await f.db.query<{ id: string }>('SELECT id FROM employees WHERE "accountId"=$1', [f.actorAccountId])).rows[0]!.id;
    const ownerAccountId = (await f.db.query<{ accountId: string }>('SELECT "accountId" FROM sessions WHERE id=$1', [f.owner.id])).rows[0]!.accountId;
    await f.db.query('UPDATE employee_permission_overrides SET "revokedAt"=CURRENT_TIMESTAMP,"revokedById"=$2,"revocationReason"=\'S22 revoked site work acceptance fixture\' WHERE "employeeId"=$1 AND "permissionKey"=\'site.work\' AND "revokedAt" IS NULL', [employeeId, ownerAccountId]);
    const deniedReplayPromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/site/projects/${f.projectId}/offline-commands`) && response.request().method() === "POST");
    await context.setOffline(false);
    expect((await deniedReplayPromise).status()).toBe(403);
    await expect(capture.getByRole("status").filter({ hasText: "Offline capture is unavailable because current site work access is not confirmed." })).toBeVisible({ timeout: 30_000 });
    const localQueue = await page.evaluate(() => new Promise<{ commands: number; contexts: number; pointer: string | null }>((resolve, reject) => {
      const request = indexedDB.open("sense-site-offline-v1", 1);
      request.onblocked = () => reject(new Error("Offline DB remained blocked after access revocation"));
      request.onsuccess = () => { const db = request.result; const tx = db.transaction(["commands", "contexts"], "readonly"); const commands = tx.objectStore("commands").count(); const contexts = tx.objectStore("contexts").count(); let commandCount = 0; let contextCount = 0; commands.onsuccess = () => { commandCount = commands.result; }; contexts.onsuccess = () => { contextCount = contexts.result; }; tx.oncomplete = () => { resolve({ commands: commandCount, contexts: contextCount, pointer: localStorage.getItem("sense-site-offline-pointer-v1") }); db.close(); }; tx.onerror = () => reject(tx.error); };
      request.onerror = () => reject(request.error);
    }));
    expect(localQueue).toEqual({ commands: 0, contexts: 0, pointer: null });
  } finally {
    try { await context.setOffline(false); } catch { /* Playwright may already have closed the timed-out context. */ }
    await f.db.query('UPDATE sessions SET "revokedAt"=CURRENT_TIMESTAMP WHERE id = ANY($1::uuid[])', [[f.owner.id, f.actor.id]]);
    await f.db.end();
  }
});

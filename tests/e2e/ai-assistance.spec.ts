import { expect, test } from "@playwright/test";
import { isS27DisposableTestTarget, matchesS27DisposableServer } from "../../apps/api/src/s27-disposable-test-target.js";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { lstat, mkdir } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";

const fixtureUrl = process.env.DATABASE_URL;
const disposableS27Database = Boolean(process.env.DATABASE_URL && isS27DisposableTestTarget("DATABASE_URL", process.env.DATABASE_URL));
const screenshotRoot = resolve(process.env.S27_SCREENSHOT_DIR ?? ".env.s27-tools/runs/missing/screenshots");
type QueryResult<T> = { rows: T[]; rowCount: number | null };
type FixtureDatabase = { connect(): Promise<void>; query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<QueryResult<T>>; end(): Promise<void> };

test("S27 Owner creates, decides, and records a source-verified assignment observation", async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);
  test.skip(process.env.S27_E2E_ENABLED !== "1" || !fixtureUrl, "Set S27_E2E_ENABLED=1 with the dedicated S27 PostgreSQL fixture");
  const parsed = new URL(fixtureUrl!);
  if (!disposableS27Database && (process.env.S27_E2E_ENABLED !== "1" || parsed.hostname !== "127.0.0.1" || parsed.port !== "57433" || !/^\/sense_s27_main_s27_[a-z0-9_]+_test$/.test(parsed.pathname))) throw new Error("S27 browser acceptance requires the explicitly enabled exact S27 main PostgreSQL test target on loopback port 57433");
  const runId = process.env.S27_RUN_ID ?? "";
  if (!/^[a-z0-9-]{8,64}$/i.test(runId)) throw new Error("S27_SCREENSHOT_DIR requires the unique S27_RUN_ID");
  const screenshotBase = resolve(".env.s27-tools/runs");
  const screenshotRelative = relative(screenshotBase, screenshotRoot);
  if (!screenshotRelative.startsWith(`${runId}${sep}`) || screenshotRelative.split(sep).at(-1) !== "screenshots") throw new Error("S27 screenshots must be contained in the current unique run directory");
  const require = createRequire(resolve("apps/api/package.json"));
  const { Client } = require("pg") as { Client: new (config: { connectionString: string }) => FixtureDatabase };
  const db = new Client({ connectionString: fixtureUrl! });
  const suffix = randomUUID().slice(0, 8);
  const digest = (value: string) => createHash("sha256").update(value).digest("hex");
  const ownerToken = randomBytes(32).toString("base64url"), csrf = createHmac("sha256", ownerToken).update("csrf").digest("base64url");
  let ownerId: string, organizationId: string, branchId: string, teamId: string, employeeId: string;
  await db.connect();
  if (disposableS27Database) {
    const identity = await db.query<{ database: string; port: number }>("SELECT current_database() AS database, inet_server_port() AS port");
    if (!matchesS27DisposableServer(process.env.DATABASE_URL!, identity.rows[0]!.database, identity.rows[0]!.port)) throw new Error("Connected PostgreSQL server does not match the guarded S27 disposable target");
  }
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(61027001)");
    organizationId = (await db.query<{ id: string }>("SELECT id FROM organizations ORDER BY id LIMIT 1")).rows[0]?.id ?? "";
    if (!organizationId) { organizationId = randomUUID(); await db.query('INSERT INTO organizations(id,name,"updatedAt") VALUES($1,$2,CURRENT_TIMESTAMP)', [organizationId, `S27 browser ${suffix}`]); }
    ownerId = (await db.query<{ id: string }>("SELECT id FROM accounts WHERE kind='OWNER' AND state='ACTIVE' ORDER BY id LIMIT 1")).rows[0]?.id ?? "";
    if (!ownerId) { ownerId = randomUUID(); await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'OWNER\',\'ACTIVE\',CURRENT_TIMESTAMP)', [ownerId, `s27-owner-${suffix}@example.test`]); }
    const keyCount = (await db.query<{ count: number }>('SELECT count(*)::int AS count FROM passkey_credentials WHERE "accountId"=$1 AND "revokedAt" IS NULL', [ownerId])).rows[0]?.count ?? 0;
    for (let index = keyCount; index < 2; index += 1) await db.query('INSERT INTO passkey_credentials(id,"credentialId","accountId","publicKey") VALUES($1,$2,$3,$4)', [randomUUID(), randomUUID(), ownerId, randomBytes(32)]);
    if (!(await db.query('SELECT id FROM owner_recovery_codes WHERE "accountId"=$1 AND "usedAt" IS NULL AND "replacedAt" IS NULL AND "acknowledgedAt" IS NOT NULL LIMIT 1', [ownerId])).rowCount) await db.query('INSERT INTO owner_recovery_codes(id,"accountId","codeHash","acknowledgedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [randomUUID(), ownerId, digest(randomUUID())]);
    branchId = randomUUID(); teamId = randomUUID();
    await db.query('INSERT INTO branches(id,"organizationId",name,"updatedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [branchId, organizationId, `S27 branch ${suffix}`]);
    await db.query('INSERT INTO teams(id,"organizationId","branchId",name,"updatedAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)', [teamId, organizationId, branchId, `S27 team ${suffix}`]);
    const staffAccountId = randomUUID(); employeeId = randomUUID();
    await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'STAFF\',\'ACTIVE\',CURRENT_TIMESTAMP)', [staffAccountId, `s27-staff-${suffix}@example.test`]);
    await db.query('INSERT INTO employees(id,"organizationId","accountId","homeBranchId","homeTeamId","hiredAt","updatedAt") VALUES($1,$2,$3,$4,$5,CURRENT_DATE,CURRENT_TIMESTAMP)', [employeeId, organizationId, staffAccountId, branchId, teamId]);
    await db.query('INSERT INTO sessions(id,"accountId","tokenHash","csrfTokenHash","expiresAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP+interval \'2 hours\')', [randomUUID(), ownerId, digest(ownerToken), digest(csrf)]);
    await db.query("COMMIT");
  } catch (error) { await db.query("ROLLBACK"); throw error; }
  finally { await db.end(); }

  await mkdir(screenshotRoot, { recursive: true });
  const screenshotPath = resolve(screenshotRoot, `s27-assistance-${testInfo.project.name}.png`);
  const screenshotFileRelative = relative(screenshotRoot, screenshotPath);
  if (screenshotFileRelative.startsWith(`..${sep}`) || screenshotFileRelative === "..") throw new Error("S27 screenshot output must remain within the run screenshot directory");
  try { await lstat(screenshotPath); throw new Error("S27 project screenshot already exists in the current run"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  await context.addCookies([{ name: "sense_sid", value: ownerToken, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
  const targetDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const createTask = await page.request.post("/api/v1/tasks", { headers: { "X-CSRF-Token": csrf, Origin: new URL(baseURL!).origin }, data: { title: `S27 assignment ${suffix}`, type: "NON_PROJECT", priority: "MEDIUM", targetDate, ownerEmployeeId: employeeId, reason: "S27 isolated browser assignment fixture" } });
  expect(createTask.status()).toBe(201);
  const task = await createTask.json() as { id: string };
  const beforeDb = new Client({ connectionString: fixtureUrl! }); await beforeDb.connect();
  const before = (await beforeDb.query<{ primaryOwnerEmployeeId: string; version: number }>('SELECT "primaryOwnerEmployeeId",version FROM tasks WHERE id=$1', [task.id])).rows[0];
  await beforeDb.end();

  await page.goto("/assistance");
  await expect(page.getByRole("heading", { name: "Evidence assistance" })).toBeVisible();
  await page.getByLabel("Request type").selectOption("ASSIGNMENT");
  const taskSelect = page.getByRole("combobox", { name: "Task", exact: true });
  await expect(taskSelect.locator("option").filter({ hasText: `S27 assignment ${suffix}` })).toHaveText(`S27 assignment ${suffix}`);
  await taskSelect.selectOption(task.id);
  const day = new Date().toISOString().slice(0, 10);
  await page.getByLabel("From", { exact: true }).fill(day);
  await page.getByLabel("To", { exact: true }).fill(day);
  await page.getByLabel("Request reason").fill("S27 browser evidence review");
  const runResponse = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/v1/ai/runs");
  await page.getByRole("button", { name: "Generate evidence summary" }).click();
  expect((await runResponse).status()).toBe(201);
  await expect(page.getByText("Explainable assignment candidates", { exact: false })).toBeVisible();
  await page.locator(`input[type=radio][value="${employeeId}"]`).check();
  await page.getByLabel("Decision reason").fill("S27 human accepts the current eligible candidate");
  const decisionResponse = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname.match(/\/api\/v1\/ai\/runs\/[^/]+\/decisions$/));
  await page.getByRole("button", { name: "Accept suggestion" }).click();
  expect((await decisionResponse).status()).toBe(201);
  await expect(page.getByRole("heading", { name: "Record a later source observation" })).toBeVisible();
  await page.getByLabel("Outcome reason").fill("S27 observed the still-current task assignment");
  const outcomeResponse = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname.match(/\/api\/v1\/ai\/runs\/[^/]+\/outcomes$/));
  await page.getByRole("button", { name: "Record verified outcome" }).click();
  expect((await outcomeResponse).status()).toBe(201);
  await expect(page.getByText(/This records current state; it does not imply the suggestion caused it\./)).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "S27 observed the still-current task assignment" })).toBeVisible({ timeout: 30_000 });
  const afterDb = new Client({ connectionString: fixtureUrl! }); await afterDb.connect();
  const after = (await afterDb.query<{ primaryOwnerEmployeeId: string; version: number }>('SELECT "primaryOwnerEmployeeId",version FROM tasks WHERE id=$1', [task.id])).rows[0];
  await afterDb.end();
  expect(after).toEqual(before);
  await page.screenshot({ path: screenshotPath, fullPage: true });
});

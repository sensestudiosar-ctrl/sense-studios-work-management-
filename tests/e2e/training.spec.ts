import { test, expect } from "@playwright/test";
import { isS27DisposableTestTarget, matchesS27DisposableServer } from "../../apps/api/src/s27-disposable-test-target.js";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { s18ScreenshotPath } from "./s18-screenshot.js";

const databaseUrl = process.env.DATABASE_URL;
const disposableS27Database = Boolean(process.env.DATABASE_URL && isS27DisposableTestTarget("DATABASE_URL", process.env.DATABASE_URL));
type PgClient = { connect(): Promise<void>; query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>; end(): Promise<void> };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

test("Training assignment, authored assessment, named review, effectiveness and separate skill request persist", async ({ page, context, baseURL }) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(30_000);
  if (!databaseUrl) throw new Error("DATABASE_URL must point to the dedicated local S18 test database; Training browser acceptance cannot silently skip");
  const parsed = new URL(databaseUrl);
  const localFixture = ["localhost", "127.0.0.1"].includes(parsed.hostname) && parsed.port === "57433" && /^[a-z0-9_]+_test$/.test(parsed.pathname.slice(1)) || disposableS27Database;
  const ciFixture = process.env.CI === "true" && ["localhost", "127.0.0.1"].includes(parsed.hostname) && parsed.port === "56433" && /^sense_[a-z0-9_]+_ci_test$/.test(parsed.pathname.slice(1));
  if (!localFixture && !ciFixture) throw new Error("Training browser acceptance requires a dedicated local or CI PostgreSQL test database");
  const require = createRequire(resolve("apps/api/package.json"));
  const { Client } = require("pg") as { Client: new (options: { connectionString: string }) => PgClient };
  const db = new Client({ connectionString: databaseUrl });
  const suffix = randomUUID(), branchId = randomUUID(), teamId = randomUUID(), managerEmployeeId = randomUUID(), employeeId = randomUUID();
  const managerAccountId = randomUUID(), employeeAccountId = randomUUID();
  const ownerSecret = randomBytes(32).toString("base64url"), managerSecret = randomBytes(32).toString("base64url"), employeeSecret = randomBytes(32).toString("base64url");
  const ownerCsrf = createHmac("sha256", ownerSecret).update("csrf").digest("base64url"), managerCsrf = createHmac("sha256", managerSecret).update("csrf").digest("base64url"), employeeCsrf = createHmac("sha256", employeeSecret).update("csrf").digest("base64url");
  const ownerSessionId = randomUUID(), managerSessionId = randomUUID(), employeeSessionId = randomUUID();
  let ownerAccountId: string, organizationId: string;
  await db.connect();
  if (disposableS27Database) {
    const identity = await db.query<{ database: string; port: number }>("SELECT current_database() AS database, inet_server_port() AS port");
    if (!matchesS27DisposableServer(process.env.DATABASE_URL!, identity.rows[0]!.database, identity.rows[0]!.port)) throw new Error("Connected PostgreSQL server does not match the guarded S27 disposable target");
  }
  try {
    await db.query("BEGIN"); await db.query("SELECT pg_advisory_xact_lock(61001805)");
    const org = await db.query<{ id: string }>("SELECT id FROM organizations LIMIT 1");
    organizationId = org.rows[0]?.id ?? randomUUID();
    if (!org.rows[0]) await db.query('INSERT INTO organizations(id,name,"updatedAt") VALUES($1,$2,CURRENT_TIMESTAMP)', [organizationId, `S18 training ${suffix}`]);
    const owner = await db.query<{ id: string }>("SELECT id FROM accounts WHERE kind='OWNER' AND state='ACTIVE' LIMIT 1");
    ownerAccountId = owner.rows[0]?.id ?? randomUUID();
    if (!owner.rows[0]) await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'OWNER\',\'ACTIVE\',CURRENT_TIMESTAMP)', [ownerAccountId, `s18-training-owner-${suffix}@example.test`]);
    await db.query('INSERT INTO branches(id,"organizationId",name,"updatedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [branchId, organizationId, `S18 training branch ${suffix}`]);
    await db.query('INSERT INTO teams(id,"organizationId","branchId",name,"updatedAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)', [teamId, organizationId, branchId, `S18 training team ${suffix}`]);
    await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'STAFF\',\'ACTIVE\',CURRENT_TIMESTAMP),($3,$4,\'STAFF\',\'ACTIVE\',CURRENT_TIMESTAMP)', [managerAccountId, `s18-training-manager-${suffix}@example.test`, employeeAccountId, `s18-training-employee-${suffix}@example.test`]);
    await db.query('INSERT INTO employees(id,"organizationId","accountId","homeBranchId","homeTeamId","hiredAt","updatedAt") VALUES($1,$2,$3,$4,$5,CURRENT_DATE,CURRENT_TIMESTAMP),($6,$2,$7,$4,$5,CURRENT_DATE,CURRENT_TIMESTAMP)', [managerEmployeeId, organizationId, managerAccountId, branchId, teamId, employeeId, employeeAccountId]);
    await db.query('UPDATE employees SET "reportsToId"=$1 WHERE id=$2', [managerEmployeeId, employeeId]);
    const permissions = ["training.view", "training.manage", "library.view", "skills.view", "skills.manage"];
    for (const permission of permissions) await db.query('INSERT INTO employee_permission_overrides(id,"organizationId","employeeId","permissionKey",effect,"scopeKind","branchId","teamId",reason) VALUES($1,$2,$3,$4,\'ALLOW\',\'TEAM\',$5,$6,$7)', [randomUUID(), organizationId, managerEmployeeId, permission, branchId, teamId, `S18 training test grant ${permission}`]);
    await db.query('INSERT INTO employee_permission_overrides(id,"organizationId","employeeId","permissionKey",effect,"scopeKind","branchId","teamId",reason) VALUES($1,$2,$3,\'library.view\',\'ALLOW\',\'TEAM\',$4,$5,$6)', [randomUUID(), organizationId, employeeId, branchId, teamId, "S18 trainee access to assigned module"]);
    await db.query('INSERT INTO sessions(id,"accountId","tokenHash","csrfTokenHash","expiresAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP+interval \'2 hours\'),($5,$6,$7,$8,CURRENT_TIMESTAMP+interval \'2 hours\'),($9,$10,$11,$12,CURRENT_TIMESTAMP+interval \'2 hours\')', [ownerSessionId, ownerAccountId, digest(ownerSecret), digest(ownerCsrf), managerSessionId, managerAccountId, digest(managerSecret), digest(managerCsrf), employeeSessionId, employeeAccountId, digest(employeeSecret), digest(employeeCsrf)]);
    const keyCount = await db.query<{ count: string }>('SELECT count(*)::text AS count FROM passkey_credentials WHERE "accountId"=$1 AND "revokedAt" IS NULL', [ownerAccountId]);
    for (let i = Number(keyCount.rows[0]?.count ?? 0); i < 2; i += 1) await db.query('INSERT INTO passkey_credentials(id,"credentialId","accountId","publicKey") VALUES($1,$2,$3,$4)', [randomUUID(), randomUUID(), ownerAccountId, randomBytes(32)]);
    const recovery = await db.query('SELECT id FROM owner_recovery_codes WHERE "accountId"=$1 AND "usedAt" IS NULL AND "replacedAt" IS NULL AND "acknowledgedAt" IS NOT NULL LIMIT 1', [ownerAccountId]);
    if (!recovery.rowCount) await db.query('INSERT INTO owner_recovery_codes(id,"accountId","codeHash","acknowledgedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [randomUUID(), ownerAccountId, digest(randomUUID())]);
    await db.query("COMMIT");

    const api = async (secret: string, csrf: string, path: string, method: "GET" | "POST" = "GET", body?: unknown) => {
      const response = await page.request.fetch(`/api/v1${path}`, { method, headers: { Cookie: `sense_sid=${secret}`, Origin: baseURL!, ...(method === "POST" ? { "x-csrf-token": csrf } : {}) }, ...(body === undefined ? {} : { data: body }) });
      expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBe(true);
      return response.json() as Promise<Record<string, unknown>>;
    };
    const gotoLearning = async () => {
      const trainingSetup = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/training/setup");
      await page.goto("/learning");
      const response = await trainingSetup;
      expect(response.ok(), `Training setup: ${await response.text()}`).toBe(true);
    };
    const moduleTitle = `Studio safety module ${suffix.slice(0, 8)}`;
    const created = await api(ownerSecret, ownerCsrf, "/library", "POST", {
      commandId: randomUUID(), reason: "Create explicit authored training assessment", kind: "MODULE", title: moduleTitle, category: "Studio", audience: "TEAM", branchId, teamId,
      content: { blocks: [{ type: "TEXT", text: "Inspect the setup, identify the safe sequence, and confirm the work area is clear." }], assessment: { criteria: "Explain the safe setup sequence and identify the release check.", quiz: [{ id: "safe-sequence", prompt: "Which action comes first?", options: [{ id: "inspect", label: "Inspect the work area" }, { id: "secret-key-alpha", label: "Skip straight to cutting" }], correctOptionIds: ["inspect"] }], minimumCorrect: 1, practicalRequired: false } }, acknowledgementRequired: false,
    });
    const recordId = String((created.record as { id: string }).id), draftVersionId = String((created.version as { id: string }).id);
    expect(recordId).toMatch(/^[0-9a-f-]{36}$/i); expect(draftVersionId).toMatch(/^[0-9a-f-]{36}$/i);
    await api(ownerSecret, ownerCsrf, `/library/${recordId}/activate`, "POST", { commandId: randomUUID(), expectedVersion: 1, reason: "Activate authored training module" });
    const skill = await api(ownerSecret, ownerCsrf, "/skills/catalogue", "POST", { commandId: randomUUID(), name: `Safe setup ${suffix.slice(0, 8)}`, reason: "Create linked skill for separate approval workflow" });
    const skillId = String(skill.id);

    await context.addCookies([{ name: "sense_sid", value: managerSecret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    const session = await page.request.get("/api/v1/auth/session", { headers: { Cookie: `sense_sid=${managerSecret}` } });
    expect(session.status(), await session.text()).toBe(200);
    await gotoLearning();
    const workspace = page.locator(".training-workspace");
    await expect(workspace.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
    const assign = workspace.locator(".training-panel").filter({ has: page.getByRole("heading", { name: "Assign training" }) });
    await assign.getByLabel("Employee").selectOption(employeeId);
    await assign.getByLabel("Module").selectOption(draftVersionId);
    await assign.getByLabel("Named reviewer").selectOption(ownerAccountId);
    await assign.getByLabel("Assignment reason").fill("Assign the authored safety module for observed practice");
    await assign.getByLabel("Recommendation reason (optional)").fill("Completion may support a later verified skill request");
    const assignResponse = page.waitForResponse(response => response.url().endsWith("/api/v1/training/assignments") && response.request().method() === "POST");
    await assign.getByRole("button", { name: "Assign", exact: true }).click();
    const assignedResponse = await assignResponse;
    expect(assignedResponse.ok(), await assignedResponse.text()).toBe(true);
    const assignmentId = String((await assignedResponse.json() as { id: string }).id);
    await expect(workspace.getByRole("heading", { name: `${moduleTitle} · Version 1` })).toBeVisible();
    await expect(workspace.getByText("Quiz threshold: 1 correct out of 1.")).toBeVisible();
    const managerModuleDetail = await page.request.get(`/api/v1/training/assignments/${assignmentId}`, { headers: { Cookie: `sense_sid=${managerSecret}` } });
    const managerReadDetail = JSON.stringify(await managerModuleDetail.json());
    expect(managerReadDetail).not.toContain("correctOptionIds");
    const reviewerModuleDetail = await page.request.get(`/api/v1/training/assignments/${assignmentId}`, { headers: { Cookie: `sense_sid=${ownerSecret}` } });
    const revealedDetail = await reviewerModuleDetail.json() as { module: { content: { assessment: { quiz: Array<Record<string, unknown>> } } } };
    expect(revealedDetail.module.content.assessment.quiz[0]).toHaveProperty("correctOptionIds");
    const exactModule = await db.query<{ id: string; version: number; publishedVersionId: string }>('SELECT v.id,v.version,r."publishedVersionId" FROM library_versions v JOIN library_records r ON r.id=v."recordId" WHERE v.id=$1', [draftVersionId]);
    expect(exactModule.rows).toEqual([{ id: draftVersionId, version: 1, publishedVersionId: draftVersionId }]);

    await context.clearCookies(); await context.addCookies([{ name: "sense_sid", value: employeeSecret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    await gotoLearning();
    const traineeWorkspace = page.locator(".training-workspace");
    await expect(traineeWorkspace.getByRole("heading", { name: `${moduleTitle} · Version 1` })).toBeVisible();
    const traineeDetail = await page.request.get(`/api/v1/training/assignments/${assignmentId}`, { headers: { Cookie: `sense_sid=${employeeSecret}` } });
    const redactedDetail = JSON.stringify(await traineeDetail.json());
    expect(redactedDetail).not.toContain("correctOptionIds");
    await traineeWorkspace.getByLabel("Inspect the work area").check();
    await traineeWorkspace.getByLabel("Submission note").fill("I inspected the work area and followed the documented release check.");
    await traineeWorkspace.locator(".training-action").getByLabel("Reason").fill("Submit completed safety assessment");
    const submitResponse = page.waitForResponse(response => response.url().endsWith(`/api/v1/training/assignments/${assignmentId}/submissions`) && response.request().method() === "POST");
    await traineeWorkspace.getByRole("button", { name: "Submit for review" }).click();
    const submission = await submitResponse;
    expect(submission.ok(), await submission.text()).toBe(true);
    const submitted = await db.query<{ state: string; version: number; questionId: string; optionIds: string[]; quizCorrect: number }>(`SELECT a.state::text AS state,a.version,x.payload->'answers'->0->>'questionId' AS "questionId",ARRAY(SELECT jsonb_array_elements_text(x.payload->'answers'->0->'optionIds')) AS "optionIds",(x.payload->>'quizCorrect')::int AS "quizCorrect" FROM training_assignments a JOIN training_attempts x ON x."assignmentId"=a.id AND x.kind='SUBMISSION' WHERE a.id=$1`, [assignmentId]);
    expect(submitted.rows).toEqual([{ state: "SUBMITTED", version: 2, questionId: "safe-sequence", optionIds: ["inspect"], quizCorrect: 1 }]);
    const submissionAudit = await db.query<{ payload: string }>(`SELECT payload::text FROM training_attempts WHERE "assignmentId"=$1`, [assignmentId]);
    expect(submissionAudit.rows.map(row => row.payload).join(" ")).not.toContain("correctOptionIds");

    await context.clearCookies(); await context.addCookies([{ name: "sense_sid", value: ownerSecret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    await gotoLearning();
    const reviewerWorkspace = page.locator(".training-workspace");
    await reviewerWorkspace.getByRole("combobox", { name: "Assignment", exact: true }).selectOption(assignmentId);
    await expect(reviewerWorkspace.getByRole("heading", { name: `${moduleTitle} · Version 1` })).toBeVisible();
    await reviewerWorkspace.getByLabel("Observation").fill("The employee explained the safe sequence and verified the release condition.");
    await reviewerWorkspace.getByLabel("Decision reason").fill("Authored quiz threshold met and explanation observed");
    const assessResponse = page.waitForResponse(response => response.url().endsWith(`/api/v1/training/assignments/${assignmentId}/assessments`) && response.request().method() === "POST");
    await reviewerWorkspace.getByRole("button", { name: "Pass and complete" }).click();
    const assessment = await assessResponse;
    expect(assessment.ok(), await assessment.text()).toBe(true);
    const completed = await db.query<{ state: string; version: number; outcome: string; observation: string }>(`SELECT a.state::text AS state,a.version,x.payload->>'outcome' AS outcome,x.payload->>'observation' AS observation FROM training_assignments a JOIN training_attempts x ON x."assignmentId"=a.id AND x.kind='ASSESSMENT' WHERE a.id=$1`, [assignmentId]);
    expect(completed.rows).toEqual([{ state: "COMPLETED", version: 3, outcome: "PASSED", observation: "The employee explained the safe sequence and verified the release condition." }]);

    await reviewerWorkspace.getByLabel("Date observed").fill("2026-10-02");
    await reviewerWorkspace.getByLabel("Observation", { exact: true }).fill("The employee repeated the safety check unaided during a later task.");
    await reviewerWorkspace.locator(".training-action").getByLabel("Reason").last().fill("Record the dated effectiveness review");
    const effectivenessResponse = page.waitForResponse(response => response.url().endsWith(`/api/v1/training/assignments/${assignmentId}/effectiveness`) && response.request().method() === "POST");
    await reviewerWorkspace.getByRole("button", { name: "Record observation" }).click();
    const effectiveness = await effectivenessResponse;
    expect(effectiveness.ok(), await effectiveness.text()).toBe(true);
    await expect(reviewerWorkspace).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
    await expect(reviewerWorkspace.getByText(/2026-10-02 · The employee repeated the safety check unaided/)).toBeVisible();
    const effectivenessPersisted = await db.query<{ kind: string; date: string | null; observation: string | null }>(`SELECT kind::text,payload->>'date' AS date,coalesce(payload->>'observation',payload->>'note') AS observation FROM training_attempts WHERE "assignmentId"=$1 ORDER BY sequence`, [assignmentId]);
    expect(effectivenessPersisted.rows).toEqual([{ kind: "SUBMISSION", date: null, observation: "I inspected the work area and followed the documented release check." }, { kind: "ASSESSMENT", date: null, observation: "The employee explained the safe sequence and verified the release condition." }, { kind: "EFFECTIVENESS", date: "2026-10-02", observation: "The employee repeated the safety check unaided during a later task." }]);
    const reviewerSetups = Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/training/setup"),
      page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/skills/setup"),
    ]);
    await page.reload();
    const [reviewerTrainingSetup, reviewerSkillsSetup] = await reviewerSetups;
    expect(reviewerTrainingSetup.ok(), await reviewerTrainingSetup.text()).toBe(true);
    expect(reviewerSkillsSetup.ok(), await reviewerSkillsSetup.text()).toBe(true);
    await expect(reviewerWorkspace.getByRole("combobox", { name: "Assignment", exact: true })).toBeVisible({ timeout: 30_000 });
    await reviewerWorkspace.getByRole("combobox", { name: "Assignment", exact: true }).selectOption(assignmentId);
    await expect(reviewerWorkspace.getByRole("heading", { name: `${moduleTitle} · Version 1` })).toBeVisible();
    await expect(reviewerWorkspace.getByText(/2026-10-02 · The employee repeated the safety check unaided/)).toBeVisible();
    await expect(reviewerWorkspace.getByText("Quiz result: 1 of 1 correct")).toBeVisible();

    await context.clearCookies(); await context.addCookies([{ name: "sense_sid", value: managerSecret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    const managerSetups = Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/training/setup"),
      page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/skills/setup"),
    ]);
    await page.reload();
    const [managerTrainingSetup, managerSkillsSetup] = await managerSetups;
    expect(managerTrainingSetup.ok(), await managerTrainingSetup.text()).toBe(true);
    expect(managerSkillsSetup.ok(), await managerSkillsSetup.text()).toBe(true);
    const managerWorkspace = page.locator(".training-workspace");
    await expect(managerWorkspace.getByRole("combobox", { name: "Assignment", exact: true })).toBeVisible({ timeout: 30_000 });
    await managerWorkspace.getByRole("combobox", { name: "Assignment", exact: true }).selectOption(assignmentId);
    await expect(managerWorkspace.getByRole("heading", { name: `${moduleTitle} · Version 1` })).toBeVisible();
    await expect(managerWorkspace.getByText(/2026-10-02 · The employee repeated the safety check unaided/)).toBeVisible();
    const recommendation = managerWorkspace.getByRole("region", { name: "Skill recommendation" });
    await recommendation.getByRole("combobox", { name: "Skill", exact: true }).selectOption(skillId);
    await recommendation.getByRole("combobox", { name: "Requested official level", exact: true }).selectOption("BEGINNER");
    await recommendation.getByRole("combobox", { name: "Named approver", exact: true }).selectOption(ownerAccountId);
    await recommendation.getByLabel("Reason", { exact: true }).fill("Completed training supports a separate beginner skill review");
    const skillResponse = page.waitForResponse(response => response.url().endsWith("/api/v1/skills/requests") && response.request().method() === "POST");
    await recommendation.getByRole("button", { name: "Request skill rating" }).click();
    const skillRequest = await skillResponse;
    expect(skillRequest.ok(), await skillRequest.text()).toBe(true);
    const requestId = String((await skillRequest.json() as { id: string }).id);
    await expect(managerWorkspace.getByText(/PENDING · BEGINNER/)).toBeVisible();
    const sourceBound = await db.query<{ trainingSourceId: string; expectedRatingVersion: number; requestState: string; ratingCount: string }>(`SELECT r."trainingSourceId",r."expectedRatingVersion",p.state::text AS "requestState",(SELECT count(*)::text FROM skill_ratings sr WHERE sr."employeeId"=$2 AND sr."skillId"=r."skillId") AS "ratingCount" FROM skill_change_requests r JOIN approval_requests p ON p.id=r."approvalRequestId" WHERE r.id=$1`, [requestId, employeeId]);
    expect(sourceBound.rows).toEqual([{ trainingSourceId: assignmentId, expectedRatingVersion: 0, requestState: "PENDING", ratingCount: "0" }]);
    const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.width);
    await page.screenshot({ path: await s18ScreenshotPath(`training-${test.info().project.name}.png`), fullPage: true });
  } finally { await db.end(); }
});

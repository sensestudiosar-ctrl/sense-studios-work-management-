import { expect, test } from "@playwright/test";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

type FixtureDatabase = {
  connect(): Promise<void>;
  query<Row extends Record<string, unknown> = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{ rows: Row[]; rowCount: number | null }>;
  end(): Promise<void>;
};

test("Turnkey production release persists exact approved inputs through distinct cost/procurement decisions and progress", async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(180_000);
  test.skip(!process.env.DATABASE_URL || !process.env.NAS_ROOT, "An isolated S19 PostgreSQL database and NAS_ROOT are required");
  const databaseUrl = new URL(process.env.DATABASE_URL!);
  const isolatedS19 = /^\/sense_s19_[a-z0-9_]*_test$/.test(databaseUrl.pathname);
  const combinedS15S19 = /^\/sense_s15_s19_[a-z0-9_]*_test$/.test(databaseUrl.pathname)
    && (process.env.S19_E2E_ENABLED === "1" || process.env.S15_E2E_ENABLED === "1");
  const explicitlyEnabledS25Database = process.env.S25_E2E_ENABLED === "1" && ["localhost", "127.0.0.1"].includes(databaseUrl.hostname) && ["56433", "57433"].includes(databaseUrl.port) && /^\/sense_s25_main_s25_[a-z0-9_]+_test$/i.test(databaseUrl.pathname);
  const explicitlyEnabledS26Database = process.env.S26_E2E_ENABLED === "1" && ["localhost", "127.0.0.1"].includes(databaseUrl.hostname) && databaseUrl.port === "57433" && /^\/sense_s26_main_s26_[a-z0-9_]+_test$/i.test(databaseUrl.pathname);
  const explicitlyEnabledS27Database = process.env.S27_E2E_ENABLED === "1" && databaseUrl.hostname === "127.0.0.1" && databaseUrl.port === "57433" && /^\/sense_s27_main_s27_[a-z0-9_]+_test$/.test(databaseUrl.pathname);
  if (!["localhost", "127.0.0.1"].includes(databaseUrl.hostname) || ((!explicitlyEnabledS25Database && !explicitlyEnabledS26Database && !explicitlyEnabledS27Database) && databaseUrl.port !== "56433") || !(isolatedS19 || combinedS15S19 || explicitlyEnabledS25Database || explicitlyEnabledS26Database || explicitlyEnabledS27Database)) {
    throw new Error("Turnkey browser acceptance requires localhost port 56433 and an isolated sense_s19_*_test DB or explicitly enabled sense_s15_s19_*_test DB");
  }
  const require = createRequire(resolve("apps/api/package.json"));
  const { Client } = require("pg") as { Client: new (config: { connectionString: string }) => FixtureDatabase };
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const suffix = randomUUID();
  const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
  const auth = () => {
    const secret = randomBytes(32).toString("base64url");
    return { secret, csrf: createHmac("sha256", secret).update("csrf").digest("base64url"), id: randomUUID() };
  };
  const ownerAuth = auth(), leadAuth = auth(), reviewerAuth = auth(), observerAuth = auth();
  const branchId = randomUUID(), teamId = randomUUID();
  const leadAccountId = randomUUID(), leadEmployeeId = randomUUID();
  const reviewerAccountId = randomUUID(), reviewerEmployeeId = randomUUID();
  const observerAccountId = randomUUID(), observerEmployeeId = randomUUID();
  const projectTitle = `Turnkey acceptance ${suffix.slice(0, 8)}`;
  const taskTitle = `Approve design input ${suffix.slice(0, 8)}`;
  const lineDescription = `Kitchen joinery ${suffix.slice(0, 6)}`;
  const ownerEmail = `s19-owner-${suffix}@example.test`;
  const bytes = Buffer.from(`%PDF-1.7\nSense Studios S19 approved drawing ${suffix}\n%%EOF\n`, "ascii");

  await db.connect();
  let fixtureCommitted = false;
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(6092706)");
    const organizationResult = await db.query<{ id: string }>("SELECT id FROM organizations LIMIT 1");
    const organizationId = organizationResult.rows[0]?.id ?? randomUUID();
    if (!organizationResult.rows[0]) await db.query('INSERT INTO organizations(id,name,"updatedAt") VALUES($1,$2,CURRENT_TIMESTAMP)', [organizationId, "S19 Turnkey browser fixture"]);
    const existingOwner = await db.query<{ id: string; normalizedEmail: string }>("SELECT id,\"normalizedEmail\" FROM accounts WHERE kind='OWNER' AND state='ACTIVE' LIMIT 1");
    const ownerAccountId = existingOwner.rows[0]?.id ?? randomUUID();
    if (!existingOwner.rows[0]) {
      await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'OWNER\',\'ACTIVE\',CURRENT_TIMESTAMP)', [ownerAccountId, ownerEmail]);
      for (let index = 0; index < 2; index += 1) await db.query('INSERT INTO passkey_credentials(id,"credentialId","accountId","publicKey") VALUES($1,$2,$3,$4)', [randomUUID(), randomUUID(), ownerAccountId, randomBytes(32)]);
      await db.query('INSERT INTO owner_recovery_codes(id,"accountId","codeHash","acknowledgedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [randomUUID(), ownerAccountId, hash(randomUUID())]);
    }
    const credentials = await db.query<{ count: number }>('SELECT count(*)::int AS count FROM passkey_credentials WHERE "accountId"=$1 AND "revokedAt" IS NULL', [ownerAccountId]);
    for (let index = credentials.rows[0]!.count; index < 2; index += 1) await db.query('INSERT INTO passkey_credentials(id,"credentialId","accountId","publicKey") VALUES($1,$2,$3,$4)', [randomUUID(), randomUUID(), ownerAccountId, randomBytes(32)]);
    const recovery = await db.query('SELECT id FROM owner_recovery_codes WHERE "accountId"=$1 AND "usedAt" IS NULL AND "replacedAt" IS NULL AND "acknowledgedAt" IS NOT NULL LIMIT 1', [ownerAccountId]);
    if (!recovery.rows[0]) await db.query('INSERT INTO owner_recovery_codes(id,"accountId","codeHash","acknowledgedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [randomUUID(), ownerAccountId, hash(randomUUID())]);
    await db.query('INSERT INTO branches(id,"organizationId",name,"updatedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [branchId, organizationId, `S19 Turnkey ${suffix}`]);
    await db.query('INSERT INTO teams(id,"organizationId","branchId",name,"updatedAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)', [teamId, organizationId, branchId, `S19 Team ${suffix}`]);
    for (const [accountId, employeeId, role] of [[leadAccountId, leadEmployeeId, "lead"], [reviewerAccountId, reviewerEmployeeId, "reviewer"], [observerAccountId, observerEmployeeId, "observer"]] as const) {
      await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'STAFF\',\'ACTIVE\',CURRENT_TIMESTAMP)', [accountId, `s19-${role}-${suffix}@example.test`]);
      await db.query('INSERT INTO employees(id,"organizationId","accountId","homeBranchId","homeTeamId","hiredAt","updatedAt") VALUES($1,$2,$3,$4,$5,CURRENT_DATE,CURRENT_TIMESTAMP)', [employeeId, organizationId, accountId, branchId, teamId]);
    }
    const grants = [
      ...["project.view", "project.manage", "employee.manage", "task.assign", "task.view", "document.view", "turnkey.view", "turnkey.manage", "turnkey.cost_view"].map((permission) => [leadEmployeeId, permission] as const),
      [reviewerEmployeeId, "project.view"] as const, [reviewerEmployeeId, "document.view"] as const, [reviewerEmployeeId, "review.decide"] as const,
      [observerEmployeeId, "project.view"] as const, [observerEmployeeId, "turnkey.view"] as const,
    ];
    for (const [employeeId, permissionKey] of grants) await db.query('INSERT INTO employee_permission_overrides(id,"organizationId","employeeId","permissionKey",effect,"scopeKind","branchId",reason) VALUES($1,$2,$3,$4,\'ALLOW\',\'BRANCH\',$5,$6)', [randomUUID(), organizationId, employeeId, permissionKey, branchId, "S19 Turnkey browser acceptance grant"]);
    for (const [accountId, accountAuth] of [[ownerAccountId, ownerAuth], [leadAccountId, leadAuth], [reviewerAccountId, reviewerAuth], [observerAccountId, observerAuth]] as const) {
      await db.query('INSERT INTO sessions(id,"accountId","tokenHash","csrfTokenHash","expiresAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP+interval \'1 hour\')', [accountAuth.id, accountId, hash(accountAuth.secret), hash(accountAuth.csrf)]);
    }
    await db.query("COMMIT");
    fixtureCommitted = true;

    const headers = (credential: typeof ownerAuth) => ({ Cookie: `sense_sid=${credential.secret}`, Origin: baseURL!, "X-CSRF-Token": credential.csrf });
    const ownerHeaders = headers(ownerAuth), leadHeaders = headers(leadAuth), reviewerHeaders = headers(reviewerAuth);
    const command = async (path: string, data: unknown, requestHeaders = ownerHeaders) => {
      const result = await page.request.post(path, { headers: requestHeaders, data });
      const body = await result.text();
      expect(result.status(), `${path}: ${body}`).toBe(201);
      return JSON.parse(body) as Record<string, unknown>;
    };

    const createdProject = await command("/api/v1/projects", { branchId, title: projectTitle, deliveryType: "TURNKEY", scopes: ["Complete fit-out"], reason: "Create isolated S19 Turnkey acceptance project" });
    const projectId = (createdProject.project as { id: string }).id;
    let projectVersion = 1;
    for (const employeeId of [leadEmployeeId, reviewerEmployeeId, observerEmployeeId]) {
      await command(`/api/v1/projects/${projectId}/assignments`, { employeeId, expectedVersion: projectVersion, reason: "Grant assigned S19 browser role" });
      projectVersion = (await db.query<{ version: number }>('SELECT version FROM projects WHERE id=$1', [projectId])).rows[0]!.version;
    }
    await command(`/api/v1/projects/${projectId}/lead`, { employeeId: leadEmployeeId, expectedVersion: projectVersion, reason: "Appoint assigned Turnkey Project Lead" });
    projectVersion = (await db.query<{ version: number }>('SELECT version FROM projects WHERE id=$1', [projectId])).rows[0]!.version;
    await command(`/api/v1/projects/${projectId}/status`, { toStatus: "ACTIVE", expectedVersion: projectVersion, reason: "Activate isolated Turnkey acceptance" });

    const folderResult = await command(`/api/v1/documents/projects/${projectId}/folders`, { name: "Approved drawings", confidential: false, reason: "Create approved drawing evidence folder" });
    const folderId = folderResult.id as string;
    const upload = await command(`/api/v1/documents/projects/${projectId}/uploads`, { folderId, fileName: "S19-production-design.pdf", mimeType: "application/pdf", sizeBytes: bytes.length, confidential: false, viewOnly: true, reason: "Upload exact source for production approval" });
    const uploadId = upload.uploadId as string;
    const chunkResponse = await page.request.put(`/api/v1/documents/uploads/${uploadId}/chunks/0`, { headers: { ...ownerHeaders, "Content-Type": "application/octet-stream", "X-Chunk-SHA256": hash(bytes) }, data: bytes });
    expect(chunkResponse.status(), await chunkResponse.text()).toBe(200);
    const file = await command(`/api/v1/documents/uploads/${uploadId}/finalize`, {});
    const fileId = file.id as string;
    const drawingNumber = `S19-${suffix.slice(0, 6)}`;
    await command(`/api/v1/revisions/projects/${projectId}/drawings`, { documentNumber: drawingNumber, title: "Production joinery plan", fileId, reason: "Register exact production design revision" });
    const revision = await db.query<{ id: string; drawingId: string }>('SELECT id,"drawingId" FROM document_revisions WHERE "projectId"=$1 ORDER BY "createdAt" DESC LIMIT 1', [projectId]);
    expect(revision.rows).toHaveLength(1);

    const createdTask = await command("/api/v1/tasks", { projectId, ownerEmployeeId: leadEmployeeId, title: taskTitle, type: "PROJECT", priority: "HIGH", targetDate: "2026-12-31", reviewRequirement: "INTERNAL", reason: "Create independent exact revision review" });
    const taskId = createdTask.id as string;
    const reviewerAssignment = await command(`/api/v1/reviews/tasks/${taskId}/reviewer`, { employeeId: reviewerEmployeeId, expectedVersion: 1, reason: "Assign an independent drawing reviewer" }, leadHeaders);
    let taskVersion = (reviewerAssignment.task as { version: number }).version;
    const startedTask = await command(`/api/v1/tasks/${taskId}/state`, { toState: "IN_PROGRESS", expectedVersion: taskVersion, reason: "Start the production design review" }, leadHeaders);
    taskVersion = startedTask.version as number;
    await command(`/api/v1/reviews/tasks/${taskId}/submit`, { expectedVersion: taskVersion, revisionId: revision.rows[0]!.id, reason: "Submit exact design revision for internal approval" }, leadHeaders);
    const submission = await db.query<{ roundId: string }>('SELECT r.id AS "roundId" FROM review_rounds r JOIN review_submissions s ON s.id=r."submissionId" WHERE s."taskId"=$1 ORDER BY s."roundNumber" DESC LIMIT 1', [taskId]);
    const roundId = submission.rows[0]!.roundId;
    await command(`/api/v1/reviews/rounds/${roundId}/start`, { reason: "Start independent production-input review" }, reviewerHeaders);
    await command(`/api/v1/reviews/rounds/${roundId}/decision`, { kind: "APPROVED", reason: "Approve exact production drawing revision" }, reviewerHeaders);
    const approvedRevision = await db.query<{ state: string; current: boolean; sha256: string }>('SELECT state::text,"isCurrent" AS current,"sha256" FROM document_revisions WHERE id=$1', [revision.rows[0]!.id]);
    expect(approvedRevision.rows[0]).toMatchObject({ state: "APPROVED", current: true, sha256: hash(bytes) });

    await context.addCookies([{ name: "sense_sid", value: leadAuth.secret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    await page.goto("/turnkey");
    const workspace = page.locator(".turnkey-workspace");
    await expect(workspace.getByRole("heading", { name: "BOQ and production" })).toBeVisible();
    await workspace.getByLabel("Turnkey project").selectOption(projectId);
    const designInputs = workspace.getByRole("group", { name: "Approved design inputs" });
    await expect(designInputs).toContainText(`${drawingNumber} · R0`);
    await designInputs.getByRole("checkbox").check();
    await workspace.getByLabel("Description").fill(lineDescription);
    await workspace.getByLabel("Quantity").fill("3.5000");
    await workspace.getByLabel("Unit", { exact: true }).fill("piece");
    await workspace.getByLabel("Unit price").fill("12500.0000");
    await workspace.getByLabel("Currency").fill("INR");
    await workspace.getByLabel("BOQ draft reason").fill("Prepare a price-backed production BOQ");
    const draftBody = { revisionIds: [revision.rows[0]!.id], lines: [{ key: "line-1", description: lineDescription, quantity: "3.5000", unit: "piece" }], prices: [{ key: "line-1", unitPrice: "12500.0000" }], currency: "INR", reason: "Prepare a price-backed production BOQ" };
    const csrfRejected = await page.request.post(`/api/v1/turnkey/projects/${projectId}/releases`, { headers: { Cookie: `sense_sid=${leadAuth.secret}`, Origin: baseURL! }, data: draftBody });
    expect(csrfRejected.status(), await csrfRejected.text()).toBe(403);
    const originRejected = await page.request.post(`/api/v1/turnkey/projects/${projectId}/releases`, { headers: { Cookie: `sense_sid=${leadAuth.secret}`, Origin: "https://attacker.test", "X-CSRF-Token": leadAuth.csrf }, data: draftBody });
    expect(originRejected.status(), await originRejected.text()).toBe(403);
    expect((await db.query<{ count: number }>('SELECT count(*)::int AS count FROM turnkey_releases WHERE "projectId"=$1', [projectId])).rows[0]?.count).toBe(0);
    const createRelease = page.waitForResponse((response) => response.url().endsWith(`/api/v1/turnkey/projects/${projectId}/releases`) && response.request().method() === "POST");
    await workspace.getByRole("button", { name: "Save draft BOQ" }).click();
    expect((await createRelease).status()).toBe(201);
    const release = await db.query<{ id: string; version: number; state: string; designs: Array<{ revisionId: string; sha256: string }>; lines: Array<{ key: string; quantity: string }>; costApprovalId: string | null; procurementApprovalId: string | null }>('SELECT id,version,state,designs,lines,"costApprovalId","procurementApprovalId" FROM turnkey_releases WHERE "projectId"=$1', [projectId]);
    expect(release.rows).toHaveLength(1);
    const releaseId = release.rows[0]!.id;
    expect(release.rows[0]).toMatchObject({ state: "DRAFT", designs: [{ revisionId: revision.rows[0]!.id, sha256: hash(bytes) }], lines: [{ key: "line-1", description: lineDescription, quantity: "3.5000", unit: "piece" }] });

    const costRequestForm = workspace.locator("form").filter({ hasText: "Request cost approval" });
    await costRequestForm.getByLabel("Approver").selectOption(ownerAccountId);
    await costRequestForm.getByLabel("Cost request reason").fill("Request independent cost review");
    const costRequestResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/turnkey/releases/${releaseId}/cost-request`) && response.request().method() === "POST");
    await costRequestForm.getByRole("button", { name: "Send cost approval request" }).click();
    expect((await costRequestResponse).status()).toBe(201);
    await expect(workspace.getByRole("heading", { name: "Cost approval requested" })).toBeVisible();
    const costPending = await db.query<{ state: string; version: number; costApprovalId: string }>('SELECT state,version,"costApprovalId" FROM turnkey_releases WHERE id=$1', [releaseId]);
    expect(costPending.rows[0]).toMatchObject({ state: "COST_PENDING", version: 2 });

    await context.clearCookies();
    await context.addCookies([{ name: "sense_sid", value: ownerAuth.secret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    await page.reload();
    await workspace.getByLabel("Turnkey project").selectOption(projectId);
    const costDecisionForm = workspace.locator("form").filter({ hasText: "Cost approval decision" });
    await expect(costDecisionForm).toBeVisible();
    await costDecisionForm.getByLabel("Cost decision reason").fill("Approve this exact BOQ cost snapshot");
    const costDecisionResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/turnkey/releases/${releaseId}/cost-decision`) && response.request().method() === "POST");
    await costDecisionForm.getByRole("button", { name: "Record decision" }).click();
    expect((await costDecisionResponse).status()).toBe(201);
    expect((await db.query<{ state: string; status: string }>('SELECT r.state,a.state AS status FROM turnkey_releases r JOIN approval_requests a ON a.id=r."costApprovalId" WHERE r.id=$1', [releaseId])).rows[0]).toEqual({ state: "COST_APPROVED", status: "APPROVED" });

    await context.clearCookies();
    await context.addCookies([{ name: "sense_sid", value: leadAuth.secret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    await page.reload();
    await workspace.getByLabel("Turnkey project").selectOption(projectId);
    const materialForm = workspace.locator("form").filter({ hasText: "Set materials" });
    await expect(materialForm).toBeVisible();
    await materialForm.getByLabel(lineDescription).fill("Engineered oak cabinetry");
    await materialForm.getByLabel("Material update reason").fill("Select the approved finish material");
    const materialResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/turnkey/releases/${releaseId}/materials`) && response.request().method() === "POST");
    await materialForm.getByRole("button", { name: "Save materials" }).click();
    expect((await materialResponse).status()).toBe(201);
    expect((await db.query<{ materials: Array<{ lineKey: string; material: string }> }>('SELECT materials FROM turnkey_releases WHERE id=$1', [releaseId])).rows[0]?.materials).toEqual([{ lineKey: "line-1", material: "Engineered oak cabinetry" }]);

    const procurementForm = workspace.locator("form").filter({ hasText: "Request procurement approval" });
    await procurementForm.getByLabel("Approver").selectOption(ownerAccountId);
    await procurementForm.getByLabel("Procurement request reason").fill("Request independent procurement commitment review");
    const procurementRequestResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/turnkey/releases/${releaseId}/procurement-request`) && response.request().method() === "POST");
    await procurementForm.getByRole("button", { name: "Send procurement approval request" }).click();
    expect((await procurementRequestResponse).status()).toBe(201);
    expect((await db.query<{ state: string; version: number }>('SELECT state,version FROM turnkey_releases WHERE id=$1', [releaseId])).rows[0]).toEqual({ state: "PROCUREMENT_PENDING", version: 5 });

    await context.clearCookies();
    await context.addCookies([{ name: "sense_sid", value: ownerAuth.secret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    await page.reload();
    await workspace.getByLabel("Turnkey project").selectOption(projectId);
    const procurementDecisionForm = workspace.locator("form").filter({ hasText: "Procurement decision" });
    await expect(procurementDecisionForm).toBeVisible();
    await procurementDecisionForm.getByLabel("Procurement decision reason").fill("Approve procurement commitment for the released BOQ");
    const procurementDecisionResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/turnkey/releases/${releaseId}/procurement-decision`) && response.request().method() === "POST");
    await procurementDecisionForm.getByRole("button", { name: "Record decision" }).click();
    expect((await procurementDecisionResponse).status()).toBe(201);
    expect((await db.query<{ state: string; status: string; procurementStatus: string }>('SELECT r.state,a.state AS status,r."procurementStatus" FROM turnkey_releases r JOIN approval_requests a ON a.id=r."procurementApprovalId" WHERE r.id=$1', [releaseId])).rows[0]).toEqual({ state: "RELEASED", status: "APPROVED", procurementStatus: "NOT_STARTED" });

    await context.clearCookies();
    await context.addCookies([{ name: "sense_sid", value: leadAuth.secret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    await page.reload();
    await workspace.getByLabel("Turnkey project").selectOption(projectId);
    const progressForm = workspace.locator("form").filter({ hasText: "Update progress" });
    await expect(progressForm).toBeVisible();
    await progressForm.getByLabel("Production progress reason").fill("Start procurement coordination");
    const procurementProgressResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/turnkey/releases/${releaseId}/progress`) && response.request().method() === "POST");
    await progressForm.getByRole("button", { name: "Save progress" }).click();
    expect((await procurementProgressResponse).status()).toBe(201);
    await expect(workspace.getByLabel("Procurement and factory status")).toContainText("IN PROGRESS");
    await progressForm.getByLabel("Production progress reason").fill("Complete procurement coordination");
    const completeProcurementResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/turnkey/releases/${releaseId}/progress`) && response.request().method() === "POST");
    await progressForm.getByRole("button", { name: "Save progress" }).click();
    expect((await completeProcurementResponse).status()).toBe(201);
    await progressForm.getByLabel("Stage").selectOption("FACTORY");
    await expect(progressForm.getByText(/Next allowed status: IN PROGRESS/)).toBeVisible();
    await progressForm.getByLabel("Production progress reason").fill("Start factory production");
    const factoryProgressResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/turnkey/releases/${releaseId}/progress`) && response.request().method() === "POST");
    await progressForm.getByRole("button", { name: "Save progress" }).click();
    expect((await factoryProgressResponse).status()).toBe(201);
    await progressForm.getByLabel("Production progress reason").fill("Complete factory production");
    const completeFactoryResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/turnkey/releases/${releaseId}/progress`) && response.request().method() === "POST");
    await progressForm.getByRole("button", { name: "Save progress" }).click();
    expect((await completeFactoryResponse).status()).toBe(201);
    const persisted = await db.query<{ state: string; procurementStatus: string; factoryStatus: string; version: number }>('SELECT state,"procurementStatus","factoryStatus",version FROM turnkey_releases WHERE id=$1', [releaseId]);
    expect(persisted.rows[0]).toEqual({ state: "RELEASED", procurementStatus: "COMPLETED", factoryStatus: "COMPLETED", version: 10 });
    const history = await db.query<{ count: number }>('SELECT count(*)::int AS count FROM turnkey_history WHERE "releaseId"=$1', [releaseId]);
    expect(history.rows[0]?.count).toBeGreaterThanOrEqual(9);

    await context.clearCookies();
    await context.addCookies([{ name: "sense_sid", value: observerAuth.secret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    await page.reload();
    await workspace.getByLabel("Turnkey project").selectOption(projectId);
    await expect(workspace.getByRole("cell", { name: lineDescription })).toBeVisible();
    await expect(workspace.getByText("12500.0000")).toHaveCount(0);
    await expect(workspace.getByText(/Approved total:/)).toHaveCount(0);
    await expect(workspace.getByText("Unit price", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const screenshot = await page.screenshot({ fullPage: true });
    const screenshotDirectory = resolve(".env.s19-tools", "screenshots");
    mkdirSync(screenshotDirectory, { recursive: true });
    writeFileSync(join(screenshotDirectory, `s19-turnkey-${testInfo.project.name}.png`), screenshot);
    await testInfo.attach(`s19-turnkey-${testInfo.project.name}`, { body: screenshot, contentType: "image/png" });
    const redacted = await page.request.get(`/api/v1/turnkey/projects/${projectId}`);
    expect(redacted.status()).toBe(200);
    const readModel = await redacted.json() as { releases: Array<Record<string, unknown>> };
    expect(readModel.releases[0]).not.toHaveProperty("costs");
    expect(readModel.releases[0]).not.toHaveProperty("costShares");
  } finally {
    if (fixtureCommitted) await db.query('UPDATE sessions SET "revokedAt"=CURRENT_TIMESTAMP WHERE id = ANY($1::uuid[])', [[ownerAuth.id, leadAuth.id, reviewerAuth.id, observerAuth.id]]);
    await db.end();
  }
});

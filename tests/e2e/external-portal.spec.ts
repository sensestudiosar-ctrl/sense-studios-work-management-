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

test("external consultant grant, OTP session, advisory upload and review, native CAD reveal and revocation persist", async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(process.env.S21_E2E_ENABLED !== "1" && process.env.S25_E2E_ENABLED !== "1", "Set an approved isolated external portal browser acceptance flag");
  test.skip(!process.env.DATABASE_URL || !process.env.NAS_ROOT, "Dedicated local PostgreSQL test database and NAS_ROOT are required");
  test.skip(!process.env.EMAIL_VERIFICATION_SECRET, "EMAIL_VERIFICATION_SECRET is required for the local external OTP fixture");
  test.skip(Boolean(process.env.BREVO_API_KEY || process.env.BREVO_SENDER_EMAIL || process.env.BREVO_SENDER_NAME), "Run without a configured Brevo sender so no email leaves the local test");

  const databaseUrl = new URL(process.env.DATABASE_URL!);
  const explicitlyEnabledS25Database = process.env.S25_E2E_ENABLED === "1" && ["localhost", "127.0.0.1"].includes(databaseUrl.hostname) && ((["56433", "57433"].includes(databaseUrl.port) && /^\/sense_s25_main_s25_[a-z0-9_]+_test$/i.test(databaseUrl.pathname)) || (databaseUrl.port === "57433" && /^\/sense_s21_s25_[a-z0-9_]+_test$/i.test(databaseUrl.pathname)));
  const explicitlyEnabledS26Database = process.env.S26_E2E_ENABLED === "1" && ["localhost", "127.0.0.1"].includes(databaseUrl.hostname) && databaseUrl.port === "57433" && /^\/sense_s26_main_s26_[a-z0-9_]+_test$/i.test(databaseUrl.pathname);
  const explicitlyEnabledS27Database = process.env.S27_E2E_ENABLED === "1" && databaseUrl.hostname === "127.0.0.1" && databaseUrl.port === "57433" && /^\/sense_s27_main_s27_[a-z0-9_]+_test$/.test(databaseUrl.pathname);
  if (!["localhost", "127.0.0.1"].includes(databaseUrl.hostname) || ((!explicitlyEnabledS25Database && !explicitlyEnabledS26Database && !explicitlyEnabledS27Database) && databaseUrl.port !== "56433") || (!/^\/sense_[a-z0-9_]*_test$/.test(databaseUrl.pathname) && !explicitlyEnabledS25Database && !explicitlyEnabledS26Database && !explicitlyEnabledS27Database)) {
    throw new Error("External portal browser acceptance requires a dedicated local S21 or explicitly enabled exact S25 _test database");
  }
  const require = createRequire(resolve("apps/api/package.json"));
  const { Client } = require("pg") as { Client: new (config: { connectionString: string }) => FixtureDatabase };
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const suffix = randomUUID();
  const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
  const ownerSecret = randomBytes(32).toString("base64url");
  const ownerCsrf = createHmac("sha256", ownerSecret).update("csrf").digest("base64url");
  const ownerSessionId = randomUUID();
  const branchId = randomUUID();
  const teamId = randomUUID();
  const leadAccountId = randomUUID();
  const leadEmployeeId = randomUUID();
  const externalEmail = `s21-consultant-${suffix}@example.test`;
  const projectTitle = `S21 external review ${suffix.slice(0, 8)}`;
  const internalRequests: string[] = [];
  let externalPhaseCapture = false;
  let vendorEmail: string | null = null;
  const ownerHeaders = { Cookie: `sense_sid=${ownerSecret}`, Origin: baseURL!, "X-CSRF-Token": ownerCsrf };
  let ownerAccountId: string;

  await db.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(6092706)");
    const orgRow = await db.query<{ id: string }>("SELECT id FROM organizations LIMIT 1");
    const organizationId = orgRow.rows[0]?.id ?? randomUUID();
    if (!orgRow.rows[0]) await db.query('INSERT INTO organizations(id,name,"updatedAt") VALUES($1,$2,CURRENT_TIMESTAMP)', [organizationId, "S21 external portal browser fixture"]);
    const ownerRow = await db.query<{ id: string }>("SELECT id FROM accounts WHERE kind='OWNER' AND state='ACTIVE' LIMIT 1");
    ownerAccountId = ownerRow.rows[0]?.id ?? randomUUID();
    if (!ownerRow.rows[0]) await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'OWNER\',\'ACTIVE\',CURRENT_TIMESTAMP)', [ownerAccountId, `s21-owner-${suffix}@example.test`]);
    const credentials = await db.query<{ count: number }>('SELECT count(*)::int AS count FROM passkey_credentials WHERE "accountId"=$1 AND "revokedAt" IS NULL', [ownerAccountId]);
    for (let i = credentials.rows[0]!.count; i < 2; i++) await db.query('INSERT INTO passkey_credentials(id,"credentialId","accountId","publicKey") VALUES($1,$2,$3,$4)', [randomUUID(), randomUUID(), ownerAccountId, randomBytes(32)]);
    const recovery = await db.query('SELECT id FROM owner_recovery_codes WHERE "accountId"=$1 AND "usedAt" IS NULL AND "replacedAt" IS NULL AND "acknowledgedAt" IS NOT NULL LIMIT 1', [ownerAccountId]);
    if (!recovery.rows[0]) await db.query('INSERT INTO owner_recovery_codes(id,"accountId","codeHash","acknowledgedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [randomUUID(), ownerAccountId, hash(randomUUID())]);
    await db.query('INSERT INTO branches(id,"organizationId",name,"updatedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [branchId, organizationId, `S21 external ${suffix}`]);
    await db.query('INSERT INTO teams(id,"organizationId","branchId",name,"updatedAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)', [teamId, organizationId, branchId, `S21 external lead ${suffix}`]);
    await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'STAFF\',\'ACTIVE\',CURRENT_TIMESTAMP)', [leadAccountId, `s21-lead-${suffix}@example.test`]);
    await db.query('INSERT INTO employees(id,"organizationId","accountId","homeBranchId","homeTeamId","hiredAt","updatedAt") VALUES($1,$2,$3,$4,$5,CURRENT_DATE,CURRENT_TIMESTAMP)', [leadEmployeeId, organizationId, leadAccountId, branchId, teamId]);
    for (const permission of ["project.view", "project.manage"]) await db.query('INSERT INTO employee_permission_overrides(id,"organizationId","employeeId","permissionKey",effect,"scopeKind","branchId",reason) VALUES($1,$2,$3,$4,\'ALLOW\',\'BRANCH\',$5,$6)', [randomUUID(), organizationId, leadEmployeeId, permission, branchId, "S21 assigned active project lead fixture"]);
    await db.query('INSERT INTO sessions(id,"accountId","tokenHash","csrfTokenHash","expiresAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP+interval \'1 hour\')', [ownerSessionId, ownerAccountId, hash(ownerSecret), hash(ownerCsrf)]);
    await db.query("COMMIT");

    await context.addCookies([{ name: "sense_sid", value: ownerSecret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    const createdResponse = await page.request.post("/api/v1/projects", { headers: ownerHeaders, data: { branchId, title: projectTitle, deliveryType: "DESIGN", scopes: ["Architecture"], reason: "Create isolated S21 consultant portal project" } });
    const createdText = await createdResponse.text();
    expect(createdResponse.status(), createdText).toBe(201);
    const created = JSON.parse(createdText) as { project: { id: string; version: number } };
    const projectId = created.project.id;
    const assigned = await page.request.post(`/api/v1/projects/${projectId}/assignments`, { headers: ownerHeaders, data: { employeeId: leadEmployeeId, expectedVersion: created.project.version, reason: "Assign eligible lead for S21 external project" } });
    expect(assigned.status(), await assigned.text()).toBe(201);
    const lead = await page.request.post(`/api/v1/projects/${projectId}/lead`, { headers: ownerHeaders, data: { employeeId: leadEmployeeId, expectedVersion: created.project.version + 1, reason: "Appoint assigned S21 Project Lead" } });
    expect(lead.status(), await lead.text()).toBe(201);
    const activeResponse = await page.request.post(`/api/v1/projects/${projectId}/status`, { headers: ownerHeaders, data: { toStatus: "ACTIVE", expectedVersion: created.project.version + 2, reason: "Activate isolated S21 external review project" } });
    expect(activeResponse.status(), await activeResponse.text()).toBe(201);

    const command = async (path: string, data: unknown) => {
      const response = await page.request.post(path, { headers: ownerHeaders, data });
      const text = await response.text();
      expect(response.status(), `${path}: ${text}`).toBe(201);
      return JSON.parse(text) as Record<string, unknown>;
    };
    const folder = await command(`/api/v1/documents/projects/${projectId}/folders`, { name: "External review fixtures", confidential: false, reason: "Create isolated S21 public evidence folder" }) as { id: string };
    const pdfBytes = Buffer.from(`%PDF-1.7\nS21 PDF fixture ${suffix}\n%%EOF\n`, "ascii");
    const cadBytes = Buffer.from(`S21-DWG-CAD-fixture-${suffix}`, "ascii");
    const uploadDocument = async (fileName: string, mimeType: string, bytes: Buffer) => {
      const started = await command(`/api/v1/documents/projects/${projectId}/uploads`, { folderId: folder.id, fileName, mimeType, sizeBytes: bytes.length, confidential: false, viewOnly: true, reason: `Upload ${fileName} for isolated external acceptance` }) as { uploadId: string };
      const chunk = await page.request.put(`/api/v1/documents/uploads/${started.uploadId}/chunks/0`, { headers: { ...ownerHeaders, "Content-Type": "application/octet-stream", "X-Chunk-SHA256": hash(bytes) }, data: bytes });
      expect(chunk.status(), await chunk.text()).toBe(200);
      return await command(`/api/v1/documents/uploads/${started.uploadId}/finalize`, {}) as { id: string };
    };
    const pdf = await uploadDocument(`s21-plan-${suffix.slice(0, 8)}.pdf`, "application/pdf", pdfBytes);
    const cad = await uploadDocument(`s21-model-${suffix.slice(0, 8)}.dwg`, "application/octet-stream", cadBytes);
    const pdfDrawing = await command(`/api/v1/revisions/projects/${projectId}/drawings`, { documentNumber: `S21-P-${suffix.slice(0, 8)}`, title: "External review plan", fileId: pdf.id, reason: "Create exact working PDF revision for consultant review" }) as { id: string };
    const cadDrawing = await command(`/api/v1/revisions/projects/${projectId}/drawings`, { documentNumber: `S21-C-${suffix.slice(0, 8)}`, title: "External CAD model", fileId: cad.id, reason: "Create exact working CAD revision for Owner native link" }) as { id: string };
    const revisionRows = await db.query<{ id: string; drawingId: string; series: string; number: number; isCurrent: boolean }>('SELECT id,"drawingId",series,number,"isCurrent" FROM document_revisions WHERE "drawingId"=ANY($1::uuid[]) ORDER BY "drawingId"', [[pdfDrawing.id, cadDrawing.id]]);
    expect(revisionRows.rows).toHaveLength(2);
    const reviewRevision = revisionRows.rows.find((row) => row.drawingId === pdfDrawing.id)!.id;
    const cadRevision = revisionRows.rows.find((row) => row.drawingId === cadDrawing.id)!.id;

    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (externalPhaseCapture && ["/api/v1/auth/", "/api/v1/projects", "/api/v1/documents/", "/api/v1/revisions/"].some((prefix) => path.startsWith(prefix))) internalRequests.push(path);
    });
    await page.goto(`/external-access?projectId=${projectId}`);
    await expect(page.getByRole("heading", { name: projectTitle })).toBeVisible();
    await page.getByLabel("External email").fill(externalEmail);
    await page.getByLabel("Portal type").selectOption("CONSULTANT");
    await page.getByLabel(new RegExp(`S21-P-${suffix.slice(0, 8)} · External review plan`)).check();
    await page.getByLabel(new RegExp(`S21-C-${suffix.slice(0, 8)} · External CAD model`)).check();
    await page.getByRole("heading", { name: "Create exact access grant" }).locator("..").getByLabel("Reason").fill("Grant exact plan and CAD revision access to the named consultant");
    await page.getByRole("button", { name: "Create grant" }).click();
    await expect(page.getByText("Grant created with the exact selected scope.")).toBeVisible();
    const grantRow = await db.query<{ id: string; accountId: string; version: number }>('SELECT g.id,g."accountId",g.version FROM external_portal_grants g JOIN accounts a ON a.id=g."accountId" WHERE a."normalizedEmail"=$1 AND g."projectId"=$2', [externalEmail, projectId]);
    expect(grantRow.rows).toHaveLength(1);
    const grantId = grantRow.rows[0]!.id;
    const accountId = grantRow.rows[0]!.accountId;

    await page.getByLabel("Recipient grant").first().selectOption(grantId);
    await page.getByLabel("Title", { exact: true }).fill("Review the door clearance");
    await page.getByLabel("Request", { exact: true }).fill("Please comment on the north entrance clearance before issue.");
    await page.getByLabel("Due date (optional)").fill("2026-10-16");
    await page.getByRole("heading", { name: "Send scoped request" }).locator("..").getByLabel("Reason").fill("Ask the consultant to review the project detail");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Request sent to the named external recipient.")).toBeVisible();
    expect((await db.query('SELECT id FROM external_portal_records WHERE "grantId"=$1 AND kind=\'STAFF_REQUEST\'', [grantId])).rows).toHaveLength(1);

    let cadShareId: string | null = null;
    if (process.env.EXTERNAL_SHARE_SECRET) {
      await page.getByLabel("Recipient grant").last().selectOption(grantId);
      await page.getByLabel("Granted CAD revision").selectOption(cadRevision);
      await page.getByLabel("Native link identity").fill(`s21-native-${suffix.slice(0, 8)}`);
      await page.getByLabel("Native URL").fill(`https://miniscloud.invalid/share/${suffix}`);
      await page.getByLabel("Extraction code").fill(`code-${suffix.slice(0, 8)}`);
      await page.getByRole("heading", { name: "Record Owner-issued native CAD share" }).locator("..").getByLabel("Reason").fill("Record the Owner-created seven-day native share");
      const recordShareResponse = page.waitForResponse((response) => response.url().includes(`/api/v1/external-access/projects/${projectId}/cad-shares`) && response.request().method() === "POST");
      await page.getByRole("button", { name: "Record share" }).click();
      const recordedShare = await recordShareResponse;
      expect(recordedShare.ok(), `record Owner CAD share failed: ${recordedShare.status()} ${await recordedShare.text()}`).toBe(true);
      const cadShareRow = await db.query<{ id: string; encryptedSecret: string; version: number }>('SELECT id,"encryptedSecret",version FROM external_cad_shares WHERE "grantId"=$1', [grantId]);
      expect(cadShareRow.rows).toHaveLength(1);
      expect(cadShareRow.rows[0]!.encryptedSecret).not.toContain(`https://miniscloud.invalid/share/${suffix}`);
      expect(cadShareRow.rows[0]!.encryptedSecret).not.toContain(`code-${suffix.slice(0, 8)}`);
      cadShareId = cadShareRow.rows[0]!.id;
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const staffScreenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach("s21-staff-" + testInfo.project.name, { body: staffScreenshot, contentType: "image/png" });
    const screenshotDirectory = resolve(".env.s21-tools", "screenshots");
    mkdirSync(screenshotDirectory, { recursive: true });
    writeFileSync(join(screenshotDirectory, "s21-staff-" + testInfo.project.name + ".png"), staffScreenshot);

    internalRequests.length = 0;
    externalPhaseCapture = true;
    await context.clearCookies();
    await page.goto("/external-portal/");
    await expect(page.getByRole("heading", { name: "Sign in to your project portal" })).toBeVisible();
    await page.getByLabel("Email address").fill(externalEmail);
    await page.getByRole("button", { name: "Send sign-in code" }).click();
    await expect(page.getByRole("status")).toContainText("If this address has access, a sign-in code has been sent.");
    const code = String(100_000 + Math.floor(Math.random() * 900_000));
    const challenge = await db.query('UPDATE external_portal_codes SET "codeHash"=$1,"expiresAt"=CURRENT_TIMESTAMP+interval \'10 minutes\',"attempts"=0,"consumedAt"=NULL WHERE "accountId"=$2', [createHmac("sha256", process.env.EMAIL_VERIFICATION_SECRET!).update(`${accountId}:${externalEmail}:${code}`).digest("hex"), accountId]);
    expect(challenge.rowCount).toBe(1);
    await page.getByLabel("One-time code").fill(code);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Project portal" })).toBeVisible();
    await expect(page.getByLabel("Project")).toContainText(projectTitle);
    expect((await page.request.get("/api/v1/projects")).status()).toBe(401);
    await expect(page.getByText("External review plan")).toBeVisible();
    await expect(page.getByText("Please comment on the north entrance clearance before issue.")).toBeVisible();
    if (cadShareId) {
      await expect(page.getByText("Do not forward the link or extraction code.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Reveal native link details" })).toBeVisible();
      await page.getByRole("button", { name: "Reveal native link details" }).click();
      await expect(page.getByText(`Extraction code: code-${suffix.slice(0, 8)}`, { exact: true })).toBeVisible();
      await expect(page.getByText("Do not forward this native share or extraction code.")).toBeVisible();
    } else await expect(page.getByText("No native CAD shares are available.")).toBeVisible();
    const cadFileResponse = await page.request.get(`/api/v1/external-portal/revisions/${cadRevision}/file`);
    expect(cadFileResponse.status()).toBe(403);

    await page.getByLabel("Type").selectOption("REVIEW");
    await page.getByLabel("Exact context").selectOption(reviewRevision);
    await page.getByLabel("Title", { exact: true }).fill("North entry clearance review");
    await page.getByLabel("Details").fill("The north door needs 20 mm more clear opening.");
    await page.getByRole("heading", { name: "Send a submission" }).locator("..").getByLabel("Reason").fill("Provide scoped consultant review evidence");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText(/Your submission was recorded for staff review/)).toBeVisible();
    await expect.poll(async () => (await db.query('SELECT id FROM external_portal_records WHERE "grantId"=$1 AND kind=\'REVIEW\'', [grantId])).rows.length).toBe(1);

    await page.getByLabel("Type").selectOption("COMMENT");
    await page.getByLabel("Exact context").selectOption(reviewRevision);
    await page.getByLabel("Title", { exact: true }).fill("Follow-up comment");
    await page.getByLabel("Details").fill("Please confirm the revised clearance dimension.");
    await page.getByRole("heading", { name: "Send a submission" }).locator("..").getByLabel("Reason").fill("Append a correction without changing prior evidence");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect.poll(async () => (await db.query('SELECT id FROM external_portal_records WHERE "grantId"=$1 AND kind=\'COMMENT\'', [grantId])).rows.length).toBe(1);

    const proof = Buffer.from(`%PDF-1.7\nS21 external upload ${suffix}\n%%EOF\n`, "ascii");
    const uploadReason = page.getByRole("heading", { name: "Upload advisory evidence" }).locator("..").getByLabel("Reason");
    await uploadReason.fill("Provide mark-up evidence for the current review");
    await page.getByLabel("File").setInputFiles({ name: `s21-comment-${suffix.slice(0, 8)}.pdf`, mimeType: "application/pdf", buffer: proof });
    await expect(page.getByText(/Upload saved as advisory evidence/)).toBeVisible();
    const uploadRow = await db.query<{ sha256: string; state: string }>('SELECT sha256,state FROM external_portal_uploads WHERE "grantId"=$1', [grantId]);
    expect(uploadRow.rows).toHaveLength(1);
    expect(uploadRow.rows[0]?.state).toBe("FINALIZED");
    expect(uploadRow.rows[0]?.sha256).toBe(hash(proof));

    await page.reload();
    await expect(page.getByRole("heading", { name: "Project portal" })).toBeVisible();
    await expect(page.getByText("North entry clearance review")).toBeVisible();
    await expect(page.getByText(`s21-comment-${suffix.slice(0, 8)}.pdf`)).toBeVisible();
    const cookies = await context.cookies(baseURL!);
    expect(cookies.some((cookie) => cookie.name === "sense_external_sid" && cookie.httpOnly)).toBe(true);
    expect(cookies.some((cookie) => cookie.name === "sense_sid")).toBe(false);
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
    expect(internalRequests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach(`s21-external-${testInfo.project.name}`, { body: screenshot, contentType: "image/png" });
    mkdirSync(screenshotDirectory, { recursive: true });
    writeFileSync(join(screenshotDirectory, `s21-${testInfo.project.name}.png`), screenshot);

    externalPhaseCapture = false;
    internalRequests.length = 0;
    await context.addCookies([{ name: "sense_sid", value: ownerSecret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    await page.goto(`/external-access?projectId=${projectId}`);
    await expect(page.getByText("Current grants")).toBeVisible();
    page.once("dialog", async (dialog) => { await dialog.accept("Revoke the consultant grant after the local security check"); });
    await page.getByRole("button", { name: "Revoke access" }).click();
    await expect(page.getByText(new RegExp(`Owner action required · native link s21-native-${suffix.slice(0, 8)}`))).toBeVisible();
    const revokedGrant = await db.query<{ revokedAt: Date | null }>('SELECT "revokedAt" FROM external_portal_grants WHERE id=$1', [grantId]);
    expect(revokedGrant.rows[0]?.revokedAt).not.toBeNull();
    if (cadShareId) {
      const requiredShare = await db.query<{ revokedAt: Date | null }>('SELECT "revokedAt" FROM external_cad_shares WHERE id=$1', [cadShareId]);
      expect(requiredShare.rows[0]?.revokedAt).toBeNull();
      await page.getByRole("button", { name: "Reveal native link details" }).click();
      await expect(page.getByRole("link", { name: "Open native share for cancellation" })).toHaveAttribute("href", `https://miniscloud.invalid/share/${suffix}`);
      await expect(page.getByText(`Extraction code: code-${suffix.slice(0, 8)}`, { exact: true })).toBeVisible();
      page.once("dialog", async (confirmationDialog) => {
        expect(confirmationDialog.message()).toBe("Confirm native cancellation in MinisCloud and enter evidence");
        page.once("dialog", async (reasonDialog) => {
          expect(reasonDialog.message()).toBe("Reason for recording native cancellation");
          await reasonDialog.accept("Record Owner proof of native share revocation");
        });
        await confirmationDialog.accept("Confirmed native cancellation in MinisCloud");
      });
      await page.getByRole("button", { name: "Record Owner cancellation confirmation" }).click();
      await expect(page.getByText("No outstanding CAD cancellation blockers.")).toBeVisible();
      const confirmedShare = await db.query<{ revokedAt: Date | null; confirmation: string | null }>('SELECT "revokedAt",confirmation FROM external_cad_shares WHERE id=$1', [cadShareId]);
      expect(confirmedShare.rows[0]?.revokedAt).not.toBeNull();
      expect(confirmedShare.rows[0]?.confirmation).toBe("Confirmed native cancellation in MinisCloud");
    }

    vendorEmail = "s21-vendor-" + suffix + "@example.test";
    const vendorProjectTitle = "S21 factory portal " + suffix.slice(0, 8);
    const vendorProjectResponse = await page.request.post("/api/v1/projects", { headers: ownerHeaders, data: { branchId, title: vendorProjectTitle, deliveryType: "TURNKEY", scopes: ["Factory package"], reason: "Create isolated S21 vendor portal project" } });
    const vendorProjectText = await vendorProjectResponse.text();
    expect(vendorProjectResponse.status(), vendorProjectText).toBe(201);
    const vendorProject = JSON.parse(vendorProjectText) as { project: { id: string; version: number } };
    const vendorAssigned = await page.request.post("/api/v1/projects/" + vendorProject.project.id + "/assignments", { headers: ownerHeaders, data: { employeeId: leadEmployeeId, expectedVersion: vendorProject.project.version, reason: "Assign eligible lead to vendor portal project" } });
    expect(vendorAssigned.status(), await vendorAssigned.text()).toBe(201);
    const vendorLead = await page.request.post("/api/v1/projects/" + vendorProject.project.id + "/lead", { headers: ownerHeaders, data: { employeeId: leadEmployeeId, expectedVersion: vendorProject.project.version + 1, reason: "Appoint assigned lead for vendor portal project" } });
    expect(vendorLead.status(), await vendorLead.text()).toBe(201);
    const vendorActive = await page.request.post("/api/v1/projects/" + vendorProject.project.id + "/status", { headers: ownerHeaders, data: { toStatus: "ACTIVE", expectedVersion: vendorProject.project.version + 2, reason: "Activate isolated vendor portal project" } });
    expect(vendorActive.status(), await vendorActive.text()).toBe(201);
    const siteBeforeResponse = await page.request.get("/api/v1/site/projects/" + vendorProject.project.id);
    const siteBeforeText = await siteBeforeResponse.text();
    expect(siteBeforeResponse.ok(), siteBeforeText).toBe(true);
    const siteBefore = JSON.parse(siteBeforeText) as { version: number };
    const packageTitle = "Named factory package " + suffix.slice(0, 8);
    const today = new Date().toISOString().slice(0, 10);
    const packageResponse = await page.request.post("/api/v1/site/projects/" + vendorProject.project.id + "/packages", { headers: ownerHeaders, data: { expectedVersion: siteBefore.version, title: packageTitle, date: today, tomorrowPlan: "Inspect the factory packing list", plannedPercent: "0", plannedQuantity: "1", unit: "batch", critical: false, reason: "Create real named package for vendor portal acceptance" } });
    const packageText = await packageResponse.text();
    expect(packageResponse.status(), packageText).toBe(201);
    const packageId = (JSON.parse(packageText) as { id: string }).id;
    const packageBefore = await db.query<{ version: number; state: string; data: Record<string, unknown> }>("SELECT version,state,data FROM site_records WHERE id=$1 AND kind='PACKAGE'", [packageId]);
    expect(packageBefore.rows).toHaveLength(1);

    await page.goto("/external-access?projectId=" + vendorProject.project.id);
    await expect(page.getByRole("heading", { name: vendorProjectTitle })).toBeVisible();
    await page.getByLabel("External email").fill(vendorEmail);
    await page.getByLabel("Portal type").selectOption("VENDOR_FACTORY");
    await page.getByLabel(new RegExp(packageTitle)).check();
    await page.getByRole("heading", { name: "Create exact access grant" }).locator("..").getByLabel("Reason").fill("Grant the named factory recipient this exact work package");
    await page.getByRole("button", { name: "Create grant" }).click();
    await expect(page.getByText("Grant created with the exact selected scope.")).toBeVisible();
    const vendorGrant = await db.query<{ id: string; accountId: string }>('SELECT g.id,g."accountId" FROM external_portal_grants g JOIN accounts a ON a.id=g."accountId" WHERE a."normalizedEmail"=$1 AND g."projectId"=$2', [vendorEmail, vendorProject.project.id]);
    expect(vendorGrant.rows).toHaveLength(1);

    internalRequests.length = 0;
    externalPhaseCapture = true;
    await context.clearCookies();
    await page.goto("/external-portal/");
    await expect(page.getByRole("heading", { name: "Sign in to your project portal" })).toBeVisible();
    await page.getByLabel("Email address").fill(vendorEmail);
    await page.getByRole("button", { name: "Send sign-in code" }).click();
    await expect(page.getByRole("status")).toContainText("If this address has access, a sign-in code has been sent.");
    const vendorCode = String(100_000 + Math.floor(Math.random() * 900_000));
    const vendorChallenge = await db.query('UPDATE external_portal_codes SET "codeHash"=$1,"expiresAt"=CURRENT_TIMESTAMP+interval \'10 minutes\',"attempts"=0,"consumedAt"=NULL WHERE "accountId"=$2', [createHmac("sha256", process.env.EMAIL_VERIFICATION_SECRET!).update(vendorGrant.rows[0]!.accountId + ":" + vendorEmail + ":" + vendorCode).digest("hex"), vendorGrant.rows[0]!.accountId]);
    expect(vendorChallenge.rowCount).toBe(1);
    await page.getByLabel("One-time code").fill(vendorCode);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Project portal" })).toBeVisible();
    await expect(page.getByLabel("Project")).toContainText(vendorProjectTitle);
    await expect(page.getByText(packageTitle)).toBeVisible();
    await expect(page.getByText(/OPEN/)).toBeVisible();
    await expect(page.getByLabel("Type").getByRole("option", { name: "Consultant review" })).toHaveCount(0);
    await expect(page.getByLabel("Project").locator("option")).toHaveCount(1);
    await expect(page.getByText(/unitPrice|employeePerformance|NAS_ROOT/i)).toHaveCount(0);
    expect((await page.request.get("/api/v1/projects")).status()).toBe(401);
    await page.getByLabel("Type").selectOption("PRODUCTION_STATUS");
    await page.getByLabel("Exact context").selectOption(packageId);
    await page.getByLabel("Title", { exact: true }).fill("Packing update");
    await page.getByLabel("Details").fill("One batch is packed and ready for staff inspection.");
    await page.getByRole("heading", { name: "Send a submission" }).locator("..").getByLabel("Reason").fill("Record advisory status for the exact package");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText(/Your submission was recorded for staff review/)).toBeVisible();
    await page.reload();
    await expect(page.getByText("Packing update")).toBeVisible();
    const vendorSubmission = await db.query<{ id: string; packageId: string | null; kind: string }>('SELECT id,"packageId",kind FROM external_portal_records WHERE "grantId"=$1 AND kind=\'PRODUCTION_STATUS\'', [vendorGrant.rows[0]!.id]);
    expect(vendorSubmission.rows).toHaveLength(1);
    expect(vendorSubmission.rows[0]).toMatchObject({ packageId, kind: "PRODUCTION_STATUS" });
    const packageAfter = await db.query<{ version: number; state: string; data: Record<string, unknown> }>("SELECT version,state,data FROM site_records WHERE id=$1 AND kind='PACKAGE'", [packageId]);
    expect(packageAfter.rows).toEqual(packageBefore.rows);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const vendorScreenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach("s21-vendor-" + testInfo.project.name, { body: vendorScreenshot, contentType: "image/png" });
    writeFileSync(join(resolve(".env.s21-tools", "screenshots"), "s21-vendor-" + testInfo.project.name + ".png"), vendorScreenshot);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your project portal" })).toBeVisible();
    expect(internalRequests).toEqual([]);
    externalPhaseCapture = false;
  } finally {
    await db.query('UPDATE external_portal_sessions SET "revokedAt"=CURRENT_TIMESTAMP WHERE "accountId"=(SELECT id FROM accounts WHERE "normalizedEmail"=$1 AND kind=\'EXTERNAL\') AND "revokedAt" IS NULL', [externalEmail]);
    if (vendorEmail) await db.query('UPDATE external_portal_sessions SET "revokedAt"=CURRENT_TIMESTAMP WHERE "accountId"=(SELECT id FROM accounts WHERE "normalizedEmail"=$1 AND kind=\'EXTERNAL\') AND "revokedAt" IS NULL', [vendorEmail]);
    await db.query('UPDATE sessions SET "revokedAt"=CURRENT_TIMESTAMP WHERE id=$1', [ownerSessionId]);
    await db.end();
  }
});

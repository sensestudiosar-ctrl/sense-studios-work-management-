import { test, expect } from "@playwright/test";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";

test("Owner uploads immutable project files, creates R0/R1/CR1, selects client review, and refreshes the gated register", async ({ page, context, baseURL }) => {
  test.setTimeout(120_000);
  test.skip(!process.env.DATABASE_URL || !process.env.NAS_ROOT, "Dedicated local test database and isolated NAS_ROOT are required");
  const url = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1", "db"].includes(url.hostname) || !url.pathname.endsWith("_test")) throw new Error("Revision browser fixture requires a dedicated test database");
  const require = createRequire(resolve("apps/api/package.json"));
  const { Client } = require("pg") as typeof import("pg");
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const suffix = randomUUID();
  const ownerSecret = randomBytes(32).toString("base64url");
  const csrf = createHmac("sha256", ownerSecret).update("csrf").digest("base64url");
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const branchId = randomUUID(), teamId = randomUUID(), projectId = randomUUID();
  const employeeId = randomUUID(), staffAccountId = randomUUID();
  const ownerSessionId = randomUUID();
  const title = `S12 revision ${suffix.slice(0, 8)}`;
  const documentNumber = `A-${suffix.slice(0, 8)}`;
  await db.connect();
  let ownerAccountId: string;
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(6092706)");
    const org = await db.query<{ id: string }>("SELECT id FROM organizations LIMIT 1");
    const organizationId = org.rows[0]?.id ?? randomUUID();
    if (!org.rows[0]) await db.query('INSERT INTO organizations(id,name,"updatedAt") VALUES($1,$2,CURRENT_TIMESTAMP)', [organizationId, "S12 revision browser fixture"]);
    const owner = await db.query<{ id: string }>("SELECT id FROM accounts WHERE kind='OWNER' AND state='ACTIVE' LIMIT 1");
    ownerAccountId = owner.rows[0]?.id ?? randomUUID();
    if (!owner.rows[0]) await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'OWNER\',\'ACTIVE\',CURRENT_TIMESTAMP)', [ownerAccountId, `s12-revision-owner-${suffix}@example.test`]);
    const credentials = await db.query<{ count: string }>('SELECT count(*)::text AS count FROM passkey_credentials WHERE "accountId"=$1 AND "revokedAt" IS NULL', [ownerAccountId]);
    for (let index = Number(credentials.rows[0]?.count ?? "0"); index < 2; index += 1) {
      await db.query('INSERT INTO passkey_credentials(id,"credentialId","accountId","publicKey") VALUES($1,$2,$3,$4)', [randomUUID(), randomUUID(), ownerAccountId, randomBytes(32)]);
    }
    const recovery = await db.query('SELECT id FROM owner_recovery_codes WHERE "accountId"=$1 AND "usedAt" IS NULL AND "replacedAt" IS NULL AND "acknowledgedAt" IS NOT NULL LIMIT 1', [ownerAccountId]);
    if (!recovery.rows[0]) await db.query('INSERT INTO owner_recovery_codes(id,"accountId","codeHash","acknowledgedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [randomUUID(), ownerAccountId, hash(randomUUID())]);
    await db.query('INSERT INTO branches(id,"organizationId",name,"updatedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [branchId, organizationId, `S12 revision ${suffix}`]);
    await db.query('INSERT INTO teams(id,"organizationId","branchId",name,"updatedAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)', [teamId, organizationId, branchId, `S12 revision team ${suffix}`]);
    await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'STAFF\',\'ACTIVE\',CURRENT_TIMESTAMP)', [staffAccountId, `s12-revision-lead-${suffix}@example.test`]);
    await db.query('INSERT INTO employees(id,"organizationId","accountId","homeBranchId","homeTeamId","hiredAt","updatedAt") VALUES($1,$2,$3,$4,$5,CURRENT_DATE,CURRENT_TIMESTAMP)', [employeeId, organizationId, staffAccountId, branchId, teamId]);
    for (const permissionKey of ["project.view", "project.manage"]) await db.query('INSERT INTO employee_permission_overrides(id,"organizationId","employeeId","permissionKey",effect,"scopeKind","branchId",reason) VALUES($1,$2,$3,$4,\'ALLOW\',\'BRANCH\',$5,$6)', [randomUUID(), organizationId, employeeId, permissionKey, branchId, "S12 Active project fixture"]);
    await db.query('INSERT INTO projects(id,"organizationId","branchId",title,"deliveryType","createdById","updatedAt") VALUES($1,$2,$3,$4,\'DESIGN\',$5,CURRENT_TIMESTAMP)', [projectId, organizationId, branchId, title, ownerAccountId]);
    await db.query('INSERT INTO project_scopes(id,"projectId","organizationId",name,"normalizedName",baseline) VALUES($1,$2,$3,$4,$5,true)', [randomUUID(), projectId, organizationId, "Architecture", "architecture"]);
    await db.query('INSERT INTO project_status_changes(id,"projectId","organizationId","toStatus","projectVersion","actorId",reason) VALUES($1,$2,$3,\'DRAFT\',1,$4,$5)', [randomUUID(), projectId, organizationId, ownerAccountId, "S12 revision browser fixture"]);
    await db.query('INSERT INTO sessions(id,"accountId","tokenHash","csrfTokenHash","expiresAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP+interval \'1 hour\')', [ownerSessionId, ownerAccountId, hash(ownerSecret), hash(csrf)]);
    await db.query("COMMIT");

    await context.addCookies([{ name: "sense_sid", value: ownerSecret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
    const ownerHeaders = { Cookie: `sense_sid=${ownerSecret}`, Origin: baseURL!, "X-CSRF-Token": csrf };
    expect((await page.request.post(`/api/v1/projects/${projectId}/assignments`, { headers: ownerHeaders, data: { employeeId, expectedVersion: 1, reason: "Assign eligible Project Lead" } })).status()).toBe(201);
    expect((await page.request.post(`/api/v1/projects/${projectId}/lead`, { headers: ownerHeaders, data: { employeeId, expectedVersion: 2, reason: "Set eligible Project Lead" } })).status()).toBe(201);
    expect((await page.request.post(`/api/v1/projects/${projectId}/status`, { headers: ownerHeaders, data: { toStatus: "ACTIVE", expectedVersion: 3, reason: "Activate revision acceptance project" } })).status()).toBe(201);
    await page.goto("/documents");
    const documents = page.locator(".document-workspace");
    await expect(documents.getByRole("heading", { name: "Documents" })).toBeVisible();
    await expect(documents.getByText("Loading project document access…")).toBeHidden();
    await documents.getByLabel("Document project branch").selectOption(branchId);
    await expect(documents.getByText("Loading project document access…")).toBeHidden();
    await expect(documents.getByLabel("Document project", { exact: true }).locator(`option[value="${projectId}"]`)).toHaveCount(1);
    await documents.getByLabel("Document project", { exact: true }).selectOption(projectId);
    await expect(documents.getByLabel("Document project", { exact: true })).toHaveValue(projectId);
    await expect(documents.getByText("No files have been registered for this project.")).toBeVisible();
    await documents.getByLabel("Folder name").fill("Revision evidence");
    await documents.getByLabel("Reason").first().fill("Create a folder for revision evidence");
    await documents.getByRole("button", { name: "Create folder" }).click();
    await expect(documents.getByText("Folder created.")).toBeVisible();
    const folder = await db.query<{ id: string }>('SELECT id FROM document_folders WHERE "projectId"=$1 AND name=\'Revision evidence\'', [projectId]);
    expect(folder.rows).toHaveLength(1);
    await documents.getByLabel("Upload destination folder").selectOption(folder.rows[0]!.id);

    const content = {
      "initial-r0.pdf": Buffer.from(`%PDF-1.7\nS12 initial ${suffix}\n%%EOF\n`, "ascii"),
      "internal-r1.pdf": Buffer.from(`%PDF-1.7\nS12 internal revision ${suffix}\n%%EOF\n`, "ascii"),
      "client-cr1.pdf": Buffer.from(`%PDF-1.7\nS12 client review ${suffix}\n%%EOF\n`, "ascii"),
    };
    for (const [fileName, bytes] of Object.entries(content)) {
      await documents.getByLabel("File", { exact: true }).setInputFiles({ name: fileName, mimeType: "application/pdf", buffer: bytes });
      await documents.locator("section.document-form").getByLabel("Reason").fill(`Register ${fileName} as immutable revision evidence`);
      await documents.getByRole("button", { name: "Upload and register" }).click();
      await expect(documents.getByText("File uploaded and registered.")).toBeVisible();
      const persisted = await db.query<{ sha256: string }>('SELECT b."sha256" FROM documents d JOIN file_blob_metadata b ON b."documentId"=d.id WHERE d."projectId"=$1 AND b."fileName"=$2', [projectId, fileName]);
      expect(persisted.rows).toEqual([{ sha256: createHash("sha256").update(bytes).digest("hex") }]);
    }

    await page.goto("/revisions");
    const workspace = page.locator(".revision-workspace");
    await expect(workspace.getByRole("heading", { name: "Drawing register" })).toBeVisible();
    await expect(workspace.getByText("Loading project drawing access…")).toBeHidden();
    await workspace.getByLabel("Revision project branch").selectOption(branchId);
    await expect(workspace.getByLabel("Revision project", { exact: true }).locator(`option[value="${projectId}"]`)).toHaveCount(1);
    await workspace.getByLabel("Revision project", { exact: true }).selectOption(projectId);
    await expect(workspace.getByText("No drawings have been registered for this project.")).toBeVisible();
    const files = await db.query<{ id: string; fileName: string }>('SELECT d.id,b."fileName" FROM documents d JOIN file_blob_metadata b ON b."documentId"=d.id WHERE d."projectId"=$1 ORDER BY b."fileName"', [projectId]);
    const fileId = (fileName: string) => files.rows.find((file) => file.fileName === fileName)!.id;
    await workspace.getByLabel("Drawing document number").fill(documentNumber);
    await workspace.getByLabel("Drawing title").fill("Ground floor plan");
    await workspace.getByLabel("Drawing file").selectOption(fileId("initial-r0.pdf"));
    await workspace.getByLabel("Initial revision reason").fill("Register approved source file as initial drawing");
    await workspace.getByRole("button", { name: "Create drawing as R0" }).click();
    await expect(workspace.getByText("Drawing created with immutable revision R0.")).toBeVisible();
    await expect(workspace.getByLabel("Formal issue gate")).toContainText("Internal review approval is required (S13)");
    const drawing = await db.query<{ id: string }>('SELECT id FROM drawing_records WHERE "projectId"=$1 AND "documentNumber"=$2', [projectId, documentNumber]);
    expect(drawing.rows).toHaveLength(1);

    await workspace.getByRole("button", { name: "Require client review" }).click();
    await workspace.getByLabel(`Client review reason for ${documentNumber}`).fill("Owner selects the drawing for client review");
    await workspace.getByRole("button", { name: "Confirm client review requirement" }).click();
    await expect(workspace.getByText("Client approval is required before formal issue. Exact client decisions and portal evidence belong to S14.")).toBeVisible();
    const selected = await db.query<{ clientApprovalRequired: boolean; count: string }>('SELECT d."clientApprovalRequired",count(s.id)::text AS count FROM drawing_records d LEFT JOIN drawing_client_review_selections s ON s."drawingId"=d.id WHERE d.id=$1 GROUP BY d.id', [drawing.rows[0]!.id]);
    expect(selected.rows).toEqual([{ clientApprovalRequired: true, count: "1" }]);

    await workspace.getByLabel("Revision series").selectOption("R");
    await workspace.getByLabel("Revision file").selectOption(fileId("internal-r1.pdf"));
    await workspace.getByLabel("Append revision reason").fill("Update dimensions after internal coordination");
    await workspace.getByRole("button", { name: "Add revision" }).click();
    await expect(workspace.getByText("Revision added to " + documentNumber + ". The new revision is in Working state.")).toBeVisible();
    await workspace.getByLabel("Revision series").selectOption("CR");
    await workspace.getByLabel("Revision file").selectOption(fileId("client-cr1.pdf"));
    await workspace.getByLabel("Append revision reason").fill("Prepare client requested series revision");
    await workspace.getByRole("button", { name: "Add revision" }).click();

    await expect(workspace.getByText("CR1", { exact: true })).toBeVisible();
    await expect(workspace.getByText("R1", { exact: true })).toBeVisible();
    await expect(workspace.getByText("R0", { exact: true })).toBeVisible();
    await expect(workspace.getByLabel("Formal issue gate")).toContainText("Internal review approval is required (S13)");
    const persisted = await db.query<{ series: string; number: number; state: string; current: boolean; sha256: string }>('SELECT r.series::text,r.number,r.state::text,r."isCurrent" AS current,r."sha256" FROM document_revisions r WHERE r."drawingId"=$1 ORDER BY r.ordinal', [drawing.rows[0]!.id]);
    expect(persisted.rows.map(({ series, number, state, current }) => ({ series, number, state, current }))).toEqual([
      { series: "R", number: 0, state: "WORKING", current: false },
      { series: "R", number: 1, state: "WORKING", current: false },
      { series: "CR", number: 1, state: "WORKING", current: false },
    ]);
    expect(persisted.rows.map((row) => row.sha256)).toEqual(Object.values(content).map((bytes) => createHash("sha256").update(bytes).digest("hex")));
    const r0 = await db.query<{ id: string }>('SELECT id FROM document_revisions WHERE "drawingId"=$1 AND series=\'R\' AND number=0', [drawing.rows[0]!.id]);
    expect(r0.rows).toHaveLength(1);
    const retained = await page.request.get(`/api/v1/revisions/${r0.rows[0]!.id}/stream`);
    expect(retained.status()).toBe(200);
    expect(retained.headers()["cache-control"]).toBe("no-store");
    expect(retained.headers()["x-revision-label"]).toBe("R0");
    expect(await retained.body()).toEqual(content["initial-r0.pdf"]);
    await page.reload();
    await expect(workspace.getByLabel("Revision project branch").locator(`option[value="${branchId}"]`)).toHaveCount(1);
    await workspace.getByLabel("Revision project branch").selectOption(branchId);
    await expect(workspace.getByLabel("Revision project", { exact: true }).locator(`option[value="${projectId}"]`)).toHaveCount(1);
    await workspace.getByLabel("Revision project", { exact: true }).selectOption(projectId);
    await expect(workspace.getByText("CR1", { exact: true })).toBeVisible();
    await expect(workspace.getByText("R1", { exact: true })).toBeVisible();
    await expect(workspace.getByText("R0", { exact: true })).toBeVisible();
    await expect(workspace.getByLabel("Formal issue gate")).toContainText("Internal review approval is required (S13)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    await db.query("ROLLBACK");
    await db.query('UPDATE sessions SET "revokedAt"=CURRENT_TIMESTAMP WHERE id=$1', [ownerSessionId]);
    await db.end();
  }
});

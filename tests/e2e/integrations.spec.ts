import { expect, test } from "@playwright/test";
import { isS27DisposableTestTarget, matchesS27DisposableServer } from "../../apps/api/src/s27-disposable-test-target.js";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

test.use({ trace: "off" });

const fixtureUrl = process.env.DATABASE_URL;
const disposableS27Database = Boolean(process.env.DATABASE_URL && isS27DisposableTestTarget("DATABASE_URL", process.env.DATABASE_URL));
const screenshotDirectory = resolve(process.env.S25_SCREENSHOT_DIR ?? ".env.s25-tools/screenshots");
type FixtureDatabase = {
  connect(): Promise<void>;
  query<Row extends Record<string, unknown> = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{ rows: Row[]; rowCount: number | null }>;
  end(): Promise<void>;
};

test("S25 minimal calendar events, export and revocable subscription", async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(240_000);
  page.setDefaultTimeout(15_000);
  test.skip((process.env.S25_E2E_ENABLED !== "1" && process.env.S27_E2E_ENABLED !== "1") || !fixtureUrl, "Set S25_E2E_ENABLED=1 or S27_E2E_ENABLED=1 with an exact local PostgreSQL database");
  const databaseUrl = new URL(fixtureUrl!);
  const explicitlyEnabledS25Database = process.env.S25_E2E_ENABLED === "1"
    && ["localhost", "127.0.0.1"].includes(databaseUrl.hostname)
    && ["56433", "57433"].includes(databaseUrl.port)
    && /^\/sense_s25_main_s25_[a-z0-9_]+_test$/i.test(databaseUrl.pathname);
  const explicitlyEnabledS26Database = process.env.S26_E2E_ENABLED === "1" && ["localhost", "127.0.0.1"].includes(databaseUrl.hostname) && databaseUrl.port === "57433" && /^\/sense_s26_main_s26_[a-z0-9_]+_test$/i.test(databaseUrl.pathname);
  const explicitlyEnabledS27Database = process.env.S27_E2E_ENABLED === "1" && databaseUrl.hostname === "127.0.0.1" && databaseUrl.port === "57433" && /^\/sense_s27_main_s27_[a-z0-9_]+_test$/.test(databaseUrl.pathname) || disposableS27Database;
  if (!["localhost", "127.0.0.1"].includes(databaseUrl.hostname)
    || ((!explicitlyEnabledS25Database && !explicitlyEnabledS26Database && !explicitlyEnabledS27Database) && !["56433", "56434"].includes(databaseUrl.port))
    || (!/^\/sense_s25_main_s25_[a-z0-9_]+_test$/i.test(databaseUrl.pathname) && !explicitlyEnabledS26Database && !explicitlyEnabledS27Database)) {
    throw new Error("S25 calendar E2E requires the guarded local sense_s25_main_s25_*_test database on port 56433 or 56434");
  }

  const require = createRequire(resolve("apps/api/package.json"));
  const { Client } = require("pg") as { Client: new (config: { connectionString: string }) => FixtureDatabase };
  const db = new Client({ connectionString: fixtureUrl! });
  const suffix = randomUUID();
  const personalDate = new Date(Date.UTC(2030, 0, 1 + Number.parseInt(suffix.replaceAll("-", "").slice(0, 6), 16) % 9000)).toISOString().slice(0, 10);
  const projectDate = new Date(Date.parse(`${personalDate}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const digest = (value: string) => createHash("sha256").update(value).digest("hex");
  const ownerSecret = randomBytes(32).toString("base64url");
  const ownerCsrf = createHmac("sha256", ownerSecret).update("csrf").digest("base64url");
  const staffSecret = randomBytes(32).toString("base64url");
  const ownerSessionId = randomUUID(), staffSessionId = randomUUID();
  const staffAccountId = randomUUID(), employeeId = randomUUID(), teamId = randomUUID();
  let ownerAccountId: string, organizationId: string, branchId: string;

  await db.connect();
  if (disposableS27Database) {
    const identity = await db.query<{ database: string; port: number }>("SELECT current_database() AS database, inet_server_port() AS port");
    if (!matchesS27DisposableServer(process.env.DATABASE_URL!, identity.rows[0]!.database, identity.rows[0]!.port)) throw new Error("Connected PostgreSQL server does not match the guarded S27 disposable target");
  }
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(61025001)");
    const organization = await db.query<{ id: string }>("SELECT id FROM organizations LIMIT 1");
    organizationId = organization.rows[0]?.id ?? randomUUID();
    if (!organization.rows[0]) await db.query('INSERT INTO organizations(id,name,"updatedAt") VALUES($1,$2,CURRENT_TIMESTAMP)', [organizationId, `S25 calendar ${suffix}`]);
    const owner = await db.query<{ id: string }>("SELECT id FROM accounts WHERE kind='OWNER' AND state='ACTIVE' LIMIT 1");
    ownerAccountId = owner.rows[0]?.id ?? randomUUID();
    if (!owner.rows[0]) await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'OWNER\',\'ACTIVE\',CURRENT_TIMESTAMP)', [ownerAccountId, `s25-calendar-owner-${suffix}@example.test`]);
    const keyCount = await db.query<{ count: number }>('SELECT count(*)::int AS count FROM passkey_credentials WHERE "accountId"=$1 AND "revokedAt" IS NULL', [ownerAccountId]);
    for (let index = keyCount.rows[0]!.count; index < 2; index += 1) await db.query('INSERT INTO passkey_credentials(id,"credentialId","accountId","publicKey") VALUES($1,$2,$3,$4)', [randomUUID(), randomUUID(), ownerAccountId, randomBytes(32)]);
    const recovery = await db.query('SELECT id FROM owner_recovery_codes WHERE "accountId"=$1 AND "usedAt" IS NULL AND "replacedAt" IS NULL AND "acknowledgedAt" IS NOT NULL LIMIT 1', [ownerAccountId]);
    if (!recovery.rows[0]) await db.query('INSERT INTO owner_recovery_codes(id,"accountId","codeHash","acknowledgedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [randomUUID(), ownerAccountId, digest(randomUUID())]);
    const branch = await db.query<{ id: string }>('SELECT id FROM branches WHERE "organizationId"=$1 AND active=true ORDER BY id LIMIT 1', [organizationId]);
    branchId = branch.rows[0]?.id ?? randomUUID();
    if (!branch.rows[0]) await db.query('INSERT INTO branches(id,"organizationId",name,"updatedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)', [branchId, organizationId, `S25 calendar ${suffix}`]);
    await db.query('INSERT INTO teams(id,"organizationId","branchId",name,"updatedAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)', [teamId, organizationId, branchId, `S25 calendar team ${suffix}`]);
    await db.query('INSERT INTO accounts(id,"normalizedEmail",kind,state,"updatedAt") VALUES($1,$2,\'STAFF\',\'ACTIVE\',CURRENT_TIMESTAMP)', [staffAccountId, `s25-calendar-staff-${suffix}@example.test`]);
    await db.query('INSERT INTO employees(id,"organizationId","accountId","homeBranchId","homeTeamId","hiredAt","updatedAt") VALUES($1,$2,$3,$4,$5,CURRENT_DATE,CURRENT_TIMESTAMP)', [employeeId, organizationId, staffAccountId, branchId, teamId]);
    for (const permission of ["project.view", "project.manage"]) await db.query('INSERT INTO employee_permission_overrides(id,"organizationId","employeeId","permissionKey",effect,"scopeKind","branchId",reason) VALUES($1,$2,$3,$4,\'ALLOW\',\'BRANCH\',$5,$6)', [randomUUID(), organizationId, employeeId, permission, branchId, "Scoped S25 calendar browser fixture"]);
    await db.query('INSERT INTO sessions(id,"accountId","tokenHash","csrfTokenHash","expiresAt") VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP+interval \'2 hours\'),($5,$6,$7,$8,CURRENT_TIMESTAMP+interval \'2 hours\')', [ownerSessionId, ownerAccountId, digest(ownerSecret), digest(ownerCsrf), staffSessionId, staffAccountId, digest(staffSecret), digest(createHmac("sha256", staffSecret).update("csrf").digest("base64url"))]);
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally { await db.end(); }

  const ownerHeaders = { Cookie: `sense_sid=${ownerSecret}`, Origin: baseURL!, "X-CSRF-Token": ownerCsrf };
  const staffCsrf = createHmac("sha256", staffSecret).update("csrf").digest("base64url");
  const command = async (path: string, method: "post" | "put", data: unknown, secret = ownerSecret, csrf = ownerCsrf) => {
    const response = await page.request[method](path, { headers: { Cookie: `sense_sid=${secret}`, Origin: baseURL!, "X-CSRF-Token": csrf }, data });
    expect(response.status()).toBe(method === "post" ? 201 : 200);
    return response.json() as Promise<Record<string, unknown>>;
  };
  const projectResponse = await page.request.post("/api/v1/projects", { headers: ownerHeaders, data: { branchId, title: `Private S25 ${suffix}`, deliveryType: "DESIGN", scopes: ["Architecture"], reason: "Create isolated S25 calendar project" } });
  expect(projectResponse.status()).toBe(201);
  const project = (await projectResponse.json() as { project: { id: string } }).project;
  const projectCommand = async (path: string, data: unknown) => {
    const response = await page.request.post(`/api/v1/projects/${project.id}/${path}`, { headers: ownerHeaders, data });
    expect(response.status()).toBe(201);
    return response.json() as Promise<Record<string, unknown>>;
  };
  await projectCommand("assignments", { employeeId, expectedVersion: 1, reason: "Assign calendar fixture project manager" });
  const versionAfterAssignment = await dbVersion(project.id, fixtureUrl!);
  await projectCommand("lead", { employeeId, expectedVersion: versionAfterAssignment, reason: "Set calendar fixture project lead" });
  const versionAfterLead = await dbVersion(project.id, fixtureUrl!);
  await projectCommand("status", { toStatus: "ACTIVE", expectedVersion: versionAfterLead, reason: "Activate calendar fixture project" });

  await context.addCookies([{ name: "sense_sid", value: ownerSecret, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
  const screenshot = async (name: string) => {
    await mkdir(screenshotDirectory, { recursive: true });
    if (testInfo.project.name === "mobile-chromium") await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: resolve(screenshotDirectory, `s25-integrations-${testInfo.project.name}-${name}.png`), fullPage: testInfo.project.name !== "mobile-chromium" });
  };
  await page.goto("/integrations");
  const workspace = page.locator(".integrations-workspace");
  const calendarForm = workspace.locator("form").first();
  await expect(workspace.getByRole("heading", { name: "Calendar", exact: true })).toBeVisible();
  await expect(workspace.getByRole("button", { name: "Download .ics" })).toBeVisible();
  await expect(workspace.getByRole("button", { name: "Create subscription link" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await screenshot("initial");

  const starts = `${personalDate}T10:00`, ends = `${personalDate}T11:00`;
  const personalStartAt = await page.evaluate(value => new Date(value).toISOString(), starts);
  const personalDateLabel = await page.evaluate(value => new Date(value).toLocaleString(), personalStartAt);
  await workspace.getByLabel("Event type").selectOption("MEETING");
  await workspace.getByLabel("Project (optional)").selectOption("");
  await workspace.getByLabel("Starts").fill(starts); await workspace.getByLabel("Ends").fill(ends);
  await calendarForm.getByLabel("Reason").fill("Record personal calendar meeting");
  const personalSaved = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/v1/integrations/calendar/events");
  await workspace.getByRole("button", { name: "Save event" }).click();
  const personalResponse = await personalSaved;
  expect(personalResponse.status()).toBe(201);
  const personalEvent = await personalResponse.json() as { id: string };
  const personalRow = workspace.getByRole("listitem").filter({ hasText: "Meeting" }).filter({ hasText: "Personal event" }).filter({ hasText: personalDateLabel });
  await expect(personalRow).toBeVisible();
  await page.reload();
  await expect(workspace.getByRole("listitem").filter({ hasText: "Meeting" }).filter({ hasText: "Personal event" }).filter({ hasText: personalDateLabel })).toBeVisible();

  await workspace.getByLabel("Event type").selectOption("SITE_VISIT");
  await workspace.getByLabel("Project (optional)").selectOption(project.id);
  await workspace.getByLabel("Starts").fill(`${projectDate}T10:00`); await workspace.getByLabel("Ends").fill(`${projectDate}T11:00`);
  await calendarForm.getByLabel("Reason").fill("Record project site visit");
  const projectSaved = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/v1/integrations/calendar/events");
  await workspace.getByRole("button", { name: "Save event" }).click();
  const projectSavedResponse = await projectSaved;
  expect(projectSavedResponse.status()).toBe(201);
  const projectEvent = await projectSavedResponse.json() as { id: string };
  let projectRow = workspace.getByRole("listitem").filter({ hasText: "Site visit" }).filter({ hasText: `Private S25 ${suffix}` });
  await expect(projectRow).toBeVisible();
  await page.reload();
  projectRow = workspace.getByRole("listitem").filter({ hasText: "Site visit" }).filter({ hasText: `Private S25 ${suffix}` });
  await expect(projectRow).toBeVisible();
  await projectRow.getByRole("button", { name: "Edit" }).click();
  await workspace.getByLabel("Starts").fill(`${projectDate}T12:00`); await workspace.getByLabel("Ends").fill(`${projectDate}T13:00`);
  await calendarForm.getByLabel("Reason").fill("Move project site visit after refresh");
  const activeEvents = await page.request.get("/api/v1/integrations/calendar.ics");
  expect(activeEvents.status()).toBe(200);
  const currentCalendar = await activeEvents.text();
  expect(currentCalendar).toContain("SUMMARY:Meeting");
  expect(currentCalendar).toContain("SUMMARY:Site visit");
  expect(currentCalendar).not.toContain(`Private S25 ${suffix}`);
  expect(currentCalendar).not.toContain("Record project site visit");

  const updateFromOtherTab = await command(`/api/v1/integrations/calendar/events/${projectEvent.id}`, "put", { commandId: randomUUID(), reason: "Concurrent calendar change", expectedVersion: 1, startAt: `${projectDate}T07:00:00.000Z`, endAt: `${projectDate}T08:00:00.000Z` });
  expect(updateFromOtherTab.version).toBe(2);
  const staleSave = page.waitForResponse(response => response.request().method() === "PUT" && new URL(response.url()).pathname.includes("/api/v1/integrations/calendar/events/"));
  await workspace.getByRole("button", { name: "Save changes" }).click();
  expect((await staleSave).status()).toBe(409);
  await expect(workspace.getByRole("alert")).toContainText("changed elsewhere");
  await workspace.getByRole("button", { name: "Stop editing" }).click();
  const refreshedSetup = page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname === "/api/v1/integrations/setup");
  await workspace.getByRole("button", { name: "Refresh calendar" }).click();
  expect((await refreshedSetup).status()).toBe(200);
  projectRow = workspace.getByRole("listitem").filter({ hasText: "Site visit" }).filter({ hasText: `Private S25 ${suffix}` });
  const concurrentStart = `${projectDate}T07:00:00.000Z`;
  const concurrentStartLabel = await page.evaluate(value => new Date(value).toLocaleString(), concurrentStart);
  await expect(projectRow).toContainText(concurrentStartLabel);
  await projectRow.getByRole("button", { name: "Edit" }).click();
  await workspace.getByLabel("Starts").fill(`${projectDate}T14:00`); await workspace.getByLabel("Ends").fill(`${projectDate}T15:00`);
  await calendarForm.getByLabel("Reason").fill("Save current project site visit time");
  const successfulSave = page.waitForResponse(response => response.request().method() === "PUT" && new URL(response.url()).pathname.includes("/api/v1/integrations/calendar/events/"));
  await workspace.getByRole("button", { name: "Save changes" }).click();
  expect((await successfulSave).status()).toBe(200);
  projectRow = workspace.getByRole("listitem").filter({ hasText: "Site visit" }).filter({ hasText: `Private S25 ${suffix}` });
  page.once("dialog", dialog => dialog.accept("Cancel project site visit after acceptance"));
  const cancelled = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname.includes("/cancel"));
  await projectRow.getByRole("button", { name: "Cancel" }).click();
  const cancelResponse = await cancelled;
  expect(cancelResponse.status()).toBe(201);
  const cancelledEvent = await cancelResponse.json() as { version: number };
  await expect(projectRow).toContainText("Cancelled");
  const afterCancel = await page.request.get("/api/v1/integrations/calendar.ics");
  const cancelledBlocks = (await afterCancel.text()).split("BEGIN:VEVENT\r\n").slice(1).map(block => block.split("END:VEVENT")[0] ?? "");
  const cancelledSiteVisit = cancelledBlocks.find(block => block.includes("SUMMARY:Site visit"));
  expect(cancelledSiteVisit).toBeDefined();
  expect(cancelledSiteVisit).toContain("STATUS:CANCELLED");
  expect(cancelledSiteVisit).toContain(`SEQUENCE:${cancelledEvent.version}`);

  const createLink = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/v1/integrations/calendar/subscription");
  await workspace.getByRole("button", { name: "Create subscription link" }).click();
  expect((await createLink).status()).toBe(201);
  const privateUrl = await workspace.getByLabel("Private subscription URL").inputValue();
  const subscriptionResponse = await page.request.get(privateUrl);
  expect(subscriptionResponse.status()).toBe(200);
  const subscriptionCalendar = await subscriptionResponse.text();
  expect(subscriptionCalendar).toContain("SUMMARY:Meeting");
  expect(subscriptionCalendar).not.toContain(`Private S25 ${suffix}`);
  await workspace.getByRole("button", { name: "Revoke link" }).click();
  await expect(workspace.getByRole("status").filter({ hasText: "Subscription revoked" })).toBeVisible();
  expect((await page.request.get(privateUrl)).status()).toBe(404);
  await expect(workspace.getByLabel("Private subscription URL")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await screenshot("revoked");

  const crmSetupResponse = await page.request.get("/api/v1/crm/setup", { headers: { Cookie: `sense_sid=${ownerSecret}` } });
  expect(crmSetupResponse.status()).toBe(200);
  const integrationSetupResponse = await page.request.get("/api/v1/integrations/setup", { headers: { Cookie: `sense_sid=${ownerSecret}` } });
  expect(integrationSetupResponse.status()).toBe(200);
  const integrationSetup = await integrationSetupResponse.json() as { connectorOptions: { branches: Array<{ id: string; name: string }>; sources: Array<{ id: string; label: string }>; actors: Array<{ id: string; label: string }> } };
  const connectorBranch = integrationSetup.connectorOptions.branches.find(branch => branch.id === branchId) ?? integrationSetup.connectorOptions.branches[0];
  const websiteSource = integrationSetup.connectorOptions.sources.find(source => source.label === "Website");
  const connectorActor = integrationSetup.connectorOptions.actors.find(actor => actor.id === ownerAccountId);
  expect(connectorBranch).toBeDefined();
  expect(websiteSource).toBeDefined();
  expect(connectorActor).toBeDefined();
  const siteLabel = `S25 map ${suffix.slice(0, 8)}`;
  const latitude = 25.201;
  const longitude = 55.301;
  const siteResponse = await page.request.post("/api/v1/workforce/sites", { headers: ownerHeaders, data: { commandId: randomUUID(), projectId: project.id, label: siteLabel, latitude, longitude, radiusMetres: 150, qrCode: randomBytes(16).toString("hex"), reason: "Add authorized project site for map link acceptance" } });
  expect(siteResponse.status()).toBe(201);
  await workspace.getByRole("button", { name: "Refresh calendar" }).click();
  const mapRow = workspace.getByRole("listitem").filter({ hasText: siteLabel });
  await expect(mapRow.getByRole("link", { name: "Open map" })).toHaveAttribute("href", `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}`);
  await expect(mapRow).toContainText(`Private S25 ${suffix}`);

  const connectorLabel = `S25 website ${suffix.slice(0, 8)}`;
  await workspace.getByLabel("Connector label").fill(connectorLabel);
  await workspace.getByRole("combobox", { name: "Branch", exact: true }).selectOption(connectorBranch!.id);
  await workspace.getByRole("combobox", { name: "Website source", exact: true }).selectOption(websiteSource!.id);
  await workspace.getByRole("combobox", { name: "Authorized actor", exact: true }).selectOption(connectorActor!.id);
  await workspace.locator("form").last().getByLabel("Reason").fill("Configure signed S25 website enquiry acceptance");
  const connectorCreated = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/v1/integrations/website-connectors");
  await workspace.getByRole("button", { name: "Create website connector" }).click();
  const connectorCreatedResponse = await connectorCreated;
  if (connectorCreatedResponse.status() !== 201) {
    const safeFailure = await connectorCreatedResponse.json() as { message?: string };
    throw new Error(`Website connector create returned ${connectorCreatedResponse.status()}: ${safeFailure.message ?? "request failed"}`);
  }
  const connectorResult = await connectorCreatedResponse.json() as { id: string; secret: string; version: number };
  expect(connectorResult.secret).toMatch(/^[A-Za-z0-9_-]{40,}$/);
  const signingSecret = connectorResult.secret;
  const enquiry = (title: string) => ({ enquiryId: `external-${randomUUID()}`, title, contactName: "S25 Private Contact", email: `s25-private-${suffix}@example.test`, phone: "+1 555 0100" });
  const firstEnquiry = enquiry(`S25 enquiry ${suffix.slice(0, 8)}`);
  const sendEnquiry = async (secret: string, body: typeof firstEnquiry) => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const canonical = JSON.stringify(body);
    const signature = createHmac("sha256", secret)
      .update(`sense-website-v1\n${connectorResult.id}\n${timestamp}\n${canonical}`)
      .digest("hex");
    return page.request.post(`/api/v1/integrations/website-enquiries/${connectorResult.id}`, { headers: { "x-sense-timestamp": timestamp, "x-sense-signature": signature }, data: body });
  };
  const acceptedEnquiry = await sendEnquiry(signingSecret, firstEnquiry);
  expect(acceptedEnquiry.status()).toBe(201);
  const delivery = await acceptedEnquiry.json() as { deliveryId: string; status: string; replayed: boolean };
  expect(delivery).toMatchObject({ status: "DELIVERED", replayed: false });
  expect(JSON.stringify(delivery)).not.toContain("S25 Private Contact");
  expect(JSON.stringify(delivery)).not.toContain(firstEnquiry.email);
  const replay = await sendEnquiry(signingSecret, firstEnquiry);
  expect(replay.status()).toBe(201);
  expect(await replay.json()).toEqual({ ...delivery, replayed: true });
  const changedPayload = await sendEnquiry(signingSecret, { ...firstEnquiry, title: `${firstEnquiry.title} changed` });
  expect(changedPayload.status()).toBe(409);
  const leadsResponse = await page.request.get(`/api/v1/crm/leads?branchId=${branchId}&limit=100`, { headers: { Cookie: `sense_sid=${ownerSecret}` } });
  expect(leadsResponse.status()).toBe(200);
  const leads = await leadsResponse.json() as { items: Array<Record<string, unknown>> };
  const createdLead = leads.items.find(lead => lead.title === firstEnquiry.title);
  expect(createdLead).toMatchObject({ branchId: connectorBranch!.id, sourceId: websiteSource!.id, stage: "NEW", clientId: null, createdById: ownerAccountId });
  expect(createdLead).not.toHaveProperty("projectId");
  const afterDeliverySetup = await page.request.get("/api/v1/integrations/setup", { headers: { Cookie: `sense_sid=${ownerSecret}` } });
  expect(afterDeliverySetup.status()).toBe(200);
  const connectorSetup = await afterDeliverySetup.json() as { deliveries: Array<{ connectorId: string; externalId: string; status: string }> };
  expect(connectorSetup.deliveries.filter(item => item.connectorId === connectorResult.id)).toEqual([expect.objectContaining({ externalId: firstEnquiry.enquiryId, status: "DELIVERED" })]);

  const websiteSection = workspace.getByRole("region", { name: "Website enquiries", exact: true });
  const connectorRow = websiteSection.locator("ul").first().getByRole("listitem").filter({ hasText: connectorLabel });
  page.once("dialog", dialog => dialog.accept("Rotate website signing credential for acceptance"));
  const rotatedResponsePromise = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/v1/integrations/website-connectors/${connectorResult.id}/rotate`);
  await connectorRow.getByRole("button", { name: "Rotate secret" }).click();
  const rotatedResponse = await rotatedResponsePromise;
  expect(rotatedResponse.status()).toBe(201);
  const rotatedResult = await rotatedResponse.json() as { secret: string; version: number };
  expect(rotatedResult.version).toBe(connectorResult.version + 1);
  expect(rotatedResult.secret).not.toBe(signingSecret);
  const rotatedSecret = rotatedResult.secret;
  const oldCredential = await sendEnquiry(signingSecret, enquiry(`Old secret ${suffix.slice(0, 8)}`));
  expect(oldCredential.status()).toBe(404);
  const rotatedEnquiry = await sendEnquiry(rotatedSecret, enquiry(`Rotated secret ${suffix.slice(0, 8)}`));
  expect(rotatedEnquiry.status()).toBe(201);
  page.once("dialog", dialog => dialog.accept("Disable website signing connector for acceptance"));
  const disabledResponsePromise = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/v1/integrations/website-connectors/${connectorResult.id}/disable`);
  await connectorRow.getByRole("button", { name: "Disable connector" }).click();
  const disabledResponse = await disabledResponsePromise;
  expect(disabledResponse.status()).toBe(201);
  const disabledResult = await disabledResponse.json() as { state: string; version: number };
  expect(disabledResult).toMatchObject({ state: "DISABLED", version: rotatedResult.version + 1 });
  expect(JSON.stringify(disabledResult)).not.toContain("secret");
  const disabledCredential = await sendEnquiry(rotatedSecret, enquiry(`Disabled secret ${suffix.slice(0, 8)}`));
  expect(disabledCredential.status()).toBe(404);
  await page.reload();
  const disabledConnectorRow = websiteSection.locator("ul").first().getByRole("listitem").filter({ hasText: connectorLabel });
  await expect(disabledConnectorRow).toContainText("DISABLED");
  await expect(workspace.getByRole("heading", { name: "Project locations" })).toBeVisible();
  await expect(workspace.getByRole("listitem").filter({ hasText: siteLabel }).getByRole("link", { name: "Open map" })).toHaveAttribute("href", `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}`);
  await expect(workspace.getByLabel("Website signing secret")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await screenshot("connector-map");
  if (testInfo.project.name === "mobile-chromium") {
    await websiteSection.getByRole("heading", { name: "Website enquiries" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(screenshotDirectory, `s25-integrations-${testInfo.project.name}-connector-panel.png`), fullPage: false });
    await websiteSection.getByRole("heading", { name: "Recent delivery status" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(screenshotDirectory, `s25-integrations-${testInfo.project.name}-delivery-panel.png`), fullPage: false });
    await workspace.getByRole("heading", { name: "Project locations" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(screenshotDirectory, `s25-integrations-${testInfo.project.name}-map-panel.png`), fullPage: false });
  }

  const staffCheck = await page.request.get("/api/v1/integrations/calendar", { headers: { Cookie: `sense_sid=${staffSecret}` } });
  expect(staffCheck.status()).toBe(200);
  const staffCalendar = await staffCheck.json() as { events: Array<{ kind: string; start: string }> };
  expect(staffCalendar.events.some(event => event.kind === "MEETING" && event.start === personalStartAt)).toBe(false);
  expect(staffCalendar.events.every(event => event.kind === "SITE_VISIT")).toBe(true);
  expect(personalEvent.id).not.toBe(projectEvent.id);
  void staffCsrf;
});

async function dbVersion(projectId: string, databaseUrl: string): Promise<number> {
  const require = createRequire(resolve("apps/api/package.json"));
  const { Client } = require("pg") as { Client: new (config: { connectionString: string }) => FixtureDatabase };
  const db = new Client({ connectionString: databaseUrl });
  await db.connect();
  try {
    const result = await db.query<{ version: number }>("SELECT version FROM projects WHERE id=$1", [projectId]);
    return result.rows[0]!.version;
  } finally { await db.end(); }
}

import "reflect-metadata";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseService } from "./database.service.js";
import { AccountKind, AccountState, PermissionEffect, PermissionScopeKind } from "./generated/prisma/client.js";
import type { RuntimeConfig } from "./config.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { ClientPortalScopeService } from "./client-portal-scope.service.js";
import { DocumentService } from "./document.service.js";
import { ProjectService, type ProjectActor } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { TaskService } from "./task.service.js";
import { RevisionService } from "./revision.service.js";
import { TurnkeyService } from "./turnkey.service.js";
import { NotificationsService } from "./notifications.service.js";
import { WorkforceService } from "./workforce.service.js";
import { SiteService, type SiteOfflineCommand, type SiteProgressInput } from "./site.service.js";

// S22 integration boundary: run only on a dedicated local test database.
const databaseUrl = process.env.S22_DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: databaseUrl ?? "", webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined };
type F = Awaited<ReturnType<typeof fixture>>;

async function fixture(database: DatabaseService, nasRoot: string) {
  const db = database.prisma, suffix = randomUUID();
  const organization = await db.organization.findFirst() ?? await db.organization.create({ data: { name: `S22 site ${suffix}` } });
  const branch = await db.branch.create({ data: { organizationId: organization.id, name: `S22 branch ${suffix}` } });
  const otherBranch = await db.branch.create({ data: { organizationId: organization.id, name: `S22 other ${suffix}` } });
  const team = await db.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `S22 team ${suffix}` } });
  const ownerAccount = await db.account.findFirst({ where: { kind: AccountKind.OWNER, state: AccountState.ACTIVE } }) ?? await db.account.create({ data: { normalizedEmail: `s22-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
  const makeStaff = async (label: string, homeBranchId = branch.id, homeTeamId = team.id) => {
    const account = await db.account.create({ data: { normalizedEmail: `s22-${label}-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
    const employee = await db.employee.create({ data: { organizationId: organization.id, accountId: account.id, homeBranchId, homeTeamId, hiredAt: new Date("2026-01-01T00:00:00Z") } });
    return { account, employee, actor: { accountId: account.id, organizationId: organization.id, kind: AccountKind.STAFF } as ProjectActor };
  };
  const lead = await makeStaff("lead"), fixer = await makeStaff("fixer"), verifier = await makeStaff("verifier"), viewer = await makeStaff("viewer"), stranger = await makeStaff("stranger", otherBranch.id, (await db.team.create({ data: { organizationId: organization.id, branchId: otherBranch.id, name: `S22 foreign team ${suffix}` } })).id);
  const owner: ProjectActor = { accountId: ownerAccount.id, organizationId: organization.id, kind: AccountKind.OWNER };
  const clientAccount = await db.account.create({ data: { normalizedEmail: `s22-client-${suffix}@example.test`, kind: AccountKind.CLIENT, state: AccountState.ACTIVE } });
  const client: ProjectActor = { accountId: clientAccount.id, organizationId: organization.id, kind: AccountKind.CLIENT };
  const grants: Array<{ employeeId: string; permissions: string[] }> = [
    { employeeId: lead.employee.id, permissions: ["project.view", "project.manage", "site.view"] },
    { employeeId: fixer.employee.id, permissions: ["project.view", "site.view", "site.work"] },
    { employeeId: verifier.employee.id, permissions: ["project.view", "site.view"] },
    { employeeId: viewer.employee.id, permissions: ["project.view", "site.view"] },
    { employeeId: stranger.employee.id, permissions: ["project.view", "site.view", "site.work"] }
  ];
  await db.employeePermissionOverride.createMany({ data: grants.flatMap(({ employeeId, permissions }) => permissions.map(permissionKey => ({ organizationId: organization.id, employeeId, permissionKey, effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: branch.id, reason: "S22 scoped integration fixture" }))) });
  const authorization = new AuthorizationService(database), approvals = new ApprovalService(database), projects = new ProjectService(database);
  const workflows = new ProjectWorkflowService(database, authorization, approvals);
  const tasks = new TaskService(database, authorization, approvals);
  const documents = new DocumentService(database, authorization, { ...config, nasRoot });
  const revisions = new RevisionService(database, authorization, documents);
  const portalScope = new ClientPortalScopeService(database, authorization);
  const turnkey = new TurnkeyService(database, authorization, approvals, revisions, portalScope);
  const workforce = new WorkforceService(database, authorization, approvals, new NotificationsService(database), config);
  const site = new SiteService(database, authorization, documents, turnkey, workforce);
  const project = (await projects.create(owner, { branchId: branch.id, title: `S22 active turnkey ${suffix}`, deliveryType: "TURNKEY", scopes: ["Site integration"], reason: "Create isolated S22 site project" })).project;
  for (const person of [lead, fixer, verifier, viewer]) {
    const row = await db.project.findUniqueOrThrow({ where: { id: project.id } });
    await workflows.assignment(owner, project.id, { employeeId: person.employee.id, expectedVersion: row.version, reason: "Assign current site participant" });
  }
  let current = await db.project.findUniqueOrThrow({ where: { id: project.id } });
  await workflows.lead(owner, project.id, { employeeId: lead.employee.id, expectedVersion: current.version, reason: "Appoint current Project Lead" });
  current = await db.project.findUniqueOrThrow({ where: { id: project.id } });
  await workflows.status(owner, project.id, { toStatus: "ACTIVE", expectedVersion: current.version, reason: "Activate Turnkey site project" });
  const foreign = (await projects.create(owner, { branchId: otherBranch.id, title: `S22 foreign turnkey ${suffix}`, deliveryType: "TURNKEY", scopes: ["Separate branch"], reason: "Create foreign branch project" })).project;
  return {
    db, organizationId: organization.id, projectId: project.id, foreignProjectId: foreign.id, owner, client,
    lead: lead.actor, fixer: fixer.actor, fixerEmployeeId: fixer.employee.id, verifier: verifier.actor, viewer: viewer.actor, viewerEmployeeId: viewer.employee.id, stranger: stranger.actor,
    workflows, tasks, site, documents,
    async uploadConfidentialPhoto() {
      const folder = await documents.createFolder(owner, project.id, { name: `S22 confidential ${suffix}`, confidential: true, reason: "Create private evidence fixture" });
      const bytes = Buffer.from(`%PDF-1.7\\nS22 private site evidence ${suffix}\\n%%EOF\\n`, "ascii");
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const started = await documents.startUpload(owner, project.id, { folderId: folder.id, fileName: `private-${suffix}.pdf`, mimeType: "application/pdf", sizeBytes: bytes.byteLength, confidential: true, viewOnly: false, reason: "Upload private site evidence fixture" });
      await documents.writeChunk(owner, started.uploadId, 0, bytes, sha256);
      const uploaded = await documents.finalize(owner, started.uploadId);
      return { id: uploaded.id, folderId: folder.id, name: uploaded.fileName, sha256 };
    }
  };
}

databaseDescribe("S22 offline site PostgreSQL acceptance", () => {
  let database: DatabaseService;
  let nasRoot: string;
  beforeAll(async () => {
    const parsed = new URL(databaseUrl!);
    if (!/^sense_s22_.*_test$/.test(parsed.pathname.slice(1)) || !["127.0.0.1", "localhost"].includes(parsed.hostname)) throw new Error("S22 requires a dedicated local sense_s22_*_test database");
    nasRoot = await mkdtemp(join(tmpdir(), "sense-s22-files-"));
    database = new DatabaseService({ ...config, databaseUrl: databaseUrl!, nasRoot });
  });
  afterAll(async () => database?.onModuleDestroy());
  const command = (note: string): SiteOfflineCommand => ({ commandId: randomUUID(), localId: randomUUID(), baseRecordVersion: null, reason: "Capture independent site evidence", action: "NOTE", payload: { note, photoIds: [] } });
  const version = async (f: F) => (await f.site.detail(f.owner, f.projectId)).version as number;
  const makePackage = async (f: F) => f.site.createPackage(f.owner, f.projectId, { expectedVersion: await version(f), reason: "Plan scoped site package", title: "Foundation", date: "2026-10-04", tomorrowPlan: "Inspect", plannedPercent: "50", plannedQuantity: "10", unit: "m3", critical: false });
  const progress = (id: string, base: number, percent = "20"): SiteOfflineCommand => ({ commandId: randomUUID(), localId: randomUUID(), baseRecordVersion: base, reason: "Record factual field progress", action: "PACKAGE_PROGRESS", payload: { recordId: id, actualPercent: percent, actualQuantity: "2", qualityStatus: "PENDING", materialStatus: "Received", blockers: "", tomorrowPlan: "Continue", photoIds: [] } });

  it("durably appends independent evidence after unrelated workspace changes and replays once concurrently", async () => {
    const f = await fixture(database, nasRoot), input = command("Morning observation");
    await makePackage(f);
    const results = await Promise.all([f.site.offlineCommand(f.fixer, f.projectId, input), f.site.offlineCommand(f.fixer, f.projectId, input)]);
    expect(results.map(result => result.id)).toEqual([results[0]!.id, results[0]!.id]);
    expect(results.map(result => "replayed" in result && result.replayed).sort()).toEqual([false, true]);
    expect(await f.db.siteCommandReceipt.count({ where: { projectId: f.projectId } })).toBe(1);
    expect(await f.db.siteRecord.count({ where: { projectId: f.projectId, kind: "NOTE" } })).toBe(1);
    expect(await f.db.siteHistory.count({ where: { subjectId: results[0]!.id } })).toBe(1);
    const detail = await f.site.detail(f.fixer, f.projectId) as { notes: Array<{ data: { note: string } }> };
    expect(detail.notes[0]!.data.note).toBe("Morning observation");
    await expect(f.site.offlineCommand(f.fixer, f.projectId, { ...input, payload: { note: "Changed body", photoIds: [] } })).rejects.toThrow("different content");
    await expect(f.site.offlineCommand(f.fixer, f.projectId, { ...input, commandId: randomUUID() })).rejects.toThrow("different content");
    await expect(f.site.offlineCommand(f.owner, f.projectId, input)).rejects.toThrow("different content");
  });

  it("compares target versions, holds stale progress without receipt, and retains amended human versions", async () => {
    const f = await fixture(database, nasRoot), packageRow = await makePackage(f);
    const input = progress(packageRow.id, 1);
    await f.site.offlineCommand(f.fixer, f.projectId, command("An unrelated note"));
    const accepted = await f.site.offlineCommand(f.fixer, f.projectId, input);
    expect("recordVersion" in accepted && accepted.recordVersion).toBe(2);
    const stale = progress(packageRow.id, 1, "30");
    try { await f.site.offlineCommand(f.fixer, f.projectId, stale); throw new Error("Expected conflict"); }
    catch (error) {
      const response = (error as { getResponse(): { code: string; record: { id: string; version: number; data: { actualPercent: string } } } }).getResponse();
      expect(response).toMatchObject({ code: "SITE_RECORD_CONFLICT", record: { id: packageRow.id, version: 2, data: { actualPercent: "20" } } });
    }
    expect(await f.db.siteCommandReceipt.findUnique({ where: { commandId: stale.commandId } })).toBeNull();
    const amended = { ...stale, commandId: randomUUID(), baseRecordVersion: 2, reason: "Compared server progress and amended local observation" };
    await f.site.offlineCommand(f.fixer, f.projectId, amended);
    expect(await f.db.siteHistory.count({ where: { subjectId: packageRow.id } })).toBe(3);
    expect((await f.db.siteRecord.findUniqueOrThrow({ where: { id: packageRow.id } })).data).toMatchObject({ actualPercent: "30" });
  });

  it("serializes competing new progress commands and redacts inaccessible exact evidence from conflict data", async () => {
    const f = await fixture(database, nasRoot), pkg = await makePackage(f);
    const race = await Promise.allSettled([f.site.offlineCommand(f.fixer, f.projectId, progress(pkg.id, 1, "20")), f.site.offlineCommand(f.fixer, f.projectId, progress(pkg.id, 1, "30"))]);
    expect(race.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(race.find(result => result.status === "rejected")).toMatchObject({ reason: { status: 409 } });
    expect(await f.db.siteCommandReceipt.count({ where: { projectId: f.projectId } })).toBe(1);
    expect(await f.db.siteHistory.count({ where: { subjectId: pkg.id } })).toBe(2);
    const privateFile = await f.uploadConfidentialPhoto();
    await f.site.progress(f.owner, pkg.id, { ...(progress(pkg.id, 2).payload as SiteProgressInput), expectedVersion: await version(f), reason: "Retain exact private photo evidence", photoIds: [privateFile.id] });
    try { await f.site.offlineCommand(f.fixer, f.projectId, progress(pkg.id, 2)); throw new Error("Expected conflict"); }
    catch (error) {
      const response = (error as { getResponse(): unknown }).getResponse();
      expect(response).toMatchObject({ code: "SITE_RECORD_CONFLICT", record: { version: 3, data: { photoEvidence: [{ hidden: true }] } } });
      const serialized = JSON.stringify(response);
      for (const privateValue of [privateFile.id, privateFile.name, privateFile.sha256]) expect(serialized).not.toContain(privateValue);
    }
  });

  it("applies only supported independent report, snag and manpower facts through ordinary SITE rules", async () => {
    const f = await fixture(database, nasRoot);
    const base = { commandId: randomUUID(), localId: randomUUID(), baseRecordVersion: null, reason: "Captured factual site activity" };
    const report: SiteOfflineCommand = { ...base, action: "REPORT", payload: { date: "2026-10-04", workCompleted: "Excavated", manpower: [], materialsReceived: "", photoIds: [], issues: "", delayCauses: "", tomorrowPlan: "Pour foundation" } };
    const saved = await f.site.offlineCommand(f.fixer, f.projectId, report);
    expect((await f.db.siteRecord.findUniqueOrThrow({ where: { id: saved.id } })).state).toBe("DRAFT");
    await f.site.offlineCommand(f.fixer, f.projectId, { ...base, commandId: randomUUID(), localId: randomUUID(), action: "SNAG", payload: { title: "Uneven finish", description: "North wall", photoIds: [] } });
    await f.site.offlineCommand(f.fixer, f.projectId, { ...base, commandId: randomUUID(), localId: randomUUID(), action: "MANPOWER", payload: { date: "2026-10-04", trade: "Masonry", count: 4, employeeAccountIds: [], note: "Morning shift" } });
    expect(await f.db.siteCommandReceipt.count({ where: { projectId: f.projectId } })).toBe(3);
    await expect(f.site.offlineCommand(f.fixer, f.projectId, { ...report, commandId: randomUUID(), localId: randomUUID(), baseRecordVersion: 1 })).rejects.toThrow("base record version");
  });

  it("reauthorizes replay and denies branch, record, portal and ended-delivery substitution", async () => {
    const f = await fixture(database, nasRoot), input = command("Private scoped observation");
    await f.site.offlineCommand(f.fixer, f.projectId, input);
    await expect(f.site.offlineCommand(f.viewer, f.projectId, command("No work grant"))).rejects.toThrow();
    await expect(f.site.offlineCommand(f.stranger, f.projectId, command("No assignment"))).rejects.toThrow();
    await expect(f.site.offlineCommand(f.client, f.projectId, command("Portal denied"))).rejects.toThrow();
    await expect(f.site.offlineCommand(f.fixer, f.foreignProjectId, input)).rejects.toThrow();
    const pkg = await makePackage(f);
    await expect(f.site.offlineCommand(f.owner, f.foreignProjectId, progress(pkg.id, 1))).rejects.toThrow("must belong");
    const beforeRevocation = await f.db.project.findUniqueOrThrow({ where: { id: f.projectId } });
    await f.workflows.revokeAssignment(f.owner, f.projectId, f.fixerEmployeeId, { expectedVersion: beforeRevocation.version, reason: "End offline operator access" });
    await expect(f.site.offlineCommand(f.fixer, f.projectId, input)).rejects.toThrow("assignment");
    const current = await f.db.project.findUniqueOrThrow({ where: { id: f.projectId } });
    await f.workflows.status(f.owner, f.projectId, { toStatus: "ON_HOLD", expectedVersion: current.version, reason: "Hold delivery before pending sync" });
    await expect(f.site.offlineCommand(f.owner, f.projectId, command("Held new observation"))).rejects.toThrow("Active project");
  });

  it("rolls back receipt and business evidence on audit failure and SQL guards retain notes/receipts", async () => {
    const f = await fixture(database, nasRoot), input = command("Atomic observation");
    const trigger = `s22_injected_${randomUUID().replaceAll("-", "")}`;
    await f.db.$executeRawUnsafe(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'S22 injected audit failure'; END $$`);
    await f.db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION ${trigger}()`);
    try { await expect(f.site.offlineCommand(f.fixer, f.projectId, input)).rejects.toThrow(); }
    finally { await f.db.$executeRawUnsafe(`DROP TRIGGER ${trigger} ON audit_events`); await f.db.$executeRawUnsafe(`DROP FUNCTION ${trigger}()`); }
    expect(await f.db.siteCommandReceipt.findUnique({ where: { commandId: input.commandId } })).toBeNull();
    expect(await f.db.siteRecord.count({ where: { projectId: f.projectId } })).toBe(0);
    const saved = await f.site.offlineCommand(f.fixer, f.projectId, input);
    await expect(f.db.siteCommandReceipt.update({ where: { commandId: input.commandId }, data: { fingerprint: "a".repeat(64) } })).rejects.toThrow();
    await expect(f.db.siteCommandReceipt.delete({ where: { commandId: input.commandId } })).rejects.toThrow();
    await expect(f.db.siteRecord.update({ where: { id: saved.id }, data: { version: { increment: 1 }, data: { note: "Mutated", photoEvidence: [] } } })).rejects.toThrow();
    const receipt = await f.db.siteCommandReceipt.findUniqueOrThrow({ where: { commandId: input.commandId } });
    const otherEvent = await f.db.siteHistory.findFirstOrThrow({ where: { projectId: f.projectId, subjectType: "site_workspace" } });
    await expect(f.db.siteCommandReceipt.create({ data: { ...receipt, commandId: randomUUID(), localId: randomUUID(), actorId: f.owner.accountId, eventId: otherEvent.eventId } })).rejects.toThrow("canonical");
    await expect(f.db.siteCommandReceipt.create({ data: { ...receipt, commandId: randomUUID(), localId: randomUUID() } })).rejects.toThrow();
  });

  it("retains stable photo manifests/finalized evidence across retries and denies Confidential ancestors", async () => {
    const f = await fixture(database, nasRoot);
    const folder = await f.documents.createFolder(f.owner, f.projectId, { name: "Offline photos", confidential: false, reason: "Capture independent site photos" });
    const bytes = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
    const manifest = { localId: randomUUID(), folderId: folder.id, fileName: "site.png", mimeType: "image/png", sizeBytes: bytes.length, reason: "Capture scoped image observation" };
    const started = await f.site.offlinePhoto(f.owner, f.projectId, manifest);
    expect(await f.site.offlinePhoto(f.owner, f.projectId, manifest)).toEqual(started);
    await expect(f.site.offlinePhoto(f.owner, f.projectId, { ...manifest, fileName: "changed.png" })).rejects.toThrow("different content");
    await f.documents.writeChunk(f.owner, started.uploadId, 0, bytes, createHash("sha256").update(bytes).digest("hex"));
    const file = await f.documents.finalize(f.owner, started.uploadId);
    expect((await f.documents.finalize(f.owner, started.uploadId)).id).toBe(file.id);
    expect(await f.site.offlinePhoto(f.owner, f.projectId, manifest)).toEqual(started);
    const input = command("Photograph of site issue"); input.payload = { note: "Photograph of site issue", photoIds: [file.id] };
    const saved = await f.site.offlineCommand(f.owner, f.projectId, input);
    await f.site.offlineCommand(f.owner, f.projectId, input);
    expect(await f.db.documentUpload.count({ where: { id: manifest.localId } })).toBe(1);
    expect((await f.db.siteRecord.findUniqueOrThrow({ where: { id: saved.id } })).data).toMatchObject({ photoEvidence: [{ documentId: file.id }] });
    const privateFolder = await f.documents.createFolder(f.owner, f.projectId, { name: "Private offline target", confidential: true, reason: "Protect confidential ancestors" });
    const child = await f.documents.createFolder(f.owner, f.projectId, { name: "Child", parentId: privateFolder.id, confidential: false, reason: "Child retains ancestor restrictions" });
    await expect(f.site.offlinePhoto(f.owner, f.projectId, { ...manifest, localId: randomUUID(), folderId: child.id })).rejects.toThrow("Confidential");
    const listed = await f.documents.list(f.owner, f.projectId);
    expect(listed.folders.find(item => item.id === child.id)).toMatchObject({ offlineUploadAllowed: false });
    expect(listed.folders.find(item => item.id === folder.id)).toMatchObject({ offlineUploadAllowed: true });
  });

  it("reauthorizes exact photo evidence when replaying an already committed command", async () => {
    const f = await fixture(database, nasRoot), photo = await f.uploadConfidentialPhoto();
    await f.db.employeePermissionOverride.create({ data: { organizationId: f.organizationId, employeeId: f.fixerEmployeeId, permissionKey: "document.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: (await f.db.project.findUniqueOrThrow({ where: { id: f.projectId } })).branchId, reason: "Allow scoped immutable photo reads" } });
    const folderGrant = await f.documents.grant(f.owner, f.projectId, { resourceKind: "FOLDER", resourceId: photo.folderId, employeeId: f.fixerEmployeeId, reason: "Grant scoped confidential parent" });
    await f.documents.grant(f.owner, f.projectId, { resourceKind: "FILE", resourceId: photo.id, employeeId: f.fixerEmployeeId, reason: "Grant scoped exact photo" });
    const input = command("Retain permitted photo evidence"); input.payload = { note: "Retain permitted photo evidence", photoIds: [photo.id] };
    await f.site.offlineCommand(f.fixer, f.projectId, input);
    await f.documents.revokeGrant(f.owner, folderGrant.id, "End confidential ancestor authority");
    await expect(f.site.offlineCommand(f.fixer, f.projectId, input)).rejects.toThrow("Confidential");
    expect(await f.db.siteCommandReceipt.count({ where: { projectId: f.projectId } })).toBe(1);
  });

  it("rejects a queued replay whose internal session expires while waiting on the SITE lock", async () => {
    const f = await fixture(database, nasRoot), input = command("Replay must remain authorized");
    await f.site.offlineCommand(f.fixer, f.projectId, input);
    const session = await f.db.session.create({ data: { accountId: f.fixer.accountId, tokenHash: randomUUID(), csrfTokenHash: randomUUID(), expiresAt: new Date(Date.now() + 3000) } });
    let unlock!: () => void; let locked!: () => void;
    const release = new Promise<void>(resolve => { unlock = resolve; }), acquired = new Promise<void>(resolve => { locked = resolve; });
    const blocker = f.db.$transaction(async tx => { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${f.organizationId + ':site:' + f.projectId},0))`; locked(); await release; }, { timeout: 15000 });
    await acquired;
    const pending = f.site.offlineCommand({ ...f.fixer, sessionId: session.id }, f.projectId, input).then(value => ({ value, error: undefined }), error => ({ value: undefined, error: error as { status: number } }));
    try {
      let waiting = false;
      for (let index = 0; index < 100; index++) {
        const rows = await f.db.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND wait_event_type='Lock' AND query LIKE '%pg_advisory_xact_lock%') AS waiting`;
        if (rows[0]!.waiting) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      await new Promise(resolve => setTimeout(resolve, Math.max(0, session.expiresAt.getTime() - Date.now() + 20)));
    } finally { unlock(); await blocker; }
    expect(await pending).toMatchObject({ error: { status: 403 } });
    expect(await f.db.siteCommandReceipt.count({ where: { projectId: f.projectId } })).toBe(1);
    expect(await f.db.siteRecord.count({ where: { projectId: f.projectId } })).toBe(1);
  });
});

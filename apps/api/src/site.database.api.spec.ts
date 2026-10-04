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
import { SiteService } from "./site.service.js";
import { recordProjectEvent } from "./project-events.js";

// S20 integration boundary: run only on a dedicated local test database.
const databaseUrl = process.env.S20_DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: databaseUrl ?? "", webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined };
type F = Awaited<ReturnType<typeof fixture>>;

async function fixture(database: DatabaseService, nasRoot: string) {
  const db = database.prisma, suffix = randomUUID();
  const organization = await db.organization.findFirst() ?? await db.organization.create({ data: { name: `S20 site ${suffix}` } });
  const branch = await db.branch.create({ data: { organizationId: organization.id, name: `S20 branch ${suffix}` } });
  const otherBranch = await db.branch.create({ data: { organizationId: organization.id, name: `S20 other ${suffix}` } });
  const team = await db.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `S20 team ${suffix}` } });
  const ownerAccount = await db.account.findFirst({ where: { kind: AccountKind.OWNER, state: AccountState.ACTIVE } }) ?? await db.account.create({ data: { normalizedEmail: `s20-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
  const makeStaff = async (label: string, homeBranchId = branch.id, homeTeamId = team.id) => {
    const account = await db.account.create({ data: { normalizedEmail: `s20-${label}-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
    const employee = await db.employee.create({ data: { organizationId: organization.id, accountId: account.id, homeBranchId, homeTeamId, hiredAt: new Date("2026-01-01T00:00:00Z") } });
    return { account, employee, actor: { accountId: account.id, organizationId: organization.id, kind: AccountKind.STAFF } as ProjectActor };
  };
  const lead = await makeStaff("lead"), fixer = await makeStaff("fixer"), verifier = await makeStaff("verifier"), viewer = await makeStaff("viewer"), stranger = await makeStaff("stranger", otherBranch.id, (await db.team.create({ data: { organizationId: organization.id, branchId: otherBranch.id, name: `S20 foreign team ${suffix}` } })).id);
  const owner: ProjectActor = { accountId: ownerAccount.id, organizationId: organization.id, kind: AccountKind.OWNER };
  const clientAccount = await db.account.create({ data: { normalizedEmail: `s20-client-${suffix}@example.test`, kind: AccountKind.CLIENT, state: AccountState.ACTIVE } });
  const client: ProjectActor = { accountId: clientAccount.id, organizationId: organization.id, kind: AccountKind.CLIENT };
  const grants: Array<{ employeeId: string; permissions: string[] }> = [
    { employeeId: lead.employee.id, permissions: ["project.view", "project.manage", "site.view"] },
    { employeeId: fixer.employee.id, permissions: ["project.view", "site.view", "site.work"] },
    { employeeId: verifier.employee.id, permissions: ["project.view", "site.view"] },
    { employeeId: viewer.employee.id, permissions: ["project.view", "site.view"] },
    { employeeId: stranger.employee.id, permissions: ["project.view", "site.view", "site.work"] }
  ];
  await db.employeePermissionOverride.createMany({ data: grants.flatMap(({ employeeId, permissions }) => permissions.map(permissionKey => ({ organizationId: organization.id, employeeId, permissionKey, effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: branch.id, reason: "S20 scoped integration fixture" }))) });
  const authorization = new AuthorizationService(database), approvals = new ApprovalService(database), projects = new ProjectService(database);
  const workflows = new ProjectWorkflowService(database, authorization, approvals);
  const tasks = new TaskService(database, authorization, approvals);
  const documents = new DocumentService(database, authorization, { ...config, nasRoot });
  const revisions = new RevisionService(database, authorization, documents);
  const portalScope = new ClientPortalScopeService(database, authorization);
  const turnkey = new TurnkeyService(database, authorization, approvals, revisions, portalScope);
  const workforce = new WorkforceService(database, authorization, approvals, new NotificationsService(database), config);
  const site = new SiteService(database, authorization, documents, turnkey, workforce);
  const project = (await projects.create(owner, { branchId: branch.id, title: `S20 active turnkey ${suffix}`, deliveryType: "TURNKEY", scopes: ["Site integration"], reason: "Create isolated S20 site project" })).project;
  for (const person of [lead, fixer, verifier, viewer]) {
    const row = await db.project.findUniqueOrThrow({ where: { id: project.id } });
    await workflows.assignment(owner, project.id, { employeeId: person.employee.id, expectedVersion: row.version, reason: "Assign current site participant" });
  }
  let current = await db.project.findUniqueOrThrow({ where: { id: project.id } });
  await workflows.lead(owner, project.id, { employeeId: lead.employee.id, expectedVersion: current.version, reason: "Appoint current Project Lead" });
  current = await db.project.findUniqueOrThrow({ where: { id: project.id } });
  await workflows.status(owner, project.id, { toStatus: "ACTIVE", expectedVersion: current.version, reason: "Activate Turnkey site project" });
  const foreign = (await projects.create(owner, { branchId: otherBranch.id, title: `S20 foreign turnkey ${suffix}`, deliveryType: "TURNKEY", scopes: ["Separate branch"], reason: "Create foreign branch project" })).project;
  return {
    db, organizationId: organization.id, projectId: project.id, foreignProjectId: foreign.id, owner, client,
    lead: lead.actor, fixer: fixer.actor, fixerEmployeeId: fixer.employee.id, verifier: verifier.actor, viewer: viewer.actor, viewerEmployeeId: viewer.employee.id, stranger: stranger.actor,
    workflows, tasks, site, documents,
    async uploadConfidentialPhoto() {
      const folder = await documents.createFolder(owner, project.id, { name: `S20 confidential ${suffix}`, confidential: true, reason: "Create private evidence fixture" });
      const bytes = Buffer.from(`%PDF-1.7\\nS20 private site evidence ${suffix}\\n%%EOF\\n`, "ascii");
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const started = await documents.startUpload(owner, project.id, { folderId: folder.id, fileName: `private-${suffix}.pdf`, mimeType: "application/pdf", sizeBytes: bytes.byteLength, confidential: true, viewOnly: false, reason: "Upload private site evidence fixture" });
      await documents.writeChunk(owner, started.uploadId, 0, bytes, sha256);
      const uploaded = await documents.finalize(owner, started.uploadId);
      return { id: uploaded.id, folderId: folder.id, name: uploaded.fileName, sha256 };
    }
  };
}

databaseDescribe("S20 site workflow and authority PostgreSQL acceptance scratch", () => {
  let database: DatabaseService;
  let nasRoot: string;
  beforeAll(async () => {
    if (!databaseUrl) throw new Error("S20_DATABASE_URL must target the dedicated S20 test database");
    const parsed = new URL(databaseUrl);
    if (!/_test(?:db)?$/i.test(parsed.pathname.slice(1)) || !["127.0.0.1", "localhost"].includes(parsed.hostname)) throw new Error("S20 integration tests require a dedicated local *_test database");
    nasRoot = await mkdtemp(join(tmpdir(), "sense-s20-files-"));
    database = new DatabaseService({ ...config, databaseUrl, nasRoot });
  });
  afterAll(async () => { await database?.onModuleDestroy(); });
  const version = async (f: F) => (await f.site.detail(f.owner, f.projectId)).version as number;
  const common = async (f: F, reason: string) => ({ expectedVersion: await version(f), reason });

  it("persists report confirmation only for the appointed responsible person and retains immutable snapshots", async () => {
    const f = await fixture(database, nasRoot);
    const appointed = await f.site.responsible(f.owner, f.projectId, { ...(await common(f, "Appoint daily report confirmer")), accountId: f.fixer.accountId });
    const report = await f.site.report(f.fixer, f.projectId, { ...(await common(f, "Create daily report draft")), date: "2026-10-03", workCompleted: "Foundation excavation", manpower: [{ trade: "Masonry", count: 2 }], materialsReceived: "Cement", photoIds: [], issues: "", delayCauses: "", tomorrowPlan: "Pour footing" });
    await expect(f.site.confirmReport(f.verifier, report.id, await common(f, "Verifier cannot confirm daily report"))).rejects.toMatchObject({ status: 403 });
    const confirmed = await f.site.confirmReport(f.fixer, report.id, await common(f, "Confirm current daily report"));
    expect(confirmed).toMatchObject({ id: report.id });
    const detail = await f.site.detail(f.owner, f.projectId);
    expect(detail.history).toEqual(expect.arrayContaining([expect.objectContaining({ occurredAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) })]));
    expect(detail.reports).toEqual(expect.arrayContaining([expect.objectContaining({ id: report.id, state: "CONFIRMED" })]));
    const row = await f.db.siteRecord.findUniqueOrThrow({ where: { id: report.id } });
    const snapshot = JSON.stringify(row.data);
    await expect(f.db.$executeRaw`UPDATE "site_records" SET "data"='{}'::jsonb WHERE "id"=${report.id}::uuid`).rejects.toThrow();
    expect(JSON.stringify((await f.db.siteRecord.findUniqueOrThrow({ where: { id: report.id } })).data)).toBe(snapshot);
    await expect(f.site.responsible(f.lead, f.projectId, { ...(await common(f, "Responsible appointment cannot grant access")), accountId: f.stranger.accountId })).rejects.toMatchObject({ status: 403 });
    expect(appointed.id).toBe(f.projectId);
  });

  it("retains failed repair verification, requires independent verification and separate management closure before handover", async () => {
    const f = await fixture(database, nasRoot);
    const packageRow = await f.site.createPackage(f.lead, f.projectId, { ...(await common(f, "Create current package")), title: "North footing", date: "2026-10-03", tomorrowPlan: "Cure concrete", plannedPercent: "100", plannedQuantity: "1", unit: "lot", critical: true });
    await f.site.progress(f.fixer, packageRow.id, { ...(await common(f, "Record passing package quality")), actualPercent: "100", actualQuantity: "1", qualityStatus: "PASSED", materialStatus: "Received", blockers: "", tomorrowPlan: "Inspect cure", photoIds: [] });
    await f.site.completePackage(f.lead, packageRow.id, await common(f, "Complete package explicitly"));
    const snag = await f.site.snag(f.fixer, f.projectId, { ...(await common(f, "Record finish snag")), title: "Uneven finish", description: "North wall surface needs correction", photoIds: [] });
    await f.site.assignFixer(f.lead, snag.id, { ...(await common(f, "Assign separate repair fixer")), fixerAccountId: f.fixer.accountId });
    await f.site.appointVerifier(f.lead, snag.id, { ...(await common(f, "Appoint independent verifier")), verifierAccountId: f.verifier.accountId });
    await f.site.startRepair(f.fixer, snag.id, await common(f, "Start assigned repair"));
    await f.site.readyRepair(f.fixer, snag.id, { ...(await common(f, "Submit first repair")), note: "First finish correction", photoIds: [] });
    await expect(f.site.verify(f.fixer, snag.id, { ...(await common(f, "Fixer cannot verify own repair")), outcome: "PASSED", note: "Self verification attempt", photoIds: [] })).rejects.toMatchObject({ status: 403 });
    await f.site.verify(f.verifier, snag.id, { ...(await common(f, "Fail first verification")), outcome: "FAILED", note: "Edge remains uneven", photoIds: [] });
    expect((await f.site.detail(f.verifier, f.projectId)).snags).toEqual(expect.arrayContaining([expect.objectContaining({ id: snag.id, state: "IN_PROGRESS", attempts: [expect.objectContaining({ outcome: "FAILED", repairGeneration: 1 })] })]));
    await f.site.readyRepair(f.fixer, snag.id, { ...(await common(f, "Submit corrected second repair")), note: "Edge reworked after failed check", photoIds: [] });
    await f.site.verify(f.verifier, snag.id, { ...(await common(f, "Pass second repair verification")), outcome: "PASSED", note: "Reworked edge is even", photoIds: [] });
    await expect(f.site.closeSnag(f.verifier, snag.id, await common(f, "Verifier cannot close snag"))).rejects.toMatchObject({ status: 403 });
    await expect(f.site.handover(f.lead, f.projectId, { ...(await common(f, "Open snag blocks handover")), note: "Must remain blocked until separate closure" })).rejects.toMatchObject({ status: 409 });
    await f.site.closeSnag(f.lead, snag.id, await common(f, "Lead closes after current pass"));
    const handover = await f.site.handover(f.lead, f.projectId, { ...(await common(f, "Record separate site handover")), note: "Package quality passed and all snags closed" });
    expect(handover.id).toBeTruthy();
    const attempts = await f.db.siteVerificationAttempt.findMany({ where: { snagId: snag.id }, orderBy: { repairGeneration: "asc" } });
    expect(attempts.map(row => [row.repairGeneration, row.outcome, row.fixerAccountId, row.verifierAccountId])).toEqual([[1, "FAILED", f.fixer.accountId, f.verifier.accountId], [2, "PASSED", f.fixer.accountId, f.verifier.accountId]]);
    await expect(f.db.$executeRaw`UPDATE "site_verification_attempts" SET "outcome"='PASSED' WHERE "id"=${attempts[0]!.id}::uuid`).rejects.toThrow();
    const handoverRow = await f.db.siteRecord.findUniqueOrThrow({ where: { id: handover.id } });
    expect(handoverRow.kind).toBe("HANDOVER");
  });

  it("denies unassigned guessed IDs and stale workspace writes without leaving partial history", async () => {
    const f = await fixture(database, nasRoot);
    const before = await version(f);
    await expect(f.site.manpower(f.stranger, f.projectId, { ...(await common(f, "Foreign employee is not assigned")), date: "2026-10-03", trade: "Masonry", count: 1, employeeAccountIds: [], note: "Unauthorized" })).rejects.toMatchObject({ status: 403 });
    await expect(f.site.detail(f.stranger, f.projectId)).rejects.toMatchObject({ status: 403 });
    await expect(f.site.detail(f.fixer, f.foreignProjectId)).rejects.toMatchObject({ status: 403 });
    await expect(f.site.detail(f.client, f.projectId)).rejects.toMatchObject({ status: 403 });
    const siteHistoryBeforeRollback = await f.db.siteHistory.count({ where: { projectId: f.projectId } });
    await expect(f.site.snag(f.fixer, f.projectId, { ...(await common(f, "Invalid evidence must roll back workspace creation")), title: "Invalid evidence", description: "Referenced file does not exist", photoIds: [randomUUID()] })).rejects.toMatchObject({ status: 404 });
    expect(await f.db.siteWorkspace.count({ where: { projectId: f.projectId } })).toBe(0);
    expect(await f.db.siteHistory.count({ where: { projectId: f.projectId } })).toBe(siteHistoryBeforeRollback);
    const created = await f.site.snag(f.fixer, f.projectId, { ...(await common(f, "Create project scoped snag")), title: "Scoped defect", description: "Project boundary fixture", photoIds: [] });
    const current = await version(f);
    const historyBefore = await f.db.siteHistory.count({ where: { projectId: f.projectId } });
    await expect(f.site.assignFixer(f.lead, created.id, { expectedVersion: current - 1, reason: "Stale concurrent decision" , fixerAccountId: f.fixer.accountId })).rejects.toMatchObject({ status: 409 });
    expect(await f.db.siteHistory.count({ where: { projectId: f.projectId } })).toBe(historyBefore);
    expect((await f.site.detail(f.owner, f.projectId)).version).toBe(current);
    expect(before).toBe(0);

    const project = await f.db.project.findUniqueOrThrow({ where: { id: f.projectId } });
    await f.workflows.revokeAssignment(f.owner, f.projectId, f.fixerEmployeeId, { expectedVersion: project.version, reason: "Remove assigned fixer access during test" });
    await expect(f.site.manpower(f.fixer, f.projectId, { ...(await common(f, "Revoked assignment must be rechecked")), date: "2026-10-03", trade: "Masonry", count: 1, employeeAccountIds: [], note: "Must fail after assignment revocation" })).rejects.toMatchObject({ status: 403 });
    expect(await f.db.project.findUniqueOrThrow({ where: { id: project.id } })).toMatchObject({ status: "ACTIVE" });
    expect((await f.site.detail(f.owner, f.projectId)).version).toBe(current);
  });

  it("blocks work on held or cancelled projects and redacts exact confidential photo identity for a site-only viewer", async () => {
    const f = await fixture(database, nasRoot);
    const project = await f.db.project.findUniqueOrThrow({ where: { id: f.projectId } });
    const held = await f.workflows.status(f.owner, f.projectId, { toStatus: "ON_HOLD", expectedVersion: project.version, reason: "Pause delivery before site writes" });
    await expect(f.site.manpower(f.owner, f.projectId, { ...(await common(f, "Held project rejects site writes")), date: "2026-10-03", trade: "Masonry", count: 2, employeeAccountIds: [], note: "Cannot record during hold" })).rejects.toMatchObject({ status: 409 });
    await expect(f.site.detail(f.owner, f.projectId)).resolves.toMatchObject({ project: { status: "ON_HOLD" } });
    const resumed = await f.workflows.status(f.owner, f.projectId, { toStatus: "ACTIVE", expectedVersion: held.version, reason: "Resume delivery for cancellation test" });
    await f.tasks.cancelProject(f.owner, f.projectId, { expectedVersion: resumed.version, reason: "Cancel project before site write test" });
    await expect(f.site.manpower(f.owner, f.projectId, { ...(await common(f, "Cancelled project rejects site writes")), date: "2026-10-03", trade: "Masonry", count: 2, employeeAccountIds: [], note: "Cannot record after cancellation" })).rejects.toMatchObject({ status: 409 });
    await expect(f.site.detail(f.owner, f.projectId)).resolves.toMatchObject({ project: { status: "CANCELLED" } });

    const separate = await fixture(database, nasRoot);
    const photo = await separate.uploadConfidentialPhoto();
    const snag = await separate.site.snag(separate.owner, separate.projectId, { ...(await common(separate, "Attach private immutable evidence")), title: "Private photo evidence", description: "Only viewers with document authority can identify this evidence", photoIds: [photo.id] });
    const ownerView = await separate.site.detail(separate.owner, separate.projectId);
    expect(JSON.stringify(ownerView.snags.find((item: { id: string }) => item.id === snag.id))).toContain(photo.name);
    const limitedView = await separate.site.detail(separate.viewer, separate.projectId);
    const serialized = JSON.stringify(limitedView.snags.find((item: { id: string }) => item.id === snag.id));
    expect(serialized).toContain('"hidden":true');
    expect(serialized).not.toContain(photo.id);
    expect(serialized).not.toContain(photo.name);
    expect(serialized).not.toContain(photo.sha256);
  });
  it("retains completion while correcting factual quality and binds large report snapshots to exact canonical audit digests", async () => {
    const f = await fixture(database, nasRoot);
    const pkg = await f.site.createPackage(f.lead, f.projectId, { ...(await common(f, "Create package before quality inspection")), title: "Completed work pending inspection", date: "2026-10-03", tomorrowPlan: "Inspect quality", plannedPercent: "100", plannedQuantity: "1", unit: "lot", critical: false });
    await f.site.completePackage(f.lead, pkg.id, await common(f, "Record explicit package completion"));
    const completion = await f.db.siteRecord.findUniqueOrThrow({ where: { id: pkg.id } });
    await expect(f.site.handover(f.lead, f.projectId, { ...(await common(f, "Pending quality blocks handover")), note: "Inspection is still pending" })).rejects.toMatchObject({ status: 409 });
    await f.site.progress(f.fixer, pkg.id, { ...(await common(f, "Correct factual completed package quality")), actualPercent: "100", actualQuantity: "1", qualityStatus: "PASSED", materialStatus: "Received", blockers: "", tomorrowPlan: "Handover", photoIds: [] });
    const corrected = await f.db.siteRecord.findUniqueOrThrow({ where: { id: pkg.id } });
    expect(corrected.state).toBe("COMPLETED");
    expect(corrected.data).toMatchObject({ completedBy: (completion.data as Record<string, unknown>).completedBy, completedAt: (completion.data as Record<string, unknown>).completedAt, qualityStatus: "PASSED" });
    await f.site.responsible(f.lead, f.projectId, { ...(await common(f, "Appoint report confirmation authority")), accountId: f.fixer.accountId });
    const report = await f.site.report(f.fixer, f.projectId, { ...(await common(f, "Persist complete large daily report")), date: "2026-10-03", workCompleted: "W".repeat(4000), manpower: [{ trade: "Masonry", count: 2 }], materialsReceived: "M".repeat(2000), photoIds: [], issues: "I".repeat(4000), delayCauses: "D".repeat(2000), tomorrowPlan: "T".repeat(2000) });
    await f.site.confirmReport(f.fixer, report.id, await common(f, "Confirm full report and package snapshot"));
    const history = await f.db.siteHistory.findFirstOrThrow({ where: { subjectId: report.id, subjectVersion: 2 } });
    expect(JSON.stringify(history.snapshot).length).toBeGreaterThan(8000);
    const audit = await f.db.auditEvent.findFirstOrThrow({ where: { subjectId: report.id, eventKey: "site.changed" }, orderBy: { occurredAt: "desc" } });
    const hashes = await f.db.$queryRaw<Array<{ digest: string }>>`SELECT encode(sha256(convert_to(${JSON.stringify(history.snapshot)}::jsonb::text,'UTF8')),'hex') AS digest`;
    expect(audit.after).toEqual({ projectId: f.projectId, version: 2, snapshotSha256: hashes[0]!.digest });
    await expect(f.site.handover(f.lead, f.projectId, { ...(await common(f, "Passed correction permits separate handover")), note: "All current site gates satisfied" })).resolves.toHaveProperty("id");
  });

  it("rejects canonical head, scope and retained history tampering and serializes concurrent workspace writes", async () => {
    const f = await fixture(database, nasRoot);
    const input = { expectedVersion: 0, reason: "Concurrent factual manpower decision", date: "2026-10-03", trade: "Masonry", count: 2, employeeAccountIds: [], note: "One current decision" };
    const results = await Promise.allSettled([f.site.manpower(f.fixer, f.projectId, input), f.site.manpower(f.fixer, f.projectId, input)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find(result => result.status === "rejected")).toMatchObject({ reason: { status: 409 } });
    expect(await f.db.siteRecord.count({ where: { projectId: f.projectId } })).toBe(1);
    const pkg = await f.site.createPackage(f.lead, f.projectId, { ...(await common(f, "Create guarded canonical package")), title: "Guarded package", date: "2026-10-03", tomorrowPlan: "Inspect", plannedPercent: "100", plannedQuantity: "1", unit: "lot", critical: false });
    const head = await f.db.siteRecord.findUniqueOrThrow({ where: { id: pkg.id } });
    const count = await f.db.siteHistory.count({ where: { projectId: f.projectId } });
    await expect(f.db.$executeRaw`UPDATE site_records SET version=version+1, data=jsonb_set(data,'{qualityStatus}','"PASSED"'::jsonb) WHERE id=${pkg.id}::uuid`).rejects.toThrow();
    await expect(f.db.$executeRaw`UPDATE site_records SET version=version+1, "projectId"=${f.foreignProjectId}::uuid WHERE id=${pkg.id}::uuid`).rejects.toThrow();
    const history = await f.db.siteHistory.findFirstOrThrow({ where: { subjectId: pkg.id } });
    await expect(f.db.$executeRaw`UPDATE site_history SET snapshot='{}'::jsonb WHERE id=${history.id}::uuid`).rejects.toThrow();
    await expect(f.db.$executeRaw`DELETE FROM site_history WHERE id=${history.id}::uuid`).rejects.toThrow();
    expect(await f.db.siteRecord.findUniqueOrThrow({ where: { id: pkg.id } })).toEqual(head);
    expect(await f.db.siteHistory.count({ where: { projectId: f.projectId } })).toBe(count);
    const auditCount = await f.db.auditEvent.count(), eventCount = await f.db.domainEvent.count(), outboxCount = await f.db.outboxDelivery.count();
    for (const [subjectId, subjectVersion] of [[pkg.id, head.version + 1], [randomUUID(), 1]] as const) {
      await expect(f.db.$transaction(async tx => {
        const snapshot = { projectId: f.projectId, recordId: subjectId, version: subjectVersion, kind: head.kind, state: head.state, data: head.data };
        const digests = await tx.$queryRaw<Array<{ digest: string }>>`SELECT encode(sha256(convert_to(${JSON.stringify(snapshot)}::jsonb::text,'UTF8')),'hex') AS digest`;
        const reason = "Fabricated future or orphan history must roll back";
        const eventId = await recordProjectEvent(tx, { organizationId: f.organizationId, actorId: f.owner.accountId, eventName: "site.changed", subjectType: "site_record", subjectId, reason, after: { projectId: f.projectId, version: subjectVersion, snapshotSha256: digests[0]!.digest } });
        await tx.siteHistory.create({ data: { workspaceId: head.workspaceId, organizationId: f.organizationId, projectId: f.projectId, subjectType: "site_record", subjectId, subjectVersion, actorId: f.owner.accountId, eventName: "site.changed", reason, eventId, snapshot: JSON.parse(JSON.stringify(snapshot)) } });
      })).rejects.toThrow();
    }
    expect(await f.db.auditEvent.count()).toBe(auditCount);
    expect(await f.db.domainEvent.count()).toBe(eventCount);
    expect(await f.db.outboxDelivery.count()).toBe(outboxCount);
  });

  it("rechecks session expiry after waiting for the aggregate lock and rolls back the queued write", async () => {
    const f = await fixture(database, nasRoot);
    const session = await f.db.session.create({ data: { accountId: f.fixer.accountId, tokenHash: randomUUID(), csrfTokenHash: randomUUID(), expiresAt: new Date(Date.now() + 3000) } });
    let unlock!: () => void;
    let locked!: () => void;
    const release = new Promise<void>(resolve => { unlock = resolve; });
    const acquired = new Promise<void>(resolve => { locked = resolve; });
    const blocker = f.db.$transaction(async tx => { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${f.organizationId + ':site:' + f.projectId},0))`; locked(); await release; }, { timeout: 15000 });
    await acquired;
    const pending = f.site.manpower({ ...f.fixer, sessionId: session.id }, f.projectId, { expectedVersion: 0, reason: "Queued session must remain live", date: "2026-10-03", trade: "Masonry", count: 1, employeeAccountIds: [], note: "Cannot commit after expiry" }).then(value => ({ value, error: undefined }), error => ({ value: undefined, error: error as { status: number } }));
    try {
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const rows = await f.db.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND wait_event_type='Lock' AND query LIKE '%pg_advisory_xact_lock%') AS waiting`;
        if (rows[0]!.waiting) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      await new Promise(resolve => setTimeout(resolve, Math.max(0, session.expiresAt.getTime() - Date.now() + 20)));
    } finally { unlock(); await blocker; }
    expect(await pending).toMatchObject({ error: { status: 403 } });
    expect(await f.db.siteWorkspace.count({ where: { projectId: f.projectId } })).toBe(0);
    expect(await f.db.siteRecord.count({ where: { projectId: f.projectId } })).toBe(0);
    expect(await f.db.siteHistory.count({ where: { projectId: f.projectId } })).toBe(0);
  });

  it("reapplies confidential grants to exact photos in live records and all retained report/history snapshots", async () => {
    const f = await fixture(database, nasRoot), photo = await f.uploadConfidentialPhoto();
    await f.db.employeePermissionOverride.create({ data: { organizationId: f.organizationId, employeeId: f.viewerEmployeeId, permissionKey: "document.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: (await f.db.project.findUniqueOrThrow({ where: { id: f.projectId } })).branchId, reason: "Grant document view for evidence regression" } });
    const folderGrant = await f.documents.grant(f.owner, f.projectId, { resourceKind: "FOLDER", resourceId: photo.folderId, employeeId: f.viewerEmployeeId, reason: "Grant exact confidential folder access" });
    await f.documents.grant(f.owner, f.projectId, { resourceKind: "FILE", resourceId: photo.id, employeeId: f.viewerEmployeeId, reason: "Grant exact confidential evidence access" });
    const pkg = await f.site.createPackage(f.lead, f.projectId, { ...(await common(f, "Create evidence package")), title: "Private evidence package", date: "2026-10-03", tomorrowPlan: "Inspect", plannedPercent: "100", plannedQuantity: "1", unit: "lot", critical: false });
    await f.site.progress(f.owner, pkg.id, { ...(await common(f, "Retain exact private photo identity")), actualPercent: "25", actualQuantity: "0.25", qualityStatus: "PENDING", materialStatus: "Received", blockers: "", tomorrowPlan: "Inspect", photoIds: [photo.id] });
    await f.site.responsible(f.lead, f.projectId, { ...(await common(f, "Appoint current report confirmer")), accountId: f.fixer.accountId });
    const report = await f.site.report(f.owner, f.projectId, { ...(await common(f, "Draft report containing exact private evidence")), date: "2026-10-03", workCompleted: "Private site work", manpower: [], materialsReceived: "", photoIds: [photo.id], issues: "", delayCauses: "", tomorrowPlan: "Inspect" });
    await f.site.confirmReport(f.fixer, report.id, await common(f, "Confirm report with nested package evidence"));
    expect(JSON.stringify(await f.site.detail(f.viewer, f.projectId))).toContain(photo.sha256);
    await f.documents.revokeGrant(f.owner, folderGrant.id, "Revoke parent confidential access after report confirmation");
    const redacted = JSON.stringify(await f.site.detail(f.viewer, f.projectId));
    expect(redacted).toContain('"hidden":true');
    for (const secret of [photo.id, photo.name, photo.sha256]) expect(redacted).not.toContain(secret);
    expect(JSON.stringify(await f.site.detail(f.owner, f.projectId))).toContain(photo.sha256);
    expect(JSON.stringify((await f.db.siteRecord.findUniqueOrThrow({ where: { id: report.id } })).data)).toContain(photo.sha256);
  });
});


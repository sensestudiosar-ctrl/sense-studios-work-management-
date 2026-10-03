import "reflect-metadata";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseService } from "./database.service.js";
import { AccountKind, AccountState, PermissionEffect, PermissionScopeKind, RevisionApprovalKind } from "./generated/prisma/client.js";
import type { RuntimeConfig } from "./config.js";
import type { ActiveClientPortalSession } from "./client-portal-identity.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { ClientPortalAccessService } from "./client-portal-access.service.js";
import { ClientPortalScopeService } from "./client-portal-scope.service.js";
import { DocumentService } from "./document.service.js";
import { ProjectService, type ProjectActor } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { TaskService } from "./task.service.js";
import { RevisionService } from "./revision.service.js";
import { TurnkeyService } from "./turnkey.service.js";
import { recordProjectEvent } from "./project-events.js";
import { IdentityService } from "./identity.service.js";
import { NotificationsService } from "./notifications.service.js";
import { OrganizationService } from "./organization.service.js";

const databaseUrl = process.env.S19_DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
const config: RuntimeConfig = {
  nodeEnv: "test", port: 4000, databaseUrl: databaseUrl ?? "", webOrigin: "http://localhost:5173",
  ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined
};

type Fixture = {
  database: DatabaseService; organizationId: string; branchId: string; projectId: string; otherProjectId: string;
  owner: ProjectActor; manager: ProjectActor; viewer: ProjectActor; managerEmployeeId: string; viewerEmployeeId: string;
  client: ProjectActor; activeClient: ActiveClientPortalSession;
  projects: ProjectService; workflows: ProjectWorkflowService; approvals: ApprovalService; authorization: AuthorizationService;
  tasks: TaskService;
  documents: DocumentService; revisions: RevisionService; turnkey: TurnkeyService; access: ClientPortalAccessService;
  folderId: string;
  upload(name: string, bytes: Buffer, actor?: ProjectActor): Promise<{ id: string; blobId: string; sha256: string }>;
  submitRevision(revision: { id: string; drawingId: string; blobId: string; sha256: string }, actor?: ProjectActor): Promise<void>;
  approveRevision(revision: { id: string; drawingId: string; blobId: string; sha256: string }, actor?: ProjectActor): Promise<void>;
  makeApprovedRevision(name?: string): Promise<{ id: string; drawingId: string; blobId: string; sha256: string }>;
};

async function makeFixture(database: DatabaseService, nasRoot: string): Promise<Fixture> {
  const prisma = database.prisma;
  const suffix = randomUUID();
  const organization = await prisma.organization.findFirst() ?? await prisma.organization.create({ data: { name: `S19 Turnkey ${suffix}` } });
  const branch = await prisma.branch.create({ data: { organizationId: organization.id, name: `S19 branch ${suffix}` } });
  const otherBranch = await prisma.branch.create({ data: { organizationId: organization.id, name: `S19 other branch ${suffix}` } });
  const team = await prisma.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `S19 team ${suffix}` } });
  const ownerAccount = await prisma.account.findFirst({ where: { kind: AccountKind.OWNER, state: AccountState.ACTIVE } }) ?? await prisma.account.create({ data: { normalizedEmail: `s19-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
  const managerAccount = await prisma.account.create({ data: { normalizedEmail: `s19-manager-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
  const viewerAccount = await prisma.account.create({ data: { normalizedEmail: `s19-viewer-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
  const managerEmployee = await prisma.employee.create({ data: { organizationId: organization.id, accountId: managerAccount.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
  const viewerEmployee = await prisma.employee.create({ data: { organizationId: organization.id, accountId: viewerAccount.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
  const managerPermissions = ["project.view", "project.manage", "employee.manage", "document.view", "document.upload", "document.issue", "document.client_review_select", "turnkey.view", "turnkey.manage", "turnkey.cost_view", "turnkey.cost_approve", "turnkey.procurement_approve"];
  const viewerPermissions = ["project.view", "document.view", "turnkey.view", "turnkey.cost_view"];
  await prisma.employeePermissionOverride.createMany({ data: [
    ...managerPermissions.map((permissionKey) => ({ organizationId: organization.id, employeeId: managerEmployee.id, permissionKey, effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: branch.id, reason: "S19 assigned Team Leader fixture" })),
    ...viewerPermissions.map((permissionKey) => ({ organizationId: organization.id, employeeId: viewerEmployee.id, permissionKey, effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: branch.id, reason: "S19 ordinary assigned staff fixture" }))
  ] });

  const owner: ProjectActor = { accountId: ownerAccount.id, organizationId: organization.id, kind: AccountKind.OWNER };
  const manager: ProjectActor = { accountId: managerAccount.id, organizationId: organization.id, kind: AccountKind.STAFF };
  const viewer: ProjectActor = { accountId: viewerAccount.id, organizationId: organization.id, kind: AccountKind.STAFF };
  const authorization = new AuthorizationService(database);
  const approvals = new ApprovalService(database);
  const projects = new ProjectService(database);
  const workflows = new ProjectWorkflowService(database, authorization, approvals);
  const tasks = new TaskService(database, authorization, approvals);
  const documents = new DocumentService(database, authorization, { ...config, nasRoot });
  const revisions = new RevisionService(database, authorization, documents);
  const portalScope = new ClientPortalScopeService(database, authorization);
  const turnkey = new TurnkeyService(database, authorization, approvals, revisions, portalScope);
  const access = new ClientPortalAccessService(database);

  const project = (await projects.create(owner, { branchId: branch.id, title: `S19 Turnkey project ${suffix}`, deliveryType: "TURNKEY", scopes: ["Turnkey delivery"], reason: "Create isolated S19 acceptance project" })).project;
  await workflows.assignment(owner, project.id, { employeeId: managerEmployee.id, expectedVersion: project.version, reason: "Assign explicitly authorized project Team Leader" });
  let current = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
  await workflows.lead(owner, project.id, { employeeId: managerEmployee.id, expectedVersion: current.version, reason: "Appoint assigned Project Lead" });
  current = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
  await workflows.assignment(owner, project.id, { employeeId: viewerEmployee.id, expectedVersion: current.version, reason: "Assign ordinary staff project viewer" });
  current = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
  await workflows.status(owner, project.id, { toStatus: "ACTIVE", expectedVersion: current.version, reason: "Activate Turnkey acceptance project" });

  const foreign = (await projects.create(owner, { branchId: otherBranch.id, title: `S19 foreign Turnkey ${suffix}`, deliveryType: "TURNKEY", scopes: ["Turnkey delivery"], reason: "Create isolated cross-branch fixture" })).project;
  const folder = await documents.createFolder(owner, project.id, { name: `S19 design ${suffix}`, confidential: false, reason: "Create exact approved design folder" });

  const upload = async (name: string, bytes: Buffer, actor = owner) => {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const started = await documents.startUpload(actor, project.id, { folderId: folder.id, fileName: name, mimeType: "application/pdf", sizeBytes: bytes.byteLength, confidential: false, viewOnly: false, reason: `Upload immutable S19 design ${name}` });
    await documents.writeChunk(actor, started.uploadId, 0, bytes, sha256);
    const file = await documents.finalize(actor, started.uploadId);
    const blob = await prisma.fileBlobMetadata.findFirstOrThrow({ where: { documentId: file.id } });
    return { id: file.id, blobId: blob.id, sha256 };
  };
  const approveRevision = async (revision: { id: string; drawingId: string; blobId: string; sha256: string }, actor = owner) => {
    const eventId = await prisma.$transaction((tx) => recordProjectEvent(tx, {
      organizationId: actor.organizationId, actorId: actor.accountId, eventName: "review.approved", subjectType: "review", subjectId: revision.id,
      reason: "TEST FIXTURE ONLY: exact internal design approval", after: { projectId: project.id, drawingId: revision.drawingId, revisionId: revision.id, blobId: revision.blobId, sha256: revision.sha256 }
    }));
    const event = await prisma.domainEvent.findUniqueOrThrow({ where: { id: eventId } });
    await prisma.$transaction((tx) => revisions.consumeApproval(tx, revision.id, String((event.payload as { auditEventId: string }).auditEventId), RevisionApprovalKind.INTERNAL));
  };
  const submitRevision = async (revision: { id: string; drawingId: string; blobId: string; sha256: string }, actor = owner) => {
    const eventId = await prisma.$transaction((tx) => recordProjectEvent(tx, {
      organizationId: actor.organizationId, actorId: actor.accountId, eventName: "review.requested", subjectType: "review", subjectId: revision.id,
      reason: "TEST FIXTURE ONLY: submit exact design for internal review", after: { projectId: project.id, drawingId: revision.drawingId, revisionId: revision.id, blobId: revision.blobId, sha256: revision.sha256 }
    }));
    const event = await prisma.domainEvent.findUniqueOrThrow({ where: { id: eventId } });
    await prisma.$transaction((tx) => revisions.consumeReviewState(tx, revision.id, String((event.payload as { auditEventId: string }).auditEventId)));
  };
  const makeApprovedRevision = async (name = `approved-${suffix}.pdf`) => {
    const file = await upload(name, Buffer.from(`%PDF-1.7\nS19 ${name}\n%%EOF\n`, "ascii"));
    const drawing = await revisions.createDrawing(owner, project.id, { documentNumber: `S19-${randomUUID().slice(0, 8)}`, title: "Exact Turnkey production input", fileId: file.id, reason: "Register exact approved production input" });
    const revision = { ...drawing.revisions[0]!, drawingId: drawing.id, blobId: file.blobId, sha256: file.sha256 };
    await submitRevision(revision);
    await approveRevision(revision);
    return revision;
  };

  const appointed = await access.setPrimary(owner, project.id, { email: `s19-client-${suffix}@example.test`, expectedProjectVersion: (await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).version, expectedPrimaryGrantId: null, reason: "Appoint client for explicit snapshot sharing test" });
  const clientAccount = await prisma.account.findUniqueOrThrow({ where: { id: appointed.grant.accountId } });
  const now = new Date();
  const clientSessionRow = await prisma.clientPortalSession.create({ data: { accountId: clientAccount.id, tokenHash: randomUUID().replaceAll("-", "").padEnd(64, "0"), csrfTokenHash: "0".repeat(64), createdAt: now, lastUsedAt: now, expiresAt: new Date(now.getTime() + 60 * 60_000) } });
  const activeClient = { row: clientSessionRow, account: clientAccount, csrfToken: "fixture-only" } as ActiveClientPortalSession;
  const actualClient: ProjectActor = { accountId: clientAccount.id, organizationId: organization.id, kind: AccountKind.CLIENT };

  return { database, organizationId: organization.id, branchId: branch.id, projectId: project.id, otherProjectId: foreign.id, owner, manager, viewer, managerEmployeeId: managerEmployee.id, viewerEmployeeId: viewerEmployee.id, client: actualClient, activeClient, projects, workflows, approvals, authorization, tasks, documents, revisions, turnkey, access, folderId: folder.id, upload, submitRevision, approveRevision, makeApprovedRevision };
}

databaseDescribe("S19 Turnkey BOQ, approval and production release PostgreSQL integration", () => {
  let database: DatabaseService;
  let nasRoot: string;
  beforeAll(async () => {
    if (!databaseUrl) throw new Error("S19_DATABASE_URL must point to the dedicated S19 test database");
    const parsed = new URL(databaseUrl);
    if (!/_test(?:db)?$/i.test(parsed.pathname.slice(1)) || !["127.0.0.1", "localhost"].includes(parsed.hostname)) throw new Error("S19 integration tests require a dedicated local *_test database");
    nasRoot = await mkdtemp(join(tmpdir(), "sense-s19-files-"));
    database = new DatabaseService({ ...config, databaseUrl, nasRoot });
  });
  afterAll(async () => { await database?.onModuleDestroy(); });

  it("persists the exact approved design through separate cost and procurement approvals, materials, factory progress and immutable replacement", async () => {
    const f = await makeFixture(database, nasRoot);
    const design = await f.makeApprovedRevision();
    const input = { revisionIds: [design.id], lines: [{ key: "cabinetry", description: "Cabinetry package", quantity: "2.00", unit: "set" }], prices: [{ key: "cabinetry", unitPrice: "42.50" }], currency: "INR", reason: "Create exact approved BOQ" };
    await expect(f.turnkey.create(f.owner, f.projectId, { ...input, lines: [{ ...input.lines[0]!, quantity: "NaN" }] })).rejects.toMatchObject({ status: 400 });
    await expect(f.turnkey.create(f.owner, f.projectId, { ...input, prices: [{ key: "cabinetry", unitPrice: "-1" }] })).rejects.toMatchObject({ status: 400 });
    await expect(f.turnkey.create(f.owner, f.projectId, { ...input, revisionIds: [randomUUID()] })).rejects.toMatchObject({ status: 404 });
    expect(await database.prisma.turnkeyRelease.count({ where: { projectId: f.projectId } })).toBe(0);

    const created = await f.turnkey.create(f.owner, f.projectId, input);
    expect(created).toMatchObject({ version: 1, state: "DRAFT" });
    await expect(f.turnkey.request(f.owner, created.id, "cost", { expectedVersion: 1, approverAccountId: f.owner.accountId, reason: "Self approval denied" })).rejects.toMatchObject({ status: 403 });
    await expect(f.turnkey.request(f.owner, created.id, "procurement", { expectedVersion: 1, approverAccountId: f.manager.accountId, reason: "Cost approval must come first" })).rejects.toMatchObject({ status: 409 });
    await expect(f.turnkey.request(f.owner, created.id, "cost", { expectedVersion: 1, approverAccountId: f.viewer.accountId, reason: "Action grant without Team Leader qualification" })).rejects.toMatchObject({ status: 403 });
    const pending = await f.turnkey.request(f.owner, created.id, "cost", { expectedVersion: 1, approverAccountId: f.manager.accountId, reason: "Submit cost decision to assigned Team Leader" });
    expect(pending).toMatchObject({ version: 2, state: "COST_PENDING" });

    const ordinaryView = await f.turnkey.detail(f.viewer, f.projectId);
    expect(ordinaryView.releases[0]).not.toHaveProperty("costs");
    expect(ordinaryView.releases[0]).not.toHaveProperty("costApprovalId");
    expect(ordinaryView.releases[0]).not.toHaveProperty("costApproverId");
    expect(ordinaryView.releases[0]?.history.map((row) => row.eventName)).not.toContain("turnkey.cost_requested");
    expect(ordinaryView.releases[0]?.history.map((row) => row.eventName)).not.toContain("turnkey.cost_decided");
    expect(JSON.stringify(ordinaryView)).not.toContain("42.50");
    const costView = await f.turnkey.detail(f.manager, f.projectId);
    expect(costView.releases[0]?.costs).toEqual({ prices: [{ key: "cabinetry", unitPrice: "42.50" }], total: "85" });
    const approval = await database.prisma.approvalRequest.findUniqueOrThrow({ where: { id: (await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } })).costApprovalId! } });
    const queue = await f.approvals.attention(f.owner.accountId, 25);
    expect(queue.items.some((item) => item.id === approval.id)).toBe(true);
    const leakedCostField = /"(?:unitPrice|total)"\s*:\s*"(?:42\.50|85(?:\.00)?)"/;
    expect(JSON.stringify(queue)).not.toMatch(leakedCostField);
    expect(JSON.stringify({ context: approval.context, evidence: approval.evidence })).not.toMatch(leakedCostField);
    const initialEvidence = await database.prisma.auditEvent.findMany({ where: { subjectType: "turnkey_release", subjectId: created.id } });
    const initialEvents = await database.prisma.domainEvent.findMany({ where: { subjectType: "turnkey_release", subjectId: created.id } });
    expect(JSON.stringify(initialEvidence.map((row) => ({ before: row.before, after: row.after })))).not.toMatch(leakedCostField);
    expect(JSON.stringify(initialEvents.map((row) => row.payload))).not.toMatch(leakedCostField);

    await expect(f.turnkey.decide({ ...f.manager, accountId: f.owner.accountId }, created.id, "cost", { expectedVersion: 2, outcome: "APPROVED", reason: "Requester cannot decide own request" })).rejects.toMatchObject({ status: 403 });
    const costApproved = await f.turnkey.decide(f.manager, created.id, "cost", { expectedVersion: 2, outcome: "APPROVED", reason: "Approve distinct cost review" });
    expect(costApproved).toMatchObject({ version: 3, state: "COST_APPROVED" });
    await expect(f.turnkey.materials(f.owner, created.id, { expectedVersion: 3, selections: [], reason: "Incomplete material selection" })).rejects.toMatchObject({ status: 409 });
    const materials = await f.turnkey.materials(f.owner, created.id, { expectedVersion: 3, selections: [{ lineKey: "cabinetry", material: "Oak veneer" }], reason: "Select material against approved BOQ" });
    expect(materials).toMatchObject({ version: 4, state: "COST_APPROVED" });

    const historyBeforeRollback = await database.prisma.turnkeyHistory.count({ where: { releaseId: created.id } });
    const approvalsBeforeRollback = await database.prisma.approvalRequest.count({ where: { sourceType: "turnkey_release", sourceId: created.id, typeKey: "turnkey.procurement" } });
    const auditsBeforeRollback = await database.prisma.auditEvent.count({ where: { organizationId: f.organizationId } });
    const eventsBeforeRollback = await database.prisma.domainEvent.count({ where: { organizationId: f.organizationId } });
    await expect(f.turnkey.request(f.owner, created.id, "procurement", { expectedVersion: 4, approverAccountId: f.manager.accountId, reason: "x".repeat(1001) })).rejects.toThrow();
    expect(await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({ version: 4, state: "COST_APPROVED", procurementApprovalId: null });
    expect(await database.prisma.turnkeyHistory.count({ where: { releaseId: created.id } })).toBe(historyBeforeRollback);
    expect(await database.prisma.approvalRequest.count({ where: { sourceType: "turnkey_release", sourceId: created.id, typeKey: "turnkey.procurement" } })).toBe(approvalsBeforeRollback);
    expect(await database.prisma.auditEvent.count({ where: { organizationId: f.organizationId } })).toBe(auditsBeforeRollback);
    expect(await database.prisma.domainEvent.count({ where: { organizationId: f.organizationId } })).toBe(eventsBeforeRollback);
    const procurementPending = await f.turnkey.request(f.owner, created.id, "procurement", { expectedVersion: 4, approverAccountId: f.manager.accountId, reason: "Submit procurement for separate approval" });
    expect(procurementPending).toMatchObject({ version: 5, state: "PROCUREMENT_PENDING" });
    const procurementApproved = await f.turnkey.decide(f.manager, created.id, "procurement", { expectedVersion: 5, outcome: "APPROVED", reason: "Approve separate procurement decision" });
    expect(procurementApproved).toMatchObject({ version: 6, state: "RELEASED" });

    const sessionNow = new Date();
    const expiringSession = await database.prisma.session.create({ data: { accountId: f.manager.accountId, tokenHash: randomUUID().replaceAll("-", "").padEnd(64, "0"), csrfTokenHash: "1".repeat(64), createdAt: sessionNow, lastUsedAt: sessionNow, expiresAt: new Date(sessionNow.getTime() + 700) } });
    let releaseLocked!: () => void;
    const locked = new Promise<void>((resolve) => { releaseLocked = resolve; });
    const holding = database.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "turnkey_releases" WHERE "id"=${created.id}::uuid FOR UPDATE`;
      releaseLocked();
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    });
    await locked;
    const beforeExpiredSession = await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } });
    await expect(f.turnkey.progress({ ...f.manager, sessionId: expiringSession.id }, created.id, { expectedVersion: 6, stage: "PROCUREMENT", status: "IN_PROGRESS", reason: "Expired session after lock wait must fail" })).rejects.toMatchObject({ status: 403 });
    await holding;
    expect(await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({ version: beforeExpiredSession.version, procurementStatus: "NOT_STARTED" });
    expect(await database.prisma.turnkeyHistory.count({ where: { releaseId: created.id } })).toBe(await database.prisma.turnkeyHistory.count({ where: { releaseId: created.id, releaseVersion: { lte: beforeExpiredSession.version } } }));

    let projectRow = await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } });
    await f.workflows.status(f.owner, f.projectId, { toStatus: "ON_HOLD", expectedVersion: projectRow.version, reason: "Hold before progress race" });
    await expect(f.turnkey.progress(f.owner, created.id, { expectedVersion: 6, stage: "PROCUREMENT", status: "IN_PROGRESS", reason: "Progress blocked while project is on hold" })).rejects.toMatchObject({ status: 409 });
    projectRow = await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } });
    await f.workflows.status(f.owner, f.projectId, { toStatus: "ACTIVE", expectedVersion: projectRow.version, reason: "Resume before progress race" });

    const progressRace = await Promise.allSettled([
      f.turnkey.progress(f.owner, created.id, { expectedVersion: 6, stage: "PROCUREMENT", status: "IN_PROGRESS", reason: "Race procurement start" }),
      f.turnkey.progress(f.owner, created.id, { expectedVersion: 6, stage: "PROCUREMENT", status: "IN_PROGRESS", reason: "Competing procurement start" })
    ]);
    expect(progressRace.filter((row) => row.status === "fulfilled")).toHaveLength(1);
    expect(progressRace.filter((row) => row.status === "rejected")).toHaveLength(1);
    const afterRace = await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } });
    expect(afterRace).toMatchObject({ version: 7, state: "RELEASED", procurementStatus: "IN_PROGRESS" });
    await f.turnkey.progress(f.owner, created.id, { expectedVersion: 7, stage: "PROCUREMENT", status: "COMPLETED", reason: "Complete procurement" });
    await f.turnkey.progress(f.owner, created.id, { expectedVersion: 8, stage: "FACTORY", status: "IN_PROGRESS", reason: "Start factory work" });
    await f.turnkey.progress(f.owner, created.id, { expectedVersion: 9, stage: "FACTORY", status: "COMPLETED", reason: "Complete factory work" });

    await expect(f.turnkey.create(f.owner, f.projectId, { ...input, replacesReleaseId: created.id })).rejects.toMatchObject({ status: 409 });
    const replacement = await f.turnkey.create(f.owner, f.projectId, { ...input, lines: [{ ...input.lines[0]!, quantity: "3" }], prices: [{ key: "cabinetry", unitPrice: "50" }], replacesReleaseId: created.id, changeReason: "Approved design quantity changed after original release" });
    expect(replacement).toMatchObject({ version: 1, state: "DRAFT" });
    const oldWhileReplacementDraft = await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } });
    expect(oldWhileReplacementDraft.replacedById).toBeNull();
    await f.turnkey.request(f.owner, replacement.id, "cost", { expectedVersion: 1, approverAccountId: f.manager.accountId, reason: "Review replacement cost" });
    await f.turnkey.decide(f.manager, replacement.id, "cost", { expectedVersion: 2, outcome: "APPROVED", reason: "Approve replacement cost" });
    await f.turnkey.materials(f.owner, replacement.id, { expectedVersion: 3, selections: [{ lineKey: "cabinetry", material: "Oak veneer" }], reason: "Confirm replacement material" });
    await f.turnkey.request(f.owner, replacement.id, "procurement", { expectedVersion: 4, approverAccountId: f.manager.accountId, reason: "Review replacement procurement" });
    await f.turnkey.decide(f.manager, replacement.id, "procurement", { expectedVersion: 5, outcome: "APPROVED", reason: "Approve replacement production inputs" });
    expect(await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({ state: "RELEASED", replacedById: replacement.id, factoryStatus: "COMPLETED" });
    expect(await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: replacement.id } })).toMatchObject({ state: "RELEASED", replacesReleaseId: created.id, changeReason: "Approved design quantity changed after original release" });
    await expect(f.turnkey.progress(f.owner, created.id, { expectedVersion: 10, stage: "FACTORY", status: "COMPLETED", reason: "Old production input cannot continue after replacement" })).rejects.toMatchObject({ status: 409 });
    const history = await database.prisma.turnkeyHistory.findMany({ where: { releaseId: created.id }, orderBy: { releaseVersion: "asc" } });
    expect(history.map((row) => row.releaseVersion)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(history.map((row) => row.eventName)).toContain("turnkey.release_replaced");

    await expect(database.prisma.$executeRaw`UPDATE "turnkey_releases" SET "designs"='[]'::jsonb WHERE "id"=${created.id}::uuid`).rejects.toThrow(/immutable and versioned/i);
    await expect(database.prisma.$executeRaw`UPDATE "turnkey_releases" SET "lines"='[]'::jsonb WHERE "id"=${created.id}::uuid`).rejects.toThrow(/immutable and versioned/i);
    await expect(database.prisma.$executeRaw`UPDATE "turnkey_prices" SET "prices"='[]'::jsonb WHERE "releaseId"=${created.id}::uuid`).rejects.toThrow(/immutable/i);
    const retainedHistory = history[0]!;
    await expect(database.prisma.$executeRaw`UPDATE "turnkey_history" SET "reason"='tampered' WHERE "id"=${retainedHistory.id}::uuid`).rejects.toThrow(/immutable/i);

    const forgedId = randomUUID();
    const auditsBeforeForgery = await database.prisma.auditEvent.count({ where: { organizationId: f.organizationId } });
    const eventsBeforeForgery = await database.prisma.domainEvent.count({ where: { organizationId: f.organizationId } });
    await expect(database.prisma.$transaction(async (tx) => {
      const source = await tx.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } });
      await tx.$executeRaw`INSERT INTO "turnkey_releases" ("id","organizationId","projectId","designs","lines","currency","createdById","reason") VALUES (${forgedId}::uuid,${f.organizationId}::uuid,${f.projectId}::uuid,${JSON.stringify(source.designs)}::jsonb,${JSON.stringify(source.lines)}::jsonb,${source.currency},${f.owner.accountId}::uuid,${"Attempt without canonical evidence"})`;
      await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
    })).rejects.toThrow(/canonical audit\/history\/prices required/i);
    expect(await database.prisma.turnkeyRelease.findUnique({ where: { id: forgedId } })).toBeNull();
    expect(await database.prisma.turnkeyPrice.findUnique({ where: { releaseId: forgedId } })).toBeNull();
    expect(await database.prisma.auditEvent.count({ where: { organizationId: f.organizationId } })).toBe(auditsBeforeForgery);
    expect(await database.prisma.domainEvent.count({ where: { organizationId: f.organizationId } })).toBe(eventsBeforeForgery);
  }, 60_000);

  it("keeps branch, assignment and exact current design authority server-enforced", async () => {
    const f = await makeFixture(database, nasRoot);
    const design = await f.makeApprovedRevision();
    await expect(f.turnkey.detail(f.manager, randomUUID())).rejects.toMatchObject({ status: 404 });
    await expect(f.turnkey.detail(f.manager, f.otherProjectId)).rejects.toMatchObject({ status: 403 });
    const created = await f.turnkey.create(f.owner, f.projectId, { revisionIds: [design.id], lines: [{ key: "line", description: "Valid line", quantity: "1", unit: "item" }], prices: [{ key: "line", unitPrice: "10" }], currency: "INR", reason: "Create release before superseding design" });
    const nextFile = await f.upload(`superseding-${randomUUID()}.pdf`, Buffer.from("%PDF-1.7\nsuperseding design\n%%EOF\n"));
    const nextDrawing = await f.revisions.appendRevision(f.owner, design.drawingId, { fileId: nextFile.id, series: "R", expectedVersion: (await database.prisma.drawingRecord.findUniqueOrThrow({ where: { id: design.drawingId } })).version, reason: "Append later design revision" });
    const nextRevision = nextDrawing.revisions.find((row) => row.fileId === nextFile.id)!;
    const exactNext = { id: nextRevision.id, drawingId: design.drawingId, blobId: nextFile.blobId, sha256: nextFile.sha256 };
    await f.submitRevision(exactNext);
    await f.approveRevision(exactNext);
    await expect(f.turnkey.request(f.owner, created.id, "cost", { expectedVersion: 1, approverAccountId: f.manager.accountId, reason: "Stale production revision cannot pass approval" })).rejects.toMatchObject({ status: 409 });
    expect(await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({ version: 1, state: "DRAFT", costApprovalId: null });

    const second = await f.makeApprovedRevision(`another-${randomUUID()}.pdf`);
    const active = await f.turnkey.create(f.owner, f.projectId, { revisionIds: [second.id], lines: [{ key: "line", description: "Valid line", quantity: "1", unit: "item" }], prices: [{ key: "line", unitPrice: "10" }], currency: "INR", reason: "Create fixture for assignment revocation" });
    const currentProject = await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } });
    await f.workflows.revokeAssignment(f.owner, f.projectId, f.viewerEmployeeId, { expectedVersion: currentProject.version, reason: "Revoke ordinary viewer assignment" });
    await expect(f.turnkey.detail(f.viewer, f.projectId)).rejects.toMatchObject({ status: 403 });
    await expect(f.turnkey.request(f.viewer, active.id, "cost", { expectedVersion: 1, approverAccountId: f.manager.accountId, reason: "Revoked staff cannot submit decisions" })).rejects.toMatchObject({ status: 403 });
  }, 60_000);

  it("serializes concurrent cost decisions so exactly one approval and canonical event wins", async () => {
    const f = await makeFixture(database, nasRoot);
    const design = await f.makeApprovedRevision();
    const created = await f.turnkey.create(f.owner, f.projectId, { revisionIds: [design.id], lines: [{ key: "line", description: "Race line", quantity: "1", unit: "item" }], prices: [{ key: "line", unitPrice: "18" }], currency: "INR", reason: "Create concurrent approval fixture" });
    await f.turnkey.request(f.owner, created.id, "cost", { expectedVersion: 1, approverAccountId: f.manager.accountId, reason: "Request concurrent cost decision" });
    const release = await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } });
    const attempts = await Promise.allSettled([
      f.turnkey.decide(f.manager, created.id, "cost", { expectedVersion: release.version, outcome: "APPROVED", reason: "Approve concurrent decision" }),
      f.turnkey.decide(f.manager, created.id, "cost", { expectedVersion: release.version, outcome: "REJECTED", reason: "Reject competing decision" })
    ]);
    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((result) => result.status === "rejected")).toHaveLength(1);
    const persisted = await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } });
    expect(persisted.version).toBe(release.version + 1);
    expect(["COST_APPROVED", "COST_REJECTED"]).toContain(persisted.state);
    expect(await database.prisma.approvalDecision.count({ where: { requestId: release.costApprovalId! } })).toBe(1);
    expect(await database.prisma.domainEvent.count({ where: { subjectType: "approval_request", subjectId: release.costApprovalId!, eventName: "approval.decided" } })).toBe(1);
    expect(await database.prisma.turnkeyHistory.count({ where: { releaseId: created.id, eventName: "turnkey.cost_decided" } })).toBe(1);
  }, 60_000);

  it("blocks approval while on hold and rechecks revoked Team Leader decision grants", async () => {
    const f = await makeFixture(database, nasRoot);
    const design = await f.makeApprovedRevision();
    const created = await f.turnkey.create(f.owner, f.projectId, { revisionIds: [design.id], lines: [{ key: "line", description: "Held line", quantity: "1", unit: "item" }], prices: [{ key: "line", unitPrice: "18" }], currency: "INR", reason: "Create hold and revocation fixture" });
    await f.turnkey.request(f.owner, created.id, "cost", { expectedVersion: 1, approverAccountId: f.manager.accountId, reason: "Request cost approval before hold" });
    let project = await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } });
    await f.workflows.status(f.owner, f.projectId, { toStatus: "ON_HOLD", expectedVersion: project.version, reason: "Hold pending cost review" });
    await expect(f.turnkey.decide(f.manager, created.id, "cost", { expectedVersion: 2, outcome: "APPROVED", reason: "Decision while held is denied" })).rejects.toMatchObject({ status: 409 });
    project = await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } });
    await f.workflows.status(f.owner, f.projectId, { toStatus: "ACTIVE", expectedVersion: project.version, reason: "Resume pending cost review" });

    const identity = new IdentityService(database, config);
    const organization = new OrganizationService(database, identity, f.authorization, f.workflows, f.tasks, new NotificationsService(database));
    const permission = await database.prisma.employeePermissionOverride.findFirstOrThrow({ where: { employeeId: f.managerEmployeeId, permissionKey: "turnkey.cost_approve", revokedAt: null } });
    await organization.revokeEmployeeOverride(f.owner.accountId, f.managerEmployeeId, permission.id, "Revoke cost decision grant during pending request");
    await expect(f.turnkey.decide(f.manager, created.id, "cost", { expectedVersion: 2, outcome: "APPROVED", reason: "Revoked approver cannot decide" })).rejects.toMatchObject({ status: 403 });
    expect(await database.prisma.approvalDecision.count({ where: { requestId: (await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } })).costApprovalId! } })).toBe(0);
    expect(await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({ version: 2, state: "COST_PENDING" });
  }, 60_000);

  it("exposes cost only to explicit approved client shares, never grants client decisions, and revokes snapshots immediately", async () => {
    const f = await makeFixture(database, nasRoot);
    const design = await f.makeApprovedRevision();
    const created = await f.turnkey.create(f.owner, f.projectId, { revisionIds: [design.id], lines: [{ key: "stone", description: "Stone package", quantity: "2", unit: "lot" }], prices: [{ key: "stone", unitPrice: "33.25" }], currency: "INR", reason: "Create approved cost share fixture" });
    await expect(f.turnkey.clientCosts(f.activeClient, f.projectId)).resolves.toEqual({ items: [] });
    await f.turnkey.request(f.owner, created.id, "cost", { expectedVersion: 1, approverAccountId: f.manager.accountId, reason: "Submit cost approval" });
    await f.turnkey.decide(f.manager, created.id, "cost", { expectedVersion: 2, outcome: "APPROVED", reason: "Approve cost snapshot" });
    const approvalPendingRelease = await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } });
    const shared = await f.turnkey.share(f.owner, created.id, { expectedVersion: approvalPendingRelease.version, accountId: f.client.accountId, view: true, reason: "Share this approved cost snapshot with Primary Client" });
    expect(shared.version).toBe(4);
    const visible = await f.turnkey.clientCosts(f.activeClient, f.projectId);
    expect(visible.items).toHaveLength(1);
    expect(visible.items[0]).toMatchObject({ id: created.id, currency: "INR", costs: { prices: [{ key: "stone", unitPrice: "33.25" }], total: "66.5" } });
    const expiredAt = new Date(Date.now() - 1_000);
    await database.prisma.clientPortalSession.update({ where: { id: f.activeClient.row.id }, data: { createdAt: new Date(expiredAt.getTime() - 60_000), lastUsedAt: expiredAt, expiresAt: expiredAt } });
    await expect(f.turnkey.clientCosts(f.activeClient, f.projectId)).rejects.toMatchObject({ status: 403 });
    const reactivatedAt = new Date();
    await database.prisma.clientPortalSession.update({ where: { id: f.activeClient.row.id }, data: { createdAt: reactivatedAt, lastUsedAt: reactivatedAt, expiresAt: new Date(reactivatedAt.getTime() + 60 * 60_000) } });
    await expect(f.turnkey.decide(f.client, created.id, "cost", { expectedVersion: shared.version, outcome: "APPROVED", reason: "Client cannot approve internal cost" })).rejects.toThrow();
    await f.turnkey.materials(f.owner, created.id, { expectedVersion: shared.version, selections: [{ lineKey: "stone", material: "Natural stone" }], reason: "Complete approved materials" });
    await f.turnkey.request(f.owner, created.id, "procurement", { expectedVersion: shared.version + 1, approverAccountId: f.manager.accountId, reason: "Submit procurement approval" });
    await f.turnkey.decide(f.manager, created.id, "procurement", { expectedVersion: shared.version + 2, outcome: "APPROVED", reason: "Approve procurement" });
    const current = await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: created.id } });
    await f.turnkey.share(f.owner, created.id, { expectedVersion: current.version, accountId: f.client.accountId, view: false, reason: "Revoke the explicit client cost share" });
    await expect(f.turnkey.clientCosts(f.activeClient, f.projectId)).resolves.toEqual({ items: [] });
    const revokedClientAccess = await f.access.list(f.owner, f.projectId);
    const clientGrant = revokedClientAccess.grants.find((grant) => grant.accountId === f.client.accountId)!;
    await f.access.changeAccess(f.owner, clientGrant.id, { expectedVersion: clientGrant.version, revoke: true, reason: "Revoke client project access" });
    await expect(f.turnkey.clientCosts(f.activeClient, f.projectId)).rejects.toMatchObject({ status: 403 });

    const separate = await makeFixture(database, nasRoot);
    const cancelledDesign = await separate.makeApprovedRevision();
    const cancelledRelease = await separate.turnkey.create(separate.owner, separate.projectId, { revisionIds: [cancelledDesign.id], lines: [{ key: "line", description: "Cancelled line", quantity: "1", unit: "item" }], prices: [{ key: "line", unitPrice: "12" }], currency: "INR", reason: "Create cancellation snapshot fixture" });
    await separate.turnkey.request(separate.owner, cancelledRelease.id, "cost", { expectedVersion: 1, approverAccountId: separate.manager.accountId, reason: "Request cancellation fixture cost approval" });
    await separate.turnkey.decide(separate.manager, cancelledRelease.id, "cost", { expectedVersion: 2, outcome: "APPROVED", reason: "Approve cancellation fixture cost" });
    const cancelledCurrent = await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: cancelledRelease.id } });
    await separate.turnkey.share(separate.owner, cancelledRelease.id, { expectedVersion: cancelledCurrent.version, accountId: separate.client.accountId, view: true, reason: "Share approved cost before project cancellation" });
    await expect(separate.turnkey.clientCosts(separate.activeClient, separate.projectId)).resolves.toMatchObject({ items: [{ id: cancelledRelease.id }] });
    const grant = await database.prisma.clientPortalGrant.findUniqueOrThrow({ where: { id: (await separate.access.list(separate.owner, separate.projectId)).grants[0]!.id } });
    const cancelledProject = await database.prisma.project.findUniqueOrThrow({ where: { id: separate.projectId } });
    await separate.tasks.cancelProject(separate.owner, separate.projectId, { expectedVersion: cancelledProject.version, reason: "Cancel after preserving permitted client access clock", clientAccessEndTimes: [{ grantId: grant.id, expectedVersion: grant.version, expiresAt: new Date(Date.now() + 60 * 60_000).toISOString() }] });
    await expect(separate.turnkey.clientCosts(separate.activeClient, separate.projectId)).rejects.toMatchObject({ status: 403 });
  }, 60_000);
});

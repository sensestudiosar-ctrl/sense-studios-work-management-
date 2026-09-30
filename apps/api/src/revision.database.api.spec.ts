import "reflect-metadata";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseService } from "./database.service.js";
import { AccountKind, PermissionEffect, PermissionScopeKind, RevisionApprovalKind } from "./generated/prisma/client.js";
import { AuthorizationService } from "./authorization.service.js";
import { ProjectService } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { ApprovalService } from "./approval.service.js";
import { DocumentService } from "./document.service.js";
import { RevisionService } from "./revision.service.js";
import { TaskService } from "./task.service.js";
import { recordProjectEvent } from "./project-events.js";
import type { RuntimeConfig } from "./config.js";
import type { ProjectActor } from "./project.service.js";

// S12 evidence journeys persist protected rows; keep them in their own migrated test database.
const databaseUrl = process.env.S12_DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;

type Fixture = {
  database: DatabaseService;
  nasRoot: string;
  organizationId: string;
  projectId: string;
  owner: ProjectActor;
  staff: ProjectActor;
  employeeId: string;
  folderId: string;
  projects: ProjectService;
  workflows: ProjectWorkflowService;
  tasks: TaskService;
  documents: DocumentService;
  revisions: RevisionService;
  upload(name: string, bytes: Buffer, actor?: ProjectActor): Promise<{ id: string; blobId: string; sha256: string }>;
  downstreamEvidence(revision: { id: string; drawingId: string; blobId: string; sha256: string }, kind: RevisionApprovalKind, actor?: ProjectActor): Promise<string>;
  approveWithDownstreamEvidence(revision: { id: string; drawingId: string; projectId: string; blobId: string; sha256: string }, kind: RevisionApprovalKind, actor?: ProjectActor): Promise<void>;
  submitWithDownstreamEvidence(revision: { id: string; drawingId: string; projectId: string; blobId: string; sha256: string }, actor?: ProjectActor): Promise<void>;
};

async function makeFixture(database: DatabaseService, nasRoot: string): Promise<Fixture> {
  const prisma = database.prisma;
  const organization = await prisma.organization.findFirst() ?? await prisma.organization.create({ data: { name: `S12 revision org ${randomUUID()}` } });
  const suffix = randomUUID();
  const branch = await prisma.branch.create({ data: { organizationId: organization.id, name: `S12 revision branch ${suffix}` } });
  const team = await prisma.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `S12 revision team ${suffix}` } });
  const ownerAccount = await prisma.account.findFirst({ where: { kind: AccountKind.OWNER, state: "ACTIVE" } }) ?? await prisma.account.create({ data: { normalizedEmail: `s12-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: "ACTIVE" } });
  const staffAccount = await prisma.account.create({ data: { normalizedEmail: `s12-staff-${suffix}@example.test`, kind: AccountKind.STAFF, state: "ACTIVE" } });
  const employee = await prisma.employee.create({ data: { organizationId: organization.id, accountId: staffAccount.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
  await prisma.employeePermissionOverride.createMany({ data: ["project.view", "project.manage", "document.view", "document.upload", "document.issue", "document.client_review_select"].map((permissionKey) => ({ organizationId: organization.id, employeeId: employee.id, permissionKey, effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: branch.id, reason: "S12 revision acceptance fixture grants" })) });

  const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: databaseUrl!, webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined, nasRoot };
  const authorization = new AuthorizationService(database);
  const projects = new ProjectService(database);
  const workflows = new ProjectWorkflowService(database, authorization, new ApprovalService(database));
  const tasks = new TaskService(database, authorization);
  const documents = new DocumentService(database, authorization, config);
  const revisions = new RevisionService(database, authorization, documents);
  const owner: ProjectActor = { accountId: ownerAccount.id, organizationId: organization.id, kind: AccountKind.OWNER };
  const staff: ProjectActor = { accountId: staffAccount.id, organizationId: organization.id, kind: AccountKind.STAFF };
  const created = await projects.create(owner, { branchId: branch.id, title: `S12 revision project ${suffix}`, deliveryType: "DESIGN", scopes: ["Architecture"], reason: "Create S12 acceptance project" });
  await workflows.assignment(owner, created.project.id, { employeeId: employee.id, expectedVersion: 1, reason: "Assign test Project Lead" });
  await workflows.lead(owner, created.project.id, { employeeId: employee.id, expectedVersion: 2, reason: "Set test Project Lead" });
  await workflows.status(owner, created.project.id, { toStatus: "ACTIVE", expectedVersion: 3, reason: "Activate S12 acceptance project" });
  const folder = await documents.createFolder(owner, created.project.id, { name: "Revision evidence", confidential: false, reason: "Create S12 evidence folder" });

  const upload = async (name: string, bytes: Buffer, actor = owner) => {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const started = await documents.startUpload(actor, created.project.id, { folderId: folder.id, fileName: name, mimeType: "application/pdf", sizeBytes: bytes.byteLength, confidential: false, viewOnly: false, reason: `Upload immutable S12 file ${name}` });
    await documents.writeChunk(actor, started.uploadId, 0, bytes, sha256);
    const file = await documents.finalize(actor, started.uploadId);
    const blob = await prisma.fileBlobMetadata.findFirstOrThrow({ where: { documentId: file.id } });
    return { id: file.id, blobId: blob.id, sha256 };
  };

  // Explicit test-only downstream evidence: S13/S14 production workflows are not implemented by this fixture.
  const downstreamEvidence = async (revision: { id: string; drawingId: string; blobId: string; sha256: string }, kind: RevisionApprovalKind, actor = owner) => {
    const eventName = kind === RevisionApprovalKind.INTERNAL ? "review.approved" : "client.approved";
    const subjectType = kind === RevisionApprovalKind.INTERNAL ? "review" : "client_review";
    const eventId = await prisma.$transaction((tx) => recordProjectEvent(tx, {
      organizationId: actor.organizationId,
      actorId: actor.accountId,
      eventName,
      subjectType,
      subjectId: revision.id,
      reason: `TEST FIXTURE ONLY: exact ${kind.toLowerCase()} approval evidence`,
      after: { projectId: created.project.id, drawingId: revision.drawingId, revisionId: revision.id, blobId: revision.blobId, sha256: revision.sha256 }
    }));
    const domainEvent = await prisma.domainEvent.findUniqueOrThrow({ where: { id: eventId } });
    return String((domainEvent.payload as { auditEventId: string }).auditEventId);
  };
  const approveWithDownstreamEvidence = async (revision: { id: string; drawingId: string; projectId: string; blobId: string; sha256: string }, kind: RevisionApprovalKind, actor = owner) => {
    const auditEventId = await downstreamEvidence(revision, kind, actor);
    await prisma.$transaction((tx) => revisions.consumeApproval(tx, revision.id, auditEventId, kind));
  };
  const submitWithDownstreamEvidence = async (revision: { id: string; drawingId: string; projectId: string; blobId: string; sha256: string }, actor = owner) => {
    const eventId = await prisma.$transaction((tx) => recordProjectEvent(tx, {
      organizationId: actor.organizationId, actorId: actor.accountId, eventName: "review.requested", subjectType: "review", subjectId: revision.id,
      reason: "TEST FIXTURE ONLY: exact internal review submission", after: { projectId: created.project.id, drawingId: revision.drawingId, revisionId: revision.id, blobId: revision.blobId, sha256: revision.sha256 }
    }));
    const event = await prisma.domainEvent.findUniqueOrThrow({ where: { id: eventId } });
    await prisma.$transaction((tx) => revisions.consumeReviewState(tx, revision.id, String((event.payload as { auditEventId: string }).auditEventId)));
  };

  return { database, nasRoot, organizationId: organization.id, projectId: created.project.id, owner, staff, employeeId: employee.id, folderId: folder.id, projects, workflows, tasks, documents, revisions, upload, downstreamEvidence, approveWithDownstreamEvidence, submitWithDownstreamEvidence };
}

databaseDescribe("S12 revision persistence and downstream-evidence boundary", () => {
  let database: DatabaseService;
  let nasRoot: string;

  beforeAll(async () => {
    nasRoot = await mkdtemp(join(tmpdir(), "sense-s12-files-"));
    database = new DatabaseService({ nodeEnv: "test", port: 4000, databaseUrl: databaseUrl!, webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined, nasRoot });
    const rows = await database.prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!/_test(?:db)?$/i.test(rows[0]?.name ?? "")) throw new Error("S12 checks require a dedicated test database");
  });

  afterAll(async () => { await database?.onModuleDestroy(); });

  it("persists an uploaded checksum-bound R0 and shows S13/S14 gates without creating a public approval bypass", async () => {
    const fixture = await makeFixture(database, nasRoot);
    const bytes = Buffer.from("%PDF-1.7\nS12 persisted revision smoke\n%%EOF\n", "ascii");
    const file = await fixture.upload(`initial-${randomUUID()}.pdf`, bytes);
    const drawing = await fixture.revisions.createDrawing(fixture.owner, fixture.projectId, { documentNumber: `A-${randomUUID().slice(0, 8)}`, title: "Initial drawing", fileId: file.id, reason: "Register initial immutable drawing" });
    expect(drawing.revisions).toHaveLength(1);
    expect(drawing.revisions[0]).toMatchObject({ label: "R0", state: "WORKING", isCurrent: false, sha256: file.sha256 });
    const register = await fixture.revisions.list(fixture.owner, fixture.projectId);
    expect(register.issueBlocker).toContain("S13");
    expect(register.capabilities.issue).toBe(false);
    const persisted = await database.prisma.documentRevision.findUniqueOrThrow({ where: { id: drawing.revisions[0]!.id } });
    expect(persisted.blobId).toBe(file.blobId);
  });

  it("issues only exact approved current evidence, records named acknowledgement, and supersedes without losing history", async () => {
    const fixture = await makeFixture(database, nasRoot);
    const upload = (name: string) => fixture.upload(`${name}-${randomUUID()}.pdf`, Buffer.from(`%PDF-1.7\n${name}\n%%EOF\n`));
    const first = await upload("initial");
    const created = await fixture.revisions.createDrawing(fixture.owner, fixture.projectId, { documentNumber: `B-${randomUUID().slice(0, 8)}`, title: "Issue journey", fileId: first.id, reason: "Register exact issue journey" });
    const r0 = { ...created.revisions[0]!, drawingId: created.id, projectId: fixture.projectId };
    const issueInput = { revisionIds: [r0.id], recipientAccountIds: [fixture.staff.accountId], purpose: "Construction", reason: "Formally issue approved drawing", acknowledgementRequired: true };
    const before = await database.prisma.drawingTransmittal.count({ where: { projectId: fixture.projectId } });
    const auditBefore = await database.prisma.auditEvent.count({ where: { organizationId: fixture.organizationId } });
    const domainBefore = await database.prisma.domainEvent.count({ where: { organizationId: fixture.organizationId } });
    const outboxBefore = await database.prisma.outboxDelivery.count();
    await expect(fixture.revisions.issue(fixture.owner, fixture.projectId, issueInput)).rejects.toThrow(/S13/);
    expect(await database.prisma.drawingTransmittal.count({ where: { projectId: fixture.projectId } })).toBe(before);
    expect(await database.prisma.auditEvent.count({ where: { organizationId: fixture.organizationId } })).toBe(auditBefore);
    expect(await database.prisma.domainEvent.count({ where: { organizationId: fixture.organizationId } })).toBe(domainBefore);
    expect(await database.prisma.outboxDelivery.count()).toBe(outboxBefore);
    await fixture.submitWithDownstreamEvidence(r0);
    await fixture.approveWithDownstreamEvidence(r0, RevisionApprovalKind.INTERNAL);
    const approved = await fixture.revisions.list(fixture.owner, fixture.projectId);
    expect(approved.drawings[0]?.revisions[0]).toMatchObject({ state: "APPROVED", isCurrent: true, issueEligible: true });
    await expect(database.prisma.drawingTransmittal.create({ data: { organizationId: fixture.organizationId, projectId: fixture.projectId, senderId: fixture.owner.accountId, purpose: "Fake direct issue", reason: "Attempt issue without canonical items or named recipients" } })).rejects.toThrow();
    expect(await database.prisma.drawingTransmittal.count({ where: { projectId: fixture.projectId } })).toBe(before);
    const issued = await fixture.revisions.issue(fixture.owner, fixture.projectId, issueInput);
    await expect(fixture.revisions.acknowledge(fixture.owner, issued.id, { note: "Received", reason: "Acknowledge receipt" })).rejects.toThrow();
    await fixture.revisions.acknowledge(fixture.staff, issued.id, { note: "Received", reason: "Acknowledge receipt" });
    await expect(fixture.revisions.acknowledge(fixture.staff, issued.id, { note: "Again", reason: "Repeat acknowledgement" })).rejects.toThrow();
    const repeated = await fixture.revisions.issue(fixture.owner, fixture.projectId, issueInput);
    expect(repeated.id).not.toBe(issued.id);
    const oldItem = await database.prisma.transmittalItem.findFirstOrThrow({ where: { transmittalId: issued.id } });
    expect(oldItem).toMatchObject({ revisionId: r0.id, sha256: first.sha256 });

    const second = await upload("replacement");
    const next = await fixture.revisions.appendRevision(fixture.owner, created.id, { fileId: second.id, series: "R", expectedVersion: (await database.prisma.drawingRecord.findUniqueOrThrow({ where: { id: created.id } })).version, reason: "Replace approved drawing" });
    const r1 = { ...next.revisions.find((revision) => revision.label === "R1")!, drawingId: created.id, projectId: fixture.projectId };
    await fixture.submitWithDownstreamEvidence(r1);
    await fixture.approveWithDownstreamEvidence(r1, RevisionApprovalKind.INTERNAL);
    const promoted = await fixture.revisions.list(fixture.owner, fixture.projectId);
    expect(promoted.drawings[0]?.revisions.find((revision) => revision.id === r1.id)).toMatchObject({ state: "APPROVED", isCurrent: true });
    expect(promoted.drawings[0]?.revisions.find((revision) => revision.id === r0.id)).toMatchObject({ state: "SUPERSEDED", isCurrent: false });
    await expect(fixture.revisions.issue(fixture.owner, fixture.projectId, issueInput)).rejects.toThrow(/current/);
    expect(await database.prisma.drawingTransmittal.count({ where: { projectId: fixture.projectId } })).toBe(before + 2);

    await fixture.revisions.selectClientReview(fixture.owner, created.id, { expectedVersion: (await database.prisma.drawingRecord.findUniqueOrThrow({ where: { id: created.id } })).version, reason: "Management requires client review" });
    const selectedIssue = { ...issueInput, revisionIds: [r1.id] };
    await expect(fixture.revisions.issue(fixture.owner, fixture.projectId, selectedIssue)).rejects.toThrow(/S14/);
    await fixture.approveWithDownstreamEvidence(r1, RevisionApprovalKind.CLIENT);
    await fixture.revisions.issue(fixture.owner, fixture.projectId, selectedIssue);
    const final = await fixture.revisions.list(fixture.owner, fixture.projectId);
    expect(final.transmittals).toHaveLength(3);
    expect(final.transmittals.find((row) => row.id === issued.id)?.recipients[0]?.acknowledgedAt).toBeTruthy();
  });

  it("serializes concurrent appends and protects immutable revision content in PostgreSQL", async () => {
    const fixture = await makeFixture(database, nasRoot);
    const r0File = await fixture.upload(`race-r0-${randomUUID()}.pdf`, Buffer.from("%PDF-1.7\ninitial\n%%EOF\n"));
    const first = await fixture.upload(`race-a-${randomUUID()}.pdf`, Buffer.from("%PDF-1.7\nfirst\n%%EOF\n"));
    const second = await fixture.upload(`race-b-${randomUUID()}.pdf`, Buffer.from("%PDF-1.7\nsecond\n%%EOF\n"));
    const drawing = await fixture.revisions.createDrawing(fixture.owner, fixture.projectId, { documentNumber: `C-${randomUUID().slice(0, 8)}`, title: "Concurrent revision", fileId: r0File.id, reason: "Register race fixture" });
    const attempts = await Promise.allSettled([first, second].map((file) => fixture.revisions.appendRevision(fixture.owner, drawing.id, { fileId: file.id, series: "R", expectedVersion: drawing.version, reason: "Concurrent exact revision" })));
    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((result) => result.status === "rejected")).toHaveLength(1);
    const rows = await database.prisma.documentRevision.findMany({ where: { drawingId: drawing.id }, orderBy: { ordinal: "asc" } });
    expect(rows.map((row) => `${row.series}${row.number}`)).toEqual(["R0", "R1"]);
    expect((await database.prisma.drawingRecord.findUniqueOrThrow({ where: { id: drawing.id } })).version).toBe(drawing.version + 1);
    await expect(database.prisma.$executeRaw`UPDATE "document_revisions" SET "sha256"=${"0".repeat(64)} WHERE "id"=${rows[0]!.id}::uuid`).rejects.toThrow();
    expect((await database.prisma.documentRevision.findUniqueOrThrow({ where: { id: rows[0]!.id } })).sha256).toBe(r0File.sha256);
    await expect(database.prisma.$executeRaw`UPDATE "document_revisions" SET "state"='APPROVED',"isCurrent"=true WHERE "id"=${rows[0]!.id}::uuid`).rejects.toThrow();
    const foreignAuditId = await fixture.downstreamEvidence({ id: rows[1]!.id, drawingId: drawing.id, blobId: rows[1]!.blobId, sha256: rows[1]!.sha256 }, RevisionApprovalKind.INTERNAL);
    await expect(database.prisma.revisionApprovalFact.create({ data: { organizationId: fixture.organizationId, projectId: fixture.projectId, revisionId: rows[0]!.id, kind: RevisionApprovalKind.INTERNAL, auditEventId: foreignAuditId } })).rejects.toThrow();
    expect(await database.prisma.revisionApprovalFact.count({ where: { revisionId: rows[0]!.id } })).toBe(0);
  });

  it.each(["COMPLETED", "CANCELLED"] as const)("anchors issued evidence ten years from first %s transition", async (target) => {
    const fixture = await makeFixture(database, nasRoot);
    const file = await fixture.upload(`retention-${randomUUID()}.pdf`, Buffer.from("%PDF-1.7\nretention\n%%EOF\n"));
    const drawing = await fixture.revisions.createDrawing(fixture.owner, fixture.projectId, { documentNumber: `T-${randomUUID().slice(0, 8)}`, title: "Retained issue", fileId: file.id, reason: "Register retention source" });
    const revision = { ...drawing.revisions[0]!, drawingId: drawing.id, projectId: fixture.projectId };
    await fixture.submitWithDownstreamEvidence(revision);
    await fixture.approveWithDownstreamEvidence(revision, RevisionApprovalKind.INTERNAL);
    const issue = await fixture.revisions.issue(fixture.owner, fixture.projectId, { revisionIds: [revision.id], recipientAccountIds: [fixture.staff.accountId], purpose: "Retained delivery", reason: "Issue for ten-year retention", acknowledgementRequired: false });
    const version = (await database.prisma.project.findUniqueOrThrow({ where: { id: fixture.projectId } })).version;
    if (target === "COMPLETED") await fixture.workflows.status(fixture.owner, fixture.projectId, { toStatus: "COMPLETED", expectedVersion: version, reason: "Complete retention fixture" });
    else await fixture.tasks.cancelProject(fixture.owner, fixture.projectId, { expectedVersion: version, reason: "Cancel retention fixture" });
    const rows = await database.prisma.$queryRaw<Array<{ clockMatches: boolean; intervalMatches: boolean; fileMatches: boolean }>>`
      SELECT t."projectClosedAt"=(SELECT min("occurredAt") FROM "project_status_changes" WHERE "projectId"=${fixture.projectId}::uuid AND "toStatus" IN ('COMPLETED','CANCELLED')) AS "clockMatches",
        t."retainUntil"=t."projectClosedAt"+interval '10 years' AS "intervalMatches",
        f."projectClosedAt"=t."projectClosedAt" AND f."retainUntil"=t."retainUntil" AS "fileMatches"
      FROM "drawing_transmittals" t JOIN "file_retention_records" f ON f."blobId"=${file.blobId}::uuid WHERE t."id"=${issue.id}::uuid`;
    expect(rows).toEqual([{ clockMatches: true, intervalMatches: true, fileMatches: true }]);
    if (target === "COMPLETED") {
      const closed = await database.prisma.drawingTransmittal.findUniqueOrThrow({ where: { id: issue.id } });
      const completedVersion = (await database.prisma.project.findUniqueOrThrow({ where: { id: fixture.projectId } })).version;
      await fixture.workflows.status(fixture.owner, fixture.projectId, { toStatus: "ARCHIVED", expectedVersion: completedVersion, reason: "Archive completed retention fixture" });
      const archived = await database.prisma.drawingTransmittal.findUniqueOrThrow({ where: { id: issue.id } });
      expect([archived.projectClosedAt, archived.retainUntil]).toEqual([closed.projectClosedAt, closed.retainUntil]);
    }
    await expect(database.prisma.$executeRaw`UPDATE "drawing_transmittals" SET "projectClosedAt"=CURRENT_TIMESTAMP WHERE "id"=${issue.id}::uuid`).rejects.toThrow();
  });

  it("rejects an unassigned staff reader and a foreign project file without partial records", async () => {
    const fixture = await makeFixture(database, nasRoot);
    const file = await fixture.upload(`scope-${randomUUID()}.pdf`, Buffer.from("%PDF-1.7\nscope\n%%EOF\n"));
    const suffix = randomUUID();
    const outsider = await database.prisma.account.create({ data: { normalizedEmail: `s12-unassigned-${suffix}@example.test`, kind: AccountKind.STAFF, state: "ACTIVE" } });
    const project = await database.prisma.project.findUniqueOrThrow({ where: { id: fixture.projectId } });
    const branch = await database.prisma.branch.findUniqueOrThrow({ where: { id: project.branchId } });
    const team = await database.prisma.team.findFirstOrThrow({ where: { branchId: branch.id } });
    const employee = await database.prisma.employee.create({ data: { organizationId: fixture.organizationId, accountId: outsider.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
    await database.prisma.employeePermissionOverride.createMany({ data: ["project.view", "document.view", "document.upload"].map((permissionKey) => ({ organizationId: fixture.organizationId, employeeId: employee.id, permissionKey, effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: branch.id, reason: "S12 unassigned access fixture" })) });
    await expect(fixture.revisions.list({ accountId: outsider.id, organizationId: fixture.organizationId, kind: AccountKind.STAFF }, fixture.projectId)).rejects.toThrow();
    const other = await fixture.projects.create(fixture.owner, { branchId: branch.id, title: `S12 foreign project ${suffix}`, deliveryType: "DESIGN", scopes: ["Architecture"], reason: "Create foreign project fixture" });
    const count = await database.prisma.drawingRecord.count({ where: { projectId: other.project.id } });
    await expect(fixture.revisions.createDrawing(fixture.owner, other.project.id, { documentNumber: `X-${suffix.slice(0, 8)}`, title: "Foreign file attempt", fileId: file.id, reason: "Attempt cross-project file binding" })).rejects.toThrow();
    expect(await database.prisma.drawingRecord.count({ where: { projectId: other.project.id } })).toBe(count);
  });
});

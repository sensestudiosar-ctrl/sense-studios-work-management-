import "reflect-metadata";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jest } from "@jest/globals";
import { AccountKind, ProjectStatus, RevisionApprovalKind, TaskPriority } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { ProjectService, type ProjectActor } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { TaskService } from "./task.service.js";
import { DocumentService } from "./document.service.js";
import { RevisionService } from "./revision.service.js";
import { ClientPortalScopeService } from "./client-portal-scope.service.js";
import { ExternalPortalIdentityService, type ActiveExternalPortalSession } from "./external-portal-identity.service.js";
import { ExternalPortalService } from "./external-portal.service.js";
import { externalEvidence } from "./external-portal-policy.js";
import { TurnkeyService } from "./turnkey.service.js";
import { WorkforceService } from "./workforce.service.js";
import { NotificationsService } from "./notifications.service.js";
import { SiteService } from "./site.service.js";
import { NotificationWorker, OperationalRecipientPredicate, PersistedVerifiedAddressPredicate } from "./notification-worker.js";
import { recordProjectEvent } from "./project-events.js";
import type { BrevoEmailAdapter } from "./brevo-email.js";
import type { RuntimeConfig } from "./config.js";
import { isS27DisposableTestTarget, matchesS27DisposableServer } from "./s27-disposable-test-target.js";
import { DOCUMENT_CHUNK_SIZE } from "./document-file-policy.js";

const databaseUrl = process.env.S21_DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
const config: RuntimeConfig = {
  nodeEnv: "test", port: 4000, databaseUrl: databaseUrl ?? "", webOrigin: "http://localhost:5173",
  ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined,
  emailVerificationSecret: "s21-local-otp-isolated-secret-20261004",
  externalShareSecret: "s21-local-native-share-encryption-key-20261004",
  documentMaxFileBytes: 20 * 1024 * 1024
};
jest.setTimeout(90_000);

const pdfBytes = (label: string) => Buffer.from(`%PDF-1.7\nS21 ${label}\n%%EOF\n`, "ascii");
const hash = (value: Buffer) => createHash("sha256").update(value).digest("hex");

type S21Fixture = {
  db: DatabaseService; nasRoot: string; organizationId: string; branchId: string; projectId: string; foreignProjectId: string;
  owner: ProjectActor; lead: ProjectActor; manager: ProjectActor; ordinary: ProjectActor; stranger: ProjectActor;
  leadEmployeeId: string; ordinaryEmployeeId: string; project: { id: string; version: number };
  authorization: AuthorizationService; projects: ProjectService; workflows: ProjectWorkflowService; tasks: TaskService;
  documents: DocumentService; revisions: RevisionService; portalScope: ClientPortalScopeService;
  identity: ExternalPortalIdentityService; external: ExternalPortalService;
  turnkey: TurnkeyService; site: SiteService;
  revisionId: string; fileId: string; confidentialRevisionId: string; cadRevisionId: string; foreignRevisionId: string;
  consultantEmail: string; consultantGrant: { id: string; accountId: string; version: number };
  vendorEmail: string; vendorGrant: { id: string; accountId: string; version: number };
  consultant: ActiveExternalPortalSession; consultantActor: { accountId: string; sessionId: string };
  vendor: ActiveExternalPortalSession; vendorActor: { accountId: string; sessionId: string };
  grants: Array<{ id: string; accountId: string }>;
  activate(next: "ACTIVE" | "ON_HOLD"): Promise<void>;
  upload(fileName: string, bytes?: Buffer, confidential?: boolean, parentId?: string): Promise<{ fileId: string; revisionId: string; folderId: string }>;
};

async function fixture(db: DatabaseService, nasRoot: string): Promise<S21Fixture> {
  const prisma = db.prisma, suffix = randomUUID();
  const organization = await prisma.organization.findFirst() ?? await prisma.organization.create({ data: { name: `S21 external ${suffix}` } });
  const branch = await prisma.branch.create({ data: { organizationId: organization.id, name: `S21 branch ${suffix}` } });
  const otherBranch = await prisma.branch.create({ data: { organizationId: organization.id, name: `S21 other branch ${suffix}` } });
  const team = await prisma.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `S21 team ${suffix}` } });
  const otherTeam = await prisma.team.create({ data: { organizationId: organization.id, branchId: otherBranch.id, name: `S21 other team ${suffix}` } });
  const ownerAccount = await prisma.account.findFirst({ where: { kind: AccountKind.OWNER, state: "ACTIVE" } }) ?? await prisma.account.create({ data: { normalizedEmail: `s21-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: "ACTIVE" } });
  const leadAccount = await prisma.account.create({ data: { normalizedEmail: `s21-lead-${suffix}@example.test`, kind: "STAFF", state: "ACTIVE" } });
  const managerAccount = await prisma.account.create({ data: { normalizedEmail: `s21-manager-${suffix}@example.test`, kind: "STAFF", state: "ACTIVE" } });
  const ordinaryAccount = await prisma.account.create({ data: { normalizedEmail: `s21-ordinary-${suffix}@example.test`, kind: "STAFF", state: "ACTIVE" } });
  const strangerAccount = await prisma.account.create({ data: { normalizedEmail: `s21-stranger-${suffix}@example.test`, kind: "STAFF", state: "ACTIVE" } });
  const leadEmployee = await prisma.employee.create({ data: { organizationId: organization.id, accountId: leadAccount.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
  const managerEmployee = await prisma.employee.create({ data: { organizationId: organization.id, accountId: managerAccount.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
  const ordinaryEmployee = await prisma.employee.create({ data: { organizationId: organization.id, accountId: ordinaryAccount.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
  const strangerEmployee = await prisma.employee.create({ data: { organizationId: organization.id, accountId: strangerAccount.id, homeBranchId: otherBranch.id, homeTeamId: otherTeam.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
  const overrides = [
    [leadEmployee.id, "project.view"], [leadEmployee.id, "project.manage"], [leadEmployee.id, "document.view"], [leadEmployee.id, "site.view"], [managerEmployee.id, "project.view"], [managerEmployee.id, "project.manage"], [managerEmployee.id, "employee.manage"], [managerEmployee.id, "external.manage"], [managerEmployee.id, "document.view"], [managerEmployee.id, "turnkey.view"], [managerEmployee.id, "turnkey.manage"], [managerEmployee.id, "turnkey.cost_view"], [managerEmployee.id, "turnkey.cost_approve"], [managerEmployee.id, "turnkey.procurement_approve"], [managerEmployee.id, "site.view"],
    [ordinaryEmployee.id, "project.view"], [strangerEmployee.id, "project.view"], [strangerEmployee.id, "external.manage"]
  ].map(([employeeId, permissionKey]) => ({ organizationId: organization.id, employeeId: employeeId!, permissionKey: permissionKey!, effect: "ALLOW" as const, scopeKind: "BRANCH" as const, branchId: employeeId === strangerEmployee.id ? otherBranch.id : branch.id, reason: "S21 dedicated external API acceptance permissions" }));
  await prisma.employeePermissionOverride.createMany({ data: overrides });
  const owner: ProjectActor = { accountId: ownerAccount.id, organizationId: organization.id, kind: AccountKind.OWNER };
  const lead: ProjectActor = { accountId: leadAccount.id, organizationId: organization.id, kind: AccountKind.STAFF };
  const manager: ProjectActor = { accountId: managerAccount.id, organizationId: organization.id, kind: AccountKind.STAFF };
  const ordinary: ProjectActor = { accountId: ordinaryAccount.id, organizationId: organization.id, kind: AccountKind.STAFF };
  const stranger: ProjectActor = { accountId: strangerAccount.id, organizationId: organization.id, kind: AccountKind.STAFF };
  const authorization = new AuthorizationService(db), approvals = new ApprovalService(db), projects = new ProjectService(db);
  const workflows = new ProjectWorkflowService(db, authorization, approvals), tasks = new TaskService(db, authorization, approvals);
  const documents = new DocumentService(db, authorization, { ...config, nasRoot });
  const revisions = new RevisionService(db, authorization, documents);
  const portalScope = new ClientPortalScopeService(db, authorization);
  const turnkey = new TurnkeyService(db, authorization, approvals, revisions, portalScope);
  const workforce = new WorkforceService(db, authorization, approvals, new NotificationsService(db), config);
  const site = new SiteService(db, authorization, documents, turnkey, workforce);
  const external = new ExternalPortalService(db, authorization, documents, turnkey, site, { ...config, nasRoot });
  const issuedProject = (await projects.create(owner, { branchId: branch.id, title: `S21 Turnkey portal ${suffix}`, deliveryType: "TURNKEY", scopes: ["External portal acceptance"], reason: "Create S21 isolated external portal project" })).project;
  let current = await prisma.project.findUniqueOrThrow({ where: { id: issuedProject.id } });
  await workflows.assignment(owner, issuedProject.id, { employeeId: leadEmployee.id, expectedVersion: current.version, reason: "Assign S21 current Project Lead" });
  current = await prisma.project.findUniqueOrThrow({ where: { id: issuedProject.id } });
  await workflows.lead(owner, issuedProject.id, { employeeId: leadEmployee.id, expectedVersion: current.version, reason: "Appoint S21 current Project Lead" });
  current = await prisma.project.findUniqueOrThrow({ where: { id: issuedProject.id } });
  await workflows.assignment(owner, issuedProject.id, { employeeId: managerEmployee.id, expectedVersion: current.version, reason: "Assign scoped external manager" });
  current = await prisma.project.findUniqueOrThrow({ where: { id: issuedProject.id } });
  await workflows.assignment(owner, issuedProject.id, { employeeId: ordinaryEmployee.id, expectedVersion: current.version, reason: "Assign ordinary staff member" });
  current = await prisma.project.findUniqueOrThrow({ where: { id: issuedProject.id } });
  await workflows.status(owner, issuedProject.id, { toStatus: ProjectStatus.ACTIVE, expectedVersion: current.version, reason: "Activate S21 external project" });
  const foreignProject = (await projects.create(owner, { branchId: otherBranch.id, title: `S21 Foreign project ${suffix}`, deliveryType: "DESIGN", scopes: ["Foreign resource isolation"], reason: "Create S21 foreign branch project" })).project;
  const uploadTo = async (projectId: string, fileName: string, bytes = pdfBytes(fileName), confidential = false, parentId?: string) => {
    const folder = await documents.createFolder(owner, projectId, { name: `S21 ${fileName} folder ${suffix}`, ...(parentId ? { parentId } : {}), confidential, reason: "Create S21 isolated file folder" });
    const started = await documents.startUpload(owner, projectId, { folderId: folder.id, fileName, mimeType: fileName.endsWith(".skp") ? "application/octet-stream" : "application/pdf", sizeBytes: bytes.length, confidential, viewOnly: false, reason: `Upload S21 acceptance fixture ${fileName}` });
    await documents.writeChunk(owner, started.uploadId, 0, bytes, hash(bytes));
    const stored = await documents.finalize(owner, started.uploadId);
    const drawing = await revisions.createDrawing(owner, projectId, { documentNumber: `S21-${randomUUID().slice(0, 8)}`, title: fileName, fileId: stored.id, reason: "Create S21 exact external revision" });
    return { fileId: stored.id, revisionId: drawing.revisions[0]!.id, folderId: folder.id };
  };
  const upload = async (fileName: string, bytes = pdfBytes(fileName), confidential = false, parentId?: string) => uploadTo(issuedProject.id, fileName, bytes, confidential, parentId);
  const primary = await upload(`exact-${suffix}.pdf`);
  const confidentialParent = await documents.createFolder(owner, issuedProject.id, { name: `S21 Confidential ancestor ${suffix}`, confidential: true, reason: "Create S21 confidential ancestor fixture" });
  const privateChild = await documents.createFolder(owner, issuedProject.id, { name: `S21 child ${suffix}`, parentId: confidentialParent.id, confidential: false, reason: "Create S21 child of confidential ancestor" });
  const privateBytes = pdfBytes("confidential ancestor");
  const privateUpload = await documents.startUpload(owner, issuedProject.id, { folderId: privateChild.id, fileName: `private-${suffix}.pdf`, mimeType: "application/pdf", sizeBytes: privateBytes.length, confidential: false, viewOnly: false, reason: "Upload under S21 confidential ancestor" });
  await documents.writeChunk(owner, privateUpload.uploadId, 0, privateBytes, hash(privateBytes));
  const privateFile = await documents.finalize(owner, privateUpload.uploadId);
  const privateDrawing = await revisions.createDrawing(owner, issuedProject.id, { documentNumber: `S21-PRIVATE-${suffix.slice(0, 8)}`, title: "Confidential ancestor fixture", fileId: privateFile.id, reason: "Create revision under confidential ancestor" });
  const cad = await upload(`native-${suffix}.skp`, Buffer.from(`SketchUp S21 native model ${suffix}`, "ascii"));
  const foreignResource = await uploadTo(foreignProject.id, `foreign-${suffix}.pdf`);

  const approveRevision = async (revisionId: string) => {
    const revision = await prisma.documentRevision.findUniqueOrThrow({ where: { id: revisionId } });
    const submitEventId = await prisma.$transaction((tx) => recordProjectEvent(tx, { organizationId: organization.id, actorId: owner.accountId, eventName: "review.requested", subjectType: "review", subjectId: revision.id, reason: "S21 fixture exact revision submission", after: { projectId: issuedProject.id, drawingId: revision.drawingId, revisionId: revision.id, blobId: revision.blobId, sha256: revision.sha256 } }));
    const submitEvent = await prisma.domainEvent.findUniqueOrThrow({ where: { id: submitEventId } });
    await prisma.$transaction((tx) => revisions.consumeReviewState(tx, revisionId, (submitEvent.payload as { auditEventId: string }).auditEventId));
    const approvalEventId = await prisma.$transaction((tx) => recordProjectEvent(tx, { organizationId: organization.id, actorId: owner.accountId, eventName: "review.approved", subjectType: "review", subjectId: revision.id, reason: "S21 fixture exact internal approval", after: { projectId: issuedProject.id, drawingId: revision.drawingId, revisionId: revision.id, blobId: revision.blobId, sha256: revision.sha256 } }));
    const approvalEvent = await prisma.domainEvent.findUniqueOrThrow({ where: { id: approvalEventId } });
    await prisma.$transaction((tx) => revisions.consumeApproval(tx, revisionId, (approvalEvent.payload as { auditEventId: string }).auditEventId, RevisionApprovalKind.INTERNAL));
  };
  await approveRevision(primary.revisionId);

  const deliveredCodes = new Map<string, string>();
  const mail = { send: async (email: string, content: { textContent: string }) => { const value = content.textContent.match(/code is (\d{6})/)?.[1]; if (value) deliveredCodes.set(email, value); } } as unknown as BrevoEmailAdapter;
  const identity = new ExternalPortalIdentityService(db, mail, config);
  const staffInput = (email: string, revisionIds: string[], portalType: "CONSULTANT" | "VENDOR_FACTORY") => ({ email, portalType, revisionIds, releaseIds: [], packageIds: [], reason: "S21 explicitly scoped external invitation" });
  const consultantEmail = `s21-consultant-${suffix}@example.test`, vendorEmail = `s21-vendor-${suffix}@example.test`;
  const consultantGrant = await external.createGrant(owner, issuedProject.id, staffInput(consultantEmail, [primary.revisionId, cad.revisionId], "CONSULTANT"));
  const vendorGrant = await external.createGrant(owner, issuedProject.id, staffInput(vendorEmail, [primary.revisionId], "VENDOR_FACTORY"));
  const signIn = async (email: string) => {
    await identity.requestCode(email);
    const code = deliveredCodes.get(email);
    if (!code) throw new Error("S21 test email did not receive a sign-in code");
    await identity.verifyCode(email, code === "000000" ? "000001" : "000000").catch(() => undefined);
    const result = await identity.verifyCode(email, code, "S21 database API test", "127.0.0.1");
    return identity.session(result.secret);
  };
  const consultant = await signIn(consultantEmail), vendor = await signIn(vendorEmail);
  const consultantRow = await prisma.externalPortalSession.findFirstOrThrow({ where: { accountId: consultant.account.id, revokedAt: null }, orderBy: { createdAt: "desc" } });
  const vendorRow = await prisma.externalPortalSession.findFirstOrThrow({ where: { accountId: vendor.account.id, revokedAt: null }, orderBy: { createdAt: "desc" } });
  const activate = async (next: "ACTIVE" | "ON_HOLD") => {
    const p = await prisma.project.findUniqueOrThrow({ where: { id: issuedProject.id } });
    await workflows.status(owner, issuedProject.id, { toStatus: next === "ACTIVE" ? ProjectStatus.ACTIVE : ProjectStatus.ON_HOLD, expectedVersion: p.version, reason: `S21 fixture project ${next.toLowerCase()}` });
  };
  return {
    db, nasRoot, organizationId: organization.id, branchId: branch.id, projectId: issuedProject.id, foreignProjectId: foreignProject.id,
    owner, lead, manager, ordinary, stranger, leadEmployeeId: leadEmployee.id, ordinaryEmployeeId: ordinaryEmployee.id,
    project: { id: issuedProject.id, version: issuedProject.version }, authorization, projects, workflows, tasks, documents, revisions, portalScope,
    identity, external, turnkey, site, revisionId: primary.revisionId, fileId: primary.fileId, confidentialRevisionId: privateDrawing.revisions[0]!.id, cadRevisionId: cad.revisionId, foreignRevisionId: foreignResource.revisionId,
    consultantEmail, consultantGrant, vendorEmail, vendorGrant, consultant, consultantActor: { accountId: consultant.account.id, sessionId: consultantRow.id },
    vendor, vendorActor: { accountId: vendor.account.id, sessionId: vendorRow.id }, grants: [consultantGrant, vendorGrant], activate,
    upload: async (fileName: string, bytes = pdfBytes(fileName), confidential = false, parentId?: string) => upload(fileName, bytes, confidential, parentId)
  };
}

databaseDescribe("S21 external portal PostgreSQL/API acceptance", () => {
  let database: DatabaseService;
  let nasRoot: string;
  beforeAll(async () => {
    if (!databaseUrl) throw new Error("S21_DATABASE_URL must be configured for the dedicated external portal database");
    const parsed = new URL(databaseUrl);
    const dbName = decodeURIComponent(parsed.pathname.slice(1));
    const s21 = /^sense_s21_[a-z0-9_]*_test$/.test(dbName) && parsed.port === "56433";
    const s25 = process.env.S25_E2E_ENABLED === "1" && /^sense_s21_s25_[a-z0-9_]+_test$/.test(dbName) && parsed.port === "57433";
    const s26 = process.env.S26_E2E_ENABLED === "1" && /^sense_s21_s26_[a-z0-9_]+_test$/.test(dbName) && parsed.port === "57433";
    const s27Legacy = process.env.S27_E2E_ENABLED === "1" && /^sense_s21_s27_[a-z0-9_]+_test$/.test(dbName) && parsed.port === "57433";
    const s27Disposable = isS27DisposableTestTarget("S21_DATABASE_URL", databaseUrl);
    const s27 = s27Legacy || s27Disposable;
    if ((!s21 && !s25 && !s26 && !s27) || !["127.0.0.1", "localhost"].includes(parsed.hostname)) throw new Error("External portal integration requires an isolated S21 or explicitly enabled exact S21/S25/S26/S27 loopback database");
    nasRoot = await mkdtemp(join(tmpdir(), "sense-s21-external-"));
    database = new DatabaseService({ ...config, databaseUrl, nasRoot });
    await database.check();
    const actual = (await database.prisma.$queryRaw<Array<{ name: string; port: number }>>`SELECT current_database() AS name, inet_server_port() AS port`)[0]!;
    if (s27Disposable && !matchesS27DisposableServer(databaseUrl, actual.name, actual.port)) throw new Error("S21 disposable server mismatch");
  });
  afterAll(async () => { await database?.onModuleDestroy(); });

  it("keeps external OTP identity isolated and current, and scopes exact consultant/vendor evidence", async () => {
    const f = await fixture(database, nasRoot);
    expect(f.consultant.account.kind).toBe("EXTERNAL");
    expect(f.vendor.account.kind).toBe("EXTERNAL");
    expect(await f.external.projects(f.consultantActor)).toEqual({ projects: [expect.objectContaining({ id: f.projectId, portalType: "CONSULTANT" })] });
    const workspace = await f.external.workspace(f.consultantActor, f.projectId);
    expect(workspace.revisions).toHaveLength(2);
    expect(workspace.revisions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: f.revisionId, isCurrent: true }),
      expect.objectContaining({ id: f.cadRevisionId })
    ]));
    expect(JSON.stringify(workspace)).not.toMatch(/cost|price|employee|NAS_ROOT|storageKey|internalSecret/i);
    await expect(f.external.workspace(f.consultantActor, f.foreignProjectId)).rejects.toMatchObject({ status: 403 });
    await expect(f.external.file(f.consultantActor, f.confidentialRevisionId)).rejects.toMatchObject({ status: 403 });
    await expect(f.external.createGrant(f.owner, f.projectId, { email: `confidential-${randomUUID()}@example.test`, portalType: "CONSULTANT", revisionIds: [f.confidentialRevisionId], releaseIds: [], packageIds: [], reason: "Confidential ancestor cannot be granted" })).rejects.toMatchObject({ status: 403 });
    await expect(f.external.createGrant(f.owner, f.projectId, { email: `foreign-${randomUUID()}@example.test`, portalType: "CONSULTANT", revisionIds: [f.foreignRevisionId], releaseIds: [], packageIds: [], reason: "Foreign project revision cannot be granted" })).rejects.toMatchObject({ status: 403 });
    await expect(f.external.createGrant(f.ordinary, f.projectId, { email: `denied-${randomUUID()}@example.test`, portalType: "CONSULTANT", revisionIds: [f.revisionId], releaseIds: [], packageIds: [], reason: "No scoped manager authority" })).rejects.toMatchObject({ status: 403 });
    await expect(f.external.createGrant(f.stranger, f.projectId, { email: `branch-${randomUUID()}@example.test`, portalType: "CONSULTANT", revisionIds: [f.revisionId], releaseIds: [], packageIds: [], reason: "No current branch assignment" })).rejects.toMatchObject({ status: 403 });
    await expect(f.external.createGrant(f.manager, f.projectId, { email: `authorized-manager-${randomUUID()}@example.test`, portalType: "CONSULTANT", revisionIds: [f.revisionId], releaseIds: [], packageIds: [], reason: "Explicit external.manage permission" })).resolves.toHaveProperty("portalType", "CONSULTANT");

    const payload = { grantId: f.consultantGrant.id, kind: "REVIEW", title: "Review drawing", body: "Please confirm dimension at grid A", revisionId: f.revisionId, reason: "Consultant advisory review" };
    const beforeApprovals = await database.prisma.revisionApprovalFact.count({ where: { revisionId: f.revisionId } });
    const beforeRecords = await database.prisma.externalPortalRecord.count({ where: { projectId: f.projectId } });
    await expect(f.external.submit(f.consultantActor, f.projectId, { grantId: f.consultantGrant.id, kind: "COMMENT", title: "Unscoped comment", body: "Must name current exact context", reason: "Comment context is required" }, randomUUID())).rejects.toMatchObject({ status: 400 });
    expect(await database.prisma.externalPortalRecord.count({ where: { projectId: f.projectId } })).toBe(beforeRecords);
    const key = randomUUID();
    const saved = await f.external.submit(f.consultantActor, f.projectId, payload, key);
    const retry = await f.external.submit(f.consultantActor, f.projectId, payload, key);
    expect(retry.id).toBe(saved.id);
    await expect(f.external.submit(f.consultantActor, f.projectId, { ...payload, body: "Different payload" }, key)).rejects.toMatchObject({ status: 409 });
    expect(await database.prisma.externalPortalRecord.count({ where: { idempotencyKey: key, actorId: f.consultant.account.id } })).toBe(1);
    expect(await database.prisma.revisionApprovalFact.count({ where: { revisionId: f.revisionId } })).toBe(beforeApprovals);
    const retainedSubmission = await database.prisma.externalPortalRecord.findUniqueOrThrow({ where: { id: saved.id } });
    await expect(database.prisma.$executeRaw`UPDATE external_portal_records SET body='tampered' WHERE id=${retainedSubmission.id}::uuid`).rejects.toThrow();
    expect((await database.prisma.externalPortalRecord.findUniqueOrThrow({ where: { id: retainedSubmission.id } })).body).toBe(payload.body);
    await expect(f.external.submit(f.vendorActor, f.projectId, { ...payload, grantId: f.vendorGrant.id }, randomUUID())).rejects.toMatchObject({ status: 403 });
    await expect(f.external.submit(f.vendorActor, f.projectId, { ...payload, kind: "PRODUCTION_STATUS", grantId: f.vendorGrant.id, releaseId: f.revisionId }, randomUUID())).rejects.toMatchObject({ status: 403 });

    const invalidOtp = await database.prisma.externalPortalCode.findUniqueOrThrow({ where: { accountId: f.consultant.account.id } });
    expect(invalidOtp.attempts).toBeGreaterThanOrEqual(1);
    const accepted = await f.external.workspace(f.vendorActor, f.projectId);
    expect(accepted.grants).toEqual([expect.objectContaining({ id: f.vendorGrant.id, portalType: "VENDOR_FACTORY" })]);
    await f.identity.revokeSession(f.consultant.account.id, f.consultantActor.sessionId);
    await expect(f.external.projects(f.consultantActor)).rejects.toMatchObject({ status: 403 });
    expect((await database.prisma.externalPortalSession.findUniqueOrThrow({ where: { id: f.consultantActor.sessionId } })).revokedAt).toBeInstanceOf(Date);
    const grantEvidence = await database.prisma.externalPortalHistory.findFirstOrThrow({ where: { subjectId: f.consultantGrant.id } });
    await expect(database.prisma.$executeRaw`UPDATE external_portal_history SET reason='mutated' WHERE id=${grantEvidence.id}::uuid`).rejects.toThrow();
    const unauditedGrantId = randomUUID();
    await expect(database.prisma.$transaction(tx => tx.externalPortalGrant.create({ data: { id: unauditedGrantId, organizationId: f.organizationId, projectId: f.projectId, accountId: f.consultant.account.id, portalType: "CONSULTANT", revisionIds: [f.revisionId], releaseIds: [], packageIds: [], invitedById: f.owner.accountId, reason: "Raw unaudited grant must roll back" } }))).rejects.toThrow();
    expect(await database.prisma.externalPortalGrant.findUnique({ where: { id: unauditedGrantId } })).toBeNull();
  });

  it("enforces upload chunk ownership/checksum/retry, retains finalized advisory bytes and rechecks held-project writes", async () => {
    const f = await fixture(database, nasRoot);
    const bytes = pdfBytes("external advisory upload");
    const started = await f.external.uploadStart(f.consultantActor, f.projectId, { grantId: f.consultantGrant.id, fileName: `submittal-${randomUUID()}.pdf`, mimeType: "application/pdf", sizeBytes: bytes.length, reason: "Consultant uploads supporting evidence" });
    expect(started.chunkSize).toBe(DOCUMENT_CHUNK_SIZE);
    const stagingInventory = await f.documents.reconciliation(f.owner);
    expect(stagingInventory.orphanStageIds).not.toContain(started.uploadId);
    await expect(f.external.uploadChunk(f.consultantActor, started.uploadId, 0, bytes, "0".repeat(64))).rejects.toMatchObject({ status: 400 });
    await expect(f.external.uploadChunk(f.vendorActor, started.uploadId, 0, bytes, hash(bytes))).rejects.toMatchObject({ status: 403 });
    await expect(f.external.uploadFinalize(f.consultantActor, started.uploadId)).rejects.toMatchObject({ status: 409 });
    await f.external.uploadChunk(f.consultantActor, started.uploadId, 0, bytes, hash(bytes));
    await f.external.uploadChunk(f.consultantActor, started.uploadId, 0, bytes, hash(bytes));
    const finalized = await f.external.uploadFinalize(f.consultantActor, started.uploadId);
    expect(finalized).toMatchObject({ id: started.uploadId, sha256: hash(bytes), fileName: expect.stringContaining("submittal-") });
    expect((await f.external.uploadFile(f.consultantActor, started.uploadId)).sizeBytes).toBe(bytes.length);
    await expect(f.external.uploadFile(f.vendorActor, started.uploadId)).rejects.toMatchObject({ status: 403 });
    const row = await database.prisma.externalPortalUpload.findUniqueOrThrow({ where: { id: started.uploadId } });
    expect(row.state).toBe("FINALIZED");
    expect(row.storageKey).not.toContain(f.nasRoot);
    const finalizedInventory = await f.documents.reconciliation(f.owner);
    expect(finalizedInventory.orphanBlobKeys).not.toContain(row.storageKey);
    expect(finalizedInventory.missingBlobKeys).not.toContain(row.storageKey);

    await f.activate("ON_HOLD");
    await expect(f.external.workspace(f.consultantActor, f.projectId)).resolves.toHaveProperty("project.status", "ON_HOLD");
    await expect(f.external.submit(f.consultantActor, f.projectId, { grantId: f.consultantGrant.id, kind: "COMMENT", title: "Held", body: "Attempt on hold", revisionId: f.revisionId, reason: "Hold blocks deliveries" }, randomUUID())).rejects.toMatchObject({ status: 409 });
    expect(await database.prisma.externalPortalRecord.count({ where: { projectId: f.projectId, title: "Held" } })).toBe(0);
  });

  it("issues exact external transmittals, permits only own acknowledgement, and does not grant approval authority", async () => {
    const f = await fixture(database, nasRoot);
    const before = await database.prisma.revisionApprovalFact.count({ where: { revisionId: f.revisionId } });
    await expect(f.revisions.issue(f.owner, f.projectId, { revisionIds: [f.revisionId], recipientAccountIds: [f.vendor.account.id], purpose: "S21 exact external issue", reason: "Issue current approved revision to named vendor", acknowledgementRequired: true })).resolves.toHaveProperty("id");
    const transmission = await database.prisma.drawingTransmittal.findFirstOrThrow({ where: { projectId: f.projectId, purpose: "S21 exact external issue" } });
    const other = await database.prisma.account.create({ data: { normalizedEmail: `s21-not-recipient-${randomUUID()}@example.test`, kind: "EXTERNAL", state: "ACTIVE" } });
    const otherSession = await database.prisma.externalPortalSession.create({ data: { accountId: other.id, tokenHash: hash(Buffer.from(randomUUID())), csrfTokenHash: "0".repeat(64), expiresAt: new Date(Date.now() + 60_000) } });
    await expect(f.external.acknowledge({ accountId: other.id, sessionId: otherSession.id }, transmission.id, { note: "Not my transmittal", reason: "Wrong external recipient" })).rejects.toMatchObject({ status: 403 });
    const acknowledged = await f.external.acknowledge(f.vendorActor, transmission.id, { note: "Received revision R0", reason: "Named vendor acknowledges transmittal" });
    expect(acknowledged.acknowledgedAt).toBeInstanceOf(Date);
    expect(await database.prisma.transmittalRecipient.findUniqueOrThrow({ where: { transmittalId_accountId: { transmittalId: transmission.id, accountId: f.vendor.account.id } } })).toMatchObject({ acknowledgedAt: expect.any(Date), note: "Received revision R0" });
    expect(await database.prisma.revisionApprovalFact.count({ where: { revisionId: f.revisionId } })).toBe(before);
  });

  it("hides retained submissions when their exact revision leaves the current grant", async () => {
    const f = await fixture(database, nasRoot);
    const submitted = await f.external.submit(f.consultantActor, f.projectId, { grantId: f.consultantGrant.id, kind: "REVIEW", title: "Review while scoped", body: "This record remains in the staff ledger after scope narrows", revisionId: f.revisionId, reason: "Record under current exact drawing grant" }, randomUUID());
    expect((await f.external.workspace(f.consultantActor, f.projectId)).submissions).toEqual([expect.objectContaining({ id: submitted.id, revisionId: f.revisionId })]);
    const currentGrant = await database.prisma.externalPortalGrant.findUniqueOrThrow({ where: { id: f.consultantGrant.id } });
    await f.external.changeGrant(f.owner, currentGrant.id, { expectedVersion: currentGrant.version, revisionIds: [f.cadRevisionId], reason: "Narrow current grant away from prior drawing" });
    expect(await database.prisma.externalPortalRecord.findUniqueOrThrow({ where: { id: submitted.id } })).toMatchObject({ id: submitted.id, revisionId: f.revisionId, body: "This record remains in the staff ledger after scope narrows" });
    expect((await f.external.workspace(f.consultantActor, f.projectId)).submissions).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: submitted.id })]));
    expect((await f.external.staffWorkspace(f.owner, f.projectId)).submissions).toEqual(expect.arrayContaining([expect.objectContaining({ id: submitted.id, revisionId: f.revisionId })]));
  });

  it("keeps staff options least-privilege and rechecks internal session after normalized-email lock wait", async () => {
    const f = await fixture(database, nasRoot);
    const limitedAccount = await database.prisma.account.create({ data: { normalizedEmail: `s21-options-only-${randomUUID()}@example.test`, kind: "STAFF", state: "ACTIVE" } });
    const homeTeam = await database.prisma.team.findFirstOrThrow({ where: { branchId: f.branchId } });
    const limitedEmployee = await database.prisma.employee.create({ data: { organizationId: f.organizationId, accountId: limitedAccount.id, homeBranchId: f.branchId, homeTeamId: homeTeam.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
    await database.prisma.employeePermissionOverride.createMany({ data: ["project.view", "external.manage"].map(permissionKey => ({ organizationId: f.organizationId, employeeId: limitedEmployee.id, permissionKey, effect: "ALLOW" as const, scopeKind: "BRANCH" as const, branchId: f.branchId, reason: "Minimal S21 external management option fixture" })) });
    await f.workflows.assignment(f.owner, f.projectId, { employeeId: limitedEmployee.id, expectedVersion: (await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } })).version, reason: "Assign minimal external manager" });
    const limitedActor: ProjectActor = { accountId: limitedAccount.id, organizationId: f.organizationId, kind: "STAFF" };
    const emptyOptions = await f.external.staffWorkspace(limitedActor, f.projectId);
    expect(emptyOptions).toMatchObject({ revisionOptions: [], releaseOptions: [], packageOptions: [] });
    const grantCount = await database.prisma.externalPortalGrant.count({ where: { projectId: f.projectId } });
    await expect(f.external.createGrant(limitedActor, f.projectId, { email: `s21-forbidden-selected-${randomUUID()}@example.test`, portalType: "CONSULTANT", revisionIds: [f.revisionId], releaseIds: [], packageIds: [], reason: "Selected drawing still needs its owning DOC permission" })).rejects.toMatchObject({ status: 403 });
    expect(await database.prisma.externalPortalGrant.count({ where: { projectId: f.projectId } })).toBe(grantCount);

    const email = `s21-session-lock-${randomUUID()}@example.test`;
    const now = new Date();
    const session = await database.prisma.session.create({ data: { accountId: f.manager.accountId, tokenHash: randomUUID().replaceAll("-", "").padEnd(64, "0"), csrfTokenHash: "2".repeat(64), createdAt: now, lastUsedAt: now, expiresAt: new Date(now.getTime() + 1_500) } });
    let locked!: () => void;
    let release!: () => void;
    const lockReady = new Promise<void>(resolve => { locked = resolve; });
    const lockRelease = new Promise<void>(resolve => { release = resolve; });
    const blocker = database.prisma.$transaction(async tx => { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))`; locked(); await lockRelease; });
    await Promise.race([lockReady, blocker.then(() => { throw new Error("Email advisory-lock blocker completed before signaling readiness"); })]);
    const pending = f.external.createGrant({ ...f.manager, sessionId: session.id }, f.projectId, { email, portalType: "CONSULTANT", revisionIds: [f.revisionId], releaseIds: [], packageIds: [], reason: "Expired staff session cannot invite after email lock wait" });
    try {
      let waiting = false;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const rows = await database.prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query ILIKE '%pg_advisory_xact_lock%') AS waiting`;
        if (rows[0]?.waiting) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      expect(waiting).toBe(true);
      await new Promise(resolve => setTimeout(resolve, Math.max(0, session.expiresAt.getTime() - Date.now() + 50)));
      release();
      await expect(pending).rejects.toMatchObject({ status: 403 });
      expect(await database.prisma.account.findUnique({ where: { normalizedEmail: email } })).toBeNull();
    } finally { release(); await blocker; }
  });

  it("keeps vendor production context exact, advisory, redacted and invalidated after release replacement", async () => {
    const f = await fixture(database, nasRoot);
    const makeReleased = async (replacesReleaseId?: string) => {
      const created = await f.turnkey.create(f.owner, f.projectId, {
        revisionIds: [f.revisionId], lines: [{ key: "cabinetry", description: "Factory cabinet set", quantity: "2.00", unit: "set" }],
        prices: [{ key: "cabinetry", unitPrice: "42.50" }], currency: "INR", reason: "Create exact approved factory inputs",
        ...(replacesReleaseId ? { replacesReleaseId, changeReason: "Approved design input update for vendor scope" } : {})
      });
      const pendingCost = await f.turnkey.request(f.owner, created.id, "cost", { expectedVersion: created.version, approverAccountId: f.manager.accountId, reason: "Request separate cost approval" });
      const costApproved = await f.turnkey.decide(f.manager, created.id, "cost", { expectedVersion: pendingCost.version, outcome: "APPROVED", reason: "Approve cost as assigned reviewer" });
      const materials = await f.turnkey.materials(f.owner, created.id, { expectedVersion: costApproved.version, selections: [{ lineKey: "cabinetry", material: "Oak veneer" }], reason: "Select released factory material" });
      const pendingProcurement = await f.turnkey.request(f.owner, created.id, "procurement", { expectedVersion: materials.version, approverAccountId: f.manager.accountId, reason: "Request separate procurement approval" });
      const released = await f.turnkey.decide(f.manager, created.id, "procurement", { expectedVersion: pendingProcurement.version, outcome: "APPROVED", reason: "Approve exact procurement inputs" });
      expect(released.state).toBe("RELEASED");
      return released.id;
    };
    const firstReleaseId = await makeReleased();
    const packageBefore = await f.site.detail(f.lead, f.projectId);
    const packageRow = await f.site.createPackage(f.lead, f.projectId, { expectedVersion: packageBefore.version, title: "Assembly batch A", date: "2026-10-04", tomorrowPlan: "Inspect factory pack", plannedPercent: "0", plannedQuantity: "1", unit: "batch", critical: false, releaseId: firstReleaseId, reason: "Link named work package to approved production" });
    const vendorScopedGrant = await f.external.createGrant(f.manager, f.projectId, { email: f.vendorEmail, portalType: "VENDOR_FACTORY", revisionIds: [], releaseIds: [firstReleaseId], packageIds: [packageRow.id], reason: "Grant named vendor exact release and package context" });
    await expect(f.external.createGrant(f.manager, f.projectId, { email: `ungranted-release-${randomUUID()}@example.test`, portalType: "VENDOR_FACTORY", revisionIds: [], releaseIds: [randomUUID()], packageIds: [], reason: "A release title or random ID grants nothing" })).rejects.toMatchObject({ status: 403 });
    await expect(f.external.createGrant(f.manager, f.projectId, { email: `foreign-package-${randomUUID()}@example.test`, portalType: "VENDOR_FACTORY", revisionIds: [], releaseIds: [], packageIds: [randomUUID()], reason: "A package ID from outside this project grants nothing" })).rejects.toMatchObject({ status: 403 });

    const releaseBefore = await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: firstReleaseId } });
    const packageRowBefore = await database.prisma.siteRecord.findUniqueOrThrow({ where: { id: packageRow.id } });
    const advisory = await f.external.submit(f.vendorActor, f.projectId, { grantId: vendorScopedGrant.id, kind: "PRODUCTION_STATUS", title: "Packing progress", body: "Two cabinets are ready for inspection", releaseId: firstReleaseId, packageId: packageRow.id, reason: "Vendor reports advisory factory status" }, randomUUID());
    expect(advisory).toMatchObject({ kind: "PRODUCTION_STATUS", releaseId: firstReleaseId, packageId: packageRow.id });
    const releaseAfter = await database.prisma.turnkeyRelease.findUniqueOrThrow({ where: { id: firstReleaseId } });
    const packageRowAfter = await database.prisma.siteRecord.findUniqueOrThrow({ where: { id: packageRow.id } });
    expect(releaseAfter).toMatchObject({ version: releaseBefore.version, state: releaseBefore.state, factoryStatus: releaseBefore.factoryStatus, procurementStatus: releaseBefore.procurementStatus });
    expect(packageRowAfter).toMatchObject({ version: packageRowBefore.version, state: packageRowBefore.state, data: packageRowBefore.data });

    const visible = await f.external.workspace(f.vendorActor, f.projectId);
    expect(visible.production).toEqual([expect.objectContaining({ id: firstReleaseId, requirements: expect.objectContaining({ lines: expect.any(Array), materials: expect.any(Array) }) })]);
    expect(visible.packages).toEqual([expect.objectContaining({ id: packageRow.id, title: "Assembly batch A" })]);
    expect(JSON.stringify(visible)).not.toMatch(/prices|unitPrice|"total"|42\.50|employee|NAS_ROOT|internalSecret/i);
    await expect(f.external.submit(f.consultantActor, f.projectId, { grantId: f.consultantGrant.id, kind: "PRODUCTION_STATUS", title: "Wrong persona", body: "Consultant cannot report factory status", releaseId: firstReleaseId, reason: "Wrong external persona" }, randomUUID())).rejects.toMatchObject({ status: 403 });
    await expect(f.external.submit(f.vendorActor, f.projectId, { grantId: f.vendorGrant.id, kind: "PRODUCTION_STATUS", title: "Unscoped release", body: "Existing drawing grant has no production scope", releaseId: firstReleaseId, reason: "No exact release grant" }, randomUUID())).rejects.toMatchObject({ status: 403 });

    const replacementId = await makeReleased(firstReleaseId);
    const currentVendorGrant = await f.external.createGrant(f.manager, f.projectId, { email: f.vendorEmail, portalType: "VENDOR_FACTORY", revisionIds: [], releaseIds: [replacementId], packageIds: [packageRow.id], reason: "Update named vendor to replacement inputs" });
    const afterReplacement = await f.external.workspace(f.vendorActor, f.projectId);
    expect(afterReplacement.production).toEqual([expect.objectContaining({ id: replacementId })]);
    await expect(f.external.submit(f.vendorActor, f.projectId, { grantId: vendorScopedGrant.id, kind: "PRODUCTION_STATUS", title: "Stale release", body: "Old production inputs cannot receive new status", releaseId: firstReleaseId, reason: "Replacement invalidates old context" }, randomUUID())).rejects.toMatchObject({ status: 409 });
    expect(currentVendorGrant.releaseIds).toEqual([replacementId]);
  });

  it("removes only the expired grant after production and exact-file lock waits", async () => {
    const f = await fixture(database, nasRoot);
    const makeReleased = async () => {
      const created = await f.turnkey.create(f.owner, f.projectId, {
        revisionIds: [f.revisionId], lines: [{ key: "expiry-item", description: "Expiry acceptance item", quantity: "1.00", unit: "set" }],
        prices: [{ key: "expiry-item", unitPrice: "10.00" }], currency: "INR", reason: "Create exact release for multi-grant expiry acceptance"
      });
      const pendingCost = await f.turnkey.request(f.owner, created.id, "cost", { expectedVersion: created.version, approverAccountId: f.manager.accountId, reason: "Request cost review for expiry acceptance" });
      const costApproved = await f.turnkey.decide(f.manager, created.id, "cost", { expectedVersion: pendingCost.version, outcome: "APPROVED", reason: "Approve expiry acceptance cost inputs" });
      const materials = await f.turnkey.materials(f.owner, created.id, { expectedVersion: costApproved.version, selections: [{ lineKey: "expiry-item", material: "Oak" }], reason: "Select exact expiry acceptance material" });
      const pendingProcurement = await f.turnkey.request(f.owner, created.id, "procurement", { expectedVersion: materials.version, approverAccountId: f.manager.accountId, reason: "Request procurement review for expiry acceptance" });
      return (await f.turnkey.decide(f.manager, created.id, "procurement", { expectedVersion: pendingProcurement.version, outcome: "APPROVED", reason: "Approve exact expiry acceptance release" })).id;
    };

    const original = await database.prisma.externalPortalGrant.findUniqueOrThrow({ where: { id: f.consultantGrant.id } });
    await f.external.changeGrant(f.owner, original.id, { expectedVersion: original.version, revoke: true, reason: "Isolate current multi-grant expiry fixture" });
    const permanent = await f.external.createGrant(f.owner, f.projectId, { email: f.consultantEmail, portalType: "CONSULTANT", revisionIds: [f.cadRevisionId], releaseIds: [], packageIds: [], reason: "Permanent unrelated CAD grant must remain active" });
    const native = await f.external.issueCad(f.owner, f.projectId, { grantId: permanent.id, revisionId: f.cadRevisionId, nativeLinkId: "miniscloud-permanent-grant-expiry", url: "https://share.example.test/permanent-expiry", extractionCode: "S21-permanent-grant", expectedGrantVersion: permanent.version, reason: "Keep native metadata visible under unrelated permanent scope" });
    const releaseId = await makeReleased();
    const finiteExpiry = new Date(Date.now() + 3_000);
    await f.external.createGrant(f.owner, f.projectId, { email: f.consultantEmail, portalType: "VENDOR_FACTORY", revisionIds: [f.revisionId], releaseIds: [releaseId], packageIds: [], expiresAt: finiteExpiry.toISOString(), reason: "Temporary exact drawing and production access" });

    let locked!: () => void;
    let release!: () => void;
    const lockReady = new Promise<void>((resolve) => { locked = resolve; });
    const lockRelease = new Promise<void>((resolve) => { release = resolve; });
    const blocker = database.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM turnkey_releases WHERE id=${releaseId}::uuid FOR UPDATE`;
      locked();
      await lockRelease;
    });
    await lockReady;
    let workspaceWaiting = false;
    try {
      const pending = f.external.workspace(f.consultantActor, f.projectId);
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const rows = await database.prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query ILIKE '%turnkey_releases%' AND query ILIKE '%FOR SHARE%') AS waiting`;
        if (rows[0]?.waiting) { workspaceWaiting = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(workspaceWaiting).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, finiteExpiry.getTime() - Date.now() + 100)));
      release();
      const workspace = await pending;
      expect(workspace.grants.map(row => row.id)).toEqual([permanent.id]);
      expect(workspace.revisions.map(row => row.id)).toEqual([f.cadRevisionId]);
      expect(workspace.production).toEqual([]);
      expect(workspace.packages).toEqual([]);
      expect(workspace.cadShares).toEqual([expect.objectContaining({ id: native.id, revisionId: f.cadRevisionId })]);
    } finally {
      release();
      await blocker;
    }

    const fileExpiry = new Date(Date.now() + 3_000);
    await f.external.createGrant(f.owner, f.projectId, { email: f.consultantEmail, portalType: "CONSULTANT", revisionIds: [f.revisionId], releaseIds: [], packageIds: [], expiresAt: fileExpiry.toISOString(), reason: "Temporary exact file access for late lock recheck" });
    let metadataLocked!: () => void;
    let releaseMetadata!: () => void;
    const metadataLockReady = new Promise<void>((resolve) => { metadataLocked = resolve; });
    const metadataLockRelease = new Promise<void>((resolve) => { releaseMetadata = resolve; });
    const metadataBlocker = database.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`LOCK TABLE file_blob_metadata IN ACCESS EXCLUSIVE MODE`;
      metadataLocked();
      await metadataLockRelease;
    });
    await Promise.race([metadataLockReady, metadataBlocker.then(() => { throw new Error("Metadata blocker completed before signaling readiness"); })]);
    let fileWaiting = false;
    try {
      const pending = f.external.file(f.consultantActor, f.revisionId);
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const rows = await database.prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query ILIKE '%file_blob_metadata%' AND query ILIKE '%SELECT%') AS waiting`;
        if (rows[0]?.waiting) { fileWaiting = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(fileWaiting).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, fileExpiry.getTime() - Date.now() + 100)));
      releaseMetadata();
      await expect(pending).rejects.toMatchObject({ status: 403 });
    } finally {
      releaseMetadata();
      await metadataBlocker;
    }
    const remaining = await f.external.workspace(f.consultantActor, f.projectId);
    expect(remaining.grants.map(row => row.id)).toEqual([permanent.id]);
    expect(remaining.revisions.map(row => row.id)).toEqual([f.cadRevisionId]);
  });

  it("keeps native CAD Owner-only, encrypted and redacted; blocks cancellation until confirmed native revocation and allows bounded closeout", async () => {
    const f = await fixture(database, nasRoot);
    const nonOwner = { ...f.lead, sessionId: undefined };
    const expectedGrantVersion = f.consultantGrant.version;
    await expect(f.external.issueCad(nonOwner, f.projectId, { grantId: f.consultantGrant.id, revisionId: f.cadRevisionId, nativeLinkId: "miniscloud-test-1", url: "https://share.example.test/native", extractionCode: "S21-secret-code", expectedGrantVersion, reason: "Lead cannot issue native CAD" })).rejects.toMatchObject({ status: 403 });
    const rawPdfShareId = randomUUID();
    const issueTime = new Date();
    await expect(database.prisma.externalCadShare.create({ data: { id: rawPdfShareId, organizationId: f.organizationId, projectId: f.projectId, grantId: f.consultantGrant.id, revisionId: f.revisionId, nativeLinkId: "raw-pdf-must-be-rejected", encryptedSecret: "test-only-unpersisted", issuedById: f.owner.accountId, issuedAt: issueTime, expiresAt: new Date(issueTime.getTime() + 7 * 86_400_000), reason: "Database guard must reject non-CAD native share" } })).rejects.toThrow(/exact CAD revision/i);
    expect(await database.prisma.externalCadShare.findUnique({ where: { id: rawPdfShareId } })).toBeNull();
    const issued = await f.external.issueCad(f.owner, f.projectId, { grantId: f.consultantGrant.id, revisionId: f.cadRevisionId, nativeLinkId: "miniscloud-test-1", url: "https://share.example.test/native", extractionCode: "S21-secret-code", expectedGrantVersion, reason: "Owner records exact seven-day CAD share" });
    const secondIssued = await f.external.issueCad(f.owner, f.projectId, { grantId: f.consultantGrant.id, revisionId: f.cadRevisionId, nativeLinkId: "miniscloud-test-2", url: "https://share.example.test/native-2", extractionCode: "S21-second-secret", expectedGrantVersion, reason: "Create second native notice race fixture" });
    expect(issued.expiresAt.getTime() - Date.now()).toBeGreaterThan(6 * 86_400_000);
    expect(issued.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(7 * 86_400_000);
    const stored = await database.prisma.externalCadShare.findUniqueOrThrow({ where: { id: issued.id } });
    expect(stored.encryptedSecret).not.toContain("share.example.test");
    expect(stored.encryptedSecret).not.toContain("S21-secret-code");
    const staffView = await f.external.staffWorkspace(f.owner, f.projectId);
    expect(JSON.stringify(staffView)).not.toContain("S21-secret-code");
    expect(JSON.stringify(staffView)).not.toContain("share.example.test");
    await expect(f.external.file(f.consultantActor, f.cadRevisionId)).rejects.toMatchObject({ status: 403 });
    expect(await f.external.cadShare(f.consultantActor, issued.id)).toMatchObject({ url: "https://share.example.test/native", extractionCode: "S21-secret-code" });

    const worker = new NotificationWorker(database, { send: async () => undefined } as never, new PersistedVerifiedAddressPredicate(database), new OperationalRecipientPredicate(database, f.authorization, f.tasks), config);
    const runOnlyOutboxEvent = async (eventId: string) => {
      const delivery = await database.prisma.outboxDelivery.findUniqueOrThrow({ where: { eventId_consumer: { eventId, consumer: "NTF" } } });
      await database.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM outbox_deliveries WHERE id<>${delivery.id}::uuid FOR UPDATE`;
        expect(await worker.runBatch()).toBe(1);
      });
    };
    for (const shareId of [issued.id, secondIssued.id]) {
      const issuance = await database.prisma.externalPortalHistory.findUniqueOrThrow({ where: { subjectId_subjectVersion: { subjectId: shareId, subjectVersion: 1 } } });
      await runOnlyOutboxEvent(issuance.eventId);
      expect((await database.prisma.outboxDelivery.findUniqueOrThrow({ where: { eventId_consumer: { eventId: issuance.eventId, consumer: "NTF" } } })).state).toBe("DELIVERED");
    }

    const beforeProject = await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } });
    await expect(f.tasks.cancelProject(f.owner, f.projectId, { expectedVersion: beforeProject.version, reason: "Cancellation waits for native link revocation" })).rejects.toMatchObject({ status: 409, response: expect.objectContaining({ nativeLinkBlockers: expect.arrayContaining([expect.objectContaining({ id: issued.id, nativeLinkId: "miniscloud-test-1" }), expect.objectContaining({ id: secondIssued.id, nativeLinkId: "miniscloud-test-2" })]) }) });
    const blockers = (await f.external.staffWorkspace(f.owner, f.projectId)).cadShares;
    expect(blockers).toEqual(expect.arrayContaining([expect.objectContaining({ id: issued.id, revocationRequired: false }), expect.objectContaining({ id: secondIssued.id, revocationRequired: false })]));
    expect(JSON.stringify(blockers)).not.toContain("S21-secret-code");
    const currentGrant = await database.prisma.externalPortalGrant.findUniqueOrThrow({ where: { id: f.consultantGrant.id } });
    await f.external.changeGrant(f.owner, currentGrant.id, { expectedVersion: currentGrant.version, revoke: true, reason: "Revoke grant while native link still exists" });
    const noticeOne = await database.prisma.notification.findFirstOrThrow({ where: { recipientAccountId: f.owner.accountId, category: "external.native_revocation", internalRoute: { contains: issued.id }, mandatory: true, critical: true } });
    const noticeTwo = await database.prisma.notification.findFirstOrThrow({ where: { recipientAccountId: f.owner.accountId, category: "external.native_revocation", internalRoute: { contains: secondIssued.id }, mandatory: true, critical: true } });
    expect(noticeOne).toMatchObject({ title: "Native CAD link requires cancellation", body: expect.stringContaining("Cancel the active native link") });
    await runOnlyOutboxEvent(noticeOne.eventId);
    expect((await database.prisma.notification.findUniqueOrThrow({ where: { id: noticeOne.id } })).deliveryState).toBe("DELIVERED");
    const noticeShare = await database.prisma.externalCadShare.findUniqueOrThrow({ where: { id: secondIssued.id } });
    await f.external.revokeCad(f.owner, secondIssued.id, { expectedVersion: noticeShare.version, confirmation: "Native link removed before notice delivery", reason: "Ensure stale native notices do not reach Owner inbox" });
    await runOnlyOutboxEvent(noticeTwo.eventId);
    expect(await database.prisma.notification.findUniqueOrThrow({ where: { id: noticeTwo.id } })).toMatchObject({ deliveryState: "DEAD", failureCode: "recipient_not_authorized" });
    const pendingAfterLoss = (await f.external.staffWorkspace(f.owner, f.projectId)).cadShares;
    expect(pendingAfterLoss).toEqual(expect.arrayContaining([expect.objectContaining({ id: issued.id, revocationRequired: true })]));
    expect(JSON.stringify(pendingAfterLoss)).not.toContain("S21-secret-code");
    expect((await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } })).status).toBe("ACTIVE");
    const revoked = await f.external.revokeCad(f.owner, issued.id, { expectedVersion: issued.version, confirmation: "Native cancellation confirmed by Owner", reason: "Retain confirmed native revocation" });
    expect(revoked.revokedAt).toBeInstanceOf(Date);
    const currentProject = await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } });
    await f.tasks.cancelProject(f.owner, f.projectId, { expectedVersion: currentProject.version, reason: "Finalize project cancellation after link cancellation" });
    expect((await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } })).status).toBe("CANCELLED");
    expect((await database.prisma.externalPortalGrant.findMany({ where: { projectId: f.projectId, closeoutTaskId: null } })).every(row => row.revokedAt)).toBe(true);
    await expect(f.external.workspace(f.consultantActor, f.projectId)).rejects.toMatchObject({ status: 403 });

    const closeout = await f.tasks.createCloseout(f.lead, { projectId: f.projectId, ownerEmployeeId: f.leadEmployeeId, title: "S21 remaining access closeout", workScope: "Collect named outstanding model reference", targetDate: "2026-10-10", priority: TaskPriority.MEDIUM, reason: "Create narrowly approved closeout task" });
    const completionCloseout = await f.tasks.createCloseout(f.lead, { projectId: f.projectId, ownerEmployeeId: f.leadEmployeeId, title: "S21 completed access closeout", workScope: "Finish a separate approved bounded task", targetDate: "2026-10-11", priority: TaskPriority.MEDIUM, reason: "Create distinct completion fixture closeout task" });
    const closeoutEmail = `s21-closeout-${randomUUID()}@example.test`;
    const closeoutGrant = await f.external.createGrant(f.lead, f.projectId, { email: closeoutEmail, portalType: "CONSULTANT", revisionIds: [f.revisionId], releaseIds: [], packageIds: [], expiresAt: new Date(Date.now() + 86_400_000).toISOString(), closeoutTaskId: closeout.id, reason: "Grant finite named closeout access" });
    const completedEmail = `s21-completion-${randomUUID()}@example.test`;
    const completedGrant = await f.external.createGrant(f.lead, f.projectId, { email: completedEmail, portalType: "CONSULTANT", revisionIds: [f.revisionId], releaseIds: [], packageIds: [], expiresAt: new Date(Date.now() + 86_400_000).toISOString(), closeoutTaskId: completionCloseout.id, reason: "Grant second finite closeout access" });
    const closeoutCode: string[] = [];
    const closeoutIdentity = new ExternalPortalIdentityService(database, { send: async (_email, message) => { const code = message.textContent.match(/code is (\d{6})/)?.[1]; if (code) closeoutCode.push(code); } } as unknown as BrevoEmailAdapter, config);
    await closeoutIdentity.requestCode(closeoutEmail);
    const closeoutLogin = await closeoutIdentity.verifyCode(closeoutEmail, closeoutCode[0]!);
    const closeoutActive = await closeoutIdentity.session(closeoutLogin.secret);
    const closeoutSession = await database.prisma.externalPortalSession.findFirstOrThrow({ where: { accountId: closeoutGrant.accountId, revokedAt: null }, orderBy: { createdAt: "desc" } });
    const closeoutActor = { accountId: closeoutActive.account.id, sessionId: closeoutSession.id };
    await expect(f.external.workspace(closeoutActor, f.projectId)).resolves.toHaveProperty("project.status", "CANCELLED");
    await expect(f.external.submit(closeoutActor, f.projectId, { grantId: closeoutGrant.id, kind: "COMMENT", title: "Closeout context", body: "Remaining named work", revisionId: f.revisionId, reason: "Submit in approved closeout" }, randomUUID())).resolves.toHaveProperty("kind", "COMMENT");
    await f.tasks.revokeCloseout(f.owner, closeout.id, "Closeout permission is revoked");
    await expect(f.external.workspace(closeoutActor, f.projectId)).rejects.toMatchObject({ status: 403 });
    expect((await database.prisma.externalPortalGrant.findUniqueOrThrow({ where: { id: closeoutGrant.id } })).revokedAt).toBeNull();
    await expect(f.external.createGrant(f.stranger, f.projectId, { email: `no-closeout-${randomUUID()}@example.test`, portalType: "CONSULTANT", revisionIds: [f.revisionId], releaseIds: [], packageIds: [], expiresAt: new Date(Date.now() + 86_400_000).toISOString(), closeoutTaskId: closeout.id, reason: "Unassigned cannot authorize closeout" })).rejects.toMatchObject({ status: 403 });
    const completionCodes = new Map<string, string>();
    const completionIdentity = new ExternalPortalIdentityService(database, { send: async (email, message) => { const code = message.textContent.match(/code is (\d{6})/)?.[1]; if (code) completionCodes.set(email, code); } } as unknown as BrevoEmailAdapter, config);
    await completionIdentity.requestCode(completedEmail);
    const completionSecret = await completionIdentity.verifyCode(completedEmail, completionCodes.get(completedEmail)!);
    const completionSession = await database.prisma.externalPortalSession.findFirstOrThrow({ where: { accountId: completedGrant.accountId, revokedAt: null }, orderBy: { createdAt: "desc" } });
    const completionActor = { accountId: completedGrant.accountId, sessionId: completionSession.id };
    const startedTask = await f.tasks.transition(f.lead, completionCloseout.id, { expectedVersion: completionCloseout.version, toState: "IN_PROGRESS", reason: "Start approved closeout work" });
    await f.tasks.transition(f.lead, completionCloseout.id, { expectedVersion: startedTask.version, toState: "COMPLETED", reason: "Complete approved closeout work" });
    await expect(f.external.workspace(completionActor, f.projectId)).rejects.toMatchObject({ status: 403 });
    await expect(completionIdentity.session(completionSecret.secret)).rejects.toMatchObject({ status: 401 });
  });

  it("serializes native issuance behind final project cancellation", async () => {
    const f = await fixture(database, nasRoot);
    const before = await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } });
    let locked!: () => void;
    let release!: () => void;
    const lockReady = new Promise<void>((resolve) => { locked = resolve; });
    const lockRelease = new Promise<void>((resolve) => { release = resolve; });
    const blocker = database.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM projects WHERE id=${f.projectId}::uuid FOR UPDATE`;
      locked();
      await lockRelease;
    });
    await lockReady;
    const cancellation = f.tasks.cancelProject(f.owner, f.projectId, { expectedVersion: before.version, reason: "Serialize cancellation ahead of native issuance" }).then(
      value => ({ status: "fulfilled" as const, value }), error => ({ status: "rejected" as const, reason: error })
    );
    let cancellationWaiting = false;
    try {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const rows = await database.prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query ILIKE '%projects%' AND query ILIKE '%FOR UPDATE%') AS waiting`;
        if (rows[0]?.waiting) { cancellationWaiting = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(cancellationWaiting).toBe(true);
      const issuance = f.external.issueCad(f.owner, f.projectId, { grantId: f.consultantGrant.id, revisionId: f.cadRevisionId, nativeLinkId: "miniscloud-race-test", url: "https://share.example.test/race", extractionCode: "S21-race-code", expectedGrantVersion: f.consultantGrant.version, reason: "Concurrent native issuance serializes against cancellation" }).then(
        value => ({ status: "fulfilled" as const, value }), error => ({ status: "rejected" as const, reason: error })
      );
      release();
      const [cancelResult, issueResult] = await Promise.all([cancellation, issuance]);
      const racedShare = await database.prisma.externalCadShare.findFirst({ where: { projectId: f.projectId, nativeLinkId: "miniscloud-race-test" } });
      if (cancelResult.status === "fulfilled") {
        expect(issueResult.status).toBe("rejected");
        expect(issueResult.status === "rejected" ? issueResult.reason : undefined).toMatchObject({ status: 403 });
        expect(racedShare).toBeNull();
        expect((await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } })).status).toBe("CANCELLED");
      } else {
        expect(cancelResult.reason).toMatchObject({ status: 409 });
        expect(issueResult.status).toBe("fulfilled");
        expect(racedShare).toMatchObject({ id: issueResult.status === "fulfilled" ? issueResult.value.id : "", revokedAt: null });
        const afterRace = await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } });
        expect(afterRace.status).toBe("ACTIVE");
        const share = await database.prisma.externalCadShare.findUniqueOrThrow({ where: { id: racedShare!.id } });
        await f.external.revokeCad(f.owner, share.id, { expectedVersion: share.version, confirmation: "Native race link removed", reason: "Resolve the winning issuance before final cancellation" });
        await f.tasks.cancelProject(f.owner, f.projectId, { expectedVersion: (await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } })).version, reason: "Finalize cancellation after race link revocation" });
        expect((await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId } })).status).toBe("CANCELLED");
      }
    } finally {
      release();
      await cancellation;
      await blocker;
    }
  });

  it("rechecks exact grant scope and version after native issuance waits for the project lock", async () => {
    const f = await fixture(database, nasRoot);
    let locked!: () => void;
    let release!: () => void;
    const lockReady = new Promise<void>((resolve) => { locked = resolve; });
    const lockRelease = new Promise<void>((resolve) => { release = resolve; });
    const blocker = database.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM projects WHERE id=${f.projectId}::uuid FOR UPDATE`;
      locked();
      await lockRelease;
    });
    await lockReady;
    const grant = await database.prisma.externalPortalGrant.findUniqueOrThrow({ where: { id: f.consultantGrant.id } });
    const changed = f.external.changeGrant(f.owner, grant.id, { expectedVersion: grant.version, revisionIds: [f.revisionId], reason: "Remove CAD while issuance waits" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const issuance = f.external.issueCad(f.owner, f.projectId, { grantId: grant.id, revisionId: f.cadRevisionId, nativeLinkId: "miniscloud-stale-scope-test", url: "https://share.example.test/stale", extractionCode: "S21-stale-code", expectedGrantVersion: grant.version, reason: "Stale grant cannot issue native link" });
    release();
    try {
      await changed;
      await expect(issuance).rejects.toMatchObject({ status: 403 });
      expect(await database.prisma.externalCadShare.count({ where: { projectId: f.projectId, nativeLinkId: "miniscloud-stale-scope-test" } })).toBe(0);
    } finally {
      release();
      await blocker;
    }
  });

  it("does not return native credentials when Owner revocation wins the share lock", async () => {
    const f = await fixture(database, nasRoot);
    const issued = await f.external.issueCad(f.owner, f.projectId, { grantId: f.consultantGrant.id, revisionId: f.cadRevisionId, nativeLinkId: "miniscloud-retrieval-race", url: "https://share.example.test/retrieval-race", extractionCode: "S21-never-return-after-revoke", expectedGrantVersion: f.consultantGrant.version, reason: "Create native retrieval race fixture" });
    let locked!: () => void;
    let release!: () => void;
    const lockReady = new Promise<void>((resolve) => { locked = resolve; });
    const lockRelease = new Promise<void>((resolve) => { release = resolve; });
    const blocker = database.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM external_cad_shares WHERE id=${issued.id}::uuid FOR UPDATE`;
      locked();
      await lockRelease;
    });
    await lockReady;
    const revocation = f.external.revokeCad(f.owner, issued.id, { expectedVersion: issued.version, confirmation: "Native link removed in MinisCloud", reason: "Owner records native revocation before retrieval resumes" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const retrieval = f.external.cadShare(f.consultantActor, issued.id);
    release();
    try {
      await revocation;
      await expect(retrieval).rejects.toMatchObject({ status: 403 });
    } finally {
      release();
      await blocker;
    }
  });

  it("extends real external issue eligibility only to current exact grants and denies expired session material", async () => {
    const f = await fixture(database, nasRoot);
    const before = await database.prisma.externalPortalRecord.count({ where: { projectId: f.projectId } });
    const session = await database.prisma.externalPortalSession.findUniqueOrThrow({ where: { id: f.consultantActor.sessionId } });
    await database.prisma.$executeRaw`UPDATE external_portal_sessions SET "createdAt" = clock_timestamp() - interval '2 days', "expiresAt" = clock_timestamp() - interval '1 day' WHERE id = ${session.id}::uuid`;
    await expect(f.external.submit(f.consultantActor, f.projectId, { grantId: f.consultantGrant.id, kind: "COMMENT", title: "Expired session", body: "Must not be retained", revisionId: f.revisionId, reason: "Expired exact session" }, randomUUID())).rejects.toMatchObject({ status: 403 });
    expect(await database.prisma.externalPortalRecord.count({ where: { projectId: f.projectId } })).toBe(before);
    const grant = await database.prisma.externalPortalGrant.findUniqueOrThrow({ where: { id: f.consultantGrant.id } });
    // Test the valid and expired states explicitly; a short wall-clock window races slow CI queries.
    const [{ expiresAt }] = await database.prisma.$queryRaw<Array<{ expiresAt: Date }>>`SELECT clock_timestamp() + interval '1 day' AS "expiresAt"`;
    await f.external.changeGrant(f.owner, grant.id, { expectedVersion: grant.version, expiresAt: expiresAt.toISOString(), reason: "Set future external access expiry" });
    expect(await database.prisma.$queryRaw<Array<{ usable: boolean }>>`SELECT s21_grant_usable(${grant.id}::uuid) AS usable`).toEqual([{ usable: true }]);
    await database.prisma.$transaction(async (tx) => {
      const [expired] = await tx.$queryRaw<Array<{ version: number }>>`UPDATE external_portal_grants SET "expiresAt" = clock_timestamp() - interval '1 day', version = version + 1 WHERE id = ${grant.id}::uuid RETURNING version`;
      await externalEvidence(tx, f.owner.accountId, "external_portal_grants", grant.id, expired.version, "Set expired grant fixture with retained evidence");
    });
    expect(await database.prisma.$queryRaw<Array<{ usable: boolean }>>`SELECT s21_grant_usable(${grant.id}::uuid) AS usable`).toEqual([{ usable: false }]);
  });

  it("rechecks external session and grant expiry with the database clock after lock waits", async () => {
    const f = await fixture(database, nasRoot);
    const session = await database.prisma.externalPortalSession.findUniqueOrThrow({ where: { id: f.consultantActor.sessionId } });
    await database.prisma.externalPortalSession.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() + 1_000) } });
    let sessionLocked!: () => void;
    let releaseSession!: () => void;
    const sessionLockReady = new Promise<void>((resolve) => { sessionLocked = resolve; });
    const sessionLockRelease = new Promise<void>((resolve) => { releaseSession = resolve; });
    const sessionBlocker = database.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM external_portal_sessions WHERE id=${session.id}::uuid FOR UPDATE`;
      sessionLocked();
      await sessionLockRelease;
    });
    await sessionLockReady;
    try {
      const pending = f.external.submit(f.consultantActor, f.projectId, { grantId: f.consultantGrant.id, kind: "COMMENT", title: "Expired after session lock", body: "Must not persist", revisionId: f.revisionId, reason: "Session expires during wait" }, randomUUID());
      await new Promise((resolve) => setTimeout(resolve, 1_100));
      releaseSession();
      await sessionBlocker;
      await expect(pending).rejects.toMatchObject({ status: 403 });
    } finally {
      releaseSession();
      await sessionBlocker;
    }
    expect(await database.prisma.externalPortalRecord.count({ where: { projectId: f.projectId, title: "Expired after session lock" } })).toBe(0);

    const grant = await database.prisma.externalPortalGrant.findUniqueOrThrow({ where: { id: f.vendorGrant.id } });
    await f.external.changeGrant(f.owner, grant.id, { expectedVersion: grant.version, expiresAt: new Date(Date.now() + 1_000).toISOString(), reason: "Expire grant during a blocked authorization" });
    let grantLocked!: () => void;
    let releaseGrant!: () => void;
    const grantLockReady = new Promise<void>((resolve) => { grantLocked = resolve; });
    const grantLockRelease = new Promise<void>((resolve) => { releaseGrant = resolve; });
    const grantBlocker = database.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM external_portal_grants WHERE id=${grant.id}::uuid FOR UPDATE`;
      grantLocked();
      await grantLockRelease;
    });
    await grantLockReady;
    try {
      const pending = f.external.submit(f.vendorActor, f.projectId, { grantId: grant.id, kind: "COMMENT", title: "Expired after grant lock", body: "Must not persist", revisionId: f.revisionId, reason: "Grant expires during wait" }, randomUUID());
      await new Promise((resolve) => setTimeout(resolve, 1_100));
      releaseGrant();
      await grantBlocker;
      await expect(pending).rejects.toMatchObject({ status: 403 });
    } finally {
      releaseGrant();
      await grantBlocker;
    }
    expect(await database.prisma.externalPortalRecord.count({ where: { projectId: f.projectId, title: "Expired after grant lock" } })).toBe(0);
  });
});

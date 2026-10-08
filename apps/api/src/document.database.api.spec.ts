import "reflect-metadata";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseService } from "./database.service.js";
import { AccountKind, AccountState, DocumentResourceKind, PermissionEffect, PermissionScopeKind, Prisma } from "./generated/prisma/client.js";
import { AuthorizationService } from "./authorization.service.js";
import { ProjectService } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { ApprovalService } from "./approval.service.js";
import { DocumentService } from "./document.service.js";
import type { RuntimeConfig } from "./config.js";

const databaseUrl = process.env.DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
class RollbackFixture extends Error {}
const checksum = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

databaseDescribe("S11 document persistence and authorization", () => {
  let database: DatabaseService;
  let nasRoot: string;
  beforeAll(async () => {
    nasRoot = await mkdtemp(join(tmpdir(), "sense-s11-files-"));
    database = new DatabaseService({ nodeEnv: "test", port: 4000, databaseUrl: databaseUrl!, webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined });
    const rows = await database.prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!/_test(?:db)?$/i.test(rows[0]?.name ?? "")) throw new Error("S11 checks require a dedicated test database");
  });
  afterAll(async () => { await database?.onModuleDestroy(); if (nasRoot) await rm(nasRoot, { recursive: true, force: true }); });

  it("persists a resumable upload, enforces assignment and explicit Confidential grants, and retains immutable file evidence", async () => {
    try {
      await database.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.findFirst() ?? await tx.organization.create({ data: { name: "S11 fixture" } });
        const suffix = randomUUID();
        const branch = await tx.branch.create({ data: { organizationId: organization.id, name: `S11 branch ${suffix}` } });
        const team = await tx.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `S11 team ${suffix}` } });
        const owner = await tx.account.create({ data: { normalizedEmail: `s11-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
        const staff = await tx.account.create({ data: { normalizedEmail: `s11-staff-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
        const employee = await tx.employee.create({ data: { organizationId: organization.id, accountId: staff.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
        await tx.employeePermissionOverride.createMany({ data: ["project.view", "document.view", "document.upload"].map((permissionKey) => ({ organizationId: organization.id, employeeId: employee.id, permissionKey, effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: branch.id, reason: "S11 scoped fixture permission" })) });
        const proxy = new Proxy(tx, { get(target, key) {
          if (key === "$transaction") return async (callback: (inner: Prisma.TransactionClient) => Promise<unknown>) => {
            await tx.$executeRaw`SAVEPOINT s11_command`;
            try { const result = await callback(tx); await tx.$executeRaw`RELEASE SAVEPOINT s11_command`; return result; }
            catch (error) { await tx.$executeRaw`ROLLBACK TO SAVEPOINT s11_command`; await tx.$executeRaw`RELEASE SAVEPOINT s11_command`; throw error; }
          };
          return Reflect.get(target, key, target) as unknown;
        } });
        const scopedDb = { prisma: proxy } as unknown as DatabaseService;
        const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: databaseUrl!, webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined, nasRoot };
        const auth = new AuthorizationService(scopedDb);
        const projects = new ProjectService(scopedDb);
        const workflow = new ProjectWorkflowService(scopedDb, auth, new ApprovalService(scopedDb));
        const documents = new DocumentService(scopedDb, auth, config);
        const ownerActor = { accountId: owner.id, organizationId: organization.id, kind: AccountKind.OWNER };
        const staffActor = { accountId: staff.id, organizationId: organization.id, kind: AccountKind.STAFF };
        const project = (await projects.create(ownerActor, { branchId: branch.id, title: "S11 file project", deliveryType: "DESIGN", scopes: ["Architecture"], reason: "Create file fixture" })).project;
        const unrelated = (await projects.create(ownerActor, { branchId: branch.id, title: "Other project", deliveryType: "DESIGN", scopes: ["Architecture"], reason: "Create isolation fixture" })).project;
        await workflow.assignment(ownerActor, project.id, { employeeId: employee.id, expectedVersion: 1, reason: "Assign file work" });
        const staffPicker = await documents.projectPicker(staffActor, 0, 1);
        expect(staffPicker.total).toBe(1);
        expect(staffPicker.items.map(item => item.id)).toEqual([project.id]);
        const ownerFirst = await documents.projectPicker(ownerActor, 0, 1, { branchId: branch.id });
        const ownerSecond = await documents.projectPicker(ownerActor, 1, 1, { branchId: branch.id });
        expect(ownerFirst.total).toBe(2); expect(ownerSecond.total).toBe(2);
        expect(new Set([...ownerFirst.items, ...ownerSecond.items].map(item => item.id))).toEqual(new Set([project.id, unrelated.id]));
        await expect(documents.projectPicker(staffActor, 0, 50, { q: "Other project" })).resolves.toMatchObject({ total: 0, items: [] });
        await expect(documents.projectPicker(staffActor, 0, 50, { branchId: randomUUID() })).resolves.toMatchObject({ total: 0, items: [] });
        const folder = await documents.createFolder(ownerActor, project.id, { name: "Drawings", confidential: false, reason: "Create project file folder" });
        expect(folder.provisionState).toBe("READY");
        expect((await documents.list(staffActor, project.id)).folders.map((item) => item.id)).toContain(folder.id);
        await expect(documents.list(staffActor, unrelated.id)).rejects.toThrow("Permission denied");

        const bytes = Buffer.from("%PDF-1.7\nS11 test drawing\n");
        const started = await documents.startUpload(staffActor, project.id, { folderId: folder.id, fileName: "drawing.pdf", mimeType: "application/pdf", sizeBytes: bytes.length, confidential: false, viewOnly: false, reason: "Upload working drawing" });
        await documents.writeChunk(staffActor, started.uploadId, 0, bytes, checksum(bytes));
        await documents.writeChunk(staffActor, started.uploadId, 0, bytes, checksum(bytes));
        await expect(documents.writeChunk(staffActor, started.uploadId, 0, Buffer.from("other"), checksum(Buffer.from("other")))).rejects.toThrow();
        const file = await documents.finalize(staffActor, started.uploadId);
        expect(file.sha256).toBe(checksum(bytes));
        expect((await documents.list(staffActor, project.id)).files.map((item) => item.id)).toContain(file.id);
        const served = await documents.stream(staffActor, file.id);
        const chunks: Buffer[] = []; for await (const part of served.stream) chunks.push(Buffer.from(part));
        expect(Buffer.concat(chunks)).toEqual(bytes);
        expect(await tx.auditEvent.count({ where: { eventKey: "document.uploaded", subjectId: file.id } })).toBe(1);
        const blob = await tx.fileBlobMetadata.findFirstOrThrow({ where: { documentId: file.id } });
        await tx.$executeRaw`SAVEPOINT s11_immutable_probe`;
        await expect(tx.fileBlobMetadata.update({ where: { id: blob.id }, data: { sha256: "0".repeat(64) } })).rejects.toThrow();
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT s11_immutable_probe`;
        await tx.$executeRaw`RELEASE SAVEPOINT s11_immutable_probe`;

        const confidentialFolder = await documents.createFolder(ownerActor, project.id, { name: "Private", confidential: true, reason: "Create restricted folder" });
        const secretBytes = Buffer.from("%PDF-1.7\nPrivate drawing\n");
        const secretUpload = await documents.startUpload(ownerActor, project.id, { folderId: confidentialFolder.id, fileName: "private.pdf", mimeType: "application/pdf", sizeBytes: secretBytes.length, confidential: true, viewOnly: true, reason: "Upload restricted drawing" });
        await documents.writeChunk(ownerActor, secretUpload.uploadId, 0, secretBytes, checksum(secretBytes));
        const secret = await documents.finalize(ownerActor, secretUpload.uploadId);
        expect((await documents.list(staffActor, project.id)).files.map((item) => item.id)).not.toContain(secret.id);
        await expect(documents.stream(staffActor, secret.id)).rejects.toThrow("Confidential file access is not granted");
        await documents.grant(ownerActor, project.id, { resourceKind: DocumentResourceKind.FOLDER, resourceId: confidentialFolder.id, employeeId: employee.id, reason: "Permit private folder" });
        const grant = await documents.grant(ownerActor, project.id, { resourceKind: DocumentResourceKind.FILE, resourceId: secret.id, employeeId: employee.id, reason: "Permit exact private file" });
        expect((await documents.list(staffActor, project.id)).files.map((item) => item.id)).toContain(secret.id);
        const restricted = await documents.stream(staffActor, secret.id); restricted.stream.destroy();
        await documents.revokeGrant(ownerActor, grant.id, "Remove exact file access");
        await expect(documents.stream(staffActor, secret.id)).rejects.toThrow("Confidential file access is not granted");
        expect(await tx.auditEvent.count({ where: { eventKey: { in: ["document.folder_created", "document.folder_provisioned", "document.access_granted", "document.access_revoked"] }, organizationId: organization.id } })).toBeGreaterThanOrEqual(6);
        const currentProject = await tx.project.findUniqueOrThrow({ where: { id: project.id } });
        await workflow.revokeAssignment(ownerActor, project.id, employee.id, { expectedVersion: currentProject.version, reason: "Revoke picker visibility" });
        await expect(documents.projectPicker(staffActor, 0, 50)).resolves.toMatchObject({ branches: [], total: 0, items: [] });
        await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
        await tx.$executeRaw`SAVEPOINT s11_forged_file_probe`;
        await tx.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;
        await tx.document.create({ data: { organizationId: organization.id, projectId: project.id, folderId: folder.id, title: "Forged drawing", createdById: staff.id } });
        await expect(tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`).rejects.toThrow();
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT s11_forged_file_probe`;
        await tx.$executeRaw`RELEASE SAVEPOINT s11_forged_file_probe`;
        throw new RollbackFixture();
      }, { timeout: 90_000 });
    } catch (error) { if (!(error instanceof RollbackFixture)) throw error; }
  });
});

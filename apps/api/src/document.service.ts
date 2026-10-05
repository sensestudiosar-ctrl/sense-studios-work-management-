import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AccountKind, AccountState, DocumentProvisionState, DocumentResourceKind, DocumentUploadState, EmployeeState, Prisma, ProjectStatus } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { NasStorage } from "./nas-storage.js";
import { DOCUMENT_CHUNK_SIZE, DOCUMENT_MAX_BYTES, validateDocumentFile, validateFirstChunk } from "./document-file-policy.js";
import { recordProjectEvent } from "./project-events.js";
import { parseTemplateDefinition } from "./template-definition.js";
import type { ProjectActor } from "./project.service.js";
import { createHash } from "node:crypto";

type Tx = Prisma.TransactionClient;
type Access = { project: { id: string; organizationId: string; branchId: string; status: ProjectStatus }; employeeId: string | null };
const writable = new Set<ProjectStatus>([ProjectStatus.DRAFT, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD]);
const safeFolderName = (value: string) => {
  const name = value.trim();
  if (!name || name.length > 160 || name === "." || name === ".." || /[\\/:*?<>|"]/.test(name) || [...name].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) || /[. ]$/.test(name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) throw new BadRequestException("Invalid folder name");
  return name;
};

@Injectable()
export class DocumentService {
  private storagePromise: Promise<NasStorage> | undefined;
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private get db() { return this.database.prisma; }
  private async storage(): Promise<NasStorage> {
    if (!this.config.nasRoot) throw new ServiceUnavailableException("Document storage is not configured");
    this.storagePromise ??= (async () => { const storage = new NasStorage(this.config.nasRoot!); await storage.initialize(); return storage; })();
    try { return await this.storagePromise; }
    catch { this.storagePromise = undefined; throw new ServiceUnavailableException("Document storage is unavailable"); }
  }
  private async access(tx: Tx, actor: ProjectActor, projectId: string, permission: string, write = false): Promise<Access> {
    const project = await tx.project.findFirst({ where: { id: projectId, organizationId: actor.organizationId }, select: { id: true, organizationId: true, branchId: true, status: true } });
    if (!project) throw new NotFoundException("Project not found");
    const account = await tx.account.findUnique({ where: { id: actor.accountId }, include: { employee: true } });
    if (!account || account.state !== AccountState.ACTIVE || account.kind !== actor.kind) throw new ForbiddenException("Permission denied");
    if (write && !writable.has(project.status)) throw new ConflictException("Project no longer accepts files");
    if (actor.kind === AccountKind.OWNER) return { project, employeeId: null };
    const employee = account.employee;
    if (!employee || employee.state !== EmployeeState.ACTIVE || employee.organizationId !== actor.organizationId) throw new ForbiddenException("Permission denied");
    const assignment = await tx.projectAssignment.findFirst({ where: { organizationId: actor.organizationId, projectId, employeeId: employee.id, revokedAt: null } });
    if (!assignment || employee.homeBranchId !== project.branchId && !assignment.crossBranchAuthorized) throw new ForbiddenException("Permission denied");
    const scope = { kind: "BRANCH" as const, organizationId: actor.organizationId, branchId: project.branchId };
    await this.authorization.assertPermission(actor.accountId, "project.view", scope, tx);
    await this.authorization.assertPermission(actor.accountId, permission, scope, tx);
    return { project, employeeId: employee.id };
  }
  private async grantFor(tx: Tx, access: Access, kind: DocumentResourceKind, id: string): Promise<void> {
    if (!access.employeeId) return;
    const found = await tx.documentAccessGrant.findFirst({ where: { organizationId: access.project.organizationId, projectId: access.project.id, resourceKind: kind, resourceId: id, employeeId: access.employeeId, revokedAt: null }, select: { id: true } });
    if (!found) throw new ForbiddenException("Confidential file access is not granted");
  }
  private async folder(tx: Tx, access: Access, folderId: string) {
    const folder = await tx.documentFolder.findFirst({ where: { id: folderId, projectId: access.project.id, organizationId: access.project.organizationId } });
    if (!folder) throw new NotFoundException("Folder not found");
    let current: typeof folder | null = folder;
    let depth = 0;
    while (current) {
      if (++depth > 20) throw new ConflictException("Folder hierarchy is invalid");
      if (current.confidential) await this.grantFor(tx, access, DocumentResourceKind.FOLDER, current.id);
      current = current.parentId ? await tx.documentFolder.findFirst({ where: { id: current.parentId, projectId: access.project.id, organizationId: access.project.organizationId } }) : null;
    }
    return folder;
  }
  private async fileAccess(tx: Tx, access: Access, document: { id: string; folderId: string; confidential: boolean }) {
    await this.folder(tx, access, document.folderId);
    if (document.confidential) await this.grantFor(tx, access, DocumentResourceKind.FILE, document.id);
  }
  /** DOC public module boundary: fresh scoped access to an immutable file inside the caller transaction. */
  async authorizeFile(tx: Tx, actor: ProjectActor, fileId: string, permission = "document.view", write = false) {
    const document = await tx.document.findFirst({ where: { id: fileId, organizationId: actor.organizationId }, include: { blobs: true } });
    if (!document || !document.blobs[0]) throw new NotFoundException("File not found");
    const access = await this.access(tx, actor, document.projectId, permission, write);
    await this.fileAccess(tx, access, document);
    return { document, blob: document.blobs[0] };
  }
  async list(actor: ProjectActor, projectId: string) {
    return this.db.$transaction(async (tx) => {
      const access = await this.access(tx, actor, projectId, "document.view");
      const folders = await tx.documentFolder.findMany({ where: { organizationId: actor.organizationId, projectId }, orderBy: [{ logicalPath: "asc" }, { id: "asc" }] });
      const visible = [];
      for (const row of folders) {
        try {
          await this.folder(tx, access, row.id);
          let ancestor: typeof row | undefined = row;
          let offlineUploadAllowed = row.provisionState === DocumentProvisionState.READY;
          let depth = 0;
          while (ancestor) {
            if (++depth > 20 || ancestor.confidential) { offlineUploadAllowed = false; break; }
            const parentId: string | null = ancestor.parentId;
            ancestor = parentId ? folders.find(item => item.id === parentId) : undefined;
            if (parentId && !ancestor) offlineUploadAllowed = false;
          }
          visible.push({ id: row.id, name: row.name, parentId: row.parentId, confidential: row.confidential, offlineUploadAllowed, provisionState: row.provisionState, provisionError: row.provisionError });
        }
        catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
      }
      const documents = await tx.document.findMany({ where: { organizationId: actor.organizationId, projectId }, include: { blobs: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
      const files = [];
      for (const row of documents) {
        try { await this.fileAccess(tx, access, row); }
        catch (error) { if (error instanceof ForbiddenException) continue; throw error; }
        const blob = row.blobs[0];
        if (blob) files.push({ id: row.id, folderId: row.folderId, fileName: blob.fileName, mimeType: blob.mimeType, sizeBytes: Number(blob.sizeBytes), sha256: blob.sha256, confidential: row.confidential, viewOnly: row.viewOnly, createdAt: row.createdAt });
      }
      let upload = false;
      if (access.employeeId === null) upload = writable.has(access.project.status);
      else try { await this.access(tx, actor, projectId, "document.upload", true); upload = true; } catch (error) { if (!(error instanceof ForbiddenException || error instanceof ConflictException)) throw error; }
      return { project: { id: access.project.id, title: (await tx.project.findUniqueOrThrow({ where: { id: projectId }, select: { title: true } })).title }, folders: visible, files, capabilities: { createFolder: upload, upload, grant: access.employeeId === null } };
    });
  }
  async createFolder(actor: ProjectActor, projectId: string, input: { name: string; parentId?: string | undefined; confidential: boolean; reason: string; templatePath?: string }) {
    const name = safeFolderName(input.name);
    const row = await this.db.$transaction(async (tx) => {
      const access = await this.access(tx, actor, projectId, "document.upload", true);
      if (input.confidential && access.employeeId) throw new ForbiddenException("Owner approval is required for Confidential folders");
      const parent = input.parentId ? await this.folder(tx, access, input.parentId) : null;
      const logicalPath = parent ? `${parent.logicalPath}/${name}` : name;
      if (logicalPath.length > 600) throw new BadRequestException("Folder path is too long");
      const existing = await tx.documentFolder.findFirst({ where: { projectId, logicalPath: { equals: logicalPath, mode: "insensitive" } } });
      if (existing) {
        if (existing.confidential !== input.confidential || existing.parentId !== (parent?.id ?? null)) throw new ConflictException("Folder already exists with different settings");
        return existing;
      }
      const folder = await tx.documentFolder.create({ data: { organizationId: actor.organizationId, projectId, parentId: parent?.id ?? null, name, normalizedName: name.toLocaleLowerCase("en-US"), logicalPath, ...(input.templatePath ? { templatePath: input.templatePath } : {}), confidential: input.confidential, createdById: actor.accountId } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "document.folder_created", subjectType: "document_folder", subjectId: folder.id, reason: input.reason, after: { projectId, parentId: folder.parentId, confidential: folder.confidential, logicalPath } });
      return folder;
    });
    return this.provisionFolder(actor, row.id);
  }
  async provisionFolder(actor: ProjectActor, folderId: string) {
    const row = await this.db.documentFolder.findFirst({ where: { id: folderId, organizationId: actor.organizationId } });
    if (!row) throw new NotFoundException("Folder not found");
    await this.db.$transaction(async (tx) => { const access = await this.access(tx, actor, row.projectId, "document.upload", true); if (row.parentId) await this.folder(tx, access, row.parentId); });
    let error: string | null = null;
    try { await (await this.storage()).provisionFolder(row.projectId, row.logicalPath); }
    catch { error = "Storage folder is unavailable; retry provisioning"; }
    return this.db.$transaction(async (tx) => {
      if (!error && row.provisionState === DocumentProvisionState.READY) return row;
      const updated = await tx.documentFolder.update({ where: { id: row.id }, data: { provisionState: error ? DocumentProvisionState.FAILED : DocumentProvisionState.READY, provisionError: error } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: error ? "document.folder_failed" : "document.folder_provisioned", subjectType: "document_folder", subjectId: row.id, reason: error ?? "Folder provisioned on storage", after: { projectId: row.projectId, provisionState: updated.provisionState } });
      return updated;
    });
  }
  async provisionTemplate(actor: ProjectActor, projectId: string) {
    await this.db.$transaction(async (tx) => this.access(tx, actor, projectId, "document.upload", true));
    const plan = await this.db.projectPlan.findUnique({ where: { projectId } });
    if (!plan) return { folders: [] };
    const paths = parseTemplateDefinition(plan.definition).folders;
    const created = [];
    for (const path of paths) {
      let parentId: string | undefined;
      for (const name of path.split("/")) {
        const row = await this.createFolder(actor, projectId, { name, ...(parentId ? { parentId } : {}), confidential: false, reason: "Applied project template folder", templatePath: path });
        parentId = row.id;
        created.push(row);
      }
    }
    return { folders: created };
  }
  async startUpload(actor: ProjectActor, projectId: string, input: { folderId: string; fileName: string; mimeType: string; sizeBytes: number; confidential: boolean; viewOnly: boolean; reason: string }) {
    const file = validateDocumentFile(input.fileName, input.mimeType, input.sizeBytes, this.config.documentMaxFileBytes ?? DOCUMENT_MAX_BYTES);
    return this.db.$transaction(async (tx) => {
      const access = await this.access(tx, actor, projectId, "document.upload", true);
      if (input.confidential && access.employeeId) throw new ForbiddenException("Owner approval is required for Confidential files");
      const folder = await this.folder(tx, access, input.folderId);
      if (folder.provisionState !== DocumentProvisionState.READY) throw new ConflictException("Folder is not ready on storage");
      const row = await tx.documentUpload.create({ data: { organizationId: actor.organizationId, projectId, folderId: input.folderId, actorId: actor.accountId, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: BigInt(input.sizeBytes), chunkSize: DOCUMENT_CHUNK_SIZE, chunkCount: Math.ceil(input.sizeBytes / DOCUMENT_CHUNK_SIZE), confidential: input.confidential, viewOnly: input.viewOnly, reason: input.reason, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
      return { uploadId: row.id, chunkSize: row.chunkSize };
    });
  }
  private async upload(actor: ProjectActor, uploadId: string) {
    const row = await this.db.documentUpload.findFirst({ where: { id: uploadId, organizationId: actor.organizationId } });
    if (!row) throw new NotFoundException("Upload not found");
    if (row.actorId !== actor.accountId) throw new ForbiddenException("Permission denied");
    await this.db.$transaction(async (tx) => { const access = await this.access(tx, actor, row.projectId, "document.upload", true); await this.folder(tx, access, row.folderId); });
    return row;
  }
  async writeChunk(actor: ProjectActor, uploadId: string, index: number, bytes: Buffer, checksum: string) {
    const row = await this.upload(actor, uploadId);
    if (row.state !== DocumentUploadState.STAGING || row.expiresAt <= new Date()) throw new ConflictException("Upload is no longer active");
    if (!Number.isSafeInteger(index) || index < 0 || index >= row.chunkCount) throw new BadRequestException("Invalid chunk index");
    const size = index === row.chunkCount - 1 ? Number(row.sizeBytes) - index * row.chunkSize : row.chunkSize;
    if (bytes.length !== size) throw new BadRequestException("Chunk size does not match upload manifest");
    if (index === 0) validateFirstChunk(row.fileName.split(".").at(-1)!.toLowerCase(), bytes);
    if (createHash("sha256").update(bytes).digest("hex") !== checksum.toLowerCase()) throw new BadRequestException("Chunk checksum mismatch");
    await (await this.storage()).writeChunk(uploadId, index, bytes, checksum);
    return this.db.$transaction(async (tx) => {
      const current = await tx.documentUpload.findUniqueOrThrow({ where: { id: uploadId } });
      if (current.state !== DocumentUploadState.STAGING || current.expiresAt <= new Date()) throw new ConflictException("Upload is no longer active");
      const prior = await tx.documentUploadChunk.findUnique({ where: { uploadId_index: { uploadId, index } } });
      if (prior) {
        if (prior.sha256 !== checksum.toLowerCase() || prior.sizeBytes !== bytes.length) throw new ConflictException("Conflicting upload chunk");
      } else await tx.documentUploadChunk.create({ data: { uploadId, index, organizationId: actor.organizationId, sizeBytes: bytes.length, sha256: checksum.toLowerCase() } });
      return { index, received: true };
    });
  }
  async finalize(actor: ProjectActor, uploadId: string) {
    const row = await this.upload(actor, uploadId);
    if (row.state === DocumentUploadState.FINALIZED && row.finalizedBlobId) return this.fileByBlob(actor, row.finalizedBlobId);
    if (row.state !== DocumentUploadState.STAGING || row.expiresAt <= new Date()) throw new ConflictException("Upload is no longer active");
    const chunks = await this.db.documentUploadChunk.findMany({ where: { uploadId }, orderBy: { index: "asc" } });
    if (chunks.length !== row.chunkCount || chunks.some((part, index) => part.index !== index)) throw new ConflictException("Upload is incomplete");
    const blob = await (await this.storage()).finalize(uploadId, row.chunkCount, Number(row.sizeBytes));
    const result = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "document_uploads" WHERE "id"=${uploadId}::uuid FOR UPDATE`;
      const current = await tx.documentUpload.findUniqueOrThrow({ where: { id: uploadId } });
      if (current.state !== DocumentUploadState.STAGING) throw new ConflictException("Upload was finalized concurrently");
      const access = await this.access(tx, actor, row.projectId, "document.upload", true);
      await this.folder(tx, access, row.folderId);
      const document = await tx.document.create({ data: { organizationId: actor.organizationId, projectId: row.projectId, folderId: row.folderId, title: row.fileName, confidential: row.confidential, viewOnly: row.viewOnly, createdById: actor.accountId } });
      const stored = await tx.fileBlobMetadata.create({ data: { organizationId: actor.organizationId, documentId: document.id, storageKey: blob.key, fileName: row.fileName, mimeType: row.mimeType, sizeBytes: BigInt(blob.size), sha256: blob.sha256 } });
      await tx.documentUpload.update({ where: { id: uploadId }, data: { state: DocumentUploadState.FINALIZED, finalizedBlobId: stored.id, finalizedAt: new Date() } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "document.uploaded", subjectType: "document", subjectId: document.id, reason: row.reason, after: { projectId: row.projectId, folderId: row.folderId, blobId: stored.id, sha256: blob.sha256, sizeBytes: blob.size, confidential: row.confidential, viewOnly: row.viewOnly } });
      return { id: document.id, folderId: row.folderId, fileName: row.fileName, mimeType: row.mimeType, sizeBytes: blob.size, sha256: blob.sha256, confidential: row.confidential, viewOnly: row.viewOnly, createdAt: document.createdAt };
    });
    try { await (await this.storage()).discardUpload(uploadId); } catch { /* Reconciliation reports the retained stage. */ }
    return result;
  }
  private async fileByBlob(actor: ProjectActor, blobId: string) {
    const blob = await this.db.fileBlobMetadata.findFirst({ where: { id: blobId, organizationId: actor.organizationId }, include: { document: true } });
    if (!blob) throw new NotFoundException("File not found");
    return { id: blob.documentId, folderId: blob.document.folderId, fileName: blob.fileName, mimeType: blob.mimeType, sizeBytes: Number(blob.sizeBytes), sha256: blob.sha256, confidential: blob.document.confidential, viewOnly: blob.document.viewOnly, createdAt: blob.createdAt };
  }
  /** SITE port: create/replay an exact newly captured image manifest inside the caller's authorization transaction. */
  async startOfflinePhoto(tx: Tx, actor: ProjectActor, projectId: string, input: { localId: string; folderId: string; fileName: string; mimeType: string; sizeBytes: number; reason: string }) {
    const file = validateDocumentFile(input.fileName, input.mimeType, input.sizeBytes, this.config.documentMaxFileBytes ?? DOCUMENT_MAX_BYTES);
    if (!["png", "jpg", "jpeg", "gif", "webp"].includes(file.extension)) throw new BadRequestException("Offline capture supports images only");
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"site-photo:" + input.localId},0))`;
    const access = await this.access(tx, actor, projectId, "document.upload", true);
    await tx.$queryRaw`SELECT id FROM document_folders WHERE "projectId"=${projectId}::uuid FOR SHARE`;
    const folder = await this.folder(tx, access, input.folderId);
    let ancestor: typeof folder | null = folder;
    let depth = 0;
    while (ancestor) {
      if (++depth > 20) throw new ConflictException("Folder hierarchy is invalid");
      if (ancestor.confidential) throw new ForbiddenException("Offline photo capture cannot target Confidential folders");
      const parentId: string | null = ancestor.parentId;
      ancestor = parentId ? await tx.documentFolder.findFirst({ where: { id: parentId, projectId, organizationId: actor.organizationId } }) : null;
      if (parentId && !ancestor) throw new ConflictException("Folder hierarchy is invalid");
    }
    if (folder.provisionState !== DocumentProvisionState.READY) throw new ConflictException("Folder is not ready on storage");
    const prior = await tx.documentUpload.findUnique({ where: { id: input.localId } });
    if (prior) {
      if (prior.organizationId !== actor.organizationId || prior.actorId !== actor.accountId || prior.projectId !== projectId || prior.folderId !== input.folderId || prior.fileName !== file.fileName || prior.mimeType !== file.mimeType || prior.sizeBytes !== BigInt(input.sizeBytes) || prior.confidential || prior.viewOnly || prior.reason !== input.reason) throw new ConflictException("Photo identifier belongs to different content");
      if (prior.state === DocumentUploadState.ABORTED || prior.state === DocumentUploadState.STAGING && prior.expiresAt <= new Date()) throw new ConflictException("Photo upload expired; capture again with a new identifier");
      return { uploadId: prior.id, chunkSize: prior.chunkSize };
    }
    const row = await tx.documentUpload.create({ data: { id: input.localId, organizationId: actor.organizationId, projectId, folderId: folder.id, actorId: actor.accountId, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: BigInt(input.sizeBytes), chunkSize: DOCUMENT_CHUNK_SIZE, chunkCount: Math.ceil(input.sizeBytes / DOCUMENT_CHUNK_SIZE), confidential: false, viewOnly: false, reason: input.reason, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    return { uploadId: row.id, chunkSize: row.chunkSize };
  }
  /** PORT public boundary: exact non-Confidential metadata; caller holds fresh external grant locks. */
  async externalRevision(tx: Tx, projectId: string, revisionId: string) {
    const revision = await tx.documentRevision.findFirst({ where: { id: revisionId, projectId }, include: { drawing: true } });
    if (!revision) throw new NotFoundException("Revision not found");
    const allowed = (await tx.$queryRaw<Array<{ allowed: boolean }>>`SELECT s21_nonconfidential_revision(${revisionId}::uuid) AS allowed`)[0]!.allowed;
    if (!allowed) throw new ForbiddenException("This file is unavailable to external portals");
    const blob = await tx.fileBlobMetadata.findFirst({ where: { id: revision.blobId, organizationId: revision.organizationId, documentId: revision.fileId } });
    if (!blob || blob.sha256 !== revision.sha256) throw new ConflictException("Exact revision content is unavailable");
    return { revision, blob, public: { id: revision.id, title: revision.drawing.title, documentNumber: revision.drawing.documentNumber, series: revision.series, number: revision.number, fileName: blob.fileName, state: revision.state, isCurrent: revision.isCurrent, cad: /\.(dwg|skp|rvt)$/i.test(blob.fileName) } };
  }
  async externalOptions(tx: Tx, actor: ProjectActor, projectId: string) {
    await this.access(tx, actor, projectId, "document.view");
    const options = [];
    for (const revision of await tx.documentRevision.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 200 })) {
      try { options.push((await this.externalRevision(tx, projectId, revision.id)).public); }
      catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    }
    return options;
  }
  async openExternalBlob(blob: { storageKey: string; fileName: string; mimeType: string }) {
    const opened = await (await this.storage()).openBlob(blob.storageKey);
    return { stream: opened.stream, sizeBytes: opened.size, fileName: blob.fileName, mimeType: blob.mimeType };
  }
  async writeExternalChunk(uploadId: string, index: number, bytes: Buffer, checksum: string) { return (await this.storage()).writeChunk(uploadId, index, bytes, checksum); }
  async finalizeExternalUpload(uploadId: string, chunkCount: number, sizeBytes: number) { return (await this.storage()).finalize(uploadId, chunkCount, sizeBytes); }
  async assertTimeEvidence(tx: Tx, actor: ProjectActor, documentId: string, projectId: string | null) {
    const document = await tx.document.findFirst({ where: { id: documentId, organizationId: actor.organizationId } });
    if (!document || document.projectId !== projectId) throw new NotFoundException("Time evidence unavailable");
    const access = await this.access(tx, actor, document.projectId, "document.view");
    await this.fileAccess(tx, access, document);
  }
  async stream(actor: ProjectActor, documentId: string) {
    const row = await this.db.$transaction(async (tx) => {
      const document = await tx.document.findFirst({ where: { id: documentId, organizationId: actor.organizationId }, include: { blobs: { orderBy: { createdAt: "asc" }, take: 1 } } });
      if (!document || !document.blobs[0]) throw new NotFoundException("File not found");
      const access = await this.access(tx, actor, document.projectId, "document.view");
      await this.fileAccess(tx, access, document);
      return document.blobs[0];
    });
    const opened = await (await this.storage()).openBlob(row.storageKey);
    return { stream: opened.stream, size: opened.size, fileName: row.fileName, mimeType: row.mimeType };
  }
  async grant(actor: ProjectActor, projectId: string, input: { resourceKind: DocumentResourceKind; resourceId: string; employeeId: string; reason: string }) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    return this.db.$transaction(async (tx) => {
      await this.access(tx, actor, projectId, "document.manage");
      const employee = await tx.employee.findFirst({ where: { id: input.employeeId, organizationId: actor.organizationId, state: EmployeeState.ACTIVE, account: { state: AccountState.ACTIVE } } });
      if (!employee || !await tx.projectAssignment.findFirst({ where: { projectId, organizationId: actor.organizationId, employeeId: employee.id, revokedAt: null } })) throw new ConflictException("Recipient needs an active project assignment");
      const exists = input.resourceKind === DocumentResourceKind.FOLDER ? await tx.documentFolder.findFirst({ where: { id: input.resourceId, organizationId: actor.organizationId, projectId } }) : await tx.document.findFirst({ where: { id: input.resourceId, organizationId: actor.organizationId, projectId } });
      if (!exists) throw new NotFoundException("File item not found");
      const prior = await tx.documentAccessGrant.findFirst({ where: { organizationId: actor.organizationId, projectId, resourceKind: input.resourceKind, resourceId: input.resourceId, employeeId: input.employeeId, revokedAt: null } });
      if (prior) return prior;
      const row = await tx.documentAccessGrant.create({ data: { organizationId: actor.organizationId, projectId, resourceKind: input.resourceKind, resourceId: input.resourceId, employeeId: input.employeeId, grantedById: actor.accountId, reason: input.reason } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "document.access_granted", subjectType: "document_grant", subjectId: row.id, reason: input.reason, after: { projectId, resourceKind: input.resourceKind, resourceId: input.resourceId, employeeId: input.employeeId } });
      return row;
    });
  }
  async revokeGrant(actor: ProjectActor, grantId: string, reason: string) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    return this.db.$transaction(async (tx) => {
      const grant = await tx.documentAccessGrant.findFirst({ where: { id: grantId, organizationId: actor.organizationId, revokedAt: null } });
      if (!grant) throw new NotFoundException("Grant not found");
      await this.access(tx, actor, grant.projectId, "document.manage");
      const row = await tx.documentAccessGrant.update({ where: { id: grantId }, data: { revokedAt: new Date() } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "document.access_revoked", subjectType: "document_grant", subjectId: row.id, reason, after: { projectId: row.projectId, resourceKind: row.resourceKind, resourceId: row.resourceId, employeeId: row.employeeId } });
      return row;
    });
  }
  async grants(actor: ProjectActor, projectId: string) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    await this.db.$transaction(async (tx) => this.access(tx, actor, projectId, "document.manage"));
    return { items: await this.db.documentAccessGrant.findMany({ where: { organizationId: actor.organizationId, projectId, revokedAt: null }, orderBy: { grantedAt: "asc" } }) };
  }
  async reconciliation(actor: ProjectActor) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    const inventory = await (await this.storage()).inventory();
    const [stored, references, publications, active, external] = await Promise.all([this.db.fileBlobMetadata.findMany({ where: { organizationId: actor.organizationId }, select: { storageKey: true } }), this.db.clientReference.findMany({ where: { organizationId: actor.organizationId }, select: { storageKey: true } }), this.db.portfolioPublication.findMany({ where: { organizationId: actor.organizationId }, select: { storageKey: true } }), this.db.documentUpload.findMany({ where: { organizationId: actor.organizationId, state: DocumentUploadState.STAGING }, select: { id: true, expiresAt: true } }), this.db.externalPortalUpload.findMany({ where: { organizationId: actor.organizationId }, select: { id: true, state: true, storageKey: true, expiresAt: true } })]);
    // Shared physical storage reconciliation includes retained PORT upload references.
    const retained = [...stored, ...references, ...publications, ...external.flatMap(row => row.storageKey ? [{ storageKey: row.storageKey }] : [])];
    const known = new Set(retained.map((row) => row.storageKey));
    const activeKeys = new Set([...active.map((row) => row.id), ...external.filter(row => row.state === "STAGING" && row.expiresAt > new Date()).map(row => row.id)]);
    return { orphanBlobKeys: inventory.blobKeys.filter((key) => !known.has(key)), missingBlobKeys: retained.map((row) => row.storageKey).filter((key) => !inventory.blobKeys.includes(key)), orphanStageIds: inventory.stagedUploadIds.filter((key) => !activeKeys.has(key)), expiredUploadIds: active.filter((row) => row.expiresAt <= new Date()).map((row) => row.id), assemblingKeys: inventory.assemblingKeys };
  }
  async reconcile(actor: ProjectActor) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    const expired = await this.db.documentUpload.findMany({ where: { organizationId: actor.organizationId, state: DocumentUploadState.STAGING, expiresAt: { lte: new Date() } }, select: { id: true } });
    const aborted: string[] = [];
    for (const item of expired) {
      const changed = await this.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "document_uploads" WHERE "id"=${item.id}::uuid FOR UPDATE`;
        const current = await tx.documentUpload.findUniqueOrThrow({ where: { id: item.id } });
        if (current.state !== DocumentUploadState.STAGING || current.expiresAt > new Date()) return false;
        await tx.documentUpload.update({ where: { id: item.id }, data: { state: DocumentUploadState.ABORTED } });
        await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "document.upload_aborted", subjectType: "document_upload", subjectId: item.id, reason: "Expired incomplete upload", after: { projectId: current.projectId, folderId: current.folderId, uploadId: item.id } });
        return true;
      });
      if (changed) aborted.push(item.id);
    }
    const storage = await this.storage();
    const snapshot = await this.reconciliation(actor);
    const cleanedStages: string[] = [];
    for (const id of snapshot.orphanStageIds) {
      try { await storage.discardUpload(id); cleanedStages.push(id); } catch { /* Keep the stage visible in the next report. */ }
    }
    return { abortedUploadIds: aborted, cleanedStageIds: cleanedStages, inventory: await this.reconciliation(actor) };
  }
}

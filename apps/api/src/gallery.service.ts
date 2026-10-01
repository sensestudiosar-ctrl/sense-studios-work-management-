import { createHash, randomUUID } from "node:crypto";
import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, BadRequestException } from "@nestjs/common";
import sharp from "sharp";
import { AccountKind, AccountState, PortfolioPublicationState, PublicationGrantAction, Prisma } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { DocumentService } from "./document.service.js";
import { ClientPortalScopeService } from "./client-portal-scope.service.js";
import { ClientPortalFilesService } from "./client-portal-files.service.js";
import type { ActiveClientPortalSession } from "./client-portal-identity.service.js";
import type { ProjectActor } from "./project.service.js";
import { NasStorage } from "./nas-storage.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { Inject } from "@nestjs/common";
import { recordProjectEvent } from "./project-events.js";

type Tx = Prisma.TransactionClient;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const allowedSourceMime = new Set(["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"]);

@Injectable()
export class GalleryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly documents: DocumentService,
    private readonly clientScope: ClientPortalScopeService,
    private readonly clientFiles: ClientPortalFilesService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private async storage() {
    if (!this.config.nasRoot) throw new ServiceUnavailableException("File storage is unavailable");
    const storage = new NasStorage(this.config.nasRoot);
    await storage.initialize();
    return storage;
  }

  private async owner(tx: Tx, actor: ProjectActor) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    await tx.$queryRaw`SELECT "id" FROM "accounts" WHERE "id"=${actor.accountId}::uuid FOR SHARE`;
    const account = await tx.account.findFirst({ where: { id: actor.accountId, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
    if (!account) throw new ForbiddenException("Owner access is no longer active");
    const organization = await tx.organization.findFirst({ where: { id: actor.organizationId }, select: { id: true } });
    if (!organization) throw new ForbiddenException("Permission denied");
  }

  private async project(tx: Tx, actor: ProjectActor, projectId: string) {
    const project = await tx.project.findFirst({ where: { id: projectId, organizationId: actor.organizationId } });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  private async publicSource(tx: Tx, actor: ProjectActor, projectId: string, fileId: string) {
    await tx.$queryRaw`SELECT "id" FROM "documents" WHERE "id"=${fileId}::uuid AND "organizationId"=${actor.organizationId}::uuid AND "projectId"=${projectId}::uuid FOR SHARE`;
    const { document, blob } = await this.documents.authorizeFile(tx, actor, fileId, "document.view");
    if (document.projectId !== projectId || !allowedSourceMime.has(blob.mimeType)) throw new ForbiddenException("A permitted project PDF/image source is required");
    let folder: { id: string; parentId: string | null; confidential: boolean } | null = await tx.documentFolder.findFirst({ where: { id: document.folderId, organizationId: actor.organizationId, projectId }, select: { id: true, parentId: true, confidential: true } });
    if (!folder) throw new ConflictException("Source folder hierarchy is invalid");
    let depth = 0;
    while (folder) {
      await tx.$queryRaw`SELECT "id" FROM "document_folders" WHERE "id"=${folder.id}::uuid AND "organizationId"=${actor.organizationId}::uuid AND "projectId"=${projectId}::uuid FOR SHARE`;
      folder = await tx.documentFolder.findFirst({ where: { id: folder.id, organizationId: actor.organizationId, projectId } });
      if (!folder) throw new ConflictException("Source folder hierarchy is invalid");
      if (++depth > 20) throw new ConflictException("Source folder hierarchy is invalid");
      if (folder.confidential) throw new ForbiddenException("Confidential sources cannot be published");
      if (!folder.parentId) break;
      const parent: { id: string; parentId: string | null; confidential: boolean } | null = await tx.documentFolder.findFirst({ where: { id: folder.parentId, organizationId: actor.organizationId, projectId }, select: { id: true, parentId: true, confidential: true } });
      if (!parent) throw new ConflictException("Source folder hierarchy is invalid");
      folder = parent;
    }
    if (document.confidential) throw new ForbiddenException("Confidential sources cannot be published");
    const exact = await tx.fileBlobMetadata.findFirst({ where: { id: blob.id, documentId: document.id, organizationId: actor.organizationId, mimeType: blob.mimeType, sha256: blob.sha256 } });
    if (!exact) throw new ConflictException("Source file evidence changed");
    return { document, blob: exact };
  }

  private async publicEligible(tx: Tx, publication: { organizationId: string; projectId: string; sourceFileId: string; sourceBlobId: string; storageKey: string; sha256: string; mime: string; size: number }) {
    await tx.$queryRaw`SELECT "id" FROM "documents" WHERE "id"=${publication.sourceFileId}::uuid AND "organizationId"=${publication.organizationId}::uuid AND "projectId"=${publication.projectId}::uuid FOR SHARE`;
    const document = await tx.document.findFirst({ where: { id: publication.sourceFileId, organizationId: publication.organizationId, projectId: publication.projectId } });
    if (!document || document.confidential) return false;
    let folder: { id: string; parentId: string | null; confidential: boolean } | null = await tx.documentFolder.findFirst({ where: { id: document.folderId, organizationId: publication.organizationId, projectId: publication.projectId }, select: { id: true, parentId: true, confidential: true } });
    if (!folder) return false;
    let depth = 0;
    while (folder) {
      await tx.$queryRaw`SELECT "id" FROM "document_folders" WHERE "id"=${folder.id}::uuid AND "organizationId"=${publication.organizationId}::uuid AND "projectId"=${publication.projectId}::uuid FOR SHARE`;
      folder = await tx.documentFolder.findFirst({ where: { id: folder.id, organizationId: publication.organizationId, projectId: publication.projectId }, select: { id: true, parentId: true, confidential: true } });
      if (!folder || folder.confidential || ++depth > 20) return false;
      if (!folder.parentId) break;
      folder = await tx.documentFolder.findFirst({ where: { id: folder.parentId, organizationId: publication.organizationId, projectId: publication.projectId }, select: { id: true, parentId: true, confidential: true } });
      if (!folder) return false;
    }
    const source = await tx.fileBlobMetadata.findFirst({ where: { id: publication.sourceBlobId, documentId: document.id, organizationId: publication.organizationId } });
    return !!source && source.storageKey !== publication.storageKey && publication.mime === "image/png" && publication.size > 0 && publication.size <= MAX_IMAGE_BYTES && /^[0-9a-f]{64}$/i.test(publication.sha256);
  }

  private async currentPublicationGrant(tx: Tx, publicationId: string, version: number) {
    return !!await tx.publicationGrant.findFirst({ where: { publicationId, action: PublicationGrantAction.PUBLISHED, toVersion: version } });
  }

  private async encodeImage(encoded: string): Promise<Buffer> {
    if (encoded.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw new BadRequestException("Invalid raster image upload");
    const input = Buffer.from(encoded, "base64");
    if (!input.length || input.length > MAX_IMAGE_BYTES || input.toString("base64") !== encoded) throw new BadRequestException("Invalid raster image upload");
    try {
      const decoderOptions = { failOn: "warning" as const, limitInputPixels: MAX_IMAGE_PIXELS, limitInputChannels: 4 };
      const meta = await sharp(input, { ...decoderOptions, pages: -1 }).metadata();
      if (!meta.width || !meta.height || meta.width * meta.height > MAX_IMAGE_PIXELS || (meta.pages ?? 1) !== 1 || !["png", "jpeg", "webp"].includes(meta.format ?? "")) throw new BadRequestException("Upload must be a single-frame PNG, JPEG or WebP image");
      const image = sharp(input, { ...decoderOptions, pages: 1 });
      const { data, info } = await image.rotate().raw().toBuffer({ resolveWithObject: true });
      const output = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).png({ compressionLevel: 9 }).toBuffer();
      if (!output.length || output.length > MAX_IMAGE_BYTES) throw new BadRequestException("Sanitized image exceeds 8 MiB");
      return output;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException("Image could not be safely decoded");
    }
  }

  async gallery(actor: ProjectActor, projectId: string) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    return this.database.prisma.$transaction(async (tx) => {
      await this.owner(tx, actor);
      const project = await this.project(tx, actor, projectId);
      const entries = await tx.galleryEntry.findMany({ where: { organizationId: actor.organizationId, projectId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const clients = await tx.clientPortalGrant.findMany({ where: { organizationId: actor.organizationId, projectId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, select: { id: true, primary: true, expiresAt: true } });
      const candidates = await tx.clientReviewItem.findMany({ where: { organizationId: actor.organizationId, projectId, revisionId: { not: null } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const eligible: Array<{ id: string; label: string; mime: string; grants: Array<{ portalGrantId: string; primary: boolean; expiresAt: Date | null }> }> = [];
      for (const item of candidates) {
        const revision = item.revisionId ? await tx.documentRevision.findFirst({ where: { id: item.revisionId, organizationId: actor.organizationId, projectId } }) : null;
        const blob = revision ? await tx.fileBlobMetadata.findFirst({ where: { id: revision.blobId, documentId: revision.fileId, organizationId: actor.organizationId } }) : null;
        if (!revision || !blob || !allowedSourceMime.has(blob.mimeType)) continue;
        const snapshot = item.snapshot as Record<string, unknown>;
        if (snapshot.revisionId !== revision.id || snapshot.blobId !== revision.blobId || snapshot.sha256 !== revision.sha256 || snapshot.fileId !== revision.fileId) continue;
        const grants = clients.filter((grant) => grant.primary);
        const explicitItems = clients.length ? await tx.clientItemGrant.findMany({ where: { portalGrantId: { in: clients.map((row) => row.id) }, itemId: item.id, view: true } }) : [];
        const grantExpiry = new Map((await tx.clientPortalGrant.findMany({ where: { id: { in: explicitItems.map((row) => row.portalGrantId) } }, select: { id: true, expiresAt: true } })).map((row) => [row.id, row.expiresAt]));
        const currentGrants = [...grants.map((grant) => ({ portalGrantId: grant.id, primary: true, expiresAt: grant.expiresAt })), ...explicitItems.map((grant) => ({ portalGrantId: grant.portalGrantId, primary: false, expiresAt: grantExpiry.get(grant.portalGrantId) ?? null }))];
        if (!currentGrants.length) continue;
        eligible.push({ id: item.id, label: item.label, mime: blob.mimeType, grants: currentGrants });
      }
      return { projectId: project.id, entries: entries.map((entry) => ({ id: entry.id, itemId: entry.itemId, label: entry.label, mime: eligible.find((item) => item.id === entry.itemId)?.mime ?? null, streamUrl: `/api/v1/client-portal/projects/${projectId}/gallery/items/${entry.itemId}/stream` })), eligibleItems: eligible.filter((item) => !entries.some((entry) => entry.itemId === item.id)) };
    });
  }

  async portfolioWorkspace(actor: ProjectActor, projectId: string) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    return this.database.prisma.$transaction(async (tx) => {
      await this.owner(tx, actor);
      await this.project(tx, actor, projectId);
      const raw = await tx.document.findMany({ where: { organizationId: actor.organizationId, projectId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true } });
      const sourceFiles = [];
      for (const file of raw) {
        try {
          const source = await this.publicSource(tx, actor, projectId, file.id);
          sourceFiles.push({ id: file.id, fileName: source.blob.fileName, mimeType: source.blob.mimeType, sizeBytes: Number(source.blob.sizeBytes), sha256: source.blob.sha256 });
        } catch (error) {
          if (error instanceof ForbiddenException || error instanceof NotFoundException) continue;
          throw error;
        }
      }
      const publications = await tx.portfolioPublication.findMany({ where: { organizationId: actor.organizationId, projectId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, title: true, altText: true, state: true, version: true, mime: true, size: true, sourceFileId: true, reason: true, createdAt: true, publishedAt: true, withdrawnAt: true } });
      return { projectId, sourceFiles, publications };
    }, { timeout: 30_000 });
  }

  async addEntry(actor: ProjectActor, projectId: string, input: { itemId: string; label: string; reason: string }) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    return this.database.prisma.$transaction(async (tx) => {
      await this.owner(tx, actor);
      const project = await this.project(tx, actor, projectId);
      const item = await tx.clientReviewItem.findFirst({ where: { id: input.itemId, organizationId: actor.organizationId, projectId } });
      const revision = item?.revisionId ? await tx.documentRevision.findFirst({ where: { id: item.revisionId, organizationId: actor.organizationId, projectId } }) : null;
      const blob = revision ? await tx.fileBlobMetadata.findFirst({ where: { id: revision.blobId, documentId: revision.fileId, organizationId: actor.organizationId } }) : null;
      if (!item || !revision || !blob || !allowedSourceMime.has(blob.mimeType)) throw new ForbiddenException("Gallery entries must use existing S14 PDF/image items");
      const snapshot = item.snapshot as Record<string, unknown>;
      if (snapshot.revisionId !== revision.id || snapshot.blobId !== revision.blobId || snapshot.sha256 !== revision.sha256 || snapshot.fileId !== revision.fileId) throw new ConflictException("Exact client-review file evidence does not match");
      const now = new Date();
      const clients = await tx.clientPortalGrant.findMany({ where: { organizationId: actor.organizationId, projectId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, select: { id: true, primary: true } });
      const visible = clients.some((grant) => grant.primary) || !!(clients.length && await tx.clientItemGrant.findFirst({ where: { portalGrantId: { in: clients.map((row) => row.id) }, itemId: item.id, view: true } }));
      if (!visible) throw new ConflictException("The review item has no current client view grant");
      try {
        const row = await tx.galleryEntry.create({ data: { organizationId: project.organizationId, projectId: project.id, itemId: item.id, label: input.label, createdById: actor.accountId, reason: input.reason } });
        await recordProjectEvent(tx, { organizationId: project.organizationId, actorId: actor.accountId, eventName: "gallery.entry_added", subjectType: "gallery_entry", subjectId: row.id, reason: input.reason, after: { projectId, entryId: row.id, itemId: item.id, label: row.label } });
        return { id: row.id, itemId: row.itemId, label: row.label, mime: blob.mimeType, streamUrl: `/api/v1/client-portal/projects/${projectId}/gallery/items/${item.id}/stream` };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("This client-review item is already in the project gallery");
        throw error;
      }
    }, { timeout: 30_000 });
  }

  async clientGallery(active: ActiveClientPortalSession, projectId: string) {
    return this.database.prisma.$transaction(async (tx) => {
      const { project } = await this.clientScope.authorizeProject(tx, active, projectId);
      const entries = await tx.galleryEntry.findMany({ where: { organizationId: project.organizationId, projectId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const result = [];
      for (const entry of entries) {
        try {
          const { item, project: current } = await this.clientScope.authorizeItem(tx, active, entry.itemId, "view");
          if (current.id !== project.id || !item.revisionId) continue;
          const revision = await tx.documentRevision.findFirst({ where: { id: item.revisionId, projectId: project.id, organizationId: project.organizationId } });
          const blob = revision ? await tx.fileBlobMetadata.findFirst({ where: { id: revision.blobId, documentId: revision.fileId, organizationId: project.organizationId } }) : null;
          const snapshot = item.snapshot as Record<string, unknown>;
          if (!revision || !blob || !allowedSourceMime.has(blob.mimeType) || snapshot.revisionId !== revision.id || snapshot.blobId !== revision.blobId || snapshot.sha256 !== revision.sha256 || snapshot.fileId !== revision.fileId) continue;
          if (project.status !== "CANCELLED" && (!revision.isCurrent || revision.state === "SUPERSEDED")) continue;
          result.push({ id: entry.id, itemId: entry.itemId, label: entry.label, mime: blob.mimeType, streamUrl: `/api/v1/client-portal/projects/${projectId}/gallery/items/${entry.itemId}/stream` });
        } catch (error) {
          if (error instanceof ForbiddenException || error instanceof NotFoundException) continue;
          throw error;
        }
      }
      return { projectId, items: result };
    }, { timeout: 30_000 });
  }

  async clientGalleryStream(active: ActiveClientPortalSession, projectId: string, itemId: string) {
    await this.database.prisma.$transaction(async (tx) => {
      const { project } = await this.clientScope.authorizeProject(tx, active, projectId);
      if (!await tx.galleryEntry.findFirst({ where: { organizationId: project.organizationId, projectId, itemId } })) throw new NotFoundException("Gallery item not found");
      await this.clientScope.authorizeItem(tx, active, itemId, "view");
    });
    return this.clientFiles.stream(active, itemId, false);
  }

  async prepare(actor: ProjectActor, projectId: string, input: { sourceFileId: string; title: string; altText: string; reason: string; imageBase64: string }) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    const image = await this.encodeImage(input.imageBase64);
    const source = await this.database.prisma.$transaction(async (tx) => {
      await this.owner(tx, actor);
      await this.project(tx, actor, projectId);
      return this.publicSource(tx, actor, projectId, input.sourceFileId);
    });
    const sha256 = createHash("sha256").update(image).digest("hex");
    const storage = await this.storage();
    const uploadId = randomUUID();
    await storage.writeChunk(uploadId, 0, image, sha256);
    const blob = await storage.finalize(uploadId, 1, image.length, sha256);
    const result = await this.database.prisma.$transaction(async (tx) => {
      await this.owner(tx, actor);
      const project = await this.project(tx, actor, projectId);
      const current = await this.publicSource(tx, actor, projectId, input.sourceFileId);
      if (current.blob.id !== source.blob.id || current.blob.sha256 !== source.blob.sha256) throw new ConflictException("Source file changed during derivative preparation");
      if (blob.key === source.blob.storageKey) throw new ConflictException("Public derivative must use a separate storage key");
      const row = await tx.portfolioPublication.create({ data: { organizationId: project.organizationId, projectId, sourceFileId: source.document.id, sourceBlobId: source.blob.id, title: input.title, altText: input.altText, storageKey: blob.key, sha256: blob.sha256, mime: "image/png", size: blob.size, createdById: actor.accountId, reason: input.reason } });
      await recordProjectEvent(tx, { organizationId: project.organizationId, actorId: actor.accountId, eventName: "portfolio.prepared", subjectType: "portfolio_publication", subjectId: row.id, reason: input.reason, after: { projectId, publicationId: row.id, sourceFileId: row.sourceFileId, sourceBlobId: row.sourceBlobId, sha256: row.sha256, mime: row.mime, size: row.size, version: row.version, state: row.state } });
      return { id: row.id, title: row.title, altText: row.altText, state: row.state, version: row.version, mime: row.mime, size: row.size };
    }, { timeout: 30_000 });
    await storage.discardUpload(uploadId).catch(() => undefined);
    return result;
  }

  async transition(actor: ProjectActor, publicationId: string, action: "publish" | "withdraw", input: { expectedVersion: number; reason: string }) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    return this.database.prisma.$transaction(async (tx) => {
      await this.owner(tx, actor);
      await tx.$queryRaw`SELECT "id" FROM "portfolio_publications" WHERE "id"=${publicationId}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR UPDATE`;
      const current = await tx.portfolioPublication.findFirst({ where: { id: publicationId, organizationId: actor.organizationId } });
      if (!current) throw new NotFoundException("Publication not found");
      const expectedState = action === "publish" ? PortfolioPublicationState.DRAFT : PortfolioPublicationState.PUBLISHED;
      if (current.version !== input.expectedVersion || current.state !== expectedState) throw new ConflictException("Publication state changed. Refresh and retry");
      if (action === "publish") {
        const source = await this.publicSource(tx, actor, current.projectId, current.sourceFileId);
        if (source.blob.id !== current.sourceBlobId || source.blob.storageKey === current.storageKey) throw new ConflictException("Exact publication source evidence does not match");
        const opened = await (await this.storage()).openBlob(current.storageKey);
        if (opened.size !== current.size) { opened.stream.destroy(); throw new ConflictException("Stored public derivative size does not match"); }
        opened.stream.destroy();
      }
      const nextState = action === "publish" ? PortfolioPublicationState.PUBLISHED : PortfolioPublicationState.WITHDRAWN;
      const changed = await tx.portfolioPublication.updateMany({ where: { id: current.id, organizationId: actor.organizationId, state: expectedState, version: input.expectedVersion }, data: { state: nextState, version: { increment: 1 }, ...(action === "publish" ? { publishedAt: new Date() } : { withdrawnAt: new Date() }) } });
      if (changed.count !== 1) throw new ConflictException("Publication state changed. Refresh and retry");
      const row = await tx.portfolioPublication.findUniqueOrThrow({ where: { id: current.id } });
      const eventId = await recordProjectEvent(tx, { organizationId: row.organizationId, actorId: actor.accountId, eventName: action === "publish" ? "portfolio.published" : "portfolio.withdrawn", subjectType: "portfolio_publication", subjectId: row.id, reason: input.reason, before: { state: current.state, version: current.version }, after: { projectId: row.projectId, publicationId: row.id, state: row.state, version: row.version, sourceFileId: row.sourceFileId, sourceBlobId: row.sourceBlobId, sha256: row.sha256, mime: row.mime, size: row.size } });
      await tx.publicationGrant.create({ data: { publicationId: row.id, organizationId: row.organizationId, projectId: row.projectId, actorId: actor.accountId, action: action === "publish" ? PublicationGrantAction.PUBLISHED : PublicationGrantAction.WITHDRAWN, reason: input.reason, fromVersion: current.version, toVersion: row.version, eventId } });
      return { id: row.id, state: row.state, version: row.version, ...(row.publishedAt ? { publishedAt: row.publishedAt } : {}), ...(row.withdrawnAt ? { withdrawnAt: row.withdrawnAt } : {}) };
    }, { timeout: 30_000 });
  }

  async publicList() {
    return this.database.prisma.$transaction(async (tx) => {
      const rows = await tx.portfolioPublication.findMany({ where: { state: PortfolioPublicationState.PUBLISHED }, orderBy: [{ publishedAt: "desc" }, { id: "asc" }] });
      const items = [];
      for (const row of rows) {
        await tx.$queryRaw`SELECT "id" FROM "portfolio_publications" WHERE "id"=${row.id}::uuid AND "state"='PUBLISHED' FOR SHARE`;
        const current = await tx.portfolioPublication.findFirst({ where: { id: row.id, state: PortfolioPublicationState.PUBLISHED, version: row.version } });
        if (current && await this.currentPublicationGrant(tx, row.id, row.version) && await this.publicEligible(tx, row)) items.push({ id: row.id, title: row.title, altText: row.altText, mime: row.mime, streamUrl: `/api/v1/public/portfolio/${row.id}/stream` });
      }
      return { items };
    }, { timeout: 30_000 });
  }

  async publicDerivative(publicationId: string) {
    const snapshot = await this.database.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "portfolio_publications" WHERE "id"=${publicationId}::uuid FOR SHARE`;
      const row = await tx.portfolioPublication.findFirst({ where: { id: publicationId, state: PortfolioPublicationState.PUBLISHED } });
      if (!row || !await this.currentPublicationGrant(tx, row.id, row.version) || !await this.publicEligible(tx, row)) throw new NotFoundException("Publication not found");
      return row;
    });
    if (!snapshot) throw new NotFoundException("Publication not found");
    const opened = await (await this.storage()).openBlob(snapshot.storageKey);
    const parts: Buffer[] = [];
    let size = 0;
    try {
      for await (const part of opened.stream) {
        const bytes = Buffer.isBuffer(part) ? part : Buffer.from(part);
        size += bytes.length;
        if (size > MAX_IMAGE_BYTES) throw new ConflictException("Stored derivative exceeds its limit");
        parts.push(bytes);
      }
    } catch (error) { throw error instanceof ConflictException ? error : new ServiceUnavailableException("Published image is unavailable"); }
    const bytes = Buffer.concat(parts);
    if (size !== snapshot.size || createHash("sha256").update(bytes).digest("hex") !== snapshot.sha256) throw new ConflictException("Stored public derivative checksum does not match");
    const current = await this.database.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "portfolio_publications" WHERE "id"=${publicationId}::uuid FOR SHARE`;
      const row = await tx.portfolioPublication.findFirst({ where: { id: publicationId, state: PortfolioPublicationState.PUBLISHED, version: snapshot.version, storageKey: snapshot.storageKey, sha256: snapshot.sha256 } });
      return row && await this.currentPublicationGrant(tx, row.id, row.version) && await this.publicEligible(tx, row) ? row : null;
    });
    if (!current) throw new NotFoundException("Publication not found");
    return { bytes, mime: "image/png" };
  }
}

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { AccountKind, AccountState, ApprovalRequestState, EmployeeState, Prisma, type ApprovalRequest } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { Inject } from "@nestjs/common";
import { LibraryStorage } from "./library-storage.js";
import { DOCUMENT_CHUNK_SIZE, DOCUMENT_MAX_BYTES, validateDocumentFile, validateFirstChunk } from "./document-file-policy.js";
import { recordProjectEvent } from "./project-events.js";
import type { ProjectActor } from "./project.service.js";
import { TaskService } from "./task.service.js";
import { ApprovalService, type ApprovalHandler } from "./approval.service.js";
import { sanitizeTrainingAssessmentContent, validateTrainingAssessmentContent } from "./training-content.js";

type Tx = Prisma.TransactionClient;
type SessionActor = ProjectActor & { sessionId?: string };
type EmployeeRow = { id: string; accountId: string; organizationId: string; state: EmployeeState; homeBranchId: string; homeTeamId: string };
type Audience = "ORGANIZATION" | "BRANCH" | "TEAM";
type LibraryKind = "SOP" | "KNOWLEDGE" | "MODULE";
type LibraryBlock = Record<string, unknown>;
type UploadManifest = { operation: "library.upload.start"; recordId: string; name: string; mime: string; bytes: number; chunkCount: number; extension: string; reason: string };

const reasonValid = (value: string) => typeof value === "string" && value.trim().length >= 3 && value.length <= 1000;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const asJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const allowedMimeByExtension: Record<string, string> = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
};

function exactObject(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException(`Invalid ${label}`);
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !keys.includes(key)) || keys.some((key) => !(key in row))) throw new BadRequestException(`Invalid ${label}`);
  return row;
}

function safeText(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.length <= max && !Array.from(value).some((character) => { const code = character.charCodeAt(0); return code <= 8 || code === 11 || code === 12 || code >= 14 && code <= 31 || code === 127; }) && !/<\s*\/?\s*[a-z!][^>]*>/i.test(value);
}

function contentShape(value: unknown, allowAssessment: boolean): { blocks: LibraryBlock[]; assessment?: Record<string, unknown> } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException("Invalid library content");
  const root = value as Record<string, unknown>;
  if (!Array.isArray(root.blocks) || Object.keys(root).some((key) => key !== "blocks" && !(allowAssessment && key === "assessment"))) throw new BadRequestException("Invalid library content");
  if (!Array.isArray(root.blocks) || root.blocks.length < 1 || root.blocks.length > 80) throw new BadRequestException("Library content needs 1 to 80 blocks");
  const blocks: LibraryBlock[] = root.blocks.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || typeof (raw as { type?: unknown }).type !== "string") throw new BadRequestException("Invalid library content block");
    const type = (raw as { type: string }).type;
    let block: Record<string, unknown>;
    if (type === "TEXT") {
      block = exactObject(raw, ["type", "text"], "text block"); if (!safeText(block.text, 1, 2000)) throw new BadRequestException("Invalid library text");
    } else if (["IMAGE", "PDF", "VIDEO", "FILE", "TEMPLATE"].includes(type)) {
      block = exactObject(raw, ["type", "fileId"], "file block"); if (typeof block.fileId !== "string" || !/^[0-9a-f-]{36}$/i.test(block.fileId)) throw new BadRequestException("Invalid library file reference");
    } else if (type === "LINK") {
      block = exactObject(raw, ["type", "url", "label"], "link block");
      if (typeof block.url !== "string" || block.url.length > 2048 || !safeText(block.label, 1, 160)) throw new BadRequestException("Invalid library link");
      let url: URL; try { url = new URL(block.url); } catch { throw new BadRequestException("Invalid library link"); }
      if (!new Set(["http:", "https:"]).has(url.protocol) || url.username || url.password) throw new BadRequestException("Only HTTP(S) links are allowed");
    } else if (type === "CHECKLIST") {
      block = exactObject(raw, ["type", "items"], "checklist block");
      if (!Array.isArray(block.items) || block.items.length < 1 || block.items.length > 30 || block.items.some((item) => !safeText(item, 1, 500))) throw new BadRequestException("Invalid library checklist");
    } else if (type === "SOP") {
      block = exactObject(raw, ["type", "versionId"], "SOP block"); if (typeof block.versionId !== "string" || !/^[0-9a-f-]{36}$/i.test(block.versionId)) throw new BadRequestException("Invalid SOP version reference");
    } else throw new BadRequestException("Unsupported library content block");
    return block;
  });
  const content: { blocks: LibraryBlock[]; assessment?: Record<string, unknown> } = { blocks };
  if ("assessment" in root) {
    if (!allowAssessment) throw new BadRequestException("Assessments are only valid in MODULE content");
    const assessment = validateTrainingAssessmentContent({ blocks, assessment: root.assessment });
    if (assessment) content.assessment = assessment;
  }
  if (Buffer.byteLength(JSON.stringify(content), "utf8") > 6000) throw new BadRequestException("Library content is too large");
  return content;
}

function fileReferences(content: unknown): Array<{ fileId: string; type: string }> {
  if (!content || typeof content !== "object" || !Array.isArray((content as { blocks?: unknown }).blocks)) return [];
  return ((content as { blocks: Array<Record<string, unknown>> }).blocks)
    .filter((block) => typeof block.fileId === "string")
    .map((block) => ({ fileId: String(block.fileId), type: String(block.type) }));
}

function auditContent(content: { blocks: LibraryBlock[]; assessment?: Record<string, unknown> }, kind: string) {
  if (kind !== "MODULE") return content;
  const safe = sanitizeTrainingAssessmentContent(content, { revealAnswerKey: true });
  if (safe.assessment && Array.isArray(safe.assessment.quiz)) for (const question of safe.assessment.quiz) if (question && typeof question === "object") delete (question as Record<string, unknown>).correctOptionIds;
  return safe;
}

function firstBytesAllowed(extension: string, bytes: Buffer): void {
  validateFirstChunk(extension, bytes);
  const prefix = bytes.subarray(0, 512).toString("latin1").replace(/^\uFEFF/, "").trimStart().toLowerCase();
  if (/^(?:<!doctype\s+html|<html\b|<head\b|<body\b|<script\b|<svg\b|javascript:)/i.test(prefix)) throw new BadRequestException("HTML or active content is not allowed");
  if (extension === "mp4" || extension === "mov") {
    if (bytes.length < 8 || bytes.subarray(4, 8).toString() !== "ftyp") throw new BadRequestException("Video content does not match its name");
  } else if (extension === "webm" && bytes.subarray(0, 4).toString("hex") !== "1a45dfa3") throw new BadRequestException("Video content does not match its name");
}

@Injectable()
export class LibraryService {
  private storagePromise: Promise<LibraryStorage> | undefined;
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService, private readonly tasks: TaskService, private readonly approvals: ApprovalService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {
    this.approvals.registerHandler(this.publicationHandler());
  }
  private get db() { return this.database.prisma; }

  private async transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    try { return await this.db.$transaction(fn, { timeout: 30000 }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) throw new ConflictException("Library data changed. Refresh and retry");
      throw error;
    }
  }

  private async active(tx: Tx, actor: SessionActor): Promise<EmployeeRow | null> {
    if (!actor.sessionId) throw new ForbiddenException("Current session required");
    await tx.$queryRaw`SELECT id FROM accounts WHERE id=${actor.accountId}::uuid FOR SHARE`;
    const account = await tx.account.findUnique({ where: { id: actor.accountId }, include: { employee: true } });
    const now = Date.now(), session = await tx.session.findUnique({ where: { id: actor.sessionId } });
    if (!account || account.state !== AccountState.ACTIVE || account.kind !== actor.kind || account.kind !== AccountKind.OWNER && account.kind !== AccountKind.STAFF || !session || session.accountId !== actor.accountId || session.revokedAt || session.expiresAt.getTime() <= now || session.lastUsedAt.getTime() + 1_800_000 <= now) throw new ForbiddenException("Current active session required");
    const organization = await tx.organization.findFirst({ select: { id: true } });
    if (!organization || organization.id !== actor.organizationId) throw new ForbiddenException("Active organization required");
    if (actor.kind === AccountKind.STAFF && (!account.employee || account.employee.state !== EmployeeState.ACTIVE || account.employee.organizationId !== organization.id)) throw new ForbiddenException("Active employee required");
    return account.employee;
  }

  private scope(audience: Audience, organizationId: string, branchId: string | null, teamId: string | null) {
    if (audience === "ORGANIZATION") return { kind: "ORGANIZATION" as const, organizationId };
    if (audience === "BRANCH" && branchId) return { kind: "BRANCH" as const, organizationId, branchId };
    if (audience === "TEAM" && branchId && teamId) return { kind: "TEAM" as const, organizationId, branchId, teamId };
    throw new ConflictException("Library audience is invalid");
  }

  private async permission(tx: Tx, actor: SessionActor, key: "library.view" | "library.manage", audience: Audience, branchId: string | null, teamId: string | null): Promise<boolean> {
    if (actor.kind === AccountKind.OWNER) return true;
    const scope = this.scope(audience, actor.organizationId, branchId, teamId);
    const employee = await tx.employee.findUnique({ where: { accountId: actor.accountId } });
    if (!employee || employee.state !== EmployeeState.ACTIVE || audience !== "ORGANIZATION" && (branchId !== employee.homeBranchId || audience === "TEAM" && teamId !== employee.homeTeamId)) return false;
    try { await this.authorization.assertPermission(actor.accountId, key, scope, tx); return true; }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
  }

  private async canManage(tx: Tx, actor: SessionActor, record: { audience: string; branchId: string | null; teamId: string | null }): Promise<boolean> {
    if (record.audience !== "ORGANIZATION" && record.audience !== "BRANCH" && record.audience !== "TEAM") return false;
    return this.permission(tx, actor, "library.manage", record.audience, record.branchId, record.teamId);
  }

  private async canView(tx: Tx, actor: SessionActor, record: { id: string; kind: string; audience: string; branchId: string | null; teamId: string | null; createdById: string; publishedVersionId: string | null }): Promise<boolean> {
    if (record.publishedVersionId && ["ORGANIZATION", "BRANCH", "TEAM"].includes(record.audience) && await this.permission(tx, actor, "library.view", record.audience as Audience, record.branchId, record.teamId)) return true;
    const ownDraft = record.createdById === actor.accountId && !record.publishedVersionId && actor.kind === AccountKind.STAFF;
    if (ownDraft) return this.canReadCurrentDraft(tx, actor, { ...record, version: 1 });
    return !record.publishedVersionId && await this.canManage(tx, actor, record);
  }

  private async canReadCurrentDraft(tx: Tx, actor: SessionActor, record: { id: string; kind: string; audience: string; branchId: string | null; teamId: string | null; createdById: string; version: number; publishedVersionId: string | null }): Promise<boolean> {
    const published = record.publishedVersionId ? await tx.libraryVersion.findFirst({ where: { id: record.publishedVersionId, recordId: record.id }, select: { version: true } }) : null;
    if (published?.version === record.version) return false;
    try { await this.authorAuthority(tx, actor, record); return true; }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
  }

  private async canReadAssessmentAnswers(tx: Tx, actor: SessionActor, record: { kind: string; audience: string; branchId: string | null; teamId: string | null; createdById: string }): Promise<boolean> {
    if (record.kind !== "MODULE") return false;
    if (await this.canManage(tx, actor, record)) return true;
    if (record.createdById !== actor.accountId) return false;
    try { await this.authorAuthority(tx, actor, record); return true; }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
  }

  private async canAuthorRecord(tx: Tx, actor: SessionActor, record: { kind: string; audience: string; branchId: string | null; teamId: string | null; createdById: string }): Promise<boolean> {
    try { await this.authorAuthority(tx, actor, record); return true; }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
  }

  private async eligiblePublishers(tx: Tx, actor: SessionActor, record: { audience: string; branchId: string | null; teamId: string | null }, excludedAccountIds: Set<string>): Promise<Array<{ accountId: string; label: string }>> {
    if (actor.kind === AccountKind.OWNER) return [];
    const staff = await tx.employee.findMany({ where: { organizationId: actor.organizationId, state: EmployeeState.ACTIVE, account: { state: AccountState.ACTIVE, kind: AccountKind.STAFF } }, select: { accountId: true, employeeCode: true, account: { select: { normalizedEmail: true } } } });
    // Organization is a singleton tenant and Owners have no organization FK; include active Owner identities for this publication workflow.
    const owners = await tx.account.findMany({ where: { kind: AccountKind.OWNER, state: AccountState.ACTIVE }, orderBy: [{ normalizedEmail: "asc" }, { id: "asc" }], select: { id: true, normalizedEmail: true } });
    const ids: Array<{ accountId: string; label: string }> = [];
    for (const employee of staff) {
      if (excludedAccountIds.has(employee.accountId)) continue;
      const candidate = { accountId: employee.accountId, organizationId: actor.organizationId, kind: AccountKind.STAFF } as SessionActor;
      if (await this.permission(tx, candidate, "library.manage", record.audience as Audience, record.branchId, record.teamId) && await this.permission(tx, candidate, "library.view", record.audience as Audience, record.branchId, record.teamId)) ids.push({ accountId: employee.accountId, label: employee.employeeCode || employee.account.normalizedEmail });
    }
    for (const owner of owners) if (!excludedAccountIds.has(owner.id)) ids.push({ accountId: owner.id, label: owner.normalizedEmail });
    return ids;
  }

  private async authorAuthority(tx: Tx, actor: SessionActor, record: { kind: string; audience: string; branchId: string | null; teamId: string | null; createdById: string }): Promise<void> {
    const employee = await this.active(tx, actor);
    if (actor.kind === AccountKind.OWNER) return;
    if (record.kind === "KNOWLEDGE" && record.createdById === actor.accountId && employee) {
      if (record.audience === "ORGANIZATION" || record.branchId === employee.homeBranchId && (record.audience === "BRANCH" || record.audience === "TEAM" && record.teamId === employee.homeTeamId)) return;
    }
    if (!await this.canManage(tx, actor, record)) throw new ForbiddenException("Current library management access required");
  }

  private async validateAudience(tx: Tx, actor: SessionActor, employee: EmployeeRow | null, input: { kind: LibraryKind; audience: Audience; branchId?: string; teamId?: string }) {
    if (input.audience === "ORGANIZATION") {
      if (input.branchId !== undefined || input.teamId !== undefined) throw new BadRequestException("Organization audience has no branch or team");
    } else if (input.audience === "BRANCH") {
      if (!input.branchId || input.teamId !== undefined || !await tx.branch.findFirst({ where: { id: input.branchId, organizationId: actor.organizationId, active: true } })) throw new BadRequestException("Select an active branch");
    } else if (!input.branchId || !input.teamId || !await tx.team.findFirst({ where: { id: input.teamId, branchId: input.branchId, organizationId: actor.organizationId, active: true } })) throw new BadRequestException("Select an active team and its branch");

    const row = { kind: input.kind, audience: input.audience, branchId: input.branchId ?? null, teamId: input.teamId ?? null, createdById: actor.accountId };
    if (actor.kind === AccountKind.OWNER) return row;
    const ownKnowledge = input.kind === "KNOWLEDGE" && !!employee && (input.audience === "ORGANIZATION" || input.branchId === employee.homeBranchId && (input.audience === "BRANCH" || input.teamId === employee.homeTeamId));
    if (ownKnowledge) return row;
    if (!await this.canManage(tx, actor, row)) throw new ForbiddenException("Current library management access required");
    return row;
  }

  private async validateContent(tx: Tx, actor: SessionActor, record: { id: string; organizationId: string; kind: string }, input: unknown) {
    const content = contentShape(input, record.kind === "MODULE");
    if (record.kind === "MODULE" && !("assessment" in content)) validateTrainingAssessmentContent(content);
    const refs = fileReferences(content);
    if (refs.length) {
      const ids = [...new Set(refs.map((x) => x.fileId))];
      const files = await tx.libraryFile.findMany({ where: { id: { in: ids }, recordId: record.id, organizationId: record.organizationId }, select: { id: true, mime: true } });
      if (files.length !== ids.length) throw new BadRequestException("Every library file must belong to this record");
      const byId = new Map(files.map((file) => [file.id, file.mime]));
      for (const ref of refs) {
        const mime = byId.get(ref.fileId)!;
        const matches = ref.type === "IMAGE" ? mime.startsWith("image/") : ref.type === "PDF" ? mime === "application/pdf" : ref.type === "VIDEO" ? mime.startsWith("video/") : ref.type === "TEMPLATE" ? mime.includes("officedocument") : true;
        if (!matches) throw new BadRequestException("Library file media does not match its block type");
      }
    }
    for (const block of content.blocks) if (block.type === "SOP") {
      const versionId = String(block.versionId);
      const version = await tx.libraryVersion.findFirst({ where: { id: versionId, organizationId: record.organizationId }, select: { id: true, recordId: true } });
      if (!version || version.recordId === record.id) throw new BadRequestException("SOP reference is unavailable");
      const target = await tx.libraryRecord.findFirst({ where: { id: version.recordId, organizationId: record.organizationId } });
      if (!target || target.kind !== "SOP" || !await this.publishedVersion(tx, record.organizationId, target.id, version.id) || !await this.permission(tx, actor, "library.view", target.audience as Audience, target.branchId, target.teamId)) throw new BadRequestException("SOP reference is unavailable");
    }
    return content;
  }

  private async record(tx: Tx, actor: SessionActor, recordId: string, lock = false) {
    if (lock) await tx.$queryRaw`SELECT id FROM library_records WHERE id=${recordId}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR UPDATE`;
    const row = await tx.libraryRecord.findFirst({ where: { id: recordId, organizationId: actor.organizationId } });
    if (!row) throw new NotFoundException("Library record not found");
    return row;
  }

  private async publishedVersion(tx: Tx, organizationId: string, recordId: string, versionId: string) {
    return tx.libraryPublication.findFirst({ where: { organizationId, recordId, versionId }, select: { id: true, versionId: true } });
  }

  private async publicationContext(tx: Tx, request: ApprovalRequest) {
    const context = request.context as { recordId?: unknown; versionId?: unknown; approverAccountId?: unknown };
    if (request.typeKey !== "library.publish" || request.sourceType !== "library_version" || typeof context.recordId !== "string" || typeof context.versionId !== "string" || typeof context.approverAccountId !== "string") throw new NotFoundException("Publication request not found");
    const record = await tx.libraryRecord.findFirst({ where: { id: context.recordId, organizationId: request.organizationId } });
    const version = await tx.libraryVersion.findFirst({ where: { id: context.versionId, recordId: context.recordId, organizationId: request.organizationId } });
    if (!record || !version || request.sourceId !== version.id || request.sourceGeneration !== version.version || record.kind === "MODULE") throw new NotFoundException("Publication request not found");
    return { context, record, version };
  }

  private publicationHandler(): ApprovalHandler {
    const eligible = async (tx: Tx, actor: { accountId: string; organizationId: string }, record: { audience: string; branchId: string | null; teamId: string | null }, accountId: string) => {
      if (actor.accountId !== accountId) return false;
      const account = await tx.account.findUnique({ where: { id: accountId }, select: { kind: true, state: true } });
      if (!account || account.state !== AccountState.ACTIVE || account.kind !== AccountKind.STAFF && account.kind !== AccountKind.OWNER) return false;
      if (account.kind === AccountKind.OWNER) return true;
      if (!new Set(["ORGANIZATION", "BRANCH", "TEAM"]).has(record.audience)) return false;
      return await this.permission(tx, { ...actor, kind: AccountKind.STAFF }, "library.manage", record.audience as Audience, record.branchId, record.teamId)
        && await this.permission(tx, { ...actor, kind: AccountKind.STAFF }, "library.view", record.audience as Audience, record.branchId, record.teamId);
    };
    return {
      typeKey: "library.publish",
      canSelfApprove: false,
      resolveApprover: async (tx, actor, input) => {
        const context = input.context as { recordId?: unknown; versionId?: unknown; approverAccountId?: unknown };
        if (input.sourceType !== "library_version" || typeof context.recordId !== "string" || typeof context.versionId !== "string" || typeof context.approverAccountId !== "string") throw new ForbiddenException("Invalid Library publication request");
        const record = await tx.libraryRecord.findFirst({ where: { id: context.recordId, organizationId: actor.organizationId } });
        const version = await tx.libraryVersion.findFirst({ where: { id: context.versionId, recordId: context.recordId, organizationId: actor.organizationId } });
        if (!record || !version || record.kind === "MODULE" || input.sourceId !== version.id || input.sourceGeneration !== version.version || typeof context.approverAccountId !== "string") throw new NotFoundException("Library version not found");
        const requester = await tx.account.findUnique({ where: { id: actor.accountId }, select: { kind: true, state: true, employee: { select: { state: true, organizationId: true, homeBranchId: true, homeTeamId: true } } } });
        if (!requester || requester.state !== AccountState.ACTIVE || requester.kind !== AccountKind.OWNER && (requester.kind !== AccountKind.STAFF || requester.employee?.state !== EmployeeState.ACTIVE || requester.employee.organizationId !== actor.organizationId)) throw new ForbiddenException("Active Library author required");
        if (requester.kind !== AccountKind.OWNER) {
          const scoped = await this.permission(tx, { ...actor, kind: AccountKind.STAFF }, "library.manage", record.audience as Audience, record.branchId, record.teamId);
          const ownKnowledgeSuggestion = record.kind === "KNOWLEDGE" && record.createdById === actor.accountId && requester.employee && (record.audience === "ORGANIZATION" || record.branchId === requester.employee.homeBranchId && (record.audience === "BRANCH" || record.audience === "TEAM" && record.teamId === requester.employee.homeTeamId));
          if (!scoped && !ownKnowledgeSuggestion) throw new ForbiddenException("Current Library author authority required");
        }
        if (version.actorId === context.approverAccountId || actor.accountId === context.approverAccountId || !await eligible(tx, { accountId: context.approverAccountId, organizationId: actor.organizationId }, record, context.approverAccountId)) throw new ForbiddenException("A different authorized publisher is required");
        return { accountId: context.approverAccountId, level: "Library publisher" };
      },
      canView: async (tx, actor, request) => {
        try { const { context, record, version } = await this.publicationContext(tx, request); return await eligible(tx, actor, record, context.approverAccountId as string) && version.actorId !== actor.accountId; }
        catch { return false; }
      },
      canDecide: async (tx, actor, request, { delegated }) => {
        if (delegated) return false;
        try { const { context, record, version } = await this.publicationContext(tx, request); return context.approverAccountId === actor.accountId && version.actorId !== actor.accountId && await eligible(tx, actor, record, actor.accountId); }
        catch { return false; }
      },
      canWithdraw: async () => false,
      projectCard: async (tx, request) => { const { record, version } = await this.publicationContext(tx, request); return { title: `Publish ${record.kind.toLowerCase()}`, summary: record.title, subjectLabel: `Version ${version.version}`, requesterLabel: "Library author", levelLabel: "Library publisher" }; },
      onDecision: async (tx, request, decision, deciderId) => {
        if (decision.outcome !== "APPROVED") return;
        const { record, version } = await this.publicationContext(tx, request);
        await this.publishVersion(tx, { accountId: deciderId, organizationId: request.organizationId }, record, version, decision.reason, request.id);
      }
    };
  }

  private async publishVersion(tx: Tx, actor: { accountId: string; organizationId: string }, record: { id: string; kind: string; version: number; publishedVersionId: string | null }, version: { id: string; version: number }, reason: string, approvalRequestId: string | null) {
    await tx.$queryRaw`SELECT id FROM library_records WHERE id=${record.id}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR UPDATE`;
    const current = await tx.libraryRecord.findFirst({ where: { id: record.id, organizationId: actor.organizationId } });
    if (!current || version.version > current.version) throw new ConflictException("Library version is unavailable");
    const publications = await tx.libraryPublication.findMany({ where: { recordId: record.id, organizationId: actor.organizationId }, select: { versionId: true } });
    const published = publications.length ? await tx.libraryVersion.findMany({ where: { id: { in: publications.map((publication) => publication.versionId) }, recordId: record.id }, select: { id: true, version: true } }) : [];
    const latestVersion = published.reduce<{ id: string; version: number } | null>((latest, candidate) => !latest || candidate.version > latest.version ? candidate : latest, null);
    if (latestVersion && latestVersion.version > version.version) throw new ConflictException("A newer Library version is already published");
    if (current.publishedVersionId === version.id) return { recordId: record.id, versionId: version.id, publicationId: (await this.publishedVersion(tx, actor.organizationId, record.id, version.id))?.id, alreadyPublished: true };
    const publicationId = randomUUID();
    const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "library.published", subjectType: "library_record", subjectId: record.id, reason, after: { publicationId, versionId: version.id, approvalRequestId } });
    await tx.libraryPublication.create({ data: { id: publicationId, organizationId: actor.organizationId, recordId: record.id, versionId: version.id, approvalRequestId, actorId: actor.accountId, reason, eventId } });
    await tx.libraryRecord.update({ where: { id: record.id }, data: { publishedVersionId: version.id } });
    return { recordId: record.id, versionId: version.id, publicationId, approvalRequestId };
  }

  private async command<T>(actor: SessionActor, commandId: string, op: string, payload: unknown, fn: (tx: Tx) => Promise<T>, reauthorize: (tx: Tx) => Promise<void> = async () => undefined): Promise<T> {
    if (!/^[0-9a-f-]{36}$/i.test(commandId)) throw new BadRequestException("Invalid command ID");
    return this.transaction(async (tx) => {
      await this.active(tx, actor);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":library:" + actor.accountId + ":" + commandId},0))`;
      await reauthorize(tx);
      const prior = await tx.learningReceipt.findUnique({ where: { actorId_commandId: { actorId: actor.accountId, commandId } } });
      const payloadHash = hash({ op, payload });
      if (prior) { if (prior.payloadHash !== payloadHash) throw new ConflictException("Command ID was used with different values"); await this.active(tx, actor); return prior.result as T; }
      const result = await fn(tx); await this.active(tx, actor);
      await tx.learningReceipt.create({ data: { organizationId: actor.organizationId, actorId: actor.accountId, commandId, payloadHash, result: asJson(result) } });
      return result;
    });
  }

  async setup(actor: SessionActor) {
    return this.transaction(async (tx) => {
      const employee = await this.active(tx, actor);
      const branches = actor.kind === AccountKind.OWNER ? await tx.branch.findMany({ where: { organizationId: actor.organizationId, active: true }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true } }) : employee ? await tx.branch.findMany({ where: { id: employee.homeBranchId, organizationId: actor.organizationId, active: true }, select: { id: true, name: true } }) : [];
      const teams = actor.kind === AccountKind.OWNER ? await tx.team.findMany({ where: { organizationId: actor.organizationId, active: true, branch: { active: true } }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, branchId: true } }) : employee ? await tx.team.findMany({ where: { id: employee.homeTeamId, branchId: employee.homeBranchId, active: true }, select: { id: true, name: true, branchId: true } }) : [];
      const scopes: Array<{ audience: Audience; branchId: string | null; teamId: string | null; label: string }> = actor.kind === AccountKind.OWNER
        ? [{ audience: "ORGANIZATION", branchId: null, teamId: null, label: "Organization" }, ...branches.map((branch) => ({ audience: "BRANCH" as const, branchId: branch.id, teamId: null, label: branch.name })), ...teams.map((team) => ({ audience: "TEAM" as const, branchId: team.branchId, teamId: team.id, label: team.name }))]
        : employee ? [{ audience: "ORGANIZATION", branchId: null, teamId: null, label: "Organization" }, ...branches.map((branch) => ({ audience: "BRANCH" as const, branchId: branch.id, teamId: null, label: branch.name })), ...teams.map((team) => ({ audience: "TEAM" as const, branchId: team.branchId, teamId: team.id, label: team.name }))] : [];
      const managedScopes = [];
      for (const scope of scopes) if (actor.kind === AccountKind.OWNER || await this.permission(tx, actor, "library.manage", scope.audience, scope.branchId, scope.teamId)) managedScopes.push(scope);
      const knowledgeScopes = actor.kind === AccountKind.STAFF && employee ? scopes : managedScopes;
      const authorAudienceOptions = { SOP: managedScopes, KNOWLEDGE: [...new Map([...managedScopes, ...knowledgeScopes].map((scope) => [`${scope.audience}:${scope.branchId}:${scope.teamId}`, scope])).values()], MODULE: managedScopes };
      const referenceTargets: { tasks: Array<{ id: string; title: string }>; templateVersions: Array<{ id: string; name: string; version: number }>; sopVersions: Array<{ id: string; title: string; version: number }> } = { tasks: [], templateVersions: [], sopVersions: [] };
      const sopRecords = await tx.libraryRecord.findMany({ where: { organizationId: actor.organizationId, kind: "SOP", publishedVersionId: { not: null } }, orderBy: [{ title: "asc" }, { id: "asc" }] });
      for (const sop of sopRecords) {
        if (!await this.permission(tx, actor, "library.view", sop.audience as Audience, sop.branchId, sop.teamId)) continue;
        const published = await tx.libraryPublication.findMany({ where: { organizationId: actor.organizationId, recordId: sop.id }, select: { versionId: true } });
        const exactVersions = await tx.libraryVersion.findMany({ where: { id: { in: published.map(row => row.versionId) }, recordId: sop.id }, orderBy: [{ version: "desc" }, { id: "asc" }], select: { id: true, version: true } });
        referenceTargets.sopVersions.push(...exactVersions.map(version => ({ id: version.id, title: sop.title, version: version.version })));
      }
      const candidates = await tx.task.findMany({ where: { organizationId: actor.organizationId, OR: [{ projectId: null }, { project: { status: "ACTIVE", branch: { active: true } } }, { type: "CLOSEOUT", project: { status: "CANCELLED", branch: { active: true } } }] }, orderBy: [{ title: "asc" }, { id: "asc" }], take: 200, select: { id: true, title: true } });
      for (const task of candidates) {
        try { await this.tasks.assertSopReferenceAuthority(tx, actor, task.id); referenceTargets.tasks.push({ id: task.id, title: task.title }); }
        catch (error) { if (!(error instanceof ForbiddenException) && !(error instanceof NotFoundException) && !(error instanceof ConflictException)) throw error; }
      }
      let templateAllowed = false;
      try { await this.authorization.assertPermission(actor.accountId, "template.manage", { kind: "ORGANIZATION", organizationId: actor.organizationId }, tx); templateAllowed = true; } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
      if (templateAllowed) {
        const versions = await tx.projectTemplateVersion.findMany({ where: { organizationId: actor.organizationId, template: { active: true } }, orderBy: [{ template: { name: "asc" } }, { number: "desc" }, { id: "asc" }], take: 200, select: { id: true, number: true, template: { select: { name: true } } } });
        referenceTargets.templateVersions = versions.map(version => ({ id: version.id, name: version.template.name, version: version.number }));
      }
      return { kinds: ["SOP", "KNOWLEDGE", "MODULE"], audiences: ["ORGANIZATION", "BRANCH", "TEAM"], branches, teams, authorAudienceOptions, referenceTargets, categories: { SOP: ["Site measurement", "Drawing standards", "File naming", "Design review", "BOQ", "Site inspection", "Material approval", "Handover", "Company policy"], KNOWLEDGE: ["SOPs", "Design standards", "Construction details", "Materials", "Vendor information", "Lessons learned", "Common mistakes", "Software guidance", "Policies"], MODULE: [] }, capabilities: { createKnowledgeSuggestion: true, activateModule: managedScopes.length > 0 } };
    });
  }

  async list(actor: SessionActor, input: { kind?: LibraryKind; search?: string }) {
    return this.transaction(async (tx) => {
      await this.active(tx, actor);
      if (input.search !== undefined && input.search.length > 120) throw new BadRequestException("Search is too long");
      const rows = await tx.libraryRecord.findMany({ where: { organizationId: actor.organizationId, ...(input.kind ? { kind: input.kind } : {}) }, orderBy: [{ title: "asc" }, { id: "asc" }] });
      const search = input.search?.trim().toLocaleLowerCase("en-US");
      const items = [];
      for (const row of rows) {
        const version = row.publishedVersionId ? await tx.libraryVersion.findFirst({ where: { id: row.publishedVersionId, recordId: row.id, organizationId: actor.organizationId } }) : null;
        const canReadPublished = !!version && await this.canView(tx, actor, row);
        const canReadDraft = await this.canReadCurrentDraft(tx, actor, row);
        if (!canReadPublished && !canReadDraft) continue;
        const draftVersion = canReadDraft ? await tx.libraryVersion.findFirst({ where: { recordId: row.id, organizationId: actor.organizationId, version: row.version } }) : null;
        const revealAnswerKey = await this.canReadAssessmentAnswers(tx, actor, row);
        const safeSearchContent = (content: Prisma.JsonValue) => row.kind === "MODULE" ? sanitizeTrainingAssessmentContent(content as Record<string, unknown>, { revealAnswerKey }) : content;
        const searchContent = [canReadPublished && version ? JSON.stringify(safeSearchContent(version.content)) : "", draftVersion ? JSON.stringify(safeSearchContent(draftVersion.content)) : ""].join("\n");
        if (search && !`${row.title}\n${row.category}\n${searchContent}`.toLocaleLowerCase("en-US").includes(search)) continue;
        const canAuthor = await this.canAuthorRecord(tx, actor, row);
        items.push({ id: row.id, kind: row.kind, audience: row.audience, branchId: row.branchId, teamId: row.teamId, title: row.title, category: row.category, version: row.version, publishedVersionId: canReadPublished ? row.publishedVersionId : null, publishedVersion: canReadPublished ? version?.version ?? null : null, draft: !!draftVersion, capabilities: { canAppend: canAuthor, canUpload: canAuthor, canActivate: row.kind === "MODULE" && canAuthor, canRequestPublication: row.kind !== "MODULE" && canAuthor, canPublishDirect: actor.kind === AccountKind.OWNER && row.kind !== "MODULE" } });
      }
      return { items };
    });
  }

  private async fileSummaries(tx: Tx, recordId: string, version: { content: Prisma.JsonValue }, visibleIds: Set<string>) {
    const ids = fileReferences(version.content).map((ref) => ref.fileId).filter((id) => visibleIds.has(id));
    const files = await tx.libraryFile.findMany({ where: { id: { in: [...new Set(ids)] }, recordId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    return files.map(({ id, name, mime, bytes, checksum, createdAt }) => ({ id, name, mime, bytes: Number(bytes), checksum, createdAt }));
  }

  async detail(actor: SessionActor, recordId: string) {
    return this.transaction(async (tx) => {
      await this.active(tx, actor);
      const record = await this.record(tx, actor, recordId);
      const publishedAccessible = !!record.publishedVersionId && await this.canView(tx, actor, record);
      const draftAccessible = await this.canReadCurrentDraft(tx, actor, record);
      if (!publishedAccessible && !draftAccessible) throw new NotFoundException("Library record not found");
      const versions = await tx.libraryVersion.findMany({ where: { recordId, organizationId: actor.organizationId }, orderBy: [{ version: "desc" }, { id: "desc" }] });
      const publications = await tx.libraryPublication.findMany({ where: { recordId, organizationId: actor.organizationId }, orderBy: [{ publishedAt: "desc" }, { id: "desc" }] });
      const publishedVersionIds = new Set(publications.map((publication) => publication.versionId));
      const mayReadPublished = record.audience === "ORGANIZATION" || record.audience === "BRANCH" || record.audience === "TEAM"
        ? await this.permission(tx, actor, "library.view", record.audience, record.branchId, record.teamId) : false;
      const employee = await tx.employee.findUnique({ where: { accountId: actor.accountId }, select: { id: true } });
      const acks = employee ? await tx.libraryAcknowledgement.findMany({ where: { organizationId: actor.organizationId, employeeId: employee.id, versionId: { in: versions.map((version) => version.id) } } }) : [];
      const mayReadDraft = await this.canReadCurrentDraft(tx, actor, record);
      const revealAnswerKey = await this.canReadAssessmentAnswers(tx, actor, record);
      const canAuthor = await this.canAuthorRecord(tx, actor, record);
      if (!mayReadPublished && !mayReadDraft) throw new NotFoundException("Library record not found");
      const accessibleVersions = versions.filter((version) => mayReadPublished && publishedVersionIds.has(version.id) || mayReadDraft && !publishedVersionIds.has(version.id));
      const fileIds = new Set((await tx.libraryFile.findMany({ where: { recordId, organizationId: actor.organizationId }, select: { id: true } })).map((file) => file.id));
      const safeVersions = [];
      for (const version of accessibleVersions) safeVersions.push({ id: version.id, version: version.version, content: record.kind === "MODULE" ? sanitizeTrainingAssessmentContent(version.content as Record<string, unknown>, { revealAnswerKey }) : version.content, acknowledgementRequired: version.acknowledgementRequired, reason: version.reason, createdAt: version.createdAt, acknowledged: acks.some((ack) => ack.versionId === version.id), files: await this.fileSummaries(tx, recordId, version, fileIds) });
      const requests = await tx.approvalRequest.findMany({ where: { organizationId: actor.organizationId, typeKey: "library.publish", sourceType: "library_version", sourceId: { in: versions.map((version) => version.id) } }, orderBy: [{ requestedAt: "desc" }, { id: "desc" }] });
      const requestAccounts = await tx.account.findMany({ where: { id: { in: [...new Set(requests.flatMap(request => [request.approverId, request.requesterId]))] }, employee: { organizationId: actor.organizationId } }, select: { id: true, employee: { select: { employeeCode: true } } } });
      const requestLabels = new Map(requestAccounts.map(account => [account.id, account.employee?.employeeCode || "Staff member"]));
      const exactDraft = versions.find((version) => version.version === record.version);
      const excludedPublisherIds = new Set([actor.accountId, ...(exactDraft ? [exactDraft.actorId] : [])]);
      const candidatePublishers = canAuthor && record.kind !== "MODULE" ? await this.eligiblePublishers(tx, actor, record, excludedPublisherIds) : [];
      const visibleRequests = [];
      for (const request of requests) if (request.requesterId === actor.accountId || request.approverId === actor.accountId || canAuthor) {
        const version = versions.find((candidate) => candidate.id === request.sourceId);
        const canDecide = request.approverId === actor.accountId && request.state === ApprovalRequestState.PENDING && !!version && version.actorId !== actor.accountId && await this.permission(tx, actor, "library.manage", record.audience as Audience, record.branchId, record.teamId) && await this.permission(tx, actor, "library.view", record.audience as Audience, record.branchId, record.teamId);
        visibleRequests.push({ id: request.id, versionId: request.sourceId, approverLabel: requestLabels.get(request.approverId) ?? "Publisher", requesterLabel: requestLabels.get(request.requesterId) ?? "Author", state: request.state, requestedAt: request.requestedAt, reason: request.reason, canDecide });
      }
      return { record: { id: record.id, kind: record.kind, audience: record.audience, branchId: record.branchId, teamId: record.teamId, title: record.title, category: record.category, version: record.version, publishedVersionId: mayReadPublished ? record.publishedVersionId : null, createdAt: record.createdAt, capabilities: { canAppend: canAuthor, canUpload: canAuthor, canActivate: record.kind === "MODULE" && canAuthor, canRequestPublication: record.kind !== "MODULE" && canAuthor, canPublishDirect: actor.kind === AccountKind.OWNER && record.kind !== "MODULE" } }, versions: safeVersions, publications: mayReadPublished ? publications.map(({ id, versionId, approvalRequestId, reason, publishedAt }) => ({ id, versionId, approvalRequestId, reason, publishedAt })) : [], eligiblePublisherIds: candidatePublishers, publicationRequests: visibleRequests };
    });
  }

  /** Published SOP facts for reports, constrained by current audience and own acknowledgements. */
  async reportEvidence(actor: SessionActor, from: string, to: string) {
    return this.transaction(async (tx) => {
      const employee = await this.active(tx, actor);
      const records = await tx.libraryRecord.findMany({
        where: { organizationId: actor.organizationId, kind: "SOP", publishedVersionId: { not: null } },
        orderBy: [{ title: "asc" }, { id: "asc" }],
      });
      const output: Array<{ recordId: string; title: string; versions: Array<{ publicationId: string; versionId: string; version: number; publishedAt?: Date; acknowledgementId?: string; employeeId?: string; acknowledgedByAccountId?: string; acknowledgedAt?: Date }> }> = [];
      for (const record of records) {
        if (!await this.canView(tx, actor, record)) continue;
        const publications = await tx.libraryPublication.findMany({
          where: { organizationId: actor.organizationId, recordId: record.id },
          orderBy: [{ publishedAt: "asc" }, { id: "asc" }],
          select: { id: true, versionId: true, publishedAt: true },
        });
        const versionIds = publications.map((publication) => publication.versionId);
        if (!versionIds.length) continue;
        const versions = await tx.libraryVersion.findMany({
          where: { organizationId: actor.organizationId, recordId: record.id, id: { in: versionIds } },
          select: { id: true, version: true },
        });
        const versionById = new Map(versions.map((version) => [version.id, version]));
        const acknowledgements = employee && employee.accountId === actor.accountId
          ? await tx.libraryAcknowledgement.findMany({
            where: { organizationId: actor.organizationId, employeeId: employee.id, versionId: { in: versionIds } },
            select: { id: true, employeeId: true, versionId: true, acknowledgedAt: true },
          })
          : [];
        const acknowledgementByVersion = new Map(acknowledgements.map((acknowledgement) => [acknowledgement.versionId, acknowledgement]));
        const selected = publications.flatMap((publication) => {
          const version = versionById.get(publication.versionId);
          if (!version) return [];
          const publishedDate = publication.publishedAt.toISOString().slice(0, 10);
          const acknowledgement = acknowledgementByVersion.get(version.id);
          const acknowledgedAt = acknowledgement?.acknowledgedAt;
          const acknowledgementDate = acknowledgedAt?.toISOString().slice(0, 10);
          const inPublicationPeriod = publishedDate >= from && publishedDate <= to;
          const inAcknowledgementPeriod = !!acknowledgementDate && acknowledgementDate >= from && acknowledgementDate <= to;
          if (!inPublicationPeriod && !inAcknowledgementPeriod) return [];
          return [{
            publicationId: publication.id,
            versionId: version.id,
            version: version.version,
            ...(inPublicationPeriod ? { publishedAt: publication.publishedAt } : {}),
            ...(inAcknowledgementPeriod && acknowledgedAt && acknowledgement && employee?.accountId === actor.accountId ? { acknowledgementId: acknowledgement.id, employeeId: acknowledgement.employeeId, acknowledgedByAccountId: actor.accountId, acknowledgedAt } : {}),
          }];
        });
        if (selected.length) output.push({ recordId: record.id, title: record.title, versions: selected });
      }
      return output;
    });
  }

  /** Published SOP versions explicitly referenced by this task, with normal audience and file access checks. */
  async assistanceTaskSops(actor: SessionActor, taskId: string) {
    const references = await this.transaction(async (tx) => {
      await this.active(tx, actor);
      await this.tasks.assertSopReferenceReadAccess(tx, actor, taskId);
      return tx.libraryReference.findMany({ where: { organizationId: actor.organizationId, taskId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, versionId: true } });
    });
    const output = [];
    for (const reference of references) {
      const version = await this.database.prisma.libraryVersion.findFirst({ where: { id: reference.versionId, organizationId: actor.organizationId }, select: { id: true, recordId: true, version: true } });
      if (!version) continue;
      const detail = await this.detail(actor, version.recordId);
      const record = detail.versions.find((item: { id: string }) => item.id === version.id);
      if (!record) throw new NotFoundException("Published SOP reference is no longer available");
      const root = record.content && typeof record.content === "object" ? record.content as { blocks?: unknown[] } : {};
      const text = (root.blocks ?? []).flatMap((raw) => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
        const block = raw as Record<string, unknown>;
        if (block.type === "TEXT" && typeof block.text === "string") return [block.text];
        if (block.type === "LINK" && typeof block.label === "string") return [block.label];
        if (block.type === "CHECKLIST" && Array.isArray(block.items)) return block.items.filter((item): item is string => typeof item === "string");
        return [];
      }).join(" ").slice(0, 1000);
      output.push({ referenceId: reference.id, recordId: detail.record.id, versionId: record.id, version: record.version, title: detail.record.title, text, files: record.files.length });
    }
    return output;
  }

  async create(actor: SessionActor, input: { commandId: string; kind: LibraryKind; title: string; category: string; audience: Audience; branchId?: string; teamId?: string; content: unknown; acknowledgementRequired: boolean; reason: string }) {
    if (!reasonValid(input.reason) || !input.title.trim() || input.title.trim().length > 160 || !input.category.trim() || input.category.trim().length > 80) throw new BadRequestException("Invalid library record");
    const authorize = async (tx: Tx) => { const employee = await this.active(tx, actor); await this.validateAudience(tx, actor, employee, input); };
    return this.command(actor, input.commandId, "create", input, async (tx) => {
      const employee = await this.active(tx, actor);
      const audience = await this.validateAudience(tx, actor, employee, input);
      const recordId = randomUUID(), versionId = randomUUID();
      const content = await this.validateContent(tx, actor, { id: recordId, organizationId: actor.organizationId, kind: input.kind }, input.content);
      const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "library.version_created", subjectType: "library_record", subjectId: recordId, reason: input.reason, after: { versionId, version: 1, content: auditContent(content, input.kind), acknowledgementRequired: input.acknowledgementRequired, kind: input.kind } });
      const row = await tx.libraryRecord.create({ data: { id: recordId, organizationId: actor.organizationId, ...audience, title: input.title.trim(), category: input.category.trim(), version: 1, createdById: actor.accountId } });
      const version = await tx.libraryVersion.create({ data: { id: versionId, organizationId: actor.organizationId, recordId, version: 1, content: asJson(content), acknowledgementRequired: input.acknowledgementRequired, actorId: actor.accountId, reason: input.reason, eventId } });
      return { record: { id: row.id, kind: row.kind, audience: row.audience, branchId: row.branchId, teamId: row.teamId, title: row.title, category: row.category, version: row.version }, version: { id: version.id, version: version.version, acknowledgementRequired: version.acknowledgementRequired } };
    }, authorize);
  }

  async appendVersion(actor: SessionActor, recordId: string, input: { commandId: string; expectedVersion: number; content: unknown; acknowledgementRequired: boolean; reason: string }) {
    if (!reasonValid(input.reason) || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) throw new BadRequestException("Invalid library version command");
    const authorize = async (tx: Tx) => { const record = await this.record(tx, actor, recordId); await this.authorAuthority(tx, actor, record); };
    return this.command(actor, input.commandId, "append-version", { recordId, input }, async (tx) => {
      await this.active(tx, actor);
      const record = await this.record(tx, actor, recordId, true);
      await this.authorAuthority(tx, actor, record);
      if (record.version !== input.expectedVersion) throw new ConflictException("Library record version changed");
      const content = await this.validateContent(tx, actor, record, input.content);
      const versionId = randomUUID(), next = record.version + 1;
      const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "library.version_created", subjectType: "library_record", subjectId: record.id, reason: input.reason, before: { version: record.version }, after: { versionId, version: next, content: auditContent(content, record.kind), acknowledgementRequired: input.acknowledgementRequired, kind: record.kind } });
      await tx.libraryVersion.create({ data: { id: versionId, organizationId: actor.organizationId, recordId: record.id, version: next, content: asJson(content), acknowledgementRequired: input.acknowledgementRequired, actorId: actor.accountId, reason: input.reason, eventId } });
      await tx.libraryRecord.update({ where: { id: record.id }, data: { version: next } });
      return { id: record.id, versionId, version: next, acknowledgementRequired: input.acknowledgementRequired };
    }, authorize);
  }

  async activateModule(actor: SessionActor, recordId: string, input: { commandId: string; expectedVersion: number; reason: string }) {
    if (!reasonValid(input.reason) || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) throw new BadRequestException("Invalid module activation");
    const authorize = async (tx: Tx) => { const record = await this.record(tx, actor, recordId); if (record.kind !== "MODULE") throw new ConflictException("Only a training module can be activated here"); await this.authorAuthority(tx, actor, record); };
    return this.command(actor, input.commandId, "activate-module", { recordId, input }, async (tx) => {
      await this.active(tx, actor);
      const record = await this.record(tx, actor, recordId, true);
      if (record.kind !== "MODULE") throw new ConflictException("Only a training module can be activated here");
      await this.authorAuthority(tx, actor, record);
      if (record.version !== input.expectedVersion) throw new ConflictException("Library record version changed");
      const version = await tx.libraryVersion.findFirst({ where: { recordId, organizationId: actor.organizationId, version: record.version } });
      if (!version) throw new ConflictException("Current module version is unavailable");
      if (record.publishedVersionId === version.id) return { recordId, versionId: version.id, publicationId: (await tx.libraryPublication.findFirst({ where: { versionId: version.id } }))?.id };
      const publicationId = randomUUID();
      const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "library.published", subjectType: "library_record", subjectId: record.id, reason: input.reason, after: { publicationId, versionId: version.id, approvalRequestId: null } });
      await tx.libraryPublication.create({ data: { id: publicationId, organizationId: actor.organizationId, recordId, versionId: version.id, approvalRequestId: null, actorId: actor.accountId, reason: input.reason, eventId } });
      await tx.libraryRecord.update({ where: { id: record.id }, data: { publishedVersionId: version.id } });
      return { recordId, versionId: version.id, publicationId, activated: true };
    }, authorize);
  }

  async requestPublication(actor: SessionActor, recordId: string, input: { commandId: string; versionId: string; approverAccountId: string; reason: string }) {
    if (!reasonValid(input.reason)) throw new BadRequestException("Publication reason required");
    const authorize = async (tx: Tx) => {
      const record = await this.record(tx, actor, recordId);
      if (record.kind === "MODULE") throw new ConflictException("Training modules use activation");
      await this.authorAuthority(tx, actor, record);
      const version = await tx.libraryVersion.findFirst({ where: { id: input.versionId, recordId, organizationId: actor.organizationId } });
      if (!version) throw new NotFoundException("Library version not found");
      const approverAccount = await tx.account.findUnique({ where: { id: input.approverAccountId }, select: { kind: true, state: true } });
      const approver = { accountId: input.approverAccountId, organizationId: actor.organizationId, kind: approverAccount?.kind ?? AccountKind.CLIENT } as SessionActor;
      if (!approverAccount || approverAccount.kind !== AccountKind.STAFF && approverAccount.kind !== AccountKind.OWNER || approverAccount.state !== AccountState.ACTIVE || actor.accountId === input.approverAccountId || version.actorId === input.approverAccountId ||
        !await this.permission(tx, approver, "library.manage", record.audience as Audience, record.branchId, record.teamId) ||
        !await this.permission(tx, approver, "library.view", record.audience as Audience, record.branchId, record.teamId)) throw new ForbiddenException("Choose a different authorized publisher");
    };
    return this.command(actor, input.commandId, "request-publication", { recordId, input }, async (tx) => {
      const record = await this.record(tx, actor, recordId, true);
      if (record.kind === "MODULE") throw new ConflictException("Training modules use activation");
      const version = await tx.libraryVersion.findFirst({ where: { id: input.versionId, recordId, organizationId: actor.organizationId } });
      if (!version) throw new NotFoundException("Library version not found");
      const context = { recordId, versionId: version.id, approverAccountId: input.approverAccountId } as Prisma.InputJsonValue;
      const approval = await this.approvals.createRequest(tx, actor, "library.publish", { sourceType: "library_version", sourceId: version.id, sourceGeneration: version.version, reason: input.reason, context });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "library.publish_requested", subjectType: "library_version", subjectId: version.id, reason: input.reason, after: { approvalRequestId: approval.id, recordId, versionId: version.id } });
      return { approvalRequestId: approval.id, recordId, versionId: version.id, approverAccountId: input.approverAccountId, state: approval.state };
    }, authorize);
  }

  async decidePublication(actor: SessionActor, requestId: string, input: { commandId: string; outcome: "APPROVED" | "REJECTED"; reason: string }) {
    if (!reasonValid(input.reason)) throw new BadRequestException("Decision reason required");
    const authorize = async (tx: Tx) => {
      const request = await tx.approvalRequest.findFirst({ where: { id: requestId, organizationId: actor.organizationId, typeKey: "library.publish", sourceType: "library_version" } });
      if (!request) throw new NotFoundException("Publication request not found");
      const { context, record } = await this.publicationContext(tx, request as ApprovalRequest);
      if (context.approverAccountId !== actor.accountId || !await this.permission(tx, actor, "library.manage", record.audience as Audience, record.branchId, record.teamId) || !await this.permission(tx, actor, "library.view", record.audience as Audience, record.branchId, record.teamId)) throw new ForbiddenException("Current named publisher required");
    };
    return this.command(actor, input.commandId, "decide-publication", { requestId, input }, async (tx) => {
      await this.approvals.decide(tx, actor, requestId, { outcome: input.outcome, reason: input.reason });
      const request = await tx.approvalRequest.findUnique({ where: { id: requestId } });
      return { approvalRequestId: requestId, state: request?.state ?? (input.outcome === "APPROVED" ? ApprovalRequestState.APPROVED : ApprovalRequestState.REJECTED) };
    }, authorize);
  }

  async publishDirect(actor: SessionActor, recordId: string, input: { commandId: string; versionId: string; reason: string }) {
    if (!reasonValid(input.reason)) throw new BadRequestException("Publication reason required");
    const authorize = async (tx: Tx) => {
      if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner direct publication required");
      const record = await this.record(tx, actor, recordId);
      if (record.kind === "MODULE") throw new ConflictException("Training modules use activation");
      if (!await tx.libraryVersion.findFirst({ where: { id: input.versionId, recordId, organizationId: actor.organizationId }, select: { id: true } })) throw new NotFoundException("Library version not found");
    };
    return this.command(actor, input.commandId, "publish-direct", { recordId, input }, async (tx) => {
      const record = await this.record(tx, actor, recordId, true);
      if (record.kind === "MODULE") throw new ConflictException("Training modules use activation");
      const version = await tx.libraryVersion.findFirst({ where: { id: input.versionId, recordId, organizationId: actor.organizationId } });
      if (!version) throw new NotFoundException("Library version not found");
      return this.publishVersion(tx, actor, record, version, input.reason, null);
    }, authorize);
  }

  async acknowledge(actor: SessionActor, versionId: string, input: { commandId: string; reason: string }) {
    if (!reasonValid(input.reason)) throw new BadRequestException("Reason required");
    const authorize = async (tx: Tx) => {
      const version = await tx.libraryVersion.findFirst({ where: { id: versionId, organizationId: actor.organizationId } });
      if (!version) throw new NotFoundException("Library version not found");
      const record = await this.record(tx, actor, version.recordId);
      if (!await this.publishedVersion(tx, actor.organizationId, record.id, version.id) || !version.acknowledgementRequired || !await this.permission(tx, actor, "library.view", record.audience as Audience, record.branchId, record.teamId) || actor.kind !== AccountKind.STAFF) throw new ForbiddenException("Acknowledgement is unavailable");
    };
    return this.command(actor, input.commandId, "acknowledge", { versionId, input }, async (tx) => {
      const employee = await this.active(tx, actor);
      if (actor.kind !== AccountKind.STAFF || !employee) throw new ForbiddenException("Active employee required");
      const version = await tx.libraryVersion.findFirst({ where: { id: versionId, organizationId: actor.organizationId } });
      if (!version) throw new NotFoundException("Library version not found");
      const record = await this.record(tx, actor, version.recordId);
      if (!await this.publishedVersion(tx, actor.organizationId, record.id, version.id) || !version.acknowledgementRequired || !await this.permission(tx, actor, "library.view", record.audience as Audience, record.branchId, record.teamId)) throw new ForbiddenException("Acknowledgement is unavailable");
      const prior = await tx.libraryAcknowledgement.findFirst({ where: { organizationId: actor.organizationId, versionId, employeeId: employee.id } });
      if (prior) return { id: prior.id, versionId, acknowledged: true, acknowledgedAt: prior.acknowledgedAt };
      const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: employee.accountId, eventName: "library.acknowledged", subjectType: "library_version", subjectId: versionId, reason: input.reason, after: { employeeId: employee.id } });
      const row = await tx.libraryAcknowledgement.create({ data: { organizationId: actor.organizationId, versionId, employeeId: employee.id, eventId } });
      return { id: row.id, versionId, acknowledged: true, acknowledgedAt: row.acknowledgedAt };
    }, authorize);
  }

  async createReference(actor: SessionActor, input: { commandId: string; versionId: string; taskId?: string; templateVersionId?: string; reason: string }) {
    if (!reasonValid(input.reason) || (!!input.taskId === !!input.templateVersionId)) throw new BadRequestException("Choose exactly one reference target");
    const authorize = async (tx: Tx) => {
      const version = await tx.libraryVersion.findFirst({ where: { id: input.versionId, organizationId: actor.organizationId } });
      const record = version ? await this.record(tx, actor, version.recordId) : null;
      if (!version || !record || record.kind !== "SOP" || !await this.publishedVersion(tx, actor.organizationId, record.id, version.id) || !await this.permission(tx, actor, "library.view", record.audience as Audience, record.branchId, record.teamId)) throw new NotFoundException("SOP version not found");
      if (input.taskId) await this.tasks.assertSopReferenceAuthority(tx, actor, input.taskId);
      else {
        await this.authorization.assertPermission(actor.accountId, "template.manage", { kind: "ORGANIZATION", organizationId: actor.organizationId }, tx);
        const templateVersionId = input.templateVersionId;
        if (!templateVersionId || !await tx.projectTemplateVersion.findFirst({ where: { id: templateVersionId, organizationId: actor.organizationId, template: { active: true } }, select: { id: true } })) throw new NotFoundException("Template version not found");
      }
    };
    return this.command(actor, input.commandId, "reference", input, async (tx) => {
      await this.active(tx, actor);
      const version = await tx.libraryVersion.findFirst({ where: { id: input.versionId, organizationId: actor.organizationId } });
      if (!version) throw new NotFoundException("SOP version not found");
      const record = await this.record(tx, actor, version.recordId);
      if (record.kind !== "SOP" || !await this.publishedVersion(tx, actor.organizationId, record.id, version.id) || !await this.permission(tx, actor, "library.view", record.audience as Audience, record.branchId, record.teamId)) throw new NotFoundException("SOP version not found");
      if (input.taskId) await this.tasks.assertSopReferenceAuthority(tx, actor, input.taskId);
      else {
        await this.authorization.assertPermission(actor.accountId, "template.manage", { kind: "ORGANIZATION", organizationId: actor.organizationId }, tx);
        const templateVersionId = input.templateVersionId;
        if (!templateVersionId || !await tx.projectTemplateVersion.findFirst({ where: { id: templateVersionId, organizationId: actor.organizationId, template: { active: true } }, select: { id: true } })) throw new NotFoundException("Template version not found");
      }
      const referenceId = randomUUID();
      const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "library.referenced", subjectType: "library_reference", subjectId: referenceId, reason: input.reason, after: { versionId: version.id, taskId: input.taskId ?? null, templateVersionId: input.templateVersionId ?? null } });
      const row = await tx.libraryReference.create({ data: { id: referenceId, organizationId: actor.organizationId, versionId: version.id, taskId: input.taskId ?? null, templateVersionId: input.templateVersionId ?? null, actorId: actor.accountId, reason: input.reason, eventId } });
      return { id: row.id, versionId: row.versionId, taskId: row.taskId, templateVersionId: row.templateVersionId, createdAt: row.createdAt };
    }, authorize);
  }

  private async storage(): Promise<LibraryStorage> {
    if (!this.config.nasRoot) throw new ServiceUnavailableException("Private library storage is not configured");
    this.storagePromise ??= (async () => { const storage = new LibraryStorage(this.config.nasRoot!); await storage.initialize(); return storage; })();
    try { return await this.storagePromise; } catch { this.storagePromise = undefined; throw new ServiceUnavailableException("Private library storage is unavailable"); }
  }

  private async uploadManifest(tx: Tx, actor: SessionActor, uploadId: string, allowFinalized = false): Promise<UploadManifest> {
    const receipt = await tx.learningReceipt.findUnique({ where: { actorId_commandId: { actorId: actor.accountId, commandId: uploadId } } });
    const result = receipt?.result as Partial<UploadManifest> | undefined;
    if (!receipt || receipt.organizationId !== actor.organizationId || result?.operation !== "library.upload.start" || typeof result.recordId !== "string") throw new NotFoundException("Upload not found");
    const record = await this.record(tx, actor, result.recordId);
    await this.authorAuthority(tx, actor, record);
    if (!allowFinalized && await tx.libraryFile.findUnique({ where: { id: uploadId }, select: { id: true } })) throw new ConflictException("Upload is already finalized");
    return result as UploadManifest;
  }

  async startUpload(actor: SessionActor, input: { commandId: string; recordId: string; name: string; mime: string; bytes: number; reason: string }) {
    if (!reasonValid(input.reason)) throw new BadRequestException("Reason required");
    const file = validateDocumentFile(input.name, input.mime, input.bytes, this.config.documentMaxFileBytes ?? DOCUMENT_MAX_BYTES);
    const strictMime = allowedMimeByExtension[file.extension];
    if (!strictMime || strictMime !== file.mimeType) throw new BadRequestException("Unsupported library media type");
    const authorize = async (tx: Tx) => { const record = await this.record(tx, actor, input.recordId); await this.authorAuthority(tx, actor, record); };
    return this.command(actor, input.commandId, "start-upload", input, async (tx) => {
      await this.active(tx, actor);
      const record = await this.record(tx, actor, input.recordId);
      await this.authorAuthority(tx, actor, record);
      let uploadId = randomUUID();
      while (await tx.learningReceipt.findUnique({ where: { actorId_commandId: { actorId: actor.accountId, commandId: uploadId } }, select: { id: true } })) uploadId = randomUUID();
      const manifest: UploadManifest = { operation: "library.upload.start", recordId: record.id, name: file.fileName, mime: file.mimeType, bytes: input.bytes, chunkCount: Math.ceil(input.bytes / DOCUMENT_CHUNK_SIZE), extension: file.extension, reason: input.reason };
      await tx.learningReceipt.create({ data: { organizationId: actor.organizationId, actorId: actor.accountId, commandId: uploadId, payloadHash: hash(manifest), result: asJson(manifest) } });
      return { uploadId, chunkSize: DOCUMENT_CHUNK_SIZE, chunkCount: manifest.chunkCount };
    }, authorize);
  }

  async writeChunk(actor: SessionActor, uploadId: string, index: number, bytes: Buffer, checksum: string) {
    const manifest = await this.transaction(async (tx) => {
      await this.active(tx, actor);
      if (!/^[0-9a-f-]{36}$/i.test(uploadId) || !Number.isSafeInteger(index) || index < 0 || !/^[0-9a-f]{64}$/i.test(checksum)) throw new BadRequestException("Invalid upload chunk");
      const manifest = await this.uploadManifest(tx, actor, uploadId);
      if (index >= manifest.chunkCount) throw new BadRequestException("Invalid upload chunk index");
      const expectedBytes = index === manifest.chunkCount - 1 ? manifest.bytes - index * DOCUMENT_CHUNK_SIZE : DOCUMENT_CHUNK_SIZE;
      if (bytes.length !== expectedBytes) throw new BadRequestException("Chunk size does not match upload manifest");
      if (index === 0) firstBytesAllowed(manifest.extension, bytes);
      if (createHash("sha256").update(bytes).digest("hex") !== checksum.toLowerCase()) throw new BadRequestException("Chunk checksum mismatch");
      return manifest;
    });
    try { await (await this.storage()).writeChunk(uploadId, index, bytes, checksum); }
    catch (error) { if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof ServiceUnavailableException) throw error; throw new ServiceUnavailableException("Private library storage is unavailable"); }
    await this.transaction(async (tx) => { await this.active(tx, actor); const current = await this.uploadManifest(tx, actor, uploadId); if (current.recordId !== manifest.recordId) throw new NotFoundException("Upload not found"); });
    return { index, received: true };
  }

  async finalizeUpload(actor: SessionActor, uploadId: string, input: { commandId: string; reason: string }) {
    if (!reasonValid(input.reason)) throw new BadRequestException("Reason required");
    const payload = { uploadId, input };
    const payloadHash = hash({ op: "finalize-upload", payload });
    const ready = await this.transaction(async (tx) => {
      await this.active(tx, actor);
      if (!/^[0-9a-f-]{36}$/i.test(uploadId)) throw new BadRequestException("Invalid upload ID");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":library-command:" + actor.accountId + ":" + input.commandId},0))`;
      await this.uploadManifest(tx, actor, uploadId, true);
      const prior = await tx.learningReceipt.findUnique({ where: { actorId_commandId: { actorId: actor.accountId, commandId: input.commandId } } });
      if (prior) { if (prior.payloadHash !== payloadHash) throw new ConflictException("Command ID was used with different values"); return { result: prior.result as unknown as ReturnType<LibraryService["safeFile"]> }; }
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":library-upload:" + actor.accountId + ":" + uploadId},0))`;
      const manifest = await this.uploadManifest(tx, actor, uploadId, true);
      const existing = await tx.libraryFile.findUnique({ where: { id: uploadId } });
      return { manifest, existing: existing ? this.safeFile(existing) : null };
    });
    if ("result" in ready) return ready.result;
    if (ready.existing) return this.transaction(async (tx) => {
      await this.active(tx, actor);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":library-command:" + actor.accountId + ":" + input.commandId},0))`;
      await this.uploadManifest(tx, actor, uploadId, true);
      const prior = await tx.learningReceipt.findUnique({ where: { actorId_commandId: { actorId: actor.accountId, commandId: input.commandId } } });
      if (prior) { if (prior.payloadHash !== payloadHash) throw new ConflictException("Command ID was used with different values"); return prior.result as unknown as ReturnType<LibraryService["safeFile"]>; }
      await tx.learningReceipt.create({ data: { organizationId: actor.organizationId, actorId: actor.accountId, commandId: input.commandId, payloadHash, result: asJson(ready.existing) } });
      return ready.existing;
    });
    let blob: Awaited<ReturnType<LibraryStorage["finalize"]>>;
    try { blob = await (await this.storage()).finalize(uploadId, ready.manifest.chunkCount, ready.manifest.bytes); }
    catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException || error instanceof ServiceUnavailableException) throw error;
      if (error instanceof Error && ["Incomplete upload", "Upload size mismatch", "Upload checksum mismatch", "Conflicting finalized blob"].includes(error.message)) throw new ConflictException("Upload is incomplete or failed its checksum");
      throw new ServiceUnavailableException("Private library storage is unavailable");
    }
    const result = await this.transaction(async (tx) => {
      await this.active(tx, actor);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":library-command:" + actor.accountId + ":" + input.commandId},0))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":library-upload:" + actor.accountId + ":" + uploadId},0))`;
      const manifest = await this.uploadManifest(tx, actor, uploadId, true);
      const prior = await tx.learningReceipt.findUnique({ where: { actorId_commandId: { actorId: actor.accountId, commandId: input.commandId } } });
      if (prior) { if (prior.payloadHash !== payloadHash) throw new ConflictException("Command ID was used with different values"); return prior.result as unknown as ReturnType<LibraryService["safeFile"]>; }
      const existing = await tx.libraryFile.findUnique({ where: { id: uploadId } });
      if (existing) {
        const safe = this.safeFile(existing);
        await tx.learningReceipt.create({ data: { organizationId: actor.organizationId, actorId: actor.accountId, commandId: input.commandId, payloadHash, result: asJson(safe) } });
        return safe;
      }
      await this.active(tx, actor);
      const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "library.file_uploaded", subjectType: "library_file", subjectId: uploadId, reason: input.reason, after: { recordId: manifest.recordId, checksum: blob.sha256, bytes: blob.size, mime: manifest.mime, name: manifest.name } });
      const row = await tx.libraryFile.create({ data: { id: uploadId, organizationId: actor.organizationId, recordId: manifest.recordId, uploadedById: actor.accountId, name: manifest.name, mime: manifest.mime, bytes: BigInt(blob.size), checksum: blob.sha256, storageKey: blob.fileId, eventId } });
      const safe = this.safeFile(row);
      await tx.learningReceipt.create({ data: { organizationId: actor.organizationId, actorId: actor.accountId, commandId: input.commandId, payloadHash, result: asJson(safe) } });
      return safe;
    });
    try { await (await this.storage()).discardUpload(uploadId); } catch { /* Committed file metadata remains valid; cleanup can be retried. */ }
    return result;
  }

  private safeFile(row: { id: string; name: string; mime: string; bytes: bigint; checksum: string; createdAt: Date }) {
    return { id: row.id, name: row.name, mime: row.mime, bytes: Number(row.bytes), checksum: row.checksum, createdAt: row.createdAt };
  }

  private async readableFile(tx: Tx, actor: SessionActor, fileId: string) {
    await this.active(tx, actor);
    const file = await tx.libraryFile.findFirst({ where: { id: fileId, organizationId: actor.organizationId } });
    if (!file) throw new NotFoundException("Library file not found");
    const record = await this.record(tx, actor, file.recordId);
    const published = await tx.libraryPublication.findMany({ where: { recordId: record.id, organizationId: actor.organizationId }, select: { versionId: true } });
    const publishedVersions = published.length ? await tx.libraryVersion.findMany({ where: { id: { in: published.map((entry) => entry.versionId) }, recordId: record.id, organizationId: actor.organizationId } }) : [];
    const publishedReadable = await this.permission(tx, actor, "library.view", record.audience as Audience, record.branchId, record.teamId);
    const isPublishedFile = publishedReadable && publishedVersions.some((version) => fileReferences(version.content).some((reference) => reference.fileId === file.id));
    let isDraftFile = false;
    if (!isPublishedFile && await this.canReadCurrentDraft(tx, actor, record)) {
      const publishedIds = new Set(published.map((entry) => entry.versionId));
      const draftHistory = await tx.libraryVersion.findMany({ where: { recordId: record.id, organizationId: actor.organizationId, id: { notIn: [...publishedIds] } }, select: { content: true } });
      isDraftFile = draftHistory.some((version) => fileReferences(version.content).some((reference) => reference.fileId === file.id));
    }
    if (!isPublishedFile && !isDraftFile) throw new NotFoundException("Library file not found");
    return file;
  }

  async streamFile(actor: SessionActor, fileId: string) {
    const row = await this.transaction((tx) => this.readableFile(tx, actor, fileId));
    let storage: LibraryStorage;
    try { storage = await this.storage(); }
    catch { throw new ServiceUnavailableException("Private library storage is unavailable"); }
    let opened: Awaited<ReturnType<LibraryStorage["openFile"]>>;
    try { opened = await storage.openFile(row.storageKey); }
    catch { throw new ServiceUnavailableException("Private library storage is unavailable"); }
    const digest = createHash("sha256");
    try { for await (const part of opened.stream) digest.update(part); }
    catch { throw new ServiceUnavailableException("Library file integrity check failed"); }
    const actual = digest.digest("hex");
    if (actual !== row.checksum || opened.size !== Number(row.bytes)) throw new ServiceUnavailableException("Library file integrity check failed");
    await this.transaction((tx) => this.readableFile(tx, actor, fileId));
    let verified: Awaited<ReturnType<LibraryStorage["openFile"]>>;
    try { verified = await storage.openFile(row.storageKey); }
    catch { throw new ServiceUnavailableException("Private library storage is unavailable"); }
    return { stream: verified.stream, size: verified.size, fileName: row.name, mime: row.mime };
  }
}

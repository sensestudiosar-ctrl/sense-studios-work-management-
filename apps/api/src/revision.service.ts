import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountKind, AccountState, EmployeeState, Prisma, ProjectStatus, RevisionApprovalKind, RevisionSeries, RevisionState, DocumentRetentionClass } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { DocumentService } from "./document.service.js";
import { recordProjectEvent } from "./project-events.js";
import type { ProjectActor } from "./project.service.js";

type Tx = Prisma.TransactionClient;
type Revision = NonNullable<Awaited<ReturnType<Tx["documentRevision"]["findUnique"]>>>;
const activeDraft = new Set<ProjectStatus>([ProjectStatus.DRAFT, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD]);
const INTERNAL_BLOCKER = "Internal review approval is required (S13)";
const CLIENT_BLOCKER = "Exact client approval is required (S14)";
const label = (revision: { series: string; number: number }) => `${revision.series}${revision.number}`;
const evidenceFields = (revision: Revision) => ({ projectId: revision.projectId, drawingId: revision.drawingId, revisionId: revision.id, blobId: revision.blobId, sha256: revision.sha256 });

@Injectable()
export class RevisionService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService, private readonly documents: DocumentService) {}
  private get db() { return this.database.prisma; }
  private transaction<T>(callback: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.$transaction(callback, { timeout: 30_000 }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("Drawing or file revision already exists. Refresh and retry");
      throw error;
    });
  }
  private async project(tx: Tx, actor: ProjectActor, projectId: string, key = "document.view", write = false) {
    if (write) await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id"=${projectId}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR SHARE`;
    const project = await tx.project.findFirst({ where: { id: projectId, organizationId: actor.organizationId } });
    if (!project) throw new NotFoundException("Project not found");
    await tx.$queryRaw`SELECT "id" FROM "accounts" WHERE "id"=${actor.accountId}::uuid FOR SHARE`;
    const account = await tx.account.findUnique({ where: { id: actor.accountId }, include: { employee: true } });
    if (!account || account.state !== AccountState.ACTIVE || account.kind !== actor.kind) throw new ForbiddenException("Permission denied");
    if (actor.kind !== AccountKind.OWNER) {
      const employee = account.employee;
      if (!employee || employee.state !== EmployeeState.ACTIVE || employee.organizationId !== actor.organizationId) throw new ForbiddenException("Permission denied");
      const assignments = await tx.$queryRaw<Array<{ crossBranchAuthorized: boolean }>>`SELECT "crossBranchAuthorized" FROM "project_assignments" WHERE "projectId"=${projectId}::uuid AND "employeeId"=${employee.id}::uuid AND "organizationId"=${actor.organizationId}::uuid AND "revokedAt" IS NULL FOR SHARE`;
      if (!assignments[0] || employee.homeBranchId !== project.branchId && !assignments[0].crossBranchAuthorized) throw new ForbiddenException("Permission denied");
      const scope = { kind: "BRANCH" as const, organizationId: actor.organizationId, branchId: project.branchId };
      await this.authorization.assertPermission(actor.accountId, "project.view", scope, tx);
      await this.authorization.assertPermission(actor.accountId, key, scope, tx);
    }
    if (write && !activeDraft.has(project.status)) throw new ConflictException("Project no longer accepts revisions");
    return project;
  }
  private async drawing(tx: Tx, actor: ProjectActor, drawingId: string, expectedVersion?: number, permission = "document.upload") {
    const record = await tx.drawingRecord.findFirst({ where: { id: drawingId, organizationId: actor.organizationId } });
    if (!record) throw new NotFoundException("Drawing not found");
    await this.project(tx, actor, record.projectId, permission, true);
    await tx.$queryRaw`SELECT "id" FROM "drawing_records" WHERE "id"=${drawingId}::uuid FOR UPDATE`;
    const locked = await tx.drawingRecord.findUniqueOrThrow({ where: { id: drawingId } });
    if (expectedVersion !== undefined && locked.version !== expectedVersion) throw new ConflictException("Drawing changed. Refresh and retry");
    for (const revision of await tx.documentRevision.findMany({ where: { drawingId } })) await this.documents.authorizeFile(tx, actor, revision.fileId);
    return locked;
  }
  private async exactFile(tx: Tx, actor: ProjectActor, projectId: string, fileId: string) {
    const file = await this.documents.authorizeFile(tx, actor, fileId, "document.upload", true);
    if (file.document.projectId !== projectId) throw new BadRequestException("File does not belong to this project");
    if (await tx.documentRevision.findUnique({ where: { blobId: file.blob.id } })) throw new ConflictException("This file already belongs to a revision");
    return file;
  }
  private async clientRecipient(tx: Tx, projectId: string, accountId: string, revisionId: string) {
    await tx.$queryRaw`SELECT "id" FROM "accounts" WHERE "id"=${accountId}::uuid FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "client_portal_grants" WHERE "projectId"=${projectId}::uuid AND "accountId"=${accountId}::uuid FOR SHARE`;
    const account = await tx.account.findFirst({ where: { id: accountId, kind: AccountKind.CLIENT, state: AccountState.ACTIVE } });
    const grant = await tx.clientPortalGrant.findUnique({ where: { projectId_accountId: { projectId, accountId } } });
    if (!account || !grant || grant.revokedAt || grant.expiresAt && grant.expiresAt <= new Date()) throw new ForbiddenException("Client recipient access ended");
    const items = await tx.clientReviewItem.findMany({ where: { projectId, revisionId, organizationId: grant.organizationId } });
    let visible = grant.primary && items.length > 0;
    if (!grant.primary) for (const item of items) {
      await tx.$queryRaw`SELECT "id" FROM "client_item_grants" WHERE "portalGrantId"=${grant.id}::uuid AND "itemId"=${item.id}::uuid FOR SHARE`;
      if (await tx.clientItemGrant.findFirst({ where: { portalGrantId: grant.id, itemId: item.id, view: true } })) visible = true;
    }
    const revision = await tx.documentRevision.findUniqueOrThrow({ where: { id: revisionId } });
    const blob = await tx.fileBlobMetadata.findUnique({ where: { id: revision.blobId } });
    if (!visible || !blob || !["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"].includes(blob.mimeType)) throw new ForbiddenException("Client recipient requires exact shared PDF/image access");
  }
  private async viewDrawing(tx: Tx, actor: ProjectActor, id: string) {
    const row = await tx.drawingRecord.findUniqueOrThrow({ where: { id }, include: { revisions: { orderBy: { ordinal: "desc" } } } });
    const revisions = [];
    for (const revision of row.revisions) {
      const file = await this.documents.authorizeFile(tx, actor, revision.fileId);
      const facts = await tx.revisionApprovalFact.findMany({ where: { revisionId: revision.id } });
      const issueBlocker = !facts.some((fact) => fact.kind === "INTERNAL") ? INTERNAL_BLOCKER : (row.clientApprovalRequired || revision.series === "CR") && !facts.some((fact) => fact.kind === "CLIENT") ? CLIENT_BLOCKER : !revision.isCurrent || !["APPROVED", "ISSUED"].includes(revision.state) ? "Only the current approved exact revision may be issued" : null;
      revisions.push({ issueEligible: issueBlocker === null, issueBlocker, id: revision.id, fileId: revision.fileId, blobId: revision.blobId, series: revision.series, number: revision.number, label: label(revision), ordinal: revision.ordinal, state: revision.state, isCurrent: revision.isCurrent, sha256: revision.sha256, fileName: file.blob.fileName, mimeType: file.blob.mimeType, sizeBytes: Number(file.blob.sizeBytes), reason: revision.reason, createdAt: revision.createdAt, createdById: revision.createdById });
    }
    return { id: row.id, documentNumber: row.documentNumber, title: row.title, version: row.version, clientApprovalRequired: row.clientApprovalRequired, revisions };
  }
  async list(actor: ProjectActor, projectId: string) {
    return this.transaction(async (tx) => {
      const project = await this.project(tx, actor, projectId);
      const drawings = [];
      for (const row of await tx.drawingRecord.findMany({ where: { organizationId: actor.organizationId, projectId }, orderBy: { normalizedNumber: "asc" } })) {
        try { drawings.push(await this.viewDrawing(tx, actor, row.id)); }
        catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
      }
      const transmittals = [];
      for (const row of await tx.drawingTransmittal.findMany({ where: { organizationId: actor.organizationId, projectId }, include: { items: true, recipients: true }, orderBy: { issuedAt: "desc" } })) {
        const items = [];
        let visible = true;
        for (const item of row.items) {
          const revision = await tx.documentRevision.findUniqueOrThrow({ where: { id: item.revisionId } });
          try { await this.documents.authorizeFile(tx, actor, revision.fileId); }
          catch (error) { if (!(error instanceof ForbiddenException)) throw error; visible = false; break; }
          items.push({ revisionId: revision.id, drawingId: revision.drawingId, label: label(revision), sha256: item.sha256, state: revision.state });
        }
        const senderName = (await tx.account.findUniqueOrThrow({ where: { id: row.senderId }, select: { normalizedEmail: true } })).normalizedEmail;
        const recipientRows = []; for (const recipient of row.recipients) { const name = (await tx.account.findUniqueOrThrow({ where: { id: recipient.accountId }, select: { normalizedEmail: true } })).normalizedEmail; recipientRows.push({ accountId: recipient.accountId, name, acknowledgementRequired: recipient.acknowledgementRequired, acknowledgedAt: recipient.acknowledgedAt, note: recipient.note }); }
        if (visible) transmittals.push({ canAcknowledge: row.recipients.some((recipient) => recipient.accountId === actor.accountId && !recipient.acknowledgedAt), senderName, id: row.id, purpose: row.purpose, issuedAt: row.issuedAt, senderId: row.senderId, items, recipients: recipientRows });
      }
      let createRevision = false, authorizedIssue = false, selectClientReview = false;
      try { await this.project(tx, actor, projectId, "document.upload", true); createRevision = true; } catch (error) { if (!(error instanceof ForbiddenException || error instanceof ConflictException)) throw error; }
      if (project.status === ProjectStatus.ACTIVE) try { await this.project(tx, actor, projectId, "document.issue"); authorizedIssue = true; } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
      if (project.status === ProjectStatus.ACTIVE) try { await this.project(tx, actor, projectId, "document.client_review_select"); selectClientReview = true; } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
      const issuable = drawings.flatMap((drawing) => drawing.revisions.filter((revision) => revision.issueEligible));
      const eligibleRecipients = [];
      if (authorizedIssue && issuable.length) for (const account of await tx.account.findMany({ where: { state: AccountState.ACTIVE, kind: { in: [AccountKind.OWNER, AccountKind.STAFF, AccountKind.CLIENT] } }, orderBy: { normalizedEmail: "asc" } })) {
        const recipient = { accountId: account.id, organizationId: actor.organizationId, kind: account.kind };
        try {
          if (account.kind !== AccountKind.CLIENT) await this.project(tx, recipient, projectId);
          const revisionIds = [];
          for (const revision of issuable) { try { if (account.kind === AccountKind.CLIENT) await this.clientRecipient(tx, projectId, account.id, revision.id); else await this.documents.authorizeFile(tx, recipient, revision.fileId); revisionIds.push(revision.id); } catch (error) { if (!(error instanceof ForbiddenException)) throw error; } }
          if (revisionIds.length) eligibleRecipients.push({ accountId: account.id, name: account.normalizedEmail, revisionIds });
        } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
      }
      return { drawings, transmittals, eligibleRecipients, capabilities: { createRevision, selectClientReview, issue: authorizedIssue && issuable.length > 0 }, issueBlocker: issuable.length ? null : drawings.some((drawing) => drawing.revisions.some((revision) => revision.issueBlocker === CLIENT_BLOCKER)) ? CLIENT_BLOCKER : INTERNAL_BLOCKER };
    });
  }
  async createDrawing(actor: ProjectActor, projectId: string, input: { documentNumber: string; title: string; fileId: string; reason: string }) {
    return this.transaction(async (tx) => {
      await this.project(tx, actor, projectId, "document.upload", true);
      const file = await this.exactFile(tx, actor, projectId, input.fileId);
      const normalizedNumber = input.documentNumber.trim().toLocaleLowerCase("en-US");
      if (await tx.drawingRecord.findFirst({ where: { projectId, normalizedNumber } })) throw new ConflictException("Document number already exists in this project");
      const drawing = await tx.drawingRecord.create({ data: { organizationId: actor.organizationId, projectId, documentNumber: input.documentNumber.trim(), normalizedNumber, title: input.title.trim(), clientApprovalRequired: false, createdById: actor.accountId } });
      const revision = await tx.documentRevision.create({ data: { organizationId: actor.organizationId, projectId, drawingId: drawing.id, fileId: input.fileId, blobId: file.blob.id, sha256: file.blob.sha256, series: RevisionSeries.R, number: 0, ordinal: 0, reason: input.reason, createdById: actor.accountId } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "revision.created", subjectType: "revision", subjectId: revision.id, reason: input.reason, after: { ...evidenceFields(revision), series: revision.series, number: revision.number, ordinal: revision.ordinal, drawingVersion: 1 } });
      return this.viewDrawing(tx, actor, drawing.id);
    });
  }
  async appendRevision(actor: ProjectActor, drawingId: string, input: { fileId: string; series: "R" | "CR"; expectedVersion: number; reason: string }) {
    return this.transaction(async (tx) => {
      const drawing = await this.drawing(tx, actor, drawingId, input.expectedVersion);
      const file = await this.exactFile(tx, actor, drawing.projectId, input.fileId);
      const maximum = await tx.documentRevision.aggregate({ where: { drawingId, series: input.series }, _max: { number: true } });
      const ordinal = await tx.documentRevision.aggregate({ where: { drawingId }, _max: { ordinal: true } });
      const revision = await tx.documentRevision.create({ data: { organizationId: actor.organizationId, projectId: drawing.projectId, drawingId, fileId: input.fileId, blobId: file.blob.id, sha256: file.blob.sha256, series: input.series, number: (maximum._max.number ?? (input.series === "R" ? -1 : 0)) + 1, ordinal: (ordinal._max.ordinal ?? -1) + 1, reason: input.reason, createdById: actor.accountId } });
      await tx.drawingRecord.update({ where: { id: drawingId }, data: { version: { increment: 1 } } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "revision.created", subjectType: "revision", subjectId: revision.id, reason: input.reason, after: { ...evidenceFields(revision), series: revision.series, number: revision.number, ordinal: revision.ordinal, drawingVersion: drawing.version + 1 } });
      return this.viewDrawing(tx, actor, drawingId);
    });
  }
  async selectClientReview(actor: ProjectActor, drawingId: string, input: { expectedVersion: number; reason: string }) {
    return this.transaction(async (tx) => {
      const drawing = await this.drawing(tx, actor, drawingId, input.expectedVersion, "document.client_review_select");
      const project = await tx.project.findUniqueOrThrow({ where: { id: drawing.projectId } });
      if (project.status !== ProjectStatus.ACTIVE) throw new ConflictException("Only Active projects can select drawings for client review");
      if (drawing.clientApprovalRequired) throw new ConflictException("Drawing is already selected for client review");
      await tx.drawingRecord.update({ where: { id: drawingId }, data: { clientApprovalRequired: true, version: { increment: 1 } } });
      await tx.drawingClientReviewSelection.create({ data: { organizationId: actor.organizationId, projectId: drawing.projectId, drawingId, drawingVersion: drawing.version + 1, actorId: actor.accountId, reason: input.reason } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "drawing.client_review_selected", subjectType: "drawing", subjectId: drawingId, reason: input.reason, after: { projectId: drawing.projectId, drawingVersion: drawing.version + 1, clientApprovalRequired: true } });
      return this.viewDrawing(tx, actor, drawingId);
    });
  }
  private async change(tx: Tx, revision: Revision, state: RevisionState, actorId: string, reason: string, eventName: string, current = revision.isCurrent, sourceAuditEventId?: string) {
    const drawing = await tx.drawingRecord.findUniqueOrThrow({ where: { id: revision.drawingId } });
    const eventId = await recordProjectEvent(tx, { organizationId: revision.organizationId, actorId, eventName, subjectType: "document_revision", subjectId: revision.id, reason, before: { state: revision.state, isCurrent: revision.isCurrent }, after: { ...evidenceFields(revision), state, isCurrent: current, drawingVersion: drawing.version + 1, ...(sourceAuditEventId ? { sourceAuditEventId } : {}) } });
    await tx.revisionStateChange.create({ data: { organizationId: revision.organizationId, projectId: revision.projectId, revisionId: revision.id, fromState: revision.state, toState: state, actorId, reason, eventId } });
    return tx.documentRevision.update({ where: { id: revision.id }, data: { state, isCurrent: current } });
  }
  /** Internal DOC port only. S13/S14 must produce canonical exact evidence; never expose this via HTTP. */
  async consumeApproval(tx: Tx, revisionId: string, auditEventId: string, kind: RevisionApprovalKind) {
    const revision = await tx.documentRevision.findUnique({ where: { id: revisionId } });
    if (!revision) throw new NotFoundException("Revision not found");
    await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id"=${revision.projectId}::uuid FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "drawing_records" WHERE "id"=${revision.drawingId}::uuid FOR UPDATE`;
    const locked = await tx.documentRevision.findUniqueOrThrow({ where: { id: revisionId } });
    const project = await tx.project.findUniqueOrThrow({ where: { id: locked.projectId } });
    if (project.status !== ProjectStatus.ACTIVE) throw new ConflictException("Only Active projects accept approval evidence");
    const evidence = await tx.auditEvent.findUnique({ where: { id: auditEventId } });
    const after = evidence?.after as Record<string, unknown> | undefined;
    const matches = evidence && evidence.organizationId === locked.organizationId && evidence.eventKey === (kind === "INTERNAL" ? "review.approved" : "client.approved") && Object.entries(evidenceFields(locked)).every(([key, value]) => after?.[key] === value);
    if (!matches || !evidence.actorId || !evidence.reason || evidence.reason.trim().length < 3) throw new ConflictException("Approval evidence does not match this exact revision");
    if (kind === RevisionApprovalKind.CLIENT) {
      const internal = await tx.revisionApprovalFact.findUnique({ where: { revisionId_kind: { revisionId, kind: RevisionApprovalKind.INTERNAL } } });
      const internalAudit = internal ? await tx.auditEvent.findUnique({ where: { id: internal.auditEventId } }) : null;
      if (!internalAudit || !locked.isCurrent || !["APPROVED", "ISSUED"].includes(locked.state) || evidence.occurredAt < internalAudit.occurredAt) throw new ConflictException("Client approval requires current internally approved exact revision");
    }
    await tx.revisionApprovalFact.create({ data: { organizationId: locked.organizationId, projectId: locked.projectId, revisionId, kind, auditEventId } });
    if (kind === RevisionApprovalKind.CLIENT) return locked;
    if (![RevisionState.SUBMITTED, RevisionState.REVIEWED].includes(locked.state as "SUBMITTED" | "REVIEWED")) throw new ConflictException("Internal approval requires a submitted exact revision");
    const current = await tx.documentRevision.findFirst({ where: { drawingId: locked.drawingId, isCurrent: true } });
    if (current && current.ordinal > locked.ordinal) throw new ConflictException("A newer approved revision is already current");
    if (current && current.id !== locked.id) await this.change(tx, current, RevisionState.SUPERSEDED, evidence.actorId!, "Newer exact revision approved", "document.superseded", false);
    const approved = await this.change(tx, locked, RevisionState.APPROVED, evidence.actorId!, evidence.reason ?? "Exact internal review approved", "document.approved", true, auditEventId);
    await tx.drawingRecord.update({ where: { id: locked.drawingId }, data: { version: { increment: 1 } } });
    return approved;
  }
  /** Future review producer supplies canonical exact submitted/correction evidence, not caller-selected states. */
  async consumeReviewState(tx: Tx, revisionId: string, auditEventId: string) {
    const revision = await tx.documentRevision.findUniqueOrThrow({ where: { id: revisionId } });
    await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id"=${revision.projectId}::uuid FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "drawing_records" WHERE "id"=${revision.drawingId}::uuid FOR UPDATE`;
    const locked = await tx.documentRevision.findUniqueOrThrow({ where: { id: revisionId } });
    const project = await tx.project.findUniqueOrThrow({ where: { id: locked.projectId } });
    if (project.status !== ProjectStatus.ACTIVE) throw new ConflictException("Only Active projects accept review transitions");
    const evidence = await tx.auditEvent.findUniqueOrThrow({ where: { id: auditEventId } });
    const after = evidence.after as Record<string, unknown> | undefined;
    if (!evidence.actorId || !evidence.reason || evidence.reason.trim().length < 3 || evidence.organizationId !== locked.organizationId || !Object.entries(evidenceFields(locked)).every(([key, value]) => after?.[key] === value)) throw new ConflictException("Review evidence does not match this exact revision");
    const state = evidence.eventKey === "review.requested" && locked.state === RevisionState.WORKING ? RevisionState.SUBMITTED : evidence.eventKey === "review.correction_requested" && locked.state === RevisionState.SUBMITTED ? RevisionState.REVIEWED : null;
    if (!state) throw new ConflictException("Invalid review evidence transition");
    const changed = await this.change(tx, locked, state, evidence.actorId!, evidence.reason ?? "Exact review evidence consumed", "revision.state_changed", false, auditEventId);
    await tx.drawingRecord.update({ where: { id: locked.drawingId }, data: { version: { increment: 1 } } });
    return changed;
  }
  async issue(actor: ProjectActor, projectId: string, input: { revisionIds: string[]; recipientAccountIds: string[]; purpose: string; reason: string; acknowledgementRequired: boolean }) {
    return this.transaction(async (tx) => {
      const project = await this.project(tx, actor, projectId, "document.issue", true);
      if (project.status !== ProjectStatus.ACTIVE) throw new ConflictException("Only Active projects can formally issue drawings");
      const revisions = [];
      const candidates = await tx.documentRevision.findMany({ where: { id: { in: input.revisionIds }, organizationId: actor.organizationId, projectId }, orderBy: { drawingId: "asc" } });
      if (candidates.length !== input.revisionIds.length) throw new NotFoundException("Revision not found");
      for (const candidate of candidates) {
        await tx.$queryRaw`SELECT "id" FROM "drawing_records" WHERE "id"=${candidate.drawingId}::uuid FOR UPDATE`;
        const revision = await tx.documentRevision.findUniqueOrThrow({ where: { id: candidate.id }, include: { approvals: true, drawing: true } });
        await this.documents.authorizeFile(tx, actor, revision.fileId);
        if (!revision.approvals.some((fact) => fact.kind === RevisionApprovalKind.INTERNAL)) throw new ConflictException(INTERNAL_BLOCKER);
        if ((revision.drawing.clientApprovalRequired || revision.series === "CR") && !revision.approvals.some((fact) => fact.kind === RevisionApprovalKind.CLIENT)) throw new ConflictException(CLIENT_BLOCKER);
        if (!revision.isCurrent || ![RevisionState.APPROVED, RevisionState.ISSUED].includes(revision.state as "APPROVED" | "ISSUED")) throw new ConflictException("Only the current approved exact revision may be issued");
        revisions.push(revision);
      }
      for (const accountId of input.recipientAccountIds) {
        const account = await tx.account.findUnique({ where: { id: accountId } });
        if (account?.kind === AccountKind.CLIENT) {
          for (const revision of revisions) await this.clientRecipient(tx, projectId, accountId, revision.id);
          continue;
        }
        if (!account || ![AccountKind.OWNER, AccountKind.STAFF].includes(account.kind as "OWNER" | "STAFF")) throw new ForbiddenException("Recipient has no internal project access");
        const recipient = { accountId, kind: account.kind, organizationId: actor.organizationId };
        await this.project(tx, recipient, projectId);
        for (const revision of revisions) await this.documents.authorizeFile(tx, recipient, revision.fileId);
      }
      const transmittal = await tx.drawingTransmittal.create({ data: { organizationId: actor.organizationId, projectId, senderId: actor.accountId, purpose: input.purpose, reason: input.reason } });
      await tx.transmittalItem.createMany({ data: revisions.map((revision) => ({ transmittalId: transmittal.id, organizationId: actor.organizationId, projectId, revisionId: revision.id, sha256: revision.sha256, clientApprovalRequired: revision.drawing.clientApprovalRequired || revision.series === "CR" })) });
      await tx.transmittalRecipient.createMany({ data: input.recipientAccountIds.map((accountId) => ({ transmittalId: transmittal.id, organizationId: actor.organizationId, projectId, accountId, acknowledgementRequired: input.acknowledgementRequired })) });
      for (const revision of revisions) {
        const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "document.issued", subjectType: "document_revision", subjectId: revision.id, reason: input.reason, before: { state: revision.state, isCurrent: revision.isCurrent }, after: { ...evidenceFields(revision), transmittalId: transmittal.id, purpose: input.purpose, recipientAccountIds: input.recipientAccountIds, state: "ISSUED", isCurrent: true } });
        if (revision.state === RevisionState.APPROVED) {
          await tx.revisionStateChange.create({ data: { organizationId: actor.organizationId, projectId, revisionId: revision.id, fromState: RevisionState.APPROVED, toState: RevisionState.ISSUED, actorId: actor.accountId, reason: input.reason, eventId } });
          await tx.documentRevision.update({ where: { id: revision.id }, data: { state: RevisionState.ISSUED } });
        }
        await tx.fileRetentionRecord.upsert({ where: { blobId: revision.blobId }, create: { blobId: revision.blobId, organizationId: actor.organizationId, retentionClass: DocumentRetentionClass.ISSUED_DRAWING }, update: { retentionClass: DocumentRetentionClass.ISSUED_DRAWING } });
      }
      return { id: transmittal.id, issuedAt: transmittal.issuedAt };
    });
  }
  async acknowledge(actor: ProjectActor, transmittalId: string, input: { note: string; reason: string }) {
    return this.transaction(async (tx) => {
      const row = await tx.drawingTransmittal.findFirst({ where: { id: transmittalId, organizationId: actor.organizationId }, include: { items: true } });
      if (!row) throw new NotFoundException("Transmittal not found");
      await this.project(tx, actor, row.projectId);
      for (const item of row.items) { const revision = await tx.documentRevision.findUniqueOrThrow({ where: { id: item.revisionId } }); await this.documents.authorizeFile(tx, actor, revision.fileId); }
      await tx.$queryRaw`SELECT "accountId" FROM "transmittal_recipients" WHERE "transmittalId"=${transmittalId}::uuid AND "accountId"=${actor.accountId}::uuid FOR UPDATE`;
      const recipient = await tx.transmittalRecipient.findUnique({ where: { transmittalId_accountId: { transmittalId, accountId: actor.accountId } } });
      if (!recipient) throw new ForbiddenException("Only the named recipient can acknowledge this issue");
      if (recipient.acknowledgedAt) throw new ConflictException("Issue is already acknowledged");
      const acknowledgedAt = new Date();
      await tx.transmittalRecipient.update({ where: { transmittalId_accountId: { transmittalId, accountId: actor.accountId } }, data: { acknowledgedAt, note: input.note } });
      await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "transmittal.acknowledged", subjectType: "transmittal", subjectId: transmittalId, reason: input.reason, after: { projectId: row.projectId, accountId: actor.accountId, acknowledgedAt: acknowledgedAt.toISOString(), note: input.note } });
      return { acknowledgedAt };
    });
  }
  async stream(actor: ProjectActor, revisionId: string) {
    const revision = await this.transaction(async (tx) => {
      const row = await tx.documentRevision.findFirst({ where: { id: revisionId, organizationId: actor.organizationId } });
      if (!row) throw new NotFoundException("Revision not found");
      await this.project(tx, actor, row.projectId);
      await this.documents.authorizeFile(tx, actor, row.fileId);
      return row;
    });
    const file = await this.documents.stream(actor, revision.fileId);
    return { ...file, label: label(revision), state: revision.state };
  }
}

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { DocumentService } from "./document.service.js";
import { TurnkeyService } from "./turnkey.service.js";
import { SiteService } from "./site.service.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import type { ProjectActor } from "./project.service.js";
import { authorizeExternal, externalEvidence, externalGrantUsable, externalRevocationNotices, type ExternalActor, type ExternalTx } from "./external-portal-policy.js";
import { DOCUMENT_CHUNK_SIZE, validateDocumentFile, validateFirstChunk } from "./document-file-policy.js";
import { recordProjectEvent } from "./project-events.js";

type Actor = ProjectActor & { sessionId?: string };
type Grant = NonNullable<Awaited<ReturnType<ExternalTx["externalPortalGrant"]["findUnique"]>>>;
type GrantInput = { email: string; portalType: string; revisionIds: string[]; releaseIds: string[]; packageIds: string[]; expiresAt?: string | undefined; closeoutTaskId?: string | undefined; reason: string };
type ChangeInput = { expectedVersion: number; reason: string; revisionIds?: string[] | undefined; releaseIds?: string[] | undefined; packageIds?: string[] | undefined; expiresAt?: string | undefined; revoke?: true | undefined };
type Submission = { grantId: string; kind: string; title: string; body: string; revisionId?: string | undefined; releaseId?: string | undefined; packageId?: string | undefined; reason: string };
const safeGrant = (g: Grant) => ({ id: g.id, accountId: g.accountId, portalType: g.portalType, version: g.version, revisionIds: g.revisionIds, releaseIds: g.releaseIds, packageIds: g.packageIds, expiresAt: g.expiresAt, revokedAt: g.revokedAt, closeoutTaskId: g.closeoutTaskId });
const unique = (ids: string[]) => [...new Set(ids)].sort();
const jsonHash = (value: object) => createHash("sha256").update(JSON.stringify(value, Object.keys(value).sort())).digest("hex");

@Injectable()
export class ExternalPortalService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService, private readonly documents: DocumentService, private readonly turnkey: TurnkeyService, private readonly site: SiteService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private transaction<T>(work: (tx: ExternalTx) => Promise<T>) { return this.database.prisma.$transaction(work, { timeout: 30_000 }); }
  private async staff(tx: ExternalTx, actor: Actor, projectId: string, write = false, closeout = false) {
    if (write) await tx.$queryRaw`SELECT id FROM projects WHERE id=${projectId}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR UPDATE`;
    else await tx.$queryRaw`SELECT id FROM projects WHERE id=${projectId}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR SHARE`;
    const project = await tx.project.findFirst({ where: { id: projectId, organizationId: actor.organizationId } });
    if (!project) throw new NotFoundException("Project not found");
    await tx.$queryRaw`SELECT id FROM accounts WHERE id=${actor.accountId}::uuid FOR SHARE`;
    if (actor.sessionId) await tx.$queryRaw`SELECT id FROM sessions WHERE id=${actor.sessionId}::uuid FOR SHARE`;
    const account = await tx.account.findFirst({ where: { id: actor.accountId, kind: actor.kind, state: "ACTIVE" }, include: { employee: true } });
    if (!account || !["OWNER", "STAFF"].includes(account.kind)) throw new ForbiddenException("Current internal authority required");
    if (account.kind === "STAFF") {
      const employee = account.employee;
      if (!employee || employee.organizationId !== actor.organizationId || employee.state !== "ACTIVE") throw new ForbiddenException("Active employee required");
      // Fence insertion of a new scoped DENY through the employee foreign key.
      await tx.$queryRaw`SELECT id FROM employees WHERE id=${employee.id}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM project_assignments WHERE "employeeId"=${employee.id}::uuid AND "projectId"=${projectId}::uuid AND "revokedAt" IS NULL FOR SHARE`;
      const current = await tx.employee.findUniqueOrThrow({ where: { id: employee.id } });
      const assignment = await tx.projectAssignment.findFirst({ where: { projectId, employeeId: employee.id, revokedAt: null } });
      if (current.state !== "ACTIVE" || !assignment || current.homeBranchId !== project.branchId && !assignment.crossBranchAuthorized) throw new ForbiddenException("Current assigned project authority required");
      await tx.$queryRaw`SELECT id FROM employee_permission_overrides WHERE "employeeId"=${employee.id}::uuid AND "revokedAt" IS NULL FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM employee_job_role_assignments WHERE "employeeId"=${employee.id}::uuid AND "effectiveTo" IS NULL FOR SHARE`;
      await tx.$queryRaw`SELECT p.id FROM role_permissions p JOIN employee_job_role_assignments a ON a."jobRoleId"=p."roleId" WHERE a."employeeId"=${employee.id}::uuid AND a."effectiveTo" IS NULL AND p."revokedAt" IS NULL FOR SHARE OF p`;
      const scope = { kind: "BRANCH" as const, organizationId: project.organizationId, branchId: project.branchId };
      await this.authorization.assertPermission(actor.accountId, "project.view", scope, tx);
      if (project.currentLeadEmployeeId !== employee.id) await this.authorization.assertPermission(actor.accountId, closeout || project.status === "CANCELLED" ? "project.closeout_approve" : "external.manage", scope, tx);
    }
    const now = (await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`)[0]!.now;
    if (actor.sessionId) {
      const session = await tx.session.findUnique({ where: { id: actor.sessionId } });
      if (!session || session.accountId !== actor.accountId || session.revokedAt || session.expiresAt <= now || session.lastUsedAt.getTime() + 30 * 60_000 <= now.getTime()) throw new ForbiddenException("Session ended. Sign in again");
    }
    return { project, now };
  }
  private async scopes(tx: ExternalTx, actor: Actor, projectId: string, scope: Pick<GrantInput, "revisionIds" | "releaseIds" | "packageIds">) {
    const revisionIds = unique(scope.revisionIds), releaseIds = unique(scope.releaseIds), packageIds = unique(scope.packageIds);
    if (!revisionIds.length && !releaseIds.length && !packageIds.length) throw new BadRequestException("Choose exact files or work context");
    if (revisionIds.length + releaseIds.length + packageIds.length > 150) throw new BadRequestException("Too many scope items");
    const revisions = revisionIds.length ? await this.documents.externalOptions(tx, actor, projectId) : [];
    const releases = releaseIds.length ? await this.turnkey.externalOptions(tx, actor, projectId) : [];
    const packages = packageIds.length ? await this.site.externalOptions(tx, actor, projectId) : [];
    if (revisionIds.some(id => !revisions.some(row => row.id === id)) || releaseIds.some(id => !releases.some(row => row.id === id)) || packageIds.some(id => !packages.some(row => row.id === id))) throw new ForbiddenException("Choose currently permitted exact project resources");
    return { revisionIds, releaseIds, packageIds };
  }
  private expiry(value: string | undefined, now: Date, required = false) {
    if (!value) { if (required) throw new BadRequestException("Closeout access requires an explicit future end time"); return null; }
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date <= now) throw new BadRequestException("Future access end time required");
    return date;
  }
  private async optionalOptions<T>(read: () => Promise<T[]>): Promise<T[]> {
    try { return await read(); }
    catch (error) { if (error instanceof ForbiddenException) return []; throw error; }
  }
  async createGrant(actor: Actor, projectId: string, input: GrantInput) {
    return this.transaction(async tx => {
      const { project } = await this.staff(tx, actor, projectId, true, Boolean(input.closeoutTaskId));
      if (input.closeoutTaskId) {
        if (project.status !== "CANCELLED") throw new ConflictException("Closeout access requires a Cancelled project");
        await tx.$queryRaw`SELECT id FROM tasks WHERE id=${input.closeoutTaskId}::uuid FOR SHARE`;
        await tx.$queryRaw`SELECT id FROM task_closeout_approvals WHERE "taskId"=${input.closeoutTaskId}::uuid FOR SHARE`;
        const task = await tx.task.findFirst({ where: { id: input.closeoutTaskId, projectId, organizationId: actor.organizationId, type: "CLOSEOUT", status: { notIn: ["COMPLETED", "STOPPED_DUE_TO_PROJECT_CANCELLATION"] }, closeoutApproval: { revokedAt: null } } });
        if (!task) throw new ForbiddenException("Existing approved unfinished closeout task required");
        if (input.releaseIds.length) throw new BadRequestException("Closeout access names files and work packages, not delivery releases");
      } else if (project.status !== "ACTIVE") throw new ConflictException("Ordinary external grants require an Active project");
      const scopes = await this.scopes(tx, actor, projectId, input);
      const normalizedEmail = input.email.trim().toLowerCase();
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedEmail}))`;
      let account = await tx.account.findUnique({ where: { normalizedEmail } });
      if (account) {
        await tx.$queryRaw`SELECT id FROM accounts WHERE id=${account.id}::uuid FOR SHARE`;
        account = await tx.account.findUnique({ where: { normalizedEmail } });
      }
      if (account && (account.kind !== "EXTERNAL" || account.state !== "ACTIVE")) throw new ForbiddenException("Email is not an available external identity");
      account ??= await tx.account.create({ data: { normalizedEmail, kind: "EXTERNAL", state: "ACTIVE" } });
      const { now } = await this.staff(tx, actor, projectId, true, Boolean(input.closeoutTaskId));
      const grant = await tx.externalPortalGrant.create({ data: { organizationId: project.organizationId, projectId, accountId: account.id, portalType: input.portalType, ...scopes, expiresAt: this.expiry(input.expiresAt, now, Boolean(input.closeoutTaskId)), closeoutTaskId: input.closeoutTaskId ?? null, invitedById: actor.accountId, reason: input.reason } });
      await externalEvidence(tx, actor.accountId, "external_portal_grants", grant.id, 1, input.reason);
      return safeGrant(grant);
    });
  }
  async changeGrant(actor: Actor, grantId: string, input: ChangeInput) {
    return this.transaction(async tx => {
      const preview = await tx.externalPortalGrant.findUnique({ where: { id: grantId } });
      if (!preview) throw new NotFoundException("Grant not found");
      const { project } = await this.staff(tx, actor, preview.projectId, true, Boolean(preview.closeoutTaskId));
      await tx.$queryRaw`SELECT id FROM external_portal_grants WHERE id=${grantId}::uuid FOR UPDATE`;
      const grant = await tx.externalPortalGrant.findUniqueOrThrow({ where: { id: grantId } });
      if (grant.revokedAt || grant.version !== input.expectedVersion) throw new ConflictException("Access changed. Refresh and retry");
      if (!input.revoke && project.status !== "ACTIVE" && !(project.status === "CANCELLED" && grant.closeoutTaskId)) throw new ConflictException("Project cannot expand delivery access");
      if (input.revoke && (input.revisionIds || input.releaseIds || input.packageIds || input.expiresAt)) throw new BadRequestException("Revocation cannot alter scope");
      if (!input.revoke && grant.closeoutTaskId && (!(await externalGrantUsable(tx, grant.id)) || (input.releaseIds ?? grant.releaseIds).length)) throw new ConflictException("Closeout scope must remain valid files and work packages");
      const scopes = input.revoke ? {} : await this.scopes(tx, actor, grant.projectId, { revisionIds: input.revisionIds ?? grant.revisionIds, releaseIds: input.releaseIds ?? grant.releaseIds, packageIds: input.packageIds ?? grant.packageIds });
      const { now } = await this.staff(tx, actor, grant.projectId, true, Boolean(grant.closeoutTaskId));
      const updated = await tx.externalPortalGrant.update({ where: { id: grant.id, version: grant.version }, data: { ...scopes, ...(input.expiresAt ? { expiresAt: this.expiry(input.expiresAt, now, Boolean(grant.closeoutTaskId)) } : {}), ...(input.revoke ? { revokedAt: now } : {}), version: { increment: 1 } } });
      await externalEvidence(tx, actor.accountId, "external_portal_grants", updated.id, updated.version, input.reason);
      await externalRevocationNotices(tx, updated.projectId);
      await this.staff(tx, actor, updated.projectId, true, Boolean(updated.closeoutTaskId));
      return safeGrant(updated);
    });
  }
  async staffWorkspace(actor: Actor, projectId: string) {
    return this.transaction(async tx => {
      const { project } = await this.staff(tx, actor, projectId);
      const grants = await tx.externalPortalGrant.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } });
      const labeled = [];
      for (const grant of grants) labeled.push({ ...safeGrant(grant), email: (await tx.account.findUniqueOrThrow({ where: { id: grant.accountId } })).normalizedEmail });
      const cadShares = [];
      for (const share of await tx.externalCadShare.findMany({ where: { projectId }, orderBy: { issuedAt: "asc" } })) {
        const confidential = !(await tx.$queryRaw<Array<{ allowed: boolean }>>`SELECT s21_nonconfidential_revision(${share.revisionId}::uuid) AS allowed`)[0]!.allowed;
        cadShares.push({ id: share.id, grantId: share.grantId, revisionId: share.revisionId, nativeLinkId: share.nativeLinkId, issuedAt: share.issuedAt, expiresAt: share.expiresAt, version: share.version, revokedAt: share.revokedAt, revocationRequired: !share.revokedAt && share.expiresAt > new Date() && (!(await externalGrantUsable(tx, share.grantId)) || !grants.some(g => g.id === share.grantId && g.revisionIds.includes(share.revisionId)) || confidential) });
      }
      const records = await tx.externalPortalRecord.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } });
      const uploads = await tx.externalPortalUpload.findMany({ where: { projectId, state: "FINALIZED" }, orderBy: { createdAt: "asc" } });
      const revisionOptions = await this.optionalOptions(() => this.documents.externalOptions(tx, actor, projectId));
      const releaseOptions = await this.optionalOptions(() => this.turnkey.externalOptions(tx, actor, projectId));
      const packageOptions = await this.optionalOptions(() => this.site.externalOptions(tx, actor, projectId));
      const closeoutTaskOptions = await tx.task.findMany({ where: { projectId, type: "CLOSEOUT", status: { notIn: ["COMPLETED", "STOPPED_DUE_TO_PROJECT_CANCELLATION"] }, closeoutApproval: { revokedAt: null } }, select: { id: true, title: true, status: true } });
      await this.staff(tx, actor, projectId);
      return { project: { id: project.id, title: project.title, status: project.status, version: project.version }, grants: labeled, revisionOptions, releaseOptions, packageOptions, closeoutTaskOptions, requests: records.filter(r => r.kind === "STAFF_REQUEST").map(r => this.record(r)), submissions: records.filter(r => r.kind !== "STAFF_REQUEST").map(r => this.record(r)), uploads: uploads.map(r => this.uploadMetadata(r)), cadShares, capabilities: { manage: project.status === "ACTIVE" || project.status === "CANCELLED", issueCad: actor.kind === "OWNER" } };
    });
  }
  private record(r: { id: string; grantId: string; kind: string; title: string; body: string; revisionId: string | null; releaseId: string | null; packageId: string | null; dueDate: Date | null; createdAt: Date }) { return { id: r.id, grantId: r.grantId, kind: r.kind, title: r.title, body: r.body, revisionId: r.revisionId, releaseId: r.releaseId, packageId: r.packageId, dueDate: r.dueDate, createdAt: r.createdAt }; }
  async createRequest(actor: Actor, projectId: string, input: { grantId: string; title: string; body: string; dueDate?: string | undefined; expectedGrantVersion: number; reason: string }) {
    return this.transaction(async tx => {
      const preview = await tx.externalPortalGrant.findUnique({ where: { id: input.grantId } });
      await this.staff(tx, actor, projectId, true, Boolean(preview?.closeoutTaskId));
      await tx.$queryRaw`SELECT id FROM external_portal_grants WHERE id=${input.grantId}::uuid FOR SHARE`;
      const grant = await tx.externalPortalGrant.findUnique({ where: { id: input.grantId } });
      if (grant?.closeoutTaskId) {
        await tx.$queryRaw`SELECT id FROM tasks WHERE id=${grant.closeoutTaskId}::uuid FOR SHARE`;
        await tx.$queryRaw`SELECT id FROM task_closeout_approvals WHERE "taskId"=${grant.closeoutTaskId}::uuid FOR SHARE`;
      }
      await this.staff(tx, actor, projectId, true, Boolean(grant?.closeoutTaskId));
      if (!grant || grant.projectId !== projectId || grant.version !== input.expectedGrantVersion || !(await externalGrantUsable(tx, grant.id))) throw new ConflictException("Current external grant required");
      const project = await tx.project.findUniqueOrThrow({ where: { id: projectId } });
      if (project.status !== "ACTIVE" && !grant.closeoutTaskId) throw new ConflictException("Active delivery or approved closeout work required");
      const row = await tx.externalPortalRecord.create({ data: { organizationId: actor.organizationId, projectId, grantId: grant.id, actorId: actor.accountId, kind: "STAFF_REQUEST", title: input.title, body: input.body, dueDate: input.dueDate ? new Date(input.dueDate) : null, reason: input.reason } });
      await externalEvidence(tx, actor.accountId, "external_portal_records", row.id, 1, input.reason);
      return this.record(row);
    });
  }
  async projects(actor: ExternalActor) {
    return this.transaction(async tx => {
      const previews = await tx.externalPortalGrant.findMany({ where: { accountId: actor.accountId, revokedAt: null }, orderBy: { createdAt: "asc" } });
      const projects = [], visited = new Set<string>();
      for (const preview of previews) if (!visited.has(preview.projectId) && await externalGrantUsable(tx, preview.id)) {
        const { project, grants } = await authorizeExternal(tx, actor, preview.projectId);
        projects.push({ id: project.id, title: project.title, status: project.status, portalType: grants[0]!.portalType }); visited.add(project.id);
      }
      // Earlier projects may expire while a later project's locks are awaited.
      for (const project of projects) await authorizeExternal(tx, actor, project.id);
      return { projects };
    });
  }
  async workspace(actor: ExternalActor, projectId: string) {
    return this.transaction(async tx => {
      const { project, grants } = await authorizeExternal(tx, actor, projectId);
      const revisionIds = unique(grants.flatMap(g => g.revisionIds)), releaseIds = unique(grants.flatMap(g => g.releaseIds)), packageIds = unique(grants.flatMap(g => g.packageIds)), grantIds = grants.map(g => g.id);
      const revisions: Array<Awaited<ReturnType<DocumentService["externalRevision"]>>["public"]> = [];
      for (const id of revisionIds) { try { revisions.push((await this.documents.externalRevision(tx, projectId, id)).public); } catch (error) { if (!(error instanceof ForbiddenException)) throw error; } }
      const production = await this.turnkey.externalProduction(tx, projectId, releaseIds);
      const packages = await this.site.externalPackages(tx, projectId, packageIds);
      const records = (await tx.externalPortalRecord.findMany({ where: { projectId, grantId: { in: grantIds }, OR: [{ kind: "STAFF_REQUEST" }, { actorId: actor.accountId }] }, orderBy: { createdAt: "asc" } })).filter(row => {
        const grant = grants.find(candidate => candidate.id === row.grantId)!;
        return (!row.revisionId || grant.revisionIds.includes(row.revisionId) && revisions.some(revision => revision.id === row.revisionId)) &&
          (!row.releaseId || grant.releaseIds.includes(row.releaseId) && production.some(release => release.id === row.releaseId)) &&
          (!row.packageId || grant.packageIds.includes(row.packageId) && packages.some(workPackage => workPackage.id === row.packageId));
      });
      const uploads = await tx.externalPortalUpload.findMany({ where: { projectId, grantId: { in: grantIds }, actorId: actor.accountId, state: "FINALIZED" }, orderBy: { createdAt: "asc" } });
      const transmittals = [];
      for (const recipient of await tx.transmittalRecipient.findMany({ where: { projectId, accountId: actor.accountId }, include: { transmittal: { include: { items: true } } } })) if (recipient.transmittal.items.every(i => revisions.some(r => r.id === i.revisionId))) transmittals.push({ id: recipient.transmittalId, purpose: recipient.transmittal.purpose, issuedAt: recipient.transmittal.issuedAt, revisionIds: recipient.transmittal.items.map(i => i.revisionId), acknowledgementRequired: recipient.acknowledgementRequired, acknowledgedAt: recipient.acknowledgedAt });
      const cadShares = await tx.externalCadShare.findMany({ where: { projectId, grantId: { in: grantIds }, revisionId: { in: revisions.map(r => r.id) }, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, grantId: true, revisionId: true, expiresAt: true } });
      // Use the final usable grants, not merely the presence of another valid
      // grant, after resource projections and recipient locks have completed.
      const { grants: currentGrants, now } = await authorizeExternal(tx, actor, projectId);
      const currentRevisionIds = new Set(currentGrants.flatMap(g => g.revisionIds));
      const currentReleaseIds = new Set(currentGrants.flatMap(g => g.releaseIds));
      const currentPackageIds = new Set(currentGrants.flatMap(g => g.packageIds));
      const currentGrantIds = new Set(currentGrants.map(g => g.id));
      const currentRevisions = revisions.filter(r => currentRevisionIds.has(r.id));
      const currentProduction = production.filter(r => currentReleaseIds.has(r.id));
      const currentPackages = packages.filter(r => currentPackageIds.has(r.id));
      const currentRecords = records.filter(row => {
        const grant = currentGrants.find(g => g.id === row.grantId);
        return grant && (!row.revisionId || grant.revisionIds.includes(row.revisionId)) &&
          (!row.releaseId || grant.releaseIds.includes(row.releaseId)) &&
          (!row.packageId || grant.packageIds.includes(row.packageId));
      });
      const currentTransmittals = transmittals.filter(t => t.revisionIds.every(id => currentRevisions.some(r => r.id === id)));
      const currentCadShares = cadShares.filter(share => share.expiresAt > now && currentGrants.some(g => g.id === share.grantId && g.revisionIds.includes(share.revisionId))).map(({ id, revisionId, expiresAt }) => ({ id, revisionId, expiresAt }));
      const submit = project.status === "ACTIVE" || project.status === "CANCELLED" && currentGrants.every(g => Boolean(g.closeoutTaskId));
      return { project: { id: project.id, title: project.title, status: project.status }, grants: currentGrants.map(safeGrant), revisions: currentRevisions, production: currentProduction, packages: currentPackages, requests: currentRecords.filter(r => r.kind === "STAFF_REQUEST").map(r => this.record(r)), submissions: currentRecords.filter(r => r.kind !== "STAFF_REQUEST").map(r => this.record(r)), uploads: uploads.filter(r => currentGrantIds.has(r.grantId)).map(r => this.uploadMetadata(r)), transmittals: currentTransmittals, cadShares: currentCadShares, capabilities: { submit, upload: submit, acknowledge: submit } };
    });
  }
  async submit(actor: ExternalActor, projectId: string, input: Submission, idempotencyKey: string) {
    return this.transaction(async tx => {
      const { project, grants } = await authorizeExternal(tx, actor, projectId, true, input.grantId), grant = grants[0]!;
      if (input.kind === "COMMENT" && !input.revisionId) throw new BadRequestException("Comments require one explicitly granted exact revision");
      if (input.kind === "REVIEW" && (grant.portalType !== "CONSULTANT" || !input.revisionId) || input.kind === "PRODUCTION_STATUS" && (grant.portalType !== "VENDOR_FACTORY" || !input.releaseId && !input.packageId)) throw new ForbiddenException("This portal role cannot submit that evidence");
      if (input.revisionId && !grant.revisionIds.includes(input.revisionId) || input.releaseId && !grant.releaseIds.includes(input.releaseId) || input.packageId && !grant.packageIds.includes(input.packageId)) throw new ForbiddenException("Exact resource permission required");
      if (input.revisionId) await this.documents.externalRevision(tx, projectId, input.revisionId);
      if (input.releaseId && !(await this.turnkey.externalProduction(tx, projectId, [input.releaseId])).length) throw new ConflictException("Production context changed. Request a new exact grant");
      if (input.packageId && !(await this.site.externalPackages(tx, projectId, [input.packageId])).length) throw new ForbiddenException("Named package permission required");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${actor.accountId + idempotencyKey}))`;
      const payloadHash = jsonHash({ projectId, ...input });
      const prior = await tx.externalPortalRecord.findUnique({ where: { actorId_idempotencyKey: { actorId: actor.accountId, idempotencyKey } } });
      await authorizeExternal(tx, actor, projectId, true, input.grantId);
      if (prior) { if (prior.payloadHash !== payloadHash) throw new ConflictException("Submission retry key was used for different evidence"); return this.record(prior); }
      const row = await tx.externalPortalRecord.create({ data: { organizationId: project.organizationId, projectId, grantId: grant.id, actorId: actor.accountId, kind: input.kind, title: input.title, body: input.body, revisionId: input.revisionId ?? null, releaseId: input.releaseId ?? null, packageId: input.packageId ?? null, idempotencyKey, payloadHash, reason: input.reason } });
      await externalEvidence(tx, actor.accountId, "external_portal_records", row.id, 1, input.reason);
      return this.record(row);
    });
  }
  private cipher(secret?: string) { if (!secret || secret.length < 32) throw new ConflictException("Owner native CAD recording is not configured"); return createHash("sha256").update(secret).digest(); }
  private encrypt(value: object, identity: string) {
    const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", this.cipher(this.config.externalShareSecret), iv);
    cipher.setAAD(Buffer.from(identity));
    const bytes = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
    return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${bytes.toString("base64url")}`;
  }
  private decrypt(value: string, identity: string) {
    try { const [iv, tag, bytes] = value.split("."), cipher = createDecipheriv("aes-256-gcm", this.cipher(this.config.externalShareSecret), Buffer.from(iv!, "base64url")); cipher.setAAD(Buffer.from(identity)); cipher.setAuthTag(Buffer.from(tag!, "base64url")); return JSON.parse(Buffer.concat([cipher.update(Buffer.from(bytes!, "base64url")), cipher.final()]).toString("utf8")) as { url: string; extractionCode: string }; }
    catch { throw new ConflictException("Native share details are unavailable; contact the Owner"); }
  }
  async issueCad(actor: Actor, projectId: string, input: { grantId: string; revisionId: string; nativeLinkId: string; url: string; extractionCode: string; expectedGrantVersion: number; reason: string }) {
    if (actor.kind !== "OWNER") throw new ForbiddenException("Only Owner records native CAD links");
    return this.transaction(async tx => {
      const preview = await tx.externalPortalGrant.findUnique({ where: { id: input.grantId } });
      const { project } = await this.staff(tx, actor, projectId, true, Boolean(preview?.closeoutTaskId));
      await tx.$queryRaw`SELECT id FROM external_portal_grants WHERE id=${input.grantId}::uuid FOR SHARE`;
      const grant = await tx.externalPortalGrant.findUnique({ where: { id: input.grantId } });
      if (grant?.closeoutTaskId) {
        await tx.$queryRaw`SELECT id FROM tasks WHERE id=${grant.closeoutTaskId}::uuid FOR SHARE`;
        await tx.$queryRaw`SELECT id FROM task_closeout_approvals WHERE "taskId"=${grant.closeoutTaskId}::uuid FOR SHARE`;
      }
      if (!grant || grant.projectId !== projectId || grant.version !== input.expectedGrantVersion || !grant.revisionIds.includes(input.revisionId) || !(await externalGrantUsable(tx, grant.id))) throw new ForbiddenException("Assigned exact CAD recipient required");
      if (project.status !== "ACTIVE" && !(project.status === "CANCELLED" && grant.closeoutTaskId)) throw new ConflictException("Active delivery or valid closeout access required");
      const file = await this.documents.externalRevision(tx, projectId, input.revisionId);
      if (!file.public.cad) throw new BadRequestException("Native CAD shares require one CAD revision");
      let url: URL; try { url = new URL(input.url); } catch { throw new BadRequestException("Valid native HTTPS link required"); }
      if (url.protocol !== "https:" || url.username || url.password || !input.extractionCode.trim()) throw new BadRequestException("Native HTTPS link and extraction code required");
      const { now } = await this.staff(tx, actor, projectId, true, Boolean(grant.closeoutTaskId));
      const expiresAt = new Date(now.getTime() + 7 * 86400000);
      const row = await tx.externalCadShare.create({ data: { organizationId: project.organizationId, projectId, grantId: grant.id, revisionId: input.revisionId, nativeLinkId: input.nativeLinkId, encryptedSecret: this.encrypt({ url: url.href, extractionCode: input.extractionCode }, `${grant.id}:${input.revisionId}`), issuedById: actor.accountId, issuedAt: now, expiresAt, reason: input.reason } });
      await externalEvidence(tx, actor.accountId, "external_cad_shares", row.id, 1, input.reason);
      return { id: row.id, revisionId: row.revisionId, nativeLinkId: row.nativeLinkId, expiresAt: row.expiresAt, version: row.version };
    });
  }
  async revokeCad(actor: Actor, shareId: string, input: { expectedVersion: number; confirmation: string; reason: string }) {
    if (actor.kind !== "OWNER") throw new ForbiddenException("Only Owner confirms native cancellation");
    return this.transaction(async tx => {
      const preview = await tx.externalCadShare.findUnique({ where: { id: shareId } });
      if (!preview) throw new NotFoundException("Native share not found");
      await this.staff(tx, actor, preview.projectId, true);
      await tx.$queryRaw`SELECT id FROM external_cad_shares WHERE id=${shareId}::uuid FOR UPDATE`;
      const share = await tx.externalCadShare.findUniqueOrThrow({ where: { id: shareId } });
      const { now } = await this.staff(tx, actor, share.projectId, true);
      if (share.revokedAt || share.version !== input.expectedVersion) throw new ConflictException("Native share changed. Refresh and retry");
      const row = await tx.externalCadShare.update({ where: { id: shareId, version: share.version }, data: { revokedAt: now, revokedById: actor.accountId, confirmation: input.confirmation, version: { increment: 1 } } });
      await externalEvidence(tx, actor.accountId, "external_cad_shares", row.id, row.version, input.reason);
      return { id: row.id, revokedAt: row.revokedAt, version: row.version };
    });
  }
  async cadShare(actor: ExternalActor, shareId: string) {
    return this.transaction(async tx => {
      const preview = await tx.externalCadShare.findUnique({ where: { id: shareId } });
      if (!preview) throw new NotFoundException("Native share not found");
      const { grants } = await authorizeExternal(tx, actor, preview.projectId, false, preview.grantId);
      await tx.$queryRaw`SELECT id FROM external_cad_shares WHERE id=${shareId}::uuid FOR SHARE`;
      const share = await tx.externalCadShare.findUniqueOrThrow({ where: { id: shareId } });
      await authorizeExternal(tx, actor, share.projectId, false, share.grantId);
      const now = (await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`)[0]!.now;
      if (share.revokedAt || share.expiresAt <= now || !grants[0]!.revisionIds.includes(share.revisionId)) throw new ForbiddenException("Native share access ended");
      await this.documents.externalRevision(tx, share.projectId, share.revisionId);
      return { id: share.id, ...this.decrypt(share.encryptedSecret, `${share.grantId}:${share.revisionId}`), expiresAt: share.expiresAt, warning: "Do not forward this native share or extraction code. The Owner controls cancellation and seven-day expiry." };
    });
  }
  async ownerCadShare(actor: Actor, shareId: string) {
    if (actor.kind !== "OWNER") throw new ForbiddenException("Only Owner may retrieve native administration details");
    return this.transaction(async tx => {
      const share = await tx.externalCadShare.findUnique({ where: { id: shareId } });
      if (!share) throw new NotFoundException("Native share not found");
      await this.staff(tx, actor, share.projectId);
      return { id: share.id, nativeLinkId: share.nativeLinkId, ...this.decrypt(share.encryptedSecret, `${share.grantId}:${share.revisionId}`), expiresAt: share.expiresAt, warning: "Cancel this exact native link in MinisCloud and record confirmation in the app." };
    });
  }
  async scheduleNativeRevocationNotices() { return this.transaction(tx => externalRevocationNotices(tx)); }
  async file(actor: ExternalActor, revisionId: string) {
    const blob = await this.transaction(async tx => {
      const revision = await tx.documentRevision.findUnique({ where: { id: revisionId } });
      if (!revision) throw new NotFoundException("Revision not found");
      const { grants } = await authorizeExternal(tx, actor, revision.projectId);
      if (!grants.some(g => g.revisionIds.includes(revisionId))) throw new ForbiddenException("Exact revision permission required");
      const file = await this.documents.externalRevision(tx, revision.projectId, revisionId);
      if (file.public.cad) throw new ForbiddenException("CAD files require an Owner native share");
      const { grants: currentGrants } = await authorizeExternal(tx, actor, revision.projectId);
      if (!currentGrants.some(g => g.revisionIds.includes(revisionId))) throw new ForbiddenException("Exact revision permission ended");
      return file.blob;
    });
    return this.documents.openExternalBlob(blob);
  }
  private uploadMetadata(row: { id: string; grantId: string; fileName: string; mimeType: string; sizeBytes: bigint; sha256: string | null; createdAt: Date }) { return { id: row.id, grantId: row.grantId, fileName: row.fileName, mimeType: row.mimeType, sizeBytes: Number(row.sizeBytes), sha256: row.sha256, createdAt: row.createdAt }; }
  async uploadStart(actor: ExternalActor, projectId: string, input: { grantId: string; fileName: string; mimeType: string; sizeBytes: number; reason: string }) {
    const file = validateDocumentFile(input.fileName, input.mimeType, input.sizeBytes, this.config.documentMaxFileBytes);
    return this.transaction(async tx => {
      const { project, now } = await authorizeExternal(tx, actor, projectId, true, input.grantId);
      const row = await tx.externalPortalUpload.create({ data: { organizationId: project.organizationId, projectId, grantId: input.grantId, actorId: actor.accountId, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: BigInt(input.sizeBytes), chunkSize: DOCUMENT_CHUNK_SIZE, chunkCount: Math.ceil(input.sizeBytes / DOCUMENT_CHUNK_SIZE), reason: input.reason, expiresAt: new Date(now.getTime() + 86400000) } });
      await externalEvidence(tx, actor.accountId, "external_portal_uploads", row.id, 1, input.reason);
      return { uploadId: row.id, chunkSize: row.chunkSize };
    });
  }
  private async ownUpload(tx: ExternalTx, actor: ExternalActor, uploadId: string, write: boolean) {
    const row = await tx.externalPortalUpload.findUnique({ where: { id: uploadId } });
    if (!row || row.actorId !== actor.accountId) throw new ForbiddenException("Own upload permission required");
    const { now } = await authorizeExternal(tx, actor, row.projectId, write, row.grantId);
    if (row.state === "STAGING" && row.expiresAt <= now) throw new ConflictException("Upload staging expired");
    return row;
  }
  async uploadChunk(actor: ExternalActor, uploadId: string, index: number, bytes: Buffer, checksum: string) {
    const row = await this.transaction(tx => this.ownUpload(tx, actor, uploadId, true));
    if (row.state !== "STAGING" || !Number.isSafeInteger(index) || index < 0 || index >= row.chunkCount) throw new BadRequestException("Invalid active upload chunk");
    const size = index === row.chunkCount - 1 ? Number(row.sizeBytes) - index * row.chunkSize : row.chunkSize;
    if (bytes.length !== size || createHash("sha256").update(bytes).digest("hex") !== checksum.toLowerCase()) throw new BadRequestException("Upload chunk size/checksum mismatch");
    if (index === 0) validateFirstChunk(row.fileName.split(".").at(-1)!.toLowerCase(), bytes);
    await this.documents.writeExternalChunk(uploadId, index, bytes, checksum);
    return this.transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM external_portal_uploads WHERE id=${uploadId}::uuid FOR UPDATE`;
      const current = await this.ownUpload(tx, actor, uploadId, true);
      if (current.state !== "STAGING") throw new ConflictException("Upload already finalized");
      const prior = await tx.externalPortalUploadChunk.findUnique({ where: { uploadId_index: { uploadId, index } } });
      if (prior && (prior.sha256 !== checksum.toLowerCase() || prior.sizeBytes !== bytes.length)) throw new ConflictException("Conflicting chunk retry");
      if (!prior) await tx.externalPortalUploadChunk.create({ data: { uploadId, index, sizeBytes: bytes.length, sha256: checksum.toLowerCase() } });
      return { index, received: true };
    });
  }
  async uploadFinalize(actor: ExternalActor, uploadId: string) {
    const row = await this.transaction(tx => this.ownUpload(tx, actor, uploadId, true));
    if (row.state === "FINALIZED") return this.uploadMetadata(row);
    const chunks = await this.database.prisma.externalPortalUploadChunk.findMany({ where: { uploadId }, orderBy: { index: "asc" } });
    if (chunks.length !== row.chunkCount || chunks.some((part, index) => part.index !== index)) throw new ConflictException("Upload is incomplete");
    const blob = await this.documents.finalizeExternalUpload(uploadId, row.chunkCount, Number(row.sizeBytes));
    return this.transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM external_portal_uploads WHERE id=${uploadId}::uuid FOR UPDATE`;
      const current = await this.ownUpload(tx, actor, uploadId, true);
      if (current.state === "FINALIZED") return this.uploadMetadata(current);
      const updated = await tx.externalPortalUpload.update({ where: { id: uploadId }, data: { state: "FINALIZED", storageKey: blob.key, sha256: blob.sha256, finalizedAt: new Date() } });
      await externalEvidence(tx, actor.accountId, "external_portal_uploads", updated.id, 2, updated.reason);
      return this.uploadMetadata(updated);
    });
  }
  async uploadFile(actor: ExternalActor, uploadId: string) {
    const row = await this.transaction(tx => this.ownUpload(tx, actor, uploadId, false));
    if (row.state !== "FINALIZED" || !row.storageKey) throw new NotFoundException("Upload is not finalized");
    return this.documents.openExternalBlob({ storageKey: row.storageKey, fileName: row.fileName, mimeType: row.mimeType });
  }
  async staffUploadFile(actor: Actor, uploadId: string) {
    const row = await this.transaction(async tx => {
      const upload = await tx.externalPortalUpload.findUnique({ where: { id: uploadId } });
      if (!upload) throw new NotFoundException("Upload not found");
      await this.staff(tx, actor, upload.projectId);
      if (upload.state !== "FINALIZED" || !upload.storageKey) throw new NotFoundException("Upload is not finalized");
      return upload;
    });
    return this.documents.openExternalBlob({ storageKey: row.storageKey!, fileName: row.fileName, mimeType: row.mimeType });
  }
  async acknowledge(actor: ExternalActor, transmittalId: string, input: { note: string; reason: string }) {
    return this.transaction(async tx => {
      const transmission = await tx.drawingTransmittal.findUnique({ where: { id: transmittalId }, include: { items: true } });
      if (!transmission) throw new NotFoundException("Transmittal not found");
      const { grants } = await authorizeExternal(tx, actor, transmission.projectId, true);
      if (!transmission.items.every(i => grants.some(g => g.revisionIds.includes(i.revisionId)))) throw new ForbiddenException("Exact transmittal permission required");
      for (const item of transmission.items) await this.documents.externalRevision(tx, transmission.projectId, item.revisionId);
      await tx.$queryRaw`SELECT "accountId" FROM transmittal_recipients WHERE "transmittalId"=${transmittalId}::uuid AND "accountId"=${actor.accountId}::uuid FOR UPDATE`;
      const recipient = await tx.transmittalRecipient.findUnique({ where: { transmittalId_accountId: { transmittalId, accountId: actor.accountId } } });
      if (!recipient) throw new ForbiddenException("Own recipient acknowledgement required");
      const { grants: currentGrants } = await authorizeExternal(tx, actor, transmission.projectId, true);
      if (!transmission.items.every(i => currentGrants.some(g => g.revisionIds.includes(i.revisionId)))) throw new ForbiddenException("Exact transmittal permission ended");
      if (recipient.acknowledgedAt) return { acknowledgedAt: recipient.acknowledgedAt };
      const row = await tx.transmittalRecipient.update({ where: { transmittalId_accountId: { transmittalId, accountId: actor.accountId } }, data: { acknowledgedAt: new Date(), note: input.note } });
      await recordProjectEvent(tx, { organizationId: transmission.organizationId, actorId: actor.accountId, eventName: "transmittal.acknowledged", subjectType: "transmittal", subjectId: transmittalId, reason: input.reason, after: { projectId: transmission.projectId, accountId: actor.accountId, note: input.note, acknowledgedAt: row.acknowledgedAt!.toISOString() } });
      return { acknowledgedAt: row.acknowledgedAt };
    });
  }
}

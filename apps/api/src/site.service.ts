import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { DocumentService } from "./document.service.js";
import { TurnkeyService } from "./turnkey.service.js";
import { WorkforceService } from "./workforce.service.js";
import { recordProjectEvent } from "./project-events.js";
import { localCalendarDate } from "./task-recurrence-policy.js";
import type { ProjectActor } from "./project.service.js";

type Tx = Prisma.TransactionClient;
type Actor = ProjectActor & { sessionId?: string };
type Project = NonNullable<Awaited<ReturnType<Tx["project"]["findUnique"]>>>;
type Workspace = NonNullable<Awaited<ReturnType<Tx["siteWorkspace"]["findUnique"]>>>;
type RecordRow = NonNullable<Awaited<ReturnType<Tx["siteRecord"]["findUnique"]>>>;
type Data = Record<string, unknown>;
export type SiteCommand = { expectedVersion: number; reason: string };
export type SitePackageInput = { title: string; date: string; tomorrowPlan: string; plannedPercent: string; plannedQuantity: string; unit: string; critical: boolean; releaseId?: string };
export type SiteProgressInput = { actualPercent: string; actualQuantity: string; qualityStatus: "PENDING" | "PASSED" | "FAILED"; materialStatus: string; blockers: string; tomorrowPlan: string; photoIds: string[] };
export type SiteReportInput = { date: string; workCompleted: string; manpower: Array<{ trade: string; count: number }>; materialsReceived: string; photoIds: string[]; issues: string; delayCauses: string; tomorrowPlan: string; supersedesReportId?: string };
const object = (value: Prisma.JsonValue) => value as Data;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const string = (data: Data, key: string) => typeof data[key] === "string" ? data[key] as string : "";
const commonStates = new Set(["OPEN", "ASSIGNED", "IN_PROGRESS", "READY_FOR_VERIFICATION"]);
const decimal = /^\d{1,12}(?:\.\d{1,4})?$/;
function quantities(percent: string, quantity: string) {
  if (!decimal.test(percent) || Number(percent) > 100 || !decimal.test(quantity)) throw new BadRequestException("Report valid percentages from 0 to 100 and nonnegative quantities");
}
function date(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new BadRequestException("Valid calendar date required"); }

@Injectable()
export class SiteService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService, private readonly documents: DocumentService, private readonly turnkey: TurnkeyService, private readonly workforce: WorkforceService) {}
  private transaction<T>(work: (tx: Tx) => Promise<T>) { return this.database.prisma.$transaction(work, { timeout: 30_000 }); }
  /** PORT public boundary: only named package facts; no staff, reports, attendance or finance. */
  async externalPackages(tx: Tx, projectId: string, packageIds: string[]) {
    return tx.siteRecord.findMany({ where: { projectId, id: { in: packageIds }, kind: "PACKAGE" }, orderBy: { createdAt: "asc" } }).then(rows => rows.map(row => ({ id: row.id, title: string(object(row.data), "title"), date: string(object(row.data), "date"), state: row.state })));
  }
  async externalOptions(tx: Tx, actor: Actor, projectId: string) {
    const project = await tx.project.findFirst({ where: { id: projectId, organizationId: actor.organizationId } });
    if (!project || project.deliveryType !== "TURNKEY") return [];
    await this.access(tx, actor, project, "site.view");
    return tx.siteRecord.findMany({ where: { projectId, kind: "PACKAGE" }, orderBy: { createdAt: "asc" } }).then(rows => rows.map(row => ({ id: row.id, title: string(object(row.data), "title") })));
  }
  private scope(project: Project) { return { kind: "BRANCH" as const, organizationId: project.organizationId, branchId: project.branchId }; }
  private async actor(tx: Tx, actor: Actor) {
    await tx.$queryRaw`SELECT id FROM accounts WHERE id=${actor.accountId}::uuid FOR SHARE`;
    const account = await tx.account.findFirst({ where: { id: actor.accountId, state: "ACTIVE", kind: actor.kind }, include: { employee: true } });
    if (!account || !["OWNER", "STAFF"].includes(account.kind) || account.kind === "STAFF" && (!account.employee || account.employee.state !== "ACTIVE" || account.employee.organizationId !== actor.organizationId)) throw new ForbiddenException("Internal site authority ended");
    if (actor.sessionId) {
      await tx.$queryRaw`SELECT id FROM sessions WHERE id=${actor.sessionId}::uuid FOR SHARE`;
      const session = await tx.session.findUnique({ where: { id: actor.sessionId } });
      const now = (await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`)[0]!.now;
      if (!session || session.accountId !== actor.accountId || session.revokedAt || session.expiresAt <= now || session.lastUsedAt.getTime() + 30 * 60_000 <= now.getTime()) throw new ForbiddenException("Session ended. Sign in again");
    }
    return account;
  }
  private async access(tx: Tx, actor: Actor, project: Project, permission = "site.view", write = false) {
    const account = await this.actor(tx, actor);
    if (project.organizationId !== actor.organizationId || project.deliveryType !== "TURNKEY") throw new NotFoundException("Site project not found");
    if (write && project.status !== "ACTIVE") throw new ConflictException("Site delivery requires an Active project");
    if (account.kind === "STAFF") {
      const employeeId = account.employee!.id;
      await tx.$queryRaw`SELECT id FROM employees WHERE id=${employeeId}::uuid FOR SHARE`;
      const employee = await tx.employee.findUniqueOrThrow({ where: { id: employeeId } });
      if (employee.state !== "ACTIVE" || employee.organizationId !== actor.organizationId) throw new ForbiddenException("Employee access ended");
      await tx.$queryRaw`SELECT id FROM project_assignments WHERE "projectId"=${project.id}::uuid AND "employeeId"=${employee.id}::uuid AND "revokedAt" IS NULL FOR SHARE`;
      const assignment = await tx.projectAssignment.findFirst({ where: { organizationId: actor.organizationId, projectId: project.id, employeeId: employee.id, revokedAt: null } });
      if (!assignment || employee.homeBranchId !== project.branchId && !assignment.crossBranchAuthorized) throw new ForbiddenException("Current project assignment required");
      await tx.$queryRaw`SELECT id FROM employee_permission_overrides WHERE "employeeId"=${employee.id}::uuid AND "revokedAt" IS NULL FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM employee_job_role_assignments WHERE "employeeId"=${employee.id}::uuid AND "effectiveTo" IS NULL FOR SHARE`;
      await tx.$queryRaw`SELECT p.id FROM role_permissions p JOIN employee_job_role_assignments a ON a."jobRoleId"=p."roleId" WHERE a."employeeId"=${employee.id}::uuid AND a."effectiveTo" IS NULL AND p."revokedAt" IS NULL FOR SHARE OF p`;
      await this.authorization.assertPermission(actor.accountId, "project.view", this.scope(project), tx);
      await this.authorization.assertPermission(actor.accountId, "site.view", this.scope(project), tx);
      if (permission !== "site.view") await this.authorization.assertPermission(actor.accountId, permission, this.scope(project), tx);
    }
    await this.actor(tx, actor);
    return account;
  }
  private async manager(tx: Tx, actor: Actor, project: Project) {
    const account = await this.access(tx, actor, project);
    if (account.kind === "OWNER" || account.employee?.id === project.currentLeadEmployeeId) return;
    for (const key of ["site.manage", "project.manage", "employee.manage"]) await this.authorization.assertPermission(actor.accountId, key, this.scope(project), tx);
    await this.actor(tx, actor);
  }
  private async can(tx: Tx, actor: Actor, project: Project, key: "manage" | "work" | "view") {
    try { if (key === "manage") await this.manager(tx, actor, project); else await this.access(tx, actor, project, key === "work" ? "site.work" : "site.view"); return true; }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
  }
  private async project(tx: Tx, actor: Actor, id: string, write = false) {
    await tx.$queryRaw`SELECT id FROM projects WHERE id=${id}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR SHARE`;
    const project = await tx.project.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!project) throw new NotFoundException("Site project not found");
    await this.access(tx, actor, project, "site.view", write); return project;
  }
  private async eligible(tx: Tx, actor: Actor, project: Project, accountId: string, work = false, assignedPerson = false) {
    const account = await tx.account.findFirst({ where: { id: accountId, state: "ACTIVE", kind: { in: ["OWNER", "STAFF"] } }, include: { employee: true } });
    if (!account || assignedPerson && (!account.employee || account.kind !== "STAFF")) throw new ForbiddenException("Choose a currently assigned site person");
    await this.access(tx, { accountId, organizationId: actor.organizationId, kind: account.kind }, project, work ? "site.work" : "site.view");
    return account;
  }
  private async authorizePhoto(tx: Tx, actor: Actor, fileId: string) {
    await tx.$queryRaw`SELECT id FROM documents WHERE id=${fileId}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR SHARE`;
    // Lock the complete folder chain and current grants before DOC authorizes this exact immutable file.
    await tx.$queryRaw`SELECT f.id FROM document_folders f JOIN documents d ON d."projectId"=f."projectId" WHERE d.id=${fileId}::uuid AND d."organizationId"=${actor.organizationId}::uuid FOR SHARE OF f`;
    await tx.$queryRaw`SELECT g.id FROM document_access_grants g JOIN employees e ON e.id=g."employeeId" JOIN documents d ON d."projectId"=g."projectId" WHERE d.id=${fileId}::uuid AND d."organizationId"=${actor.organizationId}::uuid AND e."accountId"=${actor.accountId}::uuid AND g."revokedAt" IS NULL FOR SHARE OF g`;
    return this.documents.authorizeFile(tx, actor, fileId);
  }
  private async photos(tx: Tx, actor: Actor, projectId: string, ids: string[]) {
    if (ids.length > 20 || new Set(ids).size !== ids.length) throw new BadRequestException("Choose at most twenty distinct evidence files");
    const evidence = [];
    for (const id of ids) {
      const { document, blob } = await this.authorizePhoto(tx, actor, id);
      if (document.projectId !== projectId) throw new ForbiddenException("Evidence must belong to this project");
      evidence.push({ documentId: document.id, blobId: blob.id, sha256: blob.sha256, name: blob.fileName, mimeType: blob.mimeType });
    }
    return evidence;
  }
  private async visible(tx: Tx, actor: Actor, value: unknown): Promise<unknown> {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return Promise.all(value.map(item => this.visible(tx, actor, item)));
    if (!value || typeof value !== "object") return value;
    const data = value as Data;
    if (typeof data.documentId === "string" && typeof data.blobId === "string") {
      try { const { blob } = await this.authorizePhoto(tx, actor, data.documentId); if (blob.id === data.blobId && blob.sha256 === data.sha256) return data; }
      catch (error) { if (!(error instanceof ForbiddenException || error instanceof NotFoundException)) throw error; }
      return { hidden: true };
    }
    return Object.fromEntries(await Promise.all(Object.entries(data).map(async ([key, item]) => [key, await this.visible(tx, actor, item)])));
  }
  private async history(tx: Tx, actor: Actor, workspace: Workspace, subjectType: string, subjectId: string, subjectVersion: number, snapshot: Data, reason: string) {
    const eventName = subjectType === "site_workspace" ? "site.workspace_changed" : "site.changed";
    const serialized = JSON.stringify(snapshot);
    const digests = await tx.$queryRaw<Array<{ digest: string }>>`SELECT encode(sha256(convert_to(${serialized}::jsonb::text,'UTF8')),'hex') AS digest`;
    const digest = digests[0]!.digest;
    const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName, subjectType, subjectId, reason, after: { projectId: workspace.projectId, version: subjectVersion, snapshotSha256: digest } });
    await tx.siteHistory.create({ data: { workspaceId: workspace.id, organizationId: actor.organizationId, projectId: workspace.projectId, subjectType, subjectId, subjectVersion, actorId: actor.accountId, eventName, reason, snapshot: json(snapshot), eventId } });
    return eventId;
  }
  private async save(tx: Tx, actor: Actor, workspace: Workspace, kind: string, state: string, data: Data, reason: string, prior?: RecordRow) {
    const row = prior ? await tx.siteRecord.update({ where: { id: prior.id, version: prior.version }, data: { version: { increment: 1 }, state, data: json(data) } }) : await tx.siteRecord.create({ data: { workspaceId: workspace.id, organizationId: actor.organizationId, projectId: workspace.projectId, kind, state, data: json(data) } });
    const eventId = await this.history(tx, actor, workspace, "site_record", row.id, row.version, { projectId: row.projectId, recordId: row.id, kind: row.kind, state: row.state, version: row.version, data }, reason);
    return { row, eventId };
  }
  private async write(actor: Actor, projectId: string, input: SiteCommand, run: (tx: Tx, project: Project, workspace: Workspace) => Promise<{ id: string; responsibleAccountId?: string }>) {
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0 || input.reason.trim().length < 3 || input.reason.length > 1000) throw new BadRequestException("Current site version and reason required");
    return this.transaction(async tx => {
      await this.actor(tx, actor);
      const project = await this.project(tx, actor, projectId, true);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ':site:' + projectId},0))`;
      await this.access(tx, actor, project, "site.view", true);
      await tx.$queryRaw`SELECT id FROM site_workspaces WHERE "projectId"=${projectId}::uuid FOR UPDATE`;
      let workspace = await tx.siteWorkspace.findUnique({ where: { projectId } });
      if ((workspace?.version ?? 0) !== input.expectedVersion) throw new ConflictException("Site changed. Refresh and retry");
      if (!workspace) {
        workspace = await tx.siteWorkspace.create({ data: { organizationId: actor.organizationId, projectId } });
        await this.history(tx, actor, workspace, "site_workspace", workspace.id, workspace.version, { projectId, id: workspace.id, version: workspace.version, responsibleAccountId: null }, input.reason);
      }
      const result = await run(tx, project, workspace);
      const updated = await tx.siteWorkspace.update({ where: { id: workspace.id, version: workspace.version }, data: { version: { increment: 1 }, ...(result.responsibleAccountId ? { responsibleAccountId: result.responsibleAccountId } : {}) } });
      await this.history(tx, actor, updated, "site_workspace", updated.id, updated.version, { projectId, id: updated.id, version: updated.version, responsibleAccountId: updated.responsibleAccountId }, input.reason);
      await this.access(tx, actor, project, "site.view", true);
      return { id: result.id, version: updated.version };
    });
  }
  private async recordWrite(actor: Actor, id: string, kind: string, input: SiteCommand, run: (tx: Tx, project: Project, workspace: Workspace, row: RecordRow) => Promise<{ id: string }>) {
    const preview = await this.database.prisma.siteRecord.findFirst({ where: { id, organizationId: actor.organizationId, kind }, select: { projectId: true } });
    if (!preview) throw new NotFoundException("Site record not found");
    return this.write(actor, preview.projectId, input, async (tx, project, workspace) => {
      const row = await tx.siteRecord.findFirst({ where: { id, workspaceId: workspace.id, kind } });
      if (!row) throw new NotFoundException("Site record not found");
      return run(tx, project, workspace, row);
    });
  }
  async projects(actor: Actor) {
    return this.transaction(async tx => {
      await this.actor(tx, actor); const rows = await tx.project.findMany({ where: { organizationId: actor.organizationId, deliveryType: "TURNKEY" }, include: { branch: true }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
      const items = []; for (const project of rows) if (await this.can(tx, actor, project, "view")) items.push({ id: project.id, title: project.title, status: project.status, branchName: project.branch.name }); return { items };
    });
  }
  async detail(actor: Actor, projectId: string) {
    return this.transaction(async tx => {
      const project = await this.project(tx, actor, projectId), workspace = await tx.siteWorkspace.findUnique({ where: { projectId } });
      const today = localCalendarDate(new Date(), (await tx.organization.findUniqueOrThrow({ where: { id: actor.organizationId } })).timezone);
      const tomorrow = new Date(Date.parse(today) + 86400000).toISOString().slice(0, 10);
      const active = project.status === "ACTIVE", manage = await this.can(tx, actor, project, "manage"), work = await this.can(tx, actor, project, "work");
      const people = [];
      for (const account of await tx.account.findMany({ where: { state: "ACTIVE", kind: "STAFF", employee: { state: "ACTIVE", organizationId: actor.organizationId } }, include: { employee: true }, orderBy: { normalizedEmail: "asc" } })) {
        const candidate = { accountId: account.id, kind: account.kind, organizationId: actor.organizationId };
        if (await this.can(tx, candidate, project, "view")) people.push({ accountId: account.id, label: account.normalizedEmail, canWork: await this.can(tx, candidate, project, "work") });
      }
      const rows = workspace ? await tx.siteRecord.findMany({ where: { workspaceId: workspace.id }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] }) : [];
      const history = workspace ? await tx.siteHistory.findMany({ where: { workspaceId: workspace.id }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }], select: { eventName: true, actorId: true, reason: true, occurredAt: true, subjectId: true, subjectVersion: true, snapshot: true } }) : [];
      const snags = [];
      for (const row of rows.filter(row => row.kind === "SNAG")) {
        const data = object(row.data), fixer = string(data, "fixerAccountId") === actor.accountId, verifier = string(data, "verifierAccountId") === actor.accountId;
        snags.push({ ...row, capabilities: { assign: active && manage && ["OPEN", "ASSIGNED", "IN_PROGRESS"].includes(row.state), start: active && fixer && work && row.state === "ASSIGNED", ready: active && fixer && work && row.state === "IN_PROGRESS", appointVerifier: active && manage && commonStates.has(row.state), verify: active && verifier && !fixer && row.state === "READY_FOR_VERIFICATION", close: active && manage && row.state === "VERIFIED" }, attempts: await tx.siteVerificationAttempt.findMany({ where: { snagId: row.id }, orderBy: { repairGeneration: "asc" } }), history: history.filter(item => item.subjectId === row.id) });
      }
      const result = { project: { id: project.id, title: project.title, status: project.status }, version: workspace?.version ?? 0, today, tomorrow, responsible: people.find(person => person.accountId === workspace?.responsibleAccountId) ?? null, people, capabilities: { manage: active && manage, work: active && work, confirm: active && workspace?.responsibleAccountId === actor.accountId, handover: active && manage }, packages: rows.filter(row => row.kind === "PACKAGE"), manpower: rows.filter(row => row.kind === "MANPOWER"), reports: rows.filter(row => row.kind === "REPORT"), snags, handovers: rows.filter(row => row.kind === "HANDOVER"), history, materials: await this.turnkey.siteMaterials(tx, actor, project.id), workforce: active ? await this.workforce.siteAttendance(tx, actor, project.id, today) : { attendance: [], count: 0 } };
      const visible = await this.visible(tx, actor, result); await this.access(tx, actor, project); return visible;
    });
  }
  async responsible(actor: Actor, projectId: string, input: SiteCommand & { accountId: string }) {
    return this.write(actor, projectId, input, async (tx, project) => { await this.manager(tx, actor, project); await this.eligible(tx, actor, project, input.accountId, false, true); return { id: project.id, responsibleAccountId: input.accountId }; });
  }
  async createPackage(actor: Actor, projectId: string, input: SiteCommand & SitePackageInput) {
    return this.write(actor, projectId, input, async (tx, project, workspace) => {
      await this.manager(tx, actor, project); date(input.date); quantities(input.plannedPercent, input.plannedQuantity);
      if (input.releaseId) await this.turnkey.siteRelease(tx, actor, project.id, input.releaseId);
      const { row } = await this.save(tx, actor, workspace, "PACKAGE", "OPEN", { title: input.title, date: input.date, tomorrowPlan: input.tomorrowPlan, plannedPercent: input.plannedPercent, plannedQuantity: input.plannedQuantity, unit: input.unit, critical: input.critical, ...(input.releaseId ? { releaseId: input.releaseId } : {}), actualPercent: "0", actualQuantity: "0", qualityStatus: "PENDING", materialStatus: "", blockers: "", photoEvidence: [] }, input.reason);
      return { id: row.id };
    });
  }
  async progress(actor: Actor, id: string, input: SiteCommand & SiteProgressInput) {
    return this.recordWrite(actor, id, "PACKAGE", input, async (tx, project, workspace, row) => {
      await this.access(tx, actor, project, "site.work", true); quantities(input.actualPercent, input.actualQuantity);
      const data = { ...object(row.data), actualPercent: input.actualPercent, actualQuantity: input.actualQuantity, qualityStatus: input.qualityStatus, materialStatus: input.materialStatus, blockers: input.blockers, tomorrowPlan: input.tomorrowPlan, photoEvidence: await this.photos(tx, actor, project.id, input.photoIds) };
      return { id: (await this.save(tx, actor, workspace, row.kind, row.state, data, input.reason, row)).row.id };
    });
  }
  async completePackage(actor: Actor, id: string, input: SiteCommand) {
    return this.recordWrite(actor, id, "PACKAGE", input, async (tx, project, workspace, row) => {
      await this.manager(tx, actor, project); if (row.state !== "OPEN") throw new ConflictException("Package is already complete");
      return { id: (await this.save(tx, actor, workspace, row.kind, "COMPLETED", { ...object(row.data), completedBy: actor.accountId, completedAt: new Date().toISOString() }, input.reason, row)).row.id };
    });
  }
  async manpower(actor: Actor, projectId: string, input: SiteCommand & { date: string; trade: string; count: number; employeeAccountIds: string[]; note: string }) {
    return this.write(actor, projectId, input, async (tx, project, workspace) => {
      await this.access(tx, actor, project, "site.work", true); date(input.date); if (!Number.isInteger(input.count) || input.count < 0 || input.count > 10000 || new Set(input.employeeAccountIds).size !== input.employeeAccountIds.length) throw new BadRequestException("Valid factual manpower count and distinct people required");
      for (const accountId of input.employeeAccountIds) await this.eligible(tx, actor, project, accountId, false, true);
      return { id: (await this.save(tx, actor, workspace, "MANPOWER", "RECORDED", { date: input.date, trade: input.trade, count: input.count, employeeAccountIds: input.employeeAccountIds, note: input.note }, input.reason)).row.id };
    });
  }
  async report(actor: Actor, projectId: string, input: SiteCommand & SiteReportInput) {
    return this.write(actor, projectId, input, async (tx, project, workspace) => {
      await this.access(tx, actor, project, "site.work", true); date(input.date);
      if (input.manpower.some(item => !Number.isInteger(item.count) || item.count < 0 || item.count > 10000)) throw new BadRequestException("Valid manpower counts required");
      if (input.supersedesReportId && !await tx.siteRecord.findFirst({ where: { id: input.supersedesReportId, workspaceId: workspace.id, kind: "REPORT", state: "CONFIRMED" } })) throw new ConflictException("Correction must name an existing confirmed report in this project");
      const data = { date: input.date, workCompleted: input.workCompleted, manpower: input.manpower, materialsReceived: input.materialsReceived, photoEvidence: await this.photos(tx, actor, project.id, input.photoIds), issues: input.issues, delayCauses: input.delayCauses, tomorrowPlan: input.tomorrowPlan, ...(input.supersedesReportId ? { supersedesReportId: input.supersedesReportId } : {}) };
      return { id: (await this.save(tx, actor, workspace, "REPORT", "DRAFT", data, input.reason)).row.id };
    });
  }
  async confirmReport(actor: Actor, id: string, input: SiteCommand) {
    return this.recordWrite(actor, id, "REPORT", input, async (tx, project, workspace, row) => {
      if (workspace.responsibleAccountId !== actor.accountId) throw new ForbiddenException("Only the named site responsible person may confirm reports");
      await this.eligible(tx, actor, project, actor.accountId, false, true); if (row.state !== "DRAFT") throw new ConflictException("Confirmed report is immutable; create a corrective report");
      const packages = await tx.siteRecord.findMany({ where: { workspaceId: workspace.id, kind: "PACKAGE" }, orderBy: { id: "asc" }, select: { id: true, version: true, data: true, state: true } });
      return { id: (await this.save(tx, actor, workspace, row.kind, "CONFIRMED", { ...object(row.data), confirmedBy: actor.accountId, confirmedAt: new Date().toISOString(), progressSnapshot: packages }, input.reason, row)).row.id };
    });
  }
  async snag(actor: Actor, projectId: string, input: SiteCommand & { title: string; description: string; packageId?: string; photoIds: string[] }) {
    return this.write(actor, projectId, input, async (tx, project, workspace) => {
      await this.access(tx, actor, project, "site.work", true);
      if (input.packageId && !await tx.siteRecord.findFirst({ where: { id: input.packageId, workspaceId: workspace.id, kind: "PACKAGE" } })) throw new ForbiddenException("Package must belong to this project");
      return { id: (await this.save(tx, actor, workspace, "SNAG", "OPEN", { title: input.title, description: input.description, ...(input.packageId ? { packageId: input.packageId } : {}), repairGeneration: 0, photoEvidence: await this.photos(tx, actor, project.id, input.photoIds) }, input.reason)).row.id };
    });
  }
  async assignFixer(actor: Actor, id: string, input: SiteCommand & { fixerAccountId: string }) {
    return this.recordWrite(actor, id, "SNAG", input, async (tx, project, workspace, row) => {
      await this.manager(tx, actor, project); if (!["OPEN", "ASSIGNED", "IN_PROGRESS"].includes(row.state)) throw new ConflictException("Current repair cannot be reassigned");
      await this.eligible(tx, actor, project, input.fixerAccountId, true, true);
      const data = object(row.data); if (data.verifierAccountId === input.fixerAccountId) throw new ForbiddenException("Fixer must differ from verifier");
      return { id: (await this.save(tx, actor, workspace, row.kind, "ASSIGNED", { ...data, fixerAccountId: input.fixerAccountId }, input.reason, row)).row.id };
    });
  }
  async startRepair(actor: Actor, id: string, input: SiteCommand) {
    return this.recordWrite(actor, id, "SNAG", input, async (tx, project, workspace, row) => {
      await this.access(tx, actor, project, "site.work", true); if (string(object(row.data), "fixerAccountId") !== actor.accountId) throw new ForbiddenException("Only the named fixer may perform this repair");
      if (row.state !== "ASSIGNED") throw new ConflictException("Assigned repair required");
      return { id: (await this.save(tx, actor, workspace, row.kind, "IN_PROGRESS", object(row.data), input.reason, row)).row.id };
    });
  }
  async readyRepair(actor: Actor, id: string, input: SiteCommand & { note: string; photoIds: string[] }) {
    return this.recordWrite(actor, id, "SNAG", input, async (tx, project, workspace, row) => {
      await this.access(tx, actor, project, "site.work", true); const data = object(row.data);
      if (data.fixerAccountId !== actor.accountId) throw new ForbiddenException("Only the named fixer may submit repair evidence");
      if (row.state !== "IN_PROGRESS") throw new ConflictException("Repair must be In Progress");
      return { id: (await this.save(tx, actor, workspace, row.kind, "READY_FOR_VERIFICATION", { ...data, repairGeneration: Number(data.repairGeneration) + 1, repairNote: input.note, repairedBy: actor.accountId, repairedAt: new Date().toISOString(), photoEvidence: await this.photos(tx, actor, project.id, input.photoIds) }, input.reason, row)).row.id };
    });
  }
  async appointVerifier(actor: Actor, id: string, input: SiteCommand & { verifierAccountId: string }) {
    return this.recordWrite(actor, id, "SNAG", input, async (tx, project, workspace, row) => {
      await this.manager(tx, actor, project); if (!commonStates.has(row.state)) throw new ConflictException("Current verification appointment is retained");
      await this.eligible(tx, actor, project, input.verifierAccountId, false, true); const data = object(row.data);
      if (data.fixerAccountId === input.verifierAccountId || data.repairedBy === input.verifierAccountId) throw new ForbiddenException("Verifier must be independent of the actual fixer");
      return { id: (await this.save(tx, actor, workspace, row.kind, row.state, { ...data, verifierAccountId: input.verifierAccountId }, input.reason, row)).row.id };
    });
  }
  async verify(actor: Actor, id: string, input: SiteCommand & { outcome: "PASSED" | "FAILED"; note: string; photoIds: string[] }) {
    return this.recordWrite(actor, id, "SNAG", input, async (tx, project, workspace, row) => {
      const data = object(row.data); if (row.state !== "READY_FOR_VERIFICATION") throw new ConflictException("Current repair must be Ready for Verification");
      if (data.verifierAccountId !== actor.accountId || data.repairedBy === actor.accountId || data.fixerAccountId === actor.accountId) throw new ForbiddenException("Only the named independent verifier may inspect this repair");
      await this.eligible(tx, actor, project, actor.accountId, false, true);
      const photoEvidence = await this.photos(tx, actor, project.id, input.photoIds);
      const attempt = await tx.siteVerificationAttempt.create({ data: { workspaceId: workspace.id, organizationId: actor.organizationId, projectId: project.id, snagId: row.id, repairGeneration: Number(data.repairGeneration), fixerAccountId: string(data, "repairedBy"), verifierAccountId: actor.accountId, outcome: input.outcome, note: input.note, photoEvidence: json(photoEvidence) } });
      const saved = await this.save(tx, actor, workspace, row.kind, input.outcome === "PASSED" ? "VERIFIED" : "IN_PROGRESS", { ...data, latestVerificationId: attempt.id }, input.reason, row);
      await tx.siteVerificationAttempt.update({ where: { id: attempt.id }, data: { eventId: saved.eventId } });
      return { id: row.id };
    });
  }
  async closeSnag(actor: Actor, id: string, input: SiteCommand) {
    return this.recordWrite(actor, id, "SNAG", input, async (tx, project, workspace, row) => {
      await this.manager(tx, actor, project); const data = object(row.data);
      const attempt = typeof data.latestVerificationId === "string" ? await tx.siteVerificationAttempt.findFirst({ where: { id: data.latestVerificationId, snagId: row.id, projectId: project.id, outcome: "PASSED", repairGeneration: Number(data.repairGeneration), verifierAccountId: string(data, "verifierAccountId"), fixerAccountId: string(data, "repairedBy") } }) : null;
      if (row.state !== "VERIFIED" || !attempt) throw new ConflictException("Closure requires the current passed verification");
      return { id: (await this.save(tx, actor, workspace, row.kind, "CLOSED", { ...data, closedBy: actor.accountId, closedAt: new Date().toISOString(), closureVerificationId: attempt.id }, input.reason, row)).row.id };
    });
  }
  async handover(actor: Actor, projectId: string, input: SiteCommand & { note: string }) {
    return this.write(actor, projectId, input, async (tx, project, workspace) => {
      await this.manager(tx, actor, project);
      const packages = await tx.siteRecord.findMany({ where: { workspaceId: workspace.id, kind: "PACKAGE" }, orderBy: { id: "asc" } });
      const snags = await tx.siteRecord.findMany({ where: { workspaceId: workspace.id, kind: "SNAG" }, orderBy: { id: "asc" } });
      if (!packages.length || packages.some(row => row.state !== "COMPLETED" || object(row.data).qualityStatus !== "PASSED") || snags.some(row => row.state !== "CLOSED")) throw new ConflictException("Handover requires completed packages, passed quality and Closed snags");
      const data = { note: input.note, decidedBy: actor.accountId, decidedAt: new Date().toISOString(), packages: packages.map(row => ({ id: row.id, version: row.version, qualityStatus: object(row.data).qualityStatus })), snags: snags.map(row => ({ id: row.id, version: row.version, verificationId: object(row.data).closureVerificationId })), reportIds: (await tx.siteRecord.findMany({ where: { workspaceId: workspace.id, kind: "REPORT", state: "CONFIRMED" }, select: { id: true }, orderBy: { id: "asc" } })).map(row => row.id) };
      return { id: (await this.save(tx, actor, workspace, "HANDOVER", "CONFIRMED", data, input.reason)).row.id };
    });
  }
}

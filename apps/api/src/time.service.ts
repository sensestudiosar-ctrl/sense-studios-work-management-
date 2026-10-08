import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { Prisma, AccountKind } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { TaskService } from "./task.service.js";
import { DocumentService } from "./document.service.js";
import type { ProjectActor } from "./project.service.js";
import { recordProjectEvent } from "./project-events.js";
import { HttpTimeAccountingAdapter, type TimeAccountingPayload } from "./time-accounting-adapter.js";

type Tx = Prisma.TransactionClient;
export type TimeData = { projectId?: string | null | undefined; taskId?: string | null | undefined; stageId?: string | null | undefined; activityLabel?: string | null | undefined; date?: string | undefined; startedAt?: string | null | undefined; endedAt?: string | null | undefined; durationSeconds?: number | undefined; workNote: string; location: "OFFICE" | "SITE" | "REMOTE"; billable: boolean; evidenceFileId?: string | null | undefined };
type Entry = Awaited<ReturnType<Tx["timeEntry"]["findFirstOrThrow"]>>;
const json = (value: unknown) => value as Prisma.InputJsonValue;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

@Injectable()
export class TimeService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService, private readonly tasks: TaskService, private readonly documents: DocumentService) {}
  private get db() { return this.database.prisma; }
  private async transaction<T>(fn: (tx: Tx) => Promise<T>) {
    try { return await this.db.$transaction(fn, { timeout: 30_000 }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && (["P2002", "P2034"].includes(error.code) || error.code === "P2010" && error.meta?.code === "40P01")) throw new ConflictException("Time changed concurrently. Refresh and retry"); throw error; }
  }
  private async active(tx: Tx, actor: ProjectActor) {
    await tx.$queryRaw`SELECT id FROM accounts WHERE id=${actor.accountId}::uuid FOR SHARE`;
    const account = await tx.account.findUnique({ where: { id: actor.accountId }, include: { employee: true } });
    if (!account || account.state !== "ACTIVE" || account.kind !== actor.kind || account.kind !== AccountKind.OWNER && account.kind !== AccountKind.STAFF || account.employee && (account.employee.state !== "ACTIVE" || account.employee.organizationId !== actor.organizationId)) throw new ForbiddenException("Permission denied");
    const sessionId = (actor as ProjectActor & { sessionId?: string }).sessionId;
    if (sessionId) { const session = await tx.session.findUnique({ where: { id: sessionId } }); if (!session || session.accountId !== actor.accountId || session.revokedAt || session.expiresAt <= new Date() || session.lastUsedAt.getTime() + 30 * 60_000 <= Date.now()) throw new ForbiddenException("Current session required"); }
    return account.employee;
  }
  private async manager(tx: Tx, actor: ProjectActor, employeeId: string, projectId: string | null): Promise<boolean> {
    if (actor.kind === AccountKind.OWNER) return true;
    const self = await this.active(tx, actor);
    const target = await tx.employee.findFirst({ where: { id: employeeId, organizationId: actor.organizationId } });
    if (!self || !target) return false;
    try {
      if (projectId) {
        const project = await tx.project.findFirst({ where: { id: projectId, organizationId: actor.organizationId } });
        const assignment = await tx.projectAssignment.findFirst({ where: { projectId, employeeId: self.id, revokedAt: null } });
        if (!project || !assignment || self.homeBranchId !== project.branchId && !assignment.crossBranchAuthorized) return false;
        await this.authorization.assertPermission(actor.accountId, "time.manage", { kind: "BRANCH", organizationId: actor.organizationId, branchId: project.branchId }, tx);
        await this.authorization.assertPermission(actor.accountId, "project.view", { kind: "BRANCH", organizationId: actor.organizationId, branchId: project.branchId }, tx);
        if (project.currentLeadEmployeeId === self.id) return true;
        await this.authorization.assertPermission(actor.accountId, "project.manage", { kind: "BRANCH", organizationId: actor.organizationId, branchId: project.branchId }, tx);
        return true;
      }
      if (self.homeBranchId !== target.homeBranchId || self.homeTeamId !== target.homeTeamId || self.id === target.id) return false;
      await this.authorization.assertPermission(actor.accountId, "time.manage", { kind: "TEAM", organizationId: actor.organizationId, branchId: target.homeBranchId, teamId: target.homeTeamId }, tx);
      const rows = await tx.employee.findMany({ where: { organizationId: actor.organizationId, homeBranchId: target.homeBranchId, homeTeamId: target.homeTeamId }, select: { id: true, reportsToId: true } });
      const parents = new Map(rows.map(row => [row.id, row.reportsToId])); const visited = new Set<string>(); let current = target.reportsToId;
      while (current && !visited.has(current)) { if (current === self.id) return true; visited.add(current); current = parents.get(current) ?? null; }
      return false;
    } catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
  }
  private async work(tx: Tx, actor: ProjectActor, employeeId: string, input: TimeData, newWork = true) {
    if (!input.workNote.trim() || input.workNote.length > 1000 || !["OFFICE", "SITE", "REMOTE"].includes(input.location) || typeof input.billable !== "boolean") throw new BadRequestException("Invalid time details");
    if (input.date !== undefined) {
      const date = new Date(`${input.date}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.date || !Number.isInteger(input.durationSeconds) || Number(input.durationSeconds) < 1 || Number(input.durationSeconds) > 31_536_000) throw new BadRequestException("Invalid time date or duration");
      if (!!input.startedAt !== !!input.endedAt || input.startedAt && input.endedAt && (!Number.isFinite(Date.parse(input.startedAt)) || !Number.isFinite(Date.parse(input.endedAt)) || Date.parse(input.endedAt) <= Date.parse(input.startedAt) || Number(input.durationSeconds) > Math.ceil((Date.parse(input.endedAt) - Date.parse(input.startedAt)) / 1000))) throw new BadRequestException("Start/end/duration differ");
    }
    const employee = await tx.employee.findFirst({ where: { id: employeeId, organizationId: actor.organizationId } });
    if (!employee || newWork && employee.state !== "ACTIVE") throw new ConflictException("Eligible employee required");
    let projectId = input.projectId ?? null; const taskId = input.taskId ?? null;
    if (taskId) {
      const task = await this.tasks.assertTaskReadInTransaction(tx, actor, taskId);
      if (projectId && task.projectId !== projectId) throw new BadRequestException("Task and project differ");
      projectId = task.projectId;
      if (newWork && (task.status === "COMPLETED" || task.status === "WAITING" || task.status === "STOPPED_DUE_TO_PROJECT_CANCELLATION" || task.requiresReassignment)) throw new ConflictException("Task does not permit new time");
      const eligible = task.primaryOwnerEmployeeId === employeeId || !!await tx.taskCollaborator.findFirst({ where: { taskId, employeeId } });
      if (newWork && !eligible) throw new ForbiddenException("Time employee is not assigned to task");
    }
    if (projectId) {
      await tx.$queryRaw`SELECT id FROM projects WHERE id=${projectId}::uuid FOR SHARE`;
      const project = await tx.project.findFirst({ where: { id: projectId, organizationId: actor.organizationId } });
      if (!project) throw new NotFoundException("Project unavailable");
      const task = taskId ? await tx.task.findUnique({ where: { id: taskId } }) : null;
      if (newWork && project.status !== "ACTIVE" && !(project.status === "CANCELLED" && task?.type === "CLOSEOUT" && !!await tx.taskCloseoutApproval.findFirst({ where: { taskId: task.id, revokedAt: null } }))) throw new ConflictException("Project does not permit new time");
      const assignment = await tx.projectAssignment.findFirst({ where: { projectId, employeeId, revokedAt: null } });
      if (newWork || actor.kind !== AccountKind.OWNER) {
        if (!assignment || employee.homeBranchId !== project.branchId && !assignment.crossBranchAuthorized) throw new ForbiddenException("Employee project assignment required");
        await this.authorization.assertPermission(employee.accountId, "project.view", { kind: "BRANCH", organizationId: actor.organizationId, branchId: project.branchId }, tx);
      }
      if (actor.kind !== AccountKind.OWNER) {
        const self = await tx.employee.findUnique({ where: { accountId: actor.accountId } });
        const ownAssignment = self && await tx.projectAssignment.findFirst({ where: { projectId, employeeId: self.id, revokedAt: null } });
        if (!self || !ownAssignment || self.homeBranchId !== project.branchId && !ownAssignment.crossBranchAuthorized) throw new ForbiddenException("Project access required");
        await this.authorization.assertPermission(actor.accountId, "project.view", { kind: "BRANCH", organizationId: actor.organizationId, branchId: project.branchId }, tx);
      }
    } else if (!taskId && !input.activityLabel?.trim()) throw new BadRequestException("Non-project activity is required");
    if (input.stageId) {
      const stage = await tx.projectPlanItem.findFirst({ where: { id: input.stageId, organizationId: actor.organizationId, projectId: projectId ?? "00000000-0000-0000-0000-000000000000", kind: "STAGE" } });
      if (!stage) throw new BadRequestException("Stage and project differ");
      if (taskId) { const task = await tx.task.findUnique({ where: { id: taskId }, include: { planItem: true } }); if (task?.planItem && task.planItem.key !== stage.key && task.planItem.stageKey !== stage.key) throw new BadRequestException("Stage and task differ"); }
    }
    if (input.evidenceFileId && newWork) await this.documents.assertTimeEvidence(tx, actor, input.evidenceFileId, projectId);
    return { projectId, taskId, stageId: input.stageId ?? null, activityLabel: input.activityLabel ?? null, evidenceFileId: input.evidenceFileId ?? null, workNote: input.workNote, location: input.location, billable: input.billable, ...(input.date !== undefined ? { date: input.date, durationSeconds: input.durationSeconds, startedAt: input.startedAt ?? null, endedAt: input.endedAt ?? null } : {}) };
  }
  private async command<T extends object>(actor: ProjectActor, commandId: string, payload: unknown, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.transaction(async tx => {
      await this.active(tx, actor);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.accountId + commandId},0))`;
      const receipt = await tx.timeCommandReceipt.findUnique({ where: { actorId_commandId: { actorId: actor.accountId, commandId } } });
      if (receipt) {
        if (receipt.payloadHash !== hash(payload)) throw new ConflictException("Command key reused with different values");
        const command = payload as { op: string; id?: string; input: TimeData & { employeeId?: string } };
        const self = await this.active(tx, actor);
        if (command.op === "export" && actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner export required");
        if (command.op === "correct" || command.op === "approve") {
          const row = await this.entry(tx, actor, command.id!); const managed = await this.manager(tx, actor, row.employeeId, row.projectId);
          if (!managed && (command.op === "approve" || row.employeeId !== self?.id || row.locked)) throw new ForbiddenException("Current management authority required");
          const version = await tx.timeEntryVersion.findUniqueOrThrow({ where: { entryId_version: { entryId: row.id, version: row.version } } });
          if (row.projectId) await this.work(tx, actor, row.employeeId, version.data as TimeData, false);
        } else if (command.op === "start" || command.op === "manual") {
          const employeeId = command.input.employeeId ?? self?.id;
          if (!employeeId || employeeId !== self?.id && !await this.manager(tx, actor, employeeId, command.input.projectId ?? null)) throw new ForbiddenException("Current time authority required");
          await this.work(tx, actor, employeeId, command.input, false);
        } else if (command.op !== "export") {
          const timer = await tx.timeTimer.findFirst({ where: { id: command.id!, organizationId: actor.organizationId } });
          if (!timer || timer.employeeId !== self?.id && !await this.manager(tx, actor, timer.employeeId, timer.projectId)) throw new ForbiddenException("Current timer authority required");
          if (command.op === "resume") await this.work(tx, actor, timer.employeeId, timer.data as TimeData, false);
        }
        return receipt.result as T;
      }
      const result = await fn(tx);
      // A lock wait may outlive the authenticated session. Roll back the entire
      // command rather than committing under authority that expired while waiting.
      await this.active(tx, actor);
      await tx.timeCommandReceipt.create({ data: { organizationId: actor.organizationId, actorId: actor.accountId, commandId, payloadHash: hash(payload), result: json(result) } });
      return result;
    });
  }
  async setup(actor: ProjectActor) {
    return this.transaction(async tx => {
      const self = await this.active(tx, actor);
      const employees = []; for (const e of await tx.employee.findMany({ where: { organizationId: actor.organizationId, state: "ACTIVE" }, include: { account: true } })) if (e.id === self?.id || await this.manager(tx, actor, e.id, null)) employees.push({ id: e.id, name: e.account.normalizedEmail });
      const projects = []; for (const p of await tx.project.findMany({ where: { organizationId: actor.organizationId, status: "ACTIVE" } })) {
        if (actor.kind === AccountKind.OWNER) projects.push({ id: p.id, name: p.title });
        else if (self && await tx.projectAssignment.findFirst({ where: { projectId: p.id, employeeId: self.id, revokedAt: null, ...(self.homeBranchId !== p.branchId ? { crossBranchAuthorized: true } : {}) } })) {
          try { await this.authorization.assertPermission(actor.accountId, "project.view", { kind: "BRANCH", organizationId: actor.organizationId, branchId: p.branchId }, tx); projects.push({ id: p.id, name: p.title }); } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
        }
      }
      const tasks = []; for (const t of await tx.task.findMany({ where: { organizationId: actor.organizationId, status: { notIn: ["COMPLETED", "STOPPED_DUE_TO_PROJECT_CANCELLATION"] }, requiresReassignment: false } })) { try { await this.tasks.assertTaskReadInTransaction(tx, actor, t.id); if (actor.kind === AccountKind.OWNER || t.primaryOwnerEmployeeId === self?.id || self && await tx.taskCollaborator.findFirst({ where: { taskId: t.id, employeeId: self.id } })) tasks.push({ id: t.id, title: t.title, projectId: t.projectId, stageId: null }); } catch (error) { if (!(error instanceof ForbiddenException)) throw error; } }
      const stages = await tx.projectPlanItem.findMany({ where: { projectId: { in: projects.map(p => p.id) }, kind: "STAGE" }, select: { id: true, label: true, projectId: true } });
      return { employeeId: self?.id ?? null, employees, projects, tasks, stages, isOwner: actor.kind === AccountKind.OWNER };
    });
  }
  private async entry(tx: Tx, actor: ProjectActor, id: string, lock = false) {
    if (lock) await tx.$queryRaw`SELECT id FROM time_entries WHERE id=${id}::uuid FOR UPDATE`;
    const row = await tx.timeEntry.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!row) throw new NotFoundException("Time entry unavailable"); return row;
  }
  private async entryView(tx: Tx, actor: ProjectActor, row: Entry) {
    const self = await this.active(tx, actor); const management = await this.manager(tx, actor, row.employeeId, row.projectId);
    if (row.employeeId !== self?.id && !management) throw new ForbiddenException("Permission denied");
    const versions = await tx.timeEntryVersion.findMany({ where: { entryId: row.id }, orderBy: { version: "asc" } });
    const current = versions.find(v => v.version === row.version); if (!current) throw new ConflictException("Entry evidence unavailable");
    if (row.projectId && actor.kind !== AccountKind.OWNER) await this.work(tx, actor, row.employeeId, current.data as TimeData, false);
    for (const version of versions) {
      const data = version.data as TimeData;
      if (data.evidenceFileId) { try { await this.documents.assertTimeEvidence(tx, actor, data.evidenceFileId, data.projectId ?? null); } catch (error) { if (!(error instanceof ForbiddenException) && !(error instanceof NotFoundException)) throw error; version.data = { ...data, evidenceFileId: null } as Prisma.JsonValue; } }
    }
    return { ...row, ...(current.data as object), approved: row.approvedVersion === row.version, canCorrect: management || row.employeeId === self?.id && !row.locked, canApprove: management, versions, deliveries: await tx.timeAccountingDelivery.findMany({ where: { entryId: row.id }, select: { id: true, state: true, revision: true, attempts: true, lastError: true } }) };
  }
  async list(actor: ProjectActor, scope: string, reportAll = false) {
    return this.transaction(async tx => {
      const self = await this.active(tx, actor); const entries = [];
      for (const row of await tx.timeEntry.findMany({ where: { organizationId: actor.organizationId, ...(scope === "mine" ? { employeeId: self?.id ?? "00000000-0000-0000-0000-000000000000" } : {}) }, orderBy: { createdAt: "desc" }, ...(reportAll ? {} : { take: 200 }) })) { try { entries.push(await this.entryView(tx, actor, row)); } catch (error) { if (!(error instanceof ForbiddenException)) throw error; } }
      const timer = self && await tx.timeTimer.findFirst({ where: { employeeId: self.id, state: { in: ["RUNNING", "PAUSED"] } } });
      if (timer) {
        const data = timer.data as TimeData;
        if (data.evidenceFileId) { try { await this.documents.assertTimeEvidence(tx, actor, data.evidenceFileId, data.projectId ?? null); } catch (error) { if (!(error instanceof ForbiddenException) && !(error instanceof NotFoundException)) throw error; timer.data = { ...data, evidenceFileId: null } as Prisma.JsonValue; } }
      }
      return { entries, timer: timer ? { id: timer.id, state: timer.state, version: timer.version, ...(timer.data as object), elapsedSeconds: Math.floor((Number(timer.elapsedMs) + (timer.runningSince ? Math.max(0, Date.now() - timer.runningSince.getTime()) : 0)) / 1000) } : null };
    });
  }
  async start(actor: ProjectActor, input: TimeData & { commandId: string }) {
    return this.command(actor, input.commandId, { op: "start", input }, async tx => {
      const self = await this.active(tx, actor); if (!self) throw new ForbiddenException("Employee timer required");
      await tx.$queryRaw`SELECT id FROM employees WHERE id=${self.id}::uuid FOR UPDATE`;
      if (await tx.timeTimer.findFirst({ where: { employeeId: self.id, state: { in: ["RUNNING", "PAUSED"] } } })) throw new ConflictException("An existing timer must be stopped");
      const data = await this.work(tx, actor, self.id, input); const now = new Date();
      const row = await tx.timeTimer.create({ data: { organizationId: actor.organizationId, employeeId: self.id, projectId: data.projectId, taskId: data.taskId, state: "RUNNING", data: json(data), runningSince: now, startedAt: now } });
      const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "time.started", subjectType: "time_timer", subjectId: row.id, reason: "Timer started", after: { version: 1, employeeId: self.id, state: "RUNNING", elapsedMs: 0 } });
      await tx.timeTransition.create({ data: { organizationId: actor.organizationId, timerId: row.id, version: 1, toState: "RUNNING", elapsedMs: 0n, actorId: actor.accountId, reason: "Timer started", occurredAt: now, eventId } });
      return { id: row.id, version: row.version, state: row.state };
    });
  }
  async timerCommand(actor: ProjectActor, id: string, action: "pause" | "resume" | "stop", input: { commandId: string; expectedVersion: number; reason: string }) {
    return this.command(actor, input.commandId, { op: action, id, input }, async tx => {
      const preliminary = await tx.timeTimer.findFirst({ where: { id, organizationId: actor.organizationId } });
      if (preliminary?.projectId) await tx.$queryRaw`SELECT id FROM projects WHERE id=${preliminary.projectId}::uuid FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM time_timers WHERE id=${id}::uuid FOR UPDATE`;
      const timer = await tx.timeTimer.findFirst({ where: { id, organizationId: actor.organizationId } }); const self = await this.active(tx, actor);
      if (!timer) throw new NotFoundException("Timer unavailable");
      if (self?.id !== timer.employeeId && !await this.manager(tx, actor, timer.employeeId, timer.projectId)) throw new ForbiddenException("Timer access denied");
      if (timer.version !== input.expectedVersion || timer.state === "STOPPED" || action === "pause" && timer.state !== "RUNNING" || action === "resume" && timer.state !== "PAUSED") throw new ConflictException("Timer state changed");
      if (action === "resume") await this.work(tx, actor, timer.employeeId, timer.data as TimeData);
      const now = new Date(); const elapsedMs = timer.elapsedMs + BigInt(timer.runningSince ? Math.max(0, now.getTime() - timer.runningSince.getTime()) : 0);
      const state = action === "stop" ? "STOPPED" : action === "pause" ? "PAUSED" : "RUNNING";
      const row = await tx.timeTimer.update({ where: { id }, data: { state, version: { increment: 1 }, elapsedMs, runningSince: state === "RUNNING" ? now : null, stoppedAt: state === "STOPPED" ? now : null } });
      const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "time.timer_changed", subjectType: "time_timer", subjectId: id, reason: input.reason, before: { state: timer.state, version: timer.version }, after: { state, version: row.version, elapsedMs: Number(elapsedMs) } });
      await tx.timeTransition.create({ data: { organizationId: actor.organizationId, timerId: id, version: row.version, fromState: timer.state, toState: state, elapsedMs, actorId: actor.accountId, reason: input.reason, occurredAt: now, eventId } });
      if (action !== "stop") return { id, version: row.version, state };
      const organization = await tx.organization.findUniqueOrThrow({ where: { id: actor.organizationId } });
      const date = new Intl.DateTimeFormat("en-CA", { timeZone: organization.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(timer.startedAt);
      const data = { ...(timer.data as TimeData), date, startedAt: timer.startedAt.toISOString(), endedAt: now.toISOString(), durationSeconds: Math.max(1, Math.floor(Number(elapsedMs) / 1000)) };
      const entry = await this.createEntry(tx, actor, timer.employeeId, data, input.reason, id);
      return { id, version: row.version, state, entryId: entry.id };
    });
  }
  private async createEntry(tx: Tx, actor: ProjectActor, employeeId: string, data: TimeData, reason: string, timerId: string | null = null) {
    const row = await tx.timeEntry.create({ data: { organizationId: actor.organizationId, employeeId, projectId: data.projectId ?? null, taskId: data.taskId ?? null, timerId } });
    const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "time.logged", subjectType: "time_entry", subjectId: row.id, reason, after: { employeeId, version: 1, data } });
    await tx.timeEntryVersion.create({ data: { organizationId: actor.organizationId, entryId: row.id, version: 1, data: json(data), reason, editorId: actor.accountId, eventId } });
    return { id: row.id, version: 1 };
  }
  async manual(actor: ProjectActor, input: TimeData & { commandId: string; employeeId?: string | undefined }) {
    return this.command(actor, input.commandId, { op: "manual", input }, async tx => {
      const self = await this.active(tx, actor); const employeeId = input.employeeId ?? self?.id;
      if (!employeeId || employeeId !== self?.id && !await this.manager(tx, actor, employeeId, input.projectId ?? null)) throw new ForbiddenException("Employee access denied");
      const data = await this.work(tx, actor, employeeId, input);
      return this.createEntry(tx, actor, employeeId, data, "Manual time recorded");
    });
  }
  async correct(actor: ProjectActor, id: string, input: TimeData & { commandId: string; expectedVersion: number; reason: string }) {
    return this.command(actor, input.commandId, { op: "correct", id, input }, async tx => {
      const row = await this.entry(tx, actor, id, true); const self = await this.active(tx, actor); const managed = await this.manager(tx, actor, row.employeeId, row.projectId);
      if (row.version !== input.expectedVersion) throw new ConflictException("Entry changed");
      if (!managed && (self?.id !== row.employeeId || row.locked)) throw new ForbiddenException("Locked correction requires management");
      const data = await this.work(tx, actor, row.employeeId, input, false);
      if (data.taskId && data.taskId !== row.taskId) {
        const task = await tx.task.findUniqueOrThrow({ where: { id: data.taskId } });
        if (task.primaryOwnerEmployeeId !== row.employeeId && !await tx.taskCollaborator.findFirst({ where: { taskId: data.taskId, employeeId: row.employeeId } })) throw new ForbiddenException("Time employee is not assigned to replacement task");
      }
      if (!managed && data.projectId !== row.projectId || data.projectId !== row.projectId && !await this.manager(tx, actor, row.employeeId, data.projectId)) throw new ForbiddenException("Correction scope differs");
      const prior = await tx.timeEntryVersion.findUniqueOrThrow({ where: { entryId_version: { entryId: id, version: row.version } } });
      const priorData = prior.data as TimeData;
      if (data.evidenceFileId && (data.evidenceFileId !== priorData.evidenceFileId || data.projectId !== priorData.projectId)) await this.documents.assertTimeEvidence(tx, actor, data.evidenceFileId, data.projectId);
      const version = row.version + 1;
      await tx.timeEntry.update({ where: { id }, data: { version, projectId: data.projectId, taskId: data.taskId, approvedAt: null, approvedVersion: null } });
      const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "time.changed", subjectType: "time_entry", subjectId: id, reason: input.reason, before: { version: row.version, data: prior.data }, after: { version, data } });
      await tx.timeEntryVersion.create({ data: { organizationId: actor.organizationId, entryId: id, version, data: json(data), reason: input.reason, editorId: actor.accountId, eventId } });
      return { id, version };
    });
  }
  async approve(actor: ProjectActor, id: string, input: { commandId: string; expectedVersion: number; reason: string }) {
    return this.command(actor, input.commandId, { op: "approve", id, input }, async tx => {
      const row = await this.entry(tx, actor, id, true); if (!await this.manager(tx, actor, row.employeeId, row.projectId)) throw new ForbiddenException("Management approval required");
      if (row.version !== input.expectedVersion) throw new ConflictException("Entry changed");
      if (row.approvedVersion === row.version) return { id, version: row.version, approved: true };
      const now = new Date();
      await tx.timeEntry.update({ where: { id }, data: { locked: true, approvedVersion: row.version, approvedAt: now } });
      const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "time.approved", subjectType: "time_entry", subjectId: id, reason: input.reason, after: { version: row.version, approved: true } });
      await tx.timeApproval.create({ data: { organizationId: actor.organizationId, entryId: id, version: row.version, actorId: actor.accountId, reason: input.reason, occurredAt: now, eventId } });
      return { id, version: row.version, approved: true };
    });
  }
  async export(actor: ProjectActor, id: string, input: { commandId: string; expectedVersion: number; reason: string }) {
    const result = await this.command(actor, input.commandId, { op: "export", id, input }, async tx => {
      if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner export required");
      const entry = await this.entry(tx, actor, id, true); if (entry.version !== input.expectedVersion || entry.approvedVersion !== entry.version) throw new ConflictException("Current version must be approved");
      const existing = await tx.timeAccountingDelivery.findUnique({ where: { entryId_revision: { entryId: id, revision: entry.version } } }); if (existing) return { deliveryId: existing.id };
      const version = await tx.timeEntryVersion.findUniqueOrThrow({ where: { entryId_version: { entryId: id, version: entry.version } } }); const data = version.data as TimeData;
      const payload: TimeAccountingPayload = { schemaVersion: 1, recordId: id, revision: entry.version, organizationId: actor.organizationId, employeeId: entry.employeeId, projectId: data.projectId ?? null, taskId: data.taskId ?? null, stageId: data.stageId ?? null, date: data.date!, startedAt: data.startedAt ?? null, endedAt: data.endedAt ?? null, durationSeconds: data.durationSeconds!, workNote: data.workNote, location: data.location, billable: data.billable, activityLabel: data.activityLabel ?? null, approvedAt: entry.approvedAt?.toISOString() ?? null };
      const deliveryId = randomUUID(); const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "time.export_requested", subjectType: "time_delivery", subjectId: deliveryId, reason: input.reason, after: { entryId: id, revision: entry.version, payloadHash: hash(payload) } });
      await tx.timeAccountingDelivery.create({ data: { id: deliveryId, organizationId: actor.organizationId, entryId: id, revision: entry.version, payload: json(payload), payloadHash: hash(payload), requestedById: actor.accountId, reason: input.reason, eventId } });
      return { deliveryId };
    });
    return this.dispatch(actor, result.deliveryId);
  }
  async dispatch(actor: ProjectActor, deliveryId: string) {
    const claim = await this.transaction(async tx => {
      await this.active(tx, actor); if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner export required");
      const initial = await tx.timeAccountingDelivery.findFirst({ where: { id: deliveryId, organizationId: actor.organizationId } }); if (!initial) throw new NotFoundException("Delivery unavailable");
      await tx.$queryRaw`SELECT id FROM time_entries WHERE id=${initial.entryId}::uuid FOR UPDATE`;
      const row = await tx.timeAccountingDelivery.findUniqueOrThrow({ where: { id: deliveryId } });
      if (row.state === "DELIVERED" || row.leaseUntil && row.leaseUntil > new Date()) return null;
      const earlier = await tx.timeAccountingDelivery.findFirst({ where: { entryId: row.entryId, revision: { lt: row.revision }, state: { not: "DELIVERED" } } }); if (earlier) throw new ConflictException("Deliver earlier revision first");
      await this.active(tx, actor);
      const leaseToken = randomUUID(); return tx.timeAccountingDelivery.update({ where: { id: deliveryId }, data: { state: "SENDING", leaseToken, leaseUntil: new Date(Date.now() + 60_000), attempts: { increment: 1 }, lastError: null } });
    });
    if (claim) {
      let error: string | null = null;
      try { const receiverBaseUrl = process.env.TIME_ACCOUNTING_RECEIVER_URL; if (!receiverBaseUrl) throw new Error("Not configured"); const adapter = new HttpTimeAccountingAdapter({ receiverBaseUrl, ...(process.env.TIME_ACCOUNTING_RECEIVER_TOKEN ? { bearerToken: process.env.TIME_ACCOUNTING_RECEIVER_TOKEN } : {}) }); await adapter.exportRecord(claim.payload as unknown as TimeAccountingPayload, claim.id); } catch { error = "Receiver did not confirm delivery. Configure or retry the accounting receiver."; }
      await this.transaction(async tx => {
        const update = await tx.timeAccountingDelivery.updateMany({ where: { id: deliveryId, leaseToken: claim.leaseToken }, data: { state: error ? "FAILED" : "DELIVERED", lastError: error, deliveredAt: error ? null : new Date(), leaseUntil: null, leaseToken: null } });
        if (update.count) await tx.timeAccountingAttempt.create({ data: { deliveryId, leaseToken: claim.leaseToken!, outcome: error ? "FAILED" : "DELIVERED" } });
      });
    }
    const row = await this.db.timeAccountingDelivery.findUniqueOrThrow({ where: { id: deliveryId } }); return { deliveryId, state: row.state };
  }
}

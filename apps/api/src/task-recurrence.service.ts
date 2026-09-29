import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { AccountKind, Prisma, TaskRecurrenceFrequency } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { TaskService } from "./task.service.js";
import { recordProjectEvent } from "./project-events.js";
import { isScheduledDate, localCalendarDate, nextScheduledDate, parseCalendarDate } from "./task-recurrence-policy.js";
import type { ProjectActor } from "./project.service.js";

type Tx = Prisma.TransactionClient;
type Rule = NonNullable<Awaited<ReturnType<Tx["taskRecurrenceRule"]["findUnique"]>>>;
const snapshot = (rule: Rule) => ({ frequency: rule.frequency, anchorDate: rule.anchorDate.toISOString().slice(0, 10), effectiveFromDate: rule.effectiveFromDate.toISOString().slice(0, 10), paused: rule.paused, version: rule.version, configuredById: rule.configuredById });

@Injectable()
export class TaskRecurrenceService {
  constructor(private readonly database: DatabaseService, private readonly tasks: TaskService) {}
  private async transaction<T>(run: (tx: Tx) => Promise<T>): Promise<T> {
    try { return await this.database.prisma.$transaction(run, { timeout: 30_000 }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2002" || error.code === "P2010" && error.meta?.code === "40P01")) throw new ConflictException("Recurrence changed concurrently. Refresh and retry");
      throw error;
    }
  }
  private async timezone(tx: Tx, organizationId: string) {
    await tx.$queryRaw`SELECT "id" FROM "organizations" WHERE "id"=${organizationId}::uuid FOR SHARE`;
    return (await tx.organization.findUniqueOrThrow({ where: { id: organizationId } })).timezone;
  }
  private async result(tx: Tx, actor: ProjectActor, taskId: string) {
    await this.tasks.assertTaskReadInTransaction(tx, actor, taskId);
    let configure = false;
    try { await this.tasks.assertRecurrenceAuthority(tx, actor, taskId); configure = true; }
    catch (error) { if (!(error instanceof ForbiddenException || error instanceof ConflictException)) throw error; }
    const rule = await tx.taskRecurrenceRule.findUnique({ where: { sourceTaskId: taskId } });
    const history = rule ? await tx.taskRecurrenceChange.findMany({ where: { ruleId: rule.id }, orderBy: { ruleVersion: "asc" } }) : [];
    return { rule, history, capabilities: { configure, pause: configure && !!rule && !rule.paused, resume: configure && !!rule && rule.paused }, timezone: await this.timezone(tx, actor.organizationId) };
  }
  async detail(actor: ProjectActor, taskId: string) { return this.transaction((tx) => this.result(tx, actor, taskId)); }

  private async changeEvidence(tx: Tx, actor: ProjectActor, rule: Rule, previous: Rule | null, action: "configured" | "paused" | "resumed", reason: string) {
    const before = previous ? snapshot(previous) : null;
    const after = snapshot(rule);
    await tx.taskRecurrenceChange.create({ data: { organizationId: actor.organizationId, ruleId: rule.id, ruleVersion: rule.version, action, actorId: actor.accountId, reason, ...(before ? { before } : {}), after } });
    await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: `task.recurrence_${action}`, subjectType: "task_recurrence", subjectId: rule.id, reason, ...(before ? { before } : {}), after: { ...after, sourceTaskId: rule.sourceTaskId } });
  }
  async configure(actor: ProjectActor, taskId: string, input: { expectedTaskVersion: number; expectedVersion: number; frequency: TaskRecurrenceFrequency; firstOccurrenceDate: string; reason: string }, now = new Date()) {
    return this.transaction(async (tx) => {
      await this.tasks.assertRecurrenceAuthority(tx, actor, taskId, input.expectedTaskVersion);
      const timezone = await this.timezone(tx, actor.organizationId);
      const reason = input.reason.trim();
      if (reason.length < 3 || reason.length > 1000) throw new ConflictException("A recurrence reason is required");
      let anchorDate: Date;
      try { anchorDate = parseCalendarDate(input.firstOccurrenceDate); } catch { throw new ConflictException("Invalid first occurrence date"); }
      if (input.firstOccurrenceDate <= localCalendarDate(now, timezone)) throw new ConflictException("First occurrence must be a future organization-local date");
      if (!Object.values(TaskRecurrenceFrequency).includes(input.frequency)) throw new ConflictException("Invalid recurrence frequency");
      const previous = await tx.taskRecurrenceRule.findUnique({ where: { sourceTaskId: taskId } });
      if ((previous?.version ?? 0) !== input.expectedVersion) throw new ConflictException("Recurrence changed. Refresh and retry");
      const data = { frequency: input.frequency, anchorDate, effectiveFromDate: anchorDate, configuredById: actor.accountId };
      const rule = previous ? await tx.taskRecurrenceRule.update({ where: { id: previous.id, version: previous.version }, data: { ...data, version: { increment: 1 } } }) : await tx.taskRecurrenceRule.create({ data: { ...data, organizationId: actor.organizationId, sourceTaskId: taskId } });
      await this.changeEvidence(tx, actor, rule, previous, "configured", reason);
      return this.result(tx, actor, taskId);
    });
  }
  async setPaused(actor: ProjectActor, taskId: string, paused: boolean, input: { expectedTaskVersion: number; expectedVersion: number; reason: string }, now = new Date()) {
    return this.transaction(async (tx) => {
      await this.tasks.assertRecurrenceAuthority(tx, actor, taskId, input.expectedTaskVersion);
      const previous = await tx.taskRecurrenceRule.findUnique({ where: { sourceTaskId: taskId } });
      if (!previous || previous.version !== input.expectedVersion) throw new ConflictException("Recurrence changed. Refresh and retry");
      if (previous.paused === paused) throw new ConflictException("Recurrence pause state must change");
      const reason = input.reason.trim();
      if (reason.length < 3 || reason.length > 1000) throw new ConflictException("A recurrence reason is required");
      const timezone = await this.timezone(tx, actor.organizationId);
      const effectiveFromDate = paused ? previous.effectiveFromDate : parseCalendarDate(nextScheduledDate(previous.frequency, previous.anchorDate.toISOString().slice(0, 10), localCalendarDate(now, timezone)));
      const rule = await tx.taskRecurrenceRule.update({ where: { id: previous.id, version: previous.version }, data: { paused, effectiveFromDate, configuredById: actor.accountId, version: { increment: 1 } } });
      await this.changeEvidence(tx, actor, rule, previous, paused ? "paused" : "resumed", reason);
      return this.result(tx, actor, taskId);
    });
  }

  async runBatch(now = new Date()): Promise<number> {
    const candidates = await this.database.prisma.taskRecurrenceRule.findMany({ where: { paused: false }, select: { id: true }, orderBy: { id: "asc" } });
    let generated = 0;
    for (const candidate of candidates) {
      let created: boolean;
      try { created = await this.transaction(async (tx) => {
        // Match configuration's source-task-first locking, then lock the rule.
        const observed = await tx.taskRecurrenceRule.findUnique({ where: { id: candidate.id } });
        if (!observed) return false;
        const account = await tx.account.findUnique({ where: { id: observed.configuredById } });
        if (!account || account.kind !== AccountKind.OWNER && account.kind !== AccountKind.STAFF) return false;
        const actor: ProjectActor = { accountId: account.id, organizationId: observed.organizationId, kind: account.kind };
        let source;
        try { source = await this.tasks.assertRecurrenceAuthority(tx, actor, observed.sourceTaskId); }
        catch (error) { if (error instanceof ForbiddenException || error instanceof ConflictException) return false; throw error; }
        await tx.$queryRaw`SELECT "id" FROM "task_recurrence_rules" WHERE "id"=${candidate.id}::uuid FOR UPDATE`;
        const rule = await tx.taskRecurrenceRule.findUniqueOrThrow({ where: { id: candidate.id } });
        if (rule.paused || rule.version !== observed.version) return false;
        const timezone = await this.timezone(tx, actor.organizationId);
        const today = localCalendarDate(now, timezone);
        if (today < rule.effectiveFromDate.toISOString().slice(0, 10) || !isScheduledDate(rule.frequency, rule.anchorDate.toISOString().slice(0, 10), today)) return false;
        const scheduledDate = parseCalendarDate(today);
        if (await tx.taskRecurrenceOccurrence.findUnique({ where: { ruleId_scheduledDate: { ruleId: rule.id, scheduledDate } } })) return false;
        const collaborators = await tx.taskCollaborator.findMany({ where: { taskId: source.id } });
        let task;
        try {
          task = await this.tasks.createInTransaction(tx, actor, { title: source.title, type: source.type, priority: source.priority, targetDate: today, ownerEmployeeId: source.primaryOwnerEmployeeId, reason: "Scheduled recurring task occurrence", ...(source.description === null ? {} : { description: source.description }), ...(source.projectId ? { projectId: source.projectId } : {}), ...(source.estimatedHours === null ? {} : { estimatedHours: Number(source.estimatedHours) }), tags: source.tags, checklist: source.checklist as Array<{ label: string; checked: boolean }>, reviewRequirement: source.reviewRequirement, collaborators: collaborators.map((row) => ({ employeeId: row.employeeId, ...(row.estimatedHours === null ? {} : { estimatedHours: Number(row.estimatedHours) }) })) });
        } catch (error) { if (error instanceof ForbiddenException || error instanceof ConflictException) throw new ConflictException("Current recurring task creation authority or eligibility is unavailable"); throw error; }
        const occurrence = await tx.taskRecurrenceOccurrence.create({ data: { organizationId: rule.organizationId, ruleId: rule.id, scheduledDate, generatedTaskId: task.id, ruleVersion: rule.version } });
        await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "task.recurrence_generated", subjectType: "task_recurrence", subjectId: rule.id, reason: "Scheduled recurring task occurrence", after: { occurrenceId: occurrence.id, sourceTaskId: source.id, generatedTaskId: task.id, scheduledDate: today, ruleVersion: rule.version } });
        return true;
      }); } catch (error) {
        // A rule whose actor/collaborators lost authority pauses generation;
        // the failed transaction has rolled back before the next rule runs.
        if (error instanceof ForbiddenException || error instanceof ConflictException) continue;
        throw error;
      }
      if (created) generated++;
    }
    return generated;
  }
}

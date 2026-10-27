import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { Prisma, AccountKind, type WorkforceRecord } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService, type ApprovalHandler } from "./approval.service.js";
import { NotificationsService } from "./notifications.service.js";
import type { ProjectActor } from "./project.service.js";
import { recordProjectEvent } from "./project-events.js";
import { localCalendarDate } from "./task-recurrence-policy.js";
import { datesBetween, dateValue, scheduledMinutes, leaveMinutes, workloadCategory, type LeaveDay, type WorkScheduleData } from "./workforce-calculations.js";
import { distanceMetres, scheduledInstant, ExactDays } from "./workforce-calculations.js";
import { NasStorage } from "./nas-storage.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import sharp from "sharp";

type Tx = Prisma.TransactionClient;
type CapacitySnapshot = {records:WorkforceRecord[];employees:Awaited<ReturnType<Tx["employee"]["findMany"]>>;memberships:Awaited<ReturnType<Tx["employeeMembershipHistory"]["findMany"]>>;tasks:Awaited<ReturnType<Tx["task"]["findMany"]>>};
export type Command = { commandId: string; reason: string; expectedVersion?: number };
export type Policy = { branchId: string; effectiveFrom: string; annualAllowanceDays: number; selfieNoticeDays?:number|undefined; types: Array<{ key: string; label: string; paid: boolean; consumesBalance: boolean; approvalLevels: Array<"MANAGER" | "OWNER"> }>; thresholds: { under: number; near: number; over: number } };
export type Schedule = WorkScheduleData & { employeeId: string; effectiveFrom: string; effectiveTo: string | null; employmentType: "FULL_TIME" | "PART_TIME" };
type LeaveData = { typeKey: string; days: Array<LeaveDay & { minutes: number; capacityMinutes: number; days: string }>; emergency: boolean; policyId: string; levels: string[]; levelIndex: number; approvalRequestId: string | null; cancellationRequestId: string | null; cancellationDates: string[]; cancelledDates: string[]; consumesBalance: boolean; approvalLevel: string };
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const object = (value: Prisma.JsonValue) => value as Record<string, unknown>;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const exactLedger = (row:{days:Prisma.Decimal;data:Prisma.JsonValue}) => {const data=object(row.data); return data.exactDays?ExactDays.snapshot(data.exactDays as {numerator:string;denominator:string}):ExactDays.decimal(row.days.toString());};
const summaryDays = (days:ExactDays) => new Prisma.Decimal(days.numerator.toString()).div(days.denominator.toString()).toDecimalPlaces(9);
const sumExact = (rows:Array<{days:Prisma.Decimal;data:Prisma.JsonValue}>) => rows.reduce((sum,row)=>sum.add(exactLedger(row)),ExactDays.decimal(0));

@Injectable()
export class WorkforceService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService, private readonly approvals: ApprovalService, private readonly notifications: NotificationsService, @Optional() @Inject(RUNTIME_CONFIG) private readonly config?: RuntimeConfig) {
    this.approvals.registerHandler(this.leaveHandler(false)); this.approvals.registerHandler(this.leaveHandler(true));
  }
  private async transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    try { return await this.database.prisma.$transaction(fn, { timeout: 30000 }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2010" && error.meta?.code === "40P01")) throw new ConflictException("Workforce data changed. Refresh and retry"); if (error instanceof Error && ["Invalid calendar date","Date range must contain at most 366 days","Leave needs an effective working schedule","Leave exceeds scheduled capacity","Scheduled wall time is unavailable in the organization timezone"].includes(error.message)) throw new BadRequestException(error.message); throw error; }
  }
  private async active(tx: Tx, actor: ProjectActor) {
    await tx.$queryRaw`SELECT id FROM accounts WHERE id=${actor.accountId}::uuid FOR SHARE`;
    const account = await tx.account.findUnique({ where: { id: actor.accountId }, include: { employee: true } });
    if (!account || account.state !== "ACTIVE" || account.kind !== actor.kind || ![AccountKind.OWNER, AccountKind.STAFF].includes(account.kind as "OWNER" | "STAFF") || account.kind === "STAFF" && (!account.employee || account.employee.state !== "ACTIVE" || account.employee.organizationId !== actor.organizationId)) throw new ForbiddenException("Internal active employee required");
    const organization = await tx.organization.findFirst(); if (organization?.id !== actor.organizationId) throw new ForbiddenException("Organization unavailable");
    const sid = (actor as ProjectActor & { sessionId?: string }).sessionId;
    if (sid) { const session = await tx.session.findUnique({ where: { id: sid } }); if (!session || session.accountId !== actor.accountId || session.revokedAt || session.expiresAt <= new Date() || session.lastUsedAt.getTime() + 1800000 <= Date.now()) throw new ForbiddenException("Current session required"); }
    return account.employee;
  }
  async manager(tx: Tx, actor: ProjectActor, employeeId: string) {
    if (actor.kind === "OWNER") return true;
    const self = await this.active(tx, actor), target = await tx.employee.findFirst({ where: { id: employeeId, organizationId: actor.organizationId, state: "ACTIVE" } });
    if (!self || !target || self.id === target.id || self.homeBranchId !== target.homeBranchId || self.homeTeamId !== target.homeTeamId) return false;
    try { await this.authorization.assertPermission(actor.accountId, "workforce.manage", { kind: "TEAM", organizationId: actor.organizationId, branchId: target.homeBranchId, teamId: target.homeTeamId }, tx); }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
    const employees = await tx.employee.findMany({ where: { organizationId: actor.organizationId, homeTeamId: target.homeTeamId }, select: { id: true, reportsToId: true } });
    const parents = new Map(employees.map(e => [e.id, e.reportsToId])), seen = new Set<string>(); let parent = target.reportsToId;
    while (parent && !seen.has(parent)) { if (parent === self.id) return true; seen.add(parent); parent = parents.get(parent) ?? null; } return false;
  }
  private async subject(tx: Tx, actor: ProjectActor, id: string, manage = false) {
    const self = await this.active(tx, actor); const employee = await tx.employee.findFirst({ where: { id, organizationId: actor.organizationId, state: "ACTIVE" } });
    if (!employee || (manage || self?.id !== id) && !await this.manager(tx, actor, id)) throw new ForbiddenException("Employee workforce scope required"); return employee;
  }
  private async owner(tx: Tx, actor: ProjectActor) { await this.active(tx, actor); if (actor.kind !== "OWNER") throw new ForbiddenException("Owner configuration required"); }
  private async serial(tx: Tx, actor: ProjectActor, key: string) { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ':workforce:' + key},0))`; await this.active(tx, actor); }
  private async command<T extends object>(actor: ProjectActor, input: Command, operation: string, payload: unknown, fn: (tx: Tx) => Promise<T>) {
    if (!input.reason || input.reason.trim().length < 3 || input.reason.length > 1000) throw new BadRequestException("Reason required");
    return this.transaction(async tx => {
      await this.active(tx, actor); await this.serial(tx, actor, actor.accountId + input.commandId);
      const receipt = await tx.workforceReceipt.findUnique({ where: { actorId_commandId: { actorId: actor.accountId, commandId: input.commandId } } });
      const payloadHash = hash({ operation, payload });
      if (receipt) { if (receipt.payloadHash !== payloadHash) throw new ConflictException("Command reused with different values"); const result = object(receipt.result); if (result.employeeId) {await this.subject(tx, actor, String(result.employeeId));if(["allocation","schedule","override","decide","cancel-decide","attendance-review"].includes(operation))await this.subject(tx,actor,String(result.employeeId),true);if(operation==="selfie-retention")await this.owner(tx,actor);if(operation==="allocation"&&result.taskId&&!await this.taskVisible(tx,actor,String(result.taskId)))throw new ForbiddenException("Current allocation task access required");} else await this.owner(tx, actor); await this.active(tx, actor); return result as T; }
      const result = await fn(tx); await this.active(tx, actor);
      await tx.workforceReceipt.create({ data: { organizationId: actor.organizationId, actorId: actor.accountId, commandId: input.commandId, payloadHash, result: json(result) } }); return result;
    });
  }
  private async append(tx: Tx, actor: ProjectActor, kind: string, data: unknown, reason: string, scope: { employeeId?: string; branchId?: string; taskId?: string }, state = "ACTIVE", previous?: WorkforceRecord) {
    const id = previous?.id ?? randomUUID(), version = (previous?.version ?? 0) + 1;
    const row = previous ? await tx.workforceRecord.update({ where: { id }, data: { version, state, data: json(data) } }) : await tx.workforceRecord.create({ data: { id, organizationId: actor.organizationId, kind, state, data: json(data), ...scope } });
    const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "workforce.changed", subjectType: "workforce_record", subjectId: id, reason, ...(previous ? { before: { kind, version: previous.version, state: previous.state, data: previous.data } } : {}), after: { kind, version, state, data } });
    await tx.workforceVersion.create({ data: { organizationId: actor.organizationId, recordId: id, version, state, data: json(data), reason, actorId: actor.accountId, eventId } }); return { row, eventId };
  }
  private async record(tx: Tx, actor: ProjectActor, id: string, kind: string, expectedVersion?: number) {
    await tx.$queryRaw`SELECT id FROM workforce_records WHERE id=${id}::uuid FOR UPDATE`;
    const row = await tx.workforceRecord.findFirst({ where: { id, organizationId: actor.organizationId, kind } });
    if (!row) throw new NotFoundException("Workforce record unavailable");
    if (expectedVersion !== undefined && row.version !== expectedVersion) throw new ConflictException("Record changed; refresh");
    if (row.employeeId) await this.subject(tx, actor, row.employeeId); else await this.owner(tx, actor); return row;
  }
  private async policy(tx: Tx, organizationId: string, branchId: string, date: string) {
    const rows = await tx.workforceRecord.findMany({ where: { organizationId, kind: "POLICY", branchId } });
    return rows.filter(row => (object(row.data).effectiveFrom as string) <= date).sort((a, b) => String(object(b.data).effectiveFrom).localeCompare(String(object(a.data).effectiveFrom)) || b.createdAt.getTime() - a.createdAt.getTime())[0];
  }
  private async schedule(tx: Tx, organizationId: string, employeeId: string, date: string) {
    const rows = await tx.workforceRecord.findMany({ where: { organizationId, employeeId, kind: { in: ["SCHEDULE", "OVERRIDE"] } } });
    const eligible = rows.filter(r => { const d = object(r.data); return String(d.effectiveFrom) <= date && (!d.effectiveTo || String(d.effectiveTo) >= date); }).sort((a, b) => (a.kind === "OVERRIDE" ? 0 : 1) - (b.kind === "OVERRIDE" ? 0 : 1) || String(object(b.data).effectiveFrom).localeCompare(String(object(a.data).effectiveFrom)) || b.createdAt.getTime() - a.createdAt.getTime());
    return eligible[0]?.data as WorkScheduleData | undefined;
  }
  private async capacity(tx: Tx, organizationId: string, employeeId: string, date: string,snapshot?:CapacitySnapshot) {
    const employee = snapshot?snapshot.employees.find(e=>e.id===employeeId)!:await tx.employee.findFirstOrThrow({ where: { id: employeeId, organizationId } });
    const membership = snapshot?snapshot.memberships.filter(m=>m.employeeId===employeeId&&m.effectiveFrom<new Date(dateValue(date).getTime()+86400000)&&(!m.effectiveTo||m.effectiveTo>dateValue(date))).sort((a,b)=>b.effectiveFrom.getTime()-a.effectiveFrom.getTime())[0]:await tx.employeeMembershipHistory.findFirst({ where: { employeeId, effectiveFrom: { lt: new Date(dateValue(date).getTime()+86400000) }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: dateValue(date) } }] }, orderBy: { effectiveFrom: "desc" } });
    const branchId = membership?.branchId ?? employee.homeBranchId;
    const policy = snapshot?snapshot.records.filter(r=>r.kind==="POLICY"&&r.branchId===branchId&&String(object(r.data).effectiveFrom)<=date).sort((a,b)=>String(object(b.data).effectiveFrom).localeCompare(String(object(a.data).effectiveFrom))||b.createdAt.getTime()-a.createdAt.getTime())[0]:await this.policy(tx, organizationId, branchId, date);
    const schedule = snapshot?snapshot.records.filter(r=>r.employeeId===employeeId&&["SCHEDULE","OVERRIDE"].includes(r.kind)&&String(object(r.data).effectiveFrom)<=date&&(!object(r.data).effectiveTo||String(object(r.data).effectiveTo)>=date)).sort((a,b)=>(a.kind==="OVERRIDE"?0:1)-(b.kind==="OVERRIDE"?0:1)||String(object(b.data).effectiveFrom).localeCompare(String(object(a.data).effectiveFrom))||b.createdAt.getTime()-a.createdAt.getTime())[0]?.data as WorkScheduleData|undefined:await this.schedule(tx, organizationId, employeeId, date);
    const holidays = snapshot?snapshot.records.filter(r=>r.kind==="HOLIDAY"&&r.branchId===branchId):await tx.workforceRecord.findMany({ where: { organizationId, kind: "HOLIDAY", branchId } });
    const scheduled = holidays.some(r => object(r.data).date === date) ? 0 : scheduledMinutes(schedule, date);
    const leaves = snapshot?snapshot.records.filter(r=>r.kind==="LEAVE"&&r.employeeId===employeeId&&["APPROVED","CANCEL_PENDING"].includes(r.state)):await tx.workforceRecord.findMany({ where: { organizationId, kind: "LEAVE", employeeId, state: { in: ["APPROVED", "CANCEL_PENDING"] } } });
    let used = 0,wfhMinutes=0; for (const row of leaves) { const data = row.data as unknown as LeaveData; for (const day of data.days) if (day.date === date && !data.cancelledDates.includes(date)) {if(data.typeKey==="WFH")wfhMinutes+=day.minutes;else used += day.minutes;} }
    const allocations = snapshot?snapshot.records.filter(r=>r.kind==="ALLOCATION"&&r.employeeId===employeeId&&r.state==="ACTIVE"):await tx.workforceRecord.findMany({ where: { organizationId, kind: "ALLOCATION", employeeId, state: "ACTIVE" } });
    let allocated = 0; const affectedTasks = [];
    for (const row of allocations) if (object(row.data).date === date && row.taskId) { const task = snapshot?snapshot.tasks.find(t=>t.id===row.taskId):await tx.task.findUnique({ where: { id: row.taskId } }); if (task && !["COMPLETED", "STOPPED_DUE_TO_PROJECT_CANCELLATION"].includes(task.status) && !task.requiresReassignment) { allocated += Number(object(row.data).minutes); affectedTasks.push({ id: task.id, title: task.title, priority: task.priority }); } }
    const capacity = Math.max(0, scheduled - used); const thresholds = policy ? (policy.data as unknown as Policy).thresholds : undefined;
    return { employeeId, date, policyId:policy?.id??null, scheduleSetupRequired: !schedule, scheduledMinutes: scheduled, leaveMinutes: used,wfhMinutes,expectedLocation:wfhMinutes>0?"REMOTE":"SCHEDULED", allocatedMinutes: allocated, availableMinutes: Math.max(0, capacity - allocated), capacityMinutes: capacity, category: workloadCategory(allocated, capacity, thresholds), affectedTasks, thresholds };
  }
  /** Schedule-derived workload evidence, with the same current workforce subject authority. */
  async performanceCapacityEvidence(tx: Tx, actor: ProjectActor, employeeId: string, date: string) {
    dateValue(date);
    await this.subject(tx, actor, employeeId);
    const schedule = await this.schedule(tx, actor.organizationId, employeeId, date);
    if (!schedule) return null;
    const capacity = await this.capacity(tx, actor.organizationId, employeeId, date);
    if (!capacity.policyId || !capacity.thresholds) return null;
    await this.subject(tx, actor, employeeId);
    return {
      employeeId, date, policyId: capacity.policyId,
      scheduledMinutes: capacity.scheduledMinutes, capacityMinutes: capacity.capacityMinutes,
      allocatedMinutes: capacity.allocatedMinutes, availableMinutes: capacity.availableMinutes,
      category: capacity.category, thresholds: capacity.thresholds,
    };
  }
  async savePolicy(actor: ProjectActor, input: Policy & Command) {
    return this.command(actor, input, "policy", input, async tx => { await this.owner(tx, actor); if (!await tx.branch.findFirst({ where: { id: input.branchId, organizationId: actor.organizationId } })) throw new ForbiddenException("Branch unavailable");
      if (!input.types.length || new Set(input.types.map(t => t.key)).size !== input.types.length || input.types.some(t => !t.approvalLevels.length || t.approvalLevels.length > 2 || new Set(t.approvalLevels).size !== t.approvalLevels.length || t.key === "WFH" && t.consumesBalance)) throw new BadRequestException("Configure distinct leave types and approval levels; WFH never debits leave");
      if (!(input.thresholds.under < input.thresholds.near && input.thresholds.near < input.thresholds.over)) throw new BadRequestException("Workload thresholds must increase");
      const data = Object.fromEntries(Object.entries(input).filter(([key])=>key!=="commandId"&&key!=="reason")); return (await this.append(tx, actor, "POLICY", data, input.reason, { branchId: input.branchId })).row;
    });
  }
  async saveSchedule(actor: ProjectActor, input: Schedule & Command, override = false) {
    return this.command(actor, input, override ? "override" : "schedule", input, async tx => { await this.subject(tx, actor, input.employeeId, true); await this.serial(tx, actor, input.employeeId); dateValue(input.effectiveFrom); if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) throw new BadRequestException("Schedule dates differ");
      const span = (input.endMinute - input.startMinute + 1440) % 1440; if (!span || input.breakMinutes >= span || input.dailyCapacityMinutes > span - input.breakMinutes || !input.workingDays.length || new Set(input.workingDays).size !== input.workingDays.length) throw new BadRequestException("Invalid working schedule");
      const data = Object.fromEntries(Object.entries(input).filter(([key])=>key!=="commandId"&&key!=="reason")); return (await this.append(tx, actor, override ? "OVERRIDE" : "SCHEDULE", data, input.reason, { employeeId: input.employeeId })).row;
    });
  }
  async holiday(actor: ProjectActor, input: Command & { branchId: string; date: string; label: string }) {
    return this.command(actor, input, "holiday", input, async tx => { await this.owner(tx, actor); if (!await tx.branch.findFirst({ where: { id: input.branchId, organizationId: actor.organizationId } })) throw new ForbiddenException("Branch unavailable"); return (await this.append(tx, actor, "HOLIDAY", { date: input.date, label: input.label }, input.reason, { branchId: input.branchId })).row; });
  }
  private async today(tx: Tx, organizationId: string) { return localCalendarDate(new Date(), (await tx.organization.findUniqueOrThrow({ where: { id: organizationId } })).timezone); }
  private async approver(tx: Tx, organizationId: string, employeeId: string, level: string) {
    const employee = await tx.employee.findFirstOrThrow({ where: { id: employeeId, organizationId } });
    if (level === "OWNER") { const owner = await tx.account.findFirst({ where: { kind: "OWNER", state: "ACTIVE" } }); if (!owner) throw new ConflictException("Owner approver unavailable"); return owner.id; }
    const manager = employee.reportsToId && await tx.employee.findFirst({ where: { id: employee.reportsToId, organizationId, state: "ACTIVE" } });
    if (!manager || !await this.manager(tx, { accountId: manager.accountId, organizationId, kind: AccountKind.STAFF }, employeeId)) throw new ConflictException("Configured manager approval requires an active authorized reporting manager"); return manager.accountId;
  }
  private leaveHandler(cancellation: boolean): ApprovalHandler {
    return {
      typeKey: cancellation ? "workforce.leave_cancel" : "workforce.leave", canSelfApprove: false,
      resolveApprover: async (tx, actor, input) => { const row = await tx.workforceRecord.findFirstOrThrow({ where: { id: input.sourceId, organizationId: actor.organizationId } }); const data = row.data as unknown as LeaveData; const level = data.levels[data.levelIndex]!; return { accountId: await this.approver(tx, actor.organizationId, row.employeeId!, level), level }; },
      canView: async (tx, actor, request) => { const row = await tx.workforceRecord.findUnique({ where: { id: request.sourceId } }); const account = await tx.account.findUnique({ where: { id: actor.accountId }, include: { employee: true } }); return !!row && !!account && (account.kind === "OWNER" || row.employeeId === account.employee?.id || await this.manager(tx, { ...actor, kind: account.kind }, row.employeeId!)); },
      canDecide: async (tx, actor, request) => { const row = await tx.workforceRecord.findUnique({ where: { id: request.sourceId } }); if (!row || request.approverId !== actor.accountId) return false; return await this.approver(tx, actor.organizationId, row.employeeId!, request.approvalLevel) === actor.accountId; },
      projectCard: async (_tx, request) => ({ title: cancellation ? "Cancel unused approved leave" : "Workforce leave / WFH", summary: request.reason, subjectLabel: request.sourceId, requesterLabel: request.requesterId, levelLabel: request.approvalLevel }),
      onDecision: async (tx, request, decision, actorId) => {
        const account = await tx.account.findUniqueOrThrow({ where: { id: actorId } }); const actor = { accountId: actorId, organizationId: request.organizationId, kind: account.kind };
        const row = await tx.workforceRecord.findUniqueOrThrow({ where: { id: request.sourceId } }); await this.serial(tx, actor, row.employeeId!);
        const data = structuredClone(row.data) as unknown as LeaveData;
        if (cancellation ? row.state !== "CANCEL_PENDING" || data.cancellationRequestId !== request.id : row.state !== "PENDING" || data.approvalRequestId !== request.id) throw new ConflictException("Request is no longer current");
        if (decision.outcome === "REJECTED") { await this.append(tx, actor, "LEAVE", data, decision.reason, { employeeId: row.employeeId! }, cancellation ? "APPROVED" : "REJECTED", row); return; }
        if (data.levelIndex + 1 < data.levels.length) {
          data.levelIndex++; const next = await this.append(tx, actor, "LEAVE", data, decision.reason, { employeeId: row.employeeId! }, row.state, row);
          const pending = await this.approvals.createRequest(tx, { accountId: request.requesterId, organizationId: actor.organizationId }, cancellation ? "workforce.leave_cancel" : "workforce.leave", { sourceType: "workforce_record", sourceId: row.id, sourceGeneration: next.row.version, reason: request.reason, context: { employeeId: row.employeeId!, cancellation } });
          data[cancellation ? "cancellationRequestId" : "approvalRequestId"] = pending.id; await this.append(tx, actor, "LEAVE", data, decision.reason, { employeeId: row.employeeId! }, row.state, next.row); return;
        }
        const today = await this.today(tx, actor.organizationId); const eligible = cancellation ? data.days.filter(day => data.cancellationDates.includes(day.date) && day.date > today && !data.cancelledDates.includes(day.date)) : data.days;
        if (cancellation && !eligible.length) throw new ConflictException("No future unused leave remains");
        if (!cancellation) {
          for(const day of eligible) {const capacity=await this.capacity(tx,actor.organizationId,row.employeeId!,day.date);if(data.typeKey!=="WFH"&&capacity.leaveMinutes+day.minutes>capacity.scheduledMinutes) throw new ConflictException("Approved absence now overlaps this pending request");}
          if(data.consumesBalance) for(const year of new Set(eligible.map(d=>Number(d.date.slice(0,4))))) {const balance=await this.credit(tx,actor,row.employeeId!,year); const needed=eligible.filter(d=>Number(d.date.slice(0,4))===year).reduce((sum,d)=>sum.add(d.exactDays?ExactDays.snapshot(d.exactDays):ExactDays.decimal(d.days)),ExactDays.decimal(0));if(needed.compare(ExactDays.snapshot(balance.exactRemainingDays))>0) throw new ConflictException("Allowance was consumed by another approved request");if(year>Number(today.slice(0,4))&&needed.compare(ExactDays.snapshot(balance.exactAnnualRemainingDays))>0) throw new ConflictException(`Projected unused carry for leave-year ${year} cannot be used for approval before January 1; keep this request pending until carry is finalized`);}
        }
        if (cancellation) data.cancelledDates.push(...eligible.map(day => day.date));
        const result = await this.append(tx, actor, "LEAVE", data, decision.reason, { employeeId: row.employeeId! }, "APPROVED", row);
        if (data.consumesBalance) for (const day of eligible) {
          const exact=day.exactDays?ExactDays.snapshot(day.exactDays):ExactDays.decimal(day.days), signed=cancellation?exact:new ExactDays(-exact.numerator,exact.denominator),year=Number(day.date.slice(0,4));
          const yearLedger=await tx.workforceLedger.findMany({where:{employeeId:row.employeeId!,year}}),carry=sumExact(yearLedger.filter(l=>l.kind==="CARRY"||l.kind==="ADJUSTMENT"&&object(l.data).carryAdjustment===true)),priorChanges=sumExact(yearLedger.filter(l=>["DEBIT","REVERSAL"].includes(l.kind))),priorUsed=new ExactDays(-priorChanges.numerator,priorChanges.denominator),carryAvailable=carry.sub(priorUsed.compare(carry)>0?carry:priorUsed);
          let carryPortion=carryAvailable.compare(exact)>0?exact:carryAvailable.compare(ExactDays.decimal(0))<0?ExactDays.decimal(0):carryAvailable,annualPortion=exact.sub(carryPortion);
          if(cancellation){const original=yearLedger.find(l=>l.sourceKey===`debit:${row.id}:${day.date}`);if(!original)throw new ConflictException("Original debit is missing");const originalData=object(original.data);carryPortion=ExactDays.snapshot(originalData.carryPortion as {numerator:string;denominator:string});annualPortion=ExactDays.snapshot(originalData.annualPortion as {numerator:string;denominator:string});}
          await tx.workforceLedger.create({ data: { organizationId: actor.organizationId, employeeId: row.employeeId!, year, kind: cancellation ? "REVERSAL" : "DEBIT", sourceKey: `${cancellation ? 'reverse' : 'debit'}:${row.id}:${day.date}`, days: new Prisma.Decimal(day.days).mul(cancellation ? 1 : -1), data: json({ recordId: row.id, date: day.date, minutes: day.minutes, capacityMinutes: day.capacityMinutes, policyId: data.policyId,exactDays:signed.toJSON(),carryPortion:carryPortion.toJSON(),annualPortion:annualPortion.toJSON(),carrySourceYear:year-1,carryExpiresOn:`${year}-12-31`,consumptionOrder:"CARRY_FIRST" }), eventId: result.eventId } });
        }
        if (!cancellation && data.consumesBalance) {
          const currentYear = Number(today.slice(0, 4));
          const historicalYears = eligible.map(day => Number(day.date.slice(0, 4))).filter(year => year < currentYear);
          if (historicalYears.length) {
            const firstAffectedCarryYear = Math.min(...historicalYears) + 1;
            for (let carryYear = firstAffectedCarryYear; carryYear <= currentYear; carryYear++) await this.reconcileCarry(tx, actor, row.employeeId!, carryYear, true, true);
          }
        }
        await this.impact(tx, actor, row.employeeId!, eligible.map(day => day.date), result.eventId, cancellation ? "Approved leave cancellation: review existing handovers" : "Approved leave affects available capacity");
      }
    };
  }
  private async impact(tx: Tx, actor: ProjectActor, employeeId: string, dates: string[], eventId: string, title: string) {
    const subject = await tx.employee.findUniqueOrThrow({ where: { id: employeeId } }); const recipients = new Set<string>();
    if (subject.reportsToId) { const manager = await tx.employee.findUnique({ where: { id: subject.reportsToId } }); if (manager && await this.manager(tx, { accountId: manager.accountId, organizationId: actor.organizationId, kind: AccountKind.STAFF }, employeeId)) recipients.add(manager.accountId); }
    const owner = await tx.account.findFirst({ where: { kind: "OWNER", state: "ACTIVE" } }); if (owner) recipients.add(owner.id);
    const tasks = new Set<string>(); for (const date of dates) for (const task of (await this.capacity(tx, actor.organizationId, employeeId, date)).affectedTasks) tasks.add(task.id);
    for (const taskId of tasks) { const task = await tx.task.findUniqueOrThrow({ where: { id: taskId }, include: { primaryOwner: true } }); if (task.primaryOwner.state === "ACTIVE") recipients.add(task.primaryOwner.accountId); }
    for (const recipientAccountId of recipients) {const account=await tx.account.findUniqueOrThrow({where:{id:recipientAccountId}}),recipient={accountId:recipientAccountId,organizationId:actor.organizationId,kind:account.kind};const impacts=await this.impactSuggestions(tx,recipient,employeeId,dates),critical=impacts.filter(i=>i.critical).length; await this.notifications.createForEvent(tx, { eventId, recipientAccountId, channel: "IN_APP", category: "workforce.impact", title, body: `${dates.length} affected date(s), ${impacts.length} visible task/date allocation(s), ${critical} critical. Open Workforce for eligible capacity-based reassignment suggestions; prior handovers remain.`, internalRoute: "/workforce", critical: critical>0, mandatory: true });}
  }
  private async credit(tx: Tx, actor: ProjectActor, employeeId: string, year: number, persist = true) {
    await this.serial(tx, actor, employeeId); const employee = await tx.employee.findUniqueOrThrow({ where: { id: employeeId } });
    const memberships = await tx.employeeMembershipHistory.findMany({ where: { employeeId }, orderBy: { effectiveFrom: "asc" } });
    const policies = await tx.workforceRecord.findMany({ where: { organizationId: actor.organizationId, kind: "POLICY" } });
    const length = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000; let allowanceExact = ExactDays.decimal(0); const inputs = [];
    for (let index = 0; index < length; index++) {
      const date = new Date(Date.UTC(year, 0, index + 1)), key = date.toISOString().slice(0, 10); if (date < new Date(Date.UTC(employee.hiredAt.getUTCFullYear(), employee.hiredAt.getUTCMonth(), employee.hiredAt.getUTCDate()))) continue;
      const membership = memberships.filter(m => m.effectiveFrom.toISOString().slice(0, 10) <= key && (!m.effectiveTo || m.effectiveTo.toISOString().slice(0, 10) > key)).at(-1);
      const branchId = membership?.branchId ?? employee.homeBranchId;
      const policy = policies.filter(p => p.branchId === branchId && String(object(p.data).effectiveFrom) <= key).sort((a, b) => String(object(b.data).effectiveFrom).localeCompare(String(object(a.data).effectiveFrom)) || b.createdAt.getTime() - a.createdAt.getTime())[0];
      if (!policy) throw new ConflictException("Owner Branch allowance setup is required for each effective employment period");
      allowanceExact = allowanceExact.add(ExactDays.decimal((policy.data as unknown as Policy).annualAllowanceDays).div(ExactDays.decimal(length))); inputs.push(`${key}:${branchId}:${policy.id}`);
    }
    const currentYear = Number((await this.today(tx, actor.organizationId)).slice(0, 4));
    const entitlementFinalized = year <= currentYear;
    const old = await tx.workforceLedger.findMany({ where: { employeeId, year, kind: { in: ["GRANT", "ADJUSTMENT"] } } });
    const annualRows=old.filter(row=>object(row.data).carryAdjustment!==true);
    const differenceExact=allowanceExact.sub(sumExact(annualRows)); const difference = summaryDays(differenceExact); const sourceKey = `credit:${year}:${hash(inputs)}`;
    if (persist && entitlementFinalized && differenceExact.numerator!==0n && !await tx.workforceLedger.findUnique({ where: { employeeId_sourceKey: { employeeId, sourceKey } } })) {
      const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "workforce.credited", subjectType: "workforce_ledger", subjectId: employeeId, reason: "Effective Branch policy annual entitlement calculation", after: { year, days: difference.toString(), inputHash: hash(inputs), calendarDays: length,exactDays:differenceExact.toJSON() } });
      await tx.workforceLedger.create({ data: { organizationId: actor.organizationId, employeeId, year, kind: annualRows.length ? "ADJUSTMENT" : "GRANT", sourceKey, days: difference, data: { inputHash: hash(inputs), calendarDays: length,exactDays:differenceExact.toJSON() }, eventId } });
    }
    const creditedCarry = await this.reconcileCarry(tx, actor, employeeId, year, persist, entitlementFinalized);
    const ledger = await tx.workforceLedger.findMany({ where: { employeeId, year } });
    const changes=sumExact(ledger.filter(r=>["DEBIT","REVERSAL"].includes(r.kind))),exactRemaining=allowanceExact.add(creditedCarry).add(changes);
    const usage=-Number(summaryDays(changes));const carryUsed=Math.min(Number(summaryDays(creditedCarry)),Math.max(0,usage));
    const annualRemaining = allowanceExact.add(changes);
    return { employeeId, year, entitlementFinalized, remainingDays: summaryDays(exactRemaining).toString(),exactRemainingDays:exactRemaining.toJSON(),exactAnnualRemainingDays:annualRemaining.toJSON(),annualAllowanceDays:summaryDays(allowanceExact).toString(),carryForwardDays:summaryDays(creditedCarry).toString(),carryUsedDays:carryUsed,annualUsedDays:Math.max(0,usage-carryUsed),carryExpiresOn:`${year}-12-31`,consumptionOrder:"CARRY_FIRST", ledger };
  }
  private async reconcileCarry(tx: Tx, actor: ProjectActor, employeeId: string, year: number, persist: boolean, finalized: boolean) {
    const previous = await tx.workforceLedger.findMany({ where: { employeeId, year: year - 1 }, orderBy: { sourceKey: "asc" } });
    const previousGrant = sumExact(previous.filter(r => r.kind === "GRANT" || r.kind === "ADJUSTMENT" && object(r.data).carryAdjustment !== true));
    const previousCarry = sumExact(previous.filter(r => r.kind === "CARRY" || r.kind === "ADJUSTMENT" && object(r.data).carryAdjustment === true));
    const previousDebitSigned = sumExact(previous.filter(r => ["DEBIT", "REVERSAL"].includes(r.kind)));
    const previousDebit = new ExactDays(-previousDebitSigned.numerator, previousDebitSigned.denominator);
    const annualUsed = previousDebit.sub(previousCarry);
    const annualRemaining = previousGrant.sub(annualUsed.compare(ExactDays.decimal(0)) > 0 ? annualUsed : ExactDays.decimal(0));
    const targetCarry = annualRemaining.compare(ExactDays.decimal(0)) < 0 ? ExactDays.decimal(0) : annualRemaining.compare(ExactDays.decimal(5)) > 0 ? ExactDays.decimal(5) : annualRemaining;
    let carryRows = (await tx.workforceLedger.findMany({ where: { employeeId, year, kind: { in: ["CARRY", "ADJUSTMENT"] } } })).filter(row=>row.kind==="CARRY"||object(row.data).carryAdjustment===true);
    const currentCarry = sumExact(carryRows);
    const difference = targetCarry.sub(currentCarry);
    if (persist && finalized && previous.length && difference.numerator !== 0n) {
      const initial = carryRows.length === 0;
      const sourceLedgerHash = hash(previous.map(row => `${row.id}:${row.kind}:${row.days.toString()}:${JSON.stringify(row.data)}`).sort());
      const sourceKey = initial ? `carry:${year}` : `carry-adjustment:${year}:${sourceLedgerHash}`;
      if (!await tx.workforceLedger.findUnique({ where: { employeeId_sourceKey: { employeeId, sourceKey } } })) {
        const days = summaryDays(difference);
        const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "workforce.credited", subjectType: "workforce_ledger", subjectId: employeeId, reason: initial ? "Unused prior-year allowance carried forward, capped at five days" : "Append-only recalculation of prior-year unused leave carry after a late leave decision", after: { year, days: days.toString(), exactDays: difference.toJSON(), sourceYear: year - 1, expiresOn: `${year}-12-31`, reconciliation: !initial, previousCarry: currentCarry.toJSON(), targetCarry: targetCarry.toJSON(), sourceLedgerHash } });
        await tx.workforceLedger.create({ data: { organizationId: actor.organizationId, employeeId, year, kind: initial ? "CARRY" : "ADJUSTMENT", sourceKey, days, data: { sourceYear: year - 1, expiresOn: `${year}-12-31`, consumptionOrder: "CARRY_FIRST", exactDays: difference.toJSON(), reconciliation: !initial, carryAdjustment: !initial, previousCarry: currentCarry.toJSON(), targetCarry: targetCarry.toJSON(), sourceLedgerHash }, eventId } });
      }
      carryRows = (await tx.workforceLedger.findMany({ where: { employeeId, year, kind: { in: ["CARRY", "ADJUSTMENT"] } } })).filter(row=>row.kind==="CARRY"||object(row.data).carryAdjustment===true);
    }
    return carryRows.length ? sumExact(carryRows) : targetCarry;
  }
  async leave(actor: ProjectActor, input: Command & { employeeId?: string | undefined; typeKey: string; days: LeaveDay[]; emergency: boolean }) {
    return this.command(actor, input, "leave", input, async tx => {
      const self = await this.active(tx, actor); const employeeId = input.employeeId ?? self?.id; if (!employeeId) throw new BadRequestException("Employee required");
      const employee = await this.subject(tx, actor, employeeId); await this.serial(tx, actor, employeeId);
      if (!input.days.length || new Set(input.days.map(d => d.date)).size !== input.days.length) throw new BadRequestException("Distinct leave days required");
      const policy = await this.policy(tx, actor.organizationId, employee.homeBranchId, input.days[0]!.date); if (!policy) throw new ConflictException("Owner leave policy setup required");
      const type = (policy.data as unknown as Policy).types.find(t => t.key === input.typeKey); if (!type) throw new BadRequestException("Leave type is not configured");
      const days = []; const today = await this.today(tx, actor.organizationId);
      for (const day of input.days) { if (day.date < today && !input.emergency) throw new BadRequestException("Past leave requires emergency designation"); const capacity = await this.capacity(tx, actor.organizationId, employeeId, day.date); const minutes = leaveMinutes(day, capacity.scheduledMinutes); if (capacity.leaveMinutes + minutes > capacity.scheduledMinutes && input.typeKey !== "WFH") throw new ConflictException("Leave overlaps approved absence"); const exactDays = day.portion==="FULL"?ExactDays.decimal(1):day.portion==="HALF"?ExactDays.decimal("0.5"):ExactDays.decimal(minutes).div(ExactDays.decimal(capacity.scheduledMinutes)); days.push({ ...day, minutes, capacityMinutes: capacity.scheduledMinutes, days: new Prisma.Decimal(exactDays.numerator.toString()).div(exactDays.denominator.toString()).toDecimalPlaces(9).toString(), exactDays:exactDays.toJSON() }); }
      if (type.consumesBalance) for (const year of new Set(days.map(d => Number(d.date.slice(0, 4))))) { const balance = await this.credit(tx, actor, employeeId, year); const needed = days.filter(d => Number(d.date.slice(0, 4)) === year).reduce((sum, d) => sum.add(ExactDays.snapshot(d.exactDays)),ExactDays.decimal(0)); if (needed.compare(ExactDays.snapshot(balance.exactRemainingDays))>0) throw new ConflictException("Paid allowance insufficient; choose an explicitly configured unpaid/excess type"); }
      const data: LeaveData = { typeKey: input.typeKey, days, emergency: input.emergency, policyId: policy.id, levels: type.approvalLevels, levelIndex: 0, approvalRequestId: null, cancellationRequestId: null, cancellationDates: [], cancelledDates: [], consumesBalance: type.consumesBalance, approvalLevel: type.approvalLevels.join("→") };
      const created = await this.append(tx, actor, "LEAVE", data, input.reason, { employeeId }, "PENDING");
      const request = await this.approvals.createRequest(tx, actor, "workforce.leave", { sourceType: "workforce_record", sourceId: created.row.id, reason: input.reason, context: { employeeId, cancellation: false } }); data.approvalRequestId = request.id;
      const result = await this.append(tx, actor, "LEAVE", data, input.reason, { employeeId }, "PENDING", created.row);
      if (input.emergency) await this.impact(tx, actor, employeeId, days.map(d => d.date), result.eventId, "Emergency leave request: immediate affected-task review"); return result.row;
    });
  }
  async decide(actor: ProjectActor, id: string, input: Command & { outcome: "APPROVED" | "REJECTED" }, cancellation = false) {
    return this.command(actor, input, cancellation ? "cancel-decide" : "decide", { id, ...input }, async tx => { const row = await this.record(tx, actor, id, "LEAVE", input.expectedVersion); await this.serial(tx, actor, row.employeeId!); const data = row.data as unknown as LeaveData; const requestId = cancellation ? data.cancellationRequestId : data.approvalRequestId; if (!requestId) throw new ConflictException("No pending approval"); await this.approvals.decide(tx, actor, requestId, { outcome: input.outcome, reason: input.reason }); return await tx.workforceRecord.findUniqueOrThrow({ where: { id } }); });
  }
  async cancel(actor: ProjectActor, id: string, input: Command & { dates: string[] }) {
    return this.command(actor, input, "cancel", { id, ...input }, async tx => { const row = await this.record(tx, actor, id, "LEAVE", input.expectedVersion); if (row.state !== "APPROVED") throw new ConflictException("Only approved leave may be cancelled"); await this.serial(tx, actor, row.employeeId!); const data = structuredClone(row.data) as unknown as LeaveData, today = await this.today(tx, actor.organizationId);
      if (!input.dates.length || new Set(input.dates).size !== input.dates.length || input.dates.some(d => d <= today || !data.days.some(day => day.date === d) || data.cancelledDates.includes(d))) throw new ConflictException("Only unused future approved portions may be cancelled");
      data.cancellationDates = input.dates; data.levelIndex = 0; const pending = await this.append(tx, actor, "LEAVE", data, input.reason, { employeeId: row.employeeId! }, "CANCEL_PENDING", row);
      const request = await this.approvals.createRequest(tx, actor, "workforce.leave_cancel", { sourceType: "workforce_record", sourceId: id, sourceGeneration: pending.row.version, reason: input.reason, context: { employeeId: row.employeeId!, cancellation: true } }); data.cancellationRequestId = request.id; return (await this.append(tx, actor, "LEAVE", data, input.reason, { employeeId: row.employeeId! }, "CANCEL_PENDING", pending.row)).row;
    });
  }
  async assignmentWarning(tx: Tx, actor: ProjectActor, employeeId: string) {
    await this.serial(tx,actor,employeeId);
    const today = await this.today(tx, actor.organizationId); const future = datesBetween(today, new Date(dateValue(today).getTime() + 30 * 86400000).toISOString().slice(0, 10));
    for (const date of future) { const row = await this.capacity(tx, actor.organizationId, employeeId, date); if (row.category === "Overloaded") return { employeeId, date, message: "Employee has overloaded allocated work; review capacity before assigning" }; } return null;
  }
  async allocate(actor: ProjectActor, input: Command & { taskId: string; employeeId: string; date: string; minutes: number; acknowledgeOverload: boolean }) {
    return this.command(actor, input, "allocation", input, async tx => {
      await this.subject(tx, actor, input.employeeId, true); await this.serial(tx, actor, input.employeeId);
      const task = await tx.task.findFirst({ where: { id: input.taskId, organizationId: actor.organizationId }, include: { collaborators: true, project: true } });
      if (!task || ["COMPLETED", "STOPPED_DUE_TO_PROJECT_CANCELLATION"].includes(task.status) || task.requiresReassignment || task.project && task.project.status !== "ACTIVE") throw new ConflictException("Task is not eligible for allocation");
      if (task.primaryOwnerEmployeeId !== input.employeeId && !task.collaborators.some(c => c.employeeId === input.employeeId)) throw new ForbiddenException("Explicit task participant required");
      if (task.project) {
        const employee = await tx.employee.findUniqueOrThrow({ where: { id: input.employeeId } });
        const assignment = await tx.projectAssignment.findFirst({ where: { projectId: task.project.id, employeeId: input.employeeId, revokedAt: null } });
        if (!assignment || employee.homeBranchId !== task.project.branchId && !assignment.crossBranchAuthorized) throw new ForbiddenException("Explicit project and cross-branch assignment required");
      }
      if (actor.kind !== "OWNER") { const self = await this.active(tx, actor); if (task.project && !await tx.projectAssignment.findFirst({ where: { projectId: task.project.id, employeeId: self!.id, revokedAt: null } })) throw new ForbiddenException("Management project access required"); await this.authorization.assertPermission(actor.accountId, "task.assign", { kind: "TEAM", organizationId: actor.organizationId, branchId: self!.homeBranchId, teamId: self!.homeTeamId }, tx); }
      const capacity = await this.capacity(tx, actor.organizationId, input.employeeId, input.date); if (!capacity.thresholds) throw new ConflictException("Owner workload threshold setup required");
      if (workloadCategory(capacity.allocatedMinutes + input.minutes, capacity.capacityMinutes, capacity.thresholds) === "Overloaded" && !input.acknowledgeOverload) throw new ConflictException("Overload warning: review capacity and acknowledge before allocation");
      return (await this.append(tx, actor, "ALLOCATION", { date: input.date, minutes: input.minutes, acknowledgeOverload: input.acknowledgeOverload }, input.reason, { employeeId: input.employeeId, taskId: input.taskId })).row;
    });
  }
  private async visibleEmployees(tx: Tx, actor: ProjectActor, managed: boolean) {
    const self = await this.active(tx, actor), result = [];
    for (const employee of await tx.employee.findMany({ where: { organizationId: actor.organizationId, state: "ACTIVE" }, include: { account: true } })) if ((!managed && employee.id === self?.id) || managed && await this.manager(tx, actor, employee.id)) result.push(employee); return result;
  }
  async setup(actor: ProjectActor) {
    return this.transaction(async tx => {
      const self = await this.active(tx, actor); const employees = actor.kind === "OWNER" ? await this.visibleEmployees(tx, actor, true) : [...await this.visibleEmployees(tx, actor, false), ...await this.visibleEmployees(tx, actor, true)];
      const branches = await tx.branch.findMany({ where: { organizationId: actor.organizationId, ...(actor.kind === "OWNER" ? {} : { id: { in: employees.map(e => e.homeBranchId) } }) } });
      const rows = await tx.workforceRecord.findMany({ where: { organizationId: actor.organizationId, OR: [{ employeeId: { in: employees.map(e => e.id) } }, { branchId: { in: branches.map(b => b.id) }, kind: "POLICY" }, ...(actor.kind === "OWNER" ? [{ kind: "SITE" }] : [])] } });
      const tasks = await tx.task.findMany({ where: { organizationId: actor.organizationId, OR: [{ primaryOwnerEmployeeId: { in: employees.map(e => e.id) } }, { collaborators: { some: { employeeId: { in: employees.map(e => e.id) } } } }], status: { notIn: ["COMPLETED", "STOPPED_DUE_TO_PROJECT_CANCELLATION"] } }, include: { collaborators: true } });
      const projects: Array<{id:string;label:string}> = []; for (const project of await tx.project.findMany({where:{organizationId:actor.organizationId,status:"ACTIVE"}})) { try { await this.projectAccess(tx,actor,project.id); projects.push({id:project.id,label:project.title}); } catch(error) { if (!(error instanceof ForbiddenException)) throw error; } }
      const scopedTasks = []; for (const task of tasks) if (await this.taskVisible(tx,actor,task.id)) {const allocations=await tx.workforceRecord.findMany({where:{organizationId:actor.organizationId,kind:"ALLOCATION",taskId:task.id}}),allocatedMinutes=allocations.reduce((sum,row)=>sum+Number(object(row.data).minutes),0); const estimatedMinutes=task.estimatedHours===null?null:Number(task.estimatedHours)*60;scopedTasks.push({id:task.id,title:task.title,employeeIds:[task.primaryOwnerEmployeeId,...task.collaborators.map(c=>c.employeeId)],estimatedMinutes,allocatedMinutes,allocationRequired:estimatedMinutes!==null&&allocatedMinutes<estimatedMinutes});}
      const sites = await tx.workforceRecord.findMany({where:{organizationId:actor.organizationId,kind:"SITE"}});
      return { owner: actor.kind === "OWNER", employeeId: self?.id ?? null, employees: employees.map(e => ({ id: e.id, label: e.account.normalizedEmail, branchId: e.homeBranchId, teamId: e.homeTeamId })), branches: branches.map(b => ({ id: b.id, label: b.name })), projects, tasks: scopedTasks, policies: rows.filter(r => r.kind === "POLICY"), schedules: rows.filter(r => ["SCHEDULE", "OVERRIDE"].includes(r.kind)), sites: sites.filter(r=>projects.some(p=>p.id===object(r.data).projectId)).map(r => { const data = Object.fromEntries(Object.entries(object(r.data)).filter(([key])=>key!=="qrHash")); return { id: r.id, ...data }; }) };
    });
  }
  async list(actor: ProjectActor, scope: "mine" | "managed", from: string, to: string) {
    return this.transaction(async tx => {
      const dates = datesBetween(from, to), employees = await this.visibleEmployees(tx, actor, scope === "managed");
      const ids = employees.map(e => e.id), rows = await tx.workforceRecord.findMany({ where: { organizationId: actor.organizationId, employeeId: { in: ids } }, orderBy: { createdAt: "desc" } });
      const snapshot:CapacitySnapshot={employees,records:await tx.workforceRecord.findMany({where:{organizationId:actor.organizationId,OR:[{employeeId:{in:ids}},{kind:{in:["POLICY","HOLIDAY"]}}]}}),memberships:await tx.employeeMembershipHistory.findMany({where:{organizationId:actor.organizationId,employeeId:{in:ids}}}),tasks:await tx.task.findMany({where:{organizationId:actor.organizationId,id:{in:rows.flatMap(r=>r.taskId?[r.taskId]:[])}}})};
      const leaves = []; for (const row of rows.filter(r => r.kind === "LEAVE")) { const history = await tx.workforceVersion.findMany({ where: { recordId: row.id }, orderBy: { version: "asc" } }); const impacts=await this.impactSuggestions(tx,actor,row.employeeId!,(row.data as unknown as LeaveData).days.map(day=>day.date),snapshot); leaves.push({ ...row, ...object(row.data), history,impacts }); }
      const workload = []; const periodGroups=new Map<string,{employeeId:string;from:string;to:string;policyId:string|null;scheduleSetupRequired:boolean;scheduledMinutes:number;leaveMinutes:number;capacityMinutes:number;allocatedMinutes:number;thresholds:{under:number;near:number;over:number}|undefined}>();
      for (const e of employees) for (const date of dates) { const { thresholds, ...row } = await this.capacity(tx, actor.organizationId, e.id, date,snapshot); const visibleTasks = []; for(const task of row.affectedTasks) if(await this.taskVisible(tx,actor,task.id)) visibleTasks.push(task); workload.push({...row,affectedTasks:visibleTasks}); const key=e.id+':'+row.policyId; const group=periodGroups.get(key)??{employeeId:e.id,from:date,to:date,policyId:row.policyId,scheduleSetupRequired:false,scheduledMinutes:0,leaveMinutes:0,capacityMinutes:0,allocatedMinutes:0,thresholds};group.to=date;group.scheduleSetupRequired ||= row.scheduleSetupRequired;group.scheduledMinutes+=row.scheduledMinutes;group.leaveMinutes+=row.leaveMinutes;group.capacityMinutes+=row.capacityMinutes;group.allocatedMinutes+=row.allocatedMinutes;periodGroups.set(key,group); }
      const workloadPeriods=[...periodGroups.values()].map(({thresholds,...group})=>({...group,availableMinutes:Math.max(0,group.capacityMinutes-group.allocatedMinutes),category:workloadCategory(group.allocatedMinutes,group.capacityMinutes,thresholds)}));
      const balances = []; for (const e of employees) for (const year of new Set(dates.map(d => Number(d.slice(0, 4))))) { try { balances.push(await this.credit(tx, actor, e.id, year, false)); } catch (error) { if (!(error instanceof ConflictException)) throw error; balances.push({ employeeId: e.id, year, setupRequired: true }); } }
      const attendance = []; for (const row of rows.filter(r => r.kind === "ATTENDANCE")) { const selfie = await tx.workforceSelfie.findUnique({ where: { attendanceId: row.id }, select: { expiresAt: true, noticeAt: true, holdReason: true, purgedAt: true,purgeRequestedAt:true,noticeDays:true } }); attendance.push({ ...row, ...object(row.data), selfie }); }
      return { schedules: rows.filter(r => ["SCHEDULE", "OVERRIDE"].includes(r.kind)), holidays: await tx.workforceRecord.findMany({ where: { organizationId: actor.organizationId, kind: "HOLIDAY", branchId: { in: employees.map(e => e.homeBranchId) } } }), allocations: rows.filter(r => r.kind === "ALLOCATION"), leaves, attendance, balances, workload,workloadPeriods };
    });
  }
  private async projectAccess(tx: Tx, actor: ProjectActor, projectId: string) {
    const self = await this.active(tx, actor), project = await tx.project.findFirst({ where: { id: projectId, organizationId: actor.organizationId, status: "ACTIVE" } }); if (!project) throw new ForbiddenException("Active assigned site project required");
    if (actor.kind !== "OWNER") { const assignment = self && await tx.projectAssignment.findFirst({ where: { projectId, employeeId: self.id, revokedAt: null } }); if (!assignment || self!.homeBranchId !== project.branchId && !assignment.crossBranchAuthorized) throw new ForbiddenException("Explicit project assignment required"); await this.authorization.assertPermission(actor.accountId, "project.view", { kind: "BRANCH", organizationId: actor.organizationId, branchId: project.branchId }, tx); } return project;
  }
  private async taskVisible(tx:Tx,actor:ProjectActor,taskId:string) {
    if(actor.kind==="OWNER") return true;
    const self=await this.active(tx,actor),task=await tx.task.findFirst({where:{id:taskId,organizationId:actor.organizationId}}); if(!task||!self) return false;
    if(task.projectId) {try {await this.projectAccess(tx,actor,task.projectId); return true;} catch(error) {if(error instanceof ForbiddenException) return false; throw error;}}
    return task.primaryOwnerEmployeeId===self.id || !!await tx.taskCollaborator.findFirst({where:{taskId,employeeId:self.id}}) || await this.manager(tx,actor,task.primaryOwnerEmployeeId);
  }
  private async impactSuggestions(tx:Tx,actor:ProjectActor,employeeId:string,dates:string[],snapshot?:CapacitySnapshot) {
    const result=[]; if(snapshot&&!snapshot.records.some(r=>r.kind==="ALLOCATION"&&r.employeeId===employeeId&&dates.includes(String(object(r.data).date)))) return []; const candidates=await this.visibleEmployees(tx,actor,true);
    for(const date of dates) for(const taskSummary of (await this.capacity(tx,actor.organizationId,employeeId,date,snapshot)).affectedTasks) {
      if(!await this.taskVisible(tx,actor,taskSummary.id)) continue;
      const task=await tx.task.findUniqueOrThrow({where:{id:taskSummary.id}}), allocation=await tx.workforceRecord.findMany({where:{kind:"ALLOCATION",taskId:task.id,employeeId}});
      const minutes=allocation.filter(r=>object(r.data).date===date).reduce((total,r)=>total+Number(object(r.data).minutes),0),suggestions=[];
      for(const candidate of candidates) {if(candidate.id===employeeId) continue;if(task.projectId) {const project=await tx.project.findUniqueOrThrow({where:{id:task.projectId}}),assignment=await tx.projectAssignment.findFirst({where:{projectId:project.id,employeeId:candidate.id,revokedAt:null}});if(!assignment||candidate.homeBranchId!==project.branchId&&!assignment.crossBranchAuthorized) continue;}
        const capacity=await this.capacity(tx,actor.organizationId,candidate.id,date,snapshot?.employees.some(e=>e.id===candidate.id)?snapshot:undefined);if(capacity.availableMinutes<minutes) continue;
        suggestions.push({employeeId:candidate.id,label:candidate.account.normalizedEmail,availableMinutes:capacity.availableMinutes,reason:"Currently eligible scoped employee with available scheduled capacity; manager must explicitly assign"});
      }
      result.push({taskId:task.id,title:task.title,date,critical:task.priority==="CRITICAL",minutes,suggestions});
    } return result;
  }
  /** SITE public boundary: project-bound attendance status, excluding personal leave, location and evidence. */
  async siteAttendance(tx: Tx, actor: ProjectActor, projectId: string, date: string) {
    const project = await this.projectAccess(tx, actor, projectId);
    if (actor.kind !== "OWNER") await this.authorization.assertPermission(actor.accountId, "site.view", { kind: "BRANCH", organizationId: actor.organizationId, branchId: project.branchId }, tx);
    const sites = await tx.workforceRecord.findMany({ where: { organizationId: actor.organizationId, kind: "SITE", branchId: project.branchId } });
    const siteIds = new Set(sites.filter(row => object(row.data).projectId === projectId).map(row => row.id));
    const assigned = await tx.projectAssignment.findMany({ where: { organizationId: actor.organizationId, projectId, revokedAt: null } });
    const people = await tx.employee.findMany({ where: { organizationId: actor.organizationId, state: "ACTIVE", id: { in: assigned.map(row => row.employeeId) }, account: { state: "ACTIVE" } }, include: { account: true } });
    const eligible = people.filter(person => person.homeBranchId === project.branchId || assigned.some(row => row.employeeId === person.id && row.crossBranchAuthorized));
    const rows = await tx.workforceRecord.findMany({ where: { organizationId: actor.organizationId, kind: "ATTENDANCE", employeeId: { in: eligible.map(person => person.id) } } });
    const attendance = [];
    for (const row of rows) {
      const data = object(row.data), person = eligible.find(person => person.id === row.employeeId)!;
      // Office attendance does not prove presence at this project. Only its configured site counts.
      if (data.date !== date || data.mode !== "SITE" || !siteIds.has(String(data.siteId))) continue;
      try { await this.authorization.assertPermission(person.accountId, "site.view", { kind: "BRANCH", organizationId: actor.organizationId, branchId: project.branchId }, tx); await this.authorization.assertPermission(person.accountId, "project.view", { kind: "BRANCH", organizationId: actor.organizationId, branchId: project.branchId }, tx); }
      catch (error) { if (error instanceof ForbiddenException) continue; throw error; }
      attendance.push({ accountId: person.accountId, label: person.account.normalizedEmail, state: row.state, mode: "SITE" as const, provisional: data.provisional === true });
    }
    await this.active(tx, actor); return { attendance, count: attendance.length };
  }
  /** INT map boundary: configured site coordinates only, after current project authorization. */
  async integrationLocations(actor: ProjectActor, tx: Tx) {
    await this.active(tx,actor); const result=[];
    for(const row of await tx.workforceRecord.findMany({where:{organizationId:actor.organizationId,kind:"SITE",state:"ACTIVE"}})){
      const data=object(row.data);try{await this.projectAccess(tx,actor,String(data.projectId));}catch(error){if(error instanceof ForbiddenException)continue;throw error;}
      const latitude=Number(data.latitude),longitude=Number(data.longitude);if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)continue;
      result.push({id:row.id,projectId:String(data.projectId),label:String(data.label),latitude,longitude,mapUrl:`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}`});
    }return result;
  }
  async site(actor: ProjectActor, input: Command & { projectId: string; label: string; latitude: number; longitude: number; radiusMetres: number; qrCode: string }) {
    return this.command(actor, input, "site", { ...input, qrCode: hash(input.qrCode) }, async tx => { await this.owner(tx, actor); const project = await this.projectAccess(tx, actor, input.projectId); const data = { projectId: project.id, label: input.label, latitude: input.latitude, longitude: input.longitude, radiusMetres: input.radiusMetres, qrHash: hash(input.qrCode) }; const result = await this.append(tx, actor, "SITE", data, input.reason, { branchId: project.branchId }); return { id: result.row.id, label: input.label, projectId: project.id }; });
  }
  private async storage() { if (!this.config?.nasRoot) throw new ConflictException("Private attendance storage is unavailable"); const storage = new NasStorage(this.config.nasRoot); await storage.initialize(); return storage; }
  async checkIn(actor: ProjectActor, input: Command & { mode: "OFFICE" | "SITE"; siteId?: string | undefined; latitude?: number | undefined; longitude?: number | undefined; qrCode?: string | undefined; selfie?: { mime: "image/jpeg" | "image/png"; base64: string } | undefined; provisionalReason?: string | undefined }) {
    return this.command(actor, input, "check-in", { ...input, selfie: input.selfie ? hash(input.selfie.base64) : null, qrCode: input.qrCode ? hash(input.qrCode) : null }, async tx => {
      const employee = await this.active(tx, actor); if (!employee) throw new ForbiddenException("Employee attendance required"); await this.serial(tx, actor, employee.id);
      if (await tx.workforceRecord.findFirst({ where: { employeeId: employee.id, kind: "ATTENDANCE", state: "OPEN" } })) throw new ConflictException("Attendance is already open");
      const now = new Date(); let date = await this.today(tx, actor.organizationId); let provisional = false, selfie: { key: string; sha256: string; size: number } | undefined;
      if (input.mode === "SITE") {
        const site = input.siteId && await tx.workforceRecord.findFirst({ where: { id: input.siteId, organizationId: actor.organizationId, kind: "SITE" } }); if (!site) throw new BadRequestException("Configured site is required");
        const data = object(site.data); await this.projectAccess(tx, actor, String(data.projectId));
        const coordinates = input.latitude !== undefined && input.longitude !== undefined && Number.isFinite(input.latitude) && Number.isFinite(input.longitude) && Math.abs(input.latitude) <= 90 && Math.abs(input.longitude) <= 180;
        const normal = coordinates && input.qrCode && hash(input.qrCode) === data.qrHash && input.selfie && distanceMetres({ latitude: input.latitude!, longitude: input.longitude! }, { latitude: Number(data.latitude), longitude: Number(data.longitude) }) <= Number(data.radiusMetres);
        if (!normal) { if (!input.provisionalReason || input.provisionalReason.trim().length < 3) throw new BadRequestException("Site evidence is incomplete or invalid; a provisional reason and manager review are required"); provisional = true; }
        if (input.selfie) { const policy=await this.policy(tx,actor.organizationId,employee.homeBranchId,date);if(!policy||(policy.data as unknown as Policy).selfieNoticeDays===undefined)throw new ConflictException("Owner must configure selfie advance-notice interval before capturing retained site evidence");const bytes = Buffer.from(input.selfie.base64, "base64"); if (!bytes.length || bytes.length > 4 * 1024 * 1024) throw new BadRequestException("Selfie input is invalid"); let clean: Buffer;
          try { const picture = sharp(bytes, { limitInputPixels: 16000000, failOn: "warning" }); const meta = await picture.metadata(); if (meta.pages && meta.pages !== 1 || !["jpeg", "png"].includes(meta.format ?? "")) throw new Error("Invalid selfie"); clean = await picture.rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer(); } catch { throw new BadRequestException("Selfie must be a valid bounded JPEG or PNG"); }
          const store = await this.storage(), uploadId = randomUUID(), checksum = hashBytes(clean); await store.writeChunk(uploadId, 0, clean, checksum); selfie = await store.finalize(uploadId, 1, clean.length, checksum);
        }
      } else if (input.siteId || input.latitude !== undefined || input.longitude !== undefined || input.qrCode || input.selfie) throw new BadRequestException("Office attendance does not collect site evidence");
      const timezone = (await tx.organization.findUniqueOrThrow({ where: { id: actor.organizationId } })).timezone;
      let schedule = await this.schedule(tx, actor.organizationId, employee.id, date); const localTime = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now).split(":").map(Number); const minute = localTime[0]! * 60 + localTime[1]!;
      const previousDate = new Date(dateValue(date).getTime()-86400000).toISOString().slice(0,10), previousSchedule = await this.schedule(tx, actor.organizationId, employee.id, previousDate);
      if (previousSchedule && previousSchedule.endMinute<previousSchedule.startMinute && minute<previousSchedule.endMinute && previousSchedule.workingDays.includes(dateValue(previousDate).getUTCDay())) { date=previousDate; schedule=previousSchedule; }
      const start = schedule ? scheduledInstant(date,schedule.startMinute,timezone) : null;
      const endDate = schedule && schedule.endMinute<schedule.startMinute ? new Date(dateValue(date).getTime()+86400000).toISOString().slice(0,10) : date;
      const end = schedule ? scheduledInstant(endDate,schedule.endMinute,timezone) : null;
      const wfh=(await this.capacity(tx,actor.organizationId,employee.id,date)).wfhMinutes;
      const result = await this.append(tx, actor, "ATTENDANCE", { date, mode: input.mode,workLocation:input.mode==="SITE"?"SITE":wfh>0?"REMOTE":"OFFICE",wfhMinutes:wfh, siteId: input.siteId ?? null, checkedInAt: now.toISOString(), checkedOutAt: null, scheduledStartAt: start?.toISOString() ?? null, scheduledEndAt: end?.toISOString() ?? null, workingMinutes: null, late: start ? now>start : null, early: null, missingPunch: true, provisional, provisionalReason: input.provisionalReason ?? null, reviewState: provisional ? "PENDING" : "NOT_REQUIRED", schedule: schedule ?? null }, input.reason, { employeeId: employee.id }, "OPEN");
      if (selfie) await tx.workforceSelfie.create({ data: { organizationId: actor.organizationId, attendanceId: result.row.id, storageKey: selfie.key, checksum: selfie.sha256, mime: "image/jpeg", capturedAt: now, expiresAt: new Date(now.getTime() + 90 * 86400000) } }); return { ...result.row, ...object(result.row.data) };
    });
  }
  async checkOut(actor: ProjectActor, id: string, input: Command) {
    return this.command(actor, input, "check-out", { id, ...input }, async tx => { const row = await this.record(tx, actor, id, "ATTENDANCE", input.expectedVersion), self = await this.active(tx, actor); if (row.employeeId !== self?.id) throw new ForbiddenException("Own attendance punch required"); if (row.state !== "OPEN") throw new ConflictException("Attendance is closed"); const data = object(row.data), now = new Date(), startedAt = new Date(String(data.checkedInAt)); const schedule = data.schedule as WorkScheduleData | null;
      const elapsed = (now.getTime() - startedAt.getTime()) / 60000; if (elapsed < 0) throw new ConflictException("Attendance clock is invalid");
      return (await this.append(tx, actor, "ATTENDANCE", { ...data, checkedOutAt: now.toISOString(), workingMinutes: Math.max(0, elapsed - (schedule?.breakMinutes ?? 0)), early: data.scheduledEndAt ? now<new Date(String(data.scheduledEndAt)) : null, missingPunch: false }, input.reason, { employeeId: row.employeeId! }, "CLOSED", row)).row;
    });
  }
  async attendanceReview(actor: ProjectActor, id: string, input: Command & { outcome: "APPROVED" | "REJECTED" }) {
    return this.command(actor, input, "attendance-review", { id, ...input }, async tx => { const row = await this.record(tx, actor, id, "ATTENDANCE", input.expectedVersion); await this.subject(tx, actor, row.employeeId!, true); const data = object(row.data); if (!data.provisional || data.reviewState !== "PENDING") throw new ConflictException("Attendance has no provisional review"); return (await this.append(tx, actor, "ATTENDANCE", { ...data, reviewState: input.outcome, reviewerId: actor.accountId, reviewReason: input.reason }, input.reason, { employeeId: row.employeeId! }, row.state, row)).row; });
  }
  async selfie(actor: ProjectActor, id: string) {
    return this.transaction(async tx => { await this.record(tx, actor, id, "ATTENDANCE"); const row = await tx.workforceSelfie.findUnique({ where: { attendanceId: id } }); if (!row || row.purgedAt || row.expiresAt <= new Date() && !row.holdReason) throw new NotFoundException("Selfie unavailable or expired"); const storage = await this.storage(), opened = await storage.openBlob(row.storageKey); const chunks = []; for await (const chunk of opened.stream) chunks.push(Buffer.from(chunk)); const bytes = Buffer.concat(chunks); if (hashBytes(bytes) !== row.checksum) throw new ConflictException("Selfie integrity check failed"); return { bytes, mime: row.mime }; });
  }
  async selfieRetention(actor: ProjectActor, id: string, input: Command & { action: "notice" | "hold" | "release" | "purge"; noticeDays?: number | undefined }) {
    const result = await this.command(actor, input, "selfie-retention", { id, ...input }, async tx => {
      await this.owner(tx, actor); const attendance = await this.record(tx, actor, id, "ATTENDANCE", input.expectedVersion);
      await tx.$queryRaw`SELECT id FROM workforce_selfies WHERE "attendanceId"=${id}::uuid FOR UPDATE`;
      const selfie = await tx.workforceSelfie.findUnique({ where: { attendanceId: id } }); if (!selfie || selfie.purgedAt) throw new ConflictException("Retained selfie unavailable");
      const now = new Date(), before = object(attendance.data), previous = before.selfieRetention as { noticeDays?: number } | undefined;
      if (input.action === "notice" && (!input.noticeDays || !Number.isInteger(input.noticeDays) || input.noticeDays < 1 || input.noticeDays > 3650)) throw new BadRequestException("Owner must select an advance-notice interval");
      if (input.action === "purge") { if (selfie.expiresAt > now || !selfie.noticeAt || !selfie.noticeDays || now.getTime() - selfie.noticeAt.getTime() < selfie.noticeDays * 86400000 || selfie.holdReason) throw new ConflictException("Purge requires expiry, elapsed Owner-set notice and no hold"); }
      if(selfie.purgeRequestedAt&&input.action!=="purge") throw new ConflictException("Durable purge is pending; reconcile completion before changing retention");
      await tx.workforceSelfie.update({ where: { id: selfie.id }, data: input.action === "notice" ? { noticeAt: selfie.noticeAt ?? now,noticeDays:selfie.noticeDays??input.noticeDays! } : input.action === "hold" ? { holdReason: input.reason } : input.action === "release" ? { holdReason: null } : { purgeRequestedAt: selfie.purgeRequestedAt??now } });
      const result = await this.append(tx, actor, "ATTENDANCE", { ...before, selfieRetention: { ...previous, action: input.action==="purge"?"purge_requested":input.action, ...(input.action === "notice" ? { noticeDays: input.noticeDays } : {}), occurredAt: now.toISOString(), reason: input.reason, checksum: selfie.checksum } }, input.reason, { employeeId: attendance.employeeId! }, attendance.state, attendance);
      if (input.action === "notice") await this.notifications.createForEvent(tx, { eventId: result.eventId, recipientAccountId: actor.accountId, channel: "IN_APP", category: "workforce.retention", title: "Site selfie scheduled for controlled expiry", body: "Review contract/dispute holds and backup-expiry evidence before scheduled purge.", internalRoute: "/workforce", mandatory: true }); return result.row;
    });
    if(input.action==="purge") return this.completePurge(actor,id);
    return result;
  }
  private async completePurge(actor:ProjectActor,id:string) {
    const pending=await this.transaction(async tx=>{await this.owner(tx,actor); const row=await tx.workforceSelfie.findUniqueOrThrow({where:{attendanceId:id}});if(!row.purgeRequestedAt||row.holdReason) throw new ConflictException("Durable purge intent unavailable");return row;});
    await (await this.storage()).purgeBlob(pending.storageKey,pending.checksum);
    return this.transaction(async tx=>{await this.owner(tx,actor);const attendance=await this.record(tx,actor,id,"ATTENDANCE");const selfie=await tx.workforceSelfie.findUniqueOrThrow({where:{attendanceId:id}});if(selfie.purgedAt)return attendance;await tx.workforceSelfie.update({where:{id:selfie.id},data:{purgedAt:new Date()}});return (await this.append(tx,actor,"ATTENDANCE",{...object(attendance.data),selfieRetention:{...object(attendance.data).selfieRetention as object,action:"purge_completed",occurredAt:new Date().toISOString(),checksum:selfie.checksum}},"Private selfie bytes deleted after durable intent; checksum deletion proof retained",{employeeId:attendance.employeeId!},attendance.state,attendance)).row;});
  }
  async reconcilePurges(actor:ProjectActor) {await this.transaction(tx=>this.owner(tx,actor));const rows=await this.database.prisma.workforceSelfie.findMany({where:{organizationId:actor.organizationId,purgeRequestedAt:{not:null},purgedAt:null}});for(const row of rows) await this.completePurge(actor,row.attendanceId);return {completed:rows.length};}
  /** This application has a database-enforced Organization singleton, not tenant selection. */
  async scheduleSelfieNotices() {
    const organizations=await this.database.prisma.organization.findMany({where:{singletonKey:1}}),owners=await this.database.prisma.account.findMany({where:{kind:"OWNER",state:"ACTIVE"}});
    if(organizations.length!==1||owners.length!==1)throw new ConflictException("Retention worker requires exactly one configured organization and active Owner");
    const organization=organizations[0]!,owner=owners[0]!,actor={accountId:owner.id,organizationId:organization.id,kind:AccountKind.OWNER};let count=0;
    await this.transaction(tx=>this.owner(tx,actor));
    for(const selfie of await this.database.prisma.workforceSelfie.findMany({where:{organizationId:organization.id,noticeAt:null,purgedAt:null}})) {
      const interval=await this.transaction(async tx=>{await this.owner(tx,actor);const attendance=await tx.workforceRecord.findFirstOrThrow({where:{id:selfie.attendanceId,organizationId:organization.id,kind:"ATTENDANCE"}}),employee=await tx.employee.findFirstOrThrow({where:{id:attendance.employeeId!,organizationId:organization.id}}),policy=await this.policy(tx,organization.id,employee.homeBranchId,await this.today(tx,organization.id));return policy?(policy.data as unknown as Policy).selfieNoticeDays:undefined;});
      if(!interval||selfie.expiresAt.getTime()>Date.now()+interval*86400000)continue;
      const attendance=await this.database.prisma.workforceRecord.findFirstOrThrow({where:{id:selfie.attendanceId,organizationId:organization.id}});
      await this.selfieRetention(actor,attendance.id,{commandId:randomUUID(),expectedVersion:attendance.version,reason:"Scheduled advance Owner notice for ninety-day site selfie expiry",action:"notice",noticeDays:interval});count++;
    } return {notices:count};
  }
  async purgeExpiredSelfies() {
    const organizations=await this.database.prisma.organization.findMany({where:{singletonKey:1}}),owners=await this.database.prisma.account.findMany({where:{kind:"OWNER",state:"ACTIVE"}});
    if(organizations.length!==1||owners.length!==1)throw new ConflictException("Retention worker requires one configured organization and active Owner");
    const actor={accountId:owners[0]!.id,organizationId:organizations[0]!.id,kind:AccountKind.OWNER};await this.transaction(tx=>this.owner(tx,actor));let purged=0;
    await this.reconcilePurges(actor);
    const now=new Date();
    for(const selfie of await this.database.prisma.workforceSelfie.findMany({where:{organizationId:actor.organizationId,purgedAt:null,purgeRequestedAt:null,holdReason:null,expiresAt:{lte:now},noticeAt:{not:null}}})) {
      if(!selfie.noticeAt||!selfie.noticeDays||now.getTime()-selfie.noticeAt.getTime()<selfie.noticeDays*86400000)continue;
      const attendance=await this.database.prisma.workforceRecord.findFirstOrThrow({where:{id:selfie.attendanceId,organizationId:actor.organizationId}});
      await this.selfieRetention(actor,attendance.id,{commandId:randomUUID(),expectedVersion:attendance.version,reason:"Scheduled ninety-day expiry after advance Owner notice; no documented hold",action:"purge"});purged++;
    }return {purged};
  }
  async syncEntitlements(actor:ProjectActor,year?:number) {
    return this.transaction(async tx=>{await this.owner(tx,actor);const effectiveYear=year??Number((await this.today(tx,actor.organizationId)).slice(0,4));if(!Number.isInteger(effectiveYear)||effectiveYear<1900||effectiveYear>9999)throw new BadRequestException("Invalid entitlement year");const balances=[];
      for(const employee of await tx.employee.findMany({where:{organizationId:actor.organizationId,state:"ACTIVE"}})) {try {balances.push(await this.credit(tx,actor,employee.id,effectiveYear));}catch(error){if(!(error instanceof ConflictException))throw error;balances.push({employeeId:employee.id,year:effectiveYear,setupRequired:true});}}
      return {balances};
    });
  }
  async runScheduledEntitlements() {
    const organizations=await this.database.prisma.organization.findMany({where:{singletonKey:1}}),owners=await this.database.prisma.account.findMany({where:{kind:"OWNER",state:"ACTIVE"}});if(organizations.length!==1||owners.length!==1)throw new ConflictException("Entitlement worker requires one configured organization and active Owner");
    return this.syncEntitlements({accountId:owners[0]!.id,organizationId:organizations[0]!.id,kind:AccountKind.OWNER});
  }
}
function hashBytes(bytes: Buffer) { return createHash("sha256").update(bytes).digest("hex"); }

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountKind, AccountState, EmployeeState, Prisma, TaskStatus, TaskType } from "./generated/prisma/client.js";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import type { ProjectActor } from "./project.service.js";
import { recordProjectEvent } from "./project-events.js";
import { sanitizeTrainingAssessmentContent, validateTrainingAssessmentContent } from "./training-content.js";
import { TaskService } from "./task.service.js";

type Tx = Prisma.TransactionClient;
type Actor = ProjectActor & { sessionId?: string };
type AssignmentState = "ASSIGNED" | "SUBMITTED" | "CHANGES_REQUIRED" | "COMPLETED";
const validReason = (s: string) => typeof s === "string" && s.trim().length >= 3 && s.length <= 1000;
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const safeText = (s: unknown, max: number) => typeof s === "string" && s.trim().length >= 3 && s.length <= max && !Array.from(s).some((character) => { const code = character.charCodeAt(0); return code <= 8 || code === 11 || code === 12 || code >= 14 && code <= 31 || code === 127; }) && !/<\s*\/?\s*[a-z!][^>]*>/i.test(s);

@Injectable()
export class TrainingService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService, private readonly tasks: TaskService) {}
  private get db() { return this.database.prisma; }
  private async transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    try { return await this.db.$transaction(fn, { timeout: 30000 }); }
    catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(e.code)) throw new ConflictException("Training data changed. Refresh and retry"); throw e; }
  }
  private async active(tx: Tx, actor: Actor) {
    if (!actor.sessionId) throw new ForbiddenException("Current session required");
    await tx.$queryRaw`SELECT id FROM accounts WHERE id=${actor.accountId}::uuid FOR SHARE`;
    const account = await tx.account.findUnique({ where: { id: actor.accountId }, include: { employee: true } });
    const session = await tx.session.findUnique({ where: { id: actor.sessionId } }), now = new Date();
    const org = await tx.organization.findFirst({ select: { id: true } });
    if (!account || account.state !== AccountState.ACTIVE || account.kind !== actor.kind || (account.kind !== AccountKind.OWNER && account.kind !== AccountKind.STAFF) || !session || session.accountId !== actor.accountId || session.revokedAt || session.expiresAt <= now || session.lastUsedAt.getTime() + 1800000 <= now.getTime() || org?.id !== actor.organizationId || actor.kind === AccountKind.STAFF && (!account.employee || account.employee.state !== EmployeeState.ACTIVE || account.employee.organizationId !== actor.organizationId)) throw new ForbiddenException("Current active session required");
    return account.employee;
  }
  private async employee(tx: Tx, id: string, org: string) {
    const row = await tx.employee.findFirst({ where: { id, organizationId: org, state: EmployeeState.ACTIVE, homeTeam: { active: true }, homeBranch: { active: true }, account: { state: AccountState.ACTIVE } }, include: { account: { select: { id: true, normalizedEmail: true } } } });
    if (!row) throw new NotFoundException("Active employee unavailable"); return row;
  }
  private async permission(tx: Tx, accountId: string, org: string, branchId: string, teamId: string, key: string) {
    try { await this.authorization.assertPermission(accountId, key, { kind: "TEAM", organizationId: org, branchId, teamId }, tx); return true; }
    catch (e) { if (e instanceof ForbiddenException) return false; throw e; }
  }
  private async manages(tx: Tx, accountId: string, kind: AccountKind, org: string, employeeId: string, requireManage = true) {
    if (kind === AccountKind.OWNER) return true;
    const self = await tx.employee.findFirst({ where: { accountId, organizationId: org, state: EmployeeState.ACTIVE }, select: { id: true, homeBranchId: true, homeTeamId: true } });
    const target = await tx.employee.findFirst({ where: { id: employeeId, organizationId: org, state: EmployeeState.ACTIVE }, select: { id: true, homeBranchId: true, homeTeamId: true, reportsToId: true } });
    if (!self || !target || self.id === target.id || self.homeBranchId !== target.homeBranchId || self.homeTeamId !== target.homeTeamId) return false;
    const people = await tx.employee.findMany({ where: { organizationId: org, homeBranchId: target.homeBranchId, homeTeamId: target.homeTeamId, state: EmployeeState.ACTIVE }, select: { id: true, reportsToId: true } });
    const parents = new Map(people.map((p) => [p.id, p.reportsToId])); let p = target.reportsToId; const seen = new Set<string>(); let report = false;
    while (p && !seen.has(p)) { if (p === self.id) { report = true; break; } seen.add(p); p = parents.get(p) ?? null; }
    return report && await this.permission(tx, accountId, org, target.homeBranchId, target.homeTeamId, "training.view") && (!requireManage || await this.permission(tx, accountId, org, target.homeBranchId, target.homeTeamId, "training.manage"));
  }
  private async libraryReadable(tx: Tx, accountId: string, kind: AccountKind, org: string, record: { audience: string; branchId: string | null; teamId: string | null }) {
    if (kind === AccountKind.OWNER) return true;
    if (record.audience === "ORGANIZATION") {
      try { await this.authorization.assertPermission(accountId, "library.view", { kind: "ORGANIZATION", organizationId: org }, tx); return true; }
      catch (e) { if (e instanceof ForbiddenException) return false; throw e; }
    }
    if (!record.branchId || record.audience !== "BRANCH" && (record.audience !== "TEAM" || !record.teamId)) return false;
    const employee = await tx.employee.findFirst({ where: { accountId, organizationId: org, state: EmployeeState.ACTIVE }, select: { homeBranchId: true, homeTeamId: true } });
    if (!employee || employee.homeBranchId !== record.branchId || record.audience === "TEAM" && employee.homeTeamId !== record.teamId) return false;
    try { await this.authorization.assertPermission(accountId, "library.view", record.audience === "BRANCH" ? { kind: "BRANCH", organizationId: org, branchId: record.branchId } : { kind: "TEAM", organizationId: org, branchId: record.branchId, teamId: record.teamId! }, tx); return true; }
    catch (e) { if (e instanceof ForbiddenException) return false; throw e; }
  }
  private async module(tx: Tx, org: string, versionId: string, employeeId: string, actor: Actor, requireCurrent = false) {
    const version = await tx.libraryVersion.findFirst({ where: { id: versionId, organizationId: org } });
    const record = version ? await tx.libraryRecord.findFirst({ where: { id: version.recordId, organizationId: org } }) : null;
    if (!version || !record || record.kind !== "MODULE" || requireCurrent && record.publishedVersionId !== version.id || !await tx.libraryPublication.findFirst({ where: { organizationId: org, recordId: version.recordId, versionId: version.id } })) throw new NotFoundException("Active MODULE version unavailable");
    const trainee = await this.employee(tx, employeeId, org);
    if (!await this.libraryReadable(tx, trainee.accountId, AccountKind.STAFF, org, record)) throw new ForbiddenException("MODULE is not currently accessible to trainee");
    if (actor.kind !== AccountKind.OWNER) {
      const manager = await tx.employee.findFirst({ where: { accountId: actor.accountId, organizationId: org, state: EmployeeState.ACTIVE }, select: { homeBranchId: true, homeTeamId: true } });
      if (!manager || !await this.libraryReadable(tx, actor.accountId, actor.kind, org, record)) throw new ForbiddenException("MODULE is not currently accessible to manager");
      if (record.audience === "TEAM" && (manager.homeBranchId !== record.branchId || manager.homeTeamId !== record.teamId)) throw new ForbiddenException("MODULE is outside manager scope");
    }
    const assessment = validateTrainingAssessmentContent(version.content);
    if (!assessment) throw new ConflictException("MODULE has no authored training assessment");
    const root = version.content as Record<string, unknown>, blocks = Array.isArray(root.blocks) ? root.blocks as Array<Record<string, unknown>> : [];
    const fileIds = [...new Set(blocks.flatMap((b) => typeof b.fileId === "string" ? [b.fileId] : []))];
    if (fileIds.length && await tx.libraryFile.count({ where: { id: { in: fileIds }, recordId: version.recordId, organizationId: org } }) !== fileIds.length) throw new ConflictException("MODULE file evidence is unavailable");
    const sopReferences: Array<{ versionId: string; version: number; title: string; content: Record<string, unknown> }> = [];
    for (const block of blocks) if (block.type === "SOP" && typeof block.versionId === "string") {
      const sop = await tx.libraryVersion.findFirst({ where: { id: block.versionId, organizationId: org } });
      const sopRecord = sop ? await tx.libraryRecord.findFirst({ where: { id: sop.recordId, organizationId: org } }) : null;
      if (!sop || !sopRecord || sopRecord.kind !== "SOP" || !await tx.libraryPublication.findFirst({ where: { organizationId: org, recordId: sop.recordId, versionId: sop.id } }) || !await this.libraryReadable(tx, trainee.accountId, AccountKind.STAFF, org, sopRecord) || actor.kind !== AccountKind.OWNER && !await this.libraryReadable(tx, actor.accountId, actor.kind, org, sopRecord)) throw new ForbiddenException("An exact referenced SOP is not accessible to both trainee and manager");
      const sopContent = sop.content as Record<string, unknown>, sopBlocks = Array.isArray(sopContent.blocks) ? sopContent.blocks as Array<Record<string, unknown>> : [];
      const sopFileIds = [...new Set(sopBlocks.flatMap((item) => typeof item.fileId === "string" ? [item.fileId] : []))];
      if (sopFileIds.length && await tx.libraryFile.count({ where: { id: { in: sopFileIds }, recordId: sop.recordId, organizationId: org } }) !== sopFileIds.length) throw new ConflictException("Referenced SOP file evidence is unavailable");
      sopReferences.push({ versionId: sop.id, version: sop.version, title: sopRecord.title, content: sopContent });
    }
    return { version, assessment, content: root, trainee, sopReferences };
  }
  private async managerAuthority(tx: Tx, actor: Actor, targetId: string) {
    await this.active(tx, actor); const target = await this.employee(tx, targetId, actor.organizationId);
    if (actor.kind === AccountKind.OWNER) return target;
    if (!await this.manages(tx, actor.accountId, actor.kind, actor.organizationId, targetId, true)) throw new ForbiddenException("Current training management scope required");
    return target;
  }
  private async receipt<T>(actor: Actor, commandId: string, op: string, payload: unknown, authorize: (tx: Tx) => Promise<void>, fn: (tx: Tx) => Promise<T>): Promise<T> {
    if (!/^[0-9a-f-]{36}$/i.test(commandId)) throw new BadRequestException("Invalid command ID");
    return this.transaction(async (tx) => {
      await this.active(tx, actor);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":training:" + actor.accountId + ":" + commandId},0))`;
      await this.active(tx, actor); await authorize(tx);
      const prior = await tx.learningReceipt.findUnique({ where: { actorId_commandId: { actorId: actor.accountId, commandId } } }), payloadHash = hash({ op, payload });
      if (prior) { if (prior.payloadHash !== payloadHash) throw new ConflictException("Command ID was used with different values"); await this.active(tx, actor); await authorize(tx); return prior.result as T; }
      const result = await fn(tx); await this.active(tx, actor);
      await tx.learningReceipt.create({ data: { organizationId: actor.organizationId, actorId: actor.accountId, commandId, payloadHash, result: json(result) } }); return result;
    });
  }
  private async writeChange(tx: Tx, actorId: string, assignment: { id: string; organizationId: string }, version: number, state: AssignmentState, data: Record<string, unknown>, reason: string) {
    const eventId = await recordProjectEvent(tx, { organizationId: assignment.organizationId, actorId, eventName: "training.changed", subjectType: "training_assignment", subjectId: assignment.id, reason, after: { version, state, data } });
    await tx.trainingAssignmentChange.create({ data: { organizationId: assignment.organizationId, assignmentId: assignment.id, version, state, data: json(data), actorId, reason, eventId } });
  }
  private async writeAttempt(tx: Tx, actorId: string, assignment: { id: string; organizationId: string }, kind: "SUBMISSION" | "ASSESSMENT" | "EFFECTIVENESS", sequence: number, payload: Record<string, unknown>, reason: string) {
    const attemptId = randomUUID(), eventId = await recordProjectEvent(tx, { organizationId: assignment.organizationId, actorId, eventName: "training.attempt_recorded", subjectType: "training_assignment", subjectId: assignment.id, reason, after: { attemptId, kind, sequence, payload } });
    await tx.trainingAttempt.create({ data: { id: attemptId, organizationId: assignment.organizationId, assignmentId: assignment.id, kind, sequence, payload: json(payload), actorId, reason, eventId } });
    return { id: attemptId, kind, sequence, payload, occurredAt: new Date() };
  }
  async setup(actor: Actor) {
    return this.transaction(async (tx) => {
      const self = await this.active(tx, actor), own = self?.id;
      const employees = [];
      const manageableEmployeeIds: string[] = [];
      for (const e of await tx.employee.findMany({ where: { organizationId: actor.organizationId, state: EmployeeState.ACTIVE }, orderBy: [{ employeeCode: "asc" }, { id: "asc" }], select: { id: true, accountId: true, employeeCode: true, homeBranchId: true, homeTeamId: true } })) {
        const manage = actor.kind === AccountKind.OWNER || await this.manages(tx, actor.accountId, actor.kind, actor.organizationId, e.id, true);
        if (manage) manageableEmployeeIds.push(e.id);
        if (manage || own === e.id || await this.manages(tx, actor.accountId, actor.kind, actor.organizationId, e.id, false)) employees.push(e);
      }
      const rows = await tx.libraryRecord.findMany({ where: { organizationId: actor.organizationId, kind: "MODULE", publishedVersionId: { not: null } }, orderBy: [{ title: "asc" }, { id: "asc" }] });
      const modules = [];
      for (const row of rows) if (row.publishedVersionId && await this.libraryReadable(tx, actor.accountId, actor.kind, actor.organizationId, row)) {
        const publishedVersion = await tx.libraryVersion.findFirst({ where: { id: row.publishedVersionId, organizationId: actor.organizationId, recordId: row.id } });
        try { const a = publishedVersion && validateTrainingAssessmentContent(publishedVersion.content); if (a && publishedVersion) modules.push({ id: row.id, versionId: publishedVersion.id, version: publishedVersion.version, title: row.title, category: row.category, assessment: { criteria: a.criteria, practicalRequired: a.practicalRequired, questionCount: a.quiz?.length ?? 0 } }); } catch { /* corrupt content is omitted */ }
      }
      const approvers = [];
      for (const target of employees) {
        const choices = [];
        for (const account of await tx.account.findMany({ where: { state: AccountState.ACTIVE, OR: [{ kind: AccountKind.OWNER }, { kind: AccountKind.STAFF, employee: { organizationId: actor.organizationId, state: EmployeeState.ACTIVE } }] }, include: { employee: { select: { employeeCode: true } } }, orderBy: [{ normalizedEmail: "asc" }] })) {
          if (account.id !== target.accountId && (account.kind === AccountKind.OWNER || await this.manages(tx, account.id, account.kind, actor.organizationId, target.id, true))) choices.push({ accountId: account.id, label: account.employee?.employeeCode ?? account.normalizedEmail });
        }
        approvers.push({ employeeId: target.id, reviewers: choices });
      }
      const modulesByEmployee = [];
      for (const target of employees) {
        const eligible = [];
        if (actor.kind === AccountKind.OWNER || target.id === own || await this.manages(tx, actor.accountId, actor.kind, actor.organizationId, target.id, true)) {
          for (const record of rows) if (record.publishedVersionId) {
            try {
              const version = await tx.libraryVersion.findFirst({ where: { id: record.publishedVersionId, recordId: record.id, organizationId: actor.organizationId } });
              if (!version) continue;
              const module = await this.module(tx, actor.organizationId, version.id, target.id, actor, true);
              eligible.push({ id: record.id, versionId: version.id, version: version.version, title: record.title, category: record.category, assessment: { criteria: module.assessment.criteria, practicalRequired: module.assessment.practicalRequired, questionCount: module.assessment.quiz?.length ?? 0 } });
            } catch (e) { if (!(e instanceof ForbiddenException || e instanceof NotFoundException || e instanceof ConflictException || e instanceof BadRequestException)) throw e; }
          }
        }
        modulesByEmployee.push({ employeeId: target.id, modules: eligible });
      }
      const practicalTasks = [];
      for (const target of employees) for (const task of await tx.task.findMany({ where: { organizationId: actor.organizationId, type: TaskType.TRAINING_PRACTICAL, primaryOwnerEmployeeId: target.id, status: { not: TaskStatus.STOPPED_DUE_TO_PROJECT_CANCELLATION } }, orderBy: [{ title: "asc" }, { id: "asc" }], select: { id: true, title: true, targetDate: true, status: true } })) {
        try { await this.tasks.assertTrainingPracticalAccess(tx, actor, task.id, target.id); practicalTasks.push({ employeeId: target.id, ...task }); } catch (e) { if (!(e instanceof ForbiddenException || e instanceof NotFoundException || e instanceof ConflictException)) throw e; }
      }
      const assignments = [];
      for (const target of employees) assignments.push(...await tx.trainingAssignment.findMany({ where: { organizationId: actor.organizationId, employeeId: target.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, employeeId: true, moduleVersionId: true, reviewerAccountId: true, state: true, version: true, createdAt: true } }));
      return { employees: employees.map(({ id, employeeCode }) => ({ id, label: employeeCode ?? id })), modules, modulesByEmployee, reviewers: approvers, practicalTasks, assignments, capabilities: { currentAccountId: actor.accountId, manageableEmployeeIds, canManage: actor.kind === AccountKind.OWNER || manageableEmployeeIds.length > 0, canSubmit: !!own } };
    });
  }
  async list(actor: Actor) { return (await this.setup(actor)).assignments; }
  private async row(tx: Tx, actor: Actor, id: string) {
    const row = await tx.trainingAssignment.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!row) throw new NotFoundException("Training assignment not found");
    const trainee = await this.employee(tx, row.employeeId, actor.organizationId);
    if (actor.kind !== AccountKind.OWNER && trainee.accountId !== actor.accountId && !await this.manages(tx, actor.accountId, actor.kind, actor.organizationId, row.employeeId, false)) throw new ForbiddenException("Training assignment access denied");
    return { row, trainee };
  }
  async detail(actor: Actor, id: string) {
    return this.transaction(async (tx) => {
      await this.active(tx, actor); const { row, trainee } = await this.row(tx, actor, id);
      const module = await this.module(tx, actor.organizationId, row.moduleVersionId, row.employeeId, actor);
      const attempts = await tx.trainingAttempt.findMany({ where: { assignmentId: id, organizationId: actor.organizationId }, orderBy: [{ sequence: "asc" }, { id: "asc" }] });
      const changes = await tx.trainingAssignmentChange.findMany({ where: { assignmentId: id, organizationId: actor.organizationId }, orderBy: [{ version: "asc" }] });
      const reviewerEligible = row.reviewerAccountId === actor.accountId && await this.manages(tx, actor.accountId, actor.kind, actor.organizationId, row.employeeId, true);
      const managerEligible = actor.kind === AccountKind.OWNER || await this.manages(tx, actor.accountId, actor.kind, actor.organizationId, row.employeeId, true);
      const isTrainee = trainee.accountId === actor.accountId;
      const moduleRecord = await tx.libraryRecord.findFirst({ where: { id: module.version.recordId, organizationId: actor.organizationId } });
      return { assignment: row, module: { id: module.version.id, version: module.version.version, title: moduleRecord?.title ?? "Training module", content: sanitizeTrainingAssessmentContent(module.content, { revealAnswerKey: reviewerEligible }), references: module.sopReferences }, attempts: attempts.map((a) => ({ id: a.id, kind: a.kind, sequence: a.sequence, payload: a.kind === "SUBMISSION" && !reviewerEligible && !isTrainee ? { note: (a.payload as Record<string, unknown>).note } : a.payload, actorId: a.actorId, reason: a.reason, occurredAt: a.occurredAt })), history: changes, capabilities: { isTrainee, canSubmit: isTrainee && ["ASSIGNED", "CHANGES_REQUIRED"].includes(row.state), canAssess: reviewerEligible && row.state === "SUBMITTED", canRecordEffectiveness: managerEligible && row.state === "COMPLETED" } };
    });
  }
  async assign(actor: Actor, input: { commandId: string; employeeId: string; moduleVersionId: string; reviewerAccountId: string; reason: string; recommendationReason?: string; practicalTaskId?: string }) {
    if (!validReason(input.reason) || input.recommendationReason !== undefined && !validReason(input.recommendationReason)) throw new BadRequestException("Reason required");
    const authorize = async (tx: Tx) => {
      const target = await this.managerAuthority(tx, actor, input.employeeId);
      const reviewer = await tx.account.findFirst({ where: { id: input.reviewerAccountId, state: AccountState.ACTIVE, OR: [{ kind: AccountKind.OWNER }, { kind: AccountKind.STAFF, employee: { organizationId: actor.organizationId, state: EmployeeState.ACTIVE } }] } });
      if (!reviewer || reviewer.id === target.accountId || reviewer.kind !== AccountKind.OWNER && !await this.manages(tx, reviewer.id, reviewer.kind, actor.organizationId, target.id, true)) throw new ForbiddenException("Selected reviewer is not currently eligible");
      await this.module(tx, actor.organizationId, input.moduleVersionId, target.id, actor);
      if (input.practicalTaskId) {
        const task = await this.tasks.assertTrainingPracticalAccess(tx, actor, input.practicalTaskId, target.id);
        if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.STOPPED_DUE_TO_PROJECT_CANCELLATION) throw new BadRequestException("Select an active practical task owned by the trainee");
      }
    };
    return this.receipt(actor, input.commandId, "assign", input, authorize, async (tx) => {
      const m = await this.module(tx, actor.organizationId, input.moduleVersionId, input.employeeId, actor, true), id = randomUUID(), state: AssignmentState = "ASSIGNED";
      const data = { criteria: m.assessment.criteria, practicalTaskId: input.practicalTaskId ?? null, recommendationReason: input.recommendationReason ?? null };
      await tx.trainingAssignment.create({ data: { id, organizationId: actor.organizationId, employeeId: input.employeeId, moduleVersionId: input.moduleVersionId, assignedById: actor.accountId, reviewerAccountId: input.reviewerAccountId, state, version: 1, data: json(data) } });
      await this.writeChange(tx, actor.accountId, { id, organizationId: actor.organizationId }, 1, state, data, input.reason);
      return { id, employeeId: input.employeeId, moduleVersionId: input.moduleVersionId, reviewerAccountId: input.reviewerAccountId, state, version: 1, data };
    });
  }
  private async commandAssignment(actor: Actor, id: string, commandId: string, op: string, input: unknown, authorize: (tx: Tx, row: { id: string; organizationId: string; employeeId: string; moduleVersionId: string; reviewerAccountId: string | null; state: string; version: number; data: Prisma.JsonValue }, trainee: { id: string; accountId: string }) => Promise<void>, mutate: (tx: Tx, row: { id: string; organizationId: string; employeeId: string; moduleVersionId: string; reviewerAccountId: string | null; state: string; version: number; data: Prisma.JsonValue }, trainee: { id: string; accountId: string }) => Promise<unknown>) {
    const authorizeCurrent = async (tx: Tx) => { await tx.$queryRaw`SELECT id FROM training_assignments WHERE id=${id}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR UPDATE`; const { row, trainee } = await this.row(tx, actor, id); await authorize(tx, row, trainee); };
    return this.receipt(actor, commandId, op, input, authorizeCurrent, async (tx) => { const { row, trainee } = await this.row(tx, actor, id); return mutate(tx, row, trainee); });
  }
  async submit(actor: Actor, id: string, input: { commandId: string; expectedVersion: number; answers?: Array<{ questionId: string; optionIds: string[] }>; practicalTaskId?: string; note: string; reason: string }) {
    if (!validReason(input.reason) || !safeText(input.note, 2000) || !Number.isInteger(input.expectedVersion)) throw new BadRequestException("Invalid submission");
    return this.commandAssignment(actor, id, input.commandId, "submit", input, async (tx, row, trainee) => {
      if (trainee.accountId !== actor.accountId) throw new ForbiddenException("Only the trainee may submit");
      await this.module(tx, actor.organizationId, row.moduleVersionId, row.employeeId, actor);
    }, async (tx, row, trainee) => {
      if (row.version !== input.expectedVersion || !["ASSIGNED", "CHANGES_REQUIRED"].includes(row.state)) throw new ConflictException("Training assignment version or state changed");
      const m = await this.module(tx, actor.organizationId, row.moduleVersionId, row.employeeId, actor), assessment = m.assessment;
      const answers = input.answers ?? [];
      if (answers.length > 30) throw new BadRequestException("Too many answers");
      const answerMap = new Map<string, string[]>();
      for (const answer of answers) {
        if (!answer || typeof answer.questionId !== "string" || answerMap.has(answer.questionId) || !Array.isArray(answer.optionIds) || answer.optionIds.some((x) => typeof x !== "string") || new Set(answer.optionIds).size !== answer.optionIds.length) throw new BadRequestException("Invalid quiz answers");
        answerMap.set(answer.questionId, answer.optionIds);
      }
      const score = assessment.quiz ? assessment.quiz.reduce((n, q) => {
        const selected = answerMap.get(q.id) ?? [];
        if (selected.some((x) => !q.options.some((o) => o.id === x))) throw new BadRequestException("Answer contains an unknown option");
        return n + (selected.length === q.correctOptionIds.length && q.correctOptionIds.every((x) => selected.includes(x)) ? 1 : 0);
      }, 0) : 0;
      if (answerMap.size !== (assessment.quiz?.length ?? 0)) throw new BadRequestException("Submit an answer for every authored question");
      const practicalTaskId = input.practicalTaskId ?? (row.data as Record<string, unknown>).practicalTaskId;
      const assignedPracticalTaskId = (row.data as Record<string, unknown>).practicalTaskId;
      if (assignedPracticalTaskId && practicalTaskId !== assignedPracticalTaskId) throw new ConflictException("Submission must retain the assigned practical task");
      if (assessment.practicalRequired && !practicalTaskId) throw new BadRequestException("Practical evidence is required");
      if (practicalTaskId) {
        const task = await this.tasks.assertTrainingPracticalAccess(tx, actor, practicalTaskId as string, trainee.id);
        if (task.status !== TaskStatus.COMPLETED) throw new ConflictException("Practical evidence must be the trainee's completed practical task");
      }
      const next = row.version + 1, data = row.data as Record<string, unknown>, sequence = await tx.trainingAttempt.count({ where: { assignmentId: id, organizationId: actor.organizationId } }) + 1;
      const payload = { assignmentVersion: next, note: input.note, answers: answers.map((a) => ({ questionId: a.questionId, optionIds: a.optionIds })), quizCorrect: score, quizCount: assessment.quiz?.length ?? 0, practicalTaskId: practicalTaskId ?? null };
      await this.writeAttempt(tx, actor.accountId, row, "SUBMISSION", sequence, payload, input.reason);
      const nextData = { ...data, latestQuizCorrect: score, latestQuizCount: assessment.quiz?.length ?? 0, practicalTaskId: practicalTaskId ?? null };
      const updated = await tx.trainingAssignment.update({ where: { id, version: row.version }, data: { version: next, state: "SUBMITTED", data: json(nextData) } });
      await this.writeChange(tx, actor.accountId, updated, next, "SUBMITTED", nextData, input.reason);
      return { assignmentId: id, version: next, state: "SUBMITTED", quizCorrect: score, quizCount: assessment.quiz?.length ?? 0 };
    });
  }
  async assess(actor: Actor, id: string, input: { commandId: string; expectedVersion: number; outcome: "PASSED" | "CHANGES_REQUIRED"; observation: string; reason: string }) {
    if (!validReason(input.reason) || !safeText(input.observation, 2000) || !Number.isInteger(input.expectedVersion) || !["PASSED", "CHANGES_REQUIRED"].includes(input.outcome)) throw new BadRequestException("Invalid assessment");
    return this.commandAssignment(actor, id, input.commandId, "assess", input, async (tx, row) => {
      if (row.reviewerAccountId !== actor.accountId || !await this.manages(tx, actor.accountId, actor.kind, actor.organizationId, row.employeeId, true)) throw new ForbiddenException("Named current reviewer access required");
      const m = await this.module(tx, actor.organizationId, row.moduleVersionId, row.employeeId, actor);
      const data = row.data as Record<string, unknown>;
      if (m.assessment.practicalRequired || data.practicalTaskId) {
        if (typeof data.practicalTaskId !== "string") throw new ConflictException("Practical evidence is required");
        const task = await this.tasks.assertTrainingPracticalAccess(tx, actor, data.practicalTaskId, row.employeeId);
        if (task.status !== TaskStatus.COMPLETED) throw new ConflictException("Practical evidence must be completed before assessment");
      }
    }, async (tx, row) => {
      if (row.version !== input.expectedVersion || row.state !== "SUBMITTED") throw new ConflictException("Only the current submitted assignment can be assessed");
      const m = await this.module(tx, actor.organizationId, row.moduleVersionId, row.employeeId, actor), data = row.data as Record<string, unknown>;
      const passedQuiz = !m.assessment.quiz || Number(data.latestQuizCorrect ?? -1) >= Number(m.assessment.minimumCorrect);
      const practical = !m.assessment.practicalRequired || !!data.practicalTaskId;
      if (input.outcome === "PASSED" && (!passedQuiz || !practical)) throw new ConflictException("Authored quiz threshold or practical evidence is not satisfied");
      const state: AssignmentState = input.outcome === "PASSED" ? "COMPLETED" : "CHANGES_REQUIRED", next = row.version + 1;
      const sequence = await tx.trainingAttempt.count({ where: { assignmentId: id, organizationId: actor.organizationId } }) + 1, payload = { assignmentVersion: next, outcome: input.outcome, observation: input.observation };
      await this.writeAttempt(tx, actor.accountId, row, "ASSESSMENT", sequence, payload, input.reason);
      const updated = await tx.trainingAssignment.update({ where: { id, version: row.version }, data: { version: next, state, data: json(data) } });
      await this.writeChange(tx, actor.accountId, updated, next, state, data, input.reason);
      return { assignmentId: id, version: next, state };
    });
  }
  async effectiveness(actor: Actor, id: string, input: { commandId: string; date: string; observation: string; practicalTaskId?: string; reason: string }) {
    if (!validReason(input.reason) || !safeText(input.observation, 2000) || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new BadRequestException("Invalid effectiveness observation");
    return this.commandAssignment(actor, id, input.commandId, "effectiveness", input, async (tx, row) => {
      if (row.reviewerAccountId !== actor.accountId && actor.kind !== AccountKind.OWNER && !await this.manages(tx, actor.accountId, actor.kind, actor.organizationId, row.employeeId, true)) throw new ForbiddenException("Current training management scope required");
      await this.module(tx, actor.organizationId, row.moduleVersionId, row.employeeId, actor);
      const date = new Date(`${input.date}T00:00:00.000Z`), organization = await tx.organization.findFirst({ select: { timezone: true } });
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: organization?.timezone ?? "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.date || input.date > today) throw new BadRequestException("Effectiveness date must be a valid past or current date");
    }, async (tx, row) => {
      if (row.state !== "COMPLETED") throw new ConflictException("Effectiveness requires completed training");
      if (input.practicalTaskId) {
        const task = await this.tasks.assertTrainingPracticalAccess(tx, actor, input.practicalTaskId, row.employeeId);
        if (task.status !== TaskStatus.COMPLETED) throw new BadRequestException("Effectiveness observation requires a completed practical task");
      }
      const sequence = await tx.trainingAttempt.count({ where: { assignmentId: id, organizationId: actor.organizationId } }) + 1;
      const payload = { date: input.date, observation: input.observation, practicalTaskId: input.practicalTaskId ?? null };
      const attempt = await this.writeAttempt(tx, actor.accountId, row, "EFFECTIVENESS", sequence, payload, input.reason);
      return { assignmentId: id, ...attempt };
    });
  }
}

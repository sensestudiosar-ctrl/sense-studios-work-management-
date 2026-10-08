import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { AccountKind, Prisma, type AiDecision, type AiRun } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { ProjectService, type ProjectActor } from "./project.service.js";
import { TaskService } from "./task.service.js";
import { ReviewService } from "./review.service.js";
import { DashboardService } from "./dashboard.service.js";
import { TimeService } from "./time.service.js";
import { WorkforceService } from "./workforce.service.js";
import { PerformanceService } from "./performance.service.js";
import { SkillsService } from "./skills.service.js";
import { TrainingService } from "./training.service.js";
import { LibraryService } from "./library.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { recordProjectEvent } from "./project-events.js";
import { transactionalReadPorts } from "./dashboard-transaction.js";
import { AI_PROVIDER, AI_PROVIDER_VERSION, generateEvidenceResult, validateStoredResult, type AssistanceCandidate, type AuthorizedEvidence, type EvidenceReference } from "./ai-evidence.js";

type Actor = ProjectActor & { sessionId?: string };
type Tx = Prisma.TransactionClient;
type Obj = Record<string, unknown>;
const object = (value: unknown): Obj => value && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const safeReadErrors = (error: unknown) => error instanceof ForbiddenException || error instanceof NotFoundException;
/** Retained evidence stays immutable; unavailable candidate identities are omitted from responses. */
export function visibleAssistanceResult(value: unknown) {
  const result = object(value);
  const candidates = Array.isArray(result.candidates) ? result.candidates : [];
  const visible = candidates.filter((candidate) => object(candidate).eligible === true);
  const unavailableCount = candidates.length - visible.length;
  return { ...result, candidates: visible, ...(unavailableCount ? {
    unavailableFactors: [...(Array.isArray(result.unavailableFactors) ? result.unavailableFactors : []), `${unavailableCount} retained candidate(s) are unavailable in the current scope; their identities and factors are withheld.`]
  } : {}) };
}
/** Candidate scope references are mandatory; optional factor references may be bounded. */
export function boundedAssistanceManifest(manifest: EvidenceReference[], limit = 1000): EvidenceReference[] {
  const candidates = manifest.filter((reference) => reference.kind === "ASSIGNMENT_CANDIDATE");
  if (candidates.length > limit) throw new ConflictException("Candidate scope exceeds the bounded assistance evidence limit");
  return [...candidates, ...manifest.filter((reference) => reference.kind !== "ASSIGNMENT_CANDIDATE").slice(0, limit - candidates.length)];
}
/** Unconfigured Workforce evidence is unavailable, rather than an observed numeric zero. */
export function assistanceCapacityFactors(period: { availableMinutes: number; category: string }, source: EvidenceReference): AssistanceCandidate["factors"] {
  const setupRequired = period.category === "SETUP_REQUIRED";
  return [
    { key: "capacity:availableMinutes", label: "Schedule-derived available capacity", value: setupRequired ? null : period.availableMinutes, source },
    { key: "capacity:category", label: "Schedule-derived workload category", value: setupRequired ? null : period.category, source }
  ];
}
const purposes = ["PRIMARY_OWNER", "COLLABORATOR", "REVIEWER"] as const;
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
export const aiRunCommandSchema = z.object({
  commandId: z.uuid(), kind: z.enum(["DAILY", "PROJECT", "MANAGEMENT", "ASSIGNMENT"]), reason: z.string().trim().min(3).max(1000),
  projectId: z.uuid().optional(), taskId: z.uuid().optional(), from: dateSchema, to: dateSchema,
  purpose: z.enum(purposes).optional(), broaderSearch: z.boolean().optional()
}).strict().superRefine((value, context) => {
  const days = (Date.parse(`${value.to}T00:00:00Z`) - Date.parse(`${value.from}T00:00:00Z`)) / 86_400_000;
  if (days < 0 || days > 30) context.addIssue({ code: "custom", message: "Choose an ordered period of at most 31 days" });
  if (value.kind === "PROJECT" && !value.projectId) context.addIssue({ code: "custom", message: "A project is required" });
  if (value.kind === "ASSIGNMENT" && (!value.taskId || !value.purpose)) context.addIssue({ code: "custom", message: "A task and assignment purpose are required" });
  if (value.kind !== "ASSIGNMENT" && (value.taskId !== undefined || value.purpose !== undefined || value.broaderSearch !== undefined)) context.addIssue({ code: "custom", message: "Assignment fields apply only to assignment assistance" });
});
const decisionSchema = z.object({ commandId: z.uuid(), expectedDecisionVersion: z.number().int().nonnegative(), outcome: z.enum(["ACCEPTED", "REJECTED", "OVERRIDDEN"]), reason: z.string().trim().min(3).max(1000), selection: z.object({ purpose: z.enum(purposes), employeeId: z.uuid() }).strict().optional() }).strict();
const outcomeSchema = z.object({ commandId: z.uuid(), expectedDecisionVersion: z.number().int().nonnegative(), decisionId: z.uuid(), taskId: z.uuid(), reason: z.string().trim().min(3).max(1000) }).strict();

@Injectable()
export class AiAssistanceService {
  constructor(private readonly database: DatabaseService, private readonly projects: ProjectService, private readonly tasks: TaskService, private readonly reviews: ReviewService, private readonly authorization: AuthorizationService,
    private readonly dashboard: DashboardService, private readonly time: TimeService, private readonly workforce: WorkforceService, private readonly performance: PerformanceService,
    private readonly skills: SkillsService, private readonly training: TrainingService, private readonly library: LibraryService) {}
  private transaction<T>(work: (tx: Tx) => Promise<T>) { return this.database.prisma.$transaction(work, { timeout: 120_000 }); }
  private async active(tx: Tx, actor: Actor) {
    await transactionalReadPorts(this.dashboard, tx).automationAuthorize(actor, []);
    return actor;
  }
  private async hashJson(tx: Tx, value: unknown): Promise<string> {
    const bytes = JSON.stringify(value);
    if (bytes === undefined) throw new ConflictException("Assistance payload is invalid");
    const rows = await tx.$queryRaw<Array<{ hash: string }>>`SELECT encode(sha256(convert_to(${bytes}::jsonb::text,'UTF8')),'hex') AS hash`;
    return rows[0]?.hash ?? createHash("sha256").update(bytes).digest("hex");
  }
  private async receipt<T>(tx: Tx, actor: Actor, input: { commandId: string; operation: "CREATE_RUN" | "DECISION" | "OUTCOME"; payload: unknown; runId?: string; decisionId?: string }, fn: () => Promise<{ output: T; runId: string; decisionId?: string }>): Promise<T> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`s27:${actor.organizationId}:${actor.accountId}:${input.commandId}`},0))`;
    const payloadHash = await this.hashJson(tx, { operation: input.operation, payload: input.payload });
    const prior = await tx.aiReceipt.findUnique({ where: { actorId_commandId: { actorId: actor.accountId, commandId: input.commandId } } });
    if (prior) {
      if (prior.organizationId !== actor.organizationId || prior.operation !== input.operation || prior.payloadHash !== payloadHash) throw new ConflictException("Command identifier was reused with different input");
      await this.authorizeRun(tx, actor, prior.runId, actor.kind === AccountKind.OWNER);
      if (prior.operation === "CREATE_RUN") return (await this.readOutput(tx, actor, prior.runId)) as T;
      const decision = prior.decisionId ? await tx.aiDecision.findFirst({ where: { id: prior.decisionId, organizationId: actor.organizationId, runId: prior.runId } }) : null;
      if (!decision) throw new NotFoundException("Assistance decision receipt is unavailable");
      const output = await this.readOutput(tx, actor, prior.runId);
      const visibleDecision = output.decisions.find((item) => item.id === decision.id);
      if (!visibleDecision) throw new NotFoundException("Assistance decision receipt is unavailable");
      return { id: output.id, decision: visibleDecision, decisionVersion: output.decisionVersion } as T;
    }
    const created = await fn();
    await tx.aiReceipt.create({ data: { organizationId: actor.organizationId, actorId: actor.accountId, commandId: input.commandId, operation: input.operation, payloadHash, runId: created.runId, decisionId: created.decisionId ?? null, result: json({ runId: created.runId, ...(created.decisionId ? { decisionId: created.decisionId } : {}) }) } });
    return created.output;
  }
  async context(actor: Actor) {
    return this.transaction(async (tx) => {
      await this.active(tx, actor);
      const scopedProjects = transactionalReadPorts(this.projects, tx), scopedTasks = transactionalReadPorts(this.tasks, tx);
      const projects = (await scopedProjects.integrationProjects(actor, tx)).map((project) => ({ id: project.id, title: project.title }));
      const taskMap = new Map<string, { id: string; title: string; projectId: string | null }>();
      for (const scope of ["personal", "assigned"] as const) {
        try { const page = await scopedTasks.list(actor, scope, 0, 100); for (const task of page.items) taskMap.set(task.id, { id: task.id, title: task.title, projectId: task.projectId ?? null }); }
        catch (error) { if (!safeReadErrors(error)) throw error; }
      }
      let canBroaderSearch = actor.kind === AccountKind.OWNER;
      if (!canBroaderSearch) for (const project of projects) {
        try { const row = await scopedProjects.integrationContext(actor, tx, project.id, true); const scope = { kind: "BRANCH" as const, organizationId: actor.organizationId, branchId: row.branchId }; await this.authorization.assertPermission(actor.accountId, "employee.manage", scope, tx); await this.authorization.assertPermission(actor.accountId, "task.assign", scope, tx); canBroaderSearch = true; break; }
        catch (error) { if (!safeReadErrors(error)) throw error; }
      }
      return { owner: actor.kind === AccountKind.OWNER, provider: AI_PROVIDER, providerVersion: AI_PROVIDER_VERSION, requestKinds: ["DAILY", "PROJECT", "MANAGEMENT", "ASSIGNMENT"], capabilities: { DAILY: true, PROJECT: true, MANAGEMENT: true, ASSIGNMENT: true, canDecide: true, canRecordOutcome: true, canBroaderSearch }, projects, tasks: [...taskMap.values()].sort((a, b) => a.id.localeCompare(b.id)), unavailableCapabilities: ["No live inference or external transmission is available.", "A source or policy absent from current owner-authorized ports is reported unavailable."] };
    });
  }
  private async currentEvidence(tx: Tx, actor: Actor, request: z.infer<typeof aiRunCommandSchema>): Promise<{ evidence: AuthorizedEvidence; manifest: EvidenceReference[]; currentTeamId: string | null; currentTeamBranchId: string | null; candidates: AssistanceCandidate[] }> {
    const dashboard = transactionalReadPorts(this.dashboard, tx), tasks = transactionalReadPorts(this.tasks, tx), projects = transactionalReadPorts(this.projects, tx), reviews = transactionalReadPorts(this.reviews, tx);
    const facts: AuthorizedEvidence["facts"] = [], manifest: EvidenceReference[] = [], candidates: AssistanceCandidate[] = [], unavailableFactors: string[] = [], limitations: string[] = [];
    let scope: AuthorizedEvidence["scope"];
    let currentTeamId: string | null = null, currentTeamBranchId: string | null = null;
    if (request.kind === "ASSIGNMENT") {
      const base = await tasks.assistanceCandidates(actor, tx, request.taskId!, request.purpose!, request.broaderSearch ?? false);
      if (request.projectId !== undefined && request.projectId !== base.task.projectId) throw new ConflictException("Assignment project must match the selected task project");
      currentTeamId = base.currentTeam.id; currentTeamBranchId = base.currentTeam.branchId;
      const task = await tasks.detail(actor, request.taskId!);
      const taskRef: EvidenceReference = { kind: "TASK", id: request.taskId!, ...(base.task.projectId ? { projectId: base.task.projectId } : {}) };
      manifest.push(taskRef);
      const taskValues = object(task.task);
      for (const key of ["title", "type", "status", "priority", "targetDate", "committedDueDate", "estimatedHours", "reviewRequirement", "version"]) {
        const value = taskValues[key]; if (value instanceof Date) facts.push({ source: taskRef, label: "Current task", field: key, value: value.toISOString().slice(0, 10), sourceDate: null });
        else if (value === null || typeof value === "string" || typeof value === "number") facts.push({ source: taskRef, label: "Current task", field: key, value, sourceDate: null });
      }
      const eligible = request.purpose === "REVIEWER" ? (await reviews.assistanceReviewerCandidates(actor, tx, request.taskId!, currentTeamId, currentTeamBranchId, request.broaderSearch ?? false)).candidates : base.candidates;
      if (eligible.length > 250) unavailableFactors.push("Candidate list is capped at 250 current eligible employees; remaining eligible employees are not displayed.");
      for (const item of eligible.slice(0, 250)) {
        candidates.push({ employeeId: item.employeeId, label: item.label, purpose: request.purpose!, teamId: item.teamId, eligible: true, factors: [] });
        manifest.push({ kind: "ASSIGNMENT_CANDIDATE", id: item.employeeId, ...(base.task.projectId ? { projectId: base.task.projectId } : {}), taskId: request.taskId!, purpose: request.purpose! });
        const candidate = candidates[candidates.length - 1]!;
        try {
          const profile = await transactionalReadPorts(this.skills, tx).assistanceEvidence(actor, item.employeeId);
          for (const rating of profile.ratings) {
            const ref: EvidenceReference = { kind: "SKILL_RATING", id: rating.id, employeeId: item.employeeId, taskId: request.taskId!, ...(base.task.projectId ? { projectId: base.task.projectId } : {}) };
            manifest.push(ref);
            candidate.factors.push({ key: `skill:${rating.skillId}`, label: "Current official skill rating", value: String(rating.level), source: ref });
          }
          for (const change of profile.changes) manifest.push({ kind: "SKILL_CHANGE", id: change.id, employeeId: item.employeeId, taskId: request.taskId!, ...(base.task.projectId ? { projectId: base.task.projectId } : {}) });
        } catch (error) { if (!safeReadErrors(error)) throw error; unavailableFactors.push("Current skill ratings are unavailable for some candidates under the existing Skills access policy."); }
        try {
          const training = await transactionalReadPorts(this.training, tx).assistanceEvidence(actor, item.employeeId);
          for (const assignment of training) {
            const ref: EvidenceReference = { kind: "TRAINING_ASSIGNMENT", id: assignment.assignmentId, employeeId: item.employeeId, taskId: request.taskId!, ...(base.task.projectId ? { projectId: base.task.projectId } : {}) };
            manifest.push(ref);
            candidate.factors.push({ key: "training:state", label: "Current training assignment", value: assignment.assignmentState, source: ref });
            candidate.factors.push({ key: "training:moduleVersion", label: "Activated training module version", value: assignment.moduleVersionId, source: ref });
            candidate.factors.push({ key: "training:moduleTitle", label: "Activated module", value: assignment.moduleTitle, source: ref });
            candidate.factors.push({ key: "training:assessmentName", label: "Named assessment", value: assignment.assessmentName, source: ref });
            for (const outcome of assignment.outcomes) {
              const outcomeRef: EvidenceReference = { kind: "TRAINING_ASSESSMENT", id: outcome.id, employeeId: item.employeeId, assignmentId: assignment.assignmentId, taskId: request.taskId!, ...(base.task.projectId ? { projectId: base.task.projectId } : {}) };
              manifest.push(outcomeRef);
              candidate.factors.push({ key: "training:assessmentOutcome", label: assignment.assessmentName, value: outcome.outcome, source: outcomeRef });
            }
            for (const observation of assignment.effectiveness) {
              const observationRef: EvidenceReference = { kind: "TRAINING_EFFECTIVENESS", id: observation.id, employeeId: item.employeeId, assignmentId: assignment.assignmentId, taskId: request.taskId!, ...(base.task.projectId ? { projectId: base.task.projectId } : {}) };
              manifest.push(observationRef);
              candidate.factors.push({ key: "training:effectivenessDate", label: "Dated effectiveness observation", value: observation.date, source: observationRef });
            }
          }
        } catch (error) { if (!safeReadErrors(error)) throw error; unavailableFactors.push("Current training assignments and effectiveness are unavailable for some candidates under the existing Training access policy."); }
      }
      try {
        const report = await transactionalReadPorts(this.workforce, tx).list(actor, "managed", request.from, request.to);
        const candidateIds = new Set(candidates.map((candidate) => candidate.employeeId));
        for (const period of report.workloadPeriods.filter((item: { employeeId: string }) => candidateIds.has(item.employeeId))) {
          const candidate = candidates.find((item) => item.employeeId === period.employeeId);
          if (!candidate) continue;
          const ref: EvidenceReference = { kind: "WORKFORCE_CAPACITY", id: period.employeeId, employeeId: period.employeeId, taskId: request.taskId!, from: request.from, to: request.to, ...(base.task.projectId ? { projectId: base.task.projectId } : {}) };
          manifest.push(ref);
          candidate.factors.push(...assistanceCapacityFactors(period, ref));
          if (period.category === "SETUP_REQUIRED") unavailableFactors.push("Schedule-derived capacity and workload classification are unavailable for candidates whose Workforce setup is incomplete.");
        }
      } catch (error) { if (!safeReadErrors(error)) throw error; unavailableFactors.push("Schedule-derived capacity is unavailable under the current Workforce management scope."); }
      try {
        const sops = await transactionalReadPorts(this.library, tx).assistanceTaskSops(actor, request.taskId!);
        for (const sop of sops) {
          const ref: EvidenceReference = { kind: "LIBRARY_SOP_VERSION", id: sop.versionId, recordId: sop.recordId, taskId: request.taskId!, ...(base.task.projectId ? { projectId: base.task.projectId } : {}) };
          manifest.push(ref);
          facts.push({ source: ref, label: "Published task-referenced SOP version", field: "version", value: sop.version, sourceDate: null });
          facts.push({ source: ref, label: "Published task-referenced SOP", field: "title", value: sop.title.slice(0, 200), sourceDate: null });
          if (sop.text) facts.push({ source: ref, label: "Published task-referenced SOP text", field: "publishedText", value: sop.text.slice(0, 500), sourceDate: null });
        }
      } catch (error) { if (!safeReadErrors(error)) throw error; unavailableFactors.push("Published task-referenced SOP evidence is unavailable under the existing Library audience and file access policy."); }
      scope = { kind: "ASSIGNMENT", taskId: request.taskId!, projectId: base.task.projectId, currentTeamId, currentTeamBranchId, broaderSearch: request.broaderSearch ?? false, purpose: request.purpose! };
      unavailableFactors.push("Performance evidence remains unavailable unless an approved scoped PER read port returns it.");
      limitations.push("Candidate order is stable and unranked; no composite score or policy weight is applied.");
    } else if (request.kind === "PROJECT") {
      const project = await projects.reportContext(actor, request.projectId!);
      const projectRef: EvidenceReference = { kind: "PROJECT", id: request.projectId!, projectId: request.projectId! };
      manifest.push(projectRef);
      const p = object(project.project);
      for (const [field, value] of Object.entries(p)) if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) facts.push({ source: projectRef, label: "Current project", field, value, sourceDate: null });
      const page = await tasks.list(actor, "assigned", 0, 100, { projectId: request.projectId! });
      for (const entry of page.items) {
        const detail = await tasks.detail(actor, entry.id), ref: EvidenceReference = { kind: "TASK", id: entry.id, projectId: request.projectId! };
        manifest.push(ref);
        const task = object(detail.task);
        const target = typeof task.targetDate === "string" ? task.targetDate.slice(0, 10) : null;
        if (target && (target < request.from || target > request.to)) continue;
        for (const field of ["title", "status", "priority", "targetDate", "committedDueDate", "version"]) { const value = task[field]; if (typeof value === "string" || typeof value === "number" || value === null) facts.push({ source: ref, label: "Current project task", field, value, sourceDate: null }); }
      }
      for (const taskItem of page.items) {
        try {
          for (const sop of await transactionalReadPorts(this.library, tx).assistanceTaskSops(actor, taskItem.id)) {
            const ref: EvidenceReference = { kind: "LIBRARY_SOP_VERSION", id: sop.versionId, recordId: sop.recordId, taskId: taskItem.id, projectId: request.projectId! };
            manifest.push(ref);
            facts.push({ source: ref, label: "Published task-referenced SOP version", field: "version", value: sop.version, sourceDate: null });
            facts.push({ source: ref, label: "Published task-referenced SOP", field: "title", value: sop.title.slice(0, 200), sourceDate: null });
            if (sop.text) facts.push({ source: ref, label: "Published task-referenced SOP text", field: "publishedText", value: sop.text.slice(0, 500), sourceDate: null });
          }
        } catch (error) { if (!safeReadErrors(error)) throw error; unavailableFactors.push("Some task-linked published SOP evidence is unavailable under the current Library access policy."); }
      }
      if (page.total > page.items.length) unavailableFactors.push("Project task listing is capped at the current 100-item page.");
      scope = { kind: "PROJECT", projectId: request.projectId! };
      unavailableFactors.push("SOP, training, quality and performance source factors are available only through their current owner-authorized read ports.");
    } else {
      const category = request.kind === "MANAGEMENT" ? "leader" : "employee";
      const report = await dashboard.automationReport(actor, { category, from: request.from, to: request.to });
      manifest.push(...report.manifest.slice(0, 500).map(({ kind, id, projectId, from, to, parent }) => ({ kind: String(kind), id: String(id), ...(typeof projectId === "string" ? { projectId } : {}), ...(typeof from === "string" ? { from } : {}), ...(typeof to === "string" ? { to } : {}), ...(typeof parent?.employeeId === "string" ? { employeeId: parent.employeeId } : {}), ...(typeof parent?.assignmentId === "string" ? { assignmentId: parent.assignmentId } : {}), ...(typeof parent?.recordId === "string" ? { recordId: parent.recordId } : {}), ...(typeof parent?.versionId === "string" ? { versionId: parent.versionId } : {}) })));
      for (const row of report.table.rows.slice(0, 500)) {
        const sourceKind = String(row.source ?? ""), sourceId = String(row.id ?? ""), source = manifest.find((item) => item.kind === sourceKind && item.id === sourceId);
        if (!sourceKind || !sourceId || !source || typeof row.field !== "string") continue;
        facts.push({ source: { kind: sourceKind, id: sourceId, ...(source.projectId ? { projectId: source.projectId } : {}), ...(source.employeeId ? { employeeId: source.employeeId } : {}), ...(source.assignmentId ? { assignmentId: source.assignmentId } : {}), ...(source.recordId ? { recordId: source.recordId } : {}), ...(source.versionId ? { versionId: source.versionId } : {}) }, label: String(row.label ?? "Authorized report source").slice(0, 200), field: row.field.slice(0, 100), value: row.value ?? null, sourceDate: typeof row.date === "string" && row.date ? row.date : null });
      }
      if (report.table.rows.length > 500 || report.manifest.length > 500) unavailableFactors.push("Dashboard evidence is capped at 500 current source entries.");
      unavailableFactors.push(...report.table.unavailable);
      scope = { kind: request.kind };
    }
    if (facts.length > 500) { facts.splice(500); unavailableFactors.push("Evidence facts are capped at 500 current source entries."); }
    if (manifest.length > 1000) {
      const bounded = boundedAssistanceManifest(manifest);
      const retained = new Set(bounded.map((item) => `${item.kind}:${item.id}`));
      manifest.splice(0, manifest.length, ...bounded);
      for (const candidate of candidates) candidate.factors = candidate.factors.filter((factor) => !factor.source || retained.has(`${factor.source.kind}:${factor.source.id}`));
      for (let index = facts.length - 1; index >= 0; index--) if (!retained.has(`${facts[index]!.source.kind}:${facts[index]!.source.id}`)) facts.splice(index, 1);
      unavailableFactors.push("Evidence source manifest is capped at 1,000 references.");
    }
    if (!facts.length && request.kind !== "ASSIGNMENT") unavailableFactors.push("No currently authorized persisted source facts match this request.");
    const evidence: AuthorizedEvidence = { kind: request.kind, scope, from: request.from, to: request.to, facts, candidates, unavailableFactors, limitations };
    return { evidence, manifest, currentTeamId, currentTeamBranchId, candidates };
  }
  async createRun(actor: Actor, value: unknown) {
    const request = this.parse(aiRunCommandSchema, value);
    return this.transaction(async (tx) => {
      await this.active(tx, actor);
      const { evidence, manifest, currentTeamId, currentTeamBranchId, candidates } = await this.currentEvidence(tx, actor, request);
      const result = generateEvidenceResult(evidence);
      const authorizedInput = { evidence };
      const effectiveProjectId = request.kind === "ASSIGNMENT" ? (evidence.scope.projectId as string | null | undefined) ?? null : request.projectId ?? null;
      const requestData = { ...request, projectId: effectiveProjectId, taskId: request.taskId ?? null, purpose: request.purpose ?? null, broaderSearch: request.broaderSearch ?? false, currentTeamId, currentTeamBranchId, authorizedInput };
      return this.receipt(tx, actor, { commandId: request.commandId, operation: "CREATE_RUN", payload: request }, async () => {
        const id = randomUUID(), inputHash = await this.hashJson(tx, authorizedInput), requestHash = await this.hashJson(tx, requestData), manifestHash = await this.hashJson(tx, manifest), resultHash = await this.hashJson(tx, result);
        const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "ai.run_created", subjectType: "ai_run", subjectId: id, reason: request.reason, after: { operation: "CREATE_RUN", actorId: actor.accountId, kind: request.kind, projectId: effectiveProjectId, taskId: request.taskId ?? null, purpose: request.purpose ?? null, currentTeamId, currentTeamBranchId, broaderSearch: request.broaderSearch ?? false, fromDate: request.from, toDate: request.to, provider: AI_PROVIDER, providerVersion: AI_PROVIDER_VERSION, inputHash, requestHash, manifestHash, resultHash, commandId: request.commandId, payloadHash: await this.hashJson(tx, { operation: "CREATE_RUN", payload: request }) } });
        await tx.aiRun.create({ data: { id, organizationId: actor.organizationId, requesterId: actor.accountId, kind: request.kind, projectId: effectiveProjectId, taskId: request.taskId ?? null, purpose: request.purpose ?? null, currentTeamId, currentTeamBranchId, broaderSearch: request.broaderSearch ?? false, fromDate: new Date(`${request.from}T00:00:00.000Z`), toDate: new Date(`${request.to}T00:00:00.000Z`), provider: AI_PROVIDER, providerVersion: AI_PROVIDER_VERSION, inputHash, request: json(requestData), manifest: json(manifest), result: json(result), reason: request.reason, eventId, decisionVersion: 0 } });
        const output = { id, result, decisionVersion: 0, capabilities: { canDecide: true, canRecordOutcome: candidates.length > 0 } };
        return { output, runId: id };
      });
    });
  }
  async listRuns(actor: Actor) {
    return this.transaction(async (tx) => {
      await this.active(tx, actor);
      const rows = await tx.aiRun.findMany({ where: { organizationId: actor.organizationId, ...(actor.kind === AccountKind.OWNER ? {} : { requesterId: actor.accountId }) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 });
      const items = [];
      for (const row of rows) {
        try { await this.authorizeRunRow(tx, actor, row, actor.kind === AccountKind.OWNER); items.push({ id: row.id, kind: row.kind, projectId: row.projectId, taskId: row.taskId, createdAt: row.createdAt, decisionVersion: row.decisionVersion }); }
        catch (error) { if (!safeReadErrors(error)) throw error; }
      }
      return { items };
    });
  }
  async getRun(actor: Actor, id: string) { return this.transaction((tx) => this.readOutput(tx, actor, id)); }
  private async readOutput(tx: Tx, actor: Actor, id: string) {
    const row = await tx.aiRun.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!row) throw new NotFoundException("Assistance run not found");
    await this.authorizeRunRow(tx, actor, row, actor.kind === AccountKind.OWNER);
    const decisions = await tx.aiDecision.findMany({ where: { organizationId: actor.organizationId, runId: id }, orderBy: [{ version: "asc" }] });
    const result = row.result as unknown as { candidates?: Array<{ employeeId: string; eligible: boolean }> };
    const currentEligible = new Set(result.candidates?.filter((candidate) => candidate.eligible).map((candidate) => candidate.employeeId) ?? []);
    const storedRequest = object(row.request);
    const safeRequest = Object.fromEntries(Object.entries(storedRequest).filter(([key]) => key !== "authorizedInput"));
    const decisionsOutput = [];
    for (const decision of decisions) {
      const output = this.decisionOutput(decision);
      let selectedStillAuthorized = !output.selectionEmployeeId || currentEligible.has(output.selectionEmployeeId);
      if (!selectedStillAuthorized && row.kind === "ASSIGNMENT" && output.selectionPurpose === "COLLABORATOR") {
        try {
          await transactionalReadPorts(this.tasks, tx).assistanceCollaboratorOutcome(actor, tx, row.taskId!, output.selectionEmployeeId!, row.broaderSearch);
          selectedStillAuthorized = true;
        } catch (error) { if (!safeReadErrors(error) && !(error instanceof ConflictException)) throw error; }
      }
      if (!selectedStillAuthorized) {
        decisionsOutput.push({ ...output, selectionEmployeeId: null, selectionPurpose: null, observation: null });
      } else decisionsOutput.push(output);
    }
    return { id: row.id, request: safeRequest, result: visibleAssistanceResult(row.result), decisionVersion: row.decisionVersion, decisions: decisionsOutput, capabilities: { canDecide: actor.kind === AccountKind.OWNER || row.requesterId === actor.accountId, canRecordOutcome: row.kind === "ASSIGNMENT" && decisions.some((d) => d.kind === "DECISION" && ["ACCEPTED", "OVERRIDDEN"].includes(d.outcome ?? "")) } };
  }
  private decisionOutput(row: AiDecision) { return { id: row.id, version: row.version, kind: row.kind, outcome: row.outcome, selectionEmployeeId: row.selectionEmployeeId, selectionPurpose: row.selectionPurpose, reason: row.reason, createdAt: row.createdAt, observation: row.observation }; }
  private async authorizeRun(tx: Tx, actor: Actor, id: string, ownerMayRead: boolean) {
    const row = await tx.aiRun.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!row) throw new NotFoundException("Assistance run not found");
    return this.authorizeRunRow(tx, actor, row, ownerMayRead);
  }
  private async authorizeRunRow(tx: Tx, actor: Actor, row: AiRun, ownerMayRead: boolean) {
    await this.active(tx, actor);
    if (!ownerMayRead && row.requesterId !== actor.accountId) throw new NotFoundException("Assistance run not found");
    const manifest = row.manifest as unknown as EvidenceReference[];
    const assignmentRefs = manifest.filter((item) => item.kind === "ASSIGNMENT_CANDIDATE");
    const sourceRefs = manifest.filter((item) => item.kind !== "ASSIGNMENT_CANDIDATE");
    const dashboardRefs = sourceRefs.filter((item) => !["TASK", "PROJECT", "SKILL_RATING", "SKILL_CHANGE", "TRAINING_ASSIGNMENT", "TRAINING_ASSESSMENT", "TRAINING_EFFECTIVENESS", "LIBRARY_SOP_VERSION", "WORKFORCE_CAPACITY"].includes(item.kind));
    if (dashboardRefs.length) await transactionalReadPorts(this.dashboard, tx).automationAuthorize(actor, dashboardRefs);
    const taskPort = transactionalReadPorts(this.tasks, tx);
    for (const ref of sourceRefs.filter((item) => item.kind === "TASK")) await taskPort.detail(actor, ref.id);
    const projectPort = transactionalReadPorts(this.projects, tx);
    for (const ref of sourceRefs.filter((item) => item.kind === "PROJECT")) await projectPort.reportContext(actor, ref.id);
    for (const ref of sourceRefs.filter((item) => item.kind === "SKILL_RATING" || item.kind === "SKILL_CHANGE")) {
      if (!ref.employeeId) throw new ForbiddenException("Retained skill source is invalid");
      const profile = await transactionalReadPorts(this.skills, tx).assistanceEvidence(actor, ref.employeeId);
      const currentIds = new Set([...profile.ratings.map((item) => item.id), ...profile.changes.map((item) => item.id)]);
      if (!currentIds.has(ref.id)) throw new ForbiddenException("Retained skill evidence is no longer available");
    }
    for (const ref of sourceRefs.filter((item) => ["TRAINING_ASSIGNMENT", "TRAINING_ASSESSMENT", "TRAINING_EFFECTIVENESS"].includes(item.kind))) {
      if (!ref.employeeId) throw new ForbiddenException("Retained training source is invalid");
      const training = await transactionalReadPorts(this.training, tx).assistanceEvidence(actor, ref.employeeId);
      const current = training.find((item) => ref.kind === "TRAINING_ASSIGNMENT" && item.assignmentId === ref.id || ref.kind === "TRAINING_ASSESSMENT" && (!ref.assignmentId || item.assignmentId === ref.assignmentId) && item.outcomes.some((outcome) => outcome.id === ref.id) || ref.kind === "TRAINING_EFFECTIVENESS" && (!ref.assignmentId || item.assignmentId === ref.assignmentId) && item.effectiveness.some((observation) => observation.id === ref.id));
      if (!current) throw new ForbiddenException("Retained training evidence is no longer available");
    }
    for (const ref of sourceRefs.filter((item) => item.kind === "LIBRARY_SOP_VERSION")) {
      if (!ref.taskId) throw new ForbiddenException("Retained Library source is invalid");
      const current = await transactionalReadPorts(this.library, tx).assistanceTaskSops(actor, ref.taskId);
      if (!current.some((item) => item.versionId === ref.id && (!ref.recordId || item.recordId === ref.recordId))) throw new ForbiddenException("Retained published SOP is no longer available");
    }
    for (const ref of sourceRefs.filter((item) => item.kind === "WORKFORCE_CAPACITY")) {
      if (!ref.employeeId || !ref.from || !ref.to) throw new ForbiddenException("Retained Workforce source is invalid");
      const current = await transactionalReadPorts(this.workforce, tx).list(actor, "managed", ref.from, ref.to);
      if (!current.workloadPeriods.some((period: { employeeId: string }) => period.employeeId === ref.employeeId)) throw new ForbiddenException("Retained schedule capacity is no longer available");
    }
    let currentCandidates: Set<string> | undefined;
    if (row.kind === "ASSIGNMENT") {
      const candidateScope = await transactionalReadPorts(this.tasks, tx).assistanceCandidates(actor, tx, row.taskId!, row.purpose as typeof purposes[number], row.broaderSearch);
      if (candidateScope.currentTeam.id !== row.currentTeamId || candidateScope.currentTeam.branchId !== row.currentTeamBranchId) throw new ForbiddenException("Task ownership scope changed since this assistance run");
      const reviewerScope = row.purpose === "REVIEWER" ? await transactionalReadPorts(this.reviews, tx).assistanceReviewerCandidates(actor, tx, row.taskId!, row.currentTeamId!, row.currentTeamBranchId!, row.broaderSearch) : null;
      const eligible = reviewerScope?.candidates ?? candidateScope.candidates;
      currentCandidates = new Set(eligible.map((candidate) => candidate.employeeId));
      const expectedCandidateRefs = new Set(assignmentRefs.map((item) => item.id));
      if (expectedCandidateRefs.size !== (row.result as unknown as { candidates: unknown[] }).candidates.length) throw new ForbiddenException("Retained candidate manifest is invalid");
      const originalIds = new Set((row.result as unknown as { candidates: Array<{ employeeId: string }> }).candidates.map((candidate) => candidate.employeeId));
      if ([...expectedCandidateRefs].some((employeeId) => !originalIds.has(employeeId)) || [...originalIds].some((employeeId) => !expectedCandidateRefs.has(employeeId))) throw new ForbiddenException("Retained candidate manifest is invalid");
    } else if (assignmentRefs.length) throw new ForbiddenException("Unexpected assignment candidate manifest");
    const result = row.result as unknown as { candidates: Array<{ employeeId: string; label: string; eligible: boolean; unavailable?: boolean; factors: AssistanceCandidate["factors"] }> };
    validateStoredResult(result, manifest.filter((item) => item.kind !== "ASSIGNMENT_CANDIDATE"), new Set(result.candidates.map((candidate) => candidate.employeeId)));
    if (row.kind === "ASSIGNMENT") for (const candidate of result.candidates) if (!currentCandidates?.has(candidate.employeeId)) {
      candidate.eligible = false;
      candidate.label = "No longer eligible in the current task scope";
      candidate.unavailable = true;
      candidate.factors = [];
    }
    return row;
  }
  async decide(actor: Actor, id: string, value: unknown) {
    const input = this.parse(decisionSchema, value);
    return this.transaction(async (tx) => {
      await this.active(tx, actor);
      await tx.$queryRaw`SELECT id FROM ai_runs WHERE id=${id}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR UPDATE`;
      const row = await tx.aiRun.findFirst({ where: { id, organizationId: actor.organizationId } });
      if (!row) throw new NotFoundException("Assistance run not found");
      await this.authorizeRunRow(tx, actor, row, actor.kind === AccountKind.OWNER);
      if (actor.kind !== AccountKind.OWNER && row.requesterId !== actor.accountId) throw new NotFoundException("Assistance run not found");
      const payload = { runId: id, expectedDecisionVersion: input.expectedDecisionVersion, outcome: input.outcome, reason: input.reason, selection: input.selection ?? null };
      return this.receipt(tx, actor, { commandId: input.commandId, operation: "DECISION", payload }, async () => {
        if (row.decisionVersion !== input.expectedDecisionVersion) throw new ConflictException("Assistance history changed; refresh before deciding");
        const stored = row.result as unknown as { candidates: Array<{ employeeId: string; purpose: string; eligible: boolean }> };
        if (row.kind === "ASSIGNMENT") {
          if (input.outcome === "REJECTED" && input.selection) throw new ConflictException("Rejected decisions cannot select an employee");
          if (["ACCEPTED", "OVERRIDDEN"].includes(input.outcome)) {
            if (!input.selection || input.selection.purpose !== row.purpose) throw new ConflictException("Select a currently eligible employee for the requested purpose");
            const current = await this.currentCandidates(tx, actor, row);
            if (!current.has(input.selection.employeeId)) throw new ConflictException("Selected employee is no longer eligible in this task scope");
            if (input.outcome === "ACCEPTED" && !stored.candidates.some((candidate) => candidate.employeeId === input.selection!.employeeId && candidate.purpose === row.purpose)) throw new ConflictException("Accepted selection must be an original candidate");
          }
        } else if (input.selection) throw new ConflictException("Summary decisions cannot select an employee");
        const decisionId = randomUUID(), version = input.expectedDecisionVersion + 1;
        const after = { operation: "DECISION", actorId: actor.accountId, runId: id, version, kind: "DECISION", outcome: input.outcome, selectionEmployeeId: input.selection?.employeeId ?? null, selectionPurpose: input.selection?.purpose ?? null, priorDecisionId: null, sourceTaskId: null, observationHash: null, commandId: input.commandId, payloadHash: await this.hashJson(tx, { operation: "DECISION", payload }) };
        const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "ai.decision_recorded", subjectType: "ai_decision", subjectId: decisionId, reason: input.reason, after });
        const decision = await tx.aiDecision.create({ data: { id: decisionId, organizationId: actor.organizationId, runId: id, version, kind: "DECISION", actorId: actor.accountId, outcome: input.outcome, selectionEmployeeId: input.selection?.employeeId ?? null, selectionPurpose: input.selection?.purpose ?? null, reason: input.reason, eventId } });
        await tx.aiRun.update({ where: { id }, data: { decisionVersion: { increment: 1 } } });
        const output = { id: row.id, decision: this.decisionOutput(decision), decisionVersion: version };
        return { output, runId: id, decisionId };
      });
    });
  }
  private async currentCandidates(tx: Tx, actor: Actor, run: AiRun): Promise<Set<string>> {
    const taskScope = await transactionalReadPorts(this.tasks, tx).assistanceCandidates(actor, tx, run.taskId!, run.purpose as typeof purposes[number], run.broaderSearch);
    if (run.purpose !== "REVIEWER") return new Set(taskScope.candidates.map((candidate) => candidate.employeeId));
    const reviewScope = await transactionalReadPorts(this.reviews, tx).assistanceReviewerCandidates(actor, tx, run.taskId!, run.currentTeamId!, run.currentTeamBranchId!, run.broaderSearch);
    return new Set(reviewScope.candidates.map((candidate) => candidate.employeeId));
  }
  async observeOutcome(actor: Actor, id: string, value: unknown) {
    const input = this.parse(outcomeSchema, value);
    return this.transaction(async (tx) => {
      await this.active(tx, actor);
      await tx.$queryRaw`SELECT id FROM ai_runs WHERE id=${id}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR UPDATE`;
      const row = await tx.aiRun.findFirst({ where: { id, organizationId: actor.organizationId } });
      if (!row) throw new NotFoundException("Assistance run not found");
      await this.authorizeRunRow(tx, actor, row, actor.kind === AccountKind.OWNER);
      if (actor.kind !== AccountKind.OWNER && row.requesterId !== actor.accountId) throw new NotFoundException("Assistance run not found");
      const payload = { runId: id, expectedDecisionVersion: input.expectedDecisionVersion, decisionId: input.decisionId, taskId: input.taskId, reason: input.reason };
      return this.receipt(tx, actor, { commandId: input.commandId, operation: "OUTCOME", payload }, async () => {
        if (row.kind !== "ASSIGNMENT" || row.taskId !== input.taskId || row.decisionVersion !== input.expectedDecisionVersion) throw new ConflictException("Outcome must match the assignment run and current decision version");
        const prior = await tx.aiDecision.findFirst({ where: { id: input.decisionId, organizationId: actor.organizationId, runId: id, kind: "DECISION", outcome: { in: ["ACCEPTED", "OVERRIDDEN"] } } });
        if (!prior || !prior.selectionEmployeeId || prior.selectionPurpose !== row.purpose) throw new ConflictException("Outcome requires a prior accepted or overridden selection");
        const observation = await this.verifyOutcome(tx, actor, row, prior);
        const decisionId = randomUUID(), version = input.expectedDecisionVersion + 1;
        const after = { operation: "OUTCOME", actorId: actor.accountId, runId: id, version, kind: "OUTCOME", outcome: null, selectionEmployeeId: prior.selectionEmployeeId, selectionPurpose: prior.selectionPurpose, priorDecisionId: prior.id, sourceTaskId: input.taskId, observationHash: await this.hashJson(tx, observation), commandId: input.commandId, payloadHash: await this.hashJson(tx, { operation: "OUTCOME", payload }) };
        const eventId = await recordProjectEvent(tx, { organizationId: actor.organizationId, actorId: actor.accountId, eventName: "ai.decision_recorded", subjectType: "ai_decision", subjectId: decisionId, reason: input.reason, after });
        const decision = await tx.aiDecision.create({ data: { id: decisionId, organizationId: actor.organizationId, runId: id, version, kind: "OUTCOME", actorId: actor.accountId, selectionEmployeeId: prior.selectionEmployeeId, selectionPurpose: prior.selectionPurpose, priorDecisionId: prior.id, sourceTaskId: input.taskId, observation: json(observation), reason: input.reason, eventId } });
        await tx.aiRun.update({ where: { id }, data: { decisionVersion: { increment: 1 } } });
        return { output: { id: row.id, decision: this.decisionOutput(decision), decisionVersion: version }, runId: id, decisionId };
      });
    });
  }
  private async verifyOutcome(tx: Tx, actor: Actor, run: AiRun, decision: AiDecision) {
    if (run.taskId === null || decision.selectionEmployeeId === null) throw new ConflictException("Selected task source is unavailable");
    if (decision.selectionPurpose === "COLLABORATOR") await transactionalReadPorts(this.tasks, tx).assistanceCollaboratorOutcome(actor, tx, run.taskId, decision.selectionEmployeeId, run.broaderSearch);
    else {
      const current = await this.currentCandidates(tx, actor, run);
      if (!current.has(decision.selectionEmployeeId)) throw new ConflictException("Selected employee is no longer eligible in the task's current scope");
    }
    const taskService = transactionalReadPorts(this.tasks, tx), task = await taskService.detail(actor, run.taskId), taskRow = object(task.task);
    let sourceState: string;
    if (decision.selectionPurpose === "PRIMARY_OWNER") {
      if (taskRow.primaryOwnerEmployeeId !== decision.selectionEmployeeId) throw new ConflictException("Current task owner does not match the selected employee");
      sourceState = "CURRENT_PRIMARY_OWNER";
    } else if (decision.selectionPurpose === "COLLABORATOR") {
      if (!task.collaborators.some((collaborator: { employeeId: string }) => collaborator.employeeId === decision.selectionEmployeeId)) throw new ConflictException("Current task collaborators do not match the selected employee");
      sourceState = "CURRENT_COLLABORATOR";
    } else {
      await transactionalReadPorts(this.reviews, tx).assistanceOutcome(actor, tx, run.taskId, decision.selectionEmployeeId, run.currentTeamId!, run.currentTeamBranchId!, run.broaderSearch);
      sourceState = "CURRENT_REVIEWER";
    }
    return { taskId: run.taskId, taskVersion: taskRow.version, purpose: decision.selectionPurpose, employeeId: decision.selectionEmployeeId, observedState: sourceState, observedAt: new Date().toISOString() };
  }
  private parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new BadRequestException("Invalid assistance request"); return result.data; }
}

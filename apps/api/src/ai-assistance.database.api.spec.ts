import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { ConflictException } from "@nestjs/common";
import { AccountKind, AccountState, TaskPriority, TaskType } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ProjectService, type ProjectActor } from "./project.service.js";
import { TaskService } from "./task.service.js";
import { ReviewService } from "./review.service.js";
import { ApprovalService } from "./approval.service.js";
import { DocumentService } from "./document.service.js";
import { RevisionService } from "./revision.service.js";
import { NotificationsService } from "./notifications.service.js";
import { TimeService } from "./time.service.js";
import { WorkforceService } from "./workforce.service.js";
import { PerformanceService } from "./performance.service.js";
import { DashboardService } from "./dashboard.service.js";
import { ClientPortalScopeService } from "./client-portal-scope.service.js";
import { TurnkeyService } from "./turnkey.service.js";
import { SiteService } from "./site.service.js";
import { SkillsService } from "./skills.service.js";
import { TrainingService } from "./training.service.js";
import { LibraryService } from "./library.service.js";
import { AiAssistanceService } from "./ai-assistance.service.js";
import { IdentityService } from "./identity.service.js";
import { OrganizationService } from "./organization.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import type { RuntimeConfig } from "./config.js";

const databaseUrl = process.env.S27_DATABASE_URL;
const databaseDescribe = process.env.S27_E2E_ENABLED === "1" && databaseUrl ? describe : describe.skip;
const config = (url: string): RuntimeConfig => ({ nodeEnv: "test", port: 4000, databaseUrl: url, webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined, nasRoot: ".env.s27-tools/nas" });
const commandId = () => randomUUID();

databaseDescribe("S27 assistance PostgreSQL invariants", () => {
  let database: DatabaseService;
  let assistance: AiAssistanceService;
  let owner: ProjectActor;
  let employeeId: string;
  let collaboratorEmployeeId: string;
  let teamOutOfScopeId: string;
  let suspendEmployee: (employeeId: string, reason: string) => Promise<unknown>;
  let moveEmployee: (employeeId: string, teamId: string, reason: string) => Promise<unknown>;

  beforeAll(async () => {
    const parsed = new URL(databaseUrl!);
    if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || parsed.port !== "57433" || !/^\/sense_s27_s27_[a-z0-9_]+_test$/i.test(parsed.pathname)) throw new Error("S27 PostgreSQL tests require the exact generated local S27 _test target on port 57433");
    database = new DatabaseService(config(databaseUrl!));
    const row = (await database.prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`)[0];
    if (row?.name !== parsed.pathname.slice(1)) throw new Error("S27 exact database target mismatch");

    const authorization = new AuthorizationService(database), projects = new ProjectService(database), tasks = new TaskService(database, authorization), approvals = new ApprovalService(database), notifications = new NotificationsService(database);
    const documents = new DocumentService(database, authorization, config(databaseUrl!)), revisions = new RevisionService(database, authorization, documents);
    const reviews = new ReviewService(database, authorization, documents, revisions, notifications), workforce = new WorkforceService(database, authorization, approvals, notifications, config(databaseUrl!));
    const portal = new ClientPortalScopeService(database, authorization), turnkey = new TurnkeyService(database, authorization, approvals, revisions, portal), site = new SiteService(database, authorization, documents, turnkey, workforce);
    const performance = new PerformanceService(database, authorization, revisions, approvals, workforce), time = new TimeService(database, authorization, tasks, documents);
    const dashboard = new DashboardService(database, projects, tasks, approvals, time, workforce, performance, revisions, reviews, documents, site, turnkey);
    const skills = new SkillsService(database, authorization, approvals), training = new TrainingService(database, authorization, tasks), library = new LibraryService(database, authorization, tasks, approvals, config(databaseUrl!));
    assistance = new AiAssistanceService(database, projects, tasks, reviews, authorization, dashboard, time, workforce, performance, skills, training, library);

    const suffix = randomUUID();
    const organization = await database.prisma.organization.findFirst() ?? await database.prisma.organization.create({ data: { name: `S27 DB ${suffix}` } });
    const branch = await database.prisma.branch.create({ data: { organizationId: organization.id, name: `S27 branch ${suffix}` } });
    const team = await database.prisma.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `S27 team ${suffix}` } });
    const otherTeam = await database.prisma.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `S27 other team ${suffix}` } });
    const account = await database.prisma.account.findFirst({ where: { kind: AccountKind.OWNER, state: AccountState.ACTIVE } }) ?? await database.prisma.account.create({ data: { normalizedEmail: `s27-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
    const staff = await database.prisma.account.create({ data: { normalizedEmail: `s27-staff-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
    const employee = await database.prisma.employee.create({ data: { organizationId: organization.id, accountId: staff.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
    const collaboratorAccount = await database.prisma.account.create({ data: { normalizedEmail: `s27-collaborator-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
    const collaboratorEmployee = await database.prisma.employee.create({ data: { organizationId: organization.id, accountId: collaboratorAccount.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01T00:00:00Z") } });
    await database.prisma.employeeMembershipHistory.create({ data: { employeeId: collaboratorEmployee.id, organizationId: organization.id, branchId: branch.id, teamId: team.id, effectiveFrom: new Date("2026-01-01T00:00:00Z"), recordedById: account.id, reason: "S27 collaborator membership fixture" } });
    owner = { accountId: account.id, organizationId: organization.id, kind: AccountKind.OWNER };
    employeeId = employee.id;
    collaboratorEmployeeId = collaboratorEmployee.id;
    const workflow = new ProjectWorkflowService(database, authorization, approvals);
    const organizationService = new OrganizationService(database, new IdentityService(database, config(databaseUrl!)), authorization, workflow, tasks, notifications);
    suspendEmployee = (id, reason) => organizationService.suspendEmployee(account.id, id, reason);
    moveEmployee = (id, teamId, reason) => organizationService.changeMembership(account.id, id, { organizationId: organization.id, branchId: branch.id, teamId, reason });
    teamOutOfScopeId = otherTeam.id;
  });

  afterAll(async () => { await database?.onModuleDestroy(); });

  async function createAssignmentRun(label: string) {
    const task = await new TaskService(database, new AuthorizationService(database)).create(owner, {
      title: `S27 ${label}`, type: TaskType.NON_PROJECT, priority: TaskPriority.MEDIUM, targetDate: "2026-10-30", ownerEmployeeId: employeeId, reason: `S27 database fixture ${label}`
    });
    const request = { commandId: commandId(), kind: "ASSIGNMENT" as const, taskId: task.id, purpose: "PRIMARY_OWNER" as const, from: "2026-10-07", to: "2026-10-07", reason: `S27 database run ${label}` };
    return { task, request, run: await assistance.createRun(owner, request) };
  }

  it("returns exact CREATE_RUN retries, rejects changed-command reuse, and serializes decision head races", async () => {
    const task = await new TaskService(database, new AuthorizationService(database)).create(owner, {
      title: "S27 idempotency and concurrency", type: TaskType.NON_PROJECT, priority: TaskPriority.MEDIUM, targetDate: "2026-10-30", ownerEmployeeId: employeeId, reason: "S27 fixture task for idempotency test"
    });
    const request = { commandId: commandId(), kind: "ASSIGNMENT" as const, taskId: task.id, purpose: "PRIMARY_OWNER" as const, from: "2026-10-07", to: "2026-10-07", reason: "S27 idempotent create" };
    const first = await assistance.createRun(owner, request);
    await expect(assistance.createRun(owner, request)).resolves.toMatchObject({ id: first.id, result: first.result });
    await expect(assistance.createRun(owner, { ...request, reason: "Different command payload" })).rejects.toBeInstanceOf(ConflictException);

    const decision = (id: string) => assistance.decide(owner, first.id, { commandId: id, expectedDecisionVersion: 0, outcome: "ACCEPTED", reason: "S27 concurrent human decision", selection: { purpose: "PRIMARY_OWNER", employeeId } });
    const outcomes = await Promise.allSettled([decision(commandId()), decision(commandId())]);
    expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((result) => result.status === "rejected")).toHaveLength(1);
    const rejected = outcomes.find((result): result is PromiseRejectedResult => result.status === "rejected")!;
    expect(rejected.reason).toBeInstanceOf(ConflictException);
  });

  it("replays a committed decision after the history version advances and rejects changed reuse", async () => {
    const { run } = await createAssignmentRun("decision-retry-after-advance");
    const firstCommand = { commandId: commandId(), expectedDecisionVersion: 0, outcome: "ACCEPTED" as const, reason: "S27 first human decision", selection: { purpose: "PRIMARY_OWNER" as const, employeeId } };
    const committed = await assistance.decide(owner, run.id, firstCommand);
    await assistance.decide(owner, run.id, { commandId: commandId(), expectedDecisionVersion: 1, outcome: "REJECTED", reason: "S27 later history entry" });

    await expect(assistance.decide(owner, run.id, firstCommand)).resolves.toMatchObject({
      id: run.id, decision: { id: committed.decision.id, version: 1 }, decisionVersion: 2
    });
    await expect(assistance.decide(owner, run.id, { ...firstCommand, reason: "Changed after commit" })).rejects.toBeInstanceOf(ConflictException);
    expect(await database.prisma.aiDecision.count({ where: { runId: run.id } })).toBe(2);
  });

  it("records an outcome for an authorized current collaborator and redacts stale identity from GET and receipt replay", async () => {
    const task = await new TaskService(database, new AuthorizationService(database)).create(owner, {
      title: "S27 collaborator outcome", type: TaskType.NON_PROJECT, priority: TaskPriority.MEDIUM, targetDate: "2026-10-30", ownerEmployeeId: employeeId, reason: "S27 collaborator outcome task"
    });
    const run = await assistance.createRun(owner, { commandId: commandId(), kind: "ASSIGNMENT", taskId: task.id, purpose: "COLLABORATOR", from: "2026-10-07", to: "2026-10-07", reason: "S27 collaborator suggestion" });
    const decision = await assistance.decide(owner, run.id, { commandId: commandId(), expectedDecisionVersion: 0, outcome: "ACCEPTED", reason: "S27 accept collaborator", selection: { purpose: "COLLABORATOR", employeeId: collaboratorEmployeeId } });
    await database.prisma.taskCollaborator.create({ data: { organizationId: owner.organizationId, taskId: task.id, employeeId: collaboratorEmployeeId, addedById: owner.accountId } });
    const outcomeCommand = { commandId: commandId(), expectedDecisionVersion: 1, decisionId: decision.decision.id, taskId: task.id, reason: "S27 verify persisted collaborator" };
    const outcome = await assistance.observeOutcome(owner, run.id, outcomeCommand);
    expect(outcome.decision.observation).toMatchObject({ taskId: task.id, purpose: "COLLABORATOR", employeeId: collaboratorEmployeeId, observedState: "CURRENT_COLLABORATOR" });

    const visible = await assistance.getRun(owner, run.id);
    expect(visible.request).not.toHaveProperty("authorizedInput");
    expect(visible.decisions.find((item) => item.id === outcome.decision.id)).toMatchObject({ selectionEmployeeId: collaboratorEmployeeId, observation: { employeeId: collaboratorEmployeeId } });
    await moveEmployee(collaboratorEmployeeId, teamOutOfScopeId, "S27 regression moves collaborator out of current Team scope");
    const redacted = await assistance.getRun(owner, run.id);
    expect(redacted.request).not.toHaveProperty("authorizedInput");
    expect(redacted.decisions.find((item) => item.id === outcome.decision.id)).toMatchObject({ selectionEmployeeId: null, selectionPurpose: null, observation: null });
    await expect(assistance.observeOutcome(owner, run.id, outcomeCommand)).resolves.toMatchObject({ decision: { id: outcome.decision.id, selectionEmployeeId: null, observation: null } });
  });

  it("denies retained output after source identity access is lost and enforces immutable stored evidence", async () => {
    const { task, run } = await createAssignmentRun("source-loss-and-immutability");
    const before = await database.prisma.aiRun.findUniqueOrThrow({ where: { id: run.id } });
    await expect(database.prisma.aiRun.update({ where: { id: run.id }, data: { request: { tampered: true } } })).rejects.toThrow();
    await expect(database.prisma.aiRun.update({ where: { id: run.id }, data: { decisionVersion: { increment: 1 } } })).rejects.toThrow();
    const receipt = await database.prisma.aiReceipt.findFirstOrThrow({ where: { runId: run.id } });
    await expect(database.prisma.aiReceipt.update({ where: { id: receipt.id }, data: { payloadHash: "f".repeat(64) } })).rejects.toThrow();

    await suspendEmployee(employeeId, "S27 regression suspends source access");
    await expect(assistance.getRun(owner, run.id)).rejects.toBeDefined();
    expect(await database.prisma.aiRun.findUniqueOrThrow({ where: { id: run.id } })).toMatchObject({ id: before.id, taskId: task.id, inputHash: before.inputHash, result: before.result });
  });
});

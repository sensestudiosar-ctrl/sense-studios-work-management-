import "reflect-metadata";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { jest } from "@jest/globals";
import { ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { AccountKind, AccountState, PermissionScopeKind, TaskPriority, TaskType } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { isS27DisposableTestTarget, matchesS27DisposableServer } from "./s27-disposable-test-target.js";
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
import { IdentityService } from "./identity.service.js";
import { AiAssistanceService } from "./ai-assistance.service.js";
import { AiAssistanceController } from "./ai-assistance.controller.js";
import { OrganizationService } from "./organization.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import type { RuntimeConfig } from "./config.js";

const databaseUrl = process.env.S27_SECURITY_DATABASE_URL;
const securityDescribe = process.env.S27_E2E_ENABLED === "1" && databaseUrl ? describe : describe.skip;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const config = (url: string): RuntimeConfig => ({ nodeEnv: "test", port: 4000, databaseUrl: url, webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined, nasRoot: ".env.s27-tools/nas" });
const commandId = () => randomUUID();
type SessionActor = ProjectActor & { sessionId: string };

securityDescribe("S27 assistance current-session authorization and source isolation", () => {
  let database: DatabaseService;
  let assistance: AiAssistanceService;
  let controller: AiAssistanceController;
  let tasks: TaskService;
  let projects: ProjectService;
  let organization: OrganizationService;
  let workflow: ProjectWorkflowService;
  let owner: SessionActor;
  let firstStaff: SessionActor;
  let secondStaff: SessionActor;
  let firstEmployeeId: string;
  let outsideTeamEmployeeId: string;
  let foreignBranchEmployeeId: string;
  let branchId: string;
  let teamId: string;

  async function makeSession(accountId: string, expiresAt = new Date(Date.now() + 60 * 60_000)) {
    const secret = randomBytes(32).toString("base64url");
    const csrf = createHmac("sha256", secret).update("csrf").digest("base64url");
    const row = await database.prisma.session.create({ data: { accountId, tokenHash: digest(secret), csrfTokenHash: digest(csrf), expiresAt } });
    return { id: row.id, csrf, request: { headers: { cookie: `sense_sid=${secret}`, origin: "http://localhost:5173" } } };
  }

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("S27_SECURITY_DATABASE_URL is required");
    const parsed = new URL(databaseUrl);
    const legacyS27 = ["localhost", "127.0.0.1"].includes(parsed.hostname) && parsed.port === "57433" && /^\/sense_s27_security_s27_[a-z0-9_]+_test$/i.test(parsed.pathname);
    const disposableS27 = isS27DisposableTestTarget("S27_SECURITY_DATABASE_URL", databaseUrl);
    if (!legacyS27 && !disposableS27) throw new Error("Refuse anything except the dedicated S27 security PostgreSQL target on loopback");
    const appConfig = config(databaseUrl);
    database = new DatabaseService(appConfig);
    const server = (await database.prisma.$queryRaw<Array<{ name: string; port: number }>>`SELECT current_database() AS name, inet_server_port() AS port`)[0];
    const databaseName = server?.name;
    if (databaseName !== parsed.pathname.slice(1)) throw new Error("S27 security exact database target mismatch");
    if (disposableS27 && !matchesS27DisposableServer(databaseUrl, databaseName, server!.port)) throw new Error("S27 security disposable database server mismatch");

    const authorization = new AuthorizationService(database);
    projects = new ProjectService(database);
    tasks = new TaskService(database, authorization);
    const approvals = new ApprovalService(database), notifications = new NotificationsService(database);
    const documents = new DocumentService(database, authorization, appConfig), revisions = new RevisionService(database, authorization, documents);
    const reviews = new ReviewService(database, authorization, documents, revisions, notifications);
    const workforce = new WorkforceService(database, authorization, approvals, notifications, appConfig);
    const portal = new ClientPortalScopeService(database, authorization), turnkey = new TurnkeyService(database, authorization, approvals, revisions, portal);
    const site = new SiteService(database, authorization, documents, turnkey, workforce);
    const performance = new PerformanceService(database, authorization, revisions, approvals, workforce), time = new TimeService(database, authorization, tasks, documents);
    const dashboard = new DashboardService(database, projects, tasks, approvals, time, workforce, performance, revisions, reviews, documents, site, turnkey);
    const skills = new SkillsService(database, authorization, approvals), training = new TrainingService(database, authorization, tasks), library = new LibraryService(database, authorization, tasks, approvals, appConfig);
    assistance = new AiAssistanceService(database, projects, tasks, reviews, authorization, dashboard, time, workforce, performance, skills, training, library);
    const identity = new IdentityService(database, appConfig);
    controller = new AiAssistanceController(identity, projects, assistance, appConfig);

    const suffix = randomUUID();
    const org = await database.prisma.organization.findFirst() ?? await database.prisma.organization.create({ data: { name: `S27 security ${suffix}` } });
    const branch = await database.prisma.branch.create({ data: { organizationId: org.id, name: `S27 security branch ${suffix}` } });
    const foreignBranch = await database.prisma.branch.create({ data: { organizationId: org.id, name: `S27 foreign branch ${suffix}` } });
    const team = await database.prisma.team.create({ data: { organizationId: org.id, branchId: branch.id, name: `S27 security team ${suffix}` } });
    const outsideTeam = await database.prisma.team.create({ data: { organizationId: org.id, branchId: branch.id, name: `S27 outside team ${suffix}` } });
    const foreignTeam = await database.prisma.team.create({ data: { organizationId: org.id, branchId: foreignBranch.id, name: `S27 foreign team ${suffix}` } });
    const ownerAccount = await database.prisma.account.findFirst({ where: { kind: AccountKind.OWNER, state: AccountState.ACTIVE } }) ?? await database.prisma.account.create({ data: { normalizedEmail: `s27-security-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
    const createStaff = async (name: string, homeBranchId: string, homeTeamId: string) => {
      const account = await database.prisma.account.create({ data: { normalizedEmail: `s27-security-${name}-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
      const employee = await database.prisma.employee.create({ data: { organizationId: org.id, accountId: account.id, homeBranchId, homeTeamId, hiredAt: new Date("2026-01-01T00:00:00Z") } });
      return { account, employee };
    };
    const first = await createStaff("first", branch.id, team.id), second = await createStaff("second", branch.id, team.id), outside = await createStaff("outside", branch.id, outsideTeam.id), foreign = await createStaff("foreign", foreignBranch.id, foreignTeam.id);
    const ownerSession = await makeSession(ownerAccount.id), firstSession = await makeSession(first.account.id), secondSession = await makeSession(second.account.id);
    owner = { accountId: ownerAccount.id, organizationId: org.id, kind: AccountKind.OWNER, sessionId: ownerSession.id };
    firstStaff = { accountId: first.account.id, organizationId: org.id, kind: AccountKind.STAFF, sessionId: firstSession.id };
    secondStaff = { accountId: second.account.id, organizationId: org.id, kind: AccountKind.STAFF, sessionId: secondSession.id };
    firstEmployeeId = first.employee.id;
    outsideTeamEmployeeId = outside.employee.id;
    foreignBranchEmployeeId = foreign.employee.id;
    branchId = branch.id; teamId = team.id;

    workflow = new ProjectWorkflowService(database, authorization, approvals);
    organization = new OrganizationService(database, identity, authorization, workflow, tasks, notifications);
  });

  afterAll(async () => { await database?.onModuleDestroy(); });

  it("uses a live staff session and keeps another staff member out of the run and decision", async () => {
    const firstSession = await makeSession(firstStaff.accountId), secondSession = await makeSession(secondStaff.accountId);
    const response = { setHeader: jest.fn() };
    const run = await controller.create(firstSession.request, response, firstSession.csrf, { commandId: commandId(), kind: "DAILY", from: "2026-10-07", to: "2026-10-07", reason: "S27 current-session daily brief" });
    expect(run.id).toBeTruthy();
    await expect(controller.get(secondSession.request, response, run.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.decide(secondSession.request, response, secondSession.csrf, run.id, { commandId: commandId(), expectedDecisionVersion: 0, outcome: "REJECTED", reason: "S27 foreign staff decision" })).rejects.toBeInstanceOf(NotFoundException);
    expect((await controller.list(secondSession.request, response)).items).not.toContainEqual(expect.objectContaining({ id: run.id }));

    const ownDecision = await controller.decide(firstSession.request, response, firstSession.csrf, run.id, { commandId: commandId(), expectedDecisionVersion: 0, outcome: "REJECTED", reason: "S27 own human decision" });
    expect(ownDecision.decisionVersion).toBe(1);
  });

  it("requires current task assignment scope, rejects forged project/candidate scope, and keeps decisions nonbinding", async () => {
    const grant = await organization.grantEmployeeOverride(owner.accountId, firstEmployeeId, { organizationId: firstStaff.organizationId, permissionKey: "task.assign", effect: "ALLOW", scope: { scopeKind: PermissionScopeKind.TEAM, branchId, teamId }, reason: "S27 security task assignment authority" });
    const task = await tasks.create(owner, { title: `S27 security task ${randomUUID()}`, type: TaskType.NON_PROJECT, priority: TaskPriority.MEDIUM, targetDate: "2026-10-30", ownerEmployeeId: firstEmployeeId, reason: "S27 security task fixture" });
    const staffSession = await makeSession(firstStaff.accountId), response = { setHeader: jest.fn() };
    const run = await controller.create(staffSession.request, response, staffSession.csrf, { commandId: commandId(), kind: "ASSIGNMENT", taskId: task.id, purpose: "PRIMARY_OWNER", from: "2026-10-07", to: "2026-10-07", reason: "S27 current Team owner suggestion" });
    const before = await database.prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    const decisionPayload = { commandId: commandId(), expectedDecisionVersion: 0, outcome: "ACCEPTED", reason: "S27 human selection", selection: { purpose: "PRIMARY_OWNER", employeeId: firstEmployeeId } };
    const decision = await controller.decide(staffSession.request, response, staffSession.csrf, run.id, decisionPayload);
    expect(decision.decisionVersion).toBe(1);
    const after = await database.prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(after).toMatchObject({ primaryOwnerEmployeeId: before.primaryOwnerEmployeeId, status: before.status, version: before.version });

    await expect(assistance.createRun(firstStaff, { commandId: commandId(), kind: "ASSIGNMENT", taskId: task.id, projectId: randomUUID(), purpose: "PRIMARY_OWNER", from: "2026-10-07", to: "2026-10-07", reason: "S27 mismatched project scope" })).rejects.toBeInstanceOf(ConflictException);
    await expect(assistance.createRun(firstStaff, { commandId: commandId(), kind: "ASSIGNMENT", taskId: randomUUID(), purpose: "PRIMARY_OWNER", from: "2026-10-07", to: "2026-10-07", reason: "S27 foreign task scope" })).rejects.toBeDefined();
    const collabRun = await assistance.createRun(owner, { commandId: commandId(), kind: "ASSIGNMENT", taskId: task.id, purpose: "COLLABORATOR", from: "2026-10-07", to: "2026-10-07", reason: "S27 collaborator scope" });
    await expect(assistance.decide(owner, collabRun.id, { commandId: commandId(), expectedDecisionVersion: 0, outcome: "OVERRIDDEN", reason: "S27 out-of-Team selection", selection: { purpose: "COLLABORATOR", employeeId: outsideTeamEmployeeId } })).rejects.toBeInstanceOf(ConflictException);
    await expect(assistance.decide(owner, collabRun.id, { commandId: commandId(), expectedDecisionVersion: 0, outcome: "OVERRIDDEN", reason: "S27 foreign Branch selection", selection: { purpose: "COLLABORATOR", employeeId: foreignBranchEmployeeId } })).rejects.toBeInstanceOf(ConflictException);
    await expect(assistance.createRun(firstStaff, { commandId: commandId(), kind: "ASSIGNMENT", taskId: task.id, purpose: "PRIMARY_OWNER", broaderSearch: true, from: "2026-10-07", to: "2026-10-07", reason: "S27 unsupported non-project broader search" })).rejects.toBeInstanceOf(ForbiddenException);

    await organization.revokeEmployeeOverride(owner.accountId, firstEmployeeId, grant.id, "S27 revoke task assignment scope");
    await expect(assistance.getRun(firstStaff, run.id)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(assistance.decide(firstStaff, run.id, { ...decisionPayload, commandId: commandId(), expectedDecisionVersion: 1, outcome: "REJECTED", selection: undefined })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(assistance.decide(firstStaff, run.id, decisionPayload)).rejects.toBeInstanceOf(ForbiddenException);
    expect((await assistance.listRuns(firstStaff)).items).not.toContainEqual(expect.objectContaining({ id: run.id }));
  });

  it("rejects revoked and expired sessions on context, list, read, create, and decision routes", async () => {
    const response = { setHeader: jest.fn() };
    const revoked = await makeSession(firstStaff.accountId);
    const expired = await makeSession(secondStaff.accountId, new Date(Date.now() - 60_000));
    await database.prisma.session.update({ where: { id: revoked.id }, data: { revokedAt: new Date() } });
    const staleRoutes = async (session: Awaited<ReturnType<typeof makeSession>>) => Promise.allSettled([
      controller.context(session.request, response), controller.list(session.request, response),
      controller.get(session.request, response, randomUUID()),
      controller.create(session.request, response, session.csrf, { commandId: commandId(), kind: "DAILY", from: "2026-10-07", to: "2026-10-07", reason: "S27 stale session create" }),
      controller.decide(session.request, response, session.csrf, randomUUID(), { commandId: commandId(), expectedDecisionVersion: 0, outcome: "REJECTED", reason: "S27 stale session decision" })
    ]);
    for (const session of [revoked, expired]) {
      const results = await staleRoutes(session);
      expect(results.every((result) => result.status === "rejected" && result.reason instanceof UnauthorizedException)).toBe(true);
    }
  });

  it("requires each existing permission in the explicit broader-search predicate", async () => {
    const created = await projects.create(owner, { branchId, title: `S27 security broader scope ${randomUUID()}`, deliveryType: "DESIGN", scopes: ["Delivery"], reason: "S27 broader-search project fixture" });
    const branchScope = { scopeKind: PermissionScopeKind.BRANCH, branchId } as const;
    await organization.grantEmployeeOverride(owner.accountId, firstEmployeeId, { organizationId: firstStaff.organizationId, permissionKey: "project.view", effect: "ALLOW", scope: branchScope, reason: "S27 project view for broader search" });
    await workflow.assignment(owner, created.project.id, { employeeId: firstEmployeeId, expectedVersion: 1, reason: "S27 assign task owner to project" });
    const task = await tasks.create(owner, { title: `S27 security project task ${randomUUID()}`, type: TaskType.PROJECT, projectId: created.project.id, priority: TaskPriority.MEDIUM, targetDate: "2026-10-30", ownerEmployeeId: firstEmployeeId, reason: "S27 broader-search task fixture" });
    const request = { kind: "ASSIGNMENT", taskId: task.id, purpose: "PRIMARY_OWNER", broaderSearch: true, from: "2026-10-07", to: "2026-10-07", reason: "S27 explicit broader search", commandId: commandId() } as const;

    await expect(assistance.createRun(firstStaff, request)).rejects.toBeInstanceOf(ForbiddenException);
    await organization.grantEmployeeOverride(owner.accountId, firstEmployeeId, { organizationId: firstStaff.organizationId, permissionKey: "task.assign", effect: "ALLOW", scope: branchScope, reason: "S27 task assignment for broader search" });
    await expect(assistance.createRun(firstStaff, { ...request, commandId: commandId() })).rejects.toBeInstanceOf(ForbiddenException);
    await organization.grantEmployeeOverride(owner.accountId, firstEmployeeId, { organizationId: firstStaff.organizationId, permissionKey: "project.manage", effect: "ALLOW", scope: branchScope, reason: "S27 project management for broader search" });
    await expect(assistance.createRun(firstStaff, { ...request, commandId: commandId() })).rejects.toBeInstanceOf(ForbiddenException);
    await organization.grantEmployeeOverride(owner.accountId, firstEmployeeId, { organizationId: firstStaff.organizationId, permissionKey: "employee.manage", effect: "ALLOW", scope: branchScope, reason: "S27 employee management for broader search" });
    const permitted = await assistance.createRun(firstStaff, { ...request, commandId: commandId() });
    expect(permitted.result.scope).toMatchObject({ broaderSearch: true, projectId: created.project.id });
  });
});

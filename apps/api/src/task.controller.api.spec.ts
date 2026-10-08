import "reflect-metadata";
import { ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { TaskController } from "./task.controller.js";
import { TaskService } from "./task.service.js";

const accountId = "55555555-5555-4555-8555-555555555555";
const organizationId = "44444444-4444-4444-8444-444444444444";
const taskId = "22222222-2222-4222-8222-222222222222";
const projectId = "11111111-1111-4111-8111-111111111111";
const employeeId = "33333333-3333-4333-8333-333333333333";
const otherEmployeeId = "66666666-6666-4666-8666-666666666666";
const token = "task-current-csrf";
const cookie = "sense_sid=task-session";
const origin = "http://localhost:5173";

describe("S09 task HTTP boundary", () => {
  let app: INestApplication;
  let kind: "OWNER" | "STAFF";
  let ready: boolean;
  let validSession: boolean;
  let identity: Record<string, jest.Mock>;
  let projects: Record<string, jest.Mock>;
  let tasks: Record<string, jest.Mock>;

  beforeAll(async () => {
    kind = "OWNER"; ready = true; validSession = true;
    identity = {
      session: jest.fn(async (secret?: string) => {
        if (!validSession || secret !== "task-session") throw new UnauthorizedException("Authentication required");
        return { row: { accountId }, csrfToken: token };
      }),
      ownerReady: jest.fn(async () => ready),
      verifyCsrf: jest.fn((active: { csrfToken: string }, supplied?: string) => {
        if (supplied !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
      })
    };
    projects = { actor: jest.fn(async () => ({ accountId, organizationId, kind })) };
    tasks = {
      setup: jest.fn(async () => ({ projects: [], employees: [] })),
      list: jest.fn(async () => ({ total: 0, items: [] })),
      attention: jest.fn(async () => ({ total: 0, items: [] })),
      detail: jest.fn(async () => ({ task: { id: taskId } })),
      dependencyCandidates: jest.fn(async () => ({ items: [] })),
      create: jest.fn(async () => ({ id: taskId })),
      transition: jest.fn(async () => ({ id: taskId, status: "IN_PROGRESS" })),
      wait: jest.fn(async () => ({ id: taskId, status: "WAITING" })),
      resume: jest.fn(async () => ({ id: taskId, status: "IN_PROGRESS" })),
      changeCommittedDate: jest.fn(async () => ({ id: taskId, committedDueDate: "2026-11-01" })),
      extensionApprovers: jest.fn(async () => ({ items: [] })),
      requestExtension: jest.fn(async () => ({ approvalId: projectId, state: "PENDING" })),
      decideExtension: jest.fn(async () => ({ approvalId: projectId, outcome: "APPROVED" })),
      withdrawExtension: jest.fn(async () => ({ approvalId: projectId, state: "WITHDRAWN" })),
      addDependency: jest.fn(async () => ({ taskId, version: 2 })),
      removeDependency: jest.fn(async () => ({ taskId, version: 3 })),
      reassign: jest.fn(async () => ({ id: taskId, primaryOwnerEmployeeId: otherEmployeeId })),
      createCloseout: jest.fn(async () => ({ id: taskId, type: "CLOSEOUT" })),
      revokeCloseout: jest.fn(async (actor: { kind: string }) => {
        if (actor.kind !== "OWNER") throw new ForbiddenException("Owner access is required");
        return { revoked: true };
      })
    };
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: origin, ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({ controllers: [TaskController], providers: [
      { provide: IdentityService, useValue: identity }, { provide: ProjectService, useValue: projects },
      { provide: TaskService, useValue: tasks }, { provide: RUNTIME_CONFIG, useValue: config }
    ] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix("api/v1"); await app.init();
  });
  beforeEach(() => { kind = "OWNER"; ready = true; validSession = true; jest.clearAllMocks(); });
  afterAll(async () => app.close());

  const taskBody = { title: "Prepare project brief", type: "NON_PROJECT", priority: "HIGH", targetDate: "2026-10-15", reason: "Create assigned studio work" };
  const write = (method: "post" | "put", path: string, body: object) => request(app.getHttpServer())[method](`/api/v1/tasks${path}`).set("Cookie", cookie).set("Origin", origin).set("x-csrf-token", token).send(body);

  it("requires a live session and completed Owner identity setup, and sends no-store reads", async () => {
    validSession = false;
    expect((await request(app.getHttpServer()).get("/api/v1/tasks/setup").set("Cookie", cookie)).status).toBe(401);
    validSession = true; ready = false;
    expect((await request(app.getHttpServer()).get("/api/v1/tasks/setup").set("Cookie", cookie)).status).toBe(403);
    ready = true; kind = "STAFF";
    const setup = await request(app.getHttpServer()).get("/api/v1/tasks/setup").set("Cookie", cookie);
    const list = await request(app.getHttpServer()).get("/api/v1/tasks?scope=mine&offset=10&limit=20").set("Cookie", cookie);
    const detail = await request(app.getHttpServer()).get(`/api/v1/tasks/${taskId}`).set("Cookie", cookie);
    expect([setup.status, list.status, detail.status]).toEqual([200, 200, 200]);
    expect([setup.headers["cache-control"], list.headers["cache-control"], detail.headers["cache-control"]]).toEqual(["no-store", "no-store", "no-store"]);
    expect(tasks.list).toHaveBeenCalledWith(expect.objectContaining({ accountId, kind: "STAFF" }), "mine", 10, 20, { sort: "created_desc" });
    expect(tasks.detail).toHaveBeenCalledWith(expect.objectContaining({ accountId }), taskId);
  });

  it("forwards the explicit personal scope without substituting management", async () => {
    const result = await request(app.getHttpServer()).get("/api/v1/tasks?scope=personal").set("Cookie", cookie);
    expect(result.status).toBe(200);
    expect(tasks.list).toHaveBeenCalledWith(expect.objectContaining({ accountId }), "personal", 0, 50, { sort: "created_desc" });
  });
  it("normalizes server filters and rejects invalid filters before list execution", async () => {
    const filtered = await request(app.getHttpServer()).get(`/api/v1/tasks?scope=mine&projectId=${projectId}&ownerEmployeeId=${employeeId}&q=%20Brief%20&status=WAITING`).set("Cookie", cookie);
    expect(filtered.status).toBe(200);
    expect(tasks.list).toHaveBeenCalledWith(expect.objectContaining({ accountId }), "mine", 0, 50, { projectId, ownerEmployeeId: employeeId, q: "Brief", status: "WAITING", sort: "created_desc" });
    tasks.list.mockClear();
    for (const filter of ["projectId=wrong", "ownerEmployeeId=wrong", "status=unknown", `q=${"x".repeat(161)}`]) {
      const invalid = await request(app.getHttpServer()).get(`/api/v1/tasks?scope=mine&${filter}`).set("Cookie", cookie);
      expect(invalid.status).toBe(400);
    }
    expect(tasks.list).not.toHaveBeenCalled();
  });
  it("validates explicit task phase and date bounds", async () => {
    const valid = await request(app.getHttpServer()).get("/api/v1/tasks?scope=personal&phase=active&dateBasis=committed&dateFrom=2026-10-03&dateTo=2026-10-10").set("Cookie", cookie);
    expect(valid.status).toBe(200);
    expect(tasks.list).toHaveBeenCalledWith(expect.objectContaining({ accountId }), "personal", 0, 50, { phase: "active", dateBasis: "committed", dateFrom: "2026-10-03", dateTo: "2026-10-10", sort: "created_desc" });
    tasks.list.mockClear();
    for (const invalid of ["phase=wrong", "dateBasis=other", "dateFrom=bad", "dateFrom=2026-10-10", "dateBasis=target&dateFrom=2026-10-10&dateTo=2026-10-03", "requiresReassignment=yes"]) {
      expect((await request(app.getHttpServer()).get(`/api/v1/tasks?scope=personal&${invalid}`).set("Cookie", cookie)).status).toBe(400);
    }
    expect(tasks.list).not.toHaveBeenCalled();
  });

  it("validates independent task attention sources and paging", async () => {
    const valid = await request(app.getHttpServer()).get("/api/v1/tasks/attention?kind=reassignment&offset=50&limit=20").set("Cookie", cookie);
    expect(valid.status).toBe(200);
    expect(tasks.attention).toHaveBeenCalledWith(expect.objectContaining({ accountId }), "reassignment", 50, 20);
    expect(valid.headers["cache-control"]).toBe("no-store");
    tasks.attention.mockClear();
    expect((await request(app.getHttpServer()).get("/api/v1/tasks/attention?kind=all").set("Cookie", cookie)).status).toBe(400);
    expect(tasks.attention).not.toHaveBeenCalled();
  });

  it("forwards supported list scopes and defaults sort, while validating pagination and UUIDs", async () => {
    for (const scope of ["mine", "assigned", "personal", "all", "owned", "created", "collaborating"]) {
      tasks.list.mockClear();
      const validScope = await request(app.getHttpServer()).get(`/api/v1/tasks?scope=${scope}`).set("Cookie", cookie);
      expect(validScope.status).toBe(200);
      expect(tasks.list).toHaveBeenCalledWith(expect.objectContaining({ accountId }), scope, 0, 50, { sort: "created_desc" });
    }
    tasks.list.mockClear();
    const explicitSort = await request(app.getHttpServer()).get("/api/v1/tasks?scope=all&sort=target_asc").set("Cookie", cookie);
    expect(explicitSort.status).toBe(200);
    expect(tasks.list).toHaveBeenCalledWith(expect.objectContaining({ accountId }), "all", 0, 50, { sort: "target_asc" });
    tasks.list.mockClear();
    const badScope = await request(app.getHttpServer()).get("/api/v1/tasks?scope=invalid").set("Cookie", cookie);
    const badOffset = await request(app.getHttpServer()).get("/api/v1/tasks?scope=mine&offset=-1").set("Cookie", cookie);
    const badLimit = await request(app.getHttpServer()).get("/api/v1/tasks?scope=assigned&limit=101").set("Cookie", cookie);
    const badId = await request(app.getHttpServer()).get("/api/v1/tasks/not-a-uuid").set("Cookie", cookie);
    const badSort = await request(app.getHttpServer()).get("/api/v1/tasks?scope=mine&sort=unknown").set("Cookie", cookie);
    expect([badScope.status, badOffset.status, badLimit.status, badId.status, badSort.status]).toEqual([400, 400, 400, 400, 400]);
    expect(tasks.list).not.toHaveBeenCalled();
    expect(tasks.detail).not.toHaveBeenCalled();
  });

  it("enforces origin and CSRF and rejects malformed or extra command fields", async () => {
    const wrongOrigin = await request(app.getHttpServer()).post("/api/v1/tasks").set("Cookie", cookie).set("Origin", "https://attacker.test").set("x-csrf-token", token).send(taskBody);
    const noCsrf = await request(app.getHttpServer()).post("/api/v1/tasks").set("Cookie", cookie).set("Origin", origin).send(taskBody);
    const extra = await write("post", "", { ...taskBody, status: "COMPLETED" });
    const invalidDate = await write("post", "", { ...taskBody, targetDate: "15-10-2026" });
    const invalidVersion = await write("post", `/${taskId}/state`, { toState: "COMPLETED", expectedVersion: 0, reason: "Bad version" });
    const extraTransition = await write("post", `/${taskId}/state`, { toState: "IN_PROGRESS", expectedVersion: 1, reason: "Begin" , force: true });
    expect([wrongOrigin.status, noCsrf.status, extra.status, invalidDate.status, invalidVersion.status, extraTransition.status]).toEqual([403, 403, 400, 400, 400, 400]);
    expect(tasks.create).not.toHaveBeenCalled();
    expect(tasks.transition).not.toHaveBeenCalled();
  });

  it("forwards create, transition and reassign requests with normalized strict values and maps stale conflicts", async () => {
    const create = await write("post", "", { ...taskBody, title: "  Prepare project brief  " });
    const transition = await write("post", `/${taskId}/state`, { toState: "IN_PROGRESS", expectedVersion: 2, reason: "Begin assigned work" });
    const reassign = await write("post", `/${taskId}/reassign`, { newOwnerEmployeeId: otherEmployeeId, expectedVersion: 2, reason: "Rebalance workload" });
    expect([create.status, transition.status, reassign.status]).toEqual([201, 201, 201]);
    expect(tasks.create).toHaveBeenCalledWith(expect.objectContaining({ accountId, kind: "OWNER" }), { ...taskBody, title: "Prepare project brief" });
    expect(tasks.transition).toHaveBeenCalledWith(expect.objectContaining({ kind: "OWNER" }), taskId, { toState: "IN_PROGRESS", expectedVersion: 2, reason: "Begin assigned work" });
    expect(tasks.reassign).toHaveBeenCalledWith(expect.objectContaining({ kind: "OWNER" }), taskId, { newOwnerEmployeeId: otherEmployeeId, expectedVersion: 2, reason: "Rebalance workload" });

    tasks.transition.mockImplementationOnce(async () => { throw new ConflictException("Task changed. Refresh and retry"); });
    const stale = await write("post", `/${taskId}/state`, { toState: "COMPLETED", expectedVersion: 1, reason: "Stale task version" });
    expect(stale.status).toBe(409);
  });

  it("forwards approved closeout creation and Owner-only revocation with strict bodies", async () => {
    const closeoutBody = { projectId, ownerEmployeeId: employeeId, title: "Return keys", workScope: "Return keys and archive handover notes", targetDate: "2026-10-20", priority: "MEDIUM", reason: "Approved closeout scope" };
    const created = await write("post", "/closeout", closeoutBody);
    kind = "STAFF";
    const denied = await write("post", `/${taskId}/closeout/revoke`, { reason: "Attempt revoke" });
    expect([created.status, denied.status]).toEqual([201, 403]);
    expect(tasks.createCloseout).toHaveBeenCalledWith(expect.objectContaining({ kind: "OWNER" }), closeoutBody);
    expect(tasks.revokeCloseout).toHaveBeenCalledWith(expect.objectContaining({ kind: "STAFF" }), taskId, "Attempt revoke");
    const badId = await write("post", "/not-a-uuid/closeout/revoke", { reason: "Malformed ID" });
    const extra = await write("post", `/${taskId}/closeout/revoke`, { reason: "Revoke", force: true });
    const invalidCloseout = await write("post", "/closeout", { ...closeoutBody, workScope: "  " });
    expect([badId.status, extra.status, invalidCloseout.status]).toEqual([400, 400, 400]);
    expect(tasks.revokeCloseout).toHaveBeenCalledTimes(1);
    expect(tasks.createCloseout).toHaveBeenCalledTimes(1);
  });

  it("forwards normalized ordinary wait/resume and rejects missing cause, invalid metadata and tampered states", async () => {
    const waitBody = { expectedVersion: 2, reason: "Waiting for response", delayCause: "  Client pending  ", responsibleParty: "  Primary client  " };
    expect((await write("post", `/${taskId}/wait`, waitBody)).status).toBe(201);
    expect(tasks.wait).toHaveBeenCalledWith(expect.objectContaining({ accountId }), taskId, { expectedVersion: 2, reason: "Waiting for response", delayCause: "Client pending", responsibleParty: "Primary client" });
    expect((await write("post", `/${taskId}/resume`, { expectedVersion: 3, reason: "Client replied" })).status).toBe(201);
    expect(tasks.resume).toHaveBeenCalledWith(expect.objectContaining({ accountId }), taskId, { expectedVersion: 3, reason: "Client replied" });
    for (const body of [{ expectedVersion: 2, reason: "Waiting response" }, { ...waitBody, delayCause: " " }, { ...waitBody, responsibleParty: " " }, { ...waitBody, responsibleParty: "x".repeat(161) }, { ...waitBody, status: "COMPLETED" }, { ...waitBody, expectedVersion: 0 }]) expect((await write("post", `/${taskId}/wait`, body)).status).toBe(400);
    expect((await write("post", `/${taskId}/resume`, { expectedVersion: 3, reason: "Client replied", toState: "COMPLETED" })).status).toBe(400);
    expect((await request(app.getHttpServer()).post(`/api/v1/tasks/${taskId}/wait`).set("Cookie", cookie).set("Origin", origin).send(waitBody)).status).toBe(403);
    expect((await request(app.getHttpServer()).post(`/api/v1/tasks/${taskId}/resume`).set("Cookie", cookie).set("Origin", "https://attacker.test").set("x-csrf-token", token).send({ expectedVersion: 3, reason: "Client replied" })).status).toBe(403);
    expect(tasks.wait).toHaveBeenCalledTimes(1);
    expect(tasks.resume).toHaveBeenCalledTimes(1);
  });

  it("accepts only an exact reasoned committed-date command under session, origin and CSRF guards", async () => {
    const body = { expectedVersion: 2, committedDueDate: "2026-11-01", reason: "  Confirmed management deadline  " };
    expect((await write("post", `/${taskId}/committed-date`, body)).status).toBe(201);
    expect(tasks.changeCommittedDate).toHaveBeenCalledWith(expect.objectContaining({ accountId }), taskId, { expectedVersion: 2, committedDueDate: "2026-11-01", reason: "Confirmed management deadline" });
    for (const invalid of [
      { ...body, reason: " " }, { ...body, expectedVersion: 0 }, { ...body, committedDueDate: "2026-02-30" },
      { ...body, committedDueDate: null }, { ...body, targetDate: "2026-11-01" }
    ]) expect((await write("post", `/${taskId}/committed-date`, invalid)).status).toBe(400);
    expect((await request(app.getHttpServer()).post(`/api/v1/tasks/${taskId}/committed-date`).set("Cookie", cookie).set("Origin", origin).send(body)).status).toBe(403);
    expect((await request(app.getHttpServer()).post(`/api/v1/tasks/${taskId}/committed-date`).set("Cookie", cookie).set("Origin", "https://attacker.test").set("x-csrf-token", token).send(body)).status).toBe(403);
    expect(tasks.changeCommittedDate).toHaveBeenCalledTimes(1);
  });

  it("validates same-task dependency commands and protects candidate reads with a live session", async () => {
    expect((await request(app.getHttpServer()).get(`/api/v1/tasks/${taskId}/dependency-candidates`).set("Cookie", cookie)).status).toBe(200);
    expect(tasks.dependencyCandidates).toHaveBeenCalledWith(expect.objectContaining({ accountId }), taskId, "");
    expect((await request(app.getHttpServer()).get(`/api/v1/tasks/${taskId}/dependency-candidates?q=drawings`).set("Cookie", cookie)).status).toBe(200);
    expect(tasks.dependencyCandidates).toHaveBeenCalledWith(expect.objectContaining({ accountId }), taskId, "drawings");
    const addBody = { predecessorTaskId: projectId, expectedVersion: 1, reason: "Source drawings first" };
    expect((await write("post", `/${taskId}/dependencies`, addBody)).status).toBe(201);
    expect(tasks.addDependency).toHaveBeenCalledWith(expect.objectContaining({ accountId }), taskId, addBody);
    expect((await write("post", `/${taskId}/dependencies`, { ...addBody, hidden: true })).status).toBe(400);
    expect((await write("post", `/${taskId}/dependencies/${projectId}/remove`, { expectedVersion: 2, reason: "Source work replaced" })).status).toBe(201);
    expect(tasks.removeDependency).toHaveBeenCalledWith(expect.objectContaining({ accountId }), taskId, projectId, { expectedVersion: 2, reason: "Source work replaced" });
    expect((await request(app.getHttpServer()).post(`/api/v1/tasks/${taskId}/dependencies`).set("Cookie", cookie).set("Origin", origin).send(addBody)).status).toBe(403);
    expect((await request(app.getHttpServer()).post(`/api/v1/tasks/${taskId}/dependencies`).set("Cookie", cookie).set("Origin", "https://attacker.test").set("x-csrf-token", token).send(addBody)).status).toBe(403);
    validSession = false;
    expect((await request(app.getHttpServer()).get(`/api/v1/tasks/${taskId}/dependency-candidates`).set("Cookie", cookie)).status).toBe(401);
    validSession = true;
  });

  it("validates extension approver reads, requests and decisions at the HTTP boundary", async () => {
    expect((await request(app.getHttpServer()).get(`/api/v1/tasks/${taskId}/extension-approvers`).set("Cookie", cookie)).status).toBe(200);
    const body = { expectedVersion: 2, proposedDate: "2026-11-02", approverAccountId: accountId, reason: "  Supplier date changed  " };
    expect((await write("post", `/${taskId}/extension-requests`, body)).status).toBe(201);
    expect(tasks.requestExtension).toHaveBeenCalledWith(expect.objectContaining({ accountId }), taskId, { ...body, reason: "Supplier date changed" });
    expect((await write("post", `/${taskId}/extension-requests/${projectId}/decision`, { outcome: "APPROVED", reason: "  Plan accepted  " })).status).toBe(201);
    expect(tasks.decideExtension).toHaveBeenCalledWith(expect.objectContaining({ accountId }), taskId, projectId, { outcome: "APPROVED", reason: "Plan accepted" });
    expect((await write("post", `/${taskId}/extension-requests/${projectId}/withdraw`, { reason: "Withdraw stale approval" })).status).toBe(201);
    expect(tasks.withdrawExtension).toHaveBeenCalledWith(expect.objectContaining({ accountId }), taskId, projectId, "Withdraw stale approval");
    expect((await write("post", `/${taskId}/extension-requests`, { ...body, hidden: true })).status).toBe(400);
    expect((await write("post", `/${taskId}/extension-requests/${projectId}/decision`, { outcome: "DELEGATED", reason: "Invalid decision" })).status).toBe(400);
    expect((await request(app.getHttpServer()).post(`/api/v1/tasks/${taskId}/extension-requests`).set("Cookie", cookie).set("Origin", "https://attacker.test").set("x-csrf-token", token).send(body)).status).toBe(403);
    expect((await request(app.getHttpServer()).post(`/api/v1/tasks/${taskId}/extension-requests`).set("Cookie", cookie).set("Origin", origin).send(body)).status).toBe(403);
  });
});

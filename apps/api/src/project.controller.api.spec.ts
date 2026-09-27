import "reflect-metadata";
import { ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectController } from "./project.controller.js";
import { ProjectService } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";

const accountId = "55555555-5555-4555-8555-555555555555";
const branchId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const employeeId = "33333333-3333-4333-8333-333333333333";
const secondAccountId = "66666666-6666-4666-8666-666666666666";
const token = "project-current-csrf";
const cookie = "sense_sid=project-session";

describe("S07A Draft project HTTP boundary", () => {
  let app: INestApplication;
  let kind: "OWNER" | "STAFF";
  let ready: boolean;
  let validSession: boolean;
  let service: Record<string, jest.Mock>;
  let workflows: Record<string, jest.Mock>;
  beforeAll(async () => {
    kind = "OWNER"; ready = true; validSession = true;
    const identity = {
      session: jest.fn(async (secret?: string) => {
        if (!validSession || secret !== "project-session") throw new UnauthorizedException("Authentication required");
        return { row: { accountId }, csrfToken: token };
      }),
      ownerReady: jest.fn(async () => ready),
      verifyCsrf: jest.fn((active: { csrfToken: string }, supplied?: string) => {
        if (supplied !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
      })
    };
    service = {
      actor: jest.fn(async () => ({ accountId, kind, organizationId: "44444444-4444-4444-8444-444444444444" })),
      create: jest.fn(async () => ({ project: { id: projectId } }))
    };
    const ownerOnly = (name: string) => jest.fn(async (actor: { kind: string }) => {
      if (actor.kind !== "OWNER") throw new ForbiddenException("Owner access is required");
      return { action: name };
    });
    workflows = {
      setup: jest.fn(async () => ({ branches: [] })), list: jest.fn(async () => ({ items: [], total: 0 })),
      detail: jest.fn(async () => ({ project: { id: projectId } })),
      assignment: ownerOnly("assignment"), revokeAssignment: ownerOnly("revokeAssignment"), lead: ownerOnly("lead"),
      status: ownerOnly("status"), transfer: ownerOnly("transfer"), setScopeApprover: ownerOnly("setScopeApprover"),
      requestScope: jest.fn(async () => ({ changeId: projectId })), decideScope: jest.fn(async () => ({ decided: true })), withdrawScope: ownerOnly("withdrawScope"),
      requestCancellation: jest.fn(async () => ({ id: projectId }))
    };
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: "http://localhost:5173", ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({ controllers: [ProjectController], providers: [
      { provide: IdentityService, useValue: identity }, { provide: ProjectService, useValue: service },
      { provide: ProjectWorkflowService, useValue: workflows }, { provide: RUNTIME_CONFIG, useValue: config }
    ] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix("api/v1"); await app.init();
  });
  beforeEach(() => { kind = "OWNER"; ready = true; validSession = true; jest.clearAllMocks(); });
  afterAll(async () => app.close());
  const createBody = { branchId, title: "Studio project", deliveryType: "DESIGN", scopes: ["Architecture", "Interior Design"], reason: "Signed design commission" };
  const create = (body: object) => request(app.getHttpServer()).post("/api/v1/projects").set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", token).send(body);

  it("requires an active session, completed Owner setup and Owner authority", async () => {
    validSession = false;
    expect((await request(app.getHttpServer()).get("/api/v1/projects/setup")).status).toBe(401);
    validSession = true; ready = false;
    expect((await request(app.getHttpServer()).get("/api/v1/projects/setup").set("Cookie", cookie)).status).toBe(403);
    ready = true; kind = "STAFF";
    expect((await request(app.getHttpServer()).get("/api/v1/projects/setup").set("Cookie", cookie)).status).toBe(200);
    expect(workflows.setup).toHaveBeenCalledWith(expect.objectContaining({ kind: "STAFF" }));
  });

  it("enforces origin, CSRF and strict project input", async () => {
    const wrongOrigin = await request(app.getHttpServer()).post("/api/v1/projects").set("Cookie", cookie).set("Origin", "https://attacker.test").set("x-csrf-token", token).send(createBody);
    const noCsrf = await request(app.getHttpServer()).post("/api/v1/projects").set("Cookie", cookie).set("Origin", "http://localhost:5173").send(createBody);
    const extra = await create({ ...createBody, status: "ACTIVE" });
    const badScope = await create({ ...createBody, scopes: [] });
    const badLead = await create({ ...createBody, wonLeadId: "not-a-uuid" });
    expect([wrongOrigin.status, noCsrf.status, extra.status, badScope.status, badLead.status]).toEqual([403, 403, 400, 400, 400]);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("passes normalized valid create data and returns no-store reads", async () => {
    const created = await create(createBody);
    expect(created.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ accountId, kind: "OWNER" }), createBody);
    const list = await request(app.getHttpServer()).get(`/api/v1/projects?branchId=${branchId}`).set("Cookie", cookie);
    const detail = await request(app.getHttpServer()).get(`/api/v1/projects/${projectId}`).set("Cookie", cookie);
    expect([list.status, detail.status]).toEqual([200, 200]);
    expect(list.headers["cache-control"]).toBe("no-store");
    expect(detail.headers["cache-control"]).toBe("no-store");
    expect(workflows.list).toHaveBeenCalledWith(expect.objectContaining({ accountId }), branchId, 0, 50);
  });

  it("rejects malformed IDs and pagination before service calls", async () => {
    const badBranch = await request(app.getHttpServer()).get("/api/v1/projects?branchId=wrong").set("Cookie", cookie);
    const badPage = await request(app.getHttpServer()).get(`/api/v1/projects?branchId=${branchId}&limit=101`).set("Cookie", cookie);
    const badId = await request(app.getHttpServer()).get("/api/v1/projects/wrong").set("Cookie", cookie);
    expect([badBranch.status, badPage.status, badId.status]).toEqual([400, 400, 400]);
    expect(workflows.list).not.toHaveBeenCalled();
    expect(workflows.detail).not.toHaveBeenCalled();
  });

  const write = (method: "post" | "delete", path: string, body: object) => request(app.getHttpServer())[method](`/api/v1/projects/${path}`).set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", token).send(body);
  it("routes every workflow command with strict bodies, CSRF and optimistic versions", async () => {
    const cases: Array<["post" | "delete", string, object, jest.Mock]> = [
      ["post", `${projectId}/assignments`, { employeeId, expectedVersion: 2, reason: "Assigned for delivery" }, workflows.assignment],
      ["delete", `${projectId}/assignments/${employeeId}`, { expectedVersion: 2, reason: "Assignment ended" }, workflows.revokeAssignment],
      ["post", `${projectId}/lead`, { employeeId, expectedVersion: 2, reason: "Lead appointed" }, workflows.lead],
      ["post", `${projectId}/status`, { toStatus: "ON_HOLD", expectedVersion: 2, reason: "Client pause" }, workflows.status],
      ["post", `${projectId}/transfer`, { toBranchId: branchId, expectedVersion: 2, reason: "Approved transfer" }, workflows.transfer],
      ["post", `${projectId}/scope-approver`, { accountId: secondAccountId, expectedVersion: 2, reason: "Approver assigned" }, workflows.setScopeApprover],
      ["post", `${projectId}/scope-requests`, { name: "Landscape", expectedVersion: 2, reason: "Client requested" }, workflows.requestScope],
      ["post", `${projectId}/scope-requests/${projectId}/decision`, { outcome: "REJECTED", reason: "Outside baseline" }, workflows.decideScope],
      ["post", `${projectId}/scope-requests/${projectId}/withdraw`, { reason: "Request was superseded" }, workflows.withdrawScope],
      ["post", `${projectId}/cancellation-requests`, { reason: "Client ended the engagement" }, workflows.requestCancellation]
    ];
    for (const [method, path, body, fn] of cases) {
      const response = await write(method, path, body);
      expect(response.status).toBe(method === "delete" ? 200 : 201);
      expect(fn).toHaveBeenCalled();
    }
    expect(workflows.assignment).toHaveBeenCalledWith(expect.objectContaining({ kind: "OWNER" }), projectId, { employeeId, expectedVersion: 2, reason: "Assigned for delivery" });
    const wrongOrigin = await request(app.getHttpServer()).post(`/api/v1/projects/${projectId}/status`).set("Cookie", cookie).set("Origin", "https://attacker.test").set("x-csrf-token", token).send({ toStatus: "ON_HOLD", expectedVersion: 2, reason: "Client pause" });
    const noCsrf = await request(app.getHttpServer()).post(`/api/v1/projects/${projectId}/transfer`).set("Cookie", cookie).set("Origin", "http://localhost:5173").send({ toBranchId: branchId, expectedVersion: 2, reason: "Approved transfer" });
    const withdrawWrongOrigin = await request(app.getHttpServer()).post(`/api/v1/projects/${projectId}/scope-requests/${projectId}/withdraw`).set("Cookie", cookie).set("Origin", "https://attacker.test").set("x-csrf-token", token).send({ reason: "Superseded" });
    const withdrawNoCsrf = await request(app.getHttpServer()).post(`/api/v1/projects/${projectId}/scope-requests/${projectId}/withdraw`).set("Cookie", cookie).set("Origin", "http://localhost:5173").send({ reason: "Superseded" });
    const withdrawExtra = await write("post", `${projectId}/scope-requests/${projectId}/withdraw`, { reason: "Superseded", force: true });
    const extra = await write("post", `${projectId}/status`, { toStatus: "CANCELLED", expectedVersion: 2, reason: "Cancelled", force: true });
    const staleInput = await write("post", `${projectId}/status`, { toStatus: "ACTIVE", expectedVersion: 0, reason: "Resume" });
    expect([wrongOrigin.status, noCsrf.status, withdrawWrongOrigin.status, withdrawNoCsrf.status, withdrawExtra.status, extra.status, staleInput.status]).toEqual([403, 403, 403, 403, 400, 400, 400]);
    expect(workflows.status).toHaveBeenCalledTimes(1);
  });

  it("keeps Owner-only commands behind the workflow authority boundary and propagates stale-version conflicts", async () => {
    kind = "STAFF";
    const denied = await write("post", `${projectId}/assignments`, { employeeId, expectedVersion: 2, reason: "Cross-branch request" });
    const withdrawDenied = await write("post", `${projectId}/scope-requests/${projectId}/withdraw`, { reason: "Withdraw request" });
    expect([denied.status, withdrawDenied.status]).toEqual([403, 403]);
    expect(workflows.withdrawScope).toHaveBeenCalledWith(expect.objectContaining({ kind: "STAFF" }), projectId, projectId, "Withdraw request");
    kind = "OWNER";
    workflows.status.mockImplementationOnce(async () => { throw new ConflictException("Project changed. Refresh and retry"); });
    const stale = await write("post", `${projectId}/status`, { toStatus: "ON_HOLD", expectedVersion: 1, reason: "Client pause" });
    expect(stale.status).toBe(409);
    expect(workflows.status).toHaveBeenCalledWith(expect.objectContaining({ kind: "OWNER" }), projectId, { toStatus: "ON_HOLD", expectedVersion: 1, reason: "Client pause" });
  });

  it("exposes cancellation requests without an effective cancellation command", async () => {
    const requested = await write("post", `${projectId}/cancellation-requests`, { reason: "Client ended the engagement" });
    const effective = await write("post", `${projectId}/cancel`, { expectedVersion: 2, reason: "Stop all work" });
    expect(requested.status).toBe(201);
    expect(effective.status).toBe(404);
    expect(workflows.requestCancellation).toHaveBeenCalledTimes(1);
  });
});

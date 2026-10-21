import "reflect-metadata";
import { ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { OrganizationController } from "./organization.controller.js";
import { OrganizationService } from "./organization.service.js";

const ownerId = "c64f2145-5810-4a7e-9485-fbe9099c50cf";
const csrfToken = "csrf-token-for-current-session";
const sessionSecret = "session-secret-that-must-stay-in-cookie";

describe("organization HTTP security contract", () => {
  let app: INestApplication;
  let kind: "OWNER" | "STAFF";
  let isReady: boolean;
  let sessionCreatedAt: Date;
  let service: { myEmployeeProfile: jest.Mock; createBranch: jest.Mock; listEmployees: jest.Mock; listManagedEmployees: jest.Mock; changeManagedEmployeeReporting: jest.Mock; finalizeEmployeeExit: jest.Mock; changeTimezone: jest.Mock; changeWaitingAlerts: jest.Mock; setJobRoleCreationPresentation: jest.Mock; grantRolePermission: jest.Mock; grantEmployeeOverride: jest.Mock };

  beforeAll(async () => {
    kind = "OWNER";
    isReady = true;
    sessionCreatedAt = new Date();
    const identity = {
      session: jest.fn(async (secret?: string) => {
        if (secret !== sessionSecret) throw new UnauthorizedException("Authentication required");
        return { row: { accountId: ownerId, account: { kind }, createdAt: sessionCreatedAt }, csrfToken };
      }),
      ownerReady: jest.fn(async () => isReady),
      verifyCsrf: jest.fn((active: { csrfToken: string }, token?: string) => {
        if (!token || token !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
      })
    };
    service = {
      myEmployeeProfile: jest.fn(async () => ({ employee: null })),
      createBranch: jest.fn(async () => ({ id: "branch-id" })),
      grantRolePermission: jest.fn(async () => ({ id: "permission-id" })),
      grantEmployeeOverride: jest.fn(async () => ({ id: "override-id" })),
      listEmployees: jest.fn(async () => []),
      listManagedEmployees: jest.fn(async () => []),
      changeManagedEmployeeReporting: jest.fn(async () => ({ changed: true })),
      finalizeEmployeeExit: jest.fn(async () => { throw new ConflictException("S07/S09 dependency gate"); }),
      changeTimezone: jest.fn(async () => ({ changed: true })),
      changeWaitingAlerts: jest.fn(async () => ({ changed: true })),
      setJobRoleCreationPresentation: jest.fn(async (_actorId: string, _roleId: string, input: unknown) => input)
    };
    const config: RuntimeConfig = {
      nodeEnv: "test", port: 4000,
      databaseUrl: "postgresql://test:test@localhost:5432/test",
      webOrigin: "http://localhost:5173",
      ownerBootstrapEmail: "owner@example.test",
      ownerBootstrapSecret: "b".repeat(48)
    };
    const module = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        { provide: IdentityService, useValue: identity },
        { provide: OrganizationService, useValue: service },
        { provide: RUNTIME_CONFIG, useValue: config }
      ]
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  beforeEach(() => {
    kind = "OWNER";
    isReady = true;
    sessionCreatedAt = new Date();
    jest.clearAllMocks();
  });

  afterAll(async () => app.close());

  const cookie = `sense_sid=${sessionSecret}`;
  const branch = {
    organizationId: "923f1f35-7228-4dd3-aa83-4aee07a87011",
    name: "Mumbai",
    reason: "Initial branch setup"
  };

  it("binds the self profile to the session account and prevents caching", async () => {
    const path = "/api/v1/org/self?employeeId=another-person&accountId=another-account";
    expect((await request(app.getHttpServer()).get(path)).status).toBe(401);
    expect(service.myEmployeeProfile).not.toHaveBeenCalled();
    kind = "STAFF";
    const result = await request(app.getHttpServer()).get(path).set("Cookie", cookie);
    expect(result.status).toBe(200);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.body).toEqual({ employee: null });
    expect(service.myEmployeeProfile).toHaveBeenCalledWith(ownerId);
    kind = "OWNER"; isReady = false;
    expect((await request(app.getHttpServer()).get(path).set("Cookie", cookie)).status).toBe(403);
    expect(service.myEmployeeProfile).toHaveBeenCalledTimes(1);
  });

  it("denies non-Owner and incomplete Owner identity before reading organization data", async () => {
    kind = "STAFF";
    const staff = await request(app.getHttpServer()).get("/api/v1/org").set("Cookie", cookie);
    expect(staff.status).toBe(403);

    kind = "OWNER";
    isReady = false;
    const setupRequired = await request(app.getHttpServer()).get("/api/v1/org").set("Cookie", cookie);
    expect(setupRequired.status).toBe(403);
    expect(service.listEmployees).not.toHaveBeenCalled();
  });

  it("exposes the supported catalogue only to a secured Owner and prevents caching", async () => {
    const path = "/api/v1/org/permission-catalogue";
    expect((await request(app.getHttpServer()).get(path)).status).toBe(401);
    kind = "STAFF";
    expect((await request(app.getHttpServer()).get(path).set("Cookie", cookie)).status).toBe(403);
    kind = "OWNER";
    isReady = false;
    expect((await request(app.getHttpServer()).get(path).set("Cookie", cookie)).status).toBe(403);
    isReady = true;
    const result = await request(app.getHttpServer()).get(path).set("Cookie", cookie);
    expect(result.status).toBe(200);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.body.version).toBe(1);
    const keys = result.body.groups.flatMap((group: { permissions: Array<{ key: string }> }) => group.permissions.map(permission => permission.key));
    expect(keys).toEqual(expect.arrayContaining(["org.employee.read", "project.view", "task.assign", "review.decide", "site.work"]));
    for (const key of ["projects.read", "task.review", "library.publish"]) expect(keys).not.toContain(key);
  });

  it.each(["projects.read", "task.review", "library.publish", "project.*"])("rejects unsupported new grant %s before service dispatch", async (permissionKey) => {
    const roleId = "31000000-0000-4000-8000-000000000001";
    const employeeId = "21000000-0000-4000-8000-000000000001";
    const body = { organizationId: branch.organizationId, permissionKey, scopeKind: "SELF", reason: "Review the employee access" };
    for (const [path, input] of [
      [`/api/v1/org/roles/${roleId}/permissions`, body],
      [`/api/v1/org/employees/${employeeId}/permissions`, { ...body, effect: "DENY" }],
    ] as const) {
      const result = await request(app.getHttpServer()).post(path).set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken).send(input);
      expect(result.status).toBe(400);
    }
    expect(service.grantRolePermission).not.toHaveBeenCalled();
    expect(service.grantEmployeeOverride).not.toHaveBeenCalled();
  });

  it("forwards supported grant keys through the existing reasoned scope contract", async () => {
    const roleId = "31000000-0000-4000-8000-000000000001";
    const employeeId = "21000000-0000-4000-8000-000000000001";
    const input = { organizationId: branch.organizationId, permissionKey: "review.decide", scopeKind: "SELF", reason: "Deny direct self review configuration" };
    const roleResult = await request(app.getHttpServer()).post(`/api/v1/org/roles/${roleId}/permissions`).set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken).send(input);
    expect(roleResult.status).toBe(201);
    expect(service.grantRolePermission).toHaveBeenCalledWith(ownerId, roleId, {
      organizationId: branch.organizationId, permissionKey: "review.decide", scope: { scopeKind: "SELF" }, reason: input.reason,
    });
    const override = await request(app.getHttpServer()).post(`/api/v1/org/employees/${employeeId}/permissions`).set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken).send({ ...input, effect: "DENY" });
    expect(override.status).toBe(201);
    expect(service.grantEmployeeOverride).toHaveBeenCalledWith(ownerId, employeeId, expect.objectContaining({ permissionKey: "review.decide", effect: "DENY", scope: { scopeKind: "SELF" } }));
  });

  it("requires same-origin, CSRF and recent Owner authentication for organization mutations", async () => {
    const wrongOrigin = await request(app.getHttpServer()).post("/api/v1/org/branches")
      .set("Cookie", cookie).set("Origin", "https://attacker.example").set("x-csrf-token", csrfToken).send(branch);
    expect(wrongOrigin.status).toBe(403);

    const noCsrf = await request(app.getHttpServer()).post("/api/v1/org/branches")
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").send(branch);
    expect(noCsrf.status).toBe(403);

    sessionCreatedAt = new Date(Date.now() - 6 * 60_000);
    const staleLogin = await request(app.getHttpServer()).post("/api/v1/org/branches")
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken).send(branch);
    expect(staleLogin.status).toBe(403);
    expect(service.createBranch).not.toHaveBeenCalled();
  });

  it("rejects malformed requests and calls Owner-scoped services only for valid requests", async () => {
    const invalid = await request(app.getHttpServer()).post("/api/v1/org/branches")
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken)
      .send({ ...branch, extra: "untrusted" });
    expect(invalid.status).toBe(400);
    expect(service.createBranch).not.toHaveBeenCalled();

    const valid = await request(app.getHttpServer()).post("/api/v1/org/branches")
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken).send(branch);
    expect(valid.status).toBe(201);
    expect(service.createBranch).toHaveBeenCalledWith(ownerId, branch.organizationId, branch.name, branch.reason);
  });

  it("serves the scoped team endpoint only to an authenticated staff identity", async () => {
    const denied = await request(app.getHttpServer()).get("/api/v1/org/team/employees").set("Cookie", cookie);
    expect(denied.status).toBe(403);
    kind = "STAFF";
    const allowed = await request(app.getHttpServer()).get("/api/v1/org/team/employees").set("Cookie", cookie);
    expect(allowed.status).toBe(200);
    expect(service.listManagedEmployees).toHaveBeenCalledWith(ownerId);
  });

  it("requires recent same-origin CSRF protection for scoped team reporting changes", async () => {
    kind = "STAFF";
    const employeeId = "20cfef90-f016-4b85-8c57-74ade820b71b";
    const reportsToId = "d264610a-55e6-46ce-98c1-205d7c683f0d";
    const payload = { reportsToId, reason: "Clarifying the reporting line" };
    const wrongOrigin = await request(app.getHttpServer()).put(`/api/v1/org/team/employees/${employeeId}/reporting`)
      .set("Cookie", cookie).set("Origin", "https://attacker.example").set("x-csrf-token", csrfToken).send(payload);
    expect(wrongOrigin.status).toBe(403);
    const noCsrf = await request(app.getHttpServer()).put(`/api/v1/org/team/employees/${employeeId}/reporting`)
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").send(payload);
    expect(noCsrf.status).toBe(403);
    const valid = await request(app.getHttpServer()).put(`/api/v1/org/team/employees/${employeeId}/reporting`)
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken).send(payload);
    expect(valid.status).toBe(200);
    expect(service.changeManagedEmployeeReporting).toHaveBeenCalledWith(ownerId, employeeId, reportsToId, payload.reason);
  });

  it("passes the Owner, employee and reason to exit finalization and propagates a workflow conflict", async () => {
    const employeeId = "20cfef90-f016-4b85-8c57-74ade820b71b";
    const result = await request(app.getHttpServer()).post(`/api/v1/org/employees/${employeeId}/exit`)
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken)
      .send({ reason: "Employee is leaving the organization" });
    expect(result.status).toBe(409);
    expect(result.body.message).toContain("S07/S09 dependency gate");
    expect(service.finalizeEmployeeExit).toHaveBeenCalledWith(ownerId, employeeId, "Employee is leaving the organization");
  });

  it("requires strict, recent Owner origin and CSRF guards for Team alerts and organization timezone", async () => {
    const id = "20cfef90-f016-4b85-8c57-74ade820b71b";
    const alerts = { enabled: true, expectedVersion: 1, reason: "Enable team waiting visibility" };
    const write = (path: string, body: object) => request(app.getHttpServer()).put(`/api/v1/org/${path}`).set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken).send(body);
    expect((await write(`teams/${id}/waiting-alerts`, alerts)).status).toBe(200);
    expect(service.changeWaitingAlerts).toHaveBeenCalledWith(ownerId, id, alerts);
    const timezone = { timezone: "Asia/Kolkata", expectedVersion: 1, reason: "Use organization local schedule" };
    expect((await write(`${id}/timezone`, timezone)).status).toBe(200);
    expect(service.changeTimezone).toHaveBeenCalledWith(ownerId, id, timezone);
    expect((await write(`teams/${id}/waiting-alerts`, { ...alerts, force: true })).status).toBe(400);
    kind = "STAFF";
    expect((await write(`teams/${id}/waiting-alerts`, alerts)).status).toBe(403);
    expect((await write(`${id}/timezone`, timezone)).status).toBe(403);
    kind = "OWNER";
    expect((await request(app.getHttpServer()).put(`/api/v1/org/teams/${id}/waiting-alerts`).set("Cookie", cookie).set("Origin", "http://localhost:5173").send(alerts)).status).toBe(403);
    sessionCreatedAt = new Date(Date.now() - 6 * 60_000);
    expect((await write(`${id}/timezone`, timezone)).status).toBe(403);
  });

  it("protects role creation-presentation settings with strict Owner, origin, CSRF, and recent-auth checks", async () => {
    const roleId = "20cfef90-f016-4b85-8c57-74ade820b71b";
    const input = {
      organizationId: "923f1f35-7228-4dd3-aa83-4aee07a87011",
      creationPresentation: "SITE",
      expectedCreationPresentation: null,
      reason: "Use site task creation presentation"
    };
    const write = (body: object) => request(app.getHttpServer()).put(`/api/v1/org/roles/${roleId}/creation-presentation`)
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken).send(body);

    expect((await request(app.getHttpServer()).put(`/api/v1/org/roles/${roleId}/creation-presentation`)
      .set("Cookie", cookie).set("Origin", "https://attacker.example").set("x-csrf-token", csrfToken).send(input)).status).toBe(403);
    expect((await request(app.getHttpServer()).put(`/api/v1/org/roles/${roleId}/creation-presentation`)
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").send(input)).status).toBe(403);
    expect((await write({ ...input, creationPresentation: "SITE_ADMIN" })).status).toBe(400);
    expect((await write({ ...input, unexpected: true })).status).toBe(400);
    expect(service.setJobRoleCreationPresentation).not.toHaveBeenCalled();

    kind = "STAFF";
    expect((await write(input)).status).toBe(403);
    kind = "OWNER";
    isReady = false;
    expect((await write(input)).status).toBe(403);
    isReady = true;
    sessionCreatedAt = new Date(Date.now() - 6 * 60_000);
    expect((await write(input)).status).toBe(403);
    expect(service.setJobRoleCreationPresentation).not.toHaveBeenCalled();

    sessionCreatedAt = new Date();
    const valid = await write(input);
    expect(valid.status).toBe(200);
    expect(service.setJobRoleCreationPresentation).toHaveBeenCalledWith(ownerId, roleId, input);
  });
});

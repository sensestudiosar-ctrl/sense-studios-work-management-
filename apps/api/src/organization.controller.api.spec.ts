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
  let service: { createBranch: jest.Mock; listEmployees: jest.Mock; listManagedEmployees: jest.Mock; changeManagedEmployeeReporting: jest.Mock; finalizeEmployeeExit: jest.Mock };

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
      createBranch: jest.fn(async () => ({ id: "branch-id" })),
      listEmployees: jest.fn(async () => []),
      listManagedEmployees: jest.fn(async () => []),
      changeManagedEmployeeReporting: jest.fn(async () => ({ changed: true })),
      finalizeEmployeeExit: jest.fn(async () => { throw new ConflictException("S07/S09 dependency gate"); })
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

  it("refuses Owner exit finalization until task and active-project dependencies are available", async () => {
    const employeeId = "20cfef90-f016-4b85-8c57-74ade820b71b";
    const result = await request(app.getHttpServer()).post(`/api/v1/org/employees/${employeeId}/exit`)
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken)
      .send({ reason: "Employee is leaving the organization" });
    expect(result.status).toBe(409);
    expect(result.body.message).toContain("S07/S09 dependency gate");
    expect(service.finalizeEmployeeExit).toHaveBeenCalledWith(employeeId);
  });
});

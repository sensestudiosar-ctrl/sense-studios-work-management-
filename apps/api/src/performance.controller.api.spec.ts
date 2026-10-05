import "reflect-metadata";
import { ForbiddenException, UnauthorizedException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { PerformanceController } from "./performance.controller.js";
import { PerformanceService } from "./performance.service.js";

const accountId = "55555555-5555-4555-8555-555555555555";
const subjectId = "11111111-1111-4111-8111-111111111111";
const token = "performance-current-csrf";
const origin = "http://localhost:5173";
const body = { operation: "EMPLOYEE_SNAPSHOT", commandId: subjectId, reason: "Capture reviewed evidence", employeeId: subjectId, family: "EMPLOYEE", from: "2026-10-01", to: "2026-10-05" };

describe("S23 performance HTTP boundaries", () => {
  let app: INestApplication;
  let kind = "OWNER";
  let ready = true;
  const performance = {
    context: jest.fn(async () => ({ owner: true })),
    employee: jest.fn(async () => ({ snapshots: [] })),
    project: jest.fn(async () => ({ snapshots: [] })),
    command: jest.fn(async () => ({ id: subjectId })),
  };
  beforeAll(async () => {
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: origin, ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({ controllers: [PerformanceController], providers: [
      { provide: IdentityService, useValue: {
        session: jest.fn(async (secret?: string) => {
          if (secret !== "performance-session") throw new UnauthorizedException("Authentication required");
          return { row: { accountId, id: "session-id" }, csrfToken: token };
        }),
        ownerReady: jest.fn(async () => ready),
        verifyCsrf: jest.fn((active: { csrfToken: string }, supplied?: string) => { if (supplied !== active.csrfToken) throw new ForbiddenException("Request could not be verified"); }),
      } },
      { provide: ProjectService, useValue: { actor: jest.fn(async () => ({ accountId, organizationId: "44444444-4444-4444-8444-444444444444", kind })) } },
      { provide: PerformanceService, useValue: performance }, { provide: RUNTIME_CONFIG, useValue: config },
    ] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix("api/v1"); await app.init();
  });
  beforeEach(() => { kind = "OWNER"; ready = true; jest.clearAllMocks(); });
  afterAll(async () => app.close());
  const get = (path: string) => request(app.getHttpServer()).get(`/api/v1/performance/${path}`).set("Cookie", "sense_sid=performance-session");
  const post = (value: object) => request(app.getHttpServer()).post("/api/v1/performance/commands").set("Cookie", "sense_sid=performance-session").set("Origin", origin).set("x-csrf-token", token).send(value);

  it("denies portal identities and incomplete Owner setup before reading performance", async () => {
    expect((await request(app.getHttpServer()).get("/api/v1/performance/context").set("Cookie", "sense_client_sid=client-session")).status).toBe(401);
    for (const portalKind of ["CLIENT", "EXTERNAL"]) { kind = portalKind; expect((await get("context")).status).toBe(403); }
    kind = "OWNER"; ready = false; expect((await get("context")).status).toBe(403);
    expect(performance.context).not.toHaveBeenCalled();
  });

  it("passes current session context and marks every read and mutation no-store", async () => {
    kind = "STAFF";
    for (const path of ["context", `employees/${subjectId}`, `projects/${subjectId}`]) {
      const result = await get(path); expect(result.status).toBe(200); expect(result.headers["cache-control"]).toBe("no-store");
    }
    const result = await post(body); expect(result.status).toBe(201); expect(result.headers["cache-control"]).toBe("no-store");
    expect(performance.command).toHaveBeenCalledWith(expect.objectContaining({ accountId, sessionId: "session-id", kind: "STAFF" }), body);
    expect(performance.employee).toHaveBeenCalledWith(expect.objectContaining({ accountId, sessionId: "session-id" }), subjectId);
  });

  it("rejects missing/foreign origin and invalid CSRF before any command", async () => {
    for (const suppliedOrigin of [undefined, "https://foreign.test"]) {
      const req = request(app.getHttpServer()).post("/api/v1/performance/commands").set("Cookie", "sense_sid=performance-session").set("x-csrf-token", token);
      if (suppliedOrigin) req.set("Origin", suppliedOrigin);
      expect((await req.send(body)).status).toBe(403);
    }
    expect((await request(app.getHttpServer()).post("/api/v1/performance/commands").set("Cookie", "sense_sid=performance-session").set("Origin", origin).send(body)).status).toBe(403);
    expect(performance.command).not.toHaveBeenCalled();
  });

  it("strictly rejects guessed IDs, impossible dates and extra authority fields", async () => {
    expect((await get("employees/guessed")).status).toBe(400);
    expect((await get("projects/guessed")).status).toBe(400);
    for (const value of [{ ...body, employeeId: "guessed" }, { ...body, from: "2026-02-30" }, { ...body, approved: true }, { ...body, operation: "OVERRIDE_SCORE", score: 100 }]) {
      expect((await post(value)).status).toBe(400);
    }
    expect(performance.command).not.toHaveBeenCalled();
    expect(performance.employee).not.toHaveBeenCalled();
  });
});

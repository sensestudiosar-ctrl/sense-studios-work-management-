import "reflect-metadata";
import { ForbiddenException, UnauthorizedException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { AiAssistanceController } from "./ai-assistance.controller.js";
import { AiAssistanceService } from "./ai-assistance.service.js";

const accountId = "55555555-5555-4555-8555-555555555555";
const organizationId = "44444444-4444-4444-8444-444444444444";
const origin = "http://localhost:5173";
const csrf = "s27-current-csrf";

describe("S27 AI assistance HTTP boundary", () => {
  let app: INestApplication;
  let kind = "OWNER";
  let ready = true;
  let validSession = true;
  const assistance = {
    context: jest.fn(async () => ({ provider: "deterministic-evidence-v1" })),
    listRuns: jest.fn(async () => ({ items: [] })),
    createRun: jest.fn(async () => ({ id: "11111111-1111-4111-8111-111111111111" })),
    getRun: jest.fn(async () => ({ id: "11111111-1111-4111-8111-111111111111" })),
    decide: jest.fn(async () => ({ decisionVersion: 1 })),
    observeOutcome: jest.fn(async () => ({ decisionVersion: 2 }))
  };

  beforeAll(async () => {
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: origin, ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({ controllers: [AiAssistanceController], providers: [
      { provide: IdentityService, useValue: {
        session: jest.fn(async (secret?: string) => { if (!validSession || secret !== "s27-session") throw new UnauthorizedException("Authentication required"); return { row: { accountId, id: "session-id" }, csrfToken: csrf }; }),
        ownerReady: jest.fn(async () => ready),
        verifyCsrf: jest.fn((active: { csrfToken: string }, supplied?: string) => { if (supplied !== active.csrfToken) throw new ForbiddenException("Request could not be verified"); })
      } },
      { provide: ProjectService, useValue: { actor: jest.fn(async () => ({ accountId, organizationId, kind })) } },
      { provide: AiAssistanceService, useValue: assistance },
      { provide: RUNTIME_CONFIG, useValue: config }
    ] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => { validSession = true; ready = true; kind = "OWNER"; jest.clearAllMocks(); });

  it("requires a current cookie session and OwnerReady", async () => {
    validSession = false;
    await request(app.getHttpServer()).get("/api/v1/ai/context").expect(401);
    validSession = true; ready = false;
    await request(app.getHttpServer()).get("/api/v1/ai/context").set("Cookie", "sense_sid=s27-session").expect(403);
  });

  it("allows only internal Owner or Staff sessions and sends no-store reads", async () => {
    kind = "CLIENT";
    await request(app.getHttpServer()).get("/api/v1/ai/context").set("Cookie", "sense_sid=s27-session").expect(403);
    kind = "STAFF";
    const response = await request(app.getHttpServer()).get("/api/v1/ai/context").set("Cookie", "sense_sid=s27-session").expect(200);
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(assistance.context).toHaveBeenCalledTimes(1);
  });

  it("checks exact Origin and current CSRF before forwarding commands", async () => {
    const payload = { commandId: "11111111-1111-4111-8111-111111111112", kind: "DAILY" };
    await request(app.getHttpServer()).post("/api/v1/ai/runs").set("Cookie", "sense_sid=s27-session").set("Origin", "https://attacker.invalid").set("X-CSRF-Token", csrf).send(payload).expect(403);
    await request(app.getHttpServer()).post("/api/v1/ai/runs").set("Cookie", "sense_sid=s27-session").set("Origin", origin).set("X-CSRF-Token", "stale").send(payload).expect(403);
    expect(assistance.createRun).not.toHaveBeenCalled();
    await request(app.getHttpServer()).post("/api/v1/ai/runs").set("Cookie", "sense_sid=s27-session").set("Origin", origin).set("X-CSRF-Token", csrf).send(payload).expect(201);
    expect(assistance.createRun).toHaveBeenCalledWith(expect.objectContaining({ accountId, sessionId: "session-id" }), payload);
  });

  it("rejects malformed run IDs before service dispatch", async () => {
    await request(app.getHttpServer()).get("/api/v1/ai/runs/not-a-uuid").set("Cookie", "sense_sid=s27-session").expect(400);
    expect(assistance.getRun).not.toHaveBeenCalled();
  });
});

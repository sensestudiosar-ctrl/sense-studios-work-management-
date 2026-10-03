import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { SkillsController } from "./skills.controller.js";
import { SkillsService } from "./skills.service.js";

const accountId = "c64f2145-5810-4a7e-9485-fbe9099c50cf", sessionId = "a5a5f862-0473-4bd2-9329-90fa057139f1", csrfToken = "current-csrf-token", secret = "session-secret";

describe("skills HTTP security contract", () => {
  let app: INestApplication;
  let authenticated = false;
  const identity = {
    session: jest.fn(async (value?: string) => { if (!authenticated || value !== secret) throw new UnauthorizedException(); return { row: { id: sessionId, accountId }, csrfToken }; }),
    verifyCsrf: jest.fn((active: { csrfToken: string }, value?: string) => { if (value !== active.csrfToken) throw new ForbiddenException(); }),
    ownerReady: jest.fn(async () => true)
  };
  const projects = { actor: jest.fn(async () => ({ accountId, organizationId: "92b47f8e-8b4c-43f4-9b96-33f700e568f1", kind: "OWNER" as const })) };
  const skills = { setup: jest.fn(async () => ({ skills: [], employees: [], eligibleApprovers: [] })), profile: jest.fn(async () => ({ ratings: [], changes: [], requests: [], capabilities: {} })), createCatalogue: jest.fn(async (_actor: unknown, input: unknown) => input), request: jest.fn(async (_actor: unknown, input: unknown) => input), decide: jest.fn(async () => ({ id: "request-id", state: "APPROVED" })), directRate: jest.fn(async (_actor: unknown, input: unknown) => input) };

  beforeAll(async () => {
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: "http://localhost:5173", ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({ controllers: [SkillsController], providers: [
      { provide: IdentityService, useValue: identity }, { provide: ProjectService, useValue: projects }, { provide: SkillsService, useValue: skills }, { provide: RUNTIME_CONFIG, useValue: config }
    ] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix("api/v1"); await app.init();
  });
  beforeEach(() => { authenticated = false; jest.clearAllMocks(); });
  afterAll(async () => { await app.close(); });
  const cookie = () => `sense_sid=${secret}`;

  it("requires an authenticated live session for setup and profile reads", async () => {
    expect((await request(app.getHttpServer()).get("/api/v1/skills/setup")).status).toBe(401);
    authenticated = true;
    const response = await request(app.getHttpServer()).get("/api/v1/skills/setup").set("Cookie", cookie());
    expect(response.status).toBe(200); expect(response.headers["cache-control"]).toBe("no-store");
    expect(skills.setup).toHaveBeenCalledWith(expect.objectContaining({ accountId, sessionId }));
  });

  it("rejects cross-origin, missing-CSRF and extra-field mutations before service calls", async () => {
    authenticated = true;
    const body = { commandId: "b5fa0138-d635-47aa-ae7e-8c7795c55fc8", name: "Lighting", reason: "Add an official skill", extra: true };
    const wrongOrigin = await request(app.getHttpServer()).post("/api/v1/skills/catalogue").set("Cookie", cookie()).set("Origin", "https://attacker.example").set("x-csrf-token", csrfToken).send(body);
    expect(wrongOrigin.status).toBe(403);
    const missingCsrf = await request(app.getHttpServer()).post("/api/v1/skills/catalogue").set("Cookie", cookie()).set("Origin", "http://localhost:5173").send(body);
    expect(missingCsrf.status).toBe(403);
    const extraField = await request(app.getHttpServer()).post("/api/v1/skills/catalogue").set("Cookie", cookie()).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken).send(body);
    expect(extraField.status).toBe(400);
    expect(skills.createCatalogue).not.toHaveBeenCalled();
  });
});

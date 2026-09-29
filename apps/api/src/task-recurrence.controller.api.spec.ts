import "reflect-metadata";
import { ForbiddenException, UnauthorizedException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { TaskRecurrenceController } from "./task-recurrence.controller.js";
import { TaskRecurrenceService } from "./task-recurrence.service.js";

const taskId = "22222222-2222-4222-8222-222222222222";
const actor = { accountId: "55555555-5555-4555-8555-555555555555", organizationId: "44444444-4444-4444-8444-444444444444", kind: "OWNER" };
const origin = "http://localhost:5173";
describe("S10 recurrence HTTP boundary", () => {
  let app: INestApplication;
  let validSession = true;
  const recurrence = { detail: jest.fn(async () => ({ rule: null, history: [] })), configure: jest.fn(async () => ({ rule: { version: 1 } })), setPaused: jest.fn(async () => ({ rule: { paused: true } })) };
  beforeAll(async () => {
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost/test", webOrigin: origin, ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined };
    const module = await Test.createTestingModule({ controllers: [TaskRecurrenceController], providers: [
      { provide: RUNTIME_CONFIG, useValue: config }, { provide: TaskRecurrenceService, useValue: recurrence },
      { provide: ProjectService, useValue: { actor: async () => actor } },
      { provide: IdentityService, useValue: { session: async () => { if (!validSession) throw new UnauthorizedException(); return { row: { accountId: actor.accountId }, csrfToken: "recurrence-csrf" }; }, ownerReady: async () => true, verifyCsrf: (_active: unknown, supplied: string) => { if (supplied !== "recurrence-csrf") throw new ForbiddenException(); } } }
    ] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix("api/v1"); await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => { validSession = true; jest.clearAllMocks(); });
  const path = `/api/v1/tasks/${taskId}/recurrence`;
  const body = { expectedTaskVersion: 1, expectedVersion: 0, frequency: "MONTHLY", firstOccurrenceDate: "2026-10-31", reason: "Future monthly schedule" };
  const write = (payload: object, csrf = "recurrence-csrf", requestOrigin = origin) => request(app.getHttpServer()).put(path).set("Cookie", "sense_sid=recurrence-session").set("Origin", requestOrigin).set("x-csrf-token", csrf).send(payload);
  it("requires authentication, no-store reads, same origin and CSRF", async () => {
    validSession = false;
    expect((await request(app.getHttpServer()).get(path)).status).toBe(401);
    validSession = true;
    const result = await request(app.getHttpServer()).get(path);
    expect(result.status).toBe(200);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect((await write(body, "bad")).status).toBe(403);
    expect((await write(body, "recurrence-csrf", "https://foreign.test")).status).toBe(403);
    expect(recurrence.configure).not.toHaveBeenCalled();
  });
  it("validates future-date command shape and excludes injected fields", async () => {
    expect((await write({ ...body, paused: false })).status).toBe(400);
    expect((await write({ ...body, frequency: "HOURLY" })).status).toBe(400);
    expect((await write({ ...body, firstOccurrenceDate: "2026-02-30" })).status).toBe(400);
    expect((await write({ ...body, reason: " " })).status).toBe(400);
    expect((await write(body)).status).toBe(200);
    expect(recurrence.configure).toHaveBeenCalledWith(actor, taskId, body);
  });
  it("uses separate versioned pause and resume commands", async () => {
    const payload = { expectedTaskVersion: 1, expectedVersion: 1, reason: "Pause schedule" };
    for (const command of ["pause", "resume"]) {
      expect((await request(app.getHttpServer()).post(`${path}/${command}`).set("Origin", origin).set("x-csrf-token", "recurrence-csrf").send(payload)).status).toBe(201);
      expect(recurrence.setPaused).toHaveBeenLastCalledWith(actor, taskId, command === "pause", payload);
    }
  });
});

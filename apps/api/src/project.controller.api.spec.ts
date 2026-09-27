import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectController } from "./project.controller.js";
import { ProjectService } from "./project.service.js";

const accountId = "55555555-5555-4555-8555-555555555555";
const branchId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const token = "project-current-csrf";
const cookie = "sense_sid=project-session";

describe("S07A Draft project HTTP boundary", () => {
  let app: INestApplication;
  let kind: "OWNER" | "STAFF";
  let ready: boolean;
  let validSession: boolean;
  let service: Record<string, jest.Mock>;
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
      setup: jest.fn(async () => ({ branches: [] })), list: jest.fn(async () => ({ items: [], total: 0 })),
      detail: jest.fn(async () => ({ project: { id: projectId } })), create: jest.fn(async () => ({ project: { id: projectId } }))
    };
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: "http://localhost:5173", ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({ controllers: [ProjectController], providers: [
      { provide: IdentityService, useValue: identity }, { provide: ProjectService, useValue: service }, { provide: RUNTIME_CONFIG, useValue: config }
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
    expect((await request(app.getHttpServer()).get("/api/v1/projects/setup").set("Cookie", cookie)).status).toBe(403);
    expect(service.setup).not.toHaveBeenCalled();
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
    expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ accountId }), branchId, 0, 50);
  });

  it("rejects malformed IDs and pagination before service calls", async () => {
    const badBranch = await request(app.getHttpServer()).get("/api/v1/projects?branchId=wrong").set("Cookie", cookie);
    const badPage = await request(app.getHttpServer()).get(`/api/v1/projects?branchId=${branchId}&limit=101`).set("Cookie", cookie);
    const badId = await request(app.getHttpServer()).get("/api/v1/projects/wrong").set("Cookie", cookie);
    expect([badBranch.status, badPage.status, badId.status]).toEqual([400, 400, 400]);
    expect(service.list).not.toHaveBeenCalled();
    expect(service.detail).not.toHaveBeenCalled();
  });
});

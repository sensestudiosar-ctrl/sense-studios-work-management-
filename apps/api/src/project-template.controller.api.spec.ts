import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { ProjectTemplateController } from "./project-template.controller.js";
import { ProjectTemplateService } from "./project-template.service.js";

const accountId = "55555555-5555-4555-8555-555555555555";
const templateId = "22222222-2222-4222-8222-222222222222";
const token = "template-current-csrf";
const cookie = "sense_sid=template-session";
const definition = {
  deliveryType: "DESIGN",
  scopes: ["Architecture"],
  stages: [{ key: "PLANNING", label: "Planning" }],
  milestones: [],
  folders: ["01 Design"]
};

describe("S08 project template HTTP boundary", () => {
  let app: INestApplication;
  let kind: "OWNER" | "STAFF";
  let ready: boolean;
  let validSession: boolean;
  const projectService = { actor: jest.fn(async () => ({ accountId, kind: "OWNER", organizationId: "44444444-4444-4444-8444-444444444444" })) };
  const templates = {
    list: jest.fn(async () => ({ templates: [], canManage: true, defaults: { DESIGN: [], TURNKEY: [] } })),
    create: jest.fn(async () => ({ template: { id: templateId } })),
    version: jest.fn(async () => ({ template: { id: templateId }, version: { number: 2 } }))
  };

  beforeAll(async () => {
    kind = "OWNER"; ready = true; validSession = true;
    const identity = {
      session: jest.fn(async (secret?: string) => {
        if (!validSession || secret !== "template-session") throw new UnauthorizedException("Authentication required");
        return { row: { accountId }, csrfToken: token };
      }),
      ownerReady: jest.fn(async () => ready),
      verifyCsrf: jest.fn((active: { csrfToken: string }, supplied?: string) => {
        if (supplied !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
      })
    };
    projectService.actor.mockImplementation(async () => ({ accountId, kind, organizationId: "44444444-4444-4444-8444-444444444444" }));
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: "http://localhost:5173", ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({ controllers: [ProjectTemplateController], providers: [
      { provide: IdentityService, useValue: identity }, { provide: ProjectService, useValue: projectService },
      { provide: ProjectTemplateService, useValue: templates }, { provide: RUNTIME_CONFIG, useValue: config }
    ] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix("api/v1"); await app.init();
  });

  beforeEach(() => { kind = "OWNER"; ready = true; validSession = true; jest.clearAllMocks(); });
  afterAll(async () => app.close());
  const createBody = { name: "Design baseline", definition, reason: "Approved delivery template" };
  const post = (path: string, body: object) => request(app.getHttpServer()).post(`/api/v1/project-templates${path}`).set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", token).send(body);

  it("requires a valid session and completed Owner setup, then returns no-store template reads", async () => {
    validSession = false;
    expect((await request(app.getHttpServer()).get("/api/v1/project-templates").set("Cookie", cookie)).status).toBe(401);
    validSession = true; ready = false;
    expect((await request(app.getHttpServer()).get("/api/v1/project-templates").set("Cookie", cookie)).status).toBe(403);
    ready = true;
    const response = await request(app.getHttpServer()).get("/api/v1/project-templates").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(templates.list).toHaveBeenCalledWith(expect.objectContaining({ kind: "OWNER" }));
  });

  it("enforces origin, CSRF, strict bodies and UUIDs before template writes", async () => {
    const wrongOrigin = await request(app.getHttpServer()).post("/api/v1/project-templates").set("Cookie", cookie).set("Origin", "https://attacker.test").set("x-csrf-token", token).send(createBody);
    const noCsrf = await request(app.getHttpServer()).post("/api/v1/project-templates").set("Cookie", cookie).set("Origin", "http://localhost:5173").send(createBody);
    const extraField = await post("", { ...createBody, active: false });
    const badDefinition = await post("", { ...createBody, definition: { ...definition, folders: ["../escape"] } });
    const badId = await post("/not-a-uuid/versions", { definition, reason: "Template refinement" });
    expect([wrongOrigin.status, noCsrf.status, extraField.status, badDefinition.status, badId.status]).toEqual([403, 403, 400, 400, 400]);
    expect(templates.create).not.toHaveBeenCalled();
    expect(templates.version).not.toHaveBeenCalled();
  });

  it("routes valid create and version requests with parsed strict payloads", async () => {
    const created = await post("", createBody);
    const versioned = await post(`/${templateId}/versions`, { definition, reason: "Updated folder intent" });
    expect([created.status, versioned.status]).toEqual([201, 201]);
    expect(templates.create).toHaveBeenCalledWith(expect.objectContaining({ accountId }), createBody);
    expect(templates.version).toHaveBeenCalledWith(expect.objectContaining({ accountId }), templateId, { definition, reason: "Updated folder intent" });
  });
});

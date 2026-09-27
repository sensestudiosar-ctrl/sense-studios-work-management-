import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { CrmController } from "./crm.controller.js";
import { CrmService } from "./crm.service.js";

const accountId = "55555555-5555-4555-8555-555555555555";
const branchId = "11111111-1111-4111-8111-111111111111";
const sourceId = "22222222-2222-4222-8222-222222222222";
const leadId = "33333333-3333-4333-8333-333333333333";
const csrfToken = "csrf-token-for-current-session";
const sessionSecret = "crm-test-session-secret";

describe("S06 CRM HTTP boundary", () => {
  let app: INestApplication;
  let kind: "OWNER" | "STAFF";
  let isReady: boolean;
  let sessionValid: boolean;
  let identity: { session: jest.Mock; ownerReady: jest.Mock; verifyCsrf: jest.Mock };
  let service: Record<string, jest.Mock>;
  const actor = () => ({ accountId, kind, organizationId: "44444444-4444-4444-8444-444444444444" });

  beforeAll(async () => {
    kind = "OWNER"; isReady = true; sessionValid = true;
    identity = {
      session: jest.fn(async (secret?: string) => {
        if (!sessionValid || secret !== sessionSecret) throw new UnauthorizedException("Authentication required");
        return { row: { accountId, account: { kind }, createdAt: new Date() }, csrfToken };
      }),
      ownerReady: jest.fn(async () => isReady),
      verifyCsrf: jest.fn((active: { csrfToken: string }, token?: string) => {
        if (!token || token !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
      })
    };
    service = {
      actor: jest.fn(async () => actor()), setup: jest.fn(async () => ({ branches: [], sources: [], sourceManage: kind === "OWNER", owner: kind === "OWNER" })),
      listLeads: jest.fn(async () => ({ items: [], total: 0 })), detail: jest.fn(async () => ({ lead: {} })),
      createLead: jest.fn(async () => ({ id: leadId })), updateLead: jest.fn(async () => ({ id: leadId })),
      changeStage: jest.fn(async () => ({ lead: { id: leadId } })), addActivity: jest.fn(async () => ({ id: "activity-id" })),
      listClients: jest.fn(async () => ({ items: [] })), createClient: jest.fn(async () => ({ id: "client-id" })),
      createSource: jest.fn(async () => ({ id: sourceId, name: "Partner" })), updateSource: jest.fn(async () => ({ id: sourceId, active: false })),
      updateClient: jest.fn(async () => ({ id: "client-id" }))
    };
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: "http://localhost:5173", ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({
      controllers: [CrmController],
      providers: [{ provide: IdentityService, useValue: identity }, { provide: CrmService, useValue: service }, { provide: RUNTIME_CONFIG, useValue: config }]
    }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix("api/v1"); await app.init();
  });

  beforeEach(() => { kind = "OWNER"; isReady = true; sessionValid = true; jest.clearAllMocks(); });
  afterAll(async () => app.close());
  const cookie = `sense_sid=${sessionSecret}`;
  const csrf = (verb: "post" | "put", path: string, body: object) => request(app.getHttpServer())[verb](path).set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken).send(body);
  const leadBody = { branchId, title: "Website redesign", contactName: "A Customer", sourceId, reason: "New inbound enquiry" };

  it("requires an authenticated session and completed Owner setup", async () => {
    sessionValid = false;
    expect((await request(app.getHttpServer()).get("/api/v1/crm/setup")).status).toBe(401);
    sessionValid = true; isReady = false;
    const response = await request(app.getHttpServer()).get("/api/v1/crm/setup").set("Cookie", cookie);
    expect(response.status).toBe(403);
    expect(service.setup).not.toHaveBeenCalled();
  });

  it("requires a valid branch UUID and bounded numeric pagination before listing", async () => {
    const badBranch = await request(app.getHttpServer()).get("/api/v1/crm/leads?branchId=nope").set("Cookie", cookie);
    const badOffset = await request(app.getHttpServer()).get(`/api/v1/crm/leads?branchId=${branchId}&offset=`).set("Cookie", cookie);
    const badLimit = await request(app.getHttpServer()).get(`/api/v1/crm/leads?branchId=${branchId}&limit=101`).set("Cookie", cookie);
    const badStage = await request(app.getHttpServer()).get(`/api/v1/crm/leads?branchId=${branchId}&stage=UNKNOWN`).set("Cookie", cookie);
    expect([badBranch.status, badOffset.status, badLimit.status, badStage.status]).toEqual([400, 400, 400, 400]);
    expect(service.listLeads).not.toHaveBeenCalled();
  });

  it("rejects malformed UUID path and query IDs", async () => {
    const detail = await request(app.getHttpServer()).get("/api/v1/crm/leads/not-a-uuid").set("Cookie", cookie);
    const clients = await request(app.getHttpServer()).get("/api/v1/crm/clients?branchId=not-a-uuid").set("Cookie", cookie);
    expect(detail.status).toBe(400);
    expect(clients.status).toBe(400);
    expect(service.detail).not.toHaveBeenCalled();
    expect(service.listClients).not.toHaveBeenCalled();
  });

  it("enforces same-origin and CSRF checks before mutations", async () => {
    const wrongOrigin = await request(app.getHttpServer()).post("/api/v1/crm/leads").set("Cookie", cookie).set("Origin", "https://attacker.example").set("x-csrf-token", csrfToken).send(leadBody);
    const missingCsrf = await request(app.getHttpServer()).post("/api/v1/crm/leads").set("Cookie", cookie).set("Origin", "http://localhost:5173").send(leadBody);
    expect(wrongOrigin.status).toBe(403);
    expect(missingCsrf.status).toBe(403);
    expect(service.createLead).not.toHaveBeenCalled();
  });

  it("rejects strict-body extras and invalid field bounds before calling services", async () => {
    const extra = await csrf("post", "/api/v1/crm/leads", { ...leadBody, sourceConfig: "unexpected" });
    const invalidTitle = await csrf("post", "/api/v1/crm/leads", { ...leadBody, title: "x" });
    const invalidVersion = await csrf("put", `/api/v1/crm/leads/${leadId}`, { expectedVersion: 0, title: "Valid title", contactName: "A Customer", reason: "Editing lead details" });
    expect([extra.status, invalidTitle.status, invalidVersion.status]).toEqual([400, 400, 400]);
    expect(service.createLead).not.toHaveBeenCalled();
    expect(service.updateLead).not.toHaveBeenCalled();
  });

  it("delegates branch authorization to the service and returns its denial", async () => {
    kind = "STAFF";
    service.listLeads.mockRejectedValue(new ForbiddenException("Permission denied"));
    const response = await request(app.getHttpServer()).get(`/api/v1/crm/leads?branchId=${branchId}`).set("Cookie", cookie);
    expect(response.status).toBe(403);
    expect(service.listLeads).toHaveBeenCalledWith(actor(), { branchId, offset: 0, limit: 50 });
  });

  it("passes valid create data through after session, origin, and CSRF checks", async () => {
    const response = await csrf("post", "/api/v1/crm/leads", leadBody);
    expect(response.status).toBe(201);
    expect(service.createLead).toHaveBeenCalledWith(actor(), leadBody);
  });

  it("returns setup source-management capability from the authorized service", async () => {
    service.setup.mockResolvedValue({ branches: [], sources: [{ id: sourceId, name: "Inactive", active: false, builtIn: true }], sourceManage: true, owner: false });
    kind = "STAFF";
    const response = await request(app.getHttpServer()).get("/api/v1/crm/setup").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.sourceManage).toBe(true);
    expect(response.body.sources).toHaveLength(1);
  });

  it("validates strict source creation payloads and delegates authorized creation", async () => {
    const invalid = await csrf("post", "/api/v1/crm/sources", { name: "Partner", reason: "Add source", builtIn: true });
    expect(invalid.status).toBe(400);
    expect(service.createSource).not.toHaveBeenCalled();
    const response = await csrf("post", "/api/v1/crm/sources", { name: "Partner", reason: "Add a referral source" });
    expect(response.status).toBe(201);
    expect(service.createSource).toHaveBeenCalledWith(actor(), { name: "Partner", reason: "Add a referral source" });
  });

  it("validates source IDs, booleans, timestamps and preserves permission denials", async () => {
    const badId = await csrf("put", "/api/v1/crm/sources/not-a-uuid", { active: false, expectedUpdatedAt: "2026-09-27T00:00:00.000Z", reason: "Disable inactive source" });
    const badTimestamp = await csrf("put", `/api/v1/crm/sources/${sourceId}`, { active: "false", expectedUpdatedAt: "yesterday", reason: "Disable inactive source" });
    expect(badId.status).toBe(400);
    expect(badTimestamp.status).toBe(400);
    expect(service.updateSource).not.toHaveBeenCalled();
    service.createSource.mockRejectedValue(new ForbiddenException("Permission denied"));
    kind = "STAFF";
    const denied = await csrf("post", "/api/v1/crm/sources", { name: "Partner", reason: "Add a referral source" });
    expect(denied.status).toBe(403);
    expect(service.createSource).toHaveBeenCalledWith(actor(), { name: "Partner", reason: "Add a referral source" });
    service.updateSource.mockResolvedValue({ id: sourceId, active: false });
    kind = "OWNER";
    const expectedUpdatedAt = "2026-09-27T10:00:00.000Z";
    const updated = await csrf("put", `/api/v1/crm/sources/${sourceId}`, { active: false, expectedUpdatedAt, reason: "Disable retired source" });
    expect(updated.status).toBe(200);
    expect(service.updateSource).toHaveBeenCalledWith(actor(), sourceId, { active: false, expectedUpdatedAt: new Date(expectedUpdatedAt), reason: "Disable retired source" });
  });
});

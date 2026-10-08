import "reflect-metadata";
import { ForbiddenException, UnauthorizedException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { AutomationController } from "./automation.controller.js";
import { AutomationService } from "./automation.service.js";

const accountId = "55555555-5555-4555-8555-555555555555";
const recordId = "11111111-1111-4111-8111-111111111111";
const organizationId = "44444444-4444-4444-8444-444444444444";
const csrfToken = "automation-current-csrf";
const origin = "http://localhost:5173";
const definition = { title: "Hours by branch", category: "employee", from: "2026-10-01", to: "2026-10-05", columns: ["employee"], filters: [], groupBy: "branch", chart: "BAR" };
const table = { title: "Hours by branch", category: "employee", from: definition.from, to: definition.to, generatedAt: "2026-10-06T00:00:00.000Z", columns: [{ key: "label", label: "Branch" }, { key: "count", label: "Count" }], rows: [{ label: "North", count: 2 }], unavailable: [] };

describe("S26 automation HTTP boundaries", () => {
  let app: INestApplication;
  let kind = "OWNER";
  let ready = true;
  const automation = {
    context: jest.fn(async () => ({ categories: [] })),
    preview: jest.fn(async () => ({ table, chart: [{ label: "North", count: 2 }] })),
    saveReport: jest.fn(async () => ({ id: recordId })),
    savedPreview: jest.fn(async () => ({ report: { id: recordId }, table, chart: [{ label: "North", count: 2 }] })),
    saveRule: jest.fn(async () => ({ id: recordId })),
    decide: jest.fn(async () => ({ id: recordId })),
    runReport: jest.fn(async () => ({ table, chart: [{ label: "North", count: 2 }] })),
  };

  beforeAll(async () => {
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: origin, ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({ controllers: [AutomationController], providers: [
      { provide: IdentityService, useValue: {
        session: jest.fn(async (secret?: string) => { if (secret !== "automation-session") throw new UnauthorizedException("Authentication required"); return { row: { accountId, id: "session-id" }, csrfToken }; }),
        ownerReady: jest.fn(async () => ready),
        verifyCsrf: jest.fn((active: { csrfToken: string }, supplied?: string) => { if (supplied !== active.csrfToken) throw new ForbiddenException("Request could not be verified"); }),
      } },
      { provide: ProjectService, useValue: { actor: jest.fn(async () => ({ accountId, organizationId, kind })) } },
      { provide: AutomationService, useValue: automation }, { provide: RUNTIME_CONFIG, useValue: config },
    ] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix("api/v1"); await app.init();
  });
  beforeEach(() => { kind = "OWNER"; ready = true; jest.clearAllMocks(); });
  afterAll(async () => app.close());

  const get = (path: string) => request(app.getHttpServer()).get(`/api/v1/automation/${path}`).set("Cookie", "sense_sid=automation-session");
  const post = (path: string, body: object, suppliedOrigin = origin, suppliedCsrf = csrfToken) => request(app.getHttpServer()).post(`/api/v1/automation/${path}`).set("Cookie", "sense_sid=automation-session").set("Origin", suppliedOrigin).set("x-csrf-token", suppliedCsrf).send(body);

  it("protects context reads with internal session checks and no-store", async () => {
    const unauthenticated = await request(app.getHttpServer()).get("/api/v1/automation/context");
    expect(unauthenticated.status).toBe(401);
    kind = "CLIENT";
    const portal = await get("context"); expect(portal.status).toBe(403); expect(portal.headers["cache-control"]).toBe("no-store");
    kind = "OWNER"; ready = false;
    expect((await get("context")).status).toBe(403);
    ready = true; kind = "STAFF";
    const result = await get("context"); expect(result.status).toBe(200); expect(result.headers["cache-control"]).toBe("no-store");
    expect(automation.context).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-id", kind: "STAFF" }));
  });

  it("validates report definitions and applies origin and CSRF checks before mutations", async () => {
    const preview = await post("reports/preview", definition);
    expect(preview.status).toBe(201); expect(preview.headers["cache-control"]).toBe("no-store");
    expect(automation.preview).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-id" }), definition);
    expect((await post("reports/preview", { ...definition, category: "skills_training" })).status).toBe(201);
    expect((await post("reports/preview", { ...definition, columns: ["employee", "employee"] })).status).toBe(400);
    expect((await post("reports/preview", definition, "https://foreign.test")).status).toBe(403);
    expect((await post("reports/preview", definition, origin, "wrong")).status).toBe(403);
    expect(automation.preview).toHaveBeenCalledTimes(2);
  });

  it("maps report save, update, saved preview, and export using a validated UUID", async () => {
    const saveCommand = { ...definition, commandId: recordId, reason: "Save this report" };
    const created = await post("reports", saveCommand); expect(created.status).toBe(201); expect(created.headers["cache-control"]).toBe("no-store");
    expect(automation.saveReport).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "OWNER" }), saveCommand);
    const updateCommand = { ...definition, commandId: "22222222-2222-4222-8222-222222222222", reason: "Update this report", expectedVersion: 1 };
    const updated = await request(app.getHttpServer()).put(`/api/v1/automation/reports/${recordId}`).set("Cookie", "sense_sid=automation-session").set("Origin", origin).set("x-csrf-token", csrfToken).send(updateCommand);
    expect(updated.status).toBe(200); expect(automation.saveReport).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "OWNER" }), updateCommand, recordId);
    expect((await get(`reports/not-a-uuid/preview`)).status).toBe(400);
    const preview = await get(`reports/${recordId}/preview`); expect(preview.status).toBe(200); expect(preview.headers["cache-control"]).toBe("no-store");
    const exported = await get(`reports/${recordId}/export?format=csv`); expect(exported.status).toBe(200); expect(exported.headers["cache-control"]).toBe("no-store");
    expect(exported.headers["content-type"]).toContain("text/csv"); expect(exported.text).toContain("North");
    expect(automation.savedPreview).toHaveBeenCalledWith(expect.objectContaining({ kind: "OWNER" }), recordId);
    expect((await get(`reports/${recordId}/export?format=exe`)).status).toBe(400);
  });

  it("validates rule and run identifiers and forwards mutations only after CSRF", async () => {
    expect((await post("rules", { reason: "Save a rule" })).status).toBe(201);
    expect(automation.saveRule).toHaveBeenCalledWith(expect.objectContaining({ kind: "OWNER" }), { reason: "Save a rule" });
    const decision = await post(`runs/${recordId}/decision`, { outcome: "APPROVED", reason: "Review this run" });
    expect(decision.status).toBe(201); expect(decision.headers["cache-control"]).toBe("no-store");
    expect(automation.decide).toHaveBeenCalledWith(expect.objectContaining({ kind: "OWNER" }), recordId, { outcome: "APPROVED", reason: "Review this run" });
    const badId = await post("runs/not-a-uuid/decision", { outcome: "APPROVED", reason: "Review this run" });
    expect(badId.status).toBe(400); expect(automation.decide).toHaveBeenCalledTimes(1);
  });

  it("reads generated run reports and exports through the authorized service method", async () => {
    const report = await get(`runs/${recordId}/report`);
    expect(report.status).toBe(200); expect(report.headers["cache-control"]).toBe("no-store");
    expect(automation.runReport).toHaveBeenCalledWith(expect.objectContaining({ kind: "OWNER" }), recordId);
    const exported = await get(`runs/${recordId}/report/export?format=csv`);
    expect(exported.status).toBe(200); expect(exported.headers["cache-control"]).toBe("no-store");
    expect(exported.headers["content-type"]).toContain("text/csv"); expect(exported.text).toContain("North");
    expect((await get("runs/not-a-uuid/report")).status).toBe(400);
    expect((await get(`runs/${recordId}/report/export?format=exe`)).status).toBe(400);
    expect(automation.runReport).toHaveBeenCalledTimes(2);
  });
});

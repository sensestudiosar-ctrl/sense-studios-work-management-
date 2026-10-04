import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { SiteController } from "./site.controller.js";
import { SiteService } from "./site.service.js";

// HTTP boundary tests; persistence and business authority are exercised in the S20 database suite.
const accountId = "55555555-5555-4555-8555-555555555555";
const projectId = "11111111-1111-4111-8111-111111111111";
const recordId = "22222222-2222-4222-8222-222222222222";
const token = "site-current-csrf";
const cookie = "sense_sid=site-session";
const origin = "http://localhost:5173";
const common = { expectedVersion: 0, reason: "Approved site activity" };
const bodies: Record<string, object> = {
  responsible: { ...common, accountId },
  createPackage: { ...common, title: "Pour footing", date: "2026-10-03", tomorrowPlan: "Cure and inspect", plannedPercent: "20", plannedQuantity: "2.5", unit: "m3", critical: false },
  progress: { ...common, actualPercent: "10", actualQuantity: "1", qualityStatus: "PENDING", materialStatus: "Cement delivered", blockers: "", tomorrowPlan: "Continue curing", photoIds: [] },
  completePackage: common,
  manpower: { ...common, date: "2026-10-03", trade: "Masonry", count: 3, employeeAccountIds: [], note: "Morning shift" },
  report: { ...common, date: "2026-10-03", workCompleted: "Footing excavation", manpower: [{ trade: "Masonry", count: 3 }], materialsReceived: "Cement", photoIds: [], issues: "", delayCauses: "", tomorrowPlan: "Pour footing" },
  confirmReport: common,
  snag: { ...common, title: "Uneven finish", description: "North wall finish is uneven", photoIds: [] },
  assignFixer: { ...common, fixerAccountId: accountId },
  startRepair: common,
  readyRepair: { ...common, note: "Finish corrected", photoIds: [] },
  appointVerifier: { ...common, verifierAccountId: accountId },
  verify: { ...common, outcome: "PASSED", note: "Finish checked", photoIds: [] },
  closeSnag: common,
  handover: { ...common, note: "Current packages and snags checked" }
};

describe("S20 site HTTP boundary draft", () => {
  let app: INestApplication;
  let validSession = true;
  let ready = true;
  let identity: Record<string, jest.Mock>;
  let site: Record<string, jest.Mock>;
  beforeAll(async () => {
    identity = {
      session: jest.fn(async (secret?: string) => {
        if (!validSession || secret !== "site-session") throw new UnauthorizedException("Authentication required");
        return { row: { accountId, id: "session-id" }, csrfToken: token };
      }),
      ownerReady: jest.fn(async () => ready),
      verifyCsrf: jest.fn((active: { csrfToken: string }, supplied?: string) => { if (supplied !== active.csrfToken) throw new ForbiddenException("Request could not be verified"); })
    };
    const methods = ["projects", "detail", "responsible", "createPackage", "progress", "completePackage", "manpower", "report", "confirmReport", "snag", "assignFixer", "startRepair", "readyRepair", "appointVerifier", "verify", "closeSnag", "handover"];
    site = Object.fromEntries(methods.map((name) => [name, jest.fn(async () => ({ ok: true }))]));
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: origin, ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({ controllers: [SiteController], providers: [
      { provide: IdentityService, useValue: identity }, { provide: ProjectService, useValue: { actor: jest.fn(async () => ({ accountId, organizationId: "44444444-4444-4444-8444-444444444444", kind: "OWNER" })) } },
      { provide: SiteService, useValue: site }, { provide: RUNTIME_CONFIG, useValue: config }
    ] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix("api/v1"); await app.init();
  });
  beforeEach(() => { validSession = true; ready = true; jest.clearAllMocks(); });
  afterAll(async () => app.close());
  const write = (path: string, body: object) => request(app.getHttpServer()).post(`/api/v1/site${path}`).set("Cookie", cookie).set("Origin", origin).set("x-csrf-token", token).send(body);

  it("protects staff reads, owner readiness and no-store project responses; client cookies do not authenticate", async () => {
    validSession = false;
    expect((await request(app.getHttpServer()).get("/api/v1/site/projects").set("Cookie", "sense_client_sid=client-session")).status).toBe(401);
    expect((await request(app.getHttpServer()).get("/api/v1/site/projects").set("Cookie", cookie)).status).toBe(401);
    validSession = true; ready = false;
    expect((await request(app.getHttpServer()).get("/api/v1/site/projects").set("Cookie", cookie)).status).toBe(403);
    ready = true;
    const list = await request(app.getHttpServer()).get("/api/v1/site/projects").set("Cookie", cookie);
    const detail = await request(app.getHttpServer()).get(`/api/v1/site/projects/${projectId}`).set("Cookie", cookie);
    expect([list.status, detail.status]).toEqual([200, 200]);
    expect([list.headers["cache-control"], detail.headers["cache-control"]]).toEqual(["no-store", "no-store"]);
    expect(site.projects).toHaveBeenCalledWith(expect.objectContaining({ accountId, sessionId: "session-id" }));
    expect(site.detail).toHaveBeenCalledWith(expect.objectContaining({ accountId, sessionId: "session-id" }), projectId);
  });

  it("enforces same-origin CSRF before writes and rejects malformed IDs and strict payload violations", async () => {
    const noOrigin = await request(app.getHttpServer()).post(`/api/v1/site/projects/${projectId}/packages`).set("Cookie", cookie).set("x-csrf-token", token).send(bodies.createPackage);
    const wrongOrigin = await request(app.getHttpServer()).post(`/api/v1/site/projects/${projectId}/packages`).set("Cookie", cookie).set("Origin", "https://attacker.test").set("x-csrf-token", token).send(bodies.createPackage);
    const noCsrf = await request(app.getHttpServer()).post(`/api/v1/site/projects/${projectId}/packages`).set("Cookie", cookie).set("Origin", origin).send(bodies.createPackage);
    const badId = await write("/projects/not-a-uuid/packages", bodies.createPackage);
    const extra = await write(`/projects/${projectId}/packages`, { ...bodies.createPackage, state: "COMPLETED" });
    const badDate = await write(`/projects/${projectId}/packages`, { ...bodies.createPackage, date: "2026-02-30" });
    const badPercent = await write(`/packages/${recordId}/progress`, { ...bodies.progress, actualPercent: "100.01" });
    const missingVersion = await write(`/snags/${recordId}/close`, { reason: "Close snag" });
    expect([noOrigin.status, wrongOrigin.status, noCsrf.status, badId.status, extra.status, badDate.status, badPercent.status, missingVersion.status]).toEqual([403, 403, 403, 400, 400, 400, 400, 400]);
    expect(site.createPackage).not.toHaveBeenCalled();
    expect(site.progress).not.toHaveBeenCalled();
    expect(site.closeSnag).not.toHaveBeenCalled();
  });

  it("maps all 15 contract mutation routes once to their typed SiteService command", async () => {
    const cases: Array<[string, string, keyof typeof bodies, string, string]> = [
      ["POST", `/projects/${projectId}/responsible`, "responsible", "responsible", projectId],
      ["POST", `/projects/${projectId}/packages`, "createPackage", "createPackage", projectId],
      ["POST", `/packages/${recordId}/progress`, "progress", "progress", recordId],
      ["POST", `/packages/${recordId}/complete`, "completePackage", "completePackage", recordId],
      ["POST", `/projects/${projectId}/manpower`, "manpower", "manpower", projectId],
      ["POST", `/projects/${projectId}/reports`, "report", "report", projectId],
      ["POST", `/reports/${recordId}/confirm`, "confirmReport", "confirmReport", recordId],
      ["POST", `/projects/${projectId}/snags`, "snag", "snag", projectId],
      ["POST", `/snags/${recordId}/assign`, "assignFixer", "assignFixer", recordId],
      ["POST", `/snags/${recordId}/start`, "startRepair", "startRepair", recordId],
      ["POST", `/snags/${recordId}/ready`, "readyRepair", "readyRepair", recordId],
      ["POST", `/snags/${recordId}/verifier`, "appointVerifier", "appointVerifier", recordId],
      ["POST", `/snags/${recordId}/verify`, "verify", "verify", recordId],
      ["POST", `/snags/${recordId}/close`, "closeSnag", "closeSnag", recordId],
      ["POST", `/projects/${projectId}/handover`, "handover", "handover", projectId]
    ];
    for (const [, path, bodyKey, method, id] of cases) {
      const response = await write(path, bodies[bodyKey]);
      expect(response.status).toBe(201);
      expect(site[method]).toHaveBeenCalledWith(expect.objectContaining({ accountId, sessionId: "session-id" }), id, expect.objectContaining({ ...bodies[bodyKey] }));
      expect(site[method]).toHaveBeenCalledTimes(1);
      site[method]!.mockClear();
    }
    expect(cases).toHaveLength(15);
  });
});

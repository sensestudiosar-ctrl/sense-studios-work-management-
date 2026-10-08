import "reflect-metadata";
import { ForbiddenException, UnauthorizedException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardService } from "./dashboard.service.js";

const accountId = "55555555-5555-4555-8555-555555555555";
const recordId = "11111111-1111-4111-8111-111111111111";
const organizationId = "44444444-4444-4444-8444-444444444444";
const token = "dashboard-current-csrf";
const origin = "http://localhost:5173";
const filter = { category: "employee", from: "2026-10-01", to: "2026-10-05" };
const snapshotBody = { commandId: recordId, ...filter, reason: "Freeze reviewed employee report" };
const reminderBody = { commandId: recordId, title: "Review current tasks", dueAt: "2026-10-06T09:00:00.000Z", reason: "Keep the next review visible" };
const ruleBody = { commandId: recordId, kind: "TASK_REMINDER", enabled: true, localTime: "09:00", timezone: "Asia/Kolkata", offsetDays: 2, audience: "OWNER", critical: false, mandatory: false, reason: "Set an explicit task reminder" };
const report = { title: "Employee report", category: "employee", from: filter.from, to: filter.to, generatedAt: "2026-10-05T12:00:00.000Z", columns: [{ key: "employee", label: "Employee" }], rows: [{ employee: "Asha" }], unavailable: [] };

describe("S24 dashboard HTTP boundaries", () => {
  let app: INestApplication;
  let kind = "OWNER";
  let ready = true;
  const dashboard = {
    dashboard: jest.fn(async () => ({ today: "2026-10-05", sections: [], decisions: { items: [] } })),
    context: jest.fn(async () => ({ owner: true, categories: [] })),
    preview: jest.fn(async () => report),
    freeze: jest.fn(async (actor: { kind: string }) => { if (actor.kind !== "OWNER") throw new ForbiddenException("Owner finalization required"); return { id: recordId }; }),
    snapshots: jest.fn(async () => ({ snapshots: [] })),
    snapshot: jest.fn(async () => ({ snapshot: { id: recordId }, table: report })),
    schedules: jest.fn(async (actor: { kind: string }) => { if (actor.kind !== "OWNER") throw new ForbiddenException("Owner schedule access required"); return { rules: [] }; }),
    saveSchedule: jest.fn(async (actor: { kind: string }) => { if (actor.kind !== "OWNER") throw new ForbiddenException("Owner schedule access required"); return { id: recordId, version: 1 }; }),
    reminders: jest.fn(async () => ({ reminders: [] })),
    summaries: jest.fn(async () => ({ summaries: [] })),
    addReminder: jest.fn(async () => ({ id: recordId })),
  };

  beforeAll(async () => {
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: origin, ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({ controllers: [DashboardController], providers: [
      { provide: IdentityService, useValue: {
        session: jest.fn(async (secret?: string) => {
          if (secret !== "dashboard-session") throw new UnauthorizedException("Authentication required");
          return { row: { accountId, id: "session-id" }, csrfToken: token };
        }),
        ownerReady: jest.fn(async () => ready),
        verifyCsrf: jest.fn((active: { csrfToken: string }, supplied?: string) => { if (supplied !== active.csrfToken) throw new ForbiddenException("Request could not be verified"); }),
      } },
      { provide: ProjectService, useValue: { actor: jest.fn(async () => ({ accountId, organizationId, kind })) } },
      { provide: DashboardService, useValue: dashboard }, { provide: RUNTIME_CONFIG, useValue: config },
    ] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix("api/v1"); await app.init();
  });
  beforeEach(() => { kind = "OWNER"; ready = true; jest.clearAllMocks(); });
  afterAll(async () => app.close());

  const get = (path: string) => request(app.getHttpServer()).get(`/api/v1/${path}`).set("Cookie", "sense_sid=dashboard-session");
  const post = (path: string, value: object) => request(app.getHttpServer()).post(`/api/v1/${path}`).set("Cookie", "sense_sid=dashboard-session").set("Origin", origin).set("x-csrf-token", token).send(value);

  it("denies unauthenticated, portal, and incomplete Owner sessions before reads", async () => {
    expect((await request(app.getHttpServer()).get("/api/v1/dashboard").set("Cookie", "sense_client_sid=client-session")).status).toBe(401);
    for (const portalKind of ["CLIENT", "EXTERNAL"]) { kind = portalKind; expect((await get("dashboard")).status).toBe(403); }
    kind = "OWNER"; ready = false; expect((await get("reports/context")).status).toBe(403);
    expect(dashboard.dashboard).not.toHaveBeenCalled();
    expect(dashboard.context).not.toHaveBeenCalled();
  });

  it("protects every read with no-store and passes the active internal session", async () => {
    kind = "STAFF";
    for (const [path, spy] of [["dashboard", dashboard.dashboard], ["reports/context", dashboard.context], ["reports/snapshots", dashboard.snapshots], ["dashboard/reminders", dashboard.reminders], ["dashboard/summaries", dashboard.summaries]] as const) {
      const result = await get(path); expect(result.status).toBe(200); expect(result.headers["cache-control"]).toBe("no-store"); expect(spy).toHaveBeenCalledWith(expect.objectContaining({ accountId, sessionId: "session-id", kind: "STAFF" }));
    }
    const denied = await get("dashboard/schedules"); expect(denied.status).toBe(403); expect(denied.headers["cache-control"]).toBe("no-store");
    kind = "OWNER"; expect((await get("dashboard/schedules")).status).toBe(200);
  });

  it("validates and forwards report previews and Owner snapshot commands with CSRF", async () => {
    kind = "STAFF";
    const preview = await post("reports/preview", filter); expect(preview.status).toBe(201); expect(preview.headers["cache-control"]).toBe("no-store");
    expect(dashboard.preview).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-id", kind: "STAFF" }), filter);
    for (const bad of [{ ...filter, from: "2026-02-30" }, { ...filter, category: "made_up" }, { ...filter, extra: "unexpected" }, { ...filter, from: "2026-10-06" }]) expect((await post("reports/preview", bad)).status).toBe(400);
    kind = "STAFF"; expect((await post("reports/snapshots", snapshotBody)).status).toBe(403);
    kind = "OWNER"; expect((await post("reports/snapshots", snapshotBody)).status).toBe(201);
    expect(dashboard.freeze).toHaveBeenCalledWith(expect.objectContaining({ kind: "OWNER" }), snapshotBody);
  });

  it("rejects missing and foreign origins or invalid CSRF before mutation", async () => {
    const send = (suppliedOrigin?: string, csrf?: string) => {
      const req = request(app.getHttpServer()).post("/api/v1/dashboard/reminders").set("Cookie", "sense_sid=dashboard-session");
      if (suppliedOrigin) req.set("Origin", suppliedOrigin);
      if (csrf) req.set("x-csrf-token", csrf);
      return req.send(reminderBody);
    };
    for (const suppliedOrigin of [undefined, "https://foreign.test"]) expect((await send(suppliedOrigin, token)).status).toBe(403);
    expect((await send(origin)).status).toBe(403);
    expect(dashboard.addReminder).not.toHaveBeenCalled();
    expect((await post("dashboard/reminders", reminderBody)).headers["cache-control"]).toBe("no-store");
    expect(dashboard.addReminder).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-id" }), reminderBody);
  });

  it("strictly validates reminder/schedule fields and rejects malformed resource identifiers", async () => {
    expect((await post("dashboard/reminders", { ...reminderBody, creatorId: accountId })).status).toBe(400);
    expect((await post("dashboard/schedules", { ...ruleBody, audience: "EVERYONE" })).status).toBe(400);
    expect((await post("dashboard/schedules", { ...ruleBody, offsetDays: undefined })).status).toBe(400);
    kind = "STAFF"; expect((await post("dashboard/schedules", ruleBody)).status).toBe(403);
    kind = "OWNER"; expect((await post("dashboard/schedules", ruleBody)).status).toBe(201);
    expect(dashboard.saveSchedule).toHaveBeenCalledWith(expect.objectContaining({ kind: "OWNER" }), ruleBody);
    expect((await post("dashboard/schedules/not-a-uuid", { ...ruleBody, expectedVersion: 1 })).status).toBe(400);
    expect((await get("reports/snapshots/not-a-uuid")).status).toBe(400);
    expect(dashboard.snapshot).not.toHaveBeenCalled();
  });

  it("rechecks source report access through service methods and emits safe export headers and bytes", async () => {
    kind = "STAFF";
    const current = await get("reports/export?category=employee&from=2026-10-01&to=2026-10-05&format=csv");
    expect(current.status).toBe(200); expect(current.headers["cache-control"]).toBe("no-store");
    expect(current.headers["content-type"]).toContain("text/csv"); expect(current.headers["content-disposition"]).toContain("attachment; filename=\"sense-employee-2026-10-01-2026-10-05.csv\"");
    expect(current.text).toContain("Asha"); expect(dashboard.preview).toHaveBeenCalledWith(expect.objectContaining({ kind: "STAFF" }), filter);
    const frozen = await get(`reports/snapshots/${recordId}/export?format=print`);
    expect(frozen.status).toBe(200); expect(frozen.headers["cache-control"]).toBe("no-store"); expect(frozen.headers["content-type"]).toContain("text/html"); expect(frozen.headers["content-disposition"]).toContain("inline;");
    expect(frozen.text).toContain("Employee report"); expect(dashboard.snapshot).toHaveBeenCalledWith(expect.objectContaining({ kind: "STAFF" }), recordId);
    for (const path of ["reports/export?category=employee&from=2026-10-01&to=2026-10-05&format=exe", "reports/export?category=employee&from=2026-02-30&to=2026-03-01&format=csv", "reports/snapshots/not-a-uuid/export?format=pdf", `reports/snapshots/${recordId}/export?format=exe`]) expect((await get(path)).status).toBe(400);
    expect(dashboard.preview).toHaveBeenCalledTimes(1); expect(dashboard.snapshot).toHaveBeenCalledTimes(1);
  });
});

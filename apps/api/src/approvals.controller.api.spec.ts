import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ApprovalService } from "./approval.service.js";
import { ApprovalsController } from "./approvals.controller.js";

const sessionSecret = "approval-test-session-secret";
const accountId = "55555555-5555-4555-8555-555555555555";

describe("S05 read-only approval queue HTTP contract", () => {
  let app: INestApplication;
  let kind: "OWNER" | "STAFF";
  let ownerReady: boolean;
  let sessionValid: boolean;
  let service: { attention: jest.Mock; attentionItem: jest.Mock; actionable: jest.Mock };
  let identity: { session: jest.Mock; ownerReady: jest.Mock };

  beforeAll(async () => {
    kind = "OWNER";
    ownerReady = true;
    sessionValid = true;
    identity = {
      session: jest.fn(async (secret?: string) => {
        if (!sessionValid || secret !== sessionSecret) throw new UnauthorizedException("Authentication required");
        return { row: { accountId, account: { kind } } };
      }),
      ownerReady: jest.fn(async () => ownerReady)
    };
    service = { actionable: jest.fn(async () => ({ source: "approval", total: 0, items: [], offset: 0, limit: 25, readAt: "2026-10-13T00:00:00Z" })), attention: jest.fn(async () => ({ items: [], nextCursor: null })), attentionItem: jest.fn(async () => ({ id: "request-1" })) };
    const config: RuntimeConfig = {
      nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test",
      webOrigin: "http://localhost:5173", ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48)
    };
    const module = await Test.createTestingModule({
      controllers: [ApprovalsController],
      providers: [
        { provide: IdentityService, useValue: identity },
        { provide: ApprovalService, useValue: service },
        { provide: RUNTIME_CONFIG, useValue: config }
      ]
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  beforeEach(() => {
    kind = "OWNER";
    ownerReady = true;
    sessionValid = true;
    jest.clearAllMocks();
  });

  afterAll(async () => app.close());

  const cookie = `sense_sid=${sessionSecret}`;

  it("exposes an exact independent decidable source with no-store and bounded pagination", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/approvals/actionable?offset=25&limit=10").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(service.actionable).toHaveBeenCalledWith(accountId, 25, 10);
    expect(response.body).toMatchObject({ source: "approval", total: 0 });
  });
  it("rejects malformed actionable pagination and unready Owner identity", async () => {
    expect((await request(app.getHttpServer()).get("/api/v1/approvals/actionable?offset=-1").set("Cookie", cookie)).status).toBe(400);
    expect((await request(app.getHttpServer()).get("/api/v1/approvals/actionable?limit=101").set("Cookie", cookie)).status).toBe(400);
    ownerReady = false;
    expect((await request(app.getHttpServer()).get("/api/v1/approvals/actionable").set("Cookie", cookie)).status).toBe(403);
    expect(service.actionable).not.toHaveBeenCalled();
  });
  it("requires an authenticated session", async () => {
    sessionValid = false;
    const response = await request(app.getHttpServer()).get("/api/v1/approvals/attention");
    expect(response.status).toBe(401);
    expect(service.attention).not.toHaveBeenCalled();
  });

  it("returns the read-only queue for an authenticated Owner and passes bounded pagination", async () => {
    service.attention.mockResolvedValue({ items: [{ id: "request-1" }], nextCursor: "next" });
    const response = await request(app.getHttpServer()).get("/api/v1/approvals/attention?limit=12&cursor=opaque")
      .set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({ items: [{ id: "request-1" }], nextCursor: "next" });
    expect(service.attention).toHaveBeenCalledWith(accountId, 12, "opaque");
  });

  it("rejects invalid limit and cursor values before querying the service", async () => {
    const invalidLimit = await request(app.getHttpServer()).get("/api/v1/approvals/attention?limit=101").set("Cookie", cookie);
    const invalidCursor = await request(app.getHttpServer()).get(`/api/v1/approvals/attention?cursor=${"x".repeat(513)}`).set("Cookie", cookie);
    expect(invalidLimit.status).toBe(400);
    expect(invalidCursor.status).toBe(400);
    expect(service.attention).not.toHaveBeenCalled();
  });

  it("reads one exact policy-visible pending decision without enabling mutations", async () => {
    const requestId = "55555555-5555-4555-8555-555555555501";
    service.attentionItem.mockResolvedValue({ id: requestId, typeKey: "test.policy", title: "Current decision" });
    const response = await request(app.getHttpServer()).get(`/api/v1/approvals/attention/${requestId}`).set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({ id: requestId, typeKey: "test.policy", title: "Current decision" });
    expect(service.attentionItem).toHaveBeenCalledWith(accountId, requestId);
    expect(service.attention).not.toHaveBeenCalled();
  });

  it("rejects malformed exact references before querying the service", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/approvals/attention/not-a-uuid").set("Cookie", cookie);
    expect(response.status).toBe(400);
    expect(service.attentionItem).not.toHaveBeenCalled();
  });

  it("does not expose a generic request creation route", async () => {
    const response = await request(app.getHttpServer()).post("/api/v1/approvals").set("Cookie", cookie).send({ typeKey: "test.anything" });
    expect(response.status).toBe(404);
    expect(service.attention).not.toHaveBeenCalled();
    expect(service.attentionItem).not.toHaveBeenCalled();
  });

  it("requires Owner setup completion before reading as Owner", async () => {
    ownerReady = false;
    const response = await request(app.getHttpServer()).get("/api/v1/approvals/attention").set("Cookie", cookie);
    expect(response.status).toBe(403);
    expect(service.attention).not.toHaveBeenCalled();
  });

  it("does not grant Team Leaders queue access from their account kind alone", async () => {
    kind = "STAFF";
    service.attention.mockRejectedValue(new ForbiddenException("Permission denied"));
    const response = await request(app.getHttpServer()).get("/api/v1/approvals/attention").set("Cookie", cookie);
    expect(response.status).toBe(403);
    expect(service.attention).toHaveBeenCalledWith(accountId, 25, undefined);
  });
});

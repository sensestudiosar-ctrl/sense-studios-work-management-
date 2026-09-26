import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityController } from "./identity.controller.js";
import { IdentityService } from "./identity.service.js";

const csrfToken = "csrf-token-for-current-session";
const sessionSecret = "session-secret-that-must-stay-in-cookie";
const sessionId = "a5a5f862-0473-4bd2-9329-90fa057139f1";
const accountId = "c64f2145-5810-4a7e-9485-fbe9099c50cf";

describe("identity HTTP security contract", () => {
  let app: INestApplication;
  let currentSecret: string | undefined;
  let revoked = false;
  let service: {
    session: jest.Mock;
    verifyCsrf: jest.Mock;
    logout: jest.Mock;
    listSessions: jest.Mock;
    revokeSession: jest.Mock;
    loginVerify: jest.Mock;
    ownerReady: jest.Mock;
    activePasskeyCount: jest.Mock;
  };

  beforeAll(async () => {
    service = {
      session: jest.fn(async (secret?: string) => {
        if (secret !== sessionSecret || revoked) throw new UnauthorizedException("Authentication required");
        return {
          row: {
            id: sessionId,
            accountId,
            account: {
              id: accountId,
              normalizedEmail: "owner@example.test",
              kind: "OWNER",
              state: "ACTIVE",
              internalSecret: "database-only-value"
            }
          },
          csrfToken
        };
      }),
      verifyCsrf: jest.fn((active: { csrfToken: string }, token?: string) => {
        if (!token || token !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
      }),
      logout: jest.fn(async () => { revoked = true; }),
      listSessions: jest.fn(async () => [{ id: sessionId, createdAt: new Date("2026-09-26T00:00:00Z"), lastUsedAt: new Date("2026-09-26T00:30:00Z"), expiresAt: new Date("2026-09-26T12:00:00Z"), revokedAt: null, userAgent: "test" }]),
      revokeSession: jest.fn(async () => undefined),
      loginVerify: jest.fn(async () => ({ secret: sessionSecret, csrfToken, sessionId })),
      ownerReady: jest.fn(async () => true),
      activePasskeyCount: jest.fn(async () => 2)
    };
    const config: RuntimeConfig = {
      nodeEnv: "test",
      port: 4000,
      databaseUrl: "postgresql://test:test@localhost:5432/test",
      webOrigin: "http://localhost:5173",
      ownerBootstrapEmail: "owner@example.test",
      ownerBootstrapSecret: "b".repeat(48)
    };
    const module = await Test.createTestingModule({
      controllers: [IdentityController],
      providers: [
        { provide: IdentityService, useValue: service },
        { provide: RUNTIME_CONFIG, useValue: config }
      ]
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  beforeEach(() => {
    currentSecret = undefined;
    revoked = false;
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  function authenticated() {
    currentSecret = sessionSecret;
  }

  function cookieHeader() {
    return `sense_sid=${currentSecret}`;
  }

  it("rejects session listing without an authenticated cookie", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/auth/sessions");
    expect(response.status).toBe(401);
    expect(service.listSessions).not.toHaveBeenCalled();
  });

  it("clears stale cookies and exposes only minimal identity data on session restore", async () => {
    const denied = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", "sense_sid=expired-secret");
    expect(denied.status).toBe(401);
    expect(denied.headers["set-cookie"]?.join(";")).toContain("sense_sid=");

    authenticated();
    const response = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", cookieHeader());
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({
      account: { id: accountId, email: "owner@example.test", kind: "OWNER" },
      csrfToken,
      ownerSetupRequired: false,
      activePasskeyCount: 2
    });
    expect(JSON.stringify(response.body)).not.toContain("database-only-value");
    expect(JSON.stringify(response.body)).not.toContain(sessionSecret);
  });

  it("requires an allowed Origin and a valid CSRF token before logout", async () => {
    authenticated();
    const wrongOrigin = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookieHeader())
      .set("Origin", "https://attacker.example")
      .set("x-csrf-token", csrfToken);
    expect(wrongOrigin.status).toBe(403);

    const missingCsrf = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookieHeader())
      .set("Origin", "http://localhost:5173");
    expect(missingCsrf.status).toBe(403);

    const badCsrf = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookieHeader())
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", "attacker-token");
    expect(badCsrf.status).toBe(403);
    expect(service.logout).not.toHaveBeenCalled();

    const success = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookieHeader())
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken);
    expect(success.status).toBe(204);
    expect(success.headers["set-cookie"]?.join(";")).toContain("sense_sid=");
    expect(service.logout).toHaveBeenCalledWith(sessionSecret);
  });

  it("denies reuse after logout and never accepts a session secret from the request body", async () => {
    authenticated();
    await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookieHeader())
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken);

    const reused = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", cookieHeader());
    expect(reused.status).toBe(401);

    const bodyOnly = await request(app.getHttpServer())
      .get("/api/v1/auth/sessions")
      .send({ sessionSecret });
    expect(bodyOnly.status).toBe(401);
    expect(service.listSessions).not.toHaveBeenCalled();
  });

  it("rejects malformed login ceremonies before invoking authentication", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/passkey/login/verify")
      .set("Origin", "http://localhost:5173")
      .send({ ceremonyId: "not-a-uuid", response: {} });
    expect(response.status).toBe(400);
    expect(service.loginVerify).not.toHaveBeenCalled();
  });

  it("does not return session or CSRF secrets in successful login JSON", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/passkey/login/verify")
      .set("Origin", "http://localhost:5173")
      .send({ ceremonyId: "a5a5f862-0473-4bd2-9329-90fa057139f1", response: { id: "credential" } });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ authenticated: true });
    expect(JSON.stringify(response.body)).not.toContain(sessionSecret);
    expect(JSON.stringify(response.body)).not.toContain(csrfToken);
    expect(JSON.stringify(response.body)).not.toContain(sessionId);
    expect(response.headers["set-cookie"]?.join(";")).toContain(`sense_sid=${sessionSecret}`);
  });

  it("marks only the current account session as current and applies CSRF checks to targeted revocation", async () => {
    authenticated();
    const list = await request(app.getHttpServer()).get("/api/v1/auth/sessions").set("Cookie", cookieHeader());
    expect(list.status).toBe(200);
    expect(list.body).toEqual([expect.objectContaining({ id: sessionId, current: true })]);

    const denied = await request(app.getHttpServer())
      .delete(`/api/v1/auth/sessions/${sessionId}`)
      .set("Cookie", cookieHeader())
      .set("Origin", "http://localhost:5173");
    expect(denied.status).toBe(403);
    expect(service.revokeSession).not.toHaveBeenCalled();

    const accepted = await request(app.getHttpServer())
      .delete(`/api/v1/auth/sessions/${sessionId}`)
      .set("Cookie", cookieHeader())
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken);
    expect(accepted.status).toBe(204);
    expect(service.revokeSession).toHaveBeenCalledWith(accountId, sessionId);
  });
});

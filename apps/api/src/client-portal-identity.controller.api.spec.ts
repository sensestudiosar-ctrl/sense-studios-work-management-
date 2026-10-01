import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { jest } from "@jest/globals";
import request from "supertest";
import { AuthGuard } from "./auth.guard.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { ClientPortalIdentityController } from "./client-portal-identity.controller.js";
import { ClientPortalIdentityService } from "./client-portal-identity.service.js";
import { DatabaseService } from "./database.service.js";

const csrfToken = "portal-csrf-token-for-current-session";
const portalSecret = "portal-session-secret-that-must-stay-in-cookie";
const sessionId = "a5a5f862-0473-4bd2-9329-90fa057139f1";
const accountId = "c64f2145-5810-4a7e-9485-fbe9099c50cf";
const otherSessionId = "66a2c2b0-c23f-4fd1-a5b4-a927208866e6";
const webOrigin = "http://localhost:5173";
const active = {
  row: { id: sessionId, accountId, createdAt: new Date("2026-10-01T00:00:00Z") },
  account: { id: accountId, normalizedEmail: "client@example.test", kind: "CLIENT", state: "ACTIVE", internalSecret: "database-only-value" },
  csrfToken
};

describe("client portal identity HTTP security contract", () => {
  let app: INestApplication;
  let revoked = false;
  let identity: {
    requestCode: jest.Mock;
    verifyCode: jest.Mock;
    session: jest.Mock;
    verifyCsrf: jest.Mock;
    logout: jest.Mock;
    listSessions: jest.Mock;
    revokeSession: jest.Mock;
    registerOptions: jest.Mock;
    registerVerify: jest.Mock;
  };
  let internalIdentity: { session: jest.Mock };
  let passkeyCount: jest.Mock;
  let config: RuntimeConfig;

  beforeAll(async () => {
    identity = {
      requestCode: jest.fn(async () => ({ accepted: true })),
      verifyCode: jest.fn(async () => ({ secret: portalSecret, csrfToken, sessionId })),
      session: jest.fn(async (secret?: string) => {
        if (secret !== portalSecret || revoked) throw new UnauthorizedException("Authentication required");
        return active;
      }),
      verifyCsrf: jest.fn((session: { csrfToken: string }, token?: string) => {
        if (!token || token !== session.csrfToken) throw new ForbiddenException("Request could not be verified");
      }),
      logout: jest.fn(async () => { revoked = true; }),
      listSessions: jest.fn(async () => [{ id: sessionId, createdAt: new Date("2026-10-01T00:00:00Z"), lastUsedAt: new Date("2026-10-01T00:30:00Z"), expiresAt: new Date("2026-10-01T12:00:00Z"), revokedAt: null, userAgent: "test" }]),
      revokeSession: jest.fn(async () => undefined),
      registerOptions: jest.fn(async () => ({ ceremonyId: sessionId, options: { challenge: "public-challenge" } })),
      registerVerify: jest.fn(async () => undefined)
    };
    internalIdentity = { session: jest.fn(async () => { throw new UnauthorizedException("Internal session unavailable"); }) };
    passkeyCount = jest.fn(async () => 2);
    config = {
      nodeEnv: "test",
      port: 4000,
      databaseUrl: "postgresql://test:test@localhost:5432/test",
      webOrigin,
      ownerBootstrapEmail: "owner@example.test",
      ownerBootstrapSecret: "b".repeat(48)
    };
    const module = await Test.createTestingModule({
      controllers: [ClientPortalIdentityController],
      providers: [
        { provide: ClientPortalIdentityService, useValue: identity },
        { provide: DatabaseService, useValue: { prisma: { passkeyCredential: { count: passkeyCount } } } },
        { provide: RUNTIME_CONFIG, useValue: config }
      ]
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalGuards(new AuthGuard(module.get(Reflector), internalIdentity as never, config));
    await app.init();
  });

  beforeEach(() => {
    revoked = false;
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  function portalCookie() {
    return `sense_client_sid=${portalSecret}`;
  }

  function protectedPost(path: string) {
    return request(app.getHttpServer())
      .post(path)
      .set("Cookie", portalCookie())
      .set("Origin", webOrigin)
      .set("x-csrf-token", csrfToken);
  }

  it("uses the public generic code request contract and marks even origin errors no-store", async () => {
    const denied = await request(app.getHttpServer()).post("/api/v1/client-portal/auth/code/request").send({ email: "client@example.test" });
    expect(denied.status).toBe(403);
    expect(denied.headers["cache-control"]).toBe("no-store");
    expect(identity.requestCode).not.toHaveBeenCalled();

    const accepted = await request(app.getHttpServer())
      .post("/api/v1/client-portal/auth/code/request")
      .set("Origin", webOrigin)
      .send({ email: "client@example.test" });
    expect(accepted.status).toBe(202);
    expect(accepted.headers["cache-control"]).toBe("no-store");
    expect(accepted.body).toEqual({ accepted: true });
    expect(JSON.stringify(accepted.body)).not.toMatch(/\d{6}/);
    expect(identity.requestCode).toHaveBeenCalledWith("client@example.test");
  });

  it("bounds code-request attempts by email and issues a host-only secure cookie on HTTPS", async () => {
    const email = `limited-${Date.now()}@example.test`;
    for (let attempt = 0; attempt < 20; attempt++) {
      const accepted = await request(app.getHttpServer())
        .post("/api/v1/client-portal/auth/code/request")
        .set("Origin", webOrigin)
        .send({ email });
      expect(accepted.status).toBe(202);
    }
    const limited = await request(app.getHttpServer())
      .post("/api/v1/client-portal/auth/code/request")
      .set("Origin", webOrigin)
      .send({ email });
    expect(limited.status).toBe(429);
    expect(limited.headers["cache-control"]).toBe("no-store");

    config.webOrigin = "https://portal.example.test";
    const secure = await request(app.getHttpServer())
      .post("/api/v1/client-portal/auth/code/verify")
      .set("Origin", config.webOrigin)
      .send({ email: "client@example.test", code: "004201" });
    const cookie = secure.headers["set-cookie"]?.join(";");
    config.webOrigin = webOrigin;
    expect(secure.status).toBe(201);
    expect(cookie).toContain(`__Host-sense_client_sid=${portalSecret}`);
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("Path=/");
    expect(secure.headers["set-cookie"]?.some((value) => value.startsWith("sense_client_sid="))).toBe(false);
  });

  it("accepts only a six-digit code and returns the portal cookie without secrets in JSON", async () => {
    const malformed = await request(app.getHttpServer())
      .post("/api/v1/client-portal/auth/code/verify")
      .set("Origin", webOrigin)
      .send({ email: "client@example.test", code: "12345" });
    expect(malformed.status).toBe(400);
    expect(malformed.headers["cache-control"]).toBe("no-store");
    expect(identity.verifyCode).not.toHaveBeenCalled();

    const verified = await request(app.getHttpServer())
      .post("/api/v1/client-portal/auth/code/verify")
      .set("Origin", webOrigin)
      .set("User-Agent", "portal-test-agent")
      .send({ email: "client@example.test", code: "004201" });
    expect(verified.status).toBe(201);
    expect(verified.headers["cache-control"]).toBe("no-store");
    expect(verified.body).toEqual({ authenticated: true });
    expect(JSON.stringify(verified.body)).not.toContain(portalSecret);
    expect(JSON.stringify(verified.body)).not.toContain(csrfToken);
    expect(JSON.stringify(verified.body)).not.toContain(sessionId);
    const cookie = verified.headers["set-cookie"]?.join(";");
    expect(cookie).toContain(`sense_client_sid=${portalSecret}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("sense_sid=");
    expect(identity.verifyCode).toHaveBeenCalledWith("client@example.test", "004201", "portal-test-agent", expect.any(String));
  });

  it("does not treat an internal staff cookie as a portal session", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/client-portal/auth/session")
      .set("Cookie", "sense_sid=staff-session-secret");
    expect(response.status).toBe(401);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(identity.session).toHaveBeenCalledWith(undefined);
    expect(internalIdentity.session).not.toHaveBeenCalled();
    expect(passkeyCount).not.toHaveBeenCalled();
  });

  it("restores only safe client identity and reports active passkeys", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/client-portal/auth/session")
      .set("Cookie", portalCookie());
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({
      account: { id: accountId, email: "client@example.test", kind: "CLIENT" },
      csrfToken,
      activePasskeyCount: 2
    });
    expect(JSON.stringify(response.body)).not.toContain("database-only-value");
    expect(passkeyCount).toHaveBeenCalledWith({ where: { accountId, revokedAt: null } });
  });

  it("requires Origin and CSRF for logout and clears only the portal cookie", async () => {
    const denied = await request(app.getHttpServer()).post("/api/v1/client-portal/auth/logout").set("Cookie", portalCookie());
    expect(denied.status).toBe(403);
    expect(denied.headers["cache-control"]).toBe("no-store");
    expect(identity.logout).not.toHaveBeenCalled();

    const accepted = await request(app.getHttpServer())
      .post("/api/v1/client-portal/auth/logout")
      .set("Cookie", portalCookie())
      .set("Origin", webOrigin)
      .set("x-csrf-token", csrfToken);
    expect(accepted.status).toBe(204);
    expect(accepted.headers["cache-control"]).toBe("no-store");
    expect(accepted.headers["set-cookie"]?.join(";")).toContain("sense_client_sid=");
    expect(identity.session).toHaveBeenCalledWith(portalSecret);
    expect(identity.logout).toHaveBeenCalledWith(portalSecret);
  });

  it("lists and revokes only sessions belonging to the authenticated client", async () => {
    const list = await request(app.getHttpServer()).get("/api/v1/client-portal/auth/sessions").set("Cookie", portalCookie());
    expect(list.status).toBe(200);
    expect(list.headers["cache-control"]).toBe("no-store");
    expect(list.body).toEqual([expect.objectContaining({ id: sessionId, current: true })]);
    expect(identity.listSessions).toHaveBeenCalledWith(accountId);

    const denied = await request(app.getHttpServer())
      .delete(`/api/v1/client-portal/auth/sessions/${otherSessionId}`)
      .set("Cookie", portalCookie())
      .set("Origin", webOrigin);
    expect(denied.status).toBe(403);
    expect(denied.headers["cache-control"]).toBe("no-store");
    expect(identity.revokeSession).not.toHaveBeenCalled();

    const revokedSession = await request(app.getHttpServer())
      .delete(`/api/v1/client-portal/auth/sessions/${otherSessionId}`)
      .set("Cookie", portalCookie())
      .set("Origin", webOrigin)
      .set("x-csrf-token", csrfToken);
    expect(revokedSession.status).toBe(204);
    expect(identity.revokeSession).toHaveBeenCalledWith(accountId, otherSessionId);
  });

  it("requires portal CSRF for passkey registration and validates the ceremony payload", async () => {
    const denied = await request(app.getHttpServer())
      .post("/api/v1/client-portal/auth/passkeys/options")
      .set("Cookie", portalCookie())
      .set("Origin", webOrigin);
    expect(denied.status).toBe(403);
    expect(identity.registerOptions).not.toHaveBeenCalled();

    const options = await protectedPost("/api/v1/client-portal/auth/passkeys/options");
    expect(options.status).toBe(201);
    expect(options.headers["cache-control"]).toBe("no-store");
    expect(identity.registerOptions).toHaveBeenCalledWith(active);

    const invalid = await protectedPost("/api/v1/client-portal/auth/passkeys/verify").send({ ceremonyId: "bad-id", response: { id: "credential" } });
    expect(invalid.status).toBe(400);
    expect(invalid.headers["cache-control"]).toBe("no-store");
    expect(identity.registerVerify).not.toHaveBeenCalled();

    const verified = await protectedPost("/api/v1/client-portal/auth/passkeys/verify")
      .send({ ceremonyId: sessionId, response: { id: "credential", response: { clientDataJSON: "payload" } } });
    expect(verified.status).toBe(201);
    expect(verified.body).toEqual({ registered: true });
    expect(identity.registerVerify).toHaveBeenCalledWith(active, sessionId, { id: "credential", response: { clientDataJSON: "payload" } });
  });
});

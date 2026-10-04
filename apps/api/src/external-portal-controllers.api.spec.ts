import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { ExternalPortalIdentityService } from "./external-portal-identity.service.js";
import { ExternalPortalIdentityController } from "./external-portal-identity.controller.js";
import { ExternalPortalController } from "./external-portal.controller.js";
import { ExternalAccessController } from "./external-access.controller.js";
import { ExternalPortalService } from "./external-portal.service.js";

const origin = "http://localhost:5173";
const accountId = "c64f2145-5810-4a7e-9485-fbe9099c50cf";
const sessionId = "a5a5f862-0473-4bd2-9329-90fa057139f1";
const projectId = "e1b2346d-e07c-4d5f-afce-2d1689900068";
const csrfToken = "external-current-session-csrf";
const externalSecret = "external-cookie-secret";
const staffSecret = "staff-cookie-secret";
const activeExternal = {
  row: { id: sessionId, accountId, csrfTokenHash: "stored-hash" },
  account: { id: accountId, normalizedEmail: "vendor@example.test", kind: "EXTERNAL", state: "ACTIVE" },
  csrfToken
};

describe("external portal and access controller security contract", () => {
  let app: INestApplication;
  let config: RuntimeConfig;
  let externalIdentity: Record<string, jest.Mock>;
  let internalIdentity: Record<string, jest.Mock>;
  let external: Record<string, jest.Mock>;

  beforeAll(async () => {
    config = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost/test", webOrigin: origin, ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined };
    externalIdentity = {
      requestCode: jest.fn(async () => ({ accepted: true })),
      verifyCode: jest.fn(async () => ({ secret: externalSecret })),
      session: jest.fn(async (secret?: string) => {
        if (secret !== externalSecret) throw new UnauthorizedException("Authentication required");
        return activeExternal;
      }),
      verifyCsrf: jest.fn((active: { csrfToken: string }, token?: string) => {
        if (token !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
      }),
      logout: jest.fn(async () => undefined), listSessions: jest.fn(async () => []), revokeSession: jest.fn(async () => undefined)
    };
    internalIdentity = {
      ownerReady: jest.fn(async () => true),
      session: jest.fn(async (secret?: string) => {
        if (secret !== staffSecret) throw new UnauthorizedException("Authentication required");
        return { row: { id: "staff-session", accountId: "owner-id" }, csrfToken: "staff-csrf" };
      }),
      verifyCsrf: jest.fn((active: { csrfToken: string }, token?: string) => {
        if (token !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
      })
    };
    external = Object.fromEntries([
      "projects", "workspace", "file", "submit", "acknowledge", "cadShare", "uploadStart", "uploadChunk", "uploadFinalize", "uploadFile",
      "staffWorkspace", "createGrant", "changeGrant", "createRequest", "issueCad", "revokeCad"
    ].map((name) => [name, jest.fn(async () => ({ ok: true }))]));
    const module = await Test.createTestingModule({
      controllers: [ExternalPortalIdentityController, ExternalPortalController, ExternalAccessController],
      providers: [
        { provide: ExternalPortalIdentityService, useValue: externalIdentity },
        { provide: ExternalPortalService, useValue: external },
        { provide: IdentityService, useValue: internalIdentity },
        { provide: ProjectService, useValue: { actor: jest.fn(async () => ({ accountId: "owner-id", kind: "OWNER" })) } },
        { provide: RUNTIME_CONFIG, useValue: config }
      ]
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it("accepts only strict, same-origin generic external OTP requests and sets an isolated cookie", async () => {
    const blocked = await request(app.getHttpServer()).post("/api/v1/external-portal/auth/code").set("Origin", "https://attacker.test").send({ email: "vendor@example.test" });
    expect(blocked.status).toBe(403);
    expect(blocked.headers["cache-control"]).toBe("no-store");
    expect(externalIdentity.requestCode).not.toHaveBeenCalled();

    const extra = await request(app.getHttpServer()).post("/api/v1/external-portal/auth/code").set("Origin", origin).send({ email: "vendor@example.test", role: "OWNER" });
    expect(extra.status).toBe(400);
    expect(extra.headers["cache-control"]).toBe("no-store");

    const accepted = await request(app.getHttpServer()).post("/api/v1/external-portal/auth/code").set("Origin", origin).send({ email: "vendor@example.test" });
    expect(accepted.status).toBe(202);
    expect(accepted.body).toEqual({ accepted: true });
    expect(externalIdentity.requestCode).toHaveBeenCalledWith("vendor@example.test");

    const verified = await request(app.getHttpServer()).post("/api/v1/external-portal/auth/verify").set("Origin", origin).send({ email: "vendor@example.test", code: "004201" });
    expect(verified.status).toBe(201);
    expect(verified.headers["set-cookie"]?.join(";")).toContain(`sense_external_sid=${externalSecret}`);
    expect(verified.headers["set-cookie"]?.join(";")).toContain("HttpOnly");
    expect(JSON.stringify(verified.body)).not.toContain(externalSecret);
  });

  it("does not accept staff or client cookies as external identity and requires origin plus current CSRF on writes", async () => {
    const staff = await request(app.getHttpServer()).get("/api/v1/external-portal/projects").set("Cookie", `${"sense_sid"}=${staffSecret}`);
    expect(staff.status).toBe(401);
    expect(externalIdentity.session).toHaveBeenCalledWith(undefined);

    const client = await request(app.getHttpServer()).get("/api/v1/external-portal/projects").set("Cookie", "sense_client_sid=client-secret");
    expect(client.status).toBe(401);
    expect(externalIdentity.session).toHaveBeenCalledWith(undefined);

    const wrongOrigin = await request(app.getHttpServer()).post(`/api/v1/external-portal/projects/${projectId}/submissions`).set("Cookie", `sense_external_sid=${externalSecret}`).set("x-csrf-token", csrfToken).set("x-idempotency-key", sessionId).send({});
    expect(wrongOrigin.status).toBe(403);
    expect(external.submit).not.toHaveBeenCalled();

    const wrongCsrf = await request(app.getHttpServer()).post(`/api/v1/external-portal/projects/${projectId}/submissions`).set("Cookie", `sense_external_sid=${externalSecret}`).set("Origin", origin).set("x-csrf-token", "other-session-token").set("x-idempotency-key", sessionId).send({});
    expect(wrongCsrf.status).toBe(403);
    expect(external.submit).not.toHaveBeenCalled();
  });

  it("rejects unknown submission fields and malformed idempotency keys before calling the portal service", async () => {
    const strict = await request(app.getHttpServer()).post(`/api/v1/external-portal/projects/${projectId}/submissions`)
      .set("Cookie", `sense_external_sid=${externalSecret}`).set("Origin", origin).set("x-csrf-token", csrfToken).set("x-idempotency-key", sessionId)
      .send({ grantId: sessionId, kind: "REQUEST", title: "Request", body: "Please clarify", reason: "Need context", ownerOnly: true });
    expect(strict.status).toBe(400);
    expect(external.submit).not.toHaveBeenCalled();

    const invalidKey = await request(app.getHttpServer()).post(`/api/v1/external-portal/projects/${projectId}/submissions`)
      .set("Cookie", `sense_external_sid=${externalSecret}`).set("Origin", origin).set("x-csrf-token", csrfToken).set("x-idempotency-key", "unstable")
      .send({ grantId: sessionId, kind: "REQUEST", title: "Request", body: "Please clarify", reason: "Need context" });
    expect(invalidKey.status).toBe(400);
    expect(external.submit).not.toHaveBeenCalled();
  });

  it("requires staff CSRF/origin and strict grant payloads before management writes", async () => {
    const deniedOrigin = await request(app.getHttpServer()).post(`/api/v1/external-access/projects/${projectId}/grants`)
      .set("Cookie", `sense_sid=${staffSecret}`).set("x-csrf-token", "staff-csrf")
      .send({ email: "vendor@example.test", portalType: "CONSULTANT", revisionIds: [], releaseIds: [], packageIds: [], reason: "Scope" });
    expect(deniedOrigin.status).toBe(403);
    expect(external.createGrant).not.toHaveBeenCalled();

    const strict = await request(app.getHttpServer()).post(`/api/v1/external-access/projects/${projectId}/grants`)
      .set("Cookie", `sense_sid=${staffSecret}`).set("Origin", origin).set("x-csrf-token", "staff-csrf")
      .send({ email: "vendor@example.test", portalType: "CONSULTANT", revisionIds: [], releaseIds: [], packageIds: [], reason: "Scope", allProjects: true });
    expect(strict.status).toBe(400);
    expect(external.createGrant).not.toHaveBeenCalled();
  });
});

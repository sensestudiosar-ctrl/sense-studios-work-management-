import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";
import { EmailVerificationService } from "./email-verification.service.js";

const accountId = "c64f2145-5810-4a7e-9485-fbe9099c50cf";
const sessionSecret = "notification-session-secret";
const csrfToken = "notification-csrf-token";

describe("notification HTTP recipient boundary", () => {
  let app: INestApplication;
  let service: { listInbox: jest.Mock; markRead: jest.Mock; getPreferences: jest.Mock; getEmailDeliveryStatus: jest.Mock; setPreference: jest.Mock; setQuietHours: jest.Mock; clearQuietHours: jest.Mock };
  const emailVerification = {
    status: jest.fn(async () => ({ verified: false })),
    requestCode: jest.fn(async () => ({ sent: true })),
    verifyCode: jest.fn(async () => ({ verified: true }))
  };
  const identity = {
    session: jest.fn(async (secret?: string) => {
      if (secret !== sessionSecret) throw new UnauthorizedException("Authentication required");
      return { row: { accountId }, csrfToken };
    }),
    verifyCsrf: jest.fn((active: { csrfToken: string }, token?: string) => {
      if (token !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
    })
  };

  beforeAll(async () => {
    service = {
      listInbox: jest.fn(async (id: string) => ({ items: [{ id, title: "Private" }], nextCursor: null })),
      markRead: jest.fn(async (id: string, notificationId: string) => ({ read: true, id, notificationId })),
      getPreferences: jest.fn(async (id: string) => ({ preferences: [], quietHours: null, id })),
      getEmailDeliveryStatus: jest.fn(async (id: string) => [{ id }]),
      setPreference: jest.fn(async (id: string, category: string, channel: string, enabled: boolean) => ({ id, category, channel, enabled })),
      setQuietHours: jest.fn(async (id: string, value: unknown) => ({ id, value })),
      clearQuietHours: jest.fn(async (id: string) => ({ id, cleared: true }))
    };
    const config: RuntimeConfig = {
      nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test",
      webOrigin: "http://localhost:5173", ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48)
    };
    const module = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: IdentityService, useValue: identity },
        { provide: NotificationsService, useValue: service },
        { provide: RUNTIME_CONFIG, useValue: config },
        { provide: EmailVerificationService, useValue: emailVerification }
      ]
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  const cookie = `sense_sid=${sessionSecret}`;
  const mutation = (path: string, method: "put" | "patch" | "delete") => request(app.getHttpServer())[method](path)
    .set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken);

  it("requires an authenticated session and never accepts a recipient account ID from the client", async () => {
    const unauthenticated = await request(app.getHttpServer()).get("/api/v1/notifications");
    expect(unauthenticated.status).toBe(401);
    const inbox = await request(app.getHttpServer()).get("/api/v1/notifications?accountId=somebody-else").set("Cookie", cookie);
    expect(inbox.status).toBe(200);
    expect(inbox.headers["cache-control"]).toBe("no-store");
    expect(service.listInbox).toHaveBeenCalledWith(accountId, undefined);
    const emailStatus = await request(app.getHttpServer()).get("/api/v1/notifications/email-status").set("Cookie", cookie);
    expect(emailStatus.body).toEqual({ verified: false, items: [{ id: accountId }] });
    expect(emailVerification.status).toHaveBeenCalledWith(accountId);
  });

  it("requires same-origin CSRF for writes and scopes reads to the authenticated account", async () => {
    const wrongOrigin = await request(app.getHttpServer()).patch("/api/v1/notifications/20cfef90-f016-4b85-8c57-74ade820b71b/read")
      .set("Cookie", cookie).set("Origin", "https://attacker.example").set("x-csrf-token", csrfToken);
    expect(wrongOrigin.status).toBe(403);
    const noCsrf = await request(app.getHttpServer()).put("/api/v1/notifications/preferences")
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").send({ category: "projects", channel: "EMAIL", enabled: false });
    expect(noCsrf.status).toBe(403);

    await mutation("/api/v1/notifications/20cfef90-f016-4b85-8c57-74ade820b71b/read", "patch");
    expect(service.markRead).toHaveBeenCalledWith(accountId, "20cfef90-f016-4b85-8c57-74ade820b71b");
    await request(app.getHttpServer()).get("/api/v1/notifications/preferences?accountId=foreign").set("Cookie", cookie);
    expect(service.getPreferences).toHaveBeenCalledWith(accountId);
  });

  it("strictly validates preference and quiet-hours mutations", async () => {
    const invalidPreference = await mutation("/api/v1/notifications/preferences", "put").send({ category: "projects", channel: "EMAIL", enabled: false, accountId: "foreign" });
    expect(invalidPreference.status).toBe(400);
    const validPreference = await mutation("/api/v1/notifications/preferences", "put").send({ category: "projects", channel: "EMAIL", enabled: false });
    expect(validPreference.status).toBe(200);
    expect(service.setPreference).toHaveBeenCalledWith(accountId, "projects", "EMAIL", false);

    const malformed = await mutation("/api/v1/notifications/quiet-hours", "put").send({ startLocal: "22:00", endLocal: "07:00", timeZone: "UTC", extra: true });
    expect(malformed.status).toBe(400);
    const valid = await mutation("/api/v1/notifications/quiet-hours", "put").send({ startLocal: "22:00", endLocal: "07:00", timeZone: "Asia/Kolkata" });
    expect(valid.status).toBe(200);
    expect(service.setQuietHours).toHaveBeenCalledWith(accountId, { startLocal: "22:00", endLocal: "07:00", timeZone: "Asia/Kolkata" });
  });

  it("requires same-origin CSRF for email verification and accepts only a six-digit code", async () => {
    const denied = await request(app.getHttpServer()).post("/api/v1/notifications/email-verification")
      .set("Cookie", cookie).set("Origin", "https://attacker.example").set("x-csrf-token", csrfToken);
    expect(denied.status).toBe(403);
    const sent = await request(app.getHttpServer()).post("/api/v1/notifications/email-verification")
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken);
    expect(sent.status).toBe(201);
    expect(emailVerification.requestCode).toHaveBeenCalledWith(accountId);

    const malformed = await request(app.getHttpServer()).post("/api/v1/notifications/email-verification/verify")
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken).send({ code: "12345" });
    expect(malformed.status).toBe(400);
    const verified = await request(app.getHttpServer()).post("/api/v1/notifications/email-verification/verify")
      .set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken).send({ code: "012345" });
    expect(verified.status).toBe(201);
    expect(emailVerification.verifyCode).toHaveBeenCalledWith(accountId, "012345");
  });
});

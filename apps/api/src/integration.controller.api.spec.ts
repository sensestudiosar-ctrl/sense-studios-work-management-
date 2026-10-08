import "reflect-metadata";
import { ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { IntegrationService } from "./integration.service.js";
import { IntegrationController } from "./integration.controller.js";
import { websiteSignature, type WebsiteEnquiry } from "./integration-webhook.js";

const accountId = "55555555-5555-4555-8555-555555555555";
const eventId = "33333333-3333-4333-8333-333333333333";
const csrfToken = "calendar-test-csrf";
const sessionId = "calendar-test-session-id";
const sessionSecret = "calendar-test-session-secret";
const connectorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const branchId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const sourceId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const routingActorId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const webhookSecret = "website-webhook-signing-secret-for-tests";
const calendarEvent = {
  uid: "event-opaque-id@example.invalid", kind: "MEETING" as const, label: "Meeting", start: "2026-10-05", end: "2026-10-06",
  allDay: true, sequence: 1, updatedAt: "2026-10-04T18:30:00+05:30", cancelled: false,
};

describe("S25 integration calendar HTTP boundary", () => {
  let app: INestApplication;
  let kind: "OWNER" | "STAFF";
  let isReady: boolean;
  let sessionValid: boolean;
  let identity: { session: jest.Mock; ownerReady: jest.Mock; verifyCsrf: jest.Mock };
  let service: Record<string, jest.Mock>;
  const actor = () => ({ accountId, kind, organizationId: "44444444-4444-4444-8444-444444444444" });

  beforeAll(async () => {
    kind = "STAFF"; isReady = true; sessionValid = true;
    identity = {
      session: jest.fn(async (secret?: string) => {
        if (!sessionValid || secret !== sessionSecret) throw new UnauthorizedException("Authentication required");
        return { row: { id: sessionId, accountId, account: { kind }, createdAt: new Date() }, csrfToken };
      }),
      ownerReady: jest.fn(async () => isReady),
      verifyCsrf: jest.fn((active: { csrfToken: string }, token?: string) => {
        if (!token || token !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
      }),
    };
    service = {
      actor: jest.fn(async () => actor()),
      setup: jest.fn(async () => ({ owner: kind === "OWNER", projects: [], events: [], subscription: { active: false }, connectorOptions: { branches: [], sources: [], actors: [] }, websiteConnectors: [], deliveries: [], locations: [{ projectId: eventId, label: "Site", latitude: 25.2, longitude: 55.3, mapUrl: "https://www.openstreetmap.org/?mlat=25.2&mlon=55.3" }] })),
      calendar: jest.fn(async () => ({ events: [calendarEvent] })),
      subscription: jest.fn(async () => ({ id: "subscription-id", token: "one-time-secret", relativeUrl: "/api/v1/integrations/calendar/subscriptions/one-time-secret.ics", createdAt: "2026-10-05T00:00:00.000Z" })),
      revokeSubscription: jest.fn(async () => ({ revoked: true })),
      subscriptionCalendar: jest.fn(async () => ({ events: [calendarEvent] })),
      createEvent: jest.fn(async () => ({ id: eventId, kind: "MEETING", state: "ACTIVE", version: 1 })),
      updateEvent: jest.fn(async () => ({ id: eventId, kind: "MEETING", state: "ACTIVE", version: 2 })),
      cancelEvent: jest.fn(async () => ({ id: eventId, kind: "MEETING", state: "CANCELLED", version: 2 })),
      createConnector: jest.fn(async () => ({ id: connectorId, label: "Website form", branchId, sourceId, actorId: routingActorId, state: "ACTIVE", version: 1, secret: "one-time-webhook-secret" })),
      rotateConnector: jest.fn(async () => ({ id: connectorId, label: "Website form", branchId, sourceId, actorId: routingActorId, state: "ACTIVE", version: 2, secret: "rotated-one-time-secret" })),
      disableConnector: jest.fn(async () => ({ id: connectorId, label: "Website form", branchId, sourceId, actorId: routingActorId, state: "DISABLED", version: 3 })),
      ingestEnquiry: jest.fn(async () => ({ deliveryId: "delivery-id", status: "DELIVERED", replayed: false })),
    };
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: "http://localhost:5173", ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({
      controllers: [IntegrationController],
      providers: [{ provide: IdentityService, useValue: identity }, { provide: IntegrationService, useValue: service }, { provide: RUNTIME_CONFIG, useValue: config }],
    }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix("api/v1"); await app.init();
  });

  beforeEach(() => { kind = "STAFF"; isReady = true; sessionValid = true; jest.clearAllMocks(); });
  afterAll(async () => app.close());
  const cookie = `sense_sid=${sessionSecret}`;
  const csrf = (verb: "post" | "put" | "delete", path: string, body: object) => request(app.getHttpServer())[verb](path).set("Cookie", cookie).set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken).send(body);

  it("requires a staff/owner session and Owner readiness, then derives the service actor from the authenticated identity", async () => {
    sessionValid = false;
    expect((await request(app.getHttpServer()).get("/api/v1/integrations/setup")).status).toBe(401);
    sessionValid = true; kind = "OWNER"; isReady = false;
    expect((await request(app.getHttpServer()).get("/api/v1/integrations/setup").set("Cookie", cookie)).status).toBe(403);
    expect(service.setup).not.toHaveBeenCalled();
    isReady = true; kind = "STAFF";
    const response = await request(app.getHttpServer()).get("/api/v1/integrations/setup").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(service.actor).toHaveBeenCalledWith(accountId, sessionId);
    expect(service.setup).toHaveBeenCalledWith(actor());
  });

  it("returns authorized minimal calendar JSON and a no-store ICS attachment", async () => {
    const json = await request(app.getHttpServer()).get("/api/v1/integrations/calendar").set("Cookie", cookie);
    expect(json.status).toBe(200);
    expect(json.headers["cache-control"]).toBe("no-store");
    expect(json.body.events).toHaveLength(1);
    const file = await request(app.getHttpServer()).get("/api/v1/integrations/calendar.ics").set("Cookie", cookie);
    expect(file.status).toBe(200);
    expect(file.headers["cache-control"]).toBe("no-store");
    expect(file.headers["content-type"]).toMatch(/^text\/calendar; charset=utf-8/i);
    expect(file.headers["content-disposition"]).toBe('attachment; filename="sense-calendar.ics"');
    expect(file.text).toContain("SUMMARY:Meeting\r\n");
    expect(file.text).not.toContain("projectId");
  });

  it("enforces origin and CSRF for subscription and event mutations", async () => {
    const origin = await request(app.getHttpServer()).post("/api/v1/integrations/calendar/subscription").set("Cookie", cookie).set("Origin", "https://attacker.example").set("x-csrf-token", csrfToken).send({ commandId: "11111111-1111-4111-8111-111111111111", reason: "Rotate calendar link" });
    const csrfMissing = await request(app.getHttpServer()).post("/api/v1/integrations/calendar/events").set("Cookie", cookie).set("Origin", "http://localhost:5173").send({});
    expect([origin.status, csrfMissing.status]).toEqual([403, 403]);
    expect(service.subscription).not.toHaveBeenCalled();
    expect(service.createEvent).not.toHaveBeenCalled();
  });

  it("validates commands, versions, IDs, and event interval before service calls", async () => {
    const commandId = "11111111-1111-4111-8111-111111111111";
    const badCommand = await csrf("post", "/api/v1/integrations/calendar/subscription", { commandId: "bad", reason: "ok" });
    const badInterval = await csrf("post", "/api/v1/integrations/calendar/events", { commandId, reason: "Add meeting", kind: "MEETING", startAt: "2026-10-05T10:00:00Z", endAt: "2026-10-05T09:00:00Z" });
    const badVersion = await csrf("put", `/api/v1/integrations/calendar/events/${eventId}`, { commandId, reason: "Move meeting", expectedVersion: 0, startAt: "2026-10-05T10:00:00Z", endAt: "2026-10-05T11:00:00Z" });
    const badId = await csrf("post", "/api/v1/integrations/calendar/events/not-uuid/cancel", { commandId, reason: "Cancel meeting", expectedVersion: 1 });
    expect([badCommand.status, badInterval.status, badVersion.status, badId.status]).toEqual([400, 400, 400, 400]);
    expect(service.subscription).not.toHaveBeenCalled();
    expect(service.createEvent).not.toHaveBeenCalled();
    expect(service.updateEvent).not.toHaveBeenCalled();
    expect(service.cancelEvent).not.toHaveBeenCalled();
  });

  it("returns a one-time subscription token only from create and delegates revocation", async () => {
    const body = { commandId: "11111111-1111-4111-8111-111111111111", reason: "Create calendar subscription" };
    const created = await csrf("post", "/api/v1/integrations/calendar/subscription", body);
    expect(created.status).toBe(201);
    expect(created.body.token).toBe("one-time-secret");
    expect(created.headers["cache-control"]).toBe("no-store");
    expect(service.subscription).toHaveBeenCalledWith(actor(), body);
    const revoked = await csrf("delete", "/api/v1/integrations/calendar/subscription", { commandId: "22222222-2222-4222-8222-222222222222", reason: "Revoke calendar link" });
    expect(revoked.status).toBe(200);
    expect(revoked.body).toEqual({ revoked: true });
  });

  it("serves public subscription ICS without auth and safely rejects malformed or unknown tokens", async () => {
    const token = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
    const valid = await request(app.getHttpServer()).get(`/api/v1/integrations/calendar/subscriptions/${token}.ics`);
    expect(valid.status).toBe(200);
    expect(valid.headers["cache-control"]).toBe("no-store");
    expect(valid.headers["content-disposition"]).toBeUndefined();
    expect(service.subscriptionCalendar).toHaveBeenCalledWith(token);
    const malformed = await request(app.getHttpServer()).get("/api/v1/integrations/calendar/subscriptions/bad-token.ics");
    expect(malformed.status).toBe(404);
    expect(service.subscriptionCalendar).toHaveBeenCalledTimes(1);
    service.subscriptionCalendar.mockRejectedValueOnce(new NotFoundException("not found"));
    const missing = await request(app.getHttpServer()).get(`/api/v1/integrations/calendar/subscriptions/${token}.ics`);
    expect(missing.status).toBe(404);
    expect(missing.headers["cache-control"]).toBe("no-store");
    expect(missing.text).not.toContain(token);
  });

  it("returns owner-authorized connector options and configured OpenStreetMap links from setup", async () => {
    kind = "OWNER";
    service.setup.mockResolvedValue({ owner: true, projects: [], events: [], subscription: { active: false }, connectorOptions: { branches: [{ id: branchId, name: "Branch" }], sources: [{ id: sourceId, label: "Website" }], actors: [{ id: routingActorId, label: "owner@example.test" }] }, websiteConnectors: [], deliveries: [], locations: [{ projectId: eventId, label: "Site" , latitude: 25.2, longitude: 55.3, mapUrl: "https://www.openstreetmap.org/?mlat=25.2&mlon=55.3" }] });
    const response = await request(app.getHttpServer()).get("/api/v1/integrations/setup").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.connectorOptions.sources).toEqual([{ id: sourceId, label: "Website" }]);
    expect(response.body.locations[0].mapUrl).toBe("https://www.openstreetmap.org/?mlat=25.2&mlon=55.3");
  });

  it("requires Owner session readiness, matching Origin and CSRF for connector configuration", async () => {
    kind = "OWNER";
    isReady = false;
    const body = { commandId: "11111111-1111-4111-8111-111111111111", reason: "Create website connector", label: "Website form", branchId, sourceId, actorId: routingActorId };
    const notReady = await csrf("post", "/api/v1/integrations/website-connectors", body);
    expect(notReady.status).toBe(403);
    isReady = true;
    const wrongOrigin = await request(app.getHttpServer()).post("/api/v1/integrations/website-connectors").set("Cookie", cookie).set("Origin", "https://attacker.example").set("x-csrf-token", csrfToken).send(body);
    const missingCsrf = await request(app.getHttpServer()).post("/api/v1/integrations/website-connectors").set("Cookie", cookie).set("Origin", "http://localhost:5173").send(body);
    expect([wrongOrigin.status, missingCsrf.status]).toEqual([403, 403]);
    expect(service.createConnector).not.toHaveBeenCalled();
  });

  it("strictly validates connector create/rotate/disable commands and returns one-time secrets only on create/rotate", async () => {
    kind = "OWNER";
    const body = { commandId: "11111111-1111-4111-8111-111111111111", reason: "Create website connector", label: "Website form", branchId, sourceId, actorId: routingActorId };
    const extra = await csrf("post", "/api/v1/integrations/website-connectors", { ...body, initialSecret: "caller-chosen" });
    const invalidUuid = await csrf("post", "/api/v1/integrations/website-connectors", { ...body, branchId: "bad" });
    expect([extra.status, invalidUuid.status]).toEqual([400, 400]);
    expect(service.createConnector).not.toHaveBeenCalled();
    const created = await csrf("post", "/api/v1/integrations/website-connectors", body);
    expect(created.status).toBe(201);
    expect(created.body.secret).toBe("one-time-webhook-secret");
    expect(created.headers["cache-control"]).toBe("no-store");
    expect(service.createConnector).toHaveBeenCalledWith(actor(), body);

    const versionBody = { commandId: "22222222-2222-4222-8222-222222222222", reason: "Rotate website credential", expectedVersion: 1 };
    const rotated = await csrf("post", `/api/v1/integrations/website-connectors/${connectorId}/rotate`, versionBody);
    expect(rotated.status).toBe(201);
    expect(rotated.body.secret).toBe("rotated-one-time-secret");
    expect(service.rotateConnector).toHaveBeenCalledWith(actor(), connectorId, versionBody);
    const disabled = await csrf("post", `/api/v1/integrations/website-connectors/${connectorId}/disable`, { ...versionBody, commandId: "33333333-3333-4333-8333-333333333333", expectedVersion: 2 });
    expect(disabled.status).toBe(201);
    expect(disabled.body.secret).toBeUndefined();
    expect(disabled.body.state).toBe("DISABLED");
    expect(service.disableConnector).toHaveBeenCalledWith(actor(), connectorId, { ...versionBody, commandId: "33333333-3333-4333-8333-333333333333", expectedVersion: 2 });
  });

  it("accepts signed public enquiry envelopes and returns only safe delivery status", async () => {
    const payload: WebsiteEnquiry = { enquiryId: "form-001", title: "Kitchen update", contactName: "Customer", email: "customer@example.test" };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = websiteSignature(webhookSecret, connectorId, timestamp, payload);
    const response = await request(app.getHttpServer()).post(`/api/v1/integrations/website-enquiries/${connectorId}`)
      .set("x-sense-timestamp", timestamp).set("x-sense-signature", signature).send(payload);
    expect(response.status).toBe(201);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({ deliveryId: "delivery-id", status: "DELIVERED", replayed: false });
    expect(response.text).not.toContain(payload.contactName);
    expect(response.text).not.toContain(payload.email);
    expect(identity.session).not.toHaveBeenCalled();
    expect(service.ingestEnquiry).toHaveBeenCalledWith(connectorId, timestamp, signature, payload);
  });

  it("rejects malformed enquiry payloads as 400 and sanitizes invalid public credentials as 404", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload: WebsiteEnquiry = { enquiryId: "form-002", title: "Kitchen update", contactName: "Private contact", email: "private@example.test" };
    const malformed = await request(app.getHttpServer()).post(`/api/v1/integrations/website-enquiries/${connectorId}`)
      .set("x-sense-timestamp", timestamp).set("x-sense-signature", "0".repeat(64)).send({ ...payload, branchId });
    expect(malformed.status).toBe(400);
    expect(service.ingestEnquiry).not.toHaveBeenCalled();

    service.ingestEnquiry.mockRejectedValueOnce(new NotFoundException("private connector diagnostic"));
    const invalidCredential = await request(app.getHttpServer()).post(`/api/v1/integrations/website-enquiries/${connectorId}`)
      .set("x-sense-timestamp", timestamp).set("x-sense-signature", "0".repeat(64)).send(payload);
    expect(invalidCredential.status).toBe(404);
    expect(invalidCredential.text).not.toContain("private connector diagnostic");
    expect(invalidCredential.text).not.toContain(payload.email!);

    const malformedId = await request(app.getHttpServer()).post("/api/v1/integrations/website-enquiries/not-a-uuid")
      .set("x-sense-timestamp", timestamp).set("x-sense-signature", "0".repeat(64)).send(payload);
    expect(malformedId.status).toBe(404);
  });

  it("preserves authenticated changed-enquiry conflicts as safe 409 responses", async () => {
    const payload: WebsiteEnquiry = { enquiryId: "form-003", title: "Changed inquiry", contactName: "Customer" };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = websiteSignature(webhookSecret, connectorId, timestamp, payload);
    service.ingestEnquiry.mockRejectedValueOnce(new ConflictException("Enquiry identity reused with different values"));
    const response = await request(app.getHttpServer()).post(`/api/v1/integrations/website-enquiries/${connectorId}`)
      .set("x-sense-timestamp", timestamp).set("x-sense-signature", signature).send(payload);
    expect(response.status).toBe(409);
    expect(response.text).not.toContain(payload.contactName);
  });
});

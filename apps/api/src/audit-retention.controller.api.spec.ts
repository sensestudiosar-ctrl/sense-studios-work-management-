import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { AuditRetentionController } from "./audit-retention.controller.js";
import { AuditRetentionService } from "./audit-retention.service.js";
import { IdentityService } from "./identity.service.js";

const accountId = "c64f2145-5810-4a7e-9485-fbe9099c50cf";
const auditEventId = "20cfef90-f016-4b85-8c57-74ade820b71b";
const sessionSecret = "audit-session-secret";
const csrfToken = "audit-csrf-token";

describe("audit correction HTTP controls", () => {
  let app: INestApplication;
  const identity = {
    session: jest.fn(async (secret?: string) => {
      if (secret !== sessionSecret) throw new UnauthorizedException("Authentication required");
      return { row: { accountId, account: { kind: "OWNER" }, createdAt: new Date() }, csrfToken };
    }),
    ownerReady: jest.fn(async () => true),
    verifyCsrf: jest.fn((active: { csrfToken: string }, token?: string) => {
      if (token !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
    })
  };
  const retention = { createCorrection: jest.fn(async (actor: string, event: string, reason: string, correction: object) => ({ actor, event, reason, correction })) };

  beforeAll(async () => {
    const config: RuntimeConfig = {
      nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test",
      webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined
    };
    const module = await Test.createTestingModule({
      controllers: [AuditRetentionController],
      providers: [
        { provide: IdentityService, useValue: identity },
        { provide: AuditRetentionService, useValue: retention },
        { provide: RUNTIME_CONFIG, useValue: config }
      ]
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });
  afterAll(async () => app.close());

  it("requires a recent Owner session, same-origin CSRF, and a safe correction body", async () => {
    const path = `/api/v1/audit/events/${auditEventId}/corrections`;
    const unauthorized = await request(app.getHttpServer()).post(path).set("Origin", "http://localhost:5173").send({ reason: "Correct a value", correction: { name: "Fixed" } });
    expect(unauthorized.status).toBe(401);
    const wrongOrigin = await request(app.getHttpServer()).post(path).set("Cookie", `sense_sid=${sessionSecret}`)
      .set("Origin", "https://attacker.example").set("x-csrf-token", csrfToken).send({ reason: "Correct a value", correction: { name: "Fixed" } });
    expect(wrongOrigin.status).toBe(403);
    const noCsrf = await request(app.getHttpServer()).post(path).set("Cookie", `sense_sid=${sessionSecret}`)
      .set("Origin", "http://localhost:5173").send({ reason: "Correct a value", correction: { name: "Fixed" } });
    expect(noCsrf.status).toBe(403);
    const invalid = await request(app.getHttpServer()).post(path).set("Cookie", `sense_sid=${sessionSecret}`)
      .set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken)
      .send({ reason: "Correct a value", correction: { sessionToken: "sensitive" } });
    expect(invalid.status).toBe(400);
    const valid = await request(app.getHttpServer()).post(path).set("Cookie", `sense_sid=${sessionSecret}`)
      .set("Origin", "http://localhost:5173").set("x-csrf-token", csrfToken)
      .send({ reason: "Correct a value in source data", correction: { name: "Fixed", active: true } });
    expect(valid.status).toBe(201);
    expect(retention.createCorrection).toHaveBeenCalledWith(accountId, auditEventId, "Correct a value in source data", { name: "Fixed", active: true });
  });
});

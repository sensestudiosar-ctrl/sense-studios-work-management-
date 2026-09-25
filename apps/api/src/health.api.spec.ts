import "reflect-metadata";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { DATABASE_PROBE, type DatabaseProbe } from "./database.service.js";
import { HealthController } from "./health.controller.js";

describe("health HTTP contract", () => {
  let app: INestApplication;
  let failure: Error | null = null;
  const probe: DatabaseProbe = {
    check: async () => { if (failure) throw failure; }
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DATABASE_PROBE, useValue: probe }]
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("keeps liveness independent of PostgreSQL", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health/live");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "alive", service: "api" });
  });

  it("reports readiness only after a successful database probe", async () => {
    failure = null;
    const response = await request(app.getHttpServer()).get("/api/v1/health/ready");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ready",
      dependencies: { database: "ready" }
    });
  });

  it("returns 503 without leaking connection details when PostgreSQL fails", async () => {
    failure = new Error("secret database address");
    const response = await request(app.getHttpServer()).get("/api/v1/health/ready");
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: "unavailable",
      dependencies: { database: "unavailable" }
    });
    expect(JSON.stringify(response.body)).not.toContain("secret database address");
  });
});

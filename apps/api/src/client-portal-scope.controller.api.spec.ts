import "reflect-metadata";
import { ForbiddenException, UnauthorizedException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import request from "supertest";
import { ClientPortalScopeController } from "./client-portal-scope.controller.js";
import { ClientPortalScopeService } from "./client-portal-scope.service.js";
import { ClientPortalFilesService } from "./client-portal-files.service.js";
import { ClientPortalIdentityService } from "./client-portal-identity.service.js";
import { RUNTIME_CONFIG } from "./config.js";

const id = "af55d36a-8f3f-4a2b-b3b1-d06adba89909";
describe("S14 scope HTTP boundary", () => {
  let app: INestApplication;
  const invited = jest.fn(async () => ({ id, email: "client@example.test", version: 1 }));
  const identity = {
    session: jest.fn(async (secret?: string) => { if (secret !== "portal-secret") throw new UnauthorizedException(); return { csrfToken: "csrf" }; }),
    verifyCsrf: jest.fn((_active: unknown, token?: string) => { if (token !== "csrf") throw new ForbiddenException(); })
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [ClientPortalScopeController], providers: [
      { provide: ClientPortalIdentityService, useValue: identity },
      { provide: ClientPortalScopeService, useValue: { projects: async () => ({ projects: [] }), invite: invited } },
      { provide: ClientPortalFilesService, useValue: {} },
      { provide: RUNTIME_CONFIG, useValue: { webOrigin: "http://localhost:5173" } }
    ] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  it("requires isolated portal cookie and never authenticates with staff cookies", async () => {
    await request(app.getHttpServer()).get("/api/v1/client-portal/projects").set("Cookie", "sense_sid=portal-secret").expect(401);
    await request(app.getHttpServer()).get("/api/v1/client-portal/projects").set("Cookie", "sense_client_sid=portal-secret").expect("Cache-Control", "no-store").expect(200, { projects: [] });
  });
  it("requires origin and CSRF before an invitation reaches the business service", async () => {
    const post = () => request(app.getHttpServer()).post(`/api/v1/client-portal/projects/${id}/invitations`).set("Cookie", "sense_client_sid=portal-secret");
    const input = { email: "client@example.test", reason: "Invite project client" };
    await post().set("Origin", "https://foreign.example").set("X-CSRF-Token", "csrf").send(input).expect(403);
    await post().set("Origin", "http://localhost:5173").send(input).expect(403);
    expect(invited).not.toHaveBeenCalled();
    await post().set("Origin", "http://localhost:5173").set("X-CSRF-Token", "csrf").send(input).expect(201);
    expect(invited).toHaveBeenCalledTimes(1);
  });
  it("rejects ID tampering, unknown authority fields and short reasons", async () => {
    for (const input of [{ email: "client@example.test", reason: "ab" }, { email: "client@example.test", reason: "Invite client", primary: true }]) {
      await request(app.getHttpServer()).post(`/api/v1/client-portal/projects/${id}/invitations`).set("Cookie", "sense_client_sid=portal-secret").set("Origin", "http://localhost:5173").set("X-CSRF-Token", "csrf").send(input).expect(400);
    }
    await request(app.getHttpServer()).get("/api/v1/client-portal/projects/not-an-id/access").set("Cookie", "sense_client_sid=portal-secret").expect(400);
  });
});

import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { ClientPortalIdentityService } from "./client-portal-identity.service.js";
import { GalleryController, PortfolioController, ClientGalleryController, PublicPortfolioController } from "./gallery.controller.js";
import { GalleryService } from "./gallery.service.js";

const accountId = "55555555-5555-4555-8555-555555555555";
const projectId = "44444444-4444-4444-8444-444444444444";
const publicationId = "33333333-3333-4333-8333-333333333333";
const csrfToken = "gallery-current-csrf";
const cookie = "sense_sid=gallery-session";
const origin = "http://localhost:5173";

describe("S15 gallery and portfolio HTTP boundary", () => {
  let app: INestApplication;
  let validSession: boolean;
  let identity: Record<string, jest.Mock>;
  let galleries: Record<string, jest.Mock>;

  beforeAll(async () => {
    validSession = true;
    identity = {
      session: jest.fn(async (secret?: string) => {
        if (!validSession || secret !== "gallery-session") throw new UnauthorizedException("Authentication required");
        return { row: { accountId }, csrfToken };
      }),
      ownerReady: jest.fn(async () => true),
      verifyCsrf: jest.fn((active: { csrfToken: string }, supplied?: string) => {
        if (supplied !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
      })
    };
    galleries = {
      gallery: jest.fn(async () => ({ projectId, entries: [], eligibleItems: [] })),
      addEntry: jest.fn(async () => ({ id: publicationId })),
      portfolioWorkspace: jest.fn(async () => ({ projectId, sourceFiles: [], publications: [] })),
      prepare: jest.fn(async () => ({ id: publicationId, state: "DRAFT", version: 1 })),
      transition: jest.fn(async () => ({ id: publicationId, state: "PUBLISHED", version: 2 })),
      clientGallery: jest.fn(async () => ({ projectId, items: [] })),
      clientGalleryStream: jest.fn(async () => ({ stream: { on: jest.fn(), pipe: jest.fn(), destroy: jest.fn() }, mime: "image/png", size: 1, name: "image.png" })),
      publicList: jest.fn(async () => ({ items: [{ id: publicationId, title: "Public courtyard", altText: "Courtyard study", mime: "image/png", streamUrl: `/api/v1/public/portfolio/${publicationId}/stream` }] })),
      publicDerivative: jest.fn(async () => ({ bytes: Buffer.from("png"), mime: "image/png" }))
    };
    const projects = { actor: jest.fn(async () => ({ accountId, organizationId: "22222222-2222-4222-8222-222222222222", kind: "OWNER" as const })) };
    const clientIdentity = { session: jest.fn(async (secret?: string) => {
      if (secret !== "valid-client-session") throw new UnauthorizedException("Client authentication required");
      return { row: { id: "11111111-1111-4111-8111-111111111111" }, account: { id: accountId } };
    }) };
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: origin, ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({ controllers: [GalleryController, PortfolioController, ClientGalleryController, PublicPortfolioController], providers: [
      { provide: IdentityService, useValue: identity }, { provide: ProjectService, useValue: projects },
      { provide: ClientPortalIdentityService, useValue: clientIdentity }, { provide: GalleryService, useValue: galleries },
      { provide: RUNTIME_CONFIG, useValue: config }
    ] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  beforeEach(() => { validSession = true; jest.clearAllMocks(); });
  afterAll(async () => app.close());

  it("requires a live staff session for private workspace reads and origin plus CSRF for publication mutations", async () => {
    validSession = false;
    expect((await request(app.getHttpServer()).get(`/api/v1/portfolio/projects/${projectId}`).set("Cookie", cookie)).status).toBe(401);
    validSession = true;
    const body = { sourceFileId: publicationId, title: "Courtyard", altText: "Courtyard study", reason: "Prepare sanitized portfolio image", imageBase64: "aGVsbG8=" };
    const noOrigin = await request(app.getHttpServer()).post(`/api/v1/portfolio/projects/${projectId}`).set("Cookie", cookie).set("x-csrf-token", csrfToken).send(body);
    const wrongOrigin = await request(app.getHttpServer()).post(`/api/v1/portfolio/projects/${projectId}`).set("Cookie", cookie).set("Origin", "https://attacker.test").set("x-csrf-token", csrfToken).send(body);
    const noCsrf = await request(app.getHttpServer()).post(`/api/v1/portfolio/projects/${projectId}`).set("Cookie", cookie).set("Origin", origin).send(body);
    expect([noOrigin.status, wrongOrigin.status, noCsrf.status]).toEqual([403, 403, 403]);
    expect(galleries.prepare).not.toHaveBeenCalled();
    const published = await request(app.getHttpServer()).post(`/api/v1/portfolio/${publicationId}/publish`).set("Cookie", cookie).set("Origin", origin).set("x-csrf-token", csrfToken).send({ expectedVersion: 1, reason: "Owner publishes approved portfolio derivative" });
    expect(published.status).toBe(201);
    expect(galleries.transition).toHaveBeenCalledWith(expect.objectContaining({ accountId, kind: "OWNER" }), publicationId, "publish", { expectedVersion: 1, reason: "Owner publishes approved portfolio derivative" });
  });

  it("keeps public portfolio routes public and client gallery routes session-bound", async () => {
    const publicList = await request(app.getHttpServer()).get("/api/v1/public/portfolio");
    expect(publicList.status).toBe(200);
    expect(publicList.headers["cache-control"]).toBe("no-store");
    expect(publicList.body.items[0]).not.toHaveProperty("projectId");
    expect(publicList.body.items[0]).not.toHaveProperty("sourceFileId");
    expect(publicList.body.items[0]).not.toHaveProperty("storageKey");
    const guessedId = await request(app.getHttpServer()).get("/api/v1/portfolio/projects/not-a-uuid").set("Cookie", cookie);
    expect(guessedId.status).toBe(400);
    expect(galleries.portfolioWorkspace).not.toHaveBeenCalled();
    const internalCookie = await request(app.getHttpServer()).get(`/api/v1/client-portal/projects/${projectId}/gallery`).set("Cookie", cookie);
    expect(internalCookie.status).toBe(401);
    const clientList = await request(app.getHttpServer()).get(`/api/v1/client-portal/projects/${projectId}/gallery`).set("Cookie", "sense_client_sid=valid-client-session");
    expect(clientList.status).toBe(200);
    expect(clientList.headers["cache-control"]).toBe("no-store");
    expect(galleries.clientGallery).toHaveBeenCalledWith(expect.any(Object), projectId);
  });
});

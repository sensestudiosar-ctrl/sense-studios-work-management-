import "reflect-metadata";
import { ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import { Readable } from "node:stream";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";
import { RevisionController } from "./revision.controller.js";
import { RevisionService } from "./revision.service.js";

const accountId = "55555555-5555-4555-8555-555555555555";
const organizationId = "44444444-4444-4444-8444-444444444444";
const projectId = "22222222-2222-4222-8222-222222222222";
const drawingId = "33333333-3333-4333-8333-333333333333";
const fileId = "77777777-7777-4777-8777-777777777777";
const revisionId = "88888888-8888-4888-8888-888888888888";
const transmittalId = "99999999-9999-4999-8999-999999999999";
const recipientId = "66666666-6666-4666-8666-666666666666";
const csrfToken = "revision-current-csrf";
const cookie = "sense_sid=revision-session";
const origin = "http://localhost:5173";

describe("S12 revision HTTP boundary", () => {
  let app: INestApplication;
  let kind: "OWNER" | "STAFF";
  let validSession: boolean;
  let identity: Record<string, jest.Mock>;
  let projects: Record<string, jest.Mock>;
  let revisions: Record<string, jest.Mock>;

  beforeAll(async () => {
    kind = "OWNER";
    validSession = true;
    identity = {
      session: jest.fn(async (secret?: string) => {
        if (!validSession || secret !== "revision-session") throw new UnauthorizedException("Authentication required");
        return { row: { accountId }, csrfToken };
      }),
      ownerReady: jest.fn(async () => true),
      verifyCsrf: jest.fn((active: { csrfToken: string }, supplied?: string) => {
        if (supplied !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
      })
    };
    projects = { actor: jest.fn(async () => ({ accountId, organizationId, kind })) };
    revisions = {
      list: jest.fn(async () => ({ drawings: [], transmittals: [], capabilities: { createRevision: true, issue: false }, issueBlocker: "Internal review approval is required (S13)" })),
      createDrawing: jest.fn(async (_actor: unknown, _projectId: string, input: unknown) => ({ id: drawingId, input })),
      appendRevision: jest.fn(async (_actor: unknown, _drawingId: string, input: unknown) => ({ id: revisionId, input })),
      selectClientReview: jest.fn(async (_actor: unknown, _drawingId: string, input: unknown) => ({ id: drawingId, input, clientApprovalRequired: true })),
      issue: jest.fn(async () => { throw new ConflictException("Internal review approval is required (S13)"); }),
      acknowledge: jest.fn(async (_actor: unknown, _transmittalId: string, input: unknown) => ({ acknowledged: true, input })),
      stream: jest.fn(async () => ({ stream: Readable.from([Buffer.from("revision bytes")]), size: 14, fileName: "plan-r0.txt", mimeType: "text/plain", label: "R0", state: "SUPERSEDED" }))
    };
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: origin, ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({ controllers: [RevisionController], providers: [
      { provide: IdentityService, useValue: identity }, { provide: ProjectService, useValue: projects },
      { provide: RevisionService, useValue: revisions }, { provide: RUNTIME_CONFIG, useValue: config }
    ] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  beforeEach(() => { kind = "OWNER"; validSession = true; jest.clearAllMocks(); });
  afterAll(async () => app.close());

  const write = (path: string, body: object) => request(app.getHttpServer()).post(`/api/v1/revisions/${path}`).set("Cookie", cookie).set("Origin", origin).set("x-csrf-token", csrfToken).send(body);

  it("requires a live session for reads and origin plus CSRF for mutations", async () => {
    validSession = false;
    expect((await request(app.getHttpServer()).get(`/api/v1/revisions/projects/${projectId}`).set("Cookie", cookie)).status).toBe(401);
    validSession = true;
    const noOrigin = await request(app.getHttpServer()).post(`/api/v1/revisions/projects/${projectId}/drawings`).set("Cookie", cookie).set("x-csrf-token", csrfToken).send({});
    const wrongOrigin = await request(app.getHttpServer()).post(`/api/v1/revisions/projects/${projectId}/drawings`).set("Cookie", cookie).set("Origin", "https://attacker.test").set("x-csrf-token", csrfToken).send({});
    const missingCsrf = await request(app.getHttpServer()).post(`/api/v1/revisions/projects/${projectId}/drawings`).set("Cookie", cookie).set("Origin", origin).send({});
    expect([noOrigin.status, wrongOrigin.status, missingCsrf.status]).toEqual([403, 403, 403]);
    expect(revisions.createDrawing).not.toHaveBeenCalled();
  });

  it("validates IDs and strict revision, drawing and acknowledgement command bodies", async () => {
    const drawing = { documentNumber: " A-101 ", title: " Ground floor ", fileId, reason: " Register initial drawing " };
    const created = await write(`projects/${projectId}/drawings`, drawing);
    const extraDrawing = await write(`projects/${projectId}/drawings`, { ...drawing, clientApprovalRequired: true });
    const badProject = await write("projects/not-a-uuid/drawings", drawing);
    const append = { fileId, series: "R", expectedVersion: 1, reason: " Prepare internal revision " };
    const appended = await write(`drawings/${drawingId}`, append);
    const invalidSeries = await write(`drawings/${drawingId}`, { ...append, series: "R0" });
    const zeroVersion = await write(`drawings/${drawingId}`, { ...append, expectedVersion: 0 });
    const extraAppend = await write(`drawings/${drawingId}`, { ...append, state: "APPROVED" });
    const clientReview = await write(`drawings/${drawingId}/client-review`, { expectedVersion: 3, reason: " Prepare this drawing for client review " });
    const extraClientReview = await write(`drawings/${drawingId}/client-review`, { expectedVersion: 3, reason: "Prepare this drawing for client review", clientApprovalRequired: false });
    const ack = await write(`transmittals/${transmittalId}/acknowledge`, { note: " Received ", reason: " Confirm receipt of issued drawings " });
    const extraAck = await write(`transmittals/${transmittalId}/acknowledge`, { reason: "Confirm receipt", acknowledgedBy: accountId });
    const longNote = await write(`transmittals/${transmittalId}/acknowledge`, { note: "x".repeat(1001), reason: "Confirm receipt" });
    const badAckId = await write("transmittals/not-a-uuid/acknowledge", { reason: "Confirm receipt" });
    expect([created.status, extraDrawing.status, badProject.status, appended.status, invalidSeries.status, zeroVersion.status, extraAppend.status, clientReview.status, extraClientReview.status, ack.status, extraAck.status, longNote.status, badAckId.status]).toEqual([201, 400, 400, 201, 400, 400, 400, 201, 400, 201, 400, 400, 400]);
    expect(revisions.createDrawing).toHaveBeenCalledTimes(1);
    expect(revisions.createDrawing).toHaveBeenCalledWith(expect.objectContaining({ accountId, kind: "OWNER" }), projectId, { documentNumber: "A-101", title: "Ground floor", fileId, reason: "Register initial drawing" });
    expect(revisions.appendRevision).toHaveBeenCalledTimes(1);
    expect(revisions.appendRevision).toHaveBeenCalledWith(expect.objectContaining({ accountId }), drawingId, { fileId, series: "R", expectedVersion: 1, reason: "Prepare internal revision" });
    expect(revisions.selectClientReview).toHaveBeenCalledTimes(1);
    expect(revisions.selectClientReview).toHaveBeenCalledWith(expect.objectContaining({ accountId, kind: "OWNER" }), drawingId, { expectedVersion: 3, reason: "Prepare this drawing for client review" });
    expect(revisions.acknowledge).toHaveBeenCalledTimes(1);
    expect(revisions.acknowledge).toHaveBeenCalledWith(expect.objectContaining({ accountId }), transmittalId, { note: "Received", reason: "Confirm receipt of issued drawings" });
  });

  it("keeps formal issue blocked by S13 evidence and exposes no public approval or state bypass", async () => {
    const issue = { revisionIds: [revisionId], recipientAccountIds: [recipientId], purpose: "Construction coordination", reason: "Issue approved construction drawing", acknowledgementRequired: true };
    const response = await write(`projects/${projectId}/issues`, issue);
    const extra = await write(`projects/${projectId}/issues`, { ...issue, state: "APPROVED" });
    const empty = await write(`projects/${projectId}/issues`, { ...issue, revisionIds: [] });
    const shortPurpose = await write(`projects/${projectId}/issues`, { ...issue, purpose: "A" });
    const approve = await request(app.getHttpServer()).post(`/api/v1/revisions/${revisionId}/approve`).set("Cookie", cookie).set("Origin", origin).set("x-csrf-token", csrfToken).send({ reason: "Attempt approval bypass" });
    const transition = await request(app.getHttpServer()).post(`/api/v1/revisions/${revisionId}/state`).set("Cookie", cookie).set("Origin", origin).set("x-csrf-token", csrfToken).send({ state: "APPROVED", reason: "Attempt state bypass" });
    expect([response.status, extra.status, empty.status, shortPurpose.status, approve.status, transition.status]).toEqual([409, 400, 400, 400, 404, 404]);
    expect(response.body.message).toContain("Internal review approval is required (S13)");
    expect(revisions.issue).toHaveBeenCalledTimes(1);
    expect(revisions.issue).toHaveBeenCalledWith(expect.objectContaining({ accountId }), projectId, issue);
  });

  it("does not let an ordinary staff caller select client review without service authorization", async () => {
    kind = "STAFF";
    revisions.selectClientReview.mockImplementationOnce(async (actor: { kind: string }) => {
      if (actor.kind !== "OWNER") throw new ForbiddenException("Explicit document.client_review_select permission is required");
      return { id: drawingId, clientApprovalRequired: true };
    });
    const denied = await write(`drawings/${drawingId}/client-review`, { expectedVersion: 2, reason: "Select exact drawing for client review" });
    expect(denied.status).toBe(403);
    expect(revisions.selectClientReview).toHaveBeenCalledWith(expect.objectContaining({ accountId, kind: "STAFF" }), drawingId, { expectedVersion: 2, reason: "Select exact drawing for client review" });
  });

  it("returns a no-store revision-bound stream with state and superseded warning headers", async () => {
    const response = await request(app.getHttpServer()).get(`/api/v1/revisions/${revisionId}/stream`).set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["content-type"]).toMatch(/^text\/plain/);
    expect(response.headers["content-length"]).toBe("14");
    expect(response.headers["x-revision-label"]).toBe("R0");
    expect(response.headers["x-revision-state"]).toBe("SUPERSEDED");
    expect(response.headers.warning).toBe('299 - "Superseded - Do Not Use"');
    expect(response.text).toBe("revision bytes");
    expect(revisions.stream).toHaveBeenCalledWith(expect.objectContaining({ accountId }), revisionId);
    const badId = await request(app.getHttpServer()).get("/api/v1/revisions/not-a-uuid/stream").set("Cookie", cookie);
    expect(badId.status).toBe(400);
    expect(revisions.stream).toHaveBeenCalledTimes(1);
  });

  it("returns the persisted register as a no-store authenticated read", async () => {
    const response = await request(app.getHttpServer()).get(`/api/v1/revisions/projects/${projectId}`).set("Cookie", cookie);
    const badId = await request(app.getHttpServer()).get("/api/v1/revisions/projects/not-a-uuid").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.issueBlocker).toBe("Internal review approval is required (S13)");
    expect(badId.status).toBe(400);
    expect(revisions.list).toHaveBeenCalledTimes(1);
    expect(revisions.list).toHaveBeenCalledWith(expect.objectContaining({ accountId }), projectId);
  });
});

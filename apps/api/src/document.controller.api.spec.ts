import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import { Readable } from "node:stream";
import request from "supertest";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { DocumentController } from "./document.controller.js";
import { DOCUMENT_CHUNK_SIZE } from "./document-file-policy.js";
import { DocumentService } from "./document.service.js";
import { IdentityService } from "./identity.service.js";
import { ProjectService } from "./project.service.js";

const accountId = "55555555-5555-4555-8555-555555555555";
const projectId = "22222222-2222-4222-8222-222222222222";
const folderId = "33333333-3333-4333-8333-333333333333";
const employeeId = "66666666-6666-4666-8666-666666666666";
const fileId = "77777777-7777-4777-8777-777777777777";
const uploadId = "88888888-8888-4888-8888-888888888888";
const grantId = "99999999-9999-4999-8999-999999999999";
const csrfToken = "document-current-csrf";
const cookie = "sense_sid=document-session";
const checksum = "a".repeat(64);
const origin = "http://localhost:5173";

describe("S11 document HTTP boundary", () => {
  let app: INestApplication;
  let kind: "OWNER" | "STAFF";
  let validSession: boolean;
  let identity: Record<string, jest.Mock>;
  let projects: Record<string, jest.Mock>;
  let documents: Record<string, jest.Mock>;

  beforeAll(async () => {
    kind = "OWNER"; validSession = true;
    identity = {
      session: jest.fn(async (secret?: string) => {
        if (!validSession || secret !== "document-session") throw new UnauthorizedException("Authentication required");
        return { row: { accountId }, csrfToken };
      }),
      ownerReady: jest.fn(async () => true),
      verifyCsrf: jest.fn((active: { csrfToken: string }, supplied?: string) => {
        if (supplied !== active.csrfToken) throw new ForbiddenException("Request could not be verified");
      })
    };
    projects = {
      actor: jest.fn(async () => ({ accountId, kind, organizationId: "44444444-4444-4444-8444-444444444444" }))
    };
    documents = {
      projectPicker: jest.fn(async () => ({ branches: [], total: 0, items: [] })),
      list: jest.fn(async () => ({ project: { id: projectId, title: "Studio project" }, folders: [], files: [], capabilities: { createFolder: true, upload: true, grant: true } })),
      createFolder: jest.fn(async (_actor: unknown, _projectId: string, input: unknown) => ({ id: folderId, input })),
      startUpload: jest.fn(async (_actor: unknown, _projectId: string, input: unknown) => ({ uploadId, chunkSize: DOCUMENT_CHUNK_SIZE, input })),
      writeChunk: jest.fn(async (_actor: unknown, _uploadId: string, index: number, bytes: Buffer, hash: string) => ({ index, size: bytes.length, hash })),
      finalize: jest.fn(async () => ({ id: fileId })),
      stream: jest.fn(async () => ({ stream: Readable.from([Buffer.from("hello")]), mimeType: "text/plain", size: 5, fileName: "drawing.txt" })),
      grants: jest.fn(async () => ({ items: [] })),
      grant: jest.fn(async (_actor: unknown, _projectId: string, input: unknown) => ({ id: grantId, input })),
      revokeGrant: jest.fn(async () => ({ revoked: true }))
    };
    const config: RuntimeConfig = { nodeEnv: "test", port: 4000, databaseUrl: "postgresql://test:test@localhost:5432/test", webOrigin: origin, ownerBootstrapEmail: "owner@example.test", ownerBootstrapSecret: "b".repeat(48) };
    const module = await Test.createTestingModule({ controllers: [DocumentController], providers: [
      { provide: IdentityService, useValue: identity }, { provide: ProjectService, useValue: projects },
      { provide: DocumentService, useValue: documents }, { provide: RUNTIME_CONFIG, useValue: config }
    ] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix("api/v1"); await app.init();
  });
  beforeEach(() => { kind = "OWNER"; validSession = true; jest.clearAllMocks(); });
  it("exposes the authorized project picker with normalized pagination and rejects invalid filters", async () => {
    const result = await request(app.getHttpServer()).get(`/api/v1/documents/project-picker?offset=1&limit=20&branchId=${projectId}&q=%20Studio%20`).set("Cookie", cookie);
    expect(result.status).toBe(200);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(documents.projectPicker).toHaveBeenCalledWith(expect.objectContaining({ accountId }), 1, 20, { branchId: projectId, q: "Studio" });
    documents.projectPicker.mockClear();
    for (const filter of ["offset=-1", "limit=101", "branchId=bad", `q=${"x".repeat(161)}`]) {
      const invalid = await request(app.getHttpServer()).get(`/api/v1/documents/project-picker?${filter}`).set("Cookie", cookie);
      expect(invalid.status).toBe(400);
    }
    expect(documents.projectPicker).not.toHaveBeenCalled();
  });
  afterAll(async () => app.close());

  const mutate = (path: string, body: object) => request(app.getHttpServer()).post(`/api/v1/documents/${path}`).set("Cookie", cookie).set("Origin", origin).set("x-csrf-token", csrfToken).send(body);

  it("requires a session and protects mutations with origin and CSRF", async () => {
    validSession = false;
    expect((await request(app.getHttpServer()).get(`/api/v1/documents/projects/${projectId}`).set("Cookie", cookie)).status).toBe(401);
    validSession = true;
    const wrongOrigin = await request(app.getHttpServer()).post(`/api/v1/documents/projects/${projectId}/folders`).set("Cookie", cookie).set("Origin", "https://attacker.test").set("x-csrf-token", csrfToken).send({ name: "Drawings", confidential: false, reason: "Create drawings folder" });
    const missingCsrf = await request(app.getHttpServer()).post(`/api/v1/documents/projects/${projectId}/folders`).set("Cookie", cookie).set("Origin", origin).send({ name: "Drawings", confidential: false, reason: "Create drawings folder" });
    expect([wrongOrigin.status, missingCsrf.status]).toEqual([403, 403]);
    expect(documents.createFolder).not.toHaveBeenCalled();
  });

  it("strictly validates folder, upload and grant bodies before service calls", async () => {
    const folderValid = await mutate(`projects/${projectId}/folders`, { name: "  Drawings  ", confidential: false, reason: "  Create drawings folder  " });
    const folderExtra = await mutate(`projects/${projectId}/folders`, { name: "Drawings", confidential: false, reason: "Create drawings folder", physicalPath: "\\\nas\\share" });
    const folderInvalid = await mutate(`projects/${projectId}/folders`, { name: " ", confidential: false, reason: "Create folder" });
    const uploadValid = await mutate(`projects/${projectId}/uploads`, { folderId, fileName: "plan.pdf", mimeType: "application/pdf", sizeBytes: 12, confidential: false, viewOnly: true, reason: "Register plan file" });
    const uploadExtra = await mutate(`projects/${projectId}/uploads`, { folderId, fileName: "plan.pdf", mimeType: "application/pdf", sizeBytes: 12, confidential: false, viewOnly: false, reason: "Register plan file", overwrite: true });
    const uploadInvalid = await mutate(`projects/${projectId}/uploads`, { folderId, fileName: "plan.pdf", mimeType: "application/pdf", sizeBytes: 0, confidential: false, viewOnly: false, reason: "Register plan file" });
    const grantValid = await mutate(`projects/${projectId}/grants`, { resourceKind: "FILE", resourceId: fileId, employeeId, reason: "Grant access to assigned staff" });
    const grantExtra = await mutate(`projects/${projectId}/grants`, { resourceKind: "FILE", resourceId: fileId, employeeId, reason: "Grant access to assigned staff", organizationWide: true });
    const grantInvalid = await mutate(`projects/${projectId}/grants`, { resourceKind: "PROJECT", resourceId: projectId, employeeId, reason: "Grant access to assigned staff" });
    expect([folderValid.status, folderExtra.status, folderInvalid.status, uploadValid.status, uploadExtra.status, uploadInvalid.status, grantValid.status, grantExtra.status, grantInvalid.status]).toEqual([201, 400, 400, 201, 400, 400, 201, 400, 400]);
    expect(documents.createFolder).toHaveBeenCalledWith(expect.objectContaining({ accountId, kind: "OWNER" }), projectId, { name: "Drawings", confidential: false, reason: "Create drawings folder" });
    expect(documents.startUpload).toHaveBeenCalledWith(expect.objectContaining({ accountId, kind: "OWNER" }), projectId, { folderId, fileName: "plan.pdf", mimeType: "application/pdf", sizeBytes: 12, confidential: false, viewOnly: true, reason: "Register plan file" });
    expect(documents.grant).toHaveBeenCalledWith(expect.objectContaining({ accountId, kind: "OWNER" }), projectId, { resourceKind: "FILE", resourceId: fileId, employeeId, reason: "Grant access to assigned staff" });
    expect(documents.createFolder).toHaveBeenCalledTimes(1); expect(documents.startUpload).toHaveBeenCalledTimes(1); expect(documents.grant).toHaveBeenCalledTimes(1);
  });

  it("accepts raw bounded chunks with a checksum header and rejects invalid chunk requests", async () => {
    const good = await request(app.getHttpServer()).put(`/api/v1/documents/uploads/${uploadId}/chunks/0`).set("Cookie", cookie).set("Origin", origin).set("x-csrf-token", csrfToken).set("x-chunk-sha256", checksum).set("Content-Type", "application/octet-stream").send(Buffer.from("pdf-bytes"));
    const badType = await request(app.getHttpServer()).put(`/api/v1/documents/uploads/${uploadId}/chunks/1`).set("Cookie", cookie).set("Origin", origin).set("x-csrf-token", csrfToken).set("x-chunk-sha256", checksum).send(Buffer.from("pdf-bytes"));
    const badHash = await request(app.getHttpServer()).put(`/api/v1/documents/uploads/${uploadId}/chunks/1`).set("Cookie", cookie).set("Origin", origin).set("x-csrf-token", csrfToken).set("x-chunk-sha256", "nope").set("Content-Type", "application/octet-stream").send(Buffer.from("pdf-bytes"));
    const tooLarge = await request(app.getHttpServer()).put(`/api/v1/documents/uploads/${uploadId}/chunks/1`).set("Cookie", cookie).set("Origin", origin).set("x-csrf-token", csrfToken).set("x-chunk-sha256", checksum).set("Content-Type", "application/octet-stream").send(Buffer.alloc(DOCUMENT_CHUNK_SIZE + 1));
    expect([good.status, badType.status, badHash.status, tooLarge.status]).toEqual([200, 400, 400, 400]);
    expect(documents.writeChunk).toHaveBeenCalledTimes(1);
    expect(documents.writeChunk).toHaveBeenCalledWith(expect.objectContaining({ accountId, kind: "OWNER" }), uploadId, 0, Buffer.from("pdf-bytes"), checksum);
  });

  it("marks register and grant reads no-store and returns the authorized credentialed stream", async () => {
    const register = await request(app.getHttpServer()).get(`/api/v1/documents/projects/${projectId}`).set("Cookie", cookie);
    const grants = await request(app.getHttpServer()).get(`/api/v1/documents/projects/${projectId}/grants`).set("Cookie", cookie);
    const stream = await request(app.getHttpServer()).get(`/api/v1/documents/files/${fileId}/stream`).set("Cookie", cookie);
    expect([register.status, grants.status, stream.status]).toEqual([200, 200, 200]);
    expect(register.headers["cache-control"]).toBe("no-store"); expect(grants.headers["cache-control"]).toBe("no-store");
    expect(stream.headers["cache-control"]).toBe("no-store");
    expect(stream.headers["content-type"]).toMatch(/^text\/plain/); expect(stream.headers["content-length"]).toBe("5");
    expect(stream.headers["content-disposition"]).toContain("drawing.txt"); expect(stream.text).toBe("hello");
    expect(documents.stream).toHaveBeenCalledWith(expect.objectContaining({ accountId, kind: "OWNER" }), fileId);
  });
});

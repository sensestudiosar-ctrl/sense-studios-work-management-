import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NasStorage } from "./nas-storage.js";

const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

describe("NAS storage adapter", () => {
  let root: string;
  let storage: NasStorage;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "sense-nas-test-"));
    storage = new NasStorage(root);
    await storage.initialize();
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it("assembles retryable chunks into a private immutable blob with the exact checksum", async () => {
    const uploadId = randomUUID();
    const first = Buffer.from("first-portion");
    const second = Buffer.from("second-portion");
    const all = Buffer.concat([first, second]);
    await storage.writeChunk(uploadId, 0, first, hash(first));
    await storage.writeChunk(uploadId, 0, first, hash(first));
    await storage.writeChunk(uploadId, 1, second, hash(second));
    const blob = await storage.finalize(uploadId, 2, all.length, hash(all));
    expect(await storage.inventory()).toMatchObject({ stagedUploadIds: [uploadId], blobKeys: [blob.key], assemblingKeys: [] });
    expect(blob).toMatchObject({ size: all.length, sha256: hash(all) });
    expect(blob.key).toMatch(/^[0-9a-f-]{36}$/);
    const opened = await storage.openBlob(blob.key);
    const parts: Buffer[] = [];
    for await (const part of opened.stream) parts.push(Buffer.from(part));
    expect(Buffer.concat(parts)).toEqual(all);
    expect(await readFile(join(root, ".sense-blobs", blob.key))).toEqual(all);
    await storage.discardUpload(uploadId);
    await storage.discardUpload(uploadId);
    expect((await storage.inventory()).stagedUploadIds).toEqual([]);
  });

  it("rejects path injection, changed retries, incomplete uploads and a mismatched whole-file checksum", async () => {
    const uploadId = randomUUID();
    const bytes = Buffer.from("part");
    await expect(storage.writeChunk("../outside", 0, bytes, hash(bytes))).rejects.toThrow("Invalid storage identifier");
    await expect(storage.openBlob("../outside")).rejects.toThrow("Invalid storage identifier");
    await expect(storage.writeChunk(uploadId, 0, bytes, hash(Buffer.from("wrong")))).rejects.toThrow("Chunk checksum mismatch");
    await storage.writeChunk(uploadId, 0, bytes, hash(bytes));
    await expect(storage.writeChunk(uploadId, 0, Buffer.from("other"), hash(Buffer.from("other")))).rejects.toThrow("Conflicting upload chunk");
    await expect(storage.finalize(uploadId, 2, bytes.length, hash(bytes))).rejects.toThrow("Incomplete upload");
    await expect(storage.finalize(uploadId, 1, bytes.length, hash(Buffer.from("wrong")))).rejects.toThrow("Upload checksum mismatch");
    const blob = await storage.finalize(uploadId, 1, bytes.length, hash(bytes));
    expect(blob.size).toBe(bytes.length);
  });

  it("rejects a linked root and a linked private staging directory", async () => {
    const linkedRoot = join(root, "linked-root");
    await symlink(root, linkedRoot, "junction");
    await expect(new NasStorage(linkedRoot).initialize()).rejects.toThrow("NAS root must be a real directory");
    await rm(join(root, ".sense-staging"), { recursive: true });
    await symlink(root, join(root, ".sense-staging"), "junction");
    const bytes = Buffer.from("part");
    await expect(storage.writeChunk(randomUUID(), 0, bytes, hash(bytes))).rejects.toThrow("Unsafe storage directory");
  });

  it("provisions nested project folders idempotently without accepting traversal", async () => {
    const projectId = randomUUID();
    await storage.provisionFolder(projectId, "Drawings/Issued");
    await storage.provisionFolder(projectId, "Drawings/Issued");
    expect((await stat(join(root, ".sense-projects", projectId, "Drawings", "Issued"))).isDirectory()).toBe(true);
    await expect(storage.provisionFolder(projectId, "Drawings/../Outside")).rejects.toThrow("Invalid logical folder path");
  });

  it("accepts concurrent identical retries without replacing chunk bytes", async () => {
    const uploadId = randomUUID();
    const bytes = Buffer.alloc(256 * 1024, 7);
    await Promise.all([storage.writeChunk(uploadId, 0, bytes, hash(bytes)), storage.writeChunk(uploadId, 0, bytes, hash(bytes))]);
    expect((await storage.finalize(uploadId, 1, bytes.length, hash(bytes))).sha256).toBe(hash(bytes));
  });
});

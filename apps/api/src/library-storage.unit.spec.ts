import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LibraryStorage } from "./library-storage.js";

const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

describe("private library storage adapter", () => {
  let root: string;
  let storage: LibraryStorage;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "sense-library-test-"));
    storage = new LibraryStorage(root);
    await storage.initialize();
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it("finalizes immutable bytes with the verified checksum and exposes only an opaque file ID", async () => {
    const uploadId = randomUUID();
    const first = Buffer.from("private SOP ");
    const second = Buffer.from("media bytes");
    const complete = Buffer.concat([first, second]);
    await storage.writeChunk(uploadId, 0, first, hash(first));
    await storage.writeChunk(uploadId, 1, second, hash(second));
    const result = await storage.finalize(uploadId, 2, complete.length, hash(complete));

    expect(Object.keys(result).sort()).toEqual(["fileId", "sha256", "size"]);
    expect(result.fileId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result).toEqual({ fileId: result.fileId, size: complete.length, sha256: hash(complete) });
    expect(JSON.stringify(result)).not.toMatch(/sense-library|sense-blobs|[\\/]|https?:/i);
    const opened = await storage.openFile(result.fileId);
    const parts: Buffer[] = [];
    for await (const part of opened.stream) parts.push(Buffer.from(part));
    expect(Buffer.concat(parts)).toEqual(complete);
    expect(opened.size).toBe(complete.length);
    expect(await readFile(join(root, ".sense-library", ".sense-blobs", result.fileId))).toEqual(complete);
    const retries = await Promise.all([storage.finalize(uploadId, 2, complete.length, hash(complete)), storage.finalize(uploadId, 2, complete.length, hash(complete))]);
    expect(retries).toEqual([result, result]);
    await expect(storage.finalize(uploadId, 2, complete.length, hash(Buffer.from("different bytes")))).rejects.toThrow("Upload checksum mismatch");
    const wrongUpload = randomUUID();
    await storage.writeChunk(wrongUpload, 0, complete, hash(complete));
    await expect(storage.finalize(wrongUpload, 1, complete.length, hash(Buffer.from("wrong")))).rejects.toThrow("Upload checksum mismatch");
  });

  it("allows identical chunk retries and rejects changed retries and traversal IDs", async () => {
    const uploadId = randomUUID();
    const bytes = Buffer.from("one chunk");
    await storage.writeChunk(uploadId, 0, bytes, hash(bytes));
    await storage.writeChunk(uploadId, 0, bytes, hash(bytes));
    await expect(storage.writeChunk(uploadId, 0, Buffer.from("changed"), hash(Buffer.from("changed")))).rejects.toThrow("Conflicting upload chunk");
    await expect(storage.writeChunk("../outside", 0, bytes, hash(bytes))).rejects.toThrow("Invalid storage identifier");
    await expect(storage.openFile("../outside")).rejects.toThrow("Invalid storage identifier");
    expect((await storage.finalize(uploadId, 1, bytes.length, hash(bytes))).sha256).toBe(hash(bytes));
  });

  it("rejects missing or linked roots and a linked library child", async () => {
    await expect(new LibraryStorage(join(root, "missing")).initialize()).rejects.toThrow();
    const linkedRoot = join(root, "linked-root");
    await symlink(root, linkedRoot, "junction");
    await expect(new LibraryStorage(linkedRoot).initialize()).rejects.toThrow("NAS root must be a real directory");

    const separateRoot = await mkdtemp(join(tmpdir(), "sense-library-link-test-"));
    try {
      await symlink(root, join(separateRoot, ".sense-library"), "junction");
      await expect(new LibraryStorage(separateRoot).initialize()).rejects.toThrow("Library storage root must be a real directory");
    } finally { await rm(separateRoot, { recursive: true, force: true }); }
  });

  it("requires initialization before file operations", async () => {
    await expect(new LibraryStorage(root).openFile(randomUUID())).rejects.toThrow("Library storage is not initialized");
  });
});

import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, mkdir, open, realpath, readdir, rename, rm, rmdir, unlink } from "node:fs/promises";
import { isAbsolute, join, resolve, sep } from "node:path";
import { setTimeout as pause } from "node:timers/promises";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
export const NAS_CHUNK_MAX_BYTES = 8 * 1024 * 1024;

function id(value: string): string {
  if (!UUID.test(value)) throw new Error("Invalid storage identifier");
  return value.toLowerCase();
}

function sha(value: string): string {
  if (!SHA256.test(value)) throw new Error("Invalid checksum");
  return value.toLowerCase();
}

async function directory(path: string, root: string): Promise<void> {
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Unsafe storage directory");
  const actual = await realpath(path);
  if (actual !== root && !actual.startsWith(root + sep)) throw new Error("Storage path escapes root");
}

async function ensureDirectory(path: string, root: string): Promise<void> {
  try { await mkdir(path, { mode: 0o700 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  await directory(path, root);
}

/** Private NAS mount adapter. Callers authorize database metadata before using a blob key. */
export class NasStorage {
  private root = "";
  private staging = "";
  private blobs = "";
  private projects = "";

  constructor(private readonly configuredRoot: string) {
    if (!isAbsolute(configuredRoot)) throw new Error("NAS root must be absolute");
  }

  async initialize(): Promise<void> {
    const mount = resolve(this.configuredRoot);
    const info = await lstat(mount);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("NAS root must be a real directory");
    this.root = await realpath(mount);
    this.staging = join(this.root, ".sense-staging");
    this.blobs = join(this.root, ".sense-blobs");
    this.projects = join(this.root, ".sense-projects");
    await mkdir(this.staging, { recursive: true, mode: 0o700 });
    await mkdir(this.blobs, { recursive: true, mode: 0o700 });
    await mkdir(this.projects, { recursive: true, mode: 0o700 });
    await directory(this.staging, this.root);
    await directory(this.blobs, this.root);
    await directory(this.projects, this.root);
  }

  private ready(): void { if (!this.root) throw new Error("NAS storage is not initialized"); }

  async provisionFolder(projectId: string, logicalPath: string): Promise<void> {
    this.ready();
    const segments = logicalPath.split("/");
    if (!logicalPath || logicalPath.length > 600 || segments.length > 20 || segments.some((part) => !part || part === "." || part === ".." || part.length > 160 || /[\\/:*?<>|"]/.test(part) || [...part].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new Error("Invalid logical folder path");
    await directory(this.projects, this.root);
    let path = join(this.projects, id(projectId));
    await ensureDirectory(path, this.root);
    for (const segment of segments) {
      path = join(path, segment);
      await ensureDirectory(path, this.root);
    }
  }

  async writeChunk(uploadId: string, index: number, bytes: Buffer, checksum: string): Promise<void> {
    this.ready();
    const key = id(uploadId);
    if (!Number.isSafeInteger(index) || index < 0 || index > 1_000_000 || bytes.length === 0 || bytes.length > NAS_CHUNK_MAX_BYTES) throw new Error("Invalid upload chunk");
    const expected = sha(checksum);
    if (createHash("sha256").update(bytes).digest("hex") !== expected) throw new Error("Chunk checksum mismatch");
    await directory(this.staging, this.root);
    const uploadDir = join(this.staging, key);
    await mkdir(uploadDir, { recursive: true, mode: 0o700 });
    await directory(uploadDir, this.root);
    const chunk = join(uploadDir, String(index));
    const lock = join(uploadDir, `${index}.lock`);
    let acquired = false;
    for (let attempt = 0; attempt < 400; attempt++) {
      try { await mkdir(lock, { mode: 0o700 }); acquired = true; break; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; await pause(25); }
    }
    if (!acquired) throw new Error("Upload chunk is busy; retry later");
    try {
      try {
        const handle = await open(chunk, "wx", 0o600);
        let complete = false;
        try { await handle.writeFile(bytes); await handle.sync(); complete = true; }
        finally { await handle.close(); if (!complete) await unlink(chunk); }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const existing = await lstat(chunk);
        if (!existing.isFile() || existing.isSymbolicLink() || existing.size !== bytes.length) throw new Error("Conflicting upload chunk", { cause: error });
        const old = createHash("sha256");
        for await (const part of createReadStream(chunk)) old.update(part);
        if (old.digest("hex") !== expected) throw new Error("Conflicting upload chunk", { cause: error });
      }
    } finally { await rmdir(lock); }
  }

  async finalize(uploadId: string, chunkCount: number, expectedSize: number, expectedChecksum?: string): Promise<{ key: string; size: number; sha256: string }> {
    this.ready();
    const uploadDir = join(this.staging, id(uploadId));
    if (!Number.isSafeInteger(chunkCount) || chunkCount < 1 || chunkCount > 1_000_000 || !Number.isSafeInteger(expectedSize) || expectedSize < 1) throw new Error("Invalid upload manifest");
    const expected = expectedChecksum ? sha(expectedChecksum) : undefined;
    await directory(this.staging, this.root);
    await directory(this.blobs, this.root);
    await directory(uploadDir, this.root);
    const entries = await readdir(uploadDir);
    if (entries.length !== chunkCount) throw new Error("Incomplete upload");
    const assembled = join(this.staging, `${randomUUID()}.assembling`);
    const handle = await open(assembled, "wx", 0o600);
    const digest = createHash("sha256");
    let size = 0;
    let actual: string;
    try {
      for (let index = 0; index < chunkCount; index++) {
        const chunk = join(uploadDir, String(index));
        const info = await lstat(chunk);
        if (!info.isFile() || info.isSymbolicLink()) throw new Error("Unsafe upload chunk");
        for await (const part of createReadStream(chunk)) {
          const bytes = Buffer.isBuffer(part) ? part : Buffer.from(part);
          size += bytes.length;
          if (size > expectedSize) throw new Error("Upload size mismatch");
          digest.update(bytes);
          await handle.writeFile(bytes);
        }
      }
      actual = digest.digest("hex");
      if (size !== expectedSize || expected && actual !== expected) throw new Error("Upload checksum mismatch");
      await handle.sync();
    } catch (error) {
      await handle.close();
      await unlink(assembled);
      throw error;
    }
    await handle.close();
    const key = randomUUID();
    const target = join(this.blobs, key);
    try { await lstat(target); throw new Error("Storage key collision"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") { await unlink(assembled); throw error; } }
    await rename(assembled, target);
    return { key, size, sha256: actual };
  }

  /** Call after metadata commits; a failed cleanup can be retried by reconciliation. */
  async discardUpload(uploadId: string): Promise<void> {
    this.ready();
    await directory(this.staging, this.root);
    const path = join(this.staging, id(uploadId));
    try { await directory(path, this.root); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
    await rm(path, { recursive: true });
  }

  async openBlob(key: string): Promise<{ stream: ReturnType<typeof createReadStream>; size: number }> {
    this.ready();
    await directory(this.blobs, this.root);
    const path = join(this.blobs, id(key));
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error("Unsafe storage blob");
    return { stream: createReadStream(path), size: info.size };
  }

  /** Internal reconciliation inventory; compare keys with upload/blob metadata, never return paths to the API. */
  async inventory(): Promise<{ stagedUploadIds: string[]; blobKeys: string[]; assemblingKeys: string[] }> {
    this.ready();
    await directory(this.staging, this.root);
    await directory(this.blobs, this.root);
    const stagedUploadIds: string[] = [];
    const assemblingKeys: string[] = [];
    for (const entry of await readdir(this.staging, { withFileTypes: true })) {
      if (entry.isDirectory() && UUID.test(entry.name)) stagedUploadIds.push(entry.name);
      else if (entry.isFile() && /^[0-9a-f-]{36}\.assembling$/i.test(entry.name)) assemblingKeys.push(entry.name);
      else throw new Error("Unknown or unsafe staging entry");
    }
    const blobKeys: string[] = [];
    for (const entry of await readdir(this.blobs, { withFileTypes: true })) {
      if (!entry.isFile() || !UUID.test(entry.name)) throw new Error("Unknown or unsafe blob entry");
      blobKeys.push(entry.name);
    }
    return { stagedUploadIds: stagedUploadIds.sort(), blobKeys: blobKeys.sort(), assemblingKeys: assemblingKeys.sort() };
  }
}

import { lstat, mkdir, realpath } from "node:fs/promises";
import { isAbsolute, join, resolve, sep } from "node:path";
import type { Readable } from "node:stream";
import { NasStorage } from "./nas-storage.js";

/**
 * Private library-owned storage namespace. Callers must authorize the library
 * metadata on every request before opening a file.
 */
export class LibraryStorage {
  private storage: NasStorage | undefined;

  constructor(private readonly configuredNasRoot: string) {
    if (!isAbsolute(configuredNasRoot)) throw new Error("NAS root must be absolute");
  }

  async initialize(): Promise<void> {
    const root = resolve(this.configuredNasRoot);
    const rootInfo = await lstat(root);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("NAS root must be a real directory");
    const realRoot = await realpath(root);
    const libraryRoot = join(realRoot, ".sense-library");
    try { await mkdir(libraryRoot, { mode: 0o700 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    const libraryInfo = await lstat(libraryRoot);
    if (!libraryInfo.isDirectory() || libraryInfo.isSymbolicLink()) throw new Error("Library storage root must be a real directory");
    const realLibraryRoot = await realpath(libraryRoot);
    if (realLibraryRoot !== libraryRoot || !realLibraryRoot.startsWith(realRoot + sep)) throw new Error("Library storage path escapes NAS root");

    const storage = new NasStorage(libraryRoot);
    await storage.initialize();
    this.storage = storage;
  }

  private ready(): NasStorage {
    if (!this.storage) throw new Error("Library storage is not initialized");
    return this.storage;
  }

  async writeChunk(uploadId: string, index: number, bytes: Buffer, checksum: string): Promise<void> {
    await this.ready().writeChunk(uploadId, index, bytes, checksum);
  }

  /** Persisted file identifier is opaque to API callers; NAS blob keys stay internal. */
  async finalize(uploadId: string, chunkCount: number, expectedSize: number, expectedChecksum?: string): Promise<{ fileId: string; size: number; sha256: string }> {
    const { key, size, sha256 } = await this.ready().finalize(uploadId, chunkCount, expectedSize, expectedChecksum, uploadId);
    return { fileId: key, size, sha256 };
  }

  async discardUpload(uploadId: string): Promise<void> {
    await this.ready().discardUpload(uploadId);
  }

  async openFile(fileId: string): Promise<{ stream: Readable; size: number }> {
    const { stream, size } = await this.ready().openBlob(fileId);
    return { stream, size };
  }
}

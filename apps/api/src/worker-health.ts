import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";

type JobHealth = { attemptedAt: number; succeededAt?: number; failedAt?: number; maxAgeMs: number };
type HealthSnapshot = { version: 1; writtenAt: number; jobs: Record<string, JobHealth> };

/** Operational evidence only; no job payloads, recipients or exception messages. */
export class WorkerHealth {
  private readonly jobs: Record<string, JobHealth> = {};
  private writes = Promise.resolve();
  constructor(private readonly path?: string, private readonly now = Date.now) {}

  async track<T>(name: string, maxAgeMs: number, operation: () => Promise<T>): Promise<T> {
    if (!this.path) return operation();
    const job = this.jobs[name] ??= { attemptedAt: this.now(), maxAgeMs };
    job.attemptedAt = this.now();
    try {
      const result = await operation();
      job.succeededAt = this.now();
      delete job.failedAt;
      return result;
    } catch (error) {
      job.failedAt = this.now();
      throw error;
    } finally {
      const snapshot: HealthSnapshot = { version: 1, writtenAt: this.now(), jobs: structuredClone(this.jobs) };
      this.writes = this.writes.catch(() => undefined).then(async () => {
        const temporary = `${this.path}.${randomUUID()}.tmp`;
        await writeFile(temporary, JSON.stringify(snapshot), { flag: "wx", mode: 0o600 });
        await rename(temporary, this.path!);
      });
      await this.writes.catch(() => console.error("Worker health evidence could not be written."));
    }
  }
}

export async function checkWorkerHealth(path: string, now = Date.now()): Promise<void> {
  const bytes = await readFile(path);
  if (bytes.byteLength > 64 * 1024) throw new Error("Invalid worker health evidence");
  const snapshot = JSON.parse(bytes.toString("utf8")) as HealthSnapshot;
  if (snapshot.version !== 1 || !Number.isFinite(snapshot.writtenAt) || now - snapshot.writtenAt > 90_000 || snapshot.writtenAt > now + 60_000) throw new Error("Worker heartbeat is stale");
  for (const required of ["database", "notifications"]) if (!snapshot.jobs?.[required]) throw new Error("Worker has not completed initialization");
  for (const job of Object.values(snapshot.jobs)) {
    if (!Number.isFinite(job.succeededAt) || !Number.isFinite(job.maxAgeMs) || job.maxAgeMs <= 0 || now - job.succeededAt! > job.maxAgeMs || job.succeededAt! > now + 60_000 || job.failedAt !== undefined) throw new Error("A worker job is failed or stale");
  }
}

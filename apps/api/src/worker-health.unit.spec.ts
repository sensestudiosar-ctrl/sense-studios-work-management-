import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkerHealth, checkWorkerHealth } from "./worker-health.js";

describe("worker operational evidence", () => {
  let root: string;
  let path: string;
  let time: number;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "sense-worker-health-")); path = join(root, "health.json"); time = 1_000_000; });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it("does not report readiness before both database and notifications succeed", async () => {
    const health = new WorkerHealth(path, () => time);
    await health.track("database", 90_000, async () => undefined);
    await expect(checkWorkerHealth(path, time)).rejects.toThrow("initialization");
    await health.track("notifications", 300_000, async () => undefined);
    await expect(checkWorkerHealth(path, time)).resolves.toBeUndefined();
  });

  it("detects stale database progress even when notification writes keep the file fresh", async () => {
    const health = new WorkerHealth(path, () => time);
    await health.track("database", 90_000, async () => undefined);
    time += 91_000;
    await health.track("notifications", 300_000, async () => undefined);
    await expect(checkWorkerHealth(path, time)).rejects.toThrow("failed or stale");
  });

  it("retains a failed job until recovery without serializing private errors", async () => {
    const health = new WorkerHealth(path, () => time);
    await health.track("database", 90_000, async () => undefined);
    await health.track("notifications", 300_000, async () => undefined);
    await expect(health.track("reports", 300_000, async () => { throw new Error("private-recipient-secret"); })).rejects.toThrow("private-recipient-secret");
    expect(await readFile(path, "utf8")).not.toContain("private-recipient-secret");
    await expect(checkWorkerHealth(path, time)).rejects.toThrow("failed or stale");
    await health.track("reports", 300_000, async () => undefined);
    await expect(checkWorkerHealth(path, time)).resolves.toBeUndefined();
  });

  it("preserves the operation result without writing when telemetry is not configured", async () => {
    expect(await new WorkerHealth().track("database", 90_000, async () => 42)).toBe(42);
  });
});

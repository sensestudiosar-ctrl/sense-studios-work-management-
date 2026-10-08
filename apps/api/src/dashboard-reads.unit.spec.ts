import { ForbiddenException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { DashboardService } from "./dashboard.service.js";
import type { ProjectActor } from "./project.service.js";

describe("S24 transaction-local source reads", () => {
  const actor = { accountId: "owner-a", organizationId: "org", kind: "OWNER" } as ProjectActor;
  function fixture() {
    const entries = Array.from({ length: 30 }, (_, i) => ({ id: `time-${i}`, durationSeconds: 1800 }));
    const workload = Array.from({ length: 30 }, (_, i) => ({ id: `workforce-${i}`, availableMinutes: 480 }));
    const manifest = [
      ...entries.map(row => ({ kind: "TIME", id: row.id, keys: ["id", "durationSeconds"] })),
      ...workload.map(row => ({ kind: "WORKFORCE", id: row.id, from: "2026-10-01", to: "2026-10-05", keys: ["id", "availableMinutes"] }))
    ];
    const snapshots = ["snapshot-a", "snapshot-b"].map(id => ({ id, table: { title: id }, manifest }));
    const time = { list: jest.fn(async (reader: ProjectActor) => {
      if (reader.accountId !== actor.accountId) throw new ForbiddenException("Current time source scope lost");
      return { entries };
    }) };
    const workforce = { list: jest.fn(async (...args: [ProjectActor, "mine" | "managed", string, string]) => ({ scope: args[1], workloadPeriods: workload })) };
    const tx = { reportSnapshot: { findMany: jest.fn(async () => snapshots) } };
    const service = Object.create(DashboardService.prototype) as DashboardService;
    Object.assign(service, {
      database: { prisma: { $transaction: async (run: (client: typeof tx) => Promise<unknown>) => run(tx) } },
      time, workforce, active: jest.fn(async () => undefined)
    });
    return { service, time, workforce, entries, workload };
  }

  it("authorizes every retained row while reading each full owning-port dataset once per request", async () => {
    const { service, time, workforce } = fixture();
    const result = await service.snapshots(actor);
    expect(result.snapshots.map(row => row.id)).toEqual(["snapshot-a", "snapshot-b"]);
    expect(time.list).toHaveBeenCalledTimes(1);
    expect(workforce.list).toHaveBeenCalledTimes(2);
    expect(workforce.list.mock.calls.map(call => call[1])).toEqual(["mine", "managed"]);
  });

  it("does not reuse another request's authority or stale protected fields", async () => {
    const { service, time, entries, workload } = fixture();
    expect((await service.snapshots(actor)).snapshots).toHaveLength(2);
    expect((await service.snapshots({ ...actor, accountId: "owner-b" })).snapshots).toEqual([]);
    expect(time.list).toHaveBeenCalledWith(expect.objectContaining({ accountId: "owner-b" }), "managed", true);
    entries.splice(0, 1);
    expect((await service.snapshots(actor)).snapshots).toEqual([]);
    entries.unshift({ id: "time-0", durationSeconds: 1800 });
    delete (workload[0] as { availableMinutes?: number }).availableMinutes;
    expect((await service.snapshots(actor)).snapshots).toEqual([]);
  });

  it("does not regenerate an immutable committed summary slot on another scheduler tick", async () => {
    const run = { findUnique: jest.fn(async () => ({ id: "committed-run" })) };
    const source = jest.fn(async () => { throw new Error("Committed summary must not be regenerated"); });
    const service = Object.create(DashboardService.prototype) as DashboardService;
    Object.assign(service, {
      database: { prisma: {
        organization: { findFirst: async () => ({ id: actor.organizationId }) },
        account: { findMany: async () => [{ id: actor.accountId, kind: "OWNER", state: "ACTIVE" }] },
        personalReminder: { findMany: async () => [] },
        dashboardRule: { findMany: async () => [{ id: "rule", version: 1, data: { kind: "SUMMARY", audience: "OWNER", summaryKind: "MORNING", localTime: "00:00", timezone: "Asia/Kolkata" } }] },
        dashboardRun: run
      } },
      projects: { actor: async () => actor },
      performance: { context: source }, summary: source, deliver: source
    });
    expect(await service.runBatch(new Date("2026-10-05T02:00:00Z"))).toBe(0);
    expect(run.findUnique).toHaveBeenCalledWith({ where: { sourceId_recipientId_slot: { sourceId: "rule", recipientId: actor.accountId, slot: "2026-10-05" } } });
    expect(source).not.toHaveBeenCalled();
  });
});

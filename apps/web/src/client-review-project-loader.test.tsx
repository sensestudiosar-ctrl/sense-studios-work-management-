import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { loadBranchProjects } from "./client-review-project-loader.js";

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("client review branch project loader", () => {
  it("caps concurrent requests at four and preserves branch and page order", async () => {
    const branches = Array.from({ length: 8 }, (_, index) => ({ id: `branch-${index}` }));
    const gates = Array.from({ length: 3 }, () => deferred<void>());
    const calls: Array<{ branchId: string; offset: number }> = [];
    let active = 0;
    let peak = 0;
    const loading = loadBranchProjects(branches, async (branchId, offset) => {
      const callIndex = calls.length;
      calls.push({ branchId, offset });
      active += 1;
      peak = Math.max(peak, active);
      try {
        await gates[Math.floor(callIndex / 4)]?.promise;
        if (branchId === "branch-0" && offset === 0) {
          return { items: Array.from({ length: 50 }, (_, index) => `branch-0-item-${index}`) };
        }
        return { items: [`${branchId}-item-${offset}`] };
      } finally {
        active -= 1;
      }
    });

    await waitFor(() => expect(calls).toHaveLength(4));
    expect(peak).toBe(4);
    gates[0]?.resolve();
    await waitFor(() => expect(calls).toHaveLength(8));
    gates[1]?.resolve();
    await waitFor(() => expect(calls).toHaveLength(9));
    gates[2]?.resolve();

    const result = await loading;
    expect(peak).toBeLessThanOrEqual(4);
    expect(calls.filter((call) => call.branchId === "branch-0").map((call) => call.offset)).toEqual([0, 50]);
    expect(result).toHaveLength(58);
    expect(result.slice(0, 51)).toEqual([
      ...Array.from({ length: 50 }, (_, index) => `branch-0-item-${index}`),
      "branch-0-item-50",
    ]);
    expect(result.slice(51)).toEqual(Array.from({ length: 7 }, (_, index) => `branch-${index + 1}-item-0`));
  });

  it("propagates a branch failure and stops assigning queued branches", async () => {
    const branches = Array.from({ length: 7 }, (_, index) => ({ id: `branch-${index}` }));
    const failFirst = deferred<void>();
    const releaseOthers = deferred<void>();
    const failure = new Error("branch request failed");
    const calls: string[] = [];
    let failedRequestObserved = false;
    const loading = loadBranchProjects(branches, async (branchId) => {
      calls.push(branchId);
      if (branchId === "branch-0") {
        await failFirst.promise;
        failedRequestObserved = true;
        throw failure;
      }
      await releaseOthers.promise;
      return { items: [branchId] };
    });

    await waitFor(() => expect(calls).toHaveLength(4));
    failFirst.resolve();
    await waitFor(() => expect(failedRequestObserved).toBe(true));
    await Promise.resolve();
    expect(calls).toHaveLength(4);
    releaseOthers.resolve();
    await expect(loading).rejects.toBe(failure);
    expect(calls).toHaveLength(4);
  });

  it("does not schedule queued branches or another page after the owning effect becomes stale", async () => {
    const branches = Array.from({ length: 7 }, (_, index) => ({ id: `branch-${index}` }));
    const releasePages = deferred<void>();
    const calls: Array<{ branchId: string; offset: number }> = [];
    let live = true;
    const loading = loadBranchProjects(branches, async (branchId, offset) => {
      calls.push({ branchId, offset });
      await releasePages.promise;
      return { items: branchId === "branch-0" && offset === 0
        ? Array.from({ length: 50 }, (_, index) => `project-${index}`)
        : [`${branchId}-project`] };
    }, () => live);

    await waitFor(() => expect(calls).toHaveLength(4));
    live = false;
    releasePages.resolve();

    const staleRows = await loading;
    expect(calls).toHaveLength(4);
    expect(calls.some((call) => call.offset > 0)).toBe(false);
    expect(staleRows.map((row) => row.split("-").slice(0, 2).join("-"))).toEqual(["branch-1", "branch-2", "branch-3"]);
  });
});

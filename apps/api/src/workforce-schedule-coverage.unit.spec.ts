import { jest } from "@jest/globals";
import { WorkforceService } from "./workforce.service.js";

describe("workforce schedule coverage", () => {
  it("marks only missing schedules and carries a missing date into the period", async () => {
    const service = Object.create(WorkforceService.prototype) as WorkforceService;
    const employee = { id: "employee", homeBranchId: "branch" };
    const records = [
      { kind: "POLICY", branchId: "branch", id: "policy", data: { effectiveFrom: "2026-01-01", thresholds: { under: 50, near: 80, over: 100 } }, createdAt: new Date() },
      { kind: "SCHEDULE", employeeId: "employee", data: { effectiveFrom: "2026-10-03", effectiveTo: null, workingDays: [1, 2, 3, 4, 5], dailyCapacityMinutes: 480 }, createdAt: new Date() },
    ];
    const tx = {
      workforceRecord: { findMany: jest.fn(async () => records) },
      employeeMembershipHistory: { findMany: jest.fn(async () => []) },
      task: { findMany: jest.fn(async () => []) },
    };
    Object.assign(service, {
      transaction: async (fn: (value: unknown) => Promise<unknown>) => fn(tx),
      visibleEmployees: async () => [employee],
      credit: async () => ({}),
    });
    const result = await service.list({ accountId: "account", organizationId: "org", kind: "STAFF" } as never, "mine", "2026-10-02", "2026-10-03");
    expect(result.workload[0]).toMatchObject({ scheduleSetupRequired: true });
    expect(result.workload[1]).toMatchObject({ scheduleSetupRequired: false, scheduledMinutes: 0 });
    expect(result.workloadPeriods[0]).toMatchObject({ scheduleSetupRequired: true });
  });
});

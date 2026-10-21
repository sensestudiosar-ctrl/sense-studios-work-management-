import { jest } from "@jest/globals";
import { ForbiddenException } from "@nestjs/common";
import { AccountKind } from "./generated/prisma/client.js";
import { TaskService, UNBOUNDED_CANDIDATE_SCAN } from "./task.service.js";
import { ReviewService } from "./review.service.js";
const actor = { accountId: "actor", organizationId: "org", kind: AccountKind.STAFF };
const date = new Date("2020-01-01");

describe("Independent actionable task projection", () => {
  it("searches authorized task description/plan labels privately and keeps query refinements inside the candidate predicate", async () => {
    const rows = ["hidden", "first", "second"].map(id => ({ id: `source-${id}`, title: "Layout", description: id === "first" ? "Confirm DIMENSIONS" : "Other work", planItem: { label: id === "second" ? "Electrical coordination" : "Design" }, projectId: "project", project: { id: "project", title: "Studio" }, primaryOwnerEmployeeId: "employee", status: "IN_PROGRESS", type: "PROJECT", targetDate: date, priority: "HIGH", requiresReassignment: false }));
    const tx = { task: { findMany: jest.fn(async () => rows) }, taskSubtaskLink: { findMany: async () => [] } };
    const service = new TaskService({ prisma: {} } as never, {} as never, { registerHandler: () => undefined } as never);
    Object.assign(service, { activeActor: async () => ({ employee: { id: "employee" } }), taskAccess: async (_tx: unknown, _actor: unknown, task: { id: string }) => {
      if (task.id === "source-hidden") throw new ForbiddenException();
      return { project: { id: "project", status: "ACTIVE" } };
    } });
    const result = await service.actionableInTransaction(tx as never, actor, new Date("2026-10-15"), "Asia/Kolkata", undefined, { priorities: ["HIGH"], collaboratorEmployeeIds: ["person"], q: "electrical" });
    expect(result.items.map(item => item.sourceId)).toEqual(["source-second"]); expect(result.total).toBe(1);
    expect(tx.task.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", AND: [{ priority: { in: ["HIGH"] } }, { collaborators: { some: { employeeId: { in: ["person"] } } } }] }) }));
    expect(result.items[0]).not.toHaveProperty("description"); expect(result.items[0]).not.toHaveProperty("planItem");
    expect((await service.actionableInTransaction(tx as never, actor, new Date("2026-10-15"), "Asia/Kolkata", undefined, { q: "dimensions" })).items.map(item => item.sourceId)).toEqual(["source-first"]);
    expect((await service.actionableInTransaction(tx as never, actor, new Date("2026-10-15"), "Asia/Kolkata", undefined, { q: "source-" })).total).toBe(2);
  });
  it("counts eligible unique task rows before paging and excludes inaccessible/collaborator-only rows", async () => {
    const rows = ["hidden", "collaborator", "first", "second"].map(id => ({ id, title: id, primaryOwnerEmployeeId: id === "collaborator" ? "another" : "employee", project: null, status: "IN_PROGRESS", type: "CORRECTION", targetDate: date, priority: "HIGH", requiresReassignment: false }));
    const tx = { organization: { findUniqueOrThrow: async () => ({ timezone: "Asia/Kolkata" }) }, task: { findMany: jest.fn(async () => rows) }, taskSubtaskLink: { findMany: async () => [] } };
    const service = new TaskService({ prisma: { $transaction: async (work: (value: typeof tx) => unknown) => work(tx) } } as never, {} as never, { registerHandler: () => undefined } as never);
    Object.assign(service, { activeActor: async () => ({ employee: { id: "employee" } }), taskAccess: async (_tx: unknown, _actor: unknown, task: { id: string }) => {
      if (task.id === "hidden") throw new ForbiddenException();
      return { account: { employee: { id: "employee" } }, project: null };
    } });
    const page = await service.actionable(actor, 1, 1);
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ source: "task", sourceId: "second", reasons: ["correction_required", "overdue"], destination: "/my-work?taskId=second" });
    expect(tx.task.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org" }) }));
  });

  it("bounds the candidate scan and refuses rather than publishing a partial total", async () => {
    const row = (id: string) => ({ id, title: id, primaryOwnerEmployeeId: "employee", project: null, status: "IN_PROGRESS", type: "CORRECTION", targetDate: date, priority: "HIGH", requiresReassignment: false });
    const tx = { organization: { findUniqueOrThrow: async () => ({ timezone: "Asia/Kolkata" }) }, task: { findMany: jest.fn(async () => rows) }, taskSubtaskLink: { findMany: async () => [] } };
    const service = new TaskService({ prisma: { $transaction: async (work: (value: typeof tx) => unknown) => work(tx) } } as never, {} as never, { registerHandler: () => undefined } as never);
    Object.assign(service, { activeActor: async () => ({ employee: { id: "employee" } }), taskAccess: async () => ({ account: { employee: { id: "employee" } }, project: null }) });
    // One more candidate than the readable bound must be an explicit refusal, not
    // a silently smaller total: the caller surfaces this as unavailable.
    const rows = Array.from({ length: UNBOUNDED_CANDIDATE_SCAN + 1 }, (_unused, index) => row(`task-${index}`));
    tx.task.findMany = jest.fn(async () => rows);
    await expect(service.actionable(actor)).rejects.toThrow("no complete page or count was published");
    // The bound itself is a real limit, not a courtesy: exactly at the cap still reads.
    tx.task.findMany = jest.fn(async () => rows.slice(0, UNBOUNDED_CANDIDATE_SCAN));
    const page = await service.actionable(actor, 0, 25);
    expect(page.total).toBe(UNBOUNDED_CANDIDATE_SCAN);
  });
});

describe("Independent assigned review projection", () => {
  function harness() {
    const rows = ["valid", "self", "old", "reassigned", "blocked", "foreign"].map(id => ({ id, organizationId: "org", reviewerEmployeeId: "employee", status: "SUBMITTED", taskId: id, submissionId: `submission-${id}` }));
    const tx = {
      organization: { findUniqueOrThrow: async () => ({ timezone: "Asia/Kolkata" }) },
      reviewRound: { findMany: async () => rows },
      reviewSubmission: { findFirst: async ({ where }: { where: { taskId: string } }) => ({ id: where.taskId === "old" ? "newer" : `submission-${where.taskId}` }) },
      reviewAssignment: { findUnique: async ({ where }: { where: { taskId: string } }) => ({ reviewerEmployeeId: where.taskId === "reassigned" ? "new-reviewer" : "employee" }) }
    };
    const service = new ReviewService({ prisma: { $transaction: async (work: (value: typeof tx) => unknown) => work(tx) } } as never, {} as never, {} as never, {} as never, {} as never);
    Object.assign(service, {
      account: async () => ({ employee: { id: "employee" } }), candidate: async () => ({}),
      round: async (_tx: unknown, _actor: unknown, id: string) => {
        if (id === "foreign") throw new ForbiddenException();
        return { row: { id, title: id, primaryOwnerEmployeeId: "owner", requiresReassignment: id === "blocked", status: "SUBMITTED_INTERNAL_REVIEW", targetDate: date, committedDueDate: null },
          project: { id: "project", title: "Project", status: "ACTIVE" }, round: rows.find(row => row.id === id),
          submission: { id: `submission-${id}`, submittedById: id === "self" ? "actor" : "submitter" } };
      }
    });
    return { service, tx };
  }
  it("uses named independent current round/current assignment and excludes blocked and inaccessible work", async () => {
    const { service } = harness();
    const page = await service.actionable(actor);
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({ source: "review", sourceId: "valid", roundId: "valid", taskId: "valid", reason: "review_start_required", destination: "/reviews?taskId=valid&roundId=valid" });
    expect((await service.actionable(actor, 1, 1)).items).toEqual([]);
    expect((await service.actionable({ ...actor, kind: AccountKind.OWNER })).total).toBe(0);
  });
  it("propagates unavailable source failures rather than fabricating zero", async () => {
    const { service, tx } = harness();
    tx.reviewRound.findMany = async () => { throw new Error("source unavailable"); };
    await expect(service.actionable(actor)).rejects.toThrow("source unavailable");
  });
});

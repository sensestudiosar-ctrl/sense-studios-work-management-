import { jest } from "@jest/globals";
import { ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { AccountKind } from "./generated/prisma/client.js";
import { MyWorkService, attentionSource, deadlineDay, orderAttention } from "./my-work.service.js";
import { attentionQuerySchema } from "./my-work.controller.js";
import type { MyWorkRow, TaskReadRefinements } from "@sense/contracts";
const actor = { accountId: "account", organizationId: "org", kind: AccountKind.STAFF };
const date = new Date("2026-10-13T00:00:00Z");
const task = (id: string, priority = "MEDIUM") => ({ sourceId: id, taskId: id, title: id, project: { id: "project", title: "Project drawing" }, responsibility: "primary_owner", reason: "due_today", reasons: ["due_today"], deadline: date, priority, destination: `/my-work?taskId=${id}`, status: "IN_PROGRESS", type: "PROJECT", ownerEmployeeId: "employee", planItemId: null, committedDueDate: null });
function harness() {
  const tx = { $executeRaw: jest.fn(async () => 0), account: { findFirst: jest.fn(async () => ({ id: "account" })) }, organization: { findUnique: async () => ({ timezone: "Asia/Kolkata" }) } };
  const transaction = jest.fn(async (work: (value: typeof tx) => unknown, options: unknown) => { void options; return work(tx); });
  const tasks = { actionableInTransaction: jest.fn(async (...args: [unknown, unknown, Date, string, number | undefined, TaskReadRefinements & { q?: string }]) => { const query = args[5]; return { items: [task("task-late", "LOW"), task("task-first", "HIGH")].filter(item => (!query.priorities?.length || query.priorities.some(priority => priority === item.priority)) && (!query.q || [item.title, item.project.title, item.sourceId].some(value => value.toLowerCase().includes(query.q!.toLowerCase())))) }; }) };
  const reviews = { actionableInTransaction: jest.fn(async (...args: [unknown, unknown, Date, string]) => { void args; return { items: [{ sourceId: "round", roundId: "round", taskId: "task-reviewed", title: "Review", project: { id: "project", title: "Project drawing" }, responsibility: "assigned_reviewer", reason: "review_start_required", deadline: new Date("2026-10-12"), destination: "/reviews" }] }; }) };
  const approvals = { actionableInTransaction: jest.fn(async (...args: [unknown, unknown, Date]) => { void args; return { items: [{ sourceId: "request", requestId: "request", title: "Decision", responsibility: "decision", reason: "decision_required", deadline: null, destination: "/decisions" }] }; }) };
  return { tx, transaction, tasks, reviews, approvals, service: new MyWorkService({ prisma: { $transaction: transaction } } as never, tasks as never, reviews as never, approvals as never) };
}
describe("My Work complete shared read", () => {
  it("uses one RepeatableRead snapshot/clock/calendar without a READ ONLY restriction that rejects canonical locks", async () => {
    const h = harness(); const result = await h.service.attention(actor, { offset: 1, limit: 2 });
    expect(h.transaction).toHaveBeenCalledTimes(1); expect(h.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead", timeout: 30_000 });
    expect(h.tx.$executeRaw).not.toHaveBeenCalled();
    const readAt = h.tasks.actionableInTransaction.mock.calls[0]![2];
    expect(h.reviews.actionableInTransaction).toHaveBeenCalledWith(h.tx, actor, readAt, "Asia/Kolkata"); expect(h.approvals.actionableInTransaction).toHaveBeenCalledWith(h.tx, actor, readAt);
    expect(result.readAt).toBe(readAt.toISOString()); expect(result.items.map(row => row.sourceId)).toEqual(["task-first", "task-late"]);
    expect(result.sourceCounts).toEqual({ task: { status: "ready", total: 2 }, review: { status: "ready", total: 1 }, approval: { status: "ready", total: 1 } });
    expect(result.totalItems).toBe(4); expect(result.hasMore).toBe(true);
  });
  it("applies task-only filters before counting/paging and excludes other ports without inventing zero totals", async () => {
    const h = harness(); const result = await h.service.attention(actor, { source: "all", status: "IN_PROGRESS", ownerEmployeeId: "employee", q: "first", offset: 0, limit: 25 });
    expect(result.source).toBe("task"); expect(result.items.map(row => row.sourceId)).toEqual(["task-first"]);
    expect(result.sourceCounts).toEqual({ task: { status: "ready", total: 1 }, review: { status: "excluded" }, approval: { status: "excluded" } });
    expect(h.reviews.actionableInTransaction).not.toHaveBeenCalled(); expect(h.approvals.actionableInTransaction).not.toHaveBeenCalled();
  });
  it("retains shared project/search filters across Tasks and Reviews with no fake project for approvals", async () => {
    const h = harness(); const result = await h.service.attention(actor, { q: "drawing", projectId: "project", offset: 0, limit: 25 });
    expect(result.totalItems).toBe(3); expect(result.sourceCounts.approval).toEqual({ status: "ready", total: 0 });
  });
  it("forwards task refinements in the shared transaction and counts only the matching source", async () => {
    const h = harness(); const result = await h.service.attention(actor, { priorities: ["HIGH"], collaboratorEmployeeIds: ["11111111-1111-4111-8111-111111111111"], offset: 0, limit: 25 });
    expect(result.source).toBe("task"); expect(result.totalItems).toBe(1); expect(result.items[0]?.sourceId).toBe("task-first");
    expect(h.tasks.actionableInTransaction.mock.calls[0]![5]).toEqual({ priorities: ["HIGH"], collaboratorEmployeeIds: ["11111111-1111-4111-8111-111111111111"] });
    expect(result.sourceCounts.review).toEqual({ status: "excluded" }); expect(result.sourceCounts.approval).toEqual({ status: "excluded" });
    expect(h.reviews.actionableInTransaction).not.toHaveBeenCalled(); expect(h.approvals.actionableInTransaction).not.toHaveBeenCalled();
  });
  it("retains an owning Task-port description/plan-label match without projecting searchable metadata", async () => {
    const h = harness(); h.tasks.actionableInTransaction.mockResolvedValueOnce({ items: [task("matching-task", "HIGH")] });
    const result = await h.service.attention(actor, { source: "task", q: "private stage phrase", offset: 0, limit: 25 });
    expect(result.items).toHaveLength(1); expect(h.tasks.actionableInTransaction.mock.calls[0]![5]).toEqual({ q: "private stage phrase" });
    expect(result.items[0]).not.toHaveProperty("description"); expect(result.items[0]).not.toHaveProperty("planItem");
  });
  it("does not publish a partial page when an included source fails", async () => {
    const h = harness(); h.reviews.actionableInTransaction.mockRejectedValueOnce(new Error("transport"));
    await expect(h.service.attention(actor, { offset: 0, limit: 25 })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it("preserves authorization denial and does not invoke ports for an inactive actor", async () => {
    const h = harness(); h.tx.account.findFirst.mockResolvedValueOnce(null as never);
    await expect(h.service.attention(actor, { offset: 0, limit: 25 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.tasks.actionableInTransaction).not.toHaveBeenCalled();
  });
  it("selects only the requested review port and preserves round identity", async () => {
    const h = harness(); const result = await h.service.attention(actor, { source: "review", offset: 0, limit: 25 });
    expect(h.tasks.actionableInTransaction).not.toHaveBeenCalled(); expect(h.approvals.actionableInTransaction).not.toHaveBeenCalled(); expect(result.items[0]).toMatchObject({ source: "review", taskId: "task-reviewed", roundId: "round" });
  });
  it("compares date-only values unchanged and decision expiry by the organization day, with deterministic ties", () => {
    const row: MyWorkRow = { source: "task", sourceId: "a", title: "A", responsibility: "primary_owner", reason: "due_today", deadline: "2026-10-13T00:00:00Z", deadlineKind: "target_date", destination: "/my-work", priority: "HIGH" };
    const decision: MyWorkRow = { ...row, source: "approval", sourceId: "decision", deadline: "2026-10-12T23:30:00Z", deadlineKind: "decision_expiry", priority: undefined };
    expect(deadlineDay(row, "America/Los_Angeles")).toBe("2026-10-13"); expect(deadlineDay(decision, "Asia/Kolkata")).toBe("2026-10-13");
    expect(orderAttention([decision, { ...row, sourceId: "b" }, row], "Asia/Kolkata").map(item => item.sourceId)).toEqual(["a", "b", "decision"]);
  });
  it("uses task scope only for actual task predicates, never for shared q/project", () => {
    expect(attentionSource({ q: "x", projectId: "p", offset: 0, limit: 25 })).toBe("all");
    expect(attentionSource({ phase: "waiting", source: "review", offset: 0, limit: 25 })).toBe("task");
  });
  it.each([{ limit: "0" }, { limit: "101" }, { offset: "-1" }, { phase: "active" }, { status: "IN_PROGRESS", unknown: "x" }, { dateFrom: "2026-10-13" }, { dateBasis: "target", dateFrom: "2026-10-14", dateTo: "2026-10-13" }])("rejects unsafe/unsupported query %j", value => {
    expect(attentionQuerySchema.safeParse(value).success).toBe(false);
  });
});

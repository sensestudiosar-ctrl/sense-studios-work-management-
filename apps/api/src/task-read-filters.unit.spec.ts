import { jest } from "@jest/globals";
import { ForbiddenException } from "@nestjs/common";
import { AccountKind, type Prisma } from "./generated/prisma/client.js";
import { TaskService } from "./task.service.js";
import { actionableTaskSearchMatches, taskCollaboratorSelection, taskPrioritySelection, taskRefinementPredicates, taskSearchPredicate } from "./task-read-filters.js";
import { attentionQuerySchema } from "./my-work.controller.js";
const employeeId = "11111111-1111-4111-8111-111111111111";
const collaboratorId = "22222222-2222-4222-8222-222222222222";
function harness() {
  const employee = { id: employeeId, state: "ACTIVE", organizationId: "org", homeBranchId: "branch", homeTeamId: "team" };
  const account = { id: "actor", kind: AccountKind.STAFF, state: "ACTIVE", employee };
  type Query = { where: Prisma.TaskWhereInput; orderBy?: Prisma.TaskOrderByWithRelationInput[]; skip?: number; take?: number };
  const count = jest.fn(async (input: Query) => { void input; return 73; });
  const findMany = jest.fn(async (input: Query) => { void input; return [{ id: "task", title: "Layout", priority: "HIGH" }]; });
  const tx = { $queryRaw: jest.fn(async () => []), account: { findUnique: jest.fn(async () => account) }, employee: { findUnique: jest.fn(async () => employee) }, projectAssignment: { findMany: jest.fn(async () => []) }, task: { count, findMany }, taskSubtaskLink: { findMany: jest.fn(async () => []) } };
  const service = new TaskService({ prisma: { $transaction: async (work: (value: typeof tx) => unknown) => work(tx) } } as never, {} as never, { registerHandler: jest.fn() } as never);
  return { service, tx, account, actor: { accountId: "actor", organizationId: "org", kind: AccountKind.STAFF } };
}
describe("bounded task query refinements", () => {
  it.each(["", "URGENT", "HIGH,HIGH", "HIGH,MEDIUM,LOW,CRITICAL,HIGH"])("rejects unsupported/duplicate/oversized priority query %s", value => {
    expect(taskPrioritySelection.safeParse(value).success).toBe(false);
  });
  it.each(["", "other-person", `${employeeId},${employeeId}`])("rejects unsafe collaborator selection %s", value => {
    expect(taskCollaboratorSelection.safeParse(value).success).toBe(false);
  });
  it("bounds collaborators and parses shared selectors at the attention boundary", () => {
    const ids = Array.from({ length: 31 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    expect(taskCollaboratorSelection.safeParse(ids.join(",")).success).toBe(false);
    const result = attentionQuerySchema.parse({ priorities: "HIGH,CRITICAL", collaboratorEmployeeIds: collaboratorId });
    expect(result).toMatchObject({ priorities: ["HIGH", "CRITICAL"], collaboratorEmployeeIds: [collaboratorId], offset: 0, limit: 50 });
  });
  it("uses the identical authorized where for count/page and stable priority/Target/id ordering", async () => {
    const h = harness(); const page = await h.service.list(h.actor, "personal", 50, 25, { priorities: ["HIGH", "CRITICAL"], collaboratorEmployeeIds: [collaboratorId], projectId: "project", q: "dimension", sort: "priority_desc" });
    const count = h.tx.task.count.mock.calls[0]![0], rows = h.tx.task.findMany.mock.calls[0]![0];
    expect(rows.where).toBe(count.where); expect(rows.where.organizationId).toBe("org");
    expect(rows.where.AND).toEqual(expect.arrayContaining([
      { OR: [{ primaryOwnerEmployeeId: employeeId }, { collaborators: { some: { employeeId } } }] },
      ...taskRefinementPredicates({ priorities: ["HIGH", "CRITICAL"], collaboratorEmployeeIds: [collaboratorId] }),
      { projectId: "project" }, taskSearchPredicate("dimension"),
    ]));
    expect(rows).toMatchObject({ skip: 50, take: 25, orderBy: [{ priority: "desc" }, { targetDate: "asc" }, { id: "asc" }] });
    expect(page.total).toBe(73); expect(page.items).toHaveLength(1);
  });
  it("denies an inactive account before list/count even when valid refinements were supplied", async () => {
    const h = harness(); h.account.state = "SUSPENDED";
    await expect(h.service.list(h.actor, "personal", 0, 25, { priorities: ["HIGH"], collaboratorEmployeeIds: [collaboratorId] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.tx.task.count).not.toHaveBeenCalled(); expect(h.tx.task.findMany).not.toHaveBeenCalled();
  });
  it("matches task description/stage and source identity without including private text in output", () => {
    const row = { id: "task-source-id", title: "Layout", description: "Confirm DIMENSIONS", project: { title: "Studio" }, planItem: { label: "Electrical coordination" } };
    for (const q of ["dimensions", "ELECTRICAL", "source-id", "studio"]) expect(actionableTaskSearchMatches(row, q)).toBe(true);
    expect(actionableTaskSearchMatches(row, "unrelated")).toBe(false);
    expect(taskSearchPredicate("dimension")).toMatchObject({ OR: expect.arrayContaining([{ description: { contains: "dimension", mode: "insensitive" } }, { planItem: { is: { label: { contains: "dimension", mode: "insensitive" } } } }]) });
  });
});

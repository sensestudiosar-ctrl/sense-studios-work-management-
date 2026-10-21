import { jest } from "@jest/globals";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { TaskService, type CreateTaskInput } from "./task.service.js";
import { taskCreateHash } from "./task-create-identity.js";
import { AccountKind } from "./generated/prisma/client.js";

const input: CreateTaskInput = { idempotencyKey: "11111111-1111-4111-8111-111111111111", title: "Prepare brief", type: "NON_PROJECT", priority: "HIGH", targetDate: "2026-10-20", reason: "Agreed delivery" };
function harness() {
  const actor = { accountId: "actor", organizationId: "org", kind: AccountKind.OWNER };
  const task = { id: "task", organizationId: "org", createdById: "actor", primaryOwnerEmployeeId: "employee", projectId: null, version: 3 };
  const account = { state: "ACTIVE", kind: "OWNER", employee: null };
  const stored = { taskId: task.id, parentTaskId: null as string | null, command: "CREATE_TASK", payloadHash: taskCreateHash(input) };
  let receipt: typeof stored | null = stored;
  const createReceipt = jest.fn(async (value: unknown) => value);
  const tx = {
    $queryRaw: jest.fn(async () => []), account: { findUnique: jest.fn(async () => account) },
    task: { findFirst: jest.fn(async () => task) }, taskCreationReceipt: { findUnique: jest.fn(async () => receipt), create: createReceipt }
  };
  const service = new TaskService({ prisma: { $transaction: async (work: (value: typeof tx) => unknown) => work(tx) } } as never, {} as never, { registerHandler: jest.fn() } as never);
  const create = jest.spyOn(service, "createInTransaction").mockResolvedValue(task as never);
  return { service, actor, task, account, stored, tx, create, setReceipt: (value: typeof stored | null) => { receipt = value; } };
}
describe("task creation durable identity", () => {
  it("hashes typed defaults and collaborators independently of JSON property order and retry key", () => {
    expect(taskCreateHash({ ...input, tags: [], collaborators: [], reviewRequirement: "NONE", acknowledgeOverload: false })).toBe(taskCreateHash(input));
    expect(taskCreateHash({ reason: input.reason, ...input, idempotencyKey: "other" })).toBe(taskCreateHash(input));
    expect(taskCreateHash({ ...input, collaborators: [{ employeeId: "b" }, { employeeId: "a", estimatedHours: 0 }] })).toBe(taskCreateHash({ ...input, collaborators: [{ estimatedHours: 0, employeeId: "a" }, { employeeId: "b" }] }));
    expect(taskCreateHash({ ...input, acknowledgeOverload: true })).not.toBe(taskCreateHash(input));
    expect(taskCreateHash(input, { id: "parent", expectedVersion: 1 })).not.toBe(taskCreateHash(input, { id: "parent", expectedVersion: 2 }));
  });
  it("returns the existing current task without creation or another receipt", async () => {
    const h = harness(); expect(await h.service.create(h.actor, input)).toEqual(h.task);
    expect(h.create).not.toHaveBeenCalled(); expect(h.tx.taskCreationReceipt.create).not.toHaveBeenCalled();
    expect(h.tx.taskCreationReceipt.findUnique).toHaveBeenCalledWith({ where: { organizationId_actorId_key: { organizationId: "org", actorId: "actor", key: input.idempotencyKey } } });
  });
  it("creates task and receipt through the same transaction and leaves keyless workers unchanged", async () => {
    const h = harness(); h.setReceipt(null); await h.service.create(h.actor, input);
    expect(h.create).toHaveBeenCalledWith(h.tx, h.actor, input);
    expect(h.tx.taskCreationReceipt.create).toHaveBeenCalledWith({ data: expect.objectContaining({ taskId: "task", command: "CREATE_TASK", parentTaskId: null, payloadHash: taskCreateHash(input) }) });
    h.tx.taskCreationReceipt.create.mockClear(); h.tx.taskCreationReceipt.findUnique.mockClear();
    await h.service.create(h.actor, { ...input, idempotencyKey: undefined });
    expect(h.tx.taskCreationReceipt.create).not.toHaveBeenCalled(); expect(h.tx.taskCreationReceipt.findUnique).not.toHaveBeenCalled();
  });
  it("rejects a changed payload or command before returning the stored result", async () => {
    const h = harness(); await expect(h.service.create(h.actor, { ...input, title: "Changed brief" })).rejects.toBeInstanceOf(ConflictException);
    h.stored.command = "CREATE_SUBTASK"; await expect(h.service.create(h.actor, input)).rejects.toBeInstanceOf(ConflictException);
    expect(h.tx.task.findFirst).not.toHaveBeenCalled(); expect(h.create).not.toHaveBeenCalled();
  });
  it("rechecks active account and current resource authority on replay", async () => {
    const h = harness(); h.account.state = "SUSPENDED";
    await expect(h.service.create(h.actor, input)).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.tx.taskCreationReceipt.findUnique).not.toHaveBeenCalled();
    h.account.state = "ACTIVE"; h.task.projectId = "project" as never;
    Object.assign(h.tx, { project: { findFirst: async () => ({ id: "project", organizationId: "org" }) }, employee: { findUnique: async () => ({ id: "self", organizationId: "org" }) }, projectAssignment: { findFirst: async () => null } });
    h.actor.kind = AccountKind.STAFF; h.account.kind = "STAFF"; Object.assign(h.account, { employee: { id: "self", state: "ACTIVE", organizationId: "org" } });
    await expect(h.service.create(h.actor, input)).rejects.toBeInstanceOf(ForbiddenException); expect(h.create).not.toHaveBeenCalled();
  });
  it("does not write a receipt for a rejected capacity command", async () => {
    const h = harness(); h.setReceipt(null); h.create.mockRejectedValueOnce(new ConflictException("Overload warning"));
    await expect(h.service.create(h.actor, input)).rejects.toThrow("Overload warning"); expect(h.tx.taskCreationReceipt.create).not.toHaveBeenCalled();
  });
  it("recovers a subtask after parent version changed without rerunning creation or parent mutation", async () => {
    const h = harness(), childInput = { ...input, type: "PROJECT" as const, projectId: "project", expectedParentVersion: 1 };
    h.stored.command = "CREATE_SUBTASK"; h.stored.parentTaskId = "parent"; h.stored.payloadHash = taskCreateHash(childInput, { id: "parent", expectedVersion: 1 });
    h.tx.task.findFirst.mockImplementation(async () => ({ ...h.task, projectId: "project", version: 9 } as never));
    Object.assign(h.tx, { project: { findFirst: async () => ({ id: "project", organizationId: "org" }) } });
    const result = await h.service.createSubtask(h.actor, "parent", childInput);
    expect(result.task.id).toBe("task"); expect(result.parentVersion).toBe(9); expect(h.create).not.toHaveBeenCalled(); expect(h.tx.taskCreationReceipt.create).not.toHaveBeenCalled();
  });
});

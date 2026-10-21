import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { TaskService } from "./task.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { ProjectService } from "./project.service.js";
import { AccountKind, Prisma } from "./generated/prisma/client.js";
import { loadAgent1Target, verifyAgent1Database } from "./v1-agent1-test-target.js";
import type { RuntimeConfig } from "./config.js";
import type { ProjectActor } from "./project.service.js";

// Explicit operator-only suite: not matched by default *.unit.spec.ts or *.api.spec.ts.
// No describe.skip, no inherited target flags, no cleanup/deletion of append-only evidence.
describe("Agent1 source119 isolated committed acceptance", () => {
  let database: DatabaseService;
  beforeAll(async () => {
    const target = loadAgent1Target(process.env, resolve(process.cwd(), "../.."));
    database = new DatabaseService({ nodeEnv: "test", databaseUrl: target.url, port: 4000, webOrigin: "http://127.0.0.1:59750" } as RuntimeConfig);
    await verifyAgent1Database(database.prisma, target.manifest);
  });
  afterAll(async () => database?.onModuleDestroy());
  const services = (db = database) => {
    const authorization = new AuthorizationService(db), approvals = new ApprovalService(db);
    return { tasks: new TaskService(db, authorization, approvals), workflow: new ProjectWorkflowService(db, authorization, approvals), projects: new ProjectService(db) };
  };
  async function fixture(project = false) {
    const suffix = randomUUID();
    const rows = await database.prisma.$transaction(async tx => {
      const org = await tx.organization.findFirst() ?? await tx.organization.create({ data: { name: "Agent1 isolated acceptance" } });
      const owner = await tx.account.findFirst({ where: { kind: "OWNER", state: "ACTIVE" } }) ?? await tx.account.create({ data: { normalizedEmail: "agent1-isolated-owner@example.test", kind: "OWNER", state: "ACTIVE" } });
      const branch = await tx.branch.create({ data: { organizationId: org.id, name: `Agent1 ${suffix}` } });
      const team = await tx.team.create({ data: { organizationId: org.id, branchId: branch.id, name: `Delivery ${suffix}` } });
      const people = [];
      for (const key of ["lead", "worker", "helper"]) {
        const account = await tx.account.create({ data: { normalizedEmail: `agent1-${key}-${suffix}@example.test`, kind: "STAFF", state: "ACTIVE" } });
        const employee = await tx.employee.create({ data: { organizationId: org.id, accountId: account.id, homeBranchId: branch.id, homeTeamId: team.id, hiredAt: new Date("2026-01-01") } });
        await tx.employeePermissionOverride.create({ data: { organizationId: org.id, employeeId: employee.id, permissionKey: "project.view", effect: "ALLOW", scopeKind: "BRANCH", branchId: branch.id, reason: "Explicit isolated fixture project view" } });
        if (key === "lead") await tx.employeePermissionOverride.create({ data: { organizationId: org.id, employeeId: employee.id, permissionKey: "project.manage", effect: "ALLOW", scopeKind: "BRANCH", branchId: branch.id, reason: "Explicit isolated fixture lead eligibility" } });
        people.push({ account, employee });
      }
      return { org, owner, branch, people };
    });
    const actor: ProjectActor = { organizationId: rows.org.id, accountId: rows.owner.id, kind: AccountKind.OWNER };
    const staff = rows.people.map(person => ({ organizationId: rows.org.id, accountId: person.account.id, kind: AccountKind.STAFF }));
    const svc = services();
    const input = { title: `Receipt task ${suffix}`, type: "NON_PROJECT" as const, priority: "HIGH" as const, targetDate: "2026-10-20", ownerEmployeeId: rows.people[1]!.employee.id, reason: "Canonical isolated receipt acceptance", idempotencyKey: randomUUID() };
    let projectId: string | undefined;
    if (project) {
      const created = await svc.projects.create(actor, { branchId: rows.branch.id, title: `Receipt project ${suffix}`, deliveryType: "DESIGN", scopes: ["Delivery"], reason: "Create canonical isolated project fixture" });
      projectId = created.project.id;
      for (const person of rows.people) {
        const current = await database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
        await svc.workflow.assignment(actor, projectId, { employeeId: person.employee.id, expectedVersion: current.version, reason: "Explicit isolated participant assignment" });
      }
      let current = await database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
      await svc.workflow.lead(actor, projectId, { employeeId: rows.people[0]!.employee.id, expectedVersion: current.version, reason: "Appoint isolated accountable lead" });
      current = await database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
      await svc.workflow.status(actor, projectId, { toStatus: "ACTIVE", expectedVersion: current.version, reason: "Activate isolated project" });
    }
    return { ...rows, ...svc, actor, staff, input, projectId };
  }
  function heldServices() {
    let reached!: () => void, release!: () => void;
    const ready = new Promise<void>(done => { reached = done; }), hold = new Promise<void>(done => { release = done; });
    const proxy = new Proxy(database.prisma, { get(target, key) {
      if (key === "$transaction") return (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => database.prisma.$transaction(async tx => {
        const value = await work(tx); reached(); await hold; return value;
      }, { timeout: 20_000 });
      return Reflect.get(target, key, target);
    } });
    return { ...services({ prisma: proxy } as DatabaseService), ready, release };
  }
  async function receiptCount(actor: ProjectActor, key: string) { return database.prisma.taskCreationReceipt.count({ where: { organizationId: actor.organizationId, actorId: actor.accountId, key } }); }

  it("commits one task/receipt/collaborator/history/event across simultaneous identical requests and lost-result replay", async () => {
    const f = await fixture(), command = { ...f.input, collaborators: [{ employeeId: f.people[2]!.employee.id }] };
    const results = await Promise.all(Array.from({ length: 6 }, () => f.tasks.create(f.actor, command)));
    expect(new Set(results.map(row => row.id)).size).toBe(1);
    const task = results[0]!;
    expect((await f.tasks.create(f.actor, command)).id).toBe(task.id);
    expect(await receiptCount(f.actor, command.idempotencyKey)).toBe(1);
    expect(await database.prisma.taskCollaborator.count({ where: { taskId: task.id } })).toBe(1);
    expect(await database.prisma.taskStatusChange.count({ where: { taskId: task.id } })).toBe(1);
    expect(await database.prisma.auditEvent.count({ where: { subjectId: task.id, eventKey: "task.created" } })).toBe(1);
    expect(await database.prisma.domainEvent.count({ where: { subjectId: task.id, eventName: "task.created" } })).toBe(1);
  });
  it("serializes different payloads with one key and permits only the committed winner", async () => {
    const f = await fixture();
    const results = await Promise.allSettled([f.tasks.create(f.actor, f.input), f.tasks.create(f.actor, { ...f.input, title: "Competing changed details" })]);
    expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
    const failed = results.find(row => row.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason.getStatus()).toBe(409); expect(await receiptCount(f.actor, f.input.idempotencyKey)).toBe(1);
  });
  it("does not share retry identities across actors or permit foreign-organization replay", async () => {
    const f = await fixture(), command = { ...f.input, ownerEmployeeId: undefined };
    const a = await f.tasks.create(f.staff[1]!, command), b = await f.tasks.create(f.staff[2]!, command);
    expect(a.id).not.toBe(b.id); expect(await receiptCount(f.staff[1]!, command.idempotencyKey)).toBe(1); expect(await receiptCount(f.staff[2]!, command.idempotencyKey)).toBe(1);
    await expect(f.tasks.create({ ...f.staff[1]!, organizationId: randomUUID() }, command)).rejects.toThrow("Permission denied");
  });
  it("rolls back task/receipt/evidence together if a command fails after inserting the receipt", async () => {
    const f = await fixture();
    const proxy = new Proxy(database.prisma, { get(target, key) {
      if (key === "$transaction") return (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => database.prisma.$transaction(async tx => { await work(tx); throw new Error("Synthetic pre-commit failure"); });
      return Reflect.get(target, key, target);
    } });
    await expect(services({ prisma: proxy } as DatabaseService).tasks.create(f.actor, f.input)).rejects.toThrow("Synthetic pre-commit failure");
    expect(await receiptCount(f.actor, f.input.idempotencyKey)).toBe(0); expect(await database.prisma.task.count({ where: { title: f.input.title } })).toBe(0);
    await f.tasks.create(f.actor, f.input); expect(await receiptCount(f.actor, f.input.idempotencyKey)).toBe(1);
  });
  it("enforces receipt immutability at real SQL writes", async () => {
    const f = await fixture(); await f.tasks.create(f.actor, f.input);
    await expect(database.prisma.taskCreationReceipt.updateMany({ where: { key: f.input.idempotencyKey }, data: { payloadHash: "a".repeat(64) } })).rejects.toThrow("immutable");
    await expect(database.prisma.taskCreationReceipt.deleteMany({ where: { key: f.input.idempotencyKey } })).rejects.toThrow("immutable");
    expect(await receiptCount(f.actor, f.input.idempotencyKey)).toBe(1);
  });
  it("creates one child/link/parent increment across concurrent retries and recovers after the parent advanced", async () => {
    const f = await fixture(true), input = { ...f.input, projectId: f.projectId!, type: "PROJECT" as const };
    const parent = await f.tasks.create(f.actor, { ...input, idempotencyKey: randomUUID() });
    const child = { ...input, title: "One canonical child", idempotencyKey: randomUUID(), expectedParentVersion: parent.version };
    const results = await Promise.all(Array.from({ length: 4 }, () => f.tasks.createSubtask(f.actor, parent.id, child)));
    expect(new Set(results.map(row => row.task.id)).size).toBe(1); expect(await receiptCount(f.actor, child.idempotencyKey)).toBe(1);
    expect(await database.prisma.taskSubtaskLink.count({ where: { parentTaskId: parent.id } })).toBe(1);
    expect((await database.prisma.task.findUniqueOrThrow({ where: { id: parent.id } })).version).toBe(parent.version + 1);
    expect((await f.tasks.createSubtask(f.actor, parent.id, child)).task.id).toBe(results[0]!.task.id);
  });
  it("rechecks revoked project assignment before returning an existing keyed task", async () => {
    const f = await fixture(true), input = { ...f.input, projectId: f.projectId!, type: "PROJECT" as const, ownerEmployeeId: undefined };
    const original = await f.tasks.create(f.staff[1]!, input);
    const project = await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId! } });
    await f.workflow.revokeAssignment(f.actor, f.projectId!, f.people[1]!.employee.id, { expectedVersion: project.version, reason: "Revoke ordinary participant during receipt acceptance" });
    await expect(f.tasks.create(f.staff[1]!, input)).rejects.toThrow("Permission denied");
    expect((await database.prisma.taskCreationReceipt.findFirstOrThrow({ where: { key: input.idempotencyKey, actorId: f.staff[1]!.accountId } })).taskId).toBe(original.id);
  });
  it("serializes completion behind a committed child and refuses unfinished-child completion", async () => {
    const f = await fixture(true), input = { ...f.input, projectId: f.projectId!, type: "PROJECT" as const };
    const parent = await f.tasks.create(f.actor, { ...input, idempotencyKey: randomUUID() });
    await f.tasks.transition(f.actor, parent.id, { toState: "IN_PROGRESS", expectedVersion: parent.version, reason: "Start parent before committed child race" });
    const held = heldServices(); const insertion = held.tasks.createSubtask(f.actor, parent.id, { ...input, idempotencyKey: randomUUID(), expectedParentVersion: 2 });
    await Promise.race([held.ready, insertion]);
    const completion = f.tasks.transition(f.actor, parent.id, { toState: "COMPLETED", expectedVersion: 3, reason: "Finish races committed child" });
    const refusesCompletion = expect(completion).rejects.toThrow("Complete all subtasks");
    held.release(); await insertion; await refusesCompletion;
    expect((await database.prisma.task.findUniqueOrThrow({ where: { id: parent.id } })).status).toBe("IN_PROGRESS");
  });
  it("preserves a receipt across project cancellation and rejects new delivery creation", async () => {
    const f = await fixture(true), input = { ...f.input, projectId: f.projectId!, type: "PROJECT" as const };
    const held = heldServices(), creation = held.tasks.create(f.actor, input); await Promise.race([held.ready, creation]);
    const project = await database.prisma.project.findUniqueOrThrow({ where: { id: f.projectId! } });
    const cancellation = f.tasks.cancelProject(f.actor, f.projectId!, { expectedVersion: project.version, reason: "Cancel races committed delivery task" });
    held.release(); const [original] = await Promise.all([creation, cancellation]);
    expect((await f.tasks.create(f.actor, input)).id).toBe(original.id);
    expect((await database.prisma.task.findUniqueOrThrow({ where: { id: original.id } })).status).toBe("STOPPED_DUE_TO_PROJECT_CANCELLATION");
    await expect(f.tasks.create(f.actor, { ...input, idempotencyKey: randomUUID() })).rejects.toThrow("unavailable for new delivery work");
    expect(await receiptCount(f.actor, input.idempotencyKey)).toBe(1);
  });
});

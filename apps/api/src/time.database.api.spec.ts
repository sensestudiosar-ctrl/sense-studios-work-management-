import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { AccountKind, AccountState, PermissionEffect, PermissionScopeKind, ProjectDeliveryType, ProjectStatus, TaskPriority, TaskType } from "./generated/prisma/client.js";
import { ApprovalService } from "./approval.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { DatabaseService } from "./database.service.js";
import { DocumentService } from "./document.service.js";
import type { RuntimeConfig } from "./config.js";
import type { ProjectActor } from "./project.service.js";
import { TaskService } from "./task.service.js";
import { TimeService } from "./time.service.js";
import { ProjectService } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { TimeWorker } from "./time-worker.js";
import { IdentityService } from "./identity.service.js";
import { NotificationsService } from "./notifications.service.js";
import { OrganizationService } from "./organization.service.js";
import { Client } from "pg";

const databaseUrl = process.env.S16_DATABASE_URL;
const receiverUrl = process.env.TIME_ACCOUNTING_RECEIVER_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
const config: RuntimeConfig = {
  nodeEnv: "test", port: 4000, databaseUrl: databaseUrl ?? "postgresql://invalid:invalid@127.0.0.1/sense_s16_test",
  webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined
};

type Person = { accountId: string; employeeId: string; actor: ProjectActor };
type Fixture = { organizationId: string; branchId: string; teamId: string; manager: Person; employee: Person; outsider: Person; clientActor: ProjectActor; owner: ProjectActor; time: TimeService; authorization: AuthorizationService; tasks: TaskService };
const timeData = (workNote: string, overrides: Record<string, unknown> = {}) => ({
  date: "2026-10-01", durationSeconds: 1800, workNote, location: "REMOTE" as const,
  billable: false, activityLabel: "Studio administration", projectId: null, taskId: null, stageId: null,
  startedAt: null, endedAt: null, ...overrides
});

databaseDescribe("S16 time PostgreSQL and service acceptance", () => {
  let database: DatabaseService;
  beforeAll(async () => {
    const parsed = new URL(databaseUrl!);
    const s16 = parsed.port === "56433" && parsed.pathname.endsWith("_test");
    const s25 = process.env.S25_E2E_ENABLED === "1" && ["localhost", "127.0.0.1"].includes(parsed.hostname) && parsed.port === "57433" && /^\/sense_s16_s25_[a-z0-9_]+_test$/.test(parsed.pathname);
    const s26 = process.env.S26_E2E_ENABLED === "1" && ["localhost", "127.0.0.1"].includes(parsed.hostname) && parsed.port === "57433" && /^\/sense_s16_s26_[a-z0-9_]+_test$/.test(parsed.pathname);
    const s27 = process.env.S27_E2E_ENABLED === "1" && ["localhost", "127.0.0.1"].includes(parsed.hostname) && parsed.port === "58440" && /^\/sense_s16_s27_[a-z0-9_]+_test$/.test(parsed.pathname);
    if (!/(?:localhost|127\.0\.0\.1)/.test(parsed.hostname) || (!s16 && !s25 && !s26 && !s27)) {
      throw new Error("Time API acceptance requires a dedicated local S16 or explicitly enabled exact S16/S25/S26/S27 _test database");
    }
    database = new DatabaseService(config);
    const rows = await database.prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!rows[0]?.name.endsWith("_test")) throw new Error("S16 API acceptance requires a dedicated test database");
  });
  afterAll(async () => database?.onModuleDestroy());

  async function fixture(): Promise<Fixture> {
    const prisma = database.prisma;
    const suffix = randomUUID();
    const organization = await prisma.organization.findFirst() ?? await prisma.organization.create({ data: { name: `S16 time ${suffix}` } });
    const branch = await prisma.branch.create({ data: { organizationId: organization.id, name: `S16 time ${suffix}` } });
    const team = await prisma.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `S16 time ${suffix}` } });
    const otherBranch = await prisma.branch.create({ data: { organizationId: organization.id, name: `S16 other ${suffix}` } });
    const otherTeam = await prisma.team.create({ data: { organizationId: organization.id, branchId: otherBranch.id, name: `S16 other ${suffix}` } });
    const makePerson = async (role: string, homeBranchId: string, homeTeamId: string, reportsToId?: string | null): Promise<Person> => {
      const account = await prisma.account.create({ data: { normalizedEmail: `s16-${role}-${suffix}@example.test`, kind: AccountKind.STAFF, state: AccountState.ACTIVE } });
      const employee = await prisma.employee.create({ data: { organizationId: organization.id, accountId: account.id, homeBranchId, homeTeamId, reportsToId: reportsToId ?? null, hiredAt: new Date("2026-01-01T00:00:00.000Z") } });
      return { accountId: account.id, employeeId: employee.id, actor: { accountId: account.id, organizationId: organization.id, kind: AccountKind.STAFF } };
    };
    const manager = await makePerson("manager", branch.id, team.id);
    const employee = await makePerson("employee", branch.id, team.id, manager.employeeId);
    const outsider = await makePerson("outsider", otherBranch.id, otherTeam.id);
    const client = await prisma.account.create({ data: { normalizedEmail: `s16-client-${suffix}@example.test`, kind: AccountKind.CLIENT, state: AccountState.ACTIVE } });
    const ownerAccount = await prisma.account.findFirst({ where: { kind: AccountKind.OWNER, state: AccountState.ACTIVE } }) ?? await prisma.account.create({ data: { normalizedEmail: `s16-owner-${suffix}@example.test`, kind: AccountKind.OWNER, state: AccountState.ACTIVE } });
    await prisma.employeePermissionOverride.create({ data: { organizationId: organization.id, employeeId: manager.employeeId, permissionKey: "time.manage", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.TEAM, branchId: branch.id, teamId: team.id, reason: "S16 scoped time manager fixture" } });
    const owner: ProjectActor = { accountId: ownerAccount.id, organizationId: organization.id, kind: AccountKind.OWNER };
    const clientActor: ProjectActor = { accountId: client.id, organizationId: organization.id, kind: AccountKind.CLIENT };
    const authorization = new AuthorizationService(database);
    const tasks = new TaskService(database, authorization);
    const documents = new DocumentService(database, authorization, config);
    const time = new TimeService(database, authorization, tasks, documents);
    return { organizationId: organization.id, branchId: branch.id, teamId: team.id, manager, employee, outsider, clientActor, owner, time, authorization, tasks };
  }

  it("persists pause/resume/stop segments, excludes paused time and blocks concurrent employee timers", async () => {
    const f = await fixture();
    const commandId = randomUUID();
    const startedAt = Date.now();
    const startInput = { commandId, ...timeData("Timer segment acceptance") };
    const contenders = [startInput, { ...startInput, commandId: randomUUID(), workNote: "Concurrent contender B" }];
    const concurrent = await Promise.allSettled(contenders.map((input) => f.time.start(f.employee.actor, input)));
    const accepted = concurrent.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof f.time.start>>> => result.status === "fulfilled");
    expect(accepted).toHaveLength(1);
    const started = accepted[0]!.value;
    const winningInput = contenders[concurrent.findIndex((result) => result.status === "fulfilled")]!;
    await expect(f.time.start(f.employee.actor, winningInput)).resolves.toEqual(started);
    expect(await database.prisma.timeTimer.count({ where: { employeeId: f.employee.employeeId, state: { in: ["RUNNING", "PAUSED"] } } })).toBe(1);

    await expect(database.prisma.$executeRaw`UPDATE time_timers SET "startedAt"="startedAt" - interval '1 day' WHERE id=${started.id}::uuid`).rejects.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const paused = await f.time.timerCommand(f.employee.actor, started.id, "pause", { commandId: randomUUID(), expectedVersion: 1, reason: "Pause for interruption" });
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const resumed = await f.time.timerCommand(f.employee.actor, started.id, "resume", { commandId: randomUUID(), expectedVersion: paused.version, reason: "Resume active work" });
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const stopped = await f.time.timerCommand(f.employee.actor, started.id, "stop", { commandId: randomUUID(), expectedVersion: resumed.version, reason: "Stop completed work" });
    expect(stopped.state).toBe("STOPPED");
    const timer = await database.prisma.timeTimer.findUniqueOrThrow({ where: { id: started.id } });
    const entry = await database.prisma.timeEntry.findUniqueOrThrow({ where: { id: stopped.entryId } });
    const version = await database.prisma.timeEntryVersion.findUniqueOrThrow({ where: { entryId_version: { entryId: entry.id, version: 1 } } });
    expect(timer).toMatchObject({ state: "STOPPED", version: 4, employeeId: f.employee.employeeId });
    expect(Number(timer.elapsedMs)).toBeLessThan(Date.now() - startedAt - 500);
    expect(version.data).toMatchObject({ workNote: "Timer segment acceptance", durationSeconds: expect.any(Number) });
    expect(await database.prisma.timeTransition.count({ where: { timerId: started.id } })).toBe(4);
    expect(await database.prisma.timeEntry.count({ where: { timerId: started.id } })).toBe(1);
    await expect(database.prisma.$executeRaw`UPDATE time_entries SET "createdAt"="createdAt" + interval '1 day' WHERE id=${entry.id}::uuid`).rejects.toThrow();
    await expect(database.prisma.$executeRaw`UPDATE time_entry_versions SET data=data || '{"workNote":"forged"}'::jsonb WHERE "entryId"=${entry.id}::uuid AND version=1`).rejects.toThrow();
    await expect(database.prisma.$executeRaw`DELETE FROM time_transitions WHERE "timerId"=${started.id}::uuid AND version=2`).rejects.toThrow();
    expect(await database.prisma.timeEntryVersion.findUniqueOrThrow({ where: { entryId_version: { entryId: entry.id, version: 1 } } })).toMatchObject({ data: expect.objectContaining({ workNote: "Timer segment acceptance" }) });
  // This real-clock test deliberately waits 3.3 seconds, in addition to fixture and transactional work.
  }, 15_000);

  it("pauses project timers on actual hold and cancellation, preserves elapsed time and blocks resume", async () => {
    const f = await fixture();
    const projects = new ProjectService(database);
    const workflows = new ProjectWorkflowService(database, f.authorization, new ApprovalService(database));
    const projectResult = await projects.create(f.owner, { branchId: f.branchId, title: `S16 lifecycle ${randomUUID()}`, deliveryType: ProjectDeliveryType.DESIGN, scopes: ["Architecture"], reason: "Create project lifecycle timer fixture" });
    const projectId = projectResult.project.id;
    for (const employeeId of [f.employee.employeeId, f.manager.employeeId]) await database.prisma.employeePermissionOverride.create({ data: { organizationId: f.organizationId, employeeId, permissionKey: "project.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: f.branchId, reason: "S16 assigned project lifecycle access" } });
    let current = await database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    await workflows.assignment(f.owner, projectId, { employeeId: f.employee.employeeId, expectedVersion: current.version, reason: "Assign timer employee to project" });
    current = await database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    await workflows.assignment(f.owner, projectId, { employeeId: f.manager.employeeId, expectedVersion: current.version, reason: "Assign eligible Project Lead to project" });
    await database.prisma.employeePermissionOverride.create({ data: { organizationId: f.organizationId, employeeId: f.manager.employeeId, permissionKey: "project.manage", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: f.branchId, reason: "S16 lifecycle Project Lead grant" } });
    current = await database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    await workflows.lead(f.owner, projectId, { employeeId: f.manager.employeeId, expectedVersion: current.version, reason: "Assign eligible Project Lead" });
    current = await database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    await workflows.status(f.owner, projectId, { toStatus: ProjectStatus.ACTIVE, expectedVersion: current.version, reason: "Activate time fixture project" });
    const historicalTask = await f.tasks.create(f.owner, { title: "S16 historical task correction", type: TaskType.PROJECT, priority: TaskPriority.MEDIUM, targetDate: "2026-10-20", reason: "Create task for historical correction", projectId, ownerEmployeeId: f.employee.employeeId });
    const historicalEntry = await f.time.manual(f.employee.actor, { commandId: randomUUID(), ...timeData("Historical work before reassignment", { projectId, taskId: historicalTask.id, activityLabel: "Architecture" }) });
    await f.tasks.reassign(f.owner, historicalTask.id, { newOwnerEmployeeId: f.manager.employeeId, expectedVersion: historicalTask.version, reason: "Reassign task after work was recorded" });
    const historicalCorrection = await f.time.correct(f.owner, historicalEntry.id, { commandId: randomUUID(), expectedVersion: 1, reason: "Correct historical note on retained task", ...timeData("Corrected historical work", { projectId, taskId: historicalTask.id, activityLabel: "Architecture" }) });
    expect(historicalCorrection.version).toBe(2);
    expect(await database.prisma.timeEntry.findUniqueOrThrow({ where: { id: historicalEntry.id } })).toMatchObject({ version: 2, taskId: historicalTask.id, projectId });
    expect((await database.prisma.timeEntryVersion.findUniqueOrThrow({ where: { entryId_version: { entryId: historicalEntry.id, version: 2 } } })).data).toMatchObject({ workNote: "Corrected historical work", taskId: historicalTask.id, projectId });
    const first = await f.time.start(f.employee.actor, { commandId: randomUUID(), ...timeData("Project hold timer", { projectId, activityLabel: "Architecture" }) });
    await workflows.status(f.owner, projectId, { toStatus: ProjectStatus.ON_HOLD, expectedVersion: (await database.prisma.project.findUniqueOrThrow({ where: { id: projectId } })).version, reason: "Put project on hold" });
    const paused = await database.prisma.timeTimer.findUniqueOrThrow({ where: { id: first.id } });
    expect(paused.state).toBe("PAUSED");
    const heldElapsed = paused.elapsedMs;
    await expect(f.time.timerCommand(f.employee.actor, first.id, "resume", { commandId: randomUUID(), expectedVersion: paused.version, reason: "Resume while project is held" })).rejects.toMatchObject({ status: 409 });
    const heldStop = await f.time.timerCommand(f.employee.actor, first.id, "stop", { commandId: randomUUID(), expectedVersion: paused.version, reason: "Close timer after hold" });
    expect((await database.prisma.timeEntry.findUniqueOrThrow({ where: { timerId: first.id } })).timerId).toBe(first.id);
    expect((await database.prisma.timeTimer.findUniqueOrThrow({ where: { id: first.id } })).elapsedMs).toBe(heldElapsed);
    expect(heldStop.state).toBe("STOPPED");

    current = await database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    await workflows.status(f.owner, projectId, { toStatus: ProjectStatus.ACTIVE, expectedVersion: current.version, reason: "Resume project before cancellation" });
    const second = await f.time.start(f.employee.actor, { commandId: randomUUID(), ...timeData("Project cancellation timer", { projectId, activityLabel: "Architecture" }) });
    current = await database.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    await f.tasks.cancelProject(f.owner, projectId, { expectedVersion: current.version, reason: "Cancel project and interrupt timer" });
    const cancelled = await database.prisma.timeTimer.findUniqueOrThrow({ where: { id: second.id } });
    expect(cancelled.state).toBe("PAUSED");
    const cancelledElapsed = cancelled.elapsedMs;
    await expect(f.time.timerCommand(f.employee.actor, second.id, "resume", { commandId: randomUUID(), expectedVersion: cancelled.version, reason: "Resume a cancelled project timer" })).rejects.toMatchObject({ status: 409 });
    await f.time.timerCommand(f.employee.actor, second.id, "stop", { commandId: randomUUID(), expectedVersion: cancelled.version, reason: "Stop after project cancellation" });
    expect((await database.prisma.timeTimer.findUniqueOrThrow({ where: { id: second.id } })).elapsedMs).toBe(cancelledElapsed);
  });

  it("pauses the active employee timer in the actual Owner exit transaction", async () => {
    const f = await fixture();
    const timer = await f.time.start(f.employee.actor, { commandId: randomUUID(), ...timeData("Employee exit timer") });
    const projects = new ProjectWorkflowService(database, f.authorization, new ApprovalService(database));
    const organization = new OrganizationService(database, new IdentityService(database, config), f.authorization, projects, f.tasks, new NotificationsService(database));
    await organization.finalizeEmployeeExit(f.owner.accountId, f.employee.employeeId, "Complete employee exit and pause timer");
    const afterExit = await database.prisma.timeTimer.findUniqueOrThrow({ where: { id: timer.id } });
    expect(afterExit.state).toBe("PAUSED");
    const elapsed = afterExit.elapsedMs;
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect((await database.prisma.timeTimer.findUniqueOrThrow({ where: { id: timer.id } })).elapsedMs).toBe(elapsed);
    await expect(f.time.timerCommand(f.employee.actor, timer.id, "resume", { commandId: randomUUID(), expectedVersion: afterExit.version, reason: "Exited employee cannot resume" })).rejects.toMatchObject({ status: 403 });
  });

  it("rechecks an authenticated session after a command lock wait and rolls back the write", async () => {
    const f = await fixture();
    const commandId = randomUUID();
    const sessionId = randomUUID();
    await database.prisma.session.create({ data: { id: sessionId, accountId: f.employee.accountId, tokenHash: randomUUID(), csrfTokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60_000) } });
    const admin = new Client({ connectionString: process.env.S16_ADMIN_DATABASE_URL ?? databaseUrl });
    const beforeEntries = await database.prisma.timeEntry.count({ where: { employeeId: f.employee.employeeId } });
    await admin.connect();
    let pending: Promise<unknown> | undefined;
    try {
      await admin.query("BEGIN");
      const lockKey = `${f.employee.accountId}${commandId}`;
      await admin.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [lockKey]);
      const lockHash = BigInt((await admin.query<{ hash: string }>("SELECT hashtextextended($1,0)::text AS hash", [lockKey])).rows[0]!.hash);
      const lockClassId = (lockHash >> 32n) & 0xffffffffn;
      const lockObjectId = lockHash & 0xffffffffn;
      const actor = { ...f.employee.actor, sessionId } as ProjectActor & { sessionId: string };
      pending = f.time.manual(actor, { commandId, ...timeData("Session expires during command lock wait") });
      void pending.catch(() => undefined);
      let blocked = false;
      for (let attempt = 0; attempt < 200; attempt += 1) {
        const waiting = await admin.query<{ count: string }>("SELECT count(*)::text AS count FROM pg_locks WHERE locktype='advisory' AND classid=$1::oid AND objid=$2::oid AND objsubid=1 AND granted=false", [String(lockClassId), String(lockObjectId)]);
        if (Number(waiting.rows[0]?.count ?? 0) > 0) { blocked = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      expect(blocked).toBe(true);
      await database.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
      await admin.query("COMMIT");
      await expect(pending).rejects.toMatchObject({ status: 403 });
      expect(await database.prisma.timeEntry.count({ where: { employeeId: f.employee.employeeId } })).toBe(beforeEntries);
      expect(await database.prisma.timeCommandReceipt.count({ where: { actorId: f.employee.accountId, commandId } })).toBe(0);
    } finally {
      await admin.query("ROLLBACK").catch(() => undefined);
      await pending?.catch(() => undefined);
      await admin.end();
    }
  });

  it("rolls back a manual entry and command receipt when the audit insert fails", async () => {
    const f = await fixture();
    const base = database.prisma;
    const failingPrisma = new Proxy(base, { get(target, key) {
      if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>, options?: unknown) => target.$transaction((tx) => callback(new Proxy(tx, { get(txTarget, txKey) {
        if (txKey === "auditEvent") return new Proxy(txTarget.auditEvent, { get(delegate, method) { if (method === "create") return async () => { throw new Error("Injected S16 audit failure"); }; return Reflect.get(delegate, method, delegate); } });
        return Reflect.get(txTarget, txKey, txTarget);
      } }) as unknown), options as never);
      return Reflect.get(target, key, target);
    } });
    const brokenDb = { prisma: failingPrisma } as unknown as DatabaseService;
    const brokenTime = new TimeService(brokenDb, new AuthorizationService(brokenDb), new TaskService(brokenDb, f.authorization), new DocumentService(brokenDb, f.authorization, config));
    const commandId = randomUUID();
    const beforeEntries = await database.prisma.timeEntry.count({ where: { employeeId: f.employee.employeeId } });
    await expect(brokenTime.manual(f.employee.actor, { commandId, ...timeData("Manual audit rollback") })).rejects.toThrow("Injected S16 audit failure");
    expect(await database.prisma.timeEntry.count({ where: { employeeId: f.employee.employeeId } })).toBe(beforeEntries);
    expect(await database.prisma.timeCommandReceipt.count({ where: { actorId: f.employee.accountId, commandId } })).toBe(0);
  });

  it("preserves manual history, scopes managers, requires reapproval after locked correction, and retries one immutable export", async () => {
    if (!receiverUrl || !process.env.S16_TEST_RECEIVER_TOKEN) throw new Error("S16 API acceptance requires the configured loopback accounting test receiver");
    const f = await fixture();
    const countBeforeInvalidEvidence = await database.prisma.timeEntry.count({ where: { employeeId: f.employee.employeeId } });
    await expect(f.time.manual(f.employee.actor, { commandId: randomUUID(), ...timeData("Reject inaccessible evidence", { evidenceFileId: randomUUID() }) })).rejects.toThrow();
    expect(await database.prisma.timeEntry.count({ where: { employeeId: f.employee.employeeId } })).toBe(countBeforeInvalidEvidence);
    const manual = await f.time.manual(f.employee.actor, { commandId: randomUUID(), ...timeData("Original entry") });
    await expect(f.time.manual(f.outsider.actor, { commandId: randomUUID(), employeeId: f.employee.employeeId, ...timeData("Cross-branch attempt") })).rejects.toMatchObject({ status: 403 });
    await expect(f.time.list(f.outsider.actor, "managed")).resolves.toMatchObject({ entries: [] });
    await expect(f.time.list(f.clientActor, "mine")).rejects.toMatchObject({ status: 403 });
    await expect(f.time.approve(f.employee.actor, manual.id, { commandId: randomUUID(), expectedVersion: 1, reason: "Own approval is not allowed" })).rejects.toMatchObject({ status: 403 });

    const approveInput = { commandId: randomUUID(), expectedVersion: 1, reason: "Manager approves original entry" };
    const approved = await f.time.approve(f.manager.actor, manual.id, approveInput);
    await expect(f.time.approve(f.manager.actor, manual.id, approveInput)).resolves.toEqual(approved);
    await expect(f.time.correct(f.employee.actor, manual.id, { commandId: randomUUID(), expectedVersion: 1, reason: "Employee cannot edit locked entry", ...timeData("Own locked edit") })).rejects.toMatchObject({ status: 403 });
    const corrected = await f.time.correct(f.manager.actor, manual.id, { commandId: randomUUID(), expectedVersion: 1, reason: "Correct recorded duration with approved reason", ...timeData("Corrected entry", { durationSeconds: 2100 }) });
    expect(corrected.version).toBe(2);
    await expect(f.time.correct(f.manager.actor, manual.id, { commandId: randomUUID(), expectedVersion: 1, reason: "Stale correction attempt", ...timeData("Stale entry") })).rejects.toMatchObject({ status: 409 });
    const afterCorrection = await f.time.list(f.manager.actor, "managed");
    expect(afterCorrection.entries.find((entry) => entry.id === manual.id)).toMatchObject({ version: 2, locked: true, approved: false, workNote: "Corrected entry", versions: [expect.objectContaining({ version: 1 }), expect.objectContaining({ version: 2, reason: "Correct recorded duration with approved reason", editorId: f.manager.accountId })] });
    await f.time.approve(f.manager.actor, manual.id, { commandId: randomUUID(), expectedVersion: 2, reason: "Approve corrected version" });

    const receiverBefore = await (await fetch(`${receiverUrl.replace(/\/$/, "")}/__test/state`, { headers: { "x-s16-test-token": process.env.S16_TEST_RECEIVER_TOKEN! } })).json() as { acceptedRecordCount: number; deliveryCount: number; records: Array<{ recordId: string }> };
    expect(receiverBefore.records.some((record) => record.recordId === manual.id)).toBe(false);
    const failMode = await fetch(`${receiverUrl.replace(/\/$/, "")}/__test/failure`, { method: "POST", headers: { "Content-Type": "application/json", "x-s16-test-token": process.env.S16_TEST_RECEIVER_TOKEN! }, body: JSON.stringify({ recordId: manual.id, mode: "ACCEPT_THEN_LOSE_ACK" }) });
    expect(failMode.status).toBe(204);
    const firstDelivery = await f.time.export(f.owner, manual.id, { commandId: randomUUID(), expectedVersion: 2, reason: "Owner transfers approved time" });
    expect(firstDelivery.state).toBe("FAILED");
    await expect(database.prisma.$executeRaw`UPDATE time_accounting_deliveries SET state='DELIVERED', "deliveredAt"=CURRENT_TIMESTAMP WHERE id=${firstDelivery.deliveryId}::uuid`).rejects.toThrow();
    const receiverState = async () => await (await fetch(`${receiverUrl.replace(/\/$/, "")}/__test/state`, { headers: { "x-s16-test-token": process.env.S16_TEST_RECEIVER_TOKEN! } })).json() as { acceptedRecordCount: number; deliveryCount: number; records: Array<{ recordId: string; revision: number; payload: Record<string, unknown> }>; revisions: Array<{ recordId: string; revision: number; payloadHash: string }> };
    let received = await receiverState();
    expect(received.acceptedRecordCount).toBe(receiverBefore.acceptedRecordCount + 1);
    expect(received.deliveryCount).toBe(receiverBefore.deliveryCount + 1);
    expect(received.records).toEqual(expect.arrayContaining([expect.objectContaining({ recordId: manual.id, revision: 2, payload: expect.objectContaining({ recordId: manual.id, revision: 2, workNote: "Corrected entry" }) })]));
    await new TimeWorker(database, f.time).tick();
    await expect(f.time.dispatch(f.owner, firstDelivery.deliveryId)).resolves.toMatchObject({ state: "DELIVERED" });
    expect(await database.prisma.timeAccountingAttempt.count({ where: { deliveryId: firstDelivery.deliveryId } })).toBe(2);
    const repeated = await f.time.export(f.owner, manual.id, { commandId: randomUUID(), expectedVersion: 2, reason: "Replay already delivered version" });
    expect(repeated).toMatchObject({ deliveryId: firstDelivery.deliveryId, state: "DELIVERED" });
    received = await receiverState();
    expect(received.deliveryCount).toBe(receiverBefore.deliveryCount + 1);
    const delivery = await database.prisma.timeAccountingDelivery.findUniqueOrThrow({ where: { id: firstDelivery.deliveryId } });
    expect(delivery).toMatchObject({ state: "DELIVERED", entryId: manual.id, revision: 2, attempts: 2 });
    expect(delivery.payloadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(await database.prisma.auditEvent.count({ where: { subjectId: manual.id, eventKey: { in: ["time.logged", "time.changed", "time.approved"] } } })).toBeGreaterThanOrEqual(4);
  });
});

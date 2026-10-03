import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { TrainingService } from "./training.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { TaskService } from "./task.service.js";
import { DatabaseService } from "./database.service.js";
import { PermissionEffect, PermissionScopeKind, TaskPriority, TaskType } from "./generated/prisma/client.js";
import { learningCommand as command, learningDatabase, learningFixture, learningFailingDatabase } from "./s18-test-fixture.js";
const databaseDescribe = process.env.S18_DATABASE_URL ? describe : describe.skip;
const content = (practicalRequired = false) => ({ blocks: [{ type: "TEXT", text: "Demonstrate measured construction detail" }], assessment: { criteria: "Reviewer verifies correct detail and explains the method", practicalRequired, minimumCorrect: 1, quiz: [{ id: "q1", prompt: "Which detail meets the standard?", options: [{ id: "accepted", label: "Measured detail" }, { id: "rejected", label: "Unmeasured detail" }], correctOptionIds: ["accepted"] }] } });
databaseDescribe("S18 Training real PostgreSQL acceptance", () => {
 let database: DatabaseService;
 beforeAll(() => { database = learningDatabase(); });
 afterAll(async () => database?.onModuleDestroy());
 const fixture = () => learningFixture(database);
 async function module(f: Awaited<ReturnType<typeof fixture>>, practicalRequired = false) {
  const record = await f.library.create(f.manager.actor, { kind: "MODULE", audience: "TEAM", branchId: f.branch.id, teamId: f.team.id, title: `Authored training ${randomUUID()}`, category: "Drawing standards", content: content(practicalRequired), acknowledgementRequired: false, ...command() });
  await f.library.activateModule(f.manager.actor, record.record.id, { expectedVersion: 1, ...command() }); return record;
 }
 async function assignment(f: Awaited<ReturnType<typeof fixture>>, moduleVersionId: string) {
  return f.training.assign(f.manager.actor, { employeeId: f.employee.employeeId, moduleVersionId, reviewerAccountId: f.manager.actor.accountId, recommendationReason: "Human identifies a development gap", ...command() });
 }
 it("persists authored quiz, independent named review and dated effectiveness without automatic skill upgrade", async () => {
  const f = await fixture(), m = await module(f), row = await assignment(f, m.version.id);
  const trainee = await f.training.detail(f.employee.actor, row.id);
  expect(JSON.stringify(trainee)).not.toContain("correctOptionIds");
  expect(trainee.module.content).toMatchObject({ assessment: { minimumCorrect: 1 } });
  await f.training.submit(f.employee.actor, row.id, { expectedVersion: 1, answers: [{ questionId: "q1", optionIds: ["accepted"] }], note: "Trainee describes measured method", ...command() });
  expect(await f.db.skillRating.count({ where: { employeeId: f.employee.employeeId } })).toBe(0);
  await expect(f.training.assess(f.employee.actor, row.id, { expectedVersion: 2, outcome: "PASSED", observation: "Cannot assess own evidence", ...command() })).rejects.toMatchObject({ status: 403 });
  await f.training.assess(f.manager.actor, row.id, { expectedVersion: 2, outcome: "PASSED", observation: "Verified authored criteria with measured detail", ...command() });
  await f.training.effectiveness(f.manager.actor, row.id, { date: "2026-01-01", observation: "Applied method correctly on later work", ...command() });
  const detail = await f.training.detail(f.employee.actor, row.id);
  expect(detail.assignment).toMatchObject({ state: "COMPLETED", version: 3 });
  expect(detail.attempts.map(a => a.kind)).toEqual(["SUBMISSION", "ASSESSMENT", "EFFECTIVENESS"]);
  expect(await f.db.skillRating.count({ where: { employeeId: f.employee.employeeId } })).toBe(0);
  const request = await f.skills.request(f.employee.actor, { employeeId: f.employee.employeeId, skillId: f.skill.id, requestedLevel: "INTERMEDIATE", expectedRatingVersion: 0, trainingSourceId: row.id, approverAccountId: f.manager.actor.accountId, ...command() });
  expect(await f.db.skillRating.count({ where: { employeeId: f.employee.employeeId } })).toBe(0);
  await f.skills.decide(f.manager.actor, request.id, { outcome: "APPROVED", ...command() });
  expect(await f.db.skillRatingChange.findFirst({ where: { trainingSourceId: row.id, approvalRequestId: request.approvalRequestId } })).toMatchObject({ trainingSourceId: row.id, toLevel: "INTERMEDIATE" });
 });
 it("rejects failed authored threshold, retains changes-required attempts, then permits reasoned resubmission", async () => {
  const f = await fixture(), m = await module(f), row = await assignment(f, m.version.id);
  await f.training.submit(f.employee.actor, row.id, { expectedVersion: 1, answers: [{ questionId: "q1", optionIds: ["rejected"] }], note: "First attempt awaits feedback", ...command() });
  await expect(f.training.assess(f.manager.actor, row.id, { expectedVersion: 2, outcome: "PASSED", observation: "Threshold must not be bypassed", ...command() })).rejects.toMatchObject({ status: 409 });
  expect(await f.db.trainingAttempt.count({ where: { assignmentId: row.id } })).toBe(1);
  await f.training.assess(f.manager.actor, row.id, { expectedVersion: 2, outcome: "CHANGES_REQUIRED", observation: "Review the authored measurement method", ...command() });
  await f.training.submit(f.employee.actor, row.id, { expectedVersion: 3, answers: [{ questionId: "q1", optionIds: ["accepted"] }], note: "Corrected method after feedback", ...command() });
  await f.training.assess(f.manager.actor, row.id, { expectedVersion: 4, outcome: "PASSED", observation: "Corrected evidence satisfies authored criteria", ...command() });
  expect((await f.training.detail(f.employee.actor, row.id)).attempts).toHaveLength(4);
  await expect(f.training.submit(f.employee.actor, row.id, { expectedVersion: 5, answers: [], note: "Cannot overwrite completion", ...command() })).rejects.toMatchObject({ status: 409 });
 });
 it("requires exact trainee-owned completed practical evidence before reviewer completion", async () => {
  const f = await fixture(), m = await module(f, true);
  const task = await f.tasks.create(f.owner, { title: `Practical ${randomUUID()}`, type: TaskType.TRAINING_PRACTICAL, priority: TaskPriority.MEDIUM, targetDate: "2026-12-01", ownerEmployeeId: f.employee.employeeId, reason: "Human assigns practical evidence" });
  const row = await f.training.assign(f.manager.actor, { employeeId: f.employee.employeeId, moduleVersionId: m.version.id, reviewerAccountId: f.manager.actor.accountId, practicalTaskId: task.id, ...command() });
  await expect(f.training.submit(f.employee.actor, row.id, { expectedVersion: 1, answers: [{ questionId: "q1", optionIds: ["accepted"] }], note: "Practical remains incomplete", ...command() })).rejects.toMatchObject({ status: 409 });
  await f.tasks.transition(f.employee.actor, task.id, { toState: "IN_PROGRESS", expectedVersion: task.version, reason: "Start explicit practical exercise" });
  await f.tasks.transition(f.employee.actor, task.id, { toState: "COMPLETED", expectedVersion: task.version + 1, reason: "Complete practical exercise evidence" });
  await f.training.submit(f.employee.actor, row.id, { expectedVersion: 1, answers: [{ questionId: "q1", optionIds: ["accepted"] }], note: "Completed practical and quiz evidence", ...command() });
  await f.training.assess(f.manager.actor, row.id, { expectedVersion: 2, outcome: "PASSED", observation: "Reviewer verifies exact practical evidence", ...command() });
  expect((await f.training.detail(f.employee.actor, row.id)).assignment.state).toBe("COMPLETED");
 });
 it("retains exact activated version after later activation and denies stale or competing transitions", async () => {
  const f = await fixture(), m = await module(f), row = await assignment(f, m.version.id);
  const version2 = await f.library.appendVersion(f.manager.actor, m.record.id, { expectedVersion: 1, content: content(), acknowledgementRequired: false, ...command() });
  await f.library.activateModule(f.manager.actor, m.record.id, { expectedVersion: 2, ...command() });
  expect((await f.training.detail(f.employee.actor, row.id)).module.id).toBe(m.version.id);
  expect(version2.versionId).not.toBe(m.version.id);
  const results = await Promise.allSettled([1, 2].map(() => f.training.submit(f.employee.actor, row.id, { expectedVersion: 1, answers: [{ questionId: "q1", optionIds: ["accepted"] }], note: "Competing exact submissions", ...command() })));
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(await f.db.trainingAttempt.count({ where: { assignmentId: row.id } })).toBe(1);
  await expect(f.training.assess(f.manager.actor, row.id, { expectedVersion: 1, outcome: "PASSED", observation: "Stale version cannot approve", ...command() })).rejects.toMatchObject({ status: 409 });
  expect(await f.db.trainingAttempt.count({ where: { assignmentId: row.id } })).toBe(1);
 });
 it("denies guessed Branch IDs, trainee review, uncompleted Skill source and revoked current reviewer scope", async () => {
  const f = await fixture(), m = await module(f), row = await assignment(f, m.version.id);
  await expect(f.training.detail(f.outsider.actor, row.id)).rejects.toMatchObject({ status: 403 });
  await expect(f.training.assign(f.manager.actor, { employeeId: f.outsider.employeeId, moduleVersionId: m.version.id, reviewerAccountId: f.owner.accountId, ...command() })).rejects.toMatchObject({ status: 403 });
  await expect(f.training.assign(f.manager.actor, { employeeId: f.employee.employeeId, moduleVersionId: m.version.id, reviewerAccountId: f.employee.actor.accountId, ...command() })).rejects.toMatchObject({ status: 403 });
  await expect(f.skills.request(f.employee.actor, { employeeId: f.employee.employeeId, skillId: f.skill.id, requestedLevel: "EXPERT", expectedRatingVersion: 0, trainingSourceId: row.id, approverAccountId: f.manager.actor.accountId, ...command() })).rejects.toMatchObject({ status: 400 });
  await f.training.submit(f.employee.actor, row.id, { expectedVersion: 1, answers: [{ questionId: "q1", optionIds: ["accepted"] }], note: "Submit before reviewer scope revocation", ...command() });
  const grant = f.grants.find(g => g.permissionKey === "training.manage")!;
  await f.db.employeePermissionOverride.update({ where: { id: grant.id }, data: { revokedAt: new Date() } });
  await expect(f.training.assess(f.manager.actor, row.id, { expectedVersion: 2, outcome: "PASSED", observation: "Revoked reviewer cannot assess", ...command() })).rejects.toMatchObject({ status: 403 });
  expect((await f.db.trainingAssignment.findUnique({ where: { id: row.id } }))?.state).toBe("SUBMITTED");
 });
 it("validates Branch-only modules and requires current access even for exact command replay", async () => {
  const f = await fixture();
  for (const person of [f.manager, f.employee]) await f.db.employeePermissionOverride.create({ data: { employeeId: person.employeeId, organizationId: f.organizationId, permissionKey: "library.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.BRANCH, branchId: f.branch.id, reason: "Explicit Branch module reader" } });
  const m = await f.library.create(f.owner, { kind: "MODULE", audience: "BRANCH", branchId: f.branch.id, title: `Branch module ${randomUUID()}`, category: "Drawing standards", content: content(), acknowledgementRequired: false, ...command() });
  await f.library.activateModule(f.owner, m.record.id, { expectedVersion: 1, ...command() });
  const input = { employeeId: f.employee.employeeId, moduleVersionId: m.version.id, reviewerAccountId: f.manager.actor.accountId, ...command() };
  const row = await f.training.assign(f.manager.actor, input);
  expect(await f.training.assign(f.manager.actor, input)).toEqual(JSON.parse(JSON.stringify(row)));
  await expect(f.training.assign(f.manager.actor, { ...input, reason: "Different replay payload" })).rejects.toMatchObject({ status: 409 });
  const view = await f.db.employeePermissionOverride.findFirst({ where: { employeeId: f.employee.employeeId, permissionKey: "library.view", scopeKind: PermissionScopeKind.BRANCH, revokedAt: null } });
  await f.db.employeePermissionOverride.update({ where: { id: view!.id }, data: { revokedAt: new Date() } });
  await expect(f.training.assign(f.manager.actor, input)).rejects.toMatchObject({ status: 403 });
 });
 it("denies forged SQL assessment/head rewrites and completed history mutation", async () => {
  const f = await fixture(), m = await module(f), row = await assignment(f, m.version.id);
  await expect(f.db.trainingAssignment.update({ where: { id: row.id }, data: { state: "COMPLETED", version: 2 } })).rejects.toThrow();
  await expect(f.db.trainingAttempt.create({ data: { id: randomUUID(), assignmentId: row.id, organizationId: f.organizationId, kind: "ASSESSMENT", sequence: 1, payload: { assignmentVersion: 2, outcome: "PASSED", observation: "Forged completion evidence" }, actorId: f.employee.actor.accountId, reason: "Forge own review", eventId: randomUUID() } })).rejects.toThrow();
  const history = await f.db.trainingAssignmentChange.findFirst({ where: { assignmentId: row.id } });
  await expect(f.db.trainingAssignmentChange.update({ where: { id: history!.id }, data: { reason: "Rewrite prior reason" } })).rejects.toThrow();
  expect((await f.db.trainingAssignment.findUnique({ where: { id: row.id } }))?.state).toBe("ASSIGNED");
 });
 it("rolls back attempts, state, audit and receipt when exact change evidence fails", async () => {
  const f = await fixture(), m = await module(f), row = await assignment(f, m.version.id);
  const faulty = learningFailingDatabase(database, "trainingAssignmentChange"), authorization = new AuthorizationService(faulty), tasks = new TaskService(faulty, authorization, new ApprovalService(faulty));
  const training = new TrainingService(faulty, authorization, tasks), input = { expectedVersion: 1, answers: [{ questionId: "q1", optionIds: ["accepted"] }], note: "Atomic submitted evidence after retry", ...command() };
  const before = await f.db.auditEvent.count({ where: { subjectId: row.id } });
  await expect(training.submit(f.employee.actor, row.id, input)).rejects.toThrow("Injected canonical metadata failure");
  expect(await f.db.trainingAttempt.count({ where: { assignmentId: row.id } })).toBe(0);
  expect(await f.db.trainingAssignment.findUnique({ where: { id: row.id } })).toMatchObject({ state: "ASSIGNED", version: 1 });
  expect(await f.db.auditEvent.count({ where: { subjectId: row.id } })).toBe(before);
  expect(await f.db.learningReceipt.count({ where: { commandId: input.commandId } })).toBe(0);
  await f.training.submit(f.employee.actor, row.id, input);
  expect(await f.db.trainingAttempt.count({ where: { assignmentId: row.id } })).toBe(1);
  expect(await f.db.trainingAssignment.findUnique({ where: { id: row.id } })).toMatchObject({ state: "SUBMITTED", version: 2 });
 });
 it("denies invalid/future effectiveness and revoked sessions, preserves completed history", async () => {
  const f = await fixture(), m = await module(f), row = await assignment(f, m.version.id);
  await f.training.submit(f.employee.actor, row.id, { expectedVersion: 1, answers: [{ questionId: "q1", optionIds: ["accepted"] }], note: "Valid submitted evidence", ...command() });
  await f.training.assess(f.manager.actor, row.id, { expectedVersion: 2, outcome: "PASSED", observation: "Verified correct method", ...command() });
  await expect(f.training.effectiveness(f.owner, row.id, { date: "2026-02-30", observation: "Invalid calendar date", ...command() })).rejects.toMatchObject({ status: 400 });
  await expect(f.training.effectiveness(f.owner, row.id, { date: "2099-01-01", observation: "Future observation must not be invented", ...command() })).rejects.toMatchObject({ status: 400 });
  await f.db.session.update({ where: { id: f.manager.actor.sessionId }, data: { revokedAt: new Date() } });
  await expect(f.training.detail(f.manager.actor, row.id)).rejects.toMatchObject({ status: 403 });
  expect(await f.db.trainingAttempt.count({ where: { assignmentId: row.id } })).toBe(2);
 });
});
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { AccountKind, AccountState, PermissionEffect, PermissionScopeKind } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { SkillsService } from "./skills.service.js";
import type { ProjectActor } from "./project.service.js";

const databaseUrl = process.env.S18_DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
type Actor = ProjectActor & { sessionId: string };
const command = (reason: string) => ({ commandId: randomUUID(), reason });

databaseDescribe("S18 Skills real PostgreSQL acceptance", () => {
  let database: DatabaseService;
  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    const legacyS18 = url.port === "56433" && /^[a-z0-9_]+_test$/.test(url.pathname.slice(1));
    const s27S18 = process.env.S27_E2E_ENABLED === "1" && url.port === "58440" && /^\/sense_s18_s27_[a-z0-9_]+_test$/.test(url.pathname);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || (!legacyS18 && !s27S18)) throw new Error("S18 requires a dedicated local test target or the explicitly enabled exact S27 suite target");
    database = new DatabaseService({ nodeEnv: "test", port: 4218, databaseUrl: databaseUrl!, webOrigin: "http://localhost:5318", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined });
    const rows = await database.prisma.$queryRaw<Array<{ table: string | null }>>`SELECT to_regclass('skill_ratings')::text AS "table"`;
    if (!rows[0]?.table) throw new Error("Reviewed S18 migrations must be deployed first");
  });
  afterAll(async () => database?.onModuleDestroy());

  async function fixture() {
    const db = database.prisma, suffix = randomUUID();
    const organization = await db.organization.findFirst() ?? await db.organization.create({ data: { name: "S18 isolated skill acceptance" } });
    const branch = await db.branch.create({ data: { organizationId: organization.id, name: `Skill branch ${suffix}` } });
    const team = await db.team.create({ data: { organizationId: organization.id, branchId: branch.id, name: `Skill team ${suffix}` } });
    const otherBranch = await db.branch.create({ data: { organizationId: organization.id, name: `Other skill branch ${suffix}` } });
    const otherTeam = await db.team.create({ data: { organizationId: organization.id, branchId: otherBranch.id, name: `Other skill team ${suffix}` } });
    const actor = async (accountId: string, kind: AccountKind): Promise<Actor> => {
      const session = await db.session.create({ data: { accountId, tokenHash: randomUUID(), csrfTokenHash: randomUUID(), expiresAt: new Date(Date.now() + 3_600_000), lastUsedAt: new Date() } });
      return { accountId, organizationId: organization.id, kind, sessionId: session.id };
    };
    const person = async (label: string, branchId: string, teamId: string, reportsToId?: string) => {
      const account = await db.account.create({ data: { kind: AccountKind.STAFF, state: AccountState.ACTIVE, normalizedEmail: `s18-${label}-${suffix}@example.test` } });
      const employee = await db.employee.create({ data: { accountId: account.id, organizationId: organization.id, homeBranchId: branchId, homeTeamId: teamId, reportsToId: reportsToId ?? null, hiredAt: new Date("2026-01-01T00:00:00Z") } });
      return { employeeId: employee.id, actor: await actor(account.id, AccountKind.STAFF) };
    };
    const manager = await person("manager", branch.id, team.id), employee = await person("employee", branch.id, team.id, manager.employeeId), outsider = await person("outsider", otherBranch.id, otherTeam.id);
    const ownerAccount = await db.account.findFirst({ where: { kind: AccountKind.OWNER, state: AccountState.ACTIVE } }) ?? await db.account.create({ data: { kind: AccountKind.OWNER, state: AccountState.ACTIVE, normalizedEmail: `s18-owner-${suffix}@example.test` } });
    const owner = await actor(ownerAccount.id, AccountKind.OWNER);
    const grants = [];
    for (const permissionKey of ["skills.view", "skills.manage"]) grants.push(await db.employeePermissionOverride.create({ data: { employeeId: manager.employeeId, organizationId: organization.id, permissionKey, effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.TEAM, branchId: branch.id, teamId: team.id, reason: "Explicit scoped skill acceptance authority" } }));
    const skills = new SkillsService(database, new AuthorizationService(database), new ApprovalService(database));
    const skill = await skills.createCatalogue(owner, { name: `Detailing ${suffix}`, ...command("Create explicit skill fixture") });
    return { db, skills, owner, manager, employee, outsider, skill, grants, organizationId: organization.id };
  }

  it("persists exact own request and named manager approval without automatic official rating", async () => {
    const f = await fixture();
    const setup = await f.skills.setup(f.employee.actor);
    expect(setup.employees.map(row => row.id)).toEqual([f.employee.employeeId]);
    const request = await f.skills.request(f.employee.actor, { employeeId: f.employee.employeeId, skillId: f.skill.id, requestedLevel: "INTERMEDIATE", expectedRatingVersion: 0, approverAccountId: f.manager.actor.accountId, ...command("Request assessed skill addition") });
    expect(await f.db.skillRating.count({ where: { employeeId: f.employee.employeeId } })).toBe(0);
    await f.skills.decide(f.manager.actor, request.id, { outcome: "APPROVED", ...command("Approve assessed exact skill request") });
    const profile = await f.skills.profile(f.employee.actor, f.employee.employeeId);
    expect(profile.ratings).toEqual([expect.objectContaining({ level: "INTERMEDIATE", version: 1 })]);
    expect(profile.changes).toEqual([expect.objectContaining({ fromLevel: null, toLevel: "INTERMEDIATE", approvalRequestId: request.approvalRequestId })]);
    expect(profile.requests[0]).toMatchObject({ approvalState: "APPROVED", canDecide: false });
    const audit = await f.db.auditEvent.findFirst({ where: { subjectId: profile.ratings[0]!.id, eventKey: "skill.rating_changed" } });
    expect(audit?.after).toMatchObject({ employeeId: f.employee.employeeId, skillId: f.skill.id, version: 1 });
    expect(await f.db.approvalDecision.count({ where: { requestId: request.approvalRequestId } })).toBe(1);
  });

  it("denies foreign Branch IDs, ungranted management, wrong named approver and own decisions", async () => {
    const f = await fixture();
    await expect(f.skills.profile(f.outsider.actor, f.employee.employeeId)).rejects.toMatchObject({ status: 403 });
    await expect(f.skills.profile(f.manager.actor, f.outsider.employeeId)).rejects.toMatchObject({ status: 403 });
    const request = await f.skills.request(f.employee.actor, { employeeId: f.employee.employeeId, skillId: f.skill.id, requestedLevel: "BEGINNER", expectedRatingVersion: 0, approverAccountId: f.manager.actor.accountId, ...command("Request independent official review") });
    await expect(f.skills.decide(f.employee.actor, request.id, { outcome: "APPROVED", ...command("Cannot approve own official rating") })).rejects.toMatchObject({ status: 403 });
    await expect(f.skills.decide(f.owner, request.id, { outcome: "APPROVED", ...command("Wrong named approver cannot bypass request") })).rejects.toMatchObject({ status: 403 });
    for (const grant of f.grants) await f.db.employeePermissionOverride.update({ where: { id: grant.id }, data: { revokedAt: new Date() } });
    await expect(f.skills.decide(f.manager.actor, request.id, { outcome: "APPROVED", ...command("Revoked scope cannot approve request") })).rejects.toMatchObject({ status: 403 });
    expect(await f.db.skillRating.count({ where: { employeeId: f.employee.employeeId } })).toBe(0);
  });

  it("rejection retains evidence without publishing proposed catalogue or rating", async () => {
    const f = await fixture(), proposedSkillName = `Unapproved ${randomUUID()}`;
    const request = await f.skills.request(f.employee.actor, { employeeId: f.employee.employeeId, proposedSkillName, requestedLevel: "EXPERT", expectedRatingVersion: 0, approverAccountId: f.manager.actor.accountId, ...command("Suggest new skill for official review") });
    await f.skills.decide(f.manager.actor, request.id, { outcome: "REJECTED", ...command("Evidence does not establish requested level") });
    expect(await f.db.skillCatalogue.count({ where: { organizationId: f.organizationId, name: proposedSkillName } })).toBe(0);
    expect(await f.db.skillRating.count({ where: { employeeId: f.employee.employeeId } })).toBe(0);
    expect((await f.skills.profile(f.employee.actor, f.employee.employeeId)).requests[0]).toMatchObject({ approvalState: "REJECTED" });
  });

  it("stale approval rolls back its decision and cannot overwrite Owner intervening history", async () => {
    const f = await fixture();
    const request = await f.skills.request(f.employee.actor, { employeeId: f.employee.employeeId, skillId: f.skill.id, requestedLevel: "ADVANCED", expectedRatingVersion: 0, approverAccountId: f.manager.actor.accountId, ...command("Request exact initial skill level") });
    await f.skills.directRate(f.owner, { employeeId: f.employee.employeeId, skillId: f.skill.id, level: "BEGINNER", expectedRatingVersion: 0, ...command("Owner records intervening verified skill") });
    await expect(f.skills.decide(f.manager.actor, request.id, { outcome: "APPROVED", ...command("Stale recommendation must not overwrite") })).rejects.toMatchObject({ status: 409 });
    expect(await f.db.approvalDecision.count({ where: { requestId: request.approvalRequestId } })).toBe(0);
    expect(await f.db.approvalRequest.findUnique({ where: { id: request.approvalRequestId } })).toMatchObject({ state: "PENDING" });
    expect(await f.db.skillRating.findFirst({ where: { employeeId: f.employee.employeeId } })).toMatchObject({ level: "BEGINNER", version: 1 });
  });

  it("replays one result, rejects changed payload and denies replay after manager grant revocation", async () => {
    const f = await fixture();
    const input = { employeeId: f.employee.employeeId, skillId: f.skill.id, requestedLevel: "BEGINNER" as const, expectedRatingVersion: 0, approverAccountId: f.owner.accountId, ...command("Manager recommends precise official rating") };
    const first = await f.skills.request(f.manager.actor, input), retry = await f.skills.request(f.manager.actor, input);
    expect(retry.id).toBe(first.id);
    await expect(f.skills.request(f.manager.actor, { ...input, requestedLevel: "EXPERT" })).rejects.toMatchObject({ status: 409 });
    for (const grant of f.grants) await f.db.employeePermissionOverride.update({ where: { id: grant.id }, data: { revokedAt: new Date() } });
    await expect(f.skills.request(f.manager.actor, input)).rejects.toMatchObject({ status: 403 });
    expect(await f.db.skillChangeRequest.count({ where: { employeeId: f.employee.employeeId } })).toBe(1);
  });

  it("serializes real competing decisions to one official rating and decision", async () => {
    const f = await fixture();
    const request = await f.skills.request(f.employee.actor, { employeeId: f.employee.employeeId, skillId: f.skill.id, requestedLevel: "ADVANCED", expectedRatingVersion: 0, approverAccountId: f.manager.actor.accountId, ...command("Request concurrent exact approval fixture") });
    const results = await Promise.allSettled([f.skills.decide(f.manager.actor, request.id, { outcome: "APPROVED", ...command("First competing official approval") }), f.skills.decide(f.manager.actor, request.id, { outcome: "APPROVED", ...command("Second competing official approval") })]);
    expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
    expect(await f.db.skillRatingChange.count({ where: { approvalRequestId: request.approvalRequestId } })).toBe(1);
    expect(await f.db.approvalDecision.count({ where: { requestId: request.approvalRequestId } })).toBe(1);
  });

  it("database rejects evidence rewrites and forged rating heads, and revoked sessions fail", async () => {
    const f = await fixture();
    const applied = await f.skills.directRate(f.owner, { employeeId: f.employee.employeeId, skillId: f.skill.id, level: "BEGINNER", expectedRatingVersion: 0, ...command("Record official immutable SQL fixture") });
    await expect(f.db.skillRatingChange.update({ where: { id: applied.change.id }, data: { reason: "Forged retrospective correction" } })).rejects.toThrow();
    await expect(f.db.skillRating.update({ where: { id: applied.rating.id }, data: { level: "EXPERT", version: 2, currentChangeId: randomUUID() } })).rejects.toThrow();
    expect(await f.db.skillRating.findUnique({ where: { id: applied.rating.id } })).toMatchObject({ level: "BEGINNER", version: 1 });
    await f.db.session.update({ where: { id: f.employee.actor.sessionId }, data: { revokedAt: new Date() } });
    await expect(f.skills.profile(f.employee.actor, f.employee.employeeId)).rejects.toMatchObject({ status: 403 });
  });

  it("fails closed for fabricated training sources and creates no implicit promotion", async () => {
    const f = await fixture();
    await expect(f.skills.request(f.employee.actor, { employeeId: f.employee.employeeId, skillId: f.skill.id, requestedLevel: "EXPERT", expectedRatingVersion: 0, approverAccountId: f.manager.actor.accountId, trainingSourceId: randomUUID(), ...command("Fabricated completion cannot promote skill") })).rejects.toMatchObject({ status: 400 });
    expect(await f.db.skillRating.count({ where: { employeeId: f.employee.employeeId } })).toBe(0);
  });
});

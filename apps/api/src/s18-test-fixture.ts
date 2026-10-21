import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { AccountKind, AccountState, PermissionEffect, PermissionScopeKind, Prisma } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ApprovalService } from "./approval.service.js";
import { SkillsService } from "./skills.service.js";
import { LibraryService } from "./library.service.js";
import { TrainingService } from "./training.service.js";
import { TaskService } from "./task.service.js";
import type { ProjectActor } from "./project.service.js";
type Actor = ProjectActor & { sessionId: string };
export const learningCommand = (reason = "Reasoned local S18 acceptance command") => ({ commandId: randomUUID(), reason });
const command = learningCommand;
export function learningDatabase() {
 const databaseUrl = process.env.S18_DATABASE_URL!; const url = new URL(databaseUrl);
 const s18Target = url.port === "57433" && /^[a-z0-9_]+_test$/.test(url.pathname.slice(1)) && !/^\/sense_s18_s27_[a-z0-9_]+_test$/.test(url.pathname);
 const s27Target = process.env.S27_E2E_ENABLED === "1" && url.port === "58440" && /^\/sense_s18_s27_[a-z0-9_]+_test$/.test(url.pathname);
 if (!["localhost", "127.0.0.1"].includes(url.hostname) || (!s18Target && !s27Target)) throw new Error("S18 requires a dedicated local test target or the explicitly enabled exact S27 suite target");
 return new DatabaseService({ nodeEnv: "test", port: 4219, databaseUrl, webOrigin: "http://localhost:5319", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined });
}
export async function learningFixture(database: DatabaseService) {
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
    for (const permissionKey of ["skills.view", "skills.manage", "training.view", "training.manage", "library.view", "library.manage", "task.assign"]) grants.push(await db.employeePermissionOverride.create({ data: { employeeId: manager.employeeId, organizationId: organization.id, permissionKey, effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.TEAM, branchId: branch.id, teamId: team.id, reason: "Explicit scoped skill acceptance authority" } }));
    for (const person of [employee]) await db.employeePermissionOverride.create({ data: { employeeId: person.employeeId, organizationId: organization.id, permissionKey: "library.view", effect: PermissionEffect.ALLOW, scopeKind: PermissionScopeKind.TEAM, branchId: branch.id, teamId: team.id, reason: "Current audience reading" } });
    const authorization = new AuthorizationService(database), approvals = new ApprovalService(database), tasks = new TaskService(database, authorization, approvals);
    const nasRoot = resolve(process.cwd(), ".env.s18-test-nas", suffix); await mkdir(nasRoot, { recursive: true });
    const config = { nodeEnv: "test" as const, port: 4219, databaseUrl: process.env.S18_DATABASE_URL!, webOrigin: "http://localhost:5319", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined, nasRoot };
    const library = new LibraryService(database, authorization, tasks, approvals, config), training = new TrainingService(database, authorization, tasks);
    const skills = new SkillsService(database, authorization, approvals);
    const skill = await skills.createCatalogue(owner, { name: `Detailing ${suffix}`, ...command("Create explicit skill fixture") });
    return { db, skills, owner, manager, employee, outsider, skill, grants, organizationId: organization.id, library, training, tasks, branch, team, otherBranch, otherTeam, nasRoot, config };
  }


/** Fault injection stays within the actual PostgreSQL transaction; no source/reset mutation. */
export function learningFailingDatabase(database: DatabaseService, model: "libraryPublication" | "libraryFile" | "trainingAssignmentChange"): DatabaseService {
 const prisma = new Proxy(database.prisma, { get(target, key) {
  if (key === "$transaction") return async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options?: { timeout?: number }) => target.$transaction(async (tx) => callback(new Proxy(tx, { get(inner, prop) {
   if (prop === model) return new Proxy(Reflect.get(inner, prop, inner) as object, { get(delegate, method) { if (method === "create") return async () => { throw new Error("Injected canonical metadata failure"); }; return Reflect.get(delegate, method, delegate) as unknown; } });
   return Reflect.get(inner, prop, inner) as unknown;
  } })), options);
  return Reflect.get(target, key, target) as unknown;
 } });
 return { prisma } as unknown as DatabaseService;
}

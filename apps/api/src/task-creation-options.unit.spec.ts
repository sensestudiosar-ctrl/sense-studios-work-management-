import { ConflictException, ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { AccountKind } from "./generated/prisma/client.js";
import { TaskService } from "./task.service.js";

function harness(kind: AccountKind = AccountKind.STAFF) {
  const people = [
    { id: "self", accountId: "actor", organizationId: "org", homeBranchId: "branch", homeTeamId: "team", reportsToId: null, state: "ACTIVE", account: { state: "ACTIVE", normalizedEmail: "self@example.test" } },
    { id: "report", accountId: "report-account", organizationId: "org", homeBranchId: "branch", homeTeamId: "team", reportsToId: "self", state: "ACTIVE", account: { state: "ACTIVE", normalizedEmail: "report@example.test" } },
    { id: "peer", accountId: "peer-account", organizationId: "org", homeBranchId: "branch", homeTeamId: "team", reportsToId: null, state: "ACTIVE", account: { state: "ACTIVE", normalizedEmail: "peer@example.test" } },
    { id: "cross", accountId: "cross-account", organizationId: "org", homeBranchId: "other-branch", homeTeamId: "other-team", reportsToId: null, state: "ACTIVE", account: { state: "ACTIVE", normalizedEmail: "cross@example.test" } },
  ];
  const actor = { accountId: "actor", kind, organizationId: "org" };
  const account = { id: "actor", kind, state: "ACTIVE", employee: kind === AccountKind.STAFF ? people[0] : null };
  const project = { id: "project", organizationId: "org", branchId: "branch", title: "Studio", status: "ACTIVE" };
  const assignments = people.map(person => ({ employeeId: person.id, projectId: project.id, organizationId: "org", revokedAt: null as Date | null, crossBranchAuthorized: false }));
  const denied = new Set<string>();
  const assertPermission = jest.fn(async (id: string, key: string) => { if (denied.has(`${id}:${key}`)) throw new ForbiddenException(); });
  type Query = { where: { id?: string | { in: string[] }; accountId?: string; organizationId?: string; homeBranchId?: string; homeTeamId?: string; state?: string; employeeId?: string; projectId?: string; revokedAt?: null } };
  const employeeMatches = (person: typeof people[number], query: Query) => (!query.where.organizationId || person.organizationId === query.where.organizationId) &&
    (!query.where.id || (typeof query.where.id === "string" ? person.id === query.where.id : query.where.id.in.includes(person.id))) &&
    (!query.where.homeBranchId || person.homeBranchId === query.where.homeBranchId) && (!query.where.homeTeamId || person.homeTeamId === query.where.homeTeamId) && (!query.where.state || person.state === query.where.state && person.account.state === "ACTIVE");
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    account: { findUnique: jest.fn(async () => account) },
    employee: { findMany: jest.fn(async (query: Query) => people.filter(person => employeeMatches(person, query))), findUnique: jest.fn(async (query: Query) => people.find(person => query.where.accountId ? person.accountId === query.where.accountId : person.id === query.where.id) ?? null), findFirst: jest.fn(async (query: Query) => people.find(person => employeeMatches(person, query)) ?? null) },
    project: { findFirst: jest.fn(async (query: Query) => query.where.id === project.id && query.where.organizationId === "org" ? project : null) },
    projectAssignment: { findMany: jest.fn(async () => assignments.filter(row => row.revokedAt === null)), findFirst: jest.fn(async (query: Query) => assignments.find(row => row.employeeId === query.where.employeeId && row.projectId === query.where.projectId && row.revokedAt === null) ?? null) }
  };
  const service = new TaskService({ prisma: { $transaction: jest.fn(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)) } } as never, { assertPermission } as never, { registerHandler: jest.fn() } as never);
  return { service, tx, actor, account, project, people, assignments, denied, assertPermission };
}

describe("context-specific task creation choices", () => {
  it("offers an employee-less Owner active organization candidates for ordinary non-project work", async () => {
    const h = harness(AccountKind.OWNER); h.people[2]!.state = "SUSPENDED";
    const result = await h.service.creationOptions(h.actor);
    expect(result.actorEmployeeId).toBeNull(); expect(result.canAssign).toBe(true);
    expect(result.owners.map(person => person.id)).toEqual(["self", "report", "cross"]);
    expect(result.project).toBeNull();
  });

  it("limits project choices to current assigned recipients with valid cross-branch and project-view rights", async () => {
    const h = harness(AccountKind.OWNER); h.denied.add("peer-account:project.view");
    const result = await h.service.creationOptions(h.actor, "project");
    expect(result.owners.map(person => person.id)).toEqual(["self", "report"]);
    h.assignments[3]!.crossBranchAuthorized = true;
    const authorized = await h.service.creationOptions(h.actor, "project");
    expect(authorized.owners.map(person => person.id)).toEqual(["self", "report", "cross"]);
    expect(authorized.collaborators).toEqual(authorized.owners);
    h.assignments[1]!.revokedAt = new Date();
    expect((await h.service.creationOptions(h.actor, "project")).owners.map(person => person.id)).not.toContain("report");
  });

  it("offers ordinary Staff self ownership without collaborators when assignment is denied", async () => {
    const h = harness(); h.denied.add("actor:task.assign");
    const result = await h.service.creationOptions(h.actor);
    expect(result.canAssign).toBe(false); expect(result.owners.map(person => person.id)).toEqual(["self"]); expect(result.collaborators).toEqual([]);
  });

  it("uses reporting descendants for a non-project manager and excludes a same-team peer", async () => {
    const h = harness(); const result = await h.service.creationOptions(h.actor);
    expect(result.canAssign).toBe(true); expect(result.owners.map(person => person.id)).toEqual(["self", "report"]);
  });

  it("does not reuse another context's assignment grant for a project without project.manage", async () => {
    const h = harness(); h.denied.add("actor:project.manage");
    const result = await h.service.creationOptions(h.actor, "project");
    expect(result.canAssign).toBe(false); expect(result.owners.map(person => person.id)).toEqual(["self"]); expect(result.collaborators).toEqual([]);
  });

  it("denies project access before loading candidate identities", async () => {
    const h = harness(); h.denied.add("actor:project.view");
    await expect(h.service.creationOptions(h.actor, "project")).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.tx.employee.findMany).not.toHaveBeenCalled();
  });

  it.each(["ON_HOLD", "COMPLETED", "CANCELLED", "ARCHIVED"])("rejects %s new-delivery choices", async status => {
    const h = harness(AccountKind.OWNER); h.project.status = status;
    await expect(h.service.creationOptions(h.actor, "project")).rejects.toBeInstanceOf(ConflictException);
    expect(h.tx.employee.findMany).not.toHaveBeenCalled();
  });

  it.each([AccountKind.CLIENT, AccountKind.EXTERNAL])("denies portal kind %s", async kind => {
    const h = harness(kind);
    await expect(h.service.creationOptions(h.actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.tx.employee.findMany).not.toHaveBeenCalled();
  });

  it("denies an inactive actor and propagates unavailable authorization instead of returning permissive choices", async () => {
    const h = harness(); h.account.state = "SUSPENDED";
    await expect(h.service.creationOptions(h.actor)).rejects.toBeInstanceOf(ForbiddenException);
    const unavailable = harness(); unavailable.assertPermission.mockRejectedValue(new ServiceUnavailableException());
    await expect(unavailable.service.creationOptions(unavailable.actor)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

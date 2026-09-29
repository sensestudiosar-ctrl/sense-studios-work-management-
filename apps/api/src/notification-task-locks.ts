import { Prisma } from "./generated/prisma/client.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Hold S10 business scope until the in-app delivery write commits. */
export async function lockTaskNotificationScope(tx: Prisma.TransactionClient, eventId: string, recipientAccountId: string): Promise<boolean> {
  const event = await tx.domainEvent.findUnique({ where: { id: eventId } });
  if (!event || !["task.waiting", "task.dependency_completed"].includes(event.eventName) || !uuid.test(event.subjectId) || !event.organizationId) return false;
  const taskIds = [event.subjectId];
  if (event.eventName === "task.dependency_completed") {
    const payload = event.payload;
    const auditId = payload && typeof payload === "object" && !Array.isArray(payload) ? payload.auditEventId : undefined;
    if (typeof auditId !== "string" || !uuid.test(auditId)) return false;
    const audit = await tx.auditEvent.findUnique({ where: { id: auditId } });
    const after = audit?.after;
    const predecessorId = after && typeof after === "object" && !Array.isArray(after) ? after.predecessorTaskId : undefined;
    if (typeof predecessorId !== "string" || !uuid.test(predecessorId)) return false;
    taskIds.push(predecessorId);
  }
  await tx.$queryRaw`SELECT "id" FROM "tasks" WHERE "organizationId"=${event.organizationId}::uuid
    AND "id" IN (${Prisma.join([...new Set(taskIds)].sort().map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY "id" FOR SHARE`;
  const task = await tx.task.findFirst({ where: { id: event.subjectId, organizationId: event.organizationId } });
  if (!task) return false;
  if (task.projectId) {
    await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id"=${task.projectId}::uuid ORDER BY "id" FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "project_assignments" WHERE "projectId"=${task.projectId}::uuid ORDER BY "id" FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "task_dependencies" WHERE "dependentTaskId"=${task.id}::uuid ORDER BY "id" FOR SHARE`;
  }
  const observedOwner = await tx.employee.findUnique({ where: { id: task.primaryOwnerEmployeeId } });
  if (!observedOwner) return false;
  // FOR UPDATE also fences insertion of a new DENY override through its
  // employee FK. Non-project reporting paths use the same Team, whose rows
  // are locked together in ID order to keep intermediate managers stable.
  const employees = await tx.$queryRaw<Array<{ id: string }>>`SELECT e."id" FROM "employees" e
    WHERE e."organizationId"=${event.organizationId}::uuid AND (e."id"=${task.primaryOwnerEmployeeId}::uuid
      OR e."accountId"=${recipientAccountId}::uuid
      OR (${task.projectId === null} AND e."homeTeamId"=${observedOwner.homeTeamId}::uuid))
    ORDER BY e."id" FOR UPDATE`;
  const owner = await tx.employee.findUnique({ where: { id: task.primaryOwnerEmployeeId } });
  if (!owner || owner.homeTeamId !== observedOwner.homeTeamId) return false;
  await tx.$queryRaw`SELECT "id" FROM "accounts" WHERE "id"=${recipientAccountId}::uuid OR "id"=${owner.accountId}::uuid ORDER BY "id" FOR SHARE`;
  await tx.$queryRaw`SELECT "id" FROM "teams" WHERE "id" IN (SELECT "homeTeamId" FROM "employees"
    WHERE "id" IN (${Prisma.join(employees.map((row) => Prisma.sql`${row.id}::uuid`))})) ORDER BY "id" FOR SHARE`;
  await tx.$queryRaw`SELECT "id" FROM "branches" WHERE "id" IN (SELECT "homeBranchId" FROM "employees"
    WHERE "id" IN (${Prisma.join(employees.map((row) => Prisma.sql`${row.id}::uuid`))})) ORDER BY "id" FOR SHARE`;
  await tx.$queryRaw`SELECT "id" FROM "task_closeout_approvals" WHERE "taskId"=${task.id}::uuid ORDER BY "id" FOR SHARE`;
  await tx.$queryRaw`SELECT "id" FROM "employee_job_role_assignments" WHERE "employeeId" IN
    (SELECT "id" FROM "employees" WHERE "accountId"=${recipientAccountId}::uuid) ORDER BY "id" FOR SHARE`;
  await tx.$queryRaw`SELECT "id" FROM "job_roles" WHERE "id" IN (SELECT "jobRoleId" FROM "employee_job_role_assignments"
    WHERE "employeeId" IN (SELECT "id" FROM "employees" WHERE "accountId"=${recipientAccountId}::uuid)) ORDER BY "id" FOR SHARE`;
  await tx.$queryRaw`SELECT "id" FROM "role_permissions" WHERE "roleId" IN (SELECT "jobRoleId" FROM "employee_job_role_assignments"
    WHERE "employeeId" IN (SELECT "id" FROM "employees" WHERE "accountId"=${recipientAccountId}::uuid)) ORDER BY "id" FOR SHARE`;
  await tx.$queryRaw`SELECT "id" FROM "employee_permission_overrides" WHERE "employeeId" IN
    (SELECT "id" FROM "employees" WHERE "accountId"=${recipientAccountId}::uuid) ORDER BY "id" FOR SHARE`;
  return true;
}

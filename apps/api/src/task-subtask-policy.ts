import { ConflictException } from "@nestjs/common";
import type { Prisma } from "./generated/prisma/client.js";

/** The parent lock serializes this check with child creation until commit. */
export async function assertSubtasksCompleted(tx: Prisma.TransactionClient, organizationId: string, taskId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "tasks" WHERE "id"=${taskId}::uuid AND "organizationId"=${organizationId}::uuid FOR UPDATE`;
  const result = await tx.$queryRaw<Array<{ blocked: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM "task_subtask_links" link
      JOIN "tasks" child ON child."id"=link."childTaskId" AND child."organizationId"=link."organizationId"
      WHERE link."parentTaskId"=${taskId}::uuid AND link."organizationId"=${organizationId}::uuid
      AND child."status" <> 'COMPLETED'::"TaskStatus"
    ) AS blocked`;
  if (result[0]?.blocked) throw new ConflictException("Complete all subtasks before completing the parent task");
}

/** Caller holds the project graph advisory lock before changing dependency edges. */
export async function assertNoSubtaskDependencyCycle(tx: Prisma.TransactionClient, organizationId: string, dependentTaskId: string, predecessorTaskId: string): Promise<void> {
  const result = await tx.$queryRaw<Array<{ cycle: boolean }>>`
    SELECT "task_completion_path_exists"(${organizationId}::uuid, ${predecessorTaskId}::uuid, ${dependentTaskId}::uuid) AS cycle`;
  if (result[0]?.cycle) throw new ConflictException("Task dependency or subtask completion cycle is forbidden");
}

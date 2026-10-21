import { TaskStatus, TaskType, type Prisma } from "./generated/prisma/client.js";

/** Demo Reviews is a pending personal task lens; the broader Review phase is unchanged. */
export const REVIEW_METRIC_STATES = [TaskStatus.SUBMITTED_INTERNAL_REVIEW, TaskStatus.IN_INTERNAL_REVIEW, TaskStatus.CORRECTIONS_REQUIRED, TaskStatus.SUBMITTED_CLIENT_REVIEW, TaskStatus.IN_CLIENT_REVIEW, TaskStatus.CLIENT_REVISION_REQUIRED];
export const REVIEW_METRIC_EXCLUDED = [TaskStatus.INTERNAL_APPROVED, TaskStatus.CLIENT_APPROVED, TaskStatus.COMPLETED, TaskStatus.STOPPED_DUE_TO_PROJECT_CANCELLATION];
export function reviewMetricWhere(): Prisma.TaskWhereInput {
  return { AND: [{ status: { notIn: REVIEW_METRIC_EXCLUDED } }, { OR: [{ status: { in: REVIEW_METRIC_STATES } }, { type: TaskType.CORRECTION }] }] };
}

import { localCalendarDate } from "./task-recurrence-policy.js";

export type TaskActionReason = "due_today" | "overdue" | "correction_required" | "resume_waiting" | "reassignment_required";
export function actionableTaskReasons(task: { status: string; type: string; targetDate: Date; requiresReassignment: boolean }, capabilities: { edit: boolean; transition: boolean; resume: boolean; reassign: boolean; wait?: boolean }, personal: boolean, now: Date, timezone: string): TaskActionReason[] {
  if (task.requiresReassignment) return capabilities.reassign ? ["reassignment_required"] : [];
  if (!personal) return [];
  if (task.status === "WAITING") return capabilities.resume ? ["resume_waiting"] : [];
  const canStart = task.status === "NOT_STARTED" && capabilities.transition;
  if (!capabilities.edit && !canStart && !capabilities.wait) return [];
  const reasons: TaskActionReason[] = [];
  if (task.type === "CORRECTION" || task.status === "CORRECTIONS_REQUIRED" || task.status === "CLIENT_REVISION_REQUIRED") reasons.push("correction_required");
  // Target is a stored date-only value, represented by Prisma at UTC midnight.
  const target = task.targetDate.toISOString().slice(0, 10), today = localCalendarDate(now, timezone);
  if (target < today) reasons.push("overdue");
  else if (target === today) reasons.push("due_today");
  return reasons;
}

import { createHash } from "node:crypto";
import type { CreateTaskInput } from "./task.service.js";

/** Typed field order/defaults, independent of caller JSON ordering. No secrets stored. */
export function taskCreateHash(input: CreateTaskInput, parent?: { id: string; expectedVersion: number }): string {
  const value = {
    command: parent ? "CREATE_SUBTASK" : "CREATE_TASK", parentTaskId: parent?.id ?? null, expectedParentVersion: parent?.expectedVersion ?? null,
    title: input.title, type: input.type, priority: input.priority, targetDate: input.targetDate, reason: input.reason,
    description: input.description ?? null, startDate: input.startDate ?? null, estimatedHours: input.estimatedHours ?? null,
    projectId: input.projectId ?? null, planItemId: input.planItemId ?? null, ownerEmployeeId: input.ownerEmployeeId ?? null,
    reviewRequirement: input.reviewRequirement ?? "NONE", acknowledgeOverload: input.acknowledgeOverload ?? false,
    tags: input.tags ?? [], checklist: (input.checklist ?? []).map(row => ({ label: row.label, checked: row.checked })),
    collaborators: (input.collaborators ?? []).map(row => ({ employeeId: row.employeeId, estimatedHours: row.estimatedHours ?? null })).sort((a,b) => a.employeeId.localeCompare(b.employeeId))
  };
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

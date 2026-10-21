import { TASK_COLLABORATOR_FILTER_MAX, TASK_PRIORITY_VALUES, type TaskListSort, type TaskReadRefinements } from "@sense/contracts";
import { z } from "zod";
import type { Prisma } from "./generated/prisma/client.js";

const csv = (value: unknown): unknown => typeof value === "string" ? value.split(",") : value;
export const taskPrioritySelection = z.preprocess(csv, z.array(z.enum(TASK_PRIORITY_VALUES)).min(1).max(TASK_PRIORITY_VALUES.length).refine(values => new Set(values).size === values.length)).optional();
export const taskCollaboratorSelection = z.preprocess(csv, z.array(z.uuid()).min(1).max(TASK_COLLABORATOR_FILTER_MAX).refine(values => new Set(values).size === values.length)).optional();

/** Always intersect these predicates with the owning service's actor-visible set. */
export function taskRefinementPredicates(filters: TaskReadRefinements): Prisma.TaskWhereInput[] {
  return [
    ...(filters.priorities?.length ? [{ priority: { in: filters.priorities } }] : []),
    ...(filters.collaboratorEmployeeIds?.length ? [{ collaborators: { some: { employeeId: { in: filters.collaboratorEmployeeIds } } } }] : []),
  ];
}
export function taskSearchPredicate(q?: string): Prisma.TaskWhereInput {
  if (!q) return {};
  const text = { contains: q, mode: "insensitive" as const };
  return { OR: [
    { title: text }, { description: text }, { project: { is: { title: text } } }, { planItem: { is: { label: text } } },
    { primaryOwner: { is: { account: { is: { normalizedEmail: text } } } } }, { createdBy: { is: { normalizedEmail: text } } },
    ...(z.uuid().safeParse(q).success ? [{ id: q }] : []),
  ] };
}
export function taskReadOrder(sort?: TaskListSort): Prisma.TaskOrderByWithRelationInput[] {
  // PostgreSQL TaskPriority is declared LOW, MEDIUM, HIGH, CRITICAL.
  if (sort === "priority_desc") return [{ priority: "desc" }, { targetDate: "asc" }, { id: "asc" }];
  if (sort === "target_asc") return [{ targetDate: "asc" }, { id: "asc" }];
  if (sort === "title_asc") return [{ title: "asc" }, { id: "asc" }];
  if (sort === "owner_asc") return [{ primaryOwner: { account: { normalizedEmail: "asc" } } }, { id: "asc" }];
  return [{ createdAt: "desc" }, { id: "desc" }];
}
/** Private Task-port matching; preserve source-ID search without projecting text. */
export function actionableTaskSearchMatches(task: { id: string; title: string; description?: string | null; project?: { title: string } | null; planItem?: { label: string } | null }, q?: string): boolean {
  if (!q) return true;
  const needle = q.toLocaleLowerCase("en-US");
  return [task.id, task.title, task.description ?? "", task.project?.title ?? "", task.planItem?.label ?? ""].some(value => value.toLocaleLowerCase("en-US").includes(needle));
}

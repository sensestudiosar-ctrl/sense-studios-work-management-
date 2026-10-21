export const HEALTH_PATHS = {
  live: "/api/v1/health/live",
  ready: "/api/v1/health/ready"
} as const;

/** Canonical task create/edit/subtask description boundary; UI and API must agree. */
export const TASK_DESCRIPTION_MAX_LENGTH = 2000;
export type { TaskCreationOptions, TaskCreationPerson } from "./task-creation.js";
export { TASK_PRIORITY_VALUES, TASK_LIST_SORT_VALUES, TASK_COLLABORATOR_FILTER_MAX, type TaskPriorityValue, type TaskListSort, type TaskReadRefinements } from "./task-query.js";
export { PERMISSION_CATALOGUE, isKnownPermissionKey, type PermissionKey } from "./permissions.js";

export interface LivenessResponse {
  status: "alive";
  service: "api";
  checkedAt: string;
}

export interface ReadinessResponse {
  status: "ready" | "unavailable";
  service: "api";
  dependencies: {
    database: "ready" | "unavailable";
  };
  checkedAt: string;
}
export type { MyWorkSource, MyWorkAttentionQuery, MyWorkRow, MyWorkSourceCount, MyWorkAttentionResponse } from "./my-work.js";

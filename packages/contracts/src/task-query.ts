/** Bounded task read refinements; these never confer resource authority. */
export const TASK_PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type TaskPriorityValue = (typeof TASK_PRIORITY_VALUES)[number];
export const TASK_LIST_SORT_VALUES = ["created_desc", "target_asc", "title_asc", "owner_asc", "priority_desc"] as const;
export type TaskListSort = (typeof TASK_LIST_SORT_VALUES)[number];
export const TASK_COLLABORATOR_FILTER_MAX = 30;
export type TaskReadRefinements = {
  /** Match any selected priority, intersected with every other predicate. */
  priorities?: TaskPriorityValue[] | undefined;
  /** Match any selected collaborator. Primary ownership remains separate. */
  collaboratorEmployeeIds?: string[] | undefined;
};

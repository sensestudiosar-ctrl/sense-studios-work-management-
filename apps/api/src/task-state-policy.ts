/** Task states currently recognized by the S09 policy. Overdue is derived. */
export const TASK_STATES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING",
  "SUBMITTED_INTERNAL_REVIEW",
  "IN_INTERNAL_REVIEW",
  "CORRECTIONS_REQUIRED",
  "INTERNAL_APPROVED",
  "SUBMITTED_CLIENT_REVIEW",
  "IN_CLIENT_REVIEW",
  "CLIENT_REVISION_REQUIRED",
  "CLIENT_APPROVED",
  "COMPLETED",
  "STOPPED_DUE_TO_PROJECT_CANCELLATION"
] as const;

export type TaskState = typeof TASK_STATES[number];

export interface TaskTransitionEvaluation {
  from: TaskState;
  to: TaskState;
  reason?: string;
  previousState?: TaskState;
}

const stateSet: ReadonlySet<string> = new Set(TASK_STATES);
const reviewStates: ReadonlySet<TaskState> = new Set([
  "SUBMITTED_INTERNAL_REVIEW",
  "IN_INTERNAL_REVIEW",
  "CORRECTIONS_REQUIRED",
  "INTERNAL_APPROVED",
  "SUBMITTED_CLIENT_REVIEW",
  "IN_CLIENT_REVIEW",
  "CLIENT_REVISION_REQUIRED",
  "CLIENT_APPROVED"
]);
const terminalStates: ReadonlySet<TaskState> = new Set([
  "COMPLETED",
  "STOPPED_DUE_TO_PROJECT_CANCELLATION"
]);

function isTaskState(value: unknown): value is TaskState {
  return typeof value === "string" && stateSet.has(value);
}

function requireReason(reason: string | undefined): string {
  const trimmed = reason?.trim() ?? "";
  if (trimmed.length < 3 || trimmed.length > 1000) {
    throw new Error("A transition reason of 3 to 1000 characters is required");
  }
  return trimmed;
}

/**
 * Evaluates only S09-owned task moves. This is a pure guard: callers still enforce
 * authorization, review configuration, persistence, versioning and audit. Review
 * transitions stay closed until the S13/S14 handlers are implemented.
 */
export function evaluateTaskStateTransition(
  from: TaskState,
  to: TaskState,
  reviewRequired?: boolean
): TaskTransitionEvaluation {
  if (!isTaskState(from) || !isTaskState(to)) throw new Error("Invalid task state");
  if (from === to) throw new Error("Task must move to a different state");
  if (terminalStates.has(from)) throw new Error("Task state is terminal");
  if (reviewStates.has(from) || reviewStates.has(to)) {
    throw new Error("Task review transitions are unavailable until S13/S14 handlers are implemented");
  }
  if (to === "STOPPED_DUE_TO_PROJECT_CANCELLATION") {
    throw new Error("Only the atomic project cancellation workflow may stop a delivery task");
  }

  if (from === "NOT_STARTED" && to === "IN_PROGRESS") return { from, to };
  // S10 owns ordinary waiting/resume; C-023 exit waiting requires the S09
  // reassignment command. Neither path is an ordinary state transition.
  if (from === "WAITING" || to === "WAITING") {
    throw new Error("Waiting requires an authorized workflow command");
  }
  if (from === "IN_PROGRESS" && to === "COMPLETED") {
    if (reviewRequired === undefined) throw new Error("Review requirement must be checked before completion");
    if (reviewRequired) throw new Error("Required review gates are unavailable until S13/S14 handlers are implemented");
    return { from, to };
  }
  throw new Error(`Task transition from ${from} to ${to} is not allowed`);
}

/** S10 ordinary waiting is distinct from C-023 mandatory reassignment waiting. */
export function evaluateTaskWaiting(state: TaskState, reason: string, delayCause: string): TaskTransitionEvaluation & { delayCause: string } {
  if (state !== "IN_PROGRESS") throw new Error("Only in-progress work may enter ordinary Waiting");
  return { from: state, to: "WAITING", previousState: state, reason: requireReason(reason), delayCause: requireReason(delayCause) };
}

export function evaluateTaskResume(state: TaskState, previousState: TaskState | null, requiresReassignment: boolean, reason: string): TaskTransitionEvaluation {
  if (requiresReassignment) throw new Error("A manager must reassign this task before it resumes");
  if (state !== "WAITING" || previousState !== "IN_PROGRESS") throw new Error("Only ordinary Waiting work may resume its saved active state");
  return { from: state, to: previousState, previousState, reason: requireReason(reason) };
}

/** C-023 forced exit wait; terminal tasks remain unchanged, owner is never replaced here. */
export function evaluateEmployeeExitTask(
  state: TaskState,
  needsReassignmentReason = "Employee exit; needs reassignment"
): { changed: false; state: TaskState } | TaskTransitionEvaluation & { changed: true; ownerPreserved: true } {
  if (!isTaskState(state)) throw new Error("Invalid task state");
  if (terminalStates.has(state)) return { changed: false, state };
  return {
    changed: true,
    from: state,
    to: "WAITING",
    reason: requireReason(needsReassignmentReason),
    previousState: state,
    ownerPreserved: true
  };
}

/** C-011 cancellation outcome for unfinished delivery tasks only. */
export function evaluateProjectCancellationTask(
  state: TaskState,
  isDeliveryTask: boolean,
  cancellationReason: string
): { changed: false; state: TaskState } | TaskTransitionEvaluation & { changed: true } {
  if (!isTaskState(state)) throw new Error("Invalid task state");
  if (!isDeliveryTask || terminalStates.has(state)) return { changed: false, state };
  return {
    changed: true,
    from: state,
    to: "STOPPED_DUE_TO_PROJECT_CANCELLATION",
    reason: requireReason(cancellationReason),
    previousState: state
  };
}

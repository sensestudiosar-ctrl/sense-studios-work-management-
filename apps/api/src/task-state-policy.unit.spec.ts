import {
  evaluateEmployeeExitTask,
  evaluateProjectCancellationTask,
  evaluateTaskStateTransition,
  evaluateTaskWaiting,
  evaluateTaskResume,
  TASK_STATES,
  type TaskState
} from "./task-state-policy.js";

describe("task state policy", () => {
  it("allows the S09 active path, reserves Waiting for its authorized workflow and derives overdue outside the state set", () => {
    expect(evaluateTaskStateTransition("NOT_STARTED", "IN_PROGRESS")).toEqual({
      from: "NOT_STARTED", to: "IN_PROGRESS"
    });
    expect(() => evaluateTaskStateTransition("IN_PROGRESS", "WAITING")).toThrow("authorized workflow");
    expect(() => evaluateTaskStateTransition("WAITING", "IN_PROGRESS")).toThrow("authorized workflow");
    expect(TASK_STATES).not.toContain("OVERDUE");
  });

  it("rejects every transition into or out of review states until S13/S14", () => {
    const reviewStates = TASK_STATES.filter((state) => state.includes("REVIEW") || state.includes("APPROVED") || state === "CORRECTIONS_REQUIRED");
    for (const review of reviewStates) {
      expect(() => evaluateTaskStateTransition("IN_PROGRESS", review)).toThrow("S13/S14");
      expect(() => evaluateTaskStateTransition(review, "COMPLETED")).toThrow("S13/S14");
    }
    expect(() => evaluateTaskStateTransition("IN_PROGRESS", "COMPLETED", true)).toThrow("review gates");
    expect(() => evaluateTaskStateTransition("IN_PROGRESS", "COMPLETED")).toThrow("Review requirement must be checked");
    expect(evaluateTaskStateTransition("IN_PROGRESS", "COMPLETED", false).to).toBe("COMPLETED");
  });

  it("makes project cancellation stop unfinished delivery and leaves completed or non-delivery work untouched", () => {
    expect(evaluateProjectCancellationTask("IN_PROGRESS", true, "Project cancelled")).toEqual({
      changed: true,
      from: "IN_PROGRESS",
      to: "STOPPED_DUE_TO_PROJECT_CANCELLATION",
      reason: "Project cancelled",
      previousState: "IN_PROGRESS"
    });
    expect(evaluateProjectCancellationTask("COMPLETED", true, "Project cancelled")).toEqual({ changed: false, state: "COMPLETED" });
    expect(evaluateProjectCancellationTask("IN_PROGRESS", false, "Project cancelled")).toEqual({ changed: false, state: "IN_PROGRESS" });
    expect(() => evaluateTaskStateTransition("STOPPED_DUE_TO_PROJECT_CANCELLATION", "IN_PROGRESS")).toThrow("terminal");
  });

  it("puts unfinished tasks into exit waiting while preserving owner accountability and leaves terminal tasks unchanged", () => {
    expect(evaluateEmployeeExitTask("IN_PROGRESS", "Employee exited; needs reassignment")).toEqual({
      changed: true,
      from: "IN_PROGRESS",
      to: "WAITING",
      reason: "Employee exited; needs reassignment",
      previousState: "IN_PROGRESS",
      ownerPreserved: true
    });
    expect(evaluateEmployeeExitTask("COMPLETED")).toEqual({ changed: false, state: "COMPLETED" });
    expect(evaluateEmployeeExitTask("STOPPED_DUE_TO_PROJECT_CANCELLATION")).toEqual({
      changed: false, state: "STOPPED_DUE_TO_PROJECT_CANCELLATION"
    });
  });

  it("rejects invalid runtime values and disallows arbitrary active-state jumps", () => {
    expect(() => evaluateTaskStateTransition("NOT_A_STATE" as TaskState, "IN_PROGRESS")).toThrow("Invalid task state");
    expect(() => evaluateTaskStateTransition("NOT_STARTED", "COMPLETED")).toThrow("not allowed");
    expect(() => evaluateTaskStateTransition("WAITING", "COMPLETED")).toThrow("authorized workflow");
  });

  it("requires an explicit ordinary wait with reason and cause, and restores only the saved active state", () => {
    expect(evaluateTaskWaiting("IN_PROGRESS", "  Await client response  ", "  Client pending  ")).toEqual({ from: "IN_PROGRESS", to: "WAITING", previousState: "IN_PROGRESS", reason: "Await client response", delayCause: "Client pending" });
    for (const state of TASK_STATES.filter((value) => value !== "IN_PROGRESS")) expect(() => evaluateTaskWaiting(state, "Await response", "Client pending")).toThrow("in-progress");
    expect(() => evaluateTaskWaiting("IN_PROGRESS", " ", "Client pending")).toThrow("reason");
    expect(() => evaluateTaskWaiting("IN_PROGRESS", "Await response", " ")).toThrow("reason");
    expect(evaluateTaskResume("WAITING", "IN_PROGRESS", false, "Client replied")).toEqual({ from: "WAITING", to: "IN_PROGRESS", previousState: "IN_PROGRESS", reason: "Client replied" });
    expect(() => evaluateTaskResume("WAITING", "IN_PROGRESS", true, "Attempt bypass")).toThrow("reassign");
    expect(() => evaluateTaskResume("WAITING", "IN_INTERNAL_REVIEW", false, "Attempt review bypass")).toThrow("saved active state");
    expect(() => evaluateTaskResume("IN_PROGRESS", "IN_PROGRESS", false, "Attempt repeated resume")).toThrow("ordinary Waiting");
  });
});

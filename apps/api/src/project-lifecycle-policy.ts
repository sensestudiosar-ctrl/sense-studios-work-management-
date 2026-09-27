/** Project lifecycle states supported by the S07 project workflow. */
export const PROJECT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
  "CANCELLED"
] as const;

export type ProjectStatus = typeof PROJECT_STATUSES[number];
export type ProjectLifecycleGate = "PROJECT_LEAD_ASSIGNED" | "PROJECT_GATES_RECHECKED";

export interface ProjectLifecycleEvaluation {
  from: ProjectStatus;
  to: ProjectStatus;
  /** Trimmed reason for transitions that require one. */
  reason?: string;
  /** Conditions the caller must verify before applying the transition. */
  requiredGates: ProjectLifecycleGate[];
}

const statusSet: ReadonlySet<string> = new Set(PROJECT_STATUSES);

function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === "string" && statusSet.has(value);
}

function requireReason(reason: string | undefined): string {
  const trimmed = reason?.trim() ?? "";
  if (trimmed.length < 3 || trimmed.length > 1000) {
    throw new Error("A transition reason of 3 to 1000 characters is required");
  }
  return trimmed;
}

/**
 * Evaluates an S07 project status move without persistence, authorization, audit,
 * or gate checks. Callers must enforce permissions and required gates when applying it.
 */
export function evaluateProjectLifecycleTransition(
  from: ProjectStatus,
  to: ProjectStatus,
  reason?: string
): ProjectLifecycleEvaluation {
  if (!isProjectStatus(from) || !isProjectStatus(to)) throw new Error("Invalid project status");
  if (to === "CANCELLED") {
    throw new Error("Project cancellation is unavailable until its S09 dependency is implemented");
  }
  if (from === "CANCELLED") throw new Error("Cancelled projects are terminal");
  if (from === to) throw new Error("Project must move to a different status");

  if (from === "DRAFT" && to === "ACTIVE") {
    return { from, to, requiredGates: ["PROJECT_LEAD_ASSIGNED", "PROJECT_GATES_RECHECKED"] };
  }
  if (from === "ACTIVE" && to === "ON_HOLD") {
    return { from, to, reason: requireReason(reason), requiredGates: [] };
  }
  if (from === "ON_HOLD" && to === "ACTIVE") {
    return {
      from,
      to,
      reason: requireReason(reason),
      requiredGates: ["PROJECT_LEAD_ASSIGNED", "PROJECT_GATES_RECHECKED"]
    };
  }
  if (from === "ACTIVE" && to === "COMPLETED") {
    return { from, to, requiredGates: ["PROJECT_GATES_RECHECKED"] };
  }
  if (from === "COMPLETED" && to === "ARCHIVED") {
    return { from, to, requiredGates: [] };
  }

  throw new Error(`Project transition from ${from} to ${to} is not allowed`);
}

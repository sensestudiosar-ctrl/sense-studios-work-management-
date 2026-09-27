/** Ordered lead stages used to evaluate the S06 sales pipeline. */
export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "MEETING_DISCUSSION",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST"
] as const;

export type LeadStage = typeof LEAD_STAGES[number];
export type LeadTransitionDirection = "FORWARD" | "BACKWARD" | "LOST";

export interface LeadTransitionEvaluation {
  from: LeadStage;
  to: LeadStage;
  direction: LeadTransitionDirection;
  skippedStages: LeadStage[];
}

const forwardStages = LEAD_STAGES.slice(0, LEAD_STAGES.indexOf("WON") + 1);
const stageSet: ReadonlySet<string> = new Set(LEAD_STAGES);

function isLeadStage(value: unknown): value is LeadStage {
  return typeof value === "string" && stageSet.has(value);
}

function requireReason(reason: string | undefined): void {
  const trimmed = reason?.trim() ?? "";
  if (trimmed.length < 3 || trimmed.length > 1000) {
    throw new Error("A transition reason of 3 to 1000 characters is required");
  }
}

/**
 * Evaluates a lead stage move without persistence, authorization, audit, or other side effects.
 * Callers must authorize the lead scope and persist this evaluation transactionally.
 */
export function evaluateLeadTransition(
  from: LeadStage,
  to: LeadStage,
  reason?: string
): LeadTransitionEvaluation {
  if (!isLeadStage(from) || !isLeadStage(to)) throw new Error("Invalid lead stage");
  if (from === to) throw new Error("Lead must move to a different stage");
  if (from === "WON" || from === "LOST") throw new Error("Won and Lost leads are terminal");

  if (to === "LOST") {
    requireReason(reason);
    return { from, to, direction: "LOST", skippedStages: [] };
  }

  const fromIndex = forwardStages.indexOf(from);
  const toIndex = forwardStages.indexOf(to);
  if (toIndex > fromIndex) {
    if (toIndex > fromIndex + 1) requireReason(reason);
    return {
      from,
      to,
      direction: "FORWARD",
      skippedStages: forwardStages.slice(fromIndex + 1, toIndex)
    };
  }

  requireReason(reason);
  return { from, to, direction: "BACKWARD", skippedStages: [] };
}

import {
  evaluateProjectLifecycleTransition,
  PROJECT_STATUSES,
  type ProjectStatus
} from "./project-lifecycle-policy.js";

describe("evaluateProjectLifecycleTransition", () => {
  it("permits only the defined forward and reversible lifecycle edges", () => {
    const allowed = new Set([
      "DRAFT->ACTIVE",
      "ACTIVE->ON_HOLD",
      "ON_HOLD->ACTIVE",
      "ACTIVE->COMPLETED",
      "COMPLETED->ARCHIVED"
    ]);

    for (const from of PROJECT_STATUSES) {
      for (const to of PROJECT_STATUSES) {
        if (to === "CANCELLED") {
          expect(() => evaluateProjectLifecycleTransition(from, to, "Cancel project")).toThrow("S09");
        } else if (from === "CANCELLED") {
          expect(() => evaluateProjectLifecycleTransition(from, to, "Reason")).toThrow("terminal");
        } else if (from === to) {
          expect(() => evaluateProjectLifecycleTransition(from, to)).toThrow("different status");
        } else if (allowed.has(`${from}->${to}`)) {
          const reason = from === "ACTIVE" && to === "ON_HOLD" || from === "ON_HOLD" && to === "ACTIVE"
            ? "Lifecycle change"
            : undefined;
          expect(evaluateProjectLifecycleTransition(from, to, reason).to).toBe(to);
        } else {
          expect(() => evaluateProjectLifecycleTransition(from, to, "Lifecycle change")).toThrow("not allowed");
        }
      }
    }
  });

  it("returns external resume gate requirements and a trimmed reason", () => {
    expect(evaluateProjectLifecycleTransition("DRAFT", "ACTIVE").requiredGates).toEqual([
      "PROJECT_LEAD_ASSIGNED", "PROJECT_GATES_RECHECKED"
    ]);
    expect(evaluateProjectLifecycleTransition("ON_HOLD", "ACTIVE", "  Lead appointed  ")).toEqual({
      from: "ON_HOLD",
      to: "ACTIVE",
      reason: "Lead appointed",
      requiredGates: ["PROJECT_LEAD_ASSIGNED", "PROJECT_GATES_RECHECKED"]
    });
    expect(evaluateProjectLifecycleTransition("ACTIVE", "COMPLETED").requiredGates).toEqual(["PROJECT_GATES_RECHECKED"]);
  });

  it("requires trimmed reasons from 3 through 1000 characters for hold and resume", () => {
    for (const [from, to] of [["ACTIVE", "ON_HOLD"], ["ON_HOLD", "ACTIVE"]] as const) {
      expect(() => evaluateProjectLifecycleTransition(from, to, "  ab  ")).toThrow("3 to 1000");
      expect(evaluateProjectLifecycleTransition(from, to, "  abc  ").reason).toBe("abc");
      expect(() => evaluateProjectLifecycleTransition(from, to, ` ${"x".repeat(1001)} `)).toThrow("3 to 1000");
      expect(evaluateProjectLifecycleTransition(from, to, "x".repeat(1000)).reason).toHaveLength(1000);
    }
  });

  it("rejects invalid runtime statuses", () => {
    expect(() => evaluateProjectLifecycleTransition("UNKNOWN" as ProjectStatus, "ACTIVE")).toThrow("Invalid project status");
    expect(() => evaluateProjectLifecycleTransition("DRAFT", "UNKNOWN" as ProjectStatus)).toThrow("Invalid project status");
  });
});

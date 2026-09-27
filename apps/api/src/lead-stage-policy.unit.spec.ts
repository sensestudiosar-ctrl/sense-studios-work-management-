import { evaluateLeadTransition, LEAD_STAGES, type LeadStage } from "./lead-stage-policy.js";

describe("evaluateLeadTransition", () => {
  it("enforces the transition rule for every pair of stages", () => {
    const activeStages = LEAD_STAGES.filter((stage) => stage !== "WON" && stage !== "LOST");
    const progressStages = LEAD_STAGES.filter((stage) => stage !== "LOST");

    for (const from of activeStages) {
      const fromIndex = progressStages.indexOf(from);
      for (const to of LEAD_STAGES) {
        if (from === to) {
          expect(() => evaluateLeadTransition(from, to)).toThrow("different stage");
          continue;
        }
        if (to === "LOST") {
          expect(evaluateLeadTransition(from, to, "Not proceeding")).toEqual({
            from, to, direction: "LOST", skippedStages: []
          });
          expect(() => evaluateLeadTransition(from, to)).toThrow("reason");
          continue;
        }

        const toIndex = progressStages.indexOf(to);
        if (toIndex > fromIndex) {
          const skippedStages = progressStages.slice(fromIndex + 1, toIndex);
          const expected = { from, to, direction: "FORWARD", skippedStages };
          if (toIndex === fromIndex + 1) {
            expect(evaluateLeadTransition(from, to)).toEqual(expected);
          } else {
            expect(evaluateLeadTransition(from, to, "Qualified early")).toEqual(expected);
            expect(() => evaluateLeadTransition(from, to)).toThrow("reason");
          }
        } else {
          expect(evaluateLeadTransition(from, to, "Scope changed")).toEqual({
            from, to, direction: "BACKWARD", skippedStages: []
          });
          expect(() => evaluateLeadTransition(from, to)).toThrow("reason");
        }
      }
    }
  });

  it("rejects every transition originating from a terminal stage", () => {
    for (const from of ["WON", "LOST"] as const) {
      for (const to of LEAD_STAGES) {
        expect(() => evaluateLeadTransition(from, to, "Any reason")).toThrow(
          from === to ? "different stage" : "terminal"
        );
      }
    }
  });

  it("enforces trimmed reason length boundaries for required-reason transitions", () => {
    expect(() => evaluateLeadTransition("NEW", "PROPOSAL", "  ab  ")).toThrow();
    expect(() => evaluateLeadTransition("NEW", "PROPOSAL", " abc ")).not.toThrow();
    expect(() => evaluateLeadTransition("NEW", "PROPOSAL", "x".repeat(1001))).toThrow();
    expect(() => evaluateLeadTransition("NEW", "PROPOSAL", "x".repeat(1000))).not.toThrow();
  });

  it("rejects same-stage and terminal-origin transitions", () => {
    expect(() => evaluateLeadTransition("NEW", "NEW")).toThrow();
    expect(() => evaluateLeadTransition("WON", "LOST", "reason")).toThrow();
    expect(() => evaluateLeadTransition("LOST", "NEW")).toThrow();
  });

  it("rejects invalid runtime stages", () => {
    expect(() => evaluateLeadTransition("UNKNOWN" as LeadStage, "NEW")).toThrow("Invalid lead stage");
    expect(() => evaluateLeadTransition("NEW", "UNKNOWN" as LeadStage)).toThrow("Invalid lead stage");
  });

  it("does not mutate the supplied transition evidence", () => {
    const evidence = Object.freeze({ from: "NEW" as const, to: "PROPOSAL" as const, reason: "Qualified early" });
    const before = { ...evidence };
    evaluateLeadTransition(evidence.from, evidence.to, evidence.reason);
    expect(evidence).toEqual(before);
  });

  it("isolates returned skipped-stage arrays from constants and later results", () => {
    const originalStages = [...LEAD_STAGES];
    const result = evaluateLeadTransition("NEW", "PROPOSAL", "Qualified early");
    result.skippedStages.splice(0, result.skippedStages.length, "WON");

    expect(LEAD_STAGES).toEqual(originalStages);
    expect(evaluateLeadTransition("NEW", "PROPOSAL", "Qualified early").skippedStages)
      .toEqual(["CONTACTED", "MEETING_DISCUSSION"]);
  });
});

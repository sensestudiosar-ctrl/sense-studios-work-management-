import {
  DEFAULT_DESIGN_PROJECT_STAGES,
  DEFAULT_TURNKEY_PROJECT_STAGES,
  type DefaultProjectStage
} from "./project-template-defaults.js";

describe("default project template stage sequences", () => {
  it("matches the approved Design sequence in source order", () => {
    expect(DEFAULT_DESIGN_PROJECT_STAGES.map(({ key, label, deliveryType }) => [key, label, deliveryType])).toEqual([
      ["SITE_MEASUREMENT", "Site Measurement", "DESIGN"],
      ["REQUIREMENT_COLLECTION", "Requirement Collection", "DESIGN"],
      ["PLANNING", "Planning", "DESIGN"],
      ["INTERNAL_REVIEW", "Internal Review", "DESIGN"],
      ["CLIENT_REVIEW", "Client Review", "DESIGN"],
      ["CORRECTIONS", "Corrections", "DESIGN"],
      ["THREE_D_DESIGN", "3D Design", "DESIGN"],
      ["CLIENT_APPROVAL", "Client Approval", "DESIGN"],
      ["WORKING_DRAWINGS", "Working Drawings", "DESIGN"],
      ["FINAL_DRAWINGS", "Final Drawings", "DESIGN"],
      ["HANDOVER", "Handover", "DESIGN"]
    ]);
  });

  it("matches the approved Turnkey sequence in source order", () => {
    expect(DEFAULT_TURNKEY_PROJECT_STAGES.map(({ key, label, deliveryType }) => [key, label, deliveryType])).toEqual([
      ["DESIGN_APPROVAL", "Design Approval", "TURNKEY"],
      ["BOQ", "BOQ", "TURNKEY"],
      ["COST_APPROVAL", "Cost Approval", "TURNKEY"],
      ["MATERIAL_SELECTION", "Material Selection", "TURNKEY"],
      ["PROCUREMENT", "Procurement", "TURNKEY"],
      ["FACTORY_PRODUCTION", "Factory Production", "TURNKEY"],
      ["SITE_EXECUTION", "Site Execution", "TURNKEY"],
      ["QUALITY_CHECKS", "Quality Checks", "TURNKEY"],
      ["SNAG_LIST", "Snag List", "TURNKEY"],
      ["FINAL_HANDOVER", "Final Handover", "TURNKEY"]
    ]);
  });

  it("contains no completion state and freezes both arrays and their entries", () => {
    for (const stages of [DEFAULT_DESIGN_PROJECT_STAGES, DEFAULT_TURNKEY_PROJECT_STAGES]) {
      expect(stages.some((stage) => /complete|completed|done/i.test(`${stage.key} ${stage.label}`))).toBe(false);
      expect(Object.isFrozen(stages)).toBe(true);
      for (const stage of stages) expect(Object.isFrozen(stage)).toBe(true);
    }

    expect(() => {
      (DEFAULT_DESIGN_PROJECT_STAGES as DefaultProjectStage[]).push({
        key: "EXTRA",
        label: "Extra",
        deliveryType: "DESIGN"
      });
    }).toThrow(TypeError);
    expect(() => {
      (DEFAULT_TURNKEY_PROJECT_STAGES[0] as { label: string }).label = "Changed";
    }).toThrow(TypeError);
  });
});

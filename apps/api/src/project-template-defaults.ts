/** Reference stage sequences from approved requirements R-014.a and R-015.a. */
export type ProjectDeliveryType = "DESIGN" | "TURNKEY";

export interface DefaultProjectStage {
  readonly key: string;
  readonly label: string;
  readonly deliveryType: ProjectDeliveryType;
}

function freezeStages(
  deliveryType: ProjectDeliveryType,
  stages: readonly (readonly [key: string, label: string])[]
): readonly DefaultProjectStage[] {
  return Object.freeze(stages.map(([key, label]) => Object.freeze({ key, label, deliveryType })));
}

export const DEFAULT_DESIGN_PROJECT_STAGES = freezeStages("DESIGN", [
  ["SITE_MEASUREMENT", "Site Measurement"],
  ["REQUIREMENT_COLLECTION", "Requirement Collection"],
  ["PLANNING", "Planning"],
  ["INTERNAL_REVIEW", "Internal Review"],
  ["CLIENT_REVIEW", "Client Review"],
  ["CORRECTIONS", "Corrections"],
  ["THREE_D_DESIGN", "3D Design"],
  ["CLIENT_APPROVAL", "Client Approval"],
  ["WORKING_DRAWINGS", "Working Drawings"],
  ["FINAL_DRAWINGS", "Final Drawings"],
  ["HANDOVER", "Handover"]
]);

export const DEFAULT_TURNKEY_PROJECT_STAGES = freezeStages("TURNKEY", [
  ["DESIGN_APPROVAL", "Design Approval"],
  ["BOQ", "BOQ"],
  ["COST_APPROVAL", "Cost Approval"],
  ["MATERIAL_SELECTION", "Material Selection"],
  ["PROCUREMENT", "Procurement"],
  ["FACTORY_PRODUCTION", "Factory Production"],
  ["SITE_EXECUTION", "Site Execution"],
  ["QUALITY_CHECKS", "Quality Checks"],
  ["SNAG_LIST", "Snag List"],
  ["FINAL_HANDOVER", "Final Handover"]
]);

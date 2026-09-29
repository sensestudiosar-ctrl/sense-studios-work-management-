import { parseTemplateDefinition, templateDefinitionSchema } from "./template-definition.js";

const valid = {
  deliveryType: "DESIGN",
  scopes: ["Architecture", "Interior design"],
  stages: [{ key: "PLANNING", label: "Planning" }],
  milestones: [{ key: "CLIENT_BRIEF", label: "Client brief", stageKey: "PLANNING", required: true, targetOffsetDays: 15 }],
  folders: ["01 Design/Issued"],
  fileNamingConvention: "{project}_{revision}"
};

describe("project template definition schema", () => {
  it("accepts and preserves a complete valid definition", () => {
    expect(parseTemplateDefinition(valid)).toEqual(valid);
  });

  it("rejects duplicate case-insensitive scopes, duplicate keys and missing milestone stages", () => {
    expect(templateDefinitionSchema.safeParse({ ...valid, scopes: ["Design", "design"] }).success).toBe(false);
    expect(templateDefinitionSchema.safeParse({ ...valid, stages: [{ key: "PLANNING", label: "Planning" }, { key: "PLANNING", label: "Plan" }] }).success).toBe(false);
    expect(templateDefinitionSchema.safeParse({ ...valid, milestones: [{ ...valid.milestones[0], stageKey: "UNKNOWN" }] }).success).toBe(false);
  });

  it("rejects traversal, absolute, drive and backslash folder paths", () => {
    for (const folder of ["../private", "a/../private", "/rooted", "C:/drive", "a\\b", "a//b", "a/./b"]) {
      expect(templateDefinitionSchema.safeParse({ ...valid, folders: [folder] }).success).toBe(false);
    }
  });

  it("limits folder paths to 240 characters and rejects case-insensitive duplicates", () => {
    expect(templateDefinitionSchema.safeParse({ ...valid, folders: ["a".repeat(240)] }).success).toBe(true);
    expect(templateDefinitionSchema.safeParse({ ...valid, folders: ["a".repeat(241)] }).success).toBe(false);
    expect(templateDefinitionSchema.safeParse({ ...valid, folders: ["01 Design/Issued", "01 design/issued"] }).success).toBe(false);
  });

  it("rejects unknown fields and out-of-range stage and milestone values", () => {
    expect(templateDefinitionSchema.safeParse({ ...valid, enabled: true }).success).toBe(false);
    expect(templateDefinitionSchema.safeParse({ ...valid, stages: [{ key: "bad-key", label: "Planning" }] }).success).toBe(false);
    expect(templateDefinitionSchema.safeParse({ ...valid, milestones: [{ ...valid.milestones[0], targetOffsetDays: 3651 }] }).success).toBe(false);
  });
});

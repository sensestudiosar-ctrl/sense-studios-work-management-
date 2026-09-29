import { z } from "zod";

const stageKey = z.string().min(1).max(80).regex(/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/);
const label = z.string().trim().min(2).max(160);

const stageSchema = z.object({ key: stageKey, label }).strict();

const milestoneSchema = z.object({
  key: stageKey,
  label,
  stageKey,
  required: z.boolean(),
  targetOffsetDays: z.number().int().min(0).max(3650).optional()
}).strict();

function isSafeLogicalPath(value: string): boolean {
  if (!value || value.includes("\\") || value.startsWith("/") || /^[A-Za-z]:/.test(value)) return false;
  const components = value.split("/");
  return components.every((component) => component.length > 0 && component !== "." && component !== ".." && !component.includes("\0"));
}

export const templateDefinitionSchema = z.object({
  deliveryType: z.enum(["DESIGN", "TURNKEY"]),
  scopes: z.array(z.string().trim().min(2).max(120)).min(1).max(12),
  stages: z.array(stageSchema).min(1).max(60),
  milestones: z.array(milestoneSchema).max(120),
  folders: z.array(z.string().min(1).max(240).refine(isSafeLogicalPath, "Invalid logical folder path")).max(100),
  fileNamingConvention: z.string().max(160).optional()
}).strict().superRefine((definition, context) => {
  const scopeNames = definition.scopes.map((scope) => scope.toLocaleLowerCase("en-US"));
  if (new Set(scopeNames).size !== scopeNames.length) {
    context.addIssue({ code: "custom", path: ["scopes"], message: "Scopes must be unique ignoring case" });
  }

  const stageKeys = definition.stages.map((stage) => stage.key);
  if (new Set(stageKeys).size !== stageKeys.length) {
    context.addIssue({ code: "custom", path: ["stages"], message: "Stage keys must be unique" });
  }
  const availableStageKeys = new Set(stageKeys);

  const milestoneKeys = definition.milestones.map((milestone) => milestone.key);
  if (new Set(milestoneKeys).size !== milestoneKeys.length) {
    context.addIssue({ code: "custom", path: ["milestones"], message: "Milestone keys must be unique" });
  }
  definition.milestones.forEach((milestone, index) => {
    if (!availableStageKeys.has(milestone.stageKey)) {
      context.addIssue({ code: "custom", path: ["milestones", index, "stageKey"], message: "Milestone stage does not exist" });
    }
  });

  const folderNames = definition.folders.map((folder) => folder.toLocaleLowerCase("en-US"));
  if (new Set(folderNames).size !== folderNames.length) {
    context.addIssue({ code: "custom", path: ["folders"], message: "Folder paths must be unique ignoring case" });
  }
});

export type TemplateDefinition = z.infer<typeof templateDefinitionSchema>;

export function parseTemplateDefinition(value: unknown): TemplateDefinition {
  return templateDefinitionSchema.parse(value);
}

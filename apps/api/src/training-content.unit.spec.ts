import { BadRequestException } from "@nestjs/common";
import { sanitizeTrainingAssessmentContent, validateTrainingAssessmentContent } from "./training-content.js";

const content = { blocks: [{ type: "TEXT", text: "Read the safe setup." }], assessment: { criteria: "Demonstrates safe setup", practicalRequired: false, minimumCorrect: 1, quiz: [{ id: "q1", prompt: "Which step?", options: [{ id: "a", label: "Check" }, { id: "b", label: "Skip" }], correctOptionIds: ["a"] }] } };

describe("Training module assessment content", () => {
  it("requires a human-authored threshold and removes only answer keys in safe DTOs", () => {
    expect(validateTrainingAssessmentContent(content)?.minimumCorrect).toBe(1);
    const safe = sanitizeTrainingAssessmentContent(content, { revealAnswerKey: false });
    expect(safe.assessment.minimumCorrect).toBe(1);
    expect(safe.assessment.quiz[0]).not.toHaveProperty("correctOptionIds");
    expect(sanitizeTrainingAssessmentContent(content, { revealAnswerKey: true }).assessment.quiz[0].correctOptionIds).toEqual(["a"]);
  });
  it("rejects missing thresholds, duplicate identifiers, unknown keys, and dangling correct choices", () => {
    expect(() => validateTrainingAssessmentContent({ ...content, assessment: { ...content.assessment, minimumCorrect: undefined } })).toThrow(BadRequestException);
    expect(() => validateTrainingAssessmentContent({ ...content, assessment: { ...content.assessment, quiz: [{ ...content.assessment.quiz[0], options: [...content.assessment.quiz[0].options, { id: "a", label: "Duplicate" }] }] } })).toThrow(BadRequestException);
    expect(() => validateTrainingAssessmentContent({ ...content, assessment: { ...content.assessment, quiz: [{ ...content.assessment.quiz[0], correctOptionIds: ["missing"] }] } })).toThrow(BadRequestException);
    expect(() => validateTrainingAssessmentContent({ ...content, assessment: { ...content.assessment, extra: true } })).toThrow(BadRequestException);
  });
});

import { BadRequestException } from "@nestjs/common";

export type TrainingQuestion = {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  correctOptionIds: string[];
};
export type TrainingAssessment = {
  criteria: string;
  quiz?: TrainingQuestion[];
  minimumCorrect?: number;
  practicalRequired: boolean;
};

const text = (value: unknown, min: number, max: number): value is string =>
  typeof value === "string" && value.trim().length >= min && value.length <= max &&
  !Array.from(value).some((character) => { const code = character.charCodeAt(0); return code <= 8 || code === 11 || code === 12 || code >= 14 && code <= 31 || code === 127; }) && !/<\s*\/?\s*[a-z!][^>]*>/i.test(value);

/** Validates the assessment member of a MODULE content root. `null` means no assessment was authored. */
export function validateTrainingAssessmentContent(content: unknown): TrainingAssessment | null {
  if (!content || typeof content !== "object" || Array.isArray(content)) throw new BadRequestException("Invalid MODULE content");
  const root = content as Record<string, unknown>;
  if (!("assessment" in root)) return null;
  const raw = root.assessment;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid training assessment");
  const value = raw as Record<string, unknown>;
  const allowed = ["criteria", "quiz", "minimumCorrect", "practicalRequired"];
  if (Object.keys(value).some((key) => !allowed.includes(key)) || !text(value.criteria, 1, 4000) || typeof value.practicalRequired !== "boolean") throw new BadRequestException("Invalid training assessment");
  if (value.quiz === undefined) {
    if (value.minimumCorrect !== undefined) throw new BadRequestException("minimumCorrect requires an authored quiz");
    return { criteria: value.criteria, practicalRequired: value.practicalRequired };
  }
  if (!Array.isArray(value.quiz) || value.quiz.length < 1 || value.quiz.length > 30 || !Number.isInteger(value.minimumCorrect) || (value.minimumCorrect as number) < 0 || (value.minimumCorrect as number) > value.quiz.length) throw new BadRequestException("A quiz requires an explicit valid minimumCorrect");
  const questionIds = new Set<string>();
  const quiz: TrainingQuestion[] = value.quiz.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new BadRequestException("Invalid quiz question");
    const q = item as Record<string, unknown>;
    if (Object.keys(q).some((key) => !["id", "prompt", "options", "correctOptionIds"].includes(key)) || !text(q.id, 1, 80) || !text(q.prompt, 1, 1000) || questionIds.has(q.id) || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 12 || !Array.isArray(q.correctOptionIds) || q.correctOptionIds.length < 1) throw new BadRequestException("Invalid quiz question");
    questionIds.add(q.id);
    const optionIds = new Set<string>();
    const options = q.options.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new BadRequestException("Invalid quiz option");
      const o = item as Record<string, unknown>;
      if (Object.keys(o).some((key) => !["id", "label"].includes(key)) || !text(o.id, 1, 80) || !text(o.label, 1, 500) || optionIds.has(o.id)) throw new BadRequestException("Invalid quiz option");
      optionIds.add(o.id);
      return { id: o.id, label: o.label };
    });
    const correctOptionIds = q.correctOptionIds.map((id) => {
      if (!text(id, 1, 80) || !optionIds.has(id)) throw new BadRequestException("Quiz answer key references an unknown option");
      return id;
    });
    if (new Set(correctOptionIds).size !== correctOptionIds.length) throw new BadRequestException("Quiz answer keys must be unique");
    return { id: q.id, prompt: q.prompt, options, correctOptionIds };
  });
  return { criteria: value.criteria, quiz, minimumCorrect: value.minimumCorrect as number, practicalRequired: value.practicalRequired };
}

/** Clone a MODULE content root and redact answer keys for trainee/read-only callers. */
export function sanitizeTrainingAssessmentContent<T extends Record<string, unknown>>(content: T, options: { revealAnswerKey: boolean }): T {
  const copy = JSON.parse(JSON.stringify(content)) as T;
  if (!options.revealAnswerKey && copy.assessment && typeof copy.assessment === "object" && !Array.isArray(copy.assessment)) {
    const assessment = copy.assessment as Record<string, unknown>;
    if (Array.isArray(assessment.quiz)) for (const question of assessment.quiz) {
      if (question && typeof question === "object" && !Array.isArray(question)) delete (question as Record<string, unknown>).correctOptionIds;
    }
  }
  return copy;
}

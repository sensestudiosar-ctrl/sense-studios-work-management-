export const AI_PROVIDER = "deterministic-evidence-v1" as const;
export const AI_PROVIDER_VERSION = "1" as const;

export type EvidenceReference = { kind: string; id: string; projectId?: string | undefined; taskId?: string | undefined; employeeId?: string | undefined; purpose?: string | undefined; from?: string | undefined; to?: string | undefined };
export type AssistanceCandidate = {
  employeeId: string;
  label: string;
  purpose: "PRIMARY_OWNER" | "COLLABORATOR" | "REVIEWER";
  teamId: string;
  eligible: boolean;
  factors: Array<{ key: string; label: string; value: string | number | boolean | null; source: EvidenceReference | null }>;
  unavailable?: boolean;
};
export type AuthorizedEvidence = {
  kind: "DAILY" | "PROJECT" | "MANAGEMENT" | "ASSIGNMENT";
  scope: Record<string, string | boolean | null>;
  from: string;
  to: string;
  facts: Array<{ source: EvidenceReference; label: string; field: string; value: string | number | boolean | null; sourceDate: string | null }>;
  candidates: AssistanceCandidate[];
  unavailableFactors: string[];
  limitations: string[];
};
export type AssistanceResult = {
  kind: AuthorizedEvidence["kind"];
  provider: typeof AI_PROVIDER;
  providerVersion: typeof AI_PROVIDER_VERSION;
  generatedAt: string;
  scope: AuthorizedEvidence["scope"];
  summary: string;
  facts: AuthorizedEvidence["facts"];
  candidates: AssistanceCandidate[];
  unavailableFactors: string[];
  limitations: string[];
};

const forbiddenKey = /(?:password|passkey|credential|session|csrf|token|recovery|secret|private.?key|nas.?path|file.?path|storage.?key|raw.?media|chain.?of.?thought)/i;
const safeScalar = (value: unknown): value is string | number | boolean | null => value === null || typeof value === "string" && value.length <= 500 || typeof value === "number" && Number.isFinite(value) || typeof value === "boolean";

export function validateAuthorizedEvidence(value: AuthorizedEvidence): void {
  if (!value || !["DAILY", "PROJECT", "MANAGEMENT", "ASSIGNMENT"].includes(value.kind)) throw new Error("Unsupported assistance evidence kind");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.from) || !/^\d{4}-\d{2}-\d{2}$/.test(value.to) || value.from > value.to) throw new Error("Assistance evidence date scope is invalid");
  for (const fact of value.facts) {
    if (!fact.source || !fact.source.kind || !fact.source.id || !fact.field || forbiddenKey.test(fact.field) || !safeScalar(fact.value)) throw new Error("Assistance fact is outside the scalar evidence contract");
    if (fact.sourceDate !== null && !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(fact.sourceDate)) throw new Error("Assistance source date is invalid");
  }
  for (const candidate of value.candidates) {
    if (!candidate.employeeId || !candidate.label || candidate.label.length > 200 || !candidate.teamId || candidate.eligible !== true || !["PRIMARY_OWNER", "COLLABORATOR", "REVIEWER"].includes(candidate.purpose)) throw new Error("Assistance candidate is not currently eligible");
    for (const factor of candidate.factors) if (!factor.key || forbiddenKey.test(factor.key) || !factor.label || !safeScalar(factor.value)) throw new Error("Assistance candidate factor is invalid");
  }
  for (const [key, item] of Object.entries(value.scope)) if (forbiddenKey.test(key) || !(typeof item === "string" || typeof item === "boolean" || item === null)) throw new Error("Assistance scope contains an unsupported value");
  if (value.facts.length > 500 || value.candidates.length > 250 || value.unavailableFactors.length > 100 || value.limitations.length > 50) throw new Error("Assistance evidence exceeds its bounded size");
}

export function generateEvidenceResult(evidence: AuthorizedEvidence, generatedAt = new Date().toISOString()): AssistanceResult {
  validateAuthorizedEvidence(evidence);
  const candidates = [...evidence.candidates].sort((a, b) => a.employeeId.localeCompare(b.employeeId));
  return {
    kind: evidence.kind,
    provider: AI_PROVIDER,
    providerVersion: AI_PROVIDER_VERSION,
    generatedAt,
    scope: { ...evidence.scope, from: evidence.from, to: evidence.to, ordering: "UNRANKED" },
    summary: `${evidence.kind === "ASSIGNMENT" ? "Explainable assignment candidates" : "Factual evidence summary"}; deterministic evidence assistance, not a prediction or final business decision. ${evidence.facts.length} authorized facts and ${candidates.length} currently eligible candidates are included.`,
    facts: evidence.facts.map((fact) => ({ ...fact, source: { ...fact.source } })),
    candidates,
    unavailableFactors: [...new Set(evidence.unavailableFactors)],
    limitations: [...new Set(["No live inference or external transmission is used.", "Suggestions do not execute assignments, reviews, deadlines, approvals or other domain actions.", ...evidence.limitations])]
  };
}

export function validateStoredResult(value: unknown, manifest: EvidenceReference[], eligibleEmployeeIds: Set<string>): asserts value is AssistanceResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Stored assistance result is invalid");
  const result = value as AssistanceResult;
  if (result.provider !== AI_PROVIDER || result.providerVersion !== AI_PROVIDER_VERSION || !Array.isArray(result.facts) || !Array.isArray(result.candidates)) throw new Error("Stored assistance result provider or shape is invalid");
  const references = new Set(manifest.map((item) => `${item.kind}:${item.id}`));
  for (const fact of result.facts) if (!references.has(`${fact.source.kind}:${fact.source.id}`)) throw new Error("Stored assistance result contains a fabricated source reference");
  for (const candidate of result.candidates) {
    if (!eligibleEmployeeIds.has(candidate.employeeId) || candidate.eligible !== true) throw new Error("Stored assistance result contains a fabricated candidate");
    for (const factor of candidate.factors) if (factor.source && !references.has(`${factor.source.kind}:${factor.source.id}`)) throw new Error("Stored assistance candidate contains a fabricated source reference");
  }
}

import { generateEvidenceResult, validateStoredResult, type AuthorizedEvidence } from "./ai-evidence.js";

const evidence = (): AuthorizedEvidence => ({
  kind: "ASSIGNMENT",
  scope: { taskId: "task-1", projectId: "project-1", currentTeamId: "team-1", broaderSearch: false },
  from: "2026-10-01",
  to: "2026-10-07",
  facts: [{ source: { kind: "TASK", id: "task-1", projectId: "project-1" }, label: "Task state", field: "status", value: "IN_PROGRESS", sourceDate: null }],
  candidates: [
    { employeeId: "employee-b", label: "B", purpose: "PRIMARY_OWNER", teamId: "team-1", eligible: true, factors: [] },
    { employeeId: "employee-a", label: "A", purpose: "PRIMARY_OWNER", teamId: "team-1", eligible: true, factors: [] }
  ],
  unavailableFactors: ["No configured skill policy"],
  limitations: []
});

describe("deterministic assistance evidence adapter", () => {
  it("emits stable unranked candidates and only supplied authorized facts", () => {
    const first = generateEvidenceResult(evidence(), "2026-10-07T12:00:00.000Z");
    const second = generateEvidenceResult(evidence(), "2026-10-07T12:00:00.000Z");
    expect(first).toEqual(second);
    expect(first.provider).toBe("deterministic-evidence-v1");
    expect(first.providerVersion).toBe("1");
    expect(first.scope.ordering).toBe("UNRANKED");
    expect(first.candidates.map((candidate) => candidate.employeeId)).toEqual(["employee-a", "employee-b"]);
    expect(first.facts[0]?.source).toEqual({ kind: "TASK", id: "task-1", projectId: "project-1" });
    validateStoredResult(first, [{ kind: "TASK", id: "task-1", projectId: "project-1" }], new Set(["employee-a", "employee-b"]));
  });

  it("rejects private factor names and fabricated retained references or candidates", () => {
    const unsafe = evidence();
    unsafe.facts[0]!.field = "sessionToken";
    expect(() => generateEvidenceResult(unsafe)).toThrow("scalar evidence contract");
    const result = generateEvidenceResult(evidence());
    expect(() => validateStoredResult(result, [], new Set(["employee-a", "employee-b"]))).toThrow("fabricated source");
    expect(() => validateStoredResult(result, [{ kind: "TASK", id: "task-1" }], new Set(["employee-a"]))).toThrow("fabricated candidate");
  });
});

import {
  calculateSnapshot,
  evidenceChanged,
  delaySchema,
  families,
  metrics,
  performanceCommandSchema,
  policySchema,
  validatePolicy,
  type PerformancePolicy,
} from "./performance-calculations.js";

// Fictional Owner-entered values used only to exercise the formula contract.
// These fixture numbers are not an active/default organizational policy.
const fictionalEmployeePolicy = (overrides: Partial<PerformancePolicy> = {}): PerformancePolicy => policySchema.parse({
  family: "EMPLOYEE",
  groupKey: "fictional-design-team",
  label: "Fictional test-only employee policy",
  effectiveFrom: "2026-01-01",
  components: [
    { metric: "REVIEW_FIRST_PASS", weight: 40, min: 0, max: 100, direction: "HIGHER", required: true },
    { metric: "REVIEW_CORRECTION_FREE", weight: 20, min: 0, max: 100, direction: "HIGHER", required: false },
    { metric: "TASK_ON_TIME", weight: 20, min: 0, max: 100, direction: "HIGHER", required: true },
    { metric: "ATTENDANCE_VERIFIED", weight: 10, min: 0, max: 100, direction: "HIGHER", required: false },
    { metric: "TIME_EFFICIENCY", weight: 10, min: 0, max: 100, direction: "HIGHER", required: false },
  ],
  attendanceMaxWeight: 10,
  efficiencyMaxWeight: 10,
  strengthAt: 80,
  weaknessBelow: 50,
  thresholds: { criticalBelow: 40, delayedBelow: 60, atRiskBelow: 80 },
  ...overrides,
});

const testEvidence = [{ kind: "TEST_FIXTURE", id: "fixture-1", version: 1, description: "Fictional test evidence", values: { sample: true } }];

describe("S23 performance calculation contract", () => {
  it("compares source evidence independently of PostgreSQL JSONB key and reference order", () => {
    const original = [{ kind: "TASK", id: "task-1", version: 3, values: { deadline: "2026-10-05", lateDays: 0 } }, { kind: "REVIEW_ROUND", id: "review-1", version: 2, values: { status: "APPROVED" } }];
    const restored = [{ values: { status: "APPROVED" }, version: 2, id: "review-1", kind: "REVIEW_ROUND" }, { values: { lateDays: 0, deadline: "2026-10-05" }, version: 3, id: "task-1", kind: "TASK" }];
    expect(evidenceChanged(original, restored)).toBe(false);
    expect(evidenceChanged(original, [...restored, { kind: "TASK", id: "task-2", version: 1, values: {} }])).toBe(true);
    expect(evidenceChanged(original, restored.map(reference => reference.kind === "TASK" ? { ...reference, version: 4 } : reference))).toBe(true);
  });

  it("normalizes, clamps and weights fictional Owner-configured values deterministically", () => {
    const result = calculateSnapshot(fictionalEmployeePolicy(), {
      REVIEW_FIRST_PASS: { raw: 75, evidence: testEvidence },
      REVIEW_CORRECTION_FREE: { raw: 120, evidence: testEvidence },
      TASK_ON_TIME: { raw: -5, evidence: testEvidence },
      ATTENDANCE_VERIFIED: { raw: 100, evidence: testEvidence },
      TIME_EFFICIENCY: { raw: 50, evidence: testEvidence },
    });

    expect(result).toMatchObject({ status: "SCORED", score: 65 });
    expect(result.components.map(component => component.normalized)).toEqual([75, 100, 0, 100, 50]);
    expect(result.components[0].evidence).toEqual(testEvidence);
  });

  it("returns insufficient evidence with no score when any required metric is absent", () => {
    const result = calculateSnapshot(fictionalEmployeePolicy(), {
      REVIEW_FIRST_PASS: { raw: 90, evidence: testEvidence },
      TASK_ON_TIME: { raw: null, evidence: [] },
    });

    expect(result.status).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.score).toBeNull();
    expect(result.missing).toEqual(["TASK_ON_TIME"]);
  });

  it("omits missing optional evidence and renormalizes over the available weights", () => {
    const result = calculateSnapshot(fictionalEmployeePolicy(), {
      REVIEW_FIRST_PASS: { raw: 80, evidence: testEvidence },
      TASK_ON_TIME: { raw: 40, evidence: testEvidence },
      REVIEW_CORRECTION_FREE: { raw: null, evidence: [] },
      ATTENDANCE_VERIFIED: { raw: null, evidence: [] },
      TIME_EFFICIENCY: { raw: null, evidence: [] },
    });

    // 40*80 + 20*40, renormalized over the two available weights (60).
    expect(result.score).toBe(66.67);
    expect(result.status).toBe("SCORED");
    expect(result.missing).toEqual([]);
  });

  it("does not let missing optional quality evidence make a speed-only employee result", () => {
    const policy = fictionalEmployeePolicy();
    const result = calculateSnapshot({ ...policy, components: policy.components.map(component => ({ ...component, required: component.metric === "TASK_ON_TIME" })) }, {
      REVIEW_FIRST_PASS: { raw: null, evidence: [] },
      REVIEW_CORRECTION_FREE: { raw: null, evidence: [] },
      TASK_ON_TIME: { raw: 100, evidence: testEvidence },
      ATTENDANCE_VERIFIED: { raw: null, evidence: [] },
      TIME_EFFICIENCY: { raw: null, evidence: [] },
    });

    expect(result).toMatchObject({ status: "INSUFFICIENT_EVIDENCE", score: null, missing: ["QUALITY_EVIDENCE"] });
  });

  it("blocks optional renormalization that exceeds the approved low-weight caps", () => {
    const result = calculateSnapshot(fictionalEmployeePolicy(), {
      REVIEW_FIRST_PASS: { raw: 90, evidence: testEvidence },
      REVIEW_CORRECTION_FREE: { raw: null, evidence: [] },
      TASK_ON_TIME: { raw: 80, evidence: testEvidence },
      ATTENDANCE_VERIFIED: { raw: 100, evidence: testEvidence },
      TIME_EFFICIENCY: { raw: null, evidence: [] },
    });

    // Attendance becomes 10/70 of available weight, above the explicitly configured 10% cap.
    expect(result).toMatchObject({ status: "INSUFFICIENT_EVIDENCE", score: null, missing: ["APPROVED_LOW_WEIGHT_LIMIT"] });
  });

  it("requires quality to outweigh speed and enforces configured low-weight caps", () => {
    expect(() => validatePolicy(fictionalEmployeePolicy({ components: [
      { metric: "REVIEW_FIRST_PASS", weight: 30, min: 0, max: 100, direction: "HIGHER", required: true },
      { metric: "REVIEW_CORRECTION_FREE", weight: 20, min: 0, max: 100, direction: "HIGHER", required: false },
      { metric: "TASK_ON_TIME", weight: 50, min: 0, max: 100, direction: "HIGHER", required: true },
    ] }))).toThrow(/Quality must outweigh speed/);

    expect(() => validatePolicy(fictionalEmployeePolicy({ components: [
      { metric: "REVIEW_FIRST_PASS", weight: 59, min: 0, max: 100, direction: "HIGHER", required: true },
      { metric: "TASK_ON_TIME", weight: 20, min: 0, max: 100, direction: "HIGHER", required: true },
      { metric: "ATTENDANCE_VERIFIED", weight: 11, min: 0, max: 100, direction: "HIGHER", required: false },
      { metric: "TIME_EFFICIENCY", weight: 10, min: 0, max: 100, direction: "HIGHER", required: false },
    ] }))).toThrow(/Quality must outweigh speed/);

    expect(() => validatePolicy(fictionalEmployeePolicy({ components: [
      { metric: "REVIEW_FIRST_PASS", weight: 60, min: 0, max: 100, direction: "HIGHER", required: true },
      { metric: "TASK_ON_TIME", weight: 20, min: 0, max: 100, direction: "HIGHER", required: true },
      { metric: "ATTENDANCE_VERIFIED", weight: 10, min: 0, max: 100, direction: "HIGHER", required: false },
      { metric: "TIME_EFFICIENCY", weight: 10, min: 0, max: 100, direction: "HIGHER", required: false },
    ], attendanceMaxWeight: 9 }))).toThrow(/Quality must outweigh speed/);
  });

  it("keeps employee, leader and project health families separate", () => {
    expect(families).toEqual(["EMPLOYEE", "LEADER", "DESIGN", "TURNKEY"]);
    expect(metrics.find(metric => metric.key === "LEADER_REVIEW_TURNAROUND")?.families).toEqual(["LEADER"]);
    expect(metrics.find(metric => metric.key === "SITE_QUALITY")?.families).toEqual(["TURNKEY"]);
    expect(() => validatePolicy(fictionalEmployeePolicy({ components: [
      { metric: "LEADER_REVIEW_TURNAROUND", weight: 100, min: 0, max: 100, direction: "LOWER", required: true },
    ] }))).toThrow(/Metric range or family invalid/);
    expect(() => validatePolicy(policySchema.parse({
      ...fictionalEmployeePolicy(), family: "DESIGN", groupKey: "TURNKEY",
      components: [{ metric: "PROJECT_TASK_ON_TIME", weight: 100, min: 0, max: 100, direction: "HIGHER", required: true }],
    }))).toThrow(/Project policy group/);
  });

  it("applies lower-is-better normalization and strict health threshold boundaries", () => {
    const leader = policySchema.parse({
      family: "LEADER", groupKey: "fictional-leader-test", label: "Fictional test-only leader policy", effectiveFrom: "2026-01-01",
      components: [{ metric: "LEADER_REVIEW_TURNAROUND", weight: 100, min: 0, max: 100, direction: "LOWER", required: true }],
      attendanceMaxWeight: 0, efficiencyMaxWeight: 0, strengthAt: 80, weaknessBelow: 50,
      thresholds: { criticalBelow: 40, delayedBelow: 60, atRiskBelow: 80 },
    });
    expect(calculateSnapshot(leader, { LEADER_REVIEW_TURNAROUND: { raw: 25, evidence: testEvidence } }).score).toBe(75);
    const health = policySchema.parse({
      ...fictionalEmployeePolicy(), family: "DESIGN", groupKey: "DESIGN", label: "Fictional test-only Design health policy",
      components: [{ metric: "PROJECT_TASK_ON_TIME", weight: 100, min: 0, max: 100, direction: "HIGHER", required: true }],
    });
    const status = (score: number) => calculateSnapshot(health, { PROJECT_TASK_ON_TIME: { raw: score, evidence: testEvidence } }).healthStatus;
    expect([status(39.99), status(40), status(60), status(80)]).toEqual(["Critical", "Delayed", "At Risk", "On Track"]);
  });

  it("requires explicit numeric policy configuration and strict, valid date/DTO inputs", () => {
    expect(policySchema.safeParse({ family: "EMPLOYEE", groupKey: "x" }).success).toBe(false);
    const command = {
      commandId: "00000000-0000-4000-8000-000000000001", reason: "Fictional unit test",
      operation: "EMPLOYEE_SNAPSHOT", employeeId: "00000000-0000-4000-8000-000000000002", family: "EMPLOYEE",
      from: "2024-02-29", to: "2024-03-01",
    };
    expect(performanceCommandSchema.safeParse(command).success).toBe(true);
    expect(performanceCommandSchema.safeParse({ ...command, from: "2024-02-30" }).success).toBe(false);
    expect(performanceCommandSchema.safeParse({ ...command, unexpected: "ignored fields are not allowed" }).success).toBe(false);

    const delay = {
      cause: "CLIENT", days: 1, sourceKind: "TASK_DATE", sourceId: "00000000-0000-4000-8000-000000000003",
      external: true, from: "2024-02-29", to: "2024-03-01", summary: "Approved test fixture allocation", supersedesId: null,
    };
    expect(delaySchema.safeParse(delay).success).toBe(true);
    expect(delaySchema.safeParse({ ...delay, days: 0 }).success).toBe(false);
    expect(delaySchema.safeParse({ ...delay, to: "2024-02-30" }).success).toBe(false);
    expect(delaySchema.safeParse({ ...delay, extra: true }).success).toBe(false);
  });
});


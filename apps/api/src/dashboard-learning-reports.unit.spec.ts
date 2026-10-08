import { ForbiddenException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { DashboardService } from "./dashboard.service.js";
import type { ProjectActor } from "./project.service.js";

const from = "2026-10-01", to = "2026-10-31";
const actor = { accountId: "owner-account", organizationId: "org", kind: "OWNER", sessionId: "current-session" } as ProjectActor & { sessionId: string };
type LearningManifest = Array<{ kind: string; id: string; parent?: Record<string, string>; keys?: string[]; from?: string; to?: string }>;
type LearningCollection = { table: { rows: Array<{ source: string; id: string; field: string }> }; manifest: LearningManifest };
type LearningCollector = {
  collect(actor: ProjectActor, filter: { category: string; from: string; to: string }): Promise<LearningCollection>;
  authorizeManifest(actor: ProjectActor, manifest: unknown, tx: object): Promise<void>;
};

function fixture() {
  const skills = {
    setup: jest.fn(async () => ({ employees: [{ id: "employee-1", label: "E-001" }] })),
    reportEvidence: jest.fn(async () => ({
      ratings: [{ id: "rating-1", skillId: "skill-1", level: "ADVANCED", version: 2 }],
      changes: [{ id: "change-1", ratingId: "rating-1", fromLevel: "INTERMEDIATE", toLevel: "ADVANCED", occurredAt: new Date("2026-10-04T00:00:00.000Z") }],
    })),
  };
  const training = {
    reportEvidence: jest.fn(async () => [{
      assignmentId: "assignment-1", employeeId: "employee-1", state: "COMPLETED", moduleVersionId: "module-version-1", moduleVersion: 3,
      moduleTitle: "Published training", assignedAt: new Date("2026-10-03T00:00:00.000Z"),
      assessments: [{ id: "assessment-1", outcome: "PASSED", occurredAt: new Date("2026-10-05T00:00:00.000Z") }],
      effectiveness: [{ id: "effectiveness-1", date: "2026-10-06", observation: "Applied the authored practice" }],
    }]),
  };
  const library = {
    reportEvidence: jest.fn(async () => [{
      recordId: "sop-1", title: "Current SOP", versions: [{ publicationId: "publication-1", versionId: "sop-version-1", version: 2, publishedAt: new Date("2026-10-07T00:00:00.000Z"), acknowledgementId: "ack-1", employeeId: "employee-1", acknowledgedByAccountId: actor.accountId, acknowledgedAt: new Date("2026-10-08T00:00:00.000Z") }],
    }]),
  };
  const tx = {};
  const service = Object.create(DashboardService.prototype) as DashboardService;
  Object.assign(service, {
    database: { prisma: { $transaction: async (run: (client: typeof tx) => Promise<unknown>) => run(tx) } },
    active: jest.fn(async () => undefined),
    performance: { context: jest.fn(async () => ({ employees: [], projects: [] })) },
    skills, training, library,
  });
  return { service, skills, training, library, tx };
}

describe("S24 Learning report evidence boundaries", () => {
  it("builds one flat manifest entry per authorized source before saved-report transforms", async () => {
    const { service, skills, training, library } = fixture();
    const result = await (service as unknown as LearningCollector).collect(actor, { category: "skills_training", from, to });

    expect(new Set(result.manifest.map((item) => item.kind))).toEqual(new Set([
      "SKILL_RATING", "SKILL_CHANGE", "TRAINING_ASSIGNMENT", "TRAINING_ASSESSMENT", "TRAINING_EFFECTIVENESS", "LIBRARY_SOP_PUBLICATION", "LIBRARY_SOP_ACKNOWLEDGEMENT",
    ]));
    expect(result.manifest.every((item) => item.from === from && item.to === to && item.id && item.parent && item.keys?.length)).toBe(true);
    expect(result.manifest.find((item) => item.kind === "TRAINING_ASSESSMENT")).toMatchObject({ id: "assessment-1", parent: { assignmentId: "assignment-1", employeeId: "employee-1", moduleVersionId: "module-version-1" }, keys: ["outcome", "occurredAt"] });
    expect(result.manifest.find((item) => item.kind === "LIBRARY_SOP_ACKNOWLEDGEMENT")).toMatchObject({ id: "ack-1", parent: { recordId: "sop-1", versionId: "sop-version-1", employeeId: "employee-1", actorAccountId: actor.accountId }, keys: ["acknowledgedAt"] });
    expect(result.table.rows.some((row) => row.source === "TRAINING_ASSESSMENT" && row.id === "assessment-1" && row.field === "outcome")).toBe(true);
    expect(skills.reportEvidence).toHaveBeenCalledWith(actor, "employee-1", from, to);
    expect(training.reportEvidence).toHaveBeenCalledWith(actor, from, to);
    expect(library.reportEvidence).toHaveBeenCalledWith(actor, from, to);
  });

  it("reauthorizes exact source and parent identities through current owning ports without comparing frozen values", async () => {
    const { service, skills, training, library, tx } = fixture();
    const result = await (service as unknown as LearningCollector).collect(actor, { category: "skills_training", from, to });
    skills.reportEvidence.mockImplementation(async () => ({
      ratings: [{ id: "rating-1", skillId: "skill-1", level: "EXPERT", version: 3 }],
      changes: [{ id: "change-1", ratingId: "rating-1", fromLevel: "ADVANCED", toLevel: "EXPERT", occurredAt: new Date("2026-10-04T00:00:00.000Z") }],
    }));
    training.reportEvidence.mockImplementation(async () => [{
      assignmentId: "assignment-1", employeeId: "employee-1", state: "CHANGES_REQUIRED", moduleVersionId: "module-version-1", moduleVersion: 3,
      moduleTitle: "Published training", assignedAt: new Date("2026-10-03T00:00:00.000Z"),
      assessments: [{ id: "assessment-1", outcome: "CHANGES_REQUIRED", occurredAt: new Date("2026-10-05T00:00:00.000Z") }],
      effectiveness: [{ id: "effectiveness-1", date: "2026-10-06", observation: "Updated factual observation" }],
    }]);
    await (service as unknown as LearningCollector).authorizeManifest(actor, result.manifest, tx);
    expect(skills.reportEvidence).toHaveBeenCalledWith(actor, "employee-1", from, to);
    expect(training.reportEvidence).toHaveBeenCalledWith(actor, from, to);
    expect(library.reportEvidence).toHaveBeenCalledWith(actor, from, to);

    const wrongOwnerAck = result.manifest.map((item) => item.kind === "LIBRARY_SOP_ACKNOWLEDGEMENT" ? { ...item, parent: { ...item.parent!, actorAccountId: "someone-else" } } : item);
    await expect((service as unknown as LearningCollector).authorizeManifest(actor, wrongOwnerAck, tx)).rejects.toBeInstanceOf(ForbiddenException);
    expect(training.reportEvidence).toHaveBeenCalledTimes(3);
  });

  it("does not call Learning source ports for sessionless report workers", async () => {
    const { service, skills, training, library } = fixture();
    await expect((service as unknown as { collect(actor: ProjectActor, filter: { category: string; from: string; to: string }): Promise<unknown> }).collect({ ...actor, sessionId: undefined }, { category: "skills_training", from, to })).rejects.toBeInstanceOf(ForbiddenException);
    expect(skills.reportEvidence).not.toHaveBeenCalled();
    expect(training.reportEvidence).not.toHaveBeenCalled();
    expect(library.reportEvidence).not.toHaveBeenCalled();
  });
});

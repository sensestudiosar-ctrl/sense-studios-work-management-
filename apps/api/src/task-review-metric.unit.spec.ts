import { TaskStatus, TaskType } from "./generated/prisma/client.js";
import { REVIEW_METRIC_EXCLUDED, REVIEW_METRIC_STATES, reviewMetricWhere } from "./task-review-metric.js";
describe("Pending Reviews task lens", () => {
  it("has exactly the six canonical pending review/correction states", () => {
    expect(REVIEW_METRIC_STATES).toEqual(["SUBMITTED_INTERNAL_REVIEW", "IN_INTERNAL_REVIEW", "CORRECTIONS_REQUIRED", "SUBMITTED_CLIENT_REVIEW", "IN_CLIENT_REVIEW", "CLIENT_REVISION_REQUIRED"]);
  });
  it("includes unfinished correction tasks and excludes approved, completed and cancelled work", () => {
    expect(REVIEW_METRIC_EXCLUDED).toEqual(["INTERNAL_APPROVED", "CLIENT_APPROVED", "COMPLETED", "STOPPED_DUE_TO_PROJECT_CANCELLATION"]);
    expect(reviewMetricWhere()).toEqual({ AND: [{ status: { notIn: REVIEW_METRIC_EXCLUDED } }, { OR: [{ status: { in: REVIEW_METRIC_STATES } }, { type: TaskType.CORRECTION }] }] });
    expect(REVIEW_METRIC_STATES).not.toContain(TaskStatus.IN_PROGRESS);
  });
});

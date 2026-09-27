import { assertSafeDomainPayload, DOMAIN_EVENT_CATALOGUE, isDomainEventName } from "./domain-event-catalogue.js";

describe("versioned domain event catalogue", () => {
  it("defines stable project, task, review, client, document, workforce and analytics families", () => {
    for (const name of [
      "project.created", "task.assigned", "review.correction_requested", "client.approved",
      "document.issued", "time.logged", "leave.approved", "attendance.checked_in", "project_health.changed"
    ]) expect(isDomainEventName(name)).toBe(true);
    expect(isDomainEventName("project.unreviewed_custom_event")).toBe(false);
    expect(DOMAIN_EVENT_CATALOGUE["task.assigned"]).toEqual({ producer: "S09 tasks", subjectType: "task", schemaVersion: 1 });
  });

  it("rejects credential and unrestricted-storage data from event envelopes", () => {
    expect(() => assertSafeDomainPayload("project.created", { projectId: "opaque-id" })).not.toThrow();
    expect(() => assertSafeDomainPayload("project.created", { sessionToken: "never store" })).toThrow();
    expect(() => assertSafeDomainPayload("project.created", { attachmentPath: "\\\\nas01\\project\\file.pdf" })).toThrow();
    expect(() => assertSafeDomainPayload("unlisted.event", { subjectId: "id" })).toThrow();
  });
});

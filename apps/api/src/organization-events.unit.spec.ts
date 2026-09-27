import { jest } from "@jest/globals";
import { OrganizationEventType } from "./generated/prisma/client.js";
import { recordOrganizationMutation } from "./organization-events.js";

describe("S03 event canonicalization", () => {
  it.each([
    [OrganizationEventType.ORGANIZATION_CREATED, "organization.created", "organization"],
    [OrganizationEventType.BRANCH_CREATED, "organization.branch.created", "branch"],
    [OrganizationEventType.BRANCH_UPDATED, "organization.branch.updated", "branch"],
    [OrganizationEventType.TEAM_CREATED, "organization.team.created", "team"],
    [OrganizationEventType.TEAM_UPDATED, "organization.team.updated", "team"],
    [OrganizationEventType.JOB_ROLE_CREATED, "organization.job_role.created", "job_role"],
    [OrganizationEventType.JOB_ROLE_UPDATED, "organization.job_role.updated", "job_role"],
    [OrganizationEventType.EMPLOYEE_CREATED, "organization.employee.created", "employee"],
    [OrganizationEventType.EMPLOYEE_MEMBERSHIP_CHANGED, "organization.employee.membership_changed", "employee"],
    [OrganizationEventType.EMPLOYEE_JOB_ROLES_CHANGED, "organization.employee.job_roles_changed", "employee"],
    [OrganizationEventType.EMPLOYEE_SUSPENDED, "organization.employee.suspended", "employee"],
    [OrganizationEventType.ROLE_PERMISSION_CHANGED, "authorization.role_permission.changed", "role_permission"],
    [OrganizationEventType.EMPLOYEE_PERMISSION_CHANGED, "authorization.employee_permission.changed", "employee_permission"],
  ])("maps %s into audit, event and NTF outbox", async (eventType, eventName, subjectType) => {
    const occurredAt = new Date("2026-09-27T12:00:00.000Z");
    const tx = {
      organizationEvent: { create: jest.fn(async () => ({ id: "legacy-id", occurredAt })) },
      account: { findUnique: jest.fn(async () => ({ normalizedEmail: "owner@example.test" })) },
      auditEvent: { create: jest.fn(async () => ({ id: "audit-id" })) },
      domainEvent: { create: jest.fn(async () => ({ id: "domain-id" })) },
      outboxDelivery: { create: jest.fn(async () => ({ id: "outbox-id" })) },
    };

    await recordOrganizationMutation(tx as never, {
      organizationId: "org-id", actorId: "actor-id", subjectId: "subject-id", eventType,
      reason: "Approved unit fixture", after: { active: true },
    });

    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      eventKey: eventName, subjectType, subjectId: "subject-id", legacyOrganizationEventId: "legacy-id",
    }) });
    expect(tx.domainEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      eventName, subjectType, payload: { auditEventId: "audit-id", sourceOrganizationEventId: "legacy-id" },
    }) });
    expect(tx.outboxDelivery.create).toHaveBeenCalledWith({ data: { eventId: "domain-id", consumer: "NTF" } });
  });

  it("rejects obvious credential and unrestricted storage-path material before canonical writes", async () => {
    const tx = {
      organizationEvent: { create: jest.fn(async () => ({ id: "legacy-id", occurredAt: new Date() })) },
      account: { findUnique: jest.fn(async () => ({ normalizedEmail: "owner@example.test" })) },
      auditEvent: { create: jest.fn() }, domainEvent: { create: jest.fn() }, outboxDelivery: { create: jest.fn() },
    };
    await expect(recordOrganizationMutation(tx as never, {
      organizationId: "org-id", actorId: "actor-id", subjectId: "subject-id",
      eventType: OrganizationEventType.BRANCH_CREATED, reason: "Bearer abc123", after: { active: true },
    })).rejects.toThrow("Sensitive value");
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
    expect(tx.domainEvent.create).not.toHaveBeenCalled();
    expect(tx.outboxDelivery.create).not.toHaveBeenCalled();
  });
});

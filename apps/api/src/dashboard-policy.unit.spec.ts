import { BadRequestException } from "@nestjs/common";
import { localSlot, parse, reminderSchema, reportFilterSchema, scheduleSchema, scheduledEventNames, type ScheduleInput } from "./dashboard-policy.js";

const baseSchedule = {
  commandId: "11111111-1111-4111-8111-111111111111",
  reason: "Approved schedule",
  kind: "SUMMARY" as const,
  enabled: true,
  localTime: "09:30",
  timezone: "UTC",
  audience: "OWNER" as const,
  summaryKind: "MORNING" as const,
  critical: false,
  mandatory: false
};

describe("dashboard policy validation", () => {
  it("rejects kind-specific fields that would otherwise be ignored", () => {
    expect(scheduleSchema.safeParse({ ...baseSchedule, priority: "HIGH" }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...baseSchedule, offsetDays: 1 }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...baseSchedule, kind: "TASK_REMINDER", offsetDays: 1 }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...baseSchedule, kind: "TASK_REMINDER", summaryKind: undefined, offsetDays: 1 }).success).toBe(true);
  });
  it("rejects impossible dates, reversed periods and unknown report filter fields", () => {
    expect(reportFilterSchema.safeParse({ category: "project", from: "2026-02-30", to: "2026-03-01" }).success).toBe(false);
    expect(reportFilterSchema.safeParse({ category: "project", from: "2026-10-06", to: "2026-10-05" }).success).toBe(false);
    expect(reportFilterSchema.safeParse({ category: "project", from: "2026-10-01", to: "2026-10-05", employeeId: "unapproved" }).success).toBe(false);
  });

  it("requires timezone offsets on reminder timestamps", () => {
    const common = { commandId: baseSchedule.commandId, reason: "Send reminder", title: "Due soon" };
    expect(reminderSchema.safeParse({ ...common, dueAt: "2026-10-05T10:00:00" }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...common, dueAt: "2026-10-05T10:00:00+05:30" }).success).toBe(true);
  });

  it("requires explicit offsets, summary timezone and valid local clock values", () => {
    expect(scheduleSchema.safeParse({ ...baseSchedule, kind: "TASK_REMINDER" }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...baseSchedule, summaryKind: undefined }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...baseSchedule, timezone: "Mars/Olympus" }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...baseSchedule, localTime: "24:00" }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...baseSchedule, timezone: "Asia/Kolkata", localTime: "09:30" }).success).toBe(true);
  });

  it("requires explicit weekly weekdays and monthly day of month", () => {
    expect(scheduleSchema.safeParse({ ...baseSchedule, summaryKind: "WEEKLY" }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...baseSchedule, summaryKind: "WEEKLY", weekdays: [1] }).success).toBe(true);
    expect(scheduleSchema.safeParse({ ...baseSchedule, summaryKind: "MONTHLY" }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...baseSchedule, summaryKind: "MONTHLY", dayOfMonth: 5 }).success).toBe(true);
    expect(scheduleSchema.safeParse({ ...baseSchedule, summaryKind: "MONTHLY", dayOfMonth: 32 }).success).toBe(false);
  });

  it("rejects unrecognized schedule fields and schema parsing raises the API bad-request error", () => {
    expect(scheduleSchema.safeParse({ ...baseSchedule, bypassScope: true }).success).toBe(false);
    expect(() => parse(scheduleSchema, { ...baseSchedule, localTime: "noon" })).toThrow(BadRequestException);
  });
});

describe("dashboard local schedule slots", () => {
  const slot = (overrides: Partial<Pick<ScheduleInput, "timezone" | "localTime" | "weekdays" | "dayOfMonth">> = {}) => ({
    timezone: "UTC", localTime: "09:30", ...overrides
  });

  it("returns a daily slot only at or after its exact local time", () => {
    const rule = slot();
    expect(localSlot(new Date("2026-10-05T09:29:00Z"), rule)).toBeNull();
    expect(localSlot(new Date("2026-10-05T09:30:00Z"), rule)).toBe("2026-10-05");
    expect(localSlot(new Date("2026-10-05T10:05:00Z"), rule)).toBe("2026-10-05");
  });

  it("uses the configured IANA timezone to decide the local date and time", () => {
    const rule = slot({ timezone: "Asia/Kolkata", localTime: "09:30" });
    expect(localSlot(new Date("2026-10-05T03:59:00Z"), rule)).toBeNull();
    expect(localSlot(new Date("2026-10-05T04:00:00Z"), rule)).toBe("2026-10-05");
  });

  it("returns only configured weekdays using Sunday-zero numbering", () => {
    const rule = slot({ weekdays: [1, 3] });
    expect(localSlot(new Date("2026-10-05T09:30:00Z"), rule)).toBe("2026-10-05"); // Monday
    expect(localSlot(new Date("2026-10-06T09:30:00Z"), rule)).toBeNull(); // Tuesday
    expect(localSlot(new Date("2026-10-07T09:30:00Z"), rule)).toBe("2026-10-07"); // Wednesday
  });

  it("returns a monthly slot only on the explicitly configured day", () => {
    const rule = slot({ dayOfMonth: 5 });
    expect(localSlot(new Date("2026-10-04T10:00:00Z"), rule)).toBeNull();
    expect(localSlot(new Date("2026-10-05T09:30:00Z"), rule)).toBe("2026-10-05");
    expect(localSlot(new Date("2026-10-06T10:00:00Z"), rule)).toBeNull();
  });
});


describe("explicit event rules and daylight-saving slots", () => {
 it("accepts only mapped source event names and rejects recursive scheduling", () => {
  const event = scheduledEventNames.find(value => value.startsWith("task."));
  expect(event).toBeDefined();
  expect(scheduleSchema.safeParse({...baseSchedule,summaryKind:undefined,kind:"EVENT_NOTICE",eventNames:[event!]}).success).toBe(true);
  expect(scheduleSchema.safeParse({...baseSchedule,kind:"EVENT_NOTICE"}).success).toBe(false);
  expect(scheduleSchema.safeParse({...baseSchedule,kind:"EVENT_NOTICE",eventNames:["dashboard.delivered"]}).success).toBe(false);
  expect(scheduleSchema.safeParse({...baseSchedule,kind:"EVENT_NOTICE",eventNames:["invented.policy"]}).success).toBe(false);
 });
 it("uses one local date slot across a repeated autumn clock hour", () => {
  const repeated={timezone:"America/New_York",localTime:"01:30"};
  expect(localSlot(new Date("2026-11-01T05:30:00Z"),repeated)).toBe("2026-11-01");
  expect(localSlot(new Date("2026-11-01T06:30:00Z"),repeated)).toBe("2026-11-01");
 });
});

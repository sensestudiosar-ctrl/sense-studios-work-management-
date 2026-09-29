import { isScheduledDate, localCalendarDate, nextScheduledDate, parseCalendarDate } from "./task-recurrence-policy.js";

describe("S10 recurrence calendar policy", () => {
  it("uses the organization's timezone at a date boundary", () => {
    expect(localCalendarDate(new Date("2026-09-29T20:00:00Z"), "Asia/Kolkata")).toBe("2026-09-30");
    expect(localCalendarDate(new Date("2026-09-29T20:00:00Z"), "America/New_York")).toBe("2026-09-29");
    expect(() => parseCalendarDate("2026-02-30")).toThrow("Invalid");
  });
  it("aligns daily and weekly dates to the explicit anchor", () => {
    expect(isScheduledDate("DAILY", "2026-10-01", "2026-09-30")).toBe(false);
    expect(isScheduledDate("DAILY", "2026-10-01", "2026-10-02")).toBe(true);
    expect(isScheduledDate("WEEKLY", "2026-10-01", "2026-10-08")).toBe(true);
    expect(isScheduledDate("WEEKLY", "2026-10-01", "2026-10-09")).toBe(false);
  });
  it.each([29, 30, 31])("clamps monthly day %i in short months without drifting", (day) => {
    const anchor = `2027-01-${day}`;
    expect(isScheduledDate("MONTHLY", anchor, "2027-02-28")).toBe(true);
    expect(nextScheduledDate("MONTHLY", anchor, "2027-02-28")).toBe(`2027-03-${day}`);
    expect(nextScheduledDate("MONTHLY", `2028-01-${day}`, "2028-02-01")).toBe("2028-02-29");
  });
  it("resumes at a future scheduled date while retaining the anchor", () => {
    expect(nextScheduledDate("WEEKLY", "2026-10-01", "2026-10-08")).toBe("2026-10-15");
    expect(nextScheduledDate("MONTHLY", "2026-10-31", "2026-11-30")).toBe("2026-12-31");
  });
  it.each(["DAILY", "WEEKLY", "MONTHLY"] as const)("resumes %s rules with anchors beyond a year", (frequency) => {
    expect(nextScheduledDate(frequency, "2028-10-31", "2026-09-29")).toBe("2028-10-31");
  });
});

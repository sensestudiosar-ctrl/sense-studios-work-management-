import { isIanaTimeZone, isLocalTime, isWithinQuietHours, validateQuietHours } from "./notification-time.js";

describe("notification quiet-hours rules", () => {
  it("validates complete local-time and IANA-zone values", () => {
    expect(isIanaTimeZone("Asia/Kolkata")).toBe(true);
    expect(isIanaTimeZone("Invalid/Zone")).toBe(false);
    expect(isLocalTime("22:30")).toBe(true);
    expect(isLocalTime("24:00")).toBe(false);
    expect(() => validateQuietHours({ startLocal: "22:00", endLocal: "22:00", timeZone: "Asia/Kolkata" })).toThrow();
    expect(() => validateQuietHours({ startLocal: "22:00", endLocal: "07:00", timeZone: "Invalid/Zone" })).toThrow();
  });

  it("evaluates quiet hours in the user's local zone, including an overnight range", () => {
    const quietHours = { startLocal: "22:00", endLocal: "07:00", timeZone: "America/New_York" };
    expect(isWithinQuietHours(new Date("2026-01-15T04:00:00.000Z"), quietHours)).toBe(true); // 23:00 EST
    expect(isWithinQuietHours(new Date("2026-01-15T15:00:00.000Z"), quietHours)).toBe(false); // 10:00 EST
  });

  it("handles both repeated and skipped local times using the IANA transition rules", () => {
    const quietHours = { startLocal: "01:00", endLocal: "03:00", timeZone: "America/New_York" };
    expect(isWithinQuietHours(new Date("2026-11-01T05:30:00.000Z"), quietHours)).toBe(true); // first 01:30
    expect(isWithinQuietHours(new Date("2026-11-01T06:30:00.000Z"), quietHours)).toBe(true); // repeated 01:30
    const startsInGap = { startLocal: "02:30", endLocal: "04:00", timeZone: "America/New_York" };
    expect(isWithinQuietHours(new Date("2026-03-08T07:00:00.000Z"), startsInGap)).toBe(true); // 03:00, first valid time after gap
  });
});

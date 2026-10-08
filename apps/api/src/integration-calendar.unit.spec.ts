import { serializeCalendar, type CalendarProjection } from "./integration-calendar.js";

const base: CalendarProjection = {
  uid: "opaque-1@example.invalid",
  kind: "MEETING",
  label: "ignored private source title",
  start: "2026-10-05",
  allDay: true,
  sequence: 3,
  updatedAt: "2026-10-04T18:30:00+05:30",
  cancelled: false,
};

describe("integration calendar serialization", () => {
  it("emits deterministic CRLF iCalendar with fixed generic summaries and an exclusive all-day end", () => {
    const output = serializeCalendar([base]);
    expect(output).toContain("SUMMARY:Meeting\r\n");
    expect(output).toContain("DTSTART;VALUE=DATE:20261005\r\nDTEND;VALUE=DATE:20261006\r\n");
    expect(output).toContain("DTSTAMP:20261004T130000Z\r\nLAST-MODIFIED:20261004T130000Z\r\n");
    expect(output).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(output.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(output).not.toContain("ignored private source title");
    expect(output).toContain("\r\n");
    expect(output.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(serializeCalendar([base])).toBe(output);
  });

  it("escapes text and prevents arbitrary labels and embedded newlines from injecting properties", () => {
    const output = serializeCalendar([{ ...base, uid: "stable\\,uid", label: "Private\r\nATTENDEE:evil@example.invalid,;" }]);
    expect(output).toContain("UID:stable\\\\\\,uid\r\n");
    expect(output).toContain("SUMMARY:Meeting\r\n");
    expect(output).not.toContain("ATTENDEE");
    expect(output).not.toContain("Private");
  });

  it("folds by UTF-8 octets without splitting Unicode code points", () => {
    const output = serializeCalendar([{ ...base, kind: "SITE_VISIT", start: "2026-10-05", label: "秘密".repeat(100) }]);
    const lines = output.split("\r\n");
    expect(lines.filter(Boolean).every((line) => Buffer.byteLength(line, "utf8") <= 75)).toBe(true);
    expect(output).toContain("SUMMARY:Site visit");
  });

  it("formats offset instants as UTC and supports cancellation", () => {
    const output = serializeCalendar([{ ...base, allDay: false, start: "2026-10-05T09:00:00+05:30", end: "2026-10-05T10:00:00+05:30", cancelled: true }]);
    expect(output).toContain("DTSTART:20261005T033000Z\r\nDTEND:20261005T043000Z\r\n");
    expect(output).toContain("STATUS:CANCELLED\r\n");
  });

  it("rejects invalid dates, missing timed ends, invalid timestamps, and injected UIDs", () => {
    expect(() => serializeCalendar([{ ...base, start: "2026-02-30" }])).toThrow();
    expect(() => serializeCalendar([{ ...base, allDay: false, start: "2026-10-05T09:00:00Z" }])).toThrow();
    expect(() => serializeCalendar([{ ...base, updatedAt: "yesterday" }])).toThrow();
    expect(() => serializeCalendar([{ ...base, uid: "safe\r\nATTENDEE:evil" }])).toThrow();
  });
});

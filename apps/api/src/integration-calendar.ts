export type CalendarProjection = {
  uid: string;
  kind: "TASK_DEADLINE" | "MILESTONE" | "REVIEW_ASSIGNMENT" | "MEETING" | "SITE_VISIT";
  label: string;
  start: string;
  end?: string;
  allDay: boolean;
  sequence: number;
  updatedAt: string;
  cancelled: boolean;
};

const LABELS: Record<CalendarProjection["kind"], string> = {
  TASK_DEADLINE: "Task deadline",
  MILESTONE: "Project milestone",
  REVIEW_ASSIGNMENT: "Review assignment",
  MEETING: "Meeting",
  SITE_VISIT: "Site visit",
};

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError("Invalid calendar date");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (date.toISOString().slice(0, 10) !== value) throw new TypeError("Invalid calendar date");
  return date;
}

function parseInstant(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new TypeError("Calendar timestamp must include seconds and a timezone");
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("Invalid calendar timestamp");
  return date;
}

function utc(value: string): string {
  return parseInstant(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function foldLine(line: string): string {
  const output: string[] = [];
  let current = "";
  let bytes = 0;
  for (const character of line) {
    const size = Buffer.byteLength(character, "utf8");
    if (bytes + size > 75) {
      output.push(current);
      current = ` ${character}`;
      bytes = 1 + size;
    } else {
      current += character;
      bytes += size;
    }
  }
  output.push(current);
  return output.join("\r\n");
}

function nextDate(value: string): string {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function serializeEvent(event: CalendarProjection): string[] {
  if (!event || typeof event.uid !== "string" || event.uid.length === 0 || [...event.uid].some((character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint <= 0x1f || codePoint === 0x7f;
  })) {
    throw new TypeError("Invalid calendar UID");
  }
  if (!(event.kind in LABELS)) throw new TypeError("Invalid calendar event kind");
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 0) throw new TypeError("Invalid calendar sequence");
  const updatedAt = utc(event.updatedAt);
  let dateLines: string[];
  if (event.allDay) {
    const start = parseDate(event.start);
    const end = event.end === undefined ? parseDate(nextDate(event.start)) : parseDate(event.end);
    if (end <= start) throw new TypeError("Calendar end must be after start");
    dateLines = [`DTSTART;VALUE=DATE:${event.start.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${(event.end === undefined ? nextDate(event.start) : event.end).replace(/-/g, "")}`];
  } else {
    const start = parseInstant(event.start);
    const end = parseInstant(event.end ?? "");
    if (end <= start) throw new TypeError("Calendar end must be after start");
    dateLines = [`DTSTART:${utc(event.start)}`, `DTEND:${utc(event.end!)}`];
  }
  return [
    "BEGIN:VEVENT",
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${updatedAt}`,
    `LAST-MODIFIED:${updatedAt}`,
    `SEQUENCE:${event.sequence}`,
    ...dateLines,
    `SUMMARY:${escapeText(LABELS[event.kind])}`,
    ...(event.cancelled ? ["STATUS:CANCELLED"] : []),
    "END:VEVENT",
  ];
}

export function serializeCalendar(events: CalendarProjection[]): string {
  if (!Array.isArray(events)) throw new TypeError("Calendar events must be an array");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sense Studios//Work Management//EN", "CALSCALE:GREGORIAN"];
  for (const event of events) lines.push(...serializeEvent(event));
  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
